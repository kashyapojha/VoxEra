import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/** Redirect authenticated users away from public pages (landing, login, signup). */
const GuestRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted">
          <span className="live-dot" />
          <span className="font-mono text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default GuestRoute
