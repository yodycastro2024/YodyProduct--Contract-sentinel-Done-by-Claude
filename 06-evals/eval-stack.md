_Stage 06 · Evals & Guardrails_

# Eval Stack · Contract Sentinel

## What "good" means
≥90% of flagged positions cite a verbatim playbook clause; ≤10% of reviews need a full re-flag; lawyer thumbs-up ≥80%.

## The stack
| Layer | Evaluator | What it catches | Threshold / gate |
|---|---|---|---|
| Code-based | CI + nightly | Citation verbatim-check; valid memo schema; send-attempt = hard fail | 100% citation/schema/refusal pass |
| LLM-as-judge | Golden set of labelled contracts | Wrong severity; missed high-risk clause; paraphrased citation | ≥90% golden-set accuracy |
| Human | 2 lawyers + GC tiebreak, weekly | Subtle wrong positions; tone; over/under-flagging | ≥4.0/5 on accuracy + safety; 0 critical fails |

## Golden set
200 anonymised redlines with lawyer-curated expected flags + severities. Versioned in 06-evals/golden-set/. Refresh quarterly and after any playbook change.

## Release gate
- **Hard (auto-block):** any hallucinated/paraphrased citation; any send attempt; citation-check fail; 0% client-PII leakage.
- **Soft (GC sign-off):** over-flagging rate >2%; p99 latency >5s.
- **User-feedback (online):** per-review thumbs; on-call lawyer triages ≥2 thumbs-down on the same clause type within 24h.
