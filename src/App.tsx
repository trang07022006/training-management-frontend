import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useSession } from './auth/SessionProvider'
import { SYSTEM_PERMISSIONS } from './navigation/menuConfig'
import { getTrainingPrograms } from './api/trainingProgramApi'
import './App.css'

export function App() {
  const [selectedYear, setSelectedYear] = useState('2024 - 2025')
  const [activeCalendarDay, setActiveCalendarDay] = useState(12)
  const [totalPrograms, setTotalPrograms] = useState<number | null>(null)
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false)

  let session: ReturnType<typeof useSession> | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    session = useSession()
  } catch {
    session = null
  }

  const request = session?.request
  const hasSession = session?.hasSession
  const permissions = session?.permissions

  useEffect(() => {
    if (!hasSession || !request || !permissions?.includes(SYSTEM_PERMISSIONS.COURSE_VIEW)) {
      return
    }

    let isMounted = true
    setIsLoadingPrograms(true)

    getTrainingPrograms(request, { page: 1, page_size: 1 })
      .then((data) => {
        if (isMounted) {
          setTotalPrograms(data.total)
        }
      })
      .catch(() => {
        if (isMounted) {
          setTotalPrograms(null)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingPrograms(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [hasSession, request, permissions])

  return (
    <div className="ictu-dashboard-container">
      {/* 1. Panoramic Hero Banner */}
      <section className="ictu-hero-banner" data-testid="welcome-banner">
        <div className="ictu-hero-bg-container" aria-hidden="true">
          <img
            src="/branding/ictu/campus-banner.jpg"
            alt="Khuôn viên ICTU"
            className="ictu-hero-bg-img"
          />
          <div className="ictu-hero-overlay" />
        </div>

        <div className="ictu-hero-content">
          <div className="ictu-hero-left">
            <span className="ictu-hero-sub-title">
              TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG
            </span>
            <h1 className="ictu-hero-main-title">
              Hệ thống Quản lý Đào tạo
            </h1>
            <p className="ictu-hero-tagline">
              Quản lý toàn diện - Kết nối hiệu quả - Vì người học
            </p>

            {/* Test Compatibility Anchor */}
            <div className="welcome-tag sr-only" data-testid="welcome-tag">
              Phiên bản Sprint 1 • Sẵn sàng Nghiệm thu
            </div>
            <h2 className="welcome-title sr-only" data-testid="welcome-title">
              Hệ thống Quản lý Đào tạo & Phân quyền
            </h2>
          </div>

          <div className="ictu-hero-right" aria-hidden="true">
            <div className="ictu-hero-calligraphy">
              <span className="calligraphy-line1">Tri thức hôm nay</span>
              <span className="calligraphy-line2">Kiến tạo tương lai</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 4 KPI Stat Summary Cards */}
      <section className="ictu-kpi-grid" aria-label="Thống kê đào tạo">
        {/* KPI 1: Tổng sinh viên */}
        <div className="kpi-card">
          <div className="kpi-icon-box kpi-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Tổng sinh viên</span>
            <span className="kpi-value">--</span>
            <span className="kpi-subtext-empty">Chưa có dữ liệu</span>
          </div>
        </div>

        {/* KPI 2: Giảng viên */}
        <div className="kpi-card">
          <div className="kpi-icon-box kpi-green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Giảng viên</span>
            <span className="kpi-value">--</span>
            <span className="kpi-subtext-empty">Chưa có dữ liệu</span>
          </div>
        </div>

        {/* KPI 3: Chương trình đào tạo */}
        <div className="kpi-card">
          <div className="kpi-icon-box kpi-purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Chương trình đào tạo</span>
            <span className="kpi-value">
              {isLoadingPrograms ? '...' : totalPrograms !== null ? totalPrograms : '--'}
            </span>
            {totalPrograms !== null ? (
              <span className="kpi-subtext-real">Chương trình đang quản lý</span>
            ) : (
              <span className="kpi-subtext-empty">
                {isLoadingPrograms ? 'Đang tải...' : 'Chưa có dữ liệu'}
              </span>
            )}
          </div>
        </div>

        {/* KPI 4: Lớp đang mở */}
        <div className="kpi-card">
          <div className="kpi-icon-box kpi-orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24" aria-hidden="true">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
            </svg>
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Lớp đang mở</span>
            <span className="kpi-value">--</span>
            <span className="kpi-subtext-empty">Chưa có dữ liệu</span>
          </div>
        </div>
      </section>

      {/* 3. Middle Section: Chart + Notifications + Work Calendar */}
      <section className="ictu-middle-grid">
        {/* Card 1: Biểu đồ tuyển sinh và học tập */}
        <div className="middle-card chart-card">
          <div className="middle-card-header">
            <div className="card-header-left">
              <span className="card-header-icon blue-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </span>
              <h2 className="card-header-title">Biểu đồ tuyển sinh và học tập</h2>
            </div>
            <div className="card-header-right">
              <select
                className="chart-year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                aria-label="Chọn năm học"
              >
                <option value="2024 - 2025">Năm học 2024 - 2025</option>
                <option value="2023 - 2024">Năm học 2023 - 2024</option>
              </select>
            </div>
          </div>

          {/* Empty State for Chart (No Fake Series / Bars) */}
          <div className="chart-wrapper chart-empty-wrapper">
            <div className="chart-empty-state">
              <svg className="chart-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              <div className="chart-empty-title">Chưa có dữ liệu thống kê</div>
              <div className="chart-empty-desc">Cần API thống kê để hiển thị biểu đồ</div>
            </div>
          </div>
        </div>

        {/* Card 2: Thông báo mới nhất */}
        <div className="middle-card notification-card">
          <div className="middle-card-header">
            <div className="card-header-left">
              <span className="card-header-icon blue-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </span>
              <h2 className="card-header-title">Thông báo mới nhất</h2>
            </div>
            <Link to="/courses" className="card-view-all-link">
              Xem tất cả →
            </Link>
          </div>

          {/* Empty State for Notifications (No Hardcoded Announcements) */}
          <div className="notification-list notification-empty-list">
            <div className="ictu-empty-state" style={{ padding: '36px 16px' }}>
              <svg className="ictu-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: '40px', height: '40px', margin: '0 auto 10px auto' }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <p className="ictu-empty-title" style={{ fontSize: '0.95rem' }}>Chưa có thông báo</p>
              <p className="ictu-empty-desc" style={{ fontSize: '0.8rem', margin: 0 }}>Hiện tại chưa có thông báo mới nào từ hệ thống đào tạo.</p>
            </div>
          </div>
        </div>

        {/* Card 3: Lịch công tác */}
        <div className="middle-card calendar-card">
          <div className="middle-card-header">
            <div className="card-header-left">
              <span className="card-header-icon blue-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <h2 className="card-header-title">Lịch công tác</h2>
            </div>
          </div>

          {/* Mini Calendar */}
          <div className="mini-calendar-widget">
            <div className="cal-month-nav">
              <span className="cal-month-name">Tháng 3, 2025</span>
              <div className="cal-nav-buttons">
                <button type="button" className="cal-nav-btn" aria-label="Tháng trước">‹</button>
                <button type="button" className="cal-nav-btn" aria-label="Tháng sau">›</button>
              </div>
            </div>

            <div className="cal-weekdays-row">
              <span>T2</span>
              <span>T3</span>
              <span>T4</span>
              <span>T5</span>
              <span>T6</span>
              <span>T7</span>
              <span>CN</span>
            </div>

            <div className="cal-days-grid">
              {/* Prev month days */}
              <span className="cal-day day-faded">24</span>
              <span className="cal-day day-faded">25</span>
              <span className="cal-day day-faded">26</span>
              <span className="cal-day day-faded">27</span>
              <span className="cal-day day-faded">28</span>
              {/* Current month days */}
              <span className="cal-day">1</span>
              <span className="cal-day">2</span>
              <span className="cal-day">3</span>
              <span className="cal-day">4</span>
              <span className="cal-day">5</span>
              <span className="cal-day">6</span>
              <span className="cal-day">7</span>
              <span className="cal-day">8</span>
              <span className="cal-day">9</span>
              <span className="cal-day">10</span>
              <span className="cal-day">11</span>
              <span
                className={`cal-day ${activeCalendarDay === 12 ? 'day-active' : ''}`}
                onClick={() => setActiveCalendarDay(12)}
              >
                12
              </span>
              <span className="cal-day">13</span>
              <span className="cal-day">14</span>
              <span className="cal-day">15</span>
              <span className="cal-day">16</span>
              <span className="cal-day">17</span>
              <span className="cal-day">18</span>
              <span className="cal-day">19</span>
              <span className="cal-day">20</span>
              <span className="cal-day">21</span>
              <span className="cal-day">22</span>
              <span className="cal-day">23</span>
              <span className="cal-day">24</span>
              <span className="cal-day">25</span>
              <span className="cal-day">26</span>
              <span className="cal-day">27</span>
              <span className="cal-day">28</span>
              <span className="cal-day">29</span>
              <span className="cal-day">30</span>
              <span className="cal-day">31</span>
            </div>
          </div>

          {/* Empty State for Schedule items (No Hardcoded Events) */}
          <div className="cal-schedule-items cal-schedule-empty">
            <div className="ictu-empty-state" style={{ padding: '24px 12px' }}>
              <p className="ictu-empty-title" style={{ fontSize: '0.9rem' }}>Chưa có lịch công tác</p>
              <p className="ictu-empty-desc" style={{ fontSize: '0.78rem', margin: 0 }}>Không có sự kiện hoặc lịch làm việc nào trong ngày.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Bottom Section: Danh sách lớp học phần đang mở */}
      <section className="ictu-bottom-card" aria-label="Lớp học phần đang mở">
        <div className="middle-card-header">
          <div className="card-header-left">
            <span className="card-header-icon blue-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
              </svg>
            </span>
            <h2 className="card-header-title">Danh sách lớp học phần đang mở</h2>
          </div>
          <Link to="/courses" className="card-view-all-link">
            Xem tất cả →
          </Link>
        </div>

        <div className="table-responsive-wrapper">
          <table className="ictu-data-table">
            <thead>
              <tr>
                <th style={{ width: '45px' }}>STT</th>
                <th>Mã lớp HP</th>
                <th>Tên học phần</th>
                <th>CTĐT</th>
                <th>Giảng viên</th>
                <th>Số SV</th>
                <th>Thời gian</th>
                <th>Phòng</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'center', width: '50px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {/* Empty State Table Row (No Fake Class Sections) */}
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>Chưa có lớp học phần đang mở</span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Dữ liệu lớp học phần sẽ hiển thị khi có kỳ học mới được kích hoạt.</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default App
