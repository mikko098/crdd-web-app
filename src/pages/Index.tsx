import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCaptures } from '@/hooks/useCaptures';
import { Button } from '@/components/ui/button';
import DamageImageWithDetections from '@/components/damage/DamageImageWithDetections';
import { ROADVISION_LOGO_SRC } from '@/assets/brand';
import { DamageType, InferenceDetection, RoadDamage } from '@/types';
import {
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  Clock3,
  FileText,
  LocateFixed,
  MapPinned,
  Route,
  ShieldCheck,
  TrafficCone,
} from 'lucide-react';

const sampleImage = (name: string) => `${import.meta.env.BASE_URL}sample_images/${name}`;

const transverseDemoReports: Array<{
  image: string;
  detections: InferenceDetection[];
}> = [
  {
    image: sampleImage('landing_transverse_1.jpg'),
    detections: [
      {
        class_name: 'Transverse Crack',
        class_id: 1,
        confidence: 0.3758,
        bbox: [2524.01, 2079.83, 4040.18, 2318.63],
      },
    ],
  },
  {
    image: sampleImage('landing_transverse_2.jpg'),
    detections: [
      {
        class_name: 'Transverse Crack',
        class_id: 1,
        confidence: 0.51,
        bbox: [2140.14, 1787.22, 3388.39, 1969.0],
      },
    ],
  },
  {
    image: sampleImage('landing_transverse_3.jpg'),
    detections: [
      {
        class_name: 'Transverse Crack',
        class_id: 1,
        confidence: 0.3659,
        bbox: [1454.18, 1795.99, 4080.05, 2120.94],
      },
    ],
  },
];

const damageTypeLabels: Record<DamageType, string> = {
  pothole: 'Pothole',
  'transverse-crack': 'Transverse crack',
  alligator: 'Alligator cracking',
  'longitudinal-crack': 'Longitudinal crack',
  other: 'Other damage',
  'no-damage': 'No damage',
};

const statusLabels = {
  urgent: 'Urgent',
  pending: 'Pending',
  'in-progress': 'In progress',
  completed: 'Completed',
};

const reportSteps = [
  'Review incoming road reports',
  'Confirm the mapped location',
  'Prioritize repair action',
  'Track updates to completion',
];

function formatStat(value: number, isLoading: boolean, isError: boolean): string {
  if (isLoading) return '...';
  if (isError) return 'N/A';
  return new Intl.NumberFormat().format(value);
}

function getActivityTone(damage: RoadDamage): string {
  if (damage.status === 'completed') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (damage.status === 'urgent' || damage.severity === 'critical' || damage.severity === 'high') {
    return 'text-red-700 bg-red-50 border-red-200';
  }
  return 'text-cyan-700 bg-cyan-50 border-cyan-200';
}

const Index = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { data: damages = [], isLoading: isLoadingCaptures, isError: isCaptureError } = useCaptures();
  const destination = isAuthenticated ? '/dashboard' : '/login';
  const ctaLabel = isAuthenticated ? 'Open Dashboard' : 'Sign in to Dashboard';
  const activeReports = damages.filter((damage) => damage.status !== 'completed' && damage.type !== 'no-damage').length;
  const awaitingRepair = damages.filter((damage) => ['urgent', 'pending'].includes(damage.status) && damage.type !== 'no-damage').length;
  const completedRepairs = damages.filter((damage) => damage.status === 'completed' && damage.type !== 'no-damage').length;
  const stats = [
    [formatStat(damages.length, isLoadingCaptures, isCaptureError), 'total reports'],
    [formatStat(activeReports, isLoadingCaptures, isCaptureError), 'active reports'],
    [formatStat(completedRepairs, isLoadingCaptures, isCaptureError), 'completed repairs'],
  ];
  const latestReports = damages
    .filter((damage) => damage.type !== 'no-damage')
    .slice(0, 3);
  const queueStatus = isCaptureError ? 'Unavailable' : isLoadingCaptures ? 'Loading' : 'Live';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <section className="relative flex min-h-[88vh] items-center overflow-hidden">
          <img
            src={transverseDemoReports[0].image}
            alt="Detected transverse crack"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-teal-950/78" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,47,46,0.96)_0%,rgba(17,94,89,0.82)_50%,rgba(15,118,110,0.34)_100%)]" />

          <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
            <div className="max-w-3xl py-8 text-white lg:py-10">
              <Link to="/" className="mb-8 inline-flex items-center gap-3 text-white">
                <img
                  src={ROADVISION_LOGO_SRC}
                  alt="RoadVision AI temporary logo"
                  className="h-14 w-14 object-contain dark:brightness-0 dark:invert"
                />
                <span>
                  <span className="block text-base font-semibold leading-none">RoadVision AI</span>
                  <span className="block text-sm text-white/70">Road maintenance dashboard</span>
                </span>
              </Link>

              <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-teal-200/45 bg-teal-300/12 px-3 py-2 text-sm font-medium text-teal-50">
                <TrafficCone className="h-4 w-4" />
                Map reports. Prioritize repairs. Close the loop.
              </div>
              <h1 className="max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                A clearer way to manage road damage reports.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
                RoadVision AI brings field captures, detection results, mapped locations, and repair status
                into one focused workspace for maintenance teams.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="bg-teal-300 text-teal-950 hover:bg-teal-200" disabled={isLoading}>
                  <Link to={destination}>
                    {ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <p className="max-w-sm text-sm leading-6 text-white/65">
                  One secure entry point for reviewers, managers, and maintenance staff.
                </p>
              </div>
              <div className="mt-10 grid max-w-2xl gap-3 text-sm text-white/80 sm:grid-cols-3">
                {stats.map(([value, label]) => (
                  <div key={label} className="border-l border-white/20 pl-4">
                    <div className="text-2xl font-semibold text-white">{value}</div>
                    <div>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end">
              <div className="w-full max-w-xl rounded-lg border border-white/15 bg-white p-4 shadow-2xl shadow-teal-950/35">
                <div className="rounded-md border bg-teal-50/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-teal-950">Maintenance report queue</p>
                      <p className="mt-1 text-xs text-teal-700/70">
                        {isCaptureError ? 'Unable to load current report data' : `${formatStat(awaitingRepair, isLoadingCaptures, isCaptureError)} awaiting repair`}
                      </p>
                    </div>
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                      {queueStatus}
                    </span>
                  </div>

                  <div className="mt-4 flex min-h-11 items-center gap-3 rounded-md border bg-white px-3 text-sm text-teal-800/70">
                    <LocateFixed className="h-4 w-4 text-primary" />
                    Filter by district, road, or report ID
                  </div>

                  <div className="mt-4 overflow-hidden rounded-md border bg-white">
                    <div className="relative min-h-64">
                      <DamageImageWithDetections
                        src={transverseDemoReports[0].image}
                        alt="Transverse crack detection preview"
                        detections={transverseDemoReports[0].detections}
                        fit="contain"
                        showLabels
                        className="absolute inset-0 h-full w-full"
                      />
                      <div className="absolute bottom-4 left-4 right-4 rounded-md bg-white p-4 text-teal-950 shadow-lg">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold">Transverse crack detected</span>
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                            Detection marked
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-teal-800/70">
                          Fixed demo image from the Firebase dataset.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    {(latestReports.length ? latestReports : []).map((damage) => (
                      <div key={damage.id} className="flex items-start gap-3 rounded-md border bg-white p-3">
                        <span className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-md border ${getActivityTone(damage)}`}>
                          <FileText className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-teal-950">
                            {damageTypeLabels[damage.type]} report
                          </span>
                          <span className="block text-xs text-teal-800/65">
                            {statusLabels[damage.status]} - {damage.severity} severity
                          </span>
                        </span>
                      </div>
                    ))}
                    {!latestReports.length && (
                      <div className="rounded-md border bg-white p-3 text-sm text-teal-800/70">
                        {isLoadingCaptures ? 'Loading current reports...' : 'No current road damage reports available.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b bg-background py-14 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase text-primary">Operational Flow</p>
                <h2 className="mt-3 text-3xl font-bold tracking-normal sm:text-4xl">
                  Structured like a public works reporting desk.
                </h2>
                <p className="mt-4 text-muted-foreground">
                  A calm, direct workflow for reviewing field evidence, confirming where the issue is,
                  and moving the repair forward.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                {reportSteps.map((step, index) => (
                  <div key={step} className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                      {index + 1}
                    </div>
                    <p className="text-sm font-medium leading-6">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b bg-card py-14 sm:py-16">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
            {[
              {
                icon: Camera,
                title: 'Evidence first',
                text: 'Field images, AI detection labels, severity, and contributor details stay together.',
              },
              {
                icon: Route,
                title: 'Map led',
                text: 'Location, traffic impact, and district context shape the repair priority.',
              },
              {
                icon: CheckCircle2,
                title: 'Accountable repairs',
                text: 'Status changes, assignments, comments, and after-repair proof remain traceable.',
              },
            ].map((feature) => (
              <div key={feature.title} className="rounded-lg border bg-background p-6 shadow-sm">
                <feature.icon className="h-7 w-7 text-primary" />
                <h2 className="mt-5 text-lg font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-secondary/45 py-14 sm:py-16">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <DamageImageWithDetections
                src={transverseDemoReports[1].image}
                alt="Transverse crack report"
                detections={transverseDemoReports[1].detections}
                fit="contain"
                showLabels
                className="h-64 w-full rounded-lg shadow-card"
              />
              <DamageImageWithDetections
                src={transverseDemoReports[2].image}
                alt="Second transverse crack report"
                detections={transverseDemoReports[2].detections}
                fit="contain"
                showLabels
                className="h-64 w-full rounded-lg shadow-card sm:mt-10"
              />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase text-primary">Dashboard Preview</p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Professional review tools without visual clutter.</h2>
              <p className="mt-4 text-muted-foreground">
                The interface foregrounds the map, evidence, repair status, and staff responsibilities
                instead of repeating the same sign-in action across the page.
              </p>
              <div className="mt-7 grid gap-3 text-sm">
                {[
                  ['Live map and list views', MapPinned],
                  ['AI detection and severity signals', BarChart3],
                  ['Role-based workflow actions', ShieldCheck],
                  ['Repair progress monitoring', Clock3],
                ].map(([label, Icon]) => (
                  <div key={label as string} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-medium">{label as string}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
