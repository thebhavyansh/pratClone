const api=window.copilot;
const $=id=>document.getElementById(id);
const state={answer:'',listening:false,starting:false,stream:null,recorder:null,hasGemini:false,hasDeepgram:false};

function activity(message){$('activity').textContent=message||'';}
function setListening(value){state.listening=value;$('listen').textContent=value?'Stop listening':'Listen';$('listenStatus').textContent=value?'Listening · Windows system audio':'Ready · Windows system audio';$('listenStatus').classList.toggle('live',value);}
function renderAnswer(){
  const host=$('answerOutput');host.replaceChildren();
  if(!state.answer){const p=document.createElement('p');p.className='empty';p.textContent='Your full answer will appear here.';host.append(p);return;}
  const parts=state.answer.replace(/^DETAILS\s*$/gm,'').split(/(```[\s\S]*?```)/g);
  for(const part of parts){if(!part)continue;
    if(part.startsWith('```')){const pre=document.createElement('pre');pre.textContent=part.replace(/^```[^\n]*\n?/,'').replace(/```$/,'');host.append(pre);continue;}
    for(const block of part.split(/\n\s*\n/)){if(!block.trim())continue;const heading=/^#{1,4}\s+(.+)$/.exec(block.trim());const node=document.createElement(heading?'h3':'p');node.textContent=heading?heading[1]:block.trim();host.append(node);}
  }
}
async function ask(){const question=$('question').value.trim();if(!question){activity('Enter a question first');return;}try{activity('Solving…');await api.ask({question,mode:'Auto'});}catch(error){activity(error.message);}}
async function capture(){try{$('capture').disabled=true;activity('Solving…');await api.captureAndSolve('');}catch(error){activity(error.message);}finally{$('capture').disabled=false;}}
function onAnswer(event){
  if(event.type==='start'){state.answer='';$('question').value=event.question;renderAnswer();activity('Solving…');}
  else if(event.type==='chunk'){state.answer+=event.text;renderAnswer();}
  else if(event.type==='done')activity('');
  else if(event.type==='error')activity(event.message);
  else if(event.type==='canceled')activity('');
}
function onAudio(event){
  if(event.type==='listening')setListening(true);
  else if(event.type==='stopped'){setListening(false);$('interim').textContent='';}
  else if(event.type==='interim')$('interim').textContent=event.text;
  else if(event.type==='final'){$('interim').textContent=event.text;$('question').value=event.text;}
  else if(event.type==='error')activity(event.message);
  else if(event.type==='closed'&&state.listening){activity('Audio connection closed');stopListening().catch(error=>activity(error.message));}
}
function stopTracks(){if(state.recorder&&state.recorder.state!=='inactive')state.recorder.stop();state.recorder=null;state.stream?.getTracks().forEach(track=>track.stop());state.stream=null;}
async function stopListening(){stopTracks();state.starting=false;setListening(false);await api.stopAudio();}
async function startListening(){
  if(state.starting||state.listening)return;
  state.starting=true;
  try{
    if(!state.hasDeepgram)throw new Error('Add your Deepgram API key to use Listen');
    await api.prepareSystemAudio();
    const stream=await navigator.mediaDevices.getDisplayMedia({audio:true,video:true});
    state.stream=stream;
    stream.getVideoTracks().forEach(track=>{track.enabled=false;});
    if(!stream.getAudioTracks().length)throw new Error('Windows system audio is unavailable. Check capture permissions and try again.');
    stream.getAudioTracks()[0].onended=()=>stopListening().catch(error=>activity(error.message));
    await api.startAudio(['system']);
    const mime=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':'';
    const recorder=new MediaRecorder(new MediaStream(stream.getAudioTracks()),mime?{mimeType:mime}:undefined);
    recorder.ondataavailable=async event=>{if(!event.data.size)return;try{await api.sendAudio('system',new Uint8Array(await event.data.arrayBuffer()));}catch(error){activity(error.message);}};
    recorder.start(250);state.recorder=recorder;setListening(true);activity('');
  }catch(error){stopTracks();setListening(false);activity(error.message);await api.stopAudio().catch(()=>{});}
  finally{state.starting=false;}
}
async function saveKeys(){
  const gemini=$('geminiKey').value.trim(),deepgram=$('deepgramKey').value.trim();
  if(!gemini&&!deepgram){activity('Enter a key to save');return;}
  try{const result=await api.saveSettings({...gemini?{geminiKey:gemini}:{},...deepgram?{deepgramKey:deepgram}:{}});state.hasGemini=result.hasGemini;state.hasDeepgram=result.hasDeepgram;$('geminiKey').value='';$('deepgramKey').value='';$('keySetup').classList.toggle('hidden',state.hasGemini&&state.hasDeepgram);activity('Keys saved');}catch(error){activity(error.message);}
}
async function init(){const config=await api.init();state.hasGemini=config.hasGemini;state.hasDeepgram=config.hasDeepgram;$('keySetup').classList.toggle('hidden',config.hasGemini&&config.hasDeepgram);if(!config.hasGemini)activity('Add your Gemini key for answers');}
$('minimize').onclick=()=>api.windowAction('minimize');
$('close').onclick=()=>api.windowAction('close');
$('listen').onclick=()=>state.listening?stopListening().catch(error=>activity(error.message)):startListening();
$('capture').onclick=capture;
$('ask').onclick=ask;
$('saveKeys').onclick=saveKeys;
$('question').addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();ask();}});
api.onAnswer(onAnswer);api.onAudio(onAudio);
api.onShortcut(action=>{if(action==='listen')state.listening?stopListening():startListening();if(action==='screenshot')capture();if(action==='ask')ask();if(action==='stop')stopListening();});
init().catch(error=>activity(error.message));
