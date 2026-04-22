import app from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { seedReadings } from "./seed.js";

async function bootstrap() {
  await connectDb();
  await seedReadings();
  app.listen(env.port, () => {
    console.log(`VitaSense server running on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start VitaSense server", error);
  process.exit(1);
});
