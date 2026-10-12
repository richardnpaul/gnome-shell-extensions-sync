import { SyncData } from '@esync/data';
import { File } from '@gi-types/gio2';
import { readFileContentsAsync, replaceFileContentsAsync } from '@esync/utils';
import { SyncOperationStatus, SyncProvider } from '../types';

export class Local implements SyncProvider {
  private backupFileLocation: string;

  constructor(backupFileLocation: string) {
    this.backupFileLocation = backupFileLocation;
  }

  async save(syncData: SyncData): Promise<SyncOperationStatus> {
    if (!this.backupFileLocation) {
      throw new Error('Please select a backup file location from preferences');
    }
    const backupFile = File.new_for_uri(this.backupFileLocation);
    if (!backupFile.query_exists(null)) {
      throw new Error(`Failed to backup settings. ${this.backupFileLocation} does not exist`);
    }

    await replaceFileContentsAsync(backupFile, new TextEncoder().encode(JSON.stringify(syncData)));

    return SyncOperationStatus.SUCCESS;
  }

  async read(): Promise<SyncData> {
    const backupFile = File.new_for_uri(this.backupFileLocation);
    if (!backupFile.query_exists(null)) {
      throw new Error(`Failed to read settings from backup. ${this.backupFileLocation} does not exist`);
    }

    let syncDataBytes: Uint8Array;
    try {
      syncDataBytes = await readFileContentsAsync(backupFile);
    } catch {
      throw new Error(`Failed to read settings from backup. ${this.backupFileLocation} could not be read`);
    }

    if (!syncDataBytes || !syncDataBytes.length) {
      throw new Error(`Failed to read settings from backup. ${this.backupFileLocation} is corrupted`);
    }

    try {
      return JSON.parse(new TextDecoder().decode(syncDataBytes));
    } catch {
      throw new Error(`${this.backupFileLocation} is not a json file`);
    }
  }

  getName(): string {
    return 'Local';
  }
}
