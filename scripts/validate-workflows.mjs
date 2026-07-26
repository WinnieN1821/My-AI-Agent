import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const workflowDirectory = join(projectRoot, "n8n", "workflows");
const expectedFiles = [
  "00-start-here-project-partner.json",
  "90-debug-agent-health.json",
];
const failures = [];

function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function nodeByName(workflow, name) {
  const node = workflow.nodes.find((candidate) => candidate.name === name);
  check(Boolean(node), `${workflow.name}: missing node "${name}"`);
  return node;
}

function connectionTargets(workflow, sourceName, outputType, outputIndex) {
  return (
    workflow.connections[sourceName]?.[outputType]?.[outputIndex]?.map(
      (connection) => connection.node,
    ) ?? []
  );
}

const actualFiles = (await readdir(workflowDirectory))
  .filter((file) => file.endsWith(".json"))
  .sort();
check(
  JSON.stringify(actualFiles) === JSON.stringify(expectedFiles),
  `Expected only ${expectedFiles.join(", ")} in n8n/workflows`,
);

const workflows = new Map();
for (const file of expectedFiles) {
  const raw = await readFile(join(workflowDirectory, file), "utf8");
  let workflow;
  try {
    workflow = JSON.parse(raw);
  } catch (error) {
    failures.push(`${file}: invalid JSON (${error.message})`);
    continue;
  }

  workflows.set(file, workflow);
  check(workflow.active === false, `${file}: committed workflows must be inactive`);
  check(
    workflow.meta?.testedWithN8n === "2.30.5",
    `${file}: testedWithN8n must remain pinned to 2.30.5`,
  );
  check(
    new Set(workflow.nodes.map((node) => node.id)).size === workflow.nodes.length,
    `${file}: node IDs must be unique`,
  );
  check(
    !/sk-ant-|ANTHROPIC_API_KEY|"apiKey"\s*:/i.test(raw),
    `${file}: workflow exports must not contain an Anthropic secret`,
  );
  for (const node of workflow.nodes) {
    for (const credential of Object.values(node.credentials ?? {})) {
      check(
        credential &&
          typeof credential.id === "string" &&
          typeof credential.name === "string" &&
          Object.keys(credential).every((key) => key === "id" || key === "name"),
        `${file}: credential references may contain only id and name`,
      );
    }
  }
}

const agentWorkflow = workflows.get(expectedFiles[0]);
if (agentWorkflow) {
  check(
    agentWorkflow.name === "00 - START HERE - Project Partner",
    "Agent workflow must retain the beginner-facing START HERE name",
  );
  check(
    agentWorkflow.nodes.filter((node) => node.type !== "n8n-nodes-base.stickyNote")
      .length <= 8,
    "Agent workflow must remain small enough to explain in one lesson",
  );
  check(
    agentWorkflow.settings?.executionTimeout === 50,
    "Agent workflow timeout must remain 50 seconds",
  );

  const webhook = nodeByName(agentWorkflow, "Chat Webhook");
  check(webhook?.type === "n8n-nodes-base.webhook", "Chat Webhook: wrong type");
  check(webhook?.typeVersion === 2.1, "Chat Webhook: wrong node version");
  check(webhook?.parameters?.httpMethod === "POST", "Chat Webhook: must use POST");
  check(webhook?.parameters?.path === "chat", "Chat Webhook: path must remain chat");
  check(
    webhook?.parameters?.responseMode === "responseNode",
    "Chat Webhook: must respond through Respond to Webhook",
  );

  const validation = nodeByName(agentWorkflow, "Validate and Normalise");
  const validationCode = validation?.parameters?.jsCode ?? "";
  check(validation?.type === "n8n-nodes-base.code", "Validation: wrong node type");
  check(/\.trim\(\)/.test(validationCode), "Validation: message must be trimmed");
  check(
    /message\.length > 4000/.test(validationCode),
    "Validation: 4,000-character limit is missing",
  );
  check(
    /uuidPattern\.test\(sessionId\)/.test(validationCode),
    "Validation: session UUID check is missing",
  );

  const condition = nodeByName(agentWorkflow, "Request Is Valid?");
  check(condition?.type === "n8n-nodes-base.if", "Validation branch: wrong node type");
  check(
    connectionTargets(agentWorkflow, "Request Is Valid?", "main", 0).includes(
      "Project Partner Agent",
    ),
    "Validation true branch must lead to the agent",
  );
  check(
    connectionTargets(agentWorkflow, "Request Is Valid?", "main", 1).includes(
      "Return Invalid Request",
    ),
    "Validation false branch must lead to the safe error response",
  );

  const agent = nodeByName(agentWorkflow, "Project Partner Agent");
  check(
    agent?.type === "@n8n/n8n-nodes-langchain.agent" &&
      agent?.typeVersion === 3.1,
    "Agent: expected AI Agent 3.1",
  );
  check(agent?.parameters?.promptType === "define", "Agent: prompt must be explicit");
  check(
    agent?.parameters?.text === "={{ $json.message }}",
    "Agent: must use only the normalised message",
  );
  check(
    agent?.parameters?.options?.maxIterations === 4,
    "Agent: maxIterations must remain 4",
  );
  check(
    agent?.parameters?.options?.enableStreaming === false,
    "Agent: streaming must remain disabled for the synchronous contract",
  );
  check(
    agent?.parameters?.options?.returnIntermediateSteps === false,
    "Agent: intermediate steps must not be returned",
  );

  const model = nodeByName(agentWorkflow, "Claude - Sonnet 4.6");
  check(
    model?.type === "@n8n/n8n-nodes-langchain.lmChatAnthropic" &&
      model?.typeVersion === 1.5,
    "Claude model: expected Anthropic Chat Model 1.5",
  );
  check(
    model?.parameters?.model?.value === "claude-sonnet-4-6",
    "Claude model: expected pinned claude-sonnet-4-6",
  );
  check(
    model?.parameters?.options?.maxTokensToSample === 900,
    "Claude model: output token ceiling must remain 900",
  );
  check(
    connectionTargets(agentWorkflow, "Claude - Sonnet 4.6", "ai_languageModel", 0)
      .includes("Project Partner Agent"),
    "Claude model must be connected to the agent",
  );

  const memory = nodeByName(agentWorkflow, "Conversation Memory");
  check(
    memory?.type === "@n8n/n8n-nodes-langchain.memoryBufferWindow" &&
      memory?.typeVersion === 1.4,
    "Memory: expected Simple Memory 1.4",
  );
  check(
    memory?.parameters?.sessionIdType === "customKey" &&
      /Validate and Normalise/.test(memory?.parameters?.sessionKey ?? ""),
    "Memory: must be keyed by the validated browser session",
  );
  check(
    memory?.parameters?.contextWindowLength === 6,
    "Memory: context window must remain six interactions",
  );
  check(
    connectionTargets(agentWorkflow, "Conversation Memory", "ai_memory", 0).includes(
      "Project Partner Agent",
    ),
    "Memory must be connected to the agent",
  );

  const success = nodeByName(agentWorkflow, "Return Agent Reply");
  const successBody = success?.parameters?.responseBody ?? "";
  check(
    /sessionId/.test(successBody) &&
      /reply/.test(successBody) &&
      /runId/.test(successBody),
    "Success response must retain sessionId, reply, and runId",
  );
  check(
    /slice\(0, 8000\)/.test(successBody),
    "Success response must retain the 8,000-character output ceiling",
  );

  const invalid = nodeByName(agentWorkflow, "Return Invalid Request");
  check(
    /errorCode/.test(invalid?.parameters?.responseBody ?? "") &&
      /errorMessage/.test(invalid?.parameters?.responseBody ?? ""),
    "Invalid response must use the stable error contract",
  );
}

const healthWorkflow = workflows.get(expectedFiles[1]);
if (healthWorkflow) {
  check(
    healthWorkflow.name === "90 - DEBUG - Agent Health",
    "Health workflow must retain its DEBUG name",
  );
  check(
    healthWorkflow.nodes.filter((node) => node.type !== "n8n-nodes-base.stickyNote")
      .length === 2,
    "Health workflow should contain only a webhook and response node",
  );
  check(
    healthWorkflow.nodes.every((node) => !node.credentials),
    "Health workflow must not reference credentials",
  );
  const webhook = nodeByName(healthWorkflow, "Agent Health Webhook");
  check(webhook?.parameters?.httpMethod === "GET", "Health webhook must use GET");
  check(
    webhook?.parameters?.path === "agent-health",
    "Health webhook path must remain agent-health",
  );
  const response = nodeByName(healthWorkflow, "Return Safe Health");
  const body = response?.parameters?.responseBody ?? "";
  check(
    /status/.test(body) && /service/.test(body) && !/credential|secret|environment/i.test(body),
    "Health response must contain only safe status fields",
  );
}

if (failures.length > 0) {
  console.error("Workflow validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Workflow validation passed for ${expectedFiles.length} files (n8n 2.30.5).`,
);
