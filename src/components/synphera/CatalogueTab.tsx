import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SecurityBadge } from './SecurityBadge';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { CommentThread } from './CommentThread';
import { useAuth } from '@/hooks/useAuth';
import {
  getAssets, getProfiles, createAsset,
  type DbPromptAsset, type AssetStatusEnum, type DepartmentEnum, type DbProfile
} from '@/lib/supabase-store';
import { DEPARTMENTS } from '@/lib/synphera-types';
import type { SecurityStatus } from '@/lib/synphera-types';
import { Search, Filter, GitFork, Clock, Lock, Tag, Send, Library } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CatalogueTabProps {
  refreshKey: number;
}

export function CatalogueTab({ refreshKey }: CatalogueTabProps) {
  const { user, canEdit } = useAuth();
  const [assets, setAssets] = useState<DbPromptAsset[]>([]);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [data, profs] = await Promise.all([getAssets(), getProfiles()]);
    setAssets(data);
    setProfiles(profs);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [refreshKey]);

  const profileMap = useMemo(() => new Map(profiles.map(p => [p.id, p.display_name || 'Unknown'])), [profiles]);

  const categories = useMemo(() => [...new Set(assets.map(a => a.category).filter(Boolean))], [assets]);
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    assets.forEach(a => a.tags?.forEach(t => tagSet.add(t)));
    return [...tagSet].sort();
  }, [assets]);

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
      loadData();
    }
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
                    onRollback={() => loadData()}
                    onToggleLock={() => loadData()}
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
    </div>
  );
}
