import { useState, useEffect } from 'react'
import { api } from '../lib/api.js'
import { generateRounds } from '../lib/matchEngine.js'
import { col, ini, sl } from '../lib/utils.js'

function TeamCol({ team, allPlayers }) {
  return (
    <div className="team-col">
      {team.map((p, i) => {
        const idx = allPlayers.findIndex(x => x.id === p.id)
        const c = col(idx < 0 ? i : idx)
        return (
          <div className="team-player" key={p.id}>
            <div className="tp-avatar" style={{ background: c.bg, color: c.fg }}>{ini(p.name)}</div>
            <div className="tp-name">{p.name}</div>
          </div>
        )
      })}
      <div className="team-footer">
        <span>Combined</span>
        <span className="team-total-val">{team[0].skill + team[1].skill}/20</span>
      </div>
    </div>
  )
}

function RoundBlock({ round, roundNum, matchNumStart, allPlayers }) {
  let matchNo = matchNumStart
  return (
    <div className="round-block">
      <div className="round-header">
        <span className="round-label">Round {roundNum}</span>
        <span className="round-courts-badge">{round.courts} court{round.courts > 1 ? 's' : ''} simultaneous</span>
        {round.sitting.length > 0 && (
          <span className="round-sitting-badge">{round.sitting.length} sitting out</span>
        )}
        <div className="round-divider" />
      </div>

      <div className={`courts-grid courts-${Math.min(round.courts, 3)}`}>
        {round.matches.map((match, ci) => {
          const [t1, t2] = match
          const sum1 = t1[0].skill + t1[1].skill
          const sum2 = t2[0].skill + t2[1].skill
          const diff = Math.abs(sum1 - sum2)
          const bal = Math.max(0, Math.round((1 - diff / 14) * 100))
          const tag = diff === 0
            ? <span className="tag tag-perfect">Balanced</span>
            : diff <= 1 ? <span className="tag tag-great">Near perfect</span>
            : diff <= 2 ? <span className="tag tag-ok">Close</span>
            : null
          const mn = matchNo++
          return (
            <div className="match-card" key={ci}>
              <div className="match-header">
                <span className="match-num">Match {mn} · Court {ci + 1}</span>
                {tag}
              </div>
              <div className="vs-row">
                <TeamCol team={t1} allPlayers={allPlayers} />
                <div className="vs-divider">vs</div>
                <TeamCol team={t2} allPlayers={allPlayers} />
              </div>
              <div className="balance-section">
                <div className="balance-bar"><div className="balance-fill" style={{ width: `${bal}%` }} /></div>
                <div className="balance-labels"><span>Balance</span><span className="balance-pct">{bal}%</span></div>
              </div>
            </div>
          )
        })}
      </div>

      {round.sitting.length > 0 && (
        <div className="sitting-out">
          <span className="sitting-label">Sitting out:</span>
          <div className="sitting-players">
            {round.sitting.map((p, i) => {
              const idx = allPlayers.findIndex(x => x.id === p.id)
              const c = col(idx < 0 ? i : idx)
              const lab = sl(p.skill)
              return (
                <div className="sitting-chip" key={p.id}>
                  <div className="sitting-av" style={{ background: c.bg, color: c.fg }}>{ini(p.name)}</div>
                  <span className="sitting-nm">{p.name} <span style={{ color: lab.fg }}>{p.skill}</span></span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MatchesTab({ players, initialMatch, onMatchSaved }) {
  const [numRounds, setNumRounds] = useState(4)
  const [result, setResult] = useState(null)
  const [savedMeta, setSavedMeta] = useState(initialMatch?.meta || null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initialMatch?.meta) setSavedMeta(initialMatch.meta)
  }, [initialMatch])

  const playing = players.filter(p => !p.absent)

  async function generate() {
    const res = generateRounds(players, numRounds)
    if (!res) return
    setResult(res)

    // Save to backend
    const meta = {
      date: new Date().toLocaleDateString(),
      players: res.totalPlayers,
      rounds: numRounds,
      courts: res.courts,
    }
    setSaving(true)
    try {
      await api.saveMatches('__react__', meta)
      setSavedMeta(meta)
      onMatchSaved(meta)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  async function clearMatches() {
    if (!confirm('Delete the saved match list?')) return
    try {
      await api.deleteMatches()
      setResult(null)
      setSavedMeta(null)
      onMatchSaved(null)
    } catch (e) { alert(e.message) }
  }

  function exportPDF() {
    window.print()
  }

  // Count match numbers globally
  let matchCounter = 1
  const matchStarts = result?.rounds.map(r => {
    const start = matchCounter
    matchCounter += r.matches.length
    return start
  }) || []

  return (
    <div>
      <div id="pdf-header" style={{ display: 'none', marginBottom: 30 }}>
        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          Badminton Matches{savedMeta ? ` — ${savedMeta.date}` : ''}
        </div>
        {savedMeta && (
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {savedMeta.players} players · {savedMeta.rounds} round{savedMeta.rounds > 1 ? 's' : ''} · {savedMeta.courts} court{savedMeta.courts > 1 ? 's' : ''} simultaneous
          </div>
        )}
      </div>

      {playing.length < 4 && (
        <div className="notice" style={{ display: 'block' }}>
          You need at least 4 playing players to generate matches.
        </div>
      )}

      <div className="gen-controls">
        <label htmlFor="match-count">Rounds</label>
        <input type="number" id="match-count" className="count-input"
          value={numRounds} min={1} max={30}
          onChange={e => setNumRounds(Math.max(1, Math.min(30, Number(e.target.value) || 4)))} />
        <div className="action-row">
          <button className="btn-primary" onClick={generate} disabled={playing.length < 4}>
            {result ? 'Reshuffle' : 'Generate'}
          </button>
          {result && (
            <>
              <button className="btn-pdf" onClick={exportPDF}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                </svg>
                Save as PDF
              </button>
              <button className="btn-danger" onClick={clearMatches}>Delete list</button>
            </>
          )}
        </div>
      </div>

      {result && (
        <div className="courts-info-bar" style={{ display: 'flex', marginBottom: 12 }}>
          <span><strong>{result.courts}</strong> court{result.courts > 1 ? 's' : ''} at once</span>
          <span className="sep">·</span>
          <span><strong>{result.courts * 4}</strong> players per round</span>
          {result.sittingCount > 0
            ? <><span className="sep">·</span><span><strong>{result.sittingCount}</strong> sit out per round</span></>
            : <><span className="sep">·</span><span>Everyone plays every round</span></>
          }
        </div>
      )}

      {savedMeta && !result && (
        <div className="saved-banner">
          Previous session saved on <strong>{savedMeta.date}</strong> &nbsp;·&nbsp;
          {savedMeta.players} players &nbsp;·&nbsp;
          {savedMeta.rounds} round{savedMeta.rounds > 1 ? 's' : ''} &nbsp;·&nbsp;
          {savedMeta.courts} court{savedMeta.courts > 1 ? 's' : ''}
          <br /><span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>Press Generate to create a new list.</span>
        </div>
      )}

      {result
        ? result.rounds.map((round, i) => (
            <RoundBlock key={i} round={round} roundNum={i + 1}
              matchNumStart={matchStarts[i]} allPlayers={players} />
          ))
        : !savedMeta && (
            <div className="empty-state">No match list yet. Add players, then tap Generate.</div>
          )
      }
    </div>
  )
}
