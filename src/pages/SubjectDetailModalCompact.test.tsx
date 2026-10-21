// @vitest-environment jsdom

import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { SubjectsPage } from './SubjectsPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { Subject } from '../api/subjectApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

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
    const { role = 'admin', permissions = [] } = options
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

const fullSubject: Subject = {
    id: 'subj-compact-01',
    code: 'QA-COMPACT-01',
    name: 'Kiến trúc phần mềm nâng cao',
    credits: 4,
    total_sessions: 30,
    weight: 2.5,
    learning_outcomes: 'Hiểu và áp dụng kiến trúc microservices và domain-driven design trong thực tế dự án.',
    description: 'Môn học chuyên sâu dành cho sinh viên năm cuối ngành Công nghệ thông tin.',
    status: 'active',
    created_at: '2026-10-09T10:00:00.000Z',
    updated_at: '2026-10-09T14:30:00.000Z',
}

const nullFieldsSubject: Subject = {
    id: 'subj-compact-02',
    code: 'QA-NULL-02',
    name: 'Môn học chưa cấu hình chi tiết',
    credits: null as unknown as number,
    total_sessions: null,
    weight: null,
    learning_outcomes: null,
    description: null,
    status: 'draft',
    created_at: '2026-10-09T11:00:00.000Z',
    updated_at: '2026-10-09T11:00:00.000Z',
}

const longContentSubject: Subject = {
    id: 'subj-compact-03',
    code: 'QA-LONG-03',
    name: 'Môn học kiểm thử nội dung mô tả rất dài',
    credits: 3,
    total_sessions: 45,
    weight: 3.0,
    learning_outcomes: 'Chuẩn đầu ra 1: Nắm vững nguyên lý.\nChuẩn đầu ra 2: Thiết kế hệ thống chịu tải cao.\nChuẩn đầu ra 3: Tối ưu hóa hiệu năng cơ sở dữ liệu và truy vấn SQL phức tạp.\nChuẩn đầu ra 4: Triển khai CI/CD pipeline tự động hóa.',
    description: 'Đoạn mô tả chi tiết môn học rất dài với nhiều đoạn văn bản khác nhau nhằm kiểm tra khả năng hiển thị responsive, word-break, pre-wrap mà không làm tràn khỏi màn hình desktop hay mobile.',
    status: 'archived',
    created_at: '2026-10-08T08:00:00.000Z',
    updated_at: '2026-10-09T09:00:00.000Z',
}

describe('Subject Detail Modal Compact UI Acceptance', () => {
    it('1. Mở modal chi tiết: render đầy đủ tất cả 10 trường dữ liệu và cấu trúc 2 cột compact', () => {
        renderWithSession(
            <SubjectsPage initialSubjects={[fullSubject]} initialTotal={1} />,
            { role: 'trainee' },
        )

        // Mở modal
        fireEvent.click(screen.getByTestId('btn-view-subj-compact-01'))

        const modal = screen.getByTestId('modal-detail-subject')
        expect(modal).toBeDefined()

        // Kiểm tra modal container có class compact subjects-modal-detail
        const container = modal.querySelector('.subjects-modal-detail')
        expect(container).not.toBeNull()

        // Kiểm tra grid 2 cột
        const grid = modal.querySelector('.subject-detail-grid')
        expect(grid).not.toBeNull()

        // 10 fields preserved
        expect(screen.getByTestId('detail-subject-code').textContent).toBe('QA-COMPACT-01')
        expect(screen.getByTestId('detail-subject-name').textContent).toBe('Kiến trúc phần mềm nâng cao')
        expect(screen.getByTestId('detail-subject-credits').textContent).toBe('4 tín chỉ')
        expect(screen.getByTestId('detail-subject-sessions').textContent).toBe('30 buổi')
        expect(screen.getByTestId('detail-subject-weight').textContent).toBe('2.5')
        expect(modal.querySelector('.subject-status-badge')?.textContent?.trim()).toBe('Đang hoạt động')
        expect(screen.getByTestId('detail-subject-learning-outcomes').textContent).toBe(
            'Hiểu và áp dụng kiến trúc microservices và domain-driven design trong thực tế dự án.'
        )
        expect(screen.getByTestId('detail-subject-desc').textContent).toBe(
            'Môn học chuyên sâu dành cho sinh viên năm cuối ngành Công nghệ thông tin.'
        )
        expect(modal.textContent).toContain('Ngày tạo')
        expect(modal.textContent).toContain('Cập nhật gần nhất')

        // Text blocks have proper styling classes
        expect(screen.getByTestId('detail-subject-learning-outcomes').className).toContain('subject-detail-text-block')
        expect(screen.getByTestId('detail-subject-desc').className).toContain('subject-detail-text-block')
    })

    it('2. Render môn học có các trường null/empty an toàn, không vỡ layout', () => {
        renderWithSession(
            <SubjectsPage initialSubjects={[nullFieldsSubject]} initialTotal={1} />,
            { role: 'trainee' },
        )

        fireEvent.click(screen.getByTestId('btn-view-subj-compact-02'))
        const modal = screen.getByTestId('modal-detail-subject')

        expect(screen.getByTestId('detail-subject-credits').textContent).toBe('Chưa xác định')
        expect(screen.getByTestId('detail-subject-sessions').textContent).toBe('Chưa xác định')
        expect(screen.getByTestId('detail-subject-weight').textContent).toBe('Chưa xác định')
        expect(screen.getByTestId('detail-subject-learning-outcomes').textContent).toBe('Chưa có chuẩn đầu ra')
        expect(screen.getByTestId('detail-subject-desc').textContent).toBe('Không có mô tả')
        expect(modal.querySelector('.subject-status-badge')?.textContent?.trim()).toBe('Bản nháp')
    })

    it('3. Nội dung mô tả chuẩn đầu ra và mô tả môn học dài hiển thị đúng định dạng readonly text block', () => {
        renderWithSession(
            <SubjectsPage initialSubjects={[longContentSubject]} initialTotal={1} />,
            { role: 'trainee' },
        )

        fireEvent.click(screen.getByTestId('btn-view-subj-compact-03'))

        const outcomesEl = screen.getByTestId('detail-subject-learning-outcomes')
        expect(outcomesEl.textContent).toContain('Chuẩn đầu ra 1: Nắm vững nguyên lý.')
        expect(outcomesEl.textContent).toContain('Chuẩn đầu ra 4: Triển khai CI/CD pipeline tự động hóa.')

        const descEl = screen.getByTestId('detail-subject-desc')
        expect(descEl.textContent).toContain('Đoạn mô tả chi tiết môn học rất dài')
    })

    it('4. Đóng modal bằng nút Close Header (×) và nút Footer [Đóng]', () => {
        renderWithSession(
            <SubjectsPage initialSubjects={[fullSubject]} initialTotal={1} />,
            { role: 'trainee' },
        )

        // Mở và đóng qua btn-close-detail (x)
        fireEvent.click(screen.getByTestId('btn-view-subj-compact-01'))
        expect(screen.getByTestId('modal-detail-subject')).toBeDefined()
        fireEvent.click(screen.getByTestId('btn-close-detail'))
        expect(screen.queryByTestId('modal-detail-subject')).toBeNull()

        // Mở lại và đóng qua nút [Đóng] ở footer
        fireEvent.click(screen.getByTestId('btn-view-subj-compact-01'))
        expect(screen.getByTestId('modal-detail-subject')).toBeDefined()
        const closeFooterBtn = screen.getByRole('button', { name: 'Đóng' })
        fireEvent.click(closeFooterBtn)
        expect(screen.queryByTestId('modal-detail-subject')).toBeNull()
    })

    it('5. Phím Escape đóng modal chi tiết', () => {
        renderWithSession(
            <SubjectsPage initialSubjects={[fullSubject]} initialTotal={1} />,
            { role: 'trainee' },
        )

        fireEvent.click(screen.getByTestId('btn-view-subj-compact-01'))
        expect(screen.getByTestId('modal-detail-subject')).toBeDefined()

        fireEvent.keyDown(window, { key: 'Escape' })
        expect(screen.queryByTestId('modal-detail-subject')).toBeNull()
    })

    it('6. Click outside backdrop đóng modal, click bên trong container không đóng', () => {
        renderWithSession(
            <SubjectsPage initialSubjects={[fullSubject]} initialTotal={1} />,
            { role: 'trainee' },
        )

        fireEvent.click(screen.getByTestId('btn-view-subj-compact-01'))
        const backdrop = screen.getByTestId('modal-detail-subject')
        const container = backdrop.querySelector('.subjects-modal-container') as HTMLElement

        // Click bên trong modal container: modal vẫn mở
        fireEvent.click(container)
        expect(screen.getByTestId('modal-detail-subject')).toBeDefined()

        // Click trực tiếp vào backdrop (outside): modal đóng
        fireEvent.click(backdrop)
        expect(screen.queryByTestId('modal-detail-subject')).toBeNull()
    })
})
