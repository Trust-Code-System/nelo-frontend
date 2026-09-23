'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Market } from '@/lib/vendure/channels';
import { paystackErrorMessage } from './paystack';

/**
 * "Confirming payment" - never "thank you".
 *
 * After a hosted payment redirect the only thing the browser knows is what the provider put
 * in the return URL, and that is an untrusted hint: it can be replayed, edited, or simply
 * arrive before the provider has told the backend anything. So this screen states what is
 * true - we are waiting for the store to confirm - and a receipt is rendered only once
 * Vendure itself reports a paid state.
 *
 * The polling is bounded on purpose. An unbounded poller becomes a load generator against
 * your own backend on exactly the day something is wrong with payments, so this makes a
 * fixed number of attempts with growing gaps, stops on a terminal state, and then hands the
 * customer a manual refresh and a way to reach a human.
 */

// Roughly 2s, 3s, 4s, 6s, 8s, 12s, 16s, 20s, 20s, 20s - about 110 seconds in total.
const BACKOFF_MS = [2000, 3000, 4000, 6000, 8000, 12000, 16000, 20000, 20000, 20000];

type Status = 'waiting' | 'paid' | 'failed' | 'timeout' | 'unknown';

export function PaymentStatusPoll({
  market,
  code,
  reference,
  /** True when the server render already saw a paid state - the poll then never starts. */
  alreadyPaid,
}: {
  market: Market;
  code: string;
  reference: string;
  alreadyPaid: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(alreadyPaid ? 'paid' : 'waiting');
  const [attempt, setAttempt] = useState(0);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  // Bumping this restarts the poll loop. "Check again" has to reopen the budget, and the
  // effect's dependencies are the only thing that can do that.
  const [restarts, setRestarts] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    if (alreadyPaid) return;
    cancelled.current = false;

    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check(index: number) {
      if (cancelled.current) return;

      try {
        const response = await fetch(
          `/api/order-status/${encodeURIComponent(code)}?market=${market}&reference=${encodeURIComponent(reference)}`,
          { cache: 'no-store' },
        );
        const body = (await response.json()) as {
          known?: boolean;
          paid?: boolean;
          state?: string | null;
          terminal?: boolean;
          errorCode?: string | null;
        };

        if (cancelled.current) return;

        if (body.paid) {
          setStatus('paid');
          // The page re-renders from Vendure, which is what turns this into a real receipt.
          router.refresh();
          return;
        }
        if (body.terminal) {
          setErrorCode(body.errorCode ?? null);
          setStatus('failed');
          router.refresh();
          return;
        }
        if (response.status === 404) {
          setStatus('unknown');
          return;
        }
      } catch {
        // A failed poll is not a failed payment. Try again until the budget runs out.
      }

      const next = index + 1;
      const delay = BACKOFF_MS[next];
      if (delay === undefined) {
        setStatus('timeout');
        return;
      }
      setAttempt(next);
      timer = setTimeout(() => void check(next), delay);
    }

    timer = setTimeout(() => void check(0), BACKOFF_MS[0]);

    return () => {
      cancelled.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [alreadyPaid, code, market, reference, router, restarts]);

  if (status === 'paid') return null;

  return (
    <div className="empty" style={{ textAlign: 'left', alignItems: 'flex-start' }}>
      <span className="lab">
        {status === 'waiting' ? 'Confirming payment' : 'Not confirmed'}
      </span>

      {status === 'waiting' ? (
        <>
          <h2>We are confirming your payment</h2>
          <p aria-live="polite">
            Your order is saved as <span className="num">{code}</span>. We are waiting for the
            payment provider to confirm it with us - that is the only thing we will treat as
            paid. Do not pay again.
          </p>
          <p className="mnote">
            Checked {attempt + 1} {attempt === 0 ? 'time' : 'times'}.
          </p>
        </>
      ) : null}

      {status === 'failed' ? (
        <>
          <h2>We could not confirm this payment</h2>
          <p aria-live="polite">
            {paystackErrorMessage(errorCode)} Order <span className="num">{code}</span> is
            saved for support.
          </p>
        </>
      ) : null}

      {status === 'unknown' ? (
        <>
          <h2>We cannot see that order</h2>
          <p aria-live="polite">
            Order <span className="num">{code}</span> is not one we can show you from this
            browser. If you checked out as a guest, the link works for two hours - after that
            we can look it up for you.
          </p>
        </>
      ) : null}

      {status === 'timeout' ? (
        <>
          <h2>This is taking longer than it should</h2>
          <p aria-live="polite">
            We stopped checking automatically so we are not hammering our own store. Your
            order is <span className="num">{code}</span> and nothing about it has been lost.
          </p>
        </>
      ) : null}

      <div className="acts-row">
        <button
          className="btn-q"
          type="button"
          onClick={() => {
            setStatus('waiting');
            setAttempt(0);
            setErrorCode(null);
            setRestarts((value) => value + 1);
            router.refresh();
          }}
        >
          Check again
        </button>
        <Link className="btn-q" href={`/${market}/contact`}>
          Ask us about it
        </Link>
      </div>
    </div>
  );
}
