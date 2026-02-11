import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { SecurityBadge } from './SecurityBadge';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { CommentThread } from './CommentThread';
import { useAuth } from '@/hooks/useAuth';
import { 
  getAssets, updateAsset, createAsset, addLineageEntry, addVersionSnapshot, addAuditLog,
  type DbPromptAsset, type AssetStatusEnum, type DepartmentEnum
} from '@/lib/supabase-store';
import type { SecurityStatus } from '@/lib/synphera-types';
import { ChevronDown, Check, GitFork, Clock, FileText, Lock, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CollaborationTabProps {
  refreshKey: number;
  onAssetUpdated: () => void;
}

export function CollaborationTab({ refreshKey, onAssetUpdated }: CollaborationTabProps) {
  const { user, isReviewer, canEdit } = useAuth();
  const [assets, setAssets] = useState<DbPromptAsset[]>([]);
  const [editingAsset, setEditingAsset] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [commitMsg, setCommitMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const loadAssets = async () => {
    setLoading(true);
    const data = await getAssets();
    setAssets(data);
    setLoading(false);
  };

  useEffect(() => { loadAssets(); }, [refreshKey]);
  
  const pendingReviews = assets.filter(a => 
    a.assigned_to === user?.id && (a.status === 'draft' || a.status === 'in_review')
  );
  const releasedAssets = assets.filter(a => a.status === 'released');
  const filteredReleased = searchQuery
    ? releasedAssets.filter(a => 
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : releasedAssets;
  
  const handleStartEdit = (asset: DbPromptAsset) => {
    setEditingAsset(asset.id);
    setEditContent(asset.content);
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
      loadAssets();
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
      security_status: 'PENDING',
      commit_message: `Forked from "${asset.title}" v${asset.version}`,
      is_locked: false,
      tags: [],
    });
    
    if (forked) {
      toast.success(`Forked "${asset.title}" — new draft created!`);
      onAssetUpdated();
      loadAssets();
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }
  
  return (
    <div className="space-y-8">
      {/* Pending Reviews */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">My Pending Reviews</h2>
            {pendingReviews.length > 0 && (
              <Badge variant="secondary" className="bg-primary/20 text-primary">
                {pendingReviews.length}
              </Badge>
            )}
          </div>
        </div>
        
        {pendingReviews.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Check className="mx-auto h-8 w-8 text-status-green mb-2" />
              <p className="text-muted-foreground">No pending reviews. You're all caught up! 🎉</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingReviews.map((asset) => (
              <Collapsible key={asset.id}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="text-left min-w-0">
                          <CardTitle className="text-base truncate">{asset.title}</CardTitle>
                          <CardDescription className="text-xs">
                            v{asset.version} • {asset.department} • {format(new Date(asset.created_at), 'MMM d, yyyy')}
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
                            if (editingAsset !== asset.id) handleStartEdit(asset);
                            setEditContent(e.target.value);
                          }}
                          onFocus={() => handleStartEdit(asset)}
                          className="min-h-[120px] font-mono text-sm"
                          readOnly={!isReviewer}
                        />
                      </div>
                      
                      {/* Comments */}
                      <CommentThread promptId={asset.id} />
                      
                      {isReviewer && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-xs">Commit message for approval</Label>
                            <Input
                              placeholder="e.g., Reviewed and approved with minor edits"
                              value={commitMsg}
                              onChange={(e) => setCommitMsg(e.target.value)}
                              className="text-sm bg-card"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => handleApproveRelease(asset)} className="gap-2" disabled={!commitMsg.trim()}>
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
                        onRollback={() => { onAssetUpdated(); loadAssets(); }}
                        onToggleLock={() => { onAssetUpdated(); loadAssets(); }}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
      
      {/* Released Library */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-status-green" />
            <h2 className="text-lg font-semibold">Released Library</h2>
            <Badge variant="secondary">{releasedAssets.length} assets</Badge>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-card text-sm"
            />
          </div>
        </div>
        
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredReleased.map((asset) => (
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
                    </CardDescription>
                  </div>
                  <SecurityBadge status="GREEN" size="sm" showLabel={false} />
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <p className="text-xs text-muted-foreground line-clamp-2">{asset.content}</p>
                {asset.commit_message && (
                  <p className="text-[10px] text-muted-foreground/60 italic truncate">
                    💬 {asset.commit_message}
                  </p>
                )}
                <div className="flex gap-2">
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFork(asset)}
                      className="flex-1 gap-2 opacity-70 group-hover:opacity-100 transition-opacity"
                    >
                      <GitFork className="h-3 w-3" />
                      Fork
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedHistory(expandedHistory === asset.id ? null : asset.id)}
                    className="gap-1 text-xs opacity-70 group-hover:opacity-100"
                  >
                    <Clock className="h-3 w-3" />
                    History
                  </Button>
                </div>
                
                {expandedHistory === asset.id && (
                  <div className="animate-fade-in-up space-y-3">
                    <VersionHistoryPanel
                      assetId={asset.id}
                      currentVersion={asset.version}
                      isLocked={asset.is_locked}
                      onRollback={() => { onAssetUpdated(); loadAssets(); }}
                      onToggleLock={() => { onAssetUpdated(); loadAssets(); }}
                    />
                    <CommentThread promptId={asset.id} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        {filteredReleased.length === 0 && searchQuery && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No assets match "{searchQuery}"
          </p>
        )}
        {releasedAssets.length === 0 && !searchQuery && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No released assets yet. Create and approve assets to build your library.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
