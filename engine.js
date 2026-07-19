// ===== KBL 포제션 기반 매치엔진 =====
// 팀 수치를 쓰지 않고 코트 위 10명의 개인 능력치 + 신장/속도 매치업으로만 경기를 판정한다.
// simulateGame(app.js)이 playMatch()를 호출해 결과(점수/박스스코어/문자중계)를 받는 구조.

const ENGINE_MIN_TARGET = [36, 34, 31, 28, 26, 13, 10, 8, 6, 4, 2, 1];

// ===== 뱃지 시스템: 조건을 충족한 특별한 선수에게 경기 내 추가 보정 =====
const BADGES = {
  // 공격
  acrobat:      { name: "곡예사", cat: "공격", icon: "🎪", desc: "가속 돌파 후 어려운 레이업·플로터 마무리 보정", cond: (a, h) => a("드라이빙레이업") >= 90 && a("드리블속도") >= 80 && a("속도") >= 80 && a("민첩성") >= 80 },
  poster:       { name: "림 파괴자", cat: "공격", icon: "💥", desc: "돌파 후 올라가는 인유어페이스 덩크 보정", cond: (a, h) => a("드라이빙덩크") >= 90 && a("드리블속도") >= 80 && a("속도") >= 80 && a("점프력") >= 90 },
  riseup:       { name: "고공 폭격기", cat: "공격", icon: "🚀", desc: "페인트존에서 수비 위로 덩크·풋백 마무리 보정", cond: (a, h) => a("스탠딩덩크") >= 90 && a("힘") >= 90 && a("점프력") >= 70 },
  postplay:     { name: "포스트업 시인", cat: "공격", icon: "🐘", desc: "포스트에서 페이크·셰이크·페이더웨이로 수비를 농락하는 기술자", cond: (a, h) => a("포스트컨트롤") >= 90 && a("중거리슛") >= 80 && a("힘") >= 80 },
  // 수비
  spider:       { name: "거미손", cat: "수비", icon: "🕷", desc: "외곽 1대1 수비 보너스, 패스길을 읽고 차단", cond: (a, h) => a("외곽수비") >= 90 && a("스틸") >= 90 && a("체력") >= 80 },
  swatter:      { name: "파리채", cat: "수비", icon: "🖐", desc: "골밑 1대1 수비 보너스 + 블록 확률 보정", cond: (a, h) => a("골밑수비") >= 90 && a("블록") >= 90 && a("힘") >= 80 },
  glass:        { name: "추적자", cat: "수비", icon: "🧲", desc: "리바운드 경합에서 추가 보너스", cond: (a, h) => a("공격리바운드") >= 90 && a("수비리바운드") >= 90 && a("점프력") >= 70 },
  // 슈팅
  machine:      { name: "득점 기계", cat: "슈팅", icon: "⚙", desc: "골밑·미드레인지 득점 전반 보너스", cond: (a, h) => a("근거리슛") >= 90 && a("중거리슛") >= 80 },
  sharpshooter: { name: "명사수", cat: "슈팅", icon: "🎯", desc: "수비를 달고 던지는 외곽슛 포함 외곽 전반 보너스", cond: (a, h) => a("중거리슛") >= 80 && a("3점슛") >= 90 && a("자유투") >= 90 },
  deep:         { name: "초장거리", cat: "슈팅", icon: "🛰", desc: "속공 풀업 3점, 딥쓰리 성공률 보너스", cond: (a, h) => a("3점슛") >= 95 && a("민첩성") >= 80 },
  // 플레이메이킹
  hawkeye:      { name: "매의 눈", cat: "플레이메이킹", icon: "🦅", desc: "경기 조립 능력 보정, 빈 공간 킬패스", cond: (a, h) => h <= 200 && a("패스정확도") >= 90 && a("볼핸들링") >= 90 },
  tower:        { name: "관제탑", cat: "플레이메이킹", icon: "🗼", desc: "포인트센터 — 탑/포스트에서 컷인·킥아웃 배급", cond: (a, h) => h >= 200 && a("패스정확도") >= 90 },
  ankle:        { name: "발목 암살자", cat: "플레이메이킹", icon: "⚡", desc: "아이솔레이션에서 상대를 무력화하는 1대1 보너스", cond: (a, h) => a("볼핸들링") >= 90 && a("드리블속도") >= 90 && a("민첩성") >= 90 },
  lightning:    { name: "번개 발사", cat: "플레이메이킹", icon: "🌩", desc: "역습 속공 상황 추가 보너스", cond: (a, h) => a("속도") >= 80 && a("드리블속도") >= 90 && a("볼핸들링") >= 90 },
  // 만능
  allin:        { name: "철인", cat: "만능", icon: "🛡", desc: "공수 모든 영역을 소화하는 강골 빅맨 기본 보너스", cond: (a, h) => a("근거리슛") >= 80 && a("중거리슛") >= 80 && a("패스정확도") >= 80 && a("골밑수비") >= 80 && a("블록") >= 80 && a("속도") >= 80 },
  allout:       { name: "팔방미인", cat: "만능", icon: "🗡", desc: "재주 많은 백코트/윙 자원 기본 보너스", cond: (a, h) => a("드라이빙레이업") >= 80 && a("3점슛") >= 80 && a("패스정확도") >= 80 && a("외곽수비") >= 80 && a("스틸") >= 80 && a("속도") >= 80 },
};

function computeBadges(rosterP) {
  const attrs = rosterP.attrs || {};
  const a = (k) => Number(attrs[k]) || 0;
  const h = Number(rosterP.height) || 0;
  return Object.keys(BADGES).filter((k) => BADGES[k].cond(a, h));
}

function badgeOf(pl, key) {
  return !!(pl && pl.badges && pl.badges.indexOf(key) >= 0);
}

// ===== 작전(플레이북) 시스템 =====
const PLAYBOOKS = {
  off: {
    inside: { name: "인사이드 아웃", desc: "골밑에서 시작하는 정통 농구. 포스트 시도와 공격리바운드 강화", w3: 0.85, wD: 0.95, wR: 1.35, wM: 1.1, pace: -1, oreb: 1.15, postBonus: 0.015 },
    morey: { name: "머니볼", desc: "3점 폭격. 슈터진이 좋으면 스페이싱으로 골밑까지 열림 (슈터 없으면 난사 자멸)", w3: 1.45, wR: 0.9, wM: 0.55, spacing: true },
    hero: { name: "히어로 볼", desc: "에이스에게 몰아주는 농구. 클러치에 강하지만 에이스 피로 급증", aceUsage: 1.5, aceFatigue: 1.25, assist: -0.08 },
    pns: { name: "페이스 앤 스페이스", desc: "빠른 템포 + 3점·돌파 균형의 현대 농구", w3: 1.2, wD: 1.15, wR: 0.85, pace: 3, assist: 0.05 },
    run: { name: "세븐 세컨즈", desc: "최대 페이스의 폭주 농구. 속공 빈발, 대신 턴오버·피로 증가", pace: 6, fastbreak: 0.15, to: 0.015, fatigue: 1.15 },
    motion: { name: "뷰티풀 게임", desc: "볼이 계속 도는 모션 오펜스. 어시스트와 오픈샷 증가, 전원 고른 사용률", assist: 0.12, usageFlat: true, openBonus: 0.015 },
    pnr: { name: "스프레드 픽앤롤", desc: "핸들러+빅맨 2인 게임 집중. 듀오 강화, 나머지 소외", duoUsage: 1.35, duoBonus: 0.02, otherUsage: 0.85 },
    twin: { name: "트윈 타워", desc: "빅맨 2명 동시 기용. 리바운드·블록 지배, 3점·기동력 포기", twoBigs: true, w3: 0.9, wR: 1.25, oreb: 1.3, ownDreb: 1.2, pace: -3, ownBlk: 1.2 },
  },
  def: {
    man: { name: "맨투맨", desc: "기본 대인 방어. 특별한 강점도 약점도 없음" },
    press: { name: "풀코트 프레스", desc: "전면 압박. 상대 턴오버 유발, 대신 파울과 피로 증가", oppTo: 0.03, foul: 0.03, fatigue: 1.2 },
    zone23: { name: "2-3 지역방어", desc: "골밑 봉쇄. 림 어택을 막지만 3점을 내줌", oppRim: -0.03, opp3: 0.028, blk: 0.012 },
    zone32: { name: "3-2 지역방어", desc: "외곽 봉쇄. 3점을 막지만 골밑이 헐거워짐", opp3: -0.025, oppRim: 0.02 },
    box1: { name: "박스 앤 원", desc: "상대 에이스 전담 마크. 1옵션을 지우지만 나머지 4명이 편해짐", aceUsage: 0.65, aceShot: -0.03, othersShot: 0.015 },
  },
};

// 팀별 기본 작전 (로스터 분석 기반)
const DEFAULT_PLAYBOOKS = {
  db: { off: "twin", def: "zone23" },
  samsung: { off: "inside", def: "zone23" },
  sono: { off: "hero", def: "press" },
  sk: { off: "pnr", def: "man" },
  lg: { off: "morey", def: "zone32" },
  redboosters: { off: "run", def: "zone23" },
  kt: { off: "pnr", def: "box1" },
  kogas: { off: "inside", def: "man" },
  mobis: { off: "motion", def: "man" },
  kcc: { off: "pns", def: "zone23" },
};

function getPlaybook(teamId) {
  if (typeof state !== "undefined" && state && teamId === state.selectedTeamId && state.playbook) return state.playbook;
  return DEFAULT_PLAYBOOKS[teamId] || { off: "pns", def: "man" };
}

// ===== 부상 시스템: 부상빈도(숨은 능력치) x 경기 중 피로가 부상 확률을 결정 =====
const INJURY_TYPES = [
  // 경미 (일상적으로 발생, 며칠 결장)
  { label: "종아리 경련", min: 1, max: 2, w: 22 },
  { label: "손가락 부상", min: 1, max: 4, w: 16 },
  { label: "발목 염좌", min: 2, max: 6, w: 20 },
  { label: "허리 통증", min: 2, max: 7, w: 14 },
  { label: "무릎 통증", min: 3, max: 8, w: 12 },
  { label: "어깨 부상", min: 4, max: 10, w: 8 },
  { label: "햄스트링 부상", min: 5, max: 12, w: 6 },
  { label: "발목 인대 부분 파열", min: 10, max: 25, w: 2 },
  // 중대 (수술/장기 재활, 한 달 이상)
  { label: "손목 골절", min: 30, max: 55, w: 1.5 },
  { label: "발목 골절", min: 55, max: 100, w: 1.0 },
  { label: "무릎 연골 손상", min: 80, max: 150, w: 0.8 },
  { label: "반월판 연골 파열", min: 60, max: 110, w: 1.2 },
  // 시즌아웃급 (드물게 발생, 반 시즌~한 시즌 이상) — 회복기간은 비슷하지만 아킬레스건이 폭발력 회복률·커리어 타격 면에서 더 치명적
  { label: "십자인대 파열", min: 220, max: 300, w: 0.4 },
  { label: "아킬레스건 파열", min: 220, max: 330, w: 0.35 },
];

// 히든 능력치 (에디터 데이터, 0~20 스케일, 10 = 리그 평균. 없으면 평균 처리)
function hidOf(p, key, d = 10) {
  const v = p && p.hidden ? Number(p.hidden[key]) : NaN;
  return isNaN(v) ? d : v;
}

// 부상빈도(히든 0~20): 0 = 강골, 10 = 평균(기준 1.0배), 20 = 유리몸.
// 제곱 곡선이라 평균 근처는 완만하지만 15~20대(최준용·송교창급 "잘 다치는 선수")는 확실히 티나게 위험해진다.
// freq=0 -> 0.3배, freq=10 -> 1.0배, freq=15 -> 약 1.93배, freq=20 -> 3.2배. 노장은 추가 가중.
function injuryProneOf(rosterP) {
  const freq = hidOf(rosterP, "부상빈도", 10);
  const age = Number(rosterP.age) || 27;
  const x = Math.max(0, Math.min(20, freq)) / 20;
  const base = 0.3 + 2.9 * x * x;
  return base * (1 + Math.max(0, age - 31) * 0.04);
}

// 포제션마다 코트 위 선수의 부상 판정. 피로가 쌓일수록(체력 관리 실패) 위험이 급증한다
function maybeInjury(T, ctx) {
  for (const p of T.court) {
    if (p.out) continue;
    // 경기 감각이 낮을수록(안 뛰어서 녹슨 상태) 몸이 타이밍을 못 맞춰 부상 위험이 커진다 (감각 0 -> 최대 1.7배)
    const rustRisk = 1 + Math.max(0, 70 - (p.sharpness ?? 70)) * 0.01;
    const risk = 0.00028 * (1 + Math.max(0, p.fatigue - 22) * 0.045) * (p.prone || 1) * rustRisk;
    if (Math.random() >= risk) continue;
    const type = pickWeighted(INJURY_TYPES, (t) => t.w);
    const days = randomBetween(type.min, type.max);
    p.out = true;
    (ctx.injuries = ctx.injuries || []).push({ team: T.id, id: p.id, name: p.name, label: type.label, days });
    if (ctx.events) ctx.events.push({ t: "injury", p: p.id, q: ctx.q, clock: ctx.clock, team: T.id, li: ctx.pbp.length });
    if (ctx.pbp.length < 1400) {
      ctx.pbp.push(`${ctx.q}Q ${ctx.clock} 🚑 ${p.name} 선수가 고통을 호소하며 주저앉습니다. ${type.label}${josa(type.label, "으로", "로")} 보입니다`);
      if (days >= 180) {
        ctx.pbp.push(`${ctx.q}Q ${ctx.clock} 심각한 부상입니다. ${p.name}, 들것에 실려 코트를 빠져나갑니다. 사실상 시즌아웃이 우려되는 상황입니다`);
      } else if (days >= 30) {
        ctx.pbp.push(`${ctx.q}Q ${ctx.clock} ${p.name}, 부축을 받으며 힘겹게 코트를 빠져나갑니다. 정밀 검진이 필요해 보이는 심각한 부상입니다`);
      } else {
        ctx.pbp.push(`${ctx.q}Q ${ctx.clock} ${p.name}, 동료들의 부축을 받으며 코트를 빠져나갑니다. 오늘은 더 뛰기 어려워 보입니다`);
      }
    }
    replaceOnCourt(T, p);
  }
}

function attrOf(p, key, d = 60) {
  const v = p && p.attrs ? Number(p.attrs[key]) : NaN;
  return isNaN(v) ? (p && p.ovr ? p.ovr : d) : v;
}

function pickWeighted(items, weightFn) {
  const ws = items.map((it) => Math.max(0, weightFn(it)));
  const sum = ws.reduce((a, b) => a + b, 0);
  if (sum <= 0) return items[Math.floor(Math.random() * items.length)];
  let r = Math.random() * sum;
  for (let i = 0; i < items.length; i += 1) { r -= ws[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

function makeMatchTeam(teamId, isHome, dleague) {
  const idOf = (p) => p.playerId || p.name;
  // 유저 팀 선발/로테이션 설정 (선수단 탭에서 저장) — D리그 경기에는 1군 라인업 설정을 적용하지 않는다
  let cfg = null;
  if (!dleague && typeof state !== "undefined" && state && teamId === state.selectedTeamId
      && state.lineupConfig && Array.isArray(state.lineupConfig.rotation) && state.lineupConfig.rotation.length >= 5) {
    cfg = state.lineupConfig;
  }
  // 유저 플레이타임 배분 (전술실에서 설정, 합계 200분 기준으로 정규화)
  let plan = null;
  if (!dleague && typeof state !== "undefined" && state && teamId === state.selectedTeamId && state.minutesPlan) {
    const sum = Object.values(state.minutesPlan).reduce((s, v) => s + (Number(v) || 0), 0);
    if (sum > 0) {
      const f = 200 / sum;
      plan = {};
      for (const [pid, v] of Object.entries(state.minutesPlan)) plan[pid] = (Number(v) || 0) * f;
    }
  }
  let planTop5 = null;
  if (plan && !cfg) {
    planTop5 = Object.entries(plan).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  }
  // 부상자는 엔트리에서 제외, 회복되지 않은 체력(컨디션)은 시작 피로·목표 출전시간에 반영
  const injMap = (typeof state !== "undefined" && state && state.injuries) || {};
  const condMap = (typeof state !== "undefined" && state && state.playerCondition) || {};
  const condOfP = (p) => { const v = condMap[p.playerId || p.name]; return v == null ? 100 : v; };
  const baseRoster = dleague && typeof dleagueRosterFor === "function" ? dleagueRosterFor(teamId) : rosterFor(teamId);
  const fullRoster = baseRoster.filter((p) => {
    const inj = injMap[p.playerId || p.name];
    return !(inj && inj.daysLeft > 0);
  });
  const roster = (cfg || plan) ? fullRoster : fullRoster.slice(0, 12);
  // 목표 출전시간 순위: 설정이 있으면 선발(OVR순) 0~4 -> 로테이션(OVR순), 없으면 전체 OVR 순위
  let ovrRank;
  let starterIds = [];
  if (cfg) {
    starterIds = Object.values(cfg.starters || {}).filter(Boolean);
    const rotSet = new Set(cfg.rotation);
    const st = fullRoster.filter((p) => starterIds.includes(idOf(p))).sort((x, y) => (y.ovr || 0) - (x.ovr || 0));
    const others = fullRoster.filter((p) => rotSet.has(idOf(p)) && !starterIds.includes(idOf(p))).sort((x, y) => (y.ovr || 0) - (x.ovr || 0));
    ovrRank = new Map();
    [...st, ...others].forEach((p, r) => ovrRank.set(idOf(p), r));
    // 로테이션 제외 선수: 순위 없음 -> 목표 0분 (부상/퇴장 비상시에만 투입)
  } else {
    ovrRank = new Map(
      [...roster].sort((x, y) => (y.ovr || 0) - (x.ovr || 0)).map((x, r) => [idOf(x), r]),
    );
  }
  const players = roster.map((p, i) => {
    const cond = condOfP(p);
    const startFat = Math.max(0, (100 - cond) * 0.55); // 컨디션 60% -> 시작 피로 22 (즉시 성공률 하락 구간)
    const condScale = 0.55 + cond * 0.0045; // 컨디션이 낮으면 감독이 출전시간을 줄여 관리
    return {
    ref: p,
    id: p.playerId || p.name,
    name: p.name,
    pos: p.mainPosition || p.position,
    posList: String(p.position || ""),
    height: Number(p.height) || 190,
    atk: typeof p.atk === "number" ? p.atk : (p.ovr || 70),
    ovr: p.ovr || 70,
    foreign: String(p.playerId || "").startsWith("F"),
    stamina: attrOf(p, "체력", 72),
    cond,
    sharpness: p.sharpness == null ? 70 : Number(p.sharpness),
    prone: injuryProneOf(p),
    // 히든 능력치 -> 경기 반영 (0~20, 10 = 평균)
    form: (Math.random() * 2 - 1) * 0.025 * (1 - hidOf(p, "꾸준함", 10) / 20), // 오늘의 폼: 꾸준함이 낮을수록 기복이 큼
    clutch: (hidOf(p, "강심장", 10) - 10) * 0.002,   // 클러치 슛 성공률 보정 (±2%)
    bigGame: (hidOf(p, "큰경기", 10) - 10) * 0.0015, // 플레이오프 성공률 보정 (±1.5%)
    dirty: hidOf(p, "더티플레이", 10),               // 파울 빈도 가중
    teamwork: hidOf(p, "팀워크", 10),                // 어시스트 성향 가중
    fatigue: startFat,
    baseFatigue: startFat,
    // 체력이 낮으면 목표 출전시간 자체가 줄어듦 (체력 90 -> 100%, 체력 65 -> 83%)
    target: plan
      ? Math.round(plan[p.playerId || p.name] || 0)
      : ovrRank.has(p.playerId || p.name)
        ? Math.max(0, Math.round((ENGINE_MIN_TARGET[ovrRank.get(p.playerId || p.name)] || 1) * (0.8 + (attrOf(p, "체력", 72) - 60) * 0.006) * condScale) + randomBetween(-2, 2))
        : 0,
    starter: cfg
      ? starterIds.includes(p.playerId || p.name)
      : planTop5
        ? planTop5.includes(p.playerId || p.name)
        : (ovrRank.has(p.playerId || p.name) ? ovrRank.get(p.playerId || p.name) : 99) < 5,
    badges: computeBadges(p),
    min: 0, pts: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0,
    fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, to: 0, pf: 0, pm: 0,
    out: false,
    };
  });
  const fullName = (teamById(teamId) || { name: teamId }).name;
  // 중계용 호칭: 도시 + 구단명 (애칭 대신)
  const SHORT_NAMES = { kcc: "부산 KCC", sono: "고양 소노", lg: "창원 LG", redboosters: "안양 정관장", sk: "서울 SK", db: "원주 DB", kt: "수원 KT", mobis: "울산 현대모비스", kogas: "대구 가스공사", samsung: "서울 삼성" };
  // 작전 + 작전용 팀 특성 (에이스, 픽앤롤 듀오, 슈터 적합도)
  const pbSel = getPlaybook(teamId);
  const sortedByOvr = [...players].sort((a, b) => b.ovr - a.ovr);
  const bestHandler = [...players].sort((a, b) => (attrOf(b.ref, "볼핸들링") + attrOf(b.ref, "패스정확도")) - (attrOf(a.ref, "볼핸들링") + attrOf(a.ref, "패스정확도")))[0];
  const bigsByAtk = players.filter((p) => p.pos === "PF" || p.pos === "C").sort((a, b) => b.atk - a.atk);
  const top8 = players.slice(0, 8);
  return {
    id: teamId, name: fullName,
    shortName: SHORT_NAMES[teamId] || fullName.split(" ").slice(0, 2).join(" "),
    isHome, players, court: [], cfg,
    pb: { off: PLAYBOOKS.off[pbSel.off] || {}, def: PLAYBOOKS.def[pbSel.def] || {}, offKey: pbSel.off, defKey: pbSel.def },
    aceId: sortedByOvr[0] ? sortedByOvr[0].id : null,
    duoIds: new Set([bestHandler && bestHandler.id, bigsByAtk[0] && bigsByAtk[0].id].filter(Boolean)),
    three8: top8.reduce((s, p) => s + attrOf(p.ref, "3점슛", 50), 0) / (top8.length || 1),
  };
}

// 실제 농구 로테이션 패턴: 시간대별 주전 기용 수 + 스코어 인지 (추격 시 주전 총동원 / 대량 리드 시 휴식)
// info: { elapsed(경기 경과 분), margin(점수차), trailing(이 팀이 지고 있나), forceMode }
function setLineupSmart(T, info) {
  const CAP = 38;
  const pool = T.players.filter((p) => !p.out);
  if (!pool.length) { T.court = []; return "normal"; }
  const el = info.elapsed, margin = info.margin || 0, trailing = !!info.trailing;
  let mode = info.forceMode || "normal";
  if (!info.forceMode) {
    if (el >= 30 && margin >= 20) mode = "garbage";
    else if (el >= 35 && margin >= 15) mode = "garbage";
    else if (el >= 35 && margin <= 8) mode = "clutch";
    else if (el >= 38 && margin <= 12) mode = "clutch";
  }
  let five;
  if (mode === "clutch") {
    // 클러치: 피로/출전시간 무시, 최고 전력 5명 (5반칙만 제외)
    five = [...pool].sort((a, b) => b.ovr - a.ovr).slice(0, 5);
  } else if (mode === "garbage") {
    const starterSet = new Set([...pool].sort((a, b) => b.ovr - a.ovr).slice(0, 5).map((p) => p.id));
    let benchAll = pool.filter((p) => !starterSet.has(p.id) && p.target > 0);
    if (benchAll.length < 5) benchAll = pool.filter((p) => !starterSet.has(p.id));
    five = benchAll.sort((a, b) => (b.target - b.min) - (a.target - a.min)).slice(0, 5);
    if (five.length < 5) {
      const fill = pool.filter((p) => !five.includes(p)).sort((a, b) => a.ovr - b.ovr);
      while (five.length < 5 && fill.length) five.push(fill.shift());
    }
  } else {
    const starters = pool.filter((p) => p.starter);
    const bench = pool.filter((p) => !p.starter);
    // 시간대별 주전 수 스크립트 (1Q 주전 -> 막판 일부 휴식 -> 2Q 세컨 유닛 -> 복귀 -> 3Q 주전 -> 4Q 주전 위주)
    let nStart;
    if (el < 7) nStart = 5;
    else if (el < 10) nStart = 3;
    else if (el < 14) nStart = 2;
    else if (el < 20) nStart = 4;
    else if (el < 27) nStart = 5;
    else if (el < 31) nStart = 3;
    else nStart = 4;
    // 스코어 보정: 추격전이면 주전 투입, 크게 이기면 주전 휴식
    if (trailing && margin >= 6 && el >= 24) nStart = Math.min(5, nStart + 1);
    if (trailing && margin >= 10 && el >= 30) nStart = 5;
    if (!trailing && margin >= 15 && el < 34) nStart = Math.max(1, nStart - 2);
    nStart = Math.min(nStart, starters.length);
    // 어떤 주전을 쉬게 할까: 피로 큰 순으로 휴식 (지금 코트에 있으면 약간의 관성 부여 = 교체 남발 방지)
    const stickiness = (p) => (T.court && T.court.includes(p) ? -4 : 0);
    const overT = (p) => Math.max(0, p.min - p.target) * 3; // 목표 플레이타임 초과 시 휴식 우선
    const stPick = [...starters]
      .sort((a, b) => (a.fatigue + overT(a) + stickiness(a) + (a.pf >= 4 ? 200 : 0) + (a.min >= CAP ? 100 : 0))
                    - (b.fatigue + overT(b) + stickiness(b) + (b.pf >= 4 ? 200 : 0) + (b.min >= CAP ? 100 : 0)))
      .slice(0, nStart);
    const bnPick = [...bench]
      .sort((a, b) => ((b.target - b.min) - b.fatigue * 0.2 - stickiness(b) * -1) - ((a.target - a.min) - a.fatigue * 0.2 - stickiness(a) * -1))
      .slice(0, 5 - stPick.length);
    five = [...stPick, ...bnPick];
    if (five.length < 5) {
      const fill = pool.filter((p) => !five.includes(p)).sort((a, b) => b.ovr - a.ovr);
      while (five.length < 5 && fill.length) five.push(fill.shift());
    }
  }
  // 트윈 타워 작전: 빅맨(PF/C) 2명 이상 동시 기용 보장
  if (T.pb && T.pb.off.twoBigs && mode !== "garbage") {
    const isBig = (p) => p.pos === "PF" || p.pos === "C";
    while (five.filter(isBig).length < 2) {
      const cand = pool.filter((p) => isBig(p) && !five.includes(p) && p.pf < 5).sort((a, b) => b.ovr - a.ovr)[0];
      if (!cand) break;
      const drop = [...five].reverse().find((p) => !isBig(p));
      if (!drop) break;
      five[five.indexOf(drop)] = cand;
    }
  }
  // 수비 매치업용 슬롯 배정: 주포지션 > 보조포지션 > 잔여
  const court = [];
  const remaining = [...five];
  for (const pos of positions) {
    if (!remaining.length) break;
    let idx = remaining.findIndex((p) => p.pos === pos);
    if (idx < 0) idx = remaining.findIndex((p) => p.posList.includes(pos));
    if (idx < 0) idx = 0;
    court.push(remaining.splice(idx, 1)[0]);
  }
  T.court = court;
  return mode;
}

function setLineup(T, mode) { // 하위 호환 래퍼
  return setLineupSmart(T, { elapsed: 20, margin: 0, trailing: false, forceMode: mode !== "normal" ? mode : null });
}
function replaceOnCourt(T, player) {
  const idx = T.court.indexOf(player);
  if (idx < 0) return;
  const bench = T.players.filter((p) => !p.out && !T.court.includes(p));
  if (!bench.length) { T.court.splice(idx, 1); return; }
  bench.sort((a, b) => (b.target - b.min - b.fatigue * 0.15) - (a.target - a.min - a.fatigue * 0.15));
  T.court[idx] = bench[0];
}

function teamPace(T) {
  const top = T.players.slice(0, 8);
  const spd = top.reduce((s, p) => s + attrOf(p.ref, "속도", 70), 0) / (top.length || 1);
  return 67.5 + (spd - 72) * 0.25 + ((T.pb && T.pb.off.pace) || 0); // 속도 + 작전 페이스
}

function foulTarget(def, defender) {
  if (Math.random() < 0.75) return defender;
  const others = def.filter((p) => p !== defender);
  if (!others.length) return defender;
  // 더티플레이(히든) 높은 선수가 파울을 더 자주 범한다
  return pickWeighted(others, (p) => (p.pos === "PF" || p.pos === "C" ? 1.2 : 1) * Math.max(0.2, 1 - p.pf * 0.2) * (0.7 + ((p.dirty || 10) / 20) * 0.6));
}

function chargeFoul(D, defender, ctx) {
  defender.pf += 1;
  if (ctx && ctx.events) ctx.events.push({ t: "foul", p: defender.id, q: ctx.q, clock: ctx.clock, team: D.id, li: ctx.pbp.length });
  // 경고/퇴장 멘트는 지연 큐에 넣어 파울 상황 설명(자유투 등) "뒤"에 자연스럽게 나오게 한다
  const defer = (msg) => { (ctx.defer = ctx.defer || []).push(`${ctx.q}Q ${ctx.clock} ${msg}`); };
  if (defender.pf === 2 && Math.random() < 0.3) {
    defer(`${defender.name} 선수, 벌써 2번째 파울입니다`);
  } else if (defender.pf === 3 && Math.random() < 0.6) {
    defer(`${defender.name} 선수, 3번째 파울! 파울 관리가 필요해 보입니다`);
  }
  if (defender.pf >= 5) {
    defender.out = true;
    defer(`${D.shortName || D.name} ${defender.name}, 5반칙 퇴장입니다`);
    replaceOnCourt(D, defender);
  } else if (defender.pf === 4) {
    // 4반칙 파울 트러블: 즉시 벤치 보호 (클러치 라인업에서는 다시 투입될 수 있음)
    if (Math.random() < 0.5) defer(`${D.shortName || D.name} ${defender.name}, 4반칙 파울 트러블로 잠시 벤치로 물러납니다`);
    replaceOnCourt(D, defender);
  }
}

function shootFT(T, shooter, n, ctx, addPts) {
  if (ctx && ctx.events) ctx.events.push({ t: "ft", p: shooter.id, n, q: ctx.q, clock: ctx.clock, team: T.id, li: ctx.pbp.length });
  // 클러치 상황 자유투: 강심장(히든)에 따라 ±4%
  const clutchFt = ctx && ctx.lastMode === "clutch" ? (shooter.clutch || 0) * 2 : 0;
  const p = Math.max(0.5, Math.min(0.92, 0.55 + (attrOf(shooter.ref, "자유투", 65) - 50) * 0.006 + clutchFt));
  let made = 0;
  let lastMade = false;
  for (let i = 0; i < n; i += 1) {
    shooter.fta += 1;
    lastMade = Math.random() < p;
    if (lastMade) { shooter.ftm += 1; shooter.pts += 1; addPts(T, 1); made += 1; }
  }
  return { made, lastMade };
}

function maybeAssist(off, shooter, prob) {
  // 매의 눈/관제탑 보유 팀은 패스 게임 빈도 증가
  if (off.some((p) => p !== shooter && (badgeOf(p, "hawkeye") || badgeOf(p, "tower")))) prob += 0.045;
  // 팀워크(히든) 좋은 라인업은 볼이 잘 돈다
  const tw = off.reduce((s, p) => s + (p.teamwork || 10), 0) / (off.length || 1);
  prob += (tw - 10) * 0.004;
  if (Math.random() >= prob) return null;
  const mates = off.filter((p) => p !== shooter);
  if (!mates.length) return null;
  // 메인 볼핸들러에게 어시스트 집중 (패스정확도 지수 가중) + 플레이메이킹 뱃지 + 팀워크 가중
  const assister = pickWeighted(mates, (p) => Math.pow(Math.max(1, attrOf(p.ref, "패스정확도", 50) - 45), 2.1) * (badgeOf(p, "hawkeye") ? 2 : 1) * (badgeOf(p, "tower") ? 2.5 : 1) * (0.7 + ((p.teamwork || 10) / 20) * 0.6));
  assister.ast += 1;
  return assister;
}

// 한글 조사 처리 (받침 유무)
function josa(name, withBatchim, without) {
  const ch = name.charCodeAt(name.length - 1);
  if (ch >= 0xac00 && ch <= 0xd7a3) return (ch - 0xac00) % 28 > 0 ? withBatchim : without;
  return without;
}

// 중계 문구 랜덤 선택
function pickPhrase(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function runPossession(T, D, ctx) {
  maybeInjury(T, ctx); // 공격 팀 기준 판정 (양 팀이 번갈아 공격하므로 모두 검사됨)
  const off = T.court, def = D.court;
  if (!off.length || !def.length) return;
  const flushDefer = () => { while (ctx.defer && ctx.defer.length) { if (ctx.pbp.length >= 1400) { ctx.defer.length = 0; break; } ctx.pbp.push(ctx.defer.shift()); } };
  const log = (msg) => { if (ctx.pbp.length < 1400) ctx.pbp.push(`${ctx.q}Q ${ctx.clock} ${msg}`); flushDefer(); };
  // 구조화 이벤트 (바둑판 중계 등 시각화가 동일 소스를 재생할 수 있도록 기록)
  const evPush = (o) => { if (ctx.events) ctx.events.push({ ...o, q: ctx.q, clock: ctx.clock, team: T.id, li: ctx.pbp.length }); };
  flushDefer(); // 이전 포제션에서 넘어온 멘트 정리
  const addPts = (team, n) => {
    if (team.isHome) ctx.scores.home += n; else ctx.scores.away += n;
    // 득점 런 추적 -> 8-0 이상이면 상대 감독 작전타임
    if (ctx.run && ctx.run.team === team.id) ctx.run.pts += n;
    else ctx.run = { team: team.id, pts: n, called: false };
    if (ctx.run.pts >= 8 && !ctx.run.called && Math.random() < 0.6) {
      ctx.run.called = true;
      const side = team.isHome ? "away" : "home";
      // 라이브 모드의 유저 팀은 타임아웃을 직접 관리하므로 자동 호출 제외. 잔여 횟수가 있어야만 호출 가능
      if (side !== ctx.userSide && (!ctx.timeouts || ctx.timeouts[side] > 0)) {
        const other = team.isHome ? ctx.awayShort : ctx.homeShort;
        const dq = (ctx.defer = ctx.defer || []);
        let left = "";
        if (ctx.timeouts) {
          ctx.timeouts[side] -= 1;
          left = ` (잔여 ${ctx.timeouts[side]}회)`;
          const oppT = ctx.teams && ctx.teams[side];
          if (oppT) oppT.court.forEach((p) => { p.fatigue = Math.max(0, p.fatigue - 2.5); }); // 짧은 휴식 효과
        }
        dq.push(`${ctx.q}Q ${ctx.clock} ⏸ ${other} 감독, 상대의 ${ctx.run.pts}-0 흐름을 끊기 위해 작전타임을 요청합니다${left}`);
        dq.push(`${ctx.q}Q ${ctx.clock} ` + pickPhrase([
          `${other} 감독이 변화를 줍니다. 수비 매치업을 조정하는 모습입니다`,
          `${other} 벤치, 작전판이 바쁘게 움직입니다. 공격 패턴에 변화를 지시합니다`,
          `${other} 감독, 선수들을 불러모아 수비 로테이션을 다시 정리합니다`,
        ]));
        ctx.run = { team: team.id, pts: 0, called: false }; // 작전타임으로 득점 런이 끊긴 것으로 처리
      }
    }
    // ── 점수차/런 상황 멘트 ──
    const h = ctx.scores.home, aw = ctx.scores.away;
    const margin = Math.abs(h - aw);
    const leadShort = h === aw ? null : (h > aw ? ctx.homeShort : ctx.awayShort);
    const scoredShort = team.isHome ? ctx.homeShort : ctx.awayShort;
    const scoredLeading = (team.isHome && h > aw) || (!team.isHome && aw > h);
    const say = (m) => { (ctx.defer = ctx.defer || []).push(`${ctx.q}Q ${ctx.clock} ${m}`); };
    if (ctx.run.pts >= 10 && !ctx.run.big) {
      ctx.run.big = true;
      say(pickPhrase([`${scoredShort}, 벌써 ${ctx.run.pts}-0 런을 달립니다!`, `무서운 기세! ${scoredShort}${josa(scoredShort, "이", "가")} ${ctx.run.pts}점을 내리 몰아칩니다!`]));
    }
    ctx.peak = Math.max(ctx.peak || 0, margin);
    if (scoredLeading && margin >= 10 && !ctx.said10) {
      ctx.said10 = true;
      say(pickPhrase([`점수차가 두 자릿수로 벌어집니다`, `${leadShort}${josa(leadShort, "이", "가")} ${margin}점차로 달아납니다`]));
    }
    if (margin < 8) ctx.said10 = false;
    if (scoredLeading && margin >= 20 && !ctx.said20) {
      ctx.said20 = true;
      say(`${margin}점차, 완전히 ${leadShort}의 페이스입니다`);
    }
    if (margin < 16) ctx.said20 = false;
    if (!scoredLeading && ctx.peak >= 12 && margin <= 6 && !ctx.saidChase) {
      ctx.saidChase = true;
      say(margin === 0
        ? `${ctx.peak}점차까지 벌어졌던 경기가 원점으로! 동점입니다!`
        : `${ctx.peak}점차까지 벌어졌던 경기, ${scoredShort}${josa(scoredShort, "이", "가")} ${margin}점차까지 따라붙습니다!`);
      ctx.peak = margin;
    }
    if (margin >= 12) ctx.saidChase = false;
    if (ctx.q === 4 && !scoredLeading && margin === 3 && !ctx.saidTie3) {
      ctx.saidTie3 = true;
      say(`이제 3점 한 번이면 동점입니다`);
    }
    if (margin > 5) ctx.saidTie3 = false;
  };
  const scoreStr = () => `(${ctx.scores.home}:${ctx.scores.away})`;
  const tName = T.shortName || T.name;
  const dName = D.shortName || D.name;
  // 피로 페널티: 피로 20 초과분만큼 성공률 하락 (피로 45면 -10%)
  const fatigueFactor = (pl) => 1 - Math.max(0, pl.fatigue - 20) * 0.004;
  // 경기 감각 페널티: 중립값(70) 밑으로 떨어진 만큼 성공률 하락 (감각 0이면 -35%). 안 뛰어서 녹슨 선수용.
  const sharpnessFactor = (pl) => 1 - Math.max(0, 70 - (pl.sharpness ?? 70)) * 0.005;
  // 히든 멘탈 보정: 오늘의 폼(꾸준함) + 클러치 상황(강심장) + 플레이오프 무대(큰경기)
  const mentalAdj = (sh) => (sh.form || 0)
    + (ctx.lastMode === "clutch" ? (sh.clutch || 0) : 0)
    + (ctx.playoff ? (sh.bigGame || 0) : 0);
  // 득점 마일스톤 (10점 단위 돌파 시 콜)
  const milestone = (p, before) => {
    if (p.pts >= 10 && Math.floor(p.pts / 10) > Math.floor(before / 10)) {
      log(pickPhrase([
        `${p.name} 선수, 벌써 ${p.pts}득점째입니다!`,
        `${p.name}, 오늘 ${p.pts}득점! 뜨거운 손끝입니다`,
      ]));
    }
  };
  const dunkable = (p) => Math.max(attrOf(p.ref, "드라이빙덩크", 40), attrOf(p.ref, "스탠딩덩크", 40)) >= 75;

  // 뱃지 보정: 공격자 뱃지 + 매치업 수비수 뱃지
  const bAdj = (type, sh, dfd) => {
    let v = 0;
    if (type === "drive") {
      if (badgeOf(sh, "acrobat")) v += 0.05;
      if (badgeOf(sh, "poster")) v += 0.04;
      if (badgeOf(sh, "ankle") && sh === handler) v += 0.05; // 아이솔레이션 돌파
      if (badgeOf(sh, "allout")) v += 0.02;
      if (badgeOf(dfd, "spider")) v -= 0.03;
    } else if (type === "rim") {
      if (badgeOf(sh, "riseup")) v += 0.05;
      if (badgeOf(sh, "postplay")) v += 0.05;
      if (badgeOf(sh, "machine")) v += 0.04;
      if (badgeOf(sh, "allin")) v += 0.02;
      if (badgeOf(dfd, "swatter")) v -= 0.04;
    } else if (type === "three") {
      if (badgeOf(sh, "sharpshooter")) v += 0.035;
      if (badgeOf(sh, "deep")) v += 0.02;
      if (badgeOf(sh, "allout")) v += 0.02;
      if (badgeOf(dfd, "spider")) v -= 0.03;
    } else {
      if (badgeOf(sh, "machine")) v += 0.05;
      if (badgeOf(sh, "postplay")) v += 0.04;
      if (badgeOf(sh, "allin")) v += 0.02;
      if (badgeOf(dfd, "spider")) v -= 0.02;
    }
    return v;
  };

  // 작전에 따른 슛 성공률 보정 (공격 작전 + 상대 수비 작전)
  const shotAdj = (type, sh) => {
    let adj = 0;
    const opb = T.pb.off, dpb = D.pb.def;
    if (opb.openBonus) adj += opb.openBonus; // 모션 오펜스: 오픈샷
    if (opb.postBonus && type === "rim") adj += opb.postBonus; // 인사이드 아웃: 포스트 숙련
    if (opb.spacing) { // 머니볼: 슈터진 좋으면 스페이싱, 나쁘면 난사
      if (type !== "three") adj += T.three8 >= 72 ? 0.03 : 0.01;
      else if (T.three8 < 70) adj -= 0.02;
    }
    if (opb.duoBonus && T.duoIds.has(sh.id) && type !== "three") adj += opb.duoBonus; // 픽앤롤 듀오
    if (dpb.oppRim && (type === "rim" || type === "drive")) adj += dpb.oppRim; // 2-3존/3-2존 골밑
    if (dpb.opp3 && type === "three") adj += dpb.opp3; // 존 수비 3점
    if (dpb.aceShot && sh.id === T.aceId) adj += dpb.aceShot; // 박스앤원: 에이스 봉쇄
    if (dpb.othersShot && sh.id !== T.aceId) adj += dpb.othersShot; // 나머지는 편해짐
    return adj;
  };

  // ── 볼 핸들러 & 턴오버 ──
  const handler = pickWeighted(off, (p) => Math.max(2, attrOf(p.ref, "볼핸들링") * 0.9 + attrOf(p.ref, "패스정확도") * 0.7 - 75));
  evPush({ t: "poss", handler: handler.id }); // 포제션 시작 + 볼 핸들러 (바둑판: 아웃렛 -> 드리블 업 연출)
  evPush({ t: "ball", p: handler.id });
  const defSteal = def.reduce((s, p) => s + attrOf(p.ref, "스틸", 50), 0) / def.length;
  const spiderOnD = def.some((p) => badgeOf(p, "spider"));
  const pTo = Math.max(0.12, Math.min(0.27, 0.175 + (spiderOnD ? 0.012 : 0) + (D.pb.def.oppTo || 0) + (T.pb.off.to || 0) + (70 - attrOf(handler.ref, "볼핸들링")) * 0.0011 + (defSteal - 62) * 0.0012));
  if (Math.random() < pTo) {
    handler.to += 1;
    evPush({ t: "to", p: handler.id });
    if (Math.random() < 0.55) {
      const stealer = pickWeighted(def, (p) => Math.max(1, attrOf(p.ref, "스틸", 45) - 40) * (badgeOf(p, "spider") ? 1.7 : 1));
      stealer.stl += 1;
      evPush({ t: "steal", p: stealer.id, defSide: true });
      if (Math.random() < 0.45 + (D.pb.off.fastbreak || 0) + (def.some((p) => badgeOf(p, "lightning")) ? 0.12 : 0)) { // 속공 득점
        const finisher = Math.random() < 0.6 ? stealer : pickWeighted(def, (p) => attrOf(p.ref, "속도", 65) * (badgeOf(p, "lightning") ? 1.6 : 1));
        const before = finisher.pts;
        finisher.fgm += 1; finisher.fga += 1; finisher.pts += 2;
        evPush({ t: "fastbreak", p: finisher.id, defSide: true });
        addPts(D, 2);
        if (finisher === stealer) {
          log(`${stealer.name}, 패스를 가로챕니다! 그대로 혼자 달려가 ${dunkable(finisher) && Math.random() < 0.4 ? "원맨 덩크!" : "속공 마무리!"} ${scoreStr()}`);
        } else {
          log(`${stealer.name} 스틸! 길게 보내줍니다... ${finisher.name} 선수가 받아서 ${dunkable(finisher) && Math.random() < 0.4 ? "그대로 덩크!" : "가볍게 마무리합니다"} ${scoreStr()}`);
        }
        milestone(finisher, before);
        return;
      }
      log(pickPhrase([
        `${handler.name}, 패스가 끊깁니다! ${stealer.name}의 스틸`,
        `${stealer.name}, ${handler.name}의 공을 걷어냅니다! 턴오버`,
        `${stealer.name}의 손이 빨랐습니다! ${handler.name}, 공을 빼앗깁니다`,
      ]));
    } else if (Math.random() < 0.4) {
      log(pickPhrase([
        `${handler.name} 선수, 공을 흘립니다. 아까운 턴오버`,
        `${tName} ${handler.name}, 패스 미스가 나옵니다`,
        `${handler.name}의 패스가 라인을 벗어납니다. 턴오버`,
      ]));
    }
    return;
  }

  // ── 수비 오프볼 파울 (자유투 없는 팀파울) ──
  if (Math.random() < 0.12 + (D.pb.def.foul || 0)) {
    const fouler = pickWeighted(def, (p) => (p.pos === "PF" || p.pos === "C" ? 1.3 : 1) * Math.max(0.2, 1 - p.pf * 0.22) * (0.7 + ((p.dirty || 10) / 20) * 0.6));
    chargeFoul(D, fouler, ctx);
    log(pickPhrase([
      `휘슬! ${fouler.name}${josa(fouler.name, "이", "가")} 오프더볼 파울을 범합니다`,
      `${fouler.name}의 스크린 수비 파울이 선언됩니다`,
    ]));
  }

  // ── 슛 시퀀스 (오펜스 리바운드 세컨찬스 최대 2회) ──
  let entered = false; // 엔트리 패스 비트가 이미 나왔는지 (중복 "투입" 멘트 방지)
  let shooter = pickWeighted(off, (p) => {
    let w = Math.pow(Math.max(3, p.atk - 55), T.pb.off.usageFlat ? 1.25 : 1.6) * (p.foreign ? 1.25 : 1) * (p.pos === "PG" || p.pos === "SG" ? 0.95 : 1);
    if (T.pb.off.aceUsage && p.id === T.aceId) w *= T.pb.off.aceUsage;       // 히어로 볼
    if (T.pb.off.duoUsage) w *= T.duoIds.has(p.id) ? T.pb.off.duoUsage : (T.pb.off.otherUsage || 1); // 픽앤롤
    if (D.pb.def.aceUsage && p.id === T.aceId) w *= D.pb.def.aceUsage;       // 박스 앤 원
    return w;
  });
  let putback = false;

  for (let chance = 0; chance < 3; chance += 1) {
    // 매치업: 같은 슬롯 수비수, 20%는 스위치
    const sIdx = Math.max(0, off.indexOf(shooter));
    let defender = def[Math.min(sIdx, def.length - 1)] || def[0];
    if (!putback && Math.random() < 0.2) defender = def[Math.floor(Math.random() * def.length)];
    const hDiff = shooter.height - defender.height;
    const spdDiff = attrOf(shooter.ref, "속도", 70) - attrOf(defender.ref, "속도", 70);
    const a = (k, d) => attrOf(shooter.ref, k, d);
    const dA = (k, d) => attrOf(defender.ref, k, d);
    const homeEdge = T.isHome ? 0.012 : 0;

    // 슛 타입 선택: 3점 / 돌파 / 골밑·포스트 / 미드레인지 (현대농구: 포스트 비중 소폭 하향)
    const posW3 = { PG: 1.15, SG: 1.25, SF: 1.0, PF: 0.62, C: 0.35 }[shooter.pos] || 1;
    const posWD = { PG: 1.1, SG: 1.0, SF: 0.8, PF: 0.35, C: 0.2 }[shooter.pos] || 0.5;
    const posWR = { PG: 0.5, SG: 0.5, SF: 0.9, PF: 1.15, C: 1.28 }[shooter.pos] || 1;
    let w3 = putback ? 0 : Math.max(0, a("3점슛", 50) - 42) * 1.7 * posW3; // 현대 농구 3점 볼륨 (리그 평균 시도 ~25개 목표)
    let wD = putback ? 0 : Math.max(0, a("드라이빙레이업", 50) - 45) * posWD;
    let wR = Math.max(3, a("근거리슛", 55) * 0.6 + a("포스트컨트롤", 50) * 0.4 - 40) * posWR;
    let wM = putback ? 0 : Math.max(0, a("중거리슛", 55) - 45) * 0.5;
    const opw = T.pb.off;
    if (opw.w3) w3 *= opw.w3; if (opw.wD) wD *= opw.wD; if (opw.wR) wR *= opw.wR; if (opw.wM) wM *= opw.wM;
    if (spdDiff > 8) wD *= 1.4;                          // 느린 수비수 = 돌파 타겟
    if (hDiff > 6 && shooter.pos !== "PG") wR *= 1.25;   // 작은 수비수 = 포스트업 타겟
    const roll = Math.random() * (w3 + wD + wR + wM);
    const kind = roll < w3 ? "three" : roll < w3 + wD ? "drive" : roll < w3 + wD + wR ? "rim" : "mid";

    // ── 빌드업 비트: 볼 전개 -> 스윙 패스 -> 오프볼 액션(컷인/킥아웃/엔트리/페이크) -> 슛 ──
    if (!putback && chance === 0) {
      const mates = off.filter((p) => p !== shooter && p !== handler);
      const via = mates.length ? mates[Math.floor(Math.random() * mates.length)] : null;
      const bigsOff = off.filter((p) => (p.pos === "PF" || p.pos === "C") && p !== shooter);
      const cutter = bigsOff.length ? bigsOff[Math.floor(Math.random() * bigsOff.length)] : null;
      // 1) 볼 전개
      if (handler !== shooter && Math.random() < 0.65) {
        evPush({ t: "dribble", p: handler.id });
        log(pickPhrase([
          `${handler.name}, 볼을 가지고 하프코트를 넘어옵니다. 천천히 전개하네요`,
          `${handler.name}${josa(handler.name, "이", "가")} 경기를 조율합니다. 선수들이 활발하게 움직이고 있어요`,
          `${handler.name}, 수비 배치를 살피며 어디로 볼을 보낼지 고릅니다`,
        ]));
      }
      // 2) 스윙 패스 (경유) — 실제로 거쳐간 경우만 이후 패서가 될 수 있음
      let viaUsed = false;
      if (via && Math.random() < 0.5) {
        viaUsed = true;
        evPush({ t: "pass", from: handler.id, to: via.id });
        log(pickPhrase([
          `${via.name}에게 한 번 거쳐갑니다. 볼이 반대편 사이드로 이동`,
          `${handler.name}의 패스, ${via.name}${josa(via.name, "이", "가")} 받아 다시 기회를 봅니다`,
        ]));
      }
      // 3) 마무리 직전 액션 (슛 타입에 맞는 시나리오)
      if (kind === "three" && cutter && Math.random() < 0.55) {
        const passer = viaUsed && Math.random() < 0.5 ? via : handler;
        evPush({ t: "cut", p: cutter.id });
        log(pickPhrase([
          `이때 ${cutter.name}의 컷인! ${passer.name}${josa(passer.name, "이", "가")} 안쪽으로 찔러줍니다`,
          `${cutter.name}${josa(cutter.name, "이", "가")} 골밑으로 파고들며 수비를 끌어당깁니다`,
        ]));
        evPush({ t: "kickout", from: cutter.id, to: shooter.id });
        log(pickPhrase([
          `수비 높이에 막혀 ${cutter.name}${josa(cutter.name, "이", "가")} 주저합니다... 외곽에 홀로 선 ${shooter.name}${josa(shooter.name, "을", "를")} 발견! 킥아웃`,
          `골밑이 닫혀 있어요. 다시 바깥 ${shooter.name}에게 빠져나오는 패스!`,
        ]));
      } else if ((kind === "rim" || kind === "drive") && handler !== shooter && Math.random() < 0.6) {
        const passer = viaUsed ? via : handler;
        evPush({ t: "entry", from: passer.id, to: shooter.id });
        entered = true;
        log(pickPhrase([
          `${shooter.name}${josa(shooter.name, "이", "가")} 자리를 잡자 볼이 투입됩니다`,
          `${passer.name}, 타이밍을 재다가 ${shooter.name}에게 정확히 넣어줍니다`,
        ]));
        if (Math.random() < 0.35) {
          evPush({ t: "fake", p: shooter.id });
          log(pickPhrase([
            `${shooter.name}, 슛 페이크! ${defender.name}${josa(defender.name, "이", "가")} 살짝 뜹니다`,
            `${shooter.name}${josa(shooter.name, "이", "가")} 한 번 흔들어 놓고 틈을 노립니다`,
          ]));
        }
      } else if (handler !== shooter && Math.random() < 0.55) {
        const passer = viaUsed ? via : handler;
        evPush({ t: "pass", from: passer.id, to: shooter.id });
        log(pickPhrase([
          `${passer.name}, 스크린을 받아 나온 ${shooter.name}${josa(shooter.name, "을", "를")} 찾아냅니다`,
          `${passer.name}의 패스가 ${shooter.name}에게 이어집니다`,
        ]));
      } else if (handler === shooter && Math.random() < 0.4) {
        evPush({ t: "iso", p: shooter.id });
        log(pickPhrase([
          `${shooter.name}, 직접 해결하려 합니다. ${defender.name}${josa(defender.name, "과", "와")} 일대일`,
          `${shooter.name}${josa(shooter.name, "이", "가")} 볼을 오래 소유하며 틈을 엿봅니다`,
        ]));
      }
    }

    let made = false;
    let ftAfter = 0;
    let shotPts = 2;
    let blocked = false;
    let shotKind = "rim";
    let moveDesc = ""; // 기술 이름 (결과 멘트에 활용)

    if (kind === "three") {
      // ── 3점 ──
      shooter.tpa += 1; shooter.fga += 1;
      shotPts = 3;
      shotKind = "three";
      const stepback = a("볼핸들링", 50) >= 76 && Math.random() < 0.25;
      moveDesc = stepback ? "스텝백 3점" : "3점";
      log(stepback
        ? pickPhrase([
            `${shooter.name}, 스텝백! ${defender.name}${josa(defender.name, "을", "를")} 떨궈내고 3점 라인 뒤에서 슛!`,
            `현란한 드리블에 이은 스텝백 3점! ${shooter.name}!`,
          ])
        : pickPhrase([
            `${tName} ${shooter.name}, ${defender.name} 앞에서 3점 라인 바깥... 쏩니다!`,
            `${shooter.name} 선수, 외곽에서 과감하게 3점 시도!`,
            `캐치 앤 슛! ${shooter.name}의 3점이 올라갑니다`,
            `${shooter.name}, 코너에서 기다렸다는 듯 3점!`,
          ]));
      if (Math.random() < 0.012) {
        defender.blk += 1;
        blocked = true;
        evPush({ t: "block", p: defender.id, defSide: true });
        log(`${defender.name}${josa(defender.name, "이", "가")} 손끝으로 쳐냅니다! 3점 블록!`);
      } else {
        const p3 = Math.max(0.18, Math.min(0.47, 0.29 + (a("3점슛", 50) - 70) * 0.0042 - (dA("외곽수비", 55) - 70) * 0.0022 - Math.max(0, hDiff * -1) * 0.001 + homeEdge + shotAdj("three", shooter) + bAdj("three", shooter, defender) + mentalAdj(shooter)));
        made = Math.random() < p3 * fatigueFactor(shooter) * sharpnessFactor(shooter) + (1 - fatigueFactor(defender)) * 0.04;
        if (made) shooter.tpm += 1;
        if (!made && Math.random() < 0.025) { ftAfter = 3; chargeFoul(D, foulTarget(def, defender), ctx); }
      }
    } else if (kind === "drive") {
      // ── 돌파 ──
      shotKind = "drive";
      const crossover = a("볼핸들링", 50) >= 78 && Math.random() < 0.3;
      const euro = a("드라이빙레이업", 50) >= 78 && Math.random() < 0.3;
      moveDesc = crossover ? "크로스오버 돌파" : euro ? "유로스텝" : "돌파";
      log(crossover
        ? `현란한 크로스오버! ${defender.name}${josa(defender.name, "이", "가")} 중심을 잃습니다! ${shooter.name}, 그대로 돌파!`
        : euro
          ? `${shooter.name}, 리듬을 끊는 유로스텝! 수비 사이를 파고듭니다`
          : pickPhrase([
              `${tName} ${shooter.name} 선수, ${defender.name}${josa(defender.name, "을", "를")} 앞에 두고 돌파를 시도합니다`,
              spdDiff > 8 ? `${shooter.name}, 스피드로 ${defender.name}${josa(defender.name, "을", "를")} 완전히 제칩니다! 림으로!` : `${shooter.name}, 과감하게 페인트존을 파고듭니다`,
              `${shooter.name}의 드라이브! ${defender.name}${josa(defender.name, "이", "가")} 따라붙습니다`,
            ]));
      const pD = Math.max(0.28, Math.min(0.62,
        0.42 + (a("드라이빙레이업", 50) - 70) * 0.0045 + Math.max(0, spdDiff) * 0.005
        - (dA("외곽수비", 55) - 70) * 0.002 - Math.max(0, -hDiff) * 0.004 + homeEdge + shotAdj("drive", shooter) + bAdj("drive", shooter, defender) + mentalAdj(shooter)));
      const rimProt = Math.random() < 0.45 ? defender : pickWeighted(def, (p) => Math.max(2.5, attrOf(p.ref, "블록", 45) - 40) + Math.max(0, p.height - 195) * 0.6);
      shooter.fga += 1;
      if (Math.random() < Math.max(0.01, Math.min(0.15, (badgeOf(rimProt, "swatter") ? 0.02 : 0) + 0.03 + (D.pb.def.blk || 0) + (attrOf(rimProt.ref, "블록", 45) - 70) * 0.0018 + Math.max(0, rimProt.height - shooter.height) * 0.003))) {
        rimProt.blk += 1;
        blocked = true;
        evPush({ t: "block", p: rimProt.id, defSide: true });
        log(rimProt === defender ? `${rimProt.name}${josa(rimProt.name, "이", "가")} 그대로 쳐냅니다! 블록!` : `헬프 온 ${rimProt.name}! 엄청난 블록이 나옵니다!`);
      } else {
        made = Math.random() < pD * fatigueFactor(shooter) * sharpnessFactor(shooter) + (1 - fatigueFactor(defender)) * 0.04;
        const pFoulD = Math.max(0.1, Math.min(0.38, 0.24 + (a("드라이빙레이업", 50) - 68) * 0.003));
        if (Math.random() < pFoulD * (made ? 0.35 : 1)) {
          chargeFoul(D, foulTarget(def, defender), ctx);
          if (made) { ftAfter = 1; }
          else { ftAfter = 2; shooter.fga -= 1; }
        }
      }
    } else if (kind === "rim") {
      // ── 골밑/포스트 ──
      shotKind = "rim";
      const hook = a("포스트컨트롤", 50) >= 74 && Math.random() < 0.28;
      const fade = a("포스트컨트롤", 50) >= 70 && a("중거리슛", 50) >= 65 && Math.random() < 0.22;
      const spin = a("포스트컨트롤", 50) >= 76 && Math.random() < 0.22;
      moveDesc = hook ? "훅슛" : fade ? "페이더웨이" : spin ? "스핀무브" : "골밑슛";
      if (!putback) {
        log(hook
          ? `${shooter.name}, ${defender.name}${josa(defender.name, "을", "를")} 등지고 자리를 잡습니다... 훅슛!`
          : fade
            ? `${shooter.name}, 포스트업에서 뒤로 물러나며 페이더웨이!`
            : spin
              ? `${shooter.name}, 포스트업으로 밀고 들어가다 스핀무브! ${defender.name}${josa(defender.name, "이", "가")} 놓칩니다!`
              : entered
                ? pickPhrase([
                    `${shooter.name}, ${defender.name}${josa(defender.name, "을", "를")} 등지고 한 번, 두 번 밀어붙입니다... 올라갑니다!`,
                    `${shooter.name}, 수비를 어깨로 누르며 슛 동작!`,
                  ])
                : pickPhrase([
                  hDiff > 6 ? `${shooter.name}, 작은 ${defender.name}${josa(defender.name, "과", "와")}의 미스매치! 골밑을 공략합니다` : `${tName} ${shooter.name}, ${defender.name}${josa(defender.name, "을", "를")} 등지고 밀고 들어갑니다`,
                  `${shooter.name} 선수, 골밑 깊숙이 자리를 잡습니다`,
                  `볼이 골밑 ${shooter.name}에게 투입됩니다`,
                ]));
      } else {
        log(pickPhrase([`${shooter.name}, 곧바로 다시 올라갑니다!`, `${shooter.name}, 세컨찬스! 다시 림을 노립니다`]));
      }
      const rimP = Math.max(0.3, Math.min(0.72,
        0.475 + (a("근거리슛", 55) - 70) * 0.0042 + (a("포스트컨트롤", 50) - 70) * 0.001
        - (dA("골밑수비", 55) - 70) * 0.0028 - Math.max(0, -hDiff) * 0.007
        + Math.max(0, spdDiff - 8) * 0.004 + homeEdge + shotAdj("rim", shooter) + bAdj("rim", shooter, defender) + mentalAdj(shooter)));
      const blocker = pickWeighted(def, (p) => Math.max(2.5, attrOf(p.ref, "블록", 45) - 40) + Math.max(0, p.height - 195) * 0.6);
      const pBlk = Math.max(0.01, Math.min(0.2, (0.045 + (D.pb.def.blk || 0) + (attrOf(blocker.ref, "블록", 45) - 70) * 0.002 + Math.max(0, blocker.height - shooter.height) * 0.004) * (D.pb.off.ownBlk || 1) * (badgeOf(blocker, "swatter") ? 1.4 : 1)));
      shooter.fga += 1;
      if (Math.random() < pBlk) {
        blocker.blk += 1;
        blocked = true;
        evPush({ t: "block", p: blocker.id, defSide: true });
        log(pickPhrase([`${blocker.name}, 엄청난 블록! ${shooter.name}의 슛을 지워버립니다!`, `${blocker.name}${josa(blocker.name, "이", "가")} 통째로 걷어냅니다! 강력한 블록!`]));
      } else {
        made = Math.random() < rimP * fatigueFactor(shooter) * sharpnessFactor(shooter) + (1 - fatigueFactor(defender)) * 0.04;
        const posFoulAdj = { PG: 0.07, SG: 0.06, SF: 0.02, PF: -0.02, C: -0.03 }[shooter.pos] || 0;
        const pFoul = Math.max(0.06, Math.min(0.34, 0.21 + ((a("드라이빙레이업", 50) + a("포스트컨트롤", 50)) / 2 - 68) * 0.0025 + posFoulAdj));
        if (Math.random() < pFoul * (made ? 0.35 : 1)) {
          chargeFoul(D, foulTarget(def, defender), ctx);
          if (made) { ftAfter = 1; }
          else { ftAfter = 2; shooter.fga -= 1; }
        }
      }
    } else {
      // ── 미드레인지 ──
      shotKind = "mid";
      shooter.fga += 1;
      const fadeM = a("중거리슛", 50) >= 76 && Math.random() < 0.22;
      moveDesc = fadeM ? "페이더웨이 점퍼" : "미드레인지 점퍼";
      log(fadeM
        ? `${shooter.name}, 수비를 등지고... 페이더웨이 점퍼!`
        : pickPhrase([
            `${tName} ${shooter.name}, ${defender.name} 너머로 미드레인지 점퍼!`,
            `${shooter.name} 선수, 풀업 점퍼 올라갑니다`,
            `${shooter.name}, 엘보 지점에서 점프슛!`,
            `한 번의 드리블로 공간을 만든 ${shooter.name}, 점퍼!`,
          ]));
      const pJumpBlk = Math.max(0.02, Math.min(0.1, 0.045 + (dA("블록", 40) - 55) * 0.0012 + Math.max(0, -hDiff) * 0.003));
      if (Math.random() < pJumpBlk) {
        defender.blk += 1;
        blocked = true;
        evPush({ t: "block", p: defender.id, defSide: true });
        log(`${defender.name}${josa(defender.name, "이", "가")} 그대로 쳐냅니다! 점퍼 블록!`);
      } else {
        const pM = Math.max(0.25, Math.min(0.55, 0.365 + (a("중거리슛", 55) - 70) * 0.004 - (dA("외곽수비", 55) - 70) * 0.002 + homeEdge + shotAdj("mid", shooter) + bAdj("mid", shooter, defender) + mentalAdj(shooter)));
        made = Math.random() < pM * fatigueFactor(shooter) * sharpnessFactor(shooter) + (1 - fatigueFactor(defender)) * 0.04;
        if (!made && Math.random() < 0.02) { ftAfter = 2; shooter.fga -= 1; chargeFoul(D, foulTarget(def, defender), ctx); }
      }
    }

    evPush({ t: "shot", p: shooter.id, kind: shotKind, pts: shotPts, made, blocked });
    if (made) {
      const before = shooter.pts;
      shooter.fgm += 1; shooter.pts += shotPts; addPts(T, shotPts);
      const assister = putback ? null : maybeAssist(off, shooter, (shotPts === 3 ? 0.82 : 0.58) + (T.pb.off.assist || 0));
      if (assister) evPush({ t: "assist", p: assister.id });
      const isDunk = (putback || shotKind === "drive" || (shotKind === "rim" && moveDesc === "골밑슛")) && dunkable(shooter)
        && Math.random() < 0.15 + (badgeOf(shooter, "poster") && shotKind === "drive" ? 0.3 : 0) + (badgeOf(shooter, "riseup") && (putback || shotKind === "rim") ? 0.25 : 0);
      let line;
      if (putback) {
        line = pickPhrase([
          `${shooter.name}, 다시 잡아서 ${isDunk ? "그대로 풋백 덩크!" : "풋백! 세컨찬스 득점입니다"}`,
          `살려낸 공, ${shooter.name}${josa(shooter.name, "이", "가")} 다시 넣어줍니다`,
        ]);
      } else if (isDunk) {
        line = pickPhrase([`그대로 내리꽂습니다! 강력한 덩크!`, `원핸드 덩크로 마무리! 림이 흔들립니다!`, `수비를 제치고 호쾌한 슬램덩크!`]);
      } else if (shotPts === 3) {
        line = pickPhrase([`들어갑니다! 3점!`, `깨끗하게 꽂힙니다! 3점포!`, `손끝을 떠난 공, 그대로 네트를 가릅니다!`, `${moveDesc} 성공! 완벽한 궤적입니다`]);
      } else {
        line = pickPhrase([`들어갑니다!`, `성공! 부드럽게 림을 통과합니다`, `침착하게 마무리합니다`, `${moveDesc} 성공!`]);
      }
      if (assister && Math.random() < 0.6) line += ` (${assister.name}의 어시스트)`;
      if (ftAfter) line += ` 파울까지 얻어냅니다, 앤드원!`;
      log(`${line} ${scoreStr()}`);
      milestone(shooter, before);
      if (ftAfter) {
        const beforeFt = shooter.pts;
        const ft = shootFT(T, shooter, ftAfter, ctx, addPts);
        log(`보너스 자유투 ${ft.made ? "성공" : "실패"} ${scoreStr()}`);
        milestone(shooter, beforeFt);
      }
      return;
    }

    if (!blocked && !ftAfter) {
      log(pickPhrase(
        shotKind === "three" ? [`3점슛, 림을 돌아 나옵니다`, `아, 3점은 짧습니다`, `외곽포가 불발됩니다`, `3점, 림을 외면합니다`]
        : shotKind === "drive" ? [`레이업이 림을 벗어납니다`, `아, 마무리가 아쉽습니다`, `수비 견제에 레이업이 빗나갑니다`]
        : shotKind === "rim" ? [`골밑슛, 들어가지 않습니다`, `림에서 튕겨 나옵니다!`, `아, 마무리가 아쉽습니다`]
        : [`점퍼가 림을 외면합니다`, `짧습니다, 들어가지 않아요`, `아깝게 림을 돌아 나옵니다`]));
    }

    if (ftAfter) {
      log(`${shooter.name}, 파울을 얻어내고 자유투 라인에 섭니다`);
      const beforeFt = shooter.pts;
      const ft = shootFT(T, shooter, ftAfter, ctx, addPts);
      log(ft.made === 0 ? `자유투를 모두 놓칩니다 (0/${ftAfter}) ${scoreStr()}` : `자유투 ${ft.made}/${ftAfter} 성공 ${scoreStr()}`);
      milestone(shooter, beforeFt);
      if (ft.lastMade) return;
      log(`마지막 자유투가 빗나갑니다! 리바운드 싸움`);
    }

    // ── 리바운드 경합 ──
    const rebScore = (list, key) => list.reduce((s, p) => s + (Math.max(1, attrOf(p.ref, key, 45) - 45) + Math.max(0, p.height - 190) * 0.8) * (badgeOf(p, "glass") ? 1.45 : 1), 0);
    const offR = rebScore(off, "공격리바운드") * (T.pb.off.oreb || 1);
    const defR = rebScore(def, "수비리바운드") * 1.35 * (D.pb.off.ownDreb || 1);
    const pOreb = Math.max(0.16, Math.min(0.38, offR / (offR + defR)));
    if (Math.random() < pOreb && chance < 2) {
      const rb = pickWeighted(off, (p) => (Math.max(1, attrOf(p.ref, "공격리바운드", 45) - 40) + Math.max(0, p.height - 190)) * (badgeOf(p, "glass") ? 1.5 : 1) * (shotKind === "three" && p === shooter ? 0.12 : 1));
      rb.oreb += 1;
      evPush({ t: "oreb", p: rb.id });
      log(pickPhrase([`오펜스 리바운드! ${rb.name}!`, `${rb.name}${josa(rb.name, "이", "가")} 끈질기게 살려냅니다!`]));
      if (Math.random() < 0.55) { shooter = rb; putback = true; }
      else {
        shooter = pickWeighted(off, (p) => Math.pow(Math.max(3, p.atk - 55), 1.6));
        putback = false;
        if (Math.random() < 0.4) log(`다시 바깥으로 빼줍니다. 공격 재시작`);
      }
      continue;
    }
    const drb = pickWeighted(def, (p) => (Math.max(1, attrOf(p.ref, "수비리바운드", 50) - 40) + Math.max(0, p.height - 190)) * (badgeOf(p, "glass") ? 1.5 : 1));
    drb.dreb += 1;
    evPush({ t: "dreb", p: drb.id, defTeam: true });
    log(pickPhrase([`${drb.name}의 리바운드`, `리바운드는 ${dName} ${drb.name}${josa(drb.name, "이", "가")} 걷어냅니다`, `${drb.name}${josa(drb.name, "이", "가")} 안전하게 확보합니다`]));
    return;
  }
}

function matchOpening(H, A, pbp) {
  const styleDesc = {
    inside: "골밑을 집요하게 두드리는 정통 농구",
    morey: "쉴 새 없이 3점을 쏘아대는 화력전",
    hero: "에이스에게 볼을 몰아주는 농구",
    pns: "빠른 템포에 코트를 넓게 쓰는 현대 농구",
    run: "잡히는 대로 달리는 폭주 기관차 농구",
    motion: "볼이 쉬지 않고 도는 아름다운 패스 농구",
    pnr: "날카로운 2대2 픽앤롤 게임",
    twin: "두 명의 빅맨을 앞세운 높이의 농구",
  };
  const teamInfo = (T) => {
    let streak = 0, leader = null, best = 0;
    try {
      if (typeof state !== "undefined" && state && state.schedule) {
        const games = state.schedule.filter((g) => g.played && (g.home === T.id || g.away === T.id));
        for (let i = games.length - 1; i >= 0; i -= 1) {
          const g = games[i];
          const won = (g.home === T.id) === (g.homeScore > g.awayScore);
          if (streak === 0) streak = won ? 1 : -1;
          else if (streak > 0 && won) streak += 1;
          else if (streak < 0 && !won) streak -= 1;
          else break;
        }
        for (const s of Object.values(state.playerStats || {})) {
          if (s.team === T.id && s.g >= 3 && s.pts / s.g > best) { best = s.pts / s.g; leader = s; }
        }
      }
    } catch (e) { /* 시즌 데이터 없으면 기본 소개만 */ }
    T.prevStreak = streak; // 엔딩 멘트에서 사용
    return { streak, leader, best };
  };
  const teamIntroLine = (T, info, isHome) => {
    const opener = isHome
      ? pickPhrase([`먼저 홈팀 ${T.shortName}입니다`, `홈팀 ${T.shortName}부터 살펴보죠`])
      : pickPhrase([`맞서는 원정팀 ${T.shortName}입니다`, `상대는 원정길에 나선 ${T.shortName}`]);
    const parts = [];
    if (info.leader && info.best >= 15) {
      parts.push(pickPhrase([
        `평균 ${info.best.toFixed(1)}득점을 올리고 있는 ${info.leader.name}${josa(info.leader.name, "이", "가")} 공격을 이끌고 있고요`,
        `역시 경기당 ${info.best.toFixed(1)}득점의 에이스 ${info.leader.name}${josa(info.leader.name, "을", "를")} 주목해야 합니다`,
      ]));
    }
    const sd = styleDesc[T.pb.offKey] || "자신들의 농구";
    parts.push(`오늘은 '${T.pb.off.name}' — ${sd}${josa(sd, "을", "를")} 예고했습니다`);
    if (info.streak >= 3) parts.push(pickPhrase([
      `최근 ${info.streak}연승, 분위기가 아주 좋습니다`,
      `${info.streak}연승의 상승세를 오늘까지 이어갈 수 있을지 주목됩니다`,
    ]));
    else if (info.streak <= -3) parts.push(pickPhrase([
      `다만 최근 ${-info.streak}연패, 오늘은 반드시 반등이 필요한 시점입니다`,
      `${-info.streak}연패의 부진을 끊어내야 하는 절박한 상황이죠`,
    ]));
    return `${opener}. ${parts.join(". ")}.`;
  };
  const infoH = teamInfo(H), infoA = teamInfo(A);
  const homeCity = H.shortName.split(" ")[0];
  pbp.push(pickPhrase([
    `안녕하십니까! ${homeCity} 홈 팬들의 함성이 가득한 이곳에서 인사드립니다. ${H.shortName}${josa(H.shortName, "과", "와")} ${A.shortName}의 맞대결, 잠시 후 시작됩니다!`,
    `농구 팬 여러분, 안녕하십니까! 오늘은 ${H.shortName}의 홈, ${homeCity}에서 ${A.shortName}${josa(A.shortName, "을", "를")} 불러들였습니다`,
  ]));
  pbp.push(teamIntroLine(H, infoH, true));
  pbp.push(teamIntroLine(A, infoA, false));
  pbp.push(pickPhrase([
    `양 팀 선수들이 코트에 들어섭니다. 경기 시작하겠습니다!`,
    `장내 아나운서의 선수 소개가 끝났습니다. 심판의 토스와 함께 점프볼, 경기 시작됩니다!`,
  ]));
}

function matchEnding(H, A, ctx, pbp) {
  const win = ctx.scores.home > ctx.scores.away ? H : A;
  const lose = win === H ? A : H;
  pbp.push(`— 경기 종료: ${H.shortName} ${ctx.scores.home} : ${ctx.scores.away} ${A.shortName} —`);
  const st = win.prevStreak || 0;
  if (st <= -2) pbp.push(`${win.shortName}, 오늘 승리로 ${-st}연패를 마감합니다`);
  else if (st >= 2) pbp.push(`${win.shortName}, 오늘 승리로 ${st + 1}연승을 달립니다!`);
  const effOf = (p) => p.pts + (p.oreb + p.dreb) * 1.2 + p.ast * 1.5 + p.stl * 2 + p.blk * 2 - p.to;
  const mvp = [...win.players].filter((p) => p.min > 0).sort((a, b) => effOf(b) - effOf(a))[0];
  if (mvp) {
    pbp.push(`오늘은 ${mvp.name}(${mvp.pts}점 ${mvp.oreb + mvp.dreb}리바운드 ${mvp.ast}어시스트)의 활약으로 ${win.shortName}${josa(win.shortName, "이", "가")} 승리를 가져갑니다`);
    if (effOf(mvp) >= 38) pbp.push(`${mvp.name}, 오늘 활약은 그야말로 MVP급이었습니다`);
  }
  const ace = lose.players.find((p) => p.id === lose.aceId);
  if (ace && ace.min >= 20 && ace.pts <= 10) {
    pbp.push(`반면 ${lose.shortName}의 ${ace.name}${josa(ace.name, "은", "는")} ${ace.pts}득점에 그치며 기대에 미치지 못했습니다`);
  }
}

// ===== AI 전술 카운터: 쿼터가 끝날 때 경기 흐름을 읽고 AI 팀이 작전을 바꾼다 =====
// T = 작전을 조정하는 팀, O = 상대 팀. 유저가 조작하는 팀은 건드리지 않는다.
function aiCounterTactics(T, O, ctx) {
  if (typeof state !== "undefined" && state && T.id === state.selectedTeamId) return;
  const q = typeof ctx.q === "number" ? ctx.q : 5;
  if (q >= 5) return; // 연장은 현재 작전 유지
  const my = T.isHome ? ctx.scores.home : ctx.scores.away;
  const opp = T.isHome ? ctx.scores.away : ctx.scores.home;
  if (Math.abs(my - opp) >= 20) return; // 승부가 기운 경기는 그대로 진행
  const say = (m) => { if (ctx.pbp.length < 1400) ctx.pbp.push(`— ${m} —`); };
  const setDef = (key) => { T.pb.def = PLAYBOOKS.def[key]; T.pb.defKey = key; };
  const setOff = (key) => { T.pb.off = PLAYBOOKS.off[key]; T.pb.offKey = key; };
  // 4쿼터를 앞두고 10점차 이상 뒤지면 승부수: 풀코트 프레스 + 화력전
  if (q === 3 && my <= opp - 10 && T.pb.defKey !== "press") {
    setDef("press");
    setOff(T.three8 >= 72 ? "morey" : "run");
    say(`${T.shortName} 벤치, 승부수를 띄웁니다! '풀코트 프레스'에 '${T.pb.off.name}' 공격으로 총력 추격에 나섭니다`);
    return;
  }
  if (Math.random() > 0.55) return; // 매 쿼터 바꾸지는 않는다
  const oPl = O.players;
  const o3 = oPl.reduce((s, p) => s + p.tpm, 0);
  const oFt = oPl.reduce((s, p) => s + p.ftm, 0);
  const paint = opp - o3 * 3 - oFt; // 2점 야투 득점 근사치
  const ace = oPl.find((p) => p.id === O.aceId);
  if (ace && ace.pts >= 7 * q && ace.pts >= opp * 0.38 && T.pb.defKey !== "box1") {
    setDef("box1");
    say(`${T.shortName}, 혼자 ${ace.pts}점을 몰아넣은 ${ace.name}에게 '박스 앤 원' 전담 마크를 붙입니다`);
  } else if (o3 >= 3 * q + 2 && T.pb.defKey !== "zone32") {
    setDef("zone32");
    say(`상대 3점이 벌써 ${o3}개. ${T.shortName}${josa(T.shortName, "이", "가")} '3-2 지역방어'로 외곽 봉쇄에 나섭니다`);
  } else if (paint >= 14 * q && T.pb.defKey !== "zone23") {
    setDef("zone23");
    say(`골밑에서만 ${paint}실점. ${T.shortName}${josa(T.shortName, "이", "가")} '2-3 지역방어'로 페인트존을 걸어 잠급니다`);
  }
}

function toBoxTeam(T) {
  return T.players
    .filter((p) => p.min > 0)
    .sort((a, b) => b.min - a.min)
    .map((p) => ({
      id: p.id, name: p.name, pos: p.pos, min: Math.round(p.min),
      pts: p.pts, reb: p.oreb + p.dreb, oreb: p.oreb, dreb: p.dreb,
      ast: p.ast, stl: p.stl, blk: p.blk,
      fgm: p.fgm, fga: p.fga, tpm: p.tpm, tpa: p.tpa, ftm: p.ftm, fta: p.fta,
      to: p.to, pf: p.pf, pm: p.pm,
      // 경기 후 체력(컨디션) 소모량: 출전시간 x 체력 능력치 보정 (app이 state.playerCondition에 반영)
      drain: Math.round(p.min * (0.72 - ((p.stamina || 72) - 70) * 0.006) * 10) / 10,
    }));
}

function playMatch(homeId, awayId, dleague) {
  const H = makeMatchTeam(homeId, true, dleague);
  const A = makeMatchTeam(awayId, false, dleague);
  const pbp = [];
  // KBL 규정: 전반 2회, 후반 3회, 연장 각 1회 추가 (런 발생 시 자동 작전타임에서 차감)
  const ctx = { scores: { home: 0, away: 0 }, pbp, q: 1, clock: "10:00", homeShort: H.shortName, awayShort: A.shortName, run: null, events: [], timeouts: { home: 2, away: 2 }, teams: { home: H, away: A }, playoff: typeof state !== "undefined" && state && state.phase === "playoff" };
  // 교체 확인 로그
  const logSubs = (T) => {
    const ids = new Set(T.court.map((p) => p.id));
    if (ctx.events) { // 바둑판 중계용 라인업 이벤트 (구성 변경 시)
      const arr = T.court.map((p) => p.id);
      const prev = T.prevIds ? [...T.prevIds].join(",") : "";
      if (prev !== arr.join(",")) ctx.events.push({ t: "lineup", team: T.id, ids: arr, q: ctx.q, clock: ctx.clock, li: ctx.pbp.length });
    }
    if (T.prevIds && ctx.pbp.length < 1400) {
      const ins = T.court.filter((p) => !T.prevIds.has(p.id)).map((p) => p.name);
      const outs = [...T.prevIds].filter((id) => !ids.has(id)).map((id) => (T.players.find((p) => p.id === id) || {}).name).filter(Boolean);
      if (ins.length) ctx.pbp.push(`${ctx.q}Q — ${T.shortName} 교체: ${ins.join(", ")} IN / ${outs.join(", ")} OUT —`);
    }
    T.prevIds = ids;
  };
  const possPerTeam = Math.max(58, Math.round((teamPace(H) + teamPace(A)) / 2 + randomBetween(-2, 2)));
  const perSeg = Math.max(6, Math.round(possPerTeam / 8));

  // 출전시간 가중치: 깊은 벤치(목표 4분 이하, 11~12번째 로테이션)는 잠깐만 코트 소화 -> 경기당 1~3분
  const minWeight = new Map();
  const wOf = (p) => {
    if (!minWeight.has(p.id)) minWeight.set(p.id, p.target <= 4.6 ? 0.3 + Math.random() * 0.25 : 1 + (Math.random() * 0.5 - 0.25));
    return minWeight.get(p.id);
  };
  // 포제션 단위 정산: 출전시간/득실마진/피로를 그 순간 코트에 있는 선수에게 기록
  // (세그먼트 도중 5반칙 퇴장·교체가 있어도 실제 뛴 만큼만 반영된다)
  const creditPossession = (T, diff, minutes, segTotal, otMode) => {
    const sign = T.isHome ? 1 : -1;
    const wSum = T.court.reduce((s, p) => s + wOf(p), 0) || 1;
    T.court.forEach((p) => { p.min += (minutes * T.court.length / segTotal) * (wOf(p) / wSum); p.pm += diff * sign; });
    T.players.forEach((pl) => {
      if (T.court.includes(pl)) {
        const base = otMode
          ? Math.max(4, 6.5 - (pl.stamina - 70) * 0.05) // 연장은 더 힘듦
          : Math.max(3, 5.5 - (pl.stamina - 70) * 0.05) * (T.pb.off.fatigue || 1) * (T.pb.def.fatigue || 1) * (T.pb.off.aceFatigue && pl.id === T.aceId ? T.pb.off.aceFatigue : 1);
        pl.fatigue += base / segTotal;
      } else pl.fatigue = Math.max((pl.baseFatigue || 0) * 0.5, pl.fatigue - 6 / segTotal); // 벤치 휴식으로도 당일 컨디션 저하는 다 못 지움
    });
  };

  const runSegment = (segInQuarter, minutes) => {
    const margin = Math.abs(ctx.scores.home - ctx.scores.away);
    const elapsed = ((typeof ctx.q === "number" ? ctx.q : 5) - 1) * 10 + segInQuarter * 5;
    const homeTrail = ctx.scores.home < ctx.scores.away;
    const modeH = setLineupSmart(H, { elapsed, margin, trailing: homeTrail });
    const modeA = setLineupSmart(A, { elapsed, margin, trailing: !homeTrail && margin > 0 });
    const mode = modeH === "clutch" || modeA === "clutch" ? "clutch" : modeH === "garbage" || modeA === "garbage" ? "garbage" : "normal";
    if (mode !== ctx.lastMode && ctx.pbp.length < 1400) {
      if (mode === "clutch") ctx.pbp.push(`${ctx.q}Q — 승부처! 양 팀 에이스 라인업 투입 —`);
      if (mode === "garbage") ctx.pbp.push(`${ctx.q}Q — 승부가 기울며 벤치 멤버들이 코트에 나섭니다 —`);
    }
    ctx.lastMode = mode;
    logSubs(H); logSubs(A);
    for (let k = 0; k < perSeg; k += 1) {
      const remainSec = Math.max(1, Math.round((2 - segInQuarter) * 300 - ((k + 0.5) / perSeg) * 300));
      ctx.clock = `${String(Math.floor(remainSec / 60)).padStart(2, "0")}:${String(remainSec % 60).padStart(2, "0")}`;
      const before = { h: ctx.scores.home, a: ctx.scores.away };
      runPossession(H, A, ctx);
      runPossession(A, H, ctx);
      const diff = (ctx.scores.home - before.h) - (ctx.scores.away - before.a);
      creditPossession(H, diff, minutes, perSeg, false);
      creditPossession(A, diff, minutes, perSeg, false);
    }
  };

  matchOpening(H, A, pbp);

  for (let q = 1; q <= 4; q += 1) {
    ctx.q = q;
    runSegment(0, 5);
    runSegment(1, 5);
    if (ctx.defer && ctx.defer.length) { ctx.defer.forEach((l) => { if (pbp.length < 1400) pbp.push(l); }); ctx.defer.length = 0; }
    if (pbp.length < 1400) pbp.push(`— ${q}쿼터 종료 (${ctx.scores.home}:${ctx.scores.away}) —`);
    if (q === 2) ctx.timeouts = { home: 3, away: 3 }; // 후반전 타임아웃 리셋
    if (q < 4) { aiCounterTactics(H, A, ctx); aiCounterTactics(A, H, ctx); }
  }

  // 연장전 (5분, 최대 3차)
  let ot = 0;
  while (ctx.scores.home === ctx.scores.away && ot < 3) {
    ot += 1;
    ctx.q = `연장${ot}`;
    ctx.timeouts.home += 1; ctx.timeouts.away += 1; // 연장 각 1회 추가
    setLineup(H, "clutch"); setLineup(A, "clutch"); // 연장은 에이스 총력전
    const otSeg = Math.round(perSeg * 0.9);
    for (let k = 0; k < otSeg; k += 1) {
      ctx.clock = "OT";
      const before = { h: ctx.scores.home, a: ctx.scores.away };
      runPossession(H, A, ctx);
      runPossession(A, H, ctx);
      const diff = (ctx.scores.home - before.h) - (ctx.scores.away - before.a);
      creditPossession(H, diff, 5, otSeg, true);
      creditPossession(A, diff, 5, otSeg, true);
    }
    if (pbp.length < 1400) pbp.push(`— 연장 ${ot}차 종료 (${ctx.scores.home}:${ctx.scores.away}) —`);
  }
  if (ctx.scores.home === ctx.scores.away) ctx.scores.home += 1; // 3연장에도 동점이면 홈승 처리

  matchEnding(H, A, ctx, pbp);

  return { homeScore: ctx.scores.home, awayScore: ctx.scores.away, homeBox: toBoxTeam(H), awayBox: toBoxTeam(A), pbp, ot, injuries: ctx.injuries || [] };
}

// ===== 라이브 매치: 포제션 단위 스텝 실행 (실시간 경기 화면용) =====
// playMatch와 같은 엔진/멘트를 쓰되, UI가 step()을 호출할 때마다 한 포제션 쌍씩 진행된다.
function createLiveMatch(homeId, awayId, userSide) {
  const H = makeMatchTeam(homeId, true);
  const A = makeMatchTeam(awayId, false);
  const pbp = [];
  const ctx = { scores: { home: 0, away: 0 }, pbp, q: 1, clock: "10:00", homeShort: H.shortName, awayShort: A.shortName, run: null, events: [], playoff: typeof state !== "undefined" && state && state.phase === "playoff" };
  const possPerTeam = Math.max(58, Math.round((teamPace(H) + teamPace(A)) / 2 + randomBetween(-2, 2)));
  const perSeg = Math.max(6, Math.round(possPerTeam / 8));

  matchOpening(H, A, pbp);

  const lm = {
    H, A, ctx, pbp, userSide: userSide || null,
    auto: true,               // 유저 팀 자동 교체 여부 (AI 팀은 항상 자동)
    q: 1, seg: 0, k: -1, ot: 0,
    done: false, finished: null,
    timeouts: { home: 2, away: 2 }, // KBL 규정: 전반 2회, 후반 3회, 연장 각 1회 추가
    lastRead: 0,
    perSeg, // UI의 실시간 시계-스텝 동기화용
  };
  // 런 발생 시 자동 작전타임이 실제 잔여 횟수를 차감하도록 연결 (유저 팀은 직접 관리하므로 제외)
  ctx.timeouts = lm.timeouts;
  ctx.teams = { home: H, away: A };
  ctx.userSide = lm.userSide;
  const userTeam = () => (lm.userSide === "home" ? H : lm.userSide === "away" ? A : null);
  const segPoss = () => (lm.q > 4 ? Math.max(4, Math.round(perSeg * 0.9)) : perSeg);
  const flushDefer = () => { if (ctx.defer && ctx.defer.length) { ctx.defer.forEach((l) => { if (pbp.length < 1400) pbp.push(l); }); ctx.defer.length = 0; } };
  const logSubs = (T) => {
    const ids = new Set(T.court.map((p) => p.id));
    if (ctx.events) { // 바둑판 중계용 라인업 이벤트 (구성 변경 시)
      const arr = T.court.map((p) => p.id);
      const prev = T.prevIds ? [...T.prevIds].join(",") : "";
      if (prev !== arr.join(",")) ctx.events.push({ t: "lineup", team: T.id, ids: arr, q: ctx.q, clock: ctx.clock, li: ctx.pbp.length });
    }
    if (T.prevIds && pbp.length < 1400) {
      const ins = T.court.filter((p) => !T.prevIds.has(p.id)).map((p) => p.name);
      const outs = [...T.prevIds].filter((id) => !ids.has(id)).map((id) => (T.players.find((p) => p.id === id) || {}).name).filter(Boolean);
      if (ins.length) pbp.push(`${ctx.q}Q — ${T.shortName} 교체: ${ins.join(", ")} IN / ${outs.join(", ")} OUT —`);
    }
    T.prevIds = ids;
  };
  const ensureFive = (T) => { // 수동 모드: 5반칙 퇴장 등 결원만 자동 보충
    T.court = T.court.filter((p) => !p.out);
    while (T.court.length < 5) {
      const sub = T.players.filter((p) => !p.out && !T.court.includes(p)).sort((a, b) => b.ovr - a.ovr)[0];
      if (!sub) break;
      T.court.push(sub);
    }
  };
  const segStart = () => {
    const margin = Math.abs(ctx.scores.home - ctx.scores.away);
    let mode = "normal";
    if (lm.q > 4) mode = "clutch";
    else if (lm.q === 4) {
      if (lm.seg === 1 && margin >= 15) mode = "garbage";
      else if (lm.seg === 0 && margin >= 22) mode = "garbage";
      else if (lm.seg === 1 && margin <= 8) mode = "clutch";
      else if (lm.seg === 0 && margin <= 4) mode = "clutch";
    }
    if (mode !== ctx.lastMode && pbp.length < 1400) {
      if (mode === "clutch") pbp.push(`${ctx.q}Q — 승부처! 에이스 라인업의 시간입니다 —`);
      if (mode === "garbage") pbp.push(`${ctx.q}Q — 승부가 기울며 벤치 멤버들이 코트에 나섭니다 —`);
    }
    ctx.lastMode = mode;
    const margin2 = Math.abs(ctx.scores.home - ctx.scores.away);
    const elapsed2 = lm.q > 4 ? 40 + (lm.ot - 1) * 5 : (lm.q - 1) * 10 + lm.seg * 5;
    [H, A].forEach((T) => {
      if (userTeam() === T && !lm.auto && T.court.length) { ensureFive(T); return; } // 수동: 유저 라인업 유지
      const trailing = T.isHome ? ctx.scores.home < ctx.scores.away : ctx.scores.away < ctx.scores.home;
      setLineupSmart(T, { elapsed: elapsed2, margin: margin2, trailing, forceMode: mode !== "normal" ? mode : null });
    });
    logSubs(H); logSubs(A);
  };
  const finishGame = () => {
    matchEnding(H, A, ctx, pbp);
    lm.done = true;
    lm.finished = { homeScore: ctx.scores.home, awayScore: ctx.scores.away, homeBox: toBoxTeam(H), awayBox: toBoxTeam(A), pbp, ot: lm.ot, injuries: ctx.injuries || [] };
  };
  lm.drain = () => { const l = pbp.slice(lm.lastRead); lm.lastRead = pbp.length; return l; };
  lm.step = () => {
    if (lm.done) return { done: true, boundary: "end", lines: lm.drain() };
    if (lm.k < 0) { segStart(); lm.k = 0; }
    const segTotal = segPoss();
    const remainSec = lm.q > 4
      ? Math.max(1, Math.round(300 - ((lm.k + 0.5) / segTotal) * 300))
      : Math.max(1, Math.round((2 - lm.seg) * 300 - ((lm.k + 0.5) / segTotal) * 300));
    ctx.clock = `${String(Math.floor(remainSec / 60)).padStart(2, "0")}:${String(remainSec % 60).padStart(2, "0")}`;
    const before = { h: ctx.scores.home, a: ctx.scores.away };
    runPossession(H, A, ctx);
    runPossession(A, H, ctx);
    const diff = (ctx.scores.home - before.h) - (ctx.scores.away - before.a);
    const stepMin = 5 / segTotal;
    [H, A].forEach((T) => {
      const sign = T === H ? 1 : -1;
      T.court.forEach((p) => { p.min += stepMin; p.pm += diff * sign; });
      T.players.forEach((pl) => {
        if (T.court.includes(pl)) pl.fatigue += (Math.max(3, 5.5 - (pl.stamina - 70) * 0.05) * (T.pb.off.fatigue || 1) * (T.pb.def.fatigue || 1) * (T.pb.off.aceFatigue && pl.id === T.aceId ? T.pb.off.aceFatigue : 1)) / segTotal;
        else pl.fatigue = Math.max((pl.baseFatigue || 0) * 0.5, pl.fatigue - 6 / segTotal); // 벤치 휴식으로도 당일 컨디션 저하는 다 못 지움
      });
    });
    lm.k += 1;
    // 쿼터 중반 수시 교체 체크 (약 4포제션 = 1.5~2분 간격, 자동 팀만)
    if (lm.k < segTotal && lm.k % 4 === 0) {
      const marginM = Math.abs(ctx.scores.home - ctx.scores.away);
      const elapsedM = (lm.q > 4 ? 40 + (lm.ot - 1) * 5 : (lm.q - 1) * 10 + lm.seg * 5) + (lm.k / segTotal) * 5;
      [H, A].forEach((T) => {
        if (userTeam() === T && !lm.auto) return;
        const trailing = T.isHome ? ctx.scores.home < ctx.scores.away : ctx.scores.away < ctx.scores.home;
        setLineupSmart(T, { elapsed: elapsedM, margin: marginM, trailing });
      });
      logSubs(H); logSubs(A);
    }
    let boundary = null;
    if (lm.k >= segTotal) {
      lm.k = -1;
      if (lm.q > 4) {
        flushDefer();
        if (pbp.length < 1400) pbp.push(`— 연장 ${lm.ot}차 종료 (${ctx.scores.home}:${ctx.scores.away}) —`);
        if (ctx.scores.home !== ctx.scores.away || lm.ot >= 3) {
          if (ctx.scores.home === ctx.scores.away) ctx.scores.home += 1;
          finishGame(); boundary = "end";
        } else {
          lm.ot += 1; lm.q += 1; ctx.q = `연장${lm.ot}`;
          lm.timeouts.home += 1; lm.timeouts.away += 1;
          if (pbp.length < 1400) pbp.push(`— 다시 연장전! ${lm.ot}차 연장 돌입 —`);
          boundary = "quarter";
        }
      } else {
        lm.seg += 1;
        if (lm.seg >= 2) {
          lm.seg = 0;
          flushDefer();
          if (pbp.length < 1400) pbp.push(`— ${lm.q}쿼터 종료 (${ctx.scores.home}:${ctx.scores.away}) —`);
          if (lm.q === 2) { lm.timeouts.home = 3; lm.timeouts.away = 3; if (pbp.length < 1400) pbp.push(`— 하프타임입니다. 후반전 타임아웃은 각 팀 3회 —`); }
          if (lm.q >= 4) {
            if (ctx.scores.home === ctx.scores.away) {
              lm.ot = 1; lm.q = 5; ctx.q = "연장1";
              lm.timeouts.home += 1; lm.timeouts.away += 1;
              if (pbp.length < 1400) pbp.push(`— 승부를 가리지 못했습니다! 연장전으로 갑니다 —`);
              boundary = "quarter";
            } else { finishGame(); boundary = "end"; }
          } else {
            aiCounterTactics(H, A, ctx); aiCounterTactics(A, H, ctx); // AI 팀은 쿼터 사이 상대 흐름에 대응
            lm.q += 1; ctx.q = lm.q;
            boundary = "quarter";
          }
        } else boundary = "segment";
      }
    }
    return { done: lm.done, boundary, lines: lm.drain() };
  };
  lm.callTimeout = (side) => {
    if (lm.done || lm.timeouts[side] <= 0) return false;
    lm.timeouts[side] -= 1;
    const T = side === "home" ? H : A;
    pbp.push(`${ctx.q}Q ${ctx.clock} ⏸ ${T.shortName}, 타임아웃을 요청합니다 (잔여 ${lm.timeouts[side]}회)`);
    ctx.run = null; // 상대 흐름 끊기
    T.court.forEach((p) => { p.fatigue = Math.max(0, p.fatigue - 2.5); }); // 짧은 휴식 효과
    return true;
  };
  lm.substitute = (side, outId, inId) => {
    const T = side === "home" ? H : A;
    const po = T.court.find((p) => p.id === outId);
    const pi = T.players.find((p) => p.id === inId && !p.out && !T.court.includes(p));
    if (!po || !pi) return false;
    T.court[T.court.indexOf(po)] = pi;
    T.prevIds = new Set(T.court.map((p) => p.id));
    pbp.push(`${ctx.q}Q ${ctx.clock} — ${T.shortName} 교체: ${pi.name} IN / ${po.name} OUT —`);
    return true;
  };
  lm.setTactics = (side, offKey, defKey) => {
    const T = side === "home" ? H : A;
    if (offKey && PLAYBOOKS.off[offKey]) { T.pb.off = PLAYBOOKS.off[offKey]; T.pb.offKey = offKey; }
    if (defKey && PLAYBOOKS.def[defKey]) { T.pb.def = PLAYBOOKS.def[defKey]; T.pb.defKey = defKey; }
    pbp.push(`${ctx.q}Q ${ctx.clock} — ${T.shortName}, 작전 변경: '${T.pb.off.name}' 공격 · '${T.pb.def.name}' 수비 —`);
    return true;
  };
  lm.fastForward = () => { let g = 0; while (!lm.done && g++ < 3000) lm.step(); return lm.finished; };
  return lm;
}