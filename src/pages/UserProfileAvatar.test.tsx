// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UserProfilePage } from './UserProfilePage'
import type { UserProfileData } from '../api/userApi'
import { SessionApiError } from '../auth/sessionClient'
import { getNameInitials } from '../navigation/userProfileUtils'

const mockRequest = vi.fn()
const mockUseSession = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../auth/SessionProvider', () => ({
    useSession: () => mockUseSession(),
}))

vi.mock('react-router', async () => {
    const actual = await vi.importActual<typeof import('react-router')>('react-router')
    return { ...actual, useNavigate: () => mockNavigate }
})

const AVATAR_PATH = '/api/v1/users/profile/avatar'
const PROFILE_PATH = '/api/v1/users/profile'

const baseProfile: UserProfileData = {
    id: 'user-001',
    email: 'trainer.demo@daotao.edu.vn',
    name: 'Giảng viên Demo',
    phone: '0912345678',
    date_of_birth: '1995-08-20',
    address: 'Hà Nội',
    role: 'trainer',
    status: 'active',
    avatar_url: null,
}

function jsonRes(data: unknown, status = 200): Response {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => data,
        blob: async () => new Blob(),
    } as unknown as Response
}

function blobRes(content = 'img'): Response {
    return {
        ok: true,
        status: 200,
        json: async () => { throw new Error('should not parse JSON') },
        blob: async () => new Blob([content], { type: 'image/png' }),
    } as unknown as Response
}

type Handler = (init?: RequestInit) => Promise<Response> | Response

interface Routes {
    profile?: UserProfileData
    getAvatar?: Handler
    postAvatar?: Handler
    deleteAvatar?: Handler
    putProfile?: Handler
}

function setupRoutes(routes: Routes = {}) {
    const profile = routes.profile ?? baseProfile
    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
        const method = (init?.method ?? 'GET').toUpperCase()
        if (path === PROFILE_PATH && method === 'GET') return jsonRes({ status: 'success', data: profile })
        if (path === PROFILE_PATH && method === 'PUT') {
            return routes.putProfile
                ? routes.putProfile(init)
                : jsonRes({ status: 'success', data: { ...profile, ...JSON.parse(String(init?.body)) } })
        }
        if (path === AVATAR_PATH && method === 'GET') return routes.getAvatar ? routes.getAvatar(init) : blobRes()
        if (path === AVATAR_PATH && method === 'POST') {
            return routes.postAvatar ? routes.postAvatar(init) : jsonRes({ status: 'success', message: 'ok' })
        }
        if (path === AVATAR_PATH && method === 'DELETE') {
            return routes.deleteAvatar ? routes.deleteAvatar(init) : jsonRes({ status: 'success', message: 'ok' })
        }
        throw new Error(`Unexpected request ${method} ${path}`)
    })
}

let urlCounter = 0
let createSpy: ReturnType<typeof vi.fn>
let revokeSpy: ReturnType<typeof vi.fn>

function renderPage() {
    mockUseSession.mockReturnValue({ hasSession: true, userId: 'user-001', role: 'trainer', request: mockRequest })
    return render(
        <MemoryRouter>
            <UserProfilePage />
        </MemoryRouter>,
    )
}

function makeFile(name: string, type: string, size = 1024): File {
    return new File([new Uint8Array(size)], name, { type })
}

function selectFile(file: File) {
    const input = screen.getByTestId('avatar-file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
}

function callsTo(method: string, path = AVATAR_PATH) {
    return mockRequest.mock.calls.filter(
        ([p, init]) => p === path && ((init?.method ?? 'GET') as string).toUpperCase() === method,
    )
}

const withAvatar = { ...baseProfile, avatar_url: AVATAR_PATH }

describe('SCRUM-121 A6: Giao diện ảnh đại diện trên /profile', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        urlCounter = 0
        createSpy = vi.fn(() => `blob:mock-${++urlCounter}`)
        revokeSpy = vi.fn()
        URL.createObjectURL = createSpy as unknown as typeof URL.createObjectURL
        URL.revokeObjectURL = revokeSpy as unknown as typeof URL.revokeObjectURL
    })

    afterEach(() => cleanup())

    // 1
    it('1. profile có avatar -> hiển thị ảnh', async () => {
        setupRoutes({ profile: withAvatar })
        renderPage()
        const img = (await screen.findByTestId('avatar-img')) as HTMLImageElement
        expect(img.getAttribute('src')).toBe('blob:mock-1')
        expect(img.getAttribute('alt')).toBe('Ảnh đại diện của Giảng viên Demo')
    })

    // 2, 5, 6
    it('2, 5, 6. profile không avatar -> initials fallback; test initials nhiều từ và 1 từ', async () => {
        setupRoutes()
        renderPage()
        const fallback = await screen.findByTestId('avatar-initials')
        expect(fallback.textContent).toBe('GD')
        expect(callsTo('GET')).toHaveLength(0)

        // 5. initials tên nhiều từ
        expect(getNameInitials('Lê Minh Trang')).toBe('LT')
        expect(getNameInitials('Nguyễn Anh Tuấn')).toBe('NT')
        expect(getNameInitials('Giảng viên Demo')).toBe('GD')

        // 6. initials tên một từ
        expect(getNameInitials('Trang')).toBe('T')
        expect(getNameInitials('Admin')).toBe('A')
        expect(getNameInitials('')).toBe('?')
        expect(getNameInitials(null)).toBe('?')
    })

    // 3
    it('3. avatar GET 404 -> fallback, trang profile vẫn hoạt động', async () => {
        setupRoutes({
            profile: withAvatar,
            getAvatar: () => jsonRes({ code: 'AVATAR_NOT_FOUND', message: 'x' }, 404),
        })
        renderPage()
        await waitFor(() => expect(screen.getByTestId('avatar-initials').textContent).toBe('GD'))
        expect(screen.getByTestId('profile-form')).toBeDefined()
        expect(screen.queryByTestId('avatar-error')).toBeNull()
        expect(screen.queryByTestId('profile-load-error')).toBeNull()
    })

    // 4
    it('4. click Đổi ảnh -> mở input file', async () => {
        setupRoutes()
        renderPage()
        await screen.findByTestId('btn-avatar-change')
        const input = screen.getByTestId('avatar-file-input') as HTMLInputElement
        const clickSpy = vi.spyOn(input, 'click')
        fireEvent.click(screen.getByTestId('btn-avatar-change'))
        expect(clickSpy).toHaveBeenCalled()
        expect(input.getAttribute('accept')).toBe('image/jpeg,image/png,image/webp')
        expect(input.hasAttribute('capture')).toBe(false)
    })

    // 5-7
    it.each([
        ['5. JPG', 'a.jpg', 'image/jpeg'],
        ['6. PNG', 'a.png', 'image/png'],
        ['7. WEBP', 'a.webp', 'image/webp'],
    ])('%s hợp lệ -> preview', async (_l, name, type) => {
        setupRoutes()
        renderPage()
        await screen.findByTestId('btn-avatar-change')
        selectFile(makeFile(name, type))
        const preview = screen.getByTestId('avatar-preview-img') as HTMLImageElement
        expect(preview.getAttribute('src')).toBe('blob:mock-1')
        expect(screen.getByTestId('btn-avatar-save')).toBeDefined()
        expect(screen.getByTestId('btn-avatar-cancel')).toBeDefined()
    })

    // 8
    it('8. file quá 2MB -> lỗi', async () => {
        setupRoutes()
        renderPage()
        await screen.findByTestId('btn-avatar-change')
        selectFile(makeFile('big.png', 'image/png', 2 * 1024 * 1024 + 1))
        expect(screen.getByTestId('avatar-error').textContent).toBe('Ảnh đại diện không được vượt quá 2 MB.')
        expect(screen.queryByTestId('avatar-preview-img')).toBeNull()
    })

    // 9, 10
    it('9-10. file type sai -> lỗi và không gọi upload API', async () => {
        setupRoutes()
        renderPage()
        await screen.findByTestId('btn-avatar-change')
        selectFile(makeFile('doc.pdf', 'application/pdf'))
        expect(screen.getByTestId('avatar-error').textContent).toBe(
            'Ảnh đại diện phải là JPG, JPEG, PNG hoặc WEBP.',
        )
        expect(screen.queryByTestId('btn-avatar-save')).toBeNull()
        expect(callsTo('POST')).toHaveLength(0)
        expect(createSpy).not.toHaveBeenCalled()
    })

    // 11
    it('11. chọn file hợp lệ chưa upload ngay', async () => {
        setupRoutes()
        renderPage()
        await screen.findByTestId('btn-avatar-change')
        selectFile(makeFile('a.png', 'image/png'))
        expect(callsTo('POST')).toHaveLength(0)
    })

    // 12, 13, 14, 32
    it('12-14, 32. Hủy -> bỏ preview, không POST, revoke preview, chọn lại cùng file được', async () => {
        setupRoutes()
        renderPage()
        await screen.findByTestId('btn-avatar-change')
        const file = makeFile('a.png', 'image/png')
        selectFile(file)
        fireEvent.click(screen.getByTestId('btn-avatar-cancel'))
        expect(screen.queryByTestId('avatar-preview-img')).toBeNull()
        expect(screen.getByTestId('avatar-initials')).toBeDefined()
        expect(revokeSpy).toHaveBeenCalledWith('blob:mock-1')
        expect(callsTo('POST')).toHaveLength(0)
        expect((screen.getByTestId('avatar-file-input') as HTMLInputElement).value).toBe('')

        selectFile(file)
        expect((screen.getByTestId('avatar-preview-img') as HTMLImageElement).getAttribute('src')).toBe('blob:mock-2')
    })

    // 15-20, 31
    it('15-20, 31. Lưu ảnh -> POST đúng File, loading, refetch, avatar mới, success, revoke URL cũ', async () => {
        let resolvePost!: (r: Response) => void
        setupRoutes({
            profile: withAvatar,
            postAvatar: () => new Promise<Response>((r) => { resolvePost = r }),
        })
        renderPage()
        await screen.findByTestId('avatar-img') // blob:mock-1
        const file = makeFile('new.webp', 'image/webp')
        selectFile(file) // preview blob:mock-2

        fireEvent.click(screen.getByTestId('btn-avatar-save'))

        await waitFor(() => expect(callsTo('POST')).toHaveLength(1))
        const body = callsTo('POST')[0][1].body as FormData
        expect(body.get('avatar')).toBe(file)
        expect((screen.getByTestId('btn-avatar-save') as HTMLButtonElement).disabled).toBe(true)
        expect((screen.getByTestId('btn-avatar-cancel') as HTMLButtonElement).disabled).toBe(true)
        expect(screen.getByTestId('btn-avatar-save').textContent).toBe('Đang tải lên...')

        await act(async () => resolvePost(jsonRes({ status: 'success' })))

        await waitFor(() => expect(screen.getByTestId('avatar-success').textContent).toBe(
            'Cập nhật ảnh đại diện thành công.',
        ))
        expect(callsTo('GET')).toHaveLength(2)
        expect((screen.getByTestId('avatar-img') as HTMLImageElement).getAttribute('src')).toBe('blob:mock-3')
        expect(revokeSpy).toHaveBeenCalledWith('blob:mock-1') // avatar cũ
        expect(revokeSpy).toHaveBeenCalledWith('blob:mock-2') // preview
        expect(revokeSpy).not.toHaveBeenCalledWith('blob:mock-3')
    })

    // 21, 22
    it('21-22. upload fail -> giữ avatar cũ, hiển thị lỗi, cho phép thử lại', async () => {
        setupRoutes({
            profile: withAvatar,
            postAvatar: () => jsonRes({ code: 'AVATAR_TOO_LARGE', message: 'File too large' }, 413),
        })
        renderPage()
        await screen.findByTestId('avatar-img')
        selectFile(makeFile('a.png', 'image/png'))
        fireEvent.click(screen.getByTestId('btn-avatar-save'))
        await waitFor(() => expect(screen.getByTestId('avatar-error').textContent).toBe(
            'Ảnh đại diện không được vượt quá 2 MB.',
        ))
        expect(revokeSpy).not.toHaveBeenCalledWith('blob:mock-1')
        expect((screen.getByTestId('btn-avatar-save') as HTMLButtonElement).disabled).toBe(false)
        fireEvent.click(screen.getByTestId('btn-avatar-cancel'))
        expect((screen.getByTestId('avatar-img') as HTMLImageElement).getAttribute('src')).toBe('blob:mock-1')
    })

    it('21b. network error khi upload -> giữ avatar, báo lỗi mạng', async () => {
        setupRoutes({ profile: withAvatar, postAvatar: () => { throw new TypeError('Failed to fetch') } })
        renderPage()
        await screen.findByTestId('avatar-img')
        selectFile(makeFile('a.png', 'image/png'))
        fireEvent.click(screen.getByTestId('btn-avatar-save'))
        await waitFor(() => expect(screen.getByTestId('avatar-error').textContent).toContain('Không thể kết nối'))
        expect(screen.getByTestId('avatar-preview-img')).toBeDefined()
    })

    // 23, 24
    it('23-24. nút Xóa ảnh chỉ hiển thị khi có avatar thật', async () => {
        setupRoutes({ profile: withAvatar })
        renderPage()
        await screen.findByTestId('btn-avatar-delete')
        cleanup()
        setupRoutes()
        renderPage()
        await screen.findByTestId('btn-avatar-change')
        expect(screen.queryByTestId('btn-avatar-delete')).toBeNull()
    })

    // 25, 26
    it('25-26. click Xóa ảnh -> dialog; Ở lại -> không DELETE', async () => {
        setupRoutes({ profile: withAvatar })
        renderPage()
        fireEvent.click(await screen.findByTestId('btn-avatar-delete'))
        const dialog = screen.getByTestId('avatar-delete-confirm')
        expect(dialog.getAttribute('role')).toBe('dialog')
        expect(dialog.textContent).toContain('Bạn có chắc muốn xóa ảnh đại diện?')
        fireEvent.click(screen.getByTestId('btn-avatar-delete-stay'))
        expect(screen.queryByTestId('avatar-delete-confirm')).toBeNull()
        expect(callsTo('DELETE')).toHaveLength(0)
    })

    it('25b. Escape đóng dialog xóa ảnh', async () => {
        setupRoutes({ profile: withAvatar })
        renderPage()
        fireEvent.click(await screen.findByTestId('btn-avatar-delete'))
        fireEvent.keyDown(screen.getByTestId('avatar-delete-confirm'), { key: 'Escape' })
        expect(screen.queryByTestId('avatar-delete-confirm')).toBeNull()
    })

    // 27, 28, 29
    it('27-29. xác nhận -> DELETE, fallback initials, success message, revoke URL', async () => {
        setupRoutes({ profile: withAvatar })
        renderPage()
        fireEvent.click(await screen.findByTestId('btn-avatar-delete'))
        fireEvent.click(screen.getByTestId('btn-avatar-delete-confirm'))
        await waitFor(() => expect(screen.getByTestId('avatar-success').textContent).toBe('Đã xóa ảnh đại diện.'))
        expect(callsTo('DELETE')).toHaveLength(1)
        expect(callsTo('DELETE')[0][1].body).toBeUndefined()
        expect(screen.getByTestId('avatar-initials').textContent).toBe('GD')
        expect(screen.queryByTestId('btn-avatar-delete')).toBeNull()
        expect(revokeSpy).toHaveBeenCalledWith('blob:mock-1')
    })

    // 30
    it('30. delete fail -> giữ avatar và báo lỗi', async () => {
        setupRoutes({
            profile: withAvatar,
            deleteAvatar: () => jsonRes({ code: 'AVATAR_STORAGE_ERROR', message: 'err' }, 500),
        })
        renderPage()
        fireEvent.click(await screen.findByTestId('btn-avatar-delete'))
        fireEvent.click(screen.getByTestId('btn-avatar-delete-confirm'))
        await waitFor(() => expect(screen.getByTestId('avatar-error').textContent).toBe(
            'Lỗi lưu trữ ảnh đại diện. Vui lòng thử lại.',
        ))
        expect((screen.getByTestId('avatar-img') as HTMLImageElement).getAttribute('src')).toBe('blob:mock-1')
        expect(revokeSpy).not.toHaveBeenCalledWith('blob:mock-1')
    })

    // 33
    it('33. URLs được revoke khi unmount', async () => {
        setupRoutes({ profile: withAvatar })
        const { unmount } = renderPage()
        await screen.findByTestId('avatar-img')
        selectFile(makeFile('a.png', 'image/png'))
        unmount()
        expect(revokeSpy).toHaveBeenCalledWith('blob:mock-1')
        expect(revokeSpy).toHaveBeenCalledWith('blob:mock-2')
    })

    // 34, 36
    it('34, 36. avatar không làm dirty form; Hủy thay đổi điều hướng ngay không confirm', async () => {
        setupRoutes()
        renderPage()
        await screen.findByTestId('btn-avatar-change')
        selectFile(makeFile('a.png', 'image/png'))
        fireEvent.click(screen.getByTestId('btn-cancel-profile'))
        expect(screen.queryByTestId('cancel-confirm-modal')).toBeNull()
        expect(mockNavigate).toHaveBeenCalled()
    })

    it('36b. Cancel profile SCRUM-120 vẫn hiển thị confirm khi form dirty', async () => {
        setupRoutes()
        renderPage()
        const nameInput = (await screen.findByTestId('input-profile-name')) as HTMLInputElement
        fireEvent.change(nameInput, { target: { value: 'Tên mới' } })
        fireEvent.click(screen.getByTestId('btn-cancel-profile'))
        expect(screen.getByTestId('cancel-confirm-modal')).toBeDefined()
    })

    // 35
    it('35. Save profile SCRUM-120 vẫn hoạt động và không gửi avatar', async () => {
        setupRoutes()
        renderPage()
        const nameInput = (await screen.findByTestId('input-profile-name')) as HTMLInputElement
        fireEvent.change(nameInput, { target: { value: 'Giảng viên Mới' } })
        fireEvent.click(screen.getByTestId('btn-save-profile'))
        await waitFor(() => expect(screen.getByTestId('profile-success-message')).toBeDefined())
        const put = callsTo('PUT', PROFILE_PATH)
        expect(put).toHaveLength(1)
        const payload = JSON.parse(String(put[0][1].body))
        expect(payload).not.toHaveProperty('avatar')
        expect(payload).not.toHaveProperty('avatar_url')
        expect(callsTo('POST')).toHaveLength(0)
    })

    // 37
    it('37. email/role vẫn readonly', async () => {
        setupRoutes()
        renderPage()
        const email = (await screen.findByTestId('input-profile-email')) as HTMLInputElement
        expect(email.disabled || email.readOnly).toBe(true)
        expect(screen.getByTestId('profile-role-badge')).toBeDefined()
        expect(screen.queryByRole('combobox')).toBeNull()
    })

    // 44, 45
    it('44, 45. role readonly và phone validation vẫn hoạt động', async () => {
        setupRoutes()
        renderPage()
        const phoneInput = (await screen.findByTestId('input-profile-phone')) as HTMLInputElement
        fireEvent.change(phoneInput, { target: { value: '123456' } }) // sai định dạng VN phone
        fireEvent.click(screen.getByTestId('btn-save-profile'))
        await waitFor(() => {
            expect(screen.getByTestId('error-phone').textContent).toBe('Số điện thoại không đúng định dạng.')
        })
        expect(callsTo('PUT', PROFILE_PATH)).toHaveLength(0)
    })

    // 38 (46 in matrix)
    it('38. layout classes render đúng cho responsive', async () => {
        setupRoutes({ profile: withAvatar })
        renderPage()
        await screen.findByTestId('avatar-img')
        const section = screen.getByTestId('profile-avatar-section')
        expect(section.className).toContain('profile-avatar-section')
        expect(section.querySelector('.profile-avatar-frame')).not.toBeNull()
        expect(section.querySelector('.profile-avatar-actions')).not.toBeNull()
        expect(screen.getByTestId('avatar-img').className).toContain('profile-avatar-img')
    })

    // 39
    it('39. session error khi tải avatar không bị nuốt thành fallback im lặng', async () => {
        setupRoutes({
            profile: withAvatar,
            getAvatar: () => { throw new SessionApiError('SESSION_EXPIRED', 401) },
        })
        renderPage()
        await waitFor(() => expect(screen.getByTestId('avatar-error').textContent).toBe(
            'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.',
        ))
        expect(screen.getByTestId('avatar-initials')).toBeDefined()
    })
})
