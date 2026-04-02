import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAssets, getROIFacts, getAssetCountByDepartment, getApprovedAssetCountByDepartment, getAssetCountByStatus, getAuditLogs, getHeaderMetrics, type DbPromptAsset, type DbROIFact, type DbAuditLog, type HeaderMetrics, type AssetStatusCounts } from '@/lib/supabase-store';
import { DEPARTMENTS, ROI_CATEGORIES, Department, ROICategory } from '@/lib/synphera-types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { BarChart3, Boxes, CalendarDays, DollarSign, Building2, Shield, Activity, PlayCircle, Users } from 'lucide-react';

interface AnalyticsTabProps {
  refreshKey: number;
}

const DEPT_COLORS: Record<Department, string> = {
  'Operations': '#00DFD4', 'Legal': '#0088AA', 'R&D': '#6366F1', 'Marketing': '#EC4899',
  'Finance': '#10B981', 'HR': '#F59E0B', 'IT': '#8B5CF6', 'Executive': '#00233D',
  'Procurement': '#F97316', 'Sales': '#06B6D4',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#F59E0B', created: '#3B82F6', in_review: '#8B5CF6', approved: '#10B981',
};

const ROI_CATEGORY_COLORS: Record<ROICategory, string> = {
  'Cost Savings': '#F59E0B',
  'Compliance Improvement': '#6366F1',
  'Operational Velocity Improvement': '#00DFD4',
  'Risk Level Reduction': '#EF4444',
  'Revenue Increase': '#EC4899',
};

const EMPTY_METRICS: HeaderMetrics = {
  totalAssets: 0,
  assetsCreatedLastMonth: 0,
  assetsInUse: 0,
  activeUsers: 0,
  registeredUsers: 0,
};

const EMPTY_STATUS_COUNTS: AssetStatusCounts = {
  draft: 0,
  created: 0,
  in_review: 0,
  approved: 0,
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

function formatBenefitCategoryLabel(category: ROICategory) {
  switch (category) {
    case 'Operational Velocity Improvement':
      return 'Op. Velocity';
    case 'Risk Level Reduction':
      return 'Risk Reduction';
    case 'Revenue Increase':
      return 'Revenue';
    default:
      return category;
  }
}

export function AnalyticsTab({ refreshKey }: AnalyticsTabProps) {
  const [assets, setAssets] = useState<DbPromptAsset[]>([]);
  const [facts, setFacts] = useState<DbROIFact[]>([]);
  const [deptCounts, setDeptCounts] = useState<Record<string, number>>({});
  const [approvedDeptCounts, setApprovedDeptCounts] = useState<Record<string, number>>({});
  const [statusCounts, setStatusCounts] = useState<AssetStatusCounts>(EMPTY_STATUS_COUNTS);
  const [auditLogs, setAuditLogs] = useState<DbAuditLog[]>([]);
  const [metrics, setMetrics] = useState<HeaderMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [a, f, logs, headerMetrics, departmentCounts, approvedDepartmentCounts, pipelineCounts] = await Promise.all([
        getAssets(), getROIFacts(), getAuditLogs(1000), getHeaderMetrics(), getAssetCountByDepartment(), getApprovedAssetCountByDepartment(), getAssetCountByStatus()
      ]);
      setAssets(a); setFacts(f); setAuditLogs(logs);
      setMetrics(headerMetrics);
      setDeptCounts(departmentCounts);
      setApprovedDeptCounts(approvedDepartmentCounts);
      setStatusCounts(pipelineCounts);

      setLoading(false);
    })();
  }, [refreshKey]);

  const statusData = useMemo(() => {
    return [
      { name: 'Draft', value: statusCounts.draft, fill: STATUS_COLORS.draft },
      { name: 'Created', value: statusCounts.created, fill: STATUS_COLORS.created },
      { name: 'In Review', value: statusCounts.in_review, fill: STATUS_COLORS.in_review },
      { name: 'Approved', value: statusCounts.approved, fill: STATUS_COLORS.approved },
    ].filter(d => d.value > 0);
  }, [statusCounts]);

  const visibleDepartments = useMemo(
    () => DEPARTMENTS.filter((department) => (deptCounts[department] || 0) > 0),
    [deptCounts],
  );

    // Department bar chart data
  const deptBarData = useMemo(() => 
      visibleDepartments.map(d => ({
      name: d,
      fullName: d,
      count: deptCounts[d] || 0,
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
      approvedPrompts: approvedDeptCounts[department] || 0,
      reuses: hasActualReuses ? actualReuseCounts[department] : (approvedDeptCounts[department] || 0) * 3,
    }));
  }, [assets, auditLogs, approvedDeptCounts, visibleDepartments]);

  const benefitCategoryByDepartmentData = useMemo(() => {
    const rows = visibleDepartments.map((department) => {
      const counts = Object.fromEntries(
        ROI_CATEGORIES.map((category) => [category, 0]),
      ) as Record<ROICategory, number>;

      assets.forEach((asset) => {
        if (asset.department !== department) {
          return;
        }

        const primaryBenefit = primaryBenefitByAsset.get(asset.id);
        if (!primaryBenefit) {
          return;
        }

        counts[primaryBenefit] += 1;
      });

      const total = ROI_CATEGORIES.reduce((sum, category) => sum + counts[category], 0);

      return {
        department,
        total,
        ...counts,
      };
    }).filter((row) => row.total > 0);

    const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

    return {
      rows,
      grandTotal,
    };
  }, [assets, primaryBenefitByAsset, visibleDepartments]);

  const benefitCategoryData = useMemo(() => {
    const counts = new Map<ROICategory, number>();

    assets.forEach((asset) => {
      const primaryBenefit = primaryBenefitByAsset.get(asset.id);
      if (!primaryBenefit) {
        return;
      }

      counts.set(primaryBenefit, (counts.get(primaryBenefit) || 0) + 1);
    });

    const distribution = ROI_CATEGORIES
      .map((category) => ({
        category,
        prompts: counts.get(category) || 0,
        fill: ROI_CATEGORY_COLORS[category],
      }))
      .filter((entry) => entry.prompts > 0)
      .sort((left, right) => right.prompts - left.prompts);

    return {
      categorizedPrompts: distribution.reduce((sum, entry) => sum + entry.prompts, 0),
      totalPrompts: assets.length,
      distribution,
    };
  }, [assets, primaryBenefitByAsset]);

  const summaryStats = [
    {
      label: 'Total Assets',
      value: metrics.totalAssets.toLocaleString(),
      detail: 'All prompt assets',
      icon: Boxes,
    },
    {
      label: 'Created Last Month',
      value: metrics.assetsCreatedLastMonth.toLocaleString(),
      detail: 'Previous calendar month',
      icon: CalendarDays,
    },
    {
      label: 'Assets In Use',
      value: metrics.assetsInUse.toLocaleString(),
      detail: 'Execute clicks on validated prompts',
      icon: PlayCircle,
    },
    {
      label: 'Active Creators',
      value: `${metrics.activeUsers.toLocaleString()} / ${metrics.registeredUsers.toLocaleString()}`,
      detail: 'Active creators / registered creators',
      icon: Users,
    },
  ];

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map(({ label, value, detail, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="px-5 py-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span>{label}</span>
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Catalogue Velocity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-5 w-5 text-primary" />Catalogue Velocity</CardTitle>
            <CardDescription className="text-xs">Monthly prompt creation volume for the last six months, colour-coded by primary benefit category.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {catalogueVelocityData.length > 0 ? (
              <>
                <div className="h-[260px]">
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
                <div className="mt-2 flex flex-wrap gap-2">
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

        <div className="space-y-4">
          {/* Department Bar Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-5 w-5 text-primary" />Assets by Department</CardTitle>
              <CardDescription className="text-xs">Only departments with prompt assets are shown.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {deptBarData.length > 0 ? (
                  <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptBarData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }} barSize={20}>
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
              ) : <p className="text-sm text-muted-foreground text-center py-4">No data.</p>}
            </CardContent>
          </Card>

          {/* Pipeline Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-5 w-5 text-primary" />Pipeline Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {statusData.length > 0 ? (
                <div className="flex gap-3 items-center">
                  <div className="h-[108px] w-[108px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={26} outerRadius={44} dataKey="value" stroke="hsl(var(--border))" strokeWidth={2}>
                          {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    {statusData.map(s => (
                      <div key={s.name} className="flex items-center justify-between text-xs sm:text-sm">
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

      <div className="grid gap-4 xl:grid-cols-2">
      {/* Asset Engagement Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-5 w-5 text-primary" />Asset Engagement Overview</CardTitle>
          <CardDescription className="text-xs">Shows approved prompts by department against prompt reuse activity from execute clicks.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {engagementData.length > 0 ? (
            <>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={engagementData} margin={{ top: 12, right: 12, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="department" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const data = payload[0].payload as { department: string; approvedPrompts: number; reuses: number };
                      return (
                        <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs">
                          <p className="font-semibold">{data.department}</p>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span>Approved Prompts</span>
                              <span className="font-medium">{data.approvedPrompts}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span>Reuses</span>
                              <span className="font-medium">{data.reuses}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }} />
                    <Bar dataKey="approvedPrompts" name="Approved Prompts" fill="#00DFD4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="reuses" name="Reuses" fill="#EC4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#00DFD4' }} />
                  <span>Approved Prompts</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#EC4899' }} />
                  <span>Reuses</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Reuses are based on execute clicks. When no clicks are logged yet, demo data falls back to 3x approved prompts by department.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No engagement data yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-5 w-5 text-primary" />Benefit Category</CardTitle>
          <CardDescription className="text-xs">Distribution of all prompts by primary benefit category, aligned with catalogue velocity and ignoring prompt status.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {benefitCategoryData.distribution.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="h-[236px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={benefitCategoryData.distribution} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="category"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => formatBenefitCategoryLabel(value as ROICategory)}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                      height={72}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const data = payload[0].payload as { category: string; prompts: number };
                      return (
                        <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs">
                          <p className="font-semibold">{data.category}</p>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span>Prompts</span>
                              <span className="font-medium">{data.prompts}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }} />
                    <Bar dataKey="prompts" radius={[4, 4, 0, 0]}>
                      {benefitCategoryData.distribution.map((entry) => <Cell key={entry.category} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Coverage</p>
                  <p className="mt-1 text-2xl font-semibold">{benefitCategoryData.categorizedPrompts} / {benefitCategoryData.totalPrompts}</p>
                  <p className="text-xs text-muted-foreground">Prompts with a primary benefit category</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {benefitCategoryData.distribution.map((entry) => (
                    <Badge key={entry.category} variant="outline" className="text-[10px]">
                      {entry.category}: {entry.prompts}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No benefit categories yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Benefit Matrix */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><DollarSign className="h-5 w-5 text-primary" />Benefit Matrix by Categories</CardTitle>
          <CardDescription className="text-xs">Shows prompt counts by department and primary benefit category. Totals count each prompt once.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {benefitCategoryByDepartmentData.rows.length > 0 ? (
            <>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={benefitCategoryByDepartmentData.rows} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="department" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Tooltip content={({ payload }) => {
                      if (!payload?.length) return null;
                      const data = payload[0].payload as { department: string; total: number } & Record<ROICategory, number>;
                      return (
                        <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs">
                          <p className="font-semibold">{data.department}</p>
                          <div className="mt-2 space-y-1">
                            {ROI_CATEGORIES.map((category) => (
                              <div key={category} className="flex items-center justify-between gap-4">
                                <span>{category}</span>
                                <span className="font-medium">{data[category] || 0}</span>
                              </div>
                            ))}
                            <div className="mt-2 flex items-center justify-between gap-4 border-t border-border pt-2">
                              <span>Total</span>
                              <span className="font-semibold">{data.total}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }} />
                    {ROI_CATEGORIES.map((category) => (
                      <Bar
                        key={category}
                        dataKey={category}
                        stackId="benefit"
                        name={category}
                        fill={ROI_CATEGORY_COLORS[category]}
                        radius={category === ROI_CATEGORIES[ROI_CATEGORIES.length - 1] ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Grand total</span>
                <span className="font-semibold text-foreground">{benefitCategoryByDepartmentData.grandTotal.toLocaleString()} prompts</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No benefit data yet.</p>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
