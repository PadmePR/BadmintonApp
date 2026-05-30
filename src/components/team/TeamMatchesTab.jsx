import { useState } from 'react'
import { api } from '../../lib/api.js'
import { generateRounds } from '../../lib/matchEngine.js'
import { col, ini, sl } from '../../lib/utils.js'

function TeamCol({ team, allMembers }) {
  return (
    <div className="team-col">
      {team.map((p, i) => {
        const idx = allMembers.findIndex(x => x.id === p.id)
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

function RoundBlock({ round, roundNum, matchNumStart, allMembers }) {
  let matchNo = matchNumStart
  return (
    <div className="round-block">
      <div className="round-header">
        <span className="round-label">Round {roundNum}</span>
        <span className="round-courts-badge">{round.courts} court{round.courts > 1 ? 's' : ''}</span>
        {round.sitting.length > 0 && (
          <span className="round-sitting-badge">{round.sitting.length} sitting out</span>
        )}
        <div className="round-divider" />
      </div>
      <div className={`courts-grid courts-${Math.min(round.courts, 3)}`}>
        {round.matches.map((match, ci) => {
          const [t1, t2] = match
          const diff = Math.abs((t1[0].skill + t1[1].skill) - (t2[0].skill + t2[1].skill))
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
                <span className="match-num">Match {mn} · Court {ci + 1}</span>{tag}
              </div>
              <div className="vs-row">
                <TeamCol team={t1} allMembers={allMembers} />
                <div className="vs-divider">vs</div>
                <TeamCol team={t2} allMembers={allMembers} />
              </div>
              <div className="balance-section">
                <div className="balance-bar">
                  <div className="balance-fill" style={{ width: `${bal}%` }} />
                </div>
                <div className="balance-labels">
                  <span>Balance</span>
                  <span className="balance-pct">{bal}%</span>
                </div>
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
              const idx = allMembers.findIndex(x => x.id === p.id)
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

export default function TeamMatchesTab({
  team, members, isAdmin,
  result, setResult, savedMeta, setSavedMeta,
}) {
  const [roundsInput, setRoundsInput] = useState(
    savedMeta?.rounds ? String(savedMeta.rounds) : '4'
  )
  const [saving, setSaving] = useState(false)

  const playing = members.filter(m => !m.absent)

  function getParsedRounds() {
    const n = parseInt(roundsInput, 10)
    return isNaN(n) ? 4 : Math.max(1, Math.min(30, n))
  }

  async function generate() {
    const rounds = getParsedRounds()
    setRoundsInput(String(rounds))
    const res = generateRounds(members, rounds)
    if (!res) return

    // Save the full result to DB so all members see it
    setSaving(true)
    const meta = {
      date: new Date().toLocaleDateString(),
      players: res.totalPlayers,
      rounds,
      courts: res.courts,
    }
    try {
      // Store rounds as plain serialisable data (member objects stripped to id/name/skill)
      const serialisedRounds = res.rounds.map(round => ({
        courts: round.courts,
        sitting: round.sitting.map(p => ({ id: p.id, name: p.name, skill: p.skill })),
        matches: round.matches.map(([t1, t2]) => [
          t1.map(p => ({ id: p.id, name: p.name, skill: p.skill })),
          t2.map(p => ({ id: p.id, name: p.name, skill: p.skill })),
        ]),
      }))
      await api.saveTeamMatches(team.id, serialisedRounds, meta)
      // Realtime will push to other users; update local state directly
      setResult({ ...res, rounds: serialisedRounds })
      setSavedMeta(meta)
    } catch (e) { alert('Failed to save matches: ' + e.message) }
    setSaving(false)
  }

  async function clearMatches() {
    if (!confirm('Delete the match list for everyone in this team?')) return
    try {
      await api.deleteTeamMatches(team.id)
      // Realtime will clear other users; clear local state too
      setResult(null)
      setSavedMeta(null)
    } catch (e) { alert(e.message) }
  }

  // Global match numbering
  let matchCounter = 1
  const matchStarts = result?.rounds?.map(r => {
    const s = matchCounter
    matchCounter += r.matches.length
    return s
  }) || []

  return (
    <div>
      {/* Member notice */}
      {!isAdmin && !result && (
        <div className="notice" style={{ display: 'block' }}>
          Waiting for an admin to generate matches.
        </div>
      )}

      {/* Admin controls */}
      {isAdmin && (
        <div className="gen-controls">
          <label>Rounds</label>
          <input
            type="number" className="count-input"
            value={roundsInput} min={1} max={30}
            onChange={e => setRoundsInput(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={() => setRoundsInput(String(getParsedRounds()))}
          />
          <div className="action-row">
            <button className="btn-primary" onClick={generate}
              disabled={playing.length < 4 || saving}>
              {saving ? 'Saving…' : result ? 'Regenerate' : 'Generate'}
            </button>
            {result && (
              <>
                <button className="btn-pdf" onClick={() => window.print()}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  </svg>
                  Save as PDF
                </button>
                <button className="btn-danger" onClick={clearMatches}>Delete list</button>
              </>
            )}
          </div>
          {playing.length < 4 && (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', width: '100%' }}>
              Need at least 4 playing players
            </div>
          )}
        </div>
      )}

      {/* Info bar */}
      {result && (
        <div className="courts-info-bar" style={{ marginBottom: 12 }}>
          <span><strong>{result.courts ?? savedMeta?.courts}</strong> court{(result.courts ?? savedMeta?.courts) > 1 ? 's' : ''} at once</span>
          <span className="sep">·</span>
          <span><strong>{(result.courts ?? savedMeta?.courts) * 4}</strong> players per round</span>
          {(result.sittingCount ?? 0) > 0
            ? <><span className="sep">·</span><span><strong>{result.sittingCount}</strong> sit out per round</span></>
            : <><span className="sep">·</span><span>Everyone plays every round</span></>
          }
        </div>
      )}

      {/* Saved meta banner */}
      {savedMeta && (
        <div className="saved-banner">
          Generated on <strong>{savedMeta.date}</strong> &nbsp;·&nbsp;
          {savedMeta.players} players &nbsp;·&nbsp;
          {savedMeta.rounds} round{savedMeta.rounds !== 1 ? 's' : ''} &nbsp;·&nbsp;
          {savedMeta.courts} court{savedMeta.courts !== 1 ? 's' : ''}
        </div>
      )}

      {/* Rounds */}
      {result?.rounds?.length > 0
        ? result.rounds.map((round, i) => (
            <RoundBlock key={i} round={round} roundNum={i + 1}
              matchNumStart={matchStarts[i]} allMembers={members} />
          ))
        : !savedMeta && (
            <div className="empty-state">
              {isAdmin
                ? 'No matches yet. Add players then Generate.'
                : 'No matches generated yet.'}
            </div>
          )
      }
    </div>
  )
}
