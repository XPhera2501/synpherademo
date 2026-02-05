// Synphera V13 - Type Definitions

export type SecurityStatus = 'GREEN' | 'AMBER' | 'RED' | 'PENDING';
export type AssetStatus = 'draft' | 'pending_review' | 'released';
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
}

export interface LineageEntry {
  id: string;
  assetId: string;
  parentId: string | null;
  action: 'created' | 'forked' | 'released' | 'updated';
  timestamp: Date;
  userId: string;
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
  'New Value'
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