/* Aba Pedidos do painel. */
import { store } from './store.js';
import { nomeCondicao, moeda } from './aparelho.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STATUS = [['novo', 'Novo'], ['em contato', 'Em contato'], ['fechado', 'Fechado'], ['descartado', 'Descartado']];
const TIPO = { interesse: 'Interesse', troca: 'Troca de iPhone', orcamento: 'Orçamento' };
let lista = [];

function quando(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function zapHref(p) {
  let n = String((p.dados && p.dados.telefone) || '').replace(/\D/g, '');
  if (n.length >= 10 && n.length <= 11) n = '55' + n;
  const nome = (p.dados && p.dados.nome) || '';
  const sobre = p.produtoNome || (p.dados && p.dados.modelo) || (p.dados && p.dados.assunto) || 'seu pedido';
  const loja = String((window.NC_CONFIG && window.NC_CONFIG.LOJA_NOME) || 'Sua Loja');
  const texto = `Olá${nome ? ' ' + nome.split(' ')[0] : ''}! Aqui é da ${loja}. Recebemos seu contato sobre ${sobre}.`;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

function resumo(p) {
  const d = p.dados || {};
  const partes = [];
  if (p.produtoNome) partes.push(`${p.produtoNome} · ${p.condicao ? nomeCondicao(p.condicao) : ''} · ${moeda(p.preco)}`.replace(/ · · /g, ' · '));
  if (d.modelo) partes.push(`${d.modelo} ${d.armazenamento || ''}`.trim());
  if (d.saudeBateria != null && d.saudeBateria !== '') partes.push(`bateria ${d.saudeBateria}%`);
  if (d.pecas) partes.push(d.pecas);
  if (d.assunto) partes.push(d.assunto);
  if (d.mensagem) partes.push(d.mensagem);
  if (d.fotos && d.fotos.length) partes.push(`${d.fotos.length} foto(s)`);
  return partes.filter(Boolean).join(' · ');
}

function desenhar() {
  const box = $('#pedLista');
  if (!lista.length) {
    box.innerHTML = '<p class="vit-nota">Nenhum pedido ainda.</p>';
    return;
  }
  box.innerHTML = lista.map(p => {
    const d = p.dados || {};
    const fotos = (d.fotos || []).map(src => `<img src="${esc(src)}" alt="">`).join('');
    const botoes = STATUS.map(([id, nome]) => `<button type="button" data-status="${esc(id)}" data-id="${esc(p.id)}" class="${p.status === id ? 'on' : ''}">${nome}</button>`).join('');
    return `<article class="ped-item">
      <header><b>${esc(d.nome || 'Sem nome')}</b> <span>${esc(TIPO[p.tipo] || p.tipo)}</span></header>
      <p>${esc(d.telefone || '')}${d.cidade ? ' · ' + esc(d.cidade) : ''}</p>
      <p>${esc(resumo(p))}</p>
      <p class="vit-nota">${esc(quando(p.createdAt))}</p>
      ${fotos ? `<div class="thumbs">${fotos}</div>` : ''}
      <div class="ped-status">${botoes}</div>
      <div class="vit-acoes">
        <a href="${esc(zapHref(p))}" target="_blank" rel="noopener">Responder no WhatsApp</a>
        <button type="button" data-apagar="${esc(p.id)}">Apagar</button>
      </div>
    </article>`;
  }).join('');
}

async function carregar() {
  try {
    lista = await store.listPedidos();
    desenhar();
    $('#pedMsg').textContent = '';
  } catch (e) {
    console.error(e);
    const code = String((e && (e.code || e.message)) || '');
    $('#pedMsg').textContent = /permission/i.test(code)
      ? 'Não foi possível ler os pedidos. Publique o arquivo firestore.rules no Firebase (Firestore → Regras → Publicar).'
      : 'Não foi possível ler os pedidos.';
  }
}

export function iniciarPedidosAdmin() {
  $('#pedLista').addEventListener('click', async e => {
    const status = e.target.closest('[data-status]');
    const apagar = e.target.closest('[data-apagar]');
    try {
      if (status) await store.patchPedido(status.dataset.id, status.dataset.status);
      if (apagar) {
        if (!confirm('Apagar este pedido?')) return;
        await store.deletePedido(apagar.dataset.apagar);
      }
      if (status || apagar) await carregar();
    } catch (err) {
      console.error(err);
      $('#pedMsg').textContent = 'Não foi possível atualizar o pedido.';
    }
  });
  carregar();
}
