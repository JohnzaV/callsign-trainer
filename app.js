const $ = id => document.getElementById(id);
const STORAGE = "callsign-trainer-cz-v1";
const saved = JSON.parse(localStorage.getItem(STORAGE) || "{}");
let state = {
  correct: saved.correct || 0, wrong: saved.wrong || 0, streak: saved.streak || 0,
  cards: saved.cards || {}, current: null, answered: false, lastId: null
};

const GROUPS = {
  COMMON: ["AUA","BEL","BAW","DLH","KLM","LOT","RYR","SAS","SWR","TVS","THY","EWG","EZY","WZZ","VLG","FIN","IBE","TAP","AFR","ASL"],
  EUROPE: ["AEE","EIN","BTI","AEA","AFR","MNE","ASL","AUA","BGH","BAW","BEL","LZB","CTN","EZY","EWG","FIN","IBE","ICE","EXS","KLM","LOT","DLH","LGL","KMM","NOZ","FPY","RYR","SAS","SEH","TVS","SWR","TAP","ROT","TRA","TVF","VOE","VLG","WZZ"],
  NORTH_AMERICA: ["ACA","DAL","UAL"],
  MIDDLE_EAST: ["ABY","ELY","UAE","ETD","FDB","ISR","PGT","QTR","SVA","SXS","TWI","THY"],
  ASIA: ["AAR","AHY","CAL","CHH","FIA","KAL","QNT","UZB"],
  AFRICA: ["MSC","MSR","LBT","TAR"],
  CHARTER: ["MSC","BGH","LZB","CAI","ENT","EAF","FHY","NOS","SEH","TVS","SXS","TWI","TAR","WFL"]
};
const mode = $("modeSelect"), airport = $("airportSelect"), airlineGroup = $("airlineGroup"), airlineFilter = $("airlineFilter"), weakOnly = $("weakOnly");
mode.value = saved.mode || "icao-callsign";
airport.value = saved.airport || "ALL";
airlineGroup.value = saved.airlineGroup || "ALL";
airlineFilter.value = saved.airlineFilter || "";
weakOnly.checked = saved.weakOnly || false;
let customAirlines = saved.customAirlines || [];

function normalize(s) { return s.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function idOf(a) { return a.icao; }
function cardStats(a) { return state.cards[idOf(a)] || {right:0, wrong:0}; }
function pool() {
  let p = AIRLINES.filter(a => airport.value === "ALL" || a.airports.includes(airport.value));
  if (airlineGroup.value === "CUSTOM") p = p.filter(a => customAirlines.includes(a.icao));
  else if (airlineGroup.value !== "ALL") p = p.filter(a => GROUPS[airlineGroup.value].includes(a.icao));
  const query = airlineFilter.value.trim().toLocaleLowerCase("cs-CZ");
  if (query) p = p.filter(a => [a.airline, a.icao, a.callsign].some(value => value.toLocaleLowerCase("cs-CZ").includes(query)));
  if (weakOnly.checked) p = p.filter(a => cardStats(a).wrong > cardStats(a).right);
  return p;
}
function renderCustomAirlines() {
  const isCustom = airlineGroup.value === "CUSTOM";
  $("customAirlines").classList.toggle("hidden", !isCustom);
  if (!isCustom) return;
  const query = airlineFilter.value.trim().toLocaleLowerCase("cs-CZ");
  const airlines = AIRLINES.filter(a => !query || [a.airline, a.icao, a.callsign].some(value => value.toLocaleLowerCase("cs-CZ").includes(query)));
  $("customAirlineList").innerHTML = airlines.map(a => `<label><input type="checkbox" value="${a.icao}" ${customAirlines.includes(a.icao) ? "checked" : ""}><span>${a.airline}</span><small>${a.icao}</small></label>`).join("");
}
function choose() {
  const p = pool();
  $("poolCount").textContent = `${p.length} aerolinek ve výběru`;
  if (!p.length) return null;
  const weighted = p.flatMap(a => Array(Math.max(1, 1 + cardStats(a).wrong * 2 - cardStats(a).right)).fill(a));
  let pick = weighted[Math.floor(Math.random() * weighted.length)];
  if (p.length > 1) while (idOf(pick) === state.lastId) pick = weighted[Math.floor(Math.random() * weighted.length)];
  return pick;
}
function renderQuestion() {
  renderCustomAirlines();
  state.current = choose(); state.answered = false;
  $("feedback").classList.add("hidden"); $("answerForm").classList.remove("hidden");
  if (!state.current) {
    $("prompt").textContent = "Žádné otázky";
    $("hint").textContent = "Uprav filtr aerolinek, letiště nebo vypni výběr problematických.";
    $("answerFields").innerHTML = ""; return;
  }
  const a = state.current, m = mode.value;
  $("airportBadges").innerHTML = a.airports.map(x => `<b>${x}</b>`).join("");
  if (m === "icao-callsign") setCard("ICAO KÓD", a.icao, "Zadej radiotelefonní volací znak", [["answer","Volací znak","SPEEDBIRD"]]);
  if (m === "callsign-icao") setCard("VOLACÍ ZNAK", a.callsign, "Zadej třípísmenný ICAO kód", [["answer","ICAO kód","BAW"]]);
  if (m === "airline-both") setCard("AEROLINKA", a.airline, "Zadej ICAO kód i volací znak", [["icaoAnswer","ICAO kód","BAW"],["callsignAnswer","Volací znak","SPEEDBIRD"]]);
  setTimeout(() => $("answerFields").querySelector("input")?.focus(), 0);
}
function setCard(label, prompt, hint, fields) {
  $("questionLabel").textContent = label; $("prompt").textContent = prompt; $("hint").textContent = hint;
  $("answerFields").innerHTML = fields.map(([id,label,placeholder]) => `<label class="answer-label">${label}<input id="${id}" autocomplete="off" autocapitalize="characters" placeholder="${placeholder}"></label>`).join("");
}
function check(forceWrong=false) {
  if (!state.current || state.answered) return;
  const a = state.current, m = mode.value;
  const right = !forceWrong && (m === "icao-callsign" ? normalize($("answer").value) === normalize(a.callsign)
    : m === "callsign-icao" ? normalize($("answer").value) === normalize(a.icao)
    : normalize($("icaoAnswer").value) === normalize(a.icao) && normalize($("callsignAnswer").value) === normalize(a.callsign));
  state.answered = true; state.lastId = idOf(a);
  const s = cardStats(a); state.cards[idOf(a)] = {...s, [right?"right":"wrong"]: s[right?"right":"wrong"] + 1};
  if (right) { state.correct++; state.streak++; } else { state.wrong++; state.streak=0; }
  $("answerForm").classList.add("hidden"); $("feedback").classList.remove("hidden");
  $("feedback").className = `feedback ${right ? "good" : "bad"}`;
  $("feedbackTitle").textContent = right ? "✓ Správně" : "✕ Tentokrát ne";
  $("answerReveal").innerHTML = `<strong>${a.airline}</strong><div><span>${a.icao}</span><span>${a.callsign}</span></div>`;
  updateStats(); save(); $("nextBtn").focus();
}
function updateStats() {
  const total = state.correct + state.wrong;
  $("correctStat").textContent = state.correct; $("streakStat").textContent = state.streak;
  $("accuracyStat").textContent = total ? `${Math.round(state.correct/total*100)} %` : "–";
}
function save() {
  localStorage.setItem(STORAGE, JSON.stringify({correct:state.correct,wrong:state.wrong,streak:state.streak,cards:state.cards,mode:mode.value,airport:airport.value,airlineGroup:airlineGroup.value,airlineFilter:airlineFilter.value,customAirlines,weakOnly:weakOnly.checked}));
}

$("answerForm").addEventListener("submit", e => { e.preventDefault(); check(); });
$("dontKnowBtn").addEventListener("click", () => check(true));
$("nextBtn").addEventListener("click", renderQuestion);
[mode,airport,airlineGroup,weakOnly].forEach(el => el.addEventListener("change", () => { save(); renderQuestion(); }));
airlineFilter.addEventListener("input", () => { save(); renderQuestion(); });
$("customAirlineList").addEventListener("change", e => { if (!e.target.matches("input")) return; customAirlines = Array.from($("customAirlineList").querySelectorAll("input:checked")).map(input => input.value).concat(customAirlines.filter(icao => !Array.from($("customAirlineList").querySelectorAll("input")).some(input => input.value === icao))); save(); renderQuestion(); });
$("selectAllAirlines").addEventListener("click", () => { customAirlines = AIRLINES.map(a => a.icao); save(); renderQuestion(); });
$("clearAirlines").addEventListener("click", () => { customAirlines = []; save(); renderQuestion(); });
$("settingsBtn").addEventListener("click", () => $("setup").classList.toggle("collapsed"));
$("resetBtn").addEventListener("click", () => { if(confirm("Opravdu vynulovat všechny statistiky?")){ state.correct=state.wrong=state.streak=0; state.cards={}; save(); updateStats(); renderQuestion(); }});
document.addEventListener("keydown", e => { if (e.key === "Enter" && state.answered) { e.preventDefault(); renderQuestion(); } });
updateStats(); renderQuestion();
