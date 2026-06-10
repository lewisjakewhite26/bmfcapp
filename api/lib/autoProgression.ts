import { getSupabaseAdmin } from './supabaseAdmin.js'

export async function checkAndAutoCompleteMatchdays(gameDays: number[]): Promise<void> {
  if (gameDays.length === 0) return

  const supabase = getSupabaseAdmin()
  const uniqueDays = [...new Set(gameDays)]

  for (const gameDay of uniqueDays) {
    const { data: isComplete, error: checkError } = await supabase.rpc('check_matchday_complete', {
      p_game_day: gameDay,
    })
    if (checkError) {
      console.error(`check_matchday_complete failed for MD${gameDay}:`, checkError.message)
      continue
    }
    if (!isComplete) continue

    const { data: alreadyLogged } = await supabase
      .from('progression_log')
      .select('id')
      .eq('game_day', gameDay)
      .eq('event', 'all_scored')
      .maybeSingle()

    if (alreadyLogged) continue

    const { error: completeError } = await supabase.rpc('auto_complete_matchday', {
      p_game_day: gameDay,
    })
    if (completeError) {
      console.error(`auto_complete_matchday failed for MD${gameDay}:`, completeError.message)
      continue
    }

    console.log(`Matchday ${gameDay} auto-completed, next matchday queued`)
  }
}
