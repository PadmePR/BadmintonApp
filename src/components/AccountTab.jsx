import { useState, useEffect } from 'react'
import { api } from '../lib/api.js'
import { supabase } from '../lib/supabase.js'

const SKILL_LABELS = {
  1: 'Beginner', 2: 'Beginner', 3: 'Beginner',
  4: 'Average', 5: 'Average', 6: 'Average',
  7: 'Good', 8: 'Good',
  9: 'Pro', 10: 'Expert'
}

function SkillPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          className="skill-btn"
          onClick={() => onChange(Math.max(1, (value || 5) - 1))}
          disabled={value <= 1}
        >−</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{value || '—'}</span>
          {value && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
              {SKILL_LABELS[value]}
            </span>
          )}
        </div>
        <button
          className="skill-btn"
          onClick={() => onChange(Math.min(10, (value || 5) + 1))}
          disabled={value >= 10}
        >+</button>
      </div>
      {/* Visual bar */}
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            onClick={() => onChange(i + 1)}
            style={{
              flex: 1, height: 6, borderRadius: 3, cursor: 'pointer',
              background: value && i < value ? 'var(--accent)' : 'var(--bg-tertiary)',
              transition: 'background 0.15s',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)' }}>
        <span>1 Beginner</span><span>5 Average</span><span>10 Expert</span>
      </div>
    </div>
  )
}

export default function AccountTab({ profile: initialProfile, onProfileUpdated, onDeleted, onLogout }) {
  const [profile, setProfile] = useState(initialProfile)
  const [username, setUsername] = useState(initialProfile?.username || '')
  const [skillLevel, setSkillLevel] = useState(initialProfile?.skill_level || 5)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [msg, setMsg] = useState({ text: '', error: false })
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Sync if profile loaded after mount
  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile)
      setUsername(initialProfile.username || '')
      setSkillLevel(initialProfile.skill_level || 5)
    }
  }, [initialProfile])

  function notify(text, error = false) {
    setMsg({ text, error })
    setTimeout(() => setMsg({ text: '', error: false }), 4000)
  }

  async function saveProfile() {
    if (!username.trim()) return notify('Display name cannot be empty.', true)
    setLoading(true)
    try {
      const updated = await api.updateAccount({
        username: username.trim(),
        skill_level: skillLevel,
      })
      setProfile(updated)
      onProfileUpdated(updated)
      notify('Profile saved.')
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
      notify('Password changed successfully.')
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

  return (
    <div>

      {/* Profile card */}
      <div className="card">
        <div className="card-title">Profile</div>
        {profile?.email && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
            Signed in as <strong style={{ color: 'var(--text)' }}>{profile.email}</strong>
          </div>
        )}

        <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
          Display name
        </label>
        <input
          style={{
            width: '100%', padding: '11px 12px', marginBottom: 20,
            border: '1px solid var(--border-medium)', borderRadius: 'var(--radius)',
            fontSize: 15, background: 'var(--bg)', color: 'var(--text)',
            fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
          }}
          placeholder="Your display name"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveProfile()}
          maxLength={50}
        />

        {/* Skill level — stored for future team generation use */}
        <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>
          My skill level
          <span style={{
            marginLeft: 8, fontSize: 11, color: 'var(--text-tertiary)',
            background: 'var(--bg-tertiary)', padding: '2px 7px', borderRadius: 10,
          }}>
            used in team generation
          </span>
        </label>
        <SkillPicker value={skillLevel} onChange={setSkillLevel} />

        <button
          className="btn-primary"
          style={{ marginTop: 18, width: '100%' }}
          onClick={saveProfile}
          disabled={loading}
        >
          {loading ? 'Saving…' : 'Save profile'}
        </button>
      </div>

      {/* Password card */}
      <div className="card">
        <div className="card-title">Change password</div>
        <input
          className="login-input" type="password"
          placeholder="New password (min 6 characters)"
          value={newPassword} onChange={e => setNewPassword(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        <input
          className="login-input" type="password"
          placeholder="Confirm new password"
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
          padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 16,
          background: msg.error ? '#FCEBEB' : '#EAF3DE',
          color: msg.error ? '#A32D2D' : '#27500A',
          border: `1px solid ${msg.error ? '#F09595' : '#97C459'}`,
        }}>
          {msg.text}
        </div>
      )}

      {/* Logout */}
      <div className="card">
        <div className="card-title">Session</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Sign out of your account on this device.
        </p>
        <button className="btn-secondary" onClick={onLogout} style={{ width: '100%' }}>
          Log out
        </button>
      </div>

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
