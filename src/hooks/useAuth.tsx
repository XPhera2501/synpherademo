import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export type AppRole = 'super_admin' | 'admin' | 'approver' | 'creator' | 'reviewer' | 'viewer';

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  department: string | null;
  manager_id?: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole;
  roles: AppRole[];
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string, preferredRole?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isCreator: boolean;
  isReviewer: boolean;
  isApprover: boolean;
  canApprove: boolean;
  canEdit: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole>('viewer');
  const [roles, setRoles] = useState<AppRole[]>(['viewer']);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileData) setProfile(profileData);

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (roleData && roleData.length > 0) {
      const assignedRoles = roleData.map((entry) => entry.role as AppRole);
      setRoles(assignedRoles);

      // Pick highest privilege role for display
      const roleOrder: AppRole[] = ['super_admin', 'admin', 'approver', 'creator', 'reviewer', 'viewer'];
      const bestRole = roleOrder.find(r => assignedRoles.includes(r)) || 'viewer';
      setRole(bestRole);
    } else {
      setRoles(['viewer']);
      setRole('viewer');
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      
      if (sess?.user) {
        // Use setTimeout to avoid Supabase deadlock on initial signup
        setTimeout(() => fetchProfile(sess.user.id), 0);
      } else {
        setProfile(null);
        setRole('viewer');
        setRoles(['viewer']);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        fetchProfile(sess.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string, preferredRole?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: displayName || email.split('@')[0],
          preferred_role: preferredRole || 'creator',
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole('viewer');
    setRoles(['viewer']);
  };

  const hasRole = (candidate: AppRole) => roles.includes(candidate);
  const isAdmin = hasRole('admin') || hasRole('super_admin');
  const isCreator = isAdmin || hasRole('creator');
  const isReviewer = isAdmin || hasRole('creator') || hasRole('reviewer');
  const isApprover = isAdmin || hasRole('approver');
  const canApprove = isApprover;
  const canEdit = isCreator;

  return (
    <AuthContext.Provider value={{
      user, session, profile, role, roles, loading,
      signUp, signIn, signOut,
      isAdmin, isCreator, isReviewer, isApprover, canApprove, canEdit,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
