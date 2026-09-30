/**
 * API client quản trị người dùng (User Management API Client - SCRUM-25).
 * Tuân thủ tuyệt đối API Contract từ Backend (SCRUM-82 -> SCRUM-88).
 */

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

    constructor(message: string, code = 'API_ERROR', status = 500) {
        super(message)
        this.name = 'ApiError'
        this.code = code
        this.status = status
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
        throw new ApiError(
            body.message || 'Lỗi khi tải danh sách người dùng.',
            body.code || (res.status === 403 ? 'FORBIDDEN' : res.status === 401 ? 'UNAUTHORIZED' : 'UNKNOWN_ERROR'),
            res.status,
        )
    }

    return body.data ?? { items: [], users: [], page: 1, page_size: 20, total: 0, total_pages: 0 }
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
        throw new ApiError(
            body.message || 'Lỗi khi tạo người dùng.',
            body.code || (res.status === 409 ? 'DUPLICATE_EMAIL' : res.status === 403 ? 'FORBIDDEN' : 'VALIDATION_ERROR'),
            res.status,
        )
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
        throw new ApiError(
            body.message || 'Lỗi khi cập nhật người dùng.',
            body.code || (res.status === 404 ? 'USER_NOT_FOUND' : res.status === 409 ? 'DUPLICATE_EMAIL' : res.status === 403 ? 'FORBIDDEN' : 'UPDATE_ERROR'),
            res.status,
        )
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
        throw new ApiError(
            body.message || 'Lỗi khi tải vai trò của người dùng.',
            body.code || (res.status === 404 ? 'USER_NOT_FOUND' : res.status === 403 ? 'FORBIDDEN' : 'FETCH_ROLES_ERROR'),
            res.status,
        )
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
        throw new ApiError(
            body.message || 'Lỗi khi tải danh mục vai trò.',
            body.code || (res.status === 403 ? 'FORBIDDEN' : 'FETCH_AVAILABLE_ROLES_ERROR'),
            res.status,
        )
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
        throw new ApiError(
            body.message || 'Lỗi khi phân vai trò cho người dùng.',
            body.code || (res.status === 409 ? 'DUPLICATE_ROLE_ASSIGNMENT' : res.status === 404 ? 'NOT_FOUND' : res.status === 403 ? 'FORBIDDEN' : 'ASSIGN_ROLE_ERROR'),
            res.status,
        )
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
        throw new ApiError(
            body.message || 'Lỗi khi gỡ vai trò khỏi người dùng.',
            body.code || (res.status === 404 ? 'ROLE_NOT_ASSIGNED' : res.status === 403 ? 'FORBIDDEN' : 'REVOKE_ROLE_ERROR'),
            res.status,
        )
    }
    return body.data
}
