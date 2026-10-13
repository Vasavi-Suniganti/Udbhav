import type { Challenge } from '@/types';
import { JHARKHAND_DISTRICTS } from '@/data/demo';

export interface AssistantMessage { role: 'user' | 'assistant'; content: string; }
export interface AssistantCard { id: string; title: string; district: string; priority: string; status: string; stage: string; progress: number; distanceKm?: number; }
export interface AssistantResponse { answer: string; cards: AssistantCard[]; grounded: boolean; sourceCount: number; }
export type AssistantIntent = 'COMMUNITY_OVERVIEW'|'HIGH_PRIORITY'|'CRITICAL_PROBLEMS'|'NEAR_ME'|'DISTRICT_PROBLEMS'|'DOMAIN_PROBLEMS'|'UNIVERSITY_SUPPORT'|'INDUSTRY_SUPPORT'|'GOVERNMENT_VERIFICATION'|'UNRESOLVED_PROBLEMS'|'RESOLVED_PROBLEMS'|'PROJECT_PROGRESS'|'COMMUNITY_PRIORITY'|'MY_PROBLEMS'|'PROBLEM_STATUS'|'PROBLEM_DETAILS'|'GENERAL';

type RecordProblem = Challenge & Record<string, any>;
type Problem = { id:string; title:string; description:string; category:string; subcategory:string; priority:string; score:number; district:string; block:string; village:string; latitude?:number; longitude?:number; governmentStatus:string; stage:string; progress:number; university?:string; faculty?:string; industry?:string; industryMentor?:string; support:number; comments:number; createdAt:string; raw:RecordProblem; };
type Location = { latitude:number; longitude:number };
type QueryResult = { intent:AssistantIntent; filters:Record<string, unknown>; all:Problem[]; matching:Problem[]; location?:Location; locationUnavailable?:boolean };

const aliases:Record<string,string[]> = {
 water:['water','drinking','contamination','जल','পানি'], healthcare:['health','healthcare','hospital','medicine','स्वास्थ्य'], education:['education','school','college','student','शिक्षा'], agriculture:['agriculture','farming','crop','कृषि'], transport:['transport','road','traffic','footpath','सड़क'], sanitation:['sanitation','toilet','sewage','स्वच्छता'], waste:['waste','garbage','collection','कचरा'], energy:['energy','electricity','solar','ऊर्जा'], environment:['environment','forest','pollution','पर्यावरण'],
};
const lower=(value:unknown)=>String(value??'').toLowerCase();
const any=(text:string, values:string[])=>values.some(value=>text.includes(value));
const value=(record:Record<string,any>, keys:string[])=>keys.map(key=>record[key]).find(item=>item!==undefined&&item!==null&&item!=='');
const number=(item:unknown, fallback=0)=>Number.isFinite(Number(item))?Number(item):fallback;

function normalize(input:Challenge):Problem {
 const raw=input as RecordProblem; const location=raw.location||{};
 const score=number(value(raw,['priority_score','priorityScore']),0);
 const priority=String(value(raw,['priority_level','priorityLevel'])|| (score>=85?'CRITICAL':score>=70?'HIGH':score>=50?'MEDIUM':'LOW')).toUpperCase();
 const university=value(raw,['universityName','university','assignedUniversityName','assigned_university_name']);
 const industry=value(raw,['industryPartnerName','industryPartner','industry','industryName']);
 return {id:String(raw.id),title:String(raw.title||'Untitled problem'),description:String(raw.description||''),category:String(value(raw,['domain','category','ai_domain'])||'Other'),subcategory:String(value(raw,['subdomain','subcategory'])||''),priority,score,district:String(raw.district||location.district||''),block:String(raw.block||location.block||''),village:String(raw.village||location.village||''),latitude:number(value(raw,['latitude','lat'])??location.latitude,NaN),longitude:number(value(raw,['longitude','lng','lon'])??location.longitude,NaN),governmentStatus:String(value(raw,['governmentVerificationStatus','government_status','verificationStatus','status'])||raw.status||'UNKNOWN'),stage:String(value(raw,['currentStage','current_stage','stage','status'])||raw.status||'UNKNOWN'),progress:number(value(raw,['progress','progressPercent']),0),university:university?String(university):undefined,faculty:value(raw,['facultyMentorName','facultyMentor','faculty_mentor']) as string|undefined,industry:industry?String(industry):undefined,industryMentor:value(raw,['industryMentorName','industryMentor','industry_mentor']) as string|undefined,support:number(value(raw,['communitySupportCount','communitySupport','supportCount']),0),comments:number(value(raw,['communityCommentCount','communityComments','commentCount']),0),createdAt:String(value(raw,['created_at','createdAt'])||''),raw};
}

function classify(question:string) {
 const text=question.toLowerCase(); const district=JHARKHAND_DISTRICTS.find(item=>text.includes(item.name.toLowerCase()))?.name; const category=Object.keys(aliases).find(key=>any(text,aliases[key]));
 const priority=any(text,['critical','urgent','most serious','highest priority'])?'CRITICAL_OR_HIGH':['high','medium','low'].find(item=>text.includes(item))?.toUpperCase();
 const own=any(text,['my problem','my problems','what did i report','i reported','mine','मेरी']); const near=any(text,['near me','nearby','closest','nearest','around me']);
 const university=any(text,['university','universities','student support','faculty','academic','college']); const industry=any(text,['industry','industries','company','companies','partner','funding','technical support']);
 const resolved=any(text,['resolved','closed','completed','already fixed']); const unresolved=any(text,['unresolved','not resolved','pending','active','still open','awaiting']);
 let intent:AssistantIntent='GENERAL';
 if(own)intent='MY_PROBLEMS'; else if(near)intent='NEAR_ME'; else if(university)intent='UNIVERSITY_SUPPORT'; else if(industry)intent='INDUSTRY_SUPPORT'; else if(resolved)intent='RESOLVED_PROBLEMS'; else if(unresolved)intent='UNRESOLVED_PROBLEMS'; else if(any(text,['government verified','verified by government','verification']))intent='GOVERNMENT_VERIFICATION'; else if(any(text,['progress','field testing','project stage','in progress']))intent='PROJECT_PROGRESS'; else if(any(text,['community priority','most supported','support count']))intent='COMMUNITY_PRIORITY'; else if(any(text,['biggest','major','common','overview','overall','how many challenges']))intent='COMMUNITY_OVERVIEW'; else if(priority==='CRITICAL_OR_HIGH')intent=any(text,['critical','urgent','most serious'])?'CRITICAL_PROBLEMS':'HIGH_PRIORITY'; else if(district)intent='DISTRICT_PROBLEMS'; else if(category)intent='DOMAIN_PROBLEMS'; else if(any(text,['status','stage','details','tell me about']))intent='PROBLEM_STATUS';
 return {intent,own,district,category,priority,resolved,unresolved,university,industry};
}

function categoryMatches(problem:Problem, category?:string) { return !category || any(`${problem.category} ${problem.subcategory} ${problem.title} ${problem.description}`.toLowerCase(),aliases[category]||[category]); }
function universityMatches(problem:Problem) { const raw=problem.raw; return Boolean(problem.university||problem.faculty||raw.assigned_organization_id&&/university|college|institute/i.test(String(raw.assigned_organization_name||raw.organization_name||''))||/research|university|academic|student/i.test(`${problem.category} ${problem.description} ${(raw.ai_required_expertise||[]).join(' ')}`)); }
function industryMatches(problem:Problem) { return Boolean(problem.industry||problem.industryMentor||value(problem.raw,['industrySupport','industry_support','industryPartnerId','industry_partner_id'])); }
function resolved(problem:Problem) { return ['RESOLVED','CLOSED','COMPLETED','DEPLOYED'].some(item=>`${problem.governmentStatus} ${problem.stage}`.toUpperCase().includes(item)); }
function verified(problem:Problem) { return ['VERIFIED','VALIDATED','OPEN_FOR_INSTITUTIONS','ASSIGNED'].some(item=>problem.governmentStatus.toUpperCase().includes(item)||problem.stage.toUpperCase().includes(item)); }
function distance(a:Location,b:Problem) { const rad=(x:number)=>x*Math.PI/180; const earth=6371; const lat=rad((b.latitude as number)-a.latitude); const lon=rad((b.longitude as number)-a.longitude); const x=Math.sin(lat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude as number))*Math.sin(lon/2)**2; return earth*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); }
async function browserLocation():Promise<Location|undefined> { if(typeof navigator==='undefined'||!navigator.geolocation)return undefined; return new Promise(resolve=>navigator.geolocation.getCurrentPosition(position=>resolve({latitude:position.coords.latitude,longitude:position.coords.longitude}),()=>resolve(undefined),{enableHighAccuracy:false,timeout:5000,maximumAge:300000})); }

export async function analyzeQuestion(question:string, problems:Challenge[], userId?:string, location?:Location):Promise<QueryResult> {
 const filter=classify(question); const all=problems.filter(problem=>problem.title&&problem.title!=='Untitled problem').map(normalize);
 let matching=filter.own?all.filter(problem=>problem.raw.submitted_by===userId||problem.raw.reporterId===userId||problem.raw.submittedBy===userId):all;
 if(filter.district)matching=matching.filter(problem=>problem.district.toLowerCase()===filter.district!.toLowerCase());
 if(filter.category)matching=matching.filter(problem=>categoryMatches(problem,filter.category));
 if(filter.priority==='CRITICAL_OR_HIGH')matching=matching.filter(problem=>['CRITICAL','HIGH'].includes(problem.priority)); else if(filter.priority)matching=matching.filter(problem=>problem.priority===filter.priority);
 if(filter.university)matching=matching.filter(universityMatches); if(filter.industry)matching=matching.filter(industryMatches); if(filter.resolved)matching=matching.filter(resolved); if(filter.unresolved)matching=matching.filter(problem=>!resolved(problem));
 if(filter.intent==='GOVERNMENT_VERIFICATION')matching=matching.filter(verified); if(filter.intent==='COMMUNITY_PRIORITY')matching.sort((a,b)=>b.support+b.score-a.support-a.score); if(filter.intent==='HIGH_PRIORITY'||filter.intent==='CRITICAL_PROBLEMS')matching.sort((a,b)=>b.score-a.score);
 if(filter.intent==='NEAR_ME'&&location)matching=matching.filter(problem=>Number.isFinite(problem.latitude)&&Number.isFinite(problem.longitude)).map(problem=>({...problem,distance:distance(location,problem)} as Problem&{distance:number})).sort((a,b)=>a.distance-b.distance);
 return {intent:filter.intent,filters:filter,all,matching,location,locationUnavailable:filter.intent==='NEAR_ME'&&!location};
}

function card(problem:Problem):AssistantCard { const km=(problem as Problem&{distance?:number}).distance; return {id:problem.id,title:problem.title,district:problem.district||'Location unavailable',priority:problem.priority,status:problem.governmentStatus,stage:problem.stage,progress:problem.progress,...(km!==undefined?{distanceKm:Number(km.toFixed(1))}:{})}; }
function lines(problems:Problem[]) { return problems.slice(0,8).map((problem,index)=>`${index+1}. ${problem.title} — ${problem.district||'location unavailable'} · ${problem.priority}`).join('\n'); }
function localAnswer(result:QueryResult):AssistantResponse {
 const {intent,matching,all}=result; if(result.locationUnavailable)return {answer:"I can show relevant community problems, but I don't currently have your location, so I cannot calculate which are nearest to you. Please allow location access and try again.",cards:[],grounded:true,sourceCount:0}; if(!matching.length)return {answer:"I couldn't find any matching problems in the current UDBHAV data.",cards:[],grounded:true,sourceCount:0};
 const active=all.filter(problem=>!resolved(problem)); const categories=[...new Set(all.map(problem=>problem.category))].map(category=>`${category} (${all.filter(problem=>problem.category===category).length})`).sort((a,b)=>Number(b.match(/\d+/)?.[0])-Number(a.match(/\d+/)?.[0])); let answer='';
 switch(intent) {
  case 'COMMUNITY_OVERVIEW':answer=`Based on the current UDBHAV records, the main community challenges are ${categories.slice(0,5).join(', ')}.\n\nI found ${active.length} active community problem record${active.length===1?'':'s'} out of ${all.length} accessible records.`;break;
  case 'HIGH_PRIORITY':answer=`I found ${matching.length} high-priority challenge${matching.length===1?'':'s'}:\n${lines(matching)}`;break;
  case 'CRITICAL_PROBLEMS':answer=`I found ${matching.length} critical or urgent challenge${matching.length===1?'':'s'}:\n${lines(matching)}`;break;
  case 'NEAR_ME':answer=`I found ${matching.length} relevant challenge${matching.length===1?'':'s'} near your location:\n${matching.slice(0,8).map((problem,index)=>`${index+1}. ${problem.title} — ${(problem as Problem&{distance:number}).distance.toFixed(1)} km away · ${problem.district} · ${problem.priority}`).join('\n')}`;break;
  case 'UNIVERSITY_SUPPORT':answer=`These ${matching.length} problem${matching.length===1?'':'s'} currently require or could benefit from university support:\n${lines(matching)}`;break;
  case 'INDUSTRY_SUPPORT':answer=`The following ${matching.length} challenge${matching.length===1?'':'s'} currently have industry involvement:\n${lines(matching)}`;break;
  case 'UNRESOLVED_PROBLEMS':answer=`There are ${matching.length} unresolved challenge${matching.length===1?'':'s'} currently in the dataset:\n${lines(matching)}`;break;
  case 'RESOLVED_PROBLEMS':answer=`I found ${matching.length} resolved, closed, completed, or deployed problem${matching.length===1?'':'s'}:\n${lines(matching)}`;break;
  case 'GOVERNMENT_VERIFICATION':answer=`${matching.length} problem${matching.length===1?'':'s'} have government verification or a validated workflow status:\n${lines(matching)}`;break;
  case 'PROJECT_PROGRESS':answer=`Here is the current project progress for ${matching.length} matching problem${matching.length===1?'':'s'}:\n${matching.slice(0,8).map((problem,index)=>`${index+1}. ${problem.title} — ${problem.stage}, ${problem.progress}% progress`).join('\n')}`;break;
  case 'MY_PROBLEMS':answer=`You have reported ${matching.length} problem${matching.length===1?'':'s'}:\n${lines(matching)}`;break;
  case 'COMMUNITY_PRIORITY':answer=`The current community priority order is:\n${lines(matching)}`;break;
  default:answer=`I found ${matching.length} matching problem${matching.length===1?'':'s'} in the current UDBHAV data:\n${lines(matching)}`;
 }
 return {answer,cards:matching.slice(0,10).map(card),grounded:true,sourceCount:matching.length};
}

export async function askJanSamadhanAssistant(question:string, problems:Challenge[], userId:string|undefined, history:AssistantMessage[]=[]):Promise<AssistantResponse> {
 const initial=classify(question); const location=initial.intent==='NEAR_ME'?await browserLocation():undefined; const result=await analyzeQuestion(question,problems,userId,location);
 if(import.meta.env.DEV)console.debug('[JanSamadhan AI]',{intent:result.intent,filters:result.filters,recordsFound:result.all.length,matchedRecords:result.matching.length,locationUsed:Boolean(result.location)});
 const endpoint=import.meta.env.VITE_AI_API_URL as string|undefined; if(!endpoint)return localAnswer(result);
 const context=result.matching.map(problem=>({id:problem.id,title:problem.title,description:problem.description,category:problem.category,subcategory:problem.subcategory,priority:problem.priority,priorityScore:problem.score,district:problem.district,block:problem.block,village:problem.village,latitude:problem.latitude,longitude:problem.longitude,governmentStatus:problem.governmentStatus,currentStage:problem.stage,progress:problem.progress,university:problem.university,facultyMentor:problem.faculty,industry:problem.industry,industryMentor:problem.industryMentor,communitySupport:problem.support,createdAt:problem.createdAt}));
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,intent:result.intent,filters:result.filters,totalCommunityProblems:result.all.length,matchingProblemCount:result.matching.length,context,history:history.filter(message=>message.role==='user').slice(-6),instructions:'Answer ONLY using the supplied JanSamadhan data. Answer the exact question and use the detected intent. Do not invent facts. If there are no matching records, say so clearly.'})});
 if(!response.ok)return localAnswer(result); const payload=await response.json() as {answer?:string;response?:string}; if(!payload.answer&&!payload.response)return localAnswer(result);
 return {answer:payload.answer||payload.response||'',cards:result.matching.slice(0,10).map(card),grounded:true,sourceCount:result.matching.length};
}
