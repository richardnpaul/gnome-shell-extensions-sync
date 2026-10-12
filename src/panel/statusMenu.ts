import { SyncEvent } from '@esync/api/types';
import { getCurrentExtension, getCurrentExtensionSettings, ShellExtension } from '@esync/shell';
import { execute, logger } from '@esync/utils';
import { icon_new_for_string, Settings } from '@gi-types/gio2';
import { Icon } from '@gi-types/st1';
import { EventEmitter } from 'events';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
const _ = (str: string): string => str;

const debug = logger('statusMenu');

export class StatusMenu {
  private eventEmitter: EventEmitter;
  private button: any;
  private extension: ShellExtension;
  private settings: Settings;
  private traySignalId?: number;
  private onSave = this.disableButton.bind(this);
  private onRead = this.disableButton.bind(this);
  private onSaveFinished = this.enableButton.bind(this);
  private onReadFinished = this.enableButton.bind(this);

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;
    this.extension = getCurrentExtension();
    this.settings = getCurrentExtensionSettings();
    if (this.settings) {
      this.traySignalId = this.settings.connect('changed::show-tray-icon', this.toggleStatusMenu.bind(this));
    }
  }

  destroy(): void {
    this.hide();
    if (this.settings && this.traySignalId !== undefined) {
      this.settings.disconnect(this.traySignalId);
      this.traySignalId = undefined;
    }
  }

  show(): void {
    if (!this.settings) {
      this.settings = getCurrentExtensionSettings();
    }
    const showTrayIcon = this.settings ? this.settings.get_boolean('show-tray-icon') : true;
    if (!showTrayIcon) {
      return;
    }
    if (this.button === undefined) {
      this.button = this.createButton();
    }

    this.eventEmitter.on(SyncEvent.SAVE, this.onSave);
    this.eventEmitter.on(SyncEvent.READ, this.onRead);

    this.eventEmitter.on(SyncEvent.SAVE_FINISHED, this.onSaveFinished);
    this.eventEmitter.on(SyncEvent.READ_FINISHED, this.onReadFinished);

    Main.panel.addToStatusArea('extensions-sync', this.button);
    debug('showing status menu in panel');
  }

  hide(): void {
    if (this.button) {
      this.button.destroy();
      this.button = undefined;
    }
    this.eventEmitter.off(SyncEvent.SAVE, this.onSave);
    this.eventEmitter.off(SyncEvent.READ, this.onRead);

    this.eventEmitter.off(SyncEvent.SAVE_FINISHED, this.onSaveFinished);
    this.eventEmitter.off(SyncEvent.READ_FINISHED, this.onReadFinished);
    debug('removing status menu from panel');
  }

  private toggleStatusMenu(): void {
    const showTrayIcon = this.settings ? this.settings.get_boolean('show-tray-icon') : true;
    if (showTrayIcon) {
      this.show();
    } else {
      this.hide();
    }
  }

  private createButton(): any {
    const newButton = new PanelMenu.Button(0.0, _('Sync Settings'), false);

    newButton.icon = this.createIcon('synced');
    newButton.add_child(newButton.icon);

    newButton.menu.addMenuItem(
      this.createMenuItem(_('Upload'), 'upload', () => this.eventEmitter.emit(SyncEvent.SAVE)),
    );
    newButton.menu.addMenuItem(
      this.createMenuItem(_('Download'), 'download', () => this.eventEmitter.emit(SyncEvent.READ)),
    );
    newButton.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    newButton.menu.addMenuItem(
      this.createMenuItem(_('Preferences'), 'preferences', () => {
        const ext = getCurrentExtension();
        if (ext && typeof ext.openPreferences === 'function') {
          ext.openPreferences();
        } else {
          execute(
            `gnome-extensions prefs "${this.extension?.metadata?.uuid || 'extensions-sync@richardnpaul.github.com'}"`,
          );
        }
      }),
    );

    return newButton;
  }

  private createMenuItem(menuTitle: string, actionType: string, onClick: () => void): any {
    const menuItem = new PopupMenu.PopupImageMenuItem(`${menuTitle}`, this.createIcon(`${actionType}`).gicon);
    menuItem.connect('activate', () => onClick());

    return menuItem;
  }

  private createIcon(iconType: string): Icon {
    const ext = getCurrentExtension() || this.extension;
    const basePath = ext ? ext.path : '';
    return new Icon({
      gicon: icon_new_for_string(`${basePath}/icons/extensions-sync-${iconType}-symbolic.svg`),
      style_class: 'system-status-icon',
    });
  }

  private enableButton(): void {
    if (this.button !== undefined) {
      this.button.set_reactive(true);
      this.button.icon.set_gicon(this.createIcon('synced').gicon);
    }
  }

  private disableButton(): void {
    if (this.button !== undefined) {
      this.button.set_reactive(false);
      this.button.icon.set_gicon(this.createIcon('syncing').gicon);
      this.button.menu.close();
    }
  }
}
