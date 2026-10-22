// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { ClassSubjectInstructorAssignPage } from './ClassSubjectInstructorAssignPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { TrainingClass, ClassSubjectItem } from '../api/classApi'
import type { User } from '../api/userApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const sampleSubject: ClassSubjectItem = {
    id: 'cs-enh-01',
    class_id: 'cls-enh-01',
    subject_id: 'sub-enh-01',
    subject_code: 'SE201',
    subject_name: 'Kỹ thuật phần mềm',
    credits: 3,
    semester: 2,
    is_mandatory: true,
    order_index: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    main_instructor: null,
    assistants: [],
}

const sampleClass: TrainingClass = {
    id: 'cls-enh-01',
    class_code: 'CNTT-K22A',
    program_id: 'prog-01',
    program_code: 'PROG-SE',
    program_name: 'Kỹ thuật phần mềm ICTU',
    expected_start_date: '2026-09-01',
    max_capacity: 40,
    learning_mode: 'offline',
    status: 'preparing',
    status_label: 'Chuẩn bị',
    enrolled_count: 10,
    subjects: [sampleSubject],
    copied_subjects_count: 1,
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
}

function RoleSessionWrapper({
    role = 'training_manager',
    roles,
    permissions,
    children,
}: {
    role?: string | null
    roles?: string[]
    permissions?: string[]
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()
    useEffect(() => {
        if (!hasSession) {
            startSession(
                { accessToken: 'mock-token', refreshToken: 'mock-refresh' },
                role,
                'usr-mgr',
                false,
                'Quản lý Đào tạo',
                'manager@ictu.edu.vn',
                roles ?? (role ? [role] : ['training_manager']),
                permissions ?? ['course.manage', 'course.view'],
            )
        }
    }, [role, roles, permissions, hasSession, startSession])

    if (!hasSession) {
        return <div>Initializing session...</div>
    }

    return <>{children}</>
}

function renderAssignPage(ui: ReactNode) {
    return render(
        <MemoryRouter>
            <SessionProvider apiOrigin="http://localhost:5000">
                <RoleSessionWrapper>{ui}</RoleSessionWrapper>
            </SessionProvider>
        </MemoryRouter>,
    )
}

describe('SCRUM-220 & SCRUM-254: Cải thiện bố cục và tìm kiếm người được phân công', () => {
    // -------------------------------------------------------------------------
    // 1. TÌM NGƯỜI NGOÀI 20 KẾT QUẢ ĐẦU & TẢI THÊM PHÂN TRANG
    // -------------------------------------------------------------------------
    it('1. Tìm người ngoài 20 kết quả đầu và tải thêm phân trang thành công', async () => {
        const page1Items: User[] = Array.from({ length: 20 }, (_, i) => ({
            id: `trainer-${i + 1}`,
            name: `Giảng viên ${i + 1}`,
            email: `trainer${i + 1}@ictu.edu.vn`,
            role: 'trainer',
            status: 'active',
        }))

        const page2Items: User[] = [
            {
                id: 'trainer-21',
                name: 'Thầy Đặc Biệt 21',
                email: 'trainer21@ictu.edu.vn',
                role: 'trainer',
                status: 'active',
            },
        ]

        const mockRequest = vi.fn().mockImplementation(async (url: string) => {
            if (url.includes('/candidates')) {
                if (url.includes('page=2')) {
                    return new Response(
                        JSON.stringify({
                            status: 'success',
                            data: {
                                items: page2Items,
                                total: 21,
                                page: 2,
                                page_size: 20,
                                has_more: false,
                            },
                        }),
                        { status: 200, headers: { 'Content-Type': 'application/json' } },
                    )
                }
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: {
                            items: page1Items,
                            total: 21,
                            page: 1,
                            page_size: 20,
                            has_more: true,
                        },
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success', data: {} }), { status: 200 })
        })

        renderAssignPage(
            <ClassSubjectInstructorAssignPage
                initialClass={sampleClass}
                initialSubject={sampleSubject}
                customRequest={mockRequest}
            />,
        )

        // Đợi 20 kết quả đầu tải xong
        await waitFor(() => {
            expect(screen.getByTestId('main-candidate-item-trainer-1')).toBeDefined()
        })
        expect(screen.queryByTestId('main-candidate-item-trainer-21')).toBeNull()

        // Nút tải thêm xuất hiện vì has_more = true
        await waitFor(() => {
            expect(screen.getByTestId('load-more-main-btn')).toBeDefined()
        })
        const loadMoreBtn = screen.getByTestId('load-more-main-btn')

        // Bấm Tải thêm
        fireEvent.click(loadMoreBtn)

        // Kết quả trang 2 xuất hiện (người thứ 21)
        await waitFor(() => {
            expect(screen.getByTestId('main-candidate-item-trainer-21')).toBeDefined()
        })
        expect(screen.getByText('Thầy Đặc Biệt 21')).toBeDefined()

        // Chọn người thứ 21 làm Giảng viên chính
        fireEvent.click(screen.getByTestId('select-main-btn-trainer-21'))

        // Thẻ Giảng viên chính đã chọn cập nhật sang Thầy Đặc Biệt 21
        expect(screen.getByTestId('selected-main-name').textContent).toBe('Thầy Đặc Biệt 21')
    })

    // -------------------------------------------------------------------------
    // 2. TÊN TRÙNG, EMAIL DÀI, TÌM KHÔNG CÓ KẾT QUẢ
    // -------------------------------------------------------------------------
    it('2. Phân biệt người trùng tên qua email, email dài không lỗi và tìm không có kết quả', async () => {
        const duplicateNameTrainers: User[] = [
            {
                id: 'tr-dup-01',
                name: 'Nguyễn Văn A',
                email: 'a.nguyen@ictu.edu.vn',
                role: 'trainer',
                status: 'active',
            },
            {
                id: 'tr-dup-02',
                name: 'Nguyễn Văn A',
                email: 'a.nguyen.cntt.k19@ictu.edu.vn',
                role: 'trainer',
                status: 'active',
            },
            {
                id: 'tr-long-email',
                name: 'Trần Thị Thu Trang',
                email: 'trang.tran.thi.thu.specialized.ai.robotics.lecturer.long.email@ictu.edu.vn',
                role: 'trainer',
                status: 'active',
            },
        ]

        const mockRequest = vi.fn().mockImplementation(async (url: string) => {
            if (url.includes('/candidates')) {
                if (url.includes('q=khong_tim_thay_ai')) {
                    return new Response(
                        JSON.stringify({
                            status: 'success',
                            data: {
                                items: [],
                                total: 0,
                                page: 1,
                                page_size: 20,
                                has_more: false,
                            },
                        }),
                        { status: 200, headers: { 'Content-Type': 'application/json' } },
                    )
                }
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: {
                            items: duplicateNameTrainers,
                            total: 3,
                            page: 1,
                            page_size: 20,
                            has_more: false,
                        },
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success', data: {} }), { status: 200 })
        })

        renderAssignPage(
            <ClassSubjectInstructorAssignPage
                initialClass={sampleClass}
                initialSubject={sampleSubject}
                customRequest={mockRequest}
            />,
        )

        await waitFor(() => {
            expect(screen.getByTestId('main-candidate-item-tr-dup-01')).toBeDefined()
            expect(screen.getByTestId('main-candidate-item-tr-dup-02')).toBeDefined()
        })

        // Hai người trùng tên nhưng hiển thị email khác nhau để phân biệt
        const item1 = screen.getByTestId('main-candidate-item-tr-dup-01')
        const item2 = screen.getByTestId('main-candidate-item-tr-dup-02')
        expect(item1.textContent).toContain('a.nguyen@ictu.edu.vn')
        expect(item2.textContent).toContain('a.nguyen.cntt.k19@ictu.edu.vn')

        // Email siêu dài hiển thị đúng
        const itemLong = screen.getByTestId('main-candidate-item-tr-long-email')
        expect(itemLong.textContent).toContain('trang.tran.thi.thu.specialized.ai.robotics.lecturer.long.email@ictu.edu.vn')

        // Gõ tìm kiếm không có kết quả
        const searchInput = screen.getByTestId('main-instructor-search-input')
        fireEvent.change(searchInput, { target: { value: 'khong_tim_thay_ai' } })

        await waitFor(() => {
            expect(screen.getByTestId('main-no-results')).toBeDefined()
        })
        expect(screen.getByTestId('main-no-results').textContent).toContain('Không tìm thấy giảng viên nào')
    })

    // -------------------------------------------------------------------------
    // 3. CHỌN NHIỀU TRỢ GIẢNG QUA NHIỀU LẦN TÌM KIẾM
    // -------------------------------------------------------------------------
    it('3. Chọn nhiều trợ giảng qua nhiều lần đổi từ khóa tìm kiếm: giữ nguyên danh sách đã chọn', async () => {
        const asst1: User = { id: 'asst-101', name: 'Trợ giảng Lê 1', email: 'le1@ictu.edu.vn', role: 'trainer', status: 'active' }
        const asst2: User = { id: 'asst-102', name: 'Trợ giảng Trần 2', email: 'tran2@ictu.edu.vn', role: 'trainer', status: 'active' }

        const mockRequest = vi.fn().mockImplementation(async (url: string) => {
            if (url.includes('/candidates')) {
                if (url.includes('q=tran')) {
                    return new Response(
                        JSON.stringify({
                            status: 'success',
                            data: { items: [asst2], total: 1, page: 1, page_size: 20, has_more: false },
                        }),
                        { status: 200, headers: { 'Content-Type': 'application/json' } },
                    )
                }
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: { items: [asst1], total: 1, page: 1, page_size: 20, has_more: false },
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success', data: {} }), { status: 200 })
        })

        renderAssignPage(
            <ClassSubjectInstructorAssignPage
                initialClass={sampleClass}
                initialSubject={sampleSubject}
                customRequest={mockRequest}
            />,
        )

        // 1. Tải danh sách trợ giảng ban đầu (chứa asst1)
        await waitFor(() => {
            expect(screen.getByTestId(`assistant-checkbox-${asst1.id}`)).toBeDefined()
        })

        // Chọn Trợ giảng 1
        fireEvent.click(screen.getByTestId(`assistant-checkbox-${asst1.id}`))

        // Khu vực "Đã chọn" hiển thị Trợ giảng 1
        expect(screen.getByTestId('selected-assistants-count').textContent).toContain('Đã chọn (1)')
        expect(screen.getByTestId(`selected-assistant-chip-${asst1.id}`)).toBeDefined()

        // 2. Tìm kiếm từ khóa "tran" để tìm Trợ giảng 2
        const asstInput = screen.getByTestId('assistant-search-input')
        fireEvent.change(asstInput, { target: { value: 'tran' } })

        await waitFor(() => {
            expect(screen.getByTestId(`assistant-checkbox-${asst2.id}`)).toBeDefined()
        })

        // Danh sách "Đã chọn" VẪN GIỮ NGUYÊN Trợ giảng 1
        expect(screen.getByTestId('selected-assistants-count').textContent).toContain('Đã chọn (1)')
        expect(screen.getByTestId(`selected-assistant-chip-${asst1.id}`)).toBeDefined()

        // Chọn tiếp Trợ giảng 2
        fireEvent.click(screen.getByTestId(`assistant-checkbox-${asst2.id}`))

        // Đã chọn hiển thị cả 2 người
        expect(screen.getByTestId('selected-assistants-count').textContent).toContain('Đã chọn (2)')
        expect(screen.getByTestId(`selected-assistant-chip-${asst1.id}`)).toBeDefined()
        expect(screen.getByTestId(`selected-assistant-chip-${asst2.id}`)).toBeDefined()
    })

    // -------------------------------------------------------------------------
    // 4. BỎ CHỌN MỘT NGƯỜI KHÔNG LÀM MẤT NGƯỜI KHÁC
    // -------------------------------------------------------------------------
    it('4. Bỏ chọn một trợ giảng không làm mất những người còn lại', async () => {
        const asstA = { id: 'asst-a', name: 'Trợ giảng A', email: 'a@ictu.edu.vn' }
        const asstB = { id: 'asst-b', name: 'Trợ giảng B', email: 'b@ictu.edu.vn' }
        const asstC = { id: 'asst-c', name: 'Trợ giảng C', email: 'c@ictu.edu.vn' }

        renderAssignPage(
            <ClassSubjectInstructorAssignPage
                initialClass={sampleClass}
                initialSubject={sampleSubject}
                initialAssignment={{
                    main_instructor: null,
                    assistants: [asstA, asstB, asstC],
                }}
            />,
        )

        // Ban đầu có 3 trợ giảng
        await waitFor(() => {
            expect(screen.getByTestId('selected-assistants-count')).toBeDefined()
        })
        expect(screen.getByTestId('selected-assistants-count').textContent).toContain('Đã chọn (3)')
        expect(screen.getByTestId(`selected-assistant-chip-${asstA.id}`)).toBeDefined()
        expect(screen.getByTestId(`selected-assistant-chip-${asstB.id}`)).toBeDefined()
        expect(screen.getByTestId(`selected-assistant-chip-${asstC.id}`)).toBeDefined()

        // Bấm nút xóa B
        fireEvent.click(screen.getByTestId(`remove-assistant-${asstB.id}`))

        // Số lượng còn 2, B biến mất, A và C vẫn còn nguyên
        expect(screen.getByTestId('selected-assistants-count').textContent).toContain('Đã chọn (2)')
        expect(screen.queryByTestId(`selected-assistant-chip-${asstB.id}`)).toBeNull()
        expect(screen.getByTestId(`selected-assistant-chip-${asstA.id}`)).toBeDefined()
        expect(screen.getByTestId(`selected-assistant-chip-${asstC.id}`)).toBeDefined()
    })

    // -------------------------------------------------------------------------
    // 5. MỞ LẠI PHÂN CÔNG ĐÃ LƯU (PERSISTENCE DÙ NGOÀI TRANG TÌM KIẾM ĐẦU)
    // -------------------------------------------------------------------------
    it('5. Mở trang phân công đã lưu: hiển thị đúng giảng viên và trợ giảng dù không thuộc trang tìm kiếm đầu tiên', async () => {
        const assignedMain = {
            id: 'trainer-rare-99',
            name: 'TS. Nguyễn Văn Quý',
            email: 'quy.nv@ictu.edu.vn',
        }
        const assignedAsst = {
            id: 'asst-rare-88',
            name: 'ThS. Hoàng Trợ Giảng',
            email: 'hoang.asst@ictu.edu.vn',
        }

        // Mock candidates trả về danh sách khác hoàn toàn không có assignedMain hay assignedAsst
        const mockRequest = vi.fn().mockImplementation(async (url: string) => {
            if (url.includes('/candidates')) {
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: {
                            items: [
                                { id: 'other-1', name: 'Giảng viên Khác', email: 'other@ictu.edu.vn', role: 'trainer', status: 'active' },
                            ],
                            total: 50,
                            page: 1,
                            page_size: 20,
                            has_more: true,
                        },
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success', data: {} }), { status: 200 })
        })

        renderAssignPage(
            <ClassSubjectInstructorAssignPage
                initialClass={sampleClass}
                initialSubject={sampleSubject}
                initialAssignment={{
                    main_instructor: assignedMain,
                    assistants: [assignedAsst],
                }}
                customRequest={mockRequest}
            />,
        )

        // Giảng viên chính đã phân công hiển thị đúng tên và email
        await waitFor(() => {
            expect(screen.getByTestId('selected-main-name')).toBeDefined()
        })
        expect(screen.getByTestId('selected-main-name').textContent).toBe('TS. Nguyễn Văn Quý')
        expect(screen.getByTestId('selected-main-email').textContent).toBe('quy.nv@ictu.edu.vn')

        // Trợ giảng đã phân công hiển thị đúng
        expect(screen.getByTestId(`selected-assistant-name-${assignedAsst.id}`).textContent).toBe('ThS. Hoàng Trợ Giảng')
        expect(screen.getByTestId(`selected-assistant-email-${assignedAsst.id}`).textContent).toContain('hoang.asst@ictu.edu.vn')
    })

    // -------------------------------------------------------------------------
    // 6. PHÂN BIỆT LỖI TẢI VÀ DANH SÁCH RỖNG
    // -------------------------------------------------------------------------
    it('6. Lỗi API khi tải ứng viên hiển thị thông báo lỗi và nút thử lại, không hiển thị như danh sách rỗng', async () => {
        const mockRequest = vi.fn().mockImplementation(async (url: string) => {
            if (url.includes('/candidates')) {
                return new Response(
                    JSON.stringify({
                        status: 'error',
                        code: 'NETWORK_TIMEOUT',
                        message: 'Máy chủ phản hồi chậm hoặc lỗi mạng.',
                    }),
                    { status: 500, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success', data: {} }), { status: 200 })
        })

        renderAssignPage(
            <ClassSubjectInstructorAssignPage
                initialClass={sampleClass}
                initialSubject={sampleSubject}
                customRequest={mockRequest}
            />,
        )

        // Chờ hiển thị lỗi tìm kiếm
        await waitFor(() => {
            expect(screen.getByTestId('retry-main-search-btn')).toBeDefined()
        })

        // Không bị nhầm sang danh sách rỗng
        expect(screen.queryByTestId('main-no-results')).toBeNull()
        expect(screen.getAllByText(/Máy chủ phản hồi chậm hoặc lỗi mạng/i).length).toBeGreaterThan(0)
    })

    // -------------------------------------------------------------------------
    // 7. BỐ CỤC THU GỌN VÀ THAO TÁC HỦY KHÔNG LƯU
    // -------------------------------------------------------------------------
    it('7. Thanh thông tin môn học hiển thị thu gọn, nút Hủy không gửi request lưu phân công', async () => {
        let saveCalled = false
        const mockRequest = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.includes('/instructors') && init?.method === 'POST') {
                saveCalled = true
            }
            return new Response(JSON.stringify({ status: 'success', data: {} }), { status: 200 })
        })

        renderAssignPage(
            <ClassSubjectInstructorAssignPage
                initialClass={sampleClass}
                initialSubject={sampleSubject}
                customRequest={mockRequest}
            />,
        )

        // Kiểm tra dải tóm tắt môn học tải xong
        await waitFor(() => {
            expect(screen.getByText('SE201')).toBeDefined()
        })
        expect(screen.getAllByText('Kỹ thuật phần mềm').length).toBeGreaterThan(0)
        expect(screen.getByText('3 tín chỉ')).toBeDefined()
        expect(screen.getByText('Học kỳ 2')).toBeDefined()

        // Bấm Hủy / Quay lại
        const cancelBtn = screen.getByTestId('cancel-assignment-btn')
        fireEvent.click(cancelBtn)

        // Không gửi API lưu
        expect(saveCalled).toBe(false)
    })
})
