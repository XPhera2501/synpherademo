import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SecurityBadge } from './SecurityBadge';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { CommentThread } from './CommentThread';
import { ROIBuilder } from './ROIBuilder';
import { AssignForReviewDialog } from './AssignForReviewDialog';
import { useAuth } from '@/hooks/useAuth';
import {
  getAssets, updateAssetWithVersioning, addAuditLog, getProfiles, getROIFacts, replaceROIFacts,
  type DbPromptAsset, type AssetStatusEnum, type DepartmentEnum, type DbProfile, type DbROIFact, type PromptAssetMetadata
} from '@/lib/supabase-store';
import { DEPARTMENTS } from '@/lib/synphera-types';
import type { SecurityStatus } from '@/lib/synphera-types';
import type { ROIEntry } from './ROIBuilder';
import {
  ChevronDown, ChevronRight, Check, Clock, FileText, Lock, Search, Filter, Send, Users,
  Inbox, Tag, Building2, ClipboardList, Save, Eye, Edit3, Activity, TrendingUp, Cpu, Brain, AlertTriangle, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CollaborationTabProps {
  refreshKey: number;
  onAssetUpdated: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'hsl(var(--status-red))',
  created: 'hsl(var(--status-amber))',
  in_review: 'hsl(var(--synphera-purple))',
  approved: 'hsl(var(--status-green))',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  created: 'Created',
  in_review: 'In Review',
  approved: 'Approved',
};

function getPromptAssetMetadata(asset: DbPromptAsset): PromptAssetMetadata | null {
  if (!asset.metadata || typeof asset.metadata !== 'object' || Array.isArray(asset.metadata)) {
    return null;
  }

  return asset.metadata as PromptAssetMetadata;
}

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className="inline-block h-3 w-3 rounded-full flex-shrink-0"
      style={{ backgroundColor: STATUS_COLORS[status] || 'hsl(var(--muted-foreground))' }}
    />
  );
}

export function CollaborationTab({ refreshKey, onAssetUpdated }: CollaborationTabProps) {
  const { user, isReviewer, canEdit, isAdmin, profile } = useAuth();
  const [assets, setAssets] = useState<DbPromptAsset[]>([]);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [facts, setFacts] = useState<DbROIFact[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [selectedAsset, setSelectedAsset] = useState<DbPromptAsset | null>(null);
  const [editDialogContent, setEditDialogContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editCommitMessage, setEditCommitMessage] = useState('');
  const [editRoiEntries, setEditRoiEntries] = useState<ROIEntry[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');

  const loadData = async () => {
    setLoading(true);
    const [data, profs, f] = await Promise.all([getAssets(), getProfiles(), getROIFacts()]);
    setAssets(data);
    setProfiles(profs);
    setFacts(f);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [refreshKey]);

  const profileMap = useMemo(() => new Map(profiles.map(p => [p.id, p.display_name || 'Unknown'])), [profiles]);

  // My Reviews: prompts assigned to me with 'created' or 'in_review' status
  const myReviews = useMemo(() => {
    if (!user) return [];
    return assets.filter(a => a.assigned_to === user.id && (a.status === 'created' || a.status === 'in_review'));
  }, [assets, user]);

  // Dept Queue: unassigned created/in_review assets in my department
  const deptQueue = useMemo(() => {
    if (!user || !profile?.department) return [];
    return assets.filter(a =>
      (a.status === 'created' || a.status === 'in_review') &&
      a.department === profile.department &&
      !a.assigned_to
    );
  }, [assets, user, profile?.department]);

  // Apply filters
  const applyFilters = useCallback((list: DbPromptAsset[]) => {
    let filtered = list;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)
      );
    }
    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      if (dateFilter === '7d') cutoff.setDate(now.getDate() - 7);
      else if (dateFilter === '30d') cutoff.setDate(now.getDate() - 30);
      else if (dateFilter === '90d') cutoff.setDate(now.getDate() - 90);
      filtered = filtered.filter(a => new Date(a.created_at) >= cutoff);
    }
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'date_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'title_asc') return a.title.localeCompare(b.title);
      if (sortBy === 'title_desc') return b.title.localeCompare(a.title);
      return 0;
    });
    return filtered;
  }, [searchQuery, dateFilter, sortBy]);

  const filteredReviews = useMemo(() => applyFilters(myReviews), [myReviews, applyFilters]);
  const filteredDeptQueue = useMemo(() => applyFilters(deptQueue), [deptQueue, applyFilters]);

  const getAssetFacts = (assetId: string) => facts.filter(f => f.asset_id === assetId);

  const openDetail = (asset: DbPromptAsset) => {
    const assetFacts = getAssetFacts(asset.id);
    setSelectedAsset(asset);
    setEditDialogContent(asset.content);
    setEditTitle(asset.title);
    setEditCommitMessage('');
    setEditRoiEntries(assetFacts.map((fact) => ({
      category: fact.category as ROIEntry['category'],
      value: Number(fact.value),
      description: fact.description || '',
    })));
  };

  const persistEditedBenefits = async (assetId: string) => {
    const factsSaved = await replaceROIFacts(
      assetId,
      editRoiEntries
        .filter((entry) => entry.value !== 0 || entry.description.trim())
        .map((entry) => ({
          category: entry.category,
          value: entry.value,
          description: entry.description.trim() || null,
        })),
    );

    if (!factsSaved) {
      toast.error('Failed to save benefit updates');
      return false;
    }

    return true;
  };

  // Save for Later Completion — sets status to in_review
  const handleSaveForLater = async () => {
    if (!selectedAsset || !user) return;
    setIsSaving(true);
    const updated = await updateAssetWithVersioning(
      selectedAsset.id,
      { content: editDialogContent, title: editTitle, status: 'in_review' as AssetStatusEnum },
      user.id,
      editCommitMessage.trim() || 'Saved for later completion',
      'update',
    );
    if (updated) {
      const benefitsSaved = await persistEditedBenefits(updated.id);
      if (!benefitsSaved) {
        setIsSaving(false);
        return;
      }
      toast.success('Prompt saved — status set to In Review');
      setSelectedAsset(null);
      onAssetUpdated();
      loadData();
    } else {
      toast.error('Failed to save prompt');
    }
    setIsSaving(false);
  };

  // Approve — sets status to approved
  const handleApprove = async () => {
    if (!selectedAsset || !user) return;
    if (!editCommitMessage.trim()) {
      toast.error('Please add a commit message before approving');
      return;
    }
    setIsSaving(true);
    const updated = await updateAssetWithVersioning(
      selectedAsset.id,
      {
        content: editDialogContent,
        title: editTitle,
        status: 'approved' as AssetStatusEnum,
        assigned_to: null,
        security_status: 'GREEN',
      },
      user.id,
      editCommitMessage.trim(),
      'approve_release',
    );
    if (updated) {
      const benefitsSaved = await persistEditedBenefits(updated.id);
      if (!benefitsSaved) {
        setIsSaving(false);
        return;
      }
      toast.success(`"${editTitle}" approved!`);
      setSelectedAsset(null);
      onAssetUpdated();
      loadData();
    } else {
      toast.error('Failed to approve prompt');
    }
    setIsSaving(false);
  };

  const handleSubmitForValidation = async (colleagueId: string, requestType: 'review' | 'validate') => {
    if (!selectedAsset || !user) return;
    if (!editCommitMessage.trim()) {
      toast.error('Please add a message before submitting for validation');
      return;
    }

    setIsSaving(true);
    const updated = await updateAssetWithVersioning(
      selectedAsset.id,
      {
        content: editDialogContent,
        title: editTitle,
        status: 'created' as AssetStatusEnum,
        assigned_to: colleagueId,
      },
      user.id,
      editCommitMessage.trim(),
      `submit_for_${requestType}`,
    );

    if (updated) {
      const benefitsSaved = await persistEditedBenefits(updated.id);
      if (!benefitsSaved) {
        setIsSaving(false);
        return;
      }

      await addAuditLog({
        user_id: user.id,
        action: `submit_for_${requestType}`,
        target_type: 'prompt_asset',
        target_id: updated.id,
        details: { assigned_to: colleagueId, request_type: requestType },
      });

      toast.success(`Prompt submitted for ${requestType}`);
      setAssignDialogOpen(false);
      setSelectedAsset(null);
      onAssetUpdated();
      loadData();
    } else {
      toast.error('Failed to submit prompt for validation');
    }

    setIsSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const renderRow = (asset: DbPromptAsset) => {
    const isExpanded = expandedId === asset.id;
    const meta = getPromptAssetMetadata(asset);
    const assetFacts = getAssetFacts(asset.id);

    return (
      <Collapsible key={asset.id} open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : asset.id)}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors">
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            <StatusDot status={asset.status} />
            <span className="text-sm flex-1 min-w-0">
              {asset.title}
              <span className="text-muted-foreground ml-2 text-xs">
                ({STATUS_LABELS[asset.status] || asset.status})
              </span>
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {profileMap.get(asset.created_by) || 'Unknown'} • {format(new Date(asset.created_at), 'MMM d')}
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 py-3 bg-muted/10 border-b border-border/50 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <Badge variant="outline" className="capitalize text-[10px]">{STATUS_LABELS[asset.status] || asset.status}</Badge>
              <span>v{asset.version}</span>
              <span>•</span>
              <span>{asset.department}</span>
              <span>•</span>
              <span>By {profileMap.get(asset.created_by) || 'Unknown'}</span>
              <span>•</span>
              <span>{format(new Date(asset.created_at), 'MMM d, yyyy')}</span>
              {meta?.taskType && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Activity className="h-2.5 w-2.5" />
                  {meta.taskType}
                </Badge>
              )}
              {assetFacts.length > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <TrendingUp className="h-2.5 w-2.5" />
                  {assetFacts.length} benefit{assetFacts.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{asset.content}</p>
            <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => openDetail(asset)}>
              <Edit3 className="h-3 w-3" />
              Open & Review
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const filterBar = (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by keyword..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9 h-9 bg-card text-sm"
        />
      </div>
      <Select value={dateFilter} onValueChange={setDateFilter}>
        <SelectTrigger className="w-[150px] h-9 text-sm">
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="7d">Last 7 Days</SelectItem>
          <SelectItem value="30d">Last 30 Days</SelectItem>
          <SelectItem value="90d">Last 90 Days</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger className="w-[150px] h-9 text-sm">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date_desc">Newest First</SelectItem>
          <SelectItem value="date_asc">Oldest First</SelectItem>
          <SelectItem value="title_asc">Title A-Z</SelectItem>
          <SelectItem value="title_desc">Title Z-A</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="my-review" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-card border border-border h-10">
          <TabsTrigger value="my-review" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Inbox className="h-3.5 w-3.5" />
            My Reviews
            {myReviews.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-primary/20 text-primary">{myReviews.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="dept-queue" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="h-3.5 w-3.5" />
            Department Queue
            {deptQueue.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{deptQueue.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* My Reviews — Prompts assigned to me with created/in_review status */}
        <TabsContent value="my-review" className="space-y-4">
          {filterBar}
          <Card className="shadow-none overflow-hidden">
            {filteredReviews.length === 0 ? (
              <CardContent className="py-12 text-center">
                <Inbox className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No prompts pending your review.</p>
                <p className="text-xs text-muted-foreground mt-1">Prompts assigned to you with 'Created' or 'In Review' status will appear here.</p>
              </CardContent>
            ) : (
              filteredReviews.map(a => renderRow(a))
            )}
          </Card>
        </TabsContent>

        {/* Department Queue */}
        <TabsContent value="dept-queue" className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Building2 className="h-4 w-4" />
            Showing pending prompts for <Badge variant="outline">{profile?.department || 'your department'}</Badge>
          </div>
          {filterBar}
          {filteredDeptQueue.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No unassigned prompts in your department queue.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-none overflow-hidden">
              {filteredDeptQueue.map(a => renderRow(a))}
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Review / Edit Dialog */}
      <Dialog open={!!selectedAsset} onOpenChange={(open) => { if (!open) setSelectedAsset(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedAsset && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Edit3 className="h-4 w-4" />
                  Review Prompt
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Title</Label>
                  <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="bg-card text-sm" />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <StatusDot status={selectedAsset.status} />
                  <Badge variant="outline" className="capitalize text-[10px]">{STATUS_LABELS[selectedAsset.status]}</Badge>
                  <SecurityBadge status={selectedAsset.security_status as SecurityStatus} size="sm" showLabel={false} />
                  <span>v{selectedAsset.version}</span>
                  <span>•</span>
                  <span>By {profileMap.get(selectedAsset.created_by) || 'Unknown'}</span>
                  <span>•</span>
                  <span>{format(new Date(selectedAsset.created_at), 'PPP')}</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Prompt Content</Label>
                  <Textarea value={editDialogContent} onChange={e => setEditDialogContent(e.target.value)} className="bg-card text-sm font-mono min-h-[200px]" />
                </div>

                <Card className="shadow-none">
                  <CardHeader className="pb-2 px-4 pt-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Benefits
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Reviewers can add, adjust, or remove benefit assumptions before saving or approving.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <ROIBuilder entries={editRoiEntries} onChange={setEditRoiEntries} department={selectedAsset.department} />
                  </CardContent>
                </Card>

                {/* Prompt Analysis Metadata */}
                {(() => {
                  const meta = getPromptAssetMetadata(selectedAsset);
                  if (!meta || !meta.taskType) return null;
                  return (
                    <Card className="shadow-none">
                      <CardHeader className="pb-2 px-4 pt-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Activity className="h-4 w-4 text-primary" />
                          Prompt Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border p-2.5 space-y-0.5">
                            <span className="text-[10px] font-medium text-muted-foreground">Task Classification</span>
                            <p className="text-sm font-semibold">{meta.taskType}</p>
                          </div>
                          <div className="rounded-lg border p-2.5 space-y-0.5">
                            <span className="text-[10px] font-medium text-muted-foreground">Determinism Score</span>
                            <p className="text-sm font-semibold">{meta.determinismScore} / 100</p>
                            <div className="w-full bg-muted rounded-full h-1">
                              <div
                                className="h-1 rounded-full transition-all"
                                style={{
                                  width: `${meta.determinismScore}%`,
                                  backgroundColor: meta.determinismScore >= 70 ? 'hsl(var(--status-green))' : meta.determinismScore >= 40 ? 'hsl(var(--status-amber))' : 'hsl(var(--status-red))',
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {meta.flags && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-medium text-muted-foreground">Risk & Compliance Signals</span>
                            {Object.entries(meta.flags).map(([key, val]) => (
                              <p key={key} className="text-xs flex items-center gap-1.5">
                                {val ? <AlertTriangle className="h-3 w-3 text-status-amber" /> : <CheckCircle className="h-3 w-3 text-status-green" />}
                                {key}: {val ? 'Yes' : 'No'}
                              </p>
                            ))}
                          </div>
                        )}

                        {meta.scores && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-medium text-muted-foreground">Scoring Axes</span>
                            <div className="grid gap-1.5 sm:grid-cols-2">
                              {Object.entries(meta.scores).map(([axis, val]) => (
                                <div key={axis} className="flex items-center gap-2">
                                  <span className="text-[10px] capitalize w-20 text-muted-foreground">{axis}</span>
                                  <div className="flex-1 bg-muted rounded-full h-1">
                                    <div className="h-1 rounded-full bg-primary transition-all" style={{ width: `${(val as number) * 100}%` }} />
                                  </div>
                                  <span className="text-[10px] font-mono w-6 text-right">{(val as number).toFixed(1)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {meta.routing?.allocation && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                              <Cpu className="h-3 w-3" /> Execution Routing
                            </span>
                            <div className="flex gap-2 flex-wrap">
                              {Object.entries(meta.routing.allocation).map(([engine, pct]) => (
                                <Tooltip key={engine}>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="gap-1 text-[10px] cursor-help">
                                      {engine === 'LLM' && <Brain className="h-2.5 w-2.5" />}
                                      {engine === 'C++' && <Cpu className="h-2.5 w-2.5" />}
                                      {engine}: {pct as number}%
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">{meta.routing.rationale?.[engine]}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

                {selectedAsset.commit_message && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Last message:</span> {selectedAsset.commit_message}
                  </div>
                )}

                {/* Comments */}
                <CommentThread promptId={selectedAsset.id} />

                {/* Commit Message */}
                <div className="space-y-3 border-t border-border pt-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Commit Message</Label>
                    <Input
                      placeholder="Describe your changes..."
                      value={editCommitMessage}
                      onChange={e => setEditCommitMessage(e.target.value)}
                      className="bg-card text-sm"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setSelectedAsset(null)}>Cancel</Button>
                <Button
                  variant="outline"
                  onClick={() => setAssignDialogOpen(true)}
                  disabled={isSaving || !editCommitMessage.trim()}
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  Submit for Validation
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleSaveForLater}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save for Later Completion'}
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isSaving || !editCommitMessage.trim()}
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  {isSaving ? 'Approving...' : 'Approve'}
                </Button>
              </DialogFooter>

              <AssignForReviewDialog
                open={assignDialogOpen}
                onOpenChange={setAssignDialogOpen}
                onSend={handleSubmitForValidation}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
