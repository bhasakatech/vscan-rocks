/*
 * Embed Video Block
 * Embeds a YouTube / Vimeo (or other) video from a link, with an optional placeholder image.
 */

const getDefaultEmbed = (url) => `<div class="embed-video-frame">
    <iframe src="${url.href}" allowfullscreen="" scrolling="no" allow="encrypted-media"
      title="Content from ${url.hostname}" loading="lazy"></iframe>
  </div>`;

const embedYoutube = (url, autoplay) => {
  const usp = new URLSearchParams(url.search);
  const suffix = autoplay ? '&muted=1&autoplay=1' : '';
  let vid = usp.get('v') ? encodeURIComponent(usp.get('v')) : '';
  const embed = url.pathname;
  if (url.origin.includes('youtu.be')) {
    [, vid] = url.pathname.split('/');
  }
  const src = `https://www.youtube.com${vid ? `/embed/${vid}?rel=0&v=${vid}${suffix}` : embed}`;
  return `<div class="embed-video-frame">
      <iframe src="${src}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
        allowfullscreen="" scrolling="no" title="Content from Youtube" loading="lazy"></iframe>
    </div>`;
};

const embedVimeo = (url, autoplay) => {
  const [, video] = url.pathname.split('/');
  const suffix = autoplay ? '?muted=1&autoplay=1' : '';
  return `<div class="embed-video-frame">
      <iframe src="https://player.vimeo.com/video/${video}${suffix}" allow="autoplay; fullscreen; picture-in-picture"
        allowfullscreen title="Content from Vimeo" loading="lazy"></iframe>
    </div>`;
};

const EMBEDS = [
  { match: ['youtube', 'youtu.be'], name: 'youtube', render: embedYoutube },
  { match: ['vimeo'], name: 'vimeo', render: embedVimeo },
];

const loadEmbed = (block, link, autoplay) => {
  if (block.classList.contains('embed-video-is-loaded')) return;
  const url = new URL(link);
  const config = EMBEDS.find((e) => e.match.some((m) => link.includes(m)));
  if (config) {
    block.innerHTML = config.render(url, autoplay);
    block.classList.add(`embed-video-${config.name}`);
  } else {
    block.innerHTML = getDefaultEmbed(url);
  }
  block.classList.add('embed-video-is-loaded');
};

/**
 * Rows: [placeholder image] (optional), [video link].
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const placeholder = block.querySelector('picture');
  const anchor = block.querySelector('a[href]');
  const link = anchor ? anchor.href : block.textContent.trim();
  if (!link || !/^https?:\/\//.test(link)) return;
  block.textContent = '';

  if (placeholder) {
    const wrapper = document.createElement('div');
    wrapper.className = 'embed-video-placeholder';
    wrapper.innerHTML = '<div class="embed-video-placeholder-play"><button type="button" title="Play" aria-label="Play video"></button></div>';
    wrapper.prepend(placeholder);
    wrapper.addEventListener('click', () => loadEmbed(block, link, true));
    block.append(wrapper);
  } else {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        loadEmbed(block, link);
      }
    });
    observer.observe(block);
  }
}
