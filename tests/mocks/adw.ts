/* eslint-disable @typescript-eslint/no-explicit-any */

export class PreferencesPage {
  public title: string;
  public icon_name: string;
  public groups: any[] = [];
  constructor(opts: any = {}) {
    this.title = opts.title;
    this.icon_name = opts.icon_name;
  }
  add(group: any): void {
    this.groups.push(group);
  }
}

export class PreferencesGroup {
  public title: string;
  public description: string;
  public rows: any[] = [];
  public visible = true;
  constructor(opts: any = {}) {
    this.title = opts.title;
    this.description = opts.description;
  }
  add(row: any): void {
    this.rows.push(row);
  }
  set_visible(visible: boolean): void {
    this.visible = visible;
  }
}

export class ComboRow {
  public title: string;
  public model: any;
  public selected = 0;
  public signals: Record<string, (row: any) => void> = {};
  constructor(opts: any = {}) {
    this.title = opts.title;
  }
  set_model(model: any): void {
    this.model = model;
  }
  set_selected(idx: number): void {
    this.selected = idx;
  }
  connect(signal: string, cb: (row: any) => void): void {
    this.signals[signal] = cb;
  }
}

export class EntryRow {
  public title: string;
  public text: string;
  public signals: Record<string, (row: any) => void> = {};
  constructor(opts: any = {}) {
    this.title = opts.title;
    this.text = opts.text;
  }
  get_text(): string {
    return this.text;
  }
  connect(signal: string, cb: (row: any) => void): void {
    this.signals[signal] = cb;
  }
}

export class PasswordEntryRow extends EntryRow {}

export class ActionRow {
  public title: string;
  public subtitle: string;
  public suffix: any;
  public activatableWidget: any;
  constructor(opts: any = {}) {
    this.title = opts.title;
    this.subtitle = opts.subtitle;
  }
  add_suffix(w: any): void {
    this.suffix = w;
  }
  set_activatable_widget(w: any): void {
    this.activatableWidget = w;
  }
  set_subtitle(sub: string): void {
    this.subtitle = sub;
  }
}

export class SwitchRow {
  public title: string;
  public subtitle: string;
  public active: boolean;
  public signals: Record<string, (row: any) => void> = {};
  constructor(opts: any = {}) {
    this.title = opts.title;
    this.subtitle = opts.subtitle;
    this.active = opts.active ?? false;
  }
  connect(signal: string, cb: (row: any) => void): void {
    this.signals[signal] = cb;
  }
}

export default {
  PreferencesPage,
  PreferencesGroup,
  ComboRow,
  EntryRow,
  PasswordEntryRow,
  ActionRow,
  SwitchRow,
};
