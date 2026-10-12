import { ExtensionPlatformPort } from '@esync/core/ports';
import { execute, logger } from '@esync/utils';
import { FileCreateFlags, file_new_tmp } from '@gi-types/gio2';
import { PRIORITY_DEFAULT } from '@gi-types/glib2';

const debug = logger('gnome-cli');

export class GnomeCliAdapter implements ExtensionPlatformPort {
  async listUserExtensions(): Promise<string[]> {
    try {
      const stdout = await execute('gnome-extensions list --user');
      return stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => Boolean(line));
    } catch (e) {
      debug(`error listing user extensions: ${e}`);
      return [];
    }
  }

  async uninstallExtension(uuid: string): Promise<void> {
    try {
      await execute(`gnome-extensions uninstall "${uuid}"`);
      debug(`uninstalled extension: ${uuid}`);
    } catch (e) {
      debug(`error uninstalling extension ${uuid}: ${e}`);
    }
  }

  async installExtension(uuid: string, zipBytes: Uint8Array): Promise<void> {
    const [tmpFile, ioStream] = file_new_tmp(null);
    tmpFile.replace_contents(zipBytes, null, false, FileCreateFlags.REPLACE_DESTINATION, null);

    try {
      await execute(`gnome-extensions install --force "${tmpFile.get_path()}"`);
      debug(`installed extension: ${uuid}`);
      await this.enableExtension(uuid);
    } catch (e) {
      debug(`error installing extension ${uuid}: ${e}`);
    } finally {
      tmpFile.delete(null);
      ioStream.close_async(PRIORITY_DEFAULT, null);
    }
  }

  async enableExtension(uuid: string): Promise<boolean> {
    try {
      await execute(`gnome-extensions enable "${uuid}"`);
      debug(`enabled extension: ${uuid}`);
      return true;
    } catch (e) {
      debug(`error enabling extension ${uuid}: ${e}`);
      return false;
    }
  }
}
