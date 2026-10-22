import { store, MODE, DEMO, demoBanner, emailFormspree } from './store.js';
const { STORE_WHATSAPP, LOJA_NOME } = window.NC_CONFIG;
{
  const $ = s => document.querySelector(s);
  const form = $('#form');
  const linkId = new URLSearchParams(location.search).get('id');
  $('#year').textContent = new Date().getFullYear();

  const only = v => v.replace(/\D/g, '');
  const masks = {
    cpf: v => only(v).slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'),
    telefone: v => {
      const d = only(v).slice(0, 11);
      if (d.length <= 2) return d.length ? '(' + d : '';
      if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    },
    cep: v => only(v).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2'),
    uf: v => v.replace(/[^a-z]/gi, '').slice(0, 2).toUpperCase(),
    instagram: v => v.replace(/^@+/, '').replace(/\s/g, '').toLowerCase(),
  };
  Object.keys(masks).forEach(id => {
    const el = $('#' + id);
    el.addEventListener('input', () => { el.value = masks[id](el.value); });
  });

  function validCPF(cpf) {
    cpf = only(cpf);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    for (let t = 9; t < 11; t++) {
      let s = 0;
      for (let i = 0; i < t; i++) s += +cpf[i] * (t + 1 - i);
      if (((s * 10) % 11) % 10 !== +cpf[t]) return false;
    }
    return true;
  }
  const rules = {
    nome: v => v.trim().split(/\s+/).filter(p => p.length > 1).length >= 2,
    cpf: validCPF,
    nascimento: v => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
      const d = new Date(v + 'T00:00'), now = new Date();
      return d < now && d.getFullYear() > now.getFullYear() - 120;
    },
    telefone: v => only(v).length >= 10,
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    cep: v => only(v).length === 8,
    endereco: v => v.trim().length > 2,
    numero: v => v.trim().length > 0,
    cidade: v => v.trim().length > 1,
    comoConheceuOutro: v => !isOutro() || v.trim().length > 1,
  };
  function check(id, show = true) {
    const el = $('#' + id), f = el.closest('.field');
    const ok = rules[id](el.value);
    if (show) { f.classList.toggle('invalid', !ok); f.classList.toggle('valid', ok && id !== 'comoConheceuOutro'); }
    return ok;
  }
  Object.keys(rules).forEach(id => {
    const el = $('#' + id);
    el.addEventListener('blur', () => { if (el.value) check(id); });
    el.addEventListener('input', () => {
      const f = el.closest('.field');
      if (f.classList.contains('invalid') || f.classList.contains('valid')) check(id);
      updateProgress();
    });
  });

  const isOutro = () => form.comoConheceu.value === 'Outro';
  form.querySelectorAll('input[name=comoConheceu]').forEach(r => r.addEventListener('change', () => {
    $('#comoErr').classList.remove('show');
    $('#outroWrap').classList.toggle('open', isOutro());
    if (isOutro()) setTimeout(() => $('#comoConheceuOutro').focus(), 250);
    else $('#outroWrap').classList.remove('invalid');
    updateProgress();
  }));
  $('#consent').addEventListener('change', () => { $('#consentErr').classList.remove('show'); updateProgress(); });

  let lastCep = '';
  $('#cep').addEventListener('input', async e => {
    const cep = only(e.target.value);
    if (cep.length !== 8 || cep === lastCep) return;
    lastCep = cep;
    const wrap = e.target.closest('.field');
    wrap.classList.add('loading'); wrap.classList.remove('invalid');
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (d.erro) throw new Error('não encontrado');
      const fill = (id, v) => { if (v) { const el = $('#' + id); el.value = v; const f = el.closest('.field'); f.classList.add('autofilled'); setTimeout(() => f.classList.remove('autofilled'), 1300); if (rules[id]) check(id); } };
      fill('endereco', d.logradouro); fill('bairro', d.bairro); fill('cidade', d.localidade); fill('uf', d.uf);
      $('#cepHint').textContent = '✓ Endereço encontrado. Agora é só informar o número.';
      check('cep');
      $('#numero').focus();
    } catch {
      $('#cepHint').textContent = 'Não encontramos esse CEP — preencha o endereço manualmente.';
    } finally { wrap.classList.remove('loading'); updateProgress(); }
  });

  function updateProgress() {
    const req = Object.keys(rules).filter(k => k !== 'comoConheceuOutro');
    let done = req.filter(id => rules[id]($('#' + id).value)).length;
    if (form.comoConheceu.value) done++;
    if ($('#consent').checked) done++;
    $('#progressBar').style.width = (done / (req.length + 2) * 100) + '%';
  }

  async function checkLink() {
    demoBanner();
    if (MODE === 'unconfigured') return invalid(`Estamos finalizando a configuração desta página. Por favor, tente novamente mais tarde ou fale com a equipe da ${LOJA_NOME} pelo WhatsApp.`, 'Página em configuração');
    if (!linkId) return invalid('Este endereço não tem um link de cadastro válido.');
    let l;
    try {
      l = await Promise.race([
        store.getLink(linkId),
        new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('demora'), { code: 'timeout' })), 8000))
      ]);
    } catch (err) {
      const codigo = err && err.code;
      const servicoParado = navigator.onLine && ['unavailable', 'failed-precondition', 'not-found', 'permission-denied', 'timeout'].includes(codigo);
      if (servicoParado) {
        return invalid(`O cadastro ainda está sendo ativado. Tente novamente em alguns minutos ou fale com a equipe da ${LOJA_NOME} pelo WhatsApp.`, 'Cadastro em ativação');
      }
      return;
    }
    if (!l) return invalid();
    if (l.used) invalid('Este link já foi utilizado. Se precisar corrigir algum dado, fale com a nossa equipe.');
  }
  function invalid(msg, title) {
    form.hidden = true; $('#invalid').hidden = false;
    if (msg) $('#invalidMsg').textContent = msg;
    if (title) $('#invalid h2').textContent = title;
  }
  checkLink();

  function data() {
    const fd = Object.fromEntries(new FormData(form).entries());
    fd.instagram = fd.instagram ? '@' + fd.instagram : '';
    fd.linkId = linkId;
    return fd;
  }
  function fmtDate(iso) { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }
  function whatsMessage(d) {
    return [
      `*Novo cadastro — ${LOJA_NOME}* ✅`,
      `_Dados para recibo e termo de garantia_`, '',
      `*Nome:* ${d.nome}`, `*CPF:* ${d.cpf}`, `*Nascimento:* ${fmtDate(d.nascimento)}`,
      `*Telefone:* ${d.telefone}`, `*E-mail:* ${d.email}`,
      `*Endereço:* ${d.endereco}, ${d.numero}${d.complemento ? ' – ' + d.complemento : ''}${d.bairro ? ' – ' + d.bairro : ''}`,
      `*Cidade:* ${d.cidade}${d.uf ? '/' + d.uf : ''}`, `*CEP:* ${d.cep}`,
      `*Instagram:* ${d.instagram || '—'}`,
      `*Como conheceu:* ${d.comoConheceu}${d.comoConheceuOutro && d.comoConheceu === 'Outro' ? ' (' + d.comoConheceuOutro + ')' : ''}`,
    ].join('\n');
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    let ok = true, first = null;
    Object.keys(rules).forEach(id => { if (!check(id)) { ok = false; first = first || $('#' + id); } });
    if (!form.comoConheceu.value) { ok = false; $('#comoErr').classList.add('show'); first = first || $('.chips'); }
    if (!$('#consent').checked) { ok = false; $('#consentErr').classList.add('show'); first = first || $('.consent'); }
    if (!ok) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (first.focus) setTimeout(() => first.focus({ preventScroll: true }), 300); return; }

    const btn = $('#submitBtn'), d = data();
    btn.disabled = true; btn.classList.add('loading'); btn.querySelector('.lbl').textContent = 'Enviando';
    try {
      const { linkId: _l, ...dados } = d;
      await store.submit(linkId, dados);
      if (!DEMO) emailFormspree(d);
      success(d);
    } catch (err) {
      alert(err.message || 'Erro de conexão. Tente novamente.');
      btn.disabled = false; btn.classList.remove('loading'); btn.querySelector('.lbl').textContent = 'Enviar meus dados';
    }
  });

  function success(d) {
    form.hidden = true;
    $('#okName').textContent = d.nome.split(' ')[0];
    const box = $('#success');
    const textos = box.querySelectorAll(':scope > p');
    if (DEMO) {
      if (textos[0]) textos[0].textContent = 'Demonstração: os dados ficaram só neste navegador. Nenhum e-mail foi enviado.';
      if (textos[2]) textos[2].hidden = true;
      $('#waBtn').hidden = true;
      $('#waBtn').removeAttribute('href');
    } else {
      $('#waBtn').href = `https://wa.me/${STORE_WHATSAPP.replace(/\D/g, '')}?text=${encodeURIComponent(whatsMessage(d))}`;
    }
    box.hidden = false;
    $('#progressBar').style.width = '100%';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
