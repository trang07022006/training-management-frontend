import { ApiError, type RequestFunction } from './userApi'

export { ApiError, type RequestFunction }

export interface Classroom {
    id: string
    room_code: string
    room_name: string
    room_type: 'physical' | 'online'
    capacity: number | null
    online_link: string | null
    status: string
    created_at: string
    updated_at: string
}

export interface CreateClassroomInput {
    room_code: string
    room_name: string
    room_type: 'physical' | 'online'
    capacity?: number | null
    online_link?: string | null
}

export interface ClassroomListResponse {
    items: Classroom[]
    total: number
    page: number
    page_size: number
}

export interface CapacityCheckResult {
    room_id: string
    room_code: string
    room_type: string
    room_capacity: number | null
    class_id: string
    class_code: string
    class_size: number
    basis: string
    is_exceeded: boolean
    warning: boolean
    warning_message: string | null
}

export async function listClassrooms(
    request: RequestFunction,
    params?: { room_type?: string; status?: string; search?: string; page?: number; page_size?: number },
): Promise<ClassroomListResponse> {
    const query = new URLSearchParams()
    if (params?.room_type) query.set('room_type', params.room_type)
    if (params?.status) query.set('status', params.status)
    if (params?.search) query.set('search', params.search)
    if (params?.page) query.set('page', String(params.page))
    if (params?.page_size) query.set('page_size', String(params.page_size))

    const url = `/api/v1/rooms${query.toString() ? `?${query.toString()}` : ''}`
    const response = await request(url)
    const json = await response.json()

    if (!response.ok || json.status === 'error') {
        throw new ApiError(json.message || 'Không thể tải danh sách phòng học.', json.code || 'ROOM_LIST_ERROR', response.status)
    }

    return json.data
}

export async function createClassroom(
    request: RequestFunction,
    input: CreateClassroomInput,
): Promise<Classroom> {
    const response = await request('/api/v1/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    })

    const json = await response.json()
    if (!response.ok || json.status === 'error') {
        throw new ApiError(json.message || 'Không thể khai báo phòng học.', json.code || 'ROOM_CREATE_ERROR', response.status)
    }

    return json.data
}

export async function getClassroomDetail(
    request: RequestFunction,
    classroomId: string,
): Promise<Classroom> {
    const response = await request(`/api/v1/rooms/${classroomId}`)
    const json = await response.json()

    if (!response.ok || json.status === 'error') {
        throw new ApiError(json.message || 'Không thể tải thông tin phòng học.', json.code || 'ROOM_DETAIL_ERROR', response.status)
    }

    return json.data
}

export async function checkRoomCapacity(
    request: RequestFunction,
    classroomId: string,
    classId: string,
): Promise<CapacityCheckResult> {
    const response = await request(`/api/v1/rooms/${classroomId}/check-capacity?class_id=${encodeURIComponent(classId)}`)
    const json = await response.json()

    if (!response.ok || json.status === 'error') {
        throw new ApiError(json.message || 'Không thể kiểm tra sức chứa phòng học.', json.code || 'ROOM_CAPACITY_ERROR', response.status)
    }

    return json.data
}
