export class PopupImageMenuItem {
  public title: string;
  public icon: any;
  public callbacks: Record<string, () => void> = {};

  constructor(title: string, icon: any) {
    this.title = title;
    this.icon = icon;
  }

  connect(signal: string, cb: () => void): void {
    this.callbacks[signal] = cb;
  }
}

export class PopupSeparatorMenuItem {}
