# supabase/README_MATCH_PLAY.md

This PR adds a Match Play feature: DB migrations, client helpers and React components/pages for a full-screen "Play Mode" where admins can mark winners and view history.

Files added (feature/match-play branch):
- supabase/migrations/20260618_add_match_play.sql
- src/features/matchPlay/matchPlayApi.js
- src/features/matchPlay/MatchCard.jsx
- src/features/matchPlay/PlaySessionPage.jsx
- src/features/matchPlay/PlayHistory.jsx
- src/features/matchPlay/PlayHistoryDetail.jsx
- src/features/matchPlay/play.css

Integration steps
1) Apply SQL migration
   - Run the SQL in supabase/migrations/20260618_add_match_play.sql in the Supabase SQL editor.
   - This will create match_play_sessions and match_play_matches tables and RLS policies.

2) Wire up the UI
   - Add routes to your router. Example (React Router):
     - /play/:sessionId -> src/features/matchPlay/PlaySessionPage.jsx
     - /play/history -> src/features/matchPlay/PlayHistory.jsx
     - /play/history/:sessionId -> src/features/matchPlay/PlayHistoryDetail.jsx

3) Start Playing button
   - Add a button to your Matches tab (reuse the same className you use for "Generate Matches" to match styling). Example snippet:

```jsx
// inside Matches component where you have access to the generated plan row (team_matches)
import { startPlaying } from '../features/matchPlay/matchPlayApi';
import { useNavigate } from 'react-router-dom';

async function handleStartPlaying(planId) {
  const session = await startPlaying(planId);
  // navigate to play page
  navigate(`/play/${session.id}`);
}

// Show button only when plan.rounds exists
{team_matches?.rounds && (
  <button className="btn-generate" onClick={() => handleStartPlaying(team_matches.id)}>Start Playing</button>
)}
```

4) Adjust imports
   - The helper files assume you have a supabase client exported from src/supabaseClient (import path '../../supabaseClient'). If your path differs, update the import in src/features/matchPlay/matchPlayApi.js accordingly.

5) Styling
   - Import the CSS file where you keep global CSS, e.g.
     import '../features/matchPlay/play.css';

Notes and assumptions
- winner_players stores team_members.id (so players without auth accounts are supported). This was chosen because the app contains players with and without user accounts.
- Only team admins (team_members.is_admin = true) can create sessions or mark winners. Team members can read history.
- If you regenerate matches after sessions exist, sessions are NOT modified. Regeneration affects the generated plan only; start a new play session to play a new plan.

If you want, I can open the PR now (I already created the feature/match-play branch) and push these changes into it. Then I will open the PR targeting main. If you want any file path adjustments before I push, tell me now.
