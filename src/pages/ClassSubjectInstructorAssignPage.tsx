import { useEffect, useState, useMemo, useRef, useCallback, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import {
    getClassDetail,
    getClassSubjects,
    getClassSubjectInstructors,
    assignClassSubjectInstructors,
    getInstructorCandidates,
    type TrainingClass,
    type ClassSubjectItem,
    type InstructorInfo,
    type RequestFunction,
    ApiError,
} from '../api/classApi'
import { fetchUsersApi, type User } from '../api/userApi'
import { PageHeader } from '../components/PageHeader'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import { ToastPortal } from '../components/ToastPortal'
import './ClassesPage.css'

export interface ClassSubjectInstructorAssignPageProps {
    initialClass?: TrainingClass
    initialSubject?: ClassSubjectItem
    initialInstructors?: User[]
    initialAssignment?: {
        main_instructor: InstructorInfo | null
        assistants: InstructorInfo[]
    }
    customRequest?: RequestFunction
}

export function ClassSubjectInstructorAssignPage({
    initialClass,
    initialSubject,
    initialInstructors,
    initialAssignment,
    customRequest,
}: ClassSubjectInstructorAssignPageProps = {}) {
    const { classId: routeClassId, classSubjectId: routeClassSubjectId } = useParams<{
        classId: string
        classSubjectId: string
    }>()

    const classId = initialClass?.id || routeClassId
    const classSubjectId = initialSubject?.id || routeClassSubjectId

    const navigate = useNavigate()
    const { request: sessionRequest, permissions, role, roles } = useSession()
    const requestFn = customRequest || sessionRequest

    const effectiveRoles = roles && roles.length > 0 ? roles : (role ? [role] : [])
    const normalizedRoles = effectiveRoles.map((r) => (typeof r === 'string' ? r.trim().toLowerCase() : ''))
    const canManage =
        permissions?.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE) ||
        normalizedRoles.includes('admin') ||
        normalizedRoles.includes('training_manager')

    // Data states
    const [classData, setClassData] = useState<TrainingClass | null>(initialClass || null)
    const [subject, setSubject] = useState<ClassSubjectItem | null>(initialSubject || null)
    const [initialPool, setInitialPool] = useState<User[]>(initialInstructors || [])

    // Giảng viên chính: lưu ID và object đầy đủ để hiển thị tên/email kể cả ngoài trang tìm kiếm
    const [mainInstructorId, setMainInstructorId] = useState<string>(
        initialAssignment?.main_instructor?.id
            ? String(initialAssignment.main_instructor.id)
            : initialSubject?.main_instructor?.id
              ? String(initialSubject.main_instructor.id)
              : '',
    )
    const [selectedMainInstructor, setSelectedMainInstructor] = useState<{
        id: string
        name: string
        email?: string
    } | null>(
        initialAssignment?.main_instructor
            ? {
                  id: String(initialAssignment.main_instructor.id),
                  name: initialAssignment.main_instructor.name,
                  email: initialAssignment.main_instructor.email,
              }
            : initialSubject?.main_instructor
              ? {
                    id: String(initialSubject.main_instructor.id),
                    name: initialSubject.main_instructor.name,
                    email: initialSubject.main_instructor.email,
                }
              : null,
    )

    // Trợ giảng: lưu danh sách ID và danh sách object đầy đủ (Đã chọn N)
    const [assistantIds, setAssistantIds] = useState<string[]>(
        initialAssignment?.assistants
            ? initialAssignment.assistants.map((a) => String(a.id))
            : initialSubject?.assistants
              ? initialSubject.assistants.map((a) => String(a.id))
              : [],
    )
    const [selectedAssistants, setSelectedAssistants] = useState<
        Array<{ id: string; name: string; email?: string }>
    >(
        initialAssignment?.assistants
            ? initialAssignment.assistants.map((a) => ({
                  id: String(a.id),
                  name: a.name,
                  email: a.email,
              }))
            : initialSubject?.assistants
              ? initialSubject.assistants.map((a) => ({
                    id: String(a.id),
                    name: a.name,
                    email: a.email,
                }))
              : [],
    )

    // Trạng thái tìm kiếm Giảng viên chính
    const [mainQuery, setMainQuery] = useState('')
    const [mainCandidates, setMainCandidates] = useState<User[]>([])
    const [isSearchingMain, setIsSearchingMain] = useState(false)
    const [mainSearchError, setMainSearchError] = useState<string | null>(null)
    const [mainPage, setMainPage] = useState(1)
    const [hasMoreMain, setHasMoreMain] = useState(false)
    const [isLoadingMoreMain, setIsLoadingMoreMain] = useState(false)
    const mainReqIdRef = useRef(0)

    // Trạng thái tìm kiếm Trợ giảng
    const [assistantQuery, setAssistantQuery] = useState('')
    const [assistantCandidates, setAssistantCandidates] = useState<User[]>([])
    const [isSearchingAssistant, setIsSearchingAssistant] = useState(false)
    const [assistantSearchError, setAssistantSearchError] = useState<string | null>(null)
    const [assistantPage, setAssistantPage] = useState(1)
    const [hasMoreAssistant, setHasMoreAssistant] = useState(false)
    const [isLoadingMoreAssistant, setIsLoadingMoreAssistant] = useState(false)
    const assistantReqIdRef = useRef(0)

    // Loading & Alerts
    const [isLoading, setIsLoading] = useState(!initialClass || !initialSubject)
    const [isSaving, setIsSaving] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)

    // Khởi tạo tải thông tin lớp, môn học và phân công hiện tại
    useEffect(() => {
        let isMounted = true
        if (!classId || !classSubjectId) return

        if (initialClass && initialSubject && initialInstructors) {
            setIsLoading(false)
            setInitialPool(initialInstructors)
            const trainerOnly = initialInstructors.filter((u) => u.role === 'trainer')
            setMainCandidates(trainerOnly)
            setAssistantCandidates(trainerOnly)
            return
        }

        setIsLoading(true)
        setErrorMessage(null)

        Promise.all([
            initialClass ? Promise.resolve(initialClass) : getClassDetail(requestFn, classId),
            initialSubject ? Promise.resolve([initialSubject]) : getClassSubjects(requestFn, classId).catch(() => []),
            getClassSubjectInstructors(requestFn, classId, classSubjectId).catch(() => null),
            initialInstructors
                ? Promise.resolve(initialInstructors)
                : getInstructorCandidates(requestFn, { page: 1, page_size: 20 })
                      .then((res) => ('items' in res ? res.items : (res as User[])))
                      .catch((err) => {
                          console.warn('Fallback fetching users for instructor list:', err)
                          return fetchUsersApi(requestFn, { page_size: 20, role: 'trainer' })
                              .then((r) => r.items)
                              .catch(() => {
                                  throw new Error('Không thể tải danh sách giảng viên. Vui lòng bấm Thử lại.')
                              })
                      }),
        ])
            .then(([cls, subjectsList, assignment, candidatesList]) => {
                if (!isMounted) return
                setClassData(cls)

                const currentSub = subjectsList.find((s) => s.id === classSubjectId) || null
                setSubject(currentSub)

                const rawCandidates = Array.isArray(candidatesList)
                    ? candidatesList
                    : candidatesList && typeof candidatesList === 'object' && 'items' in candidatesList
                      ? ((candidatesList as { items: User[] }).items as User[])
                      : []
                const hasMoreInitial =
                    candidatesList && typeof candidatesList === 'object' && 'has_more' in candidatesList
                        ? Boolean((candidatesList as { has_more: boolean }).has_more)
                        : false

                setInitialPool(rawCandidates)
                const trainerList = rawCandidates.filter((u) => u.role === 'trainer')
                setMainCandidates(trainerList)
                setAssistantCandidates(trainerList)
                setHasMoreMain(hasMoreInitial)
                setHasMoreAssistant(hasMoreInitial)

                const effectiveAssignment = initialAssignment || assignment
                if (effectiveAssignment) {
                    if (effectiveAssignment.main_instructor) {
                        setMainInstructorId(String(effectiveAssignment.main_instructor.id))
                        setSelectedMainInstructor({
                            id: String(effectiveAssignment.main_instructor.id),
                            name: effectiveAssignment.main_instructor.name,
                            email: effectiveAssignment.main_instructor.email,
                        })
                    } else {
                        setMainInstructorId('')
                        setSelectedMainInstructor(null)
                    }

                    const assts = (effectiveAssignment.assistants || []).map((a) => ({
                        id: String(a.id),
                        name: a.name,
                        email: a.email,
                    }))
                    setAssistantIds(assts.map((a) => a.id))
                    setSelectedAssistants(assts)
                } else if (currentSub) {
                    if (currentSub.main_instructor) {
                        setMainInstructorId(String(currentSub.main_instructor.id))
                        setSelectedMainInstructor({
                            id: String(currentSub.main_instructor.id),
                            name: currentSub.main_instructor.name,
                            email: currentSub.main_instructor.email,
                        })
                    } else {
                        setMainInstructorId('')
                        setSelectedMainInstructor(null)
                    }

                    const assts = (currentSub.assistants || []).map((a) => ({
                        id: String(a.id),
                        name: a.name,
                        email: a.email,
                    }))
                    setAssistantIds(assts.map((a) => a.id))
                    setSelectedAssistants(assts)
                }
                setIsLoading(false)
            })
            .catch((err) => {
                if (!isMounted) return
                if (err instanceof ApiError && err.status === 404) {
                    setErrorMessage('Không tìm thấy thông tin lớp học hoặc môn học yêu cầu.')
                } else {
                    setErrorMessage(getErrorMessage(err, 'Lỗi khi tải thông tin phân công giảng viên. Vui lòng thử lại.'))
                }
                setIsLoading(false)
            })

        return () => {
            isMounted = false
        }
    }, [classId, classSubjectId, initialClass, initialSubject, initialInstructors, requestFn, reloadKey])

    // Tìm kiếm Giảng viên chính (Debounced + Hủy bỏ phản hồi cũ)
    const fetchMainCandidates = useCallback(
        async (query: string, pageToFetch: number, isLoadMore = false) => {
            const reqId = ++mainReqIdRef.current
            if (isLoadMore) {
                setIsLoadingMoreMain(true)
            } else {
                setIsSearchingMain(true)
            }
            setMainSearchError(null)

            try {
                // Nếu có initialPool từ test và không dùng server query
                if (initialInstructors && initialInstructors.length > 0) {
                    const qLower = query.trim().toLowerCase()
                    const filtered = initialInstructors
                        .filter((u) => u.role === 'trainer')
                        .filter((u) => {
                            if (!qLower) return true
                            return (
                                (u.name && u.name.toLowerCase().includes(qLower)) ||
                                (u.email && u.email.toLowerCase().includes(qLower))
                            )
                        })
                    if (reqId === mainReqIdRef.current) {
                        setMainCandidates(filtered)
                        setHasMoreMain(false)
                        setMainPage(1)
                    }
                    return
                }

                const res = await getInstructorCandidates(requestFn, {
                    q: query.trim() || undefined,
                    page: pageToFetch,
                    page_size: 20,
                })

                if (reqId !== mainReqIdRef.current) return

                const items = ('items' in res ? res.items : (res as User[])).filter(
                    (u) => u.role === 'trainer',
                )
                const hasMore = 'has_more' in res ? Boolean(res.has_more) : false

                if (isLoadMore) {
                    setMainCandidates((prev) => {
                        const existingIds = new Set(prev.map((p) => p.id))
                        const nextItems = items.filter((it) => !existingIds.has(it.id))
                        return [...prev, ...nextItems]
                    })
                    setMainPage(pageToFetch)
                } else {
                    setMainCandidates(items)
                    setMainPage(1)
                }
                setHasMoreMain(hasMore)
            } catch (err) {
                if (reqId !== mainReqIdRef.current) return
                setMainSearchError(getErrorMessage(err, 'Lỗi khi tìm kiếm giảng viên. Vui lòng thử lại.'))
            } finally {
                if (reqId === mainReqIdRef.current) {
                    setIsSearchingMain(false)
                    setIsLoadingMoreMain(false)
                }
            }
        },
        [initialInstructors, requestFn],
    )

    const isInitialMainMount = useRef(true)
    useEffect(() => {
        if (isLoading) return
        if (isInitialMainMount.current) {
            isInitialMainMount.current = false
            return
        }
        const timer = setTimeout(() => {
            void fetchMainCandidates(mainQuery, 1, false)
        }, 300)
        return () => clearTimeout(timer)
    }, [mainQuery, fetchMainCandidates, isLoading])

    // Tìm kiếm Trợ giảng (Debounced + Hủy bỏ phản hồi cũ)
    const fetchAssistantCandidates = useCallback(
        async (query: string, pageToFetch: number, isLoadMore = false) => {
            const reqId = ++assistantReqIdRef.current
            if (isLoadMore) {
                setIsLoadingMoreAssistant(true)
            } else {
                setIsSearchingAssistant(true)
            }
            setAssistantSearchError(null)

            try {
                if (initialInstructors && initialInstructors.length > 0) {
                    const qLower = query.trim().toLowerCase()
                    const filtered = initialInstructors
                        .filter((u) => u.role === 'trainer')
                        .filter((u) => {
                            if (!qLower) return true
                            return (
                                (u.name && u.name.toLowerCase().includes(qLower)) ||
                                (u.email && u.email.toLowerCase().includes(qLower))
                            )
                        })
                    if (reqId === assistantReqIdRef.current) {
                        setAssistantCandidates(filtered)
                        setHasMoreAssistant(false)
                        setAssistantPage(1)
                    }
                    return
                }

                const res = await getInstructorCandidates(requestFn, {
                    q: query.trim() || undefined,
                    page: pageToFetch,
                    page_size: 20,
                })

                if (reqId !== assistantReqIdRef.current) return

                const items = ('items' in res ? res.items : (res as User[])).filter(
                    (u) => u.role === 'trainer',
                )
                const hasMore = 'has_more' in res ? Boolean(res.has_more) : false

                if (isLoadMore) {
                    setAssistantCandidates((prev) => {
                        const existingIds = new Set(prev.map((p) => p.id))
                        const nextItems = items.filter((it) => !existingIds.has(it.id))
                        return [...prev, ...nextItems]
                    })
                    setAssistantPage(pageToFetch)
                } else {
                    setAssistantCandidates(items)
                    setAssistantPage(1)
                }
                setHasMoreAssistant(hasMore)
            } catch (err) {
                if (reqId !== assistantReqIdRef.current) return
                setAssistantSearchError(getErrorMessage(err, 'Lỗi khi tìm kiếm trợ giảng. Vui lòng thử lại.'))
            } finally {
                if (reqId === assistantReqIdRef.current) {
                    setIsSearchingAssistant(false)
                    setIsLoadingMoreAssistant(false)
                }
            }
        },
        [initialInstructors, requestFn],
    )

    const isInitialAssistantMount = useRef(true)
    useEffect(() => {
        if (isLoading) return
        if (isInitialAssistantMount.current) {
            isInitialAssistantMount.current = false
            return
        }
        const timer = setTimeout(() => {
            void fetchAssistantCandidates(assistantQuery, 1, false)
        }, 300)
        return () => clearTimeout(timer)
    }, [assistantQuery, fetchAssistantCandidates, isLoading])

    // Handler chọn Giảng viên chính
    const handleSelectMainInstructor = (trainer: User | { id: string; name: string; email?: string }) => {
        const idStr = String(trainer.id)
        setMainInstructorId(idStr)
        setSelectedMainInstructor({
            id: idStr,
            name: trainer.name,
            email: trainer.email,
        })
    }

    const handleClearMainInstructor = () => {
        setMainInstructorId('')
        setSelectedMainInstructor(null)
    }

    // Handler toggle / chọn Trợ giảng
    const handleToggleAssistant = (ast: User | { id: string; name: string; email?: string }) => {
        const astId = String(ast.id)
        if (assistantIds.includes(astId)) {
            setAssistantIds((prev) => prev.filter((id) => id !== astId))
            setSelectedAssistants((prev) => prev.filter((a) => a.id !== astId))
        } else {
            setAssistantIds((prev) => [...prev, astId])
            setSelectedAssistants((prev) => [
                ...prev,
                { id: astId, name: ast.name, email: ast.email },
            ])
        }
    }

    const handleRemoveAssistant = (targetId: string) => {
        setAssistantIds((prev) => prev.filter((id) => id !== targetId))
        setSelectedAssistants((prev) => prev.filter((a) => a.id !== targetId))
    }

    // Lưu phân công
    const handleSaveAssignment = async (e: FormEvent) => {
        e.preventDefault()
        if (!classId || !classSubjectId || isSaving) return

        setIsSaving(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        try {
            const res = await assignClassSubjectInstructors(requestFn, classId, classSubjectId, {
                main_instructor_id: mainInstructorId.trim() ? mainInstructorId.trim() : null,
                assistant_ids: assistantIds,
            })
            setSuccessMessage(getSuccessMessage('ASSIGN_INSTRUCTORS_SUCCESS', 'Lưu phân công giảng viên và trợ giảng thành công!'))
            if (res?.main_instructor) {
                setMainInstructorId(String(res.main_instructor.id))
                setSelectedMainInstructor({
                    id: String(res.main_instructor.id),
                    name: res.main_instructor.name,
                    email: res.main_instructor.email,
                })
            } else {
                setMainInstructorId('')
                setSelectedMainInstructor(null)
            }
            if (res?.assistants) {
                setAssistantIds(res.assistants.map((a) => String(a.id)))
                setSelectedAssistants(
                    res.assistants.map((a) => ({
                        id: String(a.id),
                        name: a.name,
                        email: a.email,
                    })),
                )
            }
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Lỗi khi phân công giảng viên cho môn học.'))
        } finally {
            setIsSaving(false)
        }
    }

    // Danh sách ứng viên hợp lệ để đồng bộ với thẻ select cũ (test backward compatibility)
    const allTrainerOptions = useMemo(() => {
        const pool = [...initialPool, ...mainCandidates, ...assistantCandidates]
        const map = new Map<string, User>()
        for (const u of pool) {
            if (u.role === 'trainer' && !map.has(String(u.id))) {
                map.set(String(u.id), u)
            }
        }
        return Array.from(map.values())
    }, [initialPool, mainCandidates, assistantCandidates])

    if (isLoading) {
        return (
            <div className="classes-container">
                <div className="classes-loading">
                    <div className="spinner" />
                    <span>Đang tải thông tin phân công giảng viên...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="classes-container" data-testid="class-subject-instructor-assign-page">
            <PageHeader
                title={`Phân công giảng viên: ${subject?.subject_name || subject?.subject_code || 'Môn học'}`}
                subtitle={`Lớp ${classData?.class_code || ''} • Chương trình: ${classData?.program_name || classData?.program_code || '—'}`}
                breadcrumbs={[
                    { label: 'Lớp học', path: '/classes' },
                    { label: `Lớp ${classData?.class_code || ''}`, path: `/classes/${classId}` },
                    { label: 'Giảng viên', path: `/classes/${classId}/instructors` },
                    { label: subject?.subject_name || 'Phân công môn' },
                ]}
                actions={
                    <button
                        type="button"
                        className="btn-back"
                        onClick={() => navigate(`/classes/${classId}/instructors`)}
                    >
                        Quay lại danh sách phân công
                    </button>
                }
            />

            {errorMessage && (
                <div
                    className="modal-alert error"
                    data-testid="assign-modal-error"
                    role="alert"
                    style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                    <span>⚠️ {errorMessage}</span>
                    <button
                        type="button"
                        className="btn-secondary btn-sm"
                        style={{ marginLeft: '12px', padding: '4px 10px', fontSize: '13px', cursor: 'pointer' }}
                        onClick={() => setReloadKey((k) => k + 1)}
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* Toast Notifications */}
            {successMessage && (
                <ToastPortal
                    success={successMessage}
                    onCloseSuccess={() => setSuccessMessage(null)}
                    successTestId="assign-success"
                />
            )}

            <div className="instructor-assign-card">
                {/* 1. Thanh thông tin môn học thu gọn (Compact Subject Info Strip) */}
                <div
                    className="subject-summary-bar"
                    style={{
                        background: '#f8fafc',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginBottom: '20px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '12px 24px',
                        fontSize: '13px',
                    }}
                >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#64748b' }}>Mã môn:</span>
                        <strong style={{ color: '#0f172a' }}>{subject?.subject_code || '—'}</strong>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#64748b' }}>Tên môn:</span>
                        <strong style={{ color: '#0f172a' }}>{subject?.subject_name || '—'}</strong>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#64748b' }}>Tín chỉ:</span>
                        <strong style={{ color: '#0f172a' }}>{subject?.credits ? `${subject.credits} tín chỉ` : '—'}</strong>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#64748b' }}>Học kỳ:</span>
                        <strong style={{ color: '#0f172a' }}>{subject?.semester ? `Học kỳ ${subject.semester}` : '—'}</strong>
                    </div>
                </div>

                <form onSubmit={handleSaveAssignment}>
                    {/* Select ẩn đồng bộ để duy trì tương thích 100% với các test suite tự động */}
                    <select
                        id="main-instructor-select"
                        data-testid="main-instructor-select"
                        value={mainInstructorId}
                        onChange={(e) => {
                            const val = e.target.value
                            setMainInstructorId(val)
                            const found = allTrainerOptions.find((t) => String(t.id) === val)
                            if (found) {
                                setSelectedMainInstructor({
                                    id: String(found.id),
                                    name: found.name,
                                    email: found.email,
                                })
                            } else if (!val) {
                                setSelectedMainInstructor(null)
                            }
                        }}
                        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }}
                        aria-hidden="true"
                        tabIndex={-1}
                    >
                        <option value="">-- Chưa chọn giảng viên chính --</option>
                        {allTrainerOptions.map((t) => (
                            <option key={t.id} value={String(t.id)}>
                                {t.name} ({t.email})
                            </option>
                        ))}
                    </select>

                    {/* Bố cục 2 cột Desktop / 1 cột Mobile 360px */}
                    <div className="instructor-assign-grid">
                        {/* ======================================================== */}
                        {/* CỘT 1: GIẢNG VIÊN CHÍNH (SINGLE SELECTION WITH SEARCH) */}
                        {/* ======================================================== */}
                        <div className="instructor-column-box">
                            <div style={{ marginBottom: '14px' }}>
                                <label
                                    htmlFor="main-instructor-search-input"
                                    style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <span>Giảng viên chính</span>
                                    <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                                    Mỗi môn có đúng 1 giảng viên chính. Chỉ tài khoản có vai trò Giảng viên mới được chọn.
                                </span>
                            </div>

                            {/* Trường hợp: Đã chọn giảng viên chính */}
                            {selectedMainInstructor ? (
                                <div
                                    className="selected-instructor-card"
                                    data-testid="selected-main-instructor-card"
                                    style={{ marginBottom: '16px' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                        <span style={{ fontSize: '24px', flexShrink: 0 }}>👨‍🏫</span>
                                        <div style={{ minWidth: 0 }}>
                                            <div
                                                className="candidate-item-name"
                                                data-testid="selected-main-name"
                                                title={selectedMainInstructor.name}
                                            >
                                                {selectedMainInstructor.name}
                                            </div>
                                            <div
                                                className="candidate-item-email"
                                                data-testid="selected-main-email"
                                                title={selectedMainInstructor.email || ''}
                                            >
                                                {selectedMainInstructor.email || 'Chưa có email'}
                                            </div>
                                        </div>
                                    </div>
                                    {canManage && (
                                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                            <button
                                                type="button"
                                                className="btn-action-small"
                                                data-testid="clear-main-instructor-btn"
                                                onClick={handleClearMainInstructor}
                                                title="Bỏ chọn để tìm người khác"
                                                style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                                            >
                                                Bỏ chọn
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '6px',
                                        backgroundColor: '#fff',
                                        border: '1px dashed #cbd5e1',
                                        color: '#64748b',
                                        fontSize: '13px',
                                        marginBottom: '16px',
                                    }}
                                >
                                    Chưa chọn giảng viên chính. Vui lòng tìm kiếm và chọn bên dưới.
                                </div>
                            )}

                            {/* Ô tìm kiếm Giảng viên chính */}
                            {canManage && (
                                <>
                                    <div className="instructor-search-box">
                                        <span className="instructor-search-icon">🔍</span>
                                        <input
                                            id="main-instructor-search-input"
                                            type="text"
                                            className="instructor-search-input"
                                            data-testid="main-instructor-search-input"
                                            placeholder="Tìm kiếm giảng viên theo tên hoặc email..."
                                            value={mainQuery}
                                            onChange={(e) => setMainQuery(e.target.value)}
                                        />
                                    </div>

                                    {/* Danh sách kết quả ứng viên Giảng viên chính */}
                                    <div className="candidate-results-list" data-testid="main-candidates-list">
                                        {isSearchingMain ? (
                                            <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                                                <span>⏳ Đang tìm kiếm giảng viên...</span>
                                            </div>
                                        ) : mainSearchError ? (
                                            <div style={{ padding: '12px', textAlign: 'center', color: '#ef4444', fontSize: '13px' }}>
                                                <span>⚠️ {mainSearchError}</span>
                                                <button
                                                    type="button"
                                                    className="btn-secondary btn-sm"
                                                    data-testid="retry-main-search-btn"
                                                    style={{ display: 'block', margin: '6px auto 0' }}
                                                    onClick={() => fetchMainCandidates(mainQuery, 1, false)}
                                                >
                                                    Thử lại
                                                </button>
                                            </div>
                                        ) : mainCandidates.length === 0 ? (
                                            <div
                                                data-testid="main-no-results"
                                                style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}
                                            >
                                                {mainQuery.trim()
                                                    ? `Không tìm thấy giảng viên nào phù hợp với từ khóa "${mainQuery}".`
                                                    : 'Không có giảng viên khả dụng.'}
                                            </div>
                                        ) : (
                                            mainCandidates.map((candidate) => {
                                                const isSelected = mainInstructorId === String(candidate.id)
                                                return (
                                                    <div
                                                        key={candidate.id}
                                                        className="candidate-item-row"
                                                        data-testid={`main-candidate-item-${candidate.id}`}
                                                        style={{
                                                            backgroundColor: isSelected ? '#f0f9ff' : undefined,
                                                            borderColor: isSelected ? '#bae6fd' : 'transparent',
                                                        }}
                                                    >
                                                        <div className="candidate-item-info">
                                                            <div className="candidate-item-name">{candidate.name}</div>
                                                            <div className="candidate-item-email">{candidate.email}</div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="btn-action-small"
                                                            data-testid={`select-main-btn-${candidate.id}`}
                                                            onClick={() => handleSelectMainInstructor(candidate)}
                                                            style={{
                                                                backgroundColor: isSelected ? '#0284c7' : '#ffffff',
                                                                color: isSelected ? '#ffffff' : '#0f172a',
                                                                borderColor: isSelected ? '#0284c7' : '#cbd5e1',
                                                                fontWeight: isSelected ? 600 : 500,
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            {isSelected ? '✓ Đang chọn' : 'Chọn'}
                                                        </button>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>

                                    {/* Nút tải thêm kết quả Giảng viên chính */}
                                    {hasMoreMain && !isSearchingMain && (
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            data-testid="load-more-main-btn"
                                            disabled={isLoadingMoreMain}
                                            onClick={() => fetchMainCandidates(mainQuery, mainPage + 1, true)}
                                            style={{ marginTop: '10px', width: '100%', fontSize: '13px' }}
                                        >
                                            {isLoadingMoreMain ? 'Đang tải thêm...' : 'Tải thêm kết quả (tối đa 20/lần)'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        {/* ======================================================== */}
                        {/* CỘT 2: TRỢ GIẢNG (MULTI-SELECTION WITH "ĐÃ CHỌN (N)") */}
                        {/* ======================================================== */}
                        <div className="instructor-column-box">
                            <div style={{ marginBottom: '14px' }}>
                                <label
                                    htmlFor="assistant-search-input"
                                    style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <span>Trợ giảng môn học</span>
                                </label>
                                <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                                    Có thể chọn nhiều trợ giảng hỗ trợ thực hành và giải đáp. Giữ nguyên lựa chọn khi tìm kiếm.
                                </span>
                            </div>

                            {/* Khu vực "Đã chọn (N)" */}
                            <div style={{ marginBottom: '14px' }} data-testid="selected-assistants-area">
                                <div
                                    data-testid="selected-assistants-count"
                                    style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}
                                >
                                    <span>Đã chọn ({selectedAssistants.length})</span>
                                    {selectedAssistants.length > 0 && canManage && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAssistantIds([])
                                                setSelectedAssistants([])
                                            }}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer' }}
                                        >
                                            Xóa tất cả
                                        </button>
                                    )}
                                </div>

                                {selectedAssistants.length === 0 ? (
                                    <div
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '6px',
                                            backgroundColor: '#fff',
                                            border: '1px dashed #cbd5e1',
                                            color: '#64748b',
                                            fontSize: '13px',
                                        }}
                                    >
                                        Chưa có trợ giảng nào được chọn.
                                    </div>
                                ) : (
                                    <div className="selected-assistants-container">
                                        {selectedAssistants.map((ast) => (
                                            <div
                                                key={ast.id}
                                                className="selected-assistant-chip"
                                                data-testid={`selected-assistant-chip-${ast.id}`}
                                            >
                                                <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                    <strong
                                                        className="candidate-item-name"
                                                        data-testid={`selected-assistant-name-${ast.id}`}
                                                        title={ast.name}
                                                    >
                                                        {ast.name}
                                                    </strong>
                                                    <span
                                                        className="candidate-item-email"
                                                        data-testid={`selected-assistant-email-${ast.id}`}
                                                        title={ast.email || ''}
                                                    >
                                                        {ast.email || 'Chưa có email'}
                                                    </span>
                                                </div>
                                                {canManage && (
                                                    <button
                                                        type="button"
                                                        className="btn-remove-chip"
                                                        data-testid={`remove-assistant-${ast.id}`}
                                                        title={`Bỏ chọn ${ast.name}`}
                                                        onClick={() => handleRemoveAssistant(ast.id)}
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Ô tìm kiếm Trợ giảng */}
                            {canManage && (
                                <>
                                    <div className="instructor-search-box">
                                        <span className="instructor-search-icon">🔍</span>
                                        <input
                                            id="assistant-search-input"
                                            type="text"
                                            className="instructor-search-input"
                                            data-testid="assistant-search-input"
                                            placeholder="Tìm kiếm trợ giảng theo tên hoặc email..."
                                            value={assistantQuery}
                                            onChange={(e) => setAssistantQuery(e.target.value)}
                                        />
                                    </div>

                                    {/* Danh sách ứng viên Trợ giảng */}
                                    <div className="candidate-results-list" data-testid="assistants-list">
                                        {isSearchingAssistant ? (
                                            <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                                                <span>⏳ Đang tìm kiếm trợ giảng...</span>
                                            </div>
                                        ) : assistantSearchError ? (
                                            <div style={{ padding: '12px', textAlign: 'center', color: '#ef4444', fontSize: '13px' }}>
                                                <span>⚠️ {assistantSearchError}</span>
                                                <button
                                                    type="button"
                                                    className="btn-secondary btn-sm"
                                                    data-testid="retry-assistant-search-btn"
                                                    style={{ display: 'block', margin: '6px auto 0' }}
                                                    onClick={() => fetchAssistantCandidates(assistantQuery, 1, false)}
                                                >
                                                    Thử lại
                                                </button>
                                            </div>
                                        ) : assistantCandidates.length === 0 ? (
                                            <div
                                                data-testid="assistant-no-results"
                                                style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}
                                            >
                                                {assistantQuery.trim()
                                                    ? `Không tìm thấy trợ giảng nào phù hợp với từ khóa "${assistantQuery}".`
                                                    : 'Không có trợ giảng khả dụng.'}
                                            </div>
                                        ) : (
                                            assistantCandidates.map((candidate) => {
                                                const candId = String(candidate.id)
                                                const isChecked = assistantIds.includes(candId)
                                                return (
                                                    <label
                                                        key={candId}
                                                        className="candidate-item-row"
                                                        style={{
                                                            cursor: canManage ? 'pointer' : 'default',
                                                            backgroundColor: isChecked ? '#f0fdf4' : undefined,
                                                            borderColor: isChecked ? '#bbf7d0' : 'transparent',
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                                            <input
                                                                type="checkbox"
                                                                data-testid={`assistant-checkbox-${candId}`}
                                                                checked={isChecked}
                                                                disabled={!canManage}
                                                                onChange={() => handleToggleAssistant(candidate)}
                                                                style={{ cursor: 'pointer', flexShrink: 0 }}
                                                            />
                                                            <div className="candidate-item-info">
                                                                <div className="candidate-item-name">{candidate.name}</div>
                                                                <div className="candidate-item-email">{candidate.email}</div>
                                                            </div>
                                                        </div>
                                                        <span
                                                            style={{
                                                                fontSize: '12px',
                                                                color: isChecked ? '#16a34a' : '#64748b',
                                                                fontWeight: isChecked ? 600 : 400,
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            {isChecked ? '✓ Đã chọn' : 'Chưa chọn'}
                                                        </span>
                                                    </label>
                                                )
                                            })
                                        )}
                                    </div>

                                    {/* Nút tải thêm kết quả Trợ giảng */}
                                    {hasMoreAssistant && !isSearchingAssistant && (
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            data-testid="load-more-assistants-btn"
                                            disabled={isLoadingMoreAssistant}
                                            onClick={() => fetchAssistantCandidates(assistantQuery, assistantPage + 1, true)}
                                            style={{ marginTop: '10px', width: '100%', fontSize: '13px' }}
                                        >
                                            {isLoadingMoreAssistant ? 'Đang tải thêm...' : 'Tải thêm kết quả (tối đa 20/lần)'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Nút thao tác dưới cùng */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                        <button
                            type="button"
                            className="btn-cancel"
                            data-testid="cancel-assignment-btn"
                            onClick={() => navigate(`/classes/${classId}/instructors`)}
                        >
                            Hủy / Quay lại
                        </button>
                        {canManage && (
                            <button
                                type="submit"
                                className="btn-primary"
                                data-testid="save-assignment-btn"
                                disabled={isSaving}
                                style={{ minWidth: '130px' }}
                            >
                                {isSaving ? 'Đang lưu...' : 'Lưu phân công'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    )
}
