/* Aviso de demonstração. O modo só existe na URL atual (?demo=1) ou em DEMO_MODE.
   Qualquer 'nc_demo' antigo no celular é apagado, para o cadastro ir ao Firebase. */
try { localStorage.removeItem('nc_demo'); } catch (e) {}
document.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });

function firebasePronto() {
  var f = (window.NC_CONFIG && window.NC_CONFIG.firebaseConfig) || {};
  var blob = String(f.apiKey || '') + String(f.projectId || '') + String(f.appId || '');
  return !!(f.apiKey && f.projectId && !/TODO|COLE|TROQUE/i.test(blob));
}
window.ncDemoAtivo = function () {
  var q = new URLSearchParams(location.search).get('demo') === '1';
  var cfg = !!(window.NC_CONFIG && window.NC_CONFIG.DEMO_MODE);
  return q || cfg || !firebasePronto();
};

window.ncMostrarDemo = function () {
  if (!window.ncDemoAtivo() || document.getElementById('ncDemoBanner')) return;
  var d = document.createElement('div');
  d.id = 'ncDemoBanner';
  d.className = 'demo-banner';
  d.setAttribute('role', 'status');
  d.textContent = 'Demonstração — dados de exemplo';
  document.body.prepend(d);
};

if (document.body) window.ncMostrarDemo();
else document.addEventListener('DOMContentLoaded', window.ncMostrarDemo);
