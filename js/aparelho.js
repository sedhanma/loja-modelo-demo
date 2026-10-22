/* Dados do aparelho da vitrine e ilustrações genéricas (sem foto de fabricante). */

export const FAMILIAS = [
  { id: 'iphone-ilha', nome: 'iPhone (ilha)' },
  { id: 'iphone-notch', nome: 'iPhone (entalhe)' },
  { id: 'android-furo', nome: 'Android (furo)' },
  { id: 'android-gota', nome: 'Android (gota)' },
  { id: 'basico', nome: 'Celular simples' }
];

export const CORES = [
  ['Preto', '#1a1a1a'],
  ['Branco', '#f2f2f2'],
  ['Prata', '#c5c9ce'],
  ['Grafite', '#3e4450'],
  ['Azul', '#1d4e89'],
  ['Verde', '#0b7a45'],
  ['Roxo', '#5b3a8c'],
  ['Rosa', '#e7a0b4'],
  ['Dourado', '#c6a15b'],
  ['Vermelho', '#9c2b2b']
];

export const CONDICOES = [
  ['novo', 'Novo'],
  ['seminovo', 'Seminovo'],
  ['usado', 'Usado']
];

const corte = (v, n) => String(v ?? '').trim().slice(0, n);
const num = (v, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

export function hexCor(v) {
  const s = String(v || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : '#1a1a1a';
}

export function urlHttp(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return s.slice(0, 500);
  } catch (e) { return ''; }
}

export function nomeCondicao(id) {
  const achou = CONDICOES.find(c => c[0] === id);
  return achou ? achou[1] : 'Seminovo';
}

export function moeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function produtoPublico(data) {
  const condicao = CONDICOES.some(c => c[0] === data.condicao) ? data.condicao : 'seminovo';
  const ilustracao = FAMILIAS.some(f => f.id === data.ilustracao) ? data.ilustracao : '';
  let saude = data.saudeBateria;
  if (saude === '' || saude == null) saude = null;
  else saude = Math.round(num(saude, 0, 100));
  const fotos = (Array.isArray(data.fotos) ? data.fotos : [])
    .filter(f => typeof f === 'string' && /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(f) && f.length <= 200000)
    .slice(0, 4);
  return {
    marca: corte(data.marca, 40),
    modelo: corte(data.modelo, 80),
    armazenamento: Math.round(num(data.armazenamento, 0, 2048)),
    ram: corte(data.ram, 20),
    cor: corte(data.cor, 40),
    corHex: hexCor(data.corHex),
    condicao,
    preco: Math.round(num(data.preco, 0, 2000000) * 100) / 100,
    descricao: corte(data.descricao, 280),
    saudeBateria: saude,
    bateriaTrocada: !!data.bateriaTrocada,
    pecas: corte(data.pecas, 400),
    garantia: corte(data.garantia, 80),
    acompanhaCaixa: !!data.acompanhaCaixa,
    acompanhaCarregador: !!data.acompanhaCarregador,
    fotos,
    ilustracao,
    imagemUrl: urlHttp(data.imagemUrl),
    visivel: data.visivel !== false,
    vendido: !!data.vendido,
    ordem: Math.round(num(data.ordem, 0, 100000))
  };
}

export function tituloAparelho(p) {
  const gb = p.armazenamento ? `${p.armazenamento} GB` : '';
  return [p.marca, p.modelo, gb].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export function mensagemInteresse(p) {
  const nome = tituloAparelho(p) || 'um aparelho';
  const extra = [nomeCondicao(p.condicao), p.cor, p.ram ? `RAM ${p.ram}` : '', moeda(p.preco)].filter(Boolean).join(', ');
  return `Olá! Tenho interesse no ${nome} (${extra}). Ainda está disponível?`;
}

function luma(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000;
}

export function svgMockup(familia, corHex) {
  const cor = hexCor(corHex);
  const claro = luma(cor) > 170;
  const borda = claro ? '#2a2a2a' : 'rgba(0,0,0,.35)';
  const tela = claro ? '#101820' : '#070b10';
  let camera = '';
  if (familia === 'iphone-ilha') {
    camera = `<rect x="78" y="36" width="44" height="14" rx="7" fill="#0c0c0c"/>`;
  } else if (familia === 'iphone-notch') {
    camera = `<path d="M70 28 h60 a8 8 0 0 1 8 8 v8 H62 v-8 a8 8 0 0 1 8-8z" fill="#0c0c0c"/>`;
  } else if (familia === 'android-furo') {
    camera = `<circle cx="100" cy="42" r="5" fill="#0c0c0c"/>`;
  } else if (familia === 'android-gota') {
    camera = `<path d="M96 34 h8 a6 8 0 0 1 0 16 h-8 a6 8 0 0 1 0-16z" fill="#0c0c0c"/>`;
  } else {
    camera = `<rect x="86" y="36" width="28" height="4" rx="2" fill="#0c0c0c" opacity=".7"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 400" role="img" aria-label="Ilustração genérica de celular">
    <rect x="36" y="24" width="128" height="352" rx="28" fill="${cor}" stroke="${borda}" stroke-width="3"/>
    <rect x="48" y="40" width="104" height="312" rx="8" fill="${tela}"/>
    <rect x="58" y="250" width="84" height="70" rx="8" fill="#12324a" opacity=".55"/>
    <rect x="70" y="268" width="60" height="8" rx="4" fill="#e0b15a" opacity=".85"/>
    <rect x="70" y="284" width="40" height="6" rx="3" fill="#ffffff" opacity=".35"/>
    ${camera}
    <rect x="92" y="338" width="16" height="4" rx="2" fill="${claro ? '#222' : '#fff'}" opacity=".45"/>
  </svg>`;
}

export function svgDataUrl(familia, corHex) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgMockup(familia, corHex))}`;
}

/** Fotos reais primeiro. Sem elas, URL colada e depois a ilustração. */
export function midiaAparelho(p) {
  if (p.fotos && p.fotos.length) return { ilustrativa: false, itens: p.fotos.slice() };
  if (p.imagemUrl) return { ilustrativa: true, itens: [p.imagemUrl] };
  if (p.ilustracao) return { ilustrativa: true, itens: [svgDataUrl(p.ilustracao, p.corHex)] };
  return { ilustrativa: false, itens: [] };
}
