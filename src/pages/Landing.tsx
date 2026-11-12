/**
 * `/about`: the public page about Shareboard. No account, no board store: it
 * shows what the app does (every feature as a working demo), that it is open
 * source, and sends the visitor into the app (`/`), onto a board by code, or to
 * the Android APK. `/terminos` shares its nav, footer and world.
 *
 * Its look is its own, apart from the app's chrome: a dark product page whose
 * only texture is the board's dot grid (landing.css). Copy lives here rather
 * than in `strings.ts` because no app screen uses it.
 */
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AndroidLogoIcon,
  AppleLogoIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  CheckIcon,
  CopyIcon,
  CursorIcon,
  DesktopIcon,
  DownloadSimpleIcon,
  EyeIcon,
  GithubLogoIcon,
  GlobeSimpleIcon,
  LockSimpleIcon,
  MoonIcon,
  NoteBlankIcon,
  PencilSimpleIcon,
  PlusIcon,
  ShapesIcon,
  SparkleIcon,
  SunIcon,
  TextTIcon,
  TrashIcon,
  XLogoIcon,
} from '@phosphor-icons/react';

import { useToggleLang } from '../features/i18n';
import { useSessionStore } from '../features/session';
import { WEB_BASE_URL } from '../lib/config';
import { encodeQr } from '../lib/qr';
import { isValidShortCode, normalizeShortCode, SHORT_CODE_LENGTH } from '../lib/short-code';
import './landing.css';

export const LINKS = {
  apk: 'https://github.com/Juan17la/shareboard_mobile/releases/latest',
  web: 'https://github.com/Juan17la/shareboard_web',
  mobile: 'https://github.com/Juan17la/shareboard_mobile',
  server: 'https://github.com/Juan17la/shareboard_server',
  license: 'https://github.com/Juan17la/shareboard_web/blob/HEAD/LICENSE',
  issues: 'https://github.com/Juan17la/shareboard_web/issues',
  github: 'https://github.com/Juan17la',
  x: 'https://x.com/1714jud',
};

const COPY = {
  es: {
    title: 'Shareboard: pizarra colaborativa en vivo, gratis y de código abierto',
    nav: { features: 'Funciones', how: 'Cómo funciona', oss: 'Código abierto', faq: 'Preguntas', open: 'Abrir app' },
    langSwitch: 'Switch to English',
    themeSwitch: { system: 'Tema: sistema', light: 'Tema: claro', dark: 'Tema: oscuro' },
    h1a: 'Dibujen juntos.',
    h1b: 'Compartan un código.',
    lead: 'Shareboard es una pizarra que abre lista para dibujar. Envía seis caracteres y todos dibujan en la misma pizarra, en vivo, desde el navegador o Android. Sin crear cuenta.',
    openApp: 'Abrir Shareboard',
    codeLabel: 'Código de pizarra',
    codePlaceholder: 'K7Q2XM',
    join: 'Entrar',
    codeError: 'Son 6 letras o números, sin 0, 1, I, L, O ni U.',
    apk: 'Descargar APK para Android',
    facts: ['Navegador, Android, iPhone y iPad', 'Sin cuenta para empezar', 'Funciona sin conexión', 'Código abierto · MIT'],
    board: {
      title: 'Sprint de diseño',
      live: 'Pizarra de práctica · personas de ejemplo',
      demo: 'Ejemplo',
      share: 'Compartir',
      you: 'Tú',
      hint: 'Dibuja aquí: eres «Tú»',
      label: 'Pizarra de práctica con tres personas de ejemplo dibujando. Dibuja con el ratón o el dedo.',
      idea: 'Lluvia de ideas',
      proto: 'Prototipo',
      vote: '¡Votemos!',
      pens: 'Color de tu lápiz',
      clear: 'Borrar tus trazos',
      tools: ['Seleccionar', 'Lápiz', 'Figuras', 'Flecha', 'Nota', 'Texto'],
    },
    howTitle: 'Tres pasos. Ninguna cuenta.',
    how: [
      ['Ábrela', 'Entras directo a una pizarra. La primera vive en tu dispositivo y funciona sin internet.'],
      ['Dibuja', 'Lápiz, figuras, flechas, notas, texto e imágenes en un lienzo infinito.'],
      ['Comparte', 'Toca Compartir y envía el código, el enlace o el QR. Quien lo abra dibuja contigo.'],
    ],
    qr: 'Escanéalo con el teléfono para abrir Shareboard',
    featTitle: 'Todo lo que una clase necesita en una pizarra.',
    featLead: 'Cada recuadro de abajo funciona: arrastra, toca y prueba.',
    f: {
      liveT: 'En vivo, juntos',
      liveB: 'Cada trazo aparece para todos un instante después, con el cursor y el nombre de quien dibuja.',
      present: '3 en la pizarra',
      arrowT: 'Flechas que no se sueltan',
      arrowB: 'Las flechas se pegan a las figuras y las siguen. Arrastra la caja.',
      arrowLabel: 'Caja arrastrable unida por una flecha a un círculo. Usa las flechas del teclado para moverla.',
      shapeT: 'Mantén para dar forma',
      shapeB: 'Garabatea una caja, quédate quieto un momento y se vuelve una figura limpia.',
      aiT: 'Dibuja con IA',
      aiB: 'Describe lo que quieres y recibe un dibujo editable, con vista previa.',
      aiPrompt: 'un diagrama de flujo para iniciar sesión',
      privT: 'Privada si quieres',
      privB: 'Pública o con un PIN de 4 dígitos. Tú decides quién edita y quién solo mira.',
      public: 'Pública',
      pin: 'Con PIN',
      edit: 'Pueden editar',
      view: 'Solo ver',
      expT: 'Exporta sin perder nada',
      expB: 'PNG, JPG, SVG o JSON. Una imagen de Shareboard se vuelve a importar editable.',
      reimport: 'Se vuelve a importar editable',
      tplT: 'Plantillas para empezar',
      tplB: 'Una plantilla lista en el centro de la pantalla, o junto a lo que ya hay.',
      templates: ['Lluvia de ideas', 'Retro', 'Diagrama de flujo', 'Kanban', 'Mapa mental'],
    },
    moreTitle: 'Y además',
    more: [
      ['Lienzo infinito', 'Zoom de 10 % a 2000 %, y la pizarra abre encuadrada.'],
      ['Deshacer 100 pasos', 'Y solo deshace lo tuyo, nunca lo de otros.'],
      ['Resaltador y láser', 'Resalta sin tapar, o señala con un rastro que todos ven.'],
      ['15 puntas de flecha', 'Incluidas las de diagramas de bases de datos.'],
      ['Rutas rectas, curvas o en codo', 'Y las flechas en codo rodean las figuras.'],
      ['Texto en todo', 'Etiquetas dentro de figuras y a lo largo de las líneas.'],
      ['Notas y puntos de voto', 'Notas adhesivas de colores y un punto con tu color.'],
      ['Agrupar y ordenar', 'Copia, pega y duplica, incluso entre pizarras.'],
      ['Pizarra clara u oscura', 'Con o sin cuadrícula de puntos.'],
      ['Atajos de teclado', 'Una tecla por herramienta en la web.'],
    ],
    getTitle: 'En el navegador y en Android.',
    getLead: 'Dibuja desde el computador o el teléfono: cualquier pizarra se abre en los dos con su código.',
    shotDesktop: 'Shareboard en el navegador: un tablero de sprint con figuras, flechas y notas adhesivas',
    shotPhone: 'Shareboard en Android: un mapa mental en la pizarra',
    webT: 'Navegador',
    webB: 'Computadores, iPhone y iPad. Nada que instalar.',
    androidT: 'Android',
    androidSteps: [
      'Descarga el APK de la última versión.',
      'Permite que tu navegador instale apps. Aún no está en Play Store.',
      'Toca Instalar y luego Abrir. La app te avisa de cada versión nueva.',
    ],
    iosT: 'iPhone y iPad',
    iosB: 'Usa la versión web: hace todo lo que hace la app.',
    ossTitle: 'Código abierto. De verdad.',
    ossLead: 'La web, la app de Android y el servidor son públicos en GitHub bajo licencia MIT. Léelo, aprende de él, úsalo o mejóralo.',
    ossGithub: 'Ver en GitHub',
    ossLicense: 'Leer la licencia MIT',
    ossIssue: 'Reportar un problema',
    repos: [
      ['shareboard_web', 'La app web', 'React 19 · Vite · Tailwind'],
      ['shareboard_mobile', 'La app de Android', 'Expo · React Native · Skia'],
      ['shareboard_server', 'Tiempo real y pizarras', 'Fastify · WebSocket · MongoDB'],
    ],
    copy: 'Copiar comando',
    copied: 'Copiado',
    faqTitle: 'Preguntas rápidas',
    faq: [
      ['¿Necesito una cuenta?', 'Para empezar, no. Shareboard la pide solo cuando compartir la necesita, y te dice por qué. Tus pizarras de invitado pasan a tu cuenta.'],
      ['¿Cuánto cuesta?', 'Nada. Shareboard es gratis y su código es abierto, con licencia MIT.'],
      ['¿Quién ve mi pizarra?', 'Tu primera pizarra vive solo en tu dispositivo. Una pizarra compartida la ve quien tenga el código o el enlace; puedes ponerle PIN y decidir quién edita.'],
      ['¿Funciona sin internet?', 'Tu pizarra local sí. Compartir y dibujar con otros necesita conexión.'],
      ['¿Hay app para iPhone?', 'No. En iPhone y iPad usa la versión web, que hace lo mismo.'],
      ['¿Web y Android se mezclan?', 'Sí. Una pizarra se abre en los dos con el mismo código, y todos dibujan juntos.'],
      ['¿Cómo funciona la IA?', 'Describes un dibujo y Shareboard lo genera como figuras editables. Tu texto se envía a un proveedor de IA para hacerlo.'],
      ['¿Puedo contribuir?', 'Sí. Abre un issue o un pull request en GitHub; el código está para eso.'],
    ],
    endTitle: 'Tu próxima idea cabe en una pizarra.',
    endLead: 'Ábrela ahora. Compártela cuando quieras.',
    footer: {
      blurb: 'Una pizarra colaborativa para dibujar en equipo, en vivo, desde cualquier dispositivo.',
      product: 'Producto',
      oss: 'Código abierto',
      legal: 'Legal',
      follow: 'Sígueme',
      terms: 'Términos de uso',
      privacy: 'Privacidad',
      license: 'Licencia MIT',
      made: 'Hecho por',
      rights: 'Software libre bajo licencia MIT.',
    },
  },
  en: {
    title: 'Shareboard: a live collaborative whiteboard, free and open source',
    nav: { features: 'Features', how: 'How it works', oss: 'Open source', faq: 'FAQ', open: 'Open app' },
    langSwitch: 'Cambiar a español',
    themeSwitch: { system: 'Theme: system', light: 'Theme: light', dark: 'Theme: dark' },
    h1a: 'Draw together.',
    h1b: 'Share a code.',
    lead: 'Shareboard is a whiteboard that opens ready to draw. Send six characters and everyone draws on the same board, live, from the browser or Android. No account needed.',
    openApp: 'Open Shareboard',
    codeLabel: 'Board code',
    codePlaceholder: 'K7Q2XM',
    join: 'Join',
    codeError: "That's 6 letters or digits, without 0, 1, I, L, O or U.",
    apk: 'Download the Android APK',
    facts: ['Browser, Android, iPhone and iPad', 'No account to start', 'Works offline', 'Open source · MIT'],
    board: {
      title: 'Design sprint',
      live: 'Practice board · example people',
      demo: 'Example',
      share: 'Share',
      you: 'You',
      hint: 'Draw here: you are “You”',
      label: 'Practice board with three example people drawing. Draw with your mouse or finger.',
      idea: 'Brainstorm',
      proto: 'Prototype',
      vote: "Let's vote!",
      pens: 'Your pen colour',
      clear: 'Clear your strokes',
      tools: ['Select', 'Pencil', 'Shapes', 'Arrow', 'Note', 'Text'],
    },
    howTitle: 'Three steps. No account.',
    how: [
      ['Open it', 'You land straight on a board. Your first one lives on your device and works offline.'],
      ['Draw', 'Pencil, shapes, arrows, sticky notes, text and pictures on an infinite canvas.'],
      ['Share', 'Press Share and send the code, the link or the QR. Whoever opens it draws with you.'],
    ],
    qr: 'Scan it with your phone to open Shareboard',
    featTitle: 'Everything a class needs on one board.',
    featLead: 'Every tile below works: drag, tap and try.',
    f: {
      liveT: 'Live, together',
      liveB: 'Every stroke shows up for everyone a moment later, with the cursor and name of whoever draws it.',
      present: '3 on the board',
      arrowT: 'Arrows that stay connected',
      arrowB: 'Arrows snap to figures and follow them. Drag the box.',
      arrowLabel: 'A draggable box joined by an arrow to a circle. Use the arrow keys to move it.',
      shapeT: 'Hold to shape',
      shapeB: 'Scribble a rough box, hold still for a moment, and it becomes a clean figure.',
      aiT: 'Draw with AI',
      aiB: 'Describe what you want and get an editable drawing, with a preview first.',
      aiPrompt: 'a flowchart for signing in',
      privT: 'Private when you want',
      privB: 'Public, or protected with a 4-digit PIN. You choose who edits and who only watches.',
      public: 'Public',
      pin: 'With PIN',
      edit: 'Can edit',
      view: 'View only',
      expT: 'Exports that stay editable',
      expB: 'PNG, JPG, SVG or JSON. A Shareboard picture imports back fully editable.',
      reimport: 'Imports back editable',
      tplT: 'Templates to start from',
      tplB: 'A ready-made layout in the middle of the screen, or next to what is already there.',
      templates: ['Brainstorm', 'Retro', 'Flowchart', 'Kanban', 'Mind map'],
    },
    moreTitle: 'And also',
    more: [
      ['Infinite canvas', 'Zoom from 10 % to 2,000 %, and boards open framed.'],
      ['100 steps of undo', 'And it only undoes yours, never anyone else’s.'],
      ['Highlighter and laser', 'Highlight without hiding, or point with a trail everyone sees.'],
      ['15 arrow ends', 'Including the crow’s-foot marks of database diagrams.'],
      ['Straight, curved or elbow', 'Elbow arrows route around figures.'],
      ['Text on everything', 'Labels inside figures and along lines.'],
      ['Notes and vote dots', 'Coloured sticky notes and a dot in your colour.'],
      ['Group and arrange', 'Copy, paste and duplicate, even across boards.'],
      ['Light or dark board', 'With or without the dot grid.'],
      ['Keyboard shortcuts', 'One key per tool on the web.'],
    ],
    getTitle: 'In the browser and on Android.',
    getLead: 'Draw from a laptop or a phone: any board opens on both with its code.',
    shotDesktop: 'Shareboard in the browser: a sprint board with shapes, arrows and sticky notes',
    shotPhone: 'Shareboard on Android: a mind map on the board',
    webT: 'Browser',
    webB: 'Laptops, iPhone and iPad. Nothing to install.',
    androidT: 'Android',
    androidSteps: [
      'Download the APK from the latest release.',
      "Let your browser install apps. It isn't on the Play Store yet.",
      'Tap Install, then Open. The app tells you about each new version.',
    ],
    iosT: 'iPhone and iPad',
    iosB: 'Use the web version: it does everything the app does.',
    ossTitle: 'Open source. For real.',
    ossLead: 'The web app, the Android app and the server are public on GitHub under the MIT licence. Read it, learn from it, use it or improve it.',
    ossGithub: 'View on GitHub',
    ossLicense: 'Read the MIT licence',
    ossIssue: 'Report an issue',
    repos: [
      ['shareboard_web', 'The web app', 'React 19 · Vite · Tailwind'],
      ['shareboard_mobile', 'The Android app', 'Expo · React Native · Skia'],
      ['shareboard_server', 'Realtime and boards', 'Fastify · WebSocket · MongoDB'],
    ],
    copy: 'Copy command',
    copied: 'Copied',
    faqTitle: 'Quick answers',
    faq: [
      ['Do I need an account?', 'Not to start. Shareboard asks for one only when sharing needs it, and says why. Your guest boards move into your account.'],
      ['How much does it cost?', 'Nothing. Shareboard is free and its code is open source under the MIT licence.'],
      ['Who can see my board?', 'Your first board lives only on your device. A shared board is visible to whoever has its code or link; you can add a PIN and choose who edits.'],
      ['Does it work offline?', 'Your local board does. Sharing and drawing with others needs a connection.'],
      ['Is there an iPhone app?', 'No. On iPhone and iPad, use the web version; it does the same.'],
      ['Do web and Android boards mix?', 'Yes. A board opens on both with the same code, and everyone draws together.'],
      ['How does the AI work?', 'You describe a drawing and Shareboard generates it as editable shapes. Your text is sent to an AI provider to do it.'],
      ['Can I contribute?', "Yes. Open an issue or a pull request on GitHub; that's what the code is there for."],
    ],
    endTitle: 'Your next idea fits on a board.',
    endLead: 'Open one now. Share it whenever you like.',
    footer: {
      blurb: 'A collaborative whiteboard for drawing together, live, from any device.',
      product: 'Product',
      oss: 'Open source',
      legal: 'Legal',
      follow: 'Follow me',
      terms: 'Terms of use',
      privacy: 'Privacy',
      license: 'MIT licence',
      made: 'Made by',
      rights: 'Free software under the MIT licence.',
    },
  },
} as const;

type Copy = (typeof COPY)[keyof typeof COPY];

const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Mona+Sans:wdth,wght@75..125,200..900&display=swap';

// The public pages follow the system theme until the visitor picks one here.
// Kept apart from the app's own theme (session store): this page is a different world.
type LpPref = 'system' | 'light' | 'dark';
const LP_KEY = 'shareboard.lp-theme';
const lpListeners = new Set<() => void>();
const lightQuery = () => window.matchMedia('(prefers-color-scheme: light)');
let lpPref: LpPref = (() => {
  try {
    const v = localStorage.getItem(LP_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
})();

function setLpPref(next: LpPref) {
  lpPref = next;
  try {
    if (next === 'system') localStorage.removeItem(LP_KEY);
    else localStorage.setItem(LP_KEY, next);
  } catch {
    /* private mode: the choice lasts until reload */
  }
  lpListeners.forEach((l) => l());
}

function subscribeLp(l: () => void) {
  lpListeners.add(l);
  const q = lightQuery();
  q.addEventListener('change', l);
  return () => {
    lpListeners.delete(l);
    q.removeEventListener('change', l);
  };
}

/** The saved choice and what it resolves to right now; `system` follows the OS live. */
export function useLpTheme() {
  const pref = useSyncExternalStore(subscribeLp, () => lpPref);
  const resolved = useSyncExternalStore(subscribeLp, () =>
    lpPref === 'system' ? (lightQuery().matches ? 'light' : 'dark') : lpPref,
  );
  return { pref, resolved };
}

const NEXT_PREF: Record<LpPref, LpPref> = { system: 'light', light: 'dark', dark: 'system' };

/** Shared by /about and /terminos: the display face, the colour scheme, the title. Returns the theme to put on `.lp`. */
export function usePublicPage(title: string) {
  const { resolved } = useLpTheme();
  useEffect(() => {
    document.title = title;
  }, [title]);
  useEffect(() => {
    if (!document.querySelector(`link[href="${FONT_HREF}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONT_HREF;
      document.head.appendChild(link);
    }
    // Page chrome (scrollbars, form controls) follows the resolved theme too.
    const root = document.documentElement;
    const prev = root.style.colorScheme;
    root.style.colorScheme = resolved;
    return () => {
      root.style.colorScheme = prev;
    };
  }, [resolved]);
  return resolved;
}

export function usePublicCopy() {
  const lang = useSessionStore((s) => s.lang);
  return { lang, c: COPY[lang], toggleLang: useToggleLang() };
}

export default function LandingPage() {
  const { c } = usePublicCopy();
  const theme = usePublicPage(c.title);
  const { hash } = useLocation();
  const scroller = useRef<HTMLDivElement>(null);

  // Arriving from /terminos with a #section: jump to it once it exists.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div ref={scroller} data-lp={theme} className="lp h-full overflow-y-auto [scroll-behavior:smooth] motion-reduce:[scroll-behavior:auto]">
      <SiteNav base="" />
      <main id="top">
        <Hero c={c} />
        <How c={c} />
        <Features c={c} />
        <Platforms c={c} />
        <OpenSource c={c} />
        <Faq c={c} />
        <Closing c={c} />
      </main>
      <SiteFooter base="" />
    </div>
  );
}

// --- Chrome shared with /terminos -------------------------------------------

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 text-[1.0625rem] font-extrabold tracking-[-0.02em] ${className}`}>
      <img src="/favicon.png" alt="" width={28} height={28} className="h-7 w-7 rounded-[8px]" />
      Shareboard
    </span>
  );
}

const PILL_WHITE =
  'inline-flex items-center justify-center gap-2 rounded-full bg-(--lp-ink) font-semibold text-(--lp-bg) transition hover:bg-(--lp-ink-hover) active:scale-[0.98]';
const PILL_GHOST =
  'inline-flex items-center justify-center gap-2 rounded-full border border-(--lp-line-2) font-semibold text-(--lp-ink) transition hover:border-(--lp-stroke-2) hover:bg-(--lp-wash) active:scale-[0.98]';

export function SiteNav({ base }: { base: string }) {
  const { lang, c, toggleLang } = usePublicCopy();
  const { pref } = useLpTheme();
  const ThemeIcon = pref === 'system' ? DesktopIcon : pref === 'light' ? SunIcon : MoonIcon;
  const links: [string, string][] = [
    ['features', c.nav.features],
    ['how', c.nav.how],
    ['open-source', c.nav.oss],
    ['faq', c.nav.faq],
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-(--lp-line) bg-(--lp-bg)/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-3 px-4 sm:px-8">
        <Link to={base ? '/about' : '#top'} reloadDocument={false} className="rounded-lg" onClick={(e) => {
          if (!base) {
            e.preventDefault();
            document.getElementById('top')?.scrollIntoView();
          }
        }}>
          <Wordmark className="mr-1" />
        </Link>
        <div className="hidden items-center gap-1 lg:flex">
          {links.map(([id, label]) => (
            <a
              key={id}
              href={`${base}#${id}`}
              className="rounded-full px-3.5 py-2 text-[0.9375rem] font-medium text-(--lp-ink-2) transition hover:text-(--lp-ink)"
            >
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={toggleLang}
            aria-label={c.langSwitch}
            className="min-h-10 rounded-full px-1.5 font-mono text-[0.8125rem] sm:px-3 font-bold tracking-[1px] text-(--lp-ink-2) transition hover:text-(--lp-ink)"
          >
            <span className={lang === 'es' ? 'text-(--lp-ink)' : ''}>ES</span>
            <span aria-hidden="true" className="mx-1 opacity-40">/</span>
            <span className={lang === 'en' ? 'text-(--lp-ink)' : ''}>EN</span>
          </button>
          <button
            type="button"
            onClick={() => setLpPref(NEXT_PREF[pref])}
            aria-label={c.themeSwitch[pref]}
            title={c.themeSwitch[pref]}
            className="flex h-10 w-10 items-center justify-center rounded-full text-(--lp-ink-2) transition hover:bg-(--lp-wash) hover:text-(--lp-ink)"
          >
            <ThemeIcon size={20} weight="bold" />
          </button>
          <a
            href={LINKS.web}
            aria-label="GitHub"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-(--lp-ink-2) transition hover:bg-(--lp-wash) hover:text-(--lp-ink) sm:flex"
          >
            <GithubLogoIcon size={20} weight="fill" />
          </a>
          <Link to="/" className={`${PILL_WHITE} h-10 px-3 text-[0.875rem] whitespace-nowrap sm:px-4`}>
            {c.nav.open}
            <ArrowRightIcon size={15} weight="bold" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter({ base }: { base: string }) {
  const { lang, c, toggleLang } = usePublicCopy();
  const f = c.footer;
  const col = (title: string, items: [string, string, boolean?][]) => (
    <div>
      <h2 className="text-[0.8125rem] font-semibold text-(--lp-ink-3)">{title}</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map(([label, href, internal]) => (
          <li key={label}>
            {internal ? (
              <Link to={href} className="text-[0.9375rem] text-(--lp-ink-2) transition hover:text-(--lp-ink)">
                {label}
              </Link>
            ) : (
              <a href={href} className="text-[0.9375rem] text-(--lp-ink-2) transition hover:text-(--lp-ink)">
                {label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <footer className="border-t border-(--lp-line) bg-(--lp-bg)">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-4 pt-16 pb-10 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-[22rem]">
          <Wordmark className="mr-1" />
          <p className="mt-4 text-[0.9375rem] leading-[1.55] text-(--lp-ink-2)">{f.blurb}</p>
          <h2 className="mt-8 text-[0.8125rem] font-semibold text-(--lp-ink-3)">{f.follow}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Social href={LINKS.x} icon={<XLogoIcon size={18} weight="bold" />} label="@1714jud" sr="X" />
            <Social href={LINKS.github} icon={<GithubLogoIcon size={18} weight="fill" />} label="Juan17la" sr="GitHub" />
          </div>
        </div>
        {col(f.product, [
          [c.openApp, '/', true],
          [c.nav.features, `${base}#features`],
          [c.nav.how, `${base}#how`],
          [c.nav.faq, `${base}#faq`],
          ['Android APK', LINKS.apk],
        ])}
        {col(f.oss, [
          ['shareboard_web', LINKS.web],
          ['shareboard_mobile', LINKS.mobile],
          ['shareboard_server', LINKS.server],
          [f.license, LINKS.license],
        ])}
        {col(f.legal, [
          [f.terms, '/terminos', true],
          [f.privacy, '/terminos#privacidad', true],
        ])}
      </div>
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 border-t border-(--lp-line) px-4 py-6 text-[0.8125rem] text-(--lp-ink-3) sm:px-8">
        <p>
          © 2026 Shareboard. {f.rights} {f.made}{' '}
          <a href={LINKS.github} className="text-(--lp-ink-2) underline decoration-(--lp-stroke) underline-offset-4 hover:text-(--lp-ink)">
            Juan17la
          </a>
          .
        </p>
        <button type="button" onClick={toggleLang} aria-label={c.langSwitch} className="font-mono font-bold tracking-[1px] hover:text-(--lp-ink)">
          {lang === 'es' ? 'English' : 'Español'}
        </button>
      </div>
    </footer>
  );
}

function Social({ href, icon, label, sr }: { href: string; icon: ReactNode; label: string; sr: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-10 items-center gap-2 rounded-full border border-(--lp-line-2) px-3.5 text-[0.875rem] font-semibold text-(--lp-ink) transition hover:border-(--lp-stroke-2) hover:bg-(--lp-wash)"
    >
      {icon}
      <span className="sr-only">{sr}: </span>
      {label}
    </a>
  );
}

// --- Hero -------------------------------------------------------------------

function Hero({ c }: { c: Copy }) {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden="true" className="lp-grid lp-grid-fade pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-[1240px] px-4 pt-10 sm:px-8 sm:pt-14">
        <h1 className="lp-display mx-auto max-w-[15ch] text-center text-[clamp(2.75rem,8.5vw,6rem)] leading-[0.95]">
          {c.h1a}{' '}
          <span className="relative whitespace-nowrap text-(--lp-blue)">
            {c.h1b}
            <svg aria-hidden="true" viewBox="0 0 400 24" preserveAspectRatio="none" className="absolute -bottom-[0.12em] left-0 h-[0.16em] w-full overflow-visible">
              <path className="lp-underline" pathLength={1} d="M4 16 C 90 4, 200 22, 396 8" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            </svg>
          </span>
        </h1>
        <p className="mx-auto mt-7 max-w-[40rem] text-center text-[1.0625rem] leading-[1.55] text-(--lp-ink-2) sm:text-[1.25rem]">{c.lead}</p>

        <div className="mx-auto mt-8 flex max-w-[44rem] flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-center">
          {isAndroid ? (
            <a href={LINKS.apk} className={`${PILL_WHITE} h-13 px-6 text-[1rem]`}>
              <DownloadSimpleIcon size={18} weight="bold" />
              {c.apk}
            </a>
          ) : (
            <Link to="/" className={`${PILL_WHITE} h-13 px-6 text-[1rem]`}>
              {c.openApp}
              <ArrowRightIcon size={17} weight="bold" />
            </Link>
          )}
          <JoinForm c={c} />
        </div>
        {isAndroid ? null : (
          <p className="mt-4 text-center">
            <a href={LINKS.apk} className="inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-(--lp-ink-2) underline decoration-(--lp-stroke) underline-offset-4 hover:text-(--lp-ink)">
              <AndroidLogoIcon size={17} weight="fill" />
              {c.apk}
            </a>
          </p>
        )}

        <HeroBoard c={c} />
      </div>
      <ul className="relative mx-auto flex max-w-[1240px] flex-wrap justify-center gap-x-8 gap-y-3 px-4 py-10 text-[0.9375rem] text-(--lp-ink-2) sm:px-8">
        {c.facts.map((fact) => (
          <li key={fact} className="flex items-center gap-2">
            <CheckIcon size={16} weight="bold" className="text-(--lp-green)" />
            {fact}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A working way in: type a board's code and go to it (`/b/:code`). */
function JoinForm({ c }: { c: Copy }) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidShortCode(code)) return setError(true);
    navigate(`/b/${normalizeShortCode(code)}`);
  };
  return (
    <form onSubmit={submit} noValidate className="flex flex-col">
      <div
        className={`flex h-13 items-center rounded-full border bg-(--lp-panel) p-1 pl-5 transition focus-within:border-(--lp-blue) ${
          error ? 'border-(--lp-danger)' : 'border-(--lp-line-2)'
        }`}
      >
        <label htmlFor="lp-code" className="sr-only">
          {c.codeLabel}
        </label>
        <input
          id="lp-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(false);
          }}
          maxLength={SHORT_CODE_LENGTH + 2}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder={c.codePlaceholder}
          aria-invalid={error}
          aria-describedby={error ? 'lp-code-error' : undefined}
          className="w-full min-w-0 bg-transparent font-mono text-[1.0625rem] font-bold tracking-[2px] text-(--lp-ink) outline-none placeholder:text-(--lp-ink-3) sm:w-[8.5rem]"
          style={{ outline: 'none' }}
        />
        <button type="submit" className="h-11 flex-none rounded-full bg-(--lp-raise-2) px-5 text-[0.9375rem] font-semibold transition hover:bg-(--lp-raise-3)">
          {c.join}
        </button>
      </div>
      {error ? (
        <p id="lp-code-error" role="alert" className="mt-2 px-5 text-left text-[0.8125rem] font-medium text-(--lp-danger)">
          {c.codeError}
        </p>
      ) : null}
    </form>
  );
}

// The scripted scene, in the board's own coordinates (1200 × 640). Ana, Leo
// and Sofi are made up; they draw a small flowchart once every LOOP seconds.
const LOOP = 15;
const BLUE = 'var(--lp-blue)';
const GREEN = 'var(--lp-green)';
const ORANGE = 'var(--lp-orange)';
const VIOLET = 'var(--lp-violet)';
const SCRIBBLE = 'M262 212 C 330 200, 400 206, 452 214 C 460 250, 456 300, 452 338 C 380 346, 320 344, 256 336 C 252 296, 250 250, 266 206';
const ELLIPSE = 'M650 400 C 650 360, 700 334, 760 334 C 820 334, 870 360, 870 400 C 870 440, 820 466, 760 466 C 700 466, 650 440, 650 400';
const ARROW = 'M456 272 C 540 272, 580 400, 646 400';

type Move = { d: string; begin: number; dur: number };
const ACTORS: { name: string; color: string; moves: Move[] }[] = [
  {
    name: 'Ana',
    color: BLUE,
    moves: [
      { d: 'M120 90 L262 212', begin: 0.3, dur: 0.9 },
      { d: SCRIBBLE, begin: 1.2, dur: 1.6 },
      { d: 'M266 206 L300 140', begin: 4.2, dur: 1 },
    ],
  },
  {
    name: 'Leo',
    color: GREEN,
    moves: [
      { d: 'M1080 560 L650 400', begin: 0.4, dur: 1.2 },
      { d: ELLIPSE, begin: 1.7, dur: 1.4 },
      { d: 'M650 400 L456 272', begin: 3.4, dur: 0.9 },
      { d: ARROW, begin: 4.5, dur: 1 },
      { d: 'M646 400 L560 440', begin: 6, dur: 1 },
    ],
  },
  {
    name: 'Sofi',
    color: ORANGE,
    moves: [
      { d: 'M1100 80 L960 150', begin: 1, dur: 1.4 },
      { d: 'M960 150 L440 222', begin: 6.2, dur: 0.8 },
      { d: 'M440 222 L842 378', begin: 7.4, dur: 0.8 },
      { d: 'M842 378 L880 480', begin: 8.6, dur: 1.2 },
    ],
  },
];

function HeroBoard({ c }: { c: Copy }) {
  const svg = useRef<SVGSVGElement>(null);
  const [reduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [pen, setPen] = useState(VIOLET);
  const [strokes, setStrokes] = useState<{ color: string; d: string }[]>([]);
  const [live, setLive] = useState<{ color: string; d: string } | null>(null);
  const drawing = useRef<{ color: string; pts: string[] } | null>(null);

  // Loop the scene, and pause it while it is off screen.
  useEffect(() => {
    const el = svg.current;
    if (!el || reduced) return;
    el.setCurrentTime(0);
    const timer = setInterval(() => el.setCurrentTime(0), LOOP * 1000);
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? el.unpauseAnimations() : el.pauseAnimations()));
    io.observe(el);
    return () => {
      clearInterval(timer);
      io.disconnect();
    };
  }, [reduced]);

  const at = (e: ReactPointerEvent<SVGSVGElement>) => {
    const ctm = e.currentTarget.getScreenCTM();
    if (!ctm) return '0 0';
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return `${Math.round(p.x)} ${Math.round(p.y)}`;
  };
  const path = (pts: string[]) => (pts.length > 1 ? `M${pts[0]} L${pts.slice(1).join(' ')}` : `M${pts[0]} l0.1 0`);
  const down = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = { color: pen, pts: [at(e)] };
    setLive({ color: pen, d: path(drawing.current.pts) });
  };
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = drawing.current;
    if (!d) return;
    d.pts.push(at(e));
    setLive({ color: d.color, d: path(d.pts) });
  };
  const up = () => {
    const d = drawing.current;
    drawing.current = null;
    setLive(null);
    // ponytail: keeps every stroke in memory; cap it if anyone draws thousands.
    if (d) setStrokes((s) => [...s, { color: d.color, d: path(d.pts) }]);
  };

  const tools = [CursorIcon, PencilSimpleIcon, ShapesIcon, ArrowUpRightIcon, NoteBlankIcon, TextTIcon];

  return (
    <div className="relative mx-auto mt-10 max-w-[1120px] sm:mt-12">
      <div className="overflow-hidden rounded-[22px] border border-(--lp-line-2) bg-(--lp-panel) shadow-[0_40px_120px_-30px_var(--lp-shadow),0_0_0_1px_var(--lp-wash)]">
        {/* The app's header, as it looks on a shared board. */}
        <div className="flex h-14 items-center justify-between gap-3 border-b border-(--lp-line) px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="truncate text-[0.9375rem] font-semibold">{c.board.title}</span>
            <span className="flex flex-none items-center gap-1.5 text-[0.8125rem] text-(--lp-ink-2)">
              <span className="h-2 w-2 rounded-full border-2 border-(--lp-ink-3)" />
              <span className="max-sm:hidden">{c.board.live}</span>
              <span className="sm:hidden">{c.board.demo}</span>
            </span>
          </div>
          <div className="flex flex-none items-center gap-2 sm:gap-3">
            <div className="hidden -space-x-2 sm:flex" aria-hidden="true">
              {[...ACTORS.map((a) => [a.name, a.color]), [c.board.you, VIOLET]].map(([n, col]) => (
                <span key={n} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-(--lp-panel) text-[0.75rem] font-bold text-(--lp-bg)" style={{ background: col }}>
                  {n[0]}
                </span>
              ))}
            </div>
            <span className="flex h-9 items-center gap-2 rounded-full bg-(--lp-blue) pr-3 pl-1.5 font-mono text-[0.875rem] font-bold tracking-[1.5px] text-white">
              <span className="h-4 w-4 rounded-full border-[3px] border-white" />
              K7Q·2XM
            </span>
          </div>
        </div>

        <div className="lp-grid relative aspect-[5/4] sm:aspect-[15/8]">
          <svg
            ref={svg}
            role="img"
            aria-label={c.board.label}
            viewBox="0 0 1200 640"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 h-full w-full cursor-crosshair touch-none select-none"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          >
            <defs>
              <marker id="lp-head" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto">
                <path d="M1 1 L11 6 L1 11" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </marker>
            </defs>
            <g transform="translate(0 -70)">
              <Scene c={c} reduced={reduced} />
              {ACTORS.map((a) => (
                <Actor key={a.name} {...a} reduced={reduced} />
              ))}
            </g>
            {[...strokes, ...(live ? [live] : [])].map((s, i) => (
              <path key={i} d={s.d} fill="none" stroke={s.color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </svg>

          {/* Tool rail: only the pens are real, they colour your strokes. */}
          <div className="absolute top-1/2 left-3 hidden -translate-y-1/2 flex-col items-center gap-1 rounded-[16px] border border-(--lp-line-2) bg-(--lp-raise) p-1.5 sm:flex">
            {tools.map((T, i) => (
              <span key={i} title={c.board.tools[i]} className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${i === 1 ? 'bg-(--lp-blue) text-white' : 'text-(--lp-ink-2)'}`}>
                <T size={18} />
              </span>
            ))}
          </div>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-(--lp-line-2) bg-(--lp-raise) p-1" role="group" aria-label={c.board.pens}>
            {[VIOLET, 'var(--lp-ink)', '#ffe27a', 'var(--lp-danger)'].map((col) => (
              <button
                key={col}
                type="button"
                aria-label={col}
                aria-pressed={pen === col}
                onClick={() => setPen(col)}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition ${pen === col ? 'bg-(--lp-wash-2) ring-2 ring-(--lp-ink)' : 'hover:bg-(--lp-wash)'}`}
              >
                <span className="h-4.5 w-4.5 rounded-full" style={{ background: col }} />
              </button>
            ))}
            <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-(--lp-line-2)" />
            <button
              type="button"
              aria-label={c.board.clear}
              title={c.board.clear}
              disabled={!strokes.length}
              onClick={() => setStrokes([])}
              className="flex h-10 w-10 items-center justify-center rounded-full text-(--lp-ink-2) transition hover:bg-(--lp-wash) disabled:opacity-35"
            >
              <TrashIcon size={18} />
            </button>
          </div>
          <span className="pointer-events-none absolute top-3 right-3 hidden rounded-full border border-(--lp-line-2) bg-(--lp-raise) px-3 py-1.5 text-[0.8125rem] font-medium text-(--lp-ink-2) sm:block">
            {c.board.hint}
          </span>
          <span className="pointer-events-none absolute right-3 bottom-4 hidden font-mono text-[0.8125rem] font-bold text-(--lp-ink-3) sm:block">100 %</span>
        </div>
      </div>
    </div>
  );
}

const spline = { calcMode: 'spline', keyTimes: '0;1', keySplines: '0.45 0 0.2 1' } as const;

function Draw({ d, color, begin, dur, reduced, width = 6, marker }: { d: string; color: string; begin: number; dur: number; reduced: boolean; width?: number; marker?: string }) {
  const common = { d, fill: 'none', stroke: color, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round', markerEnd: marker } as const;
  if (reduced) return <path {...common} />;
  return (
    <path {...common} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1}>
      <animate attributeName="stroke-dashoffset" from="1" to="0" begin={`${begin}s`} dur={`${dur}s`} fill="freeze" {...spline} />
    </path>
  );
}

function Show({ begin, end, reduced, final = true, children }: { begin: number; end?: number; reduced: boolean; final?: boolean; children: ReactNode }) {
  if (reduced) return final ? <g>{children}</g> : null;
  return (
    <g opacity={0}>
      <set attributeName="opacity" to="1" begin={`${begin}s`} />
      {end != null ? <set attributeName="opacity" to="0" begin={`${end}s`} /> : null}
      {children}
    </g>
  );
}

function Scene({ c, reduced }: { c: Copy; reduced: boolean }) {
  return (
    <g>
      {/* Ana scribbles a box, holds, and it snaps to a clean rectangle. */}
      <Show begin={0} end={3.4} reduced={reduced} final={false}>
        <Draw d={SCRIBBLE} color={BLUE} begin={1.2} dur={1.6} reduced={reduced} width={5} />
      </Show>
      <Show begin={2.85} end={3.4} reduced={reduced} final={false}>
        <circle cx="266" cy="206" r="16" fill="none" stroke={BLUE} strokeWidth="3" opacity="0.7" />
      </Show>
      <Show begin={3.4} reduced={reduced}>
        <rect x="256" y="208" width="200" height="130" rx="14" fill="color-mix(in srgb, var(--lp-blue) 14%, transparent)" stroke={BLUE} strokeWidth="5" />
        <text x="356" y="280" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="24" fill="var(--lp-ink)">
          {c.board.idea}
        </text>
      </Show>
      {/* Leo draws an ellipse, then an arrow that sticks to both. */}
      <Draw d={ELLIPSE} color={GREEN} begin={1.7} dur={1.4} reduced={reduced} width={5} />
      <Show begin={3.1} reduced={reduced}>
        <text x="760" y="408" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="24" fill="var(--lp-ink)">
          {c.board.proto}
        </text>
      </Show>
      <Draw d={ARROW} color={GREEN} begin={4.5} dur={1} reduced={reduced} width={5} />
      <Show begin={5.45} reduced={reduced}>
        <path d="M630 390 L648 400 L630 410" fill="none" stroke={GREEN} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </Show>
      {/* Sofi drops a note and two vote dots. */}
      <Show begin={2.6} reduced={reduced}>
        <g transform="rotate(3 900 190)">
          <rect x="830" y="128" width="150" height="124" rx="6" fill="#ffe27a" />
          <text x="905" y="200" textAnchor="middle" fontFamily="Caveat, cursive" fontWeight="700" fontSize="34" fill="#16120e">
            {c.board.vote}
          </text>
        </g>
      </Show>
      <Show begin={7.0} reduced={reduced}>
        <circle cx="432" cy="226" r="11" fill={ORANGE} />
      </Show>
      <Show begin={8.2} reduced={reduced}>
        <circle cx="834" cy="374" r="11" fill={ORANGE} />
      </Show>
    </g>
  );
}

function Actor({ name, color, moves, reduced }: { name: string; color: string; moves: Move[]; reduced: boolean }) {
  const first = moves[0].d.match(/M\s*(-?\d+)\s+(-?\d+)/)!;
  const lastPt = moves[moves.length - 1].d.trim().split(/[\s,LCM]+/).filter(Boolean).slice(-2);
  // Motion is added on top of `transform`, so only the static (reduced) cursor
  // is placed by transform; the animated one starts with a zero-length move.
  const timeline = [{ d: `M${first[1]} ${first[2]} L${first[1]} ${first[2]}`, begin: 0, dur: 0.01 }, ...moves];
  return (
    <g aria-hidden="true">
      <g transform={reduced ? `translate(${lastPt[0]} ${lastPt[1]})` : undefined}>
        {reduced
          ? null
          : timeline.map((m, i) => (
              <animateMotion
                key={i}
                path={m.d}
                begin={`${m.begin}s`}
                dur={`${m.dur}s`}
                fill="freeze"
                additive="replace"
                {...spline}
                keyPoints="0;1"
              />
            ))}
        <g className="lp-actor">
        <path d="M0 0 L0 22 L6 16.5 L10.5 25.5 L14.5 23.5 L10 14.8 L17 14.8 Z" fill={color} stroke="var(--lp-bg)" strokeWidth="2" strokeLinejoin="round" />
        <rect x="16" y="22" width={name.length * 11 + 18} height="26" rx="13" fill={color} />
        <text x="25" y="40" fontFamily="'Mona Sans', sans-serif" fontWeight="700" fontSize="15" fill="var(--lp-on-line)">
          {name}
        </text>
        </g>
      </g>
    </g>
  );
}

// --- How it works -------------------------------------------------------------

function Section({ id, children, className = '' }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-16 border-t border-(--lp-line) ${className}`}>
      <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-8 sm:py-32">{children}</div>
    </section>
  );
}

function Title({ children, lead }: { children: ReactNode; lead?: string }) {
  return (
    <div className="max-w-[46rem]">
      <h2 className="lp-display text-[clamp(2.25rem,5.5vw,4rem)] leading-[1]">{children}</h2>
      {lead ? <p className="mt-5 text-[1.0625rem] leading-[1.55] text-(--lp-ink-2) sm:text-[1.1875rem]">{lead}</p> : null}
    </div>
  );
}

function How({ c }: { c: Copy }) {
  const colors = [BLUE, GREEN, ORANGE];
  return (
    <Section id="how">
      <Title>{c.howTitle}</Title>
      <ol className="relative mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
        <svg aria-hidden="true" className="absolute top-[22px] right-[16%] left-[4%] hidden h-4 md:block" viewBox="0 0 1000 16" preserveAspectRatio="none">
          <path className="lp-draw" pathLength={1} d="M0 8 C 250 0, 500 16, 1000 8" fill="none" stroke="var(--lp-stroke)" strokeWidth="2" strokeDasharray="1" vectorEffect="non-scaling-stroke" />
        </svg>
        {c.how.map(([title, body], i) => (
          <li key={title} className="relative">
            <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-(--lp-bg) font-mono text-[1.0625rem] font-bold" style={{ borderColor: colors[i], color: colors[i] }}>
              {i + 1}
            </span>
            <h3 className="lp-display mt-6 text-[2rem] leading-[1.05]">{title}</h3>
            <p className="mt-3 max-w-[30ch] text-[1.0625rem] leading-[1.55] text-(--lp-ink-2)">{body}</p>
            {i === 2 ? <ShareProof c={c} /> : null}
          </li>
        ))}
      </ol>
    </Section>
  );
}

/** The real QR to this app, beside the code badge as the share sheet shows it. */
function ShareProof({ c }: { c: Copy }) {
  const [qr] = useState(() => encodeQr(`${WEB_BASE_URL}/`));
  const cells: string[] = [];
  qr.modules.forEach((row, y) => row.forEach((on, x) => on && cells.push(`M${x} ${y}h1v1h-1z`)));
  return (
    <div className="mt-7 flex items-center gap-4">
      <svg role="img" aria-label={c.qr} viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`} className="h-24 w-24 flex-none rounded-[12px] bg-white" shapeRendering="crispEdges">
        <path d={cells.join('')} fill="#08090c" />
      </svg>
      <div>
        <span className="inline-flex h-10 items-center gap-2 rounded-full bg-(--lp-blue) pr-3.5 pl-2 font-mono text-[1rem] font-bold tracking-[1.5px] text-white">
          <span className="h-4 w-4 rounded-full border-[3px] border-white" />
          K7Q·2XM
        </span>
        <p className="mt-2 max-w-[16ch] text-[0.8125rem] leading-[1.4] text-(--lp-ink-3)">{c.qr}</p>
      </div>
    </div>
  );
}

// --- Features -------------------------------------------------------------------

function Tile({ title, body, className = '', children }: { title: string; body: string; className?: string; children: ReactNode }) {
  return (
    <div className={`lp-panel flex flex-col overflow-hidden ${className}`}>
      <div className="relative min-h-[200px] flex-1">{children}</div>
      <div className="border-t border-(--lp-line) p-6">
        <h3 className="text-[1.1875rem] font-bold tracking-[-0.01em]">{title}</h3>
        <p className="mt-1.5 text-[0.9375rem] leading-[1.5] text-(--lp-ink-2)">{body}</p>
      </div>
    </div>
  );
}

function Features({ c }: { c: Copy }) {
  const f = c.f;
  return (
    <Section id="features">
      <Title lead={c.featLead}>{c.featTitle}</Title>
      <div className="mt-14 grid gap-4 md:grid-cols-6">
        <Tile title={f.liveT} body={f.liveB} className="md:col-span-4">
          <LiveDemo c={c} />
        </Tile>
        <Tile title={f.arrowT} body={f.arrowB} className="md:col-span-2">
          <ArrowDemo label={f.arrowLabel} />
        </Tile>
        <Tile title={f.shapeT} body={f.shapeB} className="md:col-span-2">
          <ShapeDemo />
        </Tile>
        <Tile title={f.aiT} body={f.aiB} className="md:col-span-2">
          <AiDemo prompt={f.aiPrompt} />
        </Tile>
        <Tile title={f.privT} body={f.privB} className="md:col-span-2">
          <PrivacyDemo c={c} />
        </Tile>
        <Tile title={f.expT} body={f.expB} className="md:col-span-3">
          <ExportDemo c={c} />
        </Tile>
        <Tile title={f.tplT} body={f.tplB} className="md:col-span-3">
          <TemplateDemo c={c} />
        </Tile>
      </div>

      <h3 className="mt-20 text-[1.25rem] font-bold">{c.moreTitle}</h3>
      <ul className="mt-6 grid gap-x-10 gap-y-7 border-t border-(--lp-line) pt-8 sm:grid-cols-2 lg:grid-cols-5">
        {c.more.map(([t, b]) => (
          <li key={t}>
            <p className="text-[0.9375rem] font-semibold">{t}</p>
            <p className="mt-1 text-[0.875rem] leading-[1.5] text-(--lp-ink-3)">{b}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function MiniCursor({ name, color, className }: { name: string; color: string; className: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
      <div className="flex items-start">
        <svg width="18" height="24" viewBox="0 0 18 26">
          <path d="M1 1 L1 22 L6.5 17 L10.5 25 L14 23.4 L10 15.5 L17 15.5 Z" fill={color} stroke="var(--lp-bg)" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <span className="mt-4 rounded-full px-2 py-0.5 text-[0.75rem] font-bold text-(--lp-bg)" style={{ background: color }}>
          {name}
        </span>
      </div>
    </div>
  );
}

function LiveDemo({ c }: { c: Copy }) {
  return (
    <div className="lp-grid absolute inset-0">
      <svg aria-hidden="true" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
        <path className="lp-draw" pathLength={1} d="M90 190 C 150 110, 230 110, 270 170 S 380 240, 430 160" fill="none" stroke={BLUE} strokeWidth="6" strokeLinecap="round" />
        <path className="lp-draw" pathLength={1} d="M470 90 L 640 90 L 640 200 L 470 200 Z" fill="none" stroke={GREEN} strokeWidth="5" strokeLinejoin="round" />
        <path className="lp-draw" pathLength={1} d="M300 250 q 40 -30 80 0 t 80 0 t 80 0" fill="none" stroke={ORANGE} strokeWidth="6" strokeLinecap="round" />
      </svg>
      <MiniCursor name="Ana" color={BLUE} className="lp-cursor-a" />
      <MiniCursor name="Leo" color={GREEN} className="lp-cursor-b" />
      <MiniCursor name="Sofi" color={ORANGE} className="lp-cursor-c" />
      <span className="absolute top-4 right-4 flex items-center gap-2 rounded-full border border-(--lp-line-2) bg-(--lp-raise) px-3 py-1.5 text-[0.8125rem] font-medium">
        <span className="lp-pulse h-2 w-2 rounded-full bg-(--lp-green)" />
        {c.f.present}
      </span>
    </div>
  );
}

/** A box you can drag; the arrow to the circle stays attached, as in the app. */
function ArrowDemo({ label }: { label: string }) {
  const [box, setBox] = useState({ x: 40, y: 50 });
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const W = 120;
  const H = 76;
  const circle = { x: 300, y: 210, r: 46 };
  const clamp = (p: { x: number; y: number }) => ({ x: Math.max(8, Math.min(392 - W, p.x)), y: Math.max(8, Math.min(272 - H, p.y)) });

  const toSvg = (e: ReactPointerEvent<SVGElement>) => {
    const ctm = (e.currentTarget.ownerSVGElement ?? (e.currentTarget as SVGSVGElement)).getScreenCTM()!;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  };

  // Where the line between the two centres leaves the box and meets the circle.
  const cx = box.x + W / 2;
  const cy = box.y + H / 2;
  const dx = circle.x - cx;
  const dy = circle.y - cy;
  const len = Math.hypot(dx, dy) || 1;
  const t = Math.min(W / 2 / Math.abs(dx || 1e-6), H / 2 / Math.abs(dy || 1e-6));
  const start = { x: cx + dx * t, y: cy + dy * t };
  const end = { x: circle.x - (dx / len) * (circle.r + 6), y: circle.y - (dy / len) * (circle.r + 6) };
  const inside = len < circle.r + Math.max(W, H) / 2;

  const key = (e: ReactKeyboardEvent<SVGGElement>) => {
    const step = e.shiftKey ? 30 : 10;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    setBox((b) => clamp({ x: b.x + d[0], y: b.y + d[1] }));
  };

  return (
    <svg viewBox="0 0 400 280" className="lp-grid absolute inset-0 h-full w-full touch-none select-none">
      <defs>
        <marker id="lp-arrow-head" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M1 1 L10 6 L1 11" fill="none" stroke="var(--lp-ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      {inside ? null : (
        <path d={`M${start.x} ${start.y} L${end.x} ${end.y}`} stroke="var(--lp-ink)" strokeWidth="3" markerEnd="url(#lp-arrow-head)" />
      )}
      <circle cx={circle.x} cy={circle.y} r={circle.r} fill="color-mix(in srgb, var(--lp-green) 14%, transparent)" stroke={GREEN} strokeWidth="4" />
      <g
        role="button"
        tabIndex={0}
        aria-label={label}
        onKeyDown={key}
        className="cursor-grab outline-none active:cursor-grabbing [&:focus-visible>rect]:stroke-(--lp-ink)"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = toSvg(e);
          drag.current = { dx: p.x - box.x, dy: p.y - box.y };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const p = toSvg(e);
          setBox(clamp({ x: p.x - drag.current.dx, y: p.y - drag.current.dy }));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <rect x={box.x} y={box.y} width={W} height={H} rx="12" fill="color-mix(in srgb, var(--lp-blue) 16%, transparent)" stroke={BLUE} strokeWidth="4" />
        {[start].map((p) => (
          <circle key="a" cx={p.x} cy={p.y} r="5" fill="var(--lp-bg)" stroke="var(--lp-ink)" strokeWidth="2.5" />
        ))}
      </g>
    </svg>
  );
}

function ShapeDemo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 400 240" className="lp-grid absolute inset-0 h-full w-full">
      <path
        className="lp-loop-scribble"
        pathLength={1}
        d="M120 72 C 170 64, 240 68, 288 76 C 294 110, 290 150, 286 176 C 230 182, 170 180, 114 172 C 110 140, 108 104, 126 66"
        fill="none"
        stroke={VIOLET}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="lp-loop-hold" cx="126" cy="66" r="14" fill="none" stroke={VIOLET} strokeWidth="3" opacity="0" />
      <rect className="lp-loop-clean" x="112" y="68" width="178" height="110" rx="12" fill="color-mix(in srgb, var(--lp-violet) 14%, transparent)" stroke={VIOLET} strokeWidth="5" opacity="0" />
    </svg>
  );
}

function AiDemo({ prompt }: { prompt: string }) {
  return (
    <div className="lp-grid absolute inset-0 flex flex-col p-5">
      <div className="flex items-center gap-2.5 rounded-full border border-(--lp-line-2) bg-(--lp-raise) py-2 pr-2 pl-4">
        <SparkleIcon size={17} weight="fill" className="flex-none text-(--lp-violet)" />
        <span className="min-w-0 flex-1 truncate text-[0.875rem]">
          <span className="lp-ai-type inline-block align-bottom">{prompt}</span>
          <span className="lp-caret ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] bg-(--lp-blue)" />
        </span>
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-(--lp-violet) text-(--lp-bg)">
          <ArrowRightIcon size={14} weight="bold" />
        </span>
      </div>
      <svg aria-hidden="true" viewBox="0 0 320 130" className="mt-3 w-full flex-1">
        <g className="lp-ai-shape">
          <rect x="10" y="44" width="76" height="42" rx="21" fill="none" stroke={GREEN} strokeWidth="3" />
          <path d="M88 65 H 118" stroke="var(--lp-ink)" strokeWidth="2.5" />
          <path d="M160 26 L 200 65 L 160 104 L 120 65 Z" fill="none" stroke={ORANGE} strokeWidth="3" strokeLinejoin="round" />
          <path d="M202 65 H 232" stroke="var(--lp-ink)" strokeWidth="2.5" />
          <rect x="234" y="44" width="76" height="42" rx="8" fill="none" stroke={BLUE} strokeWidth="3" />
        </g>
      </svg>
    </div>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string, ReactNode][]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-full border border-(--lp-line-2) bg-(--lp-raise) p-1">
      {options.map(([v, label, icon]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-semibold transition ${
            value === v ? 'bg-(--lp-ink) text-(--lp-bg)' : 'text-(--lp-ink-2) hover:text-(--lp-ink)'
          }`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}

function PrivacyDemo({ c }: { c: Copy }) {
  const [access, setAccess] = useState<'public' | 'pin'>('pin');
  const [role, setRole] = useState<'edit' | 'view'>('edit');
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-3 p-5">
      <Segmented
        value={access}
        onChange={setAccess}
        options={[
          ['public', c.f.public, <GlobeSimpleIcon key="g" size={15} />],
          ['pin', c.f.pin, <LockSimpleIcon key="l" size={15} />],
        ]}
      />
      <div className={`flex justify-center gap-2.5 py-2 transition ${access === 'pin' ? 'opacity-100' : 'opacity-25'}`} aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="flex h-12 w-10 items-center justify-center rounded-[10px] border border-(--lp-line-2) bg-(--lp-raise)">
            <span className={`h-3 w-3 rounded-full ${access === 'pin' ? 'bg-(--lp-ink)' : 'bg-(--lp-ink-3)'}`} />
          </span>
        ))}
      </div>
      <Segmented
        value={role}
        onChange={setRole}
        options={[
          ['edit', c.f.edit, <PencilSimpleIcon key="p" size={15} />],
          ['view', c.f.view, <EyeIcon key="e" size={15} />],
        ]}
      />
    </div>
  );
}

function ExportDemo({ c }: { c: Copy }) {
  const formats = ['PNG', 'JPG', 'SVG', 'JSON'] as const;
  const [fmt, setFmt] = useState<(typeof formats)[number]>('SVG');
  const name = c.board.title.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="lp-grid absolute inset-0 flex flex-col items-center justify-center gap-5 p-6">
      <div className="flex gap-2" role="group">
        {formats.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={fmt === f}
            onClick={() => setFmt(f)}
            className={`h-10 rounded-full border px-4 font-mono text-[0.8125rem] font-bold tracking-[1px] transition ${
              fmt === f ? 'border-(--lp-blue) bg-(--lp-blue) text-white' : 'border-(--lp-line-2) bg-(--lp-raise) text-(--lp-ink-2) hover:text-(--lp-ink)'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-[12px] border border-(--lp-line-2) bg-(--lp-raise) px-4 py-3">
        <DownloadSimpleIcon size={18} className="text-(--lp-blue)" />
        <span className="font-mono text-[0.8125rem] whitespace-nowrap sm:text-[0.875rem]">
          {name}.{fmt.toLowerCase()}
        </span>
        {fmt === 'JSON' || fmt === 'PNG' || fmt === 'SVG' ? (
          <span className="rounded-full bg-(--lp-green)/15 px-2.5 py-1 text-[0.75rem] font-semibold text-(--lp-green)">{c.f.reimport}</span>
        ) : null}
      </div>
    </div>
  );
}

const TEMPLATE_ART: ReactNode[] = [
  // Brainstorm: notes around a centre.
  <g key="b">
    <circle cx="200" cy="110" r="34" fill="none" stroke={VIOLET} strokeWidth="3" />
    {[[90, 40], [270, 40], [80, 150], [280, 150]].map(([x, y]) => (
      <rect key={`${x}${y}`} x={x} y={y} width="56" height="44" rx="4" fill="#ffe27a" />
    ))}
  </g>,
  // Retro: three columns of notes.
  <g key="r">
    {[0, 1, 2].map((col) => (
      <g key={col}>
        <rect x={60 + col * 100} y="24" width="84" height="172" rx="10" fill="none" stroke="var(--lp-stroke)" strokeWidth="2" />
        {[0, 1, 2].slice(0, 3 - (col % 2)).map((r) => (
          <rect key={r} x={70 + col * 100} y={40 + r * 50} width="64" height="38" rx="4" fill={[GREEN, ORANGE, BLUE][col]} opacity="0.85" />
        ))}
      </g>
    ))}
  </g>,
  // Flowchart.
  <g key="f" fill="none" strokeWidth="3">
    <rect x="40" y="88" width="80" height="44" rx="22" stroke={GREEN} />
    <path d="M122 110 H 158" stroke="var(--lp-ink)" />
    <path d="M200 70 L 240 110 L 200 150 L 160 110 Z" stroke={ORANGE} />
    <path d="M242 110 H 278" stroke="var(--lp-ink)" />
    <rect x="280" y="88" width="80" height="44" rx="8" stroke={BLUE} />
  </g>,
  // Kanban.
  <g key="k">
    {[0, 1, 2, 3].map((col) => (
      <g key={col}>
        <rect x={40 + col * 84} y="24" width="72" height="16" rx="8" fill="var(--lp-wash-2)" />
        {Array.from({ length: 3 - (col % 3) }, (_, r) => (
          <rect key={r} x={40 + col * 84} y={52 + r * 46} width="72" height="36" rx="6" fill={BLUE} opacity={0.35 + r * 0.2} />
        ))}
      </g>
    ))}
  </g>,
  // Mind map.
  <g key="m" fill="none" strokeWidth="3">
    <ellipse cx="200" cy="110" rx="52" ry="30" stroke={VIOLET} />
    {[[70, 40], [330, 40], [70, 180], [330, 180]].map(([x, y]) => (
      <g key={`${x}${y}`}>
        <path d={`M${x < 200 ? 152 : 248} 110 Q ${(x + 200) / 2} ${y} ${x} ${y}`} stroke="var(--lp-stroke-2)" />
        <circle cx={x} cy={y} r="14" stroke={GREEN} />
      </g>
    ))}
  </g>,
];

function TemplateDemo({ c }: { c: Copy }) {
  const [i, setI] = useState(2);
  return (
    <div className="lp-grid absolute inset-0 flex flex-col p-5">
      <div className="flex flex-wrap gap-1.5" role="group">
        {c.f.templates.map((t, k) => (
          <button
            key={t}
            type="button"
            aria-pressed={i === k}
            onClick={() => setI(k)}
            className={`h-9 rounded-full px-3.5 text-[0.8125rem] font-semibold transition ${
              i === k ? 'bg-(--lp-ink) text-(--lp-bg)' : 'border border-(--lp-line-2) bg-(--lp-raise) text-(--lp-ink-2) hover:text-(--lp-ink)'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <svg aria-hidden="true" viewBox="0 0 400 220" className="mt-2 min-h-[160px] w-full flex-1">
        {TEMPLATE_ART[i]}
      </svg>
    </div>
  );
}

// --- Platforms ------------------------------------------------------------------

function Platforms({ c }: { c: Copy }) {
  return (
    <Section id="get">
      <Title lead={c.getLead}>{c.getTitle}</Title>
      <figure className="relative mt-14 pb-12 sm:pb-20">
        <img
          src="/landing/board-desktop.webp"
          alt={c.shotDesktop}
          width={1440}
          height={900}
          loading="lazy"
          className="w-full rounded-[18px] border border-(--lp-line-2) shadow-[0_40px_100px_-30px_var(--lp-shadow)] sm:w-[86%]"
        />
        <img
          src="/landing/board-phone.webp"
          alt={c.shotPhone}
          width={560}
          height={1250}
          loading="lazy"
          className="absolute right-0 bottom-0 w-[30%] max-w-[260px] rounded-[26px] border-[6px] border-(--lp-raise-2) shadow-[0_30px_80px_-20px_var(--lp-shadow)]"
        />
      </figure>
      <div className="grid gap-10 border-t border-(--lp-line) pt-10 md:grid-cols-3">
        <div>
          <h3 className="flex items-center gap-2.5 text-[1.25rem] font-bold">
            <GlobeSimpleIcon size={22} className="text-(--lp-blue)" />
            {c.webT}
          </h3>
          <p className="mt-2 text-[0.9375rem] leading-[1.55] text-(--lp-ink-2)">{c.webB}</p>
          <Link to="/" className={`${PILL_WHITE} mt-5 h-11 px-5 text-[0.9375rem]`}>
            {c.openApp}
            <ArrowRightIcon size={16} weight="bold" />
          </Link>
        </div>
        <div>
          <h3 className="flex items-center gap-2.5 text-[1.25rem] font-bold">
            <AndroidLogoIcon size={22} weight="fill" className="text-(--lp-green)" />
            {c.androidT}
          </h3>
          <ol className="mt-3 flex flex-col gap-2.5">
            {c.androidSteps.map((s, i) => (
              <li key={s} className="flex gap-3 text-[0.9375rem] leading-[1.5] text-(--lp-ink-2)">
                <span className="mt-0.5 flex h-5.5 w-5.5 flex-none items-center justify-center rounded-full border border-(--lp-line-2) font-mono text-[0.6875rem] font-bold text-(--lp-ink)">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
          <a href={LINKS.apk} className={`${PILL_GHOST} mt-5 h-11 px-5 text-[0.9375rem]`}>
            <DownloadSimpleIcon size={17} weight="bold" />
            {c.apk}
          </a>
        </div>
        <div>
          <h3 className="flex items-center gap-2.5 text-[1.25rem] font-bold">
            <AppleLogoIcon size={22} weight="fill" className="text-(--lp-ink-2)" />
            {c.iosT}
          </h3>
          <p className="mt-2 text-[0.9375rem] leading-[1.55] text-(--lp-ink-2)">{c.iosB}</p>
        </div>
      </div>
    </Section>
  );
}

// --- Open source ----------------------------------------------------------------

function OpenSource({ c }: { c: Copy }) {
  const [copied, setCopied] = useState(false);
  const cmd = `git clone ${LINKS.web}.git`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: the command stays selectable on screen.
    }
  };
  const repoLinks = [LINKS.web, LINKS.mobile, LINKS.server];
  return (
    <Section id="open-source" className="relative overflow-hidden">
      <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div className="min-w-0">
          <h2 className="lp-display text-[clamp(2.25rem,5.5vw,4rem)] leading-[1]">{c.ossTitle}</h2>
          <p className="mt-5 max-w-[34rem] text-[1.0625rem] leading-[1.55] text-(--lp-ink-2) sm:text-[1.1875rem]">{c.ossLead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={LINKS.github} className={`${PILL_WHITE} h-12 px-5 text-[0.9375rem]`}>
              <GithubLogoIcon size={18} weight="fill" />
              {c.ossGithub}
            </a>
            <a href={LINKS.license} className={`${PILL_GHOST} h-12 px-5 text-[0.9375rem]`}>
              {c.ossLicense}
            </a>
          </div>
          <a href={LINKS.issues} className="mt-6 inline-flex items-center gap-1.5 text-[0.9375rem] text-(--lp-ink-2) underline decoration-(--lp-stroke) underline-offset-4 hover:text-(--lp-ink)">
            {c.ossIssue}
            <ArrowUpRightIcon size={14} />
          </a>
        </div>
        <div className="min-w-0">
          <ul className="lp-panel divide-y divide-(--lp-line)">
            {c.repos.map(([name, what, stack], i) => (
              <li key={name}>
                <a href={repoLinks[i]} className="group flex items-center gap-4 p-5 transition hover:bg-(--lp-wash)">
                  <GithubLogoIcon size={26} weight="fill" className="flex-none text-(--lp-ink-2)" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[0.9375rem] font-bold">Juan17la/{name}</span>
                    <span className="mt-1 block text-[0.875rem] text-(--lp-ink-2)">
                      {what} <span className="text-(--lp-ink-3)">· {stack}</span>
                    </span>
                  </span>
                  <ArrowUpRightIcon size={18} className="flex-none text-(--lp-ink-3) transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-(--lp-ink)" />
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-3 rounded-[14px] border border-(--lp-line) bg-(--lp-well) py-2 pr-2 pl-4">
            <span aria-hidden="true" className="font-mono text-[0.875rem] text-(--lp-green)">$</span>
            <code className="min-w-0 flex-1 truncate font-mono text-[0.8125rem] text-(--lp-ink-2) sm:text-[0.875rem]">{cmd}</code>
            <button
              type="button"
              onClick={copy}
              aria-label={c.copy}
              className="flex h-9 flex-none items-center gap-1.5 rounded-[10px] px-3 text-[0.8125rem] font-semibold text-(--lp-ink-2) transition hover:bg-(--lp-wash) hover:text-(--lp-ink)"
            >
              {copied ? <CheckIcon size={15} weight="bold" className="text-(--lp-green)" /> : <CopyIcon size={15} />}
              <span aria-live="polite">{copied ? c.copied : ''}</span>
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
}

// --- FAQ and close --------------------------------------------------------------

function Faq({ c }: { c: Copy }) {
  return (
    <Section id="faq">
      <Title>{c.faqTitle}</Title>
      <div className="mt-12 grid gap-x-10 md:grid-cols-2">
        {c.faq.map(([q, a]) => (
          <details key={q} className="group border-b border-(--lp-line)">
            <summary className="flex min-h-16 cursor-pointer items-center justify-between gap-4 py-4 text-[1.0625rem] font-semibold">
              {q}
              <PlusIcon size={18} weight="bold" className="lp-plus flex-none text-(--lp-ink-3) transition" />
            </summary>
            <p className="max-w-[56ch] pb-5 text-[0.9375rem] leading-[1.6] text-(--lp-ink-2)">{a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

function Closing({ c }: { c: Copy }) {
  return (
    <section className="relative overflow-hidden border-t border-(--lp-line)">
      <div aria-hidden="true" className="lp-grid lp-grid-fade pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-[1240px] px-4 py-28 text-center sm:px-8 sm:py-40">
        <h2 className="lp-display mx-auto max-w-[16ch] text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.98]">{c.endTitle}</h2>
        <p className="mt-6 text-[1.125rem] text-(--lp-ink-2)">{c.endLead}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/" className={`${PILL_WHITE} h-13 px-6 text-[1rem]`}>
            {c.openApp}
            <ArrowRightIcon size={17} weight="bold" />
          </Link>
          <a href={LINKS.apk} className={`${PILL_GHOST} h-13 px-6 text-[1rem]`}>
            <AndroidLogoIcon size={18} weight="fill" />
            {c.apk}
          </a>
        </div>
      </div>
    </section>
  );
}
