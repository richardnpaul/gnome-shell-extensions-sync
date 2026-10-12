/* eslint-disable @typescript-eslint/no-explicit-any */

export enum Align {
  FILL = 0,
  START = 1,
  END = 2,
  CENTER = 3,
  BASELINE = 4,
}

export class StringList {
  public strings: string[];
  constructor(opts: { strings: string[] }) {
    this.strings = opts.strings;
  }
}

export class Button {
  public label: string;
  public valign: Align;
  public signals: Record<string, () => void> = {};
  constructor(opts: any = {}) {
    this.label = opts.label;
    this.valign = opts.valign;
  }
  connect(signal: string, cb: () => void): void {
    this.signals[signal] = cb;
  }
}

export class FileFilter {
  public name = '';
  public patterns: string[] = [];
  set_name(name: string): void {
    this.name = name;
  }
  add_pattern(p: string): void {
    this.patterns.push(p);
  }
}

export class FileDialog {
  public title: string;
  public initial_name: string;
  public filters: any;
  public defaultFilter: any;
  public static mockResultFile: any = null;
  public static shouldThrow = false;
  public static lastInstance: FileDialog | null = null;

  constructor(opts: any = {}) {
    this.title = opts.title;
    this.initial_name = opts.initial_name;
    FileDialog.lastInstance = this;
  }
  set_filters(f: any): void {
    this.filters = f;
  }
  set_default_filter(f: any): void {
    this.defaultFilter = f;
  }
  save(_window: any, _cancellable: any, callback: (dialog: any, res: any) => void): void {
    callback(this, {});
  }
  save_finish(_res: any): any {
    if (FileDialog.shouldThrow) {
      throw new Error('Save cancelled');
    }
    return FileDialog.mockResultFile;
  }
}

export default {
  Align,
  StringList,
  Button,
  FileFilter,
  FileDialog,
};
