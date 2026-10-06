import { useState, useEffect } from 'react'
import type { RequestFunction } from './userApi'
import { ApiError } from './userApi'
import { getErrorMessage } from '../utils/errorMessages'

export interface AvatarUploadResponseData {
    avatar_url?: string
    avatar_path?: string | null
    [key: string]: unknown
}

export interface AvatarUploadResult {
    status: string
    message: string
    data?: AvatarUploadResponseData
    avatar?: { path?: string } | null
}

export interface AvatarDeleteResult {
    status: string
    message: string
    data?: unknown
    avatar?: null
}

export interface AvatarValidationError {
    code: 'AVATAR_REQUIRED' | 'AVATAR_TOO_LARGE' | 'INVALID_AVATAR_TYPE'
    message: string
}

export const MAX_AVATAR_SIZE = 2 * 1024 * 1024 // 2 MB
export const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const ALLOWED_AVATAR_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

/**
 * Client-side validation helper cho tệp ảnh đại diện (SCRUM-121 Activity A5).
 * Dùng để cải thiện trải nghiệm người dùng (UX) trước khi gửi lên máy chủ.
 * Lưu ý: Backend Pillow vẫn là nguồn kiểm tra bảo mật chính.
 */
export function validateAvatarFile(file?: File | null): AvatarValidationError | null {
    if (!file) {
        return {
            code: 'AVATAR_REQUIRED',
            message: getErrorMessage('AVATAR_REQUIRED', 'Vui lòng chọn ảnh đại diện.'),
        }
    }

    if (file.size > MAX_AVATAR_SIZE) {
        return {
            code: 'AVATAR_TOO_LARGE',
            message: getErrorMessage('AVATAR_TOO_LARGE', 'Ảnh đại diện không được vượt quá 2 MB.'),
        }
    }

    const mime = file.type ? file.type.toLowerCase().trim() : ''
    if (mime && !ALLOWED_AVATAR_MIME_TYPES.includes(mime)) {
        return {
            code: 'INVALID_AVATAR_TYPE',
            message: getErrorMessage('INVALID_AVATAR_TYPE', 'Ảnh đại diện phải là JPG, JPEG, PNG hoặc WEBP.'),
        }
    }

    // Nếu MIME rỗng hoặc application/octet-stream, kiểm tra extension dự phòng
    if (!mime || mime === 'application/octet-stream') {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
        if (!ALLOWED_AVATAR_EXTENSIONS.includes(ext)) {
            return {
                code: 'INVALID_AVATAR_TYPE',
                message: getErrorMessage('INVALID_AVATAR_TYPE', 'Ảnh đại diện phải là JPG, JPEG, PNG hoặc WEBP.'),
            }
        }
    }

    return null
}

/**
 * Lấy ảnh đại diện dạng nhị phân (Blob) của người dùng hiện tại (SCRUM-121 Activity A5).
 * GET /api/v1/users/profile/avatar
 * Phản hồi thành công là Binary Image, không được gọi response.json().
 */
export async function getProfileAvatarApi(
    requestFn: RequestFunction,
): Promise<Blob> {
    try {
        const res = await requestFn('/api/v1/users/profile/avatar', {
            method: 'GET',
        })

        if (!res.ok) {
            let code = 'GET_AVATAR_FAILED'
            let rawMessage: string | undefined
            try {
                const body = await res.json()
                if (body && typeof body === 'object') {
                    if (typeof body.code === 'string') code = body.code
                    if (typeof body.message === 'string') rawMessage = body.message
                }
            } catch {
                // Phản hồi không phải JSON
            }

            if (res.status === 404) {
                code = 'AVATAR_NOT_FOUND'
            } else if (res.status === 401 && code === 'GET_AVATAR_FAILED') {
                code = 'UNAUTHORIZED'
            }

            const message = getErrorMessage({ code, message: rawMessage }, 'Không thể tải ảnh đại diện.')
            throw new ApiError(message, code, res.status)
        }

        return await res.blob()
    } catch (err: unknown) {
        if (err instanceof ApiError) {
            throw err
        }

        // Nếu SessionApiError ném ra lỗi 404 AVATAR_NOT_FOUND
        if (typeof err === 'object' && err !== null && 'code' in err) {
            const anyErr = err as Record<string, unknown>
            const code = String(anyErr.code)
            const status = typeof anyErr.status === 'number' ? anyErr.status : 500

            if (code === 'AVATAR_NOT_FOUND' || status === 404) {
                const message = getErrorMessage('AVATAR_NOT_FOUND', 'Không tìm thấy ảnh đại diện.')
                throw new ApiError(message, 'AVATAR_NOT_FOUND', 404)
            }
        }

        throw err
    }
}

/**
 * Tải lên ảnh đại diện cho người dùng hiện tại (SCRUM-121 Activity A5).
 * POST /api/v1/users/profile/avatar
 * Input: multipart/form-data với field 'avatar'
 * Không tự ý gán Content-Type header để trình duyệt tự sinh boundary multipart.
 */
export async function uploadProfileAvatarApi(
    requestFn: RequestFunction,
    file: File,
): Promise<AvatarUploadResult> {
    const formData = new FormData()
    formData.append('avatar', file)

    const res = await requestFn('/api/v1/users/profile/avatar', {
        method: 'POST',
        body: formData,
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 413 ? 'AVATAR_TOO_LARGE' :
            res.status === 401 ? 'UNAUTHORIZED' :
            res.status === 400 ? 'INVALID_AVATAR_TYPE' :
            'UPLOAD_FAILED'
        )
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi tải lên ảnh đại diện.')
        throw new ApiError(message, code, res.status)
    }

    return {
        status: body.status ?? 'success',
        message: body.message ?? 'Cập nhật ảnh đại diện thành công.',
        data: body.data,
        avatar: body.avatar,
    }
}

/**
 * Xóa ảnh đại diện của người dùng hiện tại (SCRUM-121 Activity A5).
 * DELETE /api/v1/users/profile/avatar
 * Tuyệt đối không gửi user_id, email, role hay avatar_path từ client.
 */
export async function deleteProfileAvatarApi(
    requestFn: RequestFunction,
): Promise<AvatarDeleteResult> {
    const res = await requestFn('/api/v1/users/profile/avatar', {
        method: 'DELETE',
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (res.status === 401 ? 'UNAUTHORIZED' : 'DELETE_FAILED')
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi xóa ảnh đại diện.')
        throw new ApiError(message, code, res.status)
    }

    return {
        status: body.status ?? 'success',
        message: body.message ?? 'Đã xóa ảnh đại diện.',
        data: body.data,
        avatar: body.avatar ?? null,
    }
}

/**
 * Tạo Object URL an toàn từ Blob (SCRUM-121 Activity A5).
 */
export function createSafeObjectUrl(blob: Blob): string {
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        return URL.createObjectURL(blob)
    }
    return `blob:${Math.random().toString(36).substring(2)}`
}

/**
 * Thu hồi Object URL an toàn để giải phóng bộ nhớ (tránh memory leak).
 */
export function revokeSafeObjectUrl(url?: string | null): void {
    if (!url || typeof url !== 'string') return
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        try {
            URL.revokeObjectURL(url)
        } catch {
            // Không làm gián đoạn chương trình nếu URL đã thu hồi
        }
    }
}

/**
 * Quản lý vòng đời của Object URL cho avatar.
 * Đảm bảo thu hồi URL cũ khi có URL mới hoặc khi unmount/hủy.
 */
export class AvatarUrlManager {
    private currentUrl: string | null = null

    setBlob(blob: Blob | null): string | null {
        if (this.currentUrl) {
            revokeSafeObjectUrl(this.currentUrl)
            this.currentUrl = null
        }
        if (blob) {
            this.currentUrl = createSafeObjectUrl(blob)
        }
        return this.currentUrl
    }

    getUrl(): string | null {
        return this.currentUrl
    }

    revoke(): void {
        if (this.currentUrl) {
            revokeSafeObjectUrl(this.currentUrl)
            this.currentUrl = null
        }
    }
}

/**
 * React Hook quản lý vòng đời Object URL của Blob ảnh đại diện.
 * Tự động revoke URL cũ khi Blob thay đổi và khi component unmount.
 */
export function useAvatarObjectUrl(blob: Blob | null): string | null {
    const [objectUrl, setObjectUrl] = useState<string | null>(null)

    useEffect(() => {
        if (!blob) {
            // oxlint-disable-next-line react/set-state-in-effect
            setObjectUrl((prev) => {
                if (prev) revokeSafeObjectUrl(prev)
                return null
            })
            return
        }

        const newUrl = createSafeObjectUrl(blob)
        // oxlint-disable-next-line react/set-state-in-effect
        setObjectUrl((prev) => {
            if (prev) revokeSafeObjectUrl(prev)
            return newUrl
        })

        return () => {
            revokeSafeObjectUrl(newUrl)
        }
    }, [blob])

    return objectUrl
}

/**
 * Kiểm tra xem lỗi có phải do người dùng chưa có avatar (404 AVATAR_NOT_FOUND) hay không.
 */
export function isAvatarNotFoundError(error: unknown): boolean {
    if (!error) return false
    if (typeof error === 'object') {
        const anyErr = error as Record<string, unknown>
        if (anyErr.code === 'AVATAR_NOT_FOUND') return true
        if (anyErr.message === 'AVATAR_NOT_FOUND') return true
        if (anyErr.status === 404) return true
    }
    return false
}

/**
 * Helper xác định xem UI nên hiển thị avatar mặc định / fallback hay không.
 */
export function shouldFallbackAvatar(
    avatarUrl?: string | null,
    error?: unknown,
): boolean {
    if (!avatarUrl) return true
    if (error && isAvatarNotFoundError(error)) return true
    return false
}
