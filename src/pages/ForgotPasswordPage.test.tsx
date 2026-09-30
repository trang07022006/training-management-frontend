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
})

describe('ForgotPasswordPage (SCRUM-44)', () => {
  it('hiển thị đầy đủ tiêu đề, mô tả, ô nhập email và nút bấm', () => {
    renderComponent()

    expect(screen.getByRole('heading', { name: 'Quên mật khẩu?' })).toBeDefined()
    expect(
      screen.getByText(/hãy nhập địa chỉ email đã đăng ký của bạn/i)
    ).toBeDefined()

    const emailInput = screen.getByLabelText(/địa chỉ email/i) as HTMLInputElement
    expect(emailInput).toBeDefined()
    expect(emailInput.value).toBe('admin@ictu.edu.vn')

    const submitBtn = screen.getByRole('button', { name: /gửi liên kết đặt lại/i })
    expect(submitBtn).toBeDefined()
    expect(submitBtn.hasAttribute('disabled')).toBe(false)

    expect(screen.getByRole('link', { name: /quay lại đăng nhập/i })).toBeDefined()
  })

  it('xác thực email hợp lệ khi tải trang với tài khoản mẫu', () => {
    renderComponent()

    const helperText = document.getElementById('fieldHelperText')
    expect(helperText?.textContent).toBe('Định dạng hợp lệ. Sẵn sàng gửi yêu cầu.')

    const submitBtn = screen.getByRole('button', { name: /gửi liên kết đặt lại/i })
    expect(submitBtn.hasAttribute('disabled')).toBe(false)
  })

  it('hiển thị thông báo trung tính và khóa nút gửi khi xóa trống email', () => {
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

  it('nạp nhanh địa chỉ email khi bấm vào các nút tài khoản mẫu', () => {
    renderComponent()

    const emailInput = screen.getByLabelText(/địa chỉ email/i) as HTMLInputElement

    const notfoundChip = screen.getByRole('button', {
      name: /notfound@ictu.edu.vn/i,
    })
    fireEvent.click(notfoundChip)
    expect(emailInput.value).toBe('notfound@ictu.edu.vn')

    const helperText = document.getElementById('fieldHelperText')
    expect(helperText?.textContent).toBe('Định dạng hợp lệ. Sẵn sàng gửi yêu cầu.')

    const adminChip = screen.getByRole('button', {
      name: /admin@ictu.edu.vn/i,
    })
    fireEvent.click(adminChip)
    expect(emailInput.value).toBe('admin@ictu.edu.vn')
  })

  it('gửi form thành công và hiển thị banner xác thực (SCRUM-50)', async () => {
    renderComponent()

    const submitBtn = screen.getByRole('button', { name: /gửi liên kết đặt lại/i })
    fireEvent.click(submitBtn)

    // Kiểm tra trạng thái đang gửi
    expect(screen.getByText('Đang gửi mã bảo mật...')).toBeDefined()

    // Chờ quá trình hoàn tất
    await waitFor(() => {
      const banner = document.getElementById('resetFeedbackBanner')
      expect(banner).not.toBeNull()
      expect(screen.getByText('Đã gửi liên kết xác thực')).toBeDefined()
      expect(document.getElementById('targetEmailLabel')?.textContent).toBe(
        'admin@ictu.edu.vn'
      )
    })

    // Nút đổi thành "Gửi lại liên kết đặt lại"
    expect(screen.getByText('Gửi lại liên kết đặt lại')).toBeDefined()
  })

  it('gọi hàm callback onSubmit khi được truyền vào prop', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderComponent({ onSubmit })

    const submitBtn = screen.getByRole('button', { name: /gửi liên kết đặt lại/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('admin@ictu.edu.vn')
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
