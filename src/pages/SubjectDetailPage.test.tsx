// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useEffect } from 'react'
import { SubjectDetailPage } from './SubjectDetailPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { Subject } from '../api/subjectApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const mockSubjectData: Subject = {
    id: 'sub-valid-uuid-1',
    code: 'CS101',
    name: 'Lập trình Cơ bản',
    description: 'Mô tả chi tiết môn học lập trình',
    credits: 3,
    total_sessions: 15,
    weight: 20,
    learning_outcomes: 'Nắm vững kiến thức lập trình cơ bản',
    status: 'active',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
}

function RoleSessionWrapper({
    role,
    children,
}: {
    role?: string | null
    children: React.ReactNode
}) {
    const { startSession } = useSession()
    useEffect(() => {
        if (role !== undefined) {
            startSession({ accessToken: 'mock-token', refreshToken: 'mock-refresh' }, role)
        }
    }, [role, startSession])
    return <>{children}</>
}

function renderSubjectDetailPage({
    subjectId = 'sub-valid-uuid-1',
    customRequest,
    role = 'trainer',
}: {
    subjectId?: string
    customRequest?: (path: string, init?: RequestInit) => Promise<Response>
    role?: string
}) {
    const defaultRequest = vi.fn().mockImplementation(async (path: string) => {
        if (path.includes('/subjects/')) {
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: mockSubjectData,
                }),
            }
        }
        return { ok: true, status: 200, json: async () => ({}) }
    })

    const requestFn = customRequest || defaultRequest

    return {
        ...render(
            <MemoryRouter initialEntries={[`/subjects/${subjectId}`]}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role={role}>
                        <Routes>
                            <Route path="/subjects/:subjectId" element={<SubjectDetailPage customRequest={requestFn} />} />
                            <Route path="/subjects" element={<div data-testid="subjects-list-page">Danh sách môn học</div>} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        ),
        requestFn,
    }
}

describe('SubjectDetailPage - Trạng thái giao diện và xử lý lỗi', () => {
    it('1. Hiển thị thông tin môn học khi API tải thành công', async () => {
        renderSubjectDetailPage({})

        await waitFor(() => {
            expect(screen.getByTestId('subject-detail-page')).toBeDefined()
        })

        expect(screen.getAllByText('Lập trình Cơ bản').length).toBeGreaterThan(0)
        expect(screen.getByText('CS101')).toBeDefined()
        expect(screen.getByText('3 tín chỉ')).toBeDefined()
        expect(screen.getByText('15 buổi')).toBeDefined()
    })

    it('2. Hiển thị lỗi rõ ràng khi ID không hợp lệ (400 INVALID_PARAMS), có nút Thử lại và Quay lại', async () => {
        const mockBadRequest = vi.fn().mockImplementation(async () => {
            return {
                ok: false,
                status: 400,
                json: async () => ({
                    code: 'INVALID_PARAMS',
                    message: 'Mã định danh môn học không đúng định dạng UUID.',
                }),
            }
        })

        renderSubjectDetailPage({
            subjectId: 'sub-py-7db24fb8',
            customRequest: mockBadRequest,
        })

        await waitFor(() => {
            expect(screen.getByTestId('subject-detail-error')).toBeDefined()
        })

        expect(screen.getByTestId('subject-detail-error-alert').textContent).toContain(
            'Mã định danh môn học không đúng định dạng UUID.',
        )
        expect(screen.getByTestId('btn-retry')).toBeDefined()
        expect(screen.getByTestId('btn-back-to-subjects')).toBeDefined()
    })

    it('3. Bấm nút "Thử lại" sẽ gọi lại API và cập nhật giao diện khi thành công', async () => {
        let count = 0
        const mockRetryRequest = vi.fn().mockImplementation(async () => {
            count++
            if (count === 1) {
                return {
                    ok: false,
                    status: 400,
                    json: async () => ({
                        code: 'INVALID_PARAMS',
                        message: 'Mã định danh môn học không đúng định dạng UUID.',
                    }),
                }
            }
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: mockSubjectData,
                }),
            }
        })

        renderSubjectDetailPage({
            subjectId: 'sub-valid-uuid-1',
            customRequest: mockRetryRequest,
        })

        await waitFor(() => {
            expect(screen.getByTestId('subject-detail-error')).toBeDefined()
        })

        // Bấm Thử lại
        fireEvent.click(screen.getByTestId('btn-retry'))

        await waitFor(() => {
            expect(screen.getByTestId('subject-detail-page')).toBeDefined()
        })

        expect(screen.queryByTestId('subject-detail-error')).toBeNull()
        expect(screen.getAllByText('Lập trình Cơ bản').length).toBeGreaterThan(0)
    })

    it('4. Bấm "Quay lại danh sách môn học" sẽ điều hướng về /subjects', async () => {
        const mockBadRequest = vi.fn().mockImplementation(async () => {
            return {
                ok: false,
                status: 400,
                json: async () => ({
                    code: 'INVALID_PARAMS',
                    message: 'Mã định danh môn học không đúng định dạng UUID.',
                }),
            }
        })

        renderSubjectDetailPage({
            subjectId: 'sub-py-7db24fb8',
            customRequest: mockBadRequest,
        })

        await waitFor(() => {
            expect(screen.getByTestId('btn-back-to-subjects')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-back-to-subjects'))

        await waitFor(() => {
            expect(screen.getByTestId('subjects-list-page')).toBeDefined()
        })
    })

    it('5. Hiển thị thông báo phù hợp khi 404 (Không tìm thấy môn học)', async () => {
        const mock404Request = vi.fn().mockImplementation(async () => {
            return {
                ok: false,
                status: 404,
                json: async () => ({
                    code: 'SUBJECT_NOT_FOUND',
                    message: 'Không tìm thấy môn học yêu cầu.',
                }),
            }
        })

        renderSubjectDetailPage({
            subjectId: 'non-existent-id',
            customRequest: mock404Request,
        })

        await waitFor(() => {
            expect(screen.getByTestId('subject-detail-error')).toBeDefined()
        })

        expect(screen.getByTestId('subject-detail-error-alert').textContent).toContain('Không tìm thấy môn học yêu cầu')
    })

    it('6. Hiển thị thông báo phù hợp khi 403 (Không có quyền xem)', async () => {
        const mock403Request = vi.fn().mockImplementation(async () => {
            return {
                ok: false,
                status: 403,
                json: async () => ({
                    code: 'FORBIDDEN',
                    message: 'Bạn không có quyền xem thông tin môn học này.',
                }),
            }
        })

        renderSubjectDetailPage({
            subjectId: 'sub-valid-uuid-1',
            customRequest: mock403Request,
        })

        await waitFor(() => {
            expect(screen.getByTestId('subject-detail-error')).toBeDefined()
        })

        expect(screen.getByTestId('subject-detail-error-alert').textContent).toContain('quyền')
    })
})
