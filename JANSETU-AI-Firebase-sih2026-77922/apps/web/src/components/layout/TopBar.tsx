import { Menu, Search, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { mainRoleFor } from '@/types';
import NotificationDropdown from './NotificationDropdown';
import LanguageSelector from './LanguageSelector';
import ProfileDropdown from './ProfileDropdown';

const searchPlaceholders: Record<string, string> = {
  CITIZEN: 'Search problems, locations, projects or keywords...',
  GOVERNMENT: 'Search citizens, challenges, mentors or projects...',
  ACADEMIC: 'Search challenges, projects or expertise...',
  PARTNER: 'Search challenges, projects or expertise...',
  VOLUNTEER: 'Search problems, locations or assignments...',
};

export default function TopBar({ pageTitle, onNavigate, onSearch, sidebarOpen, onToggleSidebar }: { pageTitle?: string; onNavigate: (route: string) => void; onSearch: () => void; sidebarOpen: boolean; onToggleSidebar: () => void }) {
  const { profile } = useAuth();
  const role = profile?.role === 'VOLUNTEER' ? 'VOLUNTEER' : mainRoleFor(profile?.role || 'CITIZEN');
  const displayName = (profile?.full_name || 'UDBHAV User').trim();
  return <header className="civic-topbar sticky top-0 z-20 flex items-center px-3 sm:px-5 gap-3">
    <button type="button" onClick={onToggleSidebar} className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-primary-50" aria-label="Toggle navigation">{sidebarOpen ? <X size={20} /> : <Menu size={20} />}</button>
    <div className="topbar-user-name" aria-label={`Current page: ${pageTitle || 'UDBHAV'}`}><span className="text-neutral-400">UDBHAV</span><span className="mx-1 text-neutral-300">/</span>{pageTitle || 'UDBHAV'}</div>
    <button type="button" onClick={onSearch} className="civic-search topbar-search flex-1 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm" aria-label="Open search"><Search size={15} /><span className="truncate text-left">{searchPlaceholders[role]}</span></button>
    <div className="topbar-actions"><NotificationDropdown onNavigate={onNavigate} /><LanguageSelector /><ProfileDropdown onNavigate={onNavigate} /></div>
  </header>;
}
