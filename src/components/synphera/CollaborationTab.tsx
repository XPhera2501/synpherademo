import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { PromptAsset, REVIEWERS } from '@/lib/synphera-types';
import { getAssets, saveAsset, createAsset, getCurrentUser, addLineageEntry } from '@/lib/synphera-store';
import { SecurityBadge } from './SecurityBadge';
import { ChevronDown, Check, GitFork, Clock, FileText, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CollaborationTabProps {
  refreshKey: number;
  onAssetUpdated: () => void;
}

export function CollaborationTab({ refreshKey, onAssetUpdated }: CollaborationTabProps) {
  const [assets, setAssets] = useState<PromptAsset[]>([]);
  const [editingAsset, setEditingAsset] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const currentUserId = getCurrentUser();
  
  useEffect(() => {
    setAssets(getAssets());
  }, [refreshKey]);
  
  const pendingReviews = assets.filter(a => a.assignedTo === currentUserId && a.status === 'pending_review');
  const releasedAssets = assets.filter(a => a.status === 'released');
  
  const currentUser = REVIEWERS.find(r => r.id === currentUserId);
  
  const handleStartEdit = (asset: PromptAsset) => {
    setEditingAsset(asset.id);
    setEditContent(asset.content);
  };
  
  const handleApproveRelease = (asset: PromptAsset) => {
    const updatedAsset: PromptAsset = {
      ...asset,
      content: editContent || asset.content,
      status: 'released',
      assignedTo: null,
      securityStatus: 'GREEN',
      updatedAt: new Date(),
    };
    
    saveAsset(updatedAsset);
    addLineageEntry({
      assetId: asset.id,
      parentId: asset.parentId,
      action: 'released',
      userId: currentUserId,
    });
    
    setEditingAsset(null);
    setEditContent('');
    toast.success(`"${asset.title}" approved and released to library!`);
    onAssetUpdated();
  };
  
  const handleFork = (asset: PromptAsset) => {
    const forkedAsset = createAsset({
      title: `${asset.title} (Fork)`,
      content: asset.content,
      version: parseFloat((asset.version + 0.1).toFixed(1)),
      status: 'draft',
      parentId: asset.id,
      assignedTo: null,
      createdBy: currentUserId,
      department: asset.department,
      securityStatus: 'PENDING',
    });
    
    toast.success(`Forked "${asset.title}" - new draft created!`);
    onAssetUpdated();
  };
  
  return (
    <div className="space-y-8">
      {/* Pending Reviews Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">My Pending Reviews</h2>
            {pendingReviews.length > 0 && (
              <Badge variant="secondary" className="bg-primary/20 text-primary">
                {pendingReviews.length}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Logged in as {currentUser?.avatar} {currentUser?.name}
          </p>
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
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="text-left">
                          <CardTitle className="text-base">{asset.title}</CardTitle>
                          <CardDescription className="text-xs">
                            v{asset.version} • {asset.department} • {format(asset.createdAt, 'MMM d, yyyy')}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <SecurityBadge status={asset.securityStatus} size="sm" />
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
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
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApproveRelease(asset)}
                          className="gap-2"
                        >
                          <Check className="h-4 w-4" />
                          Approve & Release
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
      
      {/* Released Library Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Check className="h-5 w-5 text-status-green" />
          <h2 className="text-lg font-semibold">Released Library</h2>
          <Badge variant="secondary">
            {releasedAssets.length} assets
          </Badge>
        </div>
        
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {releasedAssets.map((asset) => (
            <Card key={asset.id} className="group hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm line-clamp-1">{asset.title}</CardTitle>
                    <CardDescription className="text-xs">
                      v{asset.version} • {asset.department}
                    </CardDescription>
                  </div>
                  <SecurityBadge status="GREEN" size="sm" showLabel={false} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {asset.content}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFork(asset)}
                  className="w-full gap-2 opacity-70 group-hover:opacity-100 transition-opacity"
                >
                  <GitFork className="h-3 w-3" />
                  Branch / Fork
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}