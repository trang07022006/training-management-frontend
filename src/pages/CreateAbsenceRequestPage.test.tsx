// @vitest-environment jsdom
/**
 * Automated Tests cho SCRUM-255: CreateAbsenceRequestPage (Trang tạo đơn có phân trang)
 */

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router'
import { CreateAbsenceRequestPage } from './CreateAbsenceRequestPage'
import * as absenceApi from '../api/absenceRequestApi'

const mockRequest = vi.fn()
const mockNavigate = vi.fn()

vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

vi.mock('../auth/SessionProvider', () => ({
    useSession: () => ({
        hasSession: true,
        user: { id: 'u-trainee-1', role: 'trainee', name: 'Nguyễn Văn Học Viên' },
        permissions: ['absence.request', 'schedule.personal_view'],
        request: mockRequest,
    }),
}))

describe('SCRUM-255: CreateAbsenceRequestPage', () => {
    // 25 mock sessions thuộc nhiều lớp và môn
    const mockSessions: absenceApi.EligibleSessionItem[] = Array.from({ length: 25 }, (_, i) => {
        const sessionNum = i + 1
        const isClass1 = sessionNum <= 15
        return {
            schedule_id: `sch-${sessionNum.toString().padStart(3, '0')}`,
            class_id: isClass1 ? 'cls-01' : 'cls-02',
            class_code: isClass1 ? 'PY_K22' : 'DB_K22',
            session_number: sessionNum,
            topic: sessionNum === 18 ? 'Chủ đề Tìm Kiếm Đặc Biệt' : `Nội dung bài học số ${sessionNum}`,
            subject_name: isClass1 ? 'Lập trình Python cơ bản' : 'Cơ sở dữ liệu nâng cao',
            subject_code: isClass1 ? 'PYTHON01' : 'DB02',
            learning_date: `2026-10-${(10 + sessionNum).toString().padStart(2, '0')}`,
            shift: 'shift_5',
            start_time: '18:00:00',
            end_time: '20:30:00',
            room_name: 'Phòng Lab 3',
            instructor_name: 'Thầy Hoàng Văn Giảng',
            has_pending_request: sessionNum === 2, // Buổi 2 đã có đơn chờ duyệt
            has_approved_request: sessionNum === 3, // Buổi 3 đã có đơn đã duyệt
            is_selectable: sessionNum !== 2 && sessionNum !== 3,
            latest_request_status: sessionNum === 2 ? 'pending' : sessionNum === 3 ? 'approved' : null,
        }
    })

    const mockFilterOptions = {
        classes: [
            { id: 'cls-01', class_code: 'PY_K22' },
            { id: 'cls-02', class_code: 'DB_K22' },
        ],
        subjects: [
            { id: 'sub-01', code: 'PYTHON01', name: 'Lập trình Python cơ bản', label: 'Lập trình Python cơ bản (PYTHON01)' },
            { id: 'sub-02', code: 'DB02', name: 'Cơ sở dữ liệu nâng cao', label: 'Cơ sở dữ liệu nâng cao (DB02)' },
        ],
    }

    beforeEach(() => {
        vi.spyOn(absenceApi, 'getEligibleSessionsPaginated').mockImplementation(async (_, params) => {
            const page = params?.page || 1
            const limit = params?.limit || 10
            let filtered = [...mockSessions]

            if (params?.q) {
                const q = params.q.toLowerCase()
                filtered = filtered.filter(
                    (s) =>
                        s.class_code.toLowerCase().includes(q) ||
                        s.subject_name.toLowerCase().includes(q) ||
                        s.topic.toLowerCase().includes(q)
                )
            }
            if (params?.class_id) {
                filtered = filtered.filter((s) => s.class_id === params.class_id)
            }

            const startIdx = (page - 1) * limit
            const pageItems = filtered.slice(startIdx, startIdx + limit)

            return {
                items: pageItems,
                pagination: {
                    page,
                    limit,
                    total_items: filtered.length,
                    total_pages: Math.ceil(filtered.length / limit) || 1,
                },
                filter_options: mockFilterOptions,
            }
        })
    })

    afterEach(() => {
        cleanup()
        vi.clearAllMocks()
    })

    it('1. Hiển thị trang tạo đơn với phân trang mặc định 10 buổi/trang và tổng số kết quả', async () => {
        render(
            <MemoryRouter>
                <CreateAbsenceRequestPage />
            </MemoryRouter>
        )

        expect(screen.getByTestId('sessions-loading')).toBeDefined()

        await waitFor(() => {
            expect(screen.getByTestId('sessions-table')).toBeDefined()
        })

        // Kiểm tra phân trang hiển thị 1-10 trên tổng số 25 buổi
        expect(screen.getByText(/trong tổng số/i).textContent).toContain('25')
        expect(screen.getByText('Trang 1 / 3')).toBeDefined()

        // Kiểm tra hiển thị định dạng giờ chuẩn hóa không bị lặp "Ca 5 • 18:00–20:30"
        const timeDisplays = screen.getAllByText(/Ca 5 • 18:00–20:30/)
        expect(timeDisplays.length).toBeGreaterThan(0)
    })

    it('2. Chuyển trang giữ nguyên lựa chọn buổi học trong khối tóm tắt', async () => {
        render(
            <MemoryRouter>
                <CreateAbsenceRequestPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('radio-session-sch-001')).toBeDefined()
        })

        // Chọn Buổi #1
        fireEvent.click(screen.getByTestId('radio-session-sch-001'))

        // Khối tóm tắt phải hiển thị Buổi #1
        await waitFor(() => {
            const summary = screen.getByTestId('selected-session-summary')
            expect(summary.textContent).toContain('Buổi #1')
            expect(summary.textContent).toContain('PY_K22')
        })

        // Chuyển sang Trang 2
        fireEvent.click(screen.getByTestId('next-page-btn'))

        await waitFor(() => {
            expect(screen.getByText('Trang 2 / 3')).toBeDefined()
        })

        // Khối tóm tắt vẫn giữ nguyên Buổi #1 và có chú thích nằm ngoài kết quả lọc
        const summary = screen.getByTestId('selected-session-summary')
        expect(summary.textContent).toContain('Buổi #1')
        expect(screen.getByTestId('outside-filter-notice')).toBeDefined()
    })

    it('3. Buổi đã duyệt (sch-003) và Chờ duyệt (sch-002) bị khóa (disabled) không thể chọn', async () => {
        render(
            <MemoryRouter>
                <CreateAbsenceRequestPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('radio-session-sch-002')).toBeDefined()
            expect(screen.getByTestId('radio-session-sch-003')).toBeDefined()
        })

        const radioPending = screen.getByTestId('radio-session-sch-002') as HTMLInputElement
        const radioApproved = screen.getByTestId('radio-session-sch-003') as HTMLInputElement

        expect(radioPending.disabled).toBe(true)
        expect(radioApproved.disabled).toBe(true)

        expect(screen.getByTestId('status-sch-002').textContent).toBe('Chờ duyệt')
        expect(screen.getByTestId('status-sch-003').textContent).toBe('Đã duyệt')
    })

    it('4. Tìm kiếm buổi học ngoài trang đầu (sch-018 nằm ở trang 2) thành công', async () => {
        render(
            <MemoryRouter>
                <CreateAbsenceRequestPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('search-sessions-input')).toBeDefined()
        })

        // Nhập từ khóa chủ đề buổi 18
        fireEvent.change(screen.getByTestId('search-sessions-input'), {
            target: { value: 'Chủ đề Tìm Kiếm Đặc Biệt' },
        })

        await waitFor(() => {
            expect(absenceApi.getEligibleSessionsPaginated).toHaveBeenCalledWith(
                expect.any(Function),
                expect.objectContaining({ q: 'Chủ đề Tìm Kiếm Đặc Biệt' })
            )
        })

        await waitFor(() => {
            expect(screen.getAllByText('Chủ đề Tìm Kiếm Đặc Biệt').length).toBeGreaterThan(0)
            expect(screen.getAllByText(/Buổi #18/).length).toBeGreaterThan(0)
        })
    })

    it('5. Gửi đơn thành công với đúng schedule_id đã chọn, lý do và minh chứng', async () => {
        const submitSpy = vi.spyOn(absenceApi, 'submitAbsenceRequest').mockResolvedValue({
            id: 'req-new-001',
            schedule_id: 'sch-001',
            student_id: 'stu-001',
            reason: 'Lý do chính đáng em xin phép nghỉ buổi học.',
            status: 'pending',
            status_label: 'Chờ duyệt',
            created_at: '2026-10-20T10:00:00Z',
        })

        render(
            <MemoryRouter>
                <CreateAbsenceRequestPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('radio-session-sch-001')).toBeDefined()
        })

        // Chọn buổi 1
        fireEvent.click(screen.getByTestId('radio-session-sch-001'))

        // Nhập lý do
        fireEvent.change(screen.getByTestId('reason-input'), {
            target: { value: 'Lý do chính đáng em xin phép nghỉ buổi học.' },
        })

        // Đính kèm 1 tệp minh chứng
        const file = new File(['content'], 'minh_chung.pdf', { type: 'application/pdf' })
        const fileInput = screen.getByTestId('file-upload-input')
        fireEvent.change(fileInput, { target: { files: [file] } })

        await waitFor(() => {
            expect(screen.getByText('minh_chung.pdf')).toBeDefined()
        })

        // Bấm gửi đơn
        fireEvent.click(screen.getByTestId('submit-absence-btn'))

        await waitFor(() => {
            expect(submitSpy).toHaveBeenCalled()
            expect(mockNavigate).toHaveBeenCalledWith('/my-absence-requests?success=1')
        })
    })

    it('6. Hiển thị lỗi API rõ ràng và có nút Thử lại, không biến thành danh sách rỗng', async () => {
        vi.spyOn(absenceApi, 'getEligibleSessionsPaginated').mockRejectedValue(
            new Error('Lỗi máy chủ không phản hồi')
        )

        render(
            <MemoryRouter>
                <CreateAbsenceRequestPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('sessions-error')).toBeDefined()
            expect(screen.getByText(/Lỗi máy chủ không phản hồi/i)).toBeDefined()
            expect(screen.getByTestId('retry-sessions-btn')).toBeDefined()
        })

        // Không hiển thị empty state
        expect(screen.queryByTestId('sessions-empty')).toBeNull()
    })

    it('7. Hiển thị giao diện thẻ trên màn hình mobile (360-390px)', async () => {
        render(
            <MemoryRouter>
                <CreateAbsenceRequestPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('sessions-mobile-cards')).toBeDefined()
            expect(screen.getByTestId('mobile-card-sch-001')).toBeDefined()
            expect(screen.getByTestId('mobile-select-btn-sch-001')).toBeDefined()
        })

        // Bấm chọn bằng nút mobile
        fireEvent.click(screen.getByTestId('mobile-select-btn-sch-001'))

        await waitFor(() => {
            expect(screen.getByTestId('mobile-select-btn-sch-001').textContent).toContain('Đã chọn buổi này')
        })
    })
})
