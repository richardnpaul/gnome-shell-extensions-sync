import { execute, logger, replaceFileContentsAsync } from '@esync/utils';
import { File, file_new_tmp, Settings } from '@gi-types/gio2';
import { PRIORITY_DEFAULT } from '@gi-types/glib2';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const debug = logger('shell');

export enum ExtensionType {
  SYSTEM = 1,
  PER_USER = 2,
}

export enum ExtensionState {
  ENABLED = 1,
  DISABLED = 2,
  ERROR = 3,
  OUT_OF_DATE = 4,
  DOWNLOADING = 5,
  INITIALIZED = 6,

  // Used as an error state for operations on unknown extensions,
  // should never be in a real extensionMeta object.
  UNINSTALLED = 99,
}

export interface ShellExtension {
  canChange: boolean;
  dir: File;
  error: any;
  hasPrefs: boolean;
  hasUpdate: boolean;
  imports?: any;
  metadata: {
    name: string;
    description: string;
    uuid: string;
    'settings-schema': string;
    'shell-version': Array<string>;
  };
  path: string;
  state: ExtensionState;
  stateObj: any;
  stylesheet?: File;
  type: ExtensionType;
  uuid: string;
  openPreferences?: () => void;
  getSettings?: (schema?: string) => Settings;
}

let _currentExtension: any = null;

export const setCurrentExtension = (extension: any): void => {
  _currentExtension = extension;
};

export const getCurrentExtension = (): any => {
  return _currentExtension;
};

export const getCurrentExtensionSettings = (): Settings => {
  if (_currentExtension && typeof _currentExtension.getSettings === 'function') {
    return _currentExtension.getSettings();
  }
  return null as any;
};

export const canRestartShell = (): boolean => {
  return false;
};

export const restartShell = (_text?: string): void => {
  debug(`restartShell called: ${_text}`);
  // Restarting GNOME Shell is not supported on Wayland and removed in modern GNOME versions
};

export const notify = (text: string): void => {
  const settings = getCurrentExtensionSettings();
  const showNotifications = settings ? settings.get_boolean('show-notifications') : true;
  if (showNotifications) {
    Main.notify(text);
  } else {
    debug(`Notifications are hidden. Logging the content instead. Content: ${text}`);
  }
};

export const writeDconfData = async (schemaPath: string, data: string): Promise<void> => {
  if (!schemaPath || !data) {
    return;
  }
  const [file, ioStream] = file_new_tmp(null);
  await replaceFileContentsAsync(file, new TextEncoder().encode(data));
  try {
    await execute(`dconf load ${schemaPath} < ${file.get_path()}`);
    debug(`loaded settings for ${schemaPath}`);
  } catch {
    debug(`cannot load settings for ${schemaPath}`);
  }
  file.delete(null);
  ioStream.close_async(PRIORITY_DEFAULT, null);
};

export const readDconfData = async (schemaPath: string): Promise<string> => {
  return execute(`dconf dump ${schemaPath}`);
};

export const DBUS_INTERFACE_EXTENSIONS_SYNC = `<node>
  <interface name="io.elhan.ExtensionsSync">
    <method name="save" />
    <method name="read" />
  </interface>
</node>`;

export const loadInterfaceXML = (iface: string): any => {
  if (iface === 'io.elhan.ExtensionsSync') {
    return DBUS_INTERFACE_EXTENSIONS_SYNC;
  }
  return null;
};
