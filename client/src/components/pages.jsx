import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, Filter, Heart, Search, Waves } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { chartRanges, doctorPatients, doctorStats, emergencyActions, getDashboardCards } from "../constants/app";
import { clampPercent, formatDateTime, formatRiskPercent, formatStatus, formatTime } from "../utils/formatters";
import { DoctorStatCard, EmergencyAction, EmptyState, MetricCard, MiniPatientStat, Panel, ShellHeader, SoftInfo, StatusBanner, riskBadge } from "./common";
import CameraMonitor from "./CameraMonitor";

const chartTooltipStyle = {
  background: "#ffffff",
  border: "1px solid #dfe8f5",
  borderRadius: 20
};

export function LandingPage({ latest, onNavigate, isDemoMode }) {
  return (
    <div className="relative min-h-screen overflow-hidden px-6 py-8 text-white md:px-10">
      <div className="aurora-bg absolute inset-0" />
      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-10">
        <header className="flex flex-col gap-5 rounded-[32px] border border-white/10 bg-white/6 px-6 py-6 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-[#05213f]">
              <Heart className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-[0.08em]">VitaSense</h1>
              <p className="text-sm uppercase tracking-[0.28em] text-white/70">Non-invasive monitoring</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBanner label={isDemoMode ? "Preview mode" : "Device linked"} detail={isDemoMode ? "Backend unavailable" : "Live dashboard ready"} tone={isDemoMode ? "warning" : "info"} />
            <button className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/35 hover:text-white">
              Login
            </button>
            <button onClick={() => onNavigate("Doctor Connect")} className="rounded-full bg-white px-6 py-3 text-sm font-bold text-[#0f2956] transition hover:translate-y-[-1px]">
              Doctor Portal
            </button>
          </div>
        </header>

        <div className="grid gap-8 xl:grid-cols-[1.1fr,0.9fr] xl:items-center">
          <div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/7 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Advanced PPG analytics
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-6 max-w-4xl text-5xl font-black leading-[0.98] md:text-7xl">
              Clinical-grade insight
              <span className="block bg-gradient-to-r from-white to-[var(--accent)] bg-clip-text text-transparent">without the needle.</span>
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mt-6 max-w-3xl text-lg leading-8 text-white/78 md:text-xl">
              VitaSense combines optical sensing, trend scoring, and rapid alerting so teams can catch deterioration earlier and patients can understand their body at a glance.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="mt-8 flex flex-wrap gap-4">
              <button onClick={() => onNavigate("Dashboard")} className="rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] px-7 py-4 text-base font-bold text-[#07203f] shadow-[0_20px_50px_rgba(104,239,255,0.24)] transition hover:translate-y-[-1px]">
                Open dashboard
              </button>
              <button onClick={() => onNavigate("Emergency")} className="rounded-full border border-white/18 bg-white/10 px-7 py-4 text-base font-semibold text-white transition hover:bg-white/14">
                Review emergency flow
              </button>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.14 }} className="rounded-[34px] border border-white/10 bg-white/8 p-6 shadow-[0_25px_90px_rgba(8,20,47,0.42)] backdrop-blur">
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(19,58,106,0.95),rgba(19,116,127,0.58))] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-white/55">Current session</p>
                  <p className="mt-2 text-3xl font-black">{latest.heartRate} BPM</p>
                </div>
                <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/80">{formatStatus(latest.status)}</div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <HeroStat label="SpO2" value={`${latest.spo2}%`} />
                <HeroStat label="Health score" value={`${latest.healthScore}/100`} />
                <HeroStat label="Temperature" value={`${latest.temperature} C`} />
                <HeroStat label="Updated" value={formatTime(latest.createdAt)} />
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <MiniStrip title="Alerting" body="Escalates low oxygen and out-of-range heart trends." />
              <MiniStrip title="Prediction" body="Short-horizon forecasts estimate where vitals are drifting next." />
              <MiniStrip title="Workflow" body="Designed for clinicians, patients, and emergency handoff." />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage({ snapshot, range, onRangeChange, connectionLabel, isLoading }) {
  const dashboardCards = useMemo(() => getDashboardCards(snapshot.latest), [snapshot.latest]);

  return (
    <section className="space-y-6">
      <ShellHeader
        title="Medical Command Center"
        subtitle="A calmer, faster view of live vitals, risk posture, and near-future trends."
        badge={connectionLabel}
        action={
          <div className="flex flex-wrap items-center gap-2 rounded-full border border-white/60 bg-white/72 p-1">
            {chartRanges.map((item) => (
              <button
                key={item.key}
                onClick={() => onRangeChange(item.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${item.key === range ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardCards.map((card, index) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
            <MetricCard card={card} />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr,0.85fr]">
        <Panel title="Live PPG waveform" subtitle="Recent heart rate stream with projected continuation." actions={<StatusBanner label={isLoading ? "Refreshing" : "Stable refresh"} detail={`Last sync ${formatDateTime(snapshot.fetchedAt)}`} />}>
          {snapshot.history.items.length ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={snapshot.history.items}>
                  <CartesianGrid stroke="#e4edf9" strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" tickFormatter={formatTime} stroke="#8ca0c4" />
                  <YAxis stroke="#8ca0c4" />
                  <Tooltip contentStyle={chartTooltipStyle} labelFormatter={formatDateTime} />
                  <Line type="monotone" dataKey="heartRate" stroke="#18cdf2" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="predictedHeartRate" stroke="#23c55e" strokeWidth={2} dot={false} strokeDasharray="7 6" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Waiting for enough signal" description="The waveform will appear after the device sends fresh readings for the selected range." compact />
          )}
        </Panel>

        <Panel title="Range summary" subtitle="The essential numbers for this time window.">
          <div className="grid gap-4">
            <SoftInfo label="Average heart rate" value={`${snapshot.history.summary.averageHeartRate} BPM`} />
            <SoftInfo label="Minimum SpO2" value={`${snapshot.history.summary.minimumSpo2}%`} />
            <SoftInfo label="Peak temperature" value={`${snapshot.history.summary.peakTemperature} C`} />
            <SoftInfo label="Anomalies detected" value={snapshot.history.summary.anomalyCount} />
          </div>
        </Panel>
      </div>
    </section>
  );
}

export function MonitoringPage({ snapshot }) {
  const ringValue = clampPercent(snapshot.latest.spo2);

  return (
    <section className="space-y-6">
      <ShellHeader title="Live Monitoring" subtitle="High-contrast views for the vitals clinicians scan first." badge="Live recording" badgeTone="red" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Heart rate" subtitle="Continuous rhythm tracking with safe-zone context.">
          <div className="mb-5 flex items-start gap-5">
            <div className="grid h-16 w-16 place-items-center rounded-[24px] bg-[#ffe0e4] text-[#ff4f4f]">
              <Heart className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Current BPM</p>
              <p className="text-6xl font-black text-[var(--ink)]">{snapshot.latest.heartRate}</p>
            </div>
          </div>
          {snapshot.history.items.length ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={snapshot.history.items}>
                  <Line type="monotone" dataKey="heartRate" stroke="#ff4438" strokeWidth={4} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No live heart series yet" description="Once readings arrive, the short rolling waveform will render here." compact />
          )}
          <div className="mt-6 flex justify-between border-t border-[#efced1] pt-4 text-sm text-[var(--muted)]">
            <span>Expected range</span>
            <span className="font-bold text-[var(--ink)]">60-100 BPM</span>
          </div>
        </Panel>

        <Panel title="Blood oxygen" subtitle="Circular view built for fast saturation checks.">
          <div className="grid h-[300px] place-items-center">
            <div className="grid h-[220px] w-[220px] place-items-center rounded-full" style={{ background: `conic-gradient(#11cbef 0 ${ringValue}%, #d8eff6 ${ringValue}% 100%)` }}>
              <div className="grid h-[162px] w-[162px] place-items-center rounded-full bg-white text-center shadow-soft">
                <div>
                  <div className="text-5xl font-black text-[var(--ink)]">{snapshot.latest.spo2}%</div>
                  <div className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">SpO2</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-between border-t border-[#d7edf4] pt-4 text-sm text-[var(--muted)]">
            <span>Expected range</span>
            <span className="font-bold text-[var(--ink)]">95-100%</span>
          </div>
        </Panel>
      </div>

      <Panel title="Signal quality stream" subtitle="A softer area view of the same live series for rapid trend spotting.">
        {snapshot.history.items.length ? (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snapshot.history.items}>
                <defs>
                  <linearGradient id="ppgFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#18cdf2" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#18cdf2" stopOpacity={0.06} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e4edf9" strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tickFormatter={formatTime} stroke="#8ca0c4" />
                <YAxis stroke="#8ca0c4" />
                <Tooltip contentStyle={chartTooltipStyle} labelFormatter={formatDateTime} />
                <Area type="monotone" dataKey="heartRate" stroke="#18cdf2" fill="url(#ppgFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="Signal quality will appear here" description="Streaming begins after the device posts a few fresh readings." compact />
        )}
      </Panel>
    </section>
  );
}

export function CameraModePage() {
  return (
    <section className="space-y-6">
      <ShellHeader
        title="Camera Mode"
        subtitle="Estimate heart rate from live facial color changes using your device camera."
        badge="Approximate reading"
        badgeTone="red"
      />
      <CameraMonitor />
    </section>
  );
}

export function AnalyticsPage({ snapshot }) {
  return (
    <section className="space-y-6">
      <ShellHeader title="Analytics" subtitle="Prediction, correlation, and escalation cues in one place." badge="AI active" />
      <div className="grid gap-6 xl:grid-cols-[1.2fr,1fr]">
        <Panel title="Predictive heart rate trend" subtitle="Near-future forecast generated from recent readings.">
          {snapshot.predictions.forecast.length ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={snapshot.predictions.forecast}>
                  <defs>
                    <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#12d7ee" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#12d7ee" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e4edf9" strokeDasharray="3 3" />
                  <XAxis dataKey="step" stroke="#8ca0c4" />
                  <YAxis stroke="#8ca0c4" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="heartRate" stroke="#12d7ee" fill="url(#forecastFill)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Prediction unavailable" description="The forecasting service needs a few readings before it can model the next interval." compact />
          )}
        </Panel>

        <Panel title="Motion vs heart rate" subtitle="Activity correlation overview.">
          {snapshot.history.items.length ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid stroke="#e4edf9" />
                  <XAxis type="number" dataKey="motion" stroke="#8ca0c4" />
                  <YAxis type="number" dataKey="heartRate" stroke="#8ca0c4" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Scatter data={snapshot.history.items} fill="#19cdef" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No motion correlation yet" description="Correlation unlocks once the wearable sends a fuller history window." compact />
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <Panel title="Risk posture" subtitle="Anomaly probability and key callouts.">
          <div className="grid gap-4 md:grid-cols-2">
            <SoftInfo label="Anomaly probability" value={formatRiskPercent(snapshot.predictions.anomalyProbability)} />
            <SoftInfo label="Current status" value={formatStatus(snapshot.latest.status)} />
          </div>
        </Panel>

        <Panel title="Model insights" subtitle="Short summaries to reduce scanning time.">
          <div className="grid gap-3">
            {snapshot.predictions.insights?.length ? (
              snapshot.predictions.insights.map((insight) => (
                <div key={insight} className="rounded-2xl border border-[#dbe7f2] bg-[#f9fbfe] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
                  {insight}
                </div>
              ))
            ) : (
              <EmptyState title="Insights pending" description="The model will publish recommendations once enough signal is available." compact />
            )}
          </div>
        </Panel>
      </div>
    </section>
  );
}

export function ProfilePage({ snapshot }) {
  return (
    <section className="space-y-6">
      <ShellHeader title="Profile" subtitle="Current monitored patient context and attached sensor stack." badge="Active profile" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Patient overview" subtitle="Session identity and most recent vitals state.">
          <div className="grid gap-4 md:grid-cols-2">
            <SoftInfo label="Patient ID" value="VS-ESP32-001" />
            <SoftInfo label="Device ID" value="esp32-vitasense" />
            <SoftInfo label="Current status" value={formatStatus(snapshot.latest.status)} />
            <SoftInfo label="Health score" value={`${snapshot.latest.healthScore}/100`} />
            <SoftInfo label="Heart rate" value={`${snapshot.latest.heartRate} BPM`} />
            <SoftInfo label="Last updated" value={formatDateTime(snapshot.latest.createdAt)} />
          </div>
        </Panel>

        <Panel title="Sensor stack" subtitle="Attached hardware and transport path.">
          <div className="grid gap-4">
            <SoftInfo label="MAX30102" value="Heart rate and SpO2" />
            <SoftInfo label="DS18B20" value="Body temperature" />
            <SoftInfo label="MPU6050" value="Motion and activity" />
            <SoftInfo label="Transport" value="ESP32 over HTTP" />
          </div>
        </Panel>
      </div>
    </section>
  );
}

export function DoctorConnectPage() {
  const [query, setQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);

  const filteredPatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return doctorPatients;
    return doctorPatients.filter((patient) => patient.name.toLowerCase().includes(normalizedQuery));
  }, [query]);

  return (
    <section className="space-y-6">
      <ShellHeader title="Doctor Dashboard" subtitle="A cleaner queue for triage, search, and patient-level handoff." badge="Waiting for real patients" badgeTone="white" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {doctorStats.map((item) => (
          <DoctorStatCard key={item.title} {...item} />
        ))}
      </div>

      <Panel title="Patient queue" subtitle="Search by name and review the riskiest cases first.">
        <div className="flex flex-col gap-4 md:flex-row">
          <label className="flex flex-1 items-center gap-3 rounded-2xl border border-[#dbe6f0] bg-[#f7faff] px-4 py-4 text-[var(--muted)]">
            <Search className="h-5 w-5" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search patients by name..."
              className="w-full bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[#8aa0bb]"
            />
          </label>
          <button className="flex items-center justify-center gap-2 rounded-2xl border border-[#d7e1f0] px-5 py-4 text-sm font-semibold text-[var(--ink)]">
            <Filter className="h-5 w-5" />
            Filter
          </button>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
        <div>
          <h3 className="mb-4 text-2xl font-black text-[var(--ink)]">Patient list</h3>
          <div className="space-y-4">
            {filteredPatients.length ? (
              filteredPatients.map((patient) => (
                <button
                  key={patient.name}
                  onClick={() => setSelectedPatient(patient)}
                  className={`w-full rounded-[28px] border p-5 text-left shadow-soft transition ${selectedPatient?.name === patient.name ? "border-[#8ee7cf] bg-[#effcf3]" : "border-white/70 bg-white/85 hover:border-[#d0e8dc]"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#b7f3dc] text-xl font-black text-[var(--ink)]">
                        {patient.initials}
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-[var(--ink)]">{patient.name}</h4>
                        <p className="text-sm text-[var(--muted)]">{patient.age} years · {patient.time}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${riskBadge(patient.risk)}`}>{patient.risk}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <MiniPatientStat icon={Heart} value={patient.heartRate} unit="BPM" />
                    <MiniPatientStat icon={Waves} value={patient.spo2} unit="SpO2%" />
                    <MiniPatientStat icon={Activity} value={patient.hb} unit="Hb g/dL" />
                  </div>
                </button>
              ))
            ) : (
              <EmptyState title="No patient records yet" description="The demo patients have been removed. Connect your real patient source to populate this queue." compact />
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-2xl font-black text-[var(--ink)]">Patient details</h3>
          {selectedPatient ? (
            <Panel title={selectedPatient.name} subtitle="Selected case snapshot for rapid review.">
              <div className="grid gap-4 md:grid-cols-2">
                <SoftInfo label="Risk" value={selectedPatient.risk} />
                <SoftInfo label="Last update" value={selectedPatient.time} />
                <SoftInfo label="Heart rate" value={`${selectedPatient.heartRate} BPM`} />
                <SoftInfo label="SpO2" value={`${selectedPatient.spo2}%`} />
                <SoftInfo label="Hemoglobin" value={`${selectedPatient.hb} g/dL`} />
                <SoftInfo label="Recommended action" value={selectedPatient.risk === "Critical" ? "Escalate now" : selectedPatient.risk === "Warning" ? "Review today" : "Continue monitoring"} />
              </div>
            </Panel>
          ) : (
            <EmptyState title="No patient selected" description="Real patient cards will appear here once your backend starts supplying doctor-facing patient data." />
          )}
        </div>
      </div>
    </section>
  );
}

export function EmergencyPage() {
  return (
    <section className="space-y-6">
      <ShellHeader title="Emergency Center" subtitle="A clearer escalation surface for fast action under pressure." badge="Response workflow ready" badgeTone="red" />
      <Panel title="Emergency SOS" subtitle="Pressing the primary button immediately triggers all configured emergency actions.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {emergencyActions.map((action) => (
            <EmergencyAction key={action.text} {...action} />
          ))}
        </div>
        <div className="mt-10 grid place-items-center">
          <button className="grid h-[280px] w-[280px] place-items-center rounded-full bg-[#ff3131] text-white shadow-[0_0_60px_rgba(255,49,49,0.35)] transition hover:scale-[1.02]">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-20 w-20" />
              <div className="mt-4 text-5xl font-black">SOS</div>
              <div className="mt-3 text-xl font-semibold">Press to alert</div>
            </div>
          </button>
          <p className="mt-6 text-sm text-[var(--muted)]">False alarm? The notification window stays cancellable for 10 seconds.</p>
        </div>
      </Panel>
    </section>
  );
}

export function SettingsPage({ range }) {
  const frontendUrl = window.location.origin;
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
  const mlUrl = import.meta.env.VITE_ML_URL || "http://127.0.0.1:8000";

  return (
    <section className="space-y-6">
      <ShellHeader title="Settings" subtitle="Runtime, service, and environment overview." badge="System ready" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Application stack" subtitle="Current architecture">
          <div className="grid gap-4">
            <SoftInfo label="Frontend" value="React + Vite + Tailwind" />
            <SoftInfo label="Backend" value="Express + Firebase Firestore" />
            <SoftInfo label="ML service" value="FastAPI + scikit-learn" />
            <SoftInfo label="Adaptive polling" value="10s foreground / 30s background" />
          </div>
        </Panel>
        <Panel title="Endpoints" subtitle="Local development URLs">
          <div className="grid gap-4">
            <SoftInfo label="Frontend URL" value={frontendUrl} />
            <SoftInfo label="API URL" value={apiUrl} />
            <SoftInfo label="ML URL" value={mlUrl} />
            <SoftInfo label="Current range" value={range} />
          </div>
        </Panel>
      </div>
    </section>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-white/48">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function MiniStrip({ title, body }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-white/68">{body}</p>
    </div>
  );
}
