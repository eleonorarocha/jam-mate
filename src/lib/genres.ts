// Canonical list of music genres used across onboarding, profile and map filters.
// Stored in the database as text[] on profiles.genres and validated by the
// `validate_profile_genres` trigger — keep both lists in sync.
export const MUSIC_GENRES = [
  'rock',
  'pop',
  'jazz',
  'blues',
  'funk',
  'soul',
  'classica',
  'folk',
  'eletronica',
  'hiphop',
  'reggae',
  'metal',
  'punk',
  'latina',
  'country',
  'world',
] as const;

export type MusicGenre = (typeof MUSIC_GENRES)[number];

export const isMusicGenre = (value: string): value is MusicGenre =>
  (MUSIC_GENRES as readonly string[]).includes(value);
