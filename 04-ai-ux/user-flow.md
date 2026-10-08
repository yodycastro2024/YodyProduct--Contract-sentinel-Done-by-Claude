_Stage 04 · AI-Native UX_

# AI-Native User Flow · Contract Sentinel

## Entry point
A lawyer pastes (or uploads) an inbound redline into the "Incoming contract" column. Instantly: a "Sentinel is reading the contract…" pill appears; the Flagged and Response columns dim to ~40% to signal work in progress.

## The flow
1. read_precedents — pull comparable prior deals.
2. For each detected clause: search_playbook (top-K over the playbook) → does it depart from our position?
3. Score severity (Critical / High / Medium) and draft a counter, each with a cited clause.
4. Verification: cite-verbatim or badge "Unverified." Breadcrumbs: "Reading playbook…" → "Cross-referencing 6 clauses…" → "Drafting counters…"

## AI moments
Inline & embedded. Flagged-clause cards in column 2, each with a severity tag, the counterparty's language, and a Playbook citation footer. The memo in column 3 assembles from the verified flags. Value = augmentation: the lawyer edits and approves, never starts from blank.

## Fallbacks
- **Kill switch:** every flag has "Override" — change severity, edit the rationale, or dismiss. The memo is editable and regenerable.
- **Training signal:** an override logs a "position correction"; 3+ similar → flag the playbook clause as ambiguous and tighten retrieval.
- **Fail-safe:** no playbook match → card tagged "Outside playbook / Unverified," amber, never invents a position. Lawyer promotes manually or asks for the clause to be added to the playbook.

## Self-review
- [ ] Trigger fires on paste/upload, no manual "start AI" click.
- [ ] A breadcrumb turns latency into transparency.
- [ ] Every automated flag has a working override.
- [ ] Fail-safe is explicit — an ungrounded clause is badged, not guessed.
