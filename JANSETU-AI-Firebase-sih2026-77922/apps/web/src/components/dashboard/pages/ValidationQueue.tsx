import { useState } from 'react';
import {
  ShieldCheck, FileText, MapPin, Clock, Brain,
  CheckCircle2, XCircle, AlertTriangle, MessageSquare, Send,
} from 'lucide-react';
import { Card, SectionHeader, EmptyState } from '@/components/ui';
import { AnimatedProgress } from '@/components/ui/motion';
import { usePlatform } from '@/context/PlatformContext';
import { api } from '@/lib/api';
import { CHALLENGE_STATUS_CONFIG, PRIORITY_CONFIG, ISSUE_TYPE_CONFIG, timeAgo, formatDate } from '@/lib/constants';
import type { Challenge, ChallengeStatus } from '@/types';
import { useToast } from '@/context/ToastContext';

interface ValidationQueueProps {
  onNavigate: (route: string) => void;
}

export default function ValidationQueue({ onNavigate }: ValidationQueueProps) {
  const { show } = useToast();
  const {challenges,refresh}=usePlatform();
  const [selected, setSelected] = useState<Challenge | null>(null);
  const [comment, setComment] = useState('');

  const queue = challenges.filter(
    (c) => c.status === 'PENDING_VALIDATION' || c.status === 'AI_PROCESSED' || c.status === 'FIELD_VERIFICATION'
  );

  async function takeAction(decision: 'VALIDATED'|'FIELD_VERIFICATION'|'NEEDS_INFORMATION'|'REJECTED'|'ESCALATED'|'OPEN_FOR_INSTITUTIONS') {
    if (!selected) return;
    const note=comment.trim() || `Reviewer changed status to ${decision.replaceAll('_',' ').toLowerCase()}.`;
    try { const updated=await api.validate(selected.id,{decision,note}); await refresh(); setSelected(null); setComment(''); show(`Challenge ${decision.toLowerCase().replaceAll('_',' ')}. Audit log entry created.`, 'success'); }
    catch(error){show((error as Error).message,'error');}
  }

  async function submitComment() {
    if (!selected || !comment.trim()) return;
    try { await api.challengeComment(selected.id,comment); show('Comment added to validation history.', 'success'); setComment(''); await refresh(); }
    catch(error){show((error as Error).message,'error');}
  }

  return (
    <div className="civic-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-neutral-900">Validation Queue</h1>
        <p className="text-sm text-neutral-500 mt-1">Review, verify, and validate submitted challenges. Every action is audit-logged.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Queue list */}
        <div className="lg:col-span-1">
          <SectionHeader title={`Pending (${queue.length})`} />
          <div className="space-y-2">
            {queue.map((ch) => {
              const statusConfig = CHALLENGE_STATUS_CONFIG[ch.status as ChallengeStatus];
              return (
              <button
                key={ch.id}
                onClick={() => setSelected(ch)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selected?.id === ch.id ? 'border-primary-300 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`badge ${statusConfig?.bg} ${statusConfig?.color} text-[10px]`}>{statusConfig?.label}</span>
                  <span className={`badge ${PRIORITY_CONFIG[ch.priority_level]?.bg} ${PRIORITY_CONFIG[ch.priority_level]?.color} border ${PRIORITY_CONFIG[ch.priority_level]?.border} text-[10px]`}>
                    {ch.priority_level}
                  </span>
                </div>
                <p className="text-sm font-medium text-neutral-900 line-clamp-2 leading-snug">{ch.title}</p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-neutral-400">
                  <span className="flex items-center gap-1"><MapPin size={10} /> {ch.district}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {timeAgo(ch.created_at)}</span>
                </div>
              </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="space-y-4">
              {/* Challenge detail */}
              <Card className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`badge ${CHALLENGE_STATUS_CONFIG[selected.status as ChallengeStatus]?.bg} ${CHALLENGE_STATUS_CONFIG[selected.status as ChallengeStatus]?.color}`}>
                      {CHALLENGE_STATUS_CONFIG[selected.status as ChallengeStatus]?.label}
                    </span>
                    <span className={`badge ${PRIORITY_CONFIG[selected.priority_level]?.bg} ${PRIORITY_CONFIG[selected.priority_level]?.color} border ${PRIORITY_CONFIG[selected.priority_level]?.border}`}>
                      {selected.priority_level}
                    </span>
                    <span className={`badge ${ISSUE_TYPE_CONFIG[selected.issue_type]?.bg} ${ISSUE_TYPE_CONFIG[selected.issue_type]?.color}`}>
                      {ISSUE_TYPE_CONFIG[selected.issue_type]?.label}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-neutral-400">{selected.challenge_code}</span>
                </div>

                <h2 className="text-lg font-semibold text-neutral-900 mb-2">{selected.title}</h2>
                <p className="text-sm text-neutral-600 leading-relaxed mb-4">{selected.description}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="rounded-lg bg-neutral-50 p-3">
                    <span className="text-xs text-neutral-400">District</span>
                    <p className="text-sm font-semibold text-neutral-900 mt-0.5">{selected.district}</p>
                  </div>
                  {selected.block && <div className="rounded-lg bg-neutral-50 p-3">
                    <span className="text-xs text-neutral-400">Block</span>
                    <p className="text-sm font-semibold text-neutral-900 mt-0.5">{selected.block}</p>
                  </div>}
                  {selected.village && <div className="rounded-lg bg-neutral-50 p-3">
                    <span className="text-xs text-neutral-400">Village</span>
                    <p className="text-sm font-semibold text-neutral-900 mt-0.5">{selected.village}</p>
                  </div>}
                  {selected.affected_population && <div className="rounded-lg bg-neutral-50 p-3">
                    <span className="text-xs text-neutral-400">Affected</span>
                    <p className="text-sm font-semibold text-neutral-900 mt-0.5">{selected.affected_population.toLocaleString('en-IN')}</p>
                  </div>}
                </div>

                {/* AI Analysis */}
                {selected.ai_title && (
                  <div className="rounded-lg bg-primary-50 border border-primary-200 p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain size={16} className="text-primary-600" />
                      <span className="text-sm font-semibold text-primary-800">AI Analysis</span>
                      {selected.ai_confidence && (
                        <span className="badge bg-white text-primary-700 border border-primary-200">
                          {Math.round(selected.ai_confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-primary-700 font-medium">AI Title:</span> <span className="text-neutral-700">{selected.ai_title}</span></div>
                      <div><span className="text-primary-700 font-medium">Domain:</span> <span className="text-neutral-700">{selected.ai_domain}</span></div>
                      <div><span className="text-primary-700 font-medium">Issue Type:</span> <span className="text-neutral-700">{selected.ai_issue_type?.replace(/_/g, ' ')}</span></div>
                      {selected.ai_required_expertise && selected.ai_required_expertise.length > 0 && (
                        <div>
                          <span className="text-primary-700 font-medium">Required Expertise:</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {selected.ai_required_expertise.map((e) => (
                              <span key={e} className="badge bg-white text-primary-700 border border-primary-200">{e}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {selected.ai_duplicate_warning && (
                      <div className="mt-3 flex items-start gap-2 text-xs text-amber-800">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>Potential duplicate detected — 2 similar challenges found in this district. Consider merging into a cluster.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Priority factors */}
                <div className="rounded-lg bg-neutral-50 p-4 mb-4">
                  <span className="text-sm font-semibold text-neutral-900">Priority Score: {selected.priority_score}/100</span>
                  <div className="mt-2 space-y-1.5">
                    {Object.entries(selected.priority_breakdown || { overall: selected.priority_score }).map(([key, raw]) => {
                      const value = Math.max(0, Math.min(100, Number(raw) || 0));
                      const label = key.replace(/([A-Z])/g, ' $1').replaceAll('_', ' ').replace(/^./, (x) => x.toUpperCase());
                      return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500 w-36">{label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                          <AnimatedProgress value={value} className="h-full rounded-full bg-primary-500" />
                        </div>
                        <span className="text-xs font-medium text-neutral-700 w-8">{value}</span>
                      </div>
                      );
                    })}
                  </div>
                </div>

                {/* Validation history */}
                {selected.validation_comments && selected.validation_comments.length > 0 && (
                  <div className="mb-4">
                    <span className="text-sm font-semibold text-neutral-900">Validation History</span>
                    <div className="mt-2 space-y-2">
                      {selected.validation_comments.map((vc) => (
                        <div key={vc.id} className="rounded-lg border border-neutral-200 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-neutral-900">{vc.author_name}</span>
                            <span className="text-xs text-neutral-400">{formatDate(vc.created_at)}</span>
                          </div>
                          <span className="badge bg-neutral-100 text-neutral-600 mb-1.5">{vc.action.replace(/_/g, ' ')}</span>
                          <p className="text-sm text-neutral-600">{vc.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-neutral-100">
                  <button onClick={() => takeAction('OPEN_FOR_INSTITUTIONS')} className="btn-primary">
                    <CheckCircle2 size={16} /> Approve
                  </button>
                  <button onClick={() => takeAction('FIELD_VERIFICATION')} className="btn-secondary">
                    <ShieldCheck size={16} /> Field Verify
                  </button>
                  <button onClick={() => takeAction('NEEDS_INFORMATION')} className="btn-secondary">
                    <MessageSquare size={16} /> Request Info
                  </button>
                  <button onClick={() => takeAction('REJECTED')} className="btn-danger">
                    <XCircle size={16} /> Reject
                  </button>
                  <button onClick={() => takeAction('ESCALATED')} className="btn-secondary">
                    <AlertTriangle size={16} /> Escalate
                  </button>
                </div>
              </Card>

              {/* Comment box */}
              <Card className="p-4">
                <span className="text-sm font-semibold text-neutral-900 mb-2">Add Comment</span>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Add a validation comment..." className="input resize-none mb-2" />
                <button onClick={submitComment} className="btn-secondary text-sm">
                  <Send size={14} /> Post Comment
                </button>
              </Card>
            </div>
          ) : (
            <EmptyState icon={<FileText size={40} />} title="Select a challenge" description="Choose a challenge from the queue to review." />
          )}
        </div>
      </div>
    </div>
  );
}
