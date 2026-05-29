import { shuffle, pairKey, matchKey } from './utils.js'

function getPC(partnerCounts, a, b) {
  return (partnerCounts[a.id] && partnerCounts[a.id][b.id]) || 0
}
function getOC(opponentCounts, a, b) {
  return (opponentCounts[a.id] && opponentCounts[a.id][b.id]) || 0
}
function getCC(partnerCounts, opponentCounts, a, b) {
  return getPC(partnerCounts, a, b) + getOC(opponentCounts, a, b)
}

function recordMatch(state, t1, t2) {
  const { partnerCounts, opponentCounts, matchHistory } = state
  function lp(a, b) {
    if (!partnerCounts[a.id]) partnerCounts[a.id] = {}
    if (!partnerCounts[b.id]) partnerCounts[b.id] = {}
    partnerCounts[a.id][b.id] = (partnerCounts[a.id][b.id] || 0) + 1
    partnerCounts[b.id][a.id] = (partnerCounts[b.id][a.id] || 0) + 1
  }
  function lo(a, b) {
    if (!opponentCounts[a.id]) opponentCounts[a.id] = {}
    if (!opponentCounts[b.id]) opponentCounts[b.id] = {}
    opponentCounts[a.id][b.id] = (opponentCounts[a.id][b.id] || 0) + 1
    opponentCounts[b.id][a.id] = (opponentCounts[b.id][a.id] || 0) + 1
  }
  lp(t1[0], t1[1]); lp(t2[0], t2[1])
  lo(t1[0], t2[0]); lo(t1[0], t2[1])
  lo(t1[1], t2[0]); lo(t1[1], t2[1])
  matchHistory[matchKey(t1, t2)] = (matchHistory[matchKey(t1, t2)] || 0) + 1
}

function scoreMatch(state, t1, t2, top2, bot2, relax) {
  const { partnerCounts, opponentCounts, lastPartnerKeys, matchHistory } = state
  if (top2[t1[0].id] && top2[t1[1].id]) return Infinity
  if (top2[t2[0].id] && top2[t2[1].id]) return Infinity
  if (bot2[t1[0].id] && bot2[t1[1].id]) return Infinity
  if (bot2[t2[0].id] && bot2[t2[1].id]) return Infinity
  if (relax < 1) {
    if (lastPartnerKeys[pairKey(t1[0], t1[1])]) return Infinity
    if (lastPartnerKeys[pairKey(t2[0], t2[1])]) return Infinity
  }
  if (relax < 2) {
    if (getPC(partnerCounts, t1[0], t1[1]) >= 2) return Infinity
    if (getPC(partnerCounts, t2[0], t2[1]) >= 2) return Infinity
  }
  if (relax < 3) {
    if ((matchHistory[matchKey(t1, t2)] || 0) > 0) return Infinity
  }
  if (relax >= 4) {
    return Math.abs((t1[0].skill + t1[1].skill) - (t2[0].skill + t2[1].skill))
  }
  const sd = Math.abs((t1[0].skill + t1[1].skill) - (t2[0].skill + t2[1].skill))
  let contactScore = 0
  const all4 = [t1[0], t1[1], t2[0], t2[1]]
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const cc = getCC(partnerCounts, opponentCounts, all4[i], all4[j])
      contactScore += cc === 0 ? -15 : cc
    }
  }
  return sd * 10 +
    (getPC(partnerCounts, t1[0], t1[1]) + getPC(partnerCounts, t2[0], t2[1])) * 8 +
    (getOC(opponentCounts, t1[0], t2[0]) + getOC(opponentCounts, t1[0], t2[1]) +
     getOC(opponentCounts, t1[1], t2[0]) + getOC(opponentCounts, t1[1], t2[1])) +
    contactScore + (matchHistory[matchKey(t1, t2)] || 0) * 20
}

function scoreCourt(state, group, top2, bot2, relax) {
  const combos = [
    [[group[0], group[1]], [group[2], group[3]]],
    [[group[0], group[2]], [group[1], group[3]]],
    [[group[0], group[3]], [group[1], group[2]]],
  ]
  let best = null, bestSc = Infinity
  for (const combo of combos) {
    const sc = scoreMatch(state, combo[0], combo[1], top2, bot2, relax)
    if (sc < bestSc) { bestSc = sc; best = combo }
  }
  return { pair: best, score: bestSc }
}

function avgSkill(group) { return group.reduce((s, p) => s + p.skill, 0) / group.length }

function combinations(arr, k) {
  const result = []
  function pick(start, chosen) {
    if (chosen.length === k) { result.push(chosen.slice()); return }
    for (let i = start; i < arr.length; i++) {
      chosen.push(arr[i]); pick(i + 1, chosen); chosen.pop()
    }
  }
  pick(0, [])
  return result
}

function searchCourts2(state, pool, top2, bot2, relax, highIds) {
  const c4 = combinations(pool, 4)
  let bestTotal = Infinity, bestResult = null
  for (const g1 of c4) {
    if (highIds && !g1.every(p => highIds[p.id])) continue
    const g1map = {}; g1.forEach(p => g1map[p.id] = true)
    const g2 = pool.filter(p => !g1map[p.id])
    const r1 = scoreCourt(state, g1, top2, bot2, relax)
    const r2 = scoreCourt(state, g2, top2, bot2, relax)
    if (!r1.pair || !r2.pair || r1.score === Infinity || r2.score === Infinity) continue
    const tier = Math.max(0, avgSkill(g2) - avgSkill(g1)) * 5
    const tot = r1.score + r2.score + tier
    if (tot < bestTotal) { bestTotal = tot; bestResult = [r1.pair, r2.pair] }
  }
  return bestResult
}

function searchCourts3(state, pool, top2, bot2, relax, highIds) {
  const c4a = combinations(pool, 4)
  let bestTotal = Infinity, bestResult = null
  for (const g1 of c4a) {
    if (highIds && !g1.every(p => highIds[p.id])) continue
    const g1map = {}; g1.forEach(p => g1map[p.id] = true)
    const rest = pool.filter(p => !g1map[p.id])
    const c4b = combinations(rest, 4)
    for (const g2 of c4b) {
      const g2map = {}; g2.forEach(p => g2map[p.id] = true)
      const g3 = rest.filter(p => !g2map[p.id])
      const r1 = scoreCourt(state, g1, top2, bot2, relax)
      const r2 = scoreCourt(state, g2, top2, bot2, relax)
      const r3 = scoreCourt(state, g3, top2, bot2, relax)
      if (!r1.pair || !r2.pair || !r3.pair ||
          r1.score === Infinity || r2.score === Infinity || r3.score === Infinity) continue
      const tier = Math.max(0, avgSkill(g2) - avgSkill(g1)) * 5 +
                   Math.max(0, avgSkill(g3) - avgSkill(g2)) * 5
      const tot = r1.score + r2.score + r3.score + tier
      if (tot < bestTotal) { bestTotal = tot; bestResult = [r1.pair, r2.pair, r3.pair] }
    }
  }
  return bestResult
}

function assignCourts(state, active, courts, top2, bot2, allAvgSkill, forceHighCourt) {
  const sorted = active.slice().sort((a, b) => b.skill - a.skill)
  const maxOff = Math.max(courts * 2, 1)
  const off = state.courtOffset % maxOff
  state.courtOffset++
  let pool = sorted.slice(off).concat(sorted.slice(0, off))
  pool = pool.slice(0, courts * 4)

  let highIds = null
  if (forceHighCourt && courts >= 2) {
    const highPlayers = pool.filter(p => p.skill > allAvgSkill)
    if (highPlayers.length >= 4) {
      highIds = {}
      highPlayers.slice(0, 4).forEach(p => highIds[p.id] = true)
    }
  }

  for (let relax = 0; relax <= 4; relax++) {
    let result = null
    if (courts === 1) {
      const r = scoreCourt(state, pool, top2, bot2, relax)
      if (r.pair && r.score < Infinity) result = [r.pair]
    } else if (courts === 2) {
      if (highIds) result = searchCourts2(state, pool, top2, bot2, relax, highIds)
      if (!result) result = searchCourts2(state, pool, top2, bot2, relax, null)
    } else if (courts === 3) {
      if (highIds) result = searchCourts3(state, pool, top2, bot2, relax, highIds)
      if (!result) result = searchCourts3(state, pool, top2, bot2, relax, null)
    }
    if (result) return result
  }

  const fb = []
  for (let c = 0; c < courts; c++) {
    const g = pool.slice(c * 4, c * 4 + 4)
    fb.push([[g[0], g[1]], [g[2], g[3]]])
  }
  return fb
}

export function generateRounds(players, numRounds) {
  const pp = players.filter(p => !p.absent)
  if (pp.length < 4) return null

  const courts = Math.floor(pp.length / 4)
  const sittingCount = pp.length - courts * 4

  const state = {
    partnerCounts: {}, opponentCounts: {}, lastPartnerKeys: {},
    matchHistory: {}, courtOffset: 0,
  }

  const ppSorted = pp.slice().sort((a, b) => b.skill - a.skill)
  const top2 = {}, bot2 = {}
  if (ppSorted.length >= 2) {
    top2[ppSorted[0].id] = true; top2[ppSorted[1].id] = true
    bot2[ppSorted[ppSorted.length - 1].id] = true
    bot2[ppSorted[ppSorted.length - 2].id] = true
  }
  const allAvgSkill = pp.reduce((s, p) => s + p.skill, 0) / pp.length

  // Pre-build sitting rotation
  let sitGroups = []
  if (sittingCount > 0) {
    let remaining = [], lastGroupIds = []
    while (sitGroups.length < numRounds) {
      if (remaining.length < sittingCount) {
        let newCycle = shuffle(pp.slice())
        lastGroupIds.forEach(id => {
          const idx = newCycle.findIndex(p => p.id === id)
          if (idx > -1) newCycle.push(newCycle.splice(idx, 1)[0])
        })
        remaining = remaining.concat(newCycle)
      }
      const group = remaining.splice(0, sittingCount)
      for (let gi = 0; gi < group.length; gi++) {
        if (lastGroupIds.indexOf(group[gi].id) >= 0) {
          for (let ri = 0; ri < remaining.length; ri++) {
            if (lastGroupIds.indexOf(remaining[ri].id) < 0) {
              ;[group[gi], remaining[ri]] = [remaining[ri], group[gi]]
              break
            }
          }
        }
      }
      lastGroupIds = group.map(p => p.id)
      sitGroups.push(group)
    }
  }

  const rounds = []
  for (let r = 0; r < numRounds; r++) {
    const sitting = sittingCount > 0 ? sitGroups[r] : []
    const sittingIds = sitting.map(p => p.id)
    const active = pp.filter(p => !sittingIds.includes(p.id))
    const forceHighCourt = r % 2 === 1
    const matches = assignCourts(state, active, courts, top2, bot2, allAvgSkill, forceHighCourt)

    const thisRoundKeys = {}
    matches.forEach(pair => {
      recordMatch(state, pair[0], pair[1])
      thisRoundKeys[pairKey(pair[0][0], pair[0][1])] = true
      thisRoundKeys[pairKey(pair[1][0], pair[1][1])] = true
    })
    state.lastPartnerKeys = thisRoundKeys

    rounds.push({ sitting, matches, courts })
  }

  return { rounds, courts, sittingCount, totalPlayers: pp.length }
}
