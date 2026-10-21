import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useInRouterContext } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getRolePermissions, SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import {
    listClasses,
    createClass,
    updateClassStatus,
    getClassDetail,
    CLASS_STATUS_LABELS,
    type TrainingClass,
    type ClassStatus,
    type ListClassesParams,
    type RequestFunction,
    ApiError,
} from '../api/classApi'
import { getTrainingPrograms, type TrainingProgram } from '../api/trainingProgramApi'
import { enrollStudents, getClassRoster, type EnrollmentItem } from '../api/enrollmentApi'
import { listStudents, type Student } from '../api/studentApi'
import { ScheduleGenerationModal } from '../components/ScheduleGenerationModal'
import { HolidaysManagementModal } from '../components/HolidaysManagementModal'
import { getErrorMessage } from '../utils/errorMessages'
import { formatVietnamDate } from '../utils/dateUtils'
import { fetchUsersApi, type User } from '../api/userApi'
import './ClassesPage.css'

export interface ClassesPageProps {
    initialClasses?: TrainingClass[]
    initialTotal?: number
    initialPrograms?: TrainingProgram[]
    initialStudents?: Student[]
    initialInstructors?: User[]
    customRequest?: RequestFunction
    canManageOverride?: boolean
}

export function ClassesPage(props: ClassesPageProps) {
    const inRouter = useInRouterContext()
    if (inRouter) {
        return <ClassesPageRouted {...props} />
    }
    return <ClassesPageBase {...props} />
}

function ClassesPageRouted(props: ClassesPageProps) {
    const navigate = useNavigate()
    return <ClassesPageBase {...props} navigate={navigate} />
}

function ClassesPageBase({
    initialClasses,
    initialTotal,
    initialPrograms,
    initialStudents,
    initialInstructors,
    customRequest,
    canManageOverride,
    navigate,
}: ClassesPageProps & { navigate?: (path: string) => void }) {
    const { request: sessionRequest, role, roles, permissions } = useSession()
    const requestFn: RequestFunction = customRequest ?? sessionRequest
    const requestFnRef = useRef(requestFn)
    useEffect(() => {
        requestFnRef.current = requestFn
    }, [requestFn])

    // Phân quyền
    const isDedicated = Boolean(navigate) && initialClasses === undefined && customRequest === undefined
    const effectiveRoles = roles && roles.length > 0 ? roles : (role ? [role] : [])
    const normalizedRoles = effectiveRoles.map((r) => (typeof r === 'string' ? r.trim().toLowerCase() : ''))
    const effectivePerms =
        permissions && permissions.length > 0 ? permissions : getRolePermissions(effectiveRoles)
    const isTrainerOnly =
        normalizedRoles.includes('trainer') &&
        !normalizedRoles.includes('admin') &&
        !normalizedRoles.includes('training_manager')
    const canManage =
        canManageOverride !== undefined
            ? canManageOverride
            : (
                !isTrainerOnly && (
                    effectivePerms.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE) ||
                    normalizedRoles.includes('admin') ||
                    normalizedRoles.includes('training_manager')
                )
            )

    const canManageSchedule =
        canManageOverride !== undefined
            ? canManageOverride
            : effectivePerms.includes(SYSTEM_PERMISSIONS.SCHEDULE_MANAGE)

    // State danh sách lớp học
    const [classes, setClasses] = useState<TrainingClass[]>(initialClasses ?? [])
    const [total, setTotal] = useState<number>(initialTotal ?? initialClasses?.length ?? 0)
    const [loading, setLoading] = useState(initialClasses === undefined)
    const [searchKeyword, setSearchKeyword] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')

    // State bộ lọc lớp học (SCRUM-219)
    const [filterStatus, setFilterStatus] = useState<string>('')
    const [filterProgramId, setFilterProgramId] = useState<string>('')
    const [filterInstructorId, setFilterInstructorId] = useState<string>('')
    const [filterDateFrom, setFilterDateFrom] = useState<string>('')
    const [filterDateTo, setFilterDateTo] = useState<string>('')
    const [instructors, setInstructors] = useState<User[]>(initialInstructors ?? [])

    // Debounce searchKeyword 350ms (SCRUM-219 Auto Apply Filter)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchKeyword.trim())
        }, 350)
        return () => clearTimeout(timer)
    }, [searchKeyword])

    // State danh sách chương trình đào tạo để chọn khi mở lớp
    const [programs, setPrograms] = useState<TrainingProgram[]>(initialPrograms ?? [])

    // State danh sách học viên dùng cho modal ghi danh
    const [students, setStudents] = useState<Student[]>(initialStudents ?? [])

    // Modal tạo lớp học mới (SCRUM-217)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [createModalError, setCreateModalError] = useState<string | null>(null)
    const [classCodeError, setClassCodeError] = useState<string | null>(null)
    const [createForm, setCreateForm] = useState({
        class_code: '',
        program_id: '',
        expected_start_date: '',
        max_capacity: 30,
        learning_mode: 'offline',
    })

    // Modal xem chi tiết & môn học sao chép (SCRUM-217)
    const [selectedClass, setSelectedClass] = useState<TrainingClass | null>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

    // Modal ghi danh học viên vào lớp (SCRUM-218)
    const [enrollModalClass, setEnrollModalClass] = useState<TrainingClass | null>(null)
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false)
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
    const [alreadyEnrolledIds, setAlreadyEnrolledIds] = useState<string[]>([])
    const [studentSearchKeyword, setStudentSearchKeyword] = useState('')
    const [isEnrolling, setIsEnrolling] = useState(false)
    const [enrollModalError, setEnrollModalError] = useState<string | null>(null)

    // Modal xem danh sách học viên trong lớp (Roster - SCRUM-218)
    const [rosterModalClass, setRosterModalClass] = useState<TrainingClass | null>(null)
    const [isRosterModalOpen, setIsRosterModalOpen] = useState(false)
    const [rosterItems, setRosterItems] = useState<EnrollmentItem[]>([])
    const [isRosterLoading, setIsRosterLoading] = useState(false)

    // Alert feedback
    const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Modal Thời khóa biểu & Ngày nghỉ lễ (SCRUM-224)
    const [scheduleModalClass, setScheduleModalClass] = useState<TrainingClass | null>(null)
    const [isHolidaysModalOpen, setIsHolidaysModalOpen] = useState(false)

    // Tải danh sách lớp học có lọc (SCRUM-217 & SCRUM-219)
    const loadClasses = useCallback(
        async (customParams?: {
            search?: string
            status?: string
            program_id?: string
            instructor_id?: string
            date_from?: string
            date_to?: string
        }) => {
            setLoading(true)
            setAlertMessage(null)
            try {
                const searchVal = customParams && 'search' in customParams ? customParams.search : debouncedSearch
                const statusVal = customParams && 'status' in customParams ? customParams.status : filterStatus
                const progVal = customParams && 'program_id' in customParams ? customParams.program_id : filterProgramId
                const insVal = customParams && 'instructor_id' in customParams ? customParams.instructor_id : filterInstructorId
                const fromVal = customParams && 'date_from' in customParams ? customParams.date_from : filterDateFrom
                const toVal = customParams && 'date_to' in customParams ? customParams.date_to : filterDateTo

                const params: ListClassesParams = {
                    search: searchVal?.trim() || undefined,
                    status: statusVal?.trim() || undefined,
                    program_id: progVal?.trim() || undefined,
                    instructor_id: insVal?.trim() || undefined,
                    date_from: fromVal?.trim() || undefined,
                    date_to: toVal?.trim() || undefined,
                    page: 1,
                    page_size: 50,
                }
                const res = await listClasses(requestFnRef.current, params)
                setClasses(res.items)
                setTotal(res.total)
            } catch (err: unknown) {
                const msg = err instanceof ApiError ? err.message : getErrorMessage(err, 'Lỗi khi tải danh sách lớp học.')
                setAlertMessage({ type: 'error', text: msg })
            } finally {
                setLoading(false)
            }
        },
        [debouncedSearch, filterStatus, filterProgramId, filterInstructorId, filterDateFrom, filterDateTo],
    )

    // Tải danh sách giảng viên để lọc (SCRUM-219)
    useEffect(() => {
        let isMounted = true
        if (initialInstructors === undefined) {
            fetchUsersApi(requestFnRef.current, { role: 'trainer', page: 1, page_size: 100 })
                .then((res) => {
                    if (isMounted && res.items) {
                        setInstructors(res.items)
                    }
                })
                .catch(() => {
                    // Ignore background load error
                })
        }
        return () => {
            isMounted = false
        }
    }, [initialInstructors])

    // Initial load classes
    useEffect(() => {
        let isMounted = true
        if (initialClasses === undefined) {
            listClasses(requestFnRef.current, {
                search: undefined,
                page: 1,
                page_size: 50,
            })
                .then((res) => {
                    if (isMounted) {
                        setClasses(res.items)
                        setTotal(res.total)
                    }
                })
                .catch((err: unknown) => {
                    if (isMounted) {
                        const msg = err instanceof ApiError ? err.message : getErrorMessage(err, 'Lỗi khi tải danh sách lớp học.')
                        setAlertMessage({ type: 'error', text: msg })
                    }
                })
                .finally(() => {
                    if (isMounted) setLoading(false)
                })
        }
        return () => {
            isMounted = false
        }
    }, [initialClasses])

    // Load programs for select dropdown
    useEffect(() => {
        let isMounted = true
        if (initialPrograms === undefined) {
            getTrainingPrograms(requestFnRef.current, { page: 1, page_size: 100 })
                .then((res) => {
                    if (isMounted && res.items) {
                        setPrograms(res.items)
                    }
                })
                .catch(() => {
                    // Ignore program load failure in background
                })
        }
        return () => {
            isMounted = false
        }
    }, [initialPrograms])

    // Load students for enroll modal
    useEffect(() => {
        let isMounted = true
        if (initialStudents === undefined) {
            listStudents(requestFnRef.current, { page: 1, page_size: 100 })
                .then((res) => {
                    if (isMounted && res.items) {
                        setStudents(res.items)
                    }
                })
                .catch(() => {
                    // Ignore student load failure in background
                })
        }
        return () => {
            isMounted = false
        }
    }, [initialStudents])

    // Ref theo dõi lần render đầu tiên và trạng thái reset (SCRUM-219 Auto Apply Filter)
    const isFirstRender = useRef(true)
    const isResettingRef = useRef(false)

    // Tự động áp dụng bộ lọc và tìm kiếm ngay khi thay đổi điều kiện (SCRUM-219 Auto Apply Filter)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        if (isResettingRef.current) {
            return
        }

        loadClasses({
            search: debouncedSearch,
            status: filterStatus,
            program_id: filterProgramId,
            instructor_id: filterInstructorId,
            date_from: filterDateFrom,
            date_to: filterDateTo,
        })
    }, [debouncedSearch, filterStatus, filterProgramId, filterInstructorId, filterDateFrom, filterDateTo, loadClasses])

    const handleResetFilters = () => {
        isResettingRef.current = true
        setSearchKeyword('')
        setDebouncedSearch('')
        setFilterStatus('')
        setFilterProgramId('')
        setFilterInstructorId('')
        setFilterDateFrom('')
        setFilterDateTo('')
        loadClasses({
            search: '',
            status: '',
            program_id: '',
            instructor_id: '',
            date_from: '',
            date_to: '',
        }).finally(() => {
            isResettingRef.current = false
        })
    }

    // Mở modal / điều hướng tạo lớp
    const handleOpenCreateModal = () => {
        if (isDedicated && navigate) {
            navigate('/classes/new')
            return
        }
        setCreateModalError(null)
        setClassCodeError(null)
        setCreateForm({
            class_code: '',
            program_id: programs.length > 0 ? programs[0].id : '',
            expected_start_date: '',
            max_capacity: 30,
            learning_mode: 'offline',
        })
        setIsCreateModalOpen(true)
    }

    // Submit tạo lớp học mới (217-01 -> 217-04)
    const handleCreateClass = async (e: FormEvent) => {
        e.preventDefault()
        setIsCreating(true)
        setCreateModalError(null)
        setClassCodeError(null)
        setAlertMessage(null)

        try {
            const created = await createClass(requestFnRef.current, {
                class_code: createForm.class_code.trim(),
                program_id: createForm.program_id.trim(),
                expected_start_date: createForm.expected_start_date || null,
                max_capacity: Number(createForm.max_capacity),
                learning_mode: createForm.learning_mode,
            })

            setClasses((prev) => [created, ...prev])
            setTotal((prev) => prev + 1)
            setAlertMessage({
                type: 'success',
                text: `Mở lớp học '${created.class_code}' thành công. Đã sao chép ${created.copied_subjects_count ?? 0} môn học từ chương trình.`,
            })
            setIsCreateModalOpen(false)
        } catch (err: unknown) {
            let msg = 'Lỗi khi mở lớp học mới.'
            let isDuplicateClassCode = false

            if (err instanceof ApiError) {
                if (
                    err.code === 'CLASS_CODE_ALREADY_EXISTS' ||
                    err.code === 'CLASS_CODE_EXISTS' ||
                    err.code === 'DUPLICATE_CLASS_CODE' ||
                    err.status === 409
                ) {
                    isDuplicateClassCode = true
                    msg = 'Mã lớp đã tồn tại. Vui lòng chọn mã lớp khác.'
                } else {
                    msg = err.message
                }
            } else {
                msg = getErrorMessage(err, 'Lỗi khi mở lớp học mới.')
                if (
                    msg.includes('đã tồn tại') ||
                    msg.includes('CLASS_CODE_ALREADY_EXISTS') ||
                    msg.includes('trùng mã')
                ) {
                    isDuplicateClassCode = true
                    msg = 'Mã lớp đã tồn tại. Vui lòng chọn mã lớp khác.'
                }
            }

            if (isDuplicateClassCode) {
                setClassCodeError(msg)
                setCreateModalError(msg)
            } else {
                setCreateModalError(msg)
            }
            // Không đóng modal khi lỗi. Giữ nguyên createForm để người dùng sửa mã lớp.
        } finally {
            setIsCreating(false)
        }
    }

    // Thay đổi trạng thái vòng đời lớp học (217-03)
    const handleStatusChange = async (classId: string, newStatus: string) => {
        try {
            const updated = await updateClassStatus(requestFnRef.current, classId, newStatus)
            setClasses((prev) =>
                prev.map((c) => (c.id === classId ? { ...c, ...updated } : c)),
            )
            setAlertMessage({
                type: 'success',
                text: `Cập nhật trạng thái lớp '${updated.class_code}' thành '${updated.status_label}' thành công.`,
            })
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.message : getErrorMessage(err, 'Lỗi khi cập nhật trạng thái lớp học.')
            setAlertMessage({ type: 'error', text: msg })
        }
    }

    // Mở modal / điều hướng xem chi tiết lớp học & môn học (217-04)
    const handleOpenDetailModal = async (cls: TrainingClass) => {
        if (isDedicated && navigate) {
            navigate(`/classes/${cls.id}/subjects`)
            return
        }
        setSelectedClass(cls)
        setIsDetailModalOpen(true)
        try {
            const detail = await getClassDetail(requestFnRef.current, cls.id)
            setSelectedClass(detail)
        } catch {
            // Giữ lại dữ liệu hiện tại
        }
    }

    // =========================================================================
    // XỬ LÝ GHI DANH HỌC VIÊN (SCRUM-218)
    // =========================================================================

    const handleOpenEnrollModal = async (cls: TrainingClass) => {
        setEnrollModalClass(cls)
        setSelectedStudentIds([])
        setEnrollModalError(null)
        setStudentSearchKeyword('')
        setIsEnrollModalOpen(true)

        // Tải danh sách học viên đã có trong lớp để đánh dấu disabled
        try {
            const roster = await getClassRoster(requestFnRef.current, cls.id)
            const enrolledIds = roster.items.map((i) => i.student_id)
            setAlreadyEnrolledIds(enrolledIds)
        } catch {
            setAlreadyEnrolledIds([])
        }

        // Tải danh sách học viên toàn hệ thống nếu chưa có
        if (students.length === 0 && initialStudents === undefined) {
            try {
                const res = await listStudents(requestFnRef.current, { page: 1, page_size: 100 })
                setStudents(res.items)
            } catch {
                // Ignore background load error
            }
        }
    }

    const handleToggleStudent = (studentId: string) => {
        if (alreadyEnrolledIds.includes(studentId)) return
        setSelectedStudentIds((prev) =>
            prev.includes(studentId)
                ? prev.filter((id) => id !== studentId)
                : [...prev, studentId],
        )
    }

    const handleEnrollSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!enrollModalClass) return
        setEnrollModalError(null)

        if (selectedStudentIds.length === 0) {
            setEnrollModalError('Vui lòng chọn ít nhất một học viên để ghi danh.')
            return
        }

        const currentEnrolled = enrollModalClass.enrolled_count ?? 0
        if (currentEnrolled + selectedStudentIds.length > enrollModalClass.max_capacity) {
            setEnrollModalError('Lớp học đã đủ số lượng học viên tối đa.')
            return
        }

        setIsEnrolling(true)
        try {
            const result = await enrollStudents(requestFnRef.current, enrollModalClass.id, selectedStudentIds)
            // Cập nhật lại số lượng sĩ số của lớp trong state classes
            setClasses((prev) =>
                prev.map((c) =>
                    c.id === enrollModalClass.id
                        ? { ...c, enrolled_count: result.total_enrolled }
                        : c,
                ),
            )
            setAlertMessage({
                type: 'success',
                text: `Ghi danh thành công ${result.enrolled_count} học viên vào lớp '${enrollModalClass.class_code}'.`,
            })
            setIsEnrollModalOpen(false)
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.message : getErrorMessage(err, 'Lỗi khi ghi danh học viên vào lớp.')
            setEnrollModalError(msg)
        } finally {
            setIsEnrolling(false)
        }
    }

    // =========================================================================
    // XỬ LÝ XEM DANH SÁCH LỚP HỌC (ROSTER - SCRUM-218)
    // =========================================================================

    const handleOpenRosterModal = async (cls: TrainingClass) => {
        setRosterModalClass(cls)
        setIsRosterModalOpen(true)
        setIsRosterLoading(true)
        try {
            const roster = await getClassRoster(requestFnRef.current, cls.id)
            setRosterItems(roster.items)
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.message : getErrorMessage(err, 'Lỗi khi tải danh sách học viên của lớp.')
            setAlertMessage({ type: 'error', text: msg })
        } finally {
            setIsRosterLoading(false)
        }
    }

    // Danh sách học viên hiển thị trong modal ghi danh (sau khi lọc tìm kiếm)
    const filteredAvailableStudents = students.filter((s) => {
        if (!studentSearchKeyword.trim()) return true
        const q = studentSearchKeyword.toLowerCase()
        return (
            s.student_code.toLowerCase().includes(q) ||
            s.full_name.toLowerCase().includes(q) ||
            (s.phone && s.phone.includes(q)) ||
            (s.email && s.email.toLowerCase().includes(q))
        )
    })

    const isClassFull = enrollModalClass
        ? (enrollModalClass.enrolled_count ?? 0) >= enrollModalClass.max_capacity
        : false

    return (
        <div className="classes-container" data-testid="classes-page">
            {/* Header */}
            <div className="classes-header">
                <div className="classes-header-left">
                    <h1 data-testid="page-title">Quản lý Lớp học</h1>
                    <p>Mở lớp mới từ chương trình đào tạo, quản lý vòng đời, môn học và ghi danh học viên</p>
                </div>
                <div className="classes-header-actions">
                    <div className="stat-pill" data-testid="stat-total-classes">
                        Tổng số lớp: <strong>{total}</strong>
                    </div>
                    {canManage && (
                        <>
                            <button
                                type="button"
                                className="btn-holidays"
                                onClick={() => {
                                    if (isDedicated && navigate) {
                                        navigate('/holidays')
                                    } else {
                                        setIsHolidaysModalOpen(true)
                                    }
                                }}
                                data-testid="open-holidays-btn"
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                🏖️ Ngày nghỉ lễ
                            </button>
                            <button
                                type="button"
                                className="btn-open-class"
                                onClick={handleOpenCreateModal}
                                data-testid="create-class-btn"
                            >
                                + Mở lớp mới
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Thông báo Alert */}
            {alertMessage && (
                <div
                    className={`classes-alert ${alertMessage.type}`}
                    data-testid={alertMessage.type === 'success' ? 'success-alert' : 'error-alert'}
                >
                    <span>{alertMessage.text}</span>
                    <button
                        type="button"
                        className="btn-close"
                        onClick={() => setAlertMessage(null)}
                        aria-label="Đóng thông báo"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Bộ lọc và Tìm kiếm danh sách lớp (SCRUM-219) */}
            <div className="classes-filter-card" data-testid="classes-filter-section">
                <form
                    className="classes-filter-form"
                    onSubmit={(e) => {
                        e.preventDefault()
                    }}
                    data-testid="search-form"
                >
                    <div className="classes-filter-grid">
                        <div className="classes-filter-field search-field">
                            <label htmlFor="search-input">Tìm kiếm</label>
                            <input
                                id="search-input"
                                type="text"
                                className="filter-input"
                                placeholder="Tìm kiếm theo mã lớp, tên chương trình..."
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                data-testid="class-search-input"
                            />
                        </div>
                        <div className="classes-filter-field">
                            <label htmlFor="filter-status">Trạng thái</label>
                            <select
                                id="filter-status"
                                className="filter-select"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                data-testid="filter-status"
                            >
                                <option value="">Tất cả trạng thái</option>
                                <option value="preparing">Chuẩn bị</option>
                                <option value="in_progress">Đang học</option>
                                <option value="completed">Kết thúc</option>
                                <option value="cancelled">Hủy</option>
                            </select>
                        </div>
                        <div className="classes-filter-field">
                            <label htmlFor="filter-program">Chương trình đào tạo</label>
                            <select
                                id="filter-program"
                                className="filter-select"
                                value={filterProgramId}
                                onChange={(e) => setFilterProgramId(e.target.value)}
                                data-testid="filter-program"
                            >
                                <option value="">Tất cả chương trình</option>
                                {programs.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.code})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="classes-filter-field">
                            <label htmlFor="filter-instructor">Giảng viên</label>
                            <select
                                id="filter-instructor"
                                className="filter-select"
                                value={filterInstructorId}
                                onChange={(e) => setFilterInstructorId(e.target.value)}
                                data-testid="filter-instructor"
                            >
                                <option value="">Tất cả giảng viên</option>
                                {instructors.map((ins) => (
                                    <option key={ins.id} value={String(ins.id)}>
                                        {ins.name} ({ins.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="classes-filter-field">
                            <label htmlFor="filter-date-from">Từ ngày</label>
                            <input
                                id="filter-date-from"
                                type="date"
                                className="filter-input"
                                value={filterDateFrom}
                                onChange={(e) => setFilterDateFrom(e.target.value)}
                                data-testid="filter-date-from"
                            />
                        </div>
                        <div className="classes-filter-field">
                            <label htmlFor="filter-date-to">Đến ngày</label>
                            <input
                                id="filter-date-to"
                                type="date"
                                className="filter-input"
                                value={filterDateTo}
                                onChange={(e) => setFilterDateTo(e.target.value)}
                                data-testid="filter-date-to"
                            />
                        </div>
                    </div>
                    <div className="classes-filter-actions">
                        <button
                            type="button"
                            className="btn-filter-reset"
                            onClick={handleResetFilters}
                            data-testid="reset-filter-btn"
                        >
                            Xóa bộ lọc
                        </button>
                    </div>
                </form>
            </div>

            {/* Bảng danh sách lớp học */}
            <div className="classes-table-card">
                {loading ? (
                    <div className="empty-state" data-testid="loading-state">
                        Đang tải danh sách lớp học...
                    </div>
                ) : classes.length === 0 ? (
                    <div className="empty-state" data-testid="empty-state">
                        {debouncedSearch || filterStatus || filterProgramId || filterInstructorId || filterDateFrom || filterDateTo
                            ? 'Không tìm thấy lớp học nào phù hợp với bộ lọc hiện tại.'
                            : 'Chưa có lớp học nào trong hệ thống.'}
                    </div>
                ) : (
                    <table className="classes-table" data-testid="classes-table">
                        <thead>
                            <tr>
                                <th>Mã lớp</th>
                                <th>Chương trình đào tạo</th>
                                <th>Khai giảng dự kiến</th>
                                <th>Sĩ số</th>
                                <th>Tiến độ buổi học</th>
                                <th>Hình thức</th>
                                <th>Trạng thái vòng đời</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classes.map((cls) => (
                                <tr key={cls.id} data-testid={`class-row-${cls.id}`}>
                                    <td>
                                        <span className="class-code-badge" data-testid={`class-code-${cls.id}`}>
                                            {cls.class_code}
                                        </span>
                                    </td>
                                    <td data-testid={`class-program-${cls.id}`}>
                                        {cls.program_name || cls.program_code || cls.program_id}
                                    </td>
                                    <td data-testid={`class-date-${cls.id}`}>
                                        {cls.expected_start_date ? formatVietnamDate(cls.expected_start_date) : '-'}
                                    </td>
                                    <td data-testid={`class-capacity-${cls.id}`}>
                                        {cls.enrolled_count ?? 0} / {cls.max_capacity}
                                    </td>
                                    <td data-testid={`class-progress-${cls.id}`}>
                                        {cls.session_progress ? (
                                            <span className="session-progress-badge">{cls.session_progress}</span>
                                        ) : (
                                            <span className="session-progress-none" title="Chưa có dữ liệu buổi học">-</span>
                                        )}
                                    </td>
                                    <td data-testid={`class-mode-${cls.id}`}>
                                        {cls.learning_mode === 'offline' ? 'Trực tiếp' : cls.learning_mode === 'online' ? 'Trực tuyến' : cls.learning_mode}
                                    </td>
                                    <td>
                                        {canManage ? (
                                            <select
                                                className={`status-select status-badge ${cls.status}`}
                                                value={cls.status}
                                                onChange={(e) => handleStatusChange(cls.id, e.target.value)}
                                                data-testid={`status-select-${cls.id}`}
                                            >
                                                <option value="preparing">Chuẩn bị</option>
                                                <option value="in_progress">Đang học</option>
                                                <option value="completed">Kết thúc</option>
                                                <option value="cancelled">Hủy</option>
                                            </select>
                                        ) : (
                                            <span className={`status-badge ${cls.status}`} data-testid={`status-badge-${cls.id}`}>
                                                {cls.status_label || CLASS_STATUS_LABELS[cls.status as ClassStatus] || cls.status}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="action-buttons-group">
                                            <button
                                                type="button"
                                                className="btn-action-view"
                                                onClick={() => handleOpenDetailModal(cls)}
                                                data-testid={`view-class-${cls.id}`}
                                            >
                                                Môn học lớp
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-action-schedule"
                                                onClick={() => {
                                                    if (isDedicated && navigate) {
                                                        navigate(`/classes/${cls.id}/schedules`)
                                                    } else {
                                                        setScheduleModalClass(cls)
                                                    }
                                                }}
                                                data-testid={`schedule-class-${cls.id}`}
                                                title="Xem và sinh thời khóa biểu tự động"
                                                style={{
                                                    backgroundColor: '#0284c7',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    padding: '6px 10px',
                                                    borderRadius: '4px',
                                                    fontWeight: 600,
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                Thời khóa biểu
                                            </button>
                                            {canManage && (
                                                <button
                                                    type="button"
                                                    className="btn-action-enroll"
                                                    onClick={() => {
                                                        if (isDedicated && navigate) {
                                                            navigate(`/classes/${cls.id}/enrollments/new`)
                                                        } else {
                                                            handleOpenEnrollModal(cls)
                                                        }
                                                    }}
                                                    data-testid={`enroll-class-${cls.id}`}
                                                    title="Ghi danh học viên vào lớp"
                                                >
                                                    Ghi danh
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="btn-action-roster"
                                                onClick={() => {
                                                    if (isDedicated && navigate) {
                                                        navigate(`/classes/${cls.id}/students`)
                                                    } else {
                                                        handleOpenRosterModal(cls)
                                                    }
                                                }}
                                                data-testid={`roster-class-${cls.id}`}
                                                title="Xem danh sách học viên của lớp"
                                            >
                                                Danh sách lớp
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal Mở Lớp Mới (SCRUM-217 - 217-01 -> 217-04) */}
            {isCreateModalOpen && (
                <div className="modal-overlay" role="dialog" aria-modal="true" data-testid="create-class-modal">
                    <div className="class-modal">
                        <div className="modal-header">
                            <h2>Mở lớp học mới từ chương trình đào tạo</h2>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={() => setIsCreateModalOpen(false)}
                                data-testid="cancel-create-btn"
                                aria-label="Đóng"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateClass}>
                            <div className="modal-body">
                                {createModalError && (
                                    <div
                                        className="modal-alert error"
                                        data-testid="create-modal-error"
                                        role="alert"
                                    >
                                        <span>{createModalError}</span>
                                    </div>
                                )}
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label htmlFor="class-code">Mã lớp * (Duy nhất)</label>
                                        <input
                                            id="class-code"
                                            type="text"
                                            className={`form-input ${classCodeError ? 'input-error' : ''}`}
                                            placeholder="Ví dụ: CNTT-K21A"
                                            value={createForm.class_code}
                                            onChange={(e) => {
                                                setCreateForm({ ...createForm, class_code: e.target.value })
                                                if (classCodeError) setClassCodeError(null)
                                                if (createModalError) setCreateModalError(null)
                                            }}
                                            required
                                            data-testid="class-code-input"
                                            aria-invalid={!!classCodeError}
                                            aria-describedby={classCodeError ? 'class-code-error' : undefined}
                                        />
                                        {classCodeError && (
                                            <div
                                                id="class-code-error"
                                                className="form-field-error"
                                                data-testid="class-code-error"
                                                role="alert"
                                            >
                                                {classCodeError}
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="program-select">Chương trình đào tạo *</label>
                                        <select
                                            id="program-select"
                                            className="form-select"
                                            value={createForm.program_id}
                                            onChange={(e) => setCreateForm({ ...createForm, program_id: e.target.value })}
                                            required
                                            data-testid="program-select"
                                        >
                                            <option value="">-- Chọn chương trình --</option>
                                            {programs.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} ({p.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="expected-start-date">Ngày khai giảng dự kiến</label>
                                        <input
                                            id="expected-start-date"
                                            type="date"
                                            className="form-input"
                                            value={createForm.expected_start_date}
                                            onChange={(e) => setCreateForm({ ...createForm, expected_start_date: e.target.value })}
                                            data-testid="expected-start-date-input"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="max-capacity">Sĩ số tối đa *</label>
                                        <input
                                            id="max-capacity"
                                            type="number"
                                            min="1"
                                            className="form-input"
                                            value={createForm.max_capacity}
                                            onChange={(e) => setCreateForm({ ...createForm, max_capacity: Number(e.target.value) })}
                                            required
                                            data-testid="max-capacity-input"
                                        />
                                    </div>

                                    <div className="form-group full-width">
                                        <label htmlFor="learning-mode">Hình thức học *</label>
                                        <select
                                            id="learning-mode"
                                            className="form-select"
                                            value={createForm.learning_mode}
                                            onChange={(e) => setCreateForm({ ...createForm, learning_mode: e.target.value })}
                                            data-testid="learning-mode-select"
                                        >
                                            <option value="offline">Trực tiếp (Offline)</option>
                                            <option value="online">Trực tuyến (Online)</option>
                                            <option value="hybrid">Kết hợp (Hybrid)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setIsCreateModalOpen(false)}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={isCreating}
                                    data-testid="submit-class-btn"
                                >
                                    {isCreating ? 'Đang mở lớp...' : 'Mở lớp'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Chi tiết Môn học Lớp đã sao chép (SCRUM-217 - 217-04) */}
            {isDetailModalOpen && selectedClass && (
                <div className="modal-overlay" role="dialog" aria-modal="true" data-testid="class-detail-modal">
                    <div className="class-modal">
                        <div className="modal-header">
                            <h2>
                                Lớp học: {selectedClass.class_code} - {selectedClass.program_name || selectedClass.program_code}
                            </h2>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={() => setIsDetailModalOpen(false)}
                                data-testid="close-detail-modal-btn"
                                aria-label="Đóng"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="copied-notice" data-testid="copied-notice">
                                ℹ️ Danh sách môn học được tự động sao chép từ chương trình khi mở lớp.
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <strong>Trạng thái vòng đời: </strong>
                                <span className={`status-badge ${selectedClass.status}`} data-testid="lifecycle-status">
                                    {selectedClass.status_label || CLASS_STATUS_LABELS[selectedClass.status as ClassStatus] || selectedClass.status}
                                </span>
                            </div>

                            {selectedClass.subjects && selectedClass.subjects.length > 0 ? (
                                <table className="classes-table" data-testid="class-subjects-table">
                                    <thead>
                                        <tr>
                                            <th>Mã môn</th>
                                            <th>Tên môn học</th>
                                            <th>Số tín chỉ</th>
                                            <th>Học kỳ</th>
                                            <th>Tính chất</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedClass.subjects.map((s) => (
                                            <tr key={s.id} data-testid={`subject-row-${s.id}`}>
                                                <td>
                                                    <span className="class-code-badge">{s.subject_code}</span>
                                                </td>
                                                <td>{s.subject_name}</td>
                                                <td>{s.credits ?? '-'}</td>
                                                <td>Học kỳ {s.semester ?? 1}</td>
                                                <td>{s.is_mandatory ? 'Bắt buộc' : 'Tự chọn'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="modal-empty-box" data-testid="no-subjects-state">
                                    Chương trình này chưa có môn học được thiết lập.
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setIsDetailModalOpen(false)}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Ghi Danh Học Viên Vào Lớp (SCRUM-218 - 218-01, 218-02, 218-03) */}
            {isEnrollModalOpen && enrollModalClass && (
                <div className="modal-overlay" role="dialog" aria-modal="true" data-testid="enroll-modal">
                    <div className="class-modal" style={{ maxWidth: 700 }}>
                        <div className="modal-header">
                            <h2>
                                Ghi danh học viên - Lớp {enrollModalClass.class_code}
                            </h2>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={() => setIsEnrollModalOpen(false)}
                                data-testid="close-enroll-modal-btn"
                                aria-label="Đóng"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleEnrollSubmit}>
                            <div className="modal-body">
                                {/* Thống kê sĩ số */}
                                <div className="enroll-meta-box" data-testid="enroll-meta-box">
                                    <div>
                                        Sĩ số hiện tại: <strong>{enrollModalClass.enrolled_count ?? 0} / {enrollModalClass.max_capacity}</strong>
                                    </div>
                                    <div>
                                        Đã chọn: <strong data-testid="selected-count">{selectedStudentIds.length}</strong> học viên
                                    </div>
                                </div>

                                {isClassFull && (
                                    <div className="capacity-danger-banner" data-testid="class-full-banner">
                                        ⚠️ Lớp học đã đủ số lượng học viên tối đa ({enrollModalClass.max_capacity}). Không thể ghi danh thêm.
                                    </div>
                                )}

                                {!isClassFull &&
                                    (enrollModalClass.enrolled_count ?? 0) + selectedStudentIds.length >
                                        enrollModalClass.max_capacity && (
                                        <div className="capacity-warning-banner" data-testid="capacity-exceeded-warning">
                                            ⚠️ Số lượng học viên đã chọn vượt quá sĩ số còn lại của lớp!
                                        </div>
                                    )}

                                {enrollModalError && (
                                    <div className="classes-alert error" data-testid="enroll-error-alert" style={{ marginBottom: 16 }}>
                                        <span>{enrollModalError}</span>
                                    </div>
                                )}

                                {/* Tìm kiếm học viên để chọn */}
                                <div className="form-group" style={{ marginBottom: 8 }}>
                                    <label htmlFor="student-search">Tìm kiếm học viên để ghi danh</label>
                                    <input
                                        id="student-search"
                                        type="text"
                                        className="form-input"
                                        placeholder="Tìm theo mã học viên, họ tên, SĐT..."
                                        value={studentSearchKeyword}
                                        onChange={(e) => setStudentSearchKeyword(e.target.value)}
                                        data-testid="student-search-input"
                                    />
                                </div>

                                {/* Danh sách học viên để chọn (checkbox) */}
                                <div className="student-checklist" data-testid="student-checklist">
                                    {filteredAvailableStudents.length === 0 ? (
                                        <div className="empty-state" data-testid="no-students-found">
                                            Không tìm thấy học viên nào phù hợp.
                                        </div>
                                    ) : (
                                        filteredAvailableStudents.map((s) => {
                                            const isAlreadyIn = alreadyEnrolledIds.includes(s.id)
                                            const isSelected = selectedStudentIds.includes(s.id)
                                            return (
                                                <label
                                                    key={s.id}
                                                    className={`student-check-item ${isAlreadyIn ? 'disabled' : ''}`}
                                                    data-testid={`student-item-${s.id}`}
                                                >
                                                    <div className="student-check-left">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            disabled={isAlreadyIn || isClassFull}
                                                            onChange={() => handleToggleStudent(s.id)}
                                                            data-testid={`student-checkbox-${s.id}`}
                                                        />
                                                        <div className="student-check-info">
                                                            <div className="student-check-name">
                                                                {s.full_name} ({s.student_code})
                                                            </div>
                                                            <div className="student-check-sub">
                                                                {s.phone} {s.email ? `• ${s.email}` : ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isAlreadyIn && (
                                                        <span className="already-enrolled-badge" data-testid={`already-enrolled-${s.id}`}>
                                                            Đã có trong lớp
                                                        </span>
                                                    )}
                                                </label>
                                            )
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setIsEnrollModalOpen(false)}
                                    data-testid="cancel-enroll-btn"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={
                                        isClassFull ||
                                        selectedStudentIds.length === 0 ||
                                        isEnrolling
                                    }
                                    data-testid="confirm-enroll-btn"
                                >
                                    {isEnrolling ? 'Đang ghi danh...' : `Ghi danh (${selectedStudentIds.length})`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Xem Danh Sách Học Viên Lớp (Roster - SCRUM-218) */}
            {isRosterModalOpen && rosterModalClass && (
                <div className="modal-overlay" role="dialog" aria-modal="true" data-testid="roster-modal">
                    <div className="class-modal" style={{ maxWidth: 850 }}>
                        <div className="modal-header">
                            <h2>
                                Danh sách học viên - Lớp {rosterModalClass.class_code} ({rosterItems.length} / {rosterModalClass.max_capacity})
                            </h2>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={() => setIsRosterModalOpen(false)}
                                data-testid="close-roster-modal-btn"
                                aria-label="Đóng"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="modal-body">
                            {isRosterLoading ? (
                                <div className="empty-state" data-testid="roster-loading-state">
                                    Đang tải danh sách học viên...
                                </div>
                            ) : rosterItems.length === 0 ? (
                                <div className="empty-state" data-testid="empty-roster-state">
                                    Chưa có học viên nào được ghi danh vào lớp này.
                                </div>
                            ) : (
                                <table className="classes-table" data-testid="roster-table">
                                    <thead>
                                        <tr>
                                            <th>STT</th>
                                            <th>Mã học viên</th>
                                            <th>Họ và tên</th>
                                            <th>Liên hệ</th>
                                            <th>Ngày ghi danh</th>
                                            <th>Người thực hiện</th>
                                            <th>Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rosterItems.map((item, idx) => (
                                            <tr key={item.id} data-testid={`roster-row-${item.id}`}>
                                                <td>{idx + 1}</td>
                                                <td>
                                                    <span className="class-code-badge" data-testid={`roster-student-code-${item.id}`}>
                                                        {item.student_code}
                                                    </span>
                                                </td>
                                                <td data-testid={`roster-student-name-${item.id}`}>
                                                    <strong>{item.full_name}</strong>
                                                </td>
                                                <td>
                                                    <div>{item.phone || '-'}</div>
                                                    <div className="audit-meta-text">{item.email}</div>
                                                </td>
                                                <td data-testid={`roster-enrolled-at-${item.id}`}>
                                                    {item.enrolled_at ? new Date(item.enrolled_at).toLocaleDateString('vi-VN') : '-'}
                                                </td>
                                                <td data-testid={`roster-enrolled-by-${item.id}`}>
                                                    <span className="audit-meta-text">
                                                        {item.enrolled_by_name || item.enrolled_by}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="status-badge in_progress" data-testid={`roster-status-${item.id}`}>
                                                        {item.status === 'enrolled' ? 'Đã ghi danh' : item.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setIsRosterModalOpen(false)}
                                data-testid="close-roster-btn"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Thời khóa biểu (SCRUM-224) */}
            {scheduleModalClass && (
                <ScheduleGenerationModal
                    classItem={scheduleModalClass}
                    requestFn={requestFn}
                    canManage={canManageSchedule}
                    onClose={() => setScheduleModalClass(null)}
                />
            )}

            {/* Modal Quản lý ngày nghỉ lễ (SCRUM-224) */}
            {isHolidaysModalOpen && (
                <HolidaysManagementModal
                    requestFn={requestFn}
                    canManage={canManage}
                    onClose={() => setIsHolidaysModalOpen(false)}
                />
            )}
        </div>
    )
}

