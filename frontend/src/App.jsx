import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { buildDemoTelemetry } from "./mockTelemetry";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Live Monitoring", path: "/live-monitoring" },
  { label: "Analytics", path: "/analytics" },
  { label: "Profile", path: "/profile" },
  { label: "Emergency", path: "/emergency" },
  { label: "Settings", path: "/settings" }
];

const METRIC_LAYOUT = [
  { key: "heartRate", label: "Heart Rate", unit: "BPM", subtitle: "Trend: Stable", healthy: "Healthy Level: 60-100 BPM" },
  { key: "spo2", label: "SpO2", unit: "%", subtitle: "Quality: GOOD", healthy: "Healthy Level: 95-100%" },
  { key: "temperature", label: "Temperature", unit: "°C", subtitle: "Thermal status: --", healthy: "Healthy Level: 36.1-37.2°C", warm: true },
  { key: "stress", label: "Stress", unit: "/100", subtitle: "Stress Score: 80/100", healthy: "Healthy Level: 0-30 /100", progress: true },
  { key: "hydration", label: "Hydration", unit: "%", subtitle: "", healthy: "Healthy Level: 55-100%", progress: true },
  { key: "perfusionIndex", label: "Perfusion Index", unit: "%", subtitle: "Peripheral perfusion signal", healthy: "Healthy Level: 0.5-5.0% (typical)", warm: true },
  { key: "respiratoryRate", label: "Respiratory Rate", unit: "brpm", subtitle: "Breaths per minute estimate", healthy: "Healthy Level: 12-20 brpm" },
  { key: "movement", label: "Movement", unit: "idx", subtitle: "Activity: Low/None", healthy: "Healthy Level: regular non-zero movement" },
  { key: "shockIndex", label: "Shock Proxy", unit: "", subtitle: "Pulse-pressure derived flag", healthy: "Healthy Level: monitor variability", warm: true },
  { key: "fallRisk", label: "Fall Risk", unit: "/10", subtitle: "Computed from motion signature", healthy: "Healthy Level: low steady gait" },
  { key: "signalQuality", label: "Signal Quality", unit: "%", subtitle: "Sensor confidence score", healthy: "Healthy Level: 80-100%", progress: true },
  { key: "deviceUptime", label: "Device Uptime", unit: "min", subtitle: "Current active session", healthy: "Healthy Level: uninterrupted stream" }
];

const ENDPOINT = "http://127.0.0.1:8787/api/telemetry/current";

function App() {
  const [telemetry, setTelemetry] = useState(buildDemoTelemetry());
  const [darkMode, setDarkMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    let cancelled = false;

    async function loadTelemetry() {
      try {
        const response = await fetch(ENDPOINT);
        if (!response.ok) throw new Error("bridge unavailable");
        const payload = await response.json();
        if (!cancelled) {
          setTelemetry(payload);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      } catch {
        if (!cancelled) {
          setTelemetry((current) => buildDemoTelemetry(current.device.connected));
          setLastUpdated(new Date().toLocaleTimeString());
        }
      }
    }

    loadTelemetry();
    const interval = window.setInterval(loadTelemetry, 1800);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const metrics = useMemo(
    () =>
      METRIC_LAYOUT.map((card) => ({
        ...card,
        ...telemetry.metrics[card.key]
      })),
    [telemetry]
  );

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      {NAV_ITEMS.map((item) => (
        <Route
          key={item.path}
          path={item.path}
          element={
            <DashboardShell
              darkMode={darkMode}
              lastUpdated={lastUpdated}
              metrics={metrics}
              telemetry={telemetry}
              voiceEnabled={voiceEnabled}
              onToggleDark={() => setDarkMode((value) => !value)}
              onToggleVoice={() => setVoiceEnabled((value) => !value)}
            />
          }
        />
      ))}
    </Routes>
  );
}

function DashboardShell({ metrics, telemetry, darkMode, voiceEnabled, onToggleDark, onToggleVoice, lastUpdated }) {
  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <h1>Medical Command Center</h1>
          <p>Real-time vital monitoring dashboard</p>
        </div>
        <div className="topbar-actions">
          <Badge success>{telemetry.device.connected ? "Device Connected" : "Device Offline"}</Badge>
          <button className="top-button" onClick={onToggleVoice}>{voiceEnabled ? "Voice Active" : "Voice Summary"}</button>
          <button className="top-button" onClick={onToggleVoice}>Stop Voice</button>
          <button className="top-button" onClick={() => window.print()}>Export Report</button>
          <button className="top-button" onClick={onToggleDark}>{darkMode ? "Light" : "Dark"}</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="brand-card">
            <div className="brand-icon">VS</div>
            <div>
              <h2>VitaSense</h2>
              <p>Health Monitoring</p>
            </div>
          </div>

          <nav className="nav-list">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              >
                <span className="nav-dot" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="main-panel">
          <section className="hero-panel">
            <div>
              <h2>Real-Time Dashboard</h2>
              <p>Live biometrics and predictive screening for current patient session.</p>
            </div>
            <div className="hero-meta">
              <span>Board: {telemetry.device.board}</span>
              <span>Sensors: {telemetry.device.sensors.join(" · ")}</span>
              <span>Updated: {lastUpdated}</span>
            </div>
          </section>

          <section className="metrics-grid">
            {metrics.map((metric) => (
              <VitalCard key={metric.key} metric={metric} />
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}

function VitalCard({ metric }) {
  const value = metric.value ?? "--";
  const themeClass = metric.warm || metric.state === "warning" ? "warm" : "";
  return (
    <article className={`metric-card ${themeClass}`}>
      <div className="metric-header">
        <h3>{metric.label}</h3>
        <div className="metric-badges">
          <Badge warning={metric.state === "warning"} muted={metric.state === "muted"}>
            {metric.status}
          </Badge>
          <span className={`status-dot ${metric.state || "normal"}`} />
        </div>
      </div>

      <div className="metric-value-row">
        <strong>{value}</strong>
        <span>{metric.unit}</span>
      </div>

      <p className="metric-subtitle">{metric.subtitle || metric.detail}</p>

      {metric.progress ? (
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, Number(metric.value) || 0))}%` }} />
        </div>
      ) : (
        <div className="metric-divider" />
      )}

      <p className="metric-foot">{metric.healthy}</p>
    </article>
  );
}

function Badge({ children, success, warning, muted }) {
  const className = ["badge", success ? "success" : "", warning ? "warning" : "", muted ? "muted" : ""].join(" ").trim();
  return <span className={className}>{children}</span>;
}

export default App;
