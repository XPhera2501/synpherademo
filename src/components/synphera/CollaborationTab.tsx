import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SecurityBadge } from './SecurityBadge';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { CommentThread } from './CommentThread';
import { useAuth } from '@/hooks/useAuth';
import { 
  getAssets, updateAsset, createAsset, addLineageEntry, addVersionSnapshot, addAuditLog, getProfiles,
  type DbPromptAsset, type AssetStatusEnum, type DepartmentEnum, type DbProfile
} from '@/lib/supabase-store';
import { DEPARTMENTS } from '@/lib/synphera-types';
import type { SecurityStatus } from '@/lib/synphera-types';
import { ChevronDown, Check, GitFork, Clock, FileText, Lock, Search, Filter, Send, Users, Inbox, Library, Tag, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CollaborationTabProps {
  refreshKey: number;
  onAssetUpdated: () => void;
}

export function CollaborationTab({ refreshKey, onAssetUpdated }: CollaborationTabProps) {
  const { user, isReviewer, canEdit, isAdmin, profile } = useAuth();
  const [assets, setAssets] = useState<DbPromptAsset[]>([]);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [editingAsset, setEditingAsset] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [commitMsg, setCommitMsg] = useState('');
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  const loadData = async () => {
    setLoading(true);
    const [data, profs] = await Promise.all([getAssets(), getProfiles()]);
    setAssets(data);
    setProfiles(profs);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [refreshKey]);

  const profileMap = useMemo(() => new Map(profiles.map(p => [p.id, p.display_name || 'Unknown'])), [profiles]);

  // Computed views
  const myPendingReviews = assets.filter(a =>
    a.assigned_to === user?.id && (a.status === 'draft' || a.status === 'in_review')
  );
  
  const deptQueue = assets.filter(a =>
    a.status === 'in_review' && a.department === profile?.department
  );

  const categories = useMemo(() => [...new Set(assets.map(a => a.category).filter(Boolean))], [assets]);
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    assets.forEach(a => a.tags?.forEach(t => tagSet.add(t)));
    return [...tagSet].sort();
  }, [assets]);

  // Filtered "All Assets" view
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      if (filterDept !== 'all' && a.department !== filterDept) return false;
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      if (filterCategory !== 'all' && a.category !== filterCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.department.toLowerCase().includes(q) ||
          a.category?.toLowerCase().includes(q) ||
          a.tags?.some(t => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [assets, filterDept, filterStatus, filterCategory, searchQuery]);
  
  const handleStartEdit = (asset: DbPromptAsset) => {
    setEditingAsset(asset.id);
    setEditContent(asset.content);
  };

  const handleSubmitForReview = async (asset: DbPromptAsset, reviewerId: string) => {
    if (!user) return;
    const updated = await updateAsset(asset.id, {
      status: 'in_review' as AssetStatusEnum,
      assigned_to: reviewerId,
    });
    if (updated) {
      await addAuditLog({
        user_id: user.id,
        action: 'submit_for_review',
        target_type: 'prompt_asset',
        target_id: asset.id,
        details: { assigned_to: reviewerId },
      });
      toast.success('Submitted for review!');
      onAssetUpdated();
      loadData();
    }
  };
  
  const handleApproveRelease = async (asset: DbPromptAsset) => {
    if (!commitMsg.trim() || !user) {
      toast.error('Commit message required for approval');
      return;
    }
    
    const newVersion = parseFloat((asset.version + 0.1).toFixed(1));
    const updated = await updateAsset(asset.id, {
      content: editContent || asset.content,
      status: 'released' as AssetStatusEnum,
      assigned_to: null,
      security_status: 'GREEN',
      version: newVersion,
      commit_message: commitMsg,
    });
    
    if (updated) {
      await addVersionSnapshot({
        asset_id: asset.id,
        version: newVersion,
        content: updated.content,
        title: updated.title,
        commit_message: commitMsg,
        user_id: user.id,
      });
      await addLineageEntry({
        asset_id: asset.id,
        parent_id: asset.parent_id,
        action: 'released',
        user_id: user.id,
      });
      await addAuditLog({
        user_id: user.id,
        action: 'approve_release',
        target_type: 'prompt_asset',
        target_id: asset.id,
        details: { version: newVersion, commit: commitMsg },
      });
      
      setEditingAsset(null);
      setEditContent('');
      setCommitMsg('');
      toast.success(`"${asset.title}" approved and released!`);
      onAssetUpdated();
      loadData();
    }
  };
  
  const handleFork = async (asset: DbPromptAsset) => {
    if (!user) return;
    const forked = await createAsset({
      title: `${asset.title} (Fork)`,
      content: asset.content,
      version: parseFloat((asset.version + 0.1).toFixed(1)),
      status: 'draft' as AssetStatusEnum,
      parent_id: asset.id,
      assigned_to: null,
      created_by: user.id,
      department: asset.department as DepartmentEnum,
      category: asset.category,
      tags: asset.tags || [],
      security_status: 'PENDING',
      commit_message: `Forked from "${asset.title}" v${asset.version}`,
      is_locked: false,
    });
    
    if (forked) {
      toast.success(`Forked "${asset.title}" — new draft created!`);
      onAssetUpdated();
      loadData();
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="my-reviews" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-card border border-border h-10">
          <TabsTrigger value="my-reviews" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Inbox className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">My Reviews</span>
            <span className="sm:hidden">Reviews</span>
            {myPendingReviews.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-primary/20 text-primary">{myPendingReviews.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="dept-queue" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dept Queue</span>
            <span className="sm:hidden">Dept</span>
            {deptQueue.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{deptQueue.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="all-assets" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Library className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">All Assets</span>
            <span className="sm:hidden">All</span>
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">{assets.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="released" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Check className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Released</span>
            <span className="sm:hidden">Live</span>
          </TabsTrigger>
        </TabsList>

        {/* My Reviews */}
        <TabsContent value="my-reviews" className="space-y-4">
          {myPendingReviews.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Check className="mx-auto h-8 w-8 text-status-green mb-2" />
                <p className="text-muted-foreground">No pending reviews. You're all caught up! 🎉</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myPendingReviews.map(asset => (
                <AssetReviewCard
                  key={asset.id}
                  asset={asset}
                  profileMap={profileMap}
                  editingAsset={editingAsset}
                  editContent={editContent}
                  commitMsg={commitMsg}
                  isReviewer={isReviewer}
                  canEdit={canEdit}
                  onStartEdit={handleStartEdit}
                  onEditContentChange={setEditContent}
                  onCommitMsgChange={setCommitMsg}
                  onApproveRelease={handleApproveRelease}
                  onAssetUpdated={() => { onAssetUpdated(); loadData(); }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Department Queue */}
        <TabsContent value="dept-queue" className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            Showing in-review assets for <Badge variant="outline">{profile?.department || 'your department'}</Badge>
          </div>
          {deptQueue.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No assets pending review in your department.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {deptQueue.map(asset => (
                <AssetReviewCard
                  key={asset.id}
                  asset={asset}
                  profileMap={profileMap}
                  editingAsset={editingAsset}
                  editContent={editContent}
                  commitMsg={commitMsg}
                  isReviewer={isReviewer}
                  canEdit={canEdit}
                  onStartEdit={handleStartEdit}
                  onEditContentChange={setEditContent}
                  onCommitMsgChange={setCommitMsg}
                  onApproveRelease={handleApproveRelease}
                  onAssetUpdated={() => { onAssetUpdated(); loadData(); }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* All Assets with Faceted Search */}
        <TabsContent value="all-assets" className="space-y-4">
          {/* Search & Filters Bar */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search title, content, tags..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-card text-sm"
              />
            </div>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[140px] h-9 text-xs bg-card">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Depts</SelectItem>
                {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] h-9 text-xs bg-card">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="released">Released</SelectItem>
              </SelectContent>
            </Select>
            {categories.length > 0 && (
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[130px] h-9 text-xs bg-card">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Tag Cloud */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allTags.slice(0, 20).map(tag => (
                <Badge
                  key={tag}
                  variant={searchQuery === tag ? 'default' : 'outline'}
                  className="text-[10px] cursor-pointer hover:bg-primary/10"
                  onClick={() => setSearchQuery(searchQuery === tag ? '' : tag)}
                >
                  <Tag className="h-2.5 w-2.5 mr-1" />{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Results */}
          <div className="text-xs text-muted-foreground">{filteredAssets.length} assets found</div>
          <div className="space-y-2">
            {filteredAssets.map(asset => (
              <Card key={asset.id} className="hover:border-primary/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {asset.is_locked && <Lock className="h-3 w-3 text-status-amber" />}
                        <span className="font-medium text-sm truncate">{asset.title}</span>
                        <SecurityBadge status={asset.security_status as SecurityStatus} size="sm" showLabel={false} />
                        <Badge variant="outline" className="text-[10px] capitalize">{asset.status.replace('_', ' ')}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>v{asset.version}</span>
                        <span>•</span>
                        <span>{asset.department}</span>
                        {asset.category && <><span>•</span><span>{asset.category}</span></>}
                        <span>•</span>
                        <span>{profileMap.get(asset.created_by) || 'Unknown'}</span>
                        <span>•</span>
                        <span>{format(new Date(asset.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      {asset.tags && asset.tags.length > 0 && (
                        <div className="flex gap-1 mt-1.5">
                          {asset.tags.slice(0, 5).map(t => (
                            <Badge key={t} variant="secondary" className="text-[10px] h-4 px-1.5">{t}</Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{asset.content}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {canEdit && asset.status === 'draft' && (
                        <ReviewerAssigner
                          asset={asset}
                          profiles={profiles}
                          onSubmit={handleSubmitForReview}
                        />
                      )}
                      {canEdit && (
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleFork(asset)}>
                          <GitFork className="h-3 w-3" />Fork
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                        onClick={() => setExpandedHistory(expandedHistory === asset.id ? null : asset.id)}>
                        <Clock className="h-3 w-3" />History
                      </Button>
                    </div>
                  </div>
                  {expandedHistory === asset.id && (
                    <div className="mt-3 pt-3 border-t border-border animate-fade-in-up space-y-3">
                      <VersionHistoryPanel
                        assetId={asset.id}
                        currentVersion={asset.version}
                        isLocked={asset.is_locked}
                        onRollback={() => { onAssetUpdated(); loadData(); }}
                        onToggleLock={() => { onAssetUpdated(); loadData(); }}
                      />
                      <CommentThread promptId={asset.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredAssets.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No assets match your filters.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Released Library */}
        <TabsContent value="released" className="space-y-4">
          <ReleasedLibrary
            assets={assets.filter(a => a.status === 'released')}
            profileMap={profileMap}
            canEdit={canEdit}
            onFork={handleFork}
            onAssetUpdated={() => { onAssetUpdated(); loadData(); }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =============== Sub-Components ===============

function ReviewerAssigner({ asset, profiles, onSubmit }: {
  asset: DbPromptAsset;
  profiles: DbProfile[];
  onSubmit: (asset: DbPromptAsset, reviewerId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  
  if (open) {
    return (
      <Select onValueChange={(v) => { onSubmit(asset, v); setOpen(false); }}>
        <SelectTrigger className="w-[140px] h-7 text-xs">
          <SelectValue placeholder="Assign reviewer" />
        </SelectTrigger>
        <SelectContent>
          {profiles.filter(p => p.id !== asset.created_by).map(p => (
            <SelectItem key={p.id} value={p.id} className="text-xs">
              {p.display_name || 'Unknown'} • {p.department}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setOpen(true)}>
      <Send className="h-3 w-3" />Submit
    </Button>
  );
}

function AssetReviewCard({ asset, profileMap, editingAsset, editContent, commitMsg, isReviewer, canEdit, onStartEdit, onEditContentChange, onCommitMsgChange, onApproveRelease, onAssetUpdated }: {
  asset: DbPromptAsset;
  profileMap: Map<string, string>;
  editingAsset: string | null;
  editContent: string;
  commitMsg: string;
  isReviewer: boolean;
  canEdit: boolean;
  onStartEdit: (asset: DbPromptAsset) => void;
  onEditContentChange: (val: string) => void;
  onCommitMsgChange: (val: string) => void;
  onApproveRelease: (asset: DbPromptAsset) => void;
  onAssetUpdated: () => void;
}) {
  return (
    <Collapsible>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="text-left min-w-0">
                <CardTitle className="text-base truncate">{asset.title}</CardTitle>
                <CardDescription className="text-xs">
                  v{asset.version} • {asset.department} • by {profileMap.get(asset.created_by) || 'Unknown'} • {format(new Date(asset.created_at), 'MMM d, yyyy')}
                  {asset.commit_message && ` • "${asset.commit_message}"`}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <SecurityBadge status={asset.security_status as SecurityStatus} size="sm" />
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Review and refine content:</p>
              <Textarea
                value={editingAsset === asset.id ? editContent : asset.content}
                onChange={(e) => {
                  if (editingAsset !== asset.id) onStartEdit(asset);
                  onEditContentChange(e.target.value);
                }}
                onFocus={() => onStartEdit(asset)}
                className="min-h-[120px] font-mono text-sm"
                readOnly={!isReviewer}
              />
            </div>
            <CommentThread promptId={asset.id} />
            {isReviewer && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Commit message for approval</Label>
                  <Input
                    placeholder="e.g., Reviewed and approved with minor edits"
                    value={commitMsg}
                    onChange={(e) => onCommitMsgChange(e.target.value)}
                    className="text-sm bg-card"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => onApproveRelease(asset)} className="gap-2" disabled={!commitMsg.trim()}>
                    <Check className="h-4 w-4" />
                    Approve & Release
                  </Button>
                </div>
              </>
            )}
            <VersionHistoryPanel
              assetId={asset.id}
              currentVersion={asset.version}
              isLocked={asset.is_locked}
              onRollback={onAssetUpdated}
              onToggleLock={onAssetUpdated}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function ReleasedLibrary({ assets, profileMap, canEdit, onFork, onAssetUpdated }: {
  assets: DbPromptAsset[];
  profileMap: Map<string, string>;
  canEdit: boolean;
  onFork: (asset: DbPromptAsset) => void;
  onAssetUpdated: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  const filtered = searchQuery
    ? assets.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : assets;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Check className="h-5 w-5 text-status-green" />
          <h2 className="text-lg font-semibold">Released Library</h2>
          <Badge variant="secondary">{assets.length} assets</Badge>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search released..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-card text-sm"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(asset => (
          <Card key={asset.id} className="group hover:border-primary/30 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {asset.is_locked && <Lock className="h-3 w-3 text-status-amber flex-shrink-0" />}
                    <CardTitle className="text-sm line-clamp-1">{asset.title}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    v{asset.version} • {asset.department}
                    {asset.category && ` • ${asset.category}`}
                  </CardDescription>
                </div>
                <SecurityBadge status="GREEN" size="sm" showLabel={false} />
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <p className="text-xs text-muted-foreground line-clamp-2">{asset.content}</p>
              {asset.tags && asset.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {asset.tags.slice(0, 3).map(t => (
                    <Badge key={t} variant="secondary" className="text-[10px] h-4 px-1">{t}</Badge>
                  ))}
                </div>
              )}
              {asset.commit_message && (
                <p className="text-[10px] text-muted-foreground/60 italic truncate">💬 {asset.commit_message}</p>
              )}
              <div className="flex gap-2">
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={() => onFork(asset)}
                    className="flex-1 gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                    <GitFork className="h-3 w-3" />Fork
                  </Button>
                )}
                <Button variant="ghost" size="sm"
                  onClick={() => setExpandedHistory(expandedHistory === asset.id ? null : asset.id)}
                  className="gap-1 text-xs opacity-70 group-hover:opacity-100">
                  <Clock className="h-3 w-3" />History
                </Button>
              </div>
              {expandedHistory === asset.id && (
                <div className="animate-fade-in-up space-y-3">
                  <VersionHistoryPanel
                    assetId={asset.id}
                    currentVersion={asset.version}
                    isLocked={asset.is_locked}
                    onRollback={onAssetUpdated}
                    onToggleLock={onAssetUpdated}
                  />
                  <CommentThread promptId={asset.id} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? `No assets match "${searchQuery}"` : 'No released assets yet.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
