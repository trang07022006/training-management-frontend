import { Navigate, useMatch } from 'react-router'

import { useSession } from './SessionProvider'

export function SessionRedirect() {
    const { hasSession, endReason, isLoading } = useSession()
    const isHomePage = useMatch('/') !== null
    const isAboutPage = useMatch('/about') !== null
    const isProgramsPage = useMatch('/programs') !== null
    const isProgramDetailPage = useMatch('/programs/:id') !== null
    const isAdmissionsPage = useMatch('/admissions') !== null
    const isConsultationPage = useMatch('/consultation') !== null
    const isContactPage = useMatch('/contact') !== null
    const isLoginPage = useMatch('/login') !== null
    const isForgotPasswordPage = useMatch('/forgot-password') !== null
    const isResetPasswordPage = useMatch('/reset-password') !== null
    const matchUnauthorized = useMatch('/unauthorized')
    const match401 = useMatch('/401')
    const isUnauthorizedPage = matchUnauthorized !== null || match401 !== null

    const isPublicPage =
        isHomePage ||
        isAboutPage ||
        isProgramsPage ||
        isProgramDetailPage ||
        isAdmissionsPage ||
        isConsultationPage ||
        isContactPage ||
        isLoginPage ||
        isForgotPasswordPage ||
        isResetPasswordPage ||
        isUnauthorizedPage

    if (isLoading || hasSession || endReason === null || isPublicPage) {
        return null
    }

    return <Navigate to="/login" replace />
}