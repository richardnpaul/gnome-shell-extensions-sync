import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getGnomeVersion, isGnomeVersionAtLeast } from '@esync/platform/shell/version';
import { setPackageVersion } from 'resource:///org/gnome/shell/misc/config.js';

describe('platform/shell/version', () => {
  beforeEach(() => {
    setPackageVersion('50.1');
  });

  afterEach(() => {
    setPackageVersion('50.1');
  });

  it('parses major and minor version from PACKAGE_VERSION', () => {
    const version = getGnomeVersion();
    expect(version).toEqual({ major: 50, minor: 1 });
  });

  it('parses version with zero minor version', () => {
    setPackageVersion('46.0');
    const version = getGnomeVersion();
    expect(version).toEqual({ major: 46, minor: 0 });
  });

  it('falls back to default 45.0 when PACKAGE_VERSION is empty string', () => {
    setPackageVersion('');
    const version = getGnomeVersion();
    expect(version).toEqual({ major: 45, minor: 0 });
  });

  it('parses single segment version correctly', () => {
    setPackageVersion('48');
    const version = getGnomeVersion();
    expect(version).toEqual({ major: 48, minor: 0 });
  });

  it('checks if current version is at least target major version', () => {
    setPackageVersion('50.1');
    expect(isGnomeVersionAtLeast(50)).toBe(true);
    expect(isGnomeVersionAtLeast(45)).toBe(true);
    expect(isGnomeVersionAtLeast(51)).toBe(false);
  });
});
