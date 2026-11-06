const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const load = (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } };
let tasks = load('lo_tasks'), goals = load('lo_goals'), expenses = load('lo_expenses'), currentFilter = 'all';
const save = () => {
  localStorage.setItem('lo_tasks', JSON.stringify(tasks));
  localStorage.setItem('lo_goals', JSON.stringify(goals));
  localStorage.setItem('lo_expenses', JSON.stringify(expenses));
};
const money = n => Number(n).toLocaleString('ar', {maximumFractionDigits:2});
const today = new Date();
$('#date-chip').textContent = today.toLocaleDateString('ar', {weekday:'long', day:'numeric', month:'long'});
$('#today-label').textContent = today.toLocaleDateString('ar', {year:'numeric', month:'long', day:'numeric'});

const unitNames = {
  km: 'كم', m: 'متر', pages: 'صفحة', books: 'كتاب',
  hours: 'ساعة', minutes: 'دقيقة', USD: 'دولار', count: 'مرة'
};
const unitGroups = {
  km: 'distance', m: 'distance',
  hours: 'time', minutes: 'time',
  pages: 'pages', books: 'books', USD: 'money', count: 'count'
};
function toBase(value, unit) {
  if (unit === 'm') return value / 1000;
  if (unit === 'minutes') return value / 60;
  return value;
}
function displayNumber(value) {
  return Number(value.toFixed(3)).toLocaleString('ar', {maximumFractionDigits:3});
}
function showView(name){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===name+'-view'));
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  const titles={dashboard:'نظرة عامة',tasks:'المهام',goals:'الأهداف',expenses:'المصروفات',schedule:'جدول اليوم'};
  $('#page-title').textContent=titles[name]||'نظرة عامة';
}
$$('.nav-item').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));

function renderTasks(){
  const filtered=tasks.filter(t=>currentFilter==='all'||(currentFilter==='done'?t.done:!t.done));
  const html=filtered.length?filtered.map(t=>`<div class="task-row ${t.done?'completed':''}"><button class="task-check ${t.done?'checked':''}" data-toggle="${t.id}" aria-label="تغيير حالة المهمة">${t.done?'✓':''}</button><div class="task-info"><b>${escapeHTML(t.text)}</b><small>الأولوية: ${escapeHTML(t.priority)}</small></div><span class="badge ${t.priority}">${escapeHTML(t.priority)}</span><button class="delete-btn" data-delete-task="${t.id}" aria-label="حذف">×</button></div>`).join(''):'لا توجد مهام في هذا القسم.';
  $('#tasks-list').innerHTML=html; $('#tasks-list').classList.toggle('empty-state',!filtered.length);
  const upcoming=tasks.filter(t=>!t.done).slice(0,4);
  $('#dashboard-task-list').innerHTML=upcoming.length?upcoming.map(t=>`<div class="task-row"><span class="task-check"></span><div class="task-info"><b>${escapeHTML(t.text)}</b><small>الأولوية: ${escapeHTML(t.priority)}</small></div><span class="badge ${t.priority}">${escapeHTML(t.priority)}</span></div>`).join(''):'لا توجد مهام بعد. أضف أول مهمة لك!';
  $('#dashboard-task-list').classList.toggle('empty-state',!upcoming.length);
  const done=tasks.filter(t=>t.done).length, total=tasks.length, pct=total?Math.round(done/total*100):0;
  $('#stat-tasks').textContent=total-done; $('#stat-done').textContent=done;
  $('#progress-percent').textContent=pct+'%'; $('#progress-fraction').textContent=`${done} من ${total}`;
  $('#progress-ring').style.background=`conic-gradient(var(--purple) ${pct}%,#eeeefa ${pct}%)`;
}

function renderGoals(){
  $('#goals-list').innerHTML=goals.length?goals.map(g=>{
    // توافق مع الأهداف القديمة التي كانت تخزن النسبة مباشرة.
    if (g.target === undefined) {
      const oldProgress = Math.max(0, Math.min(100, Number(g.progress) || 0));
      return `<article class="goal-card"><b>${escapeHTML(g.text)}</b><p>هدف قديم — التقدم السابق: ${oldProgress}%</p><div class="goal-progress"><span style="width:${oldProgress}%"></span></div><small>أنشئ هدفاً جديداً لاستخدام التقدم بالقيم والوحدات.</small><div class="goal-controls"><button class="delete-btn" data-delete-goal="${g.id}">حذف</button></div></article>`;
    }
    const pct = g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0;
    const remaining = Math.max(0, g.target - g.current);
    const unit = unitNames[g.unit] || g.unit || '';
    const history = (g.history || []).slice(-3).reverse();
    return `<article class="goal-card">
      <b>${escapeHTML(g.text)}</b>
      <p>الإنجاز: ${displayNumber(g.current)} / ${displayNumber(g.target)} ${unit}</p>
      <div class="goal-progress"><span style="width:${pct}%"></span></div>
      <div class="goal-meta"><span>${Math.round(pct)}% مكتمل</span><span>المتبقي: ${displayNumber(remaining)} ${unit}</span></div>
      <form class="goal-progress-form" data-progress-form="${g.id}">
        <input type="number" min="0.001" step="any" name="amount" placeholder="كم أنجزت؟" required>
        <select name="unit" aria-label="وحدة التقدم">${goalUnitOptions(g.unit)}</select>
        <button class="primary-btn" type="submit">＋ إضافة تقدم</button>
      </form>
      ${history.length ? `<details class="goal-history"><summary>سجل الإنجازات (${(g.history||[]).length})</summary>${history.map(h=>`<div>${displayNumber(h.amount)} ${escapeHTML(unitNames[h.unit]||h.unit)} <small>${escapeHTML(h.date)}</small></div>`).join('')}</details>` : ''}
      <div class="goal-controls"><button class="delete-btn" data-delete-goal="${g.id}">حذف الهدف</button></div>
    </article>`;
  }).join(''):'لم تضف أي أهداف بعد.';
  $('#goals-list').classList.toggle('empty-state',!goals.length);
  $('#stat-goals').textContent=goals.length;
}
function goalUnitOptions(selected) {
  const opts = [
    ['km','كيلومتر'],['m','متر'],['pages','صفحة'],['books','كتاب'],
    ['hours','ساعة'],['minutes','دقيقة'],['USD','دولار'],['count','مرة / عدد']
  ];
  return opts.map(([v,label])=>`<option value="${v}" ${v===selected?'selected':''}>${label}</option>`).join('');
}
function renderExpenses(){
  const total=expenses.reduce((s,e)=>s+Number(e.amount),0);
  $('#expense-total').textContent=money(total); $('#stat-expenses').textContent=money(total);
  $('#expenses-list').innerHTML=expenses.length?expenses.map(e=>`<div class="expense-row"><div class="task-info"><b>${escapeHTML(e.name)}</b><small>${escapeHTML(e.date)}</small></div><b>${money(e.amount)}</b><button class="delete-btn" data-delete-expense="${e.id}">×</button></div>`).join(''):'لا توجد مصروفات مسجلة.';
  $('#expenses-list').classList.toggle('empty-state',!expenses.length);
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

$('#task-form').addEventListener('submit',e=>{
  e.preventDefault();const text=$('#task-input').value.trim();if(!text)return;
  tasks.unshift({id:Date.now(),text,priority:$('#task-priority').value,done:false});
  $('#task-input').value='';save();renderAll();
});
$('#goal-form').addEventListener('submit',e=>{
  e.preventDefault();
  const text=$('#goal-input').value.trim();
  const target=Number($('#goal-target').value);
  const unit=$('#goal-unit').value;
  if(!text||!Number.isFinite(target)||target<=0)return;
  goals.unshift({id:Date.now(),text,target,current:0,unit,history:[]});
  $('#goal-input').value='';$('#goal-target').value='';
  save();renderAll();
});
$('#expense-form').addEventListener('submit',e=>{
  e.preventDefault();const name=$('#expense-name').value.trim(),amount=Number($('#expense-amount').value);
  if(!name||!amount||amount<0)return;
  expenses.unshift({id:Date.now(),name,amount,date:today.toLocaleDateString('ar')});
  $('#expense-name').value='';$('#expense-amount').value='';save();renderAll();
});
$$('.filter').forEach(b=>b.addEventListener('click',()=>{
  currentFilter=b.dataset.filter;$$('.filter').forEach(x=>x.classList.toggle('active',x===b));renderTasks();
}));

document.addEventListener('submit',e=>{
  const form=e.target.closest('[data-progress-form]');
  if(!form)return;
  e.preventDefault();
  const goal=goals.find(g=>g.id===Number(form.dataset.progressForm));
  if(!goal || goal.target===undefined)return;
  const amount=Number(form.elements.amount.value);
  const inputUnit=form.elements.unit.value;
  if(!Number.isFinite(amount)||amount<=0)return;
  if(unitGroups[inputUnit]!==unitGroups[goal.unit]){
    alert('اختر وحدة متوافقة مع وحدة الهدف. يمكنك استخدام المتر والكيلومتر معاً، أو الدقيقة والساعة معاً.');
    return;
  }
  const baseAmount=toBase(amount,inputUnit);
  const baseTarget=toBase(Number(goal.target),goal.unit);
  const baseCurrent=toBase(Number(goal.current)||0,goal.unit);
  const nextBase=Math.min(baseTarget,baseCurrent+baseAmount);
  // نخزن التقدم بوحدة الهدف حتى تبقى المقارنة والحسابات دقيقة.
  goal.current=goal.unit==='m'?nextBase*1000:goal.unit==='minutes'?nextBase*60:nextBase;
  goal.history=goal.history||[];
  goal.history.push({amount,unit:inputUnit,date:new Date().toLocaleDateString('ar')});
  save();renderAll();
});

document.addEventListener('click',e=>{
  const toggle=e.target.closest('[data-toggle]');
  if(toggle){const t=tasks.find(x=>x.id===Number(toggle.dataset.toggle));if(t)t.done=!t.done;save();renderAll();}
  const dt=e.target.closest('[data-delete-task]');
  if(dt){tasks=tasks.filter(x=>x.id!==Number(dt.dataset.deleteTask));save();renderAll();}
  const dg=e.target.closest('[data-delete-goal]');
  if(dg){goals=goals.filter(x=>x.id!==Number(dg.dataset.deleteGoal));save();renderAll();}
  const de=e.target.closest('[data-delete-expense]');
  if(de){expenses=expenses.filter(x=>x.id!==Number(de.dataset.deleteExpense));save();renderAll();}
});
function renderAll(){renderTasks();renderGoals();renderExpenses();}
renderAll();
