import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useSession } from '../auth/SessionProvider'
import {
    listClassrooms,
    createClassroom,
    ApiError,
    type Classroom,
    type CreateClassroomInput,
    type CapacityCheckResult,
    type RequestFunction,
} from '../api/classroomApi'
import './ClassroomsPage.css'

export interface ClassroomsPageProps {
    initialRooms?: Classroom[]
    customRequest?: RequestFunction
    activeCapacityWarning?: CapacityCheckResult | null
}

export function ClassroomsPage({
    initialRooms,
    customRequest,
    activeCapacityWarning = null,
}: ClassroomsPageProps) {
    const session = useSession()
    const requestFn = customRequest || session.request

    const requestFnRef = useRef(requestFn)
    useEffect(() => {
        requestFnRef.current = requestFn
    }, [requestFn])

    const [rooms, setRooms] = useState<Classroom[]>(initialRooms || [])
    const [prevInitialRooms, setPrevInitialRooms] = useState<Classroom[] | undefined>(initialRooms)
    if (initialRooms !== prevInitialRooms) {
        setPrevInitialRooms(initialRooms)
        setRooms(initialRooms || [])
    }

    const [isLoading, setIsLoading] = useState(initialRooms === undefined)
    const [error, setError] = useState<string | null>(null)

    // Bộ lọc
    const [typeFilter, setTypeFilter] = useState<'all' | 'physical' | 'online'>('all')
    const [searchTerm, setSearchTerm] = useState('')

    // Modal khai báo phòng học
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [roomCode, setRoomCode] = useState('')
    const [roomName, setRoomName] = useState('')
    const [roomType, setRoomType] = useState<'physical' | 'online'>('physical')
    const [capacity, setCapacity] = useState('')
    const [onlineLink, setOnlineLink] = useState('')
    const [formError, setFormError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Cảnh báo sức chứa (SCRUM-221 - 221-02)
    const [capacityWarning, setCapacityWarning] = useState<CapacityCheckResult | null>(activeCapacityWarning)
    const [prevActiveWarning, setPrevActiveWarning] = useState<CapacityCheckResult | null>(activeCapacityWarning)
    if (activeCapacityWarning !== prevActiveWarning) {
        setPrevActiveWarning(activeCapacityWarning)
        setCapacityWarning(activeCapacityWarning)
    }

    // Tải danh sách phòng học từ API nếu không có initialRooms
    useEffect(() => {
        if (initialRooms !== undefined) return

        let isMounted = true

        listClassrooms(requestFnRef.current, {
            room_type: typeFilter === 'all' ? undefined : typeFilter,
            search: searchTerm.trim() || undefined,
        })
            .then((res) => {
                if (isMounted) {
                    setRooms(res.items)
                    setIsLoading(false)
                }
            })
            .catch((err: unknown) => {
                if (isMounted) {
                    const msg = err instanceof ApiError ? err.message : 'Lỗi khi tải danh sách phòng học.'
                    setError(msg)
                    setIsLoading(false)
                }
            })
            .finally(() => {
                if (isMounted) setIsLoading(false)
            })

        return () => {
            isMounted = false
        }
    }, [initialRooms, typeFilter, searchTerm])

    // Lọc phía client nếu dùng initialRooms trong tests
    const filteredRooms = rooms.filter((r) => {
        if (typeFilter !== 'all' && r.room_type !== typeFilter) return false
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim()
            const matchCode = r.room_code.toLowerCase().includes(term)
            const matchName = r.room_name.toLowerCase().includes(term)
            if (!matchCode && !matchName) return false
        }
        return true
    })

    const handleOpenCreateModal = () => {
        setRoomCode('')
        setRoomName('')
        setRoomType('physical')
        setCapacity('')
        setOnlineLink('')
        setFormError(null)
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setFormError(null)
    }

    const handleSubmitCreateRoom = async (e: FormEvent) => {
        e.preventDefault()
        setFormError(null)

        if (!roomCode.trim()) {
            setFormError('Vui lòng nhập mã phòng học.')
            return
        }

        if (!roomName.trim()) {
            setFormError('Vui lòng nhập tên phòng học.')
            return
        }

        if (roomType === 'physical') {
            const capNum = Number(capacity)
            if (!capacity || isNaN(capNum) || capNum <= 0) {
                setFormError('Sức chứa phòng vật lý phải lớn hơn 0.')
                return
            }
        } else {
            if (!onlineLink.trim()) {
                setFormError('Phòng trực tuyến bắt buộc phải có liên kết phòng học.')
                return
            }
        }

        setIsSubmitting(true)
        try {
            const payload: CreateClassroomInput = {
                room_code: roomCode.trim(),
                room_name: roomName.trim(),
                room_type: roomType,
                capacity: roomType === 'physical' ? Number(capacity) : null,
                online_link: roomType === 'online' ? onlineLink.trim() : null,
            }

            const created = await createClassroom(requestFnRef.current, payload)
            setRooms((prev) => [created, ...prev])
            setIsModalOpen(false)
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.message : 'Lỗi khi khai báo phòng học.'
            setFormError(msg)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="classrooms-container">
            {/* Header */}
            <div className="classrooms-header">
                <div className="classrooms-title-section">
                    <h1>Quản lý Phòng học</h1>
                    <p>Khai báo và theo dõi phòng học vật lý với sức chứa hoặc liên kết phòng học trực tuyến</p>
                </div>
                <div>
                    <button
                        type="button"
                        className="btn-primary"
                        data-testid="open-create-room-modal-btn"
                        onClick={handleOpenCreateModal}
                    >
                        + Khai báo phòng học
                    </button>
                </div>
            </div>

            {/* Cảnh báo sức chứa (SCRUM-221 - 221-02: WARNING ONLY, NON-BLOCKING) */}
            {capacityWarning && capacityWarning.is_exceeded && capacityWarning.warning_message && (
                <div
                    className="capacity-warning-banner"
                    role="alert"
                    data-testid="room-capacity-warning-banner"
                >
                    <span className="warning-icon" aria-hidden="true">⚠️</span>
                    <span data-testid="capacity-warning-text">{capacityWarning.warning_message}</span>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="form-error-banner" data-testid="classrooms-fetch-error">
                    {error}
                </div>
            )}

            {/* Bộ lọc */}
            <div className="classrooms-filter-bar">
                <div className="filter-item">
                    <label htmlFor="filter-room-type">Loại phòng</label>
                    <select
                        id="filter-room-type"
                        className="filter-select"
                        data-testid="filter-room-type"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as 'all' | 'physical' | 'online')}
                    >
                        <option value="all">Tất cả loại phòng</option>
                        <option value="physical">Phòng vật lý</option>
                        <option value="online">Phòng trực tuyến</option>
                    </select>
                </div>

                <div className="filter-item">
                    <label htmlFor="filter-room-search">Tìm kiếm</label>
                    <input
                        id="filter-room-search"
                        type="text"
                        className="filter-input"
                        data-testid="filter-room-search"
                        placeholder="Tìm theo mã hoặc tên phòng..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Danh sách phòng học */}
            <div className="classrooms-table-wrapper">
                {isLoading ? (
                    <div className="empty-state" data-testid="loading-state">
                        Đang tải danh sách phòng học...
                    </div>
                ) : filteredRooms.length === 0 ? (
                    <div className="empty-state" data-testid="empty-rooms-state">
                        <p>Chưa có phòng học nào trong hệ thống.</p>
                    </div>
                ) : (
                    <table className="classrooms-table" data-testid="classrooms-table">
                        <thead>
                            <tr>
                                <th>Mã phòng</th>
                                <th>Tên phòng</th>
                                <th>Loại phòng</th>
                                <th>Sức chứa / Liên kết</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRooms.map((room) => (
                                <tr key={room.id} data-testid={`room-row-${room.id}`}>
                                    <td data-testid={`room-code-${room.id}`} style={{ fontWeight: 600 }}>
                                        {room.room_code}
                                    </td>
                                    <td data-testid={`room-name-${room.id}`}>{room.room_name}</td>
                                    <td>
                                        <span
                                            className={`room-type-badge ${
                                                room.room_type === 'physical'
                                                    ? 'room-type-physical'
                                                    : 'room-type-online'
                                            }`}
                                            data-testid={`room-type-badge-${room.id}`}
                                        >
                                            {room.room_type === 'physical'
                                                ? 'Phòng vật lý'
                                                : 'Phòng trực tuyến'}
                                        </span>
                                    </td>
                                    <td>
                                        {room.room_type === 'physical' ? (
                                            <span data-testid={`room-capacity-${room.id}`}>
                                                {room.capacity != null ? `${room.capacity} chỗ` : '—'}
                                            </span>
                                        ) : (
                                            <a
                                                href={room.online_link || '#'}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="online-link-anchor"
                                                data-testid={`room-link-${room.id}`}
                                            >
                                                {room.online_link || '—'}
                                            </a>
                                        )}
                                    </td>
                                    <td>
                                        <span data-testid={`room-status-${room.id}`}>
                                            {room.status === 'active' ? 'Hoạt động' : room.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal khai báo phòng học mới */}
            {isModalOpen && (
                <div className="modal-overlay" data-testid="create-room-modal">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Khai báo phòng học mới</h2>
                            <button
                                type="button"
                                className="modal-close-btn"
                                data-testid="close-room-modal-btn"
                                onClick={handleCloseModal}
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmitCreateRoom}>
                            <div className="modal-body">
                                {formError && (
                                    <div className="form-error-banner" data-testid="room-form-error">
                                        {formError}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label htmlFor="room-code">Mã phòng học *</label>
                                    <input
                                        id="room-code"
                                        type="text"
                                        className="form-input"
                                        data-testid="input-room-code"
                                        placeholder="Ví dụ: P101, LAB-A, ZOOM-01..."
                                        value={roomCode}
                                        onChange={(e) => setRoomCode(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="room-name">Tên phòng học *</label>
                                    <input
                                        id="room-name"
                                        type="text"
                                        className="form-input"
                                        data-testid="input-room-name"
                                        placeholder="Ví dụ: Phòng thực hành phần mềm 1..."
                                        value={roomName}
                                        onChange={(e) => setRoomName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="room-type">Loại phòng học *</label>
                                    <select
                                        id="room-type"
                                        className="form-select"
                                        data-testid="select-room-type"
                                        value={roomType}
                                        onChange={(e) => setRoomType(e.target.value as 'physical' | 'online')}
                                    >
                                        <option value="physical">Phòng vật lý</option>
                                        <option value="online">Phòng trực tuyến</option>
                                    </select>
                                </div>

                                {roomType === 'physical' ? (
                                    <div className="form-group">
                                        <label htmlFor="room-capacity">Sức chứa (chỗ ngồi) *</label>
                                        <input
                                            id="room-capacity"
                                            type="number"
                                            min="1"
                                            className="form-input"
                                            data-testid="input-capacity"
                                            placeholder="Ví dụ: 30, 45, 60..."
                                            value={capacity}
                                            onChange={(e) => setCapacity(e.target.value)}
                                            required
                                        />
                                    </div>
                                ) : (
                                    <div className="form-group">
                                        <label htmlFor="online-link">Liên kết phòng học trực tuyến *</label>
                                        <input
                                            id="online-link"
                                            type="text"
                                            className="form-input"
                                            data-testid="input-online-link"
                                            placeholder="https://meet.google.com/... hoặc https://zoom.us/..."
                                            value={onlineLink}
                                            onChange={(e) => setOnlineLink(e.target.value)}
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    data-testid="cancel-room-btn"
                                    onClick={handleCloseModal}
                                    disabled={isSubmitting}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    data-testid="submit-room-btn"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Đang lưu...' : 'Khai báo phòng'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ClassroomsPage
