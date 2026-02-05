import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { REVIEWERS, Reviewer } from '@/lib/synphera-types';
import { getCurrentUser, setCurrentUser } from '@/lib/synphera-store';
import { useState, useEffect } from 'react';

interface UserSelectorProps {
  onUserChange?: (userId: string) => void;
}

export function UserSelector({ onUserChange }: UserSelectorProps) {
  const [currentUserId, setCurrentUserId] = useState(getCurrentUser());
  const currentUser = REVIEWERS.find(r => r.id === currentUserId) || REVIEWERS[0];
  
  const handleChange = (userId: string) => {
    setCurrentUser(userId);
    setCurrentUserId(userId);
    onUserChange?.(userId);
  };
  
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="text-2xl">{currentUser.avatar}</div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">Logged in as</p>
        <Select value={currentUserId} onValueChange={handleChange}>
          <SelectTrigger className="h-auto border-0 bg-transparent p-0 text-sm font-medium shadow-none focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REVIEWERS.map((reviewer) => (
              <SelectItem key={reviewer.id} value={reviewer.id}>
                <div className="flex items-center gap-2">
                  <span>{reviewer.avatar}</span>
                  <span>{reviewer.name}</span>
                  <span className="text-xs text-muted-foreground">/ {reviewer.department}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}