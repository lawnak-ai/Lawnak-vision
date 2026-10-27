// Preview only: fits the 1280x720 slide to the window and adds a toolbar.
// It plays the slide the way the app does: the <section> gets the class "active"
// and receives a "slideenter" event. Do not paste this into a slide.
(function () {
  var root = document.documentElement
  var slide = document.querySelector('.slide')
  var params = new URLSearchParams(location.search)
  root.dataset.theme = params.get('theme') || 'dark'
  if (params.has('embed')) root.classList.add('cx-embed')
  if (params.has('static')) root.classList.add('lv-static')

  function fit() {
    var s = Math.min(innerWidth / 1280, innerHeight / 720)
    slide.style.setProperty('--fit', s)
  }
  addEventListener('resize', fit)
  fit()

  // A short copy of the app's [data-count] effect: numbers count up from 0.
  // In the app the deck runtime does this, so components only need the attribute.
  function count(el) {
    if (el.__cxText === undefined) el.__cxText = el.textContent
    var src = el.__cxText, m = /-?\d[\d,]*(\.\d+)?/.exec(src)
    if (!m) return
    var target = parseFloat(m[0].replace(/,/g, '')), dec = m[1] ? m[1].length - 1 : 0
    var pre = src.slice(0, m.index), post = src.slice(m.index + m[0].length)
    var dur = parseFloat(el.getAttribute('data-duration')) || 1800
    var d = parseFloat(getComputedStyle(el).getPropertyValue('--d'))
    var delay = isNaN(d) ? 300 : d * 1000, token = {}, start = null
    el.__cxToken = token
    el.textContent = pre + (0).toFixed(dec) + post
    setTimeout(function () {
      requestAnimationFrame(function step(t) {
        if (el.__cxToken !== token) return
        if (start === null) start = t
        var p = Math.min(1, (t - start) / dur)
        el.textContent = pre + (target * (1 - Math.pow(1 - p, 4))).toFixed(dec) + post
        if (p < 1) requestAnimationFrame(step)
        else el.textContent = src
      })
    }, delay)
  }

  function play() {
    slide.classList.remove('active')
    void slide.offsetWidth // restart CSS animations
    slide.classList.add('active')
    var still = root.classList.contains('lv-static') || matchMedia('(prefers-reduced-motion: reduce)').matches
    slide.querySelectorAll('[data-count]').forEach(function (el) {
      if (still) { el.__cxToken = {}; if (el.__cxText !== undefined) el.textContent = el.__cxText }
      else count(el)
    })
    slide.dispatchEvent(new CustomEvent('slideenter', { bubbles: true }))
  }

  var bar = document.createElement('div')
  bar.className = 'cx-bar'
  function button(label, onClick, pressed) {
    var b = document.createElement('button')
    b.textContent = label
    if (pressed !== undefined) b.setAttribute('aria-pressed', String(pressed))
    b.onclick = function () { onClick(b) }
    bar.appendChild(b)
  }
  button('Replay (R)', play)
  button('Light', function (b) {
    var light = root.dataset.theme !== 'light'
    root.dataset.theme = light ? 'light' : 'dark'
    b.setAttribute('aria-pressed', String(light))
  }, root.dataset.theme === 'light')
  button('RTL', function (b) {
    var rtl = slide.getAttribute('dir') !== 'rtl'
    slide.setAttribute('dir', rtl ? 'rtl' : 'ltr')
    slide.classList.toggle('rtl', rtl)
    b.setAttribute('aria-pressed', String(rtl))
    play()
  }, false)
  button('Static', function (b) {
    var on = root.classList.toggle('lv-static')
    b.setAttribute('aria-pressed', String(on))
    play()
  }, root.classList.contains('lv-static'))
  document.body.appendChild(bar)
  addEventListener('keydown', function (e) { if (e.key === 'r' || e.key === 'R') play() })

  // Scripts in the component listen for slideenter, so fire it once they have run.
  addEventListener('load', play)
})()
