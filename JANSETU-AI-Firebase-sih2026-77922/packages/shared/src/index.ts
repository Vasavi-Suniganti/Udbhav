export type Role =
  | 'CITIZEN' | 'VOLUNTEER' | 'STUDENT' | 'FACULTY' | 'UNIVERSITY_ADMIN'
  | 'INDUSTRY_PARTNER' | 'STARTUP' | 'MSME' | 'CSR_PARTNER' | 'RESEARCH_LAB' | 'MENTOR'
  | 'PANCHAYAT_OFFICER' | 'ULB_OFFICER' | 'DISTRICT_OFFICER' | 'GOVERNMENT_OFFICER'
  | 'DEPARTMENT_ADMIN' | 'PROJECT_OFFICER' | 'FINANCE_OFFICER' | 'ANALYTICS_OFFICER'
  | 'PLATFORM_ADMIN' | 'SUPER_ADMIN';

export type Permission =
  | 'challenge:create' | 'challenge:view' | 'challenge:update_own' | 'challenge:validate' | 'challenge:assign' | 'challenge:merge'
  | 'project:create' | 'project:view' | 'project:manage' | 'project:approve'
  | 'proposal:create' | 'proposal:review' | 'proposal:approve'
  | 'funding:view' | 'funding:request' | 'funding:approve' | 'funding:release'
  | 'pilot:manage' | 'impact:record' | 'impact:verify'
  | 'collaboration:manage' | 'analytics:view' | 'admin:user_manage' | 'admin:moderate' | 'admin:configure'
  | 'solution:publish' | 'replication:manage' | 'ip:manage'
  | 'community:participate' | 'volunteer:collect' | 'volunteer:manage'
  | 'mentorship:manage' | 'deployment:manage' | 'announcement:manage';

export type ChallengeStatus = 'SUBMITTED'|'AI_PROCESSED'|'PENDING_VALIDATION'|'NEEDS_INFORMATION'|'FIELD_VERIFICATION'|'VALIDATED'|'REJECTED'|'MERGED'|'ESCALATED'|'OPEN_FOR_INSTITUTIONS'|'ASSIGNED';
export type IssueType = 'GRIEVANCE'|'MAINTENANCE'|'ADMINISTRATIVE'|'RESEARCH_CHALLENGE'|'INNOVATION_OPPORTUNITY'|'POLICY_SYSTEMIC'|'CRITICAL_SAFETY';
export type Domain = 'Education'|'Healthcare'|'Agriculture'|'Water Resources'|'Sanitation'|'Environment'|'Energy'|'Rural Livelihoods'|'Accessibility'|'Urban Development'|'Transport'|'Waste Management'|'Public Administration'|'Disaster Management'|'Digital Inclusion'|'Skill Development'|'Other';
export type ProjectStatus = 'DISCOVERY'|'VALIDATED'|'ASSIGNED'|'TEAM_FORMED'|'RESEARCH'|'PROPOSAL'|'APPROVED'|'FUNDED'|'PROTOTYPING'|'LAB_TESTING'|'FIELD_TESTING'|'PILOT'|'COMMUNITY_VALIDATION'|'DEPLOYMENT_READY'|'DEPLOYED'|'SCALING'|'COMPLETED'|'ARCHIVED';
export type ProposalStatus = 'DRAFT'|'FACULTY_REVIEW'|'SUBMITTED'|'GOVERNMENT_REVIEW'|'NEEDS_CHANGES'|'APPROVED'|'REJECTED';

export interface User {
  id:string; name:string; email:string; role:Role; organization?:string; organizationId?:string; district?:string;
  permissions?:Permission[]; createdAt?:string; lastSeenAt?:string; verified?:boolean;
}
export interface Evidence { id:string; type:'image'|'video'|'audio'|'document'; name:string; url:string; storagePath?:string; mimeType?:string; size?:number; uploadedAt?:string; aiDescription?:string; }
export interface PriorityBreakdown { urgency:number; population:number; vulnerability:number; frequency:number; spread:number; duration:number; safety:number; corroboration:number; trend:number; total:number; explanation?:string; }
export interface AITrace { provider:string; model:string; confidence:number; language:string; translatedText?:string; explanation?:string; processingMs?:number; generatedAt:string; }
export interface Challenge {
  id:string; publicId:string; title:string; description:string; rawText:string; domain:Domain; subdomain:string; issueType:IssueType;
  expertise:string[]; tags:string[]; status:ChallengeStatus; district:string; block?:string; village?:string; ward?:string;
  address?:string; latitude?:number; longitude?:number; geohash?:string; affectedPeople:number; duration:string; frequency:string;
  seasonal:boolean; safetyConcern:boolean; reporterId:string; createdAt:string; updatedAt:string; evidence:Evidence[];
  priority:PriorityBreakdown; aiSummary?:string; aiTrace?:AITrace; relatedIds:string[]; validationNote?:string;
  assignedUniversityId?:string; mergedIntoId?:string; clusterId?:string;
}
export interface ChallengeEmbedding { id:string; challengeId:string; vector:number[]; provider:string; model:string; createdAt:string; }
export interface DuplicateCandidate { challengeId:string; publicId:string; title:string; similarity:number; locationDistanceKm?:number; district:string; status:ChallengeStatus; reportCount?:number; }
export interface ChallengeCluster { id:string; title:string; domain:Domain; districts:string[]; blocks:string[]; villages:string[]; challengeIds:string[]; reportCount:number; estimatedAffectedPopulation:number; growthRate:number; severity:number; trend:'STABLE'|'RISING'|'FALLING'; centroid?:{latitude:number;longitude:number}; createdAt:string; updatedAt:string; }

export interface Department { id:string; universityId:string; name:string; programs:string[]; }
export interface Lab { id:string; universityId:string; departmentId?:string; name:string; equipment:string[]; capabilities:string[]; }
export interface Faculty { id:string; userId?:string; universityId:string; name:string; department:string; designation:string; expertise:string[]; researchInterests:string[]; publications:string[]; patents:string[]; mentorCapacity:number; available:boolean; }
export interface Student { id:string; userId?:string; universityId:string; name:string; department:string; year:number; skills:string[]; interests:string[]; github?:string; portfolio?:string; availabilityHours:number; preferredDomains:Domain[]; }
export interface University { id:string; name:string; district:string; website?:string; naac?:string; departments:string[]; expertise:string[]; labs:string[]; capacity:number; verified:boolean; latitude?:number; longitude?:number; }
export interface IndustryPartner { id:string; name:string; type:'INDUSTRY'|'STARTUP'|'MSME'|'CSR'|'RESEARCH_LAB'; sector:string; expertise:string[]; locations:string[]; fundingCapacity?:number; csrThemes?:string[]; capabilities:string[]; verified:boolean; }
export interface MatchResult { university:University; score:number; reasons:string[]; faculty?:Faculty[]; labs?:Lab[]; previousProjects?:string[]; }
export interface TeamRecommendation { challengeId:string; rationale:string; roles:{discipline:string;count:number;reason:string;candidates?:Student[]}[]; facultyCandidates:Faculty[]; industryCandidates:IndustryPartner[]; }

export interface Milestone { id:string; title:string; dueDate:string; done:boolean; approved?:boolean; }
export interface Project { id:string; challengeId:string; title:string; status:ProjectStatus; universityId:string; team:string[]; milestones:Milestone[]; irl:number; createdAt:string; updatedAt?:string; }
export interface ProjectTask { id:string; projectId:string; title:string; description?:string; status:'TODO'|'IN_PROGRESS'|'REVIEW'|'DONE'; priority:'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'; assigneeId?:string; dueDate?:string; dependencyIds?:string[]; labels:string[]; createdAt:string; updatedAt:string; }
export interface Proposal { id:string; projectId:string; version:number; status:ProposalStatus; problemUnderstanding:string; rootCause?:string; objectives?:string; solutionConcept:string; technology?:string; architecture?:string; methodology:string; timeline:string; budget:number; resources?:string; risks:string; testingPlan?:string; pilotPlan?:string; impactKpis:string; scalingStrategy?:string; ipConsiderations?:string; createdBy:string; createdAt:string; }
export interface FundingRequest { id:string; projectId:string; purpose:string; requestedAmount:number; approvedAmount:number; releasedAmount:number; spentAmount:number; source?:string; status:'REQUESTED'|'UNDER_REVIEW'|'APPROVED'|'PARTIALLY_RELEASED'|'RELEASED'|'REJECTED'; createdBy:string; createdAt:string; updatedAt:string; }
export interface Prototype { id:string; projectId:string; version:string; description:string; cost:number; knownIssues:string; bom?:string; repository?:string; hardware?:string; software?:string; cadUrl?:string; media:Evidence[]; createdAt:string; }
export interface TestResult { id:string; projectId:string; type:'LAB'|'FIELD'|'USER'|'PERFORMANCE'|'SAFETY'|'ACCEPTANCE'; name:string; metric:string; expected:string; actual:string; passed:boolean; reviewerId?:string; evidence:Evidence[]; createdAt:string; }
export interface Pilot { id:string; projectId:string; site:string; community:string; beneficiaries:number; startDate:string; endDate:string; installedUnits:number; status:'PLANNED'|'ACTIVE'|'COMPLETED'|'PAUSED'; latitude?:number; longitude?:number; metrics?:string; issues?:string; evidence:Evidence[]; createdAt:string; }
export interface CommunityFeedback { id:string; projectId:string; deployed:boolean; outcome:'MUCH_BETTER'|'BETTER'|'NO_CHANGE'|'WORSE'; comment:string; citizenId:string; evidence:Evidence[]; createdAt:string; }
export interface ImpactMeasurement { id:string; projectId:string; metric:string; before:number; after:number; unit:string; verified:boolean; verifiedBy?:string; verifiedAt?:string; createdAt?:string; }
export interface Solution { id:string; projectId:string; challengeId:string; title:string; problem:string; solution:string; architecture?:string; codeRepository?:string; bom?:string; cost?:number; requirements?:string; deploymentGuide?:string; limitations?:string; lessonsLearned?:string; licensingStatus?:string; domains:Domain[]; districts:string[]; reusable:boolean; createdAt:string; }
export interface ReplicationOpportunity { id:string; solutionId:string; challengeId:string; similarity:number; reason:string; estimatedBeneficiaries:number; status:'SUGGESTED'|'REVIEWING'|'ACCEPTED'|'DISMISSED'; createdAt:string; }
export interface Notification { id:string; userId?:string; role?:Role; title:string; message:string; type:string; entityId?:string; read:boolean; createdAt:string; }
export interface AuditLog { id:string; actor:string; action:string; entity:string; entityId:string; timestamp:string; previousValue?:unknown; newValue?:unknown; metadata?:Record<string,unknown>; }
export interface ModerationFlag { id:string; entityType:string; entityId:string; reason:string; severity:'LOW'|'MEDIUM'|'HIGH'; status:'OPEN'|'REVIEWED'|'DISMISSED'|'ACTIONED'; createdAt:string; }


export interface ChallengeCommunitySignal {
  id:string; challengeId:string; userId:string; type:'SUPPORT'|'AFFECTED'|'INCORRECT_REPORT';
  note?:string; evidence:Evidence[]; createdAt:string;
}
export interface ChallengeCommunityComment {
  id:string; challengeId:string; authorId:string; authorName:string; authorRole:Role;
  comment:string; evidence:Evidence[]; createdAt:string;
}
export interface VolunteerProfile {
  id:string; userId:string; assignedDistrict?:string; assignedBlocks:string[]; assignedVillages:string[];
  organization?:string; active:boolean; citizensContacted:number; problemsCollected:number; verificationsCompleted:number; createdAt:string; updatedAt:string;
}
export interface VolunteerFieldReport {
  id:string; volunteerId:string; challengeId:string; citizenName?:string; citizenContact?:string; consent:boolean;
  confirmationCount:number; notes?:string; communityRepresentatives?:string[]; createdAt:string;
}
export interface MentorshipRequest {
  id:string; projectId:string; studentTeamId?:string; requestedBy:string; mentorId?:string; partnerId?:string;
  requestedExpertise:string[]; message:string; status:'PENDING'|'ACCEPTED'|'DECLINED'|'COMPLETED'; createdAt:string; updatedAt:string;
}
export interface MentorMeeting {
  id:string; projectId:string; mentorshipId:string; mentorId:string; scheduledAt:string; durationMinutes:number;
  agenda:string; meetingUrl?:string; status:'SCHEDULED'|'COMPLETED'|'CANCELLED'; notes?:string; createdAt:string;
}
export interface PrototypeReview {
  id:string; projectId:string; prototypeId:string; reviewerId:string; reviewerOrganizationId?:string;
  architecture:number; technology:number; scalability:number; industryReadiness:number; feedback:string;
  decision:'APPROVED_FOR_TESTING'|'REQUIRES_CHANGES'|'READY_FOR_PILOT'; createdAt:string;
}
export interface PartnerSupportOffer {
  id:string; partnerId:string; projectId?:string; supportTypes:Array<'MENTORSHIP'|'TECHNICAL_EXPERTISE'|'TESTING'|'PROTOTYPING'|'CLOUD_RESOURCES'|'FUNDING'|'DEPLOYMENT'|'RESEARCH'|'MANUFACTURING'>;
  description:string; capacity?:string; status:'AVAILABLE'|'MATCHED'|'IN_USE'|'CLOSED'; createdAt:string; updatedAt:string;
}
export interface GovernmentAnnouncement {
  id:string; title:string; body:string; category:'CHALLENGE'|'DEADLINE'|'FUNDING'|'PROGRAM'|'WORKSHOP'|'HACKATHON'|'POLICY'|'GENERAL';
  districts?:string[]; roles?:Role[]; publishedBy:string; publishedAt:string; expiresAt?:string; active:boolean;
}
export interface SystemAlert {
  id:string; type:'CRITICAL_CHALLENGE'|'VALIDATION_OVERDUE'|'UNIVERSITY_ACCEPTANCE_OVERDUE'|'PROJECT_OVERDUE'|'MILESTONE_MISSED'|'MENTOR_REQUEST_OVERDUE'|'FUNDING_DELAYED'|'PROTOTYPE_TEST_FAILED'|'DEPLOYMENT_ISSUE';
  severity:'INFO'|'WARNING'|'CRITICAL'; title:string; message:string; entityType:string; entityId:string; district?:string;
  assignedRole?:Role; status:'OPEN'|'ACKNOWLEDGED'|'RESOLVED'; createdAt:string; resolvedAt?:string;
}
export interface DeploymentRecord {
  id:string; projectId:string; site:string; district:string; latitude?:number; longitude?:number; deploymentDate:string;
  responsibleOrganization:string; beneficiaries:number; installedUnits:number; status:'PLANNED'|'APPROVED'|'DEPLOYED'|'OPERATIONAL'|'PAUSED'|'RETIRED';
  maintenanceOwner?:string; evidence:Evidence[]; issues?:string; createdAt:string; updatedAt:string;
}
export interface CitizenBadge {
  id:string; userId:string; code:'COMMUNITY_REPORTER'|'PROBLEM_VALIDATOR'|'COMMUNITY_VOLUNTEER'|'SOLUTION_SUPPORTER';
  label:string; reason:string; awardedAt:string;
}


export interface PatentRecord { id:string; projectId:string; title:string; contributors:string[]; institutionId?:string; industryPartnerId?:string; status:'DISCLOSURE'|'FILED'|'PUBLISHED'|'GRANTED'|'LICENSED'; applicationNumber?:string; patentNumber?:string; filingDate?:string; licensingNotes?:string; documents:Evidence[]; createdAt:string; }
export interface StartupRecord { id:string; projectId:string; name:string; team:string[]; solutionId?:string; incubator?:string; funding?:number; status:'INCUBATION_CANDIDATE'|'PRE_INCUBATION'|'INCUBATED'|'STARTUP_CREATED'|'FUNDED'|'PILOT_CUSTOMER'|'SCALE'; marketReadiness?:string; impact?:string; createdAt:string; }

export type AIJobStatus='QUEUED'|'RUNNING'|'SUCCEEDED'|'FAILED'|'DEAD_LETTER';
export interface AIJob { id:string; type:'CHALLENGE_PIPELINE'|'EVIDENCE_ANALYSIS'|'REPORT_GENERATION'|'RETENTION'|'REPLICATION_REFRESH'; entityId:string; status:AIJobStatus; attempts:number; maxAttempts:number; payload:Record<string,unknown>; result?:unknown; error?:string; provider?:string; model?:string; queuedAt:string; startedAt?:string; completedAt?:string; nextAttemptAt?:string; processingMs?:number; }
export interface StudentApplication { id:string; challengeId?:string; projectId?:string; studentId:string; universityId:string; statement:string; skills:string[]; status:'APPLIED'|'SHORTLISTED'|'INVITED'|'ACCEPTED'|'REJECTED'|'WITHDRAWN'; createdAt:string; updatedAt:string; }
export interface TeamInvitation { id:string; projectId:string; inviteeId:string; invitedBy:string; role:string; status:'PENDING'|'ACCEPTED'|'DECLINED'|'EXPIRED'; message?:string; createdAt:string; updatedAt:string; }
export interface TaskComment { id:string; projectId:string; taskId:string; authorId:string; authorName:string; comment:string; attachments:Evidence[]; createdAt:string; }
export interface FundingDocument { id:string; fundingRequestId:string; projectId:string; type:'INVOICE'|'RECEIPT'|'UTILIZATION_CERTIFICATE'|'APPROVAL'|'OTHER'; evidence:Evidence; amount?:number; status:'UPLOADED'|'VERIFIED'|'REJECTED'; uploadedBy:string; verifiedBy?:string; createdAt:string; verifiedAt?:string; }
export interface FundingExpense { id:string; fundingRequestId:string; projectId:string; amount:number; category:string; description:string; documentId?:string; spentAt:string; createdBy:string; createdAt:string; }
export interface CSRCommitment { id:string; partnerId:string; projectId:string; contributionType:'MONEY'|'HARDWARE'|'CLOUD_CREDITS'|'MENTORSHIP'|'TESTING'|'MANUFACTURING'|'PILOT_INFRASTRUCTURE'; amount?:number; description:string; status:'OFFERED'|'ACCEPTED'|'DECLINED'|'DELIVERED'; createdAt:string; updatedAt:string; }
export interface SolutionReuse { id:string; solutionId:string; targetChallengeId:string; projectId?:string; mode:'REUSE'|'ADAPT'|'FORK'; status:'REQUESTED'|'APPROVED'|'IN_PROGRESS'|'COMPLETED'|'REJECTED'; requestedBy:string; notes?:string; createdAt:string; updatedAt:string; }
export interface TechnologyTransfer { id:string; projectId:string; patentId?:string; solutionId?:string; fromOrganizationId:string; toOrganizationId:string; status:'DRAFT'|'UNDER_REVIEW'|'SIGNED'|'ACTIVE'|'COMPLETED'|'TERMINATED'; termsSummary:string; licensingModel?:string; documents:Evidence[]; createdAt:string; updatedAt:string; }
export interface FeatureFlag { id:string; key:string; enabled:boolean; description:string; roles?:Role[]; updatedBy?:string; updatedAt:string; }
export interface NotificationTemplate { id:string; event:string; channel:'IN_APP'|'PUSH'|'EMAIL'|'SMS'; subject?:string; body:string; enabled:boolean; updatedAt:string; }
export interface MasterDataEntry { id:string; type:'DISTRICT'|'BLOCK'|'VILLAGE'|'CATEGORY'|'SDG'|'FUNDING_SOURCE'; code:string; name:string; parentId?:string; metadata?:Record<string,unknown>; active:boolean; updatedAt:string; }
export interface KnowledgeGraphNode { id:string; type:'UNIVERSITY'|'DEPARTMENT'|'FACULTY'|'EXPERTISE'|'LAB'|'EQUIPMENT'|'PUBLICATION'|'PATENT'|'PROJECT'|'STUDENT_SKILL'|'CHALLENGE'; label:string; metadata?:Record<string,unknown>; }
export interface KnowledgeGraphEdge { id:string; from:string; to:string; relation:'HAS'|'HAS_EXPERTISE'|'AUTHORED'|'WORKED_ON'|'REQUIRES'|'USES'|'HAS_SKILL'; weight?:number; }
