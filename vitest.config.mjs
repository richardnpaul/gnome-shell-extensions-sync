import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@esync\/(.*)/, replacement: path.resolve(import.meta.dirname, 'src/$1') },
      { find: '@gi-types/gio2', replacement: path.resolve(import.meta.dirname, 'tests/mocks/gio2.ts') },
      { find: '@gi-types/glib2', replacement: path.resolve(import.meta.dirname, 'tests/mocks/glib2.ts') },
      { find: '@gi-types/soup3', replacement: path.resolve(import.meta.dirname, 'tests/mocks/soup3.ts') },
      { find: '@gi-types/st1', replacement: path.resolve(import.meta.dirname, 'tests/mocks/st1.ts') },
      { find: 'gi://Adw', replacement: path.resolve(import.meta.dirname, 'tests/mocks/adw.ts') },
      { find: 'gi://Gio', replacement: path.resolve(import.meta.dirname, 'tests/mocks/gio.ts') },
      { find: /^gi:\/\/Gtk.*/, replacement: path.resolve(import.meta.dirname, 'tests/mocks/gtk.ts') },
      {
        find: 'resource:///org/gnome/shell/ui/main.js',
        replacement: path.resolve(import.meta.dirname, 'tests/mocks/resource-main.ts'),
      },
      {
        find: 'resource:///org/gnome/shell/ui/extensionDownloader.js',
        replacement: path.resolve(import.meta.dirname, 'tests/mocks/resource-extensionDownloader.ts'),
      },
      {
        find: 'resource:///org/gnome/shell/misc/extensionUtils.js',
        replacement: path.resolve(import.meta.dirname, 'tests/mocks/resource-extensionUtils.ts'),
      },
      {
        find: 'resource:///org/gnome/shell/misc/config.js',
        replacement: path.resolve(import.meta.dirname, 'tests/mocks/resource-config.ts'),
      },
      {
        find: 'resource:///org/gnome/shell/ui/panelMenu.js',
        replacement: path.resolve(import.meta.dirname, 'tests/mocks/resource-panelMenu.ts'),
      },
      {
        find: 'resource:///org/gnome/shell/ui/popupMenu.js',
        replacement: path.resolve(import.meta.dirname, 'tests/mocks/resource-popupMenu.ts'),
      },
      {
        find: 'resource:///org/gnome/shell/extensions/extension.js',
        replacement: path.resolve(import.meta.dirname, 'tests/mocks/resource-extension.ts'),
      },
      {
        find: 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js',
        replacement: path.resolve(import.meta.dirname, 'tests/mocks/resource-prefs.ts'),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
      include: ['src/**/*.ts'],
      exclude: ['src/index.d.ts'],
    },
  },
});
