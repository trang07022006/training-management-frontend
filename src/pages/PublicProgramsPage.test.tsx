// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as publicConsultationApi from '../api/publicConsultationApi'
import { PublicProgramsPage } from './PublicProgramsPage'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('PublicProgramsPage (A8)', () => {
  const mockPrograms: publicConsultationApi.PublicProgramOption[] = [
    {
      id: 'p-1',
      code: 'CNTT01',
      name: 'Công nghệ thông tin',
      description: 'Chương trình đào tạo kỹ sư CNTT tiêu chuẩn.',
    },
    {
      id: 'p-2',
      code: 'AI01',
      name: 'Trí tuệ nhân tạo',
      description: 'Chuyên ngành trí tuệ nhân tạo và dữ liệu lớn.',
    },
    {
      id: 'p-3',
      code: 'ATTT01',
      name: 'An toàn thông tin',
      description: 'Bảo mật và an ninh mạng.',
    },
  ]

  beforeEach(() => {
    vi.spyOn(publicConsultationApi, 'getPublicProgramOptions').mockResolvedValue(mockPrograms)
  })

  const renderPage = () => {
    return render(
      <MemoryRouter initialEntries={['/programs']}>
        <PublicProgramsPage />
      </MemoryRouter>,
    )
  }

  it('1. Render tiêu đề "Chương trình đào tạo", thanh tìm kiếm và số lượng', async () => {
    renderPage()

    expect(screen.getByRole('heading', { name: /chương trình đào tạo/i })).toBeDefined()
    expect(screen.getByTestId('programs-search-input')).toBeDefined()

    await waitFor(() => {
      expect(screen.getByTestId('programs-count')).toBeDefined()
      expect(screen.getByText(/Hiển thị/i)).toBeDefined()
    })
  })

  it('2. Hiển thị danh sách card chương trình đào tạo từ API thật', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getAllByText('Công nghệ thông tin').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('CNTT01')).toBeDefined()
      expect(screen.getAllByText('Trí tuệ nhân tạo').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('AI01')).toBeDefined()
      expect(screen.getAllByText('An toàn thông tin').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('ATTT01')).toBeDefined()
    })

    const detailLinks = screen.getAllByRole('link', { name: /xem chi tiết/i })
    expect(detailLinks.length).toBe(3)
    expect(detailLinks[0].getAttribute('href')).toBe('/programs/p-1')
  })

  it('3. Tìm kiếm theo tên hoặc mã ngành lọc danh sách tức thì an toàn', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('CNTT01')).toBeDefined()
    })

    const searchInput = screen.getByTestId('programs-search-input')

    // Tìm kiếm "trí tuệ"
    fireEvent.change(searchInput, { target: { value: 'trí tuệ' } })

    expect(screen.getAllByText('Trí tuệ nhân tạo').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('CNTT01')).toBeNull()
    expect(screen.queryByText('ATTT01')).toBeNull()

    // Xóa tìm kiếm -> hiển thị lại tất cả
    fireEvent.change(searchInput, { target: { value: '' } })
    expect(screen.getByText('CNTT01')).toBeDefined()
    expect(screen.getByText('ATTT01')).toBeDefined()
  })

  it('4. Tìm kiếm không có kết quả: hiển thị empty state tìm kiếm', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('CNTT01')).toBeDefined()
    })

    const searchInput = screen.getByTestId('programs-search-input')
    fireEvent.change(searchInput, { target: { value: 'nganh-khong-ton-tai-xyz' } })

    expect(screen.getByTestId('programs-search-empty')).toBeDefined()
    expect(screen.getByText('Không tìm thấy kết quả phù hợp')).toBeDefined()
  })

  it('5. API trả về mảng rỗng: hiển thị empty state chung', async () => {
    vi.spyOn(publicConsultationApi, 'getPublicProgramOptions').mockResolvedValue([])

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('programs-empty-state')).toBeDefined()
      expect(screen.getByText('Chưa có chương trình đào tạo')).toBeDefined()
    })
  })

  it('6. Lỗi API: hiển thị error state an toàn', async () => {
    vi.spyOn(publicConsultationApi, 'getPublicProgramOptions').mockRejectedValue(
      new Error('Mất kết nối cơ sở dữ liệu'),
    )

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('programs-error-state')).toBeDefined()
      expect(screen.getByText('Mất kết nối cơ sở dữ liệu')).toBeDefined()
    })
  })
})
