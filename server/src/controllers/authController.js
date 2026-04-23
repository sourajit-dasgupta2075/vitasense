import crypto from "crypto";
import { User, normalizeEmail, sanitizeUser, verifyPassword } from "../models/User.js";

const AUTH_SECRET = process.env.AUTH_SECRET || "vitasense-auth-secret-change-me";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf-8");
}

function signPayload(payload) {
  const payloadString = JSON.stringify(payload);
  return crypto.createHmac("sha256", AUTH_SECRET).update(payloadString).digest("base64url");
}

function createToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(payload);
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token = "") {
  const [encodedPayload, signature] = String(token).split(".");
  if (!encodedPayload || !signature) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload));
    const expectedSignature = signPayload(payload);

    if (signature !== expectedSignature) return null;
    if (!payload.exp || payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return "";
  return authHeader.slice("Bearer ".length).trim();
}

function validateRegistrationInput({ name, email, password }) {
  if (!String(name || "").trim()) return "Name is required";
  if (!String(email || "").trim()) return "Email is required";
  if (!String(password || "").trim()) return "Password is required";
  if (!String(email).includes("@")) return "Email address is invalid";
  if (String(password).length < 8) return "Password must be at least 8 characters long";
  return "";
}

function validateLoginInput({ email, password }) {
  if (!String(email || "").trim()) return "Email is required";
  if (!String(password || "").trim()) return "Password is required";
  return "";
}

export async function register(req, res, next) {
  try {
    const message = validateRegistrationInput(req.body || {});
    if (message) {
      return res.status(400).json({ message });
    }

    const existingUser = await User.findByEmail(req.body.email);
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const user = await User.create({
      name: req.body.name,
      email: normalizeEmail(req.body.email),
      password: req.body.password
    });

    const token = createToken(user);

    return res.status(201).json({
      message: "Account created successfully",
      token,
      user
    });
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const message = validateLoginInput(req.body || {});
    if (message) {
      return res.status(400).json({ message });
    }

    const user = await User.findByEmail(req.body.email);
    if (!user || !verifyPassword(req.body.password, user.passwordHash)) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = createToken(user);

    return res.json({
      message: "Logged in successfully",
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const token = getBearerToken(req);
    const payload = verifyToken(token);

    if (!payload?.sub) {
      return res.status(401).json({
        authenticated: false,
        message: "Authentication required"
      });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({
        authenticated: false,
        message: "User not found"
      });
    }

    return res.json({
      authenticated: true,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return next(error);
  }
}

export async function logout(_req, res) {
  return res.json({
    message: "Logged out successfully"
  });
}
