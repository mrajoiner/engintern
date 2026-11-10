// Read the public SSR data as data, never execute downloaded scripts.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {states,skillTerms} from './sources.mjs';
export function parseValue(text,start=0){
 let at=start;const refs=new Map();const ws=()=>{while(/\s/.test(text[at]||'')&&at<text.length)at++;};
 function value(){ws();const c=text[at];
  if(c==='"'){const begin=at++;while(at<text.length){if(text[at]==='\\'){at+=2;continue;}if(text[at++]==='"')return JSON.parse(text.slice(begin,at));}throw Error('Unclosed string');}
  if(text.startsWith('$R[',at)){at+=3;let end=text.indexOf(']',at),id=text.slice(at,end);at=end+1;if(text[at]==='='){at++;let v=value();refs.set(id,v);return v;}return refs.get(id)??null;}
  if(c==='{'){at++;let out={};ws();while(text[at]!=='}'){ws();let key;if(text[at]==='"')key=value();else{let m=text.slice(at).match(/^[A-Za-z_$][\w$]*/);if(!m)throw Error('Invalid object key');key=m[0];at+=key.length;}ws();if(text[at++]!==':')throw Error('Missing colon');const v=value();Object.defineProperty(out,key,{value:v,enumerable:true,configurable:true,writable:true});ws();if(text[at]!==',')break;at++;}if(text[at++]!=='}')throw Error('Missing object end');return out;}
  if(c==='['){at++;let out=[];ws();while(text[at]!==']'){out.push(value());ws();if(text[at]!==',')break;at++;}if(text[at++]!==']')throw Error('Missing array end');return out;}
  for(const [token,v]of [['!0',true],['!1',false],['true',true],['false',false],['null',null],['void 0',null],['undefined',null]])if(text.startsWith(token,at)){at+=token.length;return v;}
  const n=text.slice(at).match(/^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i);if(n){at+=n[0].length;return Number(n[0]);}throw Error('Unsupported public data token');
 }return value();
}
export function parseBrowse(html){const found=html.match(/l:(\$R\[\d+\]=\{kind:"(?:group|role|metro)"[\s\S]*)/);if(!found)throw Error('Browse data unavailable');const d=parseValue(found[1]);if(!Array.isArray(d.listings)||!Number.isInteger(d.totalPages)||d.degraded)throw Error('Incomplete browse response');return d;}
const origin='https://www.internships.com';
export function cardsToJobs(cards,checked,links){const out=[];for(const j of cards){
 if(j.closeDatePassed||(j.validThrough&&Date.parse(j.validThrough)<Date.parse(checked)))continue;
 if(!/intern|co.op/i.test(j.title)||/202[0-6]/.test(j.title)&&!/2027/.test(j.title))continue;
 const link=links.get(String(j.id));if(!link)continue;
 let state=Object.keys(states).find(s=>new RegExp('(?:,|\\s)'+s+'(?:,|$)','i').test(j.location||''));
 if(!state)state=Object.keys(states).find(s=>(j.location||'').toLowerCase().includes(states[s].toLowerCase()));
 if(!state){const suffix=(j.locationSlug||'').match(/(?:^|-)([a-z]{2})$/i)?.[1]?.toUpperCase();if(states[suffix])state=suffix;}
 if(!state||j.remote&&!j.location)continue;
 const parts=(j.location||'').split(',').map(x=>x.trim());const stateIndex=parts.findIndex(x=>new RegExp('^(?:'+state+'|'+states[state]+')(?:\\b|$)','i').test(x));let city=(stateIndex>0?parts[stateIndex-1]:parts[0]||'').replace(/\s*\+\d+ more.*$/,'').trim();if(/\d/.test(city)){const slugCity=(j.locationSlug||'').match(new RegExp('^(.+)-'+state+'$','i'))?.[1];city=slugCity?slugCity.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'';}if(!city||/remote|united states|nationwide/i.test(city)||city.toLowerCase()===states[state].toLowerCase())continue;
 const discipline=['Environmental','Biomedical','Industrial','Petroleum','Software','Electrical','Structural','Civil','Mechanical','Manufacturing','Materials','Systems','Chemical','Nuclear','Aerospace','Robotics'].find(x=>new RegExp(x,'i').test(j.title))||'General engineering';
 const skills=skillTerms.filter(s=>new RegExp('(^|[^a-z])'+s.replace(/[+]/g,'\\+')+'([^a-z]|$)','i').test(j.title));
 out.push({id:'internships-'+j.id+'-'+state+'-'+city,source:'internshipscom',company:j.companyName,title:j.title,city,state,discipline,skills,pay:typeof j.salary==='string'?j.salary:'See employer posting',term:j.termLabel||'See source posting',details:{arrangement:j.remote?'Remote':'See source posting'},deadline:j.validThrough||'Not specified · check employer',url:link,summary:'Listed by Internships.com. Open the source listing for the full description, requirements, and employer application link.',eligibility:[],checked,validThrough:j.validThrough||null,sourceVerifiedAt:checked});
 }return out;}
export async function crawl(destination='catalog-internships.json'){
 const queue=['/browse/engineering'],seen=new Set(queue),cards=new Map(),links=new Map(),failed=[],unavailable=[];let pages=0,running=0;const report={};
 const add=p=>{if(!seen.has(p)){seen.add(p);queue.push(p);}};
 async function fetchPage(path){let response;for(let attempt=0;attempt<3;attempt++){try{response=await fetch(origin+path,{headers:{'User-Agent':'EngIntern public listing index (+https://github.com/mrajoiner/engintern)'},signal:AbortSignal.timeout(25000)});if(response.ok)break;if(response.status===429||response.status>=500){await new Promise(r=>setTimeout(r,(attempt+1)*1500));continue;}throw Error('HTTP '+response.status);}catch(e){if(attempt===2)throw e;}}if(!response?.ok)throw Error('HTTP '+response?.status);return response.text();}
 async function work(path){const html=await fetchPage(path),d=parseBrowse(html);pages++;
  for(const match of html.matchAll(/href="(\/posting\/[^"?#]+)"/g)){const id=match[1].match(/-(\d+)$/)?.[1];if(id)links.set(id,origin+match[1]);}
  for(const j of d.listings)cards.set(String(j.id),j);
  const base=path.split('?')[0];if(!path.includes('?')){
   report[base]={reported:d.inventory?.open,pages:d.totalPages};
   for(let n=2;n<=d.totalPages;n++)add(base+'?page='+n);
   if(base==='/browse/engineering')for(const r of d.roles||[])add('/browse/'+r.slug);
   // Public location links uncover results beyond each category's 50-page window.
   for(const m of d.metros||d.topMetros||[])if(m.scoped&&m.href?.startsWith('/browse/'))add(m.href);
   for(const m of html.matchAll(/href="(\/browse\/(?:engineering|[a-z-]+-engineering)\/[a-z0-9-]+)"/g))add(m[1]);
  }
  if(pages%100===0)console.log(JSON.stringify({pages,uniqueCards:cards.size,pending:queue.length}));
 }
 // Bounded concurrency and pacing; a failed page never overwrites the last complete catalog.
 await Promise.all(Array.from({length:4},async()=>{for(;;){const path=queue.shift();if(!path){if(!running)break;await new Promise(r=>setTimeout(r,100));continue;}running++;try{await work(path);}catch(e){if(e.message==='HTTP 404')unavailable.push(path);else failed.push({path,error:e.message});}finally{running--;}await new Promise(r=>setTimeout(r,80));}}));
 if(failed.length)throw Error('Incomplete crawl; keeping previous catalog: '+JSON.stringify(failed.slice(0,8))+' ('+failed.length+' pages)');
 const checked=new Date().toISOString(),jobs=cardsToJobs([...cards.values()],checked,links);
 if(!jobs.length)throw Error('No usable listings; refusing replacement');
 const data={updated:checked,jobs,coverage:{pages,discoveredCards:cards.size,listedLocations:jobs.length,scope:'Public engineering browse pages, specializations and linked locations',reportedEngineeringInventory:report['/browse/engineering']?.reported,exhaustive:false,unavailablePages:unavailable},report};
 await writeFile(destination,JSON.stringify(data));console.log(JSON.stringify(data.coverage));return data;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await crawl(process.argv[2]);
