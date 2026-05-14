// PII field definitions, data retention policy, GDPR helpers.

export const PII_FIELDS = [
  'email',
  'height',
  'chest',
  'waist',
  'hips',
  'inseam',
  'shoulder_width',
  'avatar_url',
  'face_texture_url',
  'user_photo_url',
] as const;

export type PiiField = (typeof PII_FIELDS)[number];

export const DATA_RETENTION_DAYS = {
  tryon_results: 90,
  usage_logs: 365,
  audit_logs: 730,     // 2 years
  user_photos: 90,
  avatars: -1,         // indefinite (user-owned asset)
} as const;

export function isPiiField(field: string): field is PiiField {
  return (PII_FIELDS as readonly string[]).includes(field);
}

// GDPR delete helper — returns SQL-level field nullifications
// Actual deletion must be performed by caller with service-role client
export function getGdprDeletePatch(): Record<PiiField, null> {
  return Object.fromEntries(PII_FIELDS.map(f => [f, null])) as Record<PiiField, null>;
}
