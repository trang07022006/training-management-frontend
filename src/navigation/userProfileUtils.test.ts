import { describe, expect, it } from 'vitest'
import { getUserDisplayName, getUserRoleDisplay } from './userProfileUtils'

describe('SCRUM-23 Phase 3: User Profile & Role Utils', () => {
    describe('getUserDisplayName', () => {
        it('1. ưu tiên name khi có sẵn', () => {
            const name = getUserDisplayName({
                name: 'Nguyễn Văn A',
                email: 'a@daotao.edu.vn',
                userId: 'user-123',
            })
            expect(name).toBe('Nguyễn Văn A')
        })

        it('2. dùng email nếu không có name', () => {
            const name = getUserDisplayName({
                email: 'trainer@daotao.edu.vn',
                userId: 'user-456',
            })
            expect(name).toBe('trainer@daotao.edu.vn')
        })

        it('3. dùng userId nếu không có name và email', () => {
            const name = getUserDisplayName({
                userId: 'user-789',
            })
            expect(name).toBe('user-789')
        })

        it('4. fallback an toàn nếu không có bất kỳ thông tin nào', () => {
            expect(getUserDisplayName(null)).toBe('Người dùng')
            expect(getUserDisplayName({})).toBe('Người dùng')
            expect(getUserDisplayName({ name: '   ', email: '' })).toBe('Người dùng')
        })
    })

    describe('getUserRoleDisplay', () => {
        it('1. hiển thị đúng tên vai trò đơn', () => {
            expect(getUserRoleDisplay('admin')).toBe('Quản trị viên')
            expect(getUserRoleDisplay('trainer')).toBe('Giảng viên')
            expect(getUserRoleDisplay('trainee')).toBe('Học viên')
            expect(getUserRoleDisplay('user')).toBe('Người dùng')
            expect(getUserRoleDisplay('consultant')).toBe('Tư vấn tuyển sinh')
            expect(getUserRoleDisplay('training_manager')).toBe('Quản lý đào tạo')
        })

        it('2. hỗ trợ nhiều vai trò (multiple roles dạng mảng hoặc chuỗi phân tách dấu phẩy)', () => {
            // Dạng mảng
            expect(getUserRoleDisplay(['admin', 'trainer'])).toBe('Quản trị viên, Giảng viên')
            // Dạng chuỗi
            expect(getUserRoleDisplay('trainer, trainee')).toBe('Giảng viên, Học viên')
        })

        it('3. fallback an toàn cho vai trò không xác định hoặc null/undefined', () => {
            expect(getUserRoleDisplay(null)).toBe('Người dùng')
            expect(getUserRoleDisplay(undefined)).toBe('Người dùng')
            expect(getUserRoleDisplay('')).toBe('Người dùng')
            expect(getUserRoleDisplay([])).toBe('Người dùng')
        })
    })
})
