// @vitest-environment jsdom

import { StrictMode, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../api/userAvatarApi', () => ({
    getProfileAvatarApi: vi.fn().mockRejectedValue(new Error('Avatar mock')),
    createSafeObjectUrl: vi.fn().mockReturnValue(''),
    revokeSafeObjectUrl: vi.fn(),
}))
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router'

import DraftDevPanel from './DraftDevPanel'
import { createFormDraftStorage } from './formDraftStorage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { SessionRedirect } from '../auth/SessionRedirect'
import { RequireSession } from '../auth/RequireSession'
import { SessionNotice } from '../auth/SessionNotice'
import { LoginPage } from '../pages/LoginPage'

const storage = createFormDraftStorage(
    'scrum42-demo:create',
    ['title', 'description'],
)

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

function TestControls() {
    const { startSession, verifySessionUser, userId } = useSession()
    const [result, setResult] = useState('')

    async function verify() {
        try {
            await verifySessionUser()
            setResult('OK')
        } catch {
            setResult('ERROR')
        }
    }

    return (
        <>
            {['user-a', 'user-b'].map((id) => (
                <button
                    key={id}
                    onClick={() =>
                        startSession({
                            accessToken: `access-${id}`,
                            refreshToken: `refresh-${id}`,
                        })
                    }
                >
                    {`Nạp ${id}`}
                </button>
            ))}

            <button onClick={verify}>Xác minh</button>
            <Link to="/">Mở form thử</Link>

            <span data-testid="identity">{userId ?? 'none'}</span>
            <span data-testid="verification">{result}</span>
        </>
    )
}

function setup() {
    const fetcher = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetcher)

    const view = render(
        <StrictMode>
            <MemoryRouter initialEntries={['/login']}>
                <SessionProvider apiOrigin="https://api.example.test">
                    <SessionRedirect />
                    <SessionNotice />
                    <TestControls />

                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route element={<RequireSession />}>
                            <Route path="/" element={<DraftDevPanel />} />
                        </Route>
                    </Routes>
                </SessionProvider>
            </MemoryRouter>
        </StrictMode>,
    )

    return { fetcher, unmount: view.unmount }
}

function click(name: string) {
    fireEvent.click(screen.getByRole('button', { name }))
}

function openForm() {
    fireEvent.click(screen.getByRole('link', { name: 'Mở form thử' }))
}

async function enterAs(
    fetcher: ReturnType<typeof setup>['fetcher'],
    userId: string,
) {
    fetcher.mockResolvedValueOnce(json({ user_id: userId }))

    click(`Nạp ${userId}`)
    click('Xác minh')

    await waitFor(() => {
        expect(screen.getByTestId('identity').textContent).toBe(userId)
    })

    openForm()
    await screen.findByRole('textbox', { name: 'Tiêu đề' })
}

function fillDraft(title: string, description: string) {
    fireEvent.change(screen.getByRole('textbox', { name: 'Tiêu đề' }), {
        target: { value: title },
    })

    fireEvent.change(screen.getByRole('textbox', { name: 'Nội dung' }), {
        target: { value: description },
    })
}

function expectFields(title: string, description: string) {
    const titleInput = screen.getByRole('textbox', {
        name: 'Tiêu đề',
    }) as HTMLInputElement

    const descriptionInput = screen.getByRole('textbox', {
        name: 'Nội dung',
    }) as HTMLTextAreaElement

    expect(titleInput.value).toBe(title)
    expect(descriptionInput.value).toBe(description)
}

beforeEach(() => {
    window.sessionStorage.clear()
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    window.sessionStorage.clear()
})

describe('Khôi phục bản nháp trên giao diện', () => {
    it('chưa xác minh tài khoản thì chưa mở bản nháp', async () => {
        storage.save('user-a', {
            title: 'Bản nháp A',
            description: 'Nội dung của A',
        })

        setup()
        click('Nạp user-a')
        openForm()

        await screen.findByText(
            'Bấm “Kiểm tra phiên” để xác minh tài khoản trước khi mở bản nháp.',
        )

        expect(screen.queryByRole('textbox', { name: 'Tiêu đề' }))
            .toBeNull()
        expect(screen.queryByDisplayValue('Bản nháp A')).toBeNull()
    })

    it('hết phiên rồi đăng nhập lại cùng tài khoản thì khôi phục', async () => {
        const { fetcher } = setup()

        await enterAs(fetcher, 'user-a')
        fillDraft('Khóa học Python', 'Nội dung chưa gửi lên server')

        fetcher.mockResolvedValueOnce(
            json({ code: 'SESSION_EXPIRED' }, 401),
        )

        click('Xác minh')

        await screen.findByRole('heading', { name: 'Đăng nhập' })
        expect(screen.queryByRole('textbox', { name: 'Tiêu đề' }))
            .toBeNull()

        await enterAs(fetcher, 'user-a')

        expectFields('Khóa học Python', 'Nội dung chưa gửi lên server')
        expect(screen.getByText(
            'Đã khôi phục bản nháp của tài khoản hiện tại.',
        )).toBeTruthy()
        expect(screen.queryByRole('alert')).toBeNull()
    })

    it('đổi tài khoản không hiển thị hoặc ghi đè bản nháp của nhau', async () => {
        const { fetcher } = setup()

        await enterAs(fetcher, 'user-a')
        fillDraft('Tiêu đề A', 'Nội dung A')

        await enterAs(fetcher, 'user-b')
        expectFields('', '')
        fillDraft('Tiêu đề B', 'Nội dung B')

        await enterAs(fetcher, 'user-a')
        expectFields('Tiêu đề A', 'Nội dung A')

        expect(storage.load('user-b')).toEqual({
            title: 'Tiêu đề B',
            description: 'Nội dung B',
        })
    })

    it('tạo lại ứng dụng rồi xác minh lại vẫn đọc được bản nháp', async () => {
        const first = setup()

        await enterAs(first.fetcher, 'user-a')
        fillDraft('Đang soạn', 'Giữ nội dung khi tạo lại ứng dụng')

        first.unmount()

        const second = setup()

        expect(screen.getByTestId('identity').textContent).toBe('none')

        await enterAs(second.fetcher, 'user-a')
        expectFields('Đang soạn', 'Giữ nội dung khi tạo lại ứng dụng')
    })

    it('bỏ bản nháp thì làm trống form và không khôi phục lại', async () => {
        const { fetcher } = setup()

        await enterAs(fetcher, 'user-a')
        fillDraft('Không cần nữa', 'Nội dung bỏ đi')

        click('Bỏ bản nháp')

        expectFields('', '')
        expect(storage.load('user-a')).toBeNull()

        await enterAs(fetcher, 'user-a')
        expectFields('', '')
    })

    it('không lưu được thì vẫn giữ nội dung đang nhập và báo lỗi', async () => {
        const { fetcher } = setup()

        await enterAs(fetcher, 'user-a')

        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('Storage is full', 'QuotaExceededError')
        })

        fillDraft('Cần giữ lại', 'Nội dung chưa lưu được')

        expectFields('Cần giữ lại', 'Nội dung chưa lưu được')
        expect(screen.getByText(
            'Không lưu được bản nháp. Hãy sao chép nội dung trước khi rời trang.',
        )).toBeTruthy()
    })
})