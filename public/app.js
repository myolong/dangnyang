// 댕냥차트 1차 버전: 로그인 없이 이 기기(localStorage)에 저장. 가족 공유는 다음 단계에서 서버 저장으로 추가.
(function () {
  "use strict";
  const DAY = 864e5;
  const KEY = "dangnyang-v1";
  const ICON = {
    dog: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 12c-2-1-4 1-3 4l2 3M24 12c2-1 4 1 3 4l-2 3"/><ellipse cx="16" cy="18" rx="8" ry="8"/><circle cx="13" cy="17" r="1" fill="currentColor"/><circle cx="19" cy="17" r="1" fill="currentColor"/><path d="M14.5 21.5c1 .8 2 .8 3 0"/></svg>',
    cat: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 14V6l5 4h6l5-4v8"/><ellipse cx="16" cy="18" rx="8.5" ry="7.5"/><circle cx="13" cy="17" r="1" fill="currentColor"/><circle cx="19" cy="17" r="1" fill="currentColor"/><path d="M16 19.5v1M14.5 21.5c1 .6 2 .6 3 0M5 18h4M5 21l4-1M27 18h-4M27 21l-4-1"/></svg>'
  };
  // 버튼 종류: meal(식사율), med(복용률), walk(산책), count(하루 평균), sym(증상: 최근 3주 vs 그 전 6주), note(메모)
  const BUTTONS = {
    dog: [
      { k: "walk", ic: "걷", label: "산책", type: "walk" }, { k: "breakfast", ic: "아", label: "아침밥", type: "meal" },
      { k: "dinner", ic: "저", label: "저녁밥", type: "meal" }, { k: "poop", ic: "변", label: "배변", type: "count" },
      { k: "medAM", ic: "약", label: "아침 약", type: "med" }, { k: "medPM", ic: "약", label: "저녁 약", type: "med" },
      { k: "cough", ic: "콜", label: "기침", type: "sym" }, { k: "vomit", ic: "토", label: "구토", type: "sym" },
      { k: "diarrhea", ic: "설", label: "설사", type: "sym" }, { k: "snack", ic: "간", label: "간식", type: "snack" }, { k: "note", ic: "✎", label: "메모", type: "note" }
    ],
    cat: [
      { k: "breakfast", ic: "아", label: "아침밥", type: "meal" }, { k: "dinner", ic: "저", label: "저녁밥", type: "meal" },
      { k: "pee", ic: "소", label: "소변 덩어리", type: "count" }, { k: "poop", ic: "변", label: "대변", type: "count" },
      { k: "medAM", ic: "약", label: "약·보조제", type: "med" }, { k: "water", ic: "물", label: "물 많이 마심", type: "sym" },
      { k: "leftover", ic: "남", label: "밥 남김", type: "sym" }, { k: "vomit", ic: "토", label: "구토·헤어볼", type: "sym" },
      { k: "diarrhea", ic: "설", label: "설사", type: "sym" }, { k: "snack", ic: "간", label: "간식", type: "snack" }, { k: "note", ic: "✎", label: "메모", type: "note" }
    ]
  };

  // ---------- 저장 ----------
  const blank = () => ({ v: 1, pets: [], cur: null, me: "나", family: ["나"], logs: [], weights: [], sch: [], demo: false });
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { S = null; }
  if (!S || S.v !== 1) S = blank();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("저장 공간이 부족하거나 막혀 있어요"); } }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------- 도우미 ----------
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const now = () => Date.now();
  const hm = (t) => { const d = new Date(t); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
  const md = (t) => { const d = new Date(t); return d.getMonth() + 1 + "/" + d.getDate(); };
  const ymd = (t) => { const d = new Date(t); return d.getFullYear() + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getDate()).padStart(2, "0"); };
  const iso = (t) => { const d = new Date(t); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const fromIso = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).getTime(); };
  const sod = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  function toast(msg) { const el = $("#toast"); el.textContent = msg; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 2000); }
  const P = () => S.pets.find((p) => p.id === S.cur) || S.pets[0];
  const btns = (p) => BUTTONS[p.species] || BUTTONS.dog;
  const label = (p, k) => (btns(p).find((b) => b.k === k) || { label: k }).label;
  const hasMeds = (p) => p.meds && p.meds.trim() && p.meds.trim() !== "없음";
  const age = (p) => { if (!p.birth) return ""; const b = new Date(fromIso(p.birth)), n = new Date(); let y = n.getFullYear() - b.getFullYear(); if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) y--; return y < 1 ? "1살 미만" : y + "살"; };
  const info = (p) => [p.breed, age(p), p.sex].filter(Boolean).join(" · ");
  const tags = (p) => [].concat((p.dx || "").split(",").map((s) => s.trim()).filter((s) => s && s !== "없음"), p.allergy && p.allergy !== "없음" ? [p.allergy + " 알레르기"] : []);
  const FOODTYPE = { breakfast: "foods", dinner: "foods", snack: "snacks" };
  // 최근에 쓴 것이 앞에 오도록 사료·간식 목록 정렬
  function itemsFor(p, k) {
    const list = (p[FOODTYPE[k]] || []).slice(), last = {};
    S.logs.forEach((l) => { if (l.pid === p.id && l.food && FOODTYPE[l.k] === FOODTYPE[k]) last[l.food] = Math.max(last[l.food] || 0, l.t); });
    return list.sort((a, b) => (last[b] || 0) - (last[a] || 0));
  }
  const logsOf = (p) => S.logs.filter((l) => l.pid === p.id);
  function checks(p) {
    const c = p.species === "cat" ? [["breakfast", "아침밥"], ["dinner", "저녁밥"], ["pee", "화장실 확인"]] : [["breakfast", "아침밥"], ["dinner", "저녁밥"]];
    if (hasMeds(p)) p.species === "cat" ? c.unshift(["medAM", "약·보조제"]) : c.unshift(["medAM", "아침 약"], ["medPM", "저녁 약"]);
    return c;
  }

  // ---------- 상태 ----------
  let tab = "today", picker = null, period = 3, editing = null;

  // ---------- 화면: 처음 ----------
  function petForm(p) {
    p = p || { species: "dog" };
    return `<form class="form card" id="petform">
      <label>이름<input id="f-name" required maxlength="20" value="${esc(p.name)}" placeholder="예: 보리" autocomplete="off"></label>
      <div class="r" role="radiogroup" aria-label="종류"><label style="display:flex;gap:6px;align-items:center;color:var(--ink)"><input type="radio" name="sp" value="dog" ${p.species !== "cat" ? "checked" : ""}> 강아지</label>
      <label style="display:flex;gap:6px;align-items:center;color:var(--ink)"><input type="radio" name="sp" value="cat" ${p.species === "cat" ? "checked" : ""}> 고양이</label></div>
      <div class="two"><label>품종<input id="f-breed" maxlength="30" value="${esc(p.breed)}" placeholder="예: 말티즈"></label>
      <label>생일(대략도 괜찮아요)<input id="f-birth" type="date" value="${esc(p.birth)}"></label></div>
      <label>성별<select id="f-sex">${["", "수컷", "암컷", "중성화 수컷", "중성화 암컷"].map((s) => `<option ${s === (p.sex || "") ? "selected" : ""} value="${s}">${s || "선택 안 함"}</option>`).join("")}</select></label>
      <label>진단받은 질환 (쉼표로 구분)<input id="f-dx" maxlength="100" value="${esc(p.dx)}" placeholder="예: 심장병, 슬개골 2기"></label>
      <label>알레르기<input id="f-allergy" maxlength="50" value="${esc(p.allergy)}" placeholder="예: 닭고기"></label>
      <label>매일 먹는 약<input id="f-meds" maxlength="100" value="${esc(p.meds)}" placeholder="예: 심장약 하루 2회"></label>
      <div class="r"><button class="btn" type="submit">${p.id ? "저장" : "등록"}</button>${editing || S.pets.length ? '<button class="btn ghost" type="button" data-act="cancel-pet">취소</button>' : ""}</div>
    </form>`;
  }
  function vWelcome() {
    return `<div class="welcome"><h1>병원 갈 때 내미는 한 장</h1>
    <p>산책, 밥, 약, 체중, 접종을 한 번 눌러 기록하고, 동물병원에서는 최근 기록을 한 장으로 보여 주세요. 강아지와 고양이를 함께 등록할 수 있어요.</p>
    ${petForm()}
    <p class="note" style="margin-top:14px">먼저 둘러보고 싶으시면 <button class="iconbtn" data-act="demo" type="button">예시로 둘러보기</button></p>
    <p class="note">기록은 이 휴대폰에만 저장돼요. 가족과 함께 쓰는 기능은 곧 추가돼요.</p></div>`;
  }

  // ---------- 화면: 오늘 ----------
  function pending(p) { const t0 = sod(now()); return checks(p).filter(([k]) => !S.logs.some((l) => l.pid === p.id && l.k === k && l.t >= t0)).map((c) => c[1]); }
  function vToday() {
    const p = P(), t0 = sod(now()), today = logsOf(p).filter((l) => l.t >= t0).sort((a, b) => b.t - a.t);
    const has = (k) => today.find((l) => l.k === k);
    const st = (k, lab) => { const l = has(k); return `<div class="st ${l ? "ok" : "todo"}"><b>${lab}</b><span class="v">${l ? hm(l.t) + " · " + esc(l.by) : "아직 안 했어요"}</span></div>`; };
    const btn = (b) => `<button class="qb${b.type === "sym" ? " sym" : ""}" data-log="${b.k}" type="button"><span class="ic">${b.ic}</span><span>${b.label}</span></button>`;
    const up = nextSchedules(p).slice(0, 2);
    const house = S.pets.length > 1 ? `<section><h2>우리 집 오늘 <span class="pill">${S.pets.length}마리</span></h2><div class="home">${S.pets.map((q) => { const pd = pending(q); return `<div class="h"><span class="mini">${ICON[q.species]}</span><div><b>${esc(q.name)}</b> <span class="${pd.length ? "todo" : "done"}">${pd.length ? pd.join(", ") + " 아직" : "오늘 챙길 것 다 했어요"}</span></div></div>`; }).join("")}</div></section>` : "";
    let pk = "";
    if (picker === "walk") pk = `<div class="picker" role="group" aria-label="산책 시간"><span>몇 분 걸었나요?</span>${[10, 20, 30, 45, 60].map((m) => `<button data-walk="${m}" type="button">${m}분</button>`).join("")}</div>`;
    if (FOODTYPE[picker]) {
      const items = itemsFor(p, picker), what = picker === "snack" ? "간식" : "사료";
      pk = `<div class="picker" role="group" aria-label="${what} 고르기"><span>${label(p, picker)}: 어떤 ${what}을 줬나요?</span>
        ${items.map((f) => `<button data-food="${esc(f)}" type="button">${esc(f)}</button>`).join("")}
        ${picker !== "snack" ? '<button data-food="" type="button" style="border-style:dashed">고르지 않고 기록</button>' : ""}
        <form id="foodform" class="addw" style="width:100%;margin-top:4px"><input id="foodname" maxlength="30" placeholder="${items.length ? "다른 " + what + " 직접 입력" : what + " 이름 (예: " + (picker === "snack" ? "져키" : "로얄캐닌 처방식") + ")"}" autocomplete="off"><button class="btn" type="submit">기록</button></form></div>`;
    }
    if (picker === "note") pk = `<form class="picker form" id="noteform" style="display:grid"><label style="color:var(--ink)">병원에 전할 메모<textarea id="notetext" rows="2" maxlength="200" placeholder="예: 밤에 기침하고 숨이 조금 가빠 보임"></textarea></label><div class="r"><button class="btn" type="submit">저장</button><button class="btn ghost" type="button" data-act="close-picker">취소</button></div></form>`;
    return `${house}
    <section><h2>${esc(p.name)} 한 번 눌러 기록</h2><div class="grid">${btns(p).map(btn).join("")}</div>${pk}</section>
    <section><h2>오늘 챙길 것</h2><div class="status">${checks(p).map(([k, l]) => st(k, l)).join("")}</div></section>
    <section><h2>다가오는 일정</h2><div class="list">${up.length ? up.map((s) => schRow(s, false)).join("") : '<div class="empty">일정 탭에서 접종·구충 일정을 넣으면 여기 보여요</div>'}</div></section>
    <section><h2>오늘 기록 <span class="pill">${today.length}건</span></h2>
    <div class="list">${today.length ? today.map((l) => `<div class="row${(btns(p).find((b) => b.k === l.k) || {}).type === "sym" ? " sym" : ""}"><span class="time">${hm(l.t)}</span><span class="what">${label(p, l.k)}${l.food ? " · " + esc(l.food) : ""}${l.min ? " " + l.min + "분" : ""}${l.text ? " · " + esc(l.text) : ""}</span><span class="who">${esc(l.by)}</span><button class="del" data-dellog="${l.id}" aria-label="이 기록 지우기" type="button">×</button></div>`).join("") : '<div class="empty">아직 기록이 없어요. 위 버튼을 눌러 보세요.</div>'}</div></section>`;
  }

  // ---------- 화면: 체중 ----------
  function weightChart(ws) {
    const W = 340, H = 170, pd = { l: 36, r: 12, t: 14, b: 26 };
    const xs = ws.map((w) => w.t), ys = ws.map((w) => w.kg);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.floor((Math.min(...ys) - 0.1) * 10) / 10, y1 = Math.ceil((Math.max(...ys) + 0.1) * 10) / 10;
    const X = (t) => pd.l + ((t - x0) / (x1 - x0 || 1)) * (W - pd.l - pd.r), Y = (v) => pd.t + ((y1 - v) / (y1 - y0 || 1)) * (H - pd.t - pd.b);
    const span = y1 - y0, step = span > 4 ? 1 : span > 2 ? 0.5 : span > 0.8 ? 0.2 : 0.1;
    const ticks = []; for (let v = Math.ceil(y0 / step) * step; v <= y1 + 1e-9; v += step) ticks.push(+v.toFixed(1));
    const path = ws.map((w, i) => (i ? "L" : "M") + X(w.t).toFixed(1) + " " + Y(w.kg).toFixed(1)).join(" ");
    const area = path + ` L${X(x1).toFixed(1)} ${H - pd.b} L${X(x0).toFixed(1)} ${H - pd.b} Z`;
    const last = ws[ws.length - 1], first = ws[0];
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="체중 변화 그래프">
      ${ticks.map((v) => `<line x1="${pd.l}" x2="${W - pd.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${pd.l - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="10.5" fill="var(--muted)" font-family="var(--f-num)">${v.toFixed(1)}</text>`).join("")}
      <path d="${area}" fill="var(--accent)" fill-opacity=".1"/><path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
      ${ws.map((w) => `<circle cx="${X(w.t)}" cy="${Y(w.kg)}" r="2.5" fill="var(--accent)"/>`).join("")}
      <circle cx="${X(last.t)}" cy="${Y(last.kg)}" r="5" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"/>
      <text x="${X(first.t)}" y="${H - 8}" font-size="10.5" fill="var(--muted)">${md(first.t)}</text><text x="${X(last.t)}" y="${H - 8}" text-anchor="end" font-size="10.5" fill="var(--muted)">${md(last.t)}</text></svg>`;
  }
  function vWeight() {
    const p = P(), all = S.weights.filter((w) => w.pid === p.id).sort((a, b) => a.t - b.t), ws = all.filter((w) => w.t >= now() - 183 * DAY);
    const form = `<form class="addw" id="wform"><label for="wkg" style="position:absolute;left:-9999px">오늘 체중</label><input id="wkg" inputmode="decimal" placeholder="오늘 체중 kg (예: 3.55)" autocomplete="off"><button class="btn" type="submit">기록</button></form>`;
    if (!all.length) return `<section><h2>${esc(p.name)} 체중</h2><div class="card"><div class="empty">아직 체중 기록이 없어요. 첫 체중을 넣어 주세요.</div>${form}</div></section>`;
    const last = all[all.length - 1], first = ws[0] || last, pct = ((last.kg - first.kg) / first.kg) * 100;
    return `<section><h2>${esc(p.name)} 체중 <span class="pill">최근 6개월</span></h2><div class="card">
      <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span class="big">${last.kg.toFixed(2)}<small style="font-size:15px"> kg</small></span>
      ${ws.length > 1 ? `<span class="delta" style="${pct > -5 ? "color:var(--muted)" : ""}">${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% (${md(first.t)} ${first.kg.toFixed(2)}kg 대비)</span>` : ""}</div>
      ${ws.length > 1 ? `<div class="chart" style="margin-top:8px">${weightChart(ws)}</div>` : ""}${form}
      <div class="note">6개월 사이 5% 넘게 줄면 병원용 요약에 빨간 표시가 붙어요. 원인 판단은 수의사 몫이고, 앱은 숫자만 보여 줘요.</div></div></section>
      <section><h2>체중 기록</h2><div class="list">${all.slice().reverse().slice(0, 12).map((w) => `<div class="row"><span class="time">${md(w.t)}</span><span class="what">${w.kg.toFixed(2)} kg</span><button class="del" data-delw="${w.id}" aria-label="이 체중 기록 지우기" type="button">×</button></div>`).join("")}</div></section>`;
  }

  // ---------- 화면: 일정 ----------
  function nextSchedules(p) { return S.sch.filter((s) => s.pid === p.id).map((s) => { const due = s.last + s.every * DAY; return Object.assign({ due, left: Math.round((sod(due) - sod(now())) / DAY) }, s); }).sort((a, b) => a.due - b.due); }
  function schRow(s, withDel) {
    const cls = s.left < 0 ? "over" : s.left <= 7 ? "soon" : "", dd = s.left === 0 ? "D-day" : s.left > 0 ? "D-" + s.left : "D+" + -s.left;
    return `<div class="sch"><span class="dday ${cls}">${dd}</span><span class="what">${esc(s.name)}<small>마지막 ${ymd(s.last)} · ${s.every}일마다 · 다음 ${ymd(s.due)}</small></span><button data-done="${s.id}" type="button">오늘 함</button>${withDel ? `<button class="del" data-delsch="${s.id}" aria-label="일정 지우기" type="button">×</button>` : ""}</div>`;
  }
  function vSchedule() {
    const p = P(), list = nextSchedules(p);
    const presets = p.species === "cat" ? [["외부 구충제", 30], ["종합백신", 365], ["정기검진", 180]] : [["심장사상충 예방약", 30], ["외부 구충제", 30], ["종합백신", 365], ["광견병 접종", 365], ["정기검진", 180]];
    const all = S.pets.length > 1 ? `<section><h2>우리 집 전체 일정</h2><div class="list">${S.pets.flatMap((q) => nextSchedules(q).map((s) => Object.assign({ who: q.name }, s))).sort((a, b) => a.due - b.due).slice(0, 5).map((s) => `<div class="row"><span class="time">${md(s.due)}</span><span class="what">${esc(s.who)} · ${esc(s.name)}</span></div>`).join("") || '<div class="empty">일정이 없어요</div>'}</div></section>` : "";
    return `<section><h2>${esc(p.name)} 접종·예방 일정</h2><div class="list">${list.length ? list.map((s) => schRow(s, true)).join("") : '<div class="empty">아직 일정이 없어요. 아래에서 추가해 주세요.</div>'}</div></section>
    <section><h2>일정 추가</h2><form class="form card" id="schform">
      <label>이름<input id="s-name" list="s-presets" required maxlength="30" placeholder="예: 심장사상충 예방약"><datalist id="s-presets">${presets.map(([n]) => `<option value="${n}">`).join("")}</datalist></label>
      <div class="two"><label>마지막으로 한 날<input id="s-last" type="date" required value="${iso(now())}"></label><label>며칠마다<input id="s-every" type="number" min="1" max="1095" required value="30" inputmode="numeric"></label></div>
      <div class="r"><button class="btn" type="submit">추가</button></div>
      <div class="note" style="margin:0">간격은 수의사 안내대로 넣어 주세요. 앱이 권장 간격을 정하지 않아요.</div></form></section>${all}`;
  }

  // ---------- 화면: 병원용 요약 ----------
  // 요약 데이터 (화면·복사·이미지가 같이 씀). 값은 이스케이프 전 원문
  function summaryData(p) {
    const N = now(), from = N - period * 30 * DAY, days = period * 30, B = btns(p);
    const PL = logsOf(p), L = PL.filter((l) => l.t >= from), cnt = (k) => L.filter((l) => l.k === k).length;
    const rows = [];
    const ws = S.weights.filter((w) => w.pid === p.id && w.t >= from).sort((a, b) => a.t - b.t), wf = ws[0], wl = ws[ws.length - 1], wp = wf && wl ? ((wl.kg - wf.kg) / wf.kg) * 100 : 0;
    rows.push(["체중", wf ? wf.kg.toFixed(2) + " → " + wl.kg.toFixed(2) + "kg (" + (wp >= 0 ? "+" : "") + wp.toFixed(1) + "%)" : "기록 없음", wp <= -5]);
    B.filter((b) => b.type === "sym").forEach((b) => {
      const rec = PL.filter((l) => l.k === b.k && l.t >= N - 21 * DAY).length, bef = PL.filter((l) => l.k === b.k && l.t < N - 21 * DAY && l.t >= N - 63 * DAY).length;
      if (rec || bef) rows.push([b.label, `최근 3주 ${rec}회 (그 전 6주 ${bef}회)`, rec >= 3 && rec > (bef / 2) * 1.5]);
    });
    const meds = B.filter((b) => b.type === "med" && (p.species === "cat" || b.k === "medAM" || /2|두|저녁/.test(p.meds || "")));
    if (hasMeds(p)) {
      const firstLog = Math.max(from, Math.min(...PL.map((l) => l.t).concat([N])));
      const d = Math.max(1, Math.round((N - firstLog) / DAY)), n = meds.reduce((a, b) => a + cnt(b.k), 0), exp = d * meds.length;
      rows.push(["약 복용", `${Math.min(100, Math.round((n / exp) * 100))}% (빠진 횟수 약 ${Math.max(0, exp - n)}회)`, false]);
    }
    const tally = (keys) => { const m = {}; L.forEach((l) => { if (keys.includes(l.k) && l.food) m[l.food] = (m[l.food] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
    const foodsUsed = tally(["breakfast", "dinner"]);
    if (foodsUsed.length) rows.push(["먹은 사료", foodsUsed.slice(0, 3).map(([f, n]) => `${f} ${n}회`).join(", "), false]);
    const snacks = L.filter((l) => l.k === "snack");
    if (snacks.length) { const st = tally(["snack"]); const sd = Math.max(1, Math.round((N - Math.max(from, Math.min(...PL.map((l) => l.t)))) / DAY)); rows.push(["간식", `${snacks.length}회, 하루 평균 ${(snacks.length / sd).toFixed(1)}회${st.length ? " (" + st.slice(0, 3).map(([f, n]) => `${f} ${n}`).join(", ") + ")" : ""}`, false]); }
    const mealN = cnt("breakfast") + cnt("dinner");
    if (mealN) { const firstLog = Math.max(from, Math.min(...PL.map((l) => l.t))); const d = Math.max(1, Math.round((N - firstLog) / DAY)); rows.push(["식사", Math.min(100, Math.round((mealN / (d * 2)) * 100)) + "%", false]); }
    B.filter((b) => b.type === "count").forEach((b) => { const c = cnt(b.k); if (!c) return; const rec = PL.filter((l) => l.k === b.k && l.t >= N - 28 * DAY).length / 28; rows.push([b.label, `하루 평균 ${(c / days).toFixed(1)}회 (최근 4주 ${rec.toFixed(1)}회)`, rec > (c / days) * 1.2 && rec >= 1]); });
    const walks = L.filter((l) => l.k === "walk");
    if (walks.length) rows.push(["산책", `${walks.length}회, 평균 ${Math.round(walks.reduce((a, b) => a + (b.min || 0), 0) / walks.length)}분`, false]);
    const notes = L.filter((l) => l.k === "note").sort((a, b) => b.t - a.t), sch = nextSchedules(p);
    return { p, from, N, rows, notes, sch, ws,
      basics: [["종류 · 정보", (p.species === "cat" ? "고양이" : "강아지") + (info(p) ? " · " + info(p) : "")], ["진단받은 질환", p.dx || "없음"], ["알레르기", p.allergy || "없음"], ["매일 먹는 약", p.meds || "없음"]] };
  }
  function vSummary() {
    const D = summaryData(P()), { p, from, N, rows, notes, sch } = D;
    return `<section><h2>병원용 한 장 요약</h2>
    <div class="seg" role="group" aria-label="기간">${[1, 3, 6].map((m) => `<button data-period="${m}" aria-pressed="${m === period}" type="button">최근 ${m}개월</button>`).join("")}</div>
    <article class="sheet" id="sheet"><div class="hd"><b>${esc(p.name)} 진료 참고 기록</b><span>${ymd(from)} ~ ${ymd(N)}</span></div>
      <h3>기본 정보</h3><table>${D.basics.map(([a, b]) => `<tr><td>${a}</td><td>${esc(b)}</td></tr>`).join("")}</table>
      <h3>기간 중 변화</h3><table>${rows.map(([a, b, f]) => `<tr><td>${esc(a)}</td><td class="num${f ? " flag" : ""}">${esc(b)}</td></tr>`).join("")}</table>
      <h3>보호자 메모</h3>${notes.length ? `<ul>${notes.map((n) => `<li>${md(n.t)} ${esc(n.text)} (${esc(n.by)})</li>`).join("")}</ul>` : '<div class="note">메모 없음</div>'}
      <h3>예방·접종</h3><table>${sch.length ? sch.map((s) => `<tr><td>${esc(s.name)}</td><td class="num">${ymd(s.last)}</td></tr>`).join("") : '<tr><td colspan="2">등록된 일정 없음</td></tr>'}</table>
      <div class="note">보호자가 앱에 기록한 내용을 정리한 것으로, 진단이 아닙니다.</div></article>
    <div class="lock"><button class="btn" data-act="image" type="button">이미지로 저장·공유</button><button class="btn ghost" data-act="copy" type="button">글자로 복사</button></div>
    <div class="note">빨간 글씨는 숫자가 크게 바뀐 항목이에요. 진료실에서 이 화면을 보여 주거나, 이미지로 저장해 카톡으로 보내세요.</div></section>`;
  }

  // ---------- 요약 이미지 (캔버스로 직접 그림, 외부 라이브러리 없음) ----------
  async function summaryImage() {
    const D = summaryData(P()), { p, from, N, rows, notes, sch, ws } = D;
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (_) {}
    const W = 1080, PAD = 64, LW = 300, F = '"IBM Plex Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
    const C = { bg: "#FFFFFF", ink: "#18272B", muted: "#5B6B6F", rule: "#D5DFDC", accent: "#17715F", crit: "#B33A3A", soft: "#E1F0EC" };
    const cv = document.createElement("canvas"); cv.width = W; cv.height = 6000; const x = cv.getContext("2d");
    x.fillStyle = C.bg; x.fillRect(0, 0, W, cv.height); x.textBaseline = "alphabetic";
    const font = (sz, wt) => (x.font = `${wt || 400} ${sz}px ${F}`);
    // 띄어쓰기 단위로 줄바꿈, 한 단어가 너무 길면 글자 단위로
    const wrap = (text, maxW) => { const out = []; let line = "";
      for (const word of String(text).split(/(\s+)/)) { if (!word) continue;
        if (x.measureText(line + word).width <= maxW) { line += word; continue; }
        if (line.trim()) { out.push(line.trimEnd()); line = ""; } if (!word.trim()) continue;
        for (const ch of word) { if (x.measureText(line + ch).width > maxW && line) { out.push(line); line = ""; } line += ch; } }
      if (line.trim()) out.push(line.trimEnd()); return out.length ? out : [""]; };
    let y = PAD + 52;
    font(52, 700); x.fillStyle = C.ink; x.fillText(p.name + " 진료 참고 기록", PAD, y);
    y += 44; font(28); x.fillStyle = C.muted; x.fillText(ymd(from) + " ~ " + ymd(N) + " · 보호자 기록", PAD, y);
    y += 26; x.fillStyle = C.ink; x.fillRect(PAD, y, W - PAD * 2, 4); y += 20;
    const section = (t) => { y += 40; font(26, 600); x.fillStyle = C.muted; x.fillText(t, PAD, y); y += 14; };
    const row = (a, b, flag) => {
      font(30); const labs = wrap(a, LW - 24); font(30, flag ? 700 : 400); const lines = wrap(b, W - PAD * 2 - LW); const h = 30 + Math.max(lines.length, labs.length) * 42;
      font(30); x.fillStyle = C.muted; labs.forEach((ln, i) => x.fillText(ln, PAD, y + 42 + i * 42));
      font(30, flag ? 700 : 400); x.fillStyle = flag ? C.crit : C.ink; lines.forEach((ln, i) => x.fillText(ln, PAD + LW, y + 42 + i * 42));
      y += h; x.fillStyle = C.rule; x.fillRect(PAD, y, W - PAD * 2, 2);
    };
    section("기본 정보"); D.basics.forEach(([a, b]) => row(a, b, false));
    section("기간 중 변화"); rows.forEach(([a, b, f]) => row(a, b, f));
    if (ws.length > 1) { // 체중 추이 작은 그래프
      y += 24; const gx = PAD + LW, gw = W - PAD * 2 - LW, gh = 150, lo = Math.min(...ws.map((w) => w.kg)), hi = Math.max(...ws.map((w) => w.kg)), t0 = ws[0].t, t1 = ws[ws.length - 1].t;
      const X = (t) => gx + ((t - t0) / (t1 - t0 || 1)) * gw, Y = (v) => y + gh - ((v - lo) / (hi - lo || 1)) * (gh - 20) - 10;
      font(24); x.fillStyle = C.muted; x.fillText("체중 추이", PAD, y + 34); x.fillText(hi.toFixed(2) + "kg", PAD, y + 70); x.fillText(lo.toFixed(2) + "kg", PAD, y + gh);
      x.strokeStyle = C.accent; x.lineWidth = 4; x.lineJoin = "round"; x.beginPath(); ws.forEach((w, i) => (i ? x.lineTo(X(w.t), Y(w.kg)) : x.moveTo(X(w.t), Y(w.kg)))); x.stroke();
      x.fillStyle = C.accent; ws.forEach((w) => { x.beginPath(); x.arc(X(w.t), Y(w.kg), 6, 0, 7); x.fill(); });
      font(22); x.fillStyle = C.muted; x.fillText(md(t0), gx, y + gh + 30); x.textAlign = "right"; x.fillText(md(t1), gx + gw, y + gh + 30); x.textAlign = "left";
      y += gh + 44; x.fillStyle = C.rule; x.fillRect(PAD, y, W - PAD * 2, 2);
    }
    section("보호자 메모");
    if (notes.length) notes.slice(0, 8).forEach((n) => { font(30); wrap(md(n.t) + "  " + n.text + " (" + n.by + ")", W - PAD * 2).forEach((ln) => { y += 44; x.fillStyle = C.ink; x.fillText(ln, PAD, y); }); });
    else { y += 44; font(30); x.fillStyle = C.muted; x.fillText("메모 없음", PAD, y); }
    y += 14; section("예방·접종");
    if (sch.length) sch.forEach((s) => row(s.name, ymd(s.last) + " (다음 " + ymd(s.due) + ")", false)); else row("등록된 일정", "없음", false);
    y += 48; font(24); x.fillStyle = C.muted; x.fillText("보호자가 앱에 기록한 내용을 정리한 것으로, 진단이 아닙니다.", PAD, y);
    y += 56; x.fillStyle = C.soft; x.fillRect(0, y, W, 72); font(26, 600); x.fillStyle = C.accent; x.fillText("댕냥차트", PAD, y + 46); font(24); x.fillStyle = C.muted; x.textAlign = "right"; x.fillText(location.host, W - PAD, y + 46); x.textAlign = "left";
    y += 72;
    const out = document.createElement("canvas"); out.width = W; out.height = y; out.getContext("2d").drawImage(cv, 0, 0);
    return new Promise((res) => out.toBlob((b) => res(b), "image/png"));
  }
  async function shareSummaryImage() {
    toast("이미지를 만드는 중이에요");
    const blob = await summaryImage(); if (!blob) { toast("이미지를 만들지 못했어요"); return; }
    const name = P().name + "-진료기록-" + iso(now()) + ".png", file = new File([blob], name, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: P().name + " 진료 참고 기록" }); return; } catch (e) { if (e && e.name === "AbortError") return; }
    }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast("이미지를 저장했어요");
  }

  // ---------- 화면: 설정 ----------
  function vSettings() {
    if (editing) return `<section><h2>${editing === "new" ? "아이 추가" : "아이 정보 수정"}</h2>${petForm(editing === "new" ? null : S.pets.find((p) => p.id === editing))}</section>`;
    return `<section><h2>우리 아이들</h2><div class="list">${S.pets.map((p) => `<div class="row"><span class="mini" style="width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent)">${ICON[p.species].replace("<svg", '<svg width="18" height="18"')}</span><span class="what">${esc(p.name)} <small style="color:var(--muted)">${esc(info(p))}</small></span><button class="iconbtn" data-editpet="${p.id}" type="button">수정</button></div>`).join("")}</div>
      <div class="r" style="display:flex;gap:8px;margin-top:10px"><button class="btn" data-act="add-pet" type="button">+ 아이 추가</button></div></section>
    <section><h2>기록하는 사람</h2><div class="card form"><label>지금 이 휴대폰을 쓰는 사람<select id="me">${S.family.map((f) => `<option ${f === S.me ? "selected" : ""}>${esc(f)}</option>`).join("")}</select></label>
      <form class="addw" id="famform" style="margin:0"><input id="famname" maxlength="10" placeholder="가족 이름 추가 (예: 엄마)" autocomplete="off"><button class="btn" type="submit">추가</button></form>
      <div class="note" style="margin:0">가족이 각자 휴대폰으로 함께 기록하는 기능은 다음 업데이트에서 나와요. 지금은 한 휴대폰에서 누가 눌렀는지만 구분해요.</div></div></section>
    ${(() => { const p = P(), chip = (key, f) => `<span class="who" style="display:inline-flex;gap:4px;align-items:center;color:var(--ink)">${esc(f)}<button class="del" data-delfood="${key}|${esc(f)}" aria-label="${esc(f)} 빼기" type="button">×</button></span>`;
      return `<section><h2>${esc(p.name)} 사료·간식 목록</h2><div class="card"><div class="note" style="margin:0 0 6px">사료</div><div style="display:flex;gap:6px;flex-wrap:wrap">${(p.foods || []).map((f) => chip("foods", f)).join("") || '<span class="note" style="margin:0">아직 없어요. 아침밥·저녁밥을 누를 때 입력하면 여기 쌓여요.</span>'}</div>
      <div class="note" style="margin:12px 0 6px">간식</div><div style="display:flex;gap:6px;flex-wrap:wrap">${(p.snacks || []).map((f) => chip("snacks", f)).join("") || '<span class="note" style="margin:0">아직 없어요. 간식 버튼을 누를 때 입력하면 여기 쌓여요.</span>'}</div></div></section>`; })()}
    <section><h2>백업</h2><div class="card"><div class="r" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost" data-act="export" type="button">백업 파일 저장</button><label class="btn ghost" style="display:inline-block">백업 불러오기<input id="importfile" type="file" accept="application/json" hidden></label></div>
      <div class="note">기록은 이 휴대폰 브라우저에만 있어요. 브라우저 기록을 지우면 사라지니 가끔 백업해 두세요.</div></div></section>
    <section><h2>앱 설치</h2><div class="card note" style="margin:0">아이폰: 사파리 아래 공유 버튼 → "홈 화면에 추가"<br>안드로이드: 크롬 오른쪽 위 ⋮ → "앱 설치" 또는 "홈 화면에 추가"</div></section>
    <section><button class="btn ghost danger" data-act="wipe" type="button">${S.confirmWipe ? "정말 지울까요? 한 번 더 누르면 모두 지워져요" : "모든 기록 지우기"}</button></section>`;
  }

  // ---------- 그리기 ----------
  function render() {
    const has = S.pets.length > 0;
    if (has && !S.pets.some((p) => p.id === S.cur)) S.cur = S.pets[0].id;
    $("#banner").innerHTML = S.demo ? `<div class="demo"><span>예시 데이터를 보고 있어요.</span><button data-act="clear-demo" type="button">지우고 내 아이 등록하기</button></div>` : "";
    $("#tabs").hidden = !has;
    if (!has) { $("#pets").innerHTML = ""; $("#pethead").innerHTML = ""; $("#pethead").hidden = true; $("#view").innerHTML = vWelcome(); return; }
    $("#pets").innerHTML = S.pets.map((p) => `<button data-pet="${p.id}" aria-pressed="${p.id === S.cur && tab !== "settings"}" type="button"><span class="mini">${ICON[p.species]}</span>${esc(p.name)}</button>`).join("") + `<button class="add" data-act="add-pet" type="button">+ 아이 추가</button>`;
    const p = P();
    $("#pethead").innerHTML = tab === "settings" ? "" : `<div class="avatar" aria-hidden="true" style="color:var(--accent)">${ICON[p.species]}</div><div style="min-width:0"><h1>${esc(p.name)} <span style="font-weight:400;font-size:14px;color:var(--muted)">${esc(info(p))}</span></h1><div class="tags">${tags(p).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div></div>`;
    $("#pethead").hidden = tab === "settings";
    document.querySelectorAll("nav.tabs button").forEach((b) => b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false"));
    $("#view").innerHTML = { today: vToday, weight: vWeight, schedule: vSchedule, summary: vSummary, settings: vSettings }[tab]();
  }

  // ---------- 동작 ----------
  function addLog(k, extra) { const p = P(); S.logs.push(Object.assign({ id: uid(), pid: p.id, k, t: now(), by: S.me }, extra || {})); save(); toast(p.name + " " + label(p, k) + (extra && extra.food ? "(" + extra.food + ")" : "") + " 기록했어요"); picker = null; render(); }
  function demo() {
    const r = ((s) => () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296))(42);
    const at = (d, h, m) => { const x = new Date(); x.setDate(x.getDate() - d); x.setHours(h, m, 0, 0); return x.getTime(); };
    const fam = ["나", "엄마", "민지"], S2 = blank(); S2.demo = true; S2.family = fam;
    const bori = { id: uid(), name: "보리", species: "dog", breed: "말티즈", birth: iso(at(13 * 365 + 40, 0, 0)), sex: "중성화 수컷", dx: "심장병(이첨판), 슬개골 2기", allergy: "닭고기", meds: "심장약 하루 2회 (아침·저녁)" };
    const nabi = { id: uid(), name: "나비", species: "cat", breed: "코리안 숏헤어", birth: iso(at(10 * 365 + 100, 0, 0)), sex: "중성화 암컷", dx: "신장 수치 관찰 중", allergy: "", meds: "신장 보조제 하루 1회" };
    bori.foods = ["로얄캐닌 심장 처방식", "힐스 k/d"]; bori.snacks = ["져키", "덴탈껌", "고구마"];
    nabi.foods = ["신장 처방식 습식", "신장 처방식 건식"]; nabi.snacks = ["츄르"];
    S2.pets = [bori, nabi]; S2.cur = bori.id;
    const add = (pid, k, d, h, m, extra) => { const t = at(d, h, m); if (t <= now()) S2.logs.push(Object.assign({ id: uid(), pid, k, t, by: fam[Math.floor(r() * 3)] }, extra || {})); };
    for (let d = 180; d >= 0; d--) {
      add(bori.id, "breakfast", d, 8, Math.floor(r() * 30), { food: d < 40 ? "로얄캐닌 심장 처방식" : "힐스 k/d" }); if (r() < 0.6) add(bori.id, "snack", d, 15, Math.floor(r() * 59), { food: ["져키", "덴탈껌", "고구마"][Math.floor(r() * 3)] }); if (r() > 0.04) add(bori.id, "medAM", d, 8, 10 + Math.floor(r() * 30));
      if (r() > 0.08) add(bori.id, "walk", d, 7 + Math.floor(r() * 2) * 11, Math.floor(r() * 50), { min: [15, 20, 25, 30][Math.floor(r() * 4)] });
      if (r() > 0.06) add(bori.id, "dinner", d, 18, Math.floor(r() * 50), { food: d < 40 ? "로얄캐닌 심장 처방식" : "힐스 k/d" }); if (r() > 0.07) add(bori.id, "medPM", d, 20, Math.floor(r() * 40));
      add(bori.id, "poop", d, 9 + Math.floor(r() * 8), Math.floor(r() * 59)); if (r() < (d < 21 ? 0.45 : 0.08)) add(bori.id, "cough", d, 21 + Math.floor(r() * 2), Math.floor(r() * 59)); if (r() < 0.03) add(bori.id, "vomit", d, 14, Math.floor(r() * 59));
      add(nabi.id, "breakfast", d, 7, 30 + Math.floor(r() * 25), { food: "신장 처방식 습식" }); if (r() < 0.3) add(nabi.id, "snack", d, 16, Math.floor(r() * 59), { food: "츄르" }); if (r() > 0.05) add(nabi.id, "medAM", d, 7, 50 + Math.floor(r() * 9)); if (r() > 0.04) add(nabi.id, "dinner", d, 19, Math.floor(r() * 50));
      const pees = 2 + Math.floor(r() * 2) + (d < 28 && r() < 0.5 ? 1 : 0); for (let i = 0; i < pees; i++) add(nabi.id, "pee", d, 8 + i * 5, Math.floor(r() * 59));
      if (r() > 0.15) add(nabi.id, "poop", d, 10 + Math.floor(r() * 8), Math.floor(r() * 59)); if (r() < (d < 28 ? 0.35 : 0.06)) add(nabi.id, "water", d, 15, Math.floor(r() * 59));
      if (r() < (d < 28 ? 0.25 : 0.05)) add(nabi.id, "leftover", d, 20, Math.floor(r() * 59)); if (r() < 0.05) add(nabi.id, "vomit", d, 6, Math.floor(r() * 59));
    }
    add(bori.id, "note", 9, 21, 30, { text: "밤에 기침하고 숨이 조금 가빠 보임", by: "엄마" }); add(nabi.id, "note", 6, 22, 0, { text: "물그릇이 평소보다 빨리 비어요", by: "민지" });
    [3.92, 3.9, 3.86, 3.84, 3.8, 3.78, 3.75, 3.7, 3.66, 3.62, 3.6, 3.56].forEach((kg, i) => S2.weights.push({ id: uid(), pid: bori.id, t: at(177 - i * 15, 9, 0), kg }));
    [4.62, 4.6, 4.61, 4.57, 4.55, 4.52, 4.38].forEach((kg, i) => S2.weights.push({ id: uid(), pid: nabi.id, t: at(i < 6 ? 170 - i * 33 : 4, 9, 0), kg }));
    [["심장사상충 예방약", 24, 30], ["외부 구충제", 24, 30], ["정기검진(심장 초음파)", 170, 180], ["종합백신", 260, 365], ["광견병 접종", 260, 365]].forEach(([name, d, every]) => S2.sch.push({ id: uid(), pid: bori.id, name, last: sod(at(d, 0, 0)), every }));
    [["외부 구충제", 28, 30], ["신장 혈액검사", 85, 90], ["종합백신", 300, 365]].forEach(([name, d, every]) => S2.sch.push({ id: uid(), pid: nabi.id, name, last: sod(at(d, 0, 0)), every }));
    return S2;
  }
  function download(name, text) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const d = b.dataset;
    if (d.act !== "wipe" && S.confirmWipe) { S.confirmWipe = false; }
    if (d.tab) { tab = d.tab; picker = null; editing = null; render(); scrollTo(0, 0); return; }
    if (d.pet) { S.cur = d.pet; if (tab === "settings") tab = "today"; picker = null; save(); render(); return; }
    if (d.log) { if (d.log === "walk" || d.log === "note" || FOODTYPE[d.log]) { picker = picker === d.log ? null : d.log; render(); if (picker === "note") { const t = $("#notetext"); t && t.focus(); } return; } addLog(d.log); return; }
    if (d.walk) { addLog("walk", { min: +d.walk }); return; }
    if (d.food !== undefined && FOODTYPE[picker]) { addLog(picker, d.food ? { food: d.food } : {}); return; }
    if (d.delfood) { const p = P(), [key, name] = d.delfood.split("|"); p[key] = (p[key] || []).filter((x) => x !== name); save(); toast(name + " 목록에서 뺐어요"); render(); return; }
    if (d.dellog) { S.logs = S.logs.filter((l) => l.id !== d.dellog); save(); toast("기록을 지웠어요"); render(); return; }
    if (d.delw) { S.weights = S.weights.filter((w) => w.id !== d.delw); save(); toast("체중 기록을 지웠어요"); render(); return; }
    if (d.delsch) { S.sch = S.sch.filter((s) => s.id !== d.delsch); save(); toast("일정을 지웠어요"); render(); return; }
    if (d.done) { const s = S.sch.find((x) => x.id === d.done); s.last = sod(now()); save(); toast(s.name + " 완료, 다음 날짜를 다시 계산했어요"); render(); return; }
    if (d.period) { period = +d.period; render(); return; }
    if (d.editpet) { editing = d.editpet; render(); return; }
    switch (d.act) {
      case "add-pet": tab = "settings"; editing = "new"; render(); scrollTo(0, 0); return;
      case "cancel-pet": editing = null; render(); return;
      case "close-picker": picker = null; render(); return;
      case "demo": S = demo(); save(); tab = "today"; render(); return;
      case "clear-demo": S = blank(); save(); tab = "today"; render(); return;
      case "export": download("댕냥차트-백업-" + iso(now()) + ".json", JSON.stringify(S)); toast("백업 파일을 저장했어요"); return;
      case "wipe": if (!S.confirmWipe) { S.confirmWipe = true; render(); return; } S = blank(); save(); tab = "today"; editing = null; toast("모든 기록을 지웠어요"); render(); return;
      case "image": shareSummaryImage(); return;
      case "copy": { const txt = $("#sheet").innerText; const sel = () => { const r = document.createRange(); r.selectNodeContents($("#sheet")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast("복사했어요. 카톡이나 문자에 붙여 넣으세요"), () => { sel(); toast("내용을 선택해 두었어요. 복사를 눌러 주세요"); }); else sel(); return; }
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "me") { S.me = e.target.value; save(); toast(S.me + "(으)로 기록해요"); }
    if (e.target.id === "importfile" && e.target.files[0]) {
      const fr = new FileReader(); fr.onload = () => { try { const d = JSON.parse(fr.result); if (d.v !== 1 || !Array.isArray(d.pets)) throw 0; S = d; S.demo = false; save(); tab = "today"; toast("백업을 불러왔어요"); render(); } catch (_) { toast("댕냥차트 백업 파일이 아니에요"); } }; fr.readAsText(e.target.files[0]);
    }
  });
  document.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = e.target.id, v = (s) => ($(s) ? $(s).value.trim() : "");
    if (id === "petform") {
      const name = v("#f-name"); if (!name) { toast("이름을 넣어 주세요"); return; }
      const data = { name, species: (document.querySelector("input[name=sp]:checked") || {}).value || "dog", breed: v("#f-breed"), birth: v("#f-birth"), sex: v("#f-sex"), dx: v("#f-dx"), allergy: v("#f-allergy"), meds: v("#f-meds") };
      if (S.demo) { S = blank(); }
      const ex = editing && editing !== "new" ? S.pets.find((p) => p.id === editing) : null;
      if (ex) Object.assign(ex, data); else { const p = Object.assign({ id: uid() }, data); S.pets.push(p); S.cur = p.id; }
      editing = null; tab = "today"; save(); toast(name + (ex ? " 정보를 저장했어요" : " 등록했어요")); render(); scrollTo(0, 0); return;
    }
    if (id === "foodform") { const name = v("#foodname"); if (!name || !FOODTYPE[picker]) { toast("이름을 적어 주세요"); return; } const p = P(), key = FOODTYPE[picker]; p[key] = p[key] || []; if (!p[key].includes(name)) p[key].push(name); addLog(picker, { food: name }); return; }
    if (id === "noteform") { const text = v("#notetext"); if (!text) { toast("메모를 적어 주세요"); return; } addLog("note", { text }); return; }
    if (id === "wform") { const kg = parseFloat(v("#wkg").replace(",", ".")); if (!(kg > 0.1 && kg < 120)) { toast("체중을 kg 숫자로 넣어 주세요 (예: 3.55)"); return; } const p = P(); S.weights.push({ id: uid(), pid: p.id, t: now(), kg }); save(); toast(p.name + " " + kg + "kg 기록했어요"); render(); return; }
    if (id === "schform") { const name = v("#s-name"), last = v("#s-last"), every = parseInt(v("#s-every"), 10); if (!name || !last || !(every > 0)) { toast("이름, 날짜, 간격을 모두 넣어 주세요"); return; } S.sch.push({ id: uid(), pid: P().id, name, last: fromIso(last), every }); save(); toast(name + " 일정을 추가했어요"); render(); return; }
    if (id === "famform") { const n = v("#famname"); if (!n || S.family.includes(n)) return; S.family.push(n); save(); toast(n + " 추가했어요"); render(); return; }
  });
  render();
})();
