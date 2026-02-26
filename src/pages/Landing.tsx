import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import {
  Shield,
  FileText,
  Users,
  BarChart3,
  HelpCircle,
  Settings,
  ArrowRight,
  Lock,
  GitFork,
  TrendingUp,
  ChevronDown,
  Zap,
  CheckCircle,
  Globe,
  Download,
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const [termsContent, setTermsContent] = useState('');
  const [privacyContent, setPrivacyContent] = useState('');

  useEffect(() => {
    const fetchContent = async () => {
      const { data } = await supabase
        .from('landing_content')
        .select('section, content');
      if (data) {
        data.forEach((row) => {
          if (row.section === 'tandc') setTermsContent(row.content);
          if (row.section === 'privacy') setPrivacyContent(row.content);
        });
      }
    };
    fetchContent();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl synphera-brand-gradient">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-heading font-bold tracking-tight">
              SynPhera<span className="synphera-text-gradient">™</span>
              <span className="text-xs font-sans font-normal text-muted-foreground ml-1.5">by X-Phera</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => scrollTo('how-it-works')} className="hover:text-foreground transition-colors">How It Works</button>
            <button onClick={() => scrollTo('benefits')} className="hover:text-foreground transition-colors">Benefits</button>
            <button onClick={() => scrollTo('terms')} className="hover:text-foreground transition-colors">Terms</button>
            <button onClick={() => scrollTo('privacy')} className="hover:text-foreground transition-colors">Privacy</button>
          </nav>
          <Button onClick={() => navigate('/auth')} className="gap-2 synphera-brand-gradient border-0 text-primary-foreground hover:opacity-90">
            Sign In / Sign Up <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="pt-16">
        {/* Hero Section */}
        <section className="synphera-gradient landing-section relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(291_65%_42%/0.08),transparent_60%)]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-32 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-8">
              <Zap className="h-3.5 w-3.5" />
              Enterprise-Grade AI Governance
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight max-w-4xl mx-auto">
              Secure AI Prompt Governance{' '}
              <span className="synphera-text-gradient">for Enterprises</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Create, collaborate, and manage LLM assets with compliance, ROI tracking, and real-time validation.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/auth')} className="gap-2 text-base px-8 h-12 synphera-brand-gradient border-0 text-primary-foreground hover:opacity-90">
                Get Started <ArrowRight className="h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => scrollTo('how-it-works')} className="gap-2 text-base px-8 h-12">
                Learn How It Works <ChevronDown className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="landing-section">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">How SynPhera Works</h2>
              <p className="mt-4 text-muted-foreground text-lg">Five core modules, one unified governance platform.</p>
            </div>
            <Accordion type="single" collapsible className="space-y-3">
              {[
                {
                  value: 'creation',
                  icon: FileText,
                  title: 'Step 1: Creation & Ingestion',
                  content: 'Guided forms with templates, PII scanning, and real-time security validation. Create prompts from scratch or import existing ones with automatic compliance checks.',
                },
                {
                  value: 'collaboration',
                  icon: Users,
                  title: 'Step 2: Collaboration & Review',
                  content: 'Fork, version, and comment on prompt assets. Role-based review workflows ensure quality and compliance before release. Full version history with diff tracking.',
                },
                {
                  value: 'analytics',
                  icon: BarChart3,
                  title: 'Step 3: Analytics Dashboard',
                  content: 'Track ROI metrics per department with customizable formulas. Heatmaps, trend charts, and export-ready reports for stakeholder presentations.',
                },
                {
                  value: 'help',
                  icon: HelpCircle,
                  title: 'Step 4: Help & Guidance',
                  content: 'Built-in CLEAR framework guidance, prompt engineering best practices, and contextual help throughout the platform.',
                },
                {
                  value: 'admin',
                  icon: Settings,
                  title: 'Step 5: Admin Controls',
                  content: 'User management, role assignment, department configuration, and audit trails. Full administrative control over your governance instance.',
                },
              ].map(({ value, icon: Icon, title, content }) => (
                <AccordionItem
                  key={value}
                  value={value}
                  className="rounded-xl border border-border bg-card px-6 data-[state=open]:synphera-border-glow"
                >
                  <AccordionTrigger className="hover:no-underline gap-3 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <span className="text-base font-heading font-semibold">{title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5 pl-12">
                    {content}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Benefits */}
        <section id="benefits" className="landing-section bg-card/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">Why Choose SynPhera?</h2>
              <p className="mt-4 text-muted-foreground text-lg">Enterprise security, team collaboration, and measurable ROI.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Lock,
                  title: 'PII Protection',
                  description: 'Real-time scanning for compliance. Detect and flag sensitive data before prompts reach production.',
                  color: 'text-status-green',
                },
                {
                  icon: GitFork,
                  title: 'Versioning & Collaboration',
                  description: 'Fork, review, and merge prompt assets with full audit trails. Git-like workflows for AI governance.',
                  color: 'text-primary',
                },
                {
                  icon: TrendingUp,
                  title: 'ROI Analytics',
                  description: 'Department-level ROI tracking with customizable formulas, heatmaps, and exportable reports.',
                  color: 'text-status-amber',
                },
              ].map(({ icon: Icon, title, description, color }) => (
                <Card key={title} className="bg-card border-border hover:synphera-border-glow transition-all duration-300 group">
                  <CardContent className="p-8">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-5 ${color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-heading text-xl font-semibold mb-3">{title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Trust indicators */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
              {[
                { icon: CheckCircle, text: 'ISO 27001 Compliant' },
                { icon: Shield, text: 'SOC 2 Type II' },
                { icon: Globe, text: 'GDPR Ready' },
                { icon: Lock, text: 'End-to-End Encryption' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Terms & Conditions */}
        <section id="terms" className="landing-section">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="font-heading text-3xl font-bold tracking-tight mb-2">Terms & Conditions</h2>
            <p className="text-sm text-muted-foreground mb-8">Last updated: February 2026</p>
            <Card className="bg-card border-border">
              <CardContent className="p-8 prose prose-invert prose-sm max-w-none">
                {termsContent ? (
                  <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{termsContent}</div>
                ) : (
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p><strong className="text-foreground">1. Acceptance of Terms.</strong> By accessing or using SynPhera ("the Platform"), you agree to be bound by these Terms & Conditions. If you do not agree, do not use the Platform.</p>
                    <p><strong className="text-foreground">2. Use License.</strong> Subject to these Terms, SynPhera grants you a limited, non-exclusive, non-transferable license to use the Platform for your organization's internal AI governance needs.</p>
                    <p><strong className="text-foreground">3. User Responsibilities.</strong> You are responsible for maintaining the confidentiality of your account credentials, ensuring all prompt assets comply with applicable laws, and not using the Platform for any unlawful purpose.</p>
                    <p><strong className="text-foreground">4. Data Ownership.</strong> You retain ownership of all prompt assets, templates, and content you create on the Platform. SynPhera does not claim ownership over your data.</p>
                    <p><strong className="text-foreground">5. Service Availability.</strong> We strive for 99.9% uptime but do not guarantee uninterrupted access. Scheduled maintenance windows will be communicated in advance.</p>
                    <p><strong className="text-foreground">6. Limitation of Liability.</strong> SynPhera shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform.</p>
                    <p><strong className="text-foreground">7. Modifications.</strong> We reserve the right to modify these Terms at any time. Continued use of the Platform constitutes acceptance of modified Terms.</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
                const el = document.getElementById('terms');
                if (!el) return;
                const text = el.innerText;
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'SynPhera-Terms-and-Conditions.txt'; a.click();
                URL.revokeObjectURL(url);
              }}>
                <Download className="h-3.5 w-3.5" /> Download T&C
              </Button>
            </div>
          </div>
        </section>

        {/* Privacy Statement */}
        <section id="privacy" className="landing-section bg-card/30">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="font-heading text-3xl font-bold tracking-tight mb-2">Privacy Statement</h2>
            <p className="text-sm text-muted-foreground mb-8">Last updated: February 2026</p>
            <Card className="bg-card border-border">
              <CardContent className="p-8 prose prose-invert prose-sm max-w-none">
                {privacyContent ? (
                  <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{privacyContent}</div>
                ) : (
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p><strong className="text-foreground">Data Collection.</strong> We collect only the information necessary to provide our services: email address, display name, and usage analytics. We do not sell your data to third parties.</p>
                    <p><strong className="text-foreground">GDPR Compliance.</strong> SynPhera is fully GDPR-compliant. You have the right to access, rectify, or delete your personal data at any time by contacting our data protection officer.</p>
                    <p><strong className="text-foreground">Data Storage.</strong> All data is stored securely with AES-256 encryption at rest and TLS 1.3 in transit. Our infrastructure is hosted in SOC 2 Type II certified data centers.</p>
                    <p><strong className="text-foreground">Audit Trails.</strong> All actions within the Platform are logged for compliance purposes. Audit logs are retained for 7 years in accordance with enterprise governance requirements.</p>
                    <p><strong className="text-foreground">Cookies.</strong> We use essential cookies only for authentication and session management. No third-party tracking cookies are used.</p>
                    <p><strong className="text-foreground">Data Breach Protocol.</strong> In the event of a data breach, affected users will be notified within 72 hours as required by GDPR Article 33.</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
                const el = document.getElementById('privacy');
                if (!el) return;
                const text = el.innerText;
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'SynPhera-Privacy-Statement.txt'; a.click();
                URL.revokeObjectURL(url);
              }}>
                <Download className="h-3.5 w-3.5" /> Download Privacy Statement
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            <span>© 2026 SynPhera™ by X-Phera. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => scrollTo('terms')} className="hover:text-foreground transition-colors">T&C</button>
            <button onClick={() => scrollTo('privacy')} className="hover:text-foreground transition-colors">Privacy</button>
            <a href="mailto:contact@synphera.com" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
