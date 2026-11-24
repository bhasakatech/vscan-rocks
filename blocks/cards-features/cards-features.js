import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const BLOCK = 'cards-features';

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
  const icon = `<img src="${window.hlx?.codeBasePath || ''}/icons/caret-right.svg" alt="" aria-hidden="true" width="24" height="24">`;
  nav.innerHTML = `
    <button type="button" class="${BLOCK}-prev" aria-label="Previous">${icon}</button>
    <button type="button" class="${BLOCK}-next" aria-label="Next">${icon}</button>`;
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
 * When the card body holds exactly one link, the whole card becomes that link
 * (as on the source); the link's text stays in place as plain content.
 * @param {Element} li The card
 */
function linkCard(li) {
  const body = li.querySelector(`.${BLOCK}-card-body`);
  const links = body ? body.querySelectorAll('a[href]') : [];
  if (links.length !== 1) return;
  const [link] = links;
  const cardLink = document.createElement('a');
  cardLink.className = `${BLOCK}-card-link`;
  cardLink.href = link.getAttribute('href');
  if (link.title) cardLink.title = link.title;
  if (link.target) cardLink.target = link.target;
  link.replaceWith(...link.childNodes);
  const container = body.querySelector('.button-container');
  if (container && !container.textContent.trim()) container.remove();
  // keep words of adjacent blocks apart in the link's accessible name
  [...body.children].slice(1).forEach((el) => el.before(' '));
  while (li.firstChild) cardLink.append(li.firstChild);
  li.append(cardLink);
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
    linkCard(li);
    ul.append(li);
  });
  optimizePictures(ul);
  block.replaceChildren(ul);
  addScroller(block, ul);
}
