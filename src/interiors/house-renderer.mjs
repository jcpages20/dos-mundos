import {HOUSE} from './house-map.mjs';
import {drawOriginalActor, loadOriginalActors} from '../characters/original-actor.mjs';

const noise = (x, y) => {
  const n = Math.sin(x * 17.31 + y * 37.19) * 43758.54;
  return n - Math.floor(n);
};

export class HouseRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.camera = {x: 0, y: 0};
    this.overview = false;
    this.ground = this.makeGround();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
  }

  async load() {
    const response = await fetch(new URL('../../assets/furniture/house-atlas.json', import.meta.url));
    if (!response.ok) throw new Error('No se encuentra el atlas de los muebles.');
    this.atlas = await response.json();
    this.image = new Image();
    this.image.src = new URL('../../assets/furniture/' + this.atlas.image, import.meta.url).href;
    await Promise.all([this.image.decode(), loadOriginalActors()]);
    if (this.image.naturalWidth !== this.atlas.width || this.image.naturalHeight !== this.atlas.height) {
      throw new Error('Las dimensiones del atlas no coinciden.');
    }
  }

  resize() {
    const box = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(160, Math.round(box.width / 1.5));
    this.canvas.height = Math.max(120, Math.round(box.height / 1.5));
    this.g.imageSmoothingEnabled = false;
  }

  makeGround() {
    const canvas = document.createElement('canvas');
    canvas.width = HOUSE.width; canvas.height = HOUSE.height;
    const g = canvas.getContext('2d');
    g.fillStyle = '#253938'; g.fillRect(0, 0, canvas.width, canvas.height);
    for (const room of HOUSE.rooms) {
      g.save(); g.beginPath(); g.rect(room.x, room.y, room.w, room.h); g.clip();
      for (let y = room.y; y < room.y + room.h; y += 16) for (let x = room.x - 48; x < room.x + room.w; x += 48) {
        if (room.floor === 'wood') {
          const offset = Math.round(y / 16) % 2 ? 24 : 0;
          const px = x + offset;
          g.fillStyle = ['#bd8557', '#c38b5d', '#c99466', '#b97f53'][Math.floor(noise(x, y) * 4)];
          g.fillRect(px, y, 48, 16);
          g.fillStyle = '#e5b98177'; g.fillRect(px + 1, y + 1, 46, 1);
          g.fillStyle = '#86573988'; g.fillRect(px, y + 15, 48, 1); g.fillRect(px + 47, y, 1, 16);
          for (let k = 0; k < 4; k++) {
            const xx = px + 3 + Math.floor(noise(px + k, y) * 35), yy = y + 4 + k * 2;
            g.fillStyle = k % 2 ? '#e3b58455' : '#8b5b3c44';
            g.fillRect(xx, yy, 6 + Math.floor(noise(yy, xx) * 12), 1);
          }
        } else {
          for (let k = 0; k < 3; k++) {
            const tx = x + k * 16, blue = room.floor === 'blue-tile';
            g.fillStyle = blue ? '#a4c0c0' : '#ded3b8'; g.fillRect(tx, y, 16, 16);
            g.fillStyle = blue ? '#86a9b3' : '#c0b092'; g.fillRect(tx + 1, y + 1, 14, 14);
            g.fillStyle = blue ? '#d4e4dd77' : '#f8ebcf88'; g.fillRect(tx + 2, y + 2, 12, 1);
            g.fillStyle = blue ? '#6b8c9a66' : '#9a8c7444'; g.fillRect(tx + 14, y + 3, 1, 11);
          }
        }
      }
      g.restore();
    }
    for (const rug of HOUSE.rugs) {
      g.fillStyle = '#47344844'; g.fillRect(rug.x + 3, rug.y + 4, rug.w, rug.h);
      g.fillStyle = rug.edge; g.fillRect(rug.x, rug.y, rug.w, rug.h);
      g.fillStyle = '#695b7299'; g.fillRect(rug.x + 3, rug.y + 3, rug.w - 6, rug.h - 6);
      g.fillStyle = rug.color; g.fillRect(rug.x + 6, rug.y + 6, rug.w - 12, rug.h - 12);
      g.strokeStyle = rug.edge; g.lineWidth = 1;
      g.strokeRect(rug.x + 10.5, rug.y + 10.5, rug.w - 21, rug.h - 21);
      for (let y = rug.y + 15; y < rug.y + rug.h - 12; y += 8) for (let x = rug.x + 15; x < rug.x + rug.w - 12; x += 8) {
        g.fillStyle = '#f4dfc52b'; g.fillRect(x, y, 2, 2);
      }
    }
    // The south doorway stays physically open; these are only the threshold and step.
    g.fillStyle = '#644b3a'; g.fillRect(336, 536, 48, 16);
    g.fillStyle = '#d4b17c'; g.fillRect(338, 538, 44, 4);
    return canvas;
  }

  sprite(g, key, box) {
    const frame = this.atlas?.frames[key];
    if (!frame || !this.image?.complete) return;
    g.drawImage(this.image, ...frame, Math.round(box.x), Math.round(box.y), box.w, box.h);
  }

  wall(g, box) {
    g.fillStyle = '#36273344'; g.fillRect(box.x + 3, box.y + 3, box.w, box.h + 5);
    g.fillStyle = '#79553e'; g.fillRect(box.x, box.y - 18, box.w, box.h + 18);
    g.fillStyle = '#dbbf91'; g.fillRect(box.x + 1, box.y - 16, box.w - 2, box.h + 9);
    g.fillStyle = '#ead5ad'; g.fillRect(box.x + 1, box.y - 16, box.w - 2, 3);
    g.fillStyle = '#ad7c52'; g.fillRect(box.x, box.y + box.h - 7, box.w, 5);
    g.fillStyle = '#694a3e'; g.fillRect(box.x, box.y + box.h - 2, box.w, 2);
    g.fillStyle = '#98704c44'; g.fillRect(box.x + 1, box.y - 8, 1, box.h + 1);
  }

  draw(actor, state, now, focused, tvOn, lightsOn) {
    const {g, canvas} = this;
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#203330'; g.fillRect(0, 0, canvas.width, canvas.height);
    let scale = 1;
    if (this.overview) {
      scale = Math.min(canvas.width / HOUSE.width, canvas.height / HOUSE.height);
      this.transform = {x: (canvas.width - HOUSE.width * scale) / 2,
        y: (canvas.height - HOUSE.height * scale) / 2, scale};
    } else {
      const target = {x: Math.max(0, Math.min(HOUSE.width - canvas.width, actor.x - canvas.width / 2)),
        y: Math.max(0, Math.min(HOUSE.height - canvas.height, actor.y - canvas.height * .6))};
      this.camera.x += (target.x - this.camera.x) * .16;
      this.camera.y += (target.y - this.camera.y) * .16;
      this.transform = {x: -Math.round(this.camera.x), y: -Math.round(this.camera.y), scale};
    }
    g.save(); g.translate(this.transform.x, this.transform.y); g.scale(scale, scale);
    g.drawImage(this.ground, 0, 0);
    const queue = [];
    for (const wall of HOUSE.walls) {
      for (let y = wall.y; y < wall.y + wall.h; y += 16) for (let x = wall.x; x < wall.x + wall.w; x += 16) {
        const tile = {x, y, w: Math.min(16, wall.x + wall.w - x), h: Math.min(16, wall.y + wall.h - y)};
        queue.push({depth: tile.y + tile.h, render: () => this.wall(g, tile)});
      }
    }
    for (const object of HOUSE.wallObjects) queue.push({depth: object.y + object.h, render: () => this.sprite(g, object.sprite, object)});
    for (const object of HOUSE.objects) queue.push({depth: object.depth, render: () => {
      this.sprite(g, object.sprite, object);
      if (object.id === 'television' && tvOn) {
        const x = object.x + 15, y = object.y + 6;
        g.fillStyle = '#75b9cb'; g.fillRect(x, y, 91, 38);
        g.fillStyle = '#dfc89a'; g.fillRect(x, y + 27, 91, 11);
        g.fillStyle = '#72986e'; g.beginPath(); g.moveTo(x, y + 29); g.lineTo(x + 23, y + 11);
        g.lineTo(x + 50, y + 29); g.lineTo(x + 72, y + 16); g.lineTo(x + 91, y + 29); g.fill();
        g.fillStyle = '#f0edd4'; g.fillRect(x + 9 + Math.floor(now / 1200) % 24, y + 7, 13, 3);
      }
    }});
    let actorDepth = actor.y;
    if (actor.pose === 'sleep') actorDepth = 197;
    if (actor.pose === 'sit' && actor.seat?.startsWith('sofa')) actorDepth = 415;
    queue.push({depth: actorDepth + .1, render: () => {
      drawOriginalActor(g, actor, now);
      if (actor.pose === 'sleep') {
        const bed = HOUSE.objects.find(object => object.id === 'bed');
        const [sx, sy, sw, sh] = this.atlas.frames['double-bed'];
        g.drawImage(this.image, sx, sy + sh * .51, sw, sh * .49,
          bed.x, bed.y + bed.h * .51, bed.w, bed.h * .49);
      }
    }});
    queue.sort((a, b) => a.depth - b.depth).forEach(item => item.render());
    if (focused && actor.pose === 'stand') {
      const point = focused.approaches[0];
      g.strokeStyle = '#fff0c68c'; g.lineWidth = 1;
      g.beginPath(); g.ellipse(point.x, point.y - 1, 9, 4, 0, 0, Math.PI * 2); g.stroke();
    }
    const hour = ((state?.time || 480) / 60) % 24;
    if (hour >= 19 || hour < 6) {
      g.fillStyle = '#17244144'; g.fillRect(0, 0, HOUSE.width, HOUSE.height);
    }
    if (lightsOn) for (const lamp of HOUSE.objects.filter(object => object.sprite.includes('lamp') || object.sprite === 'nightstand')) {
      for (let ring = 4; ring > 0; ring--) {
        g.fillStyle = '#ffd28b07';
        g.fillRect(lamp.x + lamp.w / 2 - ring * 11, lamp.y + 12 - ring * 9, ring * 22, ring * 18);
      }
    }
    g.restore();
  }

  worldPoint(event) {
    const box = this.canvas.getBoundingClientRect(), t = this.transform;
    if (!t) return null;
    return {x: ((event.clientX - box.left) * this.canvas.width / box.width - t.x) / t.scale,
      y: ((event.clientY - box.top) * this.canvas.height / box.height - t.y) / t.scale};
  }

  destroy() { this.observer.disconnect(); }
}
