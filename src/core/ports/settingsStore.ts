export interface SettingsStorePort {
  dumpDconf(schemaPath: string): Promise<string>;
  loadDconf(schemaPath: string, data: string): Promise<void>;
}
