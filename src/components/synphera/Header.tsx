import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Zap, LogOut, User } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import synpheraLogo from '@/assets/synphera-logo.jpg';

export function Header() {
  const { profile, role, signOut, user } = useAuth();

  return (
    <header className="relative overflow-hidden border-b border-border bg-card">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-synphera-magenta/5" />
      <div className="relative mx-auto max-w-7xl px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img src={synpheraLogo} alt="SynPhera logo" className="h-12 w-12 rounded-xl object-cover synphera-glow" />
              <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-synphera-magenta text-[10px] font-bold text-primary-foreground">
                13
              </div>
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                SynPhera<span className="synphera-text-gradient">™</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Enterprise GenAI Governance Portal
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-6 md:flex">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                <span>Assets Governed</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4 text-primary" />
                <span>ISO 27001 Compliant</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border bg-background/50 px-3 py-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="hidden sm:block">
                <p className="text-xs font-medium leading-none">{profile?.display_name || user?.email?.split('@')[0]}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 h-4 capitalize">{role}</Badge>
                  {profile?.department && (
                    <span className="text-[10px] text-muted-foreground">• {profile.department}</span>
                  )}
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={signOut}>
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sign out</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
