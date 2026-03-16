import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, FileText, Users, BarChart3, GitFork, 
  AlertTriangle, CheckCircle, XCircle, DollarSign,
  Lock, Eye, Zap, Lightbulb, Search, Tag, BookTemplate,
  MessageSquare, Building2, Send, Download
} from 'lucide-react';

export function HelpTab() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Welcome */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold">Welcome to SynPhera™</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Your enterprise-grade GenAI prompt governance portal. Transform shadow AI into 
          governed, auditable, ROI-quantified enterprise assets.
        </p>
      </div>
      
      {/* Core Principles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" />Core Governance Principles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Eye, title: 'Full Lineage Traceability', desc: 'Every prompt is versioned with complete parent-child relationships' },
              { icon: Shield, title: 'Security-First Approach', desc: 'PII scanning required before any asset enters the library' },
              { icon: Users, title: 'Peer Review Workflow', desc: 'Cross-departmental approval ensures quality and compliance' },
              { icon: DollarSign, title: 'ROI Quantification', desc: 'Every asset has documented business value justification' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3">
                <Icon className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CLEAR Framework */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-primary" />CLEAR Framework for Prompt Quality</CardTitle>
          <CardDescription>Follow these principles when crafting enterprise prompts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {[
              { letter: 'C', word: 'Concise', desc: 'Remove filler words and unnecessary context. Every word should serve a purpose.', example: '❌ "Please analyze the data and..." → ✅ "Analyze customer churn data..."' },
              { letter: 'L', word: 'Logical', desc: 'Structure prompts with clear numbered steps or sections for coherent flow.', example: 'Use: 1) Context → 2) Task → 3) Format → 4) Constraints' },
              { letter: 'E', word: 'Explicit', desc: 'Leave no room for ambiguity. Specify format, length, and scope clearly.', example: '❌ "Summarize this" → ✅ "Summarize in 3 bullet points, max 50 words each"' },
              { letter: 'A', word: 'Adaptive', desc: 'Use {{placeholders}} for dynamic inputs so prompts work across contexts.', example: 'Use {{department}}, {{product_name}}, {{time_period}} variables' },
              { letter: 'R', word: 'Reflective', desc: 'Include self-check instructions for the AI to verify its own output.', example: '✅ "Before responding, verify your analysis covers all listed criteria"' },
            ].map(({ letter, word, desc, example }) => (
              <div key={letter} className="flex gap-4 p-3 rounded-lg bg-muted/30">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg flex-shrink-0">{letter}</div>
                <div>
                  <p className="font-medium">{word}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 font-mono">{example}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Traffic Light */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" />Security Traffic Light System</CardTitle>
          <CardDescription>Every asset must pass security scanning before library inclusion</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { icon: CheckCircle, badge: 'GREEN', label: 'Cleared for Library', desc: 'No sensitive data patterns detected. Asset can be saved immediately.', className: 'bg-status-green/10 border-status-green/30', iconClass: 'text-status-green' },
            { icon: AlertTriangle, badge: 'AMBER', label: 'Requires Justification', desc: 'Medium-severity patterns found (e.g., phone numbers, health keywords). Provide business justification to proceed.', className: 'bg-status-amber/10 border-status-amber/30', iconClass: 'text-status-amber' },
            { icon: XCircle, badge: 'RED', label: 'Save Blocked', desc: 'Critical issues detected (SSN, credit cards, proprietary markers, criminal data). Content must be remediated before saving.', className: 'bg-status-red/10 border-status-red/30', iconClass: 'text-status-red' },
          ].map(({ icon: Icon, badge, label, desc, className, iconClass }) => (
            <div key={badge} className={`flex items-start gap-4 p-4 rounded-lg border ${className}`}>
              <Icon className={`h-6 w-6 mt-0.5 ${iconClass}`} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`bg-${badge === 'GREEN' ? 'status-green' : badge === 'AMBER' ? 'status-amber' : 'status-red'} text-white`}>{badge}</Badge>
                  <span className="font-medium">{label}</span>
                </div>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Feature Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />Feature Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: BookTemplate, title: 'Template Library', desc: 'Use pre-built frameworks: Zero-Shot, Few-Shot, Chain-of-Thought, Role-Play, and Structured Output.' },
              { icon: Tag, title: 'Tags & Categories', desc: 'Organize assets with tags and categories for faceted search and discovery.' },
              { icon: Search, title: 'Full-Text Search', desc: 'Search across titles, content, and tags with department and status filters.' },
              { icon: GitFork, title: 'Fork & Branch', desc: 'Create variations of released assets while maintaining full lineage tracing.' },
              { icon: Send, title: 'Submit for Review', desc: 'Assign assets to reviewers for approval before releasing to the library.' },
              { icon: Building2, title: 'Department Queues', desc: 'View and manage review queues filtered by your department.' },
              { icon: MessageSquare, title: 'Comments & Review', desc: 'Add review comments on any asset for collaborative refinement.' },
              { icon: Download, title: 'Compliance Exports', desc: 'Admins can export audit logs and access reports as CSV for compliance.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3 p-3 rounded-lg border border-border hover:border-primary/20 transition-colors">
                <Icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />Quick Start Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[
              { step: 1, icon: FileText, title: 'Create Your Asset', desc: 'Enter title, prompt content, department, category, tags, and optional ROI values' },
              { step: 2, icon: Shield, title: 'Run Security Scan', desc: 'Mandatory PII and compliance check before saving' },
              { step: 3, icon: Users, title: 'Submit for Review', desc: 'Assign to a peer reviewer for approval and release' },
              { step: 4, icon: GitFork, title: 'Fork & Iterate', desc: 'Create branches from released assets for department-specific variations' },
              { step: 5, icon: BarChart3, title: 'Track Value', desc: 'Monitor ROI metrics and lineage in the Analytics dashboard' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">{step}</div>
                <div>
                  <p className="font-medium flex items-center gap-2"><Icon className="h-4 w-4" />{title}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* RBAC Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Role-Based Access Control (RBAC)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-3 text-left text-xs font-semibold">Role</th>
                  <th className="py-2 px-3 text-center text-xs font-semibold">Create</th>
                  <th className="py-2 px-3 text-center text-xs font-semibold">Edit</th>
                  <th className="py-2 px-3 text-center text-xs font-semibold">Review</th>
                  <th className="py-2 px-3 text-center text-xs font-semibold">Admin</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { role: 'Admin', create: true, edit: true, review: true, admin: true },
                  { role: 'Creator', create: true, edit: true, review: false, admin: false },
                  { role: 'Reviewer', create: false, edit: false, review: true, admin: false },
                  { role: 'Viewer', create: false, edit: false, review: false, admin: false },
                ].map(r => (
                  <tr key={r.role} className="border-b border-border/50">
                    <td className="py-2 px-3 font-medium">{r.role}</td>
                    {[r.create, r.edit, r.review, r.admin].map((v, i) => (
                      <td key={i} className="py-2 px-3 text-center">
                        {v ? <CheckCircle className="h-4 w-4 text-status-green mx-auto" /> : <XCircle className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground space-y-2 pb-8">
        <p>SynPhera™ supports GDPR, CCPA, and ISO 27001 compliance requirements.</p>
        <p className="flex items-center justify-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Enterprise GenAI Governance • Version 13.0
        </p>
      </div>
    </div>
  );
}
