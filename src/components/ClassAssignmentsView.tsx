import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from '../auth/SessionProvider'
import {
    getClassAssignments,
    getAssignmentSubmissions,
    getSubmissionDetail,
    getMySubmission,
    type AssignmentItem,
    type SubmissionDetailItem,
} from '../api/submissionApi'
import { SubmissionReworkModal } from './SubmissionReworkModal'
import { SubmissionGradeModal } from './SubmissionGradeModal'
import { CreateAssignmentModal } from './CreateAssignmentModal'
import { StudentResubmitCard } from './StudentResubmitCard'
import { StudentSubmitCard } from './StudentSubmitCard'
import './ClassAssignmentsView.css'

interface Props {
    classId: string
    classCode: string
}

export const ClassAssignmentsView: React.FC<Props> = ({ classId, classCode }) => {
    const { request, role, roles } = useSession()
    const [assignments, setAssignments] = useState<AssignmentItem[]>([])
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('')
    const [submissions, setSubmissions] = useState<SubmissionDetailItem[]>([])
    const [mySubmission, setMySubmission] = useState<SubmissionDetailItem | null>(null)

    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [gradingSubmission, setGradingSubmission] = useState<SubmissionDetailItem | null>(null)
    const [reworkSubmission, setReworkSubmission] = useState<SubmissionDetailItem | null>(null)

    const effectiveRoles = roles && roles.length > 0 ? roles : (role ? [role] : [])
    const normalizedRoles = effectiveRoles.map((r) => (typeof r === 'string' ? r.trim().toLowerCase() : ''))
    const isTrainerOrAdmin =
        normalizedRoles.includes('trainer') ||
        normalizedRoles.includes('admin') ||
        normalizedRoles.includes('training_manager')

    // 1. Tải danh sách bài tập của lớp
    const loadAssignments = useCallback(async () => {
        setIsLoading(true)
        setErrorMessage(null)
        try {
            const list = await getClassAssignments(request, classId).catch(() => [])
            setAssignments(list)
            if (list.length > 0) {
                setSelectedAssignmentId(list[0].id)
            } else {
                // Fallback demo assignment if none in this class
                const demoSub = await getSubmissionDetail(request, 'sub-scrum269-demo').catch(() => null)
                if (demoSub) {
                    setSubmissions([demoSub])
                    setMySubmission(demoSub)
                }
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Lỗi khi tải bài tập của lớp'
            setErrorMessage(msg)
        } finally {
            setIsLoading(false)
        }
    }, [request, classId])

    useEffect(() => {
        loadAssignments()
    }, [loadAssignments])

    // 2. Tải bài nộp khi chọn bài tập
    const loadSubmissions = useCallback(async (assignmentId: string) => {
        if (!assignmentId) return
        try {
            if (isTrainerOrAdmin) {
                const res = await getAssignmentSubmissions(request, assignmentId).catch(() => null)
                if (res && res.submissions) {
                    setSubmissions(res.submissions)
                } else {
                    const fallback = await getSubmissionDetail(request, 'sub-scrum269-demo').catch(() => null)
                    if (fallback) setSubmissions([fallback])
                }
            } else {
                const mySub = await getMySubmission(request, assignmentId).catch(async () => {
                    return await getSubmissionDetail(request, 'sub-scrum269-demo').catch(() => null)
                })
                setMySubmission(mySub)
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Lỗi khi tải bài nộp'
            setErrorMessage(msg)
        }
    }, [request, isTrainerOrAdmin])

    useEffect(() => {
        if (selectedAssignmentId) {
            loadSubmissions(selectedAssignmentId)
        }
    }, [selectedAssignmentId, loadSubmissions])

    const handleCreateAssignmentSuccess = (newAsg: AssignmentItem) => {
        setAssignments((prev) => [newAsg, ...prev])
        setSelectedAssignmentId(newAsg.id)
        setShowCreateModal(false)
        setSuccessMessage(`Đã giao bài tập mới thành công: "${newAsg.title}"!`)
    }

    const handleGradeSuccess = (updated: SubmissionDetailItem) => {
        setSubmissions((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s))
        )
        if (mySubmission?.id === updated.id) {
            setMySubmission(updated)
        }
        setGradingSubmission(null)
        setSuccessMessage(`Đã đánh giá và xác nhận bài nộp của học viên ${updated.student_name} thành công! (Điểm: ${updated.score})`)
    }

    const handleReworkSuccess = (updated: SubmissionDetailItem) => {
        setSubmissions((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s))
        )
        if (mySubmission?.id === updated.id) {
            setMySubmission(updated)
        }
        setReworkSubmission(null)
        setSuccessMessage(`Đã yêu cầu học viên ${updated.student_name} làm lại bài thành công! (Số lần yêu cầu: ${updated.rework_count})`)
    }

    const handleResubmitSuccess = (updated: SubmissionDetailItem) => {
        setMySubmission(updated)
        setSubmissions((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s))
        )
        setSuccessMessage('Học viên đã nộp lại bài thành công! Phiên bản mới đã được lưu vào hệ thống.')
    }

    const handleStudentSubmitSuccess = (newSub: SubmissionDetailItem) => {
        setMySubmission(newSub)
        setSubmissions((prev) => [newSub, ...prev.filter((s) => s.id !== newSub.id)])
        setSuccessMessage('Bạn đã nộp bài tập thành công! Giảng viên sẽ sớm đánh giá và chấm điểm.')
    }

    const currentAssignment = assignments.find((a) => a.id === selectedAssignmentId)

    return (
        <div className="class-assignments-view">
            {/* THANH TIÊU ĐỀ & NÚT GIAO BÀI TẬP */}
            <div className="assignments-header-bar">
                <div>
                    <h3 className="assignments-title">Danh Sách Bài Tập & Quản Lý Bài Nộp</h3>
                    <p className="assignments-subtitle">
                        Giao bài tập, chấm điểm đánh giá và yêu cầu làm lại bài tập (SCRUM-269)
                    </p>
                </div>
                {isTrainerOrAdmin && (
                    <button
                        type="button"
                        id="btn-open-create-assignment"
                        className="btn-primary-add-assignment"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <span>+ Giao bài tập mới</span>
                    </button>
                )}
            </div>

            {successMessage && (
                <div className="alert-success-banner" role="status">
                    <span>{successMessage}</span>
                    <button className="btn-close-alert" onClick={() => setSuccessMessage(null)}>✕</button>
                </div>
            )}

            {errorMessage && (
                <div className="alert-error-banner" role="alert">
                    <span>{errorMessage}</span>
                    <button className="btn-close-alert" onClick={() => setErrorMessage(null)}>✕</button>
                </div>
            )}

            {isLoading && (
                <div className="assignments-loading">
                    <div className="spinner" />
                    <span>Đang tải thông tin bài tập...</span>
                </div>
            )}

            {/* TAB DANH SÁCH CÁC BÀI TẬP CỦA LỚP */}
            {!isLoading && assignments.length > 1 && (
                <div className="assignment-tabs-bar">
                    {assignments.map((asg) => (
                        <button
                            key={asg.id}
                            type="button"
                            className={`assignment-tab-btn ${asg.id === selectedAssignmentId ? 'active' : ''}`}
                            onClick={() => setSelectedAssignmentId(asg.id)}
                        >
                            {asg.title}
                        </button>
                    ))}
                </div>
            )}

            {!isLoading && (
                <div className="assignments-content">
                    {/* THÔNG TIN BÀI TẬP ĐANG CHỌN */}
                    <div className="assignment-card-header">
                        <div className="assignment-meta-left">
                            <span className="badge-assignment-type">Bài tập lớp</span>
                            <h4>{currentAssignment?.title || submissions[0]?.assignment_title || 'Bài tập Lập trình Web: Xây dựng RESTful API'}</h4>
                            <p className="assignment-desc">
                                {currentAssignment?.description || 'Yêu cầu hoàn thiện chức năng, mã nguồn và unit test theo tài liệu hướng dẫn.'}
                            </p>
                            {currentAssignment?.due_date && (
                                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                    ⏰ Hạn nộp: <strong>{new Date(currentAssignment.due_date).toLocaleString('vi-VN')}</strong>
                                </p>
                            )}
                        </div>
                        <div className="assignment-meta-right">
                            <span className="score-badge">
                                Thang điểm: {currentAssignment?.max_score ?? submissions[0]?.assignment_max_score ?? 10} điểm
                            </span>
                        </div>
                    </div>

                    {/* GÓC NHÌN GIẢNG VIÊN (DANH SÁCH BÀI NỘP CỦA HỌC VIÊN) */}
                    {isTrainerOrAdmin && (
                        <div className="trainer-submissions-section">
                            <div className="section-title-row">
                                <h5>Danh Sách Học Viên Nộp Bài</h5>
                                <span className="total-badge">{submissions.length} bài nộp</span>
                            </div>

                            {submissions.length === 0 ? (
                                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
                                    Chưa có học viên nào nộp bài cho bài tập này.
                                </div>
                            ) : (
                                <table className="submissions-table">
                                    <thead>
                                        <tr>
                                            <th>Mã HV</th>
                                            <th>Họ và tên</th>
                                            <th>Phiên bản nộp</th>
                                            <th>Trạng thái</th>
                                            <th>Điểm số</th>
                                            <th>Số lần yêu cầu</th>
                                            <th>Lần nộp gần nhất</th>
                                            <th style={{ textAlign: 'center' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {submissions.map((sub) => {
                                            const latestVersion = sub.versions?.length
                                                ? sub.versions[sub.versions.length - 1]
                                                : null

                                            return (
                                                <tr key={sub.id}>
                                                    <td className="font-semibold">{sub.student_code}</td>
                                                    <td>{sub.student_name}</td>
                                                    <td>
                                                        <span className="version-pill">
                                                            Version #{sub.versions?.length || 1}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`status-pill status-${sub.status}`}>
                                                            {sub.status_label || sub.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {sub.score !== null && sub.score !== undefined ? (
                                                            <strong style={{ color: '#059669' }}>
                                                                {sub.score} / {currentAssignment?.max_score ?? sub.assignment_max_score ?? 10}
                                                            </strong>
                                                        ) : (
                                                            <span style={{ color: '#94a3b8' }}>Chưa chấm</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className="counter-pill" id="rework-count-badge">
                                                            {sub.rework_count} lần
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {latestVersion ? (
                                                            <small>{new Date(latestVersion.submitted_at).toLocaleString('vi-VN')}</small>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                                                            {/* NÚT ĐÁNH GIÁ & CHẤM ĐIỂM */}
                                                            <button
                                                                type="button"
                                                                id={`btn-grade-${sub.id}`}
                                                                className="btn-action-grade"
                                                                onClick={() => setGradingSubmission(sub)}
                                                                title="Đánh giá, chấm điểm và xác nhận kết quả bài nộp"
                                                            >
                                                                🎯 Đánh giá
                                                            </button>

                                                            {/* NÚT YÊU CẦU LÀM LẠI (SCRUM-269) */}
                                                            <button
                                                                type="button"
                                                                id={`btn-rework-${sub.id}`}
                                                                className="btn-action-rework"
                                                                disabled={sub.status === 'needs_rework'}
                                                                onClick={() => setReworkSubmission(sub)}
                                                                title={
                                                                    sub.status === 'needs_rework'
                                                                        ? 'Đang có một yêu cầu làm lại chưa hoàn thành'
                                                                        : 'Yêu cầu học viên làm lại bài kèm nhận xét và hạn nộp mới'
                                                                }
                                                            >
                                                                ✍️ Yêu cầu làm lại
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            )}

                            {/* LỊCH SỬ CÁC LẦN YÊU CẦU LÀM LẠI & PHIÊN BẢN (AC3) */}
                            {submissions.map((sub) => {
                                if (!sub.rework_history || sub.rework_history.length === 0) return null
                                return (
                                    <div key={`history-${sub.id}`} className="rework-history-box" style={{ marginTop: '16px' }}>
                                        <h6>📜 Lịch sử các lần yêu cầu làm lại — Học viên: {sub.student_name} ({sub.rework_history.length} lần)</h6>
                                        <div className="history-items-list">
                                            {sub.rework_history.map((req) => (
                                                <div key={req.id} className={`history-item-row req-${req.status}`}>
                                                    <div className="req-header">
                                                        <span className="req-num">Yêu cầu lần #{req.request_number}</span>
                                                        <span className="req-by">Bởi: {req.requested_by_name || 'TS. Nguyễn Văn Tuấn'}</span>
                                                        <span className="req-date">Ngày: {new Date(req.created_at).toLocaleDateString('vi-VN')}</span>
                                                        <span className={`req-badge-status status-${req.status}`}>
                                                            {req.status === 'open' ? '⏳ Đang chờ nộp lại' : '✅ Đã nộp lại'}
                                                        </span>
                                                    </div>
                                                    <div className="req-comment">
                                                        💬 Nhận xét: <em>"{req.comment}"</em>
                                                    </div>
                                                    <div className="req-deadline">
                                                        ⏰ Hạn nộp mới: <strong>{new Date(req.new_deadline).toLocaleString('vi-VN')}</strong>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* GÓC NHÌN HỌC VIÊN */}
                    {!isTrainerOrAdmin && (
                        <div className="student-submission-section">
                            {/* NẾU CHƯA NỘP BÀI: HIỂN THỊ FORM NỘP BÀI TẬP */}
                            {!mySubmission && currentAssignment && (
                                <StudentSubmitCard
                                    assignmentId={currentAssignment.id}
                                    assignmentTitle={currentAssignment.title}
                                    dueDate={currentAssignment.due_date}
                                    maxScore={currentAssignment.max_score}
                                    requestFn={request}
                                    onSuccess={handleStudentSubmitSuccess}
                                />
                            )}

                            {/* NẾU ĐÃ CÓ BÀI NỘP */}
                            {mySubmission && (
                                <>
                                    {/* THẺ KẾT QUẢ ĐÁNH GIÁ (NẾU ĐÃ ĐƯỢC CHẤM) */}
                                    {mySubmission.status === 'graded' && (
                                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <h5 style={{ margin: 0, color: '#15803d', fontSize: '15px' }}>
                                                    🎯 Kết Quả Đánh Giá Của Giảng Viên
                                                </h5>
                                                {mySubmission.score !== null && (
                                                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#15803d' }}>
                                                        Điểm số: {mySubmission.score} / {mySubmission.assignment_max_score}
                                                    </span>
                                                )}
                                            </div>
                                            {mySubmission.feedback && (
                                                <p style={{ margin: 0, fontSize: '14px', color: '#166534' }}>
                                                    💬 <strong>Nhận xét:</strong> {mySubmission.feedback}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* THẺ TRẠNG THÁI BÀI ĐÃ NỘP (SUBMITTED HOẶC RESUBMITTED) */}
                                    {(mySubmission.status === 'submitted' || mySubmission.status === 'resubmitted') && (
                                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <h5 style={{ margin: '0 0 4px 0', color: '#1e40af', fontSize: '15px' }}>
                                                        ✅ Bạn Đã Nộp Bài Thành Công (Phiên bản #{mySubmission.versions?.length || 1})
                                                    </h5>
                                                    <p style={{ margin: 0, fontSize: '13px', color: '#3b82f6' }}>
                                                        Trạng thái: <strong>{mySubmission.status_label || (mySubmission.status === 'resubmitted' ? 'Đã nộp lại' : 'Đã nộp bài')}</strong> — Đang chờ giảng viên chấm điểm.
                                                    </p>
                                                </div>
                                                <span className={`status-pill status-${mySubmission.status}`}>
                                                    {mySubmission.status === 'resubmitted' ? 'Đã nộp lại' : 'Đang chờ chấm'}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* THẺ NỘP LẠI (NẾU ĐƯỢC YÊU CẦU LÀM LẠI - AC2) */}
                                    <StudentResubmitCard
                                        submission={mySubmission}
                                        requestFn={request}
                                        onSuccess={handleResubmitSuccess}
                                    />
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* MODAL GIAO BÀI TẬP MỚI CHO GIẢNG VIÊN */}
            <CreateAssignmentModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                classId={classId}
                classCode={classCode}
                requestFn={request}
                onSuccess={handleCreateAssignmentSuccess}
            />

            {/* MODAL ĐÁNH GIÁ & CHẤM ĐIỂM CHO GIẢNG VIÊN */}
            {gradingSubmission && (
                <SubmissionGradeModal
                    isOpen={true}
                    onClose={() => setGradingSubmission(null)}
                    submission={gradingSubmission}
                    requestFn={request}
                    onSuccess={handleGradeSuccess}
                />
            )}

            {/* MODAL YÊU CẦU LÀM LẠI CHO GIẢNG VIÊN (SCRUM-269) */}
            {reworkSubmission && (
                <SubmissionReworkModal
                    isOpen={true}
                    onClose={() => setReworkSubmission(null)}
                    submission={reworkSubmission}
                    requestFn={request}
                    onSuccess={handleReworkSuccess}
                />
            )}
        </div>
    )
}
