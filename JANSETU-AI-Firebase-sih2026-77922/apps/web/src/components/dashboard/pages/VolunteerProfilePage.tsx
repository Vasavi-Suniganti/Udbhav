import { useEffect, useMemo, useState } from 'react';
import { Award, Download, FileText, MapPin, ShieldCheck, Users } from 'lucide-react';
import { Card, LoadingState, MetricCard, SectionHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

type Props = { onNavigate: (route: string) => void };

export default function VolunteerProfilePage({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.volunteerDashboard().then(setData).catch((error) => setMsg((error as Error).message));
  }, []);

  const reports = Array.isArray(data?.reports) ? data.reports : [];
  const districts = useMemo<string[]>(() => Array.from(new Set<string>(reports.map((report: any) => String(report.district || '')).filter(Boolean))), [reports]);
  const domains = useMemo<Array<[string, number]>>(() => {
    const counts = new Map<string, number>();
    reports.forEach((report: any) => { const domain = report.domain || report.ai_domain; if (domain) counts.set(domain, (counts.get(domain) || 0) + 1); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [reports]);
  const initials = (profile?.full_name || 'Volunteer').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  async function exportData() {
    setExporting(true);
    try {
      const result = await api.accountExport();
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'udbhav-volunteer-profile.json';
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) { setMsg((error as Error).message); }
    finally { setExporting(false); }
  }

  if (!profile || !data) return <LoadingState label="Loading volunteer profile..." />;

  return <div className="civic-page max-w-6xl space-y-5">
    <SectionHeader title="Volunteer Profile" subtitle="Your community connector identity, field coverage, and UDBHAV contribution history." action={<button className="btn-secondary" onClick={() => onNavigate('/dashboard/volunteer/reports')}><FileText size={15} /> View My Reports</button>} />
    {msg && <div className="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700">{msg}</div>}

    <Card className="overflow-hidden">
      <div className="bg-primary-800 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-2xl font-bold">{initials}</div>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold" style={{ color: '#ffffff' }}>{profile.full_name}</h1><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Verified account</span></div><p className="mt-1 text-sm text-white/75">Community Volunteer · UDBHAV</p><p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">Connecting community observations to verified Government review and measurable solutions across Jharkhand.</p></div>
        </div>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-3"><div><div className="text-xs uppercase tracking-wide text-neutral-500">Email</div><div className="mt-1 text-sm font-medium text-primary-900 break-words">{profile.email || 'Not provided'}</div></div><div><div className="text-xs uppercase tracking-wide text-neutral-500">Phone</div><div className="mt-1 text-sm font-medium text-primary-900">{profile.phone || 'Not provided'}</div></div><div><div className="text-xs uppercase tracking-wide text-neutral-500">Primary coverage</div><div className="mt-1 text-sm font-medium text-primary-900">{profile.district || districts[0] || 'Jharkhand'}</div></div></div>
    </Card>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Citizens contacted" value={data.stats?.citizensContacted || 0} icon={<Users size={18} />} color="primary" /><MetricCard label="Problems collected" value={data.stats?.problemsCollected || 0} icon={<FileText size={18} />} color="secondary" /><MetricCard label="Verified reports" value={data.stats?.verified || 0} icon={<ShieldCheck size={18} />} color="success" /><MetricCard label="Communities covered" value={data.communities || 0} icon={<MapPin size={18} />} color="warning" /></section>

    <div className="grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
      <Card className="p-5"><SectionHeader title="Field coverage" subtitle="Areas represented in your submitted community reports." /><div className="mt-4 flex flex-wrap gap-2">{districts.length ? districts.map((district) => <span key={district} className="badge bg-primary-50 text-primary-700"><MapPin size={12} /> {district}</span>) : <p className="text-sm text-neutral-500">Coverage will appear after your first report.</p>}</div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-primary-50/60 p-4"><div className="text-xs text-neutral-500">Reports awaiting review</div><div className="mt-1 text-2xl font-bold text-primary-900">{data.needsVerification?.length || 0}</div></div><div className="rounded-xl bg-success-50 p-4"><div className="text-xs text-neutral-500">Verified contribution rate</div><div className="mt-1 text-2xl font-bold text-success-700">{reports.length ? Math.round(((data.stats?.verified || 0) / reports.length) * 100) : 0}%</div></div></div></Card>
      <Card className="p-5"><SectionHeader title="Community focus" subtitle="Most common domains in your reports." /><div className="mt-4 space-y-3">{domains.length ? domains.slice(0, 5).map(([domain, count]) => <div key={domain}><div className="flex justify-between text-sm"><span className="font-medium text-primary-900">{domain}</span><span className="text-neutral-500">{count} report{count === 1 ? '' : 's'}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-secondary-600" style={{ width: `${Math.max(8, Math.round((count / reports.length) * 100))}%` }} /></div></div>) : <p className="text-sm text-neutral-500">Focus areas will appear after reports are submitted.</p>}</div></Card>
    </div>

    <Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-primary-900">Account & privacy</h2><p className="mt-1 text-sm text-neutral-500">Export your volunteer activity without changing your workflow permissions.</p></div><button className="btn-secondary" onClick={exportData} disabled={exporting}><Download size={15} /> {exporting ? 'Preparing...' : 'Export profile data'}</button></div></Card>
  </div>;
}
