// src/hooks/useTerminalMail.ts
import { useState, useCallback } from 'react';
import { getFormConfig } from '@/content/loader';

type FieldName = 'name' | 'from' | 'subject' | 'body';

type MailPhase =
  | { phase: 'composing' }
  | { phase: 'sending'; progress: number }
  | { phase: 'success' }
  | { phase: 'error'; message: string };

interface Fields {
  name: string;
  from: string;
  subject: string;
  body: string;
}

type FieldErrors = Partial<Record<FieldName | 'general', string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINK_PATTERNS = [/https?:\/\/[^\s]+/i, /www\.[^\s]+/i];

const STORAGE_KEY_COUNT = 'formSubmissionCount';
const STORAGE_KEY_TIME = 'lastSubmitTime';
const DAY_MS = 86_400_000;

function getSubmissionCount(): number {
  const lastTime = localStorage.getItem(STORAGE_KEY_TIME);
  if (lastTime && Date.now() - parseInt(lastTime) > DAY_MS) {
    localStorage.setItem(STORAGE_KEY_COUNT, '0');
    return 0;
  }
  return parseInt(localStorage.getItem(STORAGE_KEY_COUNT) || '0');
}

function recordSubmission() {
  const count = getSubmissionCount();
  localStorage.setItem(STORAGE_KEY_COUNT, (count + 1).toString());
  localStorage.setItem(STORAGE_KEY_TIME, Date.now().toString());
}

function containsLinks(text: string): boolean {
  return LINK_PATTERNS.some((p) => p.test(text));
}

function validateFields(fields: Fields, minLen: number): FieldErrors {
  const errors: FieldErrors = {};
  if (!fields.name.trim()) errors.name = 'Name is required';
  if (!fields.from.trim()) errors.from = 'Email is required';
  else if (!EMAIL_RE.test(fields.from)) errors.from = 'Invalid email address';
  if (!fields.subject.trim()) errors.subject = 'Subject is required';
  if (!fields.body.trim()) errors.body = 'Message is required';
  else if (fields.body.trim().length < minLen)
    errors.body = `Message must be at least ${minLen} characters`;
  else if (containsLinks(fields.body)) errors.body = 'Please do not include links';
  return errors;
}

export function useTerminalMail() {
  const config = getFormConfig();
  const [state, setState] = useState<MailPhase>({ phase: 'composing' });
  const [fields, setFields] = useState<Fields>({ name: '', from: '', subject: '', body: '' });
  const [errors, setErrors] = useState<FieldErrors>({});

  const rateLimited = getSubmissionCount() >= config.maxDailySubmissions;

  const setField = useCallback((name: FieldName, value: string) => {
    setFields((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    if (rateLimited) {
      setErrors({ general: 'Daily submission limit reached. Try again tomorrow.' });
      return false;
    }
    const errs = validateFields(fields, config.minMessageLength);
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [fields, rateLimited, config.minMessageLength]);

  const submit = useCallback(async () => {
    if (!validate()) return;

    setState({ phase: 'sending', progress: 0 });

    const minDelay = new Promise<void>((r) => setTimeout(r, 1200));

    try {
      const formData = new FormData();
      formData.append('name', fields.name);
      formData.append('email', fields.from);
      formData.append('_subject', `Portfolio contact: ${fields.subject}`);
      formData.append('subject', fields.subject);
      formData.append('message', fields.body);

      const [response] = await Promise.all([
        fetch(config.endpoint, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: formData,
        }),
        minDelay,
      ]);

      if (response.ok) {
        recordSubmission();
        setState({ phase: 'success' });
      } else {
        throw new Error('Failed to send message');
      }
    } catch {
      setState({ phase: 'error', message: 'Something went wrong. Please try again.' });
    }
  }, [fields, validate, config.endpoint]);

  const reset = useCallback(() => {
    setFields({ name: '', from: '', subject: '', body: '' });
    setErrors({});
    setState({ phase: 'composing' });
  }, []);

  const canSubmit =
    state.phase === 'composing' &&
    !rateLimited &&
    fields.from.trim() !== '' &&
    fields.subject.trim() !== '' &&
    fields.body.trim() !== '';

  return { state, fields, errors, setField, submit, reset, canSubmit, rateLimited, config };
}
