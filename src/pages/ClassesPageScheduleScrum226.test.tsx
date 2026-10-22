// @vitest-environment jsdom
/**
 * Automated Tests cho SCRUM-226 Frontend:
 * - AC 1: Dời buổi học đơn lẻ sang ngày/giờ/phòng/giảng viên mới.
 * - AC 2: Hủy buổi học đơn lẻ với lý do bắt buộc.
 * - AC 3: Tự động gửi thông báo đến học viên và giảng viên khi lịch thay đổi.
 * - AC 4: Chặn sửa/dời/hủy buổi học đã điểm danh.
 */

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ScheduleGenerationModal } from '../components/ScheduleGenerationModal'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('SCRUM-226: Sửa, dời hoặc hủy buổi học đơn lẻ', () => {
    const mockClass = {
        id: 'cls-test-226',
        class_code: 'L01-SCRUM226',
        expected_start_date: '2026-11-02',
    }

    const mockSchedules = [
        {
            id: 'sch-101',
            class_id: 'cls-test-226',
            session_number: 1,
            learning_date: '2026-11-02',
            day_of_week: 'Thứ 2',
            shift: 'Sáng',
            start_time: '07:30:00',
            end_time: '09:30:00',
            room_id: 'P101',
            instructor_id: 'inst-1',
            instructor_name: 'TS. Nguyễn Văn A',
            topic: 'Bài 1: Giới thiệu khóa học',
            status: 'scheduled',
            attendance_checked: false,
        },
        {
            id: 'sch-102',
            class_id: 'cls-test-226',
            session_number: 2,
            learning_date: '2026-11-04',
            day_of_week: 'Thứ 4',
            shift: 'Sáng',
            start_time: '07:30:00',
            end_time: '09:30:00',
            room_id: 'P101',
            instructor_id: 'inst-1',
            instructor_name: 'TS. Nguyễn Văn A',
            topic: 'Bài 2: Kiến trúc phần mềm',
            status: 'scheduled',
            attendance_checked: true, // Buổi này đã điểm danh
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

    it('hiển thị danh sách lịch học, nút Dời/Sửa cho buổi chưa điểm danh và badge khóa cho buổi đã điểm danh (AC 4)', async () => {
        const mockRequestFn = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/schedules') && !path.includes('/cancel')) {
                return Promise.resolve(makeMockResponse({ code: 'SUCCESS', data: { schedules: mockSchedules } }))
            }
            if (path.includes('/classrooms')) {
                return Promise.resolve(makeMockResponse({ data: [] }))
            }
            if (path.includes('/instructors')) {
                return Promise.resolve(makeMockResponse({ data: [] }))
            }
            if (path.includes('/subjects')) {
                return Promise.resolve(makeMockResponse({ data: [] }))
            }
            return Promise.resolve(makeMockResponse({ data: [] }))
        })

        render(
            <ScheduleGenerationModal
                onClose={() => {}}
                classItem={mockClass}
                canManage={true}
                requestFn={mockRequestFn}
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId('schedules-list-table')).toBeDefined()
        })

        // Buổi 1 chưa điểm danh -> Có nút Dời/Sửa và Hủy
        expect(screen.getByTestId('btn-edit-schedule-1')).toBeDefined()
        expect(screen.getByTestId('btn-cancel-schedule-1')).toBeDefined()

        // Buổi 2 đã điểm danh -> Hiển thị badge khóa (AC 4)
        expect(screen.getByText('🔒 Đã điểm danh')).toBeDefined()
        expect(screen.queryByTestId('btn-edit-schedule-2')).toBeNull()
        expect(screen.queryByTestId('btn-cancel-schedule-2')).toBeNull()
    })

    it('cho phép dời ngày, giờ, phòng của buổi học và hiển thị thông báo đã gửi cho học viên & giảng viên (AC 1, AC 3)', async () => {
        const mockRequestFn = vi.fn().mockImplementation((path: string, options?: RequestInit) => {
            if (options?.method === 'PUT') {
                return Promise.resolve(
                    makeMockResponse({
                        code: 'SUCCESS',
                        message: 'Cập nhật thành công',
                        data: {
                            schedule: {
                                ...mockSchedules[0],
                                learning_date: '2026-11-09',
                                status: 'rescheduled',
                            },
                            notifications_sent: 25,
                        },
                    })
                )
            }
            if (path.includes('/schedules')) {
                return Promise.resolve(makeMockResponse({ code: 'SUCCESS', data: { schedules: mockSchedules } }))
            }
            return Promise.resolve(makeMockResponse({ data: [] }))
        })

        render(
            <ScheduleGenerationModal
                onClose={() => {}}
                classItem={mockClass}
                canManage={true}
                requestFn={mockRequestFn}
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-edit-schedule-1')).toBeDefined()
        })

        // Mở modal dời/sửa buổi học
        fireEvent.click(screen.getByTestId('btn-edit-schedule-1'))

        expect(screen.getByTestId('edit-schedule-modal')).toBeDefined()

        // Đổi ngày học mới
        const dateInput = screen.getByTestId('edit-date-input') as HTMLInputElement
        fireEvent.change(dateInput, { target: { value: '2026-11-09' } })

        // Nhấn Lưu thay đổi
        fireEvent.click(screen.getByTestId('btn-save-edit-schedule'))

        await waitFor(() => {
            expect(mockRequestFn).toHaveBeenCalledWith(
                expect.stringContaining('/schedules/sch-101'),
                expect.objectContaining({
                    method: 'PUT',
                })
            )
            expect(screen.getByTestId('schedule-success-alert')).toBeDefined()
            expect(screen.getByText(/25 học viên & giảng viên/)).toBeDefined()
        })
    })

    it('bắt buộc nhập lý do khi hủy buổi học và gửi thông báo thành công (AC 2, AC 3)', async () => {
        const mockRequestFn = vi.fn().mockImplementation((path: string, options?: RequestInit) => {
            if (options?.method === 'POST' && path.includes('/cancel')) {
                return Promise.resolve(
                    makeMockResponse({
                        code: 'SUCCESS',
                        message: 'Hủy thành công',
                        data: {
                            schedule: {
                                ...mockSchedules[0],
                                status: 'cancelled',
                                cancellation_reason: 'Giảng viên bận đột xuất',
                            },
                            notifications_sent: 25,
                        },
                    })
                )
            }
            if (path.includes('/schedules')) {
                return Promise.resolve(makeMockResponse({ code: 'SUCCESS', data: { schedules: mockSchedules } }))
            }
            return Promise.resolve(makeMockResponse({ data: [] }))
        })

        render(
            <ScheduleGenerationModal
                onClose={() => {}}
                classItem={mockClass}
                canManage={true}
                requestFn={mockRequestFn}
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-cancel-schedule-1')).toBeDefined()
        })

        // Bấm nút Hủy buổi học
        fireEvent.click(screen.getByTestId('btn-cancel-schedule-1'))

        expect(screen.getByTestId('cancel-schedule-modal')).toBeDefined()

        // Bấm xác nhận khi chưa nhập lý do -> Bị chặn
        fireEvent.click(screen.getByTestId('btn-confirm-cancel-schedule'))

        expect(screen.getByText(/Lý do hủy buổi học là bắt buộc/)).toBeDefined()
        expect(mockRequestFn).not.toHaveBeenCalledWith(
            expect.stringContaining('/cancel'),
            expect.anything()
        )

        // Nhập lý do hủy hợp lệ
        const reasonInput = screen.getByTestId('cancel-reason-input')
        fireEvent.change(reasonInput, { target: { value: 'Giảng viên bận đột xuất' } })

        // Bấm xác nhận hủy lại
        fireEvent.click(screen.getByTestId('btn-confirm-cancel-schedule'))

        await waitFor(() => {
            expect(mockRequestFn).toHaveBeenCalledWith(
                expect.stringContaining('/cancel'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ reason: 'Giảng viên bận đột xuất' }),
                })
            )
            expect(screen.getByTestId('schedule-success-alert')).toBeDefined()
        })
    })

    it('hiển thị cảnh báo xung đột khi dời lịch và cho phép chọn ghi đè xung đột (SCRUM-225 + SCRUM-226)', async () => {
        let callCount = 0
        const mockRequestFn = vi.fn().mockImplementation((path: string, options?: RequestInit) => {
            if (options?.method === 'PUT') {
                callCount++
                if (callCount === 1) {
                    // Lần đầu: API trả lỗi xung đột 409
                    return Promise.resolve(
                        makeMockResponse(
                            {
                                code: 'SCHEDULE_CONFLICT_DETECTED',
                                message: 'Phát hiện xung đột lịch giảng viên',
                                data: {
                                    conflicts: [
                                        {
                                            conflict_type: 'instructor',
                                            type: 'instructor',
                                            message: 'Giảng viên TS. Nguyễn Văn A đã có lịch dạy lớp khác',
                                        },
                                    ],
                                },
                            },
                            409,
                            false
                        )
                    )
                }
                // Lần 2: Có allow_conflict_override -> Lưu thành công
                return Promise.resolve(
                    makeMockResponse({
                        code: 'SUCCESS',
                        data: {
                            schedule: { ...mockSchedules[0], learning_date: '2026-11-09' },
                            notifications_sent: 25,
                        },
                    })
                )
            }
            if (path.includes('/schedules')) {
                return Promise.resolve(makeMockResponse({ code: 'SUCCESS', data: { schedules: mockSchedules } }))
            }
            return Promise.resolve(makeMockResponse({ data: [] }))
        })

        render(
            <ScheduleGenerationModal
                onClose={() => {}}
                classItem={mockClass}
                canManage={true}
                requestFn={mockRequestFn}
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-edit-schedule-1')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-edit-schedule-1'))
        fireEvent.click(screen.getByTestId('btn-save-edit-schedule'))

        // Hiển thị cảnh báo xung đột và checkbox ghi đè
        await waitFor(() => {
            expect(screen.getByTestId('edit-conflict-warning')).toBeDefined()
            expect(screen.getByTestId('edit-conflict-override-checkbox')).toBeDefined()
        })

        // Tick chọn xác nhận ghi đè
        fireEvent.click(screen.getByTestId('edit-conflict-override-checkbox'))

        // Lưu lại lần nữa
        fireEvent.click(screen.getByTestId('btn-save-edit-schedule'))

        await waitFor(() => {
            expect(mockRequestFn).toHaveBeenCalledWith(
                expect.stringContaining('/schedules/sch-101'),
                expect.objectContaining({
                    method: 'PUT',
                    body: expect.stringContaining('"allow_conflict_override":true'),
                })
            )
            expect(screen.getByTestId('schedule-success-alert')).toBeDefined()
        })
    })
})
