import { useState, useEffect, useCallback, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════
// TIMETABLE — Level 2 First Diploma in Sport Group B
// Term: 19 Jan 2026 – 05 Jul 2026
// ═══════════════════════════════════════════════════════════════
const TT = {
  1: {
    label: "Monday", sessions: [
      { time: "09:15-10:30", subj: "L2 Spt - EMS M", teacher: "Jackson, Dylan", room: "G218" },
      { time: "10:45-12:00", subj: "L2 Spt - EMS M", teacher: "Jackson, Dylan", room: "G218" },
    ], start: "09:15", end: "12:00",
  },
  2: {
    label: "Tuesday", sessions: [
      { time: "09:15-10:30", subj: "L2B Sport Promotion", teacher: "Godfrey, Suzie", room: "G209" },
      { time: "10:45-12:00", subj: "L2B Sport P&S", teacher: "Godfrey, Suzie", room: "G204" },
      { time: "12:15-13:30", subj: "L2B Sport Exam Prep", teacher: "Bryan, Callan", room: "G209" },
      { time: "14:15-15:30", subj: "L2 Spt - EMS E", teacher: "Bryan, Callan", room: "G219" },
      { time: "15:45-17:00", subj: "L2 Spt - EMS E", teacher: "Bryan, Callan", room: "G219" },
    ], start: "09:15", end: "17:00",
  },
  3: {
    label: "Wednesday", sessions: [
      { time: "09:15-10:30", subj: "L2B Sport Exam Prep", teacher: "Jackson, Dylan", room: "G208" },
      { time: "10:45-12:00", subj: "L2B Sport L&W", teacher: "Jackson, Dylan", room: "G208" },
      { time: "12:15-13:15", subj: "L2B Spt - Group Tutorial", teacher: "—", room: "—" },
      { time: "13:15-14:15", subj: "L2B Spt - Individual Tutorial", teacher: "Bryan, Callan", room: "College" },
    ], start: "09:15", end: "14:15",
  },
  4: {
    label: "Thursday", sessions: [
      { time: "09:15-10:30", subj: "L2B Sport TPF", teacher: "Jackson, Dylan", room: "E5" },
      { time: "10:45-12:00", subj: "L2B Sport TPF", teacher: "Jackson, Dylan", room: "E5" },
      { time: "12:15-13:30", subj: "L2B Sport Injury", teacher: "Jackson, Dylan", room: "G213" },
    ], start: "09:15", end: "13:30",
  },
  5: { label: "Friday", sessions: [], start: null, end: null },
  6: { label: "Saturday", sessions: [], start: null, end: null },
  0: { label: "Sunday", sessions: [], start: null, end: null },
};

const TERM_START = new Date(2026, 0, 19);
const TERM_END = new Date(2026, 6, 5);

// Route
const BIKE_HOME_BKO = { mi: 2.4, mins: 14 };
const BIKE_FNB_COL = { mi: 0.9, mins: 6 };
const TRAIN = 7;
const BUF = 5;

const HUXLEY = "https://national-rail-api.davwheat.dev";

// ═══ HELPERS ═════════════════════════════════════════════════
const fmt = d => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const fmtShort = d => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const fmtLong = d => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const addM = (d, m) => new Date(d.getTime() + m * 60000);
const diffM = (a, b) => Math.round((a - b) / 60000);
const hm = s => { const [h, m] = s.split(":").map(Number); return { h, m }; };
const makeT = (d, h, m) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
const parseTT = (s, ref) => { if (!s || s === "On time" || s === "Cancelled" || s === "Delayed") return null; const p = s.split(":").map(Number); if (p.length < 2 || isNaN(p[0]) || isNaN(p[1])) return null; const d = new Date(ref || new Date()); d.setHours(p[0], p[1], 0, 0); return d; };
const dayClone = (d, off = 0) => { const x = new Date(d); x.setDate(x.getDate() + off); x.setHours(0, 0, 0, 0); return x; };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Find next college day from a date (inclusive)
function nextCollegeDay(from) {
  for (let i = 0; i < 8; i++) {
    const d = dayClone(from, i);
    if (d > TERM_END) return null;
    if (d < TERM_START && i === 0) continue;
    const tt = TT[d.getDay()];
    if (tt.sessions.length > 0) return d;
  }
  return null;
}

// Weather helpers
const wxD = c => ({ 0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Freezing fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Light showers", 81: "Showers", 82: "Heavy showers", 95: "Thunderstorm", 96: "T-storm + hail", 99: "Severe T-storm" }[c] || "—");
const wxI = c => { if (c === 0) return "☀️"; if (c <= 3) return "⛅"; if (c <= 48) return "🌫️"; if (c <= 65) return "🌧️"; if (c <= 75) return "🌨️"; if (c <= 82) return "🌦️"; return "⛈️"; };

const clothe = (t, rain, wind, dark) => {
  let k, l, i;
  if (t <= 0) { k = ["Heavy winter coat", "Thermal base layer", "Thick gloves", "Scarf & beanie", "Waterproof over-trousers", "Winter cycling gloves"]; l = "WRAP UP WARM"; i = "🧥"; }
  else if (t <= 5) { k = ["Warm jacket / puffer", "Hoodie underneath", "Gloves", "Beanie hat", "Thick trousers", "Layered socks"]; l = "LAYER UP"; i = "🧤"; }
  else if (t <= 10) { k = ["Light jacket or fleece", "Hoodie or jumper", "Jeans", "Trainers + socks"]; l = "BRING A JACKET"; i = "🧥"; }
  else if (t <= 15) { k = ["Light hoodie / long sleeve", "Jeans or joggers", "Trainers"]; l = "LIGHT LAYERS"; i = "👕"; }
  else if (t <= 20) { k = ["T-shirt", "Light trousers or shorts", "Trainers", "Sunglasses"]; l = "KEEP COOL"; i = "😎"; }
  else { k = ["Light t-shirt", "Shorts", "Breathable shoes", "Sun cream!", "Water bottle"]; l = "STAY HYDRATED"; i = "🔥"; }
  const e = [];
  if (rain) e.push("Waterproof jacket 🌧️", "Mudguards on bike", "Waterproof bag cover", "Spare socks in bag");
  if (wind > 25) e.push("Windbreaker layer", "Secure hat", "Extra cycling time");
  if (dark) e.push("Hi-vis vest 🦺", "Bike lights charged", "Reflective strips");
  return { k, l, i, e };
};

// ═══ COMPONENTS ══════════════════════════════════════════════
const Pulse = ({ c = "#22c55e" }) => <span style={{ display: "inline-block", position: "relative", width: 10, height: 10, marginRight: 6 }}><span style={{ position: "absolute", inset: 0, borderRadius: "50%", backgroundColor: c, animation: "pulse 2s ease-in-out infinite" }} /><span style={{ position: "absolute", inset: -3, borderRadius: "50%", border: `2px solid ${c}`, animation: "pulsering 2s ease-in-out infinite", opacity: .4 }} /></span>;

const Badge = ({ s, children }) => {
  const c = { good: { bg: "#064e3b", bd: "#10b981", tx: "#6ee7b7" }, warning: { bg: "#78350f", bd: "#f59e0b", tx: "#fcd34d" }, danger: { bg: "#7f1d1d", bd: "#ef4444", tx: "#fca5a5" }, info: { bg: "#1e1b4b", bd: "#818cf8", tx: "#c7d2fe" } }[s] || { bg: "#1e1b4b", bd: "#818cf8", tx: "#c7d2fe" };
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: .5, backgroundColor: c.bg, border: `1px solid ${c.bd}`, color: c.tx, textTransform: "uppercase" }}>{s === "good" && <Pulse c={c.bd} />}{children}</span>;
};

const Card = ({ children, style, glow }) => <div className="ch" style={{ backgroundColor: "rgba(15,23,42,0.7)", backdropFilter: "blur(20px)", borderRadius: 16, border: "1px solid rgba(148,163,184,0.1)", padding: 20, boxShadow: glow ? `0 0 30px ${glow}` : "0 4px 20px rgba(0,0,0,0.3)", transition: "all .3s", ...style }}>{children}</div>;
const Lbl = ({ icon, children }) => <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#818cf8", marginBottom: 12, textTransform: "uppercase" }}>{icon} {children}</div>;

// ═══ MAIN ════════════════════════════════════════════════════
export default function App() {
  const [now, setNow] = useState(new Date());
  const [wx, setWx] = useState(null);
  const [toBKO, setToBKO] = useState([]);
  const [toFNB, setToFNB] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRef, setLastRef] = useState(null);
  const [selTrain, setSelTrain] = useState(null);
  const [manualDir, setManualDir] = useState(null); // null=auto, "to", "from"
  const [manualDate, setManualDate] = useState(null); // null=auto, Date

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  // ══════════════════════════════════════════════════════════
  // SMART DATE + DIRECTION LOGIC
  // ══════════════════════════════════════════════════════════
  const { planDate, dir, modeLabel, modeIcon } = useMemo(() => {
    // If user manually set a date, use that
    if (manualDate !== null) {
      const md = manualDate;
      const tt = TT[md.getDay()];
      const d = manualDir || "to";
      return { planDate: md, dir: d, modeLabel: `Planning ${fmtShort(md)}`, modeIcon: "🗓️", daysAway: Math.round((md - dayClone(now)) / 864e5) };
    }

    const today = dayClone(now);
    const todayTT = TT[today.getDay()];
    const hasClassToday = todayTT.sessions.length > 0 && today >= TERM_START && today <= TERM_END;
    const nowMins = now.getHours() * 60 + now.getMinutes();

    if (hasClassToday) {
      const startMins = hm(todayTT.start).h * 60 + hm(todayTT.start).m;
      const endMins = hm(todayTT.end).h * 60 + hm(todayTT.end).m;

      // Before college: going TO college today
      if (nowMins < startMins + 30) {
        return { planDate: today, dir: manualDir || "to", modeLabel: "Morning — time to head to college", modeIcon: "🌅", daysAway: 0 };
      }
      // During college but before finish: show return journey
      if (nowMins < endMins) {
        return { planDate: today, dir: manualDir || "from", modeLabel: "At college — planning your trip home", modeIcon: "📚", daysAway: 0 };
      }
      // After college finished today: plan next college day
      const nxt = nextCollegeDay(dayClone(now, 1));
      if (nxt) {
        const daysAway = Math.round((nxt - today) / 864e5);
        const when = daysAway === 1 ? "tomorrow" : daysAway === 2 ? "in 2 days" : `in ${daysAway} days`;
        return { planDate: nxt, dir: manualDir || "to", modeLabel: `Evening — next college ${when} (${DAYS[nxt.getDay()]})`, modeIcon: "🌙", daysAway };
      }
    }

    // No class today (weekend, friday, or out of term) — find next college day
    const nxt = nextCollegeDay(dayClone(now, hasClassToday ? 1 : 0));
    if (nxt) {
      const daysAway = Math.round((nxt - today) / 864e5);
      const when = daysAway === 0 ? "today" : daysAway === 1 ? "tomorrow" : `in ${daysAway} days`;
      const dayName = DAYS[nxt.getDay()];
      const timeOfDay = now.getHours() >= 17 ? "Evening" : now.getHours() >= 12 ? "Afternoon" : "Morning";
      return { planDate: nxt, dir: manualDir || "to", modeLabel: `${timeOfDay} — next college ${when} (${dayName})`, modeIcon: "🌙", daysAway };
    }

    return { planDate: today, dir: manualDir || "to", modeLabel: "Outside term dates", modeIcon: "🏖️", daysAway: 0 };
  }, [now, manualDate, manualDir]);

  const isToday = planDate.toDateString() === new Date().toDateString();
  const isFuture = !isToday;
  const tt = TT[planDate.getDay()];
  const hasClass = tt.sessions.length > 0;
  const inTerm = planDate >= TERM_START && planDate <= TERM_END;

  // ══════════════════════════════════════════════════════════
  // WEATHER + BIKE ADJUSTMENTS
  // ══════════════════════════════════════════════════════════
  const fetchWx = useCallback(async () => {
    try { const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=51.3148&longitude=-0.6227&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,weather_code&timezone=Europe/London&forecast_days=7"); setWx(await r.json()); } catch (e) { console.error(e); }
  }, []);

  const fetchTrains = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([fetch(`${HUXLEY}/departures/BKO/to/FNB/15`), fetch(`${HUXLEY}/departures/FNB/to/BKO/15`)]);
      const [ad, bd] = await Promise.all([a.json(), b.json()]);
      setToBKO(ad.trainServices || []); setToFNB(bd.trainServices || []);
      setAlerts(ad.nrccMessages ? ad.nrccMessages.map(m => typeof m === "string" ? m : m.value || "") : []);
      setLastRef(new Date());
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await Promise.all([fetchWx(), fetchTrains()]); setLoading(false); })();
    const t1 = setInterval(fetchTrains, 60000), t2 = setInterval(fetchWx, 600000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [fetchWx, fetchTrains]);

  // Reset selection on plan change
  useEffect(() => setSelTrain(null), [planDate, dir]);

  // Weather for plan date
  const daysFromNow = Math.round((planDate - dayClone(now)) / 864e5);
  const wxIdx = Math.min(Math.max(daysFromNow, 0), (wx?.daily?.temperature_2m_max?.length || 1) - 1);
  const curTemp = wx?.current?.temperature_2m ?? 10;
  const curWind = wx?.current?.wind_speed_10m ?? 0;
  const curGusts = wx?.current?.wind_gusts_10m ?? 0;
  const curCode = wx?.current?.weather_code ?? 0;
  const curPrecip = wx?.current?.precipitation ?? 0;
  const curRain = curPrecip > 0 || (curCode >= 51 && curCode <= 82);

  const pTemp = isFuture && wx?.daily ? Math.round(((wx.daily.temperature_2m_min?.[wxIdx] || 5) * 0.4 + (wx.daily.temperature_2m_max?.[wxIdx] || 15) * 0.6)) : curTemp;
  const pRain = isFuture && wx?.daily ? (wx.daily.precipitation_probability_max?.[wxIdx] || 0) > 30 : curRain;
  const pWxCode = isFuture && wx?.daily ? wx.daily.weather_code?.[wxIdx] ?? 0 : curCode;
  const pDark = (() => { const si = wx?.daily?.sunrise?.[wxIdx]; if (!si) return true; return new Date(si).getHours() >= 8; })();

  const bikeAdj = (pRain ? 3 : 0) + (curWind > 30 ? 5 : curWind > 20 ? 3 : 0);
  const bHB = BIKE_HOME_BKO.mins + bikeAdj;
  const bFC = BIKE_FNB_COL.mins + Math.ceil(bikeAdj / 2);
  const bCF = BIKE_FNB_COL.mins + Math.ceil(bikeAdj / 2);
  const bBH = BIKE_HOME_BKO.mins + bikeAdj;
  const clothing = clothe(pTemp, pRain, curWind, pDark);

  // ══════════════════════════════════════════════════════════
  // JOURNEY CALCULATIONS
  // ══════════════════════════════════════════════════════════
  const trains = dir === "to" ? toBKO : toFNB;
  const arriveByStr = tt.start || "09:15";
  const finishStr = tt.end || "12:00";
  const arriveBy = (() => { const p = hm(arriveByStr); return makeT(planDate, p.h, p.m); })();
  const finishAt = (() => { const p = hm(finishStr); return makeT(planDate, p.h, p.m); })();

  // Ideal times
  const idealTrainDepTo = addM(arriveBy, -(bFC + BUF + TRAIN));
  const idealLeaveHome = addM(idealTrainDepTo, -(bHB + BUF));
  const idealTrainDepFrom = addM(finishAt, bCF + BUF);

  // Auto-recommend
  const autoTrain = useMemo(() => {
    const target = dir === "to" ? idealTrainDepTo : idealTrainDepFrom;
    return trains.find(t => {
      const dep = parseTT(t.std, planDate);
      if (!dep || t.etd === "Cancelled") return false;
      return dep >= addM(target, -12) && dep <= addM(target, 30);
    });
  }, [dir, trains, idealTrainDepTo, idealTrainDepFrom, planDate]);

  const activeTrain = selTrain ? trains.find(t => t.std === selTrain) : autoTrain;

  // Recalculated journey from active train
  const J = useMemo(() => {
    if (dir === "to") {
      const tDep = activeTrain ? (parseTT(activeTrain.etd === "On time" ? activeTrain.std : activeTrain.etd, planDate) || parseTT(activeTrain.std, planDate)) : idealTrainDepTo;
      const leave = addM(tDep, -(bHB + BUF));
      const arrFnb = addM(tDep, TRAIN);
      const arrCol = addM(arrFnb, bFC + BUF);
      const late = arrCol > arriveBy;
      const spare = diffM(arriveBy, arrCol);
      return { leave, tDep, arrFnb, arrCol, late, spare, tStr: activeTrain?.std || fmt(idealTrainDepTo) };
    }
    const tDep = activeTrain ? (parseTT(activeTrain.etd === "On time" ? activeTrain.std : activeTrain.etd, planDate) || parseTT(activeTrain.std, planDate)) : idealTrainDepFrom;
    const leaveCol = addM(tDep, -(bCF + BUF));
    const arrBko = addM(tDep, TRAIN);
    const arrHome = addM(arrBko, bBH);
    return { leaveCol, tDep, arrBko, arrHome, tStr: activeTrain?.std || fmt(idealTrainDepFrom) };
  }, [dir, activeTrain, planDate, idealTrainDepTo, idealTrainDepFrom, bHB, bFC, bCF, bBH, arriveBy]);

  const countdown = isToday ? diffM(dir === "to" ? J.leave : J.leaveCol, now) : null;
  const sts = trains.some(t => t.etd === "Cancelled") ? "danger" : trains.some(t => t.etd !== "On time" && t.etd !== t.std && t.etd !== "—") ? "warning" : "good";

  // Date buttons
  const dateBtns = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = dayClone(now, i);
      const t = TT[d.getDay()];
      arr.push({ date: d, label: i === 0 ? "Today" : i === 1 ? "Tmrw" : DAYS[d.getDay()].slice(0, 3), hasClass: t.sessions.length > 0 && d >= TERM_START && d <= TERM_END, dateStr: `${d.getDate()}/${d.getMonth() + 1}`, isAuto: manualDate === null && d.toDateString() === planDate.toDateString() });
    }
    return arr;
  }, [now, manualDate, planDate]);

  // ═══ LOADING ══════════════════════════════════════════════
  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(145deg,#0c0a1a,#1a1040,#0c1a2e)", fontFamily: "'Outfit',sans-serif", color: "#e2e8f0" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 48, marginBottom: 16, animation: "bounce 1s ease infinite" }}>🚂</div><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 2 }}>LOADING JOURNEY...</div></div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(145deg,#0c0a1a 0%,#1a1040 30%,#0c1a2e 60%,#0a1628 100%)", fontFamily: "'Outfit','DM Sans',sans-serif", color: "#e2e8f0" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.85)}}
        @keyframes pulsering{0%,100%{opacity:0;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .ch:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,0,0,.4)!important}
        *{box-sizing:border-box;margin:0;padding:0}
        .ts{cursor:pointer;transition:all .12s;border-radius:10px}.ts:hover{background:rgba(99,102,241,.08)!important}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:rgba(99,102,241,.3);border-radius:3px}
        button{font-family:inherit}
      `}</style>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "16px 16px 40px" }}>

        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: 12, animation: "slideIn .4s" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: "#818cf8", textTransform: "uppercase" }}>🚲 Student Travel Companion 🚂</div>
          <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1, fontFamily: "'JetBrains Mono',monospace", background: "linear-gradient(135deg,#e2e8f0,#818cf8,#6ee7b7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{fmt(now)}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{fmtLong(now)}</div>
        </div>

        {/* MODE + DATE + DIRECTION */}
        <Card style={{ marginBottom: 14, animation: "slideIn .45s", padding: 14 }}>
          {/* Mode indicator */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>{modeIcon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#c7d2fe" }}>{modeLabel}</span>
            {isFuture && <span style={{ fontSize: 11, color: "#94a3b8" }}>— {fmtShort(planDate)}</span>}
            {manualDate !== null && <button onClick={() => { setManualDate(null); setManualDir(null); }} style={{ padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(239,68,68,.3)", backgroundColor: "rgba(239,68,68,.08)", color: "#fca5a5", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>✕ Reset to Auto</button>}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
            {/* Dates */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#475569", letterSpacing: 1, textTransform: "uppercase", marginRight: 2 }}>📅</span>
              {dateBtns.map((b, i) => {
                const isAct = manualDate !== null ? manualDate.toDateString() === b.date.toDateString() : b.isAuto;
                return (
                  <button key={i} onClick={() => { setManualDate(b.date); if (!manualDir) setManualDir("to"); }} style={{
                    padding: "5px 8px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 600,
                    backgroundColor: isAct ? "rgba(99,102,241,.2)" : "rgba(30,41,59,.5)",
                    color: isAct ? "#c7d2fe" : b.hasClass ? "#94a3b8" : "#475569",
                    border: isAct ? "1px solid rgba(99,102,241,.4)" : "1px solid rgba(148,163,184,.06)",
                    opacity: b.hasClass ? 1 : .5, transition: "all .15s", position: "relative", minWidth: 44,
                  }}>
                    <div>{b.label}</div>
                    <div style={{ fontSize: 8, color: isAct ? "#818cf8" : "#475569" }}>{b.dateStr}</div>
                    {b.hasClass && <div style={{ position: "absolute", top: 2, right: 2, width: 4, height: 4, borderRadius: "50%", backgroundColor: isAct ? "#818cf8" : "#4f46e5" }} />}
                  </button>
                );
              })}
            </div>

            {/* Direction */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {[{ v: null, l: "Auto" }, { v: "to", l: "→ College" }, { v: "from", l: "→ Home" }].map(o => (
                <button key={o.v || "auto"} onClick={() => setManualDir(o.v)} style={{
                  padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 600,
                  backgroundColor: manualDir === o.v ? "rgba(99,102,241,.2)" : "rgba(30,41,59,.5)",
                  color: manualDir === o.v ? "#c7d2fe" : "#94a3b8",
                  border: manualDir === o.v ? "1px solid rgba(99,102,241,.4)" : "1px solid rgba(148,163,184,.06)",
                }}>{o.l}</button>
              ))}
            </div>
          </div>
        </Card>

        {/* NO COLLEGE / OUT OF TERM */}
        {(!hasClass || !inTerm) && (
          <Card style={{ marginBottom: 14, borderColor: "rgba(139,92,246,.2)" }}>
            <div style={{ textAlign: "center", padding: 10 }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{!inTerm ? "🏖️" : "😴"}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#a78bfa" }}>{!inTerm ? "Outside Term Dates" : `No College on ${tt.label}s`}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Train times shown below for reference</div>
            </div>
          </Card>
        )}

        {/* COUNTDOWN (today only) */}
        {isToday && hasClass && inTerm && countdown !== null && (
          <div style={{
            animation: "slideIn .5s", marginBottom: 14, padding: "14px 20px", borderRadius: 14, textAlign: "center",
            background: countdown <= 0 ? "linear-gradient(135deg,rgba(239,68,68,.2),rgba(185,28,28,.2))" : countdown <= 15 ? "linear-gradient(135deg,rgba(245,158,11,.2),rgba(180,83,9,.2))" : "linear-gradient(135deg,rgba(16,185,129,.15),rgba(6,78,59,.2))",
            border: `1px solid ${countdown <= 0 ? "rgba(239,68,68,.4)" : countdown <= 15 ? "rgba(245,158,11,.4)" : "rgba(16,185,129,.3)"}`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 4 }}>
              {dir === "to" ? (countdown <= 0 ? "⚠️ YOU SHOULD HAVE LEFT!" : countdown <= 5 ? "🏃 LEAVE NOW!" : countdown <= 15 ? "🔔 LEAVING SOON" : "✅ YOU HAVE TIME") : "🏠 HEADING HOME"}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: countdown <= 0 ? "#fca5a5" : countdown <= 15 ? "#fcd34d" : "#6ee7b7" }}>
              {countdown <= 0 ? `${Math.abs(countdown)} min overdue` : `${countdown} min until you leave`}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
              {dir === "to"
                ? <>Leave by <strong style={{ color: "#e2e8f0" }}>{fmt(J.leave)}</strong> → first lesson <strong style={{ color: J.late ? "#fca5a5" : "#e2e8f0" }}>{arriveByStr}</strong></>
                : <>Leave college → home by <strong style={{ color: "#e2e8f0" }}>{fmt(J.arrHome)}</strong></>}
            </div>
          </div>
        )}

        {/* FUTURE PLAN BANNER */}
        {isFuture && hasClass && inTerm && (
          <div style={{ animation: "slideIn .5s", marginBottom: 14, padding: "16px 20px", borderRadius: 14, textAlign: "center", background: "linear-gradient(135deg,rgba(139,92,246,.12),rgba(99,102,241,.08))", border: "1px solid rgba(139,92,246,.2)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
              {modeLabel}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", marginBottom: 6 }}>
              📅 {fmtLong(planDate)} — {tt.sessions.length} lesson{tt.sessions.length > 1 ? "s" : ""} ({tt.start} – {tt.end})
            </div>
            {dir === "to" ? (
              <>
                <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: "#c7d2fe" }}>Leave home at {fmt(J.leave)}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6, lineHeight: 1.6 }}>
                  🚲 Bike {bHB}min to Brookwood → 🚂 {J.tStr} train → 🚲 Bike {bFC}min to college
                </div>
                {J.late ? <div style={{ fontSize: 13, color: "#fca5a5", marginTop: 6, fontWeight: 700 }}>⚠️ Arrive {fmt(J.arrCol)} — LATE for {arriveByStr} start. Pick an earlier train below!</div>
                  : <div style={{ fontSize: 12, color: "#6ee7b7", marginTop: 6 }}>✅ Arrive {fmt(J.arrCol)} — {J.spare} minutes spare before {arriveByStr} start</div>}
              </>
            ) : (
              <>
                <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: "#c7d2fe" }}>Home by ~{fmt(J.arrHome)}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6, lineHeight: 1.6 }}>
                  🎓 Last lesson ends {finishStr} → 🚲 {bCF}min to station → 🚂 {J.tStr} train → 🚲 {bBH}min home
                </div>
              </>
            )}
          </div>
        )}

        {/* JOURNEY TIMELINE */}
        {hasClass && inTerm && (
          <Card style={{ marginBottom: 14, animation: "slideIn .55s" }}>
            <Lbl icon="📍">{dir === "to" ? "Journey to College" : "Journey Home"}</Lbl>
            <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap", justifyContent: "center" }}>
              {(dir === "to" ? [
                { icon: "🏠", lbl: "Home", time: fmt(J.leave), sub: "GU24 9JS" },
                { icon: "🚲", lbl: `${bHB}m`, sub: `${BIKE_HOME_BKO.mi}mi`, tr: true },
                { icon: "🚉", lbl: "Brookwood", time: J.tStr, sub: "BKO" },
                { icon: "🚂", lbl: `${TRAIN}m`, sub: "SWR", tr: true },
                { icon: "🚉", lbl: "Farnborough", time: fmt(J.arrFnb), sub: "FNB" },
                { icon: "🚲", lbl: `${bFC}m`, sub: `${BIKE_FNB_COL.mi}mi`, tr: true },
                { icon: "🎓", lbl: "College", time: fmt(J.arrCol), sub: J.late ? "LATE!" : "✓", late: J.late },
              ] : [
                { icon: "🎓", lbl: "College", time: finishStr, sub: "Finish" },
                { icon: "🚲", lbl: `${bCF}m`, sub: `${BIKE_FNB_COL.mi}mi`, tr: true },
                { icon: "🚉", lbl: "Farnborough", time: J.tStr, sub: "FNB" },
                { icon: "🚂", lbl: `${TRAIN}m`, sub: "SWR", tr: true },
                { icon: "🚉", lbl: "Brookwood", time: fmt(J.arrBko), sub: "BKO" },
                { icon: "🚲", lbl: `${bBH}m`, sub: `${BIKE_HOME_BKO.mi}mi`, tr: true },
                { icon: "🏠", lbl: "Home", time: fmt(J.arrHome), sub: "GU24 9JS" },
              ]).map((s, i, a) => (
                <div key={i} style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ textAlign: "center", minWidth: s.tr ? 50 : 64, padding: "5px 3px", borderRadius: 10, backgroundColor: s.tr ? "transparent" : s.late ? "rgba(239,68,68,.1)" : "rgba(99,102,241,.08)" }}>
                    <div style={{ fontSize: s.tr ? 13 : 18 }}>{s.icon}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#e2e8f0", marginTop: 1 }}>{s.lbl}</div>
                    {s.time && <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: s.late ? "#fca5a5" : "#818cf8" }}>{s.time}</div>}
                    <div style={{ fontSize: 8, color: s.late ? "#fca5a5" : "#64748b" }}>{s.sub}</div>
                  </div>
                  {i < a.length - 1 && <div style={{ width: 14, height: 2, margin: "0 1px", background: s.tr ? "repeating-linear-gradient(90deg,#4f46e5 0px,#4f46e5 3px,transparent 3px,transparent 6px)" : "linear-gradient(90deg,#4f46e5,#818cf8)" }} />}
                </div>
              ))}
            </div>
            {bikeAdj > 0 && <div style={{ marginTop: 8, padding: "5px 10px", borderRadius: 8, backgroundColor: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.2)", fontSize: 11, color: "#fcd34d" }}>⚠️ Bike +{bikeAdj}min ({pRain ? "rain" : "wind"})</div>}
          </Card>
        )}

        {/* THREE-COL: TIMETABLE / WEATHER / CLOTHING */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <Card style={{ animation: "slideIn .6s" }}>
            <Lbl icon="📚">{isToday ? "Today's Lessons" : `${tt.label}'s Lessons`}</Lbl>
            {tt.sessions.length === 0 ? <div style={{ textAlign: "center", padding: 14, color: "#64748b" }}><div style={{ fontSize: 22, marginBottom: 4 }}>😎</div><div style={{ fontSize: 12 }}>Day off</div></div>
              : tt.sessions.map((s, i) => (
                <div key={i} style={{ padding: "6px 10px", borderRadius: 8, marginBottom: 4, backgroundColor: "rgba(99,102,241,.05)", border: "1px solid rgba(99,102,241,.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "#818cf8" }}>{s.time}</span>
                    <span style={{ fontSize: 9, color: "#64748b", fontWeight: 600 }}>{s.room}</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", marginTop: 1 }}>{s.subj}</div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>{s.teacher}</div>
                </div>
              ))}
            {hasClass && <div style={{ marginTop: 6, fontSize: 10, color: "#64748b", textAlign: "center" }}>First: <strong style={{ color: "#e2e8f0" }}>{tt.start}</strong> · Last: <strong style={{ color: "#e2e8f0" }}>{tt.end}</strong></div>}
          </Card>

          <Card style={{ animation: "slideIn .65s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><Lbl icon="🌤️">{isToday ? "Weather Now" : `${tt.label}'s Forecast`}</Lbl>{pRain && <Badge s="warning">Rain</Badge>}</div>
            {wx?.current && <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 36 }}>{wxI(pWxCode)}</div>
                <div>
                  {isFuture && wx.daily ? <><div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace" }}>{Math.round(wx.daily.temperature_2m_max[wxIdx])}°/{Math.round(wx.daily.temperature_2m_min[wxIdx])}°</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{wxD(pWxCode)}</div></> : <><div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace" }}>{Math.round(curTemp)}°C</div><div style={{ fontSize: 11, color: "#94a3b8" }}>Feels {Math.round(wx.current.apparent_temperature)}°C · {wxD(curCode)}</div></>}
                </div>
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                <div>💨 {Math.round(curWind)}km/h{curGusts > 30 && <span style={{ color: "#f59e0b" }}> (gusts {Math.round(curGusts)})</span>}</div>
                <div>🌧 {isFuture && wx.daily ? `${wx.daily.precipitation_probability_max?.[wxIdx] || 0}%` : `${curPrecip}mm`}</div>
              </div>
            </>}
            {wx?.daily && <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(148,163,184,.06)" }}><div style={{ display: "flex", gap: 5 }}>{[0, 1, 2].map(i => <div key={i} style={{ flex: 1, textAlign: "center", padding: "4px 2px", borderRadius: 8, backgroundColor: wxIdx === i ? "rgba(99,102,241,.1)" : "rgba(99,102,241,.03)", border: wxIdx === i ? "1px solid rgba(99,102,241,.2)" : "1px solid transparent" }}><div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600 }}>{i === 0 ? "Today" : DAYS[new Date(Date.now() + i * 864e5).getDay()].slice(0, 3)}</div><div style={{ fontSize: 16 }}>{wxI(wx.daily.weather_code[i])}</div><div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{Math.round(wx.daily.temperature_2m_max[i])}°</div></div>)}</div></div>}
          </Card>

          <Card style={{ animation: "slideIn .7s" }}>
            <Lbl icon="👕">{isToday ? "Wear Today" : `Wear ${tt.label}`}</Lbl>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 16, backgroundColor: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.2)", marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>{clothing.i}</span><span style={{ fontSize: 11, fontWeight: 700, color: "#c7d2fe" }}>{clothing.l}</span><span style={{ fontSize: 10, color: "#94a3b8" }}>({Math.round(pTemp)}°C)</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {clothing.k.map((x, i) => <div key={i} style={{ fontSize: 11, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "#818cf8", flexShrink: 0 }} />{x}</div>)}
            </div>
            {clothing.e.length > 0 && <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(148,163,184,.06)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b", marginBottom: 4, letterSpacing: 1 }}>⚡ EXTRAS</div>
              {clothing.e.map((x, i) => <div key={i} style={{ fontSize: 11, color: "#fcd34d", display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}><span style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "#f59e0b", flexShrink: 0 }} />{x}</div>)}
            </div>}
          </Card>
        </div>

        {/* TRAINS */}
        <Card style={{ marginTop: 14, animation: "slideIn .75s" }} glow={sts === "danger" ? "rgba(239,68,68,.12)" : undefined}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Lbl icon={dir === "to" ? "🎓" : "🏠"}>{dir === "to" ? "Trains BKO → FNB" : "Trains FNB → BKO"}</Lbl>
              <Badge s={sts}>{sts === "good" ? "Live" : sts === "warning" ? "Delays" : "Disrupted"}</Badge>
            </div>
            <div style={{ fontSize: 10, color: "#64748b" }}>{lastRef ? `${fmt(lastRef)}` : ""} · 60s</div>
          </div>

          <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 8, padding: "5px 10px", borderRadius: 8, backgroundColor: "rgba(139,92,246,.06)", border: "1px solid rgba(139,92,246,.1)" }}>
            {isFuture
              ? <>📋 These are <strong>today's live departures</strong> as a timetable guide for {tt.label}. Click to plan your {dir === "to" ? "morning" : "return"} train</>
              : <>👆 Click a train — journey recalculates with bike time both sides</>}
          </div>

          {alerts.length > 0 && <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 10, backgroundColor: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)" }}>{alerts.map((a, i) => <div key={i} style={{ fontSize: 11, color: "#fca5a5" }}>{typeof a === "string" ? a.replace(/<[^>]*>/g, "") : ""}</div>)}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "65px 72px 44px 1fr 100px", gap: 8, padding: "4px 12px", marginBottom: 2 }}>
            {["Sched.", "Status", "Plat.", "Destination", ""].map((h, i) => <span key={i} style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: "#475569", textTransform: "uppercase" }}>{h}</span>)}
          </div>

          {trains.length === 0 ? <div style={{ textAlign: "center", padding: 20, color: "#64748b" }}><div style={{ fontSize: 22, marginBottom: 4 }}>🚂</div><div style={{ fontSize: 12 }}>{isFuture ? "Live trains show today's schedule as a guide" : "No trains listed"}</div></div>
            : trains.map((t, i) => {
              const sc = t.std || "—"; const es = t.etd || "—";
              const dly = es !== "On time" && es !== sc && es !== "—" && es !== "Cancelled"; const cnc = es === "Cancelled";
              const act = activeTrain && t.std === activeTrain.std;
              return (
                <div key={i} className="ts" onClick={() => setSelTrain(t.std === selTrain ? null : t.std)} style={{ display: "grid", gridTemplateColumns: "65px 72px 44px 1fr 100px", alignItems: "center", gap: 8, padding: "8px 12px", backgroundColor: act ? "rgba(99,102,241,.12)" : "transparent", border: act ? "1px solid rgba(99,102,241,.3)" : "1px solid transparent" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{sc}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: cnc ? "#ef4444" : dly ? "#f59e0b" : "#22c55e" }}>{cnc ? "CANC" : dly ? es : "On time"}</span>
                  <span style={{ fontSize: 12, color: "#94a3b8", textAlign: "center" }}>{t.platform ? `P${t.platform}` : "—"}</span>
                  <span style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.destination?.[0]?.locationName || "—"}</span>
                  {act && <Badge s={cnc ? "danger" : dly ? "warning" : "good"}>{selTrain ? "Selected" : "Best"}</Badge>}
                </div>
              );
            })}

          {activeTrain && (
            <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: "linear-gradient(135deg,rgba(99,102,241,.1),rgba(16,185,129,.06))", border: "1px solid rgba(99,102,241,.2)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#818cf8" }}>
                {dir === "to" ? (
                  <>🚂 <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#6ee7b7" }}>{activeTrain.std}</span> BKO → Leave home <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#6ee7b7" }}>{fmt(J.leave)}</span> → 🚲{bHB}m → train → 🚲{bFC}m → {J.late ? <span style={{ color: "#fca5a5" }}>⚠️ LATE {fmt(J.arrCol)}</span> : <span style={{ color: "#6ee7b7" }}>✅ {fmt(J.arrCol)} ({J.spare}m spare)</span>}</>
                ) : (
                  <>🚂 <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#6ee7b7" }}>{activeTrain.std}</span> FNB → Leave college <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#6ee7b7" }}>{fmt(J.leaveCol)}</span> → 🚲{bCF}m → train → 🚲{bBH}m → <span style={{ color: "#6ee7b7" }}>🏠 {fmt(J.arrHome)}</span></>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* LINKS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginTop: 14 }}>
          {[{ e: "🚂", l: "SWR", u: "https://www.southwesternrailway.com/train-times/brookwood-to-farnborough-main" }, { e: "⚠️", l: "Alerts", u: "https://www.journeycheck.com/swr/" }, { e: "🗺️", l: "College", u: "https://www.farn-ct.ac.uk/contact/" }, { e: "🚌", l: "Buses", u: "https://www.stagecoachbus.com/plan-a-journey" }].map((l, i) => (
            <a key={i} href={l.u} target="_blank" rel="noopener noreferrer" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 6px", borderRadius: 12, textDecoration: "none", backgroundColor: "rgba(15,23,42,.5)", border: "1px solid rgba(148,163,184,.06)" }}>
              <span style={{ fontSize: 18 }}>{l.e}</span><span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8" }}>{l.l}</span>
            </a>
          ))}
        </div>

        {/* CHECKLIST */}
        <Card style={{ marginTop: 14 }}>
          <Lbl icon="📋">Checklist</Lbl>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {[
              { t: "Bike lights charged", s: pDark }, { t: "Waterproof packed", s: pRain },
              { t: "Mudguards on", s: pRain }, { t: "Train ticket / railcard", s: true },
              { t: "Phone charged", s: true }, { t: "College bag packed", s: hasClass },
              { t: "Water bottle", s: pTemp > 15 }, { t: "Hi-vis for cycling", s: pDark },
              { t: "Spare socks", s: pRain }, { t: "Sport kit", s: hasClass },
            ].filter(x => x.s).map((x, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#cbd5e1", padding: "5px 8px", borderRadius: 8, backgroundColor: "rgba(99,102,241,.04)" }}>☐ {x.t}</div>)}
          </div>
        </Card>

        {/* FOOTER */}
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 10, color: "#475569" }}>
          <div>GU24 9JS 🚲 Brookwood 🚂 Farnborough Main 🚲 Farnborough College of Technology</div>
          <div style={{ marginTop: 3 }}>National Rail Darwin · Open-Meteo · L2 Sport Diploma Group B · Term: 19 Jan – 5 Jul 2026</div>
          <div style={{ marginTop: 6 }}><button onClick={() => { fetchTrains(); fetchWx(); }} style={{ padding: "5px 14px", borderRadius: 8, border: "1px solid rgba(99,102,241,.3)", backgroundColor: "rgba(99,102,241,.1)", color: "#818cf8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>🔄 Refresh</button></div>
        </div>
      </div>
    </div>
  );
}
