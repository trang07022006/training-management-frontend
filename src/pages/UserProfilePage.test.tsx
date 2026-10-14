// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UserProfilePage } from './UserProfilePage'
import type { UserProfileData } from '../api/userApi'

// Mock useSession and useNavigate hooks
const mockRequest = vi.fn()
const mockUseSession = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../auth/SessionProvider', () => ({
    useSession: () => mockUseSession(),
}))

vi.mock('react-router', async () => {
    const actual = await vi.importActual<typeof import('react-router')>('react-router')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

const sampleProfile: UserProfileData = {
    id: 'user-001',
    email: 'nguyenvana@daotao.edu.vn',
    name: 'Nguyễn Văn A',
    phone: '0912345678',
    date_of_birth: '1995-08-20',
    address: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    role: 'trainer',
    status: 'active',
}

function mockResponse(data: unknown, status = 200, ok = true): Response {
    return {
        ok,
        status,
        json: async () => data,
    } as unknown as Response
}

function renderProfilePage(role = 'trainer') {
    mockUseSession.mockReturnValue({
        hasSession: true,
        userId: 'user-001',
        role,
        request: mockRequest,
    })

    return render(
        <MemoryRouter>
            <UserProfilePage />
        </MemoryRouter>,
    )
}

describe('SCRUM-120: Frontend Hồ sơ cá nhân (Activity A6)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockRequest.mockResolvedValue(
            mockResponse({
                status: 'success',
                data: { ...sampleProfile },
            }),
        )
    })

    afterEach(() => {
        cleanup()
    })

    // 1. loading profile
    it('1. loading profile: hiển thị trạng thái đang tải trong khi chờ API', async () => {
        let resolvePromise!: (val: Response) => void
        const pendingPromise = new Promise<Response>((resolve) => {
            resolvePromise = resolve
        })
        mockRequest.mockReturnValue(pendingPromise)

        renderProfilePage()

        expect(screen.getByTestId('profile-loading')).toBeDefined()
        expect(screen.getByText('Đang tải thông tin hồ sơ...')).toBeDefined()

        resolvePromise(mockResponse({ status: 'success', data: sampleProfile }))
        await waitFor(() => {
            expect(screen.queryByTestId('profile-loading')).toBeNull()
        })
    })

    // 2. GET profile thành công
    it('2. GET profile thành công: gọi GET /api/v1/users/profile và render form', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('profile-form')).toBeDefined()
        })
        expect(mockRequest).toHaveBeenCalledWith('/api/v1/users/profile', { method: 'GET' })
    })

    // 3. hiển thị đúng name
    it('3. hiển thị đúng name trong input họ và tên', async () => {
        renderProfilePage()

        await waitFor(() => {
            const nameInput = screen.getByTestId('input-profile-name') as HTMLInputElement
            expect(nameInput.value).toBe('Nguyễn Văn A')
        })
    })

    // 4. hiển thị email
    it('4. hiển thị đúng email trong input email', async () => {
        renderProfilePage()

        await waitFor(() => {
            const emailInput = screen.getByTestId('input-profile-email') as HTMLInputElement
            expect(emailInput.value).toBe('nguyenvana@daotao.edu.vn')
        })
    })

    // 5. email readonly
    it('5. email readonly: có thuộc tính readonly/disabled và thông báo khóa', async () => {
        renderProfilePage()

        await waitFor(() => {
            const emailInput = screen.getByTestId('input-profile-email') as HTMLInputElement
            expect(emailInput.disabled || emailInput.readOnly).toBe(true)
            expect(screen.getByTestId('email-helper-text').textContent).toContain(
                'Email không thể thay đổi tại đây.',
            )
        })
    })

    // 6. role readonly
    it('6. role readonly: hiển thị dưới dạng badge cố định, không có select chỉnh sửa', async () => {
        renderProfilePage('trainer')

        await waitFor(() => {
            const roleBadge = screen.getByTestId('profile-role-badge')
            expect(roleBadge.textContent).toBe('Giảng viên')
            // Không có select chỉnh sửa vai trò
            expect(screen.queryByRole('combobox')).toBeNull()
        })
    })

    // 7. chỉnh name
    it('7. chỉnh name: cho phép người dùng thay đổi họ và tên', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('input-profile-name')).toBeDefined()
        })

        const nameInput = screen.getByTestId('input-profile-name') as HTMLInputElement
        fireEvent.change(nameInput, { target: { value: 'Trần Văn Cập Nhật' } })
        expect(nameInput.value).toBe('Trần Văn Cập Nhật')
    })

    // 8. chỉnh phone hợp lệ
    it('8. chỉnh phone hợp lệ: chấp nhận số điện thoại di động Việt Nam chuẩn', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('input-profile-phone')).toBeDefined()
        })

        const phoneInput = screen.getByTestId('input-profile-phone') as HTMLInputElement
        fireEvent.change(phoneInput, { target: { value: '0987654321' } })
        expect(phoneInput.value).toBe('0987654321')

        fireEvent.click(screen.getByTestId('btn-save-profile'))

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/users/profile',
                expect.objectContaining({ method: 'PUT' }),
            )
        })
        expect(screen.queryByTestId('error-phone')).toBeNull()
    })

    // 9. phone sai → không submit
    it('9. phone sai → không submit: hiển thị lỗi và chặn gửi request', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('input-profile-phone')).toBeDefined()
        })

        const phoneInput = screen.getByTestId('input-profile-phone') as HTMLInputElement
        fireEvent.change(phoneInput, { target: { value: '0123456789' } }) // Đầu 01 không hợp lệ

        fireEvent.click(screen.getByTestId('btn-save-profile'))

        await waitFor(() => {
            expect(screen.getByTestId('error-phone').textContent).toBe(
                'Số điện thoại không đúng định dạng.',
            )
        })

        // Không gọi PUT
        expect(mockRequest).not.toHaveBeenCalledWith(
            '/api/v1/users/profile',
            expect.objectContaining({ method: 'PUT' }),
        )
    })

    // 10. chỉnh DOB
    it('10. chỉnh DOB: cho phép cập nhật ngày sinh hợp lệ', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('input-profile-dob')).toBeDefined()
        })

        const dobInput = screen.getByTestId('input-profile-dob') as HTMLInputElement
        fireEvent.change(dobInput, { target: { value: '2000-01-15' } })
        expect(dobInput.value).toBe('2000-01-15')
    })

    // 11. DOB tương lai → lỗi
    it('11. DOB tương lai → lỗi: chặn submit và báo lỗi tiếng Việt', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('input-profile-dob')).toBeDefined()
        })

        const dobInput = screen.getByTestId('input-profile-dob') as HTMLInputElement
        fireEvent.change(dobInput, { target: { value: '2099-12-31' } })

        fireEvent.click(screen.getByTestId('btn-save-profile'))

        await waitFor(() => {
            expect(screen.getByTestId('error-dob').textContent).toBe(
                'Ngày sinh không được ở thời điểm tương lai.',
            )
        })

        expect(mockRequest).not.toHaveBeenCalledWith(
            '/api/v1/users/profile',
            expect.objectContaining({ method: 'PUT' }),
        )
    })

    // 12. chỉnh address
    it('12. chỉnh address: cập nhật địa chỉ và bộ đếm ký tự', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('input-profile-address')).toBeDefined()
        })

        const addressInput = screen.getByTestId('input-profile-address') as HTMLTextAreaElement
        fireEvent.change(addressInput, { target: { value: '456 Võ Văn Tần, Quận 3' } })
        expect(addressInput.value).toBe('456 Võ Văn Tần, Quận 3')

        const counter = screen.getByTestId('address-char-counter')
        expect(counter.textContent).toContain(`${'456 Võ Văn Tần, Quận 3'.length}/255`)
    })

    // 13. save gọi đúng PUT
    it('13. save gọi đúng PUT: gửi request PUT /api/v1/users/profile', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('btn-save-profile')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-save-profile'))

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/users/profile',
                expect.objectContaining({
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                }),
            )
        })
    })

    // 14. payload không chứa email
    it('14. payload không chứa email: bảo vệ trường email không bị gửi lên', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('btn-save-profile')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-save-profile'))

        await waitFor(() => {
            const putCall = mockRequest.mock.calls.find(
                (call) => call[0] === '/api/v1/users/profile' && call[1]?.method === 'PUT',
            )
            expect(putCall).toBeDefined()
            const payload = JSON.parse(putCall![1].body)
            expect(payload.email).toBeUndefined()
        })
    })

    // 15. payload không chứa role
    it('15. payload không chứa role, id, status, password', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('btn-save-profile')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-save-profile'))

        await waitFor(() => {
            const putCall = mockRequest.mock.calls.find(
                (call) => call[0] === '/api/v1/users/profile' && call[1]?.method === 'PUT',
            )
            expect(putCall).toBeDefined()
            const payload = JSON.parse(putCall![1].body)
            expect(payload.role).toBeUndefined()
            expect(payload.id).toBeUndefined()
            expect(payload.status).toBeUndefined()
            expect(payload.password).toBeUndefined()
            expect(payload.password_hash).toBeUndefined()
        })
    })

    // 16. success message
    it('16. success message: hiển thị thông báo thành công sau khi lưu', async () => {
        mockRequest.mockImplementation((path, init) => {
            if (path === '/api/v1/users/profile' && init?.method === 'PUT') {
                return Promise.resolve(
                    mockResponse({
                        status: 'success',
                        message: 'Cập nhật hồ sơ thành công.',
                        data: {
                            ...sampleProfile,
                            name: 'Tên Đã Đổi',
                        },
                    }),
                )
            }
            return Promise.resolve(mockResponse({ status: 'success', data: sampleProfile }))
        })

        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('input-profile-name')).toBeDefined()
        })

        const nameInput = screen.getByTestId('input-profile-name')
        fireEvent.change(nameInput, { target: { value: 'Tên Đã Đổi' } })

        fireEvent.click(screen.getByTestId('btn-save-profile'))

        await waitFor(() => {
            expect(screen.getByTestId('profile-success-message').textContent).toContain(
                'Cập nhật hồ sơ thành công.',
            )
        })
    })

    // 17. API validation error
    it('17. API validation error: hiển thị thông báo lỗi thân thiện khi backend từ chối', async () => {
        mockRequest.mockImplementation((path, init) => {
            if (path === '/api/v1/users/profile' && init?.method === 'PUT') {
                return Promise.resolve(
                    mockResponse(
                        {
                            code: 'INVALID_PHONE',
                            message: 'Số điện thoại không đúng định dạng.',
                        },
                        400,
                        false,
                    ),
                )
            }
            return Promise.resolve(mockResponse({ status: 'success', data: sampleProfile }))
        })

        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('btn-save-profile')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-save-profile'))

        await waitFor(() => {
            expect(screen.getByTestId('profile-error-message').textContent).toContain(
                'Số điện thoại không đúng định dạng.',
            )
        })
    })

    // 18. network error
    it('18. network error: xử lý lỗi mất kết nối máy chủ mà không làm sập trang', async () => {
        mockRequest.mockImplementation((path, init) => {
            if (path === '/api/v1/users/profile' && init?.method === 'PUT') {
                return Promise.reject(new Error('Failed to fetch'))
            }
            return Promise.resolve(mockResponse({ status: 'success', data: sampleProfile }))
        })

        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('btn-save-profile')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-save-profile'))

        await waitFor(() => {
            expect(screen.getByTestId('profile-error-message').textContent).toContain(
                'Không thể kết nối tới máy chủ.',
            )
        })
    })

    // 19. double submit bị chặn
    it('19. double submit bị chặn: disable nút lưu trong quá trình gửi yêu cầu', async () => {
        let resolvePut!: (val: Response) => void
        const putPromise = new Promise<Response>((resolve) => {
            resolvePut = resolve
        })

        mockRequest.mockImplementation((path, init) => {
            if (path === '/api/v1/users/profile' && init?.method === 'PUT') {
                return putPromise
            }
            return Promise.resolve(mockResponse({ status: 'success', data: sampleProfile }))
        })

        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('btn-save-profile')).toBeDefined()
        })

        const saveButton = screen.getByTestId('btn-save-profile') as HTMLButtonElement
        fireEvent.click(saveButton)

        // Nút bị disable và hiển thị Đang lưu...
        expect(saveButton.disabled).toBe(true)
        expect(saveButton.textContent).toContain('Đang lưu...')

        // Click lần 2 không phát sinh thêm PUT
        fireEvent.click(saveButton)
        const putCalls = mockRequest.mock.calls.filter(
            (c) => c[0] === '/api/v1/users/profile' && c[1]?.method === 'PUT',
        )
        expect(putCalls.length).toBe(1)

        resolvePut(mockResponse({ status: 'success', data: sampleProfile }))
        await waitFor(() => {
            expect(saveButton.disabled).toBe(false)
        })
    })

    // 20. cancel reset form
    it('20. cancel reset form: khi có thay đổi, bấm Hủy hiện confirm, chọn Hủy thay đổi khôi phục dữ liệu ban đầu', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('input-profile-name')).toBeDefined()
        })

        const nameInput = screen.getByTestId('input-profile-name') as HTMLInputElement
        fireEvent.change(nameInput, { target: { value: 'Tên Tạm Thời' } })
        expect(nameInput.value).toBe('Tên Tạm Thời')

        const cancelButton = screen.getByTestId('btn-cancel-profile')
        fireEvent.click(cancelButton)

        // Modal confirm hiển thị
        expect(screen.getByTestId('cancel-confirm-modal')).toBeDefined()
        expect(screen.getByTestId('cancel-confirm-message').textContent).toBe(
            'Bạn có thay đổi chưa được lưu. Bạn có chắc muốn hủy không?',
        )

        // Bấm Hủy thay đổi trong modal
        const confirmCancelBtn = screen.getByTestId('btn-confirm-cancel')
        fireEvent.click(confirmCancelBtn)

        // Reset về giá trị gốc từ server và navigate back
        expect(nameInput.value).toBe('Nguyễn Văn A')
        expect(mockNavigate).toHaveBeenCalled()
    })

    // 21. F5/remount lấy lại profile từ API
    it('21. F5/remount lấy lại profile từ API', async () => {
        const { unmount } = renderProfilePage()

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledTimes(1)
        })

        unmount()

        // Remount giả lập F5 tải lại trang
        renderProfilePage()

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledTimes(2)
        })
    })

    // 22. user các role đều mở được profile
    it('22. user các role đều mở được profile: admin, trainer, trainee, user', async () => {
        const roles = ['admin', 'trainer', 'trainee', 'user']

        for (const r of roles) {
            cleanup()
            mockRequest.mockClear()
            mockRequest.mockResolvedValue(
                mockResponse({
                    status: 'success',
                    data: { ...sampleProfile, role: r },
                }),
            )

            renderProfilePage(r)

            await waitFor(() => {
                expect(screen.getByTestId('user-profile-page')).toBeDefined()
                expect(screen.getByTestId('profile-role-code').textContent).toContain(`(${r})`)
            })
        }
    })

    // 23. responsive structure tồn tại
    it('23. responsive structure tồn tại: có đầy đủ container, grid layout và action wrappers', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('user-profile-page')).toBeDefined()
        })

        const container = screen.getByTestId('user-profile-page')
        expect(container.classList.contains('profile-page-container')).toBe(true)

        const form = screen.getByTestId('profile-form')
        expect(form.querySelector('.profile-grid')).not.toBeNull()
        expect(form.querySelector('.profile-actions')).not.toBeNull()
    })

    // 24. không hiển thị password/security fields
    it('24. không hiển thị password/security fields', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('profile-form')).toBeDefined()
        })

        expect(screen.queryByLabelText(/mật khẩu/i)).toBeNull()
        expect(screen.queryByTestId('input-password')).toBeNull()
        expect(screen.queryByTestId('input-token')).toBeNull()
        expect(screen.queryByText(/password_hash/i)).toBeNull()
        expect(screen.queryByText(/failed_login_attempts/i)).toBeNull()
    })

    // 25. chưa sửa gì, click Hủy → navigate back ngay
    it('25. chưa sửa gì, click Hủy → navigate back ngay, không confirm', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('btn-cancel-profile')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-cancel-profile'))

        // Không mở modal xác nhận
        expect(screen.queryByTestId('cancel-confirm-modal')).toBeNull()
        // Gọi navigate back ngay
        expect(mockNavigate).toHaveBeenCalled()
    })

    // 26. sửa name, click Hủy → hiện confirm
    it('26. sửa name, click Hủy → hiện confirm dialog với thông điệp chuẩn và 2 nút lựa chọn', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('input-profile-name')).toBeDefined()
        })

        fireEvent.change(screen.getByTestId('input-profile-name'), {
            target: { value: 'Tên Thay Đổi' },
        })

        fireEvent.click(screen.getByTestId('btn-cancel-profile'))

        expect(screen.getByTestId('cancel-confirm-modal')).toBeDefined()
        expect(screen.getByTestId('cancel-confirm-message').textContent).toBe(
            'Bạn có thay đổi chưa được lưu. Bạn có chắc muốn hủy không?',
        )
        expect(screen.getByTestId('btn-stay').textContent).toBe('Ở lại')
        expect(screen.getByTestId('btn-confirm-cancel').textContent).toBe('Hủy thay đổi')
    })

    // 27. chọn Ở lại → vẫn ở /profile và giữ dữ liệu đã nhập
    it('27. chọn Ở lại → đóng confirm, vẫn ở /profile và giữ dữ liệu đã nhập', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('input-profile-name')).toBeDefined()
        })

        const nameInput = screen.getByTestId('input-profile-name') as HTMLInputElement
        fireEvent.change(nameInput, { target: { value: 'Dữ Liệu Đang Sửa' } })

        fireEvent.click(screen.getByTestId('btn-cancel-profile'))
        expect(screen.getByTestId('cancel-confirm-modal')).toBeDefined()

        // Click Ở lại
        fireEvent.click(screen.getByTestId('btn-stay'))

        // Modal đóng
        expect(screen.queryByTestId('cancel-confirm-modal')).toBeNull()
        // Dữ liệu nhập vẫn giữ nguyên
        expect(nameInput.value).toBe('Dữ Liệu Đang Sửa')
        // Không navigate đi đâu
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    // 28. chọn Hủy thay đổi → bỏ dữ liệu và navigate back
    it('28. chọn Hủy thay đổi → bỏ dữ liệu, không gọi PUT và navigate back', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('input-profile-name')).toBeDefined()
        })

        const nameInput = screen.getByTestId('input-profile-name') as HTMLInputElement
        const phoneInput = screen.getByTestId('input-profile-phone') as HTMLInputElement
        fireEvent.change(nameInput, { target: { value: 'Tên Bị Hủy' } })
        fireEvent.change(phoneInput, { target: { value: '0987654321' } })

        fireEvent.click(screen.getByTestId('btn-cancel-profile'))
        expect(screen.getByTestId('cancel-confirm-modal')).toBeDefined()

        // Click Hủy thay đổi trong modal
        fireEvent.click(screen.getByTestId('btn-confirm-cancel'))

        // Không gọi PUT
        expect(mockRequest).not.toHaveBeenCalledWith(
            '/api/v1/users/profile',
            expect.objectContaining({ method: 'PUT' }),
        )
        // Reset về giá trị gốc từ server
        expect(nameInput.value).toBe('Nguyễn Văn A')
        expect(phoneInput.value).toBe('0912345678')
        // Gọi navigate
        expect(mockNavigate).toHaveBeenCalled()
    })

    // 29. save thành công → dirty state reset, sau save click Hủy → navigate back ngay
    it('29. save thành công → dirty state reset, sau save click Hủy → navigate back ngay không confirm', async () => {
        mockRequest.mockImplementation((path, init) => {
            if (path === '/api/v1/users/profile' && init?.method === 'PUT') {
                return Promise.resolve(
                    mockResponse({
                        status: 'success',
                        message: 'Cập nhật hồ sơ thành công.',
                        data: {
                            ...sampleProfile,
                            name: 'Tên Mới Sau Lưu',
                        },
                    }),
                )
            }
            return Promise.resolve(mockResponse({ status: 'success', data: sampleProfile }))
        })

        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('input-profile-name')).toBeDefined()
        })

        // Sửa name
        fireEvent.change(screen.getByTestId('input-profile-name'), {
            target: { value: 'Tên Mới Sau Lưu' },
        })

        // Lưu thay đổi
        fireEvent.click(screen.getByTestId('btn-save-profile'))

        await waitFor(() => {
            expect(screen.getByTestId('profile-success-message')).toBeDefined()
        })

        // Sau khi lưu thành công, dirty state reset về false
        // Bấm Hủy thay đổi -> navigate ngay không cần confirm
        fireEvent.click(screen.getByTestId('btn-cancel-profile'))
        expect(screen.queryByTestId('cancel-confirm-modal')).toBeNull()
        expect(mockNavigate).toHaveBeenCalled()
    })

    // 30. mobile 360px vẫn hiển thị confirm và button đúng
    it('30. mobile 360px vẫn hiển thị confirm và button đúng cấu trúc modal backdrop và card', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('input-profile-name')).toBeDefined()
        })

        fireEvent.change(screen.getByTestId('input-profile-name'), {
            target: { value: 'Mobile Name Edit' },
        })

        fireEvent.click(screen.getByTestId('btn-cancel-profile'))

        const modalBackdrop = screen.getByTestId('cancel-confirm-modal')
        expect(modalBackdrop.classList.contains('profile-modal-backdrop')).toBe(true)

        const modalStayBtn = screen.getByTestId('btn-stay')
        const modalConfirmBtn = screen.getByTestId('btn-confirm-cancel')
        expect(modalStayBtn.classList.contains('btn-modal-stay')).toBe(true)
        expect(modalConfirmBtn.classList.contains('btn-modal-confirm-cancel')).toBe(true)
    })

    // 31. Tab navigation: chuyển giữa Thông tin cá nhân và Đổi mật khẩu
    it('31. Tab navigation: chuyển giữa Thông tin cá nhân và Đổi mật khẩu thay đổi nội dung khung bên phải mà không chuyển trang', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('tab-personal-info')).toBeDefined()
            expect(screen.getByTestId('tab-change-password')).toBeDefined()
        })

        // Ban đầu ở tab Thông tin cá nhân
        expect(screen.getByTestId('profile-form')).toBeDefined()
        expect(screen.queryByTestId('change-password-form')).toBeNull()

        // Bấm chuyển sang tab Đổi mật khẩu
        fireEvent.click(screen.getByTestId('tab-change-password'))
        expect(screen.queryByTestId('profile-form')).toBeNull()
        expect(screen.getByTestId('change-password-form')).toBeDefined()

        // Bấm chuyển lại tab Thông tin cá nhân
        fireEvent.click(screen.getByTestId('tab-personal-info'))
        expect(screen.getByTestId('profile-form')).toBeDefined()
        expect(screen.queryByTestId('change-password-form')).toBeNull()

        // Không điều hướng sang trang khác
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    // 32. Tab Đổi mật khẩu hiển thị đủ 3 trường mật khẩu
    it('32. Tab Đổi mật khẩu hiển thị đủ 3 trường mật khẩu và nút Cập nhật mật khẩu', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('tab-change-password')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('tab-change-password'))

        expect(screen.getByTestId('input-current-password')).toBeDefined()
        expect(screen.getByTestId('input-new-password')).toBeDefined()
        expect(screen.getByTestId('input-confirm-password')).toBeDefined()
        expect(screen.getByTestId('btn-change-password')).toBeDefined()
    })

    // 33. Validation đổi mật khẩu
    it('33. Validation đổi mật khẩu: báo lỗi khi thiếu mật khẩu hiện tại, mật khẩu mới không hợp lệ hoặc không khớp', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('tab-change-password')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('tab-change-password'))

        const currentInput = screen.getByTestId('input-current-password')
        const newInput = screen.getByTestId('input-new-password')
        const confirmInput = screen.getByTestId('input-confirm-password')
        const submitBtn = screen.getByTestId('btn-change-password')

        // Thiếu mật khẩu hiện tại
        fireEvent.change(newInput, { target: { value: 'Secret123' } })
        fireEvent.change(confirmInput, { target: { value: 'Secret123' } })
        fireEvent.click(submitBtn)

        expect(screen.getByTestId('password-error-message').textContent).toContain('Mật khẩu hiện tại là bắt buộc')

        // Mật khẩu mới quá ngắn (< 8 ký tự)
        fireEvent.change(currentInput, { target: { value: 'OldPass123' } })
        fireEvent.change(newInput, { target: { value: 'Short1' } })
        fireEvent.change(confirmInput, { target: { value: 'Short1' } })
        fireEvent.click(submitBtn)

        expect(screen.getByTestId('password-error-message').textContent).toContain('tối thiểu 8 ký tự')

        // Mật khẩu mới không có số
        fireEvent.change(newInput, { target: { value: 'OnlyLetters' } })
        fireEvent.change(confirmInput, { target: { value: 'OnlyLetters' } })
        fireEvent.click(submitBtn)

        expect(screen.getByTestId('password-error-message').textContent).toContain('cả chữ cái và chữ số')

        // Xác nhận mật khẩu không khớp
        fireEvent.change(newInput, { target: { value: 'Secret123' } })
        fireEvent.change(confirmInput, { target: { value: 'Different123' } })
        fireEvent.click(submitBtn)

        expect(screen.getByTestId('password-error-message').textContent).toContain('không trùng khớp')
    })

    // 34. Đổi mật khẩu thành công gọi POST /api/auth/change-password và xóa form
    it('34. Đổi mật khẩu thành công gọi POST /api/auth/change-password và xóa sạch mật khẩu', async () => {
        mockRequest.mockImplementation((path, init) => {
            if (path === '/api/auth/change-password' && init?.method === 'POST') {
                return Promise.resolve(
                    mockResponse({
                        status: 'success',
                        message: 'Đổi mật khẩu thành công.',
                    }),
                )
            }
            return Promise.resolve(mockResponse({ status: 'success', data: sampleProfile }))
        })

        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('tab-change-password')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('tab-change-password'))

        const currentInput = screen.getByTestId('input-current-password') as HTMLInputElement
        const newInput = screen.getByTestId('input-new-password') as HTMLInputElement
        const confirmInput = screen.getByTestId('input-confirm-password') as HTMLInputElement
        const submitBtn = screen.getByTestId('btn-change-password')

        fireEvent.change(currentInput, { target: { value: 'OldPass123' } })
        fireEvent.change(newInput, { target: { value: 'NewPass123' } })
        fireEvent.change(confirmInput, { target: { value: 'NewPass123' } })

        fireEvent.click(submitBtn)

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                '/api/auth/change-password',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        current_password: 'OldPass123',
                        new_password: 'NewPass123',
                    }),
                }),
            )
            expect(screen.getByTestId('password-success-message').textContent).toContain('Đổi mật khẩu thành công.')
        })

        // Giá trị mật khẩu được xóa sạch sau khi đổi thành công
        expect(currentInput.value).toBe('')
        expect(newInput.value).toBe('')
        expect(confirmInput.value).toBe('')
    })

    // 35. Không để giá trị mật khẩu tồn tại khi rời tab
    it('35. Không để giá trị mật khẩu tồn tại khi rời tab', async () => {
        renderProfilePage()

        await waitFor(() => {
            expect(screen.getByTestId('tab-change-password')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('tab-change-password'))

        const currentInput = screen.getByTestId('input-current-password') as HTMLInputElement
        const newInput = screen.getByTestId('input-new-password') as HTMLInputElement
        const confirmInput = screen.getByTestId('input-confirm-password') as HTMLInputElement

        fireEvent.change(currentInput, { target: { value: 'TempOld123' } })
        fireEvent.change(newInput, { target: { value: 'TempNew123' } })
        fireEvent.change(confirmInput, { target: { value: 'TempNew123' } })

        // Rời tab sang Thông tin cá nhân
        fireEvent.click(screen.getByTestId('tab-personal-info'))

        // Quay lại tab Đổi mật khẩu
        fireEvent.click(screen.getByTestId('tab-change-password'))

        const reloadedCurrent = screen.getByTestId('input-current-password') as HTMLInputElement
        const reloadedNew = screen.getByTestId('input-new-password') as HTMLInputElement
        const reloadedConfirm = screen.getByTestId('input-confirm-password') as HTMLInputElement

        expect(reloadedCurrent.value).toBe('')
        expect(reloadedNew.value).toBe('')
        expect(reloadedConfirm.value).toBe('')
    })
})
