// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setFlashToast, ToastProvider, useToast } from './ToastContext'

function TestComponent() {
    const { showSuccess, showError, showWarning, showInfo } = useToast()

    return (
        <div>
            <button onClick={() => showSuccess('Thao tác thành công')}>Bấm thành công</button>
            <button onClick={() => showError('Đã xảy ra lỗi hệ thống')}>Bấm lỗi</button>
            <button onClick={() => showWarning('Cảnh báo dữ liệu')}>Bấm cảnh báo</button>
            <button onClick={() => showInfo('Thông tin cập nhật')}>Bấm thông tin</button>
            <button
                onClick={() => {
                    showSuccess('Toast 1')
                    showSuccess('Toast 2')
                    showSuccess('Toast 3')
                    showSuccess('Toast 4')
                }}
            >
                Bấm 4 toast
            </button>
        </div>
    )
}

describe('ToastContext & ToastPortal Unified Notification System', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        sessionStorage.clear()
    })

    afterEach(() => {
        cleanup()
        vi.clearAllTimers()
        vi.useRealTimers()
    })

    it('displays success toast with dark green background and correct icon', () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        )

        fireEvent.click(screen.getByText('Bấm thành công'))

        const container = screen.getByTestId('toast-container')
        expect(container).toBeDefined()

        const successToast = screen.getByTestId('page-success')
        expect(successToast).toBeDefined()
        expect(successToast.className).toContain('leads-toast-success')
        expect(screen.getByTestId('toast-success').textContent).toBe('Thao tác thành công')
        expect(screen.getByTestId('toast-icon-success')).toBeDefined()
    })

    it('auto-dismisses success toast after 5000ms', () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        )

        fireEvent.click(screen.getByText('Bấm thành công'))
        expect(screen.getByTestId('toast-success')).toBeDefined()

        // Advance 4900ms -> still present
        act(() => {
            vi.advanceTimersByTime(4900)
        })
        expect(screen.getByTestId('toast-success')).toBeDefined()

        // Advance past 5000ms -> dismissed
        act(() => {
            vi.advanceTimersByTime(200)
        })
        expect(screen.queryByTestId('toast-success')).toBeNull()
    })

    it('keeps error toast until explicitly closed (no auto dismiss)', () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        )

        fireEvent.click(screen.getByText('Bấm lỗi'))
        const errorToast = screen.getByTestId('toast-error')
        expect(errorToast.className).toContain('leads-toast-error')
        expect(screen.getByTestId('page-error').textContent).toBe('Đã xảy ra lỗi hệ thống')

        // Advance 10 seconds -> still present!
        act(() => {
            vi.advanceTimersByTime(10000)
        })
        expect(screen.getByTestId('toast-error')).toBeDefined()

        // Click close button -> dismissed
        const closeBtn = screen.getByTestId('close-error-toast-btn')
        fireEvent.click(closeBtn)
        expect(screen.queryByTestId('toast-error')).toBeNull()
    })

    it('limits visible toasts to maximum 3 and handles queue', () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        )

        fireEvent.click(screen.getByText('Bấm 4 toast'))

        const container = screen.getByTestId('toast-container')
        // Only 3 children rendered in DOM
        expect(container.children.length).toBe(3)
        expect(screen.getByText('Toast 1')).toBeDefined()
        expect(screen.getByText('Toast 2')).toBeDefined()
        expect(screen.getByText('Toast 3')).toBeDefined()
        expect(screen.queryByText('Toast 4')).toBeNull()

        // Dismiss Toast 1 -> Toast 4 enters
        act(() => {
            vi.advanceTimersByTime(5050)
        })
        expect(screen.getByText('Toast 4')).toBeDefined()
    })

    it('supports flash toast navigation persistence via sessionStorage', () => {
        setFlashToast('success', 'Tạo mới thành công sau điều hướng')

        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        )

        expect(screen.getByText('Tạo mới thành công sau điều hướng')).toBeDefined()
        // Ensure sessionStorage was cleared so F5 doesn't re-trigger
        expect(sessionStorage.getItem('ictu_pending_flash_toast')).toBeNull()
    })
})
