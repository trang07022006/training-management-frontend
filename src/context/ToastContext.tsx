import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { ToastPortal } from '../components/ToastPortal'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
    id: string
    type: ToastType
    message: string
    duration?: number // in ms, 0 means manual dismiss only
    createdAt: number
}

interface ToastContextValue {
    toasts: ToastItem[]
    showToast: (type: ToastType, message: string, duration?: number) => string
    showSuccess: (message: string, duration?: number) => string
    showError: (message: string, duration?: number) => string
    showWarning: (message: string, duration?: number) => string
    showInfo: (message: string, duration?: number) => string
    removeToast: (id: string) => void
    clearAllToasts: () => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const FLASH_STORAGE_KEY = 'ictu_pending_flash_toast'

/**
 * Set a flash toast that will be displayed once on the next page view.
 * Immune to page refresh (cleared immediately upon consumption).
 * Supports both setFlashToast(type, message) and setFlashToast(message, type).
 */
export function setFlashToast(
    typeOrMessage: ToastType | string,
    messageOrType?: string | ToastType,
    duration?: number
) {
    let type: ToastType = 'success'
    let message = ''

    if (
        typeOrMessage === 'success' ||
        typeOrMessage === 'error' ||
        typeOrMessage === 'warning' ||
        typeOrMessage === 'info'
    ) {
        type = typeOrMessage as ToastType
        message = String(messageOrType || '')
    } else {
        message = typeOrMessage
        type = (messageOrType as ToastType) || 'success'
    }

    try {
        sessionStorage.setItem(
            FLASH_STORAGE_KEY,
            JSON.stringify({ type, message, duration, time: Date.now() })
        )
    } catch {
        // Ignore storage errors
    }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([])
    const recentMessagesRef = useRef<Map<string, number>>(new Map())

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const clearAllToasts = useCallback(() => {
        setToasts([])
    }, [])

    const showToast = useCallback(
        (type: ToastType, message: string, duration?: number): string => {
            if (!message || !message.trim()) return ''

            const cleanMsg = message.trim()
            const now = Date.now()

            // Chống trùng thông báo lặp liên tiếp trong vòng 1 giây
            const key = `${type}:${cleanMsg}`
            const lastTime = recentMessagesRef.current.get(key)
            if (lastTime && now - lastTime < 1000) {
                return ''
            }
            recentMessagesRef.current.set(key, now)

            // Dọn dẹp cache messages cũ
            if (recentMessagesRef.current.size > 20) {
                for (const [k, t] of recentMessagesRef.current.entries()) {
                    if (now - t > 5000) {
                        recentMessagesRef.current.delete(k)
                    }
                }
            }

            const id = `toast-${now}-${Math.random().toString(36).substring(2, 7)}`

            // Mặc định: Thành công/Thông tin tự đóng sau 5 giây (5000ms).
            // Lỗi/Cảnh báo giữ nguyên đến khi người dùng đóng (duration = 0).
            const defaultDuration = (type === 'success' || type === 'info') ? 5000 : 0
            const finalDuration = duration !== undefined ? duration : defaultDuration

            const newItem: ToastItem = {
                id,
                type,
                message: cleanMsg,
                duration: finalDuration,
                createdAt: now,
            }

            setToasts((prev) => [...prev, newItem])
            return id
        },
        []
    )

    const showSuccess = useCallback((msg: string, dur?: number) => showToast('success', msg, dur), [showToast])
    const showError = useCallback((msg: string, dur?: number) => showToast('error', msg, dur), [showToast])
    const showWarning = useCallback((msg: string, dur?: number) => showToast('warning', msg, dur), [showToast])
    const showInfo = useCallback((msg: string, dur?: number) => showToast('info', msg, dur), [showToast])

    // Kiểm tra flash toast khi mount hoặc sau khi redirect
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(FLASH_STORAGE_KEY)
            if (raw) {
                sessionStorage.removeItem(FLASH_STORAGE_KEY)
                const parsed = JSON.parse(raw)
                // Hợp lệ nếu trong vòng 15 giây
                if (Date.now() - parsed.time < 15000 && parsed.message) {
                    showToast(parsed.type || 'success', parsed.message, parsed.duration)
                }
            }
        } catch {
            // Ignore storage parse errors
        }
    }, [showToast])

    return (
        <ToastContext.Provider
            value={{
                toasts,
                showToast,
                showSuccess,
                showError,
                showWarning,
                showInfo,
                removeToast,
                clearAllToasts,
            }}
        >
            {children}
            {/* Global Toast Portal */}
            <ToastPortal
                contextToasts={toasts}
                onRemoveContextToast={removeToast}
            />
        </ToastContext.Provider>
    )
}

export function useToast(): ToastContextValue {
    const context = useContext(ToastContext)
    if (!context) {
        // Fallback an toàn nếu component được render ngoài ToastProvider (ví dụ trong unit test nhỏ)
        return {
            toasts: [],
            showToast: () => '',
            showSuccess: () => '',
            showError: () => '',
            showWarning: () => '',
            showInfo: () => '',
            removeToast: () => {},
            clearAllToasts: () => {},
        }
    }
    return context
}
