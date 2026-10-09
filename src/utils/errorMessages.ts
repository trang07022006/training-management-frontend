/**
 * Module quản lý và ánh xạ thông báo lỗi, thông báo thành công sang tiếng Việt (Sprint 1).
 * Tuân thủ tuyệt đối quy tắc:
 * 1. Không hiển thị trực tiếp bất kỳ mã kỹ thuật nào ra UI (INCORRECT_CURRENT_PASSWORD, SESSION_EXPIRED, FORBIDDEN, etc.).
 * 2. Bảo toàn API contract / error code ở tầng backend để logic code xử lý.
 * 3. Hỗ trợ fallback thân thiện khi gặp mã lỗi chưa được định nghĩa hoặc lỗi mạng.
 */

// 1. Bản đồ ánh xạ mã lỗi kỹ thuật -> thông báo tiếng Việt
export const ERROR_MESSAGES: Record<string, string> = {
    // ----------------------------------------------------
    // 1. ĐĂNG NHẬP
    // ----------------------------------------------------
    INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
    EMAIL_OR_PASSWORD_INCORRECT: 'Email hoặc mật khẩu không đúng.',
    ACCOUNT_LOCKED: 'Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên.',
    ACCOUNT_INACTIVE: 'Tài khoản hiện không hoạt động. Vui lòng liên hệ quản trị viên.',
    ACCOUNT_DISABLED: 'Tài khoản hiện không hoạt động. Vui lòng liên hệ quản trị viên.',
    ACCOUNT_TEMP_LOCKED: 'Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá số lần cho phép. Vui lòng thử lại sau.',
    TEMPORARILY_LOCKED: 'Tài khoản tạm thời bị khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.',
    EMAIL_REQUIRED: 'Email là bắt buộc.',
    PASSWORD_REQUIRED: 'Mật khẩu là bắt buộc.',

    // ----------------------------------------------------
    // 2. SESSION / PHIÊN ĐĂNG NHẬP
    // ----------------------------------------------------
    ACCESS_TOKEN_EXPIRED: 'Phiên làm việc cần được làm mới.',
    SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.',
    SESSION_REVOKED: 'Phiên đăng nhập đã được kết thúc. Vui lòng đăng nhập lại.',
    UNAUTHORIZED: 'Bạn cần đăng nhập để tiếp tục.',
    AUTH_REQUIRED: 'Bạn cần đăng nhập để tiếp tục.',
    SESSION_INVALID: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
    REFRESH_TOKEN_INVALID: 'Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.',
    TOKEN_INVALID: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
    SESSION_CHANGED: 'Phiên đăng nhập đã thay đổi. Vui lòng tải lại trang.',

    // ----------------------------------------------------
    // 3. ĐỔI MẬT KHẨU
    // ----------------------------------------------------
    INCORRECT_CURRENT_PASSWORD: 'Mật khẩu hiện tại không đúng.',
    PASSWORD_TOO_SHORT: 'Mật khẩu mới phải có ít nhất 8 ký tự.',
    PASSWORD_POLICY_FAILED: 'Mật khẩu mới chưa đáp ứng yêu cầu bảo mật.',
    PASSWORD_INVALID: 'Mật khẩu mới chưa đáp ứng yêu cầu bảo mật.',
    PASSWORD_CONFIRMATION_MISMATCH: 'Mật khẩu xác nhận không khớp.',
    SAME_AS_CURRENT_PASSWORD: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
    CURRENT_PASSWORD_REQUIRED: 'Mật khẩu hiện tại là bắt buộc.',
    NEW_PASSWORD_REQUIRED: 'Mật khẩu mới là bắt buộc.',

    // ----------------------------------------------------
    // 4. QUÊN / ĐẶT LẠI MẬT KHẨU
    // ----------------------------------------------------
    INVALID_RESET_TOKEN: 'Liên kết đặt lại mật khẩu không hợp lệ.',
    INVALID_TOKEN: 'Liên kết đặt lại mật khẩu không hợp lệ.',
    EXPIRED_RESET_TOKEN: 'Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu liên kết mới.',
    TOKEN_EXPIRED: 'Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu liên kết mới.',
    USED_RESET_TOKEN: 'Liên kết đặt lại mật khẩu này đã được sử dụng. Vui lòng yêu cầu liên kết mới.',
    TOKEN_ALREADY_USED: 'Liên kết đặt lại mật khẩu này đã được sử dụng. Vui lòng yêu cầu liên kết mới.',
    TOKEN_REQUIRED: 'Mã token là bắt buộc.',
    FORGOT_PASSWORD_RESPONSE: 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi tới email của bạn.',
    FORGOT_PASSWORD_COOLDOWN: 'Bạn vừa yêu cầu đặt lại mật khẩu. Vui lòng chờ trước khi gửi lại.',

    // ----------------------------------------------------
    // 5. PHÂN QUYỀN
    // ----------------------------------------------------
    FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
    PERMISSION_DENIED: 'Bạn không có quyền truy cập chức năng này.',

    // ----------------------------------------------------
    // 6. QUẢN LÝ NGƯỜI DÙNG
    // ----------------------------------------------------
    DUPLICATE_EMAIL: 'Email này đã được sử dụng.',
    USER_NOT_FOUND: 'Không tìm thấy người dùng.',
    NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu.',
    NAME_REQUIRED: 'Họ và tên là bắt buộc.',
    INVALID_EMAIL: 'Định dạng email không hợp lệ.',
    INVALID_PHONE: 'Số điện thoại không đúng định dạng.',
    INVALID_ROLE: 'Vai trò không hợp lệ.',
    INVALID_STATUS: 'Trạng thái không hợp lệ.',

    // ----------------------------------------------------
    // 7. QUẢN LÝ VAI TRÒ
    // ----------------------------------------------------
    DUPLICATE_ROLE_ASSIGNMENT: 'Người dùng đã được gán vai trò này.',
    ROLE_NOT_FOUND: 'Không tìm thấy vai trò.',
    ROLE_NOT_ASSIGNED: 'Người dùng chưa có vai trò này.',

    // ----------------------------------------------------
    // 8. KHÓA / MỞ KHÓA TÀI KHOẢN
    // ----------------------------------------------------
    ALREADY_LOCKED: 'Tài khoản đã ở trạng thái khóa.',
    ALREADY_ACTIVE: 'Tài khoản đang hoạt động.',

    // ----------------------------------------------------
    // 9. LỖI KỸ THUẬT / HỆ THỐNG / DATABASE KHÁC
    // ----------------------------------------------------
    SESSION_STORAGE_UNAVAILABLE: 'Đã xảy ra lỗi. Vui lòng thử lại.',
    DATABASE_ERROR: 'Đã xảy ra lỗi. Vui lòng thử lại.',
    UNKNOWN_DATABASE_ERROR: 'Đã xảy ra lỗi. Vui lòng thử lại.',
    INTERNAL_SERVER_ERROR: 'Đã xảy ra lỗi. Vui lòng thử lại.',
    INTERNAL_ERROR: 'Đã xảy ra lỗi. Vui lòng thử lại.',
    UNKNOWN_ERROR: 'Đã xảy ra lỗi. Vui lòng thử lại.',
    API_ERROR: 'Đã xảy ra lỗi. Vui lòng thử lại.',
    VALIDATION_ERROR: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
    UPDATE_ERROR: 'Đã xảy ra lỗi khi cập nhật. Vui lòng thử lại.',
    FETCH_ROLES_ERROR: 'Không thể tải danh sách vai trò. Vui lòng thử lại.',
    FETCH_AVAILABLE_ROLES_ERROR: 'Không thể tải danh mục vai trò. Vui lòng thử lại.',
    ASSIGN_ROLE_ERROR: 'Phân vai trò thất bại. Vui lòng thử lại.',
    REVOKE_ROLE_ERROR: 'Thu hồi vai trò thất bại. Vui lòng thử lại.',
    LOCK_ERROR: 'Khóa tài khoản thất bại. Vui lòng thử lại.',
    UNLOCK_ERROR: 'Mở khóa tài khoản thất bại. Vui lòng thử lại.',
    INVALID_PAGE: 'Số trang không hợp lệ.',
    INVALID_PAGE_SIZE: 'Kích thước trang không hợp lệ.',
    INVALID_REQUEST: 'Yêu cầu không hợp lệ.',
    INVALID_JSON: 'Dữ liệu yêu cầu không hợp lệ.',
    INVALID_DATA: 'Dữ liệu không hợp lệ.',

    // ----------------------------------------------------
    // 10. IMPORT NGƯỜI DÙNG TỪ EXCEL (SCRUM-119)
    // ----------------------------------------------------
    FILE_REQUIRED: 'Vui lòng chọn file Excel tải lên.',
    INVALID_FILE_TYPE: 'Chỉ hỗ trợ file Excel định dạng .xlsx.',
    FILE_EMPTY: 'File tải lên không có dữ liệu.',
    INVALID_EXCEL_FILE: 'File Excel không hợp lệ hoặc bị hỏng.',
    MISSING_USERS_SHEET: "File Excel phải có sheet tên là 'Users'.",
    INVALID_HEADER: 'Cấu trúc cột trong file Excel không đúng chuẩn.',
    NO_DATA: 'File Excel không có dữ liệu để import.',
    DUPLICATE_EMAIL_IN_FILE: 'Email bị trùng lặp trong file Excel.',
    IMPORT_FAILED: 'Lỗi khi lưu người dùng vào cơ sở dữ liệu.',
    IMPORT_USERS_ERROR: 'Lỗi khi import người dùng từ file Excel.',

    // ----------------------------------------------------
    // 11. HỒ SƠ CÁ NHÂN (SCRUM-120)
    // ----------------------------------------------------
    NAME_TOO_LONG: 'Họ và tên không được vượt quá 255 ký tự.',
    INVALID_DATE_OF_BIRTH: 'Ngày sinh không hợp lệ.',
    ADDRESS_TOO_LONG: 'Địa chỉ không được vượt quá 255 ký tự.',
    PROFILE_FIELD_NOT_EDITABLE: 'Email và vai trò không thể thay đổi từ hồ sơ cá nhân.',
    UNKNOWN_FIELD: 'Trường dữ liệu không hợp lệ.',
    EMPTY_UPDATE: 'Dữ liệu cập nhật không được để trống.',

    // ----------------------------------------------------
    // 12. ẢNH ĐẠI DIỆN (SCRUM-121)
    // ----------------------------------------------------
    AVATAR_REQUIRED: 'Vui lòng chọn ảnh đại diện.',
    AVATAR_TOO_LARGE: 'Ảnh đại diện không được vượt quá 2 MB.',
    INVALID_AVATAR_TYPE: 'Ảnh đại diện phải là JPG, JPEG, PNG hoặc WEBP.',
    AVATAR_NOT_FOUND: 'Không tìm thấy ảnh đại diện.',
    AVATAR_STORAGE_ERROR: 'Lỗi lưu trữ ảnh đại diện. Vui lòng thử lại.',
    AVATAR_UPLOAD_FAILED: 'Không thể tải lên ảnh đại diện. Vui lòng thử lại.',

    // ----------------------------------------------------
    // 13. CHƯƠNG TRÌNH ĐÀO TẠO (SCRUM-122)
    // ----------------------------------------------------
    DUPLICATE_CODE: 'Mã chương trình đào tạo đã tồn tại.',
    PROGRAM_NOT_FOUND: 'Không tìm thấy chương trình đào tạo.',
    PROGRAM_IN_USE: 'Không thể xóa chương trình vì đang có dữ liệu liên quan. Hãy chuyển chương trình sang trạng thái Đã lưu trữ nếu không còn sử dụng.',
    CODE_REQUIRED: 'Mã chương trình là bắt buộc.',
    CODE_TOO_LONG: 'Mã chương trình không được vượt quá 50 ký tự.',
    PROGRAM_NAME_REQUIRED: 'Tên chương trình là bắt buộc.',

    // ----------------------------------------------------
    // 14. MÔN HỌC / HỌC PHẦN (SCRUM-123)
    // ----------------------------------------------------
    SUBJECT_NOT_FOUND: 'Không tìm thấy môn học yêu cầu.',
    SUBJECT_IN_USE: 'Không thể xóa môn học vì đang có dữ liệu liên quan. Hãy chuyển môn học sang trạng thái Đã lưu trữ nếu không còn sử dụng.',
    SUBJECT_IN_USE_PROGRAM: 'Không thể xóa môn học vì môn đang được sử dụng trong chương trình đào tạo. Hãy gỡ môn khỏi các chương trình liên quan trước khi xóa.',
    SUBJECT_IN_USE_CLASS: 'Không thể xóa môn học vì môn đã có lớp học. Để bảo toàn dữ liệu đào tạo, môn học đã phát sinh lớp học không được phép xóa. Hãy chuyển môn học sang trạng thái Đã lưu trữ nếu không còn sử dụng.',
    SUBJECT_IN_USE_SESSION: 'Không thể xóa môn học vì môn vẫn còn các buổi học. Hãy xử lý các buổi học liên quan trước khi xóa.',
    SUBJECT_IN_USE_PREREQUISITE: 'Không thể xóa môn học vì môn đang được sử dụng làm môn tiên quyết. Hãy gỡ các quan hệ tiên quyết liên quan trước khi xóa.',
    SUBJECT_CODE_EXISTS: 'Mã môn học này đã tồn tại. Vui lòng sử dụng mã khác.',
    DUPLICATE_SUBJECT_CODE: 'Mã môn học này đã tồn tại. Vui lòng sử dụng mã khác.',
    SUBJECT_NAME_REQUIRED: 'Tên môn học là bắt buộc.',
    SUBJECT_CODE_REQUIRED: 'Mã môn học là bắt buộc.',
    SUBJECT_CODE_TOO_LONG: 'Mã môn học không được vượt quá 50 ký tự.',
    CREDITS_REQUIRED: 'Số tín chỉ là bắt buộc.',
    INVALID_CREDITS: 'Số tín chỉ phải là số nguyên từ 1 đến 30.',
    INVALID_TOTAL_SESSIONS: 'Số buổi học phải là số nguyên không âm.',

    // ----------------------------------------------------
    // 15. CẤU TRÚC CHƯƠNG TRÌNH & MÔN TIÊN QUYẾT (SCRUM-124)
    // ----------------------------------------------------
    SUBJECT_ALREADY_IN_PROGRAM: 'Môn học đã tồn tại trong chương trình đào tạo.',
    PROGRAM_SUBJECT_NOT_FOUND: 'Không tìm thấy môn học trong chương trình đào tạo.',
    PROGRAM_SUBJECT_IN_USE: 'Môn học đang là điều kiện tiên quyết của môn khác. Hãy gỡ ràng buộc tiên quyết trước.',
    PREREQUISITE_CYCLE: 'Không thể thêm môn tiên quyết vì tạo vòng lặp phụ thuộc (chu trình).',
    INVALID_PREREQUISITE_ORDER: 'Môn tiên quyết phải được xếp trước môn học phụ thuộc theo học kỳ hoặc thứ tự học.',
    PREREQUISITE_ALREADY_EXISTS: 'Môn tiên quyết này đã được thiết lập.',
    CANNOT_PREREQUISITE_SELF: 'Môn học không thể làm điều kiện tiên quyết của chính nó.',
    PROGRAM_ARCHIVED: 'Chương trình đào tạo đã lưu trữ, không thể chỉnh sửa cấu trúc.',
    SUBJECT_ARCHIVED: 'Môn học đã được lưu trữ, không thể chỉnh sửa buổi học.',
    INVALID_SEMESTER: 'Học kỳ không hợp lệ.',
    SEMESTER_EXCEEDS_DURATION: 'Học kỳ vượt quá thời gian đào tạo của chương trình.',

    // ----------------------------------------------------
    // 16. TƯ VẤN CÔNG KHAI (SCRUM-125)
    // ----------------------------------------------------
    PHONE_REQUIRED: 'Số điện thoại là bắt buộc.',
    INVALID_PARAMS: 'Dữ liệu cung cấp không hợp lệ.',
    INVALID_PROGRAM: 'Chương trình đào tạo này hiện không mở đăng ký tư vấn.',

    // ----------------------------------------------------
    // 17. QUẢN LÝ BUỔI HỌC (SCRUM-129)
    // ----------------------------------------------------
    SUBJECT_SESSION_NOT_FOUND: 'Không tìm thấy buổi học của môn học.',
    DUPLICATE_SESSION_NUMBER: 'Số thứ tự buổi học đã tồn tại trong môn học.',
    TOTAL_SESSIONS_EXCEEDED: 'Số thứ tự buổi học vượt quá tổng số buổi của môn học.',
    TOTAL_SESSIONS_IN_USE: 'Không thể giảm tổng số buổi xuống thấp hơn số thứ tự buổi học hiện có.',
    SESSION_NUMBER_REQUIRED: 'Số thứ tự buổi học là bắt buộc.',
    INVALID_SESSION_NUMBER: 'Số thứ tự buổi học phải là số nguyên dương lớn hơn hoặc bằng 1.',
    TOPIC_REQUIRED: 'Chủ đề buổi học là bắt buộc.',
    TOPIC_TOO_LONG: 'Chủ đề buổi học không được vượt quá 255 ký tự.',
    OBJECTIVE_REQUIRED: 'Mục tiêu buổi học là bắt buộc.',
    OBJECTIVE_TOO_LONG: 'Mục tiêu buổi học không được vượt quá 5000 ký tự.',
    REORDER_SESSIONS_FAILED: 'Lỗi khi sắp xếp lại buổi học.',
}

// 2. Bản đồ ánh xạ thông báo thành công
export const SUCCESS_MESSAGES: Record<string, string> = {
    CREATE_SESSION_SUCCESS: 'Thêm buổi học thành công.',
    UPDATE_SESSION_SUCCESS: 'Cập nhật buổi học thành công.',
    REORDER_SESSIONS_SUCCESS: 'Sắp xếp lại thứ tự buổi học thành công.',
    DELETE_SESSION_SUCCESS: 'Xóa buổi học thành công.',
    SUBMIT_CONSULTATION_SUCCESS: 'Yêu cầu tư vấn của bạn đã được ghi nhận. Chúng tôi sẽ liên hệ lại trong thời gian phù hợp.',
    CHANGE_PASSWORD_SUCCESS: 'Đổi mật khẩu thành công.',
    RESET_PASSWORD_SUCCESS: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.',
    CREATE_USER_SUCCESS: 'Tạo người dùng thành công.',
    UPDATE_USER_SUCCESS: 'Cập nhật người dùng thành công.',
    ROLE_ASSIGN_SUCCESS: 'Gán vai trò thành công.',
    ROLE_REVOKE_SUCCESS: 'Thu hồi vai trò thành công.',
    LOCK_ACCOUNT_SUCCESS: 'Khóa tài khoản thành công.',
    UNLOCK_ACCOUNT_SUCCESS: 'Mở khóa tài khoản thành công.',
    FORGOT_PASSWORD_SUCCESS: 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi tới email của bạn.',
    UPDATE_PROFILE_SUCCESS: 'Cập nhật hồ sơ thành công.',
    UPLOAD_AVATAR_SUCCESS: 'Cập nhật ảnh đại diện thành công.',
    DELETE_AVATAR_SUCCESS: 'Xóa ảnh đại diện thành công.',
    CREATE_PROGRAM_SUCCESS: 'Tạo chương trình đào tạo thành công.',
    UPDATE_PROGRAM_SUCCESS: 'Cập nhật chương trình đào tạo thành công.',
    DELETE_PROGRAM_SUCCESS: 'Xóa chương trình đào tạo thành công.',
    CREATE_SUBJECT_SUCCESS: 'Tạo môn học thành công.',
    UPDATE_SUBJECT_SUCCESS: 'Cập nhật môn học thành công.',
    DELETE_SUBJECT_SUCCESS: 'Xóa môn học thành công.',
    ARCHIVE_SUBJECT_SUCCESS: 'Đã lưu trữ môn học thành công.',
}

export const DEFAULT_FALLBACK_ERROR = 'Đã xảy ra lỗi. Vui lòng thử lại.'
export const NETWORK_ERROR_MESSAGE = 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối và thử lại.'

const TECHNICAL_CODE_REGEX = /^[A-Z0-9_]{3,}$/
const VIETNAMESE_ACCENT_REGEX = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i

/**
 * Kiểm tra xem chuỗi có phải là mã kỹ thuật dạng CONSTANT_CASE hay không.
 */
export function isTechnicalCode(str?: string | null): boolean {
    if (!str || typeof str !== 'string') return false
    return TECHNICAL_CODE_REGEX.test(str.trim())
}

/**
 * Kiểm tra lỗi mạng từ chuỗi thông báo hoặc error name.
 */
export function isNetworkError(text?: string | null): boolean {
    if (!text || typeof text !== 'string') return false
    const lower = text.toLowerCase()
    return (
        lower.includes('failed to fetch') ||
        lower.includes('networkerror') ||
        lower.includes('network error') ||
        lower.includes('networkrequestfailed') ||
        lower.includes('load failed') ||
        lower.includes('econnrefused') ||
        lower.includes('kết nối mạng') ||
        lower.includes('kết nối đến máy chủ') ||
        lower.includes('kết nối máy chủ')
    )
}

/**
 * Kiểm tra xem chuỗi có phải tiếng Việt thân thiện có dấu hay không.
 */
export function isFriendlyVietnamese(text?: string | null): boolean {
    if (!text || typeof text !== 'string') return false
    const trimmed = text.trim()
    if (!trimmed) return false
    if (isTechnicalCode(trimmed)) return false
    return VIETNAMESE_ACCENT_REGEX.test(trimmed)
}

/**
 * Hàm dùng chung ánh xạ error code hoặc error object sang thông báo tiếng Việt thân thiện.
 */
export function getErrorMessage(
    errorOrCode: unknown,
    fallback?: string,
): string {
    if (!errorOrCode) {
        return fallback || DEFAULT_FALLBACK_ERROR
    }

    // 1. Trường hợp là chuỗi
    if (typeof errorOrCode === 'string') {
        const trimmed = errorOrCode.trim()
        if (isNetworkError(trimmed)) {
            return NETWORK_ERROR_MESSAGE
        }
        if (trimmed in ERROR_MESSAGES) {
            return ERROR_MESSAGES[trimmed]
        }
        if (isTechnicalCode(trimmed)) {
            return fallback || DEFAULT_FALLBACK_ERROR
        }
        if (isFriendlyVietnamese(trimmed)) {
            return trimmed
        }
        return fallback || DEFAULT_FALLBACK_ERROR
    }

    // 2. Trường hợp là Error hoặc Object có thuộc tính code / message
    let code: string | null = null
    let rawMessage: string | null = null

    if (typeof errorOrCode === 'object' && errorOrCode !== null) {
        const anyObj = errorOrCode as Record<string, unknown>
        if ('code' in anyObj && typeof anyObj.code === 'string') {
            code = anyObj.code.trim()
        }
        if ('message' in anyObj && typeof anyObj.message === 'string') {
            rawMessage = anyObj.message.trim()
        }
    }

    // Kiểm tra lỗi mạng
    if (rawMessage && isNetworkError(rawMessage)) {
        return NETWORK_ERROR_MESSAGE
    }

    // Nếu có mã code được định nghĩa trong ERROR_MESSAGES
    if (code && code in ERROR_MESSAGES) {
        if (code === 'ACCOUNT_LOCKED' && rawMessage && (rawMessage.includes('15 phút') || rawMessage.includes('tạm thời'))) {
            return rawMessage
        }
        if (code === 'ALREADY_LOCKED' && rawMessage && isFriendlyVietnamese(rawMessage)) {
            return rawMessage
        }
        if (code === 'ALREADY_ACTIVE' && rawMessage && isFriendlyVietnamese(rawMessage)) {
            return rawMessage
        }
        if (
            ((code === 'DUPLICATE_CODE') && rawMessage && rawMessage.includes('môn học') && isFriendlyVietnamese(rawMessage)) ||
            ((code === 'SUBJECT_CODE_EXISTS' || code === 'DUPLICATE_SUBJECT_CODE') && rawMessage && isFriendlyVietnamese(rawMessage))
        ) {
            return rawMessage
        }
        if (code === 'NAME_REQUIRED' && rawMessage && (rawMessage.includes('chương trình') || rawMessage.includes('môn học')) && isFriendlyVietnamese(rawMessage)) {
            return rawMessage
        }
        if (code === 'SUBJECT_IN_USE' && rawMessage && isFriendlyVietnamese(rawMessage)) {
            return rawMessage
        }
        if (code === 'SUBJECT_NOT_FOUND' && rawMessage && isFriendlyVietnamese(rawMessage)) {
            return rawMessage
        }
        if (code === 'SUBJECT_ARCHIVED' && rawMessage && isFriendlyVietnamese(rawMessage)) {
            return rawMessage
        }
        if (
            ['INVALID_HEADER', 'MISSING_USERS_SHEET', 'INVALID_EXCEL_FILE', 'FILE_EMPTY', 'NO_DATA', 'INVALID_FILE_TYPE', 'FILE_REQUIRED', 'DUPLICATE_EMAIL_IN_FILE', 'IMPORT_FAILED', 'IMPORT_USERS_ERROR', 'AVATAR_REQUIRED', 'AVATAR_TOO_LARGE', 'INVALID_AVATAR_TYPE', 'AVATAR_NOT_FOUND', 'AVATAR_STORAGE_ERROR', 'AVATAR_UPLOAD_FAILED'].includes(code) &&
            rawMessage &&
            isFriendlyVietnamese(rawMessage)
        ) {
            return rawMessage
        }
        return ERROR_MESSAGES[code]
    }

    // Nếu message có trong mapper
    if (rawMessage) {
        if (rawMessage in ERROR_MESSAGES) {
            return ERROR_MESSAGES[rawMessage]
        }
        if (isTechnicalCode(rawMessage)) {
            return fallback || DEFAULT_FALLBACK_ERROR
        }
        if (isFriendlyVietnamese(rawMessage)) {
            return rawMessage
        }
    }

    return fallback || DEFAULT_FALLBACK_ERROR
}

/**
 * Hàm lấy thông báo thành công theo key chuẩn.
 */
export function getSuccessMessage(key: string, fallback?: string): string {
    return SUCCESS_MESSAGES[key] || fallback || key
}
