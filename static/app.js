const state = {
  authMode: "login",
  activeScreen: "auth",
  me: null,
  dashboard: null,
};

const screenLabels = [
  ["auth", "Account"],
  ["dashboard", "Dashboard"],
  ["metrics", "Biometrics"],
  ["care", "Care Planner"],
  ["reflect", "Reflection"],
];

const formSchemas = {
  metricForm: [
    ["log_date", "Date", "date"],
    ["weight_kg", "Weight (kg)", "number", { step: "0.1" }],
    ["sleep_hours", "Sleep (hours)", "number", { step: "0.1" }],
    ["hydration_liters", "Hydration (liters)", "number", { step: "0.1" }],
    ["heart_rate", "Heart Rate", "number"],
    ["systolic", "Systolic", "number"],
    ["diastolic", "Diastolic", "number"],
    ["steps", "Steps", "number"],
    ["mood_score", "Mood (1-10)", "number", { min: "1", max: "10" }],
    ["energy_score", "Energy (1-10)", "number", { min: "1", max: "10" }],
    ["notes", "Notes", "textarea"],
  ],
  symptomForm: [
    ["category", "Category", "text"],
    ["severity", "Severity (1-10)", "number", { min: "1", max: "10" }],
    ["trigger_hint", "Possible Trigger", "text"],
    ["notes", "Notes", "textarea"],
  ],
  medicationForm: [
    ["name", "Medication", "text"],
    ["dosage", "Dosage", "text"],
    ["frequency", "Frequency", "text"],
    ["purpose", "Purpose", "text"],
  ],
  appointmentForm: [
    ["title", "Title", "text"],
    ["provider", "Provider", "text"],
    ["scheduled_for", "Date & Time", "datetime-local"],
    ["location", "Location", "text"],
    ["notes", "Notes", "textarea"],
  ],
  reminderForm: [
    ["title", "Reminder", "text"],
    ["reminder_time", "Time", "time"],
    ["channel", "Channel", "select", { options: ["in-app", "push", "email"] }],
    ["status", "Status", "select", { options: ["scheduled", "taken", "missed"] }],
  ],
  goalForm: [
    ["title", "Goal", "text"],
    ["target_value", "Target", "text"],
    ["progress_value", "Current Progress", "text"],
    ["status", "Status", "select", { options: ["active", "completed", "paused"] }],
    ["due_date", "Due Date", "date"],
  ],
  journalForm: [
    ["entry_date", "Date", "date"],
    ["mood_label", "Mood", "text"],
    ["gratitude", "Gratitude", "textarea"],
    ["reflection", "Reflection", "textarea"],
  ],
  profileForm: [
    ["name", "Name", "text"],
    ["age", "Age", "number"],
    ["blood_type", "Blood Type", "text"],
    ["emergency_contact", "Emergency Contact", "text"],
  ],
};

document.addEventListener("DOMContentLoaded", async () => {
  renderNav();
  renderForms();
  bindStaticEvents();
  const auth = await api("/api/auth/me");
  if (auth.authenticated) {
    state.me = auth.user;
    await loadDashboard();
    showScreen("dashboard");
  } else {
    showScreen("auth");
  }
});

function renderNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = "";
  screenLabels.forEach(([id, label]) => {
    const button = document.createElement("button");
    button.textContent = label;
    button.dataset.screen = id;
    button.addEventListener("click", () => showScreen(id));
    nav.appendChild(button);
  });
}

function renderForms() {
  Object.entries(formSchemas).forEach(([id, schema]) => {
    const form = document.getElementById(id);
    form.innerHTML = "";
    schema.forEach(([name, label, type, options = {}]) => {
      const wrap = document.createElement("label");
      const labelNode = document.createElement("span");
      labelNode.textContent = label;
      wrap.appendChild(labelNode);
      let field;
      if (type === "textarea") {
        field = document.createElement("textarea");
      } else if (type === "select") {
        field = document.createElement("select");
        options.options.forEach((value) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = value;
          field.appendChild(option);
        });
      } else {
        field = document.createElement("input");
        field.type = type;
      }
      field.name = name;
      Object.entries(options).forEach(([key, value]) => {
        if (key !== "options") field.setAttribute(key, value);
      });
      if (type === "date" && !field.value) field.value = new Date().toISOString().slice(0, 10);
      wrap.appendChild(field);
      form.appendChild(wrap);
    });
    const button = document.createElement("button");
    button.className = "primary-button";
    button.type = "submit";
    button.textContent = id === "profileForm" ? "Save Profile" : "Save";
    form.appendChild(button);
  });

  bindForm("metricForm", "/api/metrics", async () => loadDashboard());
  bindForm("symptomForm", "/api/symptoms", async () => loadDashboard());
  bindForm("medicationForm", "/api/medications", async () => loadDashboard());
  bindForm("appointmentForm", "/api/appointments", async () => loadDashboard());
  bindForm("reminderForm", "/api/reminders", async () => loadDashboard());
  bindForm("goalForm", "/api/goals", async () => loadDashboard());
  bindForm("journalForm", "/api/journal", async () => loadDashboard());
  bindForm("profileForm", "/api/profile", async () => {
    const profile = await api("/api/profile");
    state.me = profile;
    populateProfile(profile);
    toast("Profile updated");
  });
}

function bindStaticEvents() {
  document.querySelectorAll("[data-screen]").forEach((button) => {
    button.addEventListener("click", () => showScreen(button.dataset.screen));
  });

  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
  });

  document.getElementById("authForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = formToObject(event.currentTarget);
    const path = state.authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    try {
      const response = await api(path, "POST", data);
      state.me = response.user;
      toast(response.message);
      await loadDashboard();
      showScreen("dashboard");
    } catch (error) {
      toast(error.message || "Unable to authenticate.");
    }
  });

  document.getElementById("refreshButton").addEventListener("click", async () => {
    await loadDashboard();
    toast("Dashboard refreshed");
  });

  document.getElementById("logoutButton").addEventListener("click", async () => {
    await api("/api/auth/logout", "POST", {});
    state.me = null;
    state.dashboard = null;
    document.getElementById("logoutButton").hidden = true;
    showScreen("auth");
    toast("Signed out");
  });
}

function setAuthMode(mode) {
  state.authMode = mode;
  document.getElementById("nameField").classList.toggle("hidden", mode !== "register");
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authMode === mode);
  });
}

function showScreen(screen) {
  state.activeScreen = screen;
  document.querySelectorAll(".screen").forEach((node) => {
    node.classList.toggle("active", node.id === `screen-${screen}`);
  });
  document.querySelectorAll(".nav button").forEach((button) => {
    button.classList.toggle("active", button.dataset.screen === screen);
  });
  document.getElementById("hero").style.display = screen === "auth" && !state.me ? "grid" : "none";
}

function bindForm(formId, endpoint, onSuccess) {
  document.getElementById(formId).addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = formToObject(event.currentTarget);
    try {
      await api(endpoint, "POST", payload);
      event.currentTarget.reset();
      const todayField = event.currentTarget.querySelector('input[type="date"]');
      if (todayField) todayField.value = new Date().toISOString().slice(0, 10);
      await onSuccess();
      toast("Saved");
    } catch (error) {
      toast(error.message || "Save failed");
    }
  });
}

async function loadDashboard() {
  const dashboard = await api("/api/dashboard");
  state.dashboard = dashboard;
  document.getElementById("logoutButton").hidden = false;
  document.getElementById("welcomeTitle").textContent = `${dashboard.profile.name.split(" ")[0]}'s health cockpit`;
  renderOverview(dashboard.overview);
  renderInsights(dashboard.insights);
  renderMetricList(dashboard.metrics);
  renderSymptoms(dashboard.symptoms);
  renderMedications(await api("/api/medications"));
  renderAppointments(dashboard.appointments);
  renderGoals(dashboard.goals);
  renderReminders(dashboard.reminders);
  renderJournal(dashboard.journal_entries);
  populateProfile(dashboard.profile);
  drawTrendChart(dashboard.metrics.slice().reverse());
}

function renderOverview(overview) {
  const cards = document.getElementById("overviewCards");
  cards.innerHTML = "";
  const labels = {
    streak_days: "Tracking streak",
    active_goals: "Active goals",
    completed_goals: "Completed goals",
    upcoming_appointments: "Upcoming appointments",
    medication_adherence: "Adherence",
    journal_entries: "Journal entries",
  };
  Object.entries(overview).forEach(([key, value]) => {
    const article = document.createElement("article");
    article.className = "stat-card";
    article.innerHTML = `<span>${labels[key] || key}</span><strong>${value}${key === "medication_adherence" ? "%" : ""}</strong>`;
    cards.appendChild(article);
  });
}

function renderInsights(items) {
  const list = document.getElementById("insightList");
  list.innerHTML = "";
  items.forEach((item) => {
    const node = document.createElement("div");
    node.className = "insight";
    node.textContent = item;
    list.appendChild(node);
  });
}

function renderMetricList(items) {
  const list = document.getElementById("metricList");
  list.innerHTML = "";
  items.forEach((item) => {
    list.appendChild(
      listItem(
        `${item.log_date} · ${item.weight_kg} kg`,
        `Sleep ${item.sleep_hours}h · Hydration ${item.hydration_liters}L · Steps ${item.steps}`,
        `<span class="tag">Mood ${escapeHtml(item.mood_score)}/10</span> <span class="tag gold">Energy ${escapeHtml(item.energy_score)}/10</span>`
      )
    );
  });
}

function renderSymptoms(items) {
  const list = document.getElementById("symptomList");
  list.innerHTML = "";
  items.forEach((item) => {
    list.appendChild(
      listItem(
        item.category,
        `${item.notes || "No notes"}${item.trigger_hint ? ` · Trigger: ${item.trigger_hint}` : ""}`,
        `<span class="tag rose">Severity ${escapeHtml(item.severity)}/10</span>`
      )
    );
  });
}

function renderMedications(response) {
  const list = document.getElementById("medicationList");
  list.innerHTML = "";
  response.items.forEach((item) => {
    list.appendChild(
      listItem(
        item.name,
        `${item.dosage} · ${item.frequency}${item.purpose ? ` · ${item.purpose}` : ""}`,
        `<span class="tag">${item.active ? "Active" : "Inactive"}</span>`
      )
    );
  });
}

function renderAppointments(items) {
  const list = document.getElementById("appointmentList");
  list.innerHTML = "";
  items.forEach((item) => {
    list.appendChild(
      listItem(
        item.title,
        `${item.provider} · ${formatDateTime(item.scheduled_for)}${item.location ? ` · ${item.location}` : ""}`,
        `<span class="tag gold">${escapeHtml(item.status)}</span>`
      )
    );
  });
}

function renderGoals(items) {
  const list = document.getElementById("goalList");
  list.innerHTML = "";
  items.forEach((item) => {
    list.appendChild(
      listItem(
        item.title,
        `${item.progress_value} of ${item.target_value}${item.due_date ? ` · due ${item.due_date}` : ""}`,
        `<span class="tag ${item.status === "completed" ? "" : "gold"}">${escapeHtml(item.status)}</span>`
      )
    );
  });
}

function renderReminders(items) {
  const list = document.getElementById("reminderList");
  list.innerHTML = "";
  items.forEach((item) => {
    list.appendChild(
      listItem(
        item.title,
        `${item.reminder_time} via ${item.channel}`,
        `<span class="tag ${item.status === "missed" ? "rose" : ""}">${escapeHtml(item.status)}</span>`
      )
    );
  });
}

function renderJournal(items) {
  const list = document.getElementById("journalList");
  list.innerHTML = "";
  items.forEach((item) => {
    list.appendChild(
      listItem(
        `${item.entry_date} · ${item.mood_label}`,
        `${item.gratitude || "No gratitude note"}${item.reflection ? ` · ${item.reflection}` : ""}`,
        `<span class="tag">Reflection</span>`
      )
    );
  });
}

function populateProfile(profile) {
  const form = document.getElementById("profileForm");
  Object.entries(profile).forEach(([key, value]) => {
    const field = form.querySelector(`[name="${key}"]`);
    if (field) field.value = value ?? "";
  });
}

function listItem(title, body, meta) {
  const node = document.createElement("article");
  node.className = "list-item";
  node.innerHTML = `
    <div class="list-item-head">
      <strong>${escapeHtml(title)}</strong>
      <div>${meta}</div>
    </div>
    <p class="list-item-meta">${escapeHtml(body)}</p>
  `;
  return node;
}

function drawTrendChart(metrics) {
  const canvas = document.getElementById("trendChart");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!metrics.length) return;

  const padding = 36;
  const innerWidth = canvas.width - padding * 2;
  const innerHeight = canvas.height - padding * 2;
  const xStep = innerWidth / Math.max(metrics.length - 1, 1);

  ctx.strokeStyle = "rgba(28, 35, 31, 0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const y = padding + (innerHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  }

  const series = [
    { key: "sleep_hours", color: "#0b8f6a", scale: 1.1 },
    { key: "mood_score", color: "#d98b2b", scale: 0.8 },
    { key: "hydration_liters", color: "#d8576b", scale: 2.8 },
  ];

  series.forEach(({ key, color, scale }) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    metrics.forEach((metric, index) => {
      const x = padding + index * xStep;
      const normalized = Math.min(metric[key] * scale, 10);
      const y = padding + innerHeight - (normalized / 10) * innerHeight;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  ctx.fillStyle = "#5f695f";
  ctx.font = '12px "Plus Jakarta Sans"';
  metrics.forEach((metric, index) => {
    const x = padding + index * xStep - 14;
    ctx.fillText(metric.log_date.slice(5), x, canvas.height - 10);
  });
}

async function api(path, method = "GET", body) {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: method === "GET" ? undefined : JSON.stringify(body || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function formToObject(form) {
  const entries = new FormData(form).entries();
  const object = {};
  for (const [key, value] of entries) {
    object[key] = isFinite(value) && value !== "" ? Number(value) : value;
  }
  return object;
}

function toast(message) {
  const node = document.getElementById("toast");
  node.textContent = message;
  node.classList.add("visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("visible"), 2200);
}

function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
