import { useNavigate } from 'react-router'
import { UserImportTab } from '../components/UserImportTab'

export function UserImportPage() {
    const navigate = useNavigate()

    const handleBackToList = () => {
        navigate('/users')
    }

    return (
        <div style={{ padding: '24px 32px' }}>
            <UserImportTab
                onBackToList={handleBackToList}
                onSuccess={() => {
                    // Could remain on page or show notice
                }}
            />
        </div>
    )
}
export default UserImportPage
