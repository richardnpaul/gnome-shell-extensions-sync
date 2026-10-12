export class Icon {
  public gicon: any;
  public style_class: string;
  constructor(options: any = {}) {
    this.gicon = options.gicon;
    this.style_class = options.style_class;
  }
  set_gicon(gicon: any): void {
    this.gicon = gicon;
  }
}
