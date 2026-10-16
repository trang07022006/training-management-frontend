// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { getApiOrigin } from './apiConfig'

describe('getApiOrigin utility', () => {
    const originalEnv = { ...import.meta.env }

    afterEach(() => {
        // Reset import.meta.env
        Object.assign(import.meta.env, originalEnv)
        delete (import.meta.env as Record<string, unknown>).VITE_API_ORIGIN
        delete (import.meta.env as Record<string, unknown>).VITE_API_BASE_URL
    })

    it('returns window.location.origin when no environment variable is set (port 5173)', () => {
        expect(getApiOrigin()).toBe(window.location.origin)
    })

    it('returns configured VITE_API_ORIGIN when specified', () => {
        ;(import.meta.env as Record<string, unknown>).VITE_API_ORIGIN = 'https://api.daotao.edu.vn'
        expect(getApiOrigin()).toBe('https://api.daotao.edu.vn')
    })

    it('returns configured VITE_API_BASE_URL as fallback when VITE_API_ORIGIN is absent', () => {
        ;(import.meta.env as Record<string, unknown>).VITE_API_BASE_URL = 'https://api-base.daotao.edu.vn'
        expect(getApiOrigin()).toBe('https://api-base.daotao.edu.vn')
    })
})
