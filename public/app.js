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
      { k: "diarrhea", ic: "설", label: "설사", type: "sym" }, { k: "snack", ic: "간", label: "간식", type: "snack" }, { k: "resp", ic: "숨", label: "잠잘 때 호흡수", type: "resp" }, { k: "waterml", ic: "ml", label: "음수량", type: "ml" }, { k: "note", ic: "✎", label: "메모", type: "note" }
    ],
    cat: [
      { k: "breakfast", ic: "아", label: "아침밥", type: "meal" }, { k: "dinner", ic: "저", label: "저녁밥", type: "meal" },
      { k: "pee", ic: "소", label: "소변 덩어리", type: "count" }, { k: "poop", ic: "변", label: "대변", type: "count" },
      { k: "medAM", ic: "약", label: "약·보조제", type: "med" }, { k: "water", ic: "물", label: "물 많이 마심", type: "sym" },
      { k: "leftover", ic: "남", label: "밥 남김", type: "sym" }, { k: "vomit", ic: "토", label: "구토·헤어볼", type: "sym" },
      { k: "diarrhea", ic: "설", label: "설사", type: "sym" }, { k: "snack", ic: "간", label: "간식", type: "snack" }, { k: "resp", ic: "숨", label: "잠잘 때 호흡수", type: "resp" }, { k: "waterml", ic: "ml", label: "음수량", type: "ml" }, { k: "note", ic: "✎", label: "메모", type: "note" }
    ]
  };

  // 돌봄 중인 질병: 고르면 기록 칸과 '오늘 챙길 것'이 더해짐 (진단·판단은 하지 않음)
  const CARE = {
    heart: { label: "심장병", btns: [{ k: "cough", label: "기침", type: "sym" }, { k: "tired", label: "숨참·쉽게 지침", type: "sym" }, { k: "faint", label: "쓰러짐·실신", type: "sym" }], check: [["resp", "잠잘 때 호흡수"]] },
    kidney: { label: "신부전(만성 신장병)", btns: [{ k: "pee", label: "소변", type: "count" }, { k: "leftover", label: "밥 남김", type: "sym" }, { k: "fluid", label: "피하수액", type: "count" }], check: [["waterml", "음수량"]] },
    diabetes: { label: "당뇨", btns: [{ k: "insulinAM", label: "아침 인슐린", type: "dose" }, { k: "insulinPM", label: "저녁 인슐린", type: "dose" }, { k: "glucose", label: "혈당", type: "glucose" }, { k: "leftover", label: "밥 남김", type: "sym" }], check: [["insulinAM", "아침 인슐린"], ["insulinPM", "저녁 인슐린"]] },
    joint: { label: "관절·노령", btns: [{ k: "limp", label: "절뚝거림", type: "sym" }, { k: "stairs", label: "계단·점프 못함", type: "sym" }, { k: "slip", label: "미끄러짐·넘어짐", type: "sym" }, { k: "stiff", label: "일어나기 힘듦", type: "sym" }], check: [] },
    ccd: { label: "인지장애(치매)", btns: [{ k: "nightcry", label: "밤에 울음·짖음", type: "sym" }, { k: "wander", label: "빙빙 돌기·배회", type: "sym" }, { k: "stuck", label: "구석에 끼임", type: "sym" }, { k: "accident", label: "배변 실수", type: "sym" }, { k: "daynight", label: "낮밤 바뀜", type: "sym" }], check: [] },
    hospice: { label: "말기·호스피스 돌봄", btns: [{ k: "qol", label: "오늘 상태 점수", type: "qol" }, { k: "pain", label: "아파 보임", type: "sym" }], check: [["qol", "오늘 상태 점수"]] }
  };
  // 하루 상태 점수: 6가지를 0~2로 (합계 12점). 보호자 느낌을 기록하는 용도이고 의학 척도가 아님
  const QOL = [["pain", "아픈 기색 없음"], ["eat", "먹기"], ["drink", "물 마시기"], ["clean", "몸 깨끗함·배변"], ["mood", "기분·반응"], ["move", "움직임"]];
  const guessCare = (dx) => { const c = []; if (/심장|이첨판|심부전|MMVD|HCM|비대성/i.test(dx || "")) c.push("heart"); if (/신장|신부전|콩팥|CKD|신장병/i.test(dx || "")) c.push("kidney"); if (/당뇨/.test(dx || "")) c.push("diabetes"); if (/관절|슬개골|디스크|고관절/.test(dx || "")) c.push("joint"); if (/치매|인지/.test(dx || "")) c.push("ccd"); if (/호스피스|말기|종양|암\b|림프종/.test(dx || "")) c.push("hospice"); return c; };
  const careOf = (p) => (p.care || []).filter((k) => CARE[k]);
  const dxText = (p) => [p.dx, careOf(p).filter((k) => !guessCare(p.dx).includes(k)).map((k) => CARE[k].label).join(", ")].filter(Boolean).join(", ") || "없음";

  // ---------- 저장 ----------
  const blank = () => ({ v: 1, pets: [], cur: null, me: "나", family: ["나"], logs: [], weights: [], sch: [], resp: [], labs: [], demo: false });
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { S = null; }
  if (!S || S.v !== 1) S = blank();
  S.resp = S.resp || []; S.labs = S.labs || [];
  S.pets.forEach((p) => { if (!p.care) p.care = guessCare(p.dx); });
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
  const btns = (p) => { const base = BUTTONS[p.species] || BUTTONS.dog, c = (p.custom || []).map((x) => ({ k: x.k, label: x.label, type: x.type }));
    const cb = []; careOf(p).forEach((ck) => CARE[ck].btns.forEach((b) => { if (!base.some((x) => x.k === b.k) && !cb.some((x) => x.k === b.k)) cb.push(b); }));
    return base.slice(0, -1).concat(cb, c, base.slice(-1)); };
  const ago = (t) => { const m = Math.floor((now() - t) / 60000); if (m < 1) return "방금"; if (m < 60) return m + "분 전"; if (m < 1440) return Math.floor(m / 60) + "시간 전"; const d = Math.round((sod(now()) - sod(t)) / DAY); return d === 1 ? "어제 " + hm(t) : d + "일 전"; };
  const dtl = (t) => { const d = new Date(t); return iso(t) + "T" + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
  // 기록 시각: 0=지금, 숫자=몇 분 전, 문자열=직접 고른 시각(datetime-local)
  const whenOpts = [["0", "지금"], ["30", "30분 전"], ["60", "1시간 전"], ["180", "3시간 전"], ["custom", "직접"]];
  let when = 0;
  const whenT = () => { if (typeof when === "string") { const t = new Date(when).getTime(); return isNaN(t) ? now() : Math.min(t, now()); } return now() - when * 60000; };
  const valTxt = (l) => (l.food ? " · " + l.food : "") + (l.min ? " " + l.min + "분" : "") + (l.ml ? " " + l.ml + "ml" : "") + (l.u != null ? " " + l.u + "단위" : "") + (l.mg != null ? " " + l.mg + "mg/dL" : "") + (l.score != null ? " " + l.score + "/12점" : "");
  const btype = (p, k) => (btns(p).find((b) => b.k === k) || {}).type;
  const PICK = ["walk", "note", "waterml", "dose", "glucose", "qol"];
  const label = (p, k) => (btns(p).find((b) => b.k === k) || { label: k }).label;
  const hasMeds = (p) => p.meds && p.meds.trim() && p.meds.trim() !== "없음" && !/^\s*인슐린[^,]*$/.test(p.meds);
  const age = (p) => { if (!p.birth) return ""; const b = new Date(fromIso(p.birth)), n = new Date(); let y = n.getFullYear() - b.getFullYear(); if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) y--; return y < 1 ? "1살 미만" : y + "살"; };
  const info = (p) => [p.breed, age(p), p.sex].filter(Boolean).join(" · ");
  const tags = (p) => [].concat((p.dx || "").split(",").map((s) => s.trim()).filter((s) => s && s !== "없음"), p.allergy && p.allergy !== "없음" ? [p.allergy + " 알레르기"] : []);
  const CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
  const bg = (p) => (p.photo ? ` style="background-image:url(${p.photo})"` : "");
  // 증명사진 칸: 누르면 사진 고르기
  const photoBox = (p, cls) => `<button type="button" class="photo ${cls || ""}${p.photo ? " has" : ""}" data-act="photo" data-pid="${p.id}" aria-label="${esc(p.name)} 사진 ${p.photo ? "바꾸기" : "넣기"}"${bg(p)}><span class="ph">${CAM}<span>사진 넣기</span></span><span class="chg">바꾸기</span></button>`;
  const mini = (p) => `<span class="mini"${bg(p)}>${p.photo ? "" : esc((p.name || "?").slice(0, 1))}</span>`;
  const chartNo = (p) => "No." + String(S.pets.indexOf(p) + 1).padStart(4, "0");
  const wd = (t) => "일월화수목금토"[new Date(t).getDay()];
  const lastWeight = (p) => { const ws = S.weights.filter((w) => w.pid === p.id).sort((a, b) => a.t - b.t); if (!ws.length) return null; const l = ws[ws.length - 1], base = ws.filter((w) => w.t <= l.t - 50 * DAY).pop() || ws[0]; return { kg: l.kg, d: l.kg - base.kg, pct: ((l.kg - base.kg) / base.kg) * 100, since: base.t }; };
  // 약 남은 양: 마지막으로 넣은 알약 수에서 하루 먹는 개수만큼 날마다 뺌
  function medLeft(p) {
    const st = p.stock; if (!st || !(st.perDay > 0)) return null;
    const used = Math.floor((sod(now()) - sod(st.at)) / DAY) * st.perDay, left = Math.max(0, st.count - used), days = Math.floor(left / st.perDay);
    return { left, days, end: sod(now()) + days * DAY };
  }
  const respOf = (p) => S.resp.filter((r) => r.pid === p.id).sort((a, b) => a.t - b.t);
  const telHref = (s) => "tel:" + String(s || "").replace(/[^0-9+]/g, "");
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
    careOf(p).forEach((k) => CARE[k].check.forEach((x) => { if (!c.some((y) => y[0] === x[0])) c.push(x); }));
    return c;
  }
  // 오늘 했는지 (호흡수는 따로 저장)
  function doneToday(p, k) { const t0 = sod(now()); return k === "resp" ? S.resp.some((r) => r.pid === p.id && r.t >= t0) : S.logs.some((l) => l.pid === p.id && l.k === k && l.t >= t0);
  }

  // ---------- 상태 ----------
  let tab = "today", picker = null, period = 3, editing = null, doneSch = null;

  // ---------- 화면: 처음 ----------
  function petForm(p) {
    p = p || { species: "dog" };
    return `<form class="form card" id="petform">
      ${p.id ? `<div class="photoset">${photoBox(p, "sm")}<div class="r"><span class="note" style="margin:0">사진을 누르면 앨범에서 고를 수 있어요. 사진은 이 휴대폰에만 저장돼요.</span>${p.photo ? `<button class="iconbtn" data-act="photo-del" data-pid="${p.id}" type="button">사진 빼기</button>` : ""}</div></div>` : ""}
      <label>이름<input id="f-name" required maxlength="20" value="${esc(p.name)}" placeholder="예: 보리" autocomplete="off"></label>
      <div class="r" role="radiogroup" aria-label="종류"><label style="display:flex;gap:6px;align-items:center;color:var(--ink)"><input type="radio" name="sp" value="dog" ${p.species !== "cat" ? "checked" : ""}> 강아지</label>
      <label style="display:flex;gap:6px;align-items:center;color:var(--ink)"><input type="radio" name="sp" value="cat" ${p.species === "cat" ? "checked" : ""}> 고양이</label></div>
      <div class="two"><label>품종<input id="f-breed" maxlength="30" value="${esc(p.breed)}" placeholder="예: 말티즈"></label>
      <label>생일(대략도 괜찮아요)<input id="f-birth" type="date" value="${esc(p.birth)}"></label></div>
      <label>성별<select id="f-sex">${["", "수컷", "암컷", "중성화 수컷", "중성화 암컷"].map((s) => `<option ${s === (p.sex || "") ? "selected" : ""} value="${s}">${s || "선택 안 함"}</option>`).join("")}</select></label>
      <label>진단받은 질환 (쉼표로 구분)<input id="f-dx" maxlength="100" value="${esc(p.dx)}" placeholder="예: 심장병, 슬개골 2기"></label>
      <fieldset class="care"><legend>돌봄 중인 질병 · 고르면 맞는 기록 칸이 생겨요</legend>${Object.entries(CARE).map(([k, c]) => `<label><input type="checkbox" name="care" value="${k}" ${(p.care || guessCare(p.dx)).includes(k) ? "checked" : ""}> ${c.label}</label>`).join("")}</fieldset>
      <label>알레르기<input id="f-allergy" maxlength="50" value="${esc(p.allergy)}" placeholder="예: 닭고기"></label>
      <label>매일 먹는 약<input id="f-meds" maxlength="100" value="${esc(p.meds)}" placeholder="예: 심장약 하루 2회"></label>
      ${(() => { const ml = p.id ? medLeft(p) : null; return `<div class="two"><label>지금 남은 약 (알약·포 개수)<input id="f-stock" type="number" min="0" max="9999" step="0.5" inputmode="decimal" value="${ml ? +ml.left.toFixed(2) : ""}" placeholder="예: 60"></label>
      <label>하루에 먹는 개수<input id="f-perday" type="number" min="0.25" max="50" step="0.25" inputmode="decimal" value="${p.stock ? p.stock.perDay : ""}" placeholder="예: 2"></label></div>
      <div class="note" style="margin:-4px 0 0">약을 새로 받으면 남은 개수를 다시 넣어 주세요. 며칠분 남았는지 오늘 탭에 보여 줘요.</div>`; })()}
      <label>다니는 병원<input id="f-clinic" maxlength="40" value="${esc(p.clinic)}" placeholder="예: 우리동네동물병원"></label>
      <div class="two"><label>병원 전화<input id="f-cphone" type="tel" maxlength="20" value="${esc(p.cphone)}" placeholder="예: 02-123-4567"></label>
      <label>진료 시간 메모<input id="f-chours" maxlength="40" value="${esc(p.chours)}" placeholder="예: 평일 9~20시, 일 휴무"></label></div>
      <div class="r"><button class="btn" type="submit">${p.id ? "저장" : "등록"}</button>${editing || S.pets.length ? '<button class="btn ghost" type="button" data-act="cancel-pet">취소</button>' : ""}</div>
    </form>`;
  }
  function vWelcome() {
    return `<div class="welcome"><h1>나이 들고 아픈 아이, 오래 곁에 있도록</h1>
    <p>약, 밥, 물, 잠잘 때 호흡수를 한 번 눌러 기록하고, 동물병원에서는 최근 변화를 한 장으로 보여 주세요. 심장병·신부전처럼 돌봄 중인 질병을 고르면 그에 맞는 기록 칸이 생겨요. 강아지와 고양이를 함께 등록할 수 있어요.</p>
    ${petForm()}
    <p class="note" style="margin-top:14px">먼저 둘러보고 싶으시면 <button class="iconbtn" data-act="demo" type="button">예시로 둘러보기</button></p>
    <p class="note">기록은 이 휴대폰에만 저장돼요. 가족과 함께 쓰는 기능은 곧 추가돼요.</p></div>`;
  }

  // ---------- 화면: 오늘 ----------
  function pending(p) { return checks(p).filter(([k]) => !doneToday(p, k)).map((c) => c[1]); }
  function vToday() {
    const p = P(), N = now(), t0 = sod(N), today = logsOf(p).filter((l) => l.t >= t0).sort((a, b) => b.t - a.t);
    const recent = logsOf(p).filter((l) => l.t >= t0 - DAY).sort((a, b) => b.t - a.t);
    const lastOf = (k) => today.find((l) => l.k === k), lastAny = (k) => logsOf(p).filter((l) => l.k === k && l.t <= N).sort((a, b) => b.t - a.t)[0];
    const ck = checks(p), doneN = ck.filter(([k]) => doneToday(p, k)).length;
    const sub = (b, l) => {
      if (b.type === "ml") { const ml = today.filter((x) => x.k === b.k).reduce((a, x) => a + (x.ml || 0), 0); return ml ? "오늘 " + ml + "ml" : "ml로 기록"; }
      if (!l) { const old = b.type !== "note" && lastAny(b.k); return old && old.t >= N - 7 * DAY ? "마지막 " + ago(old.t) : b.type === "sym" ? "있으면 누르기" : "누르면 기록"; }
      const n = today.filter((x) => x.k === b.k).length;
      const vt = valTxt(l); return ago(l.t) + (vt ? " ·" + vt.replace(/^ · /, " ") : n > 1 ? " · " + n + "회" : "");
    };
    const rToday = respOf(p).filter((r) => r.t >= t0).pop();
    const btn = (b) => { if (b.type === "resp") return `<button class="qb${rToday ? " done" : ""}" data-act="resp" type="button"><b>${b.label}</b><em>${rToday ? ago(rToday.t) + " · " + rToday.bpm + "회/분" : "30초 세기"}</em></button>`; const l = lastOf(b.k); return `<button class="qb${b.type === "sym" ? " sym" : ""}${l && b.type !== "note" ? " done" : ""}" data-log="${b.k}" type="button"><b>${esc(b.label)}</b><em>${esc(sub(b, l))}</em></button>`; };
    const allMeal = (k, t) => `<button class="iconbtn" data-allmeal="${k}" type="button">모두 ${t} 줬어요</button>`;
    const house = S.pets.length > 1 ? `<section><h2><span><span class="en">HOME</span>우리 집 오늘</span><span class="pill">${S.pets.length}마리</span></h2><div class="home">${S.pets.map((q) => { const pd = pending(q), lm = logsOf(q).filter((l) => (l.k === "breakfast" || l.k === "dinner") && l.t <= N).sort((a, b) => b.t - a.t)[0]; return `<div class="h">${mini(q)}<div><b>${esc(q.name)}</b><span class="${pd.length ? "todo" : "done"}">${pd.length ? pd.join(", ") + " 아직" : "오늘 챙길 것 다 했어요"}</span>${lm ? `<small class="ago">마지막 밥 ${ago(lm.t)}</small>` : ""}</div></div>`; }).join("")}
      <div class="allrow">${allMeal("breakfast", "아침밥")}${allMeal("dinner", "저녁밥")}</div></div></section>` : "";
    let pk = "";
    if (picker === "walk") pk = `<div class="picker" role="group" aria-label="산책 시간"><span>몇 분 걸었나요?</span>${[10, 20, 30, 45, 60].map((m) => `<button data-walk="${m}" type="button">${m}분</button>`).join("")}</div>`;
    if (picker === "waterml") pk = `<div class="picker" role="group" aria-label="음수량"><span>물을 얼마나 마셨나요? (그릇에 부은 양 − 남은 양)</span>${[30, 50, 100, 150, 200].map((m) => `<button data-ml="${m}" type="button">${m}ml</button>`).join("")}
      <form id="mlform" class="addw" style="width:100%;margin-top:4px"><input id="mlval" inputmode="numeric" placeholder="직접 입력 (ml)" autocomplete="off"><button class="btn" type="submit">기록</button></form></div>`;
    if (FOODTYPE[picker]) {
      const items = itemsFor(p, picker), what = picker === "snack" ? "간식" : "사료";
      pk = `<div class="picker" role="group" aria-label="${what} 고르기"><span>${label(p, picker)}: 어떤 ${picker === "snack" ? "간식을" : "사료를"} 줬나요?</span>
        ${items.map((f) => `<button data-food="${esc(f)}" type="button">${esc(f)}</button>`).join("")}
        ${picker !== "snack" ? '<button data-food="" type="button" style="border-style:dashed">고르지 않고 기록</button>' : ""}
        <form id="foodform" class="addw" style="width:100%;margin-top:4px"><input id="foodname" maxlength="30" placeholder="${items.length ? "다른 " + what + " 직접 입력" : what + " 이름 (예: " + (picker === "snack" ? "져키" : "로얄캐닌 처방식") + ")"}" autocomplete="off"><button class="btn" type="submit">기록</button></form></div>`;
    }
    const pt = picker && btype(p, picker);
    if (pt === "dose") { const lastU = (logsOf(p).filter((l) => (l.k === "insulinAM" || l.k === "insulinPM") && l.u != null).sort((a, b) => b.t - a.t)[0] || {}).u;
      pk = `<div class="picker" role="group" aria-label="인슐린 용량"><span>${esc(label(p, picker))}: 몇 단위 놓았나요? (수의사 처방대로)</span>${lastU != null ? `<button data-dose="${lastU}" type="button">지난번과 같이 ${lastU}단위</button>` : ""}
      <form id="doseform" class="addw" style="width:100%;margin-top:4px"><input id="doseval" inputmode="decimal" placeholder="단위 (예: 2)" autocomplete="off"><button class="btn" type="submit">기록</button></form></div>`; }
    if (pt === "glucose") pk = `<div class="picker" role="group" aria-label="혈당"><span>혈당 측정값 (mg/dL, 측정기 화면 그대로)</span><form id="glucform" class="addw" style="width:100%;margin-top:4px"><input id="glucval" inputmode="numeric" placeholder="예: 180" autocomplete="off"><button class="btn" type="submit">기록</button></form></div>`;
    if (pt === "qol") pk = `<form class="picker form qolf" id="qolform" style="display:grid"><span>오늘 하루를 떠올리며 골라 주세요. 점수는 보호자의 느낌을 남기는 용도예요.</span>
      ${QOL.map(([k, n]) => `<div class="qrow" role="radiogroup" aria-label="${n}"><b>${n}</b>${["나쁨", "보통", "좋음"].map((t, i) => `<label><input type="radio" name="q-${k}" value="${i}"> ${t}</label>`).join("")}</div>`).join("")}
      <div class="r"><button class="btn" type="submit">저장</button><button class="btn ghost" type="button" data-act="close-picker">취소</button></div></form>`;
    if (picker === "note") pk = `<form class="picker form" id="noteform" style="display:grid"><label style="color:var(--ink)">병원에 전할 메모<textarea id="notetext" rows="2" maxlength="200" placeholder="예: 밤에 기침하고 숨이 조금 가빠 보임"></textarea></label><div class="r"><button class="btn" type="submit">저장</button><button class="btn ghost" type="button" data-act="close-picker">취소</button></div></form>`;
    const wh = whenOpts.map(([v, t]) => `<button type="button" data-when="${v}" aria-pressed="${String(when) === v || (v === "custom" && typeof when === "string")}">${t}</button>`).join("");
    const row = (l) => `<div class="row${(btns(p).find((b) => b.k === l.k) || {}).type === "sym" ? " sym" : ""}"><span class="time">${hm(l.t)}</span><span class="what">${esc(label(p, l.k))}${esc(valTxt(l))}${l.text ? " · " + esc(l.text) : ""}</span><span class="who">${esc(l.by)}</span><button class="del" data-dellog="${l.id}" aria-label="이 기록 지우기" type="button">×</button></div>`;
    const yday = recent.filter((l) => l.t < t0);
    return `${house}
    <section><h2><span><span class="en">TODAY</span>오늘 기록</span><span class="pill">챙길 것 ${doneN} / ${ck.length}</span></h2>
    <div class="prog" style="grid-template-columns:repeat(${ck.length},1fr)" aria-hidden="true">${ck.map(([k]) => `<i class="${doneToday(p, k) ? "f" : ""}"></i>`).join("")}</div>
    <div class="when${when ? " on" : ""}" role="group" aria-label="기록 시각"><span>기록 시각</span>${wh}</div>
    ${typeof when === "string" ? `<div class="whenpick"><label for="whenat">언제 했나요?</label><input id="whenat" type="datetime-local" value="${when}" max="${dtl(N)}" min="${dtl(N - 7 * DAY)}"></div>` : ""}
    <div class="grid">${btns(p).map(btn).join("")}<button class="qb addc" data-act="custom-add" type="button"><b>+ 칸 추가</b><em>목욕·양치·인슐린 등</em></button></div>${pk}</section>
    <section><h2><span><span class="en">LOG</span>오늘 기록한 것</span><span class="pill">${today.length}건</span></h2>
    <div class="list">${today.length ? today.map(row).join("") : '<div class="empty">아직 기록이 없어요. 위 칸을 눌러 보세요.</div>'}</div>
    ${yday.length ? `<details class="yday"><summary>어제 기록 ${yday.length}건 보기</summary><div class="list">${yday.map(row).join("")}</div></details>` : ""}</section>`;
  }

  // ---------- 화면: 체중 ----------
  function weightChart(ws, unit) {
    const W = 340, H = 176, pd = { l: 36, r: 14, t: 18, b: 26 };
    const xs = ws.map((w) => w.t), ys = ws.map((w) => w.kg);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.floor((Math.min(...ys) - 0.1) * 10) / 10, y1 = Math.ceil((Math.max(...ys) + 0.1) * 10) / 10;
    const X = (t) => pd.l + ((t - x0) / (x1 - x0 || 1)) * (W - pd.l - pd.r), Y = (v) => pd.t + ((y1 - v) / (y1 - y0 || 1)) * (H - pd.t - pd.b);
    const span = y1 - y0, step = unit ? (span > 40 ? 10 : 5) : span > 4 ? 1 : span > 2 ? 0.5 : span > 0.8 ? 0.2 : 0.1;
    const ticks = []; for (let v = Math.ceil(y0 / step) * step; v <= y1 + 1e-9; v += step) ticks.push(+v.toFixed(1));
    const pts = ws.map((w) => X(w.t).toFixed(1) + "," + Y(w.kg).toFixed(1)).join(" ");
    const last = ws[ws.length - 1], first = ws[0];
    // 최근 4주 사이 줄었으면 그 구간을 붉게
    const rec = ws.filter((w) => w.t >= last.t - 28 * DAY), drop = rec.length > 1 && (rec[rec.length - 1].kg - rec[0].kg) / rec[0].kg <= -0.02;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="체중 변화 그래프">
      ${ticks.map((v) => `<line x1="${pd.l}" x2="${W - pd.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#D9E2EC"/><text x="${pd.l - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="10" fill="#5B7598" font-family="IBM Plex Mono,monospace">${unit ? Math.round(v) : v.toFixed(1)}</text>`).join("")}
      ${drop && !unit ? `<rect x="${X(rec[0].t)}" y="${pd.t}" width="${Math.max(4, X(last.t) - X(rec[0].t))}" height="${H - pd.t - pd.b}" fill="#C8372D" fill-opacity=".08"/><text x="${X(last.t)}" y="${pd.t - 5}" text-anchor="end" font-size="10" fill="#C8372D">최근 4주 줄어듦</text>` : ""}
      <polyline points="${pts}" fill="none" stroke="#173B6C" stroke-width="2" stroke-linejoin="round"/>
      ${ws.map((w, i) => { const e = i === ws.length - 1, c = e ? "#C8372D" : "#173B6C"; return `<rect x="${X(w.t) - 3}" y="${Y(w.kg) - 3}" width="6" height="6" fill="${e ? c : "#fff"}" stroke="${c}" stroke-width="1.5"/>`; }).join("")}
      <text x="${X(first.t)}" y="${H - 8}" font-size="10" fill="#5B7598" font-family="IBM Plex Mono,monospace">${md(first.t)}</text><text x="${X(last.t)}" y="${H - 8}" text-anchor="end" font-size="10" fill="#5B7598" font-family="IBM Plex Mono,monospace">${md(last.t)}</text></svg>`;
  }
  function vWeight() {
    const p = P(), all = S.weights.filter((w) => w.pid === p.id).sort((a, b) => a.t - b.t), ws = all.filter((w) => w.t >= now() - 183 * DAY);
    const form = `<form class="addw" id="wform"><label for="wkg" style="position:absolute;left:-9999px">오늘 체중</label><input id="wkg" inputmode="decimal" placeholder="오늘 체중 kg (예: 3.55)" autocomplete="off"><button class="btn" type="submit">기록</button></form>`;
    const more = vResp(p) + vSeries(p, "glucose", "mg", "GLUCOSE", "혈당", "mg/dL") + vSeries(p, "qol", "score", "QOL", "오늘 상태 점수", "점") + (careOf(p).includes("kidney") || labsOf(p).length ? vLabs(p) : "");
    if (!all.length) return `<section><h2><span><span class="en">WEIGHT</span>${esc(p.name)} 체중</span></h2><div class="card"><div class="empty">아직 체중 기록이 없어요. 첫 체중을 넣어 주세요.</div>${form}</div></section>${more}`;
    const last = all[all.length - 1], first = ws[0] || last, pct = ((last.kg - first.kg) / first.kg) * 100;
    const rows = all.slice().reverse().slice(0, 12).map((w, i, a) => { const pr = a[i + 1], d = pr ? w.kg - pr.kg : null; return `<tr><td class="n">${ymd(w.t).slice(2)}</td><td class="n">${w.kg.toFixed(2)} kg</td><td class="n ${d == null ? "" : d < 0 ? "dn" : d > 0 ? "up" : ""}">${d == null ? "" : (d > 0 ? "+" : "") + d.toFixed(2)}</td><td>${esc(w.by || "")}</td><td><button class="del" data-delw="${w.id}" aria-label="이 체중 기록 지우기" type="button">×</button></td></tr>`; }).join("");
    return `<section><h2><span><span class="en">WEIGHT</span>${esc(p.name)} 체중</span><span class="pill">최근 6개월</span></h2><div class="card">
      <div class="bignum"><span class="big">${last.kg.toFixed(2)}<small>kg · ${md(last.t)} 측정</small></span>
      ${ws.length > 1 ? `<span class="delta${pct <= -5 ? " dn" : ""}">${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% (${md(first.t)} 대비)</span>` : ""}</div>
      ${ws.length > 1 ? `<div class="chart">${weightChart(ws)}</div>` : ""}${form}</div>
      <div class="note">6개월 사이 5% 넘게 줄면 빨간색으로 표시하고 병원용 요약에도 적어요. 원인 판단은 수의사 몫이고, 앱은 숫자만 보여 줘요.</div></section>
      <section><h2><span><span class="en">RECORD</span>체중 기록</span></h2><div class="list"><table class="tbl"><thead><tr><th>날짜</th><th>체중</th><th>변화</th><th>기록</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>${more}`;
  }
  function vResp(p) {
    const rs = respOf(p), last = rs[rs.length - 1], rec = rs.filter((r) => r.t >= now() - 90 * DAY);
    const form = `<form class="addw" id="rform"><label for="rbpm" style="position:absolute;left:-9999px">1분 호흡수 직접 입력</label><input id="rbpm" inputmode="numeric" placeholder="직접 입력 (1분에 몇 번)" autocomplete="off"><button class="btn ghost" type="submit">저장</button></form>`;
    const rows = rs.slice().reverse().slice(0, 10).map((r) => `<tr><td class="n">${ymd(r.t).slice(2)} ${hm(r.t)}</td><td class="n">${r.bpm}회/분</td><td>${esc(r.by || "")}</td><td><button class="del" data-delr="${r.id}" aria-label="이 호흡수 기록 지우기" type="button">×</button></td></tr>`).join("");
    return `<section><h2><span><span class="en">RESP</span>${esc(p.name)} 잠잘 때 호흡수</span><span class="pill">1분당</span></h2><div class="card">
      ${last ? `<div class="bignum"><span class="big">${last.bpm}<small>회/분 · ${md(last.t)} ${hm(last.t)}</small></span>${rec.length > 1 ? `<span class="delta">최근 3개월 평균 ${Math.round(rec.reduce((a, r) => a + r.bpm, 0) / rec.length)}회</span>` : ""}</div>
      ${rec.length > 1 ? `<div class="chart">${weightChart(rec.map((r) => ({ t: r.t, kg: r.bpm })), "회")}</div>` : ""}` : '<div class="empty" style="padding:6px 0 10px">아직 기록이 없어요. 아이가 편하게 잠들었을 때 세어 보세요.</div>'}
      <button class="btn" data-act="resp" type="button" style="width:100%;margin-top:6px">30초 동안 세기</button>${form}</div>
      <div class="note">푹 잠든 상태에서 가슴이 한 번 오르내리면 1번이에요. 앱은 숫자만 모아 보여 주고, 수치가 어떤 뜻인지는 수의사 선생님께 확인하세요.</div></section>
      ${rows ? `<section><h2><span><span class="en">RECORD</span>호흡수 기록</span></h2><div class="list"><table class="tbl"><thead><tr><th>날짜</th><th>1분 호흡수</th><th>기록</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>` : ""}`;
  }

  // 혈당·상태 점수처럼 날마다 쌓이는 숫자 그래프 (기록이 있을 때만)
  function vSeries(p, k, f, en, name, unit) {
    const ls = logsOf(p).filter((l) => l.k === k && l[f] != null && l.t >= now() - 90 * DAY).sort((a, b) => a.t - b.t); if (!ls.length) return "";
    const last = ls[ls.length - 1];
    return `<section><h2><span><span class="en">${en}</span>${esc(p.name)} ${name}</span><span class="pill">최근 3개월</span></h2><div class="card">
      <div class="bignum"><span class="big">${last[f]}<small>${unit} · ${md(last.t)} ${hm(last.t)}</small></span>${ls.length > 1 ? `<span class="delta">평균 ${(ls.reduce((a, l) => a + l[f], 0) / ls.length).toFixed(k === "qol" ? 1 : 0)}${unit}</span>` : ""}</div>
      ${ls.length > 1 ? `<div class="chart">${weightChart(ls.map((l) => ({ t: l.t, kg: l[f] })), unit)}</div>` : ""}</div>
      <div class="note">${k === "qol" ? "12점 만점, 보호자가 느낀 하루 상태예요. 의학 척도가 아니에요." : "측정기 숫자를 모은 그래프예요. 목표 범위와 용량 조절은 수의사 선생님께 확인하세요."}</div></section>`;
  }
  // 혈액검사 수치 (신부전 돌봄). 기준치·판단은 넣지 않고 검사지 숫자만 모음
  const LABK = [["bun", "BUN"], ["cre", "크레아티닌"], ["sdma", "SDMA"], ["phos", "인(P)"]];
  const labsOf = (p) => S.labs.filter((x) => x.pid === p.id).sort((a, b) => a.t - b.t);
  const labTxt = (x) => LABK.filter(([k]) => x[k] != null).map(([k, n]) => n + " " + x[k]).join(" · ");
  function vLabs(p) {
    const ls = labsOf(p);
    const rows = ls.slice().reverse().slice(0, 10).map((x) => `<tr><td class="n">${ymd(x.t).slice(2)}</td>${LABK.map(([k]) => `<td class="n">${x[k] == null ? "" : x[k]}</td>`).join("")}<td><button class="del" data-dellab="${x.id}" aria-label="이 검사 기록 지우기" type="button">×</button></td></tr>`).join("");
    return `<section><h2><span><span class="en">LAB</span>${esc(p.name)} 혈액검사 수치</span></h2><form class="form card" id="labform">
      <label>검사한 날<input id="l-date" type="date" required value="${iso(now())}" max="${iso(now())}"></label>
      <div class="two">${LABK.map(([k, n]) => `<label>${n}<input id="l-${k}" inputmode="decimal" maxlength="8" autocomplete="off" placeholder="검사지 숫자"></label>`).join("")}</div>
      <div class="r"><button class="btn" type="submit">저장</button></div>
      <div class="note" style="margin:0">병원에서 받은 검사지 숫자를 단위 그대로 옮겨 적어 주세요. 있는 칸만 채우면 돼요. 정상 범위와 뜻은 수의사 선생님께 확인하세요.</div></form></section>
      ${rows ? `<section><h2><span><span class="en">RECORD</span>검사 기록</span></h2><div class="list"><table class="tbl"><thead><tr><th>날짜</th>${LABK.map(([, n]) => `<th>${n}</th>`).join("")}<th></th></tr></thead><tbody>${rows}</tbody></table></div></section>` : ""}`;
  }

  // ---------- 화면: 일정 ----------
  function nextSchedules(p) { return S.sch.filter((s) => s.pid === p.id).map((s) => { const due = s.last + s.every * DAY; return Object.assign({ due, left: Math.round((sod(due) - sod(now())) / DAY) }, s); }).sort((a, b) => a.due - b.due); }
  const ddText = (s) => (s.left === 0 ? "D-day" : s.left > 0 ? "D-" + s.left : "D+" + -s.left);
  function schRow(s, withDel) {
    const cls = s.left < 0 ? "over" : s.left <= 7 ? "soon" : "";
    return `<div class="sch"><span class="what">${esc(s.name)}<small>${s.every}일마다 · 마지막 ${ymd(s.last).slice(2)} · 다음 ${ymd(s.due).slice(2)}</small></span><span class="dday ${cls}">${ddText(s)}</span><button class="dbtn" data-done="${s.id}" type="button">했어요</button>${withDel ? `<button class="del" data-delsch="${s.id}" aria-label="${esc(s.name)} 일정 지우기" type="button">×</button>` : ""}
      ${doneSch === s.id ? `<form class="donef" data-sid="${s.id}"><label>한 날<input type="date" id="donedate" value="${iso(now())}" max="${iso(now())}"></label><button class="btn" type="submit">저장</button><button class="btn ghost" type="button" data-act="done-cancel">취소</button></form>` : ""}
      ${withDel ? `<div class="schx"><button class="linkbtn" data-ics="${s.id}" type="button">휴대폰 달력에 넣기</button></div>` : ""}</div>`;
  }
  function vSchedule() {
    const p = P(), list = nextSchedules(p);
    const presets = (p.species === "cat" ? [["외부 구충제", 30], ["종합백신", 365], ["정기검진", 180]] : [["심장사상충 예방약", 30], ["외부 구충제", 30], ["종합백신", 365], ["광견병 접종", 365], ["정기검진", 180]]).concat([["목욕", 14], ["발톱 깎기", 14], ["미용", 60], ["귀 청소", 7], ["스케일링", 365]]);
    const all = S.pets.length > 1 ? `<section><h2><span><span class="en">HOME</span>우리 집 전체 일정</span></h2><div class="list">${S.pets.flatMap((q) => nextSchedules(q).map((s) => Object.assign({ who: q.name }, s))).sort((a, b) => a.due - b.due).slice(0, 5).map((s) => `<div class="row"><span class="time">${md(s.due)}</span><span class="what">${esc(s.who)} · ${esc(s.name)}</span><span class="who mono">${ddText(s)}</span></div>`).join("") || '<div class="empty">일정이 없어요</div>'}</div></section>` : "";
    return `<section><h2><span><span class="en">SCHEDULE</span>${esc(p.name)} 예방·검진</span></h2><div class="list">${list.length ? list.map((s) => schRow(s, true)).join("") : '<div class="empty">아직 일정이 없어요. 아래에서 추가해 주세요.</div>'}</div>
    ${list.length > 1 ? '<button class="btn ghost" data-act="ics-all" type="button" style="width:100%;margin-top:6px">이 아이 일정 모두 달력에 넣기</button>' : ""}
    <div class="note">'했어요'를 누르면 실제로 한 날짜를 고를 수 있고, 다음 날짜가 다시 계산돼요. 달력에 넣은 일정은 전날 오전 9시에 알려 줘요(달력 앱 설정에 따라 달라요).</div></section>
    <section><h2><span><span class="en">ADD</span>일정 추가</span></h2><form class="form card" id="schform">
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
    const wml = PL.filter((l) => l.k === "waterml" && l.ml), dayMl = (from0, to0) => { const m = {}; wml.forEach((l) => { if (l.t >= from0 && l.t < to0) m[sod(l.t)] = (m[sod(l.t)] || 0) + l.ml; }); const v = Object.values(m); return v.length ? { avg: v.reduce((a, b) => a + b, 0) / v.length, n: v.length } : null; };
    const wR = dayMl(N - 14 * DAY, N + 1), wB = dayMl(N - 74 * DAY, N - 14 * DAY);
    if (wR) rows.push(["음수량", `최근 2주 하루 평균 ${Math.round(wR.avg)}ml (${wR.n}일 기록)` + (wB ? `, 그 전 ${Math.round(wB.avg)}ml` : ""), !!wB && wR.avg >= wB.avg * 1.3]);
    const rs = S.resp.filter((r) => r.pid === p.id), rRec = rs.filter((r) => r.t >= N - 14 * DAY), rBef = rs.filter((r) => r.t < N - 14 * DAY && r.t >= N - 74 * DAY), avg = (a) => a.reduce((x, r) => x + r.bpm, 0) / a.length;
    if (rRec.length) { const a = avg(rRec), b = rBef.length ? avg(rBef) : 0; rows.push(["잠잘 때 호흡수", `최근 2주 평균 ${Math.round(a)}회/분 (${rRec.length}번 잼, 최고 ${Math.max(...rRec.map((r) => r.bpm))})` + (b ? `, 그 전 평균 ${Math.round(b)}회` : ""), b > 0 && a >= b * 1.2 && a - b >= 4]); }
    const r2 = (k, f) => { const a = PL.filter((l) => l.k === k && l[f] != null && l.t >= N - 14 * DAY), b = PL.filter((l) => l.k === k && l[f] != null && l.t < N - 14 * DAY && l.t >= N - 74 * DAY), m = (x) => x.reduce((s0, l) => s0 + l[f], 0) / x.length; return { a, b, ma: a.length ? m(a) : 0, mb: b.length ? m(b) : 0 }; };
    const ins = PL.filter((l) => (l.k === "insulinAM" || l.k === "insulinPM") && l.t >= from);
    if (ins.length) { const firstLog = Math.max(from, Math.min(...PL.map((l) => l.t))), d = Math.max(1, Math.round((N - firstLog) / DAY)), us = ins.filter((l) => l.u != null).map((l) => l.u); rows.push(["인슐린", `${Math.min(100, Math.round((ins.length / (d * 2)) * 100))}% 기록 (빠진 횟수 약 ${Math.max(0, d * 2 - ins.length)}회)` + (us.length ? `, 용량 ${Math.min(...us)}~${Math.max(...us)}단위` : ""), false]); }
    const g = r2("glucose", "mg");
    if (g.a.length) rows.push(["혈당", `최근 2주 평균 ${Math.round(g.ma)}mg/dL (${g.a.length}번, ${Math.min(...g.a.map((l) => l.mg))}~${Math.max(...g.a.map((l) => l.mg))})` + (g.b.length ? `, 그 전 평균 ${Math.round(g.mb)}` : ""), g.b.length > 0 && Math.abs(g.ma - g.mb) >= g.mb * 0.2]);
    const qs = r2("qol", "score");
    if (qs.a.length) { const good = qs.a.filter((l) => l.score >= 8).length, hard = qs.a.filter((l) => l.score <= 4).length; rows.push(["오늘 상태 점수", `최근 2주 평균 ${qs.ma.toFixed(1)}/12점 (좋은 날 ${good}일, 힘든 날 ${hard}일)` + (qs.b.length ? `, 그 전 ${qs.mb.toFixed(1)}점` : ""), qs.b.length > 0 && qs.mb - qs.ma >= 2]); }
    const lb = labsOf(p), lL = lb[lb.length - 1], lP = lb[lb.length - 2];
    if (lL) { const up = lP && LABK.some(([k]) => lL[k] != null && lP[k] != null && lP[k] > 0 && lL[k] >= lP[k] * 1.2); rows.push(["혈액검사", `${ymd(lL.t).slice(2)} ${labTxt(lL)}` + (lP ? ` (이전 ${ymd(lP.t).slice(2)} ${labTxt(lP)})` : ""), !!up]); }
    const notes = L.filter((l) => l.k === "note").sort((a, b) => b.t - a.t), sch = nextSchedules(p);
    return { p, from, N, rows, notes, sch, ws,
      basics: [["종류 · 정보", (p.species === "cat" ? "고양이" : "강아지") + (info(p) ? " · " + info(p) : "")], ["진단받은 질환", dxText(p)], ["알레르기", p.allergy || "없음"], ["매일 먹는 약", p.meds || "없음"]].concat(p.clinic || p.cphone ? [["다니는 병원", [p.clinic, p.cphone].filter(Boolean).join(" ")]] : []) };
  }
  function vSummary() {
    const D = summaryData(P()), { p, from, N, rows, notes, sch } = D;
    const by = [...new Set(logsOf(p).filter((l) => l.t >= from).map((l) => l.by))].slice(0, 4);
    return `<section><h2><span><span class="en">SUMMARY</span>병원용 한 장 요약</span></h2>
    <div class="seg" role="group" aria-label="기간">${[1, 3, 6].map((m) => `<button data-period="${m}" aria-pressed="${m === period}" type="button">최근 ${m}개월</button>`).join("")}</div>
    <article class="sheet" id="sheet"><div class="hd"><b>${esc(p.name)} 진료 참고 기록</b><span>${ymd(from)} ~ ${ymd(N)}</span></div>
      <div class="dochead">${photoBox(p, "sm")}<dl class="kv">${D.basics.map(([a, b]) => `<dt>${esc(a.replace("종류 · 정보", "정보").replace("진단받은 질환", "진단").replace("매일 먹는 약", "복용약").replace("다니는 병원", "병원"))}</dt><dd>${esc(b)}</dd>`).join("")}</dl></div>
      <h3>기간 중 변화</h3>${rows.map(([a, b, f]) => `<div class="flag${f ? " hi" : ""}"><span>${esc(a)}</span><span>${esc(b)}</span></div>`).join("")}
      <h3>보호자 메모</h3>${notes.length ? `<ul>${notes.map((n) => `<li>${md(n.t)} ${esc(n.text)} (${esc(n.by)})</li>`).join("")}</ul>` : '<div class="note" style="margin:0">메모 없음</div>'}
      <h3>예방·접종</h3>${sch.length ? sch.map((s) => `<div class="flag"><span>${esc(s.name)}</span><span class="mono">${ymd(s.last)} (다음 ${ymd(s.due).slice(5)})</span></div>`).join("") : '<div class="note" style="margin:0">등록된 일정 없음</div>'}
      <div class="sign"><span>기록: ${esc(by.join("·") || S.me)}</span><span>오래곁에 ${chartNo(p)}</span></div>
      <div class="note">보호자가 앱에 기록한 내용을 정리한 것으로, 진단이 아닙니다.</div></article>
    <div class="lock"><button class="btn" data-act="image" type="button">이미지로 저장·공유</button><button class="btn ghost" data-act="copy" type="button">글자로 복사</button></div>
    <div class="note">빨간 글씨는 숫자가 크게 바뀐 항목이에요. 진료실에서 이 화면을 보여 주거나, 이미지로 저장해 카톡으로 보내세요.</div></section>`;
  }

  // ---------- 요약 이미지 (캔버스로 직접 그림, 외부 라이브러리 없음) ----------
  async function summaryImage() {
    const D = summaryData(P()), { p, from, N, rows, notes, sch, ws } = D;
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (_) {}
    const W = 1080, PAD = 64, LW = 300, F = '"IBM Plex Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
    const C = { bg: "#FFFFFF", ink: "#173B6C", muted: "#5B7598", rule: "#D9E2EC", accent: "#173B6C", crit: "#C8372D", soft: "#E3EBF4" };
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
    font(52, 700); x.fillStyle = C.ink; x.fillText(p.name + " 진료 참고 기록", PAD, y, W - PAD * 2 - (p.photo ? 180 : 0));
    y += 44; font(28); x.fillStyle = C.muted; x.fillText(ymd(from) + " ~ " + ymd(N) + " · 보호자 기록", PAD, y, W - PAD * 2 - (p.photo ? 180 : 0));
    if (p.photo) { // 증명사진 (오른쪽 위)
      const img = new Image(); img.src = p.photo; try { await img.decode(); } catch (_) {}
      if (img.naturalWidth) { const pw = 150, ph = 188, px = W - PAD - pw, py = PAD - 8, r = Math.max(pw / img.naturalWidth, ph / img.naturalHeight), sw = pw / r, sh = ph / r;
        x.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, px, py, pw, ph);
        x.strokeStyle = C.ink; x.lineWidth = 3; x.strokeRect(px, py, pw, ph); y = Math.max(y, py + ph - 4); }
    }
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
    y += 56; x.fillStyle = C.soft; x.fillRect(0, y, W, 72); font(26, 600); x.fillStyle = C.accent; x.fillText("오래곁에", PAD, y + 46); font(24); x.fillStyle = C.muted; x.textAlign = "right"; x.fillText(location.host, W - PAD, y + 46); x.textAlign = "left";
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
    return `<section><h2><span><span class="en">PETS</span>우리 아이들</span></h2><div class="list">${S.pets.map((p) => `<div class="row">${mini(p)}<span class="what">${esc(p.name)} <small style="color:var(--ink2)">${esc(info(p))}</small></span><button class="iconbtn" data-editpet="${p.id}" type="button">수정</button></div>`).join("")}</div>
      <div class="r" style="display:flex;gap:8px;margin-top:10px"><button class="btn" data-act="add-pet" type="button">+ 아이 추가</button></div></section>
    <section><h2><span><span class="en">FAMILY</span>기록하는 사람</span></h2><div class="card form"><label>지금 이 휴대폰을 쓰는 사람<select id="me">${S.family.map((f) => `<option ${f === S.me ? "selected" : ""}>${esc(f)}</option>`).join("")}</select></label>
      <form class="addw" id="famform" style="margin:0"><input id="famname" maxlength="10" placeholder="가족 이름 추가 (예: 엄마)" autocomplete="off"><button class="btn" type="submit">추가</button></form>
      <div class="note" style="margin:0">가족이 각자 휴대폰으로 함께 기록하는 기능은 다음 업데이트에서 나와요. 지금은 한 휴대폰에서 누가 눌렀는지만 구분해요.</div></div></section>
    ${(() => { const p = P(), chip = (key, f) => `<span class="who" style="display:inline-flex;gap:4px;align-items:center;color:var(--ink);border:1.5px solid var(--ink);padding:2px 4px 2px 8px">${esc(f)}<button class="del" data-delfood="${key}|${esc(f)}" aria-label="${esc(f)} 빼기" type="button">×</button></span>`;
      const cl = (p.custom || []).map((x) => `<span class="who" style="display:inline-flex;gap:4px;align-items:center;color:${x.type === "sym" ? "var(--red)" : "var(--ink)"};border:1.5px solid currentColor;padding:2px 4px 2px 8px">${esc(x.label)}<button class="del" data-delcustom="${x.k}" aria-label="${esc(x.label)} 칸 빼기" type="button">×</button></span>`).join("");
      return `<section><h2><span><span class="en">CUSTOM</span>${esc(p.name)} 나만의 기록 칸</span></h2><div class="card"><div style="display:flex;gap:6px;flex-wrap:wrap">${cl || '<span class="note" style="margin:0">아직 없어요. 목욕, 양치, 인슐린, 귀 청소처럼 자주 하는 걸 추가해 보세요.</span>'}</div>
        <form class="form" id="customform" style="margin-top:10px"><div class="two"><label>칸 이름<input id="cname" maxlength="12" placeholder="예: 양치" autocomplete="off"></label><label>종류<select id="ctype"><option value="count">한 일 (횟수로 셈)</option><option value="sym">증상 (빨간 칸, 변화 비교)</option></select></label></div><div class="r"><button class="btn" type="submit">칸 추가</button></div></form>
        <div class="note" style="margin:6px 0 0">추가한 칸은 오늘 탭에 생기고, 병원용 요약에도 횟수가 들어가요.</div></div></section>
      <section><h2><span><span class="en">FOOD</span>${esc(p.name)} 사료·간식 목록</span></h2><div class="card"><div class="note" style="margin:0 0 6px">사료</div><div style="display:flex;gap:6px;flex-wrap:wrap">${(p.foods || []).map((f) => chip("foods", f)).join("") || '<span class="note" style="margin:0">아직 없어요. 아래에서 추가하거나, 아침밥·저녁밥을 누를 때 입력해도 쌓여요.</span>'}</div>
      <form class="addw foodadd" data-key="foods" style="margin-top:8px"><label class="sr" for="add-foods">사료 이름 추가</label><input id="add-foods" maxlength="30" placeholder="사료 이름 (예: 힐스 k/d)" autocomplete="off"><button class="btn ghost" type="submit">추가</button></form>
      <div class="note" style="margin:12px 0 6px">간식</div><div style="display:flex;gap:6px;flex-wrap:wrap">${(p.snacks || []).map((f) => chip("snacks", f)).join("") || '<span class="note" style="margin:0">아직 없어요. 아래에서 추가하거나, 간식 버튼을 누를 때 입력해도 쌓여요.</span>'}</div>
      <form class="addw foodadd" data-key="snacks" style="margin-top:8px"><label class="sr" for="add-snacks">간식 이름 추가</label><input id="add-snacks" maxlength="30" placeholder="간식 이름 (예: 츄르)" autocomplete="off"><button class="btn ghost" type="submit">추가</button></form></div></section>`; })()}
    <section><h2><span><span class="en">BACKUP</span>백업</span></h2><div class="card"><div class="r" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost" data-act="export" type="button">백업 파일 저장</button><label class="btn ghost" style="display:inline-block">백업 불러오기<input id="importfile" type="file" accept="application/json" hidden></label></div>
      <div class="note">기록은 이 휴대폰 브라우저에만 있어요. 브라우저 기록을 지우면 사라지니 가끔 백업해 두세요.</div></div></section>
    <section><h2><span><span class="en">INSTALL</span>앱 설치</span></h2><div class="card note" style="margin:0">아이폰: 사파리 아래 공유 버튼 → "홈 화면에 추가"<br>안드로이드: 크롬 오른쪽 위 ⋮ → "앱 설치" 또는 "홈 화면에 추가"</div></section>
    <section><button class="btn ghost danger" data-act="wipe" type="button">${S.confirmWipe ? "정말 지울까요? 한 번 더 누르면 모두 지워져요" : "모든 기록 지우기"}</button></section>`;
  }

  // ---------- 달력 파일 (.ics) ----------
  function saveIcs(list, p) {
    if (!list.length) return;
    const d8 = (t) => iso(t).replace(/-/g, ""), stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const ev = list.map((s) => ["BEGIN:VEVENT", "UID:" + s.id + "-" + d8(s.due) + "@dangnyang", "DTSTAMP:" + stamp, "DTSTART;VALUE=DATE:" + d8(s.due), "DTEND;VALUE=DATE:" + d8(s.due + DAY),
      "SUMMARY:" + (p.name + " " + s.name).replace(/[,;\\]/g, " "), "DESCRIPTION:오래곁에 일정 (" + s.every + "일마다)", "BEGIN:VALARM", "TRIGGER:-PT15H", "ACTION:DISPLAY", "DESCRIPTION:내일 " + (p.name + " " + s.name).replace(/[,;\\]/g, " "), "END:VALARM", "END:VEVENT"].join("\r\n"));
    const text = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//dangnyang//KO", "CALSCALE:GREGORIAN", ev.join("\r\n"), "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/calendar" })); a.download = p.name + "-일정.ics"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast("달력 파일을 열면 일정이 추가돼요");
  }

  // ---------- 잠잘 때 호흡수 세기 (30초) ----------
  function addResp(bpm) { const p = P(); S.resp.push({ id: uid(), pid: p.id, t: now(), bpm, by: S.me }); save(); toast(p.name + " 호흡수 " + bpm + "회/분 기록했어요"); render(); }
  function openResp() {
    // 화면은 한 번만 만들고 숫자 글자만 바꿈 (다시 그리는 중에 누른 게 빠지지 않도록), 손가락이 닿는 순간(pointerdown)에 셈
    const p = P(), ov = document.createElement("div"); ov.className = "overlay"; document.body.appendChild(ov);
    let n = 0, t0 = 0, timer = null; const SEC = 30;
    ov.innerHTML = `<div class="ovin"><div class="idtop" style="border:0;padding:0 0 8px"><span>RESP · ${esc(p.name)} 잠잘 때 호흡수</span><button class="iconbtn" data-ov="close" type="button">닫기</button></div>
      <div data-part="count"><p class="ovhelp">아이가 푹 잠들었을 때, 가슴이 한 번 오르내리면 아래를 한 번 누르세요. 처음 누를 때 30초가 시작돼요.</p>
        <div class="tap" role="button" tabindex="0" aria-label="숨 쉴 때마다 누르기"><b>0</b><span>눌러서 시작</span></div></div>
      <div data-part="done" hidden><div class="ovres"><span></span><b></b></div><div class="lock"><button class="btn" data-ov="save" type="button">저장</button><button class="btn ghost" data-ov="again" type="button">다시 세기</button></div></div></div>`;
    const tap = ov.querySelector(".tap"), num = tap.querySelector("b"), sub = tap.querySelector("span"), help = ov.querySelector(".ovhelp");
    const partC = ov.querySelector('[data-part="count"]'), partD = ov.querySelector('[data-part="done"]');
    const finish = () => { clearInterval(timer); partC.hidden = true; partD.hidden = false; partD.querySelector(".ovres span").textContent = "30초 동안 " + n + "번"; partD.querySelector(".ovres b").innerHTML = n * 2 + "<small>회/분</small>"; };
    const tick = () => { const left = SEC - (Date.now() - t0) / 1000; if (left <= 0) return finish(); sub.textContent = Math.ceil(left) + "초 남음"; };
    const hit = (e) => { if (e) e.preventDefault(); if (!partD.hidden) return;
      if (!t0) { t0 = Date.now(); timer = setInterval(tick, 200); help.textContent = "가슴이 오르내릴 때마다 누르세요"; }
      n++; num.textContent = n; tap.classList.remove("hit"); void tap.offsetWidth; tap.classList.add("hit"); tick(); };
    tap.addEventListener("pointerdown", hit);
    tap.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") hit(e); });
    const close = () => { clearInterval(timer); ov.remove(); };
    ov.addEventListener("click", (e) => { const b = e.target.closest("[data-ov]"); if (!b) return; const a = b.dataset.ov;
      if (a === "close") close();
      if (a === "again") { n = 0; t0 = 0; clearInterval(timer); num.textContent = "0"; sub.textContent = "눌러서 시작"; partD.hidden = true; partC.hidden = false; }
      if (a === "save") { close(); addResp(n * 2); } });
  }

  // 아이 정보 카드: 진료기록부처럼
  function idCard(p) {
    const w = lastWeight(p), nx = nextSchedules(p)[0], N = now();
    const kv = [["진단", dxText(p)], ["복용약", p.meds || "없음"]], ml = medLeft(p);
    const mrow = ml ? `<dt>약 남음</dt><dd${ml.days <= 7 ? ' class="dn"' : ""}>${ml.days}일분 (${md(ml.end)}경까지)</dd>` : "";
    const crow = p.clinic || p.cphone ? `<dt>병원</dt><dd>${esc(p.clinic || "")}${p.cphone ? ` <a class="tel" href="${telHref(p.cphone)}">전화</a>` : ""}</dd>` : "";
    const wrow = w ? `<dt>체중</dt><dd>${w.kg.toFixed(2)}kg ${Math.abs(w.d) >= 0.01 ? `<span class="${w.pct <= -3 ? "dn" : ""}" style="font-size:11.5px">${w.d < 0 ? "▼" : "▲"}${Math.abs(w.d).toFixed(2)}</span>` : ""}</dd>` : "";
    return `<div class="idcard"><div class="idtop"><span>진료기록부 ${chartNo(p)}</span><span>${ymd(N)} (${wd(N)})</span></div>
      <div class="idbody">${photoBox(p)}<div><h1 class="name"><b>${esc(p.name)}</b><span>${esc(info(p) || (p.species === "cat" ? "고양이" : "강아지"))}</span></h1>
      <dl class="kv">${kv.map(([a, b]) => `<dt>${a}</dt><dd>${esc(b)}</dd>`).join("")}${mrow}${wrow}${p.allergy && p.allergy !== "없음" ? `<dt>알레르기</dt><dd>${esc(p.allergy)}</dd>` : ""}${crow}</dl></div></div>
      ${hasMeds(p) ? '<span class="stamp">투약<br>관리중</span>' : ""}
      ${nx ? `<div class="alertline${nx.left > 7 ? " calm" : ""}"><i>●</i><span>다음: ${esc(nx.name)}</span><span class="d">${ddText(nx)}</span></div>` : '<div class="alertline calm"><i>●</i><span>일정 탭에서 접종·검진 일정을 넣어 두세요</span></div>'}</div>`;
  }

  // ---------- 그리기 ----------
  function render() {
    const has = S.pets.length > 0;
    if (has && !S.pets.some((p) => p.id === S.cur)) S.cur = S.pets[0].id;
    $("#banner").innerHTML = S.demo ? `<div class="demo"><span>예시 데이터를 보고 있어요.</span><button data-act="clear-demo" type="button">지우고 내 아이 등록하기</button></div>` : "";
    $("#tabs").hidden = !has;
    if (!has) { $("#pets").innerHTML = ""; $("#pethead").innerHTML = ""; $("#pethead").hidden = true; $("#view").innerHTML = vWelcome(); return; }
    $("#pets").innerHTML = S.pets.map((p) => `<button data-pet="${p.id}" aria-pressed="${p.id === S.cur && tab !== "settings"}" type="button">${mini(p)}${esc(p.name)}</button>`).join("") + `<button class="add" data-act="add-pet" type="button">+ 아이 추가</button>`;
    const p = P();
    $("#pethead").innerHTML = tab === "settings" ? "" : tab === "today" ? idCard(p) : `<div class="minihead">${mini(p)}<div><b>${esc(p.name)}</b><small>${esc(info(p))}</small></div></div>`;
    $("#pethead").hidden = tab === "settings";
    document.querySelectorAll("nav.tabs button").forEach((b) => b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false"));
    $("#view").innerHTML = { today: vToday, weight: vWeight, schedule: vSchedule, summary: vSummary, settings: vSettings }[tab]();
  }

  // ---------- 동작 ----------
  function addLog(k, extra) { const p = P(), t = whenT(), past = now() - t > 60000; S.logs.push(Object.assign({ id: uid(), pid: p.id, k, t, by: S.me }, extra || {})); save(); toast(p.name + " " + label(p, k) + (extra && extra.food ? "(" + extra.food + ")" : "") + (extra && extra.ml ? " " + extra.ml + "ml" : "") + (past ? " · " + (sod(t) < sod(now()) ? md(t) + " " : "") + hm(t) + "으로" : "") + " 기록했어요"); picker = null; when = 0; render(); }
  function demo() {
    const r = ((s) => () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296))(42);
    const at = (d, h, m) => { const x = new Date(); x.setDate(x.getDate() - d); x.setHours(h, m, 0, 0); return x.getTime(); };
    const fam = ["나", "엄마", "민지"], S2 = blank(); S2.demo = true; S2.family = fam;
    const bori = { id: uid(), name: "보리", species: "dog", breed: "말티즈", birth: iso(at(13 * 365 + 40, 0, 0)), sex: "중성화 수컷", dx: "심장병(이첨판), 슬개골 2기", allergy: "닭고기", meds: "심장약 하루 2회 (아침·저녁)" };
    const nabi = { id: uid(), name: "나비", species: "cat", breed: "코리안 숏헤어", birth: iso(at(10 * 365 + 100, 0, 0)), sex: "중성화 암컷", dx: "신장 수치 관찰 중", allergy: "", meds: "신장 보조제 하루 1회" };
    bori.stock = { count: 30, perDay: 2, at: sod(at(9, 0, 0)) }; bori.clinic = "우리동네동물병원"; bori.cphone = "02-000-0000"; bori.chours = "평일 9~20시, 일 휴무";
    nabi.stock = { count: 40, perDay: 1, at: sod(at(10, 0, 0)) }; nabi.clinic = "우리동네동물병원"; nabi.cphone = "02-000-0000";
    bori.foods = ["로얄캐닌 심장 처방식", "힐스 k/d"]; bori.snacks = ["져키", "덴탈껌", "고구마"];
    nabi.foods = ["신장 처방식 습식", "신장 처방식 건식"]; nabi.snacks = ["츄르"];
    const kong = { id: uid(), name: "콩이", species: "dog", breed: "토이 푸들", birth: iso(at(15 * 365 + 20, 0, 0)), sex: "중성화 암컷", dx: "당뇨, 인지장애", allergy: "", meds: "인슐린 하루 2회", care: ["diabetes", "ccd"], foods: ["당뇨 처방식"], snacks: [] };
    S2.pets = [bori, nabi, kong]; S2.cur = bori.id;
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
    [3.92, 3.9, 3.86, 3.84, 3.8, 3.78, 3.75, 3.7, 3.66, 3.62, 3.6, 3.56].forEach((kg, i) => S2.weights.push({ id: uid(), pid: bori.id, t: at(177 - i * 15, 9, 0), kg, by: fam[i % 3] }));
    [4.62, 4.6, 4.61, 4.57, 4.55, 4.52, 4.38].forEach((kg, i) => S2.weights.push({ id: uid(), pid: nabi.id, t: at(i < 6 ? 170 - i * 33 : 4, 9, 0), kg, by: fam[(i + 1) % 3] }));
    [["심장사상충 예방약", 24, 30], ["외부 구충제", 24, 30], ["정기검진(심장 초음파)", 170, 180], ["종합백신", 260, 365], ["광견병 접종", 260, 365]].forEach(([name, d, every]) => S2.sch.push({ id: uid(), pid: bori.id, name, last: sod(at(d, 0, 0)), every }));
    [["외부 구충제", 28, 30], ["신장 혈액검사", 85, 90], ["종합백신", 300, 365]].forEach(([name, d, every]) => S2.sch.push({ id: uid(), pid: nabi.id, name, last: sod(at(d, 0, 0)), every }));
    bori.custom = [{ k: "c_teeth", label: "양치", type: "count" }]; bori.care = ["heart"]; nabi.care = ["kidney"];
    for (let d = 90; d >= 0; d--) { if (r() < (d < 14 ? 0.3 : 0.05)) add(bori.id, "tired", d, 17, Math.floor(r() * 59)); if (d <= 45 && d % 2 === 0) add(nabi.id, "fluid", d, 21, Math.floor(r() * 30)); }
    for (let d = 90; d >= 0; d--) {
      add(kong.id, "breakfast", d, 7, Math.floor(r() * 20), { food: "당뇨 처방식" }); add(kong.id, "insulinAM", d, 7, 25 + Math.floor(r() * 10), { u: d < 30 ? 4 : 3.5 });
      if (r() > 0.05) add(kong.id, "dinner", d, 19, Math.floor(r() * 20), { food: "당뇨 처방식" }); if (r() > 0.06) add(kong.id, "insulinPM", d, 19, 25 + Math.floor(r() * 10), { u: d < 30 ? 4 : 3.5 });
      if (d % 3 === 0) add(kong.id, "glucose", d, 13, 0, { mg: 160 + Math.floor(r() * 120) - (d < 30 ? 40 : 0) });
      if (r() < (d < 21 ? 0.4 : 0.15)) add(kong.id, "nightcry", d, 2, Math.floor(r() * 59)); if (r() < 0.2) add(kong.id, "wander", d, 22, Math.floor(r() * 59)); if (r() < 0.1) add(kong.id, "accident", d, 11, Math.floor(r() * 59));
    }
    [[170, 28, 1.8, 13, 4.1], [85, 31, 2.0, 15, 4.4], [6, 36, 2.3, 18, 4.9]].forEach(([d, bun, cre, sdma, phos], i) => S2.labs.push({ id: uid(), pid: nabi.id, t: sod(at(d, 0, 0)), bun, cre, sdma, phos, by: fam[i % 3] }));
    for (let d = 60; d >= 0; d--) { if (r() < 0.7) add(bori.id, "c_teeth", d, 21, Math.floor(r() * 59)); add(nabi.id, "waterml", d, 9, 0, { ml: (d < 14 ? 160 : 110) + 10 * Math.floor(r() * 4) }); }
    for (let d = 88; d >= 0; d -= 3) { const t = at(d, 23, 10); if (t <= now()) S2.resp.push({ id: uid(), pid: bori.id, t, bpm: (d < 14 ? 28 : 22) + 2 * Math.floor(r() * 3), by: fam[Math.floor(r() * 3)] }); }
    return S2;
  }
  function download(name, text) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const d = b.dataset;
    if (d.act !== "wipe" && S.confirmWipe) { S.confirmWipe = false; }
    if (d.tab) { tab = d.tab; picker = null; editing = null; render(); scrollTo(0, 0); return; }
    if (d.pet) { S.cur = d.pet; if (tab === "settings") tab = "today"; picker = null; save(); render(); return; }
    if (d.log) { if (d.log === "walk" || d.log === "note" || d.log === "waterml" || FOODTYPE[d.log] || PICK.includes(btype(P(), d.log))) { picker = picker === d.log ? null : d.log; render(); if (picker === "note") { const t = $("#notetext"); t && t.focus(); } return; } addLog(d.log); return; }
    if (d.dose !== undefined && picker) { addLog(picker, { u: +d.dose }); return; }
    if (d.walk) { addLog("walk", { min: +d.walk }); return; }
    if (d.ml) { addLog("waterml", { ml: +d.ml }); return; }
    if (d.when) { when = d.when === "custom" ? dtl(now() - 3600000) : +d.when; render(); return; }
    if (d.allmeal) { const t = whenT(); S.pets.forEach((q) => { const f = itemsFor(q, d.allmeal)[0]; S.logs.push(Object.assign({ id: uid(), pid: q.id, k: d.allmeal, t, by: S.me }, f ? { food: f } : {})); }); save(); toast("모두 " + (d.allmeal === "breakfast" ? "아침밥" : "저녁밥") + " 기록했어요 (최근 준 사료로)"); when = 0; render(); return; }
    if (d.delcustom) { const p = P(); p.custom = (p.custom || []).filter((x) => x.k !== d.delcustom); save(); toast("기록 칸을 뺐어요 (지난 기록은 남아 있어요)"); render(); return; }
    if (d.food !== undefined && FOODTYPE[picker]) { addLog(picker, d.food ? { food: d.food } : {}); return; }
    if (d.delfood) { const p = P(), [key, name] = d.delfood.split("|"); p[key] = (p[key] || []).filter((x) => x !== name); save(); toast(name + " 목록에서 뺐어요"); render(); return; }
    if (d.dellog) { S.logs = S.logs.filter((l) => l.id !== d.dellog); save(); toast("기록을 지웠어요"); render(); return; }
    if (d.delw) { S.weights = S.weights.filter((w) => w.id !== d.delw); save(); toast("체중 기록을 지웠어요"); render(); return; }
    if (d.delsch) { S.sch = S.sch.filter((s) => s.id !== d.delsch); save(); toast("일정을 지웠어요"); render(); return; }
    if (d.done) { doneSch = doneSch === d.done ? null : d.done; render(); return; }
    if (d.ics) { const s = nextSchedules(P()).find((x) => x.id === d.ics); if (s) saveIcs([s], P()); return; }
    if (d.dellab) { S.labs = S.labs.filter((x) => x.id !== d.dellab); save(); toast("검사 기록을 지웠어요"); render(); return; }
    if (d.delr) { S.resp = S.resp.filter((r) => r.id !== d.delr); save(); toast("호흡수 기록을 지웠어요"); render(); return; }
    if (d.period) { period = +d.period; render(); return; }
    if (d.editpet) { editing = d.editpet; render(); return; }
    switch (d.act) {
      case "add-pet": tab = "settings"; editing = "new"; render(); scrollTo(0, 0); return;
      case "cancel-pet": editing = null; render(); return;
      case "close-picker": picker = null; render(); return;
      case "demo": S = demo(); save(); tab = "today"; render(); return;
      case "clear-demo": S = blank(); save(); tab = "today"; render(); return;
      case "export": download("오래곁에-백업-" + iso(now()) + ".json", JSON.stringify(S)); toast("백업 파일을 저장했어요"); return;
      case "wipe": if (!S.confirmWipe) { S.confirmWipe = true; render(); return; } S = blank(); save(); tab = "today"; editing = null; toast("모든 기록을 지웠어요"); render(); return;
      case "photo": photoPid = d.pid; $("#photofile").value = ""; $("#photofile").click(); return;
      case "photo-del": { const q = S.pets.find((x) => x.id === d.pid); if (q) { delete q.photo; save(); toast("사진을 뺐어요"); render(); } return; }
      case "image": shareSummaryImage(); return;
      case "custom-add": tab = "settings"; editing = null; render(); setTimeout(() => { const el = $("#cname"); if (el) { el.scrollIntoView({ block: "center" }); el.focus(); } }, 50); return;
      case "done-cancel": doneSch = null; render(); return;
      case "ics-all": saveIcs(nextSchedules(P()), P()); return;
      case "resp": openResp(); return;
      case "copy": { const ph = document.querySelectorAll("#sheet .photo"); ph.forEach((e) => (e.hidden = true)); const txt = $("#sheet").innerText; ph.forEach((e) => (e.hidden = false)); const sel = () => { const r = document.createRange(); r.selectNodeContents($("#sheet")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast("복사했어요. 카톡이나 문자에 붙여 넣으세요"), () => { sel(); toast("내용을 선택해 두었어요. 복사를 눌러 주세요"); }); else sel(); return; }
    }
  });
  // 사진: 가로 360 × 세로 450 으로 잘라 줄여서 이 휴대폰에만 저장
  let photoPid = null;
  function readPhoto(file) {
    return new Promise((res, rej) => { const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => { const W = 360, H = 450, r = Math.max(W / img.naturalWidth, H / img.naturalHeight), sw = W / r, sh = H / r, c = document.createElement("canvas"); c.width = W; c.height = H;
        c.getContext("2d").drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, W, H); URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", 0.82)); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(); }; img.src = url; });
  }
  document.addEventListener("change", (e) => {
    if (e.target.id === "photofile" && e.target.files[0]) {
      const q = S.pets.find((x) => x.id === photoPid) || P();
      readPhoto(e.target.files[0]).then((u) => { q.photo = u; save(); toast(q.name + " 사진을 넣었어요"); render(); }, () => toast("이 사진은 열 수 없어요. 다른 사진을 골라 주세요"));
      return;
    }
    if (e.target.id === "whenat") { when = e.target.value || 0; render(); return; }
    if (e.target.id === "me") { S.me = e.target.value; save(); toast(S.me + "(으)로 기록해요"); }
    if (e.target.id === "importfile" && e.target.files[0]) {
      const fr = new FileReader(); fr.onload = () => { try { const d = JSON.parse(fr.result); if (d.v !== 1 || !Array.isArray(d.pets)) throw 0; S = d; S.demo = false; S.resp = S.resp || []; S.labs = S.labs || []; S.pets.forEach((q) => { if (!q.care) q.care = guessCare(q.dx); }); save(); tab = "today"; toast("백업을 불러왔어요"); render(); } catch (_) { toast("오래곁에 백업 파일이 아니에요"); } }; fr.readAsText(e.target.files[0]);
    }
  });
  document.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = e.target.id, v = (s) => ($(s) ? $(s).value.trim() : "");
    if (id === "petform") {
      const name = v("#f-name"); if (!name) { toast("이름을 넣어 주세요"); return; }
      const data = { name, species: (document.querySelector("input[name=sp]:checked") || {}).value || "dog", breed: v("#f-breed"), birth: v("#f-birth"), sex: v("#f-sex"), dx: v("#f-dx"), allergy: v("#f-allergy"), meds: v("#f-meds"), clinic: v("#f-clinic"), cphone: v("#f-cphone"), chours: v("#f-chours"), care: [...document.querySelectorAll("input[name=care]:checked")].map((x) => x.value) };
      const stock = parseFloat(v("#f-stock").replace(",", ".")), perDay = parseFloat(v("#f-perday").replace(",", "."));
      data.stock = stock >= 0 && perDay > 0 ? { count: stock, perDay, at: sod(now()) } : null;
      if (S.demo) { S = blank(); }
      const ex = editing && editing !== "new" ? S.pets.find((p) => p.id === editing) : null;
      if (ex) Object.assign(ex, data); else { const p = Object.assign({ id: uid() }, data); S.pets.push(p); S.cur = p.id; }
      editing = null; tab = "today"; save(); toast(name + (ex ? " 정보를 저장했어요" : " 등록했어요")); render(); scrollTo(0, 0); return;
    }
    if (id === "foodform") { const name = v("#foodname"); if (!name || !FOODTYPE[picker]) { toast("이름을 적어 주세요"); return; } const p = P(), key = FOODTYPE[picker]; p[key] = p[key] || []; if (!p[key].includes(name)) p[key].push(name); addLog(picker, { food: name }); return; }
    if (id === "doseform") { const n = parseFloat(v("#doseval").replace(",", ".")); if (!(n > 0 && n < 200)) { toast("단위를 숫자로 넣어 주세요"); return; } addLog(picker, { u: n }); return; }
    if (id === "glucform") { const n = parseInt(v("#glucval"), 10); if (!(n >= 10 && n <= 1000)) { toast("혈당을 숫자로 넣어 주세요"); return; } addLog("glucose", { mg: n }); return; }
    if (id === "qolform") { const q = {}; for (const [k] of QOL) { const r = document.querySelector(`input[name=q-${k}]:checked`); if (!r) { toast("여섯 가지를 모두 골라 주세요"); return; } q[k] = +r.value; } addLog("qol", { q, score: Object.values(q).reduce((a, b) => a + b, 0) }); return; }
    if (id === "noteform") { const text = v("#notetext"); if (!text) { toast("메모를 적어 주세요"); return; } addLog("note", { text }); return; }
    if (id === "wform") { const kg = parseFloat(v("#wkg").replace(",", ".")); if (!(kg > 0.1 && kg < 120)) { toast("체중을 kg 숫자로 넣어 주세요 (예: 3.55)"); return; } const p = P(); S.weights.push({ id: uid(), pid: p.id, t: now(), kg, by: S.me }); save(); toast(p.name + " " + kg + "kg 기록했어요"); render(); return; }
    if (id === "schform") { const name = v("#s-name"), last = v("#s-last"), every = parseInt(v("#s-every"), 10); if (!name || !last || !(every > 0)) { toast("이름, 날짜, 간격을 모두 넣어 주세요"); return; } S.sch.push({ id: uid(), pid: P().id, name, last: fromIso(last), every }); save(); toast(name + " 일정을 추가했어요"); render(); return; }
    if (e.target.classList.contains("donef")) { const s = S.sch.find((x) => x.id === e.target.dataset.sid), dv = v("#donedate"); if (!s || !dv) return; const t = Math.min(fromIso(dv), sod(now())); s.last = t; doneSch = null; save(); toast(s.name + " " + md(t) + "에 한 걸로 기록, 다음 날짜를 다시 계산했어요"); render(); return; }
    if (id === "mlform") { const n = parseInt(v("#mlval"), 10); if (!(n > 0 && n < 5000)) { toast("ml 숫자로 넣어 주세요"); return; } addLog("waterml", { ml: n }); return; }
    if (e.target.classList.contains("foodadd")) { const key = e.target.dataset.key, inp = e.target.querySelector("input"), name = inp.value.trim(); if (!name) { toast("이름을 적어 주세요"); return; } const p = P(); p[key] = p[key] || []; if (p[key].includes(name)) { toast("이미 목록에 있어요"); return; } p[key].push(name); save(); toast(name + " 추가했어요"); render(); const again = $("#add-" + key); if (again) again.focus(); return; }
    if (id === "customform") { const name = v("#cname"), type = v("#ctype") || "count"; if (!name) { toast("칸 이름을 적어 주세요"); return; } const p = P(); p.custom = p.custom || []; if (btns(p).some((b) => b.label === name)) { toast("같은 이름의 칸이 이미 있어요"); return; } p.custom.push({ k: "c_" + uid(), label: name, type }); save(); toast(name + " 칸을 추가했어요"); render(); return; }
    if (id === "labform") {
      const t = fromIso(v("#l-date") || iso(now())), rec = { id: uid(), pid: P().id, t, by: S.me }; let n = 0;
      for (const [k] of LABK) { const raw = v("#l-" + k).replace(",", "."); if (!raw) continue; const x = parseFloat(raw); if (!(x >= 0 && x < 100000)) { toast("숫자로 넣어 주세요"); return; } rec[k] = x; n++; }
      if (!n) { toast("수치를 하나 이상 넣어 주세요"); return; }
      S.labs.push(rec); save(); toast("검사 수치를 저장했어요"); render(); return;
    }
    if (id === "rform") { const n = parseInt(v("#rbpm"), 10); if (!(n >= 4 && n <= 200)) { toast("1분에 숨 쉰 횟수를 숫자로 넣어 주세요"); return; } addResp(n); return; }
    if (id === "famform") { const n = v("#famname"); if (!n || S.family.includes(n)) return; S.family.push(n); save(); toast(n + " 추가했어요"); render(); return; }
  });
  render();
})();
