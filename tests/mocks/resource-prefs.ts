/* eslint-disable @typescript-eslint/no-explicit-any */
export class ExtensionPreferences {
  public settings: any;
  constructor(settings: any = null) {
    this.settings = settings;
  }
  getSettings(): any {
    return this.settings;
  }
}
