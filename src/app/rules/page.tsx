import type { Metadata } from 'next';
import { DAILY_MATCHUP_CAP, FINALIST_COUNT, MIN_JUDGED, QUESTIONS, SITE_NAME } from '@/lib/config';

export const metadata: Metadata = { title: 'Rules' };

// DRAFT. This page describes how the software works. It is not a substitute
// for official contest rules reviewed by a promotions attorney.
export default function Rules() {
  return (
    <main className="narrow prose">
      <h1 className="h1">How {SITE_NAME} is judged</h1>
      <div className="notice" style={{ marginTop: 24 }}>
        Draft. Official rules, eligibility and prize terms will be published here before the season prizes are confirmed.
      </div>

      <h2>Entering</h2>
      <p>
        Buying a section for the season enters your ad. Your ad joins the matchup pool when you publish it. Sections
        reset when the season ends. A section is advertising space, not an investment.
      </p>

      <h2>How ads are judged</h2>
      <ul>
        <li>Signed-in voters are shown two ads chosen at random by the system. Voters cannot choose which ads they see.</li>
        <li>Best Ad matchups ask: &ldquo;{QUESTIONS.ad}&rdquo; Best Platform matchups ask: &ldquo;{QUESTIONS.platform}&rdquo;</li>
        <li>Ads are ranked by win rate: matchups won divided by matchups judged. Raw vote totals do not decide rank.</li>
        <li>An ad needs {MIN_JUDGED} judged matchups before it ranks above ads that have fewer.</li>
        <li>Best Newcomer ranks the Best Ad results for sections claimed in the second half of the season.</li>
      </ul>

      <h2>Vote integrity</h2>
      <ul>
        <li>One account per person. Each account can judge up to {DAILY_MATCHUP_CAP} matchups in 24 hours.</li>
        <li>You are never shown a matchup that includes your own ad, and you cannot vote for your own ad.</li>
        <li>Votes cannot be bought, and spending more on a section does not add votes.</li>
        <li>We may remove votes or ads that come from fake accounts, automation, or paid voting.</li>
      </ul>

      <h2>The final</h2>
      <p>
        When community voting closes, the top {FINALIST_COUNT} ads in each category become finalists. Each section
        owner gets one vote per category among the finalists. The ad with the most owner votes wins the category.
      </p>

      <h2>Prizes</h2>
      <p>
        Prize amounts are fixed and announced before the season starts. They do not grow with section sales. Prizes
        are paid in XRP to the winning section owner.
      </p>
    </main>
  );
}
