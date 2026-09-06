/*
 * Freelance-AI-practitioner contract review: real regex/heuristic clause
 * scanning (a redline pass) plus a computed rate benchmark. Not a legal
 * opinion, not literal AI-as-contract-party -- a text-pattern review a
 * human agent would still sign off on, same as any junior-associate
 * first pass.
 */

const CLAUSE_RULES = [
  {
    id: 'unlimited_liability',
    re: /unlimited\s+liability|no\s+cap\s+on\s+liability|without\s+limitation\s+.{0,20}liability/i,
    severity: 'high',
    note: 'Unlimited liability clause found. Redline: cap liability at total fees paid under this agreement (a standard freelance-market term).'
  },
  {
    id: 'broad_ip_assignment',
    re: /assign(?:s|ed)?\s+all\s+right,?\s*title\s*,?\s*and\s+interest|(?:all\s+)?work\s+product.{0,30}sole\s+and\s+exclusive\s+property/i,
    severity: 'medium',
    note: 'Broad IP assignment covering all work product (including pre-existing tools/frameworks). Redline: carve out contractor\'s pre-existing IP and general-purpose tooling from the assignment.'
  },
  {
    id: 'net_90_payment',
    re: /net\s*-?\s*90/i,
    severity: 'high',
    note: 'Net-90 payment terms found. Redline: request Net-30 (industry-standard for independent contractors) or partial upfront payment.'
  },
  {
    id: 'net_60_payment',
    re: /net\s*-?\s*60/i,
    severity: 'medium',
    note: 'Net-60 payment terms found. Redline: request Net-30 where possible.'
  },
  {
    id: 'noncompete',
    re: /non-?compete|shall\s+not\s+.{0,20}(?:engage|work)\s+.{0,20}(?:similar|competing)/i,
    severity: 'high',
    note: 'Non-compete clause found. Many jurisdictions restrict enforceability against independent contractors -- redline to a narrower non-solicitation of this specific client\'s named accounts only, time-boxed to 6-12 months.'
  },
  {
    id: 'unilateral_termination',
    re: /terminate.{0,30}sole\s+discretion|terminate.{0,30}without\s+cause\s+.{0,20}immediately/i,
    severity: 'medium',
    note: 'One-sided immediate termination-for-convenience clause. Redline: add a kill fee or notice period (commonly 2-4 weeks) covering work already scoped.'
  },
  {
    id: 'no_kill_fee',
    re: /terminate.{0,60}(?:without|no)\s+(?:notice|compensation|kill\s+fee)/i,
    severity: 'medium',
    note: 'No kill fee on early termination. Redline: add a kill fee covering committed/in-progress work.'
  },
  {
    id: 'indemnification_broad',
    re: /indemnify\s+and\s+hold\s+harmless.{0,60}(?:any|all)\s+claims/i,
    severity: 'medium',
    note: 'Broad indemnification clause. Redline: limit indemnification to claims arising from contractor\'s gross negligence or willful misconduct, not all claims generally.'
  },
  {
    id: 'unlimited_revisions',
    re: /unlimited\s+revisions|revisions?\s+until\s+(?:satisfied|approved)/i,
    severity: 'low',
    note: 'Unlimited/open-ended revision clause. Redline: cap revision rounds (e.g. 3 rounds included, additional rounds billed hourly).'
  }
];

function reviewContract(text) {
  if (!text || text.trim().length === 0) {
    throw new Error('No contract text provided');
  }
  const flagged = CLAUSE_RULES
    .filter(rule => rule.re.test(text))
    .map(rule => ({ id: rule.id, severity: rule.severity, note: rule.note }));

  const order = { high: 0, medium: 1, low: 2 };
  flagged.sort((a, b) => order[a.severity] - order[b.severity]);

  const severityCounts = { high: 0, medium: 0, low: 0 };
  flagged.forEach(f => severityCounts[f.severity]++);

  let overallRisk;
  if (severityCounts.high >= 2) overallRisk = 'high';
  else if (severityCounts.high === 1 || severityCounts.medium >= 2) overallRisk = 'medium';
  else if (flagged.length > 0) overallRisk = 'low';
  else overallRisk = 'minimal';

  return { overallRisk, severityCounts, flaggedClauses: flagged, clauseCount: flagged.length };
}

// Real (if simplified) market-rate formula: a base hourly rate per
// specialty, scaled by years of experience with diminishing returns
// (sqrt curve, common in comp-benchmarking models to avoid linear
// blow-up at high experience), producing a range (+-15%).
const SPECIALTY_BASE_RATES = {
  'prompt-engineering': 85,
  'fine-tuning': 120,
  'ai-consulting': 150,
  'ml-engineering': 140,
  'data-annotation-ops': 55
};

function rateBenchmark({ specialty, yearsExperience, hoursPerWeek = 20 }) {
  const base = SPECIALTY_BASE_RATES[specialty];
  if (!base) {
    throw new Error(`Unknown specialty "${specialty}". Known: ${Object.keys(SPECIALTY_BASE_RATES).join(', ')}`);
  }
  if (yearsExperience < 0) throw new Error('yearsExperience must be >= 0');

  const experienceMultiplier = 1 + Math.sqrt(yearsExperience) * 0.18;
  const midRate = base * experienceMultiplier;
  const low = round2(midRate * 0.85);
  const high = round2(midRate * 1.15);

  const weeklyEstimate = round2(midRate * hoursPerWeek);

  return {
    specialty,
    yearsExperience,
    hourlyRateLow: low,
    hourlyRateMid: round2(midRate),
    hourlyRateHigh: high,
    weeklyEstimateAtMidRate: weeklyEstimate
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

if (typeof module !== 'undefined') {
  module.exports = { reviewContract, rateBenchmark, SPECIALTY_BASE_RATES };
}
