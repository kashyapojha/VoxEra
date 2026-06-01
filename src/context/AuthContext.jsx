import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token')
      const storedUser  = localStorage.getItem('user')
      
      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser))
          setIsAuthenticated(true)
          
          // Verify with backend
          const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${storedToken}` }
          })
          if (res.ok) {
            const verifiedUser = await res.json()
            setUser(verifiedUser)
            localStorage.setItem('user', JSON.stringify(verifiedUser))
          } else {
            // Token expired
            logout()
          }
        } catch (err) {
          console.warn('[AUTH] Cannot connect to server, using local session state', err)
        }
      }
      setIsLoading(false)
    }
    
    initAuth()
  }, [])

  const login = async (email, password) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password })
      })
      const data = await res.json()
      
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' }
      }
      
      setUser(data.user)
      setIsAuthenticated(true)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      return { success: true, user: data.user }
    } catch (error) {
      console.error('[AUTH] Login connection error:', error)
      return { success: false, error: 'Cannot connect to server. Try again.' }
    }
  }

  const signup = async (name, email, password, department) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, password, department })
      })
      const data = await res.json()
      
      if (!res.ok) {
        return { success: false, error: data.error || 'Signup failed' }
      }
      
      setUser(data.user)
      setIsAuthenticated(true)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      return { success: true, user: data.user }
    } catch (error) {
      console.error('[AUTH] Signup connection error:', error)
      return { success: false, error: 'Cannot connect to server. Try again.' }
    }
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
