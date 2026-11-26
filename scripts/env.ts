// Loads .env.local then .env for scripts run with tsx (Next.js does this itself for the app).
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
