// @vitest-environment jsdom
/**
 * Automated Tests cho SCRUM-224 Frontend:
 * - Hiển thị nút "Thời khóa biểu" và nút "Ngày nghỉ lễ"
 * - Mở modal Thời khóa biểu, xem lịch hiện tại và tab sinh lịch
 * - Xem trước thời khóa biểu (preview) có gắn bài học và giải trình bỏ qua ngày lễ
 * - Xác nhận lưu lịch học chính thức
 */

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ClassesPage } from './ClassesPage'
import type { TrainingClass } from '../api/classApi'

// Mock SessionProvider
vi.mock('../auth/SessionProvider', () => ({
    useSession: () => ({
        request: vi.fn(),
        role: 'training_manager',
        roles: ['training_manager'],
        permissions: ['course.manage', 'course.view'],
    }),
}))

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('SCRUM-224: Sinh thời khóa biểu tự động và Quản lý ngày nghỉ lễ', () => {
    const mockClasses: TrainingClass[] = [
        {
            id: 'cls-1',
            class_code: 'L01-SCRUM224',
            program_id: 'prog-1',
            program_code: 'PROG01',
            program_name: 'Lập trình Python Web',
            expected_start_date: '2026-11-01',
            max_capacity: 30,
            learning_mode: 'offline',
            status: 'preparing',
            status_label: 'Chuẩn bị',
            created_at: '2026-10-01T00:00:00Z',
            updated_at: '2026-10-01T00:00:00Z',
            enrolled_count: 5,
        },
    ]

    beforeEach(() => {
        vi.clearAllMocks()
    })

    const makeMockResponse = (data: any, status = 200, ok = true) =>
        ({
            ok,
            status,
            json: async () => data,
        } as unknown as Response)

    it('hiển thị nút "Thời khóa biểu" trên dòng lớp học và nút "🏖️ Ngày nghỉ lễ" trên header', () => {
        const customRequest = vi.fn().mockImplementation(() =>
            Promise.resolve(makeMockResponse({ status: 'success', data: [] }))
        )

        render(
            <ClassesPage
                initialClasses={mockClasses}
                initialTotal={1}
                customRequest={customRequest}
                canManageOverride={true}
            />
        )

        // Nút mở quản lý ngày nghỉ lễ trên header
        expect(screen.getByTestId('open-holidays-btn')).toBeDefined()

        // Nút xem thời khóa biểu trên hàng lớp
        expect(screen.getByTestId('schedule-class-cls-1')).toBeDefined()
    })

    it('bấm "Thời khóa biểu" mở modal và cho phép xem trước thời khóa biểu sinh tự động', async () => {
        const customRequest = vi.fn().mockImplementation((path: string, options?: any) => {
            // Lấy danh sách môn học
            if (path.includes('/subjects')) {
                return Promise.resolve(
                    makeMockResponse({
                        status: 'success',
                        data: [
                            {
                                id: 'cs-1',
                                class_id: 'cls-1',
                                subject_id: 'sub-1',
                                subject_code: 'PY01',
                                subject_name: 'Python Cơ bản',
                                credits: 3,
                                is_mandatory: true,
                                order_index: 1,
                                created_at: null,
                            },
                        ],
                    })
                )
            }
            // Lấy lịch hiện có
            if (path.endsWith('/schedules') && options?.method !== 'POST') {
                return Promise.resolve(
                    makeMockResponse({
                        status: 'success',
                        data: {
                            class_id: 'cls-1',
                            class_code: 'L01-SCRUM224',
                            total: 0,
                            schedules: [],
                        },
                    })
                )
            }
            // Xem trước lịch (Preview)
            if (path.includes('/schedules/preview')) {
                return Promise.resolve(
                    makeMockResponse({
                        status: 'success',
                        data: {
                            class_id: 'cls-1',
                            class_code: 'L01-SCRUM224',
                            total_requested: 3,
                            total_generated: 3,
                            start_date: '2026-11-18',
                            end_date: '2026-11-25',
                            schedules: [
                                {
                                    session_number: 1,
                                    learning_date: '2026-11-18',
                                    day_of_week: 'Thứ 4',
                                    shift: 'Ca 1 (07:30 - 09:30)',
                                    start_time: '07:30:00',
                                    end_time: '09:30:00',
                                    topic: 'Buổi 1: Giới thiệu Python',
                                },
                                {
                                    session_number: 2,
                                    learning_date: '2026-11-23',
                                    day_of_week: 'Thứ 2',
                                    shift: 'Ca 1 (07:30 - 09:30)',
                                    start_time: '07:30:00',
                                    end_time: '09:30:00',
                                    topic: 'Buổi 2: Biến và Kiểu dữ liệu',
                                },
                                {
                                    session_number: 3,
                                    learning_date: '2026-11-25',
                                    day_of_week: 'Thứ 4',
                                    shift: 'Ca 1 (07:30 - 09:30)',
                                    start_time: '07:30:00',
                                    end_time: '09:30:00',
                                    topic: 'Buổi 3: Cấu trúc điều khiển',
                                },
                            ],
                            skipped_holidays: [
                                {
                                    date: '2026-11-20',
                                    holiday_name: 'Ngày Nhà giáo Việt Nam',
                                    day_of_week: 'Thứ 6',
                                    reason: 'Nghỉ lễ: Ngày Nhà giáo Việt Nam',
                                },
                            ],
                        },
                    })
                )
            }
            // Mặc định
            return Promise.resolve(makeMockResponse({ status: 'success', data: [] }))
        })

        render(
            <ClassesPage
                initialClasses={mockClasses}
                initialTotal={1}
                customRequest={customRequest}
                canManageOverride={true}
            />
        )

        // Bấm nút Thời khóa biểu
        fireEvent.click(screen.getByTestId('schedule-class-cls-1'))

        // Đợi modal hiển thị
        await waitFor(() => {
            expect(screen.getByTestId('schedule-modal')).toBeDefined()
        })

        // Chuyển sang tab sinh lịch (hoặc tự động chuyển nếu chưa có lịch)
        expect(screen.getByTestId('tab-generate-schedule')).toBeDefined()
        fireEvent.click(screen.getByTestId('tab-generate-schedule'))

        // Bấm nút Xem trước thời khóa biểu
        const previewBtn = screen.getByTestId('btn-preview-schedule')
        fireEvent.click(previewBtn)

        // Kết quả xem trước hiển thị đủ số buổi và banner ngày nghỉ đã bỏ qua
        await waitFor(() => {
            expect(screen.getByTestId('preview-results-card')).toBeDefined()
            expect(screen.getByTestId('skipped-holidays-banner')).toBeDefined()
            expect(screen.getByText(/Ngày Nhà giáo Việt Nam/)).toBeDefined()
            expect(screen.getByText('Buổi 1: Giới thiệu Python')).toBeDefined()
        })
    })

    it('bấm "Xác nhận lưu lịch học chính thức" gửi yêu cầu lưu và chuyển về danh sách lịch', async () => {
        const customRequest = vi.fn().mockImplementation((path: string, options?: any) => {
            if (path.includes('/subjects')) {
                return Promise.resolve(makeMockResponse({ status: 'success', data: [] }))
            }
            if (path.endsWith('/schedules') && options?.method !== 'POST') {
                return Promise.resolve(
                    makeMockResponse({
                        status: 'success',
                        data: { class_id: 'cls-1', schedules: [] },
                    })
                )
            }
            if (path.includes('/schedules/preview')) {
                return Promise.resolve(
                    makeMockResponse({
                        status: 'success',
                        data: {
                            class_id: 'cls-1',
                            class_code: 'L01-SCRUM224',
                            total_generated: 1,
                            schedules: [
                                {
                                    session_number: 1,
                                    learning_date: '2026-11-18',
                                    day_of_week: 'Thứ 4',
                                    shift: 'Ca 1 (07:30 - 09:30)',
                                    start_time: '07:30:00',
                                    end_time: '09:30:00',
                                    topic: 'Buổi 1',
                                },
                            ],
                            skipped_holidays: [],
                        },
                    })
                )
            }
            if (path.includes('/schedules/generate')) {
                return Promise.resolve(
                    makeMockResponse({
                        status: 'success',
                        data: {
                            class_id: 'cls-1',
                            class_code: 'L01-SCRUM224',
                            total_saved: 1,
                            schedules: [
                                {
                                    id: 'sched-1',
                                    class_id: 'cls-1',
                                    session_number: 1,
                                    learning_date: '2026-11-18',
                                    start_time: '07:30:00',
                                    end_time: '09:30:00',
                                    topic: 'Buổi 1',
                                    status: 'scheduled',
                                },
                            ],
                            skipped_holidays: [],
                        },
                    })
                )
            }
            return Promise.resolve(makeMockResponse({ status: 'success', data: [] }))
        })

        render(
            <ClassesPage
                initialClasses={mockClasses}
                initialTotal={1}
                customRequest={customRequest}
                canManageOverride={true}
            />
        )

        fireEvent.click(screen.getByTestId('schedule-class-cls-1'))

        await waitFor(() => {
            expect(screen.getByTestId('schedule-modal')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-preview-schedule'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-confirm-save-schedule')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-confirm-save-schedule'))

        await waitFor(() => {
            expect(screen.getByTestId('schedule-success-alert')).toBeDefined()
            expect(screen.getByText(/Đã lưu thành công 1 buổi học vào thời khóa biểu!/)).toBeDefined()
        })
    })

    it('bấm "🏖️ Ngày nghỉ lễ" mở modal quản lý ngày nghỉ', async () => {
        const customRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/holidays')) {
                return Promise.resolve(
                    makeMockResponse({
                        status: 'success',
                        data: [
                            {
                                id: 'h-1',
                                holiday_date: '2026-11-20',
                                name: 'Ngày Nhà giáo Việt Nam',
                                description: 'Kỷ niệm 20/11',
                            },
                        ],
                    })
                )
            }
            return Promise.resolve(makeMockResponse({ status: 'success', data: [] }))
        })

        render(
            <ClassesPage
                initialClasses={mockClasses}
                initialTotal={1}
                customRequest={customRequest}
                canManageOverride={true}
            />
        )

        fireEvent.click(screen.getByTestId('open-holidays-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('holidays-modal')).toBeDefined()
            expect(screen.getByText('Ngày Nhà giáo Việt Nam')).toBeDefined()
        })
    })
})
