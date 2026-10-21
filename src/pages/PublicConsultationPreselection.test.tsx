// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as publicConsultationApi from '../api/publicConsultationApi'
import { PublicConsultationPage } from './PublicConsultationPage'
import { AboutPage } from './AboutPage'
import { AdmissionsPage } from './AdmissionsPage'
import { ContactPage } from './ContactPage'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Consultation Preselection & Public Info Pages (A10 - A12)', () => {
  const mockPrograms: publicConsultationApi.PublicProgramOption[] = [
    {
      id: 'prog-valid-1',
      code: 'CNTT',
      name: 'Công nghệ thông tin',
      description: 'Chương trình chuẩn',
    },
    {
      id: 'prog-valid-2',
      code: 'AI',
      name: 'Trí tuệ nhân tạo',
      description: 'Chương trình AI',
    },
  ]

  beforeEach(() => {
    vi.spyOn(publicConsultationApi, 'getPublicProgramOptions').mockResolvedValue(mockPrograms)
  })

  it('1. Preselected consultation program: query ?program=<valid-id> tự động chọn ngành tương ứng', async () => {
    render(
      <MemoryRouter initialEntries={['/consultation?program=prog-valid-2']}>
        <Routes>
          <Route path="/consultation" element={<PublicConsultationPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      const select = screen.getByLabelText(
        /chương trình đào tạo quan tâm/i,
      ) as HTMLSelectElement
      expect(select.value).toBe('prog-valid-2')
    })
  })

  it('2. Invalid program query: ?program=<invalid-id> không gây crash và không chọn sai ID', async () => {
    render(
      <MemoryRouter initialEntries={['/consultation?program=id-hoan-toan-khong-ton-tai']}>
        <Routes>
          <Route path="/consultation" element={<PublicConsultationPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      const select = screen.getByLabelText(
        /chương trình đào tạo quan tâm/i,
      ) as HTMLSelectElement
      expect(select.value).toBe('')
    })
  })

  it('3. AboutPage render đầy đủ các section và ảnh thật mà không yêu cầu auth', () => {
    render(
      <MemoryRouter initialEntries={['/about']}>
        <AboutPage />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('about-page')).toBeDefined()
    expect(screen.getByText(/Nơi khởi đầu của những khát vọng công nghệ/i)).toBeDefined()
    expect(screen.getByText(/Cơ sở vật chất hiện đại, đồng bộ/i)).toBeDefined()
    expect(screen.getByText(/Không gian khuôn viên truyền cảm hứng/i)).toBeDefined()
  })

  it('4. AdmissionsPage render quy trình 4 bước chuẩn mực và CTA tư vấn', () => {
    render(
      <MemoryRouter initialEntries={['/admissions']}>
        <AdmissionsPage />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('admissions-page')).toBeDefined()
    expect(screen.getByText('Tìm hiểu chương trình đào tạo')).toBeDefined()
    expect(screen.getByText('Đăng ký tư vấn trực tuyến')).toBeDefined()
    expect(screen.getByText('Nhận tư vấn & định hướng')).toBeDefined()
    expect(screen.getByText('Hoàn thiện hồ sơ xét tuyển')).toBeDefined()
  })

  it('5. ContactPage render thông tin liên hệ chuẩn của ICTU mà không có số liệu bịa', () => {
    render(
      <MemoryRouter initialEntries={['/contact']}>
        <ContactPage />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('contact-page')).toBeDefined()
    expect(screen.getByText(/Đường Z115, Xã Quyết Thắng, Thành phố Thái Nguyên/i)).toBeDefined()
    expect(screen.getByText(/0208.3846.254/i)).toBeDefined()
    expect(screen.getByText(/contact@ictu.edu.vn/i)).toBeDefined()
  })
})
