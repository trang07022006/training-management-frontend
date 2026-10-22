// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { SessionManagementPage } from './SessionManagementPage'
import { APP_MENU_CONFIG, filterMenuItems, getRolePermissions } from '../navigation/menuConfig'

const auth = vi.hoisted(() => ({ request: vi.fn(), role: 'training_manager', roles: ['training_manager'], permissions: [] as string[], hasSession: true, isLoading: false }))
vi.mock('../auth/SessionProvider', () => ({ useSession: () => auth }))
const item = { id: 's1', class_id: 'c1', class_code: 'TEST-A', topic: 'Buổi học từ API', session_number: 1, learning_date: '2026-10-20', start_time: '09:00:00', end_time: '10:00:00', status: 'scheduled', attendance_checked: false, instructor_name: 'Giảng viên A', room_name: 'Phòng P20' }
function response(items = [item]) { return { ok: true, status: 200, json: async () => ({ data: { schedules: items } }) } }
function mount() { return render(<MemoryRouter initialEntries={['/sessions']}><Routes><Route path="/sessions" element={<SessionManagementPage />} /><Route path="/forbidden" element={<div>Không đủ quyền quản lý</div>} /><Route path="/login" element={<div>Đăng nhập</div>} /></Routes></MemoryRouter>) }
beforeEach(() => { auth.role = 'training_manager'; auth.roles = ['training_manager']; auth.permissions = getRolePermissions(auth.role).slice(); auth.hasSession = true; auth.isLoading = false; auth.request.mockReset(); auth.request.mockResolvedValue(response()) })
afterEach(cleanup)

describe('Quản lý buổi học dùng API và quyền schedule.manage', () => {
    it.each(['trainee', 'trainer', 'consultant', 'user', 'admin'])('vai trò %s không thấy menu quản lý hoặc gọi API trang quản lý', async role => {
        auth.role = role; auth.roles = [role]; auth.permissions = getRolePermissions(role).slice()
        const menus = filterMenuItems(APP_MENU_CONFIG, { hasSession: true, role, permissions: auth.permissions })
        expect(menus.some(m => m.path === '/sessions')).toBe(false)
        mount()
        expect(await screen.findByText('Không đủ quyền quản lý')).toBeDefined()
        expect(auth.request).not.toHaveBeenCalled()
    })

    it('1. Tài khoản chỉ có vai trò admin: không hiển thị menu Quản lý buổi học, truy cập /sessions bị chặn 403, giữ nguyên Thời khóa biểu và quản trị', async () => {
        auth.role = 'admin'
        auth.roles = ['admin']
        auth.permissions = getRolePermissions('admin').slice()
        const menus = filterMenuItems(APP_MENU_CONFIG, { hasSession: true, role: 'admin', roles: ['admin'], permissions: auth.permissions })
        expect(menus.some(m => m.path === '/sessions')).toBe(false)
        expect(menus.some(m => m.path === '/schedules')).toBe(true)
        expect(menus.some(m => m.path === '/users')).toBe(true)
        mount()
        expect(await screen.findByText('Không đủ quyền quản lý')).toBeDefined()
        expect(auth.request).not.toHaveBeenCalled()
    })

    it('2. Tài khoản training_manager: hiển thị menu Quản lý buổi học và sử dụng bình thường', async () => {
        auth.role = 'training_manager'
        auth.roles = ['training_manager']
        auth.permissions = getRolePermissions('training_manager').slice()
        const menus = filterMenuItems(APP_MENU_CONFIG, { hasSession: true, role: 'training_manager', roles: ['training_manager'], permissions: auth.permissions })
        expect(menus.some(m => m.path === '/sessions')).toBe(true)
        expect(menus.some(m => m.path === '/schedules')).toBe(true)
        mount()
        expect(await screen.findByText(item.topic)).toBeDefined()
        expect(auth.request).toHaveBeenCalled()
    })

    it('3. Tài khoản có cả admin và training_manager: hiển thị cả Quản lý Người dùng và Quản lý buổi học, truy cập thành công', async () => {
        auth.role = 'admin'
        auth.roles = ['admin', 'training_manager']
        auth.permissions = getRolePermissions(['admin', 'training_manager']).slice()
        const menus = filterMenuItems(APP_MENU_CONFIG, { hasSession: true, role: 'admin', roles: ['admin', 'training_manager'], permissions: auth.permissions })
        expect(menus.some(m => m.path === '/sessions')).toBe(true)
        expect(menus.some(m => m.path === '/users')).toBe(true)
        expect(menus.some(m => m.path === '/schedules')).toBe(true)
        mount()
        expect(await screen.findByText(item.topic)).toBeDefined()
        expect(auth.request).toHaveBeenCalled()
    })

    it('quyền được cấp từ server không bị vai trò admin ghi đè', async () => {
        auth.role = 'admin'; auth.roles = ['admin']; auth.permissions = ['course.manage', 'session.view']
        mount(); expect(await screen.findByText('Không đủ quyền quản lý')).toBeDefined(); expect(auth.request).not.toHaveBeenCalled()
    })
    it('đọc dữ liệu thật và mở đúng đường dẫn chi tiết/sửa', async () => {
        mount(); expect(await screen.findByText(item.topic)).toBeDefined()
        expect(auth.request.mock.calls[0][0]).toContain('/api/v1/schedules/calendar?')
        expect(screen.getByRole('link', { name: 'Chi tiết' }).getAttribute('href')).toBe('/classes/c1/schedules/s1')
        expect(screen.getByRole('link', { name: 'Sửa / Dời lịch' }).getAttribute('href')).toBe('/classes/c1/schedules/s1/edit')
        expect(screen.queryByText(/Dữ liệu mẫu/)).toBeNull()
    })
    it('không hiện thao tác sửa buổi đã điểm danh, hủy hoặc hoàn thành', async () => {
        auth.request.mockResolvedValue(response([{ ...item, attendance_checked: true }, { ...item, id: 's2', status: 'cancelled' }, { ...item, id: 's3', status: 'completed' }]))
        mount(); await screen.findByText('Đã điểm danh')
        expect(screen.queryByRole('link', { name: 'Sửa / Dời lịch' })).toBeNull()
        expect(screen.getAllByRole('link', { name: 'Chi tiết' })).toHaveLength(3)
    })
    it('lọc tên và trạng thái, không thay dữ liệu thật bằng dữ liệu demo', async () => {
        mount(); await screen.findByText(item.topic)
        fireEvent.change(screen.getByLabelText('Tìm buổi học'), { target: { value: 'Không tồn tại' } })
        expect(screen.getByText('Không có buổi học phù hợp')).toBeDefined()
        fireEvent.change(screen.getByLabelText('Tìm buổi học'), { target: { value: '' } })
        fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'cancelled' } })
        expect(screen.queryByText(item.topic)).toBeNull()
    })
    it('API lỗi có thông báo và thử lại được, không báo thành công giả', async () => {
        auth.request.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ message: 'Không tải được lịch', code: 'API_ERROR' }) })
        mount(); const alert = await screen.findByRole('alert')
        expect(screen.queryByText(item.topic)).toBeNull()
        fireEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }))
        expect(await screen.findByText(item.topic)).toBeDefined()
    })
    it('ngày không hợp lệ không gửi request; đổi ngày hợp lệ gọi lại API', async () => {
        mount(); await screen.findByText(item.topic); auth.request.mockClear()
        fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2099-10-01' } })
        expect(await screen.findByRole('alert')).toBeDefined(); expect(auth.request).not.toHaveBeenCalled()
        fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2099-10-31' } })
        await waitFor(() => expect(auth.request).toHaveBeenCalledTimes(1))
        expect(auth.request.mock.calls[0][0]).toContain('date_from=2099-10-01')
    })
    it('tải lại và mở lại trang đều lấy dữ liệu từ server', async () => {
        const page = mount(); await screen.findByText(item.topic)
        auth.request.mockResolvedValue(response([{ ...item, topic: 'Đã sửa trên server' }]))
        fireEvent.click(screen.getByRole('button', { name: 'Tải lại' })); await screen.findByText('Đã sửa trên server')
        page.unmount(); mount(); expect(await screen.findByText('Đã sửa trên server')).toBeDefined()
        expect(auth.request).toHaveBeenCalledTimes(3)
    })
})
