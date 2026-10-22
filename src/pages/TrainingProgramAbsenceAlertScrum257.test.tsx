// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { type ReactNode, useEffect } from 'react'
import { TrainingProgramDetailPage } from './TrainingProgramDetailPage'
import { TrainingProgramCreatePage } from './TrainingProgramCreatePage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { TrainingProgram, ProgramAbsenceThresholdData } from '../api/trainingProgramApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const mockProgram: TrainingProgram = {
    id: 'prog-scrum-257',
    code: 'CNTT-K25',
    name: 'Công nghệ thông tin K25',
    description: 'Chương trình đào tạo K25',
    duration_semesters: 8,
    standard_tuition_fee: 15000000,
    absence_alert_threshold: 20.0,
    status: 'active',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
}

const mockThresholdData: ProgramAbsenceThresholdData = {
    program_id: 'prog-scrum-257',
    program_code: 'CNTT-K25',
    program_name: 'Công nghệ thông tin K25',
    absence_alert_threshold: 20.0,
    audits: [
        {
            id: 'audit-1',
            program_id: 'prog-scrum-257',
            old_threshold: 20.0,
            new_threshold: 25.0,
            changed_by: 'mgr-01',
            reason: 'Điều chỉnh quy chế mới',
            created_at: '2026-03-01T10:00:00Z',
        },
    ],
}

function RoleSessionWrapper({
    role = 'admin',
    children,
}: {
    role?: string
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()

    useEffect(() => {
        if (!hasSession) {
            startSession({ accessToken: 'mock-token', refreshToken: 'mock-refresh' }, role)
        }
    }, [hasSession, startSession, role])

    if (!hasSession) {
        return <div>Initializing session...</div>
    }

    return <>{children}</>
}

describe('SCRUM-257 AC1: Cấu hình ngưỡng cảnh báo vắng theo chương trình', () => {
    it('hiển thị ngưỡng cảnh báo vắng 20% mặc định trên trang chi tiết', async () => {
        vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
            const urlStr = String(url)
            if (urlStr.includes('/absence-alert-threshold')) {
                return new Response(JSON.stringify({ status: 'success', data: mockThresholdData }), { status: 200 })
            }
            if (urlStr.includes('/training-programs/prog-scrum-257')) {
                return new Response(JSON.stringify({ status: 'success', data: mockProgram }), { status: 200 })
            }
            return new Response(JSON.stringify({}), { status: 404 })
        })

        render(
            <MemoryRouter initialEntries={['/training-programs/prog-scrum-257']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="admin">
                        <Routes>
                            <Route path="/training-programs/:programId" element={<TrainingProgramDetailPage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getAllByText('Công nghệ thông tin K25').length).toBeGreaterThan(0)
        })

        // Kiểm tra hiển thị ngưỡng cảnh báo vắng
        expect(screen.getByText('Ngưỡng cảnh báo vắng')).toBeDefined()
        expect(screen.getAllByText('20%').length).toBeGreaterThan(0)

        // Kiểm tra nút cấu hình ngưỡng
        expect(screen.getByText('⚙️ Cập nhật ngưỡng')).toBeDefined()
    })

    it('cho phép mở modal cập nhật ngưỡng và lưu giá trị mới', async () => {
        let updatedThreshold = 20.0
        vi.spyOn(global, 'fetch').mockImplementation(async (url, init) => {
            const urlStr = String(url)
            const method = init?.method || 'GET'

            if (urlStr.includes('/absence-alert-threshold') && method === 'PUT') {
                const body = JSON.parse(String(init?.body || '{}'))
                updatedThreshold = body.threshold
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: { ...mockProgram, absence_alert_threshold: updatedThreshold },
                    }),
                    { status: 200 }
                )
            }
            if (urlStr.includes('/absence-alert-threshold') && method === 'GET') {
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: { ...mockThresholdData, absence_alert_threshold: updatedThreshold },
                    }),
                    { status: 200 }
                )
            }
            if (urlStr.includes('/training-programs/prog-scrum-257')) {
                return new Response(JSON.stringify({ status: 'success', data: mockProgram }), { status: 200 })
            }
            return new Response(JSON.stringify({}), { status: 404 })
        })

        render(
            <MemoryRouter initialEntries={['/training-programs/prog-scrum-257']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="admin">
                        <Routes>
                            <Route path="/training-programs/:programId" element={<TrainingProgramDetailPage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByText('⚙️ Cập nhật ngưỡng')).toBeDefined()
        })

        // Bấm mở modal
        fireEvent.click(screen.getByText('⚙️ Cập nhật ngưỡng'))

        // Modal xuất hiện
        expect(screen.getByText('Cấu hình ngưỡng cảnh báo vắng')).toBeDefined()

        const input = screen.getByLabelText(/Ngưỡng cảnh báo vắng/i)
        fireEvent.change(input, { target: { value: '25.5' } })

        const reasonInput = screen.getByLabelText(/Lý do điều chỉnh/i)
        fireEvent.change(reasonInput, { target: { value: 'Đồng bộ quy chế mới' } })

        // Lưu
        fireEvent.click(screen.getByText('Lưu cấu hình'))

        await waitFor(() => {
            expect(screen.queryByText('Cấu hình ngưỡng cảnh báo vắng')).toBeNull()
        })
    })

    it('trang tạo mới chương trình có trường ngưỡng cảnh báo mặc định 20%', async () => {
        render(
            <MemoryRouter initialEntries={['/training-programs/create']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="admin">
                        <Routes>
                            <Route path="/training-programs/create" element={<TrainingProgramCreatePage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByLabelText(/Ngưỡng cảnh báo vắng/i)).toBeDefined()
        })
        expect((screen.getByLabelText(/Ngưỡng cảnh báo vắng/i) as HTMLInputElement).value).toBe('20')
    })
})
