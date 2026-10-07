import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { INCIDENT_STATUS_LABELS, type Incident, type IncidentStatus } from '../types/incident';

// Interactive incident map: MapLibre GL with the OpenFreeMap "positron"
// basemap (free, no API key, OpenStreetMap data). One pin per incident,
// colored by status; clicking a pin opens a popup with photo and a link to
// the detail. Loaded lazily (see LazyIncidentMap) so the login page and the
// list stay light.

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

const STATUS_MODIFIER: Record<IncidentStatus, string> = {
  submitted: 'submitted',
  open: 'open',
  in_progress: 'in-progress',
  resolved: 'resolved',
  declined: 'declined',
};

type Props = {
  incidents: Incident[];
  center: { lat: number; lng: number };
  // Without it, pins have no popup (e.g. the single-incident map in the detail).
  onOpen?: (id: string) => void;
  zoom?: number;
  className?: string;
};

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function popupContent(incident: Incident, onOpen: (id: string) => void) {
  const root = element('div', 'map-popup');
  if (incident.photos[0]) {
    const img = element('img', 'map-popup__photo');
    img.src = incident.photos[0];
    img.alt = '';
    root.appendChild(img);
  }
  const body = element('div', 'map-popup__body');
  body.appendChild(
    element('span', `status-badge status-badge--${STATUS_MODIFIER[incident.status]}`, INCIDENT_STATUS_LABELS[incident.status]),
  );
  body.appendChild(element('p', 'map-popup__title', incident.title));
  body.appendChild(element('p', 'map-popup__meta', incident.location.address));
  const button = element('button', 'button button--primary map-popup__button', 'Abrir incidencia');
  button.type = 'button';
  button.addEventListener('click', () => onOpen(incident.id));
  body.appendChild(button);
  root.appendChild(body);
  return root;
}

export default function IncidentMap({ incidents, center, onOpen, zoom = 14, className }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const framedKey = useRef<string | null>(null);
  const markersKey = useRef<string | null>(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!container.current) return;
    const instance = new maplibregl.Map({
      container: container.current,
      style: STYLE_URL,
      center: [center.lng, center.lat],
      zoom,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    });
    instance.touchZoomRotate.disableRotation();
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.current = instance;
    return () => {
      instance.remove();
      map.current = null;
      framedKey.current = null;
      markersKey.current = null;
    };
    // The map is created once; center/zoom changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;

    // The periodic refresh hands over new but identical objects: keep the
    // markers (and any open popup) when nothing visible changed.
    const signature = JSON.stringify(
      incidents.map((i) => [i.id, i.status, i.title, i.photos[0], i.location.lat, i.location.lng]),
    );
    if (signature === markersKey.current) return;
    markersKey.current = signature;

    markers.current.forEach((marker) => marker.remove());
    markers.current = incidents.map((incident) => {
      const pin = element('div', `map-pin map-pin--${STATUS_MODIFIER[incident.status]}`);
      pin.title = incident.title;
      const marker = new maplibregl.Marker({ element: pin }).setLngLat([incident.location.lng, incident.location.lat]);
      if (onOpenRef.current) {
        marker.setPopup(
          new maplibregl.Popup({ offset: 16, closeButton: false, maxWidth: '260px' }).setDOMContent(
            popupContent(incident, (id) => onOpenRef.current?.(id)),
          ),
        );
      }
      return marker.addTo(instance);
    });

    // Re-frame only when the set of incidents changes (filters, municipality),
    // not on the periodic refresh, so the operator's pan/zoom is kept.
    const key = `${incidents.map((i) => i.id).sort().join(',')}|${center.lat},${center.lng}`;
    if (key === framedKey.current) return;
    framedKey.current = key;
    if (incidents.length === 0) {
      instance.jumpTo({ center: [center.lng, center.lat], zoom });
    } else if (incidents.length === 1) {
      instance.jumpTo({ center: [incidents[0].location.lng, incidents[0].location.lat], zoom });
    } else {
      const bounds = new maplibregl.LngLatBounds();
      incidents.forEach((i) => bounds.extend([i.location.lng, i.location.lat]));
      instance.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 0 });
    }
  }, [incidents, center, zoom]);

  return <div ref={container} className={className ?? 'incident-map'} />;
}
