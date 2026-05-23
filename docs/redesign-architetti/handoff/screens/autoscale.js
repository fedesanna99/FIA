// autoscale.js — scales fixed-size desktop screens to fit smaller viewports.
// Targets .app, .app-workspace, .tablet — scales transform-origin top-left.
(function () {
  var targets = [
    { sel: '.app',           w: 1440, h: 900, sizeIt: true  },
    { sel: '.app-workspace', w: 1440, h: 900, sizeIt: true  },
    { sel: '.tablet',        w: 1140, h: 860, sizeIt: false },
    { sel: '.phone-frame',   w: 420,  h: 900, sizeIt: false }
  ];

  function apply() {
    var pad = 16;
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      var el = document.querySelector(t.sel);
      if (!el) continue;
      var vw = window.innerWidth, vh = window.innerHeight;
      var s = Math.min(1, (vw - pad) / t.w, (vh - pad) / t.h);
      if (s >= 0.999) {
        el.style.transform = '';
        el.style.transformOrigin = '';
        if (t.sizeIt) { el.style.width = ''; el.style.height = ''; }
      } else {
        el.style.transformOrigin = '0 0';
        el.style.transform = 'scale(' + s.toFixed(4) + ')';
        if (t.sizeIt) {
          el.style.width  = t.w + 'px';
          el.style.height = t.h + 'px';
        }
      }
    }
  }

  // ensure body doesn't scroll oddly while scaled
  document.documentElement.style.overflow = 'hidden';
  document.addEventListener('DOMContentLoaded', apply);
  window.addEventListener('resize', apply);
  // also run immediately in case DOM is already ready
  if (document.readyState !== 'loading') apply();
  // Targets like .phone-frame are React-rendered after DOMContentLoaded — retry a few times.
  setTimeout(apply, 50);
  setTimeout(apply, 200);
  setTimeout(apply, 500);
  setTimeout(apply, 1200);
})();
