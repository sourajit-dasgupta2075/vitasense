import { useMemo, useState } from "react";
import { Heart, ShieldCheck } from "lucide-react";
import { loginUser, registerUser } from "../lib/api";

const initialForm = {
  name: "",
  email: "",
  password: ""
};

export default function AuthPanel({ mode = "login", onModeChange, onAuthSuccess, onCancel, currentUser }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const heading = useMemo(() => {
    return mode === "login" ? "Welcome back" : "Create your VitaSense account";
  }, [mode]);

  const subheading = useMemo(() => {
    return mode === "login"
      ? "Sign in to access your personalized dashboard, monitoring tools, and doctor workflow."
      : "Register once to save your account and unlock secure access to the monitoring workspace.";
  }, [mode]);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const payload =
        mode === "login"
          ? {
              email: form.email,
              password: form.password
            }
          : {
              name: form.name,
              email: form.email,
              password: form.password
            };

      const response = mode === "login" ? await loginUser(payload) : await registerUser(payload);

      setMessage(response.message || (mode === "login" ? "Logged in successfully" : "Account created successfully"));
      setForm(initialForm);
      onAuthSuccess?.(response.user);
    } catch (submitError) {
      setError(submitError?.response?.data?.message || submitError.message || "Unable to authenticate");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-6 py-8 text-white md:px-10">
      <div className="aurora-bg absolute inset-0" />
      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1320px] gap-8 xl:grid-cols-[1.05fr,0.95fr] xl:items-center">
        <section className="rounded-[36px] border border-white/10 bg-white/7 p-7 backdrop-blur md:p-10">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-[#05213f]">
              <Heart className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-[0.08em]">VitaSense</h1>
              <p className="text-sm uppercase tracking-[0.28em] text-white/70">Secure patient access</p>
            </div>
          </div>

          <div className="mt-10 max-w-2xl">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/8 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              <ShieldCheck className="h-4 w-4" />
              Account protection enabled
            </div>
            <h2 className="mt-6 text-5xl font-black leading-[1.02] md:text-6xl">
              Sign up once.
              <span className="block bg-gradient-to-r from-white to-[var(--accent)] bg-clip-text text-transparent">
                Monitor with confidence.
              </span>
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
              Access your dashboard, keep track of vital trends, and return to your monitoring workspace with a secure login.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <FeatureCard title="Secure account access" description="Your account session is stored locally and attached to API calls automatically." />
              <FeatureCard title="Fast return to dashboard" description="Once signed in, users can jump directly into the live monitoring experience." />
              <FeatureCard title="Registration included" description="New users can create an account with name, email, and password." />
              <FeatureCard title="Fits the current stack" description="Built into the existing React + Express + Firestore flow already running in this repo." />
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-white/10 bg-[rgba(10,24,55,0.76)] p-7 shadow-[0_30px_90px_rgba(6,16,43,0.45)] backdrop-blur md:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-white/55">Account</p>
              <h3 className="mt-2 text-3xl font-black">{heading}</h3>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/70">{subheading}</p>
            </div>
            {currentUser ? (
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                Signed in as <span className="font-semibold">{currentUser.name}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-8 inline-flex rounded-full border border-white/10 bg-white/6 p-1">
            <button
              type="button"
              onClick={() => onModeChange?.("login")}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition ${mode === "login" ? "bg-white text-[#0e2147]" : "text-white/75 hover:text-white"}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => onModeChange?.("signup")}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition ${mode === "signup" ? "bg-white text-[#0e2147]" : "text-white/75 hover:text-white"}`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {mode === "signup" ? (
              <Field
                label="Full name"
                placeholder="Ariana Smith"
                value={form.name}
                onChange={(value) => updateField("name", value)}
                autoComplete="name"
              />
            ) : null}

            <Field
              label="Email address"
              placeholder="you@example.com"
              type="email"
              value={form.email}
              onChange={(value) => updateField("email", value)}
              autoComplete="email"
            />

            <Field
              label="Password"
              placeholder="At least 8 characters"
              type="password"
              value={form.password}
              onChange={(value) => updateField("password", value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />

            {error ? <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
            {message ? <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{message}</div> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] px-6 py-4 text-base font-black text-[#05213f] shadow-[0_18px_60px_rgba(104,239,255,0.24)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Please wait..." : mode === "login" ? "Login to VitaSense" : "Create account"}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-2xl border border-white/12 bg-white/6 px-6 py-4 text-sm font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
            >
              Back to landing page
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", autoComplete }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-white/80">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-4 text-white outline-none transition placeholder:text-white/35 focus:border-[var(--accent)] focus:bg-white/10"
      />
    </label>
  );
}

function FeatureCard({ title, description }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/6 p-5">
      <p className="text-base font-bold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-white/68">{description}</p>
    </div>
  );
}
