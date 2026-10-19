import { useEffect, useState, useMemo, type FormEvent } from 'react'
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

    const [classData, setClassData] = useState<TrainingClass | null>(initialClass || null)
    const [subject, setSubject] = useState<ClassSubjectItem | null>(initialSubject || null)
    const [instructors, setInstructors] = useState<User[]>(initialInstructors || [])

    const [mainInstructorId, setMainInstructorId] = useState<string>(
        initialAssignment?.main_instructor?.id
            ? String(initialAssignment.main_instructor.id)
            : initialSubject?.main_instructor?.id
              ? String(initialSubject.main_instructor.id)
              : '',
    )
    const [assistantIds, setAssistantIds] = useState<string[]>(
        initialAssignment?.assistants
            ? initialAssignment.assistants.map((a) => String(a.id))
            : initialSubject?.assistants
              ? initialSubject.assistants.map((a) => String(a.id))
              : [],
    )

    const [isLoading, setIsLoading] = useState(!initialClass || !initialSubject)
    const [isSaving, setIsSaving] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Lọc tài khoản theo vai trò (SCRUM-220 - 220-02)
    const eligibleTrainers = useMemo(
        () => instructors.filter((u) => u.role === 'trainer'),
        [instructors],
    )
    const eligibleAssistants = useMemo(
        () => instructors.filter((u) => u.role === 'trainer'),
        [instructors],
    )

    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let isMounted = true
        if (!classId || !classSubjectId) return

        if (initialClass && initialSubject && initialInstructors) {
            setIsLoading(false)
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
                : getInstructorCandidates(requestFn).catch((err) => {
                      console.warn('Fallback fetching users for instructor list:', err)
                      return fetchUsersApi(requestFn, { page_size: 100, role: 'trainer' })
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

                const userList = (candidatesList as User[]) || []
                setInstructors(userList)

                if (assignment) {
                    setMainInstructorId(assignment.main_instructor ? String(assignment.main_instructor.id) : '')
                    setAssistantIds((assignment.assistants || []).map((a) => String(a.id)))
                } else if (currentSub) {
                    setMainInstructorId(currentSub.main_instructor ? String(currentSub.main_instructor.id) : '')
                    setAssistantIds((currentSub.assistants || []).map((a) => String(a.id)))
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
            } else {
                setMainInstructorId('')
            }
            if (res?.assistants) {
                setAssistantIds(res.assistants.map((a) => String(a.id)))
            }
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Lỗi khi phân công giảng viên cho môn học.'))
        } finally {
            setIsSaving(false)
        }
    }

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
                        className="btn-secondary"
                        onClick={() => navigate(`/classes/${classId}/instructors`)}
                    >
                        Quay lại danh sách phân công
                    </button>
                }
            />

            {errorMessage && (
                <div className="modal-alert error" data-testid="assign-modal-error" role="alert" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

            {successMessage && (
                <div className="classes-alert success" data-testid="assign-success" role="alert" style={{ marginBottom: 16 }}>
                    <span>✓ {successMessage}</span>
                </div>
            )}

            <div className="modal-content" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '800px', margin: '0 auto' }}>
                {/* Thông tin môn học */}
                <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                        <div>
                            <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Mã môn học</span>
                            <strong style={{ fontSize: '15px', color: '#0f172a' }}>{subject?.subject_code || '—'}</strong>
                        </div>
                        <div>
                            <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Tên môn học</span>
                            <strong style={{ fontSize: '15px', color: '#0f172a' }}>{subject?.subject_name || '—'}</strong>
                        </div>
                        <div>
                            <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Số tín chỉ</span>
                            <strong style={{ fontSize: '15px', color: '#0f172a' }}>{subject?.credits ? `${subject.credits} tín chỉ` : '—'}</strong>
                        </div>
                        <div>
                            <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Học kỳ</span>
                            <strong style={{ fontSize: '15px', color: '#0f172a' }}>{subject?.semester ? `Học kỳ ${subject.semester}` : '—'}</strong>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSaveAssignment}>
                    {/* Chọn Giảng viên chính */}
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label htmlFor="main-instructor-select" style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '6px', display: 'block' }}>
                            Giảng viên chính: <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select
                            id="main-instructor-select"
                            className="form-select"
                            data-testid="main-instructor-select"
                            value={mainInstructorId}
                            onChange={(e) => setMainInstructorId(e.target.value)}
                            disabled={!canManage}
                            style={{ height: '42px', fontSize: '14px' }}
                        >
                            <option value="">-- Chưa chọn giảng viên chính --</option>
                            {eligibleTrainers.map((t) => (
                                <option key={t.id} value={String(t.id)}>
                                    {t.name} ({t.email})
                                </option>
                            ))}
                        </select>
                        <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                            Mỗi môn trong lớp có tối đa 1 giảng viên chính chịu trách nhiệm nội dung và giảng dạy. Chỉ hiển thị tài khoản có vai trò Giảng viên.
                        </span>
                    </div>

                    {/* Chọn Trợ giảng */}
                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '6px', display: 'block' }}>
                            Trợ giảng (có thể chọn nhiều):
                        </label>
                        <div
                            className="assistants-checkbox-list"
                            data-testid="assistants-list"
                            style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px' }}
                        >
                            {eligibleAssistants.length === 0 ? (
                                <div style={{ color: '#64748b', fontSize: '14px', padding: '8px 0' }}>
                                    Không có tài khoản trợ giảng khả dụng.
                                </div>
                            ) : (
                                eligibleAssistants.map((ast) => {
                                    const astId = String(ast.id)
                                    const isChecked = assistantIds.includes(astId)
                                    return (
                                        <label
                                            key={astId}
                                            className="assistant-checkbox-label"
                                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', cursor: canManage ? 'pointer' : 'default' }}
                                        >
                                            <input
                                                type="checkbox"
                                                data-testid={`assistant-checkbox-${astId}`}
                                                checked={isChecked}
                                                disabled={!canManage}
                                                onChange={(e) => {
                                                    const checked = e.target.checked
                                                    setAssistantIds((prev) =>
                                                        checked
                                                            ? [...prev, astId]
                                                            : prev.filter((id) => id !== astId),
                                                    )
                                                }}
                                            />
                                            <span style={{ fontSize: '14px', color: '#1e293b' }}>
                                                <strong>{ast.name}</strong> ({ast.email})
                                            </span>
                                        </label>
                                    )
                                })
                            )}
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                            Trợ giảng hỗ trợ lớp học và thực hành. Chỉ hiển thị các tài khoản có vai trò phù hợp trong hệ thống.
                        </span>
                    </div>

                    {/* Nút thao tác */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                        <button
                            type="button"
                            className="btn-secondary"
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
