// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { ClassDetailPage } from './ClassDetailPage'
import { ScheduleGeneratePage } from './ScheduleGeneratePage'
import { RequirePermission } from '../auth/RequirePermission'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import type { TrainingClass } from '../api/classApi'
import type { ClassScheduleItem } from '../api/scheduleApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    localStorage.clear()
})

const sampleClass: TrainingClass = {
    id: 'cls-224-001',
    class_code: 'CNTT-224A',
    program_id: 'prog-224-001',
    program_code: 'PROG-CNTT',
    program_name: 'Công nghệ thông tin',
    expected_start_date: '2026-09-01',
    max_capacity: 30,
    learning_mode: 'offline',
    status: 'preparing',
    status_label: 'Chuẩn bị',
    enrolled_count: 5,
    subjects: [],
    copied_subjects_count: 1,
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
}

const sampleSchedule: ClassScheduleItem = {
    id: 'sch-224-001',
    class_id: 'cls-224-001',
    session_number: 1,
    learning_date: '2026-09-02',
    shift: 'shift_1',
    start_time: '07:30:00',
    end_time: '09:30:00',
    topic: 'Bài 1: Giới thiệu môn học',
    room_id: 'P101',
    room_name: 'Phòng 101',
    instructor_id: 'inst-01',
    instructor_name: 'ThS. Nguyễn Văn A',
    status: 'scheduled',
}

function MockSessionHelper({
    role,
    roles,
    permissions,
    children,
}: {
    role: string
    roles?: string[]
    permissions?: string[]
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()
    useEffect(() => {
        if (!hasSession) {
            startSession(
                { accessToken: 'mock-token', refreshToken: 'mock-refresh' },
                role,
                `usr-${role}`,
                false,
                role === 'admin' ? 'Minh Trang' : 'Test User',
                `${role}@ictu.edu.vn`,
                roles ?? [role],
                permissions,
            )
        }
    }, [role, roles, permissions, hasSession, startSession])

    if (!hasSession) {
        return <div>Initializing session...</div>
    }

    return <>{children}</>
}

function mockFetch(schedules: ClassScheduleItem[] = [sampleSchedule]) {
    return vi.fn().mockImplementation((path: string) => {
        if (path.includes('/classes/cls-224-001/schedules')) {
            return Promise.resolve(
                new Response(
                    JSON.stringify({ status: 'success', data: { schedules, total: schedules.length } }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
            )
        }
        if (path.includes('/classes/cls-224-001/subjects')) {
            return Promise.resolve(
                new Response(
                    JSON.stringify({ status: 'success', data: [] }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
            )
        }
        if (path.includes('/classes/cls-224-001/students')) {
            return Promise.resolve(
                new Response(
                    JSON.stringify({ status: 'success', data: { items: [], total: 0 } }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
            )
        }
        if (path.includes('/classes/cls-224-001')) {
            return Promise.resolve(
                new Response(
                    JSON.stringify({ status: 'success', data: sampleClass }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
            )
        }
        return Promise.resolve(
            new Response(
                JSON.stringify({ status: 'success', data: {} }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
        )
    })
}

describe('SCRUM-224: Quyền chức năng Sinh thời khóa biểu', () => {
    it('1. Minh Trang — Quản trị viên (Admin thuần túy) KHÔNG thấy nút Sinh thời khóa biểu ở header và tab 5', async () => {
        window.fetch = mockFetch()

        render(
            <SessionProvider apiOrigin="http://localhost:5000" autoRestore={false}>
                <MockSessionHelper
                    role="admin"
                    roles={['admin']}
                    permissions={[
                        'user.view',
                        'user.manage',
                        'course.view',
                        'course.manage',
                        'session.view',
                        'session.revoke',
                        'lead.delete',
                        'schedule.view',
                    ]}
                >
                    <MemoryRouter initialEntries={['/classes/cls-224-001']}>
                        <Routes>
                            <Route path="/classes/:classId" element={<ClassDetailPage />} />
                        </Routes>
                    </MemoryRouter>
                </MockSessionHelper>
            </SessionProvider>
        )

        // Đợi nạp xong lớp học
        await waitFor(() => {
            expect(screen.getByTestId('class-detail-page')).toBeDefined()
        })

        // Nút "+ Ghi danh học viên" vẫn hiển thị với admin
        expect(screen.getByText('+ Ghi danh học viên')).toBeDefined()

        // Nút "📅 Sinh thời khóa biểu" ở Header TUYỆT ĐỐI KHÔNG HIỂN THỊ
        expect(screen.queryByText(/Sinh thời khóa biểu/i)).toBeNull()
    })

    it('2. Quản trị viên vào tab thời khóa biểu (/schedules) không thấy nút sinh lịch tự động', async () => {
        window.fetch = mockFetch([])

        render(
            <SessionProvider apiOrigin="http://localhost:5000" autoRestore={false}>
                <MockSessionHelper
                    role="admin"
                    roles={['admin']}
                    permissions={[
                        'user.view',
                        'user.manage',
                        'course.view',
                        'course.manage',
                        'session.view',
                        'session.revoke',
                        'schedule.view',
                    ]}
                >
                    <MemoryRouter initialEntries={['/classes/cls-224-001/schedules']}>
                        <Routes>
                            <Route path="/classes/:classId/schedules" element={<ClassDetailPage />} />
                        </Routes>
                    </MemoryRouter>
                </MockSessionHelper>
            </SessionProvider>
        )

        await waitFor(() => {
            expect(screen.getByTestId('class-detail-page')).toBeDefined()
            expect(screen.getByText(/Thời khóa biểu của lớp/i)).toBeDefined()
        })

        // Tab Thời khóa biểu không thấy nút "Sinh thời khóa biểu tự động" hay "Cấu hình sinh thời khóa biểu tự động"
        expect(screen.queryByText(/Sinh thời khóa biểu tự động/i)).toBeNull()
        expect(screen.queryByText(/Cấu hình sinh thời khóa biểu tự động/i)).toBeNull()
    })

    it('3. Quản lý đào tạo (training_manager) thấy đầy đủ các nút sinh thời khóa biểu', async () => {
        window.fetch = mockFetch()

        render(
            <SessionProvider apiOrigin="http://localhost:5000" autoRestore={false}>
                <MockSessionHelper
                    role="training_manager"
                    roles={['training_manager']}
                    permissions={[
                        'course.view',
                        'course.manage',
                        'schedule.view',
                        'schedule.manage',
                    ]}
                >
                    <MemoryRouter initialEntries={['/classes/cls-224-001']}>
                        <Routes>
                            <Route path="/classes/:classId" element={<ClassDetailPage />} />
                        </Routes>
                    </MemoryRouter>
                </MockSessionHelper>
            </SessionProvider>
        )

        await waitFor(() => {
            expect(screen.getByTestId('class-detail-page')).toBeDefined()
        })

        // Nút sinh thời khóa biểu ở header hiển thị
        expect(screen.getByText(/Sinh thời khóa biểu/i)).toBeDefined()
    })

    it('4. Tài khoản đa vai trò (Admin + Quản lý đào tạo) được phép sinh lịch', async () => {
        window.fetch = mockFetch()

        render(
            <SessionProvider apiOrigin="http://localhost:5000" autoRestore={false}>
                <MockSessionHelper
                    role="admin"
                    roles={['admin', 'training_manager']}
                    permissions={[
                        'user.manage',
                        'course.manage',
                        'schedule.view',
                        'schedule.manage',
                    ]}
                >
                    <MemoryRouter initialEntries={['/classes/cls-224-001']}>
                        <Routes>
                            <Route path="/classes/:classId" element={<ClassDetailPage />} />
                        </Routes>
                    </MemoryRouter>
                </MockSessionHelper>
            </SessionProvider>
        )

        await waitFor(() => {
            expect(screen.getByTestId('class-detail-page')).toBeDefined()
        })

        expect(screen.getByText(/Sinh thời khóa biểu/i)).toBeDefined()
    })

    it('5. Giảng viên thuần túy không thấy nút sinh lịch nhưng vẫn xem được lịch của lớp (SCRUM-254 regression)', async () => {
        window.fetch = mockFetch([sampleSchedule])

        render(
            <SessionProvider apiOrigin="http://localhost:5000" autoRestore={false}>
                <MockSessionHelper
                    role="trainer"
                    roles={['trainer']}
                    permissions={[
                        'schedule.view',
                        'schedule.personal_view',
                        'attendance.view',
                        'attendance.take',
                    ]}
                >
                    <MemoryRouter initialEntries={['/classes/cls-224-001/schedules']}>
                        <Routes>
                            <Route path="/classes/:classId/schedules" element={<ClassDetailPage />} />
                        </Routes>
                    </MemoryRouter>
                </MockSessionHelper>
            </SessionProvider>
        )

        await waitFor(() => {
            expect(screen.getByTestId('class-detail-page')).toBeDefined()
            expect(screen.getByText(/Thời khóa biểu của lớp/i)).toBeDefined()
        })

        // Nút sinh lịch bị ẩn
        expect(screen.queryByText(/Sinh thời khóa biểu tự động/i)).toBeNull()

        // Nhưng lịch buổi học và nút Chi tiết vẫn xem được
        expect(screen.getByText('Bài 1: Giới thiệu môn học')).toBeDefined()
        expect(screen.getByText('Chi tiết')).toBeDefined()
    })

    it('6. Bảo vệ route: Admin truy cập trực tiếp URL sinh lịch bị Route Guard chặn sang /forbidden', async () => {
        window.fetch = mockFetch()

        render(
            <SessionProvider apiOrigin="http://localhost:5000" autoRestore={false}>
                <MockSessionHelper
                    role="admin"
                    roles={['admin']}
                    permissions={['course.manage', 'schedule.view', 'user.manage']}
                >
                    <MemoryRouter initialEntries={['/classes/cls-224-001/schedules/generate']}>
                        <Routes>
                            <Route
                                element={
                                    <RequirePermission
                                        requiredPermission={SYSTEM_PERMISSIONS.SCHEDULE_MANAGE}
                                        fallbackPath="/forbidden"
                                    />
                                }
                            >
                                <Route
                                    path="/classes/:classId/schedules/generate"
                                    element={<ScheduleGeneratePage />}
                                />
                            </Route>
                            <Route path="/forbidden" element={<div data-testid="forbidden-page">403 Forbidden</div>} />
                        </Routes>
                    </MemoryRouter>
                </MockSessionHelper>
            </SessionProvider>
        )

        await waitFor(() => {
            expect(screen.getByTestId('forbidden-page')).toBeDefined()
        })
    })
})
