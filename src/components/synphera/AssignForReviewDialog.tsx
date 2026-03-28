import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Send, User } from 'lucide-react';
import { getProfiles, type DbProfile } from '@/lib/supabase-store';
import { useAuth } from '@/hooks/useAuth';

interface AssignForReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (colleagueId: string, requestType: 'review' | 'validate') => void;
}

export function AssignForReviewDialog({ open, onOpenChange, onSend }: AssignForReviewDialogProps) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [search, setSearch] = useState('');
  const [selectedColleague, setSelectedColleague] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<'review' | 'validate'>('review');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      getProfiles().then(p => setProfiles(p));
      setSearch('');
      setSelectedColleague(null);
      setRequestType('review');
    }
  }, [open]);

  const filteredProfiles = useMemo(() => {
    return profiles
      .filter(p => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          p.display_name?.toLowerCase().includes(q) ||
          p.department?.toLowerCase().includes(q)
        );
      });
  }, [profiles, search]);

  const handleSend = () => {
    if (!selectedColleague) return;
    setLoading(true);
    onSend(selectedColleague, requestType);
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign for Review</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search colleagues */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search colleagues..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Colleague list */}
          <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border p-1">
            {filteredProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No colleagues found</p>
            ) : (
              filteredProfiles.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedColleague(p.id)}
                  className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    selectedColleague === p.id
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px] bg-muted">
                      {(p.display_name || '?')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {p.id === user?.id ? `${p.display_name || 'Unknown'} (Me)` : p.display_name || 'Unknown'}
                    </p>
                    {p.department && (
                      <p className="text-xs text-muted-foreground">{p.department}</p>
                    )}
                  </div>
                  {selectedColleague === p.id && (
                    <Badge variant="default" className="text-[10px] h-5">Selected</Badge>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Request type */}
          <div className="space-y-2">
            <Label className="text-sm">Request Type</Label>
            <RadioGroup value={requestType} onValueChange={(v) => setRequestType(v as 'review' | 'validate')}>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="review" id="review" />
                  <Label htmlFor="review" className="text-sm cursor-pointer">Review</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="validate" id="validate" />
                  <Label htmlFor="validate" className="text-sm cursor-pointer">Validate</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={!selectedColleague || loading}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
