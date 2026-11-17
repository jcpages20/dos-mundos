// Kept self-contained so the legacy bridge can install the same rules in its iframe.
export function createGymProgression() {
  const sports = ['weights', 'cardio', 'silks', 'stretch'];
  const routines = {
    weights: {base: 'Control de barra', flow: 'Escalera de fuerza'},
    cardio: {base: 'Vuelta a Madrid', flow: 'Intervalos de la Castellana'},
    silks: {base: 'Nudo y estrella', flow: 'Vela y mariposa'},
    stretch: {base: 'Pausa de bienestar', flow: 'Fluir sobre la esterilla'}
  };
  const accessories = [
    {id: 'none', name: 'Sin accesorio', sessions: 0},
    {id: 'wraps', name: 'Muñequeras Atlas', sessions: 1},
    {id: 'lavender', name: 'Muñequeras lavanda', sessions: 3},
    {id: 'medal', name: 'Medalla del club', sessions: 6}
  ];
  const empty = () => ({version: 1, sessions: 0, sports: {}, equipped: 'none'});
  function read(raw) {
    if (raw == null) return empty();
    if (raw.version !== 1 || !Number.isInteger(raw.sessions) || raw.sessions < 0 ||
        !raw.sports || accessories.every(a => a.id !== raw.equipped) ||
        Object.values(raw.sports).some(n => !Number.isInteger(n) || n < 0)) {
      throw new Error('El armario se conserva, pero esta versión no puede editarlo.');
    }
    return JSON.parse(JSON.stringify(raw));
  }
  function unlocked(raw, type, routine) {
    const data = read(raw);
    return !!routines[type]?.[routine] && (routine === 'base' || (data.sports[type] || 0) >= 2);
  }
  function available(raw) {
    const data = read(raw);
    return accessories.filter(a => data.sessions >= a.sessions).map(a => a.id);
  }
  function award(raw, type) {
    if (!sports.includes(type)) throw new Error('Modalidad desconocida.');
    const data = read(raw), before = available(data);
    data.sessions++;
    data.sports[type] = (data.sports[type] || 0) + 1;
    const earned = accessories.filter(a => !before.includes(a.id) && available(data).includes(a.id)).map(a => a.name);
    if (data.sports[type] === 2) earned.push(routines[type].flow);
    return {data, earned};
  }
  function equip(raw, id) {
    const data = read(raw);
    if (!available(data).includes(id)) throw new Error('Completa las sesiones indicadas para conseguir este accesorio.');
    data.equipped = id;
    return data;
  }
  return {sports, routines, accessories, empty, read, unlocked, available, award, equip};
}

export const GYM_PROGRESS = createGymProgression();
