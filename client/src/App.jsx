import { useEffect, useState } from "react";
import AuthPanel from "./components/AuthPanel";
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
import { fetchCurrentUser, getStoredAuthToken, logoutUser, setStoredAuthToken } from "./lib/api";
import { getConnectionLabel } from "./utils/formatters";

const dashboardPages = ["Dashboard", "Live Monitoring", "Camera Mode", "Analytics", "Profile", "Doctor Connect", "Emergency", "Settings"];

function App() {
  const [range, setRange] = useState("1h");
  const [activePage, setActivePage] = useState("Welcome");
  const [authMode, setAuthMode] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthBootstrapping, setIsAuthBootstrapping] = useState(true);
  const [authNotice, setAuthNotice] = useState("");
  const { snapshot, isLoading, error, isDemoMode, backendHealthy } = useDashboardData(range);
  const connectionLabel = getConnectionLabel(isDemoMode, error, backendHealthy);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const token = getStoredAuthToken();

      if (!token) {
        if (!cancelled) {
          setIsAuthBootstrapping(false);
        }
        return;
      }

      try {
        const response = await fetchCurrentUser();

        if (!cancelled) {
          setCurrentUser(response.user || null);
          setActivePage(response.user ? "Dashboard" : "Welcome");
          setAuthNotice("");
        }
      } catch (sessionError) {
        setStoredAuthToken("");

        if (!cancelled) {
          setCurrentUser(null);
          setActivePage("Welcome");
          setAuthNotice(sessionError?.response?.data?.message || "Your previous session expired. Please log in again.");
        }
      } finally {
        if (!cancelled) {
          setIsAuthBootstrapping(false);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleNavigate(nextPage) {
    if (!currentUser && nextPage !== "Welcome") {
      setAuthMode("login");
      setActivePage("Auth");
      return;
    }

    setActivePage(nextPage);
  }

  function handleAuthSuccess(user) {
    setCurrentUser(user || null);
    setAuthNotice("");
    setActivePage("Dashboard");
  }

  async function handleLogout() {
    try {
      await logoutUser();
    } catch {
      setStoredAuthToken("");
    }

    setCurrentUser(null);
    setAuthMode("login");
    setActivePage("Welcome");
    setAuthNotice("You have been logged out.");
  }

  if (isAuthBootstrapping) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--shell)] px-6 text-center text-[var(--ink)]">
        <div className="space-y-3">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[var(--line)] border-t-[var(--accent)]" />
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Restoring secure session</p>
        </div>
      </div>
    );
  }

  if (activePage === "Auth") {
    return (
      <AuthPanel
        mode={authMode}
        onModeChange={setAuthMode}
        onAuthSuccess={handleAuthSuccess}
        onCancel={() => setActivePage("Welcome")}
        currentUser={currentUser}
      />
    );
  }

  if (activePage === "Welcome") {
    return (
      <div className="min-h-screen bg-[var(--shell)] text-[var(--ink)]">
        {authNotice ? <div className="px-4 pt-4"><StatusBanner label="Account notice" detail={authNotice} tone="info" /></div> : null}
        <LandingPage latest={snapshot.latest} onNavigate={handleNavigate} isDemoMode={isDemoMode} />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthPanel
        mode={authMode}
        onModeChange={setAuthMode}
        onAuthSuccess={handleAuthSuccess}
        onCancel={() => setActivePage("Welcome")}
        currentUser={currentUser}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--shell)] text-[var(--ink)]">
      <div className="grid min-h-screen grid-cols-1 gap-4 p-3 xl:grid-cols-[300px,1fr] xl:p-4">
        <AppSidebar activePage={activePage} navItems={navItems} onNavigate={handleNavigate} currentUser={currentUser} onLogout={handleLogout} />
        <main className="space-y-5 rounded-[36px] border border-white/65 bg-white/52 p-5 backdrop-blur-xl md:p-8">
          {authNotice ? <StatusBanner label="Account notice" detail={authNotice} tone="info" /> : null}
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
    </div>
  );
}

export default App;
