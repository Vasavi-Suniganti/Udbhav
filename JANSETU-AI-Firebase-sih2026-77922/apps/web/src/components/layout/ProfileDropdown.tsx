import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useContext, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { mainRoleFor } from '@/types';
import { DashboardMotionContext } from '@/components/ui/motion';

const roleLabels: Record<string, string> = {
  CITIZEN: 'Citizen', VOLUNTEER: 'Volunteer', STUDENT: 'Student', FACULTY: 'Faculty Mentor', UNIVERSITY_ADMIN: 'University',
  INDUSTRY_PARTNER: 'Industry Partner', STARTUP: 'Industry Partner', MSME: 'Industry Partner', CSR_PARTNER: 'CSR Partner', RESEARCH_LAB: 'Research Partner', MENTOR: 'Industry Mentor',
  PANCHAYAT_OFFICER: 'Government', ULB_OFFICER: 'Government', DISTRICT_OFFICER: 'Government', GOVERNMENT_OFFICER: 'Government', DEPARTMENT_ADMIN: 'Government', PROJECT_OFFICER: 'Government', FINANCE_OFFICER: 'Government', ANALYTICS_OFFICER: 'Government', PLATFORM_ADMIN: 'Platform Admin', SUPER_ADMIN: 'Platform Admin',
};

export default function ProfileDropdown({ onNavigate }: { onNavigate: (route: string) => void }) {
  const { profile, signOut } = useAuth();
  const motionEnabled = useContext(DashboardMotionContext);
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const name = (profile?.full_name || profile?.email?.split('@')[0] || 'UDBHAV User').trim();
  const role = roleLabels[profile?.role || 'CITIZEN'] || mainRoleFor(profile?.role || 'CITIZEN');
  const initial = name.charAt(0).toUpperCase();

  async function logout() {
    await signOut();
    onNavigate('/');
  }

  return <div className="relative">
    <button type="button" className="topbar-profile-control" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label="Open profile menu">
      <span className="civic-topbar-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initial}</span><span className="topbar-profile-copy"><b>{name}</b><small>{role}</small></span><ChevronDown size={14} />
    </button>
    <AnimatePresence>
      {open && <motion.div
        className="topbar-popover topbar-profile-menu"
        initial={motionEnabled ? { opacity: 0, y: reduceMotion ? 0 : -6, scale: reduceMotion ? 1 : 0.98 } : false}
        animate={motionEnabled ? { opacity: 1, y: 0, scale: 1 } : undefined}
        exit={motionEnabled ? { opacity: 0, y: reduceMotion ? 0 : -4, scale: reduceMotion ? 1 : 0.99 } : undefined}
        transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: 'easeOut' }}
      >
        <div className="topbar-profile-summary"><span className="civic-topbar-avatar">{initial}</span><div><b>{name}</b><small>{profile?.email || role}</small></div></div><button type="button" className="topbar-menu-item" onClick={() => { onNavigate('/dashboard/profile'); setOpen(false); }}><UserRound size={15} /> My Profile</button><button type="button" className="topbar-menu-item is-danger" onClick={() => void logout()}><LogOut size={15} /> Logout</button>
      </motion.div>}
    </AnimatePresence>
  </div>;
}
