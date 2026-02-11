import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/synphera/Header';
import { UserSelector } from '@/components/synphera/UserSelector';
import { CreationTab } from '@/components/synphera/CreationTab';
import { CollaborationTab } from '@/components/synphera/CollaborationTab';
import { AnalyticsTab } from '@/components/synphera/AnalyticsTab';
import { HelpTab } from '@/components/synphera/HelpTab';
import { seedDatabase } from '@/lib/synphera-store';
import { FileText, Users, BarChart3, HelpCircle } from 'lucide-react';

export default function Index() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentUser, setCurrentUser] = useState('');
  
  useEffect(() => {
    seedDatabase();
  }, []);
  
  const handleRefresh = () => setRefreshKey(prev => prev + 1);
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <UserSelector onUserChange={(userId) => {
            setCurrentUser(userId);
            handleRefresh();
          }} />
        </div>
        
        <Tabs defaultValue="creation" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-card border border-border h-12 sm:h-14">
            <TabsTrigger 
              value="creation" 
              className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Creation / Ingestion</span>
              <span className="sm:hidden">Create</span>
            </TabsTrigger>
            <TabsTrigger 
              value="collaboration"
              className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Collaboration & Review</span>
              <span className="sm:hidden">Review</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics"
              className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger 
              value="help"
              className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <HelpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Help</span>
            </TabsTrigger>
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
        </Tabs>
      </div>
    </div>
  );
}
