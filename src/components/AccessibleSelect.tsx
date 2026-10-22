import React, {
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react'
import './AccessibleSelect.css'

export interface SelectOption {
    value: string
    label: string
    subLabel?: string
}

export interface AccessibleSelectProps {
    id?: string
    name?: string
    value: string
    onChange: (value: string) => void
    options: SelectOption[]
    placeholder?: string
    disabled?: boolean
    ariaLabel?: string
    className?: string
    testId?: string
    searchable?: boolean
    searchPlaceholder?: string
}

export const AccessibleSelect: React.FC<AccessibleSelectProps> = ({
    id,
    value,
    onChange,
    options,
    placeholder = 'Chọn một mục...',
    disabled = false,
    ariaLabel,
    className = '',
    testId,
    searchable,
    searchPlaceholder = 'Tìm kiếm lựa chọn...',
}) => {
    const generatedId = useId()
    const selectId = id || generatedId
    const listboxId = `${selectId}-listbox`

    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [searchTerm, setSearchTerm] = useState<string>('')
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
    const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom')

    const containerRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const listboxRef = useRef<HTMLUListElement>(null)

    // Tự động bật tìm kiếm nếu số lượng lựa chọn > 6 và không bị disable tường minh
    const isSearchable = searchable ?? options.length > 6

    // Lọc options theo từ khóa tìm kiếm
    const filteredOptions = useMemo(() => {
        if (!searchTerm.trim()) return options
        const term = searchTerm.trim().toLowerCase()
        return options.filter(
            (opt) =>
                opt.label.toLowerCase().includes(term) ||
                (opt.subLabel && opt.subLabel.toLowerCase().includes(term)),
        )
    }, [options, searchTerm])

    // Option đang được chọn
    const selectedOption = useMemo(() => {
        return options.find((opt) => opt.value === value) || null
    }, [options, value])

    // Đóng dropdown và trả lại focus
    const closeDropdown = useCallback(() => {
        setIsOpen(false)
        setSearchTerm('')
        setHighlightedIndex(-1)
        triggerRef.current?.focus()
    }, [])

    // Tính toán vị trí mở (nếu sát mép dưới màn hình thì mở ngược lên)
    const updatePlacement = useCallback(() => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const dropdownExpectedHeight = 260
        if (spaceBelow < dropdownExpectedHeight && rect.top > dropdownExpectedHeight) {
            setPlacement('top')
        } else {
            setPlacement('bottom')
        }
    }, [])

    // Mở dropdown
    const openDropdown = useCallback(() => {
        if (disabled) return
        updatePlacement()
        setIsOpen(true)
        // Tìm index của option đang được chọn trong filtered
        const currentIndex = filteredOptions.findIndex((opt) => opt.value === value)
        setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0)
    }, [disabled, filteredOptions, updatePlacement, value])

    // Focus vào input tìm kiếm khi mở
    useEffect(() => {
        if (isOpen && isSearchable) {
            const timer = setTimeout(() => {
                searchInputRef.current?.focus()
            }, 50)
            return () => clearTimeout(timer)
        }
    }, [isOpen, isSearchable])

    // Cuộn option được highlight vào view
    useEffect(() => {
        if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
            const activeEl = listboxRef.current.children[highlightedIndex] as HTMLElement
            if (activeEl && typeof activeEl.scrollIntoView === 'function') {
                activeEl.scrollIntoView({ block: 'nearest' })
            }
        }
    }, [isOpen, highlightedIndex])

    // Lắng nghe click outside
    useEffect(() => {
        if (!isOpen) return
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
                setSearchTerm('')
                setHighlightedIndex(-1)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('touchstart', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
        }
    }, [isOpen])

    // Xử lý chọn option
    const handleSelect = (opt: SelectOption) => {
        onChange(opt.value)
        closeDropdown()
    }

    // Xử lý phím tắt trên Trigger button
    const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openDropdown()
        }
    }

    // Xử lý phím tắt khi menu đang mở
    const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape') {
            e.preventDefault()
            closeDropdown()
            return
        }

        if (e.key === 'Tab') {
            setIsOpen(false)
            setSearchTerm('')
            setHighlightedIndex(-1)
            return
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0))
            return
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1))
            return
        }

        if (e.key === 'Enter' || (e.key === ' ' && !isSearchable)) {
            e.preventDefault()
            if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                handleSelect(filteredOptions[highlightedIndex])
            }
            return
        }

        if (e.key === 'Home') {
            e.preventDefault()
            setHighlightedIndex(0)
            return
        }

        if (e.key === 'End') {
            e.preventDefault()
            setHighlightedIndex(filteredOptions.length - 1)
            return
        }
    }

    const activeOptionId =
        highlightedIndex >= 0 && filteredOptions[highlightedIndex]
            ? `${selectId}-option-${highlightedIndex}`
            : undefined

    return (
        <div
            className={`accessible-select-container ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}
            ref={containerRef}
            onKeyDown={isOpen ? handleMenuKeyDown : undefined}
            data-testid={testId ? `${testId}-container` : 'accessible-select-container'}
        >
            {/* Native hidden select for form / testing compatibility */}
            <select
                aria-hidden="true"
                tabIndex={-1}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                data-testid={testId}
                className="accessible-select-native-hidden"
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>

            {/* Trigger Button */}
            <button
                type="button"
                id={selectId}
                ref={triggerRef}
                className={`accessible-select-trigger ${isOpen ? 'active' : ''} ${!selectedOption ? 'is-placeholder' : ''}`}
                onClick={() => (isOpen ? closeDropdown() : openDropdown())}
                onKeyDown={handleTriggerKeyDown}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={listboxId}
                aria-activedescendant={isOpen ? activeOptionId : undefined}
                aria-label={ariaLabel || placeholder}
                data-testid={testId ? `${testId}-trigger` : 'accessible-select-trigger'}
            >
                <span className="accessible-select-value">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span className={`accessible-select-arrow ${isOpen ? 'rotated' : ''}`} aria-hidden="true">
                    ▼
                </span>
            </button>

            {/* Dropdown Popup */}
            {isOpen && (
                <div
                    className={`accessible-select-popup placement-${placement}`}
                    role="presentation"
                >
                    {/* Ô tìm kiếm trong popup nếu danh sách lớn */}
                    {isSearchable && (
                        <div className="accessible-select-search-box">
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="accessible-select-search-input"
                                placeholder={searchPlaceholder}
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value)
                                    setHighlightedIndex(0)
                                }}
                                aria-label="Tìm kiếm trong danh sách"
                                data-testid={testId ? `${testId}-search` : 'accessible-select-search'}
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    className="accessible-select-search-clear"
                                    onClick={() => {
                                        setSearchTerm('')
                                        searchInputRef.current?.focus()
                                    }}
                                    title="Xóa tìm kiếm"
                                    aria-label="Xóa tìm kiếm"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    )}

                    {/* Danh sách các Option */}
                    <ul
                        ref={listboxRef}
                        id={listboxId}
                        role="listbox"
                        className="accessible-select-options-list"
                        aria-label={ariaLabel || placeholder}
                        tabIndex={-1}
                    >
                        {filteredOptions.length === 0 ? (
                            <li className="accessible-select-empty-state" role="status">
                                Không tìm thấy kết quả phù hợp
                            </li>
                        ) : (
                            filteredOptions.map((opt, index) => {
                                const isSelected = opt.value === value
                                const isHighlighted = index === highlightedIndex
                                return (
                                    <li
                                        key={opt.value || `opt-${index}`}
                                        id={`${selectId}-option-${index}`}
                                        role="option"
                                        aria-selected={isSelected}
                                        className={`accessible-select-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                                        onClick={() => handleSelect(opt)}
                                        onMouseEnter={() => setHighlightedIndex(index)}
                                        data-testid={testId ? `${testId}-option-${opt.value}` : `option-${opt.value}`}
                                    >
                                        <span className="accessible-select-option-label">
                                            {opt.label}
                                        </span>
                                        {opt.subLabel && (
                                            <span className="accessible-select-option-sublabel">
                                                {opt.subLabel}
                                            </span>
                                        )}
                                        {isSelected && (
                                            <span className="accessible-select-check-icon" aria-hidden="true">
                                                ✓
                                            </span>
                                        )}
                                    </li>
                                )
                            })
                        )}
                    </ul>
                </div>
            )}
        </div>
    )
}
