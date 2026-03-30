import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send } from 'lucide-react';
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
      setSelectedColleague(null);
    }
  }, [open]);

  const reviewerOptions = useMemo(() => {
    return profiles
      .filter(p => {
        if (p.id === user?.id) return false;
        if (profile?.department && p.department !== profile.department) return false;

        const candidateRoles = rolesByUserId[p.id] || [];
        const canReview = candidateRoles.includes('reviewer') || candidateRoles.includes('admin') || candidateRoles.includes('super_admin');
        return canReview;
      });
  }, [profiles, user?.id, profile?.department, rolesByUserId]);

  const selectedReviewer = useMemo(
    () => reviewerOptions.find((candidate) => candidate.id === selectedColleague) ?? null,
    [reviewerOptions, selectedColleague],
  );

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
          <div className="space-y-2">
            <Label htmlFor="reviewer-select">Reviewer</Label>
            <Select
              value={selectedColleague ?? undefined}
              onValueChange={setSelectedColleague}
              disabled={reviewerOptions.length === 0}
            >
              <SelectTrigger id="reviewer-select">
                <SelectValue placeholder="Select a reviewer" />
              </SelectTrigger>
              <SelectContent>
                {reviewerOptions.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.display_name || 'Unknown'}
                    {candidate.department ? ` - ${candidate.department}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-border p-3">
            {selectedReviewer ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-muted text-xs">
                    {(selectedReviewer.display_name || '?')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selectedReviewer.display_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{selectedReviewer.department || 'No department'}</p>
                  <p className="text-xs text-muted-foreground">
                    {(rolesByUserId[selectedReviewer.id] || []).join(', ') || 'No role'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="py-2 text-sm text-muted-foreground text-center">
                {reviewerOptions.length === 0 ? 'No eligible reviewers found' : 'Select a reviewer from the list'}
              </p>
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
