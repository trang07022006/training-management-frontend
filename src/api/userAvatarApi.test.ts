// @vitest-environment jsdom

import { describe, expect, it, vi, beforeAll } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
    type UserProfileData,
    getUserProfileApi,
    updateUserProfileApi,
    ApiError,
} from './userApi'
import {
    getProfileAvatarApi,
    uploadProfileAvatarApi,
    deleteProfileAvatarApi,
    validateAvatarFile,
    createSafeObjectUrl,
    revokeSafeObjectUrl,
    AvatarUrlManager,
    useAvatarObjectUrl,
    isAvatarNotFoundError,
    shouldFallbackAvatar,
} from './userAvatarApi'
import { getErrorMessage } from '../utils/errorMessages'
import { SessionApiError } from '../auth/sessionClient'

beforeAll(() => {
    if (typeof URL.createObjectURL !== 'function') {
        URL.createObjectURL = vi.fn((blob: Blob) => `blob:mock-uuid-${blob.size}`)
    }
    if (typeof URL.revokeObjectURL !== 'function') {
        URL.revokeObjectURL = vi.fn()
    }
})

describe('SCRUM-121 Activity A5: Frontend Avatar API Integration', () => {
    // 1. profile type hỗ trợ avatar_url
    it('1. profile type hỗ trợ avatar_url', () => {
        const profileWithAvatar: UserProfileData = {
            id: 'user-001',
            email: 'trainee@daotao.edu.vn',
            name: 'Nguyễn Văn Trainee',
            phone: '0987654321',
            date_of_birth: '1998-05-12',
            address: 'Hà Nội',
            role: 'trainee',
            status: 'active',
            avatar_url: '/api/v1/users/profile/avatar',
        }
        expect(profileWithAvatar.avatar_url).toBe('/api/v1/users/profile/avatar')

        const profileWithoutAvatar: UserProfileData = {
            id: 'user-002',
            email: 'trainer@daotao.edu.vn',
            name: 'Trần Thị Trainer',
            role: 'trainer',
            avatar_url: null,
        }
        expect(profileWithoutAvatar.avatar_url).toBeNull()
    })

    // 2. GET avatar gọi đúng endpoint
    it('2. GET avatar gọi đúng endpoint', async () => {
        const mockBlob = new Blob(['image-bytes'], { type: 'image/jpeg' })
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            blob: async () => mockBlob,
            json: vi.fn(),
        })

        await getProfileAvatarApi(mockRequest)
        expect(mockRequest).toHaveBeenCalledTimes(1)
        expect(mockRequest).toHaveBeenCalledWith('/api/v1/users/profile/avatar', {
            method: 'GET',
        })
    })

    // 3. GET avatar dùng auth client hiện tại
    it('3. GET avatar dùng auth client hiện tại', async () => {
        const mockBlob = new Blob(['png-bytes'], { type: 'image/png' })
        const authClientRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            blob: async () => mockBlob,
        })

        const result = await getProfileAvatarApi(authClientRequest)
        expect(authClientRequest).toHaveBeenCalledTimes(1)
        expect(result).toBe(mockBlob)
    })

    // 4. GET avatar trả Blob
    it('4. GET avatar trả Blob', async () => {
        const binaryData = new Uint8Array([255, 216, 255, 224])
        const mockBlob = new Blob([binaryData], { type: 'image/jpeg' })
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            blob: async () => mockBlob,
        })

        const result = await getProfileAvatarApi(mockRequest)
        expect(result).toBeInstanceOf(Blob)
        expect(result.type).toBe('image/jpeg')
    })

    // 5. GET avatar không parse JSON khi thành công
    it('5. GET avatar không parse JSON khi thành công', async () => {
        const mockBlob = new Blob(['img'], { type: 'image/webp' })
        const jsonSpy = vi.fn()
        const blobSpy = vi.fn().mockResolvedValue(mockBlob)
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: jsonSpy,
            blob: blobSpy,
        })

        const result = await getProfileAvatarApi(mockRequest)
        expect(result).toBe(mockBlob)
        expect(blobSpy).toHaveBeenCalledTimes(1)
        expect(jsonSpy).not.toHaveBeenCalled()
    })

    // 6. 404 AVATAR_NOT_FOUND được nhận diện đúng
    it('6. 404 AVATAR_NOT_FOUND được nhận diện đúng', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            json: async () => ({
                status: 'error',
                code: 'AVATAR_NOT_FOUND',
                message: 'Người dùng chưa có ảnh đại diện hoặc file không tồn tại.',
            }),
        })

        let caughtError: unknown
        try {
            await getProfileAvatarApi(mockRequest)
        } catch (err) {
            caughtError = err
        }

        expect(caughtError).toBeInstanceOf(ApiError)
        expect((caughtError as ApiError).code).toBe('AVATAR_NOT_FOUND')
        expect((caughtError as ApiError).status).toBe(404)
        expect(isAvatarNotFoundError(caughtError)).toBe(true)
        expect(shouldFallbackAvatar(null, caughtError)).toBe(true)
    })

    // 7. upload dùng POST đúng endpoint
    it('7. upload dùng POST đúng endpoint', async () => {
        const file = new File(['upload-content'], 'avatar.jpg', { type: 'image/jpeg' })
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                status: 'success',
                message: 'Cập nhật ảnh đại diện thành công.',
                data: { avatar_path: 'avatars/uuid-test.jpg' },
            }),
        })

        const res = await uploadProfileAvatarApi(mockRequest, file)
        expect(mockRequest).toHaveBeenCalledWith(
            '/api/v1/users/profile/avatar',
            expect.objectContaining({ method: 'POST' }),
        )
        expect(res.status).toBe('success')
        expect(res.message).toBe('Cập nhật ảnh đại diện thành công.')
    })

    // 8. upload dùng FormData
    it('8. upload dùng FormData', async () => {
        const file = new File(['content'], 'avatar.png', { type: 'image/png' })
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ status: 'success' }),
        })

        await uploadProfileAvatarApi(mockRequest, file)
        const init = mockRequest.mock.calls[0][1]
        expect(init.body).toBeInstanceOf(FormData)
    })

    // 9. field tên avatar
    it('9. field tên avatar', async () => {
        const file = new File(['avatar-bytes'], 'user_face.webp', { type: 'image/webp' })
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ status: 'success' }),
        })

        await uploadProfileAvatarApi(mockRequest, file)
        const formData = mockRequest.mock.calls[0][1].body as FormData
        expect(formData.get('avatar')).toBe(file)
    })

    // 10. không tự set multipart Content-Type sai boundary
    it('10. không tự set multipart Content-Type sai boundary', async () => {
        const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' })
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ status: 'success' }),
        })

        await uploadProfileAvatarApi(mockRequest, file)
        const init = mockRequest.mock.calls[0][1]
        expect(init.headers).toBeUndefined()
    })

    // 11. upload giữ authentication
    it('11. upload giữ authentication', async () => {
        const authenticatedRequest = vi.fn().mockImplementation(async (_path, init) => {
            const headers = new Headers(init?.headers)
            headers.set('Authorization', 'Bearer mock-access-token')
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    message: 'Cập nhật ảnh đại diện thành công.',
                }),
            } as Response
        })

        const file = new File(['photo'], 'my_avatar.png', { type: 'image/png' })
        const result = await uploadProfileAvatarApi(authenticatedRequest, file)
        expect(authenticatedRequest).toHaveBeenCalledTimes(1)
        expect(result.status).toBe('success')
    })

    // 12. delete gọi DELETE đúng endpoint
    it('12. delete gọi DELETE đúng endpoint', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                status: 'success',
                message: 'Đã xóa ảnh đại diện.',
                data: null,
            }),
        })

        const result = await deleteProfileAvatarApi(mockRequest)
        expect(mockRequest).toHaveBeenCalledWith('/api/v1/users/profile/avatar', {
            method: 'DELETE',
        })
        expect(result.status).toBe('success')
        expect(result.message).toBe('Đã xóa ảnh đại diện.')
    })

    // 13. delete không gửi user_id
    it('13. delete không gửi user_id', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ status: 'success' }),
        })

        await deleteProfileAvatarApi(mockRequest)
        const [path, init] = mockRequest.mock.calls[0]
        expect(path).toBe('/api/v1/users/profile/avatar')
        expect(init.body).toBeUndefined()
        expect(path).not.toContain('user_id')
        expect(path).not.toContain('avatar_path')
    })

    // 14. JPG client validation PASS
    it('14. JPG client validation PASS', () => {
        const file = new File(['jpg-content'], 'photo.jpg', { type: 'image/jpeg' })
        expect(validateAvatarFile(file)).toBeNull()
    })

    // 15. JPEG PASS
    it('15. JPEG PASS', () => {
        const file = new File(['jpeg-content'], 'photo.jpeg', { type: 'image/jpeg' })
        expect(validateAvatarFile(file)).toBeNull()
    })

    // 16. PNG PASS
    it('16. PNG PASS', () => {
        const file = new File(['png-content'], 'photo.png', { type: 'image/png' })
        expect(validateAvatarFile(file)).toBeNull()
    })

    // 17. WEBP PASS
    it('17. WEBP PASS', () => {
        const file = new File(['webp-content'], 'photo.webp', { type: 'image/webp' })
        expect(validateAvatarFile(file)).toBeNull()
    })

    // 18. file >2MB bị client validation chặn
    it('18. file >2MB bị client validation chặn', () => {
        const oversized = new Uint8Array(2 * 1024 * 1024 + 1)
        const file = new File([oversized], 'large.png', { type: 'image/png' })
        const error = validateAvatarFile(file)
        expect(error).not.toBeNull()
        expect(error?.code).toBe('AVATAR_TOO_LARGE')
        expect(error?.message).toBe('Ảnh đại diện không được vượt quá 2 MB.')
    })

    // 19. MIME không hỗ trợ bị chặn
    it('19. MIME không hỗ trợ bị chặn', () => {
        const pdfFile = new File(['pdf-data'], 'doc.pdf', { type: 'application/pdf' })
        const errorPdf = validateAvatarFile(pdfFile)
        expect(errorPdf?.code).toBe('INVALID_AVATAR_TYPE')
        expect(errorPdf?.message).toBe('Ảnh đại diện phải là JPG, JPEG, PNG hoặc WEBP.')

        const gifFile = new File(['gif-data'], 'anim.gif', { type: 'image/gif' })
        const errorGif = validateAvatarFile(gifFile)
        expect(errorGif?.code).toBe('INVALID_AVATAR_TYPE')
    })

    // 20. object URL được create
    it('20. object URL được create', () => {
        const blob = new Blob(['bytes'], { type: 'image/jpeg' })
        const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/test-uuid-20')
        const url = createSafeObjectUrl(blob)
        expect(createSpy).toHaveBeenCalledWith(blob)
        expect(url).toBe('blob:http://localhost/test-uuid-20')
        createSpy.mockRestore()
    })

    // 21. object URL cũ được revoke khi thay
    it('21. object URL cũ được revoke khi thay', () => {
        const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
        const createSpy = vi.spyOn(URL, 'createObjectURL')
            .mockReturnValueOnce('blob:http://localhost/first-url')
            .mockReturnValueOnce('blob:http://localhost/second-url')

        const manager = new AvatarUrlManager()
        const blob1 = new Blob(['1'], { type: 'image/png' })
        const url1 = manager.setBlob(blob1)
        expect(url1).toBe('blob:http://localhost/first-url')
        expect(revokeSpy).not.toHaveBeenCalled()

        const blob2 = new Blob(['2'], { type: 'image/png' })
        const url2 = manager.setBlob(blob2)
        expect(url2).toBe('blob:http://localhost/second-url')
        expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/first-url')

        createSpy.mockRestore()
        revokeSpy.mockRestore()
    })

    // 22. object URL revoke khi cleanup
    it('22. object URL revoke khi cleanup', () => {
        const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
        const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/cleanup-url')

        const manager = new AvatarUrlManager()
        manager.setBlob(new Blob(['test'], { type: 'image/jpeg' }))
        manager.revoke()

        expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/cleanup-url')
        expect(manager.getUrl()).toBeNull()

        // Kiểm tra trực tiếp hàm helper revokeSafeObjectUrl
        revokeSafeObjectUrl('blob:http://localhost/direct-revoke')
        expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/direct-revoke')

        // Kiểm tra an toàn khi truyền null/undefined
        revokeSafeObjectUrl(null)
        revokeSafeObjectUrl(undefined)

        createSpy.mockRestore()
        revokeSpy.mockRestore()
    })

    // 23. AVATAR_REQUIRED mapping đúng
    it('23. AVATAR_REQUIRED mapping đúng', () => {
        expect(getErrorMessage('AVATAR_REQUIRED')).toBe('Vui lòng chọn ảnh đại diện.')
        expect(getErrorMessage({ code: 'AVATAR_REQUIRED' })).toBe('Vui lòng chọn ảnh đại diện.')
    })

    // 24. AVATAR_TOO_LARGE mapping đúng
    it('24. AVATAR_TOO_LARGE mapping đúng', () => {
        expect(getErrorMessage('AVATAR_TOO_LARGE')).toBe('Ảnh đại diện không được vượt quá 2 MB.')
        expect(getErrorMessage({ code: 'AVATAR_TOO_LARGE' })).toBe('Ảnh đại diện không được vượt quá 2 MB.')
    })

    // 25. INVALID_AVATAR_TYPE mapping đúng
    it('25. INVALID_AVATAR_TYPE mapping đúng', () => {
        expect(getErrorMessage('INVALID_AVATAR_TYPE')).toBe('Ảnh đại diện phải là JPG, JPEG, PNG hoặc WEBP.')
        expect(getErrorMessage({ code: 'INVALID_AVATAR_TYPE' })).toBe('Ảnh đại diện phải là JPG, JPEG, PNG hoặc WEBP.')
    })

    // 26. session errors vẫn đi qua session handling hiện tại
    it('26. session errors vẫn đi qua session handling hiện tại', async () => {
        const sessionExpiredError = new SessionApiError('SESSION_EXPIRED', 401)
        const mockRequestExpired = vi.fn().mockRejectedValue(sessionExpiredError)

        await expect(getProfileAvatarApi(mockRequestExpired)).rejects.toThrow(sessionExpiredError)

        const sessionRevokedError = new SessionApiError('SESSION_REVOKED', 401)
        const mockRequestRevoked = vi.fn().mockRejectedValue(sessionRevokedError)

        await expect(
            uploadProfileAvatarApi(mockRequestRevoked, new File([''], 'photo.jpg', { type: 'image/jpeg' }))
        ).rejects.toThrow(sessionRevokedError)
    })

    // 27. các API/profile SCRUM-120 cũ không regression
    it('27. các API/profile SCRUM-120 cũ không regression', async () => {
        const mockProfileData: UserProfileData = {
            id: 'user-scrum120',
            email: 'user120@daotao.edu.vn',
            name: 'Nguyễn Văn 120',
            phone: '0988776655',
            date_of_birth: '1995-10-10',
            address: 'Hà Nội',
            role: 'trainer',
            status: 'active',
            avatar_url: '/api/v1/users/profile/avatar',
        }

        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ status: 'success', data: mockProfileData }),
        })

        const profile = await getUserProfileApi(mockRequest)
        expect(profile.id).toBe('user-scrum120')
        expect(profile.name).toBe('Nguyễn Văn 120')
        expect(profile.avatar_url).toBe('/api/v1/users/profile/avatar')
        expect(mockRequest).toHaveBeenCalledWith('/api/v1/users/profile', { method: 'GET' })

        const updatePayload = { name: 'Nguyễn Văn Cập Nhật', phone: '0911223344' }
        mockRequest.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                status: 'success',
                data: { ...mockProfileData, ...updatePayload },
            }),
        })

        const updated = await updateUserProfileApi(mockRequest, updatePayload)
        expect(updated.name).toBe('Nguyễn Văn Cập Nhật')
        expect(updated.phone).toBe('0911223344')
    })

    // Extra: hook useAvatarObjectUrl lifecycle
    it('28. hook useAvatarObjectUrl quản lý vòng đời và giải phóng bộ nhớ đúng', () => {
        const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
        const createSpy = vi.spyOn(URL, 'createObjectURL')
            .mockReturnValueOnce('blob:http://localhost/hook-url-1')
            .mockReturnValueOnce('blob:http://localhost/hook-url-2')

        const blob1 = new Blob(['first-img'], { type: 'image/png' })
        const { result, rerender, unmount } = renderHook(({ b }: { b: Blob | null }) => useAvatarObjectUrl(b), {
            initialProps: { b: blob1 as Blob | null },
        })

        expect(result.current).toBe('blob:http://localhost/hook-url-1')

        const blob2 = new Blob(['second-img'], { type: 'image/png' })
        rerender({ b: blob2 })
        expect(result.current).toBe('blob:http://localhost/hook-url-2')
        expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/hook-url-1')

        unmount()
        expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/hook-url-2')

        createSpy.mockRestore()
        revokeSpy.mockRestore()
    })
})
