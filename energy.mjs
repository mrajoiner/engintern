import {plain} from './details.mjs';
export const southwestStates=new Set(['TX','NM','OK','LA','AZ']);
export const energySources=[
 ['wd','chevron-energy','Chevron','https://chevron.wd5.myworkdayjobs.com/University',{origin:'https://chevron.wd5.myworkdayjobs.com',tenant:'chevron',site:'University'}],
 ['wd','oxy-energy','Occidental (Oxy)','https://oxy.wd5.myworkdayjobs.com/UniversityRelations',{origin:'https://oxy.wd5.myworkdayjobs.com',tenant:'oxy',site:'UniversityRelations'}],
 ['wd','oneok-energy','ONEOK','https://oneok.wd1.myworkdayjobs.com/ONEOK',{origin:'https://oneok.wd1.myworkdayjobs.com',tenant:'oneok',site:'ONEOK'}],
 ['wd','bakerhughes-energy','Baker Hughes','https://bakerhughes.wd5.myworkdayjobs.com/BakerHughes',{origin:'https://bakerhughes.wd5.myworkdayjobs.com',tenant:'bakerhughes',site:'BakerHughes'}],
 ['wd','plains-energy','Plains All American','https://plains.wd1.myworkdayjobs.com/plains',{origin:'https://plains.wd1.myworkdayjobs.com',tenant:'plains',site:'plains'}],
 ['wd','williams-energy','Williams','https://williams.wd5.myworkdayjobs.com/External',{origin:'https://williams.wd5.myworkdayjobs.com',tenant:'williams',site:'External'}],
 ['sf','exxonmobil-energy','ExxonMobil','https://jobs.exxonmobil.com/go/Engineering/3845600/',{origin:'https://jobs.exxonmobil.com',index:'/go/Engineering/3845600/'}],
 ['sf','phillips66-energy','Phillips 66','https://careers.phillips66.com',{origin:'https://careers.phillips66.com',index:'/search/?q=intern'}],
 ['sf','halliburton-energy','Halliburton','https://jobs.halliburton.com',{origin:'https://jobs.halliburton.com',index:'/search/?q=intern'}],
 ['sf','hfsinclair-energy','HF Sinclair','https://careers.hfsinclair.com',{origin:'https://careers.hfsinclair.com',index:'/search/?q=intern'}],
 ['direct','energytransfer-energy','Energy Transfer','https://energytransfer.referrals.selectminds.com/ETP',{jobs:[{url:'https://energytransfer.referrals.selectminds.com/ETP/jobs/intern-e-c-pipeline-interstate-project-19246',title:'Intern E&C Pipeline - Interstate Project',location:'Houston, TX',id:'2610003550'}]}],
 ['direct','slb-energy','SLB','https://careers.slb.com',{jobs:[{url:'https://careers.slb.com/jobdescription.aspx?id=EF18882-en_US+1',title:'Technology Intern',location:'Houston, TX',id:'EF18882-en_US-1'}]}]
];
export const isInternTitle=t=>/\bintern(?:ships?)?\b|\bco-op\b/i.test(t)&&!(/202[0-6]/.test(t)&&!/2027/.test(t));
export const isEngineeringTitle=t=>/engineer|mechanical|electrical|structural|robotics|materials|software|manufactur|controls|physics|reservoir|petrophysics|pipeline|STEM|technology intern|internship opportunities/i.test(t);
async function request(url,options={}){const r=await fetch(url,{...options,signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error('Employer request: HTTP '+r.status);return r;}
async function pooled(items,fn,size=4){const out=new Array(items.length);let next=0;await Promise.all(Array.from({length:Math.min(size,items.length)},async()=>{while(next<items.length){const i=next++;out[i]=await fn(items[i],i);}}));return out;}
export function canonicalLocation(value){
 let s=value.trim();let m=s.match(/^US-([A-Z]{2})-([^\d]+?)(?:-\d| - |\s\d|$)/);if(m){const city=m[2].replace(/[- ]+$/,'').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());return city+', '+m[1];}
 m=s.match(/^([A-Z]{2})\s*[-–]\s*(.+)$/);if(m)return m[2].trim()+', '+m[1];
 return s;
}
function stateFacets(nodes){for(const x of nodes||[]){if(x.facetParameter&&/state|province/i.test(x.descriptor||'')){const ids=(x.values||[]).filter(v=>/^(Texas|New Mexico|Oklahoma|Louisiana|Arizona)$/.test(v.descriptor)).map(v=>v.id);if(ids.length)return {[x.facetParameter]:ids};}for(const value of Object.values(x)){if(Array.isArray(value)){const result=stateFacets(value.filter(v=>v&&typeof v==='object'));if(result)return result;}}}return null;}
async function workday(src){
 const c=src[4],base=c.origin+'/wday/cxs/'+c.tenant+'/'+c.site;
 const page=async(offset,facets={})=>{const r=await request(base+'/jobs',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({limit:20,offset,searchText:'intern',appliedFacets:facets})});const d=await r.json();if(!Array.isArray(d.jobPostings)||!Number.isFinite(d.total))throw Error('Invalid Workday response');return d;};
 let first=await page(0),facets=stateFacets(first.facets)||{};if(Object.keys(facets).length)first=await page(0,facets);
 if(first.total>2000)throw Error('Employer result size exceeds complete-refresh limit');
 const offsets=[];for(let n=20;n<first.total;n+=20)offsets.push(n);
 const pages=await pooled(offsets,n=>page(n,facets));let all=[...first.jobPostings,...pages.flatMap(p=>p.jobPostings)];
 const unique=[...new Map(all.map(j=>[j.externalPath,j])).values()];
 if(unique.length<first.total)throw Error('Employer pagination changed during refresh');
 const candidates=unique.filter(j=>isInternTitle(j.title)&&isEngineeringTitle(j.title));
 const result=await pooled(candidates,async j=>{
  const r=await request(base+j.externalPath),d=await r.json(),info=d.jobPostingInfo;if(!info?.jobDescription)throw Error('Missing Workday posting details');
  if(info.canApply===false||info.posted===false)return null;
  if(info.endDate&&Date.parse(info.endDate+'T23:59:59Z')<Date.now())return null;
  if(info.country?.id&&info.country.id!=='bc33aa3152ec42d4995f4791a106ed09'&&!/United States/i.test(info.country.descriptor||''))return null;
  const locations=[info.location,...(info.additionalLocations||[])].filter(Boolean).map(canonicalLocation);
  return {id:info.jobReqId||info.id,title:info.title,content:info.jobDescription,location:{name:locations.join('; ')},absolute_url:info.externalUrl||c.origin+'/'+c.site+j.externalPath,explicitDeadline:info.endDate||null};
 });return result.filter(Boolean);
}
export function parseSearchRows(html,origin){
 const rows=[...html.matchAll(/<tr\b[^>]*class="[^"]*data-row[^"]*"[\s\S]*?<\/tr>/gi)];
 return rows.map(m=>{const row=m[0],links=[...row.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)],link=links.find(x=>/jobTitle-link/.test(x[1]));if(!link)return null;const href=link[1].match(/href="([^"]+)"/)?.[1];const location=row.match(/<td\b[^>]*headers="hdrLocation"[^>]*>([\s\S]*?)<\/td>/i)?.[1]||'';return href?{title:plain(link[2]),url:new URL(href.replace(/&amp;/g,'&'),origin).href,location:plain(location).replace(/\+\d+ more.*$/,'').trim()}:null;}).filter(Boolean);
}
function jsonPosting(html){for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{let data=JSON.parse(m[1]);let nodes=Array.isArray(data)?data:data['@graph']||[data];const j=nodes.find(x=>x['@type']==='JobPosting');if(j)return j;}catch{}}return null;}
export function employerDescription(html){
 const start=/<span\b[^>]*class="[^"]*jobdescription[^"]*"[^>]*>/i.exec(html);if(!start)return null;
 const tail=html.slice(start.index+start[0].length);let depth=1;for(const tag of tail.matchAll(/<\/?span\b[^>]*>/gi)){depth+=/^<\//.test(tag[0])?-1:1;if(depth===0)return tail.slice(0,tag.index);}return null;
}
export function addressLocations(html){
 const out=[];for(const block of html.matchAll(/<span\b[^>]*itemprop="address"[^>]*>([\s\S]*?)<\/span>/gi)){
  const values={};for(const m of block[1].matchAll(/<meta\b[^>]*>/gi)){const key=m[0].match(/itemprop="([^"]+)"/)?.[1],value=m[0].match(/content="([^"]*)"/)?.[1];if(key&&value)values[key]=plain(value);}
  if(values.addressCountry&&!/^(US|USA|United States)$/i.test(values.addressCountry))continue;if(values.addressLocality&&values.addressRegion)out.push(values.addressLocality+', '+values.addressRegion);
 }return [...new Set(out)];
}
async function successFactors(src){
 const c=src[4],firstUrl=new URL(c.index,c.origin),first=await(await request(firstUrl)).text();const firstRows=parseSearchRows(first,c.origin);
 if(!firstRows.length){if(/0 results|no jobs found|no results found/i.test(plain(first)))return [];throw Error('Employer search layout changed');}
 const match=plain(first).match(/Results\s*[\d,]+\s*[–-]\s*[\d,]+\s*of\s*([\d,]+)/i),total=match?Number(match[1].replace(/,/g,'')):firstRows.length;
 if(total>1500)throw Error('Employer result size exceeds complete-refresh limit');
 const offsets=[];for(let n=firstRows.length;n<total;n+=firstRows.length)offsets.push(n);
 const pages=await pooled(offsets,async offset=>{const u=new URL(firstUrl);if(u.pathname.startsWith('/go/'))u.pathname=u.pathname.replace(/\/$/,'')+'/'+offset+'/';else u.searchParams.set('startrow',offset);return parseSearchRows(await(await request(u)).text(),c.origin);});
 const unique=[...new Map([...firstRows,...pages.flat()].map(j=>[j.url,j])).values()];if(unique.length<total)throw Error('Employer pagination incomplete');
 const candidates=unique.filter(j=>isInternTitle(j.title)&&isEngineeringTitle(j.title));
 return(await pooled(candidates,async j=>{
  const r=await request(j.url),html=await r.text();if(/position has been filled|job is no longer available|position is no longer available|job has expired/i.test(plain(html)))return null;
  const ld=jsonPosting(html);const content=ld?.description||employerDescription(html);if(!content)throw Error('Missing employer description');
  const deadline=ld?.validThrough;if(deadline&&Date.parse(deadline)<Date.now())return null;
  let locations=[];for(let p of [ld?.jobLocation].flat().filter(Boolean)){const a=p.address;if(a?.addressCountry&&!/^(US|USA|United States)/i.test(typeof a.addressCountry==='string'?a.addressCountry:a.addressCountry.name||''))continue;if(a?.addressLocality&&a?.addressRegion)locations.push(a.addressLocality+', '+a.addressRegion);}
  const micro=addressLocations(html);if(micro.length)locations=micro;if(!locations.length)locations=[j.location];
  const title=ld?.title||j.title;
  return {id:j.url.match(/\/(\d+)\/?$/)?.[1]||j.url,title,content,location:{name:locations.join('; ')},absolute_url:j.url,explicitDeadline:deadline||null};
 })).filter(Boolean);
}
async function direct(src){return(await pooled(src[4].jobs,async j=>{const r=await request(j.url),html=await r.text(),text=plain(html);if(/job is no longer available|job has expired|position has been filled|no longer accepting applications/i.test(text))return null;if(!text.toLowerCase().includes(j.title.toLowerCase())||!/apply (?:now|for job)|applynow|apply-for-job/i.test(text+' '+html))throw Error('Posting availability could not be verified');const ld=jsonPosting(html);const content=ld?.description||html.match(/<div[^>]*(?:id|class)="[^"]*(?:job_description|jobDescription|job-description|jobdescription)[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]||html;return{id:j.id,title:j.title,content,location:{name:j.location},absolute_url:j.url};})).filter(Boolean);}
export async function readEnergySource(src){if(src[0]==='wd')return workday(src);if(src[0]==='sf')return successFactors(src);return direct(src);}
