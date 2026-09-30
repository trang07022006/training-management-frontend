// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { UserTable } from './UserTable'
import type { User } from '../api/userApi'

afterEach(() => {
    cleanup()
})

const mockUsers: User[] = [
    {
        id: 1,
        name: 'Nguyễn Văn Admin',
        email: 'admin@tms.local',
        phone: '0901234567',
        role: 'admin',
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
    },
    {
        id: 2,
        name: 'Trần Thị Giảng Viên',
        email: 'trainer@tms.local',
        phone: null,
        role: 'trainer',
        status: 'locked',
        created_at: '2026-01-02T00:00:00Z',
    },
    {
        id: 3,
        name: 'Lê Văn Học Viên',
        email: 'trainee@tms.local',
        phone: '   ',
        role: 'trainee',
        status: 'inactive',
        created_at: '2026-01-03T00:00:00Z',
    },
]

describe('SCRUM-90: User Table Component', () => {
    it('1. render đúng danh sách các cột tiêu đề của bảng', () => {
        render(<UserTable users={mockUsers} canManage={true} />)

        expect(screen.getByRole('columnheader', { name: 'Họ và tên' })).toBeDefined()
        expect(screen.getByRole('columnheader', { name: 'Email' })).toBeDefined()
        expect(screen.getByRole('columnheader', { name: 'Số điện thoại' })).toBeDefined()
        expect(screen.getByRole('columnheader', { name: 'Vai trò' })).toBeDefined()
        expect(screen.getByRole('columnheader', { name: 'Trạng thái' })).toBeDefined()
        expect(screen.getByRole('columnheader', { name: 'Thao tác' })).toBeDefined()
    })

    it('2. render chính xác dữ liệu của từng hàng', () => {
        render(<UserTable users={mockUsers} canManage={true} />)

        // Kiểm tra các hàng dữ liệu
        expect(screen.getByTestId('user-row-1')).toBeDefined()
        expect(screen.getByTestId('user-row-2')).toBeDefined()
        expect(screen.getByTestId('user-row-3')).toBeDefined()

        expect(screen.getByText('Nguyễn Văn Admin')).toBeDefined()
        expect(screen.getByText('admin@tms.local')).toBeDefined()
        expect(screen.getByText('0901234567')).toBeDefined()

        expect(screen.getByText('Trần Thị Giảng Viên')).toBeDefined()
        expect(screen.getByText('trainer@tms.local')).toBeDefined()

        expect(screen.getByText('Lê Văn Học Viên')).toBeDefined()
        expect(screen.getByText('trainee@tms.local')).toBeDefined()
    })

    it('3. hiển thị số điện thoại trống hoặc khoảng trắng dạng gạch ngang "—"', () => {
        render(<UserTable users={mockUsers} canManage={true} />)

        const dashes = screen.getAllByText('—')
        expect(dashes.length).toBeGreaterThanOrEqual(2)
    })

    it('4. hiển thị đúng badge vai trò và trạng thái tương ứng', () => {
        render(<UserTable users={mockUsers} canManage={true} />)

        expect(screen.getByText('Quản trị viên')).toBeDefined()
        expect(screen.getByText('Giảng viên')).toBeDefined()
        expect(screen.getByText('Học viên')).toBeDefined()

        expect(screen.getByText('Hoạt động')).toBeDefined()
        expect(screen.getByText('Bị khóa')).toBeDefined()
        expect(screen.getByText('Không hoạt động')).toBeDefined()
    })

    it('5. kích hoạt callback onEdit khi click nút Chỉnh sửa với đúng đối tượng user', () => {
        const handleEdit = vi.fn()
        render(<UserTable users={mockUsers} onEdit={handleEdit} canManage={true} />)

        const editBtn1 = screen.getByTestId('btn-edit-user-1')
        fireEvent.click(editBtn1)

        expect(handleEdit).toHaveBeenCalledTimes(1)
        expect(handleEdit).toHaveBeenCalledWith(mockUsers[0])

        const editBtn2 = screen.getByTestId('btn-edit-user-2')
        fireEvent.click(editBtn2)

        expect(handleEdit).toHaveBeenCalledTimes(2)
        expect(handleEdit).toHaveBeenCalledWith(mockUsers[1])
    })

    it('6. ẩn cột và các nút Thao tác khi canManage = false', () => {
        render(<UserTable users={mockUsers} canManage={false} />)

        expect(screen.queryByRole('columnheader', { name: 'Thao tác' })).toBeNull()
        expect(screen.queryByTestId('btn-edit-user-1')).toBeNull()
        expect(screen.queryByTestId('btn-edit-user-2')).toBeNull()
        expect(screen.queryByTestId('btn-edit-user-3')).toBeNull()
    })

    it('7. hiển thị empty message khi danh sách rỗng hoặc undefined', () => {
        const { rerender } = render(<UserTable users={[]} />)
        expect(screen.getByText('Không có dữ liệu người dùng.')).toBeDefined()
        expect(screen.queryByTestId('user-table')).toBeNull()

        rerender(<UserTable users={[]} emptyMessage="Không tìm thấy kết quả phù hợp." />)
        expect(screen.getByText('Không tìm thấy kết quả phù hợp.')).toBeDefined()
    })

    it('8. có cấu trúc scroll container để hỗ trợ responsive 360px mobile', () => {
        render(<UserTable users={mockUsers} />)
        const scrollWrapper = screen.getByLabelText('Bảng dữ liệu người dùng')
        expect(scrollWrapper.className).toContain('user-table-scroll-wrapper')
    })

    it('9. hiển thị nút Vai trò khi canManage=true và gọi onManageRoles khi click', () => {
        const handleManageRoles = vi.fn()
        render(<UserTable users={mockUsers} canManage={true} onManageRoles={handleManageRoles} />)

        const btnManageRole = screen.getByTestId('btn-manage-role-1')
        expect(btnManageRole).toBeDefined()
        expect(btnManageRole.textContent).toContain('Vai trò')

        fireEvent.click(btnManageRole)
        expect(handleManageRoles).toHaveBeenCalledWith(mockUsers[0])
    })
})
