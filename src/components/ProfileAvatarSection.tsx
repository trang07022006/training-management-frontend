import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import type { RequestFunction } from '../api/userApi'
import {
    ALLOWED_AVATAR_MIME_TYPES,
    createSafeObjectUrl,
    deleteProfileAvatarApi,
    getProfileAvatarApi,
    isAvatarNotFoundError,
    revokeSafeObjectUrl,
    uploadProfileAvatarApi,
    validateAvatarFile,
} from '../api/userAvatarApi'
import { getErrorMessage } from '../utils/errorMessages'
import { getNameInitials } from '../navigation/userProfileUtils'
import './ProfileAvatarSection.css'

export interface ProfileAvatarSectionProps {
    request: RequestFunction
    name: string
    email: string
    roleDisplay: string
    avatarUrl: string | null | undefined
    onAvatarUrlChange?: (avatarUrl: string | null) => void
}

export function ProfileAvatarSection({
    request,
    name,
    email,
    roleDisplay,
    avatarUrl,
    onAvatarUrlChange,
}: ProfileAvatarSectionProps) {
    const [currentUrl, setCurrentUrl] = useState<string | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isLoadingAvatar, setIsLoadingAvatar] = useState<boolean>(Boolean(avatarUrl))
    const [isUploading, setIsUploading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    // Refs giữ URL mới nhất để cleanup chính xác (kể cả khi unmount).
    const currentUrlRef = useRef<string | null>(null)
    const previewUrlRef = useRef<string | null>(null)
    const mountedRef = useRef(true)

    const replaceCurrentUrl = useCallback((url: string | null) => {
        if (currentUrlRef.current && currentUrlRef.current !== url) {
            revokeSafeObjectUrl(currentUrlRef.current)
        }
        currentUrlRef.current = url
        setCurrentUrl(url)
    }, [])

    const replacePreviewUrl = useCallback((url: string | null) => {
        if (previewUrlRef.current && previewUrlRef.current !== url) {
            revokeSafeObjectUrl(previewUrlRef.current)
        }
        previewUrlRef.current = url
        setPreviewUrl(url)
    }, [])

    const resetFileInput = () => {
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const fetchAvatar = useCallback(async (): Promise<boolean> => {
        try {
            const blob = await getProfileAvatarApi(request)
            if (!mountedRef.current) return false
            replaceCurrentUrl(createSafeObjectUrl(blob))
            return true
        } catch (err) {
            if (!mountedRef.current) return false
            replaceCurrentUrl(null)
            // 404 AVATAR_NOT_FOUND -> fallback initials, không coi là lỗi trang.
            if (!isAvatarNotFoundError(err)) {
                setError(getErrorMessage(err, 'Không thể tải ảnh đại diện.'))
            }
            return false
        }
    }, [request, replaceCurrentUrl])

    // Tải avatar lần đầu khi profile có avatar_url.
    const initialAvatarUrl = useRef(avatarUrl)
    useEffect(() => {
        mountedRef.current = true
        if (initialAvatarUrl.current) {
            void fetchAvatar().finally(() => {
                if (mountedRef.current) setIsLoadingAvatar(false)
            })
        }
        return () => {
            mountedRef.current = false
            revokeSafeObjectUrl(currentUrlRef.current)
            revokeSafeObjectUrl(previewUrlRef.current)
            currentUrlRef.current = null
            previewUrlRef.current = null
        }
    }, [fetchAvatar])

    const isBusy = isUploading || isDeleting

    const handlePickClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null
        setSuccess(null)
        setError(null)
        if (!file) return

        const validationError = validateAvatarFile(file)
        if (validationError) {
            setError(validationError.message)
            resetFileInput()
            return
        }

        setSelectedFile(file)
        replacePreviewUrl(createSafeObjectUrl(file))
    }

    const handleCancelPreview = () => {
        replacePreviewUrl(null)
        setSelectedFile(null)
        setError(null)
        resetFileInput()
    }

    const handleUpload = async () => {
        if (!selectedFile || isBusy) return
        setIsUploading(true)
        setError(null)
        setSuccess(null)
        try {
            await uploadProfileAvatarApi(request, selectedFile)
            if (!mountedRef.current) return
            replacePreviewUrl(null)
            setSelectedFile(null)
            resetFileInput()
            await fetchAvatar()
            if (!mountedRef.current) return
            onAvatarUrlChange?.('/api/v1/users/profile/avatar')
            setSuccess('Cập nhật ảnh đại diện thành công.')
        } catch (err) {
            if (!mountedRef.current) return
            // Giữ avatar hiện tại và preview để người dùng thử lại.
            setError(getErrorMessage(err, 'Không thể tải lên ảnh đại diện. Vui lòng thử lại.'))
        } finally {
            if (mountedRef.current) setIsUploading(false)
        }
    }

    const handleConfirmDelete = async () => {
        if (isBusy) return
        setIsDeleting(true)
        setError(null)
        setSuccess(null)
        try {
            await deleteProfileAvatarApi(request)
            if (!mountedRef.current) return
            setShowDeleteConfirm(false)
            replaceCurrentUrl(null)
            resetFileInput()
            onAvatarUrlChange?.(null)
            setSuccess('Đã xóa ảnh đại diện.')
        } catch (err) {
            if (!mountedRef.current) return
            setShowDeleteConfirm(false)
            setError(getErrorMessage(err, 'Lỗi khi xóa ảnh đại diện.'))
        } finally {
            if (mountedRef.current) setIsDeleting(false)
        }
    }

    const handleDialogKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape' && !isDeleting) setShowDeleteConfirm(false)
    }

    const displayUrl = previewUrl ?? currentUrl
    const altName = name?.trim() || email || 'người dùng'

    return (
        <section className="profile-avatar-section" data-testid="profile-avatar-section" aria-label="Ảnh đại diện">
            <div className={`profile-avatar-frame ${previewUrl ? 'is-preview' : ''}`}>
                {displayUrl ? (
                    <img
                        src={displayUrl}
                        alt={previewUrl ? `Xem trước ảnh đại diện của ${altName}` : `Ảnh đại diện của ${altName}`}
                        className="profile-avatar-img"
                        data-testid={previewUrl ? 'avatar-preview-img' : 'avatar-img'}
                    />
                ) : (
                    <div
                        className="profile-avatar-fallback"
                        data-testid="avatar-initials"
                        role="img"
                        aria-label={`Ảnh đại diện mặc định của ${altName}`}
                    >
                        {isLoadingAvatar ? '' : getNameInitials(name)}
                    </div>
                )}
                {(isLoadingAvatar || isUploading) && (
                    <div className="profile-avatar-overlay" data-testid="avatar-loading" aria-hidden="true">
                        <span className="profile-avatar-spinner" />
                    </div>
                )}
            </div>

            <div className="profile-avatar-identity">
                <h2 className="profile-avatar-name" data-testid="avatar-identity-name">{name || email}</h2>
                <p className="profile-avatar-email">{email}</p>
                <span className="profile-avatar-role">{roleDisplay}</span>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_AVATAR_MIME_TYPES.join(',')}
                className="profile-avatar-input"
                onChange={handleFileChange}
                data-testid="avatar-file-input"
                id="profile-avatar-input"
                aria-label="Chọn ảnh đại diện"
                tabIndex={-1}
            />

            <div className="profile-avatar-actions">
                {selectedFile ? (
                    <>
                        <button
                            type="button"
                            className="avatar-btn avatar-btn-secondary"
                            onClick={handleCancelPreview}
                            disabled={isBusy}
                            data-testid="btn-avatar-cancel"
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            className="avatar-btn avatar-btn-primary"
                            onClick={handleUpload}
                            disabled={isBusy}
                            data-testid="btn-avatar-save"
                        >
                            {isUploading ? 'Đang tải lên...' : 'Lưu ảnh'}
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            className="avatar-btn avatar-btn-primary"
                            onClick={handlePickClick}
                            disabled={isBusy || isLoadingAvatar}
                            data-testid="btn-avatar-change"
                            aria-controls="profile-avatar-input"
                        >
                            Đổi ảnh
                        </button>
                        {currentUrl && (
                            <button
                                type="button"
                                className="avatar-btn avatar-btn-danger"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={isBusy}
                                data-testid="btn-avatar-delete"
                            >
                                Xóa ảnh
                            </button>
                        )}
                    </>
                )}
            </div>

            {selectedFile && (
                <p className="profile-avatar-filename" data-testid="avatar-selected-filename">
                    {selectedFile.name}
                </p>
            )}
            <p className="profile-avatar-hint">JPG, JPEG, PNG hoặc WEBP · tối đa 2 MB</p>

            {error && (
                <p className="profile-avatar-msg profile-avatar-msg-error" role="alert" data-testid="avatar-error">
                    {error}
                </p>
            )}
            {success && (
                <p className="profile-avatar-msg profile-avatar-msg-success" role="status" data-testid="avatar-success">
                    {success}
                </p>
            )}

            {showDeleteConfirm && (
                <div
                    className="profile-modal-backdrop"
                    data-testid="avatar-delete-confirm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="avatar-delete-title"
                    onKeyDown={handleDialogKeyDown}
                >
                    <div className="profile-modal-card">
                        <div className="profile-modal-header">
                            <span className="profile-modal-icon" aria-hidden="true">⚠️</span>
                            <h3 id="avatar-delete-title" className="profile-modal-title">Xóa ảnh đại diện</h3>
                        </div>
                        <div className="profile-modal-body">
                            <p className="profile-modal-message">Bạn có chắc muốn xóa ảnh đại diện?</p>
                        </div>
                        <div className="profile-modal-actions">
                            <button
                                type="button"
                                className="btn-modal-stay"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                autoFocus
                                data-testid="btn-avatar-delete-stay"
                            >
                                Ở lại
                            </button>
                            <button
                                type="button"
                                className="btn-modal-confirm-cancel"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                data-testid="btn-avatar-delete-confirm"
                            >
                                {isDeleting ? 'Đang xóa...' : 'Xóa ảnh'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}
