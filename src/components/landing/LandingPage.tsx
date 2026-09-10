import Link from "next/link";
import { AppLogo } from "@/components/ui/app-logo";
import {
  LayoutDashboard,
  FileText,
  Network,
  Eye,
  CalendarDays,
  Wallet,
  WifiOff,
  ShieldCheck,
  RefreshCw,
  ChevronRight,
  Repeat2,
  Flame,
} from "lucide-react";

const features = [
  {
    icon: LayoutDashboard,
    title: "Kanban Boards",
    description:
      "Multi-board project management with customizable columns, priorities, labels, checklists, and time tracking. Keep every project under control.",
    accent: "#3A3A42",
    ring: "#D1D5DB",
  },
  {
    icon: Flame,
    title: "Habit Tracking",
    description:
      "Build and break habits with streak tracking, flexible weekly schedules, and granular completion levels per day.",
    accent: "#4A4A52",
    ring: "#D4D4D8",
  },
  {
    icon: FileText,
    title: "Rich Notes",
    description:
      "Write beautiful notes with a full-featured editor. Supports markdown, syntax-highlighted code blocks, math equations, and even embedded diagrams.",
    accent: "#5A616E",
    ring: "#CBD5E1",
  },
  {
    icon: Network,
    title: "Mind Maps",
    description:
      "Brainstorm visually with infinite mind map canvases. Connect ideas, create hierarchies, and see the big picture.",
    accent: "#6B7A8D",
    ring: "#BFDBFE",
  },
  {
    icon: Eye,
    title: "Whiteboard",
    description:
      "Draw, sketch, and collage your goals on a freeform Excalidraw canvas. Visualise where you want to go.",
    accent: "#7B8BA0",
    ring: "#C7D2FE",
  },
  {
    icon: CalendarDays,
    title: "Calendar",
    description:
      "See all your tasks, deadlines, and habits laid out on a beautiful calendar. Switch between day, week, and month views.",
    accent: "#8A9CB0",
    ring: "#CFE2F3",
  },
  {
    icon: Wallet,
    title: "Transaction Tracking",
    description:
      "Attach income and expense entries to tasks to stay on top of your budget — right inside your workflow.",
    accent: "#4B5563",
    ring: "#D1D5DB",
  },
  {
    icon: Repeat2,
    title: "Multi-Device Sync",
    description:
      "Your data syncs seamlessly across all your devices via Cloudflare Workers. Fast, reliable, conflict-free.",
    accent: "#64748B",
    ring: "#CBD5E1",
  },
];

const localFirstPoints = [
  {
    icon: WifiOff,
    title: "Works Offline",
    description:
      "Every feature is available without an internet connection. Your data lives on your device, not in the cloud.",
  },
  {
    icon: ShieldCheck,
    title: "Private by Default",
    description:
      "No third-party analytics. No selling data. You own your information, full stop.",
  },
  {
    icon: RefreshCw,
    title: "Auto-Sync",
    description:
      "When you're back online, changes sync automatically across all your devices with smart conflict resolution.",
  },
];

const steps = [
  {
    number: "01",
    title: "Create a Board",
    description:
      "Start with a board for a project, area of life, or anything you want to track. Add swimlanes to sub-divide it.",
  },
  {
    number: "02",
    title: "Add What Matters",
    description:
      "Track tasks on a kanban, build daily habits, write notes, sketch mind maps, and log finances — all in one place.",
  },
  {
    number: "03",
    title: "Stay in Flow",
    description:
      "Everything syncs in the background. Pick up where you left off on any device, online or offline.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FB] text-slate-900 antialiased">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-[#F6F8FB]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <AppLogo size="sm" variant="color" isBeta orientation="horizontal" />
          <nav className="hidden gap-6 text-sm text-slate-600 sm:flex">
            <a href="#features" className="transition hover:text-slate-900">
              Features
            </a>
            <a href="#local-first" className="transition hover:text-slate-900">
              Local-first
            </a>
            <a href="#how-it-works" className="transition hover:text-slate-900">
              How it works
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm text-slate-600 transition hover:text-slate-900"
            >
              Log in
            </Link>
            <Link
              href="/auth/register"
              className="rounded-xl bg-[#3A3A42] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2f2f36]"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 10%, rgba(123, 139, 160, 0.25), transparent 38%), radial-gradient(circle at 82% 0%, rgba(90, 97, 110, 0.22), transparent 42%), linear-gradient(to bottom, #f6f8fb 0%, #eef3f8 55%, #f6f8fb 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(58,58,66,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(58,58,66,0.08) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
            maskImage: "radial-gradient(circle at center, black 38%, transparent 90%)",
          }}
        />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pb-24 pt-24 text-center">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-slate-300/90 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6B7A8D]" />
            Free during beta • Early adopters get 50% off at launch
          </span>

          <h1 className="max-w-3xl text-5xl font-medium leading-tight tracking-tight text-[#1E293B] sm:text-6xl">
            Everything you need to
            <br />
            <span className="text-[#6B7A8D]">stay in flow.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
            buobu is a local-first productivity app that combines kanban
            boards, habit tracking, notes, mind maps, and more — all syncing
            seamlessly across your devices.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-xl bg-[#3A3A42] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#2f2f36]"
            >
              Start for free <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300/80 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Log in to your account
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-medium tracking-tight text-slate-900">
              One app. Every tool you need.
            </h2>
            <p className="mt-3 text-slate-600">
              No more switching between five different apps. buobu has it
              all.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border bg-white/95 p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                style={{ borderColor: f.ring }}
              >
                <div className="mb-4 inline-flex rounded-xl p-2.5" style={{ backgroundColor: `${f.accent}1A` }}>
                  <f.icon className="h-5 w-5" style={{ color: f.accent }} />
                </div>
                <h3 className="mb-1.5 font-medium text-slate-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="local-first" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center gap-16 rounded-3xl border border-slate-200 bg-gradient-to-br from-[#f8fbff] via-white to-[#eef4fb] px-7 py-10 lg:flex-row lg:px-10">
            <div className="flex-1">
              <span className="mb-4 inline-block rounded-full bg-slate-200/70 px-3 py-1 text-xs font-medium text-slate-700">
                Local-first
              </span>
              <h2 className="text-3xl font-medium tracking-tight text-slate-900">
                Your data.
                <br />
                Your device.
                <br />
                Your rules.
              </h2>
              <p className="mt-4 max-w-md text-slate-600">
                buobu stores everything locally using RxDB + IndexedDB.
                The cloud is just a sync layer — not a lock-in. You stay
                productive whether you&apos;re on a plane, in the mountains, or
                simply offline.
              </p>
            </div>

            <div className="flex flex-1 flex-col gap-4">
              {localFirstPoints.map((p) => (
                <div
                  key={p.title}
                  className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white/85 p-5"
                >
                  <div className="mt-0.5 rounded-xl bg-slate-100 p-2.5">
                    <p.icon className="h-5 w-5 text-slate-700" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{p.title}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                      {p.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-[#ECF2F8] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-medium tracking-tight text-slate-900">
              Simple to start.
            </h2>
            <p className="mt-3 text-slate-600">
              Get productive in minutes, not hours.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.number} className="relative rounded-2xl border border-slate-300/70 bg-white/80 p-6">
                <span className="mb-4 block text-5xl font-medium text-slate-200">
                  {s.number}
                </span>
                <h3 className="mb-2 font-medium text-slate-900">{s.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-gradient-to-br from-[#f8fbff] to-[#eef3f8] px-6 py-12 text-center shadow-sm">
          <h2 className="text-3xl font-medium tracking-tight text-slate-900">
            Ready to find your flow?
          </h2>
          <p className="mt-3 text-slate-600">
            Join early access and shape the future of buobu.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            buobu is completely free during beta. Early adopters will lock in a 50% lifetime discount when paid plans launch.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-xl bg-[#3A3A42] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#2f2f36]"
            >
              Create a free account <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-slate-500 sm:flex-row">
          <AppLogo size="sm" variant="color" isBeta orientation="horizontal"/>
          <p>© {new Date().getFullYear()} buobu. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/auth/login" className="transition hover:text-slate-700">
              Log in
            </Link>
            <Link
              href="/auth/register"
              className="transition hover:text-slate-700"
            >
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
