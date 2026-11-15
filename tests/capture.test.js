const test=require('node:test');
const assert=require('node:assert/strict');
const {captureFailure}=require('../src/renderer/capture');
test('denied capture permission gives a usable recovery message',()=>{
  assert.match(captureFailure({name:'NotAllowedError'}),/permission denied/);
  assert.match(captureFailure({name:'NotFoundError'}),/No display/);
});
