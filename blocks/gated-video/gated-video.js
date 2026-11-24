import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Gated video teaser: a blurred poster with a heading, copy and an "Access Content"
 * call to action that leads to the registration form.
 * Rows: [poster image], [text: heading, copy, CTA link].
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const posterRow = rows.find((row) => row.querySelector('picture') && row.textContent.trim() === '');
  const textRow = rows.find((row) => row !== posterRow && row.textContent.trim() !== '');

  const poster = document.createElement('div');
  poster.className = 'gated-video-poster';
  const pic = posterRow?.querySelector('picture');
  if (pic) {
    const img = pic.querySelector('img');
    const url = new URL(img.src, window.location.href);
    if (url.origin === window.location.origin && !/\.svg$/i.test(url.pathname)) {
      poster.append(createOptimizedPicture(img.src, img.alt, false, [{ width: '1200' }]));
    } else {
      poster.append(pic);
    }
  }

  const overlay = document.createElement('div');
  overlay.className = 'gated-video-overlay';
  if (textRow) {
    const cell = textRow.querySelector(':scope > div') || textRow;
    overlay.append(...cell.childNodes);
  }
  overlay.querySelectorAll('a[href]').forEach((a) => a.classList.add('gated-video-cta'));

  block.replaceChildren(poster, overlay);
}
