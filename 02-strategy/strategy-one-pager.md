_Stage 02 · Strategy_

# AI Strategy One-Pager · Contract Sentinel

## 1. Problem & Workflow
Legal reviews ~60 contracts/month line by line; turnaround is 6 days and positions are inconsistent. Sentinel prevents the "improvised position" failure — taking a stance not backed by the playbook — by grounding every flag in a cited clause.

## 2. Target Metrics
Turnaround 6 days → ≤2 (first-pass memo in minutes). ≥90% of logged positions cite a verbatim playbook clause. Measurable within 30 days of launch.

## 3. Autonomy Level
Copilot. Sentinel drafts a flagged, cited risk memo; a lawyer approves before it's logged. Explicitly avoiding: an agent that sends positions to counterparties — one wrong send waives a right and can't be recalled.

## 4. Data & Model Approach
Ground (RAG) on the Negotiation Playbook (single authority) plus a store of prior deal precedents. Explicitly avoiding a generic LLM: without grounding it invents plausible-but-wrong legal positions — the fastest way to lose legal's trust.

## 5. Risks & Mitigations
Risk: the model paraphrases a clause into a citation that isn't verbatim. Mitigation: a hard verification gate — the cited clause must appear verbatim in the loaded playbook, or the flag ships as "Unverified" and cannot be logged.

## 6. V1 Scope
In: flagging off-playbook clauses with severity + citation, drafting counters, surfacing unverified flags. Out: (1) sending anything to a counterparty, (2) waiving or accepting a term without a human. Both stay 100% with the lawyer.
