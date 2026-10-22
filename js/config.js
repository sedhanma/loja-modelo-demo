window.NC_CONFIG = {

  firebaseConfig: {
    apiKey: "TODO",
    authDomain: "TODO",
    projectId: "TODO",
    storageBucket: "TODO",
    messagingSenderId: "TODO",
    appId: "TODO"
  },

  STORE_WHATSAPP: "5500000000000",

  FORMSPREE_ID: "",

  DEMO_MODE: true,

  LOJA_NOME: "Sua Loja",

  EMAIL_NOTIFICACOES: "",

  CIDADE: "Sua Cidade",
  UF: "UF",

  HORARIOS: {
    semana: "Comercial",
    sabado: "Horário especial"
  },

  DOMINIO_LOJA: "",

  USUARIOS: {
    loja: "admin@sualoja.com"
  },

  ADMINS: [
    "admin@sualoja.com"
  ],

  EMAIL_GESTOR: "admin@sualoja.com",

  CORES: {
    fundo: "#16181d",
    fundo2: "#22262e",
    card: "rgba(28, 32, 40, .82)",
    texto: "#f3f4f6",
    mudo: "#b6bcc6",
    destaque: "#e0b15a",
    destaqueEscuro: "#8d6a32",
    destaqueClaro: "#f3ddb0",
    destaqueSuave: "#fff4df",
    acento: "#3c4a5e",
    textoBotao: "#1a1c20",
    perigo: "#e15b5b",
    ok: "#3eae7a"
  },

  STORE: {
    nome: "Sua Loja",
    endereco: "",
    cnpj: "",
    telefone: "(00) 00000-0000",
    instagram: "@sualoja",
    instagramUrl: "https://www.instagram.com/sualoja",
    vendedorPadrao: ""
  }
};

function pastaDoSite() {
  const base = new URL(location.href);
  const ultimo = base.pathname.split("/").pop();
  if (ultimo && !ultimo.includes(".")) base.pathname = base.pathname.replace(/\/?$/, "/");
  return base;
}
window.NC_CONFIG.pagina = function (arquivo) {
  const u = new URL(arquivo, pastaDoSite());
  u.search = "";
  u.hash = "";
  return u.href;
};
Object.defineProperty(window.NC_CONFIG, "FORM_URL", {
  get() { return window.NC_CONFIG.pagina("form.html"); }
});

function hexParaRgb(hex) {
  const h = String(hex || "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return "";
  const n = parseInt(h, 16);
  return ((n >> 16) & 255) + ", " + ((n >> 8) & 255) + ", " + (n & 255);
}
function aplicarCores() {
  const c = window.NC_CONFIG.CORES || {};
  const root = document.documentElement;
  const set = (nome, valor) => { if (valor) root.style.setProperty(nome, valor); };
  set("--bg", c.fundo);
  set("--bg-2", c.fundo2 || c.fundo);
  set("--card", c.card);
  set("--text", c.texto);
  set("--muted", c.mudo);
  set("--gold", c.destaque);
  set("--gold-2", c.destaque);
  set("--gold-1", c.destaqueEscuro);
  set("--gold-3", c.destaqueClaro);
  set("--gold-4", c.destaqueSuave);
  set("--acento", c.acento);
  set("--ink", c.textoBotao);
  set("--danger", c.perigo);
  set("--ok", c.ok);
  set("--gold-rgb", hexParaRgb(c.destaque));
  set("--marca-rgb", hexParaRgb(c.destaqueEscuro));
  set("--acento-rgb", hexParaRgb(c.acento));
  if (c.destaqueEscuro && c.destaque && c.acento) {
    set("--gold-grad", "linear-gradient(100deg, " + c.destaqueEscuro + " 0%, " + c.destaque + " 42%, " + (c.destaqueClaro || c.destaque) + " 50%, " + c.destaque + " 70%, " + c.acento + " 100%)");
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && c.fundo) meta.setAttribute("content", c.fundo);
}
aplicarCores();

function aplicarMarca() {
  const C = window.NC_CONFIG;
  const nome = String(C.LOJA_NOME || "Sua Loja").trim();
  const cidade = String(C.CIDADE || "").trim();
  const uf = String(C.UF || "").trim();
  const local = uf ? cidade + "/" + uf : cidade;
  const tel = String((C.STORE && C.STORE.telefone) || "").trim();
  const zap = String(C.STORE_WHATSAPP || "").replace(/\D/g, "");
  const ig = String((C.STORE && C.STORE.instagram) || "").trim();
  const igUrl = String((C.STORE && C.STORE.instagramUrl) || "").trim();
  document.querySelectorAll("[data-loja]").forEach(el => { el.textContent = nome; });
  document.querySelectorAll("img[data-logo]").forEach(img => { img.alt = nome; });
  document.querySelectorAll("[data-fone]").forEach(el => { el.textContent = tel; });
  document.querySelectorAll("a[data-instagram]").forEach(a => {
    if (igUrl) a.href = igUrl;
    a.textContent = ig ? "Instagram " + ig : "Instagram";
  });
  document.querySelectorAll("a[data-zap]").forEach(a => {
    if (!zap) return;
    const texto = a.getAttribute("data-zap-texto") || "";
    a.href = texto ? "https://wa.me/" + zap + "?text=" + encodeURIComponent(texto) : "https://wa.me/" + zap;
  });
  const trocar = s => String(s || "").replaceAll("{loja}", nome).replaceAll("{cidade}", local);
  const titulo = document.documentElement.getAttribute("data-title");
  if (titulo) document.title = trocar(titulo);
  const desc = document.querySelector('meta[name="description"]');
  if (desc && desc.content.includes("{")) desc.content = trocar(desc.content);
  const og = document.querySelector('meta[property="og:title"]');
  if (og && og.content.includes("{")) og.content = trocar(og.content);
  const apple = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (apple) apple.setAttribute("content", nome);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", aplicarMarca);
else aplicarMarca();
