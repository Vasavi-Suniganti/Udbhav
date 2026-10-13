import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { PlatformProvider } from '@/context/PlatformContext';
import LandingPage from '@/components/landing/LandingPage';
import AuthPage from '@/components/auth/AuthPage';
import DashboardShell from '@/components/dashboard/DashboardShell';
import CitizenDashboard from '@/components/dashboard/pages/CitizenDashboard';
import SubmitWizard from '@/components/dashboard/pages/SubmitWizard';
import ChallengeList from '@/components/dashboard/pages/ChallengeList';
import GovDashboard from '@/components/dashboard/pages/GovDashboard';
import ValidationQueue from '@/components/dashboard/pages/ValidationQueue';
import ProjectWorkspace from '@/components/dashboard/pages/ProjectWorkspace';
import InnovationMapPage from '@/components/dashboard/pages/InnovationMapPage';
import VolunteerProfilePage from '@/components/dashboard/pages/VolunteerProfilePage';

import {
  InstitutionsPage,
  FacultyPage,
  SolutionSubmissionsPage,
  SolutionSubmissionDetailPage,
  GovernmentSolutionReviewPage,
  PartnersPage,
  TasksPage,
  AdminUsersPage,
  AuditPage,
  ModerationPage,
  SearchPage,
  CopilotPage,
  SettingsPage
} from '@/components/dashboard/pages/OperationsPages';

import {
  SolutionsPage,
  ImpactPage,
  MapPage,
  ClustersPage,
  ProfilePage,
  NotificationsPage,
} from '@/components/dashboard/pages/SimplePages';

import { LoadingState } from '@/components/ui';

import {
  TransparencyPortal,
  ImpactPassport
} from '@/components/public/PublicPages';

import {
  StudentCommandCentre,
  FacultyCommandCentre,
  IndustryCommandCentre,
  DistrictCommandCentre
} from '@/components/dashboard/pages/RoleDashboards';
import { UniversityOverviewPage as UniversityCommandCentre } from '@/components/dashboard/pages/UniversityOverviewPage';

import {
  ChallengeMarketplace,
  CSRMarketplace,
  KnowledgeGraphPage,
  AIJobsPage,
  SystemHealthPage,
  AdminConfigurationPage
} from '@/components/dashboard/pages/AdvancedPages';

import { I18nProvider } from '@/context/I18nContext';

import {
  StudentPortfolioPage,
  MentorshipPage,
  ProposalReviewQueuePage,
  MatchedChallengesPage,
  TeamFormationPage,
  RegisteredTeamsPage,
  UniversityMilestonesPage,
  UniversityIndustryCollaborationPage,
  UniversityIndustryCollaborationDetailPage,
} from '@/components/dashboard/pages/RoleWorkflowPages';

import {
  CommunityPage,
  VolunteerDashboard
} from '@/components/dashboard/pages/CommunityVolunteerPages';

import {
  GovernmentEcosystemPage,
  GovernmentMentorshipMonitor,
  GovernmentAlertsPage,
  AnnouncementsPage,
  AnnouncementDetailPage,
  DeploymentManagementPage
} from '@/components/dashboard/pages/GovernmentExtendedPages';

import GovernmentCitizensView from '@/components/dashboard/pages/GovernmentCitizensView';
import GovernmentEcosystemView from '@/components/dashboard/pages/GovernmentEcosystemView';

import {
  IndustryMentorWorkspace,
  PrototypeReviewPage,
  IndustrySupportPage,
  IndustryCollaborationsPage
} from '@/components/dashboard/pages/IndustryPages';

import ProblemWorkspace from '@/components/dashboard/pages/ProblemWorkspace';
import IndustrySolutionsPage from '@/components/dashboard/pages/IndustrySolutionsPage';

import {
  PlatformAdminDashboard
} from '@/components/dashboard/pages/OperationsPages';

import { mainRoleFor } from '@/types';

const INDUSTRY_ROLES = ['INDUSTRY_PARTNER','STARTUP','MSME','CSR_PARTNER','RESEARCH_LAB'];

function IndustryMarketplaceRedirect({onNavigate}:{onNavigate:(route:string)=>void}) {
  useEffect(()=>{onNavigate('/dashboard/challenges')},[onNavigate]);
  return <LoadingState label="Opening Industry challenges…"/>;
}

function AppContent() {
  const { session, profile, loading } = useAuth();

  const [route, setRoute] = useState(
    window.location.hash.slice(1) || '/'
  );
  const routePath = route.split('?')[0];
  const routeQuery = new URLSearchParams((route.includes('?') ? route.slice(route.indexOf('?') + 1) : ''));


  useEffect(() => {
    const onHashChange = () => {
      setRoute(window.location.hash.slice(1) || '/');
    };

    window.addEventListener('hashchange', onHashChange);

    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);


  const navigate = useCallback((r: string) => {
    window.location.hash = r;
    setRoute(r);
  }, []);


  // Loading state
  if (loading && session) {
    return <LoadingState label="Loading your dashboard..." />;
  }


  // Public transparency surfaces
  if (route === '/transparency') {
    return <TransparencyPortal onNavigate={navigate} />;
  }

  if (route.startsWith('/passport/')) {
    return (
      <ImpactPassport
        publicId={decodeURIComponent(
          route.slice('/passport/'.length)
        )}
        onNavigate={navigate}
      />
    );
  }


  // Auth pages
  if (route === '/signin') {
    return <AuthPage mode="signin" onNavigate={navigate} />;
  }

  if (route === '/signup') {
    return <AuthPage mode="signup" onNavigate={navigate} />;
  }


  if (route === '/university/routed-challenges') {
    if (!session) {
      return <AuthPage mode="signin" onNavigate={navigate} />;
    }

    return (
      <DashboardShell
        currentPage="/dashboard/challenges"
        onNavigate={navigate}
      >
        <ProblemWorkspace mode="UNIVERSITY" view="CHALLENGES" />
      </DashboardShell>
    );
  }

  if (route === '/university/projects' || route.startsWith('/university/projects/')) {
    if (!session) {
      return <AuthPage mode="signin" onNavigate={navigate} />;
    }

    const projectId = route.startsWith('/university/projects/')
      ? decodeURIComponent(route.slice('/university/projects/'.length))
      : undefined;

    return (
      <DashboardShell
        currentPage="/dashboard/projects"
        onNavigate={navigate}
      >
        <ProjectWorkspace onNavigate={navigate} initialProjectId={projectId} mode="UNIVERSITY" />
      </DashboardShell>
    );
  }

  if (routePath === '/university/solution-submissions') {
    if (!session) {
      return <AuthPage mode="signin" onNavigate={navigate} />;
    }

    return (
      <DashboardShell
        currentPage="/dashboard/solution-submissions"
        onNavigate={navigate}
      >
        <SolutionSubmissionsPage initialProjectId={routeQuery.get('projectId') || undefined} />
      </DashboardShell>
    );
  }

  if (routePath === '/university/industry-collaboration') {
    if (!session) {
      return <AuthPage mode="signin" onNavigate={navigate} />;
    }

    return (
      <DashboardShell
        currentPage="/dashboard/industry-collaboration"
        onNavigate={navigate}
      >
        <UniversityIndustryCollaborationPage
          onNavigate={navigate}
          projectId={routeQuery.get('projectId') || undefined}
        />
      </DashboardShell>
    );
  }

  if (routePath.startsWith('/university/industry-collaboration/')) {
    if (!session) {
      return <AuthPage mode="signin" onNavigate={navigate} />;
    }

    const collaborationId = decodeURIComponent(routePath.slice('/university/industry-collaboration/'.length));
    return (
      <DashboardShell
        currentPage="/dashboard/industry-collaboration"
        onNavigate={navigate}
      >
        <UniversityIndustryCollaborationDetailPage
          collaborationId={collaborationId}
          onNavigate={navigate}
        />
      </DashboardShell>
    );
  }

  // Dashboard routes (require auth)
  if (route.startsWith('/dashboard')) {

    if (!session) {
      return <AuthPage mode="signin" onNavigate={navigate} />;
    }


    const role = profile?.role || 'CITIZEN';

    const mainRole = mainRoleFor(role);

    const isGovRole =
      mainRole === 'GOVERNMENT' ||
      [
        'PANCHAYAT_OFFICER',
        'ULB_OFFICER',
        'DISTRICT_OFFICER',
        'GOVERNMENT_OFFICER',
        'DEPARTMENT_ADMIN',
        'PROJECT_OFFICER',
        'FINANCE_OFFICER',
        'ANALYTICS_OFFICER'
      ].includes(role);

    const isAdminRole =
      ['PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(role);


    function renderPage() {

      // Government roles see command centre as overview
      if (
        route === '/dashboard' &&
        mainRole === 'PLATFORM_ADMIN'
      ) {
        return <PlatformAdminDashboard onNavigate={navigate} />;
      }


      // VOLUNTEER
      if (
        route === '/dashboard' &&
        role === 'VOLUNTEER'
      ) {
        return <VolunteerDashboard />;
      }


      if (
        route === '/dashboard' &&
        role === 'STUDENT'
      ) {
        return <StudentCommandCentre onNavigate={navigate} />;
      }


      if (
        route === '/dashboard' &&
        role === 'FACULTY'
      ) {
        return <FacultyCommandCentre onNavigate={navigate} />;
      }


      if (
        route === '/dashboard' &&
        role === 'UNIVERSITY_ADMIN'
      ) {
        return <UniversityCommandCentre onNavigate={navigate} />;
      }


      if (
        route === '/dashboard' &&
        [
          'INDUSTRY_PARTNER',
          'STARTUP',
          'MSME',
          'CSR_PARTNER',
          'RESEARCH_LAB'
        ].includes(role)
      ) {
        return <IndustryCommandCentre onNavigate={navigate} />;
      }


      if (
        route === '/dashboard' &&
        isGovRole
      ) {
        return [
          'DISTRICT_OFFICER',
          'PANCHAYAT_OFFICER',
          'ULB_OFFICER'
        ].includes(role)
          ? <DistrictCommandCentre onNavigate={navigate} />
          : <GovDashboard onNavigate={navigate} />;
      }


      if (
        route === '/dashboard' &&
        isAdminRole
      ) {
        return <AdminUsersPage />;
      }


      if (route === '/dashboard') {
        return <CitizenDashboard onNavigate={navigate} />;
      }


      // Shared pages
      if (routePath === '/dashboard/challenges' || routePath === '/dashboard/routed-challenges' || routePath.startsWith('/dashboard/challenges/')) {
        if (role === 'UNIVERSITY_ADMIN') return <ProblemWorkspace mode="UNIVERSITY" view="CHALLENGES" />;
        const industryChallengeId = routePath.startsWith('/dashboard/challenges/')
          ? decodeURIComponent(routePath.slice('/dashboard/challenges/'.length))
          : (routeQuery.get('challenge') || undefined);
        if (INDUSTRY_ROLES.includes(role)) return <ProblemWorkspace mode="INDUSTRY" onNavigate={navigate} initialProblemId={industryChallengeId} />;
        return isGovRole
          ? (
            <ProblemWorkspace
              mode="GOVERNMENT"
              view="CHALLENGES"
            />
          )
          : <ProblemWorkspace />;
      }


      if (route === '/dashboard/my-challenges') {
        return (
          <ChallengeList
            onNavigate={navigate}
            personal
          />
        );
      }


      if (route === '/dashboard/submit') {
        return <SubmitWizard onNavigate={navigate} />;
      }


      if (
        route === '/dashboard/projects' &&
        INDUSTRY_ROLES.includes(role)
      ) {
        return <ProblemWorkspace mode="INDUSTRY" view="INDUSTRY_PROJECTS" onNavigate={navigate} />;
      }


      if (route === '/dashboard/projects') {
        return <ProjectWorkspace onNavigate={navigate} />;
      }

      if (routePath.startsWith('/dashboard/projects/')) {
        if (INDUSTRY_ROLES.includes(role)) return <ProblemWorkspace mode="INDUSTRY" view="INDUSTRY_PROJECTS" onNavigate={navigate} initialProblemId={decodeURIComponent(routePath.slice('/dashboard/projects/'.length))} />;
        return <ProjectWorkspace onNavigate={navigate} initialProjectId={decodeURIComponent(routePath.slice('/dashboard/projects/'.length))} mode={role === 'UNIVERSITY_ADMIN' ? 'UNIVERSITY' : 'DEFAULT'} />;
      }


      if (route === '/dashboard/solutions') {
        // Industry organizations track solutions for the challenges they accepted;
        // every other role keeps the existing solution repository page.
        return INDUSTRY_ROLES.includes(role)
          ? <IndustrySolutionsPage onNavigate={navigate} />
          : <SolutionsPage onNavigate={navigate} />;
      }


      if (route === '/dashboard/impact') {
        return <ImpactPage onNavigate={navigate} />;
      }


      // Government and volunteer roles use the real geospatial map backed by the
      // canonical problem records. The legacy CSS-overlay map remains for other
      // non-government flows and is intentionally not used here.
      if (route === '/dashboard/map') {
        if (INDUSTRY_ROLES.includes(role)) {
          return <InnovationMapPage onNavigate={navigate} industryOnly />;
        }
        if (isGovRole || role === 'VOLUNTEER' || isAdminRole) {
          return <InnovationMapPage onNavigate={navigate} />;
        }
        return <MapPage onNavigate={navigate} />;
      }


      if (route === '/dashboard/clusters') {
        return <ClustersPage onNavigate={navigate} />;
      }


      if (route === '/dashboard/validation') {
        return isGovRole
          ? (
            <ProblemWorkspace
              mode="GOVERNMENT"
              view="VALIDATION"
            />
          )
          : <CitizenDashboard onNavigate={navigate} />;
      }


      // VOLUNTEER → Profile
      // Other roles continue using existing ProfilePage.
      if (route === '/dashboard/profile') {
        if (role === 'VOLUNTEER') {
          return <VolunteerProfilePage onNavigate={navigate} />;
        }
        return <ProfilePage onNavigate={navigate} />;
      }


      if (route === '/dashboard/notifications') {
        return <NotificationsPage onNavigate={navigate} />;
      }


      if (route === '/dashboard/nearby') {
        return <ChallengeList onNavigate={navigate} />;
      }


      if (routePath === '/dashboard/marketplace' && INDUSTRY_ROLES.includes(role)) {
        return <IndustryMarketplaceRedirect onNavigate={navigate} />;
      }


      if (route === '/dashboard/marketplace') {
        return <ProblemWorkspace />;
      }


      if (route === '/dashboard/knowledge-graph') {
        return <KnowledgeGraphPage />;
      }


      if (route === '/dashboard/system-health') {
        return <SystemHealthPage />;
      }


      if (route === '/dashboard/ai-jobs') {
        return <AIJobsPage />;
      }


      if (route === '/dashboard/configuration') {
        return <AdminConfigurationPage />;
      }


      if (route.startsWith('/dashboard/community')) {
        return <CommunityPage />;
      }


      if (route === '/dashboard/universities') {
        return <InstitutionsPage />;
      }


      if (route === '/dashboard/industry-mentors') {
        return <PartnersPage />;
      }


      // Existing volunteer route
      if (route === '/dashboard/volunteer') {
        return <VolunteerDashboard />;
      }


      // VOLUNTEER → Report New
      if (
        route === '/dashboard/volunteer/report' &&
        role === 'VOLUNTEER'
      ) {
        return <VolunteerDashboard />;
      }


      // VOLUNTEER → My Reports
      if (
        route === '/dashboard/volunteer/reports' &&
        role === 'VOLUNTEER'
      ) {
        return <VolunteerDashboard />;
      }


      if (route === '/dashboard/gov-citizens') {
        return isGovRole || isAdminRole
          ? <GovernmentCitizensView />
          : <CitizenDashboard onNavigate={navigate} />;
      }


      if (route === '/dashboard/gov-ecosystem') {
        return isGovRole || isAdminRole
          ? <GovernmentEcosystemView onNavigate={navigate} />
          : <CitizenDashboard onNavigate={navigate} />;
      }


      if (route === '/dashboard/gov-mentorship') {
        return <GovernmentMentorshipMonitor />;
      }


      if (route === '/dashboard/alerts') {
        return <GovernmentAlertsPage />;
      }


      if (routePath === '/dashboard/announcements' || routePath === '/dashboard/announcements/list') {
        return <AnnouncementsPage />;
      }

      if (routePath.startsWith('/dashboard/announcements/')) {
        const announcementId = decodeURIComponent(routePath.slice('/dashboard/announcements/'.length));
        if (announcementId) return <AnnouncementDetailPage announcementId={announcementId} />;
      }

      if (route === '/dashboard/deployments') {
        return <DeploymentManagementPage />;
      }


      if (route === '/dashboard/industry-mentorship') {
        return <IndustryMentorWorkspace onNavigate={navigate} />;
      }


      if (route === '/dashboard/prototype-reviews') {
        return <PrototypeReviewPage onNavigate={navigate} />;
      }


      if (route === '/dashboard/industry-support') {
        return <IndustrySupportPage onNavigate={navigate} />;
      }


      // Role workflow pages
      if (route === '/dashboard/tasks') {
        return <TasksPage />;
      }


      if (route === '/dashboard/teams') {
        return role === 'UNIVERSITY_ADMIN'
          ? <RegisteredTeamsPage />
          : <TeamFormationPage />;
      }


      if (route === '/dashboard/portfolio') {
        return <StudentPortfolioPage />;
      }


      if (route === '/dashboard/mentorship') {
        return <MentorshipPage />;
      }


      if (route === '/dashboard/reviews') {
        return (
          <ProposalReviewQueuePage
            onNavigate={navigate}
          />
        );
      }


      if (route === '/dashboard/matched') {
        return <ProblemWorkspace mode="UNIVERSITY" />;
      }


      if (route === '/dashboard/faculty') {
        return <SolutionSubmissionsPage />;
      }

      if (routePath === '/dashboard/solution-submissions') {
        return <SolutionSubmissionsPage initialProjectId={routeQuery.get('projectId') || undefined} />;
      }

      if (routePath === '/dashboard/solution-submissions' && route.includes('/')) {
        return <SolutionSubmissionsPage initialProjectId={routeQuery.get('projectId') || undefined} />;
      }

      if (routePath === '/dashboard/solution-review' || routePath === '/government/solution-review') {
        return isGovRole ? <GovernmentSolutionReviewPage /> : <CitizenDashboard onNavigate={navigate} />;
      }

      if (routePath.startsWith('/dashboard/solution-submissions/')) {
        const submissionId = decodeURIComponent(routePath.slice('/dashboard/solution-submissions/'.length));
        return <SolutionSubmissionDetailPage submissionId={submissionId} />;
      }

      if (routePath === '/dashboard/industry-collaboration') {
        return ['UNIVERSITY_ADMIN', 'UNIVERSITY', 'FACULTY'].includes(role)
          ? (
            <UniversityIndustryCollaborationPage
              onNavigate={navigate}
              projectId={routeQuery.get('projectId') || undefined}
            />
          )
          : <PartnersPage />;
      }

      if (routePath.startsWith('/dashboard/industry-collaboration/')) {
        return ['UNIVERSITY_ADMIN', 'UNIVERSITY', 'FACULTY'].includes(role)
          ? (
            <UniversityIndustryCollaborationDetailPage
              collaborationId={decodeURIComponent(routePath.slice('/dashboard/industry-collaboration/'.length))}
              onNavigate={navigate}
            />
          )
          : <PartnersPage />;
      }


      if (route === '/dashboard/milestones') {
        return role === 'UNIVERSITY_ADMIN'
          ? (
            <UniversityMilestonesPage
              onNavigate={navigate}
            />
          )
          : <ProjectWorkspace onNavigate={navigate} />;
      }


      if (route === '/dashboard/collaborations') {
        // Industry organizations see their own real collaboration records.
        return INDUSTRY_ROLES.includes(role)
          ? <IndustryCollaborationsPage onNavigate={navigate} />
          : <PartnersPage />;
      }


      if (route === '/dashboard/csr') {
        return <CSRMarketplace />;
      }


      if (route === '/dashboard/audit') {
        return <AuditPage />;
      }


      if (route === '/dashboard/users') {
        return <AdminUsersPage />;
      }


      if (route === '/dashboard/organizations') {
        return <InstitutionsPage />;
      }


      if (route === '/dashboard/analytics') {
        return <GovDashboard onNavigate={navigate} />;
      }


      if (route === '/dashboard/settings') {
        return <SettingsPage />;
      }


      if (route === '/dashboard/copilot') {
        return <CopilotPage />;
      }


      if (route === '/dashboard/search') {
        return <SearchPage />;
      }


      if (route === '/dashboard/moderation') {
        return <ModerationPage />;
      }


      return <CitizenDashboard onNavigate={navigate} />;
    }


    return (
      <DashboardShell
        currentPage={route}
        onNavigate={navigate}
      >
        {renderPage()}
      </DashboardShell>
    );
  }


  // Landing page (default)
  return <LandingPage onNavigate={navigate} />;
}

export default function App() {
  return (
    <ToastProvider>
      <I18nProvider>
        <AuthProvider>
          <PlatformProvider>
            <AppContent />
          </PlatformProvider>
        </AuthProvider>
      </I18nProvider>
    </ToastProvider>
  );
}