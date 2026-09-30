// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ErrorPage } from './ErrorPage'

describe('ErrorPage Component (SCRUM-76)', () => {
    afterEach(() => {
        cleanup()
    })

    it('1. render tiêu đề và mô tả chính xác', () => {
        render(
            <MemoryRouter>
                <ErrorPage
                    title="Đã xảy ra lỗi"
                    description="Không thể xử lý yêu cầu vào lúc này. Vui lòng thử lại sau."
                />
            </MemoryRouter>,
        )

        const title = screen.getByTestId('error-title')
        const desc = screen.getByTestId('error-description')
        expect(title.textContent).toBe('Đã xảy ra lỗi')
        expect(desc.textContent).toBe('Không thể xử lý yêu cầu vào lúc này. Vui lòng thử lại sau.')
    })

    it('2. render status code khi được truyền', () => {
        render(
            <MemoryRouter>
                <ErrorPage
                    statusCode="404"
                    title="Không tìm thấy trang"
                    description="Trang bạn tìm kiếm không tồn tại."
                />
            </MemoryRouter>,
        )

        const badge = screen.getByTestId('error-status-code')
        expect(badge).toBeDefined()
        expect(badge.textContent).toBe('404')
    })

    it('3. không render status code badge khi statusCode là undefined/null', () => {
        render(
            <MemoryRouter>
                <ErrorPage
                    title="Thông báo lỗi"
                    description="Mô tả lỗi không có mã trạng thái."
                />
            </MemoryRouter>,
        )

        expect(screen.queryByTestId('error-status-code')).toBeNull()
    })

    it('4. primary action dạng nút bấm gọi hàm onClick khi người dùng click', () => {
        const handleClick = vi.fn()
        render(
            <MemoryRouter>
                <ErrorPage
                    title="Lỗi kết nối"
                    description="Vui lòng thử lại."
                    primaryAction={{
                        label: 'Thử lại ngay',
                        onClick: handleClick,
                    }}
                />
            </MemoryRouter>,
        )

        const primaryBtn = screen.getByTestId('error-primary-action')
        expect(primaryBtn).toBeDefined()
        expect(primaryBtn.textContent).toBe('Thử lại ngay')

        fireEvent.click(primaryBtn)
        expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('5. primary action dạng link có thuộc tính href và điều hướng đúng', () => {
        render(
            <MemoryRouter>
                <ErrorPage
                    title="Chưa đăng nhập"
                    description="Vui lòng đăng nhập."
                    primaryAction={{
                        label: 'Đăng nhập',
                        to: '/login',
                    }}
                />
            </MemoryRouter>,
        )

        const primaryLink = screen.getByTestId('error-primary-action')
        expect(primaryLink.tagName.toLowerCase()).toBe('a')
        expect(primaryLink.getAttribute('href')).toBe('/login')
        expect(primaryLink.textContent).toBe('Đăng nhập')
    })

    it('6. secondary action hoạt động chính xác cả dạng link và button', () => {
        const handleBack = vi.fn()
        const { unmount } = render(
            <MemoryRouter>
                <ErrorPage
                    title="Lỗi truy cập"
                    description="Bạn không có quyền."
                    secondaryAction={{
                        label: 'Quay lại',
                        onClick: handleBack,
                    }}
                />
            </MemoryRouter>,
        )

        const secBtn = screen.getByTestId('error-secondary-action')
        expect(secBtn.textContent).toBe('Quay lại')
        fireEvent.click(secBtn)
        expect(handleBack).toHaveBeenCalledTimes(1)

        unmount()

        render(
            <MemoryRouter>
                <ErrorPage
                    title="Lỗi truy cập"
                    description="Bạn không có quyền."
                    secondaryAction={{
                        label: 'Về trang chủ',
                        to: '/',
                    }}
                />
            </MemoryRouter>,
        )

        const secLink = screen.getByTestId('error-secondary-action')
        expect(secLink.tagName.toLowerCase()).toBe('a')
        expect(secLink.getAttribute('href')).toBe('/')
    })

    it('7. xử lý an toàn khi không có actions và không có icon', () => {
        render(
            <MemoryRouter>
                <ErrorPage
                    title="Chỉ thông báo"
                    description="Không có hành động bổ sung."
                />
            </MemoryRouter>,
        )

        expect(screen.queryByTestId('error-actions-group')).toBeNull()
        expect(screen.getByTestId('error-icon-wrapper')).toBeDefined()
    })

    it('8. hỗ trợ icon có sẵn (unauthorized, forbidden, not-found, error) và icon tuỳ biến', () => {
        const { rerender } = render(
            <MemoryRouter>
                <ErrorPage
                    statusCode={401}
                    icon="unauthorized"
                    title="401"
                    description="Hết phiên"
                />
            </MemoryRouter>,
        )
        expect(screen.getByTestId('error-icon-wrapper')).toBeDefined()

        rerender(
            <MemoryRouter>
                <ErrorPage
                    statusCode={403}
                    icon="forbidden"
                    title="403"
                    description="Không có quyền"
                />
            </MemoryRouter>,
        )
        expect(screen.getByTestId('error-icon-wrapper')).toBeDefined()

        rerender(
            <MemoryRouter>
                <ErrorPage
                    statusCode={404}
                    icon="not-found"
                    title="404"
                    description="Không tìm thấy"
                />
            </MemoryRouter>,
        )
        expect(screen.getByTestId('error-icon-wrapper')).toBeDefined()

        rerender(
            <MemoryRouter>
                <ErrorPage
                    icon={<span data-testid="custom-test-icon">Custom Icon</span>}
                    title="Lỗi khác"
                    description="Mô tả"
                />
            </MemoryRouter>,
        )
        expect(screen.getByTestId('custom-test-icon')).toBeDefined()
    })

    it('9. render children mở rộng an toàn khi được cung cấp', () => {
        render(
            <MemoryRouter>
                <ErrorPage
                    title="Lỗi phức tạp"
                    description="Vui lòng kiểm tra chi tiết bên dưới"
                >
                    <div data-testid="error-extra-details">Mã tham chiếu: ERR_123</div>
                </ErrorPage>
            </MemoryRouter>,
        )

        const extra = screen.getByTestId('error-extra-details')
        expect(extra.textContent).toBe('Mã tham chiếu: ERR_123')
    })
})
