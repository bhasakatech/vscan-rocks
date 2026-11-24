// media query that switches the footer link groups from accordions to static columns
const isDesktop = window.matchMedia('(width >= 900px)');

/**
 * Fetches the footer fragment. Metadata-independent dual fetch:
 * /content/footer.plain.html (local preview) first, then /footer.plain.html (DA/EDS).
 * @returns {Promise<Element|null>} wrapper holding the fragment sections
 */
async function fetchFooter() {
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  const html = await resp.text();
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const wrapper = doc.body.firstElementChild;
  // resolve relative media paths against the fragment URL, not the current page
  wrapper.querySelectorAll('img[src]').forEach((img) => {
    const value = img.getAttribute('src');
    if (value && !/^(https?:|data:|\/)/.test(value)) {
      img.setAttribute('src', new URL(value, resp.url).pathname);
    }
  });
  return wrapper;
}

/**
 * Opens links to other sites in a new tab, as the source footer does.
 * @param {Element} root container to scan
 */
function decorateExternalLinks(root) {
  root.querySelectorAll('a[href]').forEach((a) => {
    const url = new URL(a.href, window.location.href);
    if (/^https?:$/.test(url.protocol) && url.hostname !== window.location.hostname) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  });
}

/**
 * Turns a section of "heading + list" pairs into link groups.
 * On mobile each heading toggles its list (several can be open); on desktop all lists show.
 * @param {Element} section fragment section
 * @returns {Element} link group container
 */
function buildLinkGroups(section) {
  const groups = document.createElement('div');
  groups.className = 'footer-groups';
  let group = null;
  [...section.children].forEach((child) => {
    if (/^H[1-6]$/.test(child.tagName)) {
      group = document.createElement('div');
      group.className = 'footer-group';
      const heading = document.createElement('h2');
      heading.className = 'footer-group-heading';
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'footer-group-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = child.textContent.trim();
      heading.append(toggle);
      group.append(heading);
      groups.append(group);
    } else if (group) {
      if (child.tagName === 'UL') child.classList.add('footer-group-list');
      group.append(child);
    }
  });
  groups.querySelectorAll('.footer-group').forEach((g, i) => {
    const toggle = g.querySelector('.footer-group-toggle');
    const list = g.querySelector('.footer-group-list');
    if (!list) return;
    list.id = `footer-group-list-${i}`;
    toggle.setAttribute('aria-controls', list.id);
    toggle.addEventListener('click', () => {
      if (isDesktop.matches) return;
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      g.classList.toggle('is-open', !open);
    });
  });
  return groups;
}

/**
 * Builds the row holding the locale trigger and the image-only (social) link list.
 * @param {Element} section fragment section
 * @returns {Element} utility row
 */
function buildUtilityRow(section) {
  const row = document.createElement('div');
  row.className = 'footer-utility';
  [...section.children].forEach((child) => {
    if (child.tagName === 'UL') {
      child.className = 'footer-social';
      child.querySelectorAll('a').forEach((a) => {
        const img = a.querySelector('img');
        if (img && !a.getAttribute('aria-label')) a.setAttribute('aria-label', img.alt);
      });
    } else {
      child.classList.add('footer-locale');
    }
    row.append(child);
  });
  return row;
}

/**
 * Builds the bottom band: legal link list and disclaimer copy.
 * @param {Element} section fragment section
 * @returns {Element} legal band
 */
function buildLegalBand(section) {
  const band = document.createElement('div');
  band.className = 'footer-legal';
  [...section.children].forEach((child) => {
    child.classList.add(child.tagName === 'UL' ? 'footer-legal-links' : 'footer-disclaimer');
    band.append(child);
  });
  return band;
}

/**
 * Picks a builder for a fragment section from its content.
 * @param {Element} section fragment section
 * @returns {Element} decorated section
 */
function buildSection(section) {
  if (section.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > h4')) {
    return buildLinkGroups(section);
  }
  const lists = [...section.querySelectorAll(':scope > ul')];
  const imageOnly = lists.length > 0 && lists.every((ul) => [...ul.querySelectorAll('a')]
    .every((a) => a.querySelector('img') && !a.textContent.trim()));
  if (imageOnly) return buildUtilityRow(section);
  return buildLegalBand(section);
}

/**
 * Resets accordion state when crossing the desktop breakpoint.
 * @param {Element} block footer block
 */
function resetGroups(block) {
  block.querySelectorAll('.footer-group').forEach((g) => {
    g.classList.remove('is-open');
    const toggle = g.querySelector('.footer-group-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', isDesktop.matches ? 'true' : 'false');
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const fragment = await fetchFooter();
  block.textContent = '';
  if (!fragment) return;

  const footer = document.createElement('div');
  footer.className = 'footer-inner';
  const sections = [...fragment.children].filter((el) => el.tagName === 'DIV');
  const top = document.createElement('div');
  top.className = 'footer-top';
  sections.forEach((section) => {
    const built = buildSection(section);
    if (built.classList.contains('footer-legal')) {
      footer.append(top, built);
    } else {
      top.append(built);
    }
  });
  if (!top.parentElement) footer.append(top);

  decorateExternalLinks(footer);
  block.append(footer);
  resetGroups(block);
  isDesktop.addEventListener('change', () => resetGroups(block));
}
