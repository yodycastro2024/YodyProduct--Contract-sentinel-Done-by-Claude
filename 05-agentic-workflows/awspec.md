_Stage 05 · Agentic Workflow_

# Agent Workflow Spec (AWSpec) · Contract Sentinel

## Goal
On contract upload, produce a ranked risk memo (top clauses + cited positions) for the reviewing lawyer within minutes (risk mitigation + cycle-time). Primary actor: Agent + human-in-the-loop.

## Trigger
A new contract is uploaded to a matter AND is over the $50k review threshold.

## Steps & tools
_Pattern: ReAct (reason-act-observe), one tool per turn._

| Step | Action | Tool (scope) | Guardrail |
|---|---|---|---|
| 1 | Pull comparable prior deals | precedents.read(filter) — read | read-only |
| 2 | For each clause, retrieve playbook position | playbook.retrieve(query,k=6) — read | verbatim-cite or abstain |
| 3 | Score severity + draft counter | model — draft | draft only, never binding |
| 4 | Assemble memo; log positions the lawyer approves | matter.log_position(payload) — write | requires human confirm |

**Schemas:** playbook.retrieve → {clauses:[{text,heading,score}]}; matter.log_position → {position_id,status}.

## Memory
- **Episodic (this run):** retrieved clauses, scores. Lifetime: end of run.
- **Semantic (persistent):** playbook taxonomy + reviewer preferences; refreshed on commit. Never persist counterparty PII.
- **Working (in-context):** current contract, detected clauses, confidence.
- **External:** playbook KB (read), precedent store (read), matter record (write, confirm).

## Human-in-the-loop
The lawyer reviews the memo; nothing is logged without approval; anything customer-facing is out of the agent's reach entirely.

## Success & failure
- **Done when:** a cited risk memo is ready for the reviewing lawyer.
- **Fails safe when:** >2 tool errors → abort with partial memo; conflicting playbook clauses → escalate to lawyer; 90s timeout → abort; playbook unreachable → review nothing.
