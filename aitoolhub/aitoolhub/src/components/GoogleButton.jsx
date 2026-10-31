import { useAuth } from '../context/AuthContext'

export default function GoogleButton({ label = 'Continue with Google', onError }) {
  const { signInWithGoogle } = useAuth()
  return (
    <button type="button" className="btn-alt" style={{ width: '100%' }} onClick={async () => { const { error } = await signInWithGoogle(); if (error) onError?.(error.message) }}>
      {label}
    </button>
  )
}
