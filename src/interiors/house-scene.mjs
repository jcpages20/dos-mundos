import {HOUSE, HOUSE_VERSION, contains, roomAt} from './house-map.mjs';
import {canStand, clearSegment, distance, findPath, moveSafely, nearestApproach} from '../engine/navigation.mjs';
import {HouseRenderer} from './house-renderer.mjs';

const labels = {sit: 'Sentarse', 'sit-chair': 'Sentarse', sleep: 'Dormir', shower: 'Ducharse',
  read: 'Leer', cook: 'Ver recetas', pantry: 'Ver despensa', eat: 'Comer · 8 €',
  tv: 'Encender televisión', lamp: 'Cambiar luz', wardrobe: 'Ropa y aspecto', look: 'Examinar'};

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

export class HouseScene {
  constructor(api) {
    this.api = api;
    const state = api.snapshot();
    this.saveKey = `dos-mundos-casa-rpg-v${HOUSE_VERSION}:${api.role}:${encodeURIComponent(state.name)}`;
    this.actor = {...HOUSE.spawn, role: api.role, pose: 'stand', moving: false, seat: null};
    this.path = []; this.held = new Set(); this.target = null;
    this.tvOn = false; this.lightsOn = true; this.pendingAction = null;
    try {
      const saved = JSON.parse(localStorage.getItem(this.saveKey));
      if (saved?.version === HOUSE_VERSION) {
        // A walkable doorway is an exit trigger, never a resume position.
        if (saved.position && canStand(saved.position, HOUSE) && !contains(saved.position, HOUSE.exit)) {
          this.actor.x = saved.position.x; this.actor.y = saved.position.y;
          if (['up', 'down', 'left', 'right'].includes(saved.position.face)) this.actor.face = saved.position.face;
        }
        this.tvOn = saved.tvOn === true; this.lightsOn = saved.lightsOn !== false;
      }
    } catch { /* Never normalize or overwrite the previous namespaces. */ }
    this.origin = {x: state.x, y: state.y, city: state.city, district: state.district};
    this.abort = new AbortController();
  }

  async mount() {
    this.root = node('section', 'dm-house-scene'); this.root.id = 'dm-house-scene';
    this.root.setAttribute('aria-label', 'Nuestra casa');
    const header = node('header', 'dm-house-header');
    const identity = node('div', 'dm-house-identity');
    identity.append(node('span', 'dm-house-eyebrow', 'DOS MUNDOS · NUESTRA CASA'));
    this.roomLabel = node('h2', '', 'Salón'); identity.append(this.roomLabel);
    this.stats = node('p', 'dm-house-stats'); identity.append(this.stats);
    this.plan = this.button('Plano', () => {
      this.renderer.overview = !this.renderer.overview;
      this.plan.setAttribute('aria-pressed', String(this.renderer.overview));
      this.plan.textContent = this.renderer.overview ? 'Seguir' : 'Plano';
    });
    this.plan.setAttribute('aria-pressed', 'false');
    const menuButton = this.button('Menú', () => this.openMenu());
    header.append(identity, this.plan, menuButton);
    const stage = node('div', 'dm-house-stage');
    this.canvas = node('canvas'); this.canvas.id = 'dm-house-canvas';
    this.canvas.tabIndex = 0; this.canvas.setAttribute('aria-label', 'Escenario de la casa: toca el suelo para caminar');
    stage.append(this.canvas);
    this.message = node('p', 'dm-house-message', 'Toca el suelo para caminar. Acércate a un mueble para usarlo.');
    this.message.setAttribute('role', 'status'); this.message.setAttribute('aria-live', 'polite');
    const controls = node('footer', 'dm-house-controls');
    const pad = node('div', 'dm-house-pad'); pad.setAttribute('aria-label', 'Caminar');
    for (const [direction, label, glyph] of [['up', 'Caminar arriba', '▲'], ['left', 'Caminar izquierda', '◀︎'],
      ['down', 'Caminar abajo', '▼'], ['right', 'Caminar derecha', '▶︎']]) {
      const button = this.button(glyph, () => {}); button.dataset.direction = direction;
      button.setAttribute('aria-label', label);
      button.addEventListener('pointerdown', event => {
        event.preventDefault(); button.setPointerCapture(event.pointerId);
        this.startWalking(); this.held.add(direction);
      }, {signal: this.abort.signal});
      for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        button.addEventListener(eventName, () => this.held.delete(direction), {signal: this.abort.signal});
      }
      pad.append(button);
    }
    const context = node('div', 'dm-house-context');
    this.objectLabel = node('strong', '', 'Entrada');
    this.primary = this.button('Salir a Madrid', () => this.primaryAction(), 'dm-house-primary');
    context.append(this.objectLabel, this.primary);
    controls.append(pad, context);
    this.root.append(header, stage, this.message, controls);
    document.getElementById('interior').append(this.root);
    document.body.classList.add('dm-house-active');
    this.renderer = new HouseRenderer(this.canvas);
    this.renderer.camera = {x: Math.max(0, this.actor.x - this.canvas.width / 2),
      y: Math.max(0, this.actor.y - this.canvas.height / 2)};
    this.canvas.addEventListener('pointerdown', event => this.tap(event), {signal: this.abort.signal});
    document.addEventListener('keydown', event => this.key(event, true), {capture: true, signal: this.abort.signal});
    document.addEventListener('keyup', event => this.key(event, false), {capture: true, signal: this.abort.signal});
    window.addEventListener('blur', () => this.held.clear(), {signal: this.abort.signal});
    document.addEventListener('visibilitychange', () => {
      this.held.clear(); if (document.hidden) this.save();
    }, {signal: this.abort.signal});
    this.feedback('Preparando vuestra casa…');
    await this.renderer.load();
    if (!this.root.isConnected) return;
    this.ready = true;
    this.feedback('Toca el suelo para caminar. También puedes usar las flechas.');
    this.previous = performance.now();
    const tick = now => {
      if (!this.root.isConnected) return;
      this.update(Math.min((now - this.previous) / 1000, .05), now);
      this.previous = now; this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  button(text, action, className = '') {
    const button = node('button', className, text); button.type = 'button';
    button.addEventListener('click', action, {signal: this.abort.signal}); return button;
  }

  feedback(text) { this.message.textContent = text; }

  modalOpen() {
    return this.menu || this.paused || [...document.querySelectorAll(
      '[aria-modal="true"],.dm55-overlay,.dm54-overlay,.dm61-overlay,#dm40-modal,.dm42-overlay,#dm33-cinema-overlay,#dm41-panel,#dm381-radio-panel:not([hidden])')]
      .some(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
  }

  key(event, pressed) {
    const directions = {ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right'};
    if (!this.root.isConnected || this.modalOpen() || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (directions[event.key]) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (pressed) { this.startWalking(); this.held.add(directions[event.key]); }
      else this.held.delete(directions[event.key]);
    } else if (pressed && ['Enter', ' '].includes(event.key)) {
      event.preventDefault(); event.stopImmediatePropagation(); this.primaryAction();
    }
  }

  startWalking() {
    this.stand(); this.path = []; this.pendingAction = null;
  }

  stand() {
    if (this.actor.pose === 'stand') return;
    const point = this.standPoint || HOUSE.spawn;
    Object.assign(this.actor, point, {pose: 'stand', seat: null});
    this.standPoint = null; this.target = null;
  }

  tap(event) {
    if (!this.ready || this.modalOpen()) return;
    event.preventDefault();
    const point = this.renderer.worldPoint(event);
    if (!point) return;
    const object = [...HOUSE.objects].reverse().find(object => contains(point, object));
    if (object) {
      this.approach(object); return;
    }
    this.stand(); this.pendingAction = null; this.target = null;
    const path = findPath(this.actor, point, HOUSE);
    if (path) { this.path = path; this.feedback('Caminando por casa…'); }
    else this.feedback('Ese lugar está bloqueado. Prueba tocando el suelo libre.');
  }

  approach(object) {
    this.stand(); this.held.clear();
    const option = nearestApproach(this.actor, object, HOUSE);
    if (!option) { this.feedback('No hay una zona libre para acercarse a ese objeto.'); return; }
    this.target = object; this.path = option.path;
    this.pendingAction = () => {
      this.actor.face = option.point.face || 'up'; this.target = object;
      this.feedback(object.description || object.name);
    };
    this.feedback('Acercándote a ' + object.name.toLowerCase() + '…');
  }

  update(dt, now) {
    if (this.paused) return;
    const before = {x: this.actor.x, y: this.actor.y};
    const blocked = this.modalOpen();
    if (blocked) this.held.clear();
    if (!blocked && this.actor.pose === 'stand') {
      let dx = Number(this.held.has('right')) - Number(this.held.has('left'));
      let dy = Number(this.held.has('down')) - Number(this.held.has('up'));
      if (dx || dy) {
        const magnitude = Math.hypot(dx, dy); dx /= magnitude; dy /= magnitude;
        Object.assign(this.actor, moveSafely(this.actor, dx * dt * 104, dy * dt * 104, HOUSE));
        this.actor.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      } else if (this.path.length) {
        const target = this.path[0], length = distance(this.actor, target), step = Math.min(dt * 116, length);
        if (length > .1) {
          dx = (target.x - this.actor.x) / length; dy = (target.y - this.actor.y) / length;
          Object.assign(this.actor, moveSafely(this.actor, dx * step, dy * step, HOUSE));
          this.actor.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        }
        if (distance(this.actor, target) < 1.5 && clearSegment(this.actor, target, HOUSE)) {
          this.actor.x = target.x; this.actor.y = target.y; this.path.shift();
        }
        else if (distance(before, this.actor) < .01 && length > 2) {
          this.path = []; this.pendingAction = null; this.feedback('El camino está bloqueado. Elige otro punto.');
        }
      }
      if (!this.path.length && this.pendingAction) {
        const action = this.pendingAction; this.pendingAction = null; action();
      }
    }
    this.actor.moving = distance(before, this.actor) > .05;
    if (this.actor.pose === 'shower' && now > this.poseUntil) this.stand();
    if (this.actor.pose === 'stand' && contains(this.actor, HOUSE.exit)) { this.api.exit(); return; }
    const state = this.api.snapshot();
    if (!state) return;
    const nearest = HOUSE.objects.flatMap(object => object.approaches.map(point => ({object, gap: distance(this.actor, point)})))
      .filter(option => option.gap < 35).sort((a, b) => a.gap - b.gap)[0];
    if (!this.path.length && this.actor.pose === 'stand') this.target = nearest?.object || null;
    this.roomLabel.textContent = roomAt(this.actor).name;
    const time = `${String(Math.floor(state.time / 60) % 24).padStart(2, '0')}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`;
    this.stats.textContent = `${this.actor.role === 'jc' ? 'JC' : 'Gabi'} · ${state.money} € · Energía ${state.energy}/100 · ${time}`;
    if (this.actor.pose !== 'stand') {
      this.objectLabel.textContent = this.actor.pose === 'sleep' ? 'Descansando en la cama' : this.actor.pose === 'shower' ? 'En la ducha' : 'Sentado';
      this.primary.textContent = this.actor.pose === 'sleep' ? 'Despertarse' : 'Levantarse'; this.primary.disabled = false;
    } else if (this.target) {
      this.objectLabel.textContent = this.target.name;
      this.primary.textContent = this.target.action === 'tv' ? (this.tvOn ? 'Apagar televisión' : 'Encender televisión') : labels[this.target.action];
      this.primary.disabled = this.path.length > 0;
    } else {
      const nearExit = distance(this.actor, {x: 360, y: 520}) < 44;
      this.objectLabel.textContent = nearExit ? 'Entrada' : 'Nuestra casa';
      this.primary.textContent = nearExit ? 'Salir a Madrid' : 'Acércate a un mueble'; this.primary.disabled = !nearExit;
    }
    this.renderer.draw(this.actor, state, now, this.target, this.tvOn, this.lightsOn);
  }

  primaryAction() {
    if (this.modalOpen() || !this.ready) return;
    if (this.actor.pose !== 'stand') { this.stand(); this.save(); return; }
    const object = this.target;
    if (!object) {
      if (distance(this.actor, {x: 360, y: 520}) < 44) this.api.exit();
      return;
    }
    const closest = Math.min(...object.approaches.map(point => distance(this.actor, point)));
    if (closest > 35 || this.path.length) { this.approach(object); return; }
    this.standPoint = {x: this.actor.x, y: this.actor.y, face: this.actor.face};
    if (object.action === 'sit') {
      const seat = [...HOUSE.seats].sort((a, b) => distance(this.actor, a.approach) - distance(this.actor, b.approach))[0];
      Object.assign(this.actor, {x: seat.x, y: seat.y, face: seat.face, pose: 'sit', seat: seat.id});
      this.feedback('Un rato en vuestro sofá. Pulsa Levantarse para seguir caminando.');
    } else if (object.action === 'sit-chair') {
      Object.assign(this.actor, {x: object.x + object.w / 2, y: object.y + object.h - 13, face: 'down', pose: 'sit', seat: object.id});
      this.feedback('Una silla junto a la mesa.');
    } else if (object.action === 'sleep') {
      if (this.api.act('rest')) {
        Object.assign(this.actor, {x: 137, y: 145, face: 'down', pose: 'sleep'});
        this.feedback('Has descansado y recuperado energía. Puedes despertarte cuando quieras.');
      }
    } else if (object.action === 'shower') {
      if (this.api.act('clean')) {
        this.actor.pose = 'shower'; this.poseUntil = performance.now() + 3500;
        this.feedback('Agua caliente y un momento para cuidarte. Tu higiene ha mejorado.');
      }
    } else if (object.action === 'read') {
      this.api.act('read'); this.feedback('Has leído un rato: mejora tu habilidad de estudio.');
    } else if (object.action === 'eat') {
      this.feedback(this.api.act('eat') ? 'Has comido y recuperado hambre y energía.' : 'Necesitas 8 € para esta comida.');
    } else if (object.action === 'tv') {
      this.tvOn = !this.tvOn; this.feedback(this.tvOn ? 'Televisión encendida. En el menú puedes elegir una película.' : 'Televisión apagada.');
    } else if (object.action === 'lamp') {
      this.lightsOn = !this.lightsOn; this.feedback(this.lightsOn ? 'Las luces están encendidas.' : 'Las luces están apagadas.');
    } else if (object.action === 'cook') this.api.menu('recipes');
    else if (object.action === 'pantry') this.api.menu('pantry');
    else if (object.action === 'wardrobe') this.api.menu('appearance');
    else this.feedback(object.description || object.name);
    this.save();
  }

  openMenu() {
    if (this.menu) return;
    this.held.clear();
    this.menu = node('section', 'dm-house-menu'); this.menu.setAttribute('aria-label', 'Menú de casa');
    const close = () => { this.menu?.remove(); this.menu = null; };
    this.menu.append(node('h2', '', 'Un rato en casa'), this.button('Cerrar', close));
    const actions = [
      ['Recetas y cocina', 'recipes'], ['Despensa', 'pantry'], ['Mochila', 'inventory'],
      ['Mi casa y decoración', 'decor'], ['Citas y recuerdos', 'duo'], ['Móvil y chat', 'phone'],
      ['Música y radio', 'radio'], ['Elegir película', 'cinema'], ['Vida propia', 'life'], ['Conectar', 'online']
    ];
    for (const [label, action] of actions) this.menu.append(this.button(label, () => { close(); this.api.menu(action); }));
    this.menu.append(this.button('Actividades de la casa anterior', () => { close(); this.showLegacy(); }));
    this.menu.append(this.button('Salir a Madrid', () => { close(); this.api.exit(); }));
    this.root.append(this.menu);
  }

  showLegacy() {
    this.paused = true; this.held.clear(); this.root.hidden = true;
    this.api.resumeOldAnimation();
    document.body.classList.remove('dm-house-active');
    this.returnButton = this.button('Volver al escenario de la casa', () => {
      this.paused = false; this.root.hidden = false; this.returnButton.remove();
      this.api.stopOldAnimation();
      document.body.classList.add('dm-house-active'); this.renderer.resize();
    }, 'dm-house-return');
    document.body.append(this.returnButton);
  }

  save() {
    const candidate = this.actor.pose === 'stand' ? {x: this.actor.x, y: this.actor.y, face: this.actor.face} : this.standPoint;
    const position = candidate && canStand(candidate, HOUSE) && !contains(candidate, HOUSE.exit)
      ? candidate : {...HOUSE.spawn};
    try {
      localStorage.setItem(this.saveKey, JSON.stringify({version: HOUSE_VERSION, position,
        tvOn: this.tvOn, lightsOn: this.lightsOn, updated: Date.now()}));
    } catch { this.feedback('El navegador no ha podido guardar la posición de la casa.'); }
  }

  destroy() {
    this.save(); cancelAnimationFrame(this.frame); this.abort.abort();
    this.renderer?.destroy(); this.root?.remove(); this.returnButton?.remove();
    document.body.classList.remove('dm-house-active');
  }

  snapshot() {
    return {ready: !!this.ready, role: this.actor.role, position: {x: this.actor.x, y: this.actor.y},
      room: roomAt(this.actor).id, pose: this.actor.pose, face: this.actor.face, moving: this.actor.moving,
      walking: this.path.length > 0, target: this.target?.id || null, tvOn: this.tvOn, origin: this.origin};
  }
}
