/**
 * The welcome screens, once per browser: what the app does, what to call you,
 * and an account — which can wait ("Not now"; sharing asks again later).
 *
 * Three short steps in the manner of Apple's own first-run screens: one idea
 * each, a big title, a few lines, one obvious button. They sit on the same
 * frosted panel over the board's dot grid as every other gate in the app.
 */
import { useState } from 'react';

import { useT } from '../../features/i18n';
import { useSessionStore } from '../../features/session';

import { AuthForm } from '../account/AuthForm';
import { Backdrop } from '../ui/Backdrop';
import { Button } from '../ui/Button';
import { GlassPanel } from '../ui/Glass';
import { Icon, type IconName } from '../ui/Icon';
import { NicknameScreen } from './NicknameScreen';

export function Onboarding() {
  const t = useT();
  const [step, setStep] = useState<'welcome' | 'name' | 'account'>('welcome');
  const finish = useSessionStore((s) => s.setOnboarded);

  if (step === 'name') {
    return (
      <NicknameScreen
        blank
        onContinue={(name) => {
          useSessionStore.getState().setNickname(name);
          setStep('account');
        }}
      />
    );
  }

  const features: [IconName, string, string][] = [
    ['pencil', t.welcomeDrawTitle, t.welcomeDrawBody],
    ['people', t.welcomeShareTitle, t.welcomeShareBody],
    ['sparkle', t.welcomeAiTitle, t.welcomeAiBody],
  ];

  return (
    <main className="relative h-full overflow-hidden">
      <Backdrop variant="nickname" />
      <div className="absolute inset-0 flex items-center justify-center overflow-y-auto px-4 py-6">
        <GlassPanel
          key={step}
          level="panel"
          radius={26}
          className="sb-dialog w-full max-w-[440px] shadow-panel"
          style={{ maxHeight: 'calc(100% - 16px)' }}
        >
          <div className="no-scrollbar flex max-h-[calc(100vh-48px)] flex-col gap-7 overflow-y-auto px-6 pt-9 pb-6 sm:px-8">
            {step === 'welcome' ? (
              <>
                <div className="flex flex-col items-center gap-4 text-center">
                  <img src="/apple-touch-icon.png" alt="" width={64} height={64} className="rounded-[16px] shadow-card" />
                  <h1 className="text-[1.75rem] leading-[1.1] font-extrabold tracking-[-0.6px]">{t.welcomeTitle}</h1>
                </div>
                <ul className="flex flex-col gap-5">
                  {features.map(([icon, title, body]) => (
                    <li key={title} className="flex items-start gap-4">
                      <span className="mt-0.5 text-accent">
                        <Icon name={icon} size={28} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[0.9375rem] leading-tight font-bold">{title}</div>
                        <p className="mt-1 text-[0.8125rem] leading-snug text-text-secondary">{body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button label={t.continue} fullWidth onClick={() => setStep('name')} />
              </>
            ) : (
              <>
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="text-accent">
                    <Icon name="user" size={44} />
                  </span>
                  <h1 className="text-[1.5rem] leading-[1.15] font-extrabold tracking-[-0.5px]">{t.accountTitle}</h1>
                  <p className="text-[0.8438rem] leading-relaxed text-text-secondary">{t.accountSub}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <AuthForm onDone={finish} />
                  <Button label={t.notNow} variant="ghost" fullWidth compact onClick={finish} />
                </div>
              </>
            )}
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}
