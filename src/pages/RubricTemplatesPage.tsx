import { useEffect, useState, useMemo } from 'react'
import { useSession } from '../auth/SessionProvider'
import {
    getRubricTemplates,
    createRubricTemplate,
    deleteRubricTemplate,
    type RubricTemplate,
    type CreateRubricPayload,
} from '../api/rubricApi'
import './RubricTemplatesPage.css'

interface CriterionFormItem {
    name: string
    description: string
    weight: number | ''
    max_score: number | ''
}

export function RubricTemplatesPage() {
    const session = useSession()
    const request = session.request

    const [templates, setTemplates] = useState<RubricTemplate[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<RubricTemplate | null>(null)

    // Form fields
    const [templateName, setTemplateName] = useState('')
    const [templateDescription, setTemplateDescription] = useState('')
    const [criteriaList, setCriteriaList] = useState<CriterionFormItem[]>([
        { name: 'Nội dung và Độ chính xác', description: '', weight: 40, max_score: 10 },
        { name: 'Hình thức và Trình bày', description: '', weight: 30, max_score: 10 },
        { name: 'Khả năng sáng tạo', description: '', weight: 30, max_score: 10 },
    ])

    const fetchTemplates = async () => {
        setIsLoading(true)
        setErrorMsg(null)
        try {
            const data = await getRubricTemplates(request)
            setTemplates(data)
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : 'Không thể tải danh sách mẫu rubric.')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchTemplates()
    }, [])

    // Tính tổng trọng số realtime
    const totalWeight = useMemo(() => {
        return criteriaList.reduce((sum, c) => {
            const val = typeof c.weight === 'number' ? c.weight : 0
            return sum + val
        }, 0)
    }, [criteriaList])

    const isWeightValid = Math.abs(totalWeight - 100) < 0.01

    const handleAddCriterion = () => {
        setCriteriaList((prev) => [
            ...prev,
            { name: '', description: '', weight: '', max_score: 10 },
        ])
    }

    const handleRemoveCriterion = (index: number) => {
        if (criteriaList.length <= 1) {
            alert('Mẫu Rubric phải có ít nhất 1 tiêu chí.')
            return
        }
        setCriteriaList((prev) => prev.filter((_, i) => i !== index))
    }

    const handleCriterionChange = (
        index: number,
        field: keyof CriterionFormItem,
        val: string | number,
    ) => {
        setCriteriaList((prev) =>
            prev.map((item, i) => {
                if (i !== index) return item
                return { ...item, [field]: val }
            }),
        )
    }

    const handleResetForm = () => {
        setTemplateName('')
        setTemplateDescription('')
        setCriteriaList([
            { name: 'Tiêu chí 1', description: '', weight: 50, max_score: 10 },
            { name: 'Tiêu chí 2', description: '', weight: 50, max_score: 10 },
        ])
        setIsCreateModalOpen(false)
    }

    const handleSubmitCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!templateName.trim()) {
            setErrorMsg('Vui lòng nhập tên mẫu Rubric.')
            return
        }
        if (!isWeightValid) {
            setErrorMsg('Tổng trọng số các tiêu chí phải bằng đúng 100%.')
            return
        }

        const payload: CreateRubricPayload = {
            name: templateName.trim(),
            description: templateDescription.trim() || undefined,
            criteria: criteriaList.map((c, i) => ({
                name: c.name.trim(),
                description: c.description.trim() || undefined,
                weight: Number(c.weight),
                max_score: Number(c.max_score) || 10,
                order_index: i,
            })),
        }

        try {
            await createRubricTemplate(request, payload)
            setSuccessMsg('Đã tạo mẫu Rubric thành công!')
            handleResetForm()
            fetchTemplates()
            setTimeout(() => setSuccessMsg(null), 4000)
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi lưu mẫu Rubric.')
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa mẫu rubric "${name}"?`)) return
        try {
            await deleteRubricTemplate(request, id)
            setSuccessMsg('Đã xóa mẫu rubric thành công.')
            fetchTemplates()
            setTimeout(() => setSuccessMsg(null), 4000)
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : 'Không thể xóa mẫu rubric.')
        }
    }

    return (
        <div className="rubric-container">
            <div className="rubric-header">
                <div>
                    <h1>Quản lý Mẫu Rubric (SCRUM-268)</h1>
                    <p>Khai báo rubric gồm các tiêu chí và trọng số (tổng = 100%) để tái sử dụng cho các bài tập</p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    + Tạo mẫu Rubric mới
                </button>
            </div>

            {errorMsg && (
                <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                    {errorMsg}
                </div>
            )}

            {successMsg && (
                <div style={{ background: '#dcfce7', color: '#15803d', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                    {successMsg}
                </div>
            )}

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Đang tải danh sách mẫu rubric...</div>
            ) : templates.length === 0 ? (
                <div className="empty-state">
                    <h3>Chưa có mẫu Rubric nào</h3>
                    <p>Hãy tạo mẫu Rubric đầu tiên để bắt đầu chấm điểm bài tập theo tiêu chí công bằng và minh bạch.</p>
                    <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>+ Tạo mẫu đầu tiên</button>
                </div>
            ) : (
                <div className="rubric-grid">
                    {templates.map((tpl) => (
                        <div key={tpl.id} className="rubric-card">
                            <div className="rubric-card-header">
                                <h3 className="rubric-card-title">{tpl.name}</h3>
                                {tpl.description && <p className="rubric-card-desc">{tpl.description}</p>}
                            </div>

                            <div className="rubric-criteria-summary">
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
                                    TIÊU CHÍ ({tpl.criteria?.length || 0})
                                </div>
                                {tpl.criteria?.slice(0, 3).map((crit) => (
                                    <div key={crit.id} className="rubric-criteria-item-preview">
                                        <span>{crit.name}</span>
                                        <span className="badge-weight">{crit.weight}%</span>
                                    </div>
                                ))}
                                {tpl.criteria && tpl.criteria.length > 3 && (
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                                        + thêm {tpl.criteria.length - 3} tiêu chí khác...
                                    </div>
                                )}
                            </div>

                            <div className="rubric-card-actions">
                                <button
                                    className="btn-secondary"
                                    onClick={() => setSelectedTemplate(tpl)}
                                >
                                    Xem chi tiết
                                </button>
                                <button
                                    className="btn-danger"
                                    onClick={() => handleDelete(tpl.id, tpl.name)}
                                >
                                    Xóa
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Tạo Mẫu Rubric */}
            {isCreateModalOpen && (
                <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', color: '#0f172a' }}>
                            Tạo Mẫu Rubric Mới
                        </h2>

                        <form onSubmit={handleSubmitCreate}>
                            <div className="form-group">
                                <label>Tên Mẫu Rubric *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ví dụ: Rubric Báo cáo Đồ án tốt nghiệp"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Mô tả (tùy chọn)</label>
                                <textarea
                                    className="form-input"
                                    rows={2}
                                    placeholder="Mô tả mục đích sử dụng mẫu rubric này..."
                                    value={templateDescription}
                                    onChange={(e) => setTemplateDescription(e.target.value)}
                                />
                            </div>

                            {/* Bộ tính trọng số trực quan */}
                            <div className="weight-calculator">
                                <div className="progress-header">
                                    <span>Tổng Trọng Số: {totalWeight.toFixed(1)}%</span>
                                    <span style={{ color: isWeightValid ? '#10b981' : totalWeight < 100 ? '#f59e0b' : '#ef4444' }}>
                                        {isWeightValid
                                            ? '✓ Hợp lệ (100%)'
                                            : totalWeight < 100
                                            ? `Còn thiếu ${(100 - totalWeight).toFixed(1)}%`
                                            : `Vượt quá ${(totalWeight - 100).toFixed(1)}%`}
                                    </span>
                                </div>
                                <div className="progress-bar-bg">
                                    <div
                                        className={`progress-bar-fill ${
                                            isWeightValid
                                                ? 'progress-valid'
                                                : totalWeight < 100
                                                ? 'progress-under'
                                                : 'progress-over'
                                        }`}
                                        style={{ width: `${Math.min(totalWeight, 100)}%` }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 10px 0' }}>
                                <label style={{ fontWeight: 600, color: '#1e293b' }}>Danh Sách Tiêu Chí Chấm Điểm</label>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={handleAddCriterion}
                                >
                                    + Thêm Tiêu Chí
                                </button>
                            </div>

                            {criteriaList.map((crit, idx) => (
                                <div key={idx} className="criteria-card">
                                    <div className="criteria-grid">
                                        <div>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder={`Tên tiêu chí ${idx + 1}`}
                                                value={crit.name}
                                                onChange={(e) => handleCriterionChange(idx, 'name', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="number"
                                                step="0.5"
                                                className="form-input"
                                                placeholder="Trọng số %"
                                                value={crit.weight}
                                                onChange={(e) => handleCriterionChange(idx, 'weight', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="number"
                                                step="1"
                                                className="form-input"
                                                placeholder="Điểm max"
                                                value={crit.max_score}
                                                onChange={(e) => handleCriterionChange(idx, 'max_score', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                required
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className="btn-danger"
                                            title="Xóa tiêu chí"
                                            onClick={() => handleRemoveCriterion(idx)}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        style={{ marginTop: 6 }}
                                        className="form-input"
                                        placeholder="Mô tả hướng dẫn chấm (không bắt buộc)..."
                                        value={crit.description}
                                        onChange={(e) => handleCriterionChange(idx, 'description', e.target.value)}
                                    />
                                </div>
                            ))}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={handleResetForm}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={!isWeightValid || !templateName.trim()}
                                >
                                    Lưu Mẫu Rubric
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Xem Chi Tiết Rubric */}
            {selectedTemplate && (
                <div className="modal-overlay" onClick={() => setSelectedTemplate(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, color: '#0f172a' }}>{selectedTemplate.name}</h2>
                            <button className="btn-secondary" onClick={() => setSelectedTemplate(null)}>Đóng</button>
                        </div>
                        {selectedTemplate.description && (
                            <p style={{ color: '#64748b', marginTop: 8 }}>{selectedTemplate.description}</p>
                        )}

                        <div style={{ marginTop: 20 }}>
                            <h3 style={{ fontSize: '1rem', color: '#334155', borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
                                Bảng Tiêu Chí & Trọng Số
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>
                                        <th style={{ padding: '8px 12px' }}>STT</th>
                                        <th style={{ padding: '8px 12px' }}>Tiêu chí</th>
                                        <th style={{ padding: '8px 12px' }}>Điểm tối đa</th>
                                        <th style={{ padding: '8px 12px' }}>Trọng số</th>
                                        <th style={{ padding: '8px 12px' }}>Hướng dẫn</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedTemplate.criteria?.map((c, i) => (
                                        <tr key={c.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px 12px' }}>{i + 1}</td>
                                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{c.name}</td>
                                            <td style={{ padding: '10px 12px' }}>{c.max_score}</td>
                                            <td style={{ padding: '10px 12px' }}>
                                                <span className="badge-weight">{c.weight}%</span>
                                            </td>
                                            <td style={{ padding: '10px 12px', color: '#64748b' }}>{c.description || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
