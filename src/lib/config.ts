import fs from "fs";
import path from "path";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

export interface D1Config {
  accountId: string;
  databaseId: string;
  apiToken: string;
}

export interface Config {
  r2: R2Config;
  d1: D1Config;
}

// Load configuration from environment variables or config.json
// Environment variables take priority over config.json
export function loadConfig(): Config {
  // Try to load from environment variables first (for Vercel/production)
  if (
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL &&
    process.env.D1_ACCOUNT_ID &&
    process.env.D1_DATABASE_ID &&
    process.env.D1_API_TOKEN
  ) {
    return {
      r2: {
        accountId: process.env.R2_ACCOUNT_ID,
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        bucketName: process.env.R2_BUCKET_NAME,
        publicUrl: process.env.R2_PUBLIC_URL,
      },
      d1: {
        accountId: process.env.D1_ACCOUNT_ID,
        databaseId: process.env.D1_DATABASE_ID,
        apiToken: process.env.D1_API_TOKEN,
      },
    };
  }

  // Fallback to config.json (for local development)
  const configPath = path.join(process.cwd(), "config.json");

  if (!fs.existsSync(configPath)) {
    throw new Error(
      "Configuration not found. Please either:\n" +
        "1. Set environment variables (for Vercel/production)\n" +
        "2. Create config.json from config.example.json (for local development)"
    );
  }

  const configContent = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(configContent) as Config;
}
