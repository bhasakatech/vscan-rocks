// media query match that indicates the desktop navigation layout
const isDesktop = window.matchMedia('(width >= 1200px)');

/**
 * Fetches the nav fragment. Metadata-independent dual fetch:
 * /content/nav.plain.html (local preview) first, then /nav.plain.html (DA/EDS).
 * @returns {Promise<Element|null>} wrapper holding the fragment sections
 */
async function fetchNav() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  const html = await resp.text();
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const wrapper = doc.body.firstElementChild;
  // resolve relative media paths against the fragment URL, not the current page
  wrapper.querySelectorAll('img[src], source[srcset]').forEach((el) => {
    const attr = el.hasAttribute('src') ? 'src' : 'srcset';
    const value = el.getAttribute(attr);
    if (value && !/^(https?:|data:|\/)/.test(value)) {
      el.setAttribute(attr, new URL(value, resp.url).pathname);
    }
  });
  return wrapper;
}

/**
 * Splits a list item into its label (text, inline images) and its nested list.
 * @param {Element} li list item
 * @returns {{label: Element, sub: Element|null}}
 */
function splitItem(li) {
  const sub = li.querySelector(':scope > ul');
  const label = document.createElement('span');
  label.className = 'nav-label';
  [...li.childNodes].forEach((node) => {
    if (node === sub) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        const span = document.createElement('span');
        span.className = 'nav-label-text';
        span.textContent = text;
        label.append(span);
      }
      node.remove();
    } else {
      label.append(node);
    }
  });
  li.prepend(label);
  return { label, sub };
}

function closeAll(nav, except) {
  nav.querySelectorAll('.nav-drop[aria-expanded="true"], .nav-has-children[aria-expanded="true"]').forEach((el) => {
    if (!except || (el !== except && !el.contains(except))) {
      el.setAttribute('aria-expanded', 'false');
    }
  });
  const anyOpen = nav.querySelector('.nav-sections .nav-drop[aria-expanded="true"]');
  document.body.classList.toggle('nav-overlay-active', isDesktop.matches && !!anyOpen);
}

/**
 * Builds a sub-panel: a panel wrapper with a back control (mobile) and the list.
 * @param {Element} sub nested list
 * @param {string} backLabel label of the parent item
 * @returns {Element} panel
 */
function buildPanel(sub, backLabel) {
  const panel = document.createElement('div');
  panel.className = 'nav-panel';
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'nav-back';
  back.textContent = backLabel;
  const inner = document.createElement('div');
  inner.className = 'nav-panel-inner';
  sub.parentElement.insertBefore(panel, sub);
  inner.append(sub);
  panel.append(back, inner);
  return panel;
}

/**
 * Decorates nested items inside a panel (an item with its own sub-list
 * gets a caret button that opens a second-level panel).
 */
function decorateNested(panel, nav) {
  panel.querySelectorAll(':scope .nav-panel-inner > ul > li').forEach((li) => {
    const sub = li.querySelector(':scope > ul');
    if (!sub) return;
    li.classList.add('nav-has-children');
    li.setAttribute('aria-expanded', 'false');
    const caret = document.createElement('button');
    caret.type = 'button';
    caret.className = 'nav-caret';
    caret.setAttribute('aria-label', 'Open submenu');
    const labelText = li.querySelector(':scope > a')?.textContent.trim() || '';
    li.insertBefore(caret, sub);
    const subPanel = buildPanel(sub, labelText);
    subPanel.classList.add('nav-subpanel');
    caret.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = li.getAttribute('aria-expanded') === 'true';
      li.parentElement.querySelectorAll(':scope > li[aria-expanded="true"]').forEach((o) => o.setAttribute('aria-expanded', 'false'));
      li.setAttribute('aria-expanded', open ? 'false' : 'true');
      caret.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
    subPanel.querySelector('.nav-back').addEventListener('click', (e) => {
      e.stopPropagation();
      li.setAttribute('aria-expanded', 'false');
    });
  });
  return nav;
}

/**
 * Decorates a list of top-level items: items with a nested list become
 * drop-downs (click on desktop for sections, hover for tools; slide-in on mobile).
 */
function decorateList(ul, nav, hoverOnDesktop) {
  [...ul.children].forEach((li) => {
    const { label, sub } = splitItem(li);
    if (!sub) return;
    li.classList.add('nav-drop');
    li.setAttribute('aria-expanded', 'false');
    // a tools panel holding plain text (not only links) stays inline in the mobile menu
    if (hoverOnDesktop && [...sub.children].some((item) => !item.querySelector('a, strong'))) {
      li.classList.add('nav-inline');
    }
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'nav-trigger';
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.append(...label.childNodes);
    label.replaceWith(trigger);
    const backLabel = trigger.textContent.trim() || trigger.querySelector('img')?.alt || '';
    const panel = buildPanel(sub, backLabel);
    decorateNested(panel, nav);

    const toggle = (force) => {
      const open = typeof force === 'boolean' ? force : li.getAttribute('aria-expanded') !== 'true';
      closeAll(nav, li);
      li.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!open) li.querySelectorAll('[aria-expanded="true"]').forEach((el) => el.setAttribute('aria-expanded', 'false'));
      closeAll(nav, open ? li : null);
    };
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (hoverOnDesktop && isDesktop.matches) return;
      toggle();
    });
    panel.querySelector(':scope > .nav-back').addEventListener('click', (e) => {
      e.stopPropagation();
      toggle(false);
    });
    if (hoverOnDesktop) {
      li.addEventListener('mouseenter', () => { if (isDesktop.matches) li.setAttribute('aria-expanded', 'true'); });
      li.addEventListener('mouseleave', () => { if (isDesktop.matches) li.setAttribute('aria-expanded', 'false'); });
    }
  });
}

function toggleMenu(nav, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  if (expanded) closeAll(nav, null);
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await fetchNav();
  block.textContent = '';
  if (!fragment) return;

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');
  const sections = [...fragment.children];
  const [brand, main, tools] = sections;
  if (brand) brand.className = 'nav-brand';
  if (main) main.className = 'nav-sections';
  if (tools) tools.className = 'nav-tools';

  const menu = document.createElement('div');
  menu.className = 'nav-menu';
  const menuMain = document.createElement('div');
  menuMain.className = 'nav-menu-main';
  menu.append(menuMain);
  if (main) menuMain.append(main);
  if (tools) menuMain.append(tools);
  if (brand) nav.append(brand);
  nav.append(menu);

  if (main) main.querySelectorAll(':scope > ul').forEach((ul) => decorateList(ul, nav, false));
  if (tools) {
    tools.querySelectorAll(':scope > ul').forEach((ul) => decorateList(ul, nav, true));
    tools.querySelectorAll(':scope > p > a').forEach((a) => {
      a.className = 'nav-cta';
      a.parentElement.className = 'nav-cta-wrapper';
    });
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation" aria-expanded="false">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.querySelector('button').addEventListener('click', () => toggleMenu(nav));
  nav.append(hamburger);
  nav.setAttribute('aria-expanded', 'false');

  // page overlay shown while a desktop panel is open
  const overlay = document.createElement('div');
  overlay.className = 'nav-overlay';
  overlay.addEventListener('click', () => closeAll(nav, null));

  // close panels on outside click and escape
  document.addEventListener('click', (e) => {
    if (isDesktop.matches && !nav.contains(e.target)) closeAll(nav, null);
  });
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    closeAll(nav, null);
    if (!isDesktop.matches && nav.getAttribute('aria-expanded') === 'true') toggleMenu(nav, false);
  });

  // reset state when crossing the desktop breakpoint
  isDesktop.addEventListener('change', () => {
    closeAll(nav, null);
    toggleMenu(nav, false);
    document.body.classList.remove('nav-overlay-active');
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper, overlay);
}
