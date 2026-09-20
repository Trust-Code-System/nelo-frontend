/**
 * Runs in the document head before the first paint.
 *
 * The home curtain is the landing page. It is server-rendered closed and this
 * flag keeps the campaign covered until the sequence finishes. Markets listed
 * here are the only routes that mount CurtainIntro, so other pages never get a
 * stuck black veil. Reduced-motion visitors skip it.
 */
export const INTRO_BOOT_SCRIPT = `(function(){
  try {
    var path = location.pathname.replace(/\\/+$/, '') || '/';
    var home = path === '/ng' || path === '/international';
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (home && !reduce) {
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
