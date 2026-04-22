import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  timeout: 15000, // Increased from 6000ms to 15000ms
  headers: {
    'Connection': 'keep-alive'
  }
});

// Add request interceptor for retry logic
api.interceptors.request.use((config) => {
  // Add timestamp to prevent caching
  config.params = {
    ...config.params,
    _t: Date.now()
  };
  return config;
});

// Add response interceptor for retry logic
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (!config || !config.retry) {
      config.retry = 3; // Retry up to 3 times
      config.retryDelay = 1000; // Start with 1 second delay
    }

    if (config.retry > 0 && (
      error.code === 'ECONNABORTED' || // Timeout
      error.code === 'ENOTFOUND' || // DNS/Network error
      error.code === 'ECONNREFUSED' || // Connection refused
      (error.response && error.response.status >= 500) // Server errors
    )) {
      config.retry--;

      // Exponential backoff
      const delay = config.retryDelay * Math.pow(2, 3 - config.retry);
      console.log(`Retrying request in ${delay}ms... (${config.retry} attempts left)`);

      await new Promise(resolve => setTimeout(resolve, delay));

      // Double the delay for next retry
      config.retryDelay *= 2;

      return api(config);
    }

    return Promise.reject(error);
  }
);

export async function fetchDashboardSnapshot(range = "1h", signal) {
  const { data } = await api.get("/dashboard", {
    params: { range },
    signal
  });
  return data;
}

export async function fetchLatest() {
  const { data } = await api.get("/data");
  return data;
}

export async function fetchHistory(range = "1h") {
  const { data } = await api.get("/history", { params: { range } });
  return data;
}

export async function fetchPredictions(range = "1h") {
  const { data } = await api.get("/predictions", { params: { range } });
  return data;
}

export async function fetchAlerts() {
  const { data } = await api.get("/alerts");
  return data;
}

export async function postCameraPredict(payload) {
  const { data } = await api.post("/camera-predict", payload);
  return data;
}

// Health check function
export async function checkBackendHealth() {
  try {
    const { data } = await api.get("/health", { timeout: 5000 });
    return data.ok === true;
  } catch (error) {
    // Fallback for deployments that expose health outside the /api prefix.
    if (api.defaults.baseURL?.endsWith("/api")) {
      try {
        const fallbackBaseUrl = api.defaults.baseURL.slice(0, -4);
        const { data } = await axios.get(`${fallbackBaseUrl}/health`, { timeout: 5000 });
        return data.ok === true;
      } catch {
        // Ignore fallback error and return false below.
      }
    }
    console.error("Backend health check failed:", error.message);
    return false;
  }
}

export default api;
