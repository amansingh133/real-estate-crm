import dotenv from "dotenv";

dotenv.config();

const required = ["MONGODB_URI", "JWT_SECRET"];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.error(
    `❌ Missing required environment variables: ${missing.join(", ")}`,
  );
  process.exit(1);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  apiPrefix: process.env.API_PREFIX || "/api/v1",

  mongodbUri: process.env.MONGODB_URI,

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  otp: {
    expiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES) || 10,
    length: Number(process.env.OTP_LENGTH) || 6,
  },

  emailjs: {
    serviceId: process.env.EMAILJS_SERVICE_ID,
    templateId: process.env.EMAILJS_TEMPLATE_ID,
    publicKey: process.env.EMAILJS_PUBLIC_KEY,
    privateKey: process.env.EMAILJS_PRIVATE_KEY,
  },

  firebase: {
    enabled: process.env.FCM_ENABLED === "true",
    // serviceAccountPath: process.env.FCM_SERVICE_ACCOUNT_PATH,
    serviceAccountBase64: process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
  },

  reminder: {
    // How many minutes before a follow-up/visit to start reminding
    leadMinutes: Number(process.env.REMINDER_LEAD_MINUTES) || 30,
    // How often (minutes) the cron job checks for due reminders
    cronIntervalMinutes:
      Number(process.env.REMINDER_CRON_INTERVAL_MINUTES) || 5,
  },

  corsOrigin: process.env.CORS_ORIGIN || "*",
};
