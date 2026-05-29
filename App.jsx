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
  const [profile, setProfile] = useState(null)

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
      const [p, m, acct] = await Promise.all([
        api.getPlayers(),
        api.getMatches(),
        api.getAccount(),
      ])
      setPlayers(p || [])
      setSavedMatch(m || null)
      setProfile(acct || null)
    } catch (e) { console.error('Load error:', e) }
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null); setPlayers([]); setSavedMatch(null); setProfile(null); setTab('players')
  }

  // Initials for the avatar icon — from username or email
  function getInitials() {
    if (profile?.username) {
      const parts = profile.username.trim().split(/\s+/)
      return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : profile.username.slice(0, 2).toUpperCase()
    }
    if (user?.email) return user.email[0].toUpperCase()
    return '?'
  }

  if (checking) return null
  if (!user) return <Login onLogin={() => { loadData(); setUser(true) }} />

  return (
    <div className="container" id="app">
      <header>
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="3" ry="4"/>
            <path d="M12 9l6 12H6L12 9z"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <h1>Badminton Team Generator</h1>
          <div className="sub">Balanced doubles · simultaneous courts · fair rotation</div>
        </div>
        {/* User avatar icon — replaces the old Account button */}
        <button
          className={`user-avatar-btn${tab === 'account' ? ' active' : ''}`}
          onClick={() => setTab(tab === 'account' ? 'players' : 'account')}
          title="Account"
        >
          {getInitials()}
        </button>
      </header>

      {/* Tab bar — only Players and Matches */}
      <div className="tab-bar">
        {['players', 'matches'].map(t => (
          <button
            key={t}
            className={`tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'players' ? 'Players' : 'Matches'}
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
        <AccountTab
          profile={profile}
          onProfileUpdated={(updated) => setProfile(updated)}
          onDeleted={() => { setUser(null); setPlayers([]); setSavedMatch(null); setProfile(null) }}
          onLogout={logout}
        />
      )}
    </div>
  )
}
