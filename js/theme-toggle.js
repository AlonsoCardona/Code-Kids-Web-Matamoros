(function(){
    const KEY = 'app-theme';
    function applyTheme(theme){
        if (theme === 'dark'){
            document.documentElement.classList.add('theme-dark','dark');
            document.body.classList.add('theme-on');
            document.body.classList.remove('theme-off');
        } else {
            document.documentElement.classList.remove('theme-dark','dark');
            document.body.classList.remove('theme-on');
            document.body.classList.add('theme-off');
        }
    }
    function readTheme(){ try { return localStorage.getItem(KEY) || 'light'; } catch(e){ return 'light'; } }
    function writeTheme(t){ try { localStorage.setItem(KEY, t); } catch(e){} }
    function updateUI(theme){
        const btn = document.getElementById('themeToggle'); if(!btn) return;
        const isDark = theme === 'dark';
        btn.setAttribute('aria-pressed', String(isDark));
        btn.classList.toggle('theme-on', isDark);
        btn.classList.toggle('theme-off', !isDark);
        const thumb = btn.querySelector('.toggle-thumb');
        if (thumb) thumb.style.transform = isDark ? 'translateX(20px)' : 'translateX(0)';
        const sun = btn.querySelector('.icon-sun'); const moon = btn.querySelector('.icon-moon');
        if (sun) sun.style.opacity = isDark ? '0.2' : '1';
        if (moon) moon.style.opacity = isDark ? '1' : '0.2';
    }
    function toggle(){ const cur = readTheme(); const next = cur === 'dark' ? 'light' : 'dark'; applyTheme(next); writeTheme(next); updateUI(next); }
    // init early: apply theme as soon as possible to avoid flash
    try{ const saved = localStorage.getItem(KEY); if (saved === 'dark'){ document.documentElement.classList.add('theme-dark','dark'); document.body.classList.add('theme-on'); } }catch(_){}
    document.addEventListener('DOMContentLoaded', ()=>{
        const current = readTheme(); applyTheme(current); updateUI(current);
        const btn = document.getElementById('themeToggle'); if (btn) btn.addEventListener('click', toggle);
        // allow clicking the switch area
        const switchArea = document.querySelector('#themeToggle .toggle-switch'); if (switchArea) switchArea.addEventListener('click', toggle);
    });
})();
