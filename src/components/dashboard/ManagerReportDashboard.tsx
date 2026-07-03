import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RoadDamage, DamageStatus } from '@/types';
import { Activity, CheckCircle2, Clock, FileWarning, TrendingUp } from 'lucide-react';

interface ManagerReportDashboardProps {
  damages: RoadDamage[];
}

const statusLabels: Record<DamageStatus, string> = {
  urgent: 'Urgent',
  pending: 'Pending',
  'in-progress': 'In Progress',
  completed: 'Solved',
};

const statusColors: Record<DamageStatus, string> = {
  urgent: 'hsl(var(--status-urgent))',
  pending: 'hsl(var(--status-pending))',
  'in-progress': 'hsl(var(--status-in-progress))',
  completed: 'hsl(var(--status-completed))',
};

const severityLabels = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

interface ChartTooltipPayload {
  value?: number;
  payload?: {
    name?: string;
    value?: number;
  };
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
}

function SeverityTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  const severity = entry.payload?.name ?? label ?? 'Severity';
  const count = entry.payload?.value ?? entry.value ?? 0;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{severity}</p>
      <p className="text-muted-foreground">{count} {count === 1 ? 'report' : 'reports'}</p>
    </div>
  );
}

function toDateKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toISOString().slice(0, 10);
}

function toShortDate(value: string): string {
  if (value === 'Unknown') return value;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

const ManagerReportDashboard: React.FC<ManagerReportDashboardProps> = ({ damages }) => {
  const analytics = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const totalReports = damages.length;
    const solvedReports = damages.filter((damage) => damage.status === 'completed').length;
    const activeReports = damages.filter((damage) => damage.status !== 'completed').length;
    const urgentReports = damages.filter((damage) => damage.status === 'urgent' || damage.severity === 'critical').length;
    const newThisWeek = damages.filter((damage) => new Date(damage.dateReported).getTime() >= sevenDaysAgo).length;
    const solvedThisMonth = damages.filter((damage) => {
      const reportedAt = new Date(damage.dateReported).getTime();
      return damage.status === 'completed' && reportedAt >= thirtyDaysAgo;
    }).length;

    const byDate = new Map<string, { date: string; reports: number; solved: number }>();
    damages.forEach((damage) => {
      const date = toDateKey(damage.dateReported);
      const bucket = byDate.get(date) ?? { date, reports: 0, solved: 0 };
      bucket.reports += 1;
      if (damage.status === 'completed') bucket.solved += 1;
      byDate.set(date, bucket);
    });

    const trendData = Array.from(byDate.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)
      .map((entry) => ({
        ...entry,
        label: toShortDate(entry.date),
      }));

    const statusData = (Object.keys(statusLabels) as DamageStatus[]).map((status) => ({
      status,
      name: statusLabels[status],
      value: damages.filter((damage) => damage.status === status).length,
      fill: statusColors[status],
    }));

    const severityData = Object.entries(severityLabels).map(([severity, label]) => ({
      name: label,
      value: damages.filter((damage) => damage.severity === severity).length,
    }));

    return {
      totalReports,
      solvedReports,
      activeReports,
      urgentReports,
      newThisWeek,
      solvedThisMonth,
      completionRate: totalReports ? Math.round((solvedReports / totalReports) * 100) : 0,
      trendData,
      statusData,
      severityData,
    };
  }, [damages]);

  const statCards = [
    {
      title: 'Total Reports',
      value: analytics.totalReports,
      detail: `${analytics.newThisWeek} new this week`,
      icon: Activity,
      iconColor: 'text-primary',
    },
    {
      title: 'Solved Reports',
      value: analytics.solvedReports,
      detail: `${analytics.completionRate}% completion rate`,
      icon: CheckCircle2,
      iconColor: 'text-status-completed',
    },
    {
      title: 'Active Work',
      value: analytics.activeReports,
      detail: 'Pending or in progress',
      icon: Clock,
      iconColor: 'text-status-in-progress',
    },
    {
      title: 'Urgent Queue',
      value: analytics.urgentReports,
      detail: 'Urgent or critical reports',
      icon: FileWarning,
      iconColor: 'text-status-urgent',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.iconColor}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Report Trend
            </CardTitle>
            <CardDescription>Daily incoming reports compared with solved reports</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.trendData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="reports" name="Reports" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="solved" name="Solved" stroke="hsl(var(--status-completed))" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
            <CardDescription>Current maintenance workflow distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={3}>
                  {analytics.statusData.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Severity Mix</CardTitle>
            <CardDescription>Report volume grouped by detected severity</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.severityData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip content={<SeverityTooltip />} cursor={{ fill: 'hsl(var(--primary) / 0.08)' }} />
                <Bar dataKey="value" name="Reports" fill="hsl(var(--foreground))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resolution Snapshot</CardTitle>
            <CardDescription>Operational summary for manager review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-medium">Completion Rate</p>
                <p className="text-sm text-muted-foreground">Solved reports against total reports</p>
              </div>
              <Badge variant="outline" className="text-lg">{analytics.completionRate}%</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-medium">Solved This Month</p>
                <p className="text-sm text-muted-foreground">Completed reports from the last 30 days</p>
              </div>
              <Badge variant="outline" className="text-lg">{analytics.solvedThisMonth}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-medium">Open Workload</p>
                <p className="text-sm text-muted-foreground">Reports still requiring maintenance action</p>
              </div>
              <Badge variant="outline" className="text-lg">{analytics.activeReports}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagerReportDashboard;
