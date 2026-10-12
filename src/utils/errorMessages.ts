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
    UNAUTHORIZED: 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.',
    AUTH_REQUIRED: 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.',
    '401': 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
    SESSION_INVALID: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
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
    PERMISSION_DENIED: 'Bạn không có quyền thực hiện thao tác này.',
    '403': 'Bạn không có quyền thực hiện thao tác này.',

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
    SUBJECT_IN_USE: 'Không thể xóa môn học vì môn đang được sử dụng trong chương trình đào tạo. Hãy gỡ môn khỏi các chương trình liên quan trước khi xóa, hoặc chuyển môn sang trạng thái Đã lưu trữ nếu không còn sử dụng.',
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
    // 16. TƯ VẤN CÔNG KHAI & PHÂN CÔNG LEAD (SCRUM-125 / SCRUM-127)
    // ----------------------------------------------------
    PHONE_REQUIRED: 'Số điện thoại là bắt buộc.',
    INVALID_PARAMS: 'Dữ liệu cung cấp không hợp lệ.',
    INVALID_PROGRAM: 'Chương trình đào tạo này hiện không mở đăng ký tư vấn.',
    CONSULTATION_RATE_LIMITED: 'Bạn vừa gửi yêu cầu tư vấn. Vui lòng thử lại sau khoảng 1 phút.',
    INVALID_ASSIGNEE: 'Chỉ có thể phân công Lead cho nhân viên Tư vấn tuyển sinh.',
    INACTIVE_USER: 'Người dùng không còn hoạt động, không thể nhận phân công.',

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
    REORDER_SESSIONS_FAILED: 'Không thể cập nhật thứ tự buổi học. Vui lòng thử lại.',

    // ----------------------------------------------------
    // 18. QUẢN LÝ LỚP HỌC & GHI DANH (SCRUM-217 & SCRUM-218)
    // ----------------------------------------------------
    CLASS_NOT_FOUND: 'Không tìm thấy thông tin lớp học.',
    CLASS_CODE_EXISTS: 'Mã lớp học này đã tồn tại. Vui lòng chọn mã khác.',
    DUPLICATE_CLASS_CODE: 'Mã lớp học này đã tồn tại. Vui lòng chọn mã khác.',
    CLASS_CAPACITY_FULL: 'Lớp học đã đủ số lượng học viên tối đa.',
    STUDENT_ALREADY_ENROLLED: 'Học viên đã được ghi danh vào lớp học này.',
    STUDENT_NOT_FOUND: 'Không tìm thấy thông tin học viên.',
    INVALID_STUDENT_LIST: 'Vui lòng chọn ít nhất một học viên để ghi danh.',
}

// 2. Bản đồ ánh xạ thông báo thành công
export const SUCCESS_MESSAGES: Record<string, string> = {
    CREATE_SESSION_SUCCESS: 'Thêm buổi học thành công.',
    UPDATE_SESSION_SUCCESS: 'Cập nhật buổi học thành công.',
    REORDER_SESSIONS_SUCCESS: 'Sắp xếp lại thứ tự buổi học thành công.',
    DELETE_SESSION_SUCCESS: 'Xóa buổi học thành công.',
    SUBMIT_CONSULTATION_SUCCESS: 'Cảm ơn bạn đã đăng ký tư vấn. Yêu cầu của bạn đã được ghi nhận. Bộ phận tư vấn ICTU sẽ liên hệ lại với bạn trong vòng 24 giờ làm việc.',
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
const TECHNICAL_ERROR_REGEX = /(?:traceback|exception|error:|stack trace|internal server error|econnrefused|fetch failed|\bat\s+\w+\s+\()/i

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
    if (
        lower.includes('400') ||
        lower.includes('401') ||
        lower.includes('403') ||
        lower.includes('404') ||
        lower.includes('500') ||
        lower.includes('status code 4') ||
        lower.includes('status code 5')
    ) {
        return false
    }
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
    if (isTechnicalError(trimmed)) return false
    return VIETNAMESE_ACCENT_REGEX.test(trimmed)
}

/**
 * Kiểm tra chuỗi có chứa lỗi kỹ thuật, stack trace hoặc mã hệ thống hay không.
 */
export function isTechnicalError(text?: string | null): boolean {
    if (!text || typeof text !== 'string') return false
    const trimmed = text.trim()
    if (!trimmed) return false
    if (isTechnicalCode(trimmed)) return true
    if (TECHNICAL_ERROR_REGEX.test(trimmed)) return true
    return false
}

/**
 * Chuẩn hóa fallback để đảm bảo tuyệt đối không leak mã lỗi hoặc stack trace.
 */
export function sanitizeFallback(fallback?: string): string {
    if (!fallback || typeof fallback !== 'string') return DEFAULT_FALLBACK_ERROR
    const trimmed = fallback.trim()
    if (!trimmed) return DEFAULT_FALLBACK_ERROR
    if (trimmed in ERROR_MESSAGES) return ERROR_MESSAGES[trimmed]
    if (isTechnicalCode(trimmed) || isTechnicalError(trimmed)) return DEFAULT_FALLBACK_ERROR
    if (isFriendlyVietnamese(trimmed)) return trimmed
    return DEFAULT_FALLBACK_ERROR
}

/**
 * Hàm dùng chung ánh xạ error code hoặc error object sang thông báo tiếng Việt thân thiện.
 * Tuân thủ quy định:
 * - UNAUTHORIZED -> "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn."
 * - FORBIDDEN / 403 -> "Bạn không có quyền thực hiện thao tác này."
 * - 401 -> "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại."
 * - Tuyệt đối không hiển thị mã kỹ thuật, status code, backend raw error, stack trace ra UI.
 */
export function getErrorMessage(
    errorOrCode: unknown,
    fallback?: string,
): string {
    const safeFallback = sanitizeFallback(fallback)

    if (errorOrCode === undefined || errorOrCode === null) {
        return safeFallback
    }

    // 1. Trường hợp là number (ví dụ 401, 403)
    if (typeof errorOrCode === 'number') {
        if (errorOrCode === 401) {
            return ERROR_MESSAGES['401']
        }
        if (errorOrCode === 403) {
            return ERROR_MESSAGES.FORBIDDEN
        }
        if (errorOrCode === 404) {
            return fallback && fallback !== DEFAULT_FALLBACK_ERROR ? fallback : 'Không tìm thấy dữ liệu yêu cầu.'
        }
        if (errorOrCode === 500) {
            return 'Có lỗi máy chủ, vui lòng thử lại.'
        }
        const str = String(errorOrCode)
        if (str in ERROR_MESSAGES) {
            return ERROR_MESSAGES[str]
        }
        return safeFallback
    }

    // 2. Trường hợp là chuỗi
    if (typeof errorOrCode === 'string') {
        const trimmed = errorOrCode.trim()
        if (isNetworkError(trimmed)) {
            return NETWORK_ERROR_MESSAGE
        }

        const upper = trimmed.toUpperCase()

        // Mapping ưu tiên mã auth / permission
        if (trimmed === '401' || trimmed.startsWith('401')) {
            return ERROR_MESSAGES['401']
        }
        if (upper === 'UNAUTHORIZED' || upper === 'AUTH_REQUIRED') {
            return ERROR_MESSAGES.UNAUTHORIZED
        }
        if (upper === 'FORBIDDEN' || upper === 'PERMISSION_DENIED' || trimmed === '403' || trimmed.startsWith('403')) {
            return ERROR_MESSAGES.FORBIDDEN
        }
        if (trimmed.includes('401')) {
            return ERROR_MESSAGES['401']
        }
        if (upper.includes('UNAUTHORIZED')) {
            return ERROR_MESSAGES.UNAUTHORIZED
        }
        if (upper.includes('FORBIDDEN') || trimmed.includes('403')) {
            return ERROR_MESSAGES.FORBIDDEN
        }

        if (trimmed === '404') {
            return fallback && fallback !== DEFAULT_FALLBACK_ERROR ? fallback : 'Không tìm thấy dữ liệu yêu cầu.'
        }
        if (trimmed === '500') {
            return fallback && fallback !== DEFAULT_FALLBACK_ERROR ? fallback : 'Có lỗi máy chủ, vui lòng thử lại.'
        }

        if (trimmed in ERROR_MESSAGES) {
            return ERROR_MESSAGES[trimmed]
        }
        if (isTechnicalCode(trimmed) || isTechnicalError(trimmed)) {
            return safeFallback
        }
        if (isFriendlyVietnamese(trimmed)) {
            return trimmed
        }
        return safeFallback
    }

    // 3. Trường hợp là Error hoặc Object có thuộc tính code / message / status
    let code: string | null = null
    let rawMessage: string | null = null
    let status: number | null = null

    if (typeof errorOrCode === 'object') {
        const anyObj = errorOrCode as Record<string, unknown>
        if ('code' in anyObj && typeof anyObj.code === 'string') {
            code = anyObj.code.trim()
        }
        if ('message' in anyObj && typeof anyObj.message === 'string') {
            rawMessage = anyObj.message.trim()
        }
        if ('status' in anyObj && typeof anyObj.status === 'number') {
            status = anyObj.status
        } else if ('statusCode' in anyObj && typeof anyObj.statusCode === 'number') {
            status = anyObj.statusCode
        }
    }

    // Kiểm tra lỗi mạng (chỉ khi không có HTTP status code hợp lệ)
    if ((!status || status === 0) && rawMessage && isNetworkError(rawMessage)) {
        return NETWORK_ERROR_MESSAGE
    }

    const normCode = code?.toUpperCase()
    const upperMsg = rawMessage?.toUpperCase() || ''

    // Nếu có mã code được định nghĩa trong ERROR_MESSAGES (ngoại trừ các mã chung chung như API_ERROR)
    if (code && code in ERROR_MESSAGES && !['API_ERROR', 'REQUEST_FAILED', 'UNKNOWN_ERROR'].includes(code)) {
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
        if (code === 'REORDER_SESSIONS_FAILED' && rawMessage && isFriendlyVietnamese(rawMessage)) {
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

    // Ánh xạ lỗi xác thực và phân quyền qua status hoặc message khi mã code không chuyên biệt
    if (normCode === 'UNAUTHORIZED' || normCode === 'AUTH_REQUIRED') {
        return ERROR_MESSAGES.UNAUTHORIZED
    }

    if (
        normCode === 'FORBIDDEN' ||
        normCode === 'PERMISSION_DENIED' ||
        normCode === '403' ||
        status === 403 ||
        upperMsg === 'FORBIDDEN' ||
        upperMsg.startsWith('403') ||
        upperMsg.includes('FORBIDDEN') ||
        upperMsg.includes('403') ||
        upperMsg.includes('PERMISSION_DENIED')
    ) {
        return ERROR_MESSAGES.FORBIDDEN
    }

    if (
        normCode === '401' ||
        status === 401 ||
        upperMsg.startsWith('401') ||
        upperMsg.includes('401')
    ) {
        return ERROR_MESSAGES['401']
    }

    if (
        status === 404 ||
        normCode === '404' ||
        normCode === 'NOT_FOUND' ||
        upperMsg.startsWith('404')
    ) {
        if (rawMessage && isFriendlyVietnamese(rawMessage)) {
            return rawMessage
        }
        if (fallback && fallback !== DEFAULT_FALLBACK_ERROR) {
            return fallback
        }
        return 'Không tìm thấy dữ liệu yêu cầu.'
    }

    if (
        status === 500 ||
        normCode === '500' ||
        normCode === 'INTERNAL_SERVER_ERROR' ||
        normCode === 'INTERNAL_ERROR' ||
        upperMsg.startsWith('500')
    ) {
        if (rawMessage && isFriendlyVietnamese(rawMessage)) {
            return rawMessage
        }
        return 'Có lỗi máy chủ, vui lòng thử lại.'
    }

    if (upperMsg === 'UNAUTHORIZED' || upperMsg.includes('UNAUTHORIZED')) {
        return ERROR_MESSAGES.UNAUTHORIZED
    }

    // Nếu message có trong mapper
    if (rawMessage) {
        if (rawMessage in ERROR_MESSAGES) {
            return ERROR_MESSAGES[rawMessage]
        }
        if (isTechnicalCode(rawMessage) || isTechnicalError(rawMessage)) {
            return safeFallback
        }
        if (isFriendlyVietnamese(rawMessage)) {
            return rawMessage
        }
    }

    return safeFallback
}

/**
 * Hàm lấy thông báo thành công theo key chuẩn.
 */
export function getSuccessMessage(key: string, fallback?: string): string {
    return SUCCESS_MESSAGES[key] || fallback || key
}
