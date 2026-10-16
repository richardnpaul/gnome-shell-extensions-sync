import { _ } from '@esync/shell';
import { SyncData } from '@esync/data';
import { File } from '@gi-types/gio2';
import { format, readFileContentsAsync, replaceFileContentsAsync } from '@esync/utils';
import { SyncOperationStatus, SyncProvider } from '../types';

export class Local implements SyncProvider {
  private backupFileLocation: string;

  constructor(backupFileLocation: string) {
    this.backupFileLocation = backupFileLocation;
  }

  async save(syncData: SyncData): Promise<SyncOperationStatus> {
    if (!this.backupFileLocation) {
      throw new Error(_('Please select a backup file location from preferences'));
    }
    const backupFile = File.new_for_uri(this.backupFileLocation);
    if (!backupFile.query_exists(null)) {
      throw new Error(format(_('Failed to backup settings. %s does not exist'), this.backupFileLocation));
    }

    await replaceFileContentsAsync(backupFile, new TextEncoder().encode(JSON.stringify(syncData)));

    return SyncOperationStatus.SUCCESS;
  }

  async read(): Promise<SyncData> {
    const backupFile = File.new_for_uri(this.backupFileLocation);
    if (!backupFile.query_exists(null)) {
      throw new Error(format(_('Failed to read settings from backup. %s does not exist'), this.backupFileLocation));
    }

    let syncDataBytes: Uint8Array;
    try {
      syncDataBytes = await readFileContentsAsync(backupFile);
    } catch {
      throw new Error(format(_('Failed to read settings from backup. %s could not be read'), this.backupFileLocation));
    }

    if (!syncDataBytes || !syncDataBytes.length) {
      throw new Error(format(_('Failed to read settings from backup. %s is corrupted'), this.backupFileLocation));
    }

    try {
      return JSON.parse(new TextDecoder().decode(syncDataBytes));
    } catch {
      throw new Error(format(_('%s is not a json file'), this.backupFileLocation));
    }
  }

  getName(): string {
    return _('Local');
  }
}
