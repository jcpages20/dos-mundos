import {cinemaProgramme, drawCinema} from '../venues/cinema.mjs';

// Runs inside the existing closure. Spending, XP, time, saves, actors and
// streaming links continue to use the original game's functions unchanged.
export function installLegacyCinemaBridge(render, programmeForDay) {
  const originalDraw = dm56Cinema, originalOpen = dm56OpenVenue, originalAct = dm56Act;
  dm56Cinema = function(g, time) {
    try { render(g, time); }
    catch (error) { dm56Cinema = originalDraw; originalDraw(g, time); console.warn('Cine: vista clásica recuperada', error); }
  };
  function updateProgramme() {
    if (dm56Scene?.id !== 'cinema') return;
    const root = dm56Scene.overlay, button = root.querySelector('.dm-cinema-today');
    const board = root.querySelector('.dm-cinema-programme');
    if (!button || !board) return;
    const programme = programmeForDay(state.day);
    if (board.dataset.day === String(programme.day)) return;
    board.dataset.day = String(programme.day);
    button.textContent = 'Cartelera del día ' + programme.day + ' · Tres ideas para ver juntos';
    board.replaceChildren();
    const heading = document.createElement('h3'); heading.textContent = 'Hoy en la cartelera · Día ' + programme.day;
    const intro = document.createElement('p'); intro.textContent = 'Ideas para buscar en tu plataforma.';
    const films = document.createElement('div'); films.className = 'dm-cinema-films';
    for (const film of programme.films) {
      const card = document.createElement('article'); card.style.setProperty('--film-color', film.color);
      const category = document.createElement('small'); category.textContent = film.label;
      const title = document.createElement('strong'); title.textContent = film.title;
      const note = document.createElement('p'); note.textContent = film.note;
      card.append(category, title, note); films.append(card);
    }
    board.append(heading, intro, films);
  }
  function showProgramme() {
    updateProgramme();
    const root = dm56Scene?.overlay, board = root?.querySelector('.dm-cinema-programme');
    if (!board) return;
    board.hidden = false;
    root.querySelector('.dm-cinema-today').setAttribute('aria-expanded', 'true');
    const programme = programmeForDay(state.day);
    dm56Say('Cartelera del día ' + programme.day + ': ' + programme.films.map(film => film.title).join(' · '));
    board.scrollIntoView({block: 'nearest'});
  }
  dm56Act = function(action) {
    if (dm56Scene?.id === 'cinema' && action.id === 'poster') { showProgramme(); return; }
    const result = originalAct(action);
    updateProgramme(); // An activity may advance the game into the next day.
    return result;
  };
  dm56OpenVenue = function(id) {
    const result = originalOpen(id);
    if (id !== 'cinema' || dm56Scene?.id !== 'cinema') return result;
    const root = dm56Scene.overlay;
    root.dataset.cinema = '';
    root.querySelector('.dm56-brand small').textContent = 'DOS MUNDOS · UNA NOCHE DE CINE';
    root.querySelector('h2').textContent = 'Cine Estrella';
    root.querySelector('.dm56-brand p').textContent = 'Pantalla encendida, luces bajas y un plan juntos.';
    root.querySelector('.dm56-helper').textContent = 'Toca un símbolo o elige una actividad';
    root.querySelector('#dm56-message').setAttribute('aria-live', 'polite');
    root.querySelectorAll('.dm56-action').forEach((button, index) => {
      button.dataset.cinemaAction = dm56Venues.cinema.actions[index].id;
    });
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'dm-cinema-today';
    button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', 'dm-cinema-programme');
    const board = document.createElement('section');
    board.id = 'dm-cinema-programme'; board.className = 'dm-cinema-programme'; board.hidden = true;
    button.onclick = () => {
      if (board.hidden) showProgramme();
      else { board.hidden = true; button.setAttribute('aria-expanded', 'false'); }
    };
    root.querySelector('.dm56-footer').prepend(button, board);
    updateProgramme();
    root.querySelector('.dm56-exit').focus({preventScroll: true});
    return result;
  };
}

export function cinemaBridgeSource() {
  return `(${installLegacyCinemaBridge.toString()})(${drawCinema.toString()}, ${cinemaProgramme.toString()});\n`;
}
