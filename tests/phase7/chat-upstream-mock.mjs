import { createServer } from "node:http";

const port = Number(process.env.PORT ?? "5739");

createServer(async (request, response) => {
  if (request.method !== "POST") {
    response.writeHead(405).end();
    return;
  }
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(
    JSON.stringify({
      sessionId: body.sessionId,
      reply: `Saved reply: ${body.message}`,
      runId: `mock-${body.requestId}`,
    }),
  );
}).listen(port, "127.0.0.1", () => {
  console.log(`Chat upstream mock listening on ${port}`);
});
