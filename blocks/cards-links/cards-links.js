import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const BLOCK = 'cards-links';
const PAGE_SIZE = 12;

/* pagination labels as on the source (.paginationBox) per locale path prefix */
const LABELS = {
  en: { prev: 'Previous', next: 'Next', nav: 'Pagination' },
  de: { prev: 'Vorige', next: 'Nächste', nav: 'Seitennavigation' },
  fr: { prev: 'Précédent', next: 'Suivant', nav: 'Pagination' },
  es: { prev: 'Anterior', next: 'Siguiente', nav: 'Paginación' },
  it: { prev: 'Precedente', next: 'Avanti', nav: 'Paginazione' },
  pt: { prev: 'Anterior', next: 'Próximo', nav: 'Paginação' },
};

function getLabels() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const locale = segments.find((s) => LABELS[s]) || document.documentElement.lang?.slice(0, 2);
  return LABELS[locale] || LABELS.en;
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

/* a card that is nothing but one button link (source category selector chip) */
function isButtonOnly(card) {
  const body = card.querySelector(`.${BLOCK}-card-body`);
  if (!body || card.children.length !== 1) return false;
  const links = body.querySelectorAll('a');
  return links.length === 1 && links[0].classList.contains('button')
    && body.textContent.trim() === links[0].textContent.trim();
}

/**
 * Client-side pagination of the cards, PAGE_SIZE per page, synced with ?page=N.
 * @param {Element} block The block element
 * @param {Element[]} cards The cards to paginate
 */
function paginate(block, cards) {
  const pages = Math.ceil(cards.length / PAGE_SIZE);
  const labels = getLabels();
  const nav = document.createElement('nav');
  nav.className = `${BLOCK}-pagination`;
  nav.setAttribute('aria-label', labels.nav);
  const list = document.createElement('ul');
  nav.append(list);

  const pageHref = (n) => {
    const url = new URL(window.location.href);
    if (n === 1) url.searchParams.delete('page');
    else url.searchParams.set('page', n);
    return `${url.pathname}${url.search}`;
  };

  const makeItem = (text, page, extraClass) => {
    const li = document.createElement('li');
    if (extraClass) li.className = extraClass;
    const a = document.createElement('a');
    a.textContent = text;
    a.dataset.page = page;
    li.append(a);
    list.append(li);
    return a;
  };

  const prev = makeItem(labels.prev, 0, `${BLOCK}-pagination-prev`);
  const numbers = [...Array(pages).keys()].map((i) => makeItem(String(i + 1), i + 1));
  const next = makeItem(labels.next, 0, `${BLOCK}-pagination-next`);

  const setLink = (a, page, current) => {
    a.dataset.page = page;
    if (page < 1 || page > pages || current) {
      a.removeAttribute('href');
      if (!current) a.setAttribute('aria-disabled', 'true');
    } else {
      a.href = pageHref(page);
      a.removeAttribute('aria-disabled');
    }
  };

  const show = (requested) => {
    const page = Math.min(Math.max(requested, 1), pages);
    cards.forEach((card, i) => {
      card.hidden = Math.floor(i / PAGE_SIZE) + 1 !== page;
    });
    numbers.forEach((a, i) => {
      const current = i + 1 === page;
      setLink(a, i + 1, current);
      if (current) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
      a.parentElement.classList.toggle('active', current);
    });
    setLink(prev, page - 1);
    setLink(next, page + 1);
  };

  const pageFromUrl = () => parseInt(new URLSearchParams(window.location.search).get('page'), 10) || 1;

  nav.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    e.preventDefault();
    const page = Number(a.dataset.page);
    window.history.pushState({}, '', pageHref(page));
    show(page);
    block.scrollIntoView({ block: 'start' });
  });
  window.addEventListener('popstate', () => show(pageFromUrl()));

  block.append(nav);
  show(pageFromUrl());
}

/**
 * Each row is one card: [image] [text]. Either cell may be missing.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  ul.className = `${BLOCK}-list`;
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = `${BLOCK}-card`;
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = `${BLOCK}-card-image`;
      } else if (!div.textContent.trim() && !div.querySelector('picture, img')) {
        div.remove();
      } else {
        div.className = `${BLOCK}-card-body`;
      }
    });
    if (!li.querySelector(`.${BLOCK}-card-image`)) li.classList.add(`${BLOCK}-card-text-only`);
    ul.append(li);
  });
  optimizePictures(ul);
  block.replaceChildren(ul);

  const cards = [...ul.children];
  if (!cards.length || block.classList.contains('alt')) return;
  if (cards.some((card) => card.querySelector(`.${BLOCK}-card-image`))) return;
  block.classList.add('text-only');

  /* category chips (source #publicationsSelector): three or more single-button items;
     a pair of buttons keeps the button-pair look */
  if (cards.length > 2 && cards.every(isButtonOnly)) {
    block.classList.add('chips');
    return;
  }

  /* publication cards (source .grid.publications): every text card carries a heading */
  if (cards.every((card) => card.querySelector('h2, h3, h4, h5, h6'))) {
    block.classList.add('headed');
    if (cards.length > PAGE_SIZE) paginate(block, cards);
  }
}
