import { startTransition, useEffect, useState } from "react";
import { createFallbackSnapshot } from "../constants/fallbacks";
import { fetchDashboardSnapshot, checkBackendHealth } from "../lib/api";

const FOREGROUND_INTERVAL = 15000; // Increased from 10000ms
const BACKGROUND_INTERVAL = 45000; // Increased from 30000ms
const HEALTH_CHECK_INTERVAL = 30000; // Check backend health every 30 seconds

export function useDashboardData(range) {
  const [snapshot, setSnapshot] = useState(() => createFallbackSnapshot(range));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timeoutId;
    let healthCheckId;
    let controller;

    async function checkHealth() {
      if (cancelled) return;

      try {
        const healthy = await checkBackendHealth();
        setBackendHealthy(healthy);

        if (healthy && isDemoMode) {
          // Backend is back online, try to fetch real data
          load();
        }
      } catch (error) {
        console.error("Health check error:", error);
        setBackendHealthy(false);
      }
    }

    async function load() {
      controller?.abort();
      controller = new AbortController();

      try {
        const data = await fetchDashboardSnapshot(range, controller.signal);
        if (cancelled) return;

        startTransition(() => {
          setSnapshot(data);
          setError("");
          setIsDemoMode(false);
          setBackendHealthy(true);
          setIsLoading(false);
        });
      } catch (loadError) {
        if (cancelled || loadError.name === "CanceledError" || loadError.name === "AbortError") return;

        console.error("Dashboard data fetch failed:", loadError.message);

        startTransition(() => {
          setSnapshot(createFallbackSnapshot(range));
          setError(`Backend connection lost. ${loadError.message || 'Unknown error'}. Showing demo data.`);
          setIsDemoMode(true);
          setBackendHealthy(false);
          setIsLoading(false);
        });
      } finally {
        if (!cancelled) {
          const nextInterval = document.visibilityState === "hidden" ? BACKGROUND_INTERVAL : FOREGROUND_INTERVAL;
          timeoutId = window.setTimeout(load, nextInterval);
        }
      }
    }

    function refreshOnVisibilityChange() {
      window.clearTimeout(timeoutId);
      if (document.visibilityState === "visible") {
        // When tab becomes visible, immediately check health and load data
        checkHealth();
      }
    }

    // Start health checking
    healthCheckId = window.setInterval(checkHealth, HEALTH_CHECK_INTERVAL);

    setIsLoading(true);
    load();
    document.addEventListener("visibilitychange", refreshOnVisibilityChange);

    return () => {
      cancelled = true;
      controller?.abort();
      window.clearTimeout(timeoutId);
      window.clearInterval(healthCheckId);
      document.removeEventListener("visibilitychange", refreshOnVisibilityChange);
    };
  }, [range]);

  return {
    snapshot,
    isLoading,
    error,
    isDemoMode,
    backendHealthy
  };
}
