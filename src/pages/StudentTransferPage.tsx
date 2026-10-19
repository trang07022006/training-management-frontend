import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getStudentDetail, type StudentDetail } from '../api/studentApi'
import { listClasses, type TrainingClass } from '../api/classApi'
import { transferStudent, formatClassOptionLabel, type TransferStudentPayload } from '../api/studentLifecycleApi'
import { PageHeader } from '../components/PageHeader'
import { getErrorMessage } from '../utils/errorMessages'
import { formatVietnamDate } from '../utils/dateUtils'
import { getStudentStatusBadge } from './StudentDetailPage'
import './StudentLifecycle.css'

export function StudentTransferPage() {
    const { studentId } = useParams<{ studentId: string }>()
    const [searchParams] = useSearchParams()
    const preselectedClassId = searchParams.get('classId') || ''
    const navigate = useNavigate()
    const { request: requestFn } = useSession()

    const [student, setStudent] = useState<StudentDetail | null>(null)
    const [sourceClassId, setSourceClassId] = useState<string>(preselectedClassId)
    const [targetClassId, setTargetClassId] = useState<string>('')
    const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().slice(0, 10))
    const [reason, setReason] = useState<string>('')

    const [availableTargetClasses, setAvailableTargetClasses] = useState<TrainingClass[]>([])
    const [searchTargetKeyword, setSearchTargetKeyword] = useState<string>('')

    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [showConfirmModal, setShowConfirmModal] = useState(false)

    useEffect(() => {
        let isMounted = true
        if (!studentId) {
            setErrorMessage('Mã học viên không hợp lệ.')
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setErrorMessage(null)

        getStudentDetail(requestFn, studentId)
            .then(async (data) => {
                if (!isMounted) return
                setStudent(data)

                const activeClasses = (data.current_classes && data.current_classes.length > 0)
                    ? data.current_classes
                    : (data.current_class ? [data.current_class] : [])

                let initialSource = ''
                if (preselectedClassId && activeClasses.some(c => (c.class_id || c.id) === preselectedClassId)) {
                    initialSource = preselectedClassId
                } else if (activeClasses.length > 0) {
                    initialSource = activeClasses[0].class_id || activeClasses[0].id || ''
                }
                setSourceClassId(initialSource)

                // Tải danh sách lớp đích cùng chương trình
                try {
                    const classesRes = await listClasses(requestFn, {
                        program_id: data.program_id || undefined,
                        page_size: 100,
                    })
                    if (isMounted) {
                        setAvailableTargetClasses(classesRes.items || [])
                    }
                } catch (loadClassesErr) {
                    // Non-fatal, user can still see error
                    console.error('Lỗi khi tải danh mục lớp:', loadClassesErr)
                }

                setIsLoading(false)
            })
            .catch((err) => {
                if (isMounted) {
                    setErrorMessage(getErrorMessage(err, 'Lỗi khi tải thông tin học viên.'))
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [studentId, preselectedClassId, requestFn])

    const studentClasses = (student?.current_classes && student.current_classes.length > 0)
        ? student.current_classes
        : (student?.current_class ? [student.current_class] : [])

    const selectedSourceClass = studentClasses.find(c => (c.class_id || c.id) === sourceClassId)

    // Lọc danh sách lớp đích hợp lệ: khác lớp nguồn, học viên chưa tham gia
    const filteredTargetClasses = useMemo(() => {
        return availableTargetClasses.filter((cls) => {
            if (cls.id === sourceClassId) return false
            // Học viên đã có trong lớp này
            if (studentClasses.some(sc => (sc.class_id || sc.id) === cls.id)) return false
            // Tìm kiếm theo từ khóa nếu có
            if (searchTargetKeyword.trim()) {
                const kw = searchTargetKeyword.trim().toLowerCase()
                const matchCode = cls.class_code.toLowerCase().includes(kw)
                return matchCode
            }
            return true
        })
    }, [availableTargetClasses, sourceClassId, studentClasses, searchTargetKeyword])

    const selectedTargetClass = availableTargetClasses.find(c => c.id === targetClassId)
    const isTargetFull = selectedTargetClass ? selectedTargetClass.enrolled_count >= selectedTargetClass.max_capacity : false

    const handleOpenConfirm = (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMessage(null)

        if (!sourceClassId) {
            setErrorMessage('Vui lòng chọn lớp nguồn cần chuyển đi.')
            return
        }
        if (!targetClassId) {
            setErrorMessage('Vui lòng chọn lớp đích cần chuyển đến.')
            return
        }
        if (sourceClassId === targetClassId) {
            setErrorMessage('Lớp đích phải khác lớp nguồn.')
            return
        }
        if (isTargetFull) {
            setErrorMessage('Lớp đích đã đủ sĩ số tối đa. Vui lòng chọn lớp khác.')
            return
        }
        if (!effectiveDate) {
            setErrorMessage('Vui lòng chọn ngày hiệu lực chuyển lớp.')
            return
        }
        if (!reason || reason.trim().length === 0) {
            setErrorMessage('Lý do chuyển lớp là bắt buộc và không được chỉ chứa khoảng trắng.')
            return
        }
        if (reason.trim().length < 5) {
            setErrorMessage('Lý do chuyển lớp phải có ít nhất 5 ký tự.')
            return
        }

        setShowConfirmModal(true)
    }

    const handleConfirmTransfer = async () => {
        if (!studentId || !sourceClassId || !targetClassId || !effectiveDate || !reason.trim()) return

        setIsSubmitting(true)
        setErrorMessage(null)

        const payload: TransferStudentPayload = {
            source_class_id: sourceClassId,
            target_class_id: targetClassId,
            effective_date: effectiveDate,
            reason: reason.trim(),
        }

        try {
            await transferStudent(requestFn, studentId, payload)
            setShowConfirmModal(false)
            setSuccessMessage(
                `Chuyển lớp thành công sang ${selectedTargetClass?.class_code} từ ngày ${formatVietnamDate(effectiveDate)}. Lịch sử điểm và điểm danh ở lớp cũ được bảo toàn.`
            )
        } catch (err: any) {
            setShowConfirmModal(false)
            setErrorMessage(getErrorMessage(err, 'Lỗi khi thực hiện chuyển lớp học viên.'))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="students-container lifecycle-container" data-testid="student-transfer-page">
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }} />
                    <span>Đang tải thông tin chuyển lớp...</span>
                </div>
            </div>
        )
    }

    const studentStatus = student ? getStudentStatusBadge(student.status) : null

    return (
        <div className="students-container lifecycle-container" data-testid="student-transfer-page">
            <PageHeader
                title="Chuyển lớp học viên"
                subtitle={student ? `Mã học viên: ${student.student_code} • ${student.full_name}` : ''}
                breadcrumbs={[
                    { label: 'Học viên', path: '/students' },
                    { label: student?.full_name || 'Hồ sơ', path: `/students/${studentId}` },
                    { label: 'Chuyển lớp' },
                ]}
            />

            {errorMessage && (
                <div className="lifecycle-alert error" role="alert" data-testid="alert-error">
                    <span>⚠️ {errorMessage}</span>
                </div>
            )}

            {successMessage && (
                <div className="lifecycle-alert success" role="alert" data-testid="alert-success">
                    <span>✓ {successMessage}</span>
                </div>
            )}

            {student && (
                <>
                    {/* KHỐI TÓM TẮT HỌC VIÊN THU GỌN */}
                    <div className="lifecycle-student-summary" data-testid="student-summary-card">
                        <div className="lifecycle-summary-main">
                            <div className="lifecycle-summary-avatar">👤</div>
                            <div className="lifecycle-summary-text">
                                <div className="lifecycle-summary-name-row">
                                    <span className="lifecycle-summary-name">{student.full_name}</span>
                                    {studentStatus && (
                                        <span className={`status-badge ${studentStatus.className}`} data-testid="student-status-badge">
                                            {studentStatus.label}
                                        </span>
                                    )}
                                </div>
                                <div className="lifecycle-summary-meta">
                                    <span>Mã HV: <strong>{student.student_code}</strong></span>
                                    <span className="lifecycle-meta-sep">•</span>
                                    <span>Email: {student.email || 'Chưa cập nhật email'}</span>
                                    <span className="lifecycle-meta-sep">•</span>
                                    <span>SĐT: {student.phone || 'Chưa cập nhật SĐT'}</span>
                                    <span className="lifecycle-meta-sep">•</span>
                                    <span>
                                        Chương trình đăng ký của học viên:{' '}
                                        <strong className="lifecycle-program-text">
                                            {student.program_name || student.program_code || 'Chưa phân bổ chương trình'}
                                        </strong>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: '13px', padding: '6px 14px', flexShrink: 0 }}
                            onClick={() => navigate(`/students/${studentId}`)}
                        >
                            Xem hồ sơ
                        </button>
                    </div>

                    {/* FORM CHUYỂN LỚP */}
                    <div className="lifecycle-card">
                        <div className="lifecycle-card-header">
                            <h3 className="lifecycle-card-title">
                                <span>🔄</span> Thiết lập chuyển lớp
                            </h3>
                        </div>

                        {successMessage ? (
                            <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                <p style={{ fontSize: '15px', color: '#166534', fontWeight: 500, marginBottom: '20px' }}>
                                    Thao tác chuyển lớp đã được ghi nhận. Lịch sử điểm và điểm danh ở lớp cũ vẫn được giữ nguyên vẹn.
                                </p>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => navigate(`/students/${studentId}`)}
                                    >
                                        Về hồ sơ học viên
                                    </button>
                                    {targetClassId && (
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            onClick={() => navigate(`/classes/${targetClassId}`)}
                                        >
                                            Xem chi tiết lớp mới
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : studentClasses.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
                                <p>Học viên hiện không tham gia lớp nào để thực hiện chuyển lớp.</p>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => navigate(`/students/${studentId}`)}
                                >
                                    Quay lại hồ sơ học viên
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleOpenConfirm}>
                                {/* LỚI 2 CỘT: LỚP NGUỒN VÀ LỚP ĐÍCH */}
                                <div className="lifecycle-form-grid-2">
                                    {/* LỚP NGUỒN */}
                                    <div className="lifecycle-form-group">
                                        <label htmlFor="select-source-class" className="lifecycle-form-label">
                                            Lớp nguồn (chuyển đi) <span className="required">*</span>
                                        </label>
                                        <select
                                            id="select-source-class"
                                            data-testid="select-source-class"
                                            className="lifecycle-form-control"
                                            value={sourceClassId}
                                            onChange={(e) => setSourceClassId(e.target.value)}
                                            disabled={isSubmitting}
                                        >
                                            <option value="">-- Chọn lớp nguồn --</option>
                                            {studentClasses.map((cls, idx) => {
                                                const cid = cls.class_id || cls.id || String(idx)
                                                return (
                                                    <option key={cid} value={cid}>
                                                        {formatClassOptionLabel(cls)}
                                                    </option>
                                                )
                                            })}
                                        </select>
                                        {selectedSourceClass && (
                                            <div className="lifecycle-form-hint">
                                                Khai giảng: {selectedSourceClass.expected_start_date || selectedSourceClass.start_date ? formatVietnamDate(selectedSourceClass.expected_start_date || selectedSourceClass.start_date) : 'Chưa thiết lập ngày khai giảng'}
                                                {selectedSourceClass.program_name ? ` • Chương trình của lớp: ${selectedSourceClass.program_name}` : ''}
                                            </div>
                                        )}
                                    </div>

                                    {/* LỚP ĐÍCH */}
                                    <div className="lifecycle-form-group">
                                        <label htmlFor="select-target-class" className="lifecycle-form-label">
                                            Lớp đích (chuyển đến) <span className="required">*</span>
                                        </label>

                                        <div style={{ marginBottom: '8px' }}>
                                            <input
                                                type="text"
                                                className="lifecycle-form-control"
                                                placeholder="Tìm kiếm lớp theo mã lớp..."
                                                value={searchTargetKeyword}
                                                onChange={(e) => setSearchTargetKeyword(e.target.value)}
                                                style={{ fontSize: '13px', padding: '8px 12px', minHeight: '36px' }}
                                            />
                                        </div>

                                        <select
                                            id="select-target-class"
                                            data-testid="select-target-class"
                                            className="lifecycle-form-control"
                                            value={targetClassId}
                                            onChange={(e) => setTargetClassId(e.target.value)}
                                            disabled={isSubmitting}
                                        >
                                            <option value="">-- Chọn lớp đích trong cùng chương trình --</option>
                                            {filteredTargetClasses.map((cls) => {
                                                const isFull = cls.enrolled_count >= cls.max_capacity
                                                return (
                                                    <option key={cls.id} value={cls.id} disabled={isFull}>
                                                        {formatClassOptionLabel(cls)} (Sĩ số: {cls.enrolled_count}/{cls.max_capacity} {isFull ? '- ĐÃ ĐẦY' : '- Còn chỗ'})
                                                    </option>
                                                )
                                            })}
                                        </select>

                                        {selectedTargetClass && (
                                            <div className="lifecycle-form-hint">
                                                Sĩ số: <strong>{selectedTargetClass.enrolled_count} / {selectedTargetClass.max_capacity}</strong> học viên
                                                {isTargetFull && (
                                                    <span style={{ color: '#ef4444', marginLeft: '8px', fontWeight: 600 }}>
                                                        (Lớp đã hết chỗ)
                                                    </span>
                                                )}
                                                {selectedTargetClass.expected_start_date && (
                                                    <span> • Khai giảng: {formatVietnamDate(selectedTargetClass.expected_start_date)}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* NGÀY HIỆU LỰC */}
                                <div className="lifecycle-form-group">
                                    <label htmlFor="input-effective-date" className="lifecycle-form-label">
                                        Ngày hiệu lực chuyển lớp <span className="required">*</span>
                                    </label>
                                    <input
                                        id="input-effective-date"
                                        data-testid="input-effective-date"
                                        type="date"
                                        className="lifecycle-form-control"
                                        value={effectiveDate}
                                        onChange={(e) => setEffectiveDate(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    <div className="lifecycle-form-hint">
                                        Từ ngày này trở đi, học viên sẽ được ghi danh vào lớp đích và ngừng điểm danh ở lớp nguồn. Trước ngày này, học viên vẫn thuộc lớp nguồn.
                                    </div>
                                </div>

                                {/* LÝ DO */}
                                <div className="lifecycle-form-group">
                                    <label htmlFor="input-reason" className="lifecycle-form-label">
                                        Lý do chuyển lớp <span className="required">*</span>
                                    </label>
                                    <textarea
                                        id="input-reason"
                                        data-testid="input-reason"
                                        className="lifecycle-form-control"
                                        placeholder="Nhập lý do chuyển lớp (ví dụ: chuyển ca học, phù hợp lịch công tác, yêu cầu chuyên môn...)"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    <div className="lifecycle-form-hint">
                                        Lý do là thông tin bắt buộc và sẽ được lưu trữ vào lịch sử hồ sơ học viên.
                                    </div>
                                </div>

                                {/* TÁC ĐỘNG NGHIỆP VỤ */}
                                <div className="lifecycle-impact-box">
                                    <div className="lifecycle-impact-title">
                                        <span>ℹ️</span> Tác động nghiệp vụ:
                                    </div>
                                    <ul className="lifecycle-impact-list">
                                        <li>Học viên sẽ được chuyển từ lớp <strong>{selectedSourceClass?.class_code || 'lớp nguồn'}</strong> sang lớp <strong>{selectedTargetClass?.class_code || 'lớp đích'}</strong> từ ngày <strong>{effectiveDate ? formatVietnamDate(effectiveDate) : '...'}</strong>.</li>
                                        <li>Lịch sử điểm và điểm danh ở lớp cũ được giữ nguyên vẹn, không bị xóa hay thay đổi.</li>
                                        <li>Học viên được giữ chỗ ngay ở lớp đích và xuất hiện trong danh sách điểm danh lớp đích từ ngày hiệu lực.</li>
                                        <li>Thao tác được ghi nhận vào lịch sử học viên và có thể tra cứu bất cứ lúc nào.</li>
                                    </ul>
                                </div>

                                <div className="lifecycle-actions">
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => navigate(`/students/${studentId}`)}
                                        disabled={isSubmitting}
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        data-testid="btn-preview-transfer"
                                        disabled={isSubmitting || isTargetFull}
                                    >
                                        Xem lại & Xác nhận chuyển lớp
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </>
            )}

            {/* CONFIRMATION MODAL */}
            {showConfirmModal && (
                <div className="lifecycle-modal-backdrop" data-testid="transfer-modal">
                    <div className="lifecycle-modal-dialog">
                        <div className="lifecycle-modal-header">
                            <h4>Xác nhận yêu cầu chuyển lớp học viên</h4>
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="lifecycle-modal-body">
                            <p style={{ margin: '0 0 12px 0' }}>
                                Vui lòng kiểm tra kỹ các thông tin chuyển lớp trước khi hệ thống lưu thay đổi:
                            </p>

                            <div className="lifecycle-modal-summary">
                                <div className="lifecycle-modal-summary-row">
                                    <span className="lifecycle-modal-summary-label">Học viên:</span>
                                    <span className="lifecycle-modal-summary-val">{student?.full_name} ({student?.student_code})</span>
                                </div>
                                <div className="lifecycle-modal-summary-row">
                                    <span className="lifecycle-modal-summary-label">Lớp nguồn:</span>
                                    <span className="lifecycle-modal-summary-val">{formatClassOptionLabel(selectedSourceClass)}</span>
                                </div>
                                <div className="lifecycle-modal-summary-row">
                                    <span className="lifecycle-modal-summary-label">Lớp đích:</span>
                                    <span className="lifecycle-modal-summary-val">{formatClassOptionLabel(selectedTargetClass)}</span>
                                </div>
                                <div className="lifecycle-modal-summary-row">
                                    <span className="lifecycle-modal-summary-label">Ngày hiệu lực:</span>
                                    <span className="lifecycle-modal-summary-val">{formatVietnamDate(effectiveDate)}</span>
                                </div>
                                <div className="lifecycle-modal-summary-row">
                                    <span className="lifecycle-modal-summary-label">Lý do:</span>
                                    <span className="lifecycle-modal-summary-val" style={{ maxWidth: '280px', wordBreak: 'break-word', textAlign: 'right' }}>
                                        {reason.trim()}
                                    </span>
                                </div>
                            </div>

                            <p style={{ margin: 0, fontSize: '13px', color: '#0369a1', background: '#f0f9ff', padding: '10px 12px', borderRadius: '6px' }}>
                                ℹ️ Điểm và lịch sử điểm danh ở lớp cũ vẫn được bảo toàn nguyên vẹn.
                            </p>
                        </div>
                        <div className="lifecycle-modal-footer">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setShowConfirmModal(false)}
                                disabled={isSubmitting}
                            >
                                Quay lại chỉnh sửa
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                data-testid="btn-confirm-transfer"
                                onClick={handleConfirmTransfer}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận chuyển lớp'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

