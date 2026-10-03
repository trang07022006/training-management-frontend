import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from '../auth/SessionProvider'
import {
    downloadUserImportTemplateApi,
    previewUserImportApi,
    importUsersBulkApi,
    type ImportPreviewData,
    type ImportExecuteResult,
} from '../api/userApi'
import { getErrorMessage } from '../utils/errorMessages'
import './UserModal.css'
import './BulkUserImportModal.css'

export interface BulkUserImportModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
    customRequest?: (path: string, init?: RequestInit) => Promise<Response>
}

/**
 * Helper format dung lượng file dễ đọc
 */
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Modal Import Người dùng từ Excel (SCRUM-119 Activity A6.1, A6.2 & A6.3).
 * Cung cấp quy trình 3 bước:
 * 1. Tải file Excel mẫu chuẩn (A6.1)
 * 2. Chọn/tải file Excel và kiểm tra tính hợp lệ (A6.2)
 * 3. Xem trước và xác nhận import vào hệ thống (A6.3)
 */
export function BulkUserImportModal({
    isOpen,
    onClose,
    onSuccess,
    customRequest,
}: BulkUserImportModalProps) {
    const { request: sessionRequest } = useSession()
    const requestFn = customRequest ?? sessionRequest

    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const [isDownloading, setIsDownloading] = useState(false)
    const [downloadSuccess, setDownloadSuccess] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // State cho chọn file và preview (A6.2)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isChecking, setIsChecking] = useState(false)
    const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    // State cho import và kết quả sau import (A6.3)
    const [isImporting, setIsImporting] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [importResult, setImportResult] = useState<ImportExecuteResult | null>(null)

    // Reset toàn bộ state khi đóng/mở modal
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
    if (isOpen !== prevIsOpen) {
        setPrevIsOpen(isOpen)
        setIsDownloading(false)
        setDownloadSuccess(false)
        setErrorMessage(null)
        setSelectedFile(null)
        setPreviewData(null)
        setIsChecking(false)
        setIsDragging(false)
        setIsImporting(false)
        setShowConfirm(false)
        setImportResult(null)
    }

    const handleClose = useCallback(() => {
        if (isDownloading || isChecking || isImporting) return
        setIsDownloading(false)
        setDownloadSuccess(false)
        setErrorMessage(null)
        setSelectedFile(null)
        setPreviewData(null)
        setIsChecking(false)
        setIsDragging(false)
        setIsImporting(false)
        setShowConfirm(false)
        setImportResult(null)
        onClose()
    }, [isDownloading, isChecking, isImporting, onClose])

    // Hỗ trợ phím Escape đóng modal (trừ khi đang bận tải/kiểm tra/import)
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isDownloading && !isChecking && !isImporting) {
                if (showConfirm) {
                    setShowConfirm(false)
                } else {
                    handleClose()
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, isDownloading, isChecking, isImporting, showConfirm, handleClose])

    if (!isOpen) return null

    /**
     * Xử lý tải file Excel mẫu về máy người dùng (Bước 1)
     */
    const handleDownloadTemplate = async () => {
        setIsDownloading(true)
        setErrorMessage(null)
        setDownloadSuccess(false)

        try {
            const blob = await downloadUserImportTemplateApi(requestFn)

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

    /**
     * Validate file và cập nhật state (chỉ chấp nhận .xlsx)
     */
    const handleFileValidationAndSet = (file: File) => {
        // Reset preview cũ, import result cũ và lỗi cũ khi chọn file mới
        setPreviewData(null)
        setImportResult(null)
        setShowConfirm(false)
        setErrorMessage(null)

        if (!file.name.toLowerCase().endsWith('.xlsx')) {
            setSelectedFile(null)
            setErrorMessage('Chỉ hỗ trợ file Excel định dạng .xlsx.')
            return
        }

        setSelectedFile(file)
    }

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFileValidationAndSet(file)
        }
        e.target.value = ''
    }

    const handleRemoveFile = () => {
        setSelectedFile(null)
        setPreviewData(null)
        setImportResult(null)
        setShowConfirm(false)
        setErrorMessage(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleImportAnotherFile = () => {
        setSelectedFile(null)
        setPreviewData(null)
        setImportResult(null)
        setShowConfirm(false)
        setErrorMessage(null)
        setIsChecking(false)
        setIsImporting(false)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!isChecking && !isImporting) {
            setIsDragging(true)
        }
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
        if (isChecking || isImporting) return

        const files = e.dataTransfer.files
        if (files && files.length > 0) {
            handleFileValidationAndSet(files[0])
        }
    }

    /**
     * Gọi API POST /api/users/import/preview kiểm tra dữ liệu
     */
    const handlePreviewData = async () => {
        if (!selectedFile || isChecking || isImporting) return

        setIsChecking(true)
        setErrorMessage(null)

        try {
            const data = await previewUserImportApi(requestFn, selectedFile)
            setPreviewData(data)
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Lỗi khi kiểm tra dữ liệu file Excel.'))
        } finally {
            setIsChecking(false)
        }
    }

    /**
     * Mở xác nhận import khi valid_rows > 0
     */
    const handleStartImport = () => {
        if (!previewData || previewData.valid_rows === 0 || isImporting) return
        setShowConfirm(true)
    }

    /**
     * Thực hiện gọi API POST /api/users/import import người dùng vào hệ thống
     */
    const handleConfirmImport = async () => {
        if (!selectedFile || isImporting) return

        setShowConfirm(false)
        setIsImporting(true)
        setErrorMessage(null)

        try {
            const result = await importUsersBulkApi(requestFn, selectedFile)
            setImportResult(result)
            if (result.data.imported_rows > 0) {
                onSuccess?.()
            }
        } catch (err: unknown) {
            // Giữ nguyên previewData hiện tại để người dùng có thể retry
            setErrorMessage(getErrorMessage(err, 'Lỗi khi import người dùng từ file Excel.'))
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <div
            className="modal-backdrop"
            data-testid="bulk-import-modal-backdrop"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isDownloading && !isChecking && !isImporting) {
                    handleClose()
                }
            }}
        >
            <div
                className={`modal-container import-modal-container ${previewData || importResult ? 'has-preview' : ''}`}
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
                        disabled={isDownloading || isChecking || isImporting}
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

                    {/* Banner hiển thị lỗi API */}
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

                    {/* Banner thông báo kết quả sau khi import thành công */}
                    {importResult && (
                        <div className="import-success-banner" data-testid="import-result-message" role="status">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                            <span>{importResult.message}</span>
                        </div>
                    )}

                    <div className="import-steps-container">
                        {/* Bước 1: Tải file mẫu */}
                        <div className={`import-step-card ${downloadSuccess ? 'completed' : 'active'}`} data-testid="import-step-1">
                            <div className="import-step-header">
                                <span className={`import-step-badge ${downloadSuccess ? 'completed-badge' : ''}`}>1</span>
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
                                    disabled={isDownloading || isChecking || isImporting}
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
                        <div className={`import-step-card ${importResult ? 'completed' : selectedFile ? 'active' : ''}`} data-testid="import-step-2">
                            <div className="import-step-header">
                                <span className={`import-step-badge ${importResult ? 'completed-badge' : selectedFile ? '' : 'inactive'}`}>2</span>
                                <h3 className="import-step-title">Bước 2 – Chọn file Excel</h3>
                            </div>
                            <p className="import-step-desc">
                                Chọn file .xlsx đã điền đầy đủ dữ liệu người dùng theo đúng cấu trúc cột.
                            </p>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx"
                                data-testid="import-file-input"
                                style={{ display: 'none' }}
                                onChange={handleFileInputChange}
                            />

                            {!selectedFile ? (
                                <div
                                    className={`import-dropzone ${isDragging ? 'dragging' : ''}`}
                                    data-testid="import-dropzone"
                                    onClick={() => !isChecking && !isImporting && fileInputRef.current?.click()}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    role="button"
                                    tabIndex={0}
                                    aria-label="Chọn hoặc kéo thả file Excel"
                                    onKeyDown={(e) => {
                                        if ((e.key === 'Enter' || e.key === ' ') && !isChecking && !isImporting) {
                                            e.preventDefault()
                                            fileInputRef.current?.click()
                                        }
                                    }}
                                >
                                    <svg className="import-dropzone-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="12" y1="18" x2="12" y2="12" />
                                        <line x1="9" y1="15" x2="12" y2="12" />
                                        <line x1="15" y1="15" x2="12" y2="12" />
                                    </svg>
                                    <p className="import-dropzone-text">
                                        Kéo thả file .xlsx vào đây hoặc <span className="import-dropzone-link">chọn từ máy tính</span>
                                    </p>
                                    <p className="import-dropzone-hint">Chỉ hỗ trợ file Excel định dạng .xlsx</p>
                                </div>
                            ) : (
                                <div className="selected-file-wrapper" data-testid="selected-file-info">
                                    <div className="selected-file-details">
                                        <div className="selected-file-icon" aria-hidden="true">
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                <polyline points="14 2 14 8 20 8" />
                                                <line x1="8" y1="13" x2="16" y2="13" />
                                                <line x1="8" y1="17" x2="16" y2="17" />
                                            </svg>
                                        </div>
                                        <div className="selected-file-meta">
                                            <span className="selected-file-name" data-testid="selected-file-name" title={selectedFile.name}>
                                                {selectedFile.name}
                                            </span>
                                            <span className="selected-file-size" data-testid="selected-file-size">
                                                {formatFileSize(selectedFile.size)}
                                            </span>
                                        </div>
                                        {!importResult && (
                                            <button
                                                type="button"
                                                className="btn-remove-file"
                                                data-testid="btn-remove-file"
                                                onClick={handleRemoveFile}
                                                disabled={isChecking || isImporting}
                                                title="Bỏ chọn file này"
                                                aria-label="Bỏ chọn file"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                                <span>Bỏ file</span>
                                            </button>
                                        )}
                                    </div>

                                    {!importResult && (
                                        <div className="selected-file-action-row">
                                            <button
                                                type="button"
                                                className="btn-preview-data"
                                                data-testid="btn-preview-data"
                                                onClick={handlePreviewData}
                                                disabled={isChecking || isImporting}
                                            >
                                                {isChecking ? (
                                                    <>
                                                        <svg className="import-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                                        </svg>
                                                        <span>Đang kiểm tra...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <circle cx="11" cy="11" r="8" />
                                                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                                        </svg>
                                                        <span>Kiểm tra dữ liệu</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Bước 3: Xem trước hoặc Kết quả import */}
                        <div className={`import-step-card ${importResult ? 'completed' : previewData ? 'active' : 'disabled'}`} data-testid="import-step-3">
                            <div className="import-step-header">
                                <span className={`import-step-badge ${importResult ? 'completed-badge' : previewData ? '' : 'inactive'}`}>3</span>
                                <h3 className="import-step-title">
                                    {importResult ? 'Bước 3 – Kết quả import người dùng' : 'Bước 3 – Kiểm tra và import'}
                                </h3>
                            </div>
                            <p className="import-step-desc">
                                {importResult
                                    ? 'Chi tiết kết quả import người dùng vào hệ thống.'
                                    : previewData
                                    ? 'Xem trước danh sách dữ liệu và chi tiết các dòng hợp lệ / có lỗi trước khi import.'
                                    : 'Xem trước danh sách dữ liệu hợp lệ và phát hiện lỗi trước khi lưu vào hệ thống.'}
                            </p>

                            {!previewData && !importResult ? (
                                <div className="import-step-info-box">
                                    Hệ thống sẽ phân tích từng dòng và hiển thị kết quả chi tiết trước khi xác nhận import.
                                </div>
                            ) : importResult ? (
                                /* GIAO DIỆN SAU KHI IMPORT (A6.3) */
                                <div className="import-preview-container" data-testid="import-result-content">
                                    {/* Summary 5 chỉ số sau import */}
                                    <div className="import-summary-cards exec-summary-grid" data-testid="import-execute-summary">
                                        <div className="import-summary-card total" data-testid="summary-exec-total">
                                            <span className="summary-title">Tổng số dòng</span>
                                            <span className="summary-number">{importResult.data.total_rows}</span>
                                        </div>
                                        <div className="import-summary-card valid" data-testid="summary-exec-success">
                                            <span className="summary-title">Thành công</span>
                                            <span className="summary-number">{importResult.data.imported_rows}</span>
                                        </div>
                                        <div className="import-summary-card warning" data-testid="summary-exec-validation-errors">
                                            <span className="summary-title">Lỗi dữ liệu</span>
                                            <span className="summary-number">{importResult.data.summary.validation_errors}</span>
                                        </div>
                                        <div className="import-summary-card invalid" data-testid="summary-exec-import-errors">
                                            <span className="summary-title">Lỗi import</span>
                                            <span className="summary-number">{importResult.data.summary.import_errors}</span>
                                        </div>
                                        <div className="import-summary-card skipped" data-testid="summary-exec-skipped">
                                            <span className="summary-title">Bỏ qua</span>
                                            <span className="summary-number">{importResult.data.skipped_rows}</span>
                                        </div>
                                    </div>

                                    {/* Error Summary: Tổng hợp các loại lỗi */}
                                    {importResult.data.error_summary && Object.keys(importResult.data.error_summary).length > 0 && (
                                        <div className="import-error-summary-box" data-testid="import-error-summary">
                                            <h4 className="error-summary-heading">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <line x1="12" y1="8" x2="12" y2="12" />
                                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                                </svg>
                                                <span>Tổng hợp lỗi</span>
                                            </h4>
                                            <div className="error-summary-list">
                                                {Object.entries(importResult.data.error_summary).map(([code, count]) => (
                                                    <div key={code} className="error-summary-chip" data-testid={`error-summary-${code}`}>
                                                        <span className="error-summary-label">{getErrorMessage(code, code)}</span>
                                                        <span className="error-summary-count">{count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Bảng kết quả từng dòng sau import */}
                                    <div className="import-table-responsive-wrapper" data-testid="import-result-table-container">
                                        <table className="import-preview-table" data-testid="import-result-table">
                                            <thead>
                                                <tr>
                                                    <th scope="col" className="col-row-num">Dòng</th>
                                                    <th scope="col">Họ tên</th>
                                                    <th scope="col">Email</th>
                                                    <th scope="col">Số điện thoại</th>
                                                    <th scope="col">Vai trò</th>
                                                    <th scope="col">Trạng thái</th>
                                                    <th scope="col" className="col-status">Kết quả</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importResult.data.rows.map((row) => (
                                                    <tr
                                                        key={row.row_number}
                                                        className={`import-table-row ${row.result === 'imported' ? 'is-valid' : 'is-invalid'}`}
                                                        data-testid={`exec-row-${row.row_number}`}
                                                    >
                                                        <td className="col-row-num">
                                                            <span className="row-number-pill">{row.row_number}</span>
                                                        </td>
                                                        <td>{row.name || '—'}</td>
                                                        <td className="col-email">{row.email || '—'}</td>
                                                        <td>{row.phone || '—'}</td>
                                                        <td>
                                                            <span className="role-tag">{row.role || '—'}</span>
                                                        </td>
                                                        <td>
                                                            <span className="status-tag">{row.status || '—'}</span>
                                                        </td>
                                                        <td className="col-status">
                                                            {row.result === 'imported' ? (
                                                                <span
                                                                    className="import-status-pill result-imported"
                                                                    data-testid={`exec-row-result-${row.row_number}`}
                                                                >
                                                                    Đã import
                                                                </span>
                                                            ) : row.result === 'validation_error' ? (
                                                                <div className="import-row-error-wrapper">
                                                                    <span
                                                                        className="import-status-pill result-val-error"
                                                                        data-testid={`exec-row-result-${row.row_number}`}
                                                                    >
                                                                        Lỗi dữ liệu
                                                                    </span>
                                                                    {row.errors && row.errors.length > 0 && (
                                                                        <ul
                                                                            className="import-row-error-list"
                                                                            data-testid={`exec-row-errors-${row.row_number}`}
                                                                        >
                                                                            {row.errors.map((err, errIdx) => (
                                                                                <li key={errIdx} className="import-error-msg-item">
                                                                                    {err.message}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="import-row-error-wrapper">
                                                                    <span
                                                                        className="import-status-pill result-imp-error"
                                                                        data-testid={`exec-row-result-${row.row_number}`}
                                                                    >
                                                                        Import thất bại
                                                                    </span>
                                                                    {row.errors && row.errors.length > 0 && (
                                                                        <ul
                                                                            className="import-row-error-list"
                                                                            data-testid={`exec-row-errors-${row.row_number}`}
                                                                        >
                                                                            {row.errors.map((err, errIdx) => (
                                                                                <li key={errIdx} className="import-error-msg-item">
                                                                                    {err.message}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : previewData ? (
                                /* GIAO DIỆN PREVIEW TRƯỚC KHI IMPORT (A6.2) */
                                <div className="import-preview-container" data-testid="import-preview-content">
                                    {/* Summary counts */}
                                    <div className="import-summary-cards" data-testid="preview-summary">
                                        <div className="import-summary-card total" data-testid="summary-total-rows">
                                            <span className="summary-title">Tổng số dòng</span>
                                            <span className="summary-number">{previewData.total_rows}</span>
                                        </div>
                                        <div className="import-summary-card valid" data-testid="summary-valid-rows">
                                            <span className="summary-title">Dòng hợp lệ</span>
                                            <span className="summary-number">{previewData.valid_rows}</span>
                                        </div>
                                        <div className="import-summary-card invalid" data-testid="summary-invalid-rows">
                                            <span className="summary-title">Dòng có lỗi</span>
                                            <span className="summary-number">{previewData.invalid_rows}</span>
                                        </div>
                                    </div>

                                    {/* Bảng xem trước dữ liệu */}
                                    <div className="import-table-responsive-wrapper" data-testid="preview-table-container">
                                        <table className="import-preview-table" data-testid="preview-table">
                                            <thead>
                                                <tr>
                                                    <th scope="col" className="col-row-num">Dòng</th>
                                                    <th scope="col">Họ tên</th>
                                                    <th scope="col">Email</th>
                                                    <th scope="col">Số điện thoại</th>
                                                    <th scope="col">Vai trò</th>
                                                    <th scope="col">Trạng thái</th>
                                                    <th scope="col" className="col-status">Kết quả</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewData.rows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="import-table-empty">
                                                            File Excel không chứa dòng dữ liệu nào.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    previewData.rows.map((row) => (
                                                        <tr
                                                            key={row.row_number}
                                                            className={`import-table-row ${row.valid ? 'is-valid' : 'is-invalid'}`}
                                                            data-testid={`preview-row-${row.row_number}`}
                                                        >
                                                            <td className="col-row-num">
                                                                <span className="row-number-pill">{row.row_number}</span>
                                                            </td>
                                                            <td>{row.name || '—'}</td>
                                                            <td className="col-email">{row.email || '—'}</td>
                                                            <td>{row.phone || '—'}</td>
                                                            <td>
                                                                <span className="role-tag">{row.role || '—'}</span>
                                                            </td>
                                                            <td>
                                                                <span className="status-tag">{row.status || '—'}</span>
                                                            </td>
                                                            <td className="col-status">
                                                                {row.valid ? (
                                                                    <span
                                                                        className="import-status-pill valid"
                                                                        data-testid={`row-result-${row.row_number}`}
                                                                    >
                                                                        Hợp lệ
                                                                    </span>
                                                                ) : (
                                                                    <div className="import-row-error-wrapper">
                                                                        <span
                                                                            className="import-status-pill invalid"
                                                                            data-testid={`row-result-${row.row_number}`}
                                                                        >
                                                                            Có lỗi
                                                                        </span>
                                                                        {row.errors && row.errors.length > 0 && (
                                                                            <ul
                                                                                className="import-row-error-list"
                                                                                data-testid={`row-errors-${row.row_number}`}
                                                                            >
                                                                                {row.errors.map((err, errIdx) => (
                                                                                    <li key={errIdx} className="import-error-msg-item">
                                                                                        {err.message}
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Xác nhận Import hoặc Cảnh báo không có dòng hợp lệ */}
                                    {previewData.valid_rows === 0 ? (
                                        <div className="import-no-valid-notice" data-testid="no-valid-rows-msg" role="status">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="12" y1="8" x2="12" y2="12" />
                                                <line x1="12" y1="16" x2="12.01" y2="16" />
                                            </svg>
                                            <span>Không có dòng hợp lệ để import. Vui lòng kiểm tra lại file Excel.</span>
                                        </div>
                                    ) : showConfirm ? (
                                        <div className="import-confirm-panel" data-testid="import-confirm-box" role="alertdialog">
                                            <div className="import-confirm-icon">
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <line x1="12" y1="16" x2="12" y2="12" />
                                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                                </svg>
                                            </div>
                                            <div className="import-confirm-content">
                                                <p className="import-confirm-title">
                                                    Bạn có chắc muốn import <strong>{previewData.valid_rows}</strong> người dùng hợp lệ?
                                                </p>
                                                {previewData.invalid_rows > 0 && (
                                                    <p className="import-confirm-hint">
                                                        {previewData.invalid_rows} dòng có lỗi sẽ bị bỏ qua và không được lưu vào hệ thống.
                                                    </p>
                                                )}
                                                <div className="import-confirm-actions">
                                                    <button
                                                        type="button"
                                                        className="btn-confirm-execute"
                                                        data-testid="btn-confirm-import"
                                                        onClick={handleConfirmImport}
                                                        disabled={isImporting}
                                                    >
                                                        {isImporting ? 'Đang import...' : 'Xác nhận import'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-cancel-confirm"
                                                        data-testid="btn-cancel-import"
                                                        onClick={() => setShowConfirm(false)}
                                                        disabled={isImporting}
                                                    >
                                                        Hủy
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="import-action-bar">
                                            <button
                                                type="button"
                                                className="btn-start-import"
                                                data-testid="btn-start-import"
                                                onClick={handleStartImport}
                                                disabled={isChecking || isImporting}
                                            >
                                                {isImporting ? (
                                                    <>
                                                        <svg className="import-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                                        </svg>
                                                        <span>Đang import...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                        <span>Import người dùng ({previewData.valid_rows})</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    <div className="import-preview-footer-note">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="16" x2="12" y2="12" />
                                            <line x1="12" y1="8" x2="12.01" y2="8" />
                                        </svg>
                                        <span>
                                            Dữ liệu trên là kết quả kiểm tra trước khi import. Dữ liệu chỉ được lưu vào hệ thống sau khi bạn xác nhận import.
                                        </span>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    {importResult ? (
                        <div className="import-footer-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                data-testid="btn-import-another-file"
                                onClick={handleImportAnotherFile}
                            >
                                Import file khác
                            </button>
                            <button
                                type="button"
                                className="btn-cancel"
                                data-testid="btn-close-import-footer"
                                onClick={handleClose}
                            >
                                Đóng
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="btn-cancel"
                            data-testid="btn-close-import-footer"
                            onClick={handleClose}
                            disabled={isDownloading || isChecking || isImporting}
                        >
                            Đóng
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
