import './style.css'

// Infinite 3-row carousel implementation
// Replace the image URLs below with your own local files if needed (put them in `public/` and reference `/images/...`)
const imageUrls = [
  'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=1',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=2',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=3',
  'https://images.unsplash.com/photo-1504198453319-5ce911bafcde?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=4',
  'https://images.unsplash.com/photo-1495567720989-cebdbdd97913?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=5',
  'https://images.unsplash.com/photo-1519340333755-88a7aa5b2d9c?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=6',
  'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=7',
  'https://images.unsplash.com/photo-1482192505345-5655af888cc4?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=8'
]

document.querySelector('#app').innerHTML = `
  <main>
    <h1>Nuestras mejores Fotos K y E</h1>
    <div class="carousel" id="carousel">
      <!-- rows injected by JS -->
    </div>
    <div class="carousel-controls">
      <button id="pauseAll">Pausar</button>
      <button id="resumeAll">Reanudar</button>
    </div>
  </main>
`

const carousel = document.getElementById('carousel')
const pauseAllBtn = document.getElementById('pauseAll')
const resumeAllBtn = document.getElementById('resumeAll')

// Configuration for three rows: direction and duration (seconds)
const rowsConfig = [
  { direction: 'left', duration: 28 },
  // segunda fila: mover de derecha -> izquierda
  { direction: 'left', duration: 20 },
  { direction: 'left', duration: 36 }
]

// 🚀 AÑADE ESTA LÍNEA CLAVE
const base = import.meta.env.BASE_URL || '/'

// Optionally load images from `public/images/row1`, `row2`, `row3`.
// The loader will try common filenames like photo1.jpg, photo2.jpg, ... up to a limit.
const rowsFolders = [`${base}images/row1`, `${base}images/row2`, `${base}images/row3`]
async function probeFolder(folder, max = 12) {
  const exts = ['jpg', 'png', 'webp']
  const candidates = []
  for (let i = 1; i <= max; i++) {
    for (const ext of exts) {
      candidates.push(`${folder}/photo${i}.${ext}`)
      candidates.push(`${folder}/${i}.${ext}`)
    }
  }

  // Test images in parallel but limit concurrency
  const loadImage = (src) => new Promise((res) => {
    const img = new Image()
    img.onload = () => res({ src, ok: true })
    img.onerror = () => res({ src, ok: false })
    img.src = src
  })

  const results = []
  // test candidates sequentially until we gather some images or exhaust
  for (const c of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const r = await loadImage(c)
    if (r.ok) results.push(r.src)
    // stop early if we have a reasonable set
    if (results.length >= 8) break
  }
  return results
}

// JS-driven infinite scroll implementation using requestAnimationFrame.
// This is more reliable than CSS animation reset: we update translateX continuously and wrap modulo halfWidth.
const rowsState = []

function createRow(config, images) {
  const row = document.createElement('div')
  row.className = 'carousel-row'
  row.dataset.direction = config.direction

  const track = document.createElement('div')
  track.className = 'carousel-track'
  // create items and append twice for seamless scroll (clone nodes)
  const items = []
  const imgs = images && images.length ? images : imageUrls
  for (let i = 0; i < imgs.length; i++) {
    const it = document.createElement('div')
    it.className = 'carousel-item'
    it.innerHTML = `<img src="${imgs[i]}" alt="Imagen ${i+1}">`
    items.push(it)
    track.appendChild(it)
  }
  // duplicate the same sequence so we can loop seamlessly
  items.forEach(it => track.appendChild(it.cloneNode(true)))

  row.appendChild(track)

  // row state placeholder; we'll compute sizes after insertion
  const state = {
    row,
    track,
    direction: config.direction,
    duration: config.duration,
    speed: 0, // px per second (computed later)
    halfWidth: 0, // half the scroll width (one sequence)
    offset: 0,
    paused: false
  }

  // pause on hover
  row.addEventListener('mouseenter', () => { state.paused = true })
  row.addEventListener('mouseleave', () => { state.paused = false })

  rowsState.push(state)
  return row
}

// Attempt to probe folders and build rows with their own images; fall back to defaults.
async function buildRows() {
  const rowsImages = []
  for (let i = 0; i < rowsFolders.length; i++) {
    // eslint-disable-next-line no-await-in-loop
    const found = await probeFolder(rowsFolders[i])
    if (found && found.length) rowsImages.push(found)
    else rowsImages.push(null) // will fallback
  }

  rowsConfig.forEach((cfg, idx) => {
    const imgs = rowsImages[idx] && rowsImages[idx].length ? rowsImages[idx] : imageUrls
    const r = createRow(cfg, imgs)
    carousel.appendChild(r)
  })

  // after DOM inserted, compute dimensions and start RAF
  computeRows()
  requestAnimationFrame((ts) => { lastTime = ts; requestAnimationFrame(rafLoop) })
}

buildRows()

// after DOM inserted, compute dimensions and speeds
function computeRows() {
  rowsState.forEach(s => {
    const track = s.track
    // total scrollable width is track.scrollWidth; half of it is one sequence
    const total = track.scrollWidth
    s.halfWidth = total / 2
    // speed: pixels per second to move one sequence in 'duration' seconds
    s.speed = s.halfWidth / s.duration
    // set initial offset to 0
    s.offset = 0
    // ensure transform set
    track.style.transform = 'translateX(0px)'
  })
}

// RAF loop
let lastTime = performance.now()
function rafLoop(t) {
  const dt = (t - lastTime) / 1000
  lastTime = t
  rowsState.forEach(s => {
    if (s.paused) return
    const dir = s.direction === 'left' ? -1 : 1
    s.offset += dir * s.speed * dt
    // wrap offset within [0, halfWidth) using modulo
    if (s.halfWidth > 0) {
      s.offset = ((s.offset % s.halfWidth) + s.halfWidth) % s.halfWidth
      // For left direction we move negative, so compute translate accordingly
      const translate = s.direction === 'left' ? -s.offset : -s.halfWidth + s.offset
      s.track.style.transform = `translateX(${translate}px)`
    }
  })
  requestAnimationFrame(rafLoop)
}

// start handled after buildRows completes

// Controls
pauseAllBtn.addEventListener('click', ()=> rowsState.forEach(s=> s.paused = true))
resumeAllBtn.addEventListener('click', ()=> rowsState.forEach(s=> s.paused = false))

// keyboard: space toggles pause/resume all
document.addEventListener('keydown', (e)=>{
  if (e.code === 'Space') {
    const anyPaused = rowsState.some(s => s.paused)
    rowsState.forEach(s => s.paused = !anyPaused)
  }
})

// recompute on resize (guarded to avoid runtime errors in odd environments)
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('resize', () => computeRows())
} else if (typeof addEventListener === 'function') {
  // fallback (very unusual) environment
  addEventListener('resize', () => computeRows())
}

// end

// Envelope (sobre) UI and hover countdown until 20:00
(function setupEnvelope(){
  const carouselEl = document.getElementById('carousel')
  if (!carouselEl) return

  // create envelope markup and append it AFTER the carousel so it appears below
  const side = document.createElement('div')
  side.className = 'side-envelope below'
  side.innerHTML = `
    <div class="envelope" id="envelope" title="Carta cerrada">
      <div class="envelope-shade"></div>
      <div class="stamp"></div>
    </div>
  `

  // Prefer inserting the envelope AFTER the controls, so order is: carousel -> controls -> envelope
  const controlsEl = document.querySelector('.carousel-controls')
  if (controlsEl && controlsEl.parentNode) {
    controlsEl.parentNode.insertBefore(side, controlsEl.nextSibling)
  } else {
    // fallback: insert after carousel
    carouselEl.parentNode.insertBefore(side, carouselEl.nextSibling)
  }

  const envelope = side.querySelector('#envelope')

  // Only open modals on click. Remove hover/tooltip behavior per user request.
  envelope.addEventListener('click', ()=>{
    const now = new Date()
    const target = new Date(2025, 10, 24, 20, 0, 0, 0)
    if (target - now <= 0) {
      // unlocked: show letter
      if (envelope && !envelope.classList.contains('ready')) envelope.classList.add('ready')
      showLetterModal()
    } else {
      // still locked: show info modal explaining time remaining
      showInfoModal()
    }
  })

  // Modal helper: reuse .viewer styles already present in CSS
  function showLetterModal(){
    // avoid creating multiple
    let modal = document.getElementById('letterModal')
    if (!modal) {
      modal = document.createElement('div')
      modal.id = 'letterModal'
      modal.className = 'viewer'
      modal.innerHTML = `
        <div class="viewer-inner">
          <button id="closeLetter" style="position:absolute; right:8px; top:8px">Cerrar</button>
          <h2>Felices 9 meses</h2>
          <div style="padding:12px; text-align:left; color: #eee">
            <p>Mi amor, mi todo y digo mi todo porque asi lo siento.</p>
            <p>Siento que en todo lo que hago quiero que estés tu, viendome, apoyándome, acompañandome.</p>
            <p>Siento tantas cosas cuando estamos juntos, siento que se me va algo cuando cada uno va a su casa.</p>
            <p>Eso es lo que no me gusta, dejarte, porque siempre tienes esa mirada de niña chiquita que necesita amor</p>
            <p>Cada vez que me dices "Te extraño" me imagino a ti, totalmente indefensa, quisiera justo en ese momento ir contigo</p>
            <p>Extrañar es poco</p>
            <p>Ya mismo y es nuestro aniversario, no puedo creer de verdad.</p>
            <p>Coincidir en el momento justo, pasar por tanto y estar ahora juntos.</p>
            <p>Amor no me puedo creer, que seas tu, siempre me imaginaba conocer a una persona tranquila, pero intensa en sentimientos</p>
            <p>Y llegaste con tu personalidad toda bonita, algo penosa al inicio pero te lo dije yo te iba a sacar la sopa</p>
            <p>Cuando fue el primer beso, esa intensidad que cada vez que ibamos a un aula nos faltaba todavia mas</p>
            <p>Te quiero mi amor y estoy feliz de tenerte</p>
          </div>
        </div>
      `
      document.body.appendChild(modal)
      document.getElementById('closeLetter').addEventListener('click', ()=>{
        modal.remove()
      })
      // close when clicking backdrop
      modal.addEventListener('click', (ev)=>{
        if (ev.target === modal) modal.remove()
      })
    }
  }
  // Info modal shown on click before time
  function showInfoModal(){
    let info = document.getElementById('infoModal')
    if (!info) {
      info = document.createElement('div')
      info.id = 'infoModal'
      info.className = 'viewer'
      info.innerHTML = `
        <div class="viewer-inner">
          <button id="closeInfo" style="position:absolute; right:8px; top:8px">Cerrar</button>
          <h2>Aún no es hora</h2>
          <div style="padding:12px; text-align:left; color: #eee">
            <p>Falta tiempo para abrir la carta. Tiempo restante:</p>
            <div id="infoCountdown" style="font-family:monospace; font-size:1.05rem; margin-top:6px"></div>
          </div>
        </div>
      `
      document.body.appendChild(info)
      document.getElementById('closeInfo').addEventListener('click', ()=> info.remove())
      info.addEventListener('click', (ev)=>{ if (ev.target === info) info.remove() })
    }
    // update countdown inside info modal
    const infoCountdown = document.getElementById('infoCountdown')
    function updateInfo(){
      const now = new Date()
      const target = new Date(2025,10,24,20,0,0,0)
      const diff = target - now
      if (diff <= 0) {
        infoCountdown.textContent = 'Ya se puede leer, da click en el sobre.'
        return
      }
      const hrs = Math.floor(diff / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      infoCountdown.textContent = `${hrs}h ${mins}m ${secs}s`
    }
    updateInfo()
    // keep updating while modal exists
    const iv = setInterval(()=>{ if (!document.getElementById('infoModal')) clearInterval(iv); else updateInfo() }, 1000)
  }
})()
