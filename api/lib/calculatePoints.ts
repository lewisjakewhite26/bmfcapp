import { getSupabaseAdmin } from './supabaseAdmin.js'

/** Score a fixture and recalculate all user points via existing DB logic */
export async function calculatePoints(
  fixtureId: number,
  homeScore: number,
  awayScore: number
): Promise<void> {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase.rpc('score_fixture', {
    p_fixture_id: fixtureId,
    p_home_score: homeScore,
    p_away_score: awayScore,
  })

  if (error) throw error
}
