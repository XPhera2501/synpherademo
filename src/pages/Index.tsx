import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/synphera/Header';
import { CreationTab } from '@/components/synphera/CreationTab';
import { CollaborationTab } from '@/components/synphera/CollaborationTab';
import { CatalogueTab } from '@/components/synphera/CatalogueTab';
import { AnalyticsTab } from '@/components/synphera/AnalyticsTab';
import { AdminTab } from '@/components/synphera/AdminTab';
import { useAuth } from '@/hooks/useAuth';
import { FileText, CheckSquare, Library, BarChart3, Settings } from 'lucide-react';
import type { DepartmentEnum } from '@/lib/supabase-store';
import type { ROIEntry } from '@/components/synphera/ROIBuilder';

export interface CreationSeed {
  sourceAssetId: string;
  title: string;
  content: string;
  department: DepartmentEnum;
  roiEntries: ROIEntry[];
}

export default function Index() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('creation');
  const [creationSeed, setCreationSeed] = useState<CreationSeed | null>(null);
  const { isAdmin, canEdit } = useAuth();
  
  const handleRefresh = () => setRefreshKey(prev => prev + 1);
  const handleLoadIntoCreation = (seed: CreationSeed) => {
    setCreationSeed(seed);
    setActiveTab('creation');
  };
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header refreshKey={refreshKey} />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-6 flex-1 w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'} bg-card border border-border h-12 sm:h-14`}>
            <TabsTrigger 
              value="creation" 
              className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Create</span>
            </TabsTrigger>
            <TabsTrigger 
              value="validate"
              className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <CheckSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Validate</span>
            </TabsTrigger>
            <TabsTrigger 
              value="catalogue"
              className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Library className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Catalogue</span>
            </TabsTrigger>
            <TabsTrigger 
              value="dashboard"
              className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
            <CreationTab onAssetCreated={handleRefresh} creationSeed={creationSeed} onSeedConsumed={() => setCreationSeed(null)} />
          </TabsContent>
          
          <TabsContent value="validate" className="animate-fade-in-up">
            <CollaborationTab refreshKey={refreshKey} onAssetUpdated={handleRefresh} />
          </TabsContent>
          
          <TabsContent value="catalogue" className="animate-fade-in-up">
            <CatalogueTab refreshKey={refreshKey} onLoadIntoCreation={handleLoadIntoCreation} />
          </TabsContent>
          
          <TabsContent value="dashboard" className="animate-fade-in-up">
            <AnalyticsTab refreshKey={refreshKey} />
          </TabsContent>
          
          {isAdmin && (
            <TabsContent value="admin" className="animate-fade-in-up">
              <AdminTab />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <footer className="border-t border-border bg-card/50 py-3">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-center text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} The Prompt Intelligence Suite — Enterprise GenAI Governance</span>
        </div>
      </footer>
    </div>
  );
}
