import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  getPublicProgramOptions,
  type PublicProgramOption,
  type RequestFunction,
} from '../api/publicConsultationApi'
import { getProgramVisualMeta } from '../utils/programAssets'
import './PublicProgramsPage.css'

export interface PublicProgramsPageProps {
  apiOrigin?: string
  requestFn?: RequestFunction
}

export function PublicProgramsPage({ apiOrigin, requestFn }: PublicProgramsPageProps) {
  const [programs, setPrograms] = useState<PublicProgramOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let isMounted = true

    getPublicProgramOptions(requestFn, apiOrigin)
      .then((data) => {
        if (isMounted) {
          setPrograms(data)
          setIsLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg =
            err && typeof err === 'object' && 'message' in err
              ? String(err.message)
              : 'Không thể tải danh sách chương trình đào tạo.'
          setErrorMessage(msg)
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [apiOrigin, requestFn])

  // Client-side search an toàn theo name và code
  const filteredPrograms = useMemo(() => {
    if (!searchTerm.trim()) {
      return programs
    }
    const q = searchTerm.trim().toLowerCase()
    return programs.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)),
    )
  }, [programs, searchTerm])

  return (
    <div className="public-programs-page" data-testid="public-programs-page">
      {/* Header Banner */}
      <section className="programs-hero-banner">
        <div className="programs-banner-container">
          <span className="banner-eyebrow">ICTU ACADEMICS</span>
          <h1 className="programs-main-title">Chương trình đào tạo</h1>
          <p className="programs-main-desc">
            Danh mục các chương trình đào tạo đại học chính quy tại Trường Đại học Công nghệ
            Thông tin và Truyền thông – Đại học Thái Nguyên.
          </p>

          {/* Search Bar */}
          <div className="programs-search-box">
            <div className="search-input-wrapper">
              <svg
                className="search-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="programs-search-input"
                placeholder="Tìm kiếm chương trình theo tên hoặc mã ngành..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Tìm kiếm chương trình đào tạo"
                data-testid="programs-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearchTerm('')}
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="search-results-count" data-testid="programs-count">
              {!isLoading && (
                <span>
                  Hiển thị <strong>{filteredPrograms.length}</strong> / {programs.length} chương trình
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid Content */}
      <section className="programs-content-section">
        <div className="programs-content-container">
          {/* Loading State */}
          {isLoading && (
            <div className="programs-status-card" data-testid="programs-loading-state">
              <div className="status-spinner" aria-hidden="true" />
              <p>Đang tải danh sách chương trình đào tạo...</p>
            </div>
          )}

          {/* Error State */}
          {!isLoading && errorMessage && (
            <div className="programs-status-card error-card" role="alert" data-testid="programs-error-state">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="36"
                height="36"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <h3 className="status-title">Không thể kết nối đến máy chủ</h3>
              <p className="status-desc">{errorMessage}</p>
            </div>
          )}

          {/* Empty State: No programs at all */}
          {!isLoading && !errorMessage && programs.length === 0 && (
            <div className="programs-status-card" data-testid="programs-empty-state">
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
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <h3 className="status-title">Chưa có chương trình đào tạo</h3>
              <p className="status-desc">
                Hiện tại hệ thống chưa mở công khai chương trình đào tạo nào. Vui lòng quay lại sau.
              </p>
            </div>
          )}

          {/* Empty State: Search found nothing */}
          {!isLoading && !errorMessage && programs.length > 0 && filteredPrograms.length === 0 && (
            <div className="programs-status-card" data-testid="programs-search-empty">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="44"
                height="44"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <h3 className="status-title">Không tìm thấy kết quả phù hợp</h3>
              <p className="status-desc">
                Không tìm thấy chương trình nào với từ khóa &ldquo;{searchTerm}&rdquo;. Hãy thử tìm với từ khóa khác.
              </p>
              <button
                type="button"
                className="btn-reset-search"
                onClick={() => setSearchTerm('')}
              >
                Xóa tìm kiếm
              </button>
            </div>
          )}

          {/* Grid Cards (4 columns desktop, 2 tablet, 1 mobile) */}
          {!isLoading && !errorMessage && filteredPrograms.length > 0 && (
            <div className="public-programs-grid" data-testid="public-programs-grid">
              {filteredPrograms.map((prog) => {
                const visual = getProgramVisualMeta(prog.code, prog.name)
                return (
                  <div
                    key={prog.id}
                    className="public-program-card"
                    data-testid={`public-program-card-${prog.id}`}
                  >
                    <div
                      className="card-banner"
                      style={{ background: visual.bgGradient }}
                    >
                      <span className="card-category-tag">{visual.category}</span>
                      <span className="card-code-pill">{prog.code}</span>
                    </div>

                    <div className="card-body">
                      <h2 className="card-title" title={prog.name}>
                        {prog.name}
                      </h2>

                      {prog.description ? (
                        <p className="card-description">{prog.description}</p>
                      ) : (
                        <p className="card-description placeholder-desc">
                          Chương trình đào tạo chính quy, cập nhật liên tục theo xu hướng công nghệ mới.
                        </p>
                      )}

                      <div className="card-actions">
                        <Link
                          to={`/programs/${prog.id}`}
                          className="btn-view-detail"
                          aria-label={`Xem chi tiết ${prog.name}`}
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
    </div>
  )
}
