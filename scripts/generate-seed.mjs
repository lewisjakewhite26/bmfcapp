/**
 * Generates supabase/seed.sql with all 104 fixtures
 * Run: node scripts/generate-seed.mjs
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function bstToUtc(dateStr, timeStr) {
  const [day, month, year] = dateStr.split(' ');
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const [time, ampm] = timeStr.split(/(?=[ap]m)/i);
  let [h, m = '0'] = time.replace(/[^0-9:]/g, '').split(':');
  h = parseInt(h);
  m = parseInt(m);
  if (ampm?.toLowerCase() === 'pm' && h !== 12) h += 12;
  if (ampm?.toLowerCase() === 'am' && h === 12) h = 0;
  const d = new Date(Date.UTC(parseInt(year), months[month], parseInt(day), h - 1, m));
  return d.toISOString();
}

const groupFixtures = [
  // Game Day 1
  { gd: 1, stage: 'group', group: 'A', home: 'Mexico', away: 'South Africa', hf: '🇲🇽', af: '🇿🇦', date: '11 Jun 2026', time: '8pm', venue: 'Estadio Azteca', city: 'Mexico City', country: 'Mexico' },
  { gd: 1, stage: 'group', group: 'A', home: 'South Korea', away: 'Czech Republic', hf: '🇰🇷', af: '🇨🇿', date: '12 Jun 2026', time: '3am', venue: 'Estadio Akron', city: 'Zapopan', country: 'Mexico' },
  { gd: 1, stage: 'group', group: 'B', home: 'Canada', away: 'Bosnia & Herzegovina', hf: '🇨🇦', af: '🇧🇦', date: '12 Jun 2026', time: '8pm', venue: 'BMO Field', city: 'Toronto', country: 'Canada' },
  { gd: 1, stage: 'group', group: 'D', home: 'USA', away: 'Paraguay', hf: '🇺🇸', af: '🇵🇾', date: '13 Jun 2026', time: '2am', venue: 'SoFi Stadium', city: 'Los Angeles', country: 'USA' },
  { gd: 1, stage: 'group', group: 'B', home: 'Qatar', away: 'Switzerland', hf: '🇶🇦', af: '🇨🇭', date: '13 Jun 2026', time: '8pm', venue: "Levi's Stadium", city: 'Santa Clara', country: 'USA' },
  { gd: 1, stage: 'group', group: 'C', home: 'Brazil', away: 'Morocco', hf: '🇧🇷', af: '🇲🇦', date: '13 Jun 2026', time: '11pm', venue: 'MetLife Stadium', city: 'New Jersey', country: 'USA' },
  { gd: 1, stage: 'group', group: 'C', home: 'Haiti', away: 'Scotland', hf: '🇭🇹', af: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', date: '14 Jun 2026', time: '2am', venue: 'Gillette Stadium', city: 'Boston', country: 'USA' },
  { gd: 1, stage: 'group', group: 'D', home: 'Australia', away: 'Turkey', hf: '🇦🇺', af: '🇹🇷', date: '14 Jun 2026', time: '5am', venue: 'BC Place', city: 'Vancouver', country: 'Canada' },
  { gd: 1, stage: 'group', group: 'E', home: 'Germany', away: 'Curaçao', hf: '🇩🇪', af: '🇨🇼', date: '14 Jun 2026', time: '6pm', venue: 'NRG Stadium', city: 'Houston', country: 'USA' },
  { gd: 1, stage: 'group', group: 'F', home: 'Netherlands', away: 'Japan', hf: '🇳🇱', af: '🇯🇵', date: '14 Jun 2026', time: '9pm', venue: 'AT&T Stadium', city: 'Arlington', country: 'USA' },
  { gd: 1, stage: 'group', group: 'E', home: 'Ivory Coast', away: 'Ecuador', hf: '🇨🇮', af: '🇪🇨', date: '15 Jun 2026', time: '12am', venue: 'Lincoln Financial Field', city: 'Philadelphia', country: 'USA' },
  { gd: 1, stage: 'group', group: 'F', home: 'Sweden', away: 'Tunisia', hf: '🇸🇪', af: '🇹🇳', date: '15 Jun 2026', time: '3am', venue: 'Estadio Guadalupe', city: 'Guadalupe', country: 'Mexico' },
  { gd: 1, stage: 'group', group: 'H', home: 'Spain', away: 'Cape Verde', hf: '🇪🇸', af: '🇨🇻', date: '15 Jun 2026', time: '5pm', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'USA' },
  { gd: 1, stage: 'group', group: 'G', home: 'Belgium', away: 'Egypt', hf: '🇧🇪', af: '🇪🇬', date: '15 Jun 2026', time: '8pm', venue: 'Lumen Field', city: 'Seattle', country: 'USA' },
  { gd: 1, stage: 'group', group: 'H', home: 'Saudi Arabia', away: 'Uruguay', hf: '🇸🇦', af: '🇺🇾', date: '15 Jun 2026', time: '11pm', venue: 'Hard Rock Stadium', city: 'Miami', country: 'USA' },
  { gd: 1, stage: 'group', group: 'G', home: 'Iran', away: 'New Zealand', hf: '🇮🇷', af: '🇳🇿', date: '16 Jun 2026', time: '2am', venue: 'SoFi Stadium', city: 'Los Angeles', country: 'USA' },
  { gd: 1, stage: 'group', group: 'I', home: 'France', away: 'Senegal', hf: '🇫🇷', af: '🇸🇳', date: '16 Jun 2026', time: '8pm', venue: 'MetLife Stadium', city: 'New Jersey', country: 'USA' },
  { gd: 1, stage: 'group', group: 'I', home: 'Iraq', away: 'Norway', hf: '🇮🇶', af: '🇳🇴', date: '16 Jun 2026', time: '11pm', venue: 'Gillette Stadium', city: 'Boston', country: 'USA' },
  { gd: 1, stage: 'group', group: 'J', home: 'Argentina', away: 'Algeria', hf: '🇦🇷', af: '🇩🇿', date: '17 Jun 2026', time: '2am', venue: 'Arrowhead Stadium', city: 'Kansas City', country: 'USA' },
  { gd: 1, stage: 'group', group: 'J', home: 'Austria', away: 'Jordan', hf: '🇦🇹', af: '🇯🇴', date: '17 Jun 2026', time: '5am', venue: "Levi's Stadium", city: 'Santa Clara', country: 'USA' },
  { gd: 1, stage: 'group', group: 'K', home: 'Portugal', away: 'DR Congo', hf: '🇵🇹', af: '🇨🇩', date: '17 Jun 2026', time: '6pm', venue: 'NRG Stadium', city: 'Houston', country: 'USA' },
  { gd: 1, stage: 'group', group: 'L', home: 'England', away: 'Croatia', hf: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', af: '🇭🇷', date: '17 Jun 2026', time: '9pm', venue: 'AT&T Stadium', city: 'Dallas', country: 'USA' },
  { gd: 1, stage: 'group', group: 'L', home: 'Ghana', away: 'Panama', hf: '🇬🇭', af: '🇵🇦', date: '18 Jun 2026', time: '12am', venue: 'BMO Field', city: 'Toronto', country: 'Canada' },
  { gd: 1, stage: 'group', group: 'K', home: 'Uzbekistan', away: 'Colombia', hf: '🇺🇿', af: '🇨🇴', date: '18 Jun 2026', time: '3am', venue: 'Estadio Azteca', city: 'Mexico City', country: 'Mexico' },

  // Game Day 2
  { gd: 2, stage: 'group', group: 'A', home: 'Czech Republic', away: 'South Africa', hf: '🇨🇿', af: '🇿🇦', date: '18 Jun 2026', time: '5pm', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'USA' },
  { gd: 2, stage: 'group', group: 'B', home: 'Switzerland', away: 'Bosnia & Herzegovina', hf: '🇨🇭', af: '🇧🇦', date: '18 Jun 2026', time: '8pm', venue: 'SoFi Stadium', city: 'Los Angeles', country: 'USA' },
  { gd: 2, stage: 'group', group: 'B', home: 'Canada', away: 'Qatar', hf: '🇨🇦', af: '🇶🇦', date: '18 Jun 2026', time: '11pm', venue: 'BC Place', city: 'Vancouver', country: 'Canada' },
  { gd: 2, stage: 'group', group: 'A', home: 'Mexico', away: 'South Korea', hf: '🇲🇽', af: '🇰🇷', date: '19 Jun 2026', time: '2am', venue: 'Estadio Akron', city: 'Zapopan', country: 'Mexico' },
  { gd: 2, stage: 'group', group: 'D', home: 'USA', away: 'Australia', hf: '🇺🇸', af: '🇦🇺', date: '19 Jun 2026', time: '8pm', venue: 'Lumen Field', city: 'Seattle', country: 'USA' },
  { gd: 2, stage: 'group', group: 'C', home: 'Scotland', away: 'Morocco', hf: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', af: '🇲🇦', date: '19 Jun 2026', time: '11pm', venue: 'Gillette Stadium', city: 'Boston', country: 'USA' },
  { gd: 2, stage: 'group', group: 'C', home: 'Brazil', away: 'Haiti', hf: '🇧🇷', af: '🇭🇹', date: '20 Jun 2026', time: '1:30am', venue: 'Lincoln Financial Field', city: 'Philadelphia', country: 'USA' },
  { gd: 2, stage: 'group', group: 'D', home: 'Turkey', away: 'Paraguay', hf: '🇹🇷', af: '🇵🇾', date: '20 Jun 2026', time: '4am', venue: "Levi's Stadium", city: 'Santa Clara', country: 'USA' },
  { gd: 2, stage: 'group', group: 'F', home: 'Netherlands', away: 'Sweden', hf: '🇳🇱', af: '🇸🇪', date: '20 Jun 2026', time: '6pm', venue: 'NRG Stadium', city: 'Houston', country: 'USA' },
  { gd: 2, stage: 'group', group: 'E', home: 'Germany', away: 'Ivory Coast', hf: '🇩🇪', af: '🇨🇮', date: '20 Jun 2026', time: '9pm', venue: 'BMO Field', city: 'Toronto', country: 'Canada' },
  { gd: 2, stage: 'group', group: 'E', home: 'Ecuador', away: 'Curaçao', hf: '🇪🇨', af: '🇨🇼', date: '21 Jun 2026', time: '1am', venue: 'Arrowhead Stadium', city: 'Kansas City', country: 'USA' },
  { gd: 2, stage: 'group', group: 'F', home: 'Tunisia', away: 'Japan', hf: '🇹🇳', af: '🇯🇵', date: '21 Jun 2026', time: '5am', venue: 'Estadio Guadalupe', city: 'Guadalupe', country: 'Mexico' },
  { gd: 2, stage: 'group', group: 'H', home: 'Spain', away: 'Saudi Arabia', hf: '🇪🇸', af: '🇸🇦', date: '21 Jun 2026', time: '5pm', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'USA' },
  { gd: 2, stage: 'group', group: 'G', home: 'Belgium', away: 'Iran', hf: '🇧🇪', af: '🇮🇷', date: '21 Jun 2026', time: '8pm', venue: 'SoFi Stadium', city: 'Los Angeles', country: 'USA' },
  { gd: 2, stage: 'group', group: 'H', home: 'Uruguay', away: 'Cape Verde', hf: '🇺🇾', af: '🇨🇻', date: '21 Jun 2026', time: '11pm', venue: 'Hard Rock Stadium', city: 'Miami', country: 'USA' },
  { gd: 2, stage: 'group', group: 'G', home: 'New Zealand', away: 'Egypt', hf: '🇳🇿', af: '🇪🇬', date: '22 Jun 2026', time: '2am', venue: 'BC Place', city: 'Vancouver', country: 'Canada' },
  { gd: 2, stage: 'group', group: 'J', home: 'Argentina', away: 'Austria', hf: '🇦🇷', af: '🇦🇹', date: '22 Jun 2026', time: '6pm', venue: 'AT&T Stadium', city: 'Arlington', country: 'USA' },
  { gd: 2, stage: 'group', group: 'I', home: 'France', away: 'Iraq', hf: '🇫🇷', af: '🇮🇶', date: '22 Jun 2026', time: '10pm', venue: 'Lincoln Financial Field', city: 'Philadelphia', country: 'USA' },
  { gd: 2, stage: 'group', group: 'I', home: 'Norway', away: 'Senegal', hf: '🇳🇴', af: '🇸🇳', date: '23 Jun 2026', time: '1am', venue: 'BMO Field', city: 'Toronto', country: 'Canada' },
  { gd: 2, stage: 'group', group: 'J', home: 'Jordan', away: 'Algeria', hf: '🇯🇴', af: '🇩🇿', date: '23 Jun 2026', time: '4am', venue: "Levi's Stadium", city: 'Santa Clara', country: 'USA' },
  { gd: 2, stage: 'group', group: 'K', home: 'Portugal', away: 'Uzbekistan', hf: '🇵🇹', af: '🇺🇿', date: '23 Jun 2026', time: '6pm', venue: 'NRG Stadium', city: 'Houston', country: 'USA' },
  { gd: 2, stage: 'group', group: 'L', home: 'England', away: 'Ghana', hf: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', af: '🇬🇭', date: '23 Jun 2026', time: '9pm', venue: 'Gillette Stadium', city: 'Boston', country: 'USA' },
  { gd: 2, stage: 'group', group: 'L', home: 'Panama', away: 'Croatia', hf: '🇵🇦', af: '🇭🇷', date: '24 Jun 2026', time: '12am', venue: 'Gillette Stadium', city: 'Boston', country: 'USA' },
  { gd: 2, stage: 'group', group: 'K', home: 'Colombia', away: 'DR Congo', hf: '🇨🇴', af: '🇨🇩', date: '24 Jun 2026', time: '3am', venue: 'Estadio Akron', city: 'Zapopan', country: 'Mexico' },

  // Game Day 3
  { gd: 3, stage: 'group', group: 'B', home: 'Switzerland', away: 'Canada', hf: '🇨🇭', af: '🇨🇦', date: '24 Jun 2026', time: '8pm', venue: 'BC Place', city: 'Vancouver', country: 'Canada' },
  { gd: 3, stage: 'group', group: 'B', home: 'Bosnia & Herzegovina', away: 'Qatar', hf: '🇧🇦', af: '🇶🇦', date: '24 Jun 2026', time: '8pm', venue: 'Lumen Field', city: 'Seattle', country: 'USA' },
  { gd: 3, stage: 'group', group: 'C', home: 'Morocco', away: 'Haiti', hf: '🇲🇦', af: '🇭🇹', date: '24 Jun 2026', time: '11pm', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'USA' },
  { gd: 3, stage: 'group', group: 'C', home: 'Scotland', away: 'Brazil', hf: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', af: '🇧🇷', date: '24 Jun 2026', time: '11pm', venue: 'Hard Rock Stadium', city: 'Miami', country: 'USA' },
  { gd: 3, stage: 'group', group: 'A', home: 'South Africa', away: 'South Korea', hf: '🇿🇦', af: '🇰🇷', date: '25 Jun 2026', time: '2am', venue: 'Estadio Guadalupe', city: 'Guadalupe', country: 'Mexico' },
  { gd: 3, stage: 'group', group: 'A', home: 'Czech Republic', away: 'Mexico', hf: '🇨🇿', af: '🇲🇽', date: '25 Jun 2026', time: '2am', venue: 'Estadio Azteca', city: 'Mexico City', country: 'Mexico' },
  { gd: 3, stage: 'group', group: 'E', home: 'Curaçao', away: 'Ivory Coast', hf: '🇨🇼', af: '🇨🇮', date: '25 Jun 2026', time: '9pm', venue: 'Lincoln Financial Field', city: 'Philadelphia', country: 'USA' },
  { gd: 3, stage: 'group', group: 'E', home: 'Ecuador', away: 'Germany', hf: '🇪🇨', af: '🇩🇪', date: '25 Jun 2026', time: '9pm', venue: 'MetLife Stadium', city: 'New Jersey', country: 'USA' },
  { gd: 3, stage: 'group', group: 'F', home: 'Tunisia', away: 'Netherlands', hf: '🇹🇳', af: '🇳🇱', date: '26 Jun 2026', time: '12am', venue: 'Arrowhead Stadium', city: 'Kansas City', country: 'USA' },
  { gd: 3, stage: 'group', group: 'F', home: 'Japan', away: 'Sweden', hf: '🇯🇵', af: '🇸🇪', date: '26 Jun 2026', time: '12am', venue: 'AT&T Stadium', city: 'Arlington', country: 'USA' },
  { gd: 3, stage: 'group', group: 'D', home: 'Turkey', away: 'USA', hf: '🇹🇷', af: '🇺🇸', date: '26 Jun 2026', time: '3am', venue: 'SoFi Stadium', city: 'Los Angeles', country: 'USA' },
  { gd: 3, stage: 'group', group: 'D', home: 'Paraguay', away: 'Australia', hf: '🇵🇾', af: '🇦🇺', date: '26 Jun 2026', time: '3am', venue: "Levi's Stadium", city: 'Santa Clara', country: 'USA' },
  { gd: 3, stage: 'group', group: 'I', home: 'Norway', away: 'France', hf: '🇳🇴', af: '🇫🇷', date: '26 Jun 2026', time: '8pm', venue: 'Gillette Stadium', city: 'Boston', country: 'USA' },
  { gd: 3, stage: 'group', group: 'I', home: 'Senegal', away: 'Iraq', hf: '🇸🇳', af: '🇮🇶', date: '26 Jun 2026', time: '8pm', venue: 'BMO Field', city: 'Toronto', country: 'Canada' },
  { gd: 3, stage: 'group', group: 'H', home: 'Cape Verde', away: 'Saudi Arabia', hf: '🇨🇻', af: '🇸🇦', date: '27 Jun 2026', time: '1am', venue: 'NRG Stadium', city: 'Houston', country: 'USA' },
  { gd: 3, stage: 'group', group: 'H', home: 'Uruguay', away: 'Spain', hf: '🇺🇾', af: '🇪🇸', date: '27 Jun 2026', time: '1am', venue: 'Estadio Akron', city: 'Zapopan', country: 'Mexico' },
  { gd: 3, stage: 'group', group: 'G', home: 'New Zealand', away: 'Belgium', hf: '🇳🇿', af: '🇧🇪', date: '27 Jun 2026', time: '4am', venue: 'BC Place', city: 'Vancouver', country: 'Canada' },
  { gd: 3, stage: 'group', group: 'G', home: 'Egypt', away: 'Iran', hf: '🇪🇬', af: '🇮🇷', date: '27 Jun 2026', time: '4am', venue: 'Lumen Field', city: 'Seattle', country: 'USA' },
  { gd: 3, stage: 'group', group: 'L', home: 'Panama', away: 'England', hf: '🇵🇦', af: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', date: '27 Jun 2026', time: '10pm', venue: 'MetLife Stadium', city: 'New Jersey', country: 'USA' },
  { gd: 3, stage: 'group', group: 'L', home: 'Croatia', away: 'Ghana', hf: '🇭🇷', af: '🇬🇭', date: '27 Jun 2026', time: '10pm', venue: 'Lincoln Financial Field', city: 'Philadelphia', country: 'USA' },
  { gd: 3, stage: 'group', group: 'K', home: 'Colombia', away: 'Portugal', hf: '🇨🇴', af: '🇵🇹', date: '28 Jun 2026', time: '12:30am', venue: 'Hard Rock Stadium', city: 'Miami', country: 'USA' },
  { gd: 3, stage: 'group', group: 'K', home: 'DR Congo', away: 'Uzbekistan', hf: '🇨🇩', af: '🇺🇿', date: '28 Jun 2026', time: '12:30am', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'USA' },
  { gd: 3, stage: 'group', group: 'J', home: 'Algeria', away: 'Austria', hf: '🇩🇿', af: '🇦🇹', date: '28 Jun 2026', time: '3am', venue: 'Arrowhead Stadium', city: 'Kansas City', country: 'USA' },
  { gd: 3, stage: 'group', group: 'J', home: 'Jordan', away: 'Argentina', hf: '🇯🇴', af: '🇦🇷', date: '28 Jun 2026', time: '3am', venue: 'AT&T Stadium', city: 'Arlington', country: 'USA' },
];

const knockoutFixtures = [
  // Game Day 4 - Round of 32 (16 matches)
  { gd: 4, stage: 'round_of_32', group: null, home: 'Group A Winner', away: 'Group B Runner-up', hf: '🏆', af: '🥈', kickoff: '2026-06-29T19:00:00Z', venue: 'SoFi Stadium', city: 'Los Angeles', country: 'USA' },
  { gd: 4, stage: 'round_of_32', group: null, home: 'Group C Winner', away: 'Group D Runner-up', hf: '🏆', af: '🥈', kickoff: '2026-06-29T22:00:00Z', venue: 'Gillette Stadium', city: 'Boston', country: 'USA' },
  { gd: 4, stage: 'round_of_32', group: null, home: 'Group E Winner', away: 'Group F Runner-up', hf: '🏆', af: '🥈', kickoff: '2026-06-30T01:00:00Z', venue: 'NRG Stadium', city: 'Houston', country: 'USA' },
  { gd: 4, stage: 'round_of_32', group: null, home: 'Group G Winner', away: 'Group H Runner-up', hf: '🏆', af: '🥈', kickoff: '2026-06-30T16:00:00Z', venue: 'MetLife Stadium', city: 'New Jersey', country: 'USA' },
  { gd: 4, stage: 'round_of_32', group: null, home: 'Group I Winner', away: 'Group J Runner-up', hf: '🏆', af: '🥈', kickoff: '2026-06-30T19:00:00Z', venue: 'AT&T Stadium', city: 'Arlington', country: 'USA' },
  { gd: 4, stage: 'round_of_32', group: null, home: 'Group K Winner', away: 'Group L Runner-up', hf: '🏆', af: '🥈', kickoff: '2026-06-30T22:00:00Z', venue: 'Hard Rock Stadium', city: 'Miami', country: 'USA' },
  { gd: 4, stage: 'round_of_32', group: null, home: 'Group B Winner', away: 'Group A Runner-up', hf: '🏆', af: '🥈', kickoff: '2026-07-01T01:00:00Z', venue: 'BC Place', city: 'Vancouver', country: 'Canada' },
  { gd: 4, stage: 'round_of_32', group: null, home: 'Group D Winner', away: 'Group C Runner-up', hf: '🏆', af: '🥈', kickoff: '2026-07-01T16:00:00Z', venue: 'Levi\'s Stadium', city: 'Santa Clara', country: 'USA' },
  { gd: 4, stage: 'round_of_32', group: null, home: 'Group F Winner', away: 'Group E Runner-up', hf: '🏆', af: '🥈', kickoff: '2026-07-01T19:00:00Z', venue: 'Lumen Field', city: 'Seattle', country: 'USA' },
  { gd: 4, stage: 'round_of_32', group: null, home: 'Group H Winner', away: 'Group G Runner-up', hf: '🏆', af: '🥈', kickoff: '2026-07-01T22:00:00Z', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'USA' },
  { gd: 4, stage: 'round_of_32', group: null, home: 'Group J Winner', away: 'Group I Runner-up', hf: '🏆', af: '🥈', kickoff: '2026-07-02T01:00:00Z', venue: 'Arrowhead Stadium', city: 'Kansas City', country: 'USA' },
  { gd: 4, stage: 'round_of_32', group: null, home: 'Group L Winner', away: 'Group K Runner-up', hf: '🏆', af: '🥈', kickoff: '2026-07-02T16:00:00Z', venue: 'BMO Field', city: 'Toronto', country: 'Canada' },
  { gd: 4, stage: 'round_of_32', group: null, home: '3rd Place Team 1', away: '3rd Place Team 2', hf: '🥉', af: '🥉', kickoff: '2026-07-02T19:00:00Z', venue: 'Estadio Azteca', city: 'Mexico City', country: 'Mexico' },
  { gd: 4, stage: 'round_of_32', group: null, home: '3rd Place Team 3', away: '3rd Place Team 4', hf: '🥉', af: '🥉', kickoff: '2026-07-02T22:00:00Z', venue: 'Estadio Akron', city: 'Zapopan', country: 'Mexico' },
  { gd: 4, stage: 'round_of_32', group: null, home: '3rd Place Team 5', away: '3rd Place Team 6', hf: '🥉', af: '🥉', kickoff: '2026-07-03T01:00:00Z', venue: 'Lincoln Financial Field', city: 'Philadelphia', country: 'USA' },
  { gd: 4, stage: 'round_of_32', group: null, home: '3rd Place Team 7', away: '3rd Place Team 8', hf: '🥉', af: '🥉', kickoff: '2026-07-03T16:00:00Z', venue: 'Estadio Guadalupe', city: 'Guadalupe', country: 'Mexico' },

  // Game Day 5 - Round of 16 (8 matches)
  { gd: 5, stage: 'round_of_16', group: null, home: 'R32 Winner 1', away: 'R32 Winner 2', hf: '⚽', af: '⚽', kickoff: '2026-07-04T19:00:00Z', venue: 'SoFi Stadium', city: 'Los Angeles', country: 'USA' },
  { gd: 5, stage: 'round_of_16', group: null, home: 'R32 Winner 3', away: 'R32 Winner 4', hf: '⚽', af: '⚽', kickoff: '2026-07-04T22:00:00Z', venue: 'Gillette Stadium', city: 'Boston', country: 'USA' },
  { gd: 5, stage: 'round_of_16', group: null, home: 'R32 Winner 5', away: 'R32 Winner 6', hf: '⚽', af: '⚽', kickoff: '2026-07-05T01:00:00Z', venue: 'NRG Stadium', city: 'Houston', country: 'USA' },
  { gd: 5, stage: 'round_of_16', group: null, home: 'R32 Winner 7', away: 'R32 Winner 8', hf: '⚽', af: '⚽', kickoff: '2026-07-05T16:00:00Z', venue: 'MetLife Stadium', city: 'New Jersey', country: 'USA' },
  { gd: 5, stage: 'round_of_16', group: null, home: 'R32 Winner 9', away: 'R32 Winner 10', hf: '⚽', af: '⚽', kickoff: '2026-07-05T19:00:00Z', venue: 'AT&T Stadium', city: 'Arlington', country: 'USA' },
  { gd: 5, stage: 'round_of_16', group: null, home: 'R32 Winner 11', away: 'R32 Winner 12', hf: '⚽', af: '⚽', kickoff: '2026-07-05T22:00:00Z', venue: 'Hard Rock Stadium', city: 'Miami', country: 'USA' },
  { gd: 5, stage: 'round_of_16', group: null, home: 'R32 Winner 13', away: 'R32 Winner 14', hf: '⚽', af: '⚽', kickoff: '2026-07-06T01:00:00Z', venue: 'BC Place', city: 'Vancouver', country: 'Canada' },
  { gd: 5, stage: 'round_of_16', group: null, home: 'R32 Winner 15', away: 'R32 Winner 16', hf: '⚽', af: '⚽', kickoff: '2026-07-06T16:00:00Z', venue: 'Levi\'s Stadium', city: 'Santa Clara', country: 'USA' },

  // Game Day 6 - Quarter-finals (4 matches)
  { gd: 6, stage: 'quarter_final', group: null, home: 'R16 Winner 1', away: 'R16 Winner 2', hf: '⚽', af: '⚽', kickoff: '2026-07-09T19:00:00Z', venue: 'SoFi Stadium', city: 'Los Angeles', country: 'USA' },
  { gd: 6, stage: 'quarter_final', group: null, home: 'R16 Winner 3', away: 'R16 Winner 4', hf: '⚽', af: '⚽', kickoff: '2026-07-10T01:00:00Z', venue: 'Gillette Stadium', city: 'Boston', country: 'USA' },
  { gd: 6, stage: 'quarter_final', group: null, home: 'R16 Winner 5', away: 'R16 Winner 6', hf: '⚽', af: '⚽', kickoff: '2026-07-10T19:00:00Z', venue: 'AT&T Stadium', city: 'Arlington', country: 'USA' },
  { gd: 6, stage: 'quarter_final', group: null, home: 'R16 Winner 7', away: 'R16 Winner 8', hf: '⚽', af: '⚽', kickoff: '2026-07-11T01:00:00Z', venue: 'Hard Rock Stadium', city: 'Miami', country: 'USA' },

  // Game Day 7 - Semi-finals (2 matches)
  { gd: 7, stage: 'semi_final', group: null, home: 'QF Winner 1', away: 'QF Winner 2', hf: '⚽', af: '⚽', kickoff: '2026-07-14T19:00:00Z', venue: 'MetLife Stadium', city: 'New Jersey', country: 'USA' },
  { gd: 7, stage: 'semi_final', group: null, home: 'QF Winner 3', away: 'QF Winner 4', hf: '⚽', af: '⚽', kickoff: '2026-07-15T19:00:00Z', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'USA' },

  // Game Day 8 - Third place + Final
  { gd: 8, stage: 'third_place', group: null, home: 'SF Loser 1', away: 'SF Loser 2', hf: '🥉', af: '🥉', kickoff: '2026-07-18T19:00:00Z', venue: 'Hard Rock Stadium', city: 'Miami', country: 'USA' },
  { gd: 8, stage: 'final', group: null, home: 'SF Winner 1', away: 'SF Winner 2', hf: '🏆', af: '🏆', kickoff: '2026-07-19T19:00:00Z', venue: 'MetLife Stadium', city: 'New Jersey', country: 'USA' },
];

function esc(s) {
  return s.replace(/'/g, "''");
}

let sql = `-- BMFC World Cup Predictor Seed Data
-- Generated automatically

INSERT INTO game_days (game_day, label, status, opened_at) VALUES
  (1, 'Group Stage — Matchday 1', 'open', now()),
  (2, 'Group Stage — Matchday 2', 'locked', NULL),
  (3, 'Group Stage — Matchday 3', 'locked', NULL),
  (4, 'Round of 32', 'locked', NULL),
  (5, 'Round of 16', 'locked', NULL),
  (6, 'Quarter-finals', 'locked', NULL),
  (7, 'Semi-finals', 'locked', NULL),
  (8, 'Third Place & Final', 'locked', NULL);

INSERT INTO fixtures (game_day, stage, group_name, home_team, away_team, home_flag, away_flag, kickoff_utc, venue, city, country, status) VALUES
`;

const rows = [];

for (const f of groupFixtures) {
  const [day, month, year] = f.date.split(' ');
  const kickoff = bstToUtc(`${day} ${month} ${year}`, f.time);
  const status = f.gd === 1 ? 'open' : 'upcoming';
  rows.push(
    `(${f.gd}, '${f.stage}', '${f.group}', '${esc(f.home)}', '${esc(f.away)}', '${f.hf}', '${f.af}', '${kickoff}', '${esc(f.venue)}', '${esc(f.city)}', '${esc(f.country)}', '${status}')`
  );
}

for (const f of knockoutFixtures) {
  rows.push(
    `(${f.gd}, '${f.stage}', NULL, '${esc(f.home)}', '${esc(f.away)}', '${f.hf}', '${f.af}', '${f.kickoff}', '${esc(f.venue)}', '${esc(f.city)}', '${esc(f.country)}', 'upcoming')`
  );
}

sql += rows.join(',\n') + ';\n';

const outPath = join(__dirname, '..', 'supabase', 'seed.sql');
writeFileSync(outPath, sql);
console.log(`Generated ${rows.length} fixtures to ${outPath}`);
