export interface SchemaScannerPort {
  findSchemaFiles(extensionPath: string): Promise<string[]>;
}
