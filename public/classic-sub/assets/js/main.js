(() => {
  const SWITCH_TRAVEL_MS = 640;

  const attachModeToggleNavigation = (modeToggle) => {
    const toggleLink = modeToggle.querySelector('.site-mode-toggle__track');
    if (!(toggleLink instanceof HTMLAnchorElement)) return;

    toggleLink.addEventListener('click', (event) => {
      event.preventDefault();
      if (toggleLink.classList.contains('is-switching')) return;

      // Fire the toggle across the header first so the destination placement makes sense.
      modeToggle.classList.add('is-launching');
      toggleLink.classList.add('is-switching');

      window.setTimeout(() => {
        window.location.href = toggleLink.href;
      }, SWITCH_TRAVEL_MS);
    });
  };

  const mountClassicModeToggle = () => {
    const backHomeLink = document.querySelector('.nav-back-home');
    const navContainer = document.querySelector('.container.nav');
    const brand = navContainer?.querySelector('.brand');
    if (!backHomeLink || !navContainer || !brand) return;

    const modeToggle = document.createElement('div');
    modeToggle.className = 'site-mode-toggle';
    modeToggle.innerHTML = `
      <a class="site-mode-toggle__track" href="/">
        <span class="site-mode-toggle__icon" aria-hidden="true">↗</span>
        <span class="site-mode-toggle__thumb" aria-hidden="true"></span>
        <span class="site-mode-toggle__option site-mode-toggle__option--target">
          <strong>Carob People</strong>
          <small>the experimental version</small>
        </span>
        <span class="site-mode-toggle__option site-mode-toggle__option--active">
          <strong>Mango People</strong>
          <small>the clearer version</small>
        </span>
      </a>
    `;

    const identityRail = document.createElement('div');
    identityRail.className = 'nav-identity';
    identityRail.appendChild(modeToggle);
    identityRail.appendChild(brand);
    navContainer.insertBefore(identityRail, navContainer.firstChild);
    backHomeLink.remove();

    attachModeToggleNavigation(modeToggle);
  };

  const revealElements = () => {
    const elements = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    elements.forEach((el) => observer.observe(el));
  };

  mountClassicModeToggle();
  revealElements();
})();
