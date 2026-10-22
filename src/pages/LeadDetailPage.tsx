import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import {
    getLead,
    updateLeadStatus,
    assignLead,
    getAssignableUsers,
    getLeadAssignmentHistory,
    getLeadStatusHistory,
    getLeadCareLogs,
    createLeadCareLog,
    updateLeadCallbackDate,
    convertLeadToStudent,
    getLeadStudent,
    formatCallbackDateDisplay,
    isLeadCallbackOverdue,
    getLeadStatusLabel,
    getLeadSourceLabel,
    LEAD_STATUS_BADGE_CLASSES,
    REJECTION_REASONS,
    type Lead,
    type LeadStatus,
    type AssignableUser,
    type LeadAssignmentHistoryItem,
    type LeadStatusHistoryItem,
    type LeadCareLog,
    type InteractionType,
    type RejectionReason,
} from '../api/leadApi'
import { Breadcrumb } from '../components/Breadcrumb'
import { formatVietnamDateTime } from '../utils/dateUtils'
import { getErrorMessage } from '../utils/errorMessages'
import { ToastPortal } from '../components/ToastPortal'
import './LeadsPage.css'

export function LeadDetailPage() {
    const { leadId } = useParams<{ leadId: string }>()
    const navigate = useNavigate()
    const { request, role, roles = [] } = useSession()

    const [lead, setLead] = useState<Lead | null>(null)
    const [loading, setLoading] = useState(true)
    const [pageError, setPageError] = useState<string | null>(null)
    const [pageSuccess, setPageSuccess] = useState<string | null>(null)

    // Status management
    const [selectedStatus, setSelectedStatus] = useState<LeadStatus>('new')
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
    const [rejectionReason, setRejectionReason] = useState<RejectionReason>('Không còn nhu cầu')
    const [rejectionNotes, setRejectionNotes] = useState('')
    const [showRejectionForm, setShowRejectionForm] = useState(false)
    const [rejectionReasonError, setRejectionReasonError] = useState<string | null>(null)
    const [rejectionNotesError, setRejectionNotesError] = useState<string | null>(null)

    // Assignment management
    const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([])
    const [selectedAssigneeId, setSelectedAssigneeId] = useState('')
    const [isAssigning, setIsAssigning] = useState(false)
    const [assignmentHistory, setAssignmentHistory] = useState<LeadAssignmentHistoryItem[]>([])

    // Status History
    const [statusHistory, setStatusHistory] = useState<LeadStatusHistoryItem[]>([])

    // Care Logs
    const [careLogs, setCareLogs] = useState<LeadCareLog[]>([])
    const [isAddingCareLog, setIsAddingCareLog] = useState(false)
    const [careLogType, setCareLogType] = useState<InteractionType>('call')
    const [careLogContent, setCareLogContent] = useState('')
    const [careLogTime, setCareLogTime] = useState('')
    const [careLogError, setCareLogError] = useState<string | null>(null)
    const [isSubmittingCareLog, setIsSubmittingCareLog] = useState(false)

    // Callback Date
    const [callbackDateInput, setCallbackDateInput] = useState('')
    const [isUpdatingCallback, setIsUpdatingCallback] = useState(false)

    // Convert to student
    const [isConverting, setIsConverting] = useState(false)
    const [convertedStudentCode, setConvertedStudentCode] = useState<string | null>(null)

    const canManageAssignments =
        role === 'admin' ||
        role === 'training_manager' ||
        roles.includes('admin') ||
        roles.includes('training_manager')

    useEffect(() => {
        if (!leadId) return

        let isMounted = true
        setLoading(true)
        setPageError(null)

        getLead(request, leadId)
            .then(async (detail) => {
                if (!isMounted) return
                let finalLead = detail
                if (!finalLead.student_code && finalLead.status === 'converted') {
                    try {
                        const linked = await getLeadStudent(request, leadId)
                        if (linked) {
                            finalLead = {
                                ...finalLead,
                                student_code: linked.student_code,
                                student: linked,
                            }
                        }
                    } catch {
                        // ignore
                    }
                }
                setLead(finalLead)
                setSelectedStatus(finalLead.status)
                setSelectedAssigneeId(finalLead.assigned_to_user_id || '')
                setCallbackDateInput(finalLead.callback_date ? finalLead.callback_date.slice(0, 10) : '')
                setConvertedStudentCode(finalLead.student_code || finalLead.student?.student_code || null)
                setLoading(false)

                // Load sub-lists
                getLeadAssignmentHistory(request, leadId)
                    .then((h) => isMounted && setAssignmentHistory(h))
                    .catch(() => {})

                getLeadStatusHistory(request, leadId)
                    .then((s) => isMounted && setStatusHistory(s))
                    .catch(() => {})

                getLeadCareLogs(request, leadId)
                    .then((c) => isMounted && setCareLogs(c))
                    .catch(() => {})
            })
            .catch((err: unknown) => {
                if (!isMounted) return
                setPageError(getErrorMessage(err, 'Không tìm thấy hoặc không thể tải chi tiết khách hàng.'))
                setLoading(false)
            })

        getAssignableUsers(request)
            .then((users) => {
                if (!isMounted) return
                const validUsers = users.filter((u) => {
                    if (!u.id || u.id.startsWith('demo-')) return false
                    const roleLower = (u.role || '').toLowerCase().trim()
                    return roleLower === 'consultant' || roleLower === 'tư vấn tuyển sinh'
                })
                setAssignableUsers(validUsers)
            })
            .catch(() => {})

        return () => {
            isMounted = false
        }
    }, [leadId, request])

    const handleUpdateStatus = async (newStatus: LeadStatus) => {
        if (!lead || isUpdatingStatus) return

        if (newStatus === 'rejected') {
            setShowRejectionForm(true)
            return
        }

        setIsUpdatingStatus(true)
        setPageError(null)
        setPageSuccess(null)

        try {
            const updated = await updateLeadStatus(request, lead.id, newStatus)
            setLead(updated)
            setSelectedStatus(updated.status)
            setPageSuccess(`Đã cập nhật trạng thái thành "${getLeadStatusLabel(updated.status)}"`)
            const hist = await getLeadStatusHistory(request, lead.id)
            setStatusHistory(hist)
        } catch (err: unknown) {
            setPageError(getErrorMessage(err, 'Lỗi khi cập nhật trạng thái.'))
        } finally {
            setIsUpdatingStatus(false)
        }
    }

    const handleConfirmRejection = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!lead || isUpdatingStatus) return

        let hasError = false
        const trimmedReason = (rejectionReason || '').trim()
        const trimmedNotes = (rejectionNotes || '').trim()

        if (!trimmedReason) {
            setRejectionReasonError('Vui lòng chọn lý do từ chối.')
            setPageError('Vui lòng chọn lý do từ chối.')
            hasError = true
        }

        if (trimmedReason === 'Khác' && !trimmedNotes) {
            setRejectionNotesError('Vui lòng nhập lý do cụ thể khi chọn "Khác".')
            setPageError('Vui lòng nhập lý do cụ thể khi chọn "Khác".')
            hasError = true
        }

        if (hasError) {
            return
        }

        setIsUpdatingStatus(true)
        setPageError(null)
        setRejectionReasonError(null)
        setRejectionNotesError(null)

        try {
            const updated = await updateLeadStatus(
                request,
                lead.id,
                'rejected',
                trimmedReason,
                trimmedNotes || undefined
            )
            setLead(updated)
            setSelectedStatus('rejected')
            setShowRejectionForm(false)
            setPageSuccess('Đã chuyển khách hàng tiềm năng sang trạng thái Từ chối.')
            setTimeout(() => {
                setPageSuccess((curr) =>
                    curr === 'Đã chuyển khách hàng tiềm năng sang trạng thái Từ chối.' ? null : curr,
                )
            }, 5000)
            const hist = await getLeadStatusHistory(request, lead.id)
            setStatusHistory(hist)
        } catch (err: unknown) {
            // Giữ form mở, giữ lý do và ghi chú để người dùng thử lại
            setPageError(getErrorMessage(err, 'Lỗi khi từ chối khách hàng.'))
        } finally {
            setIsUpdatingStatus(false)
        }
    }

    const handleAssign = async () => {
        if (!lead || isAssigning) return
        setIsAssigning(true)
        setPageError(null)
        setPageSuccess(null)

        try {
            const updated = await assignLead(request, lead.id, selectedAssigneeId || null)
            setLead(updated)
            setPageSuccess('Cập nhật người phụ trách thành công.')
            const hist = await getLeadAssignmentHistory(request, lead.id)
            setAssignmentHistory(hist)
        } catch (err: unknown) {
            setPageError(getErrorMessage(err, 'Lỗi khi phân công nhân sự.'))
        } finally {
            setIsAssigning(false)
        }
    }

    const handleUpdateCallbackDate = async () => {
        if (!lead || isUpdatingCallback) return
        setIsUpdatingCallback(true)
        setPageError(null)
        setPageSuccess(null)

        const targetDate = callbackDateInput ? callbackDateInput.slice(0, 10).trim() : null
        try {
            const updated = await updateLeadCallbackDate(request, lead.id, targetDate || null)
            setLead(updated)
            setPageSuccess(targetDate ? 'Cập nhật ngày nhắc gọi lại thành công.' : 'Đã xóa lịch nhắc gọi lại.')
        } catch (err: unknown) {
            setPageError(getErrorMessage(err, 'Lỗi khi cập nhật ngày gọi lại.'))
        } finally {
            setIsUpdatingCallback(false)
        }
    }

    const handleClearCallbackDate = async () => {
        if (!lead || isUpdatingCallback) return
        setIsUpdatingCallback(true)
        setPageError(null)
        setPageSuccess(null)

        try {
            const updated = await updateLeadCallbackDate(request, lead.id, null)
            setLead(updated)
            setCallbackDateInput('')
            setPageSuccess('Đã xóa lịch nhắc gọi lại.')
        } catch (err: unknown) {
            setPageError(getErrorMessage(err, 'Lỗi khi xóa ngày gọi lại.'))
        } finally {
            setIsUpdatingCallback(false)
        }
    }

    const handleConvertToStudentAction = async () => {
        if (!lead || isConverting) return
        setIsConverting(true)
        setPageError(null)
        setPageSuccess(null)

        try {
            const res = await convertLeadToStudent(request, lead.id)
            const code = res?.student?.student_code
            setConvertedStudentCode(code || null)
            setLead((prev) =>
                prev
                    ? {
                          ...prev,
                          status: 'converted',
                          student_code: code || prev.student_code,
                          student: res?.student || prev.student,
                      }
                    : prev,
            )
            setSelectedStatus('converted')
            setPageSuccess(`Chuyển đổi thành công! Mã học viên: ${code || 'Đã tạo'}`)
        } catch (err: unknown) {
            setPageError(getErrorMessage(err, 'Lỗi khi chuyển đổi khách hàng thành học viên.'))
        } finally {
            setIsConverting(false)
        }
    }

    const handleAddCareLog = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!lead || isSubmittingCareLog) return

        if (!careLogContent.trim()) {
            setCareLogError('Vui lòng nhập nội dung chăm sóc.')
            return
        }
        if (!careLogTime.trim()) {
            setCareLogError('Vui lòng chọn thời gian tương tác.')
            return
        }

        setIsSubmittingCareLog(true)
        setCareLogError(null)

        try {
            await createLeadCareLog(request, lead.id, {
                interaction_type: careLogType,
                content: careLogContent.trim(),
                interaction_at: careLogTime || undefined,
            })
            const logs = await getLeadCareLogs(request, lead.id)
            setCareLogs(logs)
            setIsAddingCareLog(false)
            setCareLogContent('')
            setCareLogTime('')
            setPageSuccess('Thêm nhật ký chăm sóc thành công.')
        } catch (err: unknown) {
            setCareLogError(getErrorMessage(err, 'Lỗi khi thêm nhật ký chăm sóc.'))
        } finally {
            setIsSubmittingCareLog(false)
        }
    }

    if (loading) {
        return (
            <div style={{ padding: '24px 32px' }}>
                <div className="table-loading" style={{ padding: '40px', textAlign: 'center' }}>
                    <div className="spinner" />
                    <span>Đang tải thông tin khách hàng...</span>
                </div>
            </div>
        )
    }

    if (!lead || pageError && !lead) {
        return (
            <div style={{ padding: '24px 32px' }}>
                <Breadcrumb
                    items={[
                        { label: 'Tư vấn tuyển sinh', path: '/leads' },
                        { label: 'Chi tiết khách hàng' },
                    ]}
                />
                <div className="modal-banner-error" role="alert" style={{ marginTop: '24px' }}>
                    {pageError || 'Không tìm thấy khách hàng yêu cầu.'}
                </div>
                <div style={{ marginTop: '16px' }}>
                    <button
                        type="button"
                        className="btn-filter"
                        onClick={() => navigate('/leads')}
                    >
                        Quay lại danh sách
                    </button>
                </div>
            </div>
        )
    }

    const isOverdue = lead.callback_date ? isLeadCallbackOverdue(lead.callback_date) : false

    return (
        <div className="leads-page" style={{ padding: '24px 32px' }}>
            <Breadcrumb
                items={[
                    { label: 'Tư vấn tuyển sinh', path: '/leads' },
                    { label: lead.full_name || 'Chi tiết khách hàng' },
                ]}
            />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 24px 0' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 8px 0', color: '#0B1F3A' }}>
                        {lead.full_name}
                    </h1>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span className={`status-badge ${LEAD_STATUS_BADGE_CLASSES[lead.status] || ''}`}>
                            {getLeadStatusLabel(lead.status)}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                            Nguồn: {getLeadSourceLabel(lead.source)}
                        </span>
                        {lead.created_at && (
                            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                                Tiếp nhận: {formatVietnamDateTime(lead.created_at)}
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        type="button"
                        className="btn-clear-filter"
                        onClick={() => navigate('/leads')}
                    >
                        ← Danh sách
                    </button>
                    <Link
                        to={`/leads/${lead.id}/edit`}
                        className="btn-filter"
                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        Chỉnh sửa
                    </Link>
                    {lead.status === 'won' && !convertedStudentCode && (
                        <button
                            type="button"
                            className="btn-filter"
                            style={{ background: '#10b981' }}
                            onClick={handleConvertToStudentAction}
                            disabled={isConverting}
                        >
                            {isConverting ? 'Đang chuyển đổi...' : 'Chuyển thành học viên'}
                        </button>
                    )}
                </div>
            </div>

            <ToastPortal
                success={pageSuccess}
                error={pageError}
                onCloseSuccess={() => setPageSuccess(null)}
                onCloseError={() => setPageError(null)}
            />

            {/* Converted Student Notice */}
            {convertedStudentCode && (
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <strong style={{ color: '#065f46' }}>Khách hàng đã trở thành học viên chính thức!</strong>
                        <div style={{ color: '#047857', fontSize: '0.9rem', marginTop: '4px' }}>
                            Mã học viên: <strong>{convertedStudentCode}</strong>
                        </div>
                    </div>
                    {lead.student?.id && (
                        <Link
                            to={`/students/${lead.student.id}`}
                            className="btn-filter"
                            style={{ background: '#059669', textDecoration: 'none' }}
                        >
                            Xem hồ sơ học viên
                        </Link>
                    )}
                </div>
            )}

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
                {/* Left Column: Details & Tabs/Sections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Basic Info */}
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#0B1F3A', marginTop: 0, marginBottom: '16px' }}>
                            Thông tin liên hệ & tư vấn
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                            <div>
                                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Số điện thoại:</span>
                                <div style={{ fontWeight: 600, fontSize: '1rem', marginTop: '4px' }}>
                                    <a href={`tel:${lead.phone}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                                        {lead.phone}
                                    </a>
                                </div>
                            </div>
                            <div>
                                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Email:</span>
                                <div style={{ fontWeight: 600, fontSize: '1rem', marginTop: '4px' }}>
                                    {lead.email ? (
                                        <a href={`mailto:${lead.email}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                                            {lead.email}
                                        </a>
                                    ) : (
                                        <span style={{ color: '#94a3b8' }}>Chưa có email</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Chương trình đào tạo quan tâm:</span>
                                <div style={{ fontWeight: 600, fontSize: '1rem', marginTop: '4px' }}>
                                    {lead.interested_program_name || '—'}
                                </div>
                            </div>
                            <div>
                                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Người phụ trách hiện tại:</span>
                                <div style={{ fontWeight: 600, fontSize: '1rem', marginTop: '4px' }}>
                                    {lead.assigned_to_name || 'Chưa phân công'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Care Logs (Nhật ký chăm sóc) */}
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#0B1F3A', margin: 0 }}>
                                Nhật ký chăm sóc khách hàng ({careLogs.length})
                            </h2>
                            <button
                                type="button"
                                className="btn-filter"
                                onClick={() => setIsAddingCareLog(!isAddingCareLog)}
                            >
                                {isAddingCareLog ? 'Đóng form' : '+ Thêm tương tác'}
                            </button>
                        </div>

                        {/* Add Care Log Form */}
                        {isAddingCareLog && (
                            <form onSubmit={handleAddCareLog} style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 12px 0' }}>Ghi nhận tương tác mới</h3>
                                {careLogError && (
                                    <div className="modal-banner-error" role="alert" style={{ marginBottom: '12px' }}>
                                        {careLogError}
                                    </div>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                                            Hình thức tương tác:
                                        </label>
                                        <select
                                            value={careLogType}
                                            onChange={(e) => setCareLogType(e.target.value as InteractionType)}
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                        >
                                            <option value="call">Cuộc gọi</option>
                                            <option value="message">Tin nhắn (SMS/Zalo)</option>
                                            <option value="meeting">Gặp mặt trực tiếp</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                                            Thời gian tương tác:
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={careLogTime}
                                            onChange={(e) => setCareLogTime(e.target.value)}
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                                        Nội dung trao đổi:
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={careLogContent}
                                        onChange={(e) => setCareLogContent(e.target.value)}
                                        placeholder="Ghi chú chi tiết phản hồi của khách hàng, mức độ quan tâm..."
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <button
                                        type="button"
                                        className="btn-clear-filter"
                                        onClick={() => setIsAddingCareLog(false)}
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-filter"
                                        disabled={isSubmittingCareLog}
                                    >
                                        {isSubmittingCareLog ? 'Đang lưu...' : 'Lưu nhật ký'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {careLogs.length === 0 ? (
                            <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
                                Chưa có nhật ký chăm sóc nào được ghi nhận.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {careLogs.map((log) => (
                                    <div
                                        key={log.id}
                                        style={{
                                            borderLeft: '3px solid #0284c7',
                                            paddingLeft: '12px',
                                            paddingBottom: '8px',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 600, color: '#0B1F3A' }}>
                                                {log.interaction_type === 'call' ? '📞 Cuộc gọi' : log.interaction_type === 'message' ? '💬 Tin nhắn' : '🤝 Gặp gỡ'}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                {formatVietnamDateTime(log.interaction_at)}
                                            </span>
                                        </div>
                                        <p style={{ margin: '6px 0', color: '#334155', whiteSpace: 'pre-wrap' }}>
                                            {log.content}
                                        </p>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                            Bởi: {log.performed_by_name || 'Nhân sự'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Status History */}
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#0B1F3A', marginTop: 0, marginBottom: '16px' }}>
                            Lịch sử trạng thái tư vấn
                        </h2>
                        {statusHistory.length === 0 ? (
                            <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>Chưa có lịch sử thay đổi trạng thái.</p>
                        ) : (
                            <table className="leads-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr>
                                        <th>Thời gian</th>
                                        <th>Từ trạng thái</th>
                                        <th>Sang trạng thái</th>
                                        <th>Người thực hiện</th>
                                        <th>Ghi chú / Lý do</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statusHistory.map((h, i) => (
                                        <tr key={i}>
                                            <td>{formatVietnamDateTime(h.created_at)}</td>
                                            <td>{getLeadStatusLabel(h.old_status as LeadStatus)}</td>
                                            <td>
                                                <strong>{getLeadStatusLabel(h.new_status as LeadStatus)}</strong>
                                            </td>
                                            <td>{h.performed_by_name || 'Hệ thống'}</td>
                                            <td>{h.reason || h.notes || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Assignment History */}
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#0B1F3A', marginTop: 0, marginBottom: '16px' }}>
                            Lịch sử phân công nhân sự
                        </h2>
                        {assignmentHistory.length === 0 ? (
                            <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>Chưa có lịch sử phân công nhân sự.</p>
                        ) : (
                            <table className="leads-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr>
                                        <th>Thời gian</th>
                                        <th>Từ người phụ trách</th>
                                        <th>Sang người phụ trách</th>
                                        <th>Người thực hiện</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assignmentHistory.map((h, i) => (
                                        <tr key={h.id || i}>
                                            <td>{formatVietnamDateTime(h.created_at)}</td>
                                            <td>{h.old_assigned_to_name || 'Chưa phân công'}</td>
                                            <td><strong>{h.new_assigned_to_name || 'Chưa phân công'}</strong></td>
                                            <td>{h.performed_by_name || 'Hệ thống'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Right Column: Actions & Quick Forms */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Status Update Card */}
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '12px', color: '#0B1F3A' }}>
                            Cập nhật trạng thái
                        </h3>

                        {showRejectionForm ? (
                            <form onSubmit={handleConfirmRejection} data-testid="detail-rejection-form">
                                <div style={{ marginBottom: '12px' }}>
                                    <label htmlFor="detail-rejection-reason" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                                        Lý do từ chối *
                                    </label>
                                    <select
                                        id="detail-rejection-reason"
                                        value={rejectionReason}
                                        disabled={isUpdatingStatus}
                                        onChange={(e) => {
                                            setRejectionReason(e.target.value as RejectionReason)
                                            setPageError(null)
                                            setRejectionReasonError(null)
                                        }}
                                        style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: rejectionReasonError ? '1px solid #dc2626' : '1px solid #cbd5e1' }}
                                        data-testid="detail-rejection-reason-select"
                                    >
                                        <option value="">-- Chọn lý do từ chối --</option>
                                        {REJECTION_REASONS.map((r) => (
                                            <option key={r} value={r}>
                                                {r}
                                            </option>
                                        ))}
                                    </select>
                                    {rejectionReasonError && (
                                        <span style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px', display: 'block' }} data-testid="detail-rejection-reason-error">
                                            {rejectionReasonError}
                                        </span>
                                    )}
                                </div>
                                <div style={{ marginBottom: '12px' }}>
                                    <label htmlFor="detail-rejection-notes" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                                        Ghi chú thêm {rejectionReason === 'Khác' && <span style={{ color: '#dc2626' }}>*</span>}
                                    </label>
                                    <textarea
                                        id="detail-rejection-notes"
                                        rows={2}
                                        value={rejectionNotes}
                                        disabled={isUpdatingStatus}
                                        placeholder={rejectionReason === 'Khác' ? 'Vui lòng nhập lý do cụ thể...' : 'Nhập ghi chú thêm nếu có...'}
                                        onChange={(e) => {
                                            setRejectionNotes(e.target.value)
                                            setPageError(null)
                                            setRejectionNotesError(null)
                                        }}
                                        style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: rejectionNotesError ? '1px solid #dc2626' : '1px solid #cbd5e1' }}
                                        data-testid="detail-rejection-notes-input"
                                    />
                                    {rejectionNotesError && (
                                        <span style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px', display: 'block' }} data-testid="detail-rejection-notes-error">
                                            {rejectionNotesError}
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        className="btn-clear-filter"
                                        onClick={() => {
                                            if (isUpdatingStatus) return
                                            setShowRejectionForm(false)
                                            setSelectedStatus(lead.status)
                                            setPageError(null)
                                            setRejectionReasonError(null)
                                            setRejectionNotesError(null)
                                        }}
                                        disabled={isUpdatingStatus}
                                        data-testid="detail-rejection-cancel-btn"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-filter"
                                        style={{ background: '#ef4444' }}
                                        disabled={isUpdatingStatus}
                                        data-testid="detail-rejection-confirm-btn"
                                    >
                                        {isUpdatingStatus ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div>
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value as LeadStatus)}
                                    disabled={isUpdatingStatus || lead.status === 'converted'}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '10px' }}
                                >
                                    <option value="new">Mới tiếp nhận</option>
                                    <option value="consulting">Đang tư vấn</option>
                                    <option value="trial">Học thử / Quan tâm</option>
                                    <option value="won">Đã chốt (Chờ nhập học)</option>
                                    <option value="rejected">Không thành công</option>
                                    {lead.status === 'converted' && <option value="converted">Đã nhập học</option>}
                                </select>
                                <button
                                    type="button"
                                    className="btn-filter"
                                    style={{ width: '100%' }}
                                    onClick={() => handleUpdateStatus(selectedStatus)}
                                    disabled={isUpdatingStatus || selectedStatus === lead.status || lead.status === 'converted'}
                                >
                                    {isUpdatingStatus ? 'Đang cập nhật...' : 'Lưu trạng thái'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Assignment Card */}
                    {canManageAssignments && (
                        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '12px', color: '#0B1F3A' }}>
                                Phân công nhân sự
                            </h3>
                            <select
                                value={selectedAssigneeId}
                                onChange={(e) => setSelectedAssigneeId(e.target.value)}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '10px' }}
                            >
                                <option value="">-- Chưa phân công --</option>
                                {assignableUsers.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name} ({u.email})
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="btn-filter"
                                style={{ width: '100%' }}
                                onClick={handleAssign}
                                disabled={isAssigning || selectedAssigneeId === (lead.assigned_to_user_id || '')}
                            >
                                {isAssigning ? 'Đang phân công...' : 'Cập nhật phân công'}
                            </button>
                        </div>
                    )}

                    {/* Callback Date Card */}
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '8px', color: '#0B1F3A' }}>
                            Lịch nhắc gọi lại
                        </h3>
                        {lead.callback_date && (
                            <div style={{ fontSize: '0.85rem', marginBottom: '10px' }}>
                                Hiện tại: <strong>{formatCallbackDateDisplay(lead.callback_date)}</strong>
                                {isOverdue && (
                                    <span style={{ color: '#ef4444', fontWeight: 600, marginLeft: '6px' }}>
                                        (Đã quá hạn!)
                                    </span>
                                )}
                            </div>
                        )}
                        <input
                            type="date"
                            value={callbackDateInput}
                            onChange={(e) => setCallbackDateInput(e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '10px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                className="btn-filter"
                                style={{ flex: 1 }}
                                onClick={handleUpdateCallbackDate}
                                disabled={isUpdatingCallback}
                            >
                                {isUpdatingCallback ? 'Đang lưu...' : 'Lưu lịch gọi lại'}
                            </button>
                            {lead.callback_date && (
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ padding: '8px 12px' }}
                                    onClick={handleClearCallbackDate}
                                    disabled={isUpdatingCallback}
                                >
                                    Xóa
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default LeadDetailPage
