import { useState } from 'react'
import { api } from '../lib/api.js'
import PlayerRow from './PlayerRow.jsx'

export default function PlayersTab({ players, setPlayers, onGenerate }) {
  const [name, setName] = useState('')
  const [skill, setSkill] = useState(5)
  const [adding, setAdding] = useState(false)

  const playing = players.filter(p => !p.absent)
  const absent = players.filter(p => p.absent)
  const courts = playing.length >= 4 ? Math.floor(playing.length / 4) : null
  const avg = playing.length ? (playing.reduce((s, p) => s + p.skill, 0) / playing.length).toFixed(1) : '—'

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

  async function changeSkill(id, delta) {
    const p = players.find(x => x.id === id)
    if (!p) return
    const newSkill = Math.max(1, Math.min(10, p.skill + delta))
    try {
      const updated = await api.updatePlayer({ id, skill: newSkill })
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

      {/* Add player */}
      <div className="card">
        <div className="card-title">Add player</div>
        <div className="add-row">
          <input
            type="text" placeholder="Player name" maxLength={24}
            value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPlayer()}
          />
          <select value={skill} onChange={e => setSkill(Number(e.target.value))}>
            <option value={1}>1 — Beginner</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4 — Average</option>
            <option value={5}>5</option>
            <option value={6}>6</option>
            <option value={7}>7 — Good</option>
            <option value={8}>8</option>
            <option value={9}>9 — Pro</option>
            <option value={10}>10 — Expert</option>
          </select>
          <button className="btn-primary" onClick={addPlayer} disabled={adding}>
            {adding ? '…' : '+ Add'}
          </button>
        </div>
      </div>

      {/* Playing list */}
      <div className="section-header">
        <span className="section-label">Playing today</span>
        <span className={`section-count${playing.length ? ' active' : ''}`}>{playing.length}</span>
      </div>
      {playing.length === 0
        ? <div className="empty-state">No active players yet.</div>
        : playing.map((p, i) => (
            <PlayerRow key={p.id} player={p} index={players.indexOf(p)}
              onChangeSkill={changeSkill} onToggleAbsent={toggleAbsent} onRemove={removePlayer} />
          ))
      }

      {/* Generate button */}
      <div style={{ margin: '20px 0 4px' }}>
        <button
          style={{
            width: '100%', padding: 14, background: 'var(--accent)', color: 'white',
            border: 'none', borderRadius: 'var(--radius)', fontSize: 16, fontWeight: 600,
            cursor: playing.length >= 4 ? 'pointer' : 'default',
            opacity: playing.length >= 4 ? 1 : 0.35,
          }}
          onClick={() => playing.length >= 4 && onGenerate()}
        >
          Generate matches
        </button>
        {playing.length < 4 && (
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
            Add at least 4 playing players to generate
          </div>
        )}
      </div>

      {/* Absent list */}
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
