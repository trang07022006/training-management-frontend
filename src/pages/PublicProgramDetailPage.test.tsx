// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as publicConsultationApi from '../api/publicConsultationApi'
import { PublicProgramDetailPage } from './PublicProgramDetailPage'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('PublicProgramDetailPage (A9)', () => {
  const mockPrograms: publicConsultationApi.PublicProgramOption[] = [
    {
      id: 'prog-100',
      code: 'CNTT-K24',
      name: 'Công nghệ thông tin K24',
      description: 'Chương trình đào tạo kỹ sư công nghệ thông tin tiên tiến.',
    },
    {
      id: 'prog-200',
      code: 'ATTT-K24',
      name: 'An toàn thông tin K24',
      description: 'Chuyên gia bảo mật và phòng thủ không gian mạng.',
    },
  ]

  beforeEach(() => {
    vi.spyOn(publicConsultationApi, 'getPublicProgramOptions').mockResolvedValue(mockPrograms)
  })

  const renderDetail = (id = 'prog-100') => {
    return render(
      <MemoryRouter initialEntries={[`/programs/${id}`]}>
        <Routes>
          <Route path="/programs/:id" element={<PublicProgramDetailPage />} />
          <Route path="/programs" element={<div>Danh sách chương trình</div>} />
          <Route path="/consultation" element={<div>Trang tư vấn</div>} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('1. Hiển thị đúng thông tin thực của chương trình: code, name, description', async () => {
    renderDetail('prog-100')

    await waitFor(() => {
      expect(screen.getByTestId('detail-program-name').textContent).toBe(
        'Công nghệ thông tin K24',
      )
      expect(screen.getByTestId('detail-program-code').textContent).toContain('CNTT-K24')
      expect(screen.getByTestId('detail-program-desc').textContent).toBe(
        'Chương trình đào tạo kỹ sư công nghệ thông tin tiên tiến.',
      )
    })
  })

  it('2. CTA Đăng ký tư vấn chuyển hướng đúng tới /consultation?program=<id>', async () => {
    renderDetail('prog-100')

    await waitFor(() => {
      const ctaBtn = screen.getByTestId('program-consultation-cta')
      expect(ctaBtn).toBeDefined()
      expect(ctaBtn.getAttribute('href')).toBe('/consultation?program=prog-100')
    })
  })

  it('3. ID không tồn tại: hiển thị trạng thái Not Found và nút quay lại an toàn', async () => {
    renderDetail('id-khong-ton-tai-999')

    await waitFor(() => {
      expect(screen.getByTestId('detail-not-found-state')).toBeDefined()
      expect(screen.getByText('Không tìm thấy chương trình đào tạo')).toBeDefined()
      expect(screen.getByRole('link', { name: /quay lại danh mục chương trình/i })).toBeDefined()
    })
  })

  it('4. Lỗi tải dữ liệu API: hiển thị error state an toàn', async () => {
    vi.spyOn(publicConsultationApi, 'getPublicProgramOptions').mockRejectedValue(
      new Error('Mất kết nối máy chủ'),
    )

    renderDetail('prog-100')

    await waitFor(() => {
      expect(screen.getByTestId('detail-error-state')).toBeDefined()
      expect(screen.getByText('Mất kết nối máy chủ')).toBeDefined()
    })
  })
})
