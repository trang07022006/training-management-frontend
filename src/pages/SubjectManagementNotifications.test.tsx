// @vitest-environment jsdom
/**
 * Bộ kiểm thử đặc tả thông báo nghiệp vụ Quản lý môn học (SCRUM-123 Notification Test Matrix).
 * Kiểm tra đầy đủ 11 kịch bản theo yêu cầu nghiệp vụ:
 * 1. Create success
 * 2. Duplicate code
 * 3. Update success
 * 4. Delete unused subject
 * 5. Delete subject used in program (Case A)
 * 6. Delete subject with class dependency (Case B)
 * 7. Delete subject with sessions (Case C)
 * 8. Delete prerequisite dependency (Case D)
 * 9. Archived subject action
 * 10. Subject not found
 * 11. Network error
 */

import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { SubjectsPage } from './SubjectsPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { Subject } from '../api/subjectApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

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

const sampleSubject: Subject = {
    id: 'subj-001',
    code: 'CS101',
    name: 'Cơ sở lập trình',
    credits: 3,
    total_sessions: 15,
    weight: 1.0,
    learning_outcomes: 'Chuẩn đầu ra môn học',
    status: 'active',
    description: 'Mô tả môn học CS101',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
}

describe('SCRUM-123 Subject Management Notifications', () => {
    // 1. Create success
    it('1. Tạo môn học thành công hiển thị thông báo thành công rõ ràng', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    status: 201,
                    json: async () => ({
                        status: 'success',
                        message: 'Tạo môn học thành công.',
                        data: { ...sampleSubject, id: 'subj-new', code: 'CS102', name: 'Lập trình nâng cao' },
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ status: 'success', data: { items: [sampleSubject], total: 1 } }),
            })
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={[sampleSubject]} initialTotal={1} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-create-subject'))
        fireEvent.change(screen.getByTestId('create-input-code'), { target: { value: 'CS102' } })
        fireEvent.change(screen.getByTestId('create-input-name'), { target: { value: 'Lập trình nâng cao' } })
        fireEvent.change(screen.getByTestId('create-input-credits'), { target: { value: '3' } })
        fireEvent.click(screen.getByTestId('btn-submit-create'))

        await waitFor(() => {
            expect(screen.queryByTestId('modal-create-subject')).toBeNull()
            expect(screen.getByTestId('banner-success').textContent).toContain('Tạo môn học thành công.')
        })
    })

    // 2. Duplicate code
    it('2. Trùng mã môn học hiển thị "Mã môn học này đã tồn tại. Vui lòng sử dụng mã khác."', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'POST') {
                return Promise.resolve({
                    ok: false,
                    status: 409,
                    json: async () => ({
                        code: 'DUPLICATE_CODE',
                        message: 'Conflict duplicate code',
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ status: 'success', data: { items: [sampleSubject], total: 1 } }),
            })
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={[sampleSubject]} initialTotal={1} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-create-subject'))
        fireEvent.change(screen.getByTestId('create-input-code'), { target: { value: 'CS101' } })
        fireEvent.change(screen.getByTestId('create-input-name'), { target: { value: 'Trùng mã' } })
        fireEvent.change(screen.getByTestId('create-input-credits'), { target: { value: '3' } })
        fireEvent.click(screen.getByTestId('btn-submit-create'))

        await waitFor(() => {
            expect(screen.getByTestId('error-code').textContent).toBe(
                'Mã môn học này đã tồn tại. Vui lòng sử dụng mã khác.',
            )
        })
    })

    // 3. Update success
    it('3. Cập nhật môn học thành công hiển thị banner thành công', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'PUT') {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        status: 'success',
                        message: 'Cập nhật môn học thành công.',
                        data: { ...sampleSubject, name: 'Cơ sở lập trình v2' },
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ status: 'success', data: { items: [sampleSubject], total: 1 } }),
            })
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={[sampleSubject]} initialTotal={1} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId(`btn-edit-${sampleSubject.id}`))
        fireEvent.change(screen.getByTestId('edit-input-name'), { target: { value: 'Cơ sở lập trình v2' } })
        fireEvent.click(screen.getByTestId('btn-submit-edit'))

        await waitFor(() => {
            expect(screen.queryByTestId('modal-edit-subject')).toBeNull()
            expect(screen.getByTestId('banner-success').textContent).toContain('Cập nhật môn học thành công.')
        })
    })

    // 4. Delete unused subject
    it('4. Xóa môn học chưa có ràng buộc thành công sau khi xác nhận', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'DELETE') {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ status: 'success', message: 'Xóa môn học thành công.', data: { id: sampleSubject.id } }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ status: 'success', data: { items: [], total: 0 } }),
            })
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={[sampleSubject]} initialTotal={1} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId(`btn-delete-${sampleSubject.id}`))
        expect(screen.getByTestId('modal-delete-confirm')).toBeDefined()
        expect(screen.getByTestId('modal-delete-confirm').textContent).toContain('Thao tác này không thể hoàn tác.')

        fireEvent.click(screen.getByTestId('btn-confirm-delete'))

        await waitFor(() => {
            expect(screen.queryByTestId('modal-delete-confirm')).toBeNull()
            expect(screen.getByTestId('banner-success').textContent).toContain('Xóa môn học thành công.')
        })
    })

    // 5. Delete subject used in program (Case A)
    it('5. Môn đang thuộc chương trình đào tạo -> hiển thị lý do và nút Đóng', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'DELETE') {
                return Promise.resolve({
                    ok: false,
                    status: 409,
                    json: async () => ({
                        code: 'SUBJECT_IN_USE',
                        reason: 'PROGRAM_ASSOCIATION',
                        details: { program_count: 2 },
                        message: 'Không thể xóa môn học vì môn đang được sử dụng trong 2 chương trình đào tạo. Hãy gỡ môn khỏi các chương trình liên quan trước khi xóa.',
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ status: 'success', data: { items: [sampleSubject], total: 1 } }),
            })
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={[sampleSubject]} initialTotal={1} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId(`btn-delete-${sampleSubject.id}`))
        fireEvent.click(screen.getByTestId('btn-confirm-delete'))

        await waitFor(() => {
            const errorElem = screen.getByTestId('delete-dialog-error')
            expect(errorElem.textContent).toContain('chương trình đào tạo')
            expect(errorElem.textContent).toContain('Hãy gỡ môn khỏi các chương trình liên quan trước khi xóa')
            // Nút đỏ Xóa môn học bị ẩn đi, chỉ còn nút Đóng
            expect(screen.queryByTestId('btn-confirm-delete')).toBeNull()
            expect(screen.getByTestId('btn-cancel-delete').textContent).toBe('Đóng')
        })

        // Bấm Đóng -> đóng modal an toàn
        fireEvent.click(screen.getByTestId('btn-cancel-delete'))
        expect(screen.queryByTestId('modal-delete-confirm')).toBeNull()
    })

    // 6. Delete subject with class dependency (Case B)
    it('6. Môn đã có lớp học -> hiển thị "Không thể xóa môn học vì môn đã có lớp học."', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'DELETE') {
                return Promise.resolve({
                    ok: false,
                    status: 409,
                    json: async () => ({
                        code: 'SUBJECT_IN_USE',
                        reason: 'CLASS_EXISTS',
                        message: 'Không thể xóa môn học vì môn đã có lớp học. Để bảo toàn dữ liệu đào tạo, môn học đã phát sinh lớp học không được phép xóa. Hãy chuyển môn học sang trạng thái Đã lưu trữ nếu không còn sử dụng.',
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ status: 'success', data: { items: [sampleSubject], total: 1 } }),
            })
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={[sampleSubject]} initialTotal={1} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId(`btn-delete-${sampleSubject.id}`))
        fireEvent.click(screen.getByTestId('btn-confirm-delete'))

        await waitFor(() => {
            const errorElem = screen.getByTestId('delete-dialog-error')
            expect(errorElem.textContent).toContain('Không thể xóa môn học vì môn đã có lớp học')
            expect(errorElem.textContent).toContain('Hãy chuyển môn học sang trạng thái Đã lưu trữ nếu không còn sử dụng')
        })
    })

    // 7. Delete subject with sessions (Case C)
    it('7. Môn vẫn còn các buổi học -> hiển thị "Không thể xóa môn học vì môn vẫn còn các buổi học."', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'DELETE') {
                return Promise.resolve({
                    ok: false,
                    status: 409,
                    json: async () => ({
                        code: 'SUBJECT_IN_USE',
                        reason: 'SESSION_EXISTS',
                        message: 'Không thể xóa môn học vì môn vẫn còn các buổi học. Hãy xử lý các buổi học liên quan trước khi xóa.',
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ status: 'success', data: { items: [sampleSubject], total: 1 } }),
            })
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={[sampleSubject]} initialTotal={1} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId(`btn-delete-${sampleSubject.id}`))
        fireEvent.click(screen.getByTestId('btn-confirm-delete'))

        await waitFor(() => {
            const errorElem = screen.getByTestId('delete-dialog-error')
            expect(errorElem.textContent).toContain('Không thể xóa môn học vì môn vẫn còn các buổi học')
            expect(errorElem.textContent).toContain('Hãy xử lý các buổi học liên quan trước khi xóa')
        })
    })

    // 8. Delete prerequisite dependency (Case D)
    it('8. Môn đang làm tiên quyết -> hiển thị "Không thể xóa môn học vì môn đang được sử dụng làm môn tiên quyết."', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'DELETE') {
                return Promise.resolve({
                    ok: false,
                    status: 409,
                    json: async () => ({
                        code: 'SUBJECT_IN_USE',
                        reason: 'PREREQUISITE_EXISTS',
                        message: 'Không thể xóa môn học vì môn đang được sử dụng làm môn tiên quyết. Hãy gỡ các quan hệ tiên quyết liên quan trước khi xóa.',
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ status: 'success', data: { items: [sampleSubject], total: 1 } }),
            })
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={[sampleSubject]} initialTotal={1} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId(`btn-delete-${sampleSubject.id}`))
        fireEvent.click(screen.getByTestId('btn-confirm-delete'))

        await waitFor(() => {
            const errorElem = screen.getByTestId('delete-dialog-error')
            expect(errorElem.textContent).toContain('Không thể xóa môn học vì môn đang được sử dụng làm môn tiên quyết')
            expect(errorElem.textContent).toContain('Hãy gỡ các quan hệ tiên quyết liên quan trước khi xóa')
        })
    })

    // 9. Archived subject action
    it('9. Môn học đã lưu trữ không được chỉnh sửa -> hiển thị "Môn học đã được lưu trữ và không thể chỉnh sửa."', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'PUT') {
                return Promise.resolve({
                    ok: false,
                    status: 400,
                    json: async () => ({
                        code: 'SUBJECT_ARCHIVED',
                        message: 'Môn học đã được lưu trữ và không thể chỉnh sửa.',
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ status: 'success', data: { items: [sampleSubject], total: 1 } }),
            })
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={[sampleSubject]} initialTotal={1} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId(`btn-edit-${sampleSubject.id}`))
        fireEvent.click(screen.getByTestId('btn-submit-edit'))

        await waitFor(() => {
            expect(screen.getByTestId('modal-edit-subject').textContent).toContain(
                'Môn học đã được lưu trữ và không thể chỉnh sửa.',
            )
        })
    })

    // 10. Subject not found
    it('10. Môn học không tồn tại (404) -> hiển thị "Không tìm thấy môn học. Dữ liệu có thể đã được thay đổi hoặc xóa."', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'DELETE') {
                return Promise.resolve({
                    ok: false,
                    status: 404,
                    json: async () => ({
                        code: 'SUBJECT_NOT_FOUND',
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ status: 'success', data: { items: [sampleSubject], total: 1 } }),
            })
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={[sampleSubject]} initialTotal={1} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId(`btn-delete-${sampleSubject.id}`))
        fireEvent.click(screen.getByTestId('btn-confirm-delete'))

        await waitFor(() => {
            expect(screen.getByTestId('delete-dialog-error').textContent).toContain(
                'Không tìm thấy môn học. Dữ liệu có thể đã được thay đổi hoặc xóa.',
            )
        })
    })

    // 11. Network error
    it('11. Lỗi mạng -> hiển thị "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại."', async () => {
        const mockRequest = vi.fn().mockImplementation(() => {
            return Promise.reject(new Error('Failed to fetch'))
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={undefined} />,
            { role: 'admin' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('banner-error').textContent).toContain(
                'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.',
            )
        })
    })
})
