// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ForgotPasswordPage } from './ForgotPasswordPage'
import { ResetPasswordPage } from './ResetPasswordPage'

function AppFlowWrapper({ initialPath }: { initialPath: string }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/login"
          element={
            <div>
              <h1 id="loginPageHeading">Trang Đăng Nhập Hệ Thống</h1>
              <p>Vui lòng đăng nhập bằng mật khẩu mới</p>
            </div>
          }
        />
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

describe('SCRUM-51 Integration Flow (Frontend)', () => {
  it('toàn bộ luồng Forgot Password -> Reset Password -> Chuyển về Login', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/auth/forgot-password')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            message:
              'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi tới email của bạn.',
          }),
        })
      }
      if (url.includes('/api/auth/reset-password')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            message: 'Mật khẩu đã được đặt lại thành công',
          }),
        })
      }
      return Promise.reject(new Error('Unknown URL: ' + url))
    })
    vi.stubGlobal('fetch', mockFetch)

    // Bước 1: Người dùng truy cập trang /forgot-password
    const { unmount } = render(<AppFlowWrapper initialPath="/forgot-password" />)

    expect(screen.getByRole('heading', { name: 'Quên mật khẩu?' })).toBeDefined()
    const emailInput = screen.getByLabelText(/địa chỉ email/i)
    fireEvent.change(emailInput, { target: { value: 'giangvien@ictu.edu.vn' } })

    const forgotSubmitBtn = screen.getByRole('button', { name: /gửi liên kết đặt lại/i })
    fireEvent.click(forgotSubmitBtn)

    // Bước 2: Nhận thông báo xác nhận generic chống dò email (SCRUM-50)
    await waitFor(() => {
      expect(screen.getByText('Đã tiếp nhận yêu cầu')).toBeDefined()
      expect(
        screen.getAllByText(
          'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi tới email của bạn.'
        ).length
      ).toBeGreaterThanOrEqual(1)
    })

    // Không lưu thông tin nhạy cảm vào storage
    expect(localStorage.getItem('emailExists')).toBeNull()
    expect(sessionStorage.getItem('emailExists')).toBeNull()

    unmount()

    // Bước 3: Người dùng mở link từ email: /reset-password?token=secret-random-token-777
    render(<AppFlowWrapper initialPath="/reset-password?token=secret-random-token-777" />)

    expect(screen.getByRole('heading', { name: 'Đặt lại mật khẩu' })).toBeDefined()
    const newPasswordInput = screen.getByLabelText(/^mật khẩu mới$/i, { selector: 'input' })
    const confirmPasswordInput = screen.getByLabelText(/^xác nhận mật khẩu$/i, { selector: 'input' })
    const resetSubmitBtn = screen.getByRole('button', { name: /đặt lại mật khẩu/i })

    // Bước 4: Nhập mật khẩu mới thỏa mãn độ dài & chữ số
    fireEvent.change(newPasswordInput, { target: { value: 'NewSecurePass123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewSecurePass123!' } })
    expect(resetSubmitBtn.hasAttribute('disabled')).toBe(false)

    fireEvent.click(resetSubmitBtn)

    // Bước 5: Đặt lại thành công và hiển thị nút chuyển về Đăng nhập
    await waitFor(() => {
      expect(screen.getByText('Thành công!')).toBeDefined()
      expect(screen.getByText('Mật khẩu đã được đặt lại thành công.')).toBeDefined()
    })

    const loginLink = screen.getByRole('link', { name: /đăng nhập ngay/i })
    expect(loginLink).toBeDefined()
    fireEvent.click(loginLink)

    // Bước 6: Chuyển hướng sang trang đăng nhập
    await waitFor(() => {
      expect(document.getElementById('loginPageHeading')?.textContent).toBe('Trang Đăng Nhập Hệ Thống')
    })
  })
})
