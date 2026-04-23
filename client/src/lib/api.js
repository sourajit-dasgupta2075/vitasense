import axios from "axios";

const AUTH_TOKEN_KEY = "vitasense.auth.token";

export function getStoredAuthToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

export function setStoredAuthToken(token) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  timeout: 15000,
  headers: {
    Connection: "keep-alive"
  }
});

api.interceptors.request.use((config) => {
  const token = getStoredAuthToken();

  config.params = {
    ...config.params,
    _t: Date.now()
  };

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`
    };
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (!config || !config.retry) {
      config.retry = 3;
      config.retryDelay = 1000;
    }

    if (config.retry > 0 && (
      error.code === "ECONNABORTED" ||
      error.code === "ENOTFOUND" ||
      error.code === "ECONNREFUSED" ||
      (error.response && error.response.status >= 500)
    )) {
      config.retry--;

      const delay = config.retryDelay * Math.pow(2, 3 - config.retry);
      console.log(`Retrying request in ${delay}ms... (${config.retry} attempts left)`);

      await new Promise((resolve) => setTimeout(resolve, delay));
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

export async function checkBackendHealth() {
  try {
    const { data } = await api.get("/health", { timeout: 5000 });
    return data.ok === true;
  } catch (error) {
    if (api.defaults.baseURL?.endsWith("/api")) {
      try {
        const fallbackBaseUrl = api.defaults.baseURL.slice(0, -4);
        const { data } = await axios.get(`${fallbackBaseUrl}/health`, { timeout: 5000 });
        return data.ok === true;
      } catch {
        // Ignore fallback error.
      }
    }
    console.error("Backend health check failed:", error.message);
    return false;
  }
}

export async function registerUser(payload) {
  const { data } = await api.post("/auth/register", payload);
  if (data.token) {
    setStoredAuthToken(data.token);
  }
  return data;
}

export async function loginUser(payload) {
  const { data } = await api.post("/auth/login", payload);
  if (data.token) {
    setStoredAuthToken(data.token);
  }
  return data;
}

export async function fetchCurrentUser() {
  const { data } = await api.get("/auth/me");
  return data;
}

export async function logoutUser() {
  try {
    const { data } = await api.post("/auth/logout");
    return data;
  } finally {
    setStoredAuthToken("");
  }
}

export default api;
