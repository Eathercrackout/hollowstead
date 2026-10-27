// Competent-player script for v0.4 (uses only player-available actions). node qa/competent_v4.js [seconds]
const HS=require('../www/sim.js');const I=HS.idx,cx=30,cy=22;const DUR=+(process.argv[2]||2700);const out=[];const log=s=>{out.push(s);console.log(s)};
function play(seed){const S=HS.newGame(seed);const bl=new Set();const B=(bt,x,y,p=6)=>HS.addJob('build',x,y,bt,p);
 const frontier=(pred,max,pri)=>{let n=0;const c=[];for(let y=1;y<HS.H-1;y++)for(let x=1;x<HS.W-1;x++){const i=I(x,y);if(!S.t[i]||S.t[i]==4||bl.has(i)||!pred(x,y,S.t[i]))continue;if([[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>!S.t[I(x+a,y+b)]))c.push([Math.hypot(x-cx,y-cy),x,y])}
  c.sort((a,b)=>a[0]-b[0]);for(const[,x,y]of c){if(n>=max)break;if(HS.addJob('dig',x,y,0,pri))n++}};
 B(2,cx-5,cy+2,8);B(3,cx-2,cy+2,7);B(4,cx+5,cy+2,7);
 const o2s=[],stats={minO2:9,minLate:9,deaths:[],brk:0};let lastLog=0;
 for(let i=0;i<DUR*20&&!S.over;i++){HS.step(.05);if(i%200)continue;const t=i/20;
  for(const j of [...S.jobs])if(j.unr&&j.type=='dig'){bl.add(I(j.x,j.y));HS.cancelAt(j.x,j.y)}      // player sees red ✕ and cancels
  if(S.jobs.filter(j=>j.type=='dig').length<5)frontier((x,y)=>y>=cy-3&&y<=cy+2,5,5);
  if(t>60&&S.farms.length<3)for(const x of[cx-3,cx-1,cx+1])B(3,x,cy+2,7);
  if(t>90&&!S.misc.some(m=>m.bt==HS.B_DESK))B(HS.B_DESK,cx+7,cy+2,7);
  if(!S.rs.cur)for(const k of['scrub','vat','medcot','couch','cooler'])if(HS.pickTech(k))break;
  if(t>45&&S.misc.filter(m=>m.bt==HS.B_SCRUB).length<1)B(HS.B_SCRUB,cx-7,cy+2,8);
  if(S.rs.done.vat&&S.misc.filter(m=>m.bt==HS.B_VAT).length<1)B(HS.B_VAT,cx+3,cy+2,8);
  if(S.rs.done.vat&&S.dyn.length<2&&S.res.stone>=8)B(HS.B_DYNAMO,cx+4,cy+2,7);
  if(S.rs.done.medcot&&!S.misc.some(m=>m.bt==HS.B_COT))B(HS.B_COT,cx+8,cy+2,6);
  if(S.rs.done.couch&&!S.misc.some(m=>m.bt==HS.B_COUCH))B(HS.B_COUCH,cx-8,cy+2,6);
  let o=0,c=0;for(let x=cx-8;x<=cx+8;x++)for(let y=cy-3;y<=cy+2;y++){o+=S.o2[I(x,y)];c+=S.co2[I(x,y)]}o/=102;c/=102;
  stats.minO2=Math.min(stats.minO2,o);if(t>=600)stats.minLate=Math.min(stats.minLate,o);
  if(t-lastLog>=600||t==0){lastLog=t;log(`  [${seed}] t=${t}s roomO2=${o.toFixed(2)} roomCO2=${c.toFixed(2)} stone=${S.res.stone|0} lichen=${S.res.lichen|0} food=${S.res.food|0} bat=${S.bat|0} bld=${S.misc.map(m=>m.bt)} research=${Object.keys(S.rs.done)} cols=${S.cols.map(c=>c.alive?`${c.state}/air${c.breath|0}/st${c.st|0}`:'DEAD')}`)}}
 stats.brk=S.log.filter(l=>l.includes('breakdown')).length;stats.deaths=S.log.filter(l=>/suffoc|died/.test(l));
 log(`RESULT seed ${seed}: t=${S.time|0}s alive=${S.cols.filter(c=>c.alive).length}/3 won=${!!S.won} minRoomO2=${stats.minO2.toFixed(2)} minRoomO2(after 10min)=${stats.minLate.toFixed(2)} breakdowns=${stats.brk} deaths=${JSON.stringify(stats.deaths)}`);return S}
for(const seed of [42,7,123])play(seed);
for(const seed of [42,7,123]){HS.newGame(seed);for(let i=0;i<20*3600&&!HS.S.over;i++)HS.step(.05);log(`UNATTENDED seed ${seed}: over=${HS.S.over} at t=${HS.S.time|0}s won=${!!HS.S.won}`)}
require('fs').writeFileSync(__dirname+'/competent_v4_output.txt',out.join('\n'));
