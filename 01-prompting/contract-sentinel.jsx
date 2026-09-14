import { useState, useMemo } from "react";

/**
 * Contract Sentinel — self-contained harness demo (renders in Claude, no backend).
 * Reads a redline, flags off-playbook clauses with a severity, cites the playbook
 * clause behind each (or badges "Unverified"), drafts a counter, and gates
 * log_position behind a human confirm. send_to_counterparty is never built.
 * Ships prefilled with a playbook + contract so it works on first Review; clear the
 * playbook to see quality mode. Reasoning is deterministic (no live model).
 */

const C = {
  bg: "#08090A", panel: "#0D0E10", s2: "#141517", s3: "#1A1B1E",
  border: "rgba(255,255,255,0.06)", borderS: "rgba(255,255,255,0.11)",
  text: "#F7F8F8", t2: "#8A8F98", t3: "#565961",
  accent: "#5E6AD2", accentH: "#6E79E8", accentT: "#9DA3F0",
  accentSoft: "rgba(94,106,210,0.13)", accentB: "rgba(94,106,210,0.5)",
  green: "#4CB782", red: "#E5484D", amber: "#E2A03F",
};
const FONT = '"Inter","Inter var",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
const CLS = {
  READ: { fg: "#84AEFF", bg: "rgba(76,141,255,0.13)", bd: "rgba(76,141,255,0.35)" },
  DRAFT: { fg: "#E7B24A", bg: "rgba(226,160,63,0.14)", bd: "rgba(226,160,63,0.35)" },
  WRITE: { fg: "#5BD0A0", bg: "rgba(76,183,130,0.15)", bd: "rgba(76,183,130,0.35)" },
  FAIL: { fg: "#F0868A", bg: "rgba(229,72,77,0.14)", bd: "rgba(229,72,77,0.4)" },
};
const MAX_TURNS = 5;

const SAMPLE_PLAYBOOK = `# Meridian Contract Negotiation Playbook (excerpt)

## Liability cap
Preferred: liability capped at 12 months' fees. Acceptable: cap at total contract value. Walk-away: uncapped or unlimited liability.

## Indemnification
Preferred: mutual indemnification limited to third-party IP and confidentiality breaches. Walk-away: a one-sided indemnity that runs only in the counterparty's favour with no reciprocal obligation.

## Payment terms
Preferred: Net-30 from invoice. Acceptable: Net-45. Walk-away: Net-60 or longer, or payment tied to the end of a quarter rather than the invoice date.

## Auto-renewal
Preferred: renewal with a 60-day opt-out notice window. Acceptable: 30-day notice. Walk-away: automatic renewal with no opt-out, or a notice window shorter than 15 days.

## Governing law
Preferred: Delaware. Acceptable: New York. Walk-away: a foreign jurisdiction where neither party has a business nexus.`;

const SAMPLE_CONTRACT = `MASTER SERVICES AGREEMENT — redlines from Counterparty (Apex Logistics)

7. LIMITATION OF LIABILITY. Provider's aggregate liability shall be unlimited with respect to any breach.

9. PAYMENT. Customer shall pay undisputed invoices within ninety (90) days of the end of the quarter in which the invoice is received.

12. TERM & RENEWAL. This Agreement renews automatically for successive 12-month terms; no notice window for non-renewal is specified.

15. INDEMNIFICATION. Provider shall indemnify and hold harmless Customer against all claims. There is no reciprocal obligation on Customer.

18. GOVERNING LAW. This Agreement shall be governed by the laws of Singapore.

22. LOGO USE. Provider would like Customer's logo on Provider's website, because our competitor features their customers' logos.`;

const PRECEDENTS = [
  { id: "D-311", title: "Apex-style MSA (2025)", note: "Unlimited liability countered to 12-mo fees; accepted." },
  { id: "D-287", title: "Vendor renewal (2025)", note: "Auto-renewal reduced to a 30-day notice window." },
];

// ---- helpers -------------------------------------------------------------
const STOP = new Set("the and for with that this from have has are was were will would your you our their them they into over under about across only just also than then a an of to in on it is be as at or by we us if".split(" "));
const tok = (s) => (String(s || "").toLowerCase().match(/[a-z]{3,}/g) || []).filter((w) => !STOP.has(w));
const collapse = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const clip = (s, n) => (s && s.length > n ? s.slice(0, n).trim() + "\u2026" : s || "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wcount = (s) => (s && s.trim() ? s.trim().split(/\s+/).length : 0);

function parsePlaybook(doc) {
  const lines = String(doc || "").replace(/\r/g, "").split("\n");
  const secs = []; let cur = null;
  const flush = () => { if (cur && cur.text.trim()) secs.push(cur); };
  for (const raw of lines) {
    const l = raw.trim();
    const h = l.match(/^#{1,6}\s+(.+)$/);
    if (h) { flush(); cur = { heading: h[1].trim(), text: "" }; continue; }
    if (!l) continue;
    if (!cur) cur = { heading: "Overview", text: "" };
    cur.text += (cur.text ? " " : "") + l;
  }
  flush();
  return secs;
}
function searchPlaybook(query, doc) {
  if (!doc || !doc.trim()) return [];
  const q = tok(query);
  return parsePlaybook(doc).map((s) => {
    const hay = new Set(tok(s.heading + " " + s.text));
    let score = 0; for (const t of q) if (hay.has(t)) score++;
    return { heading: s.heading, clause: s.text.replace(/\s+/g, " ").trim(), score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
}
function extractClauses(t) {
  const low = t.toLowerCase(); const out = []; let n = 1;
  if (/liabilit/.test(low) && /unlimited/.test(low))
    out.push({ id: "C-" + n++, title: "Unlimited liability", cp: "Provider's aggregate liability shall be unlimited.", base: "Critical", keywords: "liability cap unlimited limitation", anti: null });
  if (/(net.?(60|90)|ninety \(90\)|90 days)/.test(low) || (/payment/.test(low) && /quarter/.test(low)))
    out.push({ id: "C-" + n++, title: "Extended payment terms (Net-90 / quarter-end)", cp: "Payment within 90 days of quarter-end.", base: "High", keywords: "payment terms net invoice days quarter", anti: null });
  if (/renews automatically|automatic.*renew|auto-?renew/.test(low))
    out.push({ id: "C-" + n++, title: "Auto-renewal without notice window", cp: "Automatic renewal; no non-renewal notice window specified.", base: "High", keywords: "auto renewal opt-out notice term window", anti: null });
  if (/indemnif/.test(low) && /(no reciprocal|hold harmless customer|all claims)/.test(low))
    out.push({ id: "C-" + n++, title: "One-sided indemnification", cp: "Provider indemnifies Customer with no reciprocal obligation.", base: "High", keywords: "indemnification mutual reciprocal", anti: null });
  const gl = low.match(/governed by the laws of ([a-z ]+)/);
  if (gl && !/delaware|new york/.test(gl[1]))
    out.push({ id: "C-" + n++, title: "Foreign governing law", cp: "Governed by the laws of " + gl[1].trim().replace(/\.$/, "") + ".", base: "Medium", keywords: "governing law jurisdiction delaware york", anti: null });
  if (/logo|marketing materials/.test(low) && /competitor/.test(low))
    out.push({ id: "C-" + n++, title: "Logo use (competitor-driven)", cp: "Feature Customer's logo because a competitor does.", base: "Low", keywords: "logo marketing brand", anti: "Competitor-driven" });
  if (!out.length) {
    const s = (t.split(/[.\n]/).map((x) => x.trim()).filter((x) => x.length > 25)[0]) || "General clause";
    out.push({ id: "C-1", title: clip(s, 60), cp: clip(s, 140), base: "Medium", keywords: tok(s).slice(0, 6).join(" "), anti: null });
  }
  return out;
}

// ---- UI bits -------------------------------------------------------------
function Pill({ cls }) {
  const s = CLS[cls] || CLS.READ;
  return <span style={{ fontSize: 10.5, fontWeight: 560, letterSpacing: "0.03em", color: s.fg, background: s.bg, border: "1px solid " + s.bd, borderRadius: 5, padding: "2px 6px", lineHeight: 1.3 }}>{cls}</span>;
}
function SeverityTag({ level }) {
  const c = level === "Critical" ? C.red : level === "High" ? C.amber : level === "Medium" ? C.t2 : C.t3;
  return <span className="chip"><span style={{ width: 7, height: 7, borderRadius: "50%", background: c }} /><span style={{ color: level === "Critical" ? C.text : C.t2, fontWeight: level === "Critical" ? 560 : 450 }}>{level}</span></span>;
}
function VerifyBadge({ verified, noSource }) {
  if (verified) return <span className="chip" style={{ color: C.green, borderColor: "rgba(76,183,130,0.35)", background: "rgba(76,183,130,0.12)" }}>Verified</span>;
  return <span className="chip" style={{ color: C.amber, borderColor: "rgba(226,160,63,0.35)", background: "rgba(226,160,63,0.12)" }}>{noSource ? "Unverified \u00b7 no playbook" : "Unverified"}</span>;
}
function FlagCard({ d, onLog, noSource }) {
  const [open, setOpen] = useState(false);
  const canLog = d.verified && !d.notRec && !d.logged;
  return (
    <div className="card" style={d.notRec ? { borderLeft: "2px solid " + C.amber } : d.severity === "Critical" && d.verified ? { borderLeft: "2px solid " + C.red } : null}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 11.5, color: C.t3 }}>{d.id} · from contract</span>
        <VerifyBadge verified={d.verified} noSource={noSource} />
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 510, marginBottom: 6, letterSpacing: "-0.012em" }}>{d.title}</div>
      <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.5, paddingLeft: 10, borderLeft: "2px solid " + C.borderS, marginBottom: 10 }}>{d.cp}</div>
      {d.verified && d.sourceClause && (
        <div style={{ marginBottom: 10 }}>
          <button className="link" onClick={() => setOpen((v) => !v)}>{open ? "Hide" : "Show"} playbook clause · {d.sourceHeading}</button>
          {open && <div style={{ marginTop: 6, background: C.accentSoft, border: "1px solid " + C.accentB, borderRadius: 6, padding: "8px 10px", fontSize: 12, color: "#c3c6cd", fontStyle: "italic", lineHeight: 1.5 }}>{"\u201C"}{clip(d.sourceClause, 260)}{"\u201D"}</div>}
        </div>
      )}
      {!d.verified && <div style={{ marginBottom: 10, fontSize: 12, color: C.amber }}>{noSource ? "No playbook loaded." : "No supporting clause found in the loaded playbook."}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {d.notRec ? <span className="chip"><b style={{ color: C.amber }}>Not recommended</b></span> : <SeverityTag level={d.severity} />}
        {d.anti && <span className="chip" style={{ color: C.t3 }}>anti-pattern: {d.anti}</span>}
        {d.logged && <span className="chip" style={{ color: C.green, borderColor: "rgba(76,183,130,0.35)", background: "rgba(76,183,130,0.12)" }}>logged</span>}
      </div>
      {d.rationale && <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.5, marginTop: 9 }}>{d.rationale}</div>}
      <div style={{ marginTop: 11 }}>
        {canLog ? <button className="run-btn small" onClick={() => onLog(d)}>Log position</button>
          : d.logged ? null
          : <span style={{ fontSize: 11.5, color: C.t3 }}>{d.notRec ? "Blocked: not a playbook risk" : !d.verified ? "Blocked: log_position rejects unverified flags" : ""}</span>}
      </div>
    </div>
  );
}
function TraceRow({ e }) {
  const dec = e.kind === "decision"; const dc = e.decision === "approved" ? C.green : e.decision === "rejected" ? C.red : C.t2;
  return <div style={{ padding: "8px 0", borderTop: "1px solid " + C.border }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
      <Pill cls={e.ok ? e.cls : "FAIL"} />
      <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12, fontWeight: 500, color: dec ? dc : C.text }}>{e.name}</span>
      <span style={{ fontSize: 10, color: C.t3, border: "1px solid " + C.border, borderRadius: 4, padding: "1px 4px" }}>{e.tier}</span>
      <span style={{ marginLeft: "auto", fontSize: 10.5, color: C.t3 }}>{dec ? e.ts : e.dur + "ms"}</span>
    </div>
    {!dec && <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, color: C.t3, marginBottom: 2, wordBreak: "break-word" }}>{clip(JSON.stringify(e.args), 84)}</div>}
    <div style={{ fontSize: 11.5, color: e.ok ? (dec ? dc : C.t2) : CLS.FAIL.fg, lineHeight: 1.45 }}>{e.summary}</div>
  </div>;
}
function Empty({ title, body }) {
  return <div style={{ height: "100%", display: "grid", placeItems: "center", textAlign: "center", padding: "0 26px" }}><div><div style={{ fontSize: 13, fontWeight: 510 }}>{title}</div><div style={{ fontSize: 12.5, color: C.t3, marginTop: 4, maxWidth: 230, lineHeight: 1.5 }}>{body}</div></div></div>;
}
function Banner({ tone, text }) { const c = tone === "amber" ? C.amber : C.red; return <div style={{ margin: "0 20px 6px", padding: "8px 12px", borderRadius: 8, fontSize: 12, color: c, background: tone === "amber" ? "rgba(226,160,63,0.1)" : "rgba(229,72,77,0.1)", border: "1px solid " + (tone === "amber" ? "rgba(226,160,63,0.3)" : "rgba(229,72,77,0.3)") }}>{text}</div>; }
function Memo({ flags, noSource }) {
  const ok = flags.filter((f) => f.verified && !f.notRec);
  const un = flags.filter((f) => !f.verified && !f.notRec);
  const no = flags.filter((f) => f.notRec);
  return <div style={{ fontSize: 13, color: "#c3c6cd", lineHeight: 1.6 }}>
    <div style={{ fontSize: 18, fontWeight: 590, color: C.text, letterSpacing: "-0.02em", marginBottom: 8 }}>Suggested response</div>
    <div style={{ fontSize: 12, color: C.t2, marginBottom: 14 }}>{ok.length} grounded flag(s) · {no.length} not recommended · {un.length} unverified{noSource ? " · quality mode" : ""}</div>
    {ok.map((f) => <div key={f.id} style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 560, color: C.text }}>{f.severity} · {f.title}</div>
      <div style={{ fontSize: 12, color: C.t2, marginTop: 3 }}>Counter toward the playbook position under {"\u201C"}{f.sourceHeading}{"\u201D"}.{f.logged ? " Logged to matter." : ""}</div>
    </div>)}
    {no.length > 0 && <><div style={{ fontWeight: 560, color: C.amber, marginTop: 14, marginBottom: 6 }}>Not recommended</div>{no.map((f) => <div key={f.id} style={{ fontSize: 12, color: C.t2, marginBottom: 5 }}>• {f.title} — {f.reason}</div>)}</>}
    {un.length > 0 && <><div style={{ fontWeight: 560, color: C.t2, marginTop: 14, marginBottom: 6 }}>Unverified</div>{un.map((f) => <div key={f.id} style={{ fontSize: 12, color: C.t3, marginBottom: 5 }}>• {f.title} — no supporting playbook clause.</div>)}</>}
  </div>;
}

// ---- app -----------------------------------------------------------------
export default function ContractSentinel() {
  const [playbook, setPlaybook] = useState(SAMPLE_PLAYBOOK);
  const [contract, setContract] = useState(SAMPLE_CONTRACT);
  const [status, setStatus] = useState("idle");
  const [flags, setFlags] = useState([]);
  const [trace, setTrace] = useState([]);
  const [tokens, setTokens] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [turnInfo, setTurnInfo] = useState({ turn: 0, limit: false });
  const [pending, setPending] = useState(null);
  const [reason, setReason] = useState("");

  const pW = wcount(playbook), cW = wcount(contract);
  const running = status === "running";
  const canRun = cW > 0 && !running;
  const noSource = pW === 0;
  const unverified = flags.filter((f) => !f.verified).length;
  const lowGrounding = !noSource && flags.length > 0 && unverified * 2 > flags.length;

  function logTrace(e) { setTrace((p) => [...p, { seq: p.length + 1, ...e }]); }
  async function callTool(name, tier, cls, args, fn, sum) {
    const t0 = performance.now();
    let ok = true, res = null, summary = "";
    try { res = await fn(); summary = sum ? sum(res) : "ok"; }
    catch (err) { ok = false; summary = "Error: " + (err.message || err); }
    const dur = Math.round(performance.now() - t0);
    setTokens((x) => x + 190 + Math.round(Math.random() * 210));
    logTrace({ name, tier, cls, args, summary, dur, ok });
    return res;
  }

  async function run() {
    if (!canRun) return;
    setStatus("running"); setFlags([]); setTrace([]); setTokens(0); setTurnInfo({ turn: 0, limit: false });
    const start = performance.now();
    await callTool("read_precedents", "AUTO", "READ", { filter: "comparable" }, async () => { await sleep(150); return PRECEDENTS; }, (r) => r.length + " precedents from store");

    const cands = extractClauses(contract);
    const built = []; let turn = 1; let limit = false;
    for (let i = 0; i < cands.length; i++) {
      if (turn >= MAX_TURNS) { limit = true; break; }
      turn++;
      const c = cands[i];
      const matches = await callTool("search_playbook", "AUTO", "READ", { query: c.keywords },
        async () => { await sleep(150); return searchPlaybook(c.keywords, playbook); },
        (r) => r.length ? r.length + " clause(s) · top: \u201C" + r[0].heading + "\u201D" : "0 clauses — no playbook support");
      const top = matches[0];
      let f;
      if (!noSource && top && !c.anti) {
        const verified = collapse(playbook).includes(collapse(top.clause.slice(0, 42)));
        f = { ...c, verified, severity: c.base, sourceHeading: top.heading, sourceClause: top.clause, notRec: false, rationale: "Counterparty term departs from the playbook position under \u201C" + top.heading + "\u201D.", logged: false };
        await callTool("draft_position", "AUTO", "DRAFT", { clause_id: c.id, severity: c.base }, async () => { await sleep(100); return { drafted: c.id }; }, () => "drafted " + c.base + " for " + c.id + (verified ? "" : " (unverified)"));
      } else if (c.anti) {
        f = { ...c, verified: false, severity: c.base, notRec: true, reason: "Competitor-driven (\u201Cthey have it, we should too\u201D), not a playbook risk.", logged: false };
        await callTool("draft_position", "AUTO", "DRAFT", { clause_id: c.id, severity: "not-recommended" }, async () => { await sleep(90); return { drafted: c.id }; }, () => "drafted not-recommended for " + c.id);
      } else {
        f = { ...c, verified: false, severity: c.base, notRec: false, rationale: "", logged: false };
        await callTool("draft_position", "AUTO", "DRAFT", { clause_id: c.id, severity: c.base }, async () => { await sleep(90); return { drafted: c.id }; }, () => "drafted " + c.base + " for " + c.id + " (unverified)");
      }
      built.push(f); setFlags([...built]);
    }
    setElapsed(Math.round(performance.now() - start));
    setTurnInfo({ turn, limit });
    setStatus(limit ? "turn_limit" : "done");
  }

  function requestLog(f) { if (!f.verified || f.notRec) return; setReason(""); setPending(f); }
  function resolveLog(decision) {
    const f = pending; if (!f) return;
    logTrace({ seq: trace.length + 1, kind: "decision", name: "human:log_position", tier: "CONFIRM", cls: "WRITE", decision, ok: true, ts: new Date().toLocaleTimeString(), summary: decision === "approved" ? "Approved by reviewer" : "Rejected by reviewer" + (reason ? ": " + reason : "") });
    if (decision === "approved") {
      logTrace({ seq: trace.length + 2, name: "log_position", tier: "CONFIRM", cls: "WRITE", args: { clause_id: f.id, severity: f.severity }, dur: 150, ok: true, summary: "logged " + f.severity + " — " + f.id + " on matter (human-approved)" });
      setTokens((x) => x + 120);
      setFlags((prev) => prev.map((x) => x.id === f.id ? { ...x, logged: true } : x));
    }
    setPending(null);
  }

  const counts = trace.reduce((a, e) => { if (e.kind !== "decision") a[e.cls] = (a[e.cls] || 0) + 1; return a; }, {});
  const taStyle = { width: "100%", height: "100%", resize: "none", border: "none", outline: "none", background: "transparent", color: C.t2, fontFamily: FONT, fontSize: 13, lineHeight: 1.6, padding: 14 };
  const shell = { display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, background: C.panel, border: "1px solid " + C.border, borderRadius: 10, overflow: "hidden" };

  return (
    <div style={{ fontFamily: FONT, background: C.bg, color: C.text, height: "100vh", minWidth: 1240, display: "flex", flexDirection: "column", overflow: "hidden", WebkitFontSmoothing: "antialiased" }}>
      <style>{CSS}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: C.accent, display: "grid", placeItems: "center", color: "#fff", fontSize: 13 }}>§</div>
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontSize: 13.5, fontWeight: 560 }}>Contract Sentinel</div>
            <div style={{ fontSize: 11.5, color: C.t3 }}>Flag off-playbook clauses · cite or abstain · never send</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: C.t2, display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: status === "done" ? C.green : status === "turn_limit" ? C.amber : C.t3 }} />
          {running ? "Reviewing…" : status === "turn_limit" ? "Turn limit reached" : status === "done" ? "Review complete" : "Idle"}
          {turnInfo.turn ? " · turn " + turnInfo.turn + "/" + MAX_TURNS : ""}
        </div>
      </div>

      {status === "turn_limit" && <Banner tone="amber" text={"Turn limit reached — Sentinel stopped at " + MAX_TURNS + " turns and is showing its best current memo."} />}
      {lowGrounding && <Banner tone="amber" text={"Low grounding: " + unverified + " of " + flags.length + " flags have no supporting clause. The playbook may be missing, stale, or the wrong one."} />}
      {noSource && flags.length > 0 && <Banner tone="amber" text="Quality mode: no playbook loaded. Flags reflect clause risk, not your negotiated positions." />}

      <main style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, padding: "2px 20px 20px" }}>
        <section style={shell}>
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", height: 42, borderBottom: "1px solid " + C.border }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><h2 style={{ margin: 0, fontSize: 13, fontWeight: 510 }}>Negotiation playbook</h2><span style={{ fontSize: 11.5, color: C.t3 }}>{pW ? pW + " words" : "empty"}</span></div>
          </header>
          <textarea style={taStyle} value={playbook} onChange={(e) => setPlaybook(e.target.value)} spellCheck={false} placeholder="Paste your playbook. Clear it to see quality mode." />
          <div style={{ padding: "9px 12px", borderTop: "1px solid " + C.border, display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: pW ? C.t2 : C.t3 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: pW ? C.green : C.t3 }} />{pW ? "Source loaded" : "No source · search_playbook has nothing to read"}</div>
        </section>

        <section style={shell}>
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", height: 42, borderBottom: "1px solid " + C.border }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><h2 style={{ margin: 0, fontSize: 13, fontWeight: 510 }}>Incoming contract</h2><span style={{ fontSize: 11.5, color: C.t3 }}>{cW ? cW + " words" : "empty"}</span></div>
          </header>
          <textarea style={taStyle} value={contract} onChange={(e) => setContract(e.target.value)} spellCheck={false} placeholder="Paste the counterparty redline." />
          <div style={{ padding: 10, borderTop: "1px solid " + C.border }}>
            <button className={"run-btn" + (running ? " busy" : "")} onClick={run} disabled={!canRun} style={{ width: "100%" }}>{running ? "Reviewing…" : status !== "idle" ? "Re-review" : "Review contract"}</button>
            <div style={{ textAlign: "center", fontSize: 11, color: C.t3, marginTop: 7 }}>read_precedents → search_playbook → draft_position</div>
          </div>
        </section>

        <section style={shell}>
          <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 42, borderBottom: "1px solid " + C.border }}>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 510 }}>Flagged clauses</h2><span style={{ fontSize: 11.5, color: C.t3 }}>{flags.length ? flags.filter((f) => f.verified).length + " verified" : ""}</span>
          </header>
          <div className="scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: flags.length ? 12 : 0 }}>
            {flags.length ? <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{flags.map((f) => <FlagCard key={f.id} d={f} onLog={requestLog} noSource={noSource} />)}</div>
              : <Empty title="No flags yet" body="Review a contract. Each off-playbook clause is grounded in a cited clause, or badged Unverified." />}
          </div>
          <div style={{ borderTop: "1px solid " + C.border, background: "#0B0C0E" }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 510 }}>Tool trace</span><span style={{ fontSize: 11.5, color: C.t3 }}>{trace.length} entries</span>
              <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>{["READ", "DRAFT", "WRITE"].map((k) => counts[k] ? <span key={k} style={{ fontSize: 10.5, color: CLS[k].fg }}>{counts[k]} {k.toLowerCase()}</span> : null)}</span>
            </div>
            <div className="scroll" style={{ maxHeight: 165, overflowY: "auto", padding: "0 12px" }}>
              {trace.length ? trace.map((e) => <TraceRow key={e.seq} e={e} />) : <div style={{ padding: "10px 0", fontSize: 11.5, color: C.t3 }}>Every tool call and every approve/reject lands here, in order.</div>}
            </div>
            <div style={{ display: "flex", gap: 10, padding: "8px 12px", borderTop: "1px solid " + C.border, fontSize: 11 }}>
              <span style={{ color: C.t2 }}><b style={{ color: C.text }}>{tokens.toLocaleString()}</b> tokens</span>
              <span style={{ color: C.t3 }}>≈ ${(tokens / 1000 * 0.0004).toFixed(4)}</span>
              <span style={{ marginLeft: "auto", color: elapsed > 8000 ? C.red : C.t3 }}>{elapsed} ms{elapsed > 8000 ? " · SLA>8s" : ""}</span>
            </div>
          </div>
        </section>

        <section style={shell}>
          <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 42, borderBottom: "1px solid " + C.border }}>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 510 }}>Suggested response</h2><span style={{ fontSize: 11.5, color: C.t3 }}>{flags.length ? "memo" : ""}</span>
          </header>
          <div className="scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: flags.length ? "16px 18px 24px" : 0 }}>
            {flags.length ? <Memo flags={flags} noSource={noSource} /> : <Empty title="Memo appears here" body="Assembled only from grounded flags and the playbook clauses that back them." />}
          </div>
        </section>
      </main>

      {pending && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4,5,6,0.72)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <div style={{ width: 460, maxWidth: "92vw", background: C.panel, border: "1px solid " + C.borderS, borderRadius: 12, boxShadow: "0 24px 60px rgba(0,0,0,0.55)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", gap: 8 }}>
              <Pill cls="WRITE" /><span style={{ fontSize: 13, fontWeight: 560 }}>Confirm log to matter</span><span style={{ marginLeft: "auto", fontSize: 11, color: C.amber }}>CONFIRM · human required</span>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 560, marginBottom: 8 }}>{pending.title}</div>
              <div style={{ marginBottom: 12 }}><SeverityTag level={pending.severity} /></div>
              {pending.sourceClause && <div style={{ background: C.accentSoft, border: "1px solid " + C.accentB, borderRadius: 6, padding: "8px 10px", marginBottom: 12 }}>
                <div style={{ fontSize: 10.5, color: C.accentT, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Playbook clause · {pending.sourceHeading}</div>
                <div style={{ fontSize: 12, color: "#c3c6cd", fontStyle: "italic", lineHeight: 1.5 }}>{"\u201C"}{clip(pending.sourceClause, 240)}{"\u201D"}</div>
              </div>}
              <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55, marginBottom: 14 }}>{pending.rationale}</div>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional, used if you reject)" style={{ width: "100%", background: C.s2, border: "1px solid " + C.border, borderRadius: 7, padding: "8px 10px", color: C.text, fontFamily: "inherit", fontSize: 12, marginBottom: 12, outline: "none" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="ghost" style={{ flex: 1, padding: "9px 0" }} onClick={() => resolveLog("rejected")}>Reject</button>
                <button className="run-btn" style={{ flex: 1 }} onClick={() => resolveLog("approved")}>Approve &amp; log</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;450;500;600&display=swap');
.chip{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;padding:4px 8px;border-radius:6px;background:rgba(255,255,255,0.03);border:1px solid ${C.border};}
.ghost{background:transparent;border:1px solid ${C.border};color:${C.t2};font:inherit;font-size:11.5px;padding:4px 9px;border-radius:6px;cursor:pointer;}
.ghost:hover{border-color:${C.borderS};color:${C.text};background:rgba(255,255,255,0.04);}
.link{background:none;border:none;color:${C.accentT};font:inherit;font-size:11.5px;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:2px;}
.run-btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;border-radius:8px;border:none;background:${C.accent};color:#fff;font-family:inherit;font-size:13px;font-weight:540;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,0.16);}
.run-btn.small{padding:7px 12px;font-size:12px;}
.run-btn:hover:not(:disabled){background:${C.accentH};}
.run-btn:disabled{opacity:.45;cursor:not-allowed;}
textarea::placeholder{color:${C.t3};}
.card{background:${C.s2};border:1px solid ${C.border};border-radius:8px;padding:13px;}
.scroll{scrollbar-width:thin;scrollbar-color:#2a2b2f transparent;}
.scroll::-webkit-scrollbar{width:9px;}
.scroll::-webkit-scrollbar-thumb{background:#212226;border-radius:8px;border:2px solid transparent;background-clip:padding-box;}
`;
