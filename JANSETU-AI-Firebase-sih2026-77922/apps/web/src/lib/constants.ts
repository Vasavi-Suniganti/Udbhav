import type { ChallengeStatus, IssueType, DomainType, ProjectStatus, PriorityLevel, ProposalStatus } from '@/types';

export const CHALLENGE_STATUS_CONFIG: Record<ChallengeStatus, { label: string; color: string; bg: string; dot: string }> = {
  SUBMITTED: { label: 'Submitted', color: 'text-neutral-700', bg: 'bg-neutral-100', dot: 'bg-neutral-400' },
  AI_PROCESSED: { label: 'AI Processed', color: 'text-blue-700', bg: 'bg-blue-100', dot: 'bg-blue-500' },
  PENDING_VALIDATION: { label: 'Pending Validation', color: 'text-amber-700', bg: 'bg-amber-100', dot: 'bg-amber-500' },
  NEEDS_INFORMATION: { label: 'Needs Information', color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500' },
  FIELD_VERIFICATION: { label: 'Field Verification', color: 'text-cyan-700', bg: 'bg-cyan-100', dot: 'bg-cyan-500' },
  VALIDATED: { label: 'Validated', color: 'text-green-700', bg: 'bg-green-100', dot: 'bg-green-500' },
  REJECTED: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-500' },
  MERGED: { label: 'Merged', color: 'text-purple-700', bg: 'bg-purple-100', dot: 'bg-purple-500' },
  ESCALATED: { label: 'Escalated', color: 'text-red-800', bg: 'bg-red-200', dot: 'bg-red-600' },
  OPEN_FOR_INSTITUTIONS: { label: 'Open for Institutions', color: 'text-teal-700', bg: 'bg-teal-100', dot: 'bg-teal-500' },
  ASSIGNED: { label: 'Assigned', color: 'text-indigo-700', bg: 'bg-indigo-100', dot: 'bg-indigo-500' },
  DEPLOYED: { label: 'Deployed', color: 'text-green-800', bg: 'bg-green-100', dot: 'bg-green-600' },
};

export const ISSUE_TYPE_CONFIG: Record<IssueType, { label: string; description: string; color: string; bg: string }> = {
  GRIEVANCE: { label: 'Grievance', description: 'Individual citizen complaint requiring resolution', color: 'text-neutral-700', bg: 'bg-neutral-100' },
  MAINTENANCE: { label: 'Maintenance', description: 'Infrastructure or service requiring repair', color: 'text-blue-700', bg: 'bg-blue-100' },
  ADMINISTRATIVE: { label: 'Administrative', description: 'Process or administrative improvement needed', color: 'text-cyan-700', bg: 'bg-cyan-100' },
  RESEARCH_CHALLENGE: { label: 'Research Challenge', description: 'Requires academic research and innovation', color: 'text-purple-700', bg: 'bg-purple-100' },
  INNOVATION_OPPORTUNITY: { label: 'Innovation Opportunity', description: 'Systemic problem solvable through innovation', color: 'text-teal-700', bg: 'bg-teal-100' },
  POLICY_SYSTEMIC: { label: 'Policy / Systemic', description: 'Requires policy or systemic intervention', color: 'text-amber-700', bg: 'bg-amber-100' },
  CRITICAL_SAFETY: { label: 'Critical Safety', description: 'Immediate health or safety risk', color: 'text-red-700', bg: 'bg-red-100' },
};

export const DOMAIN_CONFIG: Record<DomainType, { icon: string; color: string }> = {
  'Education': { icon: 'GraduationCap', color: 'text-blue-600' },
  'Healthcare': { icon: 'HeartPulse', color: 'text-red-600' },
  'Agriculture': { icon: 'Wheat', color: 'text-green-600' },
  'Water Resources': { icon: 'Droplets', color: 'text-cyan-600' },
  'Sanitation': { icon: 'Sparkles', color: 'text-teal-600' },
  'Environment': { icon: 'Leaf', color: 'text-green-700' },
  'Energy': { icon: 'Zap', color: 'text-amber-600' },
  'Rural Livelihoods': { icon: 'Home', color: 'text-orange-600' },
  'Accessibility': { icon: 'Accessibility', color: 'text-purple-600' },
  'Urban Development': { icon: 'Building2', color: 'text-indigo-600' },
  'Transport': { icon: 'Truck', color: 'text-blue-700' },
  'Waste Management': { icon: 'Trash2', color: 'text-neutral-600' },
  'Public Administration': { icon: 'Landmark', color: 'text-slate-600' },
  'Disaster Management': { icon: 'AlertTriangle', color: 'text-red-700' },
  'Digital Inclusion': { icon: 'Wifi', color: 'text-cyan-700' },
  'Skill Development': { icon: 'Wrench', color: 'text-amber-700' },
  'Other': { icon: 'CircleDot', color: 'text-neutral-500' },
};

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  DISCOVERY: { label: 'Discovery', color: 'text-neutral-700', bg: 'bg-neutral-100' },
  VALIDATED: { label: 'Validated', color: 'text-green-700', bg: 'bg-green-100' },
  ASSIGNED: { label: 'Assigned', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  TEAM_FORMED: { label: 'Team Formed', color: 'text-blue-700', bg: 'bg-blue-100' },
  RESEARCH: { label: 'Research', color: 'text-cyan-700', bg: 'bg-cyan-100' },
  PROPOSAL: { label: 'Proposal', color: 'text-amber-700', bg: 'bg-amber-100' },
  APPROVED: { label: 'Approved', color: 'text-green-700', bg: 'bg-green-100' },
  FUNDED: { label: 'Funded', color: 'text-teal-700', bg: 'bg-teal-100' },
  PROTOTYPING: { label: 'Prototyping', color: 'text-purple-700', bg: 'bg-purple-100' },
  LAB_TESTING: { label: 'Lab Testing', color: 'text-violet-700', bg: 'bg-violet-100' },
  FIELD_TESTING: { label: 'Field Testing', color: 'text-orange-700', bg: 'bg-orange-100' },
  PILOT: { label: 'Pilot', color: 'text-blue-800', bg: 'bg-blue-200' },
  COMMUNITY_VALIDATION: { label: 'Community Validation', color: 'text-teal-800', bg: 'bg-teal-200' },
  DEPLOYMENT_READY: { label: 'Deployment Ready', color: 'text-green-800', bg: 'bg-green-200' },
  DEPLOYED: { label: 'Deployed', color: 'text-green-900', bg: 'bg-green-300' },
  SCALING: { label: 'Scaling', color: 'text-emerald-800', bg: 'bg-emerald-200' },
  COMPLETED: { label: 'Completed', color: 'text-emerald-900', bg: 'bg-emerald-300' },
  ARCHIVED: { label: 'Archived', color: 'text-neutral-600', bg: 'bg-neutral-200' },
};

export const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; color: string; bg: string; border: string }> = {
  CRITICAL: { label: 'Critical', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  HIGH: { label: 'High', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  MEDIUM: { label: 'Medium', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  LOW: { label: 'Low', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  INFO: { label: 'Info', color: 'text-neutral-700', bg: 'bg-neutral-50', border: 'border-neutral-200' },
};

export const PROPOSAL_STATUS_CONFIG: Record<ProposalStatus, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Draft', color: 'text-neutral-700', bg: 'bg-neutral-100' },
  FACULTY_REVIEW: { label: 'Faculty Review', color: 'text-cyan-700', bg: 'bg-cyan-100' },
  SUBMITTED: { label: 'Submitted', color: 'text-blue-700', bg: 'bg-blue-100' },
  GOVERNMENT_REVIEW: { label: 'Government Review', color: 'text-amber-700', bg: 'bg-amber-100' },
  NEEDS_CHANGES: { label: 'Needs Changes', color: 'text-orange-700', bg: 'bg-orange-100' },
  APPROVED: { label: 'Approved', color: 'text-green-700', bg: 'bg-green-100' },
  REJECTED: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100' },
};

export const IRL_LEVELS = [
  { level: 1, label: 'Problem Validated', description: 'Challenge validated and structured' },
  { level: 2, label: 'Research Completed', description: 'Literature review and feasibility done' },
  { level: 3, label: 'Concept Developed', description: 'Solution concept and architecture defined' },
  { level: 4, label: 'Prototype Created', description: 'Initial working prototype built' },
  { level: 5, label: 'Lab Tested', description: 'Prototype tested in controlled conditions' },
  { level: 6, label: 'Field Tested', description: 'Tested in real-world field conditions' },
  { level: 7, label: 'Community Pilot', description: 'Pilot deployment with community' },
  { level: 8, label: 'Deployment Ready', description: 'Ready for full deployment' },
  { level: 9, label: 'Scaled', description: 'Solution scaled to multiple locations' },
];

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function formatCurrency(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

export function formatDate(date: unknown): string {
  if (!date) return 'Date unavailable';
  let value: Date;
  if (date instanceof Date) value = date;
  else if (typeof date === 'object' && date !== null && 'toDate' in date && typeof (date as { toDate?: unknown }).toDate === 'function') value = (date as { toDate: () => Date }).toDate();
  else if (typeof date === 'object' && date !== null && 'seconds' in date) value = new Date(Number((date as { seconds: number }).seconds) * 1000);
  else if (typeof date === 'number') value = new Date(date);
  else value = new Date(String(date));
  return Number.isNaN(value.getTime()) ? 'Date unavailable' : value.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function priorityFromScore(score: number): PriorityLevel {
  if (score >= 90) return 'CRITICAL';
  if (score >= 75) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  return 'LOW';
}

export function calculatePriority(input: {
  affectedPeople?: number;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  safetyConcern?: boolean;
  duration?: string | number;
  seasonal?: boolean;
  district?: string;
  block?: string;
  village?: string;
}) {
  const affectedPeople = Math.max(0, Number(input.affectedPeople ?? 0));

  // Impact from the number of people affected: max 30 points
  const affectedScore = Math.min(30, Math.round(affectedPeople / 50));

  // Severity: max 30 points
  const severityScore: Record<string, number> = {
    LOW: 8,
    MEDIUM: 16,
    HIGH: 24,
    CRITICAL: 30,
  };

  // Safety concern: 20 points
  const safetyScore = input.safetyConcern ? 20 : 0;

  // Duration: max 10 points
  const duration =
    input.duration === undefined || input.duration === 'Unknown'
      ? 0
      : Math.max(0, Number(input.duration) || 0);

  const durationScore = Math.min(10, Math.ceil(duration / 30));

  // Seasonal problems receive additional attention
  const seasonalScore = input.seasonal ? 5 : 0;

  // Location completeness: max 5 points
  const locationScore =
    (input.district ? 2 : 0) +
    (input.block ? 1 : 0) +
    (input.village ? 2 : 0);

  const score = Math.min(
    100,
    affectedScore +
      (severityScore[input.severity ?? 'MEDIUM'] ?? 16) +
      safetyScore +
      durationScore +
      seasonalScore +
      locationScore
  );

  const level = priorityFromScore(score);

  return {
    score,
    level,
  };
}