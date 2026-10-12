/* eslint-disable @typescript-eslint/no-explicit-any */
import { FileCreateFlags, SettingsBindFlags } from './gio2';

export class ListStore {
  public item_type: any;
  public items: any[] = [];
  constructor(opts: any = {}) {
    this.item_type = opts.item_type;
  }
  append(item: any): void {
    this.items.push(item);
  }
}

export default {
  ListStore,
  FileCreateFlags,
  SettingsBindFlags,
};
