import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { getAssets, getROIFacts, getDepartmentROIMatrix, getTotalEnterpriseValue, getVersionSnapshots, getSecurityStats, getAssetCountByDepartment, getAuditLogs, type DbPromptAsset, type DbROIFact } from '@/lib/supabase-store';
import { DEPARTMENTS, ROI_CATEGORIES, Department, ROICategory } from '@/lib/synphera-types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DollarSign, TrendingUp, GitBranch, Building2, Shield, Activity, AlertTriangle, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AnalyticsTabProps {
  refreshKey: number;
}

const DEPT_COLORS: Record<Department, string> = {
  'Operations': '#00DFD4', 'Legal': '#0088AA', 'R&D': '#6366F1', 'Marketing': '#EC4899',
  'Finance': '#10B981', 'HR': '#F59E0B', 'IT': '#8B5CF6', 'Executive': '#00233D',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#F59E0B', in_review: '#8B5CF6', approved: '#3B82F6', released: '#10B981',
};

export function AnalyticsTab({ refreshKey }: AnalyticsTabProps) {
  const [assets, setAssets] = useState<DbPromptAsset[]>([]);
  const [facts, setFacts] = useState<DbROIFact[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [roiMatrix, setRoiMatrix] = useState<Record<string, Record<string, number>>>({});
  const [versionCount, setVersionCount] = useState(0);
  const [securityStats, setSecurityStats] = useState({ green: 0, amber: 0, red: 0, pending: 0 });
  const [deptCounts, setDeptCounts] = useState<Record<string, number>>({});
  const [auditCount, setAuditCount] = useState(0);
  const [roiWeights, setRoiWeights] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [a, f, tv, rm, vs, logs] = await Promise.all([
        getAssets(), getROIFacts(), getTotalEnterpriseValue(), getDepartmentROIMatrix(), getVersionSnapshots(), getAuditLogs(500)
      ]);
      setAssets(a); setFacts(f); setTotalValue(tv); setRoiMatrix(rm); setVersionCount(vs.length);
      setSecurityStats(await getSecurityStats(a));
      setDeptCounts(await getAssetCountByDepartment(a));
      setAuditCount(logs.length);

      // Fetch ROI configs for weighted calculations
      const { data: configs } = await supabase.from('roi_configs').select('*');
      const { data: depts } = await supabase.from('departments').select('*');
      if (configs && depts) {
        const weights: Record<string, Record<string, number>> = {};
        configs.forEach(cfg => {
          const dept = depts.find(d => d.id === cfg.department_id);
          const deptName = dept?.name || '__global__';
          if (!weights[deptName]) weights[deptName] = {};
          weights[deptName][cfg.category] = cfg.weight ?? 1;
        });
        setRoiWeights(weights);
      }

      setLoading(false);
    })();
  }, [refreshKey]);

  const sunburstData = useMemo(() => {
    const deptGroups: Record<string, DbPromptAsset[]> = {};
    DEPARTMENTS.forEach(d => deptGroups[d] = []);
    assets.forEach(a => { if (deptGroups[a.department]) deptGroups[a.department].push(a); });
    
    const innerRing = DEPARTMENTS
      .filter(d => deptGroups[d].length > 0)
      .map(d => ({ name: d, value: deptGroups[d].length, fill: DEPT_COLORS[d] }));
    
    const outerRing = assets.map(a => ({
      name: a.title.length > 20 ? a.title.substring(0, 20) + '...' : a.title,
      fullTitle: a.title, value: 1,
      fill: DEPT_COLORS[a.department as Department] + (a.parent_id ? '99' : ''),
      department: a.department, version: a.version,
      hasChildren: assets.some(c => c.parent_id === a.id),
    }));
    
    return { innerRing, outerRing };
  }, [assets]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = { draft: 0, in_review: 0, approved: 0, released: 0 };
    assets.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });
    return [
      { name: 'Draft', value: counts.draft, fill: STATUS_COLORS.draft },
      { name: 'In Review', value: counts.in_review, fill: STATUS_COLORS.in_review },
      { name: 'Approved', value: counts.approved, fill: STATUS_COLORS.approved },
      { name: 'Released', value: counts.released, fill: STATUS_COLORS.released },
    ].filter(d => d.value > 0);
  }, [assets]);

  const deptTotals = useMemo(() => {
    return DEPARTMENTS.map(dept => {
      const weighted = ROI_CATEGORIES.reduce((sum, cat) => {
        const raw = roiMatrix[dept]?.[cat] || 0;
        const weight = roiWeights[dept]?.[cat] ?? roiWeights['__global__']?.[cat] ?? 1;
        return sum + (raw * weight);
      }, 0);
      const unweighted = ROI_CATEGORIES.reduce((sum, cat) => sum + (roiMatrix[dept]?.[cat] || 0), 0);
      return { dept, total: unweighted, weighted };
    }).sort((a, b) => b.weighted - a.weighted);
  }, [roiMatrix, roiWeights]);

  const maxDeptTotal = Math.max(...deptTotals.map(d => d.weighted), 1);
  const lockedCount = assets.filter(a => a.is_locked).length;
  const forkedCount = assets.filter(a => a.parent_id).length;

  // Department bar chart data
  const deptBarData = useMemo(() => 
    DEPARTMENTS.filter(d => deptCounts[d] > 0).map(d => ({
      name: d.length > 8 ? d.substring(0, 8) + '…' : d,
      fullName: d,
      count: deptCounts[d],
      fill: DEPT_COLORS[d],
    })), [deptCounts]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="metric-card">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="flex items-center gap-2 text-xs"><DollarSign className="h-3.5 w-3.5" />Enterprise Value</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary font-mono truncate">${totalValue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="metric-card">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="flex items-center gap-2 text-xs"><GitBranch className="h-3.5 w-3.5" />Total Assets</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground font-mono">{assets.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{forkedCount} forked • {lockedCount} locked</p>
          </CardContent>
        </Card>
        <Card className="metric-card">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="flex items-center gap-2 text-xs"><Activity className="h-3.5 w-3.5" />Versions</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground font-mono">{versionCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Avg {(versionCount / Math.max(assets.length, 1)).toFixed(1)}/asset</p>
          </CardContent>
        </Card>
        <Card className="metric-card">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="flex items-center gap-2 text-xs"><Shield className="h-3.5 w-3.5" />Security</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className="text-xs flex items-center gap-1"><CheckCircle className="h-3 w-3 text-status-green" />{securityStats.green}</span>
              <span className="text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-status-amber" />{securityStats.amber}</span>
              <span className="text-xs flex items-center gap-1"><XCircle className="h-3 w-3 text-status-red" />{securityStats.red}</span>
              <span className="text-xs flex items-center gap-1"><Clock className="h-3 w-3 text-muted-foreground" />{securityStats.pending}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="metric-card sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="flex items-center gap-2 text-xs"><Users className="h-3.5 w-3.5" />Audit Events</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground font-mono">{auditCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Total actions logged</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 grid-cols-1 lg:grid-cols-2">
        {/* Sunburst */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><GitBranch className="h-5 w-5 text-primary" />Asset Lineage Sunburst</CardTitle>
            <CardDescription className="text-xs">Inner ring: departments · Outer ring: individual assets</CardDescription>
          </CardHeader>
          <CardContent>
            {assets.length > 0 ? (
              <>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sunburstData.innerRing} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" stroke="hsl(var(--border))" strokeWidth={2}>
                        {sunburstData.innerRing.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Pie data={sunburstData.outerRing} cx="50%" cy="50%" innerRadius={85} outerRadius={120} dataKey="value" stroke="hsl(var(--border))" strokeWidth={1}>
                        {sunburstData.outerRing.map((entry, i) => <Cell key={i} fill={entry.fill} opacity={entry.hasChildren ? 1 : 0.7} />)}
                      </Pie>
                      <Tooltip content={({ payload }) => {
                        if (!payload?.[0]) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs">
                            <p className="font-semibold">{data.fullTitle || data.name}</p>
                            {data.department && <p className="text-muted-foreground">{data.department}</p>}
                            {data.version && <p className="text-muted-foreground">v{data.version}</p>}
                            <p className="text-primary">{data.value} {data.value === 1 ? 'asset' : 'assets'}</p>
                          </div>
                        );
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {DEPARTMENTS.filter(d => sunburstData.innerRing.some(t => t.name === d)).map(dept => (
                    <div key={dept} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DEPT_COLORS[dept] }} />
                      <span className="text-muted-foreground">{dept}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">No assets yet.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Department Bar Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-5 w-5 text-primary" />Assets by Department</CardTitle>
            </CardHeader>
            <CardContent>
              {deptBarData.length > 0 ? (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptBarData} layout="vertical" margin={{ left: 0, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={70} />
                      <Tooltip content={({ payload }) => {
                        if (!payload?.[0]) return null;
                        const d = payload[0].payload;
                        return <div className="rounded-lg border bg-card p-2 shadow text-xs"><p className="font-medium">{d.fullName}: {d.count} assets</p></div>;
                      }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {deptBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-4">No data.</p>}
            </CardContent>
          </Card>

          {/* Pipeline Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-5 w-5 text-primary" />Pipeline Status</CardTitle>
            </CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <div className="flex gap-4 items-center">
                  <div className="h-[120px] w-[120px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" stroke="hsl(var(--border))" strokeWidth={2}>
                          {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 flex-1">
                    {statusData.map(s => (
                      <div key={s.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.fill }} />
                          <span className="text-muted-foreground">{s.name}</span>
                        </div>
                        <span className="font-mono font-semibold">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-4">No data yet.</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ROI by Department */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-5 w-5 text-primary" />ROI by Department</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {deptTotals.filter(d => d.total > 0).map(({ dept, total, weighted }) => (
            <div key={dept} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-xs">{dept}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">${total.toLocaleString()}</span>
                  {weighted !== total && (
                    <span className="font-mono text-xs text-primary">(weighted: ${weighted.toLocaleString()})</span>
                  )}
                </div>
              </div>
              <Progress value={(weighted / maxDeptTotal) * 100} className="h-1.5" />
            </div>
          ))}
          {deptTotals.every(d => d.total === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">No ROI data yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Enterprise Value Bar */}
      <Card className="synphera-border-glow">
        <CardContent className="py-4">
          <div className="flex items-center justify-between fl3x-wrap gap-2">
            <div className="flex items-center gap-3">
              <DollarSign className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm font-medium">Total Enterprise Value Created</p>
                <p className="text-xs text-muted-foreground">{assets.length} assets · {facts.length} ROI facts quantified</p>
              </div>
            </div>
            <p className="text-3xl font-bold font-mono text-primary">${totalValue.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      {/* ROI Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><DollarSign className="h-5 w-5 text-primary" />ROI Matrix: Departments × Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2.5 px-3 text-left text-xs font-semibold text-muted-foreground">Department</th>
                  {ROI_CATEGORIES.map(cat => (
                    <th key={cat} className="py-2.5 px-3 text-right text-xs font-semibold text-muted-foreground">{cat}</th>
                  ))}
                  <th className="py-2.5 px-3 text-right text-xs font-semibold text-primary">Total</th>
                </tr>
              </thead>
              <tbody>
                {DEPARTMENTS.map(dept => {
                  const deptTotal = ROI_CATEGORIES.reduce((sum, cat) => sum + (roiMatrix[dept]?.[cat] || 0), 0);
                  if (deptTotal === 0) return null;
                  return (
                    <tr key={dept} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-sm">{dept}</td>
                      {ROI_CATEGORIES.map(cat => (
                        <td key={cat} className="py-2.5 px-3 roi-cell text-muted-foreground text-sm">
                          {(roiMatrix[dept]?.[cat] || 0) > 0 ? `$${(roiMatrix[dept][cat]).toLocaleString()}` : '—'}
                        </td>
                      ))}
                      <td className="py-2.5 px-3 roi-cell font-semibold text-primary text-sm">${deptTotal.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30">
                  <td className="py-2.5 px-3 font-semibold text-sm">Enterprise Total</td>
                  {ROI_CATEGORIES.map(cat => {
                    const catTotal = DEPARTMENTS.reduce((sum, dept) => sum + (roiMatrix[dept]?.[cat] || 0), 0);
                    return <td key={cat} className="py-2.5 px-3 roi-cell font-semibold text-muted-foreground text-sm">${catTotal.toLocaleString()}</td>;
                  })}
                  <td className="py-2.5 px-3 roi-cell font-bold text-primary text-lg">${totalValue.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
