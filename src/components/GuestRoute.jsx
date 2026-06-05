import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/** Redirect authenticated users away from public pages (landing, login, signup). */
const GuestRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default GuestRoute
