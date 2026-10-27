// node qa/browser_qa.js  (needs a server on :8765 serving www/)
const {chromium}=require('playwright-core');const D=__dirname+'/screens/';const R=[];const log=(...a)=>{const s=a.map(x=>typeof x=='string'?x:JSON.stringify(x)).join(' ');R.push(s);console.log(s)};
(async()=>{const b=await chromium.launch({executablePath:process.env.HOME+'/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'});
for(const [tag,w,h] of [['portrait',390,844],['landscape',844,390],['small',320,568]]){
 const pg=await b.newPage({viewport:{width:w,height:h},hasTouch:true,isMobile:true,deviceScaleFactor:2});const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()=='error'&&errs.push(m.text()));
 await pg.goto('http://localhost:8765/?qa'+tag);await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.waitForTimeout(400);
 const btn=async id=>(await pg.evaluate(()=>__hs.buttons().map(b=>({id:b.id,x:b.x+b.w/2,y:b.y+b.h/2,w:b.w}))) ).find(b=>b.id==id);
 const B=async id=>{const t=await btn(id);if(!t){log(tag,'button not visible:',id);return false}await pg.mouse.click(t.x,t.y);await pg.waitForTimeout(60);return true};
 const shot=async n=>pg.screenshot({path:D+`${tag}_${n}.png`});
 await shot('01_start');
 // HUD tap passes through to world?
 const j0=await pg.evaluate(()=>__hs.S.jobs.length);await pg.mouse.click(60,40);const j1=await pg.evaluate(()=>__hs.S.jobs.length);log(tag,'tap on HUD panel created job(s):',j1-j0);
 // overlays
 for(let k=1;k<=3;k++){await B('ovl');await shot('02_overlay'+k)}await B('ovl');
 await B('research');await shot('03_research');await B('tech:vat');await B('research');
 // toolbar scroll to end
 const ty=h-30;await pg.mouse.move(w-10,ty);await pg.mouse.down();await pg.mouse.move(10,ty,{steps:8});await pg.mouse.up();await shot('04_toolbar_scrolled');
 const vis=await pg.evaluate(()=>__hs.buttons().filter(b=>b.tb).map(b=>b.id));log(tag,'tool buttons visible after scroll:',vis);
 // pinch zoom via synthetic pointer events
 const z0=await pg.evaluate(()=>__hs.cam.z);
 await pg.evaluate(([w,h])=>{const c=document.getElementById('c');const ev=(t,id,x,y)=>c.dispatchEvent(new PointerEvent(t,{pointerId:id,clientX:x,clientY:y,bubbles:true,pointerType:'touch'}));
  ev('pointerdown',1,w/2-20,h/2);ev('pointerdown',2,w/2+20,h/2);for(let k=1;k<=10;k++){ev('pointermove',1,w/2-20-k*8,h/2);ev('pointermove',2,w/2+20+k*8,h/2)}ev('pointerup',1,w/2-100,h/2);ev('pointerup',2,w/2+100,h/2)},[w,h]);
 const z1=await pg.evaluate(()=>__hs.cam.z);const jp=await pg.evaluate(()=>__hs.S.jobs.length);log(tag,'pinch zoom',z0.toFixed(1),'->',z1.toFixed(1),'jobs after pinch (should be unchanged)',jp);await shot('05_pinched');
 // queue lots of jobs + run fast
 await pg.evaluate(()=>{const S=__hs.S;for(let x=20;x<40;x++)__hs.HS.addJob('dig',x,25,0,5);__hs.HS.addJob('build',27,24,3,5)});await B('s3');await pg.waitForTimeout(8000);await shot('06_busy_4x');
 // low-air state
 await pg.evaluate(()=>{const S=__hs.S;for(let i=0;i<S.o2.length;i++)S.o2[i]*=0.1});await pg.waitForTimeout(3000);await shot('07_low_air');
 await pg.waitForTimeout(15000);const over=await pg.evaluate(()=>__hs.S.over);await shot('08_game_over');log(tag,'game over reached',over);
 if(tag=='portrait'){
  // save state after over: reload loads what?
  const saved=await pg.evaluate(()=>localStorage.hsSave?JSON.parse(localStorage.hsSave).time|0:null);await pg.reload();await pg.waitForTimeout(500);
  const after=await pg.evaluate(()=>({t:__hs.S.time|0,over:__hs.S.over,alive:__hs.S.cols.filter(c=>c.alive).length}));
  await pg.evaluate(()=>{__hs.S.time=200});await B('save');log(tag,'reload after death: autosave time',saved,'loaded',after);
  await pg.evaluate(()=>{const S=__hs.S;S.o2.fill(0)});await pg.waitForTimeout(20000);const o2=await pg.evaluate(()=>({over:__hs.S.over,alive:__hs.S.cols.filter(c=>c.alive).length}));log(tag,'20s after reload',o2);
  if(o2.over){await B('restart');const n=await pg.evaluate(()=>({t:__hs.S.time,over:__hs.S.over}));log(tag,'new colony',n);await pg.reload();await pg.waitForTimeout(400);log(tag,'reload right after New colony loads',await pg.evaluate(()=>({t:__hs.S.time|0,over:__hs.S.over})))}
  // corrupt save
  await pg.evaluate(()=>localStorage.hsSave='{bad json');await pg.reload();await pg.waitForTimeout(400);log(tag,'corrupt save -> errors?',errs.slice(-2),'game running',await pg.evaluate(()=>!!__hs.S.cols));await shot('09_corrupt_save');
 }
 // label clipping: measure text vs button width
 const clip=await pg.evaluate(()=>{const c=document.getElementById('c').getContext('2d');return __hs.buttons().filter(b=>b.l).map(b=>{c.font='bold '+(b.w<70?11:13)+'px system-ui';return [b.id,Math.round(c.measureText(b.l).width),Math.round(b.w)]}).filter(([i,t,w])=>t>w-4)});log(tag,'labels wider than their button',clip);
 log(tag,'JS errors',errs);await pg.close()}
await b.close();require('fs').writeFileSync(__dirname+'/browser_qa_output.txt',R.join('\n'))})();
