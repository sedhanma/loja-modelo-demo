/* Simulador de Taxa — mesmas contas, taxas e textos da versão da loja. */
const root = document.querySelector('.sim-app');
if (root) {

    const taxas = {
      debito: 0.046,
      1: 0.0686, 2: 0.0873, 3: 0.0946, 4: 0.1019, 5: 0.109, 6: 0.1161,
      7: 0.1381, 8: 0.1451, 9: 0.152, 10: 0.1588, 11: 0.1655, 12: 0.1722,
      13: 0.1788, 14: 0.1853, 15: 0.1918, 16: 0.1982, 17: 0.2046, 18: 0.2109
    };
    const labels = {
      debito: 'Débito',
      1: '1x', 2: '2x', 3: '3x', 4: '4x', 5: '5x', 6: '6x',
      7: '7x', 8: '8x', 9: '9x', 10: '10x', 11: '11x', 12: '12x',
      13: '13x', 14: '14x', 15: '15x', 16: '16x', 17: '17x', 18: '18x'
    };

    const COPY_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    root.querySelectorAll('.copy-btn').forEach(b => { b.innerHTML = COPY_SVG; });

    function fillSelect(sel, selected) {
      sel.innerHTML = Object.keys(labels).map(k =>
        '<option value="' + k + '"' + (k === selected ? ' selected' : '') + '>' + labels[k] + '</option>'
      ).join('');
    }
    fillSelect(document.getElementById('parcelas'), '2');
    fillSelect(document.getElementById('parcelasM'), '2');
    fillSelect(document.getElementById('mistoParc'), '6');
    fillSelect(document.getElementById('lucroParc'), '10');
    fillSelect(document.getElementById('entParc'), '8');

    const $ = (id) => document.getElementById(id);
    const toast = $('toast');
    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1400);
    }
    function formatBRL(num) {
      return (Number(num) || 0).toLocaleString('pt-BR', {
        style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2
      });
    }
    function nParc(key) { return key === 'debito' ? 1 : parseInt(key, 10); }
    function taxaDe(key) { return taxas[key] || 0; }
    function complemento(key, valorParcela) {
      if (key === 'debito') return 'Débito ' + formatBRL(valorParcela);
      return nParc(key) + 'x ' + formatBRL(valorParcela);
    }
    function num(el) { return parseFloat(el.value) || 0; }

    async function copyText(text) {
      const t = String(text || '').trim();
      if (!t) return;
      try { await navigator.clipboard.writeText(t); }
      catch {
        const ta = document.createElement('textarea');
        ta.value = t; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
      }
      showToast('Copiado');
    }
    function openWA(text) {
      location.href = 'https://wa.me/?text=' + encodeURIComponent(text);
    }

    function calcNet(desejado, key) {
      const taxa = taxaDe(key);
      const n = nParc(key);
      if (desejado <= 0) return { cliente: 0, parcela: 0, taxa, n };
      const cliente = desejado / (1 - taxa);
      return { cliente, parcela: cliente / n, taxa, n };
    }
    function calcPass(passado, key) {
      const taxa = taxaDe(key);
      const n = nParc(key);
      if (passado <= 0) return { liquido: 0, desconto: 0, parcela: 0, taxa, n };
      return { liquido: passado * (1 - taxa), desconto: passado * taxa, parcela: passado / n, taxa, n };
    }

    let oculto = false;
    try { oculto = localStorage.getItem('ocultarCliente') === '1'; } catch (e) {}
    let clienteAtual = 0;

    function calcHome() {
      const r = calcNet(num($('valor')), $('parcelas').value);
      clienteAtual = r.cliente;
      $('valorCliente').textContent = oculto ? '••••••' : formatBRL(r.cliente);
      $('valorParcela').textContent = formatBRL(r.parcela);
      $('homeNx').textContent = complemento($('parcelas').value, r.parcela);
    }
    function calcMaquina() {
      const r = calcPass(num($('valorM')), $('parcelasM').value);
      $('passarValor').textContent = formatBRL(r.liquido);
      $('receberValor').textContent = formatBRL(r.desconto);
      $('taxaValor').textContent = (r.taxa * 100).toFixed(2).replace('.', ',') + '%';
      $('parcelaMValor').textContent = formatBRL(r.parcela);
      $('maqNx').textContent = complemento($('parcelasM').value, r.parcela);
    }
    function calcMisto() {
      const total = num($('mistoTotal'));
      const pix = Math.min(num($('mistoPix')), total);
      const rest = Math.max(total - pix, 0);
      const key = $('mistoParc').value;
      const n = nParc(key);
      const t = taxaDe(key);
      const parcela = n ? rest / n : 0;
      const cobrar = t < 1 ? rest / (1 - t) : rest;
      const parcEmb = n ? cobrar / n : 0;
      $('mistoPixOut').textContent = formatBRL(pix);
      $('mistoRest').textContent = formatBRL(rest);
      $('mistoNx').textContent = complemento(key, parcela);
      $('mistoCai').textContent = formatBRL(rest * (1 - t));
      $('mistoCobrar').textContent = formatBRL(cobrar);
      $('mistoNxEmb').textContent = complemento(key, parcEmb);
      const resumo = pix > 0
        ? ('Pix ' + formatBRL(pix) + ' + ' + complemento(key, parcela))
        : complemento(key, parcela);
      $('mistoResumo').textContent = resumo;
    }
    let lucroTipo = 'R$';
    function calcLucro() {
      const custo = num($('custoAp'));
      const v = num($('lucroVal'));
      const lucro = lucroTipo === '%' ? custo * (v / 100) : v;
      const meta = custo + lucro;
      const key = $('lucroParc').value;
      const t = taxaDe(key);
      const card = t < 1 ? meta / (1 - t) : meta;
      const n = nParc(key);
      $('lucroOut').textContent = formatBRL(lucro);
      $('lucroPix').textContent = formatBRL(meta);
      $('lucroCard').textContent = formatBRL(card);
      $('lucroNx').textContent = complemento(key, n ? card / n : 0);
    }
    function calcEntrada() {
      const total = num($('entTotal'));
      const ent = Math.min(num($('entValor')), total);
      const rest = Math.max(total - ent, 0);
      const key = $('entParc').value;
      const n = nParc(key);
      const t = taxaDe(key);
      const parcela = n ? rest / n : 0;
      const cobrar = t < 1 ? rest / (1 - t) : rest;
      $('entOut').textContent = formatBRL(ent);
      $('entRest').textContent = formatBRL(rest);
      $('entNx').textContent = complemento(key, parcela);
      $('entResumo').textContent = 'Entrada ' + formatBRL(ent) + ' + ' + complemento(key, parcela);
      $('entCobrar').textContent = formatBRL(cobrar);
      $('entNxEmb').textContent = complemento(key, n ? cobrar / n : 0);
    }
    let descTipo = '%';
    function loadDesc() {
      try {
        descTipo = localStorage.getItem('descVistaTipo') || '%';
        const v = localStorage.getItem('descVistaValor');
        if (v !== null) $('descCfg').value = v;
      } catch (e) {}
      $('descTipoP').classList.toggle('on', descTipo === '%');
      $('descTipoR').classList.toggle('on', descTipo === 'R$');
    }
    function saveDesc() {
      try {
        localStorage.setItem('descVistaTipo', descTipo);
        localStorage.setItem('descVistaValor', $('descCfg').value || '0');
      } catch (e) {}
    }
    function calcAvista() {
      const orig = num($('avistaOrig'));
      const cfg = num($('descCfg'));
      const desc = descTipo === '%' ? orig * (cfg / 100) : cfg;
      const fin = Math.max(orig - desc, 0);
      $('avistaDesc').textContent = formatBRL(desc) + (descTipo === '%' ? ' (' + String(cfg).replace('.', ',') + '%)' : '');
      $('avistaFinal').textContent = formatBRL(fin);
      $('avistaComp').textContent = 'À vista ' + formatBRL(fin);
    }


    function formatUSD(num) {
      return 'US$ ' + (Number(num) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function rawNum(id) {
      const v = $(id).value;
      if (v === '' || v === null) return null;
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    }
    function calcFrete() {
      const valor = rawNum('freteValor');
      const cot = rawNum('freteCotacao');
      const pct = rawNum('fretePct');
      const extra = rawNum('freteExtra');
      const has = [valor, cot, pct, extra].some(v => v !== null);
      const v = valor || 0, c = cot || 0, p = pct || 0, e = extra || 0;
      const fretePct = v * (p / 100);
      const totalUSD = v + fretePct;
      const totalBRL = totalUSD * c + e;
      $('freteProd').textContent = valor === null ? '—' : formatUSD(v);
      $('fretePctOut').textContent = pct === null ? '—' : (formatUSD(fretePct) + ' (' + String(p).replace('.', ',') + '%)');
      $('freteExtraOut').textContent = extra === null ? '—' : formatBRL(e);
      $('freteUsd').textContent = has ? formatUSD(totalUSD) : '—';
      $('freteBrl').textContent = has ? formatBRL(totalBRL) : '—';
      try { if (cot !== null) localStorage.setItem('freteCotacao', String(cot)); } catch (err) {}
    }
    function loadFrete() {
      try {
        const c = localStorage.getItem('freteCotacao');
        if (c && !$('freteCotacao').value) $('freteCotacao').value = c;
      } catch (e) {}
    }

    const texts = {
      homeCliente: () => oculto ? '' : formatBRL(clienteAtual),
      homeParcela: () => $('valorParcela').textContent,
      homeNx: () => $('homeNx').textContent,
      maqCai: () => $('passarValor').textContent,
      maqTaxaR$: () => $('receberValor').textContent,
      maqTaxaPct: () => $('taxaValor').textContent,
      maqParcela: () => $('parcelaMValor').textContent,
      maqNx: () => $('maqNx').textContent,
      mistoPix: () => $('mistoPixOut').textContent,
      mistoRest: () => $('mistoRest').textContent,
      mistoNx: () => $('mistoNx').textContent,
      mistoCai: () => $('mistoCai').textContent,
      mistoCobrar: () => $('mistoCobrar').textContent,
      mistoNxEmb: () => $('mistoNxEmb').textContent,
      mistoResumo: () => $('mistoResumo').textContent,
      lucroOut: () => $('lucroOut').textContent,
      lucroPix: () => $('lucroPix').textContent,
      lucroCard: () => $('lucroCard').textContent,
      lucroNx: () => $('lucroNx').textContent,
      entOut: () => $('entOut').textContent,
      entRest: () => $('entRest').textContent,
      entNx: () => $('entNx').textContent,
      entResumo: () => $('entResumo').textContent,
      entCobrar: () => $('entCobrar').textContent,
      entNxEmb: () => $('entNxEmb').textContent,
      avistaDesc: () => $('avistaDesc').textContent,
      avistaFinal: () => $('avistaFinal').textContent,
      avistaComp: () => $('avistaComp').textContent,
      freteProd: () => $('freteProd').textContent,
      fretePctOut: () => $('fretePctOut').textContent,
      freteExtraOut: () => $('freteExtraOut').textContent,
      freteUsd: () => $('freteUsd').textContent,
      freteBrl: () => $('freteBrl').textContent
    };

    const nomeLoja = () => String((window.NC_CONFIG && window.NC_CONFIG.LOJA_NOME) || 'Sua Loja');
    function waHome() {
      return nomeLoja() + '\nValor para o cliente: ' + formatBRL(clienteAtual) + '\n' + $('homeNx').textContent;
    }
    function waMaquina() {
      return nomeLoja() + '\nPassou: ' + formatBRL(num($('valorM'))) + '\nCai na conta: ' + $('passarValor').textContent + '\n' + $('maqNx').textContent;
    }
    function waMisto() {
      return nomeLoja() + '\nPagamento misto\n' + $('mistoResumo').textContent + '\nCobrar no cartão (receber restante): ' + $('mistoCobrar').textContent + ' — ' + $('mistoNxEmb').textContent;
    }
    function waLucro() {
      return nomeLoja() + '\nÀ vista / Pix: ' + $('lucroPix').textContent + '\nNo cartão: ' + $('lucroCard').textContent + '\n' + $('lucroNx').textContent;
    }
    function waEntrada() {
      return nomeLoja() + '\n' + $('entResumo').textContent + '\nCobrar no cartão (receber restante): ' + $('entCobrar').textContent + ' — ' + $('entNxEmb').textContent;
    }
    function waAvista() {
      return nomeLoja() + '\nOriginal: ' + formatBRL(num($('avistaOrig'))) + '\n' + $('avistaComp').textContent;
    }
    function waFrete() {
      return nomeLoja() + '\nFrete USD → BRL\nProduto: ' + $('freteProd').textContent + '\nFrete %: ' + $('fretePctOut').textContent + '\nFrete extra: ' + $('freteExtraOut').textContent + '\nTotal USD: ' + $('freteUsd').textContent + '\nValor final: ' + $('freteBrl').textContent;
    }

    document.addEventListener('click', (e) => {
      if (!root.contains(e.target)) return;
      const go = e.target.closest('[data-go]');
      if (go && go.dataset.go && go.dataset.go !== 'basic') {
        showScreen(go.dataset.go);
        return;
      }
      const cp = e.target.closest('[data-copy]');
      if (cp && texts[cp.dataset.copy]) copyText(texts[cp.dataset.copy]());
      const wa = e.target.closest('[data-wa]');
      if (wa) {
        const map = { home: waHome, maquina: waMaquina, misto: waMisto, lucro: waLucro, entrada: waEntrada, avista: waAvista, frete: waFrete };
        if (map[wa.dataset.wa]) openWA(map[wa.dataset.wa]());
      }
    });

    function showScreen(id) {
      root.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      $(id).classList.add('active');
      const noPainel = id === 'calc' && !!root.closest('.admin');
      root.classList.toggle('calc-mode', id === 'calc');
      if (!noPainel) document.body.classList.remove('calc-aberta');
      window.scrollTo(0, 0);
      document.body.classList.toggle('calc-aberta', noPainel);
      if (id === 'maquina') {
        if (!$('valorM').value || $('valorM').value === '0') $('valorM').value = $('valor').value;
        if (!$('parcelasM').dataset.touched) $('parcelasM').value = $('parcelas').value;
        calcMaquina();
      }
    }

    $('btnOcultar').onclick = () => {
      oculto = !oculto;
      try { localStorage.setItem('ocultarCliente', oculto ? '1' : '0'); } catch (e) {}
      $('iconEye').classList.toggle('hidden', oculto);
      $('iconEyeOff').classList.toggle('hidden', !oculto);
      $('btnOcultar').classList.toggle('on', oculto);
      calcHome();
    };
    Object.keys(taxas).forEach((key) => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td>' + labels[key] + '</td><td>' + (taxas[key] * 100).toFixed(2).replace('.', ',') + '%</td>';
      $('ratesBody').appendChild(tr);
    });
    $('btnRates').onclick = () => {
      $('ratesTable').classList.toggle('show');
      $('btnRates').textContent = $('ratesTable').classList.contains('show') ? 'Ocultar tabela de taxas' : 'Ver tabela de taxas';
    };
    $('parcelasM').onchange = () => { $('parcelasM').dataset.touched = '1'; calcMaquina(); };

    $('valor').oninput = calcHome;
    $('parcelas').onchange = calcHome;
    $('valorM').oninput = calcMaquina;
    ['mistoTotal','mistoPix'].forEach(id => $(id).oninput = calcMisto);
    $('mistoParc').onchange = calcMisto;
    ['custoAp','lucroVal'].forEach(id => $(id).oninput = calcLucro);
    $('lucroParc').onchange = calcLucro;
    ['entTotal','entValor'].forEach(id => $(id).oninput = calcEntrada);
    $('entParc').onchange = calcEntrada;
    $('avistaOrig').oninput = calcAvista;
    ['freteValor','freteCotacao','fretePct','freteExtra'].forEach(id => $(id).oninput = calcFrete);
    $('descCfg').oninput = () => { saveDesc(); calcAvista(); };

    $('lucroTipoR').onclick = () => { lucroTipo = 'R$'; $('lucroTipoR').classList.add('on'); $('lucroTipoP').classList.remove('on'); calcLucro(); };
    $('lucroTipoP').onclick = () => { lucroTipo = '%'; $('lucroTipoP').classList.add('on'); $('lucroTipoR').classList.remove('on'); calcLucro(); };
    $('descTipoP').onclick = () => { descTipo = '%'; $('descTipoP').classList.add('on'); $('descTipoR').classList.remove('on'); saveDesc(); calcAvista(); };
    $('descTipoR').onclick = () => { descTipo = 'R$'; $('descTipoR').classList.add('on'); $('descTipoP').classList.remove('on'); saveDesc(); calcAvista(); };

    root.querySelectorAll('input').forEach(i => i.addEventListener('focus', function () { this.select(); }));

    $('iconEye').classList.toggle('hidden', oculto);
    $('iconEyeOff').classList.toggle('hidden', !oculto);
    $('btnOcultar').classList.toggle('on', oculto);
    loadDesc();
    loadFrete(); calcHome(); calcMaquina(); calcMisto(); calcLucro(); calcEntrada(); calcAvista(); calcFrete();

    /* calculadora */
    const cVal = $('cVal'), cExpr = $('cExpr'), cAc = $('cAc'), cSheet = $('cSheet'), cHist = $('cHist'), cHistList = $('cHistList');
    let current = '0', prev = null, op = null, fresh = true, justEq = false, history = [], lastResult = null, snapshots = [];
    const fmt = (n) => {
      if (n === null || Number.isNaN(n) || !Number.isFinite(n)) return 'Erro';
      return n.toLocaleString('pt-BR', { maximumFractionDigits: 10 });
    };
    const parseBR = (s) => parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
    const showC = () => {
      cVal.textContent = current;
      const len = current.length;
      cVal.classList.toggle('small', len > 8);
      cVal.classList.toggle('tiny', len > 12);
      cAc.textContent = (!fresh && current !== '0') ? 'C' : 'AC';
      root.querySelectorAll('.ck.op[data-op]').forEach(b => b.classList.toggle('on', op === b.dataset.op && fresh));
    };
    const exprText = () => { cExpr.textContent = (prev === null || !op) ? '' : (fmt(prev) + ' ' + op); };
    const saveSnap = () => { snapshots.push({ current, prev, op, fresh, justEq }); if (snapshots.length > 30) snapshots.shift(); };
    const persistC = () => { try { localStorage.setItem('calc_hist_v1', JSON.stringify(history.slice(0, 80))); if (lastResult !== null) localStorage.setItem('calc_last_v1', String(lastResult)); } catch (e) {} };
    const loadC = () => {
      try { history = JSON.parse(localStorage.getItem('calc_hist_v1') || '[]'); } catch { history = []; }
      const lr = localStorage.getItem('calc_last_v1');
      if (lr) { lastResult = parseFloat(lr); current = fmt(lastResult); prev = null; op = null; fresh = true; justEq = true; }
    };
    const addHist = (a, operator, b, res) => {
      history.unshift({ res, label: fmt(a) + ' ' + operator + ' ' + fmt(b) });
      lastResult = res; persistC(); renderHist();
    };
    const compute = (a, operator, b) => operator === '+' ? a + b : operator === '−' ? a - b : operator === '×' ? a * b : operator === '÷' ? (b === 0 ? NaN : a / b) : b;
    const inputNum = (d) => {
      saveSnap();
      if (justEq) { prev = null; op = null; cExpr.textContent = ''; }
      if (fresh) { current = d; fresh = false; justEq = false; }
      else current = (current === '0' && d !== ',') ? d : current + d;
      showC();
    };
    const inputDot = () => {
      saveSnap();
      if (justEq || fresh) { prev = justEq ? null : prev; if (justEq) { op = null; cExpr.textContent = ''; } current = '0,'; fresh = false; justEq = false; showC(); return; }
      if (!current.includes(',')) { current += ','; showC(); }
    };
    const setOp = (next) => {
      saveSnap();
      const n = parseBR(current);
      if (prev !== null && op && !fresh) { const res = compute(prev, op, n); addHist(prev, op, n, res); current = fmt(res); prev = res; }
      else prev = n;
      op = next; fresh = true; justEq = false; exprText(); showC();
    };
    const equals = () => {
      if (op === null || prev === null) return;
      saveSnap();
      const n = parseBR(current); const res = compute(prev, op, n);
      addHist(prev, op, n, res);
      cExpr.textContent = fmt(prev) + ' ' + op + ' ' + fmt(n);
      current = fmt(res); prev = res; fresh = true; justEq = true; op = null; showC();
    };
    function renderHist() {
      cHistList.innerHTML = history.length ? history.map((h, i) =>
        '<div class="c-item" data-i="' + i + '"><div class="e">' + h.label + ' =</div><div class="r">' + fmt(h.res) + '</div></div>'
      ).join('') : '<div class="c-empty">Nenhuma conta ainda.</div>';
    }
    $('cPad').onclick = (e) => {
      const b = e.target.closest('button.ck'); if (!b) return;
      if (b.dataset.num !== undefined) inputNum(b.dataset.num);
      else if (b.dataset.op) setOp(b.dataset.op);
      else if (b.dataset.fn === 'dot') inputDot();
      else if (b.dataset.fn === 'eq') equals();
      else if (b.dataset.fn === 'sign') { saveSnap(); current = fmt(-parseBR(current)); fresh = false; showC(); }
      else if (b.dataset.fn === 'pct') { saveSnap(); const n = parseBR(current); current = fmt((prev !== null && op) ? prev * (n / 100) : n / 100); fresh = true; showC(); }
      else if (b.id === 'cAc') { saveSnap(); if (cAc.textContent === 'C') { current = '0'; fresh = true; } else { current = '0'; prev = null; op = null; fresh = true; justEq = false; cExpr.textContent = ''; } showC(); }
    };
    $('calcMenuBtn').onclick = () => cSheet.classList.add('open');
    cSheet.onclick = (e) => { if (e.target === cSheet) cSheet.classList.remove('open'); };
    $('cOpenHist').onclick = () => { cSheet.classList.remove('open'); renderHist(); cHist.classList.add('open'); };
    $('cHistBack').onclick = () => cHist.classList.remove('open');
    $('cHistClear').onclick = () => { history = []; persistC(); renderHist(); };
    cHistList.onclick = (e) => {
      const item = e.target.closest('.c-item'); if (!item) return;
      const h = history[+item.dataset.i]; if (!h) return;
      saveSnap(); current = fmt(h.res); prev = h.res; op = null; fresh = true; justEq = true;
      cExpr.textContent = h.label + ' ='; lastResult = h.res; persistC(); showC(); cHist.classList.remove('open');
    };
    loadC(); exprText(); showC(); renderHist();
  
}

/* Teclado físico na calculadora (Mac/Windows). */
(function () {
  var keyMap = { '0':'[data-num="0"]','1':'[data-num="1"]','2':'[data-num="2"]','3':'[data-num="3"]','4':'[data-num="4"]',
    '5':'[data-num="5"]','6':'[data-num="6"]','7':'[data-num="7"]','8':'[data-num="8"]','9':'[data-num="9"]',
    ',':'[data-fn="dot"]','.':'[data-fn="dot"]','+':'[data-op="+"]','-':'[data-op="−"]','*':'[data-op="×"]','x':'[data-op="×"]',
    '/':'[data-op="÷"]','%':'[data-fn="pct"]','=':'[data-fn="eq"]','Enter':'[data-fn="eq"]','Escape':'#cAc','Delete':'#cAc' };
  document.addEventListener('keydown', function (e) {
    var calcEl = document.getElementById('calc');
    if (!calcEl || !calcEl.classList.contains('active') || e.ctrlKey || e.metaKey || e.altKey) return;
    var hist = document.getElementById('cHist'), sheet = document.getElementById('cSheet');
    if (e.key === 'Escape' && (hist.classList.contains('open') || sheet.classList.contains('open'))) {
      hist.classList.remove('open'); sheet.classList.remove('open'); e.preventDefault(); return;
    }
    if (hist.classList.contains('open')) return;
    var sel = keyMap[e.key]; if (!sel) return;
    var btn = document.querySelector('#cPad ' + sel); if (!btn) return;
    e.preventDefault(); btn.click();
  });
})();
