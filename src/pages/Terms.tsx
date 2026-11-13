/**
 * `/terminos`: Shareboard's terms of use and privacy, in plain language, in
 * the landing page's world. Every statement here describes what the code
 * actually does (server/src, web/src); change both together.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { LINKS, SiteFooter, SiteNav, usePublicCopy, usePublicPage } from './Landing';
import './landing.css';

type Block = { id: string; title: string; body: (string | string[])[] };

const TERMS: Record<'es' | 'en', { title: string; h1: string; updated: string; intro: string; toc: string; blocks: Block[] }> = {
  es: {
    title: 'Términos de uso y privacidad · Shareboard',
    h1: 'Términos y privacidad',
    updated: 'Última actualización: 12 de noviembre de 2026',
    intro:
      'Shareboard es un proyecto gratuito y de código abierto. Aquí está, en palabras simples, qué aceptas al usarlo y qué pasa con tus datos.',
    toc: 'En esta página',
    blocks: [
      {
        id: 'resumen',
        title: 'En resumen',
        body: [
          [
            'Puedes usar Shareboard gratis, sin cuenta, para dibujar solo o con otros.',
            'Lo que dibujas es tuyo. Nosotros solo lo guardamos para mostrarlo a quien compartas.',
            'Tu primera pizarra vive en tu dispositivo; una pizarra compartida se guarda en el servidor.',
            'No hay anuncios ni analítica, y no vendemos datos.',
            'El servicio se ofrece tal cual, sin garantías, como dice la licencia MIT.',
          ],
        ],
      },
      {
        id: 'uso',
        title: 'Uso aceptable',
        body: [
          'Usa Shareboard de forma legal y respetuosa. No publiques en pizarras compartidas contenido ilegal, que acose o amenace a otras personas, que infrinja derechos de autor de terceros o que contenga datos personales ajenos sin permiso.',
          'No intentes saturar el servicio, saltarte sus límites, entrar a pizarras con PIN que no son tuyas ni acceder a cuentas ajenas. Podemos borrar pizarras o cuentas que incumplan estas reglas.',
        ],
      },
      {
        id: 'contenido',
        title: 'Tus pizarras',
        body: [
          'Lo que dibujas, escribes o importas sigue siendo tuyo. Al compartir una pizarra nos permites guardarla y mostrarla a las personas que tengan su código o enlace, solo para que funcione.',
          'Quien tiene el código o el enlace de una pizarra pública puede verla. Con un PIN, solo entra quien lo conoce. Tú decides quién puede editar y quién solo puede ver, y puedes borrar las pizarras que creaste.',
          'Las personas con permiso de edición pueden cambiar o borrar lo que hay en la pizarra. Exporta una copia (PNG, SVG o JSON) si algo te importa.',
        ],
      },
      {
        id: 'cuentas',
        title: 'Cuentas',
        body: [
          'No necesitas cuenta para empezar. Shareboard te la pide solo cuando compartir una pizarra la necesita.',
          'Eres responsable de tu contraseña. Si crees que alguien entró a tu cuenta, cámbiala desde la app o usa «olvidé mi contraseña».',
        ],
      },
      {
        id: 'privacidad',
        title: 'Qué datos guardamos',
        body: [
          [
            'En tu dispositivo: tu pizarra local, tu apodo y avatar, tus ajustes y, si inicias sesión, un token de sesión que dura hasta 30 días.',
            'Si creas una cuenta: tu nombre de usuario, tu correo, tu apodo y avatar, y tu contraseña guardada como hash (nunca la contraseña en sí).',
            'Si compartes una pizarra: su contenido, su nombre, sus permisos y, si tiene PIN, un hash del PIN (nunca el PIN en sí). Quienes dibujan contigo ven tu apodo y tu cursor.',
            'Tu correo se usa solo para enviarte códigos de verificación y de cambio de contraseña, que vencen a los 15 minutos.',
          ],
          'No usamos cookies de seguimiento, analítica ni anuncios. Los proveedores que alojan la web y el servidor, y Google Fonts (que sirve las tipografías), pueden registrar datos técnicos como la dirección IP para que el servicio funcione y sea seguro.',
        ],
      },
      {
        id: 'ia',
        title: 'Dibujar con IA',
        body: [
          'Cuando usas «Dibujar con IA», el texto que escribes se envía a un proveedor externo de inteligencia artificial (hoy, Google Gemini) para generar el dibujo. No escribas ahí datos personales ni información sensible. El resultado puede tener errores: revísalo antes de usarlo.',
        ],
      },
      {
        id: 'borrar',
        title: 'Borrar tus datos',
        body: [
          'Puedes borrar tus pizarras desde la app, y tu pizarra local borrando los datos del navegador o desinstalando la app.',
          'Para borrar tu cuenta, escríbenos por los canales de contacto de abajo desde el mismo nombre de usuario y la eliminaremos junto con sus pizarras.',
        ],
      },
      {
        id: 'garantia',
        title: 'Sin garantías',
        body: [
          'Shareboard es un proyecto de código abierto bajo la licencia MIT. Se ofrece «tal cual», sin garantías de ningún tipo: puede fallar, cambiar o dejar de estar disponible, y podrías perder pizarras guardadas en el servidor. En la medida que la ley lo permite, no somos responsables de daños derivados de su uso.',
          'El código es tuyo también: puedes usarlo, copiarlo, modificarlo y distribuirlo según los términos de la licencia MIT.',
        ],
      },
      {
        id: 'cambios',
        title: 'Cambios y contacto',
        body: [
          'Si cambiamos estos términos, actualizaremos la fecha de arriba. Seguir usando Shareboard después significa que aceptas la nueva versión.',
          'Preguntas, problemas o solicitudes de borrado: abre un issue en GitHub o escríbeme en X.',
        ],
      },
    ],
  },
  en: {
    title: 'Terms of use and privacy · Shareboard',
    h1: 'Terms and privacy',
    updated: 'Last updated: 12 November 2026',
    intro: 'Shareboard is a free, open-source project. Here is, in plain words, what you agree to by using it and what happens to your data.',
    toc: 'On this page',
    blocks: [
      {
        id: 'resumen',
        title: 'In short',
        body: [
          [
            'You can use Shareboard for free, without an account, to draw alone or with others.',
            'What you draw is yours. We only store it to show it to whoever you share it with.',
            'Your first board lives on your device; a shared board is stored on the server.',
            'There are no ads and no analytics, and we do not sell data.',
            'The service is provided as is, without warranty, as the MIT licence says.',
          ],
        ],
      },
      {
        id: 'uso',
        title: 'Acceptable use',
        body: [
          'Use Shareboard lawfully and respectfully. Do not post content on shared boards that is illegal, that harasses or threatens others, that infringes third-party copyright, or that includes other people’s personal data without permission.',
          'Do not try to overload the service, get around its limits, enter PIN boards that are not yours or access other people’s accounts. We may delete boards or accounts that break these rules.',
        ],
      },
      {
        id: 'contenido',
        title: 'Your boards',
        body: [
          'What you draw, write or import stays yours. By sharing a board you let us store it and show it to people who have its code or link, only so that it works.',
          'Anyone with the code or link of a public board can see it. With a PIN, only people who know it get in. You choose who can edit and who can only view, and you can delete boards you created.',
          'People with edit access can change or delete what is on the board. Export a copy (PNG, SVG or JSON) of anything that matters to you.',
        ],
      },
      {
        id: 'cuentas',
        title: 'Accounts',
        body: [
          'You do not need an account to start. Shareboard asks for one only when sharing a board needs it.',
          'You are responsible for your password. If you think someone got into your account, change it in the app or use “forgot password”.',
        ],
      },
      {
        id: 'privacidad',
        title: 'What data we keep',
        body: [
          [
            'On your device: your local board, nickname and avatar, your settings and, if you sign in, a session token that lasts up to 30 days.',
            'If you create an account: your username, email, nickname and avatar, and your password stored as a hash (never the password itself).',
            'If you share a board: its content, name, permissions and, if it has a PIN, a hash of the PIN (never the PIN itself). People drawing with you see your nickname and cursor.',
            'Your email is used only to send verification and password-reset codes, which expire after 15 minutes.',
          ],
          'We use no tracking cookies, analytics or ads. The providers hosting the website and the server, and Google Fonts (which serves the typefaces), may log technical data such as IP addresses so the service works and stays secure.',
        ],
      },
      {
        id: 'ia',
        title: 'Drawing with AI',
        body: [
          'When you use “Draw with AI”, the text you type is sent to an external AI provider (currently Google Gemini) to generate the drawing. Do not type personal or sensitive information there. The result can contain mistakes: check it before relying on it.',
        ],
      },
      {
        id: 'borrar',
        title: 'Deleting your data',
        body: [
          'You can delete your boards in the app, and your local board by clearing the browser’s data or uninstalling the app.',
          'To delete your account, contact us through the channels below from the same username and we will remove it along with its boards.',
        ],
      },
      {
        id: 'garantia',
        title: 'No warranty',
        body: [
          'Shareboard is an open-source project under the MIT licence. It is provided “as is”, without warranty of any kind: it may fail, change or stop being available, and boards stored on the server could be lost. To the extent the law allows, we are not liable for damages arising from its use.',
          'The code is yours too: you may use, copy, modify and distribute it under the terms of the MIT licence.',
        ],
      },
      {
        id: 'cambios',
        title: 'Changes and contact',
        body: [
          'If we change these terms, we will update the date above. Using Shareboard after that means you accept the new version.',
          'Questions, problems or deletion requests: open an issue on GitHub or message me on X.',
        ],
      },
    ],
  },
};

export default function TermsPage() {
  const { lang } = usePublicCopy();
  const t = TERMS[lang];
  const theme = usePublicPage(t.title);
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div data-lp={theme} className="lp h-full overflow-y-auto [scroll-behavior:smooth] motion-reduce:[scroll-behavior:auto]">
      <SiteNav base="/about" />
      <main className="mx-auto max-w-[1240px] px-4 pt-16 pb-28 sm:px-8 sm:pt-24">
        <header className="max-w-[46rem]">
          <h1 className="lp-display text-[clamp(2.5rem,7vw,5rem)] leading-[0.98]">{t.h1}</h1>
          <p className="mt-5 text-[1.125rem] leading-[1.55] text-(--lp-ink-2)">{t.intro}</p>
          <p className="mt-4 font-mono text-[0.8125rem] text-(--lp-ink-3)">{t.updated}</p>
        </header>
        <div className="mt-16 grid gap-12 lg:grid-cols-[220px_1fr] lg:gap-20">
          <nav aria-label={t.toc} className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-[0.8125rem] font-semibold text-(--lp-ink-3)">{t.toc}</p>
            <ol className="mt-4 flex flex-col gap-2.5 border-l border-(--lp-line) pl-4">
              {t.blocks.map((b) => (
                <li key={b.id}>
                  <a href={`#${b.id}`} className="text-[0.9375rem] text-(--lp-ink-2) transition hover:text-(--lp-ink)">
                    {b.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <article className="max-w-[44rem]">
            {t.blocks.map((b) => (
              <section key={b.id} id={b.id} className="scroll-mt-24 border-t border-(--lp-line) py-10 first:border-t-0 first:pt-0">
                <h2 className="text-[1.625rem] font-bold tracking-[-0.02em]">{b.title}</h2>
                {b.body.map((p, i) =>
                  Array.isArray(p) ? (
                    <ul key={i} className="mt-5 flex flex-col gap-3">
                      {p.map((li) => (
                        <li key={li} className="flex gap-3 text-[1.0625rem] leading-[1.65] text-(--lp-ink-2)">
                          <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 flex-none rounded-full bg-(--lp-blue)" />
                          {li}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i} className="mt-5 text-[1.0625rem] leading-[1.65] text-(--lp-ink-2)">
                      {p}
                    </p>
                  ),
                )}
                {b.id === 'cambios' ? (
                  <p className="mt-6 flex flex-wrap gap-3">
                    <a href={LINKS.issues} className="inline-flex h-11 items-center rounded-full border border-(--lp-line-2) px-4 text-[0.9375rem] font-semibold hover:bg-(--lp-wash)">
                      GitHub issues
                    </a>
                    <a href={LINKS.x} className="inline-flex h-11 items-center rounded-full border border-(--lp-line-2) px-4 text-[0.9375rem] font-semibold hover:bg-(--lp-wash)">
                      X · @1714jud
                    </a>
                  </p>
                ) : null}
              </section>
            ))}
          </article>
        </div>
      </main>
      <SiteFooter base="/about" />
    </div>
  );
}
