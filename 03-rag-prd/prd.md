_Stage 03 · Grounding & PRD_

# AI PRD · Contract Sentinel

## Problem & user
Meridian lawyers need a fast, consistent first pass on inbound redlines. Sentinel reads the contract, flags off-playbook clauses with a cited position, and defends each call — inside limits a human set on purpose.

## The harness (at a glance)
| Surface | Specification |
|---|---|
| 01 Context | Negotiation Playbook (single authority) + deal-precedent store; counterparty PII excluded from memory |
| 02 Tools | search_playbook (READ) · read_precedents (READ) · draft_position (DRAFT) · log_position (WRITE) |
| 03 Loop | 5-turn ceiling; on turn 5 return best current memo labelled "turn limit reached"; escalate after 3 failed calls |
| 04 Memory | Per matter, per reviewer; retains this review's rationale for the sprint; nothing crosses matters |
| 05 Permissions | read auto · draft auto · log confirm · send blocked |
| 06 Verification | Every position cites a clause appearing verbatim in the playbook loaded this session |

## 01 Context · data requirements
Required: the Playbook (in git, re-synced on commit) + deal-precedent store. Excluded: counterparty PII and privileged email threads — named here so exclusion is on the record. If the playbook is unreachable, Sentinel reviews nothing and says so; it never falls back to its own judgement.

## 02 Tools · the verb list
search_playbook(query) READ · read_precedents(filter) READ · draft_position(clause_id, severity, rationale) DRAFT · log_position(clause_id, severity) WRITE. **Deliberate omissions:** no send_to_counterparty() / email() (class SEND — waives rights, can't be recalled); no waive_clause() / delete_redline() (class DESTRUCTIVE).

## 03 Loop · cost & latency
5-turn ceiling per review; turn 5 returns the best memo labelled "turn limit reached". Escalate to the lawyer after 3 consecutive failed tool calls, and immediately if two playbook clauses conflict. p95 < 8s; cost ceiling ~$0.15/review.

## 04 Memory · what persists
Per matter, per reviewer, for the sprint: the rationale behind each flag, so a re-review explains changes rather than silently re-flagging. Lawyer overrides persist 90 days and outrank model output. Nothing crosses between matters.

## 05 Permissions · the autonomy dial
read auto (blast radius = tokens) · draft auto (a flag in a review panel harms no one) · log confirm (changes the matter record a colleague may act on) · send blocked (leaves the building, waives rights). Revisit send only when M6 evals give a real precision number.

## 06 Verification · the check before output ships
Every position must cite a clause appearing verbatim in the playbook loaded this session; a paraphrase fails. Sentinel may not invent or reconstruct a clause to pass. Unverified flags are shown with an "Unverified" badge and "No supporting clause found," never dropped, and may be drafted but not logged. If >50% of flags in a review come back unverified, banner the whole memo.

## Out of scope
Anything not in the verb list, and any action tiered blocked. Both are decisions on the record.
