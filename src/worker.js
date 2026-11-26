// 오래곁에 방문·설치 집계 (개인정보 없음: 브라우저가 만든 무작위 번호만 받음, IP·기기정보 저장 안 함)
import { DurableObject } from "cloudflare:workers";

const kst = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);

export class Counter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, first TEXT, last TEXT, inst TEXT);
      CREATE TABLE IF NOT EXISTS days (day TEXT, id TEXT, PRIMARY KEY (day, id));`);
  }
  hit(id, installed) {
    const d = kst();
    this.sql.exec("INSERT INTO devices (id, first, last, inst) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET last = excluded.last, inst = COALESCE(devices.inst, excluded.inst)", id, d, d, installed ? d : null);
    this.sql.exec("INSERT OR IGNORE INTO days (day, id) VALUES (?, ?)", d, id);
  }
  stats() {
    const one = (q, ...a) => this.sql.exec(q, ...a).one().n;
    const rows = [];
    for (let i = 0; i < 14; i++) {
      const d = kst(Date.now() - i * 86400e3);
      rows.push({ d, v: one("SELECT COUNT(*) n FROM days WHERE day = ?", d), nw: one("SELECT COUNT(*) n FROM devices WHERE first = ?", d), ins: one("SELECT COUNT(*) n FROM devices WHERE inst = ?", d) });
    }
    return { total: one("SELECT COUNT(*) n FROM devices"), installed: one("SELECT COUNT(*) n FROM devices WHERE inst IS NOT NULL"), week: one("SELECT COUNT(DISTINCT id) n FROM days WHERE day >= ?", kst(Date.now() - 6 * 86400e3)), rows };
  }
}

const page = (s) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>오래곁에 숫자</title>
<style>body{margin:0;background:#F1ECE3;color:#2F2A24;font-family:system-ui,sans-serif;padding:20px 16px;max-width:520px;margin:auto}h1{font-size:20px}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.c{background:#fff;border-radius:12px;padding:12px;text-align:center}.c b{display:block;font-size:28px;color:#4F6B4A}.c span{font-size:12px}table{width:100%;border-collapse:collapse;margin-top:16px;background:#fff;border-radius:12px;overflow:hidden}td,th{padding:8px;text-align:right;border-bottom:1px solid #eee;font-size:14px}td:first-child,th:first-child{text-align:left}p{font-size:12px;color:#7a7268;line-height:1.6}</style></head><body>
<h1>오래곁에 사용 숫자</h1><div class="g"><div class="c"><b>${s.installed}</b><span>홈 화면 설치<br>(누적)</span></div><div class="c"><b>${s.total}</b><span>방문한 기기<br>(누적)</span></div><div class="c"><b>${s.week}</b><span>최근 7일<br>연 기기</span></div></div>
<table><tr><th>날짜</th><th>연 기기</th><th>처음 온 기기</th><th>새 설치</th></tr>${s.rows.map((r) => `<tr><td>${r.d.slice(5).replace("-", "/")}</td><td>${r.v}</td><td>${r.nw}</td><td>${r.ins}</td></tr>`).join("")}</table>
<p>한국 시간 기준입니다. 같은 폰이라도 브라우저를 바꾸거나 기록을 지우면 다른 기기로 셉니다. 설치는 홈 화면에 추가한 순간, 또는 홈 화면 아이콘으로 앱을 연 기기를 셉니다(이 집계를 붙이기 전에 설치한 분은 다음에 앱을 열 때 잡힙니다). 이름·전화번호·IP 같은 개인정보는 모으지 않습니다.</p></body></html>`;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const stub = env.COUNTER.get(env.COUNTER.idFromName("main"));
    if (url.pathname === "/api/hit" && req.method === "POST") {
      try {
        const b = await req.json();
        if (typeof b.id === "string" && /^[a-z0-9]{12,40}$/.test(b.id)) await stub.hit(b.id, b.app === true);
      } catch {}
      return new Response(null, { status: 204 });
    }
    if (url.pathname === "/stats") {
      return new Response(page(await stub.stats()), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    return env.ASSETS.fetch(req);
  },
};
