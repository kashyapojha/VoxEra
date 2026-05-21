import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { SIPProvider } from './context/SIPContext'
import Layout from './components/Layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Softphone from './pages/Softphone'
import Analytics from './pages/Analytics'
import Login from './pages/Login'
import Settings from './pages/Settings'

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <SIPProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout><Dashboard /></Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/softphone"
                element={
                  <ProtectedRoute>
                    <Layout><Softphone /></Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Layout><Analytics /></Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Layout><Settings /></Layout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SIPProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
