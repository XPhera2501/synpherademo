// Prompt best-practice validation engine + Prompt Determinism Analyzer
// (Ported from Prompt_Analyzer_2.py)

export interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
}

export interface ValidationResult {
  score: number;
  checks: ValidationCheck[];
}

// ============================================================
// Prompt Analysis types & engine (from Python analyzer)
// ============================================================

export interface PromptAnalysis {
  taskType: string;
  scores: Record<string, number>;
  determinismScore: number;
  flags: Record<string, boolean>;
  components: { instructions: string[]; constraints: string[]; context: string[] };
  routing: { allocation: Record<string, number>; rationale: Record<string, string> };
}

const REGEX_PATTERNS: Record<string, RegExp> = {
  calculation: /\b(calculate|sum|average|percent|ratio|mean)\b/i,
  transformation: /\b(convert|transform|map|normalize|format)\b/i,
  validation: /\b(validate|check|verify|ensure|confirm)\b/i,
  retrieval: /\b(fetch|retrieve|lookup|find|search)\b/i,
  creative: /\b(write|draft|create|generate|brainstorm)\b/i,
  policy: /\b(should|must we|is it allowed|compliant|legal)\b/i,
  hard_constraints: /\b(exactly|must equal|no deviation|strictly)\b/i,
  pii: /\b(ssn|social security|email|phone number|credit card)\b/i,
  finance: /\b(revenue|profit|balance sheet|forecast)\b/i,
  legal: /\b(contract|liability|nda|compliance)\b/i,
  medical: /\b(diagnosis|patient|treatment|hipaa)\b/i,
};

// AST-like parse: split sentences into instructions, constraints, context
function astLikeParse(prompt: string) {
  const instructions: string[] = [];
  const constraints: string[] = [];
  const context: string[] = [];

  const sentences = prompt.split(/[.;]/).map(s => s.trim()).filter(Boolean);
  for (const s of sentences) {
    if (REGEX_PATTERNS.hard_constraints.test(s)) {
      constraints.push(s);
    } else if (/\b(please|should|must|do)\b/i.test(s)) {
      instructions.push(s);
    } else {
      context.push(s);
    }
  }
  return { instructions, constraints, context };
}

// Task classification
function classifyTask(prompt: string): string {
  const taskKeys = ['calculation', 'transformation', 'validation', 'retrieval', 'creative', 'policy'];
  const scores: Record<string, number> = {};

  for (const key of taskKeys) {
    const matches = prompt.match(new RegExp(REGEX_PATTERNS[key].source, 'gi'));
    scores[key] = matches ? matches.length : 0;
  }

  const maxVal = Math.max(...Object.values(scores));
  if (maxVal === 0) return 'Creative / Generative';

  const mapping: Record<string, string> = {
    calculation: 'Calculation',
    transformation: 'Transformation',
    validation: 'Validation',
    retrieval: 'Retrieval',
    creative: 'Creative / Generative',
    policy: 'Policy / Judgment / Interpretation',
  };

  const best = Object.entries(scores).reduce((a, b) => (b[1] > a[1] ? b : a));
  return mapping[best[0]] || 'Creative / Generative';
}

// Axis scoring
function scoreAxes(prompt: string, taskType: string): Record<string, number> {
  const p = prompt.toLowerCase();
  return {
    determinism: ['Calculation', 'Validation', 'Transformation'].includes(taskType) ? 1.0 : 0.4,
    precision: REGEX_PATTERNS.hard_constraints.test(p) ? 1.0 : 0.5,
    explainability: ['Validation', 'Policy / Judgment / Interpretation'].includes(taskType) ? 1.0 : 0.6,
    latency: ['Calculation', 'Retrieval'].includes(taskType) ? 1.0 : 0.5,
    regulatory: ['finance', 'legal', 'medical'].some(k => REGEX_PATTERNS[k].test(p)) ? 1.0 : 0.3,
    creativity: taskType === 'Creative / Generative' ? 1.0 : 0.0,
  };
}

// Determinism score
function computeDeterminismScore(scores: Record<string, number>): number {
  const weighted =
    scores.determinism * 30 +
    scores.precision * 20 +
    scores.explainability * 15 +
    scores.latency * 10 +
    scores.regulatory * 15 -
    scores.creativity * 10;
  return Math.round(Math.max(0, Math.min(100, weighted)) * 10) / 10;
}

// Routing recommendation
function recommendRouting(determinismScore: number, scores: Record<string, number>, taskType: string, flags: Record<string, boolean>) {
  let cpp = determinismScore >= 80 ? 60 : determinismScore >= 60 ? 40 : 20;
  if (flags['Hard Constraints']) cpp += 15;
  if (flags['Regulated Domain']) cpp += 10;

  let llm = Math.round(scores.creativity * 40);
  if (taskType === 'Policy / Judgment / Interpretation') llm += 20;
  if (determinismScore < 60) llm += 15;

  const slm = Math.max(0, 100 - (cpp + llm));

  return {
    allocation: { 'C++': cpp, SLM: slm, LLM: llm },
    rationale: {
      'C++': 'Exact, deterministic, auditable logic',
      SLM: 'Structured language processing with low ambiguity',
      LLM: 'Interpretive, creative, or policy-based reasoning',
    },
  };
}

// Full analyzer
export function analyzePrompt(prompt: string): PromptAnalysis {
  const components = astLikeParse(prompt);
  const taskType = classifyTask(prompt);
  const scores = scoreAxes(prompt, taskType);
  const determinismScore = computeDeterminismScore(scores);
  const p = prompt.toLowerCase();

  const flags: Record<string, boolean> = {
    'PII Detected': REGEX_PATTERNS.pii.test(p),
    'Regulated Domain': ['finance', 'legal', 'medical'].some(k => REGEX_PATTERNS[k].test(p)),
    'Hard Constraints': REGEX_PATTERNS.hard_constraints.test(p),
  };

  const routing = recommendRouting(determinismScore, scores, taskType, flags);

  return { taskType, scores, determinismScore, flags, components, routing };
}

// ============================================================
// Original best-practice validation (unchanged)
// ============================================================

export function validatePromptBestPractices(content: string, title: string): ValidationResult {
  const checks: ValidationCheck[] = [];

  // 1. Length check
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  checks.push({
    name: 'length',
    passed: wordCount >= 10,
    message: wordCount < 10 ? 'Too short — aim for at least 10 words for clarity' : 'Sufficient length',
  });

  // 2. Specificity — contains action verbs
  const actionVerbs = /\b(analyze|classify|extract|summarize|generate|create|review|evaluate|compare|identify|list|describe|explain|provide|calculate|assess|recommend|suggest|determine|optimize)\b/i;
  checks.push({
    name: 'specificity',
    passed: actionVerbs.test(content),
    message: !actionVerbs.test(content) ? 'Add action verbs (analyze, classify, extract, etc.) for specificity' : 'Contains action verbs',
  });

  // 3. Structure — has numbered steps or sections
  const hasStructure = /\d+[.)]\s|[-•]\s|step\s?\d|first|second|third|finally/i.test(content);
  checks.push({
    name: 'structure',
    passed: hasStructure,
    message: !hasStructure ? 'Add numbered steps or bullet points for structured output' : 'Has structural markers',
  });

  // 4. Output format — specifies expected format
  const hasFormat = /\b(json|csv|markdown|table|list|format|schema|output|return|respond)\b/i.test(content);
  checks.push({
    name: 'format',
    passed: hasFormat,
    message: !hasFormat ? 'Specify expected output format (JSON, table, list, etc.)' : 'Output format specified',
  });

  // 5. Context/Role — sets context or role
  const hasContext = /\b(you are|act as|role|context|given|assume|as a|expert|specialist|professional)\b/i.test(content);
  checks.push({
    name: 'context',
    passed: hasContext,
    message: !hasContext ? 'Set context or role (e.g., "You are a data analyst...")' : 'Context/role defined',
  });

  // 6. Variables — uses placeholders
  const hasVariables = /\{\{.+?\}\}/.test(content);
  checks.push({
    name: 'variables',
    passed: hasVariables,
    message: !hasVariables ? 'Use {{variable}} placeholders for reusable, dynamic prompts' : 'Has dynamic placeholders',
  });

  // 7. Constraints — mentions limits or boundaries
  const hasConstraints = /\b(limit|maximum|minimum|at most|at least|no more than|within|constraint|boundary|must not|avoid|do not)\b/i.test(content);
  checks.push({
    name: 'constraints',
    passed: hasConstraints,
    message: !hasConstraints ? 'Add constraints or boundaries (e.g., "Limit response to 200 words")' : 'Has constraints defined',
  });

  // 8. Title quality
  const titleWords = title.split(/\s+/).filter(Boolean).length;
  checks.push({
    name: 'title',
    passed: titleWords >= 3,
    message: titleWords < 3 ? 'Title should be descriptive (at least 3 words)' : 'Descriptive title',
  });

  const passedCount = checks.filter(c => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  return { score, checks };
}
