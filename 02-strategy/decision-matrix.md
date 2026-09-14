_Stage 02 · Strategy_

# AI Solution Decision Matrix · Contract Sentinel

## The decision
Whether Meridian builds contract triage as a grounded (RAG) copilot, buys a generic LLM API, or fine-tunes on its contract corpus. Why now: legal is the deal bottleneck and positions are applied inconsistently.

## Options scored
_1–5, higher = better._

| Option | Cost | Speed | Control | Moat | Risk | Score |
|---|---|---|---|---|---|---|
| Build (RAG copilot) | 2 | 3 | 5 | 4 | 4 | 3.6 |
| Buy / generic API | 5 | 5 | 2 | 1 | 1 | 2.8 |
| Fine-tune | 2 | 2 | 4 | 4 | 2 | 2.8 |

## Recommendation
**Build, grounded, Copilot.** Control and low legal risk are the axes that matter — a generic API can't cite Meridian's playbook, so it would hallucinate positions, the exact failure the GC fears. Fine-tuning bakes positions into weights you can't audit; the playbook must stay an editable document lawyers own. Autonomy stays Copilot: the lawyer approves every position; the tool never sends.
