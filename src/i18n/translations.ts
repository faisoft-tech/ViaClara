// Settings §6: interface language. Minimal dictionary for the UI "chrome" text
// (navigation, settings, system screens). User-generated content (report titles,
// comments, descriptions) is not translated: it's free text entered by real
// people, not interface.
export const translations = {
  es: {
    tabHome: 'Inicio',
    tabMyReports: 'Mis avisos',
    tabCreate: 'Crear incidencia',

    signupNameTitle: '¿Cómo quieres que te llamen?',
    signupNameBody: 'Así te verán el resto de vecinos en tus avisos y comentarios.',
    signupNamePlaceholder: 'Nombre público',
    signupNameCta: 'Continuar',

    settingsNotifications: 'Notificaciones',
    settingsBlur: 'Difuminar caras y matrículas',
    settingsLanguage: 'Idioma',
    settingsPrivacy: 'Privacidad y datos',
    settingsHelp: 'Ayuda',
    settingsInvite: 'Invitar a amigos',
    logOut: 'Cerrar sesión',

    notifPanelTitle: 'Notificaciones',
    notifPanelEmpty: 'No tienes notificaciones todavía.',
    notifPanelMarkAll: 'Marcar todas como leídas',

    notifPrefsTitle: 'Preferencias de notificación',
    notifPrefLikes: 'Nuevos me gusta',
    notifPrefComments: 'Nuevos comentarios',
    notifPrefFollowers: 'Nuevos seguidores de un aviso',
    notifPrefStatusChanges: 'Cambios de estado de un aviso',
    notifPrefReactivation: 'Solicitudes de reactivación',
    notifPrefConfirmation: 'Confirmaciones tras el cierre',

    helpTitle: 'Ayuda',
    helpFaq: 'Preguntas frecuentes',
    helpCenter: 'Centro de ayuda del sistema',
    helpReportBug: 'Reportar un error o fallo',
    helpContact: 'Contacto del ayuntamiento',
    helpHowItWorks: 'Cómo funciona ViaClara',
    helpHowItWorksText:
      'Reporta un problema con una foto y su ubicación, tu ayuntamiento lo revisa y lo resuelve, y tú confirmas cuando esté solucionado. Cuanto más participas, más sube tu nivel de vecino.',

    privacyTitle: 'Privacidad y datos',
    privacyTerms: 'Términos de uso',
    privacyPolicy: 'Política de privacidad',
    privacyNotAvailable: 'Documento no disponible en esta demo.',
  },
  en: {
    tabHome: 'Home',
    tabMyReports: 'My reports',
    tabCreate: 'Report issue',

    signupNameTitle: 'What should we call you?',
    signupNameBody: 'This is how other neighbours will see you on your reports and comments.',
    signupNamePlaceholder: 'Public name',
    signupNameCta: 'Continue',

    settingsNotifications: 'Notifications',
    settingsBlur: 'Blur faces and plates',
    settingsLanguage: 'Language',
    settingsPrivacy: 'Privacy and data',
    settingsHelp: 'Help',
    settingsInvite: 'Invite friends',
    logOut: 'Log out',

    notifPanelTitle: 'Notifications',
    notifPanelEmpty: "You don't have any notifications yet.",
    notifPanelMarkAll: 'Mark all as read',

    notifPrefsTitle: 'Notification preferences',
    notifPrefLikes: 'New likes',
    notifPrefComments: 'New comments',
    notifPrefFollowers: 'New followers on a report',
    notifPrefStatusChanges: 'Status changes on a report',
    notifPrefReactivation: 'Reactivation requests',
    notifPrefConfirmation: 'Confirmations after closing',

    helpTitle: 'Help',
    helpFaq: 'Frequently asked questions',
    helpCenter: 'System help centre',
    helpReportBug: 'Report a bug or issue',
    helpContact: 'Council contact info',
    helpHowItWorks: 'How ViaClara works',
    helpHowItWorksText:
      'Report a problem with a photo and its location, your council reviews and resolves it, and you confirm once it is fixed. The more you take part, the higher your neighbour level.',

    privacyTitle: 'Privacy and data',
    privacyTerms: 'Terms of use',
    privacyPolicy: 'Privacy policy',
    privacyNotAvailable: 'Document not available in this demo.',
  },
} as const;

export type TranslationKey = keyof (typeof translations)['es'];
