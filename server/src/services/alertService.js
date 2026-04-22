import nodemailer from "nodemailer";
import { Alert } from "../models/Alert.js";
import { env } from "../config/env.js";

let transporter;

function getTransporter() {
  if (!env.alertEmailEnabled || !env.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: false,
      auth: { user: env.smtp.user, pass: env.smtp.pass }
    });
  }
  return transporter;
}

async function sendEmailAlert(alert) {
  const mailer = getTransporter();
  if (!mailer || !env.alertEmailFrom || !env.alertEmailTo || alert.level === "normal") return;

  await mailer.sendMail({
    from: env.alertEmailFrom,
    to: env.alertEmailTo,
    subject: `[VitaSense] ${alert.level.toUpperCase()} - ${alert.title}`,
    text: alert.description
  });
}

export async function maybeCreateAlerts(reading) {
  const candidates = [];

  if (reading.spo2 < 95) {
    candidates.push({
      title: "SpO2 below threshold",
      level: reading.spo2 < 92 ? "critical" : "warning",
      description: `SpO2 dropped to ${reading.spo2}%.`,
      readingId: reading.id
    });
  }

  if (reading.heartRate > 105 || reading.heartRate < 55) {
    candidates.push({
      title: "Heart rate out of range",
      level: reading.heartRate > 125 || reading.heartRate < 45 ? "critical" : "warning",
      description: `Heart rate measured at ${reading.heartRate} BPM.`,
      readingId: reading.id
    });
  }

  if (!candidates.length) return [];

  const created = await Alert.createMany(candidates);
  await Promise.all(created.map((alert) => sendEmailAlert(alert)));
  return created;
}
