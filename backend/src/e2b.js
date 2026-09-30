import crypto from 'node:crypto';
import {Router} from 'express';
import {Sandbox} from '@e2b/code-interpreter';

export const EVENT_TYPES = new Set(['created','killed','updated','paused','resumed','checkpointed'].map(s => 'sandbox.lifecycle.'+s));
const fail=(status,message)=>Object.assign(new Error(message),{status});
export function verifyWebhookSignature({signature,rawBuffer,secret}) {
  if (!Buffer.isBuffer(rawBuffer) || typeof secret !== 'string' || !secret || typeof signature !== 'string') return false;
  const expected=crypto.createHash('sha256').update(secret).update(rawBuffer).digest('base64').replace(/=+$/, '');
  const a=Buffer.from(signature),b=Buffer.from(expected);
  return a.length===b.length && crypto.timingSafeEqual(a,b);
}
export function createWebhookHandler({secret=process.env.E2B_WEBHOOK_SECRET,onEvent}) {
  return async(req,res,next)=>{
    try {
      if(!secret || !onEvent) throw fail(503,'Webhook E2B não configurado');
      const version=req.headers['e2b-signature-version'];
      if(version && version!=='v1') throw fail(400,'Versão de assinatura não suportada');
      if(!verifyWebhookSignature({signature:req.headers['e2b-signature'],rawBuffer:req.body,secret})) throw fail(401,'Assinatura E2B inválida');
      let event;try{event=JSON.parse(req.body.toString('utf8'))}catch{throw fail(400,'Payload JSON inválido')}
      if(!event || typeof event.id!=='string' || !event.id || event.id.length>200 || !EVENT_TYPES.has(event.type) || typeof event.sandbox_id!=='string' || !event.sandbox_id) throw fail(400,'Evento E2B inválido');
      const result=await onEvent(event);
      res.json({received:true,...result});
    }catch(e){next(e)}
  };
}
const idValue=id=>{if(typeof id!=='string'|| !/^[a-zA-Z0-9_-]{1,128}$/.test(id))throw fail(400,'sandboxId inválido');return id};
const bounded=(v,def,min,max)=>{v=v??def;if(!Number.isInteger(v)||v<min||v>max)throw fail(400,`Timeout deve ser inteiro entre ${min} e ${max} ms`);return v};
export function createE2BRouter({sdk=Sandbox,apiKey=process.env.E2B_API_KEY,workspaceId=process.env.E2B_WORKSPACE_ID||'thcode',template=process.env.E2B_TEMPLATE||''}={}) {
  const router=Router(),metadata={application:'thcode',workspace:workspaceId};
  const options={apiKey,requestTimeoutMs:15000};
  router.use((r,w,next)=>next(!apiKey || !apiKey.startsWith('e2b_')?fail(503,'E2B_API_KEY ausente ou inválida no backend'):undefined));
  const wrap=fn=>async(r,w,next)=>{try{await fn(r,w)}catch(e){next(e)}};
  async function owned(id){
    id=idValue(id);const info=await sdk.getInfo(id,options);
    if(info.metadata?.application!==metadata.application || info.metadata?.workspace!==metadata.workspace)throw fail(403,'Sandbox não pertence a este workspace');
    return info;
  }
  router.post('/sandbox',wrap(async(r,w)=>{
    const timeoutMs=bounded(r.body.timeoutMs,60000,1000,300000);
    const opts={...options,timeoutMs,metadata};
    const sb=template?await sdk.create(template,opts):await sdk.create(opts);
    w.status(201).json({sandboxId:sb.sandboxId,timeoutMs});
  }));
  router.get('/sandboxes',wrap(async(r,w)=>{
    const paginator=sdk.list({...options,query:{metadata},limit:100});
    const sandboxes=await paginator.nextItems();
    w.json({sandboxes,hasMore:paginator.hasNext});
  }));
  router.get('/sandbox/:id',wrap(async(r,w)=>w.json(await owned(r.params.id))));
  router.delete('/sandbox/:id',wrap(async(r,w)=>{
    await owned(r.params.id);const killed=await sdk.kill(r.params.id,options);w.json({sandboxId:r.params.id,killed});
  }));
  router.post('/run',wrap(async(r,w)=>{
    const {sandboxId,code,language='python'}=r.body;
    if(typeof code!=='string'|| !code.trim() || Buffer.byteLength(code)>262144)throw fail(400,'Código obrigatório, máximo 256 KiB');
    if(!['python','javascript','typescript','r','java','bash'].includes(language))throw fail(400,'Linguagem não suportada');
    const timeoutMs=bounded(r.body.timeoutMs,30000,1000,60000);
    await owned(sandboxId);
    const sandbox=await sdk.connect(sandboxId,{...options,timeoutMs:60000});
    const started=Date.now();
    const result=await sandbox.runCode(code,{language,timeoutMs,requestTimeoutMs:timeoutMs+5000});
    w.json({sandboxId,durationMs:Date.now()-started,logs:result.logs,results:result.results,error:result.error??null,success:!result.error});
  }));
  return router;
}
