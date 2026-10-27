// v0.5 UI smoke test: node qa/browser_qa_v5.js (server on :8765 serving www/)
const {chromium}=require('playwright-core');const D=__dirname+'/screens_v05/';const R=[];const log=(...a)=>{const s=a.map(x=>typeof x=='string'?x:JSON.stringify(x)).join(' ');R.push(s);console.log(s)};
(async()=>{const b=await chromium.launch({executablePath:process.env.HOME+'/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'});
for(const [tag,w,h] of [['portrait',390,844],['landscape',844,390],['small',320,568]]){
 const pg=await b.newPage({viewport:{width:w,height:h},hasTouch:true,isMobile:true,deviceScaleFactor:2});const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()=='error'&&errs.push(m.text()));
 await pg.goto('http://localhost:8765/?v5qa'+tag);await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.waitForTimeout(500);
 const btn=async id=>(await pg.evaluate(()=>__hs.buttons().map(b=>({id:b.id,x:b.x+b.w/2,y:b.y+b.h/2})))).find(b=>b.id==id);
 const B=async id=>{const t=await btn(id);if(!t){log(tag,'MISSING button',id);return false}await pg.mouse.click(t.x,t.y);await pg.waitForTimeout(80);return true};
 const W=async(x,y)=>pg.evaluate(([x,y])=>{const c=__hs.cam;return[(x+.5-c.x)*c.z+innerWidth/2,(y+.5-c.y)*c.z+innerHeight/2]},[x,y]);
 const shot=n=>pg.screenshot({path:D+`${tag}_${n}.png`});
 await shot('01_start');
 const j0=await pg.evaluate(()=>__hs.S.jobs.length);await B('cat:dig');await pg.mouse.click(40,40);log(tag,'HUD tap jobs created',(await pg.evaluate(()=>__hs.S.jobs.length))-j0);
 let p=await W(39,22);await pg.mouse.click(p[0],p[1]);log(tag,'dig via tap queued',await pg.evaluate(()=>__hs.S.jobs.some(j=>j.type=='dig'&&j.x==39&&j.y==22)));
 for(const c of['base','oxy','food','power','care','tools','menu']){await B('cat:'+c);await shot('02_menu_'+c);await B('cat:'+c)}
 await B('cat:oxy');await B('aerator');p=await W(25,24);await pg.mouse.click(p[0],p[1]);await B('cat:power');await B('dynamo');p=await W(35,24);await pg.mouse.click(p[0],p[1]);
 log(tag,'builds queued',await pg.evaluate(()=>__hs.S.jobs.filter(j=>j.type=='build').map(j=>j.bt)));
 await B('cat:tools');await B('inspect');p=await W(30,21);await pg.mouse.click(p[0],p[1]);await shot('03_inspector_tile');log(tag,'inspector',await pg.evaluate(()=>__hs.insp));
 const c0=await pg.evaluate(()=>{const c=__hs.S.cols[0];return[Math.round(c.x),Math.round(c.y)]});p=await W(c0[0],c0[1]);await pg.mouse.click(p[0],p[1]);await shot('04_inspector_settler');
 for(let k=1;k<=3;k++){await B('ovl:'+k);await shot('05_overlay'+k)}await B('ovl:0');
 await B('cat:menu');await B('research');await shot('06_research');await B('tech:vat');await B('research');
 await pg.evaluate(([w,h])=>{const c=document.getElementById('c');const ev=(t,id,x,y)=>c.dispatchEvent(new PointerEvent(t,{pointerId:id,clientX:x,clientY:y,bubbles:true,pointerType:'touch'}));
  ev('pointerdown',11,w/2-20,h/2);ev('pointerdown',12,w/2+20,h/2);for(let k=1;k<=8;k++){ev('pointermove',11,w/2-20-k*6,h/2);ev('pointermove',12,w/2+20+k*6,h/2)}ev('pointerup',11,0,0);ev('pointerup',12,0,0)},[w,h]);
 log(tag,'pinch zoom ->',(await pg.evaluate(()=>__hs.cam.z)).toFixed(1));
 await B('s3');await pg.waitForTimeout(8000);await shot('07_busy_4x');log(tag,'fps at 4x',(await pg.evaluate(()=>__hs.fps)).toFixed(1),'time',await pg.evaluate(()=>__hs.S.time|0));
 await pg.evaluate(()=>{const S=__hs.S;for(let i=0;i<S.o2.length;i++)S.o2[i]*=0.15});await pg.waitForTimeout(2500);await shot('08_low_air');
 await pg.evaluate(()=>{__hs.S.cols.forEach(c=>c.breath=0.01);__hs.S.o2.fill(0)});await pg.waitForTimeout(1500);await shot('09_game_over');log(tag,'over',await pg.evaluate(()=>__hs.S.over));
 await B('restart');log(tag,'new colony save time',await pg.evaluate(()=>JSON.parse(localStorage.hsSave).time|0));
 await pg.evaluate(()=>{__hs.S.time=__hs.HS.WIN_CYCLES*__hs.HS.CYCLE-0.5});await pg.waitForTimeout(1200);await shot('10_victory');log(tag,'won',await pg.evaluate(()=>__hs.S.won));
 log(tag,'JS errors',errs);await pg.close()}
await b.close();require('fs').writeFileSync(__dirname+'/browser_qa_v5_output.txt',R.join('\n'))})();
