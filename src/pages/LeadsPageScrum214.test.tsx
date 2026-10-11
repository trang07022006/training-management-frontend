// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { LeadsPage } from './LeadsPage'
import {
    getLeads,
    getLead,
    getAssignableUsers,
    getLeadAssignmentHistory,
    getLeadPipeline,
    getLeadStatusHistory,
    createLeadCareLog,
    getLeadCareLogs,
} from '../api/leadApi'
import { getTrainingPrograms } from '../api/trainingProgramApi'

import type {
    Lead,
    LeadListResponseData,
    AssignableUser,
    LeadCareLog,
} from '../api/leadApi'

// Mock SessionProvider
const mockRequest = vi.fn()
let mockCurrentRole = 'consultant'
let mockCurrentRoles = ['consultant']
let mockCurrentPermissions = ['course.manage']

vi.mock('../auth/SessionProvider', () => ({
    useSession: () => ({
        request: mockRequest,
        role: mockCurrentRole,
        roles: mockCurrentRoles,
        permissions: mockCurrentPermissions,
    }),
}))

// Mock leadApi functions
vi.mock('../api/leadApi', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api/leadApi')>()
    return {
        ...actual,
        getLeads: vi.fn(),
        getLead: vi.fn(),
        updateLeadStatus: vi.fn(),
        assignLead: vi.fn(),
        getAssignableUsers: vi.fn(),
        getLeadAssignmentHistory: vi.fn(),
        bulkAssignLeads: vi.fn(),
        createLead: vi.fn(),
        updateLead: vi.fn(),
        deleteLead: vi.fn(),
        checkLeadPhone: vi.fn(),
        getLeadPipeline: vi.fn(),
        getLeadStatusHistory: vi.fn(),
        createLeadCareLog: vi.fn(),
        getLeadCareLogs: vi.fn(),
        updateLeadCallbackDate: vi.fn(),
    }
})

// Mock trainingProgramApi
vi.mock('../api/trainingProgramApi', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api/trainingProgramApi')>()
    return {
        ...actual,
        getTrainingPrograms: vi.fn(),
    }
})

const sampleLead: Lead = {
    id: 'lead-214-001',
    full_name: 'Nguyễn Văn Test',
    phone: '0987654321',
    email: 'van.test@example.com',
    interested_program_id: 'prog-01',
    interested_program_name: 'Công nghệ thông tin',
    message: 'Quan tâm tuyển sinh',
    source: 'direct',
    status: 'new',
    assigned_to_user_id: 'user-cons-01',
    assigned_to_name: 'Trần Tư Vấn',
    created_at: '2026-10-12T08:00:00Z',
    updated_at: '2026-10-12T08:00:00Z',
}

const mockListResponse: LeadListResponseData = {
    items: [sampleLead],
    total: 1,
    page: 1,
    page_size: 10,
    total_pages: 1,
}

const sampleAssignableUsers: AssignableUser[] = [
    {
        id: 'user-cons-01',
        name: 'Trần Tư Vấn',
        email: 'tuvan@ictu.vn',
        role: 'consultant',
    },
]

describe('SCRUM-214: Sub-task 214-01 – Nhật ký chăm sóc Lead (UI & API Integration)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockCurrentRole = 'consultant'
        mockCurrentRoles = ['consultant']
        mockCurrentPermissions = ['course.manage']

        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLead).mockResolvedValue(sampleLead)
        vi.mocked(getAssignableUsers).mockResolvedValue(sampleAssignableUsers)
        vi.mocked(getTrainingPrograms).mockResolvedValue({ items: [], total: 0 } as any)
        vi.mocked(getLeadAssignmentHistory).mockResolvedValue([])
        vi.mocked(getLeadStatusHistory).mockResolvedValue([])
        vi.mocked(getLeadCareLogs).mockResolvedValue([])
        vi.mocked(getLeadPipeline).mockResolvedValue({
            columns: [],
            leads: [sampleLead],
            counts: { new: 1, contacted: 0, consulting: 0, trial_scheduled: 0, won: 0, rejected: 0 },
            total: 1,
        })
    })

    afterEach(() => {
        cleanup()
    })

    it('TC214-01: Tạo interaction loại Gọi (call) -> lưu thành công và xuất hiện trong danh sách', async () => {
        const createdLog: LeadCareLog = {
            id: 'care-log-call-1',
            lead_id: sampleLead.id,
            interaction_type: 'call',
            interaction_type_label: 'Gọi',
            content: 'Đã gọi điện tư vấn khóa học Lập trình Web Fullstack',
            interaction_at: '2026-10-12T09:00:00Z',
            performed_by_user_id: 'user-cons-01',
            performed_by_name: 'Trần Tư Vấn',
            created_at: '2026-10-12T09:00:00Z',
        }
        vi.mocked(createLeadCareLog).mockResolvedValue(createdLog)

        render(<LeadsPage />)
        await waitFor(() => {
            expect(screen.getByTestId(`view-lead-${sampleLead.id}`)).toBeDefined()
        })

        // Mở chi tiết Lead
        fireEvent.click(screen.getByTestId(`view-lead-${sampleLead.id}`))
        await waitFor(() => {
            expect(screen.getByTestId('lead-detail-modal')).toBeDefined()
            expect(screen.getByTestId('care-logs-section')).toBeDefined()
        })

        // Bấm nút "+ Ghi nhận tương tác"
        fireEvent.click(screen.getByTestId('add-care-log-btn'))
        expect(screen.getByTestId('care-log-form')).toBeDefined()

        // Chọn loại: Gọi
        const typeSelect = screen.getByTestId('care-log-type-select') as HTMLSelectElement
        fireEvent.change(typeSelect, { target: { value: 'call' } })
        expect(typeSelect.value).toBe('call')

        // Nhập nội dung và thời điểm
        fireEvent.change(screen.getByTestId('care-log-content-input'), {
            target: { value: 'Đã gọi điện tư vấn khóa học Lập trình Web Fullstack' },
        })
        fireEvent.change(screen.getByTestId('care-log-time-input'), {
            target: { value: '2026-10-12T09:00' },
        })

        // Bấm Lưu
        fireEvent.click(screen.getByTestId('care-log-submit-btn'))

        await waitFor(() => {
            expect(createLeadCareLog).toHaveBeenCalledWith(
                mockRequest,
                sampleLead.id,
                expect.objectContaining({
                    interaction_type: 'call',
                    content: 'Đã gọi điện tư vấn khóa học Lập trình Web Fullstack',
                }),
            )
            // Record xuất hiện ngay, không reload toàn trang
            expect(screen.getByTestId(`care-log-item-${createdLog.id}`)).toBeDefined()
            expect(screen.getByTestId(`care-log-type-${createdLog.id}`).textContent).toContain('Gọi')
            expect(screen.getByTestId(`care-log-content-${createdLog.id}`).textContent).toContain(
                'Đã gọi điện tư vấn khóa học Lập trình Web Fullstack',
            )
        })
    })

    it('TC214-02: Tạo interaction loại Nhắn (message) -> lưu đúng', async () => {
        const createdLog: LeadCareLog = {
            id: 'care-log-msg-2',
            lead_id: sampleLead.id,
            interaction_type: 'message',
            interaction_type_label: 'Nhắn',
            content: 'Gửi lộ trình qua Zalo cho học viên',
            interaction_at: '2026-10-12T10:15:00Z',
            performed_by_user_id: 'user-cons-01',
            performed_by_name: 'Trần Tư Vấn',
            created_at: '2026-10-12T10:15:00Z',
        }
        vi.mocked(createLeadCareLog).mockResolvedValue(createdLog)

        render(<LeadsPage />)
        await waitFor(() => expect(screen.getByTestId(`view-lead-${sampleLead.id}`)).toBeDefined())
        fireEvent.click(screen.getByTestId(`view-lead-${sampleLead.id}`))
        await waitFor(() => expect(screen.getByTestId('add-care-log-btn')).toBeDefined())

        fireEvent.click(screen.getByTestId('add-care-log-btn'))
        fireEvent.change(screen.getByTestId('care-log-type-select'), {
            target: { value: 'message' },
        })
        fireEvent.change(screen.getByTestId('care-log-content-input'), {
            target: { value: 'Gửi lộ trình qua Zalo cho học viên' },
        })
        fireEvent.change(screen.getByTestId('care-log-time-input'), {
            target: { value: '2026-10-12T10:15' },
        })
        fireEvent.click(screen.getByTestId('care-log-submit-btn'))

        await waitFor(() => {
            expect(createLeadCareLog).toHaveBeenCalledWith(
                mockRequest,
                sampleLead.id,
                expect.objectContaining({
                    interaction_type: 'message',
                    content: 'Gửi lộ trình qua Zalo cho học viên',
                }),
            )
            expect(screen.getByTestId(`care-log-type-${createdLog.id}`).textContent).toContain('Nhắn')
        })
    })

    it('TC214-03: Tạo interaction loại Gặp (meeting) -> lưu đúng', async () => {
        const createdLog: LeadCareLog = {
            id: 'care-log-meet-3',
            lead_id: sampleLead.id,
            interaction_type: 'meeting',
            interaction_type_label: 'Gặp',
            content: 'Gặp mặt tư vấn trực tiếp tại phòng tuyển sinh',
            interaction_at: '2026-10-12T14:30:00Z',
            performed_by_user_id: 'user-cons-01',
            performed_by_name: 'Trần Tư Vấn',
            created_at: '2026-10-12T14:30:00Z',
        }
        vi.mocked(createLeadCareLog).mockResolvedValue(createdLog)

        render(<LeadsPage />)
        await waitFor(() => expect(screen.getByTestId(`view-lead-${sampleLead.id}`)).toBeDefined())
        fireEvent.click(screen.getByTestId(`view-lead-${sampleLead.id}`))
        await waitFor(() => expect(screen.getByTestId('add-care-log-btn')).toBeDefined())

        fireEvent.click(screen.getByTestId('add-care-log-btn'))
        fireEvent.change(screen.getByTestId('care-log-type-select'), {
            target: { value: 'meeting' },
        })
        fireEvent.change(screen.getByTestId('care-log-content-input'), {
            target: { value: 'Gặp mặt tư vấn trực tiếp tại phòng tuyển sinh' },
        })
        fireEvent.change(screen.getByTestId('care-log-time-input'), {
            target: { value: '2026-10-12T14:30' },
        })
        fireEvent.click(screen.getByTestId('care-log-submit-btn'))

        await waitFor(() => {
            expect(createLeadCareLog).toHaveBeenCalledWith(
                mockRequest,
                sampleLead.id,
                expect.objectContaining({
                    interaction_type: 'meeting',
                    content: 'Gặp mặt tư vấn trực tiếp tại phòng tuyển sinh',
                }),
            )
            expect(screen.getByTestId(`care-log-type-${createdLog.id}`).textContent).toContain('Gặp')
        })
    })

    it('TC214-04: Kiểm tra validation nội dung + thời điểm (thông báo tiếng Việt)', async () => {
        render(<LeadsPage />)
        await waitFor(() => expect(screen.getByTestId(`view-lead-${sampleLead.id}`)).toBeDefined())
        fireEvent.click(screen.getByTestId(`view-lead-${sampleLead.id}`))
        await waitFor(() => expect(screen.getByTestId('add-care-log-btn')).toBeDefined())

        fireEvent.click(screen.getByTestId('add-care-log-btn'))

        // Nội dung rỗng
        fireEvent.change(screen.getByTestId('care-log-content-input'), {
            target: { value: '   ' },
        })
        fireEvent.click(screen.getByTestId('care-log-submit-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('care-log-error').textContent).toContain(
                'Vui lòng nhập nội dung tương tác.',
            )
        })
        expect(createLeadCareLog).not.toHaveBeenCalled()
    })

    it('TC214-05: Reload / mở lại detail modal -> nhật ký vẫn tồn tại', async () => {
        const persistedLogs: LeadCareLog[] = [
            {
                id: 'care-log-persisted-1',
                lead_id: sampleLead.id,
                interaction_type: 'call',
                interaction_type_label: 'Gọi',
                content: 'Lần gọi đầu tiên được lưu',
                interaction_at: '2026-10-11T09:00:00Z',
                performed_by_name: 'Trần Tư Vấn',
                created_at: '2026-10-11T09:00:00Z',
            },
        ]
        vi.mocked(getLeadCareLogs).mockResolvedValue(persistedLogs)

        render(<LeadsPage />)
        await waitFor(() => expect(screen.getByTestId(`view-lead-${sampleLead.id}`)).toBeDefined())
        fireEvent.click(screen.getByTestId(`view-lead-${sampleLead.id}`))

        await waitFor(() => {
            expect(getLeadCareLogs).toHaveBeenCalledWith(mockRequest, sampleLead.id)
            expect(screen.getByTestId(`care-log-item-${persistedLogs[0].id}`)).toBeDefined()
            expect(screen.getByTestId(`care-log-content-${persistedLogs[0].id}`).textContent).toContain(
                'Lần gọi đầu tiên được lưu',
            )
        })
    })

    it('TC214-06: Kiểm tra người thực hiện đúng user thao tác', async () => {
        const logWithActor: LeadCareLog = {
            id: 'care-log-actor-1',
            lead_id: sampleLead.id,
            interaction_type: 'message',
            interaction_type_label: 'Nhắn',
            content: 'Nhắn tin qua SMS cho khách',
            interaction_at: '2026-10-12T11:00:00Z',
            performed_by_user_id: 'user-cons-01',
            performed_by_name: 'Trần Tư Vấn (Chính chủ)',
            created_at: '2026-10-12T11:00:00Z',
        }
        vi.mocked(getLeadCareLogs).mockResolvedValue([logWithActor])

        render(<LeadsPage />)
        await waitFor(() => expect(screen.getByTestId(`view-lead-${sampleLead.id}`)).toBeDefined())
        fireEvent.click(screen.getByTestId(`view-lead-${sampleLead.id}`))

        await waitFor(() => {
            expect(screen.getByTestId(`care-log-actor-${logWithActor.id}`).textContent).toContain(
                'Người thực hiện: Trần Tư Vấn (Chính chủ)',
            )
        })
    })
})
