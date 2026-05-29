import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase.js'
import { api } from './lib/api.js'
import Login from './components/Login.jsx'
import PlayersTab from './components/PlayersTab.jsx'
import MatchesTab from './components/MatchesTab.jsx'
import AccountTab from './components/AccountTab.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [tab, setTab] = useState('players')
  const [players, setPlayers] = useState([])
  const [savedMatch, setSavedMatch] = useState(null)

  // Check session on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadData()
      }
      setChecking(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadData() {
    try {
      const [p, m] = await Promise.all([api.getPlayers(), api.getMatches()])
      setPlayers(p || [])
      setSavedMatch(m || null)
    } catch (e) { console.error('Load error:', e) }
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null); setPlayers([]); setSavedMatch(null); setTab('players')
  }

  if (checking) return null
  if (!user) return <Login onLogin={() => { loadData(); setUser(true) }} />

  return (
    <div className="container" id="app">
      {/* Print header */}
      <div id="pdf-header-global" style={{ display: 'none' }} />

      <header>
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="3" ry="4"/>
            <path d="M12 9l6 12H6L12 9z"/>
          </svg>
        </div>
        <div>
          <h1>Badminton Team Generator</h1>
          <div className="sub">Balanced doubles · simultaneous courts · fair rotation</div>
        </div>
      </header>

      {/* Top actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn-secondary" onClick={() => setTab('account')}>⚙ Account</button>
        <button className="btn-secondary" onClick={logout}>Logout</button>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {['players', 'matches', 'account'].map((t, i) => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'players' ? 'Players' : t === 'matches' ? 'Matches' : 'Account'}
          </button>
        ))}
      </div>

      {tab === 'players' && (
        <PlayersTab
          players={players}
          setPlayers={setPlayers}
          onGenerate={() => setTab('matches')}
        />
      )}
      {tab === 'matches' && (
        <MatchesTab
          players={players}
          initialMatch={savedMatch}
          onMatchSaved={(meta) => setSavedMatch(meta ? { meta } : null)}
        />
      )}
      {tab === 'account' && (
        <AccountTab onDeleted={() => { setUser(null); setPlayers([]); setSavedMatch(null) }} />
      )}
    </div>
  )
}
