const $ = id => document.getElementById(id);
const STORAGE = "callsign-trainer-cz-v1";
const saved = JSON.parse(localStorage.getItem(STORAGE) || "{}");
let state = {
  correct: saved.correct || 0, wrong: saved.wrong || 0, streak: saved.streak || 0,
  cards: saved.cards || {}, current: null, answered: false, lastId: null
};

const mode = $("modeSelect"), airport = $("airportSelect"), weakOnly = $("weakOnly");
mode.value = saved.mode || "icao-callsign";
airport.value = saved.airport || "ALL";
weakOnly.checked = saved.weakOnly || false;

function normalize(s) { return s.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function idOf(a) { return a.icao; }
function cardStats(a) { return state.cards[idOf(a)] || {right:0, wrong:0}; }
function pool() {
  let p = AIRLINES.filter(a => airport.value === "ALL" || a.airports.includes(airport.value));
  if (weakOnly.checked) p = p.filter(a => cardStats(a).wrong > cardStats(a).right);
  return p;
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
  state.current = choose(); state.answered = false;
  $("feedback").classList.add("hidden"); $("answerForm").classList.remove("hidden");
  if (!state.current) {
    $("prompt").textContent = "Žádné otázky";
    $("hint").textContent = "Nejdřív si pár aerolinek procvič bez filtru problematických.";
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
  localStorage.setItem(STORAGE, JSON.stringify({correct:state.correct,wrong:state.wrong,streak:state.streak,cards:state.cards,mode:mode.value,airport:airport.value,weakOnly:weakOnly.checked}));
}

$("answerForm").addEventListener("submit", e => { e.preventDefault(); check(); });
$("dontKnowBtn").addEventListener("click", () => check(true));
$("nextBtn").addEventListener("click", renderQuestion);
[mode,airport,weakOnly].forEach(el => el.addEventListener("change", () => { save(); renderQuestion(); }));
$("settingsBtn").addEventListener("click", () => $("setup").classList.toggle("collapsed"));
$("resetBtn").addEventListener("click", () => { if(confirm("Opravdu vynulovat všechny statistiky?")){ state.correct=state.wrong=state.streak=0; state.cards={}; save(); updateStats(); renderQuestion(); }});
document.addEventListener("keydown", e => { if (e.key === "Enter" && state.answered) { e.preventDefault(); renderQuestion(); } });
updateStats(); renderQuestion();
