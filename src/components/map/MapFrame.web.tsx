import { useEffect, useMemo, useRef, useState } from 'react';

import { buildMapHtml, type MapCenter, type MapPoint, parseMapMessage } from './mapHtml';

type Props = {
  points: MapPoint[];
  center: MapCenter;
  openLabel: string;
  onOpen: (id: string) => void;
};

type MapWindow = Window & {
  viaclaraMap?: { setPoints: (points: MapPoint[], center: MapCenter) => void };
};

// Web: the same MapLibre page in a srcdoc iframe (same origin as the app).
export function MapFrame({ points, center, openLabel, onOpen }: Props) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const html = useMemo(() => buildMapHtml(openLabel), [openLabel]);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.current?.contentWindow) return;
      const msg = parseMapMessage(event.data);
      if (msg?.type === 'ready') setReady(true);
      else if (msg?.type === 'open') onOpenRef.current(msg.id);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    (iframe.current?.contentWindow as MapWindow | null)?.viaclaraMap?.setPoints(points, center);
  }, [ready, points, center]);

  return (
    <iframe
      ref={iframe}
      srcDoc={html}
      title="Mapa de avisos"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
    />
  );
}
