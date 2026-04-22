/**
 * laboratorio.js  -  CodeKids Code Lab
 * Motor completo: Google Blockly (renderer zelos) + Canvas VM + Tutorial guiado
 * Sin emojis. Sin placeholders. 100% funcional.
 */

window.LabModule = (function () {
  'use strict';

  let workspace        = null;
  let vm               = null;   // alias for spriteVMs[selectedSprite]
  let labInited        = false;
  let tutStep          = 0;
  let selectedSprite   = null;
  let spriteVMs        = {};
  let spriteOrder      = [];
  let activeSprites    = [];
  let spritePrograms   = {};
  let sharedLoopActive = false;
  let sharedCanvas     = null;
  let sharedCtx        = null;

  /* ================================================================
     SVG ILLUSTRATIONS  (incrustadas como strings)
     ================================================================ */

  const TUT_SVG = [

    // Step 0: Welcome - layout overview
    `<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
      <rect width="300" height="160" fill="#0b1220" rx="8"/>
      <rect x="3" y="3" width="62" height="154" fill="#111827" rx="6"/>
      <text x="34" y="14" fill="#334155" font-size="6" text-anchor="middle" font-weight="600">BLOQUES</text>
      <rect x="7" y="20" width="54" height="11" fill="#FFAB19" rx="4"/>
      <text x="34" y="29" fill="white" font-size="7" text-anchor="middle">Eventos</text>
      <rect x="7" y="35" width="54" height="11" fill="#4C97FF" rx="4"/>
      <text x="34" y="44" fill="white" font-size="7" text-anchor="middle">Movimiento</text>
      <rect x="7" y="50" width="54" height="11" fill="#9966FF" rx="4"/>
      <text x="34" y="59" fill="white" font-size="7" text-anchor="middle">Apariencia</text>
      <rect x="7" y="65" width="54" height="11" fill="#FFAB19" rx="4"/>
      <text x="34" y="74" fill="white" font-size="7" text-anchor="middle">Control</text>
      <rect x="69" y="3" width="152" height="154" fill="#0f172a" rx="6"/>
      <text x="145" y="14" fill="#334155" font-size="6" text-anchor="middle" font-weight="600">AREA DE TRABAJO</text>
      <rect x="78" y="22" width="96" height="13" fill="#FFAB19" rx="5"/>
      <text x="126" y="32" fill="white" font-size="7" text-anchor="middle">Al hacer clic</text>
      <rect x="86" y="39" width="88" height="13" fill="#4C97FF" rx="5"/>
      <text x="130" y="49" fill="white" font-size="7" text-anchor="middle">Mover 10 pasos</text>
      <rect x="86" y="56" width="88" height="13" fill="#9966FF" rx="5"/>
      <text x="130" y="66" fill="white" font-size="7" text-anchor="middle">Decir Hola por 2s</text>
      <rect x="86" y="73" width="88" height="13" fill="#FFAB19" rx="5"/>
      <text x="130" y="83" fill="white" font-size="7" text-anchor="middle">Por siempre</text>
      <rect x="225" y="3" width="72" height="154" fill="#111827" rx="6"/>
      <text x="261" y="14" fill="#334155" font-size="6" text-anchor="middle" font-weight="600">ESCENARIO</text>
      <line x1="225" y1="80" x2="297" y2="80" stroke="#1e3a5f" stroke-width="0.6"/>
      <line x1="261" y1="20" x2="261" y2="157" stroke="#1e3a5f" stroke-width="0.6"/>
      <ellipse cx="261" cy="70" rx="13" ry="15" fill="#4f46e5"/>
      <circle cx="257" cy="66" r="2.8" fill="#dbeafe"/>
      <circle cx="265" cy="66" r="2.8" fill="#dbeafe"/>
      <path d="M257 73 Q261 77 265 73" stroke="#c4b5fd" stroke-width="1.5" fill="none"/>
    </svg>`,

    // Step 1: Blocks panel
    `<svg viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
      <rect width="300" height="140" fill="#0b1220" rx="8"/>
      <rect x="4" y="4" width="90" height="132" fill="#111827" rx="6" stroke="#3b82f6" stroke-width="2"/>
      <text x="49" y="18" fill="#60a5fa" font-size="7.5" text-anchor="middle" font-weight="700">Panel de Bloques</text>
      <rect x="10" y="26" width="78" height="13" fill="#FFAB19" rx="5"/>
      <text x="49" y="36" fill="white" font-size="7.5" text-anchor="middle">Eventos</text>
      <rect x="10" y="43" width="78" height="13" fill="#4C97FF" rx="5"/>
      <text x="49" y="53" fill="white" font-size="7.5" text-anchor="middle">Movimiento</text>
      <rect x="10" y="60" width="78" height="13" fill="#9966FF" rx="5"/>
      <text x="49" y="70" fill="white" font-size="7.5" text-anchor="middle">Apariencia</text>
      <rect x="10" y="77" width="78" height="13" fill="#FFAB19" rx="5"/>
      <text x="49" y="87" fill="white" font-size="7.5" text-anchor="middle">Control</text>
      <path d="M100 70 L130 70 L122 62 M130 70 L122 78" stroke="#3b82f6" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <rect x="136" y="30" width="150" height="14" fill="#1e293b" rx="4"/>
      <text x="211" y="41" fill="#475569" font-size="7" text-anchor="middle">Haz clic en una categoria</text>
      <rect x="136" y="50" width="150" height="14" fill="#1e293b" rx="4"/>
      <text x="211" y="61" fill="#475569" font-size="7" text-anchor="middle">para ver sus bloques</text>
      <rect x="136" y="70" width="150" height="14" fill="#1e293b" rx="4"/>
      <text x="211" y="81" fill="#475569" font-size="7" text-anchor="middle">Arrastralos al area central</text>
    </svg>`,

    // Step 2: Workspace / connect blocks
    `<svg viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
      <rect width="300" height="140" fill="#0b1220" rx="8"/>
      <rect x="4" y="4" width="292" height="132" fill="#0f172a" rx="6" stroke="#3b82f6" stroke-width="2"/>
      <text x="150" y="19" fill="#60a5fa" font-size="7.5" text-anchor="middle" font-weight="700">Area de Trabajo</text>
      <rect x="60" y="28" width="100" height="15" fill="#FFAB19" rx="6"/>
      <text x="110" y="39" fill="white" font-size="7.5" text-anchor="middle">Al hacer clic en la bandera</text>
      <path d="M78 43 L78 50" stroke="#FFAB19" stroke-width="2"/>
      <rect x="60" y="50" width="100" height="15" fill="#4C97FF" rx="6"/>
      <text x="110" y="61" fill="white" font-size="7.5" text-anchor="middle">Mover 10 pasos</text>
      <path d="M78 65 L78 72" stroke="#4C97FF" stroke-width="2"/>
      <rect x="60" y="72" width="100" height="15" fill="#4C97FF" rx="6"/>
      <text x="110" y="83" fill="white" font-size="7.5" text-anchor="middle">Girar derecha 15 grados</text>
      <path d="M78 87 L78 94" stroke="#4C97FF" stroke-width="2"/>
      <rect x="60" y="94" width="100" height="15" fill="#FFAB19" rx="6"/>
      <text x="110" y="105" fill="white" font-size="7.5" text-anchor="middle">Por siempre</text>
      <text x="210" y="55" fill="#64748b" font-size="7" text-anchor="middle">Los bloques se</text>
      <text x="210" y="67" fill="#64748b" font-size="7" text-anchor="middle">conectan como</text>
      <text x="210" y="79" fill="#64748b" font-size="7" text-anchor="middle">un rompecabezas</text>
      <path d="M168 43 Q185 43 185 65 L185 75" stroke="#475569" stroke-width="1.2" fill="none" stroke-dasharray="3,2"/>
      <polygon points="182,75 185,82 188,75" fill="#475569"/>
    </svg>`,

    // Step 3: Stage
    `<svg viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
      <rect width="300" height="140" fill="#0b1220" rx="8"/>
      <rect x="4" y="4" width="292" height="132" fill="#111827" rx="6" stroke="#3b82f6" stroke-width="2"/>
      <text x="150" y="19" fill="#60a5fa" font-size="7.5" text-anchor="middle" font-weight="700">Escenario</text>
      <rect x="60" y="24" width="180" height="105" fill="#0d1b2a" rx="5"/>
      <line x1="60" y1="76" x2="240" y2="76" stroke="#1e3a5f" stroke-width="0.8"/>
      <line x1="150" y1="24" x2="150" y2="129" stroke="#1e3a5f" stroke-width="0.8"/>
      <circle cx="150" cy="68" r="16" fill="#4f46e5"/>
      <circle cx="145" cy="64" r="3.5" fill="#dbeafe"/>
      <circle cx="155" cy="64" r="3.5" fill="#dbeafe"/>
      <path d="M145 72 Q150 77 155 72" stroke="#c4b5fd" stroke-width="2" fill="none"/>
      <rect x="146" y="84" width="8" height="14" fill="#1e3a5f" rx="3"/>
      <rect x="155" y="84" width="8" height="14" fill="#1e3a5f" rx="3"/>
      <path d="M136 57 Q150 24 182 70" stroke="#3b82f6" stroke-width="1" fill="none" stroke-dasharray="3,2" opacity="0.5"/>
      <circle cx="136" cy="57" r="2.5" fill="#3b82f6" opacity="0.7"/>
      <text x="69" y="124" fill="#334155" font-size="6.5">x: 0   y: 0</text>
    </svg>`,

    // Step 4: Execute
    `<svg viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
      <rect width="300" height="140" fill="#0b1220" rx="8"/>
      <rect x="4" y="4" width="292" height="132" fill="#0f172a" rx="6"/>
      <rect x="20" y="16" width="260" height="40" fill="#111827" rx="6"/>
      <text x="60" y="42" fill="#94a3b8" font-size="8" text-anchor="middle">&#8592; Volver</text>
      <rect x="128" y="25" width="72" height="24" fill="#16a34a" rx="5" stroke="#4ade80" stroke-width="1.5"/>
      <text x="164" y="41" fill="white" font-size="9" text-anchor="middle" font-weight="700">&#9654; Ejecutar</text>
      <rect x="206" y="25" width="66" height="24" fill="#dc2626" rx="5"/>
      <text x="239" y="41" fill="white" font-size="9" text-anchor="middle" font-weight="700">&#9632; Detener</text>
      <path d="M164 50 L164 65" stroke="#4ade80" stroke-width="2" stroke-dasharray="3,2"/>
      <polygon points="160,65 164,74 168,65" fill="#4ade80"/>
      <rect x="80" y="76" width="140" height="42" fill="#0d1b2a" rx="5"/>
      <circle cx="150" cy="97" r="11" fill="#4f46e5"/>
      <circle cx="147" cy="94" r="2.5" fill="#dbeafe"/>
      <circle cx="153" cy="94" r="2.5" fill="#dbeafe"/>
      <path d="M147 100 Q150 104 153 100" stroke="#c4b5fd" stroke-width="1.5" fill="none"/>
      <rect x="63" y="124" width="100" height="10" fill="#0d2a1a" rx="3"/>
      <text x="113" y="132" fill="#4ade80" font-size="7" text-anchor="middle">Cody se mueve en el escenario</text>
    </svg>`,
  ];

  /* ================================================================
     TUTORIAL DATA
     ================================================================ */
  const STEPS = [
    {
      title: 'Bienvenido al Laboratorio de Codigo',
      desc: 'Aqui puedes programar a <b>Cody</b>, el robot de CodeKids, usando bloques de colores. Cada bloque es una instruccion. Conectalos para crear programas que le digan a Cody que hacer.',
      svg: TUT_SVG[0],
    },
    {
      title: 'Panel de Bloques',
      desc: 'A la <b>izquierda</b> estan todas las instrucciones, organizadas por categorias: <b style="color:#FFAB19">Eventos</b>, <b style="color:#4C97FF">Movimiento</b>, <b style="color:#9966FF">Apariencia</b> y <b style="color:#FFAB19">Control</b>. Haz clic en una categoria para ver sus bloques.',
      svg: TUT_SVG[1],
    },
    {
      title: 'Area de Trabajo',
      desc: 'El <b>centro</b> es el area de trabajo. Arrastra bloques desde el panel izquierdo y encajalos uno debajo del otro, como piezas de rompecabezas. El programa se ejecuta de arriba hacia abajo.',
      svg: TUT_SVG[2],
    },
    {
      title: 'El Escenario',
      desc: 'A la <b>derecha</b> esta el escenario: aqui veras a Cody moverse, girar y hablar cuando ejecutes tu programa. Las coordenadas <b>x</b> e <b>y</b> muestran la posicion de Cody en tiempo real.',
      svg: TUT_SVG[3],
    },
    {
      title: 'Ejecuta tu primer programa',
      desc: 'Ya hay un programa de ejemplo listo. Pulsa <b>Ejecutar</b> para verlo en accion: Cody saludara y luego se movera rebotando. Modifica los numeros de los bloques o agrega nuevos bloques para cambiar su comportamiento.',
      svg: TUT_SVG[4],
      isLast: true,
    },
  ];

  /* ================================================================
     TUTORIAL LOGIC
     ================================================================ */
  function _tutRender(idx) {
    tutStep = idx;
    const s = STEPS[idx];
    document.getElementById('lab-tut-badge').textContent = 'Paso ' + (idx + 1) + ' de ' + STEPS.length;
    document.getElementById('lab-tut-title').textContent = s.title;
    document.getElementById('lab-tut-desc').innerHTML   = s.desc;
    document.getElementById('lab-tut-illus').innerHTML  = s.svg;

    const dots = document.getElementById('lab-tut-dots');
    dots.innerHTML = STEPS.map(function(_, i) {
      return '<span class="lab-tut-dot' + (i === idx ? ' on' : '') + '"></span>';
    }).join('');

    const prev = document.getElementById('lab-tut-prev');
    const next = document.getElementById('lab-tut-next');
    prev.style.visibility = idx === 0 ? 'hidden' : 'visible';
    next.textContent       = s.isLast ? 'Comenzar' : 'Siguiente';
  }

  function _tutShow() {
    const el = document.getElementById('lab-tutorial-overlay');
    if (el) { el.style.display = 'flex'; _tutRender(0); }
  }

  function _tutHide() {
    const el = document.getElementById('lab-tutorial-overlay');
    if (el) el.style.display = 'none';
    try { localStorage.setItem('ck_lab_tut_done', '1'); } catch (_) {}
  }

  function _initTutorial() {
    const prev = document.getElementById('lab-tut-prev');
    const next = document.getElementById('lab-tut-next');
    const skip = document.getElementById('lab-tut-skip');

    prev.addEventListener('click', function() { if (tutStep > 0) _tutRender(tutStep - 1); });
    next.addEventListener('click', function() {
      if (tutStep < STEPS.length - 1) _tutRender(tutStep + 1);
      else _tutHide();
    });
    skip.addEventListener('click', _tutHide);

    document.getElementById('lab-tutorial-overlay').addEventListener('click', function(e) {
      if (e.target.id === 'lab-tutorial-overlay') _tutHide();
    });
  }

  /* ================================================================
     STATUS HELPER
     ================================================================ */
  function _setStatus(text, running) {
    const el = document.getElementById('lab-status-text');
    if (!el) return;
    el.textContent = text;
    el.className   = 'lab-stage-status' + (running ? ' running' : '');
  }

  /* ================================================================
     SPRITE VM
     ================================================================ */
  function SpriteVM(canvas, type, initX, initY) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext('2d');
    this.W        = canvas.width;
    this.H        = canvas.height;
    this.type     = type   || 'cody';
    this.initX    = (initX !== undefined) ? initX : 0;
    this.initY    = (initY !== undefined) ? initY : 0;
    this.sprite   = this._defaultSprite();
    this.running  = false;
    this.stopFlag = false;
  }

  SpriteVM.prototype._defaultSprite = function() {
    return { x: this.initX, y: this.initY, direction: 90, visible: true, saying: null, sayUntil: 0, size: 100 };
  };

  SpriteVM.prototype._sc = function(sx, sy) {
    return { cx: sx + this.W / 2, cy: this.H / 2 - sy };
  };

  SpriteVM.prototype.clamp = function(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  };

  /* ── Shared render loop (draws all sprites each frame) ───────────────────── */
  function _sharedTick() {
    if (!sharedLoopActive) return;
    var ctx = sharedCtx, W = sharedCanvas.width, H = sharedCanvas.height;
    ctx.clearRect(0, 0, W, H);

    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0b1220'); bg.addColorStop(1, '#0d1a2e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1;
    for (var gx = 0; gx <= W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke(); }
    for (var gy = 0; gy <= H; gy += 40) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke(); }

    ctx.strokeStyle = 'rgba(59,130,246,0.12)'; ctx.lineWidth = 1; ctx.setLineDash([5,8]);
    ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,H/2); ctx.lineTo(W,H/2); ctx.stroke();
    ctx.setLineDash([]);

    var now = Date.now(), anyRunning = false;
    for (var i = 0; i < spriteOrder.length; i++) {
      var sid = spriteOrder[i];
      var spvm = spriteVMs[sid];
      if (!spvm || !spvm.sprite.visible) continue;
      spvm._drawSprite();
      if (spvm.sprite.saying) {
        if (spvm.sprite.sayUntil === Infinity || now < spvm.sprite.sayUntil) {
          spvm._drawBubble(spvm.sprite.saying);
        } else {
          spvm.sprite.saying = null;
        }
      }
      if (spvm.running) anyRunning = true;
    }

    // Coordinate overlay for selected sprite
    var sel = spriteVMs[selectedSprite];
    if (sel) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(4, H-28, 192, 24, 5) : (function(){ ctx.moveTo(9,H-28); ctx.lineTo(191,H-28); ctx.arcTo(196,H-28,196,H-23,5); ctx.lineTo(196,H-9); ctx.arcTo(196,H-4,191,H-4,5); ctx.lineTo(9,H-4); ctx.arcTo(4,H-4,4,H-9,5); ctx.lineTo(4,H-23); ctx.arcTo(4,H-28,9,H-28,5); }());
      ctx.fill();
      ctx.fillStyle = '#475569'; ctx.font = '11px "Courier New",monospace'; ctx.textBaseline = 'middle';
      var sName = sel.type.charAt(0).toUpperCase() + sel.type.slice(1);
      ctx.fillText(sName + '  x:' + String(Math.round(sel.sprite.x)).padStart(4,'\u2007') + '  y:' + String(Math.round(sel.sprite.y)).padStart(4,'\u2007'), 12, H-16);
      ctx.textBaseline = 'alphabetic';
    }

    if (anyRunning) {
      ctx.fillStyle = '#4ade80';
      ctx.beginPath(); ctx.arc(W-12, 12, 5, 0, Math.PI*2); ctx.fill();
    }

    requestAnimationFrame(_sharedTick);
  }

  function _startSharedLoop(canvas) {
    if (sharedLoopActive) return;
    sharedCanvas = canvas;
    sharedCtx    = canvas.getContext('2d');
    sharedLoopActive = true;
    _sharedTick();
  }

  SpriteVM.prototype._drawSprite = function() {
    switch (this.type) {
      case 'nova':    this._drawNova();    break;
      case 'rex':     this._drawRex();     break;
      case 'pixel':   this._drawPixel();   break;
      case 'luna':    this._drawLuna();    break;
      case 'spark':   this._drawSpark();   break;
      case 'bubbles': this._drawBubbles(); break;
      case 'turbo':   this._drawTurbo();   break;
      default:        this._drawCody();    break;
    }
  };

  SpriteVM.prototype._drawCody = function() {
    var ctx = this.ctx;
    var pos = this._sc(this.sprite.x, this.sprite.y);
    var cx = pos.cx, cy = pos.cy;
    var sc = this.sprite.size / 100;
    var u = 1;
    var self = this;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((this.sprite.direction - 90) * Math.PI / 180);
    ctx.scale(sc, sc);

    function fp(fn) { fn(); ctx.fill(); }
    function rr(x, y, w, h, r) { self._rr(ctx, x, y, w, h, r); }

    // Legs
    ctx.fillStyle = '#1e3a5f';
    fp(function() { rr(-18*u, 22*u, 14*u, 22*u, 5*u); });
    fp(function() { rr(4*u, 22*u, 14*u, 22*u, 5*u); });

    // Feet
    ctx.fillStyle = '#0f2744';
    fp(function() { rr(-21*u, 38*u, 17*u, 9*u, 5*u); });
    fp(function() { rr(4*u, 38*u, 17*u, 9*u, 5*u); });

    // Body
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
    var bodyG = ctx.createLinearGradient(-24*u, -22*u, 24*u, 26*u);
    bodyG.addColorStop(0, '#3b82f6');
    bodyG.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = bodyG;
    fp(function() { rr(-24*u, -22*u, 48*u, 48*u, 9*u); });
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // Chest reactor
    var rg = ctx.createRadialGradient(0, 2*u, 0, 0, 2*u, 9*u);
    rg.addColorStop(0, '#7dd3fc');
    rg.addColorStop(0.5, '#0ea5e9');
    rg.addColorStop(1, '#0369a1');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(0, 2*u, 9*u, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(125,211,252,0.3)';
    ctx.beginPath(); ctx.arc(0, 2*u, 14*u, 0, Math.PI * 2); ctx.fill();

    // Arms
    ctx.fillStyle = '#2563eb';
    fp(function() { rr(-40*u, -14*u, 18*u, 11*u, 5*u); });
    fp(function() { rr(22*u, -14*u, 18*u, 11*u, 5*u); });

    // Hands
    var hg1 = ctx.createRadialGradient(-40*u, -9*u, 0, -40*u, -9*u, 8*u);
    hg1.addColorStop(0, '#93c5fd'); hg1.addColorStop(1, '#3b82f6');
    ctx.fillStyle = hg1;
    ctx.beginPath(); ctx.arc(-40*u, -9*u, 8*u, 0, Math.PI * 2); ctx.fill();
    var hg2 = ctx.createRadialGradient(40*u, -9*u, 0, 40*u, -9*u, 8*u);
    hg2.addColorStop(0, '#93c5fd'); hg2.addColorStop(1, '#3b82f6');
    ctx.fillStyle = hg2;
    ctx.beginPath(); ctx.arc(40*u, -9*u, 8*u, 0, Math.PI * 2); ctx.fill();

    // Neck
    ctx.fillStyle = '#1d4ed8';
    fp(function() { rr(-9*u, -32*u, 18*u, 13*u, 4*u); });

    // Head
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    var headG = ctx.createLinearGradient(-24*u, -70*u, 24*u, -30*u);
    headG.addColorStop(0, '#7c3aed');
    headG.addColorStop(1, '#5b21b6');
    ctx.fillStyle = headG;
    fp(function() { rr(-24*u, -70*u, 48*u, 40*u, 12*u); });
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // Ear mounts
    ctx.fillStyle = '#4c1d95';
    fp(function() { rr(-31*u, -60*u, 8*u, 17*u, 4*u); });
    fp(function() { rr(23*u, -60*u, 8*u, 17*u, 4*u); });

    // Antenna
    ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 3*u; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -70*u); ctx.lineTo(0, -84*u); ctx.stroke();
    var ag = ctx.createRadialGradient(0, -88*u, 0, 0, -88*u, 7*u);
    ag.addColorStop(0, '#f0abfc'); ag.addColorStop(1, '#a855f7');
    ctx.fillStyle = ag;
    ctx.beginPath(); ctx.arc(0, -88*u, 6.5*u, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(240,171,252,0.2)';
    ctx.beginPath(); ctx.arc(0, -88*u, 12*u, 0, Math.PI * 2); ctx.fill();

    // Eyes sclera
    ctx.fillStyle = '#dbeafe';
    ctx.beginPath(); ctx.arc(-11*u, -52*u, 10*u, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(11*u, -52*u, 10*u, 0, Math.PI * 2); ctx.fill();

    // Eyes iris
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.arc(-11*u, -52*u, 7*u, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(11*u, -52*u, 7*u, 0, Math.PI * 2); ctx.fill();

    // Eyes pupil
    ctx.fillStyle = '#082f49';
    ctx.beginPath(); ctx.arc(-10*u, -53*u, 3.5*u, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12*u, -53*u, 3.5*u, 0, Math.PI * 2); ctx.fill();

    // Eyes shine
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-9*u, -55*u, 2*u, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(13*u, -55*u, 2*u, 0, Math.PI * 2); ctx.fill();

    // Eyebrows
    ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 2.5*u; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-17*u, -63*u); ctx.quadraticCurveTo(-11*u, -66*u, -5*u, -63*u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5*u, -63*u); ctx.quadraticCurveTo(11*u, -66*u, 17*u, -63*u); ctx.stroke();

    // Mouth
    ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 2.5*u;
    ctx.beginPath(); ctx.arc(0, -40*u, 10*u, 0.22, Math.PI - 0.22); ctx.stroke();

    ctx.restore();
  };

  /* ── Nova: cosmic star girl ─────────────────────────────────── */
  SpriteVM.prototype._drawNova = function() {
    var ctx = this.ctx;
    var pos = this._sc(this.sprite.x, this.sprite.y);
    var cx = pos.cx, cy = pos.cy;
    var sc = this.sprite.size / 100;
    var u = 1;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((this.sprite.direction - 90) * Math.PI / 180);
    ctx.scale(sc, sc);

    // Glow aura
    var aura = ctx.createRadialGradient(0, -10*u, 0, 0, -10*u, 60*u);
    aura.addColorStop(0, 'rgba(251,191,36,0.18)');
    aura.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, -10*u, 60*u, 0, Math.PI*2); ctx.fill();

    // Skirt/body (hexagonal star shape)
    function star6(ctx, cx2, cy2, r1, r2, pts) {
      ctx.beginPath();
      for (var i = 0; i < pts * 2; i++) {
        var r = (i % 2 === 0) ? r1 : r2;
        var a = (Math.PI / pts) * i - Math.PI / 2;
        if (i === 0) ctx.moveTo(cx2 + r * Math.cos(a), cy2 + r * Math.sin(a));
        else ctx.lineTo(cx2 + r * Math.cos(a), cy2 + r * Math.sin(a));
      }
      ctx.closePath();
    }

    // Dress / lower body (wide star)
    var dressG = ctx.createRadialGradient(0, 20*u, 0, 0, 20*u, 34*u);
    dressG.addColorStop(0, '#f97316');
    dressG.addColorStop(1, '#c2410c');
    ctx.fillStyle = dressG;
    star6(ctx, 0, 22*u, 32*u, 18*u, 6);
    ctx.fill();

    // Sparkle dots on dress
    ctx.fillStyle = 'rgba(253,224,71,0.6)';
    [[16*u, 16*u], [-18*u, 20*u], [4*u, 34*u]].forEach(function(p) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 2.5*u, 0, Math.PI*2); ctx.fill();
    });

    // Torso
    var torsoG = ctx.createLinearGradient(-14*u, -30*u, 14*u, 10*u);
    torsoG.addColorStop(0, '#fb923c');
    torsoG.addColorStop(1, '#ea580c');
    ctx.fillStyle = torsoG;
    this._rr(ctx, -14*u, -28*u, 28*u, 38*u, 9*u);
    ctx.fill();

    // Star badge on chest
    ctx.fillStyle = '#fde68a';
    star6(ctx, 0, -8*u, 8*u, 4*u, 5);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(0, -8*u, 3*u, 0, Math.PI*2); ctx.fill();

    // Arms
    ctx.fillStyle = '#fb923c';
    this._rr(ctx, -30*u, -22*u, 17*u, 10*u, 5*u); ctx.fill();
    this._rr(ctx, 13*u, -22*u, 17*u, 10*u, 5*u); ctx.fill();
    // Hands with sparkle
    var hg1 = ctx.createRadialGradient(-30*u, -17*u, 0, -30*u, -17*u, 8*u);
    hg1.addColorStop(0, '#fde68a'); hg1.addColorStop(1, '#f97316');
    ctx.fillStyle = hg1;
    ctx.beginPath(); ctx.arc(-30*u, -17*u, 8*u, 0, Math.PI*2); ctx.fill();
    var hg2 = ctx.createRadialGradient(30*u, -17*u, 0, 30*u, -17*u, 8*u);
    hg2.addColorStop(0, '#fde68a'); hg2.addColorStop(1, '#f97316');
    ctx.fillStyle = hg2;
    ctx.beginPath(); ctx.arc(30*u, -17*u, 8*u, 0, Math.PI*2); ctx.fill();

    // Neck
    ctx.fillStyle = '#ea580c';
    this._rr(ctx, -7*u, -38*u, 14*u, 12*u, 4*u); ctx.fill();

    // Head
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
    var headG = ctx.createRadialGradient(-4*u, -62*u, 2*u, 0, -56*u, 26*u);
    headG.addColorStop(0, '#fde68a');
    headG.addColorStop(0.6, '#fbbf24');
    headG.addColorStop(1, '#d97706');
    ctx.fillStyle = headG;
    ctx.beginPath(); ctx.arc(0, -56*u, 26*u, 0, Math.PI*2); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // Halo
    ctx.strokeStyle = 'rgba(253,224,71,0.85)'; ctx.lineWidth = 3*u;
    ctx.setLineDash([5*u, 4*u]);
    ctx.beginPath(); ctx.arc(0, -56*u, 34*u, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);

    // Hair spikes (top)
    ctx.fillStyle = '#f97316';
    [[-12*u,-80*u,6*u], [-4*u,-84*u,5*u], [4*u,-84*u,5*u], [12*u,-80*u,6*u]].forEach(function(p) {
      ctx.beginPath(); ctx.arc(p[0], p[1], p[2]*u, 0, Math.PI*2); ctx.fill();
    });

    // Eyes
    ctx.fillStyle = '#1c1917';
    ctx.beginPath(); ctx.arc(-10*u, -58*u, 9*u, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(10*u, -58*u, 9*u, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath(); ctx.arc(-10*u, -58*u, 5.5*u, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(10*u, -58*u, 5.5*u, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#78350f';
    ctx.beginPath(); ctx.arc(-9*u, -59*u, 3*u, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(11*u, -59*u, 3*u, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-8*u, -61*u, 1.8*u, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(12*u, -61*u, 1.8*u, 0, Math.PI*2); ctx.fill();

    // Rosy cheeks
    ctx.fillStyle = 'rgba(251,113,133,0.4)';
    ctx.beginPath(); ctx.ellipse(-16*u, -52*u, 7*u, 4.5*u, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(16*u, -52*u, 7*u, 4.5*u, 0, 0, Math.PI*2); ctx.fill();

    // Smile
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2.5*u; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -48*u, 9*u, 0.25, Math.PI - 0.25); ctx.stroke();

    ctx.restore();
  };

  /* ── Rex: friendly green dinosaur ──────────────────────────── */
  SpriteVM.prototype._drawRex = function() {
    var ctx = this.ctx;
    var pos = this._sc(this.sprite.x, this.sprite.y);
    var cx = pos.cx, cy = pos.cy;
    var sc = this.sprite.size / 100;
    var u = 1;
    var self = this;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((this.sprite.direction - 90) * Math.PI / 180);
    ctx.scale(sc, sc);

    // Tail
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.moveTo(22*u, 10*u);
    ctx.quadraticCurveTo(50*u, 20*u, 52*u, 5*u);
    ctx.quadraticCurveTo(54*u, -8*u, 38*u, -2*u);
    ctx.closePath(); ctx.fill();

    // Legs
    ctx.fillStyle = '#16a34a';
    this._rr(ctx, -20*u, 22*u, 16*u, 22*u, 6*u); ctx.fill();
    this._rr(ctx, 4*u, 22*u, 16*u, 22*u, 6*u); ctx.fill();
    // Feet
    ctx.fillStyle = '#14532d';
    this._rr(ctx, -24*u, 38*u, 20*u, 10*u, 5*u); ctx.fill();
    this._rr(ctx, 4*u, 38*u, 20*u, 10*u, 5*u); ctx.fill();
    // Claws on feet
    ctx.fillStyle = '#fde68a';
    [[-21*u,48*u],[-14*u,48*u],[-7*u,48*u],[6*u,48*u],[13*u,48*u],[20*u,48*u]].forEach(function(p) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 2.5*u, 0, Math.PI*2); ctx.fill();
    });

    // Body
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
    var bodyG = ctx.createLinearGradient(-26*u, -20*u, 26*u, 28*u);
    bodyG.addColorStop(0, '#4ade80');
    bodyG.addColorStop(1, '#16a34a');
    ctx.fillStyle = bodyG;
    this._rr(ctx, -26*u, -20*u, 52*u, 48*u, 12*u); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // Belly
    var bellyG = ctx.createRadialGradient(0, 8*u, 0, 0, 8*u, 18*u);
    bellyG.addColorStop(0, '#bbf7d0');
    bellyG.addColorStop(1, '#86efac');
    ctx.fillStyle = bellyG;
    this._rr(ctx, -14*u, -8*u, 28*u, 30*u, 10*u); ctx.fill();

    // Arms (tiny T-rex style)
    ctx.fillStyle = '#22c55e';
    this._rr(ctx, -38*u, -10*u, 14*u, 10*u, 5*u); ctx.fill();
    this._rr(ctx, 24*u, -10*u, 14*u, 10*u, 5*u); ctx.fill();
    // Claws
    ctx.fillStyle = '#fde68a';
    ctx.beginPath(); ctx.arc(-38*u, -6*u, 4.5*u, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(38*u, -6*u, 4.5*u, 0, Math.PI*2); ctx.fill();

    // Neck
    ctx.fillStyle = '#22c55e';
    this._rr(ctx, -10*u, -30*u, 20*u, 12*u, 5*u); ctx.fill();

    // Head
    ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    var headG = ctx.createLinearGradient(-28*u, -74*u, 28*u, -28*u);
    headG.addColorStop(0, '#86efac');
    headG.addColorStop(1, '#22c55e');
    ctx.fillStyle = headG;
    this._rr(ctx, -28*u, -74*u, 56*u, 46*u, 14*u); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // Spikes on head (top)
    ctx.fillStyle = '#15803d';
    [[-16*u,-78*u,5*u,12*u], [-5*u,-82*u,5*u,14*u], [6*u,-80*u,5*u,12*u], [16*u,-76*u,4*u,10*u]].forEach(function(p) {
      ctx.beginPath();
      ctx.moveTo(p[0]-p[2]*u, p[1]+p[3]*u);
      ctx.lineTo(p[0], p[1]-p[3]*0.5*u);
      ctx.lineTo(p[0]+p[2]*u, p[1]+p[3]*u);
      ctx.closePath(); ctx.fill();
    });

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-11*u, -55*u, 10*u, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(11*u, -55*u, 10*u, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(-10*u, -56*u, 6*u, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(12*u, -56*u, 6*u, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath(); ctx.arc(-9*u, -57*u, 3.5*u, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(13*u, -57*u, 3.5*u, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#0c4a6e';
    ctx.beginPath(); ctx.arc(-9*u, -57*u, 2*u, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(13*u, -57*u, 2*u, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-8*u, -59*u, 1.5*u, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(14*u, -59*u, 1.5*u, 0, Math.PI*2); ctx.fill();

    // Nostrils
    ctx.fillStyle = 'rgba(21,128,61,0.7)';
    ctx.beginPath(); ctx.arc(-5*u, -36*u, 2.5*u, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(5*u, -36*u, 2.5*u, 0, Math.PI*2); ctx.fill();

    // Teeth + smile
    ctx.strokeStyle = '#14532d'; ctx.lineWidth = 2.5*u; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -42*u, 14*u, 0.2, Math.PI-0.2); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    [[-8*u,-40*u,3*u,5*u],[0*u,-39*u,3*u,5*u],[8*u,-40*u,3*u,5*u]].forEach(function(p) {
      self._rr(ctx, p[0]-p[2]/2, p[1], p[2], p[3], 1.5*u); ctx.fill();
    });

    ctx.restore();
  };

  /* ── Pixel: cyan pixel-art cube robot ───────────────────────── */
  SpriteVM.prototype._drawPixel = function() {
    var ctx = this.ctx;
    var pos = this._sc(this.sprite.x, this.sprite.y);
    var cx = pos.cx, cy = pos.cy;
    var sc = this.sprite.size / 100;
    var u = 1;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((this.sprite.direction - 90) * Math.PI / 180);
    ctx.scale(sc, sc);

    function px(x, y, w, h, col) {
      ctx.fillStyle = col;
      ctx.fillRect(x*u, y*u, w*u, h*u);
    }
    function pxO(x, y, w, h, stroke, lw) {
      ctx.strokeStyle = stroke; ctx.lineWidth = lw*u;
      ctx.strokeRect(x*u+lw*u/2, y*u+lw*u/2, (w-lw)*u, (h-lw)*u);
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(-28*u, 44*u, 56*u, 5*u);

    // Legs (pixel blocks)
    px(-20, 24, 16, 22, '#0891b2');
    px(-4, 24, 16, 22, '#0891b2');
    // Feet
    px(-22, 42, 20, 10, '#0c4a6e');
    px(-2, 42, 20, 10, '#0c4a6e');
    // Pixel feet detail
    px(-22, 50, 4, 2, '#67e8f9'); px(-2, 50, 4, 2, '#67e8f9');

    // Body (big pixel block)
    px(-26, -20, 52, 48, '#06b6d4');
    // Body highlight
    px(-24, -18, 20, 4, '#67e8f9');
    px(-24, -18, 4, 44, '#67e8f9');
    // Body shadow edge
    px(22, -20, 4, 48, '#0891b2');
    px(-26, 24, 52, 4, '#0891b2');

    // Chest LED grid (3x3 pixel display)
    var ledColors = ['#4ade80','#fbbf24','#f87171','#60a5fa','#c084fc','#34d399','#fcd34d','#fb7185','#818cf8'];
    for (var row = 0; row < 3; row++) {
      for (var col = 0; col < 3; col++) {
        ctx.fillStyle = ledColors[row*3+col];
        ctx.fillRect((-10+col*8)*u, (-12+row*8)*u, 6*u, 6*u);
      }
    }
    pxO(-14, -16, 28, 28, '#0369a1', 1.5);

    // Arms (pixel blocks)
    px(-42, -16, 16, 10, '#0891b2');
    px(26, -16, 16, 10, '#0891b2');
    // Hands
    px(-44, -18, 18, 14, '#0c4a6e');
    px(26, -18, 18, 14, '#0c4a6e');
    px(-44, -18, 4, 4, '#67e8f9'); // gloves highlight
    px(26, -18, 4, 4, '#67e8f9');

    // Neck (2 pixel blocks)
    px(-8, -28, 16, 10, '#0891b2');
    px(-6, -32, 12, 6, '#067a8a');

    // Head (square pixel)
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    px(-26, -72, 52, 46, '#22d3ee');
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    // Head highlight
    px(-24, -70, 18, 4, '#a5f3fc');
    px(-24, -70, 4, 42, '#a5f3fc');
    // Head shadow
    px(22, -72, 4, 46, '#0891b2');
    px(-26, -28, 52, 4, '#0891b2');

    // Antenna (pixel)
    px(-4, -78, 8, 8, '#22d3ee');
    px(-2, -90, 4, 14, '#0891b2');
    px(-6, -96, 12, 8, '#fbbf24'); // blinky tip
    px(-4, -98, 8, 4, '#fde68a');

    // Eyes (big pixel squares)
    ctx.fillStyle = '#0c4a6e'; ctx.fillRect(-20*u, -62*u, 18*u, 18*u);
    ctx.fillStyle = '#0c4a6e'; ctx.fillRect(2*u, -62*u, 18*u, 18*u);
    ctx.fillStyle = '#67e8f9'; ctx.fillRect(-18*u, -60*u, 14*u, 14*u);
    ctx.fillStyle = '#67e8f9'; ctx.fillRect(4*u, -60*u, 14*u, 14*u);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-16*u, -58*u, 8*u, 8*u);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(6*u, -58*u, 8*u, 8*u);
    ctx.fillStyle = '#0369a1'; ctx.fillRect(-12*u, -54*u, 5*u, 5*u);
    ctx.fillStyle = '#0369a1'; ctx.fillRect(10*u, -54*u, 5*u, 5*u);
    // Pixel shine dots
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-16*u, -58*u, 3*u, 3*u);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(6*u, -58*u, 3*u, 3*u);

    // Mouth (pixel row)
    ctx.fillStyle = '#0c4a6e';
    ctx.fillRect(-14*u, -42*u, 4*u, 4*u);
    ctx.fillRect(-8*u, -40*u, 4*u, 6*u);
    ctx.fillRect(-2*u, -40*u, 4*u, 6*u);
    ctx.fillRect(4*u, -40*u, 4*u, 4*u);
    ctx.fillRect(10*u, -42*u, 4*u, 4*u);
    // Pixel mouth highlight
    ctx.fillStyle = '#a5f3fc';
    ctx.fillRect(-8*u, -40*u, 4*u, 2*u);
    ctx.fillRect(4*u, -40*u, 4*u, 2*u);

    ctx.restore();
  };

  /* ── Luna: moon witch girl ────────────────────────────────────────────────── */
  SpriteVM.prototype._drawLuna = function() {
    var ctx = this.ctx;
    var pos = this._sc(this.sprite.x, this.sprite.y);
    var cx = pos.cx, cy = pos.cy;
    var sc = this.sprite.size / 100;
    var u = 1;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((this.sprite.direction - 90) * Math.PI / 180);
    ctx.scale(sc, sc);

    // Magic aura
    var aura = ctx.createRadialGradient(0, -20*u, 0, 0, -20*u, 70*u);
    aura.addColorStop(0, 'rgba(167,139,250,0.13)');
    aura.addColorStop(1, 'rgba(139,92,246,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, -20*u, 70*u, 0, Math.PI*2); ctx.fill();

    // Robe bottom
    var robeG = ctx.createLinearGradient(-28*u, -10*u, 28*u, 50*u);
    robeG.addColorStop(0, '#4c1d95'); robeG.addColorStop(1, '#2e1065');
    ctx.fillStyle = robeG;
    ctx.beginPath();
    ctx.moveTo(-28*u, -10*u);
    ctx.quadraticCurveTo(-32*u, 20*u, -22*u, 50*u);
    ctx.lineTo(22*u, 50*u);
    ctx.quadraticCurveTo(32*u, 20*u, 28*u, -10*u);
    ctx.closePath(); ctx.fill();

    // Star sparkles on robe
    ctx.fillStyle = 'rgba(196,181,253,0.55)';
    var stars = [[-16*u,15*u,3*u],[-4*u,30*u,2.5*u],[12*u,20*u,2*u],[6*u,40*u,3*u],[-20*u,38*u,2*u]];
    for (var si=0;si<stars.length;si++) {
      ctx.beginPath(); ctx.arc(stars[si][0],stars[si][1],stars[si][2],0,Math.PI*2); ctx.fill();
    }

    // Crescent moon badge
    ctx.fillStyle = '#fde68a';
    ctx.beginPath(); ctx.arc(-8*u, 4*u, 9*u, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#3b0764';
    ctx.beginPath(); ctx.arc(-4*u, 2*u, 7*u, 0, Math.PI*2); ctx.fill();

    // Body
    var bodyG = ctx.createLinearGradient(-16*u, -28*u, 16*u, 12*u);
    bodyG.addColorStop(0, '#6d28d9'); bodyG.addColorStop(1, '#4c1d95');
    ctx.fillStyle = bodyG;
    this._rr(ctx, -16*u, -28*u, 32*u, 40*u, 8*u); ctx.fill();

    // Cape sides
    ctx.fillStyle = '#3b0764';
    this._rr(ctx, -22*u, -24*u, 6*u, 38*u, 5*u); ctx.fill();
    this._rr(ctx, 16*u, -24*u, 6*u, 38*u, 5*u); ctx.fill();

    // Arms
    ctx.fillStyle = '#6d28d9';
    this._rr(ctx, -34*u, -20*u, 18*u, 10*u, 5*u); ctx.fill();
    this._rr(ctx, 16*u, -20*u, 18*u, 10*u, 5*u); ctx.fill();
    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath(); ctx.arc(-34*u, -15*u, 7*u, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(34*u, -15*u, 7*u, 0, Math.PI*2); ctx.fill();

    // Wand
    ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2.5*u; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(34*u, -15*u); ctx.lineTo(46*u, -36*u); ctx.stroke();
    var wg = ctx.createRadialGradient(46*u,-38*u,0,46*u,-38*u,7*u);
    wg.addColorStop(0,'#fde68a'); wg.addColorStop(0.6,'#c084fc'); wg.addColorStop(1,'rgba(167,139,250,0)');
    ctx.fillStyle = wg;
    ctx.beginPath(); ctx.arc(46*u,-38*u,7*u,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath(); ctx.arc(46*u,-38*u,3.5*u,0,Math.PI*2); ctx.fill();

    // Neck
    ctx.fillStyle = '#e9d5ff';
    this._rr(ctx, -8*u, -36*u, 16*u, 10*u, 4*u); ctx.fill();

    // Head
    ctx.shadowColor='rgba(0,0,0,0.35)'; ctx.shadowBlur=8; ctx.shadowOffsetY=3;
    var headG = ctx.createRadialGradient(-4*u,-58*u,2*u,0,-54*u,24*u);
    headG.addColorStop(0,'#f5d0fe'); headG.addColorStop(0.6,'#e9d5ff'); headG.addColorStop(1,'#c4b5fd');
    ctx.fillStyle = headG;
    ctx.beginPath(); ctx.arc(0,-54*u,24*u,0,Math.PI*2); ctx.fill();
    ctx.shadowColor='transparent'; ctx.shadowBlur=0; ctx.shadowOffsetY=0;

    // Hair
    ctx.fillStyle = '#3b0764';
    ctx.beginPath(); ctx.arc(-12*u,-52*u,14*u,Math.PI*0.5,Math.PI*1.7); ctx.fill();
    ctx.beginPath(); ctx.arc(12*u,-52*u,14*u,Math.PI*1.3,Math.PI*0.5+Math.PI); ctx.fill();
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath(); ctx.arc(0,-68*u,18*u,Math.PI,0); ctx.fill();

    // Witch hat
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath(); ctx.moveTo(-22*u,-76*u); ctx.lineTo(0,-116*u); ctx.lineTo(22*u,-76*u);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3730a3';
    this._rr(ctx,-28*u,-79*u,56*u,9*u,4*u); ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath(); ctx.arc(6*u,-96*u,4.5*u,0,Math.PI*2); ctx.fill();

    // Eyes
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath(); ctx.arc(-10*u,-56*u,9*u,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(10*u,-56*u,9*u,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath(); ctx.arc(-10*u,-56*u,6*u,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(10*u,-56*u,6*u,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2e1065';
    ctx.beginPath(); ctx.arc(-9*u,-57*u,3.5*u,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(11*u,-57*u,3.5*u,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-8*u,-59*u,2*u,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(12*u,-59*u,2*u,0,Math.PI*2); ctx.fill();

    // Smile
    ctx.strokeStyle='#7c3aed'; ctx.lineWidth=2.5*u; ctx.lineCap='round';
    ctx.beginPath(); ctx.arc(0,-47*u,9*u,0.2,Math.PI-0.2); ctx.stroke();

    ctx.restore();
  };

  /* ── Spark: electric energy robot ─────────────────────────────────────────── */
  SpriteVM.prototype._drawSpark = function() {
    var ctx = this.ctx;
    var pos = this._sc(this.sprite.x, this.sprite.y);
    var cx = pos.cx, cy = pos.cy;
    var sc = this.sprite.size / 100;
    var u = 1;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((this.sprite.direction - 90) * Math.PI / 180);
    ctx.scale(sc, sc);

    // Electric glow aura
    var aura = ctx.createRadialGradient(0,0,0,0,0,70*u);
    aura.addColorStop(0,'rgba(250,204,21,0.16)'); aura.addColorStop(1,'rgba(250,204,21,0)');
    ctx.fillStyle=aura; ctx.beginPath(); ctx.arc(0,0,70*u,0,Math.PI*2); ctx.fill();

    // Legs
    ctx.fillStyle='#854d0e';
    this._rr(ctx,-18*u,22*u,14*u,22*u,5*u); ctx.fill();
    this._rr(ctx,4*u,22*u,14*u,22*u,5*u); ctx.fill();
    ctx.fillStyle='#713f12';
    this._rr(ctx,-20*u,38*u,18*u,9*u,5*u); ctx.fill();
    this._rr(ctx,2*u,38*u,18*u,9*u,5*u); ctx.fill();

    // Body
    ctx.shadowColor='rgba(250,204,21,0.45)'; ctx.shadowBlur=14;
    var bodyG=ctx.createLinearGradient(-24*u,-22*u,24*u,26*u);
    bodyG.addColorStop(0,'#facc15'); bodyG.addColorStop(1,'#ca8a04');
    ctx.fillStyle=bodyG;
    this._rr(ctx,-24*u,-22*u,48*u,48*u,9*u); ctx.fill();
    ctx.shadowColor='transparent'; ctx.shadowBlur=0;

    // Lightning bolt on chest
    ctx.fillStyle='#1c1917';
    ctx.beginPath();
    ctx.moveTo(4*u,-18*u); ctx.lineTo(-6*u,2*u); ctx.lineTo(0,2*u);
    ctx.lineTo(-8*u,22*u); ctx.lineTo(10*u,-2*u); ctx.lineTo(4*u,-2*u);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(3*u,-16*u); ctx.lineTo(-4*u,0); ctx.lineTo(-1*u,0);
    ctx.lineTo(-6*u,17*u); ctx.lineTo(-2*u,4*u); ctx.lineTo(-7*u,4*u); ctx.lineTo(3*u,-16*u);
    ctx.closePath(); ctx.fill();

    // Arms
    ctx.fillStyle='#eab308';
    this._rr(ctx,-40*u,-14*u,18*u,10*u,5*u); ctx.fill();
    this._rr(ctx,22*u,-14*u,18*u,10*u,5*u); ctx.fill();
    // Hands with glow
    var hg=ctx.createRadialGradient(-40*u,-9*u,0,-40*u,-9*u,9*u);
    hg.addColorStop(0,'#fef08a'); hg.addColorStop(1,'#ca8a04');
    ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(-40*u,-9*u,9*u,0,Math.PI*2); ctx.fill();
    var hg2=ctx.createRadialGradient(40*u,-9*u,0,40*u,-9*u,9*u);
    hg2.addColorStop(0,'#fef08a'); hg2.addColorStop(1,'#ca8a04');
    ctx.fillStyle=hg2; ctx.beginPath(); ctx.arc(40*u,-9*u,9*u,0,Math.PI*2); ctx.fill();
    // Sparks from hands
    ctx.strokeStyle='#bef264'; ctx.lineWidth=2*u; ctx.lineCap='round';
    var sparks=[[-50*u,-14*u,-55*u,-8*u],[-55*u,-6*u,-50*u,-2*u],[46*u,-14*u,52*u,-8*u],[52*u,-6*u,46*u,-2*u]];
    for (var sk=0;sk<sparks.length;sk++){
      ctx.beginPath(); ctx.moveTo(sparks[sk][0],sparks[sk][1]); ctx.lineTo(sparks[sk][2],sparks[sk][3]); ctx.stroke();
    }

    // Neck
    ctx.fillStyle='#ca8a04';
    this._rr(ctx,-8*u,-30*u,16*u,10*u,4*u); ctx.fill();

    // Spiky hair (triangles)
    ctx.fillStyle='#fbbf24';
    var spikes=[[-16*u,-72*u],[-6*u,-78*u],[4*u,-80*u],[14*u,-74*u]];
    for (var sp=0;sp<spikes.length;sp++){
      ctx.beginPath();
      ctx.moveTo(spikes[sp][0]-7*u,spikes[sp][1]+14*u);
      ctx.lineTo(spikes[sp][0],spikes[sp][1]);
      ctx.lineTo(spikes[sp][0]+7*u,spikes[sp][1]+14*u);
      ctx.closePath(); ctx.fill();
    }

    // Head
    ctx.shadowColor='rgba(250,204,21,0.4)'; ctx.shadowBlur=10;
    var headG=ctx.createLinearGradient(-24*u,-70*u,24*u,-26*u);
    headG.addColorStop(0,'#fde047'); headG.addColorStop(1,'#ca8a04');
    ctx.fillStyle=headG;
    this._rr(ctx,-24*u,-70*u,48*u,42*u,12*u); ctx.fill();
    ctx.shadowColor='transparent'; ctx.shadowBlur=0;

    // Antenna + spark tip
    ctx.strokeStyle='#eab308'; ctx.lineWidth=3*u; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(0,-70*u); ctx.lineTo(0,-84*u); ctx.stroke();
    ctx.fillStyle='#bef264';
    ctx.beginPath(); ctx.arc(0,-88*u,6*u,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#fef08a'; ctx.lineWidth=1.5*u;
    var antSparks=[[-8*u,-95*u,-4*u,-90*u],[4*u,-96*u,8*u,-90*u],[0,-97*u,0,-92*u]];
    for (var as=0;as<antSparks.length;as++){
      ctx.beginPath(); ctx.moveTo(antSparks[as][0],antSparks[as][1]); ctx.lineTo(antSparks[as][2],antSparks[as][3]); ctx.stroke();
    }

    // Eyes (electric blue)
    ctx.fillStyle='#1c1917';
    ctx.beginPath(); ctx.arc(-11*u,-52*u,10*u,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(11*u,-52*u,10*u,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#38bdf8';
    ctx.beginPath(); ctx.arc(-11*u,-52*u,7*u,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(11*u,-52*u,7*u,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#0ea5e9';
    ctx.beginPath(); ctx.arc(-10*u,-53*u,4*u,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(12*u,-53*u,4*u,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffffff';
    ctx.beginPath(); ctx.arc(-9*u,-55*u,2*u,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(13*u,-55*u,2*u,0,Math.PI*2); ctx.fill();

    // Angular brows
    ctx.strokeStyle='#1c1917'; ctx.lineWidth=3*u; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-18*u,-64*u); ctx.lineTo(-4*u,-61*u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4*u,-61*u); ctx.lineTo(18*u,-64*u); ctx.stroke();

    // Mouth
    ctx.strokeStyle='#92400e'; ctx.lineWidth=2.5*u;
    ctx.beginPath(); ctx.moveTo(-10*u,-40*u); ctx.lineTo(0,-35*u); ctx.lineTo(10*u,-40*u); ctx.stroke();

    ctx.restore();
  };

  /* ── Bubbles: sea jellyfish creature ──────────────────────────────────────── */
  SpriteVM.prototype._drawBubbles = function() {
    var ctx = this.ctx;
    var pos = this._sc(this.sprite.x, this.sprite.y);
    var cx = pos.cx, cy = pos.cy;
    var sc = this.sprite.size / 100;
    var u = 1;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((this.sprite.direction - 90) * Math.PI / 180);
    ctx.scale(sc, sc);

    // Floating bubble decorations
    var fbubs=[  [28*u,-40*u,5*u,0.25],[-32*u,-20*u,4*u,0.2],[30*u,10*u,3.5*u,0.18],[-26*u,30*u,4.5*u,0.2]];
    for (var fb=0;fb<fbubs.length;fb++){
      ctx.strokeStyle='rgba(125,211,252,'+fbubs[fb][3]+')'; ctx.lineWidth=1.5*u;
      ctx.beginPath(); ctx.arc(fbubs[fb][0],fbubs[fb][1],fbubs[fb][2],0,Math.PI*2); ctx.stroke();
      ctx.fillStyle='rgba(186,230,253,0.08)';
      ctx.beginPath(); ctx.arc(fbubs[fb][0],fbubs[fb][1],fbubs[fb][2],0,Math.PI*2); ctx.fill();
    }

    // Tentacles
    ctx.strokeStyle='#0891b2'; ctx.lineWidth=4*u; ctx.lineCap='round';
    var tents=[[-16*u,30*u,-20*u,56*u],[-6*u,32*u,-8*u,60*u],[4*u,32*u,4*u,58*u],[14*u,30*u,18*u,55*u]];
    for (var tt=0;tt<tents.length;tt++){
      ctx.beginPath();
      ctx.moveTo(tents[tt][0],tents[tt][1]);
      ctx.quadraticCurveTo(tents[tt][0]-8*u,(tents[tt][1]+tents[tt][3])/2,tents[tt][2],tents[tt][3]);
      ctx.stroke();
    }
    ctx.fillStyle='#38bdf8';
    var tips=[[-20*u,56*u],[-8*u,60*u],[4*u,58*u],[18*u,55*u]];
    for (var tp=0;tp<tips.length;tp++){ ctx.beginPath(); ctx.arc(tips[tp][0],tips[tp][1],3*u,0,Math.PI*2); ctx.fill(); }

    // Main dome body
    ctx.shadowColor='rgba(14,165,233,0.35)'; ctx.shadowBlur=14;
    var bodyG=ctx.createRadialGradient(-8*u,-30*u,0,0,-10*u,46*u);
    bodyG.addColorStop(0,'#7dd3fc'); bodyG.addColorStop(0.5,'#0ea5e9'); bodyG.addColorStop(1,'#0369a1');
    ctx.fillStyle=bodyG;
    ctx.beginPath();
    ctx.arc(0,-10*u,40*u,Math.PI,0);
    ctx.quadraticCurveTo(44*u,30*u,26*u,34*u);
    ctx.quadraticCurveTo(10*u,38*u,0,36*u);
    ctx.quadraticCurveTo(-10*u,38*u,-26*u,34*u);
    ctx.quadraticCurveTo(-44*u,30*u,-40*u,0);
    ctx.closePath(); ctx.fill();
    ctx.shadowColor='transparent'; ctx.shadowBlur=0;

    // Inner shimmer
    var shimG=ctx.createRadialGradient(-10*u,-30*u,0,-6*u,-22*u,30*u);
    shimG.addColorStop(0,'rgba(186,230,253,0.45)'); shimG.addColorStop(1,'rgba(186,230,253,0)');
    ctx.fillStyle=shimG;
    ctx.beginPath(); ctx.arc(0,-10*u,40*u,Math.PI,0,false); ctx.closePath(); ctx.fill();

    // Dome spots
    ctx.fillStyle='rgba(56,189,248,0.35)';
    var dspots=[[-18*u,-38*u,5*u],[-4*u,-46*u,4*u],[12*u,-38*u,5.5*u],[20*u,-22*u,3.5*u],[-26*u,-18*u,4*u]];
    for (var ds=0;ds<dspots.length;ds++){ ctx.beginPath(); ctx.arc(dspots[ds][0],dspots[ds][1],dspots[ds][2],0,Math.PI*2); ctx.fill(); }

    // Eyes
    ctx.fillStyle='#ffffff';
    ctx.beginPath(); ctx.arc(-12*u,-14*u,11*u,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(12*u,-14*u,11*u,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#0c4a6e';
    ctx.beginPath(); ctx.arc(-12*u,-14*u,8*u,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(12*u,-14*u,8*u,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#38bdf8';
    ctx.beginPath(); ctx.arc(-11*u,-15*u,5*u,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(13*u,-15*u,5*u,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffffff';
    ctx.beginPath(); ctx.arc(-10*u,-17*u,2.5*u,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(14*u,-17*u,2.5*u,0,Math.PI*2); ctx.fill();

    // Cheeks
    ctx.fillStyle='rgba(125,211,252,0.4)';
    ctx.beginPath(); ctx.ellipse(-22*u,-8*u,7*u,4.5*u,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(22*u,-8*u,7*u,4.5*u,0,0,Math.PI*2); ctx.fill();

    // Smile
    ctx.strokeStyle='#0369a1'; ctx.lineWidth=2.5*u; ctx.lineCap='round';
    ctx.beginPath(); ctx.arc(0,0,10*u,0.2,Math.PI-0.2); ctx.stroke();

    ctx.restore();
  };

  /* ── Turbo: speed racer bot ────────────────────────────────────────────────── */
  SpriteVM.prototype._drawTurbo = function() {
    var ctx = this.ctx;
    var pos = this._sc(this.sprite.x, this.sprite.y);
    var cx = pos.cx, cy = pos.cy;
    var sc = this.sprite.size / 100;
    var u = 1;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((this.sprite.direction - 90) * Math.PI / 180);
    ctx.scale(sc, sc);

    // Speed trail lines
    ctx.strokeStyle='rgba(252,165,165,0.3)'; ctx.lineWidth=2.5*u; ctx.lineCap='round';
    var trails=[[34*u,-8*u,58*u,-8*u],[36*u,0,62*u,0],[38*u,8*u,58*u,8*u]];
    for (var tr=0;tr<trails.length;tr++){
      ctx.beginPath(); ctx.moveTo(trails[tr][0],trails[tr][1]); ctx.lineTo(trails[tr][2],trails[tr][3]); ctx.stroke();
    }

    // Legs
    ctx.fillStyle='#7f1d1d';
    this._rr(ctx,-20*u,24*u,16*u,22*u,6*u); ctx.fill();
    this._rr(ctx,4*u,24*u,16*u,22*u,6*u); ctx.fill();
    ctx.fillStyle='#450a0a';
    this._rr(ctx,-22*u,40*u,20*u,10*u,5*u); ctx.fill();
    this._rr(ctx,2*u,40*u,20*u,10*u,5*u); ctx.fill();
    // Wheel details
    ctx.strokeStyle='#fca5a5'; ctx.lineWidth=1.5*u;
    ctx.beginPath(); ctx.arc(-12*u,45*u,4*u,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(12*u,45*u,4*u,0,Math.PI*2); ctx.stroke();

    // Body
    ctx.shadowColor='rgba(220,38,38,0.45)'; ctx.shadowBlur=12;
    var bodyG=ctx.createLinearGradient(-26*u,-22*u,26*u,26*u);
    bodyG.addColorStop(0,'#ef4444'); bodyG.addColorStop(1,'#991b1b');
    ctx.fillStyle=bodyG;
    ctx.beginPath();
    ctx.moveTo(-26*u,-22*u);
    ctx.lineTo(24*u,-24*u); ctx.quadraticCurveTo(28*u,-22*u,26*u,-10*u);
    ctx.lineTo(26*u,26*u); ctx.quadraticCurveTo(26*u,28*u,22*u,28*u);
    ctx.lineTo(-22*u,28*u); ctx.quadraticCurveTo(-26*u,28*u,-26*u,24*u);
    ctx.closePath(); ctx.fill();
    ctx.shadowColor='transparent'; ctx.shadowBlur=0;

    // Racing stripe (diagonal)
    ctx.fillStyle='rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(-6*u,-22*u); ctx.lineTo(8*u,-22*u); ctx.lineTo(26*u,28*u); ctx.lineTo(12*u,28*u);
    ctx.closePath(); ctx.fill();

    // Number badge
    ctx.fillStyle='#fff';
    this._rr(ctx,-10*u,-8*u,20*u,18*u,4*u); ctx.fill();
    ctx.fillStyle='#dc2626';
    ctx.font='bold '+Math.round(14*u)+'px "Fredoka","Segoe UI",sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('01',0,2*u);
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';

    // Arms
    ctx.fillStyle='#dc2626';
    this._rr(ctx,-42*u,-16*u,18*u,10*u,5*u); ctx.fill();
    this._rr(ctx,24*u,-16*u,18*u,10*u,5*u); ctx.fill();
    ctx.fillStyle='#fca5a5';
    this._rr(ctx,-44*u,-18*u,14*u,13*u,6*u); ctx.fill();
    this._rr(ctx,30*u,-18*u,14*u,13*u,6*u); ctx.fill();

    // Neck
    ctx.fillStyle='#b91c1c';
    this._rr(ctx,-9*u,-32*u,18*u,12*u,4*u); ctx.fill();

    // Helmet head
    ctx.shadowColor='rgba(220,38,38,0.35)'; ctx.shadowBlur=8;
    var helmG=ctx.createLinearGradient(-26*u,-72*u,26*u,-26*u);
    helmG.addColorStop(0,'#f87171'); helmG.addColorStop(1,'#991b1b');
    ctx.fillStyle=helmG;
    this._rr(ctx,-26*u,-72*u,52*u,44*u,12*u); ctx.fill();
    ctx.shadowColor='transparent'; ctx.shadowBlur=0;

    // Helmet racing stripes
    ctx.fillStyle='#fca5a5';
    this._rr(ctx,-24*u,-72*u,8*u,44*u,3*u); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.15)';
    this._rr(ctx,-14*u,-70*u,6*u,40*u,2*u); ctx.fill();

    // Visor (eye strip)
    ctx.fillStyle='#1c1917';
    this._rr(ctx,-22*u,-56*u,44*u,16*u,5*u); ctx.fill();
    var visG=ctx.createLinearGradient(-22*u,-56*u,22*u,-40*u);
    visG.addColorStop(0,'rgba(251,146,60,0.55)'); visG.addColorStop(0.5,'rgba(252,211,77,0.35)'); visG.addColorStop(1,'rgba(251,146,60,0.1)');
    ctx.fillStyle=visG;
    this._rr(ctx,-20*u,-54*u,40*u,12*u,4*u); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=2*u;
    ctx.beginPath(); ctx.moveTo(-18*u,-51*u); ctx.lineTo(16*u,-51*u); ctx.stroke();

    // Mouth
    ctx.strokeStyle='#991b1b'; ctx.lineWidth=2.5*u; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-8*u,-35*u); ctx.lineTo(0,-31*u); ctx.lineTo(8*u,-35*u); ctx.stroke();

    ctx.restore();
  };

  SpriteVM.prototype._drawBubble = function(text) {
    var ctx = this.ctx;
    var pos = this._sc(this.sprite.x, this.sprite.y);
    var cx = pos.cx, cy = pos.cy;
    var pad = 12;
    ctx.font = '600 13px "Fredoka","Segoe UI",sans-serif';
    var lines = this._wrap(ctx, String(text), 190);
    var lh = 20;
    var maxWidth = 0;
    for (var i = 0; i < lines.length; i++) {
      var w = ctx.measureText(lines[i]).width;
      if (w > maxWidth) maxWidth = w;
    }
    var bW = Math.min(220, Math.max(80, maxWidth) + pad * 2);
    var bH = lines.length * lh + pad * 1.4;
    var bx = cx + 18;
    var by = cy - 100 - bH;
    bx = this.clamp(bx, 4, this.W - bW - 4);
    by = this.clamp(by, 4, this.H - bH - 18);

    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); this._rr(ctx, bx + 3, by + 3, bW, bH, 12); ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 2;
    ctx.beginPath(); this._rr(ctx, bx, by, bW, bH, 12); ctx.fill(); ctx.stroke();

    var tx = this.clamp(cx, bx + 14, bx + bW - 14);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(tx - 8, by + bH); ctx.lineTo(tx, by + bH + 12); ctx.lineTo(tx + 8, by + bH); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(tx - 8, by + bH - 1); ctx.lineTo(tx, by + bH + 12); ctx.lineTo(tx + 8, by + bH - 1); ctx.stroke();

    ctx.fillStyle = '#1e1b4b';
    ctx.textBaseline = 'top';
    for (var j = 0; j < lines.length; j++) {
      ctx.fillText(lines[j], bx + pad, by + pad * 0.75 + j * lh);
    }
    ctx.textBaseline = 'alphabetic';
  };

  SpriteVM.prototype._wrap = function(ctx, text, maxW) {
    var words = String(text).split(' ');
    var lines = []; var cur = '';
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      var test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
      else { cur = test; }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  };

  SpriteVM.prototype._rr = function(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  /* ── Execution ──────────────────────────────────────────────────── */
  SpriteVM.prototype.run = function(ws) {
    if (this.running) return;
    this.stopFlag = false;
    this.running  = true;
    _setStatus('Ejecutando...', true);

    var topBlocks = ws.getTopBlocks(true);
    var flag = null;
    for (var i = 0; i < topBlocks.length; i++) {
      if (topBlocks[i].type === 'ck_when_flag') { flag = topBlocks[i]; break; }
    }

    if (!flag) {
      this.running = false;
      _setStatus('Sin bloque de inicio', false);
      return;
    }

    var self = this;
    this._seq(flag.getNextBlock()).then(function() {
      self.running = false;
      _setStatus('Listo', false);
    }).catch(function(e) {
      self.running = false;
      if (e && e.message !== 'STOP') console.error('[Lab VM]', e);
      _setStatus('Detenido', false);
    });
  };

  SpriteVM.prototype.stop = function() {
    this.stopFlag = true;
    this.running  = false;
    _setStatus('Detenido', false);
  };

  SpriteVM.prototype.reset = function() {
    this.sprite = this._defaultSprite();
    _setStatus('Listo', false);
  };

  SpriteVM.prototype._seq = function(block) {
    var self = this;
    if (!block || self.stopFlag) return Promise.resolve();
    return self._exec(block).then(function() {
      if (self.stopFlag) return Promise.reject(new Error('STOP'));
      return self._seq(block.getNextBlock());
    });
  };

  SpriteVM.prototype._exec = function(block) {
    if (!block || this.stopFlag) return Promise.resolve();
    var sp   = this.sprite;
    var self = this;

    switch (block.type) {
      case 'ck_move': {
        var steps = parseFloat(block.getFieldValue('STEPS')) || 0;
        var rad   = (sp.direction - 90) * Math.PI / 180;
        var dx    = Math.cos(rad), dy = -Math.sin(rad);
        var dist  = Math.abs(steps), sign = steps >= 0 ? 1 : -1;
        var MSPD  = 4; // px per frame
        var mFrames = Math.max(1, Math.ceil(dist / MSPD));
        var mdx = (steps * dx) / mFrames, mdy = (steps * dy) / mFrames;
        var mi = 0;
        function _mStep() {
          if (self.stopFlag) return Promise.reject(new Error('STOP'));
          if (mi >= mFrames) return Promise.resolve();
          sp.x = self.clamp(sp.x + mdx, -240, 240);
          sp.y = self.clamp(sp.y + mdy, -180, 180);
          mi++;
          return self._ms(16).then(_mStep);
        }
        return _mStep();
      }
      case 'ck_turn_right': {
        var deg = parseFloat(block.getFieldValue('DEGREES')) || 0;
        var TSPD = 8, tFrames = Math.max(1, Math.ceil(Math.abs(deg) / TSPD));
        var tAngle = deg / tFrames, ti = 0;
        function _tRStep() {
          if (self.stopFlag) return Promise.reject(new Error('STOP'));
          if (ti >= tFrames) return Promise.resolve();
          sp.direction = (sp.direction + tAngle + 360) % 360;
          ti++;
          return self._ms(16).then(_tRStep);
        }
        return _tRStep();
      }
      case 'ck_turn_left': {
        var deg2 = parseFloat(block.getFieldValue('DEGREES')) || 0;
        var TSPD2 = 8, tFrames2 = Math.max(1, Math.ceil(Math.abs(deg2) / TSPD2));
        var tAngle2 = deg2 / tFrames2, ti2 = 0;
        function _tLStep() {
          if (self.stopFlag) return Promise.reject(new Error('STOP'));
          if (ti2 >= tFrames2) return Promise.resolve();
          sp.direction = (sp.direction - tAngle2 + 360) % 360;
          ti2++;
          return self._ms(16).then(_tLStep);
        }
        return _tLStep();
      }
      case 'ck_goto_xy': {
        sp.x = self.clamp(parseFloat(block.getFieldValue('X')) || 0, -240, 240);
        sp.y = self.clamp(parseFloat(block.getFieldValue('Y')) || 0, -180, 180);
        return self._ms(50);
      }
      case 'ck_point_dir': {
        sp.direction = ((parseFloat(block.getFieldValue('DIR')) || 90) + 360) % 360;
        return self._ms(30);
      }
      case 'ck_change_x': {
        sp.x = self.clamp(sp.x + (parseFloat(block.getFieldValue('DX')) || 0), -240, 240);
        return self._ms(50);
      }
      case 'ck_change_y': {
        sp.y = self.clamp(sp.y + (parseFloat(block.getFieldValue('DY')) || 0), -180, 180);
        return self._ms(50);
      }
      case 'ck_bounce': {
        if (Math.abs(sp.x) >= 218) sp.direction = (180 - sp.direction + 360) % 360;
        if (Math.abs(sp.y) >= 158) sp.direction = (360 - sp.direction + 360) % 360;
        return self._ms(30);
      }
      case 'ck_wait': {
        return self._ms((parseFloat(block.getFieldValue('SECS')) || 0) * 1000);
      }
      case 'ck_repeat': {
        var n = parseInt(block.getFieldValue('TIMES'), 10) || 0;
        var inner = block.getInputTargetBlock('DO');
        var chain = Promise.resolve();
        for (var ri = 0; ri < n; ri++) {
          (function() {
            chain = chain.then(function() {
              if (self.stopFlag) return Promise.reject(new Error('STOP'));
              return inner ? self._seq(inner) : Promise.resolve();
            });
          })();
        }
        return chain;
      }
      case 'ck_forever': {
        var innerF = block.getInputTargetBlock('DO');
        function loop() {
          if (self.stopFlag) return Promise.reject(new Error('STOP'));
          var step = innerF ? self._seq(innerF) : Promise.resolve();
          return step.then(function() { return self._ms(16); }).then(loop);
        }
        return loop();
      }
      case 'ck_say': {
        sp.saying   = String(block.getFieldValue('MSG') || '');
        sp.sayUntil = Infinity;
        return self._ms(30);
      }
      case 'ck_say_for': {
        var msg  = String(block.getFieldValue('MSG') || '');
        var secs = parseFloat(block.getFieldValue('SECS')) || 1;
        sp.saying   = msg;
        sp.sayUntil = Date.now() + secs * 1000;
        return self._ms(secs * 1000).then(function() {
          if (sp.saying === msg) sp.saying = null;
        });
      }
      case 'ck_show':     { sp.visible = true;  return self._ms(30); }
      case 'ck_hide':     { sp.visible = false; return self._ms(30); }
      case 'ck_set_size': {
        sp.size = self.clamp(parseFloat(block.getFieldValue('SIZE')) || 100, 10, 500);
        return self._ms(30);
      }
      case 'ck_glide': {
        var gTargetX = self.clamp(parseFloat(block.getFieldValue('X')) || 0, -240, 240);
        var gTargetY = self.clamp(parseFloat(block.getFieldValue('Y')) || 0, -180, 180);
        var gSecs    = Math.max(0.05, parseFloat(block.getFieldValue('SECS')) || 1);
        var gStart   = Date.now(), gDur = gSecs * 1000;
        var gX0 = sp.x, gY0 = sp.y;
        function _gStep() {
          if (self.stopFlag) return Promise.reject(new Error('STOP'));
          var t = Math.min(1, (Date.now() - gStart) / gDur);
          sp.x = gX0 + (gTargetX - gX0) * t;
          sp.y = gY0 + (gTargetY - gY0) * t;
          if (t >= 1) return Promise.resolve();
          return self._ms(16).then(_gStep);
        }
        return _gStep();
      }
      default: return Promise.resolve();
    }
  };

  SpriteVM.prototype._ms = function(ms) {
    var self = this;
    return new Promise(function(resolve) {
      if (ms <= 0) { resolve(); return; }
      var end = Date.now() + ms;
      function tick() {
        if (self.stopFlag || Date.now() >= end) { resolve(); return; }
        setTimeout(tick, Math.min(16, end - Date.now()));
      }
      setTimeout(tick, 0);
    });
  };

  /* ================================================================
     BLOCK DEFINITIONS
     ================================================================ */
  function _defineBlocks() {
    function stmt(type, json) {
      Blockly.Blocks[type] = {
        init: function() { this.jsonInit(json); }
      };
    }

    Blockly.Blocks['ck_when_flag'] = {
      init: function() {
        this.appendDummyInput().appendField('[>]  Al hacer clic en la bandera');
        this.setNextStatement(true, null);
        this.setColour('#FFAB19');
        this.setTooltip('El programa empieza cuando pulsas Ejecutar');
      }
    };

    stmt('ck_move', {
      message0: 'Mover %1 pasos',
      args0: [{ type: 'field_number', name: 'STEPS', value: 10 }],
      previousStatement: null, nextStatement: null,
      colour: '#4C97FF', tooltip: 'Mueve al personaje en la direccion que apunta'
    });
    stmt('ck_turn_right', {
      message0: 'Girar a la derecha %1 grados',
      args0: [{ type: 'field_number', name: 'DEGREES', value: 15 }],
      previousStatement: null, nextStatement: null,
      colour: '#4C97FF', tooltip: 'Gira al personaje a la derecha'
    });
    stmt('ck_turn_left', {
      message0: 'Girar a la izquierda %1 grados',
      args0: [{ type: 'field_number', name: 'DEGREES', value: 15 }],
      previousStatement: null, nextStatement: null,
      colour: '#4C97FF', tooltip: 'Gira al personaje a la izquierda'
    });
    stmt('ck_goto_xy', {
      message0: 'Ir a  x: %1  y: %2',
      args0: [
        { type: 'field_number', name: 'X', value: 0 },
        { type: 'field_number', name: 'Y', value: 0 }
      ],
      previousStatement: null, nextStatement: null,
      colour: '#4C97FF', tooltip: 'Teleporta al personaje. x: -240 a 240, y: -180 a 180'
    });
    stmt('ck_point_dir', {
      message0: 'Apuntar en direccion %1',
      args0: [{ type: 'field_angle', name: 'DIR', angle: 90 }],
      previousStatement: null, nextStatement: null,
      colour: '#4C97FF', tooltip: '90 = derecha  0 = arriba  -90 = izquierda  180 = abajo'
    });
    stmt('ck_change_x', {
      message0: 'Cambiar x por %1',
      args0: [{ type: 'field_number', name: 'DX', value: 10 }],
      previousStatement: null, nextStatement: null,
      colour: '#4C97FF', tooltip: 'Desplaza horizontalmente al personaje'
    });
    stmt('ck_change_y', {
      message0: 'Cambiar y por %1',
      args0: [{ type: 'field_number', name: 'DY', value: 10 }],
      previousStatement: null, nextStatement: null,
      colour: '#4C97FF', tooltip: 'Desplaza verticalmente al personaje'
    });
    stmt('ck_bounce', {
      message0: 'Rebotar si toca el borde',
      previousStatement: null, nextStatement: null,
      colour: '#4C97FF', tooltip: 'El personaje rebota cuando toca el borde del escenario'
    });
    stmt('ck_glide', {
      message0: 'Deslizarse a x: %1  y: %2  en %3 seg',
      args0: [
        { type: 'field_number', name: 'X', value: 0 },
        { type: 'field_number', name: 'Y', value: 0 },
        { type: 'field_number', name: 'SECS', value: 1 }
      ],
      previousStatement: null, nextStatement: null,
      colour: '#4C97FF', tooltip: 'Mueve al personaje suavemente hasta la posicion indicada en el tiempo dado'
    });

    stmt('ck_say', {
      message0: 'Decir %1',
      args0: [{ type: 'field_input', name: 'MSG', text: 'Hola!' }],
      previousStatement: null, nextStatement: null,
      colour: '#9966FF', tooltip: 'Muestra un bocadillo permanente'
    });
    stmt('ck_say_for', {
      message0: 'Decir %1 por %2 segundos',
      args0: [
        { type: 'field_input', name: 'MSG', text: 'Hola!' },
        { type: 'field_number', name: 'SECS', value: 2, min: 0 }
      ],
      previousStatement: null, nextStatement: null,
      colour: '#9966FF', tooltip: 'Muestra un bocadillo durante N segundos'
    });
    stmt('ck_show', {
      message0: 'Mostrar personaje',
      previousStatement: null, nextStatement: null,
      colour: '#9966FF', tooltip: 'Hace visible al personaje'
    });
    stmt('ck_hide', {
      message0: 'Ocultar personaje',
      previousStatement: null, nextStatement: null,
      colour: '#9966FF', tooltip: 'Oculta al personaje del escenario'
    });
    stmt('ck_set_size', {
      message0: 'Fijar tamano a %1 por ciento',
      args0: [{ type: 'field_number', name: 'SIZE', value: 100, min: 10, max: 500 }],
      previousStatement: null, nextStatement: null,
      colour: '#9966FF', tooltip: '100 = tamano normal. 200 = doble de grande.'
    });

    stmt('ck_wait', {
      message0: 'Esperar %1 segundos',
      args0: [{ type: 'field_number', name: 'SECS', value: 1, min: 0, precision: 0.1 }],
      previousStatement: null, nextStatement: null,
      colour: '#FFAB19', tooltip: 'Pausa la ejecucion N segundos'
    });

    Blockly.Blocks['ck_repeat'] = {
      init: function() {
        this.jsonInit({
          message0: 'Repetir %1 veces',
          args0: [{ type: 'field_number', name: 'TIMES', value: 10, min: 0 }],
          message1: '%1',
          args1: [{ type: 'input_statement', name: 'DO' }],
          previousStatement: null, nextStatement: null,
          colour: '#FFAB19', tooltip: 'Repite los bloques de dentro N veces'
        });
      }
    };

    Blockly.Blocks['ck_forever'] = {
      init: function() {
        this.jsonInit({
          message0: 'Por siempre',
          message1: '%1',
          args1: [{ type: 'input_statement', name: 'DO' }],
          previousStatement: null,
          colour: '#FFAB19', tooltip: 'Repite sin parar. Usa Detener para parar.'
        });
      }
    };
  }

  /* ================================================================
     TOOLBOX CONFIG
     ================================================================ */
  var TOOLBOX = {
    kind: 'categoryToolbox',
    contents: [
      {
        kind: 'category', name: 'Eventos', colour: '#FFAB19',
        contents: [{ kind: 'block', type: 'ck_when_flag' }]
      },
      {
        kind: 'category', name: 'Movimiento', colour: '#4C97FF',
        contents: [
          { kind: 'block', type: 'ck_move' },
          { kind: 'block', type: 'ck_turn_right' },
          { kind: 'block', type: 'ck_turn_left' },
          { kind: 'block', type: 'ck_goto_xy' },
          { kind: 'block', type: 'ck_point_dir' },
          { kind: 'block', type: 'ck_change_x' },
          { kind: 'block', type: 'ck_change_y' },
          { kind: 'block', type: 'ck_bounce' },
          { kind: 'block', type: 'ck_glide' }
        ]
      },
      {
        kind: 'category', name: 'Apariencia', colour: '#9966FF',
        contents: [
          { kind: 'block', type: 'ck_say' },
          { kind: 'block', type: 'ck_say_for' },
          { kind: 'block', type: 'ck_show' },
          { kind: 'block', type: 'ck_hide' },
          { kind: 'block', type: 'ck_set_size' }
        ]
      },
      {
        kind: 'category', name: 'Control', colour: '#FFAB19',
        contents: [
          { kind: 'block', type: 'ck_wait' },
          { kind: 'block', type: 'ck_repeat' },
          { kind: 'block', type: 'ck_forever' }
        ]
      }
    ]
  };

  /* ================================================================
     SPRITE THUMBNAILS
     ================================================================ */
  function _drawThumbCody(ctx, W, H) {
    ctx.save();
    ctx.translate(W / 2, H / 2 + 4);
    ctx.scale(0.28, 0.28);
    var bg = ctx.createLinearGradient(-24, -22, 24, 26);
    bg.addColorStop(0, '#3b82f6'); bg.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = bg; ctx.fillRect(-24, -22, 48, 48);
    var hg = ctx.createLinearGradient(-24, -70, 24, -30);
    hg.addColorStop(0, '#7c3aed'); hg.addColorStop(1, '#5b21b6');
    ctx.fillStyle = hg; ctx.fillRect(-24, -70, 48, 40);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.arc(-11, -52, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(11, -52, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#082f49';
    ctx.beginPath(); ctx.arc(-10, -53, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -53, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(-18, 26, 14, 20); ctx.fillRect(4, 26, 14, 20);
    ctx.restore();
  }

  function _drawThumbNova(ctx, W, H) {
    ctx.save();
    ctx.translate(W / 2, H / 2 + 4);
    ctx.scale(0.28, 0.28);
    // Dress
    var dg = ctx.createRadialGradient(0, 22, 0, 0, 22, 34);
    dg.addColorStop(0, '#f97316'); dg.addColorStop(1, '#c2410c');
    ctx.fillStyle = dg;
    ctx.beginPath();
    for (var i = 0; i < 12; i++) {
      var r = (i%2===0)?32:18;
      var a = (Math.PI/6)*i - Math.PI/2;
      if(i===0) ctx.moveTo(r*Math.cos(a),22+r*Math.sin(a));
      else ctx.lineTo(r*Math.cos(a),22+r*Math.sin(a));
    } ctx.closePath(); ctx.fill();
    // Torso
    var tg = ctx.createLinearGradient(-14,-28,14,10);
    tg.addColorStop(0,'#fb923c'); tg.addColorStop(1,'#ea580c');
    ctx.fillStyle = tg; ctx.fillRect(-14,-28,28,38);
    // Head
    var hd = ctx.createRadialGradient(0,-56,2,0,-56,26);
    hd.addColorStop(0,'#fde68a'); hd.addColorStop(1,'#d97706');
    ctx.fillStyle = hd;
    ctx.beginPath(); ctx.arc(0,-56,26,0,Math.PI*2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#1c1917';
    ctx.beginPath(); ctx.arc(-10,-58,9,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(10,-58,9,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath(); ctx.arc(-10,-58,5.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(10,-58,5.5,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function _drawThumbRex(ctx, W, H) {
    ctx.save();
    ctx.translate(W / 2, H / 2 + 4);
    ctx.scale(0.26, 0.26);
    // Body
    var bg = ctx.createLinearGradient(-26,-20,26,28);
    bg.addColorStop(0,'#4ade80'); bg.addColorStop(1,'#16a34a');
    ctx.fillStyle = bg; ctx.fillRect(-26,-20,52,48);
    // Belly
    ctx.fillStyle = '#bbf7d0'; ctx.fillRect(-14,-8,28,30);
    // Head
    var hg = ctx.createLinearGradient(-28,-74,28,-28);
    hg.addColorStop(0,'#86efac'); hg.addColorStop(1,'#22c55e');
    ctx.fillStyle = hg; ctx.fillRect(-28,-74,56,46);
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-11,-55,10,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(11,-55,10,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath(); ctx.arc(-10,-56,6,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(12,-56,6,0,Math.PI*2); ctx.fill();
    // Legs
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(-20,28,16,18); ctx.fillRect(4,28,16,18);
    ctx.restore();
  }

  function _drawThumbPixel(ctx, W, H) {
    ctx.save();
    ctx.translate(W / 2, H / 2 + 4);
    ctx.scale(0.28, 0.28);
    // Body
    ctx.fillStyle = '#06b6d4'; ctx.fillRect(-26,-20,52,48);
    ctx.fillStyle = '#67e8f9'; ctx.fillRect(-24,-18,20,4);
    // Head
    ctx.fillStyle = '#22d3ee'; ctx.fillRect(-26,-72,52,46);
    ctx.fillStyle = '#a5f3fc'; ctx.fillRect(-24,-70,18,4);
    // Eyes
    ctx.fillStyle = '#0c4a6e';
    ctx.fillRect(-20,-62,18,18); ctx.fillRect(2,-62,18,18);
    ctx.fillStyle = '#67e8f9';
    ctx.fillRect(-18,-60,14,14); ctx.fillRect(4,-60,14,14);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-16,-58,7,7); ctx.fillRect(6,-58,7,7);
    // Legs
    ctx.fillStyle = '#0891b2';
    ctx.fillRect(-20,28,16,18); ctx.fillRect(4,28,16,18);
    ctx.restore();
  }

  function _drawThumbLuna(ctx, W, H) {
    ctx.save();
    ctx.translate(W / 2, H / 2 + 2);
    ctx.scale(0.27, 0.27);
    // Robe
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath(); ctx.moveTo(-22,-10); ctx.quadraticCurveTo(-26,14,-18,44); ctx.lineTo(18,44); ctx.quadraticCurveTo(26,14,22,-10); ctx.closePath(); ctx.fill();
    // Body
    ctx.fillStyle = '#6d28d9'; ctx.fillRect(-14,-28,28,22);
    // Head
    var hg = ctx.createRadialGradient(-3,-54,1,0,-50,20);
    hg.addColorStop(0,'#f5d0fe'); hg.addColorStop(1,'#c4b5fd');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(0,-50,20,0,Math.PI*2); ctx.fill();
    // Hair
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath(); ctx.arc(0,-62,14,Math.PI,0); ctx.fill();
    // Hat
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath(); ctx.moveTo(-18,-64); ctx.lineTo(0,-96); ctx.lineTo(18,-64); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3730a3'; ctx.fillRect(-22,-66,44,7);
    // Hat star
    ctx.fillStyle = '#fde68a';
    ctx.beginPath(); ctx.arc(4,-76,4,0,Math.PI*2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath(); ctx.arc(-8,-52,5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(8,-52,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-7,-54,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(9,-54,2,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function _drawThumbSpark(ctx, W, H) {
    ctx.save();
    ctx.translate(W / 2, H / 2 + 4);
    ctx.scale(0.27, 0.27);
    // Legs
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(-16,22,12,20); ctx.fillRect(4,22,12,20);
    // Body
    var bg = ctx.createLinearGradient(-22,-22,22,26);
    bg.addColorStop(0,'#facc15'); bg.addColorStop(1,'#ca8a04');
    ctx.fillStyle = bg; ctx.fillRect(-22,-22,44,48);
    // Lightning bolt
    ctx.fillStyle = '#1c1917';
    ctx.beginPath(); ctx.moveTo(4,-18); ctx.lineTo(-5,2); ctx.lineTo(0,2); ctx.lineTo(-7,20); ctx.lineTo(9,-2); ctx.lineTo(4,-2); ctx.closePath(); ctx.fill();
    // Spiky hair (simplified triangles)
    ctx.fillStyle = '#fbbf24';
    [[-14,-72],[-4,-78],[6,-74]].forEach(function(p){
      ctx.beginPath(); ctx.moveTo(p[0]-6,p[1]+12); ctx.lineTo(p[0],p[1]); ctx.lineTo(p[0]+6,p[1]+12); ctx.closePath(); ctx.fill();
    });
    // Head
    var hg = ctx.createLinearGradient(-22,-72,22,-28);
    hg.addColorStop(0,'#fde047'); hg.addColorStop(1,'#ca8a04');
    ctx.fillStyle = hg; ctx.fillRect(-22,-72,44,44);
    // Eyes (electric blue)
    ctx.fillStyle = '#1c1917';
    ctx.beginPath(); ctx.arc(-10,-52,9,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(10,-52,9,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.arc(-10,-52,6,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(10,-52,6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-9,-54,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(11,-54,2,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function _drawThumbBubbles(ctx, W, H) {
    ctx.save();
    ctx.translate(W / 2, H / 2 + 4);
    ctx.scale(0.27, 0.27);
    // Tentacles
    ctx.strokeStyle = '#0891b2'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    [[-14,26,-16,50],[-5,28,-6,52],[5,28,5,50],[14,26,16,48]].forEach(function(t){
      ctx.beginPath(); ctx.moveTo(t[0],t[1]); ctx.quadraticCurveTo(t[0]-6,(t[1]+t[3])/2,t[2],t[3]); ctx.stroke();
    });
    // Dome body
    var bg = ctx.createRadialGradient(-6,-28,0,0,-10,40);
    bg.addColorStop(0,'#7dd3fc'); bg.addColorStop(0.6,'#0ea5e9'); bg.addColorStop(1,'#0369a1');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(0,-10,36,Math.PI,0);
    ctx.quadraticCurveTo(40,26,22,30); ctx.quadraticCurveTo(0,34,-22,30);
    ctx.quadraticCurveTo(-40,26,-36,0); ctx.closePath(); ctx.fill();
    // Shimmer
    ctx.fillStyle = 'rgba(186,230,253,0.35)';
    ctx.beginPath(); ctx.arc(0,-10,36,Math.PI,0,false); ctx.closePath(); ctx.fill();
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-11,-14,10,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(11,-14,10,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#0c4a6e';
    ctx.beginPath(); ctx.arc(-11,-14,7,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(11,-14,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.arc(-10,-15,4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(12,-15,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-9,-17,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(13,-17,2,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function _drawThumbTurbo(ctx, W, H) {
    ctx.save();
    ctx.translate(W / 2, H / 2 + 4);
    ctx.scale(0.27, 0.27);
    // Legs
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(-18,24,14,20); ctx.fillRect(4,24,14,20);
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(-20,38,18,9); ctx.fillRect(2,38,18,9);
    // Body
    var bg = ctx.createLinearGradient(-24,-22,24,26);
    bg.addColorStop(0,'#ef4444'); bg.addColorStop(1,'#991b1b');
    ctx.fillStyle = bg;
    ctx.fillRect(-24,-22,48,48);
    // Stripe
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.moveTo(-4,-22); ctx.lineTo(8,-22); ctx.lineTo(24,26); ctx.lineTo(12,26); ctx.closePath(); ctx.fill();
    // Number
    ctx.fillStyle = '#fff'; ctx.fillRect(-9,-8,18,16);
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 12px "Fredoka","Segoe UI",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('01', 0, 0); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    // Helmet
    var hg = ctx.createLinearGradient(-24,-72,24,-28);
    hg.addColorStop(0,'#f87171'); hg.addColorStop(1,'#991b1b');
    ctx.fillStyle = hg; ctx.fillRect(-24,-72,48,44);
    // Stripe on helmet
    ctx.fillStyle = '#fca5a5'; ctx.fillRect(-22,-72,7,44);
    // Visor
    ctx.fillStyle = '#1c1917'; ctx.fillRect(-20,-56,40,14);
    ctx.fillStyle = 'rgba(251,146,60,0.5)'; ctx.fillRect(-18,-54,36,10);
    ctx.restore();
  }

  /* ── Thumb lookup ───────────────────────────────────────────────────────── */
  var THUMB_FN_MAP = {
    cody:    _drawThumbCody,
    nova:    _drawThumbNova,
    rex:     _drawThumbRex,
    pixel:   _drawThumbPixel,
    luna:    _drawThumbLuna,
    spark:   _drawThumbSpark,
    bubbles: _drawThumbBubbles,
    turbo:   _drawThumbTurbo,
  };
  var CHAR_ALL = ['cody', 'nova', 'rex', 'pixel', 'luna', 'spark', 'bubbles', 'turbo'];

  function _drawThumb(ctx, w, h, id) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1e2d45';
    ctx.fillRect(0, 0, w, h);
    if (THUMB_FN_MAP[id]) THUMB_FN_MAP[id](ctx, w, h);
  }

  /* ── Sprite names map ────────────────────────────────────────────────────── */
  var SPRITE_NAMES = { cody: 'Cody', nova: 'Nova', rex: 'Rex', pixel: 'Pixel',
                       luna: 'Luna', spark: 'Spark', bubbles: 'Bubbles', turbo: 'Turbo' };

  /* ── Programme save / load ──────────────────────────────────────────────── */
  function _saveCurrentProgram() {
    if (!workspace || !selectedSprite) return;
    try {
      var dom = Blockly.Xml.workspaceToDom(workspace);
      spritePrograms[selectedSprite] = Blockly.Xml.domToText(dom);
    } catch (e) {}
  }

  function _loadProgram(id) {
    if (!workspace) return;
    try {
      workspace.clear();
      var xml = spritePrograms[id];
      if (xml) {
        var dom = (Blockly.Xml && Blockly.Xml.textToDom)
          ? Blockly.Xml.textToDom(xml)
          : new DOMParser().parseFromString(xml, 'text/xml').documentElement;
        Blockly.Xml.domToWorkspace(dom, workspace);
      }
    } catch (e) { try { workspace.clear(); } catch (e2) {} }
  }

  /* ── Sprite selection ───────────────────────────────────────────────────── */
  function _selectSprite(id) {
    if (!spriteVMs[id]) return;
    _saveCurrentProgram();
    selectedSprite = id;
    vm = spriteVMs[id];
    document.querySelectorAll('.lab-sprite-item').forEach(function(s) {
      s.classList.toggle('active', s.getAttribute('data-sprite') === id);
    });
    var titleEl = document.getElementById('lab-active-sprite-name');
    if (titleEl) titleEl.textContent = SPRITE_NAMES[id] || id;
    _loadProgram(id);
  }

  /* ── Add / remove sprites on canvas ────────────────────────────────────── */
  function _addSpriteToCanvas(id, sx, sy) {
    if (spriteVMs[id]) { _selectSprite(id); return; }
    var canvas = sharedCanvas || document.getElementById('lab-canvas');
    spriteVMs[id] = new SpriteVM(canvas, id,
      sx !== undefined ? sx : 0,
      sy !== undefined ? sy : 0);
    if (activeSprites.indexOf(id) === -1) activeSprites.push(id);
    spriteOrder = activeSprites.slice();
    _buildActivePanel();
    _updateLibraryCards();
    _selectSprite(id);
  }

  function _removeSpriteFromCanvas(id) {
    if (!spriteVMs[id]) return;
    spriteVMs[id].stop();
    delete spriteVMs[id];
    delete spritePrograms[id];
    var idx = activeSprites.indexOf(id);
    if (idx !== -1) activeSprites.splice(idx, 1);
    spriteOrder = activeSprites.slice();
    _buildActivePanel();
    _updateLibraryCards();
    if (selectedSprite === id) {
      selectedSprite = null;
      vm = null;
      if (workspace) workspace.clear();
      var titleEl = document.getElementById('lab-active-sprite-name');
      if (titleEl) titleEl.textContent = '\u2014';
      if (activeSprites.length > 0) _selectSprite(activeSprites[0]);
    }
  }

  /* ── Dynamic panels ─────────────────────────────────────────────────────── */
  function _buildActivePanel() {
    var grid = document.getElementById('lab-sprite-grid');
    if (!grid) return;
    grid.innerHTML = '';
    activeSprites.forEach(function(id) {
      var item = document.createElement('div');
      item.className = 'lab-sprite-item' + (id === selectedSprite ? ' active' : '');
      item.setAttribute('data-sprite', id);

      var removeBtn = document.createElement('button');
      removeBtn.className = 'lab-sprite-remove';
      removeBtn.title = 'Quitar del escenario';
      removeBtn.textContent = '\u00d7';
      removeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        _removeSpriteFromCanvas(id);
      });

      var cvs = document.createElement('canvas');
      cvs.className = 'lab-sprite-canvas';
      cvs.width = 44; cvs.height = 44;
      _drawThumb(cvs.getContext('2d'), 44, 44, id);

      var label = document.createElement('span');
      label.textContent = SPRITE_NAMES[id] || id;

      item.appendChild(removeBtn);
      item.appendChild(cvs);
      item.appendChild(label);
      item.addEventListener('click', function() { _selectSprite(id); });
      grid.appendChild(item);
    });
  }

  function _buildLibraryPanel() {
    var row = document.getElementById('lab-char-library-row');
    if (!row) return;
    row.innerHTML = '';
    CHAR_ALL.forEach(function(id) {
      var card = document.createElement('div');
      card.className = 'lab-char-card' + (spriteVMs[id] ? ' on-canvas' : '');
      card.id = 'lab-char-card-' + id;
      card.draggable = true;
      card.title = 'Arrastra al escenario para agregar ' + (SPRITE_NAMES[id] || id);

      var cvs = document.createElement('canvas');
      cvs.width = 40; cvs.height = 40;
      cvs.style.cssText = 'pointer-events:none;border-radius:4px;display:block;';
      _drawThumb(cvs.getContext('2d'), 40, 40, id);

      var label = document.createElement('span');
      label.textContent = SPRITE_NAMES[id] || id;

      card.appendChild(cvs);
      card.appendChild(label);

      card.addEventListener('dragstart', function(e) {
        if (spriteVMs[id]) { e.preventDefault(); return; }
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'copy';
      });
      // Also allow clicking to add (fallback for non-drag devices)
      card.addEventListener('click', function() {
        if (!spriteVMs[id]) _addSpriteToCanvas(id, 0, 0);
      });

      row.appendChild(card);
    });
  }

  function _updateLibraryCards() {
    CHAR_ALL.forEach(function(id) {
      var card = document.getElementById('lab-char-card-' + id);
      if (card) {
        card.classList.toggle('on-canvas', !!spriteVMs[id]);
        card.draggable = !spriteVMs[id];
      }
    });
  }

  /* ================================================================
     INIT
     ================================================================ */
  function init() {
    if (labInited) return;
    if (!window.Blockly) { console.error('[Lab] Blockly no disponible.'); return; }

    _defineBlocks();

    // Blockly theme
    var theme;
    try {
      theme = Blockly.Theme.defineTheme('ck_dark', {
        base: Blockly.Themes.Dark,
        componentStyles: {
          workspaceBackgroundColour: '#0f172a',
          toolboxBackgroundColour:   '#0b1220',
          toolboxForegroundColour:   '#cbd5e1',
          flyoutBackgroundColour:    '#111827',
          flyoutForegroundColour:    '#e2e8f0',
          flyoutOpacity:             1,
          scrollbarColour:           '#1e3a5f',
          scrollbarOpacity:          0.7
        },
        fontStyle: { family: '"Fredoka","Segoe UI",system-ui,sans-serif', weight: '600', size: 13 }
      });
    } catch (e) {
      theme = (Blockly.Themes && Blockly.Themes.Dark) || undefined;
    }

    // Inject workspace
    workspace = Blockly.inject('lab-blockly-div', {
      toolbox:  TOOLBOX,
      renderer: 'zelos',
      theme:    theme,
      grid:     { spacing: 24, length: 4, colour: '#1a2535', snap: true },
      zoom:     { controls: true, wheel: true, startScale: 0.9, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
      trashcan: true,
      sounds:   false,
      move:     { scrollbars: true, drag: true, wheel: false }
    });

    // Default starter script (XML) — stored as Cody's initial program
    var startXml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
        '<block type="ck_when_flag" x="40" y="40">' +
          '<next>' +
            '<block type="ck_say_for">' +
              '<field name="MSG">Hola! Soy Cody. Lista para explorar!</field>' +
              '<field name="SECS">2</field>' +
              '<next>' +
                '<block type="ck_forever">' +
                  '<statement name="DO">' +
                    '<block type="ck_move">' +
                      '<field name="STEPS">10</field>' +
                      '<next>' +
                        '<block type="ck_bounce"/>' +
                      '</next>' +
                    '</block>' +
                  '</statement>' +
                '</block>' +
              '</next>' +
            '</block>' +
          '</next>' +
        '</block>' +
      '</xml>';
    spritePrograms['cody'] = startXml;

    // Canvas – shared render loop
    var canvas = document.getElementById('lab-canvas');
    _startSharedLoop(canvas);
    _setStatus('Listo', false);

    // Build library + active panels
    _buildLibraryPanel();
    _buildActivePanel();

    // Canvas: drag-over / drop — drag a character card from library → drop on stage
    canvas.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      canvas.parentElement.classList.add('drop-target');
    });
    canvas.addEventListener('dragleave', function() {
      canvas.parentElement.classList.remove('drop-target');
    });
    canvas.addEventListener('drop', function(e) {
      e.preventDefault();
      canvas.parentElement.classList.remove('drop-target');
      var id = e.dataTransfer.getData('text/plain');
      if (!id || !THUMB_FN_MAP[id]) return;
      var rect = canvas.getBoundingClientRect();
      var sx = Math.round((e.clientX - rect.left) / rect.width * 480 - 240);
      var sy = Math.round(180 - (e.clientY - rect.top) / rect.height * 360);
      _addSpriteToCanvas(id, sx, sy);
    });

    // Canvas: click on a sprite to select it
    canvas.addEventListener('click', function(e) {
      var rect = canvas.getBoundingClientRect();
      var mx = (e.clientX - rect.left) / rect.width * 480 - 240;
      var my = 180 - (e.clientY - rect.top) / rect.height * 360;
      // Iterate from top (last drawn) to bottom
      for (var i = activeSprites.length - 1; i >= 0; i--) {
        var sid = activeSprites[i];
        var spS = spriteVMs[sid] && spriteVMs[sid].sprite;
        if (!spS || !spS.visible) continue;
        var dx = mx - spS.x, dy = my - spS.y;
        var r = (spS.size || 100) / 100 * 38;
        if (dx * dx + dy * dy <= r * r) { _selectSprite(sid); return; }
      }
    });

    // Buttons
    document.getElementById('lab-btn-run').addEventListener('click', function() {
      if (!selectedSprite || !spriteVMs[selectedSprite]) return;
      _saveCurrentProgram();
      vm = spriteVMs[selectedSprite];
      vm.stop();
      setTimeout(function() {
        vm.reset();
        document.getElementById('lab-btn-run').classList.add('lab-active');
        vm.run(workspace);
      }, 60);
    });

    document.getElementById('lab-btn-stop').addEventListener('click', function() {
      activeSprites.forEach(function(id) { if (spriteVMs[id]) spriteVMs[id].stop(); });
      document.getElementById('lab-btn-run').classList.remove('lab-active');
    });

    document.getElementById('lab-btn-reset').addEventListener('click', function() {
      activeSprites.forEach(function(id) { if (spriteVMs[id]) spriteVMs[id].stop(); });
      document.getElementById('lab-btn-run').classList.remove('lab-active');
      setTimeout(function() {
        activeSprites.forEach(function(id) { if (spriteVMs[id]) spriteVMs[id].reset(); });
      }, 60);
    });

    // Add Cody to the stage by default
    _addSpriteToCanvas('cody', 0, 0);

    document.getElementById('lab-btn-clear').addEventListener('click', function() {
      if (confirm('Esto borrara todos los bloques del area de trabajo. Continuar?')) {
        workspace.clear();
      }
    });

    // Tutorial
    _initTutorial();
    var seen = false;
    try { seen = !!localStorage.getItem('ck_lab_tut_done'); } catch (e) {}
    if (!seen) setTimeout(_tutShow, 350);

    labInited = true;
  }

  return { init: init };

})();
