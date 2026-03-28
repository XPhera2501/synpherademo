import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import synpheraLogo from '@/assets/synphera-logo.jpg';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, LogIn, UserPlus, Loader2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showSuper = searchParams.get('super') === 'true';
  const [loading, setLoading] = useState(false);
  const [authTab, setAuthTab] = useState<string>('login');
  const [superMode, setSuperMode] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [signupRole, setSignupRole] = useState('creator');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [mfaCode, setMfaCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);

    if (superMode) {
      const { data: whitelisted } = await supabase
        .from('super_admin_whitelist')
        .select('id, mfa_enabled')
        .eq('email', loginEmail.trim().toLowerCase())
        .is('revoked_at', null)
        .maybeSingle();

      if (!whitelisted) {
        setLoading(false);
        toast.error('Not authorized for super admin access');
        return;
      }
    }

    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success('Welcome back!');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!agreedToTerms) {
      toast.error('You must agree to the Terms & Conditions');
      return;
    }
    setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName, signupRole);
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success('Account created! You can now sign in.');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Branding */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <img src={synpheraLogo} alt="The Prompt Intelligence Suite logo" className="h-14 w-14 rounded-2xl object-cover synphera-glow" />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Sign In to The Prompt Intelligence Suite
          </h1>
          <p className="text-sm text-muted-foreground">
            Enterprise GenAI Governance Portal
          </p>
        </div>

        {/* Super Admin Toggle */}
        {showSuper && (
          <div className="flex justify-center">
            <Tabs value={superMode ? 'super' : 'user'} onValueChange={(v) => setSuperMode(v === 'super')}>
              <TabsList className="grid w-64 grid-cols-2">
                <TabsTrigger value="user" className="text-xs gap-1.5">
                  <LogIn className="h-3.5 w-3.5" /> User Login
                </TabsTrigger>
                <TabsTrigger value="super" className="text-xs gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" /> Super Admin
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        <Card className="border-border/60 shadow-lg">
          <Tabs value={authTab} onValueChange={setAuthTab}>
            <TabsList className="grid w-full grid-cols-2 m-1" style={{ width: 'calc(100% - 8px)' }}>
              <TabsTrigger value="login" className="gap-1.5 text-sm">
                <LogIn className="h-4 w-4" /> Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="gap-1.5 text-sm">
                <UserPlus className="h-4 w-4" /> Sign Up
              </TabsTrigger>
            </TabsList>

            {/* Sign In */}
            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardHeader className="pb-4">
                  <CardTitle className="font-heading text-lg">
                    {superMode ? 'Super Admin Access' : 'Welcome Back'}
                  </CardTitle>
                  <CardDescription>
                    {superMode
                      ? 'Elevated access requires whitelist verification'
                      : 'Sign in to access your prompt governance dashboard'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@company.com"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPw ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPw(!showLoginPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {superMode && (
                    <div className="space-y-2">
                      <Label htmlFor="mfa-code">MFA Code (if enabled)</Label>
                      <Input
                        id="mfa-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        value={mfaCode}
                        onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  )}

                  <Button type="submit" className="w-full gap-2 synphera-brand-gradient border-0 text-primary-foreground hover:opacity-90" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {superMode ? 'Access Super Admin' : 'Sign In'}
                  </Button>

                  <p className="text-xs text-center">
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={async () => {
                        if (!loginEmail.trim()) {
                          toast.error('Enter your email first, then click Forgot Password');
                          return;
                        }
                        const { error } = await supabase.auth.resetPasswordForEmail(loginEmail.trim(), {
                          redirectTo: `${window.location.origin}/reset-password`,
                        });
                        if (error) toast.error(error.message);
                        else toast.success('Check your email for a password reset link');
                      }}
                    >
                      Forgot Password?
                    </button>
                  </p>
                </CardContent>
              </form>
            </TabsContent>

            {/* Sign Up */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup}>
                <CardHeader className="pb-4">
                  <CardTitle className="font-heading text-lg">Create Account</CardTitle>
                  <CardDescription>Join your organization's prompt governance workspace</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Display Name</Label>
                    <Input
                      id="signup-name"
                      placeholder="Your name"
                      value={signupName}
                      onChange={e => setSignupName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@company.com"
                      value={signupEmail}
                      onChange={e => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignupPw ? 'text' : 'password'}
                        placeholder="Min 8 characters"
                        value={signupPassword}
                        onChange={e => setSignupPassword(e.target.value)}
                        required
                        minLength={8}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPw(!showSignupPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showSignupPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-role">Preferred Role</Label>
                    <Select value={signupRole} onValueChange={setSignupRole}>
                      <SelectTrigger id="signup-role" className="h-9 text-sm">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="reviewer">Reviewer</SelectItem>
                        <SelectItem value="creator">Creator</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Approver and admin roles are assigned by administrators after account setup.</p>
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="agree-terms"
                      checked={agreedToTerms}
                      onCheckedChange={(c) => setAgreedToTerms(c === true)}
                    />
                    <Label htmlFor="agree-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                      I agree to the{' '}
                      <a href="/#terms" target="_blank" className="text-primary hover:underline">
                        Terms & Conditions
                      </a>{' '}
                      and{' '}
                      <a href="/#privacy" target="_blank" className="text-primary hover:underline">
                        Privacy Policy
                      </a>
                    </Label>
                  </div>

                  <Button type="submit" className="w-full gap-2 synphera-brand-gradient border-0 text-primary-foreground hover:opacity-90" disabled={loading || !agreedToTerms}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    New accounts get the <span className="font-semibold text-primary">Creator</span> role by default unless an administrator assigns Viewer or Reviewer later.
                  </p>
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <button onClick={() => navigate('/')} className="hover:text-foreground transition-colors">
            ← Back to Home
          </button>
        </p>
      </div>
    </div>
  );
}
