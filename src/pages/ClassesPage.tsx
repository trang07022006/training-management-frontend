import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
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
    type RequestFunction,
    ApiError,
} from '../api/classApi'
import { getTrainingPrograms, type TrainingProgram } from '../api/trainingProgramApi'
import { getErrorMessage } from '../utils/errorMessages'
import './ClassesPage.css'

export interface ClassesPageProps {
    initialClasses?: TrainingClass[]
    initialTotal?: number
    initialPrograms?: TrainingProgram[]
    customRequest?: RequestFunction
    canManageOverride?: boolean
}

export function ClassesPage({
    initialClasses,
    initialTotal,
    initialPrograms,
    customRequest,
    canManageOverride,
}: ClassesPageProps) {
    const { request: sessionRequest, role, roles, permissions } = useSession()
    const requestFn: RequestFunction = customRequest ?? sessionRequest
    const requestFnRef = useRef(requestFn)
    useEffect(() => {
        requestFnRef.current = requestFn
    }, [requestFn])

    // Phân quyền
    const effectiveRoles = roles && roles.length > 0 ? roles : (role ? [role] : [])
    const effectivePerms =
        permissions && permissions.length > 0 ? permissions : getRolePermissions(effectiveRoles)
    const canManage =
        canManageOverride !== undefined
            ? canManageOverride
            : (effectivePerms.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE) || effectiveRoles.includes('admin') || effectiveRoles.includes('training_manager'))

    // State danh sách lớp học
    const [classes, setClasses] = useState<TrainingClass[]>(initialClasses ?? [])
    const [total, setTotal] = useState<number>(initialTotal ?? initialClasses?.length ?? 0)
    const [loading, setLoading] = useState(initialClasses === undefined)
    const [searchKeyword, setSearchKeyword] = useState('')
    const [activeSearch, setActiveSearch] = useState('')

    // State danh sách chương trình đào tạo để chọn khi mở lớp
    const [programs, setPrograms] = useState<TrainingProgram[]>(initialPrograms ?? [])

    // Modal tạo lớp học mới
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [createForm, setCreateForm] = useState({
        class_code: '',
        program_id: '',
        expected_start_date: '',
        max_capacity: 30,
        learning_mode: 'offline',
    })

    // Modal xem chi tiết & môn học sao chép
    const [selectedClass, setSelectedClass] = useState<TrainingClass | null>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

    // Alert feedback
    const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Tải danh sách lớp học
    const loadClasses = useCallback(
        async (search?: string) => {
            setLoading(true)
            setAlertMessage(null)
            try {
                const res = await listClasses(requestFnRef.current, {
                    search: search !== undefined ? search : activeSearch,
                    page: 1,
                    page_size: 50,
                })
                setClasses(res.items)
                setTotal(res.total)
            } catch (err: unknown) {
                const msg = err instanceof ApiError ? err.message : getErrorMessage(err, 'Lỗi khi tải danh sách lớp học.')
                setAlertMessage({ type: 'error', text: msg })
            } finally {
                setLoading(false)
            }
        },
        [activeSearch],
    )

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

    // Xử lý tìm kiếm
    const handleSearchSubmit = (e: FormEvent) => {
        e.preventDefault()
        setActiveSearch(searchKeyword.trim())
        loadClasses(searchKeyword.trim())
    }

    // Mở modal tạo lớp
    const handleOpenCreateModal = () => {
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
        setAlertMessage(null)

        try {
            const created = await createClass(requestFnRef.current, {
                class_code: createForm.class_code.trim(),
                program_id: createForm.program_id.trim(),
                expected_start_date: createForm.expected_start_date || null,
                max_capacity: Number(createForm.max_capacity),
                learning_mode: createForm.learning_mode,
            })

            // Thêm vào danh sách hiện tại
            setClasses((prev) => [created, ...prev])
            setTotal((prev) => prev + 1)
            setAlertMessage({
                type: 'success',
                text: `Mở lớp học '${created.class_code}' thành công. Đã sao chép ${created.copied_subjects_count ?? 0} môn học từ chương trình.`,
            })
            setIsCreateModalOpen(false)
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.message : getErrorMessage(err, 'Lỗi khi mở lớp học mới.')
            setAlertMessage({ type: 'error', text: msg })
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

    // Mở modal xem chi tiết lớp học & môn học sao chép (217-04)
    const handleOpenDetailModal = async (cls: TrainingClass) => {
        setSelectedClass(cls)
        setIsDetailModalOpen(true)
        try {
            const detail = await getClassDetail(requestFnRef.current, cls.id)
            setSelectedClass(detail)
        } catch {
            // Giữ lại dữ liệu hiện tại
        }
    }

    return (
        <div className="classes-container" data-testid="classes-page">
            {/* Header */}
            <div className="classes-header">
                <div className="classes-header-left">
                    <h1 data-testid="page-title">Quản lý Lớp học</h1>
                    <p>Mở lớp mới từ chương trình đào tạo, quản lý vòng đời và môn học của lớp</p>
                </div>
                <div className="classes-header-actions">
                    <div className="stat-pill" data-testid="stat-total-classes">
                        Tổng số lớp: <strong>{total}</strong>
                    </div>
                    {canManage && (
                        <button
                            type="button"
                            className="btn-open-class"
                            onClick={handleOpenCreateModal}
                            data-testid="create-class-btn"
                        >
                            + Mở lớp mới
                        </button>
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

            {/* Tìm kiếm */}
            <form className="students-search-bar" onSubmit={handleSearchSubmit} data-testid="search-form">
                <div className="students-search-input-wrapper">
                    <span className="search-icon" aria-hidden="true">🔍</span>
                    <input
                        type="text"
                        className="students-search-input"
                        placeholder="Tìm kiếm theo mã lớp, tên chương trình..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        data-testid="class-search-input"
                    />
                </div>
                <button type="submit" className="btn-search" data-testid="class-search-btn">
                    Tìm kiếm
                </button>
            </form>

            {/* Bảng danh sách lớp học */}
            <div className="classes-table-card">
                {loading ? (
                    <div className="empty-state" data-testid="loading-state">
                        Đang tải danh sách lớp học...
                    </div>
                ) : classes.length === 0 ? (
                    <div className="empty-state" data-testid="empty-state">
                        Chưa có lớp học nào trong hệ thống.
                    </div>
                ) : (
                    <table className="classes-table" data-testid="classes-table">
                        <thead>
                            <tr>
                                <th>Mã lớp</th>
                                <th>Chương trình đào tạo</th>
                                <th>Khai giảng dự kiến</th>
                                <th>Sĩ số</th>
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
                                        {cls.expected_start_date || '-'}
                                    </td>
                                    <td data-testid={`class-capacity-${cls.id}`}>
                                        {cls.enrolled_count ?? 0} / {cls.max_capacity}
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
                                                <option value="cancelled">Huỷ</option>
                                            </select>
                                        ) : (
                                            <span className={`status-badge ${cls.status}`} data-testid={`status-badge-${cls.id}`}>
                                                {cls.status_label || CLASS_STATUS_LABELS[cls.status as ClassStatus] || cls.status}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="btn-action-view"
                                            onClick={() => handleOpenDetailModal(cls)}
                                            data-testid={`view-class-${cls.id}`}
                                        >
                                            Môn học lớp
                                        </button>
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
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label htmlFor="class-code">Mã lớp * (Duy nhất)</label>
                                        <input
                                            id="class-code"
                                            type="text"
                                            className="form-input"
                                            placeholder="Ví dụ: CNTT-K21A"
                                            value={createForm.class_code}
                                            onChange={(e) => setCreateForm({ ...createForm, class_code: e.target.value })}
                                            required
                                            data-testid="class-code-input"
                                        />
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
        </div>
    )
}
