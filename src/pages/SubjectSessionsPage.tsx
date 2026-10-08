/**
 * Subject Sessions Management Page (SCRUM-129 Activity A6).
 * Giao diện quản lý các buổi học của môn học:
 * - Xem danh sách buổi học theo môn học (SCRUM-174)
 * - Thêm mới buổi học với ràng buộc total_sessions (SCRUM-175)
 * - Chỉnh sửa chủ đề & mục tiêu buổi học (SCRUM-175)
 * - Sắp xếp lại thứ tự (Lên / Xuống) tự động đồng bộ API (SCRUM-175)
 * - Xóa buổi học an toàn & tự động chuẩn hóa thứ tự 1..N (SCRUM-175)
 * - Chế độ chỉ đọc cho course.view và môn học đã lưu trữ (archived).
 */

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getRolePermissions, SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import {
    getSubjectSessions,
    createSubjectSession,
    updateSubjectSession,
    reorderSubjectSessions,
    deleteSubjectSession,
    type SubjectSession,
    type SubjectSummary,
    type RequestFunction,
    ApiError,
} from '../api/subjectSessionApi'
import { getSubject } from '../api/subjectApi'
import { Breadcrumb } from '../components/Breadcrumb'
import './SubjectSessionsPage.css'

export interface SubjectSessionsPageProps {
    subjectIdProp?: string
    customRequest?: RequestFunction
    canManageOverride?: boolean
    initialSessions?: SubjectSession[]
    initialSubject?: SubjectSummary
}

export function SubjectSessionsPage({
    subjectIdProp,
    customRequest,
    canManageOverride,
    initialSessions,
    initialSubject,
}: SubjectSessionsPageProps) {
    const routeParams = useParams<{ subjectId?: string }>()
    const subjectId = subjectIdProp || routeParams.subjectId || ''

    const { request: sessionRequest, role, roles, permissions: sessionPermissions } = useSession()
    const requestFn: RequestFunction = customRequest || (sessionRequest as RequestFunction)

    const permissions =
        sessionPermissions && sessionPermissions.length > 0
            ? sessionPermissions
            : getRolePermissions(roles && roles.length > 0 ? roles : role)

    const canManage =
        canManageOverride !== undefined
            ? canManageOverride
            : permissions.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE)

    // Data State
    const [subject, setSubject] = useState<SubjectSummary | null>(initialSubject || null)
    const [subjectStatus, setSubjectStatus] = useState<string>('active')
    const [sessions, setSessions] = useState<SubjectSession[]>(initialSessions || [])
    const [loading, setLoading] = useState<boolean>(!initialSessions && Boolean(subjectId))
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Modals State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false)
    const [createNumber, setCreateNumber] = useState<string>('1')
    const [createTopic, setCreateTopic] = useState<string>('')
    const [createObjective, setCreateObjective] = useState<string>('')
    const [createError, setCreateError] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState<boolean>(false)

    const [editingSession, setEditingSession] = useState<SubjectSession | null>(null)
    const [editTopic, setEditTopic] = useState<string>('')
    const [editObjective, setEditObjective] = useState<string>('')
    const [editError, setEditError] = useState<string | null>(null)
    const [isUpdating, setIsUpdating] = useState<boolean>(false)

    const [deletingSession, setDeletingSession] = useState<SubjectSession | null>(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState<boolean>(false)

    const isArchived = subjectStatus === 'archived'

    // Load data function
    const loadData = useCallback(async () => {
        if (!subjectId) return
        setLoading(true)
        setErrorMessage(null)

        try {
            // Lấy danh sách sessions
            const res = await getSubjectSessions(requestFn, subjectId)
            setSubject(res.subject)
            setSessions(res.items.sort((a, b) => a.session_number - b.session_number))

            // Kiểm tra trạng thái môn học
            try {
                const subjDetail = await getSubject(requestFn, subjectId)
                setSubjectStatus(subjDetail.status)
            } catch {
                // Nếu getSubject lỗi thì giữ nguyên status mặc định
            }
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : 'Lỗi khi tải dữ liệu buổi học.'
            setErrorMessage(msg)
        } finally {
            setLoading(false)
        }
    }, [requestFn, subjectId])

    useEffect(() => {
        let isMounted = true
        if (!subjectId || initialSessions) return

        getSubjectSessions(requestFn, subjectId)
            .then((res) => {
                if (isMounted) {
                    setSubject(res.subject)
                    setSessions(res.items.sort((a, b) => a.session_number - b.session_number))
                    setLoading(false)
                }
            })
            .catch((err: unknown) => {
                if (isMounted) {
                    setErrorMessage(err instanceof ApiError ? err.message : 'Lỗi khi tải dữ liệu buổi học.')
                    setLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [subjectId, requestFn, initialSessions])

    // ESC key handler for modals
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isCreateModalOpen && !isCreating) setIsCreateModalOpen(false)
                if (editingSession && !isUpdating) setEditingSession(null)
                if (deletingSession && !isDeleting) setDeletingSession(null)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isCreateModalOpen, isCreating, editingSession, isUpdating, deletingSession, isDeleting])

    // Open Create Modal
    const handleOpenCreateModal = () => {
        const nextNum = sessions.length > 0 ? Math.max(...sessions.map((s) => s.session_number)) + 1 : 1
        setCreateNumber(String(nextNum))
        setCreateTopic('')
        setCreateObjective('')
        setCreateError(null)
        setIsCreateModalOpen(true)
    }

    // Submit Create Session
    const handleCreateSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setCreateError(null)

        const num = Number.parseInt(createNumber, 10)
        if (Number.isNaN(num) || num < 1) {
            setCreateError('Số thứ tự buổi học phải là số nguyên dương lớn hơn hoặc bằng 1.')
            return
        }

        if (subject?.total_sessions !== null && subject?.total_sessions !== undefined) {
            if (num > subject.total_sessions) {
                setCreateError(`Số thứ tự buổi học vượt quá tổng số buổi của môn học (tối đa ${subject.total_sessions}).`)
                return
            }
        }

        const trimmedTopic = createTopic.trim()
        if (!trimmedTopic) {
            setCreateError('Chủ đề buổi học là bắt buộc.')
            return
        }
        if (trimmedTopic.length > 255) {
            setCreateError('Chủ đề buổi học không được vượt quá 255 ký tự.')
            return
        }

        const trimmedObjective = createObjective.trim()
        if (!trimmedObjective) {
            setCreateError('Mục tiêu buổi học là bắt buộc.')
            return
        }
        if (trimmedObjective.length > 5000) {
            setCreateError('Mục tiêu buổi học không được vượt quá 5000 ký tự.')
            return
        }

        setIsCreating(true)
        try {
            await createSubjectSession(requestFn, subjectId, {
                session_number: num,
                topic: trimmedTopic,
                objective: trimmedObjective,
            })
            setIsCreateModalOpen(false)
            setSuccessMessage(`Thêm Buổi ${num} thành công.`)
            await loadData()
        } catch (err) {
            setCreateError(err instanceof ApiError ? err.message : 'Lỗi khi thêm buổi học mới.')
        } finally {
            setIsCreating(false)
        }
    }

    // Open Edit Modal
    const handleOpenEditModal = (sess: SubjectSession) => {
        setEditingSession(sess)
        setEditTopic(sess.topic)
        setEditObjective(sess.objective)
        setEditError(null)
    }

    // Submit Edit Session
    const handleEditSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!editingSession) return
        setEditError(null)

        const trimmedTopic = editTopic.trim()
        if (!trimmedTopic) {
            setEditError('Chủ đề buổi học là bắt buộc.')
            return
        }
        if (trimmedTopic.length > 255) {
            setEditError('Chủ đề buổi học không được vượt quá 255 ký tự.')
            return
        }

        const trimmedObjective = editObjective.trim()
        if (!trimmedObjective) {
            setEditError('Mục tiêu buổi học là bắt buộc.')
            return
        }
        if (trimmedObjective.length > 5000) {
            setEditError('Mục tiêu buổi học không được vượt quá 5000 ký tự.')
            return
        }

        setIsUpdating(true)
        try {
            await updateSubjectSession(requestFn, subjectId, editingSession.id, {
                topic: trimmedTopic,
                objective: trimmedObjective,
            })
            setEditingSession(null)
            setSuccessMessage(`Cập nhật Buổi ${editingSession.session_number} thành công.`)
            await loadData()
        } catch (err) {
            setEditError(err instanceof ApiError ? err.message : 'Lỗi khi cập nhật buổi học.')
        } finally {
            setIsUpdating(false)
        }
    }

    // Reorder Handlers (Move Up / Down)
    const handleMoveSession = async (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= sessions.length) return

        const previousSessions = [...sessions]
        const reordered = [...sessions]
        const [moved] = reordered.splice(index, 1)
        reordered.splice(targetIndex, 0, moved)

        // Optimistic UI update with updated session_numbers
        const updatedLocal = reordered.map((item, idx) => ({
            ...item,
            session_number: idx + 1,
        }))
        setSessions(updatedLocal)
        setErrorMessage(null)

        try {
            const sessionIds = reordered.map((s) => s.id)
            const result = await reorderSubjectSessions(requestFn, subjectId, sessionIds)
            setSessions(result.sort((a, b) => a.session_number - b.session_number))
            setSuccessMessage('Sắp xếp lại thứ tự buổi học thành công.')
        } catch (err) {
            // Rollback on failure
            setSessions(previousSessions)
            setErrorMessage(err instanceof ApiError ? err.message : 'Lỗi khi sắp xếp lại buổi học. Đã khôi phục thứ tự cũ.')
        }
    }

    // Delete Session Submit
    const handleDeleteSubmit = async () => {
        if (!deletingSession) return
        setDeleteError(null)
        setIsDeleting(true)

        try {
            await deleteSubjectSession(requestFn, subjectId, deletingSession.id)
            setDeletingSession(null)
            setSuccessMessage(`Đã xóa Buổi ${deletingSession.session_number} thành công.`)
            await loadData()
        } catch (err) {
            setDeleteError(err instanceof ApiError ? err.message : 'Lỗi khi xóa buổi học.')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="subject-sessions-container" data-testid="subject-sessions-page">
            <Breadcrumb
                items={[
                    { label: 'Môn học', path: '/subjects' },
                    { label: subject ? `Buổi học - ${subject.code}` : 'Buổi học' },
                ]}
            />
            {/* Header & Meta */}
            <header className="subject-sessions-header">
                <Link to="/subjects" className="subject-sessions-back-link" data-testid="link-back-subjects">
                    ← Quay lại danh sách môn học
                </Link>

                <div className="subject-sessions-title-bar">
                    <div className="subject-sessions-title-wrapper">
                        <h1 data-testid="page-title">
                            {subject ? `${subject.code} - ${subject.name}` : 'Quản lý buổi học'}
                        </h1>
                        <div className="subject-sessions-meta">
                            {subject && (
                                <>
                                    <span className="subject-code-badge" data-testid="badge-subject-code">
                                        Mã: {subject.code}
                                    </span>
                                    <span className="subject-progress-badge" data-testid="badge-subject-progress">
                                        {subject.total_sessions !== null && subject.total_sessions !== undefined
                                            ? `${sessions.length} / ${subject.total_sessions} buổi đã tạo`
                                            : `${sessions.length} buổi đã tạo (Chưa giới hạn số buổi)`}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {canManage && !isArchived && (
                        <button
                            type="button"
                            className="btn-add-session"
                            data-testid="btn-add-session"
                            onClick={handleOpenCreateModal}
                        >
                            + Thêm buổi học
                        </button>
                    )}
                </div>
            </header>

            {/* Archived Alert Banner */}
            {isArchived && (
                <div className="sessions-banner sessions-banner-warning" data-testid="banner-archived">
                    <p className="sessions-banner-message">
                        ⚠ Môn học này đã ở trạng thái Đã lưu trữ. Bạn chỉ có thể xem danh sách buổi học ở chế độ chỉ đọc.
                    </p>
                </div>
            )}

            {/* Success Message Banner */}
            {successMessage && (
                <div className="sessions-banner sessions-banner-success" data-testid="banner-success" role="status">
                    <p className="sessions-banner-message">✓ {successMessage}</p>
                    <button
                        type="button"
                        className="sessions-banner-close"
                        aria-label="Đóng thông báo"
                        onClick={() => setSuccessMessage(null)}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Error Message Banner */}
            {errorMessage && (
                <div className="sessions-banner sessions-banner-error" data-testid="banner-error" role="alert">
                    <p className="sessions-banner-message">⚠ {errorMessage}</p>
                    <button
                        type="button"
                        className="sessions-banner-close"
                        aria-label="Đóng thông báo lỗi"
                        onClick={() => setErrorMessage(null)}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="sessions-loading-state" data-testid="loading-state">
                    <div className="spinner" />
                    <p>Đang tải danh sách buổi học...</p>
                </div>
            ) : sessions.length === 0 ? (
                /* Empty State */
                <div className="sessions-empty-state" data-testid="empty-state">
                    <h3>Chưa có buổi học nào</h3>
                    <p>Môn học này hiện chưa được thiết lập bất kỳ buổi học nào trong chương trình.</p>
                    {canManage && !isArchived && (
                        <button
                            type="button"
                            className="btn-add-session"
                            data-testid="btn-empty-add-session"
                            onClick={handleOpenCreateModal}
                        >
                            + Thêm buổi học đầu tiên
                        </button>
                    )}
                </div>
            ) : (
                /* Sessions Table */
                <div className="sessions-table-wrapper" data-testid="sessions-table-wrapper">
                    <table className="sessions-table" data-testid="sessions-table">
                        <thead>
                            <tr>
                                <th scope="col">Buổi / STT</th>
                                <th scope="col">Chủ đề</th>
                                <th scope="col">Mục tiêu buổi học</th>
                                {canManage && !isArchived && <th scope="col" style={{ textAlign: 'right' }}>Thao tác</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((sess, idx) => (
                                <tr key={sess.id} data-testid={`session-row-${sess.id}`}>
                                    <td className="cell-number">
                                        <span className="session-badge" data-testid={`session-number-${sess.id}`}>
                                            Buổi {sess.session_number}
                                        </span>
                                    </td>
                                    <td className="cell-topic" data-testid={`session-topic-${sess.id}`}>
                                        {sess.topic}
                                    </td>
                                    <td className="cell-objective" data-testid={`session-objective-${sess.id}`}>
                                        {sess.objective}
                                    </td>
                                    {canManage && !isArchived && (
                                        <td className="cell-actions">
                                            <div className="actions-group">
                                                <button
                                                    type="button"
                                                    className="btn-action-icon"
                                                    data-testid={`btn-move-up-${sess.id}`}
                                                    aria-label={`Di chuyển Buổi ${sess.session_number} lên trên`}
                                                    title="Di chuyển lên"
                                                    disabled={idx === 0}
                                                    onClick={() => handleMoveSession(idx, 'up')}
                                                >
                                                    ↑
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-action-icon"
                                                    data-testid={`btn-move-down-${sess.id}`}
                                                    aria-label={`Di chuyển Buổi ${sess.session_number} xuống dưới`}
                                                    title="Di chuyển xuống"
                                                    disabled={idx === sessions.length - 1}
                                                    onClick={() => handleMoveSession(idx, 'down')}
                                                >
                                                    ↓
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-action-edit"
                                                    data-testid={`btn-edit-${sess.id}`}
                                                    aria-label={`Sửa Buổi ${sess.session_number}`}
                                                    onClick={() => handleOpenEditModal(sess)}
                                                >
                                                    Sửa
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-action-delete"
                                                    data-testid={`btn-delete-${sess.id}`}
                                                    aria-label={`Xóa Buổi ${sess.session_number}`}
                                                    onClick={() => {
                                                        setDeletingSession(sess)
                                                        setDeleteError(null)
                                                    }}
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* CREATE MODAL */}
            {isCreateModalOpen && (
                <div className="modal-overlay" role="presentation" onClick={() => !isCreating && setIsCreateModalOpen(false)}>
                    <div
                        className="modal-content"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-create-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <form onSubmit={handleCreateSubmit}>
                            <div className="modal-header">
                                <h2 id="modal-create-title">Thêm buổi học mới</h2>
                                <button
                                    type="button"
                                    className="modal-close-btn"
                                    aria-label="Đóng hộp thoại"
                                    onClick={() => !isCreating && setIsCreateModalOpen(false)}
                                    disabled={isCreating}
                                >
                                    ×
                                </button>
                            </div>
                            <div className="modal-body">
                                {createError && (
                                    <div className="sessions-banner sessions-banner-error" role="alert" style={{ marginBottom: '1rem' }}>
                                        <p className="sessions-banner-message">⚠ {createError}</p>
                                    </div>
                                )}
                                <div className="form-group">
                                    <label htmlFor="create-session-number">
                                        Số thứ tự buổi học <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="number"
                                        id="create-session-number"
                                        data-testid="input-session-number"
                                        min="1"
                                        max={subject?.total_sessions ?? undefined}
                                        value={createNumber}
                                        onChange={(e) => setCreateNumber(e.target.value)}
                                        required
                                        disabled={isCreating}
                                    />
                                    {subject?.total_sessions && (
                                        <div className="form-help-text">
                                            Tổng số buổi cấu hình cho môn học: tối đa {subject.total_sessions} buổi.
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="create-session-topic">
                                        Chủ đề buổi học <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="create-session-topic"
                                        data-testid="input-session-topic"
                                        placeholder="Ví dụ: Giới thiệu môn học và cơ sở lập trình"
                                        maxLength={255}
                                        value={createTopic}
                                        onChange={(e) => setCreateTopic(e.target.value)}
                                        required
                                        disabled={isCreating}
                                    />
                                    <div className="form-help-text">Tối đa 255 ký tự.</div>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="create-session-objective">
                                        Mục tiêu buổi học <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <textarea
                                        id="create-session-objective"
                                        data-testid="input-session-objective"
                                        placeholder="Ví dụ: Sinh viên hiểu được cấu trúc dữ liệu mảng, danh sách liên kết..."
                                        rows={4}
                                        maxLength={5000}
                                        value={createObjective}
                                        onChange={(e) => setCreateObjective(e.target.value)}
                                        required
                                        disabled={isCreating}
                                    />
                                    <div className="form-help-text">Tối đa 5000 ký tự.</div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    disabled={isCreating}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    data-testid="btn-submit-create"
                                    disabled={isCreating}
                                >
                                    {isCreating ? 'Đang thêm...' : 'Thêm buổi học'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {editingSession && (
                <div className="modal-overlay" role="presentation" onClick={() => !isUpdating && setEditingSession(null)}>
                    <div
                        className="modal-content"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-edit-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <form onSubmit={handleEditSubmit}>
                            <div className="modal-header">
                                <h2 id="modal-edit-title">Chỉnh sửa Buổi {editingSession.session_number}</h2>
                                <button
                                    type="button"
                                    className="modal-close-btn"
                                    aria-label="Đóng hộp thoại"
                                    onClick={() => !isUpdating && setEditingSession(null)}
                                    disabled={isUpdating}
                                >
                                    ×
                                </button>
                            </div>
                            <div className="modal-body">
                                {editError && (
                                    <div className="sessions-banner sessions-banner-error" role="alert" style={{ marginBottom: '1rem' }}>
                                        <p className="sessions-banner-message">⚠ {editError}</p>
                                    </div>
                                )}
                                <div className="form-group">
                                    <label>Số thứ tự buổi học</label>
                                    <input
                                        type="text"
                                        value={`Buổi ${editingSession.session_number}`}
                                        disabled
                                        style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
                                    />
                                    <div className="form-help-text">
                                        Số thứ tự được cố định tại đây. Để thay đổi thứ tự, hãy dùng nút Sắp xếp (↑/↓).
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="edit-session-topic">
                                        Chủ đề buổi học <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="edit-session-topic"
                                        data-testid="input-edit-topic"
                                        maxLength={255}
                                        value={editTopic}
                                        onChange={(e) => setEditTopic(e.target.value)}
                                        required
                                        disabled={isUpdating}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="edit-session-objective">
                                        Mục tiêu buổi học <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <textarea
                                        id="edit-session-objective"
                                        data-testid="input-edit-objective"
                                        rows={4}
                                        maxLength={5000}
                                        value={editObjective}
                                        onChange={(e) => setEditObjective(e.target.value)}
                                        required
                                        disabled={isUpdating}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setEditingSession(null)}
                                    disabled={isUpdating}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    data-testid="btn-submit-edit"
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {deletingSession && (
                <div className="modal-overlay" role="presentation" onClick={() => !isDeleting && setDeletingSession(null)}>
                    <div
                        className="modal-content"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-delete-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h2 id="modal-delete-title">Xác nhận xóa buổi học</h2>
                            <button
                                type="button"
                                className="modal-close-btn"
                                aria-label="Đóng hộp thoại"
                                onClick={() => !isDeleting && setDeletingSession(null)}
                                disabled={isDeleting}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            {deleteError && (
                                <div className="sessions-banner sessions-banner-error" role="alert" style={{ marginBottom: '1rem' }}>
                                    <p className="sessions-banner-message">⚠ {deleteError}</p>
                                </div>
                            )}
                            <p style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>
                                Bạn có chắc chắn muốn xóa <strong>Buổi {deletingSession.session_number} - &quot;{deletingSession.topic}&quot;</strong>?
                            </p>
                            <p style={{ margin: 0, color: '#dc2626', fontSize: '0.875rem' }}>
                                Lưu ý: Thao tác này chỉ xóa buổi học, không xóa môn học. Thứ tự các buổi học còn lại sẽ tự động được chuẩn hóa liên tục.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setDeletingSession(null)}
                                disabled={isDeleting}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="btn-danger"
                                data-testid="btn-submit-delete"
                                onClick={handleDeleteSubmit}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Đang xóa...' : 'Xóa buổi học'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
