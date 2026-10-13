import { useEffect, useMemo, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, SectionHeader } from '@/components/ui';
import { usePlatform } from '@/context/PlatformContext';
import { useAuth } from '@/context/AuthContext';
import { industryOrganizationIds } from '@/lib/industry';
import { isGovernmentRoutedToIndustry } from '@/lib/problems';
import { JHARKHAND_DISTRICTS } from '@/data/demo';
import { priorityFromScore } from '@/lib/constants';

type Props = { onNavigate: (route: string) => void; industryOnly?: boolean };
const MAP_CENTER: [number, number] = [23.3441, 85.3096];
const RISK_COLORS: Record<string, string> = { LOW: '#2f855a', MEDIUM: '#d69e2e', HIGH: '#dd6b20', CRITICAL: '#c53030' };
const INDUSTRY_ROLES = ['INDUSTRY_PARTNER','STARTUP','MSME','CSR_PARTNER','RESEARCH_LAB'];

function validCoordinate(latitude: unknown, longitude: unknown): latitude is number {
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  return Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude) && parsedLatitude >= -90 && parsedLatitude <= 90 && parsedLongitude >= -180 && parsedLongitude <= 180;
}

function escapeMapText(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character));
}

function MapLayers({ challenges, universities, clusters, onNavigate, risk, onRiskChange, industryMode }: { challenges: any[]; universities: any[]; clusters: any[]; onNavigate: (route: string) => void; risk: string; onRiskChange: (risk: string) => void; industryMode: boolean }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layers = useRef<{ problems: L.LayerGroup; institutions: L.LayerGroup; hotspots: L.LayerGroup } | null>(null);
  const riskChangeRef = useRef(onRiskChange);

  useEffect(() => { riskChangeRef.current = onRiskChange; }, [onRiskChange]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true }).setView(MAP_CENTER, 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    const problemLayer = L.layerGroup().addTo(map);
    const institutionLayer = L.layerGroup().addTo(map);
    const hotspotLayer = L.layerGroup().addTo(map);
    layers.current = { problems: problemLayer, institutions: institutionLayer, hotspots: hotspotLayer };
    mapInstance.current = map;
    const riskControl = new L.Control({ position: 'topright' });
    riskControl.onAdd = () => {
      const control = L.DomUtil.create('div', 'jansetu-risk-control');
      control.style.cssText = 'background:#fffaf0;border:1px solid #d8cdbb;border-radius:14px;box-shadow:0 5px 18px rgba(42,95,72,.18);padding:10px;min-width:150px;font:12px system-ui,sans-serif;color:#173f31';
      control.innerHTML = `<div style="font-weight:700;margin-bottom:7px">Filter by ${industryMode?'priority':'risk'}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">${['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((level) => `<button type="button" data-risk="${level}" class="jansetu-risk-option" style="border:1px solid #ded5c8;border-radius:8px;padding:5px 4px;background:#fff;color:#173f31;cursor:pointer">${level === 'ALL' ? 'All issues' : `${level.charAt(0)}${level.slice(1).toLowerCase()}`}</button>`).join('')}</div>`;
      L.DomEvent.disableClickPropagation(control);
      control.querySelectorAll<HTMLButtonElement>('[data-risk]').forEach((button) => button.addEventListener('click', () => riskChangeRef.current(button.dataset.risk || 'ALL')));
      return control;
    };
    map.addControl(riskControl);
    const onPopupOpen = (event: L.PopupEvent) => {
      const button = event.popup.getElement()?.querySelector<HTMLButtonElement>('[data-problem-id]');
      if (button) button.onclick = () => onNavigate(industryMode ? `/dashboard/challenges?challenge=${encodeURIComponent(button.dataset.problemId || '')}` : `/dashboard/community?challenge=${encodeURIComponent(button.dataset.problemId || '')}`);
    };
    const onTooltipOpen = (event: L.TooltipEvent) => {
      const tooltip = event.tooltip.getElement()?.querySelector<HTMLElement>('[data-problem-tooltip-id]');
      if (tooltip) tooltip.onclick = () => onNavigate(industryMode ? `/dashboard/challenges?challenge=${encodeURIComponent(tooltip.dataset.problemTooltipId || '')}` : `/dashboard/community?challenge=${encodeURIComponent(tooltip.dataset.problemTooltipId || '')}`);
    };
    map.on('popupopen', onPopupOpen);
    map.on('tooltipopen', onTooltipOpen);
    window.setTimeout(() => map.invalidateSize(), 0);
    return () => { map.off('popupopen', onPopupOpen); map.off('tooltipopen', onTooltipOpen); map.removeControl(riskControl); map.remove(); mapInstance.current = null; layers.current = null; };
  }, [industryMode, onNavigate]);

  useEffect(() => {
    const buttons = mapRef.current?.querySelectorAll<HTMLButtonElement>('.jansetu-risk-option');
    buttons?.forEach((button) => {
      const active = button.dataset.risk === risk;
      button.style.background = active ? '#2a5f48' : '#fff';
      button.style.color = active ? '#fff' : '#173f31';
      button.style.borderColor = active ? '#2a5f48' : '#ded5c8';
    });
  }, [risk]);

  useEffect(() => {
    if (!mapInstance.current || !layers.current) return;
    const { problems, institutions, hotspots } = layers.current;
    problems.clearLayers();
    institutions.clearLayers();
    hotspots.clearLayers();
    if (challenges.length) {
      const bounds = L.latLngBounds(challenges.filter((challenge) => validCoordinate(challenge.latitude, challenge.longitude)).map((challenge) => [Number(challenge.latitude), Number(challenge.longitude)] as [number, number]));
      if (bounds.isValid()) {
        mapInstance.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 9 });
      }
    } else {
      mapInstance.current.setView(MAP_CENTER, 7);
    }
    challenges.filter((challenge) => validCoordinate(challenge.latitude, challenge.longitude)).forEach((challenge) => {
      const score = Number(challenge.priority_score ?? challenge.priorityScore ?? challenge.priority?.total ?? 0);
      const level = String(challenge.priority_level || challenge.priorityLevel || priorityFromScore(score)).toUpperCase();
      const color = RISK_COLORS[level] || '#718096';
      const location = [challenge.district, challenge.block, challenge.village].filter(Boolean).join(' · ') || 'Location not recorded';
      const affected=Number(challenge.affected_population ?? challenge.affectedPeople ?? 0).toLocaleString('en-IN');
      const summary = `<div data-problem-tooltip-id="${escapeMapText(challenge.id)}" style="cursor:pointer"><strong>${escapeMapText(challenge.title || 'Community problem')}</strong><br><span style="color:${color};font-weight:700">${industryMode?'Priority':'Risk'}: ${escapeMapText(level)}</span> · ${score}/100<br>${industryMode?'':`Affected: ${affected} people<br>`}${escapeMapText(location)}<br><small style="color:#2a5f48">Click for full problem details</small></div>`;
      const details = `<div style="min-width:220px"><strong>${escapeMapText(challenge.title || 'Community problem')}</strong><p>${escapeMapText(challenge.description || 'No description recorded.')}</p><div>${industryMode?'Priority':'Risk'}: <strong>${escapeMapText(level)}</strong></div><div>Priority: <strong>${score}/100</strong></div>${industryMode?'':`<div>Affected: ${affected}</div>`}<div>Location: ${escapeMapText(location)}</div><div>Status: ${escapeMapText(String(challenge.status || 'SUBMITTED').replaceAll('_', ' '))}</div>${industryMode?'':`<div>Assigned: ${escapeMapText(challenge.assignment?.destination || 'Awaiting Government assignment')}</div>`}<button data-problem-id="${escapeMapText(challenge.id)}" style="margin-top:8px">View problem details</button></div>`;
      const marker=L.circleMarker([challenge.latitude, challenge.longitude], { radius: 8, color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.9 }).bindTooltip(summary, { direction: 'top', sticky: true, interactive: true, className: 'jansetu-problem-tooltip' }).bindPopup(details);
      if(industryMode)marker.on('click',()=>onNavigate(`/dashboard/challenges?challenge=${encodeURIComponent(challenge.id)}`));
      marker.addTo(problems);
    });
    universities.filter((institution: any) => validCoordinate(institution.latitude, institution.longitude)).forEach((institution: any) => {
      const icon = L.divIcon({ className: '', html: '<span style="display:block;width:14px;height:14px;background:#2a5f48;border:2px solid white;transform:rotate(45deg);box-shadow:0 1px 4px #555"></span>', iconSize: [14, 14], iconAnchor: [7, 7] });
      L.marker([institution.latitude, institution.longitude], { icon }).bindTooltip(escapeMapText(institution.name || 'Institution')).addTo(institutions);
    });
    clusters.filter((cluster: any) => validCoordinate(cluster.centroid?.latitude, cluster.centroid?.longitude)).forEach((cluster: any) => {
      L.circle([cluster.centroid.latitude, cluster.centroid.longitude], { radius: 2500, color: '#705ab4', fillColor: '#705ab4', fillOpacity: 0.08, weight: 1 }).bindTooltip(`${escapeMapText(cluster.title || 'Emerging hotspot')} · ${cluster.report_count || 0} reports`).addTo(hotspots);
    });
  }, [challenges, universities, clusters, onNavigate]);

  return <div ref={mapRef} className="h-[540px] w-full" />;
}

export default function InnovationMapPage({ onNavigate, industryOnly = false }: Props) {
  const { challenges, universities, clusters } = usePlatform();
  const {profile}=useAuth();
  const industryMode=industryOnly||INDUSTRY_ROLES.includes(profile?.role||'');
  const organizationIds=useMemo(()=>industryOrganizationIds(profile as any),[profile?.id,profile?.organization_id]);
  const [district, setDistrict] = useState('ALL');
  const [domain, setDomain] = useState('ALL');
  const [risk, setRisk] = useState('ALL');
  // Industry sees the same canonical challenge records as Challenges, Projects and
  // Solutions. Previously this filtered on `!industryPartnerId`, so every challenge
  // vanished from the map the moment it was accepted and the Industry could no longer
  // locate its own project on the map.
  const visibleChallenges=useMemo(()=>{
    if(!industryMode)return challenges;
    const routed=challenges.filter(challenge=>isGovernmentRoutedToIndustry(challenge));
    if(organizationIds.length)return routed.filter(challenge=>!challenge.industryPartnerId||organizationIds.includes(String(challenge.industryPartnerId)));
    return routed;
  },[challenges,industryMode,organizationIds]);
  const filtered = visibleChallenges.filter((challenge) => {
    const record = challenge as any;
    const score = Number(record.priority_score ?? record.priorityScore ?? record.priority?.total ?? 0);
    const level = String(record.priority_level || record.priorityLevel || priorityFromScore(score)).toUpperCase();
    return (district === 'ALL' || challenge.district === district) && (domain === 'ALL' || challenge.domain === domain) && (risk === 'ALL' || level === risk);
  });
  const geolocated = filtered.filter((challenge) => validCoordinate(challenge.latitude, challenge.longitude));
  const legendLevels=industryMode?['CRITICAL','HIGH','MEDIUM','LOW']:['LOW','MEDIUM','HIGH','CRITICAL'];
  return <div className="civic-page"><SectionHeader title="Jharkhand Innovation GIS" subtitle={industryMode?'Government-published Industry opportunities mapped from recorded coordinates.':'Problem markers use persisted latitude/longitude and canonical priority values.'}/><div className="grid lg:grid-cols-4 gap-5"><Card className="lg:col-span-3 overflow-hidden relative p-0"><MapLayers challenges={geolocated} universities={industryMode?[]:universities} clusters={industryMode?[]:clusters} onNavigate={onNavigate} risk={risk} onRiskChange={setRisk} industryMode={industryMode}/><div className="absolute left-3 bottom-3 z-[500] rounded-xl border border-[#d8cdbb] bg-[#fffaf0]/95 p-3 text-xs shadow-lg"><div className="mb-2 font-semibold text-primary-900">{industryMode?'Priority legend':'Risk legend'}</div><div className="flex flex-wrap gap-2">{legendLevels.map(level=><span key={level} style={{color:RISK_COLORS[level]}}>● {level.charAt(0)}{level.slice(1).toLowerCase()}</span>)}</div><div className="mt-1 text-neutral-500">Use the map control to filter {industryMode?'priorities':'issues'}.</div></div></Card><Card className="p-4"><SectionHeader title="Map filters" subtitle={`${geolocated.length} geolocated challenge${geolocated.length===1?'':'s'}`}/><label className="label">District</label><select className="input mb-3" value={district} onChange={event=>setDistrict(event.target.value)}><option value="ALL">All districts</option>{JHARKHAND_DISTRICTS.map(districtOption=><option key={districtOption.id} value={districtOption.name}>{districtOption.name}</option>)}</select><label className="label">Domain</label><select className="input" value={domain} onChange={event=>setDomain(event.target.value)}><option value="ALL">All domains</option>{[...new Set(visibleChallenges.map(challenge=>challenge.domain))].filter(Boolean).map(value=><option key={value}>{value}</option>)}</select><div className="mt-5 text-xs text-neutral-500">{industryMode?`${Math.max(filtered.length-geolocated.length,0)} available challenges have no valid location and are omitted from the map.`:`${clusters.length} emerging hotspot indicators are available in the GeoAI workspace. Reports without valid coordinates are intentionally omitted from the map.`}</div></Card></div></div>;
}
