import React from 'react'
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'
import './PageHeader.css'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  badge?: React.ReactNode
  breadcrumbs?: readonly BreadcrumbItem[]
  actions?: React.ReactNode
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  breadcrumbs,
  actions,
}) => {
  return (
    <header className="ictu-page-header">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} />
      )}
      <div className="ictu-page-header-row">
        <div className="ictu-page-header-titles">
          <div className="ictu-page-title-line">
            <h1 className="ictu-page-title">{title}</h1>
            {badge && <div className="ictu-page-badge-wrapper">{badge}</div>}
          </div>
          {subtitle && <p className="ictu-page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="ictu-page-actions">{actions}</div>}
      </div>
    </header>
  )
}
