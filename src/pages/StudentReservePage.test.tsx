// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { RequirePermission } from '../auth/RequirePermission'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import { StudentReservePage } from './StudentReservePage'
import * as studentApi from '../api/studentApi'
import * as studentLifecycleApi from '../api/studentLifecycleApi'

function RoleSessionWrapper({
    role,
    children,
}: {
    role?: string | null
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()
    useEffect(() => {
        if (role !== undefined) {
            startSession({ accessToken: 'test-token', refreshToken: 'test-refresh' }, role)
        }
    }, [role, startSession])

    if (role !== undefined && !hasSession) {
        return <div>Initializing test session...</div>
    }

    return <>{children}</>
}

const mockStudent: studentApi.StudentDetail = {
    id: 'st-101',
    student_code: 'SV2026-001',
    full_name: 'Nguyễn Văn Test',
    phone: '0912345678',
    email: 'test@ictu.edu.vn',
    program_id: 'prog-1',
    program_name: 'Kỹ nghệ phần mềm',
    program_code: 'SE',
    user_id: 'u-1',
    lead_id: null,
    status: 'enrolled',
    entry_level: 'Khá',
    notes: 'Học viên chăm chỉ',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    current_class: {
        id: 'cls-1',
        class_id: 'cls-1',
        class_code: 'SE-K20A',
        name: 'Lớp SE K20A',
        expected_start_date: '2026-09-01',
        status: 'in_progress',
        enrollment_status: 'enrolled',
    },
    current_classes: [
        {
            id: 'cls-1',
            class_id: 'cls-1',
            class_code: 'SE-K20A',
            name: 'Lớp SE K20A',
            expected_start_date: '2026-09-01',
            status: 'in_progress',
            enrollment_status: 'enrolled',
        },
    ],
    class_history: [],
}

describe('StudentReservePage (SCRUM-252.1)', () => {
    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('1. Hiển thị thông tin học viên, lớp học và form bảo lưu đầy đủ', async () => {
        vi.spyOn(studentApi, 'getStudentDetail').mockResolvedValue(mockStudent)

        render(
            <MemoryRouter initialEntries={['/students/st-101/reserve']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager">
                        <Routes>
                            <Route path="/students/:studentId/reserve" element={<StudentReservePage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('student-reserve-page')).toBeDefined()
        })

        expect(screen.getAllByText('Nguyễn Văn Test').length).toBeGreaterThan(0)
        expect(screen.getAllByText('SV2026-001').length).toBeGreaterThan(0)
        expect(screen.getByTestId('select-class')).toBeDefined()
        expect(screen.getByTestId('input-effective-date')).toBeDefined()
        expect(screen.getByTestId('input-reason')).toBeDefined()
    })

    it('2. Báo lỗi khi lý do bảo lưu để trống hoặc chỉ có khoảng trắng', async () => {
        vi.spyOn(studentApi, 'getStudentDetail').mockResolvedValue(mockStudent)

        render(
            <MemoryRouter initialEntries={['/students/st-101/reserve']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager">
                        <Routes>
                            <Route path="/students/:studentId/reserve" element={<StudentReservePage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-reserve')).toBeDefined()
        })

        const reasonInput = screen.getByTestId('input-reason')
        fireEvent.change(reasonInput, { target: { value: '    ' } })

        const submitBtn = screen.getByTestId('btn-preview-reserve')
        fireEvent.click(submitBtn)

        expect(screen.getByTestId('alert-error').textContent).toContain('Lý do bảo lưu là bắt buộc')
    })

    it('3. Mở modal xác nhận với tóm tắt đầy đủ và gửi yêu cầu thành công', async () => {
        vi.spyOn(studentApi, 'getStudentDetail').mockResolvedValue(mockStudent)
        const reserveMock = vi.spyOn(studentLifecycleApi, 'reserveStudent').mockResolvedValue({
            message: 'Bảo lưu thành công',
            data: { id: 'hist-1' },
        })

        render(
            <MemoryRouter initialEntries={['/students/st-101/reserve']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager">
                        <Routes>
                            <Route path="/students/:studentId/reserve" element={<StudentReservePage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-reserve')).toBeDefined()
        })

        const reasonInput = screen.getByTestId('input-reason')
        fireEvent.change(reasonInput, { target: { value: 'Bảo lưu do đi làm thực tập dài hạn' } })

        const previewBtn = screen.getByTestId('btn-preview-reserve')
        fireEvent.click(previewBtn)

        // Modal should appear
        expect(screen.getByTestId('reserve-modal')).toBeDefined()
        expect(screen.getByText('Xác nhận yêu cầu bảo lưu học viên')).toBeDefined()

        const confirmBtn = screen.getByTestId('btn-confirm-reserve')
        fireEvent.click(confirmBtn)

        await waitFor(() => {
            expect(reserveMock).toHaveBeenCalledTimes(1)
            expect(screen.getByTestId('alert-success').textContent).toContain('Bảo lưu học viên thành công')
        })
    })

    it('4. Route Guard: Người dùng role admin hoặc trainee không được truy cập trang bảo lưu', async () => {
        render(
            <MemoryRouter initialEntries={['/students/st-101/reserve']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="admin">
                        <Routes>
                            <Route
                                element={
                                    <RequirePermission
                                        requiredPermission={SYSTEM_PERMISSIONS.STUDENT_LIFECYCLE_MANAGE}
                                        fallbackPath="/forbidden"
                                    />
                                }
                            >
                                <Route path="/students/:studentId/reserve" element={<StudentReservePage />} />
                            </Route>
                            <Route path="/forbidden" element={<div data-testid="forbidden-page">403 Forbidden</div>} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('forbidden-page')).toBeDefined()
        })
    })
})
