// The engine facade: the only engine module the frontend imports.

export { createIndex } from './commands/create-index';
export { deleteIndices } from './commands/delete-indices';
export type { RolloverResult } from './commands/rollover';
export { rollover } from './commands/rollover';
export type { Config, Profile } from './config/profile';
export { defaultConfigPath, ProfileStore } from './config/profile';
export type { Connection } from './connection/connection';
export { createConnection } from './connection/connection';
export type { Health } from './queries/health';
export { health } from './queries/health';
export type { IndexInfo } from './queries/indices';
export { formatBytes, listIndices } from './queries/indices';
