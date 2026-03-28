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
import { supabase } from '@/integrations/supabase/client';
import {
  getAssets, updateAssetWithVersioning, addAuditLog, getProfiles, getROIFacts, replaceROIFacts,
  type DbPromptAsset, type AssetStatusEnum, type DepartmentEnum, type DbProfile, type DbROIFact,
  type PromptAssetMetadata, type PromptWorkflowActor, type PromptWorkflowPhase
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

const REVIEW_PHASE_LABELS: Record<PromptWorkflowPhase, string> = {
  reviewer_review: 'Reviewer Review',
  creator_rework: 'Returned to Creator',
  approver_review: 'Awaiting Approval',
};

function getPromptAssetMetadata(asset: DbPromptAsset): PromptAssetMetadata | null {
  if (!asset.metadata || typeof asset.metadata !== 'object' || Array.isArray(asset.metadata)) {
    return null;
  }

  return asset.metadata as PromptAssetMetadata;
}

function getWorkflowPhase(asset: DbPromptAsset): PromptWorkflowPhase | null {
  const workflowPhase = getPromptAssetMetadata(asset)?.workflow?.phase;
  if (workflowPhase === 'reviewer_review' || workflowPhase === 'creator_rework' || workflowPhase === 'approver_review') {
    return workflowPhase;
  }

  if (asset.status === 'pending_approval') {
    return 'approver_review';
  }

  if (asset.status !== 'in_review') {
    return null;
  }

  if (asset.approver_id) {
    return 'approver_review';
  }

  if (asset.reviewer_id) {
    return 'reviewer_review';
  }

  return 'creator_rework';
}

function buildWorkflowMetadata(
  asset: DbPromptAsset,
  phase: PromptWorkflowPhase,
  updates: Partial<PromptAssetMetadata['workflow']> = {},
): PromptAssetMetadata {
  const currentMetadata = getPromptAssetMetadata(asset) || {};
  const currentWorkflow = currentMetadata.workflow || {};

  return {
    ...currentMetadata,
    workflow: {
      ...currentWorkflow,
      ...updates,
      phase,
    },
  };
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
  const { user, isReviewer, isApprover, isAdmin, profile } = useAuth();
  const [assets, setAssets] = useState<DbPromptAsset[]>([]);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [facts, setFacts] = useState<DbROIFact[]>([]);
  const [rolesByUserId, setRolesByUserId] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [selectedAsset, setSelectedAsset] = useState<DbPromptAsset | null>(null);
  const [editDialogContent, setEditDialogContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editCommitMessage, setEditCommitMessage] = useState('');
  const [editRoiEntries, setEditRoiEntries] = useState<ROIEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');

  const loadData = async () => {
    setLoading(true);
    const [data, profs, f, { data: roleRows }] = await Promise.all([
      getAssets(),
      getProfiles(),
      getROIFacts(),
      supabase.from('user_roles').select('user_id, role'),
    ]);

    const nextRolesByUserId: Record<string, string[]> = {};
    (roleRows || []).forEach((row) => {
      const currentRoles = nextRolesByUserId[row.user_id] || [];
      currentRoles.push(row.role);
      nextRolesByUserId[row.user_id] = currentRoles;
    });

    setAssets(data);
    setProfiles(profs);
    setFacts(f);
    setRolesByUserId(nextRolesByUserId);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [refreshKey]);

  const profileMap = useMemo(() => new Map(profiles.map(p => [p.id, p.display_name || 'Unknown'])), [profiles]);

  // My Reviews: prompts assigned to me for review
  const myReviews = useMemo(() => {
    if (!user) return [];
    return assets.filter(a =>
      a.reviewer_id === user.id &&
      a.status === 'in_review' &&
      getWorkflowPhase(a) === 'reviewer_review'
    );
  }, [assets, user]);

  const myApprovals = useMemo(() => {
    if (!user) return [];
    return assets.filter(a =>
      a.approver_id === user.id &&
      (a.status === 'in_review' || a.status === 'pending_approval') &&
      getWorkflowPhase(a) === 'approver_review'
    );
  }, [assets, user]);

  const myReturnedPrompts = useMemo(() => {
    if (!user) return [];
    return assets.filter(a =>
      a.created_by === user.id &&
      a.status === 'in_review' &&
      getWorkflowPhase(a) === 'creator_rework'
    );
  }, [assets, user]);

  // Dept Queue: created assets in my department without a reviewer yet
  const deptQueue = useMemo(() => {
    if (!user || !profile?.department) return [];
    return assets.filter(a =>
      a.status === 'created' &&
      a.department === profile.department &&
      !a.reviewer_id
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
  const filteredApprovals = useMemo(() => applyFilters(myApprovals), [myApprovals, applyFilters]);
  const filteredReturnedPrompts = useMemo(() => applyFilters(myReturnedPrompts), [myReturnedPrompts, applyFilters]);
  const filteredDeptQueue = useMemo(() => applyFilters(deptQueue), [deptQueue, applyFilters]);

  const profileById = useMemo(() => new Map(profiles.map((entry) => [entry.id, entry])), [profiles]);

  const canReviewAsset = useCallback((asset: DbPromptAsset | null) => {
    if (!asset || !user) {
      return false;
    }

    if (isAdmin) {
      return true;
    }

    return isReviewer && asset.reviewer_id === user.id && getWorkflowPhase(asset) === 'reviewer_review';
  }, [isAdmin, isReviewer, user]);

  const canApproveAsset = useCallback((asset: DbPromptAsset | null) => {
    if (!asset || !user) {
      return false;
    }

    if (isAdmin) {
      return true;
    }

    return isApprover && asset.approver_id === user.id && getWorkflowPhase(asset) === 'approver_review';
  }, [isAdmin, isApprover, user]);

  const canReworkAsset = useCallback((asset: DbPromptAsset | null) => {
    if (!asset || !user) {
      return false;
    }

    if (isAdmin) {
      return true;
    }

    return asset.created_by === user.id && asset.status === 'in_review' && getWorkflowPhase(asset) === 'creator_rework';
  }, [isAdmin, user]);

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

  const handleClaimReview = async (asset: DbPromptAsset) => {
    if (!user) return;

    setIsSaving(true);
    const updated = await updateAssetWithVersioning(
      asset.id,
      {
        status: 'in_review' as AssetStatusEnum,
        reviewer_id: user.id,
        approver_id: null,
        metadata: buildWorkflowMetadata(asset, 'reviewer_review', {
          returnedBy: undefined,
          returnedAt: undefined,
          submittedForApprovalAt: undefined,
          reassignedAt: new Date().toISOString(),
        }),
      },
      user.id,
      'Claimed review ownership',
      'claim_review',
    );

    if (updated) {
      await addAuditLog({
        user_id: user.id,
        action: 'claim_review',
        target_type: 'prompt_asset',
        target_id: updated.id,
        details: { reviewer_id: user.id },
      });
      toast.success('Review claimed');
      onAssetUpdated();
      loadData();
    } else {
      toast.error('Failed to claim review');
    }

    setIsSaving(false);
  };

  // Save for Later Completion — keeps the current review state
  const handleSaveForLater = async () => {
    if (!selectedAsset || !user) return;
    setIsSaving(true);
    const updated = await updateAssetWithVersioning(
      selectedAsset.id,
      { content: editDialogContent, title: editTitle, status: selectedAsset.status },
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
      toast.success('Prompt changes saved');
      setSelectedAsset(null);
      onAssetUpdated();
      loadData();
    } else {
      toast.error('Failed to save prompt');
    }
    setIsSaving(false);
  };

  const handleReturnToCreator = async () => {
    if (!selectedAsset || !user) return;
    if (!editCommitMessage.trim()) {
      toast.error('Please add a message before returning this prompt');
      return;
    }

    const canReturn = canReviewAsset(selectedAsset) || canApproveAsset(selectedAsset);

    if (!canReturn) {
      toast.error('You do not have permission to return this prompt');
      return;
    }

    const returnedBy: PromptWorkflowActor = canApproveAsset(selectedAsset) ? 'approver' : 'reviewer';
    setIsSaving(true);
    const updated = await updateAssetWithVersioning(
      selectedAsset.id,
      {
        content: editDialogContent,
        title: editTitle,
        status: 'in_review' as AssetStatusEnum,
        reviewer_id: null,
        approver_id: null,
        metadata: buildWorkflowMetadata(selectedAsset, 'creator_rework', {
          returnedBy,
          returnedAt: new Date().toISOString(),
          submittedForApprovalAt: undefined,
        }),
      },
      user.id,
      editCommitMessage.trim(),
      'return_to_creator',
    );

    if (updated) {
      const benefitsSaved = await persistEditedBenefits(updated.id);
      if (!benefitsSaved) {
        setIsSaving(false);
        return;
      }

      toast.success('Prompt returned to creator');
      setSelectedAsset(null);
      onAssetUpdated();
      loadData();
    } else {
      toast.error('Failed to return prompt');
    }

    setIsSaving(false);
  };

  const handleSubmitForApproval = async () => {
    if (!selectedAsset || !user) return;
    if (!canReviewAsset(selectedAsset)) {
      toast.error('You do not have permission to submit this prompt for approval');
      return;
    }
    if (!editCommitMessage.trim()) {
      toast.error('Please add a message before submitting for approval');
      return;
    }

    const creatorProfile = profileById.get(selectedAsset.created_by);
    const approverId = creatorProfile?.manager_id || null;

    if (!approverId) {
      toast.error('The creator does not have a manager assigned');
      return;
    }

    const approverProfile = profileById.get(approverId);
    const approverRoles = rolesByUserId[approverId] || [];

    if (!approverRoles.includes('approver') && !approverRoles.includes('admin') && !approverRoles.includes('super_admin')) {
      toast.error('The creator\'s manager does not have Approver access');
      return;
    }

    if (!isAdmin && approverProfile?.department !== creatorProfile?.department) {
      toast.error('The approver must be in the same department as the creator');
      return;
    }

    setIsSaving(true);
    const updated = await updateAssetWithVersioning(
      selectedAsset.id,
      {
        content: editDialogContent,
        title: editTitle,
        status: 'in_review' as AssetStatusEnum,
        reviewer_id: selectedAsset.reviewer_id || user.id,
        approver_id: approverId,
        metadata: buildWorkflowMetadata(selectedAsset, 'approver_review', {
          returnedBy: undefined,
          returnedAt: undefined,
          reassignedAt: undefined,
          submittedForApprovalAt: new Date().toISOString(),
        }),
      },
      user.id,
      editCommitMessage.trim(),
      'submit_for_approval',
    );

    if (updated) {
      const benefitsSaved = await persistEditedBenefits(updated.id);
      if (!benefitsSaved) {
        setIsSaving(false);
        return;
      }

      await addAuditLog({
        user_id: user.id,
        action: 'submit_for_approval',
        target_type: 'prompt_asset',
        target_id: updated.id,
        details: { approver_id: approverId, reviewer_id: updated.reviewer_id },
      });

      toast.success('Prompt submitted for approval');
      setSelectedAsset(null);
      onAssetUpdated();
      loadData();
    } else {
      toast.error('Failed to submit for approval');
    }

    setIsSaving(false);
  };

  // Approve — sets status to approved
  const handleApprove = async () => {
    if (!selectedAsset || !user) return;
    if (!canApproveAsset(selectedAsset)) {
      toast.error('You do not have permission to approve this prompt');
      return;
    }
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
        reviewer_id: selectedAsset.reviewer_id,
        approver_id: selectedAsset.approver_id,
        security_status: 'GREEN',
        metadata: buildWorkflowMetadata(selectedAsset, 'approver_review'),
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

  const handleResubmitToReviewer = async (reviewerId: string) => {
    if (!selectedAsset || !user) return;
    if (!canReworkAsset(selectedAsset)) {
      toast.error('You do not have permission to re-submit this prompt');
      return;
    }
    if (!editCommitMessage.trim()) {
      toast.error('Please add a message before re-submitting this prompt');
      return;
    }

    setIsSaving(true);
    const updated = await updateAssetWithVersioning(
      selectedAsset.id,
      {
        content: editDialogContent,
        title: editTitle,
        status: 'in_review' as AssetStatusEnum,
        reviewer_id: reviewerId,
        approver_id: null,
        metadata: buildWorkflowMetadata(selectedAsset, 'reviewer_review', {
          returnedBy: undefined,
          returnedAt: undefined,
          submittedForApprovalAt: undefined,
          reassignedAt: new Date().toISOString(),
        }),
      },
      user.id,
      editCommitMessage.trim(),
      'resubmit_for_review',
    );

    if (updated) {
      const benefitsSaved = await persistEditedBenefits(updated.id);
      if (!benefitsSaved) {
        setIsSaving(false);
        return;
      }

      await addAuditLog({
        user_id: user.id,
        action: 'resubmit_for_review',
        target_type: 'prompt_asset',
        target_id: updated.id,
        details: { reviewer_id: reviewerId },
      });

      toast.success('Prompt sent back to review');
      setAssignDialogOpen(false);
      setSelectedAsset(null);
      onAssetUpdated();
      loadData();
    } else {
      toast.error('Failed to re-submit prompt for review');
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
    const workflowPhase = getWorkflowPhase(asset);

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
              {asset.status === 'in_review' && workflowPhase && (
                <Badge variant="secondary" className="text-[10px]">{REVIEW_PHASE_LABELS[workflowPhase]}</Badge>
              )}
              <span>v{asset.version}</span>
              <span>•</span>
              <span>{asset.department}</span>
              {asset.reviewer_id && (
                <>
                  <span>•</span>
                  <span>Reviewer: {profileMap.get(asset.reviewer_id) || 'Unknown'}</span>
                </>
              )}
              {asset.approver_id && (
                <>
                  <span>•</span>
                  <span>Approver: {profileMap.get(asset.approver_id) || 'Unknown'}</span>
                </>
              )}
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
            <div className="flex items-center gap-2">
              {asset.status === 'created' && !asset.reviewer_id && isReviewer && (
                <Button size="sm" className="gap-1 text-xs h-7" onClick={(event) => { event.stopPropagation(); void handleClaimReview(asset); }}>
                  <ClipboardList className="h-3 w-3" />
                  Start Review
                </Button>
              )}
              <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => openDetail(asset)}>
                <Edit3 className="h-3 w-3" />
                Open
              </Button>
            </div>
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

  const showReturnedTab = !!user;
  const tabCount = 2 + (isApprover ? 1 : 0) + (showReturnedTab ? 1 : 0);
  const tabsGridClass = tabCount === 4 ? 'grid-cols-4' : tabCount === 3 ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <div className="space-y-6">
      <Tabs defaultValue="my-review" className="space-y-4">
        <TabsList className={`grid w-full ${tabsGridClass} bg-card border border-border h-10`}>
          <TabsTrigger value="my-review" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Inbox className="h-3.5 w-3.5" />
            My Reviews
            {myReviews.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-primary/20 text-primary">{myReviews.length}</Badge>}
          </TabsTrigger>
          {isApprover && (
            <TabsTrigger value="my-approval" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Check className="h-3.5 w-3.5" />
              My Approvals
              {myApprovals.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-primary/20 text-primary">{myApprovals.length}</Badge>}
            </TabsTrigger>
          )}
          {showReturnedTab && (
            <TabsTrigger value="returned-to-me" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Edit3 className="h-3.5 w-3.5" />
              Returned to Me
              {myReturnedPrompts.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-primary/20 text-primary">{myReturnedPrompts.length}</Badge>}
            </TabsTrigger>
          )}
          <TabsTrigger value="dept-queue" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="h-3.5 w-3.5" />
            Department Queue
            {deptQueue.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{deptQueue.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* My Reviews — Prompts assigned to me with in_review status */}
        <TabsContent value="my-review" className="space-y-4">
          {filterBar}
          <Card className="shadow-none overflow-hidden">
            {filteredReviews.length === 0 ? (
              <CardContent className="py-12 text-center">
                <Inbox className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No prompts pending your review.</p>
                <p className="text-xs text-muted-foreground mt-1">Prompts assigned to you with 'In Review' status will appear here.</p>
              </CardContent>
            ) : (
              filteredReviews.map(a => renderRow(a))
            )}
          </Card>
        </TabsContent>

        {isApprover && (
          <TabsContent value="my-approval" className="space-y-4">
            {filterBar}
            <Card className="shadow-none overflow-hidden">
              {filteredApprovals.length === 0 ? (
                <CardContent className="py-12 text-center">
                  <Check className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No prompts pending your approval.</p>
                  <p className="text-xs text-muted-foreground mt-1">Items awaiting approval remain in the In Review lifecycle stage.</p>
                </CardContent>
              ) : (
                filteredApprovals.map(a => renderRow(a))
              )}
            </Card>
          </TabsContent>
        )}

        {showReturnedTab && (
          <TabsContent value="returned-to-me" className="space-y-4">
            {filterBar}
            <Card className="shadow-none overflow-hidden">
              {filteredReturnedPrompts.length === 0 ? (
                <CardContent className="py-12 text-center">
                  <Edit3 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No prompts have been returned to you.</p>
                  <p className="text-xs text-muted-foreground mt-1">Returned prompts stay in review until you revise them and send them back to a reviewer.</p>
                </CardContent>
              ) : (
                filteredReturnedPrompts.map(a => renderRow(a))
              )}
            </Card>
          </TabsContent>
        )}

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
        <DialogContent className="max-w-3xl max-h-[85vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden gap-0 p-0">
          {selectedAsset && (
            <>
              <DialogHeader className="px-6 pb-4 pt-6 pr-12 border-b border-border">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Edit3 className="h-4 w-4" />
                  Review Prompt
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 overflow-y-auto px-6 py-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Title</Label>
                  <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="bg-card text-sm" />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <StatusDot status={selectedAsset.status} />
                  <Badge variant="outline" className="capitalize text-[10px]">{STATUS_LABELS[selectedAsset.status]}</Badge>
                  {selectedAsset.status === 'in_review' && getWorkflowPhase(selectedAsset) && (
                    <Badge variant="secondary" className="text-[10px]">{REVIEW_PHASE_LABELS[getWorkflowPhase(selectedAsset)!]}</Badge>
                  )}
                  <SecurityBadge status={selectedAsset.security_status as SecurityStatus} size="sm" showLabel={false} />
                  <span>v{selectedAsset.version}</span>
                  <span>•</span>
                  {selectedAsset.reviewer_id && (
                    <>
                      <span>Reviewer {profileMap.get(selectedAsset.reviewer_id) || 'Unknown'}</span>
                      <span>•</span>
                    </>
                  )}
                  {selectedAsset.approver_id && (
                    <>
                      <span>Approver {profileMap.get(selectedAsset.approver_id) || 'Unknown'}</span>
                      <span>•</span>
                    </>
                  )}
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

              <DialogFooter className="flex-col sm:flex-row gap-2 border-t border-border bg-background px-6 py-4">
                <Button variant="outline" onClick={() => setSelectedAsset(null)}>Cancel</Button>
                {(canReviewAsset(selectedAsset) || canApproveAsset(selectedAsset)) && (
                  <Button
                    variant="outline"
                    onClick={handleReturnToCreator}
                    disabled={isSaving || !editCommitMessage.trim()}
                    className="gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Return to Creator
                  </Button>
                )}
                {selectedAsset.status === 'in_review' && canReviewAsset(selectedAsset) && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={handleSaveForLater}
                      disabled={isSaving}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Saving...' : 'Save Review Progress'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSubmitForApproval}
                      disabled={isSaving || !editCommitMessage.trim()}
                      className="gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Submit for Approval
                    </Button>
                  </>
                )}
                {selectedAsset.status === 'in_review' && canReworkAsset(selectedAsset) && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={handleSaveForLater}
                      disabled={isSaving}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Saving...' : 'Save Rework'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setAssignDialogOpen(true)}
                      disabled={isSaving || !editCommitMessage.trim()}
                      className="gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Assign Back to Reviewer
                    </Button>
                  </>
                )}
                {canApproveAsset(selectedAsset) && (
                  <Button
                    onClick={handleApprove}
                    disabled={isSaving || !editCommitMessage.trim()}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    {isSaving ? 'Approving...' : 'Approve'}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AssignForReviewDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onSend={(reviewerId) => { void handleResubmitToReviewer(reviewerId); }}
      />
    </div>
  );
}
