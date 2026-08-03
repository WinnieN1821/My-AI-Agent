import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ChatStore } from "../dist/chat-store.js";

const CONVERSATION_ID = "9d4482cf-f720-4f70-98af-e337db1a9d53";
const OTHER_CONVERSATION_ID = "1be3cc7e-f7ef-48e4-919e-d2d09f8a43cb";
const REQUEST_ID = "34ef81f9-e46e-4e22-a890-184dd5e4ae6d";

async function temporaryStore(t) {
  const directory = await mkdtemp(join(tmpdir(), "ai-solopreneur-chat-"));
  const databasePath = join(directory, "chat.sqlite");
  const store = new ChatStore(databasePath);
  t.after(async () => {
    store.close();
    await rm(directory, { recursive: true, force: true });
  });
  return { store, databasePath, directory };
}

test("a completed transcript survives closing and reopening SQLite", async (t) => {
  const { store, databasePath, directory } = await temporaryStore(t);
  store.beginTurn({
    conversationId: CONVERSATION_ID,
    agentId: "project-manager",
    requestId: REQUEST_ID,
    content: "  Plan   the launch workshop  ",
    createdAt: "2026-08-01T00:00:00.000Z",
    attachments: [
      {
        documentId: "be7ad8f0-f299-4ab8-9ddd-011c0aad2f17",
        name: "Workshop notes",
        type: "pasted-text",
        mimeType: "text/plain",
        wordCount: 42,
        characterCount: 270,
        expiresAt: "2026-08-02T00:00:00.000Z",
      },
    ],
  });
  store.completeTurn({
    conversationId: CONVERSATION_ID,
    requestId: REQUEST_ID,
    content: "Start with persistence, then add search.",
    runId: "run-1",
    createdAt: "2026-08-01T00:00:01.000Z",
  });

  const page = store.getConversationPage(CONVERSATION_ID, 100);
  assert.equal(page.conversation.title, "Plan the launch workshop");
  assert.equal(page.messages.length, 2);
  assert.equal(page.messages[0].attachments[0].name, "Workshop notes");
  assert.equal(page.messages[1].runId, "run-1");
  assert.deepEqual(store.health(), { schemaVersion: 1, quickCheck: "ok" });

  store.close();
  const reopened = new ChatStore(databasePath);
  const restored = reopened.getConversationPage(CONVERSATION_ID, 100);
  assert.deepEqual(
    restored.messages.map(({ role, content, status }) => ({
      role,
      content,
      status,
    })),
    [
      {
        role: "user",
        content: "  Plan   the launch workshop  ",
        status: "complete",
      },
      {
        role: "assistant",
        content: "Start with persistence, then add search.",
        status: "complete",
      },
    ],
  );
  reopened.close();
});

test("turn request IDs are idempotent", async (t) => {
  const { store } = await temporaryStore(t);
  const first = store.beginTurn({
    conversationId: CONVERSATION_ID,
    agentId: "project-manager",
    requestId: REQUEST_ID,
    content: "First content",
  });
  const duplicate = store.beginTurn({
    conversationId: CONVERSATION_ID,
    agentId: "project-manager",
    requestId: REQUEST_ID,
    content: "Different content must not replace the original",
  });
  assert.equal(first.user.id, duplicate.user.id);
  assert.equal(duplicate.user.content, "First content");

  const completed = store.completeTurn({
    conversationId: CONVERSATION_ID,
    requestId: REQUEST_ID,
    content: "Original reply",
  });
  const repeatedCompletion = store.completeTurn({
    conversationId: CONVERSATION_ID,
    requestId: REQUEST_ID,
    content: "Replacement reply",
  });
  assert.equal(repeatedCompletion.assistant.id, completed.assistant.id);
  assert.equal(repeatedCompletion.assistant.content, "Original reply");
});

test("a conversation cannot be reused by a different agent", async (t) => {
  const { store } = await temporaryStore(t);
  store.createConversation(CONVERSATION_ID, "project-manager");
  assert.throws(
    () => store.createConversation(CONVERSATION_ID, "another-agent"),
    /different agent/,
  );
  assert.throws(
    () =>
      store.beginTurn({
        conversationId: CONVERSATION_ID,
        agentId: "another-agent",
        requestId: REQUEST_ID,
        content: "Do not cross this agent boundary",
      }),
    /different agent/,
  );
  assert.equal(store.getConversationPage(CONVERSATION_ID, 100).messages.length, 0);
});

test("history contains only newest complete pairs within the bounds", async (t) => {
  const { store } = await temporaryStore(t);
  for (let index = 0; index < 8; index += 1) {
    const requestId = `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
    store.beginTurn({
      conversationId: CONVERSATION_ID,
      agentId: "project-manager",
      requestId,
      content: `User ${index}`,
      createdAt: `2026-08-01T00:00:${String(index * 2).padStart(2, "0")}.000Z`,
    });
    store.completeTurn({
      conversationId: CONVERSATION_ID,
      requestId,
      content: `Agent ${index}`,
      createdAt: `2026-08-01T00:00:${String(index * 2 + 1).padStart(2, "0")}.000Z`,
    });
  }
  store.beginTurn({
    conversationId: CONVERSATION_ID,
    agentId: "project-manager",
    requestId: "00000000-0000-4000-8000-999999999999",
    content: "This pending turn must be excluded",
  });

  assert.deepEqual(store.getHistory(CONVERSATION_ID, 2, 1_000), [
    { role: "user", content: "User 6" },
    { role: "assistant", content: "Agent 6" },
    { role: "user", content: "User 7" },
    { role: "assistant", content: "Agent 7" },
  ]);
  assert.deepEqual(store.getHistory(CONVERSATION_ID, 6, 14), [
    { role: "user", content: "User 7" },
    { role: "assistant", content: "Agent 7" },
  ]);
});

test("search, rename, pagination, and cascade delete use stored records", async (t) => {
  const { store } = await temporaryStore(t);
  for (const [conversationId, requestId, content, createdAt] of [
    [CONVERSATION_ID, REQUEST_ID, "Discuss the alpha launch checklist", "2026-08-01T01:00:00.000Z"],
    [OTHER_CONVERSATION_ID, "f1257ae3-60c4-4f2e-a20e-7976fd51027b", "Review bookkeeping tasks", "2026-08-01T02:00:00.000Z"],
  ]) {
    store.beginTurn({
      conversationId,
      agentId: "project-manager",
      requestId,
      content,
      createdAt,
    });
    store.completeTurn({
      conversationId,
      requestId,
      content: `Reply to ${content}`,
      createdAt,
    });
  }

  assert.equal(store.search("launch check", 50).length, 2);
  assert.equal(store.listConversations(1).conversations[0].id, OTHER_CONVERSATION_ID);
  assert.ok(store.listConversations(1).nextCursor);
  const latestMessage = store.getConversationPage(CONVERSATION_ID, 1);
  assert.equal(latestMessage.messages[0].role, "assistant");
  assert.ok(latestMessage.nextBefore);
  const earlierMessage = store.getConversationPage(
    CONVERSATION_ID,
    1,
    latestMessage.nextBefore,
  );
  assert.equal(earlierMessage.messages[0].role, "user");
  assert.equal(
    store.renameConversation(CONVERSATION_ID, "  Launch   decisions  ").title,
    "Launch decisions",
  );
  assert.equal(store.deleteConversation(CONVERSATION_ID), true);
  assert.equal(store.getConversation(CONVERSATION_ID), undefined);
  assert.equal(store.search("launch", 50).length, 0);
});

test("pending requests become interrupted after reopening", async (t) => {
  const { store, databasePath } = await temporaryStore(t);
  store.beginTurn({
    conversationId: CONVERSATION_ID,
    agentId: "project-manager",
    requestId: REQUEST_ID,
    content: "CONFIRM ABCD1234",
  });
  store.close();

  const reopened = new ChatStore(databasePath);
  const turn = reopened.getTurn(CONVERSATION_ID, REQUEST_ID);
  assert.equal(turn.user.status, "interrupted");
  assert.equal(turn.user.errorCode, "REQUEST_INTERRUPTED");
  assert.equal(turn.assistant, undefined);
  reopened.close();
});
