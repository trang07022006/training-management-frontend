// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import {
    getErrorMessage,
    getSuccessMessage,
    isTechnicalCode,
    isNetworkError,
    isFriendlyVietnamese,
    DEFAULT_FALLBACK_ERROR,
    NETWORK_ERROR_MESSAGE,
} from './errorMessages'

describe('errorMessages utility - Sprint 1 Vietnamese Localization', () => {
    describe('1. Đăng nhập (Login)', () => {
        it('map INVALID_CREDENTIALS và EMAIL_OR_PASSWORD_INCORRECT', () => {
            expect(getErrorMessage('INVALID_CREDENTIALS')).toBe('Email hoặc mật khẩu không đúng.')
            expect(getErrorMessage('EMAIL_OR_PASSWORD_INCORRECT')).toBe('Email hoặc mật khẩu không đúng.')
            expect(getErrorMessage({ code: 'INVALID_CREDENTIALS' })).toBe('Email hoặc mật khẩu không đúng.')
        })

        it('map ACCOUNT_LOCKED, ACCOUNT_INACTIVE và ACCOUNT_DISABLED', () => {
            expect(getErrorMessage('ACCOUNT_LOCKED')).toBe('Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên.')
            expect(getErrorMessage('ACCOUNT_INACTIVE')).toBe('Tài khoản hiện không hoạt động. Vui lòng liên hệ quản trị viên.')
            expect(getErrorMessage('ACCOUNT_DISABLED')).toBe('Tài khoản hiện không hoạt động. Vui lòng liên hệ quản trị viên.')
        })

        it('map TEMPORARILY_LOCKED', () => {
            expect(getErrorMessage('TEMPORARILY_LOCKED')).toBe(
                'Tài khoản tạm thời bị khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.'
            )
        })
    })

    describe('2. Session / Phiên đăng nhập', () => {
        it('map SESSION_EXPIRED', () => {
            expect(getErrorMessage('SESSION_EXPIRED')).toBe(
                'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.'
            )
        })

        it('map SESSION_REVOKED', () => {
            expect(getErrorMessage('SESSION_REVOKED')).toBe(
                'Phiên đăng nhập đã được kết thúc. Vui lòng đăng nhập lại.'
            )
        })

        it('map UNAUTHORIZED và AUTH_REQUIRED', () => {
            expect(getErrorMessage('UNAUTHORIZED')).toBe('Bạn cần đăng nhập để tiếp tục.')
            expect(getErrorMessage('AUTH_REQUIRED')).toBe('Bạn cần đăng nhập để tiếp tục.')
        })

        it('map ACCESS_TOKEN_EXPIRED không hiển thị mã kỹ thuật', () => {
            const msg = getErrorMessage('ACCESS_TOKEN_EXPIRED')
            expect(msg).not.toContain('ACCESS_TOKEN_EXPIRED')
            expect(msg).toBe('Phiên làm việc cần được làm mới.')
        })
    })

    describe('3. Đổi mật khẩu (Change Password)', () => {
        it('map INCORRECT_CURRENT_PASSWORD', () => {
            expect(getErrorMessage('INCORRECT_CURRENT_PASSWORD')).toBe('Mật khẩu hiện tại không đúng.')
        })

        it('map PASSWORD_TOO_SHORT', () => {
            expect(getErrorMessage('PASSWORD_TOO_SHORT')).toBe('Mật khẩu mới phải có ít nhất 8 ký tự.')
        })

        it('map PASSWORD_POLICY_FAILED và PASSWORD_INVALID', () => {
            expect(getErrorMessage('PASSWORD_POLICY_FAILED')).toBe('Mật khẩu mới chưa đáp ứng yêu cầu bảo mật.')
            expect(getErrorMessage('PASSWORD_INVALID')).toBe('Mật khẩu mới chưa đáp ứng yêu cầu bảo mật.')
        })

        it('map PASSWORD_CONFIRMATION_MISMATCH', () => {
            expect(getErrorMessage('PASSWORD_CONFIRMATION_MISMATCH')).toBe('Mật khẩu xác nhận không khớp.')
        })

        it('map SAME_AS_CURRENT_PASSWORD', () => {
            expect(getErrorMessage('SAME_AS_CURRENT_PASSWORD')).toBe('Mật khẩu mới phải khác mật khẩu hiện tại.')
        })

        it('map CHANGE_PASSWORD_SUCCESS', () => {
            expect(getSuccessMessage('CHANGE_PASSWORD_SUCCESS')).toBe('Đổi mật khẩu thành công.')
        })
    })

    describe('4. Quên / Đặt lại mật khẩu (Forgot / Reset Password)', () => {
        it('map INVALID_RESET_TOKEN và INVALID_TOKEN', () => {
            expect(getErrorMessage('INVALID_RESET_TOKEN')).toBe('Liên kết đặt lại mật khẩu không hợp lệ.')
            expect(getErrorMessage('INVALID_TOKEN')).toBe('Liên kết đặt lại mật khẩu không hợp lệ.')
        })

        it('map EXPIRED_RESET_TOKEN và TOKEN_EXPIRED', () => {
            expect(getErrorMessage('EXPIRED_RESET_TOKEN')).toBe(
                'Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu liên kết mới.'
            )
            expect(getErrorMessage('TOKEN_EXPIRED')).toBe(
                'Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu liên kết mới.'
            )
        })

        it('map USED_RESET_TOKEN và TOKEN_ALREADY_USED', () => {
            expect(getErrorMessage('USED_RESET_TOKEN')).toBe(
                'Liên kết đặt lại mật khẩu này đã được sử dụng. Vui lòng yêu cầu liên kết mới.'
            )
            expect(getErrorMessage('TOKEN_ALREADY_USED')).toBe(
                'Liên kết đặt lại mật khẩu này đã được sử dụng. Vui lòng yêu cầu liên kết mới.'
            )
        })

        it('map RESET_PASSWORD_SUCCESS', () => {
            expect(getSuccessMessage('RESET_PASSWORD_SUCCESS')).toBe(
                'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.'
            )
        })

        it('map Forgot Password response', () => {
            expect(getSuccessMessage('FORGOT_PASSWORD_SUCCESS')).toBe(
                'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi tới email của bạn.'
            )
        })
    })

    describe('5. Phân quyền (RBAC)', () => {
        it('map FORBIDDEN và PERMISSION_DENIED', () => {
            expect(getErrorMessage('FORBIDDEN')).toBe('Bạn không có quyền thực hiện thao tác này.')
            expect(getErrorMessage('PERMISSION_DENIED')).toBe('Bạn không có quyền truy cập chức năng này.')
        })
    })

    describe('6. Quản lý người dùng (User Management)', () => {
        it('map DUPLICATE_EMAIL', () => {
            expect(getErrorMessage('DUPLICATE_EMAIL')).toBe('Email này đã được sử dụng.')
            expect(getErrorMessage({ code: 'DUPLICATE_EMAIL', message: 'Email đã được sử dụng trong hệ thống.' })).toBe(
                'Email này đã được sử dụng.'
            )
        })

        it('map USER_NOT_FOUND', () => {
            expect(getErrorMessage('USER_NOT_FOUND')).toBe('Không tìm thấy người dùng.')
        })

        it('map CREATE_USER_SUCCESS và UPDATE_USER_SUCCESS', () => {
            expect(getSuccessMessage('CREATE_USER_SUCCESS')).toBe('Tạo người dùng thành công.')
            expect(getSuccessMessage('UPDATE_USER_SUCCESS')).toBe('Cập nhật người dùng thành công.')
        })
    })

    describe('7. Quản lý vai trò (Role Management)', () => {
        it('map DUPLICATE_ROLE_ASSIGNMENT', () => {
            expect(getErrorMessage('DUPLICATE_ROLE_ASSIGNMENT')).toBe('Người dùng đã được gán vai trò này.')
        })

        it('map ROLE_NOT_FOUND', () => {
            expect(getErrorMessage('ROLE_NOT_FOUND')).toBe('Không tìm thấy vai trò.')
        })

        it('map ROLE_ASSIGN_SUCCESS và ROLE_REVOKE_SUCCESS', () => {
            expect(getSuccessMessage('ROLE_ASSIGN_SUCCESS')).toBe('Gán vai trò thành công.')
            expect(getSuccessMessage('ROLE_REVOKE_SUCCESS')).toBe('Thu hồi vai trò thành công.')
        })
    })

    describe('8. Khóa / Mở khóa tài khoản (Account Lock)', () => {
        it('map ALREADY_LOCKED', () => {
            expect(getErrorMessage('ALREADY_LOCKED')).toBe('Tài khoản đã ở trạng thái khóa.')
        })

        it('map ALREADY_ACTIVE', () => {
            expect(getErrorMessage('ALREADY_ACTIVE')).toBe('Tài khoản đang hoạt động.')
        })

        it('map LOCK_ACCOUNT_SUCCESS và UNLOCK_ACCOUNT_SUCCESS', () => {
            expect(getSuccessMessage('LOCK_ACCOUNT_SUCCESS')).toBe('Khóa tài khoản thành công.')
            expect(getSuccessMessage('UNLOCK_ACCOUNT_SUCCESS')).toBe('Mở khóa tài khoản thành công.')
        })
    })

    describe('9. Fallback và mã kỹ thuật (Technical Codes & Fallback)', () => {
        it('không bao giờ hiển thị mã kỹ thuật chưa có trong mapper', () => {
            expect(getErrorMessage('UNKNOWN_DATABASE_ERROR')).toBe(DEFAULT_FALLBACK_ERROR)
            expect(getErrorMessage('INTERNAL_SERVER_ERROR')).toBe(DEFAULT_FALLBACK_ERROR)
            expect(getErrorMessage('SOME_RANDOM_CODE')).toBe(DEFAULT_FALLBACK_ERROR)
            expect(getErrorMessage({ code: 'SOME_UNMAPPED_CODE' })).toBe(DEFAULT_FALLBACK_ERROR)
        })

        it('xử lý lỗi kết nối mạng', () => {
            expect(getErrorMessage(new Error('Failed to fetch'))).toBe(NETWORK_ERROR_MESSAGE)
            expect(getErrorMessage('NetworkError when attempting to fetch resource')).toBe(NETWORK_ERROR_MESSAGE)
            expect(getErrorMessage(new Error('Không thể kết nối đến máy chủ.'))).toBe(NETWORK_ERROR_MESSAGE)
        })

        it('giữ lại thông điệp tiếng Việt thân thiện chi tiết', () => {
            const friendly = 'Tài khoản tạm thời bị khóa 15 phút do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau.'
            expect(getErrorMessage({ code: 'ACCOUNT_LOCKED', message: friendly })).toBe(friendly)
            expect(getErrorMessage(friendly)).toBe(friendly)
        })

        it('kiểm tra hàm helper isTechnicalCode', () => {
            expect(isTechnicalCode('INCORRECT_CURRENT_PASSWORD')).toBe(true)
            expect(isTechnicalCode('FORBIDDEN')).toBe(true)
            expect(isTechnicalCode('Mật khẩu không đúng')).toBe(false)
            expect(isTechnicalCode('')).toBe(false)
            expect(isTechnicalCode(null)).toBe(false)
        })

        it('kiểm tra hàm helper isNetworkError', () => {
            expect(isNetworkError('Failed to fetch')).toBe(true)
            expect(isNetworkError('Network error')).toBe(true)
            expect(isNetworkError('Mật khẩu sai')).toBe(false)
        })

        it('kiểm tra hàm helper isFriendlyVietnamese', () => {
            expect(isFriendlyVietnamese('Mật khẩu không đúng')).toBe(true)
            expect(isFriendlyVietnamese('FORBIDDEN')).toBe(false)
            expect(isFriendlyVietnamese('Invalid password')).toBe(false)
        })
    })

    describe('10. Import Người dùng từ Excel (SCRUM-119)', () => {
        it('map các mã lỗi liên quan đến file Excel và cấu trúc sheet', () => {
            expect(getErrorMessage('FILE_REQUIRED')).toBe('Vui lòng chọn file Excel tải lên.')
            expect(getErrorMessage('INVALID_FILE_TYPE')).toBe('Chỉ hỗ trợ file Excel định dạng .xlsx.')
            expect(getErrorMessage('FILE_EMPTY')).toBe('File tải lên không có dữ liệu.')
            expect(getErrorMessage('INVALID_EXCEL_FILE')).toBe('File Excel không hợp lệ hoặc bị hỏng.')
            expect(getErrorMessage('MISSING_USERS_SHEET')).toBe("File Excel phải có sheet tên là 'Users'.")
            expect(getErrorMessage('INVALID_HEADER')).toBe('Cấu trúc cột trong file Excel không đúng chuẩn.')
            expect(getErrorMessage('NO_DATA')).toBe('File Excel không có dữ liệu để import.')
            expect(getErrorMessage('DUPLICATE_EMAIL_IN_FILE')).toBe('Email bị trùng lặp trong file Excel.')
        })

        it('ưu tiên thông điệp tiếng Việt chi tiết từ backend an toàn', () => {
            const detailedMsg = "File Excel phải có sheet tên là 'Users'."
            expect(getErrorMessage({ code: 'MISSING_USERS_SHEET', message: detailedMsg })).toBe(detailedMsg)

            const headerMsg = "Cấu trúc cột không đúng chuẩn: thiếu cột 'email'."
            expect(getErrorMessage({ code: 'INVALID_HEADER', message: headerMsg })).toBe(headerMsg)
        })
    })

    describe('11. Ảnh đại diện người dùng (SCRUM-121)', () => {
        it('map các mã lỗi avatar sang tiếng Việt thân thiện', () => {
            expect(getErrorMessage('AVATAR_REQUIRED')).toBe('Vui lòng chọn ảnh đại diện.')
            expect(getErrorMessage('AVATAR_TOO_LARGE')).toBe('Ảnh đại diện không được vượt quá 2 MB.')
            expect(getErrorMessage('INVALID_AVATAR_TYPE')).toBe('Ảnh đại diện phải là JPG, JPEG, PNG hoặc WEBP.')
            expect(getErrorMessage('AVATAR_NOT_FOUND')).toBe('Không tìm thấy ảnh đại diện.')
            expect(getErrorMessage('AVATAR_STORAGE_ERROR')).toBe('Lỗi lưu trữ ảnh đại diện. Vui lòng thử lại.')
            expect(getErrorMessage('AVATAR_UPLOAD_FAILED')).toBe('Không thể tải lên ảnh đại diện. Vui lòng thử lại.')
        })

        it('map thông báo thành công cho thao tác avatar', () => {
            expect(getSuccessMessage('UPLOAD_AVATAR_SUCCESS')).toBe('Cập nhật ảnh đại diện thành công.')
            expect(getSuccessMessage('DELETE_AVATAR_SUCCESS')).toBe('Xóa ảnh đại diện thành công.')
        })

        it('ưu tiên thông báo tiếng Việt có dấu chi tiết từ backend cho lỗi avatar', () => {
            const vietnameseMsg = 'Ảnh đại diện không đúng tỷ lệ hợp lệ.'
            expect(getErrorMessage({ code: 'INVALID_AVATAR_TYPE', message: vietnameseMsg })).toBe(vietnameseMsg)
        })
    })

    describe('12. Quản lý chương trình đào tạo (SCRUM-122)', () => {
        it('map các mã lỗi chương trình đào tạo sang tiếng Việt chuẩn', () => {
            expect(getErrorMessage('DUPLICATE_CODE')).toBe('Mã chương trình đào tạo đã tồn tại.')
            expect(getErrorMessage('PROGRAM_NOT_FOUND')).toBe('Không tìm thấy chương trình đào tạo.')
            expect(getErrorMessage('PROGRAM_IN_USE')).toBe(
                'Không thể xóa chương trình vì đang có dữ liệu liên quan. Hãy chuyển chương trình sang trạng thái Đã lưu trữ nếu không còn sử dụng.'
            )
            expect(getErrorMessage('CODE_REQUIRED')).toBe('Mã chương trình là bắt buộc.')
            expect(getErrorMessage('CODE_TOO_LONG')).toBe('Mã chương trình không được vượt quá 50 ký tự.')
        })

        it('map thông báo thành công cho chương trình đào tạo', () => {
            expect(getSuccessMessage('CREATE_PROGRAM_SUCCESS')).toBe('Tạo chương trình đào tạo thành công.')
            expect(getSuccessMessage('UPDATE_PROGRAM_SUCCESS')).toBe('Cập nhật chương trình đào tạo thành công.')
            expect(getSuccessMessage('DELETE_PROGRAM_SUCCESS')).toBe('Xóa chương trình đào tạo thành công.')
        })

        it('xử lý lỗi NAME_REQUIRED khi liên quan đến tên chương trình đào tạo', () => {
            const backendMsg = 'Tên chương trình đào tạo không được để trống.'
            expect(getErrorMessage({ code: 'NAME_REQUIRED', message: backendMsg })).toBe(backendMsg)
        })
    })

    describe('14. Cấu trúc chương trình & môn tiên quyết (SCRUM-124)', () => {
        it('map các mã lỗi cấu trúc môn học và tiên quyết sang tiếng Việt', () => {
            expect(getErrorMessage('SUBJECT_ALREADY_IN_PROGRAM')).toBe('Môn học đã tồn tại trong chương trình đào tạo.')
            expect(getErrorMessage('PROGRAM_SUBJECT_NOT_FOUND')).toBe('Không tìm thấy môn học trong chương trình đào tạo.')
            expect(getErrorMessage('PROGRAM_SUBJECT_IN_USE')).toBe(
                'Môn học đang là điều kiện tiên quyết của môn khác. Hãy gỡ ràng buộc tiên quyết trước.'
            )
            expect(getErrorMessage('PREREQUISITE_CYCLE')).toBe(
                'Không thể thêm môn tiên quyết vì tạo vòng lặp phụ thuộc (chu trình).'
            )
            expect(getErrorMessage('INVALID_PREREQUISITE_ORDER')).toBe(
                'Môn tiên quyết phải được xếp trước môn học phụ thuộc theo học kỳ hoặc thứ tự học.'
            )
        })
    })
})


