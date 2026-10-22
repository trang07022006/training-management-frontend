// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { StudentsPage } from './StudentsPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { StudentDetail } from '../api/studentApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const sampleStudentA: StudentDetail = {
    id: 'stu-uuid-001',
    student_code: 'STU000001',
    full_name: 'Nguyễn Văn A',
    phone: '0988111222',
    email: 'nguyenvana@ictu.edu.vn',
    program_id: 'prog-01',
    user_id: 'user-01',
    lead_id: 'lead-01',
    status: 'enrolled',
    entry_level: 'IELTS 5.5',
    notes: 'Học viên chuyển từ Lead',
    current_class: null,
    class_history: [],
    created_at: '2026-03-01T08:00:00Z',
    updated_at: '2026-03-01T08:00:00Z',
}

const sampleStudentWithClasses: StudentDetail = {
    id: 'stu-uuid-002',
    student_code: 'STU000002',
    full_name: 'Trần Thị B',
    phone: '0977333444',
    email: 'tranthib@ictu.edu.vn',
    program_id: 'prog-01',
    user_id: 'user-02',
    lead_id: null,
    status: 'enrolled',
    entry_level: 'TOEIC 650',
    notes: 'Có kinh nghiệm lập trình căn bản',
    current_class: {
        id: 'cls-01',
        class_code: 'CNTT-K21A',
        name: 'Lập trình Fullstack K21A',
        start_date: '2026-04-01',
        status: 'Đang học',
    },
    class_history: [
        {
            id: 'cls-00',
            class_code: 'PRE-CNTT',
            name: 'Dự bị Đại học CNTT',
            start_date: '2025-09-01',
            status: 'Kết thúc',
        },
    ],
    created_at: '2026-02-15T08:00:00Z',
    updated_at: '2026-02-15T08:00:00Z',
}

function RoleSessionWrapper({
    role,
    permissions,
    children,
}: {
    role?: string | null
    permissions?: string[]
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()
    useEffect(() => {
        if (role !== undefined) {
            startSession(
                { accessToken: 'mock-token', refreshToken: 'mock-refresh' },
                role,
                'user-test-id',
                false,
                'Test User',
                'test@ictu.edu.vn',
                role ? [role] : [],
                permissions,
            )
        }
    }, [role, permissions, startSession])

    if (role !== undefined && !hasSession) {
        return <div>Initializing session...</div>
    }

    return <>{children}</>
}

function renderWithSession(
    ui: ReactNode,
    options: { role?: string; permissions?: string[] } = {},
) {
    const { role = 'admin', permissions } = options

    return render(
        <MemoryRouter>
            <SessionProvider apiOrigin="http://localhost:5000">
                <RoleSessionWrapper role={role} permissions={permissions}>
                    {ui}
                </RoleSessionWrapper>
            </SessionProvider>
        </MemoryRouter>,
    )
}

describe('SCRUM-216: Quản lý hồ sơ học viên (TC216-01 -> TC216-12)', () => {
    // =========================================================================
    // 216-01: XEM VÀ SỬA HỒ SƠ HỌC VIÊN
    // =========================================================================
    describe('216-01: Xem và sửa hồ sơ học viên', () => {
        it('TC216-01: Mở Student tạo từ SCRUM-215 -> hồ sơ hiển thị đúng', async () => {
            renderWithSession(
                <StudentsPage
                    initialStudents={[sampleStudentA]}
                    initialTotal={1}
                    canManageOverride={true}
                />,
            )

            // Bảng hiển thị thông tin
            await waitFor(() => {
                expect(screen.getByTestId('page-title').textContent).toBe('Quản lý hồ sơ học viên')
            })
            expect(screen.getByTestId('student-code-stu-uuid-001').textContent).toBe('STU000001')
            expect(screen.getByTestId('student-name-stu-uuid-001').textContent).toBe('Nguyễn Văn A')
            expect(screen.getByTestId('student-phone-stu-uuid-001').textContent).toBe('0988111222')
            expect(screen.getByTestId('student-email-stu-uuid-001').textContent).toBe('nguyenvana@ictu.edu.vn')
            expect(screen.getByTestId('student-level-stu-uuid-001').textContent).toBe('IELTS 5.5')
            expect(screen.getByTestId('student-notes-stu-uuid-001').textContent).toBe('Học viên chuyển từ Lead')

            // Mở modal hồ sơ chi tiết
            const viewBtn = screen.getByTestId('view-student-stu-uuid-001')
            fireEvent.click(viewBtn)

            expect(screen.getByTestId('student-profile-modal')).toBeDefined()
            expect((screen.getByTestId('student-code-input') as HTMLInputElement).value).toBe('STU000001')
            expect((screen.getByTestId('student-code-input') as HTMLInputElement).disabled).toBe(true)
            expect((screen.getByTestId('student-name-input') as HTMLInputElement).value).toBe('Nguyễn Văn A')
            expect((screen.getByTestId('student-phone-input') as HTMLInputElement).value).toBe('0988111222')
            expect((screen.getByTestId('student-email-input') as HTMLInputElement).value).toBe('nguyenvana@ictu.edu.vn')
            expect((screen.getByTestId('student-entry-level-input') as HTMLInputElement).value).toBe('IELTS 5.5')
            expect((screen.getByTestId('student-notes-input') as HTMLTextAreaElement).value).toBe('Học viên chuyển từ Lead')
        })

        it('TC216-02: Sửa thông tin cá nhân -> lưu thành công', async () => {
            const mockCustomRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
                if (init?.method === 'PUT') {
                    const body = JSON.parse(init.body as string)
                    return Promise.resolve({
                        ok: true,
                        json: () =>
                            Promise.resolve({
                                status: 'success',
                                data: {
                                    ...sampleStudentA,
                                    full_name: body.full_name,
                                    phone: body.phone,
                                    email: body.email,
                                },
                            }),
                    })
                }
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 'success', data: sampleStudentA }),
                })
            })

            renderWithSession(
                <StudentsPage
                    initialStudents={[sampleStudentA]}
                    initialTotal={1}
                    customRequest={mockCustomRequest as any}
                    canManageOverride={true}
                />,
            )

            // Mở modal
            fireEvent.click(screen.getByTestId('view-student-stu-uuid-001'))

            // Sửa tên, điện thoại, email
            const nameInput = screen.getByTestId('student-name-input')
            fireEvent.change(nameInput, { target: { value: 'Nguyễn Văn A Đã Sửa' } })

            const phoneInput = screen.getByTestId('student-phone-input')
            fireEvent.change(phoneInput, { target: { value: '0912345678' } })

            const emailInput = screen.getByTestId('student-email-input')
            fireEvent.change(emailInput, { target: { value: 'nguyenvana.updated@ictu.edu.vn' } })

            // Click lưu
            fireEvent.click(screen.getByTestId('save-student-btn'))

            await waitFor(() => {
                expect(screen.getByTestId('success-alert').textContent).toContain('Cập nhật hồ sơ học viên thành công.')
            })

            expect(mockCustomRequest).toHaveBeenCalledWith(
                '/api/v1/students/stu-uuid-001',
                expect.objectContaining({
                    method: 'PUT',
                }),
            )
        })

        it('TC216-03: Sửa trình độ đầu vào -> lưu thành công', async () => {
            const mockCustomRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
                if (init?.method === 'PUT') {
                    const body = JSON.parse(init.body as string)
                    return Promise.resolve({
                        ok: true,
                        json: () =>
                            Promise.resolve({
                                status: 'success',
                                data: {
                                    ...sampleStudentA,
                                    entry_level: body.entry_level,
                                },
                            }),
                    })
                }
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 'success', data: sampleStudentA }),
                })
            })

            renderWithSession(
                <StudentsPage
                    initialStudents={[sampleStudentA]}
                    initialTotal={1}
                    customRequest={mockCustomRequest as any}
                    canManageOverride={true}
                />,
            )

            fireEvent.click(screen.getByTestId('view-student-stu-uuid-001'))

            const levelInput = screen.getByTestId('student-entry-level-input')
            fireEvent.change(levelInput, { target: { value: 'TOEIC 750 (Đầu vào B2)' } })

            fireEvent.click(screen.getByTestId('save-student-btn'))

            await waitFor(() => {
                expect(screen.getByTestId('success-alert').textContent).toContain('Cập nhật hồ sơ học viên thành công.')
            })
        })

        it('TC216-04: Sửa ghi chú -> lưu thành công', async () => {
            const mockCustomRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
                if (init?.method === 'PUT') {
                    const body = JSON.parse(init.body as string)
                    return Promise.resolve({
                        ok: true,
                        json: () =>
                            Promise.resolve({
                                status: 'success',
                                data: {
                                    ...sampleStudentA,
                                    notes: body.notes,
                                },
                            }),
                    })
                }
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 'success', data: sampleStudentA }),
                })
            })

            renderWithSession(
                <StudentsPage
                    initialStudents={[sampleStudentA]}
                    initialTotal={1}
                    customRequest={mockCustomRequest as any}
                    canManageOverride={true}
                />,
            )

            fireEvent.click(screen.getByTestId('view-student-stu-uuid-001'))

            const notesInput = screen.getByTestId('student-notes-input')
            fireEvent.change(notesInput, { target: { value: 'Ghi chú cập nhật mới' } })

            fireEvent.click(screen.getByTestId('save-student-btn'))

            await waitFor(() => {
                expect(screen.getByTestId('success-alert').textContent).toContain('Cập nhật hồ sơ học viên thành công.')
            })
        })

        it('TC216-05: Reload / loadStudents -> dữ liệu cập nhật hiển thị', async () => {
            const updatedStudent: StudentDetail = {
                ...sampleStudentA,
                full_name: 'Nguyễn Văn Đã Cập Nhật',
                entry_level: 'IELTS 7.0',
                notes: 'Đã lưu database thật',
            }

            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        status: 'success',
                        data: {
                            items: [updatedStudent],
                            total: 1,
                            page: 1,
                            page_size: 50,
                            total_pages: 1,
                        },
                    }),
            })

            renderWithSession(
                <StudentsPage
                    customRequest={mockCustomRequest as any}
                    canManageOverride={true}
                />,
            )

            await waitFor(() => {
                expect(screen.getByTestId('student-name-stu-uuid-001').textContent).toBe('Nguyễn Văn Đã Cập Nhật')
                expect(screen.getByTestId('student-level-stu-uuid-001').textContent).toBe('IELTS 7.0')
                expect(screen.getByTestId('student-notes-stu-uuid-001').textContent).toBe('Đã lưu database thật')
            })
        })
    })

    // =========================================================================
    // 216-02: LỚP ĐANG HỌC VÀ LỊCH SỬ LỚP
    // =========================================================================
    describe('216-02: Lớp đang học và lịch sử các lớp đã học', () => {
        it('TC216-06: Student chưa có lớp -> empty states đúng', async () => {
            renderWithSession(
                <StudentsPage
                    initialStudents={[sampleStudentA]}
                    initialTotal={1}
                    canManageOverride={true}
                />,
            )

            fireEvent.click(screen.getByTestId('view-student-stu-uuid-001'))

            expect(screen.getByTestId('no-current-class').textContent).toBe('Chưa có lớp đang học')
            expect(screen.getByTestId('no-class-history').textContent).toBe('Chưa có lịch sử lớp học')
        })

        it('TC216-07: Nếu đã có class relation hợp lệ -> lớp đang học hiển thị đúng', async () => {
            renderWithSession(
                <StudentsPage
                    initialStudents={[sampleStudentWithClasses]}
                    initialTotal={1}
                    canManageOverride={true}
                />,
            )

            fireEvent.click(screen.getByTestId('view-student-stu-uuid-002'))

            expect(screen.getByTestId('current-class-card')).toBeDefined()
            expect(screen.getByTestId('current-class-card').textContent).toContain('CNTT-K21A')
            expect(screen.getByTestId('current-class-card').textContent).toContain('Lập trình Fullstack K21A')
        })

        it('TC216-08: Nếu có lịch sử hợp lệ -> lịch sử lớp hiển thị đúng', async () => {
            renderWithSession(
                <StudentsPage
                    initialStudents={[sampleStudentWithClasses]}
                    initialTotal={1}
                    canManageOverride={true}
                />,
            )

            fireEvent.click(screen.getByTestId('view-student-stu-uuid-002'))

            expect(screen.getByTestId('class-history-list')).toBeDefined()
            expect(screen.getByTestId('class-history-list').textContent).toContain('PRE-CNTT')
            expect(screen.getByTestId('class-history-list').textContent).toContain('Dự bị Đại học CNTT')
        })
    })

    // =========================================================================
    // 216-03: TÌM KIẾM HỌC VIÊN
    // =========================================================================
    describe('216-03: Tìm kiếm học viên', () => {
        it('TC216-09: Search theo student_code -> gọi API với param search tương ứng', async () => {
            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        status: 'success',
                        data: {
                            items: [sampleStudentA],
                            total: 1,
                            page: 1,
                            page_size: 50,
                            total_pages: 1,
                        },
                    }),
            })

            renderWithSession(
                <StudentsPage
                    initialStudents={[sampleStudentA, sampleStudentWithClasses]}
                    initialTotal={2}
                    customRequest={mockCustomRequest as any}
                />,
            )

            const searchInput = screen.getByTestId('student-search-input')
            fireEvent.change(searchInput, { target: { value: 'STU000001' } })

            fireEvent.click(screen.getByTestId('student-search-btn'))

            await waitFor(() => {
                expect(mockCustomRequest).toHaveBeenCalledWith(
                    expect.stringContaining('search=STU000001'),
                    expect.anything(),
                )
            })
        })

        it('TC216-10: Search theo tên -> gọi API với param tên', async () => {
            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        status: 'success',
                        data: {
                            items: [sampleStudentWithClasses],
                            total: 1,
                            page: 1,
                            page_size: 50,
                            total_pages: 1,
                        },
                    }),
            })

            renderWithSession(
                <StudentsPage
                    initialStudents={[sampleStudentA, sampleStudentWithClasses]}
                    initialTotal={2}
                    customRequest={mockCustomRequest as any}
                />,
            )

            const searchInput = screen.getByTestId('student-search-input')
            fireEvent.change(searchInput, { target: { value: 'Trần Thị B' } })
            fireEvent.click(screen.getByTestId('student-search-btn'))

            await waitFor(() => {
                expect(mockCustomRequest).toHaveBeenCalledWith(
                    expect.stringContaining('search=Tr%E1%BA%A7n+Th%E1%BB%8B+B'),
                    expect.anything(),
                )
            })
        })

        it('TC216-11: Search theo số điện thoại -> gọi API với param phone', async () => {
            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        status: 'success',
                        data: {
                            items: [sampleStudentA],
                            total: 1,
                            page: 1,
                            page_size: 50,
                            total_pages: 1,
                        },
                    }),
            })

            renderWithSession(
                <StudentsPage
                    initialStudents={[sampleStudentA, sampleStudentWithClasses]}
                    initialTotal={2}
                    customRequest={mockCustomRequest as any}
                />,
            )

            const searchInput = screen.getByTestId('student-search-input')
            fireEvent.change(searchInput, { target: { value: '0988111222' } })
            fireEvent.click(screen.getByTestId('student-search-btn'))

            await waitFor(() => {
                expect(mockCustomRequest).toHaveBeenCalledWith(
                    expect.stringContaining('search=0988111222'),
                    expect.anything(),
                )
            })
        })

        it('TC216-12: Search không có kết quả -> empty state đúng, không lỗi', async () => {
            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        status: 'success',
                        data: {
                            items: [],
                            total: 0,
                            page: 1,
                            page_size: 50,
                            total_pages: 0,
                        },
                    }),
            })

            renderWithSession(
                <StudentsPage
                    initialStudents={[]}
                    initialTotal={0}
                    customRequest={mockCustomRequest as any}
                />,
            )

            const searchInput = screen.getByTestId('student-search-input')
            fireEvent.change(searchInput, { target: { value: 'KHONG_TON_TAI' } })
            fireEvent.click(screen.getByTestId('student-search-btn'))

            await waitFor(() => {
                expect(screen.getByTestId('empty-state').textContent).toContain(
                    'Không tìm thấy học viên nào phù hợp với từ khóa tìm kiếm.',
                )
            })
        })
    })
})
