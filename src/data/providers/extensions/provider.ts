import { DataProvider } from '@esync/data';
import {
  getAllExtensionConfigData,
  getExtensionIds,
  installExtension,
  removeExtension,
} from '@esync/data/providers/extensions/utils';
import { writeDconfData } from '@esync/shell';
import { logger } from '@esync/utils';

const debug = logger('extension-provider');

export type ExtensionData = {
  [key: string]: {
    [key: string]: string;
  };
};

export class ExtensionsDataProvider implements DataProvider {
  async getData(): Promise<ExtensionData> {
    return getAllExtensionConfigData();
  }

  async useData(extensionData: ExtensionData): Promise<void> {
    const downloadedExtensions = Object.keys(extensionData);
    const localExtensions = getExtensionIds();
    localExtensions.forEach(
      (extensionId) => downloadedExtensions.indexOf(extensionId) < 0 && removeExtension(extensionId),
    );

    debug(`downloading extensions: ${downloadedExtensions}`);

    const writePromises: Array<Promise<void>> = [];
    downloadedExtensions.forEach((extensionId) => {
      Object.keys(extensionData[extensionId]).forEach((schemaPath) => {
        writePromises.push(writeDconfData(schemaPath, extensionData[extensionId][schemaPath]));
      });
    });
    await Promise.all(writePromises);

    await Promise.all(
      downloadedExtensions.map(
        async (extensionId) => localExtensions.indexOf(extensionId) < 0 && installExtension(extensionId),
      ),
    );
  }

  getName(): string {
    return 'extensions';
  }
}
