/* =====================================================================
   Camada de dados — Firebase (Firestore + Auth) ou modo demonstração.
   Todas as páginas usam somente as funções exportadas aqui.
   ===================================================================== */
import { produtoPublico } from './aparelho.js';
import { exemplosVitrine } from './exemplos-vitrine.js';

const SDK = 'https://www.gstatic.com/firebasejs/12.4.0';
const C = window.NC_CONFIG;

// Modo demo só na URL desta visita (?demo=1) ou com DEMO_MODE no config.
// Não grava no celular: um ?demo=1 antigo deixava a loja fora do Firebase para sempre.
try { localStorage.removeItem('nc_demo'); } catch (e) {}
const qs = new URLSearchParams(location.search);
export function isConfigured() {
  const f = (C && C.firebaseConfig) || {};
  return !!(f.apiKey && f.projectId && !/TODO|COLE|TROQUE/i.test(String(f.apiKey) + String(f.projectId) + String(f.appId)));
}
// Sem Firebase preenchido, a vitrine abre com aparelhos de exemplo neste navegador.
export const DEMO = !!(C && C.DEMO_MODE) || qs.get('demo') === '1' || !isConfigured();
// Somente testes locais: ?emulator=1 em localhost conecta ao Firebase Emulator.
if (qs.get('emulator') === '1') localStorage.setItem('nc_emu', '1');
if (qs.get('emulator') === '0') localStorage.removeItem('nc_emu');
const EMULATOR = ['localhost', '127.0.0.1'].includes(location.hostname) && localStorage.getItem('nc_emu') === '1';

export const MODE = DEMO ? 'demo' : (isConfigured() ? 'firebase' : 'unconfigured');

export function newToken(len = 16) {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const b = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(b, x => abc[x % abc.length]).join('');
}
const toISO = v => v && typeof v.toDate === 'function' ? v.toDate().toISOString() : (v || new Date().toISOString());
const norm = (id, d) => ({ id, ...d, createdAt: toISO(d.createdAt), usedAt: d.usedAt ? toISO(d.usedAt) : undefined });
const corte = (v, n) => String(v ?? '').slice(0, n);
const porOrdem = (a, b) => (a.ordem - b.ordem) || String(a.createdAt).localeCompare(String(b.createdAt));
function normProduto(d) {
  const p = produtoPublico(d || {});
  return { ...p, createdAt: toISO(d && d.createdAt), updatedAt: d && d.updatedAt ? toISO(d.updatedAt) : '' };
}
function baseDemo() {
  const db = load();
  if (!db.produtos) {
    const seed = exemplosVitrine();
    db.produtos = seed.produtos;
    db.imeis = seed.imeis;
    save(db);
  }
  db.imeis = db.imeis || {};
  return db;
}
function limparRecibo(data) {
  const pags = Array.isArray(data.pagamentos) ? data.pagamentos.slice(0, 8) : [];
  return {
    numero: corte(data.numero, 40),
    data: corte(data.data, 10),
    vendedor: corte(data.vendedor, 80),
    garantia: corte(data.garantia, 40),
    codigo: corte(data.codigo, 40),
    modelo: corte(data.modelo, 120),
    imei: corte(data.imei, 40),
    imei2: corte(data.imei2, 40),
    armazenamento: corte(data.armazenamento, 40),
    ram: corte(data.ram, 40),
    cor: corte(data.cor, 40),
    serial: corte(data.serial, 60),
    condicao: corte(data.condicao, 20),
    qtd: corte(data.qtd, 20),
    valor: corte(data.valor, 40),
    desconto: corte(data.desconto, 40),
    obs: corte(data.obs, 2000),
    trocaModelo: corte(data.trocaModelo, 120),
    trocaValor: corte(data.trocaValor, 40),
    garantiaAte: corte(data.garantiaAte, 10),
    clienteNome: corte(data.clienteNome, 120),
    clienteCpf: corte(data.clienteCpf, 14),
    pagamentos: pags.map(p => ({
      forma: corte(p && p.forma, 80),
      detalhes: corte(p && p.detalhes, 120),
      valor: corte(p && p.valor, 40),
      parcelas: corte(p && p.parcelas, 20)
    }))
  };
}
function normRecibo(id, d) {
  return {
    id, ...d,
    createdAt: toISO(d.createdAt),
    updatedAt: d.updatedAt ? toISO(d.updatedAt) : toISO(d.createdAt),
    pagamentos: Array.isArray(d.pagamentos) ? d.pagamentos : []
  };
}

/* ======================= Firebase ======================= */
let fb = null;
async function firebase() {
  if (fb) return fb;
  const [app, fs, auth] = await Promise.all([
    import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-firestore.js`), import(`${SDK}/firebase-auth.js`)]);
  const a = app.initializeApp(C.firebaseConfig);
  // "Manter conectado" grava o login no IndexedDB e, se ele não existir, no
  // localStorage. No iPhone o Safari apaga o localStorage ao fechar (também no
  // atalho da tela de início) e o painel caía na tela de entrar. O IndexedDB
  // fica. Sem a caixinha, a sessão dura só enquanto o Safari está aberto.
  // Isso entra no initializeAuth, antes de ler quem está logado. O login não
  // pode trocar de volta para localStorage, senão o iPhone esquece de novo.
  // recibo.html e o simulador do painel são o mesmo site e reaproveitam a sessão.
  const manter = manterConectado();
  modoPersistencia = manter ? 'local' : 'session';
  let authInstance;
  try {
    authInstance = auth.initializeAuth(a, { persistence: opcoesPersistencia(auth, manter) });
  } catch (e) {
    authInstance = auth.getAuth(a);
    if (!manter) await auth.setPersistence(authInstance, auth.browserSessionPersistence);
  }
  fb = { fs, au: auth, db: fs.getFirestore(a), auth: authInstance };
  // Somente para testes locais com o Firebase Emulator (abrir com ?emulator=1 em localhost).
  if (EMULATOR) {
    fs.connectFirestoreEmulator(fb.db, '127.0.0.1', 8085);
    auth.connectAuthEmulator(fb.auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  return fb;
}

const CHAVE_MANTER = 'nc_manter_conectado';
let modoPersistencia = 'local';
function manterConectado() {
  try { return localStorage.getItem(CHAVE_MANTER) !== '0'; } catch (e) { return true; }
}
function gravarManter(manter) {
  try { localStorage.setItem(CHAVE_MANTER, manter ? '1' : '0'); } catch (e) {}
}
function opcoesPersistencia(auth, manter) {
  if (!manter) return auth.browserSessionPersistence;
  const lista = [auth.indexedDBLocalPersistence, auth.browserLocalPersistence].filter(Boolean);
  return lista.length ? lista : auth.browserLocalPersistence;
}
function indexedDbDisponivel() {
  if (typeof indexedDB === 'undefined' || !indexedDB) return Promise.resolve(false);
  const nome = 'nc_idb_probe';
  return new Promise(resolve => {
    let db;
    const fim = ok => {
      try { if (db) db.close(); } catch (e) {}
      try { indexedDB.deleteDatabase(nome); } catch (e) {}
      resolve(ok);
    };
    try {
      const req = indexedDB.open(nome, 1);
      req.onupgradeneeded = () => {
        try { if (!req.result.objectStoreNames.contains('t')) req.result.createObjectStore('t'); } catch (e) {}
      };
      req.onsuccess = () => { db = req.result; fim(true); };
      req.onerror = () => fim(false);
      req.onblocked = () => fim(false);
    } catch (e) { fim(false); }
  });
}
async function aplicarPersistenciaNoLogin(au, auth, manter) {
  if (!manter) {
    await au.setPersistence(auth, au.browserSessionPersistence);
    modoPersistencia = 'session';
    return;
  }
  // Já abriu com IndexedDB (e localStorage de reserva). Não chamar
  // setPersistence(localStorage): isso tirava o login do IndexedDB.
  if (modoPersistencia === 'local') return;
  if (await indexedDbDisponivel()) await au.setPersistence(auth, au.indexedDBLocalPersistence);
  else await au.setPersistence(auth, au.browserLocalPersistence);
  modoPersistencia = 'local';
}

const emailGestor = String((C && C.EMAIL_GESTOR) || '').trim().toLowerCase();
const CHAVE_SESSAO = 'nc_sessao_id';
const ONLINE_MS = 3 * 60 * 1000;
const SUMIR_MS = 24 * 60 * 60 * 1000;
let memoriaSessao = '';
let pararPresenca = () => {};
let revogando = false;

function lerIdSessao() {
  try { return localStorage.getItem(CHAVE_SESSAO) || memoriaSessao; } catch (e) { return memoriaSessao; }
}
function gravarIdSessao(id) {
  memoriaSessao = id;
  try { localStorage.setItem(CHAVE_SESSAO, id); } catch (e) {}
}
function limparIdSessao() {
  memoriaSessao = '';
  try { localStorage.removeItem(CHAVE_SESSAO); } catch (e) {}
}
function emMs(v) {
  if (!v) return 0;
  try {
    const d = typeof v.toDate === 'function' ? v.toDate() : new Date(v);
    const t = d.getTime();
    return Number.isNaN(t) ? 0 : t;
  } catch (e) { return 0; }
}
function descreverAparelho() {
  try {
    const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
    if (standalone) return 'App na tela inicial';
  } catch (e) {}
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  let so = 'Outro';
  if (/iPhone/.test(ua)) so = 'iPhone';
  else if (/iPad/.test(ua)) so = 'iPad';
  else if (/Android/.test(ua)) so = 'Android';
  else if (/Windows/.test(ua)) so = 'Windows';
  else if (/Mac OS|Macintosh/.test(ua)) so = 'Mac';
  else if (/Linux/.test(ua)) so = 'Linux';
  let nav = 'Navegador';
  if (/Edg\//.test(ua)) nav = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) nav = 'Opera';
  else if (/CriOS/.test(ua)) nav = 'Chrome';
  else if (/FxiOS|Firefox/.test(ua)) nav = 'Firefox';
  else if (/Chrome\//.test(ua)) nav = 'Chrome';
  else if (/Safari/.test(ua)) nav = 'Safari';
  return (so + ' · ' + nav).slice(0, 80);
}
function docSessao(fs, db, id) { return fs.doc(db, 'sessoes', id); }
function sessaoRevogada(data) { return !!(data && data.revogado === true); }
function dadosSessao(fs, email) {
  return {
    email,
    device: descreverAparelho(),
    createdAt: fs.serverTimestamp(),
    lastSeen: fs.serverTimestamp(),
    revogado: false
  };
}
async function sairPorRevogacao() {
  if (revogando) return;
  revogando = true;
  pararPresenca();
  pararPresenca = () => {};
  const id = lerIdSessao();
  limparIdSessao();
  try {
    if (id) {
      const { fs, db } = await firebase();
      await fs.deleteDoc(docSessao(fs, db, id));
    }
  } catch (e) { console.error(e); }
  try {
    const { au, auth } = await firebase();
    await au.signOut(auth);
  } catch (e) { console.error(e); }
}

const firebaseStore = {
  async onAuth(cb) {
    const { au, auth } = await firebase();
    if (typeof auth.authStateReady === 'function') await auth.authStateReady();
    return au.onAuthStateChanged(auth, u => cb(u ? { email: u.email } : null));
  },
  async login(email, senha, manter = true) {
    const { au, auth } = await firebase();
    gravarManter(!!manter);
    await aplicarPersistenciaNoLogin(au, auth, !!manter);
    await au.signInWithEmailAndPassword(auth, email, senha);
  },
  async resetPassword(email) { const { au, auth } = await firebase(); await au.sendPasswordResetEmail(auth, email); },
  async logout() { const { au, auth } = await firebase(); await au.signOut(auth); },
  async encerrarSessao() {
    pararPresenca();
    pararPresenca = () => {};
    const id = lerIdSessao();
    limparIdSessao();
    if (!id) return;
    try {
      const { fs, db, auth } = await firebase();
      if (!auth.currentUser) return;
      await fs.deleteDoc(docSessao(fs, db, id));
    } catch (e) { console.error(e); }
  },
  async desconectarSessao(id) {
    const { auth, fs, db } = await firebase();
    const email = (auth.currentUser && auth.currentUser.email || '').toLowerCase();
    if (!emailGestor || email !== emailGestor) throw new Error('Só o responsável da loja pode desconectar aparelhos.');
    if (!id || id === lerIdSessao()) throw new Error('Este aparelho continua logado.');
    await fs.updateDoc(docSessao(fs, db, id), { revogado: true });
  },
  async desconectarOutros() {
    const { auth, fs, db } = await firebase();
    const email = (auth.currentUser && auth.currentUser.email || '').toLowerCase();
    if (!emailGestor || email !== emailGestor) throw new Error('Só o responsável da loja pode desconectar os outros aparelhos.');
    const meu = lerIdSessao();
    const snap = await fs.getDocs(fs.collection(db, 'sessoes'));
    const agora = Date.now();
    const lote = fs.writeBatch(db);
    let n = 0;
    snap.docs.forEach(d => {
      const data = d.data() || {};
      if (d.id === meu || data.revogado) return;
      const visto = emMs(data.lastSeen);
      if (visto && agora - visto > SUMIR_MS) return;
      lote.update(d.ref, { revogado: true });
      n++;
    });
    if (n) await lote.commit();
    return n;
  },
  async assistirSessoes(cb) {
    const { auth, fs, db } = await firebase();
    const email = (auth.currentUser && auth.currentUser.email || '').toLowerCase();
    if (!emailGestor || email !== emailGestor) return () => {};
    return fs.onSnapshot(fs.collection(db, 'sessoes'), snap => {
      const agora = Date.now();
      const meu = lerIdSessao();
      const lista = [];
      snap.docs.forEach(d => {
        const data = d.data() || {};
        if (data.revogado) return;
        const lastSeen = emMs(data.lastSeen) || agora;
        if (agora - lastSeen > SUMIR_MS) return;
        lista.push({
          id: d.id,
          email: data.email || '',
          device: data.device || 'Aparelho',
          createdAt: emMs(data.createdAt),
          lastSeen,
          eu: d.id === meu
        });
      });
      cb(lista);
    }, err => { console.error(err); cb(null, err); });
  },
  async vigiarSessao() {
    revogando = false;
    const { auth, fs, db } = await firebase();
    const user = auth.currentUser;
    if (!user || !user.email) return () => {};
    const email = user.email;
    let id = lerIdSessao();
    let existe = false;
    if (id) {
      try {
        const atual = await fs.getDoc(docSessao(fs, db, id));
        if (atual.exists()) {
          const data = atual.data() || {};
          if (sessaoRevogada(data)) {
            await sairPorRevogacao();
            return null;
          }
          if ((data.email || '').toLowerCase() === email.toLowerCase()) existe = true;
          else id = '';
        }
      } catch (e) {
        // Doc sumiu ou a leitura falhou: não desloga. O mesmo id é recriado abaixo.
        console.error(e);
      }
    }
    try {
      if (!id || !existe) {
        if (!id) id = newToken(20);
        try {
          gravarIdSessao(id);
          await fs.setDoc(docSessao(fs, db, id), dadosSessao(fs, email));
        } catch (e) {
          console.error(e);
          id = newToken(20);
          gravarIdSessao(id);
          await fs.setDoc(docSessao(fs, db, id), dadosSessao(fs, email));
        }
      } else {
        gravarIdSessao(id);
        await fs.updateDoc(docSessao(fs, db, id), { lastSeen: fs.serverTimestamp(), device: descreverAparelho() });
      }
    } catch (e) {
      console.error(e);
      if (!lerIdSessao()) return () => {};
    }
    const refViva = docSessao(fs, db, lerIdSessao());
    const ping = () => {
      if (document.visibilityState === 'hidden') return;
      fs.updateDoc(refViva, { lastSeen: fs.serverTimestamp(), device: descreverAparelho() }).catch(err => console.error(err));
    };
    const onVis = () => { if (document.visibilityState === 'visible') ping(); };
    document.addEventListener('visibilitychange', onVis);
    const timer = setInterval(ping, 60000);
    let pararSnap = () => {};
    let escutaParada = false;
    let ajustando = false;
    let tentativas = 0;
    const garantir = async () => {
      if (revogando || !auth.currentUser || tentativas++ > 4) return false;
      try {
        const snap = await fs.getDoc(refViva);
        if (snap.exists()) {
          if (sessaoRevogada(snap.data())) {
            await sairPorRevogacao();
            return false;
          }
          tentativas = 0;
          return true;
        }
      } catch (e) { console.error(e); }
      try {
        await fs.setDoc(refViva, dadosSessao(fs, email));
        tentativas = 0;
        return true;
      } catch (e) {
        console.error(e);
        return false;
      }
    };
    const recuperar = () => {
      if (ajustando || escutaParada || revogando) return;
      ajustando = true;
      garantir().then(ok => {
        if (ok && !escutaParada && !revogando) escutar();
      }).finally(() => { ajustando = false; });
    };
    const escutar = () => {
      if (escutaParada || revogando) return;
      pararSnap();
      pararSnap = fs.onSnapshot(refViva, snap => {
        if (revogando) return;
        if (!snap.exists()) { recuperar(); return; }
        if (sessaoRevogada(snap.data())) sairPorRevogacao();
      }, err => { console.error(err); recuperar(); });
    };
    escutar();
    let parada = false;
    const parar = () => {
      if (parada) return;
      parada = true;
      escutaParada = true;
      pararSnap();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
      if (pararPresenca === parar) pararPresenca = () => {};
    };
    pararPresenca = parar;
    return parar;
  },

  async createLink({ name = '', phone = '' }) {
    const { fs, db } = await firebase();
    const id = newToken();
    await fs.setDoc(fs.doc(db, 'links', id), { name, phone, createdAt: fs.serverTimestamp(), used: false });
    return { id, name, phone, used: false, createdAt: new Date().toISOString() };
  },
  async getLink(id) {
    const { fs, db } = await firebase();
    const s = await fs.getDoc(fs.doc(db, 'links', id));
    return s.exists() ? norm(s.id, s.data()) : null;
  },
  // Cadastro do cliente: grava a submissão e marca o link como usado na MESMA operação (batch).
  // As regras do Firestore (firestore.rules) garantem que isso só acontece uma vez por link.
  async submit(linkId, data) {
    const { fs, db } = await firebase();
    const b = fs.writeBatch(db);
    b.set(fs.doc(db, 'submissions', linkId), { ...data, linkId, createdAt: fs.serverTimestamp() });
    b.update(fs.doc(db, 'links', linkId), { used: true, usedAt: fs.serverTimestamp() });
    // Sem internet o Firestore espera indefinidamente; limitamos a 25 s.
    const timeout = new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'timeout' })), 25000));
    try { await Promise.race([b.commit(), timeout]); }
    catch (e) {
      if (e.code === 'permission-denied') throw new Error('Este link é inválido ou já foi utilizado.');
      if (e.code === 'unavailable' || e.code === 'failed-precondition' || e.code === 'not-found' || e.code === 'timeout') {
        throw new Error('Não foi possível enviar agora. Verifique sua internet e tente de novo. Se continuar, o cadastro ainda pode estar sendo ativado — fale com a loja.');
      }
      throw new Error('Não foi possível enviar. Verifique sua internet e tente novamente.');
    }
    return { id: linkId };
  },
  async getSubmission(id) {
    const { fs, db } = await firebase();
    const s = await fs.getDoc(fs.doc(db, 'submissions', id));
    return s.exists() ? norm(s.id, s.data()) : null;
  },
  async listRecibos(submissionId) {
    const { fs, db } = await firebase();
    const q = fs.query(fs.collection(db, 'submissions', submissionId, 'recibos'), fs.orderBy('createdAt', 'desc'));
    const snap = await fs.getDocs(q);
    return snap.docs.map(d => normRecibo(d.id, d.data()));
  },
  async getRecibo(submissionId, reciboId) {
    const { fs, db } = await firebase();
    const s = await fs.getDoc(fs.doc(db, 'submissions', submissionId, 'recibos', reciboId));
    return s.exists() ? normRecibo(s.id, s.data()) : null;
  },
  async saveRecibo(submissionId, reciboId, data) {
    const { fs, db } = await firebase();
    const body = limparRecibo(data);
    const now = fs.serverTimestamp();
    if (!reciboId) {
      const ref = fs.doc(fs.collection(db, 'submissions', submissionId, 'recibos'));
      await fs.setDoc(ref, { ...body, createdAt: now, updatedAt: now });
      return { id: ref.id };
    }
    await fs.updateDoc(fs.doc(db, 'submissions', submissionId, 'recibos', reciboId), { ...body, updatedAt: now });
    return { id: reciboId };
  },
  async listVendas() {
    const { fs, db } = await firebase();
    const snap = await fs.getDocs(fs.collectionGroup(db, 'recibos'));
    return snap.docs.map(d => {
      const pai = d.ref.parent && d.ref.parent.parent;
      return { ...normRecibo(d.id, d.data()), submissionId: pai ? pai.id : '' };
    }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  },
  async watchSubmissions(cb, onErr) {
    const { fs, db } = await firebase();
    const q = fs.query(fs.collection(db, 'submissions'), fs.orderBy('createdAt', 'desc'), fs.limit(500));
    return fs.onSnapshot(q, snap => cb(snap.docs.map(d => norm(d.id, d.data({ serverTimestamps: 'estimate' })))), onErr);
  },
  async watchLinks(cb, onErr) {
    const { fs, db } = await firebase();
    const q = fs.query(fs.collection(db, 'links'), fs.orderBy('createdAt', 'desc'), fs.limit(100));
    return fs.onSnapshot(q, snap => cb(snap.docs.map(d => norm(d.id, d.data({ serverTimestamps: 'estimate' })))), onErr);
  },
  async listProdutos() {
    const { fs, db } = await firebase();
    const snap = await fs.getDocs(fs.collection(db, 'produtos'));
    const lista = [];
    for (const d of snap.docs) {
      let imei = '';
      try {
        const priv = await fs.getDoc(fs.doc(db, 'produtos', d.id, 'privado', 'ficha'));
        if (priv.exists()) imei = priv.data().imei || '';
      } catch (e) { /* a ficha privada pode ainda não existir */ }
      lista.push({ id: d.id, ...normProduto(d.data()), imei });
    }
    return lista.sort(porOrdem);
  },
  async listProdutosPublicos() {
    const { fs, db } = await firebase();
    const q = fs.query(fs.collection(db, 'produtos'), fs.where('visivel', '==', true), fs.where('vendido', '==', false));
    const snap = await fs.getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...normProduto(d.data()) })).sort(porOrdem);
  },
  async saveProduto(id, data) {
    const { fs, db } = await firebase();
    const pub = produtoPublico(data);
    const ref = id ? fs.doc(db, 'produtos', id) : fs.doc(fs.collection(db, 'produtos'));
    const agora = fs.serverTimestamp();
    if (!id) await fs.setDoc(ref, { ...pub, createdAt: agora, updatedAt: agora });
    else {
      const prev = await fs.getDoc(ref);
      const createdAt = prev.exists() && prev.data().createdAt ? prev.data().createdAt : agora;
      await fs.setDoc(ref, { ...pub, createdAt, updatedAt: agora });
    }
    const imei = corte(data.imei, 20);
    await fs.setDoc(fs.doc(db, 'produtos', ref.id, 'privado', 'ficha'), { imei });
    return { id: ref.id };
  },
  async patchProduto(id, patch) {
    const { fs, db } = await firebase();
    const permitido = {};
    if ('ordem' in patch) permitido.ordem = produtoPublico({ ...patch, modelo: 'x' }).ordem;
    if ('visivel' in patch) permitido.visivel = !!patch.visivel;
    if ('vendido' in patch) permitido.vendido = !!patch.vendido;
    permitido.updatedAt = fs.serverTimestamp();
    await fs.updateDoc(fs.doc(db, 'produtos', id), permitido);
  },
  async deleteProduto(id) {
    const { fs, db } = await firebase();
    try { await fs.deleteDoc(fs.doc(db, 'produtos', id, 'privado', 'ficha')); } catch (e) {}
    await fs.deleteDoc(fs.doc(db, 'produtos', id));
  },
  async savePedido(pedido) {
    const { fs, db } = await firebase();
    const ref = fs.doc(fs.collection(db, 'pedidos'));
    await fs.setDoc(ref, { ...pedido, status: 'novo', createdAt: fs.serverTimestamp() });
    return { id: ref.id };
  },
  async listPedidos() {
    const { fs, db } = await firebase();
    const q = fs.query(fs.collection(db, 'pedidos'), fs.orderBy('createdAt', 'desc'), fs.limit(200));
    const snap = await fs.getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return { id: d.id, ...data, createdAt: toISO(data.createdAt), updatedAt: data.updatedAt ? toISO(data.updatedAt) : '' };
    });
  },
  async patchPedido(id, status) {
    const { fs, db } = await firebase();
    if (!['novo', 'em contato', 'fechado', 'descartado'].includes(status)) throw new Error('status');
    await fs.updateDoc(fs.doc(db, 'pedidos', id), { status, updatedAt: fs.serverTimestamp() });
  },
  async deletePedido(id) {
    const { fs, db } = await firebase();
    await fs.deleteDoc(fs.doc(db, 'pedidos', id));
  },
};

/* ======================= Demo (localStorage) ======================= */
const KEY = 'nc_demo_db';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { links: {}, submissions: {}, recibos: {} }; } catch { return { links: {}, submissions: {}, recibos: {} }; } };
const save = db => { localStorage.setItem(KEY, JSON.stringify(db)); window.dispatchEvent(new Event('nc-demo-change')); };
const sorted = obj => Object.entries(obj).map(([id, d]) => ({ id, ...d })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
function watchDemo(pick, cb) {
  const fire = () => cb(sorted(load()[pick]));
  fire();
  window.addEventListener('nc-demo-change', fire);
  window.addEventListener('storage', e => { if (e.key === KEY) fire(); });
  return () => window.removeEventListener('nc-demo-change', fire);
}
function usuarioDemo() {
  try { return localStorage.getItem('nc_demo_user') || sessionStorage.getItem('nc_demo_user') || ''; }
  catch (e) { return ''; }
}
const demoStore = {
  async onAuth(cb) { const email = usuarioDemo(); cb(email ? { email } : null); },
  async login(email, senha, manter = true) {
    if (!email || !senha) throw new Error('Informe usuário e senha.');
    gravarManter(manter);
    if (manter) {
      localStorage.setItem('nc_demo_user', email);
      sessionStorage.removeItem('nc_demo_user');
    } else {
      sessionStorage.setItem('nc_demo_user', email);
      localStorage.removeItem('nc_demo_user');
    }
  },
  async resetPassword() {},
  async logout() {
    localStorage.removeItem('nc_demo_user');
    sessionStorage.removeItem('nc_demo_user');
  },
  async createLink({ name = '', phone = '' }) {
    const db = load(), id = newToken();
    db.links[id] = { name, phone, createdAt: new Date().toISOString(), used: false };
    save(db); return { id, ...db.links[id] };
  },
  async getLink(id) { const l = load().links[id]; return l ? { id, ...l } : null; },
  async submit(linkId, data) {
    const db = load(), l = db.links[linkId];
    if (!l || l.used || db.submissions[linkId]) throw new Error('Este link é inválido ou já foi utilizado.');
    const now = new Date().toISOString();
    db.submissions[linkId] = { ...data, linkId, createdAt: now };
    l.used = true; l.usedAt = now; save(db);
    return { id: linkId };
  },
  async getSubmission(id) { const s = load().submissions[id]; return s ? { id, ...s } : null; },
  async listRecibos(submissionId) {
    const all = (load().recibos || {})[submissionId] || {};
    return Object.entries(all).map(([id, d]) => normRecibo(id, d))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  },
  async getRecibo(submissionId, reciboId) {
    const r = ((load().recibos || {})[submissionId] || {})[reciboId];
    return r ? normRecibo(reciboId, r) : null;
  },
  async saveRecibo(submissionId, reciboId, data) {
    const db = load();
    db.recibos = db.recibos || {};
    db.recibos[submissionId] = db.recibos[submissionId] || {};
    const now = new Date().toISOString();
    const body = limparRecibo(data);
    if (!reciboId) {
      const id = newToken();
      db.recibos[submissionId][id] = { ...body, createdAt: now, updatedAt: now };
      save(db);
      return { id };
    }
    const prev = db.recibos[submissionId][reciboId];
    if (!prev) throw new Error('Recibo não encontrado.');
    db.recibos[submissionId][reciboId] = { ...body, createdAt: prev.createdAt, updatedAt: now };
    save(db);
    return { id: reciboId };
  },
  async listVendas() {
    const db = load();
    const out = [];
    for (const [submissionId, mapa] of Object.entries(db.recibos || {})) {
      const cli = (db.submissions || {})[submissionId] || {};
      for (const [id, r] of Object.entries(mapa || {})) {
        out.push(normRecibo(id, {
          ...r,
          clienteNome: r.clienteNome || cli.nome || '',
          clienteCpf: r.clienteCpf || cli.cpf || '',
          submissionId
        }));
      }
    }
    return out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  },
  async watchSubmissions(cb) { return watchDemo('submissions', cb); },
  async watchLinks(cb) { return watchDemo('links', cb); },
  async listProdutos() {
    const db = baseDemo();
    return Object.entries(db.produtos).map(([id, d]) => ({ id, ...normProduto(d), imei: db.imeis[id] || '' })).sort(porOrdem);
  },
  async listProdutosPublicos() {
    const lista = await this.listProdutos();
    return lista.filter(p => p.visivel && !p.vendido).map(p => { const { imei, ...pub } = p; return pub; });
  },
  async saveProduto(id, data) {
    const db = baseDemo();
    const pub = produtoPublico(data);
    const now = new Date().toISOString();
    const pid = id || newToken();
    const prev = db.produtos[pid];
    db.produtos[pid] = { ...pub, createdAt: prev ? prev.createdAt : now, updatedAt: now };
    db.imeis[pid] = corte(data.imei, 20);
    save(db);
    return { id: pid };
  },
  async patchProduto(id, patch) {
    const db = baseDemo();
    const prev = db.produtos[id];
    if (!prev) throw new Error('Aparelho não encontrado.');
    if ('ordem' in patch) prev.ordem = produtoPublico({ ...prev, ordem: patch.ordem }).ordem;
    if ('visivel' in patch) prev.visivel = !!patch.visivel;
    if ('vendido' in patch) prev.vendido = !!patch.vendido;
    prev.updatedAt = new Date().toISOString();
    save(db);
  },
  async deleteProduto(id) {
    const db = baseDemo();
    delete db.produtos[id];
    delete db.imeis[id];
    save(db);
  },
  async savePedido(pedido) {
    const db = baseDemo();
    db.pedidos = db.pedidos || {};
    const id = newToken();
    const now = new Date().toISOString();
    db.pedidos[id] = { ...pedido, status: 'novo', createdAt: now, updatedAt: now };
    save(db);
    return { id };
  },
  async listPedidos() {
    const db = baseDemo();
    db.pedidos = db.pedidos || {};
    return Object.entries(db.pedidos).map(([id, d]) => ({ id, ...d })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  },
  async patchPedido(id, status) {
    const db = baseDemo();
    if (!db.pedidos || !db.pedidos[id]) throw new Error('Pedido não encontrado.');
    if (!['novo', 'em contato', 'fechado', 'descartado'].includes(status)) throw new Error('status');
    db.pedidos[id].status = status;
    db.pedidos[id].updatedAt = new Date().toISOString();
    save(db);
  },
  async deletePedido(id) {
    const db = baseDemo();
    if (db.pedidos) delete db.pedidos[id];
    save(db);
  },
  async desconectarOutros() { throw new Error('Isso só funciona no painel ligado ao Firebase.'); },
  async desconectarSessao() { throw new Error('Isso só funciona no painel ligado ao Firebase.'); },
  async encerrarSessao() {},
  async assistirSessoes() { return () => {}; },
  async vigiarSessao() { return () => {}; },
};

export const store = DEMO ? demoStore : firebaseStore;

// Faixa de demonstração. js/demo-aviso.js desenha; aqui só garante se o script não rodou.
export function demoBanner() {
  if (typeof window.ncMostrarDemo === 'function') window.ncMostrarDemo();
}

// Envio de e-mail opcional via Formspree. Na demonstração não sai nada daqui.
export function emailFormspree(d) {
  if (DEMO || !C.FORMSPREE_ID) return;
  fetch(`https://formspree.io/f/${C.FORMSPREE_ID}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ _subject: `Novo cadastro: ${d.nome}`, ...d }),
  }).catch(() => {});
}
