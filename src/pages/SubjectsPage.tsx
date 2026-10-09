import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getRolePermissions, SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import {
    getSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
    getSubjectStatusLabel,
    type Subject,
    type CreateSubjectInput,
    type UpdateSubjectInput,
    type SubjectStatus,
    type RequestFunction,
    ApiError,
} from '../api/subjectApi'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { Breadcrumb } from '../components/Breadcrumb'
import './SubjectsPage.css'

export interface SubjectsPageProps {
    initialSubjects?: Subject[]
    initialTotal?: number
    customRequest?: (path: string, init?: RequestInit) => Promise<Response>
    pageSize?: number
    canManageOverride?: boolean
}

interface FormErrors {
    code?: string
    name?: string
    credits?: string
    total_sessions?: string
    weight?: string
    learning_outcomes?: string
    general?: string
}

export function SubjectsPage({
    initialSubjects,
    initialTotal,
    customRequest,
    pageSize: initialPageSize = 10,
    canManageOverride,
}: SubjectsPageProps) {
    const { request: sessionRequest, role, roles, permissions } = useSession()
    const requestFn: RequestFunction = customRequest ?? sessionRequest

    // Phân quyền RBAC
    const effectiveRoles = roles && roles.length > 0 ? roles : (role ? [role] : [])
    const effectivePerms =
        permissions && permissions.length > 0 ? permissions : getRolePermissions(effectiveRoles)
    const canManage =
        canManageOverride !== undefined
            ? canManageOverride
            : effectivePerms.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE)

    // Data State
    const [subjects, setSubjects] = useState<Subject[]>(initialSubjects ?? [])
    const [total, setTotal] = useState<number>(initialTotal ?? initialSubjects?.length ?? 0)
    const [isLoading, setIsLoading] = useState<boolean>(initialSubjects === undefined)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Filter, Search, Pagination State
    const [page, setPage] = useState<number>(1)
    const pageSize = initialPageSize
    const [search, setSearch] = useState<string>('')
    const [statusFilter, setStatusFilter] = useState<string>('')

    // Modals State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false)
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
    const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null)
    const [viewingSubject, setViewingSubject] = useState<Subject | null>(null)

    // Form inputs state (Create / Edit)
    const [formCode, setFormCode] = useState<string>('')
    const [formName, setFormName] = useState<string>('')
    const [formCredits, setFormCredits] = useState<string>('3')
    const [formSessions, setFormSessions] = useState<string>('')
    const [formWeight, setFormWeight] = useState<string>('')
    const [formLearningOutcomes, setFormLearningOutcomes] = useState<string>('')
    const [formDescription, setFormDescription] = useState<string>('')
    const [formStatus, setFormStatus] = useState<SubjectStatus>('draft')
    const [formErrors, setFormErrors] = useState<FormErrors>({})
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [deleteDialogError, setDeleteDialogError] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState<boolean>(false)

    // Search debounce ref
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Fetch Subjects Function
    const loadSubjects = useCallback(
        async (targetPage = page, targetSearch = search, targetStatus = statusFilter) => {
            setIsLoading(true)
            setErrorMessage(null)
            try {
                const res = await getSubjects(requestFn, {
                    page: targetPage,
                    page_size: pageSize,
                    search: targetSearch.trim() || undefined,
                    status: targetStatus || undefined,
                })
                setSubjects(res.items ?? [])
                setTotal(res.total ?? 0)
            } catch (err: unknown) {
                if (err instanceof ApiError) {
                    setErrorMessage(err.message)
                } else {
                    setErrorMessage(getErrorMessage(err, 'Lỗi khi tải danh sách môn học.'))
                }
            } finally {
                setIsLoading(false)
            }
        },
        [requestFn, page, search, statusFilter, pageSize],
    )

    // Initial load on mount
    useEffect(() => {
        let isMounted = true
        if (initialSubjects === undefined) {
            getSubjects(requestFn, {
                page: 1,
                page_size: pageSize,
                search: undefined,
                status: undefined,
            })
                .then((res) => {
                    if (isMounted) {
                        setSubjects(res.items ?? [])
                        setTotal(res.total ?? 0)
                        setIsLoading(false)
                    }
                })
                .catch((err: unknown) => {
                    if (isMounted) {
                        setErrorMessage(
                            err instanceof ApiError
                                ? err.message
                                : getErrorMessage(err, 'Lỗi khi tải danh sách môn học.'),
                        )
                        setIsLoading(false)
                    }
                })
        }
        return () => {
            isMounted = false
        }
    }, [initialSubjects, requestFn, pageSize])

    // Search with debounce
    const handleSearchChange = (value: string) => {
        setSearch(value)
        setPage(1)
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current)
        }
        searchDebounceRef.current = setTimeout(() => {
            void loadSubjects(1, value, statusFilter)
        }, 300)
    }

    const handleStatusFilterChange = (value: string) => {
        setStatusFilter(value)
        setPage(1)
        void loadSubjects(1, search, value)
    }

    const handlePageChange = (newPage: number) => {
        setPage(newPage)
        void loadSubjects(newPage, search, statusFilter)
    }

    // Modal Handlers
    const openCreateModal = () => {
        setFormCode('')
        setFormName('')
        setFormCredits('3')
        setFormSessions('')
        setFormWeight('')
        setFormLearningOutcomes('')
        setFormDescription('')
        setFormStatus('draft')
        setFormErrors({})
        setIsSubmitting(false)
        setIsCreateModalOpen(true)
    }

    const closeCreateModal = () => {
        if (!isSubmitting) {
            setIsCreateModalOpen(false)
            setFormErrors({})
        }
    }

    const openEditModal = (subj: Subject) => {
        setEditingSubject(subj)
        setFormCode(subj.code)
        setFormName(subj.name)
        setFormCredits(String(subj.credits))
        setFormSessions(subj.total_sessions !== null && subj.total_sessions !== undefined ? String(subj.total_sessions) : '')
        setFormWeight(subj.weight !== null && subj.weight !== undefined ? String(subj.weight) : '')
        setFormLearningOutcomes(subj.learning_outcomes ?? '')
        setFormDescription(subj.description ?? '')
        setFormStatus(subj.status)
        setFormErrors({})
        setIsSubmitting(false)
    }

    const closeEditModal = () => {
        if (!isSubmitting) {
            setEditingSubject(null)
            setFormErrors({})
        }
    }

    const openDeleteModal = (subj: Subject) => {
        setDeletingSubject(subj)
        setDeleteDialogError(null)
        setIsDeleting(false)
    }

    const closeDeleteModal = () => {
        if (!isDeleting) {
            setDeletingSubject(null)
            setDeleteDialogError(null)
        }
    }

    const openDetailModal = (subj: Subject) => {
        setViewingSubject(subj)
    }

    const closeDetailModal = () => {
        setViewingSubject(null)
    }

    // Form Validation Helper
    const validateForm = (): boolean => {
        const errors: FormErrors = {}
        const trimmedCode = formCode.trim()
        const trimmedName = formName.trim()
        const trimmedCredits = formCredits.trim()
        const trimmedSessions = formSessions.trim()
        const trimmedWeight = formWeight.trim()

        if (!trimmedCode) {
            errors.code = 'Mã môn học là bắt buộc.'
        } else if (trimmedCode.length > 50) {
            errors.code = 'Mã môn học không được vượt quá 50 ký tự.'
        }

        if (!trimmedName) {
            errors.name = 'Tên môn học là bắt buộc.'
        } else if (trimmedName.length > 255) {
            errors.name = 'Tên môn học không được vượt quá 255 ký tự.'
        }

        if (!trimmedCredits) {
            errors.credits = 'Số tín chỉ là bắt buộc.'
        } else {
            const parsedCredits = Number(trimmedCredits)
            if (!Number.isInteger(parsedCredits) || parsedCredits < 1 || parsedCredits > 30) {
                errors.credits = 'Số tín chỉ phải là số nguyên từ 1 đến 30.'
            }
        }

        if (trimmedSessions !== '') {
            const parsedSessions = Number(trimmedSessions)
            if (!Number.isInteger(parsedSessions) || parsedSessions < 0 || parsedSessions > 65535) {
                errors.total_sessions = 'Số buổi học phải là số nguyên từ 0 đến 65535.'
            }
        }

        if (trimmedWeight !== '') {
            const parsedWeight = Number(trimmedWeight)
            if (Number.isNaN(parsedWeight)) {
                errors.weight = 'Trọng số phải là số hợp lệ.'
            }
        }

        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    // Submit Create
    const handleCreateSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!validateForm() || isSubmitting) return

        setIsSubmitting(true)
        setFormErrors({})

        const payload: CreateSubjectInput = {
            code: formCode.trim().toUpperCase(),
            name: formName.trim(),
            credits: Number(formCredits.trim()),
            description: formDescription.trim() ? formDescription.trim() : null,
            total_sessions: formSessions.trim() ? Number(formSessions.trim()) : null,
            weight: formWeight.trim() ? Number(formWeight.trim()) : null,
            learning_outcomes: formLearningOutcomes.trim() ? formLearningOutcomes.trim() : null,
            status: formStatus,
        }

        try {
            await createSubject(requestFn, payload)
            setIsCreateModalOpen(false)
            setSuccessMessage(getSuccessMessage('CREATE_SUBJECT_SUCCESS', 'Tạo môn học thành công.'))
            void loadSubjects(1, search, statusFilter)
            setPage(1)
        } catch (err: unknown) {
            const apiCode = (err && typeof err === 'object' && 'code' in err) ? String((err as { code: unknown }).code) : undefined
            if (apiCode === 'DUPLICATE_CODE') {
                setFormErrors({ code: 'Mã môn học đã tồn tại.' })
            } else if (err instanceof ApiError) {
                setFormErrors({ general: err.message })
            } else {
                setFormErrors({ general: getErrorMessage(err, 'Lỗi khi tạo môn học.') })
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    // Submit Edit
    const handleEditSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!editingSubject || !validateForm() || isSubmitting) return

        setIsSubmitting(true)
        setFormErrors({})

        const payload: UpdateSubjectInput = {
            code: formCode.trim().toUpperCase(),
            name: formName.trim(),
            credits: Number(formCredits.trim()),
            description: formDescription.trim() ? formDescription.trim() : null,
            total_sessions: formSessions.trim() ? Number(formSessions.trim()) : null,
            weight: formWeight.trim() ? Number(formWeight.trim()) : null,
            learning_outcomes: formLearningOutcomes.trim() ? formLearningOutcomes.trim() : null,
            status: formStatus,
        }

        try {
            await updateSubject(requestFn, editingSubject.id, payload)
            setEditingSubject(null)
            setSuccessMessage(getSuccessMessage('UPDATE_SUBJECT_SUCCESS', 'Cập nhật môn học thành công.'))
            void loadSubjects(page, search, statusFilter)
        } catch (err: unknown) {
            const apiCode = (err && typeof err === 'object' && 'code' in err) ? String((err as { code: unknown }).code) : undefined
            if (apiCode === 'DUPLICATE_CODE') {
                setFormErrors({ code: 'Mã môn học đã tồn tại.' })
            } else if (err instanceof ApiError) {
                setFormErrors({ general: err.message })
            } else {
                setFormErrors({ general: getErrorMessage(err, 'Lỗi khi cập nhật môn học.') })
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    // Confirm Delete
    const handleDeleteConfirm = async () => {
        if (!deletingSubject || isDeleting) return

        setIsDeleting(true)
        setDeleteDialogError(null)

        try {
            await deleteSubject(requestFn, deletingSubject.id)
            setDeletingSubject(null)
            setSuccessMessage(getSuccessMessage('DELETE_SUBJECT_SUCCESS', 'Xóa môn học thành công.'))
            void loadSubjects(page, search, statusFilter)
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setDeleteDialogError(err.message)
            } else {
                setDeleteDialogError(getErrorMessage(err, 'Lỗi khi xóa môn học.'))
            }
        } finally {
            setIsDeleting(false)
        }
    }

    // Keyboard ESC to close modals
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isCreateModalOpen && !isSubmitting) closeCreateModal()
                if (editingSubject && !isSubmitting) closeEditModal()
                if (deletingSubject && !isDeleting) closeDeleteModal()
                if (viewingSubject) closeDetailModal()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isCreateModalOpen, editingSubject, deletingSubject, viewingSubject, isSubmitting, isDeleting]) // eslint-disable-line react-hooks/exhaustive-deps

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(total, page * pageSize)

    return (
        <main className="subjects-page" data-testid="subjects-page">
            <Breadcrumb items={[{ label: 'Môn học' }]} />
            {/* Header */}
            <header className="subjects-header">
                <div className="subjects-header-left">
                    <span className="subjects-badge">Phân hệ Đào tạo</span>
                    <h1 className="subjects-title" data-testid="subjects-page-title">
                        Quản lý môn học{' '}
                        {total > 0 && <span className="subjects-total-badge">({total})</span>}
                    </h1>
                    <p className="subjects-description">
                        Danh mục và quản trị các môn học, học phần trong hệ thống đào tạo.
                    </p>
                </div>
                {canManage && (
                    <div className="subjects-header-actions">
                        <button
                            type="button"
                            className="btn-create-subject"
                            data-testid="btn-create-subject"
                            onClick={openCreateModal}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            <span>Thêm môn học</span>
                        </button>
                    </div>
                )}
            </header>

            {/* Success Message Banner */}
            {successMessage && (
                <div className="subjects-banner subjects-banner-success" data-testid="banner-success" role="status">
                    <p className="subjects-banner-message">
                        <span aria-hidden="true">✓</span> {successMessage}
                    </p>
                    <button
                        type="button"
                        className="subjects-banner-close"
                        aria-label="Đóng thông báo"
                        onClick={() => setSuccessMessage(null)}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Error Message Banner */}
            {errorMessage && (
                <div className="subjects-banner subjects-banner-error" data-testid="banner-error" role="alert">
                    <p className="subjects-banner-message">
                        <span aria-hidden="true">⚠</span> {errorMessage}
                    </p>
                    <button
                        type="button"
                        className="subjects-banner-close"
                        aria-label="Đóng thông báo lỗi"
                        onClick={() => setErrorMessage(null)}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Search and Status Filter Bar */}
            <div className="subjects-filter-bar" data-testid="subjects-filter-bar">
                <div className="subjects-search-group">
                    <span className="subjects-search-icon" aria-hidden="true">
                        🔍
                    </span>
                    <input
                        type="search"
                        id="subjects-search-input"
                        className="subjects-search-input"
                        data-testid="subjects-search-input"
                        placeholder="Tìm kiếm theo mã hoặc tên..."
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        aria-label="Tìm kiếm môn học"
                    />
                </div>

                <div className="subjects-filter-group">
                    <label htmlFor="subjects-status-select" className="subjects-filter-label">
                        Trạng thái:
                    </label>
                    <select
                        id="subjects-status-select"
                        className="subjects-filter-select"
                        data-testid="subjects-status-select"
                        value={statusFilter}
                        onChange={(e) => handleStatusFilterChange(e.target.value)}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="draft">Bản nháp</option>
                        <option value="active">Đang hoạt động</option>
                        <option value="archived">Đã lưu trữ</option>
                    </select>
                </div>
            </div>

            {/* Main Content: Loading, Error, Empty, or Table */}
            {isLoading ? (
                <div className="subjects-state-card" data-testid="subjects-loading-state">
                    <div className="subjects-loading-spinner" aria-hidden="true" />
                    <p className="subjects-loading-text">Đang tải danh sách môn học...</p>
                </div>
            ) : subjects.length === 0 ? (
                <div className="subjects-state-card" data-testid="subjects-empty-state">
                    <h3 className="subjects-empty-title">Không tìm thấy môn học nào</h3>
                    <p className="subjects-empty-desc">
                        {search || statusFilter
                            ? 'Không có kết quả nào phù hợp với bộ lọc hiện tại. Vui lòng thử tìm kiếm khác.'
                            : 'Hệ thống chưa có môn học nào.'}
                    </p>
                </div>
            ) : (
                <div className="subjects-table-container" data-testid="subjects-table-container">
                    <div className="subjects-table-scroll-wrapper" tabIndex={0} aria-label="Bảng danh sách môn học">
                        <table className="subjects-table" data-testid="subjects-table">
                            <thead>
                                <tr>
                                    <th scope="col">Mã môn học</th>
                                    <th scope="col">Tên môn học</th>
                                    <th scope="col">Số tín chỉ</th>
                                    <th scope="col">Số buổi</th>
                                    <th scope="col">Trạng thái</th>
                                    <th scope="col">Cập nhật gần nhất</th>
                                    <th scope="col" style={{ textAlign: 'right' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subjects.map((subj) => (
                                    <tr key={subj.id} data-testid={`subject-row-${subj.id}`}>
                                        <td className="subject-cell-code" data-testid={`subject-code-${subj.id}`}>
                                            {subj.code}
                                        </td>
                                        <td className="subject-cell-name" data-testid={`subject-name-${subj.id}`}>
                                            <div>{subj.name}</div>
                                            {subj.description && (
                                                <div className="subject-cell-desc" title={subj.description}>
                                                    {subj.description}
                                                </div>
                                            )}
                                        </td>
                                        <td className="subject-cell-credits" data-testid={`subject-credits-${subj.id}`}>
                                            {subj.credits} tín chỉ
                                        </td>
                                        <td className="subject-cell-sessions" data-testid={`subject-sessions-${subj.id}`}>
                                            {subj.total_sessions !== null && subj.total_sessions !== undefined
                                                ? `${subj.total_sessions} buổi`
                                                : 'Chưa xác định'}
                                        </td>
                                        <td>
                                            <span
                                                className={`subject-status-badge status-${subj.status}`}
                                                data-testid={`subject-status-${subj.id}`}
                                            >
                                                {getSubjectStatusLabel(subj.status)}
                                            </span>
                                        </td>
                                        <td className="subject-cell-updated">
                                            {subj.updated_at
                                                ? new Date(subj.updated_at).toLocaleDateString('vi-VN', {
                                                      year: 'numeric',
                                                      month: '2-digit',
                                                      day: '2-digit',
                                                  })
                                                : '—'}
                                        </td>
                                        <td>
                                            <div className="subject-actions-group">
                                                <button
                                                    type="button"
                                                    className="btn-action-view"
                                                    data-testid={`btn-view-${subj.id}`}
                                                    aria-label={`Xem chi tiết môn học ${subj.code}`}
                                                    onClick={() => openDetailModal(subj)}
                                                >
                                                    Xem
                                                </button>
                                                <Link
                                                    to={`/subjects/${subj.id}/sessions`}
                                                    className="btn-action-sessions"
                                                    data-testid={`btn-sessions-${subj.id}`}
                                                    aria-label={`Quản lý buổi học môn ${subj.code}`}
                                                >
                                                    Buổi học
                                                </Link>
                                                {canManage && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="btn-action-edit"
                                                            data-testid={`btn-edit-${subj.id}`}
                                                            aria-label={`Sửa môn học ${subj.code}`}
                                                            onClick={() => openEditModal(subj)}
                                                        >
                                                            Sửa
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn-action-delete"
                                                            data-testid={`btn-delete-${subj.id}`}
                                                            aria-label={`Xóa môn học ${subj.code}`}
                                                            onClick={() => openDeleteModal(subj)}
                                                        >
                                                            Xóa
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {total > 0 && (
                        <div className="subjects-pagination" data-testid="subjects-pagination">
                            <div className="subjects-pagination-info">
                                Hiển thị <strong>{from}</strong> - <strong>{to}</strong> trên tổng số{' '}
                                <strong>{total}</strong> môn học
                            </div>
                            <div className="subjects-pagination-controls">
                                <button
                                    type="button"
                                    className="btn-pagination-nav"
                                    data-testid="btn-pagination-prev"
                                    disabled={page <= 1}
                                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                                >
                                    ‹ Trước
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                                    <button
                                        key={pNum}
                                        type="button"
                                        className={`btn-pagination-nav ${pNum === page ? 'is-active' : ''}`}
                                        data-testid={`btn-pagination-page-${pNum}`}
                                        onClick={() => handlePageChange(pNum)}
                                    >
                                        {pNum}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    className="btn-pagination-nav"
                                    data-testid="btn-pagination-next"
                                    disabled={page >= totalPages}
                                    onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                                >
                                    Sau ›
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Create Subject Modal */}
            {isCreateModalOpen && (
                <div
                    className="subjects-modal-backdrop"
                    data-testid="modal-create-subject"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="create-modal-title"
                >
                    <div className="subjects-modal-container">
                        <header className="subjects-modal-header">
                            <h2 id="create-modal-title" className="subjects-modal-title">
                                Thêm môn học mới
                            </h2>
                            <button
                                type="button"
                                className="subjects-modal-close-btn"
                                aria-label="Đóng hộp thoại"
                                onClick={closeCreateModal}
                                disabled={isSubmitting}
                            >
                                ×
                            </button>
                        </header>

                        <form onSubmit={handleCreateSubmit} noValidate>
                            <div className="subjects-modal-body">
                                {formErrors.general && (
                                    <div className="subjects-banner subjects-banner-error" data-testid="form-error-general" role="alert">
                                        <p className="subjects-banner-message">{formErrors.general}</p>
                                    </div>
                                )}

                                <div className="subjects-form-group">
                                    <label htmlFor="create-input-code" className="subjects-form-label">
                                        Mã môn học <span className="subjects-form-required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="create-input-code"
                                        data-testid="create-input-code"
                                        className={`subjects-form-input ${formErrors.code ? 'has-error' : ''}`}
                                        placeholder="Ví dụ: CS101"
                                        value={formCode}
                                        maxLength={50}
                                        onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                                        disabled={isSubmitting}
                                        required
                                    />
                                    {formErrors.code && (
                                        <span className="subjects-field-error" data-testid="error-code">
                                            {formErrors.code}
                                        </span>
                                    )}
                                </div>

                                <div className="subjects-form-group">
                                    <label htmlFor="create-input-name" className="subjects-form-label">
                                        Tên môn học <span className="subjects-form-required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="create-input-name"
                                        data-testid="create-input-name"
                                        className={`subjects-form-input ${formErrors.name ? 'has-error' : ''}`}
                                        placeholder="Ví dụ: Lập trình cơ bản"
                                        value={formName}
                                        maxLength={255}
                                        onChange={(e) => setFormName(e.target.value)}
                                        disabled={isSubmitting}
                                        required
                                    />
                                    {formErrors.name && (
                                        <span className="subjects-field-error" data-testid="error-name">
                                            {formErrors.name}
                                        </span>
                                    )}
                                </div>

                                <div className="subjects-form-row">
                                    <div className="subjects-form-group">
                                        <label htmlFor="create-input-sessions" className="subjects-form-label">
                                            Tổng số buổi <span className="subjects-form-required">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            id="create-input-sessions"
                                            data-testid="create-input-sessions"
                                            className={`subjects-form-input ${formErrors.total_sessions ? 'has-error' : ''}`}
                                            placeholder="Ví dụ: 45"
                                            min={0}
                                            max={65535}
                                            value={formSessions}
                                            onChange={(e) => setFormSessions(e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                        {formErrors.total_sessions && (
                                            <span className="subjects-field-error" data-testid="error-sessions">
                                                {formErrors.total_sessions}
                                            </span>
                                        )}
                                    </div>

                                    <div className="subjects-form-group">
                                        <label htmlFor="create-input-weight" className="subjects-form-label">
                                            Trọng số <span className="subjects-form-required">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            id="create-input-weight"
                                            data-testid="create-input-weight"
                                            className={`subjects-form-input ${formErrors.weight ? 'has-error' : ''}`}
                                            placeholder="Ví dụ: 1.5 hoặc 30"
                                            value={formWeight}
                                            onChange={(e) => setFormWeight(e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                        {formErrors.weight && (
                                            <span className="subjects-field-error" data-testid="error-weight">
                                                {formErrors.weight}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="subjects-form-row">
                                    <div className="subjects-form-group">
                                        <label htmlFor="create-input-credits" className="subjects-form-label">
                                            Số tín chỉ <span className="subjects-form-required">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            id="create-input-credits"
                                            data-testid="create-input-credits"
                                            className={`subjects-form-input ${formErrors.credits ? 'has-error' : ''}`}
                                            placeholder="1 - 30"
                                            min={1}
                                            max={30}
                                            value={formCredits}
                                            onChange={(e) => setFormCredits(e.target.value)}
                                            disabled={isSubmitting}
                                            required
                                        />
                                        {formErrors.credits && (
                                            <span className="subjects-field-error" data-testid="error-credits">
                                                {formErrors.credits}
                                            </span>
                                        )}
                                    </div>

                                    <div className="subjects-form-group">
                                        <label htmlFor="create-select-status" className="subjects-form-label">
                                            Trạng thái
                                        </label>
                                        <select
                                            id="create-select-status"
                                            data-testid="create-select-status"
                                            className="subjects-form-select"
                                            value={formStatus}
                                            onChange={(e) => setFormStatus(e.target.value as SubjectStatus)}
                                            disabled={isSubmitting}
                                        >
                                            <option value="draft">Bản nháp</option>
                                            <option value="active">Đang hoạt động</option>
                                            <option value="archived">Đã lưu trữ</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="subjects-form-group">
                                    <label htmlFor="create-input-learning-outcomes" className="subjects-form-label">
                                        Mô tả chuẩn đầu ra
                                    </label>
                                    <textarea
                                        id="create-input-learning-outcomes"
                                        data-testid="create-input-learning-outcomes"
                                        className="subjects-form-textarea"
                                        rows={3}
                                        placeholder="Mô tả các chuẩn đầu ra cần đạt được của người học..."
                                        value={formLearningOutcomes}
                                        onChange={(e) => setFormLearningOutcomes(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className="subjects-form-group">
                                    <label htmlFor="create-input-description" className="subjects-form-label">
                                        Mô tả môn học
                                    </label>
                                    <textarea
                                        id="create-input-description"
                                        data-testid="create-input-description"
                                        className="subjects-form-textarea"
                                        rows={2}
                                        placeholder="Mô tả mục tiêu và nội dung tổng quan môn học..."
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            <footer className="subjects-modal-footer">
                                <button
                                    type="button"
                                    className="btn-modal-cancel"
                                    data-testid="btn-cancel-create"
                                    onClick={closeCreateModal}
                                    disabled={isSubmitting}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="btn-modal-submit"
                                    data-testid="btn-submit-create"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Đang lưu...' : 'Thêm môn học'}
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Subject Modal */}
            {editingSubject && (
                <div
                    className="subjects-modal-backdrop"
                    data-testid="modal-edit-subject"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edit-modal-title"
                >
                    <div className="subjects-modal-container">
                        <header className="subjects-modal-header">
                            <h2 id="edit-modal-title" className="subjects-modal-title">
                                Chỉnh sửa môn học
                            </h2>
                            <button
                                type="button"
                                className="subjects-modal-close-btn"
                                aria-label="Đóng hộp thoại"
                                onClick={closeEditModal}
                                disabled={isSubmitting}
                            >
                                ×
                            </button>
                        </header>

                        <form onSubmit={handleEditSubmit} noValidate>
                            <div className="subjects-modal-body">
                                {formErrors.general && (
                                    <div className="subjects-banner subjects-banner-error" data-testid="form-error-general" role="alert">
                                        <p className="subjects-banner-message">{formErrors.general}</p>
                                    </div>
                                )}

                                <div className="subjects-form-group">
                                    <label htmlFor="edit-input-code" className="subjects-form-label">
                                        Mã môn học <span className="subjects-form-required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="edit-input-code"
                                        data-testid="edit-input-code"
                                        className={`subjects-form-input ${formErrors.code ? 'has-error' : ''}`}
                                        value={formCode}
                                        maxLength={50}
                                        onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                                        disabled={isSubmitting}
                                        required
                                    />
                                    {formErrors.code && (
                                        <span className="subjects-field-error" data-testid="error-edit-code">
                                            {formErrors.code}
                                        </span>
                                    )}
                                </div>

                                <div className="subjects-form-group">
                                    <label htmlFor="edit-input-name" className="subjects-form-label">
                                        Tên môn học <span className="subjects-form-required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="edit-input-name"
                                        data-testid="edit-input-name"
                                        className={`subjects-form-input ${formErrors.name ? 'has-error' : ''}`}
                                        value={formName}
                                        maxLength={255}
                                        onChange={(e) => setFormName(e.target.value)}
                                        disabled={isSubmitting}
                                        required
                                    />
                                    {formErrors.name && (
                                        <span className="subjects-field-error" data-testid="error-edit-name">
                                            {formErrors.name}
                                        </span>
                                    )}
                                </div>

                                <div className="subjects-form-row">
                                    <div className="subjects-form-group">
                                        <label htmlFor="edit-input-sessions" className="subjects-form-label">
                                            Tổng số buổi <span className="subjects-form-required">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            id="edit-input-sessions"
                                            data-testid="edit-input-sessions"
                                            className={`subjects-form-input ${formErrors.total_sessions ? 'has-error' : ''}`}
                                            min={0}
                                            max={65535}
                                            value={formSessions}
                                            onChange={(e) => setFormSessions(e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                        {formErrors.total_sessions && (
                                            <span className="subjects-field-error" data-testid="error-edit-sessions">
                                                {formErrors.total_sessions}
                                            </span>
                                        )}
                                    </div>

                                    <div className="subjects-form-group">
                                        <label htmlFor="edit-input-weight" className="subjects-form-label">
                                            Trọng số <span className="subjects-form-required">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            id="edit-input-weight"
                                            data-testid="edit-input-weight"
                                            className={`subjects-form-input ${formErrors.weight ? 'has-error' : ''}`}
                                            placeholder="Ví dụ: 1.5 hoặc 30"
                                            value={formWeight}
                                            onChange={(e) => setFormWeight(e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                        {formErrors.weight && (
                                            <span className="subjects-field-error" data-testid="error-edit-weight">
                                                {formErrors.weight}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="subjects-form-row">
                                    <div className="subjects-form-group">
                                        <label htmlFor="edit-input-credits" className="subjects-form-label">
                                            Số tín chỉ <span className="subjects-form-required">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            id="edit-input-credits"
                                            data-testid="edit-input-credits"
                                            className={`subjects-form-input ${formErrors.credits ? 'has-error' : ''}`}
                                            min={1}
                                            max={30}
                                            value={formCredits}
                                            onChange={(e) => setFormCredits(e.target.value)}
                                            disabled={isSubmitting}
                                            required
                                        />
                                        {formErrors.credits && (
                                            <span className="subjects-field-error" data-testid="error-edit-credits">
                                                {formErrors.credits}
                                            </span>
                                        )}
                                    </div>

                                    <div className="subjects-form-group">
                                        <label htmlFor="edit-select-status" className="subjects-form-label">
                                            Trạng thái
                                        </label>
                                        <select
                                            id="edit-select-status"
                                            data-testid="edit-select-status"
                                            className="subjects-form-select"
                                            value={formStatus}
                                            onChange={(e) => setFormStatus(e.target.value as SubjectStatus)}
                                            disabled={isSubmitting}
                                        >
                                            <option value="draft">Bản nháp</option>
                                            <option value="active">Đang hoạt động</option>
                                            <option value="archived">Đã lưu trữ</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="subjects-form-group">
                                    <label htmlFor="edit-input-learning-outcomes" className="subjects-form-label">
                                        Mô tả chuẩn đầu ra
                                    </label>
                                    <textarea
                                        id="edit-input-learning-outcomes"
                                        data-testid="edit-input-learning-outcomes"
                                        className="subjects-form-textarea"
                                        rows={3}
                                        value={formLearningOutcomes}
                                        onChange={(e) => setFormLearningOutcomes(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className="subjects-form-group">
                                    <label htmlFor="edit-input-description" className="subjects-form-label">
                                        Mô tả môn học
                                    </label>
                                    <textarea
                                        id="edit-input-description"
                                        data-testid="edit-input-description"
                                        className="subjects-form-textarea"
                                        rows={2}
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            <footer className="subjects-modal-footer">
                                <button
                                    type="button"
                                    className="btn-modal-cancel"
                                    data-testid="btn-cancel-edit"
                                    onClick={closeEditModal}
                                    disabled={isSubmitting}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="btn-modal-submit"
                                    data-testid="btn-submit-edit"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingSubject && (
                <div
                    className="subjects-modal-backdrop"
                    data-testid="modal-delete-confirm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-modal-title"
                >
                    <div className="subjects-modal-container">
                        <header className="subjects-modal-header">
                            <h2 id="delete-modal-title" className="subjects-modal-title">
                                Xác nhận xóa môn học
                            </h2>
                            <button
                                type="button"
                                className="subjects-modal-close-btn"
                                aria-label="Đóng hộp thoại"
                                onClick={closeDeleteModal}
                                disabled={isDeleting}
                            >
                                ×
                            </button>
                        </header>

                        <div className="subjects-modal-body">
                            {deleteDialogError && (
                                <div className="subjects-banner subjects-banner-error" role="alert" data-testid="delete-dialog-error">
                                    <p className="subjects-banner-message">{deleteDialogError}</p>
                                </div>
                            )}

                            <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155', lineHeight: 1.6 }}>
                                Bạn có chắc muốn xóa môn học{' '}
                                <strong>
                                    {deletingSubject.code} - {deletingSubject.name}
                                </strong>
                                ?
                            </p>
                        </div>

                        <footer className="subjects-modal-footer">
                            <button
                                type="button"
                                className="btn-modal-cancel"
                                data-testid="btn-cancel-delete"
                                onClick={closeDeleteModal}
                                disabled={isDeleting}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="btn-modal-delete"
                                data-testid="btn-confirm-delete"
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Đang xóa...' : 'Xóa môn học'}
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {/* View Detail Modal */}
            {viewingSubject && (
                <div
                    className="subjects-modal-backdrop"
                    data-testid="modal-detail-subject"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="detail-modal-title"
                >
                    <div className="subjects-modal-container">
                        <header className="subjects-modal-header">
                            <h2 id="detail-modal-title" className="subjects-modal-title">
                                Chi tiết môn học
                            </h2>
                            <button
                                type="button"
                                className="subjects-modal-close-btn"
                                aria-label="Đóng hộp thoại"
                                onClick={closeDetailModal}
                                data-testid="btn-close-detail"
                            >
                                ×
                            </button>
                        </header>

                        <div className="subjects-modal-body">
                            <div className="subject-detail-list">
                                <div className="subject-detail-item">
                                    <span className="subject-detail-item-label">Mã môn học</span>
                                    <span className="subject-detail-item-value" data-testid="detail-subject-code">{viewingSubject.code}</span>
                                </div>
                                <div className="subject-detail-item">
                                    <span className="subject-detail-item-label">Tên môn học</span>
                                    <span className="subject-detail-item-value" data-testid="detail-subject-name">{viewingSubject.name}</span>
                                </div>
                                <div className="subject-detail-item">
                                    <span className="subject-detail-item-label">Số tín chỉ</span>
                                    <span className="subject-detail-item-value" data-testid="detail-subject-credits">{viewingSubject.credits} tín chỉ</span>
                                </div>
                                <div className="subject-detail-item">
                                    <span className="subject-detail-item-label">Tổng số buổi</span>
                                    <span className="subject-detail-item-value" data-testid="detail-subject-sessions">
                                        {viewingSubject.total_sessions !== null ? `${viewingSubject.total_sessions} buổi` : 'Chưa xác định'}
                                    </span>
                                </div>
                                <div className="subject-detail-item">
                                    <span className="subject-detail-item-label">Trọng số</span>
                                    <span className="subject-detail-item-value" data-testid="detail-subject-weight">
                                        {viewingSubject.weight !== null && viewingSubject.weight !== undefined ? viewingSubject.weight : 'Chưa xác định'}
                                    </span>
                                </div>
                                <div className="subject-detail-item">
                                    <span className="subject-detail-item-label">Mô tả chuẩn đầu ra</span>
                                    <span className="subject-detail-item-value" data-testid="detail-subject-learning-outcomes">
                                        {viewingSubject.learning_outcomes || 'Chưa có chuẩn đầu ra'}
                                    </span>
                                </div>
                                <div className="subject-detail-item">
                                    <span className="subject-detail-item-label">Trạng thái</span>
                                    <span className="subject-detail-item-value">
                                        <span className={`subject-status-badge status-${viewingSubject.status}`}>
                                            {getSubjectStatusLabel(viewingSubject.status)}
                                        </span>
                                    </span>
                                </div>
                                <div className="subject-detail-item">
                                    <span className="subject-detail-item-label">Mô tả</span>
                                    <span className="subject-detail-item-value" data-testid="detail-subject-desc">
                                        {viewingSubject.description || 'Không có mô tả'}
                                    </span>
                                </div>
                                <div className="subject-detail-item">
                                    <span className="subject-detail-item-label">Ngày tạo</span>
                                    <span className="subject-detail-item-value">
                                        {new Date(viewingSubject.created_at).toLocaleString('vi-VN')}
                                    </span>
                                </div>
                                <div className="subject-detail-item">
                                    <span className="subject-detail-item-label">Cập nhật gần nhất</span>
                                    <span className="subject-detail-item-value">
                                        {new Date(viewingSubject.updated_at).toLocaleString('vi-VN')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <footer className="subjects-modal-footer">
                            <button
                                type="button"
                                className="btn-modal-cancel"
                                onClick={closeDetailModal}
                            >
                                Đóng
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </main>
    )
}
