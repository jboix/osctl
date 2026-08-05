// The engine facade: the only engine module the frontend imports.

export { applyAliases } from './commands/apply-aliases';
export { createIndex } from './commands/create-index';
export { deleteAlias } from './commands/delete-alias';
export { deleteIndices } from './commands/delete-indices';
export type { RolloverResult } from './commands/rollover';
export { rollover } from './commands/rollover';
export { applyTemplate, deleteTemplate } from './commands/templates';
export type { Config, Profile } from './config/profile';
export { defaultConfigPath, ProfileStore } from './config/profile';
export type { Connection } from './connection/connection';
export { createConnection } from './connection/connection';
export type { FailureReport } from './connection/failure';
export { describeFailure } from './connection/failure';
export type { AliasInfo } from './queries/aliases';
export { listAliases } from './queries/aliases';
export type { Health } from './queries/health';
export { health } from './queries/health';
export type { IndexInfo } from './queries/indices';
export { formatBytes, listIndices } from './queries/indices';
export type { TemplateInfo } from './queries/templates';
export { getTemplate, listTemplates } from './queries/templates';
