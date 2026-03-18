// Synphera V13 Enhanced - Type Definitions

export type SecurityStatus = 'GREEN' | 'AMBER' | 'RED' | 'PENDING';
export type AssetStatus = 'draft' | 'created' | 'in_review' | 'approved';
export type ROICategory = 'Time Savings' | 'Risk Mitigation' | 'Efficiency' | 'Cost Savings' | 'New Value';
export type Department = 'Operations' | 'Legal' | 'R&D' | 'Marketing' | 'Finance' | 'HR' | 'IT' | 'Executive';

export interface Reviewer {
  id: string;
  name: string;
  department: Department;
  avatar: string;
}

export interface ROIFact {
  id: string;
  assetId: string;
  category: ROICategory;
  value: number;
  description?: string;
}

export interface SecurityFinding {
  type: 'email' | 'phone' | 'iban' | 'passport' | 'health' | 'criminal' | 'proprietary' | 'ssn' | 'credit_card';
  value: string;
  hash: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  line?: number;
}

export interface ScanResult {
  status: SecurityStatus;
  findings: SecurityFinding[];
  timestamp: Date;
  scanDuration: number;
}

export interface PromptAsset {
  id: string;
  title: string;
  content: string;
  version: number;
  status: AssetStatus;
  parentId: string | null;
  assignedTo: string | null;
  createdBy: string;
  department: Department;
  createdAt: Date;
  updatedAt: Date;
  securityStatus: SecurityStatus;
  lastScanResult?: ScanResult;
  justification?: string;
  commitMessage?: string;
  isLocked?: boolean;
}

export interface VersionSnapshot {
  id: string;
  assetId: string;
  version: number;
  content: string;
  title: string;
  commitMessage: string;
  userId: string;
  timestamp: Date;
}

export interface LineageEntry {
  id: string;
  assetId: string;
  parentId: string | null;
  action: 'created' | 'approved' | 'updated';
  timestamp: Date;
  userId: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  type: 'zero-shot' | 'few-shot' | 'chain-of-thought' | 'role-play' | 'structured';
  content: string;
  variables: string[];
  department?: Department;
}

export const REVIEWERS: Reviewer[] = [
  { id: 'marcus', name: 'Marcus Chen', department: 'Operations', avatar: '👨‍💼' },
  { id: 'sarah', name: 'Sarah Jenkins', department: 'Legal', avatar: '👩‍⚖️' },
  { id: 'aris', name: 'Dr. Aris Thorne', department: 'R&D', avatar: '🧑‍🔬' },
  { id: 'elena', name: 'Elena Rossi', department: 'Marketing', avatar: '👩‍💻' },
];

export const ROI_CATEGORIES: ROICategory[] = [
  'Time Savings',
  'Risk Mitigation',
  'Efficiency',
  'Cost Savings',
  'New Value',
];

export const DEPARTMENTS: Department[] = [
  'Operations',
  'Legal',
  'R&D',
  'Marketing',
  'Finance',
  'HR',
  'IT',
  'Executive'
];

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'zero-shot-analysis',
    name: 'Zero-Shot Analysis',
    description: 'Direct instruction without examples — best for straightforward tasks',
    type: 'zero-shot',
    content: 'Analyze the following {{input_type}} and provide:\n1. Key findings\n2. Recommendations\n3. Risk assessment\n\nInput:\n{{content}}\n\nProvide your analysis in {{output_format}} format.',
    variables: ['input_type', 'content', 'output_format'],
  },
  {
    id: 'few-shot-classifier',
    name: 'Few-Shot Classifier',
    description: 'Pattern learning from examples — best for classification & categorization',
    type: 'few-shot',
    content: 'Classify the following {{item_type}} into one of these categories: {{categories}}\n\nExamples:\n- "{{example_1}}" → {{label_1}}\n- "{{example_2}}" → {{label_2}}\n\nNow classify:\n"{{input}}"\n\nCategory:',
    variables: ['item_type', 'categories', 'example_1', 'label_1', 'example_2', 'label_2', 'input'],
  },
  {
    id: 'chain-of-thought',
    name: 'Chain-of-Thought Reasoning',
    description: 'Step-by-step reasoning for complex problems',
    type: 'chain-of-thought',
    content: 'You are a {{role}} solving the following problem:\n\n{{problem_statement}}\n\nThink through this step-by-step:\n1. First, identify the key factors\n2. Then, analyze relationships between them\n3. Consider edge cases and constraints\n4. Arrive at a well-reasoned conclusion\n\nContext: {{context}}\n\nShow your reasoning before giving the final answer.',
    variables: ['role', 'problem_statement', 'context'],
  },
  {
    id: 'role-play-advisor',
    name: 'Expert Role-Play',
    description: 'Persona-based prompting for domain expertise',
    type: 'role-play',
    content: 'You are {{expert_name}}, a senior {{expertise_area}} with {{years}} years of experience at {{company_type}} organizations.\n\nYour communication style is: {{style}}\n\nA colleague asks:\n"{{question}}"\n\nRespond in character, drawing on your deep expertise. Be specific and actionable.',
    variables: ['expert_name', 'expertise_area', 'years', 'company_type', 'style', 'question'],
  },
  {
    id: 'structured-output',
    name: 'Structured Output Generator',
    description: 'Enforces a specific output schema — great for data extraction',
    type: 'structured',
    content: 'Extract the following information from the provided {{source_type}}:\n\nRequired fields:\n{{#each fields}}\n- {{field_name}}: {{field_description}}\n{{/each}}\n\nSource:\n{{source_content}}\n\nReturn ONLY a valid JSON object matching this schema:\n```json\n{\n  {{schema}}\n}\n```',
    variables: ['source_type', 'fields', 'source_content', 'schema'],
  },
];
