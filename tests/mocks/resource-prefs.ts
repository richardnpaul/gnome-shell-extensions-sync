/* eslint-disable @typescript-eslint/no-explicit-any */
export class ExtensionPreferences {
  public settings: any;
  constructor(settings: any = null) {
    this.settings = settings;
  }
  initTranslations(): void {}
  gettext(str: string): string {
    return str;
  }
  getSettings(): any {
    return this.settings;
  }
}

export const gettext = (str: string): string => str;
