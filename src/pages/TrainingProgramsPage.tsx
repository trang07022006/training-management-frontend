import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getRolePermissions, SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import {
    getTrainingPrograms,
    createTrainingProgram,
    updateTrainingProgram,
    deleteTrainingProgram,
    getProgramStatusLabel,
    type TrainingProgram,
    type CreateTrainingProgramInput,
    type UpdateTrainingProgramInput,
    type TrainingProgramStatus,
    type RequestFunction,
    ApiError,
} from '../api/trainingProgramApi'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { Breadcrumb } from '../components/Breadcrumb'
import { ToastPortal } from '../components/ToastPortal'
import './TrainingProgramsPage.css'

export interface TrainingProgramsPageProps {
    initialPrograms?: TrainingProgram[]
    initialTotal?: number
    customRequest?: (path: string, init?: RequestInit) => Promise<Response>
    pageSize?: number
    canManageOverride?: boolean
}

interface FormErrors {
    code?: string
    name?: string
    duration_semesters?: string
    standard_tuition_fee?: string
    general?: string
}

export function TrainingProgramsPage({
    initialPrograms,
    initialTotal,
    customRequest,
    pageSize: initialPageSize = 10,
    canManageOverride,
}: TrainingProgramsPageProps) {
    const navigate = useNavigate()
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
    const [programs, setPrograms] = useState<TrainingProgram[]>(initialPrograms ?? [])
    const [total, setTotal] = useState<number>(initialTotal ?? initialPrograms?.length ?? 0)
    const [isLoading, setIsLoading] = useState<boolean>(initialPrograms === undefined)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Filter, Search, Pagination State
    const [page, setPage] = useState<number>(1)
    const pageSize = initialPageSize
    const [search, setSearch] = useState<string>('')
    const [statusFilter, setStatusFilter] = useState<string>('')

    // Modals State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false)
    const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null)
    const [deletingProgram, setDeletingProgram] = useState<TrainingProgram | null>(null)

    // Form inputs state (Create / Edit)
    const [formCode, setFormCode] = useState<string>('')
    const [formName, setFormName] = useState<string>('')
    const [formDescription, setFormDescription] = useState<string>('')
    const [formDuration, setFormDuration] = useState<string>('')
    const [formTuitionFee, setFormTuitionFee] = useState<string>('')
    const [formStatus, setFormStatus] = useState<TrainingProgramStatus>('draft')
    const [formErrors, setFormErrors] = useState<FormErrors>({})
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [deleteDialogError, setDeleteDialogError] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState<boolean>(false)

    // Search debounce ref
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Fetch Programs Function
    const loadPrograms = useCallback(
        async (targetPage = page, targetSearch = search, targetStatus = statusFilter) => {
            setIsLoading(true)
            setErrorMessage(null)
            try {
                const res = await getTrainingPrograms(requestFn, {
                    page: targetPage,
                    page_size: pageSize,
                    search: targetSearch.trim() || undefined,
                    status: targetStatus || undefined,
                })
                setPrograms(res.items ?? [])
                setTotal(res.total ?? 0)
            } catch (err: unknown) {
                if (err instanceof ApiError) {
                    setErrorMessage(err.message)
                } else {
                    setErrorMessage(getErrorMessage(err, 'Lỗi khi tải danh sách chương trình đào tạo.'))
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
        if (initialPrograms === undefined) {
            getTrainingPrograms(requestFn, {
                page: 1,
                page_size: pageSize,
                search: undefined,
                status: undefined,
            })
                .then((res) => {
                    if (isMounted) {
                        setPrograms(res.items ?? [])
                        setTotal(res.total ?? 0)
                        setIsLoading(false)
                    }
                })
                .catch((err: unknown) => {
                    if (isMounted) {
                        setErrorMessage(
                            err instanceof ApiError
                                ? err.message
                                : getErrorMessage(err, 'Lỗi khi tải danh sách chương trình đào tạo.'),
                        )
                        setIsLoading(false)
                    }
                })
        }
        return () => {
            isMounted = false
        }
    }, [initialPrograms, requestFn, pageSize])

    // Search with debounce
    const handleSearchChange = (value: string) => {
        setSearch(value)
        setPage(1)
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current)
        }
        searchDebounceRef.current = setTimeout(() => {
            void loadPrograms(1, value, statusFilter)
        }, 300)
    }

    const handleStatusFilterChange = (value: string) => {
        setStatusFilter(value)
        setPage(1)
        void loadPrograms(1, search, value)
    }

    const handlePageChange = (newPage: number) => {
        setPage(newPage)
        void loadPrograms(newPage, search, statusFilter)
    }

    // Modal / Navigation Handlers
    const openCreateModal = () => {
        if (initialPrograms === undefined) {
            navigate('/training-programs/new')
            return
        }
        setFormCode('')
        setFormName('')
        setFormDescription('')
        setFormDuration('')
        setFormTuitionFee('')
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

    const openEditModal = (prog: TrainingProgram) => {
        if (initialPrograms === undefined) {
            navigate(`/training-programs/${prog.id}/edit`)
            return
        }
        setEditingProgram(prog)
        setFormCode(prog.code)
        setFormName(prog.name)
        setFormDescription(prog.description ?? '')
        setFormDuration(prog.duration_semesters !== null ? String(prog.duration_semesters) : '')
        setFormTuitionFee(prog.standard_tuition_fee !== null && prog.standard_tuition_fee !== undefined ? String(prog.standard_tuition_fee) : '')
        setFormStatus(prog.status)
        setFormErrors({})
        setIsSubmitting(false)
    }

    const closeEditModal = () => {
        if (!isSubmitting) {
            setEditingProgram(null)
            setFormErrors({})
        }
    }

    const openDeleteModal = (prog: TrainingProgram) => {
        setDeletingProgram(prog)
        setDeleteDialogError(null)
        setIsDeleting(false)
    }

    const closeDeleteModal = () => {
        if (!isDeleting) {
            setDeletingProgram(null)
            setDeleteDialogError(null)
        }
    }

    // Form Validation Helper
    const validateForm = (): boolean => {
        const errors: FormErrors = {}
        const trimmedCode = formCode.trim()
        const trimmedName = formName.trim()

        if (!trimmedCode) {
            errors.code = 'Mã chương trình là bắt buộc.'
        } else if (trimmedCode.length > 50) {
            errors.code = 'Mã chương trình không được vượt quá 50 ký tự.'
        }

        if (!trimmedName) {
            errors.name = 'Tên chương trình là bắt buộc.'
        } else if (trimmedName.length > 255) {
            errors.name = 'Tên chương trình không được vượt quá 255 ký tự.'
        }

        if (formDuration.trim() !== '') {
            const parsedDuration = Number(formDuration.trim())
            if (!Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 65535) {
                errors.duration_semesters = 'Thời lượng học kỳ phải là số nguyên dương từ 1 đến 65535.'
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

        const payload: CreateTrainingProgramInput = {
            code: formCode.trim(),
            name: formName.trim(),
            description: formDescription.trim() ? formDescription.trim() : null,
            duration_semesters: formDuration.trim() ? Number(formDuration.trim()) : null,
            standard_tuition_fee: formTuitionFee.trim() ? parseInt(formTuitionFee.replace(/\D/g, ''), 10) : null,
            status: formStatus,
        }

        try {
            await createTrainingProgram(requestFn, payload)
            setIsCreateModalOpen(false)
            setSuccessMessage(getSuccessMessage('CREATE_PROGRAM_SUCCESS', 'Tạo chương trình đào tạo thành công.'))
            void loadPrograms(1, search, statusFilter)
            setPage(1)
        } catch (err: unknown) {
            const apiCode = (err && typeof err === 'object' && 'code' in err) ? String((err as { code: unknown }).code) : undefined
            if (apiCode === 'DUPLICATE_CODE') {
                setFormErrors({ code: 'Mã chương trình đào tạo đã tồn tại.' })
            } else if (err instanceof ApiError) {
                setFormErrors({ general: err.message })
            } else {
                setFormErrors({ general: getErrorMessage(err, 'Lỗi khi tạo chương trình đào tạo.') })
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    // Submit Edit
    const handleEditSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!editingProgram || !validateForm() || isSubmitting) return

        setIsSubmitting(true)
        setFormErrors({})

        const payload: UpdateTrainingProgramInput = {
            code: formCode.trim(),
            name: formName.trim(),
            description: formDescription.trim() ? formDescription.trim() : null,
            duration_semesters: formDuration.trim() ? Number(formDuration.trim()) : null,
            standard_tuition_fee: formTuitionFee.trim() ? parseInt(formTuitionFee.replace(/\D/g, ''), 10) : null,
            status: formStatus,
        }

        try {
            await updateTrainingProgram(requestFn, editingProgram.id, payload)
            setEditingProgram(null)
            setSuccessMessage(getSuccessMessage('UPDATE_PROGRAM_SUCCESS', 'Cập nhật chương trình đào tạo thành công.'))
            void loadPrograms(page, search, statusFilter)
        } catch (err: unknown) {
            const apiCode = (err && typeof err === 'object' && 'code' in err) ? String((err as { code: unknown }).code) : undefined
            if (apiCode === 'DUPLICATE_CODE') {
                setFormErrors({ code: 'Mã chương trình đào tạo đã tồn tại.' })
            } else if (err instanceof ApiError) {
                setFormErrors({ general: err.message })
            } else {
                setFormErrors({ general: getErrorMessage(err, 'Lỗi khi cập nhật chương trình đào tạo.') })
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    // Confirm Delete
    const handleDeleteConfirm = async () => {
        if (!deletingProgram || isDeleting) return

        setIsDeleting(true)
        setDeleteDialogError(null)

        try {
            await deleteTrainingProgram(requestFn, deletingProgram.id)
            setDeletingProgram(null)
            setSuccessMessage(getSuccessMessage('DELETE_PROGRAM_SUCCESS', 'Xóa chương trình đào tạo thành công.'))
            void loadPrograms(page, search, statusFilter)
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setDeleteDialogError(err.message)
            } else {
                setDeleteDialogError(getErrorMessage(err, 'Lỗi khi xóa chương trình đào tạo.'))
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
                if (editingProgram && !isSubmitting) closeEditModal()
                if (deletingProgram && !isDeleting) closeDeleteModal()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isCreateModalOpen, editingProgram, deletingProgram, isSubmitting, isDeleting]) // eslint-disable-line react-hooks/exhaustive-deps

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(total, page * pageSize)

    return (
        <main className="training-programs-page" data-testid="training-programs-page">
            <Breadcrumb items={[{ label: 'Chương trình đào tạo' }]} />
            {/* Header */}
            <header className="programs-header">
                <div className="programs-header-left">
                    <span className="programs-badge">Phân hệ Đào tạo</span>
                    <h1 className="programs-title" data-testid="programs-page-title">
                        Quản lý chương trình đào tạo{' '}
                        {total > 0 && <span className="programs-total-badge">({total})</span>}
                    </h1>
                    <p className="programs-description">
                        Danh mục và quản trị các chương trình đào tạo chính quy trong hệ thống.
                    </p>
                </div>
                {canManage && (
                    <div className="programs-header-actions">
                        <button
                            type="button"
                            className="btn-create-program"
                            data-testid="btn-create-program"
                            onClick={openCreateModal}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            <span>Thêm chương trình</span>
                        </button>
                    </div>
                )}
            </header>

            {/* Toast Notifications */}
            {(successMessage || errorMessage) && (
                <ToastPortal
                    success={successMessage}
                    error={errorMessage}
                    onCloseSuccess={() => setSuccessMessage(null)}
                    onCloseError={() => setErrorMessage(null)}
                    successTestId="banner-success"
                    errorTestId="banner-error"
                />
            )}

            {/* Search and Status Filter Bar */}
            <div className="programs-filter-bar" data-testid="programs-filter-bar">
                <div className="programs-search-group">
                    <span className="programs-search-icon" aria-hidden="true">
                        🔍
                    </span>
                    <input
                        type="search"
                        id="programs-search-input"
                        className="programs-search-input"
                        data-testid="programs-search-input"
                        placeholder="Tìm kiếm theo mã hoặc tên..."
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        aria-label="Tìm kiếm chương trình đào tạo"
                    />
                </div>

                <div className="programs-filter-group">
                    <label htmlFor="programs-status-select" className="programs-filter-label">
                        Trạng thái:
                    </label>
                    <select
                        id="programs-status-select"
                        className="programs-filter-select"
                        data-testid="programs-status-select"
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
                <div className="programs-state-card" data-testid="programs-loading-state">
                    <div className="programs-loading-spinner" aria-hidden="true" />
                    <p className="programs-loading-text">Đang tải danh sách chương trình đào tạo...</p>
                </div>
            ) : programs.length === 0 ? (
                <div className="programs-state-card" data-testid="programs-empty-state">
                    <h3 className="programs-empty-title">Không tìm thấy chương trình đào tạo nào</h3>
                    <p className="programs-empty-desc">
                        {search || statusFilter
                            ? 'Không có kết quả nào phù hợp với bộ lọc hiện tại. Vui lòng thử tìm kiếm khác.'
                            : 'Hệ thống chưa có chương trình đào tạo nào.'}
                    </p>
                </div>
            ) : (
                <div className="programs-table-container" data-testid="programs-table-container">
                    <div className="programs-table-scroll-wrapper" tabIndex={0} aria-label="Bảng danh sách chương trình đào tạo">
                        <table className="programs-table" data-testid="programs-table">
                            <thead>
                                <tr>
                                    <th scope="col">Mã chương trình</th>
                                    <th scope="col">Tên chương trình</th>
                                    <th scope="col">Thời lượng</th>
                                    <th scope="col">Học phí chuẩn</th>
                                    <th scope="col">Trạng thái</th>
                                    <th scope="col">Cập nhật gần nhất</th>
                                    {canManage && <th scope="col" style={{ textAlign: 'right' }}>Thao tác</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {programs.map((prog) => (
                                    <tr key={prog.id} data-testid={`program-row-${prog.id}`}>
                                        <td className="program-cell-code" data-testid={`program-code-${prog.id}`}>
                                            {prog.code}
                                        </td>
                                        <td className="program-cell-name" data-testid={`program-name-${prog.id}`}>
                                            <div>{prog.name}</div>
                                            {prog.description && (
                                                <div className="program-cell-desc" title={prog.description}>
                                                    {prog.description}
                                                </div>
                                            )}
                                        </td>
                                        <td className="program-cell-duration">
                                            {prog.duration_semesters !== null && prog.duration_semesters !== undefined
                                                ? `${prog.duration_semesters} học kỳ`
                                                : '—'}
                                        </td>
                                        <td className="program-cell-tuition">
                                            {prog.standard_tuition_fee !== null && prog.standard_tuition_fee !== undefined
                                                ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(prog.standard_tuition_fee)
                                                : '—'}
                                        </td>
                                        <td>
                                            <span
                                                className={`program-status-badge status-${prog.status}`}
                                                data-testid={`program-status-${prog.id}`}
                                            >
                                                {getProgramStatusLabel(prog.status)}
                                            </span>
                                        </td>
                                        <td className="program-cell-updated">
                                            {prog.updated_at
                                                ? new Date(prog.updated_at).toLocaleDateString('vi-VN', {
                                                      year: 'numeric',
                                                      month: '2-digit',
                                                      day: '2-digit',
                                                  })
                                                : '—'}
                                        </td>
                                        {canManage && (
                                            <td>
                                                <div className="program-actions-group">
                                                    <Link
                                                        to={`/training-programs/${prog.id}`}
                                                        className="btn-action-view"
                                                        data-testid={`btn-view-${prog.id}`}
                                                        aria-label={`Xem chi tiết chương trình ${prog.code}`}
                                                    >
                                                        Xem
                                                    </Link>
                                                    <Link
                                                        to={`/training-programs/${prog.id}/structure`}
                                                        className="btn-action-structure"
                                                        data-testid={`btn-structure-${prog.id}`}
                                                        aria-label={`Quản lý cấu trúc chương trình ${prog.code}`}
                                                    >
                                                        Cấu trúc
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        className="btn-action-edit"
                                                        data-testid={`btn-edit-${prog.id}`}
                                                        aria-label={`Sửa chương trình ${prog.code}`}
                                                        onClick={() => openEditModal(prog)}
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-action-delete"
                                                        data-testid={`btn-delete-${prog.id}`}
                                                        aria-label={`Xóa chương trình ${prog.code}`}
                                                        onClick={() => openDeleteModal(prog)}
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

                    {/* Pagination */}
                    {total > 0 && (
                        <div className="programs-pagination" data-testid="programs-pagination">
                            <div className="programs-pagination-info">
                                Hiển thị <strong>{from}</strong> - <strong>{to}</strong> trên tổng số{' '}
                                <strong>{total}</strong> chương trình
                            </div>
                            <div className="programs-pagination-controls">
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

            {/* Create Program Modal */}
            {isCreateModalOpen && (
                <div
                    className="programs-modal-backdrop"
                    data-testid="modal-create-program"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="create-modal-title"
                >
                    <div className="programs-modal-container">
                        <header className="programs-modal-header">
                            <h2 id="create-modal-title" className="programs-modal-title">
                                Thêm chương trình đào tạo
                            </h2>
                            <button
                                type="button"
                                className="programs-modal-close-btn"
                                aria-label="Đóng hộp thoại"
                                onClick={closeCreateModal}
                                disabled={isSubmitting}
                            >
                                ×
                            </button>
                        </header>

                        <form onSubmit={handleCreateSubmit} noValidate>
                            <div className="programs-modal-body">
                                {formErrors.general && (
                                    <div className="programs-banner programs-banner-error" data-testid="form-error-general" role="alert">
                                        <p className="programs-banner-message">{formErrors.general}</p>
                                    </div>
                                )}

                                <div className="programs-form-group">
                                    <label htmlFor="create-input-code" className="programs-form-label">
                                        Mã chương trình <span className="programs-form-required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="create-input-code"
                                        data-testid="create-input-code"
                                        className={`programs-form-input ${formErrors.code ? 'has-error' : ''}`}
                                        placeholder="Ví dụ: CNTT-K21"
                                        value={formCode}
                                        maxLength={50}
                                        onChange={(e) => setFormCode(e.target.value)}
                                        disabled={isSubmitting}
                                        required
                                    />
                                    {formErrors.code && (
                                        <span className="programs-field-error" data-testid="error-code">
                                            {formErrors.code}
                                        </span>
                                    )}
                                </div>

                                <div className="programs-form-group">
                                    <label htmlFor="create-input-name" className="programs-form-label">
                                        Tên chương trình <span className="programs-form-required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="create-input-name"
                                        data-testid="create-input-name"
                                        className={`programs-form-input ${formErrors.name ? 'has-error' : ''}`}
                                        placeholder="Ví dụ: Công nghệ thông tin K21"
                                        value={formName}
                                        maxLength={255}
                                        onChange={(e) => setFormName(e.target.value)}
                                        disabled={isSubmitting}
                                        required
                                    />
                                    {formErrors.name && (
                                        <span className="programs-field-error" data-testid="error-name">
                                            {formErrors.name}
                                        </span>
                                    )}
                                </div>

                                <div className="programs-form-group">
                                    <label htmlFor="create-input-description" className="programs-form-label">
                                        Mô tả
                                    </label>
                                    <textarea
                                        id="create-input-description"
                                        data-testid="create-input-description"
                                        className="programs-form-textarea"
                                        rows={3}
                                        placeholder="Mô tả mục tiêu và nội dung chương trình đào tạo..."
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className="programs-form-group">
                                    <label htmlFor="create-input-duration" className="programs-form-label">
                                        Số học kỳ
                                    </label>
                                    <input
                                        type="number"
                                        id="create-input-duration"
                                        data-testid="create-input-duration"
                                        className={`programs-form-input ${formErrors.duration_semesters ? 'has-error' : ''}`}
                                        placeholder="Ví dụ: 8"
                                        min={1}
                                        max={65535}
                                        value={formDuration}
                                        onChange={(e) => setFormDuration(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    {formErrors.duration_semesters && (
                                        <span className="programs-field-error" data-testid="error-duration">
                                            {formErrors.duration_semesters}
                                        </span>
                                    )}
                                </div>

                                <div className="programs-form-group">
                                    <label htmlFor="create-input-tuition" className="programs-form-label">
                                        Học phí chuẩn (VNĐ)
                                    </label>
                                    <input
                                        type="number"
                                        id="create-input-tuition"
                                        data-testid="create-input-tuition"
                                        className="programs-form-input"
                                        placeholder="Ví dụ: 15000000"
                                        min={0}
                                        value={formTuitionFee}
                                        onChange={(e) => setFormTuitionFee(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className="programs-form-group">
                                    <label htmlFor="create-select-status" className="programs-form-label">
                                        Trạng thái
                                    </label>
                                    <select
                                        id="create-select-status"
                                        data-testid="create-select-status"
                                        className="programs-form-select"
                                        value={formStatus}
                                        onChange={(e) => setFormStatus(e.target.value as TrainingProgramStatus)}
                                        disabled={isSubmitting}
                                    >
                                        <option value="draft">Bản nháp</option>
                                        <option value="active">Đang hoạt động</option>
                                        <option value="archived">Đã lưu trữ</option>
                                    </select>
                                </div>
                            </div>

                            <footer className="programs-modal-footer">
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
                                    {isSubmitting ? 'Đang lưu...' : 'Thêm chương trình'}
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Program Modal */}
            {editingProgram && (
                <div
                    className="programs-modal-backdrop"
                    data-testid="modal-edit-program"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edit-modal-title"
                >
                    <div className="programs-modal-container">
                        <header className="programs-modal-header">
                            <h2 id="edit-modal-title" className="programs-modal-title">
                                Chỉnh sửa chương trình đào tạo
                            </h2>
                            <button
                                type="button"
                                className="programs-modal-close-btn"
                                aria-label="Đóng hộp thoại"
                                onClick={closeEditModal}
                                disabled={isSubmitting}
                            >
                                ×
                            </button>
                        </header>

                        <form onSubmit={handleEditSubmit} noValidate>
                            <div className="programs-modal-body">
                                {formErrors.general && (
                                    <div className="programs-banner programs-banner-error" data-testid="form-error-general" role="alert">
                                        <p className="programs-banner-message">{formErrors.general}</p>
                                    </div>
                                )}

                                <div className="programs-form-group">
                                    <label htmlFor="edit-input-code" className="programs-form-label">
                                        Mã chương trình <span className="programs-form-required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="edit-input-code"
                                        data-testid="edit-input-code"
                                        className={`programs-form-input ${formErrors.code ? 'has-error' : ''}`}
                                        value={formCode}
                                        maxLength={50}
                                        onChange={(e) => setFormCode(e.target.value)}
                                        disabled={isSubmitting}
                                        required
                                    />
                                    {formErrors.code && (
                                        <span className="programs-field-error" data-testid="error-edit-code">
                                            {formErrors.code}
                                        </span>
                                    )}
                                </div>

                                <div className="programs-form-group">
                                    <label htmlFor="edit-input-name" className="programs-form-label">
                                        Tên chương trình <span className="programs-form-required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="edit-input-name"
                                        data-testid="edit-input-name"
                                        className={`programs-form-input ${formErrors.name ? 'has-error' : ''}`}
                                        value={formName}
                                        maxLength={255}
                                        onChange={(e) => setFormName(e.target.value)}
                                        disabled={isSubmitting}
                                        required
                                    />
                                    {formErrors.name && (
                                        <span className="programs-field-error" data-testid="error-edit-name">
                                            {formErrors.name}
                                        </span>
                                    )}
                                </div>

                                <div className="programs-form-group">
                                    <label htmlFor="edit-input-description" className="programs-form-label">
                                        Mô tả
                                    </label>
                                    <textarea
                                        id="edit-input-description"
                                        data-testid="edit-input-description"
                                        className="programs-form-textarea"
                                        rows={3}
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className="programs-form-group">
                                    <label htmlFor="edit-input-duration" className="programs-form-label">
                                        Số học kỳ
                                    </label>
                                    <input
                                        type="number"
                                        id="edit-input-duration"
                                        data-testid="edit-input-duration"
                                        className={`programs-form-input ${formErrors.duration_semesters ? 'has-error' : ''}`}
                                        min={1}
                                        max={65535}
                                        value={formDuration}
                                        onChange={(e) => setFormDuration(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    {formErrors.duration_semesters && (
                                        <span className="programs-field-error" data-testid="error-edit-duration">
                                            {formErrors.duration_semesters}
                                        </span>
                                    )}
                                </div>

                                <div className="programs-form-group">
                                    <label htmlFor="edit-input-tuition" className="programs-form-label">
                                        Học phí chuẩn (VNĐ)
                                    </label>
                                    <input
                                        type="number"
                                        id="edit-input-tuition"
                                        data-testid="edit-input-tuition"
                                        className="programs-form-input"
                                        placeholder="Ví dụ: 15000000"
                                        min={0}
                                        value={formTuitionFee}
                                        onChange={(e) => setFormTuitionFee(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className="programs-form-group">
                                    <label htmlFor="edit-select-status" className="programs-form-label">
                                        Trạng thái
                                    </label>
                                    <select
                                        id="edit-select-status"
                                        data-testid="edit-select-status"
                                        className="programs-form-select"
                                        value={formStatus}
                                        onChange={(e) => setFormStatus(e.target.value as TrainingProgramStatus)}
                                        disabled={isSubmitting}
                                    >
                                        <option value="draft">Bản nháp</option>
                                        <option value="active">Đang hoạt động</option>
                                        <option value="archived">Đã lưu trữ</option>
                                    </select>
                                </div>
                            </div>

                            <footer className="programs-modal-footer">
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
            {deletingProgram && (
                <div
                    className="programs-modal-backdrop"
                    data-testid="modal-delete-confirm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-modal-title"
                >
                    <div className="programs-modal-container">
                        <header className="programs-modal-header">
                            <h2 id="delete-modal-title" className="programs-modal-title">
                                Xác nhận xóa chương trình đào tạo
                            </h2>
                            <button
                                type="button"
                                className="programs-modal-close-btn"
                                aria-label="Đóng hộp thoại"
                                onClick={closeDeleteModal}
                                disabled={isDeleting}
                            >
                                ×
                            </button>
                        </header>

                        <div className="programs-modal-body">
                            {deleteDialogError && (
                                <div className="programs-banner programs-banner-error" role="alert" data-testid="delete-dialog-error">
                                    <p className="programs-banner-message">{deleteDialogError}</p>
                                </div>
                            )}

                            <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155', lineHeight: 1.6 }}>
                                Bạn có chắc muốn xóa chương trình{' '}
                                <strong>
                                    {deletingProgram.code} - {deletingProgram.name}
                                </strong>
                                ?
                            </p>
                        </div>

                        <footer className="programs-modal-footer">
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
                                {isDeleting ? 'Đang xóa...' : 'Xóa chương trình'}
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </main>
    )
}
