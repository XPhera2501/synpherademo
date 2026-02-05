import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, FileText, Users, BarChart3, GitFork, 
  AlertTriangle, CheckCircle, XCircle, DollarSign,
  Lock, Eye, Zap
} from 'lucide-react';

export function HelpTab() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold">Welcome to Synphera™ V13</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Your enterprise-grade GenAI prompt governance portal. Transform shadow AI into 
          governed, auditable, ROI-quantified enterprise assets.
        </p>
      </div>
      
      {/* Core Principles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Core Governance Principles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex gap-3">
              <Eye className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Full Lineage Traceability</p>
                <p className="text-sm text-muted-foreground">
                  Every prompt is versioned with complete parent-child relationships
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Security-First Approach</p>
                <p className="text-sm text-muted-foreground">
                  PII scanning required before any asset enters the library
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Users className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Peer Review Workflow</p>
                <p className="text-sm text-muted-foreground">
                  Cross-departmental approval ensures quality and compliance
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <DollarSign className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">ROI Quantification</p>
                <p className="text-sm text-muted-foreground">
                  Every asset has documented business value justification
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Traffic Light System */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Security Traffic Light System
          </CardTitle>
          <CardDescription>
            Every asset must pass security scanning before library inclusion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-status-green/10 border border-status-green/30">
              <CheckCircle className="h-6 w-6 text-status-green mt-0.5" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-status-green text-white">GREEN</Badge>
                  <span className="font-medium">Cleared for Library</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  No sensitive data patterns detected. Asset can be saved immediately.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 rounded-lg bg-status-amber/10 border border-status-amber/30">
              <AlertTriangle className="h-6 w-6 text-status-amber mt-0.5" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-status-amber text-white">AMBER</Badge>
                  <span className="font-medium">Requires Justification</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Medium-severity patterns found (e.g., phone numbers, health keywords). 
                  Provide business justification to proceed.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 rounded-lg bg-status-red/10 border border-status-red/30">
              <XCircle className="h-6 w-6 text-status-red mt-0.5" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-status-red text-white">RED</Badge>
                  <span className="font-medium">Save Blocked</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Critical issues detected (SSN, credit cards, proprietary markers, criminal data). 
                  Content must be remediated before saving.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Workflow Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Start Workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                1
              </div>
              <div>
                <p className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Create Your Asset
                </p>
                <p className="text-sm text-muted-foreground">
                  Enter title, prompt content, department, and optional ROI values
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                2
              </div>
              <div>
                <p className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Run Security Scan
                </p>
                <p className="text-sm text-muted-foreground">
                  Mandatory PII and compliance check before saving
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                3
              </div>
              <div>
                <p className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Submit for Review
                </p>
                <p className="text-sm text-muted-foreground">
                  Assign to a peer reviewer for approval and release
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                4
              </div>
              <div>
                <p className="font-medium flex items-center gap-2">
                  <GitFork className="h-4 w-4" />
                  Fork & Iterate
                </p>
                <p className="text-sm text-muted-foreground">
                  Create branches from released assets for department-specific variations
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                5
              </div>
              <div>
                <p className="font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Track Value
                </p>
                <p className="text-sm text-muted-foreground">
                  Monitor ROI metrics and lineage in the Analytics dashboard
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Compliance Note */}
      <div className="text-center text-sm text-muted-foreground space-y-2 pb-8">
        <p>
          Synphera™ is designed to support GDPR, CCPA, and ISO 27001 compliance requirements.
        </p>
        <p className="flex items-center justify-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Enterprise GenAI Governance • Version 13.0
        </p>
      </div>
    </div>
  );
}