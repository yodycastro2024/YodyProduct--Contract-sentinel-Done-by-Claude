_Stage 01 · Prompting_

# Prototype · Contract Sentinel

## Prototype link
Rendered Claude artifact — `contract-sentinel.jsx` (self-contained; publish for a public link).

## What it demonstrates
Paste a redline, hit Review, and it flags each off-playbook clause with a severity, cites the playbook clause behind it (or badges "Unverified"), and drafts a counter — with a visible tool trace, a bounded loop, and a confirmation gate before any position is logged.

## Debrief
- **What worked:** clause detection, severity + citation, the confirm gate, the honest "Unverified" path.
- **What broke / felt like a toy:** deterministic reasoning (no live model yet); precedent data is a fixture.
- **What I'd change next pass:** wire `search_playbook` to the live playbook; add clause-level diff view against the counterparty's original.
