import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

import { buildMapHtml, type MapCenter, type MapPoint, parseMapMessage } from './mapHtml';

type Props = {
  points: MapPoint[];
  center: MapCenter;
  openLabel: string;
  onOpen: (id: string) => void;
};

// Native: the MapLibre page runs in a WebView (works in Expo Go).
export function MapFrame({ points, center, openLabel, onOpen }: Props) {
  const webView = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const html = useMemo(() => buildMapHtml(openLabel), [openLabel]);

  useEffect(() => {
    if (!ready) return;
    webView.current?.injectJavaScript(
      `window.viaclaraMap.setPoints(${JSON.stringify(points)}, ${JSON.stringify(center)}); true;`,
    );
  }, [ready, points, center]);

  return (
    <WebView
      ref={webView}
      source={{ html, baseUrl: 'https://viaclara.local/' }}
      originWhitelist={['*']}
      style={StyleSheet.absoluteFill}
      nestedScrollEnabled
      onMessage={(event) => {
        const msg = parseMapMessage(event.nativeEvent.data);
        if (msg?.type === 'ready') setReady(true);
        else if (msg?.type === 'open') onOpen(msg.id);
      }}
    />
  );
}
