import { useState } from 'react'
import { api } from '../lib/api.js'
import PlayerRow from './PlayerRow.jsx'
import { sl } from '../lib/utils.js'

// ─── Tag lookup preview card ───────────────────────────────────────────────
function TagPreviewCard({ found, skillOverride, onSkillChange, onAdd, onCancel }) {
  const lab = sl(skillOverride)
  return (
    <div style={{
      border: '1px solid var(--accent)', borderRadius: 'var(--radius)',
      background: 'var(--accent-light)', padding: '14px 16px', marginTop: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%', background: 'var(--accent)',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}>
          {found.username ? found.username.slice(0, 2).toUpperCase() : '??'}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
            {found.username || '(no name set)'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>@{found.user_tag}</div>
        </div>
        <span className="skill-badge" style={{ marginLeft: 'auto', background: lab.bg, color: lab.fg }}>
          {lab.t}
        </span>
      </div>

      {/* Skill override — only affects this player list, not the user's account */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
          Skill for this session
          <span style={{
            marginLeft: 6, fontSize: 10, color: 'var(--text-tertiary)',
            background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: 8,
          }}>won't update their account</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 3, flex: 1 }}>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} onClick={() => onSkillChange(i + 1)} style={{
                flex: 1, height: 20, borderRadius: 4, cursor: 'pointer',
                background: i < skillOverride ? 'var(--accent)' : 'var(--bg-tertiary)',
                transition: 'background 0.12s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {i === skillOverride - 1 && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: i < skillOverride ? 'white' : 'var(--text-tertiary)' }}>
                    {skillOverride}
                  </span>
                )}
              </div>
            ))}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', minWidth: 20, textAlign: 'center' }}>
            {skillOverride}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={onAdd}>
          + Add to list
        </button>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Main PlayersTab ────────────────────────────────────────────────────────
export default function PlayersTab({ players, setPlayers, onGenerate }) {
  // Manual add
  const [name, setName]   = useState('')
  const [skill, setSkill] = useState(5)
  const [adding, setAdding] = useState(false)

  // Tag lookup
  const [tagInput, setTagInput]       = useState('')
  const [tagLooking, setTagLooking]   = useState(false)
  const [tagFound, setTagFound]       = useState(null)   // profile from API
  const [tagSkill, setTagSkill]       = useState(5)      // local override
  const [tagError, setTagError]       = useState('')
  const [addMode, setAddMode]         = useState('manual') // 'manual' | 'tag'

  const playing = players.filter(p => !p.absent)
  const absent  = players.filter(p => p.absent)
  const courts  = playing.length >= 4 ? Math.floor(playing.length / 4) : null
  const avg     = playing.length
    ? (playing.reduce((s, p) => s + p.skill, 0) / playing.length).toFixed(1) : '—'

  // ── Manual add ──
  async function addPlayer() {
    if (!name.trim()) return
    setAdding(true)
    try {
      const saved = await api.addPlayer({ name: name.trim(), skill, absent: false })
      setPlayers(prev => [...prev, saved])
      setName('')
    } catch (e) { alert(e.message) }
    setAdding(false)
  }

  // ── Tag lookup ──
  async function lookupTag() {
    const t = tagInput.trim().replace(/^@/, '').toLowerCase()
    if (!t) return
    setTagError(''); setTagFound(null); setTagLooking(true)
    try {
      const profile = await api.lookupByTag(t)
      setTagFound(profile)
      setTagSkill(profile.skill_level || 5)
    } catch (e) {
      setTagError(e.message.includes('No user') ? 'No user found with that tag.' : e.message)
    }
    setTagLooking(false)
  }

  // ── Add tag-found player to list ──
  async function addTagPlayer() {
    if (!tagFound) return
    setAdding(true)
    try {
      const saved = await api.addPlayer({
        name: tagFound.username || tagFound.user_tag,
        skill: tagSkill,
        absent: false,
      })
      setPlayers(prev => [...prev, saved])
      setTagInput(''); setTagFound(null); setTagError('')
    } catch (e) { alert(e.message) }
    setAdding(false)
  }

  // ── Skill / absent / remove ──
  async function changeSkill(id, delta) {
    const p = players.find(x => x.id === id)
    if (!p) return
    try {
      const updated = await api.updatePlayer({ id, skill: Math.max(1, Math.min(10, p.skill + delta)) })
      setPlayers(prev => prev.map(x => x.id === id ? updated : x))
    } catch (e) { alert(e.message) }
  }

  async function toggleAbsent(id) {
    const p = players.find(x => x.id === id)
    if (!p) return
    try {
      const updated = await api.updatePlayer({ id, absent: !p.absent })
      setPlayers(prev => prev.map(x => x.id === id ? updated : x))
    } catch (e) { alert(e.message) }
  }

  async function removePlayer(id) {
    try {
      await api.deletePlayer(id)
      setPlayers(prev => prev.filter(x => x.id !== id))
    } catch (e) { alert(e.message) }
  }

  return (
    <div>
      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-box"><div className="stat-val">{players.length}</div><div className="stat-lbl">Total</div></div>
        <div className="stat-box"><div className="stat-val">{playing.length}</div><div className="stat-lbl">Playing</div></div>
        <div className="stat-box"><div className="stat-val">{courts ?? '—'}</div><div className="stat-lbl">Courts</div></div>
        <div className="stat-box"><div className="stat-val">{avg}</div><div className="stat-lbl">Avg skill</div></div>
      </div>

      {/* Add player card */}
      <div className="card">
        <div className="card-title">Add player</div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 8, padding: 3, marginBottom: 14, gap: 3 }}>
          {['manual', 'tag'].map(m => (
            <button key={m} onClick={() => { setAddMode(m); setTagFound(null); setTagError('') }}
              style={{
                flex: 1, padding: '7px 0', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
                background: addMode === m ? 'var(--bg)' : 'transparent',
                color: addMode === m ? 'var(--text)' : 'var(--text-secondary)',
                boxShadow: addMode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}>
              {m === 'manual' ? '✏️ Enter manually' : '🔍 Find by user tag'}
            </button>
          ))}
        </div>

        {/* Manual add */}
        {addMode === 'manual' && (
          <div className="add-row">
            <input type="text" placeholder="Player name" maxLength={24}
              value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPlayer()} />
            <select value={skill} onChange={e => setSkill(Number(e.target.value))}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <option key={n} value={n}>{n} — {['','Beg','Beg','Beg','Avg','Avg','Avg','Good','Good','Pro','Exp'][n]}</option>
              ))}
            </select>
            <button className="btn-primary" onClick={addPlayer} disabled={adding}>
              {adding ? '…' : '+ Add'}
            </button>
          </div>
        )}

        {/* Tag lookup */}
        {addMode === 'tag' && (
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)', fontSize: 15, pointerEvents: 'none',
                }}>@</span>
                <input
                  style={{
                    width: '100%', padding: '11px 12px 11px 26px',
                    border: '1px solid var(--border-medium)', borderRadius: 'var(--radius)',
                    fontSize: 16, background: 'var(--bg)', color: 'var(--text)',
                    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                  }}
                  placeholder="user_tag"
                  value={tagInput}
                  onChange={e => { setTagInput(e.target.value.replace(/^@/, '')); setTagFound(null); setTagError('') }}
                  onKeyDown={e => e.key === 'Enter' && lookupTag()}
                  maxLength={20}
                />
              </div>
              <button className="btn-primary" onClick={lookupTag} disabled={tagLooking || !tagInput.trim()}>
                {tagLooking ? '…' : 'Search'}
              </button>
            </div>
            {tagError && (
              <div style={{ fontSize: 13, color: '#A32D2D', marginTop: 8 }}>{tagError}</div>
            )}
            {tagFound && (
              <TagPreviewCard
                found={tagFound}
                skillOverride={tagSkill}
                onSkillChange={setTagSkill}
                onAdd={addTagPlayer}
                onCancel={() => { setTagFound(null); setTagInput('') }}
              />
            )}
          </div>
        )}
      </div>

      {/* Playing list */}
      <div className="section-header">
        <span className="section-label">Playing today</span>
        <span className={`section-count${playing.length ? ' active' : ''}`}>{playing.length}</span>
      </div>
      {playing.length === 0
        ? <div className="empty-state">No active players yet.</div>
        : playing.map(p => (
            <PlayerRow key={p.id} player={p} index={players.indexOf(p)}
              onChangeSkill={changeSkill} onToggleAbsent={toggleAbsent} onRemove={removePlayer} />
          ))
      }

      {/* Generate button */}
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
            Add at least 4 playing players to generate
          </div>
        )}
      </div>

      {/* Absent */}
      {absent.length > 0 && (
        <div id="absent-section">
          <div className="section-divider" />
          <div className="section-header">
            <span className="section-label">Absent</span>
            <span className="section-count">{absent.length}</span>
          </div>
          {absent.map(p => (
            <PlayerRow key={p.id} player={p} index={players.indexOf(p)}
              onChangeSkill={changeSkill} onToggleAbsent={toggleAbsent} onRemove={removePlayer} />
          ))}
        </div>
      )}
    </div>
  )
}
