// @vitest-environment jsdom

import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { useEffect, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { ClassroomsPage } from './ClassroomsPage'
import type { Classroom } from '../api/classroomApi'
import type { TrainingClass } from '../api/classApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const sampleClass30: TrainingClass = {
    id: 'cls-30',
    class_code: 'CNTT-K21',
    program_id: 'prog-01',
    expected_start_date: null,
    max_capacity: 30,
    learning_mode: 'offline',
    status: 'in_progress',
    status_label: 'Đang học',
    enrolled_count: 0,
    created_at: '2026-10-13T08:00:00Z',
    updated_at: '2026-10-13T08:00:00Z',
}

const sampleRoom20: Classroom = {
    id: 'room-20',
    room_code: 'UAT-P20',
    room_name: 'Phòng 20 chỗ',
    room_type: 'physical',
    capacity: 20,
    online_link: null,
    status: 'active',
    created_at: '2026-10-13T08:00:00Z',
    updated_at: '2026-10-13T08:00:00Z',
}

const sampleRoom30: Classroom = {
    id: 'room-30',
    room_code: 'UAT-P30',
    room_name: 'Phòng 30 chỗ',
    room_type: 'physical',
    capacity: 30,
    online_link: null,
    status: 'active',
    created_at: '2026-10-13T08:00:00Z',
    updated_at: '2026-10-13T08:00:00Z',
}

const samplePhysicalRoom: Classroom = {
    id: 'room-phy-01',
    room_code: 'A2-201',
    room_name: 'Phòng học lý thuyết A2-201',
    room_type: 'physical',
    capacity: 40,
    online_link: null,
    status: 'active',
    created_at: '2026-10-13T08:00:00Z',
    updated_at: '2026-10-13T08:00:00Z',
}

const sampleOnlineRoom: Classroom = {
    id: 'room-onl-01',
    room_code: 'MEET-01',
    room_name: 'Phòng trực tuyến Google Meet 01',
    room_type: 'online',
    capacity: null,
    online_link: 'https://meet.google.com/abc-defg-hij',
    status: 'active',
    created_at: '2026-10-13T08:00:00Z',
    updated_at: '2026-10-13T08:00:00Z',
}

function RoleSessionWrapper({
    role = 'training_manager',
    permissions = ['course.view', 'course.manage'],
    children,
}: {
    role?: string | null
    permissions?: string[]
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()
    useEffect(() => {
        if (role !== undefined) {
            startSession(
                { accessToken: 'mock-token', refreshToken: 'mock-refresh' },
                role,
                'user-test-id',
                false,
                'Test User',
                'test@ictu.edu.vn',
                role ? [role] : [],
                permissions,
            )
        }
    }, [role, permissions, startSession])

    if (role !== undefined && !hasSession) {
        return <div>Initializing session...</div>
    }

    return <>{children}</>
}

function renderClassroomsPage(
    props?: React.ComponentProps<typeof ClassroomsPage>,
    role: string = 'training_manager',
) {
    return render(
        <MemoryRouter>
            <SessionProvider apiOrigin="http://localhost:5000">
                <RoleSessionWrapper role={role} permissions={['course.view', 'course.manage']}>
                    <ClassroomsPage {...props} />
                </RoleSessionWrapper>
            </SessionProvider>
        </MemoryRouter>,
    )
}

describe('SCRUM-221: Quản lý phòng học vật lý và trực tuyến (TC221-01 -> TC221-04)', () => {
    // =========================================================================
    // 221-01: KHAI BÁO PHÒNG VẬT LÝ / TRỰC TUYẾN (TC221-01 -> TC221-04)
    // =========================================================================

    it('TC221-01: Tạo phòng vật lý -> capacity lưu đúng (> 0)', async () => {
        const mockRequest = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
            if (url.includes('/api/v1/rooms') && init?.method === 'POST') {
                const body = JSON.parse(init.body as string)
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'success',
                            data: {
                                id: 'room-new-phy',
                                room_code: body.room_code,
                                room_name: body.room_name,
                                room_type: 'physical',
                                capacity: body.capacity,
                                online_link: null,
                                status: 'active',
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                            },
                        }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ status: 'success', data: { items: [], total: 0 } }),
            })
        })

        renderClassroomsPage({ customRequest: mockRequest, initialRooms: [] })

        // 1. Chờ render và mở modal khai báo phòng học
        const openBtn = await screen.findByTestId('open-create-room-modal-btn')
        fireEvent.click(openBtn)
        expect(await screen.findByTestId('create-room-modal')).toBeDefined()

        // 2. Điền thông tin phòng vật lý
        fireEvent.change(screen.getByTestId('input-room-code'), { target: { value: 'LAB-101' } })
        fireEvent.change(screen.getByTestId('input-room-name'), { target: { value: 'Phòng Lab Mạng' } })
        fireEvent.change(screen.getByTestId('select-room-type'), { target: { value: 'physical' } })
        fireEvent.change(screen.getByTestId('input-capacity'), { target: { value: '35' } })

        // 3. Submit
        fireEvent.click(screen.getByTestId('submit-room-btn'))

        // 4. Kiểm tra API call và hiển thị
        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/rooms',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        room_code: 'LAB-101',
                        room_name: 'Phòng Lab Mạng',
                        room_type: 'physical',
                        capacity: 35,
                        online_link: null,
                    }),
                }),
            )
        })

        // Bảng cập nhật hiển thị phòng mới
        await waitFor(() => {
            expect(screen.getByTestId('room-code-room-new-phy').textContent).toContain('LAB-101')
            expect(screen.getByTestId('room-capacity-room-new-phy').textContent).toContain('35 chỗ')
            expect(screen.getByTestId('room-type-badge-room-new-phy').textContent).toBe('Phòng vật lý')
        })
    })

    it('TC221-02: Reload/GET lại phòng vật lý -> phòng vẫn tồn tại và hiển thị đúng tiếng Việt', async () => {
        renderClassroomsPage({ initialRooms: [samplePhysicalRoom] })

        expect(await screen.findByTestId(`room-code-${samplePhysicalRoom.id}`)).toBeDefined()
        expect(screen.getByTestId(`room-code-${samplePhysicalRoom.id}`).textContent).toBe('A2-201')
        expect(screen.getByTestId(`room-name-${samplePhysicalRoom.id}`).textContent).toBe(samplePhysicalRoom.room_name)
        expect(screen.getByTestId(`room-type-badge-${samplePhysicalRoom.id}`).textContent).toBe('Phòng vật lý')
        expect(screen.getByTestId(`room-capacity-${samplePhysicalRoom.id}`).textContent).toBe('40 chỗ')
    })

    it('TC221-03: Tạo phòng trực tuyến với link -> lưu thành công', async () => {
        const mockRequest = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
            if (url.includes('/api/v1/rooms') && init?.method === 'POST') {
                const body = JSON.parse(init.body as string)
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'success',
                            data: {
                                id: 'room-new-onl',
                                room_code: body.room_code,
                                room_name: body.room_name,
                                room_type: 'online',
                                capacity: null,
                                online_link: body.online_link,
                                status: 'active',
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                            },
                        }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ status: 'success', data: { items: [], total: 0 } }),
            })
        })

        renderClassroomsPage({ customRequest: mockRequest, initialRooms: [] })

        const openBtn = await screen.findByTestId('open-create-room-modal-btn')
        fireEvent.click(openBtn)
        expect(await screen.findByTestId('create-room-modal')).toBeDefined()

        fireEvent.change(screen.getByTestId('input-room-code'), { target: { value: 'ZOOM-99' } })
        fireEvent.change(screen.getByTestId('input-room-name'), { target: { value: 'Phòng Zoom Khóa Học' } })
        fireEvent.change(screen.getByTestId('select-room-type'), { target: { value: 'online' } })

        // Input link xuất hiện thay cho capacity
        expect(screen.queryByTestId('input-capacity')).toBeNull()
        expect(screen.getByTestId('input-online-link')).toBeDefined()

        fireEvent.change(screen.getByTestId('input-online-link'), { target: { value: 'https://zoom.us/j/123456789' } })
        fireEvent.click(screen.getByTestId('submit-room-btn'))

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/rooms',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        room_code: 'ZOOM-99',
                        room_name: 'Phòng Zoom Khóa Học',
                        room_type: 'online',
                        capacity: null,
                        online_link: 'https://zoom.us/j/123456789',
                    }),
                }),
            )
        })

        await waitFor(() => {
            expect(screen.getByTestId('room-code-room-new-onl').textContent).toContain('ZOOM-99')
            expect(screen.getByTestId('room-type-badge-room-new-onl').textContent).toBe('Phòng trực tuyến')
            expect(screen.getByTestId('room-link-room-new-onl').getAttribute('href')).toBe('https://zoom.us/j/123456789')
        })
    })

    it('TC221-04: Reload/GET lại phòng trực tuyến -> link persist đúng', async () => {
        renderClassroomsPage({ initialRooms: [sampleOnlineRoom] })

        expect(await screen.findByTestId(`room-code-${sampleOnlineRoom.id}`)).toBeDefined()
        expect(screen.getByTestId(`room-code-${sampleOnlineRoom.id}`).textContent).toBe('MEET-01')
        expect(screen.getByTestId(`room-type-badge-${sampleOnlineRoom.id}`).textContent).toBe('Phòng trực tuyến')
        expect(screen.getByTestId(`room-link-${sampleOnlineRoom.id}`).textContent).toBe(sampleOnlineRoom.online_link)
        expect(screen.getByTestId(`room-link-${sampleOnlineRoom.id}`).getAttribute('href')).toBe(sampleOnlineRoom.online_link)
    })

    // =========================================================================
    // 221-02: CẢNH BÁO VƯỢT SỨC CHỨA (TC221-05 -> TC221-08)
    // =========================================================================

    it('TC221-05: Lớp <= sức chứa phòng -> không warning', async () => {
        renderClassroomsPage({
            initialRooms: [samplePhysicalRoom],
            activeCapacityWarning: {
                room_id: samplePhysicalRoom.id,
                room_code: samplePhysicalRoom.room_code,
                room_type: 'physical',
                room_capacity: 40,
                class_id: 'cls-01',
                class_code: 'CNTT-K21',
                class_size: 35,
                basis: 'CLASS_MAX_CAPACITY',
                is_exceeded: false,
                warning: false,
                warning_message: null,
            },
        })

        expect(await screen.findByTestId(`room-code-${samplePhysicalRoom.id}`)).toBeDefined()
        expect(screen.queryByTestId('room-capacity-warning-banner')).toBeNull()
    })

    it('TC221-06: Lớp > sức chứa phòng -> cảnh báo rõ ràng (non-blocking)', async () => {
        renderClassroomsPage({
            initialRooms: [samplePhysicalRoom],
            activeCapacityWarning: {
                room_id: samplePhysicalRoom.id,
                room_code: samplePhysicalRoom.room_code,
                room_type: 'physical',
                room_capacity: 20,
                class_id: 'cls-01',
                class_code: 'CNTT-K21',
                class_size: 30,
                basis: 'CLASS_MAX_CAPACITY',
                is_exceeded: true,
                warning: true,
                warning_message: 'Sĩ số lớp vượt sức chứa phòng. (Lớp: 30 học viên – Phòng: 20 chỗ)',
            },
        })

        const warningBanner = await screen.findByTestId('room-capacity-warning-banner')
        expect(warningBanner).toBeDefined()
        expect(screen.getByTestId('capacity-warning-text').textContent).toContain('Sĩ số lớp vượt sức chứa phòng.')
        expect(screen.getByTestId('capacity-warning-text').textContent).toContain('Lớp: 30 học viên – Phòng: 20 chỗ')
    })

    it('TC221-07: Phòng online -> không áp physical capacity warning nếu không có capacity', async () => {
        renderClassroomsPage({
            initialRooms: [sampleOnlineRoom],
            activeCapacityWarning: {
                room_id: sampleOnlineRoom.id,
                room_code: sampleOnlineRoom.room_code,
                room_type: 'online',
                room_capacity: null,
                class_id: 'cls-01',
                class_code: 'CNTT-K21',
                class_size: 50,
                basis: 'CLASS_MAX_CAPACITY',
                is_exceeded: false,
                warning: false,
                warning_message: null,
            },
        })

        expect(await screen.findByTestId(`room-code-${sampleOnlineRoom.id}`)).toBeDefined()
        expect(screen.queryByTestId('room-capacity-warning-banner')).toBeNull()
    })

    it('TC221-08: Reload -> room data persist đúng', async () => {
        const { rerender } = renderClassroomsPage({ initialRooms: [samplePhysicalRoom] })
        expect(await screen.findByTestId(`room-code-${samplePhysicalRoom.id}`)).toBeDefined()

        // Rerender / reload với phòng khác
        const updatedRoom = { ...samplePhysicalRoom, room_name: 'Phòng thực hành C3' }
        rerender(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager" permissions={['course.view', 'course.manage']}>
                        <ClassroomsPage initialRooms={[updatedRoom]} />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.getByTestId(`room-name-${samplePhysicalRoom.id}`).textContent).toBe('Phòng thực hành C3')
    })

    // =========================================================================
    // 221-03: LUỒNG TƯƠNG TÁC KIỂM TRA SỨC CHỨA THỰC TẾ (TC221-09 -> TC221-14)
    // =========================================================================

    it('TC221-09: Chọn lớp tối đa 30 (0 hv) và phòng 20 chỗ -> gọi API -> cảnh báo 30 > 20', async () => {
        const mockRequest = vi.fn().mockImplementation((url: string) => {
            if (url.includes('/api/v1/rooms/room-20/check-capacity') && url.includes('class_id=cls-30')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'success',
                            data: {
                                room_id: 'room-20',
                                room_code: 'UAT-P20',
                                room_type: 'physical',
                                room_capacity: 20,
                                class_id: 'cls-30',
                                class_code: 'CNTT-K21',
                                class_size: 30,
                                basis: 'CLASS_MAX_CAPACITY',
                                is_exceeded: true,
                                warning: true,
                                warning_message: 'Sĩ số lớp vượt sức chứa phòng. (Lớp: 30 học viên – Phòng: 20 chỗ)',
                            },
                        }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ status: 'success', data: { items: [], total: 0 } }),
            })
        })

        renderClassroomsPage({
            initialRooms: [sampleRoom20],
            initialClasses: [sampleClass30],
            customRequest: mockRequest,
        })

        // Chọn lớp và chọn phòng
        fireEvent.change(screen.getByTestId('select-check-class'), { target: { value: 'cls-30' } })
        fireEvent.change(screen.getByTestId('select-check-room'), { target: { value: 'room-20' } })

        // Bấm nút kiểm tra
        fireEvent.click(screen.getByTestId('check-capacity-btn'))

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/rooms/room-20/check-capacity?class_id=cls-30'),
            )
        })

        const banner = await screen.findByTestId('room-capacity-warning-banner')
        expect(banner).toBeDefined()
        expect(screen.getByTestId('capacity-warning-text').textContent).toContain('Sĩ số lớp vượt sức chứa phòng.')
        expect(screen.getByTestId('capacity-warning-text').textContent).toContain('Lớp: 30 học viên – Phòng: 20 chỗ')
    })

    it('TC221-10: Lớp 30, phòng 30 -> gọi đúng API -> không cảnh báo vượt (hiển thị thông báo phù hợp)', async () => {
        const mockRequest = vi.fn().mockImplementation((url: string) => {
            if (url.includes('/api/v1/rooms/room-30/check-capacity') && url.includes('class_id=cls-30')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'success',
                            data: {
                                room_id: 'room-30',
                                room_code: 'UAT-P30',
                                room_type: 'physical',
                                room_capacity: 30,
                                class_id: 'cls-30',
                                class_code: 'CNTT-K21',
                                class_size: 30,
                                basis: 'CLASS_MAX_CAPACITY',
                                is_exceeded: false,
                                warning: false,
                                warning_message: null,
                            },
                        }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ status: 'success', data: { items: [], total: 0 } }),
            })
        })

        renderClassroomsPage({
            initialRooms: [sampleRoom30],
            initialClasses: [sampleClass30],
            customRequest: mockRequest,
        })

        fireEvent.change(screen.getByTestId('select-check-class'), { target: { value: 'cls-30' } })
        fireEvent.change(screen.getByTestId('select-check-room'), { target: { value: 'room-30' } })
        fireEvent.click(screen.getByTestId('check-capacity-btn'))

        const successBanner = await screen.findByTestId('room-capacity-success-banner')
        expect(successBanner).toBeDefined()
        expect(screen.getByTestId('capacity-success-text').textContent).toContain('Sức chứa phù hợp')
        expect(screen.queryByTestId('room-capacity-warning-banner')).toBeNull()
    })

    it('TC221-11: Lớp 30, phòng 40 -> gọi đúng API -> không cảnh báo vượt', async () => {
        const mockRequest = vi.fn().mockImplementation((url: string) => {
            if (url.includes('/api/v1/rooms/room-phy-01/check-capacity') && url.includes('class_id=cls-30')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'success',
                            data: {
                                room_id: 'room-phy-01',
                                room_code: 'A2-201',
                                room_type: 'physical',
                                room_capacity: 40,
                                class_id: 'cls-30',
                                class_code: 'CNTT-K21',
                                class_size: 30,
                                basis: 'CLASS_MAX_CAPACITY',
                                is_exceeded: false,
                                warning: false,
                                warning_message: null,
                            },
                        }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ status: 'success', data: { items: [], total: 0 } }),
            })
        })

        renderClassroomsPage({
            initialRooms: [samplePhysicalRoom],
            initialClasses: [sampleClass30],
            customRequest: mockRequest,
        })

        fireEvent.change(screen.getByTestId('select-check-class'), { target: { value: 'cls-30' } })
        fireEvent.change(screen.getByTestId('select-check-room'), { target: { value: 'room-phy-01' } })
        fireEvent.click(screen.getByTestId('check-capacity-btn'))

        const successBanner = await screen.findByTestId('room-capacity-success-banner')
        expect(successBanner).toBeDefined()
        expect(screen.queryByTestId('room-capacity-warning-banner')).toBeNull()
    })

    it('TC221-12: Phòng trực tuyến -> gọi API -> hiển thị thông tin online, không cảnh báo sức chứa vật lý', async () => {
        const mockRequest = vi.fn().mockImplementation((url: string) => {
            if (url.includes('/api/v1/rooms/room-onl-01/check-capacity') && url.includes('class_id=cls-30')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'success',
                            data: {
                                room_id: 'room-onl-01',
                                room_code: 'MEET-01',
                                room_type: 'online',
                                room_capacity: null,
                                class_id: 'cls-30',
                                class_code: 'CNTT-K21',
                                class_size: 30,
                                basis: 'CLASS_MAX_CAPACITY',
                                is_exceeded: false,
                                warning: false,
                                warning_message: null,
                            },
                        }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ status: 'success', data: { items: [], total: 0 } }),
            })
        })

        renderClassroomsPage({
            initialRooms: [sampleOnlineRoom],
            initialClasses: [sampleClass30],
            customRequest: mockRequest,
        })

        fireEvent.change(screen.getByTestId('select-check-class'), { target: { value: 'cls-30' } })
        fireEvent.change(screen.getByTestId('select-check-room'), { target: { value: 'room-onl-01' } })
        fireEvent.click(screen.getByTestId('check-capacity-btn'))

        const onlineBanner = await screen.findByTestId('room-capacity-online-info')
        expect(onlineBanner).toBeDefined()
        expect(screen.getByTestId('capacity-online-text').textContent).toContain('không giới hạn sức chứa vật lý')
        expect(screen.queryByTestId('room-capacity-warning-banner')).toBeNull()
    })

    it('TC221-13: Đổi lựa chọn sau khi có cảnh báo -> xóa ngay kết quả cũ', async () => {
        const mockRequest = vi.fn().mockImplementation((url: string) => {
            if (url.includes('/api/v1/rooms/room-20/check-capacity')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'success',
                            data: {
                                room_id: 'room-20',
                                room_code: 'UAT-P20',
                                room_type: 'physical',
                                room_capacity: 20,
                                class_id: 'cls-30',
                                class_code: 'CNTT-K21',
                                class_size: 30,
                                basis: 'CLASS_MAX_CAPACITY',
                                is_exceeded: true,
                                warning: true,
                                warning_message: 'Sĩ số lớp vượt sức chứa phòng. (Lớp: 30 học viên – Phòng: 20 chỗ)',
                            },
                        }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ status: 'success', data: { items: [], total: 0 } }),
            })
        })

        renderClassroomsPage({
            initialRooms: [sampleRoom20, sampleRoom30],
            initialClasses: [sampleClass30],
            customRequest: mockRequest,
        })

        fireEvent.change(screen.getByTestId('select-check-class'), { target: { value: 'cls-30' } })
        fireEvent.change(screen.getByTestId('select-check-room'), { target: { value: 'room-20' } })
        fireEvent.click(screen.getByTestId('check-capacity-btn'))

        expect(await screen.findByTestId('room-capacity-warning-banner')).toBeDefined()

        // Đổi lựa chọn phòng -> lập tức xóa kết quả cũ
        fireEvent.change(screen.getByTestId('select-check-room'), { target: { value: 'room-30' } })
        expect(screen.queryByTestId('room-capacity-warning-banner')).toBeNull()
    })

    it('TC221-14: API kiểm tra sức chứa lỗi -> hiển thị thông báo lỗi rõ ràng, không hiển thị kết quả giả', async () => {
        const mockRequest = vi.fn().mockImplementation((url: string) => {
            if (url.includes('check-capacity')) {
                return Promise.resolve({
                    ok: false,
                    status: 500,
                    json: () =>
                        Promise.resolve({
                            status: 'error',
                            code: 'SERVER_ERROR',
                            message: 'Lỗi máy chủ khi kiểm tra sức chứa.',
                        }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ status: 'success', data: { items: [], total: 0 } }),
            })
        })

        renderClassroomsPage({
            initialRooms: [sampleRoom20],
            initialClasses: [sampleClass30],
            customRequest: mockRequest,
        })

        fireEvent.change(screen.getByTestId('select-check-class'), { target: { value: 'cls-30' } })
        fireEvent.change(screen.getByTestId('select-check-room'), { target: { value: 'room-20' } })
        fireEvent.click(screen.getByTestId('check-capacity-btn'))

        const errorBanner = await screen.findByTestId('capacity-check-error')
        expect(errorBanner).toBeDefined()
        expect(errorBanner.textContent).toContain('Lỗi máy chủ khi kiểm tra sức chứa.')
        expect(screen.queryByTestId('room-capacity-warning-banner')).toBeNull()
        expect(screen.queryByTestId('room-capacity-success-banner')).toBeNull()
    })
})
