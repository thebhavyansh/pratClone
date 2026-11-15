const WebSocket=require('ws');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {spawn}=require('node:child_process');
const os=require('node:os');
const path=require('node:path');

async function call(ws,id,method,params){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`${method} timed out`)),30000);const onMessage=raw=>{const msg=JSON.parse(raw);if(msg.id!==id)return;clearTimeout(timer);ws.off('message',onMessage);if(msg.error)reject(new Error(msg.error.message));else resolve(msg.result);};ws.on('message',onMessage);ws.send(JSON.stringify({id,method,params}));});}
async function run(){
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const child=spawn(require('electron'),['.','--no-sandbox','--remote-debugging-port=9222'],{cwd:path.resolve(__dirname,'..'),env,stdio:['ignore','pipe','pipe']});
  let log='';child.stderr.on('data',x=>log+=x.toString());child.stdout.on('data',x=>log+=x.toString());
  const getTargets=()=>new Promise((resolve,reject)=>http.get('http://127.0.0.1:9222/json',res=>{let body='';res.on('data',x=>body+=x);res.on('end',()=>{try{resolve(JSON.parse(body));}catch(e){reject(e);}});}).on('error',reject));
  let page;
  for(let n=0;n<100;n++){try{page=(await getTargets()).find(x=>x.type==='page'&&x.title==='Interview Copilot');if(page)break;}catch{}if(child.exitCode!==null)throw new Error(`Electron exited: ${log}`);await new Promise(r=>setTimeout(r,100));}
  if(!page)throw new Error(`Electron did not start: ${log}`);
  const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
  try{
    const expression=`(async()=>{const config=await window.copilot.init();const wait=ms=>new Promise(r=>setTimeout(r,ms));for(let i=0;i<100&&!document.querySelector('#listen');i++)await wait(20);document.querySelector('#ask').click();return {buttons:[...document.querySelectorAll('main button')].map(x=>x.textContent.trim()),tabs:document.querySelectorAll('.tab').length,modes:document.querySelectorAll('#mode').length,answerVisible:!!document.querySelector('#answerOutput'),emptyQuestionMessage:document.querySelector('#activity').textContent,keySources:config.keySources,setupVisible:!document.querySelector('#keySetup').classList.contains('hidden')};})()`;
    const result=await call(ws,1,'Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);
    const value=result.result.value;
    assert.equal(value.tabs,0);assert.equal(value.modes,0);assert.equal(value.answerVisible,true);
    assert.deepEqual(value.buttons.slice(0,3),['Listen','Capture & solve','Ask']);
    assert.match(value.emptyQuestionMessage,/Enter a question/);
    const shot=await call(ws,2,'Page.captureScreenshot',{format:'png'});
    const screenshot=path.join(os.tmpdir(),'interview-copilot-smoke.png');fs.writeFileSync(screenshot,Buffer.from(shot.data,'base64'));
    process.stdout.write(JSON.stringify({result:'pass',...value,screenshot},null,2)+'\n');
  }finally{ws.close();child.kill();}
}
run().catch(error=>{process.stderr.write(error.stack+'\n');process.exitCode=1;});
