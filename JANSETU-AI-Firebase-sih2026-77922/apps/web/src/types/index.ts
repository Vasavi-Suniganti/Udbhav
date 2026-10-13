export type UserRole =
  | 'CITIZEN'
  | 'VOLUNTEER'
  | 'STUDENT'
  | 'FACULTY'
  | 'UNIVERSITY_ADMIN'
  | 'INDUSTRY_PARTNER'
  | 'STARTUP'
  | 'MSME'
  | 'CSR_PARTNER'
  | 'RESEARCH_LAB'
  | 'MENTOR'
  | 'PANCHAYAT_OFFICER'
  | 'ULB_OFFICER'
  | 'DISTRICT_OFFICER'
  | 'GOVERNMENT_OFFICER'
  | 'DEPARTMENT_ADMIN'
  | 'PROJECT_OFFICER'
  | 'FINANCE_OFFICER'
  | 'ANALYTICS_OFFICER'
  | 'PLATFORM_ADMIN'
  | 'SUPER_ADMIN';

export type MainRole =
  | 'CITIZEN'
  | 'VOLUNTEER'
  | 'ACADEMIC'
  | 'PARTNER'
  | 'GOVERNMENT'
  | 'PLATFORM_ADMIN';

export const PUBLIC_MAIN_ROLES: MainRole[] = [
  'CITIZEN',
  'VOLUNTEER',
  'ACADEMIC',
  'PARTNER',
  'GOVERNMENT',
];

export function internalRoleFor(mainRole: MainRole): UserRole {
  if (mainRole === 'ACADEMIC') return 'UNIVERSITY_ADMIN';

  if (mainRole === 'PARTNER') return 'INDUSTRY_PARTNER';

  if (mainRole === 'GOVERNMENT') return 'GOVERNMENT_OFFICER';

  return mainRole;
}

export function mainRoleFor(role: UserRole): MainRole {
  if (role === 'PLATFORM_ADMIN' || role === 'SUPER_ADMIN') {
    return 'PLATFORM_ADMIN';
  }

  if (
    [
      'PANCHAYAT_OFFICER',
      'ULB_OFFICER',
      'DISTRICT_OFFICER',
      'GOVERNMENT_OFFICER',
      'DEPARTMENT_ADMIN',
      'PROJECT_OFFICER',
      'FINANCE_OFFICER',
      'ANALYTICS_OFFICER',
    ].includes(role)
  ) {
    return 'GOVERNMENT';
  }

  if (
    ['STUDENT', 'FACULTY', 'UNIVERSITY_ADMIN'].includes(role)
  ) {
    return 'ACADEMIC';
  }

  if (
    [
      'INDUSTRY_PARTNER',
      'STARTUP',
      'MSME',
      'CSR_PARTNER',
      'RESEARCH_LAB',
      'MENTOR',
    ].includes(role)
  ) {
    return 'PARTNER';
  }

  if (role === 'VOLUNTEER') {
    return 'VOLUNTEER';
  }

  return 'CITIZEN';
}

export type ChallengeStatus =
  | 'SUBMITTED'
  | 'AI_PROCESSED'
  | 'PENDING_VALIDATION'
  | 'NEEDS_INFORMATION'
  | 'FIELD_VERIFICATION'
  | 'VALIDATED'
  | 'REJECTED'
  | 'MERGED'
  | 'ESCALATED'
  | 'OPEN_FOR_INSTITUTIONS'
  | 'ASSIGNED'
  | 'DEPLOYED';

export type IssueType =
  | 'GRIEVANCE'
  | 'MAINTENANCE'
  | 'ADMINISTRATIVE'
  | 'RESEARCH_CHALLENGE'
  | 'INNOVATION_OPPORTUNITY'
  | 'POLICY_SYSTEMIC'
  | 'CRITICAL_SAFETY';

export type DomainType =
  | 'Education'
  | 'Healthcare'
  | 'Agriculture'
  | 'Water Resources'
  | 'Sanitation'
  | 'Environment'
  | 'Energy'
  | 'Rural Livelihoods'
  | 'Accessibility'
  | 'Urban Development'
  | 'Transport'
  | 'Waste Management'
  | 'Public Administration'
  | 'Disaster Management'
  | 'Digital Inclusion'
  | 'Skill Development'
  | 'Other';

export type ProjectStatus =
  | 'DISCOVERY'
  | 'VALIDATED'
  | 'ASSIGNED'
  | 'TEAM_FORMED'
  | 'RESEARCH'
  | 'PROPOSAL'
  | 'APPROVED'
  | 'FUNDED'
  | 'PROTOTYPING'
  | 'LAB_TESTING'
  | 'FIELD_TESTING'
  | 'PILOT'
  | 'COMMUNITY_VALIDATION'
  | 'DEPLOYMENT_READY'
  | 'DEPLOYED'
  | 'SCALING'
  | 'COMPLETED'
  | 'ARCHIVED';

export type ProposalStatus =
  | 'DRAFT'
  | 'FACULTY_REVIEW'
  | 'SUBMITTED'
  | 'GOVERNMENT_REVIEW'
  | 'NEEDS_CHANGES'
  | 'APPROVED'
  | 'REJECTED';

export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  organization_id?: string;
  district?: string;
  block?: string;
  village?: string;
  locale?: 'en' | 'hi' | 'sat' | 'bn' | 'ur' | 'nag';
  created_at: string;
  updated_at: string;
}

export interface Challenge {
  id: string;
  source?: 'firestore' | 'demo';
  imageUrl?: string;
  challenge_code: string;
  public_id?: string;
  title: string;
  description: string;
  domain: DomainType;
  subdomain?: string;
  issue_type: IssueType;
  status: ChallengeStatus;
  priority_score: number;
  priority_level: PriorityLevel;
  priority_breakdown?: Record<string, number>;
  submitted_by: string;
  submitted_by_name: string;
  district: string;
  block?: string;
  village?: string;
  ward?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  affected_population?: number;
  duration?: string;
  frequency?: string;
  is_seasonal?: boolean;
  has_safety_concern?: boolean;
  ai_title?: string;
  ai_description?: string;
  ai_domain?: string;
  ai_issue_type?: string;
  ai_confidence?: number;
  ai_required_expertise?: string[];
  ai_duplicate_warning?: boolean;
  tags?: string[];
  evidence_urls?: string[];
  evidence?: any[];
  cluster_id?: string;
  assigned_organization_id?: string;
  project_id?: string;
  governmentVerificationStatus?: string;
  isPublished?: boolean;
  publishedAt?: unknown;
  publishedBy?: string;
  challengeStatus?: string;
  aiRecommendedCollaboration?: 'UNIVERSITY' | 'INDUSTRY' | 'UNIVERSITY_AND_INDUSTRY' | 'GOVERNMENT_COMMUNITY';
  aiSuggestedUniversityDomain?: string[];
  aiSuggestedIndustryDomain?: string[];
  aiRequiredExpertise?: string[];
  aiRecommendedAction?: string;
  aiReasoning?: string;
  universityInterest?: Record<string, unknown>;
  industryInterest?: Record<string, unknown>;
  collaborationType?: 'UNIVERSITY' | 'INDUSTRY' | 'UNIVERSITY_AND_INDUSTRY' | 'GOVERNMENT_COMMUNITY';
  collaborationConfirmedBy?: string;
  collaborationConfirmedAt?: unknown;
  clarificationRequest?: { message: string; requestedAt?: unknown; requestedBy?: string; status: string };
  verifiedAt?: unknown;
  verifiedBy?: string;
  governmentDepartment?: string;
  universityName?: string;
  studentTeamName?: string;
  facultyMentorName?: string;
  industryPartnerId?: string;
  industryPartnerName?: string;
  industryMentorName?: string;
  currentStage?: string;
  progress?: number;
  communitySupportCount?: number;
  communityCommentCount?: number;
  impact?: string[] | Record<string, unknown>;
  validation_comments?: ValidationComment[];
  created_at: string;
  updated_at: string;
}

export interface ValidationComment {
  id: string;
  author_name: string;
  author_role: string;
  comment: string;
  action: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  type: 'UNIVERSITY' | 'INDUSTRY' | 'STARTUP' | 'MSME' | 'CSR_PARTNER' | 'RESEARCH_LAB' | 'GOVERNMENT' | 'NGO';
  district?: string;
  website?: string;
  description?: string;
  departments?: string[];
  expertise_areas?: string[];
  capabilities?: string[];
  naac_grade?: string;
  incubator?: boolean;
  verified: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  project_code: string;
  title: string;
  challenge_id: string;
  status: ProjectStatus;
  irl_level: number;
  organization_id: string;
  organization_name: string;
  team_members?: TeamMember[];
  milestones?: Milestone[];
  tasks?: Task[];
  description?: string;
  start_date?: string;
  end_date?: string;
  funding_required?: number;
  funding_received?: number;
  beneficiaries?: number;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  expertise?: string;
  avatar_url?: string;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  due_date: string;
  completed_date?: string;
  assignee?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  priority: PriorityLevel;
  assignee?: string;
  due_date?: string;
  labels?: string[];
}

export interface Proposal {
  id: string;
  project_id: string;
  title: string;
  status: ProposalStatus;
  version: number;
  problem_understanding?: string;
  root_cause?: string;
  objectives?: string;
  solution_concept?: string;
  technology?: string;
  methodology?: string;
  timeline?: string;
  budget?: number;
  impact_kpis?: string;
  scaling_strategy?: string;
  created_at: string;
  updated_at: string;
}

export interface Solution {
  id: string;
  solution_code: string;
  title: string;
  domain: DomainType;
  description: string;
  problem_addressed: string;
  architecture?: string;
  bom_cost?: number;
  deployment_guide?: string;
  pilot_evidence?: string;
  impact_summary?: string;
  beneficiaries?: number;
  districts_covered?: string[];
  project_id: string;
  organization_name: string;
  replication_ready: boolean;
  created_at: string;
}

export interface ImpactMetric {
  id: string;
  project_id: string;
  metric_name: string;
  metric_value: string;
  metric_unit: string;
  before_value?: string;
  after_value?: string;
  evidence?: string;
  created_at: string;
}

export interface CommunityFeedback {
  id: string;
  project_id: string;
  author_name: string;
  rating: 'MUCH_BETTER' | 'BETTER' | 'NO_CHANGE' | 'WORSE';
  comment?: string;
  media_urls?: string[];
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string;
  announcementId?: string;
  relatedProblemId?: string;
  relatedProjectId?: string;
  relatedTeamId?: string;
  relatedUniversityId?: string;
  relatedPartnerId?: string;
  relatedUserId?: string;
  senderId?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  metadata?: Record<string, unknown>;
  created_at: string;
  readAt?: string;
  isRead?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: string;
  publishedAt: string;
  expiresAt?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  actor_name: string;
  action: string;
  entity: string;
  entity_id: string;
  details?: string;
  created_at: string;
}

export interface ChallengeCluster {
  id: string;
  title: string;
  domain: DomainType;
  district: string;
  blocks?: string[];
  report_count: number;
  estimated_affected: number;
  severity: PriorityLevel;
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  growth_rate?: number;
  linked_challenges: string[];
  linked_projects?: string[];
  created_at: string;
}

export interface District {
  id: string;
  name: string;
  region: string;
  population?: number;
  block_count?: number;
  challenge_count?: number;
  active_projects?: number;
}
