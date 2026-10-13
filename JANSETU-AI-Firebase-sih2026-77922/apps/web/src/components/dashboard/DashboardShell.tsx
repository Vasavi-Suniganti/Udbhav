import {useCallback,useEffect,useMemo,useRef,useState,type PointerEvent,type KeyboardEvent as ReactKeyboardEvent,type ReactNode} from 'react';
import {Landmark,Search,Bell,Settings,Home,MapPin,FileText,Users,Building2,Rocket,BarChart3,ShieldCheck,Layers,Copy,Target,Award,Briefcase,GraduationCap,HeartHandshake,AlertTriangle,Zap,Plus,ChevronRight,CheckSquare,BrainCircuit,Leaf,Handshake,LayoutDashboard,Compass,UsersRound,FolderKanban,ListChecks,UserRound,PanelLeftClose,PanelLeftOpen,type LucideIcon} from 'lucide-react';
import {useAuth} from '@/context/AuthContext';
import {useI18n} from '@/context/I18nContext';
import {api} from '@/lib/api';
import type {UserRole} from '@/types';
import TopBar from '@/components/layout/TopBar';
import { DashboardMotionContext, PageTransition } from '@/components/ui/motion';
import LoginWelcomeAnimation from '@/components/LoginWelcomeAnimation';
import { consumeLoginWelcomePending } from '@/lib/loginWelcome';

interface DashboardShellProps{children:ReactNode;currentPage:string;onNavigate:(route:string)=>void}
interface NavItem{label:string;route:string;icon:LucideIcon;badge?:string}

function getNavItems(role:UserRole):NavItem[]{
  const common:NavItem[]=[
    {label:'Overview',route:'/dashboard',icon:Home},
    {label:'Innovation Map',route:'/dashboard/map',icon:MapPin},
    {label:'Challenges',route:'/dashboard/challenges',icon:FileText},
    {label:'Marketplace',route:'/dashboard/marketplace',icon:Target},
    {label:'Projects',route:'/dashboard/projects',icon:Rocket},
    {label:'Solutions',route:'/dashboard/solutions',icon:Copy}
  ];

  switch(role){
    case'CITIZEN':
      return[
        {label:'Overview',route:'/dashboard',icon:Home},
        {label:'Report Problem',route:'/dashboard/submit',icon:Plus},
        {label:'My Problems',route:'/dashboard/my-challenges',icon:FileText},
        {label:'Community Problems',route:'/dashboard/community',icon:Users},
        {label:'AI Analysis',route:'/dashboard/copilot',icon:BrainCircuit},
        {label:'Notifications',route:'/dashboard/notifications',icon:Bell},
        {label:'Profile',route:'/dashboard/profile',icon:Settings},
      ];

    case'VOLUNTEER':
      return[
        {label:'Overview',route:'/dashboard',icon:Home},
        {label:'Report New',route:'/dashboard/volunteer/report',icon:Plus},
        {label:'My Reports',route:'/dashboard/volunteer/reports',icon:FileText},
        {label:'Community Priority',route:'/dashboard/community',icon:Users},
        {label:'AI Analysis',route:'/dashboard/copilot',icon:BrainCircuit},
        {label:'Innovation Map',route:'/dashboard/map',icon:MapPin},
        {label:'Notifications',route:'/dashboard/notifications',icon:Bell},
        {label:'Profile',route:'/dashboard/profile',icon:UserRound},
      ];

    case'STUDENT':
      return[
        ...common,
        {label:'My Tasks',route:'/dashboard/tasks',icon:CheckSquare},
        {label:'My Teams',route:'/dashboard/teams',icon:Users},
        {label:'Portfolio',route:'/dashboard/portfolio',icon:Award}
      ];

    case'FACULTY':
      return[
        ...common,
        {label:'Mentorship',route:'/dashboard/mentorship',icon:GraduationCap},
        {label:'Reviews',route:'/dashboard/reviews',icon:ShieldCheck}
      ];

    case'UNIVERSITY_ADMIN':
      return[
        {label:'Overview',route:'/dashboard',icon:LayoutDashboard},
        {label:'Routed Challenges',route:'/dashboard/challenges',icon:Compass},
        {label:'My Teams',route:'/dashboard/teams',icon:UsersRound},
        {label:'Projects',route:'/dashboard/projects',icon:FolderKanban},
        {label:'Solution Submissions',route:'/dashboard/solution-submissions',icon:GraduationCap},
        {label:'Industry Collaboration',route:'/dashboard/industry-collaboration',icon:Handshake},
        {label:'Milestones',route:'/dashboard/milestones',icon:ListChecks},
        {label:'Notifications',route:'/dashboard/notifications',icon:Bell},
        {label:'Profile',route:'/dashboard/profile',icon:UserRound},
      ];

    case'INDUSTRY_PARTNER':
    case'STARTUP':
    case'MSME':
    case'CSR_PARTNER':
    case'RESEARCH_LAB':
      return[
        {label:'Overview',route:'/dashboard',icon:Home},
        {label:'Challenges',route:'/dashboard/challenges',icon:FileText},
        {label:'Projects',route:'/dashboard/projects',icon:Rocket},
        {label:'Innovation Map',route:'/dashboard/map',icon:MapPin},
        {label:'Solutions',route:'/dashboard/solutions',icon:Copy},
        {label:'Mentorship',route:'/dashboard/industry-mentorship',icon:GraduationCap},
        {label:'Prototype Reviews',route:'/dashboard/prototype-reviews',icon:ShieldCheck},
        {label:'Industry Support',route:'/dashboard/industry-support',icon:Briefcase},
        {label:'Collaborations',route:'/dashboard/collaborations',icon:HeartHandshake},
        {label:'Notifications',route:'/dashboard/notifications',icon:Bell},
        {label:'Profile',route:'/dashboard/profile',icon:UserRound},
        ...(role==='CSR_PARTNER'?[{label:'CSR Marketplace',route:'/dashboard/csr',icon:Target}]:[])
      ];

    case'PANCHAYAT_OFFICER':
    case'ULB_OFFICER':
    case'DISTRICT_OFFICER':
    case'GOVERNMENT_OFFICER':
    case'DEPARTMENT_ADMIN':
    case'PROJECT_OFFICER':
    case'FINANCE_OFFICER':
    case'ANALYTICS_OFFICER':
      return[
        {label:'Command Centre',route:'/dashboard',icon:BarChart3},
        {label:'Validation Queue',route:'/dashboard/validation',icon:ShieldCheck},
        {label:'Challenges',route:'/dashboard/challenges',icon:FileText},
        {label:'Citizens',route:'/dashboard/gov-citizens',icon:Users},
        {label:'Ecosystem',route:'/dashboard/gov-ecosystem',icon:Building2},
        {label:'Mentor Monitoring',route:'/dashboard/gov-mentorship',icon:GraduationCap},
        {label:'Problem Map',route:'/dashboard/map',icon:MapPin},
        {label:'Projects',route:'/dashboard/projects',icon:Rocket},
        {label:'Solution Review',route:'/dashboard/solution-review',icon:GraduationCap},
        {label:'Deployments',route:'/dashboard/deployments',icon:Rocket},
        {label:'Announcements',route:'/dashboard/announcements',icon:Bell},
        {label:'Notifications',route:'/dashboard/notifications',icon:Bell}
      ];

    case'PLATFORM_ADMIN':
    case'SUPER_ADMIN':
      return[
        {label:'Admin Panel',route:'/dashboard',icon:ShieldCheck},
        {label:'Users',route:'/dashboard/users',icon:Users},
        {label:'Organizations',route:'/dashboard/organizations',icon:Building2},
        {label:'Challenges',route:'/dashboard/challenges',icon:FileText},
        {label:'Projects',route:'/dashboard/projects',icon:Rocket},
        {label:'Analytics',route:'/dashboard/analytics',icon:BarChart3},
        {label:'AI Jobs',route:'/dashboard/ai-jobs',icon:Zap},
        {label:'System Health',route:'/dashboard/system-health',icon:BarChart3},
        {label:'Configuration',route:'/dashboard/configuration',icon:Settings},
        {label:'Audit Logs',route:'/dashboard/audit',icon:AlertTriangle},
        {label:'Settings',route:'/dashboard/settings',icon:Settings}
      ];

    default:
      return common;
  }
}

const labelKeys:Record<string,string>={
  Overview:'overview',
  Home:'overview',
  'Innovation Map':'map',
  'Problem Map':'map',
  Challenges:'challenges',
  Marketplace:'marketplace',
  Projects:'projects',
  Solutions:'solutions',
  'Report Problem':'reportNew',
  'Report New':'reportNew',
  Impact:'impact',
  Notifications:'notifications',
  Teams:'teams',
  Faculty:'faculty',
  'Solution Submissions':'solution-submissions',
  'Solution Review':'solution-review',
  Collaborations:'collaborations',
  'CSR Marketplace':'csr',
  'Validation Queue':'validation',
  Clusters:'clusters',
  Analytics:'analytics',
  Users:'users',
  Organizations:'organizations',
  'Admin Panel':'admin',
  'System Health':'health',
  'AI Jobs':'jobs',
  Configuration:'configuration',
  Settings:'settings'
};

export default function DashboardShell({children,currentPage,onNavigate}:DashboardShellProps){
  const{profile}=useAuth();
  const{t}=useI18n();
  const isUniversity=profile?.role==='UNIVERSITY_ADMIN';
  const profileOrganizationName=(profile as unknown as Record<string,unknown> | null)?.organization_name || (profile as unknown as Record<string,unknown> | null)?.organizationName;
  const[sidebarOpen,setSidebarOpen]=useState(false),[sidebarCollapsed,setSidebarCollapsed]=useState(false),[sidebarWidth,setSidebarWidth]=useState(270),[isResizing,setIsResizing]=useState(false),[paletteOpen,setPaletteOpen]=useState(false),[paletteQuery,setPaletteQuery]=useState('');
  const resizeStart=useRef<{x:number;width:number}|null>(null);
  const[showLoginWelcome,setShowLoginWelcome]=useState(false);
  const completeLoginWelcome=useCallback(()=>setShowLoginWelcome(false),[]);
  const[universityName,setUniversityName]=useState('');
  const[universitySearchData,setUniversitySearchData]=useState<{projects:any[];challenges:any[]}>({projects:[],challenges:[]});
  const navItems=getNavItems(profile?.role||'CITIZEN');
  const enhancedRoles=['CITIZEN','VOLUNTEER','GOVERNMENT','PANCHAYAT_OFFICER','ULB_OFFICER','DISTRICT_OFFICER','GOVERNMENT_OFFICER','DEPARTMENT_ADMIN','PROJECT_OFFICER','FINANCE_OFFICER','ANALYTICS_OFFICER','UNIVERSITY','UNIVERSITY_ADMIN','STUDENT','FACULTY','INDUSTRY_PARTNER','STARTUP','MSME','CSR_PARTNER','RESEARCH_LAB'];
  const enhancedDashboard=enhancedRoles.includes(profile?.role||'CITIZEN');
  const navLabel=(label:string)=>t(labelKeys[label]||'',label);
  const paletteItems=useMemo(()=>navItems.filter(x=>!paletteQuery||`${x.label} ${x.route}`.toLowerCase().includes(paletteQuery.toLowerCase())),[navItems,paletteQuery]);

  useEffect(()=>{
    const fn=(e:KeyboardEvent)=>{
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){
        e.preventDefault();
        setPaletteOpen(v=>!v)
      }
      if(e.key==='Escape')setPaletteOpen(false)
    };
    window.addEventListener('keydown',fn);
    return()=>window.removeEventListener('keydown',fn)
  },[]);

  useEffect(()=>{
    if(profile?.id && consumeLoginWelcomePending())setShowLoginWelcome(true);
  },[profile?.id]);

  useEffect(()=>{
    if(!isUniversity)return;
    let active=true;
    api.universityOrganization().then((name:string)=>{if(active&&name)setUniversityName(name)}).catch(()=>undefined);
    return()=>{active=false};
  },[isUniversity]);

  useEffect(()=>{
    if(!paletteOpen||!isUniversity)return;
    let active=true;
    api.universityOverview().then((result:any)=>{
      if(active)setUniversitySearchData({projects:result.projects||[],challenges:result.challenges||[]});
    }).catch(()=>undefined);
    return()=>{active=false};
  },[paletteOpen,isUniversity]);

  const searchTerm=paletteQuery.trim().toLowerCase();
  const universityMatches=searchTerm&&isUniversity?[
    ...universitySearchData.projects.filter(item=>`${item.title||''} ${item.description||''} ${item.teamName||''} ${(item.expertise||[]).join(' ')} ${(item.team_members||[]).map((member:any)=>member.name||member.expertise||'').join(' ')}`.toLowerCase().includes(searchTerm)).map(item=>({id:`project-${item.id}`,title:item.title||'University project',detail:`Project · ${item.teamName||item.status||'In development'}`,route:`/dashboard/projects/${item.id}`,icon:FolderKanban})),
    ...universitySearchData.challenges.filter(item=>`${item.title||''} ${item.description||''} ${(item.expertise||item.ai_required_expertise||item.aiRequiredExpertise||[]).join(' ')}`.toLowerCase().includes(searchTerm)).map(item=>({id:`challenge-${item.id}`,title:item.title||'Routed challenge',detail:`Routed challenge · ${(item.expertise||item.ai_required_expertise||item.aiRequiredExpertise||[]).join(', ')||item.status||'University opportunity'}`,route:'/dashboard/routed-challenges',icon:Compass})),
  ]:[];

  function handleNav(route:string){
    onNavigate(route);
    setSidebarOpen(false)
  }

  function resizeStartHandler(event:PointerEvent<HTMLDivElement>){
    event.preventDefault();
    resizeStart.current={x:event.clientX,width:sidebarWidth};
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsResizing(true);
  }

  function resizeMoveHandler(event:PointerEvent<HTMLDivElement>){
    if(!resizeStart.current)return;
    setSidebarWidth(Math.min(360,Math.max(220,resizeStart.current.width+event.clientX-resizeStart.current.x)));
  }

  function resizeEndHandler(){
    resizeStart.current=null;
    setIsResizing(false);
  }

  function resizeKeyHandler(event:ReactKeyboardEvent<HTMLDivElement>){
    if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
    event.preventDefault();
    setSidebarWidth(width=>Math.min(360,Math.max(220,width+(event.key==='ArrowRight'?12:-12))));
  }

  return <DashboardMotionContext.Provider value={enhancedDashboard}><div className={`civic-shell min-h-screen flex ${isUniversity?'university-shell':''} ${enhancedDashboard?'dashboard-enhanced':''} ${sidebarCollapsed?'is-sidebar-collapsed':''} ${isResizing?'is-sidebar-resizing':''}`}>
    {showLoginWelcome&&<LoginWelcomeAnimation firstName={profile?.full_name?.trim().split(/\s+/)[0]} onComplete={completeLoginWelcome}/>}
    <aside
      className={`civic-sidebar fixed lg:sticky top-0 left-0 z-40 flex flex-col transition-transform duration-300 ${sidebarOpen?'translate-x-0':'-translate-x-full lg:translate-x-0'}`}
      style={enhancedDashboard?{width:sidebarCollapsed?80:sidebarWidth}:undefined}
    >
      <div className="civic-sidebar-header">
        <button onClick={()=>onNavigate('/')} className="civic-brand-button">
          <div className="civic-brand-mark"><Landmark className="text-white" size={19} /></div>
          <div className="civic-brand-copy">
            <span className="civic-brand-name">UDBHAV</span>
            <span className="civic-brand-subtitle">{profile?.role === 'UNIVERSITY_ADMIN' ? 'University Portal' : 'Government of Jharkhand'}</span>
          </div>
          <ChevronRight size={15} className="civic-brand-chevron" />
        </button>
        {enhancedDashboard&&<button type="button" className="civic-sidebar-toggle hidden lg:grid" onClick={()=>setSidebarCollapsed(value=>!value)} aria-label={sidebarCollapsed?'Expand sidebar':'Collapse sidebar'} title={sidebarCollapsed?'Expand sidebar':'Collapse sidebar'}>{sidebarCollapsed?<PanelLeftOpen size={17}/>:<PanelLeftClose size={17}/>}</button>}
      </div>

      <nav className="civic-sidebar-nav">
        {navItems.map(item=>{
          const Icon=item.icon,isActive=currentPage===item.route||(item.route!=='/dashboard'&&currentPage.startsWith(`${item.route}/`));
          return <a
            key={item.route}
            href={`#${item.route}`}
            onClick={()=>handleNav(item.route)}
            aria-current={isActive?'page':undefined}
            aria-label={navLabel(item.label)}
            data-tooltip={navLabel(item.label)}
            className={`civic-nav-item ${isActive?'is-active':''}`}
          >
            <Icon size={17}/>
            <span>{navLabel(item.label)}</span>
            {item.badge&&<span className="civic-nav-badge">{item.badge}</span>}
          </a>
        })}
      </nav>

      <div className="civic-sidebar-footer" aria-label="Community message">
        <div className="civic-footer-shapes" aria-hidden="true">
          <span className="civic-shape shape-one" />
          <span className="civic-shape shape-two" />
          <span className="civic-shape shape-three" />
        </div>
        <div className="civic-footer-copy">
          <div className="civic-footer-brand"><Leaf size={14} /> {isUniversity ? universityName || String(profileOrganizationName || 'University Portal') : 'UDBHAV'}</div>
          <div className="civic-footer-title">INNOVATION FOR<br />COMMUNITY IMPACT</div>
          <div className="civic-footer-text">Discover · Build · Deploy</div>
        </div>
      </div>
      {enhancedDashboard&&<div className="civic-sidebar-resize hidden lg:block" role="separator" aria-orientation="vertical" aria-label="Resize sidebar" aria-valuemin={220} aria-valuemax={360} aria-valuenow={sidebarWidth} tabIndex={0} onPointerDown={resizeStartHandler} onPointerMove={resizeMoveHandler} onPointerUp={resizeEndHandler} onPointerCancel={resizeEndHandler} onKeyDown={resizeKeyHandler}/>}
    </aside>

    {sidebarOpen&&<div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={()=>setSidebarOpen(false)}/>}

    <div className="civic-main-shell flex-1 flex flex-col min-w-0">
      <TopBar
        pageTitle={navItems.find(item=>item.route===currentPage)?.label || 'UDBHAV'}
        onNavigate={handleNav}
        onSearch={()=>setPaletteOpen(true)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={()=>setSidebarOpen(value=>!value)}
      />

      <main className="civic-main flex-1 overflow-y-auto">{enhancedDashboard?<PageTransition route={currentPage}>{children}</PageTransition>:children}</main>
    </div>

    {paletteOpen&&
      <div
        className="fixed inset-0 z-[80] bg-primary-950/35 p-4 flex items-start justify-center pt-[12vh]"
        onMouseDown={()=>setPaletteOpen(false)}
      >
        <div
          className="w-full max-w-xl rounded-2xl bg-[#fffaf0] shadow-2xl border border-neutral-200 overflow-hidden"
          onMouseDown={e=>e.stopPropagation()}
        >
          <div className="p-3 border-b border-neutral-200 flex items-center gap-2">
            <Search size={18} className="text-neutral-400"/>
            <input
              autoFocus
              value={paletteQuery}
              onChange={e=>setPaletteQuery(e.target.value)}
              className="w-full outline-none text-sm bg-transparent"
              placeholder={isUniversity?'Search challenges, projects or expertise...':'Search commands and pages…'}
            />
            <kbd className="text-xs text-neutral-400">Esc</kbd>
          </div>

          <div className="max-h-96 overflow-auto p-2">
            {searchTerm&&isUniversity?universityMatches.map(item=>{
              const Icon=item.icon;
              return <button key={item.id} onClick={()=>{handleNav(item.route);setPaletteOpen(false);setPaletteQuery('')}} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-primary-50">
                <Icon size={16} className="text-primary-600"/><span className="min-w-0 flex-1"><b className="block truncate font-medium">{item.title}</b><small className="block truncate text-xs text-neutral-500">{item.detail}</small></span><span className="text-xs text-neutral-400">Open</span>
              </button>;
            }):paletteItems.map(item=>{
              const Icon=item.icon;
              return <button
                key={item.route}
                onClick={()=>{
                  handleNav(item.route);
                  setPaletteOpen(false);
                  setPaletteQuery('')
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary-50 text-sm"
              >
                <Icon size={16} className="text-primary-600"/>
                <span>{navLabel(item.label)}</span>
                <span className="ml-auto text-xs text-neutral-400">{item.route}</span>
              </button>
            })}

            {searchTerm&&isUniversity&&!universityMatches.length&&<p className="px-3 py-8 text-center text-sm text-neutral-500">No matching university projects, challenges, or expertise.</p>}

            <button
              onClick={()=>{
                handleNav('/dashboard/search');
                setPaletteOpen(false)
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary-50 text-sm"
            >
              <Search size={16}/>
              <span>Advanced global search</span>
            </button>
          </div>
        </div>
      </div>
    }
  </div></DashboardMotionContext.Provider>
}