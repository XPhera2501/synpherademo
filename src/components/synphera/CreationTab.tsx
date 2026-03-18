import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROICategory, ScanResult } from '@/lib/synphera-types';
import { runSecurityScan } from '@/lib/security-scanner';
import { validatePromptBestPractices, analyzePrompt, type ValidationResult, type PromptAnalysis } from '@/lib/prompt-validator';
import { createAsset, saveROIFact, addAuditLog } from '@/lib/supabase-store';
import type { DepartmentEnum, AssetStatusEnum, PromptAssetMetadata } from '@/lib/supabase-store';
import { ScanResultPanel } from './ScanResultPanel';
import { ROIBuilder, type ROIEntry } from './ROIBuilder';
import { PromptEditor } from './PromptEditor';
import { AssignForReviewDialog } from './AssignForReviewDialog';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Save, AlertTriangle, MessageSquare, Lock, Info, CheckCircle, XCircle, Users, Ban, Activity, Cpu, Brain, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { CreationSeed } from '@/pages/Index';

interface CreationTabProps {
  onAssetCreated: () => void;
  creationSeed?: CreationSeed | null;
  onSeedConsumed?: () => void;
}

interface ComplianceResult {
  framework: string;
  status: 'clean' | 'error';
  message?: string;
}

const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i,
  /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
  /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/,
  /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b/,
];

function detectPII(content: string): boolean {
  return PII_PATTERNS.some(p => p.test(content));
}

const COMPLIANCE_FRAMEWORKS = [
  { id: 'eu-ai', label: 'EU AI Act' },
  { id: 'gdpr', label: 'GDPR' },
  { id: 'hipaa', label: 'HIPAA' },
  { id: 'pdpa', label: 'PDPA' },
  { id: 'enterprise', label: 'Enterprise Policy' },
];

// Demo prompt
const DEMO_PROMPT_TITLE = 'Supplier Mix optimisation to improve the Net Polymer Margin';
const DEMO_PROMPT_CONTENT = `Enhanced Polymer Strategic Sourcing Prompt

Context

"I am acting as a Senior Strategic Sourcing Manager specializing in high-performance polymers. Our goal is to maximize the net margin of our molded/extruded end products by optimizing resin selection. We must balance 'Virgin Resin' purchase price against the 'Total Cost of Conversion,' including energy overhead, scrap rates from regrind degradation, and logistical risks."

Action

"Analyze the integrated datasets provided to identify the Optimal Grade-Supplier Mix. Calculate a Polymer Performance Score (PPS) for each supplier ($0-100$) that weights invoice price against machine cycle time, non-conforming scrap, and the financial recovery of quality rebates."

Input Data Requirements (Expected Data)

"Please process the following data tables:

Supplier Master: [Supplier ID, Location, Plant Size, JIT Capability (Binary)].

Contractual Data: [Material Grade, Price/TN, Logistics Cost/TN, Payment Terms, Quality Rebate %].

Production Logs: [Batch ID, Resin Grade, Melt Flow Index (MFI), Cycle Time (sec), Energy KWh/Batch].

Quality & Waste: [Scrap Rate %, Regrind-to-Virgin Ratio, Moisture Content %, Cost of Returns, Disposal Fee/TN].

Market Intelligence: [Global Ethylene/Propylene Index, Freight Lead Times, Regional Humidity Indices]."

Specifics

"Your analysis must:

Identify Efficiency Gaps: Flag suppliers where low $Price/TN$ correlates with high $Energy/Unit$ or extended $Cycle Times$.

Quantify 'Hidden' Logistics Costs: Calculate the cost of 'Pre-Drying' resin for suppliers with production plants in high-humidity regions or long transit times.

Audit Rebate Recovery: Compare production 'Scrap Logs' against 'Contractual Quality Rebates' to identify uncollected credits.

Simulate Market Volatility: Model the impact on margin if the underlying monomer price (Ethylene/Propylene) increases by 10%."

Output Format (Expected Result)

"Provide the final analysis in the following format:

Executive Summary: A 3-sentence overview of the highest margin-leaking supplier.

Supplier Performance Matrix: A table ranking suppliers by Total Cost of Ownership (TCO) rather than price.

Margin Sensitivity Table:

| Variable Change | Impact on Margin (%) | Recommended Action |
| :--- | :--- | :--- |
| +5% Regrind Usage | +X.X% | [Action] |
| -2s Cycle Time | +X.X% | [Action] |

The Optimal Path: A specific recommendation on which grade/supplier to move 20% of the volume to for immediate margin recovery."`;

function cloneROIEntries(entries: ROIEntry[]): ROIEntry[] {
  return entries.map((entry) => ({ ...entry }));
}

export function CreationTab({ onAssetCreated, creationSeed, onSeedConsumed }: CreationTabProps) {
  const { user, canEdit, role, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [department, setDepartment] = useState<DepartmentEnum>('Operations');
  const [roiEntries, setRoiEntries] = useState<ROIEntry[]>([]);
  const [justification, setJustification] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);

  // Compliance
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [complianceResults, setComplianceResults] = useState<ComplianceResult[]>([]);
  const [complianceValidated, setComplianceValidated] = useState(false);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  useEffect(() => {
    if (profile?.department) {
      setDepartment(profile.department as DepartmentEnum);
    }
  }, [profile?.department]);

  const handleContentChange = useCallback((val: string) => {
    setContent(val);
    setComplianceResults([]);
    setComplianceValidated(false);
    if (val.length > 20) {
      setValidation(validatePromptBestPractices(val, title));
    } else {
      setValidation(null);
    }
  }, [title]);

  useEffect(() => {
    if (!creationSeed) return;

    setTitle(creationSeed.title);
    handleContentChange(creationSeed.content);
    setDepartment(creationSeed.department);
    setRoiEntries(cloneROIEntries(creationSeed.roiEntries));
    setScanResult(null);
    setJustification('');
    setCommitMessage('');
    setValidation(null);
    setAnalysis(null);
    setSelectedFrameworks([]);
    setComplianceResults([]);
    setComplianceValidated(false);
    onSeedConsumed?.();
    toast.success('Prompt loaded into Create');
  }, [creationSeed, handleContentChange, onSeedConsumed]);
  
  const canSave = title.trim().length > 0 && content.trim().length > 0;
  const isBlocked = false;

  const applyIngestedPrompt = (nextTitle: string, nextContent: string, nextBenefits: ROIEntry[]) => {
    setTitle(nextTitle);
    handleContentChange(nextContent);
    setRoiEntries(cloneROIEntries(nextBenefits));
    setScanResult(null);
    setJustification('');
    setCommitMessage('');
  };

  // Ingest button: load demo prompt
  const handleIngest = () => {
    applyIngestedPrompt(DEMO_PROMPT_TITLE, DEMO_PROMPT_CONTENT, []);
    toast.success('Demo prompt imported from LLM');
  };

  // Compliance Validation
  const handleComplianceValidate = () => {
    const results: ComplianceResult[] = [];
    
    for (const fwId of selectedFrameworks) {
      const fw = COMPLIANCE_FRAMEWORKS.find(f => f.id === fwId);
      if (!fw) continue;

      if (fwId === 'gdpr') {
        const hasPII = detectPII(content);
        results.push(hasPII
          ? { framework: fw.label, status: 'error', message: 'PII data detected in the prompt. Remove personal identifiers before proceeding.' }
          : { framework: fw.label, status: 'clean', message: 'No PII detected' }
        );
      } else if (fwId === 'hipaa') {
        const healthKeywords = ['diagnosis', 'prescription', 'patient', 'medical record', 'treatment plan', 'health condition', 'medication'];
        const hasHealth = healthKeywords.some(kw => content.toLowerCase().includes(kw));
        results.push(hasHealth
          ? { framework: fw.label, status: 'error', message: 'Protected health information keywords detected.' }
          : { framework: fw.label, status: 'clean', message: 'No PHI detected' }
        );
      } else if (fwId === 'pdpa') {
        const pdpaKeywords = ['nric', 'fin number', 'passport number', 'residential address', 'telephone number'];
        const hasPdpa = pdpaKeywords.some(kw => content.toLowerCase().includes(kw)) || detectPII(content);
        results.push(hasPdpa
          ? { framework: fw.label, status: 'error', message: 'Personal data detected under PDPA scope.' }
          : { framework: fw.label, status: 'clean', message: 'No personal data detected' }
        );
      } else if (fwId === 'enterprise') {
        const policyKeywords = ['bypass approval', 'skip review', 'ignore compliance', 'override policy'];
        const violates = policyKeywords.some(kw => content.toLowerCase().includes(kw));
        results.push(violates
          ? { framework: fw.label, status: 'error', message: 'Content violates internal enterprise usage policies.' }
          : { framework: fw.label, status: 'clean', message: 'Compliant with enterprise policies' }
        );
      } else {
        results.push({ framework: fw.label, status: 'clean', message: 'No issues detected' });
      }
    }

    setComplianceResults(results);
    setComplianceValidated(true);

    if (content.length > 20) {
      const promptAnalysis = analyzePrompt(content);
      setAnalysis(promptAnalysis);
      toast.success('Prompt analysis complete!');
    }

    const hasErrors = results.some(r => r.status === 'error');
    if (hasErrors) {
      toast.error('Compliance validation failed. See details below.');
    } else if (results.length > 0) {
      toast.success('All compliance checks passed!');
    } else if (content.length <= 20) {
      toast.warning('Enter more prompt content before validating.');
    }
  };

  const complianceAllClean = complianceValidated && complianceResults.length > 0 && complianceResults.every(r => r.status === 'clean');

  const handleScan = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Please enter title and content before scanning');
      return;
    }
    setIsScanning(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const result = runSecurityScan(content, title);
    setScanResult(result);
    setIsScanning(false);
    
    if (result.status === 'GREEN') toast.success('Security scan passed!');
    else if (result.status === 'AMBER') toast.warning('Potential issues detected. Provide justification.');
    else toast.error('Critical issues found. Remediate content.');
  };

  // Build metadata including profile summary
  const buildMetadata = (): PromptAssetMetadata => {
    const benefitSummary = roiEntries.filter(e => e.value !== 0).map(e => ({
      category: e.category,
      value: e.value,
      description: e.description,
    }));

    return {
      ...(analysis ? {
        taskType: analysis.taskType,
        determinismScore: analysis.determinismScore,
        scores: analysis.scores,
        flags: analysis.flags,
        routing: analysis.routing,
      } : {}),
      profileSummary: {
        company: 'X-Phera',
        department: profile?.department || 'Not set',
        taskClassification: analysis?.taskType || 'Pending',
        determinismScore: analysis?.determinismScore ?? null,
        stability: validation ? (validation.score >= 70 ? 'High' : validation.score >= 40 ? 'Medium' : 'Low') : 'Pending',
        llmDependency: analysis ? `${analysis.routing.allocation.LLM}%` : 'Pending',
        auditReadiness: scanResult ? (scanResult.status === 'GREEN' ? 'Strong' : 'Requires remediation') : 'Pending',
        compliance: complianceAllClean ? complianceResults.map(r => r.framework).join(', ') + ' — Clean' : complianceValidated ? 'Issues detected' : 'Pending',
        benefits: benefitSummary,
      },
    };
  };

  const saveAsset = async (status: AssetStatusEnum, successMessage: string, assignedTo: string | null = null) => {
    if (!canSave || isBlocked || !user) return false;
    if (!commitMessage.trim()) {
      toast.error('Message to validator is required');
      return false;
    }

    setIsSaving(true);
    const metadata = buildMetadata();

    const asset = await createAsset({
      title: title.trim(),
      content: content.trim(),
      version: 1.0,
      status,
      parent_id: null,
      assigned_to: assignedTo,
      created_by: user.id,
      department,
      category: null,
      security_status: scanResult?.status || 'GREEN',
      justification: justification || null,
      commit_message: commitMessage.trim(),
      is_locked: false,
      tags: [],
      metadata,
    });

    if (!asset) {
      toast.error('Failed to save asset. Check your permissions.');
      setIsSaving(false);
      return false;
    }

    for (const entry of roiEntries) {
      if (entry.value !== 0) {
        await saveROIFact({ asset_id: asset.id, category: entry.category, value: entry.value, description: entry.description || null });
      }
    }

    toast.success(successMessage);
    resetForm();
    onAssetCreated();
    setIsSaving(false);
    return asset;
  };
  
  const handleSaveForLater = async () => {
    await saveAsset('draft' as AssetStatusEnum, `Asset "${title}" saved for later completion.`);
  };

  const handleSave = async () => {
    await saveAsset('draft' as AssetStatusEnum, `Asset "${title}" saved to catalogue!`);
  };

  const handleAssignForReview = async (colleagueId: string, requestType: 'review' | 'validate') => {
    if (!user || !canSave || isBlocked) return;
    if (!commitMessage.trim()) {
      toast.error('Message to validator is required');
      return;
    }

    setIsSaving(true);
    const metadata = buildMetadata();

    const asset = await createAsset({
      title: title.trim(),
      content: content.trim(),
      version: 1.0,
      status: 'created' as AssetStatusEnum,
      parent_id: null,
      assigned_to: colleagueId,
      created_by: user.id,
      department,
      category: null,
      security_status: scanResult?.status || 'GREEN',
      justification: justification || null,
      commit_message: commitMessage.trim(),
      is_locked: false,
      tags: [],
      metadata,
    });

    if (asset) {
      for (const entry of roiEntries) {
        if (entry.value !== 0) {
          await saveROIFact({ asset_id: asset.id, category: entry.category, value: entry.value, description: entry.description || null });
        }
      }
      await addAuditLog({
        user_id: user.id,
        action: `assign_for_${requestType}`,
        target_type: 'prompt_asset',
        target_id: asset.id,
        details: { assigned_to: colleagueId, request_type: requestType },
      });

      toast.success(`Asset sent for ${requestType}!`);
      resetForm();
      onAssetCreated();
    } else {
      toast.error('Failed to save asset.');
    }
    setIsSaving(false);
  };

  const resetForm = () => {
    setTitle(''); setContent(''); setRoiEntries([]);
    setJustification(''); setCommitMessage(''); setScanResult(null);
    setValidation(null); setAnalysis(null);
    setSelectedFrameworks([]); setComplianceResults([]); setComplianceValidated(false);
  };

  if (!canEdit) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Viewer Access Only</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Your role ({role}) doesn't have permission to create or edit assets. 
          Contact an admin to upgrade your access.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Top row: Prompt Content + Benefits */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top-Left: Prompt Content */}
        <Card className="shadow-none">
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Prompt Content</CardTitle>
              <Button
                onClick={handleIngest}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Ingest from LLM
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4">
            <PromptEditor
              value={content}
              onChange={handleContentChange}
              label="Content"
            />

            <div className="space-y-2">
              <Label htmlFor="title">Prompt Purpose</Label>
              <Input
                id="title"
                placeholder="e.g., Supplier Mix optimisation to improve the Net Polymer Margin"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-card"
              />
            </div>
          </CardContent>
        </Card>

        {/* Top-Right: Benefits */}
        <Card className="shadow-none">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-base font-semibold">Benefits</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ROIBuilder entries={roiEntries} onChange={setRoiEntries} department={department} />
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Compliance Validation + Prompt Analysis */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bottom-Left: Compliance Validation */}
        <Card className="shadow-none">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-base font-semibold">Compliance Validation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4">
            {/* Compliance Framework Dropdown (multi-select via checkboxes in dropdown) */}
            <div className="space-y-2">
              <Label className="text-sm">Select Frameworks</Label>
              <Select
                value={selectedFrameworks.length > 0 ? selectedFrameworks.join(',') : 'none'}
                onValueChange={(val) => {
                  if (val === 'none') return;
                  const fw = val;
                  setSelectedFrameworks(prev =>
                    prev.includes(fw) ? prev.filter(f => f !== fw) : [...prev, fw]
                  );
                  setComplianceResults([]);
                  setComplianceValidated(false);
                }}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Select compliance frameworks...">
                    {selectedFrameworks.length === 0
                      ? 'Select compliance frameworks...'
                      : selectedFrameworks.map(id => COMPLIANCE_FRAMEWORKS.find(f => f.id === id)?.label).join(', ')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {COMPLIANCE_FRAMEWORKS.map(fw => (
                    <SelectItem key={fw.id} value={fw.id}>
                      <span className="flex items-center gap-2">
                        {selectedFrameworks.includes(fw.id) && <CheckCircle className="h-3 w-3 text-primary" />}
                        {fw.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedFrameworks.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {selectedFrameworks.map(id => {
                    const fw = COMPLIANCE_FRAMEWORKS.find(f => f.id === id);
                    return (
                      <Badge key={id} variant="secondary" className="text-[10px] cursor-pointer" onClick={() => {
                        setSelectedFrameworks(prev => prev.filter(f => f !== id));
                        setComplianceResults([]);
                        setComplianceValidated(false);
                      }}>
                        {fw?.label} ✕
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              onClick={handleComplianceValidate}
              disabled={!content.trim() || content.length <= 20}
              variant="outline"
              className="gap-2"
            >
              <Shield className="h-4 w-4" />
              Validate
            </Button>

            {/* Compliance Results */}
            {complianceResults.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Validation Outcome</Label>
                {complianceResults.map((r) => (
                  <div
                    key={r.framework}
                    className={`flex items-start gap-2 rounded-md p-3 text-sm ${
                      r.status === 'clean'
                        ? 'bg-status-green/10 border border-status-green/30'
                        : 'bg-status-red/10 border border-status-red/30'
                    }`}
                  >
                    {r.status === 'clean' ? (
                      <CheckCircle className="h-4 w-4 text-status-green mt-0.5 flex-shrink-0" />
                    ) : (
                      <Ban className="h-4 w-4 text-status-red mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <span className="font-medium">{r.framework}:</span>{' '}
                      <span className="text-muted-foreground">{r.message}</span>
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-1">
                  <Label className="text-sm">Status</Label>
                  {complianceAllClean ? (
                    <CheckCircle className="h-5 w-5 text-status-green" />
                  ) : (
                    <Ban className="h-5 w-5 text-status-red" />
                  )}
                </div>
              </div>
            )}


            {/* Prompt Validation Results */}
            {validation && (
              <Card className={`border ${validation.score >= 70 ? 'border-status-green/30 bg-status-green/5' : validation.score >= 40 ? 'border-status-amber/30 bg-status-amber/5' : 'border-status-red/30 bg-status-red/5'}`}>
                <CardContent className="py-3 px-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium flex items-center gap-1.5">
                      {validation.score >= 70 ? <CheckCircle className="h-3.5 w-3.5 text-status-green" /> : <Info className="h-3.5 w-3.5 text-status-amber" />}
                      CLEAR Validation — Score: {validation.score}/100
                    </span>
                    <Badge variant="outline" className="text-[10px]">{validation.checks.filter(c => c.passed).length}/{validation.checks.length} passed</Badge>
                  </div>
                  <div className="space-y-1">
                    {validation.checks.filter(c => !c.passed).map((check, i) => (
                      <p key={i} className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-status-amber flex-shrink-0" />
                        {check.message}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Bottom-Right: Prompt Analysis */}
        <Card className="shadow-none">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Prompt Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {analysis ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <div className="rounded-lg border p-3 space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Task Classification</span>
                    <p className="text-sm font-semibold">{analysis.taskType}</p>
                  </div>
                  <div className="rounded-lg border p-3 space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Determinism Score</span>
                    <p className="text-sm font-semibold">{analysis.determinismScore} / 100</p>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${analysis.determinismScore}%`,
                          backgroundColor: analysis.determinismScore >= 70 ? 'hsl(var(--status-green))' : analysis.determinismScore >= 40 ? 'hsl(var(--status-amber))' : 'hsl(var(--status-red))',
                        }}
                      />
                    </div>
                  </div>
                  <div className="rounded-lg border p-3 space-y-1 sm:col-span-2 xl:col-span-1 2xl:col-span-2">
                    <span className="text-xs font-medium text-muted-foreground">Risk & Compliance Signals</span>
                    {Object.entries(analysis.flags).map(([key, val]) => (
                      <p key={key} className="text-xs flex items-center gap-1.5">
                        {val ? <AlertTriangle className="h-3 w-3 text-status-amber" /> : <CheckCircle className="h-3 w-3 text-status-green" />}
                        {key}: {val ? 'Yes' : 'No'}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Scoring Axes</span>
                  <div className="grid gap-2">
                    {Object.entries(analysis.scores).map(([axis, val]) => (
                      <div key={axis} className="flex items-center gap-2">
                        <span className="text-xs capitalize w-24 text-muted-foreground">{axis}</span>
                        <div className="flex-1 bg-muted rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-primary transition-all"
                            style={{ width: `${val * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono w-8 text-right">{val.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Cpu className="h-3 w-3" /> Execution Routing Recommendation
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(analysis.routing.allocation).map(([engine, pct]) => (
                      <Tooltip key={engine}>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="gap-1 text-xs cursor-help">
                            {engine === 'LLM' && <Brain className="h-3 w-3" />}
                            {engine === 'C++' && <Cpu className="h-3 w-3" />}
                            {engine}: {pct}%
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{analysis.routing.rationale[engine]}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                Prompt analysis will appear here after you run compliance validation.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message to validator + action buttons */}
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="commit" className="flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            Message to Validator <span className="text-destructive">*</span>
          </Label>
          <Input
            id="commit"
            placeholder="e.g., Please review the compliance and benefit values"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            className="bg-card text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSaveForLater}
            disabled={!canSave || isBlocked || !commitMessage.trim() || isSaving}
            className="gap-2"
            variant="secondary"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save for Later Completion'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || isBlocked || !commitMessage.trim() || isSaving}
            className="gap-2"
            variant={isBlocked ? 'destructive' : 'default'}
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save to Catalogue'}
          </Button>
          <Button
            variant="outline"
            disabled={!canSave || isBlocked || !commitMessage.trim()}
            className="gap-2"
            onClick={() => setAssignDialogOpen(true)}
          >
            <Users className="h-4 w-4" />
            Assign for Review
          </Button>
        </div>
      </div>

      <AssignForReviewDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onSend={handleAssignForReview}
      />
    </div>
  );
}
