'use strict';
/*
  MAN SELEEC — Microsoft Store PWA
  IMPORTANT: Before publishing, create FOUR DURABLE (non-consumable) add-ons
  in Partner Center and set their exact Product IDs below. Do not use Store IDs.
  This is a client-side Store entitlement integration, NOT independent server verification.
*/
const BILLING='https://store.microsoft.com/billing';
const LEVELS=[
  {name:'ROOKIE SKY',subtitle:'Gentle winds · Wide gaps',price:'FREE',sku:null,speed:2.4,gap:218,rate:94,distance:3000,colors:['#163e66','#0a1c39']},
  {name:'CLOUD RUN',subtitle:'More traffic · Faster skies',price:'$0.99',sku:'manseleec_level2',speed:3.3,gap:184,rate:77,distance:4000,colors:['#1b5876','#0a2b49']},
  {name:'STORM RIDER',subtitle:'Tight gaps · High winds',price:'$4.99',sku:'manseleec_level3',speed:4.25,gap:158,rate:65,distance:4700,colors:['#453c78','#151e48']},
  {name:'NIGHT FURY',subtitle:'Quick reflexes required',price:'$6.99',sku:'manseleec_level4',speed:5.25,gap:138,rate:56,distance:5300,colors:['#3d355c','#100e2c']},
  {name:'ACE OF SKIES',subtitle:'Extreme flight challenge',price:'$9.99',sku:'manseleec_level5',speed:6.2,gap:122,rate:48,distance:6200,colors:['#73314b','#200d24']}
];
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const W=420,H=680,STORE_KEY='man-seleec-v1';
let best=Number(localStorage.getItem(STORE_KEY+'-best')||0),selected=0,store=null,storeItems=new Map(),owned=new Set(),checking=false,buying=false;
let state='menu',level=0,playerX=W/2,targetX=W/2,progress=0,score=0,spawnTick=0,obstacles=[],particles=[],stars=[],frame=0,last=0;
$('best').textContent=best;
for(let i=0;i<55;i++)stars.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.7+.3,s:Math.random()*1.6+.5});
function showNotice(t){$('notice').textContent=t||''}
function money(item,fallback){try{return new Intl.NumberFormat('en-US',{style:'currency',currency:item.price.currency}).format(Number(item.price.value))}catch{return fallback}}
function isOwned(i){return i===0||owned.has(LEVELS[i].sku)}
function drawMenu(){
  $('levels').replaceChildren();
  LEVELS.forEach((l,i)=>{
    const b=document.createElement('button');b.type='button';b.className='level'+(selected===i?' selected':'');
    const left=document.createElement('span');left.className='level-info';
    const title=document.createElement('span');title.className='level-title';title.textContent=`${String(i+1).padStart(2,'0')} · ${l.name}`;
    const desc=document.createElement('span');desc.className='level-desc';desc.textContent=l.subtitle;
    left.append(title,desc);
    const tag=document.createElement('span');tag.className='level-tag'+(!isOwned(i)?' locked':'');
    tag.textContent=i===0?'FREE':isOwned(i)?'✓ UNLOCKED':`🔒 ${money(storeItems.get(l.sku),l.price)}`;
    b.append(left,tag);b.onclick=()=>{selected=i;drawMenu();showNotice('')};$('levels').append(b)
  });
  $('actions').replaceChildren();
  const main=document.createElement('button');main.className='primary';
  if(isOwned(selected)){main.textContent='START FLIGHT';main.onclick=()=>startFlight(selected)}
  else{main.textContent=`UNLOCK · ${money(storeItems.get(LEVELS[selected].sku),LEVELS[selected].price)}`;main.disabled=buying||checking||!storeItems.has(LEVELS[selected].sku);main.onclick=()=>buyLevel(selected)}
  $('actions').append(main);
  const restore=document.createElement('button');restore.className='secondary';restore.textContent=checking?'CHECKING PURCHASES…':'RESTORE PURCHASES';restore.disabled=checking||buying;restore.onclick=()=>refreshPurchases(true);$('actions').append(restore);
  $('heading').textContent='Choose Your Flight';$('subheading').textContent='Dodge the barriers. Reach the finish line. Unlock harder skies.';
  $('eyebrow').textContent='FLIGHT ACADEMY';$('panel').hidden=false;$('hud').hidden=true;$('pause').hidden=true;
}
async function connectStore(){
  if(!window.getDigitalGoodsService||!window.PaymentRequest){
    showNotice('Open the Microsoft Store installed app to buy paid levels.');
    return;
  }
  try{
    store=await window.getDigitalGoodsService(BILLING);
    if(!store)throw Error('Store billing is unavailable.');
    // Fetch each product separately. An unavailable add-on must not block
    // the purchase button for other published add-ons.
    const tasks=LEVELS.slice(1).map(async l=>{
      try{
        const details=await store.getDetails([l.sku]);
        const item=details.find(x=>x.itemId===l.sku);
        if(item){storeItems.set(l.sku,item);drawMenu();}
      }catch(e){console.warn('Could not load add-on '+l.sku,e);}
    });
    // Ownership checks are independent of product-detail loading.
    const ownership=refreshPurchases(false);
    await Promise.allSettled([...tasks,ownership]);
    if(storeItems.size!==4){
      showNotice('Some paid levels are not available yet. Available levels can still be purchased.');
    }
  }catch(e){showNotice('Microsoft Store unavailable: '+e.message)}
  drawMenu();
}
async function refreshPurchases(manual){
  if(!store){if(manual)showNotice('Open Man Seleec from Microsoft Store on Windows to restore purchases.');return}
  checking=true;drawMenu();
  try{
    const purchases=await store.listPurchases();
    // Durable purchases are not consumed. The Store is the source of entitlement.
    owned=new Set(purchases.map(p=>p.itemId).filter(id=>LEVELS.some(l=>l.sku===id)));
    if(manual)showNotice('Purchase status refreshed from Microsoft Store.');
  }catch(e){showNotice('Could not check purchases: '+e.message)}
  finally{checking=false;drawMenu()}
}
async function buyLevel(i){
  const l=LEVELS[i],item=storeItems.get(l.sku);
  if(!store||!item||buying)return;
  buying=true;drawMenu();showNotice('Opening secure Microsoft Store checkout…');
  let response=null;
  try{
    const req=new PaymentRequest([{supportedMethods:BILLING,data:{sku:item.itemId}}]);
    response=await req.show();
    // Completing the payment UI is not the same as granting ownership.
    await response.complete('success');response=null;
    showNotice('Checking purchase with Microsoft Store…');
    await refreshPurchases(false);
    if(owned.has(l.sku)){selected=i;showNotice('Flight unlocked! You can now play this level.')}
    else showNotice('Payment window closed. Unlock not yet confirmed. Use RESTORE PURCHASES to check again.');
  }catch(e){
    if(response)try{await response.complete('fail')}catch{}
    showNotice('Checkout was canceled or unavailable: '+e.message);
  }finally{buying=false;drawMenu()}
}
function startFlight(i){if(!isOwned(i))return;level=i;state='playing';progress=0;score=0;spawnTick=0;obstacles=[];particles=[];playerX=W/2;targetX=W/2;$('panel').hidden=true;$('hud').hidden=false;$('pause').hidden=false;$('levelName').textContent=LEVELS[i].name;$('progress').textContent='0%'}
function endFlight(win){state='menu';$('panel').hidden=false;$('hud').hidden=true;$('pause').hidden=true;$('levels').replaceChildren();$('actions').replaceChildren();$('eyebrow').textContent=win?'MISSION COMPLETE':'AIRCRAFT LOST';$('heading').textContent=win?'FLIGHT CLEARED!':'FLIGHT FAILED';$('subheading').textContent=win?`You mastered ${LEVELS[level].name}. Score: ${score}.`:`Score: ${score}. Try again and dodge the barriers.`;const retry=document.createElement('button');retry.className='primary';retry.textContent='TRY AGAIN';retry.onclick=()=>startFlight(level);const menu=document.createElement('button');menu.className='secondary';menu.textContent='SELECT LEVEL';menu.onclick=()=>{selected=level;drawMenu()};$('actions').append(retry,menu);showNotice('');if(score>best){best=score;localStorage.setItem(STORE_KEY+'-best',String(best));$('best').textContent=best}}
function pauseGame(){if(state==='playing'){state='paused';$('panel').hidden=false;$('eyebrow').textContent='FLIGHT PAUSED';$('heading').textContent='Take a Break';$('subheading').textContent='Your aircraft is holding position.';$('levels').replaceChildren();$('actions').replaceChildren();const b=document.createElement('button');b.className='primary';b.textContent='RESUME';b.onclick=()=>{state='playing';$('panel').hidden=true};const m=document.createElement('button');m.className='secondary';m.textContent='EXIT TO MENU';m.onclick=()=>{state='menu';drawMenu()};$('actions').append(b,m);$('pause').hidden=true}else if(state==='paused'){state='playing';$('panel').hidden=true;$('pause').hidden=false}}
$('pause').onclick=pauseGame;
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight',' ','Escape'].includes(e.key))e.preventDefault();if(e.key==='Escape'){pauseGame();return}if(state==='playing'){if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')targetX-=40;if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')targetX+=40;targetX=Math.max(23,Math.min(W-23,targetX))}});
function pointer(e){const r=canvas.getBoundingClientRect();targetX=Math.max(23,Math.min(W-23,(e.clientX-r.left)*W/r.width))}canvas.addEventListener('pointerdown',pointer);canvas.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')pointer(e)});
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawPlane(x,y){ctx.save();ctx.translate(x,y);ctx.shadowColor='#58f6ff';ctx.shadowBlur=16;ctx.fillStyle='#d9faff';ctx.beginPath();ctx.moveTo(0,-31);ctx.lineTo(11,-2);ctx.lineTo(28,12);ctx.lineTo(28,21);ctx.lineTo(8,16);ctx.lineTo(6,30);ctx.lineTo(15,35);ctx.lineTo(15,40);ctx.lineTo(0,35);ctx.lineTo(-15,40);ctx.lineTo(-15,35);ctx.lineTo(-6,30);ctx.lineTo(-8,16);ctx.lineTo(-28,21);ctx.lineTo(-28,12);ctx.lineTo(-11,-2);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#26a7cf';roundRect(-5,-14,10,24,5);ctx.fill();ctx.fillStyle='#64efff';ctx.fillRect(-18,18,7,4);ctx.fillRect(11,18,7,4);ctx.restore()}
function draw(t){const dt=Math.min((t-last)/16.667||1,2);last=t;frame+=dt;const l=LEVELS[level];const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,l.colors[0]);grad.addColorStop(1,l.colors[1]);ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  for(const s of stars){s.y+=s.s*dt*(state==='playing'?l.speed/2:0.7);if(s.y>H){s.y=-4;s.x=Math.random()*W}ctx.fillStyle='#c9f8ff99';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()}
  ctx.strokeStyle='#ffffff16';ctx.lineWidth=1;for(let x=60;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
  if(state==='playing'){
    playerX+=(targetX-playerX)*Math.min(.2*dt,1);progress+=l.speed*dt;spawnTick+=dt;
    if(spawnTick>=l.rate){spawnTick=0;const gap=l.gap;const center=gap/2+25+Math.random()*(W-gap-50);obstacles.push({y:-38,center,gap,scored:false})}
    for(const o of obstacles){o.y+=l.speed*2.15*dt;if(!o.scored&&o.y>H-110){o.scored=true;score+=100}const near=Math.abs(o.y-(H-112))<31;const left=o.center-o.gap/2,right=o.center+o.gap/2;if(near&&(playerX-17<left||playerX+17>right)){endFlight(false);break}}
    obstacles=obstacles.filter(o=>o.y<H+60);
    $('progress').textContent=Math.min(100,Math.floor(progress/l.distance*100))+'%';if(progress>=l.distance)endFlight(true)
  }
  for(const o of obstacles){const left=o.center-o.gap/2,right=o.center+o.gap/2;ctx.shadowColor='#ff5b8b';ctx.shadowBlur=12;ctx.fillStyle='#ff5c83';roundRect(0,o.y,left,27,6);ctx.fill();roundRect(right,o.y,W-right,27,6);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#ffc0cd';ctx.fillRect(Math.max(0,left-7),o.y,7,27);ctx.fillRect(right,o.y,7,27);ctx.fillStyle='#ffddab';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('◆',o.center,o.y+20)}
  drawPlane(playerX,H-112);ctx.fillStyle='#ffffffb0';ctx.font='bold 12px system-ui';ctx.textAlign='left';if(state==='playing')ctx.fillText('SCORE '+score,16,H-20);requestAnimationFrame(draw)
}
drawMenu();requestAnimationFrame(draw);connectStore();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
