import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { REVIEWERS, DEPARTMENTS, Department, ROICategory, ScanResult, PromptTemplate } from '@/lib/synphera-types';
import { runSecurityScan } from '@/lib/security-scanner';
import { createAsset, saveROIFact, getCurrentUser } from '@/lib/synphera-store';
import { ScanResultPanel } from './ScanResultPanel';
import { ROIBuilder } from './ROIBuilder';
import { PromptEditor } from './PromptEditor';
import { TemplateLibrary } from './TemplateLibrary';
import { Shield, Save, AlertTriangle, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface ROIEntry {
  category: ROICategory;
  value: number;
}

interface CreationTabProps {
  onAssetCreated: () => void;
}

export function CreationTab({ onAssetCreated }: CreationTabProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [department, setDepartment] = useState<Department>('Operations');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [roiEntries, setRoiEntries] = useState<ROIEntry[]>([]);
  const [justification, setJustification] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
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
    
    if (result.status === 'GREEN') toast.success('Security scan passed! Asset is cleared for library.');
    else if (result.status === 'AMBER') toast.warning('Potential issues detected. Review and provide justification.');
    else toast.error('Critical issues found. Remediate content before saving.');
  };
  
  const handleSave = () => {
    if (!canSave || isBlocked) return;
    if (!commitMessage.trim()) {
      toast.error('Commit message is required');
      return;
    }
    
    const currentUser = getCurrentUser();
    const asset = createAsset({
      title: title.trim(),
      content: content.trim(),
      version: 1.0,
      status: assignedTo ? 'pending_review' : 'draft',
      parentId: null,
      assignedTo: assignedTo || null,
      createdBy: currentUser,
      department,
      securityStatus: scanResult!.status,
      lastScanResult: scanResult!,
      justification: justification || undefined,
      commitMessage: commitMessage.trim(),
      isLocked: false,
    });
    
    roiEntries.forEach(entry => {
      if (entry.value > 0) {
        saveROIFact({ assetId: asset.id, category: entry.category, value: entry.value });
      }
    });
    
    toast.success(`Asset "${title}" saved successfully!`);
    setTitle(''); setContent(''); setAssignedTo(''); setRoiEntries([]);
    setJustification(''); setCommitMessage(''); setScanResult(null);
    onAssetCreated();
  };
  
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left Column - Form */}
      <div className="space-y-6">
        <div className="space-y-4">
          {/* Template & Title Row */}
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
          
          {/* Enhanced Prompt Editor */}
          <PromptEditor value={content} onChange={setContent} />
          
          {/* Commit Message */}
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
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={department} onValueChange={(v) => setDepartment(v as Department)}>
                <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign to Reviewer (Optional)</Label>
              <Select value={assignedTo || '__none__'} onValueChange={(v) => setAssignedTo(v === '__none__' ? '' : v)}>
                <SelectTrigger className="bg-card"><SelectValue placeholder="Select reviewer..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No reviewer</SelectItem>
                  {REVIEWERS.map((reviewer) => (
                    <SelectItem key={reviewer.id} value={reviewer.id}>
                      {reviewer.avatar} {reviewer.name} / {reviewer.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-border bg-card p-4">
          <ROIBuilder entries={roiEntries} onChange={setRoiEntries} />
        </div>
      </div>
      
      {/* Right Column - Security Scan */}
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
            disabled={!canSave || isBlocked || !commitMessage.trim()}
            className="w-full gap-2"
            size="lg"
            variant={isBlocked ? 'destructive' : 'default'}
          >
            <Save className="h-5 w-5" />
            {isBlocked ? 'Save Blocked - Remediate Content' : 'Save to Library'}
          </Button>
        </div>
      </div>
    </div>
  );
}
