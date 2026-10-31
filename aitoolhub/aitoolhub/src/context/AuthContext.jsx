import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (user) => {
    if (!user) { setProfile(null); return }
    const { data } = await supabase.from('users').select('id,name,email,role,status,avatar_url').eq('id', user.id).single()
    if (data?.status === 'suspended') { await supabase.auth.signOut(); setProfile(null); return }
    setProfile(data)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); loadProfile(data.session?.user).finally(() => setLoading(false)) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); loadProfile(s?.user) })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const value = {
    session, profile, loading,
    isAdmin: profile?.role === 'admin',
    signUp: (email, password, name) => supabase.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: window.location.origin } }),
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signInWithGoogle: () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } } }),
    resendVerification: (email) => supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: window.location.origin } }),
    signOut: () => supabase.auth.signOut(),
    resetPassword: (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
