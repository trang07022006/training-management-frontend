import { useState } from 'react'
import { Link } from 'react-router'
import './App.css'

export function App() {
  const [selectedYear, setSelectedYear] = useState('2024 - 2025')
  const [activeCalendarDay, setActiveCalendarDay] = useState(12)
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  // Dữ liệu biểu đồ tuyển sinh & học tập
  const chartData = [
    { term: 'Học kỳ 1 2024', students: 1750, attendance: 78 },
    { term: 'Học kỳ 2 2024', students: 1450, attendance: 85 },
    { term: 'Học kỳ hè 2024', students: 1000, attendance: 82 },
    { term: 'Học kỳ 1 2025', students: 2150, attendance: 88 },
    { term: 'Học kỳ 2 2025', students: 1500, attendance: 91 },
  ]

  // Dữ liệu thông báo
  const notifications = [
    {
      id: 1,
      type: 'Quan trọng',
      typeColor: 'danger',
      title: 'Thông báo đăng ký học phần học kỳ 2 năm 2025',
      date: '12/03/2025',
      unread: true,
    },
    {
      id: 2,
      type: 'Thông báo',
      typeColor: 'primary',
      title: 'Kế hoạch tổ chức thi kết thúc học phần',
      date: '10/03/2025',
      unread: true,
    },
    {
      id: 3,
      type: 'Thông báo',
      typeColor: 'success',
      title: 'Danh sách sinh viên đủ điều kiện tốt nghiệp',
      date: '08/03/2025',
      unread: true,
    },
    {
      id: 4,
      type: 'Tin tức',
      typeColor: 'info',
      title: 'Hội thảo khoa học sinh viên năm 2025',
      date: '05/03/2025',
      unread: false,
    },
  ]

  // Lịch công tác
  const schedules = [
    {
      id: 1,
      time: '08:00 - 10:00',
      title: 'Họp Hội đồng đào tạo',
      location: 'Phòng họp A1',
      color: '#2563eb',
    },
    {
      id: 2,
      time: '13:30 - 15:30',
      title: 'Tập huấn công tác cố vấn học tập',
      location: 'Hội trường lớn',
      color: '#9333ea',
    },
    {
      id: 3,
      time: '14:00 - 16:00',
      title: 'Họp khoa Công nghệ thông tin',
      location: 'Phòng họp B1',
      color: '#ea580c',
    },
  ]

  // Danh sách lớp học phần đang mở
  const classSections = [
    {
      stt: 1,
      code: 'IT301',
      name: 'Lập trình hướng đối tượng',
      program: 'CNTT',
      instructor: 'TS. Trần Văn Minh',
      students: '52/60',
      schedule: 'T2, T4 (07:30 - 09:10)',
      room: 'A1-101',
      status: 'Đang mở',
    },
    {
      stt: 2,
      code: 'IT305',
      name: 'Cơ sở dữ liệu',
      program: 'CNTT',
      instructor: 'ThS. Nguyễn Thu Hà',
      students: '48/50',
      schedule: 'T3, T5 (09:30 - 11:10)',
      room: 'A2-203',
      status: 'Đang mở',
    },
    {
      stt: 3,
      code: 'BUS101',
      name: 'Kinh tế số',
      program: 'QTKD',
      instructor: 'PGS.TS. Lê Văn Nam',
      students: '45/50',
      schedule: 'T2, T4 (13:30 - 15:10)',
      room: 'B1-301',
      status: 'Đang mở',
    },
    {
      stt: 4,
      code: 'ENG102',
      name: 'Tiếng Anh chuyên ngành',
      program: 'Cơ bản',
      instructor: 'ThS. Phạm Thị Mai',
      students: '60/60',
      schedule: 'T3, T5 (07:30 - 09:10)',
      room: 'A3-102',
      status: 'Đang mở',
    },
    {
      stt: 5,
      code: 'PRJ301',
      name: 'Đồ án tốt nghiệp',
      program: 'CNTT',
      instructor: 'TS. Hoàng Quốc Việt',
      students: '28/30',
      schedule: 'T6 (13:30 - 17:00)',
      room: 'Lab 3',
      status: 'Đang mở',
    },
  ]

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
            <span className="kpi-value">7.842</span>
            <div className="kpi-trend trend-up">
              <span className="trend-arrow">▲</span>
              <span>12%</span>
              <span className="trend-text">So với học kỳ trước</span>
            </div>
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
            <span className="kpi-value">412</span>
            <div className="kpi-trend trend-up">
              <span className="trend-arrow">▲</span>
              <span>5%</span>
              <span className="trend-text">So với học kỳ trước</span>
            </div>
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
            <span className="kpi-value">28</span>
            <div className="kpi-trend trend-neutral">
              <span className="trend-arrow">↑</span>
              <span>0%</span>
              <span className="trend-text">Không đổi</span>
            </div>
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
            <span className="kpi-value">356</span>
            <div className="kpi-trend trend-up">
              <span className="trend-arrow">▲</span>
              <span>8%</span>
              <span className="trend-text">So với học kỳ trước</span>
            </div>
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

          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-color-dot bar-color" />
              <span>Số sinh viên</span>
            </div>
            <div className="legend-item">
              <span className="legend-color-dot line-color" />
              <span>Tỷ lệ học tập chuyên cần (%)</span>
            </div>
          </div>

          {/* SVG Dual-Axis Chart */}
          <div className="chart-wrapper">
            <svg viewBox="0 0 520 220" className="interactive-chart-svg" preserveAspectRatio="none">
              {/* Dashed Horizontal Grid Lines */}
              <line x1="45" y1="30" x2="475" y2="30" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
              <line x1="45" y1="65" x2="475" y2="65" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
              <line x1="45" y1="100" x2="475" y2="100" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
              <line x1="45" y1="135" x2="475" y2="135" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
              <line x1="45" y1="170" x2="475" y2="170" stroke="#e2e8f0" strokeWidth="1" />

              {/* Left Y-axis labels (0 to 2500) */}
              <text x="40" y="34" className="axis-text" textAnchor="end">2.500</text>
              <text x="40" y="69" className="axis-text" textAnchor="end">2.000</text>
              <text x="40" y="104" className="axis-text" textAnchor="end">1.500</text>
              <text x="40" y="139" className="axis-text" textAnchor="end">1.000</text>
              <text x="40" y="174" className="axis-text" textAnchor="end">0</text>

              {/* Right Y-axis labels (60% to 100%) */}
              <text x="480" y="34" className="axis-text" textAnchor="start">100%</text>
              <text x="480" y="69" className="axis-text" textAnchor="start">90%</text>
              <text x="480" y="104" className="axis-text" textAnchor="start">80%</text>
              <text x="480" y="139" className="axis-text" textAnchor="start">70%</text>
              <text x="480" y="174" className="axis-text" textAnchor="start">60%</text>

              {/* Bars: X locations: 80, 165, 250, 335, 420 */}
              {chartData.map((item, idx) => {
                const x = 75 + idx * 85
                const maxVal = 2500
                const barHeight = (item.students / maxVal) * 140
                const y = 170 - barHeight
                const isHovered = hoveredBar === idx

                return (
                  <g
                    key={item.term}
                    onMouseEnter={() => setHoveredBar(idx)}
                    onMouseLeave={() => setHoveredBar(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect
                      x={x}
                      y={y}
                      width="26"
                      height={barHeight}
                      rx="4"
                      fill={isHovered ? '#0284c7' : '#38bdf8'}
                      className="chart-bar"
                    />
                    {isHovered && (
                      <text x={x + 13} y={y - 6} textAnchor="middle" className="bar-hover-text">
                        {item.students.toLocaleString()} SV
                      </text>
                    )}
                  </g>
                )
              })}

              {/* Spline line for Attendance Rate */}
              {/* Coordinates:
                  idx 0: (88, 170 - ((78-60)/40)*140) = (88, 107)
                  idx 1: (173, 170 - ((85-60)/40)*140) = (173, 82.5)
                  idx 2: (258, 170 - ((82-60)/40)*140) = (258, 93)
                  idx 3: (343, 170 - ((88-60)/40)*140) = (343, 72)
                  idx 4: (428, 170 - ((91-60)/40)*140) = (428, 61.5)
              */}
              <polyline
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="2.5"
                points="88,107 173,82.5 258,93 343,72 428,61.5"
              />

              {/* Line Node Points */}
              <circle cx="88" cy="107" r="4.5" fill="#1d4ed8" stroke="#ffffff" strokeWidth="2" />
              <circle cx="173" cy="82.5" r="4.5" fill="#1d4ed8" stroke="#ffffff" strokeWidth="2" />
              <circle cx="258" cy="93" r="4.5" fill="#1d4ed8" stroke="#ffffff" strokeWidth="2" />
              <circle cx="343" cy="72" r="4.5" fill="#1d4ed8" stroke="#ffffff" strokeWidth="2" />
              <circle cx="428" cy="61.5" r="4.5" fill="#1d4ed8" stroke="#ffffff" strokeWidth="2" />

              {/* X-axis Term Labels */}
              <text x="88" y="195" className="axis-text axis-term-text" textAnchor="middle">
                Học kỳ 1 2024
              </text>
              <text x="173" y="195" className="axis-text axis-term-text" textAnchor="middle">
                Học kỳ 2 2024
              </text>
              <text x="258" y="195" className="axis-text axis-term-text" textAnchor="middle">
                Học kỳ hè 2024
              </text>
              <text x="343" y="195" className="axis-text axis-term-text" textAnchor="middle">
                Học kỳ 1 2025
              </text>
              <text x="428" y="195" className="axis-text axis-term-text" textAnchor="middle">
                Học kỳ 2 2025
              </text>
            </svg>
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

          <div className="notification-list">
            {notifications.map((item) => (
              <div key={item.id} className="notification-item">
                <div className="notif-badge-row">
                  <span className={`notif-type-tag tag-${item.typeColor}`}>
                    {item.type}
                  </span>
                  {item.unread && <span className="notif-unread-dot" />}
                </div>
                <div className="notif-title-row">
                  <a href="#notif" className="notif-item-title" onClick={(e) => e.preventDefault()}>
                    {item.title}
                  </a>
                </div>
                <div className="notif-date-row">{item.date}</div>
              </div>
            ))}
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

          {/* Schedule list */}
          <div className="cal-schedule-items">
            {schedules.map((item) => (
              <div key={item.id} className="schedule-item">
                <div className="sched-bullet" style={{ backgroundColor: item.color }} />
                <div className="sched-body">
                  <div className="sched-time" style={{ color: item.color }}>
                    {item.time}
                  </div>
                  <div className="sched-title">{item.title}</div>
                  <div className="sched-location">📍 {item.location}</div>
                </div>
              </div>
            ))}
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
              {classSections.map((row) => (
                <tr key={row.stt}>
                  <td className="cell-muted">{row.stt}</td>
                  <td className="cell-code">{row.code}</td>
                  <td className="cell-highlight">{row.name}</td>
                  <td>
                    <span className="program-badge">{row.program}</span>
                  </td>
                  <td>{row.instructor}</td>
                  <td className="cell-num">{row.students}</td>
                  <td className="cell-schedule">{row.schedule}</td>
                  <td className="cell-room">{row.room}</td>
                  <td>
                    <span className="status-pill status-open">
                      <span className="status-dot" />
                      {row.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="table-action-menu-btn"
                      aria-label="Tùy chọn thao tác"
                    >
                      ⋮
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default App
