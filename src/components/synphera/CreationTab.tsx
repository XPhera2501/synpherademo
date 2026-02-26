import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DEPARTMENTS, Department, ROICategory, ScanResult, PromptTemplate } from '@/lib/synphera-types';
import { runSecurityScan } from '@/lib/security-scanner';
import { validatePromptBestPractices, type ValidationResult } from '@/lib/prompt-validator';
import { createAsset, saveROIFact } from '@/lib/supabase-store';
import type { DepartmentEnum, AssetStatusEnum } from '@/lib/supabase-store';
import { ScanResultPanel } from './ScanResultPanel';
import { ROIBuilder } from './ROIBuilder';
import { PromptEditor } from './PromptEditor';
import { TemplateLibrary } from './TemplateLibrary';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Save, AlertTriangle, MessageSquare, Lock, Tag, X, Info, CheckCircle, XCircle, Lightbulb, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

interface ROIEntry {
  category: ROICategory;
  value: number;
}

interface CreationTabProps {
  onAssetCreated: () => void;
}

const CATEGORIES = ['Analysis', 'Generation', 'Classification', 'Extraction', 'Summarization', 'Translation', 'Code', 'Creative', 'Compliance', 'Other'];

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
    if (val.length > 20) {
      setValidation(validatePromptBestPractices(val, title));
    } else {
      setValidation(null);
    }
  };
  
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
      
      toast.success(`Asset "${title}" saved successfully!`);
      setTitle(''); setContent(''); setRoiEntries([]);
      setJustification(''); setCommitMessage(''); setScanResult(null);
      setTags([]); setCategory(''); setValidation(null);
      onAssetCreated();
    } else {
      toast.error('Failed to save asset. Check your permissions.');
    }
    setIsSaving(false);
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
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="title">Asset Title</Label>
              <Input
                id="title"
                placeholder="e.g., Customer Sentiment Analysis Prompt"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-card"
              />
            </div>
            <TemplateLibrary onSelect={handleTemplateSelect} />
          </div>
          
          <PromptEditor value={content} onChange={handleContentChange} />

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

          {/* Prompt Validation */}
          {validation && (
            <Card className={`border ${validation.score >= 70 ? 'border-status-green/30 bg-status-green/5' : validation.score >= 40 ? 'border-status-amber/30 bg-status-amber/5' : 'border-status-red/30 bg-status-red/5'}`}>
              <CardContent className="py-3 px-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium flex items-center gap-1.5">
                    {validation.score >= 70 ? <CheckCircle className="h-3.5 w-3.5 text-status-green" /> : <Info className="h-3.5 w-3.5 text-status-amber" />}
                    Quality Score: {validation.score}/100
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
        </div>
        
        <div className="rounded-lg border border-border bg-card p-4">
          <ROIBuilder entries={roiEntries} onChange={setRoiEntries} department={department} />
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="space-y-4">
          <Button
            onClick={handleScan}
            disabled={isScanning || !title.trim() || !content.trim()}
            className="w-full gap-2"
            size="lg"
          >
            <Shield className="h-5 w-5" />
            {isScanning ? 'Scanning...' : 'Run Security & PII Scan'}
          </Button>
          
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
          
          <Button
            onClick={handleSave}
            disabled={!canSave || isBlocked || !commitMessage.trim() || isSaving}
            className="w-full gap-2"
            size="lg"
            variant={isBlocked ? 'destructive' : 'default'}
          >
            <Save className="h-5 w-5" />
            {isSaving ? 'Saving...' : isBlocked ? 'Save Blocked - Remediate Content' : 'Save to Library'}
          </Button>
        </div>
      </div>
    </div>
  );
}
