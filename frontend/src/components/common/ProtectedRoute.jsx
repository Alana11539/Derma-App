import { Navigate } from 'react-router-dom'
import { isAuthenticated } from '../../services/authService'

// TODO: Replace mock authentication with real backend authentication.
// This component currently checks localStorage for a mock token.
// When the backend is ready, replace isAuthenticated() with a proper
// API call to validate the session token.
export default function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}
