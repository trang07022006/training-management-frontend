// @vitest-environment jsdom
/**
 * Automated Tests cho SCRUM-225 Frontend:
 * - AC 1: Chọn giảng viên phụ trách và phòng học khi sinh thời khóa biểu.
 * - AC 2: Giao diện cảnh báo xung đột lịch chi tiết (trùng GV / trùng Phòng với lớp khác hoặc nội bộ).
 * - AC 3: Chặn lưu khi phát hiện xung đột và cho phép Quản lý đào tạo xác nhận ghi đè để lưu.
 */

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ScheduleGenerationModal } from '../components/ScheduleGenerationModal'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('SCRUM-225: Cảnh báo và xử lý xung đột thời khóa biểu', () => {
    const mockClass = {
        id: 'cls-test-225',
        class_code: 'L02-SCRUM225',
        expected_start_date: '2026-11-02',
    }

    const mockConflicts = [
        {
            conflict_type: 'instructor',
            session_number: 1,
            learning_date: '2026-11-02',
            start_time: '07:30:00',
            end_time: '09:30:00',
            instructor_id: 'inst-101',
            instructor_name: 'TS. Nguyễn Văn A',
            conflicting_class_code: 'L01-JAVA',
            conflicting_session_number: 5,
            message: 'Giảng viên TS. Nguyễn Văn A đã có lịch dạy lớp L01-JAVA (Buổi #5) vào khung giờ 07:30 - 09:30.',
        },
        {
            conflict_type: 'room',
            session_number: 2,
            learning_date: '2026-11-04',
            start_time: '07:30:00',
            end_time: '09:30:00',
            room_id: 'P201',
            conflicting_class_code: 'L03-REACT',
            conflicting_session_number: 3,
            message: 'Phòng học P201 đã được sử dụng bởi lớp L03-REACT (Buổi #3) vào khung giờ 07:30 - 09:30.',
        },
    ]

    const makeMockResponse = (data: any, status = 200, ok = true) =>
        ({
            ok,
            status,
            json: async () => data,
        } as unknown as Response)

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('AC 1 & AC 2: Xem trước phát hiện trùng lịch và hiển thị cảnh báo chi tiết theo GV và Phòng học', async () => {
        const customRequest = vi.fn().mockImplementation((path: string, options?: any) => {
            if (path.includes('/subjects')) {
                return Promise.resolve(makeMockResponse({ status: 'success', data: [] }))
            }
            if (path.includes('/schedules') && options?.method === 'GET') {
                return Promise.resolve(makeMockResponse({ status: 'success', data: { schedules: [] } }))
            }
            if (path.includes('/users')) {
                return Promise.resolve(
                    makeMockResponse({
                        status: 'success',
                        data: {
                            items: [
                                { id: 'inst-101', name: 'TS. Nguyễn Văn A', email: 'nguyenvana@ictu.vn', role: 'teacher' },
                            ],
                        },
                    })
                )
            }
            if (path.includes('/schedules/preview') && options?.method === 'POST') {
                return Promise.resolve(
                    makeMockResponse({
                        status: 'success',
                        data: {
                            class_id: mockClass.id,
                            class_code: mockClass.class_code,
                            schedules: [
                                {
                                    session_number: 1,
                                    learning_date: '2026-11-02',
                                    day_of_week: 'Thứ 2',
                                    shift: 'Ca 1',
                                    start_time: '07:30',
                                    end_time: '09:30',
                                    topic: 'Bài 1: Giới thiệu',
                                },
                                {
                                    session_number: 2,
                                    learning_date: '2026-11-04',
                                    day_of_week: 'Thứ 4',
                                    shift: 'Ca 1',
                                    start_time: '07:30',
                                    end_time: '09:30',
                                    topic: 'Bài 2: Cài đặt môi trường',
                                },
                            ],
                            skipped_holidays: [],
                            has_conflicts: true,
                            conflicts: mockConflicts,
                        },
                    })
                )
            }
            return Promise.resolve(makeMockResponse({ status: 'success', data: {} }))
        })

        render(
            <ScheduleGenerationModal
                classItem={mockClass}
                requestFn={customRequest}
                canManage={true}
                onClose={vi.fn()}
            />
        )

        // Chờ tab generate hiển thị (vì lớp chưa có lịch)
        await waitFor(() => {
            expect(screen.getByTestId('schedule-instructor-select')).toBeDefined()
        })

        // Kiểm tra AC 1: Các trường Giảng viên và Phòng học có mặt
        const instructorSelect = screen.getByTestId('schedule-instructor-select') as HTMLSelectElement
        const roomInput = screen.getByTestId('schedule-room-input') as HTMLInputElement
        expect(instructorSelect).toBeDefined()
        expect(roomInput).toBeDefined()

        // Điền thông tin
        fireEvent.change(instructorSelect, { target: { value: 'inst-101' } })
        fireEvent.change(roomInput, { target: { value: 'P201' } })

        // Bấm xem trước
        const previewBtn = screen.getByTestId('btn-preview-schedule')
        fireEvent.click(previewBtn)

        // Chờ bảng kết quả xem trước
        await waitFor(() => {
            expect(screen.getByTestId('schedule-conflicts-card')).toBeDefined()
        })

        // Kiểm tra AC 2: Hiển thị rõ danh sách xung đột (Trùng GV và Trùng Phòng)
        expect(screen.getByText(/⚠️ CẢNH BÁO XUNG ĐỘT \(2 BUỔI\)/i)).toBeDefined()
        expect(screen.getByText(/👨‍🏫 Trùng Giảng Viên/i)).toBeDefined()
        expect(screen.getByText(/🏫 Trùng Phòng Học/i)).toBeDefined()
        expect(screen.getByText(/L01-JAVA/i)).toBeDefined()
        expect(screen.getByText(/L03-REACT/i)).toBeDefined()

        // Kiểm tra AC 3: Nút lưu bị chặn
        const saveBtn = screen.getByTestId('btn-confirm-save-schedule') as HTMLButtonElement
        expect(saveBtn.disabled).toBe(true)
        expect(saveBtn.textContent).toContain('Chặn lưu do xung đột lịch')
    })

    it('AC 3: Cho phép Quản lý đào tạo tích chọn ghi đè và xác nhận lưu thời khóa biểu', async () => {
        let sentGeneratePayload: any = null

        const customRequest = vi.fn().mockImplementation((path: string, options?: any) => {
            if (path.includes('/subjects')) {
                return Promise.resolve(makeMockResponse({ status: 'success', data: [] }))
            }
            if (path.includes('/schedules') && options?.method === 'GET') {
                return Promise.resolve(makeMockResponse({ status: 'success', data: { schedules: [] } }))
            }
            if (path.includes('/users')) {
                return Promise.resolve(
                    makeMockResponse({
                        status: 'success',
                        data: { items: [{ id: 'inst-101', name: 'TS. Nguyễn Văn A', email: 'nguyenvana@ictu.vn', role: 'teacher' }] },
                    })
                )
            }
            if (path.includes('/schedules/preview') && options?.method === 'POST') {
                return Promise.resolve(
                    makeMockResponse({
                        status: 'success',
                        data: {
                            class_id: mockClass.id,
                            class_code: mockClass.class_code,
                            schedules: [
                                {
                                    session_number: 1,
                                    learning_date: '2026-11-02',
                                    day_of_week: 'Thứ 2',
                                    shift: 'Ca 1',
                                    start_time: '07:30',
                                    end_time: '09:30',
                                    topic: 'Bài 1: Giới thiệu',
                                },
                            ],
                            skipped_holidays: [],
                            has_conflicts: true,
                            conflicts: [mockConflicts[0]],
                        },
                    })
                )
            }
            if (path.includes('/schedules/generate') && options?.method === 'POST') {
                sentGeneratePayload = JSON.parse(options.body)
                return Promise.resolve(
                    makeMockResponse({
                        status: 'success',
                        data: {
                            class_id: mockClass.id,
                            class_code: mockClass.class_code,
                            total_saved: 1,
                            overridden_conflicts_count: 1,
                            schedules: [
                                {
                                    id: 'sched-saved-1',
                                    session_number: 1,
                                    learning_date: '2026-11-02',
                                    day_of_week: 'Thứ 2',
                                    shift: 'Ca 1',
                                    start_time: '07:30',
                                    end_time: '09:30',
                                    topic: 'Bài 1: Giới thiệu',
                                    instructor_id: 'inst-101',
                                    room_id: 'P201',
                                    status: 'scheduled',
                                },
                            ],
                        },
                    })
                )
            }
            return Promise.resolve(makeMockResponse({ status: 'success', data: {} }))
        })

        const onSuccessMock = vi.fn()

        render(
            <ScheduleGenerationModal
                classItem={mockClass}
                requestFn={customRequest}
                canManage={true}
                onClose={vi.fn()}
                onSuccess={onSuccessMock}
            />
        )

        // Chờ modal sẵn sàng
        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-schedule')).toBeDefined()
        })

        // Bấm xem trước
        fireEvent.click(screen.getByTestId('btn-preview-schedule'))

        // Chờ hiển thị cảnh báo xung đột
        await waitFor(() => {
            expect(screen.getByTestId('schedule-conflict-override-checkbox')).toBeDefined()
        })

        const saveBtn = screen.getByTestId('btn-confirm-save-schedule') as HTMLButtonElement
        expect(saveBtn.disabled).toBe(true)

        // Tích chọn checkbox xác nhận ghi đè
        const overrideCheckbox = screen.getByTestId('schedule-conflict-override-checkbox') as HTMLInputElement
        fireEvent.click(overrideCheckbox)
        expect(overrideCheckbox.checked).toBe(true)

        // Nút lưu được mở khóa
        expect(saveBtn.disabled).toBe(false)
        expect(saveBtn.textContent).toContain('Xác nhận ghi đè & Lưu lịch học')

        // Bấm lưu
        fireEvent.click(saveBtn)

        // Kiểm tra request gửi đi có cờ allow_conflict_override = true
        await waitFor(() => {
            expect(sentGeneratePayload).not.toBeNull()
            expect(sentGeneratePayload.allow_conflict_override).toBe(true)
            expect(screen.getByTestId('schedule-success-alert')).toBeDefined()
            expect(onSuccessMock).toHaveBeenCalled()
        })
    })

    it('Xử lý khi backend trả về lỗi 409 SCHEDULE_CONFLICT_DETECTED', async () => {
        const customRequest = vi.fn().mockImplementation((path: string, options?: any) => {
            if (path.includes('/subjects')) {
                return Promise.resolve(makeMockResponse({ status: 'success', data: [] }))
            }
            if (path.includes('/schedules') && options?.method === 'GET') {
                return Promise.resolve(makeMockResponse({ status: 'success', data: { schedules: [] } }))
            }
            if (path.includes('/users')) {
                return Promise.resolve(makeMockResponse({ status: 'success', data: { items: [] } }))
            }
            if (path.includes('/schedules/preview') && options?.method === 'POST') {
                return Promise.resolve(
                    makeMockResponse({
                        status: 'success',
                        data: {
                            class_id: mockClass.id,
                            class_code: mockClass.class_code,
                            schedules: [
                                {
                                    session_number: 1,
                                    learning_date: '2026-11-02',
                                    day_of_week: 'Thứ 2',
                                    shift: 'Ca 1',
                                    start_time: '07:30',
                                    end_time: '09:30',
                                    topic: 'Bài 1: Giới thiệu',
                                },
                            ],
                            skipped_holidays: [],
                            has_conflicts: false,
                        },
                    })
                )
            }
            if (path.includes('/schedules/generate') && options?.method === 'POST') {
                return Promise.resolve(
                    makeMockResponse(
                        {
                            code: 'SCHEDULE_CONFLICT_DETECTED',
                            message: 'Phát hiện xung đột lịch giảng viên hoặc phòng học.',
                            data: {
                                conflicts: [mockConflicts[0]],
                            },
                        },
                        409,
                        false
                    )
                )
            }
            return Promise.resolve(makeMockResponse({ status: 'success', data: {} }))
        })

        render(
            <ScheduleGenerationModal
                classItem={mockClass}
                requestFn={customRequest}
                canManage={true}
                onClose={vi.fn()}
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-schedule')).toBeDefined()
        })

        // Xem trước (giả sử preview chưa thấy xung đột)
        fireEvent.click(screen.getByTestId('btn-preview-schedule'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-confirm-save-schedule')).toBeDefined()
        })

        // Bấm lưu
        fireEvent.click(screen.getByTestId('btn-confirm-save-schedule'))

        // Backend báo lỗi 409 -> frontend bắt được và hiển thị cảnh báo
        await waitFor(() => {
            expect(screen.getByTestId('schedule-error-alert')).toBeDefined()
            expect(screen.getByTestId('schedule-conflicts-card')).toBeDefined()
        })
    })
})
