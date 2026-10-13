import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let ok=true;
const check=(c,l)=>{console.log(`${c?'✓':'✗'} ${l}`);if(!c)ok=false};
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const files=[
  'apps/web/src/App.tsx','apps/web/src/context/I18nContext.tsx','apps/web/src/components/dashboard/DashboardShell.tsx',
  'apps/web/src/components/dashboard/pages/SubmitWizard.tsx','apps/web/src/components/dashboard/pages/ProjectWorkspace.tsx',
  'apps/web/src/components/dashboard/pages/RoleDashboards.tsx','apps/web/src/components/dashboard/pages/RoleWorkflowPages.tsx',
  'apps/web/src/components/dashboard/pages/AdvancedPages.tsx','apps/web/src/components/dashboard/pages/ValidationQueue.tsx',
  'apps/web/src/components/dashboard/pages/SimplePages.tsx','apps/web/src/components/dashboard/pages/CommunityVolunteerPages.tsx',
  'apps/web/src/components/dashboard/pages/GovernmentExtendedPages.tsx','apps/web/src/components/dashboard/pages/IndustryExtendedPages.tsx',
  'apps/web/src/components/public/PublicPages.tsx','apps/web/src/components/auth/AuthPage.tsx',
  'apps/web/src/lib/firebase.ts','apps/web/src/lib/api.ts','apps/web/public/sw.js',
  'apps/api/src/index.ts','apps/api/src/local.ts','apps/api/src/server.ts','apps/api/src/auth.ts','apps/api/src/repository.ts','apps/api/src/firebaseAdmin.ts','apps/api/src/ai.ts',
  'apps/api/src/jobs.ts','apps/api/src/vectorSearch.ts','apps/api/src/providers.ts','apps/api/src/seed.ts','apps/api/src/workflowAutomation.ts',
  'packages/shared/src/index.ts','firebase/firestore.rules','firebase/storage.rules','firebase/firestore.indexes.json',
  'firebase.json','.firebaserc','.github/workflows/ci.yml','apps/web/.env.example','apps/api/.env.example',
  'docs/ARCHITECTURE.md','docs/API.md','docs/DATABASE.md','docs/AI_PIPELINE.md','docs/SECURITY.md','docs/DEPLOYMENT.md','docs/TESTING.md','docs/FEATURE_MATRIX.md'
];
for(const p of files)check(fs.existsSync(path.join(root,p)),p);
for(const p of ['package.json','apps/web/package.json','apps/api/package.json','firebase/firestore.indexes.json','firebase.json','.firebaserc']){
  try{JSON.parse(read(p));check(true,`${p} valid JSON`)}catch{check(false,`${p} valid JSON`)}
}
const api=read('apps/api/src/server.ts');
const routes=[
  '/api/onboarding/role-request','/api/admin/role-requests','/api/public/challenges','/api/public/solutions','/api/public/passport/:publicId',
  '/api/challenges/preview','/api/challenges/:id/validate','/api/challenges/:id/matches','/api/challenges/:id/team-recommendation',
  '/api/challenges/:id/community','/api/challenges/:id/community/signals','/api/challenges/:id/community/comments','/api/citizen/badges',
  '/api/volunteer/dashboard','/api/volunteer/reports','/api/government/citizens','/api/government/ecosystem','/api/government/alerts','/api/announcements',
  '/api/mentorship','/api/mentorship/:id/meetings','/api/projects/:id/prototypes/:prototypeId/reviews','/api/industry/support-offers','/api/industry/calendar','/api/deployments',
  '/api/dashboard/student','/api/dashboard/faculty','/api/dashboard/university','/api/dashboard/industry','/api/dashboard/district',
  '/api/marketplace/challenges','/api/challenges/:id/applications','/api/projects/:id/invitations','/api/csr/marketplace','/api/knowledge-graph',
  '/api/projects/:id/tasks','/api/projects/:id/proposal','/api/projects/:id/proposal-copilot','/api/projects/:id/funding',
  '/api/projects/:id/prototypes','/api/projects/:id/tests','/api/projects/:id/pilots','/api/projects/:id/feedback','/api/projects/:id/impact/:impactId/verify','/api/projects/:id/impact-report',
  '/api/projects/:id/solution','/api/solutions/:id/reuse','/api/solutions/:id/replication/refresh','/api/projects/:id/technology-transfer',
  '/api/ai/translate','/api/ai/tts','/api/ai/jobs','/api/uploads/scan','/api/admin/moderation','/api/admin/feature-flags','/api/admin/system-health','/api/admin/backup'
];
for(const route of routes)check(api.includes(route),`critical API ${route}`);
const repo=read('apps/api/src/repository.ts');
check(repo.includes('ALLOW_MEMORY_IN_PRODUCTION'),'production datastore fail-closed guard');
check(repo.toLowerCase().includes('firestore'),'Firestore repository present');
const jobs=read('apps/api/src/jobs.ts');check(jobs.includes('DEAD_LETTER'),'AI queue dead-letter handling present');check(jobs.includes('EVIDENCE_ANALYSIS'),'asynchronous evidence analysis present');
const vectors=read('apps/api/src/vectorSearch.ts');check(vectors.includes('findNearest'),'native Firestore vector-search adapter present');check(vectors.includes('cosine'),'bounded vector fallback present');
const providers=read('apps/api/src/providers.ts');for(const x of ['translateText','textToSpeech','moderateContent','scanFileUrl','emitTelemetry'])check(providers.includes(x),`provider adapter ${x}`);
const report=read('apps/web/src/components/dashboard/pages/SubmitWizard.tsx');
check(report.includes('MediaRecorder'),'voice recording implemented');check(report.includes('uploadEvidence'),'Firebase evidence upload implemented');check(report.includes('challengePreview'),'editable AI preview implemented');check(report.includes('jansetu-challenge-draft'),'offline challenge draft implemented');check(report.includes('translateToEnglish'),'translation assistance implemented');check(!report.includes("@/lib/supabase"),'Supabase runtime removed');
const community=read('apps/web/src/components/dashboard/pages/CommunityVolunteerPages.tsx');
for(const x of ['Support','also affected','Community Priority','Volunteer Ground-Level Reporting','MediaRecorder'])check(community.toLowerCase().includes(x.toLowerCase()),`community/volunteer ${x}`);
const gov=read('apps/web/src/components/dashboard/pages/GovernmentExtendedPages.tsx');for(const x of ['Critical Alerts','Government Announcements','Deployment Command Centre','Citizen'])check(gov.includes(x),`government extension ${x}`);
const industry=read('apps/web/src/components/dashboard/pages/IndustryExtendedPages.tsx');for(const x of ['Mentor','Prototype','Support'])check(industry.includes(x),`industry extension ${x}`);
const project=read('apps/web/src/components/dashboard/pages/ProjectWorkspace.tsx');
for(const x of ['api.task','api.proposal','api.proposalCopilot','api.funding','api.fundingDocument','api.fundingExpense','api.prototype','api.testResult','api.pilot','api.feedback','api.impact','api.downloadImpactReport','api.publishSolution','api.technologyTransfer','api.projectCopilot'])check(project.includes(x),`project lifecycle ${x}`);
const roles=read('apps/web/src/components/dashboard/pages/RoleDashboards.tsx')+read('apps/web/src/components/dashboard/pages/RoleWorkflowPages.tsx');
for(const x of ['StudentCommandCentre','FacultyCommandCentre','UniversityCommandCentre','IndustryCommandCentre','DistrictCommandCentre','StudentPortfolioPage','TeamFormationPage'])check(roles.includes(x),`role experience ${x}`);
const i18n=read('apps/web/src/context/I18nContext.tsx');for(const code of ["'en'","'hi'","'sat'","'bn'","'ur'","'nag'"])check(i18n.includes(code),`i18n locale ${code}`);
const fireRules=read('firebase/firestore.rules');check(fireRules.includes('allow write: if false')||fireRules.includes('allow read, write: if false'),'workflow browser writes default-denied');
const storageRules=read('firebase/storage.rules');check(storageRules.includes('25 * 1024 * 1024')||storageRules.includes('25*1024*1024'),'storage upload size guard present');
const functions=read('apps/api/src/index.ts');check(functions.includes('onRequest'),'Express API exported as Firebase HTTPS function');check(functions.includes('onSchedule'),'scheduled Firebase workflows present');
const firebaseConfig=read('firebase.json');check(firebaseConfig.includes('asia-south1'),'Firebase Hosting rewrites to asia-south1 Functions');check(!fs.existsSync(path.join(root,'docker-compose.yml'))&&!fs.existsSync(path.join(root,'docker-compose.production.yml')),'Docker deployment files removed');
const apiClient=read('apps/web/src/lib/api.ts');check(!apiClient.includes('backupUrl'),'no unauthenticated admin-backup link');check(!apiClient.includes('impactReportUrl'),'no unauthenticated impact-report link');
process.exit(ok?0:1);
