import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DEPARTMENTS, Department, ROICategory, ScanResult, PromptTemplate } from '@/lib/synphera-types';
import { runSecurityScan } from '@/lib/security-scanner';
import { createAsset, saveROIFact } from '@/lib/supabase-store';
import type { DepartmentEnum, AssetStatusEnum } from '@/lib/supabase-store';
import { ScanResultPanel } from './ScanResultPanel';
import { ROIBuilder } from './ROIBuilder';
import { PromptEditor } from './PromptEditor';
import { TemplateLibrary } from './TemplateLibrary';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Save, AlertTriangle, MessageSquare, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface ROIEntry {
  category: ROICategory;
  value: number;
}

interface CreationTabProps {
  onAssetCreated: () => void;
}

export function CreationTab({ onAssetCreated }: CreationTabProps) {
  const { user, canEdit, role } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [department, setDepartment] = useState<DepartmentEnum>('Operations');
  const [roiEntries, setRoiEntries] = useState<ROIEntry[]>([]);
  const [justification, setJustification] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const canSave = scanResult && (scanResult.status === 'GREEN' || (scanResult.status === 'AMBER' && justification.trim().length > 10));
  const isBlocked = scanResult?.status === 'RED';
  
  const handleTemplateSelect = (template: PromptTemplate) => {
    setTitle(template.name);
    setContent(template.content);
    toast.success(`Template "${template.name}" loaded`);
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
      security_status: scanResult!.status,
      justification: justification || null,
      commit_message: commitMessage.trim(),
      is_locked: false,
      tags: [],
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
          
          <PromptEditor value={content} onChange={setContent} />
          
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
        </div>
        
        <div className="rounded-lg border border-border bg-card p-4">
          <ROIBuilder entries={roiEntries} onChange={setRoiEntries} />
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
