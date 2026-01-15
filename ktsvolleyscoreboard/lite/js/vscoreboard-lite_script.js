/* KTS Volley Scoreboard Lite
   - Single page scoreboard (no server / no sponsor)
   - Keyboard control + bottom controls
   - Telemetry (optional) to Supabase table: vscoreboard-live_devices
*/

(() => {
  "use strict";

  // ---------------------------
  // Utils
  // ---------------------------
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const nowIso = () => new Date().toISOString();

  function uuidv4() {
    // crypto.randomUUID supported in modern browsers
    if (crypto?.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function isDesktop() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
    return !coarse && Math.max(w, h) >= 900;
  }

  // ---------------------------
  // State (mirrors main.js defaults)
  // ---------------------------
  const DEFAULT_RULES = {
    matchType: "bestOf5",
    setPoints: 25,
    tieBreakPoints: 15,
    minDiffSets: 2,
    minDiffTieBreak: 2,
    maxTimeouts: 2,
    maxSubs: 6,
    maxVideoChecks: 0,
    timeoutDuration: 30,
    intervalDuration: 180,
    sideSwitchMode: "standard",        // standard | new | never
    tieBreakSwapEnabled: true,
    tieBreakSwapPoint: 8,
    tieBreakSwapAnim: true
  };

  const STORAGE_KEY = "vscoreboard_lite_state_v1";
  const IS_MOBILE = window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
  document.body.classList.toggle("mobile", IS_MOBILE);


  function getInitialMatchData() {
    return {
      homeIsOnRight: false,
      setupCompleted: false,
      matchEnded: false,
      winner: null,
      matchActive: false,
      serving: null, // 'home' | 'guest'
      startTime: null, // "HH:MM"
      history: { setStarters: [], tieBreakSwapDone: false },
      timer: { active: false, visible: true, type: null, seconds: 0, label: "", totalSeconds: 0 },
      clock: { show: false }, // hidden in lite
      rules: { ...DEFAULT_RULES },
      home: { name: "CASA", score: 0, sets: 0, timeouts: 0, subs: 0, videoChecks: 0, color: "#00ff00", logo: null, setScores: [] },
      guest: { name: "OSPITI", score: 0, sets: 0, timeouts: 0, subs: 0, videoChecks: 0, color: "#ff0000", logo: null, setScores: [] }
    };
  }

  let matchData = getInitialMatchData();
  let timerInterval = null;

  // ---------------------------
  // DOM - scoreboard render (uses same ids from index.html)
  // ---------------------------
  function fitTextToBox(el) {
    const maxHeight = window.innerHeight * 0.18;
    let size = 8;
    el.style.fontSize = size + "vh";
    while ((el.scrollHeight > maxHeight || el.scrollWidth > el.clientWidth) && size > 3) {
      size -= 0.5;
      el.style.fontSize = size + "vh";
    }
  }

  function drawDots(containerId, current, max, type) {
    const container = $(containerId);
    if (!container) return;
    container.innerHTML = "";
    if (!max || max <= 0) return;
    for (let i = 0; i < max; i++) {
      const d = document.createElement("div");
      d.className = `dot ${type} ${i < current ? "active" : ""}`;
      container.appendChild(d);
    }
  }

  function getTeamOnSide(side) {
    // side: 'left' | 'right'
    const homeOnRight = matchData.homeIsOnRight;
    if (side === "left") return homeOnRight ? "guest" : "home";
    return homeOnRight ? "home" : "guest";
  }

  function updateTeamUI(teamKey) {
    const t = matchData[teamKey];
    const nameEl = $(`name_${teamKey}`);
    nameEl.innerText = t.name;
    nameEl.style.fontSize = "8vh";

    $(`score_${teamKey}`).innerText = t.score;
    $(`sets_${teamKey}`).innerText = t.sets;

    drawDots(`dots_to_${teamKey}`, t.timeouts, matchData.rules.maxTimeouts, "to");
    drawDots(`dots_sub_${teamKey}`, t.subs, matchData.rules.maxSubs, "sub");

    const vcWrap = $(`vc_wrap_${teamKey}`);
    if (matchData.rules.maxVideoChecks > 0) {
      vcWrap.style.display = "flex";
      drawDots(`vc_${teamKey}`, t.videoChecks, matchData.rules.maxVideoChecks, "vc");
    } else {
      vcWrap.style.display = "none";
    }

    const bar = $(`bar_${teamKey}`);
    if (t.color) {
      bar.style.backgroundColor = t.color;
      bar.style.boxShadow = `0 0 20px ${t.color}`;
      nameEl.style.color = t.color;
    }

    const logoEl = $(`logo_${teamKey}`);
    logoEl.style.display = "none";

    const card = $(`card_${teamKey}`);
    if (matchData.serving === teamKey) card.classList.add("serving");
    else card.classList.remove("serving");

    setTimeout(() => fitTextToBox(nameEl), 0);
  }

  function renderAll() {
    // Lite title
    const title = $("main_title");
    if (title) title.innerText = "KTS Volley Scoreboard";
    // teams
    updateTeamUI("home");
    updateTeamUI("guest");

    // Pills
    $("pill_left").innerText = matchData[getTeamOnSide("left")].name;
    $("pill_right").innerText = matchData[getTeamOnSide("right")].name;

    // overlays priority
    checkOverlayPriority();
  }

  // ---------------------------
  // Overlays & timers (timeout / interval / match_start)
  // ---------------------------
  function activateOverlay(id) {
    ["ov-timeout", "ov-interval", "ov-start", "ov-winner"].forEach(oid => {
      if (oid !== id) $(oid)?.classList.remove("active");
    });
    $(id)?.classList.add("active");
  }

  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    matchData.timer = { active: false, visible: true, type: null, seconds: 0, label: "", totalSeconds: 0 };
    ["ov-timeout", "ov-interval", "ov-start"].forEach(id => $(id)?.classList.remove("active"));
    checkOverlayPriority();
    persist();
  }

  function startTimer(type, seconds, label) {
    if (timerInterval) clearInterval(timerInterval);
    matchData.timer = { active: true, visible: true, type, seconds, label: label || "", totalSeconds: seconds };
    tickTimer(true);
    timerInterval = setInterval(() => tickTimer(false), 1000);
    persist();
  }

  function tickTimer(initial) {
    const t = matchData.timer;
    if (!t.active) return;

    if (!initial) t.seconds = Math.max(0, t.seconds - 1);

    const overlays = ["ov-timeout", "ov-interval", "ov-start"];
    if (t.active && t.visible !== false && t.seconds >= 0) {
      const min = Math.floor(t.seconds / 60);
      const sec = t.seconds % 60;
      const timeStr = `${min}:${sec < 10 ? "0" + sec : sec}`;
      const timeStrLong = (t.seconds > 3600) ? new Date(t.seconds * 1000).toISOString().substr(11, 8) : timeStr;

      if (t.type === "timeout") {
        activateOverlay("ov-timeout");
        $("to_lbl").innerText = t.label || "TIMEOUT";
        $("to_time").innerText = timeStr;
        const srv = matchData.serving ? matchData[matchData.serving] : null;
        if (srv) {
          const el = $("to_srv");
          el.innerText = srv.name;
          el.style.color = srv.color;
        }
        $("u_to_h").innerText = matchData.home.timeouts;
        $("u_to_g").innerText = matchData.guest.timeouts;
        $("u_sb_h").innerText = matchData.home.subs;
        $("u_sb_g").innerText = matchData.guest.subs;
      } else if (t.type === "interval") {
        activateOverlay("ov-interval");
        $("int_time").innerText = timeStr;
        const srv = matchData.serving ? matchData[matchData.serving] : null;
        if (srv) {
          const el = $("int_srv");
          el.innerText = srv.name;
          el.style.color = srv.color;
        }
        // set table (optional)
        renderIntervalTable();
      } else if (t.type === "match_start") {
        activateOverlay("ov-start");
        $("st_time").innerText = timeStrLong;
        const srv = matchData.serving ? matchData[matchData.serving] : null;
        if (srv) {
          const el = $("st_srv");
          el.innerText = srv.name;
          el.style.color = srv.color;
        }
      }
    } else {
      overlays.forEach(id => $(id)?.classList.remove("active"));
    }

    if (t.seconds <= 0) {
      // Timer ended: close overlays automatically
      if (t.type === "timeout" || t.type === "interval" || t.type === "match_start") stopTimer();
    }

    checkOverlayPriority();
  }

  function renderIntervalTable() {
    const tab = $("int_tab");
    if (!tab) return;
    tab.innerHTML = "";
    const setsPlayed = Math.max(matchData.home.setScores.length, matchData.guest.setScores.length);
    if (!setsPlayed) return;
    for (let i = 0; i < setsPlayed; i++) {
      const tr = document.createElement("tr");
      const td1 = document.createElement("td");
      const td2 = document.createElement("td");
      td1.innerText = `SET ${i + 1}`;
      td2.innerText = `${matchData.home.setScores[i] ?? 0} - ${matchData.guest.setScores[i] ?? 0}`;
      tr.appendChild(td1);
      tr.appendChild(td2);
      tab.appendChild(tr);
    }
  }

  function checkOverlayPriority() {
    // winner overlay wins over everything
    const win = $("ov-winner");
    if (matchData.matchEnded) {
      win.style.display = "flex";
      win.classList.add("active");
    } else {
      win.style.display = "none";
      win.classList.remove("active");
    }
  }

  // Hide countdown overlay on click (as requested)
  function onScreenClick(e) {
    const panel = $("lite_help_panel");
    if (!panel.classList.contains("hidden")) panel.classList.remove("faded");

    if (matchData.timer?.active && matchData.timer.visible !== false) {
      matchData.timer.visible = false;
      ["ov-timeout", "ov-interval", "ov-start"].forEach(id => $(id)?.classList.remove("active"));
      persist();
    }
  }

  // ---------------------------
  // Match logic (based on main.js)
  // ---------------------------
  function currentSetNumber() {
    return matchData.home.sets + matchData.guest.sets + 1;
  }

  function isTieBreakSet(setNum) {
    const mt = matchData.rules.matchType;
    if ((mt === "bestOf3" || mt === "fixed3") && setNum === 3) return true;
    if ((mt === "bestOf5" || mt === "fixed5") && setNum === 5) return true;
    return false;
  }

  function maxSetsToWin() {
    const mt = matchData.rules.matchType;
    if (mt === "bestOf3") return 2;
    if (mt === "bestOf5") return 3;
    // fixed sets: winner is higher after fixed? We'll still treat as classic: end when all sets done.
    if (mt === "fixed3") return 99;
    if (mt === "fixed5") return 99;
    return 3;
  }

  function totalSetsInMatch() {
    const mt = matchData.rules.matchType;
    if (mt === "fixed3") return 3;
    if (mt === "fixed5") return 5;
    if (mt === "bestOf3") return 3;
    if (mt === "bestOf5") return 5;
    return 5;
  }

  function checkMatchEnd() {
    const mt = matchData.rules.matchType;
    if (mt === "bestOf3" || mt === "bestOf5") {
      const target = maxSetsToWin();
      if (matchData.home.sets >= target || matchData.guest.sets >= target) {
        matchData.matchEnded = true;
        matchData.winner = matchData.home.sets > matchData.guest.sets ? "home" : "guest";
        renderWinnerOverlay();
        persist();
      }
    } else {
      // fixed sets: end when sets played == totalSetsInMatch()
      const played = matchData.home.setScores.length; // updated when set ends
      if (played >= totalSetsInMatch()) {
        matchData.matchEnded = true;
        if (matchData.home.sets === matchData.guest.sets) matchData.winner = "draw";
        else matchData.winner = matchData.home.sets > matchData.guest.sets ? "home" : "guest";
        renderWinnerOverlay();
        persist();
      }
    }
  }

  function renderWinnerOverlay() {
    const winnerName = matchData.winner === "home" ? matchData.home.name :
      matchData.winner === "guest" ? matchData.guest.name : "PAREGGIO";
    $("win_team_name").innerText = winnerName;

    const tab = $("win_set_table");
    tab.innerHTML = "";
    const setsPlayed = Math.max(matchData.home.setScores.length, matchData.guest.setScores.length);
    for (let i = 0; i < setsPlayed; i++) {
      const tr = document.createElement("tr");
      const td1 = document.createElement("td");
      const td2 = document.createElement("td");
      td1.innerText = `SET ${i + 1}`;
      td2.innerText = `${matchData.home.setScores[i] ?? 0} - ${matchData.guest.setScores[i] ?? 0}`;
      tr.appendChild(td1);
      tr.appendChild(td2);
      tab.appendChild(tr);
    }
    checkOverlayPriority();
  }

  function swapSidesData(showAnim) {
    matchData.homeIsOnRight = !matchData.homeIsOnRight;
    if (showAnim) {
      const ov = $("ov-swap");
      ov.style.display = "flex";
      ov.classList.add("active");
      setTimeout(() => {
        ov.classList.remove("active");
        setTimeout(() => ov.style.display = "none", 400);
      }, 1500);
    }
  }

  function checkTieBreakSwap() {
    const setNum = currentSetNumber();
    if (!isTieBreakSet(setNum)) return;
    if (!matchData.rules.tieBreakSwapEnabled) return;
    if (matchData.history.tieBreakSwapDone) return;

    const pt = matchData.rules.tieBreakSwapPoint || 8;
    if ((matchData.home.score + matchData.guest.score) >= pt) {
      matchData.history.tieBreakSwapDone = true;
      swapSidesData(matchData.rules.tieBreakSwapAnim);
    }
  }

  function sideSwitchAfterSetIfNeeded(setJustFinishedNum) {
    const mode = matchData.rules.sideSwitchMode;
    if (mode === "never") return;

    if (mode === "standard") {
      // "Sempre": switch after every set (classic scoreboard behavior)
      swapSidesData(true);
      return;
    }

    if (mode === "new") {
      // "Ogni 2 set": swap after set 2,4...
      if (setJustFinishedNum % 2 === 0) swapSidesData(true);
    }
  }

  function checkSetWin(teamKey) {
    const other = teamKey === "home" ? "guest" : "home";
    const setNum = currentSetNumber();
    const isTB = isTieBreakSet(setNum);
    const target = isTB ? matchData.rules.tieBreakPoints : matchData.rules.setPoints;
    const diff = isTB ? matchData.rules.minDiffTieBreak : matchData.rules.minDiffSets;

    if (matchData[teamKey].score >= target && (matchData[teamKey].score - matchData[other].score) >= diff) {
      // store set score
      matchData.home.setScores.push(matchData.home.score);
      matchData.guest.setScores.push(matchData.guest.score);

      // increment set win
      matchData[teamKey].sets++;

      // reset points
      matchData.home.score = 0;
      matchData.guest.score = 0;

      // reset TB swap flag for next TB
      matchData.history.tieBreakSwapDone = false;

      // interval timer
      if (!matchData.matchEnded) startTimer("interval", matchData.rules.intervalDuration, "INTERVALLO SET");

      // side switch rules
      sideSwitchAfterSetIfNeeded(setNum);

      checkMatchEnd();
    }
  }

  function ensureMatchActive() {
    if (matchData.matchEnded) return false;
    if (!matchData.setupCompleted) return false;
    if (!matchData.matchActive) matchData.matchActive = true;
    return true;
  }

  
  function adjustSets(team, delta) {
    if (!ensureMatchActive()) return;
    const t = matchData.teams[team];
    if (!t) return;
    const max = maxSetsToWin() * 2; // generous cap
    t.sets = Math.max(0, Math.min(max, (t.sets || 0) + delta));
    persist();
    renderAll();
  }

function addPoint(teamKey) {
    if (!ensureMatchActive()) return;
    matchData[teamKey].score++;
    if (matchData.serving && matchData.serving !== teamKey) matchData.serving = teamKey;
    checkSetWin(teamKey);
    checkTieBreakSwap();
    persist();
    renderAll();
  }

  function subPoint(teamKey) {
    if (!ensureMatchActive()) return;
    matchData[teamKey].score = Math.max(0, matchData[teamKey].score - 1);
    persist();
    renderAll();
  }

  function addSub(teamKey) {
    if (!ensureMatchActive()) return;
    if (matchData[teamKey].subs < matchData.rules.maxSubs) matchData[teamKey].subs++;
    persist();
    renderAll();
  }

  function subSub(teamKey) {
    if (!ensureMatchActive()) return;
    matchData[teamKey].subs = Math.max(0, matchData[teamKey].subs - 1);
    persist();
    renderAll();
  }

  function addVideoCheck(teamKey) {
    if (!ensureMatchActive()) return;
    const max = matchData.rules.maxVideoChecks || 0;
    if (max <= 0) return;
    if (matchData[teamKey].videoChecks < max) matchData[teamKey].videoChecks++;
    persist();
    renderAll();
  }

  function subVideoCheck(teamKey) {
    if (!ensureMatchActive()) return;
    matchData[teamKey].videoChecks = Math.max(0, matchData[teamKey].videoChecks - 1);
    persist();
    renderAll();
  }

  function startTimeout(teamKey) {
    if (!ensureMatchActive()) return;
    if (matchData[teamKey].timeouts >= matchData.rules.maxTimeouts) return;
    matchData[teamKey].timeouts++;
    const label = `TIMEOUT ${matchData[teamKey].name}`;
    startTimer("timeout", matchData.rules.timeoutDuration, label);
    persist();
    renderAll();
  }

  function subTimeout(teamKey) {
    if (!ensureMatchActive()) return;
    matchData[teamKey].timeouts = Math.max(0, matchData[teamKey].timeouts - 1);
    persist();
    renderAll();
  }

  function setServing(teamKey) {
    if (!ensureMatchActive()) return;
    matchData.serving = teamKey;
    persist();
    renderAll();
  }

  // ---------------------------
  // Persistence
  // ---------------------------
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(matchData));
    } catch {}
  }

  function restore() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (!s) return false;
      const parsed = JSON.parse(s);
      if (!parsed || typeof parsed !== "object") return false;
      matchData = { ...getInitialMatchData(), ...parsed, rules: { ...DEFAULT_RULES, ...(parsed.rules || {}) } };
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------
  // Wizard
  // ---------------------------
  function wizardDefaults() {
    // rules defaults from main.js
    $("r_type").value = DEFAULT_RULES.matchType;
    $("r_pts").value = DEFAULT_RULES.setPoints;
    $("r_tb").value = DEFAULT_RULES.tieBreakPoints;
    $("r_d_set").value = DEFAULT_RULES.minDiffSets;
    $("r_d_tb").value = DEFAULT_RULES.minDiffTieBreak;
    $("r_swap_m").value = DEFAULT_RULES.sideSwitchMode;
    $("r_tb_sw").value = DEFAULT_RULES.tieBreakSwapEnabled ? "true" : "false";
    $("r_tb_pt").value = DEFAULT_RULES.tieBreakSwapPoint;
    $("r_tb_an").value = DEFAULT_RULES.tieBreakSwapAnim ? "true" : "false";
    $("r_max_to").value = DEFAULT_RULES.maxTimeouts;
    $("r_dur_to").value = DEFAULT_RULES.timeoutDuration;
    $("r_max_sub").value = DEFAULT_RULES.maxSubs;
    $("r_dur_int").value = DEFAULT_RULES.intervalDuration;
    $("r_max_vc").value = DEFAULT_RULES.maxVideoChecks;
  }

  function openWizard() {
    document.body.classList.add("wizard-active");
    $("lite-wizard").style.display = "flex";
    $("lite-wizard").classList.add("active");
    $("lite-step-1").style.display = "block";
    $("lite-step-2").style.display = "none";
  }

  function closeWizard() {
    document.body.classList.remove("wizard-active");
    $("lite-wizard").classList.remove("active");
    $("lite-wizard").style.display = "none";
  }

  function step1Next() {
    const leftName = $("w_left_name").value.trim() || "CASA";
    const rightName = $("w_right_name").value.trim() || "OSPITI";
    const leftColor = ($("w_left_color")?.value || "#00ff00").trim();
    const rightColor = ($("w_right_color")?.value || "#ff0000").trim();
    const homeSide = $("w_home_side").value; // left|right
    const firstSrv = $("w_first_srv").value; // left|right
    const startTime = $("w_start_time").value || null;

    // Home side (CASA) positioning
    matchData.homeIsOnRight = (homeSide === "right");

    // Wizard uses left/right naming; map to home/guest according to current sides
    const leftTeam = getTeamOnSide("left");
    const rightTeam = getTeamOnSide("right");
    matchData[leftTeam].name = leftName;
    matchData[rightTeam].name = rightName;
    matchData[leftTeam].color = leftColor;
    matchData[rightTeam].color = rightColor;

    // First serve based on side selection
    const firstServeTeam = (firstSrv === "left") ? leftTeam : rightTeam;
    matchData.serving = firstServeTeam;

    matchData.startTime = startTime;
    matchData.matchActive = false;
    matchData.matchEnded = false;
    matchData.setupCompleted = true;
    matchData.home.score = 0; matchData.guest.score = 0;
    matchData.home.sets = 0; matchData.guest.sets = 0;
    matchData.home.timeouts = 0; matchData.guest.timeouts = 0;
    matchData.home.subs = 0; matchData.guest.subs = 0;
    matchData.home.videoChecks = 0; matchData.guest.videoChecks = 0;
    matchData.home.setScores = []; matchData.guest.setScores = [];
    matchData.history = { setStarters: [matchData.serving], tieBreakSwapDone: false };

    // move to step2
    $("lite-step-1").style.display = "none";
    $("lite-step-2").style.display = "block";

    // reflect pills early
    $("pill_left").innerText = matchData[leftTeam].name;
    $("pill_right").innerText = matchData[rightTeam].name;

    persist();
    renderAll();
  }
function startMatch() {
    // rules
    const rules = {
      matchType: $("r_type").value,
      setPoints: parseInt($("r_pts").value, 10),
      tieBreakPoints: parseInt($("r_tb").value, 10),
      minDiffSets: parseInt($("r_d_set").value, 10),
      minDiffTieBreak: parseInt($("r_d_tb").value, 10),
      sideSwitchMode: $("r_swap_m").value,
      tieBreakSwapEnabled: ($("r_tb_sw").value === "true"),
      tieBreakSwapPoint: parseInt($("r_tb_pt").value, 10),
      tieBreakSwapAnim: ($("r_tb_an").value === "true"),
      maxTimeouts: parseInt($("r_max_to").value, 10),
      timeoutDuration: parseInt($("r_dur_to").value, 10),
      maxSubs: parseInt($("r_max_sub").value, 10),
      intervalDuration: parseInt($("r_dur_int").value, 10),
      maxVideoChecks: parseInt($("r_max_vc").value, 10)
    };

    // basic validation
    Object.keys(rules).forEach(k => {
      if (typeof rules[k] === "number" && (Number.isNaN(rules[k]) || rules[k] < 0)) rules[k] = DEFAULT_RULES[k] ?? rules[k];
    });
    if (matchData.rules.maxVideoChecks === 0) rules.maxVideoChecks = 0; // keep disabled from step1

    matchData.rules = { ...DEFAULT_RULES, ...rules };
    matchData.setupCompleted = true;
    matchData.matchActive = true;
    matchData.matchEnded = false;
    matchData.winner = null;

    // Ask browser notification permission (for telemetry) after user gesture
    requestNotificationFlow().catch(()=>{});

    // match countdown
    handleMatchCountdown(matchData.startTime);

    persist();
    renderAll();
    closeWizard();
  }

  function handleMatchCountdown(timeStr) {
    // If no start time is provided, start an automatic short countdown
    if (!timeStr) { startTimer("match_start", 10, "INIZIO GARA"); return; }
    const now = new Date();
    const [h, m] = timeStr.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return;
    const t = new Date();
    t.setHours(h, m, 0, 0);
    if (t < now) {
      if ((now - t) > 1000 * 60 * 60 * 12) t.setDate(t.getDate() + 1);
    }
    const diff = Math.floor((t - now) / 1000);
    if (diff > 0) startTimer("match_start", diff, "INIZIO GARA");
  }

  function resetToWizard() {
    if (!confirm("Attenzione: questo terminerà la partita corrente. Continuare?")) return;
    stopTimer();
    matchData = getInitialMatchData();
    wizardDefaults();
    persist();
    renderAll();
    openWizard();
  }

  // ---------------------------
  // Keyboard controls
  // ---------------------------
  const HELP_ITEMS = [
    { label: "Punto Sinistra", key: "A" },
    { label: "Punto Destra", key: "D" },
    { label: "Timeout Sinistra", key: "Q" },
    { label: "Timeout Destra", key: "E" },
    { label: "Cambio Sinistra", key: "Z" },
    { label: "Cambio Destra", key: "X" },
    { label: "Undo (tieni premuto)", key: "C" },
    { label: "Fullscreen", key: "Spazio" }
  ];

  let cHeld = false;

  
  function dimControls() {
    const c = $("lite_controls");
    if (!c) return;
    c.classList.add("dimmed");
    clearTimeout(dimControls._t);
    dimControls._t = setTimeout(() => c.classList.remove("dimmed"), 1200);
  }

function applyKeyAction(k) {
    const leftTeam = getTeamOnSide("left");
    const rightTeam = getTeamOnSide("right");

    const undo = cHeld;

    switch (k) {
      case "a": undo ? subPoint(leftTeam) : addPoint(leftTeam); break;
      case "d": undo ? subPoint(rightTeam) : addPoint(rightTeam); break;
      case "q": undo ? subTimeout(leftTeam) : startTimeout(leftTeam); break;
      case "e": undo ? subTimeout(rightTeam) : startTimeout(rightTeam); break;
      case "z": undo ? subSub(leftTeam) : addSub(leftTeam); break;
      case "x": undo ? subSub(rightTeam) : addSub(rightTeam); break;
      default: return;
    }

    dimControls();
  }

  // ---------------------------
  // Help panel
  // ---------------------------
  function buildHelpPanel() {
    const list = $("lite_help_list");
    list.innerHTML = "";
    HELP_ITEMS.forEach(it => {
      const row = document.createElement("div");
      row.className = "lite-help-item";
      row.innerHTML = `<span>${it.label}</span><kbd>${it.key}</kbd>`;
      row.addEventListener("click", (e) => {
        e.stopPropagation();
        $("lite_help_panel").classList.add("faded");
      });
      list.appendChild(row);
    });
  }

  // ---------------------------
  // Telemetry (Supabase)
  // ---------------------------
  let supabase = null;
  let telemetryReady = false;
  let deviceId = null;

  async function initSupabase() {
    try {
      const cfg = await fetch("js/dbconfig.json", { cache: "no-store" }).then(r => r.json());
      supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
      telemetryReady = true;
    } catch (e) {
      console.warn("Supabase non inizializzato (ok in locale senza dbconfig.json)", e);
    }
  }

  async function getPublicIp() {
    try {
      const r = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
      const j = await r.json();
      return j.ip || null;
    } catch {
      return null;
    }
  }

  function devicePayload(extra = {}) {
    return {
      device_id: deviceId,
      accessed_at: nowIso(),
      user_agent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      referrer: document.referrer || null,
      ...extra
    };
  }

  async function logAccessMinimal() {
    if (!telemetryReady) return;
    try {
      await supabase.from("vscoreboard-live_devices").insert([devicePayload({
        notifications_consent: false,
        consent_status: Notification?.permission || "unsupported"
      })]);
    } catch (e) {
      console.warn("Telemetry minimal insert failed", e);
    }
  }

  async function logAccessFull() {
    if (!telemetryReady) return;
    try {
      const ip = await getPublicIp();
      await supabase.from("vscoreboard-live_devices").insert([devicePayload({
        notifications_consent: true,
        consent_status: Notification.permission,
        ip_address: ip
      })]);
    } catch (e) {
      console.warn("Telemetry full insert failed", e);
    }
  }

  async function requestNotificationFlow() {
    if (!("Notification" in window)) {
      alert("Notifiche non supportate da questo browser.");
      await logAccessMinimal();
      return;
    }

    // If already decided, just log accordingly
    if (Notification.permission === "granted") {
      await logAccessFull();
      return;
    }
    if (Notification.permission === "denied") {
      await logAccessMinimal();
      return;
    }

    // Ask user
    const ok = confirm("Vuoi abilitare le notifiche del browser? (Serve solo per telemetria: se accetti, salviamo dati dispositivo/IP; se rifiuti, registriamo solo l’accesso.)");
    if (!ok) {
      await logAccessMinimal();
      return;
    }

    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      // optional: show a tiny notification (non intrusive)
      try { new Notification("KTS Volley Scoreboard Lite", { body: "Notifiche abilitate." }); } catch {}
      await logAccessFull();
    } else {
      await logAccessMinimal();
    }
  }

  // ---------------------------
  // Desktop download popup
  // ---------------------------
  function maybeShowDownloadPopup() {
    // replaced by persistent banner
    if (!isDesktop()) return;
    const banner = $("dl-banner");
    const toggle = $("dl-banner-toggle");
    if (!banner || !toggle) return;
    const k="vscoreboard_lite_dl_banner_reduced_v1";
    const reduced = localStorage.getItem(k)==="1";
    if (reduced) banner.classList.add("reduced");
    toggle.onclick = (e)=>{
      e.stopPropagation();
      banner.classList.toggle("reduced");
      localStorage.setItem(k, banner.classList.contains("reduced")?"1":"0");
    };
  }

  // ---------------------------
  // Wiring
  // ---------------------------
  function wireUi() {
    // Fullscreen: desktop only with Space (no double click / double tap)
    function toggleFullscreen() {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
      else document.exitFullscreen().catch(()=>{});
    }
if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
      }
    });

    // click-to-hide countdown + un-fade help
    document.addEventListener("click", onScreenClick, { passive: true });

    // Mobile / extra buttons
    const fsBtn = document.getElementById("btn_fs");
    if (fsBtn) fsBtn.onclick = () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
      else document.exitFullscreen().catch(()=>{});
    };

    let undoMode = false;
    const undoBtn = document.getElementById("btn_undo");
    if (undoBtn) undoBtn.onclick = () => {
      undoMode = true;
      undoBtn.classList.add("active");
      setTimeout(() => { undoMode = false; undoBtn.classList.remove("active"); }, 2500);
    };

    function mobileAction(addFn, subFn) {
      if (!ensureMatchActive()) return;
      if (undoMode && typeof subFn === "function") subFn();
      else if (typeof addFn === "function") addFn();
      dimControls();
    }

    if (IS_MOBILE) {
      // Tap on scoreboard elements to control (no big buttons)
      const scoreHome = document.getElementById("score_home");
      const scoreGuest = document.getElementById("score_guest");
      const setsHome = document.getElementById("sets_home");
      const setsGuest = document.getElementById("sets_guest");
      const toHome = document.getElementById("dots_to_home");
      const toGuest = document.getElementById("dots_to_guest");
      const subHome = document.getElementById("dots_sub_home");
      const subGuest = document.getElementById("dots_sub_guest");
      const nmHome = document.getElementById("name_home");
      const nmGuest = document.getElementById("name_guest");
      const titleWrap = document.getElementById("main_title_wrapper");

      if (scoreHome) scoreHome.addEventListener("click", () => mobileAction(() => addPoint("home"), () => subPoint("home")), { passive:true });
      if (scoreGuest) scoreGuest.addEventListener("click", () => mobileAction(() => addPoint("guest"), () => subPoint("guest")), { passive:true });

      if (setsHome) setsHome.addEventListener("click", () => mobileAction(() => adjustSets("home", +1), () => adjustSets("home", -1)), { passive:true });
      if (setsGuest) setsGuest.addEventListener("click", () => mobileAction(() => adjustSets("guest", +1), () => adjustSets("guest", -1)), { passive:true });

      if (toHome) toHome.addEventListener("click", () => mobileAction(() => startTimeout("home"), () => subTimeout("home")), { passive:true });
      if (toGuest) toGuest.addEventListener("click", () => mobileAction(() => startTimeout("guest"), () => subTimeout("guest")), { passive:true });

      if (subHome) subHome.addEventListener("click", () => mobileAction(() => addSub("home"), () => subSub("home")), { passive:true });
      if (subGuest) subGuest.addEventListener("click", () => mobileAction(() => addSub("guest"), () => subSub("guest")), { passive:true });

      if (nmHome) nmHome.addEventListener("click", () => { if (!ensureMatchActive()) return; setServing("home"); }, { passive:true });
      if (nmGuest) nmGuest.addEventListener("click", () => { if (!ensureMatchActive()) return; setServing("guest"); }, { passive:true });

      if (titleWrap) titleWrap.addEventListener("click", () => { if (!ensureMatchActive()) return; matchData.homeIsOnRight = !matchData.homeIsOnRight; renderAll(); persist(); }, { passive:true });
    }


    // Help toggle
    $("lite_help_btn").addEventListener("click", (e) => {
      e.stopPropagation();
      $("lite_help_panel").classList.toggle("hidden");
      $("lite_help_panel").classList.remove("faded");
    });

    buildHelpPanel();

    // Wizard buttons
    $("btn_step1_next").onclick = step1Next;
    $("btn_back_step1").onclick = () => { $("lite-step-2").style.display = "none"; $("lite-step-1").style.display = "block"; };
    $("btn_start_match").onclick = startMatch;
    $("btn_reset").onclick = resetToWizard;
    
    // Controls buttons -> same actions as keys (without undo)
    $("btn_left_point").onclick = () => addPoint(getTeamOnSide("left"));
    $("btn_right_point").onclick = () => addPoint(getTeamOnSide("right"));
    $("btn_left_to").onclick = () => startTimeout(getTeamOnSide("left"));
    $("btn_right_to").onclick = () => startTimeout(getTeamOnSide("right"));
    $("btn_left_sub").onclick = () => addSub(getTeamOnSide("left"));
    $("btn_right_sub").onclick = () => addSub(getTeamOnSide("right"));
    $("btn_serv_left").onclick = () => setServing(getTeamOnSide("left"));
    $("btn_serv_right").onclick = () => setServing(getTeamOnSide("right"));
    $("btn_swap").onclick = () => { if (!ensureMatchActive()) return; swapSidesData(true); persist(); renderAll(); };
    // Click on timeout/sub dots like original index
    $("dots_to_home")?.addEventListener("click", () => startTimeout("home"));
    $("dots_to_guest")?.addEventListener("click", () => startTimeout("guest"));
    $("dots_sub_home")?.addEventListener("click", () => addSub("home"));
    $("dots_sub_guest")?.addEventListener("click", () => addSub("guest"));
    
    // Keyboard
    document.addEventListener("keydown", (e) => {
      // avoid when typing in wizard inputs
      const tag = document.activeElement?.tagName || "";
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      const k = (e.key || "").toLowerCase();
      if (k === "c") { cHeld = true; return; }
      applyKeyAction(k);
    });
    document.addEventListener("keyup", (e) => {
      const k = (e.key || "").toLowerCase();
      if (k === "c") cHeld = false;
    });
  }

  // ---------------------------
  // Boot
  // ---------------------------
  async function boot() {
    // device id for telemetry
    deviceId = localStorage.getItem("vscoreboard_lite_device_id");
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem("vscoreboard_lite_device_id", deviceId);
    }

    // prep UI defaults
    $("main_title").innerText = "KTS Volley Scoreboard Lite";
    wizardDefaults();

    // restore previous state (if any)
    const restored = restore();
    renderAll();

    // show wizard if not configured
    if (!restored || !matchData.setupCompleted) openWizard();
    else closeWizard();

    // if startTime exists and timer isn't active, schedule countdown
    if (matchData.setupCompleted && matchData.startTime && !matchData.timer?.active) {
      handleMatchCountdown(matchData.startTime);
    }

    wireUi();

    // init supabase and telemetry
    await initSupabase();

    // if user already decided permission earlier, auto-log on load;
    // otherwise we *only* log when user clicks the "Notifiche & Telemetria" button.
    if ("Notification" in window) {
      if (Notification.permission === "granted") await logAccessFull();
      else await logAccessMinimal();
    } else {
      // unsupported: minimal (access only)
      await logAccessMinimal();
    }

    maybeShowDownloadPopup();
  }

  boot().catch(console.error);
})();
