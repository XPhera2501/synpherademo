import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getAuditLogs, getProfiles } from '@/lib/supabase-store';
import type { AppRoleEnum, DepartmentEnum } from '@/lib/supabase-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Users, Shield, Clock, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ROLES: AppRoleEnum[] = ['admin', 'creator', 'reviewer', 'viewer'];
const DEPTS: DepartmentEnum[] = ['Operations', 'Legal', 'R&D', 'Marketing', 'Finance', 'HR', 'IT', 'Executive'];

interface UserWithRole {
  id: string;
  display_name: string | null;
  department: DepartmentEnum | null;
  role: AppRoleEnum;
}

export function AdminTab() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    // Get profiles
    const profiles = await getProfiles();
    
    // Get all roles
    const { data: roles } = await supabase.from('user_roles').select('*');
    
    const userList: UserWithRole[] = profiles.map(p => {
      const userRole = roles?.find(r => r.user_id === p.id);
      return {
        id: p.id,
        display_name: p.display_name,
        department: p.department,
        role: (userRole?.role as AppRoleEnum) || 'viewer',
      };
    });
    setUsers(userList);
    
    const logs = await getAuditLogs();
    setAuditLogs(logs);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleRoleChange = async (userId: string, newRole: AppRoleEnum) => {
    // Delete existing role, insert new one
    await supabase.from('user_roles').delete().eq('user_id', userId);
    const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole });
    if (error) {
      toast.error('Failed to update role: ' + error.message);
    } else {
      toast.success('Role updated');
      loadData();
    }
  };

  const handleDeptChange = async (userId: string, dept: DepartmentEnum) => {
    await supabase.from('profiles').update({ department: dept }).eq('id', userId);
    toast.success('Department updated');
    loadData();
  };

  if (!isAdmin) return null;

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* User Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            User Management
          </CardTitle>
          <CardDescription>Manage roles and department assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-4 rounded-lg border border-border p-3">
                <UserCheck className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.display_name || 'Unnamed'}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.id.substring(0, 8)}...</p>
                </div>
                <Select value={u.department || 'Operations'} onValueChange={(v) => handleDeptChange(u.id, v as DepartmentEnum)}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v as AppRoleEnum)}>
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No users found.</p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Audit Log
          </CardTitle>
          <CardDescription>Recent actions across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-72">
            {auditLogs.length > 0 ? (
              <div className="space-y-2">
                {auditLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-3 text-sm border-b border-border/50 pb-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{log.action}</span>
                      {log.target_type && (
                        <span className="text-muted-foreground"> on {log.target_type}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {format(new Date(log.created_at), 'MMM d, HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No audit logs yet.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
