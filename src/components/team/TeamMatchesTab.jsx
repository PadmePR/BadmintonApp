import { useState } from 'react'
import { api } from '../../lib/api.js'
import { generateRounds } from '../../lib/matchEngine.js'
import { col, ini, sl } from '../../lib/utils.js'
import { startPlaying } from '../../features/matchPlay/matchPlayApi.js'

function TeamCol({ team, allMembers }) {
  return (
    <div className="team-col">
      {team.map((p, i) => {
        const idx = allMembers.findIndex(x => x.id === p.id)
        const c = col(idx < 0 ? i : idx)
        return (
          <div className="team-player" key={p.id}>
            <div className="tp-avatar" style={{ background: c.bg, color: c.fg }}>
              {ini(p.name || '?')}
            </div>
            <div className="tp-name">{p.name}</div>
          </div>
        )
      })}
      <div className="team-footer">
        <span>Combined</span>
        <span className="team-total-val">
          {(team[0]?.skill || 0) + (team[1]?.skill || 0)}/20
        </span>
      </div>
    </div>
  )
}

function RoundBlock({ round, roundNum, matchNumStart, allMembers }) {
  if (!round || !Array.isArray(round.matches)) return null
  const sitting = round.sitting || []
  let matchNo = matchNumStart

  return (
    <div className="round-block">
      <div className="round-header">
        <span className="round-label">Round {roundNum}</span>
        <span className="round-courts-badge">
          {round.courts} court{round.courts > 1 ? 's' : ''}
        </span>
        {sitting.length > 0 && (
          <span className="round-sitting-badge">{sitting.length} sitting out</span>
        )}
        <div className="round-divider" />
      </div>

      <div className={`courts-grid courts-${Math.min(round.courts || 1, 3)}`}>
        {round.matches.map((match, ci) => {
          if (!Array.isArray(match) || match.length < 2) return null
          const t1 = Array.isArray(match[0]) ? match[0] : []
          const t2 = Array.isArray(match[1]) ? match[1] : []
          if (t1.length < 2 || t2.length < 2) return null

          const sum1 = (t1[0]?.skill || 0) + (t1[1]?.skill || 0)
          const sum2 = (t2[0]?.skill || 0) + (t2[1]?.skill || 0)
          const diff = Math.abs(sum1 - sum2)
          const bal  = Math.max(0, Math.round((1 - diff / 14) * 100))
          const tag  = diff === 0
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

      {sitting.length > 0 && (
        <div className="sitting-out">
          <span className="sitting-label">Sitting out:</span>
          <div className="sitting-players">
            {sitting.map((p, i) => {
              if (!p) return null
              const idx = allMembers.findIndex(x => x.id === p.id)
              const c   = col(idx < 0 ? i : idx)
              const lab = sl(p.skill || 5)
              return (
                <div className="sitting-chip" key={p.id || i}>
                  <div className="sitting-av" style={{ background: c.bg, color: c.fg }}>
                    {ini(p.name || '?')}
                  </div>
                  <span className="sitting-nm">
                    {p.name} <span style={{ color: lab.fg }}>{p.skill}</span>
                  </span>
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
  team, members, isAdmin, currentUserId,
  result, setResult, savedMeta, setSavedMeta,
  teamMatchesId, onStartPlay,
}) {
  const [roundsInput, setRoundsInput] = useState(
    savedMeta?.rounds ? String(savedMeta.rounds) : '4'
  )
  const [saving, setSaving]   = useState(false)
  const [genError, setGenError] = useState('')

  // Only non-absent members play
  const playing = members.filter(m => !m.absent)

  // Check if the current user is marked absent in this team
  const currentMember = members.find(m => m.user_id === currentUserId)
  const isCurrentUserAbsent = currentMember ? currentMember.absent : false

  function getParsedRounds() {
    const n = parseInt(roundsInput, 10)
    return isNaN(n) ? 4 : Math.max(1, Math.min(30, n))
  }

  async function generate() {
    setGenError('')
    const numRounds = getParsedRounds()
    setRoundsInput(String(numRounds))

    // Pass only playing (non-absent) members explicitly
    const res = generateRounds(playing, numRounds)
    if (!res) {
      setGenError('Not enough playing players — need at least 4.')
      return
    }

    setSaving(true)
    const meta = {
      date: new Date().toLocaleDateString(),
      players: res.totalPlayers,
      rounds: numRounds,
      courts: res.courts,
    }
    try {
      const serialisedRounds = res.rounds.map(round => ({
        courts: round.courts,
        sitting: (round.sitting || []).map(p => ({
          id: p.id, name: p.name, skill: p.skill,
        })),
        matches: (round.matches || []).map(([t1, t2]) => [
          t1.map(p => ({ id: p.id, name: p.name, skill: p.skill })),
          t2.map(p => ({ id: p.id, name: p.name, skill: p.skill })),
        ]),
      }))

      await api.saveTeamMatches(team.id, serialisedRounds, meta)

      setResult({
        rounds: serialisedRounds,
        courts: res.courts,
        sittingCount: res.sittingCount,
        totalPlayers: res.totalPlayers,
      })
      setSavedMeta(meta)
    } catch (e) {
      setGenError('Failed to save: ' + e.message)
    }
    setSaving(false)
  }

  async function clearMatches() {
    if (!confirm('Delete the match list for everyone in this team?')) return
    try {
      await api.deleteTeamMatches(team.id)
      setResult(null)
      setSavedMeta(null)
    } catch (e) { alert(e.message) }
  }

  async function handleStartPlaying() {
    if (!teamMatchesId) {
      console.error('teamMatchesId is missing:', teamMatchesId)
      return alert('No generated match plan found. Please generate matches first.')
    }
    try {
      // startPlaying will create a session and return it
      const session = await startPlaying(teamMatchesId)
      // notify parent (TeamView) to open play UI
      onStartPlay?.(session.id)
    } catch (err) {
      console.error('Failed to start playing', err)
      alert('Failed to start playing: ' + (err.message || err))
    }
  }

  // Global match numbering across all rounds
  let matchCounter = 1
  const safeRounds = Array.isArray(result?.rounds) ? result.rounds : []
  const matchStarts = safeRounds.map(r => {
    const s = matchCounter
    matchCounter += (r?.matches?.length || 0)
    return s
  })

  const courts = result?.courts ?? savedMeta?.courts ?? 1

  return (
    <div>
      {/* Absent user message — shown instead of matches */}
      {!isAdmin && isCurrentUserAbsent && (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          color: 'var(--text-secondary)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏸</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            You are not playing today
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Match results are only visible to players in today's session.
          </div>
        </div>
      )}

      {/* Member-only notice when no matches yet */}
      {!isAdmin && !isCurrentUserAbsent && !result && (
        <div className="notice" style={{ display: 'block' }}>
          Waiting for an admin to generate matches.
        </div>
      )}

      {/* Admin controls + match content — hidden from absent non-admin users */}
      {(isAdmin || !isCurrentUserAbsent) && (
      <div>
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
                <button className="btn-generate" onClick={handleStartPlaying} style={{ marginLeft: 8 }}>
                  Start Playing
                </button>
              </>
            )}
          </div>
          {playing.length < 4 && (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', width: '100%' }}>
              Need at least 4 playing players
            </div>
          )}
          {genError && (
            <div style={{ fontSize: 13, color: '#A32D2D', width: '100%' }}>{genError}</div>
          )}
        </div>
      )}

      {/* Info bar */}
      {result && (
        <div className="courts-info-bar" style={{ marginBottom: 12 }}>
          <span><strong>{courts}</strong> court{courts > 1 ? 's' : ''} at once</span>
          <span className="sep">·</span>
          <span><strong>{courts * 4}</strong> players per round</span>
          {(result.sittingCount || 0) > 0
            ? <><span className="sep">·</span>
                <span><strong>{result.sittingCount}</strong> sit out per round</span></>
            : <><span className="sep">·</span>
                <span>Everyone plays every round</span></>
          }
        </div>
      )}

      {/* Meta banner */}
      {savedMeta && (
        <div className="saved-banner">
          Generated on <strong>{savedMeta.date}</strong> &nbsp;·&nbsp;
          {savedMeta.players} players &nbsp;·&nbsp;
          {savedMeta.rounds} round{savedMeta.rounds !== 1 ? 's' : ''} &nbsp;·&nbsp;
          {savedMeta.courts} court{savedMeta.courts !== 1 ? 's' : ''}
        </div>
      )}

      {/* Round blocks */}
      {safeRounds.length > 0
        ? safeRounds.map((round, i) => (
            <RoundBlock
              key={i}
              round={round}
              roundNum={i + 1}
              matchNumStart={matchStarts[i]}
              allMembers={members}
            />
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
      )}
    </div>
  )
}
