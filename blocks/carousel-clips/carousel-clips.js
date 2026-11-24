import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const BLOCK = 'carousel-clips';

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?.*)?$/i;

/**
 * Replace a link to a video file in the media cell with an inline, muted, looping player.
 * @param {Element} cell media cell
 */
function decorateVideo(cell) {
  const link = [...cell.querySelectorAll('a[href]')].find((a) => VIDEO_EXT.test(a.href));
  if (!link) return;
  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('preload', 'metadata');
  const poster = cell.querySelector('picture img');
  if (poster) video.poster = poster.src;
  const source = document.createElement('source');
  source.src = link.href;
  source.type = `video/${new URL(link.href).pathname.split('.').pop().toLowerCase()}`;
  video.append(source);
  cell.replaceChildren(video);
  cell.classList.add(`${BLOCK}-slide-video`);

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      });
    }, { threshold: 0.5 });
    observer.observe(video);
  }
}

function updateActiveSlide(block, slide) {
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  block.querySelectorAll(`.${BLOCK}-slide`).forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
    aSlide.querySelectorAll('a, button, video').forEach((el) => {
      if (idx !== slideIndex) el.setAttribute('tabindex', '-1');
      else el.removeAttribute('tabindex');
    });
  });

  const indicators = block.querySelectorAll(`.${BLOCK}-slide-indicator button`);
  indicators.forEach((button, idx) => {
    if (idx === slideIndex) button.setAttribute('disabled', 'true');
    else button.removeAttribute('disabled');
  });

  // like the source slider, arrows stop at the first and last clip
  const prev = block.querySelector(`.${BLOCK}-prev`);
  const next = block.querySelector(`.${BLOCK}-next`);
  if (prev) prev.disabled = slideIndex === 0;
  if (next) next.disabled = slideIndex === indicators.length - 1;
}

function showSlide(block, slideIndex = 0, behavior = 'smooth') {
  const slides = block.querySelectorAll(`.${BLOCK}-slide`);
  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  const activeSlide = slides[realSlideIndex];
  block.querySelector(`.${BLOCK}-slides`).scrollTo({
    top: 0,
    left: activeSlide.offsetLeft,
    behavior,
  });
}

function bindEvents(block) {
  block.querySelectorAll(`.${BLOCK}-slide-indicator button`).forEach((button) => {
    button.addEventListener('click', (e) => {
      const indicator = e.currentTarget.parentElement;
      showSlide(block, parseInt(indicator.dataset.targetSlide, 10));
    });
  });
  block.querySelector(`.${BLOCK}-prev`).addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
  });
  block.querySelector(`.${BLOCK}-next`).addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
  });

  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) updateActiveSlide(block, entry.target);
    });
  }, { threshold: 0.5 });
  block.querySelectorAll(`.${BLOCK}-slide`).forEach((slide) => slideObserver.observe(slide));
}

function createSlide(row, slideIndex, id) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.id = `${BLOCK}-${id}-slide-${slideIndex}`;
  slide.className = `${BLOCK}-slide`;

  [...row.children].forEach((column, colIdx) => {
    const isMedia = colIdx === 0 && row.children.length > 1;
    column.className = `${BLOCK}-slide-${isMedia ? 'media' : 'content'}`;
    slide.append(column);
  });
  const media = slide.querySelector(`.${BLOCK}-slide-media`);
  if (media) decorateVideo(media);

  const heading = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading && heading.id) slide.setAttribute('aria-labelledby', heading.id);
  return slide;
}

let carouselId = 0;

/**
 * Each row is one slide: [media] [content].
 * @param {Element} block The block element
 */
export default function decorate(block) {
  carouselId += 1;
  block.id = `${BLOCK}-${carouselId}`;
  const rows = [...block.querySelectorAll(':scope > div')];
  const isSingleSlide = rows.length < 2;
  if (isSingleSlide) block.classList.add(`${BLOCK}-single`);

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const container = document.createElement('div');
  container.className = `${BLOCK}-slides-container`;

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.className = `${BLOCK}-slides`;

  let slideIndicators;
  if (!isSingleSlide) {
    const indicatorsNav = document.createElement('nav');
    indicatorsNav.setAttribute('aria-label', 'Carousel Slide Controls');
    slideIndicators = document.createElement('ol');
    slideIndicators.className = `${BLOCK}-slide-indicators`;
    indicatorsNav.append(slideIndicators);
    block.append(indicatorsNav);

    const navButtons = document.createElement('div');
    navButtons.className = `${BLOCK}-navigation-buttons`;
    navButtons.innerHTML = `
      <button type="button" class="${BLOCK}-prev" aria-label="Previous Slide"></button>
      <button type="button" class="${BLOCK}-next" aria-label="Next Slide"></button>`;
    container.append(navButtons);
  }

  rows.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId);
    moveInstrumentation(row, slide);
    slidesWrapper.append(slide);

    if (slideIndicators) {
      const indicator = document.createElement('li');
      indicator.className = `${BLOCK}-slide-indicator`;
      indicator.dataset.targetSlide = idx;
      indicator.innerHTML = `<button type="button" aria-label="Show Slide ${idx + 1} of ${rows.length}"></button>`;
      slideIndicators.append(indicator);
    }
    row.remove();
  });

  slidesWrapper.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  container.append(slidesWrapper);
  block.prepend(container);

  if (!isSingleSlide) {
    block.dataset.activeSlide = 0;
    bindEvents(block);
  }
}
