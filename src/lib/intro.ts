export const INTRO_STORAGE_KEY = 'nelo-couture-intro-v1';

/**
 * Runs in the document head before the first paint.
 *
 * The home curtain is server-rendered closed. Without this flag the landing
 * page would paint first and only be covered after hydration - which on a
 * cold production load is a couple of seconds of the campaign showing through.
 * Markets listed here are the only routes that mount CurtainIntro, so other
 * pages never get a stuck black veil.
 */
export const INTRO_BOOT_SCRIPT = `(function(){
  try {
    var path = location.pathname.replace(/\\/+$/, '') || '/';
    var home = path === '/ng' || path === '/international';
    var force = new URLSearchParams(location.search).has('intro');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var seen = sessionStorage.getItem('${INTRO_STORAGE_KEY}') === 'seen';
    if (home && !reduce && (force || !seen)) {
      document.documentElement.setAttribute('data-intro', 'play');
    } else {
      document.documentElement.setAttribute('data-intro', 'skip');
    }
  } catch (e) {
    var fallback = (location.pathname.replace(/\\/+$/, '') || '/');
    if (fallback === '/ng' || fallback === '/international') {
      document.documentElement.setAttribute('data-intro', 'play');
    }
  }
})();`;
