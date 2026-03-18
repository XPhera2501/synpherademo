import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SecurityBadge } from './SecurityBadge';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { CommentThread } from './CommentThread';
import { useAuth } from '@/hooks/useAuth';
import {
  getAssets, getProfiles, getROIFacts, updateAssetWithVersioning,
  type DbPromptAsset, type DbProfile, type DbROIFact
} from '@/lib/supabase-store';
import { DEPARTMENTS } from '@/lib/synphera-types';
import type { SecurityStatus } from '@/lib/synphera-types';
import { Search, Filter, Clock, Lock, Tag, Library, Copy, Play, Eye, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { ROIEntry } from './ROIBuilder';
import type { CreationSeed } from '@/pages/Index';

interface CatalogueTabProps {
  refreshKey: number;
  onLoadIntoCreation: (seed: CreationSeed) => void;
}

export function CatalogueTab({ refreshKey, onLoadIntoCreation }: CatalogueTabProps) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<DbPromptAsset[]>([]);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [facts, setFacts] = useState<DbROIFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<DbPromptAsset | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCommitMessage, setEditCommitMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [data, profs, roiFacts] = await Promise.all([getAssets(), getProfiles(), getROIFacts()]);
    setAssets(data);
    setProfiles(profs);
    setFacts(roiFacts);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [refreshKey]);

  const profileMap = useMemo(() => new Map(profiles.map(p => [p.id, p.display_name || 'Unknown'])), [profiles]);
  const factsByAsset = useMemo(() => {
    const map = new Map<string, ROIEntry[]>();
    facts.forEach((fact) => {
      const current = map.get(fact.asset_id) || [];
      current.push({ category: fact.category as ROIEntry['category'], value: Number(fact.value), description: fact.description || '' });
      map.set(fact.asset_id, current);
    });
    return map;
  }, [facts]);

  const categories = useMemo(() => [...new Set(assets.map(a => a.category).filter(Boolean))], [assets]);
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    assets.forEach(a => a.tags?.forEach(t => tagSet.add(t)));
    return [...tagSet].sort();
  }, [assets]);

  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const isVisibleInCatalogue = a.status === 'approved' || (a.status === 'draft' && a.created_by === user?.id);
      if (!isVisibleInCatalogue) return false;
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
  }, [assets, filterDept, filterStatus, filterCategory, searchQuery, user?.id]);

  const openAssetDialog = (asset: DbPromptAsset) => {
    setSelectedAsset(asset);
    setEditTitle(asset.title);
    setEditContent(asset.content);
    setEditCommitMessage('');
  };

  const closeAssetDialog = () => {
    setSelectedAsset(null);
    setEditCommitMessage('');
  };

  const isOwner = (asset: DbPromptAsset) => asset.created_by === user?.id;

  const getPromptSubject = (content: string) => {
    const subject = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);

    if (!subject) return 'No prompt subject';
    return subject.length > 80 ? `${subject.slice(0, 80)}...` : subject;
  };

  const sendToCreate = (asset: DbPromptAsset, mode: 'copy' | 'execute') => {
    if (mode === 'execute' && asset.status !== 'approved') {
      toast.error('Only approved prompts can be executed');
      return;
    }

    onLoadIntoCreation({
      sourceAssetId: asset.id,
      title: mode === 'copy' ? `Copy of ${asset.title}` : asset.title,
      content: asset.content,
      department: asset.department,
      roiEntries: factsByAsset.get(asset.id) || [],
    });
    toast.success(mode === 'copy' ? 'Prompt copied to Create' : 'Approved prompt sent back to LLM via Create');
  };

  const handleSaveEdit = async () => {
    if (!selectedAsset || !user || !isOwner(selectedAsset)) return;
    if (!editCommitMessage.trim()) {
      toast.error('Commit message is required');
      return;
    }

    setIsUpdating(true);
    const updated = await updateAssetWithVersioning(
      selectedAsset.id,
      { title: editTitle.trim(), content: editContent.trim() },
      user.id,
      editCommitMessage.trim(),
      'catalogue_edit',
    );

    if (updated) {
      toast.success('Prompt updated in catalogue');
      closeAssetDialog();
      loadData();
    } else {
      toast.error('Failed to update prompt');
    }

    setIsUpdating(false);
  };


  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Library className="h-5 w-5" />
        <h2 className="text-lg font-semibold">All Assets</h2>
        <Badge variant="secondary">{assets.length} total</Badge>
      </div>

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
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
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
                    <span className="text-xs text-muted-foreground truncate">{getPromptSubject(asset.content)}</span>
                    <Badge variant={asset.status === 'approved' ? 'default' : 'outline'} className="text-[10px] capitalize">{asset.status.replace('_', ' ')}</Badge>
                    <span>•</span>
                    <span>{profileMap.get(asset.created_by) || 'Unknown'}</span>
                    <span>•</span>
                    <span>{format(new Date(asset.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0 items-end">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                    onClick={() => setExpandedHistory(expandedHistory === asset.id ? null : asset.id)}>
                    <Clock className="h-3 w-3" />History
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => sendToCreate(asset, 'execute')}
                    disabled={asset.status !== 'approved'}
                  >
                    <Play className="h-3 w-3" />
                    Execute in LLM
                  </Button>
                </div>
              </div>
              {expandedHistory === asset.id && (
                <div className="mt-3 pt-3 border-t border-border animate-fade-in-up space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => openAssetDialog(asset)}>
                      {isOwner(asset) ? <Pencil className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {isOwner(asset) ? 'Edit' : 'View'}
                    </Button>
                    {(asset.status === 'draft' || asset.status === 'approved') && (
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => sendToCreate(asset, 'copy')}>
                        <Copy className="h-3 w-3" />
                        Copy to Create
                      </Button>
                    )}
                  </div>
                  <VersionHistoryPanel
                    assetId={asset.id}
                    currentVersion={asset.version}
                    isLocked={asset.is_locked}
                    onRollback={() => loadData()}
                    onToggleLock={() => loadData()}
                  />
                  <CommentThread promptId={asset.id} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <Dialog open={!!selectedAsset} onOpenChange={(open) => { if (!open) closeAssetDialog(); }}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            {selectedAsset && (
              <>
                <DialogHeader>
                  <DialogTitle>{isOwner(selectedAsset) ? 'Edit Prompt' : 'View Prompt'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Prompt Subject</Label>
                    <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} readOnly={!isOwner(selectedAsset)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Status</Label>
                    <Badge variant={selectedAsset.status === 'approved' ? 'default' : 'outline'} className="capitalize w-fit">{selectedAsset.status.replace('_', ' ')}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Prompt Content</Label>
                    <Textarea value={editContent} onChange={(event) => setEditContent(event.target.value)} className="min-h-[220px] font-mono text-sm" readOnly={!isOwner(selectedAsset)} />
                  </div>
                  {isOwner(selectedAsset) && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Commit Message</Label>
                      <Input value={editCommitMessage} onChange={(event) => setEditCommitMessage(event.target.value)} placeholder="Describe your catalogue changes..." />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={closeAssetDialog}>Close</Button>
                  {isOwner(selectedAsset) && (
                    <Button onClick={handleSaveEdit} disabled={isUpdating || !editTitle.trim() || !editContent.trim() || !editCommitMessage.trim()}>
                      {isUpdating ? 'Saving...' : 'Save Changes'}
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
      {filteredAssets.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No assets match your filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
