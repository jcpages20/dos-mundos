import {cinemaBridgeSource} from './cinema-bridge.mjs?interiores=2';
import {gymBridgeSource} from './gym-bridge.mjs';
import {gymWorldBridgeSource} from './gym-world-bridge.mjs';
import {venueNavigationSource} from './venue-navigation.mjs';
import {cafeBridgeSource} from './cafe-bridge.mjs';
import {cityBridgeSource} from './city-bridge.mjs';

// This function is serialized into the existing game's closure, before boot.
// It adapts existing actions instead of introducing another economy or save.
export function installLegacyHouseBridge() {
  const notifyHouse = type => window.dispatchEvent(new CustomEvent('dos-mundos:house', {detail: {type}}));
  const oldOpen = openPlace, oldClose = closeInterior, oldTabs = tabs;
  const oldNearby = currentNearby;
  currentNearby = function() {
    if (!state) return null;
    const existing = oldNearby();
    if (existing) return existing;
    const home = mapPlaces.find(place => place.id === 'home');
    if (!home) return null;
    const entrance = routeToEntrance(home);
    return Math.hypot(state.x - entrance.x, state.y - entrance.y) <= 36 ? home : null;
  };
  openPlace = function(id) {
    oldOpen(id);
    if (indoor === 'home') notifyHouse('enter');
    else notifyHouse('leave');
  };
  closeInterior = function() { notifyHouse('leave'); oldClose(); };
  tabs = function(target) {
    if (target !== 'world') notifyHouse('leave');
    oldTabs(target);
  };
  window.DosMundosLegacy = {
    get room() { return indoor; },
    get role() { return dm51LocalIdentity(); },
    snapshot() {
      if (!state) return null;
      return {name: state.name, money: state.money, energy: state.energy, hunger: state.hunger,
        hygiene: state.hygiene, fun: state.fun, day: state.day, time: state.time,
        x: state.x, y: state.y, city: state.city, district: state.district};
    },
    stopOldAnimation() { stopRoomAnimation(); },
    resumeOldAnimation() { if (indoor === 'home') startRoomAnimation(); },
    exit() { closeInterior(); },
    act(type) {
      if (!state || indoor !== 'home') return false;
      if (type === 'read') {
        performDetailed({icon: '', name: 'Leer en casa', skill: 'estudio', minutes: 30},
          {title: 'Leer', gain: {fun: 5, energy: -3}, xp: 10, success: 'Leíste un rato en tu librería.'});
      } else if (['rest', 'clean', 'eat'].includes(type)) {
        if (type === 'eat' && state.money < 8) return false;
        doAction(type);
      } else return false;
      save(); return true;
    },
    menu(type) {
      if (type === 'recipes') dm55Show('cook');
      else if (type === 'pantry') dm55Show('market');
      else if (type === 'inventory') dm54Inventory();
      else if (type === 'phone') dm42OpenPhone();
      else if (type === 'life') dm55Show();
      else if (type === 'decor') dm40ShowHouse();
      else if (type === 'duo') { dm61Modal(); dm61Render('dates'); }
      else if (type === 'cinema') dm33OpenCinema();
      else if (type === 'radio') document.getElementById('dm381-radio-launcher')?.click();
      else if (type === 'online') dm41Modal();
      else if (type === 'appearance') {
        tabs('life');
        const editor = document.getElementById('appearanceEditor');
        if (editor) { editor.open = true; editor.scrollIntoView({block: 'start'}); }
      }
    }
  };
}

export function extendLegacyBuilder(builder, {stylesURL, installerURL}) {
  const marker = 'frame.srcdoc = game;';
  if (builder.split(marker).length !== 2) throw new Error('El lanzador histórico cambió; se conserva la versión anterior.');
  const boot = 'preview(); buildLists(); loadState();';
  const bridge = `(${installLegacyHouseBridge.toString()})();\n` + cinemaBridgeSource() + gymBridgeSource() + venueNavigationSource() + cafeBridgeSource() + gymWorldBridgeSource() + cityBridgeSource();
  const cinemaStylesURL = new URL('../../styles/cinema.css', import.meta.url).href;
  const venueStylesURL = new URL('../../styles/venues.css', import.meta.url).href;
  const gymStylesURL = new URL('../../styles/gym.css', import.meta.url).href;
  const gymInstallerURL = new URL('../interiors/install-gym.mjs', import.meta.url).href;
  const cityStylesURL = new URL('../../styles/city.css', import.meta.url).href;
  const cityInstallerURL = new URL('../world/install-city.mjs?madrid=5', import.meta.url).href;
  const literal = value => JSON.stringify(value).replace(/</g, '\\u003c');
  const inputMarker = 'x=(e.clientX-r.left)*VIEW_W/r.width+cam.x,y=(e.clientY-r.top)*VIEW_H/r.height+cam.y;';
  const responsiveInput = 'x=(e.clientX-r.left)*cv.width/r.width+cam.x,y=(e.clientY-r.top)*cv.height/r.height+cam.y;';
  const extension = `
    if (game.split(${literal(boot)}).length !== 2) throw new Error('No se encontró el arranque compatible.');
    if (game.split(${literal(inputMarker)}).length !== 2) throw new Error('No se encontró el control táctil compatible.');
    game = game.replace(${literal(inputMarker)}, ${literal(responsiveInput)});
    game = game.replace(${literal(boot)}, ${literal(bridge)} + ${literal(boot)});
    game = game.replace('</head>', '<link rel="stylesheet" href="' + ${literal(stylesURL)} + '"></head>');
    game = game.replace('</head>', '<link rel="stylesheet" href="' + ${literal(cinemaStylesURL)} + '"></head>');
    game = game.replace('</head>', '<link rel="stylesheet" href="' + ${literal(venueStylesURL)} + '"></head>');
    game = game.replace('</head>', '<link rel="stylesheet" href="' + ${literal(gymStylesURL)} + '"></head>');
    game = game.replace('</head>', '<link rel="stylesheet" href="' + ${literal(cityStylesURL)} + '"></head>');
    game = game.replace('</body>', '<script type="module" src="' + ${literal(installerURL)} + '"><' + '/script></body>');
    game = game.replace('</body>', '<script type="module" src="' + ${literal(gymInstallerURL)} + '"><' + '/script></body>');
    game = game.replace('</body>', '<script type="module" src="' + ${literal(cityInstallerURL)} + '"><' + '/script></body>');
    ${marker}
  `;
  return builder.replace(marker, extension);
}
