(() => {
'use strict';

/* ---------- Utilidades ---------- */
const KEY = 'oai.v2';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10);
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hoje = () => iso(new Date());
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = s => s.split('-').reverse().join('/');
const dias = s => Math.round((new Date(s + 'T00:00') - new Date(hoje() + 'T00:00')) / 864e5);
const iniciais = n => n.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?';

/* ---------- Estado ---------- */
const vazio = () => ({ aluno: null, tema: 'claro', atualizado: 0,
  config: { fonte: 100, contraste: false, notif: false, ultimoAviso: '' }, disciplinas: [], atividades: [] });

function exemplo() {
  const d1 = uid(), d2 = uid(), d3 = uid();
  const add = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  return {
    disciplinas: [
      { id: d1, nome: 'Interação Humano-Computador', cor: '#4f46e5' },
      { id: d2, nome: 'Banco de Dados', cor: '#16a34a' },
      { id: d3, nome: 'Cálculo 2', cor: '#d97706' }
    ],
    atividades: [
      { id: uid(), titulo: 'Entrega do projeto final', disc: d1, tipo: 'trabalho', prio: 3, prazo: add(5), obs: '', feito: false },
      { id: uid(), titulo: 'Prova P1', disc: d3, tipo: 'prova', prio: 3, prazo: add(9), obs: 'Caps. 1 a 4', feito: false },
      { id: uid(), titulo: 'Lista de exercícios 3', disc: d2, tipo: 'tarefa', prio: 2, prazo: add(2), obs: '', feito: false },
      { id: uid(), titulo: 'Resumo do capítulo 2', disc: d1, tipo: 'tarefa', prio: 1, prazo: add(-1), obs: '', feito: false }
    ]
  };
}

/* ---------- Persistência ----------
   Com o servidor local (node server.js) os dados vão para data/db.json no computador.
   Sem servidor (abrindo index.html direto), ficam no localStorage do navegador.
   O localStorage sempre guarda uma cópia de reserva. */
const API = '/api/dados';
const comServidor = location.protocol.startsWith('http');
let modo = 'navegador';   // 'servidor' | 'navegador'
let snapshot = '';        // último estado salvo, usado ao cancelar edições do perfil
let S = vazio();

const lerLocal = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const normalizar = d => { const v = vazio(); return { ...v, ...d, config: { ...v.config, ...(d && d.config) } }; };

let tSalvar;
function enviar() {
  if (modo !== 'servidor') return;
  clearTimeout(tSalvar);
  tSalvar = setTimeout(async () => {
    try {
      const r = await fetch(API, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: snapshot });
      if (!r.ok) throw new Error();
    } catch { modo = 'navegador'; toast('Servidor indisponível. Salvando só no navegador.'); }
  }, 250);
}
function salvar() {
  S.atualizado = Date.now();
  snapshot = JSON.stringify(S);
  try { localStorage.setItem(KEY, snapshot); } catch {}
  enviar();
}

async function carregar() {
  const local = lerLocal();
  if (comServidor) {
    try {
      const r = await fetch(API, { cache: 'no-store' });
      if (r.ok) {
        S = normalizar(await r.json()); modo = 'servidor'; snapshot = JSON.stringify(S);
        if (local && local.atualizado > S.atualizado) { // edições feitas offline vencem o arquivo mais antigo
          S = normalizar(local); snapshot = JSON.stringify(S); enviar();
        }
        return;
      }
      if (r.status === 404) {            // servidor sem dados ainda: migra o que houver no navegador
        modo = 'servidor';
        S = local ? normalizar(local) : vazio();
        return salvar();
      }
    } catch { /* sem servidor: segue no navegador */ }
  }
  S = local ? normalizar(local) : vazio();
  snapshot = JSON.stringify(S);
}

function baixar(nome, texto) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const disc = id => S.disciplinas.find(d => d.id === id);

function toast(msg, acao) {
  const t = $('#toast'); t.textContent = msg;
  if (acao) {
    const b = document.createElement('button');
    b.className = 'toast-btn'; b.textContent = acao.rotulo;
    b.onclick = () => { t.classList.remove('show'); acao.fn(); };
    t.append(b);
  }
  t.classList.toggle('com-acao', !!acao);
  t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), acao ? 7000 : 2200);
}

const prazoTxt = a => {
  const n = dias(a.prazo);
  if (a.feito) return fmt(a.prazo);
  if (n < 0) return `${fmt(a.prazo)} · atrasada ${-n}d`;
  if (n === 0) return `${fmt(a.prazo)} · hoje`;
  if (n === 1) return `${fmt(a.prazo)} · amanhã`;
  return `${fmt(a.prazo)} · em ${n}d`;
};

/* Pontuação inteligente: urgência do prazo + prioridade + peso do tipo */
const score = a => {
  const n = dias(a.prazo);
  const urg = n < 0 ? 100 : Math.max(0, 30 - n * 2);
  return urg + a.prio * 10 + (a.tipo === 'prova' ? 8 : a.tipo === 'trabalho' ? 4 : 0);
};

/* ---------- Renderização ---------- */
function itemHTML(a) {
  const d = disc(a.disc) || { nome: '?', cor: '#888' };
  const late = !a.feito && dias(a.prazo) < 0;
  return `<li class="item ${a.feito ? 'done' : ''}" style="--c:${d.cor}">
    <input type="checkbox" data-act="toggle" data-id="${a.id}" ${a.feito ? 'checked' : ''} aria-label="Concluir ${esc(a.titulo)}">
    <div class="body">
      <div class="t">${esc(a.titulo)}</div>
      <div class="m"><span class="badge">${a.tipo}</span><span class="badge p${a.prio}">${['', 'baixa', 'média', 'alta'][a.prio]}</span>
        <span>${esc(d.nome)}</span><span class="${late ? 'late' : ''}">${prazoTxt(a)}</span>${a.obs ? `<span>${esc(a.obs)}</span>` : ''}</div>
    </div>
    <div class="btns">
      <button class="btn sm" data-act="edit" data-id="${a.id}">Editar</button>
      <button class="btn sm danger" data-act="del" data-id="${a.id}" aria-label="Excluir ${esc(a.titulo)}">✕</button>
    </div>
  </li>`;
}
/* Lista com estado vazio que sempre oferece o próximo passo (acao = [ação, rótulo]) */
const lista = (arr, msg, acao) => arr.length ? arr.map(itemHTML).join('')
  : `<li class="empty"><p>${msg}</p>${acao ? `<button class="btn primary sm" data-act="${acao[0]}">${acao[1]}</button>` : ''}</li>`;
const acaoNova = () => S.disciplinas.length ? ['nova', '+ Criar atividade'] : ['gotodisc', 'Cadastrar disciplina'];

function renderLembretes(pend) {
  const urg = pend.filter(a => dias(a.prazo) >= 0 && dias(a.prazo) <= 1)
    .sort((a, b) => a.prazo.localeCompare(b.prazo) || b.prio - a.prio);
  const el = $('#lembretes');
  el.hidden = !urg.length;
  el.innerHTML = urg.length ? `<strong>⏰ Lembretes</strong><ul>${urg.map(a =>
    `<li><b>${esc(a.titulo)}</b> · ${dias(a.prazo) === 0 ? 'vence hoje' : 'vence amanhã'} <span>${esc((disc(a.disc) || {}).nome || '')}</span></li>`).join('')}</ul>` : '';
}

function avisarPrazos() {
  const c = S.config;
  if (!S.aluno || !c.notif || !('Notification' in window) || Notification.permission !== 'granted' || c.ultimoAviso === hoje()) return;
  const urg = S.atividades.filter(a => !a.feito && dias(a.prazo) <= 1);
  if (!urg.length) return;
  c.ultimoAviso = hoje(); salvar();
  const atr = urg.filter(a => dias(a.prazo) < 0).length;
  new Notification('Organizador Acadêmico', {
    body: `${urg.length} atividade(s) pedem atenção (hoje, amanhã${atr ? ` ou atrasadas: ${atr}` : ''}).`, icon: 'public/logo.svg' });
}

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function renderPainel() {
  const A = S.atividades, pend = A.filter(a => !a.feito), conc = A.length - pend.length;
  const atras = pend.filter(a => dias(a.prazo) < 0);
  const sem = pend.filter(a => { const n = dias(a.prazo); return n >= 0 && n <= 7; });
  const primeiro = S.aluno.nome.trim().split(/\s+/)[0];
  $('#h-painel').textContent = `${saudacao()}, ${primeiro}!`;
  $('#hero-data').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#hero-msg').textContent = !A.length ? 'Cadastre disciplinas e atividades para começar a se organizar.'
    : atras.length ? `Você tem ${atras.length} atividade(s) atrasada(s). Que tal resolver hoje?`
    : sem.length ? `${sem.length} atividade(s) vencem nos próximos 7 dias. Você está no controle.`
    : 'Tudo em dia por enquanto. Bom trabalho!';
  const cards = [['Pendentes', pend.length, 'var(--pri)'], ['Concluídas', conc, 'var(--ok)'],
    ['Atrasadas', atras.length, 'var(--bad)'], ['Próx. 7 dias', sem.length, 'var(--warn)']];
  $('#cards').innerHTML = cards.map(([l, v, c]) => `<div class="card" style="--c:${c}"><b>${v}</b><span>${l}</span></div>`).join('');
  const pct = A.length ? Math.round(conc / A.length * 100) : 0;
  $('#bar-fill').style.width = pct + '%';
  $('#bar').setAttribute('aria-valuenow', pct);
  $('#prog-txt').textContent = pct + '%';
  $('#proximos').innerHTML = lista(pend.filter(a => dias(a.prazo) >= 0).sort((a, b) => score(b) - score(a)).slice(0, 5),
    A.length ? 'Nada pendente. 🎉' : 'Você ainda não tem atividades.', A.length ? null : acaoNova());
  $('#atrasadas').innerHTML = lista(atras.sort((a, b) => a.prazo.localeCompare(b.prazo)), 'Nenhuma atrasada.');
  renderLembretes(pend);
}

let cal = new Date(), diaSel = hoje();
function renderCal() {
  const y = cal.getFullYear(), m = cal.getMonth();
  $('#h-cal').textContent = cal.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const ini = new Date(y, m, 1 - new Date(y, m, 1).getDay());
  let h = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < 42; i++) {
    const d = new Date(ini); d.setDate(ini.getDate() + i); const k = iso(d);
    const as = S.atividades.filter(a => a.prazo === k);
    h += `<button class="day ${d.getMonth() !== m ? 'out' : ''} ${k === hoje() ? 'hoje' : ''} ${k === diaSel ? 'sel' : ''}" data-dia="${k}" aria-label="${fmt(k)}, ${as.length} atividades">
      <span class="n">${d.getDate()}</span><div class="dots">${as.map(a => `<i class="dot" style="--c:${(disc(a.disc) || {}).cor || '#888'}"></i>`).join('')}</div></button>`;
  }
  $('#cal').innerHTML = h;
  $('#dia-titulo').textContent = 'Atividades de ' + fmt(diaSel);
  $('#dia-lista').innerHTML = lista(S.atividades.filter(a => a.prazo === diaSel), 'Sem atividades neste dia.', acaoNova());
}

function renderAtiv() {
  const sel = $('#f-disc'), cur = sel.value;
  sel.innerHTML = '<option value="">Todas as disciplinas</option>' + S.disciplinas.map(d => `<option value="${d.id}">${esc(d.nome)}</option>`).join('');
  sel.value = cur;
  const q = $('#f-busca').value.trim().toLowerCase(), fd = sel.value, ft = $('#f-tipo').value, fs = $('#f-status').value, o = $('#f-ordem').value;
  const r = S.atividades.filter(a => (!q || a.titulo.toLowerCase().includes(q)) && (!fd || a.disc === fd) && (!ft || a.tipo === ft) &&
    (!fs || (fs === 'concluida') === a.feito));
  r.sort(o === 'prazo' ? (a, b) => a.prazo.localeCompare(b.prazo)
    : o === 'prioridade' ? (a, b) => b.prio - a.prio || a.prazo.localeCompare(b.prazo)
    : (a, b) => a.feito - b.feito || score(b) - score(a));
  const semNada = !S.atividades.length;
  $('#lista-ativ').innerHTML = lista(r, semNada ? 'Você ainda não tem atividades.' : 'Nenhuma atividade com esses filtros.',
    semNada ? acaoNova() : ['limpar', 'Limpar filtros']);
}

function renderDisc() {
  $('#lista-disc').innerHTML = S.disciplinas.length ? S.disciplinas.map(d => {
    const n = S.atividades.filter(a => a.disc === d.id), p = n.filter(a => !a.feito).length;
    return `<li class="item" style="--c:${d.cor}"><div class="body"><div class="t">${esc(d.nome)}</div>
      <div class="m">${n.length} atividades · ${p} pendentes</div></div>
      <div class="btns"><button class="btn sm danger" data-act="deldisc" data-id="${d.id}">Excluir</button></div></li>`;
  }).join('') : '<li class="empty"><p>Nenhuma disciplina cadastrada.</p><button class="btn primary sm" data-act="focodisc">Cadastrar disciplina</button></li>';
}

let view = 'painel';
function render() {
  const raiz = document.documentElement;
  raiz.dataset.tema = S.tema === 'escuro' ? 'escuro' : 'claro';
  raiz.dataset.contraste = S.config.contraste ? 'alto' : 'normal';
  raiz.style.fontSize = S.config.fonte + '%';
  const logado = !!S.aluno;
  $('#welcome').hidden = logado;
  $('#app').hidden = !logado;
  if (!logado) {
    $('#w-fine').textContent = modo === 'servidor' ? 'Seus dados ficam salvos neste computador, em arquivo.' : 'Seus dados ficam salvos neste navegador.';
    return;
  }
  $('#btn-perfil').textContent = iniciais(S.aluno.nome);
  $('#btn-perfil').title = S.aluno.nome;
  $$('.view').forEach(v => v.hidden = v.id !== 'view-' + view);
  $$('#tabs button').forEach(b => b.dataset.view === view ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  ({ painel: renderPainel, calendario: renderCal, atividades: renderAtiv, disciplinas: renderDisc })[view]();
}

/* ---------- Boas-vindas e perfil ---------- */
const radio = (nome, valor) => { const r = $(`input[name="${nome}"][value="${valor}"]`); if (r) r.checked = true; };
const radioVal = nome => ($(`input[name="${nome}"]:checked`) || {}).value || 'claro';

$$('input[name="w-tema"]').forEach(r => r.addEventListener('change', () => { S.tema = radioVal('w-tema'); render(); }));

$('#form-welcome').addEventListener('submit', e => {
  e.preventDefault();
  S.aluno = { nome: $('#w-nome').value.trim(), curso: $('#w-curso').value.trim() };
  S.tema = radioVal('w-tema');
  salvar(); view = 'painel'; render(); toast(`Bem-vindo(a), ${S.aluno.nome.split(/\s+/)[0]}!`);
});
$('#w-demo').onclick = () => {
  const nome = $('#w-nome').value.trim();
  if (!nome) { $('#w-nome').focus(); return toast('Digite seu nome para continuar.'); }
  Object.assign(S, exemplo());
  $('#form-welcome').requestSubmit();
};

const mp = $('#modal-perfil');
$('#btn-perfil').onclick = () => {
  $('#p-nome').value = S.aluno.nome; $('#p-curso').value = S.aluno.curso || '';
  radio('p-tema', S.tema); radio('p-fonte', String(S.config.fonte));
  $('#p-contraste').checked = S.config.contraste;
  $('#p-notif').checked = S.config.notif && 'Notification' in window && Notification.permission === 'granted';
  $('#p-store').innerHTML = modo === 'servidor'
    ? '<b>Salvo no seu computador</b> (arquivo data/db.json). Os dados permanecem mesmo após fechar o navegador.'
    : 'Salvo apenas neste navegador. Para guardar em arquivo no computador, rode <code>node server.js</code> e acesse localhost:3000.';
  mp.showModal();
};
$('#p-export').onclick = () => baixar(`organizador-backup-${hoje()}.json`, JSON.stringify(S, null, 2));
$('#p-import').onclick = () => $('#p-file').click();
$('#p-file').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!d || !Array.isArray(d.disciplinas) || !Array.isArray(d.atividades)) throw new Error();
    if (!confirm('Substituir os dados atuais pelo backup?')) return;
    S = normalizar(d);
    if (!S.aluno) S.aluno = { nome: 'Aluno', curso: '' };
    salvar(); mp.close(); view = 'painel'; render(); toast('Backup importado.');
  } catch { toast('Arquivo de backup inválido.'); }
});
$$('input[name="p-tema"]').forEach(r => r.addEventListener('change', () => { S.tema = radioVal('p-tema'); render(); }));
/* Acessibilidade: aplica na hora (Cancelar desfaz, pois restaura o último estado salvo) */
$$('input[name="p-fonte"]').forEach(r => r.addEventListener('change', () => { S.config.fonte = +radioVal('p-fonte'); render(); }));
$('#p-contraste').addEventListener('change', e => { S.config.contraste = e.target.checked; render(); });
$('#p-notif').addEventListener('change', async e => {
  if (e.target.checked) {
    if (!('Notification' in window)) { e.target.checked = false; return toast('Seu navegador não suporta notificações.'); }
    if (await Notification.requestPermission() !== 'granted') { e.target.checked = false; return toast('Permissão de notificação negada.'); }
  }
  S.config.notif = e.target.checked;
});
$('#form-perfil').addEventListener('submit', () => {
  S.aluno = { nome: $('#p-nome').value.trim(), curso: $('#p-curso').value.trim() };
  S.tema = radioVal('p-tema'); salvar(); render(); toast('Perfil atualizado.');
});
$('#p-cancel').onclick = () => { S = normalizar(JSON.parse(snapshot)); render(); mp.close(); };
$('#p-reset').onclick = () => {
  if (!confirm('Apagar todos os dados e sair?')) return;
  S = vazio(); salvar(); mp.close(); view = 'painel'; render();
  $('#form-welcome').reset(); $('#w-nome').focus();
};

/* ---------- Modal de atividade ---------- */
const modal = $('#modal');
function abrir(a) {
  if (!S.disciplinas.length) { toast('Cadastre uma disciplina primeiro.'); view = 'disciplinas'; render(); return; }
  $('#a-disc').innerHTML = S.disciplinas.map(d => `<option value="${d.id}">${esc(d.nome)}</option>`).join('');
  $('#m-titulo').textContent = a ? 'Editar atividade' : 'Nova atividade';
  $('#a-id').value = a ? a.id : '';
  $('#a-titulo').value = a ? a.titulo : '';
  $('#a-disc').value = a ? a.disc : S.disciplinas[0].id;
  $('#a-tipo').value = a ? a.tipo : 'tarefa';
  $('#a-prio').value = a ? a.prio : 2;
  $('#a-prazo').value = a ? a.prazo : (view === 'calendario' ? diaSel : hoje());
  $('#a-obs').value = a ? a.obs : '';
  modal.showModal(); $('#a-titulo').focus();
}
$('#form-ativ').addEventListener('submit', () => {
  const id = $('#a-id').value;
  const dados = { titulo: $('#a-titulo').value.trim(), disc: $('#a-disc').value, tipo: $('#a-tipo').value,
    prio: +$('#a-prio').value, prazo: $('#a-prazo').value, obs: $('#a-obs').value.trim() };
  if (id) Object.assign(S.atividades.find(a => a.id === id), dados);
  else S.atividades.push({ id: uid(), feito: false, ...dados });
  salvar(); render(); toast(id ? 'Atividade atualizada.' : 'Atividade criada.');
});
$('#m-cancel').onclick = () => modal.close();

/* ---------- Eventos globais ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act],[data-view],[data-dia]'); if (!t) return;
  if (t.dataset.view) { view = t.dataset.view; return render(); }
  if (t.dataset.dia) { diaSel = t.dataset.dia; return renderCal(); }
  const a = S.atividades.find(x => x.id === t.dataset.id);
  switch (t.dataset.act) {
    case 'toggle': a.feito = t.checked; salvar(); render(); toast(a.feito ? 'Concluída!' : 'Reaberta.'); break;
    case 'edit': abrir(a); break;
    case 'del': {   // exclui na hora e oferece Desfazer (sem confirm bloqueante)
      const i = S.atividades.indexOf(a);
      S.atividades.splice(i, 1); salvar(); render();
      toast('Atividade excluída.', { rotulo: 'Desfazer', fn: () => {
        S.atividades.splice(Math.min(i, S.atividades.length), 0, a); salvar(); render(); toast('Atividade restaurada.'); } });
      break;
    }
    case 'deldisc': {
      const d = disc(t.dataset.id), di = S.disciplinas.indexOf(d), rem = S.atividades.filter(x => x.disc === d.id);
      S.disciplinas.splice(di, 1); S.atividades = S.atividades.filter(x => x.disc !== d.id); salvar(); render();
      toast(`Disciplina excluída${rem.length ? ` com ${rem.length} atividade(s)` : ''}.`, { rotulo: 'Desfazer', fn: () => {
        S.disciplinas.splice(Math.min(di, S.disciplinas.length), 0, d); S.atividades.push(...rem); salvar(); render(); toast('Disciplina restaurada.'); } });
      break;
    }
    case 'nova': abrir(); break;
    case 'gotodisc': view = 'disciplinas'; render(); break;
    case 'focodisc': $('#d-nome').focus(); break;
    case 'limpar': ['#f-busca', '#f-disc', '#f-tipo', '#f-status'].forEach(s => $(s).value = ''); renderAtiv(); break;
  }
});
$('#btn-nova').onclick = () => abrir();
$('#hero-add').onclick = () => abrir();
$('#cal-prev').onclick = () => { cal.setMonth(cal.getMonth() - 1, 1); renderCal(); };
$('#cal-next').onclick = () => { cal.setMonth(cal.getMonth() + 1, 1); renderCal(); };
$('#cal-hoje').onclick = () => { cal = new Date(); diaSel = hoje(); renderCal(); };
['#f-busca', '#f-disc', '#f-tipo', '#f-status', '#f-ordem'].forEach(s => $(s).addEventListener('input', renderAtiv));
$('#form-disc').addEventListener('submit', e => {
  e.preventDefault();
  S.disciplinas.push({ id: uid(), nome: $('#d-nome').value.trim(), cor: $('#d-cor').value });
  e.target.reset(); salvar(); render(); toast('Disciplina adicionada.');
});

carregar().then(() => { render(); avisarPrazos(); setInterval(avisarPrazos, 30 * 60 * 1000); });
if ('serviceWorker' in navigator && comServidor) navigator.serviceWorker.register('/sw.js').catch(() => {});
})();
