
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().default(5000),

  MONGO_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32),

  JWT_EXPIRES_IN: z.string().default("1d"),

  FRONTEND_URL: z.string().url(),

  FRONTEND_URLS: z.string().optional().default(""),

  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false"),

  COOKIE_SAME_SITE: z
    .enum(["strict", "lax", "none"])
    .default("lax"),

  BCRYPT_ROUNDS: z.coerce.number().min(10).default(12)
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    "Invalid environment configuration:",
    result.error.flatten().fieldErrors
  );

  throw new Error("Invalid environment configuration.");
}

const parsedEnv = result.data;

// Production must use secure cross-origin cookies.
if (parsedEnv.NODE_ENV === "production") {
  if (
    parsedEnv.COOKIE_SECURE !== "true" ||
    parsedEnv.COOKIE_SAME_SITE !== "none"
  ) {
    throw new Error(
      "Production requires COOKIE_SECURE=true and COOKIE_SAME_SITE=none."
    );
  }
}

export const env = Object.freeze(parsedEnv);
