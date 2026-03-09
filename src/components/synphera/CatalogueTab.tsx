import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SecurityBadge } from './SecurityBadge';
import { ROIBuilder } from './ROIBuilder';
import { ScanResultPanel } from './ScanResultPanel';
import { useAuth } from '@/hooks/useAuth';
import { getAssets, getROIFacts, getProfiles, updateAssetWithVersioning, type DbPromptAsset, type DbROIFact, type DbProfile, type AssetStatusEnum } from '@/lib/supabase-store';
import type { SecurityStatus, ROICategory } from '@/lib/synphera-types';
import { Search, ChevronRight, FileText, TrendingUp, Activity, Cpu, Brain, AlertTriangle, CheckCircle, Building2, ClipboardList, Save, Eye, Edit3, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CatalogueTabProps {
  refreshKey: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'hsl(var(--status-red))',
  in_review: 'hsl(var(--status-amber))',
  approved: 'hsl(var(--status-green))',
  released: 'hsl(var(--synphera-purple))',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_review: 'Pending Review',
  approved: 'Approved',
  released: 'Released',
};

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className="inline-block h-3 w-3 rounded-full flex-shrink-0"
      style={{ backgroundColor: STATUS_COLORS[status] || 'hsl(var(--muted-foreground))' }}
    />
  );
}

export function CatalogueTab({ refreshKey }: CatalogueTabProps) {
  const { user, profile, canEdit } = useAuth();
  const [assets, setAssets] = useState<DbPromptAsset[]>([]);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [facts, setFacts] = useState<DbROIFact[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');

  // Detail dialog
  const [selectedAsset, setSelectedAsset] = useState<DbPromptAsset | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editCommitMessage, setEditCommitMessage] = useState('');
  const [editStatus, setEditStatus] = useState<AssetStatusEnum>('draft');
  const [isSaving, setIsSaving] = useState(false);

  // Expanded rows
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [a, f, p] = await Promise.all([getAssets(), getROIFacts(), getProfiles()]);
      setAssets(a);
      setFacts(f);
      setProfiles(p);
      setLoading(false);
    })();
  }, [refreshKey]);

  const profileMap = useMemo(() => new Map(profiles.map(p => [p.id, p.display_name || 'Unknown'])), [profiles]);

  // Split into assignments to me vs dept library
  const assignedToMe = useMemo(() => {
    if (!user) return [];
    return assets.filter(a => a.assigned_to === user.id);
  }, [assets, user]);

  const deptLibrary = useMemo(() => {
    const dept = profile?.department;
    if (!dept || !user) return [];
    return assets.filter(a => a.department === dept && a.assigned_to !== user.id);
  }, [assets, profile?.department, user]);

  // Apply filters
  const applyFilters = (list: DbPromptAsset[]) => {
    let filtered = list;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      if (dateFilter === '7d') cutoff.setDate(now.getDate() - 7);
      else if (dateFilter === '30d') cutoff.setDate(now.getDate() - 30);
      else if (dateFilter === '90d') cutoff.setDate(now.getDate() - 90);
      filtered = filtered.filter(a => new Date(a.created_at) >= cutoff);
    }

    return filtered;
  };

  const filteredAssignments = useMemo(() => applyFilters(assignedToMe), [assignedToMe, searchQuery, statusFilter, dateFilter]);
  const filteredDeptLibrary = useMemo(() => applyFilters(deptLibrary), [deptLibrary, searchQuery, statusFilter, dateFilter]);

  const getAssetFacts = (assetId: string) => facts.filter(f => f.asset_id === assetId);

  // Open detail dialog
  const openDetail = (asset: DbPromptAsset, editable: boolean) => {
    setSelectedAsset(asset);
    setEditContent(asset.content);
    setEditTitle(asset.title);
    setEditStatus(asset.status);
    setEditCommitMessage('');
    setIsEditing(editable);
  };

  // Save edits
  const handleSaveEdit = async () => {
    if (!selectedAsset || !user) return;
    if (!editCommitMessage.trim()) {
      toast.error('Please add a commit message');
      return;
    }
    setIsSaving(true);
    const updated = await updateAssetWithVersioning(
      selectedAsset.id,
      { content: editContent, title: editTitle, status: editStatus },
      user.id,
      editCommitMessage.trim(),
      editStatus === 'approved' ? 'approve_release' : 'update',
    );
    if (updated) {
      toast.success('Prompt updated successfully');
      setSelectedAsset(null);
      // Refresh
      const a = await getAssets();
      setAssets(a);
    } else {
      toast.error('Failed to update prompt');
    }
    setIsSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const renderRow = (asset: DbPromptAsset, editable: boolean) => {
    const isExpanded = expandedId === asset.id;
    const meta = (asset as any).metadata;
    const assetFacts = getAssetFacts(asset.id);

    return (
      <Collapsible key={asset.id} open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : asset.id)}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors">
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            <StatusDot status={asset.status} />
            <span className="text-sm flex-1 min-w-0">
              {editable && <span className="text-muted-foreground font-medium">EDITABLE: </span>}
              {asset.title}
              <span className="text-muted-foreground ml-1">
                (ID:{asset.id.slice(0, 3).toUpperCase()})
              </span>
              {!editable && (
                <span className="text-muted-foreground ml-1">
                  ({STATUS_LABELS[asset.status] || asset.status})
                </span>
              )}
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 py-3 bg-muted/10 border-b border-border/50 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <Badge variant="outline" className="capitalize text-[10px]">{STATUS_LABELS[asset.status] || asset.status}</Badge>
              <span>v{asset.version}</span>
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
            <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => openDetail(asset, editable)}>
              {editable ? <Edit3 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {editable ? 'Open & Edit' : 'View Details'}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-9 text-sm">
            <Filter className="h-3 w-3 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="released">Released</SelectItem>
          </SelectContent>
        </Select>
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
      </div>

      {/* Section 1: Assignments to Me */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <ClipboardList className="h-5 w-5" />
          Assignments to Me (Editable)
        </h2>
        <Card className="shadow-none overflow-hidden">
          {filteredAssignments.length === 0 ? (
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No prompts assigned to you.</p>
            </CardContent>
          ) : (
            filteredAssignments.map(a => renderRow(a, true))
          )}
        </Card>
      </div>

      {/* Divider */}
      <hr className="border-border" />

      {/* Section 2: Department Library */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <Building2 className="h-5 w-5" />
          {profile?.department || 'Department'} Dept Library (View Only)
        </h2>
        <Card className="shadow-none overflow-hidden">
          {filteredDeptLibrary.length === 0 ? (
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No prompts in your department library.</p>
            </CardContent>
          ) : (
            filteredDeptLibrary.map(a => renderRow(a, false))
          )}
        </Card>
      </div>

      {/* Detail / Edit Dialog */}
      <Dialog open={!!selectedAsset} onOpenChange={(open) => { if (!open) setSelectedAsset(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedAsset && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  {isEditing ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {isEditing ? 'Edit Prompt' : 'View Prompt'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Title</Label>
                  {isEditing ? (
                    <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="bg-card text-sm" />
                  ) : (
                    <p className="text-sm font-medium">{selectedAsset.title}</p>
                  )}
                </div>

                {/* Meta row */}
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

                {/* Content */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Prompt Content</Label>
                  {isEditing ? (
                    <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="bg-card text-sm font-mono min-h-[200px]" />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/30 p-3 rounded-lg text-foreground">{selectedAsset.content}</pre>
                  )}
                </div>

                {/* Status selector for editing */}
                {isEditing && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Update Status</Label>
                    <Select value={editStatus} onValueChange={v => setEditStatus(v as AssetStatusEnum)}>
                      <SelectTrigger className="w-[200px] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="released">Released</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Benefits */}
                {(() => {
                  const assetFacts = getAssetFacts(selectedAsset.id);
                  if (assetFacts.length === 0) return null;
                  return (
                    <Card className="shadow-none">
                      <CardHeader className="pb-2 px-4 pt-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          Benefits
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        <div className="space-y-2">
                          {assetFacts.map(f => (
                            <div key={f.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                              <span className="text-muted-foreground">{f.category}</span>
                              <span className="font-mono font-medium">{Number(f.value).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Prompt Analysis Metadata */}
                {(() => {
                  const meta = (selectedAsset as any).metadata;
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

                {/* Edit commit message + save */}
                {isEditing && (
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
                )}
              </div>

              {isEditing && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedAsset(null)}>Cancel</Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={isSaving || !editCommitMessage.trim()}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
