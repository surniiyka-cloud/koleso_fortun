
'use strict';
const $=id=>document.getElementById(id);
const configured=typeof window.FORTUNE_SUPABASE_URL==='string'&&/^https:\/\/[-a-z0-9]+\.supabase\.co\/?$/.test(window.FORTUNE_SUPABASE_URL)&&typeof window.FORTUNE_SUPABASE_KEY==='string'&&window.FORTUNE_SUPABASE_KEY.length>15;
const db=configured&&window.supabase?window.supabase.createClient(window.FORTUNE_SUPABASE_URL,window.FORTUNE_SUPABASE_KEY):null;
let prizes=[],history=[],angle=0,spinning=false,person='',needsReroll=false,logged=false,adminUser=null;
const cv=$('wheel'),ctx=cv.getContext('2d');
function show(id){$(id).classList.remove('hidden')}function hide(id){$(id).classList.add('hidden')}
function toast(msg){$('notice').textContent=msg;show('notice');clearTimeout(toast.t);toast.t=setTimeout(()=>hide('notice'),5000)}
function errorMessage(e){return e&&e.message?e.message:'Ошибка сети или базы данных'}
function nameOf(p){return p.title}
function draw(){
 const size=Math.max(220,Math.round(cv.getBoundingClientRect().width)),d=Math.min(window.devicePixelRatio||1,2);
 cv.width=size*d;cv.height=size*d;ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,size,size);
 const n=prizes.length,c=size/2,R=c-2;
 if(!n){ctx.fillStyle='#547362';ctx.font='700 15px Manrope,Arial';ctx.textAlign='center';ctx.fillText('Загрузка подарков…',c,c);return}
 const step=2*Math.PI/n;
 const colors=['#1b6449','#f28a62','#e6eac9','#2f8562','#f5bb94','#a8d8bb'];
 ctx.save();ctx.translate(c,c);ctx.rotate(angle);
 prizes.forEach((p,i)=>{
  const a=-Math.PI/2-step/2+i*step,mid=-Math.PI/2+i*step;
  ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,R,a,a+step);ctx.closePath();
  ctx.fillStyle=p.is_anti?'#bd6444':colors[i%colors.length];ctx.fill();
  ctx.strokeStyle='#fff9ec';ctx.lineWidth=2.8;ctx.stroke();
  ctx.save();ctx.rotate(mid);
  const tx=R*.72;
  ctx.beginPath();ctx.arc(tx,0,Math.max(16,Math.min(24,size*.046)),0,2*Math.PI);
  ctx.fillStyle=p.is_anti?'#fff3e6':'#fffdf4';ctx.fill();
  ctx.lineWidth=1.5;ctx.strokeStyle='#183d2e27';ctx.stroke();
  ctx.fillStyle=p.is_anti?'#9a432d':'#17432e';
  ctx.font='800 '+Math.max(13,Math.min(19,size*.034))+'px Manrope,Arial';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.save();ctx.translate(tx,0);ctx.rotate(-mid-angle);
  ctx.fillText(String(i+1).padStart(2,'0'),0,1);
  ctx.restore();ctx.restore();
 });
 ctx.beginPath();ctx.arc(0,0,R,0,2*Math.PI);ctx.lineWidth=2;ctx.strokeStyle='#fffef5';ctx.stroke();
 ctx.restore();
}
async function loadPrizes(){
 if(!db)return;
 const {data,error}=await db.from('fortune_prizes').select('id,title,description,is_anti,sort_order').order('sort_order',{ascending:true}).order('created_at',{ascending:true});
 if(error)throw error;prizes=data||[];draw();if(!prizes.length)toast('В базе нет призов. Добавь их через админ-панель.');
}
async function loadHistory(){
 if(!db||!logged)return;
 const {data,error}=await db.from('fortune_spins').select('id,full_name,prize_title,is_anti,created_at').order('created_at',{ascending:false}).limit(2000);
 if(error)throw error;history=data||[];
}
const GIFT_STORIES={
 'антидедлайн':{icon:'⏳',lead:'Время теперь играет на твоей стороне!',description:'Получи дополнительные 24 часа на выполнение любой одной внутренней задачи. Спокойно согласуй перенос дедлайна и закончи работу без гонки со временем.'},
 'официальный высыпон':{icon:'😴',lead:'Утро без будильника? Теперь официально!',description:'Один раз приходи на работу на 1–2 часа позже обычного — без отработки. Выспись, выпей кофе и начни день в своём ритме.'},
 'право на тишину':{icon:'🔕',lead:'Никаких лишних уведомлений. Только твой фокус.',description:'Выбери один рабочий день без несрочных упоминаний в чатах и планёрок. Важные вопросы остаются, а всё остальное подождёт.'},
 'мерч-сюрприз':{icon:'🎁',lead:'Фирменный сюрприз уже ждёт!',description:'Тебе достаётся брендированный мерч ТИАН-Трейд на выбор. Выбирай то, что действительно хочется носить или использовать каждый день.'},
 'пятничная свобода':{icon:'🌴',lead:'Твои выходные начнутся раньше!',description:'В одну из пятниц уходи с работы на 2–3 часа раньше без отработки. Время на любимые дела, прогулку или просто заслуженный отдых.'},
 'абонемент на опоздания':{icon:'⌚',lead:'Небольшое опоздание больше не катастрофа.',description:'В течение одного месяца тебе простят три опоздания до 30 минут каждое. Используй, когда утро решит пойти не по плану.'},
 'день удалёнки':{icon:'🏡',lead:'Сегодня офис там, где удобно тебе!',description:'Выбирай один рабочий день и работай из дома без необходимости объяснять причину. Твои задачи остаются, а место работы выбираешь ты.'},
 'день удаленки без объяснения причин':{icon:'🏡',lead:'Сегодня офис там, где удобно тебе!',description:'Выбирай один рабочий день и работай из дома без необходимости объяснять причину. Твои задачи остаются, а место работы выбираешь ты.'},
 'личный сиеста-час':{icon:'☕',lead:'Час только для себя!',description:'Увеличь свой обеденный перерыв на целый час в любой выбранный день. Можно спокойно пообедать, прогуляться или решить личные дела.'},
 'именинный отгул':{icon:'🎂',lead:'День рождения заслуживает целого дня!',description:'Забирай дополнительный оплачиваемый выходной: в свой день рождения или в течение недели после него. Отмечай без рабочих забот.'},
 'индивидуальный менторинг':{icon:'🚀',lead:'Час больших идей и новых возможностей!',description:'Тебя ждёт личная часовая встреча с топ-менеджером или директором компании. Обсуди карьерные цели, задай вопросы или предложи свою идею.'},
 'день самообразования':{icon:'📚',lead:'Инвестируй целый день в себя!',description:'Один рабочий день можно посвятить профессиональному развитию: книгам, курсам и вебинарам вместо текущих задач.'},
 'официальный день самообразования':{icon:'📚',lead:'Инвестируй целый день в себя!',description:'Один рабочий день можно посвятить профессиональному развитию: книгам, курсам и вебинарам вместо текущих задач.'}
};
function showReward(tag,title,detail,warning=false){
 const story=GIFT_STORIES[title.trim().toLocaleLowerCase('ru')];
 $('resultTag').textContent=tag;
 $('resultTitle').textContent=title;
 $('rewardIcon').textContent=warning?'⚡':(story?.icon||'🎁');
 $('rewardLead').textContent=warning?'Не переживай: без подарка мы тебя не оставим!':(story?.lead||'Поздравляем! Сегодня удача на твоей стороне!');
 $('resultText').textContent=warning?detail:(detail?.trim()||story?.description||'Твой персональный подарок от ТИАН-Трейд!');
 $('rewardFootnote').textContent=warning?'Нажми кнопку ниже, чтобы получить свой настоящий подарок.':'Сохрани этот результат и покажи организатору, чтобы воспользоваться привилегией.';
 $('result').classList.toggle('warning',warning);
 $('reroll').classList.toggle('hidden',!warning);
 $('rewardDone').classList.toggle('hidden',warning);
 show('rewardOverlay');document.body.classList.add('reward-open');
 $('result').focus();
}
function closeReward(){hide('rewardOverlay');document.body.classList.remove('reward-open')}
$('rewardClose').onclick=closeReward;
$('rewardDone').onclick=closeReward;
$('rewardOverlay').onclick=e=>{if(e.target===$('rewardOverlay'))closeReward()};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('rewardOverlay').classList.contains('hidden'))closeReward()});

function animateTo(index,finished){
 let step=2*Math.PI/prizes.length,current=((angle%(2*Math.PI))+2*Math.PI)%(2*Math.PI),dest=((-index*step)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
 let delta=(dest-current+2*Math.PI)%(2*Math.PI),from=angle,to=from+12*Math.PI+delta,start=performance.now();
 function frame(t){let q=Math.min((t-start)/5500,1);angle=from+(to-from)*(1-(1-q)**5);draw();if(q<1){requestAnimationFrame(frame);return}finished()}
 requestAnimationFrame(frame)
}
async function spin(){
 if(spinning||!db)return;
 const f=$('first').value.trim().replace(/\s+/g,' '),l=$('last').value.trim().replace(/\s+/g,' ');
 if(!f||!l){toast('Укажи имя и фамилию');return}
 const next=f+' '+l;
 if(needsReroll&&next.toLocaleLowerCase('ru')!==person.toLocaleLowerCase('ru')){toast('Повторное вращение доступно только тому же участнику');return}
 if(!prizes.length){toast('Призы ещё не загружены');return}
 spinning=true;$('spin').disabled=true;$('reroll').disabled=true;$('spin').textContent='Определяем подарок…';
 try{
  const {data,error}=await db.rpc('fortune_draw',{p_first:f,p_last:l});if(error)throw error;
  const win=Array.isArray(data)?data[0]:data;
  if(!win)throw Error('Сервер не вернул результат.');
  person=next;
  const i=prizes.findIndex(p=>p.id===win.prize_id);
  if(i<0){await loadPrizes()}
  const idx=prizes.findIndex(p=>p.id===win.prize_id);
  if(idx<0)throw Error('Получен приз, которого нет в актуальном списке. Обратись к администратору.');
  $('spin').textContent='Колесо вращается…';closeReward();
  animateTo(idx,()=>{
   spinning=false;$('spin').disabled=false;$('reroll').disabled=false;
   if(win.is_anti){needsReroll=true;$('spin').textContent='Крутить ещё раз ↻';
    showReward('⚡ СИСТЕМНАЯ ОШИБКА','Упс! Похоже, система дала сбой.','Но мы же не оставим тебя без подарка в день рождения? Крути ещё раз!',true)}
   else{needsReroll=false;showReward('✦ ПОЗДРАВЛЯЕМ',win.prize_title,win.prize_description||'Твой подарок от ТИАН-Трейд!');
    $('spin').disabled=true;$('spin').textContent='Подарок получен ✓'}
  });
  if(logged)await loadHistory().then(renderAdmin).catch(()=>{});
 }catch(err){spinning=false;$('spin').disabled=false;$('reroll').disabled=false;$('spin').textContent=needsReroll?'Крутить ещё раз ↻':'Крутить колесо ✦';toast(errorMessage(err))}
}
$('spin').onclick=spin;$('reroll').onclick=()=>{closeReward();spin()};
$('openAdmin').onclick=async()=>{if(!db){toast('Supabase ещё не настроен — смотри README в GitHub');return}
 if(logged){await refreshAdmin();show('adminOverlay')}else{$('loginError').textContent='';show('loginOverlay');$('adminPassword').focus()}};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>hide(b.dataset.close));
document.querySelectorAll('.overlay').forEach(el=>el.onclick=e=>{if(e.target===el)hide(el.id)});
async function checkAdmin(){
 const {data:{user}}=await db.auth.getUser();
 if(!user){logged=false;adminUser=null;return false}
 const {data,error}=await db.rpc('fortune_is_admin');
 logged=!error&&data===true;adminUser=logged?user:null;return logged
}
$('loginForm').onsubmit=async e=>{
 e.preventDefault();$('loginError').textContent='';$('loginButton').disabled=true;
 try{
  const {error}=await db.auth.signInWithPassword({email:'surniiyka@mail.ru',password:$('adminPassword').value});
  if(error)throw error;
  if(!await checkAdmin()){await db.auth.signOut();throw Error('У пользователя нет прав администратора. Добавь его в fortune_admins.')}
  $('adminPassword').value='';hide('loginOverlay');await refreshAdmin();show('adminOverlay')
 }catch(e){$('loginError').textContent=errorMessage(e)}finally{$('loginButton').disabled=false}
};
$('logout').onclick=async()=>{if(db)await db.auth.signOut();logged=false;adminUser=null;hide('adminOverlay');toast('Вы вышли из панели администратора')};
async function refreshAdmin(){if(!logged)return;await Promise.all([loadPrizes(),loadHistory()]);renderAdmin()}
function renderAdmin(){
 if(!logged)return;const root=$('prizeList');root.replaceChildren();$('prizeCount').textContent='('+prizes.length+')';
 prizes.forEach((p,i)=>{
  const row=document.createElement('div');row.className='prize prize-editor';
  const fields=document.createElement('div');fields.className='prize-fields';
  const titleLabel=document.createElement('label');titleLabel.className='prize-label';titleLabel.textContent='Название';
  const titleInput=document.createElement('input');titleInput.value=p.title;titleInput.maxLength=120;
  titleInput.setAttribute('aria-label','Название приза');titleLabel.append(titleInput);
  const descLabel=document.createElement('label');descLabel.className='prize-label';descLabel.textContent='Описание выигрыша';
  const descInput=document.createElement('textarea');descInput.value=p.description||'';
  descInput.maxLength=2000;descInput.rows=3;descInput.placeholder='Что даёт этот приз и как им воспользоваться';
  descInput.setAttribute('aria-label','Описание приза');descLabel.append(descInput);
  fields.append(titleLabel,descLabel);
  const actions=document.createElement('div');actions.className='prize-actions';
  if(p.is_anti){const anti=document.createElement('span');anti.textContent='АНТИКАРТОЧКА';actions.append(anti)}
  const saveBtn=document.createElement('button');saveBtn.className='ghost prize-save';saveBtn.textContent='Сохранить';
  saveBtn.disabled=true;
  const dirty=()=>{saveBtn.disabled=titleInput.value.trim()===p.title && descInput.value.trim()===(p.description||'').trim()};
  titleInput.addEventListener('input',dirty);descInput.addEventListener('input',dirty);
  saveBtn.onclick=async()=>{
   if(!logged)return;
   const title=titleInput.value.trim(),description=descInput.value.trim();
   if(!title){toast('Название не может быть пустым');titleInput.focus();return}
   saveBtn.disabled=true;saveBtn.textContent='Сохраняем…';
   const {data,error}=await db.from('fortune_prizes').update({title,description}).eq('id',p.id).select('title,description').single();
   saveBtn.textContent='Сохранить';
   if(error){toast('Не удалось сохранить: '+errorMessage(error));saveBtn.disabled=false;return}
   p.title=data.title;p.description=data.description;
   titleInput.value=p.title;descInput.value=p.description;
   saveBtn.disabled=true;draw();toast('Описание приза сохранено');
  };
  actions.append(saveBtn);
  const del=document.createElement('button');del.className='delete';del.textContent='Удалить';del.title='Удалить сектор';
  del.disabled=prizes.length<=2;
  del.onclick=async()=>{
   if(spinning||!confirm('Удалить сектор «'+p.title+'»?'))return;
   const {error}=await db.from('fortune_prizes').delete().eq('id',p.id);
   if(error)toast(errorMessage(error));else await refreshAdmin();
  };
  actions.append(del);
  row.append(fields,actions);root.append(row);
 });
 const h=history;$('statPlayers').textContent=new Set(h.map(x=>x.full_name.toLowerCase())).size;
 $('statWins').textContent=h.filter(x=>!x.is_anti).length;$('statRerolls').textContent=h.filter(x=>x.is_anti).length;
 const area=$('history');area.replaceChildren();if(!h.length){area.textContent='История пока пуста';area.style.padding='16px';return}
 area.style.padding='0';let table=document.createElement('table'),thead=document.createElement('thead'),header=document.createElement('tr');
 ['Дата','Участник','Результат'].forEach(s=>{let th=document.createElement('th');th.textContent=s;header.append(th)});thead.append(header);table.append(thead);
 let body=document.createElement('tbody');h.forEach(x=>{let tr=document.createElement('tr');
 [new Date(x.created_at).toLocaleString('ru-RU'),x.full_name,x.prize_title].forEach(s=>{let td=document.createElement('td');td.textContent=s;tr.append(td)});body.append(tr)});
 table.append(body);area.append(table)
}
$('addPrize').onclick=async()=>{if(!logged||spinning)return;
 let title=$('newTitle').value.trim();if(!title){toast('Введите название');return}if(prizes.length>=30){toast('Максимум 30 секторов');return}
 const {error}=await db.from('fortune_prizes').insert({title,description:'Подарок от ТИАН-Трейд.',is_anti:false,sort_order:prizes.length});
 if(error)toast(errorMessage(error));else{$('newTitle').value='';await refreshAdmin()}
};
function download(name,content,type){let url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('exportCsv').onclick=()=>{if(!logged)return;let rows=[['Дата','Участник','Результат','Антикарточка'],...history.map(x=>[x.created_at,x.full_name,x.prize_title,x.is_anti?'Да':'Нет'])];
 download('tian-history.csv','\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n'),'text/csv;charset=utf-8')};
$('exportJson').onclick=()=>{if(logged)download('tian-backup.json',JSON.stringify({prizes,history},null,2),'application/json')};
$('importBtn').disabled=true;$('importBtn').title='Импорт отключён во избежание перезаписи защищённой истории';
$('clearHistory').disabled=false;
$('clearHistory').onclick=async()=>{
 if(!logged||spinning)return;
 if(!confirm('Очистить историю всех розыгрышей? Действие необратимо.'))return;
 const btn=$('clearHistory');btn.disabled=true;
 try{
  const {data,error}=await db.rpc('fortune_clear_history');
  if(error)throw error;
  await loadHistory();renderAdmin();
  needsReroll=false;person='';
  $('spin').disabled=false;$('spin').textContent='Крутить колесо ✦';
  closeReward();toast('История очищена. Удалено записей: '+data);
 }catch(e){toast('Ошибка: '+errorMessage(e)+'. Проверь supabase/clear_history.sql')}
 finally{btn.disabled=false}
};
window.addEventListener('resize',draw);draw();
(async()=>{if(!db){$('spin').disabled=true;$('spin').textContent='Ожидание подключения Supabase';toast('Нужно настроить Supabase URL и publishable key в supabase-config.js');return}
 try{await loadPrizes();await checkAdmin()}catch(e){toast('Ошибка подключения: '+errorMessage(e))}})();
