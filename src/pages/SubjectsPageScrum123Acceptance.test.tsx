// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { SubjectsPage } from './SubjectsPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { Subject } from '../api/subjectApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const sampleSubjectWithScrum123: Subject = {
    id: 'subj-s123-01',
    code: 'QA-S123-01',
    name: 'Kiểm thử SCRUM-123',
    credits: 3,
    total_sessions: 10,
    weight: 1.5,
    learning_outcomes: 'Người học đạt được các chuẩn đầu ra được xác định cho môn kiểm thử SCRUM-123.',
    description: 'Mô tả tổng quan môn kiểm thử',
    status: 'active',
    created_at: '2026-03-01T08:00:00Z',
    updated_at: '2026-03-01T08:00:00Z',
}

function RoleSessionWrapper({
    role,
    permissions,
    children,
}: {
    role?: string | null
    permissions?: string[]
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()
    useEffect(() => {
        if (role !== undefined) {
            startSession(
                { accessToken: 'mock-token', refreshToken: 'mock-refresh' },
                role,
                'user-test-id',
                false,
                'Test User',
                'test@ictu.edu.vn',
                role ? [role] : [],
                permissions,
            )
        }
    }, [role, permissions, startSession])

    if (role !== undefined && !hasSession) {
        return <div>Initializing session...</div>
    }

    return <>{children}</>
}

function renderWithSession(
    ui: ReactNode,
    options: { role?: string; permissions?: string[] } = {},
) {
    const { role = 'admin', permissions } = options

    return render(
        <MemoryRouter>
            <SessionProvider apiOrigin="http://localhost:5000">
                <RoleSessionWrapper role={role} permissions={permissions}>
                    {ui}
                </RoleSessionWrapper>
            </SessionProvider>
        </MemoryRouter>,
    )
}

describe('SCRUM-123 Acceptance Tests - Subject Management UI', () => {
    it('1. Form "Thêm môn học mới" hiển thị đầy đủ các trường của SCRUM-123: mã, tên, số buổi, trọng số, chuẩn đầu ra', async () => {
        renderWithSession(
            <SubjectsPage initialSubjects={[sampleSubjectWithScrum123]} initialTotal={1} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-create-subject'))
        expect(screen.getByTestId('modal-create-subject')).toBeDefined()

        // Kiểm tra các trường bắt buộc và mở rộng theo SCRUM-123
        expect(screen.getByTestId('create-input-code')).toBeDefined()
        expect(screen.getByTestId('create-input-name')).toBeDefined()
        expect(screen.getByTestId('create-input-sessions')).toBeDefined()
        expect(screen.getByTestId('create-input-weight')).toBeDefined()
        expect(screen.getByTestId('create-input-learning-outcomes')).toBeDefined()
        expect(screen.getByTestId('create-input-credits')).toBeDefined()
        expect(screen.getByTestId('create-input-description')).toBeDefined()
        expect(screen.getByTestId('create-select-status')).toBeDefined()
    })

    it('2. Tạo mới môn học gửi đầy đủ weight và learning_outcomes lên backend', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'POST') {
                const body = JSON.parse(String(init.body))
                return Promise.resolve({
                    ok: true,
                    status: 201,
                    json: async () => ({
                        status: 'success',
                        data: {
                            id: 'subj-created-123',
                            ...body,
                            created_at: '2026-03-01T00:00:00Z',
                            updated_at: '2026-03-01T00:00:00Z',
                        },
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { items: [sampleSubjectWithScrum123], total: 1, page: 1, page_size: 10, total_pages: 1 },
                }),
            })
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={[sampleSubjectWithScrum123]} initialTotal={1} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-create-subject'))

        fireEvent.change(screen.getByTestId('create-input-code'), { target: { value: 'QA-S123-01' } })
        fireEvent.change(screen.getByTestId('create-input-name'), { target: { value: 'Kiểm thử SCRUM-123' } })
        fireEvent.change(screen.getByTestId('create-input-sessions'), { target: { value: '10' } })
        fireEvent.change(screen.getByTestId('create-input-weight'), { target: { value: '1.5' } })
        fireEvent.change(screen.getByTestId('create-input-learning-outcomes'), {
            target: { value: 'Người học đạt được các chuẩn đầu ra được xác định cho môn kiểm thử SCRUM-123.' },
        })
        fireEvent.change(screen.getByTestId('create-input-credits'), { target: { value: '3' } })

        fireEvent.click(screen.getByTestId('btn-submit-create'))

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/subjects',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"weight":1.5'),
                }),
            )
            expect(screen.queryByTestId('modal-create-subject')).toBeNull()
            expect(screen.getByTestId('banner-success').textContent).toContain('Tạo môn học thành công.')
        })
    })

    it('3. Form Sửa nạp đúng trọng số và chuẩn đầu ra hiện tại, lưu thành công', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'PUT') {
                const body = JSON.parse(String(init.body))
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        status: 'success',
                        data: { ...sampleSubjectWithScrum123, ...body },
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { items: [sampleSubjectWithScrum123], total: 1, page: 1, page_size: 10, total_pages: 1 },
                }),
            })
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={[sampleSubjectWithScrum123]} initialTotal={1} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId(`btn-edit-${sampleSubjectWithScrum123.id}`))
        expect(screen.getByTestId('modal-edit-subject')).toBeDefined()

        const weightInput = screen.getByTestId('edit-input-weight') as HTMLInputElement
        const outcomesInput = screen.getByTestId('edit-input-learning-outcomes') as HTMLTextAreaElement

        // Preload đúng
        expect(weightInput.value).toBe('1.5')
        expect(outcomesInput.value).toBe(sampleSubjectWithScrum123.learning_outcomes)

        // Cập nhật giá trị
        fireEvent.change(weightInput, { target: { value: '2.5' } })
        fireEvent.change(outcomesInput, { target: { value: 'Chuẩn đầu ra đã cập nhật' } })

        fireEvent.click(screen.getByTestId('btn-submit-edit'))

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                expect.stringContaining(`/api/v1/subjects/${sampleSubjectWithScrum123.id}`),
                expect.objectContaining({
                    method: 'PUT',
                    body: expect.stringContaining('"weight":2.5'),
                }),
            )
            expect(screen.queryByTestId('modal-edit-subject')).toBeNull()
            expect(screen.getByTestId('banner-success').textContent).toContain('Cập nhật môn học thành công.')
        })
    })

    it('4. Modal Chi tiết hiển thị rõ ràng Trọng số và Mô tả chuẩn đầu ra', async () => {
        renderWithSession(
            <SubjectsPage initialSubjects={[sampleSubjectWithScrum123]} initialTotal={1} />,
            { role: 'trainee' },
        )

        fireEvent.click(screen.getByTestId(`btn-view-${sampleSubjectWithScrum123.id}`))
        expect(screen.getByTestId('modal-detail-subject')).toBeDefined()

        expect(screen.getByTestId('detail-subject-weight').textContent).toBe('1.5')
        expect(screen.getByTestId('detail-subject-learning-outcomes').textContent).toBe(
            sampleSubjectWithScrum123.learning_outcomes,
        )
    })

    it('5. Xóa môn học có dữ liệu phụ thuộc hiển thị thông báo lỗi thân thiện', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'DELETE') {
                return Promise.resolve({
                    ok: false,
                    status: 409,
                    json: async () => ({
                        code: 'SUBJECT_IN_USE',
                        message: 'Không thể xóa môn học vì đang có dữ liệu liên quan. Hãy chuyển môn học sang trạng thái Đã lưu trữ nếu không còn sử dụng.',
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ status: 'success', data: { items: [sampleSubjectWithScrum123], total: 1 } }),
            })
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={[sampleSubjectWithScrum123]} initialTotal={1} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId(`btn-delete-${sampleSubjectWithScrum123.id}`))
        expect(screen.getByTestId('modal-delete-confirm')).toBeDefined()

        fireEvent.click(screen.getByTestId('btn-confirm-delete'))

        await waitFor(() => {
            expect(screen.getByTestId('delete-dialog-error').textContent).toContain(
                'Không thể xóa môn học vì đang có dữ liệu liên quan',
            )
        })
    })
})
