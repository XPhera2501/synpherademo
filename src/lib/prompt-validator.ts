// Prompt best-practice validation engine

export interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
}

export interface ValidationResult {
  score: number;
  checks: ValidationCheck[];
}

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
  const hasStructure = /\d+[\.\)]\s|[-•]\s|step\s?\d|first|second|third|finally/i.test(content);
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
