import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  FileText,
  Heart,
  MapPin,
  MessageSquare,
  Mic,
  MicOff,
  Plus,
  ShieldCheck,
  ThumbsUp,
  Upload,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { uploadEvidence } from '@/lib/firebase';
import { calculatePriority, priorityFromScore, PRIORITY_CONFIG } from '@/lib/constants';
import { Card, EmptyState, LoadingState, MetricCard, SectionHeader } from '@/components/ui';
import type { Evidence } from '@jansetu/shared';

const JHARKHAND_CENTER = { lat: 23.3441, lng: 85.3096 };

type ProblemFilters = { area: string; dateFrom: string; dateTo: string; risk: string };
const EMPTY_PROBLEM_FILTERS: ProblemFilters = { area: '', dateFrom: '', dateTo: '', risk: 'ALL' };

function filterProblemRows(rows: any[], filters: ProblemFilters) {
  const area = filters.area.trim().toLowerCase();
  return rows.filter((row) => {
    const location = [row.district, row.block, row.village, row.address].filter(Boolean).join(' ').toLowerCase();
    const registeredDate = String(row.created_at || row.createdAt || '').slice(0, 10);
    const score = Number(row.priority_score ?? row.priorityScore ?? row.priority?.total ?? 0);
    const risk = String(row.priority_level || row.priorityLevel || priorityFromScore(score)).toUpperCase();
    return (!area || location.includes(area)) && (!filters.dateFrom || registeredDate >= filters.dateFrom) && (!filters.dateTo || registeredDate <= filters.dateTo) && (filters.risk === 'ALL' || risk === filters.risk);
  });
}

function ProblemFiltersBar({ value, onChange, resultCount }: { value: ProblemFilters; onChange: (value: ProblemFilters) => void; resultCount: number }) {
  const update = (key: keyof ProblemFilters, next: string) => onChange({ ...value, [key]: next });
  return <Card className="p-4"><div className="flex flex-wrap items-end gap-3"><div className="min-w-[220px] flex-1"><label className="label">Area</label><input className="input" value={value.area} onChange={(event) => update('area', event.target.value)} placeholder="District, block, village or address" /></div><div><label className="label">Registered from</label><input className="input" type="date" value={value.dateFrom} onChange={(event) => update('dateFrom', event.target.value)} /></div><div><label className="label">Registered to</label><input className="input" type="date" value={value.dateTo} onChange={(event) => update('dateTo', event.target.value)} /></div><div><label className="label">Risk level</label><select className="input" value={value.risk} onChange={(event) => update('risk', event.target.value)}><option value="ALL">All risk levels</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></div><button type="button" className="btn-secondary" onClick={() => onChange(EMPTY_PROBLEM_FILTERS)}>Clear filters</button></div><p className="mt-2 text-xs text-neutral-500">Showing {resultCount} matching problem{resultCount === 1 ? '' : 's'}.</p></Card>;
}

async function reverseGeocode(lat: number, lng: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return null;
    const data = await res.json();
    const address = data?.address || {};
    const district = address.state_district || address.county || address.state || 'Ranchi';
    const block = address.city_district || address.suburb || address.municipality || address.county || '';
    const village = address.village || address.hamlet || address.town || address.city || address.locality || '';
    const fullAddress = [address.house_number, address.road, address.suburb, address.village, address.city, address.state]
      .filter(Boolean)
      .join(', ') || data?.display_name || 'Selected location';
    return { district, block, village, address: fullAddress };
  } catch {
    return null;
  }
}

function VolunteerLocationMap({ value, onSelect }: {
  value: { latitude?: number; longitude?: number; district: string; block: string; village: string; address: string };
  onSelect: (lat: number, lng: number) => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: true,
      preferCanvas: true,
      dragging: true,
    }).setView([JHARKHAND_CENTER.lat, JHARKHAND_CENTER.lng], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const marker = L.circleMarker([JHARKHAND_CENTER.lat, JHARKHAND_CENTER.lng], {
      radius: 10,
      color: '#2a5f48',
      fillColor: '#2a5f48',
      fillOpacity: 0.9,
      weight: 2,
    }).addTo(map);

    markerRef.current = marker;
    map.on('click', (event: L.LeafletMouseEvent) => {
      onSelectRef.current(event.latlng.lat, event.latlng.lng);
    });
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || value.latitude == null || value.longitude == null) return;
    const target = L.latLng(value.latitude, value.longitude);
    if (markerRef.current) markerRef.current.setLatLng(target);
    const currentZoom = mapInstance.current.getZoom();
    const nextZoom = currentZoom < 12 ? 12 : currentZoom;
    mapInstance.current.setView(target, nextZoom);
  }, [value.latitude, value.longitude]);

  const selectedAddress = value.address || value.village || value.block || value.district || 'No location selected';

  return (
    <div className="space-y-3">
      <div ref={mapRef} className="h-[380px] w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 sm:h-[420px]" />
      <div className="rounded-xl border border-neutral-200 bg-primary-50/40 p-3 text-sm text-neutral-700">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-primary-900">Selected Location</span>
          <span className={value.latitude != null && value.longitude != null ? 'text-success-700' : 'text-neutral-500'}>
            {value.latitude != null && value.longitude != null ? '✓ Location selected' : 'No location selected'}
          </span>
        </div>
        <div className="mt-2 space-y-1 text-xs text-neutral-600">
          <div>Latitude: {value.latitude?.toFixed(6) ?? '—'}</div>
          <div>Longitude: {value.longitude?.toFixed(6) ?? '—'}</div>
          <div>Address: {selectedAddress || 'Click on the map or use Capture GPS.'}</div>
          <div>District: {value.district || '—'}</div>
          <div>Village: {value.village || '—'}</div>
        </div>
      </div>
    </div>
  );
}

export function CommunityPage() {
  const evidenceInput = useRef<HTMLInputElement | null>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [community, setCommunity] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [comment, setComment] = useState('');
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');
  const [msg, setMsg] = useState('');
  const [filters, setFilters] = useState<ProblemFilters>(EMPTY_PROBLEM_FILTERS);

  async function load() {
    try {
      const [c, p, u, b] = await Promise.all([
        api.challenges(),
        api.projects().catch(() => []),
        api.universities().catch(() => []),
        api.citizenBadges().catch(() => []),
      ]);
      setChallenges(c);
      const requestedId = new URLSearchParams(window.location.hash.split('?')[1] || '').get('challenge');
      if (requestedId) {
        const requested = c.find((challenge: any) => challenge.id === requestedId);
        if (requested) setSelected(requested);
      }
      setProjects(p);
      setUniversities(u);
      setBadges(b);
      if (selected) {
        setCommunity(await api.community(selected.id));
        const fresh = c.find((x: any) => x.id === selected.id);
        if (fresh) setSelected(fresh);
      }
    } catch (error) {
      setMsg((error as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selected) {
      api.community(selected.id).then(setCommunity).catch((error) => setMsg((error as Error).message));
    }
  }, [selected?.id]);

  async function signal(type: 'SUPPORT' | 'AFFECTED' | 'INCORRECT_REPORT') {
    try {
      const note = type === 'INCORRECT_REPORT' ? prompt('What information appears incorrect?') || '' : '';
      if (type === 'INCORRECT_REPORT' && !note) return;

      setMsg('');
      setCommunity((prev: any) => {
        if (!prev) return prev;
        const mySignals = prev.mySignals || [];
        const alreadyMarked = mySignals.some((signal: any) => signal.type === type);
        if (alreadyMarked) return prev;

        return {
          ...prev,
          mySignals: [...mySignals, { id: `optimistic-${Date.now()}`, type, note, userId: 'local-user' }],
          supporters: type === 'SUPPORT' ? (prev.supporters || 0) + 1 : prev.supporters,
          affectedConfirmations: type === 'AFFECTED' ? (prev.affectedConfirmations || 0) + 1 : prev.affectedConfirmations,
          incorrectReports: type === 'INCORRECT_REPORT' ? (prev.incorrectReports || 0) + 1 : prev.incorrectReports,
        };
      });

      await api.communitySignal(selected.id, { type, note, evidence: type === 'INCORRECT_REPORT' ? evidence : [] });
      setCommunity(await api.community(selected.id));
      setEvidence([]);
      setBadges(await api.citizenBadges());
    } catch (error) {
      setMsg((error as Error).message);
    }
  }

  async function remove(type: string) {
    setMsg('');
    setCommunity((prev: any) => {
      if (!prev) return prev;
      const mySignals = prev.mySignals || [];
      const exists = mySignals.some((signal: any) => signal.type === type);
      if (!exists) return prev;

      return {
        ...prev,
        mySignals: mySignals.filter((signal: any) => signal.type !== type),
        supporters: type === 'SUPPORT' ? Math.max(0, (prev.supporters || 0) - 1) : prev.supporters,
        affectedConfirmations: type === 'AFFECTED' ? Math.max(0, (prev.affectedConfirmations || 0) - 1) : prev.affectedConfirmations,
        incorrectReports: type === 'INCORRECT_REPORT' ? Math.max(0, (prev.incorrectReports || 0) - 1) : prev.incorrectReports,
      };
    });

    await api.removeCommunitySignal(selected.id, type);
    setCommunity(await api.community(selected.id));
  }

  async function post() {
    if (!comment.trim()) return;

    const nextComment = {
      id: `comment-${Date.now()}`,
      authorName: 'You',
      authorRole: 'CITIZEN',
      comment: comment.trim(),
      evidence,
    };

    setCommunity((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        commentCount: (prev.commentCount || 0) + 1,
        comments: [nextComment, ...(prev.comments || [])],
      };
    });

    await api.communityComment(selected.id, { comment, evidence });
    setComment('');
    setEvidence([]);
    setCommunity(await api.community(selected.id));
    setBadges(await api.citizenBadges());
  }

  async function files(list: FileList | null) {
    if (!list?.length) return;
    const availableSlots = Math.max(0, 4 - evidence.length);
    if (!availableSlots) {
      setEvidenceError('You can attach up to 4 evidence files.');
      return;
    }
    setEvidenceError('');
    setUploadingEvidence(true);
    try {
      for (const file of Array.from(list).slice(0, availableSlots)) {
        const uploaded = await uploadEvidence(file, 'challenge-evidence');
        setEvidence((current) => [...current, uploaded]);
      }
    } catch (error) {
      setEvidenceError((error as Error).message || 'Unable to upload evidence. Please try again.');
    } finally {
      setUploadingEvidence(false);
      if (evidenceInput.current) evidenceInput.current.value = '';
    }
  }

  const myTypes = new Set((community?.mySignals || []).map((x: any) => x.type));
  const mySupport = myTypes.has('SUPPORT');
  const project = selected ? projects.find((p: any) => p.challengeId === selected.id) : undefined;
  const university = project ? universities.find((u: any) => u.id === project.universityId) : undefined;
  const visibleChallenges = filterProblemRows(challenges, filters);

  if (selected) {
    return (
      <div className="civic-page space-y-5">
        <button className="btn-secondary" onClick={() => { setSelected(null); setCommunity(null); }}>
          ← Back to Community
        </button>
        {msg && <p className="text-sm text-error-600">{msg}</p>}
        <div className="grid lg:grid-cols-[2fr,1fr] gap-5">
          <div className="space-y-5">
            <Card className="p-6">
              <div className="flex flex-wrap gap-2">
                <span className="badge bg-primary-50 text-primary-700">{selected.domain}</span>
                <span className="badge bg-neutral-100 text-neutral-700">{selected.status.replaceAll('_', ' ')}</span>
              </div>
              <h1 className="text-2xl font-bold mt-3">{selected.title}</h1>
              <p className="text-neutral-600 mt-2">{selected.description}</p>
              <p className="text-sm text-neutral-500 mt-3 flex items-center gap-1">
                <MapPin size={15} />
                {selected.district}{selected.village ? ` · ${selected.village}` : ''} · {selected.affectedPeople?.toLocaleString()} people affected
              </p>
              <div className="grid sm:grid-cols-4 gap-3 mt-5">
                <MetricCard label="Priority Score" value={community?.communityPriority ?? selected.priority_score ?? selected.priority?.total ?? 0} suffix="/100" icon={<AlertTriangle size={18} />} color="warning" />
                <MetricCard label="Supporters" value={community?.supporters || 0} icon={<ThumbsUp size={18} />} color="primary" />
                <MetricCard label="Also affected" value={community?.affectedConfirmations || 0} icon={<Users size={18} />} color="secondary" />
                <MetricCard label="Comments" value={community?.commentCount || 0} icon={<MessageSquare size={18} />} color="accent" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span className={`badge ${PRIORITY_CONFIG[community?.priorityLevel || selected.priority_level]?.bg || 'bg-neutral-100'} ${PRIORITY_CONFIG[community?.priorityLevel || selected.priority_level]?.color || 'text-neutral-700'}`}>Priority: {community?.priorityLevel || selected.priority_level || 'LOW'}</span><span className="text-neutral-500">Government: {selected.status === 'VERIFIED' || selected.status === 'ASSIGNED' ? '✓ Verified' : selected.status === 'REJECTED' ? '✕ Rejected' : '⏳ Pending'}</span><span className="text-neutral-500">Assignment: {selected.assignment?.destination || 'Awaiting Government Assignment'}</span></div>
              <div className="flex flex-wrap gap-2 mt-5">
                <button className={mySupport ? 'btn-primary' : 'btn-secondary'} onClick={() => mySupport ? remove('SUPPORT') : signal('SUPPORT')}>
                  <ThumbsUp size={16} /> {mySupport ? 'Remove support' : 'Support this issue'}
                </button>
                <button className={myTypes.has('AFFECTED') ? 'btn-primary' : 'btn-secondary'} onClick={() => myTypes.has('AFFECTED') ? remove('AFFECTED') : signal('AFFECTED')}>
                  <Heart size={16} /> {myTypes.has('AFFECTED') ? 'Remove affected confirmation' : 'I am also affected'}
                </button>
                <button className="btn-secondary" onClick={() => signal('INCORRECT_REPORT')}>
                  <ShieldCheck size={16} /> Report incorrect information
                </button>
              </div>
            </Card>
            <Journey challenge={selected} project={project} university={university} />
            <Card className="p-5">
              <SectionHeader title="Community discussion" subtitle="Add local context, confirm impact and attach supporting evidence." />
              <textarea className="input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share what you observed…" />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="btn-secondary" onClick={() => evidenceInput.current?.click()} disabled={uploadingEvidence || evidence.length >= 4}>
                  <Upload size={15} /> {uploadingEvidence ? 'Uploading…' : 'Add evidence'}
                </button>
                <input ref={evidenceInput} type="file" hidden multiple accept="image/*,video/*,audio/*,.pdf" onChange={(e) => void files(e.target.files)} />
                <button type="button" className="btn-primary" onClick={post} disabled={uploadingEvidence}>Post comment</button>
              </div>
              {evidenceError && <p className="text-xs text-error-600 mt-2" role="alert">{evidenceError}</p>}
              {uploadingEvidence && <p className="text-xs text-primary-600 mt-2" role="status">Uploading selected evidence…</p>}
              {evidence.length > 0 && <p className="text-xs text-neutral-500 mt-2">{evidence.map((x) => x.name).join(', ')}</p>}
              <div className="space-y-3 mt-5">
                {(community?.comments || []).map((x: any) => (
                  <div key={x.id} className="rounded-lg border p-3">
                    <div className="flex justify-between">
                      <b className="text-sm">{x.authorName}</b>
                      <span className="text-xs text-neutral-400">{x.authorRole?.replaceAll('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-neutral-600 mt-1">{x.comment}</p>
                    {x.evidence?.length > 0 && <p className="text-xs text-primary-600 mt-2">{x.evidence.length} evidence file(s)</p>}
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <aside className="space-y-4">
            <Card className="p-5">
              <h3 className="font-semibold">Your civic badges</h3>
              <div className="space-y-2 mt-3">
                {badges.length ? badges.map((badge: any) => (
                  <div key={badge.id} className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                    <div className="flex gap-2 items-center">
                      <Award size={18} className="text-amber-600" />
                      <b className="text-sm">{badge.label}</b>
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">{badge.reason}</p>
                  </div>
                )) : (
                  <p className="text-sm text-neutral-400">Participate in verified civic activity to earn badges.</p>
                )}
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold">Community evidence</h3>
              <p className="text-sm text-neutral-600 mt-2">{community?.evidenceCount || 0} supporting evidence item(s)</p>
              <p className="text-sm text-neutral-600">{community?.incorrectReports || 0} accuracy report(s) awaiting review</p>
            </Card>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="civic-page">
      <SectionHeader title="Community Problem Discovery" subtitle="Discover, support and validate societal challenges reported by communities." />
      {msg && <p className="text-sm text-error-600 mb-3">{msg}</p>}
      <ProblemFiltersBar value={filters} onChange={setFilters} resultCount={visibleChallenges.length} />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...visibleChallenges].sort((a, b) => Number(b.priority_score ?? b.priority?.total ?? 0) - Number(a.priority_score ?? a.priority?.total ?? 0))
          .filter((c) => ['VALIDATED', 'OPEN_FOR_INSTITUTIONS', 'ASSIGNED'].includes(c.status) || c.reporterId)
          .map((c) => (
            <button key={c.id} onClick={() => setSelected(c)} className="card-hover text-left p-5">
              <div className="flex justify-between">
                <span className="badge bg-primary-50 text-primary-700">{c.domain}</span>
                <span className={`badge ${PRIORITY_CONFIG[c.priority_level]?.bg || 'bg-neutral-100'} ${PRIORITY_CONFIG[c.priority_level]?.color || 'text-neutral-700'}`}>{c.priority_level || 'LOW'} · {c.priority_score ?? c.priority?.total ?? 0}/100</span>
              </div>
              <h3 className="font-semibold mt-3">{c.title}</h3>
              <p className="text-sm text-neutral-500 mt-2 line-clamp-2">{c.description}</p>
              <p className="text-xs text-neutral-400 mt-3">{c.district} · {c.status.replaceAll('_', ' ')}</p>
            </button>
          ))}
      </div>
      {!visibleChallenges.length && (
        <EmptyState icon={<Users size={40} />} title="No matching community challenges" description="Try clearing or changing the filters." />
      )}
    </div>
  );
}

function Journey({ challenge, project, university }: { challenge: any; project: any; university: any }) {
  const verified = challenge.status === 'VERIFIED' || challenge.status === 'ASSIGNED';
  const assigned = challenge.assignment?.destination;
  const steps = [
    ['Reported', true],
    ['AI Analysis', true],
    ['Government Verification', verified],
    ['Government Assignment', Boolean(assigned)],
    [assigned ? `${assigned === 'BOTH' ? 'University + Industry / Startup' : assigned === 'UNIVERSITY' ? 'University' : 'Industry / Startup'} Review` : 'Institution Review', Boolean(assigned)],
    ['Team Formation', Boolean(project)],
    ['Industry Mentor', Boolean(project?.status && ['APPROVED', 'FUNDED', 'PROTOTYPING', 'LAB_TESTING', 'FIELD_TESTING', 'PILOT', 'COMMUNITY_VALIDATION', 'DEPLOYMENT_READY', 'DEPLOYED', 'SCALING', 'COMPLETED'].includes(project.status))],
    ['Prototype', Boolean(project?.irl >= 4)],
    ['Field Testing', Boolean(project?.irl >= 6)],
    ['Deployment', Boolean(project?.irl >= 8)],
    ['Resolved', Boolean(project?.irl >= 9 || project?.status === 'COMPLETED')],
  ];

  return (
    <Card className="p-5">
      <SectionHeader title="Problem → Solution Journey" subtitle={university ? `Assigned to ${university.name}` : 'Follow every public stage without exposing private team data.'} />
      <div className="space-y-2">
        {steps.map(([label, done]: any) => (
          <div key={label} className="flex gap-3 items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${done ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-neutral-400'}`}>
              {done ? <CheckCircle2 size={15} /> : <span className="text-xs">•</span>}
            </div>
            <span className={done ? 'font-medium text-sm' : 'text-sm text-neutral-400'}>{label}</span>
          </div>
        ))}
      </div>
      {project && (
        <p className="mt-4 text-sm text-neutral-600">
          Project: <b>{project.title}</b> · IRL {project.irl}/9 · {project.status.replaceAll('_', ' ')}
        </p>
      )}
    </Card>
  );
}

export function VolunteerDashboard() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportFilters, setReportFilters] = useState<ProblemFilters>(EMPTY_PROBLEM_FILTERS);
  const [gpsState, setGpsState] = useState<'idle' | 'locating' | 'success' | 'error'>('idle');
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const { profile } = useAuth();

  const route = window.location.hash.slice(1) || '/dashboard';
  const isOverview = route === '/dashboard' || route === '/dashboard/volunteer';
  const isReportRoute = route === '/dashboard/volunteer/report';
  const isReportsRoute = route === '/dashboard/volunteer/reports';
  const volunteerName = profile?.full_name?.split(' ')[0] || 'Volunteer';

  const heroMetrics = [
    { label: 'Problems Collected', value: data?.stats?.problemsCollected ?? data?.reports?.length ?? 0, color: 'primary' },
    { label: 'Under Verification', value: data?.needsVerification?.length ?? 0, color: 'warning' },
    { label: 'Communities Covered', value: data?.communities ?? 0, color: 'secondary' },
    { label: 'Verified Reports', value: data?.stats?.verified ?? data?.verified ?? 0, color: 'success' },
  ];

  const recentReports = Array.isArray(data?.reports) ? data.reports.slice(0, 3) : [];
  const reportRows = Array.isArray(data?.reports) ? data.reports : [];
  const priorityRows = reportRows.slice().sort((a: any, b: any) => Number(b.communityPriority ?? b.priority_score ?? b.priority?.total ?? 0) - Number(a.communityPriority ?? a.priority_score ?? a.priority?.total ?? 0)).slice(0, 3);
  const domainCounts = reportRows.reduce((counts: Record<string, number>, report: any) => { const domain = report.domain || report.ai_domain || 'Other'; counts[domain] = (counts[domain] || 0) + 1; return counts; }, {});
  const topDomain = (Object.entries(domainCounts) as Array<[string, number]>).sort(([, a], [, b]) => b - a)[0]?.[0] || 'No domain yet';
  const topReport = priorityRows[0];
  const averagePriority = reportRows.length ? Math.round(reportRows.reduce((total: number, report: any) => total + Number(report.priority_score ?? report.priority?.total ?? 0), 0) / reportRows.length) : 0;
  const severityCounts = reportRows.reduce((counts: Record<string, number>, report: any) => { const severity = report.severity || report.priority_level || 'LOW'; counts[severity] = (counts[severity] || 0) + 1; return counts; }, {});
  const visibleReports = filterProblemRows(Array.isArray(data?.reports) ? data.reports : [], reportFilters);

  const [v, setV] = useState({
    description: '',
    district: 'Ranchi',
    block: '',
    village: '',
    address: '',
    affectedPeople: undefined as number | undefined,
    severity: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    duration: 'Unknown',
    seasonal: false,
    safetyConcern: false,
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    citizenName: '',
    citizenContact: '',
    consent: false,
    notes: '',
    communityRepresentatives: '',
  });

  const load = async () => {
    try {
      const next = await api.volunteerDashboard();
      setData(next);
    } catch (error) {
      setMsg((error as Error).message);
    }
  };

  const openReport = async (report: any) => {
    setSelectedReport(report);
    try {
      const latest = await api.volunteerReportById(report.id);
      setSelectedReport(latest);
    } catch (error) {
      setMsg((error as Error).message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const applyLocationSelection = async (latitude: number, longitude: number) => {
    setV((current) => ({ ...current, latitude, longitude }));

    try {
      const geo = await reverseGeocode(latitude, longitude);
      if (!geo) {
        setMsg('Coordinates captured. Please enter the address manually.');
        return;
      }

      setV((current) => ({
        ...current,
        latitude,
        longitude,
        district: geo.district || current.district || 'Ranchi',
        block: geo.block || current.block || '',
        village: geo.village || current.village || '',
        address: geo.address || current.address || '',
      }));
      setMsg('');
    } catch {
      setV((current) => ({ ...current, latitude, longitude }));
      setMsg('Coordinates captured. Please enter the address manually.');
    }
  };

  async function locate() {
    if (!navigator.geolocation) {
      setGpsState('error');
      setMsg('GPS is not supported by this browser. Please select a location manually.');
      return;
    }
    if (gpsState === 'locating') return;

    setGpsState('locating');
    setMsg('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await applyLocationSelection(position.coords.latitude, position.coords.longitude);
        setGpsState('success');
        setMsg('✓ GPS location captured');
      },
      (error) => {
        setGpsState('error');
        const messages: Record<number, string> = {
          1: 'Location permission was denied. You can select the location manually on the map.',
          2: 'Unable to determine your location. Please select a location manually.',
          3: 'Location request timed out. Please try again or select a location manually.',
        };
        setMsg(messages[error.code] || 'Unable to determine your location. Please select a location manually.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  const handleMapSelection = async (latitude: number, longitude: number) => {
    setGpsState('idle');
    setMsg('');
    await applyLocationSelection(latitude, longitude);
  };

  async function addFiles(list: FileList | null) {
    if (!list) return;
    setBusy(true);
    try {
      const out: Evidence[] = [];
      for (const file of Array.from(list).slice(0, 6)) {
        out.push(await uploadEvidence(file, 'challenge-evidence'));
      }
      setEvidence((current) => [...current, ...out]);
    } catch (error) {
      setMsg((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleVoice() {
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];

      r.ondataavailable = (event) => {
        chunks.current.push(event.data);
      };

      r.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64 = String(reader.result).split(',')[1] || '';
            const result = await api.transcribe(base64, blob.type, 'volunteer-report.webm');
            setV((current) => ({
              ...current,
              description: [current.description, result.text].filter(Boolean).join(' '),
            }));
          } catch (error) {
            setMsg((error as Error).message);
          }
        };
        reader.readAsDataURL(blob);
      };

      r.start();
      recorder.current = r;
      setRecording(true);
    } catch (error) {
      setMsg((error as Error).message);
    }
  }

  async function submit() {
    if (v.description.trim().length < 20) {
      setMsg('Describe the problem in at least 20 characters.');
      return;
    }
    if (v.latitude == null || v.longitude == null) {
      setMsg('Please select a location on the map or capture GPS before submitting the report.');
      return;
    }

    setBusy(true);
    setMsg('');

    try {
      await api.volunteerReport({
        ...v,
        title: `Volunteer field report: ${v.description.trim().slice(0, 60)}`,
        evidence,
        communityRepresentatives: v.communityRepresentatives
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      });

      setMsg('Report submitted successfully. Your community problem is now visible in My Reports.');
      setV({
        description: '',
        district: 'Ranchi',
        block: '',
        village: '',
        address: '',
        affectedPeople: undefined,
        severity: 'MEDIUM',
        duration: 'Unknown',
        seasonal: false,
        safetyConcern: false,
        latitude: undefined,
        longitude: undefined,
        citizenName: '',
        citizenContact: '',
        consent: false,
        notes: '',
        communityRepresentatives: '',
      });
      setEvidence([]);
      await load();
      window.location.hash = '/dashboard/volunteer/reports';
    } catch (error) {
      setMsg((error as Error).message || 'Unable to submit the report. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <LoadingState label="Loading volunteer field dashboard…" />;

  if (isReportsRoute) {
    return (
      <div className="civic-page space-y-5">
        <SectionHeader title="My Reports" subtitle="Track the reports you have submitted and their current status." />
        {msg && <div className="rounded-lg border p-3 text-sm">{msg}</div>}
        <ProblemFiltersBar value={reportFilters} onChange={setReportFilters} resultCount={visibleReports.length} />
        <div className="grid sm:grid-cols-3 gap-4">
          <MetricCard label="Reports submitted" value={data?.stats?.problemsCollected ?? data?.reports?.length ?? 0} icon={<FileText size={18} />} color="primary" />
          <MetricCard label="Awaiting review" value={data?.needsVerification?.length ?? 0} icon={<ShieldCheck size={18} />} color="warning" />
          <MetricCard label="Verified" value={data?.stats?.verified ?? data?.verified ?? 0} icon={<CheckCircle2 size={18} />} color="success" />
        </div>
        <div className="grid lg:grid-cols-[minmax(0,1fr),minmax(320px,0.85fr)] gap-4 items-start">
        <div className="grid gap-4">
          {visibleReports.length ? (
            visibleReports.map((report: any) => {
              const displayTitle = report.title || report.ai_title || (String(report.description || '').trim().slice(0, 80) || 'Community report');
              return (
                <button key={report.id || displayTitle} type="button" onClick={() => openReport(report)} className="text-left rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400">
                <Card className={`p-4 sm:p-5 transition-shadow hover:shadow-md hover:border-primary-300 cursor-pointer ${selectedReport?.id === report.id ? 'border-primary-400 shadow-sm' : ''}`}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-primary-900">{displayTitle}</h3>
                      <p className="text-xs text-neutral-500 mt-1">{report.district || 'Ranchi'} · {report.status || 'Submitted'}</p>
                    </div>
                    <span className={`badge ${PRIORITY_CONFIG[report.priority_level]?.bg || 'bg-neutral-100'} ${PRIORITY_CONFIG[report.priority_level]?.color || 'text-neutral-700'}`}>{report.priority_level || 'LOW'}</span>
                  </div>
                  <p className="text-sm text-neutral-600 mt-3">{report.description || 'Report submitted for review and AI assessment.'}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                    <span>{report.block || 'Block not specified'}</span>
                    <span>•</span>
                    <span>{report.village || report.address || 'Location captured'}</span>
                    <span>•</span>
                    <span>{new Date(report.createdAt || report.created_at || Date.now()).toLocaleDateString()}</span>
                    <span className="ml-auto font-medium text-primary-700">View Details →</span>
                  </div>
                </Card>
                </button>
              );
            })
          ) : (
            <Card className="p-5"><p className="text-sm text-neutral-500">No reports match the selected filters.</p></Card>
          )}
        </div>
        <Card className="p-5 lg:sticky lg:top-4">
          {selectedReport ? (() => {
            const verified = selectedReport.status === 'VERIFIED' || selectedReport.governmentVerificationStatus === 'VERIFIED' || selectedReport.currentStage === 'GOVERNMENT_VERIFIED' || ['VALIDATED', 'OPEN_FOR_INSTITUTIONS', 'ASSIGNED'].includes(String(selectedReport.status || '').toUpperCase());
            const priority = selectedReport.priority_level || 'LOW';
            const assignment = selectedReport.assignment?.destination || selectedReport.collaborationType || (selectedReport.universityName && selectedReport.industryPartnerName ? 'BOTH' : selectedReport.universityName ? 'UNIVERSITY' : selectedReport.industryPartnerName ? 'INDUSTRY' : undefined);
            const timeline = ['Reported', 'AI Analysis', 'Government Verification', 'Government Assignment', assignment ? `${assignment === 'BOTH' ? 'University + Industry / Startup' : assignment === 'UNIVERSITY' ? 'University' : 'Industry / Startup'} Review` : 'Institution Review', 'Team Formation', 'Prototype', 'Pilot', 'Deployment', 'Community Impact'];
            const completed = (index: number) => index < (assignment ? 5 : verified ? 3 : 2);
            return <div className="space-y-4">
              <div><p className="text-xs uppercase tracking-wide text-neutral-500">Problem Details</p><h2 className="mt-1 text-lg font-semibold text-primary-900">{selectedReport.title}</h2></div>
              <p className="text-sm text-neutral-600">{selectedReport.description}</p>
              <div className="flex flex-wrap gap-2"><span className={`badge ${PRIORITY_CONFIG[priority]?.bg || 'bg-neutral-100'} ${PRIORITY_CONFIG[priority]?.color || 'text-neutral-700'}`}>Priority: {priority}</span><span className="badge bg-neutral-100 text-neutral-700">Score: {selectedReport.priority_score ?? selectedReport.priority?.total ?? 0}/100</span><span className="badge bg-neutral-100 text-neutral-700">{selectedReport.status || 'SUBMITTED'}</span></div>
              <div className="grid grid-cols-2 gap-3 text-sm"><div><span className="text-neutral-500">Problem ID</span><p className="font-mono text-xs mt-1">{selectedReport.id}</p></div><div><span className="text-neutral-500">Submitted</span><p className="mt-1">{new Date(selectedReport.createdAt || selectedReport.created_at).toLocaleDateString()}</p></div><div><span className="text-neutral-500">Location</span><p className="mt-1">{[selectedReport.district, selectedReport.block, selectedReport.village].filter(Boolean).join(' · ') || selectedReport.address || 'Captured location'}</p></div><div><span className="text-neutral-500">People affected</span><p className="mt-1">{Number(selectedReport.affectedPeople ?? selectedReport.affected_population ?? 0).toLocaleString('en-IN')}</p></div><div><span className="text-neutral-500">Coordinates</span><p className="mt-1 text-xs">{selectedReport.latitude ?? '—'}, {selectedReport.longitude ?? '—'}</p></div><div><span className="text-neutral-500">Duration</span><p className="mt-1">{selectedReport.duration || 'Unknown'} days</p></div></div>
              <div className="border-t border-neutral-100 pt-4"><p className="text-sm font-semibold">Government Verification</p><p className={`mt-1 text-sm ${verified ? 'text-success-700' : 'text-warning-700'}`}>{verified ? '✓ Verified' : selectedReport.status === 'REJECTED' ? '✕ Rejected' : '⏳ Pending verification'}</p></div>
              <div className="border-t border-neutral-100 pt-4"><p className="text-sm font-semibold">Assignment</p><p className={`mt-1 text-sm ${assignment ? 'text-success-700' : 'text-warning-700'}`}>{assignment ? `Assigned to ${assignment === 'BOTH' ? 'University + Industry / Startup' : assignment === 'UNIVERSITY' ? 'University' : 'Industry / Startup'}` : '⏳ Awaiting Government Assignment'}</p></div>
              <div className="border-t border-neutral-100 pt-4"><p className="text-sm font-semibold">Tracking</p><div className="mt-3 space-y-2">{timeline.map((stage, index) => <div key={stage} className="flex items-center gap-2 text-sm"><span className={`h-5 w-5 rounded-full flex items-center justify-center ${completed(index) ? 'bg-success-100 text-success-700' : index === (assignment ? 5 : verified ? 3 : 2) ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-400'}`}>{completed(index) ? '✓' : index === (assignment ? 5 : verified ? 3 : 2) ? '●' : '○'}</span><span className={completed(index) ? 'text-neutral-800' : 'text-neutral-500'}>{stage}</span></div>)}</div></div>
              {selectedReport.citizen_name || selectedReport.citizen_contact ? <div className="border-t border-neutral-100 pt-4 text-sm"><p className="font-semibold">Citizen</p><p className="mt-1">{selectedReport.citizen_name}</p><p>{selectedReport.citizen_contact}</p></div> : <p className="text-xs text-neutral-500">Citizen personal details were not stored because consent was not provided.</p>}
            </div>;
          })() : <div className="py-10 text-center text-sm text-neutral-500"><FileText className="mx-auto mb-3 text-neutral-300" size={28} /><p>Select a report to view its details.</p></div>}
        </Card>
        </div>
      </div>
    );
  }

  if (isOverview) {
    return (
      <div className="civic-page space-y-3.5">
        <section className="civic-hero p-6 md:p-7 relative overflow-hidden" style={{ backgroundImage: "linear-gradient(120deg, rgba(250,245,236,0.96), rgba(245,240,232,0.72)), url('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/65 px-3 py-1 text-[11px] font-semibold text-primary-800 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-primary-600" />
              COMMUNITY CONNECTOR • IMPACT
            </div>
            <h1 className="mt-4 text-[28px] sm:text-[34px] font-extrabold font-display text-primary-900 tracking-tight">Welcome back, {volunteerName} 👋</h1>
            <p className="mt-2 text-sm sm:text-[15px] leading-6 text-primary-900/80 max-w-xl">Connect communities with UDBHAV by identifying local problems, collecting evidence, and helping turn community needs into real solutions.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => window.location.hash = '/dashboard/volunteer/report'} className="btn-primary"><Plus size={16} /> Report a Problem</button>
              <button onClick={() => window.location.hash = '/dashboard/volunteer/reports'} className="btn-secondary">View My Reports <ArrowRight size={16} /></button>
            </div>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {heroMetrics.map((item) => (
            <MetricCard key={item.label} label={item.label} value={item.value} icon={<Users size={18} />} color={item.color as any} />
          ))}
        </section>

        <section className="grid xl:grid-cols-[1.45fr,0.95fr] gap-3.5">
          <Card className="p-4 sm:p-5">
            <SectionHeader title="Recent Community Reports" subtitle="Latest reports from the communities you support." />
            <div className="space-y-3">
              {recentReports.map((report: any) => (
                <button key={report.id} onClick={() => window.location.hash = '/dashboard/volunteer/reports'} className="w-full rounded-xl border border-neutral-200 bg-white/60 p-3 text-left hover:bg-primary-50/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center text-primary-700"><MapPin size={18} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-primary-900 truncate">{report.title || 'Community report'}</h3>
                        <span className="badge bg-warning-50 text-warning-700 text-[9px]">{report.priority_level || 'HIGH'}</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1">{report.district || 'Ranchi'}, Jharkhand</p>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-500">
                        <span>{report.status || 'AI Analysis'}</span>
                        <span>{new Date(report.created_at || Date.now()).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionHeader title="Community Priority" subtitle="Problems requiring attention in your assigned areas." />
            <div className="space-y-3">
              {priorityRows.map((report: any, index: number) => (
                <div key={report.id || index} className="rounded-xl border border-neutral-200 bg-white/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-primary-900">{report.title || 'Unsafe road crossing near primary school'}</p>
                    <span className="badge bg-error-50 text-error-700 text-[9px]">{report.priority_level || 'VERY HIGH'}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500">
                    <span>{report.district || 'Dhanbad'}</span>
                    <span>{report.affectedPeople || report.affected_population || 320} affected</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid lg:grid-cols-[1.2fr,0.8fr] gap-3.5">
          <Card className="p-4 sm:p-5">
            <SectionHeader title="Field Impact Snapshot" subtitle="A live view of the communities and risks represented in your reports." />
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-primary-50/60 border border-primary-100 p-3"><div className="text-[10px] uppercase tracking-[0.12em] text-neutral-500">Average priority</div><div className="mt-2 text-2xl font-extrabold text-primary-900">{averagePriority}<span className="text-sm font-medium">/100</span></div></div>
              <div className="rounded-xl bg-secondary-50/60 border border-secondary-100 p-3"><div className="text-[10px] uppercase tracking-[0.12em] text-neutral-500">Top issue domain</div><div className="mt-2 truncate text-lg font-extrabold text-primary-900">{topDomain}</div></div>
              {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map(level => <div key={level} className="rounded-xl border border-neutral-100 bg-white/70 p-3"><div className="flex items-center justify-between text-xs text-neutral-500"><span>{level}</span><b>{severityCounts[level] || 0}</b></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100"><div className={`h-full ${level === 'CRITICAL' ? 'bg-red-600' : level === 'HIGH' ? 'bg-orange-500' : level === 'MEDIUM' ? 'bg-amber-500' : 'bg-green-600'}`} style={{ width: `${reportRows.length ? Math.max(4, ((severityCounts[level] || 0) / reportRows.length) * 100) : 0}%` }} /></div></div>)}
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionHeader title="AI Summary" subtitle="Generated from your current report data." />
            {topReport ? <div className="space-y-2 text-sm text-neutral-600"><p className="leading-6">Your strongest signal is <b className="text-primary-900">{topReport.title || 'the highest-priority report'}</b> in <b className="text-primary-900">{topReport.district || 'your coverage area'}</b>.</p><div className="flex justify-between gap-2"><span>Leading domain</span><b>{topDomain}</b></div><div className="flex justify-between gap-2"><span>Highest priority</span><b>{topReport.priority_level || priorityFromScore(Number(topReport.priority_score || 0))}</b></div><div className="flex justify-between gap-2"><span>Reports analysed</span><b>{reportRows.length}</b></div></div> : <p className="text-sm leading-6 text-neutral-600">Submit your first field report to generate a data-grounded summary of local needs and risks.</p>}
          </Card>
        </section>
      </div>
    );
  }

  return (
    <div className="civic-page space-y-5">
      <SectionHeader title="Volunteer Reporting" subtitle="Collect challenges for citizens who may have limited connectivity or digital access, with explicit consent for personal details." />
      {msg && <div className="rounded-lg border p-3 text-sm">{msg}</div>}

      <div className="grid sm:grid-cols-3 gap-4">
        <MetricCard label="Citizens contacted" value={data?.stats?.citizensContacted ?? 0} icon={<Users size={18} />} />
        <MetricCard label="Problems collected" value={data?.stats?.problemsCollected ?? data?.reports?.length ?? 0} icon={<Upload size={18} />} color="secondary" />
        <MetricCard label="Verified reports" value={data?.stats?.verified ?? data?.verified ?? 0} icon={<ShieldCheck size={18} />} color="success" />
      </div>

      <div className="grid lg:grid-cols-[1.35fr,1fr] gap-5">
        <Card className="p-5">
          <h2 className="font-semibold text-lg">Community report</h2>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <div className="md:col-span-2">
              <textarea
                className="input"
                rows={5}
                value={v.description}
                onChange={(event) => setV((current) => ({ ...current, description: event.target.value }))}
                placeholder="What problem is the community facing?"
              />
              <button className={recording ? 'btn-primary mt-2' : 'btn-secondary mt-2'} onClick={toggleVoice}>
                {recording ? <><MicOff size={16} /> Stop recording</> : <><Mic size={16} /> Record citizen description</>}
              </button>
            </div>

            <input className="input" placeholder="District" value={v.district} onChange={(event) => setV((current) => ({ ...current, district: event.target.value }))} />
            <input className="input" placeholder="Block" value={v.block} onChange={(event) => setV((current) => ({ ...current, block: event.target.value }))} />
            <input className="input" placeholder="Village" value={v.village} onChange={(event) => setV((current) => ({ ...current, village: event.target.value }))} />
            <input className="input" placeholder="Manual address" value={v.address} onChange={(event) => setV((current) => ({ ...current, address: event.target.value }))} />
            <input className="input" type="number" min={1} placeholder="People affected" value={v.affectedPeople ?? ''} onChange={(event) => setV((current) => ({ ...current, affectedPeople: event.target.value === '' ? undefined : Number(event.target.value) }))} />
             <select className="input" aria-label="Problem severity" value={v.severity} onChange={(event) => setV((current) => ({ ...current, severity: event.target.value as typeof current.severity }))}><option value="LOW">Problem Severity: Low</option><option value="MEDIUM">Problem Severity: Medium</option><option value="HIGH">Problem Severity: High</option><option value="CRITICAL">Problem Severity: Critical</option></select>
             <div className="md:col-span-2 rounded-lg border border-neutral-200 bg-white/60 p-3">
               <p className="text-sm font-semibold text-primary-900">Calculated Priority</p>
               <p className={`text-sm font-semibold ${PRIORITY_CONFIG[calculatePriority({ affectedPeople: v.affectedPeople, severity: v.severity, safetyConcern: v.safetyConcern, duration: v.duration, seasonal: v.seasonal, district: v.district, block: v.block, village: v.village }).level].color}`}>The system will save {calculatePriority({ affectedPeople: v.affectedPeople, severity: v.severity, safetyConcern: v.safetyConcern, duration: v.duration, seasonal: v.seasonal, district: v.district, block: v.block, village: v.village }).level} priority from the report details.</p>
             </div>
            <input className="input" type="number" min={1} placeholder="Duration in days" value={v.duration === 'Unknown' ? '' : v.duration} onChange={(event) => setV((current) => ({ ...current, duration: event.target.value || 'Unknown' }))} />

            <label className="flex gap-2 items-center text-sm">
              <input type="checkbox" checked={v.seasonal} onChange={(event) => setV((current) => ({ ...current, seasonal: event.target.checked }))} />
              Seasonal issue
            </label>
            <label className="flex gap-2 items-center text-sm">
              <input type="checkbox" checked={v.safetyConcern} onChange={(event) => setV((current) => ({ ...current, safetyConcern: event.target.checked }))} />
              Safety concern
            </label>

            <label className="md:col-span-2 flex gap-2 items-start text-sm">
              <input type="checkbox" className="mt-1" checked={v.consent} onChange={(event) => setV((current) => ({ ...current, consent: event.target.checked }))} />
              <span>I have explicit consent to store the citizen name/contact. If unchecked, personal details are not stored.</span>
            </label>

            <input className="input" placeholder="Citizen name (optional)" value={v.citizenName} onChange={(event) => setV((current) => ({ ...current, citizenName: event.target.value }))} />
            <input className="input" placeholder="Citizen contact (optional)" value={v.citizenContact} onChange={(event) => setV((current) => ({ ...current, citizenContact: event.target.value }))} />
            <input className="input md:col-span-2" placeholder="Community representatives, comma separated" value={v.communityRepresentatives} onChange={(event) => setV((current) => ({ ...current, communityRepresentatives: event.target.value }))} />
            <textarea className="input md:col-span-2" placeholder="Volunteer notes" value={v.notes} onChange={(event) => setV((current) => ({ ...current, notes: event.target.value }))} />

            <button className={gpsState === 'locating' ? 'btn-primary' : 'btn-secondary'} onClick={locate}>
              {gpsState === 'locating' ? '⏳ Locating...' : gpsState === 'success' ? '✓ GPS Captured' : '📍 Capture GPS'}
            </button>

            <label className="btn-secondary cursor-pointer md:col-span-2">
              <Upload size={15} /> Photo / video / document
              <input type="file" hidden multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx" onChange={(event) => addFiles(event.target.files)} />
            </label>

            <button className="btn-primary md:col-span-2" disabled={busy} onClick={submit}>
              {busy ? 'Submitting…' : 'Submit report'}
            </button>
          </div>

          {evidence.length > 0 && <p className="text-xs text-neutral-500 mt-3">Evidence: {evidence.map((item) => item.name).join(', ')}</p>}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold">Community Location</h3>
          <p className="text-sm text-neutral-500 mt-1">Select where the problem occurred</p>
          <div className="mt-4">
            <VolunteerLocationMap
              value={{ latitude: v.latitude, longitude: v.longitude, district: v.district, block: v.block, village: v.village, address: v.address }}
              onSelect={handleMapSelection}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
