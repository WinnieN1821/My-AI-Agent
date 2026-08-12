# Sales Agent

AI Solopreneur / MLAI 2026

Work log covering Wednesday 5 August 2026 to Wednesday 12 August 2026, ending
with the Sales agent going live in the agents panel.

## What exists now

| Piece | State |
|---|---|
| Chat app | http://localhost:3000 |
| n8n editor | http://localhost:5678 |
| Document reader | internal port 3100 |
| Chat database | `data/chat/chat.sqlite`, schema 2, WAL |
| n8n workflows | 14 |
| Enabled skills | 5 |
| Active agents | Project Manager, Sales |

Marketing, Investment and Bookkeeping remain "Coming soon".

## The Sales agent

The Sales card is now a working agent rather than a placeholder. It reuses the
existing `/webhook/chat` entry point and the existing `Anthropic account`
credential, so there is no second workflow and no second API key.

Three files carry it:

- `apps/chat/config/agents.json` — `sales` moves from `coming-soon` to
  `active`, and gains a workflow path, a sales-specific description, and three
  example prompts.
- `n8n/workflows/00-start-here-project-partner.json` — the request validator's
  allow-list widens from `agentId !== 'project-manager'` to
  `['project-manager', 'sales'].includes(agentId)`. This is the actual gate:
  without it the gateway rejects Sales traffic with "That agent is not
  available yet."
- `scripts/validate-workflows.mjs` — the matching assertion.

Its three example prompts are: draft a reply to an enquiry, turn call notes
into a recap and proposal, and write a cold email.

Verified live: selecting Sales and asking for a cold email returned a real
Claude reply, and that reply drew on the saved domain research — so business
memory is shared across agents, not siloed per agent.

## How the work got here

### Durable chat persistence (Wed 5 August)

Integrated upstream PR #16 at commit `e7c9016`. Chats are now stored in SQLite
at `data/chat/chat.sqlite` instead of living only in the browser: saved user
and assistant messages, restore after restart, browsing and full-text search,
rename and delete, pagination, per-conversation memory, bounded history sent to
n8n, interrupted and failed states, and duplicate-request protection via a
`UNIQUE (conversation_id, request_id, role)` constraint. There is no
process-only Simple Memory node.

The histories were unrelated — this project began from a GitHub template, which
shares no ancestry with the course repository. A plain merge would have
produced false conflicts across all 106 files. The fix was to graft onto the
true base `24e8234`, merge cleanly, then drop the graft, leaving a normal
two-parent merge commit.

Automated CI and test infrastructure was removed in the same pass. Upstream had
already deleted the tracked files; what remained were empty directories Git does
not track, plus two release docs still gating on "CI is green".

### Domain Research Memory skill (Wed 12 August)

Added from upstream branch `skill/domain-research` at `b7ccb241`. Point the
agent at a domain you own; it reads that domain's public home page, analyses it
with Claude, and saves the result locally. Workflows 50, 51 and 52 handle
start, completion check, and memory read. Findings land in the
`business_memory` and `domain_research_jobs` tables.

That commit sits on upstream `main`, which carries features this project has
not taken, so only the commit's own diff was applied rather than merging the
branch. Two conflicts were resolved by combining: the chat app's
`/api/profile` endpoint was dropped because it depends on a profile-store
module that does not exist here and would not compile, while the
domain-research endpoints were kept; and the validator's exact-match skill
assertion was replaced with upstream's reviewed-plus-optional check, which
would otherwise have failed as soon as a fifth skill was enabled.

Research on `collabmtm.com` returned a `partial`, low-confidence result because
that home page is a sparse sitemap-style index. The skill reported this plainly
rather than padding the gaps.

### Upstream defect found while deploying

`chat-store.ts` migrates the chat database to schema 2, but `scripts/local.mjs`
still asserted schema 1. Diagnostics reported a false failure on a healthy
database, and more seriously `restore` would have rejected any backup taken
after the upgrade. Both checks now accept schema 1 or 2, since the chat app
migrates on open. This was verified as an upstream issue, not a local merge
artefact.

### Interface fixes (Wed 12 August)

Two layout overlaps in the chat app:

- The sidebar sections shrank below their own content on a short window. The
  inner grids do not shrink and the sections do not clip, so agent cards
  painted over the CHATS section — measured at 161px of overlap. Sections now
  hold their natural height, so the panel scrolls as it was always meant to.
- A long conversation title ran underneath the header buttons instead of
  truncating, overhanging by 81px, because its wrapper could not shrink.

Both verified across six viewport sizes from 375x812 to 1280x1100.

## Known limits

Domain research reads **one page** — the home page. It has no search engine and
no keyword tool, so its seed keywords carry no search volumes and no difficulty
scores. Most competitors it returns are labelled `inference`, meaning the model
suggested them from general knowledge rather than finding them on the page;
they are leads to verify, not findings. It cannot read sites that build their
content with JavaScript after loading.

Every agent still opens with the same greeting text, which names the Project
Manager, because `welcomeMessage` in `apps/chat/public/agent.config.js` is a
single global string and upstream has no per-agent greeting field. The Sales
agent therefore introduces itself as the Project Manager until that copy is
changed.

Chats and research are stored in **plaintext** on this machine, inside a
OneDrive-synced folder.

## Branches

| Branch | Purpose |
|---|---|
| `main` | untouched template state |
| `chat-persistence-update` | persistence integration |
| `domain-research-integration` | domain-research skill and interface fixes |
| `sales-agent-integration` | Sales agent activation, current |
| `safety/pre-chat-persistence-20260729` | safety point |
| `safety/pre-domain-research-20260812` | safety point |
| `safety/pre-sales-agent-20260812` | safety point |

Nothing has been pushed. `data/`, `.env`, `backups/`, `.runtime/` and
`node_modules/` remain untracked throughout.
