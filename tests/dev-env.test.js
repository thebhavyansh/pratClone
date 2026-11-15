const test=require('node:test');
const assert=require('node:assert/strict');
const {parseDevKeys}=require('../src/dev-env');

test('development keys are read by name without taking unrelated environment values',()=>{
  const keys=parseDevKeys('REACT_APP_GEMINI_API_KEY="example-gemini"\nREACT_APP_DEEPGRAM_API_KEY=example-deepgram\nREACT_APP_RESUME_CONTEXT=private notes\n');
  assert.deepEqual(keys,{gemini:'example-gemini',deepgram:'example-deepgram'});
});
