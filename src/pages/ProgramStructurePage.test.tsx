// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { ProgramStructurePage } from './ProgramStructurePage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { ProgramStructure } from '../api/programStructureApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const mockStructureData: ProgramStructure = {
    program: {
        id: 'prog-101',
        code: 'CNTT-K21',
        name: 'Công nghệ thông tin K21',
        description: 'Chương trình chuẩn ngành CNTT',
        duration_semesters: 8,
        status: 'draft',
    },
    total_subjects: 3,
    total_credits: 9,
    items: [
        {
            program_subject_id: 'ps-1',
            program_id: 'prog-101',
            subject_id: 'sub-1',
            code: 'INT101',
            name: 'Tin học đại cương',
            credits: 3,
            total_sessions: 30,
            status: 'active',
            semester: 1,
            is_mandatory: true,
            order_index: 1,
            prerequisites: [],
        },
        {
            program_subject_id: 'ps-2',
            program_id: 'prog-101',
            subject_id: 'sub-2',
            code: 'INT102',
            name: 'Kỹ thuật lập trình',
            credits: 3,
            total_sessions: 30,
            status: 'active',
            semester: 1,
            is_mandatory: true,
            order_index: 2,
            prerequisites: [
                {
                    id: 'prereq-1',
                    prerequisite_program_subject_id: 'ps-1',
                    code: 'INT101',
                    name: 'Tin học đại cương',
                    credits: 3,
                },
            ],
        },
        {
            program_subject_id: 'ps-3',
            program_id: 'prog-101',
            subject_id: 'sub-3',
            code: 'INT201',
            name: 'Cấu trúc dữ liệu và giải thuật',
            credits: 3,
            total_sessions: 30,
            status: 'active',
            semester: null,
            is_mandatory: false,
            order_index: 1,
            prerequisites: [],
        },
    ],
}

function RoleSessionWrapper({
    role,
    children,
}: {
    role?: string | null
    children: ReactNode
}) {
    const { startSession } = useSession()
    useEffect(() => {
        if (role !== undefined) {
            startSession({ accessToken: 'mock-token', refreshToken: 'mock-refresh' }, role)
        }
    }, [role, startSession])
    return <>{children}</>
}

function renderProgramStructurePage({
    role = 'admin',
    programId = 'prog-101',
    customRequest,
    canManageOverride,
}: {
    role?: string | null
    programId?: string
    customRequest?: (path: string, init?: RequestInit) => Promise<Response>
    canManageOverride?: boolean
}) {
    return render(
        <MemoryRouter initialEntries={[`/training-programs/${programId}/structure`]}>
            <SessionProvider apiOrigin="http://localhost:5000">
                <RoleSessionWrapper role={role}>
                    <Routes>
                        <Route
                            path="/training-programs/:programId/structure"
                            element={
                                <ProgramStructurePage
                                    programIdProp={programId}
                                    customRequest={customRequest as any}
                                    canManageOverride={canManageOverride}
                                />
                            }
                        />
                    </Routes>
                </RoleSessionWrapper>
            </SessionProvider>
        </MemoryRouter>,
    )
}

describe('ProgramStructurePage - Test Matrix SCRUM-124 Activity A6', () => {
    it('01. Render màn hình đang tải khi bắt đầu', () => {
        const mockRequest = vi.fn().mockImplementation(() => new Promise(() => {}))
        renderProgramStructurePage({ customRequest: mockRequest })
        expect(screen.getByTestId('program-structure-loading')).toBeDefined()
    })

    it('02. Render thông tin chương trình và thống kê', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockStructureData,
        })

        renderProgramStructurePage({ customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('structure-program-name').textContent).toContain('Công nghệ thông tin K21')
            expect(screen.getByTestId('structure-program-code').textContent).toContain('CNTT-K21')
            expect(screen.getByTestId('structure-program-status').textContent).toContain('Bản nháp')
            expect(screen.getByTestId('stat-duration').textContent).toContain('8 học kỳ')
            expect(screen.getByTestId('stat-total-subjects').textContent).toContain('3 môn')
            expect(screen.getByTestId('stat-total-credits').textContent).toContain('9 tín chỉ')
        })
    })

    it('03. Render cấu trúc phân theo học kỳ và nhóm chưa phân học kỳ', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockStructureData,
        })

        renderProgramStructurePage({ customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('semester-section-1')).toBeDefined()
            expect(screen.getByTestId('semester-section-null')).toBeDefined()
            expect(screen.getByTestId('subject-name-ps-1').textContent).toContain('Tin học đại cương')
            expect(screen.getByTestId('subject-name-ps-2').textContent).toContain('Kỹ thuật lập trình')
            expect(screen.getByTestId('subject-name-ps-3').textContent).toContain('Cấu trúc dữ liệu và giải thuật')
            expect(screen.getByTestId('subject-type-ps-1').textContent).toContain('Bắt buộc')
            expect(screen.getByTestId('subject-type-ps-3').textContent).toContain('Tự chọn')
        })
    })

    it('04. Hiển thị môn tiên quyết dạng badge', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockStructureData,
        })

        renderProgramStructurePage({ customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('prereq-badge-prereq-1').textContent).toContain('INT101')
        })
    })

    it('05. Quyền course.view (trainee) chỉ xem, không có các nút thao tác chỉnh sửa', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockStructureData,
        })

        renderProgramStructurePage({ role: 'trainee', customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('structure-program-name')).toBeDefined()
            expect(screen.queryByTestId('btn-open-add-subject')).toBeNull()
            expect(screen.queryByTestId('btn-edit-ps-1')).toBeNull()
            expect(screen.queryByTestId('btn-remove-ps-1')).toBeNull()
            expect(screen.queryByTestId('btn-move-up-ps-1')).toBeNull()
            expect(screen.queryByTestId('btn-prereq-ps-1')).toBeNull()
        })
    })

    it('06. Quyền course.manage (trainer/admin) hiển thị đầy đủ các nút thao tác', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockStructureData,
        })

        renderProgramStructurePage({ role: 'admin', customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-open-add-subject')).toBeDefined()
            expect(screen.getByTestId('btn-edit-ps-1')).toBeDefined()
            expect(screen.getByTestId('btn-remove-ps-1')).toBeDefined()
            expect(screen.getByTestId('btn-prereq-ps-1')).toBeDefined()
        })
    })

    it('07. Thêm môn học vào chương trình thành công', async () => {
        const availableSub = {
            id: 'sub-new',
            code: 'INT301',
            name: 'Mạng máy tính',
            credits: 3,
            status: 'active',
        }

        const mockRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (path.includes('/api/v1/subjects')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        data: { items: [availableSub], total: 1, page: 1, page_size: 100, total_pages: 1 },
                    }),
                })
            }
            if (init?.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    status: 201,
                    json: async () => ({
                        item: {
                            program_subject_id: 'ps-new',
                            code: 'INT301',
                            name: 'Mạng máy tính',
                            semester: 2,
                            is_mandatory: true,
                            order_index: 1,
                        },
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => mockStructureData,
            })
        })

        renderProgramStructurePage({ role: 'admin', customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-open-add-subject')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-open-add-subject'))

        await waitFor(() => {
            expect(screen.getByTestId('add-subject-select')).toBeDefined()
        })

        fireEvent.change(screen.getByTestId('add-semester-input'), { target: { value: '2' } })
        fireEvent.click(screen.getByTestId('btn-submit-add-subject'))

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                expect.stringContaining('/subjects'),
                expect.objectContaining({ method: 'POST' }),
            )
            expect(screen.getByTestId('banner-success')).toBeDefined()
        })
    })

    it('08. Xử lý lỗi trùng lặp khi thêm môn học đã có trong chương trình', async () => {
        const availableSub = {
            id: 'sub-dup',
            code: 'INT101',
            name: 'Tin học đại cương',
            credits: 3,
            status: 'active',
        }

        const mockRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (path.includes('/api/v1/subjects')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        data: { items: [availableSub], total: 1, page: 1, page_size: 100, total_pages: 1 },
                    }),
                })
            }
            if (init?.method === 'POST') {
                return Promise.resolve({
                    ok: false,
                    status: 409,
                    json: async () => ({ error: { code: 'SUBJECT_ALREADY_IN_PROGRAM' } }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => mockStructureData,
            })
        })

        renderProgramStructurePage({ role: 'admin', customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-open-add-subject')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-open-add-subject'))

        await waitFor(() => {
            expect(screen.getByTestId('add-subject-select')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-submit-add-subject'))

        await waitFor(() => {
            expect(screen.getByTestId('add-modal-error').textContent).toContain(
                'Môn học đã tồn tại trong chương trình đào tạo.',
            )
        })
    })

    it('09. Mở modal chỉnh sửa và lưu thay đổi thành công', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'PATCH') {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        item: { ...mockStructureData.items[0], semester: 2, is_mandatory: false },
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => mockStructureData,
            })
        })

        renderProgramStructurePage({ role: 'admin', customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-edit-ps-1')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-edit-ps-1'))

        await waitFor(() => {
            expect(screen.getByTestId('edit-semester-input')).toBeDefined()
        })

        fireEvent.change(screen.getByTestId('edit-semester-input'), { target: { value: '2' } })
        fireEvent.click(screen.getByTestId('edit-mandatory-checkbox'))
        fireEvent.click(screen.getByTestId('btn-submit-edit-subject'))

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                expect.stringContaining('/subjects/ps-1'),
                expect.objectContaining({ method: 'PATCH' }),
            )
        })
    })

    it('10. Di chuyển thứ tự môn học bằng nút Di chuyển Lên/Xuống', async () => {
        const mockRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (init?.method === 'PATCH' && path.includes('/reorder')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ message: 'Sắp xếp thành công', semester: 1 }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => mockStructureData,
            })
        })

        renderProgramStructurePage({ role: 'admin', customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-move-down-ps-1')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-move-down-ps-1'))

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                expect.stringContaining('/reorder'),
                expect.objectContaining({
                    method: 'PATCH',
                    body: JSON.stringify({ semester: 1, ordered_ids: ['ps-2', 'ps-1'] }),
                }),
            )
        })
    })

    it('11. Gỡ môn học thành công qua modal xác nhận', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'DELETE') {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ message: 'Đã gỡ môn học khỏi chương trình' }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => mockStructureData,
            })
        })

        renderProgramStructurePage({ role: 'admin', customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-remove-ps-1')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-remove-ps-1'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-submit-remove-subject')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-submit-remove-subject'))

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                expect.stringContaining('/subjects/ps-1'),
                expect.objectContaining({ method: 'DELETE' }),
            )
        })
    })

    it('12. Chặn gỡ môn học khi đang là môn tiên quyết (PROGRAM_SUBJECT_IN_USE)', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'DELETE') {
                return Promise.resolve({
                    ok: false,
                    status: 409,
                    json: async () => ({ error: { code: 'PROGRAM_SUBJECT_IN_USE' } }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => mockStructureData,
            })
        })

        renderProgramStructurePage({ role: 'admin', customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-remove-ps-1')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-remove-ps-1'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-submit-remove-subject')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-submit-remove-subject'))

        await waitFor(() => {
            expect(screen.getByTestId('remove-modal-error').textContent).toContain(
                'Môn học đang là điều kiện tiên quyết của môn khác. Hãy gỡ ràng buộc tiên quyết trước.',
            )
        })
    })

    it('13. Quản lý môn tiên quyết: mở modal, thêm và xử lý chu trình PREREQUISITE_CYCLE', async () => {
        const mockRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (path.includes('/prerequisites') && init?.method === 'POST') {
                return Promise.resolve({
                    ok: false,
                    status: 409,
                    json: async () => ({ error: { code: 'PREREQUISITE_CYCLE' } }),
                })
            }
            if (path.includes('/prerequisites')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ prerequisites: [] }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => mockStructureData,
            })
        })

        renderProgramStructurePage({ role: 'admin', customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-prereq-ps-1')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-prereq-ps-1'))

        await waitFor(() => {
            expect(screen.getByTestId('add-prereq-select')).toBeDefined()
        })

        fireEvent.change(screen.getByTestId('add-prereq-select'), { target: { value: 'ps-2' } })
        fireEvent.click(screen.getByTestId('btn-submit-add-prereq'))

        await waitFor(() => {
            expect(screen.getByTestId('prereq-modal-error').textContent).toContain(
                'Không thể thêm môn tiên quyết vì tạo vòng lặp phụ thuộc (chu trình).',
            )
        })
    })

    it('14. Đóng modal bằng phím Escape', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockStructureData,
        })

        renderProgramStructurePage({ role: 'admin', customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-remove-ps-1')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-remove-ps-1'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-submit-remove-subject')).toBeDefined()
        })

        fireEvent.keyDown(window, { key: 'Escape' })

        await waitFor(() => {
            expect(screen.queryByTestId('btn-submit-remove-subject')).toBeNull()
        })
    })

    it('15. Chương trình đã lưu trữ (archived) hiển thị cảnh báo và vô hiệu hóa sửa đổi', async () => {
        const archivedData: ProgramStructure = {
            ...mockStructureData,
            program: {
                ...mockStructureData.program,
                status: 'archived',
            },
        }

        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => archivedData,
        })

        renderProgramStructurePage({ role: 'admin', customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('structure-program-name')).toBeDefined()
            expect(screen.getByText(/Chương trình đào tạo đã lưu trữ/)).toBeDefined()
            expect(screen.queryByTestId('btn-open-add-subject')).toBeNull()
            expect(screen.queryByTestId('btn-edit-ps-1')).toBeNull()
            expect(screen.queryByTestId('btn-remove-ps-1')).toBeNull()
        })
    })

    it('16. Field Môn học bắt buộc trong modal Thêm môn học hiển thị đúng label, mô tả phụ và hỗ trợ toggle khi click label', async () => {
        const mockRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/available-subjects')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: {
                            items: [
                                { id: 'subj-avail-1', code: 'CS999', name: 'Môn thử nghiệm', credits: 3 },
                            ],
                        },
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => mockStructureData,
            })
        })

        renderProgramStructurePage({ role: 'admin', customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-open-add-subject')).toBeDefined()
        })

        // Mở modal Thêm môn học vào chương trình
        fireEvent.click(screen.getByTestId('btn-open-add-subject'))

        await waitFor(() => {
            expect(screen.getByText('Thêm môn học vào chương trình')).toBeDefined()
        })

        // Kiểm tra checkbox và các nhãn
        const checkbox = screen.getByTestId('add-mandatory-checkbox') as HTMLInputElement
        expect(checkbox).toBeDefined()
        expect(checkbox.checked).toBe(true)

        // Kiểm tra label ngắn gọn "Môn học bắt buộc"
        expect(screen.getByText('Môn học bắt buộc')).toBeDefined()

        // Kiểm tra mô tả phụ "Bỏ chọn nếu đây là môn tự chọn"
        const subtitle = screen.getByText('Bỏ chọn nếu đây là môn tự chọn')
        expect(subtitle).toBeDefined()

        // Click vào label toggle checkbox sang unchecked
        fireEvent.click(screen.getByText('Môn học bắt buộc'))
        expect(checkbox.checked).toBe(false)

        // Click vào mô tả phụ toggle checkbox trở lại checked
        fireEvent.click(subtitle)
        expect(checkbox.checked).toBe(true)
    })
})

