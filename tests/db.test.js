const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {Store}=require('../src/db');

test('SQLite FTS finds relevant project claims and session deletion cascades',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'copilot-test-'));
  const db=new Store(path.join(dir,'test.sqlite'));
  try{
    const hits=db.search('webhook Redis retries');assert.ok(hits.some(x=>x.title==='Webhook reliability'));
    const id=db.createSession('Auto');db.addTurn(id,'question','How did retries work?');db.addTurn(id,'answer','Need policy details.');
    assert.equal(db.turns(id).length,2);db.deleteSession(id);assert.equal(db.turns(id).length,0);
    assert.ok(db.notes().every(x=>!x.body.startsWith('data:image/')));
  }finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
});
