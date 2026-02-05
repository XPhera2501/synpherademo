import { Shield, Database, Zap } from 'lucide-react';

export function Header() {
  return (
    <header className="relative overflow-hidden border-b border-border bg-card">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
      <div className="relative mx-auto max-w-7xl px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/30">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                13
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Synphera<span className="text-primary">™</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Enterprise GenAI Governance Portal
              </p>
            </div>
          </div>
          
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
        </div>
      </div>
    </header>
  );
}