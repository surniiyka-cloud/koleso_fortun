
'use strict';
const $=id=>document.getElementById(id);
const configured=typeof window.FORTUNE_SUPABASE_URL==='string'&&/^https:\/\/[-a-z0-9]+\.supabase\.co\/?$/.test(window.FORTUNE_SUPABASE_URL)&&typeof window.FORTUNE_SUPABASE_KEY==='string'&&window.FORTUNE_SUPABASE_KEY.length>15;
const db=configured&&window.supabase?window.supabase.createClient(window.FORTUNE_SUPABASE_URL,window.FORTUNE_SUPABASE_KEY):null;
let prizes=[],history=[],angle=0,spinning=false,person='',needsReroll=false,logged=false,adminUser=null,revealed=false;
const PRIZE_CATALOG=[{"title":"Именинный отгул","description":"Дополнительный оплачиваемый выходной в день рождения или в течение недели после него.","icon":"🎂","sort_order":0,"is_anti":false,"is_display_only":false},{"title":"1 000 000 ₽","description":"Шуточный декоративный сектор. Денежные призы не разыгрываются.","icon":"💸","sort_order":1,"is_anti":false,"is_display_only":true},{"title":"1 000 000 ₽","description":"Шуточный декоративный сектор. Денежные призы не разыгрываются.","icon":"💸","sort_order":2,"is_anti":false,"is_display_only":true},{"title":"1 000 000 ₽","description":"Шуточный декоративный сектор. Денежные призы не разыгрываются.","icon":"💸","sort_order":3,"is_anti":false,"is_display_only":true},{"title":"1 000 000 ₽","description":"Шуточный декоративный сектор. Денежные призы не разыгрываются.","icon":"💸","sort_order":4,"is_anti":false,"is_display_only":true},{"title":"1 000 000 ₽","description":"Шуточный декоративный сектор. Денежные призы не разыгрываются.","icon":"💸","sort_order":5,"is_anti":false,"is_display_only":true},{"title":"1 000 000 ₽","description":"Шуточный декоративный сектор. Денежные призы не разыгрываются.","icon":"💸","sort_order":6,"is_anti":false,"is_display_only":true},{"title":"1 000 000 ₽","description":"Шуточный декоративный сектор. Денежные призы не разыгрываются.","icon":"💸","sort_order":7,"is_anti":false,"is_display_only":true},{"title":"1 000 000 ₽","description":"Шуточный декоративный сектор. Денежные призы не разыгрываются.","icon":"💸","sort_order":8,"is_anti":false,"is_display_only":true},{"title":"1 000 000 ₽","description":"Шуточный декоративный сектор. Денежные призы не разыгрываются.","icon":"💸","sort_order":9,"is_anti":false,"is_display_only":true}];
const cv=$('wheel'),ctx=cv.getContext('2d');
function show(id){$(id).classList.remove('hidden')}function hide(id){$(id).classList.add('hidden')}
function toast(msg){$('notice').textContent=msg;show('notice');clearTimeout(toast.t);toast.t=setTimeout(()=>hide('notice'),5000)}
function errorMessage(e){return e&&e.message?e.message:'Ошибка сети или базы данных'}
function nameOf(p){return p.title}
function isDisplayOnly(p){return p.is_display_only===true}
let lastWinnerId=null;
function renderAvailablePrizes(winnerId=lastWinnerId){
 lastWinnerId=winnerId;
 const list=$('availablePrizeList');
 list.replaceChildren();
 prizes.forEach((p,i)=>{
  const li=document.createElement('li');
  const btn=document.createElement('button');btn.type='button';
  const selected=!!winnerId&&p.id===winnerId;
  btn.className='available-prize-item'+(selected?' selected':'')+(isDisplayOnly(p)?' is-demo':'');
  btn.setAttribute('aria-label','Подробнее о секторе '+(i+1)+': '+p.title);
  const number=document.createElement('span');number.className='prize-number';number.textContent=String(i+1).padStart(2,'0');
  const details=document.createElement('span');details.className='prize-card-text';
  const title=document.createElement('strong');title.textContent=p.title;
  const hint=document.createElement('small');
  hint.textContent=selected?'ТВОЙ ПРИЗ':isDisplayOnly(p)?'Специальный сектор':'Нажми, чтобы узнать подробности';
  details.append(title,hint);
  const arrow=document.createElement('span');arrow.className='prize-arrow';arrow.textContent='↗';
  btn.append(number,details,arrow);
  btn.onclick=()=>showPrizeDetails(p);
  li.append(btn);list.append(li);
 });
 $('availablePrizeCount').textContent=String(prizes.length);
}

function showPrizeDetails(p){
 const story=GIFT_STORIES[p.title.trim().toLocaleLowerCase('ru')];
 $('detailIcon').textContent=story?.icon||'🎁';
 $('detailTitle').textContent=p.title;
 $('detailText').textContent=p.description?.trim()||story?.description||'Подарок от ТИАН-Трейд.';
 show('detailOverlay');$('detailClose').focus();
}
function revealPrizeList(){closeReward();show('galleryOverlay');requestAnimationFrame(renderGalleryWheel);}

function paintWheel(canvas,rotation,showNames){
 const context=canvas.getContext('2d');
 const size=Math.max(220,Math.round(canvas.getBoundingClientRect().width)),d=Math.min(window.devicePixelRatio||1,2);
 canvas.width=size*d;canvas.height=size*d;context.setTransform(d,0,0,d,0,0);context.clearRect(0,0,size,size);
 const n=prizes.length,c=size/2,R=c-3;
 if(!n){context.fillStyle='#b4d6bc';context.font='700 15px Manrope,Arial';context.textAlign='center';context.fillText('Загрузка колеса…',c,c);return}
 const step=2*Math.PI/n,labelRadius=R*.68;
 context.save();context.translate(c,c);context.rotate(rotation);
 prizes.forEach((p,i)=>{
  const mid=-Math.PI/2+i*step,a=mid-step/2;
  context.beginPath();context.moveTo(0,0);context.arc(0,0,R,a,a+step);context.closePath();
  context.fillStyle=i===0?'#f7ac75':i%2===0?'#174f3d':'#2c7858';
  context.fill();context.lineWidth=2.5;context.strokeStyle='#fff4da';context.stroke();
  context.save();context.rotate(mid);context.translate(labelRadius,0);context.rotate(-mid-rotation);
  context.textAlign='center';context.textBaseline='middle';
  if(!showNames){
   context.fillStyle=i===0?'#17352b':'#fff9e9';
   context.font='800 '+Math.max(17,Math.min(29,size*.05))+'px Manrope,Arial';
   context.fillText('?',0,0);
  }else if(i===0){
   context.fillStyle='#17352b';context.font='800 '+Math.max(11,Math.min(17,size*.029))+'px Manrope,Arial';
   context.fillText('ИМЕНИННЫЙ',0,-10,R*.37);context.fillText('ОТГУЛ',0,10,R*.37);
  }else{
   context.fillStyle='#fff9e9';context.font='800 '+Math.max(13,Math.min(21,size*.037))+'px Manrope,Arial';
   context.fillText('1 000',0,-11,R*.34);context.fillText('000 ₽',0,12,R*.34);
  }
  context.restore();
 });
 context.beginPath();context.arc(0,0,R,0,2*Math.PI);context.strokeStyle='#fffef2';context.lineWidth=2;context.stroke();
 context.restore();
}
function draw(){paintWheel(cv,angle,revealed)}
function renderGalleryWheel(){paintWheel($('galleryWheel'),angle,true)}

async function loadPrizes(){
 if(!db)return;
 const {data,error}=await db.from('fortune_prizes').select('id,title,description,is_anti,is_display_only,sort_order').order('sort_order',{ascending:true}).order('created_at',{ascending:true});
 const live=!error?(data||[]):[];
 const match=!error&&live.length===PRIZE_CATALOG.length&&live.every((p,i)=>p.title===PRIZE_CATALOG[i].title&&p.is_display_only===PRIZE_CATALOG[i].is_display_only&&!p.is_anti);
 if(!match){
  prizes=PRIZE_CATALOG.map((p,i)=>({...p,id:'preview-'+i,showcase_only:true}));
  $('spin').disabled=true;
  $('spin').textContent='Сначала обновить призы';
  toast('Новый каталог готов, но сервер ещё не обновлён. Выполни SQL-файл в Supabase.');
 }else{
  prizes=live;
  if(!spinning&&!person){$('spin').disabled=false;$('spin').textContent='Крутить колесо ✦';}
 }
 draw();
}

async function loadHistory(){
 if(!db||!logged)return;
 const {data,error}=await db.from('fortune_spins').select('id,full_name,prize_id,prize_title,is_anti,created_at').order('created_at',{ascending:false}).limit(2000);
 if(error)throw error;history=data||[];
}
const GIFT_STORIES={'именинный отгул':{icon:'🎂',lead:'Твой дополнительный выходной!',description:"Дополнительный оплачиваемый выходной в день рождения или в течение недели после него."}};
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
 $('viewAllPrizes').classList.remove('hidden');show('rewardOverlay');document.body.classList.add('reward-open');
 $('result').focus();
}
function closeReward(){hide('rewardOverlay');document.body.classList.remove('reward-open')}
$('viewAllPrizes').onclick=revealPrizeList;
$('detailClose').onclick=()=>hide('detailOverlay');
$('galleryClose').onclick=()=>hide('galleryOverlay');
$('galleryOverlay').onclick=e=>{if(e.target===$('galleryOverlay'))hide('galleryOverlay')};
$('detailOverlay').onclick=e=>{if(e.target===$('detailOverlay'))hide('detailOverlay')};
$('rewardClose').onclick=closeReward;
$('rewardDone').onclick=closeReward;
$('rewardOverlay').onclick=e=>{if(e.target===$('rewardOverlay'))closeReward()};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('detailOverlay').classList.contains('hidden'))hide('detailOverlay');else if(!$('galleryOverlay').classList.contains('hidden'))hide('galleryOverlay');else if(!$('rewardOverlay').classList.contains('hidden'))closeReward()}});

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
 if(!prizes.length||prizes.some(p=>p.showcase_only)){toast('Сначала синхронизируй новые призы с Supabase через SQL-файл');return}
 spinning=true;$('spin').disabled=true;$('reroll').disabled=true;$('spin').textContent='Определяем подарок…';
 try{
  const {data,error}=await db.rpc('fortune_draw',{p_first:f,p_last:l});if(error)throw error;
  const win=Array.isArray(data)?data[0]:data;
  if(!win)throw Error('Сервер не вернул результат.');
  person=next;
  if(isDisplayOnly({title:win.prize_title}))throw Error('Получен недоступный сектор. Розыгрыш остановлен, свяжись с администратором.');
  const i=prizes.findIndex(p=>p.id===win.prize_id);
  if(i<0){await loadPrizes()}
  const idx=prizes.findIndex(p=>p.id===win.prize_id);
  if(idx<0)throw Error('Получен приз, которого нет в актуальном списке. Обратись к администратору.');
  $('spin').textContent='Колесо вращается…';closeReward();
  animateTo(idx,()=>{
   revealed=true;draw();
   renderAvailablePrizes(win.is_anti?null:win.prize_id);
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
 if(logged){await refreshAdmin();show('adminOverlay')}else{$('loginError').textContent='';$('adminPassword').value='';show('loginOverlay');requestAnimationFrame(()=>{$('adminPassword').value='';$('adminPassword').focus()})}};
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
function openHistoryPreview(record){
 if(!logged)return;
 const prize=prizes.find(p=>p.id===record.prize_id)||prizes.find(p=>p.title.toLocaleLowerCase('ru')===record.prize_title.toLocaleLowerCase('ru'));
 if(record.is_anti){
  showReward('⚡ ПРОСМОТР ИСТОРИИ',record.prize_title,'Но мы же не оставим тебя без подарка в день рождения? Крути ещё раз!',true);
  hide('reroll');show('rewardDone');
 }else{
  showReward('✦ ПРОСМОТР ВЫИГРЫША',record.prize_title,prize?.description||'');
 }
}
function renderAdmin(){
 if(!logged)return;const root=$('prizeList');root.replaceChildren();const editablePrizes=prizes.filter(p=>!p.showcase_only);$('prizeCount').textContent='('+editablePrizes.length+')';
 editablePrizes.forEach((p,i)=>{
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
  del.disabled=editablePrizes.length<=2;
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
 let body=document.createElement('tbody');h.forEach(x=>{
  let tr=document.createElement('tr');
  [new Date(x.created_at).toLocaleString('ru-RU'),x.full_name].forEach(s=>{let td=document.createElement('td');td.textContent=s;tr.append(td)});
  const resultCell=document.createElement('td');resultCell.className='history-result-cell';
  const resultName=document.createElement('span');resultName.textContent=x.prize_title;
  const view=document.createElement('button');view.type='button';view.className='history-preview';view.textContent='Посмотреть';
  view.setAttribute('aria-label','Посмотреть выигрыш: '+x.prize_title);
  view.onclick=()=>openHistoryPreview(x);
  const deleteBtn=document.createElement('button');deleteBtn.type='button';deleteBtn.className='history-delete';deleteBtn.textContent='Удалить';
  deleteBtn.setAttribute('aria-label','Удалить запись '+x.full_name+' — '+x.prize_title);
  deleteBtn.onclick=async()=>{
   if(!logged||spinning)return;
   if(!confirm('Удалить ТОЛЬКО эту запись истории?\n'+x.full_name+' — '+x.prize_title+'\nПосле удаления повторное участие этого имени может стать доступным.'))return;
   deleteBtn.disabled=true;
   try{
    const {data,error}=await db.rpc('fortune_delete_spin',{p_spin_id:x.id});
    if(error)throw error;
    if(data!==true)throw Error('Запись не найдена или уже удалена');
    await loadHistory();renderAdmin();
    toast('Запись участника удалена');
   }catch(e){toast('Ошибка удаления: '+errorMessage(e));deleteBtn.disabled=false}
  };
  resultCell.append(resultName,view,deleteBtn);tr.append(resultCell);body.append(tr)
 });
 table.append(body);area.append(table)
}
$('addPrize').onclick=async()=>{if(!logged||spinning)return;
 let title=$('newTitle').value.trim();if(!title){toast('Введите название');return}if(prizes.filter(p=>!p.showcase_only).length>=30){toast('Максимум 30 секторов');return}
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
  needsReroll=false;person='';revealed=false;angle=0;draw();
  $('spin').disabled=false;$('spin').textContent='Крутить колесо ✦';
  closeReward();toast('История очищена. Удалено записей: '+data);
 }catch(e){toast('Ошибка: '+errorMessage(e)+'. Проверь supabase/clear_history.sql')}
 finally{btn.disabled=false}
};
window.addEventListener('resize',()=>{draw();if(!$('galleryOverlay').classList.contains('hidden'))renderGalleryWheel()});window.addEventListener('pageshow',()=>{$('adminPassword').value=''});$('adminPassword').value='';draw();
(async()=>{if(!db){prizes=PRIZE_CATALOG.map((p,i)=>({...p,id:'preview-'+i,showcase_only:true}));draw();$('spin').disabled=true;$('spin').textContent='Нет подключения к базе';toast('Нужно настроить Supabase URL и publishable key в supabase-config.js');return}
 try{await loadPrizes();await checkAdmin()}catch(e){toast('Ошибка подключения: '+errorMessage(e))}})();
