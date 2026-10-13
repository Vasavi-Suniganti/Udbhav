import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { subscribeToNotifications } from '@/lib/notificationService';
import { firebaseEnabled } from '@/lib/firebase';
import { subscribeToProblems, subscribeToCitizenProblems } from '@/lib/problems';
import { challengeFromApi, clusterFromApi, notificationFromApi, projectFromApi, solutionFromApi } from '@/lib/adapters';
import type { Challenge, Project, Solution, ChallengeCluster, Notification } from '@/types';
import {
  DEMO_CHALLENGES,
  DEMO_PROJECTS,
  DEMO_SOLUTIONS,
  DEMO_CLUSTERS,
  ORGANIZATIONS,
  DEMO_FACULTY,
  DEMO_STUDENTS,
  DEMO_NOTIFICATIONS,
} from '@/data/demo';

interface PlatformState {
  challenges: Challenge[];
  projects: Project[];
  solutions: Solution[];
  clusters: ChallengeCluster[];
  universities: any[];
  faculty: any[];
  students: any[];
  industry: any[];
  notifications: Notification[];
  analytics: any;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const C = createContext<PlatformState | undefined>(undefined);

const initialUniversities = ORGANIZATIONS.filter((o) => o.type === 'UNIVERSITY');
const initialIndustry = ORGANIZATIONS.filter((o) =>
  ['INDUSTRY', 'STARTUP', 'MSME', 'CSR_PARTNER', 'RESEARCH_LAB'].includes(o.type)
);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>(() => DEMO_CHALLENGES.map(challengeFromApi));
  const [projects, setProjects] = useState<Project[]>(() =>
    DEMO_PROJECTS.map((p: any) => projectFromApi(p, p.organization_name || 'Institution'))
  );
  const [solutions, setSolutions] = useState<Solution[]>(() => DEMO_SOLUTIONS.map(solutionFromApi));
  const [clusters, setClusters] = useState<ChallengeCluster[]>(() => DEMO_CLUSTERS.map(clusterFromApi));
  const [universities, setUniversities] = useState<any[]>(() => initialUniversities);
  const [faculty, setFaculty] = useState<any[]>(() => DEMO_FACULTY);
  const [students, setStudents] = useState<any[]>(() => DEMO_STUDENTS);
  const [industry, setIndustry] = useState<any[]>(() => initialIndustry);
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    DEMO_NOTIFICATIONS.map(notificationFromApi)
  );
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cs, ps, ss, cls, us, fs, sts, ins, ns] = await Promise.all([
        api.challenges(),
        api.projects(),
        api.solutions(),
        api.clusters(),
        api.universities(),
        api.faculty(),
        api.students(),
        api.industry(),
        api.notifications(),
      ]);
      setChallenges(cs.map(challengeFromApi));
      const byUni = new Map<string, string>((us as any[]).map((u: any) => [String(u.id), String(u.name)]));
      setProjects(ps.map((p: any) => projectFromApi(p, byUni.get(p.universityId) || p.organization_name || 'Institution')));
      setSolutions(ss.map(solutionFromApi));
      setClusters(cls.map(clusterFromApi));
      setUniversities(us);
      setFaculty(fs);
      setStudents(sts);
      setIndustry(ins);
      setNotifications(ns.map(notificationFromApi));
      try {
        setAnalytics(await api.analytics());
      } catch {
        setAnalytics(null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!profile) return;
    const onChange = (next: Challenge[]) => setChallenges(current => {
        const demo = current.filter(challenge => challenge.id.startsWith('ch-') || challenge.id.startsWith('demo-'));
        return next.length ? [...next, ...demo] : current;
      });
    const onError = (error: Error) => setError(`Problem feed: ${error.message}`);
    return profile.role === 'CITIZEN'
      ? subscribeToCitizenProblems(profile.id, onChange, onError)
      : subscribeToProblems(onChange, onError);
  }, [profile]);

  useEffect(() => {
    if (!profile?.id) return;
    if (!firebaseEnabled) {
      void api.notifications().then(items => setNotifications(items.map(notificationFromApi)));
      return;
    }
    return subscribeToNotifications(profile.id, setNotifications, error => setError(`Notification feed: ${error.message}`));
  }, [profile?.id]);

  const value = useMemo(
    () => ({
      challenges,
      projects,
      solutions,
      clusters,
      universities,
      faculty,
      students,
      industry,
      notifications,
      analytics,
      loading,
      error,
      refresh,
    }),
    [challenges, projects, solutions, clusters, universities, faculty, students, industry, notifications, analytics, loading, error, refresh]
  );

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function usePlatform() {
  const x = useContext(C);
  if (!x) throw new Error('usePlatform must be used within PlatformProvider');
  return x;
}
