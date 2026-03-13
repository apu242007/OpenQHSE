import type messages from '@/i18n/messages/en.json';

type Messages = typeof messages;

declare global {
  // Used by next-intl to provide type-safe message keys
  interface IntlMessages extends Messages {}
}
