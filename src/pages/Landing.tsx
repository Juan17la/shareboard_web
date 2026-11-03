/**
 * `/inicio`: the public page about Shareboard, the one link to hand someone who
 * has not used it yet. No account, no board store: it says what the app does,
 * lets the visitor draw a stroke, and sends them to the browser app (`/`) or
 * the Android APK.
 *
 * Built as a stack of station signs: each white panel, capped by the ink rule,
 * answers one question. Copy lives here rather than in `strings.ts` because no
 * other screen uses it; the language is the app's own ES · EN setting.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Icon, type IconName } from '../components/atoms/Icon';
import { useToggleLang } from '../features/i18n';
import { useSessionStore } from '../features/session';

const APK_URL = 'https://github.com/Juan17la/shareboard_mobile/releases/latest';
const SOURCE_WEB = 'https://github.com/Juan17la/shareboard_web';
const SOURCE_MOBILE = 'https://github.com/Juan17la/shareboard_mobile';

const COPY = {
  es: {
    title: 'Shareboard: pizarra colaborativa para web y Android',
    navHow: 'Cómo funciona',
    navFeatures: 'Funciones',
    navGet: 'Descargar',
    navWeb: 'Versión web',
    langSwitch: 'Switch to English',
    h1a: 'Dibuja en equipo.',
    h1b: 'Comparte un código.',
    lead: 'Shareboard es una pizarra que abre lista para dibujar. Toca Compartir, envía seis caracteres y todos dibujan en la misma pizarra, en vivo. Sin crear cuenta.',
    openWeb: 'Abrir en el navegador',
    getApk: 'Descargar para Android',
    iphone: '¿iPhone o iPad? Usa la versión web: hace todo lo que hace la app.',
    tryHint: 'Pruébalo: dibuja aquí',
    clear: 'Borrar tus trazos',
    ink: 'Tinta',
    blue: 'Azul',
    red: 'Rojo',
    demoBoard: 'Pizarra de prueba. Dibuja con el ratón o el dedo.',
    demoNote: 'Ideas',
    howTitle: 'Cómo funciona',
    how: [
      ['Ábrela', 'Entras directo a una pizarra. La primera vive en tu dispositivo y funciona sin internet.'],
      ['Dibuja', 'Lápiz, figuras, flechas que se pegan a las figuras, notas, texto e imágenes en un lienzo infinito.'],
      ['Comparte', 'Toca Compartir y envía el código, el enlace o el QR. Quien lo abra dibuja contigo, cada uno con su cursor.'],
    ],
    featuresTitle: 'Lo que trae la pizarra',
    shotDesktop: 'Shareboard en el navegador: un tablero de sprint con figuras, flechas y notas adhesivas',
    shotPhone: 'Shareboard en Android: un mapa mental en la pizarra, con la barra de herramientas abajo',
    features: [
      ['people', 'En vivo, juntos', 'Cada trazo aparece para todos un momento después, con cursores con nombre.'],
      ['arrow', 'Diagramas que no se rompen', 'Las flechas se pegan a las figuras y las siguen cuando las mueves.'],
      ['shapes', 'Mantén para dar forma', 'Garabatea una caja o un círculo, quédate quieto un momento y se vuelve una figura limpia.'],
      ['sparkle', 'Dibuja con IA', 'Describe lo que quieres y recibe un dibujo editable, con vista previa antes.'],
      ['lock', 'Privada si quieres', 'Pública o con un PIN de 4 dígitos. Tú decides quién edita y quién solo mira.'],
      ['download', 'Exporta sin perder nada', 'PNG, JPG, SVG o JSON. Una imagen de Shareboard se vuelve a importar editable.'],
    ],
    getTitle: 'Consigue Shareboard',
    androidTitle: 'App para Android',
    androidSteps: [
      'Descarga el archivo APK de la última versión.',
      'Ábrelo y permite que tu navegador instale apps desconocidas. La app aún no está en Play Store.',
      'Toca Instalar y luego Abrir.',
    ],
    androidUpdate: 'La app te avisa cuando sale una versión nueva y la descarga por ti.',
    webTitle: 'En el navegador',
    webBody: 'Funciona en computadores, iPhone y iPad. No hay nada que instalar, y las mismas pizarras se abren en la web y en Android.',
    openShareboard: 'Abrir Shareboard',
    faqTitle: 'Preguntas rápidas',
    faq: [
      ['¿Necesito una cuenta?', 'Para empezar, no. Shareboard la pide solo cuando un paso la necesita, y te dice por qué.'],
      ['¿Funciona sin internet?', 'Tu propia pizarra sí. Compartir necesita conexión.'],
      ['¿Hay app para iPhone?', 'No. En iPhone y iPad usa la versión web, que hace lo mismo.'],
      ['¿Web y Android se mezclan?', 'Sí. Una pizarra se abre en los dos con el mismo código.'],
    ],
    source: 'Código fuente',
    sourceWeb: 'Web',
    sourceAndroid: 'Android',
  },
  en: {
    title: 'Shareboard: a collaborative whiteboard for web and Android',
    navHow: 'How it works',
    navFeatures: 'Features',
    navGet: 'Download',
    navWeb: 'Web version',
    langSwitch: 'Cambiar a español',
    h1a: 'Draw together.',
    h1b: 'Share a code.',
    lead: 'Shareboard is a whiteboard that opens ready to draw. Press Share, send six characters, and everyone draws on the same board, live. No account needed.',
    openWeb: 'Open in the browser',
    getApk: 'Download for Android',
    iphone: 'iPhone or iPad? Use the web version: it does everything the app does.',
    tryHint: 'Try it: draw here',
    clear: 'Clear your strokes',
    ink: 'Ink',
    blue: 'Blue',
    red: 'Red',
    demoBoard: 'Practice board. Draw with your mouse or finger.',
    demoNote: 'Ideas',
    howTitle: 'How it works',
    how: [
      ['Open it', 'You land straight on a board. Your first one lives on your device and works offline.'],
      ['Draw', 'Pencil, shapes, arrows that stick to figures, sticky notes, text and pictures on an infinite canvas.'],
      ['Share', 'Press Share and send the code, the link or the QR. Whoever opens it draws with you, each with a named cursor.'],
    ],
    featuresTitle: "What's on the board",
    shotDesktop: 'Shareboard in the browser: a sprint board with shapes, arrows and sticky notes',
    shotPhone: 'Shareboard on Android: a mind map on the board, with the toolbar at the bottom',
    features: [
      ['people', 'Live, together', 'Every stroke shows up for everyone a moment later, with named cursors.'],
      ['arrow', 'Diagrams that stay connected', 'Arrows snap to figures and follow them when they move.'],
      ['shapes', 'Hold to shape', 'Scribble a rough box or circle, hold still for a moment, and it becomes a clean figure.'],
      ['sparkle', 'Draw with AI', 'Describe what you want and get an editable drawing, with a preview first.'],
      ['lock', 'Private when you want', 'Public, or protected with a 4-digit PIN. You choose who edits and who only watches.'],
      ['download', 'Exports that stay editable', 'PNG, JPG, SVG or JSON. A Shareboard picture imports back fully editable.'],
    ],
    getTitle: 'Get Shareboard',
    androidTitle: 'Android app',
    androidSteps: [
      'Download the APK file from the latest release.',
      "Open it and let your browser install unknown apps. The app isn't on the Play Store yet.",
      'Tap Install, then Open.',
    ],
    androidUpdate: 'The app tells you when a new version is out and downloads it for you.',
    webTitle: 'In the browser',
    webBody: 'Works on laptops, iPhone and iPad. Nothing to install, and the same boards open on the web and on Android.',
    openShareboard: 'Open Shareboard',
    faqTitle: 'Quick answers',
    faq: [
      ['Do I need an account?', 'Not to start. Shareboard asks for one only when a step needs it, and says why.'],
      ['Does it work offline?', 'Your own board does. Sharing needs a connection.'],
      ['Is there an iPhone app?', 'No. On iPhone and iPad, use the web version; it does the same.'],
      ['Do web and Android boards mix?', 'Yes. A board opens on both with the same code.'],
    ],
    source: 'Source code',
    sourceWeb: 'Web',
    sourceAndroid: 'Android',
  },
} as const;

type Copy = (typeof COPY)[keyof typeof COPY];

const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

export default function LandingPage() {
  const lang = useSessionStore((s) => s.lang);
  const toggleLang = useToggleLang();
  const c = COPY[lang];

  useEffect(() => {
    document.title = c.title;
  }, [c.title]);

  // The landing page is always light, whatever theme the board was left on;
  // leaving it puts the saved theme back.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = 'light';
    return () => {
      root.dataset.theme = useSessionStore.getState().theme;
    };
  }, []);

  const web = <OpenWebButton label={c.openWeb} primary={!isAndroid} />;
  const apk = <ApkButton label={c.getApk} primary={isAndroid} />;

  return (
    <div className="h-full overflow-y-auto bg-surface [scroll-behavior:smooth] motion-reduce:[scroll-behavior:auto]">
      <header className="sticky top-0 z-20 bg-accent text-white">
        <nav className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-8">
          <a href="#top" className="flex items-center gap-2.5 rounded-full text-[1.125rem] font-extrabold tracking-[-0.4px]">
            <StationRing className="h-6 w-6 border-[5px] border-white" />
            Shareboard
          </a>
          <div className="flex items-center gap-1 sm:gap-2">
            <NavLink href="#how" className="max-md:hidden">{c.navHow}</NavLink>
            <NavLink href="#features" className="max-md:hidden">{c.navFeatures}</NavLink>
            <NavLink href="#get" className="max-lg:hidden">{c.navGet}</NavLink>
            {/* The two ways in, always in reach. On a phone only the one that fits it. */}
            <a
              href={APK_URL}
              className={`${NAV_PILL} ${isAndroid ? NAV_PILL_SOLID : NAV_PILL_OUTLINE} ${isAndroid ? '' : 'max-sm:hidden'}`}
            >
              <Icon name="download" size={16} />
              APK
            </a>
            <Link
              to="/"
              className={`${NAV_PILL} ${isAndroid ? NAV_PILL_OUTLINE : NAV_PILL_SOLID} ${isAndroid ? 'max-sm:hidden' : ''}`}
            >
              {c.navWeb}
              <Icon name="go" size={16} />
            </Link>
            <button
              type="button"
              onClick={toggleLang}
              aria-label={c.langSwitch}
              className="ml-1 min-h-11 rounded-full border-2 border-white/80 px-3 font-mono text-[0.8125rem] font-bold tracking-[1.5px] transition hover:bg-white hover:text-accent-text"
            >
              <span className={lang === 'es' ? '' : 'opacity-55'}>ES</span> · <span className={lang === 'en' ? '' : 'opacity-55'}>EN</span>
            </button>
          </div>
        </nav>
      </header>

      <main id="top" className="mx-auto flex max-w-[1320px] flex-col gap-5 px-3 py-5 sm:gap-8 sm:px-8 sm:py-8">
        {/* Sign 1: what it is, the board itself, and the two ways in. */}
        <Sign className="grid overflow-hidden lg:min-h-[min(calc(100svh-8rem),760px)] lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col justify-between gap-10 p-6 sm:p-12 lg:p-14">
            <div>
              <h1 className="text-[clamp(2.4rem,10.5vw,4.75rem)] leading-[0.98] font-extrabold tracking-[-0.04em] lg:text-[clamp(3.5rem,5.6vw,4.75rem)]">
                <span className="whitespace-nowrap">{c.h1a}</span>
                <br />
                <span className="whitespace-nowrap text-accent-text">{c.h1b}</span>
              </h1>
              <p className="mt-6 max-w-[34rem] text-[1.125rem] leading-[1.5] text-text-secondary sm:text-[1.3125rem]">
                {c.lead}
              </p>
            </div>
            <div>
              <div className="flex flex-wrap gap-3">
                {isAndroid ? (
                  <>
                    {apk}
                    {web}
                  </>
                ) : (
                  <>
                    {web}
                    {apk}
                  </>
                )}
              </div>
              <p className="mt-4 text-[0.875rem] leading-[1.4] text-text-secondary">{c.iphone}</p>
            </div>
          </div>
          <DemoBoard c={c} />
        </Sign>

        {/* Sign 2: the three stops. */}
        <Sign id="how" className="p-6 sm:p-12 lg:p-14">
          <SignTitle>{c.howTitle}</SignTitle>
          <ol className="relative mt-10 grid gap-10 md:mt-14 md:grid-cols-3 md:gap-8">
            {/* The line the stops sit on: across on wide screens, down on phones. */}
            <span aria-hidden="true" className="absolute top-3 bottom-3 left-[13px] w-[6px] rounded-full bg-accent md:hidden" />
            <span aria-hidden="true" className="absolute top-[13px] right-6 left-6 hidden h-[6px] rounded-full bg-accent md:block" />
            {c.how.map(([title, body], i) => {
              const last = i === c.how.length - 1;
              return (
                <li key={title} className="relative flex gap-5 md:flex-col md:gap-6">
                  <span
                    aria-hidden="true"
                    className={[
                      'relative z-10 flex h-8 w-8 flex-none items-center justify-center rounded-full border-[6px] bg-background',
                      last ? 'border-go' : 'border-accent',
                    ].join(' ')}
                  />
                  <div>
                    <h3 className="flex items-baseline gap-3 text-[1.75rem] leading-[1.1] font-extrabold tracking-[-0.03em] sm:text-[2.25rem]">
                      <span className="font-mono text-[0.9rem] font-bold tracking-[1.5px] text-text-tertiary">{i + 1}</span>
                      {title}
                    </h3>
                    <p className="mt-3 max-w-[30ch] text-[1.0625rem] leading-[1.5] text-text-secondary">{body}</p>
                    {last ? <CodeBadge className="mt-5" /> : null}
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="mt-12 flex flex-wrap gap-3 border-t border-line pt-8">
            {isAndroid ? (
              <>
                {apk}
                {web}
              </>
            ) : (
              <>
                {web}
                {apk}
              </>
            )}
          </div>
        </Sign>

        {/* Sign 3: the real app, and what it can do. */}
        <Sign id="features" className="grid gap-10 p-6 sm:p-12 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:p-14">
          <div className="lg:order-2">
            <SignTitle>{c.featuresTitle}</SignTitle>
            <ul className="mt-8 divide-y divide-line border-y border-line">
              {c.features.map(([icon, title, body]) => (
                <li key={title} className="flex gap-4 py-4">
                  <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-full border-2 border-text/85">
                    <Icon name={icon as IconName} size={18} />
                  </span>
                  <div>
                    <h3 className="text-[1.0625rem] leading-[1.25] font-bold tracking-[-0.1px]">{title}</h3>
                    <p className="mt-1 text-[0.9375rem] leading-[1.45] text-text-secondary">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <figure className="relative self-center pb-10 lg:order-1 lg:pb-16">
            <img
              src="/landing/board-desktop.webp"
              alt={c.shotDesktop}
              width={1440}
              height={900}
              loading="lazy"
              className="w-full rounded-[14px] border-2 border-line-strong bg-white shadow-card"
            />
            <img
              src="/landing/board-phone.webp"
              alt={c.shotPhone}
              width={560}
              height={1250}
              loading="lazy"
              className="absolute right-[-4px] bottom-0 w-[28%] max-w-[180px] rounded-[18px] border-[5px] border-[#0f1b2d] bg-white shadow-panel sm:right-[-12px]"
            />
          </figure>
        </Sign>

        {/* Sign 4: the two platforms. */}
        <Sign id="get" className="p-6 sm:p-12 lg:p-14">
          <SignTitle>{c.getTitle}</SignTitle>
          <div className="mt-8 grid gap-5 md:grid-cols-2 md:gap-6">
            <Platform number="1" title={c.androidTitle}>
              <ol className="flex flex-col gap-3">
                {c.androidSteps.map((step, i) => (
                  <li key={step} className="flex gap-3 text-[1rem] leading-[1.45]">
                    <span
                      className={[
                        'mt-px flex h-6 w-6 flex-none items-center justify-center rounded-full font-mono text-[0.75rem] font-bold',
                        i === c.androidSteps.length - 1 ? 'bg-go text-white' : 'bg-surface-selected text-text',
                      ].join(' ')}
                    >
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <div className="mt-auto pt-7">
                <ApkButton label={c.getApk} primary />
                <p className="mt-3 text-[0.8125rem] leading-[1.4] text-text-secondary">{c.androidUpdate}</p>
              </div>
            </Platform>
            <Platform number="2" title={c.webTitle}>
              <p className="text-[1rem] leading-[1.5] text-text-secondary">{c.webBody}</p>
              <div className="mt-auto pt-7">
                <OpenWebButton label={c.openShareboard} primary />
              </div>
            </Platform>
          </div>

          <h3 className="mt-14 text-[1.375rem] font-extrabold tracking-[-0.4px]">{c.faqTitle}</h3>
          <dl className="mt-4 grid gap-x-10 border-t border-line md:grid-cols-2">
            {c.faq.map(([q, a]) => (
              <div key={q} className="border-b border-line py-4">
                <dt className="text-[1rem] font-bold">{q}</dt>
                <dd className="mt-1 text-[0.9375rem] leading-[1.45] text-text-secondary">{a}</dd>
              </div>
            ))}
          </dl>
        </Sign>
      </main>

      <footer className="bg-[#0f1b2d] text-white">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-8">
          <div className="flex items-center gap-2.5 text-[1rem] font-extrabold">
            <StationRing className="h-5 w-5 border-4 border-accent bg-white" />
            Shareboard
          </div>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.875rem] text-white/80">
            <span>{c.source}:</span>
            <a className="font-semibold text-white underline underline-offset-4 hover:text-[#5aaeff]" href={SOURCE_WEB}>
              {c.sourceWeb}
            </a>
            <a className="font-semibold text-white underline underline-offset-4 hover:text-[#5aaeff]" href={SOURCE_MOBILE}>
              {c.sourceAndroid}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

/** A white enamel sign. */
function Sign({ id, className = '', children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 rounded-[22px] bg-background shadow-panel ${className}`}
    >
      {children}
    </section>
  );
}

function SignTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[clamp(2rem,4.6vw,3.25rem)] leading-[1] font-extrabold tracking-[-0.04em] text-balance">
      {children}
    </h2>
  );
}

/** One way in, marked with its platform number like a station platform. */
function Platform({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-[18px] border-2 border-line-strong p-5 sm:p-7">
      <h3 className="mb-5 flex items-center gap-3 text-[1.5rem] leading-[1.1] font-extrabold tracking-[-0.03em] sm:text-[1.75rem]">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-text font-mono text-[1.125rem] text-background">
          {number}
        </span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function NavLink({ href, className = '', children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className={`flex min-h-11 items-center rounded-full px-3 text-[0.9375rem] font-semibold transition hover:bg-white/12 ${className}`}
    >
      {children}
    </a>
  );
}

function StationRing({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`inline-block flex-none rounded-full ${className}`} />;
}

const PILL = 'inline-flex min-h-14 items-center gap-2.5 rounded-full px-6 text-[1.0625rem] font-bold tracking-[-0.1px] transition active:scale-[0.985]';
const NAV_PILL = 'ml-1 inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-[0.875rem] font-bold transition active:scale-[0.985]';
const NAV_PILL_SOLID = 'bg-white text-accent-text shadow-accent hover:bg-surface';
const NAV_PILL_OUTLINE = 'border-2 border-white/80 hover:bg-white hover:text-accent-text';
const PILL_PRIMARY = 'bg-accent text-white shadow-accent hover:bg-accent-deep';
const PILL_SECONDARY = 'border-2 border-text text-text hover:bg-surface active:bg-surface-selected';

function OpenWebButton({ label, primary }: { label: string; primary: boolean }) {
  return (
    <Link to="/" className={`${PILL} ${primary ? PILL_PRIMARY : PILL_SECONDARY}`}>
      {label}
      <Icon name="go" size={18} />
    </Link>
  );
}

function ApkButton({ label, primary }: { label: string; primary: boolean }) {
  return (
    <a href={APK_URL} className={`${PILL} ${primary ? PILL_PRIMARY : PILL_SECONDARY}`}>
      <Icon name="download" size={18} />
      {label}
      <span className="rounded-full border-2 border-current px-2 py-px font-mono text-[0.6875rem] tracking-[1px] opacity-85">
        APK
      </span>
    </a>
  );
}

/** The share code as the app draws it: a line badge read out loud. */
function CodeBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-12 items-center gap-2.5 rounded-full bg-accent pr-4 pl-2 font-mono text-[1.25rem] font-bold tracking-[1.5px] text-white shadow-accent ${className}`}
    >
      <StationRing className="h-5 w-5 border-4 border-white" />
      K7Q2XM
    </span>
  );
}

// --- The practice board ------------------------------------------------------

const PENS = [
  { key: 'ink', color: '#0f1b2d' },
  { key: 'blue', color: '#0072ce' },
  { key: 'red', color: '#e5283c' },
] as const;

type Stroke = { color: string; d: string };

/**
 * A small board in the hero: the visitor can draw on it, while two pretend
 * people (labelled cursors) move over a few strokes that draw themselves once.
 * Nothing is saved; it shows the mechanism, not the app.
 */
function DemoBoard({ c }: { c: Copy }) {
  const [pen, setPen] = useState<(typeof PENS)[number]['key']>('blue');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const drawing = useRef<{ points: string[]; color: string } | null>(null);
  const [live, setLive] = useState<Stroke | null>(null);

  const at = (e: ReactPointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    return `${Math.round(e.clientX - box.left)} ${Math.round(e.clientY - box.top)}`;
  };

  const down = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const color = PENS.find((p) => p.key === pen)!.color;
    drawing.current = { points: [at(e)], color };
    setLive({ color, d: `M${drawing.current.points[0]}` });
  };
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = drawing.current;
    if (!d) return;
    d.points.push(at(e));
    setLive({ color: d.color, d: `M${d.points[0]} L${d.points.slice(1).join(' ')}` });
  };
  const up = () => {
    const d = drawing.current;
    drawing.current = null;
    setLive(null);
    if (!d) return;
    // A tap leaves a dot rather than nothing.
    const path = d.points.length > 1 ? `M${d.points[0]} L${d.points.slice(1).join(' ')}` : `M${d.points[0]} l0.1 0`;
    // ponytail: keeps every stroke in memory; cap it if anyone draws thousands.
    setStrokes((s) => [...s, { color: d.color, d: path }]);
  };

  return (
    <div className="sb-dots relative min-h-[420px] overflow-hidden select-none border-line max-lg:border-t-2 lg:border-l-2">
      {/* Scenery that draws itself once: the strokes of the two pretend people. */}
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 600 640" preserveAspectRatio="xMidYMid slice">
        <g className="sb-demo-draw">
          <rect x="90" y="150" width="200" height="124" rx="16" fill="#ffe27a" stroke="#0f1b2d" strokeWidth="3" pathLength={1} />
          <path d="M270 212 C 330 212, 360 290, 380 336" fill="none" stroke="#0f1b2d" strokeWidth="3.5" pathLength={1} />
          <path d="M368 326 l12 12 l4 -17" fill="none" stroke="#0f1b2d" strokeWidth="3.5" strokeLinejoin="round" pathLength={1} />
          <ellipse cx="420" cy="410" rx="82" ry="64" fill="#c4f0cf" stroke="#0f1b2d" strokeWidth="3" pathLength={1} />
          <path d="M96 470 q45 -48 90 0 t90 0 t90 0" fill="none" stroke="#e5283c" strokeWidth="6" strokeLinecap="round" pathLength={1} />
        </g>
        <text x="190" y="222" textAnchor="middle" fontFamily="Caveat, cursive" fontWeight="700" fontSize="40" fill="#0f1b2d" className="sb-demo-fade">
          {c.demoNote}
        </text>
      </svg>

      <svg
        role="img"
        aria-label={c.demoBoard}
        className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {[...strokes, ...(live ? [live] : [])].map((s, i) => (
          <path key={i} d={s.d} fill="none" stroke={s.color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>

      <FakeCursor name="Ana" color="#6e4bd8" className="sb-cursor-a" />
      <FakeCursor name="Leo" color="#00843d" className="sb-cursor-b" />

      <div className="pointer-events-none absolute top-4 right-4 left-4 flex flex-wrap items-center justify-between gap-3">
        <CodeBadge />
        <span className="glass-chip rounded-full px-3.5 py-2 text-[0.8125rem] font-bold">{c.tryHint}</span>
      </div>

      <div className="glass absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full p-1.5">
        {PENS.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-label={c[p.key]}
            aria-pressed={pen === p.key}
            data-tip={c[p.key]}
            onClick={() => setPen(p.key)}
            className={[
              'flex h-11 w-11 items-center justify-center rounded-full border-2 transition',
              pen === p.key ? 'border-accent bg-accent-soft' : 'border-transparent hover:bg-surface',
            ].join(' ')}
          >
            <span className="h-5 w-5 rounded-full" style={{ background: p.color }} />
          </button>
        ))}
        <span aria-hidden="true" className="mx-1 h-6 w-px bg-line-strong" />
        <button
          type="button"
          aria-label={c.clear}
          data-tip={c.clear}
          disabled={strokes.length === 0}
          onClick={() => setStrokes([])}
          className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-text/85 text-text transition hover:bg-surface disabled:opacity-40"
        >
          <Icon name="trash" size={18} />
        </button>
      </div>
    </div>
  );
}

function FakeCursor({ name, color, className }: { name: string; color: string; className: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute top-0 left-0 flex items-start gap-0.5 ${className}`}>
      <span
        className="h-3.5 w-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.25)]"
        style={{ background: color, borderRadius: '50% 50% 50% 2px', transform: 'rotate(-8deg)' }}
      />
      <span className="rounded-full px-2 py-0.5 text-[0.75rem] leading-[1.3] font-bold text-white" style={{ background: color }}>
        {name}
      </span>
    </div>
  );
}
