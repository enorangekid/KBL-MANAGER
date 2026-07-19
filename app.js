const teams = [
  { id: "kcc", name: "부산 KCC 이지스", city: "부산", color: "#14266f", colorName: "KCC Navy", strength: 77 },
  { id: "sono", name: "고양 소노 스카이거너스", city: "고양", color: "#78acd0", colorName: "Sono Sky", strength: 71 },
  { id: "lg", name: "창원 LG 세이커스", city: "창원", color: "#650000", colorName: "LG Wine", strength: 77 },
  { id: "redboosters", name: "안양 정관장 레드부스터스", city: "안양", color: "#e0002a", colorName: "Red Boost", strength: 76 },
  { id: "sk", name: "서울 SK 나이츠", city: "서울", color: "#ee002f", colorName: "SK Red", strength: 80 },
  { id: "db", name: "원주 DB 프로미", city: "원주", color: "#087a3d", colorName: "DB Green", strength: 78 },
  { id: "kt", name: "수원 KT 소닉붐", city: "수원", color: "#000000", colorName: "KT Black", strength: 72 },
  { id: "mobis", name: "울산 현대모비스 피버스", city: "울산", color: "#ed1710", colorName: "Mobis Red", strength: 74 },
  { id: "kogas", name: "대구 한국가스공사 페가수스", city: "대구", color: "#414ca0", colorName: "Pegasus Blue", strength: 73 },
  { id: "samsung", name: "서울 삼성 썬더스", city: "서울", color: "#135aa3", colorName: "Samsung Blue", strength: 70 },
];

// D리그(2군) 전용 팀. 1군 일정(10팀 라운드로빈)에는 영향 없이 별도로만 존재한다.
// 상무 농구단은 로스터/육성 미구상 상태의 껍데기 — 로스터가 채워지기 전까지는 D리그 일정에도 포함하지 않는다.
const DLEAGUE_EXTRA_TEAMS = [
  { id: "sangmu", name: "상무 농구단", city: "상무", color: "#ecb143", colorName: "Sangmu Gold", strength: 60 },
];

// 수신함 발신처 — 내부 보고서(report)와 외부 언론 기사(article)로 성격이 나뉜다.
// kind: "report" = 구단 내부 문서 톤(수신/발신/제목 형식), "article" = 언론 기사 톤(헤드라인/바이라인 형식)
const NEWS_SENDERS = {
  training: { label: "훈련 스탭", tag: "훈련 보고서", color: "#4f9dff", kind: "report" },
  medical: { label: "의무팀", tag: "의무팀 보고서", color: "#ff5a5a", kind: "report" },
  front: { label: "프런트진", tag: "구단 공지", color: "#9aa5b1", kind: "report" },
  marketing: { label: "마케팅진", tag: "마케팅 리포트", color: "#ffa53d", kind: "report" },
  scout: { label: "스카우트", tag: "스카우팅 리포트", color: "#57c07d", kind: "report" },
  sportsnews: { label: "KBL 스포츠뉴스", tag: "속보", color: "#c084fc", kind: "article" },
  press: { label: "언론사", tag: "기사", color: "#7fc5ff", kind: "article" },
  reporter: { label: "취재수첩", tag: "칼럼", color: "#e0b84f", kind: "article" },
};

function newsMetaOf(sender) {
  return NEWS_SENDERS[sender] || NEWS_SENDERS.front;
}

const rosterSeeds = {
  kcc: ["부산 에이스", "KCC 포인트가드", "이지스 슈터", "부산 포워드", "골밑 수호자", "식스맨 가드", "루키 윙", "백업 센터"],
  db: ["이선 알바노", "치나누 오누아쿠", "강상재", "김종규", "이용우", "오마리 스펠맨", "정효근", "박인웅"],
  sk: ["자밀 워니", "오재현", "안영준", "김선형", "최부경", "오세근", "워니 백업", "서울 유망주"],
  samsung: ["코피 코번", "저스틴 구탕", "이정현", "마커스 데릭슨", "임동섭", "삼성 식스맨", "서울 루키", "블루 가드"],
  lg: ["아셈 마레이", "두경민", "양홍석", "허일영", "전성현", "LG 식스맨", "창원 빅맨", "레드 가드"],
  sono: ["이정현", "앨런 윌리엄스", "케빈 켐바오", "임동섭", "고양 슈터", "소노 루키", "블루 윙", "백업 센터"],
  redboosters: ["캐디 라렌", "박지훈", "정효근", "안양 가드", "정관장 윙", "백업 포워드", "루키 센터", "수비 스페셜"],
  kt: ["레이션 해먼즈", "문정현", "박준영", "KT 가드", "수원 슈터", "백업 빅맨", "루키 윙", "벤치 리더"],
  kogas: ["앤드류 니콜슨", "유슈 은도예", "샘조세프 벨란겔", "신승민", "대구 슈터", "가스공사 가드", "백업 포워드", "루키 빅맨"],
  mobis: ["숀 롱", "게이지 프림", "현대모비스 가드", "울산 윙", "베테랑 슈터", "백업 센터", "루키 가드", "수비 윙"],
};

const positions = ["PG", "SG", "SF", "PF", "C"];

// 실제 로스터 기반 팀 전력 갱신
// - 주전 가중 평균: 에이스 비중을 크게 (단순 평균은 팀 간 격차가 묻힘)
// - 리그 평균 기준 편차 x2.2 확장: 강팀/약팀 구분이 체감되게
if (typeof KBL_REAL_ROSTERS !== "undefined") {
  const ROT_WEIGHTS = [1.6, 1.4, 1.25, 1.1, 1.0, 0.7, 0.5, 0.4];
  const SPREAD = 2.2;
  const weightedTop8 = (players, key) => {
    const vals = players
      .map((p) => Number(p[key]))
      .filter((v) => !isNaN(v))
      .sort((a, b) => b - a)
      .slice(0, 8);
    if (!vals.length) return null;
    let sum = 0, wsum = 0;
    vals.forEach((v, i) => { const w = ROT_WEIGHTS[i] || 0.4; sum += v * w; wsum += w; });
    return sum / wsum;
  };
  const rawByTeam = {};
  teams.forEach((team) => {
    const list = KBL_REAL_ROSTERS[team.id];
    if (!list || !list.length) return;
    rawByTeam[team.id] = {
      ovr: weightedTop8(list, "ovr"),
      atk: weightedTop8(list, "atk"),
      def: weightedTop8(list, "def"),
    };
  });
  const leagueMean = (key) => {
    const vals = Object.values(rawByTeam).map((r) => r[key]).filter((v) => v != null);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const means = { ovr: leagueMean("ovr"), atk: leagueMean("atk"), def: leagueMean("def") };
  const expand = (v, mean) => (v == null ? null : Math.round(Math.max(40, Math.min(99, mean + (v - mean) * SPREAD))));
  teams.forEach((team) => {
    const raw = rawByTeam[team.id];
    if (!raw) return;
    team.strength = expand(raw.ovr, means.ovr); // 종합
    team.attack = expand(raw.atk, means.atk);   // 공격력
    team.defense = expand(raw.def, means.def);  // 수비력
  });
}
const viewTitles = {
  dashboard: "홈",
  inbox: "수신함",
  roster: "선수단",
  lineup: "라인업",
  tactics: "전술실",
  schedule: "일정",
  league: "리그",
  records: "기록",
  office: "프런트",
  player: "선수 정보",
};

const managerAttributes = [
  { key: "tactics", label: "전술 이해" },
  { key: "training", label: "훈련 지도" },
  { key: "scouting", label: "스카우트" },
  { key: "analysis", label: "전력 분석" },
  { key: "negotiation", label: "협상력" },
  { key: "leadership", label: "리더십" },
  { key: "development", label: "선수 성장" },
  { key: "motivation", label: "동기 부여" },
];

const managerOrigins = [
  {
    id: "pro",
    name: "프로선수 출신",
    icon: "PRO",
    description: "라커룸 장악과 선수 동기 부여에 강한 현장형 매니저",
    attributes: { tactics: 58, training: 62, scouting: 44, analysis: 50, negotiation: 46, leadership: 68, development: 58, motivation: 70 },
  },
  {
    id: "entrepreneur",
    name: "기업가 출신",
    icon: "CEO",
    description: "예산, 협상, 구단 운영에 강한 프런트형 매니저",
    attributes: { tactics: 44, training: 42, scouting: 50, analysis: 56, negotiation: 74, leadership: 62, development: 46, motivation: 54 },
  },
  {
    id: "scout",
    name: "스카우트 출신",
    icon: "SCT",
    description: "유망주 발굴과 선수 잠재력 판단에 강한 탐색형 매니저",
    attributes: { tactics: 50, training: 48, scouting: 76, analysis: 62, negotiation: 48, leadership: 50, development: 66, motivation: 50 },
  },
  {
    id: "analyst",
    name: "전력분석가 출신",
    icon: "ANL",
    description: "상대 분석, 전술 조정, 경기 준비에 강한 데이터형 매니저",
    attributes: { tactics: 68, training: 50, scouting: 56, analysis: 78, negotiation: 42, leadership: 48, development: 54, motivation: 46 },
  },
  {
    id: "coach",
    name: "유소년 코치 출신",
    icon: "DEV",
    description: "훈련 설계와 장기 성장에 강한 육성형 매니저",
    attributes: { tactics: 56, training: 72, scouting: 54, analysis: 52, negotiation: 42, leadership: 56, development: 78, motivation: 62 },
  },
];

const defaultManager = () => ({
  name: "김감독",
  origin: "pro",
  attributes: { ...managerOrigins[0].attributes },
});

const defaultState = () => ({
  selectedTeamId: "db",
  day: 1,
  season: 1,
  phase: "regular", // regular | playoff | offseason
  playoffs: null,
  champion: null,
  teamStats: {},   // 정규시즌 팀 누적 기록
  playerStats: {}, // 정규시즌 선수 누적 기록
  poTeamStats: {},   // 플레이오프 팀 누적 기록
  poPlayerStats: {}, // 플레이오프 선수 누적 기록
  currentView: "dashboard",
  manager: defaultManager(),
  morale: 62,
  stamina: 84,
  budget: 120,
  tactics: {
    pace: 52,
    threePoint: 46,
    defense: 58,
  },
  playbook: null, // null = 팀 기본 작전(DEFAULT_PLAYBOOKS) 사용
  lineupConfig: null, // null = 추천 선발/로테이션 (선수단 탭에서 설정)
  minutesPlan: null, // null = 엔진 자동 배분, {playerId: 분} = 유저 플레이타임 배분 (총 200분)
  playerCondition: {}, // 선수별 체력(컨디션) 0~100. 경기 출전으로 소모, 휴식일마다 회복
  injuries: {},        // 선수별 현재 부상 { name, daysLeft, playerName, team, day }
  injuryHistory: {},   // 선수별 부상 이력 (시즌 전환에도 유지) { [pid]: [{ label, days, day, season }] }
  seasonHistory: [],   // 지난 시즌 아카이브 { season, champion, awards, standings, playerStats, poPlayerStats }
  careerStats: {},     // 선수별 통산 누적 (완료된 시즌 합산)
  training: {},        // 선수별 훈련 배정 { off, def, phys[] }
  devGrowth: {},        // 선수별 훈련 성장 누적 { caGained, attrs: {key: delta} }
  sharpness: {},        // 선수별 경기 감각 0~100 (미설정 시 중립값 70). 실전 출전으로 회복, 안 뛰면 매일 조금씩 하락
  dleagueRoster: {},      // D리그로 설정된 선수 { [playerId]: true } — 해당 선수는 1군 로스터에서 제외됨
  dleagueSchedule: buildDLeagueSchedule(),
  dleagueStandings: Object.fromEntries(
    teams.map((team) => [team.id, { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 }]),
  ),

  bgTheme: "gray", // gray | team — 게임 화면 배경 테마 (BG 아이콘으로 전환)

  // 수신함: 각 항목 { id, day, season, sender, title, body, read, priority, link }
  news: [
    {
      id: "seed-1", day: 1, season: 1, sender: "front",
      title: "시즌 운영 목표 정리", body: "프런트가 새 시즌 운영 목표를 정리했습니다.",
      read: false, priority: "normal", link: null,
    },
    {
      id: "seed-2", day: 1, season: 1, sender: "training",
      title: "주전 로테이션 점검 필요", body: "스태프 회의에서 주전 로테이션 점검이 필요하다는 의견이 나왔습니다.",
      read: false, priority: "normal", link: null,
    },
  ],
  newsSeq: 2, // 수신함 항목 고유 id 발급용 카운터
  inboxFilter: "all", // 탭바 필터: all | marketing | sportsnews | front | press | scout
  selectedNewsId: null, // 수신함에서 현재 펼쳐 본 항목
  standings: Object.fromEntries(
    teams.map((team) => [team.id, { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 }]),
  ),
  schedule: buildSchedule(),
});

let state = loadState();
let isStartScreenOpen = true;
let isTeamSelectOpen = false;
let isManagerSetupOpen = false;
let isCareerIntroOpen = false;
let careerIntroStep = 0;
let pendingTeamId = "kcc";
let pendingManager = defaultManager();

function buildSchedule() {
  // 정규시즌: 10팀 라운드로빈 6회 = 팀당 54경기, 리그 총 270경기 (서클 메서드)
  const ids = teams.map((team) => team.id);
  const fixed = ids[0];
  let rotation = ids.slice(1);
  const games = [];
  let day = 1;
  for (let cycle = 0; cycle < 6; cycle += 1) {
    for (let round = 0; round < 9; round += 1) {
      day += 2 + (round % 3 === 0 ? 1 : 0); // 경기일 간격 2~3일
      const lineup = [fixed, ...rotation];
      for (let k = 0; k < 5; k += 1) {
        let home = lineup[k];
        let away = lineup[9 - k];
        if ((cycle + round + k) % 2 === 1) { const t = home; home = away; away = t; } // 홈/원정 분산
        games.push({ day, home, away, played: false, homeScore: null, awayScore: null });
      }
      rotation = [rotation[rotation.length - 1], ...rotation.slice(0, -1)];
    }
  }
  return games;
}

// D리그(2군) 일정: 1군과 같은 10개 구단이 참가하는 별도 리그. 규모는 1군보다 작게 2회전(팀당 18경기)만 편성한다.
// 상무 농구단은 아직 로스터가 없는 껍데기라 이 일정에는 포함하지 않는다.
function buildDLeagueSchedule() {
  const ids = teams.map((team) => team.id);
  const fixed = ids[0];
  let rotation = ids.slice(1);
  const games = [];
  let day = 3; // 1군과 날짜가 겹치지 않게 살짝 오프셋
  for (let cycle = 0; cycle < 2; cycle += 1) {
    for (let round = 0; round < 9; round += 1) {
      day += 2 + (round % 3 === 0 ? 1 : 0);
      const lineup = [fixed, ...rotation];
      for (let k = 0; k < 5; k += 1) {
        let home = lineup[k];
        let away = lineup[9 - k];
        if ((cycle + round + k) % 2 === 1) { const t = home; home = away; away = t; }
        games.push({ day, home, away, played: false, homeScore: null, awayScore: null, dleague: true });
      }
      rotation = [rotation[rotation.length - 1], ...rotation.slice(0, -1)];
    }
  }
  return games;
}

// ===== 시즌 캘린더: day 카운터를 실제 날짜로 변환 =====
// 시즌 1 = 2025-26 시즌. 1일차 = 10월 16일(개막 준비일), day가 늘수록 실제 달력이 흐른다.
const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
function dateOfDay(day, season) {
  const s = season || (typeof state !== "undefined" && state && state.season) || 1;
  const d = new Date(2025 + (s - 1), 9, 16);
  d.setDate(d.getDate() + ((day || 1) - 1));
  return d;
}
function fmtDate(day, opts) { // "10월 19일 (일)" / year 옵션 시 "2025년 10월 19일 (일)"
  const o = opts || {};
  const d = dateOfDay(day, o.season);
  const md = `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS_KO[d.getDay()]})`;
  return o.year ? `${d.getFullYear()}년 ${md}` : md;
}
function fmtDateShort(day, season) { // "10.19 (일)"
  const d = dateOfDay(day, season);
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${WEEKDAYS_KO[d.getDay()]})`;
}

// 인게임 날짜 기준 만 나이: 시즌이 흐르고 해가 바뀌면 생일에 맞춰 자동으로 올라간다
function ageAt(birth, fallback) {
  const b = birth ? new Date(birth) : null;
  if (!b || isNaN(b.getTime())) return fallback != null ? fallback : 27;
  const now = dateOfDay(state.day);
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return age;
}

function loadState() {
  const saved = localStorage.getItem("kbl-manager-save");
  if (!saved) return defaultState();

  try {
    const parsedSave = JSON.parse(saved);
    const loaded = { ...defaultState(), ...parsedSave };
    // 시즌 시스템 도입 전 세이브 마이그레이션: 구형 일정(270경기 미만)은 시즌 1로 재구성
    if (!loaded.season || !Array.isArray(loaded.schedule) || loaded.schedule.length < 270) {
      loaded.season = 1;
      loaded.phase = "regular";
      loaded.playoffs = null;
      loaded.champion = null;
      loaded.day = 1;
      loaded.schedule = buildSchedule();
      loaded.standings = Object.fromEntries(
        teams.map((team) => [team.id, { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 }]),
      );
    }
    if (!loaded.teamStats) loaded.teamStats = {};
    if (!loaded.playerStats) loaded.playerStats = {};
    if (!loaded.poTeamStats) loaded.poTeamStats = {};
    if (!loaded.poPlayerStats) loaded.poPlayerStats = {};
    if (!loaded.playerCondition) loaded.playerCondition = {};
    if (!loaded.injuries) loaded.injuries = {};
    if (!loaded.injuryHistory) loaded.injuryHistory = {};
    if (!loaded.seasonHistory) loaded.seasonHistory = [];
    if (!loaded.careerStats) loaded.careerStats = {};
    if (!loaded.training) loaded.training = {};
    if (!loaded.devGrowth) loaded.devGrowth = {};
    if (!loaded.sharpness) loaded.sharpness = {};
    // 구형 수신함(문자열 배열 + unreadNewsCount 카운터) -> 객체 배열(+개별 read 플래그) 마이그레이션
    if (!Array.isArray(loaded.news) || (loaded.news.length && typeof loaded.news[0] === "string")) {
      const oldNews = Array.isArray(parsedSave.news) ? parsedSave.news : [];
      const oldUnread = parsedSave.unreadNewsCount || 0;
      loaded.news = oldNews.map((text, i) => ({
        id: `legacy-${i}`,
        day: loaded.day,
        season: loaded.season,
        sender: "front",
        title: "구단 소식",
        body: typeof text === "string" ? text : String(text),
        read: i < oldNews.length - oldUnread,
        priority: "normal",
        link: null,
      }));
      loaded.newsSeq = oldNews.length;
    }
    if (!Number.isFinite(loaded.newsSeq)) loaded.newsSeq = loaded.news.length;
    if (!loaded.inboxFilter) loaded.inboxFilter = "all";
    if (loaded.selectedNewsId === undefined) loaded.selectedNewsId = null;
    delete loaded.unreadNewsCount;
    if (!loaded.dleagueRoster) loaded.dleagueRoster = {};
    if (!Array.isArray(loaded.dleagueSchedule) || !loaded.dleagueSchedule.length) loaded.dleagueSchedule = buildDLeagueSchedule();
    if (!loaded.dleagueStandings) {
      loaded.dleagueStandings = Object.fromEntries(
        teams.map((team) => [team.id, { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 }]),
      );
    }
    // 구형 훈련 배정(공격+수비+체력 동시 배정) -> 1개만 남기는 형식으로 마이그레이션
    Object.entries(loaded.training).forEach(([pid, plan]) => {
      if (plan && (plan.off || plan.def || Array.isArray(plan.phys))) {
        if (plan.off) loaded.training[pid] = { cat: "off", key: plan.off };
        else if (plan.def) loaded.training[pid] = { cat: "def", key: plan.def };
        else if (plan.phys && plan.phys.length) loaded.training[pid] = { cat: "phys", key: plan.phys[0] };
        else delete loaded.training[pid];
      }
    });
    return loaded;
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem("kbl-manager-save", JSON.stringify(state));
}

function teamById(id) {
  return teams.find((team) => team.id === id) || DLEAGUE_EXTRA_TEAMS.find((team) => team.id === id);
}

function selectedTeam() {
  return teamById(state.selectedTeamId);
}

// 선수가 D리그로 설정됐는지 (1군 로스터에서 제외되고, D리그 로스터에만 포함됨)
function isDLeaguePlayer(pid) {
  return !!(state.dleagueRoster && state.dleagueRoster[pid]);
}

// 원본 선수 목록(list)을 포지션별 선발 + 벤치 순서로 정렬하고 게임에서 쓰는 필드로 매핑
function buildRosterList(list) {
  const used = new Set();
  const starters = [];
  for (const pos of positions) {
    let pick = list.filter((p) => !used.has(p.id) && p.pos === pos).sort((a, b) => b.ovr - a.ovr)[0];
    if (!pick) pick = list.filter((p) => !used.has(p.id) && p.subPos === pos).sort((a, b) => b.ovr - a.ovr)[0];
    if (!pick) pick = list.filter((p) => !used.has(p.id)).sort((a, b) => b.ovr - a.ovr)[0];
    if (pick) { used.add(pick.id); starters.push({ ...pick, slotPos: pos }); }
  }
  const bench = list.filter((p) => !used.has(p.id)).sort((a, b) => b.ovr - a.ovr);
  return [...starters, ...bench].map((p, index) => ({
    name: p.name,
    playerId: p.id,
    position: p.subPos ? `${p.pos}/${p.subPos}` : p.pos,
    mainPosition: p.slotPos || p.pos,
    ovr: p.ovr,
    atk: p.atk,
    def: p.def,
    grade: p.grade,
    age: ageAt(p.birth, p.age),
    birth: p.birth,
    height: p.height,
    attrs: effectiveAttrs(p.id, p.attrs),
    hidden: p.hidden,
    role: index < 5 ? "주전" : "벤치",
    form: p.ovr,
    condition: Math.round(conditionOf(p.id)),
    sharpness: Math.round(sharpnessOf(p.id)),
    injury: injuryOf(p.id),
    contract: p.ovr >= 80 ? "핵심" : p.ovr >= 73 ? "로테이션" : "유망주",
  }));
}

function rosterFor(teamId) {
  // 실제 선수 데이터(data/game_players.js)가 있으면 사용
  if (typeof KBL_REAL_ROSTERS !== "undefined" && KBL_REAL_ROSTERS[teamId] && KBL_REAL_ROSTERS[teamId].length) {
    return buildRosterList(KBL_REAL_ROSTERS[teamId].filter((p) => !isDLeaguePlayer(p.id)));
  }
  // 폴백: 기존 시드 로스터 (없으면 빈 로스터 — 예: 아직 선수단이 없는 상무 농구단)
  return (rosterSeeds[teamId] || []).map((name, index) => ({
    name,
    position: positions[index % positions.length],
    mainPosition: positions[index % positions.length],
    role: index < 5 ? "주전" : "벤치",
    form: 58 + ((index * 7 + teamId.length) % 35),
    condition: 70 + ((index * 5 + teamId.length) % 24),
    contract: index < 3 ? "핵심" : index < 6 ? "로테이션" : "유망주",
  }));
}

// D리그(2군) 로스터: 해당 팀 선수 중 D리그로 설정된 선수만 반환
function dleagueRosterFor(teamId) {
  if (typeof KBL_REAL_ROSTERS === "undefined" || !KBL_REAL_ROSTERS[teamId]) return [];
  const list = KBL_REAL_ROSTERS[teamId].filter((p) => isDLeaguePlayer(p.id));
  if (!list.length) return [];
  return buildRosterList(list);
}

// D리그로 배정된 인원 (로스터 관리 화면용 — 부상 여부와 무관하게 "설정된" 인원수)
function dleagueCountFor(teamId) {
  if (typeof KBL_REAL_ROSTERS === "undefined" || !KBL_REAL_ROSTERS[teamId]) return 0;
  return KBL_REAL_ROSTERS[teamId].filter((p) => isDLeaguePlayer(p.id)).length;
}

// 지금 당장 실제로 뛸 수 있는(부상 아닌) D리그 인원 — 경기 개최 여부 판정용
function dleagueAvailableCountFor(teamId) {
  if (typeof KBL_REAL_ROSTERS === "undefined" || !KBL_REAL_ROSTERS[teamId]) return 0;
  return KBL_REAL_ROSTERS[teamId].filter((p) => isDLeaguePlayer(p.id) && !injuryOf(p.id)).length;
}

// ===== 체력(컨디션) · 부상 시스템 =====
// 체력은 100% 만점. 경기 출전으로 소모되고(엔진 box.drain), 하루가 지날 때마다 회복된다.
function conditionOf(pid) {
  const v = state.playerCondition && state.playerCondition[pid];
  return v == null ? 100 : v;
}

function injuryOf(pid) {
  const inj = state.injuries && state.injuries[pid];
  return inj && inj.daysLeft > 0 ? inj : null;
}

// 하루 경과: 전 구단 선수 체력 회복 + 부상 일수 차감/복귀
function applyDailyRecovery() {
  if (typeof KBL_REAL_ROSTERS === "undefined") return;
  state.playerCondition = state.playerCondition || {};
  state.injuries = state.injuries || {};
  applyDailyDevelopment(); // 훈련 배정에 따른 능력치 성장/재분배
  Object.values(KBL_REAL_ROSTERS).forEach((list) => list.forEach((p) => {
    const cur = conditionOf(p.id);
    if (cur >= 100) return;
    const stam = Number(effectiveAttrs(p.id, p.attrs || {})["체력"]) || 72; // 체력 훈련 성장분 반영
    let rec = 13 + (stam - 70) * 0.12 - Math.max(0, ageAt(p.birth, p.age) - 29) * 0.4;
    if (cur < 35) rec *= 0.5;      // 방전 상태(관리 실패)는 회복이 더디다
    if (injuryOf(p.id)) rec *= 0.8; // 재활 중에는 컨디션을 끌어올리기 어렵다
    state.playerCondition[p.id] = Math.min(100, Math.round((cur + Math.max(4, rec)) * 10) / 10);
  }));
  Object.entries(state.injuries).forEach(([pid, inj]) => {
    inj.daysLeft -= 1;
    if (inj.daysLeft <= 0) {
      delete state.injuries[pid];
      if (inj.team === state.selectedTeamId) {
        addNews(
          `${inj.playerName} 선수가 ${inj.name} 부상에서 완전히 회복했습니다. 재활 프로그램을 마쳤으며 다음 경기부터 출전이 가능합니다.`,
          { sender: "medical", title: `${inj.playerName} 부상 복귀 판정` },
        );
      }
    }
  });
  // 내 팀 선수 생일 (인게임 달력 기준으로 나이가 올라간다)
  const today = dateOfDay(state.day);
  (KBL_REAL_ROSTERS[state.selectedTeamId] || []).forEach((p) => {
    if (!p.birth) return;
    const b = new Date(p.birth);
    if (!isNaN(b.getTime()) && b.getMonth() === today.getMonth() && b.getDate() === today.getDate()) {
      addNews(
        `${p.name} 선수가 오늘 만 ${ageAt(p.birth, p.age)}세 생일을 맞았습니다. 구단 프런트가 축하 인사를 전달했습니다.`,
        { sender: "front", title: `${p.name} 선수 생일` },
      );
    }
  });
}

// 경기 종료 후: 출전 시간만큼 체력 소모, 경기 중 발생한 부상 등록
// 경기 감각(경기력·부상위험·성장속도에 영향): 0~100, 미설정 시 중립값 70에서 시작.
// 실전 출전(1군 > D리그)으로 회복되고, 안 뛰면 매일 서서히 녹슨다.
function sharpnessOf(pid) {
  const v = state.sharpness && state.sharpness[pid];
  return v == null ? 70 : v;
}
function boostSharpness(pid, minutes, dleague) {
  state.sharpness = state.sharpness || {};
  const mult = dleague ? 0.35 : 0.6; // D리그는 1군보다 회복 효과가 약함("그나마 도움")
  state.sharpness[pid] = Math.min(100, Math.round((sharpnessOf(pid) + minutes * mult) * 10) / 10);
}

function applyGameFatigue(result, dleague) {
  state.playerCondition = state.playerCondition || {};
  state.injuries = state.injuries || {};
  state.injuryHistory = state.injuryHistory || {};
  [...(result.homeBox || []), ...(result.awayBox || [])].forEach((p) => {
    if (p.min > 0) boostSharpness(p.id, p.min, dleague);
    if (!p.drain) return;
    state.playerCondition[p.id] = Math.max(3, Math.round((conditionOf(p.id) - p.drain) * 10) / 10);
  });
  (result.injuries || []).forEach((inj) => {
    state.injuries[inj.id] = { name: inj.label, daysLeft: inj.days, playerName: inj.name, team: inj.team, day: state.day };
    const hist = state.injuryHistory[inj.id] || (state.injuryHistory[inj.id] = []);
    hist.push({ label: inj.label, days: inj.days, day: state.day, season: state.season });
    if (hist.length > 30) hist.shift(); // 선수당 최근 30건까지만 보관 (세이브 용량 관리)
    applyInjurySetback(inj.id, inj.days);
    if (inj.team === state.selectedTeamId) {
      addNews(
        `${inj.name} 선수가 경기 중 ${inj.label} 진단을 받았습니다. 정밀 검진 결과 약 ${inj.days}일간의 결장이 예상되며, 재활 프로그램에 즉시 돌입합니다.`,
        { sender: "medical", title: `${inj.name} 부상 보고`, priority: inj.days >= MAJOR_INJURY_DAYS ? "important" : "normal" },
      );
      if (inj.days >= 180) {
        addNews(
          `${inj.name} 선수의 부상이 사실상 시즌아웃급으로 판단됩니다. 회복 경과에 따라 이번 시즌 내 복귀가 어려울 수 있습니다.`,
          { sender: "medical", title: `${inj.name} 시즌아웃 경보`, priority: "important" },
        );
      }
      if (inj.days >= MAJOR_INJURY_DAYS) {
        addNews(
          `${inj.name} 선수는 장기 결장이 예상되어 한동안 기량 성장이 정체될 수 있습니다. 재활 경과가 좋지 않을 경우 일부 능력치 하락도 우려됩니다.`,
          { sender: "training", title: `${inj.name} 성장 정체 우려` },
        );
      }
    }
  });
}

function getStandings() {
  return teams
    .map((team) => ({ ...team, ...state.standings[team.id] }))
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.strength - a.strength);
}

function getRank(teamId) {
  return getStandings().findIndex((team) => team.id === teamId) + 1;
}

function render() {
  // 라이브 화면을 벗어나면 경기 자동 일시정지 (백그라운드 진행 방지)
  if (typeof liveGame !== "undefined" && liveGame && !liveGame.ended && state.currentView !== "live" && !liveGame.paused) {
    liveGame.paused = true;
    stopLiveTimer();
  }
  renderStartScreen();
  renderNewTeamSelect();
  renderManagerSetup();
  renderCareerIntro();
  renderTeamPicker();
  renderHeader();
  renderInboxList();
  renderView();
  bindActions();
}

function renderStartScreen() {
  const startScreen = document.querySelector("#startScreen");
  const recentText = document.querySelector("#startRecentText");
  const saved = localStorage.getItem("kbl-manager-save");
  const recentState = saved ? JSON.parse(saved) : state;
  const recentTeam = teamById(recentState.selectedTeamId) || selectedTeam();

  recentText.textContent = `${recentTeam.name} | 시즌 ${recentState.season || 1} | ${fmtDate(recentState.day || 1, { year: true, season: recentState.season || 1 })}`;
  startScreen.classList.toggle("hidden", !isStartScreenOpen);
}

function renderNewTeamSelect() {
  const screen = document.querySelector("#teamSelectScreen");
  const grid = document.querySelector("#newTeamGrid");
  const team = teamById(pendingTeamId) || teams[0];

  screen.classList.toggle("hidden", !isTeamSelectOpen);
  grid.innerHTML = teams
    .map(
      (item) => `
        <button class="team-card ${item.id === pendingTeamId ? "active" : ""}" data-team-id="${item.id}" style="--team-color: ${item.color}">
          <span class="team-logo-slot">LOGO</span>
          <span>
            <strong>${item.name}</strong>
            <span>${item.city} | ${item.colorName}</span>
            <span class="team-power-line" style="display:block; margin-top:3px; font-size:11px; opacity:.85;">
              종합 <b>${item.strength}</b>${item.attack != null ? ` · 공격 <b>${item.attack}</b>` : ""}${item.defense != null ? ` · 수비 <b>${item.defense}</b>` : ""}
            </span>
          </span>
        </button>`,
    )
    .join("");

  document.querySelector("#previewLogoSlot").style.setProperty("--preview-color", team.color);
  document.querySelector("#previewCity").textContent = team.city;
  document.querySelector("#previewTeamName").textContent = team.name;
  const powerText = team.attack != null
    ? `${team.colorName} · 종합 ${team.strength} | 공격 ${team.attack} | 수비 ${team.defense}`
    : `${team.colorName} · 종합 ${team.strength}`;
  document.querySelector("#previewColorName").textContent = powerText;
}

function renderManagerSetup() {
  const screen = document.querySelector("#managerSetupScreen");
  const originList = document.querySelector("#managerOriginList");
  const attributeList = document.querySelector("#managerAttributeList");
  const nameInput = document.querySelector("#managerNameInput");

  screen.classList.toggle("hidden", !isManagerSetupOpen);
  nameInput.value = pendingManager.name;
  originList.innerHTML = managerOrigins
    .map(
      (origin) => `
        <button class="origin-card ${origin.id === pendingManager.origin ? "active" : ""}" data-origin-id="${origin.id}">
          <span class="origin-icon">${origin.icon}</span>
          <span>
            <strong>${origin.name}</strong>
            <span>${origin.description}</span>
          </span>
        </button>`,
    )
    .join("");

  attributeList.innerHTML = managerAttributes
    .map(
      (attribute) => `
        <div class="manager-attribute-row">
          <label for="manager-${attribute.key}">${attribute.label}</label>
          <input id="manager-${attribute.key}" name="${attribute.key}" type="range" min="30" max="85" value="${pendingManager.attributes[attribute.key]}" />
          <span class="manager-attribute-value">${pendingManager.attributes[attribute.key]}</span>
        </div>`,
    )
    .join("");

  const total = Object.values(pendingManager.attributes).reduce((sum, value) => sum + Number(value), 0);
  document.querySelector("#managerPointText").textContent = `능력치 합계 ${total}`;
}

function renderCareerIntro() {
  const screen = document.querySelector("#careerIntroScreen");
  const content = document.querySelector("#introContent");
  const nextButton = document.querySelector("#introNext");
  const team = selectedTeam();
  const manager = state.manager || pendingManager;
  const origin = managerOrigins.find((item) => item.id === manager.origin) || managerOrigins[0];
  const steps = buildCareerIntroSteps(team, manager, origin);

  screen.classList.toggle("hidden", !isCareerIntroOpen);
  if (!isCareerIntroOpen) return;

  careerIntroStep = Math.max(0, Math.min(careerIntroStep, steps.length - 1));
  content.innerHTML = steps[careerIntroStep]();
  nextButton.textContent = careerIntroStep === steps.length - 1 ? "확인 ›" : "다음 ›";
}

function buildCareerIntroSteps(team, manager, origin) {
  const clubShortName = team.name.replace(team.city, "").trim() || team.name;
  const badge = team.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 3);

  return [
    () => `
      <article class="intro-card">
        <div class="intro-news-ribbon"><span>속보</span><strong>KBL ZONE</strong></div>
        <div class="intro-article">
          <h2>${team.name}, ${manager.name} 감독 선임</h2>
          <div class="intro-media-stack">
            <div class="intro-image-placeholder">${team.city}</div>
            <div class="intro-welcome-card">
              <span>${team.name}에 오신 것을 환영합니다</span>
              <strong>${manager.name}</strong>
              <small>#${origin.name}</small>
            </div>
          </div>
          <div class="intro-article-body">
            <p>${team.name}은 오늘 ${manager.name} 감독을 구단의 새로운 사령탑으로 임명했습니다.</p>
            <p>구단은 ${origin.name}이라는 배경이 팀 운영에 새로운 시각을 더해줄 것으로 기대하고 있습니다. 첫 기자회견과 선수단 미팅은 추후 진행될 예정입니다.</p>
            <p>이번 임명은 ${team.city} 팬들에게 새로운 출발을 알리는 신호탄입니다. 세부 계약 조건과 코칭스태프 구성은 아직 공개되지 않았습니다.</p>
          </div>
        </div>
      </article>`,
    () => `
      <section class="intro-dialogue">
        <div class="intro-message">
          <div class="intro-speaker">구단 단장</div>
          <div class="intro-avatar"></div>
          <div class="intro-bubble">구단의 모든 구성원을 대표해 ${manager.name} 감독님의 부임을 축하드립니다. 먼저 구단의 기본 정보를 확인해주시기 바랍니다.</div>
        </div>
        <article class="intro-team-card">
          <div class="intro-team-banner" style="--intro-team-color: ${team.color}">
            <div class="intro-logo-big">LOGO</div>
            <div>
              <h2>${team.name}</h2>
              <div class="intro-stars">★★★★☆</div>
              <p>연고지 ${team.city} | 팀 컬러 ${team.colorName}</p>
            </div>
            <div>
              <p>설립연도</p><strong>정보 입력 예정</strong>
              <p>라이벌</p><strong>추후 설정</strong>
            </div>
          </div>
          <div class="intro-info-grid">
            <div class="intro-info-section">
              <h3>다음 시즌</h3>
              <div class="intro-list">
                <div class="intro-list-row"><span>KBL 정규리그 참가</span><strong>필수</strong><em>대회</em></div>
                <div class="intro-list-row"><span>컵 대회 참가</span><strong>선호</strong><em>대회</em></div>
                <div class="intro-list-row"><span>플레이오프 경쟁</span><strong>우선</strong><em>목표</em></div>
              </div>
            </div>
            <div class="intro-info-section">
              <h3>시설</h3>
              <p>홈 경기장, 훈련 시설, 유소년 시스템 정보는 추후 실제 데이터로 채울 예정입니다.</p>
            </div>
            <div class="intro-info-section">
              <h3>재정</h3>
              <p>상태: 보통</p>
              <p>예산: ${state.budget}억</p>
            </div>
          </div>
        </article>
      </section>`,
    () => `
      <section class="intro-dialogue">
        <div class="intro-message">
          <div class="intro-speaker">구단 단장</div>
          <div class="intro-avatar"></div>
          <div class="intro-bubble">현재 종합 보고서를 작성 중입니다. 지금은 코치진이 준비한 ${clubShortName} 선수단 요약과 이적 업무 껍데기만 확인할 수 있습니다.</div>
        </div>
        <div class="intro-squad-grid">
          <article class="intro-list-panel">
            <h3>팀 보고서 - 베스트 5</h3>
            <div class="intro-court">
              ${introPlayer("PG", 7, "22%", "66%")}
              ${introPlayer("SG", 11, "43%", "58%")}
              ${introPlayer("SF", 23, "63%", "66%")}
              ${introPlayer("PF", 34, "35%", "40%")}
              ${introPlayer("C", 55, "52%", "22%")}
            </div>
          </article>
          <article class="intro-list-panel">
            <h3>이적 업무</h3>
            <div class="intro-transfer-list">
              ${["FA 후보 리스트 준비 중", "임대/트레이드 후보 분석 예정", "외국인 선수 슬롯 확인 필요", "샐러리캡 세부 연동 예정", "스카우트 리포트 연결 예정", "선수 계약 만료일 검토 예정", "드래프트 클래스 추후 추가"].map((item) => `
                <div class="intro-transfer-row"><div class="intro-avatar"></div><div><strong>${item}</strong><br><span>세부 기능은 데이터 연결 후 활성화됩니다.</span></div></div>
              `).join("")}
            </div>
          </article>
        </div>
      </section>`,
    () => `
      <section class="intro-dialogue">
        <div class="intro-message">
          <div class="intro-speaker">구단 단장</div>
          <div class="intro-avatar"></div>
          <div class="intro-bubble">다음은 운영진이 생각하는 장기 비전과 첫 시즌 목표입니다. 세부 난이도와 보상은 나중에 조정할 수 있습니다.</div>
        </div>
        <article class="intro-list-panel">
          <h3>구단 비전</h3>
          <div class="intro-list">
            ${introObjective("미래를 위해 어린 선수를 육성하라", "우선 사항", "육성")}
            ${introObjective("상업적 수익을 증가시켜라", "우선 사항", "재정")}
            ${introObjective("급료 예산 내에서 운영하라", "필수 사항", "재정")}
            ${introObjective("구단의 명성을 높여라", "선호 사항", "명성")}
            ${introObjective("플레이오프 진출 경쟁력을 보여라", "필수 사항", "대회")}
            ${introObjective("주전급 선수와 장기 계약을 검토하라", "희망 사항", "이적")}
          </div>
        </article>
      </section>`,
    () => `
      <section class="intro-dialogue">
        <div class="intro-message">
          <div class="intro-speaker">서포터 연락 담당자</div>
          <div class="intro-avatar"></div>
          <div class="intro-bubble">서포터 문화와 기대에 대한 기본 요약입니다. 실제 팬 성향 데이터는 추후 연결할 예정입니다.</div>
        </div>
        <article class="intro-list-panel">
          <h3>서포터 기대</h3>
          <div class="intro-list">
            ${introObjective("공격적인 농구를 하라", "선호 사항", "경기 스타일")}
            ${introObjective("재미있는 농구를 하라", "우선 사항", "경기 스타일")}
            ${introObjective("홈 경기에서 강한 모습을 보여라", "필수 사항", "팬 만족")}
            ${introObjective("라이벌전에서 쉽게 물러서지 마라", "우선 사항", "라이벌")}
            ${introObjective("유망주에게 출전 기회를 제공하라", "희망 사항", "육성")}
          </div>
        </article>
      </section>`,
    () => `
      <section class="intro-final-panel">
        <div class="intro-message">
          <div class="intro-speaker">구단 단장</div>
          <div class="intro-avatar"></div>
          <div class="intro-bubble">마지막으로 필요한 사항이 있다면 편하게 말씀해주시기 바랍니다. 다시 한번 축하드립니다. 구단의 성공을 위한 시작이 되기를 바랍니다.</div>
        </div>
        <article class="intro-agreement">
          <h3>합의</h3>
          <div class="intro-agreement-row"><span>언론과 만나기 위해 기자 회견 일정을 잡겠습니까?</span><div class="intro-toggle"><span>예</span><span>아니요</span></div><em></em></div>
          <div class="intro-agreement-row"><span>선수단 평가를 위해 내부 친선 경기를 잡으시겠습니까?</span><div class="intro-toggle"><span>예</span><span>아니요</span></div><em></em></div>
          <div class="intro-agreement-row"><span>코치진과 회의를 잡으시겠습니까?</span><strong>매주</strong><em>추후 설정</em></div>
        </article>
      </section>`,
  ];
}

function introPlayer(position, number, left, top) {
  return `<div class="intro-player-card" style="left:${left}; top:${top};"><span><small>${position}</small><strong>${number}</strong></span><div class="intro-avatar"></div></div>`;
}

function introObjective(label, importance, category) {
  return `<div class="intro-objective-row"><span>${label}</span><strong>${importance}</strong><em>${category}</em></div>`;
}

function renderTeamPicker() {
  const select = document.querySelector("#teamSelect");
  select.innerHTML = teams.map((team) => `<option value="${team.id}">${team.name}</option>`).join("");
  select.value = state.selectedTeamId;
}

function renderHeader() {
  const team = selectedTeam();
  const record = state.standings[team.id];
  const crest = document.querySelector("#clubCrest");
  crest.textContent = team.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 3);
  crest.style.setProperty("--crest-color", team.color);
  document.querySelector("#seasonLabel").textContent = `시즌 ${state.season}`;
  document.querySelector("#seasonLabel").title = `시즌 ${state.season} | ${fmtDate(state.day, { year: true })}`;
  document.querySelector("#dateChip").textContent = state.day < 2 ? "프리시즌" : fmtDateShort(state.day);
  document.querySelector("#clubSubtitle").textContent = `${team.city} | KBL 정규리그 준비 중`;
  document.querySelector("#clubName").textContent = team.name;
  document.querySelector("#topSummary").textContent = `${team.name} ${getRank(team.id)}위 - 다음 경기: ${nextGameText()}`;
  document.querySelector("#recordText").textContent = `${record.wins}승 ${record.losses}패`;
  document.querySelector("#rankText").textContent = `${getRank(team.id)}위`;
  document.documentElement.style.setProperty("--team-color", team.color);
  document.querySelector(".app-shell").classList.toggle("team-bg", state.bgTheme === "team");
  const bgBtn = document.querySelector("#bgChangeButton");
  if (bgBtn) bgBtn.classList.toggle("active", state.bgTheme === "team");

  // 통합 진행 버튼: 안 읽은 뉴스가 있으면 "다음 읽기", 다 읽었으면 "다음 경기"로 전환
  const continueBtn = document.querySelector("#continueButton");
  const unread = unreadNewsCount();
  if (unread > 0) {
    continueBtn.textContent = `다음 읽기 (${unread}) ›`;
    continueBtn.classList.remove("subtle");
    continueBtn.dataset.mode = "read";
  } else {
    continueBtn.textContent = "다음 경기 ›";
    continueBtn.classList.remove("subtle");
    continueBtn.dataset.mode = "game";
  }
}

// 탭바 필터값 -> 발신처. training/medical(내부 보고서)은 전용 탭 없이 "수신함(all)"에서만 노출
const INBOX_TAB_SENDER = {
  marketing: "marketing", // 소셜 피드
  sportsnews: "sportsnews", // 뉴스
  front: "front", // 리그 소식
  press: "press", // 세계 소식
  scout: "scout", // 이적 시장 뉴스
};

function renderInboxList() {
  const list = document.querySelector("#inboxList");
  if (!list) return;
  const unread = unreadNewsCount();
  const readNextBtn = document.querySelector("#inboxReadNextButton");
  if (readNextBtn) {
    readNextBtn.textContent = unread > 0 ? `다음 읽기 (${unread}) ››` : "모두 읽음 ✓";
    readNextBtn.disabled = unread === 0;
  }
  const filtered = filteredNewsList();
  if (!filtered.length) {
    list.innerHTML = '<div class="empty-record" style="padding:16px;">아직 소식이 없습니다.</div>';
    return;
  }
  // 최신 소식이 위로
  const rows = [...filtered].reverse();
  const selectedId = state.selectedNewsId || rows[0].id;
  list.innerHTML = rows
    .map((item) => {
      const meta = newsMetaOf(item.sender);
      const isSelected = item.id === selectedId;
      return `
        <button class="inbox-item ${isSelected ? "active" : ""} ${item.read ? "" : "unread"}" data-news-id="${item.id}" style="--sender-color:${meta.color}">
          <span><strong>${meta.label}</strong><em>${item.read ? "" : "안 읽음"}</em></span>
          <b class="inbox-item-title">${item.title}</b>
          <p>${item.body}</p>
        </button>`;
    })
    .join("");
}

function renderView() {
  const root = document.querySelector("#viewRoot");
  document.querySelector(".game-content-shell").classList.toggle("no-inbox", state.currentView !== "inbox");
  if (state.currentView === "dashboard") renderDashboard(root);
  if (state.currentView === "inbox") renderInbox(root);
  if (state.currentView === "roster") renderRoster(root);
  if (state.currentView === "lineup") renderLineup(root);
  if (state.currentView === "tactics") renderTactics(root);
  if (state.currentView === "training") renderTraining(root);
  if (state.currentView === "schedule") renderSchedule(root);
  if (state.currentView === "league") renderLeague(root);
  if (state.currentView === "records") renderRecords(root);
  if (state.currentView === "office") renderOffice(root);
  if (state.currentView === "player") renderPlayerDetail(root);
  if (state.currentView === "live") renderLive(root);
}

// ===== 선수 상세 화면 =====
let selectedPlayerId = null;
let playerReturnView = "roster";
let playerDetailTab = "능력치";

function playerLink(id, label) {
  return id ? `<span class="plink" data-player-id="${id}">${label}</span>` : label;
}

// 원형 얼굴 썸네일 (png -> jpg -> webp -> 실루엣 순으로 폴백)
const FACE_FALLBACK = "data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><rect width=%2240%22 height=%2240%22 fill=%22%23d7dade%22/><circle cx=%2220%22 cy=%2215%22 r=%227%22 fill=%22%23a9b1bb%22/><path d=%22M5 40c2-9 8-13 15-13s13 4 15 13z%22 fill=%22%23a9b1bb%22/></svg>";
function playerFace(pid) {
  if (!pid) return "";
  return `<span class="pface-wrap"><img class="pface" src="photo/face/${pid}.png" alt="" loading="lazy"
    onerror="if(!this.dataset.e){this.dataset.e=1;this.src='photo/face/${pid}.jpg';}else if(this.dataset.e==='1'){this.dataset.e=2;this.src='photo/face/${pid}.webp';}else{this.onerror=null;this.style.transform='none';this.src='${FACE_FALLBACK}';}"></span>`;
}

function findPlayerById(pid) {
  if (typeof KBL_REAL_ROSTERS === "undefined" || !pid) return null;
  for (const [tid, list] of Object.entries(KBL_REAL_ROSTERS)) {
    const p = list.find((x) => x.id === pid);
    if (p) return { ...p, age: ageAt(p.birth, p.age), attrs: effectiveAttrs(p.id, p.attrs), teamId: tid }; // 인게임 날짜 기준 나이 + 훈련 성장 반영
  }
  return null;
}

function openPlayer(pid) {
  if (!findPlayerById(pid)) return;
  if (state.currentView !== "player") playerReturnView = state.currentView;
  selectedPlayerId = pid;
  playerDetailTab = "능력치";
  state.currentView = "player";
  render();
}

// ── 우클릭 컨텍스트 메뉴 (선수 이름) ──
function closeCtxMenu() {
  const m = document.getElementById("ctx-menu");
  if (m) m.remove();
}

function showPlayerCtxMenu(x, y, pid) {
  closeCtxMenu();
  const p = findPlayerById(pid);
  if (!p) return;
  const team = teamById(p.teamId);
  const m = document.createElement("div");
  m.id = "ctx-menu";
  m.innerHTML = `
    <div class="ctx-head">${playerFace(pid)}<span>${p.name}<small>${team ? team.name : ""} · ${p.pos} · OVR ${p.ovr ?? "-"}</small></span></div>
    <div class="ctx-item" data-act="profile">👤 선수 정보 보기</div>
    <div class="ctx-item" data-act="records">📊 소속팀 선수 기록</div>
    <div class="ctx-item" data-act="teamRecords">🏀 팀기록 보기</div>`;
  document.body.appendChild(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(4, Math.min(x, window.innerWidth - r.width - 8)) + "px";
  m.style.top = Math.max(4, Math.min(y, window.innerHeight - r.height - 8)) + "px";
  m.addEventListener("click", (e) => {
    const item = e.target.closest(".ctx-item");
    if (!item) return;
    const act = item.dataset.act;
    closeCtxMenu();
    if (act === "profile") { openPlayer(pid); return; }
    if (act === "records") { recordsTab = "player"; recordsTeamFilter = p.teamId; recSortKey = "pts"; recSortDir = -1; }
    if (act === "teamRecords") { recordsTab = "team"; recSortKey = "pts"; recSortDir = -1; }
    state.currentView = "records";
    render();
  });
}

function starsHtml(value5) {
  const full = Math.max(0, Math.min(5, Math.round(value5)));
  return `<span class="pd-stars">${"★".repeat(full)}<span class="dim">${"★".repeat(5 - full)}</span></span>`;
}

// ===== 훈련(육성) 시스템 =====
// 카테고리별 훈련 프로그램. 선수 1명당 공격/수비/체력 12개 프로그램 중 단 1개만 배정 가능.
// 훈련을 배정하면 포지션과 무관하게 그 방향으로 집중 성장(예: 패스 잘하는 센터, 3점 쏘는 센터 만들기 용도).
// 배정하지 않으면 그 선수 포지션에 자연스러운 능력치들이 고르게 성장한다.
const TRAINING_PROGRAMS = {
  off: {
    paint: { name: "골밑 공격 중심", desc: "근거리슛 · 스탠딩덩크 · 포스트컨트롤 성장", keys: ["근거리슛", "스탠딩덩크", "포스트컨트롤"] },
    shooting: { name: "슈팅 중심", desc: "중거리슛 · 3점슛 · 자유투 성장", keys: ["중거리슛", "3점슛", "자유투"] },
    drive: { name: "돌파 중심", desc: "드라이빙레이업/드라이빙덩크(주특기 쪽) · 드리블속도 성장", keys: ["드라이빙레이업", "드라이빙덩크", "드리블속도"] },
    pass: { name: "패스 중심", desc: "패스정확도 · 볼핸들링 성장", keys: ["패스정확도", "볼핸들링"] },
  },
  def: {
    paint: { name: "골밑 수비 중심", desc: "골밑수비 · 블록 성장", keys: ["골밑수비", "블록"] },
    perimeter: { name: "외곽 수비 중심", desc: "외곽수비 · 스틸 성장", keys: ["외곽수비", "스틸"] },
    rebound: { name: "리바운드 중심", desc: "공격리바운드 · 수비리바운드 성장", keys: ["공격리바운드", "수비리바운드"] },
  },
  phys: {
    strength: { name: "근력 훈련", desc: "힘 성장", keys: ["힘"] },
    stamina: { name: "체력 훈련", desc: "체력 성장", keys: ["체력"] },
    jump: { name: "점프력 훈련", desc: "점프력 성장", keys: ["점프력"] },
    agility: { name: "민첩성 훈련", desc: "민첩성 성장", keys: ["민첩성"] },
    speed: { name: "속도 훈련", desc: "속도 성장", keys: ["속도"] },
  },
};
// 선수 1명당 공격/수비/체력 12개 프로그램 중 단 하나만 배정 가능
function trainingPlanOf(pid) {
  const p = state.training && state.training[pid];
  return p && p.cat && p.key ? p : { cat: null, key: null };
}

function trainingAssigned(plan) {
  return !!(plan && plan.cat && plan.key && TRAINING_PROGRAMS[plan.cat] && TRAINING_PROGRAMS[plan.cat][plan.key]);
}

function devGrowthOf(pid) {
  state.devGrowth = state.devGrowth || {};
  return state.devGrowth[pid] || (state.devGrowth[pid] = { caGained: 0, attrs: {} });
}

function attrGrowthOf(pid, key) {
  const dev = state.devGrowth && state.devGrowth[pid];
  return (dev && dev.attrs && dev.attrs[key]) || 0;
}

// 훈련으로 쌓인 성장분을 반영한 실제 능력치 (엔진·화면 공용)
function effectiveAttrs(pid, baseAttrs) {
  const dev = state.devGrowth && state.devGrowth[pid];
  if (!dev || !dev.attrs || !Object.keys(dev.attrs).length) return baseAttrs;
  const out = { ...baseAttrs };
  Object.entries(dev.attrs).forEach(([k, d]) => {
    if (d) out[k] = Math.max(25, Math.min(99, Math.round((Number(baseAttrs[k]) || 50) + d)));
  });
  return out;
}

// 훈련으로 끌어올린 현재능력(CA): 원본 CA + 누적 성장치, 잠재능력(PA)을 넘지 않음
function effectiveCA(pid, hidden) {
  const ca = hidden ? Number(hidden["현재능력"]) : NaN;
  const pa = hidden ? Number(hidden["잠재능력"]) : NaN;
  if (isNaN(ca)) return null;
  const dev = state.devGrowth && state.devGrowth[pid];
  const gained = dev ? dev.caGained : 0;
  return isNaN(pa) ? ca + gained : Math.min(pa, ca + gained);
}

// 이번 훈련에서 실제로 성장 대상이 되는 능력치 목록 (선수당 배정된 프로그램 1개 기준)
function trainingTargets(baseAttrs, plan) {
  if (!trainingAssigned(plan)) return [];
  const cat = plan.cat, key = plan.key;
  if (cat === "off" && key === "drive") {
    // "돌파 중심"은 드라이빙레이업/드라이빙덩크 중 선수의 주특기 쪽만 집중 성장
    const lay = Number(baseAttrs["드라이빙레이업"]) || 50;
    const dunk = Number(baseAttrs["드라이빙덩크"]) || 50;
    return [{ key: lay >= dunk ? "드라이빙레이업" : "드라이빙덩크", cat }, { key: "드리블속도", cat }];
  }
  return TRAINING_PROGRAMS[cat][key].keys.map((k) => ({ key: k, cat }));
}

// AI(비유저) 팀 선수의 기본 훈련: 이미 잘하는 방향(공격/수비)을 더 강화하고, 약한 피지컬 2개를 보완
function autoTrainingFor(p) {
  const a = (k) => Number((p.attrs || {})[k]) || 50;
  const offScore = {
    paint: (a("근거리슛") + a("스탠딩덩크") + a("포스트컨트롤")) / 3,
    shooting: (a("중거리슛") + a("3점슛") + a("자유투")) / 3,
    drive: (Math.max(a("드라이빙레이업"), a("드라이빙덩크")) + a("드리블속도")) / 2,
    pass: (a("패스정확도") + a("볼핸들링")) / 2,
  };
  const defScore = {
    paint: (a("골밑수비") + a("블록")) / 2,
    perimeter: (a("외곽수비") + a("스틸")) / 2,
    rebound: (a("공격리바운드") + a("수비리바운드")) / 2,
  };
  const physScore = { strength: a("힘"), stamina: a("체력"), jump: a("점프력"), agility: a("민첩성"), speed: a("속도") };
  // 공격/수비/체력 12개 프로그램을 통틀어 선수가 이미 가장 잘하는 방향 하나만 선택 (강점 강화)
  const all = [
    ...Object.entries(offScore).map(([key, v]) => ({ cat: "off", key, v })),
    ...Object.entries(defScore).map(([key, v]) => ({ cat: "def", key, v })),
    ...Object.entries(physScore).map(([key, v]) => ({ cat: "phys", key, v })),
  ];
  const best = all.sort((x, y) => y.v - x.v)[0];
  return { cat: best.cat, key: best.key };
}

// 훈련/재분배로 한 능력치가 움직일 수 있는 총 범위. 성장 쪽은 +18로 브레이크를 걸어
// "패스 50짜리 가드가 99까지" 같은 비현실적 성장을 막는다. 하락(노쇠화) 쪽은 -25까지 허용.
function clampGrowthDelta(v) {
  return Math.max(-25, Math.min(18, v));
}

// 포지션별로 자연스러운(자주 쓰는) 능력치 목록 — 훈련 미배정 시 이 안에서만 고르게 성장한다.
// 체력은 포지션 공통으로 포함(모든 선수에게 컨디셔닝은 기본).
const POSITION_NATURAL_ATTRS = {
  PG: ["패스정확도", "볼핸들링", "드리블속도", "3점슛", "자유투", "스틸", "외곽수비", "속도", "민첩성", "체력"],
  SG: ["3점슛", "중거리슛", "드라이빙레이업", "볼핸들링", "스틸", "외곽수비", "속도", "민첩성", "자유투", "체력"],
  SF: ["3점슛", "중거리슛", "드라이빙레이업", "외곽수비", "수비리바운드", "스틸", "힘", "속도", "점프력", "체력"],
  PF: ["근거리슛", "포스트컨트롤", "공격리바운드", "수비리바운드", "골밑수비", "블록", "힘", "점프력", "드라이빙덩크", "체력"],
  C: ["근거리슛", "포스트컨트롤", "공격리바운드", "수비리바운드", "골밑수비", "블록", "힘", "점프력", "스탠딩덩크", "체력"],
};
function naturalAttrsFor(pos) {
  return POSITION_NATURAL_ATTRS[pos] || POSITION_NATURAL_ATTRS.SF;
}

// 신체 조건에 따른 현실적 성장 한도. 훈련/재분배로 "만들 수 있는" 최고치에만 걸리는 브레이크이고,
// 에디터가 부여한 원래 능력치(예외적인 실존 유형)는 건드리지 않는다 — 그 지점에서 더는 못 자란다는 뜻일 뿐.
// h1<h2 구간에서 cap1->cap2로 선형 보간하고, 구간 밖은 양 끝값으로 고정.
function lerpCap(h, h1, cap1, h2, cap2) {
  if (h <= h1) return cap1;
  if (h >= h2) return cap2;
  return Math.round(cap1 + (cap2 - cap1) * ((h - h1) / (h2 - h1)));
}
// "크면 불리" 계열: 키가 클수록 한도가 낮아짐 (장신의 스피드·순발력, 2m대 빅맨의 3점슛 한계 등)
const TALL_PENALTY_ATTRS = {
  속도: [185, 99, 215, 80],
  민첩성: [185, 99, 215, 80],
  드리블속도: [185, 99, 215, 80],
  "3점슛": [195, 99, 220, 78],
};
// "작으면 불리" 계열: 키가 작을수록 한도가 낮아짐 (사이즈가 필요한 리바운드·힘·블록)
const SHORT_PENALTY_ATTRS = {
  공격리바운드: [175, 78, 195, 99],
  수비리바운드: [175, 78, 195, 99],
  힘: [178, 82, 200, 99],
  블록: [180, 75, 200, 99],
};
function attrCeiling(key, heightCm) {
  const h = Number(heightCm) || 190;
  if (TALL_PENALTY_ATTRS[key]) {
    const [h1, cap1, h2, cap2] = TALL_PENALTY_ATTRS[key];
    return lerpCap(h, h1, cap1, h2, cap2);
  }
  if (SHORT_PENALTY_ATTRS[key]) {
    const [h1, cap1, h2, cap2] = SHORT_PENALTY_ATTRS[key];
    return lerpCap(h, h1, cap1, h2, cap2);
  }
  return 99;
}

// 노쇠화: 30세부터 훈련 배정 여부와 무관하게 능력치가 서서히 하락한다.
// 프로의식(히든)이 높은 선수일수록 자기관리로 하락 속도가 완만해진다.
function applyAgingDecline(p, age) {
  if (age < 30) return;
  const base = p.attrs || {};
  const pro = Number((p.hidden || {})["프로의식"]);
  const proMult = 1 - (isNaN(pro) ? 10 : pro) / 20 * 0.5; // 프로의식 20 -> 하락 절반, 0 -> 그대로
  const yearsOver = age - 29;
  const declineChance = Math.min(0.35, 0.012 * yearsOver * proMult);
  if (Math.random() >= declineChance) return;
  const physKeys = ["속도", "점프력", "민첩성", "힘", "체력"];
  // 34세 이후로는 기술 능력치도 소폭 하락 대상에 포함 (순수 노쇠는 피지컬 위주)
  const pool = (age >= 34 && Math.random() < 0.35)
    ? Object.keys(base).filter((k) => !physKeys.includes(k))
    : physKeys;
  if (!pool.length) return;
  const key = pool[Math.floor(Math.random() * pool.length)];
  const curD = attrGrowthOf(p.id, key);
  const baseV = Number(base[key]) || 50;
  if (baseV + curD <= 30) return; // 바닥 방지
  const dev = devGrowthOf(p.id);
  dev.attrs[key] = clampGrowthDelta(curD - 1);
}

// 큰 부상(장기 결장)을 당하면 성장이 한동안 정체되고, 심하면 실제로 능력치가 퇴보하기도 한다
const MAJOR_INJURY_DAYS = 15;
function applyInjurySetback(pid, days) {
  if (days < MAJOR_INJURY_DAYS) return;
  const dev = devGrowthOf(pid);
  // 부상 회복 + 복귀 후 감각을 되찾는 기간 동안 성장 정체
  dev.stagnantUntilDay = (state.day || 0) + days + 14;
  // 장기 부상일수록 확률적으로 실제 셋백(능력치 퇴보)이 함께 발생
  const setbackChance = Math.min(0.6, days / 35);
  if (Math.random() < setbackChance) {
    const setback = 2 + Math.floor(Math.random() * 4); // 2~5
    dev.caGained = Math.max(0, dev.caGained - setback);
    const physKeys = ["속도", "점프력", "민첩성", "힘"];
    const hitCount = Math.random() < 0.5 ? 1 : 2;
    for (let i = 0; i < hitCount; i += 1) {
      const key = physKeys[Math.floor(Math.random() * physKeys.length)];
      const cur = attrGrowthOf(pid, key);
      dev.attrs[key] = clampGrowthDelta(cur - (1 + Math.floor(Math.random() * 2)));
    }
  }
}

// 하루 훈련 진행: 노쇠화(30세+)는 항상 적용된다. 훈련이 배정되면 그 방향으로 집중 성장하고,
// 아무것도 배정하지 않으면 모든 능력치에 고르게 소폭 성장한다. 프로의식/야망이 높거나 실전 출전이 많으면 성장이 빨라지고,
// 큰 부상을 당하면 한동안 성장이 멈추며 확률적으로 능력치가 퇴보하기도 한다.
// 성장 가능 구간은 18~28세뿐이며, 24~29세는 전성기(성장은 끝났지만 하락 전 유지되는 구간)로 다룬다.
function applyDailyDevelopment() {
  if (typeof KBL_REAL_ROSTERS === "undefined") return;
  state.training = state.training || {};
  Object.entries(KBL_REAL_ROSTERS).forEach(([tid, list]) => {
    list.forEach((p) => {
      // AI 팀 선수는 훈련 미배정 시 자연스러운 기본 프로그램을 한 번 배정 (유저 팀은 직접 설정해야 함)
      if (tid !== state.selectedTeamId && !state.training[p.id]) {
        state.training[p.id] = autoTrainingFor(p);
      }
      const age = ageAt(p.birth, p.age);
      applyAgingDecline(p, age);
      // 경기 감각 하루 감소분: 실전에서 뛴 날은 boostSharpness가 이를 상쇄하고도 남는다
      state.sharpness = state.sharpness || {};
      state.sharpness[p.id] = Math.max(0, Math.round((sharpnessOf(p.id) - 1.2) * 10) / 10);

      const plan = state.training[p.id];
      const hasPlan = trainingAssigned(plan);
      const base = p.attrs || {};
      // 훈련 미배정 -> 그 선수 포지션에 자연스러운 능력치들 안에서만 고르게 성장 (엉뚱한 능력치는 안 큼)
      const targets = hasPlan ? trainingTargets(base, plan) : naturalAttrsFor(p.pos).map((k) => ({ key: k, cat: "balanced" }));
      if (!targets.length) return;

      const hid = p.hidden || {};
      const ca = Number(hid["현재능력"]);
      const pa = Number(hid["잠재능력"]);
      const hasCA = !isNaN(ca) && !isNaN(pa);
      const gapTotal = hasCA ? Math.max(0, pa - ca) : 0;

      const dev = devGrowthOf(p.id);
      const stagnant = dev.stagnantUntilDay && state.day < dev.stagnantUntilDay; // 큰 부상 후 성장 정체 기간

      // 성장 속도: 정규시즌(127일) 기준 나이대별 "시즌당 기대 성장치"를 하루 확률로 환산.
      // 갭(잠재-현재)이 커도 하루 확률 자체는 늘리지 않는다 — 그래야 유망주는 갭을 다 채우는 데 여러 시즌이 걸린다.
      // 18~28세만 성장 가능(29세부터 하드컷 — 전성기 유지 구간).
      const SEASON_DAYS = 127;
      const seasonTarget = age > 28 ? 0 : age <= 20 ? 7 : age <= 23 ? 5 : age <= 26 ? 3 : 1.5; // 27~28세
      const canGrow = hasCA && dev.caGained < gapTotal && seasonTarget > 0 && !stagnant;

      // 프로의식·야망(히든)이 높을수록 성장에 도움 (0.75~1.25배)
      const pro = Number(hid["프로의식"]);
      const amb = Number(hid["야망"]);
      const proAmbAvg = ((isNaN(pro) ? 10 : pro) + (isNaN(amb) ? 10 : amb)) / 2;
      const mentalMult = 0.75 + (proAmbAvg / 20) * 0.5;
      // 경기 감각(1군 출전으로 가장 많이, D리그 출전으로도 어느 정도 쌓임)이 높을수록 성장이 빠름 (0.6~1.4배).
      // 안 뛰면 감각이 녹슬어 성장도 늦어진다.
      const expMult = Math.max(0.6, Math.min(1.4, 0.6 + (sharpnessOf(p.id) / 100) * 0.8));

      const growChance = canGrow ? (seasonTarget / SEASON_DAYS) * mentalMult * expMult : 0;

      if (canGrow && Math.random() < growChance) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        const cur = attrGrowthOf(p.id, t.key);
        const baseV = Number(base[t.key]) || 50;
        const ceiling = Math.min(99, attrCeiling(t.key, p.height));
        if (baseV + cur < ceiling) {
          dev.attrs[t.key] = clampGrowthDelta(cur + 1);
          dev.caGained += 1;
        }
      } else if (hasPlan && !stagnant && Math.random() < 0.02) {
        // 재분배: 잠재능력이 다 찼거나(정체) 이번엔 성장에 실패한 경우, 훈련 방향에 맞춰 능력치를 소폭 재배치
        const targetKeySet = new Set(targets.map((t) => t.key));
        const donors = Object.keys(base).filter((k) => {
          if (targetKeySet.has(k)) return false;
          const d = attrGrowthOf(p.id, k);
          return d > -10 && (Number(base[k]) || 0) + d > 40;
        });
        if (donors.length) {
          const donor = donors[Math.floor(Math.random() * donors.length)];
          const t = targets[Math.floor(Math.random() * targets.length)];
          const tBase = Number(base[t.key]) || 50;
          const tCur = attrGrowthOf(p.id, t.key);
          const tCeiling = Math.min(99, attrCeiling(t.key, p.height));
          if (tBase + tCur < tCeiling) {
            dev.attrs[donor] = clampGrowthDelta(attrGrowthOf(p.id, donor) - 1);
            dev.attrs[t.key] = clampGrowthDelta(tCur + 1);
          }
        }
      }
    });
  });
}

function attrColor(v) {
  if (v >= 85) return "#57c07d";
  if (v >= 75) return "#9ed36a";
  if (v >= 65) return "#e6c84f";
  if (v >= 55) return "#e6984f";
  return "#aab0b8";
}

const PD_GROUPS = [
  ["마무리", ["근거리슛", "드라이빙레이업", "드라이빙덩크", "스탠딩덩크", "포스트컨트롤"]],
  ["슈팅", ["중거리슛", "3점슛", "자유투"]],
  ["플레이메이킹", ["패스정확도", "볼핸들링", "드리블속도"]],
  ["수비", ["골밑수비", "외곽수비", "스틸", "블록"]],
  ["리바운드", ["공격리바운드", "수비리바운드"]],
  ["피지컬", ["속도", "민첩성", "힘", "점프력", "체력"]],
];

function renderPlayerDetail(root) {
  const p = findPlayerById(selectedPlayerId);
  if (!p) {
    root.innerHTML = '<section class="empty-state">선수 정보를 찾을 수 없습니다.</section>';
    return;
  }
  const team = teamById(p.teamId);
  const attrs = p.attrs || {};
  const val = (k) => Number(attrs[k]) || 0;
  const s = (state.playerStats || {})[p.id];
  const f1 = (v) => (v == null ? "-" : v.toFixed(1));
  const salaryText = p.salary
    ? (p.salaryCur === "달러" ? `${(p.salary / 10000).toLocaleString()}만 달러` : `${(p.salary / 100000000).toFixed(1).replace(/\.0$/, "")}억원`)
    : "-";

  // 능력치 리스트 (테마별, FM식 색상) — 훈련 성장/노쇠화로 변한 능력치는 화살표로 표시
  const growthArrow = (k) => {
    const d = attrGrowthOf(p.id, k);
    if (!d) return "";
    const up = d > 0;
    return `<i style="font-style:normal; font-size:10px; font-weight:700; margin-right:4px; color:${up ? "#4caf7a" : "#e0685f"};" title="${up ? "훈련으로 성장" : "노쇠화·재분배로 하락"} (${up ? "+" : ""}${d})">${up ? "▲" : "▼"}${Math.abs(d)}</i>`;
  };
  const attrGridHtml = PD_GROUPS.map(([title, keys]) => `
    <div class="pd-attr-group">
      <h4>${title}</h4>
      ${keys.map((k) => `<div class="pd-attr-row"><span>${k}</span>${growthArrow(k)}<b style="background:${attrColor(val(k))};">${val(k)}</b></div>`).join("")}
    </div>`).join("");

  // 테마 평균 바 (능력치 분석)
  const barsHtml = PD_GROUPS.map(([title, keys]) => {
    const avg = Math.round(keys.reduce((a, k) => a + val(k), 0) / keys.length);
    return `
      <div class="pd-bar-row">
        <div style="display:flex; justify-content:space-between;"><span>${title}</span><strong>${avg}</strong></div>
        <div class="pd-bar"><i style="width:${Math.min(100, avg)}%; background:${attrColor(avg)};"></i></div>
      </div>`;
  }).join("");

  // 장점/단점 (상위 4개 / 하위 3개)
  const sorted = PD_GROUPS.flatMap(([, keys]) => keys).map((k) => [k, val(k)]).sort((a, b) => b[1] - a[1]);
  const prosHtml = sorted.slice(0, 4).map(([k, v]) => `<div class="pd-tag"><b style="background:#57c07d; color:#111; border-radius:3px; padding:0 5px;">${v}</b> ${k}</div>`).join("");
  const consHtml = sorted.slice(-3).reverse().map(([k, v]) => `<div class="pd-tag"><b style="background:#c0605c; color:#fff; border-radius:3px; padding:0 5px;">${v}</b> ${k}</div>`).join("");

  // 시즌/플레이오프 통계 (공용 테이블 빌더)
  const statTable = (st) => {
    if (!st || !st.g) return null;
    const perS = (k) => st[k] / st.g;
    const pctS = (m, a) => (st[a] > 0 ? ((st[m] / st[a]) * 100).toFixed(1) + "%" : "-");
    return `<div style="overflow-x:auto;"><table style="width:100%; font-size:12px; white-space:nowrap; background:transparent;">
        <thead><tr><th>경기</th><th>출전</th><th>득점</th><th>리바</th><th>어시</th><th>스틸</th><th>블록</th><th>야투%</th><th>3점%</th><th>자유투%</th><th>턴오버</th><th>파울</th><th>+/-</th></tr></thead>
        <tbody><tr>
          <td>${st.g}</td><td>${f1(perS("min"))}</td><td><strong>${f1(perS("pts"))}</strong></td><td>${f1(perS("reb"))}</td><td>${f1(perS("ast"))}</td>
          <td>${f1(perS("stl"))}</td><td>${f1(perS("blk"))}</td><td>${pctS("fgm", "fga")}</td><td>${pctS("tpm", "tpa")}</td><td>${pctS("ftm", "fta")}</td>
          <td>${f1(perS("to"))}</td><td>${f1(perS("pf"))}</td><td>${(perS("pm") > 0 ? "+" : "") + f1(perS("pm"))}</td>
        </tr></tbody></table></div>`;
  };
  const seasonHtml = statTable(s) || '<div class="empty-record">이번 시즌 출전 기록 없음</div>';
  const poStats = (state.poPlayerStats || {})[p.id];
  const poHtml = statTable(poStats);

  // 탭 컨텐츠
  let tabContent = "";
  if (playerDetailTab === "능력치") {
    tabContent = `<div class="pd-attr-grid">${attrGridHtml}</div>
      <h3 style="margin-top:16px;">시즌 통계</h3>${seasonHtml}
      ${poHtml ? `<h3 style="margin-top:16px;">플레이오프 통계</h3>${poHtml}` : ""}`;
  } else if (playerDetailTab === "통산 성적") {
    const f1c = (v) => (v == null || isNaN(v) ? "-" : v.toFixed(1));
    const pctC = (m2, a2) => (a2 ? `${((m2 / a2) * 100).toFixed(1)}%` : "-");
    const seasonRow = (label, s2, bold) => (s2 && s2.g ? `<tr>
        <td>${bold ? `<strong>${label}</strong>` : label}</td><td>${s2.g}</td><td>${f1c(s2.min / s2.g)}</td><td><strong>${f1c(s2.pts / s2.g)}</strong></td>
        <td>${f1c(s2.reb / s2.g)}</td><td>${f1c(s2.ast / s2.g)}</td><td>${f1c(s2.stl / s2.g)}</td><td>${f1c(s2.blk / s2.g)}</td>
        <td>${pctC(s2.fgm, s2.fga)}</td><td>${pctC(s2.tpm, s2.tpa)}</td>
      </tr>` : "");
    const hist = (state.seasonHistory || []).map((h) => ({ label: `시즌 ${h.season}`, s: (h.playerStats || {})[p.id] }));
    const tot = { g: 0, min: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0 };
    const addTo = (s2) => { if (s2) Object.keys(tot).forEach((k) => { tot[k] += s2[k] || 0; }); };
    hist.forEach((h) => addTo(h.s));
    addTo(s);
    const rows2 = [
      ...hist.map((h) => seasonRow(h.label, h.s)),
      seasonRow(`시즌 ${state.season} (진행중)`, s),
      hist.some((h) => h.s && h.s.g) ? seasonRow("통산", tot, true) : "",
    ].join("");
    tabContent = rows2.trim()
      ? `<div style="overflow-x:auto;"><table style="width:100%; font-size:12px; white-space:nowrap; background:transparent;">
          <thead><tr><th>시즌</th><th>경기</th><th>출전</th><th>득점</th><th>리바</th><th>어시</th><th>스틸</th><th>블록</th><th>야투%</th><th>3점%</th></tr></thead>
          <tbody>${rows2}</tbody></table></div>
        ${poHtml ? `<h3 style="margin-top:12px;">시즌 ${state.season} 플레이오프</h3>${poHtml}` : ""}`
      : '<div class="empty-record">아직 출전 기록이 없습니다</div>';
  } else if (playerDetailTab === "숨은 능력치") {
    const hid = p.hidden || {};
    const hv = (k) => { const v = Number(hid[k]); return isNaN(v) ? null : v; };
    const hidBar = (k, note) => {
      const v = hv(k);
      if (v == null) return `<div class="record-row"><span>${k}</span><strong style="color:#8a94a6">-</strong><em>${note || ""}</em></div>`;
      const color = v >= 15 ? "#4caf7a" : v >= 8 ? "#d9a13b" : "#d95b5b";
      return `<div class="record-row"><span>${k}</span><strong style="color:${color}">${v} / 20</strong><em>${note || ""}</em></div>`;
    };
    const cur = hv("현재능력"), pot = hv("잠재능력");
    tabContent = `
      <div class="home-panel" style="margin:0 0 10px;">
        <h3>성장</h3>
        <div class="record-row"><span>현재능력</span><strong>${cur != null ? cur : "-"}</strong><em></em></div>
        <div class="record-row"><span>잠재능력</span><strong>${pot != null ? pot : "-"}</strong><em>${cur != null && pot != null && pot > cur ? `+${pot - cur} 성장 여지` : ""}</em></div>
      </div>
      <div class="home-panel" style="margin:0 0 10px;">
        <h3>경기 반영 (매치엔진 직접 사용)</h3>
        ${hidBar("꾸준함", "낮을수록 경기별 기복이 큼")}
        ${hidBar("강심장", "클러치 슛·자유투 보정")}
        ${hidBar("큰경기", "플레이오프 무대 보정")}
        ${hidBar("부상빈도", "높을수록 잘 다침 (체력 관리와 연동)")}
        ${hidBar("더티플레이", "높을수록 파울 빈발")}
        ${hidBar("팀워크", "볼 흐름·어시스트 성향")}
      </div>
      <div class="home-panel" style="margin:0;">
        <h3>성격</h3>
        ${hidBar("리더십")}
        ${hidBar("프로의식", "높을수록 훈련 성장이 빠르고 노쇠화도 완만함")}
        ${hidBar("야망", "높을수록 훈련 성장이 빠름")}
        ${hidBar("충성도")}${hidBar("자존감")}
      </div>`;
  } else if (playerDetailTab === "훈련") {
    const plan = trainingPlanOf(p.id);
    const hid = p.hidden || {};
    const ca = Number(hid["현재능력"]);
    const pa = Number(hid["잠재능력"]);
    const hasCA = !isNaN(ca) && !isNaN(pa);
    const eca = hasCA ? effectiveCA(p.id, hid) : null;
    const gained = (state.devGrowth && state.devGrowth[p.id] && state.devGrowth[p.id].caGained) || 0;
    const capped = hasCA && eca >= pa;
    const ageP = ageAt(p.birth, p.age);
    const growWindowOver = ageP > 28;
    const declining = ageP >= 30;
    const progLabel = trainingAssigned(plan) ? TRAINING_PROGRAMS[plan.cat][plan.key].name : "미배정";
    const catLabel = { off: "공격", def: "수비", phys: "체력" }[plan.cat] || "";
    const trSelect = `<select id="pdTrSelect" data-tr-id="${p.id}">
      <option value="">미배정</option>
      ${Object.entries({ off: "공격", def: "수비", phys: "체력" }).map(([cat, label]) => `
        <optgroup label="${label}">
          ${Object.entries(TRAINING_PROGRAMS[cat]).map(([k, v]) => `<option value="${cat}:${k}" ${plan.cat === cat && plan.key === k ? "selected" : ""} title="${v.desc}">${v.name}</option>`).join("")}
        </optgroup>`).join("")}
    </select>`;
    const dev = (state.devGrowth && state.devGrowth[p.id]) || null;
    const deltaRows = dev && dev.attrs
      ? Object.entries(dev.attrs).filter(([, d]) => d).sort((a, b) => b[1] - a[1])
        .map(([k, d]) => `<div class="pd-tag"><b style="background:${d > 0 ? "#4caf7a" : "#c0605c"}; color:#111; border-radius:3px; padding:0 5px;">${d > 0 ? "+" : ""}${d}</b> ${k}</div>`).join("")
      : "";
    const stagnantNow = dev && dev.stagnantUntilDay && state.day < dev.stagnantUntilDay;
    const pstatP = (state.playerStats && state.playerStats[p.id]) || null;
    const avgMinP = pstatP && pstatP.g ? (pstatP.min / pstatP.g).toFixed(1) : null;
    const sharpP = Math.round(sharpnessOf(p.id));
    const sharpColorP = sharpP >= 70 ? "#4caf7a" : sharpP >= 40 ? "#d9a13b" : "#d95b5b";
    tabContent = `
      <div class="home-panel" style="margin:0 0 10px;">
        <h3>성장 현황</h3>
        <div class="record-row"><span>현재능력 → 잠재능력</span><strong>${hasCA ? `${eca}${gained > 0 ? ` (+${gained})` : ""} / ${pa}` : "-"}</strong><em>${stagnantNow ? "🚑 부상 후유증으로 성장 정체 중" : capped ? "성장 여지 소진 — 재분배만 가능" : growWindowOver ? "성장 구간(18~28세) 종료 — 재분배만 가능" : ""}</em></div>
        <div class="record-row"><span>나이 구간</span><strong>${ageP}세</strong><em>${declining ? "노쇠화 구간 — 능력치가 서서히 하락합니다" : ageP >= 24 ? "전성기" : "성장 구간"}</em></div>
        <div class="record-row"><span>경기 감각</span><strong style="color:${sharpColorP}">${sharpP}%</strong><em>1군 출전으로 가장 빨리, D리그 출전으로도 어느 정도 회복 — 안 뛰면 매일 조금씩 녹슬고 성장도 느려짐</em></div>
        <div class="record-row"><span>이번 시즌 1군 평균 출전시간</span><strong>${avgMinP != null ? `${avgMinP}분 (${pstatP.g}경기)` : "출전 기록 없음"}</strong><em></em></div>
      </div>
      <div class="home-panel" style="margin:0 0 10px;">
        <h3>현재 배정된 훈련 <span class="muted">— 공격·수비·체력 12개 프로그램 중 1개만 배정 가능</span></h3>
        <div class="record-row"><span>${trainingAssigned(plan) ? catLabel : "훈련"}</span><strong>${progLabel}</strong><em>${trainingAssigned(plan) ? "" : "미배정 — 포지션에 맞는 능력치가 고르게 성장합니다"}</em></div>
        <p style="margin-top:8px;">${trSelect}</p>
        <p class="muted" style="font-size:12px; margin-top:6px;">팀 전체 배정은 사이드바 '훈련' 화면에서도 관리할 수 있습니다. <button class="mini-button" id="pdGoTraining">→ 훈련 화면으로</button></p>
      </div>
      ${deltaRows ? `<div class="home-panel" style="margin:0;"><h3>성장/노쇠화로 변화한 능력치</h3>${deltaRows}</div>` : ""}`;
  } else {
    const injNow = injuryOf(p.id);
    const condNow = Math.round(conditionOf(p.id));
    const condColor = condNow >= 80 ? "#4caf7a" : condNow >= 55 ? "#d9a13b" : "#d95b5b";
    const sharpNow = Math.round(sharpnessOf(p.id));
    const sharpColor = sharpNow >= 70 ? "#4caf7a" : sharpNow >= 40 ? "#d9a13b" : "#d95b5b";
    const history = [...((state.injuryHistory && state.injuryHistory[p.id]) || [])].reverse();
    const severityColor = (days) => (days >= 180 ? "#c0605c" : days >= 30 ? "#d9a13b" : days >= 10 ? "#e6c84f" : "#8a94a6");
    const severityTag = (days) => (days >= 180 ? "시즌아웃급" : days >= 30 ? "중대" : days >= 10 ? "중간" : "경미");
    const totalDays = history.reduce((s, h) => s + h.days, 0);
    const historyHtml = history.length
      ? `<div style="overflow-x:auto;"><table style="width:100%; font-size:12px; white-space:nowrap;">
          <thead><tr><th>시즌</th><th>발생일</th><th>부상</th><th>결장일수</th><th>등급</th></tr></thead>
          <tbody>${history.map((h) => `
            <tr>
              <td>시즌 ${h.season}</td>
              <td>${fmtDate(h.day, { season: h.season })}</td>
              <td>${h.label}</td>
              <td>${h.days}일</td>
              <td><span style="color:${severityColor(h.days)};">${severityTag(h.days)}</span></td>
            </tr>`).join("")}</tbody>
        </table></div>`
      : '<div class="empty-record">부상 이력 없음</div>';
    tabContent = `
      <div class="home-panel" style="margin:0 0 10px;">
        <h3>현재 상태</h3>
        <p>체력(컨디션): <strong style="color:${condColor}">${condNow}%</strong> ${condNow < 55 ? "— 휴식이 필요합니다. 이 상태로 출전하면 기량 저하와 부상 위험이 커집니다" : condNow < 80 ? "— 다소 지쳐 있습니다" : "— 몸 상태가 좋습니다"}</p>
        <p>경기 감각: <strong style="color:${sharpColor}">${sharpNow}%</strong> ${sharpNow < 40 ? "— 경기 감각이 많이 떨어져 있습니다. 경기력 저하와 부상 위험이 커집니다" : sharpNow < 70 ? "— 감각이 다소 무뎌졌습니다. 출전 기회가 필요합니다" : "— 감각이 살아있습니다"}</p>
        <p>부상: <strong>${injNow ? `🚑 ${injNow.name} — 복귀까지 약 ${injNow.daysLeft}일` : "없음"}</strong></p>
        <p class="muted" style="font-size:12px;">체력은 경기 출전으로 소모되고 휴식일마다 회복됩니다. 경기 감각은 반대로 실전에 뛰어야(1군&gt;D리그) 오르고, 안 뛰면 매일 조금씩 떨어집니다. 둘 다 낮은 상태로 출전을 강행하면 경기력이 떨어지고 부상 확률이 높아집니다.</p>
      </div>
      <div class="home-panel" style="margin:0;">
        <h3>부상 이력 <span class="muted">— 통산 ${history.length}회${totalDays ? ` · 총 ${totalDays}일 결장` : ""}</span></h3>
        ${historyHtml}
      </div>`;
  }

  const tabs = ["능력치", "통산 성적", "숨은 능력치", "훈련", "부상"];
  const hidP = p.hidden || {};
  const caP = Number(hidP["현재능력"]);
  const paP = Number(hidP["잠재능력"]);
  const hasCAP = !isNaN(caP) && !isNaN(paP);
  const ecaP = hasCAP ? effectiveCA(p.id, hidP) : null;
  const gainedP = (state.devGrowth && state.devGrowth[p.id] && state.devGrowth[p.id].caGained) || 0;
  const curStars = Math.max(0.5, Math.min(5, ((hasCAP ? ecaP : p.ovr) - 58) / 7));
  const potStars = hasCAP ? Math.max(0.5, Math.min(5, (paP - 58) / 7)) : null;

  root.innerHTML = `
    <section>
      <div style="margin-bottom:12px; display:flex; gap:10px; align-items:center;">
        <button class="mini-button" id="pdBack">← 돌아가기</button>
        <span style="color:rgba(255,255,255,0.5); font-size:12px;">${team ? team.name : ""} · ${p.id}</span>
      </div>
      <div class="pd-wrap">
        <div class="pd-card">
          <div class="pd-photo">
            <img src="photo/face/${p.id}.png" alt="${p.name}"
              onerror="if(!this.dataset.e){this.dataset.e=1;this.src='photo/face/${p.id}.jpg';}else if(this.dataset.e==='1'){this.dataset.e=2;this.src='photo/face/${p.id}.webp';}else{this.style.display='none';this.parentElement.textContent='사진 없음 (photo/face/${p.id}.png)';}">
          </div>
          <div class="pd-name">${p.name}</div>
          <div class="pd-sub">${p.pos}${p.subPos ? "/" + p.subPos : ""} · ${p.age != null ? "만 " + p.age + "세" : ""} · ${p.nationality || ""}</div>
          ${(() => {
            const bdg = typeof computeBadges === "function" ? computeBadges(p) : [];
            return bdg.length
              ? `<div class="pd-badges">${bdg.map((k) => `<span class="badge-chip" title="${BADGES[k].desc}">${BADGES[k].icon} ${BADGES[k].name}</span>`).join("")}</div>`
              : "";
          })()}
          <div class="pd-ovr"><b>${p.ovr}</b><div style="font-size:12px; color:rgba(255,255,255,0.55);">${p.grade || ""}${gainedP > 0 ? ` · <span style="color:#4caf7a;">CA ${caP}→${ecaP}</span>` : ""}</div></div>
          <div class="pd-info-row"><span>현재 기량</span>${starsHtml(curStars)}</div>
          <div class="pd-info-row"><span>잠재 기량</span>${potStars != null ? starsHtml(potStars) : `<span class="pd-stars dim" title="데이터 없음">★★★★★</span>`}</div>
          <div class="pd-info-row"><span>신장</span><strong>${p.height || "-"} cm</strong></div>
          <div class="pd-info-row"><span>체중</span><strong>${p.weight || "-"} kg</strong></div>
          <div class="pd-info-row"><span>윙스팬</span><strong>${p.wingspan || "-"} cm</strong></div>
          <div class="pd-info-row"><span>연봉</span><strong>${salaryText}</strong></div>
          <div class="pd-info-row"><span>계약 만료</span><strong>${p.contractEnd || "-"}</strong></div>
          <div class="pd-info-row"><span>공격 OVR</span><strong>${p.atk ?? "-"}</strong></div>
          <div class="pd-info-row"><span>수비 OVR</span><strong>${p.def ?? "-"}</strong></div>
        </div>
        <div class="pd-card">
          <div class="pd-tabs">${tabs.map((t) => `<button class="${playerDetailTab === t ? "active" : ""}" data-pd-tab="${t}">${t}</button>`).join("")}</div>
          ${tabContent}
        </div>
        <div class="pd-card pd-right">
          <h3>능력치 분석</h3>
          ${barsHtml}
          <h3 style="margin-top:14px;">장점</h3>
          ${prosHtml}
          <h3 style="margin-top:14px;">단점</h3>
          ${consHtml}
        </div>
      </div>
    </section>`;

  const back = root.querySelector("#pdBack");
  if (back) back.onclick = () => { state.currentView = playerReturnView; render(); };
  root.querySelectorAll("[data-pd-tab]").forEach((btn) => {
    btn.onclick = () => { playerDetailTab = btn.dataset.pdTab; renderPlayerDetail(root); };
  });
  const goTraining = root.querySelector("#pdGoTraining");
  if (goTraining) goTraining.onclick = () => { state.currentView = "training"; render(); };
  const trSel = root.querySelector("#pdTrSelect");
  if (trSel) trSel.onchange = () => {
    const [cat, key] = trSel.value ? trSel.value.split(":") : [null, null];
    state.training = state.training || {};
    state.training[trSel.dataset.trId] = cat && key ? { cat, key } : null;
    saveState();
    renderPlayerDetail(root);
  };
}

function filteredNewsList() {
  const all = state.news || [];
  const filter = state.inboxFilter || "all";
  return filter === "all" ? all : all.filter((item) => item.sender === INBOX_TAB_SENDER[filter]);
}

function renderInbox(root) {
  const list = filteredNewsList();
  if (!list.length) {
    root.innerHTML = `<article class="mail-article"><p class="empty-record" style="padding:24px 4px;">이 분류에는 아직 소식이 없습니다.</p></article>`;
    return;
  }
  const reversed = [...list].reverse();
  const item = (state.selectedNewsId && list.find((n) => n.id === state.selectedNewsId)) || reversed[0];
  const meta = newsMetaOf(item.sender);
  const dateLabel = fmtDate(item.day, { year: true, season: item.season });

  if (meta.kind === "report") {
    root.innerHTML = `
      <article class="mail-article report-doc">
        <header class="article-header">
          <div class="staff-portrait" style="--portrait-tint: ${meta.color}"></div>
          <div class="article-crest report-stamp" style="--article-color: ${meta.color}">${meta.tag.replace(/\s/g, "").slice(0, 2)}</div>
          <div>
            <p>발신: ${meta.label} · 수신: 감독님 · ${dateLabel}</p>
            <h1>${item.title}</h1>
          </div>
        </header>
        <section class="news-card">
          <div class="news-ribbon" style="background:${meta.color}">${meta.tag}</div>
          <p>${item.body}</p>
        </section>
      </article>`;
    return;
  }

  root.innerHTML = `
    <article class="mail-article news-doc">
      <header class="article-header">
        <div class="staff-portrait press-portrait"></div>
        <div class="article-crest" style="--article-color: ${meta.color}">KBL</div>
        <div>
          <p>${meta.label} · ${dateLabel}</p>
          <h1>${item.title}</h1>
        </div>
      </header>
      <section class="news-card">
        <div class="news-ribbon" style="background:${meta.color}">${meta.tag}</div>
        <h2>${item.title}</h2>
        <p>${item.body}</p>
      </section>
    </article>`;
}

function renderDashboard(root) {
  const team = selectedTeam();
  const manager = state.manager || defaultManager();
  const standing = state.standings[team.id];
  const scheduleRows = state.schedule
    .filter((game) => !game.played && (game.home === team.id || game.away === team.id))
    .slice(0, 5)
    .map((game) => {
      const opponent = teamById(game.home === team.id ? game.away : game.home);
      return `<li><span>${fmtDateShort(game.day)}</span><strong>${opponent.name}</strong><em>${game.home === team.id ? "홈" : "원정"}</em></li>`;
    })
    .join("");
  const standingsRows = getStandings()
    .slice(0, 10)
    .map((item, index) => {
      const rate = item.wins + item.losses > 0 ? (item.wins / (item.wins + item.losses)).toFixed(3) : "-";
      return `
        <tr class="${item.id === team.id ? "mine" : ""}">
          <td>${index + 1}</td><td>${item.name}</td><td>${item.wins}</td><td>${item.losses}</td><td>${rate}</td>
        </tr>`;
    })
    .join("");

  root.innerHTML = `
    <section class="home-dashboard">
      <div class="home-hero">
        <div class="home-versus">
          <div class="home-manager-face"></div>
          <strong>VS</strong>
          <div class="home-team-watermark" style="--home-team-color:${team.color}">${team.city}</div>
        </div>
        <div class="home-next-match">
          <span>다음 경기</span>
          <h2>${team.name}의 다음 경기</h2>
          <p>${nextGameText()} | 감독 ${manager.name}</p>
          <div class="home-record-row">
            <span>승 <strong>${standing.wins}</strong></span>
            <span>패 <strong>${standing.losses}</strong></span>
            <span>리그 <strong>${getRank(team.id)}위</strong></span>
          </div>
        </div>
        <div class="home-schedule">
          <h3>${team.name} 경기일정</h3>
          <ul>${scheduleRows}</ul>
        </div>
        <div class="home-news">
          <h3>KBL 뉴스</h3>
          <p>${team.name} 프리시즌 선수단 점검 진행</p>
          <p>구단 관련 소식 없음</p>
        </div>
      </div>
      <div class="home-lower-grid">
        <section class="home-panel league-table-panel">
          <h3>리그 순위</h3>
          <table>
            <thead><tr><th>순위</th><th>구단</th><th>승</th><th>패</th><th>승률</th></tr></thead>
            <tbody>${standingsRows}</tbody>
          </table>
        </section>
        <section class="home-panel opponent-panel">
          <h3>다음 상대</h3>
          <div class="mini-court">
            ${introPlayer("G", 7, "12%", "22%")}
            ${introPlayer("F", 23, "55%", "30%")}
            ${introPlayer("C", 55, "38%", "55%")}
            ${introPlayer("F", 34, "18%", "72%")}
            ${introPlayer("G", 11, "66%", "72%")}
          </div>
        </section>
        <section class="home-panel notes-panel">
          <h3>선수 기록 (최근 경기)</h3>
          ${lastGameRecordsHtml()}
        </section>
        <section class="home-panel team-record-panel">
          <h3>팀 기록 (경기당 평균)</h3>
          ${teamRecordRowsHtml(team.id)}
        </section>
      </div>
    </section>`;
}

function defaultLineupConfig() {
  const roster = rosterFor(state.selectedTeamId);
  const byOvr = [...roster].sort((a, b) => (b.ovr || 0) - (a.ovr || 0));
  const starters = {};
  const used = new Set();
  for (const pos of ["PG", "SG", "SF", "PF", "C"]) {
    let cand = byOvr.find((p) => !used.has(p.playerId) && (p.mainPosition || p.position) === pos);
    if (!cand) cand = byOvr.find((p) => !used.has(p.playerId) && String(p.position || "").includes(pos));
    if (!cand) cand = byOvr.find((p) => !used.has(p.playerId));
    if (cand) { starters[pos] = cand.playerId; used.add(cand.playerId); }
  }
  const rotation = [...Object.values(starters)];
  for (const p of byOvr) {
    if (rotation.length >= 12) break;
    if (!rotation.includes(p.playerId)) rotation.push(p.playerId);
  }
  return { starters, rotation };
}

function setStarterAt(pos, pid) {
  const cfg = state.lineupConfig || (state.lineupConfig = defaultLineupConfig());
  for (const [p2, id2] of Object.entries(cfg.starters)) {
    if (p2 !== pos && id2 === pid) cfg.starters[p2] = cfg.starters[pos]; // 자리 맞교환
  }
  cfg.starters[pos] = pid;
  if (!cfg.rotation.includes(pid)) {
    if (cfg.rotation.length >= 12) {
      const drop = [...cfg.rotation].reverse().find((id) => !Object.values(cfg.starters).includes(id));
      cfg.rotation = cfg.rotation.filter((id) => id !== drop);
    }
    cfg.rotation.push(pid);
  }
  saveState();
}

// 선수단 화면 전용: D리그 포함 전체 선수 목록 (1군 로스터와 달리 D리그 선수도 표시)
function fullRosterFor(teamId) {
  if (typeof KBL_REAL_ROSTERS === "undefined" || !KBL_REAL_ROSTERS[teamId] || !KBL_REAL_ROSTERS[teamId].length) {
    return rosterFor(teamId).map((p) => ({ ...p, dleague: false }));
  }
  return buildRosterList(KBL_REAL_ROSTERS[teamId]).map((p) => ({ ...p, dleague: isDLeaguePlayer(p.playerId) }));
}

function renderRoster(root) {
  const roster = rosterFor(state.selectedTeamId); // 1군 후보만 (D리그 제외) — 선발 드롭다운용
  const allRoster = fullRosterFor(state.selectedTeamId); // D리그 포함 전체 — 명단 테이블용
  const cfg = state.lineupConfig || defaultLineupConfig();
  const rotSet = new Set(cfg.rotation);
  const starterIds = Object.values(cfg.starters || {});
  const stamOf = (p) => (p.attrs && Number(p.attrs["체력"])) || 70;
  const dleagueCount = allRoster.filter((p) => p.dleague).length;

  const posSlot = (pos) => {
    const cur = roster.find((p) => p.playerId === cfg.starters[pos]);
    return `
      <div class="slot-box">
        <div class="slot-pos">${pos}</div>
        ${cur ? playerFace(cur.playerId) : ""}
        <select data-starter-pos="${pos}">
          ${roster.map((p) => `<option value="${p.playerId}" ${cfg.starters[pos] === p.playerId ? "selected" : ""}>${p.name} (${p.mainPosition || p.position}·${p.ovr})</option>`).join("")}
        </select>
      </div>`;
  };

  const rows = [...allRoster]
    .sort((a, b) => (b.ovr || 0) - (a.ovr || 0))
    .map((p, i) => {
      const isStarter = !p.dleague && starterIds.includes(p.playerId);
      const inRot = !p.dleague && rotSet.has(p.playerId);
      const condColor = p.condition >= 80 ? "#4caf7a" : p.condition >= 55 ? "#d9a13b" : "#d95b5b";
      const condCell = p.injury
        ? `<span class="squad-tag youth">🚑 ${p.injury.name} ${p.injury.daysLeft}일</span>`
        : `<strong style="color:${condColor}">${p.condition}%</strong>`;
      const sharpColor = p.sharpness >= 70 ? "#4caf7a" : p.sharpness >= 40 ? "#d9a13b" : "#d95b5b";
      const roleTag = p.dleague
        ? `<span class="squad-tag youth">D리그</span>`
        : isStarter ? `<span class="squad-tag core">선발</span>` : inRot ? `<span class="squad-tag">로테이션</span>` : `<span class="squad-tag youth">제외</span>`;
      return `
        <tr class="${i % 2 ? "alt" : ""}${isStarter ? " starter-row" : ""}">
          <td><input type="checkbox" data-rot-id="${p.playerId}" ${inRot ? "checked" : ""} ${isStarter || p.dleague ? "disabled" : ""}></td>
          <td><input type="checkbox" data-dleague-id="${p.playerId}" ${p.dleague ? "checked" : ""}></td>
          <td>${roleTag}</td>
          <td style="text-align:left;"><span class="pcell">${playerFace(p.playerId)}<strong>${playerLink(p.playerId, p.name)}</strong></span>${p.age != null ? ` <small style="color:#8a94a6">(${p.age}세)</small>` : ""}</td>
          <td>${p.mainPosition || p.position}</td>
          <td>${p.position}</td>
          <td>${stamOf(p)}</td>
          <td>${condCell}</td>
          <td><strong style="color:${sharpColor}">${p.sharpness}%</strong></td>
          <td><span class="rating-pill">${p.ovr != null ? p.ovr : "-"}</span></td>
        </tr>`;
    })
    .join("");

  root.innerHTML = `
    <section class="home-panel">
      <h3>선발 라인업 <span class="muted">— 포지션별 선발 5명</span></h3>
      <div class="slot-row">${["PG", "SG", "SF", "PF", "C"].map(posSlot).join("")}</div>
    </section>
    <section class="home-panel">
      <h3>로테이션 명단 <span class="muted">— ${cfg.rotation.length}/12명 (선발 포함, 제외된 선수는 경기에 나서지 않습니다)</span></h3>
      <p class="muted" style="margin-bottom:8px;">D리그 로스터: <strong style="color:${dleagueCount >= 5 ? "#4caf7a" : "#d9a13b"}">${dleagueCount}명</strong> (최소 5명이어야 D리그 경기가 열립니다) — D리그로 설정한 선수는 1군 경기에 뛸 수 없습니다.</p>
      <div style="overflow-x:auto;">
        <table style="font-size:12px; white-space:nowrap;">
          <thead><tr><th>로테이션</th><th>D리그</th><th>역할</th><th>이름</th><th>주포지션</th><th>가능 포지션</th><th>체력</th><th>컨디션</th><th>감각</th><th>OVR</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="muted" style="margin-top:8px;">
        ${state.lineupConfig ? "사용자 설정이 적용 중입니다." : "현재 기본 추천 라인업입니다. 변경하면 저장됩니다."}
        <button id="lineup-reset" ${state.lineupConfig ? "" : "disabled"}>추천 라인업으로 초기화</button>
      </p>
    </section>`;

  root.querySelectorAll("[data-starter-pos]").forEach((sel) => {
    sel.onchange = () => { setStarterAt(sel.dataset.starterPos, sel.value); renderRoster(root); };
  });
  root.querySelectorAll("[data-rot-id]").forEach((chk) => {
    chk.onchange = () => {
      const c = state.lineupConfig || (state.lineupConfig = defaultLineupConfig());
      const id = chk.dataset.rotId;
      if (chk.checked) {
        if (c.rotation.length >= 12) { chk.checked = false; return; }
        if (!c.rotation.includes(id)) c.rotation.push(id);
      } else {
        c.rotation = c.rotation.filter((x) => x !== id);
      }
      saveState();
      renderRoster(root);
    };
  });
  root.querySelectorAll("[data-dleague-id]").forEach((chk) => {
    chk.onchange = () => {
      const id = chk.dataset.dleagueId;
      state.dleagueRoster = state.dleagueRoster || {};
      if (chk.checked) {
        state.dleagueRoster[id] = true;
        // D리그로 보내면 1군 선발/로테이션에서 자동 제외
        const c = state.lineupConfig || (state.lineupConfig = defaultLineupConfig());
        c.rotation = c.rotation.filter((x) => x !== id);
        Object.keys(c.starters || {}).forEach((pos) => { if (c.starters[pos] === id) delete c.starters[pos]; });
      } else {
        delete state.dleagueRoster[id];
      }
      saveState();
      renderRoster(root);
    };
  });
  const reset = root.querySelector("#lineup-reset");
  if (reset) reset.onclick = () => { state.lineupConfig = null; saveState(); renderRoster(root); };
}

function renderLineup(root) {
  const starters = rosterFor(state.selectedTeamId).slice(0, 5);
  root.innerHTML = `
    <section class="lineup-grid">
      ${starters
        .map(
          (player) => `
          <article class="lineup-slot">
            <span>${player.mainPosition || player.position}</span>
            <strong>${playerLink(player.playerId, player.name)}</strong>
            <p>${player.ovr != null ? `OVR ${player.ovr}` : `폼 ${player.form}`} | 컨디션 ${player.condition}%${player.injury ? ` | 🚑 ${player.injury.name} (${player.injury.daysLeft}일)` : ""}</p>
          </article>`,
        )
        .join("")}
    </section>
    <section class="empty-state">드래그 교체, 출전 시간 배분은 다음 단계에서 붙일 예정입니다. D리그 등록은 '선수단' 화면에서 할 수 있습니다.</section>`;
}

// 추천 플레이타임 배분: 로테이션 인원에 200분을 현실적 패턴으로 배분
function recommendedMinutesPlan() {
  const cfg = state.lineupConfig || defaultLineupConfig();
  const roster = rosterFor(state.selectedTeamId);
  const starterIds = ["PG", "SG", "SF", "PF", "C"].map((pos) => cfg.starters[pos]).filter(Boolean);
  const benchIds = cfg.rotation.filter((id) => !starterIds.includes(id));
  // 주전 5명 + 벤치 n명 가중치 (ENGINE_MIN_TARGET 형태) -> 200분 정규화
  const weights = [36, 34, 31, 29, 27, ...[14, 11, 9, 7, 5, 4, 3].slice(0, benchIds.length)];
  const ids = [...starterIds, ...benchIds];
  const wSum = weights.slice(0, ids.length).reduce((a, b) => a + b, 0);
  const plan = {};
  let acc = 0;
  ids.forEach((id, i) => {
    const v = i === ids.length - 1 ? 200 - acc : Math.round((weights[i] / wSum) * 200);
    plan[id] = Math.max(0, v);
    acc += v;
  });
  return plan;
}

function renderTactics(root) {
  const teamDefault = DEFAULT_PLAYBOOKS[state.selectedTeamId] || { off: "pns", def: "man" };
  const cur = state.playbook || teamDefault;
  const isDefault = !state.playbook;
  const card = (side, key) => {
    const pb = PLAYBOOKS[side][key];
    const active = cur[side] === key;
    const recommended = teamDefault[side] === key;
    return `
      <article class="pb-card${active ? " active" : ""}" data-side="${side}" data-key="${key}">
        <div class="pb-name">${pb.name}${recommended ? ' <span class="pb-rec">추천</span>' : ""}</div>
        <p class="pb-desc">${pb.desc}</p>
      </article>`;
  };
  root.innerHTML = `
    <section class="home-panel">
      <h3>공격 작전 <span class="muted">— 현재: ${PLAYBOOKS.off[cur.off].name}${isDefault ? " (팀 기본)" : ""}</span></h3>
      <div class="pb-grid">${Object.keys(PLAYBOOKS.off).map((k) => card("off", k)).join("")}</div>
    </section>
    <section class="home-panel">
      <h3>수비 작전 <span class="muted">— 현재: ${PLAYBOOKS.def[cur.def].name}</span></h3>
      <div class="pb-grid">${Object.keys(PLAYBOOKS.def).map((k) => card("def", k)).join("")}</div>
    </section>
    <section class="home-panel">
      <h3>플레이타임 배분 <span class="muted">— 총 200분을 로테이션 선수들에게 분배, 경기 자동 교체가 이 목표를 따릅니다</span></h3>
      ${(() => {
        const roster = rosterFor(state.selectedTeamId);
        const cfgL = state.lineupConfig || defaultLineupConfig();
        const rec = recommendedMinutesPlan();
        const plan = state.minutesPlan;
        const starterIds = ["PG", "SG", "SF", "PF", "C"].map((p) => cfgL.starters[p]).filter(Boolean);
        const rotIds = [...starterIds, ...cfgL.rotation.filter((id) => !starterIds.includes(id))];
        const valOf = (id) => (plan ? Math.round(Number(plan[id]) || 0) : rec[id] || 0);
        const sum = rotIds.reduce((s, id) => s + valOf(id), 0);
        const rows = rotIds.map((id, i) => {
          const p = roster.find((x) => x.playerId === id);
          if (!p) return "";
          const role = i < 5 ? ["PG", "SG", "SF", "PF", "C"][i] : `${i + 1}옵션`;
          return `<tr>
            <td>${i < 5 ? `<span class="squad-tag core">${role}</span>` : `<span class="squad-tag">${role}</span>`}</td>
            <td style="text-align:left;"><span class="pcell">${playerFace(id)}<strong>${p.name}</strong></span></td>
            <td>${p.mainPosition || p.position}</td>
            <td><span class="rating-pill">${p.ovr ?? "-"}</span></td>
            <td><input type="number" class="mp-input" data-mp-id="${id}" min="0" max="40" value="${valOf(id)}" style="width:64px; padding:4px 6px; background:#1b2531; color:#e8eef5; border:1px solid #33404f; border-radius:6px;"> 분</td>
          </tr>`;
        }).join("");
        return `
          <div style="overflow-x:auto;"><table style="font-size:12px; white-space:nowrap;">
            <thead><tr><th>역할</th><th>이름</th><th>주포지션</th><th>OVR</th><th>플레이타임</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>
          <p class="muted" style="margin-top:8px;">
            합계 <b style="color:${sum === 200 ? "#57c07d" : "#e6984f"};">${sum}</b> / 200분
            ${plan ? "· <b>사용자 배분 적용 중</b>" : "· 엔진 자동 배분 사용 중 (추천값 표시)"}
            — 합계가 200이 아니어도 경기에서는 200분 비율로 자동 보정됩니다.
            <button id="mp-rec">추천 배분 적용</button>
            <button id="mp-reset" ${plan ? "" : "disabled"}>엔진 자동 배분으로</button>
          </p>`;
      })()}
    </section>
    <section class="home-panel">
      <p class="muted">작전은 선수 능력치 위에 얹히는 성향 보정입니다. 로스터에 맞지 않는 작전(예: 슈터 없는 팀의 머니볼)은 오히려 독이 됩니다. <button id="pb-reset" ${isDefault ? "disabled" : ""}>팀 추천 작전으로 되돌리기</button></p>
    </section>`;
  root.querySelectorAll(".pb-card").forEach((el) => {
    el.addEventListener("click", () => {
      const next = { ...cur, [el.dataset.side]: el.dataset.key };
      state.playbook = next;
      saveState();
      renderTactics(root);
    });
  });
  const reset = root.querySelector("#pb-reset");
  if (reset) reset.addEventListener("click", () => { state.playbook = null; saveState(); renderTactics(root); });

  // 플레이타임 배분 핸들러
  root.querySelectorAll(".mp-input").forEach((inp) => {
    inp.onchange = () => {
      const p = state.minutesPlan || (state.minutesPlan = { ...recommendedMinutesPlan() });
      p[inp.dataset.mpId] = Math.max(0, Math.min(40, Number(inp.value) || 0));
      saveState();
      renderTactics(root);
    };
  });
  const mpRec = root.querySelector("#mp-rec");
  if (mpRec) mpRec.onclick = () => { state.minutesPlan = { ...recommendedMinutesPlan() }; saveState(); renderTactics(root); };
  const mpReset = root.querySelector("#mp-reset");
  if (mpReset) mpReset.onclick = () => { state.minutesPlan = null; saveState(); renderTactics(root); };
}

// ===== 훈련(육성) 화면: 선수별 공격/수비/체력 훈련 배정 =====
function renderTraining(root) {
  const roster = [...rosterFor(state.selectedTeamId)].sort((a, b) => (b.ovr || 0) - (a.ovr || 0));
  const CAT_LABEL = { off: "공격", def: "수비", phys: "체력" };

  const programSelect = (pid, plan) => `<select data-tr-id="${pid}">
      <option value="">미배정</option>
      ${Object.entries(CAT_LABEL).map(([cat, label]) => `
        <optgroup label="${label}">
          ${Object.entries(TRAINING_PROGRAMS[cat]).map(([k, v]) => `<option value="${cat}:${k}" ${plan.cat === cat && plan.key === k ? "selected" : ""} title="${v.desc}">${v.name}</option>`).join("")}
        </optgroup>`).join("")}
    </select>`;

  const rows = roster.map((p, i) => {
    const pid = p.playerId;
    const plan = trainingPlanOf(pid);
    const hid = p.hidden || {};
    const ca = Number(hid["현재능력"]);
    const pa = Number(hid["잠재능력"]);
    const hasCA = !isNaN(ca) && !isNaN(pa);
    const eca = hasCA ? effectiveCA(pid, hid) : null;
    const gained = (state.devGrowth && state.devGrowth[pid] && state.devGrowth[pid].caGained) || 0;
    const capped = hasCA && eca >= pa;
    const devP = state.devGrowth && state.devGrowth[pid];
    const stagnantP = devP && devP.stagnantUntilDay && state.day < devP.stagnantUntilDay;
    const caCell = !hasCA
      ? `<span style="color:#8a94a6;">-</span>`
      : capped
        ? `<span title="현재능력이 잠재능력에 도달 — 더 이상 성장하지 않지만 훈련으로 능력치 재분배는 가능합니다">${pa} <small style="color:#8a94a6;">(MAX)</small></span>`
        : `${eca}${gained > 0 ? ` <small style="color:#4caf7a;">(+${gained})</small>` : ""} <small style="color:#8a94a6;">/ ${pa}</small>`;
    return `
      <tr class="${i % 2 ? "alt" : ""}">
        <td style="text-align:left;"><span class="pcell">${playerFace(pid)}<strong>${playerLink(pid, p.name)}</strong></span></td>
        <td>${p.mainPosition || p.position}</td>
        <td>${p.age != null ? p.age + "세" : "-"}</td>
        <td>${caCell}${stagnantP ? ` <span title="부상 후유증으로 성장 정체 중">🚑</span>` : ""}</td>
        <td>${programSelect(pid, plan)}</td>
      </tr>`;
  }).join("");

  root.innerHTML = `
    <section class="home-panel">
      <h3>훈련(육성) <span class="muted">— 선수 1명당 공격·수비·체력 12개 프로그램 중 단 1개만 배정할 수 있습니다</span></h3>
      <p class="muted" style="font-size:12px;">훈련을 배정하지 않으면 <b>그 선수 포지션에 자연스러운 능력치들이 고르게</b> 성장합니다(센터는 골밑·리바운드·힘 계열 등). 12개 프로그램 중 하나를 배정하면 포지션과 무관하게 그 방향으로 집중 성장합니다 — <b>패스 잘하는 센터, 3점 쏘는 센터</b>처럼 포지션을 벗어난 유형을 만들 때 씁니다. 나이대별로 한 시즌(약 127일)에 오르는 양이 정해져 있어(18~20세 약 7 · 21~23세 약 5 · 24~26세 약 3 · 27~28세 약 1.5), 갭이 큰 유망주는 잠재능력에 도달하기까지 여러 시즌이 걸립니다. <b>프로의식·야망이 높거나 경기 감각이 좋을수록</b> 성장이 빨라집니다(최대 약 1.75배). <b>경기 감각은 1군 출전이 가장 잘 채워주고 D리그 출전도 어느 정도 도움이 되지만, 아예 안 뛰면 매일 조금씩 녹슬어서 경기력도 떨어지고 부상 위험도 커지고 성장도 느려집니다</b> — 그래서 당장 못 쓰는 유망주는 벤치에 썩히기보다 D리그로 보내 감각을 유지시켜주는 편이 낫습니다. 성장은 18~28세까지만 진행되며 24~29세는 전성기(유지 구간), 30세부터는 훈련 여부와 무관하게 능력치가 서서히 하락합니다(프로의식이 높으면 완만). <b>큰 부상(15일 이상 결장)</b>을 당하면 회복 후 한동안 성장이 정체되고, 심하면 확률적으로 능력치가 실제로 퇴보하기도 합니다. 훈련/재분배로 한 능력치가 오를 수 있는 폭에는 한도가 있고(패스 50짜리 선수가 99까지 오르는 식의 비현실적 성장은 안 됨), 신체 조건과 안 맞는 성장에는 별도 한계가 있습니다 — 장신 빅맨은 속도·민첩성·3점슛이, 단신 선수는 리바운드·힘·블록이 일정 수준 이상 오르지 않습니다. 능력치 변화는 선수 상세의 '능력치' 탭에서 ▲▼ 화살표로 확인할 수 있습니다.</p>
      <div style="overflow-x:auto;">
        <table style="font-size:12px; white-space:nowrap;">
          <thead><tr><th>이름</th><th>포지션</th><th>나이</th><th>현재/잠재능력</th><th>훈련 프로그램 (1개만 선택)</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;

  root.querySelectorAll("select[data-tr-id]").forEach((sel) => {
    sel.onchange = () => {
      const pid = sel.dataset.trId;
      const [cat, key] = sel.value ? sel.value.split(":") : [null, null];
      state.training = state.training || {};
      state.training[pid] = cat && key ? { cat, key } : null;
      saveState();
    };
  });
}

function tacticControl(key, label, help) {
  return `
    <article class="tactic-box">
      <label>
        ${label}
        <input name="${key}" type="range" min="20" max="80" value="${state.tactics[key]}" />
      </label>
      <div class="tactic-value">${state.tactics[key]}</div>
      <p>${help}</p>
    </article>`;
}

function ensureBoxScore(game) {
  if (!game || !game.played) return;
  // 구버전 결과지(슛 지표 없는 형식)는 새 형식으로 재생성
  if (game.box && game.box.home && game.box.home[0] && game.box.home[0].fga === undefined) game.box = null;
  if (game.box) return;
  game.box = {
    home: generateBoxScore(game.home, game.homeScore, game.awayScore),
    away: generateBoxScore(game.away, game.awayScore, game.homeScore),
  };
}

function boxScoreHtml(game) {
  if (!game || !game.box) return "";
  const pct = (m, a) => (a > 0 ? ((m / a) * 100).toFixed(1) + "%" : "-");
  const side = (teamId, list, score) => {
    const topPts = Math.max(...list.map((p) => p.pts));
    const rows2 = list
      .map((p) => `
        <tr class="${p.pts === topPts ? "mine" : ""}">
          <td style="text-align:left; position:sticky; left:0; background:inherit;">${playerLink(p.id, p.name)}</td><td>${p.pos}</td><td>${p.min}</td>
          <td><strong>${p.pts}</strong></td><td>${p.reb}</td><td>${p.ast}</td><td>${p.stl}</td><td>${p.blk}</td>
          <td>${p.fgm}-${p.fga}</td><td>${pct(p.fgm, p.fga)}</td>
          <td>${p.tpm}-${p.tpa}</td><td>${pct(p.tpm, p.tpa)}</td>
          <td>${p.ftm}-${p.fta}</td><td>${pct(p.ftm, p.fta)}</td>
          <td>${p.oreb}</td><td>${p.dreb}</td><td>${p.to}</td><td>${p.pf}</td>
          <td style="color:${p.pm > 0 ? "#57c07d" : p.pm < 0 ? "#e07a7a" : "inherit"};">${p.pm > 0 ? "+" : ""}${p.pm}</td>
        </tr>`)
      .join("");
    const sum = (key) => list.reduce((s, p) => s + p[key], 0);
    return `
      <div style="margin-top:10px;">
        <h4 style="margin:6px 0;">${teamById(teamId).name} — ${score}점</h4>
        <div style="overflow-x:auto;">
          <table style="width:100%; font-size:11px; white-space:nowrap; min-width:900px;">
            <thead><tr>
              <th style="text-align:left;">선수</th><th>포지션</th><th>출전</th><th>득점</th><th>리바</th><th>어시</th><th>스틸</th><th>블록</th>
              <th>야투</th><th>야투%</th><th>3점</th><th>3점%</th><th>자유투</th><th>자유투%</th>
              <th>공리바</th><th>수리바</th><th>턴오버</th><th>파울</th><th>+/-</th>
            </tr></thead>
            <tbody>${rows2}</tbody>
            <tfoot><tr style="font-weight:bold; border-top:2px solid rgba(255,255,255,0.2);">
              <td style="text-align:left;">팀 합계</td><td>-</td><td>${sum("min")}</td>
              <td>${sum("pts")}</td><td>${sum("reb")}</td><td>${sum("ast")}</td><td>${sum("stl")}</td><td>${sum("blk")}</td>
              <td>${sum("fgm")}-${sum("fga")}</td><td>${pct(sum("fgm"), sum("fga"))}</td>
              <td>${sum("tpm")}-${sum("tpa")}</td><td>${pct(sum("tpm"), sum("tpa"))}</td>
              <td>${sum("ftm")}-${sum("fta")}</td><td>${pct(sum("ftm"), sum("fta"))}</td>
              <td>${sum("oreb")}</td><td>${sum("dreb")}</td><td>${sum("to")}</td><td>${sum("pf")}</td><td>-</td>
            </tr></tfoot>
          </table>
        </div>
      </div>`;
  };
  const pbpHtml = game.pbp && game.pbp.length
    ? `
      <details style="margin-top:12px;">
        <summary style="cursor:pointer; color:#ffa51f; font-weight:bold;">📻 문자중계 보기 (${game.pbp.length}건)</summary>
        <div style="max-height:320px; overflow-y:auto; font-size:12px; line-height:1.8; margin-top:8px; padding:8px; background:rgba(0,0,0,0.25); border-radius:4px;">
          ${game.pbp.map((l) => `<div>${l}</div>`).join("")}
        </div>
      </details>`
    : "";
  return `
    <article class="panel" style="margin-top:8px; margin-bottom:8px; padding:12px;">
      <h3>결과지 — ${fmtDate(game.day)} ${teamById(game.home).name} ${game.homeScore} : ${game.awayScore} ${teamById(game.away).name}${game.playoff ? ` (${game.stage} ${game.gameNo}차전)` : ""}${game.ot ? " · 연장" : ""}</h3>
      ${side(game.home, game.box.home, game.homeScore)}
      ${side(game.away, game.box.away, game.awayScore)}
      ${pbpHtml}
    </article>`;
}

let openBoxIndex = null; // 일정 화면에서 열어둔 결과지 (내 경기 목록 기준 인덱스)

function renderSchedule(root) {
  const myId = state.selectedTeamId;
  // 내 팀 54경기 + 내 플레이오프 경기
  const poGames = state.playoffs ? state.playoffs.results.filter(involvesMyTeam) : [];
  const myGames = [...state.schedule.filter(involvesMyTeam), ...poGames];
  const rows = myGames
    .map((game, index) => {
      const isHome = game.home === myId;
      const opponent = teamById(isHome ? game.away : game.home);
      let result = "예정";
      if (game.played) {
        const myScore = isHome ? game.homeScore : game.awayScore;
        const oppScore = isHome ? game.awayScore : game.homeScore;
        result = `<span class="status-pill ${myScore > oppScore ? "win" : "loss"}">${myScore > oppScore ? "승" : "패"} ${myScore}:${oppScore}</span>`;
      }
      const boxRow = index === openBoxIndex && game.box
        ? `<tr><td colspan="5" style="padding:0;">${boxScoreHtml(game)}</td></tr>`
        : "";
      return `
        <tr class="${index === openBoxIndex ? "mine" : ""}" data-game-index="${index}" style="${game.played ? "cursor:pointer;" : ""}" title="${game.played ? "클릭하면 결과지가 열립니다" : ""}">
          <td>${game.playoff ? game.stage : `${index + 1}R`}</td>
          <td>${fmtDateShort(game.day)}</td>
          <td>${isHome ? "홈" : "원정"}</td>
          <td><strong>${opponent.name}</strong></td>
          <td>${result}</td>
        </tr>${boxRow}`;
    })
    .join("");

  // 최근 리그 결과 (최근 3일)
  const recent = state.schedule
    .filter((g) => g.played && g.day >= state.day - 3 && !involvesMyTeam(g))
    .slice(-6)
    .map((g) => `<li>${teamById(g.home).name} ${g.homeScore} : ${g.awayScore} ${teamById(g.away).name}</li>`)
    .join("");

  const playedCount = myGames.filter((g) => g.played).length;
  root.innerHTML = `
    <section class="table-wrap">
      <p style="padding:8px 4px; color:#666;">시즌 ${state.season} · ${fmtDate(state.day, { year: true })} · 내 팀 ${playedCount}/${myGames.length}경기 소화 ${state.phase !== "regular" ? `· <strong>${state.phase === "playoff" ? "플레이오프 진행중" : "오프시즌"}</strong>` : ""} · 끝난 경기를 클릭하면 결과지가 열립니다</p>
      <table>
        <thead><tr><th>라운드</th><th>날짜</th><th>홈/원정</th><th>상대</th><th>결과</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${recent ? `<div style="padding:10px 4px;"><h3 style="font-size:13px; margin-bottom:6px;">최근 리그 결과</h3><ul style="font-size:12px; color:#555; list-style:none;">${recent}</ul></div>` : ""}
    </section>`;

  root.querySelectorAll("tr[data-game-index]").forEach((tr) => {
    tr.onclick = () => {
      const idx = Number(tr.dataset.gameIndex);
      const game = myGames[idx];
      if (!game || !game.played) return;
      ensureBoxScore(game); // 결과지 기능 도입 전에 치른 경기는 즉석 생성
      openBoxIndex = openBoxIndex === idx ? null : idx;
      renderSchedule(root);
    };
  });
}

function teamResults(teamId) {
  // 시간순 승패 목록 (true = 승)
  return state.schedule
    .filter((g) => g.played && (g.home === teamId || g.away === teamId))
    .sort((a, b) => a.day - b.day)
    .map((g) => (g.home === teamId ? g.homeScore > g.awayScore : g.awayScore > g.homeScore));
}

function streakText(results) {
  if (!results.length) return "-";
  const last = results[results.length - 1];
  let n = 0;
  for (let i = results.length - 1; i >= 0 && results[i] === last; i -= 1) n += 1;
  return `${n}${last ? "승" : "패"}`;
}

function renderLeague(root) {
  const standings = getStandings();
  const leader = standings[0];
  const rows = standings
    .map((team, index) => {
      const results = teamResults(team.id);
      const gb = ((leader.wins - team.wins) + (team.losses - leader.losses)) / 2;
      const gbText = gb === 0 ? "-" : (gb % 1 === 0 ? gb : gb.toFixed(1));
      const last5 = results.slice(-5).map((w) => (w
        ? '<span style="color:#57c07d;">승</span>'
        : '<span style="color:#e07a7a;">패</span>')).join("");
      const winRate = team.wins + team.losses > 0 ? (team.wins / (team.wins + team.losses)).toFixed(3) : "-";
      return `
        <tr class="${team.id === state.selectedTeamId ? "mine" : ""}">
          <td>${index + 1}${index < 6 ? ' <span style="color:#57c07d; font-size:10px;">PO</span>' : ""}</td>
          <td><strong>${team.name}</strong></td>
          <td>${team.wins}</td>
          <td>${team.losses}</td>
          <td>${winRate}</td>
          <td>${gbText}</td>
          <td>${streakText(results)}</td>
          <td style="letter-spacing:2px;">${last5 || "-"}</td>
        </tr>`;
    })
    .join("");

  // 플레이오프 브래킷 / 오프시즌 패널
  let playoffHtml = "";
  if (state.playoffs) {
    const seriesRows = state.playoffs.series
      .map((s) => {
        const line = `${teamById(s.high).name} <strong>${s.highWins}</strong> : <strong>${s.lowWins}</strong> ${teamById(s.low).name}`;
        const status = s.winner ? ` — <span style="color:#57c07d;">${teamById(s.winner).name} 진출</span>` : "";
        return `<li style="padding:4px 0;">${line}${status}</li>`;
      })
      .join("");
    playoffHtml = `
      <article class="panel" style="margin-top:12px; padding:12px;">
        <h3>${state.phase === "offseason" ? "플레이오프 최종 결과" : `플레이오프 - ${state.playoffs.stage}`}</h3>
        <ul style="list-style:none; margin-top:8px;">${seriesRows}</ul>
      </article>`;
  }
  if (state.phase === "offseason") {
    playoffHtml += `
      <article class="panel" style="margin-top:12px; padding:12px; text-align:center;">
        <h3>🏆 시즌 ${state.season} 챔피언: ${teamById(state.champion).name}</h3>
        <button class="mini-button blue-action" data-action="new-season" style="margin-top:10px;">시즌 ${state.season + 1} 시작</button>
      </article>`;
    if (state.awards) {
      const aw = state.awards;
      const row = (label, a) => (a ? `<div class="record-row"><span>${label}</span><strong>${a.name}</strong><em>${a.team ? a.team.split(" ").pop() : ""} · ${a.line || ""}</em></div>` : "");
      const best5Html = (aw.best5 || []).filter(Boolean)
        .map((a) => `<div class="record-row"><span>${a.pos}</span><strong>${a.name}</strong><em>${a.team.split(" ").pop()} · ${a.line}</em></div>`)
        .join("");
      playoffHtml += `
        <article class="panel" style="margin-top:12px; padding:12px;">
          <h3>🎖️ 시즌 ${aw.season} 시상식</h3>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px; margin-top:10px;">
            <div>
              ${row("국내선수 MVP", aw.mvpK)}
              ${row("외국선수 MVP", aw.mvpF)}
              ${row("신인선수상", aw.rookie)}
              ${row("최우수 수비상", aw.defensive)}
              ${row("식스맨상", aw.sixth)}
              ${row("기량발전상", aw.improved)}
              ${row("페어플레이상", aw.fairplay)}
              <div class="record-row"><span>감독상</span><strong>${aw.coach}</strong><em>정규리그 1위</em></div>
            </div>
            <div>
              <h4 style="margin:0 0 6px; color:#ffa51f; font-size:12px;">베스트5</h4>
              ${best5Html}
            </div>
          </div>
        </article>`;
    }
  }

  // D리그(2군) 순위 — 별도 로스터로 진행되는 부속 리그
  const dst = state.dleagueStandings || {};
  const dRows = teams
    .map((team) => ({ team, s: dst[team.id] || { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 } }))
    .sort((a, b) => b.s.wins - a.s.wins || a.s.losses - b.s.losses)
    .map(({ team, s }) => {
      const cnt = dleagueCountFor(team.id);
      const winRate = s.wins + s.losses > 0 ? (s.wins / (s.wins + s.losses)).toFixed(3) : "-";
      return `<tr class="${team.id === state.selectedTeamId ? "mine" : ""}">
        <td><strong>${team.name}</strong></td>
        <td>${s.wins}</td><td>${s.losses}</td><td>${winRate}</td>
        <td style="color:${cnt >= 5 ? "#4caf7a" : "#d9a13b"};">${cnt}명</td>
      </tr>`;
    })
    .join("");
  const dPlayed = (state.dleagueSchedule || []).filter((g) => g.played).length;
  const dTotal = (state.dleagueSchedule || []).length;
  const dleagueHtml = `
    <article class="panel" style="margin-top:12px; padding:12px;">
      <h3>KBL D리그 <span class="muted" style="font-size:12px;">— 시즌 ${state.season} · ${dPlayed}/${dTotal}경기 진행 · 로스터 5명 미만인 팀의 경기는 보류됩니다</span></h3>
      <table style="margin-top:8px;">
        <thead><tr><th>팀</th><th>승</th><th>패</th><th>승률</th><th>D리그 로스터</th></tr></thead>
        <tbody>${dRows}</tbody>
      </table>
      <p class="muted" style="margin-top:8px; font-size:12px;">상무 농구단은 로스터 구성 전이라 아직 D리그 일정에 포함되지 않습니다.</p>
    </article>`;

  root.innerHTML = `
    <section class="table-wrap">
      <p style="padding:8px 4px; color:#666;">시즌 ${state.season} 정규리그 (상위 6팀 플레이오프 진출)</p>
      <table>
        <thead><tr><th>순위</th><th>팀</th><th>승</th><th>패</th><th>승률</th><th>게임차</th><th>연속</th><th>최근 5경기</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${playoffHtml}
      ${dleagueHtml}
    </section>`;
}

// ===== 기록 탭 (팀/선수 시즌 평균) =====
let recordsTab = "team";
let recordsScope = "regular"; // regular | playoff
let recSortKey = "pts";
let recSortDir = -1;
let recordsTeamFilter = "";

function renderRecords(root) {
  const fmtPct = (v) => (v > 0 ? v.toFixed(1) + "%" : "-");
  const f1 = (v) => (typeof v === "number" ? v.toFixed(1) : v);

  const tStatsSrc = recordsScope === "playoff" ? (state.poTeamStats || {}) : (state.teamStats || {});
  const pStatsSrc = recordsScope === "playoff" ? (state.poPlayerStats || {}) : (state.playerStats || {});

  let cols, rows;
  if (recordsTab === "team") {
    cols = [["팀", "name"], ["경기", "g"], ["득점", "pts"], ["실점", "opp"], ["리바운드", "reb"], ["어시스트", "ast"], ["스틸", "stl"], ["블록", "blk"], ["야투", "fgm"], ["야투%", "fgpct"], ["3점슛", "tpm"], ["3점슛%", "tppct"], ["자유투", "ftm"], ["자유투%", "ftpct"], ["공리바", "oreb"], ["수리바", "dreb"], ["턴오버", "to"], ["파울", "pf"]];
    rows = teams.map((team) => {
      const t = tStatsSrc[team.id];
      if (!t || !t.g) return { name: team.name, g: 0 };
      return {
        name: team.name, g: t.g,
        pts: t.pts / t.g, opp: t.opp / t.g, reb: t.reb / t.g, ast: t.ast / t.g, stl: t.stl / t.g, blk: t.blk / t.g,
        fgm: t.fgm / t.g, fga: t.fga / t.g, fgpct: t.fga ? (t.fgm / t.fga) * 100 : 0,
        tpm: t.tpm / t.g, tpa: t.tpa / t.g, tppct: t.tpa ? (t.tpm / t.tpa) * 100 : 0,
        ftm: t.ftm / t.g, fta: t.fta / t.g, ftpct: t.fta ? (t.ftm / t.fta) * 100 : 0,
        oreb: t.oreb / t.g, dreb: t.dreb / t.g, to: t.to / t.g, pf: t.pf / t.g,
      };
    });
  } else {
    cols = [["선수", "name"], ["팀", "team"], ["포지션", "pos"], ["경기", "g"], ["출전", "min"], ["득점", "pts"], ["리바", "reb"], ["어시", "ast"], ["스틸", "stl"], ["블록", "blk"], ["야투", "fgm"], ["야투%", "fgpct"], ["3점", "tpm"], ["3점%", "tppct"], ["자유투", "ftm"], ["자유투%", "ftpct"], ["공리바", "oreb"], ["수리바", "dreb"], ["턴오버", "to"], ["파울", "pf"], ["+/-", "pm"]];
    rows = Object.entries(pStatsSrc)
      .filter(([, s]) => s.g > 0 && (!recordsTeamFilter || s.team === recordsTeamFilter))
      .map(([pid, s]) => ({
        pid, name: s.name, team: (teamById(s.team) || {}).name || s.team, pos: s.pos, g: s.g,
        min: s.min / s.g, pts: s.pts / s.g, reb: s.reb / s.g, ast: s.ast / s.g, stl: s.stl / s.g, blk: s.blk / s.g,
        fgm: s.fgm / s.g, fga: s.fga / s.g, fgpct: s.fga ? (s.fgm / s.fga) * 100 : 0,
        tpm: s.tpm / s.g, tpa: s.tpa / s.g, tppct: s.tpa ? (s.tpm / s.tpa) * 100 : 0,
        ftm: s.ftm / s.g, fta: s.fta / s.g, ftpct: s.fta ? (s.ftm / s.fta) * 100 : 0,
        oreb: s.oreb / s.g, dreb: s.dreb / s.g, to: s.to / s.g, pf: s.pf / s.g, pm: s.pm / s.g,
      }));
  }

  if (recordsScope === "playoff") rows = rows.filter((r) => r.g); // PO 미진출 팀/선수 제외

  const validKeys = new Set(cols.map(([, k]) => k));
  if (!validKeys.has(recSortKey)) recSortKey = "pts";
  rows.sort((a, b) => {
    const va = a[recSortKey], vb = b[recSortKey];
    if (typeof va === "string" || typeof vb === "string") return recSortDir * String(va ?? "").localeCompare(String(vb ?? ""), "ko");
    return recSortDir * ((va || 0) - (vb || 0));
  });

  const thead = cols
    .map(([label, key]) => `<th data-rec-sort="${key}" style="cursor:pointer;">${label}${recSortKey === key ? (recSortDir < 0 ? " ▼" : " ▲") : ""}</th>`)
    .join("");
  const body = rows
    .map((r) => {
      if (!r.g) return `<tr><td><strong>${r.name}</strong></td><td colspan="${cols.length - 1}" style="color:#888;">기록 없음</td></tr>`;
      const cells = cols.map(([, key]) => {
        if (key === "name") return `<td style="text-align:left;"><span class="pcell">${playerFace(r.pid)}<strong>${playerLink(r.pid, r.name)}</strong></span></td>`;
        if (key === "team" || key === "pos") return `<td>${r[key]}</td>`;
        if (key === "g") return `<td>${r.g}</td>`;
        // 야투/3점/자유투: 경기당 평균 성공 수 표기
        if (key.endsWith("pct")) return `<td>${fmtPct(r[key])}</td>`;
        if (key === "pm") return `<td style="color:${r.pm > 0 ? "#57c07d" : r.pm < 0 ? "#e07a7a" : "inherit"};">${r.pm > 0 ? "+" : ""}${f1(r.pm)}</td>`;
        return `<td>${f1(r[key])}</td>`;
      }).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const tabBtn = (key, label) => `<button class="mini-button" data-rec-tab="${key}" style="${recordsTab === key ? "" : "background:rgba(255,255,255,0.15);"}">${label}</button>`;
  const scopeBtn = (key, label) => `<button class="mini-button" data-rec-scope="${key}" style="${recordsScope === key ? "" : "background:rgba(255,255,255,0.15);"}">${label}</button>`;
  root.innerHTML = `
    <section class="table-wrap">
      <div style="display:flex; gap:8px; align-items:center; padding:8px 4px; flex-wrap:wrap;">
        ${tabBtn("team", "팀 기록")}
        ${tabBtn("player", "선수 기록")}
        <span style="color:#555;">|</span>
        ${scopeBtn("regular", "정규시즌")}
        ${scopeBtn("playoff", "플레이오프")}
        ${recordsTab === "player" ? `
          <select id="recTeamFilter" style="padding:5px 8px; background:#1b1c1e; color:#fff; border:1px solid rgba(255,255,255,0.2); border-radius:4px;">
            <option value="">팀: 전체</option>
            ${teams.map((t) => `<option value="${t.id}" ${recordsTeamFilter === t.id ? "selected" : ""}>${t.name}</option>`).join("")}
          </select>` : ""}
        <span style="color:#888; font-size:12px;">시즌 ${state.season} ${recordsScope === "playoff" ? "플레이오프" : "정규리그"} 경기당 평균 · 컬럼 클릭 = 정렬</span>
      </div>
      <div style="overflow-x:auto;">
        <table style="font-size:12px; white-space:nowrap;">
          <thead><tr>${thead}</tr></thead>
          <tbody>${body || `<tr><td colspan="${cols.length}" style="color:#888; padding:14px; text-align:left;">플레이오프 기록이 아직 없습니다</td></tr>`}</tbody>
        </table>
      </div>
    </section>`;

  root.querySelectorAll("[data-rec-tab]").forEach((btn) => {
    btn.onclick = () => { recordsTab = btn.dataset.recTab; recSortKey = "pts"; recSortDir = -1; renderRecords(root); };
  });
  root.querySelectorAll("[data-rec-scope]").forEach((btn) => {
    btn.onclick = () => { recordsScope = btn.dataset.recScope; renderRecords(root); };
  });
  const teamFilterSel = root.querySelector("#recTeamFilter");
  if (teamFilterSel) {
    teamFilterSel.onchange = () => { recordsTeamFilter = teamFilterSel.value; renderRecords(root); };
  }
  root.querySelectorAll("[data-rec-sort]").forEach((th) => {
    th.onclick = () => {
      const key = th.dataset.recSort;
      if (recSortKey === key) recSortDir = -recSortDir;
      else { recSortKey = key; recSortDir = -1; }
      renderRecords(root);
    };
  });
}

function renderOffice(root) {
  const origin = managerOrigins.find((item) => item.id === state.manager.origin) || managerOrigins[0];
  const managerRows = managerAttributes
    .map(
      (attribute) => `
        <tr>
          <td>${attribute.label}</td>
          <td><span class="rating-pill">${state.manager.attributes[attribute.key]}</span></td>
        </tr>`,
    )
    .join("");

  root.innerHTML = `
    <section class="two-column">
      <article class="panel">
        <div class="panel-heading"><h3>운영 예산</h3></div>
        <p>현재 가용 예산은 <strong>${state.budget}억</strong>입니다.</p>
        <button class="mini-button" data-action="scout">스카우트 보고서 요청</button>
      </article>
      <article class="panel">
        <div class="panel-heading"><h3>매니저 프로필</h3></div>
        <p><strong>${state.manager.name}</strong> | ${origin.name}</p>
        <div class="table-wrap">
          <table>
            <tbody>${managerRows}</tbody>
          </table>
        </div>
      </article>
    </section>`;
}

function bindActions() {
  document.querySelector("#startNewGame").onclick = () => {
    pendingTeamId = teams[0].id;
    isStartScreenOpen = false;
    isTeamSelectOpen = true;
    render();
  };

  document.querySelector("#startLoadGame").onclick = () => {
    state = loadState();
    isStartScreenOpen = false;
    isTeamSelectOpen = false;
    isManagerSetupOpen = false;
    isCareerIntroOpen = false;
    render();
  };

  document.querySelector("#startRecentGame").onclick = () => {
    state = loadState();
    isStartScreenOpen = false;
    isTeamSelectOpen = false;
    isManagerSetupOpen = false;
    isCareerIntroOpen = false;
    render();
  };

  document.querySelector("#startSettings").onclick = () => {
    const panel = document.querySelector("#startSettingsPanel");
    panel.hidden = !panel.hidden;
  };

  document.querySelector("#startExit").onclick = () => {
    document.querySelector("#startRecentText").textContent = "창을 닫거나 다른 작업을 선택하세요.";
  };

  document.querySelector("#backToStart").onclick = () => {
    isTeamSelectOpen = false;
    isManagerSetupOpen = false;
    isCareerIntroOpen = false;
    isStartScreenOpen = true;
    render();
  };

  document.querySelectorAll(".team-card").forEach((button) => {
    button.onclick = () => {
      pendingTeamId = button.dataset.teamId;
      render();
    };
  });

  document.querySelector("#confirmTeam").onclick = () => {
    const origin = managerOrigins[0];
    pendingManager = {
      name: "김감독",
      origin: origin.id,
      attributes: { ...origin.attributes },
    };
    isTeamSelectOpen = false;
    isManagerSetupOpen = true;
    render();
  };

  document.querySelector("#backToTeamSelect").onclick = () => {
    isManagerSetupOpen = false;
    isTeamSelectOpen = true;
    render();
  };

  document.querySelector("#managerNameInput").oninput = (event) => {
    pendingManager.name = event.target.value;
  };

  document.querySelectorAll(".origin-card").forEach((button) => {
    button.onclick = () => {
      const origin = managerOrigins.find((item) => item.id === button.dataset.originId);
      pendingManager.origin = origin.id;
      pendingManager.attributes = { ...origin.attributes };
      render();
    };
  });

  document.querySelectorAll(".manager-attribute-row input").forEach((input) => {
    input.oninput = (event) => {
      pendingManager.attributes[event.target.name] = Number(event.target.value);
      renderManagerSetup();
      bindActions();
    };
  });

  document.querySelector("#confirmManager").onclick = () => {
    localStorage.removeItem("kbl-manager-save");
    state = defaultState();
    state.selectedTeamId = pendingTeamId;
    state.manager = {
      name: pendingManager.name.trim() || "김감독",
      origin: pendingManager.origin,
      attributes: { ...pendingManager.attributes },
    };
    isTeamSelectOpen = false;
    isManagerSetupOpen = false;
    isStartScreenOpen = false;
    isCareerIntroOpen = true;
    careerIntroStep = 0;
    render();
  };

  document.querySelector("#introBack").onclick = () => {
    if (!isCareerIntroOpen) return;
    if (careerIntroStep > 0) {
      careerIntroStep -= 1;
      render();
      return;
    }
    isCareerIntroOpen = false;
    isManagerSetupOpen = true;
    render();
  };

  document.querySelector("#introNext").onclick = () => {
    if (!isCareerIntroOpen) return;
    const lastStep = buildCareerIntroSteps(selectedTeam(), state.manager || pendingManager, managerOrigins[0]).length - 1;
    if (careerIntroStep < lastStep) {
      careerIntroStep += 1;
      render();
      return;
    }
    isCareerIntroOpen = false;
    saveState();
    render();
  };

  document.querySelector("#teamSelect").onchange = (event) => {
    state.selectedTeamId = event.target.value;
    render();
  };

  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.currentView);
    button.onclick = () => {
      state.currentView = button.dataset.view;
      render();
    };
  });

  // 수신함 탭바: 발신처별로 필터링 (수신함 = 전체)
  document.querySelectorAll(".tab-button").forEach((button) => {
    const category = button.dataset.category || "all";
    button.classList.toggle("active", (state.inboxFilter || "all") === category);
    button.onclick = () => {
      state.inboxFilter = category;
      state.currentView = "inbox";
      state.selectedNewsId = null; // 필터 바뀌면 해당 필터의 최신 항목을 다시 펼침
      render();
    };
  });

  // 수신함 목록에서 항목 클릭 -> 본문(보고서/기사) 펼쳐보기 + 해당 항목만 읽음 처리
  document.querySelectorAll(".inbox-item").forEach((button) => {
    button.onclick = () => {
      const id = button.dataset.newsId;
      const item = (state.news || []).find((n) => n.id === id);
      if (item) item.read = true;
      state.selectedNewsId = id;
      state.currentView = "inbox";
      render();
    };
  });

  // 통합 진행 버튼: 안 읽은 뉴스가 있으면 읽음 처리만, 다 읽었으면 다음 경기로 진행
  document.querySelector("#continueButton").onclick = () => {
    if (unreadNewsCount() > 0) {
      markAllNewsRead();
    } else {
      playNextGame();
    }
    render();
  };
  const inboxReadNext = document.querySelector("#inboxReadNextButton");
  if (inboxReadNext) inboxReadNext.onclick = () => { markAllNewsRead(); render(); };

  // BG 아이콘: 기본 회색 그라디언트 <-> 현재 팀 아이덴티티 컬러 그라디언트 토글
  document.querySelector("#bgChangeButton").onclick = () => {
    state.bgTheme = state.bgTheme === "team" ? "gray" : "team";
    saveState();
    render();
  };

  document.querySelector("#finishSeason").onclick = () => {
    if (state.phase === "offseason") {
      addNews("이미 시즌이 끝났습니다. 리그 화면에서 새 시즌을 시작하세요.", { sender: "front", title: "시즌 종료 안내" });
      render();
      return;
    }
    if (liveGame && !liveGame.ended) {
      addNews("진행 중인 라이브 경기를 먼저 끝내주세요.", { sender: "front", title: "라이브 경기 진행중" });
      state.currentView = "live";
      render();
      return;
    }
    if (!confirm("남은 시즌 전체(정규리그 + 플레이오프)를 자동으로 진행할까요?\n내 팀 경기도 모두 즉시 시뮬레이션됩니다.")) return;
    let guard = 0;
    while (state.phase !== "offseason" && guard++ < 500) advanceOneDay();
    addNews(
      `시즌 ${state.season} 일정이 모두 종료되었습니다. 리그 탭에서 최종 순위와 시상 결과를 확인하세요.`,
      { sender: "front", title: `시즌 ${state.season} 일정 종료` },
    );
    state.currentView = "league";
    render();
  };

  document.querySelector("#saveGame").onclick = () => {
    saveState();
    addNews("게임이 저장되었습니다.");
    render();
  };

  document.querySelector("#resetGame").onclick = () => {
    localStorage.removeItem("kbl-manager-save");
    state = defaultState();
    render();
  };

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.onclick = () => handlePanelAction(button.dataset.action);
  });

  // 선수 이름 클릭 -> 선수 정보 화면 (모든 탭 공통, 위임 방식)
  const viewRoot = document.querySelector("#viewRoot");
  if (viewRoot && !viewRoot.dataset.plinkBound) {
    viewRoot.dataset.plinkBound = "1";
    viewRoot.addEventListener("click", (e) => {
      const el = e.target.closest("[data-player-id]");
      if (el && el.dataset.playerId) {
        e.stopPropagation();
        openPlayer(el.dataset.playerId);
      }
    }, true);
    // 선수 이름 우클릭 -> 컨텍스트 메뉴
    viewRoot.addEventListener("contextmenu", (e) => {
      const el = e.target.closest("[data-player-id]");
      if (el && el.dataset.playerId) {
        e.preventDefault();
        e.stopPropagation();
        showPlayerCtxMenu(e.clientX, e.clientY, el.dataset.playerId);
      }
    }, true);
    // 메뉴 닫기: 다른 곳 클릭 / 다른 곳 우클릭 / ESC / 스크롤
    document.addEventListener("click", (e) => { if (!e.target.closest("#ctx-menu")) closeCtxMenu(); }, true);
    document.addEventListener("contextmenu", (e) => { if (!e.target.closest("[data-player-id]")) closeCtxMenu(); }, true);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCtxMenu(); });
    window.addEventListener("scroll", closeCtxMenu, true);
  }
}

function handlePanelAction(action) {
  if (action === "staff-meeting") {
    state.morale = Math.min(100, state.morale + 4);
    state.stamina = Math.max(30, state.stamina - 2);
    addNews(
      "코칭스태프 회의를 진행했습니다. 로테이션과 훈련 강도를 점검한 결과 선수단 분위기가 소폭 개선되었습니다.",
      { sender: "training", title: "스태프 회의 결과" },
    );
  }

  if (action === "scout") {
    if (state.budget < 5) {
      addNews(
        "이번 주 스카우팅 예산이 부족해 외부 리포트 요청을 보류했습니다. 예산 확보 후 다시 요청해주세요.",
        { sender: "scout", title: "스카우팅 예산 부족" },
      );
    } else {
      state.budget -= 5;
      addNews(
        "스카우트팀이 FA 시장과 국내외 유망주 풀 조사에 착수했습니다. 조사 결과는 추후 보고서로 전달될 예정입니다.",
        { sender: "scout", title: "스카우팅 리포트 착수" },
      );
    }
  }

  if (action === "new-season") {
    startNewSeason();
  }

  render();
}

function involvesMyTeam(game) {
  return game.home === state.selectedTeamId || game.away === state.selectedTeamId;
}

// ===== 라이브 경기 (실시간 중계 화면) =====
let liveGame = null;   // { lm, game, series, paused, speed, subWindow, outSel, ended, notice }
let liveTimerId = null;

function stopLiveTimer() {
  if (liveTimerId) { clearInterval(liveTimerId); liveTimerId = null; }
}

function mySide() { return liveGame ? liveGame.lm.userSide : null; }
function myLiveTeam() { return liveGame ? (mySide() === "home" ? liveGame.lm.H : liveGame.lm.A) : null; }

function startLiveMatch(game, series) {
  const side = game.home === state.selectedTeamId ? "home" : "away";
  liveGame = {
    lm: createLiveMatch(game.home, game.away, side),
    game, series: series || null,
    paused: true, speed: 1, subWindow: true, outSel: null, ended: false,
    notice: "경기 준비 완료 — ▶ 버튼으로 시작하세요 (시작 전에도 교체/전술 조정 가능)",
    subSched: [], nextStepAt: null, gameSecLeft: 600, quarterTotal: 600, stepEvery: 0, lastTick: 0,
    dispScore: { h: 0, a: 0 }, pendingBreak: null, logOpen: false,
    evRead: 0, boardSched: [], board: { roster: { home: [], away: [] }, pos: {} },
  };
  // 오프닝 멘트(인사/팀 소개/점프볼)는 시계 시작 전에 하나씩 표시
  liveGame.introQueue = liveGame.lm.drain();
  liveGame.introUntil = 0;
  state.currentView = "live";
  render();
}

function finalizeLiveMatch() {
  const { lm, game, series } = liveGame;
  const result = lm.finished;
  if (!result || game.played) return;
  game.homeScore = result.homeScore;
  game.awayScore = result.awayScore;
  game.ot = result.ot || 0;
  game.played = true;
  game.box = { home: result.homeBox, away: result.awayBox };
  game.pbp = result.pbp;
  trimOldPbp();
  applyGameFatigue(result);
  accumulateStats(game, result.homeBox, result.awayBox);
  if (!game.playoff) {
    applyResult(game.home, game.homeScore, game.awayScore);
    applyResult(game.away, game.awayScore, game.homeScore);
  }
  const myTeamIsHome = game.home === state.selectedTeamId;
  const myScore = myTeamIsHome ? game.homeScore : game.awayScore;
  const oppScore = myTeamIsHome ? game.awayScore : game.homeScore;
  const opponent = teamById(myTeamIsHome ? game.away : game.home);
  const won = myScore > oppScore;
  const prefix = game.playoff ? `[${game.stage} ${game.gameNo}차전] ` : "";
  const otTag = game.ot ? ` (연장${game.ot > 1 ? game.ot + "차" : ""})` : "";
  state.morale = clamp(state.morale + (won ? 7 : -5), 20, 100);
  const myBox = myTeamIsHome ? game.box.home : game.box.away;
  const top = [...myBox].sort((a, b) => b.pts - a.pts)[0];
  addNews(
    `${selectedTeam().name}이(가) ${opponent.name}을(를) 상대로 ${myScore}:${oppScore}로 ${won ? "승리했습니다" : "패배했습니다"}${otTag}. ${top ? `${top.name} 선수가 ${top.pts}득점으로 이날 경기 최고 활약을 펼쳤습니다.` : ""}`,
    { sender: "sportsnews", title: `${prefix}${selectedTeam().name} ${won ? "승" : "패"}, ${opponent.name}전 ${myScore}:${oppScore}` },
  );
  state.stamina = Math.max(25, state.stamina - 8 - Math.round(state.tactics.defense / 20));

  if (series) {
    finishSeriesGame(series, game);
    state.playoffs.series.filter((s) => s !== series && !s.winner).forEach(playSeriesGame);
    if (state.playoffs.series.every((s) => s.winner)) advancePlayoffStage();
    state.day += 1;
    applyDailyRecovery();
    advanceDLeagueSchedule();
  } else {
    // 같은 날 나머지 리그 경기 진행
    state.schedule.filter((g) => !g.played && g.day <= state.day).forEach((g) => simulateGame(g));
    advanceDLeagueSchedule();
    if (state.schedule.every((g) => g.played)) startPlayoffs();
  }
}

function appendLog(lines) {
  if (!liveGame || !liveGame.logOpen || !lines || !lines.length) return;
  const feed = document.querySelector("#live-feed");
  if (feed) {
    feed.insertAdjacentHTML("beforeend", lines.map((l) => `<div class="pbp-line">${l}</div>`).join(""));
    feed.scrollTop = feed.scrollHeight;
  }
}

const SUB_STRIP = /^.+?Q \d{2}:\d{2} /; // 자막에서는 타임스탬프 제거 (시계는 스코어보드가 담당)

function liveAppend(lines) { // 일시정지 중 액션(교체/타임아웃/전술) 즉시 표시용
  if (!lines || !lines.length || !liveGame) return;
  appendLog(lines);
  const el = document.querySelector("#live-sub-text");
  if (el) el.textContent = lines[lines.length - 1].replace(SUB_STRIP, "");
}

function liveClockStr() {
  if (!liveGame) return "10:00";
  const sec = liveGame.nextStepAt == null && !liveGame.pendingBreak
    ? (liveGame.lm.q > 4 ? 300 : 600)
    : Math.max(0, Math.round(liveGame.gameSecLeft));
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

function renderLiveScore() {
  const el = document.querySelector("#live-score");
  if (!el || !liveGame) return;
  const { lm } = liveGame;
  const to = (n) => "●".repeat(Math.max(0, n)) || "-";
  const sc = lm.done ? lm.ctx.scores : { home: liveGame.dispScore.h, away: liveGame.dispScore.a };
  el.innerHTML = `
    <div class="ls-side"><b>${lm.H.shortName}</b><small>'${lm.H.pb.off.name}' · TO ${to(lm.timeouts.home)}</small></div>
    <div class="ls-mid">
      <div class="ls-score">${sc.home} : ${sc.away}</div>
      <div class="ls-clock">${lm.done ? "경기 종료" : `${lm.ctx.q}Q ${liveClockStr()}`}</div>
    </div>
    <div class="ls-side"><b>${lm.A.shortName}</b><small>'${lm.A.pb.off.name}' · TO ${to(lm.timeouts.away)}</small></div>`;
}

function livePanelHtml(T, side) {
  const isMine = side === mySide();
  const canSub = isMine && liveGame.subWindow && !liveGame.ended;
  const courtSet = new Set(T.court.map((p) => p.id));
  const list = [...T.players].filter((p) => p.min > 0.01 || courtSet.has(p.id) || p.target > 0);
  list.sort((a, b) => (courtSet.has(b.id) ? 1 : 0) - (courtSet.has(a.id) ? 1 : 0) || b.min - a.min);
  const rows = list.map((p) => {
    const en = Math.max(2, Math.round(100 - p.fatigue * 1.6)); // 표시용 컨디션 (피로 체감 증폭)
    const sel = isMine && liveGame.outSel === p.id;
    return `<tr class="${courtSet.has(p.id) ? "oncourt" : ""}${sel ? " selrow" : ""}${p.out ? " fouledout" : ""}"
      ${canSub && !p.out ? `data-live-p="${p.id}"` : ""}>
      <td>${p.out ? "✕" : courtSet.has(p.id) ? "●" : ""}</td>
      <td class="lp-name">${p.name}</td><td>${p.pos}</td>
      <td>${Math.round(p.min)}'</td><td><b>${p.pts}</b></td><td>${p.oreb + p.dreb}</td><td>${p.ast}</td><td>${p.pf}</td>
      <td><b style="color:${en > 65 ? "#57c07d" : en > 40 ? "#e6c84f" : "#e07a7a"};">${en}%</b></td>
    </tr>`;
  }).join("");
  return `<h4>${T.shortName}${isMine ? ' <span class="mine-tag">내 팀</span>' : ""}</h4>
    <table class="live-table"><thead><tr><th></th><th>선수</th><th>포지션</th><th>분</th><th>득점</th><th>리바</th><th>어시</th><th>파울</th><th>체력</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderLivePanels() {
  if (!liveGame) return;
  const hp = document.querySelector("#live-home-panel");
  const ap = document.querySelector("#live-away-panel");
  if (hp) hp.innerHTML = livePanelHtml(liveGame.lm.H, "home");
  if (ap) ap.innerHTML = livePanelHtml(liveGame.lm.A, "away");
  const tac = document.querySelector("#live-tactics");
  if (tac) {
    if (liveGame.subWindow && !liveGame.ended) {
      const T = myLiveTeam();
      tac.innerHTML = `
        <span>전술:</span>
        <select id="live-off">${Object.entries(PLAYBOOKS.off).map(([k, v]) => `<option value="${k}" ${T.pb.offKey === k ? "selected" : ""}>${v.name}</option>`).join("")}</select>
        <select id="live-def">${Object.entries(PLAYBOOKS.def).map(([k, v]) => `<option value="${k}" ${T.pb.defKey === k ? "selected" : ""}>${v.name}</option>`).join("")}</select>
        <button id="live-tac-apply">전술 적용</button>
        <span class="muted">교체: 내 팀 표에서 코트 선수(●) 클릭 후 벤치 선수 클릭</span>`;
      const btn = tac.querySelector("#live-tac-apply");
      if (btn) btn.onclick = () => {
        liveGame.lm.setTactics(mySide(), tac.querySelector("#live-off").value, tac.querySelector("#live-def").value);
        liveAppend(liveGame.lm.drain());
        renderLiveScore();
      };
    } else {
      tac.innerHTML = "";
    }
  }
  const notice = document.querySelector("#live-notice");
  if (notice) notice.textContent = liveGame.notice || "";
}

function startLiveTimer() {
  stopLiveTimer();
  if (liveGame) liveGame.lastTick = Date.now();
  liveTimerId = setInterval(liveTick, 120);
}

// 빈 구간을 채우는 필러 해설 (현재 스코어/상황 기반)
function liveFillerLine() {
  const lm = liveGame.lm;
  const s = lm.ctx.scores;
  const margin = Math.abs(s.home - s.away);
  const lead = s.home === s.away ? null : (s.home > s.away ? lm.H.shortName : lm.A.shortName);
  const pool = [
    lead ? `스코어 ${s.home}:${s.away}, ${lead}${josa(lead, "이", "가")} ${margin}점 앞서 있습니다` : `스코어 ${s.home}:${s.away}, 한 치 앞을 알 수 없는 승부입니다`,
    `양 팀 수비가 단단하게 자리를 잡습니다`,
    `벤치에서 큰 소리로 작전 지시가 이어집니다`,
    `관중석의 응원 열기가 점점 뜨거워집니다`,
    `공격 시간을 충분히 사용하며 천천히 풀어갑니다`,
    `리바운드 자리싸움이 코트 아래에서 치열합니다`,
    `볼이 코트를 넓게 돌며 기회를 엿봅니다`,
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

// 포제션의 멘트들을 해당 시간 구간에 고르게 배치 (+빈 구간 필러)
function liveScheduleLines(lines, slotStart, slotDur) {
  let arr = (lines || []).slice();
  const origN = arr.length;
  if (arr.length <= 2 && slotDur >= 18) arr.push(liveFillerLine());
  if (arr.length <= 1 && slotDur >= 24) arr.push(liveFillerLine());
  const n = arr.length;
  const ats = [];
  arr.forEach((l, i) => {
    const at = slotStart - ((i + 0.4) / (n + 0.5)) * slotDur;
    if (i < origN) ats.push(at);
    liveGame.subSched.push({ text: l.replace(SUB_STRIP, ""), at });
  });
  return ats;
}

// 자막: 시계가 각 멘트의 예정 시각에 도달하면 표시
function liveSubTick() {
  if (!liveGame) return;
  const el = document.querySelector("#live-sub-text");
  if (!el) return;
  let line = null;
  while (liveGame.subSched.length && liveGame.gameSecLeft <= liveGame.subSched[0].at + 0.001) {
    line = liveGame.subSched.shift();
  }
  if (line) {
    el.textContent = line.text;
    const sc = /\((\d+):(\d+)\)/.exec(line.text);
    if (sc) liveGame.dispScore = { h: Number(sc[1]), a: Number(sc[2]) };
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
  }
}

// 리얼타임 시계가 주인: 시계가 포제션 시작점에 닿으면 엔진 실행, 멘트는 구간에 분산 표시
function liveTick() {
  if (!liveGame || liveGame.paused || liveGame.ended) return;
  const lm = liveGame.lm;
  const now = Date.now();
  const dt = Math.min(1, (now - (liveGame.lastTick || now)) / 1000);
  liveGame.lastTick = now;
  // 오프닝: 시계 10:00 고정 상태에서 멘트 순차 표시, 마지막(점프볼) 멘트와 함께 시계 시작
  if (liveGame.introQueue && liveGame.introQueue.length) {
    if (now >= (liveGame.introUntil || 0)) {
      const l = liveGame.introQueue.shift();
      appendLog([l]);
      const el = document.querySelector("#live-sub-text");
      if (el) {
        el.textContent = l;
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = "";
      }
      liveGame.introUntil = now + (liveGame.introQueue.length ? 3000 : 1200) / Math.max(1, liveGame.speed);
    }
    renderLiveScore();
    return;
  }
  if (liveGame.introUntil && now < liveGame.introUntil) { renderLiveScore(); return; } // 점프볼 멘트 잠깐 유지
  if (liveGame.nextStepAt == null && !liveGame.pendingBreak) { // 쿼터 시작
    const pairs = lm.q > 4 ? Math.max(4, Math.round(lm.perSeg * 0.9)) : lm.perSeg * 2;
    const total = lm.q > 4 ? 300 : 600;
    liveGame.quarterTotal = total;
    liveGame.gameSecLeft = total;
    liveGame.stepEvery = total / pairs;
    liveGame.nextStepAt = total;
  }
  liveGame.gameSecLeft = Math.max(0, liveGame.gameSecLeft - liveGame.speed * dt);
  let stepped = false;
  let guard = 0;
  while (!liveGame.pendingBreak && liveGame.nextStepAt != null
         && liveGame.gameSecLeft <= liveGame.nextStepAt + 0.001 && guard++ < 40) {
    const slotStart = liveGame.nextStepAt;
    const r = lm.step();
    stepped = true;
    const lineStart = lm.lastRead - r.lines.length; // 이번 스텝 라인들의 전역 시작 인덱스
    const atList = liveScheduleLines(r.lines, slotStart, liveGame.stepEvery);
    appendLog(r.lines);
    const newEvs = lm.ctx.events.slice(liveGame.evRead);
    liveGame.evRead = lm.ctx.events.length;
    let lastAt = Infinity;
    newEvs.forEach((ev) => {
      let at = slotStart;
      if (typeof ev.li === "number" && atList.length) {
        const idx = Math.min(atList.length - 1, Math.max(0, ev.li - lineStart));
        at = atList[idx] + 0.3; // 해당 자막 직전에 보드 액션 (시계는 감소하므로 +가 먼저)
      }
      if (at >= lastAt - 0.25) at = lastAt - 0.5; // 같은 자막에 몰린 이벤트는 순서대로 풀어서 전개
      lastAt = at;
      liveGame.boardSched.push({ ev, at });
    });
    liveGame.boardSched.sort((a, b) => b.at - a.at);
    liveGame.nextStepAt -= liveGame.stepEvery;
    if (r.done) { liveGame.pendingBreak = "end"; break; }
    if (r.boundary === "quarter") { liveGame.pendingBreak = "quarter"; break; }
  }
  liveSubTick();
  liveBoardTick();
  renderLiveScore();
  if (stepped) renderLivePanels();
  // 쿼터/경기 종료는 시계가 0에 닿고 자막이 모두 소화된 뒤 처리
  if (liveGame.pendingBreak && liveGame.gameSecLeft <= 0.01 && !liveGame.subSched.length) {
    const pb = liveGame.pendingBreak;
    liveGame.pendingBreak = null;
    liveGame.nextStepAt = null;
    if (pb === "end") {
      liveGame.ended = true;
      liveGame.paused = true;
      stopLiveTimer();
      finalizeLiveMatch();
      liveGame.notice = "경기 종료 — 결과가 리그에 반영되었습니다";
      liveGame.logOpen = true;
    } else {
      liveGame.paused = true;
      liveGame.subWindow = true;
      liveGame.notice = "쿼터 브레이크 — 교체와 전술 변경이 가능합니다";
      stopLiveTimer();
    }
    const root = document.querySelector("#viewRoot");
    if (root && state.currentView === "live") renderLive(root);
  }
}

const SHOW_COURT_BOARD = false; // 바둑판 중계 보류 (공간 시뮬 엔진 전까지 숨김 — true로 바꾸면 다시 표시)

// ══ 바둑판(코트) 중계: 연속 모션 엔진 ══════════════════════
// 모든 토큰은 앵커(전술 위치)를 향해 매 틱 부드럽게 이동 + 오프볼 잔움직임
// 수비수는 매치업 공격수를 실시간 추적, 볼은 소유자를 따라다님
const COURT_SPOTS = { PG: { x: 60, y: 50 }, SG: { x: 72, y: 16 }, SF: { x: 72, y: 84 }, PF: { x: 83, y: 30 }, C: { x: 87, y: 66 } };
const TOK_SPD = 1.15;  // 틱(0.12s)당 최대 이동 % (선수)
const BALL_SPD = 3.4;  // 볼 이동 속도

function boardPlayerOf(pid) {
  const lm = liveGame.lm;
  return lm.H.players.find((p) => p.id === pid) || lm.A.players.find((p) => p.id === pid) || null;
}
function boardTeamOf(pid) {
  return liveGame.lm.H.players.some((p) => p.id === pid) ? "home" : "away";
}
function boardMirror(side, x) { return side === "home" ? x : 100 - x; }

function boardSpotBase(pid) { // 이 선수의 공격 대형 기본 위치
  const pl = boardPlayerOf(pid);
  const side = boardTeamOf(pid);
  const base = COURT_SPOTS[pl && pl.pos] || COURT_SPOTS.SF;
  return { x: boardMirror(side, base.x), y: base.y };
}

function boardState(pid) {
  const b = liveGame.board;
  if (!b.pos[pid]) {
    const s = boardSpotBase(pid);
    b.pos[pid] = { x: 50 + (Math.random() * 10 - 5), y: 50 + (Math.random() * 20 - 10), ax: s.x, ay: s.y, tx: s.x, ty: s.y, wanderAt: 0 };
  }
  return b.pos[pid];
}
function boardAnchor(pid, x, y) {
  const s = boardState(pid);
  s.ax = x; s.ay = y; s.tx = x; s.ty = y;
  s.wanderAt = Date.now() + 900; // 도착 후 잔움직임 재개
}
function boardFlash(pid, cls) {
  const el = document.querySelector(`#court-tokens [data-pid="${pid}"]`);
  if (!el) return;
  el.classList.remove("tok-flash", "tok-bad");
  void el.offsetWidth;
  el.classList.add(cls || "tok-flash");
}
function boardRimFlash(side, made) {
  const rim = document.querySelector(side === "home" ? "#rim-right" : "#rim-left");
  if (!rim) return;
  rim.classList.remove("rim-made", "rim-miss");
  void rim.offsetWidth;
  rim.classList.add(made ? "rim-made" : "rim-miss");
}

function boardSyncTokens() {
  const wrap = document.querySelector("#court-tokens");
  if (!wrap || !liveGame) return;
  const lm = liveGame.lm;
  const b = liveGame.board;
  if (!b.roster.home.length) b.roster.home = lm.H.court.map((p) => p.id);
  if (!b.roster.away.length) b.roster.away = lm.A.court.map((p) => p.id);
  const want = new Set([...b.roster.home, ...b.roster.away]);
  wrap.querySelectorAll("[data-pid]").forEach((el) => { if (!want.has(el.dataset.pid)) el.remove(); });
  ["home", "away"].forEach((side) => {
    b.roster[side].forEach((pid) => {
      if (!wrap.querySelector(`[data-pid="${pid}"]`)) {
        const pl = boardPlayerOf(pid);
        if (!pl) return;
        const s = boardState(pid);
        wrap.insertAdjacentHTML("beforeend",
          `<div class="court-token ${side}" data-pid="${pid}" style="left:${s.x}%; top:${s.y}%;">${playerFace(pid)}<span class="ct-name">${pl.name.split(" ").pop()}</span></div>`);
      }
    });
  });
}

function boardFormation(offSide) {
  const b = liveGame.board;
  b.offSide = offSide;
  b.roster[offSide].forEach((pid) => { const s = boardSpotBase(pid); boardAnchor(pid, s.x, s.y); });
  // 수비 앵커는 매 틱 매치업 추적으로 자동 계산됨
}

function boardApply(ev) {
  if (!liveGame || !document.querySelector("#live-court")) return;
  const lm = liveGame.lm;
  const b = liveGame.board;
  const offSide = ev.team === lm.H.id ? "home" : "away";
  const rimX = offSide === "home" ? 94 : 6;
  switch (ev.t) {
    case "lineup": {
      b.roster[ev.team === lm.H.id ? "home" : "away"] = ev.ids;
      boardSyncTokens();
      break;
    }
    case "poss": {
      b.offSide = offSide;
      b.roster[offSide].forEach((pid) => {
        const sp = boardSpotBase(pid);
        const st = boardState(pid);
        st.ax = sp.x; st.ay = sp.y; st.tx = sp.x; st.ty = sp.y;
        // 핸들러는 드리블 업 동안 잔움직임 없이 직진, 나머지는 자리 찾아 이동
        st.wanderAt = Date.now() + (pid === ev.handler ? 3000 : 900);
      });
      b.holder = ev.handler || null; // 볼이 리바운더/인바운드 지점에서 핸들러에게 (아웃렛)
      b.ballTgt = null;
      break;
    }
    case "ball":
      b.holder = ev.p;
      break;
    case "dribble": {
      b.holder = ev.p;
      const s = boardState(ev.p);
      boardAnchor(ev.p, clamp(s.ax + (offSide === "home" ? 4 : -4), 4, 96), s.ay);
      break;
    }
    case "pass": case "kickout":
      b.holder = ev.to;
      boardFlash(ev.to);
      break;
    case "entry":
      boardAnchor(ev.to, offSide === "home" ? 86 : 14, 60);
      b.holder = ev.to;
      break;
    case "cut":
      boardAnchor(ev.p, offSide === "home" ? 89 : 11, 44);
      break;
    case "iso":
      boardAnchor(ev.p, offSide === "home" ? 76 : 24, 40);
      b.holder = ev.p;
      break;
    case "fake": case "assist":
      boardFlash(ev.p);
      break;
    case "shot": {
      // 슛 순간: 슈터를 슛 종류에 맞는 지점에 즉시 배치, 볼은 슈터 손에서 림으로
      const pl = boardPlayerOf(ev.p);
      const base = COURT_SPOTS[pl && pl.pos] || COURT_SPOTS.SF;
      let sx, sy;
      if (ev.kind === "drive" || ev.kind === "rim") { sx = offSide === "home" ? 89 : 11; sy = 52; }
      else if (ev.kind === "mid") { sx = offSide === "home" ? 79 : 21; sy = base.y * 0.6 + 50 * 0.4; }
      else { sx = boardMirror(offSide, Math.min(base.x, 72)); sy = base.y; } // 3점: 아크 바깥
      const s = boardState(ev.p);
      s.x = sx; s.y = sy; s.ax = sx; s.ay = sy; s.tx = sx; s.ty = sy;
      s.wanderAt = Date.now() + 1300;
      const tel = document.querySelector(`#court-tokens [data-pid="${ev.p}"]`);
      if (tel) { tel.style.left = sx + "%"; tel.style.top = sy + "%"; }
      b.holder = null;
      b.ball = { x: sx + 1, y: sy - 2.5 }; // 볼을 슈터 손에서 출발
      const bel = document.querySelector("#court-ball");
      if (bel) { bel.style.left = b.ball.x + "%"; bel.style.top = b.ball.y + "%"; }
      b.ballTgt = { x: rimX, y: 50 };
      boardRimFlash(offSide, !!ev.made);
      break;
    }
    case "oreb":
      boardAnchor(ev.p, offSide === "home" ? 90 : 10, 57);
      b.holder = ev.p;
      break;
    case "dreb": case "steal":
      b.holder = ev.p;
      if (ev.t === "steal") boardFlash(ev.p);
      break;
    case "fastbreak": {
      const mySide = boardTeamOf(ev.p);
      boardAnchor(ev.p, mySide === "home" ? 92 : 8, 50);
      b.holder = ev.p;
      boardRimFlash(mySide, true);
      break;
    }
    case "to": case "foul":
      boardFlash(ev.p, "tok-bad");
      break;
    case "ft": {
      const side = boardTeamOf(ev.p);
      const fx = side === "home" ? 81 : 19;
      const s = boardState(ev.p);
      s.x = fx; s.y = 50; s.ax = fx; s.ay = 50; s.tx = fx; s.ty = 50;
      s.wanderAt = Date.now() + 2000;
      const tel = document.querySelector(`#court-tokens [data-pid="${ev.p}"]`);
      if (tel) { tel.style.left = fx + "%"; tel.style.top = "50%"; }
      b.holder = ev.p;
      break;
    }
    default: break;
  }
}

// 연속 모션: 매 틱 호출 — 수비 추적 / 잔움직임 / 이동 보간 / 볼 추적
function boardMotion() {
  if (!liveGame || !document.querySelector("#live-court")) return;
  const b = liveGame.board;
  const now = Date.now();
  // 1) 수비수 앵커 = 매치업과 골대 사이 (실시간 추적)
  if (b.offSide) {
    const defSide = b.offSide === "home" ? "away" : "home";
    const rimX = b.offSide === "home" ? 94 : 6;
    const n = Math.min(b.roster[b.offSide].length, b.roster[defSide].length);
    for (let i = 0; i < n; i += 1) {
      const op = b.pos[b.roster[b.offSide][i]];
      const dp = b.pos[b.roster[defSide][i]];
      if (op && dp) {
        dp.ax = op.x + (rimX - op.x) * 0.32;
        dp.ay = op.y + (50 - op.y) * 0.25;
      }
    }
  }
  // 2) 토큰 이동 (잔움직임 + 보간)
  const ids = [...b.roster.home, ...b.roster.away];
  ids.forEach((pid) => {
    const s = b.pos[pid];
    if (!s) return;
    if (now > (s.wanderAt || 0)) {
      s.tx = s.ax + (Math.random() * 6 - 3);
      s.ty = s.ay + (Math.random() * 8 - 4);
      s.wanderAt = now + 650 + Math.random() * 1500;
    } else if (Math.abs(s.tx - s.ax) > 8 || Math.abs(s.ty - s.ay) > 10) {
      s.tx = s.ax; s.ty = s.ay; // 앵커가 크게 바뀌면 즉시 추종
    }
    const dx = s.tx - s.x, dy = s.ty - s.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.05) {
      const step = Math.min(d, TOK_SPD);
      s.x = clamp(s.x + (dx / d) * step, 2, 98);
      s.y = clamp(s.y + (dy / d) * step, 5, 95);
      const el = document.querySelector(`#court-tokens [data-pid="${pid}"]`);
      if (el) { el.style.left = s.x + "%"; el.style.top = s.y + "%"; }
    }
  });
  // 3) 볼: 소유자를 따라다니거나 목표 지점(림)으로
  let bx = null, by = null;
  if (b.holder && b.pos[b.holder]) { bx = b.pos[b.holder].x + 1.3; by = b.pos[b.holder].y - 2.6; }
  else if (b.ballTgt) { bx = b.ballTgt.x; by = b.ballTgt.y; }
  if (bx != null) {
    b.ball = b.ball || { x: 50, y: 50 };
    const dx = bx - b.ball.x, dy = by - b.ball.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.05) {
      const step = Math.min(d, BALL_SPD);
      b.ball.x += (dx / d) * step;
      b.ball.y += (dy / d) * step;
      const el = document.querySelector("#court-ball");
      if (el) { el.style.left = b.ball.x + "%"; el.style.top = b.ball.y + "%"; }
    }
  }
}

function liveBoardTick() {
  if (!liveGame) return;
  while (liveGame.boardSched.length && liveGame.gameSecLeft <= liveGame.boardSched[0].at + 0.001) {
    boardApply(liveGame.boardSched.shift().ev);
  }
  boardMotion();
}
function courtHtml() {
  return `
    <div class="court-wrap" id="live-court">
      <svg class="court-lines" viewBox="0 0 94 50" preserveAspectRatio="none">
        <rect x="0.5" y="0.5" width="93" height="49" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="0.4"/>
        <line x1="47" y1="0.5" x2="47" y2="49.5" stroke="rgba(255,255,255,0.55)" stroke-width="0.4"/>
        <circle cx="47" cy="25" r="6" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="0.4"/>
        <rect x="0.5" y="17" width="19" height="16" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.5)" stroke-width="0.35"/>
        <rect x="74.5" y="17" width="19" height="16" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.5)" stroke-width="0.35"/>
        <circle cx="19.5" cy="25" r="6" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="0.35"/>
        <circle cx="74.5" cy="25" r="6" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="0.35"/>
        <path d="M 4.5 3 A 23.75 23.75 0 0 1 4.5 47" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="0.35"/>
        <path d="M 89.5 3 A 23.75 23.75 0 0 0 89.5 47" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="0.35"/>
        <circle id="rim-left" cx="5.5" cy="25" r="1.6" fill="none" stroke="#ff7b3a" stroke-width="0.6"/>
        <circle id="rim-right" cx="88.5" cy="25" r="1.6" fill="none" stroke="#ff7b3a" stroke-width="0.6"/>
      </svg>
      <div id="court-tokens"></div>
      <div class="court-ball" id="court-ball" style="left:50%; top:50%;"></div>
    </div>`;
}

function renderLive(root) {  if (!liveGame) {
    root.innerHTML = '<section class="home-panel"><p>진행 중인 경기가 없습니다. 홈에서 "다음 경기"로 경기를 시작하세요.</p></section>';
    return;
  }
  const { lm } = liveGame;
  root.innerHTML = `
    <section class="live-wrap">
      <div class="live-top" id="live-score"></div>
      <div class="live-controls">
        <button id="live-play" class="mini-button">${liveGame.ended ? "경기 종료" : liveGame.paused ? "▶ 진행" : "⏸ 일시정지"}</button>
        <select id="live-speed">
          <option value="0.5" ${liveGame.speed === 0.5 ? "selected" : ""}>느리게 (0.5배속)</option>
          <option value="1" ${liveGame.speed === 1 ? "selected" : ""}>보통 (리얼타임)</option>
          <option value="2" ${liveGame.speed === 2 ? "selected" : ""}>빠르게 (2배속)</option>
          <option value="4" ${liveGame.speed === 4 ? "selected" : ""}>매우 빠르게 (4배속)</option>
        </select>
        <button id="live-timeout" class="mini-button" ${liveGame.ended || lm.timeouts[mySide()] <= 0 ? "disabled" : ""}>⏱ 타임아웃 (${lm.timeouts[mySide()]}회)</button>
        <label class="live-auto"><input type="checkbox" id="live-auto" ${lm.auto ? "checked" : ""}> 자동 교체</label>
        <button id="live-ff" class="mini-button" ${liveGame.ended ? "disabled" : ""}>⏩ 빠른 종료</button>
        ${liveGame.ended ? '<button id="live-exit" class="mini-button">📋 일정으로 돌아가기</button>' : ""}
      </div>
      <div class="live-notice" id="live-notice"></div>
      ${SHOW_COURT_BOARD ? courtHtml() : ""}
      <div class="live-main2">
        <div class="live-panel" id="live-home-panel"></div>
        <div class="live-panel" id="live-away-panel"></div>
      </div>
      <div class="live-subtitle"><span id="live-sub-text"></span></div>
      <div class="live-bench" id="live-tactics"></div>
      <div class="live-logrow"><button id="live-log-toggle" class="mini-button">${liveGame.logOpen ? "중계 로그 닫기 ▲" : "중계 로그 보기 ▼"}</button></div>
      <div class="live-feed ${liveGame.logOpen ? "" : "hidden"}" id="live-feed"></div>
    </section>`;
  if (liveGame.logOpen) {
    const feed = root.querySelector("#live-feed");
    feed.innerHTML = lm.pbp.map((l) => `<div class="pbp-line">${l}</div>`).join("");
    feed.scrollTop = feed.scrollHeight;
  }
  renderLiveScore();
  renderLivePanels();
  boardSyncTokens();

  root.querySelector("#live-play").onclick = () => {
    if (liveGame.ended) return;
    liveGame.paused = !liveGame.paused;
    if (!liveGame.paused) {
      liveGame.subWindow = false;
      liveGame.outSel = null;
      liveGame.notice = "";
      startLiveTimer();
    } else {
      stopLiveTimer();
      liveGame.notice = "일시정지 — 교체·전술은 타임아웃/쿼터 브레이크에서 가능합니다";
    }
    renderLive(root);
  };
  root.querySelector("#live-speed").onchange = (e) => { liveGame.speed = Number(e.target.value); };
  root.querySelector("#live-timeout").onclick = () => {
    if (liveGame.ended) return;
    if (lm.callTimeout(mySide())) {
      liveGame.paused = true;
      stopLiveTimer();
      liveGame.subWindow = true;
      liveGame.notice = "타임아웃 — 교체와 전술 변경이 가능합니다";
      liveAppend(lm.drain());
      renderLive(root);
    }
  };
  root.querySelector("#live-auto").onchange = (e) => { lm.auto = e.target.checked; };
  root.querySelector("#live-ff").onclick = () => {
    if (liveGame.ended) return;
    stopLiveTimer();
    lm.fastForward();
    liveGame.subSched = [];
    liveGame.ended = true;
    liveGame.paused = true;
    finalizeLiveMatch();
    liveGame.notice = "경기 종료 — 결과가 리그에 반영되었습니다";
    liveGame.logOpen = true;
    renderLive(root);
  };
  const logBtn = root.querySelector("#live-log-toggle");
  if (logBtn) logBtn.onclick = () => { liveGame.logOpen = !liveGame.logOpen; renderLive(root); };
  const exit = root.querySelector("#live-exit");
  if (exit) exit.onclick = () => { liveGame = null; state.currentView = "schedule"; render(); };

  // 교체: 내 팀 코트 선수 -> 벤치 선수 클릭 (타임아웃/쿼터 브레이크 중) — 위임 바인딩 1회만
  if (!root.dataset.liveSubBound) {
    root.dataset.liveSubBound = "1";
    root.addEventListener("click", (e) => {
      const row = e.target.closest("[data-live-p]");
      if (!row || !liveGame || !liveGame.subWindow || liveGame.ended) return;
      const pid = row.dataset.liveP;
      const T = myLiveTeam();
      const onCourt = T.court.some((p) => p.id === pid);
      if (onCourt) {
        liveGame.outSel = liveGame.outSel === pid ? null : pid;
      } else if (liveGame.outSel) {
        if (liveGame.lm.substitute(mySide(), liveGame.outSel, pid)) {
          liveGame.outSel = null;
          liveAppend(liveGame.lm.drain());
          liveGame.board.roster[mySide()] = myLiveTeam().court.map((p) => p.id);
          boardSyncTokens();
        }
      }
      renderLivePanels();
    });
  }
}

// ===== 시즌 진행 루프 =====
function advanceOneDay() {
  if (liveGame && !liveGame.ended && state.phase !== "offseason") { state.currentView = "live"; return; }
  if (state.phase === "offseason") return;
  state.day += 1;
  applyDailyRecovery();
  advanceDLeagueSchedule();
  if (state.phase === "regular") {
    const todays = state.schedule.filter((g) => !g.played && g.day <= state.day);
    todays.forEach((game) => simulateGame(game));
    if (todays.some(involvesMyTeam)) {
      state.stamina = Math.max(25, state.stamina - 8 - Math.round(state.tactics.defense / 20));
    } else {
      state.stamina = Math.min(100, state.stamina + 3);
    }
    if (state.schedule.every((g) => g.played)) startPlayoffs();
  } else if (state.phase === "playoff") {
    advancePlayoffDay();
  }
}

function playNextGame() {
  if (state.phase === "offseason") {
    addNews("오프시즌입니다. 리그 화면에서 새 시즌을 시작하세요.", { sender: "front", title: "오프시즌 안내" });
    return;
  }
  // 진행 중인 라이브 경기가 있으면 그 화면으로 복귀
  if (liveGame && !liveGame.ended) { state.currentView = "live"; render(); return; }
  let guard = 0;
  while (guard++ < 300 && state.phase !== "offseason") {
    if (state.phase === "regular") {
      const next = state.schedule.find((g) => !g.played && involvesMyTeam(g));
      if (!next) { advanceOneDay(); continue; }
      if (state.day < next.day - 1) { advanceOneDay(); continue; }
      if (state.day < next.day) { state.day = next.day; applyDailyRecovery(); } // 경기 당일로 이동 (같은 날 타 경기는 종료 후 일괄 처리)
      startLiveMatch(next);
      return;
    } else {
      // 플레이오프: 내 팀 시리즈는 라이브, 나머지는 자동
      const po = state.playoffs;
      const mySeries = po && po.series.find((s) => !s.winner && (s.high === state.selectedTeamId || s.low === state.selectedTeamId));
      if (mySeries) { startLiveMatch(makeSeriesGame(mySeries), mySeries); return; }
      advanceOneDay();
      break;
    }
  }
}

// ===== 박스스코어 생성 (선수 능력치 기반 분배 - 추후 매치업 엔진이 실계산으로 대체) =====
function distributeInt(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (total * w) / sum);
  const base = raw.map(Math.floor);
  let rem = total - base.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]);
  let k = 0;
  while (rem > 0) { base[order[k % order.length][1]] += 1; rem -= 1; k += 1; }
  return base;
}

function generateBoxScore(teamId, teamScore, oppScore) {
  const roster = rosterFor(teamId).slice(0, 12); // 최대 12인 로테이션
  const attr = (p, key, fallback) => {
    const v = p.attrs ? Number(p.attrs[key]) : NaN;
    return isNaN(v) ? fallback : v;
  };
  const clampNum = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  // 출전시간: 경기 40분 x 5명 = 팀 합계 200분. 주전 몰빵(30~38분), 벤치 끝은 1~2분
  const MIN_W = [34, 32, 30, 27, 25, 12, 9, 7, 5, 3, 2, 1];
  const minW = roster.map((p, i) => Math.max(0, (MIN_W[i] || 1) + randomBetween(-2, 2)));
  for (let i = 10; i < minW.length; i += 1) { if (Math.random() < 0.45) minW[i] = 0; } // 11~12번째는 결장도
  const minutes = distributeInt(200, minW);
  // 개인 40분 상한 (초과분은 다음 주전에게, 2회 순회로 연쇄 초과 방지)
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 0; i < minutes.length; i += 1) {
      if (minutes[i] > 38) { minutes[(i + 1) % 5] += minutes[i] - 38; minutes[i] = 38; }
    }
  }
  // 득점: 공격OVR(포지션 정체성 반영 - 빅맨은 포스트/근거리, 가드는 3점/플레이메이킹) 가중
  //       외국인 용병은 KBL 현실대로 볼 소유율 보정 x1.18
  const ptsW = roster.map((p, i) => {
    const off = typeof p.atk === "number" ? p.atk : (p.ovr || p.form || 60);
    const pos = p.mainPosition || p.position || "";
    const foreignBump = String(p.playerId || "").startsWith("F") ? 1.3 : 1; // 용병 볼 소유율
    const guardTax = pos.startsWith("PG") || pos.startsWith("SG") ? 0.92 : 1; // 가드 독식 완화
    return Math.pow(Math.max(4, off - 55), 1.8) * minutes[i] * foreignBump * guardTax * (0.85 + Math.random() * 0.3);
  });
  const pts = distributeInt(teamScore, ptsW);
  // 리바운드
  const rebTotal = 30 + randomBetween(0, 8);
  const rebW = roster.map((p, i) => Math.max(2, (attr(p, "공격리바운드", 50) + attr(p, "수비리바운드", 50)) / 2 - 35) * minutes[i] * (0.8 + Math.random() * 0.4));
  const reb = distributeInt(rebTotal, rebW);
  // 어시스트
  const astTotal = Math.round(teamScore * 0.21) + randomBetween(-2, 2);
  const astW = roster.map((p, i) => Math.pow(Math.max(3, attr(p, "패스정확도", 50) - 40), 2) * minutes[i] * (0.8 + Math.random() * 0.4));
  const ast = distributeInt(Math.max(8, astTotal), astW);
  // 스틸/블록
  const stl = distributeInt(4 + randomBetween(0, 5), roster.map((p, i) => Math.max(1, attr(p, "스틸", 45) - 40) * minutes[i] * (0.7 + Math.random() * 0.6)));
  const blk = distributeInt(2 + randomBetween(0, 3), roster.map((p, i) => Math.max(1, attr(p, "블록", 40) - 35) * minutes[i] * (0.7 + Math.random() * 0.6)));
  // 턴오버: 볼을 만지는 시간이 긴 핸들러(어시스트 많은 가드) 중심으로 발생
  const to = distributeInt(11 + randomBetween(0, 5), roster.map((p, i) => {
    const isGuard = ["PG", "SG"].includes(p.mainPosition || p.position);
    return Math.max(1, ast[i] * 1.4 + pts[i] * 0.45 + minutes[i] * 0.08) * (isGuard ? 1.15 : 0.85);
  }));
  const pf = distributeInt(17 + randomBetween(0, 6), roster.map((p, i) => minutes[i] * (["PF", "C"].includes(p.mainPosition || p.position) ? 1.3 : 1)));
  const margin = oppScore != null ? teamScore - oppScore : 0;

  return roster.map((p, i) => {
    const myPts = pts[i];
    // 득점 분해: 자유투 -> 3점 -> 2점 (능력치 성향 반영)
    const a3 = attr(p, "3점슛", 50);
    const aIn = (attr(p, "근거리슛", 55) + attr(p, "중거리슛", 55)) / 2;
    // 자유투: 돌파/포스트형 + 에이스가 많이 얻되, 누구나 최소 3%는 얻음 (0개 고정 방지)
    const driveTend = (attr(p, "드라이빙레이업", 50) + attr(p, "포스트컨트롤", 50)) / 2;
    const ftTend = clampNum((driveTend - 68) / 70, 0.03, 0.2) + (myPts >= 18 ? 0.05 : 0);
    let ftm = Math.min(myPts, Math.round(myPts * ftTend * (0.6 + Math.random() * 0.8)));
    // 자유투 0개 방지: 어느 정도 득점한 선수는 28% 확률로 최소 2구 얻음
    if (ftm === 0 && myPts >= 4 && Math.random() < 0.28) ftm = 2;
    let rest = myPts - ftm;
    const w3 = Math.max(0, a3 - 42);
    const share3 = (w3 / (w3 + Math.max(1, aIn - 42))) * 0.62;
    let tpm = Math.floor((rest * share3) / 3);
    rest -= tpm * 3;
    if (rest % 2 === 1) {
      // 홀수 점: 슈터는 3점 하나로 흡수, 아니면 앤드원 자유투
      if (a3 >= 55 && rest >= 3) { tpm += 1; rest -= 3; }
      else { ftm += 1; rest -= 1; }
    }
    const fgm2 = rest / 2;
    // 시도 수: 능력치 기반 성공률 역산
    // 2점 성공률 포지션 보정: 가드의 2점은 돌파/미드레인지(어려운 슛), 빅맨은 림 근처(쉬운 슛)
    const pos2Adj = { PG: -6, SG: -5, SF: -2, PF: 3, C: 5 }[p.mainPosition || p.position] || 0;
    const pct3 = clampNum(a3 * 0.45, 25, 46) / 100;
    const pct2 = clampNum(aIn * 0.72 + pos2Adj, 38, 66) / 100;
    const pctFt = clampNum(attr(p, "자유투", 65) * 0.95, 55, 92) / 100;
    const tpa = tpm > 0 ? Math.max(tpm, Math.round(tpm / pct3)) : (a3 >= 60 && minutes[i] > 10 ? randomBetween(1, 3) : 0);
    const fga2 = fgm2 > 0 ? Math.max(fgm2, Math.round(fgm2 / pct2)) : (minutes[i] > 8 ? randomBetween(0, 2) : 0);
    const fta = ftm > 0 ? Math.max(ftm, Math.round(ftm / pctFt)) : 0;
    // 리바운드 분해
    const orShare = clampNum(attr(p, "공격리바운드", 45) / (attr(p, "공격리바운드", 45) + attr(p, "수비리바운드", 55)), 0.15, 0.5);
    const oreb = Math.round(reb[i] * orShare);
    const dreb = reb[i] - oreb;
    // +/-: 팀 마진 x 출전 비중 + 노이즈
    const pm = Math.round(margin * (minutes[i] / 40) * (0.8 + Math.random() * 0.4)) + randomBetween(-4, 4);
    return {
      id: p.playerId || p.name,
      name: p.name, pos: p.mainPosition || p.position, min: minutes[i],
      pts: myPts, reb: reb[i], oreb, dreb, ast: ast[i], stl: stl[i], blk: blk[i],
      fgm: fgm2 + tpm, fga: fga2 + tpa, tpm, tpa, ftm, fta,
      to: to[i], pf: pf[i], pm,
    };
  }).filter((p) => p.min > 0); // 결장자는 결과지에서 제외
}

// ===== 시즌 기록 누적 (정규시즌/플레이오프 분리 저장) =====
const PSTAT_KEYS = ["min", "pts", "reb", "oreb", "dreb", "ast", "stl", "blk", "fgm", "fga", "tpm", "tpa", "ftm", "fta", "to", "pf", "pm"];
function accumulateStats(game, homeBox, awayBox) {
  const tKey = game.playoff ? "poTeamStats" : "teamStats";
  const pKey = game.playoff ? "poPlayerStats" : "playerStats";
  if (!state[tKey]) state[tKey] = {};
  if (!state[pKey]) state[pKey] = {};
  const add = (teamId, box, myScore, oppScore) => {
    const t = state[tKey][teamId] || (state[tKey][teamId] = { g: 0, pts: 0, opp: 0, reb: 0, ast: 0, stl: 0, blk: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, to: 0, pf: 0 });
    t.g += 1; t.pts += myScore; t.opp += oppScore;
    for (const p of box) {
      t.reb += p.reb; t.ast += p.ast; t.stl += p.stl; t.blk += p.blk;
      t.fgm += p.fgm; t.fga += p.fga; t.tpm += p.tpm; t.tpa += p.tpa;
      t.ftm += p.ftm; t.fta += p.fta; t.oreb += p.oreb; t.dreb += p.dreb;
      t.to += p.to; t.pf += p.pf;
      const s = state[pKey][p.id] || (state[pKey][p.id] = { name: p.name, team: teamId, pos: p.pos, g: 0, ...Object.fromEntries(PSTAT_KEYS.map((k) => [k, 0])) });
      s.name = p.name; s.team = teamId; s.pos = p.pos;
      s.g += 1;
      for (const k of PSTAT_KEYS) s[k] += p[k] || 0;
    }
  };
  add(game.home, homeBox, game.homeScore, game.awayScore);
  add(game.away, awayBox, game.awayScore, game.homeScore);
}

// ===== 경기 시뮬 (포제션 기반 매치엔진 - engine.js) =====
function simulateGame(game) {
  // 코트 위 10명의 개인 능력치·매치업만으로 경기 전체를 판정
  const result = playMatch(game.home, game.away);
  game.homeScore = result.homeScore;
  game.awayScore = result.awayScore;
  game.ot = result.ot || 0;
  game.played = true;
  applyGameFatigue(result);

  if (!game.playoff) {
    applyResult(game.home, game.homeScore, game.awayScore);
    applyResult(game.away, game.awayScore, game.homeScore);
  }

  // 통계 누적은 전 경기, 결과지/문자중계 저장은 내 팀 경기 + 플레이오프만 (세이브 용량 관리)
  accumulateStats(game, result.homeBox, result.awayBox);
  if (involvesMyTeam(game) || game.playoff) {
    game.box = { home: result.homeBox, away: result.awayBox };
    game.pbp = result.pbp;
    trimOldPbp();
  }

  if (!involvesMyTeam(game)) return; // 타팀 경기는 조용히 처리

  const myTeamIsHome = game.home === state.selectedTeamId;
  const myScore = myTeamIsHome ? game.homeScore : game.awayScore;
  const oppScore = myTeamIsHome ? game.awayScore : game.homeScore;
  const opponent = teamById(myTeamIsHome ? game.away : game.home);
  const won = myScore > oppScore;
  const prefix = game.playoff ? `[${game.stage} ${game.gameNo}차전] ` : "";
  const otTag = game.ot ? ` (연장${game.ot > 1 ? game.ot + "차" : ""})` : "";

  state.morale = clamp(state.morale + (won ? 7 : -5), 20, 100);
  const myBox = myTeamIsHome ? game.box.home : game.box.away;
  const top = [...myBox].sort((a, b) => b.pts - a.pts)[0];
  addNews(
    `${selectedTeam().name}이(가) ${opponent.name}을(를) 상대로 ${myScore}:${oppScore}로 ${won ? "승리했습니다" : "패배했습니다"}${otTag}. ${top ? `${top.name} 선수가 ${top.pts}득점으로 이날 경기 최고 활약을 펼쳤습니다.` : ""}`,
    { sender: "sportsnews", title: `${prefix}${selectedTeam().name} ${won ? "승" : "패"}, ${opponent.name}전 ${myScore}:${oppScore}` },
  );
}

// D리그 경기: 조용히 백그라운드로만 진행 (문자중계·기록 저장 없이 스코어/승패만 반영).
// 두 팀 다 D리그 로스터가 5명 이상이어야 실제로 열리고, 부족하면 그 경기는 보류(미진행) 상태로 남는다.
function simulateDLeagueGame(game) {
  if (dleagueAvailableCountFor(game.home) < 5 || dleagueAvailableCountFor(game.away) < 5) return;
  const result = playMatch(game.home, game.away, true);
  game.homeScore = result.homeScore;
  game.awayScore = result.awayScore;
  game.ot = result.ot || 0;
  game.played = true;
  applyGameFatigue(result, true); // 컨디션 소모·부상·경기감각 회복(약하게)까지 1군과 동일 로직으로 처리
  const st = state.dleagueStandings;
  const add = (teamId, pf, pa) => {
    const s = st[teamId] || (st[teamId] = { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 });
    s.pointsFor += pf; s.pointsAgainst += pa;
    if (pf > pa) s.wins += 1; else s.losses += 1;
  };
  add(game.home, game.homeScore, game.awayScore);
  add(game.away, game.awayScore, game.homeScore);
}

// 오늘까지 도래한 D리그 경기를 전부 진행 (1군과 같은 날짜 진행 흐름에 맞춰 호출)
function advanceDLeagueSchedule() {
  (state.dleagueSchedule || []).filter((g) => !g.played && g.day <= state.day).forEach((g) => simulateDLeagueGame(g));
}

// 문자중계는 최근 10경기만 보관 (세이브 용량 관리)
function trimOldPbp() {
  const withPbp = state.schedule.filter((g) => g.pbp);
  while (withPbp.length > 10) {
    delete withPbp.shift().pbp;
  }
}

// ===== 플레이오프 (KBL 방식: 6강 5전3선승 -> 4강 5전3선승 -> 챔프전 7전4선승) =====
function startPlayoffs() {
  state.phase = "playoff";
  const order = getStandings().map((t) => t.id);
  state.playoffs = {
    stage: "6강",
    finalists: [order[0], order[1]], // 1·2위는 4강 직행
    series: [
      makeSeries(order[2], order[5], 3),
      makeSeries(order[3], order[4], 3),
    ],
    results: [],
  };
  addNews(
    `정규시즌이 모두 마무리됐습니다. 6강 플레이오프 대진이 확정됐습니다: ${teamById(order[2]).name} vs ${teamById(order[5]).name}, ${teamById(order[3]).name} vs ${teamById(order[4]).name}.`,
    { sender: "sportsnews", title: "플레이오프 대진 확정", priority: "important" },
  );
}

function makeSeries(high, low, target) {
  return { high, low, target, highWins: 0, lowWins: 0, winner: null, gameNo: 0 };
}

function makeSeriesGame(series) {
  series.gameNo += 1;
  const highHome = [1, 2, 5, 7].includes(series.gameNo); // 2-2-1(-1-1) 포맷
  return {
    day: state.day,
    home: highHome ? series.high : series.low,
    away: highHome ? series.low : series.high,
    played: false, homeScore: null, awayScore: null,
    playoff: true, stage: state.playoffs.stage, gameNo: series.gameNo,
  };
}

function finishSeriesGame(series, game) {
  state.playoffs.results.push(game);
  const winnerId = game.homeScore > game.awayScore ? game.home : game.away;
  if (winnerId === series.high) series.highWins += 1; else series.lowWins += 1;
  if (series.highWins >= series.target) series.winner = series.high;
  else if (series.lowWins >= series.target) series.winner = series.low;
  if (series.winner) {
    addNews(
      `${state.playoffs.stage}에서 ${teamById(series.winner).name}이(가) 시리즈 전적 ${series.highWins}승 ${series.lowWins}패로 승리하며 다음 라운드에 진출했습니다.`,
      { sender: "sportsnews", title: `[${state.playoffs.stage}] ${teamById(series.winner).name} 시리즈 승리` },
    );
  }
}

function playSeriesGame(series) {
  if (series.winner) return;
  const game = makeSeriesGame(series);
  simulateGame(game);
  finishSeriesGame(series, game);
}

function advancePlayoffDay() {
  const po = state.playoffs;
  if (!po) return;
  po.series.filter((s) => !s.winner).forEach(playSeriesGame);
  if (po.series.every((s) => s.winner)) advancePlayoffStage();
}

function advancePlayoffStage() {
  const po = state.playoffs;
  const winners = po.series.map((s) => s.winner);
  if (po.stage === "6강") {
    po.stage = "4강";
    po.series = [
      makeSeries(po.finalists[0], winners[1], 3), // 1위 vs (4·5위전 승자)
      makeSeries(po.finalists[1], winners[0], 3), // 2위 vs (3·6위전 승자)
    ];
    addNews(
      `4강 플레이오프 대진이 확정됐습니다: ${teamById(po.finalists[0]).name} vs ${teamById(winners[1]).name}, ${teamById(po.finalists[1]).name} vs ${teamById(winners[0]).name}.`,
      { sender: "sportsnews", title: "4강 대진 확정" },
    );
  } else if (po.stage === "4강") {
    po.stage = "챔프전";
    po.series = [makeSeries(winners[0], winners[1], 4)];
    addNews(
      `챔피언결정전이 개막합니다. ${teamById(winners[0]).name}과(와) ${teamById(winners[1]).name}이(가) 7전 4선승제로 시즌 최종 우승컵을 놓고 격돌합니다.`,
      { sender: "sportsnews", title: "챔피언결정전 개막", priority: "important" },
    );
  } else if (po.stage === "챔프전") {
    state.champion = po.series[0].winner;
    state.phase = "offseason";
    addNews(
      `${teamById(state.champion).name}이(가) 챔피언결정전을 제패하며 시즌 ${state.season} 챔피언에 등극했습니다. 시즌 내내 이어온 노력이 우승이라는 결실을 맺었습니다.`,
      { sender: "sportsnews", title: `${teamById(state.champion).name}, 시즌 ${state.season} 챔피언 등극`, priority: "important" },
    );
    computeSeasonAwards();
  }
}

// ===== 시즌 시상식 =====
function computeSeasonAwards() {
  const ageMap = {};
  if (typeof KBL_REAL_ROSTERS !== "undefined") {
    Object.values(KBL_REAL_ROSTERS).forEach((list) => list.forEach((p) => { ageMap[p.id] = ageAt(p.birth, p.age); }));
  }
  const entries = Object.entries(state.playerStats || {})
    .map(([id, s]) => ({ id, ...s, age: ageMap[id] }))
    .filter((s) => s.g >= 20);
  if (!entries.length) { state.awards = null; return; }

  const per = (s, k) => s[k] / s.g;
  const eff = (s) => (s.pts + s.reb * 1.2 + s.ast * 1.5 + s.stl * 2 + s.blk * 2 - s.to) / s.g;
  const winPct = (teamId) => {
    const st = state.standings[teamId];
    return st && st.wins + st.losses ? st.wins / (st.wins + st.losses) : 0;
  };
  const mvpScore = (s) => eff(s) * (1 + winPct(s.team) * 0.5); // 개인 생산성 x 팀 성적 가중
  const top = (list, fn) => (list.length ? [...list].sort((a, b) => fn(b) - fn(a))[0] : null);
  const slim = (s) => (s ? { name: s.name, team: (teamById(s.team) || {}).name || s.team, pos: s.pos, line: `${per(s, "pts").toFixed(1)}점 ${per(s, "reb").toFixed(1)}리바 ${per(s, "ast").toFixed(1)}어시` } : null);

  const g30 = entries.filter((s) => s.g >= 30);
  const mvpK = top(g30.filter((s) => s.id.startsWith("K")), mvpScore);
  const mvpF = top(g30.filter((s) => !s.id.startsWith("K")), mvpScore);
  // 신인/기량발전은 국내선수 대상
  const rookie = top(entries.filter((s) => s.id.startsWith("K") && s.age != null && s.age <= 23 && s !== mvpK), eff);
  const defensive = top(g30, (s) => per(s, "stl") * 3 + per(s, "blk") * 3 + per(s, "reb") * 0.5);
  // 식스맨 = 팀 내 출전시간 상위 5인(주전)이 아닌 선수
  const starterIds = new Set();
  teams.forEach((t) => {
    entries.filter((s) => s.team === t.id).sort((a, b) => per(b, "min") - per(a, "min")).slice(0, 5).forEach((s) => starterIds.add(s.id));
  });
  const sixth = top(g30.filter((s) => !starterIds.has(s.id) && per(s, "min") >= 12), eff);
  const improved = top(entries.filter((s) => s.id.startsWith("K") && s.age != null && s.age >= 22 && s.age <= 26 && s !== rookie && s !== mvpK), eff);
  const fairplay = top(g30.filter((s) => per(s, "min") >= 20), (s) => -per(s, "pf"));
  const coachTeam = getStandings()[0];
  const coachName = coachTeam.id === state.selectedTeamId ? `${state.manager.name} 감독 (${coachTeam.name})` : `${coachTeam.name} 감독`;
  // 베스트5: MVP(국내/외국)는 해당 포지션에 우선 배치, 나머지는 포지션별 EFF 1위
  const bestUsed = new Set();
  const mvpLock = [mvpF, mvpK].filter(Boolean);
  const best5 = positions.map((pos) => {
    const locked = mvpLock.find((s) => s.pos === pos && !bestUsed.has(s.id));
    const pick = locked || top(g30.filter((s) => s.pos === pos && !bestUsed.has(s.id)), eff);
    if (pick) bestUsed.add(pick.id);
    return slim(pick);
  });

  state.awards = {
    season: state.season,
    mvpK: slim(mvpK), mvpF: slim(mvpF), rookie: slim(rookie),
    defensive: slim(defensive), sixth: slim(sixth), improved: slim(improved),
    fairplay: fairplay ? { ...slim(fairplay), line: `경기당 파울 ${per(fairplay, "pf").toFixed(1)}개` } : null,
    coach: coachName,
    best5,
  };
  if (mvpK) {
    addNews(
      `KBL 시상식에서 ${mvpK.name} 선수가 시즌 ${state.season} 국내선수 MVP로 선정되었습니다.`,
      { sender: "press", title: `시즌 ${state.season} 국내선수 MVP: ${mvpK.name}`, priority: "important" },
    );
  }
  if (mvpF) {
    addNews(
      `KBL 시상식에서 ${mvpF.name} 선수가 시즌 ${state.season} 외국선수 MVP로 선정되었습니다.`,
      { sender: "press", title: `시즌 ${state.season} 외국선수 MVP: ${mvpF.name}`, priority: "important" },
    );
  }
  addNews(
    `시즌 ${state.season} 감독상 수상자로 ${coachName}이(가) 선정되었습니다.`,
    { sender: "press", title: "시즌 감독상 발표" },
  );
}

function startNewSeason() {
  // ── 지난 시즌 아카이브: 우승·시상·순위·선수 기록을 보존하고 통산에 누적 ──
  state.seasonHistory = state.seasonHistory || [];
  state.seasonHistory.push({
    season: state.season,
    champion: state.champion,
    awards: state.awards || null,
    standings: state.standings,
    playerStats: state.playerStats,
    poPlayerStats: state.poPlayerStats,
  });
  state.careerStats = state.careerStats || {};
  const KEYS = ["g", "min", "pts", "reb", "ast", "stl", "blk", "fgm", "fga", "tpm", "tpa", "ftm", "fta", "to", "pf", "pm"];
  Object.entries(state.playerStats || {}).forEach(([pid, s]) => {
    if (!s.g) return;
    const c = state.careerStats[pid] || (state.careerStats[pid] = { seasons: 0, name: s.name, ...Object.fromEntries(KEYS.map((k) => [k, 0])) });
    c.seasons += 1;
    c.name = s.name;
    KEYS.forEach((k) => { c[k] += s[k] || 0; });
  });

  state.season += 1;
  state.day = 1;
  state.phase = "regular";
  state.playoffs = null;
  state.champion = null;
  state.playerCondition = {}; // 오프시즌 동안 전원 체력 100% 회복
  state.injuries = {};
  state.sharpness = {}; // 오프시즌 동안 실전 공백은 다들 마찬가지라 중립값으로 리셋
  state.schedule = buildSchedule();
  state.standings = Object.fromEntries(
    teams.map((team) => [team.id, { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 }]),
  );
  // D리그 로스터 배정(누가 2군인지)은 시즌이 바뀌어도 유지, 일정/순위만 새로 편성
  state.dleagueSchedule = buildDLeagueSchedule();
  state.dleagueStandings = Object.fromEntries(
    teams.map((team) => [team.id, { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 }]),
  );
  state.teamStats = {};
  state.playerStats = {};
  state.poTeamStats = {};
  state.poPlayerStats = {};
  state.morale = 62;
  state.stamina = 84;
  addNews(
    `시즌 ${state.season}이 개막합니다. 10개 구단의 새 일정이 편성되었으며, 모든 팀이 새로운 각오로 시즌을 준비하고 있습니다.`,
    { sender: "sportsnews", title: `시즌 ${state.season} 개막`, priority: "important" },
  );
}

function managerBoost() {
  const tacticBalance = 100 - Math.abs(state.tactics.pace - state.tactics.threePoint);
  const manager = state.manager?.attributes || defaultManager().attributes;
  const matchPrep = (manager.tactics + manager.analysis + manager.motivation + manager.leadership) / 4;
  return Math.round((state.morale - 50) / 8 + (state.stamina - 60) / 12 + tacticBalance / 30 + (matchPrep - 55) / 10);
}

function applyResult(teamId, pointsFor, pointsAgainst) {
  const standing = state.standings[teamId];
  standing.pointsFor += pointsFor;
  standing.pointsAgainst += pointsAgainst;
  if (pointsFor > pointsAgainst) standing.wins += 1;
  else standing.losses += 1;
}

function nextGameText() {
  if (state.phase === "playoff") {
    const mySeries = state.playoffs?.series.find(
      (s) => !s.winner && (s.high === state.selectedTeamId || s.low === state.selectedTeamId),
    );
    if (mySeries) {
      const opp = teamById(mySeries.high === state.selectedTeamId ? mySeries.low : mySeries.high);
      return `${state.playoffs.stage} ${mySeries.gameNo + 1}차전 vs ${opp.name}`;
    }
    return `플레이오프 진행중 (탈락/관전)`;
  }
  if (state.phase === "offseason") return "오프시즌";
  const game = state.schedule.find((item) => !item.played && involvesMyTeam(item));
  if (!game) return "정규시즌 종료";
  const opponent = teamById(game.home === state.selectedTeamId ? game.away : game.home);
  return `${fmtDate(game.day)} vs ${opponent.name}`;
}

function teamRecordRowsHtml(teamId) {
  const stats = state.teamStats || {};
  const mine = stats[teamId];
  if (!mine || !mine.g) return '<div class="empty-record">시즌 기록 없음</div>';
  // 지표별 리그 순위 계산 (실점/턴오버는 낮을수록 상위)
  const metric = (label, key, lowerBetter) => {
    const vals = teams
      .filter((t) => stats[t.id] && stats[t.id].g)
      .map((t) => ({ id: t.id, v: stats[t.id][key] / stats[t.id].g }))
      .sort((a, b) => (lowerBetter ? a.v - b.v : b.v - a.v));
    const rank = vals.findIndex((x) => x.id === teamId) + 1;
    const myVal = (mine[key] / mine.g).toFixed(1);
    return `<div class="record-row"><span>${label}</span><strong>${myVal}</strong><em>${rank}위</em></div>`;
  };
  return [
    metric("득점", "pts", false),
    metric("실점", "opp", true),
    metric("리바운드", "reb", false),
    metric("어시스트", "ast", false),
    metric("턴오버", "to", true),
  ].join("");
}

function lastGameRecordsHtml() {
  const myId = state.selectedTeamId;
  const poGames = state.playoffs ? state.playoffs.results.filter(involvesMyTeam) : [];
  const candidates = [...state.schedule.filter((g) => g.played && involvesMyTeam(g)), ...poGames.filter((g) => g.played)];
  const last = candidates[candidates.length - 1];
  if (!last) return '<div class="empty-record">이용 가능한 경기 기록 없음</div>';
  ensureBoxScore(last); // 과거 경기는 즉석 생성
  const myBox = last.home === myId ? last.box.home : last.box.away;
  return [...myBox]
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 4)
    .map((p) => `<div class="record-row"><span>${playerLink(p.id, p.name)}</span><strong>${p.pts}점</strong><em>${p.reb}리바 ${p.ast}어시</em></div>`)
    .join("");
}

function addNews(body, opts = {}) {
  const sender = opts.sender || "front";
  const meta = newsMetaOf(sender);
  state.newsSeq = (state.newsSeq || 0) + 1;
  state.news.push({
    id: `n${state.newsSeq}`,
    day: state.day,
    season: state.season,
    sender,
    title: opts.title || meta.tag,
    body,
    read: false,
    priority: opts.priority || "normal",
    link: opts.link || null,
  });
  state.news = state.news.slice(-60);
}

function unreadNewsCount() {
  return (state.news || []).reduce((n, item) => n + (item.read ? 0 : 1), 0);
}

function markAllNewsRead() {
  (state.news || []).forEach((item) => { item.read = true; });
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

render();
