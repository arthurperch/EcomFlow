import Fastify from "fastify";
import dotenv from "dotenv";
dotenv.config();

import { computeLaunchPrice, computeSustainPrice } from "@ecomflow/core";

const app = Fastify({
  logger: { transport: { target: "pino-pretty" } }
});

app.get("/health", async () => ({ ok: true }));

app.post("/price/compute", async (req: any, reply) => {
  const { mode, amazonPrice, pct, protective } = req.body || {};
  if (typeof amazonPrice !== "number") {
    return reply.code(400).send({ error: "amazonPrice required" });
  }
  if (mode === "launch") {
    return reply.send({ ebayPrice: computeLaunchPrice(amazonPrice, pct ?? 100) });
  }
  return reply.send({ ebayPrice: computeSustainPrice(amazonPrice, pct ?? 100, protective ?? []) });
});

const port = Number(process.env.PORT) || 8080;
app.listen({ port, host: "0.0.0.0" }).then(() => {
  app.log.info(`API running at http://localhost:${port}`);
});
