import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Send } from 'lucide-react';
import { getProfiles, type DbProfile } from '@/lib/supabase-store';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AssignForReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (reviewerId: string) => void;
}

export function AssignForReviewDialog({ open, onOpenChange, onSend }: AssignForReviewDialogProps) {
  const { user, profile } = useAuth();
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [rolesByUserId, setRolesByUserId] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState('');
  const [selectedColleague, setSelectedColleague] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      Promise.all([
        getProfiles(),
        supabase.from('user_roles').select('user_id, role'),
      ]).then(([nextProfiles, { data: roleRows }]) => {
        setProfiles(nextProfiles);

        const nextRolesByUserId: Record<string, string[]> = {};
        (roleRows || []).forEach((row) => {
          const currentRoles = nextRolesByUserId[row.user_id] || [];
          currentRoles.push(row.role);
          nextRolesByUserId[row.user_id] = currentRoles;
        });
        setRolesByUserId(nextRolesByUserId);
      });
      setSearch('');
      setSelectedColleague(null);
    }
  }, [open]);

  const filteredProfiles = useMemo(() => {
    return profiles
      .filter(p => {
        if (p.id === user?.id) return false;
        if (profile?.department && p.department !== profile.department) return false;

        const candidateRoles = rolesByUserId[p.id] || [];
        const canReview = candidateRoles.includes('reviewer') || candidateRoles.includes('admin') || candidateRoles.includes('super_admin');
        if (!canReview) return false;

        if (!search) return true;
        const q = search.toLowerCase();
        return (
          p.display_name?.toLowerCase().includes(q) ||
          p.department?.toLowerCase().includes(q)
        );
      });
  }, [profiles, search, user?.id, profile?.department, rolesByUserId]);

  const handleSend = () => {
    if (!selectedColleague) return;
    setLoading(true);
    onSend(selectedColleague);
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Reviewer</DialogTitle>
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
                    <p className="text-[10px] text-muted-foreground">
                      {(rolesByUserId[p.id] || []).join(', ') || 'No role'}
                    </p>
                  </div>
                  {selectedColleague === p.id && (
                    <Badge variant="default" className="text-[10px] h-5">Selected</Badge>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            Reviewers are limited to users in your department with Reviewer or Admin access.
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
