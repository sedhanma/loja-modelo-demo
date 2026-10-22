import { store, MODE, DEMO, demoBanner, isConfigured } from './store.js';
import { iniciarVitrine } from './vitrine-admin.js';
import { iniciarPedidosAdmin } from './pedidos-admin.js';
const { LOJA_NOME } = window.NC_CONFIG;
const $ = s => document.querySelector(s);
const show = id => ['#vCarregando', '#vSetup', '#vLogin', '#vPainel'].forEach(v => { $(v).hidden = v !== id; });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dataBR = iso => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const nascBR = d => d ? d.split('-').reverse().join('/') : '';
function linkURL(id) {
  const u = new URL(window.NC_CONFIG.pagina('form.html'));
  u.searchParams.set('id', id);
  if (DEMO) u.searchParams.set('demo', '1');
  return u.href;
}

let cadastros = [], unsub = [];
let painelEmail = '';
let acessoNegado = false;
const MSG_SEM_PERMISSAO = 'Sem permissão para acessar o painel';
const emailGestor = String((window.NC_CONFIG && window.NC_CONFIG.EMAIL_GESTOR) || '').trim().toLowerCase();
function emailsPermitidos() {
  const cfg = window.NC_CONFIG || {};
  const lista = [];
  if (Array.isArray(cfg.ADMINS)) lista.push(...cfg.ADMINS);
  if (cfg.EMAIL_GESTOR) lista.push(cfg.EMAIL_GESTOR);
  return new Set(lista.map(e => String(e || '').trim().toLowerCase()).filter(Boolean));
}
function mostrarSemPermissao() {
  const erro = $('#lErro');
  if (erro) {
    erro.textContent = MSG_SEM_PERMISSAO;
    erro.hidden = false;
  }
  show('#vLogin');
  const sair = $('#sair');
  if (sair) sair.hidden = true;
}
demoBanner();
if (DEMO && !isConfigured()) {
  const dica = $('#dicaDemo');
  if (dica) {
    const apelido = Object.keys((window.NC_CONFIG && window.NC_CONFIG.USUARIOS) || {})[0] || 'loja';
    dica.hidden = false;
    dica.textContent = `Demonstração: entre com o usuário ${apelido} e qualquer senha. Os dados ficam só neste navegador.`;
  }
}

const NO_ATALHO = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
if (NO_ATALHO) document.addEventListener('click', e => {
  const a = e.target.closest('a[target="_blank"]');
  if (!a || !a.href) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return;
  e.preventDefault();
  location.href = url.href;
});

if (MODE === 'unconfigured') show('#vSetup');
else store.onAuth(async user => {
  const email = (user && user.email || '').toLowerCase();
  if (user && !emailsPermitidos().has(email)) {
    acessoNegado = true;
    painelEmail = '';
    unsub.forEach(u => typeof u === 'function' && u()); unsub = [];
    mostrarSemPermissao();
    try { await store.logout(); } catch (e) { console.error(e); }
    return;
  }
  if (user && painelEmail && email === painelEmail) return;
  unsub.forEach(u => typeof u === 'function' && u()); unsub = [];
  if (!user) {
    painelEmail = '';
    const box = $('#lManter');
    if (box) {
      let manter = true;
      try { manter = localStorage.getItem('nc_manter_conectado') !== '0'; } catch (e) {}
      box.checked = manter;
    }
    show('#vLogin'); $('#sair').hidden = true;
    if (acessoNegado) mostrarSemPermissao();
    return;
  }
  acessoNegado = false;
  const erroLogin = $('#lErro');
  if (erroLogin) erroLogin.hidden = true;
  painelEmail = email;
  try {
    const parar = await store.vigiarSessao();
    if (!parar) return;
    unsub.push(parar);
  } catch (e) { console.error(e); }
  show('#vPainel'); $('#sair').hidden = false;
  const dev = $('#devConfig');
  if (dev) dev.hidden = MODE !== 'firebase' || !emailGestor || email !== emailGestor;
  iniciarPainel();
  if (dev && !dev.hidden) {
    const tick = setInterval(() => renderSessoes(), 30000);
    unsub.push(() => clearInterval(tick));
    try {
      unsub.push(await store.assistirSessoes((lista, err) => renderSessoes(lista, err)));
    } catch (e) { console.error(e); renderSessoes(null, e); }
  }
}).catch(err => { show('#vSetup'); console.error(err); });

const DOMINIO_LOJA = String((window.NC_CONFIG && window.NC_CONFIG.DOMINIO_LOJA) || '').trim().toLowerCase();
function dominioLoja() {
  if (!DOMINIO_LOJA) return '';
  return DOMINIO_LOJA.startsWith('@') ? DOMINIO_LOJA : '@' + DOMINIO_LOJA;
}
function usuarioParaEmail(valor) {
  const u = String(valor || '').trim().toLowerCase();
  if (!u || u.includes('@')) return u;
  const mapa = (window.NC_CONFIG && window.NC_CONFIG.USUARIOS) || {};
  const alias = Object.keys(mapa).find(nome => String(nome).trim().toLowerCase() === u);
  if (alias) return String(mapa[alias]).trim().toLowerCase();
  const dom = dominioLoja();
  if (!dom) return u;
  return u + dom;
}
const ERROS = {
  'auth/invalid-credential': 'Usuário ou senha incorretos.', 'auth/wrong-password': 'Usuário ou senha incorretos.',
  'auth/user-not-found': 'Usuário ou senha incorretos.', 'auth/invalid-email': 'Usuário inválido.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.', 'auth/network-request-failed': 'Sem conexão com a internet.',
  'auth/configuration-not-found': 'O acesso da loja ainda não está ativo. No Firebase, ative o login por e-mail e senha e tente de novo.',
  'auth/operation-not-allowed': 'O login por e-mail ainda não foi liberado. No Firebase, ative o método E-mail/senha e tente de novo.',
  'auth/invalid-api-key': 'Não foi possível conectar ao Firebase. Confira a configuração em js/config.js.',
};
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#lBtn'); btn.disabled = true; $('#lErro').hidden = true;
  try {
    await store.login(usuarioParaEmail($('#lUsuario').value), $('#lSenha').value, $('#lManter').checked);
    if (DEMO) location.reload();
  } catch (err) {
    $('#lErro').textContent = ERROS[err.code] || (err.code ? 'Não foi possível entrar agora. Tente de novo em instantes.' : (err.message || 'Não foi possível entrar.')); $('#lErro').hidden = false;
  } finally { btn.disabled = false; }
});
$('#sair').onclick = async () => {
  acessoNegado = false;
  try { await store.encerrarSessao(); } catch (e) { console.error(e); }
  await store.logout();
  if (DEMO) location.reload();
};
const ONLINE_MS = 3 * 60 * 1000;
let sessoesCache = [];
function nomeCurto(email) {
  const e = String(email || '').toLowerCase();
  const dom = dominioLoja();
  if (dom && e.endsWith(dom)) return e.slice(0, e.length - dom.length);
  return e;
}
function textoAtividade(ms) {
  if (!ms) return 'sem sinal';
  const s = Math.max(0, Date.now() - ms);
  if (s < 90 * 1000) return 'online agora';
  const min = Math.floor(s / 60000);
  if (min < 60) return 'há ' + Math.max(1, min) + ' min';
  const h = Math.floor(min / 60);
  return h < 24 ? 'há ' + h + ' h' : 'há mais de um dia';
}
function renderSessoes(lista, erro) {
  const box = $('#devSessoes');
  if (!box) return;
  if (erro) {
    box.innerHTML = '<p>Não foi possível ler os aparelhos. Publique as regras novas do Firestore.</p>';
    return;
  }
  if (lista) sessoesCache = lista;
  const itens = sessoesCache.slice().sort((a, b) => {
    if (a.eu !== b.eu) return a.eu ? -1 : 1;
    const ao = Date.now() - a.lastSeen < ONLINE_MS ? 1 : 0;
    const bo = Date.now() - b.lastSeen < ONLINE_MS ? 1 : 0;
    if (ao !== bo) return bo - ao;
    return b.lastSeen - a.lastSeen;
  });
  if (!itens.length) { box.innerHTML = '<p>Nenhum aparelho registrado ainda.</p>'; return; }
  box.innerHTML = itens.map(s => {
    const on = Date.now() - s.lastSeen < ONLINE_MS;
    const entrou = s.createdAt ? dataBR(s.createdAt) : '—';
    return `<div class="dev-sessao${on ? '' : ' off'}${s.eu ? ' eu' : ''}">
      <div class="quem"><b>${esc(nomeCurto(s.email))}${s.eu ? ' <span class="dev-eu">· este aparelho</span>' : ''}</b>
      <small>${esc(s.device)}</small>
      <small>Entrou em ${esc(entrou)} · ${esc(textoAtividade(s.lastSeen))}</small></div>
      ${s.eu ? '' : `<button type="button" data-revogar="${esc(s.id)}">Desconectar</button>`}
    </div>`;
  }).join('');
}
$('#btnRevogar').addEventListener('click', async () => {
  const msg = $('#devMsg');
  if (!confirm('Desconectar os outros aparelhos do painel? Este aparelho continua logado.')) return;
  const btn = $('#btnRevogar');
  btn.disabled = true;
  msg.hidden = true;
  try {
    const n = await store.desconectarOutros();
    msg.textContent = n ? 'Os outros aparelhos foram desconectados. Este continua logado.' : 'Não há outros aparelhos para desconectar.';
    msg.hidden = false;
  } catch (e) {
    console.error(e);
    msg.textContent = 'Não foi possível desconectar os outros aparelhos.';
    msg.hidden = false;
  } finally { btn.disabled = false; }
});
$('#devSessoes').addEventListener('click', async e => {
  const btn = e.target.closest('[data-revogar]');
  if (!btn) return;
  if (!confirm('Desconectar este aparelho do painel?')) return;
  btn.disabled = true;
  const msg = $('#devMsg');
  try {
    await store.desconectarSessao(btn.dataset.revogar);
    msg.textContent = 'Aparelho desconectado.';
    msg.hidden = false;
  } catch (err) {
    console.error(err);
    msg.textContent = 'Não foi possível desconectar este aparelho.';
    msg.hidden = false;
    btn.disabled = false;
  }
});

let iniciado = false;
async function iniciarPainel() {
  const erro = err => {
    console.error(err);
    $('#lista').innerHTML = `<div class="vazio"><p>Sem permissão para ler os cadastros.</p><small>Confira se seu e-mail está liberado no arquivo firestore.rules (veja SETUP.md).</small></div>`;
  };
  unsub.push(await store.watchSubmissions(list => { cadastros = list; render(); }, erro));
  unsub.push(await store.watchLinks(links => {
    const pend = links.filter(l => !l.used);
    $('#pendentes').innerHTML = pend.length ? pend.slice(0, 8).map(l => `
      <div class="pend"><div><code>${esc(l.id)}</code> <span>· ${esc(l.name || 'sem nome')} · ${dataBR(l.createdAt)}</span></div>
      <button data-link="${esc(l.id)}">Copiar</button></div>`).join('') : '<small style="color:var(--muted)">Nenhum link pendente.</small>';
  }, () => {}));
  if (iniciado) return; iniciado = true;
  ligarBotaoLink(); ligarLista();
  iniciarVitrine();
  iniciarPedidosAdmin();
}

function render() {
  const q = $('#busca').value.trim().toLowerCase();
  const list = cadastros.filter(c => !q || [c.nome, c.cpf, c.telefone, c.email, c.cidade].join(' ').toLowerCase().includes(q));
  $('#count').textContent = cadastros.length;
  $('#vazio').hidden = cadastros.length > 0;
  $('#lista').innerHTML = list.map((c, i) => `
    <div class="item" data-id="${esc(c.id)}" style="animation-delay:${i * 40}ms">
      <div class="av">${esc((c.nome || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase())}</div>
      <div><b>${esc(c.nome)}</b><small>${esc(c.telefone)} · ${esc(c.cidade)}${c.uf ? '/' + esc(c.uf) : ''}</small></div>
      <div class="meta">${dataBR(c.createdAt)}<br><span class="tag">${esc(c.comoConheceu)}</span></div>
    </div>`).join('');
}

function linhas(c) {
  return [
    ['Nome', c.nome], ['CPF', c.cpf], ['Nascimento', nascBR(c.nascimento)], ['Telefone', c.telefone], ['E-mail', c.email],
    ['Endereço', `${c.endereco}, ${c.numero}${c.complemento ? ' – ' + c.complemento : ''}`], ['Bairro', c.bairro],
    ['Cidade', `${c.cidade}${c.uf ? '/' + c.uf : ''}`], ['CEP', c.cep], ['Instagram', c.instagram || '—'],
    ['Como conheceu', c.comoConheceu + (c.comoConheceu === 'Outro' && c.comoConheceuOutro ? ` (${c.comoConheceuOutro})` : '')],
  ];
}

function dataRecibo(r) {
  if (r.data && /^\d{4}-\d{2}-\d{2}$/.test(r.data)) return r.data.split('-').reverse().join('/');
  return r.createdAt ? dataBR(r.createdAt) : '';
}
function renderRecibos(submissionId, lista) {
  const demo = DEMO ? '&demo=1' : '';
  if (!lista.length) {
    $('#mRecibos').innerHTML = '<p class="recibos-vazio">Nenhum recibo salvo ainda.</p>';
    return;
  }
  $('#mRecibos').innerHTML = lista.map(r => {
    const href = `recibo.html?id=${encodeURIComponent(submissionId)}&recibo=${encodeURIComponent(r.id)}${demo}`;
    return `<a class="recibo-item" href="${href}" target="_blank"><b>${esc(r.modelo || 'Sem modelo')}</b><span>${esc(dataRecibo(r))}</span></a>`;
  }).join('');
}
async function abrir(id) {
  const c = cadastros.find(x => x.id === id); if (!c) return;
  $('#mNome').textContent = c.nome;
  $('#mData').textContent = 'Recebido em ' + dataBR(c.createdAt);
  $('#mDados').innerHTML = linhas(c).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v || '—')}</dd>`).join('');
  $('#mRecibos').innerHTML = '<p class="recibos-vazio">Carregando recibos…</p>';
  $('#mRecibo').href = 'recibo.html?id=' + encodeURIComponent(c.id) + (DEMO ? '&demo=1' : '');
  const fone = (c.telefone || '').replace(/\D/g, '');
  $('#mWhats').href = `https://wa.me/55${fone}?text=` + encodeURIComponent(`Olá, ${c.nome.split(' ')[0]}! Aqui é da ${LOJA_NOME}. Recebemos seus dados, obrigado! 😊`);
  $('#mCopiar').onclick = async () => {
    await navigator.clipboard.writeText(linhas(c).map(([k, v]) => `${k}: ${v || '-'}`).join('\n')).catch(() => {});
    $('#mCopiar').textContent = '✓ Copiado!'; setTimeout(() => $('#mCopiar').textContent = '📋 Copiar dados', 1600);
  };
  $('#modal').showModal();
  try { renderRecibos(id, await store.listRecibos(id)); }
  catch (e) { console.error(e); $('#mRecibos').innerHTML = '<p class="recibos-vazio">Não foi possível carregar os recibos.</p>'; }
}

let vendas = [];
function digitos(s) { return String(s || '').replace(/\D/g, ''); }
function vendaCombina(v, q) {
  const n = q.trim().toLowerCase();
  if (!n) return true;
  const texto = [v.clienteNome, v.clienteCpf, v.modelo, v.imei, v.imei2].join(' ').toLowerCase();
  if (texto.includes(n)) return true;
  const d = digitos(q);
  if (d.length >= 3 && digitos([v.imei, v.imei2, v.clienteCpf].join('')).includes(d)) return true;
  return false;
}
function renderVendas() {
  const q = $('#buscaVenda').value;
  const lista = vendas.filter(v => vendaCombina(v, q));
  const demo = DEMO ? '&demo=1' : '';
  if (!lista.length) {
    $('#vendas').innerHTML = '<p class="recibos-vazio">Nenhuma venda encontrada.</p>';
    return;
  }
  $('#vendas').innerHTML = lista.map(v => {
    const href = `recibo.html?id=${encodeURIComponent(v.submissionId)}&recibo=${encodeURIComponent(v.id)}${demo}`;
    const imei = [v.imei, v.imei2].filter(Boolean).join(' · ') || 'sem IMEI';
    const ate = v.garantiaAte && /^\d{4}-\d{2}-\d{2}$/.test(v.garantiaAte) ? 'até ' + v.garantiaAte.split('-').reverse().join('/') : '';
    return `<a class="item" href="${href}" target="_blank">
      <div class="av">${esc((v.clienteNome || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase())}</div>
      <div><b>${esc(v.modelo || 'Sem modelo')}</b><small>${esc(v.clienteNome || 'Cliente')}${v.clienteCpf ? ' · ' + esc(v.clienteCpf) : ''}</small></div>
      <div class="meta">${esc(dataRecibo(v))}<br><span class="tag">${esc(imei)}</span>${ate ? `<br><span class="tag">${esc(ate)}</span>` : ''}</div>
    </a>`;
  }).join('');
}
async function carregarVendas() {
  $('#vendas').innerHTML = '<p class="recibos-vazio">Carregando vendas…</p>';
  try { vendas = await store.listVendas(); }
  catch (e) { console.error(e); $('#vendas').innerHTML = '<p class="recibos-vazio">Não foi possível carregar as vendas.</p>'; return; }
  renderVendas();
}
function ligarLista() {
  $('#lista').addEventListener('click', e => { const it = e.target.closest('.item'); if (it) abrir(it.dataset.id); });
  $('#pendentes').addEventListener('click', e => {
    const id = e.target.dataset.link; if (!id) return;
    navigator.clipboard.writeText(linkURL(id)).catch(() => {}); e.target.textContent = 'Copiado!';
  });
  $('#fechar').onclick = () => $('#modal').close();
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') $('#modal').close(); });
  $('#busca').addEventListener('input', render);
}

function ligarBotaoLink() {
  const fone = $('#ncFone');
  fone.addEventListener('input', () => {
    const d = fone.value.replace(/\D/g, '').slice(0, 11);
    fone.value = d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length > 10 ? 7 : 6)}-${d.slice(d.length > 10 ? 7 : 6)}`
      : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
  });
  $('#ncGerar').addEventListener('click', async () => {
    const btn = $('#ncGerar'); btn.disabled = true; $('#ncErro').hidden = true;
    try {
      const link = await store.createLink({ name: $('#ncCliente').value.trim(), phone: fone.value });
      const url = linkURL(link.id);
      $('#ncLink').value = url;
      const nome = $('#ncCliente').value.trim().split(/[\s—-]+/)[0];
      const msg = `Olá${nome ? ', ' + nome : ''}! 👋 Aqui é da *${LOJA_NOME}*.\n\n` +
        `Para gerarmos a *nota fiscal*, o *recibo do seu aparelho* e o *termo de garantia* ✅, preencha seus dados neste link rapidinho (leva menos de 2 minutos):\n\n` +
        `${url}\n\nQualquer dúvida é só chamar. Obrigado pela preferência! 📱✨`;
      let num = fone.value.replace(/\D/g, '');
      if (num && num.length <= 11) num = '55' + num;
      $('#ncWhats').href = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
      $('#ncResult').hidden = false;
    } catch (e) {
      console.error(e);
      $('#ncErro').textContent = e.code === 'permission-denied' ? 'Sem permissão para criar links (confira firestore.rules).' : 'Não foi possível gerar o link. Verifique a internet.';
      $('#ncErro').hidden = false;
    } finally { btn.disabled = false; }
  });
  const paineis = { tabVitrine: '#abaVitrine', tabPedidos: '#abaPedidos', tabCadastros: '#abaCadastros', tabVendas: '#abaVendas', tabSimulador: '#abaSimulador' };
  document.querySelectorAll('.aba').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.aba').forEach(b => {
        const on = b === btn;
        b.classList.toggle('on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      Object.entries(paineis).forEach(([id, sel]) => { $(sel).hidden = btn.id !== id; });
      if (btn.id !== 'tabSimulador') document.querySelector('.sim-app')?.classList.remove('calc-mode');
      if (btn.id === 'tabVendas') carregarVendas();
    });
  });
  $('#buscaVenda').addEventListener('input', renderVendas);
  $('#ncCopiar').addEventListener('click', async () => {
    const b = $('#ncCopiar'), inp = $('#ncLink');
    try { await navigator.clipboard.writeText(inp.value); } catch { inp.select(); document.execCommand('copy'); }
    b.classList.add('nc-copied'); b.querySelector('span').textContent = 'Copiado!';
    setTimeout(() => { b.classList.remove('nc-copied'); b.querySelector('span').textContent = 'Copiar link'; }, 1800);
  });
}
