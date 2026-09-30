// Unit tests use injected SDK/database clients. No external service is simulated in production.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import {createInfrastructure} from '../src/infrastructure.js';
import {verifyWebhookSignature,createWebhookHandler,createE2BRouter} from '../src/e2b.js';
const raw=Buffer.from('{ "id":"event1", "type":"sandbox.lifecycle.created", "sandbox_id":"sb1" }');
const secret='unit-test-signing-secret';
const sign=b=>crypto.createHash('sha256').update(secret).update(b).digest('base64').replace(/=+$/,'');
test('signature uses exact raw bytes and documented base64 without padding',()=>{
 assert.equal(verifyWebhookSignature({signature:sign(raw),rawBuffer:raw,secret}),true);
 assert.equal(verifyWebhookSignature({signature:sign(raw),rawBuffer:Buffer.from(JSON.stringify(JSON.parse(raw))),secret}),false);
 assert.equal(verifyWebhookSignature({signature:sign(raw)+'=',rawBuffer:raw,secret}),false);
 assert.equal(verifyWebhookSignature({signature:sign(raw),rawBuffer:raw,secret:'wrong'}),false);
 assert.equal(verifyWebhookSignature({signature:'v1='+sign(raw),rawBuffer:raw,secret}),false);
 assert.equal(verifyWebhookSignature({signature:sign(raw),rawBuffer:JSON.parse(raw),secret}),false);
 const hmac=crypto.createHmac('sha256',secret).update(raw).digest('base64');
 assert.equal(verifyWebhookSignature({signature:hmac,rawBuffer:raw,secret}),false);
});
test('absent infrastructure is explicitly disabled; webhook cannot claim persistence',async()=>{
 const i=createInfrastructure({env:{}});assert.deepEqual(await i.init(),{postgres:{configured:false,state:'disabled'},redis:{configured:false,state:'disabled'},ready:true});
 await assert.rejects(()=>i.recordEvent({id:'x'}),{status:503});await i.close();
});
test('Postgres uses parameterized insert and deduplicates event id, not delivery id',async()=>{
 const seen=new Set();let args,lastSQL,closed=false;
 const pool={on(){},async query(sql,params){if(sql.startsWith('INSERT')){lastSQL=sql;args=params;const duplicate=seen.has(params[0]);seen.add(params[0]);return {rowCount:duplicate?0:1}}return {rows:[{}]}},async end(){closed=true}};
 const i=createInfrastructure({env:{DATABASE_URL:'unit-test'},poolFactory:()=>pool});await i.init();
 const event=JSON.parse(raw);assert.deepEqual(await i.recordEvent(event),{persisted:true,duplicate:false});assert.deepEqual(await i.recordEvent(event),{persisted:true,duplicate:true});
 assert.match(lastSQL,/VALUES \(\$1,\$2,\$3,\$4::jsonb\)/);assert.equal(args[0],'event1');assert.equal((await i.health()).postgres.state,'ready');await i.close();assert.equal(closed,true);
});
test('configured broken database is disconnected and readiness fails',async()=>{
 const i=createInfrastructure({env:{DATABASE_URL:'test'},poolFactory:()=>({on(){},query(){throw Error('unreachable')},async end(){}})});await i.init();const h=await i.health();assert.equal(h.postgres.state,'disconnected');assert.equal(h.ready,false);await assert.rejects(()=>i.recordEvent(JSON.parse(raw)),{status:503});await i.close();
});
test('Redis readiness requires actual ping, shutdown closes client',async()=>{
 let closed=false;const r={isReady:false,isOpen:false,on(){},async connect(){this.isReady=true;this.isOpen=true},async ping(){return 'PONG'},async quit(){closed=true}};
 const i=createInfrastructure({env:{REDIS_URL:'unit-test'},redisFactory:()=>r});await i.init();assert.equal((await i.health()).redis.state,'ready');r.isReady=false;assert.equal((await i.health()).ready,false);await i.close();assert.equal(closed,true);
});
async function withApp(setup,fn){const app=express();setup(app);app.use((e,r,w,n)=>w.status(e.status||500).json({error:e.message}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));try{await fn(`http://127.0.0.1:${server.address().port}`)}finally{await new Promise(r=>server.close(r))}}
test('raw webhook HTTP: rejects unsigned/tampered; idempotent signed delivery',async()=>{
 const events=new Set();const onEvent=async e=>{const duplicate=events.has(e.id);events.add(e.id);return {persisted:true,duplicate}};
 await withApp(app=>app.post('/hook',express.raw({type:'application/json'}),createWebhookHandler({secret,onEvent})),async u=>{
 const post=(body,signature,version='v1')=>fetch(u+'/hook',{method:'POST',headers:{'Content-Type':'application/json','e2b-signature':signature,'e2b-signature-version':version},body});
 assert.equal((await post(raw,'incorrect')).status,401);assert.equal((await post(raw,sign(raw),'v2')).status,400);
 assert.equal((await post(Buffer.from('{}'),sign(Buffer.from('{}')))).status,400);
 assert.deepEqual(await (await post(raw,sign(raw))).json(),{received:true,persisted:true,duplicate:false});
 assert.deepEqual(await (await post(raw,sign(raw))).json(),{received:true,persisted:true,duplicate:true});
 });
});
test('webhook missing persistence returns 503 for E2B retry',async()=>{
 const i=createInfrastructure({env:{}});
 await withApp(app=>app.post('/hook',express.raw({type:'application/json'}),createWebhookHandler({secret,onEvent:i.recordEvent})),async u=>{
 assert.equal((await fetch(u+'/hook',{method:'POST',headers:{'Content-Type':'application/json','e2b-signature':sign(raw)},body:raw})).status,503);
 });
});
test('E2B missing key is unavailable, never fake success',async()=>{
 await withApp(app=>{app.use(express.json());app.use('/e2b',createE2BRouter({apiKey:''}))},async u=>assert.equal((await fetch(u+'/e2b/sandboxes')).status,503));
});
test('E2B SDK calls, metadata isolation, timeout and server-only key',async()=>{
 let passedKey,passedMetadata,executed=false,killed=false;
 const sdk={
 async create(opts){passedKey=opts.apiKey;passedMetadata=opts.metadata;return {sandboxId:'sb1'}},
 list(){return {hasNext:false,async nextItems(){return [{sandboxId:'sb1'}]}}},
 async getInfo(id){return {sandboxId:id,metadata:id==='other'?{application:'unrelated'}:{application:'thcode',workspace:'test'}}},
 async kill(){killed=true;return true},
 async connect(id,opts){passedKey=opts.apiKey;return {async runCode(code,options){executed=true;assert.equal(code,'print(42)');assert.equal(options.language,'python');return {logs:{stdout:['42'],stderr:[]},results:[],error:null}}}}
 };
 await withApp(app=>{app.use(express.json());app.use('/e2b',createE2BRouter({sdk,apiKey:'e2b_unit-test',workspaceId:'test'}))},async u=>{
 const post=(p,b)=>fetch(u+'/e2b'+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
 let r=await post('/sandbox',{apiKey:'e2b_attacker'});assert.equal(r.status,201);assert.equal(passedKey,'e2b_unit-test');assert.equal(passedMetadata.workspace,'test');
 assert.equal((await post('/sandbox',{timeoutMs:-1})).status,400);
 assert.equal((await fetch(u+'/e2b/sandbox/other')).status,403);
 assert.equal((await fetch(u+'/e2b/sandbox/other',{method:'DELETE'})).status,403);assert.equal(killed,false);
 r=await post('/run',{sandboxId:'sb1',code:'print(42)',apiKey:'e2b_attacker'});assert.equal(r.status,200);assert.equal((await r.json()).logs.stdout[0],'42');assert.equal(executed,true);assert.equal(passedKey,'e2b_unit-test');
 assert.equal((await post('/run',{sandboxId:'sb1',code:'x',timeoutMs:60001})).status,400);
 assert.equal((await fetch(u+'/e2b/sandboxes')).status,200);
 assert.equal((await fetch(u+'/e2b/sandbox/sb1',{method:'DELETE'})).status,200);assert.equal(killed,true);
 });
});

test('real refused Postgres/Redis connections report not ready (no injected clients)',async()=>{
 const i=createInfrastructure({env:{DATABASE_URL:'postgresql://test:test@127.0.0.1:9/test',REDIS_URL:'redis://127.0.0.1:9'}});
 try{const h=await i.init();assert.equal(h.ready,false);assert.equal(h.postgres.state,'disconnected');assert.equal(h.redis.state,'disconnected')}finally{await i.close()}
});
