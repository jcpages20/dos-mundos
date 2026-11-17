import {originalActorImage} from './original-actor.mjs?rutinas=10';
import {routineBreath} from '../gym-games/routine-model.mjs?rutinas=10';

// Articulated cut-outs of the existing artwork. Face, hair, sunglasses,
// clothes, skin and shoes all come from the original JC/Gabi PNGs.
// Nothing here changes those PNGs or the actor used elsewhere in Madrid.
function piece(g, image, crop, x, y, w, h) {
  g.drawImage(image, crop[0] * image.width, crop[1] * image.height,
    crop[2] * image.width, crop[3] * image.height, x, y, w, h);
}
function limb(g, image, crop, from, to, width) {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  g.save(); g.translate(from[0], from[1]); g.rotate(Math.atan2(dy, dx) - Math.PI / 2);
  piece(g, image, crop, -width / 2, -1, width, Math.hypot(dx, dy) + 2); g.restore();
}

export function drawSportsAccessory(g, id, left = [-12, -13], right = [12, -13]) {
  if (id === 'wraps' || id === 'lavender') {
    g.fillStyle = id === 'wraps' ? '#668f83' : '#b3a0c3';
    for (const [x, y] of [left, right]) {g.fillRect(Math.round(x - 3), Math.round(y - 2), 6, 4); g.fillStyle = id === 'wraps' ? '#d8d7b6' : '#e1d4df'; g.fillRect(Math.round(x - 3), Math.round(y - 2), 6, 1); g.fillStyle = id === 'wraps' ? '#668f83' : '#b3a0c3';}
  } else if (id === 'medal') {
    g.strokeStyle = '#be9f78'; g.lineWidth = 1; g.beginPath(); g.moveTo(-5, -23); g.lineTo(0, -16); g.lineTo(5, -23); g.stroke();
    g.fillStyle = '#d1b16b'; g.fillRect(-2, -17, 5, 5); g.fillStyle = '#ead5a1'; g.fillRect(-1, -17, 2, 2);
  }
}

export function exercisePose(s) {
  const exercise = s.phase === 'exercise', finale = s.phase === 'finale';
  const ready = ['choose', 'done'].includes(s.phase);
  const pose = {type: s.type, lift: 0, lean: 0, stride: 0, figure: null, height: 0};
  if (s.type === 'weights') pose.lift = ready ? 0 : s.posePower;
  if (s.type === 'cardio') {
    pose.stride = ready ? 0 : Math.sin(s.elapsed * (5 + s.pace * 8));
    pose.lean = ready ? 0 : -.05 - s.pace * .12;
  }
  if (s.type === 'silks') {
    pose.height = exercise || finale || s.phase==='warmup' ? s.height : 0;
    pose.figure = exercise && s.phaseTime >= 3 ? s.figure : null;
    pose.lean = exercise ? s.balance * .4 : 0;
  }
  if (s.type === 'stretch' && !ready) {
    const {period} = routineBreath(s);
    pose.lift = (1 - Math.cos(s.phaseTime / period * Math.PI * 2)) / 2;
    pose.lean = Math.sin(s.phaseTime / period * Math.PI * 2) * (s.choices[s.round] === 'bold' ? .3 : .13) * (s.routine==='flow'&&s.round%2?-1:1);
    if(s.phase==='warmup'){pose.lift=s.posePower;pose.lean=0;}
  }
  return pose;
}

export function drawOriginalExercise(g, actor, pose, accessory = 'none') {
  const image = originalActorImage(actor.role);
  if (!image) return;
  const gabi = actor.role === 'gabi', w = 52 * image.width / image.height;
  const arm = side => [side === 'left' ? .17 : .69, gabi ? .66 : .67, .14, .18];
  const leg = side => [side === 'left' ? .31 : .51, .81, .18, .18];
  let leftElbow = [-12, -14], rightElbow = [12, -14], leftHand = [-12, -8], rightHand = [12, -8];
  let leftKnee = [-5, -5], rightKnee = [5, -5], leftFoot = [-6, 1], rightFoot = [6, 1];
  let angle = pose.lean, dy = 0;
  if (pose.type === 'weights') {
    leftElbow = [-14, -12 - pose.lift * 22]; rightElbow = [14, -12 - pose.lift * 22];
    leftHand = [-18, -25 - pose.lift * 19]; rightHand = [18, -25 - pose.lift * 19];
    dy = pose.lift * 1.5;
  } else if (pose.type === 'cardio') {
    const a = pose.stride;
    leftKnee = [-5 - a * 7, -6 - Math.abs(a) * 2]; rightKnee = [5 + a * 7, -6 - Math.abs(a) * 2];
    leftFoot = [-6 - a * 10, -Math.max(0, a) * 5]; rightFoot = [6 + a * 10, Math.min(0, a) * 5];
    leftElbow = [-11, -17 + a * 4]; rightElbow = [11, -17 - a * 4];
    leftHand = [-7 + a * 5, -23 + a * 4]; rightHand = [7 - a * 5, -23 - a * 4];
    dy = -Math.abs(a) * 1.5;
  } else if (pose.type === 'silks') {
    leftElbow = [-13, -33]; rightElbow = [13, -33]; leftHand = [-7, -43]; rightHand = [7, -43];
    if (pose.figure === 'knot') {leftKnee = [-12, -10]; rightKnee = [11, -5]; leftFoot = [-3, -4]; rightFoot = [2, 0];}
    if (pose.figure === 'star') {leftKnee = [-14, -5]; rightKnee = [14, -5]; leftFoot = [-24, 4]; rightFoot = [24, 4]; leftElbow = [-16, -24]; rightElbow = [16, -24]; leftHand = [-26, -26]; rightHand = [26, -26];}
    if (pose.figure === 'candle') {angle += Math.PI; leftKnee = [-4, -5]; rightKnee = [4, -5]; leftFoot = [-3, 5]; rightFoot = [3, 5];}
    if (pose.figure === 'butterfly') {angle += .5; leftKnee = [-18, -13]; rightKnee = [17, -11]; leftFoot = [-8, -2]; rightFoot = [8, -2]; leftHand = [-13, -43]; rightHand = [13, -43];}
  } else if (pose.type === 'stretch') {
    leftElbow = [-12 - pose.lift * 4, -14 - pose.lift * 20]; rightElbow = [12 + pose.lift * 4, -14 - pose.lift * 20];
    leftHand = [-12 + pose.lift * 6, -8 - pose.lift * 39]; rightHand = [12 - pose.lift * 6, -8 - pose.lift * 39];
    leftFoot = [-8 - pose.lift * 5, 1]; rightFoot = [8 + pose.lift * 5, 1];
  }
  if (pose.equipment === 'legpress') {
    const push = pose.lift * 13;
    leftKnee = [-13, -9 - push * .4]; rightKnee = [9, -10 - push * .4];
    leftFoot = [-22 - push, -6 - push]; rightFoot = [17 + push, -6 - push];
    leftElbow = [-11, -15]; rightElbow = [11, -15]; leftHand = [-12, -8]; rightHand = [12, -8];
  } else if (pose.equipment === 'bike') {
    leftKnee = [-10, -7 - pose.stride * 4]; rightKnee = [10, -7 + pose.stride * 4];
    leftFoot = [-9, 2 + pose.stride * 5]; rightFoot = [9, 2 - pose.stride * 5];
    leftHand = [-13, -22]; rightHand = [13, -22];
  } else if (pose.equipment === 'rower') {
    angle += pose.stride * .12;
    leftHand = [-11, -22 + pose.stride * 5]; rightHand = [11, -22 + pose.stride * 5];
    leftKnee = [-12, -5]; rightKnee = [12, -5]; leftFoot = [-20, 0]; rightFoot = [20, 0];
  } else if (pose.equipment === 'punching-bag') {
    leftHand = [-14, -28 - Math.max(0, pose.stride) * 13]; rightHand = [14, -28 + Math.min(0, pose.stride) * 13];
  }
  g.save(); g.translate(Math.round(actor.x), Math.round(actor.y + dy)); g.rotate(angle); g.imageSmoothingEnabled = false;
  limb(g, image, leg('left'), [-4, -12], leftKnee, 7); limb(g, image, leg('left'), leftKnee, leftFoot, 7);
  limb(g, image, leg('right'), [4, -12], rightKnee, 7); limb(g, image, leg('right'), rightKnee, rightFoot, 7);
  piece(g, image, [.27, .62, .46, .22], -8, -23, 16, 13);
  limb(g, image, arm('left'), [-8, -21], leftElbow, 5); limb(g, image, arm('left'), leftElbow, leftHand, 5);
  limb(g, image, arm('right'), [8, -21], rightElbow, 5); limb(g, image, arm('right'), rightElbow, rightHand, 5);
  piece(g, image, [0, 0, 1, .63], -w / 2, -52, w, 52 * .63);
  drawSportsAccessory(g, accessory, leftHand, rightHand);
  g.restore();
}
