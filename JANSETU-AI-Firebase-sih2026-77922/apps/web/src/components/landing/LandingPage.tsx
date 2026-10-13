import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  ClipboardList,
  Coffee,
  Factory,
  GraduationCap,
  Handshake,
  MapPin,
  Moon,
  Sun,
  Users,
  Network,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import AnimatedBackground from "./AnimatedBackground";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Card3D, AnimatedCount } from "@/components/ui";

const MODULES = [
  {
    n: "01",
    icon: Users,
    title: "Citizen engagement",
    body: "Web and mobile intake for people, panchayats, ULBs and departments — photos, video, location, documents.",
  },
  {
    n: "02",
    icon: Bot,
    title: "AI problem routing",
    body: "Auto-categorize, prioritize, de-duplicate and send each challenge to the university with matching expertise.",
  },
  {
    n: "03",
    icon: GraduationCap,
    title: "University workspace",
    body: "HEIs review briefs, form multidisciplinary teams, assign mentors and manage research workflows.",
  },
  {
    n: "04",
    icon: Handshake,
    title: "Industry partnership",
    body: "Startups, MSMEs, CSR and labs mentor, fund, prototype, pilot and transfer technology.",
  },
  {
    n: "05",
    icon: ClipboardList,
    title: "Lifecycle tracking",
    body: "Milestones, deliverables, approvals, testing, IP and implementation status in one place.",
  },
  {
    n: "06",
    icon: BarChart3,
    title: "Public analytics",
    body: "Live views of submissions, participation, themes, completion, patents and district impact.",
  },
];

const STEPS = [
  { n: "1", t: "Submit", d: "Raise a challenge with evidence and a pin on the map." },
  { n: "2", t: "Route", d: "AI classifies and assigns the best-fit campus." },
  { n: "3", t: "Collaborate", d: "Students, faculty and industry co-create a pilot." },
  { n: "4", t: "Deploy", d: "Validated solutions return to the community, tracked." },
];

const PROBLEMS = [
  { icon: MapPin, t: "No centralized intake", d: "Local issues stay informal or trapped in departmental silos." },
  { icon: GraduationCap, t: "Campuses work in isolation", d: "Research capacity rarely meets live community needs." },
  { icon: Factory, t: "Industry is ad-hoc", d: "CSR and startups lack a pipeline of validated problems." },
  { icon: BarChart3, t: "Impact is invisible", d: "Government has no shared dashboard across districts." },
];

interface LandingPageProps {
  onNavigate: (route: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [theme, setTheme] = useState<Theme>("light");
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const t = readTheme();
    setTheme(t);
    applyTheme(t);
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const switchTheme = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
  };

  const bars = useMemo(() => [40, 65, 48, 82, 55, 90, 70, 52, 76, 62, 88, 94], []);

  function navTo(route: string) {
    onNavigate(route);
    window.scrollTo(0, 0);
  }

  return (
    <div className="relative min-h-dvh text-fg bg-bg selection:bg-accent/30 transition-colors duration-300">
      <AnimatedBackground theme={theme} />

      {/* Header */}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-[background,border-color,backdrop-filter] duration-300",
          scrolled ? "border-b border-border bg-bg/80 backdrop-blur-xl shadow-sm" : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 w-[min(1180px,92%)] items-center justify-between gap-4">
          <button onClick={() => navTo('/')} className="flex items-center gap-2.5 font-medium text-left">
            <span className="grid size-8 place-items-center rounded-[9px] bg-accent font-display text-lg text-accent-fg shadow-sm">
              <Network size={18} />
            </span>
            <div>
              <span className="block text-base font-bold text-fg font-display leading-none">UDBHAV</span>
              <span className="block text-[10px] text-muted leading-none mt-0.5">Societal Innovation Operating System</span>
            </div>
          </button>
          
          <nav className="hidden items-center gap-7 text-sm text-muted md:flex font-medium">
            <a href="#problem" className="hover:text-fg transition-colors">
              Challenge
            </a>
            <a href="#platform" className="hover:text-fg transition-colors">
              Platform
            </a>
            <a href="#flow" className="hover:text-fg transition-colors">
              Flow
            </a>
            <a href="#impact" className="hover:text-fg transition-colors">
              Impact
            </a>
            <button onClick={() => navTo('/transparency')} className="hover:text-fg transition-colors">
              Transparency
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {/* Theme switcher */}
            <div className="flex rounded-full border border-border bg-surface-2 p-1">
              {(
                [
                  ["light", Sun, "Light"],
                  ["dark", Moon, "Dark"],
                  ["coffee", Coffee, "Coffee"],
                ] as const
              ).map(([id, Icon, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-label={label}
                  onClick={() => switchTheme(id)}
                  className={cn(
                    "grid size-8 place-items-center rounded-full text-subtle transition-colors duration-150",
                    theme === id && "bg-surface text-accent shadow-sm",
                  )}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => navTo('/signin')}
              className="hidden sm:inline-flex rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-fg hover:border-accent transition-colors"
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => navTo('/signup')}
              className="inline-flex rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-fg transition-transform duration-150 hover:opacity-90 active:scale-[0.96] shadow-sm"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main id="top" className="relative z-10">
        <section className="mx-auto grid min-h-dvh w-[min(1180px,92%)] items-center gap-10 pb-16 pt-28 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
          <div>
            <p className="rise mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-accent shadow-xs">
              <span className="size-1.5 rounded-full bg-accent [animation:pulse-dot_2s_ease-in-out_infinite]" />
              AI-Powered Societal Innovation Operating System
            </p>
            <h1 className="rise font-display text-[clamp(2.6rem,6vw,5rem)] leading-[1.05] tracking-[-0.03em] [animation-delay:80ms]">
              Turning Community Challenges into <br />
              <em className="text-accent not-italic font-display">Collaborative Innovation</em>
            </h1>
            <p className="rise mt-5 max-w-xl text-lg leading-relaxed text-muted [animation-delay:140ms]">
              UDBHAV connects citizens, universities, industry, and government to transform real societal problems into structured innovation challenges — from discovery to deployable, measurable solutions.
            </p>
            <div className="rise mt-8 flex flex-wrap gap-3 [animation-delay:200ms]">
              <button
                type="button"
                onClick={() => navTo('/signup')}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-fg transition-transform duration-150 hover:opacity-90 active:scale-[0.96] shadow-md"
              >
                Report a Challenge <ArrowRight className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => navTo('/dashboard')}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-sm font-medium text-fg transition-colors hover:border-accent shadow-xs"
              >
                <MapPin className="size-4 text-accent" /> Explore Innovation Map
              </button>
            </div>
            
            <dl className="rise mt-10 flex flex-wrap gap-8 [animation-delay:280ms] border-t border-border pt-6">
              <div>
                <dt className="text-xs text-subtle uppercase tracking-wider font-mono">Domains</dt>
                <dd className="font-display text-3xl text-fg">10+</dd>
              </div>
              <div>
                <dt className="text-xs text-subtle uppercase tracking-wider font-mono">Routing</dt>
                <dd className="font-display text-3xl text-accent">AI Engine</dd>
              </div>
              <div>
                <dt className="text-xs text-subtle uppercase tracking-wider font-mono">Policy</dt>
                <dd className="font-display text-3xl text-fg">NEP 2020</dd>
              </div>
            </dl>
          </div>

          {/* 3D Visual Cards Column */}
          <div className="relative mx-auto h-[420px] w-full max-w-md lg:h-[480px]">
            <article className="float-a absolute top-2 right-[-10px] z-10 w-52 rounded-[22px] border border-border bg-surface p-4 shadow-lg">
              <p className="font-mono text-[10px] text-subtle uppercase font-semibold">University Workspace</p>
              <p className="mt-1 text-sm font-medium text-fg">Multidisciplinary team formed</p>
              <p className="mt-2 text-xs text-muted">4 students · 1 faculty mentor</p>
            </article>

            <article className="float-b absolute bottom-4 left-[-10px] z-10 w-52 rounded-[22px] border border-border bg-surface p-4 shadow-lg">
              <p className="font-mono text-[10px] text-subtle uppercase font-semibold">Industry Partner</p>
              <p className="mt-1 text-sm font-medium text-fg">CSR funding + pilot active</p>
              <p className="mt-2 text-xs text-accent font-medium">Prototyping stage</p>
            </article>

            <article className="absolute top-1/2 left-1/2 z-20 w-[min(310px,88%)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-border bg-surface p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[11px] tracking-wide text-subtle uppercase">Challenge JH-2847</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  <Sparkles className="size-3" /> Live
                </span>
              </div>
              <h2 className="text-lg font-medium leading-snug text-fg">Seasonal water scarcity in rural Giridih blocks</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-accent font-medium">Water</span>
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-accent font-medium">Livelihoods</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="size-2 rounded-full bg-accent animate-pulse" />
                  Routed to BIT Mesra
                </span>
                <span>2d ago</span>
              </div>
            </article>
          </div>
        </section>


        {/* Section 01: The Reality */}
        <section id="problem" className="mx-auto w-[min(1180px,92%)] py-24 border-t border-border">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">01 — The reality</p>
          <h2 className="mt-3 max-w-2xl font-display text-[clamp(2rem,4vw,3.2rem)] leading-tight text-fg">
            Communities see the problems. Solutions stay fragmented.
          </h2>
          <p className="mt-4 max-w-xl text-muted">
            Every year, citizens name thousands of local issues. UDBHAV establishes a structured path from local insights to campus research and industry deployment.
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <ul className="space-y-3">
              {PROBLEMS.map((p) => (
                <li
                  key={p.t}
                  className="flex gap-4 rounded-[18px] border border-border bg-surface p-4 transition-transform duration-200 hover:translate-x-1 shadow-xs"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-accent">
                    <p.icon className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-medium text-fg">{p.t}</h3>
                    <p className="text-sm text-muted">{p.d}</p>
                  </div>
                </li>
              ))}
            </ul>
            <aside className="rounded-[28px] border border-border bg-surface p-8 shadow-sm">
              <p className="font-mono text-xs tracking-widest text-accent uppercase">Aligned with</p>
              <h3 className="mt-2 font-display text-3xl text-fg">National Education Policy 2020</h3>
              <p className="mt-4 leading-relaxed text-muted">
                Experiential learning, multidisciplinary research, industry collaboration and community engagement — UDBHAV turns those principles into a living statewide platform.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Demand-driven innovation", "Student projects", "Social impact"].map((t) => (
                  <span key={t} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-accent font-medium">
                    {t}
                  </span>
                ))}
              </div>
            </aside>
          </div>
        </section>

        {/* Section 02: Platform */}
        <section id="platform" className="bg-surface-2/40 py-24 border-y border-border">
          <div className="mx-auto w-[min(1180px,92%)]">
            <p className="font-mono text-xs tracking-widest text-accent uppercase">02 — Platform</p>
            <h2 className="mt-3 max-w-2xl font-display text-[clamp(2rem,4vw,3.2rem)] leading-tight text-fg">
              Six connected modules. One innovation spine.
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.map((m) => (
                <Card3D key={m.n} intensity={8}>
                  <article className="group h-full rounded-[28px] border border-border bg-surface p-6 transition-all duration-200 hover:shadow-md">
                    <span className="grid size-12 place-items-center rounded-[12px] bg-surface-2 text-accent group-hover:bg-accent group-hover:text-accent-fg transition-colors">
                      <m.icon className="size-5" />
                    </span>
                    <p className="mt-5 font-mono text-xs text-accent font-semibold">{m.n}</p>
                    <h3 className="mt-1 text-lg font-medium text-fg">{m.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{m.body}</p>
                  </article>
                </Card3D>
              ))}
            </div>
          </div>
        </section>

        {/* Section 03: Flow */}
        <section id="flow" className="mx-auto w-[min(1180px,92%)] py-24">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">03 — Flow</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3.2rem)] leading-tight text-fg">
            From problem to impact in four stages
          </h2>
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="text-center group">
                <span className="mx-auto grid size-16 place-items-center rounded-full border-2 border-accent bg-surface font-display text-2xl text-accent group-hover:scale-110 transition-transform shadow-sm">
                  {s.n}
                </span>
                <h3 className="mt-4 font-medium text-fg">{s.t}</h3>
                <p className="mx-auto mt-1 max-w-[200px] text-sm text-muted">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Ecosystem */}
        <section className="bg-surface-2/40 py-24 border-y border-border">
          <div className="mx-auto w-[min(1180px,92%)]">
            <p className="font-mono text-xs tracking-widest text-accent uppercase">04 — Ecosystem</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3.2rem)] text-fg">Three pillars. Shared purpose.</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: Users,
                  t: "Citizens & communities",
                  d: "Submit real problems from the ground. Track progress. See solutions return home.",
                },
                {
                  icon: Building2,
                  t: "Universities & HEIs",
                  d: "Receive demand-driven briefs. Build teams. Produce research with social value.",
                },
                {
                  icon: Factory,
                  t: "Industry & partners",
                  d: "Mentor, fund, prototype and scale. Turn academic work into deployable services.",
                },
              ].map((s) => (
                <article key={s.t} className="rounded-[28px] border border-border bg-surface p-8 text-center shadow-xs">
                  <span className="mx-auto grid size-14 place-items-center rounded-full bg-surface-2 text-accent">
                    <s.icon className="size-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-medium text-fg">{s.t}</h3>
                  <p className="mt-2 text-sm text-muted">{s.d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Section 05: Impact & Visibility */}
        <section id="impact" className="mx-auto w-[min(1180px,92%)] py-24">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">05 — Visibility</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3.2rem)] text-fg">Government-grade analytics, always on</h2>
          <div className="mt-10 overflow-hidden rounded-[28px] border border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-[#c45c4a]" />
                <span className="size-2.5 rounded-full bg-[#c9a227]" />
                <span className="size-2.5 rounded-full bg-[#4f8f6a]" />
              </div>
              <span className="font-mono text-xs text-subtle">UDBHAV · Live Dashboard</span>
              <span className="font-mono text-xs text-accent font-semibold flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-accent animate-pulse" /> Live
              </span>
            </div>
            <div className="grid lg:grid-cols-[200px_1fr]">
              <aside className="hidden space-y-1 border-r border-border bg-surface-2 p-4 lg:block">
                {["Overview", "Districts", "Domains", "Institutions", "Partners"].map((n, i) => (
                  <div
                    key={n}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-colors",
                      i === 0 ? "bg-bg text-accent shadow-xs" : "text-muted hover:text-fg",
                    )}
                  >
                    {n}
                  </div>
                ))}
              </aside>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Challenges", 1284],
                    ["Active projects", 312],
                    ["Universities", 47],
                    ["Partners", 89],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="rounded-[18px] border border-border bg-bg p-4 shadow-xs">
                      <p className="text-xs text-subtle uppercase font-mono">{k}</p>
                      <p className="font-display text-2xl tabular-nums text-fg">
                        <AnimatedCount end={Number(v)} />
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex h-36 items-end gap-2 rounded-[18px] border border-border bg-bg px-4 py-3">
                  {bars.map((h, i) => (
                    <div
                      key={i}
                      className="origin-bottom flex-1 rounded-t-sm bg-accent/85 [animation:bar-grow_700ms_cubic-bezier(0.22,1,0.36,1)_both]"
                      style={{ height: `${h}%`, animationDelay: `${i * 40}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to action section */}
        <section className="mx-auto w-[min(1180px,92%)] pb-24">
          <div className="relative overflow-hidden rounded-[32px] border border-border bg-surface px-6 py-16 text-center shadow-lg">
            <h2 className="font-display text-[clamp(2rem,4vw,3.2rem)] leading-tight text-fg">
              Turn local problems into deployable solutions
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted">
              Join the first structured innovation pipeline connecting citizens, campuses, and industry.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => navTo('/signup')}
                className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-fg transition-transform duration-150 active:scale-[0.96] shadow-md"
              >
                Report a Challenge
              </button>
              <button
                type="button"
                onClick={() => navTo('/dashboard')}
                className="rounded-full border border-border bg-surface px-6 py-3 text-sm font-medium text-fg hover:border-accent transition-colors"
              >
                See how it works
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border py-10 bg-surface">
        <div className="mx-auto flex w-[min(1180px,92%)] flex-col gap-3 text-sm text-subtle sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 UDBHAV · Societal Innovation Operating System</span>
          <span>Aligned with NEP 2020</span>
        </div>
      </footer>
    </div>
  );
}
