const WebSocket=require('ws');
class TranscriptAssembler {
  constructor(source,onEvent){this.source=source;this.onEvent=onEvent;this.parts=[];this.seen=new Set();this.endSeconds=null;}
  consume(msg){
    if(msg.type==='UtteranceEnd'){this.flush();return;}
    const t=msg.channel?.alternatives?.[0]?.transcript?.trim();if(!t)return;
    if(msg.is_final){
      const key=`${msg.start}:${msg.duration}:${t}`;
      if(!this.seen.has(key)){this.seen.add(key);this.parts.push(t);if(Number.isFinite(msg.start)&&Number.isFinite(msg.duration))this.endSeconds=msg.start+msg.duration;if(this.seen.size>1000)this.seen.delete(this.seen.values().next().value);}
      if(msg.speech_final)this.flush();
    }else this.onEvent({type:'interim',source:this.source,text:t});
  }
  flush(){const text=this.parts.join(' ').trim(),endSeconds=this.endSeconds;this.parts=[];this.endSeconds=null;if(text)this.onEvent({type:'final',source:this.source,text,at:Date.now(),endSeconds});}
}
class Transcriber {
  constructor(onEvent){this.onEvent=onEvent;this.streams=new Map();}
  start(source,key){
    this.stop(source);
    if(!['microphone','system'].includes(source)) throw new Error('Invalid audio source');
    if(!key) throw new Error('Deepgram API key required');
    const url='wss://api.deepgram.com/v1/listen?model=nova-3&interim_results=true&endpointing=300&utterance_end_ms=1000&smart_format=true';
    const ws=new WebSocket(url,{headers:{Authorization:`Token ${key}`}});
    const state={ws,assembler:new TranscriptAssembler(source,this.onEvent),ready:false,pending:[],pendingBytes:0}; this.streams.set(source,state);
    ws.on('open',()=>{state.ready=true;for(const chunk of state.pending)ws.send(chunk);state.pending=[];state.pendingBytes=0;this.onEvent({type:'ready',source});});
    ws.on('message',raw=>{
      let msg;try{msg=JSON.parse(raw.toString());}catch{return;}
      if(msg.type==='Error'){this.onEvent({type:'error',source,message:msg.description||'Speech provider error'});return;}
      state.assembler.consume(msg);
    });
    ws.on('error',()=>this.onEvent({type:'error',source,message:'Speech connection failed'}));
    ws.on('close',()=>{if(this.streams.get(source)===state)this.onEvent({type:'closed',source});});
  }
  send(source,buffer){const state=this.streams.get(source);if(!state)return;if(state.ready&&state.ws.readyState===WebSocket.OPEN){state.ws.send(buffer);return;}if(state.pendingBytes+buffer.length>2_000_000){this.onEvent({type:'error',source,message:'Speech connection is too slow; restart listening'});this.stop(source);return;}state.pending.push(buffer);state.pendingBytes+=buffer.length;}
  keepAlive(){for(const state of this.streams.values())if(state.ws.readyState===WebSocket.OPEN)state.ws.send(JSON.stringify({type:'KeepAlive'}));}
  stop(source){const s=this.streams.get(source);if(!s)return;this.streams.delete(source);try{s.ws.send(JSON.stringify({type:'CloseStream'}));}catch{}s.ws.close();}
  stopAll(){for(const source of [...this.streams.keys()])this.stop(source);}
}
module.exports={Transcriber,TranscriptAssembler};
