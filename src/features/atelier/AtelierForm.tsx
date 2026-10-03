'use client';

import { createContext, useActionState, useContext } from 'react';

import { useFormStatus } from 'react-dom';
import { IDLE, type FormState } from '@/features/account/state';

const RetryBlocked = createContext(false);

export function AtelierForm({ action, children, className, replaceOnSuccess = false }: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  replaceOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  return <RetryBlocked.Provider value={Boolean(state.retryBlocked)}><form action={formAction} className={className} aria-busy={pending} onSubmit={event => { if (state.retryBlocked || pending) event.preventDefault(); }}>
    {state.status !== 'idle' ? <div className={`notice ${state.status === 'error' ? 'notice-error' : 'notice-ok'} atelier-feedback`} role={state.status === 'error' ? 'alert' : 'status'}>
      <p>{state.message}</p>
      {state.fieldErrors ? <ul>{Object.entries(state.fieldErrors).map(([field, message]) => <li key={field}>{message}</li>)}</ul> : null}
    </div> : null}
    {replaceOnSuccess && state.status === 'success' ? null : children}
  </form></RetryBlocked.Provider>;
}

export function AtelierSubmit({ children, pendingLabel = 'Saving…', className = 'btn submit' }: {
  children: React.ReactNode; pendingLabel?: string; className?: string;
}) {
  const { pending } = useFormStatus();
  const retryBlocked = useContext(RetryBlocked);
  return <button className={className} type="submit" disabled={pending || retryBlocked}>{pending ? pendingLabel : children}</button>;
}
