import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  MapPinned,
  Route,
  ShieldCheck,
  TrafficCone,
} from 'lucide-react';

const sampleImage = (name: string) => `${import.meta.env.BASE_URL}sample_images/${name}`;

const Index = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const destination = isAuthenticated ? '/dashboard' : '/login';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/15 bg-foreground/45 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
              <MapPinned className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-none">RoadVision AI</span>
              <span className="block text-xs text-white/70">Maintenance Dashboard</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden text-white hover:bg-white/10 hover:text-white sm:inline-flex">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild className="bg-white text-slate-950 hover:bg-white/90" disabled={isLoading}>
              <Link to={destination}>
                {isAuthenticated ? 'Open Dashboard' : 'Enter Dashboard'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative flex min-h-[86vh] items-center overflow-hidden">
          <img
            src={sampleImage('dmg_003.jpg')}
            alt="Detected road surface damage"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/70" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.92)_0%,rgba(15,23,42,0.68)_48%,rgba(15,23,42,0.28)_100%)]" />

          <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 pt-28 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
            <div className="max-w-3xl pb-12 text-white">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white/85">
                <TrafficCone className="h-4 w-4 text-amber-300" />
                Road damage intelligence for maintenance teams
              </div>
              <h1 className="max-w-4xl text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl">
                RoadVision AI
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
                A web command center for turning field captures into prioritized road maintenance work,
                with live map review, AI detection context, traffic impact, and repair follow-up in one place.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-white text-slate-950 hover:bg-white/90" disabled={isLoading}>
                  <Link to={destination}>
                    {isAuthenticated ? 'Open Dashboard' : 'View Dashboard'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white/35 bg-white/5 text-white hover:bg-white/15 hover:text-white">
                  <a href="#overview">Explore Platform</a>
                </Button>
              </div>
            </div>

            <div className="hidden items-end justify-end lg:flex">
              <div className="w-full max-w-xl rounded-lg border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-md">
                <div className="overflow-hidden rounded-md border border-white/10 bg-slate-950/70">
                  <div className="grid grid-cols-[0.75fr_1.25fr]">
                    <div className="space-y-3 border-r border-white/10 p-4">
                      {['Urgent reports', 'Team assignment', 'Repair progress'].map((item, index) => (
                        <div key={item} className="rounded-md bg-white/10 p-3">
                          <div className="mb-2 h-2 w-16 rounded-full bg-white/50" />
                          <div className="flex items-center justify-between text-xs text-white/75">
                            <span>{item}</span>
                            <span className={index === 0 ? 'text-red-300' : index === 1 ? 'text-amber-300' : 'text-emerald-300'}>
                              {index === 0 ? '12' : index === 1 ? '8' : '24'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="relative min-h-72">
                      <img
                        src={sampleImage('dmg_001.jpg')}
                        alt="Road damage preview in dashboard"
                        className="absolute inset-0 h-full w-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 bg-slate-950/35" />
                      <div className="absolute bottom-4 left-4 right-4 rounded-md bg-white/90 p-4 text-slate-950 shadow-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">Pothole detected</span>
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">Urgent</span>
                        </div>
                        <p className="mt-2 text-xs text-slate-600">High traffic corridor - assign maintenance crew</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="overview" className="border-b bg-background py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: Camera,
                  title: 'Capture Review',
                  text: 'Inspect uploaded road images with detection summaries and contributor context.',
                },
                {
                  icon: Route,
                  title: 'Location Priority',
                  text: 'Combine severity, map position, and traffic impact to decide what needs attention first.',
                },
                {
                  icon: CheckCircle2,
                  title: 'Repair Workflow',
                  text: 'Assign teams, update repair status, add comments, and attach after-repair evidence.',
                },
              ].map((feature) => (
                <div key={feature.title} className="rounded-lg border bg-card p-6 shadow-sm">
                  <feature.icon className="h-7 w-7 text-primary" />
                  <h2 className="mt-5 text-lg font-semibold">{feature.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-secondary/45 py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Dashboard Preview</p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Built around the real maintenance workflow.</h2>
              <p className="mt-4 text-muted-foreground">
                RoadVision connects mobile reports, Firestore records, inference results, and maintenance actions
                without requiring the dashboard to talk directly to the local backend.
              </p>
              <div className="mt-7 grid gap-3 text-sm">
                {[
                  ['Live map and list views', MapPinned],
                  ['AI detection and severity signals', BarChart3],
                  ['Firebase-backed account and workflow actions', ShieldCheck],
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

            <div className="grid gap-4 sm:grid-cols-2">
              <img
                src={sampleImage('dmg_002.jpg')}
                alt="Road crack report"
                className="h-64 w-full rounded-lg object-cover shadow-card"
              />
              <img
                src={sampleImage('after_repair_001.jpg')}
                alt="Repaired road surface"
                className="h-64 w-full rounded-lg object-cover shadow-card sm:mt-10"
              />
            </div>
          </div>
        </section>

        <section className="bg-foreground py-12 text-background">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
            <div>
              <h2 className="text-2xl font-bold">Ready to manage road reports?</h2>
              <p className="mt-2 text-sm text-background/70">
                Continue into the web dashboard to review active captures and maintenance tasks.
              </p>
            </div>
            <Button asChild size="lg" className="bg-background text-foreground hover:bg-background/90" disabled={isLoading}>
              <Link to={destination}>
                {isAuthenticated ? 'Open Dashboard' : 'Sign In to Continue'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
