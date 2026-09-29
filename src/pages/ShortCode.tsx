/**
 * `/b/<code>` — the link form of a board code.
 *
 * It resolves the code and redirects to the canonical board route, so a link
 * sent in a chat lands somewhere the browser can bookmark, and a wrong code
 * says so instead of hanging.
 */
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { Backdrop } from '../components/ui/Backdrop';
import { Button } from '../components/ui/Button';
import { useT } from '../features/i18n';
import { resolveShortCode } from '../lib/api';
import { normalizeShortCode } from '../lib/short-code';

export default function ShortCodePage() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const [boardId, setBoardId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolveShortCode(normalizeShortCode(code)).then(
      (id) => !cancelled && setBoardId(id),
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (boardId) return <Navigate to={`/board/${boardId}`} replace />;

  return (
    <main className="relative h-full">
      <Backdrop variant="home" />
      <div className="relative flex h-full flex-col items-center justify-center gap-3.5 p-7 text-center">
        {failed ? (
          <>
            <h1 className="text-[1.25rem] leading-tight font-extrabold tracking-[-0.4px]">
              {t.errNoBoard}
            </h1>
            <p className="font-mono text-[0.8125rem] text-text-secondary">
              {normalizeShortCode(code)}
            </p>
            <Button
              label={t.back}
              icon="back"
              variant="secondary"
              onClick={() => navigate('/', { replace: true })}
            />
          </>
        ) : (
          <>
            <div className="sb-loading" role="status" aria-label={t.loading} />
            <p className="sb-late text-[0.8125rem] font-semibold text-text-tertiary">{t.loading}</p>
          </>
        )}
      </div>
    </main>
  );
}
