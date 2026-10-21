import React from 'react'
import { NavLink } from 'react-router'
import './DetailNavTabs.css'

export interface DetailNavItem {
    key: string
    label: string
    path: string
    icon?: React.ReactNode
    badge?: string | number
    end?: boolean
}

export interface DetailNavTabsProps {
    items: readonly DetailNavItem[]
    className?: string
}

export const DetailNavTabs: React.FC<DetailNavTabsProps> = ({ items, className = '' }) => {
    return (
        <nav className={`detail-nav-tabs-container ${className}`} aria-label="Thanh điều hướng chi tiết">
            <ul className="detail-nav-tabs-list">
                {items.map((item) => (
                    <li key={item.key} className="detail-nav-tab-item">
                        <NavLink
                            to={item.path}
                            end={item.end !== undefined ? item.end : item.path.split('/').length <= 3}
                            className={({ isActive }) =>
                                `detail-nav-tab-link ${isActive ? 'active' : ''}`
                            }
                        >
                            {item.icon && <span className="detail-nav-tab-icon">{item.icon}</span>}
                            <span className="detail-nav-tab-label">{item.label}</span>
                            {item.badge !== undefined && item.badge !== null && (
                                <span className="detail-nav-tab-badge">{item.badge}</span>
                            )}
                        </NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    )
}
