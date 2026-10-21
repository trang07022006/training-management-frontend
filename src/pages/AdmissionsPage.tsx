import { Link } from 'react-router'
import './AdmissionsPage.css'

export function AdmissionsPage() {
  const steps = [
    {
      stepNumber: '01',
      title: 'Tìm hiểu chương trình đào tạo',
      desc: 'Tham khảo danh mục các ngành học, mục tiêu đào tạo và cơ hội nghề nghiệp tương lai phù hợp với sở thích và năng lực của bạn.',
      linkText: 'Xem danh mục chương trình',
      linkUrl: '/programs',
    },
    {
      stepNumber: '02',
      title: 'Đăng ký tư vấn trực tuyến',
      desc: 'Điền thông tin liên hệ và ngành học quan tâm vào mẫu đăng ký tư vấn để được bộ phận tuyển sinh hỗ trợ chi tiết.',
      linkText: 'Đăng ký tư vấn ngay',
      linkUrl: '/consultation',
    },
    {
      stepNumber: '03',
      title: 'Nhận tư vấn & định hướng',
      desc: 'Cán bộ tư vấn tuyển sinh ICTU sẽ liên hệ qua điện thoại hoặc email để giải đáp mọi thắc mắc về phương thức xét tuyển và hướng dẫn cụ thể.',
      linkText: null,
      linkUrl: null,
    },
    {
      stepNumber: '04',
      title: 'Hoàn thiện hồ sơ xét tuyển',
      desc: 'Chuẩn bị hồ sơ đăng ký xét tuyển theo đúng quy định và hoàn tất thủ tục nhập học theo thông báo chính thức của nhà trường.',
      linkText: 'Xem thông tin liên hệ',
      linkUrl: '/contact',
    },
  ]

  return (
    <div className="admissions-page" data-testid="admissions-page">
      {/* Banner */}
      <section className="admissions-banner">
        <div className="admissions-banner-container">
          <span className="admissions-eyebrow">TUYỂN SINH ICTU</span>
          <h1 className="admissions-title">Thông tin tuyển sinh</h1>
          <p className="admissions-subtitle">
            Quy trình đăng ký xét tuyển và đồng hành cùng thí sinh bước vào giảng đường đại học hiện đại.
          </p>
        </div>
      </section>

      {/* Main Process Content */}
      <section className="admissions-content-section">
        <div className="admissions-container">
          <div className="admissions-section-header">
            <span className="section-step-tag">LỘ TRÌNH 4 BƯỚC</span>
            <h2 className="admissions-heading">Quy trình đăng ký xét tuyển tại ICTU</h2>
            <p className="admissions-desc">
              Các bước đơn giản để tìm hiểu và hoàn tất thủ tục đăng ký xét tuyển vào trường.
            </p>
          </div>

          <div className="admissions-steps-grid">
            {steps.map((item) => (
              <div key={item.stepNumber} className="admission-step-card">
                <div className="step-number-badge">{item.stepNumber}</div>
                <h3 className="step-title">{item.title}</h3>
                <p className="step-desc">{item.desc}</p>
                {item.linkText && item.linkUrl && (
                  <Link to={item.linkUrl} className="step-link">
                    {item.linkText} →
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Consultation CTA Card */}
          <div className="admissions-cta-box">
            <div className="admissions-cta-content">
              <h3 className="cta-box-title">Bạn cần hỗ trợ thêm thông tin tuyển sinh?</h3>
              <p className="cta-box-desc">
                Đội ngũ tư vấn tuyển sinh ICTU luôn sẵn sàng giải đáp mọi câu hỏi của bạn và phụ huynh.
              </p>
            </div>
            <div className="admissions-cta-buttons">
              <Link to="/consultation" className="btn-adm-primary">
                Đăng ký tư vấn miễn phí
              </Link>
              <Link to="/contact" className="btn-adm-outline">
                Liên hệ văn phòng tuyển sinh
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
