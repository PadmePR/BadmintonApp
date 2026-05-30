import { useState } from 'react'
import { api } from '../../lib/api.js'
import { col, ini, sl } from '../../lib/utils.js'

// ── Three-dot dropdown menu ─────────────────────────────────────────────────
function RowMenu({ member, canManageAdmin, onRemove, onToggleAdmin, onClose }) {
  return (
    <>
      {/* Backdrop to close on outside click */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 99,
      }} />
      <div style={{
        position: 'absolute', right: 0, top: '110%', zIndex: 100,
        background: 'var(--bg)', border: '1px solid var(--border-medium)',
        borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        minWidth: 160, overflow: 'hidden',
      }}>
        {canManageAdmin && (
          <button onClick={onToggleAdmin} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '10px 14px', border: 'none',
            background: 'none', cursor: 'pointer', fontSize: 13,
            color: 'var(--text)', fontFamily: 'inherit', textAlign: 'left',
          }}>
            <span style={{ fontSize: 15 }}>{member.is_admin ? '🔽' : '🔼'}</span>
            {member.is_admin ? 'Remove admin' : 'Make admin'}
          </button>
        )}
        <button onClick={onRemove} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '10px 14px', border: 'none',
          background: 'none', cursor: 'pointer', fontSize: 13,
          color: '#A32D2D', fontFamily: 'inherit', textAlign: 'left',
          borderTop: canManageAdmin ? '1px solid var(--border)' : 'none',
        }}>
          <span style={{ fontSize: 15 }}>🗑️</span>
          Delete player
        </button>
      </div>
    </>
  )
}

// ── Member row ──────────────────────────────────────────────────────────────
function MemberRow({ member, index, isAdmin, isCreator, currentUserId, onUpdate, onRemove, onToggleAdmin }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const c = col(index)
  const lab = sl(member.skill)
  const isCurrentUser = member.user_id === currentUserId
  const canManageAdmin = isAdmin && member.user_id && !isCreator(member)
  const showMenu = isAdmin && !isCreator(member)

  return (
    <div className={`player-row${member.absent ? ' absent' : ''}`}
      style={{ position: 'relative' }}>
      <div className="avatar" style={{ background: c.bg, color: c.fg }}>{ini(member.name)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="player-name">{member.name}</span>
          {member.is_admin && (
            <span style={{
              fontSize: 10, fontWeight: 600, background: 'var(--accent-light)',
              color: 'var(--accent)', padding: '1px 6px', borderRadius: 8,
            }}>Admin</span>
          )}
          {isCurrentUser && (
            <span style={{
              fontSize: 10, color: 'var(--text-tertiary)',
              background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: 8,
            }}>You</span>
          )}
        </div>
        {member.user_id && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Has account</div>
        )}
      </div>

      {isAdmin && (
        <>
          <span className="skill-badge" style={{ background: lab.bg, color: lab.fg }}>{lab.t}</span>
          <div className="skill-editor">
            <span className="skill-num">{member.skill}</span>
            <div className="skill-arrows">
              <button className="skill-arrow-btn"
                onClick={() => onUpdate(member.id, { skill: member.skill + 1 })}
                disabled={member.skill >= 10}>
                <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
                  <path d="M1 6L5 2L9 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="skill-arrow-btn"
                onClick={() => onUpdate(member.id, { skill: member.skill - 1 })}
                disabled={member.skill <= 1}>
                <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
          {/* Absent / Playing toggle — arrows only */}
          {member.absent
            ? <button className="btn-toggle to-playing" onClick={() => onUpdate(member.id, { absent: false })}
                title="Mark as playing">↑</button>
            : <button className="btn-toggle to-absent" onClick={() => onUpdate(member.id, { absent: true })}
                title="Mark as absent">↓</button>
          }
        </>
      )}

      {/* Three-dot menu button */}
      {showMenu && (
        <button
          onClick={() => setMenuOpen(v => !v)}
          style={{
            width: 28, height: 28, borderRadius: 6,
            border: '1px solid var(--border-medium)',
            background: menuOpen ? 'var(--bg-secondary)' : 'none',
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 3,
            flexShrink: 0, padding: 0,
          }}
          title="More options"
        >
          {[0,1,2].map(i => (
            <span key={i} style={{
              width: 3.5, height: 3.5, borderRadius: '50%',
              background: 'var(--text-secondary)', display: 'block',
            }} />
          ))}
        </button>
      )}

      {/* Dropdown */}
      {showMenu && menuOpen && (
        <RowMenu
          member={member}
          canManageAdmin={canManageAdmin}
          onRemove={() => { setMenuOpen(false); onRemove(member.id) }}
          onToggleAdmin={() => { setMenuOpen(false); onToggleAdmin(member) }}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function TeamPlayersTab({ team, members, setMembers, isAdmin, currentUserId, onGenerate }) {
  const [addMode, setAddMode]     = useState('manual')
  const [name, setName]           = useState('')
  const [skill, setSkill]         = useState(5)
  const [tagInput, setTagInput]   = useState('')
  const [tagFound, setTagFound]   = useState(null)
  const [tagSkill, setTagSkill]   = useState(5)
  const [tagError, setTagError]   = useState('')
  const [tagLooking, setTagLooking] = useState(false)
  const [busy, setBusy]           = useState(false)

  const playing = members.filter(m => !m.absent)
  const absent  = members.filter(m => m.absent)
  const courts  = playing.length >= 4 ? Math.floor(playing.length / 4) : null
  const avg     = playing.length
    ? (playing.reduce((s, m) => s + (m.skill || 0), 0) / playing.length).toFixed(1) : '—'

  function isCreator(member) {
    return member.user_id === team.created_by
  }

  async function addManual() {
    if (!name.trim()) return
    setBusy(true)
    try {
      const saved = await api.addMember({ team_id: team.id, name: name.trim(), skill })
      setMembers(prev => [...prev, saved])
      setName('')
    } catch (e) { alert(e.message) }
    setBusy(false)
  }

  async function lookupTag() {
    const t = tagInput.trim().replace(/^@/, '').toLowerCase()
    if (!t) return
    setTagError(''); setTagFound(null); setTagLooking(true)
    try {
      const profile = await api.lookupByTag(t)
      // Check if already in team
      const alreadyIn = members.some(m => m.user_id && m.name === profile.username)
      setTagFound(profile)
      setTagSkill(profile.skill_level || 5)
      if (alreadyIn) setTagError('This player is already in the team.')
    } catch (e) {
      setTagError(e.message.includes('No user') ? 'No user found with that tag.' : e.message)
    }
    setTagLooking(false)
  }

  async function addTagPlayer() {
    if (!tagFound) return
    setBusy(true)
    try {
      const saved = await api.addMember({
        team_id: team.id,
        user_tag: tagFound.user_tag,
        skill: tagSkill,
      })
      setMembers(prev => [...prev, saved])
      setTagInput(''); setTagFound(null); setTagError('')
    } catch (e) { alert(e.message) }
    setBusy(false)
  }

  async function updateMember(id, updates) {
    try {
      const updated = await api.updateMember({ id, team_id: team.id, ...updates })
      setMembers(prev => prev.map(m => m.id === id ? updated : m))
    } catch (e) { alert(e.message) }
  }

  async function removeMember(id) {
    if (!confirm('Remove this player from the team?')) return
    try {
      await api.removeMember(id, team.id)
      setMembers(prev => prev.filter(m => m.id !== id))
    } catch (e) { alert(e.message) }
  }

  async function toggleAdmin(member) {
    const action = member.is_admin ? 'remove admin from' : 'make admin'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${member.name}?`)) return
    try {
      const updated = await api.updateMember({
        id: member.id, team_id: team.id, is_admin: !member.is_admin,
      })
      setMembers(prev => prev.map(m => m.id === member.id ? updated : m))
    } catch (e) { alert(e.message) }
  }

  return (
    <div>
      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-box"><div className="stat-val">{members.length}</div><div className="stat-lbl">Total</div></div>
        <div className="stat-box"><div className="stat-val">{playing.length}</div><div className="stat-lbl">Playing</div></div>
        <div className="stat-box"><div className="stat-val">{courts ?? '—'}</div><div className="stat-lbl">Courts</div></div>
        <div className="stat-box"><div className="stat-val">{isAdmin ? avg : '—'}</div><div className="stat-lbl">Avg skill</div></div>
      </div>

      {/* Add player — admin only */}
      {isAdmin && (
        <div className="card">
          <div className="card-title">Add player</div>
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 8, padding: 3, marginBottom: 14, gap: 3 }}>
            {['manual', 'tag'].map(m => (
              <button key={m} onClick={() => { setAddMode(m); setTagFound(null); setTagError('') }}
                style={{
                  flex: 1, padding: '7px 0', border: 'none', borderRadius: 6, fontSize: 13,
                  fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  background: addMode === m ? 'var(--bg)' : 'transparent',
                  color: addMode === m ? 'var(--text)' : 'var(--text-secondary)',
                  boxShadow: addMode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}>
                {m === 'manual' ? '✏️ Enter manually' : '🔍 Find by user tag'}
              </button>
            ))}
          </div>

          {addMode === 'manual' && (
            <div className="add-row">
              <input type="text" placeholder="Player name" maxLength={24}
                value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addManual()} />
              <select value={skill} onChange={e => setSkill(Number(e.target.value))}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <option key={n} value={n}>{n} — {['','Beg','Beg','Beg','Avg','Avg','Avg','Good','Good','Pro','Exp'][n]}</option>
                ))}
              </select>
              <button className="btn-primary" onClick={addManual} disabled={busy}>
                {busy ? '…' : '+ Add'}
              </button>
            </div>
          )}

          {addMode === 'tag' && (
            <div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)', fontSize: 15, pointerEvents: 'none',
                  }}>@</span>
                  <input style={{
                    width: '100%', padding: '11px 12px 11px 26px',
                    border: '1px solid var(--border-medium)', borderRadius: 'var(--radius)',
                    fontSize: 16, background: 'var(--bg)', color: 'var(--text)',
                    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                  }}
                    placeholder="user_tag" value={tagInput}
                    onChange={e => { setTagInput(e.target.value.replace(/^@/, '')); setTagFound(null); setTagError('') }}
                    onKeyDown={e => e.key === 'Enter' && lookupTag()} maxLength={20} />
                </div>
                <button className="btn-primary" onClick={lookupTag}
                  disabled={tagLooking || !tagInput.trim()}>
                  {tagLooking ? '…' : 'Search'}
                </button>
              </div>
              {tagError && <div style={{ fontSize: 13, color: '#A32D2D', marginTop: 8 }}>{tagError}</div>}
              {tagFound && !tagError && (
                <div style={{
                  border: '1px solid var(--accent)', borderRadius: 'var(--radius)',
                  background: 'var(--accent-light)', padding: 14, marginTop: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                    }}>{(tagFound.username || '??').slice(0, 2).toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{tagFound.username || '(no name)'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>@{tagFound.user_tag}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Skill for this team <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>(won't update their account)</span>
                  </div>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 12 }}>
                    {Array.from({ length: 10 }, (_, i) => (
                      <div key={i} onClick={() => setTagSkill(i + 1)} style={{
                        flex: 1, height: 20, borderRadius: 4, cursor: 'pointer',
                        background: i < tagSkill ? 'var(--accent)' : 'var(--bg-tertiary)',
                        transition: 'background 0.12s',
                      }} />
                    ))}
                    <span style={{ fontSize: 13, fontWeight: 700, marginLeft: 8, color: 'var(--text)' }}>{tagSkill}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" style={{ flex: 1 }} onClick={addTagPlayer} disabled={busy}>+ Add to team</button>
                    <button className="btn-secondary" onClick={() => { setTagFound(null); setTagInput('') }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Member role notice for non-admins */}
      {!isAdmin && (
        <div className="notice" style={{ display: 'block', marginBottom: 16 }}>
          You are a member of this team. Only admins can edit players or generate matches.
        </div>
      )}

      {/* Playing */}
      <div className="section-header">
        <span className="section-label">Playing today</span>
        <span className={`section-count${playing.length ? ' active' : ''}`}>{playing.length}</span>
      </div>
      {playing.length === 0
        ? <div className="empty-state">No active players.</div>
        : playing.map((m, i) => (
            <MemberRow key={m.id} member={m} index={i}
              isAdmin={isAdmin} isCreator={isCreator}
              currentUserId={currentUserId}
              onUpdate={updateMember} onRemove={removeMember} onToggleAdmin={toggleAdmin} />
          ))
      }

      {/* Generate button — admin only */}
      {isAdmin && (
        <div style={{ margin: '20px 0 4px' }}>
          <button onClick={() => playing.length >= 4 && onGenerate()} style={{
            width: '100%', padding: 14, background: 'var(--accent)', color: 'white',
            border: 'none', borderRadius: 'var(--radius)', fontSize: 16, fontWeight: 600,
            cursor: playing.length >= 4 ? 'pointer' : 'default',
            opacity: playing.length >= 4 ? 1 : 0.35, fontFamily: 'inherit',
          }}>
            Generate matches
          </button>
          {playing.length < 4 && (
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
              Need at least 4 playing players
            </div>
          )}
        </div>
      )}

      {/* Absent — visible to everyone, editable only by admins */}
      {absent.length > 0 && (
        <div>
          <div className="section-divider" />
          <div className="section-header">
            <span className="section-label">Absent</span>
            <span className="section-count">{absent.length}</span>
          </div>
          {absent.map((m, i) => (
            isAdmin ? (
              <MemberRow key={m.id} member={m} index={playing.length + i}
                isAdmin={isAdmin} isCreator={isCreator}
                currentUserId={currentUserId}
                onUpdate={updateMember} onRemove={removeMember} onToggleAdmin={toggleAdmin} />
            ) : (
              // Read-only absent row for members
              <div key={m.id} className="player-row absent">
                <div className="avatar" style={{ background: '#eeede9', color: '#999993' }}>
                  {m.name ? m.name.slice(0,2).toUpperCase() : '??'}
                </div>
                <span className="player-name">{m.name}</span>
                {m.user_id === currentUserId && (
                  <span style={{
                    fontSize: 11, color: 'var(--text-tertiary)',
                    background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 8,
                  }}>You</span>
                )}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}
