export class Extension {
  public metadata: any;
  public path: string;
  constructor(metadata: any = {}) {
    this.metadata = metadata;
    this.path = metadata.path || '/default/path';
  }
  initTranslations(): void {}
  getSettings(): any {
    return null;
  }
}

export const gettext = (str: string): string => str;
export const ngettext = (str: string, strPlural: string, n: number): string => (n === 1 ? str : strPlural);
export const pgettext = (_context: string, str: string): string => str;
