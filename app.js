/**
 * APP.JS — AI Algorithm Explorer
 * Main application controller: module switching, navigation, etc.
 */

document.addEventListener('DOMContentLoaded', () => {
  const allModules = document.querySelectorAll('.module');
  const allNavBtns = document.querySelectorAll('.nav-btn');

  /**
   * Switches the visible module.
   * @param {string} moduleId - e.g. "pathfinder", "mapcolor", "checkers", "hanoi"
   */
  function showModule(moduleId) {
    allModules.forEach(m => m.classList.remove('active'));
    allNavBtns.forEach(b => b.classList.remove('active'));

    const targetModule = document.getElementById(`module-${moduleId}`);
    if (targetModule) targetModule.classList.add('active');

    const targetBtn = document.querySelector(`.nav-btn[data-module="${moduleId}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    // Scroll to top on switch
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Nav button clicks
  allNavBtns.forEach(btn => {
    btn.addEventListener('click', () => showModule(btn.dataset.module));
  });

  // Dashboard card / launch button clicks
  document.querySelectorAll('[data-module]').forEach(el => {
    // Only trigger for elements that aren't nav-btns (those are handled above)
    if (!el.classList.contains('nav-btn')) {
      el.addEventListener('click', () => showModule(el.dataset.module));
    }
  });
});
