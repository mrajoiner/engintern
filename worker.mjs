import {sources,readSource,isPastTerm} from './sources.mjs';
import {assets,seed} from './generated-assets.mjs';
const TTL=3600000,MAX_STALE=7*86400000;
let inflight;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export function mergeResults(previous,results,now=Date.now()){
 const next=results.map((r,i)=>r.status==='fulfilled'?{source:sources[i][1],ok:true,jobs:r.value,checked:new Date(now).toISOString()}:{...(previous.sources.find(s=>s.source===sources[i][1])||{source:sources[i][1],jobs:[]}),ok:false,error:'Employer feed could not be reached'});
 return {sources:next,updated:new Date(now).toISOString()};
}
export function publicFeed(d,now=Date.now()){
 const seen=new Set(),jobs=[];
 for(const source of d.sources){if(now-Date.parse(source.checked||0)>=MAX_STALE)continue;
  for(const j of source.jobs){if(j.source==='internshipscom'&&isPastTerm(j,now))continue;if(j.validThrough&&Date.parse(j.validThrough)<=now)continue;
   if(j.source==='internshipscom'&&now-Date.parse(j.sourceVerifiedAt||j.checked)>=MAX_STALE)continue;
   const key=!j.title?(j.url||j.id):[j.company,j.title,j.city,j.state].map(x=>String(x||'').toLowerCase().replace(/[^a-z0-9]/g,'')).join('|');if(seen.has(key))continue;seen.add(key);jobs.push(j);
  }
 }
 return{jobs,coverage:{distinctPostings:new Set(jobs.map(j=>j.url||j.id)).size,locationEntries:jobs.length,unlimited:true},updated:d.updated,sources:d.sources.map(s=>{const config=sources.find(x=>x[1]===s.source);return{key:s.source,name:config?.[2]||s.source,ok:s.ok,checked:s.checked,count:jobs.filter(j=>j.source===s.source).length,url:config?.[3]||(config?.[0]==='gh'?'https://job-boards.greenhouse.io/'+s.source:'https://jobs.lever.co/'+s.source)}})};
}
async function stored(env){let item=await env.BUCKET?.get('catalog/current.json');return item?await item.json():seed}
async function refresh(env){if(inflight)return inflight;inflight=(async()=>{let old=await stored(env);let results=await Promise.allSettled(sources.map(readSource));let next=mergeResults(old,results);if(!env.BUCKET)throw Error('Persistent catalog storage is unavailable');await env.BUCKET.put('catalog/current.json',JSON.stringify(next),{httpMetadata:{contentType:'application/json'}});return next})();try{return await inflight}finally{inflight=null}}
export default{async fetch(request,env,ctx){let url=new URL(request.url);try{
 if(url.pathname==='/api/jobs'){let d=await stored(env);if(Date.now()-Date.parse(d.updated)>TTL)ctx.waitUntil(refresh(env).catch(console.error));return json(publicFeed(d))}
 if(url.pathname==='/api/refresh'&&request.method==='POST'){// The hosted owner-private Site dispatch authorizes this catalog-only writer.
 let d=await refresh(env);return json(publicFeed(d))}
 if(url.pathname==='/api/health')return json({ok:true,storage:!!env.BUCKET,sources:sources.length});
 if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
 let asset=assets[url.pathname==='/'?'/index.html':url.pathname];if(!asset)return new Response('Not found',{status:404});return new Response(asset.encoding==='base64'?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body,{headers:{'content-type':asset.type,'cache-control':url.pathname.startsWith('/vendor/')?'public, max-age=86400':'no-cache','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'"}})
 }catch(e){console.error(e);return json({error:'The catalog is temporarily unavailable. Please try again.'},503)}}};
