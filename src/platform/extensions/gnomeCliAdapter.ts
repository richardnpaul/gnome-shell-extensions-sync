import { ExtensionPlatformPort } from '@esync/core/ports';
import { execute, logger } from '@esync/utils';
import { AsyncResult, DBus, DBusCallFlags, FileCreateFlags, file_new_tmp } from '@gi-types/gio2';
import { PRIORITY_DEFAULT, Variant } from '@gi-types/glib2';

const debug = logger('gnome-cli');

export class GnomeCliAdapter implements ExtensionPlatformPort {
  private callDBus(method: string, parameters: Variant | null = null): Promise<Variant> {
    return new Promise((resolve, reject) => {
      DBus.session.call(
        'org.gnome.Shell.Extensions',
        '/org/gnome/Shell/Extensions',
        'org.gnome.Shell.Extensions',
        method,
        parameters,
        null,
        DBusCallFlags.NONE,
        -1,
        null,
        (connection: any, res: AsyncResult) => {
          try {
            const reply = connection.call_finish(res);
            resolve(reply);
          } catch (e) {
            reject(e);
          }
        },
      );
    });
  }

  async listUserExtensions(): Promise<string[]> {
    try {
      const reply = await this.callDBus('ListExtensions');
      const [dict] = reply.deep_unpack() as [Record<string, { type: Variant }>];
      return Object.keys(dict).filter((uuid) => dict[uuid].type.deep_unpack() === 2);
    } catch (e) {
      debug(`error listing user extensions: ${e}`);
      return [];
    }
  }

  async uninstallExtension(uuid: string): Promise<void> {
    try {
      await this.callDBus('UninstallExtension', new Variant('(s)', [uuid]));
      debug(`uninstalled extension: ${uuid}`);
    } catch (e) {
      debug(`error uninstalling extension ${uuid}: ${e}`);
    }
  }

  async installExtension(uuid: string, zipBytes: Uint8Array): Promise<void> {
    const [tmpFile, ioStream] = file_new_tmp(null);
    tmpFile.replace_contents(zipBytes, null, false, FileCreateFlags.REPLACE_DESTINATION, null);

    try {
      await execute(['gnome-extensions', 'install', '--force', tmpFile.get_path()!]);
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
      const reply = await this.callDBus('EnableExtension', new Variant('(s)', [uuid]));
      const [success] = reply.deep_unpack() as [boolean];
      if (success) {
        debug(`enabled extension: ${uuid}`);
        return true;
      }
      debug(`failed to enable extension: ${uuid}`);
      return false;
    } catch (e) {
      debug(`error enabling extension ${uuid}: ${e}`);
      return false;
    }
  }
}
