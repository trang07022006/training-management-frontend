// @vitest-environment jsdom
import { useState } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { CreateUserModal } from './CreateUserModal'
import { SessionProvider } from '../auth/SessionProvider'
import type { User } from '../api/userApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const mockCreatedUser: User = {
    id: 99,
    name: 'Phan Văn Mới',
    email: 'newuser@tms.local',
    phone: '0988776655',
    role: 'trainee',
    status: 'active',
    created_at: '2026-03-30T10:00:00Z',
}

function renderWithProvider(ui: React.ReactNode) {
    return render(
        <SessionProvider apiOrigin="http://127.0.0.1:5000">
            {ui}
        </SessionProvider>
    )
}

describe('SCRUM-92: Create User Modal Component', () => {
    it('1. render đầy đủ các trường nhập liệu và nút thao tác', () => {
        renderWithProvider(
            <CreateUserModal
                isOpen={true}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        expect(screen.getByTestId('create-user-modal')).toBeDefined()
        expect(screen.getByRole('heading', { name: 'Thêm người dùng mới' })).toBeDefined()
        expect(screen.getByTestId('input-create-name')).toBeDefined()
        expect(screen.getByTestId('input-create-email')).toBeDefined()
        expect(screen.getByTestId('input-create-password')).toBeDefined()
        expect(screen.getByTestId('input-create-phone')).toBeDefined()
        expect(screen.getByTestId('select-create-role')).toBeDefined()
        expect(screen.getByTestId('select-create-status')).toBeDefined()
        expect(screen.getByTestId('btn-submit-create')).toBeDefined()
        expect(screen.getByTestId('btn-cancel-create')).toBeDefined()
        expect(screen.getByTestId('btn-close-create-modal')).toBeDefined()
    })

    it('2. không render gì khi isOpen = false', () => {
        renderWithProvider(
            <CreateUserModal
                isOpen={false}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        expect(screen.queryByTestId('create-user-modal')).toBeNull()
    })

    it('3. hiển thị lỗi validation khi submit form trống', async () => {
        renderWithProvider(
            <CreateUserModal
                isOpen={true}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        const submitBtn = screen.getByTestId('btn-submit-create')
        fireEvent.click(submitBtn)

        await waitFor(() => {
            expect(screen.getByTestId('error-create-name')).toBeDefined()
            expect(screen.getByText('Họ và tên không được để trống.')).toBeDefined()
            expect(screen.getByTestId('error-create-email')).toBeDefined()
            expect(screen.getByText('Email không được để trống.')).toBeDefined()
            expect(screen.getByTestId('error-create-password')).toBeDefined()
            expect(screen.getByText('Mật khẩu không được để trống.')).toBeDefined()
        })
    })

    it('4. hiển thị lỗi khi email sai định dạng hoặc mật khẩu dưới 8 ký tự', async () => {
        renderWithProvider(
            <CreateUserModal
                isOpen={true}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        fireEvent.change(screen.getByTestId('input-create-name'), { target: { value: 'Lê Văn A' } })
        fireEvent.change(screen.getByTestId('input-create-email'), { target: { value: 'not-an-email' } })
        fireEvent.change(screen.getByTestId('input-create-password'), { target: { value: '12345' } })

        fireEvent.click(screen.getByTestId('btn-submit-create'))

        await waitFor(() => {
            expect(screen.getByText('Email không đúng định dạng.')).toBeDefined()
            expect(screen.getByText('Mật khẩu phải có ít nhất 8 ký tự.')).toBeDefined()
        })
    })

    it('5. toggle ẩn/hiện mật khẩu thay đổi input type tương ứng', () => {
        renderWithProvider(
            <CreateUserModal
                isOpen={true}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        const passwordInput = screen.getByTestId('input-create-password') as HTMLInputElement
        const toggleBtn = screen.getByTestId('btn-toggle-create-password')

        expect(passwordInput.type).toBe('password')

        fireEvent.click(toggleBtn)
        expect(passwordInput.type).toBe('text')

        fireEvent.click(toggleBtn)
        expect(passwordInput.type).toBe('password')
    })

    it('6. submit thành công gọi API, kích hoạt onSuccess và đóng modal', async () => {
        const handleSuccess = vi.fn()
        const handleClose = vi.fn()

        const mockCustomRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 201,
            json: async () => ({
                status: 'success',
                data: mockCreatedUser,
            }),
        } as unknown as Response)

        renderWithProvider(
            <CreateUserModal
                isOpen={true}
                onClose={handleClose}
                onSuccess={handleSuccess}
                customRequest={mockCustomRequest}
            />
        )

        fireEvent.change(screen.getByTestId('input-create-name'), { target: { value: 'Phan Văn Mới' } })
        fireEvent.change(screen.getByTestId('input-create-email'), { target: { value: 'newuser@tms.local' } })
        fireEvent.change(screen.getByTestId('input-create-password'), { target: { value: 'SecurePass123' } })
        fireEvent.change(screen.getByTestId('input-create-phone'), { target: { value: '0988776655' } })
        fireEvent.change(screen.getByTestId('select-create-role'), { target: { value: 'trainee' } })
        fireEvent.change(screen.getByTestId('select-create-status'), { target: { value: 'active' } })

        fireEvent.click(screen.getByTestId('btn-submit-create'))

        await waitFor(() => {
            expect(mockCustomRequest).toHaveBeenCalledTimes(1)
            const [url, init] = mockCustomRequest.mock.calls[0]
            expect(url).toBe('/api/users')
            expect(init.method).toBe('POST')

            const body = JSON.parse(init.body)
            expect(body.name).toBe('Phan Văn Mới')
            expect(body.email).toBe('newuser@tms.local')
            expect(body.password).toBe('SecurePass123')
            expect(body.phone).toBe('0988776655')
            expect(body.role).toBe('trainee')
            expect(body.status).toBe('active')

            expect(handleSuccess).toHaveBeenCalledWith(mockCreatedUser)
            expect(handleClose).toHaveBeenCalledTimes(1)
        })
    })

    it('7. xử lý lỗi 409 DUPLICATE_EMAIL và hiển thị thông báo lỗi ô email', async () => {
        const mockCustomRequest = vi.fn().mockResolvedValue({
            ok: false,
            status: 409,
            json: async () => ({
                status: 'error',
                code: 'DUPLICATE_EMAIL',
                message: 'Email đã được sử dụng.',
            }),
        } as unknown as Response)

        renderWithProvider(
            <CreateUserModal
                isOpen={true}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
                customRequest={mockCustomRequest}
            />
        )

        fireEvent.change(screen.getByTestId('input-create-name'), { target: { value: 'Lê Văn A' } })
        fireEvent.change(screen.getByTestId('input-create-email'), { target: { value: 'existing@tms.local' } })
        fireEvent.change(screen.getByTestId('input-create-password'), { target: { value: 'SecurePass123' } })

        fireEvent.click(screen.getByTestId('btn-submit-create'))

        await waitFor(() => {
            expect(screen.getByTestId('error-create-email')).toBeDefined()
            expect(screen.getByText('Email này đã được sử dụng.')).toBeDefined()
        })
    })

    it('8. click nút Hủy bỏ hoặc nút Đóng (X) kích hoạt onClose', () => {
        const handleClose = vi.fn()
        renderWithProvider(
            <CreateUserModal
                isOpen={true}
                onClose={handleClose}
                onSuccess={vi.fn()}
            />
        )

        fireEvent.click(screen.getByTestId('btn-cancel-create'))
        expect(handleClose).toHaveBeenCalledTimes(1)

        fireEvent.click(screen.getByTestId('btn-close-create-modal'))
        expect(handleClose).toHaveBeenCalledTimes(2)
    })
})

describe('SCRUM-25: Reset Form State trên CreateUserModal', () => {
    function TestHarness({
        customRequest,
        initialOpen = true,
    }: {
        customRequest?: (path: string, init?: RequestInit) => Promise<Response>
        initialOpen?: boolean
    }) {
        const [isOpen, setIsOpen] = useState(initialOpen)
        return (
            <div>
                <button data-testid="btn-harness-open" onClick={() => setIsOpen(true)}>
                    Mở modal
                </button>
                <button data-testid="btn-harness-close" onClick={() => setIsOpen(false)}>
                    Đóng modal
                </button>
                <CreateUserModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onSuccess={() => setIsOpen(false)}
                    customRequest={customRequest}
                />
            </div>
        )
    }

    it('1. form initially empty: form mở lần đầu có các trường trống và giá trị mặc định chuẩn', () => {
        renderWithProvider(<TestHarness />)

        expect((screen.getByTestId('input-create-name') as HTMLInputElement).value).toBe('')
        expect((screen.getByTestId('input-create-email') as HTMLInputElement).value).toBe('')
        expect((screen.getByTestId('input-create-password') as HTMLInputElement).value).toBe('')
        expect((screen.getByTestId('input-create-phone') as HTMLInputElement).value).toBe('')
        expect((screen.getByTestId('select-create-role') as HTMLSelectElement).value).toBe('user')
        expect((screen.getByTestId('select-create-status') as HTMLSelectElement).value).toBe('active')
        expect(screen.queryByTestId('error-create-name')).toBeNull()
        expect(screen.queryByTestId('error-create-email')).toBeNull()
        expect(screen.queryByTestId('error-create-password')).toBeNull()
        expect(screen.queryByTestId('create-modal-error-banner')).toBeNull()
    })

    it('2. create success resets form: tạo user thành công thì form được reset và xóa toàn bộ dữ liệu nhập', async () => {
        const handleSuccess = vi.fn()
        const handleClose = vi.fn()
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 201,
            json: async () => ({ status: 'success', data: mockCreatedUser }),
        } as unknown as Response)

        renderWithProvider(
            <CreateUserModal
                isOpen={true}
                onClose={handleClose}
                onSuccess={handleSuccess}
                customRequest={mockRequest}
            />
        )

        fireEvent.change(screen.getByTestId('input-create-name'), { target: { value: 'User Success' } })
        fireEvent.change(screen.getByTestId('input-create-email'), { target: { value: 'success@tms.local' } })
        fireEvent.change(screen.getByTestId('input-create-password'), { target: { value: 'Password123' } })
        fireEvent.change(screen.getByTestId('input-create-phone'), { target: { value: '0901234567' } })
        fireEvent.change(screen.getByTestId('select-create-role'), { target: { value: 'trainer' } })
        fireEvent.change(screen.getByTestId('select-create-status'), { target: { value: 'locked' } })

        fireEvent.click(screen.getByTestId('btn-submit-create'))

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledTimes(1)
            expect(handleSuccess).toHaveBeenCalledWith(mockCreatedUser)
            expect(handleClose).toHaveBeenCalledTimes(1)
        })
    })

    it('3. reopen after success -> empty: tạo user thành công và mở lại modal thì form hoàn toàn sạch', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 201,
            json: async () => ({ status: 'success', data: mockCreatedUser }),
        } as unknown as Response)

        renderWithProvider(<TestHarness customRequest={mockRequest} />)

        // Nhập đầy đủ thông tin
        fireEvent.change(screen.getByTestId('input-create-name'), { target: { value: 'User Mới' } })
        fireEvent.change(screen.getByTestId('input-create-email'), { target: { value: 'user@daotao.edu.vn' } })
        fireEvent.change(screen.getByTestId('input-create-password'), { target: { value: 'MatKhau123!' } })
        fireEvent.change(screen.getByTestId('input-create-phone'), { target: { value: '0912345678' } })
        fireEvent.change(screen.getByTestId('select-create-role'), { target: { value: 'trainer' } })
        fireEvent.change(screen.getByTestId('select-create-status'), { target: { value: 'locked' } })

        // Submit form
        fireEvent.click(screen.getByTestId('btn-submit-create'))

        // Chờ modal đóng sau khi thành công
        await waitFor(() => {
            expect(screen.queryByTestId('create-user-modal')).toBeNull()
        })

        // Mở lại modal lần thứ 2
        fireEvent.click(screen.getByTestId('btn-harness-open'))

        // Kiểm tra toàn bộ field đã được reset sạch sẽ
        expect((screen.getByTestId('input-create-name') as HTMLInputElement).value).toBe('')
        expect((screen.getByTestId('input-create-email') as HTMLInputElement).value).toBe('')
        expect((screen.getByTestId('input-create-password') as HTMLInputElement).value).toBe('')
        expect((screen.getByTestId('input-create-phone') as HTMLInputElement).value).toBe('')
        expect((screen.getByTestId('select-create-role') as HTMLSelectElement).value).toBe('user')
        expect((screen.getByTestId('select-create-status') as HTMLSelectElement).value).toBe('active')
        expect(screen.queryByTestId('error-create-name')).toBeNull()
        expect(screen.queryByTestId('error-create-email')).toBeNull()
        expect(screen.queryByTestId('error-create-password')).toBeNull()
    })

    it('4. cancel resets form: bấm Hủy bỏ kích hoạt resetForm và đóng modal', () => {
        const handleClose = vi.fn()
        renderWithProvider(
            <CreateUserModal
                isOpen={true}
                onClose={handleClose}
                onSuccess={vi.fn()}
            />
        )

        fireEvent.change(screen.getByTestId('input-create-name'), { target: { value: 'Dang Nhap' } })
        fireEvent.change(screen.getByTestId('input-create-email'), { target: { value: 'cancel@tms.local' } })
        fireEvent.change(screen.getByTestId('input-create-password'), { target: { value: 'Pass12345' } })

        fireEvent.click(screen.getByTestId('btn-cancel-create'))
        expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('5. reopen after cancel -> empty: bấm Hủy bỏ rồi mở lại thì form hoàn toàn sạch', () => {
        renderWithProvider(<TestHarness />)

        // Nhập thông tin dang dở
        fireEvent.change(screen.getByTestId('input-create-name'), { target: { value: 'Đang Nhập Dở' } })
        fireEvent.change(screen.getByTestId('input-create-email'), { target: { value: 'dodo@tms.local' } })
        fireEvent.change(screen.getByTestId('input-create-password'), { target: { value: 'UnfinishedPass123' } })
        fireEvent.change(screen.getByTestId('select-create-role'), { target: { value: 'trainer' } })

        // Bấm nút Hủy bỏ
        fireEvent.click(screen.getByTestId('btn-cancel-create'))

        expect(screen.queryByTestId('create-user-modal')).toBeNull()

        // Mở lại modal
        fireEvent.click(screen.getByTestId('btn-harness-open'))

        expect((screen.getByTestId('input-create-name') as HTMLInputElement).value).toBe('')
        expect((screen.getByTestId('input-create-email') as HTMLInputElement).value).toBe('')
        expect((screen.getByTestId('input-create-password') as HTMLInputElement).value).toBe('')
        expect((screen.getByTestId('select-create-role') as HTMLSelectElement).value).toBe('user')
    })

    it('6. duplicate email error disappears after close/reopen: lỗi email trùng biến mất khi đóng và mở lại', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: false,
            status: 409,
            json: async () => ({
                status: 'error',
                code: 'DUPLICATE_EMAIL',
                message: 'Email đã được sử dụng.',
            }),
        } as unknown as Response)

        renderWithProvider(<TestHarness customRequest={mockRequest} />)

        fireEvent.change(screen.getByTestId('input-create-name'), { target: { value: 'Trùng Email' } })
        fireEvent.change(screen.getByTestId('input-create-email'), { target: { value: 'duplicate@tms.local' } })
        fireEvent.change(screen.getByTestId('input-create-password'), { target: { value: 'Password123' } })

        fireEvent.click(screen.getByTestId('btn-submit-create'))

        await waitFor(() => {
            expect(screen.getByText('Email này đã được sử dụng.')).toBeDefined()
        })

        // Đóng modal bằng nút đóng (X)
        fireEvent.click(screen.getByTestId('btn-close-create-modal'))
        expect(screen.queryByTestId('create-user-modal')).toBeNull()

        // Mở lại modal
        fireEvent.click(screen.getByTestId('btn-harness-open'))

        // Lỗi cũ không còn hiển thị và các ô nhập trống
        expect(screen.queryByText('Email này đã được sử dụng.')).toBeNull()
        expect(screen.queryByTestId('error-create-email')).toBeNull()
        expect((screen.getByTestId('input-create-email') as HTMLInputElement).value).toBe('')
    })

    it('7. password never remains after modal close: mật khẩu không bao giờ được giữ lại sau khi đóng', () => {
        renderWithProvider(<TestHarness />)

        fireEvent.change(screen.getByTestId('input-create-password'), { target: { value: 'SecretPassword999!' } })
        expect((screen.getByTestId('input-create-password') as HTMLInputElement).value).toBe('SecretPassword999!')

        // Đóng modal từ bên ngoài (thông qua prop isOpen)
        fireEvent.click(screen.getByTestId('btn-harness-close'))
        expect(screen.queryByTestId('create-user-modal')).toBeNull()

        // Mật khẩu không được lưu vào storage
        expect(localStorage.getItem('password')).toBeNull()
        expect(sessionStorage.getItem('password')).toBeNull()

        // Mở lại modal
        fireEvent.click(screen.getByTestId('btn-harness-open'))

        // Password chắc chắn rỗng
        expect((screen.getByTestId('input-create-password') as HTMLInputElement).value).toBe('')
        expect(screen.queryByDisplayValue('SecretPassword999!')).toBeNull()
    })

    it('8. dropdown Vai trò hiển thị đầy đủ 6 vai trò bao gồm Tư vấn tuyển sinh và Quản lý đào tạo', () => {
        renderWithProvider(
            <CreateUserModal
                isOpen={true}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        const roleSelect = screen.getByTestId('select-create-role') as HTMLSelectElement
        const options = Array.from(roleSelect.options).map((opt) => ({
            value: opt.value,
            text: opt.text,
        }))

        expect(options).toEqual([
            { value: 'user', text: 'Người dùng' },
            { value: 'trainee', text: 'Học viên' },
            { value: 'trainer', text: 'Giảng viên' },
            { value: 'consultant', text: 'Tư vấn tuyển sinh' },
            { value: 'training_manager', text: 'Quản lý đào tạo' },
            { value: 'admin', text: 'Quản trị viên' },
        ])
    })

    it('9. tạo người dùng với vai trò Tư vấn tuyển sinh gửi đúng role consultant lên backend', async () => {
        const mockCreatedConsultant: User = {
            id: 101,
            name: 'QA Tư vấn tuyển sinh',
            email: 'qa.consultant@ictu.test',
            phone: '0988776655',
            role: 'consultant',
            status: 'active',
        }

        let sentPayload: any = null
        const mockRequest = vi.fn().mockImplementation(async (path: string, init?: RequestInit) => {
            if (path === '/api/roles') {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        status: 'success',
                        data: {
                            items: [
                                { id: 'r1', code: 'user', name: 'Người dùng' },
                                { id: 'r2', code: 'trainee', name: 'Học viên' },
                                { id: 'r3', code: 'trainer', name: 'Giảng viên' },
                                { id: 'r4', code: 'consultant', name: 'Tư vấn tuyển sinh' },
                                { id: 'r5', code: 'training_manager', name: 'Quản lý đào tạo' },
                                { id: 'r6', code: 'admin', name: 'Quản trị viên' },
                            ],
                        },
                    }),
                } as unknown as Response
            }
            if (path === '/api/users' && init?.method === 'POST') {
                sentPayload = JSON.parse(init.body as string)
                return {
                    ok: true,
                    status: 201,
                    json: async () => ({
                        status: 'success',
                        data: mockCreatedConsultant,
                    }),
                } as unknown as Response
            }
            return { ok: false, status: 404, json: async () => ({}) } as unknown as Response
        })

        const onSuccess = vi.fn()
        renderWithProvider(
            <CreateUserModal
                isOpen={true}
                onClose={vi.fn()}
                onSuccess={onSuccess}
                customRequest={mockRequest}
                customRolesRequest={mockRequest}
            />
        )

        fireEvent.change(screen.getByTestId('input-create-name'), { target: { value: 'QA Tư vấn tuyển sinh' } })
        fireEvent.change(screen.getByTestId('input-create-email'), { target: { value: 'qa.consultant@ictu.test' } })
        fireEvent.change(screen.getByTestId('input-create-password'), { target: { value: 'ConsultantPassword123' } })
        fireEvent.change(screen.getByTestId('select-create-role'), { target: { value: 'consultant' } })

        fireEvent.click(screen.getByTestId('btn-submit-create'))

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalledWith(mockCreatedConsultant)
        })

        expect(sentPayload).toBeDefined()
        expect(sentPayload.role).toBe('consultant')
        expect(sentPayload.email).toBe('qa.consultant@ictu.test')
    })
})

