// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ForgotPasswordPage } from './ForgotPasswordPage'

function renderComponent(props = {}) {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage {...props} />} />
        <Route path="/login" element={<h1>Trang đăng nhập</h1>} />
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

describe('ForgotPasswordPage (SCRUM-44 & SCRUM-50)', () => {
  it('hiển thị đầy đủ tiêu đề, mô tả, ô nhập email trống và nút bấm bị khóa ban đầu', () => {
    renderComponent()

    expect(screen.getByRole('heading', { name: 'Quên mật khẩu?' })).toBeDefined()
    expect(
      screen.getByText(/hãy nhập địa chỉ email đã đăng ký của bạn/i)
    ).toBeDefined()

    const emailInput = screen.getByLabelText(/địa chỉ email/i) as HTMLInputElement
    expect(emailInput).toBeDefined()
    expect(emailInput.value).toBe('')

    const submitBtn = screen.getByRole('button', { name: /gửi liên kết đặt lại/i })
    expect(submitBtn).toBeDefined()
    expect(submitBtn.hasAttribute('disabled')).toBe(true)

    expect(screen.getByRole('link', { name: /quay lại đăng nhập/i })).toBeDefined()
  })

  it('xác thực email hợp lệ khi người dùng nhập đúng định dạng', () => {
    renderComponent()

    const emailInput = screen.getByLabelText(/địa chỉ email/i)
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })

    const helperText = document.getElementById('fieldHelperText')
    expect(helperText?.textContent).toBe('Định dạng hợp lệ. Sẵn sàng gửi yêu cầu.')

    const submitBtn = screen.getByRole('button', { name: /gửi liên kết đặt lại/i })
    expect(submitBtn.hasAttribute('disabled')).toBe(false)
  })

  it('hiển thị thông báo trung tính và khóa nút gửi khi để trống email', () => {
    renderComponent()

    const emailInput = screen.getByLabelText(/địa chỉ email/i)
    fireEvent.change(emailInput, { target: { value: '' } })

    const helperText = document.getElementById('fieldHelperText')
    expect(helperText?.textContent).toBe(
      'Phải trùng khớp với tài khoản chính đã xác thực của bạn'
    )

    const submitBtn = screen.getByRole('button', { name: /gửi liên kết đặt lại/i })
    expect(submitBtn.hasAttribute('disabled')).toBe(true)
  })

  it('báo lỗi định dạng và khóa nút khi nhập email không hợp lệ', () => {
    renderComponent()

    const emailInput = screen.getByLabelText(/địa chỉ email/i)
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } })

    const helperText = document.getElementById('fieldHelperText')
    expect(helperText?.textContent).toBe(
      'Vui lòng nhập địa chỉ email đầy đủ và hợp lệ'
    )

    const submitBtn = screen.getByRole('button', { name: /gửi liên kết đặt lại/i })
    expect(submitBtn.hasAttribute('disabled')).toBe(true)
  })

  it('gửi form thành công và hiển thị public generic message (SCRUM-50)', async () => {
    renderComponent()

    const emailInput = screen.getByLabelText(/địa chỉ email/i)
    fireEvent.change(emailInput, { target: { value: 'valid-user@ictu.edu.vn' } })

    const submitBtn = screen.getByRole('button', { name: /gửi liên kết đặt lại/i })
    fireEvent.click(submitBtn)

    // Kiểm tra trạng thái đang gửi
    expect(screen.getByText('Đang gửi mã bảo mật...')).toBeDefined()

    // Chờ quá trình hoàn tất
    await waitFor(() => {
      const banner = document.getElementById('resetFeedbackBanner')
      expect(banner).not.toBeNull()
      expect(screen.getByText('Đã tiếp nhận yêu cầu')).toBeDefined()
      expect(
        screen.getAllByText(
          'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi tới email của bạn.'
        ).length
      ).toBeGreaterThanOrEqual(1)
    })

    // Nút đổi thành "Gửi lại liên kết đặt lại"
    expect(screen.getByText('Gửi lại liên kết đặt lại')).toBeDefined()
  })

  it('không có demo account / chip test trong giao diện production (SCRUM-50)', () => {
    renderComponent()

    expect(screen.queryByText(/admin@ictu.edu.vn \(Có tài khoản\)/i)).toBeNull()
    expect(screen.queryByText(/notfound@ictu.edu.vn/i)).toBeNull()
    expect(screen.queryByText(/thử nhanh với tài khoản mẫu/i)).toBeNull()
  })

  it('không có text lộ tồn tại email như "email không tồn tại" trong UI (SCRUM-50)', () => {
    renderComponent()

    expect(screen.queryByText(/email không tồn tại/i)).toBeNull()
    expect(screen.queryByText(/không tìm thấy tài khoản/i)).toBeNull()
    expect(screen.queryByText(/user not found/i)).toBeNull()
  })

  it('không lưu trạng thái email tồn tại vào localStorage hoặc sessionStorage (SCRUM-50)', async () => {
    renderComponent()

    const emailInput = screen.getByLabelText(/địa chỉ email/i)
    fireEvent.change(emailInput, { target: { value: 'unknown@ictu.edu.vn' } })

    const submitBtn = screen.getByRole('button', { name: /gửi liên kết đặt lại/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(document.getElementById('resetFeedbackBanner')).not.toBeNull()
    })

    expect(localStorage.getItem('emailExists')).toBeNull()
    expect(sessionStorage.getItem('emailExists')).toBeNull()
  })

  it('gọi hàm callback onSubmit khi được truyền vào prop', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderComponent({ onSubmit })

    const emailInput = screen.getByLabelText(/địa chỉ email/i)
    fireEvent.change(emailInput, { target: { value: 'test@ictu.edu.vn' } })

    const submitBtn = screen.getByRole('button', { name: /gửi liên kết đặt lại/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('test@ictu.edu.vn')
    })

    const banner = document.getElementById('resetFeedbackBanner')
    expect(banner).not.toBeNull()
  })

  it('liên kết quay lại dẫn về /login', () => {
    renderComponent()

    const backLink = screen.getByRole('link', { name: /quay lại đăng nhập/i })
    expect(backLink.getAttribute('href')).toBe('/login')
  })
})
