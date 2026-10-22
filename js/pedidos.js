import { store, DEMO } from './store.js';
import { comprimirFoto } from './fotos.js';
import { tituloAparelho, nomeCondicao, moeda } from './aparelho.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ESPERA = 20000;
const MIN_PREENCHIMENTO_MS = 3000;
const JANELA_MS = 10 * 60 * 1000;
const MAX_ENVIOS = 3;
const CHAVE_ENVIOS = 'nc_lead_vezes';
let acharProduto = () => null;
let fotosTroca = [];

export function mascaraTelefone(valor) {
  const d = String(valor || '').replace(/\D/g, '').slice(0, 11);
  if (d.length > 6) {
    const meio = d.length > 10 ? 7 : 6;
    return `(${d.slice(0, 2)}) ${d.slice(2, meio)}-${d.slice(meio)}`;
  }
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return d;
}

function digitos(tel) {
  return String(tel || '').replace(/\D/g, '');
}

function corte(v, n) {
  return String(v ?? '').trim().slice(0, n);
}

function dadosVazios(extra) {
  return {
    nome: '', telefone: '', cidade: '', pagamento: '', mensagem: '',
    modelo: '', armazenamento: '', saudeBateria: null, pecaTrocada: '',
    pecas: '', estado: '', caixa: false, carregador: false, interesse: '',
    assunto: '', fotos: [],
    ...extra
  };
}

function exigirNomeTel(form) {
  const nome = corte(form.nome.value, 80);
  const telefone = mascaraTelefone(form.telefone.value);
  if (nome.length < 2) throw new Error('Informe seu nome.');
  if (digitos(telefone).length < 10) throw new Error('Informe um WhatsApp com DDD.');
  return { nome, telefone };
}

function falha(e) {
  const code = String((e && (e.code || e.message)) || '');
  if (/permission-denied|permission/i.test(code)) {
    return 'Não foi possível enviar. Publique o arquivo firestore.rules no Firebase (Firestore → Regras → Publicar).';
  }
  return 'Não foi possível enviar agora. Tente de novo em instantes.';
}

function assuntoEmail(p) {
  if (p.tipo === 'interesse') return `Novo interesse: ${p.produtoNome}`;
  if (p.tipo === 'troca') return `Avaliação de iPhone na troca: ${p.dados.modelo || 'iPhone'}`;
  return `Orçamento: ${p.dados.assunto || 'assistência'}`;
}

function linhasEmail(p) {
  const d = p.dados || {};
  const pag = { avista: 'À vista', cartao: 'Cartão', troca: 'Troca + diferença' }[d.pagamento] || '';
  const linhas = [
    ['Tipo', p.tipo],
    ['Nome', d.nome],
    ['WhatsApp', d.telefone],
    ['Cidade', d.cidade],
    ['Produto', p.produtoNome],
    ['Condição', p.condicao ? nomeCondicao(p.condicao) : ''],
    ['Preço', p.produtoNome ? moeda(p.preco) : ''],
    ['Pagamento', pag],
    ['Modelo', d.modelo],
    ['Armazenamento', d.armazenamento],
    ['Saúde da bateria', d.saudeBateria == null ? '' : `${d.saudeBateria}%`],
    ['Peça trocada', d.pecas],
    ['Estado', d.estado],
    ['Caixa', d.caixa ? 'Sim' : (p.tipo === 'troca' ? 'Não' : '')],
    ['Carregador', d.carregador ? 'Sim' : (p.tipo === 'troca' ? 'Não' : '')],
    ['Aparelho de interesse', d.interesse],
    ['Assunto', d.assunto],
    ['Mensagem', d.mensagem],
    ['Fotos', d.fotos && d.fotos.length ? `${d.fotos.length} no painel` : 'nenhuma']
  ];
  const texto = linhas.filter(l => l[1]).map(([k, v]) => `${k}: ${v}`).join('\n');
  const painel = window.NC_CONFIG.pagina('admin.html');
  return `${texto}\n\nVer no painel: ${painel}`;
}

async function notificar(pedido) {
  if (DEMO) return;
  const email = String((window.NC_CONFIG && window.NC_CONFIG.EMAIL_NOTIFICACOES) || '').trim();
  if (!email || email.toLowerCase() === 'admin@sualoja.com') return;
  const r = await fetch(`https://formsubmit.co/ajax/${email}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      _subject: assuntoEmail(pedido),
      _template: 'box',
      _captcha: 'false',
      _honey: '',
      message: linhasEmail(pedido)
    }),
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error('email');
}

function valorCampo(form, nome) {
  const el = form.querySelector(`[name="${nome}"]`);
  return el ? String(el.value || '').trim() : '';
}

function marcarAberto(form) {
  if (form) form.dataset.aberto = String(Date.now());
}

function enviosRecentes() {
  try {
    const brutos = JSON.parse(localStorage.getItem(CHAVE_ENVIOS) || '[]');
    const corte = Date.now() - JANELA_MS;
    return (Array.isArray(brutos) ? brutos : []).map(Number).filter(t => Number.isFinite(t) && t > corte);
  } catch (e) {
    return null;
  }
}

function registrarEnvio() {
  const lista = enviosRecentes();
  if (!lista) return;
  lista.push(Date.now());
  try { localStorage.setItem(CHAVE_ENVIOS, JSON.stringify(lista.slice(-10))); } catch (e) {}
}

function textoZap(p) {
  const d = p.dados;
  if (p.tipo === 'troca') {
    return `Olá! Quero avaliar meu iPhone na troca. Modelo: ${d.modelo} / Armazenamento: ${d.armazenamento} / Saúde da bateria: ${d.saudeBateria == null ? '___' : d.saudeBateria + '%'} / Tem alguma peça trocada? ${d.pecas || '___'}`;
  }
  if (p.tipo === 'orcamento') {
    return `Olá! Enviei um pedido de orçamento (${d.assunto || 'assistência'}). Meu nome é ${d.nome}. ${d.mensagem || ''}`.trim();
  }
  const pag = { avista: 'à vista', cartao: 'cartão', troca: 'troca + diferença' }[d.pagamento] || '';
  return `Olá! Tenho interesse no ${p.produtoNome} (${nomeCondicao(p.condicao)}, ${moeda(p.preco)}). Meu nome é ${d.nome}. Pagamento: ${pag}. ${d.mensagem || ''}`.replace(/\s+/g, ' ').trim();
}

function mostrarOk(form, ok, pedido) {
  form.hidden = true;
  ok.hidden = false;
  if (DEMO) {
    ok.innerHTML = `<p><b>Demonstração concluída.</b> O pedido ficou só neste navegador. Nenhum e-mail foi enviado.</p>
      <button type="button" class="btn-ghost" data-outro>Enviar outro</button>`;
  } else {
    const num = String((window.NC_CONFIG && window.NC_CONFIG.STORE_WHATSAPP) || '').replace(/\D/g, '');
    const href = `https://wa.me/${num}?text=${encodeURIComponent(textoZap(pedido))}`;
    ok.innerHTML = `<p><b>Recebemos seu pedido.</b> A loja retorna no WhatsApp.</p>
      <a class="btn-gold" href="${esc(href)}" target="_blank" rel="noopener">Falar agora no WhatsApp</a>
      <button type="button" class="btn-ghost" data-outro>Enviar outro</button>`;
  }
  ok.querySelector('[data-outro]').addEventListener('click', () => {
    ok.hidden = true;
    form.hidden = false;
    form.reset();
    marcarAberto(form);
    if (form.id === 'formTroca') {
      fotosTroca = [];
      pintarFotos();
      $('#trocaQuais').hidden = true;
    }
  });
}

async function enviar(form, ok, montar) {
  const btn = form.querySelector('[type="submit"]');
  const erro = form.querySelector('[data-erro]');
  erro.hidden = true;
  if (valorCampo(form, 'empresa') || valorCampo(form, '_honey')) {
    mostrarOk(form, ok, { tipo: 'interesse', produtoNome: 'aparelho', preco: 0, condicao: 'seminovo', dados: dadosVazios({ nome: 'cliente', telefone: '(11) 90000-0000' }) });
    return;
  }
  const aberto = Number(form.dataset.aberto || 0);
  if (!aberto || Date.now() - aberto < MIN_PREENCHIMENTO_MS) {
    erro.textContent = 'Confira os dados e envie de novo em alguns segundos.';
    erro.hidden = false;
    return;
  }
  const recentes = enviosRecentes();
  if (recentes && recentes.length >= MAX_ENVIOS) {
    erro.textContent = 'Muitos envios em pouco tempo. Aguarde alguns minutos.';
    erro.hidden = false;
    return;
  }
  const ate = Number(localStorage.getItem('nc_lead_ate') || 0);
  if (Date.now() < ate) {
    erro.textContent = 'Aguarde alguns segundos para enviar de novo.';
    erro.hidden = false;
    return;
  }
  let pedido;
  try { pedido = montar(); }
  catch (e) {
    erro.textContent = e.message || 'Confira os campos.';
    erro.hidden = false;
    return;
  }
  const rotulo = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Enviando…';
  try {
    await store.savePedido(pedido);
    registrarEnvio();
    localStorage.setItem('nc_lead_ate', String(Date.now() + ESPERA));
    try { await notificar(pedido); } catch (e) { console.warn(e); }
    mostrarOk(form, ok, pedido);
  } catch (e) {
    console.error(e);
    erro.textContent = falha(e);
    erro.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = rotulo;
  }
}

function pintarFotos() {
  const box = $('#trocaThumbs');
  if (!box) return;
  box.replaceChildren();
  fotosTroca.forEach((src, i) => {
    const fig = document.createElement('figure');
    const img = document.createElement('img');
    img.src = src;
    img.alt = `Foto ${i + 1}`;
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = '×';
    b.setAttribute('aria-label', 'Remover foto');
    b.addEventListener('click', () => { fotosTroca.splice(i, 1); pintarFotos(); });
    fig.append(img, b);
    box.appendChild(fig);
  });
}

export function abrirInteresse(p) {
  const form = $('#formInteresse');
  const ok = $('#intOk');
  form.hidden = false;
  ok.hidden = true;
  form.reset();
  form.dataset.produtoId = p.id || '';
  form.dataset.produtoNome = tituloAparelho(p);
  form.dataset.preco = String(p.preco || 0);
  form.dataset.condicao = p.condicao || '';
  $('#intProduto').textContent = `${tituloAparelho(p)} · ${nomeCondicao(p.condicao)} · ${moeda(p.preco)}`;
  marcarAberto(form);
  const dlg = $('#pedido');
  if (!dlg.open) dlg.showModal();
  form.nome.focus();
}

export function iniciarPedidos(getProduto) {
  if (typeof getProduto === 'function') acharProduto = getProduto;
  ['#formTroca', '#formOrcamento'].forEach(sel => marcarAberto($(sel)));
  document.querySelectorAll('[data-tel]').forEach(input => {
    input.addEventListener('input', () => { input.value = mascaraTelefone(input.value); });
  });
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-interesse]');
    if (!btn) return;
    const det = $('#detalhe');
    if (det && det.open) det.close();
    const p = acharProduto(btn.dataset.interesse);
    if (p) abrirInteresse(p);
  });
  $('#fecharPedido').addEventListener('click', () => $('#pedido').close());
  $('#pedido').addEventListener('click', e => { if (e.target.id === 'pedido') $('#pedido').close(); });

  $('#formInteresse').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    enviar(form, $('#intOk'), () => {
      const base = exigirNomeTel(form);
      return {
        tipo: 'interesse',
        produtoId: corte(form.dataset.produtoId, 80),
        produtoNome: corte(form.dataset.produtoNome, 120),
        preco: Number(form.dataset.preco) || 0,
        condicao: ['novo', 'seminovo', 'usado'].includes(form.dataset.condicao) ? form.dataset.condicao : '',
        dados: dadosVazios({
          ...base,
          cidade: corte(form.cidade.value, 80),
          pagamento: ['avista', 'cartao', 'troca'].includes(form.pagamento.value) ? form.pagamento.value : 'avista',
          mensagem: corte(form.mensagem.value, 600)
        })
      };
    });
  });

  const peca = $('#trocaPeca');
  peca.addEventListener('change', () => { $('#trocaQuais').hidden = peca.value !== 'sim'; });
  $('#trocaFotos').addEventListener('change', async () => {
    const files = [...($('#trocaFotos').files || [])];
    $('#trocaFotos').value = '';
    const erro = $('#formTroca [data-erro]');
    for (const file of files) {
      if (fotosTroca.length >= 3) {
        erro.textContent = 'No máximo 3 fotos.';
        erro.hidden = false;
        break;
      }
      try { fotosTroca.push(await comprimirFoto(file)); }
      catch (e) {
        erro.textContent = 'Não foi possível usar uma das fotos. Escolha uma imagem menor.';
        erro.hidden = false;
      }
    }
    pintarFotos();
  });
  $('#formTroca').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    enviar(form, $('#trocaOk'), () => {
      const base = exigirNomeTel(form);
      const modelo = corte(form.modelo.value, 80);
      if (!modelo) throw new Error('Informe o modelo do iPhone.');
      const gb = Number(form.armazenamento.value);
      if (!Number.isFinite(gb) || gb <= 0) throw new Error('Informe o armazenamento em GB.');
      let saude = form.saude.value.trim();
      if (saude === '') throw new Error('Informe a saúde da bateria.');
      saude = Math.round(Number(saude));
      if (!Number.isFinite(saude) || saude < 0 || saude > 100) throw new Error('A saúde da bateria fica entre 0 e 100.');
      const qual = form.pecaTrocada.value;
      const partes = [...form.querySelectorAll('input[name="parte"]:checked')].map(el => el.value);
      const outra = corte(form.pecaOutra.value, 80);
      if (qual === 'sim' && !partes.length && !outra) throw new Error('Marque qual peça foi trocada.');
      let pecas = 'Não';
      if (qual === 'nao-sei') pecas = 'Não sei';
      if (qual === 'sim') {
        const nomes = partes.map(v => ({ tela: 'tela', bateria: 'bateria', camera: 'câmera', outra: outra ? `outra (${outra})` : 'outra' }[v]));
        pecas = `Sim: ${nomes.filter(Boolean).join(', ')}`;
      }
      return {
        tipo: 'troca',
        produtoId: '',
        produtoNome: '',
        preco: 0,
        condicao: '',
        dados: dadosVazios({
          ...base,
          modelo,
          armazenamento: `${gb} GB`,
          saudeBateria: saude,
          pecaTrocada: qual,
          pecas: corte(pecas, 200),
          estado: corte(form.estado.value, 200),
          caixa: form.caixa.checked,
          carregador: form.carregador.checked,
          interesse: corte(form.interesse.value, 120),
          fotos: fotosTroca.slice(0, 3)
        })
      };
    });
  });

  $('#formOrcamento').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    enviar(form, $('#orcOk'), () => {
      const base = exigirNomeTel(form);
      const assunto = corte(form.assunto.value, 80);
      if (!assunto) throw new Error('Informe o que você precisa.');
      return {
        tipo: 'orcamento',
        produtoId: '',
        produtoNome: '',
        preco: 0,
        condicao: '',
        dados: dadosVazios({
          ...base,
          assunto,
          mensagem: corte(form.mensagem.value, 600)
        })
      };
    });
  });
}
