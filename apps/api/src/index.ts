import "express-async-errors";
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { env } from "./env";
import { attachUser } from "./lib/auth";
import { HttpError } from "./lib/errors";
import { authRouter } from "./routes/auth";
import { publicRouter } from "./routes/public";
import { customerRouter } from "./routes/customer";
import { partnerRouter } from "./routes/partner";
import { adminRouter } from "./routes/admin";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(attachUser);

app.get("/health", (_req, res) => res.json({ ok: true, name: "bookmystylo-api" }));
app.use("/auth", authRouter);
app.use("/", publicRouter);
app.use("/customer", customerRouter);
app.use("/partner", partnerRouter);
app.use("/admin", adminRouter);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));
const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") return res.status(401).json({ error: "Session expired — sign in again" });
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
};
app.use(onError);

app.listen(env.PORT, () => console.log(`BookMyStylo API → http://localhost:${env.PORT}`));
