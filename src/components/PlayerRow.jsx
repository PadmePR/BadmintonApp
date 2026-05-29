import { col, ini, sl } from '../lib/utils.js'

export default function PlayerRow({ player, index, onChangeSkill, onToggleAbsent, onRemove }) {
  const c = col(index)
  const lab = sl(player.skill)

  return (
    <div className={`player-row${player.absent ? ' absent' : ''}`}>
      <div className="avatar" style={{ background: c.bg, color: c.fg }}>
        {ini(player.name)}
      </div>
      <span className="player-name">{player.name}</span>
      <span className="skill-badge" style={{ background: lab.bg, color: lab.fg }}>{lab.t}</span>
      <div className="skill-editor">
        <span className="skill-num">{player.skill}</span>
        <div className="skill-arrows">
          <button className="skill-arrow-btn" onClick={() => onChangeSkill(player.id, 1)} aria-label="Increase skill">
            <svg width="10" height="7" viewBox="0 0 10 7" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 6L5 2L9 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="skill-arrow-btn" onClick={() => onChangeSkill(player.id, -1)} aria-label="Decrease skill">
            <svg width="10" height="7" viewBox="0 0 10 7" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      {player.absent
        ? <button className="btn-toggle to-playing" onClick={() => onToggleAbsent(player.id)}>↑ Playing</button>
        : <button className="btn-toggle to-absent" onClick={() => onToggleAbsent(player.id)}>↓ Absent</button>
      }
      <button className="btn-remove" onClick={() => onRemove(player.id)}>×</button>
    </div>
  )
}
