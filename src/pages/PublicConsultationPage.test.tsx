// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as publicConsultationApi from '../api/publicConsultationApi'
import { PublicConsultationPage } from './PublicConsultationPage'

describe('PublicConsultationPage (SCRUM-125)', () => {
    const mockPrograms = [
        { id: 'prog-1', code: 'SE01', name: 'Kỹ thuật phần mềm', description: 'Ngành hot' },
        { id: 'prog-2', code: 'CS01', name: 'Khoa học máy tính', description: null },
    ]

    beforeEach(() => {
        vi.restoreAllMocks()
        vi.spyOn(publicConsultationApi, 'getPublicProgramOptions').mockResolvedValue(mockPrograms)
    })

    afterEach(() => {
        cleanup()
    })

    const renderPage = (props = {}) => {
        return render(
            <MemoryRouter initialEntries={['/consultation']}>
                <PublicConsultationPage {...props} />
            </MemoryRouter>,
        )
    }

    it('1. Hiển thị đúng tiêu đề, mô tả và các trường form công khai', async () => {
        renderPage()

        expect(screen.getByRole('heading', { name: /đăng ký tư vấn/i })).toBeDefined()
        expect(screen.getByText(/ban tư vấn tuyển sinh ictu sẽ liên hệ/i)).toBeDefined()

        expect(screen.getByLabelText(/họ và tên/i)).toBeDefined()
        expect(screen.getByLabelText(/số điện thoại/i)).toBeDefined()
        expect(screen.getByLabelText(/địa chỉ email/i)).toBeDefined()
        expect(screen.getByLabelText(/chương trình đào tạo quan tâm/i)).toBeDefined()
        expect(screen.getByLabelText(/nội dung cần tư vấn/i)).toBeDefined()
        expect(screen.getByRole('button', { name: /gửi yêu cầu tư vấn/i })).toBeDefined()
    })

    it('2. Tải và hiển thị danh sách chương trình đào tạo mở công khai', async () => {
        renderPage()

        await waitFor(() => {
            expect(screen.getByText('Kỹ thuật phần mềm (SE01)')).toBeDefined()
            expect(screen.getByText('Khoa học máy tính (CS01)')).toBeDefined()
        })
    })

    it('3. Xử lý lỗi tải chương trình: hiển thị thông báo nhẹ, form vẫn hoạt động bình thường', async () => {
        vi.spyOn(publicConsultationApi, 'getPublicProgramOptions').mockRejectedValue(
            new Error('Network error'),
        )

        renderPage()

        await waitFor(() => {
            expect(
                screen.getByText(/danh sách chương trình đào tạo hiện không khả dụng/i),
            ).toBeDefined()
        })

        // Các input vẫn không bị disable
        expect(screen.getByLabelText(/họ và tên/i).hasAttribute('disabled')).toBe(false)
        expect(screen.getByLabelText(/số điện thoại/i).hasAttribute('disabled')).toBe(false)
    })

    it('4. Báo lỗi khi thiếu Họ và tên', async () => {
        renderPage()

        fireEvent.change(screen.getByLabelText(/số điện thoại/i), {
            target: { value: '0912345678' },
        })

        fireEvent.click(screen.getByRole('button', { name: /gửi yêu cầu tư vấn/i }))

        await waitFor(() => {
            expect(screen.getByText('Họ và tên là bắt buộc.')).toBeDefined()
        })
    })

    it('5. Báo lỗi khi thiếu hoặc sai định dạng Số điện thoại', async () => {
        renderPage()

        fireEvent.change(screen.getByLabelText(/họ và tên/i), {
            target: { value: 'Nguyễn Văn A' },
        })
        fireEvent.change(screen.getByLabelText(/số điện thoại/i), {
            target: { value: 'abc' },
        })

        fireEvent.click(screen.getByRole('button', { name: /gửi yêu cầu tư vấn/i }))

        await waitFor(() => {
            expect(
                screen.getByText('Số điện thoại không đúng định dạng hợp lệ.'),
            ).toBeDefined()
        })
    })

    it('6. Báo lỗi khi Email sai định dạng (nhưng hợp lệ khi để trống email)', async () => {
        renderPage()

        fireEvent.change(screen.getByLabelText(/họ và tên/i), {
            target: { value: 'Nguyễn Văn A' },
        })
        fireEvent.change(screen.getByLabelText(/số điện thoại/i), {
            target: { value: '0912345678' },
        })
        fireEvent.change(screen.getByLabelText(/địa chỉ email/i), {
            target: { value: 'not-an-email' },
        })

        fireEvent.click(screen.getByRole('button', { name: /gửi yêu cầu tư vấn/i }))

        await waitFor(() => {
            expect(screen.getByText('Định dạng email không hợp lệ.')).toBeDefined()
        })
    })

    it('7. Gửi yêu cầu tối thiểu (minimal valid) thành công và hiển thị giao diện kết quả', async () => {
        const submitSpy = vi.spyOn(publicConsultationApi, 'submitPublicConsultation').mockResolvedValue({
            status: 'success',
            message: 'Yêu cầu tư vấn của bạn đã được ghi nhận.',
            data: { id: 'lead-min-123' },
        })

        const onSuccess = vi.fn()
        renderPage({ onSuccess })

        fireEvent.change(screen.getByLabelText(/họ và tên/i), {
            target: { value: 'Lê Văn An' },
        })
        fireEvent.change(screen.getByLabelText(/số điện thoại/i), {
            target: { value: '0912345678' },
        })

        fireEvent.click(screen.getByRole('button', { name: /gửi yêu cầu tư vấn/i }))

        await waitFor(() => {
            expect(submitSpy).toHaveBeenCalledWith(
                {
                    full_name: 'Lê Văn An',
                    phone: '0912345678',
                    email: null,
                    interested_program_id: null,
                    message: null,
                },
                undefined,
                undefined,
            )
            expect(screen.getByText('Gửi yêu cầu thành công!')).toBeDefined()
            expect(screen.getByText(/lead-min-123/)).toBeDefined()
            expect(onSuccess).toHaveBeenCalled()
        })
    })

    it('8. Gửi yêu cầu đầy đủ (full valid) và chọn chương trình đào tạo', async () => {
        const submitSpy = vi.spyOn(publicConsultationApi, 'submitPublicConsultation').mockResolvedValue({
            status: 'success',
            message: 'Yêu cầu tư vấn của bạn đã được ghi nhận.',
            data: { id: 'lead-full-456' },
        })

        renderPage()

        await waitFor(() => {
            expect(screen.getByText('Kỹ thuật phần mềm (SE01)')).toBeDefined()
        })

        fireEvent.change(screen.getByLabelText(/họ và tên/i), {
            target: { value: 'Trần Thị Mai' },
        })
        fireEvent.change(screen.getByLabelText(/số điện thoại/i), {
            target: { value: '0987654321' },
        })
        fireEvent.change(screen.getByLabelText(/địa chỉ email/i), {
            target: { value: 'mai@example.com' },
        })
        fireEvent.change(screen.getByLabelText(/chương trình đào tạo quan tâm/i), {
            target: { value: 'prog-1' },
        })
        fireEvent.change(screen.getByLabelText(/nội dung cần tư vấn/i), {
            target: { value: 'Tôi cần tư vấn học phí ngành KTPM' },
        })

        fireEvent.click(screen.getByRole('button', { name: /gửi yêu cầu tư vấn/i }))

        await waitFor(() => {
            expect(submitSpy).toHaveBeenCalledWith(
                {
                    full_name: 'Trần Thị Mai',
                    phone: '0987654321',
                    email: 'mai@example.com',
                    interested_program_id: 'prog-1',
                    message: 'Tôi cần tư vấn học phí ngành KTPM',
                },
                undefined,
                undefined,
            )
            expect(screen.getByText('Gửi yêu cầu thành công!')).toBeDefined()
        })
    })

    it('9. Nút "Gửi yêu cầu khác" giúp reset trạng thái form', async () => {
        vi.spyOn(publicConsultationApi, 'submitPublicConsultation').mockResolvedValue({
            status: 'success',
            message: 'Yêu cầu tư vấn của bạn đã được ghi nhận.',
            data: { id: 'lead-reset-789' },
        })

        renderPage()

        fireEvent.change(screen.getByLabelText(/họ và tên/i), { target: { value: 'User Reset' } })
        fireEvent.change(screen.getByLabelText(/số điện thoại/i), { target: { value: '0912345678' } })
        fireEvent.click(screen.getByRole('button', { name: /gửi yêu cầu tư vấn/i }))

        await waitFor(() => {
            expect(screen.getByText('Gửi yêu cầu thành công!')).toBeDefined()
        })

        fireEvent.click(screen.getByRole('button', { name: /gửi yêu cầu khác/i }))

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /gửi yêu cầu tư vấn/i })).toBeDefined()
            expect(screen.getByLabelText(/họ và tên/i)).toHaveProperty('value', '')
        })
    })

    it('10. Hiển thị thông báo lỗi khi API backend trả về lỗi', async () => {
        vi.spyOn(publicConsultationApi, 'submitPublicConsultation').mockRejectedValue(
            new publicConsultationApi.ApiError('Đã xảy ra lỗi cơ sở dữ liệu. Vui lòng thử lại sau.', 'DATABASE_ERROR', 500),
        )

        renderPage()

        fireEvent.change(screen.getByLabelText(/họ và tên/i), { target: { value: 'Error Test' } })
        fireEvent.change(screen.getByLabelText(/số điện thoại/i), { target: { value: '0912345678' } })
        fireEvent.click(screen.getByRole('button', { name: /gửi yêu cầu tư vấn/i }))

        await waitFor(() => {
            expect(
                screen.getByText('Đã xảy ra lỗi cơ sở dữ liệu. Vui lòng thử lại sau.'),
            ).toBeDefined()
        })
    })

    it('11. Chống click đúp (Double-submit prevention) trong khi đang gửi', async () => {
        let resolveSubmit: (val: any) => void = () => {}
        const delayedPromise = new Promise((resolve) => {
            resolveSubmit = resolve
        })

        vi.spyOn(publicConsultationApi, 'submitPublicConsultation').mockReturnValue(delayedPromise as any)

        renderPage()

        fireEvent.change(screen.getByLabelText(/họ và tên/i), { target: { value: 'Double Click' } })
        fireEvent.change(screen.getByLabelText(/số điện thoại/i), { target: { value: '0912345678' } })

        const submitBtn = screen.getByRole('button', { name: /gửi yêu cầu tư vấn/i })
        fireEvent.click(submitBtn)

        // Nút bị disabled và đổi text
        expect(submitBtn.hasAttribute('disabled')).toBe(true)
        expect(screen.getByText(/đang gửi yêu cầu.../i)).toBeDefined()

        // Resolve
        resolveSubmit({
            status: 'success',
            message: 'Xong',
            data: { id: 'lead-double-1' },
        })

        await waitFor(() => {
            expect(screen.getByText('Gửi yêu cầu thành công!')).toBeDefined()
        })
    })

    it('12. Hiển thị thông báo và disable dropdown khi không có chương trình nào mở đăng ký', async () => {
        vi.spyOn(publicConsultationApi, 'getPublicProgramOptions').mockResolvedValue([])

        renderPage()

        await waitFor(() => {
            const select = screen.getByLabelText(/chương trình đào tạo quan tâm/i) as HTMLSelectElement
            expect(select.disabled).toBe(true)
            expect(screen.getByText('-- Hiện chưa có chương trình mở đăng ký --')).toBeDefined()
        })
    })
})
