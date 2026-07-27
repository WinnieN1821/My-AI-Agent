import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const workflowDirectory = join(projectRoot, "n8n", "workflows");
const expectedFiles = [
  "00-start-here-project-partner.json",
  "10-setup-local-task-data.json",
  "20-tool-list-tasks.json",
  "21-tool-create-task.json",
  "22-tool-update-task-status.json",
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
      .length <= 9,
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

  const listTool = nodeByName(agentWorkflow, "list_tasks");
  check(
    listTool?.type === "@n8n/n8n-nodes-langchain.toolWorkflow" &&
      listTool?.typeVersion === 2.2,
    "Agent: expected Call n8n Workflow Tool 2.2 for list_tasks",
  );
  check(
    listTool?.parameters?.workflowId?.value === "phase4ListTasks",
    "Agent: list_tasks must call the reviewed list subworkflow",
  );
  check(
    connectionTargets(agentWorkflow, "list_tasks", "ai_tool", 0).includes(
      "Project Partner Agent",
    ),
    "Agent: list_tasks must be connected as an AI tool",
  );
  const connectedToolNames = Object.entries(agentWorkflow.connections)
    .filter(([, connection]) => Array.isArray(connection.ai_tool))
    .map(([name]) => name);
  check(
    JSON.stringify(connectedToolNames) === JSON.stringify(["list_tasks"]),
    "Agent: Phase 4 may connect only the read-only list_tasks tool",
  );
  check(
    !agentWorkflow.nodes.some((node) =>
      ["create_task", "update_task_status"].includes(node.name),
    ),
    "Agent: write tools must stay disconnected until Phase 5 confirmation",
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

const setupWorkflow = workflows.get("10-setup-local-task-data.json");
if (setupWorkflow) {
  check(
    setupWorkflow.name === "10 - SETUP - Local Task Data",
    "Setup workflow must retain its learner-facing name",
  );
  const tasksTable = nodeByName(setupWorkflow, "Create Tasks Table");
  const taskColumns =
    tasksTable?.parameters?.columns?.column?.map((column) => column.name) ?? [];
  check(
    JSON.stringify(taskColumns) ===
      JSON.stringify([
        "requestId",
        "lastRequestId",
        "title",
        "description",
        "status",
        "priority",
        "dueDate",
      ]),
    "Setup: tasks table schema changed unexpectedly",
  );
  check(
    tasksTable?.parameters?.options?.createIfNotExists === true,
    "Setup: tasks table creation must remain repeatable",
  );
  const auditTable = nodeByName(setupWorkflow, "Create Tool Audit Table");
  const auditColumns =
    auditTable?.parameters?.columns?.column?.map((column) => column.name) ?? [];
  check(
    JSON.stringify(auditColumns) ===
      JSON.stringify([
        "occurredAt",
        "sessionId",
        "requestId",
        "toolName",
        "proposedInput",
        "result",
        "error",
      ]),
    "Setup: tool audit schema changed unexpectedly",
  );
  check(
    auditTable?.parameters?.options?.createIfNotExists === true,
    "Setup: audit table creation must remain repeatable",
  );
  const setupWebhook = nodeByName(setupWorkflow, "Temporary Setup Webhook");
  check(
    setupWebhook?.parameters?.httpMethod === "POST" &&
      setupWebhook?.parameters?.path === "setup-task-data" &&
      setupWebhook?.parameters?.responseMode === "lastNode",
    "Setup: temporary webhook must remain a synchronous local POST",
  );
  const sampleCode =
    nodeByName(setupWorkflow, "Define Sample Tasks")?.parameters?.jsCode ?? "";
  check(
    (sampleCode.match(/00000000-0000-4000-8000-00000000010[1-3]/g) ?? [])
      .length === 3,
    "Setup: expected exactly three stable sample task request IDs",
  );
  check(
    nodeByName(setupWorkflow, "Keep Missing Samples")?.parameters?.operation ===
      "rowNotExists",
    "Setup: sample tasks must be inserted only when missing",
  );
}

const toolFiles = [
  "20-tool-list-tasks.json",
  "21-tool-create-task.json",
  "22-tool-update-task-status.json",
];
const expectedToolInputs = {
  "20-tool-list-tasks.json": ["sessionId", "status", "priority"],
  "21-tool-create-task.json": [
    "sessionId",
    "requestId",
    "title",
    "description",
    "status",
    "priority",
    "dueDate",
  ],
  "22-tool-update-task-status.json": [
    "sessionId",
    "requestId",
    "taskId",
    "status",
  ],
};
const expectedRisk = {
  "20-tool-list-tasks.json": "read",
  "21-tool-create-task.json": "write",
  "22-tool-update-task-status.json": "write",
};
const allowedToolNodeTypes = new Set([
  "n8n-nodes-base.stickyNote",
  "n8n-nodes-base.executeWorkflowTrigger",
  "n8n-nodes-base.code",
  "n8n-nodes-base.if",
  "n8n-nodes-base.dataTable",
]);

for (const file of toolFiles) {
  const workflow = workflows.get(file);
  if (!workflow) {
    continue;
  }
  const trigger = nodeByName(workflow, "Tool Input");
  const inputNames =
    trigger?.parameters?.workflowInputs?.values?.map((input) => input.name) ?? [];
  check(
    trigger?.type === "n8n-nodes-base.executeWorkflowTrigger" &&
      trigger?.typeVersion === 1.2,
    `${workflow.name}: expected typed Execute Workflow Trigger 1.2`,
  );
  check(
    JSON.stringify(inputNames) === JSON.stringify(expectedToolInputs[file]),
    `${workflow.name}: visible input schema changed unexpectedly`,
  );
  check(
    workflow.meta?.toolRisk === expectedRisk[file],
    `${workflow.name}: tool risk metadata is missing or incorrect`,
  );
  check(
    workflow.nodes.every((node) => allowedToolNodeTypes.has(node.type)),
    `${workflow.name}: tool contains a node outside the narrow allowlist`,
  );
  check(
    workflow.nodes
      .filter((node) => node.type === "n8n-nodes-base.dataTable")
      .every((node) =>
        ["tasks", "tool_audit"].includes(node.parameters?.dataTableId?.value),
      ),
    `${workflow.name}: tool may access only tasks and tool_audit`,
  );
  const auditNode = nodeByName(workflow, "Write Tool Audit");
  check(
    auditNode?.parameters?.operation === "insert" &&
      auditNode?.parameters?.dataTableId?.value === "tool_audit",
    `${workflow.name}: every result must be written to tool_audit`,
  );
  const auditFields = Object.keys(
    auditNode?.parameters?.columns?.value ?? {},
  ).sort();
  check(
    JSON.stringify(auditFields) ===
      JSON.stringify(
        [
          "error",
          "occurredAt",
          "proposedInput",
          "requestId",
          "result",
          "sessionId",
          "toolName",
        ].sort(),
      ),
    `${workflow.name}: audit mapping must retain all required fields`,
  );
}

const listWorkflow = workflows.get("20-tool-list-tasks.json");
if (listWorkflow) {
  const taskNodes = listWorkflow.nodes.filter(
    (node) =>
      node.type === "n8n-nodes-base.dataTable" &&
      node.parameters?.dataTableId?.value === "tasks",
  );
  check(
    taskNodes.length === 1 && taskNodes[0].parameters?.operation === "get",
    "list_tasks must have exactly one read-only task-table operation",
  );
  const validation =
    nodeByName(listWorkflow, "Validate List Input")?.parameters?.jsCode ?? "";
  check(
    /INVALID_STATUS/.test(validation) && /INVALID_PRIORITY/.test(validation),
    "list_tasks must validate status and priority filters",
  );
}

const createWorkflow = workflows.get("21-tool-create-task.json");
if (createWorkflow) {
  const taskOperations = createWorkflow.nodes
    .filter(
      (node) =>
        node.type === "n8n-nodes-base.dataTable" &&
        node.parameters?.dataTableId?.value === "tasks",
    )
    .map((node) => node.parameters.operation);
  check(
    JSON.stringify(taskOperations) === JSON.stringify(["get", "insert"]),
    "create_task must only look up an idempotency key and insert one task",
  );
  const validation =
    nodeByName(createWorkflow, "Validate Create Input")?.parameters?.jsCode ?? "";
  check(
    /title\.length === 0/.test(validation) &&
      /title\.length > 120/.test(validation) &&
      /description\.length > 2000/.test(validation) &&
      /INVALID_STATUS/.test(validation),
    "create_task must retain title, description, and status validation",
  );
  check(
    /IDEMPOTENCY_CONFLICT/.test(
      nodeByName(createWorkflow, "Decide Create Action")?.parameters?.jsCode ?? "",
    ),
    "create_task must reject reuse of a request ID with different input",
  );
}

const updateWorkflow = workflows.get("22-tool-update-task-status.json");
if (updateWorkflow) {
  const taskOperations = updateWorkflow.nodes
    .filter(
      (node) =>
        node.type === "n8n-nodes-base.dataTable" &&
        node.parameters?.dataTableId?.value === "tasks",
    )
    .map((node) => node.parameters.operation);
  check(
    JSON.stringify(taskOperations) === JSON.stringify(["get", "update"]),
    "update_task_status must only read a task and update it",
  );
  const updateFields = Object.keys(
    nodeByName(updateWorkflow, "Update Task Status")?.parameters?.columns?.value ??
      {},
  ).sort();
  check(
    JSON.stringify(updateFields) ===
      JSON.stringify(["lastRequestId", "status"]),
    "update_task_status may change only status and its idempotency marker",
  );
  const validation =
    nodeByName(updateWorkflow, "Validate Update Input")?.parameters?.jsCode ?? "";
  check(
    /INVALID_TASK_ID/.test(validation) && /INVALID_STATUS/.test(validation),
    "update_task_status must validate task ID and status",
  );
}

const healthWorkflow = workflows.get("90-debug-agent-health.json");
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
