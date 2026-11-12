import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { cloudConfigured, supabase } from '../lib/supabase'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!cloudConfigured || !supabase) return <main className="setup"><section className="panel"><div className="mark">MM</div><h1>Mihra Mist ERP 2.0</h1><p>Cloud setup is required before staff can sign in.</p><p className="muted">Create your Supabase project, then add its URL and publishable key to the Netlify environment variables. No service-role key belongs in the browser.</p><span className="pill warn">Awaiting Supabase configuration</span></section></main>
  if (loading) return <main className="setup"><p>Connecting securely…</p></main>
  if (!session) return <main className="setup"><form className="panel login" onSubmit={async e => { e.preventDefault(); setError(''); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setError(error.message) }}><div className="mark">MM</div><h1>Mihra Mist ERP 2.0</h1><p>Staff sign in</p><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>{error && <p className="error">{error}</p>}<button className="primary">Sign in</button></form></main>
  return <>{children}</>
}