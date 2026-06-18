@@
-import { api } from '../../lib/api.js'
-import { generateRounds } from '../../lib/matchEngine.js'
+import { api } from '../../lib/api.js'
+import { generateRounds } from '../../lib/matchEngine.js'
 import { col, ini, sl } from '../../lib/utils.js'
+import { startPlaying } from '../../features/matchPlay/matchPlayApi.js'
@@
-export default function TeamMatchesTab({
-  team, members, isAdmin, currentUserId,
-  result, setResult, savedMeta, setSavedMeta,
-}) {
+export default function TeamMatchesTab({
+  team, members, isAdmin, currentUserId,
+  result, setResult, savedMeta, setSavedMeta,
+  teamMatchesId, onStartPlay,
+}) {
@@
   async function clearMatches() {
     if (!confirm('Delete the match list for everyone in this team?')) return
     try {
       await api.deleteTeamMatches(team.id)
       setResult(null)
       setSavedMeta(null)
     } catch (e) { alert(e.message) }
   }
+
+  async function handleStartPlaying() {
+    if (!teamMatchesId) return alert('No generated match plan found.')
+    try {
+      // startPlaying will create a session and return it
+      const session = await startPlaying(teamMatchesId)
+      // notify parent (TeamView) to open play UI
+      onStartPlay?.(session.id)
+    } catch (err) {
+      console.error('Failed to start playing', err)
+      alert('Failed to start playing: ' + (err.message || err))
+    }
+  }
@@
             {result && (
               <>
                 <button className="btn-pdf" onClick={() => window.print()}>
@@
-                <button className="btn-danger" onClick={clearMatches}>Delete list</button>
+                <button className="btn-danger" onClick={clearMatches}>Delete list</button>
+                <button className="btn-generate" onClick={handleStartPlaying} style={{ marginLeft: 8 }}>
+                  Start Playing
+                </button>
               </>
             )}
           </div>
         </div>
       )}
@@
 }
