import { createProject } from "../project/project.js";
export function exportProjectPayload(payload) {
  return JSON.stringify(createProject(payload));
}
export function exportConfigPayload(config) {
  return JSON.stringify(config, null, 2);
}
