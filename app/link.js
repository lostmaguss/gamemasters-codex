// The live link from a phone or OBS page to the GM's computer. It tries server-sent events first.
// Some proxies, Cloudflare's among them, can hold that stream back, so if nothing arrives within
// a few seconds it switches to asking the computer for news (long polling) and stays on that.
export function openLink(query, onMsg, onState = () => {}) {
  let mode = "sse", es = null, cid = null, retry = null, ctl = null, gen = 0;
  const sse = () => {
    es = new EventSource(`/events?${query()}`);
    let got = false;
    const wait = setTimeout(() => { if (!got) { es.close(); mode = "poll"; poll(gen); } }, 6000);
    es.onmessage = e => { if (!got) { got = true; clearTimeout(wait); } onState(true); onMsg(JSON.parse(e.data)); };
    es.onerror = () => { clearTimeout(wait); es.close(); onState(false); if (mode === "sse") retry = setTimeout(sse, 2500); };
  };
  const poll = async my => {
    if (my !== gen) return;
    ctl = new AbortController();
    try {
      const r = await fetch(`/poll?${query()}${cid ? "&cid=" + cid : ""}`, { cache: "no-store", signal: ctl.signal });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      if (my !== gen) return;
      cid = j.cid; onState(true); j.events.forEach(onMsg); poll(my);
    } catch {
      if (my !== gen) return;
      cid = null; onState(false); retry = setTimeout(() => poll(my), 3000);
    }
  };
  sse();
  return {
    // the query changed (a player picked their character): start over with a fresh connection
    reconnect() {
      gen++; clearTimeout(retry); es?.close(); ctl?.abort(); cid = null;
      if (mode === "sse") sse(); else poll(gen);
    },
  };
}
