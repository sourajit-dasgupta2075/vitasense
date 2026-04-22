import { AlertTriangle, Heart, LogOut } from "lucide-react";

export function AppSidebar({ activePage, navItems, onNavigate }) {
  return (
    <aside className="glass-panel flex min-h-full flex-col border border-white/55 bg-[rgba(14,33,71,0.92)] text-white shadow-[0_30px_80px_rgba(10,24,57,0.45)]">
      <div className="flex items-center gap-4 border-b border-white/10 px-6 py-7">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-[#07203f]">
          <Heart className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-[0.08em]">VitaSense</h1>
          <p className="text-sm uppercase tracking-[0.28em] text-white/60">Health Monitoring</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-5">
        {navItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => onNavigate(label)}
            className={`flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left transition ${
              activePage === label
                ? "bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(123,249,255,0.3)]"
                : "text-white/72 hover:bg-white/6 hover:text-white"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="font-semibold">{label}</span>
            {activePage === label ? <span className="ml-auto h-8 w-1 rounded-full bg-[var(--accent)]" /> : null}
          </button>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-5">
        <button className="flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left text-white/72 transition hover:bg-white/6 hover:text-white">
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}

export function ShellHeader({ title, subtitle, badge, badgeTone = "green", action }) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <h2 className="text-4xl font-black tracking-[0.04em] text-[var(--ink)] md:text-5xl">{title}</h2>
        <p className="mt-3 max-w-3xl text-base text-[var(--muted)] md:text-lg">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {action}
        <div className={`inline-flex items-center gap-3 rounded-full px-5 py-3 text-sm font-semibold ${headerBadgeTone(badgeTone)}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${headerDotTone(badgeTone)}`} />
          {badge}
        </div>
      </div>
    </div>
  );
}

export function MetricCard({ card }) {
  const Icon = card.icon;
  const warm = card.accent === "amber";

  return (
    <div className={`rounded-[28px] border p-6 shadow-soft ${warm ? "border-[#f1d2a1] bg-[#fff8ef]" : "border-[#cfeaf7] bg-white/82"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className={`grid h-14 w-14 place-items-center rounded-2xl ${warm ? "bg-[#ffeac7] text-[#dd9407]" : "bg-[#dff7ff] text-[#12b8e8]"}`}>
          <Icon className="h-7 w-7" />
        </div>
        <span className={`h-3 w-3 rounded-full ${warm ? "bg-[#f1b000]" : "bg-[#1ccf8c]"}`} />
      </div>
      <p className="mt-5 text-sm uppercase tracking-[0.18em] text-[var(--muted)]">{card.label}</p>
      <p className="mt-3 text-4xl font-black leading-none text-[var(--ink)]">
        {card.value}
        <span className="ml-2 text-base font-medium text-[var(--muted)]">{card.unit}</span>
      </p>
      {card.chart === "wave" ? (
        <div className="mt-6 h-16">
          <svg viewBox="0 0 300 60" className="h-full w-full">
            <path d="M6 33 C 35 38, 52 40, 78 34 S 128 20, 168 24 S 230 26, 294 31" fill="none" stroke="#0dcff0" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      ) : (
        <div className="mt-6 border-t border-slate-100 pt-4 text-sm text-[var(--muted)]">{card.note}</div>
      )}
    </div>
  );
}

export function Panel({ title, subtitle, children, actions }) {
  return (
    <section className="rounded-[30px] border border-white/70 bg-white/88 p-6 shadow-soft backdrop-blur">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-2xl font-black text-[var(--ink)]">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function SoftInfo({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#dce8f2] bg-[#f8fbff] p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-[#7f96b5]">{label}</p>
      <p className="mt-3 text-lg font-bold text-[var(--ink)]">{value}</p>
    </div>
  );
}

export function EmptyState({ title, description, compact = false }) {
  return (
    <div className={`grid place-items-center rounded-[24px] border border-dashed border-[#cad9e6] bg-[#f8fbfe] text-center ${compact ? "min-h-[180px] p-8" : "min-h-[320px] p-10"}`}>
      <div className="max-w-md">
        <AlertTriangle className="mx-auto h-10 w-10 text-[#8ca3bc]" />
        <h4 className="mt-4 text-xl font-bold text-[var(--ink)]">{title}</h4>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>
    </div>
  );
}

export function StatusBanner({ label, detail, tone = "info" }) {
  const toneClass =
    tone === "error"
      ? "border-[#f0b8bb] bg-[#fff4f4] text-[#8a2f3a]"
      : tone === "warning"
        ? "border-[#f0deae] bg-[#fff9ed] text-[#8b6409]"
        : "border-[#c9e8f3] bg-white/75 text-[#335372]";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClass}`}>
      <span className="font-semibold">{label}</span>
      {detail ? <span className="ml-2 opacity-80">{detail}</span> : null}
    </div>
  );
}

export function DoctorStatCard({ icon: Icon, title, value, badge, badgeTone, highlight }) {
  return (
    <div className={`rounded-[28px] p-6 shadow-soft ${highlight ? "border border-[#c9ebf6] bg-[#eefbff]" : "border border-white/80 bg-white/84"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-14 w-14 place-items-center rounded-2xl ${highlight ? "bg-[#d6f4ff] text-[#11bbe7]" : "bg-[#effaf2] text-[#1cb36e]"}`}>
          <Icon className="h-7 w-7" />
        </div>
        {badge ? <span className={`rounded-full px-3 py-1 text-sm font-bold ${riskBadgeTone(badgeTone)}`}>{badge}</span> : null}
      </div>
      <div className="mt-5 text-4xl font-black text-[var(--ink)]">{value}</div>
      <div className="text-sm text-[var(--muted)]">{title}</div>
    </div>
  );
}

export function MiniPatientStat({ icon: Icon, value, unit }) {
  return (
    <div className="rounded-2xl bg-white/90 p-4 text-center">
      <Icon className="mx-auto h-5 w-5 text-[#13bbe5]" />
      <p className="mt-2 text-2xl font-black text-[var(--ink)]">{value}</p>
      <p className="text-sm text-[var(--muted)]">{unit}</p>
    </div>
  );
}

export function EmergencyAction({ icon: Icon, text }) {
  return (
    <div className="rounded-[24px] border border-[#ffd7d7] bg-white/82 p-5 text-center text-[var(--ink)]">
      <Icon className="mx-auto h-7 w-7 text-[#ff4b4b]" />
      <p className="mt-3 text-sm font-medium">{text}</p>
    </div>
  );
}

export function riskBadge(risk) {
  if (risk === "Critical") return "bg-[#ffe2e3] text-[#d93e4a]";
  if (risk === "Warning") return "bg-[#fff1d8] text-[#bc7900]";
  return "bg-[#ddf7e8] text-[#1ca65d]";
}

function riskBadgeTone(tone) {
  if (tone === "red") return "bg-[#ffe2e3] text-[#d93e4a]";
  if (tone === "amber") return "bg-[#fff1d8] text-[#bc7900]";
  return "bg-[#ddf7e8] text-[#1ca65d]";
}

function headerBadgeTone(tone) {
  if (tone === "red") return "bg-[#ffe9e9] text-[#ca3946]";
  if (tone === "white") return "bg-white text-[var(--ink)]";
  return "bg-[#effbf3] text-[#17784a]";
}

function headerDotTone(tone) {
  if (tone === "red") return "bg-[#ca3946]";
  if (tone === "white") return "bg-[var(--accent)]";
  return "bg-[#20bf6f]";
}
