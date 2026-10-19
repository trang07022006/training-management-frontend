import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getRoleHomePath } from '../auth/roleRouting'
import './PublicLayout.css'

export function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  let session: ReturnType<typeof useSession> | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    session = useSession()
  } catch {
    session = null
  }

  const hasSession = session?.hasSession
  const role = session?.role

  const closeMenu = () => setMobileMenuOpen(false)

  // Đóng mobile menu khi nhấn ESC
  useEffect(() => {
    if (!mobileMenuOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileMenuOpen])

  // Đóng mobile menu khi chuyển về màn hình desktop lớn
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1120 && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mobileMenuOpen])

  const dashboardPath = role ? getRoleHomePath(role) : '/dashboard'

  return (
    <div className="public-site-wrapper">
      {/* Header */}
      <header className="public-header" data-testid="public-header">
        <div className="public-header-container">
          <Link
            to="/"
            className="public-brand"
            onClick={closeMenu}
            aria-label="Về trang chủ Trường Đại học Công nghệ Thông tin và Truyền thông ICTU"
          >
            <img
              src="/branding/ictu/logo.png"
              alt="Logo Trường Đại học Công nghệ Thông tin và Truyền thông - ICTU"
              className="public-brand-logo"
              data-testid="public-brand-logo"
            />
            <div className="public-brand-titles">
              <span className="public-brand-uni">ĐẠI HỌC THÁI NGUYÊN</span>
              <span className="public-brand-name">
                TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG
              </span>
              <span className="public-brand-abbr">ICTU • KHOA HỌC & CÔNG NGHỆ</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="public-nav-desktop" aria-label="Điều hướng chính">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `public-nav-link ${isActive ? 'is-active' : ''}`
              }
            >
              Trang chủ
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `public-nav-link ${isActive ? 'is-active' : ''}`
              }
            >
              Giới thiệu
            </NavLink>
            <NavLink
              to="/programs"
              className={({ isActive }) =>
                `public-nav-link ${isActive ? 'is-active' : ''}`
              }
            >
              Chương trình đào tạo
            </NavLink>
            <NavLink
              to="/admissions"
              className={({ isActive }) =>
                `public-nav-link ${isActive ? 'is-active' : ''}`
              }
            >
              Tuyển sinh
            </NavLink>
            <NavLink
              to="/contact"
              className={({ isActive }) =>
                `public-nav-link ${isActive ? 'is-active' : ''}`
              }
            >
              Liên hệ
            </NavLink>
          </nav>

          {/* Desktop Header Actions */}
          <div className="public-header-actions">
            <Link
              to="/consultation"
              className="public-cta-btn public-cta-consultation"
              data-testid="header-consultation-btn"
            >
              Đăng ký tư vấn
            </Link>

            {hasSession ? (
              <Link
                to={dashboardPath}
                className="public-cta-btn public-cta-login"
                data-testid="header-dashboard-btn"
              >
                Vào hệ thống
              </Link>
            ) : (
              <Link
                to="/login"
                className="public-cta-btn public-cta-login"
                data-testid="header-login-btn"
              >
                Đăng nhập
              </Link>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="public-mobile-toggle"
              aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu điều hướng'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              data-testid="mobile-menu-toggle"
            >
              {mobileMenuOpen ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="24"
                  height="24"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="24"
                  height="24"
                  aria-hidden="true"
                >
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer & Backdrop */}
        {mobileMenuOpen && (
          <>
            <div
              className="public-mobile-backdrop"
              onClick={closeMenu}
              aria-hidden="true"
            />
            <div
              className="public-nav-mobile"
              data-testid="public-mobile-menu"
              aria-label="Menu di động"
            >
              <div className="public-nav-mobile-inner">
                <nav className="public-mobile-links-group" aria-label="Điều hướng di động">
                  <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                      `public-mobile-link ${isActive ? 'is-active' : ''}`
                    }
                    onClick={closeMenu}
                  >
                    <span className="public-mobile-link-text">Trang chủ</span>
                    <span className="public-mobile-link-arrow" aria-hidden="true">→</span>
                  </NavLink>
                  <NavLink
                    to="/about"
                    className={({ isActive }) =>
                      `public-mobile-link ${isActive ? 'is-active' : ''}`
                    }
                    onClick={closeMenu}
                  >
                    <span className="public-mobile-link-text">Giới thiệu</span>
                    <span className="public-mobile-link-arrow" aria-hidden="true">→</span>
                  </NavLink>
                  <NavLink
                    to="/programs"
                    className={({ isActive }) =>
                      `public-mobile-link ${isActive ? 'is-active' : ''}`
                    }
                    onClick={closeMenu}
                  >
                    <span className="public-mobile-link-text">Chương trình đào tạo</span>
                    <span className="public-mobile-link-arrow" aria-hidden="true">→</span>
                  </NavLink>
                  <NavLink
                    to="/admissions"
                    className={({ isActive }) =>
                      `public-mobile-link ${isActive ? 'is-active' : ''}`
                    }
                    onClick={closeMenu}
                  >
                    <span className="public-mobile-link-text">Tuyển sinh</span>
                    <span className="public-mobile-link-arrow" aria-hidden="true">→</span>
                  </NavLink>
                  <NavLink
                    to="/contact"
                    className={({ isActive }) =>
                      `public-mobile-link ${isActive ? 'is-active' : ''}`
                    }
                    onClick={closeMenu}
                  >
                    <span className="public-mobile-link-text">Liên hệ</span>
                    <span className="public-mobile-link-arrow" aria-hidden="true">→</span>
                  </NavLink>
                </nav>

                <div className="public-mobile-actions">
                  <Link
                    to="/consultation"
                    className="public-mobile-cta public-cta-consultation"
                    onClick={closeMenu}
                  >
                    Đăng ký tư vấn
                  </Link>
                  {hasSession ? (
                    <Link
                      to={dashboardPath}
                      className="public-mobile-cta public-cta-login"
                      onClick={closeMenu}
                    >
                      Vào hệ thống
                    </Link>
                  ) : (
                    <Link
                      to="/login"
                      className="public-mobile-cta public-cta-login"
                      onClick={closeMenu}
                    >
                      Đăng nhập
                    </Link>
                  )}
                </div>

                <div className="public-mobile-quick-info">
                  <div className="public-mobile-info-item">
                    <span className="public-mobile-info-label">Hotline:</span>
                    <a href="tel:02083846254" className="public-mobile-info-val">0208.3846.254</a>
                  </div>
                  <div className="public-mobile-info-item">
                    <span className="public-mobile-info-label">Email:</span>
                    <a href="mailto:contact@ictu.edu.vn" className="public-mobile-info-val">contact@ictu.edu.vn</a>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Main Content Area */}
      <main className="public-main-content" id="main-content">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="public-footer" data-testid="public-footer">
        <div className="public-footer-container">
          {/* Column 1: School Identity */}
          <div className="public-footer-col footer-col-brand">
            <div className="footer-brand-header">
              <img
                src="/branding/ictu/logo.png"
                alt="Logo Trường Đại học Công nghệ Thông tin và Truyền thông"
                className="footer-brand-logo"
              />
              <div>
                <h2 className="footer-brand-title">
                  TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG
                </h2>
                <p className="footer-brand-subtitle">ĐẠI HỌC THÁI NGUYÊN</p>
              </div>
            </div>
            <p className="footer-brand-desc">
              Đơn vị công lập tiên phong đào tạo nguồn nhân lực chất lượng cao trong lĩnh vực
              Công nghệ thông tin, Truyền thông và Chuyển đổi số phục vụ sự nghiệp công nghiệp hóa,
              hiện đại hóa đất nước.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div className="public-footer-col footer-col-links">
            <h3 className="footer-col-title">Liên kết nhanh</h3>
            <ul className="footer-links-list">
              <li>
                <Link to="/" className="footer-link">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link to="/about" className="footer-link">
                  Giới thiệu ICTU
                </Link>
              </li>
              <li>
                <Link to="/programs" className="footer-link">
                  Chương trình đào tạo
                </Link>
              </li>
              <li>
                <Link to="/admissions" className="footer-link">
                  Thông tin tuyển sinh
                </Link>
              </li>
              <li>
                <Link to="/consultation" className="footer-link">
                  Đăng ký tư vấn
                </Link>
              </li>
              <li>
                <Link to="/contact" className="footer-link">
                  Thông tin liên hệ
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact Details */}
          <div className="public-footer-col footer-col-contact">
            <h3 className="footer-col-title">Thông tin liên hệ</h3>
            <div className="footer-contact-items">
              <div className="footer-contact-item">
                <svg
                  className="contact-item-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>Đường Z115, Xã Quyết Thắng, TP. Thái Nguyên, Tỉnh Thái Nguyên</span>
              </div>
              <div className="footer-contact-item">
                <svg
                  className="contact-item-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>Điện thoại: 0208.3846.254 • Hotline tuyển sinh: 0981.090.222</span>
              </div>
              <div className="footer-contact-item">
                <svg
                  className="contact-item-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>Email: contact@ictu.edu.vn</span>
              </div>
              <div className="footer-contact-item">
                <svg
                  className="contact-item-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Giờ làm việc: Thứ 2 – Thứ 6 (07:30 - 17:00)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="public-footer-bottom">
          <div className="public-footer-bottom-container">
            <p>
              © {new Date().getFullYear()} Trường Đại học Công nghệ Thông tin và Truyền thông – Đại
              học Thái Nguyên.
            </p>
            <p className="footer-bottom-tagline">
              Kiến tạo tri thức – Kết nối tương lai
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
