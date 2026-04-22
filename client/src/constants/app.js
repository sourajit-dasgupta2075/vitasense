import {
  Activity,
  AlertTriangle,
  BellRing,
  Brain,
  Camera,
  Droplets,
  Gauge,
  Heart,
  LayoutGrid,
  FileBarChart2,
  MessageSquareWarning,
  Moon,
  PhoneCall,
  Settings as SettingsIcon,
  Shield,
  Siren,
  Stethoscope,
  Thermometer,
  User,
  UserRoundPlus,
  Waves,
  Wind,
  MapPin
} from "lucide-react";

export const navItems = [
  { label: "Dashboard", icon: LayoutGrid },
  { label: "Live Monitoring", icon: Activity },
  { label: "Camera Mode", icon: Camera },
  { label: "Analytics", icon: FileBarChart2 },
  { label: "Profile", icon: User },
  { label: "Doctor Connect", icon: Stethoscope },
  { label: "Emergency", icon: AlertTriangle },
  { label: "Settings", icon: SettingsIcon }
];

export const chartRanges = [
  { key: "1m", label: "1 min" },
  { key: "10m", label: "10 min" },
  { key: "1h", label: "1 hour" },
  { key: "24h", label: "24 hours" }
];

export const doctorPatients = [];

export const emergencyActions = [
  { icon: MessageSquareWarning, text: "Send SMS to contacts" },
  { icon: PhoneCall, text: "Alert your doctor" },
  { icon: MapPin, text: "Share live location" },
  { icon: BellRing, text: "Push vitals data" }
];

export const doctorStats = [
  { icon: UserRoundPlus, title: "Stable Patients", value: "0", badge: "Waiting", badgeTone: "green" },
  { icon: AlertTriangle, title: "Need Attention", value: "0", badge: "None", badgeTone: "amber" },
  { icon: Siren, title: "Critical Cases", value: "0", badge: "None", badgeTone: "red" },
  { icon: Gauge, title: "Avg Daily Readings", value: "0", badge: "", badgeTone: "sky", highlight: true }
];

export function getDashboardCards(latest) {
  return [
    {
      label: "Heart Rate",
      value: latest.heartRate,
      unit: "BPM",
      note: latest.heartRate >= 100 ? "Elevated" : "Stable",
      icon: Heart,
      accent: latest.heartRate >= 100 ? "amber" : "sky",
      chart: "wave"
    },
    {
      label: "SpO2 Level",
      value: latest.spo2,
      unit: "%",
      note: latest.spo2 < 95 ? "Watch closely" : "Healthy",
      icon: Waves,
      accent: latest.spo2 < 95 ? "amber" : "sky"
    },
    {
      label: "Hemoglobin",
      value: "13.2",
      unit: "g/dL",
      note: "Trending steady",
      icon: Droplets,
      accent: "amber"
    },
    {
      label: "Hydration Index",
      value: "82",
      unit: "%",
      note: "Improving",
      icon: Wind,
      accent: "sky"
    },
    {
      label: "Stress Index",
      value: "35",
      unit: "/100",
      note: latest.motion > 2 ? "Active" : "Balanced",
      icon: Brain,
      accent: "sky"
    },
    {
      label: "Body Temperature",
      value: typeof latest.temperature === "number" ? latest.temperature.toFixed(1) : latest.temperature,
      unit: "C",
      note: latest.temperature > 37.8 ? "Elevated" : "Normal",
      icon: Thermometer,
      accent: latest.temperature > 37.8 ? "amber" : "sky"
    },
    {
      label: "Sleep Quality",
      value: "8.2",
      unit: "/10",
      note: "Restored",
      icon: Moon,
      accent: "sky"
    },
    {
      label: "Infection Risk",
      value: latest.status === "critical" ? "34" : latest.status === "warning" ? "18" : "5",
      unit: "%",
      note: latest.status === "critical" ? "Escalating" : "Low",
      icon: Shield,
      accent: latest.status === "normal" ? "sky" : "amber"
    }
  ];
}
