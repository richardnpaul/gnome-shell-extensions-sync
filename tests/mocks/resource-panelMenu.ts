import { vi } from 'vitest';

export class Button {
  public menuAlignment: number;
  public nameText: string;
  public dontCreateMenu: boolean;
  public menu = {
    addMenuItem: vi.fn(),
    close: vi.fn(),
  };
  public icon: any = null;
  public reactive = true;
  public destroyed = false;

  public children: any[] = [];

  constructor(menuAlignment: number = 0.0, nameText: string = '', dontCreateMenu: boolean = false) {
    this.menuAlignment = menuAlignment;
    this.nameText = nameText;
    this.dontCreateMenu = dontCreateMenu;
  }

  add_child(child: any): void {
    this.icon = child;
    this.children.push(child);
  }

  set_reactive(val: boolean): void {
    this.reactive = val;
  }

  destroy(): void {
    this.destroyed = true;
  }
}
