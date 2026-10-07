import { lazy, Suspense, type ComponentProps } from 'react';

const IncidentMap = lazy(() => import('./IncidentMap'));

// MapLibre is ~800 kB: only download it when a map is actually shown.
export function LazyIncidentMap(props: ComponentProps<typeof IncidentMap>) {
  return (
    <Suspense fallback={<div className={props.className ?? 'incident-map'} />}>
      <IncidentMap {...props} />
    </Suspense>
  );
}
