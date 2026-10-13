import type {Challenge,Project,Solution,ChallengeCluster,ImpactMetric,CommunityFeedback,Notification,PriorityLevel} from '@/types';

function priorityLevel(score:number):PriorityLevel{
  return score>=85?'CRITICAL':score>=70?'HIGH':score>=50?'MEDIUM':score>=25?'LOW':'INFO';
}

export function challengeFromApi(c:any):Challenge{
  const score = c.priority_score ?? c.priority?.total ?? 0;
  return {
    id: c.id,
    source: c.source,
    imageUrl: c.imageUrl || c.image_url,
    challenge_code: c.challenge_code || c.publicId || c.id,
    title: c.title,
    description: c.description,
    domain: c.domain,
    subdomain: c.subdomain,
    issue_type: c.issue_type || c.issueType || 'INNOVATION_OPPORTUNITY',
    status: c.status,
    priority_score: score,
    priority_level: c.priority_level || priorityLevel(score),
    priority_breakdown: c.priority_breakdown || c.priority?.factors || c.priority?.breakdown,
    submitted_by: c.submitted_by || c.reporterId || '',
    submitted_by_name: c.submitted_by_name || c.submittedByName || 'Citizen',
    district: c.district,
    block: c.block,
    village: c.village,
    ward: c.ward,
    latitude: c.latitude,
    longitude: c.longitude,
    address: c.address,
    affected_population: c.affected_population ?? c.affectedPeople ?? 0,
    duration: c.duration,
    frequency: c.frequency,
    is_seasonal: c.is_seasonal ?? c.seasonal,
    has_safety_concern: c.has_safety_concern ?? c.safetyConcern,
    ai_title: c.ai_title || c.title,
    ai_description: c.ai_description || c.aiSummary || c.description,
    ai_domain: c.ai_domain || c.domain,
    ai_issue_type: c.ai_issue_type || c.issueType || c.issue_type,
    ai_confidence: c.ai_confidence ?? c.aiTrace?.confidence,
    ai_required_expertise: c.ai_required_expertise || c.expertise || [],
    ai_duplicate_warning: c.ai_duplicate_warning ?? (Array.isArray(c.relatedIds) && c.relatedIds.length > 0),
    tags: c.tags || [],
    evidence_urls: c.evidence_urls || (c.evidence || []).map((e:any)=>typeof e === 'string' ? e : e.url).filter(Boolean),
    evidence: c.evidence || [],
    cluster_id: c.cluster_id || c.clusterId,
    assigned_organization_id: c.assigned_organization_id || c.assignedUniversityId,
    project_id: c.project_id || c.projectId,
    governmentVerificationStatus: c.governmentVerificationStatus,
    isPublished: Boolean(c.isPublished),
    publishedAt: c.publishedAt,
    publishedBy: c.publishedBy,
    challengeStatus: c.challengeStatus,
    aiRecommendedCollaboration: c.aiRecommendedCollaboration,
    aiSuggestedUniversityDomain: c.aiSuggestedUniversityDomain || [],
    aiSuggestedIndustryDomain: c.aiSuggestedIndustryDomain || [],
    aiRequiredExpertise: c.aiRequiredExpertise || c.ai_required_expertise || [],
    aiRecommendedAction: c.aiRecommendedAction,
    aiReasoning: c.aiReasoning,
    universityInterest: c.universityInterest,
    industryInterest: c.industryInterest,
    collaborationType: c.collaborationType,
    collaborationConfirmedBy: c.collaborationConfirmedBy,
    collaborationConfirmedAt: c.collaborationConfirmedAt,
    governmentDepartment: c.governmentDepartment,
    universityName: c.universityName,
    studentTeamName: c.studentTeamName,
    facultyMentorName: c.facultyMentorName,
    industryPartnerId: c.industryPartnerId,
    industryPartnerName: c.industryPartnerName,
    industryMentorName: c.industryMentorName,
    currentStage: c.currentStage,
    progress: c.progress,
    communitySupportCount: c.communitySupportCount,
    communityCommentCount: c.communityCommentCount,
    impact: c.impact,
    clarificationRequest: c.clarificationRequest,
    verifiedAt: c.verifiedAt || c.governmentVerifiedAt,
    verifiedBy: c.verifiedBy || c.governmentVerifiedBy,
    validation_comments: c.validation_comments || (c.validationNote ? [{id:`v-${c.id}`,author_name:'Government reviewer',author_role:'GOVERNMENT_OFFICER',comment:c.validationNote,action:c.status,created_at:c.updatedAt}] : []),
    created_at: c.created_at || c.createdAt || new Date().toISOString(),
    updated_at: c.updated_at || c.updatedAt || new Date().toISOString()
  };
}

export function projectFromApi(p:any,universityName='Institution'):Project{
  return {
    id: p.id,
    project_code: p.project_code || p.projectCode || `PRJ-${p.id.slice(0,8).toUpperCase()}`,
    title: p.title,
    challenge_id: p.challenge_id || p.challengeId,
    status: p.status,
    irl_level: p.irl_level ?? p.irl ?? 1,
    organization_id: p.organization_id || p.universityId,
    organization_name: p.organization_name || p.universityName || universityName,
    team_members: p.team_members || (p.teamDetails || p.team || []).map((x:any,i:number)=>typeof x==='string'?{id:x,name:x,role:i===0?'Lead':'Member'}:{id:x.id||String(i),name:x.name||x.id||'Member',role:x.role||x.department||'Member',expertise:(x.expertise||x.skills||[]).join(', ')}),
    milestones: (p.milestones || []).map((m:any)=>({
      id: m.id,
      title: m.title,
      description: m.description,
      status: m.status || (m.done ? 'COMPLETED' : 'PENDING'),
      due_date: m.due_date || m.dueDate || '',
      completed_date: m.completed_date || (m.done ? (m.dueDate || m.due_date) : undefined),
      assignee: m.assignee
    })),
    tasks: (p.tasks || []).map((t:any)=>({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee || t.assigneeName || t.assigneeId,
      due_date: t.due_date || t.dueDate,
      labels: t.labels || []
    })),
    description: p.description,
    start_date: p.start_date || p.createdAt,
    end_date: p.end_date,
    funding_required: p.funding_required ?? p.fundingRequired,
    funding_received: p.funding_received ?? p.fundingReceived,
    beneficiaries: p.beneficiaries,
    created_at: p.created_at || p.createdAt || new Date().toISOString(),
    updated_at: p.updated_at || p.updatedAt || p.created_at || p.createdAt || new Date().toISOString()
  };
}

export function solutionFromApi(s:any,i=0):Solution{
  return {
    id: s.id,
    solution_code: s.solution_code || s.solutionCode || `SOL-JH-${String(i+1).padStart(4,'0')}`,
    title: s.title,
    domain: s.domain || (s.domains?.[0] || 'Other'),
    description: s.description || s.solution || '',
    problem_addressed: s.problem_addressed || s.problem || '',
    architecture: s.architecture,
    bom_cost: s.bom_cost ?? s.cost,
    deployment_guide: s.deployment_guide ?? s.deploymentGuide,
    pilot_evidence: s.pilot_evidence,
    impact_summary: s.impact_summary || s.lessonsLearned,
    beneficiaries: s.beneficiaries,
    districts_covered: s.districts_covered || s.districts || [],
    project_id: s.project_id || s.projectId,
    organization_name: s.organization_name || s.organizationName || 'UDBHAV partner institution',
    replication_ready: s.replication_ready ?? Boolean(s.reusable),
    created_at: s.created_at || s.createdAt || new Date().toISOString()
  };
}

export function clusterFromApi(c:any):ChallengeCluster{
  return {
    id: c.id,
    title: c.title,
    domain: c.domain,
    district: c.district || c.districts?.[0] || '',
    blocks: c.blocks || [],
    report_count: c.report_count ?? c.reportCount ?? 0,
    estimated_affected: c.estimated_affected ?? c.estimatedAffectedPopulation ?? 0,
    severity: c.severity || priorityLevel(c.severity || 0),
    trend: c.trend === 'RISING' ? 'INCREASING' : c.trend === 'FALLING' ? 'DECREASING' : (c.trend || 'STABLE'),
    growth_rate: c.growth_rate ?? c.growthRate ?? 0,
    linked_challenges: c.linked_challenges || c.challengeIds || [],
    linked_projects: c.linked_projects || c.linkedProjects || [],
    created_at: c.created_at || c.createdAt || new Date().toISOString()
  };
}

export function impactFromApi(x:any):ImpactMetric{
  return {
    id: x.id,
    project_id: x.project_id || x.projectId,
    metric_name: x.metric_name || x.metric,
    metric_value: String(x.metric_value ?? x.after ?? ''),
    metric_unit: x.metric_unit || x.unit || '',
    before_value: String(x.before_value ?? x.before ?? ''),
    after_value: String(x.after_value ?? x.after ?? ''),
    evidence: x.evidence || (x.verified ? `Verified ${x.verifiedAt||''}` : 'Pending verification'),
    created_at: x.created_at || x.createdAt || new Date().toISOString()
  };
}

export function feedbackFromApi(x:any):CommunityFeedback{
  return {
    id: x.id,
    project_id: x.project_id || x.projectId,
    author_name: x.author_name || x.authorName || 'Community participant',
    rating: x.rating || x.outcome || 'BETTER',
    comment: x.comment,
    media_urls: x.media_urls || (x.evidence || []).map((e:any)=>e.url),
    created_at: x.created_at || x.createdAt || new Date().toISOString()
  };
}

export function notificationFromApi(x:any):Notification{
  const isRead = Boolean(x.read || x.isRead || false);
  return {
    id: x.id,
    user_id: x.user_id || x.userId || '',
    title: x.title,
    message: x.message,
    type: x.type,
    read: isRead,
    link: x.link || x.actionUrl || x.entityId,
    announcementId: x.announcementId,
    relatedProblemId: x.relatedProblemId || x.problemId,
    relatedProjectId: x.relatedProjectId || x.projectId,
    relatedTeamId: x.relatedTeamId,
    relatedUniversityId: x.relatedUniversityId,
    relatedPartnerId: x.relatedPartnerId,
    relatedUserId: x.relatedUserId || x.senderId,
    senderId: x.senderId || x.relatedUserId,
    priority: x.priority,
    metadata: x.metadata || {},
    created_at: x.created_at || x.createdAt || new Date().toISOString(),
    readAt: x.readAt || (isRead ? new Date().toISOString() : undefined),
    isRead,
  };
}
