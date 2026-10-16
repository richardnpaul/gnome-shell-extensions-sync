import { Api } from '@esync/api';
import { Data } from '@esync/data';
import { StatusMenu } from '@esync/panel/statusMenu';
import { loadInterfaceXML, setCurrentExtension } from '@esync/shell';
import { Sync } from '@esync/sync';
import { logger } from '@esync/utils';
import { DBus, DBusExportedObject } from '@gi-types/gio2';
import { EventEmitter } from 'events';
import { SyncEvent } from '@esync/api/types';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { CredentialStorePort } from '@esync/core/ports';
import { SecretCredentialStore } from '@esync/platform/credentials/secretCredentialStore';
import { CredentialMigrator } from '@esync/platform/credentials/credentialMigration';

const debug = logger('extension');

export default class SyncExtension extends Extension {
  private sync?: Sync;
  private statusMenu?: StatusMenu;
  private api?: Api;
  private eventEmitter?: EventEmitter;
  private data?: Data;
  private dbus?: DBusExportedObject;
  private credentialStore?: CredentialStorePort;

  constructor(metadata: any) {
    super(metadata);
    this.initTranslations();
    setCurrentExtension(this);
    debug('extension is initialized');
  }

  save(): void {
    if (this.eventEmitter) {
      this.eventEmitter.emit(SyncEvent.SAVE);
    }
  }

  read(): void {
    if (this.eventEmitter) {
      this.eventEmitter.emit(SyncEvent.READ);
    }
  }

  enable(credentialStore?: CredentialStorePort): void {
    setCurrentExtension(this);
    this.credentialStore = credentialStore || new SecretCredentialStore();
    const migrator = new CredentialMigrator(this.getSettings(), this.credentialStore);
    migrator.migrate().catch((error) => debug(`credential migration error: ${error}`));

    this.eventEmitter = new EventEmitter();
    this.data = new Data();
    this.api = new Api(this.eventEmitter, this.data, undefined, this.credentialStore);
    this.sync = new Sync(this.eventEmitter, this.data);
    this.statusMenu = new StatusMenu(this.eventEmitter);

    const iface = loadInterfaceXML('com.github.richardnpaul.ExtensionsSync');
    if (iface) {
      this.dbus = DBusExportedObject.wrapJSObject(iface, this);
      this.dbus.export(DBus.session, '/com/github/richardnpaul/ExtensionsSync');
    }

    this.sync.start();
    this.statusMenu.show();
    debug('extension is enabled');
  }

  disable(): void {
    if (this.sync) {
      this.sync.stop();
      this.sync = undefined;
    }
    if (this.statusMenu) {
      this.statusMenu.destroy();
      this.statusMenu = undefined;
    }
    if (this.dbus) {
      this.dbus.unexport();
      this.dbus = undefined;
    }
    if (this.api) {
      this.api.destroy();
      this.api = undefined;
    }
    if (this.data) {
      this.data.destroy();
      this.data = undefined;
    }
    this.credentialStore = undefined;
    this.eventEmitter = undefined;
    debug('extension is disabled');
  }
}
