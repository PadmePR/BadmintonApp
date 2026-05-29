import { useState, useEffect } from 'react'
import { api } from '../lib/api.js'
import { supabase } from '../lib/supabase.js'

export default function AccountTab({ onDeleted }) {
  const [account, setAccount] = useState(null)
  const [username, setUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [msg, setMsg] = useState({ text: '', error: false })
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.getAccount().then(data => {
      setAccount(data)
      setUsername(data.username || '')
    }).catch(console.error)
  }, [])

  function notify(text, error = false) {
    setMsg({ text, error })
    setTimeout(() => setMsg({ text: '', error: false }), 4000)
  }

  async function saveUsername() {
    if (!username.trim()) return notify('Username cannot be empty.', true)
    setLoading(true)
    try {
      const updated = await api.updateAccount({ username: username.trim() })
      setAccount(prev => ({ ...prev, username: updated.username }))
      notify('Username updated.')
    } catch (e) { notify(e.message, true) }
    setLoading(false)
  }

  async function changePassword() {
    if (!newPassword) return notify('Enter a new password.', true)
    if (newPassword.length < 6) return notify('Password must be at least 6 characters.', true)
    if (newPassword !== confirmPassword) return notify('Passwords do not match.', true)
    setLoading(true)
    try {
      await api.updateAccount({ password: newPassword })
      setNewPassword(''); setConfirmPassword('')
      notify('Password changed.')
    } catch (e) { notify(e.message, true) }
    setLoading(false)
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      'This will permanently delete your account and ALL your players and match data. This cannot be undone. Are you sure?'
    )
    if (!confirmed) return
    const doubleCheck = window.prompt('Type DELETE to confirm:')
    if (doubleCheck !== 'DELETE') return notify('Account deletion cancelled.', true)

    setDeleting(true)
    try {
      await api.deleteAccount()
      await supabase.auth.signOut()
      onDeleted()
    } catch (e) { notify(e.message, true); setDeleting(false) }
  }

  if (!account) return <div style={{ padding: 20, color: 'var(--text-secondary)' }}>Loading…</div>

  return (
    <div>
      {/* Profile */}
      <div className="card">
        <div className="card-title">Profile</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Signed in as <strong style={{ color: 'var(--text)' }}>{account.email}</strong>
        </div>
        <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
          Display name
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="count-input" style={{ flex: 1, width: 'auto', textAlign: 'left' }}
            placeholder="Your name" value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveUsername()}
            maxLength={32}
          />
          <button className="btn-primary" onClick={saveUsername} disabled={loading}>
            Save
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="card">
        <div className="card-title">Change password</div>
        <input
          className="login-input" type="password" placeholder="New password (min 6 characters)"
          value={newPassword} onChange={e => setNewPassword(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        <input
          className="login-input" type="password" placeholder="Confirm new password"
          value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && changePassword()}
          style={{ marginBottom: 12 }}
        />
        <button className="btn-primary" onClick={changePassword} disabled={loading}>
          Change password
        </button>
      </div>

      {/* Status message */}
      {msg.text && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 13,
          marginBottom: 16,
          background: msg.error ? '#FCEBEB' : '#EAF3DE',
          color: msg.error ? '#A32D2D' : '#27500A',
          border: `1px solid ${msg.error ? '#F09595' : '#97C459'}`,
        }}>
          {msg.text}
        </div>
      )}

      {/* Danger zone */}
      <div className="card" style={{ borderColor: '#F09595' }}>
        <div className="card-title" style={{ color: '#A32D2D' }}>Danger zone</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Permanently delete your account and all data. This cannot be undone.
        </p>
        <button className="btn-danger" onClick={deleteAccount} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete my account'}
        </button>
      </div>
    </div>
  )
}
