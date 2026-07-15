// ViaClara — design system
// Designed for a 40+ audience: large typography, high contrast, labeled colors.

export const Colors = {
  // Brand: blue/turquoise (transparency + coastline)
  primary: '#3D69FE',
  primaryDark: '#2A4FD1',
  primarySoft: '#E7EDFF',
  accent: '#12B3AE',

  // Text
  text: '#17194B',
  textMuted: '#7D7E88',
  textInverse: '#FFFFFF',

  // Surfaces
  background: '#FAFAFC',
  surface: '#FFFFFF',
  border: '#EEEEEE',
  borderStrong: '#E7E7E7',

  // Feedback
  danger: '#F24545',
  warning: '#F2A415',
  success: '#00A854',
  slate: '#4B4C60',
} as const;

// Incident workflow states.
// Main track: submitted -> open -> in_progress -> resolved
// Alternative terminal branch: declined
export type IncidentStatus =
  | 'submitted'
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'declined';

export const STATUS_CONFIG: Record<
  IncidentStatus,
  { label: string; color: string; icon: string; description: string }
> = {
  submitted: {
    label: 'Registrada',
    color: Colors.textMuted,
    icon: 'document-text',
    description: 'Hemos recibido tu aviso. En breve lo revisará el ayuntamiento.',
  },
  open: {
    label: 'Abierta',
    color: Colors.danger,
    icon: 'alert-circle',
    description: 'El ayuntamiento ha validado el aviso y está pendiente de asignar.',
  },
  in_progress: {
    label: 'En curso',
    color: Colors.warning,
    icon: 'construct',
    description: 'El ayuntamiento ya está trabajando en resolverlo.',
  },
  resolved: {
    label: 'Resuelta',
    color: Colors.success,
    icon: 'checkmark-circle',
    description: '¡Solucionado! Gracias por ayudar a mejorar tu municipio.',
  },
  declined: {
    label: 'Declinada',
    color: Colors.slate,
    icon: 'remove-circle',
    description: 'El ayuntamiento no puede atender este aviso. Toca para ver el motivo.',
  },
};

// Main track order, for the progress bar.
export const STATUS_WORKFLOW_ORDER: IncidentStatus[] = [
  'submitted',
  'open',
  'in_progress',
  'resolved',
];

// Incident categories (Ionicons icon names).
export type IncidentCategory =
  | 'lighting'
  | 'road'
  | 'cleaning'
  | 'furniture'
  | 'green_areas'
  | 'other';

export const CATEGORY_CONFIG: Record<
  IncidentCategory,
  { label: string; icon: string; color: string }
> = {
  lighting: { label: 'Alumbrado', icon: 'bulb', color: '#F59F00' },
  road: { label: 'Calzada', icon: 'warning', color: '#E8590C' },
  cleaning: { label: 'Limpieza', icon: 'trash', color: '#2F9E44' },
  furniture: { label: 'Mobiliario', icon: 'hammer', color: '#9C36B5' },
  green_areas: { label: 'Zonas verdes', icon: 'leaf', color: '#37B24D' },
  other: { label: 'Otros', icon: 'ellipsis-horizontal', color: '#5B6B7B' },
};

// Spacing and typography scale (generous, designed for a 40+ audience).
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

// Size scale aligned with the mockup (13-14px body, not 17-19px).
export const Font = {
  small: 12,
  body: 14,
  bodyLg: 15,
  subtitle: 16,
  title: 20,
  hero: 26,
} as const;

// Type families (Poppins for text/titles, Epilogue for
// labels/chips/stats in small caps). Loaded via useFonts in _layout.tsx.
export const FontFamily = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extrabold: 'Poppins_800ExtraBold',
  labelMedium: 'Epilogue_500Medium',
  labelSemibold: 'Epilogue_600SemiBold',
  labelBold: 'Epilogue_700Bold',
} as const;

export const Shadow = {
  card: {
    shadowColor: '#0A2A33',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;
