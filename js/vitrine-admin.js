import { store, DEMO } from './store.js';
import { comprimirFoto } from './fotos.js';
import { FAMILIAS, CORES, produtoPublico, svgMockup, midiaAparelho, tituloAparelho, nomeCondicao, moeda, hexCor } from './aparelho.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const state = { id: '', fotos: [], ilustracao: '', manual: false, lista: [] };

function precoNum(v) {
  let s = String(v || '').trim();
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function familiaDaMarca(marca) {
  const m = String(marca || '').trim().toLowerCase();
  if (!m) return '';
  if (m.includes('apple') || m.includes('iphone')) return 'iphone-ilha';
  return 'android-furo';
}

function aviso(texto, ok) {
  const el = $('#vitMsg');
  el.textContent = texto || '';
  el.className = ok ? 'vit-ok' : 'vit-erro';
}

function erroRegra(e) {
  const code = e && (e.code || e.message || '');
  return /permission-denied|permission/i.test(String(code));
}

function pintarMocks() {
  const box = $('#vitMocks');
  const cor = hexCor($('#vitHex').value);
  box.replaceChildren();
  const nenhum = document.createElement('button');
  nenhum.type = 'button';
  nenhum.className = state.ilustracao ? '' : 'on';
  nenhum.textContent = 'Sem desenho';
  nenhum.addEventListener('click', () => {
    state.ilustracao = '';
    state.manual = true;
    pintarMocks();
    pintarPreview();
  });
  box.appendChild(nenhum);
  FAMILIAS.forEach(f => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = f.id === state.ilustracao ? 'on' : '';
    b.title = f.nome;
    b.setAttribute('aria-label', f.nome);
    b.setAttribute('aria-pressed', f.id === state.ilustracao ? 'true' : 'false');
    b.innerHTML = svgMockup(f.id, cor);
    b.addEventListener('click', () => {
      state.ilustracao = f.id;
      state.manual = true;
      pintarMocks();
      pintarPreview();
    });
    box.appendChild(b);
  });
}

function rascunho() {
  return produtoPublico({
    marca: $('#vitMarca').value,
    modelo: $('#vitModelo').value || 'Prévia',
    armazenamento: $('#vitGb').value,
    ram: $('#vitRam').value,
    cor: $('#vitCor').value,
    corHex: $('#vitHex').value,
    condicao: $('#vitCond').value,
    preco: precoNum($('#vitPreco').value) || 0,
    descricao: $('#vitDesc').value,
    fotos: state.fotos,
    ilustracao: state.ilustracao,
    imagemUrl: $('#vitUrl').value,
    visivel: true,
    vendido: false,
    ordem: 0
  });
}

function pintarPreview() {
  const box = $('#vitPreview');
  const p = rascunho();
  const midia = midiaAparelho(p);
  box.replaceChildren();
  if (!midia.itens.length) {
    box.textContent = 'Sem imagem ainda.';
    return;
  }
  const img = document.createElement('img');
  img.alt = '';
  img.src = midia.itens[0];
  const nota = document.createElement('span');
  nota.className = 'vit-nota';
  nota.textContent = midia.ilustrativa
    ? 'Na vitrine sai como Imagem ilustrativa.'
    : 'Foto real: aparece no lugar da ilustração, sem o aviso.';
  box.append(img, nota);
}

function pintarThumbs() {
  const box = $('#vitThumbs');
  box.replaceChildren();
  state.fotos.forEach((src, i) => {
    const fig = document.createElement('figure');
    const img = document.createElement('img');
    img.src = src;
    img.alt = `Foto ${i + 1}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '×';
    btn.setAttribute('aria-label', 'Remover foto');
    btn.addEventListener('click', () => {
      state.fotos.splice(i, 1);
      pintarThumbs();
      pintarPreview();
    });
    fig.append(img, btn);
    box.appendChild(fig);
  });
}

function limpar() {
  state.id = '';
  state.fotos = [];
  state.ilustracao = '';
  state.manual = false;
  $('#vitForm').reset();
  $('#vitHex').value = '#1a1a1a';
  $('#vitCond').value = 'seminovo';
  $('#vitVisivel').checked = true;
  $('#vitVendido').checked = false;
  $('#vitGarantia').value = '3 meses de garantia da loja';
  $('#vitTitulo').textContent = 'Novo aparelho';
  aviso('');
  pintarThumbs();
  pintarMocks();
  pintarPreview();
}

function preencher(p) {
  state.id = p.id;
  state.fotos = (p.fotos || []).slice();
  state.ilustracao = p.ilustracao || '';
  state.manual = true;
  $('#vitMarca').value = p.marca || '';
  $('#vitModelo').value = p.modelo || '';
  $('#vitGb').value = p.armazenamento || '';
  $('#vitRam').value = p.ram || '';
  $('#vitCor').value = p.cor || '';
  $('#vitHex').value = hexCor(p.corHex);
  $('#vitCond').value = p.condicao || 'seminovo';
  $('#vitPreco').value = p.preco ?? '';
  $('#vitDesc').value = p.descricao || '';
  $('#vitSaude').value = p.saudeBateria == null ? '' : p.saudeBateria;
  $('#vitBateria').checked = !!p.bateriaTrocada;
  $('#vitPecas').value = p.pecas || '';
  $('#vitGarantia').value = p.garantia || '';
  $('#vitCaixa').checked = !!p.acompanhaCaixa;
  $('#vitCarregador').checked = !!p.acompanhaCarregador;
  $('#vitImei').value = p.imei || '';
  $('#vitVisivel').checked = p.visivel !== false;
  $('#vitVendido').checked = !!p.vendido;
  $('#vitUrl').value = p.imagemUrl || '';
  $('#vitTitulo').textContent = 'Editar aparelho';
  aviso('');
  pintarThumbs();
  pintarMocks();
  pintarPreview();
}

function desenharLista() {
  const box = $('#vitLista');
  if (!state.lista.length) {
    box.innerHTML = '<p class="vit-nota">Nenhum aparelho ainda. Preencha o formulário ao lado.</p>';
    return;
  }
  box.innerHTML = state.lista.map((p, i) => {
    const midia = midiaAparelho(p);
    const src = midia.itens[0] || '';
    const flags = [
      p.visivel ? '' : '<span class="tag-off">Oculto</span>',
      p.vendido ? '<span class="tag-off">Vendido</span>' : '',
      midia.ilustrativa ? 'Imagem ilustrativa' : (p.fotos && p.fotos.length ? 'Foto real' : 'Sem imagem')
    ].filter(Boolean).join(' · ');
    return `<article class="vit-item">
      ${src ? `<img src="${esc(src)}" alt="">` : '<img alt="">'}
      <div>
        <b>${esc(tituloAparelho(p))}</b>
        <div class="vit-nota">${esc(nomeCondicao(p.condicao))} · ${esc(moeda(p.preco))}<br>${flags}</div>
        <div class="vit-acoes">
          <button type="button" data-act="edit" data-id="${esc(p.id)}">Editar</button>
          <button type="button" data-act="visivel" data-id="${esc(p.id)}">${p.visivel ? 'Ocultar' : 'Mostrar'}</button>
          <button type="button" data-act="vendido" data-id="${esc(p.id)}">${p.vendido ? 'Marcar à venda' : 'Marcar vendido'}</button>
          <button type="button" data-act="subir" data-id="${esc(p.id)}" ${i === 0 ? 'disabled' : ''}>Subir</button>
          <button type="button" data-act="descer" data-id="${esc(p.id)}" ${i === state.lista.length - 1 ? 'disabled' : ''}>Descer</button>
          <button type="button" data-act="apagar" data-id="${esc(p.id)}">Apagar</button>
        </div>
      </div>
    </article>`;
  }).join('');
}

async function carregar() {
  try {
    state.lista = await store.listProdutos();
    desenharLista();
  } catch (e) {
    console.error(e);
    $('#vitLista').innerHTML = '';
    aviso(erroRegra(e)
      ? 'Não foi possível ler a vitrine. Publique o arquivo firestore.rules no Firebase (Firestore → Regras → Publicar).'
      : 'Não foi possível ler a vitrine.');
  }
}

async function salvar(e) {
  e.preventDefault();
  aviso('');
  const modelo = $('#vitModelo').value.trim();
  const preco = precoNum($('#vitPreco').value);
  const gb = Number($('#vitGb').value);
  if (!modelo) { aviso('Informe o modelo.'); return; }
  if (!Number.isFinite(gb) || gb <= 0) { aviso('Informe o armazenamento em GB.'); return; }
  if (preco == null || preco < 0) { aviso('Informe o preço.'); return; }
  const url = $('#vitUrl').value.trim();
  if (url && !/^https?:\/\//i.test(url)) { aviso('O endereço da imagem precisa começar com http:// ou https://.'); return; }
  const atual = state.lista.find(p => p.id === state.id);
  const ordem = atual ? atual.ordem : state.lista.reduce((m, p) => Math.max(m, p.ordem || 0), 0) + 1;
  let saude = $('#vitSaude').value.trim();
  if (saude === '') saude = null;
  else {
    saude = Math.round(Number(saude));
    if (!Number.isFinite(saude) || saude < 0 || saude > 100) { aviso('A saúde da bateria fica entre 0 e 100, ou em branco.'); return; }
  }
  const btn = $('#vitSalvar');
  btn.disabled = true;
  try {
    await store.saveProduto(state.id || null, {
      marca: $('#vitMarca').value,
      modelo,
      armazenamento: gb,
      ram: $('#vitRam').value,
      cor: $('#vitCor').value,
      corHex: $('#vitHex').value,
      condicao: $('#vitCond').value,
      preco,
      descricao: $('#vitDesc').value,
      saudeBateria: saude,
      bateriaTrocada: $('#vitBateria').checked,
      pecas: $('#vitPecas').value,
      garantia: $('#vitGarantia').value,
      acompanhaCaixa: $('#vitCaixa').checked,
      acompanhaCarregador: $('#vitCarregador').checked,
      fotos: state.fotos,
      ilustracao: state.ilustracao,
      imagemUrl: url,
      visivel: $('#vitVisivel').checked,
      vendido: $('#vitVendido').checked,
      ordem,
      imei: $('#vitImei').value
    });
    await carregar();
    limpar();
    aviso('Aparelho salvo.', true);
  } catch (err) {
    console.error(err);
    aviso(erroRegra(err)
      ? 'Não foi possível gravar. Publique o arquivo firestore.rules no Firebase (Firestore → Regras → Publicar).'
      : 'Não foi possível salvar o aparelho.');
  } finally { btn.disabled = false; }
}

async function mover(id, dir) {
  const i = state.lista.findIndex(p => p.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= state.lista.length) return;
  const a = state.lista[i];
  const b = state.lista[j];
  const nova = a.ordem === b.ordem ? b.ordem + dir : b.ordem;
  await store.patchProduto(a.id, { ordem: nova });
  await store.patchProduto(b.id, { ordem: a.ordem });
  await carregar();
}

export function iniciarVitrine() {
  const ver = $('#verVitrine');
  if (ver) {
    const href = new URL(window.NC_CONFIG.pagina('index.html'));
    if (DEMO) href.searchParams.set('demo', '1');
    ver.href = href.href;
  }
  const cores = $('#vitCores');
  CORES.forEach(([nome]) => {
    const o = document.createElement('option');
    o.value = nome;
    cores.appendChild(o);
  });
  $('#vitForm').addEventListener('submit', salvar);
  $('#vitNovo').addEventListener('click', limpar);
  $('#vitMarca').addEventListener('input', () => {
    if (state.manual) return;
    const familia = familiaDaMarca($('#vitMarca').value);
    if (!familia || familia === state.ilustracao) return;
    state.ilustracao = familia;
    pintarMocks();
    pintarPreview();
  });
  $('#vitCor').addEventListener('input', () => {
    const nome = $('#vitCor').value.trim().toLowerCase();
    const achou = CORES.find(c => c[0].toLowerCase() === nome);
    if (achou) $('#vitHex').value = achou[1];
    pintarMocks();
    pintarPreview();
  });
  $('#vitHex').addEventListener('input', () => { pintarMocks(); pintarPreview(); });
  $('#vitUrl').addEventListener('input', pintarPreview);
  $('#vitArquivos').addEventListener('change', async () => {
    const files = [...($('#vitArquivos').files || [])];
    $('#vitArquivos').value = '';
    aviso('');
    for (const file of files) {
      if (state.fotos.length >= 4) { aviso('No máximo 4 fotos.'); break; }
      try { state.fotos.push(await comprimirFoto(file)); }
      catch (err) { aviso('Não foi possível usar uma das fotos. Escolha uma imagem menor.'); }
    }
    pintarThumbs();
    pintarPreview();
  });
  $('#vitLista').addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const p = state.lista.find(x => x.id === btn.dataset.id);
    if (!p) return;
    try {
      if (btn.dataset.act === 'edit') { preencher(p); return; }
      if (btn.dataset.act === 'visivel') await store.patchProduto(p.id, { visivel: !p.visivel });
      if (btn.dataset.act === 'vendido') await store.patchProduto(p.id, { vendido: !p.vendido });
      if (btn.dataset.act === 'subir') await mover(p.id, -1);
      if (btn.dataset.act === 'descer') await mover(p.id, 1);
      if (btn.dataset.act === 'apagar') {
        if (!confirm('Apagar este aparelho da vitrine?')) return;
        await store.deleteProduto(p.id);
        if (state.id === p.id) limpar();
      }
      if (btn.dataset.act !== 'edit') await carregar();
    } catch (err) {
      console.error(err);
      aviso(erroRegra(err)
        ? 'Não foi possível gravar. Publique o arquivo firestore.rules no Firebase (Firestore → Regras → Publicar).'
        : 'Não foi possível atualizar o aparelho.');
    }
  });
  limpar();
  carregar();
}
