_Stage 03 · working notes._

# Harness Diagnostic Diff · Contract Sentinel

**Prototype:** contract-sentinel.jsx

## Harness off (no playbook loaded)
Unlimited liability clause: flagged, but "Unverified · no source" — Sentinel can name the risk from request quality but cannot ground a position. Cannot be logged.

## Harness on (playbook loaded)
Unlimited liability clause: **Critical**, Verified, citing "Liability cap" ("Walk-away: uncapped or unlimited liability…"). Suggested counter drafted. Logging opens a confirmation card. The competitor-driven logo ask flips to Not Recommended (anti-pattern), not a legal risk.

## Tool trace (excerpt)
READ read_precedents AUTO — 2 precedents from fixture
READ search_playbook AUTO {"query":"liability cap unlimited"} — 1 clause · top "Liability cap"
DRAFT draft_position AUTO {"clause_id":"C-1","severity":"Critical"} — drafted Critical for C-1
CONFIRM human:log_position — Approved by reviewer (timestamp)
WRITE log_position CONFIRM — logged Critical, C-1 on matter record (human-approved)

## Takeaway
The harness makes each position traceable and gate-able; forcing a verbatim playbook citation keeps Sentinel grounded instead of improvising legal stances.
