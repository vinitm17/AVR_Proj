import type { ReactNode } from "react";
import { BatteryCharging, MapPin, ShieldCheck, Zap } from "lucide-react";

interface AuthShellProps {
  children: ReactNode;
  title: string;
  description: string;
}

export function AuthShell({ children, title, description }: AuthShellProps) {
  return (
    <main className="min-h-svh bg-background text-foreground lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden min-h-svh flex-col justify-between border-r border-border bg-[#EBF4DD] p-10 text-[#3B4953] lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#3B4953] text-[#EBF4DD]">
            <BatteryCharging className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide">ONE EV</p>
            <p className="text-xs text-[#5A7863]">Charging network</p>
          </div>
        </div>

        <div className="max-w-xl space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#5A7863]">Find. Pay. Charge.</p>
            <h1 className="text-5xl font-semibold leading-tight tracking-[-0.04em] text-[#3B4953]">
              A quieter way to manage EV charging.
            </h1>
            <p className="max-w-lg text-base leading-7 text-[#5A7863]">
              Locate stations, start charging sessions, and keep your points and history in one structured workspace.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              { icon: MapPin, label: "Nearby stations", text: "Check availability and queue status before you leave." },
              { icon: Zap, label: "Session control", text: "Start and stop charging from a single focused flow." },
              { icon: ShieldCheck, label: "Account clarity", text: "Track points, sessions, and station usage without clutter." },
            ].map((item) => (
              <div key={item.label} className="flex gap-3 rounded-2xl border border-[#90AB8B]/35 bg-[#F4F8ED]/55 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#90AB8B]/25 text-[#3B4953]">
                  <item.icon className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#3B4953]">{item.label}</p>
                  <p className="text-sm leading-6 text-[#5A7863]">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-[#5A7863]">Built for operators and EV users who need the interface to stay out of the way.</p>
      </section>

      <section className="flex min-h-svh items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#3B4953] text-[#EBF4DD]">
                <BatteryCharging className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#3B4953]">ONE EV</p>
                <p className="text-xs text-muted-foreground">Charging network</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[#3B4953]">{title}</h2>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </div>

          {children}
        </div>
      </section>
    </main>
  );
}
