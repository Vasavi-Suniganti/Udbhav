import {AnimatePresence,motion} from 'framer-motion';
import {useEffect,useState} from 'react';
import {Check,CheckCircle2,FileText,Target,Download,Trash2,RefreshCw,X,MapPin,Building2,BriefcaseBusiness} from 'lucide-react';
import {Card,EmptyState,SectionHeader} from '@/components/ui';
import { NotificationDetailsModal } from '@/components/notifications/NotificationDetailsModal';
import {usePlatform} from '@/context/PlatformContext';
import {useAuth} from '@/context/AuthContext';
import {api} from '@/lib/api';
import {registerPushToken} from '@/lib/firebase';
import {formatCurrency,formatNumber,timeAgo} from '@/lib/constants';
import {JHARKHAND_DISTRICTS} from '@/data/demo';
import type { Notification } from '@/types';

interface SimplePageProps{onNavigate:(route:string)=>void}
export function SolutionsPage({onNavigate}:SimplePageProps){
  const {challenges}=usePlatform(); const {profile}=useAuth();
  const [solutions,setSolutions]=useState<any[]>([]),[selected,setSelected]=useState<any|null>(null),[candidates,setCandidates]=useState<any[]>([]),[target,setTarget]=useState(''),[mode,setMode]=useState<'REUSE'|'ADAPT'|'FORK'>('ADAPT'),[notes,setNotes]=useState(''),[msg,setMsg]=useState('');
  const canManage=['DISTRICT_OFFICER','GOVERNMENT_OFFICER','PLATFORM_ADMIN','SUPER_ADMIN'].includes(profile?.role||'');
  const load=()=>api.solutions().then(setSolutions).catch(e=>setMsg(e.message)); useEffect(()=>{load()},[]);
  async function findSimilar(sol:any,refresh=false){setSelected(sol);setMsg('');try{const rows=refresh?await api.refreshReplication(sol.id):await api.similarChallenges(sol.id);setCandidates(rows)}catch(e){setMsg((e as Error).message)}}
  async function reuse(){if(!selected||!target)return;setMsg('');try{await api.requestReuse(selected.id,{targetChallengeId:target,mode,notes});setMsg(`${mode} request created for human review.`);setTarget('');setNotes('')}catch(e){setMsg((e as Error).message)}}
  const openTargets=challenges.filter(c=>!['ASSIGNED','MERGED','REJECTED'].includes(c.status));
  return <div className="civic-page space-y-5"><SectionHeader title="Solution Knowledge Repository" subtitle="Verified deployment knowledge can be compared, adapted, forked and proposed for cross-district replication after human review."/>{msg&&<p className="rounded-lg border bg-white p-3 text-sm text-neutral-600">{msg}</p>}{solutions.length===0?<EmptyState icon={<Target size={40}/>} title="No reusable solutions yet" description="Projects can publish a reusable solution after verified testing and impact evidence."/>:<div className="grid md:grid-cols-2 gap-5">{solutions.map(sol=><Card key={sol.id} className="p-5" hover><div className="flex justify-between gap-2"><span className="badge bg-primary-50 text-primary-700">{(sol.domains||[]).join(', ')||'Cross-domain'}</span>{sol.reusable&&<span className="badge bg-success-50 text-success-700"><CheckCircle2 size={12}/> Reusable</span>}</div><h3 className="font-semibold mt-3">{sol.title}</h3><p className="text-sm text-neutral-500 mt-2">{sol.solution}</p><div className="grid grid-cols-3 gap-2 mt-4 text-xs"><div className="rounded-lg bg-neutral-50 p-2 text-center">Cost<br/><b>{formatCurrency(sol.cost||0)}</b></div><div className="rounded-lg bg-neutral-50 p-2 text-center">Districts<br/><b>{sol.districts?.length||0}</b></div><div className="rounded-lg bg-neutral-50 p-2 text-center">License<br/><b>{sol.licensingStatus||'Review'}</b></div></div><div className="flex flex-wrap gap-2 mt-4"><button className="btn-secondary" onClick={()=>findSimilar(sol)}>Find similar challenges</button>{canManage&&<button className="btn-secondary" onClick={()=>findSimilar(sol,true)}>Refresh replication</button>}<button className="btn-ghost" onClick={()=>onNavigate('/dashboard/projects')}>Open workspace</button></div></Card>)}</div>}
  {selected&&<Card className="p-5"><SectionHeader title={`Reuse / adaptation review — ${selected.title}`} subtitle="AI similarity is advisory. Government or an authorized replication manager chooses whether to reuse, adapt or fork a solution."/><div className="grid lg:grid-cols-2 gap-5"><div><h3 className="text-sm font-semibold mb-2">Suggested unresolved challenges</h3>{candidates.length===0?<p className="text-sm text-neutral-400">No high-confidence candidates returned.</p>:<div className="space-y-2">{candidates.slice(0,8).map(c=><button key={c.challengeId} onClick={()=>setTarget(c.challengeId)} className={`w-full rounded-lg border p-3 text-left ${target===c.challengeId?'border-primary-500 bg-primary-50':'border-neutral-200'}`}><b className="text-sm">{c.title}</b><p className="text-xs text-neutral-500">{c.district} · similarity {Math.round((c.similarity||0)*100)}% {c.locationDistanceKm!=null?`· ${c.locationDistanceKm} km`:''}</p></button>)}</div>}</div><div className="space-y-3"><label className="label">Target challenge</label><select className="input" value={target} onChange={e=>setTarget(e.target.value)}><option value="">Select challenge</option>{openTargets.map(c=><option key={c.id} value={c.id}>{c.public_id||c.id} — {c.title}</option>)}</select><label className="label">Reuse mode</label><select className="input" value={mode} onChange={e=>setMode(e.target.value as any)}><option>REUSE</option><option>ADAPT</option><option>FORK</option></select><textarea className="input" rows={4} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Adaptation conditions, licensing notes, local constraints…"/>{canManage?<button className="btn-primary" onClick={reuse} disabled={!target}>Create reviewed replication request</button>:<p className="text-xs text-neutral-500">Only authorized government/replication roles can create replication requests.</p>}</div></div></Card>}
  </div>
}
export function ImpactPage({onNavigate}:SimplePageProps){const{projects}=usePlatform();const[bundles,setBundles]=useState<any[]>([]);useEffect(()=>{Promise.all(projects.slice(0,20).map(p=>api.project(p.id).catch(()=>null))).then(x=>setBundles(x.filter(Boolean)))},[projects]);const impacts=bundles.flatMap(x=>x.impact||[]),feedback=bundles.flatMap(x=>x.feedback||[]);return <div className="civic-page space-y-6"><SectionHeader title="Verified Impact Dashboard" subtitle="Before/after measurements and community feedback are separated from unverified project claims."/><Card className="p-5"><SectionHeader title="Before / After Metrics" subtitle={`${impacts.filter((x:any)=>x.verified).length} verified measurements`}/>{impacts.length===0?<p className="text-sm text-neutral-400">No impact records yet.</p>:<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{impacts.map((m:any)=><div key={m.id} className="rounded-lg border p-4"><div className="flex justify-between"><b className="text-sm">{m.metric}</b><span className={`badge ${m.verified?'bg-success-50 text-success-700':'bg-amber-50 text-amber-700'}`}>{m.verified?'Verified':'Pending'}</span></div><div className="grid grid-cols-2 gap-2 mt-3"><div className="rounded-lg bg-neutral-50 p-3 text-center"><span className="text-xs text-neutral-400">Before</span><p className="font-semibold">{m.before} {m.unit}</p></div><div className="rounded-lg bg-success-50 p-3 text-center"><span className="text-xs text-success-600">After</span><p className="font-semibold text-success-700">{m.after} {m.unit}</p></div></div></div>)}</div>}</Card><Card className="p-5"><SectionHeader title="Community Validation" subtitle={`${feedback.length} responses`}/><div className="space-y-2">{feedback.map((f:any)=><div key={f.id} className="rounded-lg border p-3"><div className="flex justify-between"><b className="text-sm">Community participant</b><span className="badge bg-primary-50 text-primary-700">{f.outcome.replaceAll('_',' ')}</span></div><p className="text-sm text-neutral-600 mt-1">{f.comment}</p></div>)}</div></Card></div>}
export function MapPage({onNavigate}:SimplePageProps){
  const {challenges,universities,clusters,loading,error,refresh}=usePlatform();
  const [district,setDistrict]=useState('ALL'),[domain,setDomain]=useState('ALL'),[priority,setPriority]=useState('ALL'),[status,setStatus]=useState('ALL'),[selected,setSelected]=useState<any|null>(null),[hotspot,setHotspot]=useState<string|null>(null);
  const bounds={minLat:21.8,maxLat:25.5,minLng:83.2,maxLng:87.9};
  const liveProblems=challenges.filter(c=>c.source==='firestore');
  const source=liveProblems.length?liveProblems:challenges;
  const stageLabel=(challenge:any)=>String(challenge.currentStage||challenge.status||'REPORTED').replaceAll('_',' ');
  const statusKey=(challenge:any)=>challenge.currentStage||challenge.status||'REPORTED';
  const statusOptions=[['REPORTED','Reported'],['AI_ANALYSIS','AI Analysis'],['PENDING_VALIDATION','Government Verification'],['GOVERNMENT_VERIFIED','Verified'],['UNIVERSITY_ASSIGNED','University Assigned'],['FACULTY_MENTOR_ASSIGNED','Faculty Mentor Assigned'],['INDUSTRY_MENTOR_ASSIGNED','Industry Mentor Assigned'],['SOLUTION_DEVELOPMENT','Solution Development'],['PROTOTYPE','Prototype'],['FIELD_TESTING','Field Testing'],['DEPLOYMENT','Deployment'],['RESOLVED','Resolved']];
  const filtered=source.filter(c=>(district==='ALL'||c.district===district)&&(domain==='ALL'||c.domain===domain)&&(priority==='ALL'||c.priority_level===priority)&&(status==='ALL'||statusKey(c)===status)&&c.latitude!=null&&c.longitude!=null);
  const pos=(lat:number,lng:number)=>({left:`${Math.max(1,Math.min(99,(lng-bounds.minLng)/(bounds.maxLng-bounds.minLng)*100))}%`,top:`${Math.max(1,Math.min(99,(bounds.maxLat-lat)/(bounds.maxLat-bounds.minLat)*100))}%`});
  const markerClass=(level:string)=>level==='CRITICAL'?'bg-red-600':level==='HIGH'?'bg-orange-500':level==='MEDIUM'?'bg-yellow-500':'bg-teal-600';
  const districts=[...new Set(source.map(c=>c.district).filter(Boolean))].sort();
  const domains=[...new Set(source.map(c=>c.domain).filter(Boolean))].sort();
  const hotspotRows=source.filter(c=>c.latitude!=null&&c.longitude!=null).reduce((rows:any[],challenge:any)=>{const key=`${challenge.district}|${challenge.domain}`;const row=rows.find(item=>item.key===key);if(row){row.count+=1;row.problems.push(challenge)}else rows.push({key,district:challenge.district,domain:challenge.domain,count:1,problems:[challenge]});return rows},[]).sort((a,b)=>b.count-a.count).slice(0,5);
  const visibleHotspot=hotspotRows.find(row=>row.key===hotspot);
  if(loading&&!source.length)return <div className="civic-page"><SectionHeader title="Jharkhand Innovation GIS" subtitle="Loading innovation map..."/><Card className="p-8 text-center text-sm text-neutral-500">Loading innovation map...</Card></div>;
  if(error&&!source.length)return <div className="civic-page"><SectionHeader title="Jharkhand Innovation GIS"/><Card className="p-8 text-center"><p className="text-sm text-error-600">Unable to load innovation data right now.</p><button className="btn-secondary mt-4" onClick={()=>void refresh()}>Retry</button></Card></div>;
  return <div className="civic-page"><SectionHeader title="Jharkhand Innovation GIS" subtitle="Live problem locations, collaboration signals and solution progress from the shared Firestore data."/><div className="grid lg:grid-cols-4 gap-5"><Card className="lg:col-span-3 overflow-hidden relative min-h-[540px]"><iframe title="OpenStreetMap Jharkhand" className="absolute inset-0 w-full h-full border-0 opacity-75" src="https://www.openstreetmap.org/export/embed.html?bbox=83.2%2C21.8%2C87.9%2C25.5&layer=mapnik"/><div className="absolute inset-0 pointer-events-none">{filtered.map(c=><button aria-label={`Open ${c.title}`} title={`${c.title} - ${c.district}`} key={c.id} style={pos(c.latitude!,c.longitude!)} className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full ${markerClass(c.priority_level)} border-2 border-white shadow-lg`} onClick={()=>setSelected(c)}><MapPin size={12} className="text-white mx-auto" fill="currentColor"/></button>)}{universities.filter((u:any)=>u.latitude&&u.longitude).map((u:any)=><button aria-label={`Open ${u.name}`} key={u.id} title={u.name} style={pos(u.latitude,u.longitude)} className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-sm bg-primary-600 border-2 border-white shadow" onClick={()=>setSelected({institution:u})}><Building2 size={12} className="text-white mx-auto"/></button>)}</div><div className="absolute left-3 bottom-3 bg-white/95 rounded-lg border p-2 text-xs shadow"><span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500 mr-1"/> Challenge <span className="inline-block w-2.5 h-2.5 rounded-sm bg-primary-600 ml-3 mr-1"/> University <span className="inline-block w-2.5 h-2.5 rounded-full bg-violet-600 ml-3 mr-1"/> Industry</div>{selected&&!selected.institution&&<div className="absolute left-3 top-3 z-10 w-72 max-w-[calc(100%-1.5rem)] rounded-xl border border-neutral-200 bg-[#fffaf0]/95 p-4 shadow-xl"><button className="float-right text-neutral-500" onClick={()=>setSelected(null)} aria-label="Close problem popup"><X size={16}/></button><span className={`badge ${markerClass(selected.priority_level)} text-white`}>{selected.priority_level}</span><h3 className="font-bold text-primary-900 mt-2 pr-5">{selected.title}</h3><p className="text-xs text-neutral-500 mt-1"><MapPin size={12} className="inline"/> {selected.district}{selected.village?`, ${selected.village}`:''}</p><div className="grid grid-cols-2 gap-2 mt-3 text-xs"><span>Government<br/><b>{selected.governmentVerificationStatus||selected.status}</b></span><span>Stage<br/><b>{stageLabel(selected)}</b></span><span>Progress<br/><b>{selected.progress??0}%</b></span><span>Support<br/><b>{selected.communitySupportCount??0}</b></span></div>{selected.universityName&&<p className="text-xs mt-3"><Building2 size={12} className="inline"/> {selected.universityName}</p>}{selected.industryPartnerName&&<p className="text-xs mt-1"><BriefcaseBusiness size={12} className="inline"/> {selected.industryPartnerName}</p>}<button className="btn-primary !py-2 !px-3 mt-3 text-xs" onClick={()=>onNavigate('/dashboard/challenges')}>View Problem</button></div>}{selected?.institution&&<div className="absolute left-3 top-3 z-10 w-72 rounded-xl border border-neutral-200 bg-[#fffaf0]/95 p-4 shadow-xl"><button className="float-right text-neutral-500" onClick={()=>setSelected(null)} aria-label="Close institution popup"><X size={16}/></button><h3 className="font-bold text-primary-900 pr-5">{selected.institution.name}</h3><p className="text-xs text-neutral-500 mt-1">University / Institution</p><p className="text-xs mt-3">Active challenges: {source.filter(c=>c.universityName===selected.institution.name).length}</p></div>}</Card><div className="space-y-4"><Card className="p-4"><h3 className="font-semibold text-sm mb-3">Filters</h3><select className="input mb-2" value={district} onChange={e=>{setDistrict(e.target.value);setHotspot(null)}}><option value="ALL">All districts</option>{districts.map(x=><option key={x}>{x}</option>)}</select><select className="input mb-2" value={domain} onChange={e=>setDomain(e.target.value)}><option value="ALL">All domains</option>{domains.map(x=><option key={x}>{x}</option>)}</select><select className="input mb-2" value={priority} onChange={e=>setPriority(e.target.value)}><option value="ALL">All priorities</option>{['CRITICAL','HIGH','MEDIUM','LOW'].map(x=><option key={x}>{x}</option>)}</select><select className="input" value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">All statuses</option>{statusOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><p className="text-xs text-neutral-400 mt-3">{filtered.length} geolocated reports visible</p><button className="btn-ghost text-xs mt-2" onClick={()=>{setDistrict('ALL');setDomain('ALL');setPriority('ALL');setStatus('ALL');setHotspot(null)}}>Clear Filters</button></Card><Card className="p-4"><h3 className="font-semibold text-sm mb-2">Emerging hotspots</h3>{hotspotRows.length?hotspotRows.map(row=><button className={`w-full text-left py-2 border-b last:border-0 ${hotspot===row.key?'bg-primary-50':''}`} key={row.key} onClick={()=>{setHotspot(row.key);setDistrict(row.district);setDomain(row.domain)}}><b className="text-xs">{row.domain} - {row.district}</b><p className="text-[11px] text-neutral-400">{row.count} reports</p></button>):<p className="text-xs text-neutral-400">No hotspot data available.</p>}</Card></div></div>{!filtered.length&&<Card className="mt-4 p-5 text-center"><p className="text-sm text-neutral-600">No challenges match your selected filters.</p><button className="btn-secondary mt-3" onClick={()=>{setDistrict('ALL');setDomain('ALL');setPriority('ALL');setStatus('ALL')}}>Clear Filters</button></Card>}</div>}
export function ClustersPage({onNavigate}:SimplePageProps){const{clusters,refresh}=usePlatform();const[busy,setBusy]=useState(false);async function recompute(){setBusy(true);try{await api.refreshClusters();await refresh()}finally{setBusy(false)}}return <div className="civic-page"><SectionHeader title="Challenge Clusters & GeoAI" subtitle="Persistent domain/district clusters expose report density, trend and affected population." action={<button className="btn-secondary" onClick={recompute} disabled={busy}><RefreshCw size={14}/>{busy?'Refreshing…':'Recompute clusters'}</button>}/><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{clusters.map(c=><Card className="p-5" key={c.id}><div className="flex justify-between"><span className="badge bg-primary-50 text-primary-700">{c.domain}</span><span className={`badge ${c.trend==='INCREASING'?'bg-error-50 text-error-700':'bg-neutral-100 text-neutral-600'}`}>{c.trend}</span></div><h3 className="font-semibold mt-3">{c.title}</h3><div className="grid grid-cols-2 gap-2 text-xs mt-3"><div>Reports <b>{c.report_count}</b></div><div>Affected <b>{formatNumber(c.estimated_affected)}</b></div><div>Severity <b>{c.severity}</b></div><div>Growth <b>{c.growth_rate}%</b></div></div></Card>)}</div></div>}
export function ProfilePage({onNavigate}:SimplePageProps){
  const {profile}=useAuth();
  const [msg,setMsg]=useState('');
  const [confirmingDelete,setConfirmingDelete]=useState(false);
  const initials=(profile?.full_name||'User').split(' ').map((part)=>part[0]).slice(0,2).join('').toUpperCase();

  async function exp(){
    try {
      const x=await api.accountExport();
      const blob=new Blob([JSON.stringify(x,null,2)],{type:'application/json'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='udbhav-account-export.json';
      a.click();
      URL.revokeObjectURL(a.href);
      setMsg('Export generated.');
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function del(){
    try {
      await api.deleteAccount();
      setMsg('Deletion request completed.');
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="civic-page max-w-6xl space-y-5">
      <SectionHeader title="Profile & Privacy" subtitle="Privacy operations are handled by the trusted API and audit trail." />
      {msg && <div className="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700">{msg}</div>}

      <Card className="overflow-hidden">
        <div className="bg-primary-800 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-2xl font-bold">{initials}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold" style={{color:'#ffffff'}}>{profile?.full_name||'Not available'}</h1>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Verified account</span>
              </div>
              <p className="mt-1 text-sm text-white/75">{profile?.role||'Not available'} · UDBHAV</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">Your trusted identity, contact preferences, and privacy controls are managed here.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500">Email</div>
            <div className="mt-1 text-sm font-medium text-primary-900 break-words">{profile?.email||'Not provided'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500">Phone</div>
            <div className="mt-1 text-sm font-medium text-primary-900">{profile?.phone||'Not provided'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500">Organization</div>
            <div className="mt-1 text-sm font-medium text-primary-900">{(profile as any)?.organization_name||(profile as any)?.organizationName||profile?.organization_id||'Not provided'}</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
        <Card className="p-5">
          <SectionHeader title="Account overview" subtitle="Your current civic identity and platform visibility settings." />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-primary-50 p-4">
              <div className="text-xs uppercase tracking-wide text-neutral-500">Primary role</div>
              <div className="mt-2 text-lg font-semibold text-primary-900">{profile?.role||'Not available'}</div>
            </div>
            <div className="rounded-xl bg-success-50 p-4">
              <div className="text-xs uppercase tracking-wide text-neutral-500">Location access</div>
              <div className="mt-2 text-lg font-semibold text-success-700">{profile?.district||'Jharkhand'}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {['Location consent','Media consent','Anonymous analytics','Public profile visibility'].map((x) => (
              <label key={x} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                <span>{x}</span>
                <input type="checkbox" defaultChecked={x !== 'Public profile visibility'} className="h-4 w-4 accent-primary-700" />
              </label>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Privacy & actions" subtitle="Export or remove your account while keeping the current workflow intact." />
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-primary-900">Account export</span>
                <span className="badge bg-primary-50 text-primary-700"><Download size={12} /> Available</span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">Download all account data through the existing export flow.</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-primary-900">Account deletion</span>
                <span className="badge bg-error-50 text-error-700"><Trash2 size={12} /> Sensitive</span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">Request removal through the same verified account deletion mechanism.</p>
            </div>
          </div>

          <motion.div layout className="mt-5 flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={exp}><Download size={15} /> Export my data</button>
            <AnimatePresence mode="wait" initial={false}>
              {!confirmingDelete ? (
                <motion.button key="delete" layout className="btn-danger" onClick={() => setConfirmingDelete(true)} whileHover={{scale:1.03}} whileTap={{scale:0.97}} initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.96}}>
                  <motion.span className="flex items-center gap-2" initial={false} animate={{opacity:1}}>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span key="trash" initial={{rotate:-18,scale:0.7,opacity:0}} animate={{rotate:0,scale:1,opacity:1}} exit={{rotate:18,scale:0.7,opacity:0}} transition={{duration:0.2}}>
                        <Trash2 size={15} />
                      </motion.span>
                    </AnimatePresence>
                    Delete account
                  </motion.span>
                </motion.button>
              ) : (
                <motion.div key="confirm" layout className="flex items-center gap-2" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                  <motion.button layout className="btn-danger" onClick={del} whileHover={{scale:1.03}} whileTap={{scale:0.97}} initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}}>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span key="check" initial={{rotate:-45,scale:0.6,opacity:0}} animate={{rotate:0,scale:1,opacity:1}} transition={{duration:0.2}}>
                        <Check size={15} />
                      </motion.span>
                    </AnimatePresence>
                    Confirm
                  </motion.button>
                  <motion.button layout className="btn-secondary" onClick={() => setConfirmingDelete(false)} whileHover={{scale:1.03}} whileTap={{scale:0.97}} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-8}}>
                    <X size={15} /> Cancel
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </Card>
      </div>
    </div>
  );
}
function LegacyNotificationsPage({onNavigate}:SimplePageProps){
  const{notifications,refresh}=usePlatform();const[msg,setMsg]=useState('');const[busy,setBusy]=useState(false);
  async function read(id:string){await api.markNotificationRead(id);await refresh()}
  async function enablePush(){setBusy(true);setMsg('');try{const token=await registerPushToken();await api.registerDeviceToken(token);setMsg('Push notifications enabled for this browser.')}catch(e){setMsg((e as Error).message)}finally{setBusy(false)}}
  return <div className="civic-page max-w-4xl"><SectionHeader title="Notifications" subtitle="In-app events plus optional Firebase Cloud Messaging for validation, assignment, funding and project workflow actions." action={<button className="btn-secondary" onClick={enablePush} disabled={busy}>{busy?'Enabling…':'Enable browser push'}</button>}/>{msg&&<p className="mb-3 text-sm text-neutral-600">{msg}</p>}{notifications.length===0?<EmptyState icon={<FileText size={40}/>} title="No notifications" description="Workflow events will appear here."/>:<div className="space-y-2">{notifications.map(n=><button key={n.id} onClick={()=>read(n.id)} className={`card p-4 w-full text-left flex gap-3 ${!n.read?'border-primary-200 bg-primary-50/30':''}`}><div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center"><FileText size={18}/></div><div className="flex-1"><div className="flex justify-between"><b className="text-sm">{n.title}</b><span className="text-xs text-neutral-400">{timeAgo(n.created_at)}</span></div><p className="text-sm text-neutral-600">{n.message}</p></div>{!n.read&&<span className="w-2 h-2 bg-primary-500 rounded-full mt-2"/>}</button>)}</div>}</div>
}
export function NotificationsPage({onNavigate}:SimplePageProps){
  const { notifications, refresh } = usePlatform();
  const [items, setItems] = useState<Notification[]>(notifications);
  const [selected, setSelected] = useState<Notification | null>(null);
  const [msg, setMsg] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { setItems(notifications); }, [notifications]);

  async function open(notification: Notification) {
    const nextNotification = { ...notification, read: true, isRead: true };
    setSelected(nextNotification);
    if (notification.read || notification.isRead) return;
    setItems(current => current.map(item => item.id === notification.id ? { ...item, read: true, isRead: true } : item));
    try { await api.markNotificationRead(notification.id); } catch (error) { setMsg((error as Error).message); }
  }

  async function remove(notification: Notification) {
    setDeletingId(notification.id);
    try {
      setItems(current => current.filter(item => item.id !== notification.id));
      setSelected(null);
      await api.deleteNotification(notification.id);
      await refresh();
    } catch (error) {
      setMsg((error as Error).message);
      setItems(notifications);
      setSelected(notification);
    } finally {
      setDeletingId(null);
    }
  }

  return <div className="civic-page max-w-4xl"><SectionHeader title="Notifications" subtitle="Review workflow updates and manage your notification messages." />{msg && <p className="mb-3 text-sm text-error-600">{msg}</p>}{!items.length ? <EmptyState icon={<FileText size={40} />} title="No notifications" description="Workflow events will appear here." /> : <div className="space-y-2">{items.map(notification => { const isRead = Boolean(notification.read || notification.isRead); return <button key={notification.id} onClick={() => void open(notification)} className={`card p-4 w-full text-left flex gap-3 ${!isRead ? 'border-primary-200 bg-primary-50/30' : ''}`}><div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center"><FileText size={18} /></div><div className="flex-1"><div className="flex justify-between"><b className="text-sm">{notification.title}</b><span className="text-xs text-neutral-400">{timeAgo(notification.created_at)}</span></div><p className="text-sm text-neutral-600">{notification.message}</p></div>{!isRead && <span className="w-2 h-2 bg-primary-500 rounded-full mt-2" />}</button>; })}</div>}{selected && <NotificationDetailsModal notification={selected} onClose={() => setSelected(null)} onKeep={() => setSelected(null)} onDelete={async (notification) => { await remove(notification); }} onMarkRead={async (notificationId) => { if (!selected || selected.id !== notificationId) return; if (!(selected.read || selected.isRead)) { await api.markNotificationRead(notificationId); await refresh(); } }} deleting={deletingId === selected.id} />}</div>;
}export function PlaceholderPage({title,description}:{title:string;description:string}){return <div className="civic-page"><SectionHeader title={title} subtitle={description}/><EmptyState icon={<Target size={40}/>} title="Module unavailable for this role" description="The production workflow hides unsupported actions rather than showing a non-functional control."/></div>}
