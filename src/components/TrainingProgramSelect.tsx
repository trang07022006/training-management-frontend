import { useState, useEffect, useRef, useMemo, type KeyboardEvent } from 'react'
import { useSession } from '../auth/SessionProvider'
import {
    getTrainingPrograms,
    type TrainingProgram,
    type RequestFunction,
} from '../api/trainingProgramApi'
import './TrainingProgramSelect.css'

export interface TrainingProgramSelectProps {
    id?: string
    name?: string
    value: string | null | undefined
    onChange: (programId: string, program?: TrainingProgram | null) => void
    programs?: TrainingProgram[]
    placeholder?: string
    disabled?: boolean
    className?: string
    hasError?: boolean
    error?: boolean | string
    testId?: string
    pageSize?: number
    customRequest?: RequestFunction
}

export function TrainingProgramSelect({
    id,
    name,
    value,
    onChange,
    programs: externalPrograms,
    placeholder = '-- Chọn chương trình đào tạo --',
    disabled = false,
    className = '',
    hasError = false,
    error,
    testId,
    pageSize = 10,
    customRequest,
}: TrainingProgramSelectProps) {
    let sessionRequest: RequestFunction | undefined
    try {
        const session = useSession()
        sessionRequest = session.request
    } catch {
        sessionRequest = undefined
    }
    const requestFn = (customRequest || sessionRequest || fetch) as RequestFunction

    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [internalPrograms, setInternalPrograms] = useState<TrainingProgram[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const containerRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Load programs if external list is not provided
    useEffect(() => {
        if (externalPrograms !== undefined) {
            setInternalPrograms(externalPrograms)
            return
        }

        let isMounted = true
        setIsLoading(true)
        getTrainingPrograms(requestFn, { page_size: 100 })
            .then((res) => {
                if (isMounted) {
                    setInternalPrograms(res.items || [])
                }
            })
            .catch((err) => {
                console.error('Lỗi khi tải danh sách chương trình đào tạo:', err)
            })
            .finally(() => {
                if (isMounted) setIsLoading(false)
            })

        return () => {
            isMounted = false
        }
    }, [externalPrograms, requestFn])

    const allPrograms = externalPrograms !== undefined ? externalPrograms : internalPrograms

    // Selected program object
    const selectedProgram = useMemo(() => {
        if (!value) return null
        return allPrograms.find((p) => String(p.id) === String(value)) || null
    }, [allPrograms, value])

    // Filtered by search term
    const filteredPrograms = useMemo(() => {
        const term = searchTerm.trim().toLowerCase()
        if (!term) return allPrograms
        return allPrograms.filter(
            (p) =>
                p.code.toLowerCase().includes(term) ||
                p.name.toLowerCase().includes(term)
        )
    }, [allPrograms, searchTerm])

    // Reset page to 1 when search term changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    // Total pages calculation (10 items per page by default)
    const totalItems = filteredPrograms.length
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

    // Ensure currentPage does not exceed totalPages
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages)
        }
    }, [currentPage, totalPages])

    // Paginated slice
    const paginatedPrograms = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize
        return filteredPrograms.slice(startIndex, startIndex + pageSize)
    }, [filteredPrograms, currentPage, pageSize])

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => {
                searchInputRef.current?.focus()
            }, 50)
        }
    }, [isOpen])

    const handleToggle = () => {
        if (disabled) return
        setIsOpen((prev) => !prev)
    }

    const handleSelect = (program: TrainingProgram | null) => {
        if (program) {
            onChange(String(program.id), program)
        } else {
            onChange('', null)
        }
        setIsOpen(false)
        setSearchTerm('')
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape') {
            setIsOpen(false)
        } else if (e.key === 'Enter' || e.key === ' ') {
            if (!isOpen) {
                e.preventDefault()
                setIsOpen(true)
            }
        }
    }

    const isInvalid = Boolean(hasError || error)

    return (
        <div
            ref={containerRef}
            className={`program-select-container ${className}`}
            onKeyDown={handleKeyDown}
            data-testid={testId || 'training-program-select'}
        >
            {/* Hidden native select for form compatibility and test query support */}
            <select
                id={id}
                name={name}
                value={value ?? ''}
                onChange={(e) => {
                    const selectedId = e.target.value
                    const prog = allPrograms.find((p) => String(p.id) === selectedId) || null
                    onChange(selectedId, prog)
                }}
                disabled={disabled}
                tabIndex={-1}
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '1px',
                    height: '1px',
                    pointerEvents: 'none',
                    margin: -1,
                    clip: 'rect(0, 0, 0, 0)',
                }}
            >
                <option value="">{placeholder}</option>
                {allPrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                    </option>
                ))}
            </select>

            {/* Custom Select Trigger */}
            <div
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-disabled={disabled}
                tabIndex={disabled ? -1 : 0}
                className={`program-select-trigger ${isOpen ? 'is-open' : ''} ${
                    isInvalid ? 'has-error' : ''
                }`}
                onClick={handleToggle}
                data-testid={id ? `${id}-trigger` : 'program-select-trigger'}
            >
                <span
                    className={`program-select-value ${!selectedProgram ? 'is-placeholder' : ''}`}
                >
                    {selectedProgram
                        ? `${selectedProgram.code} - ${selectedProgram.name}`
                        : placeholder}
                </span>
                <span className="program-select-caret" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </span>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className="program-select-dropdown"
                    role="listbox"
                    data-testid="program-select-dropdown"
                >
                    {/* Search filter if there are several programs */}
                    {allPrograms.length > 5 && (
                        <div className="program-select-search-box">
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="program-select-search-input"
                                placeholder="🔍 Tìm kiếm mã hoặc tên chương trình..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                data-testid="program-search-input"
                            />
                        </div>
                    )}

                    {/* Options list */}
                    <ul className="program-select-list">
                        {/* Clear / Default Option */}
                        <li
                            className={`program-select-item is-placeholder-option ${
                                !selectedProgram ? 'is-selected' : ''
                            }`}
                            onClick={() => handleSelect(null)}
                            role="option"
                            aria-selected={!selectedProgram}
                            data-testid="program-option-default"
                        >
                            <span>{placeholder}</span>
                        </li>

                        {isLoading && allPrograms.length === 0 ? (
                            <li className="program-select-empty">
                                ⏳ Đang tải danh sách chương trình...
                            </li>
                        ) : paginatedPrograms.length === 0 ? (
                            <li className="program-select-empty">
                                Không tìm thấy chương trình nào phù hợp.
                            </li>
                        ) : (
                            paginatedPrograms.map((prog) => {
                                const isSelected = selectedProgram?.id === prog.id
                                return (
                                    <li
                                        key={prog.id}
                                        className={`program-select-item ${
                                            isSelected ? 'is-selected' : ''
                                        }`}
                                        onClick={() => handleSelect(prog)}
                                        role="option"
                                        aria-selected={isSelected}
                                        data-testid={`program-option-${prog.id}`}
                                    >
                                        <span>
                                            {prog.code} - {prog.name}
                                        </span>
                                    </li>
                                )
                            })
                        )}
                    </ul>

                    {/* Pagination Footer: Only when > 10 programs */}
                    {totalItems > pageSize && (
                        <div
                            className="program-select-pagination"
                            data-testid="program-select-pagination"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="program-select-pagination-info">
                                Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong>{' '}
                                <span style={{ opacity: 0.75 }}>({totalItems} CTĐT)</span>
                            </div>

                            <div className="program-select-pagination-actions">
                                <button
                                    type="button"
                                    className="program-select-page-btn"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    data-testid="program-page-prev"
                                    title="Trang trước"
                                >
                                    ‹ Trước
                                </button>

                                <div className="program-select-page-numbers">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                                        (pNum) => (
                                            <button
                                                key={pNum}
                                                type="button"
                                                className={`program-select-page-btn ${
                                                    pNum === currentPage ? 'is-active' : ''
                                                }`}
                                                onClick={() => setCurrentPage(pNum)}
                                                data-testid={`program-page-${pNum}`}
                                            >
                                                {pNum}
                                            </button>
                                        )
                                    )}
                                </div>

                                <button
                                    type="button"
                                    className="program-select-page-btn"
                                    disabled={currentPage >= totalPages}
                                    onClick={() =>
                                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                                    }
                                    data-testid="program-page-next"
                                    title="Trang sau"
                                >
                                    Sau ›
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default TrainingProgramSelect
