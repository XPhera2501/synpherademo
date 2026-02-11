import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAssets, getROIFacts, getDepartmentROIMatrix, getTotalEnterpriseValue, getLineageTree, getVersionSnapshots } from '@/lib/synphera-store';
import { DEPARTMENTS, ROI_CATEGORIES, Department, ROICategory, PromptAsset } from '@/lib/synphera-types';
import { Treemap, ResponsiveContainer, Cell, Tooltip, PieChart, Pie } from 'recharts';
import { DollarSign, TrendingUp, GitBranch, Building2, Shield, Clock, Lock, Activity } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AnalyticsTabProps {
  refreshKey: number;
}

const DEPT_COLORS: Record<Department, string> = {
  'Operations': '#00DFD4',
  'Legal': '#0088AA',
  'R&D': '#6366F1',
  'Marketing': '#EC4899',
  'Finance': '#10B981',
  'HR': '#F59E0B',
  'IT': '#8B5CF6',
  'Executive': '#00233D',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#F59E0B',
  pending_review: '#8B5CF6',
  released: '#10B981',
};

export function AnalyticsTab({ refreshKey }: AnalyticsTabProps) {
  const [assets, setAssets] = useState(getAssets());
  const [facts, setFacts] = useState(getROIFacts());
  
  useEffect(() => {
    setAssets(getAssets());
    setFacts(getROIFacts());
  }, [refreshKey]);
  
  const roiMatrix = useMemo(() => getDepartmentROIMatrix(), [refreshKey]);
  const totalValue = useMemo(() => getTotalEnterpriseValue(), [refreshKey]);
  const allVersions = useMemo(() => getVersionSnapshots(), [refreshKey]);
  
  // Sunburst-style data: nested pie chart
  const sunburstData = useMemo(() => {
    // Outer ring: individual assets grouped by dept
    const deptGroups: Record<Department, PromptAsset[]> = {} as any;
    DEPARTMENTS.forEach(d => deptGroups[d] = []);
    assets.forEach(a => deptGroups[a.department].push(a));
    
    // Inner ring: departments
    const innerRing = DEPARTMENTS
      .filter(d => deptGroups[d].length > 0)
      .map(d => ({
        name: d,
        value: deptGroups[d].length,
        fill: DEPT_COLORS[d],
      }));
    
    // Outer ring: assets colored by parent dept
    const outerRing = assets.map(a => ({
      name: a.title.length > 20 ? a.title.substring(0, 20) + '...' : a.title,
      fullTitle: a.title,
      value: 1,
      fill: DEPT_COLORS[a.department] + (a.parentId ? '99' : ''),
      department: a.department,
      version: a.version,
      hasChildren: assets.some(c => c.parentId === a.id),
    }));
    
    return { innerRing, outerRing };
  }, [assets]);
  
  // Status distribution
  const statusData = useMemo(() => {
    const counts = { draft: 0, pending_review: 0, released: 0 };
    assets.forEach(a => counts[a.status]++);
    return [
      { name: 'Draft', value: counts.draft, fill: STATUS_COLORS.draft },
      { name: 'In Review', value: counts.pending_review, fill: STATUS_COLORS.pending_review },
      { name: 'Released', value: counts.released, fill: STATUS_COLORS.released },
    ].filter(d => d.value > 0);
  }, [assets]);
  
  const treemapData = useMemo(() => {
    const deptCounts: Record<Department, number> = {} as any;
    DEPARTMENTS.forEach(d => deptCounts[d] = 0);
    assets.forEach(asset => deptCounts[asset.department]++);
    return DEPARTMENTS
      .filter(dept => deptCounts[dept] > 0)
      .map(dept => ({ name: dept, value: deptCounts[dept], fill: DEPT_COLORS[dept] }));
  }, [assets]);
  
  const deptTotals = useMemo(() => {
    return DEPARTMENTS.map(dept => ({
      dept,
      total: ROI_CATEGORIES.reduce((sum, cat) => sum + roiMatrix[dept][cat], 0),
    })).sort((a, b) => b.total - a.total);
  }, [roiMatrix]);
  
  const maxDeptTotal = Math.max(...deptTotals.map(d => d.total), 1);
  const lockedCount = assets.filter(a => a.isLocked).length;
  const forkedCount = assets.filter(a => a.parentId).length;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="metric-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs">
              <DollarSign className="h-3.5 w-3.5" />
              Enterprise Value
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl lg:text-3xl font-bold text-primary font-mono">
              ${totalValue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card className="metric-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs">
              <GitBranch className="h-3.5 w-3.5" />
              Total Assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl lg:text-3xl font-bold text-foreground font-mono">
              {assets.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {forkedCount} forked • {lockedCount} locked
            </p>
          </CardContent>
        </Card>
        
        <Card className="metric-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs">
              <Activity className="h-3.5 w-3.5" />
              Version Snapshots
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl lg:text-3xl font-bold text-foreground font-mono">
              {allVersions.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Avg {(allVersions.length / Math.max(assets.length, 1)).toFixed(1)} per asset
            </p>
          </CardContent>
        </Card>
        
        <Card className="metric-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs">
              <Building2 className="h-3.5 w-3.5" />
              Departments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl lg:text-3xl font-bold text-foreground font-mono">
              {new Set(assets.map(a => a.department)).size}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              of {DEPARTMENTS.length} total
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sunburst-style Lineage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitBranch className="h-5 w-5 text-primary" />
              Asset Lineage Sunburst
            </CardTitle>
            <CardDescription className="text-xs">
              Inner ring: departments · Outer ring: individual assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {/* Inner ring - departments */}
                  <Pie
                    data={sunburstData.innerRing}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="value"
                    stroke="hsl(213 100% 12%)"
                    strokeWidth={2}
                  >
                    {sunburstData.innerRing.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  {/* Outer ring - assets */}
                  <Pie
                    data={sunburstData.outerRing}
                    cx="50%"
                    cy="50%"
                    innerRadius={85}
                    outerRadius={120}
                    dataKey="value"
                    stroke="hsl(213 100% 12%)"
                    strokeWidth={1}
                  >
                    {sunburstData.outerRing.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} opacity={entry.hasChildren ? 1 : 0.7} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ payload }) => {
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
                    }}
                  />
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
          </CardContent>
        </Card>
        
        {/* Department ROI + Status */}
        <div className="space-y-6">
          {/* Status Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5 text-primary" />
                Pipeline Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center">
                <div className="h-[120px] w-[120px] flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        dataKey="value"
                        stroke="hsl(213 100% 12%)"
                        strokeWidth={2}
                      >
                        {statusData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
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
            </CardContent>
          </Card>
          
          {/* ROI Bars */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-primary" />
                ROI by Department
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {deptTotals.filter(d => d.total > 0).map(({ dept, total }) => (
                <div key={dept} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-xs">{dept}</span>
                    <span className="font-mono text-xs text-primary">${total.toLocaleString()}</span>
                  </div>
                  <Progress value={(total / maxDeptTotal) * 100} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Enterprise Value Bar */}
      <Card className="synphera-border-glow">
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <DollarSign className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm font-medium">Total Enterprise Value Created</p>
                <p className="text-xs text-muted-foreground">{assets.length} assets · {facts.length} ROI facts quantified</p>
              </div>
            </div>
            <p className="text-3xl font-bold font-mono text-primary">
              ${totalValue.toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* ROI Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5 text-primary" />
            ROI Matrix: Departments × Categories
          </CardTitle>
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
                  const deptTotal = ROI_CATEGORIES.reduce((sum, cat) => sum + roiMatrix[dept][cat], 0);
                  if (deptTotal === 0) return null;
                  return (
                    <tr key={dept} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-sm">{dept}</td>
                      {ROI_CATEGORIES.map(cat => (
                        <td key={cat} className="py-2.5 px-3 roi-cell text-muted-foreground text-sm">
                          {roiMatrix[dept][cat] > 0 ? `$${roiMatrix[dept][cat].toLocaleString()}` : '—'}
                        </td>
                      ))}
                      <td className="py-2.5 px-3 roi-cell font-semibold text-primary text-sm">
                        ${deptTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30">
                  <td className="py-2.5 px-3 font-semibold text-sm">Enterprise Total</td>
                  {ROI_CATEGORIES.map(cat => {
                    const catTotal = DEPARTMENTS.reduce((sum, dept) => sum + roiMatrix[dept][cat], 0);
                    return (
                      <td key={cat} className="py-2.5 px-3 roi-cell font-semibold text-muted-foreground text-sm">
                        ${catTotal.toLocaleString()}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-3 roi-cell font-bold text-primary text-lg">
                    ${totalValue.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
