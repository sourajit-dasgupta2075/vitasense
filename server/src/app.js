import express from "express";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes/dataRoutes.js";
import cameraRoutes from "./routes/camera.js";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app = express();

app.use(cors({ origin: env.clientUrl }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "vitasense-server" });
});

app.use("/api", routes);
app.use("/api", cameraRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
