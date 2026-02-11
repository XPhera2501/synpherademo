import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getAuditLogs, getProfiles, suspendUser, addAuditLog } from '@/lib/supabase-store';
import type { AppRoleEnum, DepartmentEnum } from '@/lib/supabase-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Settings, Users, Shield, Clock, UserCheck, Download, Ban, CheckCircle, Search, FileText, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ROLES: AppRoleEnum[] = ['admin', 'creator', 'reviewer', 'viewer'];
const DEPTS: DepartmentEnum[] = ['Operations', 'Legal', 'R&D', 'Marketing', 'Finance', 'HR', 'IT', 'Executive'];

interface UserWithRole {
  id: string;
  display_name: string | null;
  department: DepartmentEnum | null;
  role: AppRoleEnum;
  suspended: boolean;
}

export function AdminTab() {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditSearch, setAuditSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    const profiles = await getProfiles();
    const { data: roles } = await supabase.from('user_roles').select('*');
    
    const userList: UserWithRole[] = profiles.map(p => {
      const userRole = roles?.find(r => r.user_id === p.id);
      return {
        id: p.id,
        display_name: p.display_name,
        department: p.department,
        role: (userRole?.role as AppRoleEnum) || 'viewer',
        suspended: (p as any).suspended || false,
      };
    });
    setUsers(userList);
    
    const logs = await getAuditLogs(500);
    setAuditLogs(logs);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleRoleChange = async (userId: string, newRole: AppRoleEnum) => {
    await supabase.from('user_roles').delete().eq('user_id', userId);
    const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole });
    if (error) {
      toast.error('Failed to update role: ' + error.message);
    } else {
      if (user) {
        await addAuditLog({
          user_id: user.id,
          action: 'role_change',
          target_type: 'user',
          target_id: userId,
          details: { new_role: newRole },
        });
      }
      toast.success('Role updated');
      loadData();
    }
  };

  const handleDeptChange = async (userId: string, dept: DepartmentEnum) => {
    await supabase.from('profiles').update({ department: dept }).eq('id', userId);
    if (user) {
      await addAuditLog({
        user_id: user.id,
        action: 'dept_change',
        target_type: 'user',
        target_id: userId,
        details: { new_dept: dept },
      });
    }
    toast.success('Department updated');
    loadData();
  };

  const handleSuspend = async (userId: string, suspend: boolean) => {
    const success = await suspendUser(userId, suspend);
    if (success) {
      if (user) {
        await addAuditLog({
          user_id: user.id,
          action: suspend ? 'user_suspended' : 'user_unsuspended',
          target_type: 'user',
          target_id: userId,
        });
      }
      toast.success(suspend ? 'User suspended' : 'User unsuspended');
      loadData();
    }
  };

  const handleExportAuditCSV = () => {
    const headers = ['Timestamp', 'Action', 'Target Type', 'Target ID', 'User ID', 'Details'];
    const rows = auditLogs.map(l => [
      format(new Date(l.created_at), 'yyyy-MM-dd HH:mm:ss'),
      l.action,
      l.target_type || '',
      l.target_id || '',
      l.user_id || '',
      JSON.stringify(l.details || {}),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synphera-audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Audit log exported');
  };

  const handleExportAccessReport = () => {
    const headers = ['User ID', 'Display Name', 'Role', 'Department', 'Suspended'];
    const rows = users.map(u => [u.id, u.display_name || '', u.role, u.department || '', u.suspended ? 'Yes' : 'No']);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synphera-access-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Access report exported');
  };

  const filteredUsers = userSearch
    ? users.filter(u => u.display_name?.toLowerCase().includes(userSearch.toLowerCase()) || u.department?.toLowerCase().includes(userSearch.toLowerCase()))
    : users;

  const filteredLogs = auditSearch
    ? auditLogs.filter(l => l.action?.toLowerCase().includes(auditSearch.toLowerCase()) || l.target_type?.toLowerCase().includes(auditSearch.toLowerCase()))
    : auditLogs;

  if (!isAdmin) return null;

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* User Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                User Management
              </CardTitle>
              <CardDescription>Manage roles, departments, and access</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExportAccessReport}>
                <Download className="h-3.5 w-3.5" />Access Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            {filteredUsers.map(u => (
              <div key={u.id} className={`flex items-center gap-3 rounded-lg border p-3 ${u.suspended ? 'border-destructive/30 bg-destructive/5 opacity-60' : 'border-border'}`}>
                <UserCheck className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{u.display_name || 'Unnamed'}</p>
                    {u.suspended && <Badge variant="destructive" className="text-[10px] h-4">Suspended</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.id.substring(0, 8)}...</p>
                </div>
                <Select value={u.department || 'Operations'} onValueChange={(v) => handleDeptChange(u.id, v as DepartmentEnum)}>
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v as AppRoleEnum)}>
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  variant={u.suspended ? 'outline' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleSuspend(u.id, !u.suspended)}
                  disabled={u.id === user?.id}
                >
                  {u.suspended ? <CheckCircle className="h-4 w-4 text-status-green" /> : <Ban className="h-4 w-4 text-muted-foreground hover:text-destructive" />}
                </Button>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No users found.</p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Compliance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Compliance Summary
          </CardTitle>
          <CardDescription>GDPR & ISO 27001 compliance overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-bold font-mono text-primary">{users.length}</p>
              <p className="text-xs text-muted-foreground">Registered Users</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-bold font-mono text-foreground">{auditLogs.length}</p>
              <p className="text-xs text-muted-foreground">Audit Events</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-bold font-mono text-status-green">{users.filter(u => !u.suspended).length}</p>
              <p className="text-xs text-muted-foreground">Active Accounts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Audit Log
              </CardTitle>
              <CardDescription>Recent actions across the platform ({auditLogs.length} events)</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExportAuditCSV}>
              <Download className="h-3.5 w-3.5" />Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter actions..."
              value={auditSearch}
              onChange={e => setAuditSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <ScrollArea className="max-h-80">
            {filteredLogs.length > 0 ? (
              <div className="space-y-2">
                {filteredLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-3 text-sm border-b border-border/50 pb-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{log.action}</span>
                      {log.target_type && (
                        <span className="text-muted-foreground"> on {log.target_type}</span>
                      )}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(', ')})
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {format(new Date(log.created_at), 'MMM d, HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No audit logs match your filter.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
