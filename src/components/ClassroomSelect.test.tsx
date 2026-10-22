// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { ClassroomSelect } from './ClassroomSelect'
import type { Classroom, ClassroomListResponse } from '../api/classroomApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const mockRoomsPage1: Classroom[] = [
    {
        id: 'room-01',
        room_code: 'UAT-P20',
        room_name: 'Phòng Lab 20',
        room_type: 'physical',
        capacity: 20,
        online_link: null,
        status: 'active',
        created_at: '2026-10-16T00:00:00Z',
        updated_at: '2026-10-16T00:00:00Z',
    },
    {
        id: 'room-02',
        room_code: 'ONL-MEET',
        room_name: 'Họp Google Meet',
        room_type: 'online',
        capacity: null,
        online_link: 'https://meet.google.com/ictu-test',
        status: 'active',
        created_at: '2026-10-16T00:00:00Z',
        updated_at: '2026-10-16T00:00:00Z',
    },
]

const mockRoomOutsidePage1: Classroom = {
    id: 'room-99',
    room_code: 'AUD-500',
    room_name: 'Hội Trường Lớn',
    room_type: 'physical',
    capacity: 500,
    online_link: null,
    status: 'active',
    created_at: '2026-10-16T00:00:00Z',
    updated_at: '2026-10-16T00:00:00Z',
}

describe('SCRUM-229: ClassroomSelect Component Tests', () => {
    it('1. Pre-selects current physical and online rooms with standard labels', async () => {
        const mockRequest = vi.fn().mockImplementation(async (url: string) => {
            if (url.includes('/api/v1/rooms')) {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: {
                            items: mockRoomsPage1,
                            total: 2,
                            page: 1,
                            page_size: 20,
                        } as ClassroomListResponse,
                    }),
                }
            }
            return { ok: false, json: async () => ({}) }
        })

        // Test Physical Room
        const { rerender } = render(
            <ClassroomSelect
                value="room-01"
                onChange={vi.fn()}
                customRequest={mockRequest as any}
            />
        )

        await waitFor(() => {
            expect(screen.getByText(/UAT-P20 – Phòng Lab 20 – 20 chỗ/i)).toBeDefined()
        })

        // Test Online Room
        rerender(
            <ClassroomSelect
                value="room-02"
                onChange={vi.fn()}
                customRequest={mockRequest as any}
            />
        )

        await waitFor(() => {
            expect(screen.getByText(/ONL-MEET – Họp Google Meet – Trực tuyến/i)).toBeDefined()
        })
    })

    it('2. Resolves room via detail endpoint when outside first 20 results (pagination)', async () => {
        const mockRequest = vi.fn().mockImplementation(async (url: string) => {
            if (url.startsWith('/api/v1/rooms/room-99')) {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: mockRoomOutsidePage1,
                    }),
                }
            }
            if (url.includes('/api/v1/rooms')) {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: {
                            items: mockRoomsPage1, // Does not contain room-99
                            total: 25,
                            page: 1,
                            page_size: 20,
                        },
                    }),
                }
            }
            return { ok: false, json: async () => ({}) }
        })

        render(
            <ClassroomSelect
                value="room-99"
                onChange={vi.fn()}
                customRequest={mockRequest as any}
            />
        )

        await waitFor(() => {
            expect(screen.getByText(/AUD-500 – Hội Trường Lớn – 500 chỗ/i)).toBeDefined()
        })
    })

    it('3. Fault tolerance: Does not reset room when API fetch fails, shows error and retry button', async () => {
        let shouldFail = true
        const mockRequest = vi.fn().mockImplementation(async (url: string) => {
            if (url.startsWith('/api/v1/rooms/room-01')) {
                return {
                    ok: true,
                    json: async () => ({ status: 'success', data: mockRoomsPage1[0] }),
                }
            }
            if (url.includes('/api/v1/rooms')) {
                if (shouldFail) {
                    return {
                        ok: false,
                        status: 500,
                        json: async () => ({ status: 'error', message: 'Lỗi máy chủ kết nối danh mục phòng' }),
                    }
                }
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: { items: mockRoomsPage1, total: 2, page: 1, page_size: 20 },
                    }),
                }
            }
            return { ok: false, json: async () => ({}) }
        })

        render(
            <ClassroomSelect
                value="room-01"
                initialRoomName="Phòng Lab 20"
                onChange={vi.fn()}
                customRequest={mockRequest as any}
            />
        )

        // Room selection remains intact despite list failure
        await waitFor(() => {
            expect(screen.getByText(/UAT-P20|Phòng Lab 20/i)).toBeDefined()
        })

        // Open dropdown to see error
        fireEvent.click(screen.getByRole('combobox'))

        await waitFor(() => {
            expect(screen.getByTestId('classroom-error')).toBeDefined()
            expect(screen.getByText(/Không thể tải danh mục phòng học/i)).toBeDefined()
        })

        // Click retry
        shouldFail = false
        fireEvent.click(screen.getByText('Thử lại'))

        await waitFor(() => {
            expect(screen.getByTestId('classroom-option-UAT-P20')).toBeDefined()
        })
    })

    it('4. Supports load more when total exceeds current loaded items', async () => {
        const mockPage2Rooms: Classroom[] = [
            {
                id: 'room-03',
                room_code: 'LAB-03',
                room_name: 'Phòng Thực Hành 03',
                room_type: 'physical',
                capacity: 35,
                online_link: null,
                status: 'active',
                created_at: '2026-10-16T00:00:00Z',
                updated_at: '2026-10-16T00:00:00Z',
            },
        ]

        const mockRequest = vi.fn().mockImplementation(async (url: string) => {
            if (url.includes('page=2')) {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: {
                            items: mockPage2Rooms,
                            total: 3,
                            page: 2,
                            page_size: 2,
                        },
                    }),
                }
            }
            return {
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: mockRoomsPage1,
                        total: 3,
                        page: 1,
                        page_size: 2,
                    },
                }),
            }
        })

        render(
            <ClassroomSelect
                value={null}
                onChange={vi.fn()}
                customRequest={mockRequest as any}
            />
        )

        fireEvent.click(screen.getByRole('combobox'))

        await waitFor(() => {
            expect(screen.getByTestId('classroom-load-more-btn')).toBeDefined()
            expect(screen.getByText(/Tải thêm phòng học \(2\/3\)/i)).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('classroom-load-more-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('classroom-option-LAB-03')).toBeDefined()
        })
    })

    it('5. Option "Chưa xếp phòng" sends null and clear button clears selection', async () => {
        const handleChange = vi.fn()
        const mockRequest = vi.fn().mockImplementation(async () => ({
            ok: true,
            json: async () => ({
                status: 'success',
                data: { items: mockRoomsPage1, total: 2, page: 1, page_size: 20 },
            }),
        }))

        render(
            <ClassroomSelect
                value="room-01"
                onChange={handleChange}
                customRequest={mockRequest as any}
            />
        )

        // Test clear button (✕)
        await waitFor(() => {
            expect(screen.getByTestId('classroom-clear-btn')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('classroom-clear-btn'))
        expect(handleChange).toHaveBeenCalledWith(null, null)

        // Test selecting "-- Chưa xếp phòng --" option
        fireEvent.click(screen.getByRole('combobox'))
        await waitFor(() => {
            expect(screen.getByTestId('classroom-option-unassigned')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('classroom-option-unassigned'))
        expect(handleChange).toHaveBeenCalledWith(null, null)
    })

    it('6. Legacy room ("P301") displays old value with warning banner and is not silently deleted', async () => {
        const mockRequest = vi.fn().mockImplementation(async (url: string) => {
            if (url.startsWith('/api/v1/rooms/P301')) {
                return {
                    ok: false,
                    status: 404,
                    json: async () => ({ status: 'error', message: 'Phòng không tồn tại' }),
                }
            }
            return {
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { items: mockRoomsPage1, total: 2, page: 1, page_size: 20 },
                }),
            }
        })

        render(
            <ClassroomSelect
                value="P301"
                isLegacyRoom={true}
                initialRoomName="P301"
                onChange={vi.fn()}
                customRequest={mockRequest as any}
            />
        )

        await waitFor(() => {
            expect(screen.getByText(/P301 \(Dữ liệu cũ - Cần chọn lại\)/i)).toBeDefined()
            expect(screen.getByTestId('classroom-legacy-notice')).toBeDefined()
            expect(screen.getByText(/Dữ liệu phòng cũ: “P301”/i)).toBeDefined()
        })
    })

    it('7. Displays capacity warning when class size exceeds physical room capacity', async () => {
        const mockRequest = vi.fn().mockImplementation(async () => ({
            ok: true,
            json: async () => ({
                status: 'success',
                data: { items: mockRoomsPage1, total: 2, page: 1, page_size: 20 },
            }),
        }))

        render(
            <ClassroomSelect
                value="room-01" // Capacity: 20
                classSize={35}  // Class size: 35 > 20
                onChange={vi.fn()}
                customRequest={mockRequest as any}
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId('classroom-capacity-warning')).toBeDefined()
            expect(screen.getByText(/Sĩ số lớp \(35 học viên\) vượt quá sức chứa phòng \(20 chỗ\)/i)).toBeDefined()
        })
    })
})
