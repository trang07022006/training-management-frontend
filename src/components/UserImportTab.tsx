import { useState, useRef, useMemo } from 'react'
import { useSession } from '../auth/SessionProvider'
import {
    downloadUserImportTemplateApi,
    previewUserImportApi,
    importUsersBulkApi,
    type ImportPreviewData,
    type ImportExecuteResult,
    type ImportPreviewRow,
    type ImportRowResult,
    type ImportRowError,
} from '../api/userApi'
import { getErrorMessage } from '../utils/errorMessages'
import './UserModal.css'
import './BulkUserImportModal.css'
import './UserImportTab.css'

export interface UserImportTabProps {
    onBackToList: () => void
    onSuccess?: () => void
    customRequest?: (path: string, init?: RequestInit) => Promise<Response>
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Tab Workspace Import Người dùng từ Excel (SCRUM-119 Full-width Workspace).
 * Hỗ trợ quy trình 3 bước chuẩn hóa, kiểm soát hàng nghìn bản ghi với bộ lọc và pagination.
 */
export function UserImportTab({
    onBackToList,
    onSuccess,
    customRequest,
}: UserImportTabProps) {
    const { request: sessionRequest } = useSession()
    const requestFn = customRequest ?? sessionRequest

    const fileInputRef = useRef<HTMLInputElement | null>(null)

    // Step 1: Download Template state
    const [isDownloading, setIsDownloading] = useState(false)
    const [downloadSuccess, setDownloadSuccess] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Step 2: Selected File state
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isChecking, setIsChecking] = useState(false)
    const [isDragging, setIsDragging] = useState(false)

    // Step 3: Preview Data state
    const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null)
    const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'invalid'>('all')
    const [previewPage, setPreviewPage] = useState<number>(1)
    const [previewPageSize, setPreviewPageSize] = useState<number>(50)

    // Import Execution state
    const [isImporting, setIsImporting] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [importResult, setImportResult] = useState<ImportExecuteResult | null>(null)
    const [execFilter, setExecFilter] = useState<'all' | 'imported' | 'error'>('all')
    const [execPage, setExecPage] = useState<number>(1)
    const [execPageSize, setExecPageSize] = useState<number>(50)

    /**
     * Tải file Excel mẫu chuẩn (Bước 1)
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
     * Validate và gán file .xlsx (Bước 2)
     */
    const handleFileValidationAndSet = (file: File) => {
        setPreviewData(null)
        setImportResult(null)
        setShowConfirm(false)
        setErrorMessage(null)
        setPreviewPage(1)
        setExecPage(1)

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
        setPreviewPage(1)
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
        setPreviewPage(1)
        setExecPage(1)
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
     * Preview dữ liệu từ Excel (Bước 3)
     */
    const handlePreviewData = async () => {
        if (!selectedFile || isChecking || isImporting) return

        setIsChecking(true)
        setErrorMessage(null)

        try {
            const data = await previewUserImportApi(requestFn, selectedFile)
            setPreviewData(data)
            setPreviewFilter('all')
            setPreviewPage(1)
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Lỗi khi kiểm tra dữ liệu file Excel.'))
        } finally {
            setIsChecking(false)
        }
    }

    const handleStartImport = () => {
        if (!previewData || previewData.valid_rows === 0 || isImporting) return
        setShowConfirm(true)
    }

    /**
     * Xác nhận ghi vào CSDL
     */
    const handleConfirmImport = async () => {
        if (!selectedFile || isImporting) return

        setShowConfirm(false)
        setIsImporting(true)
        setErrorMessage(null)

        try {
            const result = await importUsersBulkApi(requestFn, selectedFile)
            setImportResult(result)
            setExecFilter('all')
            setExecPage(1)
            if (result.data.imported_rows > 0) {
                onSuccess?.()
            }
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Lỗi khi import người dùng từ file Excel.'))
        } finally {
            setIsImporting(false)
        }
    }

    // Filter preview rows
    const filteredPreviewRows = useMemo(() => {
        if (!previewData) return []
        if (previewFilter === 'valid') {
            return previewData.rows.filter((r) => r.valid)
        }
        if (previewFilter === 'invalid') {
            return previewData.rows.filter((r) => !r.valid)
        }
        return previewData.rows
    }, [previewData, previewFilter])

    // Paginate preview rows
    const totalPreviewFiltered = filteredPreviewRows.length
    const totalPreviewPages = Math.ceil(totalPreviewFiltered / previewPageSize) || 1
    const pagedPreviewRows = useMemo(() => {
        const start = (previewPage - 1) * previewPageSize
        return filteredPreviewRows.slice(start, start + previewPageSize)
    }, [filteredPreviewRows, previewPage, previewPageSize])

    // Filter execution rows
    const filteredExecRows = useMemo(() => {
        if (!importResult) return []
        if (execFilter === 'imported') {
            return importResult.data.rows.filter((r) => r.result === 'imported')
        }
        if (execFilter === 'error') {
            return importResult.data.rows.filter((r) => r.result !== 'imported')
        }
        return importResult.data.rows
    }, [importResult, execFilter])

    // Paginate execution rows
    const totalExecFiltered = filteredExecRows.length
    const totalExecPages = Math.ceil(totalExecFiltered / execPageSize) || 1
    const pagedExecRows = useMemo(() => {
        const start = (execPage - 1) * execPageSize
        return filteredExecRows.slice(start, start + execPageSize)
    }, [filteredExecRows, execPage, execPageSize])

    return (
        <div
            className={`user-import-workspace import-modal-container ${previewData || importResult ? 'has-preview' : ''}`}
            data-testid="user-import-tab"
        >
            {/* Compatibility container hook for existing SCRUM-119 tests */}
            <div data-testid="bulk-import-modal" style={{ width: '100%' }}>
                {/* Workspace Top Navigation Bar */}
                <div className="import-workspace-top-bar">
                    <button
                        type="button"
                        className="btn-back-to-list"
                        data-testid="btn-back-to-users"
                        onClick={onBackToList}
                        disabled={isDownloading || isChecking || isImporting}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                        </svg>
                        <span>Quay lại danh sách người dùng</span>
                    </button>

                    <div className="import-workspace-meta-tag">
                        <span>Quy trình nhập dữ liệu chuẩn hóa</span>
                    </div>
                </div>

                <div className="import-workspace-title-section" style={{ marginBottom: 16 }}>
                    <h2 id="import-modal-title" className="modal-title" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--ictu-primary-dark, #0B1F3A)', margin: '0 0 6px 0' }}>
                        Import người dùng từ Excel
                    </h2>
                    <p className="import-modal-description" data-testid="import-modal-description" style={{ margin: 0, color: '#64748b' }}>
                        Tải file mẫu, điền thông tin người dùng và tải file lên để kiểm tra trước khi import.
                    </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                    <div className="modal-banner-error" data-testid="import-error-banner" role="alert" style={{ marginBottom: 16 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Import Success Banner */}
                {importResult && (
                    <div className="import-success-banner" data-testid="import-result-message" role="status" style={{ marginBottom: 16 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span>{importResult.message}</span>
                    </div>
                )}

                <div className="import-tab-steps">
                    {/* BƯỚC 1: TẢI FILE MẪU */}
                    <div className={`import-tab-step-card ${downloadSuccess ? 'completed' : 'active'}`} data-testid="import-step-1">
                        <div className="import-tab-step-header">
                            <span className={`import-tab-step-badge ${downloadSuccess ? 'completed-badge' : ''}`}>1</span>
                            <div className="import-tab-step-title-group">
                                <h3 className="import-tab-step-title">Bước 1 – Tải file mẫu</h3>
                                <p className="import-tab-step-desc">
                                    Tải file Excel mẫu (.xlsx) theo đúng cấu trúc được hệ thống hỗ trợ.
                                </p>
                            </div>
                        </div>

                        <div className="step-1-content">
                            <p className="step-1-text">
                                File mẫu bao gồm các trường chuẩn: Họ và tên, Email, Mật khẩu, Số điện thoại, Vai trò, Trạng thái.
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
                                        <div className="btn-centered-spinner">
                                            <svg className="import-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                            </svg>
                                            <span>Đang tải...</span>
                                        </div>
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
                    </div>

                    {/* BƯỚC 2: CHỌN FILE EXCEL */}
                    <div className={`import-tab-step-card ${importResult ? 'completed' : selectedFile ? 'active' : ''}`} data-testid="import-step-2">
                        <div className="import-tab-step-header">
                            <span className={`import-tab-step-badge ${importResult ? 'completed-badge' : selectedFile ? '' : 'inactive'}`}>2</span>
                            <div className="import-tab-step-title-group">
                                <h3 className="import-tab-step-title">Bước 2 – Chọn file Excel</h3>
                                <p className="import-tab-step-desc">
                                    Chọn file .xlsx đã điền đầy đủ dữ liệu người dùng theo đúng cấu trúc cột.
                                </p>
                            </div>
                        </div>

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
                                className={`import-tab-dropzone ${isDragging ? 'dragging' : ''}`}
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
                                <svg className="import-tab-dropzone-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="12" y1="18" x2="12" y2="12" />
                                    <line x1="9" y1="15" x2="12" y2="12" />
                                    <line x1="15" y1="15" x2="12" y2="12" />
                                </svg>
                                <p className="import-tab-dropzone-title">
                                    Kéo thả file .xlsx vào đây hoặc <span className="import-tab-dropzone-link">chọn từ máy tính</span>
                                </p>
                                <p className="import-tab-dropzone-hint">Chỉ hỗ trợ file Excel định dạng .xlsx</p>
                            </div>
                        ) : (
                            <div className="selected-file-full-bar" data-testid="selected-file-info">
                                <div className="selected-file-main-info">
                                    <div className="selected-file-icon-box" aria-hidden="true">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                            <line x1="8" y1="13" x2="16" y2="13" />
                                            <line x1="8" y1="17" x2="16" y2="17" />
                                        </svg>
                                    </div>
                                    <div className="selected-file-texts">
                                        <span className="selected-file-name-text" data-testid="selected-file-name" title={selectedFile.name}>
                                            {selectedFile.name}
                                        </span>
                                        <span className="selected-file-size-text" data-testid="selected-file-size">
                                            Dung lượng: {formatFileSize(selectedFile.size)} • Định dạng .xlsx
                                        </span>
                                    </div>
                                </div>

                                {!importResult && (
                                    <div className="selected-file-controls">
                                        <button
                                            type="button"
                                            className="btn-remove-file"
                                            data-testid="btn-remove-file"
                                            onClick={handleRemoveFile}
                                            disabled={isChecking || isImporting}
                                            title="Bỏ chọn file này"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                            <span>Đổi / Bỏ file</span>
                                        </button>

                                        <button
                                            type="button"
                                            className="btn-preview-data"
                                            data-testid="btn-preview-data"
                                            onClick={handlePreviewData}
                                            disabled={isChecking || isImporting}
                                        >
                                            {isChecking ? (
                                                <div className="btn-centered-spinner">
                                                    <svg className="import-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                                    </svg>
                                                    <span>Đang kiểm tra...</span>
                                                </div>
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

                    {/* BƯỚC 3: PREVIEW & IMPORT (PHẦN CHÍNH) */}
                    <div className={`import-tab-step-card ${importResult ? 'completed' : previewData ? 'active' : 'disabled'}`} data-testid="import-step-3">
                        <div className="import-tab-step-header">
                            <span className={`import-tab-step-badge ${importResult ? 'completed-badge' : previewData ? '' : 'inactive'}`}>3</span>
                            <div className="import-tab-step-title-group">
                                <h3 className="import-tab-step-title">
                                    {importResult ? 'Bước 3 – Kết quả import người dùng' : 'Bước 3 – Kiểm tra dữ liệu trước khi import'}
                                </h3>
                                <p className="import-tab-step-desc">
                                    {importResult
                                        ? 'Báo cáo chi tiết các tài khoản đã được lưu vào CSDL hoặc bị bỏ qua do lỗi.'
                                        : previewData
                                        ? 'Kiểm tra chi tiết từng dòng, hỗ trợ phân loại dòng hợp lệ / có lỗi và phân trang hàng nghìn bản ghi.'
                                        : 'Xem trước danh sách dữ liệu hợp lệ và phát hiện lỗi trước khi lưu vào hệ thống.'}
                                </p>
                            </div>
                        </div>

                        {!previewData && !importResult ? (
                            <div className="import-step-info-box">
                                Hệ thống sẽ phân tích từng dòng và hiển thị kết quả chi tiết trước khi xác nhận import.
                            </div>
                        ) : importResult ? (
                            /* KẾT QUẢ SAU KHI THỰC THI IMPORT (A6.3) */
                            <div className="import-preview-container" data-testid="import-result-content">
                                {/* Summary 5 chỉ số sau import */}
                                <div className="preview-metric-cards" data-testid="import-execute-summary">
                                    <div className="preview-metric-card total" data-testid="summary-exec-total">
                                        <span className="metric-card-label">Tổng số dòng</span>
                                        <span className="metric-card-value">{importResult.data.total_rows}</span>
                                    </div>
                                    <div className="preview-metric-card valid" data-testid="summary-exec-success">
                                        <span className="metric-card-label">Thành công</span>
                                        <span className="metric-card-value">{importResult.data.imported_rows}</span>
                                    </div>
                                    <div className="preview-metric-card warning" data-testid="summary-exec-validation-errors">
                                        <span className="metric-card-label">Lỗi dữ liệu</span>
                                        <span className="metric-card-value">{importResult.data.summary.validation_errors}</span>
                                    </div>
                                    <div className="preview-metric-card invalid" data-testid="summary-exec-import-errors">
                                        <span className="metric-card-label">Lỗi import</span>
                                        <span className="metric-card-value">{importResult.data.summary.import_errors}</span>
                                    </div>
                                    <div className="preview-metric-card skipped" data-testid="summary-exec-skipped">
                                        <span className="metric-card-label">Bỏ qua</span>
                                        <span className="metric-card-value">{importResult.data.skipped_rows}</span>
                                    </div>
                                </div>

                                {/* Error Summary Chips */}
                                {importResult.data.error_summary && Object.keys(importResult.data.error_summary).length > 0 && (
                                    <div className="import-error-summary-box" data-testid="import-error-summary" style={{ marginTop: 16 }}>
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

                                {/* Execution Filter Toolbar */}
                                <div className="preview-toolbar" style={{ marginTop: 16 }}>
                                    <div className="preview-filter-buttons">
                                        <button
                                            type="button"
                                            className={`btn-preview-filter ${execFilter === 'all' ? 'active' : ''}`}
                                            onClick={() => { setExecFilter('all'); setExecPage(1); }}
                                        >
                                            <span>Tất cả</span>
                                            <span className="preview-filter-badge">{importResult.data.total_rows}</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn-preview-filter filter-valid ${execFilter === 'imported' ? 'active' : ''}`}
                                            onClick={() => { setExecFilter('imported'); setExecPage(1); }}
                                        >
                                            <span>Đã import</span>
                                            <span className="preview-filter-badge">{importResult.data.imported_rows}</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn-preview-filter filter-error ${execFilter === 'error' ? 'active' : ''}`}
                                            onClick={() => { setExecFilter('error'); setExecPage(1); }}
                                        >
                                            <span>Có lỗi / Bỏ qua</span>
                                            <span className="preview-filter-badge">{importResult.data.total_rows - importResult.data.imported_rows}</span>
                                        </button>
                                    </div>

                                    <div className="preview-pagination-page-size">
                                        <span>Hiển thị:</span>
                                        <select
                                            className="preview-page-size-select"
                                            value={execPageSize}
                                            onChange={(e) => {
                                                setExecPageSize(Number(e.target.value))
                                                setExecPage(1)
                                            }}
                                        >
                                            <option value={25}>25 dòng/trang</option>
                                            <option value={50}>50 dòng/trang</option>
                                            <option value={100}>100 dòng/trang</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Bảng kết quả từng dòng */}
                                <div className="preview-table-workspace-wrapper import-table-responsive-wrapper" data-testid="import-result-table-container">
                                    <div className="preview-table-scroll-area">
                                        <table className="preview-datatable import-preview-table" data-testid="import-result-table">
                                            <thead>
                                                <tr>
                                                    <th scope="col" style={{ width: '80px' }}>Dòng</th>
                                                    <th scope="col" style={{ width: '18%' }}>Họ tên</th>
                                                    <th scope="col" style={{ width: '22%' }}>Email</th>
                                                    <th scope="col" style={{ width: '13%' }}>Số điện thoại</th>
                                                    <th scope="col" style={{ width: '12%' }}>Vai trò</th>
                                                    <th scope="col" style={{ width: '12%' }}>Trạng thái</th>
                                                    <th scope="col" style={{ width: '20%' }}>Kết quả</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pagedExecRows.map((row: ImportRowResult) => (
                                                    <tr
                                                        key={row.row_number}
                                                        className={`import-table-row ${row.result === 'imported' ? 'is-valid' : 'is-invalid'}`}
                                                        data-testid={`exec-row-${row.row_number}`}
                                                    >
                                                        <td>
                                                            <span className="row-number-pill">{row.row_number}</span>
                                                        </td>
                                                        <td>{row.name || '—'}</td>
                                                        <td>{row.email || '—'}</td>
                                                        <td>{row.phone || '—'}</td>
                                                        <td>
                                                            <span className="role-tag">{row.role || '—'}</span>
                                                        </td>
                                                        <td>
                                                            <span className="status-tag">{row.status || '—'}</span>
                                                        </td>
                                                        <td>
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
                                                                            {row.errors.map((err: ImportRowError, errIdx: number) => (
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
                                                                            {row.errors.map((err: ImportRowError, errIdx: number) => (
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

                                    {/* Pagination Controls for Exec Table */}
                                    {totalExecFiltered > 0 && (
                                        <div className="preview-pagination-bar">
                                            <span className="preview-pagination-info">
                                                Hiển thị dòng {Math.min((execPage - 1) * execPageSize + 1, totalExecFiltered)} -{' '}
                                                {Math.min(execPage * execPageSize, totalExecFiltered)} trong tổng số {totalExecFiltered} dòng
                                            </span>
                                            <div className="preview-pagination-controls">
                                                <button
                                                    type="button"
                                                    className="btn-preview-page"
                                                    disabled={execPage <= 1}
                                                    onClick={() => setExecPage((p) => Math.max(p - 1, 1))}
                                                >
                                                    ← Trang trước
                                                </button>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 8px' }}>
                                                    {execPage} / {totalExecPages}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="btn-preview-page"
                                                    disabled={execPage >= totalExecPages}
                                                    onClick={() => setExecPage((p) => Math.min(p + 1, totalExecPages))}
                                                >
                                                    Trang sau →
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons after Import */}
                                <div className="import-tab-footer-actions" style={{ marginTop: 20 }}>
                                    <button
                                        type="button"
                                        className="btn-secondary-action"
                                        data-testid="btn-import-another-file"
                                        onClick={handleImportAnotherFile}
                                    >
                                        Import file khác
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-primary-action"
                                        data-testid="btn-close-import-footer"
                                        onClick={onBackToList}
                                    >
                                        Quay lại danh sách người dùng
                                    </button>
                                </div>
                            </div>
                        ) : previewData ? (
                            /* GIAO DIỆN PREVIEW TRƯỚC KHI IMPORT (A6.2) */
                            <div className="import-preview-container" data-testid="import-preview-content">
                                {/* Summary Metric Cards */}
                                <div className="preview-metric-cards" data-testid="preview-summary">
                                    <div className="preview-metric-card total" data-testid="summary-total-rows">
                                        <span className="metric-card-label">Tổng số dòng</span>
                                        <span className="metric-card-value">{previewData.total_rows}</span>
                                    </div>
                                    <div className="preview-metric-card valid" data-testid="summary-valid-rows">
                                        <span className="metric-card-label">Dòng hợp lệ</span>
                                        <span className="metric-card-value">{previewData.valid_rows}</span>
                                    </div>
                                    <div className="preview-metric-card invalid" data-testid="summary-invalid-rows">
                                        <span className="metric-card-label">Dòng có lỗi</span>
                                        <span className="metric-card-value">{previewData.invalid_rows}</span>
                                    </div>
                                </div>

                                {/* Preview Filter Toolbar & Pagination Size */}
                                <div className="preview-toolbar" style={{ marginTop: 16 }}>
                                    <div className="preview-filter-buttons">
                                        <button
                                            type="button"
                                            className={`btn-preview-filter ${previewFilter === 'all' ? 'active' : ''}`}
                                            data-testid="preview-filter-all"
                                            onClick={() => { setPreviewFilter('all'); setPreviewPage(1); }}
                                        >
                                            <span>Tất cả</span>
                                            <span className="preview-filter-badge">{previewData.total_rows}</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn-preview-filter filter-valid ${previewFilter === 'valid' ? 'active' : ''}`}
                                            data-testid="preview-filter-valid"
                                            onClick={() => { setPreviewFilter('valid'); setPreviewPage(1); }}
                                        >
                                            <span>Hợp lệ</span>
                                            <span className="preview-filter-badge">{previewData.valid_rows}</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn-preview-filter filter-error ${previewFilter === 'invalid' ? 'active' : ''}`}
                                            data-testid="preview-filter-error"
                                            onClick={() => { setPreviewFilter('invalid'); setPreviewPage(1); }}
                                        >
                                            <span>Có lỗi</span>
                                            <span className="preview-filter-badge">{previewData.invalid_rows}</span>
                                        </button>
                                    </div>

                                    <div className="preview-pagination-page-size">
                                        <span>Hiển thị:</span>
                                        <select
                                            className="preview-page-size-select"
                                            value={previewPageSize}
                                            onChange={(e) => {
                                                setPreviewPageSize(Number(e.target.value))
                                                setPreviewPage(1)
                                            }}
                                        >
                                            <option value={25}>25 dòng/trang</option>
                                            <option value={50}>50 dòng/trang</option>
                                            <option value={100}>100 dòng/trang</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Full-Width Preview DataTable */}
                                <div className="preview-table-workspace-wrapper import-table-responsive-wrapper" data-testid="preview-table-container">
                                    <div className="preview-table-scroll-area">
                                        <table className="preview-datatable import-preview-table" data-testid="preview-table">
                                            <thead>
                                                <tr>
                                                    <th scope="col" style={{ width: '80px' }}>Dòng</th>
                                                    <th scope="col" style={{ width: '18%' }}>Họ tên</th>
                                                    <th scope="col" style={{ width: '22%' }}>Email</th>
                                                    <th scope="col" style={{ width: '13%' }}>Số điện thoại</th>
                                                    <th scope="col" style={{ width: '12%' }}>Vai trò</th>
                                                    <th scope="col" style={{ width: '12%' }}>Trạng thái</th>
                                                    <th scope="col" style={{ width: '20%' }}>Kết quả</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewData.rows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="import-table-empty">
                                                            File Excel không chứa dòng dữ liệu nào.
                                                        </td>
                                                    </tr>
                                                ) : pagedPreviewRows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="import-table-empty">
                                                            Không có dòng dữ liệu nào phù hợp với bộ lọc hiện tại.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    pagedPreviewRows.map((row: ImportPreviewRow) => (
                                                        <tr
                                                            key={row.row_number}
                                                            className={`import-table-row ${row.valid ? 'is-valid' : 'is-invalid'}`}
                                                            data-testid={`preview-row-${row.row_number}`}
                                                        >
                                                            <td>
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
                                                            <td>
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

                                    {/* Pagination Controls for Preview */}
                                    {totalPreviewFiltered > 0 && (
                                        <div className="preview-pagination-bar" data-testid="preview-pagination">
                                            <span className="preview-pagination-info">
                                                Hiển thị dòng {Math.min((previewPage - 1) * previewPageSize + 1, totalPreviewFiltered)} -{' '}
                                                {Math.min(previewPage * previewPageSize, totalPreviewFiltered)} trong tổng số {totalPreviewFiltered} dòng
                                            </span>
                                            <div className="preview-pagination-controls">
                                                <button
                                                    type="button"
                                                    className="btn-preview-page"
                                                    disabled={previewPage <= 1}
                                                    onClick={() => setPreviewPage((p) => Math.max(p - 1, 1))}
                                                >
                                                    ← Trang trước
                                                </button>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 8px' }}>
                                                    {previewPage} / {totalPreviewPages}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="btn-preview-page"
                                                    disabled={previewPage >= totalPreviewPages}
                                                    onClick={() => setPreviewPage((p) => Math.min(p + 1, totalPreviewPages))}
                                                >
                                                    Trang sau →
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Confirmation Box or Action Bar */}
                                {previewData.valid_rows === 0 ? (
                                    <div className="import-no-valid-notice" data-testid="no-valid-rows-msg" role="status" style={{ marginTop: 16 }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="8" x2="12" y2="12" />
                                            <line x1="12" y1="16" x2="12.01" y2="16" />
                                        </svg>
                                        <span>Không có dòng hợp lệ để import. Vui lòng kiểm tra lại file Excel.</span>
                                    </div>
                                ) : showConfirm ? (
                                    <div className="import-confirm-panel-full" data-testid="import-confirm-box" role="alertdialog" style={{ marginTop: 16 }}>
                                        <div className="import-confirm-icon" style={{ flexShrink: 0 }}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="12" y1="8" x2="12" y2="12" />
                                                <line x1="12" y1="16" x2="12.01" y2="16" />
                                            </svg>
                                        </div>
                                        <div className="import-confirm-content-full">
                                            <p className="import-confirm-title-full">
                                                Bạn có chắc muốn import <strong>{previewData.valid_rows}</strong> người dùng hợp lệ?
                                            </p>
                                            {previewData.invalid_rows > 0 && (
                                                <p className="import-confirm-hint-full">
                                                    {previewData.invalid_rows} dòng có lỗi sẽ bị bỏ qua và không được lưu vào hệ thống.
                                                </p>
                                            )}
                                            <div className="import-confirm-actions-full">
                                                <button
                                                    type="button"
                                                    className="btn-confirm-execute"
                                                    data-testid="btn-confirm-import"
                                                    onClick={handleConfirmImport}
                                                    disabled={isImporting}
                                                >
                                                    {isImporting ? (
                                                        <div className="btn-centered-spinner">
                                                            <svg className="import-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                                            </svg>
                                                            <span>Đang import...</span>
                                                        </div>
                                                    ) : (
                                                        'Xác nhận import'
                                                    )}
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
                                    <div className="import-action-bar-full" style={{ marginTop: 16 }}>
                                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                            <button
                                                type="button"
                                                className="btn-secondary-action"
                                                onClick={handleRemoveFile}
                                                disabled={isChecking || isImporting}
                                            >
                                                Chọn file khác
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn-start-import"
                                            data-testid="btn-start-import"
                                            onClick={handleStartImport}
                                            disabled={isChecking || isImporting}
                                        >
                                            {isImporting ? (
                                                <div className="btn-centered-spinner">
                                                    <svg className="import-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                                    </svg>
                                                    <span>Đang import...</span>
                                                </div>
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

                                <div className="import-preview-footer-note" style={{ marginTop: 14 }}>
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

                {/* Footer with Back link when not in finished state */}
                {!importResult && (
                    <div className="import-tab-footer-actions" style={{ marginTop: 24 }}>
                        <button
                            type="button"
                            className="btn-cancel"
                            data-testid="btn-close-import-footer"
                            onClick={onBackToList}
                            disabled={isDownloading || isChecking || isImporting}
                        >
                            Đóng / Quay lại danh sách
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
