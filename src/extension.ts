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

const debug = logger('extension');

export default class SyncExtension extends Extension {
  private sync?: Sync;
  private statusMenu?: StatusMenu;
  private api?: Api;
  private eventEmitter?: EventEmitter;
  private data?: Data;
  private dbus?: DBusExportedObject;

  constructor(metadata: any) {
    super(metadata);
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

  enable(): void {
    setCurrentExtension(this);
    this.eventEmitter = new EventEmitter();
    this.data = new Data();
    this.api = new Api(this.eventEmitter, this.data);
    this.sync = new Sync(this.eventEmitter, this.data);
    this.statusMenu = new StatusMenu(this.eventEmitter);

    const iface = loadInterfaceXML('io.elhan.ExtensionsSync');
    if (iface) {
      this.dbus = DBusExportedObject.wrapJSObject(iface, this);
      this.dbus.export(DBus.session, '/io/elhan/ExtensionsSync');
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
    this.eventEmitter = undefined;
    debug('extension is disabled');
  }
}
