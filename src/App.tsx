import { Link } from 'react-router'
import { useSession } from './auth/SessionProvider'
import { getRoleLabel } from './auth/roleRouting'
import { getRolePermissions, SYSTEM_PERMISSIONS } from './navigation/menuConfig'
import './App.css'

function App() {
  const { role, userId } = useSession()
  const roleLabel = getRoleLabel(role)
  const permissions = getRolePermissions(role)

  const canViewUsers = permissions.includes(SYSTEM_PERMISSIONS.USER_VIEW)
  const canViewCourses = permissions.includes(SYSTEM_PERMISSIONS.COURSE_VIEW)

  const roleDashboardPath =
    role === 'admin' ? '/admin' : role === 'trainer' ? '/trainer' : role === 'trainee' ? '/trainee' : '/'

  return (
    <div className="overview-dashboard">
      {/* Welcome Banner */}
      <section className="welcome-banner">
        <div className="welcome-content">
          <div className="welcome-tag">Phiên bản Sprint 1 • Sẵn sàng Nghiệm thu</div>
          <h1 className="welcome-title">Hệ thống Quản lý Đào tạo & Phân quyền</h1>
          <p className="welcome-desc">
            Không gian làm việc hợp nhất phục vụ đào tạo, phân quyền vai trò (RBAC) và quản trị tài khoản người dùng.
          </p>
          <div className="user-welcome-badge">
            <span className="badge-indicator" />
            <span>
              Đăng nhập với vai trò: <strong>{roleLabel}</strong> ({role ?? 'user'})
              {userId && <span className="user-id-snippet"> • ID: {userId}</span>}
            </span>
          </div>
        </div>
      </section>

      {/* Summary Stat Cards */}
      <section className="stat-cards-grid" aria-label="Thống kê hệ thống">
        <div className="stat-card">
          <div className="stat-icon-wrapper user-icon">
            👥
          </div>
          <div className="stat-body">
            <div className="stat-label">Người dùng hệ thống</div>
            <div className="stat-value">Hoạt động</div>
            <p className="stat-subtext">Quản lý tài khoản, trạng thái khóa/mở khóa</p>
          </div>
          {canViewUsers ? (
            <Link to="/users" className="stat-link">
              Mở danh sách →
            </Link>
          ) : (
            <span className="stat-link-disabled">Chỉ xem theo quyền</span>
          )}
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper rbac-icon">
            🛡️
          </div>
          <div className="stat-body">
            <div className="stat-label">Mô hình phân quyền RBAC</div>
            <div className="stat-value">4 Vai trò / 6 Quyền</div>
            <p className="stat-subtext">Admin, Trainer, Trainee, User</p>
          </div>
          <Link to={roleDashboardPath} className="stat-link">
            Bảng điều khiển vai trò →
          </Link>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper course-icon">
            📚
          </div>
          <div className="stat-body">
            <div className="stat-label">Chương trình đào tạo</div>
            <div className="stat-value">Đang triển khai</div>
            <p className="stat-subtext">Khóa học & học phần chuyên môn</p>
          </div>
          {canViewCourses ? (
            <Link to="/courses" className="stat-link">
              Xem khóa học →
            </Link>
          ) : (
            <span className="stat-link-disabled">Hạn chế quyền</span>
          )}
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper session-icon">
            🔐
          </div>
          <div className="stat-body">
            <div className="stat-label">Bảo mật phiên làm việc</div>
            <div className="stat-value">JWT An toàn</div>
            <p className="stat-subtext">Tự động gia hạn & thu hồi khi đổi mật khẩu</p>
          </div>
          <Link to="/change-password" className="stat-link">
            Đổi mật khẩu →
          </Link>
        </div>
      </section>

      {/* Quick Action Hub */}
      <section className="quick-actions-section">
        <h2 className="section-title">Lối tắt tác vụ nhanh</h2>
        <div className="quick-actions-grid">
          {canViewUsers && (
            <Link to="/users" className="quick-action-card">
              <div className="action-card-icon">👤</div>
              <div className="action-card-content">
                <h3>Quản lý người dùng</h3>
                <p>Tìm kiếm, tạo mới, chỉnh sửa thông tin, phân vai trò và khóa/mở khóa tài khoản</p>
              </div>
            </Link>
          )}

          <Link to={roleDashboardPath} className="quick-action-card">
            <div className="action-card-icon">⚡</div>
            <div className="action-card-content">
              <h3>Bảng điều khiển {roleLabel}</h3>
              <p>Xem thông tin chi tiết và không gian làm việc chuyên biệt theo vai trò</p>
            </div>
          </Link>

          {canViewCourses && (
            <Link to="/courses" className="quick-action-card">
              <div className="action-card-icon">📖</div>
              <div className="action-card-content">
                <h3>Danh mục Khóa học</h3>
                <p>Xem danh sách các chương trình đào tạo, giảng viên phụ trách và học viên</p>
              </div>
            </Link>
          )}

          <Link to="/change-password" className="quick-action-card">
            <div className="action-card-icon">🔑</div>
            <div className="action-card-content">
              <h3>Đổi mật khẩu tài khoản</h3>
              <p>Cập nhật mật khẩu định kỳ để nâng cao bảo mật tài khoản người dùng</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Sprint 1 Deliverables Summary */}
      <section className="sprint-summary-section">
        <h2 className="section-title">Danh mục tính năng Sprint 1 đã hoàn thiện</h2>
        <div className="modules-list">
          <div className="module-item">
            <span className="module-check">✓</span>
            <div>
              <strong>SCRUM-18: Xác thực đăng nhập</strong>
              <p>Form đăng nhập bảo mật, lưu phiên JWT, xử lý khóa tạm thời khi nhập sai quá 5 lần.</p>
            </div>
          </div>
          <div className="module-item">
            <span className="module-check">✓</span>
            <div>
              <strong>SCRUM-19: Quản lý phiên làm việc</strong>
              <p>Cơ chế lưu trữ Access Token / Refresh Token, tự động làm mới ngầm và thông báo hết hạn phiên.</p>
            </div>
          </div>
          <div className="module-item">
            <span className="module-check">✓</span>
            <div>
              <strong>SCRUM-20 & 21: Quên mật khẩu & Đổi mật khẩu</strong>
              <p>Luồng gửi yêu cầu email, xác minh token 30 phút và đổi mật khẩu kèm thu hồi các phiên khác.</p>
            </div>
          </div>
          <div className="module-item">
            <span className="module-check">✓</span>
            <div>
              <strong>SCRUM-22 & 23: Phân quyền RBAC & Menu động</strong>
              <p>Sidebar và header hiển thị chính xác theo vai trò: Admin, Trainer, Trainee, User.</p>
            </div>
          </div>
          <div className="module-item">
            <span className="module-check">✓</span>
            <div>
              <strong>SCRUM-24: Xử lý trang lỗi chuẩn hóa</strong>
              <p>Trang 401 Unauthorized, 403 Forbidden, 404 Not Found và 500 Internal Server Error.</p>
            </div>
          </div>
          <div className="module-item">
            <span className="module-check">✓</span>
            <div>
              <strong>SCRUM-25 & 26: Quản trị người dùng & Phân vai trò</strong>
              <p>Bảng người dùng, phân trang 20/trang, tìm kiếm theo tên/email, modal thêm/sửa và gán vai trò.</p>
            </div>
          </div>
          <div className="module-item">
            <span className="module-check">✓</span>
            <div>
              <strong>SCRUM-27: Khóa & Mở khóa tài khoản</strong>
              <p>Thao tác khóa tài khoản với cảnh báo thu hồi phiên ngay lập tức và mở khóa an toàn.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default App
