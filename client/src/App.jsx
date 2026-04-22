import { useState } from "react";
import { AppSidebar, StatusBanner } from "./components/common";
import {
  AnalyticsPage,
  CameraModePage,
  DashboardPage,
  DoctorConnectPage,
  EmergencyPage,
  LandingPage,
  MonitoringPage,
  ProfilePage,
  SettingsPage
} from "./components/pages";
import { navItems } from "./constants/app";
import { useDashboardData } from "./hooks/useDashboardData";
import { getConnectionLabel } from "./utils/formatters";

const dashboardPages = ["Dashboard", "Live Monitoring", "Camera Mode", "Analytics", "Profile", "Doctor Connect", "Emergency", "Settings"];

function App() {
  const [range, setRange] = useState("1h");
  const [activePage, setActivePage] = useState("Welcome");
  const { snapshot, isLoading, error, isDemoMode, backendHealthy } = useDashboardData(range);
  const connectionLabel = getConnectionLabel(isDemoMode, error, backendHealthy);

  return (
    <div className="min-h-screen bg-[var(--shell)] text-[var(--ink)]">
      {activePage === "Welcome" ? (
        <LandingPage latest={snapshot.latest} onNavigate={setActivePage} isDemoMode={isDemoMode} />
      ) : (
        <div className="grid min-h-screen grid-cols-1 gap-4 p-3 xl:grid-cols-[300px,1fr] xl:p-4">
          <AppSidebar activePage={activePage} navItems={navItems} onNavigate={setActivePage} />
          <main className="space-y-5 rounded-[36px] border border-white/65 bg-white/52 p-5 backdrop-blur-xl md:p-8">
            {error ? <StatusBanner label="Connection notice" detail={error} tone="warning" /> : null}
            {activePage === "Dashboard" ? (
              <DashboardPage snapshot={snapshot} range={range} onRangeChange={setRange} connectionLabel={connectionLabel} isLoading={isLoading} />
            ) : null}
            {activePage === "Live Monitoring" ? <MonitoringPage snapshot={snapshot} /> : null}
            {activePage === "Camera Mode" ? <CameraModePage /> : null}
            {activePage === "Analytics" ? <AnalyticsPage snapshot={snapshot} /> : null}
            {activePage === "Profile" ? <ProfilePage snapshot={snapshot} /> : null}
            {activePage === "Doctor Connect" ? <DoctorConnectPage /> : null}
            {activePage === "Emergency" ? <EmergencyPage /> : null}
            {activePage === "Settings" ? <SettingsPage range={range} /> : null}
            {!dashboardPages.includes(activePage) ? (
              <DashboardPage snapshot={snapshot} range={range} onRangeChange={setRange} connectionLabel={connectionLabel} isLoading={isLoading} />
            ) : null}
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
