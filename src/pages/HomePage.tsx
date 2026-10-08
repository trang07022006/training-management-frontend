import React, { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  getPublicProgramOptions,
  submitPublicConsultation,
  type PublicProgramOption,
  type RequestFunction,
} from '../api/publicConsultationApi'
import { getProgramVisualMeta } from '../utils/programAssets'
import './HomePage.css'

export interface HomePageProps {
  apiOrigin?: string
  requestFn?: RequestFunction
}

export function HomePage({ apiOrigin, requestFn }: HomePageProps) {
  // Programs state
  const [programs, setPrograms] = useState<PublicProgramOption[]>([])
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true)
  const [programError, setProgramError] = useState<string | null>(null)

  // Compact consultation form state
  const [compactFullName, setCompactFullName] = useState('')
  const [compactPhone, setCompactPhone] = useState('')
  const [compactEmail, setCompactEmail] = useState('')
  const [compactProgramId, setCompactProgramId] = useState('')
  const [formErrors, setFormErrors] = useState<{ fullName?: string; phone?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Load programs from REAL API
  useEffect(() => {
    let isMounted = true

    getPublicProgramOptions(requestFn, apiOrigin)
      .then((data) => {
        if (isMounted) {
          setPrograms(data)
          setIsLoadingPrograms(false)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const message =
            err && typeof err === 'object' && 'message' in err
              ? String(err.message)
              : 'Không thể tải danh sách chương trình đào tạo.'
          setProgramError(message)
          setIsLoadingPrograms(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [apiOrigin, requestFn])

  // Handle Compact Consultation Submit
  const handleCompactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    const errors: { fullName?: string; phone?: string } = {}
    if (!compactFullName.trim()) {
      errors.fullName = 'Vui lòng nhập họ và tên.'
    }
    if (!compactPhone.trim()) {
      errors.phone = 'Vui lòng nhập số điện thoại.'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setFormErrors({})
    setIsSubmitting(true)

    try {
      await submitPublicConsultation(
        {
          full_name: compactFullName.trim(),
          phone: compactPhone.trim(),
          email: compactEmail.trim() ? compactEmail.trim() : null,
          interested_program_id: compactProgramId ? compactProgramId : null,
        },
        requestFn,
        apiOrigin,
      )
      setSubmitSuccess(true)
      setCompactFullName('')
      setCompactPhone('')
      setCompactEmail('')
      setCompactProgramId('')
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : 'Không thể gửi đăng ký lúc này. Vui lòng thử lại sau.'
      setSubmitError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Display at most 4 programs on homepage
  const featuredPrograms = programs.slice(0, 4)

  return (
    <div className="home-page-container">
      {/* ===================================================================
          A2: SECTION 1 – HERO
          =================================================================== */}
      <section className="home-hero-section" aria-label="Giới thiệu trường">
        <div className="home-hero-container">
          {/* Left Column */}
          <div className="home-hero-content">
            <div className="home-hero-eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              <span>KIẾN TẠO TRI THỨC – KẾT NỐI TƯƠNG LAI</span>
            </div>

            <h1 className="home-hero-heading">
              Khám phá ICTU – <br />
              <span className="heading-highlight">Môi trường học tập hiện đại</span> <br />
              cho thế hệ số
            </h1>

            <p className="home-hero-desc">
              Trường Đại học Công nghệ Thông tin và Truyền thông – Đại học Thái Nguyên tiên phong đào tạo
              nguồn nhân lực chất lượng cao trong các lĩnh vực công nghệ số, truyền thông và trí tuệ nhân tạo,
              gắn kết chặt chẽ với nhu cầu thực tiễn của doanh nghiệp.
            </p>

            <div className="home-hero-actions">
              <Link to="/programs" className="hero-btn hero-btn-primary">
                Tìm hiểu chương trình
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="18"
                  height="18"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <Link to="/consultation" className="hero-btn hero-btn-outline">
                Đăng ký tư vấn
              </Link>
            </div>
          </div>

          {/* Right Column: Real ICTU Building Photo */}
          <div className="home-hero-media">
            <div className="hero-image-card">
              <img
                src="/branding/ictu/ictu-building.jpg"
                alt="Tòa nhà Trung tâm Trường Đại học Công nghệ Thông tin và Truyền thông - ICTU"
                className="hero-image"
                data-testid="hero-building-image"
              />
              <div className="hero-image-badge">
                <div className="badge-icon-box">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="20"
                    height="20"
                    aria-hidden="true"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <div className="badge-texts">
                  <span className="badge-title">Khuôn viên hiện đại ICTU</span>
                  <span className="badge-subtitle">Cơ sở vật chất đạt chuẩn</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          A3: SECTION 2 – GIỚI THIỆU NHANH
          =================================================================== */}
      <section className="home-about-section" aria-label="Về ICTU">
        <div className="home-section-container">
          <div className="section-header text-center">
            <span className="section-eyebrow">VỀ ICTU</span>
            <h2 className="section-heading">Nơi chắp cánh ước mơ trong kỷ nguyên số</h2>
            <p className="section-desc">
              ICTU mang đến môi trường giáo dục đại học năng động, lấy người học làm trung tâm,
              tạo điều kiện tối đa để sinh viên tiếp cận tri thức mới và phát huy năng lực sáng tạo.
            </p>
          </div>

          <div className="about-cards-grid">
            {/* Card 1 */}
            <div className="about-feature-card">
              <div className="feature-icon-wrapper icon-blue">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="28"
                  height="28"
                  aria-hidden="true"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <h3 className="feature-title">Môi trường học tập hiện đại</h3>
              <p className="feature-desc">
                Phòng học thông minh, hệ thống phòng thực hành và trung tâm dữ liệu tiên tiến,
                đáp ứng nhu cầu nghiên cứu và ứng dụng công nghệ trực tiếp trong quá trình học tập.
              </p>
            </div>

            {/* Card 2 */}
            <div className="about-feature-card">
              <div className="feature-icon-wrapper icon-cyan">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="28"
                  height="28"
                  aria-hidden="true"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="feature-title">Đội ngũ giảng viên tận huyết</h3>
              <p className="feature-desc">
                Các giảng viên, chuyên gia có trình độ cao, giàu kinh nghiệm thực tế từ các dự án
                doanh nghiệp, luôn đồng hành hỗ trợ sinh viên trong học tập và định hướng nghề nghiệp.
              </p>
            </div>

            {/* Card 3 */}
            <div className="about-feature-card">
              <div className="feature-icon-wrapper icon-indigo">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="28"
                  height="28"
                  aria-hidden="true"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h3 className="feature-title">Cơ sở vật chất đồng bộ</h3>
              <p className="feature-desc">
                Khuôn viên xanh rộng rãi, hệ thống giảng đường C2, thư viện hiện đại, sân trường
                và các khu tiện ích thể thao tạo nên môi trường rèn luyện toàn diện cả thể chất lẫn trí tuệ.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          A4: SECTION 3 – CHƯƠNG TRÌNH ĐÀO TẠO NỔI BẬT
          =================================================================== */}
      <section className="home-programs-section" aria-label="Chương trình đào tạo nổi bật">
        <div className="home-section-container">
          <div className="section-header-flex">
            <div>
              <span className="section-eyebrow">ĐÀO TẠO ĐẠI HỌC</span>
              <h2 className="section-heading">Chương trình đào tạo nổi bật</h2>
              <p className="section-desc">
                Các ngành học trọng điểm trang bị năng lực chuyên môn và kỹ năng thực hành vững vàng.
              </p>
            </div>
            <Link to="/programs" className="view-all-link">
              Xem tất cả chương trình
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          {/* Loading State */}
          {isLoadingPrograms && (
            <div className="programs-loading-state" data-testid="programs-loading">
              <div className="loading-spinner" aria-hidden="true" />
              <p>Đang tải danh sách chương trình đào tạo...</p>
            </div>
          )}

          {/* Error State */}
          {!isLoadingPrograms && programError && (
            <div className="programs-error-state" role="alert" data-testid="programs-error">
              <p>{programError}</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoadingPrograms && !programError && featuredPrograms.length === 0 && (
            <div className="programs-empty-state" data-testid="programs-empty">
              <div className="empty-state-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="48"
                  height="48"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <h3 className="empty-title">Chưa có chương trình đào tạo mở</h3>
              <p className="empty-desc">
                Hiện tại thông tin chương trình đào tạo công khai đang được cập nhật.
              </p>
            </div>
          )}

          {/* Program Cards Grid (4 columns desktop, 2 tablet, 1 mobile) */}
          {!isLoadingPrograms && !programError && featuredPrograms.length > 0 && (
            <div className="programs-cards-grid" data-testid="featured-programs-grid">
              {featuredPrograms.map((prog) => {
                const visual = getProgramVisualMeta(prog.code, prog.name)
                return (
                  <div key={prog.id} className="program-card" data-testid={`program-card-${prog.id}`}>
                    <div
                      className="program-card-banner"
                      style={{ background: visual.bgGradient }}
                    >
                      <span className="program-category-badge">{visual.category}</span>
                      <span className="program-code-pill">{prog.code}</span>
                    </div>

                    <div className="program-card-body">
                      <h3 className="program-card-name" title={prog.name}>
                        {prog.name}
                      </h3>

                      {prog.description ? (
                        <p className="program-card-desc">{prog.description}</p>
                      ) : (
                        <p className="program-card-desc placeholder-desc">
                          Chương trình đào tạo chính quy với lộ trình giảng dạy chuyên sâu và thực hành thực tế.
                        </p>
                      )}

                      <div className="program-card-footer">
                        <Link
                          to={`/programs/${prog.id}`}
                          className="program-detail-btn"
                          aria-label={`Xem chi tiết chương trình ${prog.name}`}
                        >
                          <span>Xem chi tiết</span>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            width="16"
                            height="16"
                            aria-hidden="true"
                          >
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ===================================================================
          A5: SECTION 4 – CAMPUS GALLERY (KHÔNG GIAN HỌC TẬP & CƠ SỞ VẬT CHẤT)
          =================================================================== */}
      <section className="home-gallery-section" aria-label="Không gian học tập và cơ sở vật chất">
        <div className="home-section-container">
          <div className="section-header text-center">
            <span className="section-eyebrow">KHÔNG GIAN HỌC TẬP & CƠ SỞ VẬT CHẤT</span>
            <h2 className="section-heading">Khuôn viên hiện đại, môi trường học tập lý tưởng</h2>
            <p className="section-desc">
              Khám phá không gian thực tế tại ICTU với các tiện ích phục vụ học tập, nghiên cứu và sinh hoạt.
            </p>
          </div>

          <div className="campus-gallery-grid" data-testid="campus-gallery-grid">
            {/* 1. Tòa nhà trung tâm */}
            <div className="gallery-item gallery-item-large">
              <img
                src="/branding/ictu/ictu-building.jpg"
                alt="Tòa nhà trung tâm ICTU"
                className="gallery-img"
              />
              <div className="gallery-overlay">
                <span className="gallery-caption">Tòa nhà trung tâm</span>
              </div>
            </div>

            {/* 2. Giảng đường C2 */}
            <div className="gallery-item">
              <img
                src="/branding/ictu/ictu-c2-lake.jpg"
                alt="Giảng đường C2 ICTU"
                className="gallery-img"
              />
              <div className="gallery-overlay">
                <span className="gallery-caption">Giảng đường C2</span>
              </div>
            </div>

            {/* 3. Sân trường */}
            <div className="gallery-item">
              <img
                src="/branding/ictu/ictu-campus.jpg"
                alt="Sân trường ICTU"
                className="gallery-img"
              />
              <div className="gallery-overlay">
                <span className="gallery-caption">Sân trường</span>
              </div>
            </div>

            {/* 4. Hồ điều hòa trong khuôn viên */}
            <div className="gallery-item">
              <img
                src="/branding/ictu/ictu-lake.jpg"
                alt="Hồ điều hòa trong khuôn viên ICTU"
                className="gallery-img"
              />
              <div className="gallery-overlay">
                <span className="gallery-caption">Hồ điều hòa trong khuôn viên</span>
              </div>
            </div>

            {/* 5. Cổng trường ICTU */}
            <div className="gallery-item">
              <img
                src="/branding/ictu/ictu-gate.jpg"
                alt="Cổng trường ICTU"
                className="gallery-img"
              />
              <div className="gallery-overlay">
                <span className="gallery-caption">Cổng trường ICTU</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          A6: SECTION 5 – CONSULTATION CTA (ĐĂNG KÝ TƯ VẤN)
          =================================================================== */}
      <section className="home-consultation-section" aria-label="Đăng ký tư vấn">
        <div className="home-section-container">
          <div className="consultation-banner-card">
            <div className="consultation-banner-info">
              <span className="section-eyebrow eyebrow-light">ĐĂNG KÝ TƯ VẤN</span>
              <h2 className="consultation-banner-title">Nhận tư vấn tuyển sinh từ ICTU</h2>
              <p className="consultation-banner-desc">
                Để lại thông tin để cán bộ tuyển sinh liên hệ giải đáp phương thức xét tuyển,
                học phí và định hướng ngành nghề chi tiết.
              </p>
              <div className="consultation-perks">
                <div className="perk-item">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="18"
                    height="18"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Tư vấn định hướng ngành học phù hợp</span>
                </div>
                <div className="perk-item">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="18"
                    height="18"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Hướng dẫn nộp hồ sơ xét tuyển nhanh chóng</span>
                </div>
              </div>

              <div className="full-consultation-link-row">
                <Link to="/consultation" className="btn-full-consultation">
                  Xem trang tư vấn đầy đủ →
                </Link>
              </div>
            </div>

            {/* Compact Form */}
            <div className="consultation-banner-form">
              {submitSuccess ? (
                <div className="compact-success-box" role="status" data-testid="compact-submit-success">
                  <div className="compact-success-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      width="32"
                      height="32"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h3>Gửi thông tin thành công!</h3>
                  <p>Ban tư vấn tuyển sinh ICTU sẽ liên hệ với bạn trong thời gian sớm nhất.</p>
                  <button
                    type="button"
                    className="btn-send-again"
                    onClick={() => setSubmitSuccess(false)}
                  >
                    Gửi yêu cầu khác
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleCompactSubmit}
                  className="compact-form"
                  noValidate
                  data-testid="compact-consultation-form"
                >
                  <h3 className="form-header-title">Đăng ký nhận thông tin</h3>

                  {submitError && (
                    <div className="form-alert-error" role="alert">
                      {submitError}
                    </div>
                  )}

                  {/* Họ và tên */}
                  <div className="form-field-group">
                    <label htmlFor="compact-fullname" className="compact-label">
                      Họ và tên <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      id="compact-fullname"
                      className={`compact-input ${formErrors.fullName ? 'has-error' : ''}`}
                      placeholder="Nguyễn Văn A"
                      value={compactFullName}
                      onChange={(e) => setCompactFullName(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                    {formErrors.fullName && (
                      <span className="field-err-text">{formErrors.fullName}</span>
                    )}
                  </div>

                  {/* Số điện thoại */}
                  <div className="form-field-group">
                    <label htmlFor="compact-phone" className="compact-label">
                      Số điện thoại <span className="req">*</span>
                    </label>
                    <input
                      type="tel"
                      id="compact-phone"
                      className={`compact-input ${formErrors.phone ? 'has-error' : ''}`}
                      placeholder="0912345678"
                      value={compactPhone}
                      onChange={(e) => setCompactPhone(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                    {formErrors.phone && (
                      <span className="field-err-text">{formErrors.phone}</span>
                    )}
                  </div>

                  {/* Email */}
                  <div className="form-field-group">
                    <label htmlFor="compact-email" className="compact-label">
                      Email
                    </label>
                    <input
                      type="email"
                      id="compact-email"
                      className="compact-input"
                      placeholder="email@example.com"
                      value={compactEmail}
                      onChange={(e) => setCompactEmail(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Chương trình quan tâm */}
                  <div className="form-field-group">
                    <label htmlFor="compact-program" className="compact-label">
                      Chương trình quan tâm
                    </label>
                    <select
                      id="compact-program"
                      className="compact-select"
                      value={compactProgramId}
                      onChange={(e) => setCompactProgramId(e.target.value)}
                      disabled={isSubmitting || isLoadingPrograms || programs.length === 0}
                    >
                      <option value="">-- Chọn chương trình (nếu có) --</option>
                      {programs.map((prog) => (
                        <option key={prog.id} value={prog.id}>
                          {prog.name} ({prog.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="compact-submit-btn"
                    disabled={isSubmitting}
                    data-testid="compact-submit-btn"
                  >
                    {isSubmitting ? 'Đang gửi...' : 'Gửi đăng ký tư vấn'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
