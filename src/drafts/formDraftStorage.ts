type DraftValues = Record<string, string>

function isRecord(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    )
}

export function createFormDraftStorage(
    formId: string,
    allowedFields: readonly string[],
) {
    if (
        !formId.trim() ||
        allowedFields.length === 0 ||
        allowedFields.some((field) => !field.trim())
    ) {
        throw new Error('Cần mã form và danh sách trường được phép lưu.')
    }

    const fields = [...new Set(allowedFields)]

    function keyFor(userId: string) {
        if (!userId.trim()) {
            throw new Error('Cần mã người dùng để lưu bản nháp.')
        }

        return `tms:draft:v1:${JSON.stringify([userId, formId])}`
    }

    // Chỉ lấy những trường đã được cho phép.
    function selectValues(value: unknown): DraftValues | null {
        if (!isRecord(value)) {
            return null
        }

        for (const field of fields) {
            if (
                !Object.hasOwn(value, field) ||
                typeof value[field] !== 'string'
            ) {
                return null
            }
        }

        return Object.fromEntries(
            fields.map((field) => [field, value[field] as string]),
        )
    }

    function save(userId: string, values: DraftValues): boolean {
        try {
            const selected = selectValues(values)

            if (selected === null) {
                return false
            }

            window.sessionStorage.setItem(
                keyFor(userId),
                JSON.stringify({
                    version: 1,
                    values: selected,
                }),
            )

            return true
        } catch {
            // Trình duyệt có thể chặn lưu trữ hoặc bộ nhớ đã đầy.
            return false
        }
    }

    function load(userId: string): DraftValues | null {
        try {
            const raw = window.sessionStorage.getItem(keyFor(userId))

            if (raw === null) {
                return null
            }

            const stored: unknown = JSON.parse(raw)

            if (!isRecord(stored) || stored.version !== 1) {
                return null
            }

            return selectValues(stored.values)
        } catch {
            // Dữ liệu hỏng hoặc không truy cập được bộ nhớ.
            return null
        }
    }

    function remove(userId: string): boolean {
        try {
            window.sessionStorage.removeItem(keyFor(userId))
            return true
        } catch {
            return false
        }
    }

    return { save, load, remove }
}