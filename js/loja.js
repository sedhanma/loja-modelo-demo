/* Vitrine pública. O IMEI não entra nesta página. */
import { store, DEMO } from './store.js';
import { midiaAparelho, svgDataUrl, tituloAparelho, nomeCondicao, moeda, mensagemInteresse } from './aparelho.js';
import { iniciarPedidos } from './pedidos.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const zapNum = () => String((window.NC_CONFIG && window.NC_CONFIG.STORE_WHATSAPP) || '').replace(/\D/g, '');
const nomeLoja = () => String((window.NC_CONFIG && window.NC_CONFIG.LOJA_NOME) || 'Sua Loja').trim();

let todos = [];
let aberto = null;
let fotoIdx = 0;

function zapHref(texto) {
  const base = `https://wa.me/${zapNum()}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}

function cidadeComUf() {
  const c = String((window.NC_CONFIG && window.NC_CONFIG.CIDADE) || 'Sua Cidade').trim();
  const uf = String((window.NC_CONFIG && window.NC_CONFIG.UF) || '').trim();
  return uf ? `${c}/${uf}` : c;
}

function ligarAtalhos() {
  document.querySelectorAll('[data-zap]').forEach(a => {
    a.href = zapHref(a.getAttribute('data-zap-texto') || '');
  });
  const sub = $('#heroSub');
  if (sub) sub.textContent = `Troque de smartphone com segurança e economia em ${cidadeComUf()}.`;
  const local = $('#cidadeLocal');
  if (local) local.textContent = cidadeComUf();
  const horas = (window.NC_CONFIG && window.NC_CONFIG.HORARIOS) || {};
  if ($('#horaSemana')) $('#horaSemana').textContent = horas.semana || 'Comercial';
  if ($('#horaSabado')) $('#horaSabado').textContent = horas.sabado || 'Horário especial';
  const rodape = $('#cidadeRodape');
  if (rodape) rodape.textContent = `${nomeLoja()} · ${cidadeComUf()}`;
  const painel = new URL(window.NC_CONFIG.pagina('admin.html'));
  if (DEMO) painel.searchParams.set('demo', '1');
  $('#painel').href = painel.href;
}

let filtroCond = '';

function passaFiltro(p) {
  const q = $('#q').value.trim().toLowerCase();
  const cond = filtroCond;
  const gb = $('#fGb').value;
  if (cond && p.condicao !== cond) return false;
  if (gb && String(p.armazenamento) !== gb) return false;
  if (!q) return true;
  const texto = [p.marca, p.modelo, p.cor, p.descricao, p.ram, p.armazenamento].join(' ').toLowerCase();
  return texto.includes(q);
}

function encherGb() {
  const atual = $('#fGb').value;
  const gbs = [...new Set(todos.map(p => p.armazenamento).filter(n => n > 0))].sort((a, b) => a - b);
  $('#fGb').innerHTML = '<option value="">Todos os GB</option>' + gbs.map(n => `<option value="${n}">${n} GB</option>`).join('');
  if (gbs.some(n => String(n) === atual)) $('#fGb').value = atual;
}

function linhaBateria(p) {
  const partes = [];
  if (p.saudeBateria != null) partes.push(`Bateria ${p.saudeBateria}%`);
  if (p.bateriaTrocada) partes.push('bateria trocada');
  return partes.join(' · ');
}

function linhaAcessorios(p) {
  const partes = [];
  if (p.acompanhaCaixa) partes.push('Com caixa');
  if (p.acompanhaCarregador) partes.push('Com carregador');
  return partes.join(' · ');
}

function fotoHtml(p, midia, idx) {
  const titulo = tituloAparelho(p) || 'Aparelho';
  const alt = midia.ilustrativa ? `Imagem ilustrativa de ${titulo}` : `Foto de ${titulo}`;
  if (!midia.itens.length) return `<div class="fone-foto"><span class="resumo">Sem imagem</span></div>`;
  const src = midia.itens[idx] || midia.itens[0];
  const aviso = midia.ilustrativa ? '<span class="selo-foto">Imagem ilustrativa</span>' : '';
  return `<div class="fone-foto">${aviso}<img src="${esc(src)}" alt="${esc(alt)}" data-fallback="${esc(p.ilustracao || '')}" data-cor="${esc(p.corHex)}"></div>`;
}

function cartao(p) {
  const midia = midiaAparelho(p);
  const titulo = tituloAparelho(p) || 'Aparelho';
  const exemplo = String(p.descricao || '').startsWith('Exemplo');
  const chips = [
    exemplo ? '<span class="selo-exemplo">Exemplo</span>' : '',
    `<span class="cond-${esc(p.condicao)}">${esc(nomeCondicao(p.condicao))}</span>`,
    p.armazenamento ? `<span>${esc(p.armazenamento)} GB</span>` : '',
    p.ram ? `<span>RAM ${esc(p.ram)}</span>` : '',
    p.cor ? `<span>${esc(p.cor)}</span>` : ''
  ].filter(Boolean).join('');
  const bat = linhaBateria(p);
  const acc = linhaAcessorios(p);
  return `<article class="fone" data-id="${esc(p.id)}">
    <button type="button" class="fone-abre">
      ${fotoHtml(p, midia, 0)}
      <div class="fone-corpo">
        <h2>${esc(titulo)}</h2>
        <div class="chips">${chips}</div>
        <div class="preco">${esc(moeda(p.preco))}</div>
        ${p.descricao ? `<p class="resumo">${esc(p.descricao)}</p>` : ''}
        <div class="specs">
          ${bat ? `<div>${esc(bat)}</div>` : ''}
          ${acc ? `<div>${esc(acc)}</div>` : ''}
        </div>
      </div>
    </button>
    <div class="fone-corpo">
      <button type="button" class="btn-gold" data-interesse="${esc(p.id)}">Tenho interesse</button>
      <a class="link-sec" href="${esc(zapHref(mensagemInteresse(p)))}" target="_blank" rel="noopener">ou chame no WhatsApp</a>
    </div>
  </article>`;
}

function desenhar() {
  const lista = todos.filter(passaFiltro);
  const grade = $('#grade');
  const vazio = $('#vazio');
  grade.innerHTML = lista.map(cartao).join('');
  grade.hidden = lista.length === 0;
  if (!todos.length) vazio.textContent = 'Nenhum aparelho anunciado no momento.';
  else if (!lista.length) vazio.textContent = 'Nenhum aparelho com esse filtro.';
  vazio.hidden = lista.length > 0;
  grade.querySelectorAll('img').forEach(img => img.addEventListener('error', () => cairParaDesenho(img)));
}

function cairParaDesenho(img) {
  if (img.dataset.caiu) return;
  img.dataset.caiu = '1';
  const familia = img.dataset.fallback;
  if (!familia) return;
  img.src = svgDataUrl(familia, img.dataset.cor || '#1a1a1a');
}

function linhas(p) {
  const sim = v => v ? 'Sim' : 'Não';
  return [
    ['Condição', nomeCondicao(p.condicao)],
    ['Armazenamento', p.armazenamento ? `${p.armazenamento} GB` : ''],
    ['Memória RAM', p.ram],
    ['Cor', p.cor],
    ['Saúde da bateria', p.saudeBateria == null ? '' : `${p.saudeBateria}%`],
    ['Bateria trocada', sim(p.bateriaTrocada)],
    ['Peças trocadas / observações', p.pecas],
    ['Garantia', p.garantia],
    ['Acompanha caixa', sim(p.acompanhaCaixa)],
    ['Acompanha carregador', sim(p.acompanhaCarregador)]
  ].filter(r => r[1]);
}

function pintarDialogo() {
  const p = aberto;
  const dlg = $('#detalhe');
  if (!p) { dlg.close(); return; }
  const midia = midiaAparelho(p);
  const titulo = tituloAparelho(p) || 'Aparelho';
  const varias = midia.itens.length > 1;
  const nav = varias
    ? `<button type="button" class="nav-foto prev" data-dir="-1" aria-label="Foto anterior">‹</button>
       <button type="button" class="nav-foto next" data-dir="1" aria-label="Próxima foto">›</button>`
    : '';
  dlg.innerHTML = `<div class="detalhe-in">
    <button type="button" class="fechar-det" aria-label="Fechar">×</button>
    ${fotoHtml(p, midia, fotoIdx)}
    ${nav}
    <h2>${esc(titulo)}</h2>
    <div class="preco">${esc(moeda(p.preco))}</div>
    ${p.descricao ? `<p class="resumo">${esc(p.descricao)}</p>` : ''}
    <dl>${linhas(p).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    <button type="button" class="btn-gold" data-interesse="${esc(p.id)}">Tenho interesse</button>
    <a class="link-sec" href="${esc(zapHref(mensagemInteresse(p)))}" target="_blank" rel="noopener">ou chame no WhatsApp</a>
  </div>`;
  dlg.querySelectorAll('img').forEach(img => img.addEventListener('error', () => cairParaDesenho(img)));
  const foto = dlg.querySelector('.fone-foto');
  if (foto && nav) {
    foto.append(dlg.querySelector('.prev'), dlg.querySelector('.next'));
  }
}

function abrir(id) {
  aberto = todos.find(p => p.id === id) || null;
  fotoIdx = 0;
  if (!aberto) return;
  pintarDialogo();
  const dlg = $('#detalhe');
  if (!dlg.open) dlg.showModal();
}

$('#detalhe').addEventListener('click', e => {
  if (e.target.id === 'detalhe') { $('#detalhe').close(); return; }
  if (e.target.closest('.fechar-det')) { $('#detalhe').close(); return; }
  const nav = e.target.closest('[data-dir]');
  if (!nav || !aberto) return;
  const midia = midiaAparelho(aberto);
  const n = midia.itens.length || 1;
  fotoIdx = (fotoIdx + Number(nav.dataset.dir) + n) % n;
  pintarDialogo();
});

$('#grade').addEventListener('click', e => {
  const btn = e.target.closest('.fone-abre');
  if (!btn) return;
  const card = btn.closest('[data-id]');
  if (card) abrir(card.dataset.id);
});

['#q', '#fGb'].forEach(id => $(id).addEventListener('input', desenhar));
$('#fGb').addEventListener('change', desenhar);
document.querySelectorAll('.abas-cat button').forEach(btn => {
  btn.addEventListener('click', () => {
    filtroCond = btn.dataset.cond || '';
    document.querySelectorAll('.abas-cat button').forEach(b => {
      const on = b === btn;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    desenhar();
  });
});

async function iniciar() {
  ligarAtalhos();
  try {
    todos = await store.listProdutosPublicos();
  } catch (e) {
    console.error(e);
    todos = [];
  }
  encherGb();
  const aviso = $('#avisoExemplo');
  if (aviso) aviso.hidden = !DEMO;
  desenhar();
  iniciarPedidos(id => todos.find(p => p.id === id));
}
iniciar();
