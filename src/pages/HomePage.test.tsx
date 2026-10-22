// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as publicConsultationApi from '../api/publicConsultationApi'
import { HomePage } from './HomePage'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('HomePage Component (A2 - A6)', () => {
  const mockPrograms: publicConsultationApi.PublicProgramOption[] = [
    {
      id: 'p-1',
      code: 'CNTT01',
      name: 'Công nghệ thông tin',
      description: 'Chương trình đào tạo kỹ sư CNTT chất lượng cao.',
    },
    {
      id: 'p-2',
      code: 'AI01',
      name: 'Trí tuệ nhân tạo',
      description: 'Đào tạo chuyên sâu AI và Khoa học dữ liệu.',
    },
  ]

  beforeEach(() => {
    vi.spyOn(publicConsultationApi, 'getPublicProgramOptions').mockResolvedValue(mockPrograms)
    vi.spyOn(publicConsultationApi, 'submitPublicConsultation').mockResolvedValue({
      status: 'success',
      message: 'OK',
      data: { id: 'lead-123' },
    })
  })

  const renderHome = () => {
    return render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
  }

  it('1. Section 1 HERO: Hiển thị đúng Eyebrow, Heading, CTAs và ảnh thật tòa nhà ICTU', () => {
    renderHome()

    // Eyebrow
    expect(screen.getByText('KIẾN TẠO TRI THỨC – KẾT NỐI TƯƠNG LAI')).toBeDefined()

    // Heading
    expect(
      screen.getByRole('heading', {
        name: /Khám phá ICTU – Môi trường học tập hiện đại cho thế hệ số/i,
      }),
    ).toBeDefined()

    // CTAs
    const exploreBtn = screen.getByRole('link', { name: /tìm hiểu chương trình/i })
    expect(exploreBtn.getAttribute('href')).toBe('/programs')

    const consultBtn = screen.getByRole('link', { name: /đăng ký tư vấn/i })
    expect(consultBtn.getAttribute('href')).toBe('/consultation')

    // Ảnh thật tòa nhà ICTU
    const buildingImg = screen.getByTestId('hero-building-image')
    expect(buildingImg.getAttribute('src')).toBe('/branding/ictu/ictu-building.jpg')
    expect(screen.getByText('Khuôn viên hiện đại ICTU')).toBeDefined()
  })

  it('2. Section 2 VỀ ICTU: Hiển thị đúng heading và 3 card tính năng giáo dục cốt lõi', () => {
    renderHome()

    expect(screen.getByText('VỀ ICTU')).toBeDefined()
    expect(screen.getByText('Nơi chắp cánh ước mơ trong kỷ nguyên số')).toBeDefined()

    // 3 Cards
    expect(screen.getAllByText('Môi trường học tập hiện đại').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Đội ngũ giảng viên tận huyết')).toBeDefined()
    expect(screen.getByText('Cơ sở vật chất đồng bộ')).toBeDefined()
  })

  it('3. Section 3 CHƯƠNG TRÌNH ĐÀO TẠO NỔI BẬT: Lấy từ API thật, hiển thị card với code, name, description và Xem chi tiết', async () => {
    renderHome()

    await waitFor(() => {
      expect(screen.getAllByText('Công nghệ thông tin').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('CNTT01')).toBeDefined()
      expect(screen.getByText('Trí tuệ nhân tạo')).toBeDefined()
      expect(screen.getByText('AI01')).toBeDefined()
    })

    const detailLinks = screen.getAllByRole('link', { name: /xem chi tiết/i })
    expect(detailLinks[0].getAttribute('href')).toBe('/programs/p-1')
  })

  it('4. Section 3 Empty State: Hiển thị giao diện thân thiện khi không có chương trình nào', async () => {
    vi.spyOn(publicConsultationApi, 'getPublicProgramOptions').mockResolvedValue([])

    renderHome()

    await waitFor(() => {
      expect(screen.getByTestId('programs-empty')).toBeDefined()
      expect(screen.getByText('Chưa có chương trình đào tạo mở')).toBeDefined()
    })
  })

  it('5. Section 4 CAMPUS GALLERY: Hiển thị đúng 5 ảnh thật và caption theo quy chuẩn', () => {
    renderHome()

    expect(screen.getByText('KHÔNG GIAN HỌC TẬP & CƠ SỞ VẬT CHẤT')).toBeDefined()
    expect(screen.getByText('Khuôn viên hiện đại, môi trường học tập lý tưởng')).toBeDefined()

    const galleryGrid = screen.getByTestId('campus-gallery-grid')
    expect(galleryGrid).toBeDefined()

    // 5 captions theo yêu cầu
    expect(screen.getByText('Tòa nhà trung tâm')).toBeDefined()
    expect(screen.getByText('Giảng đường C2')).toBeDefined()
    expect(screen.getByText('Sân trường')).toBeDefined()
    expect(screen.getByText('Hồ điều hòa trong khuôn viên')).toBeDefined()
    expect(screen.getByText('Cổng trường ICTU')).toBeDefined()

    // Kiểm tra các ảnh thật được sử dụng
    const imgs = galleryGrid.querySelectorAll('img')
    expect(imgs.length).toBe(5)
    expect(imgs[0].getAttribute('src')).toBe('/branding/ictu/ictu-building.jpg')
    expect(imgs[1].getAttribute('src')).toBe('/branding/ictu/ictu-c2-lake.jpg')
    expect(imgs[2].getAttribute('src')).toBe('/branding/ictu/ictu-campus.jpg')
    expect(imgs[3].getAttribute('src')).toBe('/branding/ictu/ictu-lake.jpg')
    expect(imgs[4].getAttribute('src')).toBe('/branding/ictu/ictu-gate.jpg')
  })

  it('6. Section 5 CONSULTATION CTA: Form compact kiểm tra validation và gửi thành công', async () => {
    renderHome()

    expect(screen.getByText('Nhận tư vấn tuyển sinh từ ICTU')).toBeDefined()

    const submitBtn = screen.getByTestId('compact-submit-btn')

    // Bấm khi chưa nhập thông tin -> báo lỗi
    fireEvent.click(submitBtn)
    expect(screen.getByText('Vui lòng nhập họ và tên.')).toBeDefined()

    // Nhập họ tên
    const nameInput = screen.getByPlaceholderText('Nguyễn Văn A')
    fireEvent.change(nameInput, { target: { value: 'Lê Văn An' } })

    fireEvent.click(submitBtn)
    expect(screen.getByText('Vui lòng nhập số điện thoại.')).toBeDefined()

    // Nhập số điện thoại
    const phoneInput = screen.getByPlaceholderText('0912345678')
    fireEvent.change(phoneInput, { target: { value: '0988776655' } })

    // Gửi form thành công
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByTestId('compact-submit-success')).toBeDefined()
      expect(screen.getByText('Gửi thông tin thành công!')).toBeDefined()
    })
  })
})
