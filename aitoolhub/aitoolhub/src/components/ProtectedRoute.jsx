import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// UI guard only. Real enforcement is Row Level Security in the database.
export default function ProtectedRoute({ children, admin = false }) {
  const { session, isAdmin, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <p className="p-8 text-[#5d6975]">Loading...</p>
  if (!session) return <Navigate to="/login" state={{ from: loc }} replace />
  if (admin && !isAdmin) return <p className="p-8">You need an admin account to view this page.</p>
  return children
}
