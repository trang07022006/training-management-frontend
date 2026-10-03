import { useState, useEffect, useCallback } from 'react'
import { useSession } from '../auth/SessionProvider'
import { downloadUserImportTemplateApi } from '../api/userApi'
import { getErrorMessage } from '../utils/errorMessages'
import './UserModal.css'
import './BulkUserImportModal.css'

export interface BulkUserImportModalProps {
    isOpen: boolean
    onClose: () => void
    customRequest?: (path: string, init?: RequestInit) => Promise<Response>
}

/**
 * Modal Import Người dùng từ Excel (SCRUM-119 Activity A6.1).
 * Cung cấp quy trình 3 bước:
 * 1. Tải file Excel mẫu chuẩn (Hoạt động ở A6.1)
 * 2. Chọn file Excel người dùng (Dựng UI ở A6.1)
 * 3. Kiểm tra và import (Chờ A6.2)
 */
export function BulkUserImportModal({
    isOpen,
    onClose,
    customRequest,
}: BulkUserImportModalProps) {
    const { request: sessionRequest } = useSession()
    const requestFn = customRequest ?? sessionRequest

    const [isDownloading, setIsDownloading] = useState(false)
    const [downloadSuccess, setDownloadSuccess] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Reset state khi mở hoặc đóng modal
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
    if (isOpen !== prevIsOpen) {
        setPrevIsOpen(isOpen)
        setIsDownloading(false)
        setDownloadSuccess(false)
        setErrorMessage(null)
    }

    const handleClose = useCallback(() => {
        setIsDownloading(false)
        setDownloadSuccess(false)
        setErrorMessage(null)
        onClose()
    }, [onClose])

    // Hỗ trợ phím Escape đóng modal
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isDownloading) {
                handleClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, isDownloading, handleClose])

    if (!isOpen) return null

    /**
     * Xử lý tải file Excel mẫu về máy người dùng
     */
    const handleDownloadTemplate = async () => {
        setIsDownloading(true)
        setErrorMessage(null)
        setDownloadSuccess(false)

        try {
            const blob = await downloadUserImportTemplateApi(requestFn)

            // Tạo link tải file xuống trình duyệt
            const downloadUrl = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = downloadUrl
            link.download = 'user_import_template.xlsx'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(downloadUrl)

            setDownloadSuccess(true)
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Không thể tải file mẫu. Vui lòng thử lại.'))
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <div
            className="modal-backdrop"
            data-testid="bulk-import-modal-backdrop"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isDownloading) {
                    handleClose()
                }
            }}
        >
            <div
                className="modal-container import-modal-container"
                data-testid="bulk-import-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="import-modal-title"
            >
                {/* Header */}
                <div className="modal-header">
                    <h2 id="import-modal-title" className="modal-title">
                        Import người dùng từ Excel
                    </h2>
                    <button
                        type="button"
                        className="modal-close-btn"
                        data-testid="btn-close-import-modal"
                        onClick={handleClose}
                        disabled={isDownloading}
                        aria-label="Đóng modal"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    <p className="import-modal-description" data-testid="import-modal-description">
                        Tải file mẫu, điền thông tin người dùng và tải file lên để kiểm tra trước khi import.
                    </p>

                    {/* Banner hiển thị lỗi nếu tải file mẫu thất bại */}
                    {errorMessage && (
                        <div className="modal-banner-error" data-testid="import-error-banner" role="alert">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <div className="import-steps-container">
                        {/* Bước 1: Tải file mẫu */}
                        <div className="import-step-card active" data-testid="import-step-1">
                            <div className="import-step-header">
                                <span className="import-step-badge">1</span>
                                <h3 className="import-step-title">Bước 1 – Tải file mẫu</h3>
                            </div>
                            <p className="import-step-desc">
                                Tải file Excel mẫu (.xlsx) chuẩn hóa để chuẩn bị dữ liệu người dùng cần nhập.
                            </p>
                            <div className="import-step-action">
                                <button
                                    type="button"
                                    className="btn-download-template"
                                    data-testid="btn-download-template"
                                    onClick={handleDownloadTemplate}
                                    disabled={isDownloading}
                                >
                                    {isDownloading ? (
                                        <>
                                            <svg className="import-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                            </svg>
                                            <span>Đang tải...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="7 10 12 15 17 10" />
                                                <line x1="12" y1="15" x2="12" y2="3" />
                                            </svg>
                                            <span>Tải file mẫu</span>
                                        </>
                                    )}
                                </button>

                                {downloadSuccess && (
                                    <span className="import-feedback-success" data-testid="download-success-msg">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        <span>Đã tải file mẫu.</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Bước 2: Chọn file Excel */}
                        <div className="import-step-card disabled" data-testid="import-step-2">
                            <div className="import-step-header">
                                <span className="import-step-badge inactive">2</span>
                                <h3 className="import-step-title">Bước 2 – Chọn file Excel</h3>
                            </div>
                            <p className="import-step-desc">
                                Chọn file .xlsx đã điền đầy đủ dữ liệu người dùng theo đúng cấu trúc cột.
                            </p>
                            <div className="import-dropzone-placeholder" data-testid="import-dropzone">
                                <svg className="import-dropzone-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="12" y1="18" x2="12" y2="12" />
                                    <line x1="9" y1="15" x2="12" y2="12" />
                                    <line x1="15" y1="15" x2="12" y2="12" />
                                </svg>
                                <p className="import-dropzone-text">Khu vực chọn và tải lên file Excel</p>
                                <p className="import-dropzone-hint">(Tính năng kiểm tra và tải file sẽ khả dụng ở bước tiếp theo)</p>
                            </div>
                        </div>

                        {/* Bước 3: Kiểm tra và import */}
                        <div className="import-step-card disabled" data-testid="import-step-3">
                            <div className="import-step-header">
                                <span className="import-step-badge inactive">3</span>
                                <h3 className="import-step-title">Bước 3 – Kiểm tra và import</h3>
                            </div>
                            <p className="import-step-desc">
                                Xem trước danh sách dữ liệu hợp lệ và phát hiện lỗi trước khi lưu vào hệ thống.
                            </p>
                            <div className="import-step-info-box">
                                Hệ thống sẽ phân tích từng dòng và hiển thị kết quả chi tiết trước khi xác nhận import.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn-cancel"
                        data-testid="btn-close-import-footer"
                        onClick={handleClose}
                        disabled={isDownloading}
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    )
}
