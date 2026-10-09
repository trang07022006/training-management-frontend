/**
 * Program Structure Page (SCRUM-124 Activity A6).
 * Giao diện quản lý cấu trúc chương trình đào tạo & môn học tiên quyết:
 * - Xem cấu trúc môn học theo học kỳ
 * - Thêm môn học vào chương trình (course.manage)
 * - Chỉnh sửa học kỳ, loại môn (bắt buộc/tự chọn), thứ tự học (course.manage)
 * - Sắp xếp môn học bằng nút Di chuyển Lên / Xuống (course.manage)
 * - Gỡ môn học an toàn khỏi chương trình (course.manage)
 * - Quản lý môn tiên quyết & phát hiện chu trình (course.manage)
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getRolePermissions, SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import {
    getProgramStructure,
    addSubjectToProgram,
    updateProgramSubject,
    reorderProgramSubjects,
    removeSubjectFromProgram,
    getPrerequisites,
    addPrerequisite,
    removePrerequisite,
    type ProgramStructure,
    type ProgramSubject,
    type ProgramPrerequisite,
    type RequestFunction,
    ApiError,
} from '../api/programStructureApi'
import { getSubjects, type Subject } from '../api/subjectApi'
import { getProgramStatusLabel } from '../api/trainingProgramApi'
import { Breadcrumb } from '../components/Breadcrumb'
import './ProgramStructurePage.css'

export interface ProgramStructurePageProps {
    programIdProp?: string
    customRequest?: RequestFunction
    canManageOverride?: boolean
}

export function ProgramStructurePage({
    programIdProp,
    customRequest,
    canManageOverride,
}: ProgramStructurePageProps) {
    const routeParams = useParams<{ programId?: string }>()
    const programId = programIdProp || routeParams.programId || ''

    const { request: sessionRequest, role, roles, permissions: sessionPermissions } = useSession()
    const requestFn: RequestFunction = customRequest || (sessionRequest as RequestFunction)

    const permissions =
        sessionPermissions && sessionPermissions.length > 0
            ? sessionPermissions
            : getRolePermissions(roles && roles.length > 0 ? roles : role)

    const canManage =
        canManageOverride !== undefined
            ? canManageOverride
            : permissions.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE)

    // Data State
    const [structure, setStructure] = useState<ProgramStructure | null>(null)
    const [loading, setLoading] = useState<boolean>(Boolean(programId))
    const [errorMessage, setErrorMessage] = useState<string | null>(
        programId ? null : 'Mã chương trình đào tạo không hợp lệ.',
    )
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Available subjects for Add Modal
    const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([])
    const [loadingSubjects, setLoadingSubjects] = useState<boolean>(false)

    // Add Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false)
    const [addSubjectId, setAddSubjectId] = useState<string>('')
    const [addSemester, setAddSemester] = useState<string>('1')
    const [addIsMandatory, setAddIsMandatory] = useState<boolean>(true)
    const [addOrderIndex, setAddOrderIndex] = useState<string>('')
    const [addModalError, setAddModalError] = useState<string | null>(null)
    const [isSubmittingAdd, setIsSubmittingAdd] = useState<boolean>(false)

    // Edit Modal State
    const [editingItem, setEditingItem] = useState<ProgramSubject | null>(null)
    const [editSemester, setEditSemester] = useState<string>('')
    const [editIsMandatory, setEditIsMandatory] = useState<boolean>(true)
    const [editOrderIndex, setEditOrderIndex] = useState<string>('1')
    const [editModalError, setEditModalError] = useState<string | null>(null)
    const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false)

    // Remove Confirm Modal State
    const [removingItem, setRemovingItem] = useState<ProgramSubject | null>(null)
    const [removeModalError, setRemoveModalError] = useState<string | null>(null)
    const [isSubmittingRemove, setIsSubmittingRemove] = useState<boolean>(false)

    // Prerequisite Modal State
    const [prereqTargetItem, setPrereqTargetItem] = useState<ProgramSubject | null>(null)
    const [prerequisitesList, setPrerequisitesList] = useState<ProgramPrerequisite[]>([])
    const [loadingPrereqs, setLoadingPrereqs] = useState<boolean>(false)
    const [selectedPrereqSubjectId, setSelectedPrereqSubjectId] = useState<string>('')
    const [prereqModalError, setPrereqModalError] = useState<string | null>(null)
    const [prereqModalSuccess, setPrereqModalSuccess] = useState<string | null>(null)
    const [isSubmittingPrereq, setIsSubmittingPrereq] = useState<boolean>(false)

    // Fetch Program Structure
    const loadStructure = useCallback(async () => {
        if (!programId) {
            setErrorMessage('Mã chương trình đào tạo không hợp lệ.')
            setLoading(false)
            return
        }

        try {
            const data = await getProgramStructure(requestFn, programId)
            setStructure(data)
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setErrorMessage(err.message)
            } else {
                setErrorMessage('Lỗi khi tải cấu trúc chương trình đào tạo.')
            }
        } finally {
            setLoading(false)
        }
    }, [programId, requestFn])

    useEffect(() => {
        let isMounted = true
        if (!programId) return

        getProgramStructure(requestFn, programId)
            .then((data) => {
                if (isMounted) {
                    setStructure(data)
                    setLoading(false)
                }
            })
            .catch((err: unknown) => {
                if (isMounted) {
                    setErrorMessage(
                        err instanceof ApiError
                            ? err.message
                            : 'Lỗi khi tải cấu trúc chương trình đào tạo.',
                    )
                    setLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [programId, requestFn])

    // Load available subjects when Add Modal opens
    const handleOpenAddModal = async () => {
        setIsAddModalOpen(true)
        setAddModalError(null)
        setAddSubjectId('')
        setAddSemester('1')
        setAddIsMandatory(true)
        setAddOrderIndex('')
        setLoadingSubjects(true)

        try {
            const res = await getSubjects(requestFn, {
                page: 1,
                page_size: 100,
                status: structure?.program.status === 'active' ? 'active' : undefined,
            })
            // Exclude archived subjects and subjects already added to program
            const existingSubjectIds = new Set(structure?.items.map((i) => i.subject_id) || [])
            const filtered = res.items.filter(
                (s) => s.status !== 'archived' && !existingSubjectIds.has(s.id),
            )
            setAvailableSubjects(filtered)
            if (filtered.length > 0) {
                setAddSubjectId(filtered[0].id)
            }
        } catch (err: unknown) {
            setAddModalError(
                err instanceof ApiError ? err.message : 'Không thể tải danh sách môn học.',
            )
        } finally {
            setLoadingSubjects(false)
        }
    }

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!addSubjectId) {
            setAddModalError('Vui lòng chọn môn học cần thêm.')
            return
        }

        setIsSubmittingAdd(true)
        setAddModalError(null)

        try {
            const semNum = addSemester.trim() ? parseInt(addSemester.trim(), 10) : null
            const orderNum = addOrderIndex.trim() ? parseInt(addOrderIndex.trim(), 10) : undefined

            await addSubjectToProgram(requestFn, programId, {
                subject_id: addSubjectId,
                semester: semNum,
                is_mandatory: addIsMandatory,
                order_index: orderNum,
            })

            setIsAddModalOpen(false)
            setSuccessMessage('Thêm môn học vào chương trình thành công.')
            void loadStructure()
        } catch (err: unknown) {
            setAddModalError(
                err instanceof ApiError ? err.message : 'Lỗi khi thêm môn học vào chương trình.',
            )
        } finally {
            setIsSubmittingAdd(false)
        }
    }

    // Edit Modal Open
    const handleOpenEditModal = (item: ProgramSubject) => {
        setEditingItem(item)
        setEditSemester(item.semester !== null ? String(item.semester) : '')
        setEditIsMandatory(item.is_mandatory)
        setEditOrderIndex(String(item.order_index))
        setEditModalError(null)
    }

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingItem) return

        setIsSubmittingEdit(true)
        setEditModalError(null)

        try {
            const semNum = editSemester.trim() ? parseInt(editSemester.trim(), 10) : null
            const orderNum = editOrderIndex.trim() ? parseInt(editOrderIndex.trim(), 10) : 1

            await updateProgramSubject(requestFn, programId, editingItem.program_subject_id, {
                semester: semNum,
                is_mandatory: editIsMandatory,
                order_index: orderNum,
            })

            setEditingItem(null)
            setSuccessMessage(`Đã cập nhật thông tin môn ${editingItem.code}.`)
            void loadStructure()
        } catch (err: unknown) {
            setEditModalError(
                err instanceof ApiError ? err.message : 'Lỗi khi cập nhật môn học trong chương trình.',
            )
        } finally {
            setIsSubmittingEdit(false)
        }
    }

    // Reorder Handlers (Up / Down)
    const handleMoveItem = async (
        semesterKey: number | null,
        itemList: ProgramSubject[],
        currentIndex: number,
        direction: 'up' | 'down',
    ) => {
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
        if (targetIndex < 0 || targetIndex >= itemList.length) return

        // Swap IDs
        const newOrdered = [...itemList]
        const temp = newOrdered[currentIndex]
        newOrdered[currentIndex] = newOrdered[targetIndex]
        newOrdered[targetIndex] = temp

        const orderedIds = newOrdered.map((item) => item.program_subject_id)

        try {
            await reorderProgramSubjects(requestFn, programId, {
                semester: semesterKey,
                ordered_ids: orderedIds,
            })
            void loadStructure()
        } catch (err: unknown) {
            setErrorMessage(
                err instanceof ApiError ? err.message : 'Lỗi khi sắp xếp lại thứ tự môn học.',
            )
        }
    }

    // Remove Handlers
    const handleOpenRemoveModal = (item: ProgramSubject) => {
        setRemovingItem(item)
        setRemoveModalError(null)
    }

    const handleRemoveSubmit = async () => {
        if (!removingItem) return

        setIsSubmittingRemove(true)
        setRemoveModalError(null)

        try {
            await removeSubjectFromProgram(requestFn, programId, removingItem.program_subject_id)
            setRemovingItem(null)
            setSuccessMessage(`Đã gỡ môn ${removingItem.code} khỏi chương trình.`)
            void loadStructure()
        } catch (err: unknown) {
            setRemoveModalError(
                err instanceof ApiError ? err.message : 'Lỗi khi gỡ môn học khỏi chương trình.',
            )
        } finally {
            setIsSubmittingRemove(false)
        }
    }

    // Prerequisite Modal Handlers
    const handleOpenPrereqModal = async (item: ProgramSubject) => {
        setPrereqTargetItem(item)
        setPrereqModalError(null)
        setPrereqModalSuccess(null)
        setSelectedPrereqSubjectId('')
        setLoadingPrereqs(true)

        try {
            const list = await getPrerequisites(requestFn, programId, item.program_subject_id)
            setPrerequisitesList(list)
        } catch (err: unknown) {
            setPrereqModalError(
                err instanceof ApiError ? err.message : 'Không thể tải danh sách môn tiên quyết.',
            )
        } finally {
            setLoadingPrereqs(false)
        }
    }

    const handleAddPrerequisiteSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!prereqTargetItem || !selectedPrereqSubjectId) return

        setIsSubmittingPrereq(true)
        setPrereqModalError(null)
        setPrereqModalSuccess(null)

        try {
            await addPrerequisite(
                requestFn,
                programId,
                prereqTargetItem.program_subject_id,
                selectedPrereqSubjectId,
            )
            setPrereqModalSuccess('Đã thêm môn tiên quyết thành công.')
            setSelectedPrereqSubjectId('')
            // Reload prerequisites list and full structure
            const list = await getPrerequisites(
                requestFn,
                programId,
                prereqTargetItem.program_subject_id,
            )
            setPrerequisitesList(list)
            void loadStructure()
        } catch (err: unknown) {
            setPrereqModalError(
                err instanceof ApiError ? err.message : 'Không thể thêm môn tiên quyết.',
            )
        } finally {
            setIsSubmittingPrereq(false)
        }
    }

    const handleRemovePrerequisiteSubmit = async (prereqProgramSubjectId: string) => {
        if (!prereqTargetItem) return

        setIsSubmittingPrereq(true)
        setPrereqModalError(null)
        setPrereqModalSuccess(null)

        try {
            await removePrerequisite(
                requestFn,
                programId,
                prereqTargetItem.program_subject_id,
                prereqProgramSubjectId,
            )
            setPrereqModalSuccess('Đã gỡ môn tiên quyết thành công.')
            // Reload list
            const list = await getPrerequisites(
                requestFn,
                programId,
                prereqTargetItem.program_subject_id,
            )
            setPrerequisitesList(list)
            void loadStructure()
        } catch (err: unknown) {
            setPrereqModalError(
                err instanceof ApiError ? err.message : 'Không thể gỡ môn tiên quyết.',
            )
        } finally {
            setIsSubmittingPrereq(false)
        }
    }

    // Keyboard ESC listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isAddModalOpen && !isSubmittingAdd) setIsAddModalOpen(false)
                if (editingItem && !isSubmittingEdit) setEditingItem(null)
                if (removingItem && !isSubmittingRemove) setRemovingItem(null)
                if (prereqTargetItem && !isSubmittingPrereq) setPrereqTargetItem(null)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [
        isAddModalOpen,
        isSubmittingAdd,
        editingItem,
        isSubmittingEdit,
        removingItem,
        isSubmittingRemove,
        prereqTargetItem,
        isSubmittingPrereq,
    ])

    // Group items by semester
    const semesterGroups = useMemo(() => {
        if (!structure) return []

        const duration = structure.program.duration_semesters || 0
        const map = new Map<number | null, ProgramSubject[]>()

        // Initialize planned semesters
        for (let s = 1; s <= duration; s++) {
            map.set(s, [])
        }

        // Put items into semesters
        for (const item of structure.items) {
            const sem = item.semester
            if (!map.has(sem)) {
                map.set(sem, [])
            }
            map.get(sem)!.push(item)
        }

        // Sort items inside each semester by order_index
        for (const list of map.values()) {
            list.sort((a, b) => a.order_index - b.order_index)
        }

        // Extract groups: numeric semesters ascending, then null at the end
        const keys = Array.from(map.keys()).sort((a, b) => {
            if (a === null) return 1
            if (b === null) return -1
            return a - b
        })

        return keys.map((key) => ({
            semester: key,
            title: key !== null ? `Học kỳ ${key}` : 'Chưa phân học kỳ',
            items: map.get(key) || [],
            totalCredits: (map.get(key) || []).reduce((acc, curr) => acc + (curr.credits || 0), 0),
        }))
    }, [structure])

    // Eligible subjects for Prerequisite Add Selector
    const eligiblePrereqOptions = useMemo(() => {
        if (!structure || !prereqTargetItem) return []
        const currentPrereqIds = new Set(
            prerequisitesList.map((p) => p.prerequisite_program_subject_id),
        )
        return structure.items.filter(
            (item) =>
                item.program_subject_id !== prereqTargetItem.program_subject_id &&
                !currentPrereqIds.has(item.program_subject_id),
        )
    }, [structure, prereqTargetItem, prerequisitesList])

    const isProgramArchived = structure?.program.status === 'archived'

    if (loading) {
        return (
            <div className="program-structure-page" data-testid="program-structure-loading">
                <p>Đang tải cấu trúc chương trình đào tạo...</p>
            </div>
        )
    }

    if (errorMessage && !structure) {
        return (
            <div className="program-structure-page" data-testid="program-structure-error">
                <Link to="/training-programs" className="structure-back-link">
                    ← Quay lại danh sách chương trình
                </Link>
                <div className="structure-banner structure-banner-error" role="alert">
                    <p className="structure-banner-message">⚠ {errorMessage}</p>
                </div>
            </div>
        )
    }

    if (!structure) {
        return null
    }

    const { program, total_subjects, total_credits } = structure

    return (
        <div className="program-structure-page" data-testid="program-structure-page">
            <Breadcrumb
                items={[
                    { label: 'Chương trình đào tạo', path: '/training-programs' },
                    { label: 'Cấu trúc chương trình' },
                ]}
            />
            {/* Navigation back */}
            <nav aria-label="Điều hướng">
                <Link to="/training-programs" className="structure-back-link">
                    ← Quay lại danh sách chương trình
                </Link>
            </nav>

            {/* Header */}
            <header className="structure-header" data-testid="structure-header">
                <div className="structure-header-left">
                    <span className="structure-tag">Cấu trúc chương trình đào tạo</span>
                    <div className="structure-title-row">
                        <h1 className="structure-title" data-testid="structure-program-name">
                            {program.name}
                        </h1>
                        <span className="structure-code-badge" data-testid="structure-program-code">
                            {program.code}
                        </span>
                        <span
                            className={`program-status-badge status-${program.status}`}
                            data-testid="structure-program-status"
                        >
                            {getProgramStatusLabel(program.status)}
                        </span>
                    </div>
                    {program.description && (
                        <p className="structure-desc">{program.description}</p>
                    )}
                </div>

                <div className="structure-header-actions">
                    {canManage && !isProgramArchived && (
                        <button
                            type="button"
                            className="btn-primary-add"
                            data-testid="btn-open-add-subject"
                            onClick={handleOpenAddModal}
                        >
                            + Thêm môn học
                        </button>
                    )}
                </div>
            </header>

            {/* Success and Error Banners */}
            {successMessage && (
                <div className="structure-banner structure-banner-success" role="status" data-testid="banner-success">
                    <p className="structure-banner-message">✓ {successMessage}</p>
                    <button
                        type="button"
                        className="structure-banner-close"
                        aria-label="Đóng thông báo"
                        onClick={() => setSuccessMessage(null)}
                    >
                        ×
                    </button>
                </div>
            )}

            {errorMessage && (
                <div className="structure-banner structure-banner-error" role="alert" data-testid="banner-error">
                    <p className="structure-banner-message">⚠ {errorMessage}</p>
                    <button
                        type="button"
                        className="structure-banner-close"
                        aria-label="Đóng thông báo lỗi"
                        onClick={() => setErrorMessage(null)}
                    >
                        ×
                    </button>
                </div>
            )}

            {isProgramArchived && (
                <div className="structure-banner structure-banner-warning" role="status">
                    <p className="structure-banner-message">
                        ℹ Chương trình đào tạo đã lưu trữ. Không thể thêm, sửa, sắp xếp hoặc gỡ môn học.
                    </p>
                </div>
            )}

            {/* Stat Cards */}
            <section className="structure-stats-grid" aria-label="Thống kê tổng quan chương trình">
                <div className="structure-stat-card">
                    <div className="structure-stat-label">Thời lượng</div>
                    <div className="structure-stat-value" data-testid="stat-duration">
                        {program.duration_semesters ? `${program.duration_semesters} học kỳ` : 'Chưa xác định'}
                    </div>
                </div>
                <div className="structure-stat-card">
                    <div className="structure-stat-label">Tổng số môn</div>
                    <div className="structure-stat-value" data-testid="stat-total-subjects">
                        {total_subjects} môn
                    </div>
                </div>
                <div className="structure-stat-card">
                    <div className="structure-stat-label">Tổng tín chỉ</div>
                    <div className="structure-stat-value" data-testid="stat-total-credits">
                        {total_credits} tín chỉ
                    </div>
                </div>
            </section>

            {/* Semester Groups */}
            <main className="structure-semesters-container">
                {total_subjects === 0 ? (
                    <div className="empty-structure-card" data-testid="empty-structure-card">
                        <div className="empty-structure-icon">📚</div>
                        <h2 className="empty-structure-title">Chưa có môn học trong chương trình</h2>
                        <p>Bấm nút "Thêm môn học" ở trên để bắt đầu xây dựng khung chương trình đào tạo.</p>
                    </div>
                ) : (
                    semesterGroups.map((group) => {
                        // Skip empty planned semesters if total_subjects > 0 and no items in it
                        if (group.items.length === 0 && group.semester === null) return null

                        return (
                            <section
                                key={group.semester !== null ? `sem-${group.semester}` : 'sem-null'}
                                className="semester-section"
                                data-testid={`semester-section-${group.semester ?? 'null'}`}
                                aria-labelledby={`heading-sem-${group.semester ?? 'null'}`}
                            >
                                <div className="semester-header">
                                    <div className="semester-title-group">
                                        <h2
                                            id={`heading-sem-${group.semester ?? 'null'}`}
                                            className="semester-title"
                                        >
                                            {group.title}
                                        </h2>
                                        <span className="semester-meta">
                                            ({group.items.length} môn • {group.totalCredits} tín chỉ)
                                        </span>
                                    </div>
                                </div>

                                {group.items.length === 0 ? (
                                    <div className="empty-semester-notice">
                                        Chưa có môn học trong {group.title.toLowerCase()}.
                                    </div>
                                ) : (
                                    <div className="structure-table-wrapper">
                                        <table className="structure-table">
                                            <thead>
                                                <tr>
                                                    <th scope="col" style={{ width: '90px' }}>Thứ tự</th>
                                                    <th scope="col" style={{ width: '130px' }}>Mã môn</th>
                                                    <th scope="col">Tên môn học</th>
                                                    <th scope="col" style={{ width: '90px' }}>Tín chỉ</th>
                                                    <th scope="col" style={{ width: '120px' }}>Loại môn</th>
                                                    <th scope="col">Môn tiên quyết</th>
                                                    {canManage && !isProgramArchived && (
                                                        <th scope="col" style={{ textAlign: 'right', width: '220px' }}>
                                                            Thao tác
                                                        </th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.items.map((item, index) => (
                                                    <tr
                                                        key={item.program_subject_id}
                                                        data-testid={`subject-row-${item.program_subject_id}`}
                                                    >
                                                        {/* Reorder / Order index */}
                                                        <td className="cell-order">
                                                            <div className="order-controls">
                                                                <span className="order-badge">{item.order_index}</span>
                                                                {canManage && !isProgramArchived && (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            className="btn-order-move"
                                                                            data-testid={`btn-move-up-${item.program_subject_id}`}
                                                                            disabled={index === 0}
                                                                            title="Di chuyển lên"
                                                                            aria-label={`Di chuyển môn ${item.code} lên trên`}
                                                                            onClick={() =>
                                                                                handleMoveItem(
                                                                                    group.semester,
                                                                                    group.items,
                                                                                    index,
                                                                                    'up',
                                                                                )
                                                                            }
                                                                        >
                                                                            ▲
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="btn-order-move"
                                                                            data-testid={`btn-move-down-${item.program_subject_id}`}
                                                                            disabled={index === group.items.length - 1}
                                                                            title="Di chuyển xuống"
                                                                            aria-label={`Di chuyển môn ${item.code} xuống dưới`}
                                                                            onClick={() =>
                                                                                handleMoveItem(
                                                                                    group.semester,
                                                                                    group.items,
                                                                                    index,
                                                                                    'down',
                                                                                )
                                                                            }
                                                                        >
                                                                            ▼
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Code */}
                                                        <td className="cell-subject-code" data-testid={`subject-code-${item.program_subject_id}`}>
                                                            {item.code || (item as any).subject_code}
                                                        </td>

                                                        {/* Name */}
                                                        <td className="cell-subject-name" data-testid={`subject-name-${item.program_subject_id}`}>
                                                            {item.name || (item as any).subject_name}
                                                        </td>

                                                        {/* Credits */}
                                                        <td className="cell-credits" data-testid={`subject-credits-${item.program_subject_id}`}>
                                                            {item.credits}
                                                        </td>

                                                        {/* Mandatory / Elective */}
                                                        <td>
                                                            <span
                                                                className={`type-badge ${
                                                                    item.is_mandatory ? 'type-mandatory' : 'type-elective'
                                                                }`}
                                                                data-testid={`subject-type-${item.program_subject_id}`}
                                                            >
                                                                {item.is_mandatory ? 'Bắt buộc' : 'Tự chọn'}
                                                            </span>
                                                        </td>

                                                        {/* Prerequisites */}
                                                        <td>
                                                            <div className="prerequisites-list">
                                                                {item.prerequisites.length === 0 ? (
                                                                    <span className="prereq-none">—</span>
                                                                ) : (
                                                                    item.prerequisites.map((p) => (
                                                                        <span
                                                                            key={p.id}
                                                                            className="prereq-badge"
                                                                            title={p.name || (p as any).prerequisite_subject_name || (p as any).prerequisite_name}
                                                                            data-testid={`prereq-badge-${p.id}`}
                                                                        >
                                                                            🔗 {p.code || (p as any).prerequisite_subject_code || (p as any).prerequisite_code || 'Môn tiên quyết'}
                                                                        </span>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Actions */}
                                                        {canManage && !isProgramArchived && (
                                                            <td className="cell-actions">
                                                                <div className="actions-group">
                                                                    <button
                                                                        type="button"
                                                                        className="btn-sm-prereq"
                                                                        data-testid={`btn-prereq-${item.program_subject_id}`}
                                                                        aria-label={`Quản lý tiên quyết môn ${item.code}`}
                                                                        onClick={() => handleOpenPrereqModal(item)}
                                                                    >
                                                                        Tiên quyết ({item.prerequisites.length})
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn-sm-edit"
                                                                        data-testid={`btn-edit-${item.program_subject_id}`}
                                                                        aria-label={`Sửa môn ${item.code}`}
                                                                        onClick={() => handleOpenEditModal(item)}
                                                                    >
                                                                        Sửa
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn-sm-remove"
                                                                        data-testid={`btn-remove-${item.program_subject_id}`}
                                                                        aria-label={`Gỡ môn ${item.code}`}
                                                                        onClick={() => handleOpenRemoveModal(item)}
                                                                    >
                                                                        Gỡ
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        )
                    })
                )}
            </main>

            {/* ADD SUBJECT MODAL */}
            {isAddModalOpen && (
                <div
                    className="structure-modal-backdrop"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="add-subject-modal-title"
                >
                    <div className="structure-modal">
                        <div className="structure-modal-header">
                            <h2 id="add-subject-modal-title" className="structure-modal-title">
                                Thêm môn học vào chương trình
                            </h2>
                            <button
                                type="button"
                                className="structure-modal-close"
                                aria-label="Đóng modal"
                                onClick={() => !isSubmittingAdd && setIsAddModalOpen(false)}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleAddSubmit}>
                            <div className="structure-modal-body">
                                {addModalError && (
                                    <div className="structure-banner structure-banner-error" role="alert" data-testid="add-modal-error">
                                        <p className="structure-banner-message">⚠ {addModalError}</p>
                                    </div>
                                )}

                                {loadingSubjects ? (
                                    <p>Đang tải danh sách môn học khả dụng...</p>
                                ) : availableSubjects.length === 0 ? (
                                    <p className="form-hint">
                                        Không còn môn học nào phù hợp để thêm (tất cả môn đã có trong chương trình hoặc đã lưu trữ).
                                    </p>
                                ) : (
                                    <div className="form-group">
                                        <label htmlFor="add-subject-select" className="form-label">
                                            Chọn môn học: *
                                        </label>
                                        <select
                                            id="add-subject-select"
                                            className="form-select"
                                            data-testid="add-subject-select"
                                            value={addSubjectId}
                                            onChange={(e) => setAddSubjectId(e.target.value)}
                                            required
                                        >
                                            {availableSubjects.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.code} - {s.name} ({s.credits} tín chỉ)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label htmlFor="add-semester-input" className="form-label">
                                        Học kỳ dự kiến:
                                    </label>
                                    <input
                                        type="number"
                                        id="add-semester-input"
                                        className="form-input"
                                        data-testid="add-semester-input"
                                        min={1}
                                        max={program.duration_semesters || 20}
                                        placeholder="Để trống nếu chưa phân kỳ"
                                        value={addSemester}
                                        onChange={(e) => setAddSemester(e.target.value)}
                                    />
                                    <p className="form-hint">
                                        {program.duration_semesters
                                            ? `Chương trình có tối đa ${program.duration_semesters} học kỳ.`
                                            : 'Nhập số học kỳ (>= 1) hoặc để trống.'}
                                    </p>
                                </div>

                                <div className="form-group form-group-checkbox">
                                    <label htmlFor="add-mandatory-checkbox" className="form-checkbox-label">
                                        <input
                                            type="checkbox"
                                            id="add-mandatory-checkbox"
                                            data-testid="add-mandatory-checkbox"
                                            checked={addIsMandatory}
                                            onChange={(e) => setAddIsMandatory(e.target.checked)}
                                            className="form-checkbox-input"
                                        />
                                        <div className="form-checkbox-text">
                                            <span className="form-checkbox-title">Môn học bắt buộc</span>
                                            <span className="form-checkbox-description">Bỏ chọn nếu đây là môn tự chọn</span>
                                        </div>
                                    </label>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="add-order-input" className="form-label">
                                        Thứ tự trong học kỳ:
                                    </label>
                                    <input
                                        type="number"
                                        id="add-order-input"
                                        className="form-input"
                                        data-testid="add-order-input"
                                        min={1}
                                        placeholder="Tự động thêm vào cuối nếu để trống"
                                        value={addOrderIndex}
                                        onChange={(e) => setAddOrderIndex(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="structure-modal-footer">
                                <button
                                    type="button"
                                    className="btn-modal-cancel"
                                    onClick={() => setIsAddModalOpen(false)}
                                    disabled={isSubmittingAdd}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="btn-modal-submit"
                                    data-testid="btn-submit-add-subject"
                                    disabled={isSubmittingAdd || availableSubjects.length === 0}
                                >
                                    {isSubmittingAdd ? 'Đang thêm...' : 'Thêm vào chương trình'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT SUBJECT MODAL */}
            {editingItem && (
                <div
                    className="structure-modal-backdrop"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edit-subject-modal-title"
                >
                    <div className="structure-modal">
                        <div className="structure-modal-header">
                            <h2 id="edit-subject-modal-title" className="structure-modal-title">
                                Chỉnh sửa thông tin môn học
                            </h2>
                            <button
                                type="button"
                                className="structure-modal-close"
                                aria-label="Đóng modal"
                                onClick={() => !isSubmittingEdit && setEditingItem(null)}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit}>
                            <div className="structure-modal-body">
                                {editModalError && (
                                    <div className="structure-banner structure-banner-error" role="alert" data-testid="edit-modal-error">
                                        <p className="structure-banner-message">⚠ {editModalError}</p>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label">Môn học:</label>
                                    <div className="form-input" style={{ background: '#f8fafc', color: '#64748b' }}>
                                        <strong>{editingItem.code}</strong> - {editingItem.name} ({editingItem.credits} tín chỉ)
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="edit-semester-input" className="form-label">
                                        Học kỳ:
                                    </label>
                                    <input
                                        type="number"
                                        id="edit-semester-input"
                                        className="form-input"
                                        data-testid="edit-semester-input"
                                        min={1}
                                        max={program.duration_semesters || 20}
                                        placeholder="Để trống nếu chưa phân kỳ"
                                        value={editSemester}
                                        onChange={(e) => setEditSemester(e.target.value)}
                                    />
                                </div>

                                <div className="form-group form-group-checkbox">
                                    <label htmlFor="edit-mandatory-checkbox" className="form-checkbox-label">
                                        <input
                                            type="checkbox"
                                            id="edit-mandatory-checkbox"
                                            data-testid="edit-mandatory-checkbox"
                                            checked={editIsMandatory}
                                            onChange={(e) => setEditIsMandatory(e.target.checked)}
                                            className="form-checkbox-input"
                                        />
                                        <div className="form-checkbox-text">
                                            <span className="form-checkbox-title">Môn học bắt buộc</span>
                                            <span className="form-checkbox-description">Bỏ chọn nếu đây là môn tự chọn</span>
                                        </div>
                                    </label>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="edit-order-input" className="form-label">
                                        Thứ tự trong học kỳ:
                                    </label>
                                    <input
                                        type="number"
                                        id="edit-order-input"
                                        className="form-input"
                                        data-testid="edit-order-input"
                                        min={1}
                                        value={editOrderIndex}
                                        onChange={(e) => setEditOrderIndex(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="structure-modal-footer">
                                <button
                                    type="button"
                                    className="btn-modal-cancel"
                                    onClick={() => setEditingItem(null)}
                                    disabled={isSubmittingEdit}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="btn-modal-submit"
                                    data-testid="btn-submit-edit-subject"
                                    disabled={isSubmittingEdit}
                                >
                                    {isSubmittingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* REMOVE SUBJECT CONFIRM MODAL */}
            {removingItem && (
                <div
                    className="structure-modal-backdrop"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="remove-subject-modal-title"
                >
                    <div className="structure-modal">
                        <div className="structure-modal-header">
                            <h2 id="remove-subject-modal-title" className="structure-modal-title">
                                Xác nhận gỡ môn học
                            </h2>
                            <button
                                type="button"
                                className="structure-modal-close"
                                aria-label="Đóng modal"
                                onClick={() => !isSubmittingRemove && setRemovingItem(null)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="structure-modal-body">
                            {removeModalError && (
                                <div className="structure-banner structure-banner-error" role="alert" data-testid="remove-modal-error">
                                    <p className="structure-banner-message">⚠ {removeModalError}</p>
                                </div>
                            )}

                            <p>
                                Bạn có chắc chắn muốn gỡ môn học{' '}
                                <strong>
                                    {removingItem.code} - {removingItem.name}
                                </strong>{' '}
                                khỏi chương trình đào tạo này không?
                            </p>
                            <p className="form-hint" style={{ color: '#b91c1c' }}>
                                Lưu ý: Thao tác này chỉ gỡ liên kết khỏi khung chương trình, không xóa môn học khỏi danh mục đào tạo chung.
                            </p>
                        </div>

                        <div className="structure-modal-footer">
                            <button
                                type="button"
                                className="btn-modal-cancel"
                                onClick={() => setRemovingItem(null)}
                                disabled={isSubmittingRemove}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="btn-modal-danger"
                                data-testid="btn-submit-remove-subject"
                                onClick={handleRemoveSubmit}
                                disabled={isSubmittingRemove}
                            >
                                {isSubmittingRemove ? 'Đang gỡ...' : 'Xác nhận gỡ môn'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PREREQUISITE MANAGEMENT MODAL */}
            {prereqTargetItem && (
                <div
                    className="structure-modal-backdrop"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="prereq-modal-title"
                >
                    <div className="structure-modal">
                        <div className="structure-modal-header">
                            <h2 id="prereq-modal-title" className="structure-modal-title">
                                Môn học tiên quyết: {prereqTargetItem.code}
                            </h2>
                            <button
                                type="button"
                                className="structure-modal-close"
                                aria-label="Đóng modal"
                                onClick={() => !isSubmittingPrereq && setPrereqTargetItem(null)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="structure-modal-body">
                            {prereqModalError && (
                                <div className="structure-banner structure-banner-error" role="alert" data-testid="prereq-modal-error">
                                    <p className="structure-banner-message">⚠ {prereqModalError}</p>
                                </div>
                            )}

                            {prereqModalSuccess && (
                                <div className="structure-banner structure-banner-success" role="status" data-testid="prereq-modal-success">
                                    <p className="structure-banner-message">✓ {prereqModalSuccess}</p>
                                </div>
                            )}

                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                                Thiết lập các môn học bắt buộc sinh viên phải hoàn thành trước khi học môn{' '}
                                <strong>{prereqTargetItem.name}</strong>.
                            </p>

                            {/* Current Prerequisites List */}
                            <div className="prereq-current-section">
                                <label className="form-label">Danh sách môn tiên quyết hiện tại:</label>
                                {loadingPrereqs ? (
                                    <p>Đang tải danh sách tiên quyết...</p>
                                ) : prerequisitesList.length === 0 ? (
                                    <p className="form-hint">Chưa có điều kiện tiên quyết nào được thiết lập.</p>
                                ) : (
                                    prerequisitesList.map((prereq) => (
                                        <div
                                            key={prereq.id}
                                            className="prereq-item-row"
                                            data-testid={`prereq-item-${prereq.id}`}
                                        >
                                            <span className="prereq-item-info">
                                                🔗 {prereq.prerequisite_code || (prereq as any).prerequisite_subject_code || (prereq as any).code || 'Môn học'}{' '}
                                                {(prereq.prerequisite_name || (prereq as any).prerequisite_subject_name || (prereq as any).name)
                                                    ? `- ${prereq.prerequisite_name || (prereq as any).prerequisite_subject_name || (prereq as any).name}`
                                                    : ''}
                                            </span>
                                            <button
                                                type="button"
                                                className="btn-prereq-del"
                                                data-testid={`btn-del-prereq-${prereq.id}`}
                                                disabled={isSubmittingPrereq}
                                                onClick={() =>
                                                    handleRemovePrerequisiteSubmit(
                                                        prereq.prerequisite_program_subject_id,
                                                    )
                                                }
                                            >
                                                Gỡ bỏ
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Add New Prerequisite */}
                            <form onSubmit={handleAddPrerequisiteSubmit} style={{ marginTop: '12px' }}>
                                <div className="form-group">
                                    <label htmlFor="add-prereq-select" className="form-label">
                                        Thêm môn tiên quyết:
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <select
                                            id="add-prereq-select"
                                            className="form-select"
                                            data-testid="add-prereq-select"
                                            style={{ flex: 1 }}
                                            value={selectedPrereqSubjectId}
                                            onChange={(e) => setSelectedPrereqSubjectId(e.target.value)}
                                        >
                                            <option value="">-- Chọn môn tiên quyết --</option>
                                            {eligiblePrereqOptions.map((opt) => (
                                                <option
                                                    key={opt.program_subject_id}
                                                    value={opt.program_subject_id}
                                                >
                                                    {opt.code || (opt as any).subject_code} - {opt.name || (opt as any).subject_name}{' '}
                                                    {opt.semester ? `(Kỳ ${opt.semester})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="submit"
                                            className="btn-modal-submit"
                                            data-testid="btn-submit-add-prereq"
                                            disabled={isSubmittingPrereq || !selectedPrereqSubjectId}
                                        >
                                            Thêm
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="structure-modal-footer">
                            <button
                                type="button"
                                className="btn-modal-cancel"
                                onClick={() => setPrereqTargetItem(null)}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
export default ProgramStructurePage
