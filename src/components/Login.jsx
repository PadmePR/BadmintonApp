import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function login() {
    setLoading(true); setMsg('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setMsg(error.message)
    onLogin()
  }

  async function signup() {
    setLoading(true); setMsg('')
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) return setMsg(error.message)
    setMsg('Check your email to confirm your account.')
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="3" ry="4"/>
            <path d="M12 9l6 12H6L12 9z"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 18, marginBottom: 4 }}>Badminton Login</h2>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Sign in to sync your players & matches
        </div>
        <input className="login-input" placeholder="Email" type="email"
          value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()} />
        <input className="login-input" placeholder="Password" type="password"
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()} />
        <button className="btn-primary" style={{ width: '100%', marginBottom: 8 }}
          onClick={login} disabled={loading}>
          {loading ? 'Signing in…' : 'Login'}
        </button>
        <button className="btn-secondary" style={{ width: '100%' }}
          onClick={signup} disabled={loading}>
          Create account
        </button>
        {msg && <div className="login-msg">{msg}</div>}
      </div>
    </div>
  )
}
