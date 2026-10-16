// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { StudentDetailPage, getStudentStatusBadge, getClassStatusBadge, getEnrollmentStatusBadge } from './StudentDetailPage'
import type { StudentDetail } from '../api/studentApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const mockStudentEnrolled: StudentDetail = {
    id: 'stu-001',
    student_code: 'STU000001',
    full_name: 'Nguyễn Văn A',
    phone: '0988111222',
    email: 'nguyenvana@ictu.edu.vn',
    program_id: 'prog-01',
    user_id: 'user-01',
    lead_id: 'lead-01',
    status: 'enrolled',
    entry_level: 'IELTS 5.5',
    notes: 'Ghi chú học viên đặc biệt',
    program_name: 'Chương trình Kỹ thuật Phần mềm',
    current_class: {
        class_id: 'cls-101',
        class_code: 'CNTT-K21A',
        name: 'Lập trình Web nâng cao',
        expected_start_date: '2026-05-01',
        enrolled_at: '2026-04-15T08:00:00Z',
        class_status: 'in_progress',
        enrollment_status: 'enrolled',
        program_name: 'Kỹ thuật Phần mềm',
    },
    class_history: [
        {
            class_id: 'cls-100',
            class_code: 'CNTT-K20B',
            name: 'Cơ sở dữ liệu',
            expected_start_date: '2025-09-01',
            class_status: 'completed',
            enrollment_status: 'completed',
            program_name: 'Kỹ thuật Phần mềm',
        },
    ],
    created_at: '2026-03-01T08:00:00Z',
    updated_at: '2026-03-01T08:00:00Z',
}

const mockStudentEmptyAndLong: StudentDetail = {
    id: 'stu-long',
    student_code: 'STU000099',
    full_name: 'Nguyễn Hoàng Gia Bảo Đăng Khoa Nguyễn Long Vương Văn Bá Đạo',
    phone: '',
    email: 'nguyen.hoang.gia.bao.dang.khoa.rat.dai.sieu.cap.vip.pro@student.subdomain.ictu.edu.vn',
    program_id: null,
    user_id: null,
    lead_id: null,
    status: 'studying',
    entry_level: null,
    notes: null,
    program_name: null,
    program_code: null,
    current_class: null,
    class_history: [],
    created_at: '2026-03-01T08:00:00Z',
    updated_at: '2026-03-01T08:00:00Z',
}

vi.mock('../auth/SessionProvider', () => ({
    useSession: () => ({
        request: vi.fn(),
        permissions: ['course.manage'],
        role: 'admin',
        roles: ['admin'],
    }),
}))

vi.mock('../api/studentApi', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return {
        ...actual,
        getStudentDetail: vi.fn((_req, id: string) => {
            if (id === 'stu-001') return Promise.resolve(mockStudentEnrolled)
            if (id === 'stu-long') return Promise.resolve(mockStudentEmptyAndLong)
            const err = new Error('Not found')
            ;(err as unknown as { status: number }).status = 404
            return Promise.reject(err)
        }),
    }
})

describe('StudentDetailPage Interface & Business Logic Tests', () => {
    describe('Status and Enum Vietnamese mapping', () => {
        it('maps student profile status correctly without raw "enrolled"', () => {
            expect(getStudentStatusBadge('enrolled').label).toBe('Đã nhập học')
            expect(getStudentStatusBadge('enrolled').className).toBe('status-enrolled')
            expect(getStudentStatusBadge('studying').label).toBe('Đang học')
            expect(getStudentStatusBadge('active').label).toBe('Hoạt động')
            expect(getStudentStatusBadge('completed').label).toBe('Hoàn thành')
            expect(getStudentStatusBadge('graduated').label).toBe('Đã tốt nghiệp')
            expect(getStudentStatusBadge('suspended').label).toBe('Bảo lưu')
            expect(getStudentStatusBadge('dropped_out').label).toBe('Đã nghỉ học')
            expect(getStudentStatusBadge('inactive').label).toBe('Không hoạt động')
        })

        it('maps class status correctly', () => {
            expect(getClassStatusBadge('in_progress').label).toBe('Đang diễn ra')
            expect(getClassStatusBadge('preparing').label).toBe('Chuẩn bị mở')
            expect(getClassStatusBadge('completed').label).toBe('Đã kết thúc')
            expect(getClassStatusBadge('cancelled').label).toBe('Đã hủy')
        })

        it('maps class enrollment status correctly', () => {
            expect(getEnrollmentStatusBadge('enrolled').label).toBe('Đã ghi danh')
            expect(getEnrollmentStatusBadge('completed').label).toBe('Hoàn thành')
            expect(getEnrollmentStatusBadge('dropped').label).toBe('Đã rút')
        })
    })

    describe('StudentDetailPage Component Rendering', () => {
        it('renders student info with full width card and without modal-content class', async () => {
            render(
                <MemoryRouter initialEntries={['/students/stu-001']}>
                    <Routes>
                        <Route path="/students/:studentId" element={<StudentDetailPage />} />
                    </Routes>
                </MemoryRouter>
            )

            await waitFor(() => {
                expect(screen.getByTestId('student-detail-page')).toBeDefined()
            })

            // Check that cards have student-detail-card class and NOT modal-content
            const cards = screen.getAllByTestId(/.*-card/)
            expect(cards.length).toBeGreaterThan(0)
            cards.forEach((card) => {
                expect(card.classList.contains('student-detail-card')).toBe(true)
                expect(card.classList.contains('modal-content')).toBe(false)
            })

            // Check student status badge
            const badge = screen.getByTestId('student-status-badge')
            expect(badge.textContent).toBe('Đã nhập học')
            expect(badge.textContent).not.toBe('enrolled')
            expect(badge.textContent).not.toBe('Đang học')

            // Check personal info fields
            expect(screen.getByText('STU000001')).toBeDefined()
            expect(screen.getByText('0988111222')).toBeDefined()
            expect(screen.getByText('nguyenvana@ictu.edu.vn')).toBeDefined()
            expect(screen.getByText('IELTS 5.5')).toBeDefined()
            expect(screen.getByText('Chương trình Kỹ thuật Phần mềm')).toBeDefined()
            expect(screen.getByText('Ghi chú học viên đặc biệt')).toBeDefined()

            // Check current class
            expect(screen.getByText(/Lớp CNTT-K21A/)).toBeDefined()
            expect(screen.getByText('Đang diễn ra')).toBeDefined()
            expect(screen.getByText('Đã ghi danh')).toBeDefined()
            expect(screen.getByText('Xem chi tiết lớp học →')).toBeDefined()

            // Check class history table
            expect(screen.getByText('CNTT-K20B')).toBeDefined()
            expect(screen.getByText('Cơ sở dữ liệu')).toBeDefined()
            expect(screen.getByText('Đã kết thúc')).toBeDefined()
            expect(screen.getByText('Hoàn thành')).toBeDefined()
        })

        it('handles long content, empty fields and empty class states gracefully', async () => {
            render(
                <MemoryRouter initialEntries={['/students/stu-long']}>
                    <Routes>
                        <Route path="/students/:studentId" element={<StudentDetailPage />} />
                    </Routes>
                </MemoryRouter>
            )

            await waitFor(() => {
                expect(screen.getByTestId('student-detail-page')).toBeDefined()
            })

            // Long name and email render fully
            expect(screen.getAllByText('Nguyễn Hoàng Gia Bảo Đăng Khoa Nguyễn Long Vương Văn Bá Đạo').length).toBeGreaterThan(0)
            expect(screen.getByText('nguyen.hoang.gia.bao.dang.khoa.rat.dai.sieu.cap.vip.pro@student.subdomain.ictu.edu.vn')).toBeDefined()

            // Empty phone, level, program render unified fallback
            expect(screen.getAllByText('Chưa cập nhật').length).toBeGreaterThan(0)
            expect(screen.getByText('Chưa phân bổ')).toBeDefined()

            // Current class empty state
            expect(screen.getByText('Học viên hiện chưa được ghi danh vào lớp học nào.')).toBeDefined()

            // Class history empty state
            expect(screen.getByText('Chưa có lịch sử lớp học nào trước đây.')).toBeDefined()
        })
    })
})
