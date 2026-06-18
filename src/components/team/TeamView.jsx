1| import { useState, useEffect } from 'react'
2| import { supabase } from '../../lib/supabase.js'
3| import { api } from '../../lib/api.js'
4| import TeamPlayersTab from './TeamPlayersTab.jsx'
5| import TeamMatchesTab from './TeamMatchesTab.jsx'
6| import PlaySessionPage from '../../features/matchPlay/PlaySessionPage.jsx'
7| 
8| export default function TeamView({ team, currentUserId, onBack, onTeamUpdated }) {
9|   const [tab, setTab]               = useState('players')
10|   const [members, setMembers]       = useState([])
11|   const [isAdmin, setIsAdmin]       = useState(false)
12|   const [loading, setLoading]       = useState(true)
13|   const [matchResult, setMatchResult] = useState(null)
14|   const [savedMeta, setSavedMeta]   = useState(null)
15|   const [editing, setEditing]       = useState(false)
16|   const [newName, setNewName]       = useState(team.name)
17|   const [syncBadge, setSyncBadge]   = useState(null) // 'players' | 'matches' | null
18|   const [teamMatchesId, setTeamMatchesId] = useState(null)
19|   const [activePlaySessionId, setActivePlaySessionId] = useState(null)
20|   const channelRef = useState(null)
21| 
22|   useEffect(() => {
23|     loadAll()
24|     subscribeRealtime()
25|     return () => {
26|       if (channelRef.current) supabase.removeChannel(channelRef.current)
27|     }
28|   }, [team.id])
29| 
30|   async function loadAll() {
31|     setLoading(true)
32|     try {
33|       const [{ members: m, is_admin }, matchData] = await Promise.all([
34|         api.getMembers(team.id),
35|         api.getTeamMatches(team.id),
36|       ])
37|       setMembers(m)
38|       setIsAdmin(is_admin)
39|       applyMatchData(matchData)
40|     } catch (e) { console.error(e) }
41|     setLoading(false)
42|   }
43| 
44|   function applyMatchData(data) {
45|     if (!data) { setMatchResult(null); setSavedMeta(null); setTeamMatchesId(null); return }
46|     // data.rounds is the serialised array from DB; wrap it into the shape
47|     // TeamMatchesTab expects: { rounds: [...], courts, sittingCount }
48|     if (data.rounds && Array.isArray(data.rounds)) {
49|       const courts = data.meta?.courts ?? (data.rounds[0]?.courts || 1)
50|       const sittingCount = data.rounds[0]?.sitting?.length ?? 0
51|       setMatchResult({ rounds: data.rounds, courts, sittingCount, totalPlayers: data.meta?.players })
52|     }
53|     if (data.meta) setSavedMeta(data.meta)
54|     setTeamMatchesId(data.id ?? null)
55|   }
56| 
57|   // ── Supabase Realtime ──────────────────────────────────────────────────
58|   function subscribeRealtime() {
59|     if (channelRef.current) supabase.removeChannel(channelRef.current)
60| 
61|     const channel = supabase
62|       .channel(`team-${team.id}`)
63| 
64|       // team_members changes → reload members
65|       .on('postgres_changes', {
66|         event: '*',
67|         schema: 'public',
68|         table: 'team_members',
69|         filter: `team_id=eq.${team.id}`,
70|       }, () => {
71|         reloadMembers()
72|         flashBadge('players')
73|       })
74| 
75|       // team_matches changes → reload matches
76|       .on('postgres_changes', {
77|         event: '*',
78|         schema: 'public',
79|         table: 'team_matches',
80|         filter: `team_id=eq.${team.id}`,
81|       }, (payload) => {
82|         if (payload.eventType === 'DELETE') {
83|           setMatchResult(null); setSavedMeta(null); setTeamMatchesId(null)
84|         } else if (payload.new) {
85|           applyMatchData(payload.new)
86|         } else {
87|           // Realtime sometimes omits payload.new for large rows — re-fetch
88|           api.getTeamMatches(team.id).then(applyMatchData).catch(console.error)
89|         }
90|         flashBadge('matches')
91|       })
92| 
93|       .subscribe()
94| 
95|     channelRef.current = channel
96|   }
97| 
98|   async function reloadMembers() {
99|     try {
100|       const { members: m, is_admin } = await api.getMembers(team.id)
101|       setMembers(m)
102|       setIsAdmin(is_admin)
103|     } catch (e) { console.error(e) }
104|   }
105| 
106|   // Show a brief "synced" indicator on the tab that changed
107|   function flashBadge(which) {
108|     setSyncBadge(which)
109|     setTimeout(() => setSyncBadge(null), 2500)
110|   }
111| 
112|   async function saveTeamName() {
113|     if (!newName.trim() || newName.trim() === team.name) { setEditing(false); return }
114|     try {
115|       const updated = await api.renameTeam(team.id, newName.trim())
116|       onTeamUpdated({ ...team, name: updated.name })
117|       setEditing(false)
118|     } catch (e) { alert(e.message) }
119|   }
120| 
121|   if (loading) return (
122|     <div style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>
123|       Loading team…
124|     </div>
125|   )
126| 
127|   return (
128|     <div>
129|       {/* Team header */}
130|       <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
131|         <button onClick={onBack} style={{
132|           width: 36, height: 36, borderRadius: '50%',
133|           border: '1px solid var(--border-medium)', background: 'none',
134|           cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
135|           flexShrink: 0,
136|         }}>
137|           <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
138|             stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
139|         </button>
140| 
141|         {editing ? (
142|           <div style={{ display: 'flex', gap: 8, flex: 1 }}>
143|             <input className="field-input" value={newName}
144|               onChange={e => setNewName(e.target.value)}
145|               onKeyDown={e => { if (e.key === 'Enter') saveTeamName(); if (e.key === 'Escape') setEditing(false) }}
146|               autoFocus style={{ flex: 1 }} />
147|             <button className="btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}
148|               onClick={saveTeamName}>Save</button>
149|             <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }}
150|               onClick={() => { setEditing(false); setNewName(team.name) }}>Cancel</button>
151|           </div>
152|         ) : (
153|           <div style={{ flex: 1, minWidth: 0 }}>
154|             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
155|               <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
156|                 {team.name}
157|               </h2>
158|               {isAdmin && (
159|                 <button onClick={() => setEditing(true)} style={{
160|                   background: 'none', border: 'none', cursor: 'pointer',
161|                   color: 'var(--text-tertiary)', padding: 4,
162|                 }}>
163|                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
164|                     stroke="currentColor" strokeWidth="2">
165|                     <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
166|                     <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
167|                   </svg>
168|                 </button>
169|               )}
170|             </div>
171|             <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
172|               {members.length} player{members.length !== 1 ? 's' : ''} ·{' '}
173|               {isAdmin
174|                 ? <span style={{ color: 'var(--accent)', fontWeight: 500 }}>Admin</span>
175|                 : 'Member'}
176|             </div>
177|           </div>
178|         )}
179|       </div>
180| 
181|       {/* Tab bar with sync indicator */}
182|       <div className="tab-bar">
183|         {['players', 'matches'].map(t => (
184|           <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`}
185|             onClick={() => setTab(t)}
186|             style={{ position: 'relative' }}>
187|             {t === 'players' ? 'Players' : 'Matches'}
188|             {syncBadge === t && tab !== t && (
189|               <span style={{
190|                 position: 'absolute', top: 4, right: 4,
191|                 width: 7, height: 7, borderRadius: '50%',
192|                 background: '#1D9E75',
193|               }} />
194|             )}
195|           </button>
196|         ))}
197|       </div>
198| 
199|       {tab === 'players' && (
200|         <TeamPlayersTab
201|           team={team}
202|           members={members}
203|           setMembers={setMembers}
204|           isAdmin={isAdmin}
205|           currentUserId={currentUserId}
206|           onGenerate={() => setTab('matches')}
207|         />
208|       )}
209|       {tab === 'matches' && (
210|         <TeamMatchesTab
211|           team={team}
212|           members={members}
213|           isAdmin={isAdmin}
214|           currentUserId={currentUserId}
215|           result={matchResult}
216|           setResult={setMatchResult}
217|           savedMeta={savedMeta}
218|           setSavedMeta={setSavedMeta}
219|           teamMatchesId={teamMatchesId}
220|           onStartPlay={(sessionId) => setActivePlaySessionId(sessionId)}
221|         />
222|       )}
223| 
224|       {/* Render fullscreen PlaySessionPage when active */}
225|       {activePlaySessionId && (
226|         <PlaySessionPage sessionId={activePlaySessionId} onClose={() => setActivePlaySessionId(null)} />
227|       )}
228|     </div>
229|   )
230| }
