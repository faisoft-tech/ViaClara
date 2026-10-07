import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { IncidentCategory } from '@/theme/tokens';
import { fetchIncident, fetchMunicipalityIncidents, toIncident } from './api';
import {
  getPriorityScore,
  getTier,
  getTierMultiplier,
  Incident,
  MUNICIPALITIES,
  Tier,
  Verification,
} from './incidents';

// Incidents are read from the API (apps/api), so changes made by municipal
// staff in the admin web app show up here on refresh. Citizen actions (likes,
// comments, new reports…) are still applied locally only: they need the
// citizen's SMS login, which is not wired to Cognito yet.

type NewIncident = {
  title: string;
  category: IncidentCategory;
  description: string;
  address: string;
  photos: string[];
};

// Settings §6: notification preferences (local only, no real push).
export type NotificationPrefs = {
  likes: boolean;
  comments: boolean;
  followers: boolean;
  statusChanges: boolean;
  reactivation: boolean;
  closureConfirmation: boolean;
};

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  likes: true,
  comments: true,
  followers: true,
  statusChanges: true,
  reactivation: true,
  closureConfirmation: true,
};

export type Language = 'es' | 'en';

export type NotificationType =
  | 'like'
  | 'comment'
  | 'follower'
  | 'status_change'
  | 'reactivation'
  | 'confirm_closure';

export type Notification = {
  id: string;
  type: NotificationType;
  text: string;
  date: string;
  read: boolean;
  incidentId?: string;
};

type StoreValue = {
  incidents: Incident[];
  loadingIncidents: boolean;
  // Message of the last failed load, null when the last load succeeded.
  loadError: string | null;
  refresh: () => Promise<void>;
  refreshIncident: (id: string) => Promise<void>;
  isRegistered: boolean;
  // Settings §1/§6: public name the user is identified by to others.
  publicName: string | null;
  // Profile mockup: masked phone number shown under the public name.
  phone: string | null;
  login: (publicName: string, phone: string) => void;
  logout: () => void;
  toggleLike: (id: string) => void;
  toggleWatch: (id: string) => void;
  reopen: (id: string) => void;
  addComment: (id: string, text: string) => void;
  create: (data: NewIncident) => string;
  // RF-013 / CU-004: comment likes.
  toggleCommentLike: (incidentId: string, commentId: string) => void;
  // RF-014 / CU-005: user's active municipality.
  municipalityId: string;
  setMunicipality: (id: string) => void;
  // RF-016: current user's accumulated points.
  points: number;
  // RF-018 / CU-008: user's tier ranking in the active municipality.
  tier: Tier;
  tierMultiplier: number;
  // RF-013 / CU-004: verify the closure of one of the user's own incidents.
  verifyResolution: (id: string, result: Verification['result']) => void;
  // RF-015 / RF-018: priority score of an incident (uses its author's tier).
  priorityScoreOf: (inc: Incident) => number;
  // Settings §4: edit/delete an incident's own data.
  updateIncident: (id: string, patch: Partial<Pick<Incident, 'title' | 'category' | 'description'>>) => void;
  deleteIncident: (id: string) => void;
  // Settings §6: general user stats (mock of the "stats endpoint").
  stats: { reportsCreated: number; reportsResolved: number; likesReceived: number };
  // Settings §6: notification preferences.
  notificationPrefs: NotificationPrefs;
  setNotificationPref: (key: keyof NotificationPrefs, value: boolean) => void;
  // Settings §6: interface language.
  language: Language;
  setLanguage: (lang: Language) => void;
  // Settings §7: notification panel.
  notifications: Notification[];
  unreadNotificationsCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

let nextId = 100;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [publicName, setPublicName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [municipalityId, setMunicipalityId] = useState(MUNICIPALITIES[0].id);
  const [points, setPoints] = useState(0);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(
    DEFAULT_NOTIFICATION_PREFS,
  );
  const [language, setLanguage] = useState<Language>('es');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const municipalityRef = useRef(municipalityId);
  municipalityRef.current = municipalityId;
  const languageRef = useRef(language);
  languageRef.current = language;

  const refresh = useCallback(async () => {
    const id = municipalityRef.current;
    setLoadingIncidents(true);
    try {
      const fresh = await fetchMunicipalityIncidents(id);
      const freshIds = new Set(fresh.map((i) => i.id));
      setIncidents((prev) => {
        const prevById = new Map(prev.map((i) => [i.id, i]));
        const others = prev.filter(
          (i) => !freshIds.has(i.id) && (i.municipalityId !== id || i.id.startsWith('local-')),
        );
        return [...fresh.map((api) => toIncident(api, languageRef.current, prevById.get(api.id))), ...others];
      });
      setLoadError(null);
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setLoadingIncidents(false);
    }
  }, []);

  const refreshIncident = useCallback(async (id: string) => {
    if (id.startsWith('local-')) return;
    try {
      const api = await fetchIncident(id);
      setIncidents((prev) => {
        if (!api) return prev.filter((i) => i.id !== id);
        const previous = prev.find((i) => i.id === id);
        const fresh = toIncident(api, languageRef.current, previous);
        return previous ? prev.map((i) => (i.id === id ? fresh : i)) : [fresh, ...prev];
      });
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [municipalityId, refresh]);

  const update = (id: string, fn: (i: Incident) => Incident) =>
    setIncidents((prev) => prev.map((i) => (i.id === id ? fn(i) : i)));

  // Demo simplification: the tier ranking is computed from the user's global
  // `points` with fixed thresholds (§10 rule 13), not by relative ranking among
  // the citizens of each municipality — that requires aggregated data from the
  // real backend.
  const tier = getTier(points);
  const tierMultiplier = getTierMultiplier(tier);

  const priorityScoreOf = useCallback(
    (inc: Incident) => getPriorityScore(inc, inc.isMine ? tierMultiplier : 1),
    [tierMultiplier],
  );

  const stats = useMemo(() => {
    const own = incidents.filter((i) => i.isMine);
    return {
      reportsCreated: own.length,
      reportsResolved: own.filter((i) => i.status === 'resolved').length,
      likesReceived: own.reduce((sum, i) => sum + i.likes, 0),
    };
  }, [incidents]);

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const value = useMemo<StoreValue>(
    () => ({
      incidents,
      loadingIncidents,
      loadError,
      refresh,
      refreshIncident,
      isRegistered,
      publicName,
      phone,
      login: (name, phoneNumber) => {
        setIsRegistered(true);
        setPublicName(name);
        setPhone(phoneNumber);
      },
      // Settings §1/§6: logging out doesn't forget the public name or phone —
      // they're reused to skip the name step on the next login (see
      // SignupSheet's login mode).
      logout: () => {
        setIsRegistered(false);
      },
      toggleLike: (id) =>
        update(id, (i) => ({
          ...i,
          liked: !i.liked,
          likes: i.liked ? i.likes - 1 : i.likes + 1,
        })),
      toggleWatch: (id) =>
        update(id, (i) => ({
          ...i,
          watching: !i.watching,
          watchersCount: i.watching ? i.watchersCount - 1 : i.watchersCount + 1,
        })),
      // Settings §4: reactivating a declined incident really reopens it (previously it
      // only added a like without changing its status or leaving a trace in the history).
      reopen: (id) =>
        update(id, (i) =>
          i.status === 'declined'
            ? {
                ...i,
                status: 'open',
                likes: i.likes + 1,
                liked: true,
                history: [
                  ...i.history,
                  { status: 'open', date: 'ahora', note: 'Reactivada a petición de la ciudadanía' },
                ],
              }
            : { ...i, likes: i.likes + 1, liked: true },
        ),
      addComment: (id, text) =>
        update(id, (i) => ({
          ...i,
          commentsCount: i.commentsCount + 1,
          comments: [
            ...i.comments,
            { id: `c${Date.now()}`, author: publicName ?? 'Tú', text, date: 'ahora', likes: 0 },
          ],
        })),
      toggleCommentLike: (incidentId, commentId) =>
        update(incidentId, (i) => ({
          ...i,
          comments: i.comments.map((c) =>
            c.id === commentId
              ? { ...c, likedByMe: !c.likedByMe, likes: c.likedByMe ? c.likes - 1 : c.likes + 1 }
              : c,
          ),
        })),
      create: (data) => {
        const id = `local-${nextId++}`;
        const newIncident: Incident = {
          id,
          title: data.title || 'Aviso sin título',
          category: data.category,
          status: 'submitted',
          description: data.description,
          address: data.address || 'Almuñécar',
          lat: 36.7339 + (Math.random() - 0.5) * 0.01,
          lng: -3.6907 + (Math.random() - 0.5) * 0.01,
          date: 'ahora',
          createdAt: Date.now(),
          createdBy: publicName ?? 'Tú',
          likes: 0,
          commentsCount: 0,
          liked: false,
          watching: true,
          isMine: true,
          municipalityId,
          watchersCount: 0,
          comments: [],
          history: [{ status: 'submitted', date: 'ahora' }],
          photos: data.photos,
        };
        setIncidents((prev) => [newIncident, ...prev]);
        return id;
      },
      municipalityId,
      setMunicipality: setMunicipalityId,
      points,
      tier,
      tierMultiplier,
      priorityScoreOf,
      // RF-013 / rule 11: verifying only grants/reverts points — there is no
      // operator "mark as resolved" action in this demo (that lives in the admin
      // app), so points for an incident are granted on confirmation, instead of
      // on resolve-then-revert-if-rejected.
      verifyResolution: (id, result) => {
        const inc = incidents.find((i) => i.id === id);
        if (!inc || inc.verification) return;
        if (result === 'verified') {
          setPoints((p) => p + priorityScoreOf(inc));
          update(id, (i) => ({
            ...i,
            verification: { result, date: 'ahora' },
            history: [...i.history, { status: i.status, date: 'ahora', note: 'Verificado por el ciudadano' }],
          }));
        } else {
          update(id, (i) => ({
            ...i,
            status: 'in_progress',
            verification: { result, date: 'ahora' },
            history: [...i.history, { status: 'in_progress', date: 'ahora', note: 'Reabierta: el ciudadano marcó "No resuelto"' }],
          }));
        }
      },
      updateIncident: (id, patch) => update(id, (i) => ({ ...i, ...patch })),
      deleteIncident: (id) => setIncidents((prev) => prev.filter((i) => i.id !== id)),
      stats,
      notificationPrefs,
      setNotificationPref: (key, value) =>
        setNotificationPrefs((prev) => ({ ...prev, [key]: value })),
      language,
      setLanguage,
      notifications,
      unreadNotificationsCount,
      markNotificationRead: (id) =>
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))),
      markAllNotificationsRead: () =>
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
    }),
    [
      incidents,
      loadingIncidents,
      loadError,
      refresh,
      refreshIncident,
      isRegistered,
      publicName,
      phone,
      municipalityId,
      points,
      tier,
      tierMultiplier,
      priorityScoreOf,
      stats,
      notificationPrefs,
      language,
      notifications,
      unreadNotificationsCount,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}
