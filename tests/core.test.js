const test=require('node:test');
const assert=require('node:assert/strict');
const {DEMO,MODES,looksLikeQuestion,stats,markdownReview}=require('../src/core');
const {buildPrompt,demoAnswer}=require('../src/ai');

test('demo covers each technical mode, a project follow-up, and a screenshot question',()=>{
  for(const mode of MODES.filter(x=>x!=='Auto')){
    const item=DEMO.find(x=>x.mode===mode);assert.ok(item,mode);
    assert.match(demoAnswer({...item,notes:[]}),/DETAILS/);
  }
  assert.ok(DEMO.some(x=>x.question.includes('personally')));
  assert.ok(DEMO.some(x=>x.screenshot));
});
test('missing project evidence is explicitly flagged',()=>{
  const result=demoAnswer({question:'What was my project outcome?',mode:'Auto',notes:[]});
  assert.match(result,/supporting project note/);
  const prompt=buildPrompt({question:'Tell me about my project',mode:'Auto',language:'C++',context:'',notes:[],recent:[],summary:'',screenshot:null});
  assert.match(prompt,/No matching notes/);assert.match(prompt,/complete, detailed solution/);
  assert.match(prompt,/Decide what kind of question/);
});
test('question detection and latency percentiles',()=>{
  assert.equal(looksLikeQuestion('How would you design this'),true);
  assert.equal(looksLikeQuestion('The deployment finished.'),false);
  assert.deepEqual(stats([10,20,30,40,50]),{n:5,median:30,p95:50});
});
test('feedback is included in exported Markdown',()=>{
  const md=markdownReview({created_at:'2026-11-11',mode:'Auto'},[{role:'feedback',source:'review',text:'Practice the trade-offs.'}]);
  assert.match(md,/## Feedback/);assert.match(md,/Practice the trade-offs/);
});
