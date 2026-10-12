export interface ExtensionInfo {
  uuid: string;
  path: string;
  name: string;
  version?: string;
}

export interface ExtensionPlatformPort {
  listUserExtensions(): Promise<string[]>;
  uninstallExtension(uuid: string): Promise<void>;
  installExtension(uuid: string, zipBytes: Uint8Array): Promise<void>;
  enableExtension(uuid: string): Promise<boolean>;
}
