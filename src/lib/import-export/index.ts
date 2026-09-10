export { APP_VERSION } from './types';
export type { 
  ExportFile, 
  ExportFileData, 
  ExportFileMeta, 
  ImportMode, 
  ImportPreview, 
  ImportProgress, 
  ImportResult, 
  ValidationError 
} from './types';

export { createExportFile, exportToFile, getDocCounts } from './exporter';
export { parseExportFile, generateImportPreview, executeImport } from './importer';
export { migrateToLatest, registerMigration, CURRENT_SCHEMA_VERSION } from './migrations';
