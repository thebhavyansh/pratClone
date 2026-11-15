const {contextBridge,ipcRenderer}=require('electron');
const invoke=(name,...args)=>ipcRenderer.invoke(name,...args);
const listen=(channel,callback)=>{const fn=(_event,payload)=>callback(payload);ipcRenderer.on(channel,fn);return ()=>ipcRenderer.removeListener(channel,fn);};
contextBridge.exposeInMainWorld('copilot',Object.freeze({
  init:()=>invoke('init'),windowAction:a=>invoke('window:action',a),copyText:t=>invoke('clipboard:write',t),
  listNotes:()=>invoke('notes:list'),saveNote:n=>invoke('notes:save',n),deleteNote:id=>invoke('notes:delete',id),importNote:()=>invoke('notes:import'),
  saveSettings:s=>invoke('settings:save',s),
  prepareSystemAudio:()=>invoke('audio:prepare'),startAudio:s=>invoke('audio:start',s),sendAudio:(s,b)=>invoke('audio:chunk',s,b),pauseAudio:v=>invoke('audio:pause',v),stopAudio:()=>invoke('audio:stop'),
  captureSources:()=>invoke('capture:sources'),selectCapture:(id,audio)=>invoke('capture:select',id,audio),
  ask:data=>invoke('answer:ask',data),captureAndSolve:question=>invoke('capture:solve',question),cancelAnswer:()=>invoke('answer:cancel'),
  listSessions:()=>invoke('sessions:list'),openSession:id=>invoke('sessions:open',id),newSession:mode=>invoke('sessions:new',mode),deleteSession:id=>invoke('sessions:delete',id),exportSession:id=>invoke('sessions:export',id),generateFeedback:id=>invoke('sessions:feedback',id),metrics:()=>invoke('metrics:get'),runDemo:i=>invoke('demo:run',i),
  onAnswer:cb=>listen('answer:event',cb),onAudio:cb=>listen('audio:event',cb),onSession:cb=>listen('session:event',cb),onSettings:cb=>listen('settings:event',cb),onShortcut:cb=>listen('shortcut',cb)
}));
