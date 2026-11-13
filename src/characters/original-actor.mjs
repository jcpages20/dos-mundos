const images = new Map();
export async function loadOriginalActors() {
  await Promise.all(['jc', 'gabi'].flatMap(role => ['down', 'up', 'left', 'right'].map(async face => {
    const image = new Image();
    image.src = new URL(`../../assets/characters/${role}_${face}.png`, import.meta.url).href;
    await image.decode(); images.set(role + '-' + face, image);
  })));
}

export function drawOriginalActor(g, actor, now) {
  const image = images.get(actor.role + '-' + actor.face) || images.get(actor.role + '-down');
  if (!image) return;
  const h = 52, w = h * image.naturalWidth / image.naturalHeight;
  const moving = actor.moving && actor.pose === 'stand';
  const bob = moving ? Math.sin(now / 85) * 1.1 : 0;
  g.save(); g.translate(Math.round(actor.x), Math.round(actor.y));
  g.fillStyle = '#29233844'; g.beginPath(); g.ellipse(0, -1, 12, 4, 0, 0, Math.PI * 2); g.fill();
  g.imageSmoothingEnabled = false;
  if (actor.pose === 'sit') {
    // Derive the seated silhouette from the same original sprite; keep its face,
    // hair and clothing. A dedicated authored pose atlas is a later art pass.
    const split = Math.round(image.naturalHeight * .78), top = h * .78;
    g.drawImage(image, 0, 0, image.naturalWidth, split, -w / 2, -h + 8, w, top);
    g.drawImage(image, 0, split, image.naturalWidth, image.naturalHeight - split,
      -w / 2, -h + 8 + top, w, 7);
  } else {
    g.translate(0, bob);
    if (moving) g.rotate(Math.sin(now / 120) * .025);
    g.drawImage(image, -w / 2, -h, w, h);
  }
  if (actor.pose === 'sleep') {
    g.fillStyle = '#f1dfb2'; g.font = 'bold 9px monospace'; g.fillText('z', 11, -41);
  }
  if (actor.pose === 'shower') {
    for (let i = 0; i < 5; i++) {
      const y = ((now / 35 + i * 7) % 38) - 43;
      g.fillStyle = '#c3ebeb'; g.fillRect(-11 + i * 5, y, 1, 4);
    }
  }
  g.restore();
}
