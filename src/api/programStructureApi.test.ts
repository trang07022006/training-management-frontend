// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import {
    getProgramStructure,
    addSubjectToProgram,
    updateProgramSubject,
    reorderProgramSubjects,
    removeSubjectFromProgram,
    getPrerequisites,
    addPrerequisite,
    removePrerequisite,
    type ProgramStructure,
    type ProgramSubject,
    type RequestFunction,
    ApiError,
} from './programStructureApi'

describe('programStructureApi - API Client (SCRUM-124 Activity A6)', () => {
    const mockStructure: ProgramStructure = {
        program: {
            id: 'prog-111',
            code: 'CNTT-K21',
            name: 'Công nghệ thông tin K21',
            description: 'Chương trình chuẩn',
            duration_semesters: 8,
            status: 'draft',
        },
        total_subjects: 2,
        total_credits: 6,
        items: [
            {
                program_subject_id: 'ps-1',
                program_id: 'prog-111',
                subject_id: 'sub-1',
                code: 'INT101',
                name: 'Tin học đại cương',
                credits: 3,
                total_sessions: 30,
                status: 'active',
                semester: 1,
                is_mandatory: true,
                order_index: 1,
                prerequisites: [],
            },
            {
                program_subject_id: 'ps-2',
                program_id: 'prog-111',
                subject_id: 'sub-2',
                code: 'INT102',
                name: 'Kỹ thuật lập trình',
                credits: 3,
                total_sessions: 30,
                status: 'active',
                semester: 2,
                is_mandatory: true,
                order_index: 1,
                prerequisites: [
                    {
                        id: 'prereq-1',
                        prerequisite_program_subject_id: 'ps-1',
                        code: 'INT101',
                        name: 'Tin học đại cương',
                        credits: 3,
                    },
                ],
            },
        ],
    }

    describe('getProgramStructure', () => {
        it('gọi đúng GET endpoint với query filters', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockStructure,
            }) as unknown as RequestFunction

            const res = await getProgramStructure(mockRequest, 'prog-111', { semester: 1, is_mandatory: true })

            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/training-programs/prog-111/subjects?semester=1&is_mandatory=true',
                { method: 'GET' },
            )
            expect(res.total_subjects).toBe(2)
            expect(res.items.length).toBe(2)
        })

        it('ném ApiError khi chương trình không tồn tại (404)', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: async () => ({ error: { code: 'PROGRAM_NOT_FOUND', message: 'Không tìm thấy chương trình' } }),
            }) as unknown as RequestFunction

            await expect(getProgramStructure(mockRequest, 'prog-999')).rejects.toThrow(ApiError)
        })
    })

    describe('addSubjectToProgram', () => {
        it('gửi POST payload thành công', async () => {
            const mockSubject: ProgramSubject = mockStructure.items[0]
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                status: 201,
                json: async () => ({ item: mockSubject }),
            }) as unknown as RequestFunction

            const res = await addSubjectToProgram(mockRequest, 'prog-111', {
                subject_id: 'sub-1',
                semester: 1,
                is_mandatory: true,
                order_index: 1,
            })

            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/training-programs/prog-111/subjects',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subject_id: 'sub-1',
                        semester: 1,
                        is_mandatory: true,
                        order_index: 1,
                    }),
                }),
            )
            expect(res.code).toBe('INT101')
        })

        it('xử lý 409 khi môn học đã có trong chương trình', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 409,
                json: async () => ({ error: { code: 'SUBJECT_ALREADY_IN_PROGRAM' } }),
            }) as unknown as RequestFunction

            await expect(
                addSubjectToProgram(mockRequest, 'prog-111', { subject_id: 'sub-1' }),
            ).rejects.toThrow('Môn học đã tồn tại trong chương trình đào tạo.')
        })
    })

    describe('updateProgramSubject', () => {
        it('gửi PATCH payload thành công', async () => {
            const updatedSubject: ProgramSubject = { ...mockStructure.items[0], semester: 2, order_index: 3 }
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ item: updatedSubject }),
            }) as unknown as RequestFunction

            const res = await updateProgramSubject(mockRequest, 'prog-111', 'ps-1', {
                semester: 2,
                order_index: 3,
            })

            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/training-programs/prog-111/subjects/ps-1',
                expect.objectContaining({
                    method: 'PATCH',
                    body: JSON.stringify({ semester: 2, order_index: 3 }),
                }),
            )
            expect(res.semester).toBe(2)
        })

        it('ném lỗi khi không tìm thấy program_subject (404)', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: async () => ({ error: { code: 'PROGRAM_SUBJECT_NOT_FOUND' } }),
            }) as unknown as RequestFunction

            await expect(
                updateProgramSubject(mockRequest, 'prog-111', 'ps-unknown', { semester: 2 }),
            ).rejects.toThrow('Không tìm thấy môn học trong chương trình đào tạo.')
        })
    })

    describe('reorderProgramSubjects', () => {
        it('gửi PATCH reorder thành công', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ message: 'Sắp xếp thứ tự môn học thành công', semester: 1 }),
            }) as unknown as RequestFunction

            const res = await reorderProgramSubjects(mockRequest, 'prog-111', {
                semester: 1,
                ordered_ids: ['ps-2', 'ps-1'],
            })

            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/training-programs/prog-111/subjects/reorder',
                expect.objectContaining({
                    method: 'PATCH',
                    body: JSON.stringify({ semester: 1, ordered_ids: ['ps-2', 'ps-1'] }),
                }),
            )
            expect(res.semester).toBe(1)
        })
    })

    describe('removeSubjectFromProgram', () => {
        it('gửi DELETE thành công', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ message: 'Đã gỡ môn học khỏi chương trình đào tạo' }),
            }) as unknown as RequestFunction

            const res = await removeSubjectFromProgram(mockRequest, 'prog-111', 'ps-1')

            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/training-programs/prog-111/subjects/ps-1',
                { method: 'DELETE' },
            )
            expect(res.message).toBeDefined()
        })

        it('báo lỗi khi môn học đang là prerequisite cho môn khác (409)', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 409,
                json: async () => ({ error: { code: 'PROGRAM_SUBJECT_IN_USE' } }),
            }) as unknown as RequestFunction

            await expect(
                removeSubjectFromProgram(mockRequest, 'prog-111', 'ps-1'),
            ).rejects.toThrow('Môn học đang là điều kiện tiên quyết của môn khác. Hãy gỡ ràng buộc tiên quyết trước.')
        })
    })

    describe('Prerequisites API', () => {
        it('getPrerequisites gọi đúng URL', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    prerequisites: [
                        { id: 'prereq-1', program_id: 'prog-111', program_subject_id: 'ps-2', prerequisite_program_subject_id: 'ps-1' },
                    ],
                }),
            }) as unknown as RequestFunction

            const res = await getPrerequisites(mockRequest, 'prog-111', 'ps-2')
            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/training-programs/prog-111/subjects/ps-2/prerequisites',
                { method: 'GET' },
            )
            expect(res.length).toBe(1)
        })

        it('addPrerequisite gửi POST và xử lý lỗi PREREQUISITE_CYCLE (409)', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 409,
                json: async () => ({ error: { code: 'PREREQUISITE_CYCLE' } }),
            }) as unknown as RequestFunction

            await expect(
                addPrerequisite(mockRequest, 'prog-111', 'ps-1', 'ps-2'),
            ).rejects.toThrow('Không thể thêm môn tiên quyết vì tạo vòng lặp phụ thuộc (chu trình).')
        })

        it('addPrerequisite xử lý lỗi INVALID_PREREQUISITE_ORDER (400)', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                json: async () => ({ error: { code: 'INVALID_PREREQUISITE_ORDER' } }),
            }) as unknown as RequestFunction

            await expect(
                addPrerequisite(mockRequest, 'prog-111', 'ps-1', 'ps-2'),
            ).rejects.toThrow('Môn tiên quyết phải được xếp trước môn học phụ thuộc theo học kỳ hoặc thứ tự học.')
        })

        it('removePrerequisite gửi DELETE thành công', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ message: 'Đã xóa điều kiện tiên quyết' }),
            }) as unknown as RequestFunction

            const res = await removePrerequisite(mockRequest, 'prog-111', 'ps-2', 'ps-1')
            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/training-programs/prog-111/subjects/ps-2/prerequisites/ps-1',
                { method: 'DELETE' },
            )
            expect(res.message).toBeDefined()
        })
    })
})
