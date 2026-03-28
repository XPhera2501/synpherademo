import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getAuditLogs, getProfiles, suspendUser, addAuditLog } from '@/lib/supabase-store';
import type { AppRoleEnum, DepartmentEnum, DbAuditLog } from '@/lib/supabase-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Settings, Users, Shield, Clock, UserCheck, Download, Ban, CheckCircle,
  Search, FileText, Plus, Pencil, Trash2, Building2, Calculator, TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ROLES: AppRoleEnum[] = ['super_admin', 'admin', 'approver', 'creator', 'reviewer', 'viewer'];
const ROLE_LABELS: Record<AppRoleEnum, string> = {
  super_admin: '🔴 Super Admin',
  admin: 'Admin',
  approver: 'Approver',
  creator: 'Creator',
  reviewer: 'Reviewer',
  viewer: 'Viewer',
};
const DEPTS: DepartmentEnum[] = ['Operations', 'Legal', 'R&D', 'Marketing', 'Finance', 'HR', 'IT', 'Executive'];
const ROI_CATEGORIES = ['Cost Savings', 'Compliance Improvement', 'Operational Velocity Improvement', 'Risk Level Reduction', 'Revenue Increase'];

interface UserWithRole {
  id: string;
  display_name: string | null;
  department: DepartmentEnum | null;
  manager_id: string | null;
  role: AppRoleEnum;
  suspended: boolean;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
}

interface ROIConfig {
  id: string;
  department_id: string | null;
  category: string;
  formula: string;
  weight: number | null;
}

export function AdminTab() {
  const { isAdmin, user, role: currentRole } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [auditLogs, setAuditLogs] = useState<DbAuditLog[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roiConfigs, setROIConfigs] = useState<ROIConfig[]>([]);
  const [landingContent, setLandingContent] = useState<{ id?: string; section: string; content: string; title?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditSearch, setAuditSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [editingContent, setEditingContent] = useState<{ section: string; content: string; id?: string } | null>(null);
  const [contentSaving, setContentSaving] = useState(false);

  // Department dialog
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  // ROI dialog
  const [roiDialogOpen, setROIDialogOpen] = useState(false);
  const [editingROI, setEditingROI] = useState<ROIConfig | null>(null);
  const [roiDeptId, setROIDeptId] = useState('');
  const [roiCategory, setROICategory] = useState('');
  const [roiFormula, setROIFormula] = useState('');
  const [roiWeight, setROIWeight] = useState([5]);
  const [roiTestInput, setROITestInput] = useState('');
  const [roiTestResult, setROITestResult] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [profiles, { data: roles }, logs, { data: deptData }, { data: roiData }, { data: contentData }] = await Promise.all([
      getProfiles(),
      supabase.from('user_roles').select('*'),
      getAuditLogs(500),
      supabase.from('departments').select('*').order('name'),
      supabase.from('roi_configs').select('*').order('category'),
      supabase.from('landing_content').select('*'),
    ]);

    const userList: UserWithRole[] = profiles.map(p => {
      const userRole = roles?.find(r => r.user_id === p.id);
      return {
        id: p.id,
        display_name: p.display_name,
        department: p.department,
        manager_id: p.manager_id ?? null,
        role: (userRole?.role as AppRoleEnum) || 'viewer',
        suspended: p.suspended || false,
      };
    });
    setUsers(userList);
    setAuditLogs(logs);
    setDepartments(deptData || []);
    setROIConfigs(roiData || []);
    setLandingContent(contentData || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // ============ User Role Handlers ============
  const handleRoleChange = async (userId: string, newRole: AppRoleEnum) => {
    if (newRole === 'super_admin' && currentRole !== 'super_admin') {
      toast.error('Only super admins can assign super admin role');
      return;
    }
    await supabase.from('user_roles').delete().eq('user_id', userId);
    const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole });
    if (error) { toast.error('Failed: ' + error.message); return; }
    if (user) await addAuditLog({ user_id: user.id, action: 'role_change', target_type: 'user', target_id: userId, details: { new_role: newRole } });
    toast.success('Role updated');
    loadData();
  };

  const handleDeptChange = async (userId: string, dept: DepartmentEnum) => {
    await supabase.from('profiles').update({ department: dept }).eq('id', userId);
    if (user) await addAuditLog({ user_id: user.id, action: 'dept_change', target_type: 'user', target_id: userId, details: { new_dept: dept } });
    toast.success('Department updated');
    loadData();
  };

  const handleManagerChange = async (userId: string, managerId: string | null) => {
    if (userId === managerId) {
      toast.error('A user cannot be their own manager');
      return;
    }

    await supabase.from('profiles').update({ manager_id: managerId }).eq('id', userId);
    if (user) {
      await addAuditLog({
        user_id: user.id,
        action: 'manager_change',
        target_type: 'user',
        target_id: userId,
        details: { manager_id: managerId },
      });
    }
    toast.success('Manager updated');
    loadData();
  };

  const handleSuspend = async (userId: string, suspend: boolean) => {
    const success = await suspendUser(userId, suspend);
    if (success) {
      if (user) await addAuditLog({ user_id: user.id, action: suspend ? 'user_suspended' : 'user_unsuspended', target_type: 'user', target_id: userId });
      toast.success(suspend ? 'User suspended' : 'User unsuspended');
      loadData();
    }
  };

  // ============ Department Handlers ============
  const openDeptDialog = (dept?: Department) => {
    setEditingDept(dept || null);
    setDeptName(dept?.name || '');
    setDeptDesc(dept?.description || '');
    setDeptDialogOpen(true);
  };

  const saveDept = async () => {
    if (!deptName.trim()) { toast.error('Name is required'); return; }
    if (editingDept) {
      await supabase.from('departments').update({ name: deptName.trim(), description: deptDesc.trim() || null }).eq('id', editingDept.id);
      toast.success('Department updated');
    } else {
      const { error } = await supabase.from('departments').insert({ name: deptName.trim(), description: deptDesc.trim() || null });
      if (error) { toast.error('Failed: ' + error.message); return; }
      toast.success('Department created');
    }
    setDeptDialogOpen(false);
    loadData();
  };

  const deleteDept = async (id: string) => {
    await supabase.from('departments').delete().eq('id', id);
    toast.success('Department deleted');
    loadData();
  };

  // ============ ROI Handlers ============
  const openROIDialog = (config?: ROIConfig) => {
    setEditingROI(config || null);
    setROIDeptId(config?.department_id || '');
    setROICategory(config?.category || '');
    setROIFormula(config?.formula || '');
    setROIWeight([config?.weight ?? 5]);
    setROITestInput('');
    setROITestResult(null);
    setROIDialogOpen(true);
  };

  const testROIFormula = () => {
    try {
      const input = parseFloat(roiTestInput);
      if (isNaN(input)) { setROITestResult('Invalid input'); return; }
      // Safe eval: only allow basic math with 'x' as variable
      const safeFormula = roiFormula.replace(/[^0-9x+\-*/().%\s]/g, '');
      const result = new Function('x', `return ${safeFormula}`)(input);
      setROITestResult(typeof result === 'number' ? result.toLocaleString() : 'Error');
    } catch {
      setROITestResult('Invalid formula');
    }
  };

  const saveROI = async () => {
    if (!roiCategory || !roiFormula.trim()) { toast.error('Category and formula are required'); return; }
    const payload = {
      department_id: roiDeptId || null,
      category: roiCategory,
      formula: roiFormula.trim(),
      weight: roiWeight[0],
    };
    if (editingROI) {
      await supabase.from('roi_configs').update(payload).eq('id', editingROI.id);
      toast.success('ROI config updated');
    } else {
      const { error } = await supabase.from('roi_configs').insert(payload);
      if (error) { toast.error('Failed: ' + error.message); return; }
      toast.success('ROI config created');
    }
    setROIDialogOpen(false);
    loadData();
  };

  const deleteROI = async (id: string) => {
    await supabase.from('roi_configs').delete().eq('id', id);
    toast.success('ROI config deleted');
    loadData();
  };

  // ============ Export ============
  const handleExportAuditCSV = () => {
    const headers = ['Timestamp', 'Action', 'Target Type', 'Target ID', 'User ID', 'Details'];
    const rows = auditLogs.map(l => [
      format(new Date(l.created_at), 'yyyy-MM-dd HH:mm:ss'), l.action, l.target_type || '', l.target_id || '', l.user_id || '', JSON.stringify(l.details || {}),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `prompt-intelligence-suite-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAccessReport = () => {
    const headers = ['User ID', 'Display Name', 'Role', 'Department', 'Manager', 'Suspended'];
    const rows = users.map(u => [u.id, u.display_name || '', u.role, u.department || '', u.manager_id || '', u.suspended ? 'Yes' : 'No']);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `prompt-intelligence-suite-access-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ============ Landing Content Handlers ============
  const saveContent = async () => {
    if (!editingContent) return;
    setContentSaving(true);
    if (editingContent.id) {
      await supabase.from('landing_content').update({ content: editingContent.content }).eq('id', editingContent.id);
    } else {
      await supabase.from('landing_content').insert({ section: editingContent.section, content: editingContent.content });
    }
    if (user) await addAuditLog({ user_id: user.id, action: 'content_update', target_type: 'landing_content', details: { section: editingContent.section } });
    toast.success('Content updated');
    setEditingContent(null);
    setContentSaving(false);
    loadData();
  };

  // ============ CSV User Import ============
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('CSV must have a header row and at least one data row'); return; }
      const header = lines[0].toLowerCase();
      if (!header.includes('email')) { toast.error('CSV must contain an "email" column'); return; }
      const cols = lines[0].split(',').map(c => c.trim().toLowerCase().replace(/"/g, ''));
      const emailIdx = cols.indexOf('email');
      const nameIdx = cols.indexOf('name') !== -1 ? cols.indexOf('name') : cols.indexOf('display_name');
      const roleIdx = cols.indexOf('role');
      const deptIdx = cols.indexOf('department');

      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
        const email = vals[emailIdx];
        if (!email || !email.includes('@')) continue;
        // Log the import attempt for admin review
        if (user) {
          await addAuditLog({
            user_id: user.id,
            action: 'csv_user_import',
            target_type: 'user',
            details: {
              email,
              name: nameIdx >= 0 ? vals[nameIdx] : undefined,
              role: roleIdx >= 0 ? vals[roleIdx] : undefined,
              department: deptIdx >= 0 ? vals[deptIdx] : undefined,
            },
          });
        }
        imported++;
      }
      toast.success(`Processed ${imported} user records. Users will appear after they sign up.`);
      e.target.value = '';
      loadData();
    };
    reader.readAsText(file);
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
      {/* Admin Sub-Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-card border border-border h-12">
          <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">User Roles</span>
            <span className="sm:hidden">Users</span>
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Departments</span>
            <span className="sm:hidden">Depts</span>
          </TabsTrigger>
          <TabsTrigger value="roi" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">ROI Settings</span>
            <span className="sm:hidden">ROI</span>
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Landing Content</span>
            <span className="sm:hidden">Content</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Audit Log</span>
            <span className="sm:hidden">Audit</span>
          </TabsTrigger>
        </TabsList>

        {/* ====== USER ROLES TAB ====== */}
        <TabsContent value="users" className="space-y-6 animate-fade-in-up">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />User Management</CardTitle>
                  <CardDescription>{users.length} registered users. Manager assignment drives approver routing while prompts remain in review.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                      <span><Plus className="h-3.5 w-3.5" />Import CSV</span>
                    </Button>
                  </label>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExportAccessReport}>
                    <Download className="h-3.5 w-3.5" />Access Report
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">ID</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(u => (
                      <TableRow key={u.id} className={u.suspended ? 'opacity-50' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{u.display_name || 'Unnamed'}</span>
                            {u.suspended && <Badge variant="destructive" className="text-[10px] h-4">Suspended</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground font-mono">{u.id.substring(0, 8)}…</TableCell>
                        <TableCell>
                          <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v as AppRoleEnum)}>
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map(r => (
                                <SelectItem key={r} value={r} disabled={r === 'super_admin' && currentRole !== 'super_admin'}>
                                  {ROLE_LABELS[r]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={u.department || 'Operations'} onValueChange={(v) => handleDeptChange(u.id, v as DepartmentEnum)}>
                            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {DEPTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={u.manager_id || 'none'} onValueChange={(v) => handleManagerChange(u.id, v === 'none' ? null : v)}>
                            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="No manager" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No manager</SelectItem>
                              {users
                                .filter((candidate) => candidate.id !== u.id)
                                .map((candidate) => (
                                  <SelectItem key={candidate.id} value={candidate.id}>
                                    {candidate.display_name || candidate.id.substring(0, 8)}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant={u.suspended ? 'outline' : 'ghost'}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleSuspend(u.id, !u.suspended)}
                            disabled={u.id === user?.id}
                          >
                            {u.suspended ? <CheckCircle className="h-4 w-4 text-status-green" /> : <Ban className="h-4 w-4 text-muted-foreground hover:text-destructive" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Compliance Summary</CardTitle>
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
        </TabsContent>

        {/* ====== DEPARTMENTS TAB ====== */}
        <TabsContent value="departments" className="animate-fade-in-up">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Departments</CardTitle>
                  <CardDescription>Manage organizational departments</CardDescription>
                </div>
                <Button size="sm" className="gap-1.5" onClick={() => openDeptDialog()}>
                  <Plus className="h-4 w-4" />Add Department
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="hidden sm:table-cell">Users</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No departments yet. Add one above.</TableCell>
                      </TableRow>
                    ) : departments.map(dept => (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">{dept.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{dept.description || '—'}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="secondary" className="text-xs">
                            {users.filter(u => u.department === dept.name).length}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openDeptDialog(dept)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteDept(dept.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Department Dialog */}
          <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDept ? 'Edit Department' : 'Add Department'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input placeholder="e.g., Engineering" value={deptName} onChange={e => setDeptName(e.target.value)} maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Optional description…" value={deptDesc} onChange={e => setDeptDesc(e.target.value)} maxLength={500} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeptDialogOpen(false)}>Cancel</Button>
                <Button onClick={saveDept}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ====== ROI SETTINGS TAB ====== */}
        <TabsContent value="roi" className="animate-fade-in-up">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />ROI Settings</CardTitle>
                  <CardDescription>Configure department-based ROI formulas and weights</CardDescription>
                </div>
                <Button size="sm" className="gap-1.5" onClick={() => openROIDialog()}>
                  <Plus className="h-4 w-4" />Add Config
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="hidden md:table-cell">Formula</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roiConfigs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No ROI configs. Add one above.</TableCell>
                      </TableRow>
                    ) : roiConfigs.map(cfg => {
                      const dept = departments.find(d => d.id === cfg.department_id);
                      return (
                        <TableRow key={cfg.id}>
                          <TableCell className="font-medium">{dept?.name || 'All'}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{cfg.category}</Badge></TableCell>
                          <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">{cfg.formula}</TableCell>
                          <TableCell className="font-mono text-sm">{cfg.weight ?? 1}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openROIDialog(cfg)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteROI(cfg.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* ROI Dialog */}
          <Dialog open={roiDialogOpen} onOpenChange={setROIDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingROI ? 'Edit ROI Config' : 'Add ROI Config'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={roiDeptId || '__all__'} onValueChange={v => setROIDeptId(v === '__all__' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Departments</SelectItem>
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={roiCategory} onValueChange={setROICategory}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {ROI_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Formula <span className="text-muted-foreground text-xs">(use 'x' as variable)</span></Label>
                  <Input placeholder="e.g., x * 50000" value={roiFormula} onChange={e => setROIFormula(e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Weight: {roiWeight[0]}</Label>
                  <Slider min={0} max={10} step={0.1} value={roiWeight} onValueChange={setROIWeight} />
                </div>
                <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/30">
                  <Label className="flex items-center gap-1.5"><Calculator className="h-3.5 w-3.5" />Preview Calculator</Label>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Test input (x)" value={roiTestInput} onChange={e => setROITestInput(e.target.value)} className="flex-1" />
                    <Button variant="outline" size="sm" onClick={testROIFormula}>Test</Button>
                  </div>
                  {roiTestResult !== null && (
                    <p className="text-sm font-mono">Result: <span className="text-primary font-semibold">{roiTestResult}</span></p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setROIDialogOpen(false)}>Cancel</Button>
                <Button onClick={saveROI}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ====== LANDING CONTENT TAB ====== */}
        <TabsContent value="content" className="animate-fade-in-up">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Landing Page Content</CardTitle>
              <CardDescription>Edit the T&C and Privacy content displayed on the public landing page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {['tandc', 'privacy'].map(section => {
                const existing = landingContent.find(c => c.section === section);
                const isEditing = editingContent?.section === section;
                return (
                  <div key={section} className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm capitalize">{section === 'tandc' ? 'Terms & Conditions' : 'Privacy Statement'}</h4>
                      {!isEditing && (
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setEditingContent({ section, content: existing?.content || '', id: existing?.id })}>
                          <Pencil className="h-3.5 w-3.5" />{existing ? 'Edit' : 'Create'}
                        </Button>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editingContent.content}
                          onChange={e => setEditingContent({ ...editingContent, content: e.target.value })}
                          rows={10}
                          placeholder="Enter content…"
                          className="font-mono text-sm"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => setEditingContent(null)}>Cancel</Button>
                          <Button size="sm" onClick={saveContent} disabled={contentSaving}>{contentSaving ? 'Saving…' : 'Save'}</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {existing ? `${existing.content.substring(0, 150)}…` : 'No content set. Using default placeholders.'}
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== AUDIT LOG TAB ====== */}
        <TabsContent value="audit" className="animate-fade-in-up">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Audit Log</CardTitle>
                  <CardDescription>{auditLogs.length} events</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExportAuditCSV}>
                  <Download className="h-3.5 w-3.5" />Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Filter actions..." value={auditSearch} onChange={e => setAuditSearch(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
              <ScrollArea className="max-h-80">
                {filteredLogs.length > 0 ? (
                  <div className="space-y-2">
                    {filteredLogs.map(log => (
                      <div key={log.id} className="flex items-center gap-3 text-sm border-b border-border/50 pb-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{log.action}</span>
                          {log.target_type && <span className="text-muted-foreground"> on {log.target_type}</span>}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
