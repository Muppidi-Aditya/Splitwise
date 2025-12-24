import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './Pages/HomePage'
import Login from './Pages/LoginPage'
import Register from './Pages/RegisterPage'
import GroupDetail from './Pages/GroupDetailPage'
import { isAuthenticated } from './services/api'

function App() {
  return (
      <main>
        <Routes>
          <Route 
            path="/login" 
            element={isAuthenticated() ? <Navigate to="/" replace /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={isAuthenticated() ? <Navigate to="/" replace /> : <Register />} 
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/groups/:groupId" 
            element={
              <ProtectedRoute>
                <GroupDetail />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
  )
}

export default App
