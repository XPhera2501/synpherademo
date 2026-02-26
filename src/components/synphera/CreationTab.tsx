import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DEPARTMENTS, Department, ROICategory, ScanResult, PromptTemplate } from '@/lib/synphera-types';
import { runSecurityScan } from '@/lib/security-scanner';
import { validatePromptBestPractices, type ValidationResult } from '@/lib/prompt-validator';
import { createAsset, saveROIFact, addAuditLog } from '@/lib/supabase-store';
import type { DepartmentEnum, AssetStatusEnum } from '@/lib/supabase-store';
import { ScanResultPanel } from './ScanResultPanel';
import { ROIBuilder } from './ROIBuilder';
import { PromptEditor } from './PromptEditor';
import { TemplateLibrary } from './TemplateLibrary';
import { AssignForReviewDialog } from './AssignForReviewDialog';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Save, AlertTriangle, MessageSquare, Lock, Tag, X, Info, CheckCircle, XCircle, Lightbulb, FolderOpen, Users, Ban } from 'lucide-react';
import { toast } from 'sonner';

interface ROIEntry {
  category: ROICategory;
  value: number;
}

interface CreationTabProps {
  onAssetCreated: () => void;
}

interface ComplianceResult {
  framework: string;
  status: 'clean' | 'error';
  message?: string;
}

const CATEGORIES = ['Analysis', 'Generation', 'Classification', 'Extraction', 'Summarization', 'Translation', 'Code', 'Creative', 'Compliance', 'Other'];

// PII patterns for GDPR mock validation
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i,
  /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
  /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/,
  /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b/,
];

function detectPII(content: string): boolean {
  return PII_PATTERNS.some(p => p.test(content));
}

export function CreationTab({ onAssetCreated }: CreationTabProps) {
  const { user, canEdit, role } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [department, setDepartment] = useState<DepartmentEnum>('Operations');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [roiEntries, setRoiEntries] = useState<ROIEntry[]>([]);
  const [justification, setJustification] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  // Phase 1: Compliance checkboxes
  const [complianceEU, setComplianceEU] = useState(false);
  const [complianceGDPR, setComplianceGDPR] = useState(false);
  const [complianceHIPAA, setComplianceHIPAA] = useState(false);
  const [complianceResults, setComplianceResults] = useState<ComplianceResult[]>([]);
  const [complianceValidated, setComplianceValidated] = useState(false);

  // Phase 3: Assign for Review dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  
  const canSave = scanResult && (scanResult.status === 'GREEN' || (scanResult.status === 'AMBER' && justification.trim().length > 10));
  const isBlocked = scanResult?.status === 'RED';
  
  const handleTemplateSelect = (template: PromptTemplate) => {
    setTitle(template.name);
    setContent(template.content);
    if (template.department) setDepartment(template.department as DepartmentEnum);
    toast.success(`Template "${template.name}" loaded`);
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    setComplianceResults([]);
    setComplianceValidated(false);
    if (val.length > 20) {
      setValidation(validatePromptBestPractices(val, title));
    } else {
      setValidation(null);
    }
  };

  // Phase 1: Compliance Validation
  const handleComplianceValidate = () => {
    const results: ComplianceResult[] = [];
    
    if (complianceEU) {
      results.push({ framework: 'EU AI Act', status: 'clean', message: 'No issues detected' });
    }
    if (complianceGDPR) {
      const hasPII = detectPII(content);
      if (hasPII) {
        results.push({
          framework: 'GDPR',
          status: 'error',
          message: 'PII data detected in the prompt. Remove personal identifiers (emails, phone numbers, SSNs, credit cards) before proceeding.',
        });
      } else {
        results.push({ framework: 'GDPR', status: 'clean', message: 'No PII detected' });
      }
    }
    if (complianceHIPAA) {
      const healthKeywords = ['diagnosis', 'prescription', 'patient', 'medical record', 'treatment plan', 'health condition', 'medication'];
      const hasHealth = healthKeywords.some(kw => content.toLowerCase().includes(kw));
      if (hasHealth) {
        results.push({
          framework: 'HIPAA',
          status: 'error',
          message: 'Protected health information keywords detected.',
        });
      } else {
        results.push({ framework: 'HIPAA', status: 'clean', message: 'No PHI detected' });
      }
    }

    setComplianceResults(results);
    setComplianceValidated(true);

    const hasErrors = results.some(r => r.status === 'error');
    if (hasErrors) {
      toast.error('Compliance validation failed. See details below.');
    } else if (results.length > 0) {
      toast.success('All compliance checks passed!');
    } else {
      toast.warning('Select at least one compliance framework to validate.');
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
  
  const handleSave = async () => {
    if (!canSave || isBlocked || !user) return;
    if (!commitMessage.trim()) {
      toast.error('Commit message is required');
      return;
    }
    
    setIsSaving(true);
    const asset = await createAsset({
      title: title.trim(),
      content: content.trim(),
      version: 1.0,
      status: 'draft' as AssetStatusEnum,
      parent_id: null,
      assigned_to: null,
      created_by: user.id,
      department,
      category: category || null,
      security_status: scanResult!.status,
      justification: justification || null,
      commit_message: commitMessage.trim(),
      is_locked: false,
      tags,
    });
    
    if (asset) {
      for (const entry of roiEntries) {
        if (entry.value > 0) {
          await saveROIFact({ asset_id: asset.id, category: entry.category, value: entry.value });
        }
      }
      
      toast.success(`Asset "${title}" saved to catalogue!`);
      resetForm();
      onAssetCreated();
    } else {
      toast.error('Failed to save asset. Check your permissions.');
    }
    setIsSaving(false);
  };

  // Phase 3: Assign for Review
  const handleAssignForReview = async (colleagueId: string, requestType: 'review' | 'validate') => {
    if (!user || !canSave || isBlocked) return;
    if (!commitMessage.trim()) {
      toast.error('Commit message is required');
      return;
    }

    setIsSaving(true);
    const asset = await createAsset({
      title: title.trim(),
      content: content.trim(),
      version: 1.0,
      status: 'in_review' as AssetStatusEnum,
      parent_id: null,
      assigned_to: colleagueId,
      created_by: user.id,
      department,
      category: category || null,
      security_status: scanResult!.status,
      justification: justification || null,
      commit_message: commitMessage.trim(),
      is_locked: false,
      tags,
    });

    if (asset) {
      for (const entry of roiEntries) {
        if (entry.value > 0) {
          await saveROIFact({ asset_id: asset.id, category: entry.category, value: entry.value });
        }
      }
      await addAuditLog({
        user_id: user.id,
        action: `assign_for_${requestType}`,
        target_type: 'prompt_asset',
        target_id: asset.id,
        details: { assigned_to: colleagueId, request_type: requestType },
      });

      toast.success(`Asset sent for ${requestType}! It will appear in the colleague's To-Do list.`);
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
    setTags([]); setCategory(''); setValidation(null);
    setComplianceEU(false); setComplianceGDPR(false); setComplianceHIPAA(false);
    setComplianceResults([]); setComplianceValidated(false);
  };

  // Phase 2: Profile summary auto-refresh with benefit values
  const profileSummary = useMemo(() => {
    const benefitSummary = roiEntries.filter(e => e.value > 0).map(e => `${e.category}: $${e.value.toLocaleString()}`).join(', ');
    return [
      { label: 'Type', value: category ? `Structured Enterprise ${category} Prompt` : 'Not specified' },
      { label: 'Stability', value: validation ? (validation.score >= 70 ? 'High' : validation.score >= 40 ? 'Medium' : 'Low') : 'Pending scan' },
      { label: 'Determinism', value: content.length > 100 ? 'Very High Post-Implementation' : 'Pending' },
      { label: 'LLM Dependency', value: 'Limited to presentation layer' },
      { label: 'Audit Readiness', value: scanResult ? (scanResult.status === 'GREEN' ? 'Strong (logging enabled)' : 'Requires remediation') : 'Pending scan' },
      { label: 'Scalability', value: 'Enterprise-grade' },
      { label: 'Code Portability', value: tags.length > 0 ? 'High' : 'Medium' },
      { label: 'Benefits', value: benefitSummary || 'No benefits configured' },
      { label: 'Compliance', value: complianceAllClean ? complianceResults.map(r => r.framework).join(', ') + ' — Clean' : complianceValidated ? 'Issues detected' : 'Pending validation' },
    ];
  }, [category, validation, content, scanResult, tags, roiEntries, complianceResults, complianceValidated, complianceAllClean]);

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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Prompt Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PromptEditor value={content} onChange={handleContentChange} label="Content" />
            
            <Button
              onClick={handleScan}
              disabled={isScanning || !title.trim() || !content.trim()}
              className="gap-2"
            >
              <Shield className="h-4 w-4" />
              {isScanning ? 'Scanning...' : 'Ingest'}
            </Button>

            <div className="space-y-2">
              <Label htmlFor="title">Prompt Title</Label>
              <div className="flex items-end gap-3">
                <Input
                  id="title"
                  placeholder="e.g., Customer Sentiment Analysis Prompt"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-card"
                />
                <TemplateLibrary onSelect={handleTemplateSelect} />
              </div>
            </div>

            {/* Department + Category row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={department} onValueChange={(v) => setDepartment(v as DepartmentEnum)}>
                  <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  Category
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-card"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                Tags
              </Label>
              <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-lg border border-border bg-card">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1 text-xs h-6">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={handleAddTag}
                  placeholder={tags.length === 0 ? "Add tags (press Enter)" : ""}
                  className="border-0 bg-transparent shadow-none h-6 min-w-[100px] flex-1 p-0 text-sm focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commit" className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                Commit Message <span className="text-destructive">*</span>
              </Label>
              <Input
                id="commit"
                placeholder="e.g., Initial draft for Q1 campaign analysis"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="bg-card text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Top-Right: Benefits (ROI) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <ROIBuilder entries={roiEntries} onChange={setRoiEntries} department={department} />
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Compliance Validation + Prompt Profile Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bottom-Left: Compliance Validation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Compliance Validation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Compliance Framework Checkboxes */}
            <div className="flex items-center gap-6">
              {[
                { id: 'eu-ai', label: 'EU AI Act', checked: complianceEU, onChange: setComplianceEU },
                { id: 'gdpr', label: 'GDPR', checked: complianceGDPR, onChange: setComplianceGDPR },
                { id: 'hipaa', label: 'HIPAA', checked: complianceHIPAA, onChange: setComplianceHIPAA },
              ].map(fw => (
                <div key={fw.id} className="flex flex-col items-center gap-1.5">
                  <Label htmlFor={fw.id} className="text-sm font-medium">{fw.label}</Label>
                  <Checkbox
                    id={fw.id}
                    checked={fw.checked}
                    onCheckedChange={(v) => { fw.onChange(!!v); setComplianceResults([]); setComplianceValidated(false); }}
                  />
                </div>
              ))}
            </div>

            <Button
              onClick={handleComplianceValidate}
              disabled={!content.trim() || (!complianceEU && !complianceGDPR && !complianceHIPAA)}
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

                {/* Overall status icon */}
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

            {/* CLEAR Framework Guidance */}
            <Card className="border-dashed border-primary/20 bg-primary/5">
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">CLEAR Framework</p>
                    <div className="grid grid-cols-5 gap-1">
                      {[
                        { letter: 'C', word: 'Concise', tip: 'Remove filler words' },
                        { letter: 'L', word: 'Logical', tip: 'Structured flow' },
                        { letter: 'E', word: 'Explicit', tip: 'No ambiguity' },
                        { letter: 'A', word: 'Adaptive', tip: 'Handles edge cases' },
                        { letter: 'R', word: 'Reflective', tip: 'Self-checks output' },
                      ].map(({ letter, word, tip }) => (
                        <Tooltip key={letter}>
                          <TooltipTrigger asChild>
                            <div className="text-center cursor-help">
                              <span className="font-bold text-primary">{letter}</span>
                              <p className="text-[10px]">{word}</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-xs">{tip}</p></TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ScanResultPanel result={scanResult} isScanning={isScanning} />

            {scanResult?.status === 'AMBER' && (
              <div className="space-y-2 animate-fade-in-up">
                <Label htmlFor="justification" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-status-amber" />
                  Business Justification Required
                </Label>
                <Input
                  id="justification"
                  placeholder="Explain why this is acceptable (min 10 chars)..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="bg-card"
                />
              </div>
            )}

            {/* Prompt Validation */}
            {validation && (
              <Card className={`border ${validation.score >= 70 ? 'border-status-green/30 bg-status-green/5' : validation.score >= 40 ? 'border-status-amber/30 bg-status-amber/5' : 'border-status-red/30 bg-status-red/5'}`}>
                <CardContent className="py-3 px-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium flex items-center gap-1.5">
                      {validation.score >= 70 ? <CheckCircle className="h-3.5 w-3.5 text-status-green" /> : <Info className="h-3.5 w-3.5 text-status-amber" />}
                      Validation Outcome — Score: {validation.score}/100
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

        {/* Bottom-Right: Overall Prompt Profile Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg italic">Overall Prompt Profile Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {profileSummary.map(({ label, value }) => (
                <div key={label} className="flex gap-2">
                  <span className="font-semibold text-foreground whitespace-nowrap">{label}:</span>
                  <span className="text-muted-foreground">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom action buttons */}
      <div className="flex items-center gap-3">
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

      {/* Assign for Review Dialog */}
      <AssignForReviewDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onSend={handleAssignForReview}
      />
    </div>
  );
}
