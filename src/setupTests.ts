import { beforeEach, afterEach } from 'vitest'

beforeEach(() => {
    if (typeof window !== 'undefined') {
        try {
            window.sessionStorage?.clear()
            window.localStorage?.clear()
        } catch {
            // ignore
        }
    }
})

afterEach(() => {
    if (typeof window !== 'undefined') {
        try {
            window.sessionStorage?.clear()
            window.localStorage?.clear()
        } catch {
            // ignore
        }
    }
})
