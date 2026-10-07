export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  JWT_SECRET: process.env.JWT_SECRET ?? "dev-secret-change-me",
  OTP_DEV_REVEAL: (process.env.OTP_DEV_REVEAL ?? "true") !== "false",
  NODE_ENV: process.env.NODE_ENV ?? "development",
};
