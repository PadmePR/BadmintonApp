import { useState, useEffect } from 'react'
import { api } from '../lib/api.js'
import { supabase } from '../lib/supabase.js'

const SKILL_LABELS = {
  1: 'Beginner', 2: 'Beginner', 3: 'Beginner',
  4: 'Average',  5: 'Average',  6: 'Average',
  7: 'Good',     8: 'Good',
  9: 'Pro',      10: 'Expert',
}

function SkillPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="skill-arrow-btn" style={{ width: 30, height: 30, borderRadius: 6 }}
          onClick={() => onChange(Math.max(1, (value || 5) - 1))} disabled={value <= 1}>
          <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{value || '—'}</span>
          {value && <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>{SKILL_LABELS[value]}</span>}
        </div>
        <button className="skill-arrow-btn" style={{ width: 30, height: 30, borderRadius: 6 }}
          onClick={() => onChange(Math.min(10, (value || 5) + 1))} disabled={value >= 10}>
          <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
            <path d="M1 6L5 2L9 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} onClick={() => onChange(i + 1)} style={{
            flex: 1, height: 6, borderRadius: 3, cursor: 'pointer',
            background: value && i < value ? 'var(--accent)' : 'var(--bg-tertiary)',
            transition: 'background 0.15s',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)' }}>
        <span>1 Beginner</span><span>5 Average</span><span>10 Expert</span>
      </div>
    </div>
  )
}

export default function AccountTab({ profile: initialProfile, onProfileUpdated, onDeleted, onLogout }) {
  const [username, setUsername]       = useState(initialProfile?.username || '')
  const [skillLevel, setSkillLevel]   = useState(initialProfile?.skill_level || 5)
  const [userTag, setUserTag]         = useState(initialProfile?.user_tag || '')
  const [tagStatus, setTagStatus]     = useState(null) // null | 'checking' | 'available' | 'taken' | 'invalid'
  const [newPassword, setNewPassword] = useState('')
  const [confirmPw, setConfirmPw]     = useState('')
  const [msg, setMsg]                 = useState({ text: '', error: false })
  const [loading, setLoading]         = useState(false)
  const [deleting, setDeleting]       = useState(false)

  useEffect(() => {
    if (initialProfile) {
      setUsername(initialProfile.username || '')
      setSkillLevel(initialProfile.skill_level || 5)
      setUserTag(initialProfile.user_tag || '')
    }
  }, [initialProfile])

  function notify(text, error = false) {
    setMsg({ text, error })
    setTimeout(() => setMsg({ text: '', error: false }), 4000)
  }

  // Validate tag format client-side
  function tagFormatOk(t) { return /^[a-z0-9_]{3,20}$/.test(t) }

  function handleTagChange(e) {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUserTag(val)
    setTagStatus(null)
  }

  async function checkTagAvailability() {
    const t = userTag.trim()
    if (!t) { setTagStatus(null); return }
    if (!tagFormatOk(t)) { setTagStatus('invalid'); return }
    // If unchanged from saved, no need to check
    if (t === initialProfile?.user_tag) { setTagStatus('available'); return }
    setTagStatus('checking')
    try {
      await api.lookupByTag(t)
      // If lookup succeeds, tag is taken by someone else
      setTagStatus('taken')
    } catch (e) {
      // 404 = not found = available
      setTagStatus(e.message.includes('No user') ? 'available' : 'invalid')
    }
  }

  async function saveProfile() {
    if (!username.trim()) return notify('Display name cannot be empty.', true)
    const t = userTag.trim()
    if (t && !tagFormatOk(t)) return notify('Tag must be 3–20 chars: lowercase, numbers, underscores only.', true)
    if (tagStatus === 'taken') return notify('That user tag is already taken.', true)
    setLoading(true)
    try {
      // Always refresh token before API calls to avoid stale session errors
      await supabase.auth.refreshSession()
      const updated = await api.updateAccount({
        username: username.trim(),
        skill_level: skillLevel,
        user_tag: t || null,
      })
      onProfileUpdated(updated)
      notify('Profile saved.')
      if (t) setTagStatus('available')
    } catch (e) {
      notify(e.message, true)
      if (e.message.includes('taken')) setTagStatus('taken')
    }
    setLoading(false)
  }

  async function changePassword() {
    if (!newPassword) return notify('Enter a new password.', true)
    if (newPassword.length < 6) return notify('Password must be at least 6 characters.', true)
    if (newPassword !== confirmPw) return notify('Passwords do not match.', true)
    setLoading(true)
    try {
      // Refresh session to ensure token is current before sending to backend
      await supabase.auth.refreshSession()
      await api.updateAccount({ password: newPassword })
      setNewPassword(''); setConfirmPw('')
      // Changing password invalidates the session — refresh it again so the
      // user stays logged in without needing to sign in again
      await supabase.auth.refreshSession()
      notify('Password changed successfully.')
    } catch (e) { notify(e.message, true) }
    setLoading(false)
  }

  async function deleteAccount() {
    if (!window.confirm('This will permanently delete your account and ALL data. Are you sure?')) return
    if (window.prompt('Type DELETE to confirm:') !== 'DELETE') return notify('Cancelled.', true)
    setDeleting(true)
    try {
      await api.deleteAccount()
      await supabase.auth.signOut()
      onDeleted()
    } catch (e) { notify(e.message, true); setDeleting(false) }
  }

  const tagHint = {
    null:       null,
    checking:   { text: 'Checking…',  color: 'var(--text-tertiary)' },
    available:  { text: '✓ Available', color: '#27500A' },
    taken:      { text: '✗ Already taken', color: '#A32D2D' },
    invalid:    { text: '3–20 chars: a–z, 0–9, underscore only', color: '#A32D2D' },
  }[tagStatus]

  return (
    <div>
      {/* Profile */}
      <div className="card">
        <div className="card-title">Profile</div>
        {initialProfile?.email && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Signed in as <strong style={{ color: 'var(--text)' }}>{initialProfile.email}</strong>
          </div>
        )}

        <label className="field-label">Display name</label>
        <input className="field-input" placeholder="Your display name"
          value={username} onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveProfile()} maxLength={50} />

        <label className="field-label" style={{ marginTop: 16 }}>
          User tag
          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>
            others use this to find and add you as a player
          </span>
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)', fontSize: 15, pointerEvents: 'none', userSelect: 'none',
            }}>@</span>
            <input className="field-input" style={{ paddingLeft: 26 }}
              placeholder="your_tag" value={userTag}
              onChange={handleTagChange}
              onBlur={checkTagAvailability}
              maxLength={20} />
          </div>
        </div>
        {tagHint && (
          <div style={{ fontSize: 12, color: tagHint.color, marginTop: 4 }}>{tagHint.text}</div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
          Lowercase letters, numbers, underscores · 3–20 characters
        </div>

        <label className="field-label" style={{ marginTop: 20 }}>
          My skill level
          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>
            used in team generation
          </span>
        </label>
        <SkillPicker value={skillLevel} onChange={setSkillLevel} />

        <button className="btn-primary" style={{ marginTop: 18, width: '100%' }}
          onClick={saveProfile} disabled={loading || tagStatus === 'taken' || tagStatus === 'checking'}>
          {loading ? 'Saving…' : 'Save profile'}
        </button>
      </div>

      {/* Password */}
      <div className="card">
        <div className="card-title">Change password</div>
        <input className="login-input" type="password" placeholder="New password (min 6 characters)"
          value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ marginBottom: 10 }} />
        <input className="login-input" type="password" placeholder="Confirm new password"
          value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && changePassword()} style={{ marginBottom: 12 }} />
        <button className="btn-primary" onClick={changePassword} disabled={loading}>Change password</button>
      </div>

      {/* Status message */}
      {msg.text && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 16,
          background: msg.error ? '#FCEBEB' : '#EAF3DE',
          color: msg.error ? '#A32D2D' : '#27500A',
          border: `1px solid ${msg.error ? '#F09595' : '#97C459'}`,
        }}>{msg.text}</div>
      )}

      {/* Logout */}
      <div className="card">
        <div className="card-title">Session</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Sign out of your account on this device.
        </p>
        <button className="btn-secondary" onClick={onLogout} style={{ width: '100%' }}>Log out</button>
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
