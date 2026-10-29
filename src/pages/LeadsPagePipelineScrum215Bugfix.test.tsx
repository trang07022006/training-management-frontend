// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { LeadsPage } from './LeadsPage'
import {
    getLeads,
    getLead,
    getLeadPipeline,
    getAssignableUsers,
    getLeadAssignmentHistory,
    convertLeadToStudent,
} from '../api/leadApi'
import { getTrainingPrograms } from '../api/trainingProgramApi'

import type {
    Lead,
    LeadListResponseData,
    PipelineData,
    AssignableUser,
} from '../api/leadApi'

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

vi.mock('../api/leadApi', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api/leadApi')>()
    return {
        ...actual,
        getLeads: vi.fn(),
        getLead: vi.fn(),
        getLeadPipeline: vi.fn(),
        updateLeadStatus: vi.fn(),
        assignLead: vi.fn(),
        getAssignableUsers: vi.fn(),
        getLeadAssignmentHistory: vi.fn(),
        bulkAssignLeads: vi.fn(),
        createLead: vi.fn(),
        updateLead: vi.fn(),
        deleteLead: vi.fn(),
        checkLeadPhone: vi.fn(),
        convertLeadToStudent: vi.fn(),
    }
})

vi.mock('../api/trainingProgramApi', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api/trainingProgramApi')>()
    return {
        ...actual,
        getTrainingPrograms: vi.fn(),
    }
})

const sampleWonLead: Lead = {
    id: 'lead-won-01',
    full_name: 'Trần Văn Chốt',
    phone: '0988112233',
    email: 'chot.tran@example.com',
    interested_program_id: null,
    message: null,
    source: 'direct',
    status: 'won',
    created_at: '2026-10-12T08:00:00Z',
    updated_at: '2026-10-12T08:00:00Z',
}

const sampleConvertedLead: Lead = {
    id: 'lead-converted-02',
    full_name: 'Phạm Thị Nhập Học',
    phone: '0977889900',
    email: 'enrolled@example.com',
    interested_program_id: null,
    message: null,
    source: 'direct',
    status: 'converted',
    created_at: '2026-10-12T08:00:00Z',
    updated_at: '2026-10-12T08:00:00Z',
}

const mockListResponse: LeadListResponseData = {
    items: [sampleWonLead, sampleConvertedLead],
    total: 2,
    page: 1,
    page_size: 10,
    total_pages: 1,
}

const mockPipelineResponse: PipelineData = {
    columns: [
        { status: 'new', label: 'Mới', count: 0, leads: [] },
        { status: 'contacted', label: 'Đã liên hệ', count: 0, leads: [] },
        { status: 'consulting', label: 'Đang tư vấn', count: 0, leads: [] },
        { status: 'trial_scheduled', label: 'Hẹn học thử', count: 0, leads: [] },
        { status: 'won', label: 'Chốt', count: 1, leads: [sampleWonLead] },
        { status: 'rejected', label: 'Từ chối', count: 0, leads: [] },
    ],
    counts: {
        new: 0,
        contacted: 0,
        consulting: 0,
        trial_scheduled: 0,
        won: 1,
        rejected: 0,
    },
    leads: [sampleWonLead],
    total: 1,
}

const sampleAssignableUsers: AssignableUser[] = [
    {
        id: 'user-cons-01',
        name: 'Lê Tư Vấn',
        email: 'tuvan@ictu.edu.vn',
        role: 'consultant',
    },
]

describe('BUGFIX SCRUM-215 – RESTORE SCRUM-213 PIPELINE VIEW', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLeadPipeline).mockResolvedValue(mockPipelineResponse)
        vi.mocked(getLead).mockImplementation(async (_req, id) => {
            if (id === sampleWonLead.id) return sampleWonLead
            return sampleConvertedLead
        })
        vi.mocked(getAssignableUsers).mockResolvedValue(sampleAssignableUsers)
        vi.mocked(getTrainingPrograms).mockResolvedValue({ items: [], total: 0 } as any)
        vi.mocked(getLeadAssignmentHistory).mockResolvedValue([])
    })

    afterEach(() => {
        cleanup()
    })

    it('A. Mở /leads: Có lại nút chuyển đổi [Danh sách] [Bảng phễu]', async () => {
        render(<LeadsPage />)
        await waitFor(() => expect(screen.getByTestId('view-mode-list-btn')).toBeDefined())

        expect(screen.getByTestId('view-mode-list-btn')).toBeDefined()
        expect(screen.getByTestId('view-mode-pipeline-btn')).toBeDefined()
        expect(screen.getByTestId('view-mode-list-btn').textContent).toContain('Danh sách')
        expect(screen.getByTestId('view-mode-pipeline-btn').textContent).toContain('Bảng phễu')
    })

    it('B. Bấm Bảng phễu: Hiện đúng 6 cột', async () => {
        const { container } = render(<LeadsPage />)
        await waitFor(() => expect(screen.getByTestId('view-mode-pipeline-btn')).toBeDefined())

        fireEvent.click(screen.getByTestId('view-mode-pipeline-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('leads-pipeline-board')).toBeDefined()
        })

        const expectedColumns = ['new', 'contacted', 'consulting', 'trial_scheduled', 'won', 'rejected']
        for (const col of expectedColumns) {
            expect(screen.getByTestId(`pipeline-column-${col}`)).toBeDefined()
        }

        const pipelineColumns = container.querySelectorAll('.pipeline-column')
        expect(pipelineColumns.length).toBe(6)
    })

    it('C. Lead Đã nhập học (converted): KHÔNG tạo cột thứ 7 trên pipeline', async () => {
        const { container } = render(<LeadsPage />)
        await waitFor(() => expect(screen.getByTestId('view-mode-pipeline-btn')).toBeDefined())

        fireEvent.click(screen.getByTestId('view-mode-pipeline-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('leads-pipeline-board')).toBeDefined()
        })

        // Không có cột pipeline nào cho converted
        expect(screen.queryByTestId('pipeline-column-converted')).toBeNull()
        expect(screen.queryByTestId('pipeline-column-Đã nhập học')).toBeNull()

        // Số cột trên board đúng 6 cột
        const pipelineColumns = container.querySelectorAll('.pipeline-column')
        expect(pipelineColumns.length).toBe(6)
    })

    it('D. Bấm lại Danh sách: Table Lead hoạt động bình thường', async () => {
        render(<LeadsPage />)
        await waitFor(() => expect(screen.getByTestId('view-mode-pipeline-btn')).toBeDefined())

        // Chuyển sang pipeline
        fireEvent.click(screen.getByTestId('view-mode-pipeline-btn'))
        await waitFor(() => expect(screen.getByTestId('leads-pipeline-board')).toBeDefined())

        // Chuyển lại table
        fireEvent.click(screen.getByTestId('view-mode-list-btn'))
        await waitFor(() => {
            expect(screen.getByTestId(`lead-row-${sampleWonLead.id}`)).toBeDefined()
            expect(screen.getByTestId(`lead-row-${sampleConvertedLead.id}`)).toBeDefined()
        })
    })

    it('E. SCRUM-215: Lead Đã nhập học vẫn hiển thị, nút Sửa bị khóa, Lead -> Student hoạt động', async () => {
        vi.mocked(convertLeadToStudent).mockResolvedValue({
            student: {
                id: 'student-01',
                student_code: 'STU000001',
                full_name: sampleWonLead.full_name,
                phone: sampleWonLead.phone,
                email: sampleWonLead.email,
                program_id: null,
                user_id: 'user-01',
                lead_id: sampleWonLead.id,
                status: 'enrolled',
                created_at: '2026-10-12T09:00:00Z',
                updated_at: '2026-10-12T09:00:00Z',
            },
            lead: {
                ...sampleWonLead,
                status: 'converted',
            },
            user_id: 'user-01',
            account_created: true,
            email_sent: true,
        })

        render(<LeadsPage />)
        await waitFor(() => expect(screen.getByTestId(`lead-row-${sampleConvertedLead.id}`)).toBeDefined())

        // 1. Lead Đã nhập học hiển thị đúng badge
        const convertedBadge = screen.getByTestId(`status-badge-${sampleConvertedLead.id}`)
        expect(convertedBadge.textContent).toBe('Đã nhập học')
        expect(convertedBadge.className).toContain('status-badge--converted')

        // 2. Nút Sửa của lead Đã nhập học bị disabled
        const editBtn = screen.getByTestId(`edit-lead-${sampleConvertedLead.id}`) as HTMLButtonElement
        expect(editBtn.disabled).toBe(true)

        // 3. Lead Won có nút Chuyển HV
        expect(screen.getByTestId(`convert-lead-${sampleWonLead.id}`)).toBeDefined()

        // 4. Mở modal chi tiết lead Won và thực hiện chuyển thành học viên
        fireEvent.click(screen.getByTestId(`view-lead-${sampleWonLead.id}`))
        await waitFor(() => expect(screen.getByTestId('convert-lead-to-student-btn')).toBeDefined())

        fireEvent.click(screen.getByTestId('convert-lead-to-student-btn'))
        await waitFor(() => {
            expect(convertLeadToStudent).toHaveBeenCalledWith(mockRequest, sampleWonLead.id)
            expect(screen.getByTestId('convert-success-alert')).toBeDefined()
            expect(screen.getByTestId('detail-student-code')).toBeDefined()
            expect(screen.getByTestId('generated-student-code').textContent).toBe('STU000001')
        })
    })
})
