---
name: gnome-shell-extension-best-practices
description: Best practices for developing modern GNOME Shell extensions (GNOME 45+) in GJS and TypeScript, covering ESM architecture, paired lifecycle management, memory leak prevention, GObject signal handling, native D-Bus IPC, and process separation.
---

# GNOME Shell Extension Best Practices

This skill guides development, refactoring, and code review for modern GNOME Shell extensions (GNOME 45+). It embodies architectural patterns and engineering standards from the official GNOME JavaScript documentation (`gjs.guide`), community review guidelines, and production best practices.

---

## 1. Modern ESM Architecture (GNOME 45+)

Modern GNOME Shell extensions run as native ECMAScript Modules (ESM) with separate entry points for the Shell compositor and Preferences processes.

### Entry Point Separation

- **Shell Process (`extension.js`)**: Runs directly inside the `gnome-shell` compositor process.
  - Subclasses `Extension` from `resource:///org/gnome/shell/extensions/extension.js`.
  - Allowed imports: `St`, `Clutter`, `Meta`, `Shell`, `Gio`, `GLib`, `GObject`.
  - **Strictly Prohibited**: `Gtk`, `Gdk`, `Adw`. Importing GTK in the shell process causes symbol collisions, compositor instability, and instant rejection.
- **Preferences Process (`prefs.js`)**: Runs in an independent, sandboxed GTK4 application process (`gnome-extensions prefs <uuid>`).
  - Subclasses `ExtensionPreferences` from `resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js`.
  - Allowed imports: `Gtk`, `Gdk`, `Adw`, `Gio`, `GLib`, `GObject`.
  - **Strictly Prohibited**: `Clutter`, `Meta`, `St`, `Shell`. Shell compositor libraries cannot run in a GTK client.

### Modular Architecture Over Monoliths

Do not place all extension functionality in a single large file. Structure your codebase into clean modules:

```
src/
├── extension.ts          # Extension subclass: lifecycle orchestration only
├── prefs/
│   ├── prefs.ts          # ExtensionPreferences subclass
│   └── prefsViewModel.ts # View-model & UI state management
├── panel/                # UI widgets & panel status buttons
├── platform/             # OS & desktop adapters (D-Bus, Settings, GSettings)
├── core/                 # Business logic, state models, and ports
└── utils/                # General helpers, disposables, and formatters
```

---

## 2. Paired Lifecycle Management & Leak Prevention

Extensions are loaded dynamically and may be enabled and disabled repeatedly during a user session (e.g., screen lock, extension toggling, session mode transitions).

### The Golden Lifecycle Rule

1. **`constructor()`**: Initialization **MUST** be restricted to static configuration and immutable constants. Never instantiate GObjects, create UI elements, connect signals, add timers, or touch GNOME Shell during construction.
2. **`enable()`**: Instantiate all components, attach UI to the panel or overview, register signal listeners, add mainloop sources, and export D-Bus objects.
3. **`disable()`**: Completely tear down everything created in `enable()`. The desktop state after `disable()` must be byte-for-byte identical to the state before `enable()`.

### Paired Setup and Teardown

Every stateful action in `enable()` **MUST** have an explicit, matching teardown action in `disable()`:

| Action in `enable()`              | Matching Action in `disable()` |
| :-------------------------------- | :----------------------------- |
| `obj.connect('signal', id)`       | `obj.disconnect(id)`           |
| `GLib.timeout_add(...)`           | `GLib.Source.remove(id)`       |
| `container.add_child(widget)`     | `widget.destroy()`             |
| `Main.panel.addToStatusArea(...)` | `button.destroy()`             |
| `DBusExportedObject.export(...)`  | `dbus.unexport()`              |
| `cache.set(key, val)`             | `cache.clear()`                |
| `Cairo.Context` creation          | `cr.$dispose()`                |

### Signal ID Management

Never fire signal connections without tracking the returned handler ID:

```typescript
// ❌ WRONG: Leaked signal handler on disable
settings.connect('changed::my-setting', () => this.updateState());

// ✅ CORRECT: Explicit handler ID tracking and disconnect
class MyComponent {
  private settingsSignalId?: number;

  enable() {
    this.settingsSignalId = this.settings.connect('changed::my-setting', () => this.updateState());
  }

  disable() {
    if (this.settingsSignalId !== undefined) {
      this.settings.disconnect(this.settingsSignalId);
      this.settingsSignalId = undefined;
    }
  }
}
```

### Mainloop Timers & Sources

Never rely on timer callbacks returning `false` or `GLib.SOURCE_REMOVE` for lifecycle safety. If the extension is disabled while a timer is pending, the timer will execute against destroyed objects unless explicitly removed:

```typescript
// ❌ WRONG: Untracked timer leaks if extension is disabled before it fires
GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
  this.refresh();
  return GLib.SOURCE_REMOVE;
});

// ✅ CORRECT: Tracked timer source ID removed on disable
class TimerManager {
  private timerId?: number;

  start() {
    this.timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
      this.timerId = undefined;
      this.refresh();
      return GLib.SOURCE_REMOVE;
    });
  }

  destroy() {
    if (this.timerId !== undefined) {
      GLib.Source.remove(this.timerId);
      this.timerId = undefined;
    }
  }
}
```

---

## 3. Native D-Bus Communication vs. CLI Subprocesses

Extensions are in-process plugins to the desktop environment. Spawning CLI utilities to interact with desktop services is slow, brittle, resource-intensive, and prohibited under GNOME review guidelines.

### Avoid CLI Spawning for Desktop Functions

- **Never** execute `gnome-extensions list/enable/disable/prefs` via shell subprocesses.
- **Never** execute `gsettings get/set` or `dconf read/write` via CLI.
- **Never** spawn `bash -c` to execute single commands or desktop scripts.

### Native D-Bus Communication

Use native GJS `Gio.DBus.session` calls to interact with desktop services:

```typescript
import { AsyncResult, DBus, DBusCallFlags } from '@gi-types/gio2';
import { Variant } from '@gi-types/glib2';

// Calling org.gnome.Shell.Extensions natively over D-Bus
async function listExtensionsViaDBus(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    DBus.session.call(
      'org.gnome.Shell.Extensions',
      '/org/gnome/Shell/Extensions',
      'org.gnome.Shell.Extensions',
      'ListExtensions',
      null,
      null,
      DBusCallFlags.NONE,
      -1,
      null,
      (connection, res: AsyncResult) => {
        try {
          const reply = connection.call_finish(res);
          const [dict] = reply.deep_unpack() as [Record<string, { type: Variant }>];
          // type 2 corresponds to ExtensionType.PER_USER
          const userUuids = Object.keys(dict).filter((uuid) => dict[uuid].type.deep_unpack() === 2);
          resolve(userUuids);
        } catch (e) {
          reject(e);
        }
      },
    );
  });
}
```

### Direct Subprocess Execution (When Necessary)

If executing an external binary is genuinely required (e.g., custom tool or compiler), execute the binary directly using array arguments without shell interpretation:

```typescript
// ❌ WRONG: Vulnerable to shell injection and unnecessary process overhead
await execute(`external-tool --arg "${userInput}"`);

// ✅ CORRECT: Direct binary execution with argv array
const process = new Gio.Subprocess({
  argv: ['external-tool', '--arg', userInput],
  flags: Gio.SubprocessFlags.STDOUT_PIPE,
});
process.init(null);
```

---

## 4. Defensive Coding & Anti-Patterns

### Avoid Redundant Runtime Type Checks

In GNOME 45+, platform APIs guarantee standard extension interfaces. Avoid defensive typing smells that check for core methods:

```typescript
// ❌ WRONG: Redundant check and unnecessary CLI fallback
if (ext && typeof ext.openPreferences === 'function') {
  ext.openPreferences();
} else {
  execute(`gnome-extensions prefs "${uuid}"`);
}

// ✅ CORRECT: Clean, direct invocation
ext?.openPreferences();
```

### Clean Error Handling (No Empty `try-catch`)

Do not wrap standard, non-throwing methods in empty or defensive `try-catch` blocks:

```typescript
// ❌ WRONG: Silent swallow of errors or defensive wrapping of non-throwing APIs
try {
  GLib.Source.remove(this.sourceId);
} catch (e) {}

// ✅ CORRECT: Explicit state verification
if (this.sourceId !== undefined) {
  GLib.Source.remove(this.sourceId);
  this.sourceId = undefined;
}
```

### Desktop UI Consistency

- **Icons**: Use GNOME standard symbolic icon names from the system icon theme (`system-search-symbolic`, `preferences-system-symbolic`) rather than hardcoded emojis or raw raster images.
- **Log Hygiene**: Avoid flooding the system journal (`journalctl /usr/bin/gnome-shell`). Use namespaced loggers:

  ```typescript
  const logDebug = (msg: string) => log(`[my-extension] ${msg}`);
  ```

---

## 5. Development Checklist for GNOME Shell Extensions

- [ ] Does `extension.js` contain zero imports from `Gtk`, `Gdk`, or `Adw`?
- [ ] Does `prefs.js` contain zero imports from `Clutter`, `Meta`, `St`, or `Shell`?
- [ ] Is `constructor()` completely side-effect free?
- [ ] Does `enable()` construct, and does `disable()` fully destroy all widgets, signals, and sources?
- [ ] Are all signal handler IDs tracked and disconnected in `disable()`?
- [ ] Are all `timeout_add` / `idle_add` sources tracked and removed in `disable()`?
- [ ] Are all desktop state interactions performed via D-Bus / GSettings rather than CLI subprocesses?
- [ ] Are external binary executions parameterized via `argv` arrays without `bash -c`?
