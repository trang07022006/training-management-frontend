import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  getPublicProgramOptions,
  type PublicProgramOption,
  type RequestFunction,
} from '../api/publicConsultationApi'
import { getProgramVisualMeta } from '../utils/programAssets'
import './PublicProgramDetailPage.css'

export interface PublicProgramDetailPageProps {
  apiOrigin?: string
  requestFn?: RequestFunction
}

// Mở rộng interface nếu backend trong tương lai trả thêm public fields
export interface DetailedPublicProgram extends PublicProgramOption {
  duration?: number | string | null
  credits?: number | string | null
  status?: string | null
}

export function PublicProgramDetailPage({
  apiOrigin,
  requestFn,
}: PublicProgramDetailPageProps) {
  const { id } = useParams<{ id: string }>()
  const [program, setProgram] = useState<DetailedPublicProgram | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    getPublicProgramOptions(requestFn, apiOrigin)
      .then((programs) => {
        if (!isMounted) return
        const matched = programs.find((p) => String(p.id) === String(id))
        if (matched) {
          setProgram(matched as DetailedPublicProgram)
        } else {
          setProgram(null)
        }
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String(err.message)
            : 'Không thể tải thông tin chương trình đào tạo.'
        setErrorMessage(msg)
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [id, apiOrigin, requestFn])

  const visual = program ? getProgramVisualMeta(program.code, program.name) : null

  return (
    <div className="program-detail-page" data-testid="program-detail-page">
      {/* Breadcrumb Navigation */}
      <nav className="detail-breadcrumb" aria-label="Đường dẫn điều hướng">
        <div className="detail-breadcrumb-container">
          <Link to="/" className="breadcrumb-link">
            Trang chủ
          </Link>
          <span className="breadcrumb-separator" aria-hidden="true">
            /
          </span>
          <Link to="/programs" className="breadcrumb-link">
            Chương trình đào tạo
          </Link>
          <span className="breadcrumb-separator" aria-hidden="true">
            /
          </span>
          <span className="breadcrumb-current" aria-current="page">
            {isLoading ? 'Đang tải...' : program ? program.name : 'Chi tiết'}
          </span>
        </div>
      </nav>

      <div className="detail-container">
        {/* Loading State */}
        {isLoading && (
          <div className="detail-status-card" data-testid="detail-loading-state">
            <div className="status-spinner" aria-hidden="true" />
            <p>Đang tải thông tin chi tiết chương trình đào tạo...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="detail-status-card error-card" role="alert" data-testid="detail-error-state">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="40"
              height="40"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h2 className="status-heading">Không thể kết nối máy chủ</h2>
            <p className="status-text">{errorMessage}</p>
            <Link to="/programs" className="btn-back-programs">
              ← Quay lại danh sách chương trình
            </Link>
          </div>
        )}

        {/* Not Found State */}
        {!isLoading && !errorMessage && !program && (
          <div className="detail-status-card" data-testid="detail-not-found-state">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="48"
              height="48"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h2 className="status-heading">Không tìm thấy chương trình đào tạo</h2>
            <p className="status-text">
              Chương trình đào tạo bạn tìm kiếm không tồn tại hoặc đã ngừng mở công khai.
            </p>
            <Link to="/programs" className="btn-back-programs">
              ← Quay lại danh mục chương trình
            </Link>
          </div>
        )}

        {/* Program Detail Content */}
        {!isLoading && !errorMessage && program && visual && (
          <article className="program-detail-card" data-testid="program-detail-content">
            {/* Header Banner */}
            <header
              className="detail-header-banner"
              style={{ background: visual.bgGradient }}
            >
              <div className="detail-meta-row">
                <span className="detail-category-badge">{visual.category}</span>
                <span className="detail-code-badge" data-testid="detail-program-code">
                  Mã CTĐT: {program.code}
                </span>
              </div>
              <h1 className="detail-program-title" data-testid="detail-program-name">
                {program.name}
              </h1>
            </header>

            {/* Body */}
            <div className="detail-card-body">
              {/* Description Section */}
              <section className="detail-section">
                <h2 className="detail-section-title">Mục tiêu & Giới thiệu chương trình</h2>
                {program.description ? (
                  <p className="detail-description-text" data-testid="detail-program-desc">
                    {program.description}
                  </p>
                ) : (
                  <p className="detail-description-text text-muted">
                    Chương trình đào tạo chính quy được xây dựng theo chuẩn quốc tế, trang bị cho người học
                    kiến thức chuyên sâu và kỹ năng thực hành hiện đại, sẵn sàng đáp ứng yêu cầu tuyển dụng
                    của các tập đoàn công nghệ lớn.
                  </p>
                )}
              </section>

              {/* Public Fields (nếu API có) */}
              {(program.duration || program.credits || program.status) && (
                <section className="detail-section">
                  <h2 className="detail-section-title">Thông tin tổng quan</h2>
                  <div className="detail-info-grid">
                    {program.duration && (
                      <div className="info-grid-item">
                        <span className="info-item-label">Thời gian đào tạo:</span>
                        <span className="info-item-value">{program.duration} học kỳ</span>
                      </div>
                    )}
                    {program.credits && (
                      <div className="info-grid-item">
                        <span className="info-item-label">Tổng tín chỉ:</span>
                        <span className="info-item-value">{program.credits} tín chỉ</span>
                      </div>
                    )}
                    {program.status && (
                      <div className="info-grid-item">
                        <span className="info-item-label">Trạng thái tuyển sinh:</span>
                        <span className="info-item-value">Đang tuyển sinh</span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Consultation CTA Banner */}
              <div className="detail-cta-card">
                <div className="detail-cta-info">
                  <h3 className="detail-cta-title">Quan tâm đến ngành học này?</h3>
                  <p className="detail-cta-desc">
                    Đăng ký thông tin để nhận tư vấn chi tiết về lộ trình đào tạo, học phí và phương thức xét tuyển.
                  </p>
                </div>
                <Link
                  to={`/consultation?program=${encodeURIComponent(program.id)}`}
                  className="btn-consultation-program"
                  data-testid="program-consultation-cta"
                >
                  Đăng ký tư vấn chương trình này
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
              </div>

              {/* Back Link */}
              <div className="detail-footer-nav">
                <Link to="/programs" className="btn-back-link">
                  ← Xem các chương trình đào tạo khác
                </Link>
              </div>
            </div>
          </article>
        )}
      </div>
    </div>
  )
}
