import { describe, expect, it } from 'vitest'
import { parseFixturesHtml, parseLeagueTableHtml } from './ddsflScraper'

const FIXTURE_ROW_HTML = `
<table><tbody><tr>
  <td class="matchcol hideColMedium"><span class="HideWhenNarrow">12/08/2025</span></td>
  <td>
    <a class="matchboxlink" href="fixtureslge/1019/4909?fsea=7&amp;frt=all&amp;fclub1=32">
      <div class="matchbox">
        <div class="homeclub">
          <span class="tablehidewhensmall">Bishop Middleham Fc</span>
          <div class="MatchListScorers"><span class="ItemFullName1">Carl Hodges</span></div>
        </div>
        <div class="scorebox"><div class="homescore">3</div><div class="awayscore">4</div></div>
        <div class="awayclub"><span class="tablehidewhensmall">Newton Aycliffe Iron horse</span></div>
      </div>
    </a>
    <div class="matchinfo">Swinburne Maddison Third Division</div>
  </td>
</tr></tbody></table>
`

const LEAGUE_TABLE_HTML = `
<table class="TableList spacebefore2 LeagueTable"><tbody><tr>
  <th class="ar">3</th>
  <td class="al"><span class="ItemFullName1">Bishop Middleham Fc</span></td>
  <td class="ar">18</td><td class="ar">11</td><td class="ar">4</td><td class="ar">3</td>
  <td class="ar cGoals">38</td><td class="ar cGoals">21</td><td class="ar">17</td><td class="ar">37</td>
</tr></tbody></table>
`

describe('ddsflScraper', () => {
  it('ignores goalscorer names when reading team names', () => {
    const fixtures = parseFixturesHtml(FIXTURE_ROW_HTML)
    expect(fixtures[0]?.home_team).toBe('Bishop Middleham Fc')
    expect(fixtures[0]?.away_team).toBe('Newton Aycliffe Iron horse')
  })

  it('parses a BMFC fixture row', () => {
    const fixtures = parseFixturesHtml(FIXTURE_ROW_HTML)
    expect(fixtures).toHaveLength(1)
    expect(fixtures[0]).toMatchObject({
      ddsfl_fixture_id: '4909',
      date_uk: '12/08/2025',
      home_team: 'Bishop Middleham Fc',
      away_team: 'Newton Aycliffe Iron horse',
      home_score: 3,
      away_score: 4,
      competition: 'Swinburne Maddison Third Division',
      home_away: 'home',
      opponent: 'Newton Aycliffe Iron horse',
      status: 'completed',
      goals_for: 3,
      goals_against: 4,
    })
  })

  it('parses a league table row', () => {
    const rows = parseLeagueTableHtml(LEAGUE_TABLE_HTML)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      position: 3,
      team_name: 'Bishop Middleham Fc',
      played: 18,
      won: 11,
      drawn: 4,
      lost: 3,
      goals_for: 38,
      goals_against: 21,
      goal_difference: 17,
      points: 37,
    })
  })
})
