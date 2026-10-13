import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {api} from '@/lib/api';
import {Card,EmptyState,LoadingState,MetricCard,SectionHeader} from '@/components/ui';
import {ArrowRight,BookOpen,Building2,CalendarDays,CheckCircle2,CheckSquare,Clock3,Factory,FlaskConical,GraduationCap,HeartHandshake,MapPin,Rocket,ShieldCheck,Target,TestTube2,Users} from 'lucide-react';
import {useAuth} from '@/context/AuthContext';
import {usePlatform} from '@/context/PlatformContext';
import {useToast} from '@/context/ToastContext';
import {formatDate} from '@/lib/constants';
import {industryAcceptedProjects, industryOpenOpportunities, industryOrganizationIds} from '@/lib/industry';
import {subscribeToIndustryMentorMeetings,subscribeToIndustryMentorships,subscribeToIndustryPrototypeReviews,updateMentorshipStatus,type IndustryMentorMeeting,type IndustryMentorship,type IndustryPrototypeReview} from '@/lib/industry';

type Props={onNavigate:(route:string)=>void};
const phaseForStatus=(status:string)=>({TEAM_FORMED:'Problem Understanding',RESEARCH:'Research',PROPOSAL:'Solution Design',SOLUTION_DEVELOPMENT:'Solution Development',PROTOTYPING:'Prototype Development',LAB_TESTING:'Prototype Development',FIELD_TESTING:'Field Testing',PILOT:'Field Testing',DEPLOYMENT_READY:'Deployment',DEPLOYED:'Deployment',CITIZEN_VERIFICATION:'Citizen Verification'} as Record<string,string>)[String(status||'').toUpperCase()]||'Solution Development';

function Recent({title,rows,onClick,viewAll,onNavigate}:{title:string;rows:any[];onClick?:(x:any)=>void;viewAll?:string;onNavigate?:(r:string)=>void}){
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {viewAll&&onNavigate&&(
          <button onClick={()=>onNavigate(viewAll)} className="text-xs font-bold text-primary-700 inline-flex items-center gap-1 hover:text-primary-900">
            View All <ArrowRight size={12}/>
          </button>
        )}
      </div>
      {!rows?.length?<p className="text-sm text-neutral-400">No records yet.</p>:
        <div className="space-y-2">
          {rows.slice(0,6).map((x:any)=>(
            <button key={x.id} onClick={()=>onClick?.(x)} className="w-full text-left rounded-lg border p-3 hover:bg-neutral-50 hover:border-primary-200 transition-colors">
              <b className="text-sm">{x.title||x.name||x.statement||x.status}</b>
              <p className="text-xs text-neutral-500 mt-1">{x.status||x.domain||x.department||x.district||''}</p>
            </button>
          ))}
        </div>
      }
    </Card>
  );
}

function useDashboard(loader:()=>Promise<any>){
  const[data,setData]=useState<any>(null),[error,setError]=useState('');
  useEffect(()=>{loader().then(setData).catch(e=>setError(e.message))},[]);
  return{data,error};
}

export function StudentCommandCentre({onNavigate}:Props){
  const{data,error}=useDashboard(api.studentDashboard);
  if(!data&&!error)return <LoadingState label="Loading student command centre…"/>;
  return (
    <div className="civic-page">
      <SectionHeader title="Student Innovation Command Centre" subtitle="Recommended challenges, applications, project work, milestones and contribution history in one place."/>
      {error&&<p className="text-error-600 text-sm mb-4">{error}</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active projects" value={data?.projects?.length||0} icon={<Rocket size={18}/>} onClick={()=>onNavigate('/dashboard/projects')}/>
        <MetricCard label="Open tasks" value={data?.tasks?.filter((x:any)=>x.status!=='DONE').length||0} icon={<CheckSquare size={18}/>} color="warning" onClick={()=>onNavigate('/dashboard/tasks')}/>
        <MetricCard label="Applications" value={data?.applications?.length||0} icon={<BookOpen size={18}/>} color="secondary" onClick={()=>onNavigate('/dashboard/marketplace')}/>
        <MetricCard label="Completed tasks" value={data?.contribution?.completedTasks||0} icon={<Target size={18}/>} color="success" onClick={()=>onNavigate('/dashboard/portfolio')}/>
      </div>
      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <Recent title="Recommended challenges" rows={data?.recommendedChallenges||[]} onClick={()=>onNavigate('/dashboard/marketplace')} viewAll="/dashboard/marketplace" onNavigate={onNavigate}/>
        <Recent title="My project work" rows={data?.projects||[]} onClick={()=>onNavigate('/dashboard/projects')} viewAll="/dashboard/projects" onNavigate={onNavigate}/>
        <Recent title="My tasks" rows={data?.tasks||[]} onClick={()=>onNavigate('/dashboard/tasks')} viewAll="/dashboard/tasks" onNavigate={onNavigate}/>
        <Recent title="Applications" rows={data?.applications||[]} onClick={()=>onNavigate('/dashboard/marketplace')} viewAll="/dashboard/marketplace" onNavigate={onNavigate}/>
      </div>
    </div>
  );
}

export function FacultyCommandCentre({onNavigate}:Props){
  const{data,error}=useDashboard(api.facultyDashboard);
  if(!data&&!error)return <LoadingState label="Loading faculty workspace…"/>;
  return (
    <div className="civic-page">
      <SectionHeader title="Faculty Mentorship Command Centre" subtitle="Mentorship load, proposal reviews, project supervision and research capability."/>
      {error&&<p className="text-error-600 text-sm">{error}</p>}
      <div className="grid sm:grid-cols-3 gap-4">
        <MetricCard label="Mentor capacity" value={data?.mentorCapacity||0} icon={<GraduationCap size={18}/>} onClick={()=>onNavigate('/dashboard/mentorship')}/>
        <MetricCard label="Active projects" value={data?.projects?.length||0} icon={<Rocket size={18}/>} color="secondary" onClick={()=>onNavigate('/dashboard/projects')}/>
        <MetricCard label="Pending proposal reviews" value={data?.pendingProposalReviews?.length||0} icon={<ShieldCheck size={18}/>} color="warning" onClick={()=>onNavigate('/dashboard/reviews')}/>
      </div>
      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <Recent title="Supervised projects" rows={data?.projects||[]} onClick={()=>onNavigate('/dashboard/projects')} viewAll="/dashboard/projects" onNavigate={onNavigate}/>
        <Recent title="Proposal review queue" rows={data?.pendingProposalReviews||[]} onClick={()=>onNavigate('/dashboard/reviews')} viewAll="/dashboard/reviews" onNavigate={onNavigate}/>
        <Recent title="Mentorship invitations" rows={data?.mentorshipInvitations||[]} onClick={()=>onNavigate('/dashboard/mentorship')} viewAll="/dashboard/mentorship" onNavigate={onNavigate}/>
        <Card className="p-5">
          <h3 className="font-semibold">Research profile</h3>
          <p className="text-sm text-neutral-500 mt-2">{data?.profile?.designation||'Faculty'} · {data?.profile?.department||'Department'}</p>
          <div className="flex flex-wrap gap-1 mt-3">
            {(data?.profile?.expertise||[]).map((x:string)=><span key={x} className="badge bg-primary-50 text-primary-700">{x}</span>)}
          </div>
          <button onClick={()=>onNavigate('/dashboard/profile')} className="mt-4 text-xs font-bold text-primary-700 inline-flex items-center gap-1 hover:text-primary-900">
            Edit profile <ArrowRight size={12}/>
          </button>
        </Card>
      </div>
    </div>
  );
}

export function UniversityCommandCentre({onNavigate}:Props){
  const{data,error}=useDashboard(api.universityOverview);
  if(!data&&!error)return <LoadingState label="Loading university overview…"/>;
  const projects=data?.projects||[],teams=data?.teams||[],faculty=data?.faculty||[],active=projects.filter((project:any)=>!['COMPLETED','ARCHIVED'].includes(String(project.status).toUpperCase())),completed=projects.filter((project:any)=>['COMPLETED','DEPLOYED'].includes(String(project.status).toUpperCase()));
  const phases=['Problem Understanding','Research','Solution Design','Solution Development','Prototype Development','Field Testing','Deployment','Citizen Verification'];
  const phaseCounts=phases.map(phase=>({phase,count:projects.filter((project:any)=>phaseForStatus(project.status)===phase).length}));
  return <div className="civic-page space-y-5"><SectionHeader title="University Overview" subtitle="Track your university’s participation in UDBHAV, active solutions, collaborations, and project progress."/>{error&&<p className="text-error-600 text-sm">{error}</p>}<Card className="p-4"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><h2 className="text-lg font-bold text-primary-900">{data?.university?.name||'University profile'}</h2><p className="text-sm text-neutral-500">University ID: {data?.universityId||'Not configured'} · {data?.university?.district||'Jharkhand, India'}</p></div><span className="badge bg-success-50 text-success-700">Active</span></div></Card><div className="grid grid-cols-2 xl:grid-cols-6 gap-3"><MetricCard label="Challenges Participating In" value={data?.challenges?.length||0} icon={<Target size={18}/>} /><MetricCard label="Active Teams" value={teams.length} icon={<Users size={18}/>} color="secondary"/><MetricCard label="Active Projects" value={active.length} icon={<Rocket size={18}/>} color="accent"/><MetricCard label="Faculty Mentors" value={faculty.length} icon={<GraduationCap size={18}/>} color="success"/><MetricCard label="Industry Collaborations" value={(data?.collaborations||[]).length} icon={<HeartHandshake size={18}/>} color="warning"/><MetricCard label="Completed Solutions" value={completed.length} icon={<CheckSquare size={18}/>} color="secondary"/></div><section><SectionHeader title="Project Progress"/><Card className="p-4 space-y-3">{phaseCounts.map(item=><div className="flex items-center gap-3" key={item.phase}><span className="w-44 text-xs text-neutral-600">{item.phase}</span><div className="h-2 flex-1 bg-neutral-200 rounded-full overflow-hidden"><div className="h-full bg-primary-600" style={{width:`${projects.length?item.count/projects.length*100:0}%`}}/></div><b className="w-5 text-right text-sm text-primary-900">{item.count}</b></div>)}<button className="btn-secondary text-xs mt-2" onClick={()=>onNavigate('/dashboard/projects')}>View Projects</button></Card></section><div className="grid lg:grid-cols-2 gap-5"><section><SectionHeader title="Active Projects"/><div className="space-y-2">{active.slice(0,4).map((project:any)=><button className="w-full text-left rounded-lg border p-3 hover:border-primary-300" key={project.id} onClick={()=>onNavigate('/dashboard/projects')}><div className="flex justify-between gap-2"><b className="text-sm text-primary-900">{project.title}</b><span className="text-xs text-primary-700">{project.progress||0}%</span></div><p className="text-xs text-neutral-500 mt-1">{project.teamName||'Team'} · {phaseForStatus(project.status)} · {project.facultyMentorName||'Faculty mentor pending'}</p></button>)}{!active.length&&<Card><EmptyState icon={<Rocket size={32}/>} title="No projects yet" description="Register a team for a verified challenge to start developing a solution."/></Card>}</div></section><section><SectionHeader title="Recent Milestones"/><div className="space-y-2">{(data?.milestones||[]).slice(0,5).map((milestone:any)=><div className="rounded-lg border p-3" key={`${milestone.projectId}-${milestone.id}`}><b className="text-sm">{milestone.title}</b><p className="text-xs text-neutral-500 mt-1">{milestone.projectTitle} · {milestone.date?new Date(milestone.date).toLocaleDateString('en-IN'):'Date pending'}</p></div>)}{!(data?.milestones||[]).length&&<p className="text-sm text-neutral-400">No major milestones yet.</p>}</div></section></div><div className="grid lg:grid-cols-2 gap-5"><section><SectionHeader title="Faculty Mentors"/><div className="space-y-2">{faculty.slice(0,4).map((mentor:any)=><div className="rounded-lg border p-3" key={mentor.id}><b className="text-sm">{mentor.name}</b><p className="text-xs text-neutral-500">{mentor.department||'Department'} · {teams.filter((team:any)=>team.facultyMentorId===mentor.id||team.facultyMentorId===mentor.facultyId).length} teams</p></div>)}<button className="btn-secondary text-xs" onClick={()=>onNavigate('/dashboard/faculty')}>View All Faculty Mentors</button></div></section><section><SectionHeader title="Collaboration"/><div className="space-y-2">{(data?.collaborations||[]).slice(0,4).map((collaboration:any)=><div className="rounded-lg border p-3" key={collaboration.id}><b className="text-sm">{collaboration.projectTitle}</b><p className="text-xs text-neutral-500 mt-1">↳ {collaboration.partner||'Industry partner'} · {collaboration.mentor||'Mentor pending'}</p></div>)}{!(data?.collaborations||[]).length&&<p className="text-sm text-neutral-400">No industry collaborations yet.</p>}<button className="btn-secondary text-xs" onClick={()=>onNavigate('/dashboard/industry-collaboration')}>View Industry Collaboration</button></div></section></div><section><SectionHeader title="Needs Attention"/><Card className="p-4">{(data?.attention||[]).length?(data.attention.slice(0,5).map((item:any)=><div className="flex items-center gap-3 border-b last:border-0 py-2" key={item.id}><span className="text-amber-600">!</span><div className="flex-1"><b className="text-sm">{item.title}</b><p className="text-xs text-neutral-500">{item.projectTitle}</p></div><button className="btn-secondary text-xs" onClick={()=>onNavigate('/dashboard/projects')}>Open Project</button></div>)):<p className="text-sm text-success-700">✓ All projects are on track</p>}</Card></section><section><SectionHeader title="Quick Actions"/><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={()=>onNavigate('/dashboard/challenges')}>Discover Challenges</button><button className="btn-secondary" onClick={()=>onNavigate('/dashboard/teams')}>My Teams</button><button className="btn-secondary" onClick={()=>onNavigate('/dashboard/projects')}>Projects</button><button className="btn-secondary" onClick={()=>onNavigate('/dashboard/milestones')}>Milestones</button><button className="btn-secondary" onClick={()=>onNavigate('/dashboard/faculty')}>Faculty Mentors</button><button className="btn-secondary" onClick={()=>onNavigate('/dashboard/industry-collaboration')}>Industry Collaboration</button></div></section></div>;
}

export function IndustryCommandCentre({onNavigate}:Props){
  const {profile}=useAuth();
  const {challenges,projects,loading:platformLoading,error:platformError}=usePlatform();
  const {show}=useToast();
  const [collaborations,setCollaborations]=useState<any[]>([]);
  const [collaborationError,setCollaborationError]=useState('');
  const [collaborationsLoading,setCollaborationsLoading]=useState(true);
  const [mentorships,setMentorships]=useState<IndustryMentorship[]>([]);
  const [meetings,setMeetings]=useState<IndustryMentorMeeting[]>([]);
  const [prototypeReviews,setPrototypeReviews]=useState<IndustryPrototypeReview[]>([]);
  const [recordsError,setRecordsError]=useState('');
  const [recordsReady,setRecordsReady]=useState(false);
  const [requestBusy,setRequestBusy]=useState('');
  const firstName=profile?.full_name?.trim().split(/\s+/)[0]||'';
  const partnerIds=[profile?.id,profile?.organization_id].filter(Boolean).map(String);
  const organizationIds=useMemo(()=>industryOrganizationIds(profile),[profile?.id,profile?.organization_id]);
  const organizationKey=organizationIds.join('|');

  useEffect(()=>{
    let active=true;
    if(!profile?.id){setCollaborationsLoading(false);return()=>{active=false}};
    api.industryCollaborations().then((rows:any[])=>{
      if(!active)return;
      setCollaborations(rows.filter(row=>[row.industryPartnerId,row.industry_partner_id,row.partnerId,row.partner_id].some(id=>id&&partnerIds.includes(String(id)))));
    }).catch((error:unknown)=>{
      if(active)setCollaborationError((error as Error).message||'Unable to load collaborations.');
    }).finally(()=>{if(active)setCollaborationsLoading(false)});
    return()=>{active=false};
  },[profile?.id,profile?.organization_id]);

  useEffect(()=>{
    let active=true;
    if(!organizationIds.length){setRecordsReady(true);return()=>{active=false}};
    setRecordsReady(false);
    const onError=(error:Error)=>{if(active){setRecordsError(error.message);setRecordsReady(true)}};
    const stopMentorships=subscribeToIndustryMentorships(organizationIds,setMentorships,onError);
    const stopMeetings=subscribeToIndustryMentorMeetings(organizationIds,setMeetings,onError);
    const stopReviews=subscribeToIndustryPrototypeReviews(organizationIds,setPrototypeReviews,onError);
    setRecordsReady(true);
    return()=>{active=false;stopMentorships();stopMeetings();stopReviews()};
  },[organizationKey]);

  // Accepted projects are read straight from the canonical Industry scope.
  // Deriving them from `opportunities` (which excludes accepted challenges) made
  // this list permanently empty, so "My Projects" and the impact metrics always
  // showed zero even after a successful challenge acceptance.
  const selectedProjects=useMemo(()=>industryAcceptedProjects(challenges,organizationIds),[challenges,organizationIds]);
  const opportunities=useMemo(()=>industryOpenOpportunities(challenges,organizationIds).sort((a,b)=>(b.priority_score||0)-(a.priority_score||0)),[challenges,organizationIds]);
  const activeCollaborations=useMemo(()=>collaborations.filter(row=>
    ['ACCEPTED','IN_PROGRESS','ACTIVE'].includes(String(row.status||'').toUpperCase())
  ),[collaborations]);
  const activeCollaborationCount=activeCollaborations.length;
  const projectsByChallenge=useMemo(()=>new Map(projects.filter(project=>project.challenge_id).map(project=>[project.challenge_id,project])),[projects]);
  const pendingMentorships=mentorships.filter(request=>request.status==='PENDING');
  const challengeIdForRecord=(record:any)=>{
    const direct=record.challengeId||record.challenge_id;
    if(direct)return String(direct);
    const projectId=String(record.projectId||record.project_id||'');
    return String(projects.find(project=>project.id===projectId)?.challenge_id||'');
  };
  const supportedSolutionIds=new Set([
    ...selectedProjects.map(problem=>problem.id),
    ...activeCollaborations.map(challengeIdForRecord),
    ...mentorships.filter(request=>['ACCEPTED','COMPLETED'].includes(request.status)).map(challengeIdForRecord),
    ...prototypeReviews.map(review=>review.challengeId),
  ].filter(Boolean));

  async function respondToMentorship(request:IndustryMentorship,status:'ACCEPTED'|'DECLINED'){
    setRequestBusy(request.id);
    try{await updateMentorshipStatus(request,status);show(status==='ACCEPTED'?'Mentorship request accepted.':'Mentorship request declined.','success')}
    catch(error){show((error as Error).message||'Unable to update the mentorship request.','error')}
    finally{setRequestBusy('')}
  }

  if((platformLoading||collaborationsLoading||!recordsReady)&&!challenges.some(problem=>problem.source==='firestore'))return <LoadingState label="Loading industry overview…"/>;

  const organizationName=String((profile as any)?.organization_name||(profile as any)?.organizationName||'');
  const collaborationCards=activeCollaborations.map(record=>{
    const challengeId=challengeIdForRecord(record);
    const problem=challenges.find(item=>item.id===challengeId);
    const projectId=String(record.projectId||record.project_id||'');
    const project=projects.find(item=>item.id===projectId||item.challenge_id===challengeId) as any;
    const taskCount=project?.tasks?.length||0;
    const rawProgress=taskCount?project.tasks.filter((task:any)=>['DONE','COMPLETED'].includes(String(task.status||'').toUpperCase())).length/taskCount*100:project?.progress??problem?.progress??record.progress;
    const progress=Number.isFinite(Number(rawProgress))?Math.max(0,Math.min(100,Math.round(Number(rawProgress)))):null;
    const expertise=record.requestedExpertise||record.expertise||problem?.aiRequiredExpertise||problem?.ai_required_expertise||[];
    const phase=project?.currentPhase||project?.phase||record.currentPhase||problem?.currentStage||'';
    const routeId=project?.id||problem?.project_id||challengeId;
    return {record,problem,project,challengeId,progress,expertise,phase,routeId,title:problem?.title||project?.title||record.projectName||record.project_name||'Challenge details unavailable'};
  });
  const upcomingMeetings=meetings.filter(meeting=>Number.isFinite(new Date(meeting.scheduledAt).getTime())&&new Date(meeting.scheduledAt).getTime()>=Date.now()).sort((a,b)=>new Date(a.scheduledAt).getTime()-new Date(b.scheduledAt).getTime()).slice(0,4);

  return (
    <div className="civic-page industry-overview">
      <section className="industry-hero">
        <div className="industry-hero-copy">
          <span className="industry-eyebrow"><Factory size={14}/> INDUSTRY FOR IMPACT · UDBHAV</span>
          <h1>Welcome back{firstName?`, ${firstName}`:''} <span aria-hidden="true">👋</span></h1>
          <p>Discover verified societal challenges. Bring industry expertise, technical mentorship and resources to help university solutions reach communities.</p>
          <div className="industry-hero-actions">
            <button className="industry-primary-button" onClick={()=>onNavigate('/dashboard/challenges')}><span aria-hidden="true">+</span> Explore Opportunities</button>
            <button className="industry-secondary-button" onClick={()=>onNavigate('/dashboard/projects')}>My Projects <ArrowRight size={15}/></button>
          </div>
        </div>
        
        <span className="industry-hero-stamp">INDUSTRY<br/>INNOVATION<br/>IMPACT</span>
      </section>

      {(platformError||collaborationError||recordsError)&&<p className="text-error-600 text-sm" role="status">{collaborationError||recordsError||platformError}</p>}

      <section className="industry-metrics" aria-label="Industry overview metrics">
        <IndustryMetric icon={<MapPin size={19}/>} label="Open Opportunities" value={opportunities.length} detail="Verified challenges routed to Industry"/>
        <IndustryMetric icon={<HeartHandshake size={19}/>} label="Active Collaborations" value={activeCollaborationCount} detail="Current university partnerships"/>
        <IndustryMetric icon={<Users size={19}/>} label="Mentorship Requests" value={pendingMentorships.length} detail="University teams awaiting expertise"/>
        <IndustryMetric icon={<ShieldCheck size={19}/>} label="Solutions Supported" value={supportedSolutionIds.size} detail="Accepted or supported challenge work"/>
      </section>

      <div className="industry-section-heading">
        <div><h2>Collaboration Opportunities</h2><p>Support verified societal challenges with your industry's expertise, technology, and resources.</p></div>
        <button className="industry-text-link" onClick={()=>onNavigate('/dashboard/challenges')}>Explore all <ArrowRight size={14}/></button>
      </div>
      {!opportunities.length?<div className="industry-empty">No opportunities available yet.</div>:<div className="industry-opportunity-grid">
        {opportunities.slice(0,4).map(problem=><button className="industry-opportunity" key={problem.id} onClick={()=>onNavigate(`/dashboard/challenges?challenge=${encodeURIComponent(problem.id)}`)}>
          <div className="industry-opportunity-meta"><span>{problem.domain}</span><b>{problem.priority_level}</b></div>
          <h3>{problem.title}</h3>
          <span className="industry-verified-label"><CheckCircle2 size={13}/> Government verified <i>·</i> Open</span>
          <p className="industry-location"><MapPin size={13}/>{[problem.district,problem.block].filter(Boolean).join(', ')||'Jharkhand'}</p>
          <p className="industry-detail">Reported {formatDate(problem.created_at)}</p>
          {problem.affected_population? <p className="industry-detail">{problem.affected_population.toLocaleString()} people affected</p>:null}
          {((problem.aiSuggestedIndustryDomain?.length||problem.aiRequiredExpertise?.length||problem.ai_required_expertise?.length)>0)&&<p className="industry-expertise">Expertise: {[...(problem.aiSuggestedIndustryDomain||[]),...(problem.aiRequiredExpertise||problem.ai_required_expertise||[])].slice(0,3).join(' · ')}</p>}
          {problem.aiRecommendedAction&&<p className="industry-detail">Support needed: {problem.aiRecommendedAction}</p>}
          <span className="industry-opportunity-cta">View verified challenge <ArrowRight size={14}/></span>
        </button>)}
      </div>}

      <section className="industry-panel industry-active-panel">
        <div className="industry-panel-heading"><div><h2>Active Collaborations</h2><p>University solutions receiving Industry expertise and support.</p></div><button className="industry-text-link" onClick={()=>onNavigate('/dashboard/collaborations')}>View all collaborations <ArrowRight size={14}/></button></div>
        {!collaborationCards.length?<div className="industry-empty">No active collaboration records yet. Accepted projects remain available in My Projects.</div>:<div className="industry-collaboration-grid">{collaborationCards.slice(0,4).map(({record,problem,project,challengeId,progress,expertise,phase,routeId,title})=><article className="industry-collaboration-card" key={record.id}>
          <div className="industry-collaboration-card-heading"><div><span className="industry-record-kicker">{problem?.domain||'Societal challenge'}</span><h3>{title}</h3></div><span className="industry-status-badge">{String(record.status||'ACTIVE').replaceAll('_',' ')}</span></div>
          <dl className="industry-record-details">
            <div><dt>University</dt><dd>{record.universityName||record.university_name||project?.universityName||problem?.universityName||'Not recorded'}</dd></div>
            <div><dt>Student team</dt><dd>{record.teamName||record.team_name||project?.teamName||project?.team_name||problem?.studentTeamName||'Not recorded'}</dd></div>
            <div><dt>Industry partner</dt><dd>{record.industryPartnerName||record.partnerName||record.partner_name||organizationName||'Not recorded'}</dd></div>
            <div><dt>Industry mentor</dt><dd>{record.industryMentorName||record.mentorName||project?.industryMentorName||problem?.industryMentorName||'Not assigned'}</dd></div>
            <div><dt>Expertise</dt><dd>{Array.isArray(expertise)&&expertise.length?expertise.slice(0,3).join(' · '):'Not specified'}</dd></div>
            <div><dt>Current phase</dt><dd>{String(phase||project?.status||problem?.currentStage||'Not recorded').replaceAll('_',' ')}</dd></div>
          </dl>
          <div className="industry-collaboration-progress"><div className="industry-progress-label"><span>Project progress</span><b>{progress===null?'Not recorded':`${progress}%`}</b></div>{progress!==null&&<div className="industry-progress-track"><i style={{width:`${progress}%`}}/></div>}</div>
          {routeId&&<button className="industry-text-link" onClick={()=>onNavigate(`/dashboard/projects/${encodeURIComponent(String(routeId))}`)}>Open collaboration workspace <ArrowRight size={14}/></button>}
        </article>)}</div>}
      </section>

      <section className="industry-panel industry-projects-panel">
        <div className="industry-panel-heading"><div><h2>Accepted Projects</h2><p>Government-routed challenges assigned to your Industry organization.</p></div><button className="industry-text-link" onClick={()=>onNavigate('/dashboard/projects')}>View All Projects <ArrowRight size={14}/></button></div>
        {!selectedProjects.length?<div className="industry-empty">No projects yet. Select a challenge to start collaborating.</div>:<div className="industry-project-list">{selectedProjects.slice(0,4).map(problem=>{
          const project=projectsByChallenge.get(problem.id) as any;
          const status=project?.status||problem.currentStage||problem.status;
          const taskCount=project?.tasks?.length||0;
          const progress=taskCount?Math.round(project.tasks.filter(task=>task.status==='DONE').length/taskCount*100):problem.progress;
          const nextMilestone=project?.milestones?.find(milestone=>milestone.status!=='COMPLETED')?.title;
          return <button className="industry-project-row" key={problem.id} onClick={()=>onNavigate(`/dashboard/projects/${encodeURIComponent(project?.id||problem.project_id||problem.id)}`)}>
            <span className="industry-project-copy"><b>{problem.title}</b><small>{problem.universityName||project?.organization_name||'University partner pending'} · {String(status).replaceAll('_',' ')}</small><small>Reported {formatDate(problem.created_at)}</small>{nextMilestone&&<small>Next milestone: {nextMilestone}</small>}</span>
            {typeof progress==='number'&&Number.isFinite(progress)&&<span className="industry-project-progress">{progress}%</span>}
          </button>;
        })}</div>}
      </section>

      <section className="industry-panel industry-mentorship-panel">
        <div className="industry-panel-heading"><div><h2>Mentorship Requests</h2><p>University teams asking for Industry expertise on their projects.</p></div><button className="industry-text-link" onClick={()=>onNavigate('/dashboard/industry-mentorship')}>Open mentorship workspace <ArrowRight size={14}/></button></div>
        {!pendingMentorships.length?<div className="industry-empty">No pending mentorship requests.</div>:<div className="industry-mentorship-list">{pendingMentorships.slice(0,4).map(request=>{
          const problem=challenges.find(item=>item.id===request.challengeId);
          const project=projectsByChallenge.get(request.challengeId) as any;
          return <article className="industry-mentorship-row" key={request.id}>
            <span className="industry-mentorship-icon"><Users size={17}/></span>
            <div className="industry-mentorship-copy"><b>{request.challengeTitle||problem?.title||'Challenge details unavailable'}</b><small>{problem?.universityName||project?.universityName||project?.organization_name||'University not recorded'} · {project?.teamName||project?.team_name||problem?.studentTeamName||'Team not recorded'}</small><span>Project: {project?.title||request.challengeTitle||problem?.title||'Not recorded'}</span></div>
            <div className="industry-mentorship-meta"><span>Expertise: {request.requestedExpertise.length?request.requestedExpertise.join(' · '):'Not specified'}</span><span>Support: Mentorship</span><span>Requested: {request.createdAt?new Date(request.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'Date not recorded'}</span><b className="industry-status-badge">{request.status}</b></div>
            <div className="industry-mentorship-actions"><button className="btn-ghost" onClick={()=>onNavigate('/dashboard/industry-mentorship')}>View request</button><button className="btn-secondary" disabled={requestBusy===request.id} onClick={()=>void respondToMentorship(request,'DECLINED')}>{requestBusy===request.id?'Updating…':'Decline'}</button><button className="btn-primary" disabled={requestBusy===request.id} onClick={()=>void respondToMentorship(request,'ACCEPTED')}>{requestBusy===request.id?'Updating…':'Accept'}</button></div>
          </article>;
        })}</div>}
      </section>

      <section className="industry-panel industry-contribution-panel">
        <div className="industry-panel-heading"><div><h2>How Industry Contributes</h2><p>Practical support that moves verified challenges toward deployable solutions.</p></div></div>
        <div className="industry-contribution-grid">
          <ContributionCard icon={<HeartHandshake size={18}/>} title="Technical mentorship" text="Guide university teams through technical decisions and implementation challenges."/>
          <ContributionCard icon={<TestTube2 size={18}/>} title="Testing & validation" text="Review prototypes and help validate testing methods against real needs."/>
          <ContributionCard icon={<FlaskConical size={18}/>} title="Prototype support" text="Contribute tools, infrastructure, technical resources or specialist expertise."/>
          <ContributionCard icon={<Rocket size={18}/>} title="Deployment support" text="Help prepare proven solutions for practical rollout and future scale."/>
        </div>
      </section>

      <section className="industry-panel industry-meetings-panel">
        <div className="industry-panel-heading"><div><h2>Upcoming Meetings</h2><p>Scheduled sessions linked to Industry mentorship requests.</p></div><button className="industry-text-link" onClick={()=>onNavigate('/dashboard/industry-mentorship')}>Manage meetings <ArrowRight size={14}/></button></div>
        {!upcomingMeetings.length?<div className="industry-empty">No upcoming meetings scheduled.</div>:<div className="industry-meeting-list">{upcomingMeetings.map(meeting=>{
          const problem=challenges.find(item=>item.id===meeting.challengeId);
          const project=projectsByChallenge.get(meeting.challengeId) as any;
          const mentorName=(meeting as any).mentorName||project?.industryMentorName||problem?.industryMentorName||(meeting.ownerId===profile?.id?profile?.full_name:'')||'Not recorded';
          const scheduledAt=new Date(meeting.scheduledAt);
          return <article className="industry-meeting-row" key={meeting.id}>
            <span className="industry-meeting-icon"><CalendarDays size={17}/></span>
            <div className="industry-meeting-copy"><b>{project?.title||problem?.title||meeting.agenda}</b><small>{problem?.universityName||project?.universityName||project?.organization_name||'University not recorded'} · {meeting.agenda}</small><small>Industry mentor: {mentorName}</small></div>
            <div className="industry-meeting-meta"><span><Clock3 size={13}/>{scheduledAt.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})} · {scheduledAt.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'})}</span><span>{meeting.meetingUrl?'Online':'Mode not recorded'} · {meeting.durationMinutes} min</span><b>Scheduled</b></div>
            {meeting.meetingUrl&&<a className="btn-secondary industry-meeting-link" href={meeting.meetingUrl} target="_blank" rel="noreferrer">Join meeting <ArrowRight size={13}/></a>}
          </article>;
        })}</div>}
      </section>

      <section className="industry-impact-flow">
        <div className="industry-impact-heading"><h2>Industry Impact</h2><p>Expertise becomes community impact through a connected delivery path.</p></div>
        <ol className="industry-impact-steps">{['Expertise','Mentorship','Prototype','Testing','Deployment','Community impact'].map((step,index)=><li key={step}><span>{index+1}</span><b>{step}</b>{index<5&&<ArrowRight size={15} aria-hidden="true"/>}</li>)}</ol>
      </section>
    </div>
  );
}

function IndustryMetric({icon,label,value,detail}:{icon:ReactNode;label:string;value:number;detail:string}){
  return <article className="industry-metric"><span className="industry-metric-icon">{icon}</span><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></article>;
}

function ContributionCard({icon,title,text}:{icon:ReactNode;title:string;text:string}){
  return <article className="industry-contribution-card"><span>{icon}</span><h3>{title}</h3><p>{text}</p></article>;
}

export function DistrictCommandCentre({onNavigate}:Props){
  const{data,error}=useDashboard(api.districtDashboard);
  if(!data&&!error)return <LoadingState label="Loading district intelligence…"/>;
  return (
    <div className="civic-page">
      <SectionHeader title={`${data?.district||'District'} Innovation Command Centre`} subtitle="District-scoped challenge intelligence, critical clusters, pilots and alerts."/>
      {error&&<p className="text-error-600 text-sm">{error}</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Challenges" value={data?.challenges?.length||0} icon={<MapPin size={18}/>} onClick={()=>onNavigate('/dashboard/challenges')}/>
        <MetricCard label="Critical clusters" value={data?.criticalClusters?.length||0} icon={<Target size={18}/>} color="error" onClick={()=>onNavigate('/dashboard/clusters')}/>
        <MetricCard label="Projects" value={data?.projects?.length||0} icon={<Rocket size={18}/>} color="secondary" onClick={()=>onNavigate('/dashboard/projects')}/>
        <MetricCard label="Pilots" value={data?.pilots?.length||0} icon={<Building2 size={18}/>} color="success" onClick={()=>onNavigate('/dashboard/deployments')}/>
      </div>
      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <Recent title="Critical alerts" rows={data?.alerts||[]} onClick={()=>onNavigate('/dashboard/validation')} viewAll="/dashboard/validation" onNavigate={onNavigate}/>
        <Recent title="Emerging clusters" rows={data?.criticalClusters||[]} onClick={()=>onNavigate('/dashboard/clusters')} viewAll="/dashboard/clusters" onNavigate={onNavigate}/>
        <Card className="p-5">
          <h3 className="font-semibold">Domain distribution</h3>
          <div className="mt-3 space-y-2">
            {(data?.domainDistribution||[]).map((x:any)=>(
              <button key={x.name} onClick={()=>onNavigate('/dashboard/challenges')} className="w-full flex justify-between text-sm hover:text-primary-700 transition-colors">
                <span>{x.name}</span><b>{x.value}</b>
              </button>
            ))}
          </div>
        </Card>
        <Recent title="Pilot activity" rows={data?.pilots||[]} onClick={()=>onNavigate('/dashboard/deployments')} viewAll="/dashboard/deployments" onNavigate={onNavigate}/>
      </div>
    </div>
  );
}
