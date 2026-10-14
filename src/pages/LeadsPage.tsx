import { useEffect, useState, useMemo } from 'react'
import { useSession } from '../auth/SessionProvider'
import {
    getLeads,
    getLead,
    updateLeadStatus,
    assignLead,
    getAssignableUsers,
    getLeadAssignmentHistory,
    bulkAssignLeads,
    getLeadStatusLabel,
    getLeadSourceLabel,
    LEAD_SOURCES,
    createLead,
    updateLead,
    deleteLead,
    checkLeadPhone,
    LEAD_STATUS_BADGE_CLASSES,
    getLeadPipeline,
    getLeadStatusHistory,
    PIPELINE_STATUS_KEYS,
    REJECTION_REASONS,
    createLeadCareLog,
    getLeadCareLogs,
    updateLeadCallbackDate,
    formatCallbackDateDisplay,
    isLeadCallbackOverdue,
    convertLeadToStudent,
    getLeadStudent,
    ApiError,
    type Lead,
    type LeadStatus,
    type AssignableUser,
    type LeadAssignmentHistoryItem,
    type LeadStatusHistoryItem,
    type PipelineData,
    type RejectionReason,
    type InteractionType,
    type LeadCareLog,
} from '../api/leadApi'
import { getErrorMessage } from '../utils/errorMessages'
import { getTrainingPrograms, type TrainingProgram } from '../api/trainingProgramApi'
import { Breadcrumb } from '../components/Breadcrumb'
import { formatVietnamDateTime, isWithin24Hours } from '../utils/dateUtils'
import {
    getReadLeadIds,
    markLeadAsRead,
    emitUnreadCount,
    countUnreadLeads,
} from '../utils/leadReadStorage'
import './LeadsPage.css'

export function LeadsPage() {
    const { request, role, roles = [], permissions = [] } = useSession()

    const userRoles = useMemo(() => {
        const set = new Set<string>()
        if (role) set.add(role.toLowerCase())
        roles.forEach((r) => set.add(r.toLowerCase()))
        return set
    }, [role, roles])

    const canDeleteLead =
        permissions.includes('lead.delete') ||
        userRoles.has('training_manager')

    const canManageAssignments =
        permissions.includes('course.manage') ||
        userRoles.has('training_manager') ||
        userRoles.has('admin')

    const [leads, setLeads] = useState<Lead[]>([])
    const [readLeadIds, setReadLeadIds] = useState<Set<string>>(() => getReadLeadIds())
    const [page, setPage] = useState<number>(1)
    const [pageSize] = useState<number>(10)
    const [total, setTotal] = useState<number>(0)
    const [totalPages, setTotalPages] = useState<number>(0)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [pageError, setPageError] = useState<string | null>(null)
    const [pageSuccess, setPageSuccess] = useState<string | null>(null)

    // Filter & Search states (SCRUM-128)
    const [search, setSearch] = useState<string>('')
    const [debouncedSearch, setDebouncedSearch] = useState<string>('')
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [sourceFilter, setSourceFilter] = useState<string>('')
    const [assigneeFilter, setAssigneeFilter] = useState<string>('')
    const [dateFrom, setDateFrom] = useState<string>('')
    const [dateTo, setDateTo] = useState<string>('')

    // Modal chi tiết Lead
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false)
    const [selectedStatus, setSelectedStatus] = useState<LeadStatus>('new')
    const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false)
    const [statusError, setStatusError] = useState<string | null>(null)
    const [statusSuccess, setStatusSuccess] = useState<string | null>(null)

    // Phân công Lead (SCRUM-127)
    const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([])
    const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('')
    const [isAssigning, setIsAssigning] = useState<boolean>(false)
    const [assignmentError, setAssignmentError] = useState<string | null>(null)
    const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null)

    // Lịch sử phân công Lead (SCRUM-127)
    const [assignmentHistory, setAssignmentHistory] = useState<LeadAssignmentHistoryItem[]>([])
    const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false)
    const [historyError, setHistoryError] = useState<string | null>(null)

    // Phân công nhiều Lead (SCRUM-127)
    const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())
    const [bulkAssigneeId, setBulkAssigneeId] = useState<string>('')
    const [isBulkAssigning, setIsBulkAssigning] = useState<boolean>(false)
    const [bulkAssignError, setBulkAssignError] = useState<string | null>(null)

    // Chế độ xem: 'list' (Danh sách) hoặc 'pipeline' (Bảng phễu - SCRUM-213)
    const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list')
    const [pipelineData, setPipelineData] = useState<PipelineData | null>(null)
    const [isLoadingPipeline, setIsLoadingPipeline] = useState<boolean>(false)
    const [pipelineError, setPipelineError] = useState<string | null>(null)

    // Kéo thả Kanban (SCRUM-213)
    const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
    const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null)

    // Modal Xác nhận từ chối Lead (SCRUM-213)
    const [isRejectionModalOpen, setIsRejectionModalOpen] = useState<boolean>(false)
    const [rejectionTargetLead, setRejectionTargetLead] = useState<Lead | null>(null)
    const [rejectionReason, setRejectionReason] = useState<RejectionReason>('Không còn nhu cầu')
    const [rejectionNotes, setRejectionNotes] = useState<string>('')
    const [rejectionError, setRejectionError] = useState<string | null>(null)

    // Lịch sử trạng thái Lead (SCRUM-213)
    const [statusHistory, setStatusHistory] = useState<LeadStatusHistoryItem[]>([])
    const [isLoadingStatusHistory, setIsLoadingStatusHistory] = useState<boolean>(false)
    const [statusHistoryError, setStatusHistoryError] = useState<string | null>(null)

    // Nhật ký chăm sóc Lead (SCRUM-214)
    const [careLogs, setCareLogs] = useState<LeadCareLog[]>([])
    const [isLoadingCareLogs, setIsLoadingCareLogs] = useState<boolean>(false)
    const [careLogsError, setCareLogsError] = useState<string | null>(null)
    const [isAddCareLogOpen, setIsAddCareLogOpen] = useState<boolean>(false)
    const [careLogType, setCareLogType] = useState<InteractionType>('call')
    const [careLogContent, setCareLogContent] = useState<string>('')
    const [careLogTime, setCareLogTime] = useState<string>('')
    const [isSubmittingCareLog, setIsSubmittingCareLog] = useState<boolean>(false)
    const [careLogFormError, setCareLogFormError] = useState<string | null>(null)

    // Ngày nhắc gọi lại (SCRUM-214 - Sub-task 214-02)
    const [callbackDateInput, setCallbackDateInput] = useState<string>('')
    const [isUpdatingCallbackDate, setIsUpdatingCallbackDate] = useState<boolean>(false)
    const [callbackDateError, setCallbackDateError] = useState<string | null>(null)
    const [callbackDateSuccess, setCallbackDateSuccess] = useState<string | null>(null)

    // Chương trình đào tạo (SCRUM-126)
    const [trainingPrograms, setTrainingPrograms] = useState<TrainingProgram[]>([])

    // Modal Tạo / Sửa Lead (SCRUM-126)
    const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false)
    const [editingLead, setEditingLead] = useState<Lead | null>(null)
    const [formFullName, setFormFullName] = useState<string>('')
    const [formPhone, setFormPhone] = useState<string>('')
    const [formEmail, setFormEmail] = useState<string>('')
    const [formSource, setFormSource] = useState<string>('direct')
    const [formInterestedProgramId, setFormInterestedProgramId] = useState<string>('')
    const [isSubmittingForm, setIsSubmittingForm] = useState<boolean>(false)
    const [formErrors, setFormErrors] = useState<{
        full_name?: string
        phone?: string
        email?: string
    }>({})
    const [duplicatePhoneWarning, setDuplicatePhoneWarning] = useState<string | null>(null)
    const [formApiError, setFormApiError] = useState<string | null>(null)

    // Modal Xác nhận xóa Lead (Custom Centered Modal)
    const [deletingLead, setDeletingLead] = useState<Lead | null>(null)
    const [isDeletingLead, setIsDeletingLead] = useState<boolean>(false)

    // Trigger refetch để đồng bộ danh sách sau mutations khi đang có bộ lọc (SCRUM-128)
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0)

    // Chuyển đổi Lead sang Hồ sơ học viên (SCRUM-215)
    const [isConverting, setIsConverting] = useState(false)
    const [convertError, setConvertError] = useState<string | null>(null)
    const [convertSuccess, setConvertSuccess] = useState<string | null>(null)
    const [convertedStudentCode, setConvertedStudentCode] = useState<string | null>(null)
    const [accountResult, setAccountResult] = useState<{ accountCreated?: boolean; emailSent?: boolean } | null>(null)

    // Debounce search input (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
        }, 300)
        return () => clearTimeout(timer)
    }, [search])

    // Tải trước danh sách nhân sự phụ trách (chỉ lấy vai trò Tư vấn tuyển sinh - SCRUM-127)
    useEffect(() => {
        getAssignableUsers(request)
            .then((users) => {
                const validUsers = users.filter((u) => {
                    if (!u.id || u.id.startsWith('demo-')) return false
                    const roleLower = (u.role || '').toLowerCase().trim()
                    return roleLower === 'consultant' || roleLower === 'tư vấn tuyển sinh'
                })
                setAssignableUsers(validUsers)
            })
            .catch(() => {})
    }, [request])

    // Tải danh sách chương trình đào tạo thật từ API (SCRUM-126)
    useEffect(() => {
        getTrainingPrograms(request, { page_size: 100 })
            .then((data) => {
                setTrainingPrograms(data.items || [])
            })
            .catch(() => {})
    }, [request])

    // Kiểm tra trùng lặp số điện thoại trong danh sách Lead (SCRUM-126)
    useEffect(() => {
        const trimmedPhone = formPhone.trim()
        if (!isFormModalOpen || trimmedPhone.length < 8) {
            return
        }

        const timer = setTimeout(() => {
            checkLeadPhone(request, trimmedPhone, editingLead?.id)
                .then((res) => {
                    if (res.exists) {
                        const extra = res.lead?.full_name
                            ? ` (Đã tồn tại Lead: ${res.lead.full_name}${res.lead.phone ? ` – ${res.lead.phone}` : ''})`
                            : ''
                        setDuplicatePhoneWarning(
                            `Số điện thoại này đã tồn tại trong danh sách khách hàng tiềm năng.${extra}`,
                        )
                    } else {
                        setDuplicatePhoneWarning(null)
                    }
                })
                .catch(() => {
                    // Bỏ qua lỗi mạng nền
                })
        }, 350)

        return () => clearTimeout(timer)
    }, [formPhone, editingLead, isFormModalOpen, request])

    // Tải danh sách Lead với phân trang, tìm kiếm và lọc
    useEffect(() => {
        let isMounted = true

        getLeads(request, {
            page,
            page_size: pageSize,
            search: debouncedSearch.trim() || undefined,
            status: statusFilter || undefined,
            source: sourceFilter || undefined,
            assigned_to_user_id: assigneeFilter || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        })
            .then((data) => {
                if (isMounted) {
                    setLeads(data.items)
                    setTotal(data.total)
                    setPage(data.page)
                    setTotalPages(data.total_pages)
                    setPageError(null)
                    setIsLoading(false)

                    // Phát sự kiện cập nhật unread count cho notification bell
                    emitUnreadCount(countUnreadLeads(data.items))

                    // Nếu page > 1 trở thành rỗng sau mutation, lùi về trang trước
                    if (data.items.length === 0 && data.total > 0 && page > 1) {
                        setPage((p) => Math.max(1, p - 1))
                    }
                }
            })
            .catch((err: unknown) => {
                if (isMounted) {
                    const isForbidden =
                        (err instanceof ApiError && (err.status === 403 || err.code === 'FORBIDDEN')) ||
                        (err && typeof err === 'object' && (
                            ('status' in err && (err as { status?: unknown }).status === 403) ||
                            ('code' in err && ((err as { code?: unknown }).code === 'FORBIDDEN' || (err as { code?: unknown }).code === 'PERMISSION_DENIED'))
                        )) ||
                        (err instanceof Error && (
                            err.message === 'FORBIDDEN' ||
                            err.message === '403' ||
                            err.message.includes('403') ||
                            err.message.toUpperCase().includes('FORBIDDEN') ||
                            err.message.toUpperCase().includes('PERMISSION_DENIED')
                        ))

                    const isUnauthorized =
                        (err instanceof ApiError && (err.status === 401 || err.code === 'UNAUTHORIZED')) ||
                        (err && typeof err === 'object' && (
                            ('status' in err && (err as { status?: unknown }).status === 401) ||
                            ('code' in err && ((err as { code?: unknown }).code === 'UNAUTHORIZED' || (err as { code?: unknown }).code === 'AUTH_REQUIRED'))
                        )) ||
                        (err instanceof Error && (
                            err.message === 'UNAUTHORIZED' ||
                            err.message === '401' ||
                            err.message.includes('401') ||
                            err.message.toUpperCase().includes('UNAUTHORIZED') ||
                            err.message.toUpperCase().includes('AUTH_REQUIRED')
                        ))

                    let message: string
                    if (isForbidden) {
                        message = 'Bạn không có quyền truy cập chức năng Tư vấn tuyển sinh.'
                    } else if (isUnauthorized) {
                        message = 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.'
                    } else {
                        message = getErrorMessage(err, 'Lỗi khi tải danh sách tư vấn.')
                    }

                    setPageError(message)
                    setLeads([])
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [
        request,
        page,
        pageSize,
        debouncedSearch,
        statusFilter,
        sourceFilter,
        assigneeFilter,
        dateFrom,
        dateTo,
        refreshTrigger,
    ])

    const handleClearFilters = () => {
        setSearch('')
        setDebouncedSearch('')
        setStatusFilter('')
        setSourceFilter('')
        setAssigneeFilter('')
        setDateFrom('')
        setDateTo('')
        setPage(1)
    }

    const loadAssignmentHistory = async (leadId: string) => {
        setIsLoadingHistory(true)
        setHistoryError(null)
        try {
            const history = await getLeadAssignmentHistory(request, leadId)
            setAssignmentHistory(history)
        } catch (err: unknown) {
            setHistoryError(getErrorMessage(err, 'Không thể tải lịch sử phân công.'))
        } finally {
            setIsLoadingHistory(false)
        }
    }

    // Tải dữ liệu Bảng phễu Lead (SCRUM-213)
    useEffect(() => {
        let isMounted = true

        getLeadPipeline(request)
            .then((data) => {
                if (isMounted) {
                    setPipelineData(data)
                    setIsLoadingPipeline(false)
                }
            })
            .catch((err: unknown) => {
                if (isMounted) {
                    setPipelineError(getErrorMessage(err, 'Không thể tải bảng phễu Lead.'))
                    setIsLoadingPipeline(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [request, refreshTrigger])

    const loadStatusHistory = async (leadId: string) => {
        setIsLoadingStatusHistory(true)
        setStatusHistoryError(null)
        try {
            const history = await getLeadStatusHistory(request, leadId)
            setStatusHistory(history)
        } catch (err: unknown) {
            setStatusHistoryError(getErrorMessage(err, 'Không thể tải lịch sử trạng thái.'))
        } finally {
            setIsLoadingStatusHistory(false)
        }
    }

    const loadCareLogs = async (leadId: string) => {
        setIsLoadingCareLogs(true)
        setCareLogsError(null)
        try {
            const logs = await getLeadCareLogs(request, leadId)
            setCareLogs(logs)
        } catch (err: unknown) {
            setCareLogsError(getErrorMessage(err, 'Không thể tải nhật ký chăm sóc.'))
        } finally {
            setIsLoadingCareLogs(false)
        }
    }

    const handleOpenDetail = async (leadId: string) => {
        setStatusError(null)
        setStatusSuccess(null)
        setAssignmentError(null)
        setAssignmentSuccess(null)

        // Đánh dấu lead đã xem (UX read state) - KHÔNG thay đổi lead.status nghiệp vụ ("Mới tiếp nhận")
        markLeadAsRead(leadId)
        setReadLeadIds((prev) => {
            const next = new Set(prev)
            next.add(leadId)
            return next
        })

        try {
            const detail = await getLead(request, leadId)
            let finalDetail = detail
            if (!finalDetail.student_code && finalDetail.status === 'converted') {
                try {
                    const linked = await getLeadStudent(request, leadId)
                    if (linked) {
                        finalDetail = {
                            ...finalDetail,
                            student_code: linked.student_code,
                            student: linked,
                        }
                    }
                } catch {
                    // ignore
                }
            }
            setSelectedLead(finalDetail)
            setConvertedStudentCode(finalDetail.student_code || finalDetail.student?.student_code || null)
            setSelectedStatus(finalDetail.status)
            setSelectedAssigneeId(finalDetail.assigned_to_user_id || '')
            setCallbackDateInput(detail.callback_date ? detail.callback_date.slice(0, 10) : '')
            setCallbackDateError(null)
            setCallbackDateSuccess(null)
            setIsDetailModalOpen(true)
            void loadAssignmentHistory(leadId)
            void loadStatusHistory(leadId)
            void loadCareLogs(leadId)
        } catch (err: unknown) {
            const message = getErrorMessage(err, 'Không thể tải chi tiết tư vấn.')
            setPageError(message)
        }
    }

    const handleConvertToStudent = async (leadId: string) => {
        if (isConverting) return
        const targetLead = leads.find((l) => l.id === leadId) || (selectedLead?.id === leadId ? selectedLead : null)
        if (targetLead && (targetLead.status === 'converted' || targetLead.status !== 'won')) {
            setConvertError('Khách hàng đã nhập học hoặc chưa chốt, không thể chuyển đổi.')
            return
        }
        setIsConverting(true)
        setConvertError(null)
        setConvertSuccess(null)

        try {
            const res = await convertLeadToStudent(request, leadId)
            const code = res?.student?.student_code
            const accountCreated = res?.account_created
            const emailSent = res?.email_sent

            let successMsg = 'Chuyển đổi khách hàng thành học viên thành công.'
            if (code) {
                successMsg += ` Mã học viên: ${code}.`
            }
            if (accountCreated) {
                successMsg += emailSent
                    ? ' Đã tạo tài khoản và gửi email thông báo.'
                    : ' Đã tạo tài khoản đăng nhập.'
            }

            setConvertSuccess(successMsg)
            setConvertedStudentCode(code || null)
            setAccountResult({ accountCreated, emailSent })
            setSelectedLead((prev) =>
                prev && prev.id === leadId
                    ? {
                          ...prev,
                          status: 'converted',
                          ...(code ? { student_code: code } : {}),
                          student: res?.student
                              ? {
                                    id: res.student.id,
                                    student_code: res.student.student_code,
                                    user_id: res.user_id || res.student.user_id,
                                    full_name: res.student.full_name,
                                    account_email: res.student.email || prev.email,
                                    account_status: accountCreated ? 'Đã tạo' : 'Chưa tạo',
                                    status: res.student.status,
                                    program_code: res.student.program_code,
                                    program_name: res.student.program_name,
                                }
                              : prev.student,
                      }
                    : prev,
            )
            setSelectedStatus('converted')
            setLeads((prev) =>
                prev.map((l) =>
                    l.id === leadId
                        ? {
                              ...l,
                              status: 'converted',
                              ...(code ? { student_code: code } : {}),
                          }
                        : l,
                ),
            )
            setPipelineData((prev) => {
                if (!prev) return prev
                const newCols = prev.columns.map((c) => ({
                    ...c,
                    leads: c.leads.filter((l) => l.id !== leadId),
                    count: c.status === 'won' ? Math.max(0, c.count - 1) : c.count,
                }))
                const newCounts = { ...prev.counts }
                if (newCounts['won']) newCounts['won'] = Math.max(0, newCounts['won'] - 1)
                return {
                    ...prev,
                    columns: newCols,
                    leads: prev.leads.filter((l) => l.id !== leadId),
                    counts: newCounts,
                    total: Math.max(0, prev.total - 1),
                }
            })
            setTimeout(() => setConvertSuccess(null), 5000)
        } catch (err: unknown) {
            setConvertError(getErrorMessage(err, 'Không thể chuyển đổi khách hàng thành học viên.'))
        } finally {
            setIsConverting(false)
        }
    }

    const handleCloseModal = () => {
        setIsDetailModalOpen(false)
        setSelectedLead(null)
        setAssignmentHistory([])
        setIsLoadingHistory(false)
        setHistoryError(null)
        setStatusHistory([])
        setIsLoadingStatusHistory(false)
        setStatusHistoryError(null)
        setStatusError(null)
        setStatusSuccess(null)
        setAssignmentError(null)
        setAssignmentSuccess(null)
        setConvertError(null)
        setConvertSuccess(null)
        setConvertedStudentCode(null)
        setAccountResult(null)
        setCareLogs([])
        setIsLoadingCareLogs(false)
        setCareLogsError(null)
        setIsAddCareLogOpen(false)
        setCareLogType('call')
        setCareLogContent('')
        setCareLogTime('')
        setCareLogFormError(null)
        setCallbackDateInput('')
        setCallbackDateError(null)
        setCallbackDateSuccess(null)
        setIsUpdatingCallbackDate(false)
    }

    const handleAddCareLogSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedLead || isSubmittingCareLog) return

        if (!careLogType || !['call', 'message', 'meeting'].includes(careLogType)) {
            setCareLogFormError('Vui lòng chọn loại tương tác hợp lệ (Gọi, Nhắn hoặc Gặp).')
            return
        }

        if (!careLogContent.trim()) {
            setCareLogFormError('Vui lòng nhập nội dung tương tác.')
            return
        }

        if (!careLogTime.trim()) {
            setCareLogFormError('Vui lòng chọn thời điểm tương tác.')
            return
        }

        setIsSubmittingCareLog(true)
        setCareLogFormError(null)

        try {
            const created = await createLeadCareLog(request, selectedLead.id, {
                interaction_type: careLogType,
                content: careLogContent.trim(),
                interaction_at: careLogTime.trim(),
            })

            setCareLogs((prev) => [created, ...prev])
            setIsAddCareLogOpen(false)
            setCareLogContent('')
            setCareLogFormError(null)
        } catch (err: unknown) {
            setCareLogFormError(getErrorMessage(err, 'Không thể lưu nhật ký tương tác.'))
        } finally {
            setIsSubmittingCareLog(false)
        }
    }

    const handleSaveCallbackDate = async () => {
        if (!selectedLead || isUpdatingCallbackDate) return
        setIsUpdatingCallbackDate(true)
        setCallbackDateError(null)
        setCallbackDateSuccess(null)

        const targetDate = callbackDateInput.trim() || null
        try {
            const updated = await updateLeadCallbackDate(request, selectedLead.id, targetDate)
            setSelectedLead(updated)
            setLeads((prev) =>
                prev.map((l) => (l.id === updated.id ? { ...l, callback_date: updated.callback_date } : l)),
            )
            if (pipelineData) {
                setPipelineData((prev) =>
                    prev
                        ? {
                              ...prev,
                              leads: prev.leads.map((l) =>
                                  l.id === updated.id ? { ...l, callback_date: updated.callback_date } : l,
                              ),
                              columns: prev.columns.map((col) => ({
                                  ...col,
                                  leads: col.leads.map((l) =>
                                      l.id === updated.id ? { ...l, callback_date: updated.callback_date } : l,
                                  ),
                              })),
                          }
                        : null,
                )
            }
            setCallbackDateSuccess(targetDate ? 'Lưu ngày nhắc gọi lại thành công.' : 'Đã xóa ngày nhắc gọi lại.')
            setTimeout(() => setCallbackDateSuccess(null), 4000)
        } catch (err: unknown) {
            setCallbackDateError(getErrorMessage(err, 'Không thể lưu ngày nhắc gọi lại.'))
        } finally {
            setIsUpdatingCallbackDate(false)
        }
    }

    const handleClearCallbackDate = async () => {
        if (!selectedLead || isUpdatingCallbackDate) return
        setCallbackDateInput('')
        setIsUpdatingCallbackDate(true)
        setCallbackDateError(null)
        setCallbackDateSuccess(null)

        try {
            const updated = await updateLeadCallbackDate(request, selectedLead.id, null)
            setSelectedLead(updated)
            setLeads((prev) =>
                prev.map((l) => (l.id === updated.id ? { ...l, callback_date: null } : l)),
            )
            if (pipelineData) {
                setPipelineData((prev) =>
                    prev
                        ? {
                              ...prev,
                              leads: prev.leads.map((l) =>
                                  l.id === updated.id ? { ...l, callback_date: null } : l,
                              ),
                              columns: prev.columns.map((col) => ({
                                  ...col,
                                  leads: col.leads.map((l) =>
                                      l.id === updated.id ? { ...l, callback_date: null } : l,
                                  ),
                              })),
                          }
                        : null,
                )
            }
            setCallbackDateSuccess('Đã xóa ngày nhắc gọi lại.')
            setTimeout(() => setCallbackDateSuccess(null), 4000)
        } catch (err: unknown) {
            setCallbackDateError(getErrorMessage(err, 'Không thể xóa ngày nhắc gọi lại.'))
        } finally {
            setIsUpdatingCallbackDate(false)
        }
    }

    const handleDeleteClick = (lead: Lead) => {
        if (!canDeleteLead) {
            setPageError('Bạn không có quyền xóa khách hàng tiềm năng này.')
            return
        }
        setDeletingLead(lead)
    }

    const handleCancelDelete = () => {
        if (isDeletingLead) return
        setDeletingLead(null)
    }

    const handleConfirmDelete = async () => {
        if (!deletingLead || isDeletingLead) return
        if (!canDeleteLead) {
            setPageError('Bạn không có quyền xóa khách hàng tiềm năng này.')
            setDeletingLead(null)
            return
        }

        setIsDeletingLead(true)
        try {
            setPageError(null)
            const result = await deleteLead(request, deletingLead.id)
            setPageSuccess(result.message || 'Xóa khách hàng tiềm năng thành công.')
            setLeads((prev) => prev.filter((item) => item.id !== deletingLead.id))
            setTotal((prev) => Math.max(0, prev - 1))
            setDeletingLead(null)
        } catch (err: unknown) {
            const message = getErrorMessage(err, 'Không thể xóa khách hàng tiềm năng.')
            setPageError(message)
            setDeletingLead(null)
        } finally {
            setIsDeletingLead(false)
        }
    }

    // Đóng modal xác nhận xóa khi bấm Escape
    useEffect(() => {
        if (!deletingLead) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isDeletingLead) {
                setDeletingLead(null)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [deletingLead, isDeletingLead])

    const executeStatusUpdate = async (
        lead: Lead,
        targetStatus: LeadStatus,
        reason?: string,
        notes?: string,
    ) => {
        if (lead.status === 'converted') {
            setPageError('Khách hàng đã nhập học, không thể chuyển trạng thái.')
            return
        }

        const oldStatus = lead.status
        const previousPipelineData = pipelineData

        // Optimistic update trên Pipeline data
        if (pipelineData) {
            const updatedCard: Lead = {
                ...lead,
                status: targetStatus,
                rejection_reason: reason || null,
                updated_at: new Date().toISOString(),
            }

            const newColumns = pipelineData.columns.map((col) => {
                let colLeads = col.leads.filter((l) => l.id !== lead.id)
                if (col.status === targetStatus) {
                    colLeads = [updatedCard, ...colLeads]
                }
                return {
                    ...col,
                    count: colLeads.length,
                    leads: colLeads,
                }
            })

            const newCounts = { ...pipelineData.counts }
            newCounts[oldStatus] = Math.max(0, (newCounts[oldStatus] || 1) - 1)
            newCounts[targetStatus] = (newCounts[targetStatus] || 0) + 1

            setPipelineData({
                ...pipelineData,
                columns: newColumns,
                counts: newCounts,
            })
        }

        // Optimistic update trên Table list
        setLeads((prev) =>
            prev.map((l) =>
                l.id === lead.id
                    ? { ...l, status: targetStatus, rejection_reason: reason || null }
                    : l,
            ),
        )

        try {
            const updated = await updateLeadStatus(request, lead.id, targetStatus, reason, notes)
            if (selectedLead?.id === lead.id) {
                setSelectedLead(updated)
                setSelectedStatus(updated.status)
                void loadStatusHistory(lead.id)
            }
            setRefreshTrigger((prev) => prev + 1)
        } catch {
            // Rollback on failure!
            if (previousPipelineData) {
                setPipelineData(previousPipelineData)
            }
            setLeads((prev) =>
                prev.map((l) => (l.id === lead.id ? { ...l, status: oldStatus } : l)),
            )
            setPageError('Không thể cập nhật trạng thái Lead. Vui lòng thử lại.')
            setTimeout(() => setPageError(null), 5000)
        }
    }

    const handleStatusChange = async (newStatus: LeadStatus) => {
        if (!selectedLead || isUpdatingStatus) return
        if (selectedLead.status === 'converted') {
            setStatusError('Khách hàng đã nhập học, không thể thay đổi trạng thái.')
            return
        }
        if (newStatus === selectedLead.status) return

        if (newStatus === 'rejected') {
            setRejectionTargetLead(selectedLead)
            setRejectionReason('Không còn nhu cầu')
            setRejectionNotes('')
            setRejectionError(null)
            setIsRejectionModalOpen(true)
            return
        }

        const previousStatus = selectedStatus
        setSelectedStatus(newStatus)
        setIsUpdatingStatus(true)
        setStatusError(null)
        setStatusSuccess(null)

        try {
            const updated = await updateLeadStatus(
                request,
                selectedLead.id,
                newStatus,
            )
            setSelectedLead(updated)
            setSelectedStatus(updated.status)
            setStatusSuccess('Đã cập nhật trạng thái.')
            void loadStatusHistory(selectedLead.id)
            setRefreshTrigger((prev) => prev + 1)
        } catch (err: unknown) {
            setSelectedStatus(previousStatus)
            setStatusError(getErrorMessage(err, 'Không thể cập nhật. Vui lòng thử lại.'))
        } finally {
            setIsUpdatingStatus(false)
        }
    }

    const handleConfirmRejection = async () => {
        if (!rejectionTargetLead) return
        if (!rejectionReason) {
            setRejectionError('Vui lòng chọn lý do từ chối.')
            return
        }
        if (rejectionReason === 'Khác' && !rejectionNotes.trim()) {
            setRejectionError('Vui lòng nhập lý do cụ thể khi chọn "Khác".')
            return
        }

        const targetLead = rejectionTargetLead
        const reason = rejectionReason
        const notes = rejectionNotes.trim() || undefined

        setIsRejectionModalOpen(false)
        setRejectionTargetLead(null)

        await executeStatusUpdate(targetLead, 'rejected', reason, notes)
    }

    const handleCancelRejection = () => {
        if (selectedLead && rejectionTargetLead?.id === selectedLead.id) {
            setSelectedStatus(selectedLead.status)
        }
        setIsRejectionModalOpen(false)
        setRejectionTargetLead(null)
        setRejectionReason('Không còn nhu cầu')
        setRejectionNotes('')
        setRejectionError(null)
    }

    // Drag & Drop handlers (SCRUM-213)
    const handleDragStart = (e: React.DragEvent, lead: Lead) => {
        if (lead.status === 'converted') return
        e.dataTransfer.setData('text/plain', lead.id)
        e.dataTransfer.effectAllowed = 'move'
        setDraggedLead(lead)
    }

    const handleDragOver = (e: React.DragEvent, status: LeadStatus) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (dragOverStatus !== status) {
            setDragOverStatus(status)
        }
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        // Do not immediately clear if entering children
    }

    const handleDragEnd = () => {
        setDraggedLead(null)
        setDragOverStatus(null)
    }

    const handleDrop = async (e: React.DragEvent, targetStatus: LeadStatus) => {
        e.preventDefault()
        setDragOverStatus(null)
        const lead = draggedLead
        setDraggedLead(null)
        if (!lead || lead.status === targetStatus || lead.status === 'converted') return

        if (targetStatus === 'rejected') {
            setRejectionTargetLead(lead)
            setRejectionReason('Không còn nhu cầu')
            setRejectionNotes('')
            setRejectionError(null)
            setIsRejectionModalOpen(true)
            return
        }

        await executeStatusUpdate(lead, targetStatus)
    }

    const handleAssigneeChange = async (newAssigneeId: string) => {
        if (!selectedLead || isAssigning) return
        if (selectedLead.status === 'converted') {
            setAssignmentError('Khách hàng đã nhập học, không thể thay đổi phân công.')
            return
        }
        const currentAssigneeId = selectedLead.assigned_to_user_id || ''
        if (newAssigneeId === currentAssigneeId) return

        const previousAssigneeId = selectedAssigneeId
        setSelectedAssigneeId(newAssigneeId)
        setIsAssigning(true)
        setAssignmentError(null)
        setAssignmentSuccess(null)

        const targetUserId = newAssigneeId.trim() || null
        try {
            const updated = await assignLead(request, selectedLead.id, targetUserId)
            setSelectedLead(updated)
            setSelectedAssigneeId(updated.assigned_to_user_id || '')
            const targetUser = assignableUsers.find((u) => u.id === targetUserId)
            const targetName = targetUser?.name
            setAssignmentSuccess(
                targetUserId && targetName
                    ? `Đã phân công Lead cho ${targetName}.`
                    : targetUserId
                      ? 'Đã phân công Lead thành công.'
                      : 'Đã gỡ phân công Lead.'
            )
            void loadAssignmentHistory(selectedLead.id)
            // Trigger refetch đồng bộ dữ liệu theo đúng bộ lọc hiện tại
            setRefreshTrigger((prev) => prev + 1)
        } catch (err: unknown) {
            setSelectedAssigneeId(previousAssigneeId)
            setAssignmentError(getErrorMessage(err, 'Không thể cập nhật. Vui lòng thử lại.'))
        } finally {
            setIsAssigning(false)
        }
    }

    const toggleSelectLead = (leadId: string) => {
        setSelectedLeadIds((prev) => {
            const next = new Set(prev)
            if (next.has(leadId)) {
                next.delete(leadId)
            } else {
                next.add(leadId)
            }
            return next
        })
    }

    const currentPageLeadIds = useMemo(() => leads.map((l) => l.id), [leads])
    const isAllPageSelected =
        currentPageLeadIds.length > 0 &&
        currentPageLeadIds.every((id) => selectedLeadIds.has(id))

    const toggleSelectAllPage = () => {
        setSelectedLeadIds((prev) => {
            const next = new Set(prev)
            if (isAllPageSelected) {
                currentPageLeadIds.forEach((id) => next.delete(id))
            } else {
                currentPageLeadIds.forEach((id) => next.add(id))
            }
            return next
        })
    }

    const handleBulkAssign = async () => {
        if (!bulkAssigneeId || selectedLeadIds.size === 0 || isBulkAssigning) return
        setIsBulkAssigning(true)
        setBulkAssignError(null)
        try {
            const chosenUser = assignableUsers.find((u) => u.id === bulkAssigneeId)
            const chosenName = chosenUser?.name || 'tư vấn viên'
            const ids = Array.from(selectedLeadIds)
            const res = await bulkAssignLeads(request, ids, bulkAssigneeId)
            setPageSuccess(`Đã phân công ${res.updated_count || ids.length} Lead cho ${chosenName}.`)
            setTimeout(() => setPageSuccess(null), 4000)
            setSelectedLeadIds(new Set())
            setBulkAssigneeId('')
            setRefreshTrigger((prev) => prev + 1)
        } catch (err: unknown) {
            setBulkAssignError(getErrorMessage(err, 'Không thể phân công nhiều Lead.'))
        } finally {
            setIsBulkAssigning(false)
        }
    }

    const formatDate = formatVietnamDateTime

    const handleOpenCreateModal = () => {
        setEditingLead(null)
        setFormFullName('')
        setFormPhone('')
        setFormEmail('')
        setFormSource('direct')
        setFormInterestedProgramId('')
        setFormErrors({})
        setDuplicatePhoneWarning(null)
        setFormApiError(null)
        setIsFormModalOpen(true)
    }

    const handleOpenEditModal = (leadToEdit: Lead) => {
        if (leadToEdit.status === 'converted') {
            setPageError('Khách hàng đã nhập học, không thể chỉnh sửa thông tin.')
            return
        }
        setEditingLead(leadToEdit)
        setFormFullName(leadToEdit.full_name || '')
        setFormPhone(leadToEdit.phone || '')
        setFormEmail(leadToEdit.email || '')
        setFormSource(leadToEdit.source || 'direct')
        setFormInterestedProgramId(leadToEdit.interested_program_id || '')
        setFormErrors({})
        setDuplicatePhoneWarning(null)
        setFormApiError(null)
        setIsFormModalOpen(true)
    }

    const handleCloseFormModal = () => {
        if (isSubmittingForm) return
        setIsFormModalOpen(false)
        setEditingLead(null)
        setFormErrors({})
        setDuplicatePhoneWarning(null)
        setFormApiError(null)
    }

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const PHONE_REGEX = /^\+?[0-9\s\-.()]{6,30}$/

    const handleSubmitForm = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isSubmittingForm) return

        if (editingLead && editingLead.status === 'converted') {
            setFormApiError('Khách hàng đã nhập học, không thể chỉnh sửa thông tin.')
            return
        }

        const errors: { full_name?: string; phone?: string; email?: string } = {}
        const trimmedName = formFullName.trim()
        const trimmedPhone = formPhone.trim()
        const trimmedEmail = formEmail.trim()

        if (!trimmedName) {
            errors.full_name = 'Vui lòng nhập họ và tên.'
        }

        if (!trimmedPhone) {
            errors.phone = 'Vui lòng nhập số điện thoại.'
        } else if (!PHONE_REGEX.test(trimmedPhone)) {
            errors.phone = 'Số điện thoại không đúng định dạng.'
        }

        if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
            errors.email = 'Email không đúng định dạng.'
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors)
            return
        }

        setIsSubmittingForm(true)
        setFormApiError(null)

        const payload = {
            full_name: trimmedName,
            phone: trimmedPhone,
            email: trimmedEmail || null,
            source: formSource || 'direct',
            interested_program_id: formInterestedProgramId.trim() || null,
        }

        try {
            if (editingLead) {
                const res = await updateLead(request, editingLead.id, payload)
                setSelectedLead((prev) => (prev && prev.id === editingLead.id ? res.lead : prev))
                setPageSuccess('Cập nhật khách hàng tiềm năng thành công.')
                setIsFormModalOpen(false)
                setEditingLead(null)
                setRefreshTrigger((prev) => prev + 1)
            } else {
                await createLead(request, payload)
                setPageSuccess('Tạo khách hàng tiềm năng thành công.')
                setIsFormModalOpen(false)
                setRefreshTrigger((prev) => prev + 1)
            }
            setTimeout(() => setPageSuccess(null), 4000)
        } catch (err: unknown) {
            const message = getErrorMessage(err, 'Không thể lưu thông tin khách hàng tiềm năng.')
            setFormApiError(message)
        } finally {
            setIsSubmittingForm(false)
        }
    }

    return (
        <div className="leads-page-container">
            <Breadcrumb items={[{ label: 'Tư vấn tuyển sinh' }]} />
            <header className="leads-header">
                <div className="leads-header-top">
                    <div>
                        <h1 className="leads-header-title">Quản lý Tư vấn Tuyển sinh</h1>
                        <p className="leads-header-desc">
                            Theo dõi, lọc, tìm kiếm và phân công các yêu cầu đăng ký tư vấn tuyển
                            sinh từ học viên và khách hàng tiềm năng.
                        </p>
                    </div>
                    <div className="leads-actions">
                        <div className="leads-view-toggle-group" role="tablist" aria-label="Chế độ xem">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={viewMode === 'list'}
                                className={`leads-btn-toggle-view ${viewMode === 'list' ? 'leads-btn-toggle-view--active' : ''}`}
                                onClick={() => setViewMode('list')}
                                data-testid="view-mode-list-btn"
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <line x1="8" y1="6" x2="21" y2="6"></line>
                                    <line x1="8" y1="12" x2="21" y2="12"></line>
                                    <line x1="8" y1="18" x2="21" y2="18"></line>
                                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                                </svg>
                                Danh sách
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={viewMode === 'pipeline'}
                                className={`leads-btn-toggle-view ${viewMode === 'pipeline' ? 'leads-btn-toggle-view--active' : ''}`}
                                onClick={() => setViewMode('pipeline')}
                                data-testid="view-mode-pipeline-btn"
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <rect x="3" y="3" width="5" height="18" rx="1"></rect>
                                    <rect x="10" y="3" width="5" height="12" rx="1"></rect>
                                    <rect x="17" y="3" width="5" height="8" rx="1"></rect>
                                </svg>
                                Bảng phễu
                            </button>
                        </div>
                        <button
                            type="button"
                            className="leads-btn-action leads-btn-action-primary"
                            onClick={handleOpenCreateModal}
                            data-testid="add-lead-btn"
                        >
                            + Thêm Lead
                        </button>
                        <a
                            href="/consultation"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="leads-btn-action leads-btn-action-secondary"
                            data-testid="btn-open-form"
                        >
                            Mở form đăng ký
                        </a>
                    </div>
                </div>
            </header>

            {pageError && (
                <div className="leads-alert-error" role="alert" data-testid="page-error">
                    {pageError}
                </div>
            )}

            {pageSuccess && (
                <div className="leads-alert-success" role="status" data-testid="page-success">
                    {pageSuccess}
                </div>
            )}

            {/* Danh sách List View (SCRUM-128 / SCRUM-126) */}
            {viewMode === 'list' && (
            <>
            {/* Thanh tìm kiếm & Bộ lọc nâng cao (SCRUM-128) */}
            <div className="leads-filter-bar" data-testid="leads-filter-bar">
                <input
                    type="text"
                    className="leads-search-input"
                    placeholder="Tìm theo họ tên, số điện thoại, email..."
                    data-testid="leads-search-input"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value)
                        setPage(1)
                    }}
                />

                <select
                    className="leads-filter-select"
                    data-testid="leads-status-filter"
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value)
                        setPage(1)
                    }}
                    aria-label="Lọc theo trạng thái"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="new">Mới</option>
                    <option value="contacted">Đã liên hệ</option>
                    <option value="consulting">Đang tư vấn</option>
                    <option value="trial_scheduled">Hẹn học thử</option>
                    <option value="won">Chốt</option>
                    <option value="rejected">Từ chối</option>
                    <option value="qualified">Tiềm năng</option>
                    <option value="converted">Đã nhập học</option>
                    <option value="lost">Không thành công</option>
                    <option value="cancelled">Đã hủy</option>
                </select>

                <select
                    className="leads-filter-select"
                    data-testid="leads-source-filter"
                    value={sourceFilter}
                    onChange={(e) => {
                        setSourceFilter(e.target.value)
                        setPage(1)
                    }}
                    aria-label="Lọc theo nguồn tiếp nhận"
                >
                    <option value="">Tất cả nguồn</option>
                    {LEAD_SOURCES.map((s) => (
                        <option key={s.value} value={s.value}>
                            {s.label}
                        </option>
                    ))}
                </select>

                <select
                    className="leads-filter-select"
                    data-testid="leads-assignee-filter"
                    value={assigneeFilter}
                    onChange={(e) => {
                        setAssigneeFilter(e.target.value)
                        setPage(1)
                    }}
                    aria-label="Lọc theo người phụ trách"
                >
                    <option value="">Tất cả người phụ trách</option>
                    <option value="unassigned">Chưa phân công</option>
                    {assignableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                            {u.name}
                        </option>
                    ))}
                </select>

                <div className="leads-date-group">
                    <span className="leads-date-label">Từ ngày:</span>
                    <input
                        type="date"
                        className="leads-filter-date"
                        data-testid="leads-date-from-filter"
                        value={dateFrom}
                        onChange={(e) => {
                            setDateFrom(e.target.value)
                            setPage(1)
                        }}
                        aria-label="Từ ngày"
                    />
                </div>

                <div className="leads-date-group">
                    <span className="leads-date-label">Đến ngày:</span>
                    <input
                        type="date"
                        className="leads-filter-date"
                        data-testid="leads-date-to-filter"
                        value={dateTo}
                        onChange={(e) => {
                            setDateTo(e.target.value)
                            setPage(1)
                        }}
                        aria-label="Đến ngày"
                    />
                </div>

                {(search || statusFilter || sourceFilter || assigneeFilter || dateFrom || dateTo) && (
                    <button
                        type="button"
                        className="btn-clear-filters"
                        data-testid="clear-filters-btn"
                        onClick={handleClearFilters}
                    >
                        Xóa bộ lọc
                    </button>
                )}
            </div>
            </>
            )}

            {viewMode === 'list' && (
            <div className="leads-card">
                {canManageAssignments && selectedLeadIds.size > 0 && (
                    <div className="leads-bulk-actions-bar" data-testid="bulk-actions-bar">
                        <span className="bulk-selected-count">
                            Đã chọn <strong>{selectedLeadIds.size}</strong> yêu cầu tư vấn
                        </span>
                        <div className="bulk-action-controls">
                            <select
                                className="bulk-assignee-select"
                                data-testid="bulk-assignee-select"
                                value={bulkAssigneeId}
                                onChange={(e) => setBulkAssigneeId(e.target.value)}
                                disabled={isBulkAssigning}
                                aria-label="Chọn tư vấn viên phân công"
                            >
                                <option value="">-- Chọn tư vấn viên --</option>
                                {assignableUsers.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name} – Tư vấn tuyển sinh
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="btn-bulk-assign"
                                data-testid="bulk-assign-btn"
                                disabled={!bulkAssigneeId || isBulkAssigning}
                                onClick={() => void handleBulkAssign()}
                            >
                                {isBulkAssigning ? 'Đang phân công...' : 'Phân công'}
                            </button>
                            <button
                                type="button"
                                className="btn-bulk-cancel"
                                data-testid="bulk-cancel-btn"
                                disabled={isBulkAssigning}
                                onClick={() => {
                                    setSelectedLeadIds(new Set())
                                    setBulkAssigneeId('')
                                    setBulkAssignError(null)
                                }}
                            >
                                Bỏ chọn
                            </button>
                        </div>
                        {bulkAssignError && (
                            <div className="bulk-assign-error" data-testid="bulk-assign-error">
                                {bulkAssignError}
                            </div>
                        )}
                    </div>
                )}

                <div className="leads-table-wrapper">
                    <table className="leads-table" aria-label="Danh sách yêu cầu tư vấn">
                        <thead>
                            <tr>
                                {canManageAssignments && (
                                    <th className="th-checkbox">
                                        <input
                                            type="checkbox"
                                            data-testid="select-all-leads-checkbox"
                                            aria-label="Chọn tất cả lead trên trang"
                                            checked={isAllPageSelected}
                                            onChange={toggleSelectAllPage}
                                        />
                                    </th>
                                )}
                                <th>Họ và tên</th>
                                <th>Số điện thoại</th>
                                <th>Email</th>
                                <th>Chương trình quan tâm</th>
                                <th>Nguồn</th>
                                <th>Người phụ trách</th>
                                <th>Trạng thái</th>
                                <th>Thời gian gửi</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={canManageAssignments ? 10 : 9} className="leads-loading-state" data-testid="loading-state">
                                        Đang tải danh sách tư vấn...
                                    </td>
                                </tr>
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={canManageAssignments ? 10 : 9} className="leads-empty-state" data-testid="empty-state">
                                        Chưa có yêu cầu tư vấn nào được ghi nhận.
                                    </td>
                                </tr>
                            ) : (
                                leads.map((lead) => {
                                    const badgeClass =
                                        LEAD_STATUS_BADGE_CLASSES[lead.status] ||
                                        'status-badge--cancelled'
                                    const programDisplay =
                                        lead.interested_program_name ||
                                        lead.interested_program_code ||
                                        '-'

                                    const isRead = readLeadIds.has(lead.id)
                                    const isRecent = isWithin24Hours(lead.created_at)
                                    const isOverdue = isLeadCallbackOverdue(lead.callback_date)
                                    let rowClass = 'lead-row--read'
                                    if (!isRead) {
                                        rowClass = isRecent
                                            ? 'lead-row--unread lead-row--unread-recent'
                                            : 'lead-row--unread lead-row--unread-older'
                                    }
                                    if (isOverdue) {
                                        rowClass += ' row-overdue'
                                    }

                                    return (
                                        <tr key={lead.id} data-testid={`lead-row-${lead.id}`} className={rowClass}>
                                            {canManageAssignments && (
                                                <td className="td-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        data-testid={`select-lead-checkbox-${lead.id}`}
                                                        aria-label={`Chọn lead ${lead.full_name}`}
                                                        checked={selectedLeadIds.has(lead.id)}
                                                        onChange={() => toggleSelectLead(lead.id)}
                                                    />
                                                </td>
                                            )}
                                            <td>
                                                <div className="lead-name-cell">
                                                    <strong>{lead.full_name}</strong>
                                                    {isOverdue && (
                                                        <span
                                                            className="lead-overdue-badge"
                                                            data-testid={`overdue-badge-${lead.id}`}
                                                            title={`Quá hạn gọi lại (${formatCallbackDateDisplay(lead.callback_date)})`}
                                                        >
                                                            ⚠️ Quá hạn gọi lại ({formatCallbackDateDisplay(lead.callback_date)})
                                                        </span>
                                                    )}
                                                    {!isRead && (
                                                        <span
                                                            className={`lead-unread-badge ${!isRecent ? 'lead-unread-badge--older' : ''}`}
                                                            data-testid={`unread-badge-${lead.id}`}
                                                            title={isRecent ? 'Chưa xem' : 'Chưa xem (quá 24 giờ)'}
                                                        >
                                                            <span
                                                                className={`unread-dot ${!isRecent ? 'unread-dot--older' : ''}`}
                                                                aria-hidden="true"
                                                            />
                                                            Chưa xem
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{lead.phone}</td>
                                            <td>{lead.email || '-'}</td>
                                            <td>{programDisplay}</td>
                                            <td>{getLeadSourceLabel(lead.source)}</td>
                                            <td data-testid={`assignee-cell-${lead.id}`}>
                                                {lead.assigned_to_name ? (
                                                    <span className="lead-assignee-name">
                                                        {lead.assigned_to_name}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted" style={{ color: '#94a3b8' }}>
                                                        Chưa phân công
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <span
                                                    className={`lead-status-badge ${badgeClass}`}
                                                    data-testid={`status-badge-${lead.id}`}
                                                >
                                                    {getLeadStatusLabel(lead.status)}
                                                </span>
                                            </td>
                                            <td data-testid={`created-at-${lead.id}`}>{formatDate(lead.created_at)}</td>
                                            <td>
                                                <div className="lead-actions-cell">
                                                    <button
                                                        type="button"
                                                        className="btn-action-view"
                                                        data-testid={`view-lead-${lead.id}`}
                                                        onClick={() => void handleOpenDetail(lead.id)}
                                                    >
                                                        Xem chi tiết
                                                    </button>
                                                    {lead.status === 'won' && (
                                                        <button
                                                            type="button"
                                                            className="btn-action-convert"
                                                            data-testid={`convert-lead-${lead.id}`}
                                                            onClick={() => void handleOpenDetail(lead.id)}
                                                            title="Chuyển lead đã chốt thành hồ sơ học viên"
                                                        >
                                                            Chuyển HV
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="btn-action-edit"
                                                        data-testid={`edit-lead-${lead.id}`}
                                                        onClick={() => handleOpenEditModal(lead)}
                                                        disabled={lead.status === 'converted'}
                                                        title={lead.status === 'converted' ? 'Khách hàng đã nhập học, không thể chỉnh sửa' : 'Chỉnh sửa'}
                                                    >
                                                        Sửa
                                                    </button>
                                                    {canDeleteLead && (
                                                        <button
                                                            type="button"
                                                            className="btn-action-delete"
                                                            data-testid={`delete-lead-${lead.id}`}
                                                            onClick={() => handleDeleteClick(lead)}
                                                            aria-label={`Xóa lead ${lead.full_name}`}
                                                        >
                                                            Xóa
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="leads-pagination" data-testid="leads-pagination">
                    <span>
                        Trang {page} / {Math.max(totalPages, 1)} ({total} yêu cầu)
                    </span>
                    <div className="pagination-controls">
                        <button
                            type="button"
                            className="btn-pagination"
                            data-testid="prev-page-btn"
                            disabled={page <= 1 || isLoading}
                            onClick={() => {
                                setIsLoading(true)
                                setPage((p) => Math.max(1, p - 1))
                            }}
                        >
                            Trang trước
                        </button>
                        <button
                            type="button"
                            className="btn-pagination"
                            data-testid="next-page-btn"
                            disabled={page >= totalPages || isLoading}
                            onClick={() => {
                                setIsLoading(true)
                                setPage((p) => p + 1)
                            }}
                        >
                            Trang sau
                        </button>
                    </div>
                </div>
            </div>
            )}

            {/* Bảng phễu Kanban (SCRUM-213) */}
            {viewMode === 'pipeline' && (
                <div className="leads-pipeline-board" data-testid="leads-pipeline-board">
                    {isLoadingPipeline && !pipelineData ? (
                        <div className="pipeline-column-empty" style={{ gridColumn: '1 / -1' }}>
                            Đang tải bảng phễu Lead...
                        </div>
                    ) : pipelineError ? (
                        <div className="leads-alert-error" style={{ gridColumn: '1 / -1' }}>
                            {pipelineError}
                        </div>
                    ) : (
                        PIPELINE_STATUS_KEYS.map((statusKey) => {
                            const col = pipelineData?.columns.find((c) => c.status === statusKey) || {
                                status: statusKey,
                                label: getLeadStatusLabel(statusKey),
                                count: 0,
                                leads: [],
                            }
                            const isDragOver = dragOverStatus === statusKey

                            return (
                                <div
                                    key={statusKey}
                                    className={`pipeline-column pipeline-column--${statusKey} ${
                                        isDragOver ? 'pipeline-column--drag-over' : ''
                                    }`}
                                    data-testid={`pipeline-column-${statusKey}`}
                                    onDragOver={(e) => handleDragOver(e, statusKey)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => void handleDrop(e, statusKey)}
                                >
                                    <div className="pipeline-column-header">
                                        <span
                                            className="pipeline-column-title"
                                            data-testid={`pipeline-column-title-${statusKey}`}
                                        >
                                            {col.label} ({col.count})
                                        </span>
                                    </div>
                                    <div
                                        className="pipeline-cards-container"
                                        data-testid={`pipeline-cards-${statusKey}`}
                                    >
                                        {col.leads.length === 0 ? (
                                            <div className="pipeline-column-empty">Chưa có lead</div>
                                        ) : (
                                            col.leads.map((lead) => {
                                                const isBeingDragged = draggedLead?.id === lead.id
                                                const isOverdue = isLeadCallbackOverdue(lead.callback_date)
                                                return (
                                                    <div
                                                        key={lead.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, lead)}
                                                        onDragEnd={handleDragEnd}
                                                        onClick={() => void handleOpenDetail(lead.id)}
                                                        className={`pipeline-lead-card ${
                                                            isBeingDragged ? 'is-dragging' : ''
                                                        } ${isOverdue ? 'pipeline-card--overdue' : ''}`}
                                                        data-testid={`lead-card-${lead.id}`}
                                                    >
                                                        <div className="pipeline-card-header">
                                                            <span className="pipeline-card-name">
                                                                {lead.full_name}
                                                            </span>
                                                        </div>
                                                        {isOverdue && (
                                                            <div
                                                                className="pipeline-card-overdue"
                                                                data-testid={`kanban-overdue-badge-${lead.id}`}
                                                            >
                                                                ⚠️ Quá hạn gọi lại ({formatCallbackDateDisplay(lead.callback_date)})
                                                            </div>
                                                        )}
                                                        <div className="pipeline-card-phone">
                                                            <svg
                                                                width="13"
                                                                height="13"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                aria-hidden="true"
                                                            >
                                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                                            </svg>
                                                            <span>{lead.phone}</span>
                                                        </div>
                                                        <div className="pipeline-card-program">
                                                            {lead.interested_program_name ||
                                                                lead.interested_program_code ||
                                                                'Chưa chọn CT'}
                                                        </div>
                                                        <div className="pipeline-card-footer">
                                                            <span
                                                                className="pipeline-card-assignee"
                                                                title={lead.assigned_to_name || 'Chưa phân công'}
                                                            >
                                                                <svg
                                                                    width="12"
                                                                    height="12"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    aria-hidden="true"
                                                                >
                                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                                    <circle cx="12" cy="7" r="4"></circle>
                                                                </svg>
                                                                <span>{lead.assigned_to_name || 'Chưa phân công'}</span>
                                                            </span>
                                                            <span className="pipeline-card-time">
                                                                {formatDate(lead.updated_at || lead.created_at)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {/* Modal Chi tiết & Cập nhật trạng thái / Phân công */}
            {isDetailModalOpen && selectedLead && (
                <div
                    className="leads-modal-overlay"
                    data-testid="lead-detail-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                >
                    <div className="leads-modal-card">
                        <header className="leads-modal-header">
                            <div className="leads-modal-header-title-wrap">
                                <h2 id="modal-title" className="leads-modal-title">
                                    Chi tiết Yêu cầu Tư vấn
                                </h2>
                                <span
                                    className={`lead-status-badge ${LEAD_STATUS_BADGE_CLASSES[selectedLead.status]}`}
                                    data-testid={`modal-status-badge-${selectedLead.id}`}
                                >
                                    {getLeadStatusLabel(selectedLead.status)}
                                </span>
                            </div>
                            <button
                                type="button"
                                className="leads-modal-close-btn"
                                data-testid="close-modal-top-btn"
                                onClick={handleCloseModal}
                                aria-label="Đóng"
                            >
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </header>

                        <div className="leads-modal-body">
                            {convertSuccess && (
                                <div
                                    className="leads-alert-success"
                                    data-testid="convert-success-alert"
                                >
                                    {convertSuccess}
                                </div>
                            )}

                            {convertError && (
                                <div
                                    className="leads-alert-error"
                                    data-testid="convert-error-alert"
                                >
                                    {convertError}
                                </div>
                            )}

                            {statusSuccess && (
                                <div
                                    className="leads-alert-success"
                                    data-testid="status-success-alert"
                                >
                                    {statusSuccess}
                                </div>
                            )}

                            {statusError && (
                                <div
                                    className="leads-alert-error"
                                    data-testid="status-error-alert"
                                >
                                    {statusError}
                                </div>
                            )}

                            {assignmentSuccess && (
                                <div
                                    className="leads-alert-success"
                                    data-testid="assignment-success-alert"
                                >
                                    {assignmentSuccess}
                                </div>
                            )}

                            {assignmentError && (
                                <div
                                    className="leads-alert-error"
                                    data-testid="assignment-error-alert"
                                >
                                    {assignmentError}
                                </div>
                            )}

                            <div className="detail-info-grid">
                                <div className="detail-row">
                                    <span className="detail-label">Họ và tên:</span>
                                    <span className="detail-value" data-testid="detail-fullname">
                                        {selectedLead.full_name}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Số điện thoại:</span>
                                    <span className="detail-value" data-testid="detail-phone">
                                        {selectedLead.phone}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Email:</span>
                                    <span className="detail-value" data-testid="detail-email">
                                        {selectedLead.email || 'Không cung cấp'}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Chương trình:</span>
                                    <span className="detail-value" data-testid="detail-program">
                                        {selectedLead.interested_program_name ||
                                            selectedLead.interested_program_code ||
                                            'Chưa xác định'}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Nguồn tiếp nhận:</span>
                                    <span className="detail-value" data-testid="detail-source">
                                        {getLeadSourceLabel(selectedLead.source)}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Người phụ trách:</span>
                                    <span className="detail-value" data-testid="detail-assignee">
                                        {selectedLead.assigned_to_name
                                            ? `${selectedLead.assigned_to_name} (${selectedLead.assigned_to_email || ''})`
                                            : 'Chưa phân công'}
                                    </span>
                                </div>

                                {selectedLead.assigned_at && (
                                    <div className="detail-row">
                                        <span className="detail-label">Thời gian phân công:</span>
                                        <span className="detail-value" data-testid="detail-assigned-at">
                                            {formatDate(selectedLead.assigned_at)}
                                        </span>
                                    </div>
                                )}

                                <div className="detail-row">
                                    <span className="detail-label">Thời gian gửi:</span>
                                    <span className="detail-value" data-testid="detail-created-at">
                                        {formatDate(selectedLead.created_at)}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Cập nhật gần nhất:</span>
                                    <span className="detail-value" data-testid="detail-updated-at">
                                        {formatDate(selectedLead.updated_at)}
                                    </span>
                                </div>

                            </div>

                            {/* Khối Thông tin học viên (SCRUM-215 - Chi tiết Lead đã nhập học) */}
                            {(convertedStudentCode || selectedLead.student_code || selectedLead.student || selectedLead.status === 'converted') && (
                                <div className="detail-student-section" data-testid="student-info-section">
                                    <h4 className="detail-student-heading" data-testid="detail-student-heading">
                                        Thông tin học viên
                                    </h4>
                                    <div className="detail-student-grid">
                                        <div className="detail-row" data-testid="detail-student-code">
                                            <span className="detail-label">Mã học viên:</span>
                                            <span className="detail-value student-code-highlight" data-testid="generated-student-code">
                                                {convertedStudentCode || selectedLead.student?.student_code || selectedLead.student_code || '—'}
                                            </span>
                                        </div>

                                        <div className="detail-row" data-testid="detail-student-account">
                                            <span className="detail-label">Tài khoản:</span>
                                            <span className="detail-value" data-testid="student-account-email">
                                                {selectedLead.student?.account_email || selectedLead.email || '—'}
                                            </span>
                                        </div>

                                        <div className="detail-row" data-testid="detail-account-status">
                                            <span className="detail-label">Trạng thái tài khoản:</span>
                                            <span className="detail-value" data-testid="account-creation-result">
                                                {accountResult
                                                    ? (accountResult.accountCreated
                                                        ? (accountResult.emailSent ? 'Đã tạo tài khoản & gửi email' : 'Đã tạo')
                                                        : 'Chưa tạo tài khoản')
                                                    : (selectedLead.student?.account_status || 'Đã tạo')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="detail-message-section">
                                <span className="detail-label">Nội dung tư vấn:</span>
                                <div className="detail-message-box" data-testid="detail-message">
                                    {selectedLead.message || 'Không có ghi chú nội dung tư vấn.'}
                                </div>
                            </div>

                            {/* Khu vực Ngày nhắc gọi lại (SCRUM-214 - Sub-task 214-02) */}
                            <div className="leads-modal-section" data-testid="callback-reminder-section" style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                                <label htmlFor="callback-date-input" className="section-subheading-label">
                                    Ngày nhắc gọi lại:
                                </label>
                                <div className="callback-date-row" style={{ marginTop: '6px' }}>
                                    <input
                                        type="date"
                                        id="callback-date-input"
                                        className="callback-date-input"
                                        data-testid="callback-date-input"
                                        value={callbackDateInput}
                                        onChange={(e) => {
                                            setCallbackDateInput(e.target.value)
                                            setCallbackDateError(null)
                                            setCallbackDateSuccess(null)
                                        }}
                                        disabled={isUpdatingCallbackDate}
                                    />
                                    <button
                                        type="button"
                                        className="btn-save-callback-date"
                                        data-testid="save-callback-date-btn"
                                        onClick={() => void handleSaveCallbackDate()}
                                        disabled={isUpdatingCallbackDate}
                                    >
                                        {isUpdatingCallbackDate ? 'Đang lưu...' : 'Lưu ngày nhắc'}
                                    </button>
                                    {selectedLead.callback_date && (
                                        <button
                                            type="button"
                                            className="btn-clear-callback-date"
                                            data-testid="clear-callback-date-btn"
                                            onClick={() => void handleClearCallbackDate()}
                                            disabled={isUpdatingCallbackDate}
                                        >
                                            Xóa nhắc
                                        </button>
                                    )}
                                </div>
                                {callbackDateSuccess && (
                                    <div className="leads-alert-success" data-testid="callback-date-success" style={{ marginTop: '6px' }}>
                                        {callbackDateSuccess}
                                    </div>
                                )}
                                {callbackDateError && (
                                    <div className="leads-alert-error" data-testid="callback-date-error" style={{ marginTop: '6px' }}>
                                        {callbackDateError}
                                    </div>
                                )}
                                {selectedLead.callback_date && (
                                    <div className="callback-date-display" data-testid="callback-date-display" style={{ marginTop: '6px' }}>
                                        Ngày nhắc đã đặt: <strong>{formatCallbackDateDisplay(selectedLead.callback_date)}</strong>
                                        {isLeadCallbackOverdue(selectedLead.callback_date) && (
                                            <span
                                                className="lead-overdue-tag"
                                                data-testid="detail-overdue-tag"
                                            >
                                                ⚠️ Quá hạn gọi lại
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Khu vực phân công nhân sự phụ trách (SCRUM-127) */}
                            <div className="leads-modal-assign-section">
                                <label
                                    htmlFor="assignee-select-input"
                                    className="section-subheading-label"
                                >
                                    Phân công nhân sự phụ trách:
                                </label>
                                <div className="assign-form-group">
                                    <select
                                        id="assignee-select-input"
                                        className="assign-select-input"
                                        data-testid="assignee-select"
                                        value={selectedAssigneeId}
                                        onChange={(e) =>
                                            void handleAssigneeChange(e.target.value)
                                        }
                                        disabled={isAssigning || selectedLead.status === 'converted'}
                                    >
                                        <option value="">-- Chưa phân công / Gỡ phân công --</option>
                                        {assignableUsers.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name} – Tư vấn tuyển sinh
                                            </option>
                                        ))}
                                    </select>
                                    {isAssigning && (
                                        <span className="dropdown-inline-loading" data-testid="assignee-loading">
                                            <svg className="loading-spinner-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                                            </svg>
                                            Đang lưu...
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Khu vực cập nhật trạng thái */}
                            <div className="leads-modal-status-section">
                                <label
                                    htmlFor="status-select-input"
                                    className="section-subheading-label"
                                >
                                    Cập nhật trạng thái xử lý:
                                </label>
                                <div className="status-form-group">
                                    <select
                                        id="status-select-input"
                                        className="status-select-input"
                                        data-testid="status-select"
                                        value={selectedStatus}
                                        onChange={(e) =>
                                            void handleStatusChange(e.target.value as LeadStatus)
                                        }
                                        disabled={isUpdatingStatus || selectedLead.status === 'converted'}
                                    >
                                        <option value="new">Mới</option>
                                        <option value="contacted">Đã liên hệ</option>
                                        <option value="consulting">Đang tư vấn</option>
                                        <option value="trial_scheduled">Hẹn học thử</option>
                                        <option value="won">Chốt</option>
                                        <option value="rejected">Từ chối</option>
                                        <option value="qualified">Tiềm năng</option>
                                        <option value="converted">Đã nhập học</option>
                                        <option value="lost">Không thành công</option>
                                        <option value="cancelled">Đã hủy</option>
                                    </select>
                                    {isUpdatingStatus && (
                                        <span className="dropdown-inline-loading" data-testid="status-loading">
                                            <svg className="loading-spinner-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                                            </svg>
                                            Đang lưu...
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Khu vực lịch sử phân công (SCRUM-127) */}
                            <div className="leads-modal-history-section" data-testid="assignment-history-section">
                                <span className="section-subheading-label">Lịch sử phân công:</span>
                                {isLoadingHistory ? (
                                    <div className="history-loading-text" data-testid="history-loading">
                                        Đang tải lịch sử...
                                    </div>
                                ) : historyError ? (
                                    <div className="history-error-text" data-testid="history-error">
                                        {historyError}
                                    </div>
                                ) : assignmentHistory.length === 0 ? (
                                    <p className="history-empty-text" data-testid="history-empty">
                                        Chưa có lịch sử phân công.
                                    </p>
                                ) : (
                                    <ul className="assignment-history-list" data-testid="assignment-history-list">
                                        {assignmentHistory.map((item) => (
                                            <li key={item.id} className="history-item" data-testid={`history-item-${item.id}`}>
                                                <div className="history-item-header">
                                                    <span className="history-time" data-testid={`history-time-${item.id}`}>
                                                        {formatDate(item.created_at)}
                                                    </span>
                                                </div>
                                                <div className="history-item-transfer" data-testid={`history-transfer-${item.id}`}>
                                                    <span className="history-old-assignee">
                                                        {item.old_assigned_to_name || 'Chưa phân công'}
                                                    </span>
                                                    <span className="history-arrow"> → </span>
                                                    <span className="history-new-assignee">
                                                        {item.new_assigned_to_name || 'Chưa phân công'}
                                                    </span>
                                                </div>
                                                <div className="history-item-actor" data-testid={`history-actor-${item.id}`}>
                                                    Thực hiện bởi: {item.performed_by_name || 'Hệ thống'}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Khu vực lịch sử trạng thái (SCRUM-213) */}
                            <div className="leads-modal-history-section" data-testid="status-history-section">
                                <span className="section-subheading-label">Lịch sử trạng thái:</span>
                                {isLoadingStatusHistory ? (
                                    <div className="history-loading-text" data-testid="status-history-loading">
                                        Đang tải lịch sử...
                                    </div>
                                ) : statusHistoryError ? (
                                    <div className="history-error-text" data-testid="status-history-error">
                                        {statusHistoryError}
                                    </div>
                                ) : statusHistory.length === 0 ? (
                                    <p className="history-empty-text" data-testid="status-history-empty">
                                        Chưa có lịch sử thay đổi trạng thái.
                                    </p>
                                ) : (
                                    <ul className="assignment-history-list" data-testid="status-history-list">
                                        {statusHistory.map((item) => (
                                            <li key={item.id} className="history-item" data-testid={`status-history-item-${item.id}`}>
                                                <div className="history-item-header">
                                                    <span className="history-time" data-testid={`status-history-time-${item.id}`}>
                                                        {formatDate(item.created_at)}
                                                    </span>
                                                </div>
                                                <div className="history-item-transfer" data-testid={`status-history-transfer-${item.id}`}>
                                                    <span className="history-old-assignee">
                                                        {getLeadStatusLabel(item.old_status)}
                                                    </span>
                                                    <span className="history-arrow"> → </span>
                                                    <span className="history-new-assignee">
                                                        {getLeadStatusLabel(item.new_status)}
                                                    </span>
                                                </div>
                                                <div className="history-item-actor" data-testid={`status-history-actor-${item.id}`}>
                                                    Thực hiện bởi: {item.performed_by_name || 'Hệ thống'}
                                                </div>
                                                {item.reason && (
                                                    <div className="history-item-actor" style={{ marginTop: '2px', color: '#b91c1c' }}>
                                                        Lý do: <strong>{item.reason}</strong>
                                                    </div>
                                                )}
                                                {item.notes && (
                                                    <div className="history-item-actor" style={{ marginTop: '2px' }}>
                                                        Ghi chú: {item.notes}
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Khu vực Nhật ký chăm sóc (SCRUM-214) */}
                            <div className="leads-modal-history-section" data-testid="care-logs-section">
                                <div className="care-logs-header">
                                    <span className="section-subheading-label">Nhật ký chăm sóc:</span>
                                    {!isAddCareLogOpen && (
                                        <button
                                            type="button"
                                            className="btn-add-care-log"
                                            data-testid="add-care-log-btn"
                                            onClick={() => {
                                                setIsAddCareLogOpen(true)
                                                setCareLogType('call')
                                                setCareLogContent('')
                                                const now = new Date()
                                                const pad = (n: number) => String(n).padStart(2, '0')
                                                const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
                                                setCareLogTime(localIso)
                                                setCareLogFormError(null)
                                            }}
                                        >
                                            + Ghi nhận tương tác
                                        </button>
                                    )}
                                </div>

                                {isAddCareLogOpen && (
                                    <form
                                        className="care-log-form"
                                        data-testid="care-log-form"
                                        onSubmit={(e) => void handleAddCareLogSubmit(e)}
                                        noValidate
                                    >
                                        {careLogFormError && (
                                            <div className="leads-alert-error" data-testid="care-log-error">
                                                {careLogFormError}
                                            </div>
                                        )}
                                        <div className="form-field-group">
                                            <label htmlFor="care-log-type-select" className="care-log-label">
                                                Loại tương tác *
                                            </label>
                                            <select
                                                id="care-log-type-select"
                                                data-testid="care-log-type-select"
                                                className="assign-select-input"
                                                value={careLogType}
                                                onChange={(e) => setCareLogType(e.target.value as InteractionType)}
                                                disabled={isSubmittingCareLog}
                                            >
                                                <option value="call">Gọi</option>
                                                <option value="message">Nhắn</option>
                                                <option value="meeting">Gặp</option>
                                            </select>
                                        </div>

                                        <div className="form-field-group" style={{ marginTop: '8px' }}>
                                            <label htmlFor="care-log-content-input" className="care-log-label">
                                                Nội dung *
                                            </label>
                                            <textarea
                                                id="care-log-content-input"
                                                data-testid="care-log-content-input"
                                                className="assign-select-input"
                                                style={{ width: '100%', height: '70px', paddingTop: '6px', resize: 'vertical' }}
                                                placeholder="Nhập nội dung tương tác..."
                                                value={careLogContent}
                                                onChange={(e) => {
                                                    setCareLogContent(e.target.value)
                                                    if (careLogFormError) setCareLogFormError(null)
                                                }}
                                                disabled={isSubmittingCareLog}
                                            />
                                        </div>

                                        <div className="form-field-group" style={{ marginTop: '8px' }}>
                                            <label htmlFor="care-log-time-input" className="care-log-label">
                                                Thời điểm *
                                            </label>
                                            <input
                                                type="datetime-local"
                                                id="care-log-time-input"
                                                data-testid="care-log-time-input"
                                                className="assign-select-input"
                                                value={careLogTime}
                                                onChange={(e) => {
                                                    setCareLogTime(e.target.value)
                                                    if (careLogFormError) setCareLogFormError(null)
                                                }}
                                                disabled={isSubmittingCareLog}
                                            />
                                        </div>

                                        <div className="care-log-form-actions" style={{ marginTop: '10px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button
                                                type="button"
                                                className="btn-modal-close"
                                                data-testid="care-log-cancel-btn"
                                                onClick={() => {
                                                    setIsAddCareLogOpen(false)
                                                    setCareLogContent('')
                                                    setCareLogFormError(null)
                                                }}
                                                disabled={isSubmittingCareLog}
                                            >
                                                Hủy
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn-save-assign"
                                                data-testid="care-log-submit-btn"
                                                disabled={isSubmittingCareLog}
                                            >
                                                {isSubmittingCareLog ? 'Đang lưu...' : 'Lưu'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {isLoadingCareLogs ? (
                                    <div className="history-loading-text" data-testid="care-logs-loading">
                                        Đang tải nhật ký chăm sóc...
                                    </div>
                                ) : careLogsError ? (
                                    <div className="history-error-text" data-testid="care-logs-error">
                                        {careLogsError}
                                    </div>
                                ) : careLogs.length === 0 ? (
                                    <p className="history-empty-text" data-testid="care-log-empty">
                                        Chưa có nhật ký chăm sóc.
                                    </p>
                                ) : (
                                    <ul className="assignment-history-list" data-testid="care-log-list">
                                        {careLogs.map((log) => (
                                            <li key={log.id} className="history-item" data-testid={`care-log-item-${log.id}`}>
                                                <div className="history-item-header">
                                                    <span className="history-time" data-testid={`care-log-time-${log.id}`}>
                                                        {formatDate(log.interaction_at)}
                                                    </span>
                                                    <span
                                                        className={`care-log-badge care-log-badge--${log.interaction_type}`}
                                                        data-testid={`care-log-type-${log.id}`}
                                                    >
                                                        {log.interaction_type_label || (log.interaction_type === 'call' ? 'Gọi' : log.interaction_type === 'message' ? 'Nhắn' : 'Gặp')}
                                                    </span>
                                                </div>
                                                <div className="care-log-content-text" data-testid={`care-log-content-${log.id}`}>
                                                    {log.content}
                                                </div>
                                                <div className="history-item-actor" data-testid={`care-log-actor-${log.id}`}>
                                                    Người thực hiện: {log.performed_by_name || 'Hệ thống'}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <footer className="leads-modal-footer">
                            {selectedLead.status === 'won' && (
                                <button
                                    type="button"
                                    className="btn-modal-convert"
                                    data-testid="convert-lead-to-student-btn"
                                    onClick={() => void handleConvertToStudent(selectedLead.id)}
                                    disabled={isConverting}
                                >
                                    {isConverting ? 'Đang chuyển đổi...' : 'Chuyển thành học viên'}
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn-modal-edit"
                                data-testid="edit-lead-btn"
                                onClick={() => handleOpenEditModal(selectedLead)}
                                disabled={selectedLead.status === 'converted'}
                            >
                                Sửa
                            </button>
                            <button
                                type="button"
                                className="btn-modal-close"
                                data-testid="close-modal-btn"
                                onClick={handleCloseModal}
                            >
                                Đóng
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {/* Modal Thêm / Sửa khách hàng tiềm năng (SCRUM-126) */}
            {isFormModalOpen && (
                <div
                    className="leads-modal-overlay"
                    data-testid="lead-form-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="form-modal-title"
                >
                    <div className="leads-modal-card lead-form-card">
                        <header className="leads-modal-header">
                            <h2
                                id="form-modal-title"
                                className="leads-modal-title"
                                data-testid="lead-form-title"
                            >
                                {editingLead
                                    ? 'Chỉnh sửa khách hàng tiềm năng'
                                    : 'Thêm khách hàng tiềm năng'}
                            </h2>
                            <button
                                type="button"
                                className="leads-modal-close-btn"
                                data-testid="close-lead-form-top-btn"
                                onClick={handleCloseFormModal}
                                disabled={isSubmittingForm}
                                aria-label="Đóng"
                            >
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </header>

                        <form onSubmit={handleSubmitForm} noValidate>
                            <div className="leads-modal-body">
                                {formApiError && (
                                    <div
                                        className="leads-alert-error"
                                        role="alert"
                                        data-testid="form-api-error"
                                    >
                                        {formApiError}
                                    </div>
                                )}

                                <div className="lead-form-group">
                                    <label htmlFor="lead-form-name" className="lead-form-label">
                                        Họ và tên *
                                    </label>
                                    <input
                                        type="text"
                                        id="lead-form-name"
                                        data-testid="lead-form-name"
                                        className={`lead-form-input ${formErrors.full_name ? 'is-invalid' : ''}`}
                                        placeholder="Nhập họ và tên..."
                                        value={formFullName}
                                        onChange={(e) => {
                                            setFormFullName(e.target.value)
                                            if (formErrors.full_name) {
                                                setFormErrors((prev) => ({
                                                    ...prev,
                                                    full_name: undefined,
                                                }))
                                            }
                                        }}
                                        disabled={isSubmittingForm}
                                    />
                                    {formErrors.full_name && (
                                        <span
                                            className="lead-form-error"
                                            data-testid="lead-name-error"
                                        >
                                            {formErrors.full_name}
                                        </span>
                                    )}
                                </div>

                                <div className="lead-form-group">
                                    <label htmlFor="lead-form-phone" className="lead-form-label">
                                        Số điện thoại *
                                    </label>
                                    <input
                                        type="tel"
                                        id="lead-form-phone"
                                        data-testid="lead-form-phone"
                                        className={`lead-form-input ${formErrors.phone ? 'is-invalid' : ''}`}
                                        placeholder="Nhập số điện thoại..."
                                        value={formPhone}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            setFormPhone(val)
                                            if (val.trim().length < 8) {
                                                setDuplicatePhoneWarning(null)
                                            }
                                            if (formErrors.phone) {
                                                setFormErrors((prev) => ({
                                                    ...prev,
                                                    phone: undefined,
                                                }))
                                            }
                                        }}
                                        disabled={isSubmittingForm}
                                    />
                                    {formErrors.phone && (
                                        <span
                                            className="lead-form-error"
                                            data-testid="lead-phone-error"
                                        >
                                            {formErrors.phone}
                                        </span>
                                    )}
                                    {duplicatePhoneWarning && (
                                        <div
                                            className="lead-duplicate-warning-banner"
                                            data-testid="duplicate-phone-warning"
                                            role="alert"
                                        >
                                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                                                <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
                                            </svg>
                                            <span>{duplicatePhoneWarning}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="lead-form-group">
                                    <label htmlFor="lead-form-email" className="lead-form-label">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        id="lead-form-email"
                                        data-testid="lead-form-email"
                                        className={`lead-form-input ${formErrors.email ? 'is-invalid' : ''}`}
                                        placeholder="example@domain.com"
                                        value={formEmail}
                                        onChange={(e) => {
                                            setFormEmail(e.target.value)
                                            if (formErrors.email) {
                                                setFormErrors((prev) => ({
                                                    ...prev,
                                                    email: undefined,
                                                }))
                                            }
                                        }}
                                        disabled={isSubmittingForm}
                                    />
                                    {formErrors.email && (
                                        <span
                                            className="lead-form-error"
                                            data-testid="lead-email-error"
                                        >
                                            {formErrors.email}
                                        </span>
                                    )}
                                </div>

                                <div className="lead-form-group">
                                    <label htmlFor="lead-form-source" className="lead-form-label">
                                        Nguồn
                                    </label>
                                    <select
                                        id="lead-form-source"
                                        data-testid="lead-form-source"
                                        className="lead-form-select"
                                        value={formSource}
                                        onChange={(e) => setFormSource(e.target.value)}
                                        disabled={isSubmittingForm}
                                    >
                                        {LEAD_SOURCES.map((s) => (
                                            <option key={s.value} value={s.value}>
                                                {s.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="lead-form-group">
                                    <label
                                        htmlFor="lead-form-program"
                                        className="lead-form-label"
                                    >
                                        Chương trình quan tâm
                                    </label>
                                    <select
                                        id="lead-form-program"
                                        data-testid="lead-form-program"
                                        className="lead-form-select"
                                        value={formInterestedProgramId}
                                        onChange={(e) =>
                                            setFormInterestedProgramId(e.target.value)
                                        }
                                        disabled={isSubmittingForm}
                                    >
                                        <option value="">-- Chưa xác định --</option>
                                        {trainingPrograms.map((prog) => (
                                            <option key={prog.id} value={prog.id}>
                                                {prog.code} - {prog.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <footer className="leads-modal-footer">
                                <button
                                    type="button"
                                    className="btn-modal-cancel"
                                    data-testid="cancel-lead-form-btn"
                                    onClick={handleCloseFormModal}
                                    disabled={isSubmittingForm}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="btn-modal-submit"
                                    data-testid="submit-lead-form-btn"
                                    disabled={isSubmittingForm}
                                >
                                    {isSubmittingForm ? (
                                        <>
                                            <svg className="loading-spinner-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                                            </svg>
                                            <span>Đang xử lý...</span>
                                        </>
                                    ) : editingLead ? (
                                        'Lưu thay đổi'
                                    ) : (
                                        'Tạo Lead'
                                    )}
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Xác nhận xóa Lead (Custom Centered Modal) */}
            {deletingLead && (
                <div
                    className="lead-delete-modal-overlay"
                    data-testid="delete-lead-modal-overlay"
                    role="presentation"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !isDeletingLead) {
                            handleCancelDelete()
                        }
                    }}
                >
                    <div
                        className="lead-delete-modal-card"
                        data-testid="delete-lead-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-lead-modal-title"
                    >
                        <header className="lead-delete-modal-header">
                            <h3 id="delete-lead-modal-title" className="lead-delete-modal-title">
                                Xác nhận xóa
                            </h3>
                            <button
                                type="button"
                                className="lead-delete-modal-close-btn"
                                data-testid="btn-close-delete-modal"
                                onClick={handleCancelDelete}
                                disabled={isDeletingLead}
                                aria-label="Đóng"
                            >
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </header>

                        <div className="lead-delete-modal-body">
                            <p className="lead-delete-confirm-text">
                                Bạn có chắc chắn muốn xóa &quot;<strong>{deletingLead.full_name}</strong>&quot;?
                            </p>
                            <p className="lead-delete-warning-text">
                                Thao tác này không thể hoàn tác.
                            </p>
                        </div>

                        <footer className="lead-delete-modal-footer">
                            <button
                                type="button"
                                className="btn-delete-cancel"
                                data-testid="btn-cancel-delete"
                                onClick={handleCancelDelete}
                                disabled={isDeletingLead}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="btn-delete-confirm"
                                data-testid="btn-confirm-delete"
                                onClick={() => void handleConfirmDelete()}
                                disabled={isDeletingLead}
                            >
                                {isDeletingLead ? 'Đang xóa...' : 'Xóa'}
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {/* Modal Xác nhận từ chối Lead (SCRUM-213) */}
            {isRejectionModalOpen && rejectionTargetLead && (
                <div
                    className="leads-modal-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="rejection-modal-title"
                    data-testid="rejection-modal"
                >
                    <div className="leads-modal-card rejection-modal-card">
                        <header className="leads-modal-header">
                            <h2 id="rejection-modal-title" className="leads-modal-title">
                                Xác nhận từ chối Lead
                            </h2>
                            <button
                                type="button"
                                className="leads-modal-close-btn"
                                onClick={handleCancelRejection}
                                aria-label="Đóng"
                                data-testid="rejection-modal-close-btn"
                            >
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </header>

                        <div className="leads-modal-body">
                            <p className="rejection-target-desc">
                                Bạn đang chuyển khách hàng <strong>{rejectionTargetLead.full_name}</strong> sang trạng thái <strong>Từ chối</strong>.
                            </p>

                            {rejectionError && (
                                <div className="leads-alert-error" role="alert" data-testid="rejection-error" style={{ marginBottom: '14px' }}>
                                    {rejectionError}
                                </div>
                            )}

                            <div className="form-field-group">
                                <label htmlFor="rejection-reason-select" className="section-subheading-label">
                                    Lý do từ chối *
                                </label>
                                <select
                                    id="rejection-reason-select"
                                    className="status-select-input"
                                    style={{ width: '100%', height: '38px' }}
                                    data-testid="rejection-reason-select"
                                    value={rejectionReason}
                                    onChange={(e) => {
                                        setRejectionReason(e.target.value as RejectionReason)
                                        setRejectionError(null)
                                    }}
                                >
                                    {REJECTION_REASONS.map((r) => (
                                        <option key={r} value={r}>
                                            {r}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-field-group" style={{ marginTop: '14px' }}>
                                <label htmlFor="rejection-notes-input" className="section-subheading-label">
                                    Ghi chú thêm {rejectionReason === 'Khác' && <span style={{ color: '#dc2626' }}>*</span>}
                                </label>
                                <textarea
                                    id="rejection-notes-input"
                                    className="assign-select-input"
                                    style={{ width: '100%', height: '80px', paddingTop: '8px', paddingBottom: '8px', resize: 'vertical' }}
                                    data-testid="rejection-notes-input"
                                    placeholder={rejectionReason === 'Khác' ? 'Vui lòng nhập lý do cụ thể...' : 'Nhập ghi chú thêm nếu có...'}
                                    value={rejectionNotes}
                                    onChange={(e) => {
                                        setRejectionNotes(e.target.value)
                                        setRejectionError(null)
                                    }}
                                />
                            </div>
                        </div>

                        <footer className="leads-modal-footer">
                            <button
                                type="button"
                                className="btn-modal-close"
                                onClick={handleCancelRejection}
                                data-testid="rejection-cancel-btn"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="btn-save-assign btn-unassign"
                                onClick={() => void handleConfirmRejection()}
                                data-testid="rejection-confirm-btn"
                            >
                                Xác nhận từ chối
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    )
}
