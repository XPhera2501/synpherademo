import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getVersionSnapshots, rollbackAsset, toggleLock, type DbVersionSnapshot } from '@/lib/supabase-store';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { History, RotateCcw, Lock, Unlock, GitCommit, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface VersionHistoryPanelProps {
  assetId: string;
  currentVersion: number;
  isLocked: boolean;
  onRollback: () => void;
  onToggleLock: () => void;
}

function computeDiff(oldText: string, newText: string): { type: 'add' | 'remove' | 'same'; text: string }[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: { type: 'add' | 'remove' | 'same'; text: string }[] = [];
  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    if (oldLine === newLine) {
      result.push({ type: 'same', text: oldLine || '' });
    } else {
      if (oldLine !== undefined) result.push({ type: 'remove', text: oldLine });
      if (newLine !== undefined) result.push({ type: 'add', text: newLine });
    }
  }
  return result;
}

export function VersionHistoryPanel({ assetId, currentVersion, isLocked, onRollback, onToggleLock }: VersionHistoryPanelProps) {
  const { user, canEdit } = useAuth();
  const [versions, setVersions] = useState<DbVersionSnapshot[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [selectedPair, setSelectedPair] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await getVersionSnapshots(assetId);
      const sorted = data.sort((a, b) => b.version - a.version);
      setVersions(sorted);
      
      const userIds = [...new Set(data.map(v => v.user_id))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
        const map = new Map(profs?.map(p => [p.id, p.display_name || 'Unknown']) || []);
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, [assetId]);

  const diffResult = selectedPair ? (() => {
    const older = versions.find(v => v.version === selectedPair[0]);
    const newer = versions.find(v => v.version === selectedPair[1]);
    if (!older || !newer) return null;
    return computeDiff(older.content, newer.content);
  })() : null;

  const handleRollback = async (version: number) => {
    if (isLocked) { toast.error('Asset is locked.'); return; }
    if (!user) return;
    const result = await rollbackAsset(assetId, version, user.id);
    if (result) { toast.success(`Rolled back to v${version}`); onRollback(); }
  };

  const handleLockToggle = async () => {
    const newState = await toggleLock(assetId);
    onToggleLock();
    toast.success(newState ? 'Asset locked' : 'Asset unlocked');
  };

  if (loading || versions.length === 0) return null;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <History className="h-4 w-4 text-primary" />
            Version History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">v{currentVersion}</Badge>
            {canEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={isLocked ? 'default' : 'outline'} size="sm" onClick={handleLockToggle} className="h-7 gap-1 text-xs">
                    {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    {isLocked ? 'Locked' : 'Lock'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isLocked ? 'Unlock to allow edits' : 'Lock for production'}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="max-h-48">
          <div className="space-y-0">
            {versions.map((v, idx) => (
              <div key={v.id} className="flex items-start gap-3 pb-3 relative">
                {idx < versions.length - 1 && <div className="absolute left-[11px] top-6 w-px h-full bg-border" />}
                <div className="flex-shrink-0 mt-0.5"><GitCommit className="h-5 w-5 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-primary">v{v.version}</span>
                    <span className="text-xs text-muted-foreground truncate">{v.commit_message}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {profiles.get(v.user_id) || 'Unknown'} • {format(new Date(v.created_at), 'MMM d, HH:mm')}
                    </span>
                  </div>
                  <div className="flex gap-1 mt-1">
                    {v.version !== currentVersion && !isLocked && canEdit && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2" onClick={() => handleRollback(v.version)}>
                        <RotateCcw className="h-3 w-3" /> Rollback
                      </Button>
                    )}
                    {idx < versions.length - 1 && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2"
                        onClick={() => setSelectedPair(selectedPair?.[0] === versions[idx + 1].version ? null : [versions[idx + 1].version, v.version])}>
                        <ArrowRight className="h-3 w-3" /> Diff
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {diffResult && selectedPair && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">v{selectedPair[0]}</span>
              <ArrowRight className="h-3 w-3" />
              <span className="font-mono">v{selectedPair[1]}</span>
              <Button variant="ghost" size="sm" className="h-5 text-xs ml-auto" onClick={() => setSelectedPair(null)}>Close</Button>
            </div>
            <ScrollArea className="max-h-48">
              <div className="log-box !max-h-none space-y-0.5">
                {diffResult.map((line, i) => (
                  <div key={i} className={`text-xs font-mono px-2 py-0.5 rounded-sm ${
                    line.type === 'add' ? 'bg-status-green/10 text-green-600' :
                    line.type === 'remove' ? 'bg-status-red/10 text-red-600 line-through' : 'text-muted-foreground'
                  }`}>
                    <span className="mr-2 opacity-50">{line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}</span>
                    {line.text || '\u00A0'}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
