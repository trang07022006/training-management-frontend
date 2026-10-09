/**
 * API client quản trị người dùng (User Management API Client - SCRUM-25).
 * Tuân thủ tuyệt đối API Contract từ Backend (SCRUM-82 -> SCRUM-88).
 */

import { getErrorMessage } from '../utils/errorMessages'

export interface User {
    id: string | number
    email: string
    name: string
    phone?: string | null
    role: string
    status: string
    failed_login_attempts?: number
    locked_until?: string | null
    created_at?: string
    updated_at?: string
}

export const STATUS_LABELS: Record<string, string> = {
    active: 'Hoạt động',
    locked: 'Bị khóa',
    inactive: 'Không hoạt động',
}

export function getStatusInfo(status?: string | null): { key: string; label: string } {
    if (!status || !status.trim()) {
        return { key: 'unknown', label: 'Không xác định' }
    }
    const key = status.trim().toLowerCase()
    const label = STATUS_LABELS[key] || status.trim()
    return { key, label }
}

export interface UserListParams {
    page?: number
    page_size?: number
    search?: string
    role?: string
    status?: string
}

export interface UserListResponseData {
    items: User[]
    users: User[]
    page: number
    page_size: number
    total: number
    total_pages: number
}

export interface ApiResponse<T> {
    status: string
    message?: string
    data: T
    code?: string
}

export interface CreateUserData {
    name: string
    email: string
    password: string
    phone?: string | null
    role?: string
    status?: string
}

export interface UpdateUserData {
    name?: string
    email?: string
    phone?: string | null
    status?: string
}

export type RequestFunction = (path: string, init?: RequestInit) => Promise<Response>

export class ApiError extends Error {
    code: string
    status: number
    reason?: string
    details?: unknown

    constructor(
        message: string,
        code = 'API_ERROR',
        status = 500,
        reason?: string,
        details?: unknown,
    ) {
        super(message)
        this.name = 'ApiError'
        this.code = code
        this.status = status
        this.reason = reason
        this.details = details
    }
}

/**
 * Lấy danh sách người dùng có phân trang, tìm kiếm và bộ lọc (SCRUM-82, 83, 87).
 */
export async function fetchUsersApi(
    requestFn: RequestFunction,
    params: UserListParams = {},
): Promise<UserListResponseData> {
    const query = new URLSearchParams()
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.page_size !== undefined) query.set('page_size', String(params.page_size))
    if (params.search && params.search.trim()) query.set('search', params.search.trim())
    if (params.role && params.role.trim()) query.set('role', params.role.trim().toLowerCase())
    if (params.status && params.status.trim()) query.set('status', params.status.trim().toLowerCase())

    const qs = query.toString()
    const path = `/api/users${qs ? `?${qs}` : ''}`

    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (res.status === 403 ? 'FORBIDDEN' : res.status === 401 ? 'UNAUTHORIZED' : 'UNKNOWN_ERROR')
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi tải danh sách người dùng.')
        throw new ApiError(message, code, res.status)
    }

    return body.data ?? { items: [], users: [], page: 1, page_size: 10, total: 0, total_pages: 0 }
}

/**
 * Tạo người dùng mới (SCRUM-84, 85).
 */
export async function createUserApi(
    requestFn: RequestFunction,
    data: CreateUserData,
): Promise<User> {
    const res = await requestFn('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (res.status === 409 ? 'DUPLICATE_EMAIL' : res.status === 403 ? 'FORBIDDEN' : 'VALIDATION_ERROR')
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi tạo người dùng.')
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Cập nhật thông tin người dùng (SCRUM-86).
 */
export async function updateUserApi(
    requestFn: RequestFunction,
    userId: string | number,
    data: UpdateUserData,
): Promise<User> {
    const res = await requestFn(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (res.status === 404 ? 'USER_NOT_FOUND' : res.status === 409 ? 'DUPLICATE_EMAIL' : res.status === 403 ? 'FORBIDDEN' : 'UPDATE_ERROR')
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi cập nhật người dùng.')
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

export interface RoleItem {
    id: string | number
    code: string
    name: string
    description?: string
}

export interface UserRolesData {
    user_id: string
    roles: RoleItem[]
}

/**
 * Lấy danh sách vai trò của một người dùng (SCRUM-96).
 */
export async function fetchUserRolesApi(
    requestFn: RequestFunction,
    userId: string | number,
): Promise<UserRolesData> {
    const res = await requestFn(`/api/users/${userId}/roles`, {
        method: 'GET',
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
        const code = body.code || (res.status === 404 ? 'USER_NOT_FOUND' : res.status === 403 ? 'FORBIDDEN' : 'FETCH_ROLES_ERROR')
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi tải vai trò của người dùng.')
        throw new ApiError(message, code, res.status)
    }
    return body.data
}

/**
 * Lấy danh sách các vai trò khả dụng trong hệ thống (SCRUM-97).
 */
export async function fetchAvailableRolesApi(
    requestFn: RequestFunction,
): Promise<RoleItem[]> {
    const res = await requestFn('/api/roles', {
        method: 'GET',
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
        const code = body.code || (res.status === 403 ? 'FORBIDDEN' : 'FETCH_AVAILABLE_ROLES_ERROR')
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi tải danh mục vai trò.')
        throw new ApiError(message, code, res.status)
    }
    return body.data?.items || []
}

/**
 * Phân vai trò cho người dùng (SCRUM-98).
 */
export async function assignUserRoleApi(
    requestFn: RequestFunction,
    userId: string | number,
    roleIdOrCode: string | number,
): Promise<{ user_id: string; role: RoleItem }> {
    const res = await requestFn(`/api/users/${userId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: roleIdOrCode }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
        const code = body.code || (res.status === 409 ? 'DUPLICATE_ROLE_ASSIGNMENT' : res.status === 404 ? 'ROLE_NOT_FOUND' : res.status === 403 ? 'FORBIDDEN' : 'ASSIGN_ROLE_ERROR')
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi phân vai trò cho người dùng.')
        throw new ApiError(message, code, res.status)
    }
    return body.data
}

/**
 * Gỡ vai trò khỏi người dùng (SCRUM-99).
 */
export async function revokeUserRoleApi(
    requestFn: RequestFunction,
    userId: string | number,
    roleId: string | number,
): Promise<{ user_id: string; role_id: string; role_code: string }> {
    const res = await requestFn(`/api/users/${userId}/roles/${roleId}`, {
        method: 'DELETE',
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
        const code = body.code || (res.status === 404 ? 'ROLE_NOT_ASSIGNED' : res.status === 403 ? 'FORBIDDEN' : 'REVOKE_ROLE_ERROR')
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi gỡ vai trò khỏi người dùng.')
        throw new ApiError(message, code, res.status)
    }
    return body.data
}

/**
 * Khóa tài khoản người dùng (SCRUM-106).
 */
export async function lockUserApi(
    requestFn: RequestFunction,
    userId: string | number,
): Promise<{ user_id: string; status: string }> {
    const res = await requestFn(`/api/users/${userId}/lock`, {
        method: 'POST',
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
        const code = body.code || (res.status === 404 ? 'USER_NOT_FOUND' : res.status === 409 ? 'ALREADY_LOCKED' : res.status === 403 ? 'FORBIDDEN' : 'LOCK_ERROR')
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi khóa tài khoản.')
        throw new ApiError(message, code, res.status)
    }
    return body.data
}

/**
 * Mở khóa tài khoản người dùng (SCRUM-107).
 */
export async function unlockUserApi(
    requestFn: RequestFunction,
    userId: string | number,
): Promise<{ user_id: string; status: string }> {
    const res = await requestFn(`/api/users/${userId}/unlock`, {
        method: 'POST',
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
        const code = body.code || (res.status === 404 ? 'USER_NOT_FOUND' : res.status === 409 ? 'ALREADY_ACTIVE' : res.status === 403 ? 'FORBIDDEN' : 'UNLOCK_ERROR')
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi mở khóa tài khoản.')
        throw new ApiError(message, code, res.status)
    }
    return body.data
}

export interface UserProfileData {
    id: string | number
    email: string
    name: string
    phone?: string | null
    date_of_birth?: string | null
    address?: string | null
    role: string
    status?: string
    avatar_url?: string | null
}

export interface UpdateProfilePayload {
    name?: string
    phone?: string | null
    date_of_birth?: string | null
    address?: string | null
}

/**
 * Lấy hồ sơ cá nhân của chính người dùng đang đăng nhập (SCRUM-120 Activity A2).
 */
export async function getUserProfileApi(
    requestFn: RequestFunction,
): Promise<UserProfileData> {
    const res = await requestFn('/api/v1/users/profile', {
        method: 'GET',
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (res.status === 401 ? 'UNAUTHORIZED' : res.status === 404 ? 'USER_NOT_FOUND' : 'UNKNOWN_ERROR')
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi tải hồ sơ cá nhân.')
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Cập nhật hồ sơ cá nhân của chính người dùng đang đăng nhập (SCRUM-120 Activity A3, A6).
 * Payload editable: name, phone, date_of_birth, address.
 * Tuyệt đối không gửi email, role, id, status, password hay security fields.
 */
export async function updateUserProfileApi(
    requestFn: RequestFunction,
    payload: UpdateProfilePayload,
): Promise<UserProfileData> {
    const cleanPayload: UpdateProfilePayload = {}
    if ('name' in payload && payload.name !== undefined) {
        cleanPayload.name = payload.name
    }
    if ('phone' in payload && payload.phone !== undefined) {
        cleanPayload.phone = payload.phone
    }
    if ('date_of_birth' in payload && payload.date_of_birth !== undefined) {
        cleanPayload.date_of_birth = payload.date_of_birth
    }
    if ('address' in payload && payload.address !== undefined) {
        cleanPayload.address = payload.address
    }

    const res = await requestFn('/api/v1/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPayload),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (res.status === 400 ? 'VALIDATION_ERROR' : res.status === 404 ? 'USER_NOT_FOUND' : 'UPDATE_ERROR')
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi cập nhật hồ sơ cá nhân.')
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Tải file Excel mẫu cho import người dùng hàng loạt (SCRUM-119 Activity A1 / A6.1).
 * GET /api/users/import/template
 */
export async function downloadUserImportTemplateApi(
    requestFn: RequestFunction,
): Promise<Blob> {
    const res = await requestFn('/api/users/import/template', {
        method: 'GET',
    })
    if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const code = body.code || (res.status === 403 ? 'FORBIDDEN' : res.status === 401 ? 'UNAUTHORIZED' : 'DOWNLOAD_TEMPLATE_ERROR')
        const message = getErrorMessage({ code, message: body.message }, 'Không thể tải file mẫu. Vui lòng thử lại.')
        throw new ApiError(message, code, res.status)
    }
    return res.blob()
}

export interface ImportRowError {
    field: string
    code: string
    message: string
}

export interface ImportPreviewRow {
    row_number: number
    name: string | null
    email: string | null
    phone?: string | null
    role?: string | null
    status?: string | null
    password_present: boolean
    valid: boolean
    errors: ImportRowError[]
}

export interface ImportPreviewData {
    filename: string
    headers: string[]
    total_rows: number
    valid_rows: number
    invalid_rows: number
    rows: ImportPreviewRow[]
}

/**
 * Gửi file Excel để kiểm tra và xem trước dữ liệu import người dùng (SCRUM-119 Activity A2/A3/A6.2).
 * POST /api/users/import/preview
 */
export async function previewUserImportApi(
    requestFn: RequestFunction,
    file: File,
): Promise<ImportPreviewData> {
    const formData = new FormData()
    formData.append('file', file)

    const res = await requestFn('/api/users/import/preview', {
        method: 'POST',
        body: formData,
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (res.status === 403 ? 'FORBIDDEN' : res.status === 401 ? 'UNAUTHORIZED' : 'UNKNOWN_ERROR')
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi kiểm tra dữ liệu file Excel.')
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

export interface ImportRowResult {
    row_number: number
    name: string | null
    email: string | null
    phone?: string | null
    role?: string | null
    status?: string | null
    imported: boolean
    result: 'imported' | 'validation_error' | 'import_error' | string
    errors: ImportRowError[]
}

export interface ImportExecuteData {
    filename: string
    total_rows: number
    valid_rows: number
    invalid_rows: number
    imported_rows: number
    skipped_rows: number
    failed_rows: number
    summary: {
        success: number
        validation_errors: number
        import_errors: number
    }
    error_summary: Record<string, number>
    rows: ImportRowResult[]
}

export interface ImportExecuteResult {
    status?: string
    message: string
    data: ImportExecuteData
}

/**
 * Thực hiện import người dùng từ file Excel vào hệ thống (SCRUM-119 Activity A4/A5/A6.3).
 * POST /api/users/import
 */
export async function importUsersBulkApi(
    requestFn: RequestFunction,
    file: File,
): Promise<ImportExecuteResult> {
    const formData = new FormData()
    formData.append('file', file)

    const res = await requestFn('/api/users/import', {
        method: 'POST',
        body: formData,
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (res.status === 403 ? 'FORBIDDEN' : res.status === 401 ? 'UNAUTHORIZED' : 'IMPORT_FAILED')
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi import người dùng từ file Excel.')
        throw new ApiError(message, code, res.status)
    }

    return {
        status: body.status ?? 'success',
        message: body.message ?? 'Hoàn tất import người dùng.',
        data: body.data,
    }
}

// ----------------------------------------------------
// ẢNH ĐẠI DIỆN NGƯỜI DÙNG (SCRUM-121 Activity A5)
// ----------------------------------------------------
export {
    type AvatarUploadResponseData,
    type AvatarUploadResult,
    type AvatarDeleteResult,
    type AvatarValidationError,
    validateAvatarFile,
    getProfileAvatarApi,
    uploadProfileAvatarApi,
    deleteProfileAvatarApi,
    createSafeObjectUrl,
    revokeSafeObjectUrl,
    AvatarUrlManager,
    useAvatarObjectUrl,
    isAvatarNotFoundError,
    shouldFallbackAvatar,
} from './userAvatarApi'

