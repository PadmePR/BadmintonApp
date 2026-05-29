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
        <button className="skill-btn" onClick={() => onChangeSkill(player.id, -1)}>−</button>
        <span className="skill-num">{player.skill}</span>
        <button className="skill-btn" onClick={() => onChangeSkill(player.id, 1)}>+</button>
      </div>
      {player.absent
        ? <button className="btn-toggle to-playing" onClick={() => onToggleAbsent(player.id)}>↑ Playing</button>
        : <button className="btn-toggle to-absent" onClick={() => onToggleAbsent(player.id)}>↓ Absent</button>
      }
      <button className="btn-remove" onClick={() => onRemove(player.id)}>×</button>
    </div>
  )
}
