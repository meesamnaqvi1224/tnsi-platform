/**
 * My Reflections logic lives in @tnsi/core (packages/core/src/reflections/logic.ts) and is shared with the
 * website. This file re-exports it for the screens. The app's `ApiRequestError` carries `status` and
 * `code`, which is all the shared error description reads.
 */
export {
  charactersLeft,
  createAutosaver,
  describeReflectionError,
  EMPTY_FIELDS,
  fieldsOf,
  formatReflectionDate,
  hasUnsavedChanges,
  isAutosaveEligible,
  isBlank,
  newClientId,
  normalizeFields,
  REFLECTION_CONTENT_MAX,
  REFLECTION_COUNTER_THRESHOLD,
  REFLECTION_TITLE_MAX,
  ReflectionSaveError,
  saveReflection,
  type Autosaver,
  type DescribedError,
  type ReflectionErrorKind,
  type ReflectionFields,
  type SaveTarget,
} from '@tnsi/core';
