import React from 'react'
import './Breadcrumb.css'

export interface BreadcrumbItem {
  label: string
  path?: string
}

export interface BreadcrumbProps {
  items: readonly BreadcrumbItem[]
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav className="ictu-breadcrumb" aria-label="Đường dẫn trang" data-testid="ictu-breadcrumb">
      <ol className="ictu-breadcrumb-list">
        <li className="ictu-breadcrumb-item">
          <a
            href="/"
            className="ictu-breadcrumb-link"
            onClick={(e) => {
              if (typeof window !== 'undefined' && window.location.pathname === '/') {
                e.preventDefault()
              }
            }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Trang chủ</span>
          </a>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={index} className="ictu-breadcrumb-item">
              <span className="ictu-breadcrumb-separator" aria-hidden="true">/</span>
              {isLast || !item.path ? (
                <span className="ictu-breadcrumb-current" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <a href={item.path} className="ictu-breadcrumb-link">
                  {item.label}
                </a>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
