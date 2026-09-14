<sub>_Your name_ · _your.email@example.com_ · _your role_ · _YYYY-MM-DD_</sub>

# AI Product Management — Contract Sentinel
#### _An AI contract-review copilot for Meridian's legal team_

Contract Sentinel reads an inbound contract redline, flags every clause that departs from Meridian's negotiation playbook, rates its severity, and drafts a suggested counter — citing the playbook clause behind each call, or badging it "Unverified." A human lawyer approves before anything is logged; nothing is ever sent to the counterparty. Built end to end across six stages.

---

## The need — start here
- **Who asked, and what's broken:** Meridian's Deputy GC. Legal is the deal bottleneck — ~60 contracts/month, two lawyers reading line by line, 6-day turnaround, and inconsistent positions because the playbook isn't applied uniformly.
- **The metric to move:** contract review turnaround **6 days → ≤2**; ≥90% of positions traceable to the playbook.
- **Is AI right, and where:** Yes, for triage/flag/draft — the repetitive first pass. No, for the legal position itself (human owns it) and anything customer-facing (blocked). AI reduces lawyer time on the same five recurring issues; it must never author a binding position.

---

## Module artefacts
### 01 · Prompting
- [`01-prompting/system-prompt.md`](01-prompting/system-prompt.md) · [`01-prompting/prototype.md`](01-prompting/prototype.md)
### 02 · Strategy
- [`02-strategy/decision-matrix.md`](02-strategy/decision-matrix.md) · [`02-strategy/strategy-one-pager.md`](02-strategy/strategy-one-pager.md)
### 03 · Grounding & PRD
- [`03-rag-prd/prd.md`](03-rag-prd/prd.md) · [`03-rag-prd/harness-diff.md`](03-rag-prd/harness-diff.md)
### 04 · AI-Native UX
- [`04-ai-ux/user-flow.md`](04-ai-ux/user-flow.md) · [`04-ai-ux/trust-gaps.md`](04-ai-ux/trust-gaps.md)
### 05 · Agentic Workflow
- [`05-agentic-workflows/awspec.md`](05-agentic-workflows/awspec.md) · [`05-agentic-workflows/agent-control-panel.md`](05-agentic-workflows/agent-control-panel.md)
### 06 · Evals & Guardrails
- [`06-evals/eval-stack.md`](06-evals/eval-stack.md) · [`06-evals/human-rubric.md`](06-evals/human-rubric.md)

Corpus: [`corpus/negotiation-playbook.md`](corpus/negotiation-playbook.md) (source of truth) · [`corpus/sample-contract.md`](corpus/sample-contract.md) (test input).

---

## PM Execution Plan

### Where it is today
Copilot, not agent. A clickable prototype runs the full harness deterministically — tool trace, bounded loop, a log-position confirmation gate, and a verification gate that cites the playbook or badges "Unverified." Not yet wired to a live model or the contract-management system.

### What ships next (2 sprints)
Sprint 1 — real grounding: `search_playbook()` / `read_precedents()` over the live playbook (in git) and the deal-precedent store; verification gate live; `log_position()` rejects unverified. Sprint 2 — the triage agent (M5): on contract upload, produce a ranked risk memo for the reviewing lawyer, with confidence routing. Permissions stay: read/draft auto, log confirm, send-to-counterparty blocked.

### What I watch (dashboards)
Turnaround (6d → ≤2d); % positions traceable to playbook (≥90%); lawyer-hours/contract; unverified-flag rate; p95 latency < 8s.

### Red lines (numbers, not feelings)
0 customer-facing sends (send stays blocked in V1). 0 positions logged without a verbatim playbook citation. >50% unverified in a run → banner, do not present the memo. Playbook unreachable → review nothing, don't guess. Any hallucinated clause in eval → block release.

### Governance
_Compliance · Safety · Reliability · Reputation._
Compliance: no client PII persisted; privileged material stays in-tenant. Safety: send blocked, log confirm, no waiver of rights without a human. Reliability: 5-turn ceiling, escalate after 3 failed calls, no fallback to model judgement when the playbook is missing. Reputation: nothing reaches a counterparty from the tool — the failure that "waives a right" is designed out.

---

## Build Insights
- **Friction point.** The hardest call was severity, not detection — deciding "walk-away vs negotiate" is exactly where a model wants to improvise, and exactly where it must instead cite the playbook or abstain.
- **Key learning.** In a legal domain the permission tiers almost design themselves: a wrong flag costs a lawyer a minute, a wrong sent position waives a right. That asymmetry is why `send` is blocked outright rather than gated.
- **Aha moment.** The "Verified + Not Recommended" pattern reappears here as "real playbook clause, but the counterparty term is fine / out of scope" — and the competitor-driven logo ask gets flagged as an anti-pattern, not a legal risk. Same lesson as Juno, different domain.

## Repo structure

```
contract-sentinel/
├── README.md                    ← this dashboard + pitch
├── brief.md                     ← the starting need (Meridian legal)
├── corpus/
│   ├── negotiation-playbook.md  ← source of truth
│   └── sample-contract.md       ← test input (redline)
├── 01-prompting/
│   ├── system-prompt.md
│   ├── prototype.md
│   └── contract-sentinel.jsx    ← clickable harness prototype
├── 02-strategy/
│   ├── decision-matrix.md
│   └── strategy-one-pager.md
├── 03-rag-prd/
│   ├── prd.md
│   └── harness-diff.md
├── 04-ai-ux/
│   ├── user-flow.md
│   └── trust-gaps.md
├── 05-agentic-workflows/
│   ├── awspec.md
│   └── agent-control-panel.md
└── 06-evals/
    ├── eval-stack.md
    └── human-rubric.md
```

---

_Certification-style submission · Contract Sentinel._
