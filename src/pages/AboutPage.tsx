import { Link } from 'react-router'
import './AboutPage.css'

export function AboutPage() {
  return (
    <div className="about-page-container" data-testid="about-page">
      {/* Hero Banner nhỏ */}
      <section className="about-hero-banner">
        <div className="about-banner-container">
          <span className="about-banner-eyebrow">GIỚI THIỆU CHUNG</span>
          <h1 className="about-banner-title">
            Trường Đại học Công nghệ Thông tin và Truyền thông
          </h1>
          <p className="about-banner-subtitle">
            Đại học Thái Nguyên • Tiên phong đào tạo và nghiên cứu khoa học trong kỷ nguyên số
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="about-content-wrapper">
        {/* Section 1: Giới thiệu ICTU */}
        <section className="about-section-block">
          <div className="about-grid-two-col">
            <div className="about-text-content">
              <span className="about-section-tag">VỀ NHÀ TRƯỜNG</span>
              <h2 className="about-section-heading">Nơi khởi đầu của những khát vọng công nghệ</h2>
              <p className="about-paragraph">
                Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU) – thành viên của Đại học Thái Nguyên,
                là cơ sở giáo dục đại học công lập trọng điểm khu vực trung du và miền núi phía Bắc trong đào tạo
                nguồn nhân lực chất lượng cao về công nghệ thông tin, truyền thông và chuyển đổi số.
              </p>
              <p className="about-paragraph">
                Với phương châm lấy người học làm trung tâm, nhà trường không ngừng đổi mới chương trình đào tạo,
                tăng cường thời lượng thực hành và hợp tác chặt chẽ với các doanh nghiệp công nghệ hàng đầu
                để đem lại cơ hội phát triển toàn diện cho sinh viên.
              </p>
            </div>
            <div className="about-media-card">
              <img
                src="/branding/ictu/ictu-building.jpg"
                alt="Tòa nhà trung tâm ICTU"
                className="about-image"
              />
              <span className="media-caption">Tòa nhà trung tâm Trường ĐH CNTT & Truyền thông</span>
            </div>
          </div>
        </section>

        {/* Section 2: Môi trường học tập */}
        <section className="about-section-block">
          <div className="about-grid-two-col reverse-col">
            <div className="about-media-card">
              <img
                src="/branding/ictu/sinh-vien-ictu.jpg"
                alt="Môi trường học tập sinh viên ICTU"
                className="about-image"
              />
              <span className="media-caption">Môi trường học tập năng động và sáng tạo</span>
            </div>
            <div className="about-text-content">
              <span className="about-section-tag">PHƯƠNG CHÂM ĐÀO TẠO</span>
              <h2 className="about-section-heading">Môi trường học tập hiện đại, thực chiến</h2>
              <p className="about-paragraph">
                Sinh viên tại ICTU được tiếp cận phương pháp học tập kết hợp lý thuyết với dự án thực tế ngay từ
                những năm đầu. Các chương trình học được thiết kế bám sát yêu cầu tuyển dụng thực tiễn của thị trường
                lao động công nghệ.
              </p>
              <p className="about-paragraph">
                Bên cạnh kiến thức chuyên môn, nhà trường đặc biệt chú trọng rèn luyện kỹ năng mềm, ngoại ngữ,
                tư duy phản biện và khả năng làm việc nhóm để người học tự tin hội nhập thị trường quốc tế.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Cơ sở vật chất đồng bộ */}
        <section className="about-section-block">
          <div className="about-grid-two-col">
            <div className="about-text-content">
              <span className="about-section-tag">CƠ SỞ VẬT CHẤT</span>
              <h2 className="about-section-heading">Cơ sở vật chất hiện đại, đồng bộ</h2>
              <p className="about-paragraph">
                Hệ thống giảng đường khang trang, phòng máy tính cấu hình cao, phòng thí nghiệm chuyên ngành,
                hệ thống thư viện phong phú và hạ tầng mạng tốc độ cao phục vụ liên tục cho sinh viên và giảng viên
                trong công tác học tập, giảng dạy và nghiên cứu khoa học.
              </p>
              <p className="about-paragraph">
                Khu giảng đường C2 hiện đại bên hồ tạo không gian thoáng đãng, yên tĩnh, tạo cảm hứng học tập
                và nghiên cứu bất tận cho sinh viên.
              </p>
            </div>
            <div className="about-media-card">
              <img
                src="/branding/ictu/ictu-c2-lake.jpg"
                alt="Giảng đường C2 bên hồ ICTU"
                className="about-image"
              />
              <span className="media-caption">Khu giảng đường C2 hiện đại cạnh hồ</span>
            </div>
          </div>
        </section>

        {/* Section 4: Không gian khuôn viên xanh */}
        <section className="about-section-block">
          <div className="about-grid-two-col reverse-col">
            <div className="about-media-card">
              <img
                src="/branding/ictu/ictu-campus.jpg"
                alt="Khuôn viên trường ICTU"
                className="about-image"
              />
              <span className="media-caption">Khuôn viên trường ICTU xanh sạch đẹp</span>
            </div>
            <div className="about-text-content">
              <span className="about-section-tag">KHÔNG GIAN SỐNG & HỌC TẬP</span>
              <h2 className="about-section-heading">Không gian khuôn viên truyền cảm hứng</h2>
              <p className="about-paragraph">
                Khuôn viên trường rộng rãi, rợp bóng cây xanh với hệ thống hồ điều hòa sinh thái, sân trường,
                khu tập luyện thể dục thể thao tạo nên môi trường sống và học tập lý tưởng, lành mạnh
                cho cộng đồng sinh viên.
              </p>
              <div className="about-actions-row">
                <Link to="/programs" className="about-btn-primary">
                  Khám phá chương trình đào tạo
                </Link>
                <Link to="/consultation" className="about-btn-outline">
                  Đăng ký tư vấn ngay
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
