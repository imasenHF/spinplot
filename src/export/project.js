// Project serialization boundary.
// Existing project version handling remains in project/project.js until migration.

export function exportProjectPayload(payload) {
  return JSON.stringify(payload, null, 2);
}
