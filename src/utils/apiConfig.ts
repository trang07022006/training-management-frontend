/**
 * Centralized API Origin Configuration
 * 
 * Đảm bảo các request /api sử dụng cùng origin và đi qua Vite dev proxy tới http://127.0.0.1:5000,
 * loại bỏ độ trễ phân giải IPv6 ::1 của localhost và thống nhất hành vi giữa các cổng 5173, 5174.
 */

export function getApiOrigin(): string {
    if (import.meta.env.VITE_API_ORIGIN) {
        return import.meta.env.VITE_API_ORIGIN
    }
    if (import.meta.env.VITE_API_BASE_URL) {
        return import.meta.env.VITE_API_BASE_URL
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin
    }
    return ''
}
