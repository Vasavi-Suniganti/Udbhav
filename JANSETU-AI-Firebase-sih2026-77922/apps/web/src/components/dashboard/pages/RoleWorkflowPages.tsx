import {useEffect,useMemo,useState} from 'react';
import {api} from '@/lib/api';
import {useAuth} from '@/context/AuthContext';
import {Card,EmptyState,LoadingState,MetricCard,SectionHeader} from '@/components/ui';
import { usePlatform } from '@/context/PlatformContext';
import {BookOpenCheck,CheckCircle2,Clock,FolderGit2,GraduationCap,Handshake,ListChecks,MailCheck,Rocket,Target,UserCheck,Users} from 'lucide-react';
import {dedupeIndustryCollaborations,subscribeToIndustryCollaborations,universityCollaborationMatches} from '@/lib/industry';

export function StudentPortfolioPage(){
  const{data,error}=useLoad(api.studentDashboard); if(!data&&!error)return <LoadingState label="Loading contribution portfolioâ€¦"/>;
  const completed=(data?.tasks||[]).filter((x:any)=>x.status==='DONE');
  return <div className="civic-page space-y-5"><SectionHeader title="Student Contribution Portfolio" subtitle="Verified project participation, completed work and public portfolio links are derived from live platform records."/>{error&&<p className="text-error-600 text-sm">{error}</p>}
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"><MetricCard label="Projects" value={data?.projects?.length||0} icon={<Rocket size={18}/>}/><MetricCard label="Completed tasks" value={completed.length} icon={<CheckCircle2 size={18}/>} color="success"/><MetricCard label="Applications" value={data?.applications?.length||0} icon={<BookOpenCheck size={18}/>} color="secondary"/><MetricCard label="Skills" value={data?.profile?.skills?.length||0} icon={<Target size={18}/>} color="accent"/></div>
    <div className="grid lg:grid-cols-2 gap-5"><Card className="p-5"><h3 className="font-semibold">Profile</h3><p className="text-sm text-neutral-500 mt-2">{data?.profile?.department||'Department'} Â· Year {data?.profile?.year||'â€”'}</p><div className="flex flex-wrap gap-1 mt-3">{(data?.profile?.skills||[]).map((x:string)=><span key={x} className="badge bg-primary-50 text-primary-700">{x}</span>)}</div>{data?.profile?.github&&<a className="text-sm text-primary-600 mt-4 inline-flex" href={data.profile.github} target="_blank" rel="noreferrer"><FolderGit2 size={15} className="mr-1"/> GitHub profile</a>}</Card><Card className="p-5"><h3 className="font-semibold">Completed contributions</h3><div className="space-y-2 mt-3">{completed.length?completed.map((x:any)=><div className="rounded-lg border p-3" key={x.id}><b className="text-sm">{x.title}</b><p className="text-xs text-neutral-500">{x.description||'Project task'} Â· {x.priority}</p></div>):<p className="text-sm text-neutral-400">No completed work yet.</p>}</div></Card></div>
  </div>
}

export function MentorshipPage(){
  const{profile}=useAuth(); const[rows,setRows]=useState<any[]>([]),[msg,setMsg]=useState('');
  const load=async()=>{try{const invites=await api.invitations();setRows(invites)}catch(e){setMsg((e as Error).message)}};useEffect(()=>{load()},[]);
  async function answer(id:string,status:'ACCEPTED'|'DECLINED'){try{await api.answerInvitation(id,status);await load()}catch(e){setMsg((e as Error).message)}}
  return <div className="civic-page max-w-6xl"><SectionHeader title="Mentorship & Team Invitations" subtitle="Accept or decline project invitations through the auditable team-formation workflow."/>{msg&&<p className="text-sm text-error-600 mb-3">{msg}</p>}{rows.length===0?<EmptyState icon={<GraduationCap size={40}/>} title="No pending invitations" description="Faculty mentors and students will see project invitations here."/>:<div className="space-y-3">{rows.map(x=><Card key={x.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3"><UserCheck className="text-primary-600"/><div className="flex-1"><b className="text-sm">{x.role}</b><p className="text-xs text-neutral-500">Project {x.projectId} Â· {x.message||'Team invitation'} Â· {x.status}</p></div>{x.status==='PENDING'&&x.inviteeId===profile?.id&&<><button className="btn-secondary" onClick={()=>answer(x.id,'DECLINED')}>Decline</button><button className="btn-primary" onClick={()=>answer(x.id,'ACCEPTED')}>Accept</button></>}</Card>)}</div>}</div>
}

export function ProposalReviewQueuePage({onNavigate}:{onNavigate:(r:string)=>void}){
  const{data,error}=useLoad(api.facultyDashboard); if(!data&&!error)return <LoadingState label="Loading proposal review queueâ€¦"/>;
  const rows=data?.pendingProposalReviews||[];
  return <div className="civic-page max-w-6xl"><SectionHeader title="Proposal Review Queue" subtitle="Faculty and institutional reviewers can open projects and review versioned proposals without bypassing the server approval workflow."/>{error&&<p className="text-error-600 text-sm">{error}</p>}{!rows.length?<EmptyState icon={<BookOpenCheck size={40}/>} title="No proposal reviews pending" description="Submitted proposals requiring review will appear here."/>:<div className="space-y-3">{rows.map((x:any)=><Card key={x.id} className="p-4 flex items-center gap-3"><BookOpenCheck className="text-primary-600"/><div className="flex-1"><b className="text-sm">Project {x.projectId}</b><p className="text-xs text-neutral-500">Version {x.version} Â· {x.status}</p></div><button className="btn-primary" onClick={()=>onNavigate('/dashboard/projects')}>Open workspace</button></Card>)}</div>}</div>
}

export function MatchedChallengesPage({onNavigate}:{onNavigate:(r:string)=>void}){
  const{data,error}=useLoad(api.universityDashboard); if(!data&&!error)return <LoadingState label="Loading institution matchesâ€¦"/>; const rows=data?.recommendedChallenges||[];
  return <div className="civic-page"><SectionHeader title="Challenge-Specific Institution Matches" subtitle="Recommendations are based on required expertise and institution capability; they are not a universal ranking."/>{error&&<p className="text-error-600 text-sm">{error}</p>}<div className="grid md:grid-cols-2 gap-4">{rows.map((x:any)=><Card className="p-5" key={x.id}><div className="flex justify-between gap-3"><span className="badge bg-primary-50 text-primary-700">{x.domain}</span><span className="badge bg-neutral-100 text-neutral-600">{x.status}</span></div><h3 className="font-semibold mt-3">{x.title}</h3><p className="text-sm text-neutral-500 mt-2">{x.district} Â· {x.affectedPeople?.toLocaleString?.()||x.affectedPeople} people affected</p><div className="flex flex-wrap gap-1 mt-3">{(x.expertise||[]).slice(0,6).map((e:string)=><span key={e} className="badge bg-neutral-100 text-neutral-600">{e}</span>)}</div><button className="btn-primary mt-4" onClick={()=>onNavigate('/dashboard/marketplace')}>Explore match</button></Card>)}</div>{!rows.length&&<EmptyState icon={<Target size={40}/>} title="No new matches" description="Validated open challenges matching institution capability will appear here."/>}</div>
}

export function TeamFormationPage(){
  const[apps,setApps]=useState<any[]>([]),[invites,setInvites]=useState<any[]>([]),[teams,setTeams]=useState<any[]>([]),[msg,setMsg]=useState('');
  const load=async()=>{try{const[a,i,t]=await Promise.all([api.applications(),api.invitations(),api.registeredTeams()]);setApps(a);setInvites(i);setTeams(t)}catch(e){setMsg((e as Error).message)}};useEffect(()=>{load()},[]);
  const pending=useMemo(()=>apps.filter(x=>['APPLIED','SHORTLISTED'].includes(x.status)),[apps]);
  const accepted=apps.filter(x=>x.status==='ACCEPTED').length;
  async function update(id:string,status:string){try{await api.updateApplication(id,status);await load()}catch(e){setMsg((e as Error).message)}}
  return <div className="civic-page"><SectionHeader title="My Teams" subtitle="Official teams contain exactly 6 students and 1 faculty mentor before they become Ready."/>{msg&&<p className="text-error-600 text-sm">{msg}</p>}<div className="grid sm:grid-cols-3 gap-4 mb-5"><MetricCard label="Applications" value={apps.length} icon={<Users size={18}/>}/><MetricCard label="Pending review" value={pending.length} icon={<Clock size={18}/>} color="warning"/><MetricCard label="Invitations" value={invites.length} icon={<MailCheck size={18}/>} color="secondary"/></div><Card className="p-5 mb-5 border-primary-100 bg-primary-50"><h3 className="font-semibold text-primary-900">Team formation rules</h3><p className="text-sm text-primary-800 mt-2">{accepted}/6 students accepted Â· exactly 1 faculty mentor is required before the team can be marked Ready.</p><div className="h-2 bg-white rounded-full overflow-hidden mt-3"><div className="h-full bg-primary-600" style={{width:`${Math.min(100,accepted/6*100)}%`}}/></div>{accepted>=6&&<p className="text-xs text-error-700 mt-2">The six-student limit has been reached. Additional students cannot be invited.</p>}</Card><div className="grid lg:grid-cols-2 gap-5"><Card className="p-5"><h3 className="font-semibold">Student applications</h3><div className="space-y-2 mt-3">{apps.map(a=><div key={a.id} className="rounded-lg border p-3"><b className="text-sm">Student {a.studentId}</b><p className="text-xs text-neutral-500">{a.statement} Â· {a.status}</p>{['APPLIED','SHORTLISTED'].includes(a.status)&&<div className="flex gap-2 mt-2"><button className="btn-secondary" onClick={()=>update(a.id,'REJECTED')}>Reject</button><button className="btn-primary" disabled={a.status==='SHORTLISTED'&&accepted>=6} onClick={()=>update(a.id,a.status==='APPLIED'?'SHORTLISTED':'INVITED')}>{a.status==='APPLIED'?'Shortlist':'Invite'}</button></div>}</div>)}</div>{!apps.length&&<p className="text-sm text-neutral-400 mt-3">No student applications yet. Express interest in a challenge to begin forming a team.</p>}</Card><Card className="p-5"><h3 className="font-semibold">Invitations</h3><div className="space-y-2 mt-3">{invites.map(i=><div key={i.id} className="rounded-lg border p-3"><b className="text-sm">{i.role}</b><p className="text-xs text-neutral-500">Invitee {i.inviteeId} Â· {i.status}</p></div>)}</div>{!invites.length&&<p className="text-sm text-neutral-400 mt-3">No invitations yet.</p>}</Card></div></div>
}

export function RegisteredTeamsPage(){const[teams,setTeams]=useState<any[]>([]),[error,setError]=useState('');useEffect(()=>{api.registeredTeams().then(setTeams).catch(e=>setError((e as Error).message))},[]);if(error)return <div className="civic-page"><SectionHeader title="My Teams" subtitle="Registered teams and their development workspaces."/><p className="text-sm text-error-600">{error}</p></div>;return <div className="civic-page"><SectionHeader title="My Teams" subtitle="Registered teams, faculty mentors, and solution development workspaces."/>{teams.length===0?<EmptyState icon={<Users size={40}/>} title="No registered teams yet" description="Open a verified challenge and choose Express Interest to register a 3â€“6 student team."/>:<div className="grid lg:grid-cols-2 gap-4">{teams.map(team=><Card className="p-5" key={team.id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-primary-900">{team.teamName}</h3><p className="text-sm text-neutral-600 mt-1">{team.challengeTitle}</p></div><span className="badge bg-success-50 text-success-700">{String(team.teamStatus||'SOLUTION_DEVELOPMENT').replaceAll('_',' ')}</span></div><p className="text-xs text-neutral-500 mt-3">{team.studentCount} students Â· Faculty Mentor: {team.facultyMentorDetails?.name||'Registered'}</p><div className="mt-3 grid sm:grid-cols-2 gap-2">{(team.students||[]).map((student:any,index:number)=><div className="rounded-lg bg-neutral-50 p-2 text-xs" key={student.studentId||index}><b>{student.name}</b><span className="block text-neutral-500">{student.studentId} Â· {student.department}</span></div>)}</div>{team.initialSolutionPlan && Object.values(team.initialSolutionPlan).some(Boolean) && <button className="btn-primary mt-4 text-xs" onClick={()=>window.location.hash=`/university/projects/${team.projectId || team.id}`}>Open Development Workspace</button>} {!team.initialSolutionPlan && <button className="btn-primary mt-4 text-xs" onClick={()=>window.location.hash=`/university/projects/${team.projectId || team.id}`}>Open Development Workspace</button>}</Card>)}</div>}</div>}

export function UniversityMilestonesPage({onNavigate}:{onNavigate:(route:string)=>void}){const{data,error}=useLoad(api.universityDashboard);const[busy,setBusy]=useState('');const[rows,setRows]=useState<any[]>([]);useEffect(()=>{if(data)setRows(data.projects||[])},[data]);if(!data&&!error)return <LoadingState label="Loading milestonesâ€¦"/>;async function toggle(project:any,milestone:any){setBusy(milestone.id);try{await api.milestone(project.id,milestone.id,{done:!milestone.done,approved:milestone.approved});setRows(current=>current.map(item=>item.id===project.id?{...item,milestones:(item.milestones||[]).map((entry:any)=>entry.id===milestone.id?{...entry,done:!entry.done}:entry)}:item))}finally{setBusy('')}}return <div className="civic-page"><SectionHeader title="Milestones" subtitle="Track solution development from problem understanding through citizen verification."/>{error&&<p className="text-error-600 text-sm">{error}</p>}{rows.length===0?<EmptyState icon={<ListChecks size={40}/>} title="No project milestones yet" description="Milestones appear when a verified challenge becomes a university project."/>:<div className="space-y-4">{rows.map(project=><Card className="p-5" key={project.id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-primary-900">{project.title}</h3><p className="text-xs text-neutral-500 mt-1">{project.status?.replaceAll('_',' ')}</p></div><button className="btn-secondary text-xs" onClick={()=>onNavigate('/university/projects')}>Open Project</button></div><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-4">{(project.milestones||[]).map((milestone:any)=><button key={milestone.id} disabled={busy===milestone.id} onClick={()=>void toggle(project,milestone)} className="flex items-center gap-2 rounded-lg border p-3 text-left"><span className={`w-6 h-6 rounded-full grid place-items-center text-xs ${milestone.done?'bg-success-100 text-success-700':'bg-neutral-100 text-neutral-400'}`}>{milestone.done?'âœ“':'â—‹'}</span><span className="text-xs">{milestone.title}</span></button>)}</div></Card>)}</div>}</div>}

export function UniversityIndustryCollaborationPage({ onNavigate, projectId }: { onNavigate: (route: string) => void; projectId?: string }) {
  const { profile } = useAuth();
  const { projects, industry } = usePlatform();
  const [collaborations, setCollaborations] = useState<any[]>([]);
  const [resolvedUniversityId, setResolvedUniversityId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(Boolean(projectId));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const universityId = resolvedUniversityId || profile?.organization_id || profile?.id || '';
  const universityIds = useMemo(() => [...new Set([universityId, profile?.organization_id, (profile as any)?.organizationId, profile?.id].filter(Boolean).map(String))], [universityId, profile?.organization_id, profile?.id]);
  const universityProjects = useMemo(
    () => (projects || []).filter((project: any) => universityIds.includes(String(project.universityId || project.university_id || project.organizationId || project.organization_id || ''))),
    [projects, universityIds]
  );

  useEffect(() => {
    let active = true;
    setResolvedUniversityId('');
    api.universityOverview().then((overview: any) => {
      if (active && overview.universityId) setResolvedUniversityId(String(overview.universityId));
    }).catch((err: any) => {
      if (active) setError(err?.message || 'Unable to load collaborations.');
    });
    return () => { active = false; };
  }, [profile?.id, profile?.organization_id]);

  useEffect(() => {
    if (!universityId) { setCollaborations([]); return; }
    return subscribeToIndustryCollaborations(rows => {
      setCollaborations(dedupeIndustryCollaborations(rows.filter((item: any) => universityCollaborationMatches(item, universityIds, profile?.id))));
    }, err => setError(err.message));
  }, [universityId, universityIds, profile?.id]);

  const selectedProject = universityProjects.find((project: any) => project.id === selectedProjectId || project.projectCode === selectedProjectId) || universityProjects[0] || null;
  const recommendedPartners = useMemo(() => {
    if (!selectedProject) return (industry || []).slice(0, 3);
    const keywords = [
      selectedProject.title,
      selectedProject.project_code,
      selectedProject.status,
      (selectedProject.description || '').toString(),
      selectedProject.organization_name,
      (selectedProject.tasks || []).map((task: any) => task.title || '').join(' '),
    ].join(' ').toLowerCase();
    return [...(industry || [])].sort((a: any, b: any) => {
      const scoreA = `${a.name} ${a.expertise?.join(' ') || ''} ${a.capabilities?.join(' ') || ''}`.toLowerCase().split(/\s+/).filter((token: string) => keywords.includes(token)).length;
      const scoreB = `${b.name} ${b.expertise?.join(' ') || ''} ${b.capabilities?.join(' ') || ''}`.toLowerCase().split(/\s+/).filter((token: string) => keywords.includes(token)).length;
      return scoreB - scoreA;
    }).slice(0, 3);
  }, [industry, selectedProject]);

  async function loadCollaborations() {
    const rows = await api.industryCollaborations();
    setCollaborations(dedupeIndustryCollaborations(rows.filter((item: any) => universityCollaborationMatches(item, universityIds, profile?.id))));
  }

  function openSupportDialog(project?: any) {
    const targetProject = project || selectedProject;
    if (!targetProject) return;
    setSelectedProjectId(targetProject.id);
    setSelectedPartner(null);
    setDialogOpen(true);
    setError('');
    setMessage('');
  }

  async function submitSupportRequest(partner?: any) {
    if (!selectedProject) return;
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        projectId: selectedProject.id,
        projectName: selectedProject.title,
        problemId: (selectedProject as any).problemId || selectedProject.challenge_id || (selectedProject as any).challengeId || '',
        teamId: (selectedProject as any).teamId || (selectedProject as any).team_id || '',
        teamName: (selectedProject as any).teamName || (selectedProject as any).projectTeamName || 'Registered Team',
        universityId,
        universityName: profile?.full_name || 'University',
        requestType: 'GUIDANCE',
        industryPartnerId: partner?.id || selectedPartner?.id || null,
        industryPartnerName: partner?.name || selectedPartner?.name || null,
        requestedBy: profile?.id || profile?.email || 'university-user',
        requestedByRole: profile?.role || 'UNIVERSITY_ADMIN',
        ownerId: profile?.id,
        requestedExpertise: ['AI/ML'],
        supportTypes: ['Technical Guidance', 'Testing & Validation'],
        requirement: `Industry support needed for ${selectedProject.title}.`,
        expectedSupport: 'Support the university team during solution development and validation.',
        preferredCollaboration: 'Technical Mentor',
        status: 'PENDING',
        mentorStatus: 'NOT_ASSIGNED',
        progress: 0,
      };
      const created = await api.createIndustryCollaboration(payload);
      await loadCollaborations();
      setDialogOpen(false);
      setSelectedPartner(null);
      if (created && created.id) {
        onNavigate(`/university/industry-collaboration/${created.id}`);
      } else {
        setMessage('Collaboration request sent successfully.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to send collaboration request.');
    } finally {
      setBusy(false);
    }
  }

  const activeCollabs = collaborations.filter((item: any) => ['ACCEPTED', 'IN_PROGRESS'].includes(String(item.status || '').toUpperCase()));
  const pendingRequests = collaborations.filter((item: any) => String(item.status || '').toUpperCase() === 'PENDING');
  const completedSupport = collaborations.filter((item: any) => String(item.status || '').toUpperCase() === 'COMPLETED');
  const mentorsConnected = collaborations.filter((item: any) => String(item.mentorStatus || '').toUpperCase() !== 'NOT_ASSIGNED').length;
  const collaborationForProject = (project: any) => collaborations.find((item: any) =>
    String(item.projectId || '') === String(project.id)
    || Boolean(project.challenge_id || project.challengeId) && String(item.challengeId || item.problemId || '') === String(project.challenge_id || project.challengeId)
  );

  return (
    <div className="civic-page space-y-5">
      <SectionHeader title="Industry Collaboration" subtitle="Connect your university projects with industry partners for technical guidance, prototyping, testing, funding, deployment, and scaling support." />
      {message && <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-800">{message}</div>}
      {error && <p className="text-sm text-error-600">{error}</p>}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Active Collaborations" value={activeCollabs.length} icon={<Handshake size={18} />} color="primary" />
        <MetricCard label="Pending Requests" value={pendingRequests.length} icon={<Clock size={18} />} color="secondary" />
        <MetricCard label="Industry Mentors" value={mentorsConnected} icon={<Users size={18} />} color="accent" />
        <MetricCard label="Completed Support" value={completedSupport.length} icon={<CheckCircle2 size={18} />} color="success" />
      </div>

      {collaborations.length > 0 && <Card className="p-5">
        <h3 className="font-semibold text-primary-900 mb-3">Collaborations</h3>
        <div className="grid lg:grid-cols-2 gap-3">
          {collaborations.map((item: any) => {
            const status = String(item.status || 'PENDING').toUpperCase();
            const accepted = ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(status);
            return <div key={item.id} className="rounded-xl border border-neutral-200 p-4">
              <div className="flex justify-between items-center gap-3">
                <h4 className="font-semibold text-primary-900">{item.industryPartnerName || 'Industry Partner'}</h4>
                <span className={`badge ${accepted ? 'bg-success-50 text-success-700' : 'bg-amber-50 text-amber-700'}`}>{status.replaceAll('_', ' ')}</span>
              </div>
              <p className="text-sm text-neutral-600 mt-2">Project: {item.projectName || item.projectTitle || item.projectId || item.challengeTitle}</p>
              <p className="text-sm text-neutral-600">Team: {item.teamName || item.teamId || 'University team'}</p>
              <p className="text-sm text-neutral-600">Support: {(item.supportTypes || []).join(' + ') || item.topic || 'Technical guidance'}</p>
              <button className="btn-secondary mt-3" onClick={() => onNavigate(`/university/industry-collaboration/${item.id}`)}>Open Collaboration</button>
            </div>;
          })}
        </div>
      </Card>}

      <Card className="p-5 border-secondary-100 bg-secondary-50">
        <h3 className="font-semibold text-primary-900">Projects Needing Industry Support</h3>
        <p className="text-sm text-neutral-600 mt-1">Request industry expertise when your team needs additional technical, testing, prototype, funding, or deployment support.</p>
      </Card>

      {universityProjects.length === 0 ? (
        <EmptyState icon={<Handshake size={40} />} title="No university projects yet" description="Register a team and create a project to start an industry collaboration request." />
      ) : (
        <div className="space-y-4">
          {universityProjects.map((project: any) => {
            const progress = Math.min(100, Number(project.progress || 0) || 35);
            const collaboration = collaborationForProject(project);
            const partnerName = collaboration?.industryPartnerName || project.industryPartnerName || project.industryMentorName;
            const status = partnerName ? `Industry Partner: ${partnerName}` : collaboration ? String(collaboration.status || 'PENDING').replaceAll('_', ' ') : 'Not Requested';
            return (
              <Card key={project.id} className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-primary-900">{project.title}</h3>
                    <p className="text-sm text-neutral-600">Challenge: {project.challengeTitle || project.challengeId || 'Project challenge'}</p>
                    <p className="text-sm text-neutral-600">Team: {project.organization_name || project.team_members?.[0]?.name || 'Registered Team'}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-neutral-600">
                      <span className="badge bg-neutral-100 text-neutral-700">Current Phase: {project.status?.replaceAll('_', ' ') || 'SOLUTION_DEVELOPMENT'}</span>
                      <span className="badge bg-primary-50 text-primary-700">Progress: {progress}%</span>
                      <span className="badge bg-secondary-50 text-secondary-700">Industry Support: {status}</span>
                    </div>
                  </div>
                  {collaboration
                    ? <button className="btn-secondary" onClick={() => onNavigate(`/university/industry-collaboration/${collaboration.id}`)}>View Collaboration</button>
                    : <button className="btn-primary" onClick={() => openSupportDialog(project)}>Request Industry Support</button>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-5">
        <h3 className="font-semibold text-primary-900 mb-3">Recommended Industry Partners</h3>
        <div className="grid lg:grid-cols-3 gap-4">
          {recommendedPartners.map((partner: any) => (
            <div key={partner.id} className="rounded-xl border border-neutral-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-primary-900">{partner.name}</h4>
                  <p className="text-xs text-neutral-500 mt-1">{partner.type || 'Industry Partner'}</p>
                </div>
                <span className="badge bg-success-50 text-success-700">{partner.expertise?.slice(0, 2).join(' Â· ') || 'Tech support'}</span>
              </div>
              <p className="text-xs text-neutral-600 mt-3">Expertise: {partner.expertise?.join(' Â· ') || 'Consulting support'}</p>
              <p className="text-xs text-neutral-600 mt-2">{partner.description || 'Strong alignment with the university project and current phase.'}</p>
              <div className="flex gap-2 mt-4">
                <button className="btn-secondary" onClick={() => setSelectedPartner(partner)}>View Partner</button>
                <button className="btn-primary" onClick={() => submitSupportRequest(partner)} disabled={busy}>Request</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {selectedPartner && (
        <Card className="p-5">
          <h3 className="font-semibold text-primary-900">{selectedPartner.name}</h3>
          <div className="grid md:grid-cols-2 gap-4 mt-4 text-sm text-neutral-600">
            <p><span className="text-neutral-500">Type:</span> {selectedPartner.type || 'Industry'}</p>
            <p><span className="text-neutral-500">Location:</span> {selectedPartner.location || 'Not specified'}</p>
            <p><span className="text-neutral-500">Expertise:</span> {(selectedPartner.expertise || []).join(' Â· ') || 'Technical support'}</p>
            <p><span className="text-neutral-500">Capabilities:</span> {(selectedPartner.capabilities || ['Technical Guidance']).join(' Â· ')}</p>
          </div>
        </Card>
      )}

      {dialogOpen && selectedProject && (
        <div className="fixed inset-0 z-50 bg-primary-950/30 p-4 flex items-center justify-center" onMouseDown={(event) => event.currentTarget === event.target && setDialogOpen(false)}>
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-y-auto max-h-[92vh]">
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-primary-900">Request Industry Support</h3>
                <p className="text-sm text-neutral-500 mt-1">Select the support your project needs.</p>
              </div>
              <button className="btn-ghost" onClick={() => setDialogOpen(false)}>Close</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-lg bg-neutral-50 p-3"><p className="text-xs text-neutral-500">Project</p><p className="font-semibold text-primary-900 mt-1">{selectedProject.title}</p></div>
                <div className="rounded-lg bg-neutral-50 p-3"><p className="text-xs text-neutral-500">Team</p><p className="font-semibold text-primary-900 mt-1">{selectedProject.organization_name || 'Registered Team'}</p></div>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-700 mb-2">What type of support does your project need?</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {['Technical Guidance', 'Research Support', 'Testing & Validation', 'Prototype Support', 'Funding / Resources', 'Deployment Support', 'Domain Expertise', 'Cloud / Infrastructure'].map((option) => (
                    <label key={option} className="flex items-center gap-2 rounded-lg border border-neutral-200 p-2 text-sm">
                      <input type="checkbox" defaultChecked={option === 'Technical Guidance' || option === 'Testing & Validation'} />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <label className="text-sm font-medium text-neutral-700">Requested Expertise<input className="input mt-1" defaultValue="AI/ML" /></label>
                <label className="text-sm font-medium text-neutral-700">Preferred Collaboration<select className="input mt-1" defaultValue="Technical Mentor"><option>Technical Mentor</option><option>Industry Mentor</option><option>Prototype Support</option><option>Testing Partner</option><option>Funding Support</option><option>Deployment Partner</option></select></label>
              </div>
              <label className="block text-sm font-medium text-neutral-700">Problem / Requirement<textarea className="input mt-1" rows={3} defaultValue={`Need support for ${selectedProject.title} during solution development and validation.`} /></label>
              <label className="block text-sm font-medium text-neutral-700">Expected Support<textarea className="input mt-1" rows={3} defaultValue="We need project mentoring, testing guidance, and support for deployment readiness." /></label>
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn-secondary" onClick={() => setDialogOpen(false)}>Cancel</button>
                <button type="button" className="btn-primary" disabled={busy} onClick={() => submitSupportRequest(selectedPartner)}> {busy ? 'Sending...' : 'Send Request'} </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function UniversityIndustryCollaborationDetailPage({collaborationId, onNavigate}:{collaborationId:string; onNavigate:(route:string)=>void}){
  const [collaboration, setCollaboration] = useState<any>(null);
  const [guidance, setGuidance] = useState<any[]>([]);
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const row = await api.industryCollaboration(collaborationId);
        if (active) setCollaboration(row);
        if (row && row.id) {
          const requests = await api.industryGuidanceRequests(row.id);
          if (active) setGuidance(requests);
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    }
    void load();
    return () => { active = false; };
  }, [collaborationId]);

  async function sendGuidanceRequest() {
    if (!collaboration || !topic.trim() || !description.trim()) return;
    setBusy(true);
    try {
      await api.createIndustryGuidanceRequest(collaboration.id, { topic, description, priority, status: 'OPEN', createdAt: new Date().toISOString() });
      const next = await api.industryGuidanceRequests(collaboration.id);
      setGuidance(next);
      setTopic(''); setDescription(''); setPriority('Medium');
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  }

  if (!collaboration) return <div className="civic-page"><SectionHeader title="Industry Collaboration" subtitle="Loading collaboration detailsâ€¦"/>{error && <p className="text-error-600 text-sm">{error}</p>}</div>;

  const status = String(collaboration.status || 'PENDING').toUpperCase();
  const journey = [
    { label: 'Request sent', done: true },
    { label: 'Industry accepted', done: ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(status) },
    { label: 'Mentor connected', done: String(collaboration.mentorStatus || '').toUpperCase() !== 'NOT_ASSIGNED' },
    { label: 'Support started', done: ['IN_PROGRESS', 'COMPLETED'].includes(status) },
    { label: 'Prototype / testing', done: status === 'COMPLETED' || Number(collaboration.progress || 0) >= 60 },
    { label: 'Support completed', done: status === 'COMPLETED' },
  ];

  return <div className="civic-page space-y-5"><div className="flex items-center gap-2"><button className="btn-secondary text-xs" onClick={()=>onNavigate('/dashboard/industry-collaboration')}>Back to collaborations</button></div><SectionHeader title="Collaboration Detail" subtitle={`${collaboration.industryPartnerName || 'Industry partner'} Â· ${collaboration.projectName || collaboration.projectId}`} />{error && <p className="text-sm text-error-600">{error}</p>}<Card className="p-5"><div className="grid lg:grid-cols-4 gap-4"><div><p className="text-xs text-neutral-500">Industry Partner</p><h3 className="font-semibold text-primary-900 mt-1">{collaboration.industryPartnerName || 'Pending partner'}</h3></div><div><p className="text-xs text-neutral-500">Project</p><h3 className="font-semibold text-primary-900 mt-1">{collaboration.projectName || collaboration.projectId}</h3></div><div><p className="text-xs text-neutral-500">Team</p><h3 className="font-semibold text-primary-900 mt-1">{collaboration.teamName || 'Registered Team'}</h3></div><div><p className="text-xs text-neutral-500">Current Status</p><span className="badge bg-primary-50 text-primary-700 mt-2">{status.replaceAll('_', ' ')}</span></div></div></Card><Card className="p-5"><h3 className="font-semibold text-primary-900 mb-4">Collaboration Journey</h3><div className="grid md:grid-cols-6 gap-3">{journey.map((step:any, index:number)=><div key={index} className={`rounded-lg border p-3 ${step.done ? 'border-success-200 bg-success-50' : 'border-neutral-200 bg-neutral-50'}`}><p className="text-xs text-neutral-500">{step.label}</p><p className="text-sm font-semibold mt-2">{step.done ? 'âœ“' : 'â—‹'}</p></div>)}</div></Card><div className="grid lg:grid-cols-2 gap-5"><Card className="p-5"><h3 className="font-semibold text-primary-900">Support Activity</h3><div className="mt-3 space-y-3">{(collaboration.activity || []).length ? (collaboration.activity || []).map((item:any, index:number) => <div key={index} className="rounded-lg border border-neutral-200 p-3"><b className="text-sm">{item.activity || 'Technical Guidance'}</b><p className="text-xs text-neutral-500 mt-1">{item.addedBy || 'University team'} Â· {item.date || 'Recently'}</p><p className="text-xs text-neutral-600 mt-1">{item.description || 'Support provided.'}</p></div>) : <p className="text-sm text-neutral-500">No support activity logged yet.</p>}</div></Card><Card className="p-5"><h3 className="font-semibold text-primary-900">Guidance Requests</h3><div className="space-y-3 mt-3">{guidance.length ? guidance.map((request:any)=><div key={request.id} className="rounded-lg border border-neutral-200 p-3"><div className="flex justify-between gap-3"><b className="text-sm">{request.topic}</b><span className="badge bg-amber-50 text-amber-700">{request.priority || 'Medium'}</span></div><p className="text-xs text-neutral-500 mt-1">{request.status || 'OPEN'}</p><p className="text-sm text-neutral-600 mt-2">{request.description}</p></div>) : <p className="text-sm text-neutral-500">No guidance requests yet.</p>}</div><div className="mt-4 space-y-2"><input className="input" placeholder="Topic" value={topic} onChange={(event) => setTopic(event.target.value)} /><textarea className="input" rows={3} placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} /><select className="input" value={priority} onChange={(event) => setPriority(event.target.value)}><option>Low</option><option>Medium</option><option>High</option></select><button className="btn-primary" disabled={busy || !topic.trim() || !description.trim()} onClick={sendGuidanceRequest}>Send Guidance Request</button></div></Card></div>{(collaboration.supportTypes || []).includes('Funding / Resources') && <Card className="p-5"><SectionHeader title="Funding / Resource Request" subtitle="Support that is still pending review or has been approved."/><div className="grid md:grid-cols-3 gap-3 mt-3"><div className="rounded-lg bg-neutral-50 p-3"><p className="text-xs text-neutral-500">Requested Resource</p><p className="font-semibold text-primary-900 mt-1">{collaboration.resourceName || 'Resource request'}</p></div><div className="rounded-lg bg-neutral-50 p-3"><p className="text-xs text-neutral-500">Purpose</p><p className="font-semibold text-primary-900 mt-1">{collaboration.expectedSupport || 'Support requested'}</p></div><div className="rounded-lg bg-neutral-50 p-3"><p className="text-xs text-neutral-500">Estimated Requirement</p><p className="font-semibold text-primary-900 mt-1">{collaboration.estimatedRequirement || 'Not specified'}</p></div></div></Card>}</div>}

function useLoad(loader:()=>Promise<any>){const[data,setData]=useState<any>(null),[error,setError]=useState('');useEffect(()=>{loader().then(setData).catch(e=>setError(e.message))},[]);return{data,error}}

