/**
 * MOCK DATA - DEVELOPMENT ONLY
 * ============================================================================
 * Tệp dữ liệu giả lập phục vụ hiển thị trực quan và phát triển giao diện Dashboard.
 * TUYỆT ĐỐI không ghi vào MySQL, không trộn lẫn vào database production,
 * và không giả mạo phản hồi API của hệ thống.
 * ============================================================================
 */

export interface DashboardKpiItem {
  id: string
  label: string
  value: string
  trend: string
  trendType: 'up' | 'down' | 'neutral'
  trendLabel: string
}

export interface DashboardChartPoint {
  term: string
  students: number
  attendance: number
}

export interface DashboardNotificationItem {
  id: number
  type: string
  typeColor: 'danger' | 'primary' | 'success' | 'info'
  title: string
  date: string
  unread: boolean
}

export interface DashboardScheduleItem {
  id: number
  time: string
  title: string
  location: string
  color: string
}

export interface DashboardClassSectionItem {
  stt: number
  code: string
  name: string
  program: string
  instructor: string
  students: string
  schedule: string
  room: string
  status: string
}

export const DASHBOARD_KPIS_MOCK: readonly DashboardKpiItem[] = [
  {
    id: 'students',
    label: 'Tổng sinh viên',
    value: '7.842',
    trend: '12%',
    trendType: 'up',
    trendLabel: 'So với học kỳ trước',
  },
  {
    id: 'trainers',
    label: 'Giảng viên',
    value: '412',
    trend: '5%',
    trendType: 'up',
    trendLabel: 'So với học kỳ trước',
  },
  {
    id: 'programs',
    label: 'Chương trình đào tạo',
    value: '28',
    trend: '0%',
    trendType: 'neutral',
    trendLabel: 'Không đổi',
  },
  {
    id: 'classes',
    label: 'Lớp đang mở',
    value: '356',
    trend: '8%',
    trendType: 'up',
    trendLabel: 'So với học kỳ trước',
  },
]

export const DASHBOARD_CHART_MOCK: readonly DashboardChartPoint[] = [
  { term: 'Học kỳ 1 2024', students: 1750, attendance: 78 },
  { term: 'Học kỳ 2 2024', students: 1450, attendance: 85 },
  { term: 'Học kỳ hè 2024', students: 1000, attendance: 82 },
  { term: 'Học kỳ 1 2025', students: 2150, attendance: 88 },
  { term: 'Học kỳ 2 2025', students: 1500, attendance: 91 },
]

export const DASHBOARD_NOTIFICATIONS_MOCK: readonly DashboardNotificationItem[] = [
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

export const DASHBOARD_SCHEDULE_MOCK: readonly DashboardScheduleItem[] = [
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

export const DASHBOARD_CLASS_SECTIONS_MOCK: readonly DashboardClassSectionItem[] = [
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
