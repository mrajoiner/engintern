export function plain(value='') {
 return value.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;|&#160;/g,' ').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&rsquo;|&#8217;/g,'’').replace(/&ndash;|&mdash;|&#8211;|&#8212;/g,'–').replace(/\s+/g,' ').trim();
}
const clip=(s,n=48)=>s.split(/\s+/).slice(0,n).join(' ')+(s.split(/\s+/).length>n?'…':'');
export function extractDetails(raw,title){
 const html=raw.replace(/&lt;/g,'<').replace(/&gt;/g,'>');
 const blocks=[...html.matchAll(/<(h[1-6]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(m=>({tag:m[1],text:plain(m[2])})).filter(x=>x.text);
 const sections={responsibilities:[],requirements:[],preferred:[],benefits:[]};let active=null;
 for(const b of blocks){
  const t=b.text;
  if(t.length<200&&/regular,? full.time employees/i.test(t)){active=null;continue;}
  if(t.length<180&&/^(what you(?:’|')ll get to do|what you actually do|what you will do|key responsibilities|responsibilities|the role|a day in the life|learning objectives|your (?:role|responsibilities)|what you(?:’|')ll do)\b/i.test(t)){active='responsibilities';continue;}
  if(t.length<180&&/^(what sets you apart|what makes you stand out.*preferred|preferred qualifications|bonus qualifications|these qualifications.*nice|nice.to.have)/i.test(t)){active='preferred';continue;}
  if(t.length<180&&/^(what you must have|what you(?:’|')ll bring.*required|additional requirements|basic qualifications|required qualifications|preferred qualifications|qualifications|you(?:’|')ll bring|these qualifications|necessary qualifications|you are|skills\/qualifications|what (?:we(?:’|')re looking for|you(?:’|')ll bring)|required skills|who you are|bonus qualifications)\b/i.test(t)){active='requirements';continue;}
  if(t.length<150&&/^(compensation|what we can offer|benefits|what we offer|pay range)\b/i.test(t)){active='benefits';continue;}
  if(b.tag.startsWith('h')){active=null;continue;}
  if(active&&!(/:$/).test(t)&&!(b.tag==='p'&&active==='requirements'&&t.length>220)&&(b.tag==='li'?t.length>3:t.length>22)&&sections[active].length<5&&!/equal opportunity|discriminat|privacy notice/i.test(t))sections[active].push(clip(t,42));
 }
 const text=plain(raw),seasons=[...new Set((title.match(/spring|summer|fall|winter/gi)||[]).map(s=>s[0].toUpperCase()+s.slice(1).toLowerCase()))];
 const duration=text.match(/\b\d{1,2}(?:[-–]\d{1,2})?[- ](?:consecutive )?weeks?\b/i);
 const hours=text.match(/\b40\+?\s*(?:hrs?|hours?)\s*(?:of weekly availability|(?:\/|per |a )\s*week)\b/i);
 const gpa=text.match(/(?:GPA (?:of |requirement:? )?(?:at least )?(\d\.\d)|(?:cumulative )?(\d\.\d)(?:\s*(?:out of|\/).*?)?\s*(?:or greater )?GPA)/i);
 const dates=text.match(/(?:beginning|starting|running|take place from|internship duration:)\s+((?:May|June|July|August|January|February|March|April|September|October|November|December)[^.!]{4,85})/i);
 let summary=blocks.find(b=>b.tag==='p'&&/^(as (?:an?|the)|in this role|join our|this internship|as part of)/i.test(b.text)&&b.text.length>70)?.text;
 if(!summary)summary=blocks.find(b=>b.tag==='p'&&/internship|intern |this role|this position/i.test(b.text)&&b.text.length>90)?.text||sections.responsibilities.find(s=>s.length>65)||blocks.find(b=>b.tag==='p'&&b.text.length>100&&!/equal opportunity|privacy|was founded|about /i.test(b.text))?.text||text;
 return {...sections,overview:clip(summary,85),duration:duration?duration[0].replace(/week$/i,'weeks').replace(/(\d)-weeks$/i,'$1 weeks'):null,hours:hours?.[0]||null,startDates:dates?.[1]?(dates[1].includes('2027')?dates[1].split('2027')[0]+'2027':dates[1].split(/\s+[A-Z]{3}/)[0].trim()):null,minGpa:gpa?.[1]||gpa?.[2]||null,season:seasons.length?seasons.join(' / ')+' 2027':null,arrangement:/\b(?:on-site|onsite|on site)\b/i.test(text)?'On-site':/\bhybrid\b/i.test(text)?'Hybrid':/fully remote|remote position|remote role/i.test(text)?'Remote':'See employer posting'};
}

export function extractPay(text,range){
 if(range?.min){const interval=/hour/i.test(range.interval||'')?' / hr':/year|annual/i.test(range.interval||'')?' / yr':'';return '$'+range.min+(range.max&&range.max!==range.min?'–$'+range.max:'')+interval;}
 const marker=text.match(/(?:base pay range|pay range|pay rate|salary range|compensation range|compensation (?:and |&amp; |& )?(?:other )?benefits)/i);
 if(!marker)return 'See employer posting';
 const section=text.slice(marker.index,marker.index+1200);
 const amount=section.match(/\$\s*\d[\d,]*(?:\.\d{1,2})?(?:\s*(?:-|–|—|to)\s*\$?\s*\d[\d,]*(?:\.\d{1,2})?)?/);
 if(!amount)return 'See employer posting';
 const nearby=section.slice(Math.max(0,amount.index-30),amount.index+amount[0].length+55);
 let label=amount[0].replace(/\s+/g,' ').trim();
 return label+(/hour|hourly/i.test(nearby)?' / hr':/year|annual/i.test(nearby)?' / yr':/bi.?weekly/i.test(nearby)?' / 2 weeks':/monthly|month/i.test(nearby)?' / month':/weekly|week/i.test(nearby)?' / week':' (pay period not listed)');
}
