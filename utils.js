export const palette = [
  { bg: '#E6F1FB', fg: '#0C447C' }, { bg: '#EAF3DE', fg: '#27500A' },
  { bg: '#EEEDFE', fg: '#3C3489' }, { bg: '#FAEEDA', fg: '#633806' },
  { bg: '#FAECE7', fg: '#712B13' }, { bg: '#E1F5EE', fg: '#085041' },
  { bg: '#FBEAF0', fg: '#72243E' }, { bg: '#F1EFE8', fg: '#444441' },
  { bg: '#B5D4F4', fg: '#042C53' }, { bg: '#C0DD97', fg: '#173404' },
]

export function col(i) { return palette[i % palette.length] }

export function ini(n) {
  const p = n.trim().split(/\s+/)
  return p.length > 1 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : n.slice(0, 2).toUpperCase()
}

export function sl(s) {
  if (s <= 3) return { t: 'Beg', bg: '#EAF3DE', fg: '#27500A' }
  if (s <= 6) return { t: 'Avg', bg: '#FAEEDA', fg: '#633806' }
  if (s <= 8) return { t: 'Good', bg: '#E6F1FB', fg: '#0C447C' }
  if (s <= 9) return { t: 'Pro', bg: '#EEEDFE', fg: '#3C3489' }
  return { t: 'Exp', bg: '#EEEDFE', fg: '#3C3489' }
}

export function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pairKey(a, b) {
  return String(a.id) < String(b.id) ? `${a.id}-${b.id}` : `${b.id}-${a.id}`
}

export function matchKey(t1, t2) {
  let ta = [t1[0].id, t1[1].id].sort((a, b) => String(a).localeCompare(String(b)))
  let tb = [t2[0].id, t2[1].id].sort((a, b) => String(a).localeCompare(String(b)))
  if (String(ta[0]) > String(tb[0])) [ta, tb] = [tb, ta]
  return `${ta.join('-')}|${tb.join('-')}`
}
