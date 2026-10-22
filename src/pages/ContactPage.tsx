import { Link } from 'react-router'
import './ContactPage.css'

export function ContactPage() {
  const contactCards = [
    {
      title: 'Địa chỉ trụ sở chính',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
      content: ['Đường Z115, Xã Quyết Thắng, Thành phố Thái Nguyên, Tỉnh Thái Nguyên'],
      subtext: 'Khuôn viên chính Trường Đại học Công nghệ Thông tin và Truyền thông',
    },
    {
      title: 'Điện thoại liên hệ',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      ),
      content: ['Văn phòng trường: 0208.3846.254', 'Hotline tuyển sinh: 0981.090.222'],
      subtext: 'Hỗ trợ giải đáp các thủ tục hành chính và tư vấn tuyển sinh',
    },
    {
      title: 'Hộp thư điện tử (Email)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
      content: ['Email chính thức: contact@ictu.edu.vn', 'Bộ phận tuyển sinh: tuyensinh@ictu.edu.vn'],
      subtext: 'Phản hồi trong vòng 24–48 giờ làm việc',
    },
    {
      title: 'Thời gian làm việc',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      content: ['Thứ Hai – Thứ Sáu: 07:30 – 17:00', 'Thứ Bảy & Chủ Nhật: Nghỉ theo quy định'],
      subtext: 'Không làm việc vào các ngày nghỉ lễ, tết theo quy định nhà nước',
    },
  ]

  return (
    <div className="contact-page-container" data-testid="contact-page">
      {/* Banner */}
      <section className="contact-hero-banner">
        <div className="contact-banner-container">
          <span className="contact-eyebrow">KẾT NỐI VỚI CHÚNG TÔI</span>
          <h1 className="contact-title">Liên hệ với chúng tôi</h1>
          <p className="contact-subtitle">
            Mọi thông tin liên hệ chính thức của Trường Đại học Công nghệ Thông tin và Truyền thông.
          </p>
        </div>
      </section>

      {/* Main Grid Content */}
      <div className="contact-content-wrapper">
        <div className="contact-grid">
          {contactCards.map((card, idx) => (
            <div key={idx} className="contact-card">
              <div className="contact-card-icon">{card.icon}</div>
              <h2 className="contact-card-title">{card.title}</h2>
              <div className="contact-card-lines">
                {card.content.map((line, lIdx) => (
                  <p key={lIdx} className="contact-line">
                    {line}
                  </p>
                ))}
              </div>
              <p className="contact-card-subtext">{card.subtext}</p>
            </div>
          ))}
        </div>

        {/* Quick Consultation Redirect Box */}
        <div className="contact-consultation-banner">
          <div className="banner-left">
            <h3 className="banner-title">Bạn muốn đăng ký tư vấn tuyển sinh trực tuyến?</h3>
            <p className="banner-desc">
              Gửi thông tin trực tiếp qua mẫu tư vấn trực tuyến để được cán bộ phụ trách liên hệ nhanh nhất.
            </p>
          </div>
          <Link to="/consultation" className="btn-contact-consultation">
            Đăng ký tư vấn trực tuyến
          </Link>
        </div>
      </div>
    </div>
  )
}
