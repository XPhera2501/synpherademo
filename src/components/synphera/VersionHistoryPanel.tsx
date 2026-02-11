import { useState } from 'react';
import { VersionSnapshot, REVIEWERS } from '@/lib/synphera-types';
import { getVersionSnapshots, rollbackAsset, toggleLock } from '@/lib/synphera-store';
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
  const [versions] = useState(() => getVersionSnapshots(assetId).sort((a, b) => b.version - a.version));
  const [selectedPair, setSelectedPair] = useState<[number, number] | null>(null);

  const diffResult = selectedPair ? (() => {
    const older = versions.find(v => v.version === selectedPair[0]);
    const newer = versions.find(v => v.version === selectedPair[1]);
    if (!older || !newer) return null;
    return computeDiff(older.content, newer.content);
  })() : null;

  const handleRollback = (version: number) => {
    if (isLocked) {
      toast.error('Asset is locked. Unlock before rolling back.');
      return;
    }
    const result = rollbackAsset(assetId, version);
    if (result) {
      toast.success(`Rolled back to v${version}`);
      onRollback();
    }
  };

  const handleLockToggle = () => {
    toggleLock(assetId);
    onToggleLock();
    toast.success(isLocked ? 'Asset unlocked' : 'Asset locked for production');
  };

  if (versions.length === 0) return null;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <History className="h-4 w-4 text-primary" />
            Version History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              v{currentVersion}
            </Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isLocked ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleLockToggle}
                  className="h-7 gap-1 text-xs"
                >
                  {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  {isLocked ? 'Locked' : 'Lock'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isLocked ? 'Unlock to allow edits' : 'Lock for production use'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Timeline */}
        <ScrollArea className="max-h-48">
          <div className="space-y-0">
            {versions.map((v, idx) => {
              const user = REVIEWERS.find(r => r.id === v.userId);
              const canCompare = idx < versions.length - 1;
              return (
                <div key={v.id} className="flex items-start gap-3 pb-3 relative">
                  {/* Timeline line */}
                  {idx < versions.length - 1 && (
                    <div className="absolute left-[11px] top-6 w-px h-full bg-border" />
                  )}
                  <div className="flex-shrink-0 mt-0.5">
                    <GitCommit className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-primary">v{v.version}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {v.commitMessage}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {user?.avatar} {user?.name || 'Unknown'} • {format(v.timestamp, 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      {v.version !== currentVersion && !isLocked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs gap-1 px-2"
                          onClick={() => handleRollback(v.version)}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Rollback
                        </Button>
                      )}
                      {canCompare && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs gap-1 px-2"
                          onClick={() => setSelectedPair(
                            selectedPair?.[0] === versions[idx + 1].version
                              ? null
                              : [versions[idx + 1].version, v.version]
                          )}
                        >
                          <ArrowRight className="h-3 w-3" />
                          Diff
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Diff Viewer */}
        {diffResult && selectedPair && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">v{selectedPair[0]}</span>
              <ArrowRight className="h-3 w-3" />
              <span className="font-mono">v{selectedPair[1]}</span>
              <Button variant="ghost" size="sm" className="h-5 text-xs ml-auto" onClick={() => setSelectedPair(null)}>
                Close
              </Button>
            </div>
            <ScrollArea className="max-h-48">
              <div className="log-box !max-h-none space-y-0.5">
                {diffResult.map((line, i) => (
                  <div
                    key={i}
                    className={`text-xs font-mono px-2 py-0.5 rounded-sm ${
                      line.type === 'add'
                        ? 'bg-status-green/10 text-green-400'
                        : line.type === 'remove'
                        ? 'bg-status-red/10 text-red-400 line-through'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <span className="mr-2 opacity-50">
                      {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                    </span>
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
