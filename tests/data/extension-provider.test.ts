import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExtensionsDataProvider } from '@esync/data/providers/extensions/provider';
import * as extUtils from '@esync/data/providers/extensions/utils';
import * as shell from '@esync/shell';

describe('data/providers/extensions/provider', () => {
  let provider: ExtensionsDataProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ExtensionsDataProvider();
  });

  it('returns name extensions', () => {
    expect(provider.getName()).toBe('extensions');
  });

  it('getData delegates to getAllExtensionConfigData', async () => {
    const mockData = { 'ext-1': { '/schema/': 'val' } };
    vi.spyOn(extUtils, 'getAllExtensionConfigData').mockResolvedValue(mockData);

    const result = await provider.getData();
    expect(result).toEqual(mockData);
  });

  describe('useData', () => {
    it('removes local extensions that are not in downloaded extensions, writes configs, and installs missing extensions', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      vi.spyOn(extUtils, 'getExtensionIds').mockReturnValue(['already-installed', 'local-to-remove']);
      const removeSpy = vi.spyOn(extUtils, 'removeExtension').mockImplementation(() => {});
      const installSpy = vi.spyOn(extUtils, 'installExtension').mockResolvedValue();
      const writeSpy = vi.spyOn(shell, 'writeDconfData').mockResolvedValue();

      const downloadedData = {
        'already-installed': {
          '/path/installed/': 'cfg1',
        },
        'to-install': {
          '/path/new/': 'cfg2',
        },
      };

      await provider.useData(downloadedData);

      expect(logSpy).toHaveBeenCalledWith(
        '[extensions-sync] [extension-provider] downloading extensions: already-installed,to-install',
      );
      expect(removeSpy).toHaveBeenCalledWith('local-to-remove');
      expect(removeSpy).not.toHaveBeenCalledWith('already-installed');

      expect(writeSpy).toHaveBeenCalledWith('/path/installed/', 'cfg1');
      expect(writeSpy).toHaveBeenCalledWith('/path/new/', 'cfg2');

      expect(installSpy).toHaveBeenCalledWith('to-install');
      expect(installSpy).not.toHaveBeenCalledWith('already-installed');
    });

    it('handles empty downloaded data without extra write promises', async () => {
      const promiseAllSpy = vi.spyOn(Promise, 'all');
      vi.spyOn(extUtils, 'getExtensionIds').mockReturnValue([]);

      await provider.useData({});

      expect(promiseAllSpy).toHaveBeenNthCalledWith(1, []);
    });
  });
});
