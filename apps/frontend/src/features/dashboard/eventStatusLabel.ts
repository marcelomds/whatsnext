import type { TranslationKey } from "../../i18n/translations";

const STATUS_LABELS: Record<string, TranslationKey> = {
  created: "eventsStatusCreated",
};

export function eventStatusLabel(t: (key: TranslationKey) => string, status: string): string {
  const key = STATUS_LABELS[status];
  return key ? t(key) : status;
}
