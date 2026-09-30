import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {WebSocket} from 'ws';
const dir=mkdtempSync(join(tmpdir(),'thcode-sec-'));
const port=8134, token='local-security-test-only';
const srv=spawn(process.execPath,['src/server.js'],{env:{...process.env,PORT:String(port),WORKSPACE_DIR:dir,THCODE_API_TOKEN:token,E2B_API_KEY:'',DATABASE_URL:'',REDIS_URL:'',E2B_WEBHOOK_SECRET:'integration-test-secret',CORS_ORIGINS:'https://rlkbiloga-coder.github.io'},stdio:'ignore'});
const url=`http://127.0.0.1:${port}`;
try{
 for(let i=0;i<80;i++){try{if((await fetch(url+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 assert.equal((await fetch(url+'/api/ready')).status,200);
 const infra=await (await fetch(url+'/api/infrastructure',{headers:{Authorization:'Bearer '+token}})).json();assert.equal(infra.postgres.state,'disabled');assert.equal(infra.redis.state,'disabled');
 assert.equal((await fetch(url+'/api/e2b/sandboxes',{headers:{Authorization:'Bearer '+token}})).status,503);
 const body=Buffer.from(JSON.stringify({id:'local-test-event',type:'sandbox.lifecycle.created',sandbox_id:'sandbox1'}));
 const signature=crypto.createHash('sha256').update('integration-test-secret').update(body).digest('base64').replace(/=+$/,'');
 const hook=await fetch(url+'/api/e2b/webhook',{method:'POST',headers:{'Content-Type':'application/json','e2b-signature':signature},body});assert.equal(hook.status,503);
 assert.equal((await fetch(url+'/api/e2b/webhook',{method:'POST',headers:{'Content-Type':'application/json'},body})).status,401);
 let r=await fetch(url+'/api/health',{headers:{Origin:'https://rlkbiloga-coder.github.io'}});assert.equal(r.headers.get('access-control-allow-origin'),'https://rlkbiloga-coder.github.io');
 r=await fetch(url+'/api/health',{headers:{Origin:'https://attacker.invalid'}});assert.equal(r.headers.get('access-control-allow-origin'),null);
 r=await fetch(url+'/api/fs/list',{headers:{Authorization:'Bearer incorrect'}});assert.equal(r.status,401);
 r=await fetch(url+'/api/fs/file?path=../../etc/passwd',{headers:{Authorization:'Bearer '+token}});assert.equal(r.status,400);
 const snapshot=await new Promise((resolve,reject)=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/ws/logs?token=${token}`);const timer=setTimeout(()=>{ws.terminate();reject(new Error('logs socket timeout'))},4000);ws.on('message',raw=>{clearTimeout(timer);ws.close();resolve(JSON.parse(raw))});ws.on('error',reject)});assert.equal(snapshot.type,'snapshot');
 const close=await new Promise((resolve,reject)=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/ws/terminal?token=${token}`,{origin:'https://attacker.invalid'});ws.on('close',code=>resolve(code));ws.on('error',reject)});assert.equal(close,4003);
 console.log('PASS: allowed CORS, rejected untrusted CORS, invalid token, path traversal, real logs WebSocket, WebSocket origin protection, readiness, disabled infrastructure, E2B unavailable, signed webhook persistence failure, unsigned webhook rejected');
}finally{srv.kill('SIGTERM');await new Promise(resolve=>{srv.once('exit',resolve);setTimeout(resolve,4000).unref()});rmSync(dir,{recursive:true,force:true})}
