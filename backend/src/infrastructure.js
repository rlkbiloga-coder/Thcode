import {Pool} from 'pg';
import {createClient} from 'redis';

export function createInfrastructure({env=process.env,poolFactory=opts=>new Pool(opts),redisFactory=opts=>createClient(opts)}={}) {
  let pg=null,redis=null,schemaReady=false;
  const schemaSQL='CREATE TABLE IF NOT EXISTS thcode_e2b_events (id TEXT PRIMARY KEY, type TEXT NOT NULL, sandbox_id TEXT NOT NULL, payload JSONB NOT NULL, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW())';
  const deadline=async fn=>{let timer;try{return await Promise.race([fn(),new Promise((r,j)=>{timer=setTimeout(()=>j(Error('timeout')),3000)})])}finally{clearTimeout(timer)}};
  const states={postgres:env.DATABASE_URL?'disconnected':'disabled',redis:env.REDIS_URL?'disconnected':'disabled'};
  const required=name=>states[name]!=='disabled';
  const probe=async()=>{
    if(pg){try{if(!schemaReady){await pg.query(schemaSQL);schemaReady=true}await pg.query('SELECT 1');states.postgres='ready'}catch{states.postgres='disconnected'}}
    if(redis){try{if(!redis.isReady)throw Error();await deadline(()=>redis.ping());states.redis='ready'}catch{states.redis='disconnected'}}
    return {postgres:{configured:required('postgres'),state:states.postgres},redis:{configured:required('redis'),state:states.redis},ready:Object.values(states).every(s=>s==='ready'||s==='disabled')};
  };
  async function init(){
    if(env.DATABASE_URL){
      pg=poolFactory({connectionString:env.DATABASE_URL,connectionTimeoutMillis:5000,query_timeout:5000,max:5});
      pg.on?.('error',()=>{states.postgres='disconnected'});
      try{await pg.query(schemaSQL);schemaReady=true;states.postgres='ready'}catch{states.postgres='disconnected'}
    }
    if(env.REDIS_URL){
      redis=redisFactory({url:env.REDIS_URL,disableOfflineQueue:true,socket:{connectTimeout:5000,reconnectStrategy:false}});
      redis.on?.('error',()=>{states.redis='disconnected'});
      try{await redis.connect();states.redis='ready'}catch{states.redis='disconnected'}
    }
    return probe();
  }
  async function recordEvent(event){
    // Acknowledging without durable storage would lose events after restart.
    if(!pg)throw Object.assign(Error('Postgres não configurado: evento não persistido'),{status:503});
    try{
      const result=await pg.query('INSERT INTO thcode_e2b_events (id,type,sandbox_id,payload) VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT (id) DO NOTHING RETURNING id',[event.id,event.type,event.sandbox_id,JSON.stringify(event)]);
      states.postgres='ready';
      return {persisted:true,duplicate:result.rowCount===0};
    }catch{
      states.postgres='disconnected';throw Object.assign(Error('Falha ao persistir evento E2B no Postgres'),{status:503});
    }
  }
  async function close(){
    await Promise.allSettled([pg?.end(),redis?.isOpen?redis.quit():Promise.resolve()]);
  }
  return {init,health:probe,recordEvent,close};
}
