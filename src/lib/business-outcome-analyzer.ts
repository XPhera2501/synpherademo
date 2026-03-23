import type { Json } from '@/integrations/supabase/types';
import type { ROICategory } from '@/lib/synphera-types';

export type BusinessOutcomeCategory =
  | 'Cost Savings'
  | 'Compliance Improvement'
  | 'Operational Velocity Improvement'
  | 'Risk Level Reduction'
  | 'Revenue Increase';

export type BusinessOutcomeResultCategory = BusinessOutcomeCategory | 'Unclassified';

export interface BusinessOutcomeSignal {
  type: 'token' | 'phrase';
  signal: string;
  category: BusinessOutcomeCategory;
  weight: number;
}

export interface BusinessOutcomeRanking {
  category: BusinessOutcomeResultCategory;
  confidence: number;
  suggestedRoiCategories: ROICategory[];
}

export interface DomainSignal {
  domain: string;
  count: number;
}

export interface BusinessOutcomeAnalysis {
  normalizedTokens: string[];
  matchedSignals: BusinessOutcomeSignal[];
  categoryScores: Record<BusinessOutcomeCategory, number>;
  benefitRanking: BusinessOutcomeRanking[];
  primaryBenefit: BusinessOutcomeResultCategory;
  primaryConfidence: number;
  domainSignals: DomainSignal[];
  ambiguityFlag: boolean;
  guidance: string;
  roiCategorySuggestions: ROICategory[];
}

export interface SuggestedROIEntryDraft {
  category: ROICategory;
  description: string;
}

class LightweightStemmer {
  private suffixes = ['ing', 'ed', 's', 'ion', 'ive', 'ment', 'ly', 'ability'];

  stem(word: string) {
    const normalized = word.toLowerCase();
    if (normalized.length <= 3) {
      return normalized;
    }

    for (const suffix of this.suffixes) {
      if (normalized.endsWith(suffix)) {
        return normalized.slice(0, -suffix.length);
      }
    }

    return normalized;
  }
}

const CATEGORY_WEIGHTS: Record<BusinessOutcomeCategory, Record<string, number>> = {
  'Cost Savings': {
    budget: 1.5,
    overhead: 2.0,
    expens: 1.8,
    reduc: 1.0,
    cost: 1.9,
    roi: 1.5,
    sav: 1.5,
    spend: 1.2,
    econom: 1.5,
    tco: 2.5,
    resale: 1.5,
    fuel: 1.5,
    consumpt: 1.5,
    resin: 2.0,
    ppv: 2.5,
    discount: 1.8,
    consolidat: 1.5,
    enterpris: 1.5,
    agreement: 1.2,
    rate: 1.3,
    card: 1.2,
    overpay: 2.0,
    negotiat: 1.5,
    spot: 1.5,
    market: 1.2,
    contract: 1.5,
    mile: 1.2,
    backhaul: 2.0,
    parcel: 1.5,
    packag: 1.5,
    optim: 1.8,
    blend: 1.2,
    hour: 1.0,
    senior: 1.5,
    junior: 1.5,
    bill: 1.5,
  },
  'Compliance Improvement': {
    regulat: 2.5,
    audit: 2.0,
    gdpr: 3.0,
    hipaa: 3.0,
    pdpa: 3.0,
    policy: 1.5,
    govern: 2.0,
    complian: 2.5,
    legal: 1.8,
    travel: 1.5,
    leakage: 2.0,
    untrack: 2.0,
    duplicat: 2.0,
    journal: 2.0,
    entrie: 1.8,
    trial: 2.0,
    balance: 2.0,
    deactivat: 2.0,
    gl: 2.5,
    variance: 1.5,
    report: 1.2,
    capit: 1.5,
    fx: 2.5,
    translat: 1.8,
    miss: 1.2,
    ar: 2.0,
    ap: 2.0,
    close: 1.5,
    sow: 2.5,
    credit: 1.5,
    sla: 2.5,
    invoice: 1.8,
    manual: 1.2,
    plug: 1.5,
  },
  'Operational Velocity Improvement': {
    automat: 1.8,
    throughput: 2.5,
    bottleneck: 2.5,
    workflow: 1.5,
    cycl: 2.0,
    speed: 1.2,
    streamlin: 1.8,
    efficien: 1.2,
    resolut: 1.5,
    window: 1.2,
    late: 1.2,
    deadlin: 1.5,
    machine: 1.5,
    line: 1.2,
    clog: 2.0,
    lead: 1.5,
    time: 1.0,
    capac: 1.5,
    floor: 1.5,
    moq: 2.5,
    order: 1.5,
    frequen: 1.5,
  },
  'Risk Level Reduction': {
    mitigat: 2.5,
    threat: 2.0,
    vulnerab: 2.5,
    secur: 1.5,
    exposur: 2.0,
    liabil: 2.0,
    risk: 1.0,
    safeguard: 2.0,
    obsolet: 2.0,
    inventori: 1.5,
    reserv: 1.5,
    sensit: 1.8,
    curren: 1.5,
    cta: 2.5,
    ecovadi: 3.0,
    esg: 3.0,
    safeti: 2.0,
    carbon: 2.5,
    tax: 1.8,
    footprint: 2.0,
    anomali: 2.0,
    telemat: 2.5,
    brak: 2.0,
    transaction: 1.5,
    churn: 2.5,
    qualit: 1.5,
    log: 1.2,
    predict: 1.8,
  },
  'Revenue Increase': {
    growth: 1.5,
    upsell: 2.5,
    sale: 2.0,
    monetiz: 3.0,
    convers: 2.0,
    profit: 1.8,
    acquisit: 1.8,
    revenu: 1.5,
    green: 1.8,
    transit: 1.5,
    recycl: 1.8,
    quot: 1.5,
    bid: 1.5,
    margin: 2.0,
    price: 1.8,
    notif: 1.5,
    raw: 1.5,
    claus: 1.5,
    unit: 1.2,
    ebitda: 3.0,
    impact: 1.2,
    net: 1.0,
    target: 1.5,
  },
};

const CATEGORY_PHRASES: Record<BusinessOutcomeCategory, Record<string, number>> = {
  'Cost Savings': {
    'total cost of ownership': 3.0,
    'cost reduction': 2.5,
    'spend consolidation': 2.2,
    'fuel consumption': 2.0,
    'supplier discount': 2.0,
  },
  'Compliance Improvement': {
    'audit readiness': 3.0,
    'invoice reconciliation': 2.5,
    'trial balance': 2.5,
    'month end close': 2.2,
    'policy compliance': 2.8,
  },
  'Operational Velocity Improvement': {
    'cycle time': 2.8,
    'lead time': 2.5,
    'workflow automation': 2.5,
    'process bottleneck': 2.8,
    'throughput improvement': 2.6,
  },
  'Risk Level Reduction': {
    'supplier risk': 2.8,
    'carbon footprint': 2.8,
    'security exposure': 2.5,
    'inventory obsolescence': 2.5,
    'customer churn': 2.5,
  },
  'Revenue Increase': {
    'revenue growth': 3.0,
    'price optimization': 2.6,
    'margin improvement': 2.8,
    'customer acquisition': 2.4,
    'upsell opportunity': 2.8,
  },
};

const DOMAIN_KEYWORDS: Record<string, Set<string>> = {
  Finance: new Set(['invoice', 'journal', 'trial', 'balance', 'gl', 'ar', 'ap', 'fx', 'ebitda']),
  Procurement: new Set(['supplier', 'contract', 'discount', 'spend', 'agreement', 'negotiat', 'sow']),
  Logistics: new Set(['freight', 'parcel', 'mile', 'backhaul', 'route', 'packag', 'fleet']),
  Operations: new Set(['workflow', 'throughput', 'bottleneck', 'cycl', 'lead', 'machine', 'capac']),
  'Risk & Security': new Set(['risk', 'mitigat', 'threat', 'vulnerab', 'secur', 'exposur', 'safeguard']),
  ESG: new Set(['esg', 'carbon', 'footprint', 'tax', 'ecovadi', 'recycl', 'green']),
  Sales: new Set(['sale', 'quot', 'bid', 'upsell', 'margin', 'price', 'revenu', 'growth']),
};

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'your', 'you',
  'are', 'was', 'were', 'will', 'have', 'has', 'had', 'our', 'their', 'them',
  'about', 'help', 'need', 'want', 'please', 'could', 'would', 'should',
]);

const ROI_CATEGORY_MAP: Record<BusinessOutcomeCategory, ROICategory[]> = {
  'Cost Savings': ['Cost Savings'],
  'Compliance Improvement': ['Risk Mitigation'],
  'Operational Velocity Improvement': ['Time Savings', 'Efficiency'],
  'Risk Level Reduction': ['Risk Mitigation'],
  'Revenue Increase': ['New Value'],
};

const CATEGORY_GUIDANCE: Record<BusinessOutcomeCategory, string> = {
  'Cost Savings': 'State the spend area and expected savings driver, such as overhead, contract spend, or fuel usage.',
  'Compliance Improvement': 'Name the control, audit, policy, or reporting requirement the prompt should improve.',
  'Operational Velocity Improvement': 'Specify the process stage and the speed metric, such as throughput, cycle time, or lead time.',
  'Risk Level Reduction': 'Name the exposure to reduce, such as supplier risk, security exposure, or ESG risk.',
  'Revenue Increase': 'Call out the growth lever, such as pricing, upsell, margin, conversion, or acquisition.',
};

const stemmer = new LightweightStemmer();
const BUSINESS_OUTCOME_CATEGORIES = Object.keys(CATEGORY_WEIGHTS) as BusinessOutcomeCategory[];

function normalizeText(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function tokenize(text: string) {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  return words
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .map((word) => stemmer.stem(word));
}

function matchPhrases(text: string) {
  const normalizedText = normalizeText(text);
  const matches: BusinessOutcomeSignal[] = [];

  for (const category of BUSINESS_OUTCOME_CATEGORIES) {
    for (const [phrase, weight] of Object.entries(CATEGORY_PHRASES[category])) {
      if (normalizedText.includes(phrase)) {
        matches.push({ type: 'phrase', signal: phrase, category, weight });
      }
    }
  }

  return matches;
}

function scorePrompt(text: string) {
  const tokens = tokenize(text);
  const scores = BUSINESS_OUTCOME_CATEGORIES.reduce((accumulator, category) => {
    accumulator[category] = 0;
    return accumulator;
  }, {} as Record<BusinessOutcomeCategory, number>);
  const matchedSignals: BusinessOutcomeSignal[] = [];

  for (const token of tokens) {
    for (const category of BUSINESS_OUTCOME_CATEGORIES) {
      const weight = CATEGORY_WEIGHTS[category][token];
      if (weight) {
        scores[category] += weight;
        matchedSignals.push({ type: 'token', signal: token, category, weight });
      }
    }
  }

  for (const match of matchPhrases(text)) {
    scores[match.category] += match.weight;
    matchedSignals.push(match);
  }

  return { tokens, scores, matchedSignals };
}

function detectDomains(tokens: string[]) {
  const domainCounts = new Map<string, number>();

  for (const token of tokens) {
    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      if (keywords.has(token)) {
        domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
      }
    }
  }

  return Array.from(domainCounts.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 3);
}

function buildGuidance(tokens: string[], rankedResults: Array<[BusinessOutcomeResultCategory, number]>) {
  if (rankedResults.length === 0 || rankedResults[0][0] === 'Unclassified') {
    return 'Clarify the intended business outcome. Add one action, one target process, and one measurable benefit such as cost, cycle time, compliance, risk, or revenue.';
  }

  const [topCategory, topConfidence] = rankedResults[0];
  if (
    rankedResults.length > 1 &&
    rankedResults[1][0] !== 'Unclassified' &&
    Math.abs(topConfidence - rankedResults[1][1]) <= 0.12
  ) {
    return 'The prompt mixes multiple outcomes. Make the primary intent explicit by stating whether the goal is cost reduction, compliance improvement, operational speed, risk reduction, or revenue growth.';
  }

  if (topCategory === 'Unclassified') {
    return 'Clarify the intended business outcome. Add one action, one target process, and one measurable benefit such as cost, cycle time, compliance, risk, or revenue.';
  }

  if (tokens.length < 6) {
    return `${CATEGORY_GUIDANCE[topCategory]} Add more operational detail so the classifier has stronger signal.`;
  }

  return CATEGORY_GUIDANCE[topCategory];
}

export function analyzeBusinessOutcome(text: string): BusinessOutcomeAnalysis {
  const { tokens, scores, matchedSignals } = scorePrompt(text);
  const totalScore = Object.values(scores).reduce((sum, value) => sum + value, 0);

  const rankedResults: Array<[BusinessOutcomeResultCategory, number]> = totalScore === 0
    ? [['Unclassified', 0]]
    : BUSINESS_OUTCOME_CATEGORIES
        .map((category) => [category, Number((scores[category] / totalScore).toFixed(3))] as [BusinessOutcomeCategory, number])
        .filter(([, confidence]) => confidence > 0)
        .sort((left, right) => right[1] - left[1])
        .slice(0, 3);

  const primaryBenefit = rankedResults[0]?.[0] || 'Unclassified';
  const primaryConfidence = rankedResults[0]?.[1] || 0;
  const ambiguityFlag =
    rankedResults.length > 1 &&
    primaryBenefit !== 'Unclassified' &&
    Math.abs(primaryConfidence - rankedResults[1][1]) <= 0.12;
  const roiCategorySuggestions = primaryBenefit === 'Unclassified'
    ? []
    : ROI_CATEGORY_MAP[primaryBenefit as BusinessOutcomeCategory];

  return {
    normalizedTokens: tokens,
    matchedSignals,
    categoryScores: scores,
    benefitRanking: rankedResults.map(([category, confidence]) => ({
      category,
      confidence,
      suggestedRoiCategories: category === 'Unclassified' ? [] : ROI_CATEGORY_MAP[category],
    })),
    primaryBenefit,
    primaryConfidence,
    domainSignals: detectDomains(tokens),
    ambiguityFlag,
    guidance: buildGuidance(tokens, rankedResults),
    roiCategorySuggestions,
  };
}

function isJsonObject(value: Json | null | undefined): value is Record<string, Json | undefined> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function extractSavedBusinessOutcome(metadata: Json | null | undefined): BusinessOutcomeAnalysis | null {
  if (!isJsonObject(metadata)) {
    return null;
  }

  const semanticClassification = metadata.semanticClassification;
  if (!isJsonObject(semanticClassification)) {
    return null;
  }

  const primaryBenefit = semanticClassification.primaryBenefit;
  const primaryConfidence = semanticClassification.primaryConfidence;
  const guidance = semanticClassification.guidance;
  const ambiguityFlag = semanticClassification.ambiguityFlag;

  if (
    typeof primaryBenefit !== 'string' ||
    typeof primaryConfidence !== 'number' ||
    typeof guidance !== 'string' ||
    typeof ambiguityFlag !== 'boolean'
  ) {
    return null;
  }

  return semanticClassification as unknown as BusinessOutcomeAnalysis;
}

export function buildSuggestedROIEntries(analysis: BusinessOutcomeAnalysis): SuggestedROIEntryDraft[] {
  if (analysis.primaryBenefit === 'Unclassified') {
    return [];
  }

  return analysis.roiCategorySuggestions.map((category) => ({
    category,
    description: `Suggested from semantic classifier: ${analysis.primaryBenefit} (${(analysis.primaryConfidence * 100).toFixed(1)}% confidence). ${analysis.guidance}`,
  }));
}