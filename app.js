document.addEventListener('DOMContentLoaded', () => {
  const allModules = document.querySelectorAll('.module');
  const allNavBtns = document.querySelectorAll('.nav-btn');

  function showModule(moduleId) {
    allModules.forEach(m => m.classList.remove('active'));
    allNavBtns.forEach(b => b.classList.remove('active'));

    const targetModule = document.getElementById(`module-${moduleId}`);
    if (targetModule) targetModule.classList.add('active');

    const targetBtn = document.querySelector(`.nav-btn[data-module="${moduleId}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  allNavBtns.forEach(btn => {
    btn.addEventListener('click', () => showModule(btn.dataset.module));
  });

  document.querySelectorAll('[data-module]').forEach(el => {
    if (!el.classList.contains('nav-btn')) {
      el.addEventListener('click', () => showModule(el.dataset.module));
    }
  });
});
