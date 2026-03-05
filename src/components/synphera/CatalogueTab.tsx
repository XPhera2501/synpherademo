import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SecurityBadge } from './SecurityBadge';
import { useAuth } from '@/hooks/useAuth';
import { getAssets, getROIFacts, getProfiles, type DbPromptAsset, type DbROIFact, type DbProfile } from '@/lib/supabase-store';
import type { SecurityStatus } from '@/lib/synphera-types';
import { Search, FileText, Eye, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface CatalogueTabProps {
  refreshKey: number;
}

export function CatalogueTab({ refreshKey }: CatalogueTabProps) {
  const { profile } = useAuth();
  const [assets, setAssets] = useState<DbPromptAsset[]>([]);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [facts, setFacts] = useState<DbROIFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<DbPromptAsset | null>(null);

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

  // Filter to only show prompts from the user's department
  const deptAssets = useMemo(() => {
    const dept = profile?.department;
    if (!dept) return [];
    return assets.filter(a => a.department === dept);
  }, [assets, profile?.department]);

  const filteredAssets = useMemo(() => {
    if (!searchQuery) return deptAssets;
    const q = searchQuery.toLowerCase();
    return deptAssets.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.content.toLowerCase().includes(q)
    );
  }, [deptAssets, searchQuery]);

  const getAssetFacts = (assetId: string) => facts.filter(f => f.asset_id === assetId);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Department Catalogue</h2>
          <p className="text-sm text-muted-foreground">
            Prompts created by your department: <Badge variant="outline">{profile?.department || '—'}</Badge>
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-card text-sm"
          />
        </div>
      </div>

      {filteredAssets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No prompts found in your department.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredAssets.map(asset => {
            const assetFacts = getAssetFacts(asset.id);
            return (
              <Card
                key={asset.id}
                className="hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => setSelectedAsset(asset)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{asset.title}</span>
                        <SecurityBadge status={asset.security_status as SecurityStatus} size="sm" showLabel={false} />
                        <Badge variant="outline" className="text-[10px] capitalize">{asset.status.replace('_', ' ')}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>v{asset.version}</span>
                        <span>•</span>
                        <span>{profileMap.get(asset.created_by) || 'Unknown'}</span>
                        <span>•</span>
                        <span>{format(new Date(asset.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{asset.content}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {assetFacts.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <TrendingUp className="h-2.5 w-2.5" />
                          {assetFacts.length} benefit{assetFacts.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                        <Eye className="h-3 w-3" />View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedAsset && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedAsset.title}
                  <SecurityBadge status={selectedAsset.security_status as SecurityStatus} size="sm" />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <Badge variant="outline" className="capitalize">{selectedAsset.status.replace('_', ' ')}</Badge>
                  <span>v{selectedAsset.version}</span>
                  <span>•</span>
                  <span>By {profileMap.get(selectedAsset.created_by) || 'Unknown'}</span>
                  <span>•</span>
                  <span>{format(new Date(selectedAsset.created_at), 'PPP')}</span>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Prompt Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/30 p-3 rounded-lg text-foreground">
                      {selectedAsset.content}
                    </pre>
                  </CardContent>
                </Card>

                {(() => {
                  const assetFacts = getAssetFacts(selectedAsset.id);
                  if (assetFacts.length === 0) return null;
                  return (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          Benefits
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {assetFacts.map(f => (
                            <div key={f.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                              <span className="text-muted-foreground">{f.category}</span>
                              <span className="font-mono font-medium">{f.value}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {selectedAsset.commit_message && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Message:</span> {selectedAsset.commit_message}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
