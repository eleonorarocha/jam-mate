import { useState, useCallback } from 'react';

export type NotificationPrefKey = 'messages' | 'bookings' | 'reminders' | 'sound';

const STORAGE_PREFIX = 'jammate_notif_';

const DEFAULTS: Record<NotificationPrefKey, boolean> = {
  messages: true,
  bookings: true,
  reminders: true,
  sound: true,
};

export const getNotifPref = (key: NotificationPrefKey): boolean => {
  const val = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
  return val === null ? DEFAULTS[key] : val === 'true';
};

export const setNotifPref = (key: NotificationPrefKey, enabled: boolean) => {
  localStorage.setItem(`${STORAGE_PREFIX}${key}`, String(enabled));
};

/**
 * React hook that provides reactive state for all notification preferences.
 */
export const useNotificationPreferences = () => {
  const [prefs, setPrefs] = useState<Record<NotificationPrefKey, boolean>>(() => ({
    messages: getNotifPref('messages'),
    bookings: getNotifPref('bookings'),
    reminders: getNotifPref('reminders'),
    sound: getNotifPref('sound'),
  }));

  const toggle = useCallback((key: NotificationPrefKey, value: boolean) => {
    setNotifPref(key, value);
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { prefs, toggle };
};
