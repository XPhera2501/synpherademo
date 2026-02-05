import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAssets, getROIFacts, getDepartmentROIMatrix, getTotalEnterpriseValue, getLineageTree } from '@/lib/synphera-store';
import { DEPARTMENTS, ROI_CATEGORIES, Department, ROICategory } from '@/lib/synphera-types';
import { Treemap, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { DollarSign, TrendingUp, GitBranch, Building2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AnalyticsTabProps {
  refreshKey: number;
}

// Department colors for visualization
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

export function AnalyticsTab({ refreshKey }: AnalyticsTabProps) {
  const [assets, setAssets] = useState(getAssets());
  const [facts, setFacts] = useState(getROIFacts());
  
  useEffect(() => {
    setAssets(getAssets());
    setFacts(getROIFacts());
  }, [refreshKey]);
  
  const roiMatrix = useMemo(() => getDepartmentROIMatrix(), [refreshKey]);
  const totalValue = useMemo(() => getTotalEnterpriseValue(), [refreshKey]);
  
  // Prepare treemap data for lineage visualization
  const treemapData = useMemo(() => {
    const deptCounts: Record<Department, number> = {} as any;
    DEPARTMENTS.forEach(d => deptCounts[d] = 0);
    
    assets.forEach(asset => {
      deptCounts[asset.department]++;
    });
    
    return DEPARTMENTS
      .filter(dept => deptCounts[dept] > 0)
      .map(dept => ({
        name: dept,
        value: deptCounts[dept],
        fill: DEPT_COLORS[dept],
      }));
  }, [assets]);
  
  // Calculate department ROI totals
  const deptTotals = useMemo(() => {
    return DEPARTMENTS.map(dept => ({
      dept,
      total: ROI_CATEGORIES.reduce((sum, cat) => sum + roiMatrix[dept][cat], 0),
    })).sort((a, b) => b.total - a.total);
  }, [roiMatrix]);
  
  const maxDeptTotal = Math.max(...deptTotals.map(d => d.total), 1);
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="metric-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Enterprise Value
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary font-mono">
              ${totalValue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card className="metric-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Total Assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground font-mono">
              {assets.length}
            </p>
          </CardContent>
        </Card>
        
        <Card className="metric-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Released Assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-status-green font-mono">
              {assets.filter(a => a.status === 'released').length}
            </p>
          </CardContent>
        </Card>
        
        <Card className="metric-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Active Departments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground font-mono">
              {new Set(assets.map(a => a.department)).size}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Treemap Visualization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              Asset Lineage by Department
            </CardTitle>
            <CardDescription>
              Visualization of asset distribution across departments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={treemapData}
                  dataKey="value"
                  stroke="#001929"
                >
                  {treemapData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
                          <p className="font-semibold">{data.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {data.value} assets
                          </p>
                        </div>
                      );
                    }}
                  />
                </Treemap>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {DEPARTMENTS.filter(d => treemapData.some(t => t.name === d)).map(dept => (
                <div key={dept} className="flex items-center gap-1.5 text-xs">
                  <div 
                    className="h-3 w-3 rounded"
                    style={{ backgroundColor: DEPT_COLORS[dept] }}
                  />
                  <span className="text-muted-foreground">{dept}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Department ROI Bars */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              ROI by Department
            </CardTitle>
            <CardDescription>
              Total quantified value contribution per department
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {deptTotals.filter(d => d.total > 0).map(({ dept, total }) => (
              <div key={dept} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{dept}</span>
                  <span className="font-mono text-primary">
                    ${total.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={(total / maxDeptTotal) * 100} 
                  className="h-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      
      {/* ROI Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            ROI Matrix: Departments × Value Categories
          </CardTitle>
          <CardDescription>
            Comprehensive breakdown of quantified value by department and ROI category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 px-4 text-left text-sm font-semibold text-muted-foreground">
                    Department
                  </th>
                  {ROI_CATEGORIES.map(cat => (
                    <th key={cat} className="py-3 px-4 text-right text-sm font-semibold text-muted-foreground">
                      {cat}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right text-sm font-semibold text-primary">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {DEPARTMENTS.map(dept => {
                  const deptTotal = ROI_CATEGORIES.reduce((sum, cat) => sum + roiMatrix[dept][cat], 0);
                  if (deptTotal === 0) return null;
                  
                  return (
                    <tr key={dept} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium">{dept}</td>
                      {ROI_CATEGORIES.map(cat => (
                        <td key={cat} className="py-3 px-4 roi-cell text-muted-foreground">
                          {roiMatrix[dept][cat] > 0 
                            ? `$${roiMatrix[dept][cat].toLocaleString()}`
                            : '—'
                          }
                        </td>
                      ))}
                      <td className="py-3 px-4 roi-cell font-semibold text-primary">
                        ${deptTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30">
                  <td className="py-3 px-4 font-semibold">Enterprise Total</td>
                  {ROI_CATEGORIES.map(cat => {
                    const catTotal = DEPARTMENTS.reduce((sum, dept) => sum + roiMatrix[dept][cat], 0);
                    return (
                      <td key={cat} className="py-3 px-4 roi-cell font-semibold text-muted-foreground">
                        ${catTotal.toLocaleString()}
                      </td>
                    );
                  })}
                  <td className="py-3 px-4 roi-cell font-bold text-primary text-lg">
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