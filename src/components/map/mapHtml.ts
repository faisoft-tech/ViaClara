// Self-contained MapLibre GL page rendered inside a WebView (native) or an
// iframe (web), so the same map works in Expo Go without native modules.
// Basemap: OpenFreeMap "positron" (free, no API key, OpenStreetMap data).
//
// Protocol:
//   host -> map: window.viaclaraMap.setPoints(points, center)
//   map -> host: {"type":"ready"} once loaded, {"type":"open","id":...} when
//                the user taps "open" in a marker popup.

const MAPLIBRE_VERSION = '5.24.0';
const MAPLIBRE_JS_SRI = 'sha256-RamwepGJzlYFTGIKlHzPQeKR5YyV6bYVM7dAqqZe5cs=';
const MAPLIBRE_CSS_SRI = 'sha256-qx5w1Z7EBGW65+cDDaLzzPKBM/1QLmK9WY7vut/XpzI=';
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  address: string;
  color: string;
  statusLabel: string;
  photo?: string;
};

export type MapCenter = { lat: number; lng: number };

export type MapMessage = { type: 'ready' } | { type: 'open'; id: string };

export function parseMapMessage(raw: unknown): MapMessage | null {
  if (typeof raw !== 'string') return null;
  try {
    const msg = JSON.parse(raw) as Partial<MapMessage> & { source?: string };
    if (msg.source !== 'viaclara-map') return null;
    if (msg.type === 'ready') return { type: 'ready' };
    if (msg.type === 'open' && typeof msg.id === 'string') return { type: 'open', id: msg.id };
  } catch {
    // Not one of ours.
  }
  return null;
}

export function buildMapHtml(openLabel: string): string {
  const cdn = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist`;
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="${cdn}/maplibre-gl.css" integrity="${MAPLIBRE_CSS_SRI}" crossorigin="anonymous" />
<script src="${cdn}/maplibre-gl.js" integrity="${MAPLIBRE_JS_SRI}" crossorigin="anonymous"></script>
<style>
  html, body, #map { margin: 0; height: 100%; width: 100%; font-family: -apple-system, system-ui, sans-serif; }
  .pin { width: 26px; height: 26px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.35); cursor: pointer; }
  .maplibregl-popup-content { padding: 0; border-radius: 12px; overflow: hidden; width: 220px; }
  .popup img { display: block; width: 100%; height: 110px; object-fit: cover; }
  .popup .body { padding: 10px 12px 12px; }
  .popup .title { font-weight: 600; font-size: 14px; color: #1a1d2e; margin: 0 0 4px; }
  .popup .meta { font-size: 12px; color: #6b7080; margin: 0 0 8px; }
  .popup .status { display: inline-block; font-size: 11px; font-weight: 600; color: #fff; border-radius: 999px; padding: 2px 8px; margin-bottom: 8px; }
  .popup button { width: 100%; border: 0; border-radius: 8px; padding: 8px; font-weight: 600; font-size: 13px; color: #fff; background: #2f6bff; }
</style>
</head>
<body>
<div id="map"></div>
<script>
(function () {
  var OPEN_LABEL = ${JSON.stringify(openLabel)};
  function send(msg) {
    msg.source = 'viaclara-map';
    var data = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(data);
    else if (window.parent !== window) window.parent.postMessage(data, '*');
  }

  var map = new maplibregl.Map({
    container: 'map',
    style: ${JSON.stringify(MAP_STYLE_URL)},
    center: [-3.6907, 36.7339],
    zoom: 13,
    dragRotate: false,
    pitchWithRotate: false,
    attributionControl: { compact: true }
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  var markers = [];
  var lastKey = null;
  var lastJson = null;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function popupFor(p) {
    var root = el('div', 'popup');
    if (p.photo) {
      var img = el('img');
      img.src = p.photo;
      img.alt = '';
      root.appendChild(img);
    }
    var body = el('div', 'body');
    var status = el('span', 'status', p.statusLabel);
    status.style.background = p.color;
    body.appendChild(status);
    body.appendChild(el('p', 'title', p.title));
    body.appendChild(el('p', 'meta', p.address));
    var button = el('button', null, OPEN_LABEL);
    button.addEventListener('click', function () { send({ type: 'open', id: p.id }); });
    body.appendChild(button);
    root.appendChild(body);
    return new maplibregl.Popup({ offset: 16, closeButton: false, maxWidth: '240px' }).setDOMContent(root);
  }

  function setPoints(points, center) {
    // Re-renders on the host send identical data: keep the markers (and any
    // open popup) untouched.
    var json = JSON.stringify([points, center]);
    if (json === lastJson) return;
    lastJson = json;
    markers.forEach(function (m) { m.remove(); });
    markers = points.map(function (p) {
      var pin = el('div', 'pin');
      pin.style.background = p.color;
      return new maplibregl.Marker({ element: pin }).setLngLat([p.lng, p.lat]).setPopup(popupFor(p)).addTo(map);
    });

    // Only re-frame when the set of incidents changes (filters, municipality),
    // not on every data refresh, so the user's pan/zoom is kept.
    var key = points.map(function (p) { return p.id; }).sort().join(',') + '|' + center.lat + ',' + center.lng;
    if (key === lastKey) return;
    lastKey = key;
    if (points.length === 0) {
      map.jumpTo({ center: [center.lng, center.lat], zoom: 13 });
      return;
    }
    var bounds = new maplibregl.LngLatBounds();
    points.forEach(function (p) { bounds.extend([p.lng, p.lat]); });
    map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 0 });
  }

  window.viaclaraMap = { setPoints: setPoints };
  map.on('load', function () { send({ type: 'ready' }); });
})();
</script>
</body>
</html>`;
}
