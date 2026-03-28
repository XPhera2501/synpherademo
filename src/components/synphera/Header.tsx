import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from './ThemeToggle';
import synpheraLogo from '@/assets/synphera-logo-transparent.png';

export function Header() {
  const { profile, signOut, user } = useAuth();

  return (
    <header className="relative overflow-hidden border-b border-border bg-card">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-synphera-magenta/5" />
      <div className="relative mx-auto max-w-7xl px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <div className="relative flex-shrink-0">
              <img src={synpheraLogo} alt="The Prompt Intelligence Suite logo" className="h-16 w-16 sm:h-24 sm:w-24 object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
                The Prompt Intelligence Suite
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />

            <div className="flex items-center gap-3 rounded-lg border border-border bg-background/50 px-3 py-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="hidden sm:block">
                <p className="text-xs font-medium leading-none">{profile?.display_name || user?.email?.split('@')[0]}</p>
                {profile?.department && (
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">{profile.department}</span>
                )}
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
