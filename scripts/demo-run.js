const {performance}=require('node:perf_hooks');
const {DEMO,stats}=require('../src/core');
const {demoAnswer}=require('../src/ai');
const {Store}=require('../src/db');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

async function run(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'copilot-demo-')),db=new Store(path.join(dir,'demo.sqlite'));
  const latencies=[];
  try{
    const session=db.createSession('Auto');
    for(const item of DEMO){
      const start=performance.now();db.addTurn(session,'question',item.question,'demo');
      const notes=db.search(item.question),response=demoAnswer({...item,notes});
      let first=null,assembled='';
      for(const chunk of response.match(/.{1,70}(?:\n|$)|.{1,70}/gs)||[response]){
        await new Promise(r=>setTimeout(r,28));if(first===null)first=performance.now();assembled+=chunk;
      }
      if(assembled!==response)throw new Error(`Demo stream mismatch: ${item.mode}`);
      db.addTurn(session,'answer',assembled,'copilot');
      latencies.push({mode:item.mode,first:Math.round(first-start),total:Math.round(performance.now()-start)});
    }
    if(db.turns(session).length!==DEMO.length*2)throw new Error('Session review incomplete');
    const first=stats(latencies.map(x=>x.first)),total=stats(latencies.map(x=>x.total));
    process.stdout.write(JSON.stringify({kind:'local deterministic demo',cases:latencies,finalToFirst:first,endToEnd:total,speechEndToFinal:'not measured; demo transcripts are injected'},null,2)+'\n');
  }finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
}
run().catch(e=>{process.stderr.write(e.stack+'\n');process.exitCode=1;});
