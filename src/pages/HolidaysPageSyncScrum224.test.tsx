// @vitest-environment jsdom
/**
 * Automated Tests cho SCRUM-224 Holidays List & Sync:
 * 1. Đọc đúng cấu trúc response { items: [...], total: ... } từ Backend, không bị (0) hay mảng rỗng.
 * 2. Thêm ngày nghỉ mới: cập nhật ngay danh sách và số lượng, F5 vẫn còn.
 * 3. Khi API tải danh sách thất bại: hiển thị thông báo lỗi và nút "Thử lại", KHÔNG báo "Chưa có ngày nghỉ" hay (0).
 * 4. Bấm "Thử lại" tải lại danh sách thành công.
 * 5. Xóa ngày nghỉ lễ thành công.
 * 6. HolidaysManagementModal hiển thị danh sách đúng và không bị crash.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { HolidaysPage } from './HolidaysPage'
import { HolidaysManagementModal } from '../components/HolidaysManagementModal'
import * as scheduleApi from '../api/scheduleApi'
import { ApiError } from '../api/userApi'

const mockSession = {
    user: { id: 'u-mgr-1', name: 'Quản lý đào tạo', email: 'ql@ictu.edu.vn' },
    permissions: ['course.manage', 'course.view'],
    role: 'training_manager',
    roles: ['training_manager'],
    request: vi.fn(),
}

vi.mock('../auth/SessionProvider', () => ({
    useSession: () => mockSession,
}))

vi.mock('../api/scheduleApi', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return {
        ...actual,
        listHolidays: vi.fn(),
        createHoliday: vi.fn(),
        deleteHoliday: vi.fn(),
    }
})

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('HolidaysPage - SCRUM-224 Holidays Sync & Error Handling', () => {
    const fakeHolidays = [
        {
            id: 'h-1',
            holiday_date: '2026-10-19',
            name: 'Ngày lễ Halloween 1',
            description: 'Nghỉ ngày 1',
        },
        {
            id: 'h-2',
            holiday_date: '2026-10-26',
            name: 'Ngày lễ Halloween 2',
            description: 'Nghỉ ngày 2',
        },
    ]

    const renderPage = () => {
        return render(
            <MemoryRouter initialEntries={['/holidays']}>
                <Routes>
                    <Route path="/holidays" element={<HolidaysPage />} />
                </Routes>
            </MemoryRouter>
        )
    }

    it('1. Đọc đúng cấu trúc response và hiển thị danh sách ngày nghỉ thực tế, không bị (0) hay rỗng', async () => {
        // Backend trả về mảng HolidayItem[] (qua scheduleApi.ts trích xuất từ data.items)
        vi.mocked(scheduleApi.listHolidays).mockResolvedValue(fakeHolidays as any)

        renderPage()

        await waitFor(() => {
            // Tiêu đề hiển thị đúng số lượng (2)
            expect(screen.getByText(/Danh sách ngày nghỉ lễ \(2\)/i)).toBeDefined()
            // Hiển thị tên các ngày nghỉ
            expect(screen.getByText('Ngày lễ Halloween 1')).toBeDefined()
            expect(screen.getByText('Ngày lễ Halloween 2')).toBeDefined()
            expect(screen.getByText('2026-10-19')).toBeDefined()
            expect(screen.getByText('2026-10-26')).toBeDefined()
        })

        // Không hiển thị trạng thái rỗng
        expect(screen.queryByTestId('empty-holidays-state')).toBeNull()
        expect(screen.queryByTestId('holidays-load-error')).toBeNull()
    })

    it('2. Thêm ngày nghỉ lễ mới: danh sách và tổng số cập nhật đúng; F5 vẫn còn dữ liệu', async () => {
        let currentHolidays = [...fakeHolidays]
        vi.mocked(scheduleApi.listHolidays).mockImplementation(async () => currentHolidays as any)

        vi.mocked(scheduleApi.createHoliday).mockImplementation(async (_req, payload) => {
            const created = {
                id: 'h-3',
                holiday_date: payload.holiday_date,
                name: payload.name,
                description: payload.description || '',
            }
            currentHolidays.push(created)
            return created as any
        })

        renderPage()
        await waitFor(() => expect(screen.getByText(/Danh sách ngày nghỉ lễ \(2\)/i)).toBeDefined())

        // Điền form thêm ngày nghỉ
        const dateInput = screen.getByLabelText(/Ngày nghỉ lễ/i)
        const nameInput = screen.getByLabelText(/Tên ngày lễ/i)
        const descInput = screen.getByLabelText(/Mô tả chi tiết/i)

        fireEvent.change(dateInput, { target: { value: '2026-11-20' } })
        fireEvent.change(nameInput, { target: { value: 'Ngày Nhà giáo Việt Nam' } })
        fireEvent.change(descInput, { target: { value: 'Tri ân thầy cô' } })

        fireEvent.click(screen.getByText(/\+ Thêm ngày nghỉ lễ/i))

        // Sau khi thêm, danh sách cập nhật thành 3
        await waitFor(() => {
            expect(screen.getByText(/Danh sách ngày nghỉ lễ \(3\)/i)).toBeDefined()
            expect(screen.getByText('Ngày Nhà giáo Việt Nam')).toBeDefined()
            expect(screen.getByText('2026-11-20')).toBeDefined()
        })

        // Toast thành công xuất hiện
        const toastEl = screen.getByTestId('toast-container')
        expect(toastEl.textContent).toContain('Ngày Nhà giáo Việt Nam')

        // Mô phỏng F5 (unmount và mount lại)
        cleanup()
        renderPage()

        await waitFor(() => {
            expect(screen.getByText(/Danh sách ngày nghỉ lễ \(3\)/i)).toBeDefined()
            expect(screen.getByText('Ngày Nhà giáo Việt Nam')).toBeDefined()
        })
    })

    it('3. Khi API tải danh sách thất bại: hiển thị thông báo lỗi và nút "Thử lại", KHÔNG báo "Chưa có ngày nghỉ" hay (0)', async () => {
        vi.mocked(scheduleApi.listHolidays).mockRejectedValue(
            new ApiError('Máy chủ cơ sở dữ liệu tạm thời bận.', 'DATABASE_ERROR', 500)
        )

        renderPage()

        await waitFor(() => {
            // Header hiển thị (Lỗi tải) thay vì (0)
            expect(screen.getByText(/Danh sách ngày nghỉ lễ \(Lỗi tải\)/i)).toBeDefined()
            // Khung lỗi với nút thử lại xuất hiện
            const errorBlock = screen.getByTestId('holidays-load-error')
            expect(errorBlock.textContent).toContain('Không thể tải danh sách ngày nghỉ lễ')
            expect(errorBlock.textContent).toMatch(/Đã xảy ra lỗi|Máy chủ cơ sở dữ liệu/)
            expect(screen.getByTestId('btn-retry-load-holidays')).toBeDefined()
        })

        // TUYỆT ĐỐI KHÔNG HIỂN THỊ "Chưa có ngày nghỉ lễ nào" hay (0)
        expect(screen.queryByTestId('empty-holidays-state')).toBeNull()
        expect(screen.queryByText(/Danh sách ngày nghỉ lễ \(0\)/i)).toBeNull()
    })

    it('4. Bấm "Thử lại" tải lại danh sách ngày nghỉ thành công sau lỗi', async () => {
        vi.mocked(scheduleApi.listHolidays).mockRejectedValueOnce(
            new ApiError('Lỗi kết nối mạng.', 'NETWORK_ERROR', 0)
        )

        renderPage()

        await waitFor(() => {
            expect(screen.getByTestId('holidays-load-error')).toBeDefined()
        })

        // Giờ API thành công
        vi.mocked(scheduleApi.listHolidays).mockResolvedValue(fakeHolidays as any)

        fireEvent.click(screen.getByTestId('btn-retry-load-holidays'))

        await waitFor(() => {
            expect(screen.getByText(/Danh sách ngày nghỉ lễ \(2\)/i)).toBeDefined()
            expect(screen.getByText('Ngày lễ Halloween 1')).toBeDefined()
            expect(screen.queryByTestId('holidays-load-error')).toBeNull()
        })
    })

    it('5. Xóa ngày nghỉ lễ: Gọi API xóa và cập nhật danh sách', async () => {
        let currentHolidays = [...fakeHolidays]
        vi.mocked(scheduleApi.listHolidays).mockImplementation(async () => currentHolidays as any)
        vi.mocked(scheduleApi.deleteHoliday).mockImplementation(async (_req, id) => {
            currentHolidays = currentHolidays.filter((h) => h.id !== id)
            return { deleted: true }
        })

        // Mock window.confirm = true
        vi.spyOn(window, 'confirm').mockReturnValue(true)

        renderPage()
        await waitFor(() => expect(screen.getByText(/Danh sách ngày nghỉ lễ \(2\)/i)).toBeDefined())

        const deleteButtons = screen.getAllByText('Xóa')
        fireEvent.click(deleteButtons[0])

        await waitFor(() => {
            expect(screen.getByText(/Danh sách ngày nghỉ lễ \(1\)/i)).toBeDefined()
            expect(screen.queryByText('Ngày lễ Halloween 1')).toBeNull()
            expect(screen.getByText('Ngày lễ Halloween 2')).toBeDefined()
        })
    })

    it('6. HolidaysManagementModal: Hiển thị danh sách, xử lý lỗi tải và không bị crash', async () => {
        vi.mocked(scheduleApi.listHolidays).mockResolvedValue(fakeHolidays as any)

        const handleClose = vi.fn()
        render(
            <HolidaysManagementModal
                requestFn={mockSession.request}
                canManage={true}
                onClose={handleClose}
            />
        )

        await waitFor(() => {
            expect(screen.getByText(/Danh sách ngày nghỉ lễ đã khai báo \(2\)/i)).toBeDefined()
            expect(screen.getByText('Ngày lễ Halloween 1')).toBeDefined()
            expect(screen.getByText('Ngày lễ Halloween 2')).toBeDefined()
        })

        cleanup()

        // Test modal khi API lỗi
        vi.mocked(scheduleApi.listHolidays).mockRejectedValue(new Error('Lỗi tải modal'))
        render(
            <HolidaysManagementModal
                requestFn={mockSession.request}
                canManage={true}
                onClose={handleClose}
            />
        )

        await waitFor(() => {
            expect(screen.getByText(/Danh sách ngày nghỉ lễ đã khai báo \(Lỗi tải\)/i)).toBeDefined()
            expect(screen.getByTestId('load-error-state')).toBeDefined()
            expect(screen.queryByTestId('empty-holidays-state')).toBeNull()
        })
    })
})
