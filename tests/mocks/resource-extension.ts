export class Extension {
  public metadata: any;
  public path: string;
  constructor(metadata: any = {}) {
    this.metadata = metadata;
    this.path = metadata.path || '/default/path';
  }
  getSettings(): any {
    return null;
  }
}
