const test=require('node:test');
const assert=require('node:assert/strict');
const {TranscriptAssembler}=require('../src/stt');

test('interim and finalized segments form one question, duplicate events do not repeat it',()=>{
  const events=[],a=new TranscriptAssembler('microphone',e=>events.push(e));
  a.consume({is_final:false,channel:{alternatives:[{transcript:'How would'}]}});
  const first={is_final:true,start:0,duration:1,channel:{alternatives:[{transcript:'How would you'}]}};
  const last={is_final:true,speech_final:true,start:1,duration:1,channel:{alternatives:[{transcript:'design this?'}]}};
  a.consume(first);a.consume(first);a.consume(last);a.consume(last);a.consume({type:'UtteranceEnd'});
  assert.equal(events.filter(x=>x.type==='interim').length,1);
  assert.deepEqual(events.filter(x=>x.type==='final').map(x=>x.text),['How would you design this?']);
});
