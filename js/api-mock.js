// Local API mock for search & completion endpoints
// Provides window.apiSearch and window.apiComplete

(function(){
  const mockLessons = [ { id:'l1', title:'Introducción a Python'}, { id:'l2', title:'Variables y Tipos'}, { id:'l3', title:'Condicionales'} ];
  const mockGames = [ { id:'g1', title:'Blocky: El Laberinto'}, { id:'g2', title:'Typo-Racer Python'} ];
  const mockTeachers = [ { id:'t1', name:'Prof. Alan'}, { id:'t2', name:'Prof. María'} ];

  window.apiSearch = async function(q){
    const ql = q.toLowerCase();
    return {
      lessons: mockLessons.filter(l => l.title.toLowerCase().includes(ql)).slice(0,5),
      games: mockGames.filter(g => g.title.toLowerCase().includes(ql)).slice(0,5),
      teachers: mockTeachers.filter(t => t.name.toLowerCase().includes(ql)).slice(0,5)
    };
  };

  window.apiComplete = async function(type, id){
    // Simular diferentes XP según tipo
    let xp = 0;
    if (type==='lesson') xp = 100; else if (type==='task') xp=50; else if (type==='game') xp=25; else xp=10;
    if (window.addXP) try { await window.addXP(xp, type); } catch(e) { console.warn('addXP failed', e); }
    return { ok:true, xpAwarded: xp };
  };

  // Mock endpoint for /api/search via fetch
  const _fetch = window.fetch?.bind(window);
  window.fetch = async function(input, init){
    try {
      const url = typeof input === 'string' ? input : (input?.url||'');
      const u = new URL(url, window.location.origin);
      if (u.pathname === '/api/search') {
        const q = u.searchParams.get('q')||'';
        const data = await window.apiSearch(q);
        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type':'application/json' } });
      }
    } catch(_) {}
    return _fetch ? _fetch(input, init) : Promise.reject(new Error('fetch not available'));
  }
})();
