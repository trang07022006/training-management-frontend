// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResetPasswordPage } from './ResetPasswordPage'

function renderComponent(props = {}, initialUrl = '/reset-password?token=sample-test-token-123') {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage {...props} />} />
        <Route path="/login" element={<h1>Trang đăng nhập</h1>} />
        <Route path="/forgot-password" element={<h1>Trang quên mật khẩu</h1>} />
      </Routes>
    </MemoryRouter>
  )
}

function getNewPasswordInput() {
  return screen.getByLabelText(/^mật khẩu mới$/i, { selector: 'input' }) as HTMLInputElement
}

function getConfirmPasswordInput() {
  return screen.getByLabelText(/^xác nhận mật khẩu$/i, { selector: 'input' }) as HTMLInputElement
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

describe('ResetPasswordPage (SCRUM-49)', () => {
  // =========================================================================
  // 1. Render ResetPasswordPage
  // =========================================================================
  it('1. render ResetPasswordPage với đầy đủ tiêu đề, mô tả và các ô nhập', () => {
    renderComponent()

    expect(screen.getByRole('heading', { name: 'Đặt lại mật khẩu' })).toBeDefined()
    expect(
      screen.getByText(/Nhập mật khẩu mới của bạn để hoàn tất đặt lại tài khoản/i)
    ).toBeDefined()

    const newPasswordInput = getNewPasswordInput()
    expect(newPasswordInput).toBeDefined()
    expect(newPasswordInput.type).toBe('password')

    const confirmPasswordInput = getConfirmPasswordInput()
    expect(confirmPasswordInput).toBeDefined()
    expect(confirmPasswordInput.type).toBe('password')

    const submitBtn = screen.getByRole('button', { name: /đặt lại mật khẩu/i })
    expect(submitBtn).toBeDefined()

    expect(screen.getByRole('link', { name: /quay lại đăng nhập/i })).toBeDefined()
  })

  // =========================================================================
  // 2. Đọc token từ URL
  // =========================================================================
  it('2. đọc token từ URL search query parameter', () => {
    renderComponent({}, '/reset-password?token=my-secret-url-token')

    // Khi có token trong URL, không hiển thị banner cảnh báo thiếu token
    expect(screen.queryByText(/Không tìm thấy mã xác thực/i)).toBeNull()

    // Form inputs sẵn sàng nhập liệu
    const newPasswordInput = getNewPasswordInput()
    expect(newPasswordInput.hasAttribute('disabled')).toBe(false)
  })

  // =========================================================================
  // 3. Thiếu token -> hiển thị lỗi phù hợp
  // =========================================================================
  it('3. thiếu token trong URL -> hiển thị cảnh báo và vô hiệu hóa form', () => {
    renderComponent({}, '/reset-password')

    // Hiển thị thông báo thiếu mã xác thực
    expect(
      screen.getByText(/Không tìm thấy mã xác thực \(token\) trong liên kết/i)
    ).toBeDefined()

    // Ô nhập liệu bị disable
    const newPasswordInput = getNewPasswordInput()
    expect(newPasswordInput.hasAttribute('disabled')).toBe(true)

    const submitBtn = screen.getByRole('button', { name: /đặt lại mật khẩu/i })
    expect(submitBtn.hasAttribute('disabled')).toBe(true)

    // Có link quay về quên mật khẩu để yêu cầu lại
    expect(screen.getByRole('link', { name: /Gửi lại yêu cầu đặt lại mật khẩu/i })).toBeDefined()
  })

  // =========================================================================
  // 4. Nhập mật khẩu mới
  // =========================================================================
  it('4. nhập mật khẩu mới và cập nhật trạng thái input', () => {
    renderComponent()

    const newPasswordInput = getNewPasswordInput()
    fireEvent.change(newPasswordInput, { target: { value: 'Secret123!' } })

    expect(newPasswordInput.value).toBe('Secret123!')
  })

  // =========================================================================
  // 5. Nhập xác nhận mật khẩu
  // =========================================================================
  it('5. nhập xác nhận mật khẩu và cập nhật trạng thái input', () => {
    renderComponent()

    const confirmPasswordInput = getConfirmPasswordInput()
    fireEvent.change(confirmPasswordInput, { target: { value: 'Secret123!' } })

    expect(confirmPasswordInput.value).toBe('Secret123!')
  })

  // =========================================================================
  // 6. Password < 8 ký tự -> reject
  // =========================================================================
  it('6. password < 8 ký tự -> không cho submit và khóa nút bấm', () => {
    renderComponent()

    const newPasswordInput = getNewPasswordInput()
    const confirmPasswordInput = getConfirmPasswordInput()

    fireEvent.change(newPasswordInput, { target: { value: 'Abc1' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'Abc1' } })

    const submitBtn = screen.getByRole('button', { name: /đặt lại mật khẩu/i })
    expect(submitBtn.hasAttribute('disabled')).toBe(true)
  })

  // =========================================================================
  // 7. Password không có chữ + số -> reject
  // =========================================================================
  it('7. password không có chữ cái hoặc không có chữ số -> không cho submit', () => {
    renderComponent()

    const newPasswordInput = getNewPasswordInput()
    const confirmPasswordInput = getConfirmPasswordInput()
    const submitBtn = screen.getByRole('button', { name: /đặt lại mật khẩu/i })

    // Chỉ có chữ cái, không có số
    fireEvent.change(newPasswordInput, { target: { value: 'onlyletters' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'onlyletters' } })
    expect(submitBtn.hasAttribute('disabled')).toBe(true)

    // Chỉ có số, không có chữ cái
    fireEvent.change(newPasswordInput, { target: { value: '123456789' } })
    fireEvent.change(confirmPasswordInput, { target: { value: '123456789' } })
    expect(submitBtn.hasAttribute('disabled')).toBe(true)
  })

  // =========================================================================
  // 8. Confirm password không khớp -> reject
  // =========================================================================
  it('8. confirm password không khớp với mật khẩu mới -> khóa nút và hiển thị trạng thái chưa hợp lệ', () => {
    renderComponent()

    const newPasswordInput = getNewPasswordInput()
    const confirmPasswordInput = getConfirmPasswordInput()
    const submitBtn = screen.getByRole('button', { name: /đặt lại mật khẩu/i })

    fireEvent.change(newPasswordInput, { target: { value: 'ValidPassword123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPassword456' } })

    expect(submitBtn.hasAttribute('disabled')).toBe(true)
  })

  // =========================================================================
  // 9. Submit API đúng payload
  // =========================================================================
  it('9. submit API đúng endpoint và đúng payload { token, new_password }', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Mật khẩu đã được đặt lại thành công' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    renderComponent({ apiOrigin: 'http://localhost:5000' }, '/reset-password?token=secret-token-xyz')

    const newPasswordInput = getNewPasswordInput()
    const confirmPasswordInput = getConfirmPasswordInput()
    const submitBtn = screen.getByRole('button', { name: /đặt lại mật khẩu/i })

    fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123!' } })

    expect(submitBtn.hasAttribute('disabled')).toBe(false)
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/reset-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: 'secret-token-xyz',
            new_password: 'NewPassword123!',
          }),
        }
      )
    })
  })

  // =========================================================================
  // 10. Success -> hiển thị thông báo thành công
  // =========================================================================
  it('10. đặt lại mật khẩu thành công -> hiển thị thông báo thành công và nút đăng nhập', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Mật khẩu đã được đặt lại thành công' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    renderComponent()

    const newPasswordInput = getNewPasswordInput()
    const confirmPasswordInput = getConfirmPasswordInput()
    const submitBtn = screen.getByRole('button', { name: /đặt lại mật khẩu/i })

    fireEvent.change(newPasswordInput, { target: { value: 'ValidPassword123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'ValidPassword123' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Thành công!')).toBeDefined()
      expect(screen.getByText('Mật khẩu đã được đặt lại thành công.')).toBeDefined()
      expect(screen.getByRole('link', { name: /đăng nhập ngay/i })).toBeDefined()
    })
  })

  // =========================================================================
  // 11. Token expired -> hiển thị lỗi backend
  // =========================================================================
  it('11. token hết hạn -> hiển thị lỗi từ backend và link yêu cầu liên kết mới', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        code: 'TOKEN_EXPIRED',
        message: 'Token đặt lại mật khẩu đã hết hạn',
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    renderComponent()

    const newPasswordInput = getNewPasswordInput()
    const confirmPasswordInput = getConfirmPasswordInput()
    const submitBtn = screen.getByRole('button', { name: /đặt lại mật khẩu/i })

    fireEvent.change(newPasswordInput, { target: { value: 'ValidPassword123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'ValidPassword123' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/Liên kết đặt lại mật khẩu đã hết hạn/i)
      ).toBeDefined()
      expect(screen.getByRole('link', { name: /yêu cầu liên kết mới tại đây/i })).toBeDefined()
    })
  })

  // =========================================================================
  // 12. Token used -> hiển thị lỗi backend
  // =========================================================================
  it('12. token đã sử dụng -> hiển thị lỗi từ backend và link yêu cầu liên kết mới', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        code: 'TOKEN_ALREADY_USED',
        message: 'Token đặt lại mật khẩu đã được sử dụng',
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    renderComponent()

    const newPasswordInput = getNewPasswordInput()
    const confirmPasswordInput = getConfirmPasswordInput()
    const submitBtn = screen.getByRole('button', { name: /đặt lại mật khẩu/i })

    fireEvent.change(newPasswordInput, { target: { value: 'ValidPassword123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'ValidPassword123' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/Liên kết đặt lại mật khẩu này đã được sử dụng/i)
      ).toBeDefined()
      expect(screen.getByRole('link', { name: /yêu cầu liên kết mới tại đây/i })).toBeDefined()
    })
  })

  // =========================================================================
  // 13. Token invalid -> hiển thị lỗi backend
  // =========================================================================
  it('13. token không hợp lệ -> hiển thị lỗi từ backend', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        code: 'INVALID_TOKEN',
        message: 'Token đặt lại mật khẩu không hợp lệ',
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    renderComponent()

    const newPasswordInput = getNewPasswordInput()
    const confirmPasswordInput = getConfirmPasswordInput()
    const submitBtn = screen.getByRole('button', { name: /đặt lại mật khẩu/i })

    fireEvent.change(newPasswordInput, { target: { value: 'ValidPassword123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'ValidPassword123' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/Liên kết đặt lại mật khẩu không hợp lệ/i)
      ).toBeDefined()
    })
  })

  // =========================================================================
  // 14. Không lưu password vào localStorage / sessionStorage
  // =========================================================================
  it('14. tuyệt đối không lưu password vào localStorage hoặc sessionStorage', async () => {
    const localSpy = vi.spyOn(Storage.prototype, 'setItem')
    const sessionSpy = vi.spyOn(sessionStorage, 'setItem')

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Mật khẩu đã được đặt lại thành công' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    renderComponent()

    const testPassword = 'SuperSecretPassword999!'
    const newPasswordInput = getNewPasswordInput()
    const confirmPasswordInput = getConfirmPasswordInput()
    const submitBtn = screen.getByRole('button', { name: /đặt lại mật khẩu/i })

    fireEvent.change(newPasswordInput, { target: { value: testPassword } })
    fireEvent.change(confirmPasswordInput, { target: { value: testPassword } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Thành công!')).toBeDefined()
    })

    // Đảm bảo không gọi setItem với password
    for (const call of localSpy.mock.calls) {
      expect(call[0]).not.toContain('password')
      expect(call[1]).not.toContain(testPassword)
    }
    for (const call of sessionSpy.mock.calls) {
      expect(call[0]).not.toContain('password')
      expect(call[1]).not.toContain(testPassword)
    }

    expect(localStorage.getItem('password')).toBeNull()
    expect(sessionStorage.getItem('password')).toBeNull()
  })

  // =========================================================================
  // 15. Nút ẩn/hiện mật khẩu
  // =========================================================================
  it('15. nút ẩn/hiện mật khẩu thay đổi type giữa text và password', () => {
    renderComponent()

    const newPasswordInput = getNewPasswordInput()
    const toggleNewBtn = screen.getByRole('button', { name: /hiện mật khẩu mới/i })

    expect(newPasswordInput.type).toBe('password')
    fireEvent.click(toggleNewBtn)
    expect(newPasswordInput.type).toBe('text')
    fireEvent.click(toggleNewBtn)
    expect(newPasswordInput.type).toBe('password')
  })
})
