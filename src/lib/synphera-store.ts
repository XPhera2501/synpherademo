// Synphera V13 Enhanced - Local Storage Data Store
import { PromptAsset, ROIFact, LineageEntry, Department, ROICategory, VersionSnapshot, REVIEWERS, DEPARTMENTS, ROI_CATEGORIES } from './synphera-types';

interface LineageTreeNode {
  name: string;
  fullTitle: string;
  department: Department;
  version: number;
  status: PromptAsset['status'];
  value: number;
  children: LineageTreeNode[];
}

const STORAGE_KEYS = {
  assets: 'synphera_assets',
  roiFacts: 'synphera_roi_facts',
  lineage: 'synphera_lineage',
  currentUser: 'synphera_current_user',
  versions: 'synphera_versions',
};

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function randomDate(monthsBack: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - Math.random() * monthsBack, Math.floor(Math.random() * 28) + 1);
}

const SAMPLE_PROMPTS = [
  { title: "Customer Sentiment Analysis Prompt", content: "Analyze the following customer feedback and categorize sentiment as positive, neutral, or negative. Extract key themes and pain points. Provide actionable recommendations for the product team.", dept: "Marketing" as Department },
  { title: "Legal Contract Review Assistant", content: "Review the attached contract for potential risks, non-standard clauses, and compliance issues. Flag any terms that deviate from our standard templates. Summarize key obligations and deadlines.", dept: "Legal" as Department },
  { title: "Supply Chain Optimization Query", content: "Given the current inventory levels and demand forecast, suggest optimal reorder points and quantities. Consider lead times, storage costs, and service level targets.", dept: "Operations" as Department },
  { title: "R&D Literature Synthesis", content: "Synthesize the findings from these research papers on {{topic}}. Identify consensus views, conflicting results, and gaps in current knowledge. Suggest next steps for our research agenda.", dept: "R&D" as Department },
  { title: "Financial Forecast Generator", content: "Based on the provided historical data and market assumptions, generate a 12-month revenue forecast. Include best-case, base-case, and worst-case scenarios with confidence intervals.", dept: "Finance" as Department },
  { title: "HR Policy Q&A Bot Prompt", content: "Answer employee questions about company policies accurately and empathetically. Reference specific policy documents when applicable. Escalate complex issues to HR representatives.", dept: "HR" as Department },
  { title: "IT Incident Triage Assistant", content: "Classify incoming support tickets by severity and category. Suggest initial troubleshooting steps. Route to appropriate team based on issue type and priority.", dept: "IT" as Department },
  { title: "Executive Summary Generator", content: "Transform detailed reports into concise executive summaries. Highlight key metrics, risks, opportunities, and recommended actions. Limit to one page.", dept: "Executive" as Department },
  { title: "Compliance Audit Checklist", content: "Generate a comprehensive audit checklist for {{regulation}}. Map controls to requirements. Identify evidence needed for each control point.", dept: "Legal" as Department },
  { title: "Marketing Campaign Ideation", content: "Generate creative campaign concepts for {{product_name}}. Consider target audience, brand voice, and competitive landscape. Include channel recommendations.", dept: "Marketing" as Department },
  { title: "Process Documentation Writer", content: "Document the following business process in standard operating procedure format. Include roles, responsibilities, inputs, outputs, and exception handling.", dept: "Operations" as Department },
  { title: "Technical Spec Reviewer", content: "Review technical specifications for completeness, clarity, and feasibility. Identify ambiguities, missing requirements, and potential implementation challenges.", dept: "R&D" as Department },
  { title: "Budget Variance Analyzer", content: "Analyze budget vs. actual variances for the reporting period. Identify significant deviations, root causes, and corrective actions needed.", dept: "Finance" as Department },
  { title: "Employee Onboarding Guide", content: "Create a personalized onboarding checklist for new hires based on their role and department. Include required training, system access, and key contacts.", dept: "HR" as Department },
  { title: "Security Alert Summarizer", content: "Summarize security alerts and logs from the past 24 hours. Prioritize by risk level. Recommend immediate actions for critical findings.", dept: "IT" as Department },
  { title: "Board Presentation Builder", content: "Structure a board presentation covering quarterly performance, strategic initiatives, and forward outlook. Include relevant visualizations and talking points.", dept: "Executive" as Department },
  { title: "Vendor Evaluation Matrix", content: "Create a weighted evaluation matrix for vendor proposals. Score against defined criteria. Provide recommendation with supporting rationale.", dept: "Operations" as Department },
  { title: "Patent Landscape Analyzer", content: "Analyze the patent landscape for {{technology_area}}. Identify key players, emerging trends, and white space opportunities for innovation.", dept: "R&D" as Department },
  { title: "Risk Assessment Framework", content: "Assess risks for {{initiative}} using standard risk matrix. Quantify impact and likelihood. Propose mitigation strategies.", dept: "Legal" as Department },
  { title: "Content Personalization Engine", content: "Generate personalized content recommendations based on user behavior and preferences. Optimize for engagement while respecting privacy settings.", dept: "Marketing" as Department },
  { title: "Cash Flow Projector", content: "Project cash flows for the next 90 days based on receivables, payables, and planned expenditures. Flag potential liquidity constraints.", dept: "Finance" as Department },
  { title: "Performance Review Synthesizer", content: "Synthesize peer feedback and manager observations into constructive performance review summaries. Highlight strengths and development areas.", dept: "HR" as Department },
  { title: "System Migration Planner", content: "Create a detailed migration plan for {{system_name}}. Include dependencies, rollback procedures, testing requirements, and communication plan.", dept: "IT" as Department },
  { title: "Strategic Initiative Tracker", content: "Track progress on strategic initiatives against milestones. Generate status reports highlighting achievements, blockers, and resource needs.", dept: "Executive" as Department },
];

export function seedDatabase(): void {
  const existingAssets = getAssets();
  if (existingAssets.length > 0) return;
  
  const assets: PromptAsset[] = [];
  const roiFacts: ROIFact[] = [];
  const lineage: LineageEntry[] = [];
  const versions: VersionSnapshot[] = [];
  
  SAMPLE_PROMPTS.forEach((sample, index) => {
    const assetId = generateId();
    const createdAt = randomDate(10);
    const isApproved = Math.random() > 0.3;
    const isCreated = !isApproved && Math.random() > 0.5;
    const creator = REVIEWERS[Math.floor(Math.random() * REVIEWERS.length)];
    
    const asset: PromptAsset = {
      id: assetId,
      title: sample.title,
      content: sample.content,
      version: 1.0,
      status: isApproved ? 'approved' : isCreated ? 'created' : 'draft',
      parentId: null,
      assignedTo: isCreated ? REVIEWERS[Math.floor(Math.random() * REVIEWERS.length)].id : null,
      createdBy: creator.id,
      department: sample.dept,
      createdAt,
      updatedAt: createdAt,
      securityStatus: isApproved ? 'GREEN' : 'PENDING',
      commitMessage: 'Initial creation',
      isLocked: isApproved && Math.random() > 0.6,
    };
    
    assets.push(asset);
    
    // Version snapshot
    versions.push({
      id: generateId(),
      assetId,
      version: 1.0,
      content: sample.content,
      title: sample.title,
      commitMessage: 'Initial creation',
      userId: creator.id,
      timestamp: createdAt,
    });
    
    const numFacts = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numFacts; i++) {
      const category = ROI_CATEGORIES[Math.floor(Math.random() * ROI_CATEGORIES.length)];
      roiFacts.push({
        id: generateId(),
        assetId,
        category,
        value: Math.round((Math.random() * 50000 + 5000) / 100) * 100,
      });
    }
    
    lineage.push({
      id: generateId(),
      assetId,
      parentId: null,
      action: 'created',
      timestamp: createdAt,
      userId: creator.id,
    });
    
    if (isApproved) {
      lineage.push({
        id: generateId(),
        assetId,
        parentId: null,
        action: 'approved',
        timestamp: new Date(createdAt.getTime() + 86400000 * Math.floor(Math.random() * 7)),
        userId: creator.id,
      });
    }
  });
  
  
  localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(assets));
  localStorage.setItem(STORAGE_KEYS.roiFacts, JSON.stringify(roiFacts));
  localStorage.setItem(STORAGE_KEYS.lineage, JSON.stringify(lineage));
  localStorage.setItem(STORAGE_KEYS.versions, JSON.stringify(versions));
}

// CRUD Operations
export function getAssets(): PromptAsset[] {
  const data = localStorage.getItem(STORAGE_KEYS.assets);
  if (!data) return [];
  return JSON.parse(data).map((a: PromptAsset) => ({
    ...a,
    createdAt: new Date(a.createdAt),
    updatedAt: new Date(a.updatedAt),
  }));
}

export function getAssetById(id: string): PromptAsset | undefined {
  return getAssets().find(a => a.id === id);
}

export function saveAsset(asset: PromptAsset): void {
  const assets = getAssets();
  const index = assets.findIndex(a => a.id === asset.id);
  if (index >= 0) {
    assets[index] = asset;
  } else {
    assets.push(asset);
  }
  localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(assets));
}

export function createAsset(asset: Omit<PromptAsset, 'id' | 'createdAt' | 'updatedAt'>): PromptAsset {
  const newAsset: PromptAsset = {
    ...asset,
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  saveAsset(newAsset);
  
  // Add lineage
  addLineageEntry({
    assetId: newAsset.id,
    parentId: asset.parentId,
    action: 'created',
    userId: asset.createdBy,
  });
  
  // Add version snapshot
  addVersionSnapshot({
    assetId: newAsset.id,
    version: asset.version,
    content: asset.content,
    title: asset.title,
    commitMessage: asset.commitMessage || 'Initial creation',
    userId: asset.createdBy,
  });
  
  return newAsset;
}

// Version snapshots
export function getVersionSnapshots(assetId?: string): VersionSnapshot[] {
  const data = localStorage.getItem(STORAGE_KEYS.versions);
  if (!data) return [];
  const all = JSON.parse(data).map((v: VersionSnapshot) => ({
    ...v,
    timestamp: new Date(v.timestamp),
  }));
  return assetId ? all.filter((v: VersionSnapshot) => v.assetId === assetId) : all;
}

export function addVersionSnapshot(snapshot: Omit<VersionSnapshot, 'id' | 'timestamp'>): void {
  const snapshots = getVersionSnapshots();
  snapshots.push({
    ...snapshot,
    id: generateId(),
    timestamp: new Date(),
  });
  localStorage.setItem(STORAGE_KEYS.versions, JSON.stringify(snapshots));
}

export function rollbackAsset(assetId: string, toVersion: number): PromptAsset | null {
  const snapshots = getVersionSnapshots(assetId);
  const target = snapshots.find(s => s.version === toVersion);
  if (!target) return null;
  
  const asset = getAssetById(assetId);
  if (!asset || asset.isLocked) return null;
  
  const updated: PromptAsset = {
    ...asset,
    content: target.content,
    title: target.title,
    version: parseFloat((asset.version + 0.1).toFixed(1)),
    updatedAt: new Date(),
    commitMessage: `Rollback to v${toVersion}`,
  };
  
  saveAsset(updated);
  addVersionSnapshot({
    assetId,
    version: updated.version,
    content: target.content,
    title: target.title,
    commitMessage: `Rollback to v${toVersion}`,
    userId: getCurrentUser(),
  });
  
  return updated;
}

export function toggleLock(assetId: string): boolean {
  const asset = getAssetById(assetId);
  if (!asset) return false;
  asset.isLocked = !asset.isLocked;
  asset.updatedAt = new Date();
  saveAsset(asset);
  return asset.isLocked;
}

// ROI Facts
export function getROIFacts(): ROIFact[] {
  const data = localStorage.getItem(STORAGE_KEYS.roiFacts);
  return data ? JSON.parse(data) : [];
}

export function saveROIFact(fact: Omit<ROIFact, 'id'>): ROIFact {
  const facts = getROIFacts();
  const newFact: ROIFact = { ...fact, id: generateId() };
  facts.push(newFact);
  localStorage.setItem(STORAGE_KEYS.roiFacts, JSON.stringify(facts));
  return newFact;
}

export function getROIFactsForAsset(assetId: string): ROIFact[] {
  return getROIFacts().filter(f => f.assetId === assetId);
}

// Lineage
export function getLineageEntries(): LineageEntry[] {
  const data = localStorage.getItem(STORAGE_KEYS.lineage);
  if (!data) return [];
  return JSON.parse(data).map((e: LineageEntry) => ({
    ...e,
    timestamp: new Date(e.timestamp),
  }));
}

export function addLineageEntry(entry: Omit<LineageEntry, 'id' | 'timestamp'>): void {
  const entries = getLineageEntries();
  entries.push({ ...entry, id: generateId(), timestamp: new Date() });
  localStorage.setItem(STORAGE_KEYS.lineage, JSON.stringify(entries));
}

// User
export function getCurrentUser(): string {
  return localStorage.getItem(STORAGE_KEYS.currentUser) || REVIEWERS[0].id;
}

export function setCurrentUser(userId: string): void {
  localStorage.setItem(STORAGE_KEYS.currentUser, userId);
}

// Analytics helpers
export function getDepartmentROIMatrix(): Record<Department, Record<ROICategory, number>> {
  const assets = getAssets();
  const facts = getROIFacts();
  const matrix = Object.fromEntries(
    DEPARTMENTS.map(dept => [
      dept,
      Object.fromEntries(ROI_CATEGORIES.map(cat => [cat, 0])) as Record<ROICategory, number>,
    ]),
  ) as Record<Department, Record<ROICategory, number>>;

  DEPARTMENTS.forEach(dept => {
    ROI_CATEGORIES.forEach(cat => { matrix[dept][cat] = 0; });
  });
  
  facts.forEach(fact => {
    const asset = assets.find(a => a.id === fact.assetId);
    if (asset) matrix[asset.department][fact.category] += fact.value;
  });
  
  return matrix;
}

export function getTotalEnterpriseValue(): number {
  return getROIFacts().reduce((sum, fact) => sum + fact.value, 0);
}

export function getLineageTree(): { name: string; children: LineageTreeNode[] } {
  const assets = getAssets();
  const rootAssets = assets.filter(a => !a.parentId);

  function buildNode(asset: PromptAsset): LineageTreeNode {
    const children = assets.filter(a => a.parentId === asset.id);
    return {
      name: asset.title.length > 30 ? asset.title.substring(0, 30) + '...' : asset.title,
      fullTitle: asset.title,
      department: asset.department,
      version: asset.version,
      status: asset.status,
      value: 1,
      children: children.map(buildNode),
    };
  }
  
  return {
    name: 'Enterprise Library',
    children: rootAssets.map(buildNode),
  };
}
