// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { PublicLayout } from './PublicLayout'

afterEach(() => {
  cleanup()
})

describe('PublicLayout Component', () => {
  const renderLayout = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<div data-testid="test-home-content">Home Content</div>} />
            <Route path="/about" element={<div data-testid="test-about-content">About Content</div>} />
            <Route path="/programs" element={<div data-testid="test-programs-content">Programs Content</div>} />
            <Route path="/admissions" element={<div data-testid="test-admissions-content">Admissions Content</div>} />
            <Route path="/consultation" element={<div data-testid="test-consultation-content">Consultation Content</div>} />
            <Route path="/contact" element={<div data-testid="test-contact-content">Contact Content</div>} />
          </Route>
          <Route path="/login" element={<div data-testid="test-login-content">Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('1. Render Header với LOGO ICTU THẬT và đầy đủ liên kết điều hướng desktop', () => {
    renderLayout()

    // Kiểm tra logo ICTU thật từ asset trong repo
    const logoImg = screen.getByTestId('public-brand-logo')
    expect(logoImg).toBeDefined()
    expect(logoImg.getAttribute('src')).toBe('/branding/ictu/logo.png')
    expect(logoImg.getAttribute('alt')).toContain('ICTU')

    // Tên trường
    const schoolTitles = screen.getAllByText('TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG')
    expect(schoolTitles.length).toBeGreaterThanOrEqual(1)

    // Nav links inside desktop navigation
    const nav = screen.getByRole('navigation', { name: /điều hướng chính/i })
    expect(within(nav).getByRole('link', { name: /^trang chủ$/i })).toBeDefined()
    expect(within(nav).getByRole('link', { name: /^giới thiệu$/i })).toBeDefined()
    expect(within(nav).getByRole('link', { name: /^chương trình đào tạo$/i })).toBeDefined()
    expect(within(nav).getByRole('link', { name: /^tuyển sinh$/i })).toBeDefined()
    expect(within(nav).getByRole('link', { name: /^liên hệ$/i })).toBeDefined()

    // CTAs
    const consultationBtn = screen.getByTestId('header-consultation-btn')
    expect(consultationBtn).toBeDefined()
    expect(consultationBtn.getAttribute('href')).toBe('/consultation')

    const loginBtn = screen.getByTestId('header-login-btn')
    expect(loginBtn).toBeDefined()
    expect(loginBtn.getAttribute('href')).toBe('/login')
  })

  it('2. Mobile Menu hamburger có thể mở và đóng đúng cách', () => {
    renderLayout()

    const toggleBtn = screen.getByTestId('mobile-menu-toggle')
    expect(toggleBtn).toBeDefined()
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByTestId('public-mobile-menu')).toBeNull()

    // Mở mobile menu
    fireEvent.click(toggleBtn)
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true')
    const mobileMenu = screen.getByTestId('public-mobile-menu')
    expect(mobileMenu).toBeDefined()

    // Đóng mobile menu
    fireEvent.click(toggleBtn)
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByTestId('public-mobile-menu')).toBeNull()
  })

  it('3. Render Footer với LOGO ICTU THẬT, tên trường, liên kết nhanh và thông tin liên hệ', () => {
    renderLayout()

    const footer = screen.getByTestId('public-footer')
    expect(footer).toBeDefined()

    // Logo trong footer
    const footerLogos = document.querySelectorAll('.footer-brand-logo')
    expect(footerLogos.length).toBeGreaterThan(0)
    expect(footerLogos[0].getAttribute('src')).toBe('/branding/ictu/logo.png')

    // Địa chỉ thật của trường
    expect(screen.getByText(/Đường Z115, Xã Quyết Thắng, TP. Thái Nguyên/i)).toBeDefined()
    expect(screen.getByText(/0208.3846.254/i)).toBeDefined()
    expect(screen.getByText(/contact@ictu.edu.vn/i)).toBeDefined()
  })

  it('4. Khách vãng lai truy cập public route không yêu cầu xác thực hoặc đăng nhập', () => {
    renderLayout('/')
    expect(screen.getByTestId('test-home-content')).toBeDefined()
  })
})
