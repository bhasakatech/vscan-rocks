import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const BLOCK = 'cards-publications';

function optimizePictures(root) {
  root.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
}

function addScroller(block, list) {
  const nav = document.createElement('div');
  nav.className = `${BLOCK}-nav`;
  nav.innerHTML = `
    <button type="button" class="${BLOCK}-prev" aria-label="Previous"></button>
    <button type="button" class="${BLOCK}-next" aria-label="Next"></button>`;
  const [prev, next] = nav.querySelectorAll('button');
  const step = () => Math.max(list.clientWidth * 0.8, 200);
  prev.addEventListener('click', () => list.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => list.scrollBy({ left: step(), behavior: 'smooth' }));

  const update = () => {
    const max = list.scrollWidth - list.clientWidth;
    block.classList.toggle(`${BLOCK}-overflowing`, max > 1);
    prev.disabled = list.scrollLeft <= 1;
    next.disabled = list.scrollLeft >= max - 1;
  };
  list.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(list);
  block.append(nav);
  update();
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
    // name the text parts: authors (before the title link), title, institution
    const body = li.querySelector(`.${BLOCK}-card-body`);
    const links = li.querySelectorAll('a[href]');
    const titleP = links.length === 1 ? links[0].closest(`.${BLOCK}-card-body > *`) : null;
    if (body && titleP) {
      titleP.classList.add(`${BLOCK}-card-title`);
      let prev = titleP.previousElementSibling;
      while (prev) {
        prev.classList.add(`${BLOCK}-card-eyebrow`);
        prev = prev.previousElementSibling;
      }
    }
    // whole card is the link (source: a.inner wraps authors, title and institution)
    if (links.length === 1) {
      const [link] = links;
      const card = document.createElement('a');
      card.className = `${BLOCK}-card-link`;
      card.href = link.getAttribute('href');
      if (link.title) card.title = link.title;
      if (link.target) card.target = link.target;
      else if (new URL(card.href, window.location.href).origin !== window.location.origin) {
        card.target = '_blank';
      }
      if (card.target === '_blank') card.rel = 'noopener';
      link.classList.remove('button');
      link.closest('.button-container')?.classList.remove('button-container');
      link.replaceWith(...link.childNodes);
      // keep the parts separated in the link's text (accessible name, as on the source)
      body?.querySelectorAll(':scope > * + *').forEach((el) => el.before('\n'));
      card.append(...li.childNodes);
      li.append(card);
      li.classList.add(`${BLOCK}-card-linked`);
    }
    ul.append(li);
  });
  optimizePictures(ul);
  block.replaceChildren(ul);
  addScroller(block, ul);
}
