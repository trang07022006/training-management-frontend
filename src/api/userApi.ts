/**
 * API client quản trị người dùng (User Management API Client - SCRUM-25).
 * Tuân thủ tuyệt đối API Contract từ Backend (SCRUM-82 -> SCRUM-88).
 */

export interface User {
    id: string
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
    phone?: string
    role?: string
    status?: string
}

export interface UpdateUserData {
    name?: string
    email?: string
    phone?: string
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
    userId: string,
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
