import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useSession } from '../auth/SessionProvider'
import { getRolePermissions, SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import {
    listStudents,
    getStudentDetail,
    updateStudentProfile,
    type StudentDetail,
    type RequestFunction,
    ApiError,
} from '../api/studentApi'
import { getErrorMessage } from '../utils/errorMessages'
import './StudentsPage.css'

export interface StudentsPageProps {
    initialStudents?: StudentDetail[]
    initialTotal?: number
    customRequest?: RequestFunction
    canManageOverride?: boolean
}

export function StudentsPage({
    initialStudents,
    initialTotal,
    customRequest,
    canManageOverride,
}: StudentsPageProps) {
    const { request: sessionRequest, role, roles, permissions } = useSession()
    const requestFn: RequestFunction = customRequest ?? sessionRequest
    const requestFnRef = useRef(requestFn)
    useEffect(() => {
        requestFnRef.current = requestFn
    }, [requestFn])

    // Phân quyền RBAC
    const effectiveRoles = roles && roles.length > 0 ? roles : (role ? [role] : [])
    const effectivePerms =
        permissions && permissions.length > 0 ? permissions : getRolePermissions(effectiveRoles)
    const canManage =
        canManageOverride !== undefined
            ? canManageOverride
            : (effectivePerms.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE) || effectiveRoles.includes('admin') || effectiveRoles.includes('training_manager'))

    // State danh sách
    const [students, setStudents] = useState<StudentDetail[]>(initialStudents ?? [])
    const [total, setTotal] = useState<number>(initialTotal ?? initialStudents?.length ?? 0)
    const [loading, setLoading] = useState(initialStudents === undefined)
    const [searchKeyword, setSearchKeyword] = useState('')
    const [activeSearch, setActiveSearch] = useState('')

    // State chi tiết / modal
    const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Form edit trong modal
    const [editForm, setEditForm] = useState({
        full_name: '',
        phone: '',
        email: '',
        entry_level: '',
        notes: '',
    })

    // Feedback thông báo
    const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Tải danh sách học viên
    const loadStudents = useCallback(
        async (search?: string) => {
            setLoading(true)
            setAlertMessage(null)
            try {
                const res = await listStudents(requestFnRef.current, {
                    search: search !== undefined ? search : activeSearch,
                    page: 1,
                    page_size: 50,
                })
                setStudents(res.items)
                setTotal(res.total)
            } catch (err: unknown) {
                const msg = err instanceof ApiError ? err.message : getErrorMessage(err, 'Lỗi khi tải danh sách học viên.')
                setAlertMessage({ type: 'error', text: msg })
            } finally {
                setLoading(false)
            }
        },
        [activeSearch],
    )

    useEffect(() => {
        let isMounted = true
        if (initialStudents === undefined) {
            listStudents(requestFnRef.current, {
                search: undefined,
                page: 1,
                page_size: 50,
            })
                .then((res) => {
                    if (isMounted) {
                        setStudents(res.items)
                        setTotal(res.total)
                    }
                })
                .catch((err: unknown) => {
                    if (isMounted) {
                        const msg = err instanceof ApiError ? err.message : getErrorMessage(err, 'Lỗi khi tải danh sách học viên.')
                        setAlertMessage({ type: 'error', text: msg })
                    }
                })
                .finally(() => {
                    if (isMounted) {
                        setLoading(false)
                    }
                })
        }
        return () => {
            isMounted = false
        }
    }, [initialStudents])

    // Xử lý tìm kiếm
    const handleSearchSubmit = (e: FormEvent) => {
        e.preventDefault()
        setActiveSearch(searchKeyword.trim())
        loadStudents(searchKeyword.trim())
    }

    const handleResetSearch = () => {
        setSearchKeyword('')
        setActiveSearch('')
        loadStudents('')
    }

    // Mở xem chi tiết học viên
    const handleOpenDetail = async (student: StudentDetail) => {
        setSelectedStudent(student)
        setEditForm({
            full_name: student.full_name || '',
            phone: student.phone || '',
            email: student.email || '',
            entry_level: student.entry_level || '',
            notes: student.notes || '',
        })
        setIsModalOpen(true)
        try {
            const detail = await getStudentDetail(requestFn, student.id)
            setSelectedStudent(detail)
            setEditForm({
                full_name: detail.full_name || '',
                phone: detail.phone || '',
                email: detail.email || '',
                entry_level: detail.entry_level || '',
                notes: detail.notes || '',
            })
        } catch {
            // Giữ lại dữ liệu hiện tại từ bảng nếu GET chi tiết gặp lỗi
        }
    }

    // Đóng modal
    const handleCloseModal = () => {
        setIsModalOpen(false)
        setSelectedStudent(null)
    }

    // Lưu chỉnh sửa hồ sơ
    const handleSaveProfile = async (e: FormEvent) => {
        e.preventDefault()
        if (!selectedStudent) return

        setIsSaving(true)
        setAlertMessage(null)
        try {
            const updated = await updateStudentProfile(requestFn, selectedStudent.id, {
                full_name: editForm.full_name.trim(),
                phone: editForm.phone.trim(),
                email: editForm.email.trim() || null,
                entry_level: editForm.entry_level.trim() || null,
                notes: editForm.notes.trim() || null,
            })

            setSelectedStudent(updated)
            // Cập nhật lại trong danh sách
            setStudents((prev) =>
                prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)),
            )
            setAlertMessage({ type: 'success', text: 'Cập nhật hồ sơ học viên thành công.' })
            setIsModalOpen(false)
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.message : getErrorMessage(err, 'Lỗi khi cập nhật hồ sơ học viên.')
            setAlertMessage({ type: 'error', text: msg })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="students-container" data-testid="students-page">
            {/* Header */}
            <div className="students-header">
                <div className="students-header-left">
                    <h1 data-testid="page-title">Quản lý hồ sơ học viên</h1>
                    <p>Tra cứu quá trình học, cập nhật thông tin cá nhân, trình độ đầu vào và ghi chú học viên</p>
                </div>
                <div className="students-header-stats">
                    <div className="stat-pill" data-testid="stat-total-students">
                        Tổng số học viên: <strong>{total}</strong>
                    </div>
                </div>
            </div>

            {/* Thông báo Alert */}
            {alertMessage && (
                <div
                    className={`students-alert ${alertMessage.type}`}
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

            {/* Thanh tìm kiếm */}
            <form className="students-search-bar" onSubmit={handleSearchSubmit} data-testid="search-form">
                <div className="students-search-input-wrapper">
                    <span className="search-icon" aria-hidden="true">🔍</span>
                    <input
                        type="text"
                        className="students-search-input"
                        placeholder="Tìm kiếm theo mã học viên, tên, số điện thoại..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        data-testid="student-search-input"
                    />
                </div>
                <button type="submit" className="btn-search" data-testid="student-search-btn">
                    Tìm kiếm
                </button>
                {(searchKeyword || activeSearch) && (
                    <button
                        type="button"
                        className="btn-reset"
                        onClick={handleResetSearch}
                        data-testid="student-search-reset-btn"
                    >
                        Xóa tìm kiếm
                    </button>
                )}
            </form>

            {/* Bảng danh sách học viên */}
            <div className="students-table-card">
                {loading ? (
                    <div className="empty-state" data-testid="loading-state">
                        Đang tải danh sách học viên...
                    </div>
                ) : students.length === 0 ? (
                    <div className="empty-state" data-testid="empty-state">
                        {activeSearch
                            ? 'Không tìm thấy học viên nào phù hợp với từ khóa tìm kiếm.'
                            : 'Chưa có dữ liệu học viên trong hệ thống.'}
                    </div>
                ) : (
                    <table className="students-table" data-testid="students-table">
                        <thead>
                            <tr>
                                <th>Mã học viên</th>
                                <th>Họ và tên</th>
                                <th>Số điện thoại</th>
                                <th>Email</th>
                                <th>Trình độ đầu vào</th>
                                <th>Ghi chú</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student) => (
                                <tr key={student.id} data-testid={`student-row-${student.id}`}>
                                    <td>
                                        <span className="student-code-badge" data-testid={`student-code-${student.id}`}>
                                            {student.student_code}
                                        </span>
                                    </td>
                                    <td className="student-name-cell" data-testid={`student-name-${student.id}`}>
                                        {student.full_name}
                                    </td>
                                    <td data-testid={`student-phone-${student.id}`}>{student.phone}</td>
                                    <td data-testid={`student-email-${student.id}`}>{student.email || '-'}</td>
                                    <td>
                                        {student.entry_level ? (
                                            <span className="student-entry-level-badge" data-testid={`student-level-${student.id}`}>
                                                {student.entry_level}
                                            </span>
                                        ) : (
                                            <span style={{ color: '#94a3b8' }}>-</span>
                                        )}
                                    </td>
                                    <td data-testid={`student-notes-${student.id}`}>
                                        {student.notes || <span style={{ color: '#94a3b8' }}>-</span>}
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="btn-action-view"
                                            onClick={() => handleOpenDetail(student)}
                                            data-testid={`view-student-${student.id}`}
                                        >
                                            Hồ sơ chi tiết
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal Chi tiết & Sửa Hồ sơ Học viên */}
            {isModalOpen && selectedStudent && (
                <div className="modal-overlay" role="dialog" aria-modal="true" data-testid="student-profile-modal">
                    <div className="student-modal">
                        <div className="modal-header">
                            <h2 data-testid="modal-title">
                                Hồ sơ học viên - {selectedStudent.full_name}
                            </h2>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={handleCloseModal}
                                data-testid="close-modal-btn"
                                aria-label="Đóng"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveProfile}>
                                <div className="modal-body">
                                    {/* PHẦN 1: Thông tin cá nhân */}
                                    <div className="modal-section">
                                        <h3>👤 Thông tin cá nhân & Đào tạo</h3>
                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label htmlFor="student-code">Mã học viên (Hệ thống sinh)</label>
                                                <input
                                                    id="student-code"
                                                    type="text"
                                                    className="form-input"
                                                    value={selectedStudent.student_code}
                                                    readOnly
                                                    disabled
                                                    data-testid="student-code-input"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="student-name">Họ và tên *</label>
                                                <input
                                                    id="student-name"
                                                    type="text"
                                                    className="form-input"
                                                    value={editForm.full_name}
                                                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                                    required
                                                    disabled={!canManage}
                                                    data-testid="student-name-input"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="student-phone">Số điện thoại *</label>
                                                <input
                                                    id="student-phone"
                                                    type="text"
                                                    className="form-input"
                                                    value={editForm.phone}
                                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                    required
                                                    disabled={!canManage}
                                                    data-testid="student-phone-input"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="student-email">Email</label>
                                                <input
                                                    id="student-email"
                                                    type="email"
                                                    className="form-input"
                                                    value={editForm.email}
                                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                    disabled={!canManage}
                                                    data-testid="student-email-input"
                                                />
                                            </div>

                                            <div className="form-group full-width">
                                                <label htmlFor="student-entry-level">Trình độ đầu vào</label>
                                                <input
                                                    id="student-entry-level"
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="Ví dụ: IELTS 6.0, B1, Cơ bản..."
                                                    value={editForm.entry_level}
                                                    onChange={(e) => setEditForm({ ...editForm, entry_level: e.target.value })}
                                                    disabled={!canManage}
                                                    data-testid="student-entry-level-input"
                                                />
                                            </div>

                                            <div className="form-group full-width">
                                                <label htmlFor="student-notes">Ghi chú</label>
                                                <textarea
                                                    id="student-notes"
                                                    className="form-textarea"
                                                    placeholder="Ghi chú hồ sơ học viên..."
                                                    value={editForm.notes}
                                                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                                    disabled={!canManage}
                                                    data-testid="student-notes-input"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* PHẦN 2: Lớp đang học (SCRUM-216 - 216-02) */}
                                    <div className="modal-section" data-testid="current-class-section">
                                        <h3>📚 Lớp đang học</h3>
                                        {selectedStudent.current_class ? (
                                            <div className="class-info-card" data-testid="current-class-card">
                                                <div className="class-info-main">
                                                    <span className="class-code-tag">{selectedStudent.current_class.class_code}</span>
                                                    <span className="class-name-tag">{selectedStudent.current_class.name || 'Lớp học hiện tại'}</span>
                                                    {selectedStudent.current_class.start_date && (
                                                        <span className="class-date-tag">Khai giảng: {selectedStudent.current_class.start_date}</span>
                                                    )}
                                                </div>
                                                <span className="student-entry-level-badge">
                                                    {selectedStudent.current_class.status || 'Đang học'}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="modal-empty-box" data-testid="no-current-class">
                                                Chưa có lớp đang học
                                            </div>
                                        )}
                                    </div>

                                    {/* PHẦN 3: Lịch sử các lớp đã học (SCRUM-216 - 216-02) */}
                                    <div className="modal-section" data-testid="class-history-section">
                                        <h3>📜 Lịch sử các lớp đã học</h3>
                                        {selectedStudent.class_history && selectedStudent.class_history.length > 0 ? (
                                            <div className="class-history-list" data-testid="class-history-list">
                                                {selectedStudent.class_history.map((c) => (
                                                    <div key={c.id} className="class-info-card" style={{ marginBottom: 8 }}>
                                                        <div className="class-info-main">
                                                            <span className="class-code-tag">{c.class_code}</span>
                                                            <span className="class-name-tag">{c.name || 'Lớp đã học'}</span>
                                                        </div>
                                                        <span className="student-entry-level-badge">{c.status || 'Kết thúc'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="modal-empty-box" data-testid="no-class-history">
                                                Chưa có lịch sử lớp học
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={handleCloseModal}
                                        data-testid="cancel-edit-btn"
                                    >
                                        Đóng
                                    </button>
                                    {canManage && (
                                        <button
                                            type="submit"
                                            className="btn-primary"
                                            disabled={isSaving}
                                            data-testid="save-student-btn"
                                        >
                                            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                        </button>
                                    )}
                                </div>
                            </form>
                    </div>
                </div>
            )}
        </div>
    )
}
