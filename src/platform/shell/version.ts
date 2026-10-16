import * as Config from 'resource:///org/gnome/shell/misc/config.js';

export interface GnomeVersion {
  major: number;
  minor: number;
}

export function getGnomeVersion(): GnomeVersion {
  const versionStr = Config.PACKAGE_VERSION || '45.0';
  const [majorStr, minorStr = '0'] = versionStr.split('.');
  return {
    major: parseInt(majorStr, 10),
    minor: parseInt(minorStr, 10),
  };
}

export function isGnomeVersionAtLeast(targetMajor: number): boolean {
  return getGnomeVersion().major >= targetMajor;
}
