import {TYPES, LEVELS} from './model.mjs';
import {GYM_PROGRESS} from './progression.mjs';

const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const copy = v => JSON.parse(JSON.stringify(v));
const symbols = {weights: 'F', cardio: 'C', silks: 'T', stretch: 'M'};
const levels = {suave: 'S', normal: 'N', reto: 'R'};
export const routineCodeFor = (type, level, seed, routine = 'base') =>
  `ATLAS2-${symbols[type]}-${levels[level]}-${routine === 'flow' ? 'F' : 'B'}-${(seed & 0xffffff).toString(16).padStart(6, '0').toUpperCase()}`;

export function parseRoutineCode(text) {
  const m = String(text).trim().toUpperCase().split(/\s+·\s+/)[0].match(/^ATLAS2-([FCTM])-([SNR])-([BF])-([0-9A-F]{6})$/);
  return m ? {engine: 'routine', type: {F: 'weights', C: 'cardio', T: 'silks', M: 'stretch'}[m[1]],
    level: {S: 'suave', N: 'normal', R: 'reto'}[m[2]], routine: m[3] === 'F' ? 'flow' : 'base', seed: parseInt(m[4], 16)} : null;
}

export const FIGURES = {
  knot: 'Nudo', star: 'Estrella', candle: 'Vela', butterfly: 'Mariposa'
};
export function routineBreath(s) {
  const bold=s.choices[s.round]==='bold',finale=s.phase==='finale';
  const period=finale?4:s.routine==='flow'?(bold?6:5):(bold?5:4);
  const inhaleFor=finale?2:s.routine==='flow'?(bold?2.5:2):period/2;
  return {period,inhaleFor,inhale:s.phaseTime%period<inhaleFor};
}
export function choiceLabel(type, routine, round, risk) {
  const bold = risk === 'bold';
  const names = {
    weights: bold ? 'Carga exigente' : 'Carga controlada',
    cardio: bold ? 'Intervalo rápido' : 'Trote cómodo',
    silks: FIGURES[routine === 'flow' ? bold ? 'butterfly' : 'candle' : bold ? 'star' : 'knot'],
    stretch: bold ? 'Postura amplia' : 'Postura estable'
  };
  return names[type] + (bold ? ' · hasta 300 pt' : ' · hasta 220 pt');
}

function makePlan(seed, routine) {
  let n = seed >>> 0;
  const rng = () => {n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296;};
  return Array.from({length: 3}, (_, i) => ({
    targets: Array.from({length: 3}, () => .5 + rng() * .24 + (routine === 'flow' ? .06 : 0)),
    offset: rng() * Math.PI * 2,
    lead: i % 2 ? 'right' : 'left'
  }));
}

// A routine always lasts 45 active seconds. Decisions occupy two seconds of
// each ten-second round; pause and background time never advance the clock.
export class GymRoutine {
  constructor(type, level = 'normal', seed = 1, routine = 'base') {
    if (!TYPES[type] || !LEVELS[level] || !GYM_PROGRESS.routines[type]?.[routine] ||
        !Number.isInteger(seed) || seed < 0 || seed > 0xffffff) throw new Error('Elige una rutina válida.');
    this.state = {
      version: 2, engine: 'routine', type, level, seed, routine, plan: makePlan(seed, routine),
      phase: 'ready', phaseTime: 0, elapsed: 0, paused: false, held: [], round: -1,
      choices: [null, null, null], rounds: [], score: 0, combo: 0, maxCombo: 0,
      inputs: 0, hits: 0, attempts: 0, engaged: 0, power: 0, posePower: 0,
      rep: 0, reps: [], cooldown: 0, notes: [], distance: 0, pace: 0,
      height: 0, balance: 0, balanced: 0, figure: 'knot', secured: false,
      roundGrade: 0, aligned: 0, finalGrade: 0, finalDone: false, finalHold: 0,
      finalInputs: 0, errors: 0
    };
  }
  static restore(raw) {
    if (raw?.version !== 2) throw new Error('Esta rutina guardada no es compatible.');
    const g = new GymRoutine(raw.type, raw.level, raw.seed, raw.routine);
    const finite = ['elapsed', 'phaseTime', 'score', 'combo', 'maxCombo', 'inputs', 'hits', 'attempts',
      'engaged', 'power', 'posePower', 'rep', 'cooldown', 'distance', 'pace', 'height', 'balance',
      'balanced', 'roundGrade', 'aligned', 'finalGrade', 'finalHold', 'finalInputs', 'errors'];
    if (finite.some(k => !Number.isFinite(raw[k])) || raw.engine !== 'routine' || raw.elapsed < 0 || raw.elapsed > 45 ||
        raw.phaseTime < 0 || raw.score < 0 || raw.score > 1000 || !Number.isInteger(raw.round) || raw.round < -1 || raw.round > 2 ||
        !['ready', 'warmup', 'choose', 'exercise', 'finale', 'done'].includes(raw.phase) ||
        JSON.stringify(raw.plan) !== JSON.stringify(g.state.plan) ||
        !Array.isArray(raw.choices) || raw.choices.length !== 3 || raw.choices.some(c => c !== null && !['safe', 'bold'].includes(c)) ||
        !Array.isArray(raw.rounds) || raw.rounds.length > 3 || raw.rounds.some(r => !r || !Number.isFinite(r.grade) || r.grade < 0 || r.grade > 1 || !['safe', 'bold'].includes(r.risk)) ||
        !Array.isArray(raw.reps) || raw.reps.length > 3 || raw.reps.some(v => !Number.isFinite(v) || v < 0 || v > 1) ||
        !Array.isArray(raw.notes) || raw.notes.length > 8 || raw.notes.some(v => !v || !Number.isFinite(v.at) || !['left', 'right'].includes(v.side) || ![null, 0, .65, 1].includes(v.result)) ||
        !Object.hasOwn(FIGURES, raw.figure) || raw.height < 0 || raw.height > 1 || Math.abs(raw.balance) > 1 ||
        raw.power < 0 || raw.power > 1.13 || raw.posePower < 0 || raw.posePower > 1.13 || raw.finalGrade < 0 || raw.finalGrade > 1 ||
        raw.rep < 0 || raw.rep > 3 || !Number.isInteger(raw.rep) || ['inputs','hits','attempts','errors'].some(k=>raw[k]<0||!Number.isInteger(raw[k]))) throw new Error('La rutina guardada está incompleta. Se conserva para que puedas descartarla.');
    const base={ready:0,warmup:0,choose:5+raw.round*10,exercise:7+raw.round*10,finale:35,done:45}[raw.phase];
    if(Math.abs(raw.elapsed-base-raw.phaseTime)>1e-5)throw new Error('El reloj guardado no corresponde a esta fase. Puedes descartar el intento sin cambiar tu progreso.');
    g.state = {...g.state, ...copy(raw), paused: true, held: []};
    return g;
  }
  get cfg() {return LEVELS[this.state.level];}
  get risk() {return this.state.choices[Math.max(0, this.state.round)] || 'safe';}
  get band() {return (this.risk === 'bold' ? .12 : .26) * (this.state.level === 'reto' ? .8 : this.state.level === 'suave' ? 1.2 : 1);}
  start() {if (this.state.phase === 'ready') {this.state.phase = 'warmup'; this.state.phaseTime = 0;}}
  pause() {if (!['ready', 'done'].includes(this.state.phase)) this.state.paused = true; this.clearInputs();}
  resume() {this.state.paused = false; this.clearInputs();}
  clearInputs() {this.state.held = [];}
  choose(risk) {
    const s = this.state;
    if (s.phase !== 'choose' || s.paused || !['safe', 'bold'].includes(risk)) return false;
    s.choices[s.round] = risk;
    return true;
  }
  hit(grade) {
    const s = this.state;
    s.attempts++;
    if (grade > 0) {s.hits++; s.combo++; s.maxCombo = Math.max(s.maxCombo, s.combo);}
    else {s.combo = 0; s.errors++;}
  }
  prepareRound(index) {
    const s = this.state;
    s.round = index; s.phase = 'choose'; s.phaseTime = 0; s.held = [];
    s.power = 0; s.rep = 0; s.reps = []; s.cooldown = 0;
    s.height = 0; s.balance = 0; s.balanced = 0; s.secured = false;
    s.roundGrade = 0; s.aligned = 0; s.notes = [];
  }
  beginExercise() {
    const s = this.state;
    s.choices[s.round] ||= 'safe';
    s.phase = 'exercise'; s.phaseTime = 0; s.held = [];
    const count = (this.risk === 'bold' ? 6 : 4) + (s.routine==='flow'?1:0);
    const lead = s.plan[s.round].lead;
    s.notes = Array.from({length: count}, (_, i) => ({at: s.routine==='flow'?.8+6.1*(1-(1-i/(count-1))**1.35):.9+i*(6/(count-1)),
      side: i % 2 ? lead === 'left' ? 'right' : 'left' : lead, result: null}));
    s.figure = s.routine === 'flow' ? this.risk === 'bold' ? 'butterfly' : 'candle' : this.risk === 'bold' ? 'star' : 'knot';
  }
  finishRound() {
    const s = this.state;
    let grade = s.type === 'weights' ? s.reps.reduce((n, v) => n + v, 0) / 3 :
      s.type === 'cardio' ? s.notes.reduce((n, v) => n + (v.result || 0), 0) / s.notes.length :
      s.type === 'silks' ? s.roundGrade : s.aligned / 8;
    grade = clamp(grade);
    s.rounds.push({risk: this.risk, grade, figure: s.figure});
    s.score = Math.round(s.rounds.reduce((n, r) => n + r.grade * (r.risk === 'bold' ? 300 : 220), 0));
    if (s.round < 2) this.prepareRound(s.round + 1);
    else {
      s.phase = 'finale'; s.phaseTime = 0; s.held = []; s.power = 0; s.posePower = 0;
      s.height = .9; s.finalDone = false; s.aligned = 0;
      const count=s.routine==='flow'?8:6;
      s.notes = Array.from({length: count}, (_, i) => ({at: 1.2 + i * (6.25/(count-1)), side: i % 2 ? 'right' : 'left', result: null}));
    }
  }
  input(action, pressed = true) {
    const s = this.state;
    if (s.paused || ['ready', 'done', 'choose'].includes(s.phase)) return;
    const was = s.held.includes(action);
    if (pressed) {if (was) return; s.held.push(action);} else s.held = s.held.filter(k => k !== action);
    if (s.phase === 'warmup') return;
    if (pressed) {s.inputs++; if (s.phase === 'finale') s.finalInputs++;}
    if (s.type === 'weights') {
      if (s.phase === 'exercise' && action === 'action' && !pressed && was && s.cooldown <= 0 && s.rep < 3) {
        const error = Math.abs(s.power - s.plan[s.round].targets[s.rep]);
        const grade = error <= this.band * .35 ? 1 : error <= this.band ? .65 : 0;
        s.reps.push(grade); s.rep++; s.power = 0; s.cooldown = .42; this.hit(grade);
      } else if (s.phase === 'finale' && action === 'action' && !pressed && was && !s.finalDone) {
        s.finalGrade = clamp(1 - Math.abs(s.finalHold - 2) / 1.4); s.finalDone = true; this.hit(s.finalGrade);
      }
    } else if (s.type === 'cardio' && pressed && ['left', 'right'].includes(action)) {
      const window = this.cfg.window * (s.phase === 'finale' ? 1 : this.risk === 'bold' ? .8 : 1.35);
      const note = s.notes.filter(n => n.result === null && Math.abs(n.at - s.phaseTime) <= window).sort((a, b) => Math.abs(a.at - s.phaseTime) - Math.abs(b.at - s.phaseTime))[0];
      if (note) {
        note.result = note.side !== action ? 0 : Math.abs(note.at - s.phaseTime) <= this.cfg.perfect ? 1 : .65;
        this.hit(note.result);
        if (note.result) s.pace = s.phase === 'finale' || this.risk === 'bold' ? 1 : .6;
      }
    } else if (s.type === 'silks' && action === 'action') {
      if (s.phase === 'exercise' && pressed && s.phaseTime >= 6 && !s.secured) {
        s.secured = true;
        const target = this.risk === 'bold' ? .82 : .57;
        const heightGrade = clamp(1 - Math.abs(s.height - target) / (this.risk === 'bold' ? .2 : .32));
        s.roundGrade = heightGrade * .4 + clamp(s.balanced / 3) * .4 + clamp(1 - Math.abs(s.balance) / (this.band * 2)) * .2;
        if (heightGrade < .25) s.roundGrade *= .25;
        this.hit(s.roundGrade >= .4 ? s.roundGrade : 0);
      } else if (s.phase === 'finale' && !pressed && was && !s.finalDone) {
        s.finalGrade = clamp(1 - Math.abs(s.height - .08) / .2); s.finalDone = true; this.hit(s.finalGrade);
      }
    }
  }
  tickExercise(dt) {
    const s = this.state, hold = s.held.includes('action');
    if (s.type === 'weights') {
      s.cooldown = Math.max(0, s.cooldown - dt);
      if (hold && s.cooldown <= 0 && s.rep < 3) {
        s.engaged += dt; s.power += dt * (this.risk === 'bold' ? .84 : .64);
        if (s.power > 1.12) {s.reps.push(0); s.rep++; s.power = 0; s.held = []; s.cooldown = .42; this.hit(0);}
      }
      s.posePower += (s.power - s.posePower) * Math.min(1, dt * 12);
    } else if (s.type === 'cardio') this.tickCardio(dt);
    else if (s.type === 'silks') {
      if (s.phaseTime < 3) {if (hold) {s.height = clamp(s.height + dt * .38); s.engaged += dt;}}
      else if (!s.secured) {
        const correction = Number(s.held.includes('right')) - Number(s.held.includes('left'));
        if (correction) s.engaged += dt;
        const gust = Math.sin(s.phaseTime * (s.routine === 'flow' ? 2.3 : 1.7) + s.plan[s.round].offset);
        s.balance = clamp(s.balance + (gust * (this.risk === 'bold' ? .7 : .34) + correction * .9) * dt, -1, 1);
        if (s.phaseTime < 6 && Math.abs(s.balance) <= this.band) s.balanced += dt;
      }
    } else {
      const {inhale}=routineBreath(s);
      if (hold) s.engaged += dt;
      if (inhale === hold) s.aligned += dt;
    }
  }
  tickWarmup(dt) {
    const s=this.state,hold=s.held.includes('action');
    s.posePower+=((hold?.5:0)-s.posePower)*Math.min(1,dt*8);
    if(s.type==='silks')s.height+=((hold?.12:0)-s.height)*Math.min(1,dt*6);
    if(s.type==='cardio')s.pace=s.held.includes('left')||s.held.includes('right')?.3:0;
  }
  tickCardio(dt) {
    const s = this.state;
    const window = this.cfg.window * (s.phase === 'finale' ? 1 : this.risk === 'bold' ? .8 : 1.35);
    for (const note of s.notes) if (note.result === null && s.phaseTime > note.at + window) {note.result = 0; this.hit(0);}
    s.pace = Math.max(.18, s.pace - dt * .07);
    s.distance += s.pace * dt * 9;
    if (s.pace > .4) s.engaged += dt;
  }
  tickFinale(dt) {
    const s = this.state, hold = s.held.includes('action');
    if (s.type === 'weights') {
      if (hold && !s.finalDone) {s.finalHold += dt; s.engaged += dt;}
      s.posePower += ((hold && !s.finalDone ? .8 : 0) - s.posePower) * Math.min(1, dt * 8);
    } else if (s.type === 'cardio') {
      this.tickCardio(dt);
      s.finalGrade = s.notes.reduce((n, v) => n + (v.result || 0), 0) / s.notes.length;
    } else if (s.type === 'silks') {
      if (hold && !s.finalDone) {s.height = Math.max(0, s.height - dt * .18); s.engaged += dt;}
    } else {
      const {inhale}=routineBreath(s);
      if (hold) s.engaged += dt;
      if (inhale === hold) s.aligned += dt;
      s.finalGrade = clamp(s.aligned / 10);
    }
  }
  update(seconds) {
    const s = this.state;
    if (s.paused || ['ready', 'done'].includes(s.phase)) return;
    let remaining = clamp(Number(seconds) || 0, 0, .1);
    // Split frames at phase boundaries, so a 30 Hz or 120 Hz device consumes
    // exactly the same amount of active time in every phase.
    while (remaining > 1e-8 && s.phase !== 'done') {
      const length = {warmup: 5, choose: 2, exercise: 8, finale: 10}[s.phase];
      const dt = Math.min(remaining, Math.max(0, length - s.phaseTime));
      s.elapsed = Math.min(45, s.elapsed + dt); s.phaseTime += dt;
      if (s.phase === 'warmup') this.tickWarmup(dt);
      else if (s.phase === 'exercise') this.tickExercise(dt);
      else if (s.phase === 'finale') this.tickFinale(dt);
      remaining -= dt;
      if (s.phaseTime >= length - 1e-8) {
        if (s.phase === 'warmup') this.prepareRound(0);
        else if (s.phase === 'choose') this.beginExercise();
        else if (s.phase === 'exercise') this.finishRound();
        else {s.score = clamp(Math.round(s.score + s.finalGrade * 100), 0, 1000); s.elapsed = 45; s.phase = 'done'; s.phaseTime = 0; s.held = [];}
      }
    }
  }
  result() {
    const s = this.state;
    if (s.phase !== 'done') return null;
    return {engine: 'routine', routine: s.routine, score: s.score, maxCombo: s.maxCombo, hits: s.hits,
      attempts: s.attempts, inputs: s.inputs, elapsed: 45, errors: s.errors,
      rounds: copy(s.rounds), finalGrade: Math.round(s.finalGrade * 100),
      effort: s.inputs >= 3 && s.engaged >= 1.8 && (s.attempts >= 2 || s.type === 'stretch'),
      medal: s.score >= 850 ? 'Oro' : s.score >= 650 ? 'Plata' : s.score >= 400 ? 'Bronce' : 'En práctica'};
  }
  snapshot() {return copy(this.state);}
}
