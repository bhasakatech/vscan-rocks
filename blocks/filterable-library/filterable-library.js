import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const BLOCK = 'filterable-library';
const PAGE_SIZE = 7;
const VIDEO_RE = /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i;

const LABELS = {
  en: {
    prev: 'Previous', next: 'Next', of: 'of', filter: 'Filter', play: 'Play', pause: 'Pause',
  },
  de: {
    prev: 'Vorige', next: 'Nächste', of: 'von', filter: 'Filter', play: 'Abspielen', pause: 'Pausieren',
  },
  fr: {
    prev: 'Précédent', next: 'Suivant', of: 'sur', filter: 'Filtrer', play: 'Lire', pause: 'Pause',
  },
  es: {
    prev: 'Anterior', next: 'Siguiente', of: 'de', filter: 'Filtrar', play: 'Reproducir', pause: 'Pausa',
  },
  it: {
    prev: 'Precedente', next: 'Avanti', of: 'di', filter: 'Filtra', play: 'Riproduci', pause: 'Pausa',
  },
  pt: {
    prev: 'Anterior', next: 'Próximo', of: 'de', filter: 'Filtrar', play: 'Reproduzir', pause: 'Pausa',
  },
};

let instance = 0;

function getLabels() {
  const [, fromPath] = window.location.pathname.match(/^\/(?:content\/)?([a-z]{2})(?:\/|$)/) || [];
  const lang = (fromPath || document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
  return LABELS[lang] || LABELS.en;
}

function optimizePictures(root) {
  root.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
}

const parseTags = (text) => text.split(/[,;\n]/).map((t) => t.trim()).filter(Boolean);

let videoObserver;
function lazyLoadVideo(video) {
  if (!('IntersectionObserver' in window)) {
    video.src = video.dataset.src;
    return;
  }
  if (!videoObserver) {
    videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.src = entry.target.dataset.src;
        videoObserver.unobserve(entry.target);
      });
    }, { rootMargin: '200px' });
  }
  videoObserver.observe(video);
}

/**
 * Builds a muted, lazily loaded video tile that plays inline on click.
 * @param {string} href video url
 * @param {string} title accessible title
 * @param {object} labels ui labels
 * @returns {Element} button
 */
function buildVideoTile(href, title, labels) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `${BLOCK}-item-media ${BLOCK}-item-video`;
  button.setAttribute('aria-label', `${labels.play}: ${title}`);

  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.dataset.src = `${href.split('#')[0]}#t=0.001`;
  video.setAttribute('aria-hidden', 'true');
  lazyLoadVideo(video);

  const icon = document.createElement('img');
  icon.src = `${window.hlx?.codeBasePath || ''}/icons/play-button.svg`;
  icon.alt = '';
  icon.width = 56;
  icon.height = 56;
  icon.loading = 'lazy';
  icon.className = `${BLOCK}-play`;

  button.append(video, icon);
  button.addEventListener('click', () => {
    if (!video.src) video.src = video.dataset.src;
    if (video.paused) {
      video.muted = false;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
  video.addEventListener('play', () => {
    button.classList.add('is-playing');
    button.setAttribute('aria-label', `${labels.pause}: ${title}`);
  });
  video.addEventListener('pause', () => {
    button.classList.remove('is-playing');
    button.setAttribute('aria-label', `${labels.play}: ${title}`);
  });
  return button;
}

/**
 * Build one library item from an authored row: [image] [text: title link, description] [tags].
 * The title link moves onto the media (image link or inline video tile), labelled by the title.
 * @param {Element} row authored row
 * @param {object} labels ui labels
 * @returns {{ li: Element, tags: string[] }}
 */
function buildItem(row, labels) {
  const li = document.createElement('li');
  li.className = `${BLOCK}-item`;
  moveInstrumentation(row, li);

  const cells = [...row.children];
  let tags = [];
  // the last text-only cell without links or headings holds the tags
  const tagCell = cells.length > 2 ? cells[cells.length - 1] : null;
  if (tagCell && !tagCell.querySelector('a, picture, h1, h2, h3, h4, h5, h6')) {
    tags = parseTags(tagCell.textContent);
    tagCell.remove();
  }

  let imageCell;
  let body;
  [...row.children].forEach((cell) => {
    const hasPicture = cell.querySelector('picture');
    if (hasPicture && cell.textContent.trim() === '' && !imageCell) {
      imageCell = cell;
    } else if (cell.textContent.trim() !== '' || hasPicture) {
      if (body) {
        body.append(...cell.childNodes);
      } else {
        body = cell;
        body.className = `${BLOCK}-item-body`;
      }
    }
  });

  li.querySelectorAll('a.button').forEach((a) => a.classList.remove('button'));
  if (body) {
    body.querySelectorAll('.button-container').forEach((p) => p.classList.remove('button-container'));
  }

  const titleLink = body?.querySelector('h1 a[href], h2 a[href], h3 a[href], h4 a[href], h5 a[href], h6 a[href]');
  const heading = titleLink?.closest('h1, h2, h3, h4, h5, h6');
  let media;
  if (titleLink) {
    const { href } = titleLink;
    const title = titleLink.textContent.trim();
    if (!heading.id) heading.id = `${BLOCK}-${instance}-title-${Math.random().toString(36).slice(2, 8)}`;
    if (imageCell) {
      media = document.createElement('a');
      media.className = `${BLOCK}-item-media`;
      media.href = href;
      media.setAttribute('aria-labelledby', heading.id);
      media.append(...imageCell.querySelectorAll('picture'));
    } else if (VIDEO_RE.test(new URL(href, window.location.href).pathname)) {
      media = buildVideoTile(href, title, labels);
    }
    if (media) titleLink.replaceWith(...titleLink.childNodes);
  } else if (imageCell) {
    media = document.createElement('div');
    media.className = `${BLOCK}-item-media`;
    media.append(...imageCell.querySelectorAll('picture'));
  }

  if (media) {
    li.classList.add(`${BLOCK}-item-linked`);
    li.append(media);
  }
  if (body) li.append(body);
  li.dataset.tags = JSON.stringify(tags);
  return { li, tags };
}

function buildFilters(title, tags, id, onChange) {
  const form = document.createElement('form');
  form.className = `${BLOCK}-filters`;
  form.id = `${BLOCK}-${id}-filters`;
  form.setAttribute('role', 'group');
  form.addEventListener('submit', (e) => e.preventDefault());

  const heading = document.createElement('div');
  heading.className = `${BLOCK}-filters-title`;
  heading.id = `${BLOCK}-${id}-filters-title`;
  heading.textContent = title || 'Filter';
  form.setAttribute('aria-labelledby', heading.id);
  form.append(heading);

  tags.forEach((tag, idx) => {
    const label = document.createElement('label');
    label.className = `${BLOCK}-filter`;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `${BLOCK}-${id}-filter-${idx}`;
    input.value = tag;
    input.addEventListener('change', onChange);
    label.htmlFor = input.id;
    const mark = document.createElement('span');
    mark.className = `${BLOCK}-checkmark`;
    mark.setAttribute('aria-hidden', 'true');
    label.append(input, document.createTextNode(tag), mark);
    form.append(label);
  });

  return form;
}

function buildFilterToggle(form, labels) {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = `${BLOCK}-filter-toggle`;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', form.id);
  const icon = document.createElement('img');
  icon.src = `${window.hlx?.codeBasePath || ''}/icons/filter.svg`;
  icon.alt = '';
  icon.width = 14;
  icon.height = 17;
  toggle.append(icon, document.createTextNode(labels.filter));
  toggle.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', String(toggle.getAttribute('aria-expanded') !== 'true'));
  });
  return toggle;
}

function buildPagination(pages, current, labels, goTo) {
  const nav = document.createElement('nav');
  nav.className = `${BLOCK}-pagination`;
  nav.setAttribute('aria-label', 'Pagination');
  if (pages <= 1) return nav;

  const button = (text, page, { disabled = false, active = false, cls = '' } = {}) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    if (cls) b.className = cls;
    b.disabled = disabled;
    if (active) b.setAttribute('aria-current', 'page');
    b.addEventListener('click', () => goTo(page));
    return b;
  };

  nav.append(button(labels.prev, current - 1, { disabled: current === 0, cls: `${BLOCK}-page-prev` }));
  for (let p = 0; p < pages; p += 1) {
    nav.append(button(String(p + 1), p, { active: p === current, cls: `${BLOCK}-page` }));
  }
  nav.append(button(labels.next, current + 1, { disabled: current === pages - 1, cls: `${BLOCK}-page-next` }));
  return nav;
}

/**
 * Filterable library: a sidebar of checkbox filters and a grid of linked items.
 * Rows: optional single-cell config row(s) (filter title), then one row per item:
 * [image] [text] [tags, comma separated]. Items without an image whose title links to a
 * video render as an inline, lazily loaded video tile.
 * Options: featured-grid-pagination (first result spans the grid, results paginated).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  instance += 1;
  const labels = getLabels();
  const rows = [...block.children];
  const configRows = [];
  const itemRows = [];
  rows.forEach((row) => {
    const isConfig = itemRows.length === 0 && row.children.length === 1
      && !row.querySelector('picture, a[href]');
    (isConfig ? configRows : itemRows).push(row);
  });
  const filterTitle = configRows.map((r) => r.textContent.trim()).find(Boolean) || '';

  const items = itemRows.map((row) => buildItem(row, labels));
  const allTags = [...new Set(items.flatMap((i) => i.tags))];
  const paginate = block.classList.contains('featured-grid-pagination');
  const pageSize = PAGE_SIZE;

  const results = document.createElement('ul');
  results.className = `${BLOCK}-results`;
  const pagination = document.createElement('div');
  pagination.className = `${BLOCK}-pagination-wrapper`;
  const count = document.createElement('div');
  count.className = `${BLOCK}-count`;
  count.setAttribute('aria-live', 'polite');

  let page = 0;
  let filtered = items;

  const render = () => {
    const pages = paginate ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;
    page = Math.min(page, pages - 1);
    const start = paginate ? page * pageSize : 0;
    const visible = paginate ? filtered.slice(start, start + pageSize) : filtered;
    items.forEach(({ li }) => li.classList.remove(`${BLOCK}-item-featured`));
    if (paginate && visible[0]) visible[0].li.classList.add(`${BLOCK}-item-featured`);
    results.replaceChildren(...visible.map((i) => i.li));
    block.classList.toggle(`${BLOCK}-empty`, filtered.length === 0);
    if (paginate) {
      pagination.replaceChildren(buildPagination(pages, page, labels, (p) => {
        page = p;
        render();
        block.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }));
      count.textContent = filtered.length
        ? `${start + 1} - ${start + visible.length} ${labels.of} ${filtered.length}`
        : '';
    }
  };

  const onFilterChange = () => {
    const checked = [...block.querySelectorAll(`.${BLOCK}-filters input:checked`)].map((i) => i.value);
    filtered = checked.length
      ? items.filter((i) => i.tags.some((t) => checked.includes(t)))
      : items;
    page = 0;
    render();
  };

  const layout = document.createElement('div');
  layout.className = `${BLOCK}-layout`;
  if (allTags.length) {
    const form = buildFilters(filterTitle, allTags, instance, onFilterChange);
    layout.append(buildFilterToggle(form, labels), form);
  } else {
    block.classList.add(`${BLOCK}-no-filters`);
  }
  const main = document.createElement('div');
  main.className = `${BLOCK}-main`;
  main.append(results);
  if (paginate) main.append(pagination, count);
  layout.append(main);

  items.forEach(({ li }) => optimizePictures(li));
  block.replaceChildren(layout);
  render();
}
