import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Circle, FileText, Pencil } from 'lucide-react';

export type StepStatus = 'completed' | 'active' | 'pending' | 'error';

export interface Step {
  title: string;
  description: string;
  status: StepStatus;
}

export interface ProposalTrackerCardProps {
  imageUrl: string;
  imageAlt: string;
  status: string;
  title: string;
  priority: string;
  steps: Step[];
  onViewIssue: () => void;
}

const statusStyles: Record<StepStatus, { icon: typeof CheckCircle2; iconClass: string; lineClass: string }> = {
  completed: { icon: CheckCircle2, iconClass: 'text-[#245C4A] bg-[#E4F0E8]', lineClass: 'bg-[#2A9D8F]' },
  active: { icon: Pencil, iconClass: 'text-[#176E66] bg-[#D8F0EA]', lineClass: 'bg-[#8FAFC1]' },
  pending: { icon: Circle, iconClass: 'text-[#6B8794] bg-[#E6EEF1]', lineClass: 'bg-[#D9E2E4]' },
  error: { icon: AlertCircle, iconClass: 'text-[#9A604C] bg-[#F2DED3]', lineClass: 'bg-[#D9B2A1]' },
};

export function ProposalTrackerCard({ imageUrl, imageAlt, status, title, priority, steps, onViewIssue }: ProposalTrackerCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="w-full max-w-sm overflow-hidden rounded-xl border border-[#D9D0C2] bg-[#FBF7EF] shadow-soft"
    >
      <div className="relative h-40 overflow-hidden bg-[#E8DCC8]">
        <img src={imageUrl} alt={imageAlt} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#245C4A]/55 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-full border border-[#F4EBDD]/70 bg-[#F4EBDD]/90 px-3 py-1 text-[11px] font-bold text-[#245C4A]">
          {status}
        </span>
      </div>

      <div className="p-5">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B7D78]">
              <FileText size={13} /> Civic Issue Progress
            </p>
            <h3 className="break-words text-lg font-extrabold leading-tight text-[#245C4A]">{title}</h3>
          </div>
          <span className="shrink-0 rounded-lg border border-[#C9B8E8]/70 bg-[#EDE7F5] px-2.5 py-1 text-[10px] font-bold text-[#5E4D82]">
            Priority: {priority}
          </span>
        </div>

        <div className="space-y-0">
          {steps.map((step, index) => {
            const config = statusStyles[step.status];
            const Icon = config.icon;
            return (
              <motion.div
                key={`${step.title}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08, duration: 0.3 }}
                className="relative flex gap-3"
              >
                <div className="relative z-10 flex flex-col items-center">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ${config.iconClass}`}>
                    <Icon size={15} strokeWidth={2.2} />
                  </span>
                  {index < steps.length - 1 && <span className={`my-1 h-8 w-0.5 ${config.lineClass}`} />}
                </div>
                <div className="min-w-0 pb-4 pt-1">
                  <p className={`text-xs font-bold ${step.status === 'active' ? 'text-[#176E66]' : 'text-[#245C4A]'}`}>{step.title}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-[#6B716D]">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.button
          type="button"
          onClick={onViewIssue}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#245C4A] px-4 py-2.5 text-xs font-bold text-[#F4EBDD] transition-colors hover:bg-[#2A9D8F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A9D8F] focus-visible:ring-offset-2"
          aria-label={`View full report for ${title}`}
        >
          View Full Report <FileText size={14} />
        </motion.button>
      </div>
    </motion.article>
  );
}
