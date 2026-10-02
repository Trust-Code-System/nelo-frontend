'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { IDLE, type FormState } from '@/features/account/state';

export function AtelierForm({ action, children, className, replaceOnSuccess = false }: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  replaceOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  return <form action={formAction} className={className} aria-busy={pending}>
    {state.status !== 'idle' ? <div className={`notice ${state.status === 'error' ? 'notice-error' : 'notice-ok'} atelier-feedback`} role={state.status === 'error' ? 'alert' : 'status'}>
      <p>{state.message}</p>
      {state.fieldErrors ? <ul>{Object.entries(state.fieldErrors).map(([field, message]) => <li key={field}>{message}</li>)}</ul> : null}
    </div> : null}
    {replaceOnSuccess && state.status === 'success' ? null : children}
  </form>;
}

export function AtelierSubmit({ children, pendingLabel = 'Saving…', className = 'btn submit' }: {
  children: React.ReactNode; pendingLabel?: string; className?: string;
}) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" disabled={pending}>{pending ? pendingLabel : children}</button>;
}
