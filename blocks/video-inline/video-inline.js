/*
 * Video Inline Block
 * Native video player (or YouTube / Vimeo) with an optional poster image.
 * Options: dark (dark frame with play-button overlay), autoplay (muted background loop).
 * Default: native player with controls and poster, rounded corners.
 */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function iframeWrapper(src, title) {
  const wrapper = document.createElement('div');
  wrapper.className = 'video-inline-frame';
  wrapper.innerHTML = `<iframe src="${src}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
    allowfullscreen="" scrolling="no" title="${title}" loading="lazy"></iframe>`;
  return wrapper;
}

function embedYoutube(url, autoplay, background) {
  const usp = new URLSearchParams(url.search);
  let vid = usp.get('v') ? encodeURIComponent(usp.get('v')) : '';
  if (url.origin.includes('youtu.be')) [, vid] = url.pathname.split('/');
  const params = new URLSearchParams({ rel: '0' });
  if (autoplay) params.set('autoplay', '1');
  if (background) {
    params.set('mute', '1');
    params.set('controls', '0');
    params.set('loop', '1');
    params.set('playsinline', '1');
  }
  const src = vid ? `https://www.youtube.com/embed/${vid}?${params}` : `https://www.youtube.com${url.pathname}`;
  return iframeWrapper(src, 'Content from Youtube');
}

function embedVimeo(url, autoplay, background) {
  const [, video] = url.pathname.split('/');
  const params = new URLSearchParams();
  if (autoplay) params.set('autoplay', '1');
  if (background) params.set('background', '1');
  const query = params.toString() ? `?${params}` : '';
  return iframeWrapper(`https://player.vimeo.com/video/${video}${query}`, 'Content from Vimeo');
}

function getVideoElement(source, autoplay, background, poster) {
  const video = document.createElement('video');
  video.setAttribute('controls', '');
  video.setAttribute('preload', 'metadata');
  if (poster) video.setAttribute('poster', poster);
  if (autoplay) video.setAttribute('autoplay', '');
  if (background) {
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.removeAttribute('controls');
    video.muted = true;
  }
  const sourceEl = document.createElement('source');
  sourceEl.setAttribute('src', source);
  const ext = new URL(source, window.location.href).pathname.split('.').pop().toLowerCase();
  if (['mp4', 'webm', 'ogg'].includes(ext)) sourceEl.setAttribute('type', `video/${ext}`);
  video.append(sourceEl);
  return video;
}

/**
 * Native player frame: the video without controls plus a play button overlay;
 * native controls take over once playback starts.
 */
function nativePlayer(video, title) {
  const player = document.createElement('div');
  player.className = 'video-inline-player';
  if (title) video.setAttribute('title', title);
  video.removeAttribute('controls');
  video.setAttribute('playsinline', '');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'video-inline-play';
  const icon = document.createElement('img');
  icon.src = `${window.hlx?.codeBasePath || ''}/icons/play-button.svg`;
  icon.alt = 'Play video';
  icon.width = 56;
  icon.height = 56;
  button.append(icon);
  button.addEventListener('click', () => {
    video.setAttribute('controls', '');
    video.play().catch(() => {});
  });
  video.addEventListener('play', () => player.classList.add('is-playing'));
  video.addEventListener('ended', () => player.classList.remove('is-playing'));
  player.append(video, button);
  return player;
}

function loadVideo(block, link, {
  autoplay, background, poster, title,
}) {
  if (block.dataset.embedLoaded === 'true') return;
  const url = new URL(link, window.location.href);
  let el;
  if (link.includes('youtube') || link.includes('youtu.be')) el = embedYoutube(url, autoplay, background);
  else if (link.includes('vimeo')) el = embedVimeo(url, autoplay, background);
  else {
    el = getVideoElement(link, autoplay, background, poster);
    // dark: custom play-button frame; default: native controls over the poster
    if (!background && block.classList.contains('dark')) el = nativePlayer(el, title);
    else if (title) el.setAttribute('title', title);
  }
  block.append(el);
  block.dataset.embedLoaded = 'true';
}

/**
 * Rows: [video link], [poster image] (optional).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const placeholder = block.querySelector('picture');
  const anchor = block.querySelector('a[href]');
  const sourceEl = block.querySelector('video source[src], video[src]');
  const link = anchor?.href || sourceEl?.getAttribute('src');
  if (!link) return;

  const posterImg = placeholder?.querySelector('img');
  const poster = posterImg ? posterImg.currentSrc || posterImg.src : '';
  const title = posterImg?.alt || '';
  const autoplay = block.classList.contains('autoplay');
  const isNative = !/youtube|youtu\.be|vimeo/.test(link);
  block.textContent = '';
  block.dataset.embedLoaded = 'false';

  // native file with a poster: the poster attribute does the job, no click-to-load needed
  if (placeholder && !autoplay && !isNative) {
    block.classList.add('video-inline-has-placeholder');
    const wrapper = document.createElement('div');
    wrapper.className = 'video-inline-placeholder';
    wrapper.append(placeholder);
    wrapper.insertAdjacentHTML('beforeend', '<div class="video-inline-placeholder-play"><button type="button" title="Play" aria-label="Play video"></button></div>');
    wrapper.addEventListener('click', () => {
      wrapper.remove();
      loadVideo(block, link, { autoplay: true, background: false, poster });
    });
    block.append(wrapper);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      const playOnLoad = autoplay && !prefersReducedMotion.matches;
      loadVideo(block, link, {
        autoplay: playOnLoad, background: autoplay, poster, title,
      });
    }
  });
  observer.observe(block);
}
