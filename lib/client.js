// dsh-ui-mobile-layout — client half (final v18).
//
// Bundle contract: __ModuleLoader__.load({id, factory}) → {apply, inject}.
//
// Mobile Settings — native two-layer navigation built WITHOUT fighting the
// official React panel:
//   root   → our own fullscreen overlay: top bar + section list (our buttons,
//            bound directly — the only event mechanism reliably delivered in
//            this environment).
//   detail → we make the overlay transparent & click-through, EXPOSING the
//            official dialog's LIVE content (React keeps buttons/sliders fully
//            interactive; never clone it).
//
// Hard-won constraints that shaped this build (see MOBILE-SETTINGS-FINAL.md):
//   - NEVER reparent a React-managed node (synthetic events die).
//   - NEVER insert DOM into the official dialog (React reconciliation breaks).
//   - document-level capture click listeners never fire here → bind on our own
//     body-level elements directly.
//   - Escape to close must be dispatched ON the dialog (React delegates from
//     the React root; dispatch on document never reaches it).
window.__ModuleLoader__.load({
  id: 'dsh-ui-mobile-layout',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    var PLUGIN_ID = 'dsh-ui-mobile-layout'
    var CSS = [
      '@media (max-width: 767px) {',
      // ---------- base layout ----------
      // The official Settings panel is position:fixed and lives INSIDE the
      // sidebar DOM. The community dsh-ui-mobile plugin sets a transform on
      // sidebarCol which becomes the containing block for fixed descendants
      // and traps the fullscreen modal. Kill that transform outright (our
      // drawer uses `left`, not transform), so fixed dialogs keep viewport
      // semantics and we never need to reparent the React-managed dialog.
      '[data-mobile-layout]{grid-template-columns:1fr !important;}',
      '[data-mobile-layout] > *:nth-child(1){position:fixed;inset-block:0;left:-100%;z-index:100;width:auto;min-width:280px;max-width:min(85vw, 420px);transform:none !important;transition:left .24s ease, box-shadow .24s ease;background:var(--dsw-bg-color,#151515);box-shadow:0 8px 40px rgba(0,0,0,.35);overflow-y:auto;-webkit-overflow-scrolling:touch;}',
      '[data-mobile-layout]:not([data-sidebar-collapsed]) > *:nth-child(1){left:0;}',
      '[data-mobile-layout] > *:nth-child(3){display:none;}',
      '[data-mobile-layout] > *:nth-child(4){z-index:90;}',
      // ---------- mobile Settings (final: root=list via overlay, detail=official) ----------
      // The official dialog is our DETAIL page: keep it fullscreen with its
      // live content (React-managed, fully interactive). Hide its nav rail and
      // let content fill the panel below our top bar; hide the official header
      // (we own the top bar).
      '[data-mobile-layout] [role="dialog"]{position:fixed !important;inset:0 !important;z-index:1000 !important;width:100vw !important;height:100vh !important;max-width:none !important;max-height:none !important;border-radius:0 !important;overflow-y:auto;}',
      '[data-mobile-layout] [role="dialog"] nav{display:none !important;}',
      '[data-mobile-layout] [role="dialog"] > :last-child{display:flex !important;flex-direction:column;min-height:0;padding:calc(env(safe-area-inset-top,0px) + 52px) 16px calc(env(safe-area-inset-bottom,0px) + 16px) !important;box-sizing:border-box;}',
      '[data-mobile-layout] [role="dialog"] > :last-child > *:first-child{display:none;}',
      // Dim mask hidden (fullscreen needs no dim).
      '[data-mobile-layout] [data-mobile-dialog-mask]{display:none !important;}',
      // ---- our root-screen overlay (the LIST) ----
      '[data-mobile-settings-overlay]{position:fixed !important;top:0 !important;left:0 !important;right:0 !important;bottom:0 !important;z-index:2000 !important;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-2,#151515);overflow:hidden;}',
      '[data-mobile-settings-overlay][data-screen="detail"]{background:transparent !important;pointer-events:none !important;}',
      '[data-mobile-settings-overlay][data-screen="detail"] [data-mobile-topbar]{pointer-events:auto;}',
      '[data-mobile-settings-overlay] [data-mobile-topbar]{display:flex;align-items:center;gap:4px;height:calc(env(safe-area-inset-top, 0px) + 52px);padding:env(safe-area-inset-top, 0px) 8px 0;flex:none;border-bottom:1px solid var(--dsw-alias-border-l1,#2a2a2e);background:var(--dsw-alias-bg-layer-2,#151515);box-sizing:border-box;}',
      '[data-mobile-settings-overlay] [data-mobile-topbar] button{width:42px;height:42px;border:none;border-radius:12px;background:transparent;color:var(--dsw-alias-label-primary,#fff);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;touch-action:manipulation;-webkit-tap-highlight-color:transparent;margin:0 2px;}',
      '[data-mobile-settings-overlay] [data-mobile-topbar] button:active{background:var(--dsw-alias-interactive-bg-hover,#2a2a2e);}',
      '[data-mobile-settings-overlay] [data-mobile-topbar] [data-mobile-title]{flex:1;min-width:0;font-size:17px;font-weight:600;line-height:22px;color:var(--dsw-alias-label-primary,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;padding-left:6px;}',
      // our own section list (only visible on root screen)
      '[data-mobile-settings-overlay] [data-mobile-list]{flex:1 1 0;min-height:0;overflow-y:auto;padding:8px 16px calc(env(safe-area-inset-bottom,0px) + 20px);box-sizing:border-box;}',
      '[data-mobile-settings-overlay] [data-mobile-list] button{display:flex;align-items:center;gap:14px;width:100%;min-height:54px;margin-bottom:8px;padding:0 14px;box-sizing:border-box;border:none;border-radius:14px;background:var(--dsw-alias-bg-layer-2,#1c1c1f);color:var(--dsw-alias-label-primary,#fff);font-size:16px;line-height:22px;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent;}',
      '[data-mobile-settings-overlay][data-screen="detail"] [data-mobile-list]{display:none !important;}',
      '}',
    ].join('')

    var MOBILE_QUERY = '(max-width: 767px)'

    /* ---------- frame ---------- */
    function findFrame() {
      var overlay = document.querySelector('[data-shell-overlay]')
      return overlay ? overlay.parentElement : null
    }

    /* ---------- stats tap→tooltip ---------- */
    function looksLikeStats(el) {
      if (!(el instanceof HTMLElement)) return false
      var cs = window.getComputedStyle(el)
      if (cs.display !== 'block') return false
      if (cs.textAlign !== 'center') return false
      if (cs.textOverflow !== 'ellipsis') return false
      if (cs.whiteSpace !== 'nowrap') return false
      var r = el.getBoundingClientRect()
      if (r.height <= 0 || r.height > 40) return false
      return true
    }
    function armStatsRow() {
      if (typeof window.matchMedia === 'function' && !window.matchMedia(MOBILE_QUERY).matches) return
      var seat = document.querySelector('[data-composer-seat]')
      if (seat === null) return
      var rows = seat.querySelectorAll('div')
      for (var i = 0; i < rows.length; i++) {
        var el = rows[i]
        if (el.getAttribute('tabindex') !== null) continue
        if (el.textContent && el.textContent.indexOf('·') !== -1 && looksLikeStats(el)) {
          el.setAttribute('tabindex', '0')
          el.setAttribute('data-mobile-stats', '')
          el.style.outline = 'none'
          el.style['-webkit-tap-highlight-color'] = 'transparent'
          return
        }
      }
    }
    function startStatsWatcher() {
      if (typeof MutationObserver !== 'function') return armStatsRow()
      armStatsRow()
      var obs = new MutationObserver(function () { if (!document.querySelector('[data-mobile-stats]')) armStatsRow() })
      obs.observe(document.body, { childList: true, subtree: true })
      return function () { obs.disconnect() }
    }

    /* ---------- mobile settings (two-layer overlay) ---------- */
    var S = { dialog: null, overlay: null, list: null, detail: null, topbar: null, back: null, title: null, mask: null, mode: 'root', disposing: false, dialogClick: null, docNavBound: false }

    function findMask(dialog) {
      if (!dialog || !dialog.parentElement) return null
      var kids = dialog.parentElement.children
      for (var i = 0; i < kids.length; i++) {
        var k = kids[i]
        if (k === dialog) continue
        if (k.getAttribute('aria-hidden') === 'true') return k
      }
      return null
    }

    function setMode(mode) {
      S.mode = mode
      if (S.overlay) {
        S.overlay.setAttribute('data-screen', mode)
        if (mode === 'detail') {
          S.overlay.classList.add('data-screen-detail-open')
        } else {
          S.overlay.classList.remove('data-screen-detail-open')
        }
      }
    }

    // ---- two-layer navigation ----
    function enterDetail(titleText) {
      if (S.title && titleText) S.title.textContent = titleText
      setMode('detail')
    }
    function enterRoot() {
      if (S.title) S.title.textContent = '设置'
      setMode('root')
    }
    function onBack() {
      // detail → back to the entry list
      if (S.mode === 'detail') { enterRoot(); return }
      // root → close settings. Capture the dialog ref first (settingsDispose
      // nulls it), hide our overlay instantly, then make the OFFICIAL dialog
      // close through every path that works:
      //   1) Escape dispatched ON the dialog (React delegates from its root;
      //      dispatch on document never reaches it),
      //   2) official mask click (mask onClick → onClose),
      //   3) official close button click.
      var dlg = S.dialog
      S.disposing = true
      if (S.overlay) {
        try { S.overlay.style.display = 'none' } catch (e) {}
      }
      if (dlg) {
        try {
          dlg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
        } catch (e) {}
        try {
          var masked = dlg.parentElement ? dlg.parentElement.querySelector('[data-mobile-dialog-mask]') : null
          if (masked) { masked.click() }
        } catch (e) {}
        try {
          var closeBtn = dlg.querySelector('[class*="close"]')
          if (closeBtn) { closeBtn.click() }
        } catch (e) {}
      }
      settingsDispose()
      try {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
      } catch (e) {}
      setTimeout(function () { S.disposing = false }, 800)
    }

    function setupSettings() {
      if (S.disposing) return
      if (S.dialog !== null && document.body.contains(S.dialog) && S.overlay !== null && document.body.contains(S.overlay)) return
      if (S.dialog !== null) S.dialog = null
      if (typeof window.matchMedia === 'function' && !window.matchMedia(MOBILE_QUERY).matches) return

      var dialogs = document.querySelectorAll('[role="dialog"]')
      var dialog = null
      for (var i = 0; i < dialogs.length; i++) {
        var d = dialogs[i]
        if (d.querySelector('nav button, nav') === null) continue
        dialog = d
        break
      }
      if (dialog === null) return
      S.dialog = dialog

      var mask = findMask(dialog)
      if (mask) { mask.setAttribute('data-mobile-dialog-mask', ''); S.mask = mask }

      // ---- build our own overlay on <body>: top bar + section list.
      if (S.overlay === null || !document.body.contains(S.overlay)) {
        var overlay = document.createElement('div')
        overlay.setAttribute('data-mobile-settings-overlay', '')
        var topbar = document.createElement('div')
        topbar.setAttribute('data-mobile-topbar', '')
        var back = document.createElement('button')
        back.setAttribute('aria-label', '返回')
        back.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        back.addEventListener('click', onBack)
        var title = document.createElement('span')
        title.setAttribute('data-mobile-title', '')
        title.textContent = '设置'
        topbar.appendChild(back)
        topbar.appendChild(title)
        overlay.appendChild(topbar)
        var list = document.createElement('div')
        list.setAttribute('data-mobile-list', '')
        overlay.appendChild(list)
        document.body.appendChild(overlay)
        S.overlay = overlay
        S.topbar = topbar
        S.back = back
        S.title = title
        S.list = list
        S.detail = null
      }

      // ---- render our OWN section list (read official nav labels — data only)
      var navBtns = dialog.querySelectorAll('nav button, nav [class*="navCell"]')
      S.list.textContent = ''
      for (var j = 0; j < navBtns.length; j++) {
        var lbl = (navBtns[j].textContent || '').trim()
        if (!lbl) continue
        var btn = document.createElement('button')
        btn.textContent = lbl
        btn.setAttribute('data-section', String(j))
        // DIRECT element binding — capture idx AND text by IIFE parameter
        // (a closure over the shared loop var would give every button the
        // last label).
        ;(function (idx, text) {
          btn.addEventListener('click', function () {
            try {
              var cells = S.dialog.querySelectorAll('nav button, nav [class*="navCell"]')
              if (cells[idx] && cells[idx].click) cells[idx].click()
            } catch (e) {}
            enterDetail(text)
          })
        })(j, lbl)
        S.list.appendChild(btn)
      }
      setMode('root')
    }

    function settingsDispose() {
      if (S.dialogClick) { try { S.dialogClick = null } catch (e) {} }
      if (S.docNavBound) { S.docNavBound = false }
      if (S.overlay && S.overlay.parentNode) S.overlay.parentNode.removeChild(S.overlay)
      if (S.dialog) { S.dialog.removeAttribute('data-mobile-settings'); S.dialog.removeAttribute('data-mobile-options') }
      if (S.mask) S.mask.removeAttribute('data-mobile-dialog-mask')
      S.dialog = null; S.overlay = null; S.list = null; S.detail = null
      S.topbar = null; S.back = null; S.title = null; S.mask = null; S.mode = 'root'; S.disposing = false
    }

    /* ---------- apply ---------- */
    // Phone left-edge drawer gesture: starting a rightward swipe from the
    // screen's left edge opens the sidebar drawer; a leftward swipe while open
    // closes it. Works standalone (no reliance on dsh-ui-mobile). Uses the
    // official layout service's toggleSidebar when available.
    function startEdgeSwipe(layout) {
      if (typeof window === 'undefined' || !window.addEventListener) return function () {}
      if (!window.matchMedia || !layout || typeof layout.toggleSidebar !== 'function') return function () {}
      var tracking = null
      function isPhone() {
        try { return window.matchMedia(MOBILE_QUERY).matches } catch (e) { return false }
      }
      function onStart(ev) {
        if (!isPhone()) return
        if (ev.touches.length !== 1) { tracking = null; return }
        var t = ev.touches[0]
        // only start from the left edge (40px zone)
        if (t.clientX > 40) { tracking = null; return }
        tracking = { x0: t.clientX, y0: t.clientY }
      }
      function onMove(ev) {
        if (!tracking) return
        var t = ev.touches[0]
        var dx = t.clientX - tracking.x0
        var dy = t.clientY - tracking.y0
        // vertical scroll wins over horizontal swipe
        if (Math.abs(dy) > 30 && Math.abs(dy) > Math.abs(dx)) { tracking = null; return }
        // rightward swipe past threshold → toggle the drawer open
        if (dx > 56) {
          ev.preventDefault()
          try { layout.toggleSidebar() } catch (e) {}
          tracking = null
        } else if (dx < -56) {
          // leftward swipe → collapse the drawer if it is open
          ev.preventDefault()
          var fr = document.querySelector('[data-mobile-layout]')
          if (fr && !fr.hasAttribute('data-sidebar-collapsed')) {
            try { layout.toggleSidebar() } catch (e) {}
          }
          tracking = null
        }
      }
      window.addEventListener('touchstart', onStart, { passive: true })
      window.addEventListener('touchmove', onMove, { passive: false })
      return function () {
        window.removeEventListener('touchstart', onStart)
        window.removeEventListener('touchmove', onMove)
      }
    }

    function apply(ctx) {
      var disposal = []
      var frame = null
      var observer = null

      var style = document.createElement('style')
      style.setAttribute('data-plugin', PLUGIN_ID)
      style.setAttribute('data-plugin-css', PLUGIN_ID + '/mobile.css')
      style.textContent = CSS
      document.head.appendChild(style)
      disposal.push(function () { style.remove() })

      function mountAnchor() {
        if (frame !== null) return
        var f = findFrame()
        if (f === null) return
        frame = f
        frame.setAttribute('data-mobile-layout', '')
        disposal.push(function () { frame && frame.removeAttribute('data-mobile-layout') })
        if (observer !== null) { observer.disconnect(); observer = null }
      }
      mountAnchor()
      if (frame === null && typeof window.MutationObserver === 'function') {
        observer = new MutationObserver(function () { mountAnchor() })
        observer.observe(document.documentElement, { childList: true, subtree: true })
        disposal.push(function () { if (observer) observer.disconnect() })
      }

      var disposeWatcher = null
      try { disposeWatcher = startStatsWatcher() } catch (e) { disposeWatcher = null }
      if (disposeWatcher) disposal.push(disposeWatcher)

      // left-edge swipe → sidebar drawer (open/close)
      var disposeSwipe = null
      try { disposeSwipe = startEdgeSwipe(ctx.layout || (ctx && ctx.get ? ctx.get('layout') : null)) } catch (e) { disposeSwipe = null }
      if (disposeSwipe) disposal.push(disposeSwipe)

      var settingsObserver = null
      function trySettings() { try { setupSettings() } catch (e) {} }
      if (typeof MutationObserver === 'function') {
        settingsObserver = new MutationObserver(function () {
          try { trySettings() } catch (e) {}
        })
        settingsObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-mobile-settings'] })
        disposal.push(function () { if (settingsObserver) settingsObserver.disconnect() })
      }
      trySettings()

      return function () {
        document.querySelectorAll('[data-mobile-stats]').forEach(function (el) {
          el.removeAttribute('tabindex'); el.removeAttribute('data-mobile-stats')
        })
        try { settingsDispose() } catch (e) {}
        for (var i = 0; i < disposal.length; i++) { try { disposal[i]() } catch (e) {} }
        disposal = []
      }
    }

    exports.apply = apply
    exports.inject = ['layout']
    return module.exports
  },
})
