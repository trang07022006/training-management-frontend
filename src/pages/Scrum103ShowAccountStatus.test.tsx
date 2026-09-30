// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { UserTable } from '../components/UserTable'
import type { User } from '../api/userApi'

afterEach(() => {
    cleanup()
})

describe('SCRUM-103: Hiển thị trạng thái tài khoản người dùng', () => {
    const mockUsers: User[] = [
        {
            id: 'u-1',
            name: 'Nguyễn Văn Hoạt Động',
            email: 'active@tms.local',
            phone: '0901234567',
            role: 'admin',
            status: 'active',
            created_at: '2026-01-01T00:00:00Z',
        },
        {
            id: 'u-2',
            name: 'Trần Thị Bị Khóa',
            email: 'locked@tms.local',
            phone: '0912345678',
            role: 'trainer',
            status: 'locked',
            created_at: '2026-01-02T00:00:00Z',
        },
        {
            id: 'u-3',
            name: 'Lê Văn Không Xác Định',
            email: 'unknown@tms.local',
            phone: null,
            role: 'trainee',
            status: '',
            created_at: '2026-01-03T00:00:00Z',
        },
    ]

    it('1. hiển thị chính xác trạng thái active (Hoạt động) với badge tương ứng', () => {
        render(<UserTable users={[mockUsers[0]]} />)

        const statusBadge = screen.getByTestId('user-status-u-1')
        expect(statusBadge).toBeDefined()
        expect(statusBadge.textContent?.trim()).toBe('Hoạt động')
        expect(statusBadge.className).toContain('status-badge')
        expect(statusBadge.className).toContain('status-active')
    })

    it('2. hiển thị chính xác trạng thái locked (Bị khóa) với badge cảnh báo', () => {
        render(<UserTable users={[mockUsers[1]]} />)

        const statusBadge = screen.getByTestId('user-status-u-2')
        expect(statusBadge).toBeDefined()
        expect(statusBadge.textContent?.trim()).toBe('Bị khóa')
        expect(statusBadge.className).toContain('status-badge')
        expect(statusBadge.className).toContain('status-locked')
    })

    it('3. fallback an toàn khi trạng thái không xác định hoặc rỗng', () => {
        render(<UserTable users={[mockUsers[2]]} />)

        const statusBadge = screen.getByTestId('user-status-u-3')
        expect(statusBadge).toBeDefined()
        expect(statusBadge.textContent?.trim()).toBe('Không xác định')
        expect(statusBadge.className).toContain('status-badge')
        expect(statusBadge.className).toContain('status-unknown')
    })

    it('4. hỗ trợ hiển thị cuộn ngang an toàn trên màn hình nhỏ 360px', () => {
        render(<UserTable users={mockUsers} />)

        const scrollContainer = screen.getByLabelText('Bảng dữ liệu người dùng')
        expect(scrollContainer).toBeDefined()
        expect(scrollContainer.className).toContain('user-table-scroll-wrapper')
    })

    it('5. tuyệt đối không hiển thị mật khẩu, token hay các trường nhạy cảm trong DOM', () => {
        const sensitiveUser = {
            ...mockUsers[0],
            password_hash: 'pbkdf2:sha256:sensitive_hash_secret',
            token: 'jwt_token_secret_123',
            refresh_jti: 'jti_secret_payload',
        } as unknown as User

        const { container } = render(<UserTable users={[sensitiveUser]} />)

        expect(container.textContent).not.toContain('sensitive_hash_secret')
        expect(container.textContent).not.toContain('jwt_token_secret_123')
        expect(container.textContent).not.toContain('jti_secret_payload')
    })
})
