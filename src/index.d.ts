declare module 'resource:///org/gnome/shell/extensions/extension.js' {
  export class Extension {
    metadata: any;
    dir: any;
    path: string;
    uuid: string;
    constructor(metadata: any);
    getSettings(schema?: string): any;
    openPreferences(): void;
    enable(): void;
    disable(): void;
    static lookupByURL(url: string): any;
    static lookupByUUID(uuid: string): any;
  }
  export const gettext: (arg: string) => string;
  export const ngettext: (str: string, strPlural: string, n: number) => string;
  export const pgettext: (context: string, str: string) => string;
}

declare module 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js' {
  export class ExtensionPreferences {
    metadata: any;
    dir: any;
    path: string;
    uuid: string;
    constructor(metadata?: any);
    getSettings(schema?: string): any;
    fillPreferencesWindow(window: any): Promise<void> | void;
    static lookupByURL(url: string): any;
    static lookupByUUID(uuid: string): any;
  }
  export const gettext: (arg: string) => string;
}

declare module 'resource:///org/gnome/shell/ui/main.js' {
  export const notify: (arg: string) => void;
  export const panel: any;
  export const extensionManager: any;
  export const wm: any;
}

declare module 'resource:///org/gnome/shell/ui/panelMenu.js' {
  export const Button: any;
}

declare module 'resource:///org/gnome/shell/ui/popupMenu.js' {
  export const PopupMenuItem: any;
  export const PopupImageMenuItem: any;
  export const PopupSeparatorMenuItem: any;
  export const PopupBaseMenuItem: any;
}

declare module 'resource:///org/gnome/shell/ui/extensionDownloader.js' {
  export function uninstallExtension(uuid: string): boolean;
  export function installExtension(uuid: string, invocation?: any): Promise<void>;
}

declare module 'resource:///org/gnome/shell/misc/extensionUtils.js' {
  export const ExtensionType: {
    SYSTEM: number;
    PER_USER: number;
  };
  export const ExtensionState: any;
}

declare module 'resource:///org/gnome/shell/misc/config.js' {
  export const PACKAGE_VERSION: string;
}

declare module 'gi://Adw' {
  const Adw: any;
  export default Adw;
}

declare module 'gi://Gtk?version=4.0' {
  const Gtk: any;
  export default Gtk;
}

declare module 'gi://Soup?version=3.0' {
  const Soup: any;
  export default Soup;
}

declare module 'gi://Gio' {
  const Gio: any;
  export default Gio;
}

declare class TextEncoder {
  encode(input?: string): Uint8Array;
}

declare class TextDecoder {
  decode(input?: Uint8Array | ArrayBuffer | ArrayBufferView): string;
}

declare const log: (arg: any) => void;
declare const _: (arg: string) => string;
