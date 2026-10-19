import { useState, useEffect, useRef, useMemo, type KeyboardEvent } from 'react'
import { useSession } from '../auth/SessionProvider'
import {
    listClassrooms,
    getClassroomDetail,
    checkRoomCapacity,
    type Classroom,
    type RequestFunction,
} from '../api/classroomApi'
import './ClassroomSelect.css'

export interface ClassroomSelectProps {
    id?: string
    value: string | null | undefined
    onChange: (roomId: string | null, roomObj?: Classroom | null) => void
    classId?: string
    classSize?: number
    placeholder?: string
    disabled?: boolean
    allowClear?: boolean
    initialRoomName?: string
    isLegacyRoom?: boolean
    testId?: string
    customRequest?: RequestFunction
}

export function ClassroomSelect({
    id,
    value,
    onChange,
    classId,
    classSize,
    placeholder = 'Chọn phòng học...',
    disabled = false,
    allowClear = true,
    initialRoomName,
    isLegacyRoom = false,
    testId,
    customRequest,
}: ClassroomSelectProps) {
    let sessionRequest: RequestFunction | undefined
    try {
        const session = useSession()
        sessionRequest = session.request
    } catch {
        sessionRequest = undefined
    }
    const requestFn = (customRequest || sessionRequest || fetch) as RequestFunction

    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [rooms, setRooms] = useState<Classroom[]>([])
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [fetchError, setFetchError] = useState<string | null>(null)

    // Current selected room details
    const [selectedRoom, setSelectedRoom] = useState<Classroom | null>(null)
    const [isLegacy, setIsLegacy] = useState<boolean>(isLegacyRoom)
    const [legacyText, setLegacyText] = useState<string | null>(null)

    // Capacity warning
    const [capacityWarning, setCapacityWarning] = useState<string | null>(null)

    const containerRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Helper: format room label
    const formatRoomOptionLabel = (room: Classroom): string => {
        if (room.room_type === 'online') {
            return `${room.room_code} – ${room.room_name} – Trực tuyến`
        }
        const cap = room.capacity ? `${room.capacity} chỗ` : 'Sức chứa không xác định'
        return `${room.room_code} – ${room.room_name} – ${cap}`
    }

    // 1. Load initial page of classrooms
    const fetchRooms = async (pageToFetch: number, search: string, isAppend = false) => {
        if (isAppend) {
            setIsLoadingMore(true)
        } else {
            setIsLoading(true)
        }
        setFetchError(null)

        try {
            const res = await listClassrooms(requestFn, {
                page: pageToFetch,
                page_size: 20,
                search: search.trim() || undefined,
                status: 'active', // Chỉ chọn phòng đang hoạt động
            })

            setTotal(res.total || 0)
            setPage(pageToFetch)
            if (isAppend) {
                setRooms((prev) => {
                    const existingIds = new Set(prev.map((r) => r.id))
                    const newItems = (res.items || []).filter((r) => !existingIds.has(r.id))
                    return [...prev, ...newItems]
                })
            } else {
                setRooms(res.items || [])
            }
        } catch (err: unknown) {
            console.error('Lỗi khi tải danh sách phòng học:', err)
            setFetchError('Không thể tải danh mục phòng học. Vui lòng thử lại.')
        } finally {
            setIsLoading(false)
            setIsLoadingMore(false)
        }
    }

    // 2. Fetch on mount & handle dropdown open
    useEffect(() => {
        fetchRooms(1, '')
    }, [requestFn])

    // 3. Resolve selectedRoom whenever `value` or `rooms` changes
    useEffect(() => {
        let isMounted = true
        if (!value) {
            setSelectedRoom(null)
            setIsLegacy(false)
            setLegacyText(null)
            setCapacityWarning(null)
            return
        }

        // Try to match in loaded rooms
        const found = rooms.find((r) => r.id === value || r.room_code === value)
        if (found) {
            setSelectedRoom(found)
            setIsLegacy(false)
            setLegacyText(null)
            return
        }

        // If not in current page, attempt to fetch detail by ID or room_code from backend
        getClassroomDetail(requestFn, value)
            .then((detail) => {
                if (isMounted && detail && detail.id) {
                    setSelectedRoom(detail)
                    setIsLegacy(false)
                    setLegacyText(null)
                    // Prepend to rooms list if missing
                    setRooms((prev) => {
                        if (!prev.some((r) => r.id === detail.id)) {
                            return [detail, ...prev]
                        }
                        return prev
                    })
                }
            })
            .catch(() => {
                // If lookup fails or value is a raw legacy string (e.g. "P301")
                if (isMounted) {
                    setIsLegacy(true)
                    setLegacyText(initialRoomName || value)
                    setSelectedRoom(null)
                }
            })

        return () => {
            isMounted = false
        }
    }, [value, rooms, requestFn, initialRoomName])

    // 4. Capacity check
    useEffect(() => {
        if (!selectedRoom || selectedRoom.room_type !== 'physical') {
            setCapacityWarning(null)
            return
        }

        // Instant check if classSize is passed
        if (typeof classSize === 'number' && selectedRoom.capacity) {
            if (classSize > selectedRoom.capacity) {
                setCapacityWarning(`Sĩ số lớp (${classSize} học viên) vượt quá sức chứa phòng (${selectedRoom.capacity} chỗ).`)
                return
            } else {
                setCapacityWarning(null)
            }
        }

        // Check via backend if classId is provided
        if (classId && selectedRoom.id) {
            checkRoomCapacity(requestFn, selectedRoom.id, classId)
                .then((res) => {
                    if (res?.warning && res?.warning_message) {
                        setCapacityWarning(res.warning_message)
                    } else if (res?.is_exceeded) {
                        setCapacityWarning(`Sĩ số lớp (${res.class_size} học viên) vượt quá sức chứa phòng (${res.room_capacity} chỗ).`)
                    } else {
                        setCapacityWarning(null)
                    }
                })
                .catch(() => {
                    // Silently ignore if capacity check endpoint fails
                })
        }
    }, [selectedRoom, classId, classSize, requestFn])

    // 5. Handle search debounce
    const handleSearchChange = (term: string) => {
        setSearchTerm(term)
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }
        debounceTimerRef.current = setTimeout(() => {
            fetchRooms(1, term)
        }, 300)
    }

    // 6. Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        }
    }, [])

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus()
        }
    }, [isOpen])

    const handleSelect = (room: Classroom | null) => {
        if (room) {
            setSelectedRoom(room)
            setIsLegacy(false)
            setLegacyText(null)
            onChange(room.id, room)
        } else {
            setSelectedRoom(null)
            setIsLegacy(false)
            setLegacyText(null)
            onChange(null, null)
        }
        setIsOpen(false)
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        handleSelect(null)
    }

    const hasMore = rooms.length < total

    const handleLoadMore = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!isLoadingMore && hasMore) {
            fetchRooms(page + 1, searchTerm, true)
        }
    }

    // Key navigation
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape') {
            setIsOpen(false)
        } else if (e.key === 'Enter' || e.key === ' ') {
            if (!isOpen && !disabled) {
                e.preventDefault()
                setIsOpen(true)
            }
        }
    }

    // Render current label in control box
    const displayLabel = useMemo(() => {
        if (selectedRoom) {
            return formatRoomOptionLabel(selectedRoom)
        }
        if (isLegacy && legacyText) {
            return `⚠️ ${legacyText} (Dữ liệu cũ - Cần chọn lại)`
        }
        return null
    }, [selectedRoom, isLegacy, legacyText])

    return (
        <div
            className="classroom-select-container"
            ref={containerRef}
            onKeyDown={handleKeyDown}
            data-testid={testId ? `${testId}-container` : 'classroom-select-container'}
        >
            <input
                type="text"
                id={id}
                name={id}
                tabIndex={-1}
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    opacity: 0,
                    width: 0,
                    height: 0,
                    margin: 0,
                    padding: 0,
                    border: 'none',
                    pointerEvents: 'none',
                }}
                data-testid={testId}
                value={value || ''}
                onChange={(e) => {
                    const val = e.target.value
                    if (val) {
                        const found = rooms.find((r) => r.id === val || r.room_code === val)
                        if (found) {
                            handleSelect(found)
                        } else {
                            onChange(val, null)
                        }
                    } else {
                        handleSelect(null)
                    }
                }}
            />
            <div
                tabIndex={disabled ? -1 : 0}
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                className={`classroom-select-control ${isOpen ? 'active' : ''} ${disabled ? 'disabled' : ''} ${
                    isLegacy ? 'has-legacy' : ''
                }`}
                onClick={() => !disabled && setIsOpen((prev) => !prev)}
                data-testid={testId ? `${testId}-control` : 'classroom-select-control'}
            >
                <div className="classroom-select-value">
                    {displayLabel ? (
                        <span>
                            {selectedRoom?.room_type === 'online' ? '🌐 ' : selectedRoom?.room_type === 'physical' ? '🏫 ' : ''}
                            {displayLabel}
                        </span>
                    ) : (
                        <span className="placeholder">{placeholder}</span>
                    )}
                </div>

                <div className="classroom-select-actions">
                    {allowClear && (selectedRoom || isLegacy) && !disabled && (
                        <button
                            type="button"
                            className="classroom-clear-btn"
                            title="Bỏ chọn phòng học"
                            onClick={handleClear}
                            aria-label="Xóa chọn phòng"
                            data-testid="classroom-clear-btn"
                        >
                            ✕
                        </button>
                    )}
                    <span className={`classroom-chevron ${isOpen ? 'open' : ''}`}>▼</span>
                </div>
            </div>

            {/* Dropdown Options List */}
            {isOpen && (
                <div className="classroom-dropdown-menu" role="listbox">
                    <div className="classroom-search-box">
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="classroom-search-input"
                            placeholder="Tìm kiếm mã, tên phòng..."
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            data-testid="classroom-search-input"
                        />
                    </div>

                    <ul className="classroom-items-list">
                        {allowClear && (
                            <li
                                className={`classroom-item empty-option ${!selectedRoom && !isLegacy ? 'selected' : ''}`}
                                onClick={() => handleSelect(null)}
                                role="option"
                                aria-selected={!selectedRoom && !isLegacy}
                                data-testid="classroom-option-unassigned"
                            >
                                <div className="classroom-item-main">
                                    <span>⚪ -- Chưa xếp phòng --</span>
                                </div>
                            </li>
                        )}

                        {isLoading && rooms.length === 0 ? (
                            <div className="classroom-state-msg" data-testid="classroom-loading">
                                ⏳ Đang tải danh sách phòng học...
                            </div>
                        ) : fetchError ? (
                            <div className="classroom-state-msg error" data-testid="classroom-error">
                                <div>{fetchError}</div>
                                <button
                                    type="button"
                                    className="classroom-retry-btn"
                                    onClick={() => fetchRooms(1, searchTerm)}
                                >
                                    Thử lại
                                </button>
                            </div>
                        ) : rooms.length === 0 ? (
                            <div className="classroom-state-msg" data-testid="classroom-empty">
                                🔍 Không tìm thấy phòng học phù hợp.
                            </div>
                        ) : (
                            rooms.map((room) => {
                                const isSelected = selectedRoom?.id === room.id
                                return (
                                    <li
                                        key={room.id}
                                        className={`classroom-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleSelect(room)}
                                        role="option"
                                        aria-selected={isSelected}
                                        data-testid={`classroom-option-${room.room_code}`}
                                    >
                                        <div className="classroom-item-main">
                                            <span>
                                                {room.room_type === 'online' ? '🌐' : '🏫'}{' '}
                                                <strong>{room.room_code}</strong> – {room.room_name}
                                            </span>
                                            <span
                                                className={`classroom-badge-type ${
                                                    room.room_type === 'online' ? 'badge-online' : 'badge-physical'
                                                }`}
                                            >
                                                {room.room_type === 'online'
                                                    ? 'Trực tuyến'
                                                    : `${room.capacity || 0} chỗ`}
                                            </span>
                                        </div>
                                        {room.room_type === 'online' && room.online_link && (
                                            <div className="classroom-item-subtext" title={room.online_link}>
                                                🔗 {room.online_link}
                                            </div>
                                        )}
                                    </li>
                                )
                            })
                        )}
                    </ul>

                    {hasMore && (
                        <div className="classroom-load-more">
                            <button
                                type="button"
                                className="classroom-load-more-btn"
                                disabled={isLoadingMore}
                                onClick={handleLoadMore}
                                data-testid="classroom-load-more-btn"
                            >
                                {isLoadingMore ? '⏳ Đang tải thêm...' : `Tải thêm phòng học (${rooms.length}/${total})...`}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Legacy Warning Message */}
            {isLegacy && legacyText && (
                <div className="classroom-legacy-notice" role="alert" data-testid="classroom-legacy-notice">
                    <span>⚠️</span>
                    <div>
                        <strong>Dữ liệu phòng cũ: &ldquo;{legacyText}&rdquo;</strong> chưa được liên kết với danh mục phòng chuẩn.
                        Vui lòng chọn phòng học hợp lệ từ danh sách trên để cập nhật.
                    </div>
                </div>
            )}

            {/* Capacity Warning Badge */}
            {capacityWarning && (
                <div className="classroom-capacity-warning" role="alert" data-testid="classroom-capacity-warning">
                    <span>⚠️</span>
                    <span>{capacityWarning}</span>
                </div>
            )}
        </div>
    )
}
