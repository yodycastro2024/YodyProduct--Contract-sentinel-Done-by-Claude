_Stage 05 · Agentic Workflow_

# Agent Control Panel · Contract Sentinel

## Autonomy level
The agent may read, score, draft, and (on approval) log positions to the matter. It may NOT send anything to a counterparty, waive a clause, or edit executed contracts.

## Controls
- **Kill switch:** max 5 steps; abort if the same tool fails twice; hard 90s timeout.
- **Rate / cost caps:** ~$0.15/review; retrieval capped at k=6.
- **Escalate-on-stuck:** after 3 failed retrievals → cautious mode (list clauses, no positions); after 2 tool errors → escalate to lawyer with full trace.

## Monitoring
- **Confidence → action:** ≥80% draft into the memo; 60–79% draft but flag "needs review"; <60% list clause only, no position.
- **Checkpoints:** any clause touching liability, indemnity, IP assignment, or data always requires lawyer review.
- **North Star (re-read every loop):** "You are Contract Sentinel. Flag off-playbook clauses with a cited position. Never state a position you cannot cite. Never send anything to a counterparty. Escalate ambiguity to the lawyer."

## Permissions
READ: playbook, precedents. WRITE: matter record (log positions, on confirm) only. CANNOT: send to counterparty, waive/accept a term, edit executed contracts.
