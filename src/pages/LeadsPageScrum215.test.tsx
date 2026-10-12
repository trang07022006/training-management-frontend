// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { LeadsPage } from './LeadsPage'
import {
    getLeads,
    getLead,
    getAssignableUsers,
    getLeadAssignmentHistory,
    convertLeadToStudent,
} from '../api/leadApi'
import { getTrainingPrograms } from '../api/trainingProgramApi'

import type {
    Lead,
    LeadListResponseData,
    AssignableUser,
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
        convertLeadToStudent: vi.fn(),
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

const sampleWonLead: Lead = {
    id: 'lead-won-215-01',
    full_name: 'Trần Văn Chốt',
    phone: '0988112233',
    email: 'chot.tran@example.com',
    interested_program_id: 'prog-01',
    interested_program_name: 'Lập trình Web',
    message: 'Đăng ký học ngay',
    source: 'direct',
    status: 'won',
    assigned_to_user_id: 'user-cons-01',
    assigned_to_name: 'Lê Tư Vấn',
    created_at: '2026-10-12T08:00:00Z',
    updated_at: '2026-10-12T08:00:00Z',
}

const sampleNewLead: Lead = {
    id: 'lead-new-215-02',
    full_name: 'Hoàng Văn Mới',
    phone: '0912345678',
    email: 'moi.hoang@example.com',
    interested_program_id: 'prog-01',
    interested_program_name: 'Lập trình Web',
    message: 'Quan tâm tuyển sinh',
    source: 'public_form',
    status: 'new',
    created_at: '2026-10-12T08:00:00Z',
    updated_at: '2026-10-12T08:00:00Z',
}

const mockListResponse: LeadListResponseData = {
    items: [sampleWonLead, sampleNewLead],
    total: 2,
    page: 1,
    page_size: 10,
    total_pages: 1,
}

const sampleAssignableUsers: AssignableUser[] = [
    {
        id: 'user-cons-01',
        name: 'Lê Tư Vấn',
        email: 'tuvan@ictu.edu.vn',
        role: 'consultant',
    },
]

describe('SCRUM-215: Sub-task 215-01 – Chuyển dữ liệu Lead sang hồ sơ học viên (UI & API Integration)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockCurrentRole = 'consultant'
        mockCurrentRoles = ['consultant']
        mockCurrentPermissions = ['course.manage']

        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLead).mockImplementation(async (_req, id) => {
            if (id === sampleWonLead.id) return sampleWonLead
            return sampleNewLead
        })
        vi.mocked(getAssignableUsers).mockResolvedValue(sampleAssignableUsers)
        vi.mocked(getTrainingPrograms).mockResolvedValue({ items: [], total: 0 } as any)
        vi.mocked(getLeadAssignmentHistory).mockResolvedValue([])
    })

    afterEach(() => {
        cleanup()
    })

    it('TC215-01: Lead đã Chốt (won) hiển thị nút "Chuyển thành học viên" và "Chuyển HV"', async () => {
        render(<LeadsPage />)
        await waitFor(() => expect(screen.getByTestId(`view-lead-${sampleWonLead.id}`)).toBeDefined())

        // Trong bảng: Lead won có nút "Chuyển HV"
        expect(screen.getByTestId(`convert-lead-${sampleWonLead.id}`)).toBeDefined()
        // Lead new KHÔNG có nút "Chuyển HV"
        expect(screen.queryByTestId(`convert-lead-${sampleNewLead.id}`)).toBeNull()

        // Mở modal chi tiết Lead won
        fireEvent.click(screen.getByTestId(`view-lead-${sampleWonLead.id}`))
        await waitFor(() => {
            expect(screen.getByTestId('convert-lead-to-student-btn')).toBeDefined()
            expect(screen.getByTestId('convert-lead-to-student-btn').textContent).toContain('Chuyển thành học viên')
        })
    })

    it('TC215-02: Bấm "Chuyển thành học viên" -> gọi API convert và hiển thị thành công', async () => {
        vi.mocked(convertLeadToStudent).mockResolvedValue({
            student: {
                id: 'student-215-01',
                student_code: 'HV20260001',
                full_name: sampleWonLead.full_name,
                phone: sampleWonLead.phone,
                email: sampleWonLead.email,
                program_id: sampleWonLead.interested_program_id,
                user_id: null,
                lead_id: sampleWonLead.id,
                status: 'enrolled',
                created_at: '2026-10-12T09:00:00Z',
                updated_at: '2026-10-12T09:00:00Z',
            },
            lead: {
                ...sampleWonLead,
                status: 'converted',
            },
        })

        render(<LeadsPage />)
        await waitFor(() => expect(screen.getByTestId(`view-lead-${sampleWonLead.id}`)).toBeDefined())

        // Mở modal chi tiết
        fireEvent.click(screen.getByTestId(`view-lead-${sampleWonLead.id}`))
        await waitFor(() => expect(screen.getByTestId('convert-lead-to-student-btn')).toBeDefined())

        // Click chuyển đổi
        fireEvent.click(screen.getByTestId('convert-lead-to-student-btn'))

        await waitFor(() => {
            expect(convertLeadToStudent).toHaveBeenCalledWith(mockRequest, sampleWonLead.id)
            expect(screen.getByTestId('convert-success-alert')).toBeDefined()
            expect(screen.getByTestId('convert-success-alert').textContent).toContain(
                'Chuyển đổi khách hàng thành học viên thành công.',
            )
        })
    })

    it('TC215-03: Lead chưa Chốt (new) mở modal -> KHÔNG hiển thị nút chuyển thành học viên', async () => {
        render(<LeadsPage />)
        await waitFor(() => expect(screen.getByTestId(`view-lead-${sampleNewLead.id}`)).toBeDefined())

        fireEvent.click(screen.getByTestId(`view-lead-${sampleNewLead.id}`))
        await waitFor(() => expect(screen.getByTestId('lead-detail-modal')).toBeDefined())

        expect(screen.queryByTestId('convert-lead-to-student-btn')).toBeNull()
    })

    it('TC215-04: API báo lỗi chuyển đổi -> hiển thị thông báo lỗi thân thiện', async () => {
        vi.mocked(convertLeadToStudent).mockRejectedValue(
            new Error('Lead này đã được chuyển thành hồ sơ học viên trước đó.'),
        )

        render(<LeadsPage />)
        await waitFor(() => expect(screen.getByTestId(`view-lead-${sampleWonLead.id}`)).toBeDefined())

        fireEvent.click(screen.getByTestId(`view-lead-${sampleWonLead.id}`))
        await waitFor(() => expect(screen.getByTestId('convert-lead-to-student-btn')).toBeDefined())

        fireEvent.click(screen.getByTestId('convert-lead-to-student-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('convert-error-alert')).toBeDefined()
            expect(screen.getByTestId('convert-error-alert').textContent).toContain(
                'Lead này đã được chuyển thành hồ sơ học viên trước đó.',
            )
        })
    })
})
