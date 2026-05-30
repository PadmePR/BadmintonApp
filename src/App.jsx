import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase.js'
import { api } from './lib/api.js'
import Login from './components/Login.jsx'
import AccountTab from './components/AccountTab.jsx'
import TeamHome from './components/team/TeamHome.jsx'
import TeamView from './components/team/TeamView.jsx'

export default function App() {
  const [user, setUser]         = useState(null)
  const [checking, setChecking] = useState(true)
  const [profile, setProfile]   = useState(null)
  const [teams, setTeams]       = useState([])
  const [activeTeam, setActiveTeam] = useState(null) // null = home
  const [showAccount, setShowAccount] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); loadInitial() }
      setChecking(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadInitial() {
    try {
      const [acct, teamList] = await Promise.all([api.getAccount(), api.getTeams()])
      setProfile(acct || null)
      setTeams(teamList || [])
    } catch (e) { console.error(e) }
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setTeams([])
    setActiveTeam(null); setShowAccount(false)
  }

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
  if (!user) return <Login onLogin={() => { loadInitial(); setUser(true) }} />

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
        <button
          className={`user-avatar-btn${showAccount ? ' active' : ''}`}
          onClick={() => { setShowAccount(v => !v); setActiveTeam(null) }}
          title="Account"
        >
          {getInitials()}
        </button>
      </header>

      {showAccount ? (
        <AccountTab
          profile={profile}
          onProfileUpdated={setProfile}
          onDeleted={() => { setUser(null); setProfile(null); setTeams([]) }}
          onLogout={logout}
        />
      ) : activeTeam ? (
        <TeamView
          team={activeTeam}
          currentUserId={user.id}
          onBack={() => setActiveTeam(null)}
          onTeamUpdated={(updated) => {
            setTeams(prev => prev.map(t => t.id === updated.id ? updated : t))
            setActiveTeam(updated)
          }}
        />
      ) : (
        <TeamHome
          teams={teams.map(t => ({ ...t, _userId: user.id }))}
          onSelectTeam={(team) => { setActiveTeam(team); setShowAccount(false) }}
          onTeamCreated={(team) => setTeams(prev => [...prev, team])}
          onTeamDeleted={(id) => setTeams(prev => prev.filter(t => t.id !== id))}
        />
      )}
    </div>
  )
}
