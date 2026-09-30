// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChangePasswordPage } from './ChangePasswordPage'
import { RequireSession } from '../auth/RequireSession'

// Mock useSession hook
const mockUseSession = vi.fn()
vi.mock('../auth/SessionProvider', () => ({
  useSession: () => mockUseSession(),
}))

function renderComponent(props = {}, initialUrl = '/change-password', hasSession = true) {
  mockUseSession.mockReturnValue({
    hasSession,
    userId: hasSession ? 'user-123' : null,
  })

  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Routes>
        <Route path="/login" element={<h1>Trang đăng nhập</h1>} />
        <Route element={<RequireSession />}>
          <Route path="/" element={<h1>Trang chủ</h1>} />
          <Route path="/change-password" element={<ChangePasswordPage {...props} />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

describe('ChangePasswordPage (SCRUM-52)', () => {
  // 1. Page render
  it('1. render trang đổi mật khẩu với đầy đủ tiêu đề và mô tả', () => {
    renderComponent()

    expect(screen.getByRole('heading', { name: 'Đổi mật khẩu' })).toBeDefined()
    expect(
      screen.getByText(/Cập nhật mật khẩu định kỳ để bảo vệ tài khoản đào tạo của bạn/i)
    ).toBeDefined()
    expect(screen.getByRole('link', { name: /quay lại trang chủ/i })).toBeDefined()
  })

  // 2. Đủ 3 trường password
  it('2. hiển thị đủ 3 trường password: mật khẩu hiện tại, mật khẩu mới, xác nhận mật khẩu mới', () => {
    renderComponent()

    const currentPasswordInput = screen.getByLabelText(/^mật khẩu hiện tại$/i) as HTMLInputElement
    const newPasswordInput = screen.getByLabelText(/^mật khẩu mới$/i) as HTMLInputElement
    const confirmPasswordInput = screen.getByLabelText(/^xác nhận mật khẩu mới$/i) as HTMLInputElement

    expect(currentPasswordInput).toBeDefined()
    expect(currentPasswordInput.type).toBe('password')

    expect(newPasswordInput).toBeDefined()
    expect(newPasswordInput.type).toBe('password')

    expect(confirmPasswordInput).toBeDefined()
    expect(confirmPasswordInput.type).toBe('password')
  })

  // 3. Submit button tồn tại
  it('3. submit button "Đổi mật khẩu" tồn tại và bị khóa khi form chưa nhập đủ', () => {
    renderComponent()

    const submitBtn = screen.getByRole('button', { name: 'Đổi mật khẩu' })
    expect(submitBtn).toBeDefined()
    expect(submitBtn.hasAttribute('disabled')).toBe(true)

    // Nhập đầy đủ 3 trường thì nút submit được mở
    const currentInput = screen.getByLabelText(/^mật khẩu hiện tại$/i)
    const newInput = screen.getByLabelText(/^mật khẩu mới$/i)
    const confirmInput = screen.getByLabelText(/^xác nhận mật khẩu mới$/i)

    fireEvent.change(currentInput, { target: { value: 'CurrentPass123!' } })
    fireEvent.change(newInput, { target: { value: 'NewPass456!' } })
    fireEvent.change(confirmInput, { target: { value: 'NewPass456!' } })

    expect(submitBtn.hasAttribute('disabled')).toBe(false)
  })

  // 4 & 5. Route protected: unauthenticated không truy cập được
  it('4 & 5. route /change-password được bảo vệ; chưa đăng nhập bị chuyển hướng về /login', () => {
    renderComponent({}, '/change-password', false) // hasSession = false

    expect(screen.queryByRole('heading', { name: 'Đổi mật khẩu' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Trang đăng nhập' })).toBeDefined()
  })

  // 6. Form structure đúng: toggle ẩn/hiện mật khẩu hoạt động
  it('6. toggle ẩn/hiện mật khẩu chuyển đổi type giữa password và text cho từng trường', () => {
    renderComponent()

    const currentInput = screen.getByLabelText(/^mật khẩu hiện tại$/i) as HTMLInputElement
    const toggleCurrentBtn = screen.getByRole('button', { name: 'Hiện mật khẩu hiện tại' })

    expect(currentInput.type).toBe('password')
    fireEvent.click(toggleCurrentBtn)
    expect(currentInput.type).toBe('text')
    fireEvent.click(screen.getByRole('button', { name: 'Ẩn mật khẩu hiện tại' }))
    expect(currentInput.type).toBe('password')

    const newInput = screen.getByLabelText(/^mật khẩu mới$/i) as HTMLInputElement
    const toggleNewBtn = screen.getByRole('button', { name: 'Hiện mật khẩu mới' })
    fireEvent.click(toggleNewBtn)
    expect(newInput.type).toBe('text')

    const confirmInput = screen.getByLabelText(/^xác nhận mật khẩu mới$/i) as HTMLInputElement
    const toggleConfirmBtn = screen.getByRole('button', { name: 'Hiện xác nhận mật khẩu' })
    fireEvent.click(toggleConfirmBtn)
    expect(confirmInput.type).toBe('text')
  })

  // 7. Không lưu password vào storage
  it('7. tuyệt đối không lưu bất kỳ password nào vào localStorage hoặc sessionStorage', async () => {
    const localSpy = vi.spyOn(Storage.prototype, 'setItem')
    const sessionSpy = vi.spyOn(sessionStorage, 'setItem')

    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderComponent({ onSubmit })

    const currentInput = screen.getByLabelText(/^mật khẩu hiện tại$/i)
    const newInput = screen.getByLabelText(/^mật khẩu mới$/i)
    const confirmInput = screen.getByLabelText(/^xác nhận mật khẩu mới$/i)

    const secret1 = 'OldSuperSecret123!'
    const secret2 = 'NewSuperSecret456!'

    fireEvent.change(currentInput, { target: { value: secret1 } })
    fireEvent.change(newInput, { target: { value: secret2 } })
    fireEvent.change(confirmInput, { target: { value: secret2 } })

    const submitBtn = screen.getByRole('button', { name: 'Đổi mật khẩu' })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        currentPassword: secret1,
        newPassword: secret2,
        confirmPassword: secret2,
      })
    })

    for (const call of localSpy.mock.calls) {
      expect(call[0]).not.toContain('password')
      expect(call[1]).not.toContain(secret1)
      expect(call[1]).not.toContain(secret2)
    }
    for (const call of sessionSpy.mock.calls) {
      expect(call[0]).not.toContain('password')
      expect(call[1]).not.toContain(secret1)
      expect(call[1]).not.toContain(secret2)
    }
  })

  // 8. Hiển thị alert thông báo lỗi và thành công khi được truyền vào props
  it('8. hiển thị alert thông báo lỗi và thành công chính xác', () => {
    const { rerender } = renderComponent({
      errorMessage: 'Mật khẩu hiện tại không chính xác',
    })

    expect(screen.getByRole('alert')).toBeDefined()
    expect(screen.getByText('Mật khẩu hiện tại không chính xác')).toBeDefined()

    rerender(
      <MemoryRouter initialEntries={['/change-password']}>
        <Routes>
          <Route element={<RequireSession />}>
            <Route
              path="/change-password"
              element={<ChangePasswordPage successMessage="Đổi mật khẩu thành công." />}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole('status')).toBeDefined()
    expect(screen.getByText('Đổi mật khẩu thành công.')).toBeDefined()
  })

  // =========================================================================
  // SCRUM-55: Kiểm tra điều kiện mật khẩu mới (Frontend)
  // =========================================================================
  it('9. SCRUM-55: xác nhận mật khẩu không khớp -> hiển thị lỗi và không gọi onSubmit', async () => {
    const onSubmit = vi.fn()
    renderComponent({ onSubmit })

    const currentInput = screen.getByLabelText(/^mật khẩu hiện tại$/i)
    const newInput = screen.getByLabelText(/^mật khẩu mới$/i)
    const confirmInput = screen.getByLabelText(/^xác nhận mật khẩu mới$/i)
    const submitBtn = screen.getByRole('button', { name: 'Đổi mật khẩu' })

    fireEvent.change(currentInput, { target: { value: 'CurrentPass123!' } })
    fireEvent.change(newInput, { target: { value: 'NewSecurePass123!' } })
    fireEvent.change(confirmInput, { target: { value: 'DifferentPass456!' } })

    fireEvent.click(submitBtn)

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeDefined()
    expect(screen.getByText('Xác nhận mật khẩu mới không trùng khớp')).toBeDefined()
  })

  it('10. SCRUM-55: mật khẩu mới dưới 8 ký tự -> hiển thị lỗi và không gọi onSubmit', async () => {
    const onSubmit = vi.fn()
    renderComponent({ onSubmit })

    const currentInput = screen.getByLabelText(/^mật khẩu hiện tại$/i)
    const newInput = screen.getByLabelText(/^mật khẩu mới$/i)
    const confirmInput = screen.getByLabelText(/^xác nhận mật khẩu mới$/i)
    const submitBtn = screen.getByRole('button', { name: 'Đổi mật khẩu' })

    fireEvent.change(currentInput, { target: { value: 'CurrentPass123!' } })
    fireEvent.change(newInput, { target: { value: 'Abc1' } })
    fireEvent.change(confirmInput, { target: { value: 'Abc1' } })

    fireEvent.click(submitBtn)

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeDefined()
    expect(screen.getByText('Mật khẩu mới phải có tối thiểu 8 ký tự')).toBeDefined()
  })

  it('11. SCRUM-55: mật khẩu mới chỉ có chữ hoặc chỉ có số -> hiển thị lỗi', async () => {
    const onSubmit = vi.fn()
    renderComponent({ onSubmit })

    const currentInput = screen.getByLabelText(/^mật khẩu hiện tại$/i)
    const newInput = screen.getByLabelText(/^mật khẩu mới$/i)
    const confirmInput = screen.getByLabelText(/^xác nhận mật khẩu mới$/i)
    const submitBtn = screen.getByRole('button', { name: 'Đổi mật khẩu' })

    // Chỉ có chữ
    fireEvent.change(currentInput, { target: { value: 'CurrentPass123!' } })
    fireEvent.change(newInput, { target: { value: 'OnlyLettersPassword' } })
    fireEvent.change(confirmInput, { target: { value: 'OnlyLettersPassword' } })
    fireEvent.click(submitBtn)

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Mật khẩu mới phải bao gồm cả chữ cái và chữ số')).toBeDefined()

    // Chỉ có số
    fireEvent.change(newInput, { target: { value: '123456789012' } })
    fireEvent.change(confirmInput, { target: { value: '123456789012' } })
    fireEvent.click(submitBtn)

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Mật khẩu mới phải bao gồm cả chữ cái và chữ số')).toBeDefined()
  })

  it('12. SCRUM-55: mật khẩu mới hợp lệ (chữ + số >= 8 ký tự và khớp confirm) -> gọi onSubmit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderComponent({ onSubmit })

    const currentInput = screen.getByLabelText(/^mật khẩu hiện tại$/i)
    const newInput = screen.getByLabelText(/^mật khẩu mới$/i)
    const confirmInput = screen.getByLabelText(/^xác nhận mật khẩu mới$/i)
    const submitBtn = screen.getByRole('button', { name: 'Đổi mật khẩu' })

    fireEvent.change(currentInput, { target: { value: 'CurrentPass123!' } })
    fireEvent.change(newInput, { target: { value: 'ValidPass456!' } })
    fireEvent.change(confirmInput, { target: { value: 'ValidPass456!' } })

    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        currentPassword: 'CurrentPass123!',
        newPassword: 'ValidPass456!',
        confirmPassword: 'ValidPass456!',
      })
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  // =========================================================================
  // SCRUM-57: Xử lý phản hồi và thông báo (Frontend)
  // =========================================================================
  it('13. SCRUM-57: đổi mật khẩu thành công -> hiển thị "Đổi mật khẩu thành công." và xóa trắng 3 ô nhập', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderComponent({ onSubmit })

    const currentInput = screen.getByLabelText(/^mật khẩu hiện tại$/i) as HTMLInputElement
    const newInput = screen.getByLabelText(/^mật khẩu mới$/i) as HTMLInputElement
    const confirmInput = screen.getByLabelText(/^xác nhận mật khẩu mới$/i) as HTMLInputElement
    const submitBtn = screen.getByRole('button', { name: 'Đổi mật khẩu' })

    fireEvent.change(currentInput, { target: { value: 'CurrentPass123!' } })
    fireEvent.change(newInput, { target: { value: 'NewSecurePass456!' } })
    fireEvent.change(confirmInput, { target: { value: 'NewSecurePass456!' } })

    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeDefined()
      expect(screen.getByText('Đổi mật khẩu thành công.')).toBeDefined()
      // Xóa trắng cả 3 ô nhập
      expect(currentInput.value).toBe('')
      expect(newInput.value).toBe('')
      expect(confirmInput.value).toBe('')
    })
  })

  it('14. SCRUM-57: đổi mật khẩu thất bại -> hiển thị lỗi và giữ lại dữ liệu', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Mật khẩu hiện tại không chính xác'))
    renderComponent({ onSubmit })

    const currentInput = screen.getByLabelText(/^mật khẩu hiện tại$/i) as HTMLInputElement
    const newInput = screen.getByLabelText(/^mật khẩu mới$/i) as HTMLInputElement
    const confirmInput = screen.getByLabelText(/^xác nhận mật khẩu mới$/i) as HTMLInputElement
    const submitBtn = screen.getByRole('button', { name: 'Đổi mật khẩu' })

    fireEvent.change(currentInput, { target: { value: 'WrongCurrentPass123!' } })
    fireEvent.change(newInput, { target: { value: 'NewSecurePass456!' } })
    fireEvent.change(confirmInput, { target: { value: 'NewSecurePass456!' } })

    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
      expect(screen.getByText('Mật khẩu hiện tại không chính xác')).toBeDefined()
      expect(screen.queryByText('Đổi mật khẩu thành công.')).toBeNull()
      // Giữ lại để người dùng sửa
      expect(currentInput.value).toBe('WrongCurrentPass123!')
      expect(newInput.value).toBe('NewSecurePass456!')
    })
  })
})
