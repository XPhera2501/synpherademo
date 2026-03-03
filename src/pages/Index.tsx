import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/synphera/Header';
import { CreationTab } from '@/components/synphera/CreationTab';
import { CollaborationTab } from '@/components/synphera/CollaborationTab';
import { AnalyticsTab } from '@/components/synphera/AnalyticsTab';
import { HelpTab } from '@/components/synphera/HelpTab';
import { AdminTab } from '@/components/synphera/AdminTab';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Users, BarChart3, HelpCircle, Settings, ShieldCheck } from 'lucide-react';

export default function Index() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { isAdmin, canEdit } = useAuth();
  
  const handleRefresh = () => setRefreshKey(prev => prev + 1);
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-6 flex-1 w-full">
        <Tabs defaultValue="creation" className="space-y-4 sm:space-y-6">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'} bg-card border border-border h-12 sm:h-14`}>
            <TabsTrigger 
              value="creation" 
              className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Ingest</span>
            </TabsTrigger>
            <TabsTrigger 
              value="collaboration"
              className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Validate</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics"
              className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Catalogue</span>
            </TabsTrigger>
            <TabsTrigger 
              value="help"
              className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <HelpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger 
                value="admin"
                className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Admin</span>
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="creation" className="animate-fade-in-up">
            <CreationTab onAssetCreated={handleRefresh} />
          </TabsContent>
          
          <TabsContent value="collaboration" className="animate-fade-in-up">
            <CollaborationTab refreshKey={refreshKey} onAssetUpdated={handleRefresh} />
          </TabsContent>
          
          <TabsContent value="analytics" className="animate-fade-in-up">
            <AnalyticsTab refreshKey={refreshKey} />
          </TabsContent>
          
          <TabsContent value="help" className="animate-fade-in-up">
            <HelpTab />
          </TabsContent>
          
          {isAdmin && (
            <TabsContent value="admin" className="animate-fade-in-up">
              <AdminTab />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-3">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} SynPhera™ — Enterprise GenAI Governance</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-status-green" />
            <span>ISO 27001 Certified · All prompt data encrypted at rest & in transit</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
