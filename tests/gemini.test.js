const test=require('node:test');
const assert=require('node:assert/strict');
const {streamGemini}=require('../src/ai');

test('canceling a streaming response stops later chunks',async()=>{
  const oldFetch=global.fetch,controller=new AbortController(),received=[];
  global.fetch=async(_url,options)=>({ok:true,body:new ReadableStream({
    pull(stream){if(options.signal.aborted){stream.error(new DOMException('Aborted','AbortError'));return;}
      if(received.length===0)stream.enqueue(new TextEncoder().encode('data: {"candidates":[{"content":{"parts":[{"text":"first"}]}}]}\n\n'));
      else stream.enqueue(new TextEncoder().encode('data: {"candidates":[{"content":{"parts":[{"text":"late"}]}}]}\n\n'));
    }
  },{highWaterMark:0})});
  try{
    await assert.rejects(streamGemini({apiKey:'test',model:'test',prompt:'test',signal:controller.signal,onText:chunk=>{received.push(chunk);controller.abort();}}));
    assert.deepEqual(received,['first']);
  }finally{global.fetch=oldFetch;}
});
test('confirmed screenshot uses Gemini inline image input',async()=>{
  const oldFetch=global.fetch;let body;
  global.fetch=async(_url,options)=>{body=JSON.parse(options.body);return {ok:true,body:new ReadableStream({start(stream){stream.enqueue(new TextEncoder().encode('data: {"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}\n\n'));stream.close();}})};};
  try{
    const result=await streamGemini({apiKey:'test',prompt:'What is shown?',screenshot:'data:image/png;base64,aGVsbG8=',signal:new AbortController().signal,onText:()=>{}});
    assert.equal(result,'ok');assert.equal(body.contents[0].parts[1].inlineData.mimeType,'image/png');
  }finally{global.fetch=oldFetch;}
});
