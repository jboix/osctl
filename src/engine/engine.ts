// The engine facade: the only engine module the frontend imports.

export { applyAliases } from './commands/apply-aliases';
export { applyClusterSettings } from './commands/cluster-settings';
export {
  applyComponent,
  deleteComponent,
} from './commands/component-templates';
export { createIndex } from './commands/create-index';
export { deleteAlias } from './commands/delete-alias';
export { deleteIndices } from './commands/delete-indices';
export { applyIndexSettings } from './commands/index-settings';
export { applyPolicy, deletePolicy } from './commands/policies';
export type { RolloverResult } from './commands/rollover';
export { rollover } from './commands/rollover';
export { applyTemplate, deleteTemplate } from './commands/templates';
export type { BackupInfo, BackupType } from './config/backups';
export { BackupStore } from './config/backups';
export type { Config, Profile } from './config/profile';
export { defaultConfigPath, ProfileStore } from './config/profile';
export type { Connection } from './connection/connection';
export { createConnection } from './connection/connection';
export type { FailureReport } from './connection/failure';
export { describeFailure } from './connection/failure';
export type { AliasInfo } from './queries/aliases';
export { listAliases } from './queries/aliases';
export type {
  AllocationExplanation,
  ClusterInfo,
  ClusterSettings,
  NodeDecision,
  NodeInfo,
} from './queries/cluster';
export {
  clusterInfo,
  clusterSettings,
  explainAllocation,
  listNodes,
} from './queries/cluster';
export type { ComponentInfo } from './queries/component-templates';
export { getComponent, listComponents } from './queries/component-templates';
export type { Health } from './queries/health';
export { health } from './queries/health';
export type { IndexInfo } from './queries/indices';
export { getIndex, getIndexSettings, listIndices } from './queries/indices';
export type {
  ExplainRow,
  PolicyDocument,
  PolicyInfo,
} from './queries/policies';
export { explainIsm, getPolicy, listPolicies } from './queries/policies';
export type { TemplateInfo } from './queries/templates';
export { getTemplate, listTemplates } from './queries/templates';
