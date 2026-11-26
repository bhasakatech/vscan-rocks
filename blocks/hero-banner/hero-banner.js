import { createOptimizedPicture } from '../../scripts/aem.js';

const isPictureOnly = (row) => !!row.querySelector('picture') && row.textContent.trim() === '';

/**
 * Rows: [background image], [text: eyebrow, heading, copy, CTAs], [badge image] (badge-column).
 * Options: badge-column (an award badge sits in its own column next to the text).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const pictureRows = rows.filter(isPictureOnly);
  const textRow = rows.find((row) => !isPictureOnly(row) && row.textContent.trim() !== '');

  rows.forEach((row) => {
    if (!isPictureOnly(row) && row !== textRow) row.remove();
  });

  const [mediaRow, badgeRow] = pictureRows;
  if (mediaRow) mediaRow.className = 'hero-banner-media';
  if (textRow) textRow.className = 'hero-banner-content';
  if (badgeRow) {
    badgeRow.className = 'hero-banner-badge';
    if (!block.classList.contains('badge-column')) block.classList.add('hero-banner-with-badge');
  }
  pictureRows.slice(2).forEach((row) => row.remove());

  if (!mediaRow) block.classList.add('hero-banner-no-image');

  // product card (source #probes .solutionsRight): a sub-heading (h3) instead of the page or
  // section heading, under the section's own intro
  if (textRow && !textRow.querySelector('h1, h2') && textRow.querySelector('h3')) {
    block.classList.add('hero-banner-card');
  }

  block.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    const isMedia = mediaRow && mediaRow.contains(img);
    const eager = isMedia && !block.classList.contains('hero-banner-card');
    const pic = createOptimizedPicture(img.src, img.alt, eager, [
      { media: '(min-width: 900px)', width: '2000' },
      { width: '900' },
    ]);
    img.closest('picture').replaceWith(pic);
  });
}
