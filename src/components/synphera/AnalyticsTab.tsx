import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAssets, getROIFacts, getAssetCountByDepartment, getAuditLogs, type DbPromptAsset, type DbROIFact, type DbAuditLog } from '@/lib/supabase-store';
import { extractSavedBusinessOutcome, type BusinessOutcomeCategory } from '@/lib/business-outcome-analyzer';
import { DEPARTMENTS, ROI_CATEGORIES, Department, ROICategory } from '@/lib/synphera-types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { BarChart3, DollarSign, Building2, Shield, Activity } from 'lucide-react';

interface AnalyticsTabProps {
  refreshKey: number;
}

const DEPT_COLORS: Record<Department, string> = {
  'Operations': '#00DFD4', 'Legal': '#0088AA', 'R&D': '#6366F1', 'Marketing': '#EC4899',
  'Finance': '#10B981', 'HR': '#F59E0B', 'IT': '#8B5CF6', 'Executive': '#00233D',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#F59E0B', created: '#3B82F6', in_review: '#8B5CF6', approved: '#10B981',
};

const ROI_CATEGORY_COLORS: Record<ROICategory, string> = {
  'Time Savings': '#00DFD4',
  'Risk Mitigation': '#6366F1',
  'Efficiency': '#10B981',
  'Cost Savings': '#F59E0B',
  'New Value': '#EC4899',
};

const OUTCOME_COLORS: Record<BusinessOutcomeCategory, string> = {
  'Cost Savings': '#F59E0B',
  'Compliance Improvement': '#6366F1',
  'Operational Velocity Improvement': '#00DFD4',
  'Risk Level Reduction': '#EF4444',
  'Revenue Increase': '#EC4899',
};

function getMonthKey(dateValue: string) {
  const date = new Date(dateValue);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  });
}

export function AnalyticsTab({ refreshKey }: AnalyticsTabProps) {
  const [assets, setAssets] = useState<DbPromptAsset[]>([]);
  const [facts, setFacts] = useState<DbROIFact[]>([]);
  const [deptCounts, setDeptCounts] = useState<Record<string, number>>({});
  const [auditLogs, setAuditLogs] = useState<DbAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [a, f, logs] = await Promise.all([
        getAssets(), getROIFacts(), getAuditLogs(1000)
      ]);
      setAssets(a); setFacts(f); setAuditLogs(logs);
      setDeptCounts(await getAssetCountByDepartment(a));

      setLoading(false);
    })();
  }, [refreshKey]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = { draft: 0, created: 0, in_review: 0, approved: 0 };
    assets.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });
    return [
      { name: 'Draft', value: counts.draft, fill: STATUS_COLORS.draft },
      { name: 'Created', value: counts.created, fill: STATUS_COLORS.created },
      { name: 'In Review', value: counts.in_review, fill: STATUS_COLORS.in_review },
      { name: 'Approved', value: counts.approved, fill: STATUS_COLORS.approved },
    ].filter(d => d.value > 0);
  }, [assets]);

  const visibleDepartments = useMemo(
    () => DEPARTMENTS.filter((department) => (deptCounts[department] || 0) > 0),
    [deptCounts],
  );

  // Department bar chart data
  const deptBarData = useMemo(() => 
    visibleDepartments.map(d => ({
      name: d,
      fullName: d,
      count: deptCounts[d],
      fill: DEPT_COLORS[d],
    })), [deptCounts, visibleDepartments]);

  const primaryBenefitByAsset = useMemo(() => {
    const factsByAsset = new Map<string, DbROIFact[]>();

    facts.forEach((fact) => {
      const existing = factsByAsset.get(fact.asset_id) || [];
      existing.push(fact);
      factsByAsset.set(fact.asset_id, existing);
    });

    const primaryMap = new Map<string, ROICategory | null>();

    assets.forEach((asset) => {
      const assetFacts = factsByAsset.get(asset.id) || [];
      const primaryFact = assetFacts
        .filter((fact) => ROI_CATEGORIES.includes(fact.category as ROICategory))
        .sort((left, right) => Math.abs(Number(right.value)) - Math.abs(Number(left.value)))[0];

      primaryMap.set(asset.id, primaryFact ? (primaryFact.category as ROICategory) : null);
    });

    return primaryMap;
  }, [assets, facts]);

  const catalogueVelocityData = useMemo(() => {
    if (assets.length === 0) {
      return [];
    }

    const latestAssetDate = assets.reduce((latest, asset) => {
      const assetDate = new Date(asset.created_at);
      return assetDate > latest ? assetDate : latest;
    }, new Date(assets[0].created_at));

    const monthKeys = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(latestAssetDate.getFullYear(), latestAssetDate.getMonth() - (5 - index), 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    });

    const rows = monthKeys.map((monthKey) => ({
      month: formatMonthLabel(monthKey),
      monthKey,
      total: 0,
      ...Object.fromEntries(ROI_CATEGORIES.map((category) => [category, 0])),
    })) as Array<{ month: string; monthKey: string; total: number } & Record<ROICategory, number>>;

    const rowMap = new Map(rows.map((row) => [row.monthKey, row]));

    assets.forEach((asset) => {
      const monthKey = getMonthKey(asset.created_at);
      const row = rowMap.get(monthKey);
      if (!row) {
        return;
      }

      row.total += 1;

      const primaryBenefit = primaryBenefitByAsset.get(asset.id);
      if (primaryBenefit) {
        row[primaryBenefit] += 1;
      }
    });

    return rows;
  }, [assets, primaryBenefitByAsset]);

  const engagementData = useMemo(() => {
    const assetDepartmentMap = new Map(assets.map((asset) => [asset.id, asset.department]));
    const approvedCountByDepartment = Object.fromEntries(
      visibleDepartments.map((department) => [department, 0]),
    ) as Record<Department, number>;

    assets.forEach((asset) => {
      if (asset.status === 'approved' && approvedCountByDepartment[asset.department] !== undefined) {
        approvedCountByDepartment[asset.department] += 1;
      }
    });

    const executeLogs = auditLogs.filter((log) => log.action === 'execute_prompt' && !!log.target_id);
    const actualReuseCounts = Object.fromEntries(
      visibleDepartments.map((department) => [department, 0]),
    ) as Record<Department, number>;

    executeLogs.forEach((log) => {
      const department = assetDepartmentMap.get(log.target_id as string) as Department | undefined;
      if (department && actualReuseCounts[department] !== undefined) {
        actualReuseCounts[department] += 1;
      }
    });

    const hasActualReuses = executeLogs.length > 0;

    return visibleDepartments.map((department) => ({
      department,
      assets: deptCounts[department] || 0,
      reuses: hasActualReuses ? actualReuseCounts[department] : approvedCountByDepartment[department] * 3,
    }));
  }, [assets, auditLogs, deptCounts, visibleDepartments]);

  const benefitPromptMatrix = useMemo(() => {
    const assetDepartmentMap = new Map(assets.map((asset) => [asset.id, asset.department]));
    const matrix = Object.fromEntries(
      DEPARTMENTS.map((department) => [
        department,
        Object.fromEntries(ROI_CATEGORIES.map((category) => [category, new Set<string>()])),
      ]),
    ) as Record<Department, Record<ROICategory, Set<string>>>;

    facts.forEach((fact) => {
      const department = assetDepartmentMap.get(fact.asset_id) as Department | undefined;
      const category = fact.category as ROICategory;

      if (!department || !ROI_CATEGORIES.includes(category)) {
        return;
      }

      matrix[department][category].add(fact.asset_id);
    });

    const deptTotals = Object.fromEntries(
      visibleDepartments.map((department) => [
        department,
        ROI_CATEGORIES.reduce((sum, category) => sum + matrix[department][category].size, 0),
      ]),
    ) as Record<Department, number>;

    const categoryTotals = Object.fromEntries(
      ROI_CATEGORIES.map((category) => [
        category,
        visibleDepartments.reduce((sum, department) => sum + matrix[department][category].size, 0),
      ]),
    ) as Record<ROICategory, number>;

    return {
      matrix,
      deptTotals,
      categoryTotals,
      grandTotal: Object.values(categoryTotals).reduce((sum, value) => sum + value, 0),
    };
  }, [assets, facts, visibleDepartments]);

  const savedOutcomeData = useMemo(() => {
    const rows = new Map<BusinessOutcomeCategory, { outcome: BusinessOutcomeCategory; assets: number; averageConfidence: number; fill: string }>();
    let classifiedAssets = 0;

    assets.forEach((asset) => {
      const semanticClassification = extractSavedBusinessOutcome(asset.metadata);
      if (!semanticClassification || semanticClassification.primaryBenefit === 'Unclassified') {
        return;
      }

      classifiedAssets += 1;
      const outcome = semanticClassification.primaryBenefit as BusinessOutcomeCategory;
      const current = rows.get(outcome) || {
        outcome,
        assets: 0,
        averageConfidence: 0,
        fill: OUTCOME_COLORS[outcome],
      };

      current.assets += 1;
      current.averageConfidence += semanticClassification.primaryConfidence;
      rows.set(outcome, current);
    });

    const distribution = Array.from(rows.values())
      .map((row) => ({
        ...row,
        averageConfidence: row.assets > 0 ? row.averageConfidence / row.assets : 0,
      }))
      .sort((left, right) => right.assets - left.assets);

    return {
      classifiedAssets,
      totalAssets: assets.length,
      distribution,
    };
  }, [assets]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 grid-cols-1 grid-cols-1 grid-cols-1 lg:grid-cols-2">
        {/* Catalogue Velocity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-5 w-5 text-primary" />Catalogue Velocity</CardTitle>
            <CardDescription className="text-xs">Monthly prompt creation volume for the last six months, colour-coded by primary benefit category.</CardDescription>
          </CardHeader>
          <CardContent>
            {catalogueVelocityData.length > 0 ? (
              <>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={catalogueVelocityData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Tooltip content={({ payload }) => {
                        if (!payload?.[0]) return null;
                        const data = payload[0].payload as { month: string; total: number } & Record<ROICategory, number>;
                        return (
                          <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs">
                            <p className="font-semibold">{data.month}</p>
                            <p className="text-muted-foreground">{data.total} prompt{data.total === 1 ? '' : 's'} created</p>
                            <div className="mt-2 space-y-1">
                              {ROI_CATEGORIES.map((category) => (
                                <div key={category} className="flex items-center justify-between gap-4">
                                  <span>{category}</span>
                                  <span className="font-medium">{data[category] || 0}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }} />
                      {ROI_CATEGORIES.map((category) => (
                        <Bar
                          key={category}
                          dataKey={category}
                          stackId="velocity"
                          fill={ROI_CATEGORY_COLORS[category]}
                          radius={category === ROI_CATEGORIES[ROI_CATEGORIES.length - 1] ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ROI_CATEGORIES.map((category) => (
                    <div key={category} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ROI_CATEGORY_COLORS[category] }} />
                      <span className="text-muted-foreground">{category}</span>
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
              <CardDescription className="text-xs">Only departments with created assets are shown.</CardDescription>
            </CardHeader>
            <CardContent>
              {deptBarData.length > 0 ? (
                <>
                  <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptBarData} layout="vertical" margin={{ left: 0, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={92} />
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
                  <div className="mt-3 flex flex-wrap gap-3">
                    {deptBarData.map((department) => (
                      <div key={department.fullName} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: department.fill }} />
                        <span>{department.fullName}</span>
                      </div>
                    ))}
                  </div>
                </>
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

      {/* Asset Engagement Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-5 w-5 text-primary" />Asset Engagement Overview</CardTitle>
          <CardDescription className="text-xs">Compares asset volume by department against prompt reuse activity from execute clicks.</CardDescription>
        </CardHeader>
        <CardContent>
          {engagementData.length > 0 ? (
            <>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={engagementData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="department" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Tooltip content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const data = payload[0].payload as { department: string; assets: number; reuses: number };
                      return (
                        <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs">
                          <p className="font-semibold">{data.department}</p>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span>Assets</span>
                              <span className="font-medium">{data.assets}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span>Reuses</span>
                              <span className="font-medium">{data.reuses}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }} />
                    <Bar dataKey="assets" name="Assets" fill="#00DFD4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="reuses" name="Reuses" fill="#EC4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Reuses are based on execute clicks. When no clicks are logged yet, demo data falls back to 3x approved assets by department.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No engagement data yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-5 w-5 text-primary" />Saved Semantic Classification</CardTitle>
          <CardDescription className="text-xs">Distribution of the primary business outcomes saved with prompt metadata.</CardDescription>
        </CardHeader>
        <CardContent>
          {savedOutcomeData.distribution.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={savedOutcomeData.distribution} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="outcome" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} interval={0} angle={-12} textAnchor="end" height={58} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const data = payload[0].payload as { outcome: string; assets: number; averageConfidence: number };
                      return (
                        <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs">
                          <p className="font-semibold">{data.outcome}</p>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span>Assets</span>
                              <span className="font-medium">{data.assets}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span>Avg confidence</span>
                              <span className="font-medium">{(data.averageConfidence * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    }} />
                    <Bar dataKey="assets" radius={[4, 4, 0, 0]}>
                      {savedOutcomeData.distribution.map((entry) => <Cell key={entry.outcome} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Coverage</p>
                  <p className="mt-1 text-2xl font-semibold">{savedOutcomeData.classifiedAssets} / {savedOutcomeData.totalAssets}</p>
                  <p className="text-xs text-muted-foreground">Assets with saved semantic classifications</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {savedOutcomeData.distribution.map((entry) => (
                    <Badge key={entry.outcome} variant="outline" className="text-[10px]">
                      {entry.outcome}: {(entry.averageConfidence * 100).toFixed(0)}%
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No saved semantic classifications yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Benefit Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><DollarSign className="h-5 w-5 text-primary" />Benefit Matrix by Categories</CardTitle>
          <CardDescription className="text-xs">Shows benefit entries using the same categories as the create screen. Only departments with created prompts are included.</CardDescription>
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
                {visibleDepartments.map(dept => {
                  const deptTotal = benefitPromptMatrix.deptTotals[dept];
                  if (deptTotal === 0) return null;
                  return (
                    <tr key={dept} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-sm">{dept}</td>
                      {ROI_CATEGORIES.map(cat => (
                        <td key={cat} className="py-2.5 px-3 roi-cell text-muted-foreground text-sm">
                          {benefitPromptMatrix.matrix[dept][cat].size > 0 ? benefitPromptMatrix.matrix[dept][cat].size.toLocaleString() : '—'}
                        </td>
                      ))}
                      <td className="py-2.5 px-3 roi-cell font-semibold text-primary text-sm">{deptTotal.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30">
                  <td className="py-2.5 px-3 font-semibold text-sm">Total</td>
                  {ROI_CATEGORIES.map(cat => {
                    const catTotal = benefitPromptMatrix.categoryTotals[cat];
                    return <td key={cat} className="py-2.5 px-3 roi-cell font-semibold text-muted-foreground text-sm">{catTotal.toLocaleString()}</td>;
                  })}
                  <td className="py-2.5 px-3 roi-cell font-bold text-primary text-lg">{benefitPromptMatrix.grandTotal.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
