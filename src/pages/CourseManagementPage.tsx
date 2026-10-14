import { Link } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getRolePermissions, SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import './CourseManagementPage.css'

export function CourseManagementPage() {
    const { role } = useSession()
    const perms = getRolePermissions(role)
    const canManageCourses = perms.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE)
    const canViewUsers = perms.includes(SYSTEM_PERMISSIONS.USER_VIEW)

    const SAMPLE_COURSES = [
        {
            id: 'crs-01',
            title: 'Lập trình Web Fullstack với React & Flask',
            code: 'WEB-301',
            duration: '45 giờ',
            trainer: 'Lê Minh Trang',
            level: 'Trung cấp',
            status: 'Đang mở',
            traineesCount: 28,
        },
        {
            id: 'crs-02',
            title: 'Quản trị Cơ sở dữ liệu MySQL 8 & Tối ưu hóa truy vấn',
            code: 'DB-202',
            duration: '36 giờ',
            trainer: 'Nguyễn Văn Hoàng',
            level: 'Cơ bản đến nâng cao',
            status: 'Đang mở',
            traineesCount: 35,
        },
        {
            id: 'crs-03',
            title: 'Kiến trúc Phân quyền RBAC & An toàn bảo mật ứng dụng',
            code: 'SEC-401',
            duration: '30 giờ',
            trainer: 'Trần Đình Nam',
            level: 'Nâng cao',
            status: 'Sắp khai giảng',
            traineesCount: 20,
        },
    ]

    return (
        <main className="courses-page-container">
            <header className="courses-header">
                <div className="courses-header-left">
                    <span className="courses-badge">Phân hệ Đào tạo</span>
                    <h1 className="courses-title">Quản lý Khóa học</h1>
                    <p className="courses-subtitle">
                        Danh mục chương trình đào tạo, học phần và lộ trình học tập.
                    </p>
                </div>
                <div className="courses-header-actions">
                    {canManageCourses && (
                        <button
                            type="button"
                            className="btn-create-course"
                            title="Chức năng tạo khóa học mới nằm trong Sprint 2"
                        >
                            + Thêm khóa học mới
                        </button>
                    )}
                </div>
            </header>

            <div className="courses-sprint-notice">
                <div className="notice-icon" aria-hidden="true">
                    ℹ️
                </div>
                <div className="notice-content">
                    <strong>Thông báo hệ thống:</strong> Phân quyền truy cập Khóa học (RBAC) đã được hoàn thiện trong Sprint 1. Phân hệ thêm/sửa/xóa nội dung bài giảng chi tiết dự kiến triển khai mở rộng ở Sprint 2.
                </div>
            </div>

            <section className="courses-grid" aria-label="Danh sách khóa đào tạo">
                {SAMPLE_COURSES.map((course) => (
                    <article key={course.id} className="course-card">
                        <div className="course-card-header">
                            <span className="course-code">{course.code}</span>
                            <span className={`course-status-badge ${course.status === 'Đang mở' ? 'status-open' : 'status-upcoming'}`}>
                                {course.status}
                            </span>
                        </div>
                        <h2 className="course-card-title">{course.title}</h2>
                        <div className="course-details">
                            <div className="detail-item">
                                <span className="detail-label">Giảng viên:</span>
                                <span className="detail-value">{course.trainer}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Thời lượng:</span>
                                <span className="detail-value">{course.duration}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Cấp độ:</span>
                                <span className="detail-value">{course.level}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Học viên tham gia:</span>
                                <span className="detail-value">{course.traineesCount} học viên</span>
                            </div>
                        </div>
                        <div className="course-card-footer">
                            <button type="button" className="btn-view-course">
                                Xem chi tiết học phần
                            </button>
                        </div>
                    </article>
                ))}
            </section>

            <div className="courses-bottom-nav">
                <Link to="/dashboard" className="btn-nav-home">
                    ← Về trang tổng quan
                </Link>
                {canViewUsers && (
                    <Link to="/users" className="btn-nav-users">
                        Quản lý Người dùng →
                    </Link>
                )}
            </div>
        </main>
    )
}
