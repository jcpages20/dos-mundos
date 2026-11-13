// Move existing controls, preserving their native listeners and online state.
// The experimental entry point gets one accessible menu instead of overlapping
// floating buttons; all historical HTML pages keep their original UI.
export function installCityActions() {
  if (document.getElementById('dm-city-actions')) return;
  const root = document.createElement('details'); root.id = 'dm-city-actions';
  const trigger = document.createElement('summary'); trigger.textContent = 'Acciones';
  const panel = document.createElement('nav'); panel.className = 'dm-city-panel';
  panel.setAttribute('aria-label', 'Acciones de Dos Mundos');
  root.append(trigger, panel); document.body.append(root);
  const ids = ['dm61-open', 'dm55-trigger', 'dm42-phone-btn', 'dm42-dinner-btn', 'dm41-online-button',
    'dm381-radio-launcher', 'dm39-arcade-launcher', 'dm40-home-btn', 'dm40-weather-btn',
    'dm52-trigger', 'dm53-trigger', 'dm54-trigger', 'dm43-explore', 'dm33Toggle'];
  function collect() {
    for (const id of ids) {
      const button = document.getElementById(id);
      if (button && !panel.contains(button)) panel.append(button);
    }
  }
  collect();
  new MutationObserver(collect).observe(document.body, {childList: true});
  panel.addEventListener('click', event => { if (event.target.closest('button')) root.open = false; });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') root.open = false;
  });
  document.addEventListener('pointerdown', event => {
    if (root.open && !root.contains(event.target)) root.open = false;
  });
  window.addEventListener('dos-mundos:house', () => { root.open = false; });
}
