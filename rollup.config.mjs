import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import fs from 'node:fs';
import cleanup from 'rollup-plugin-cleanup';

const buildPath = 'dist';

const giDefinitions = {
  '@gi-types/gio2': {
    giUrl: 'gi://Gio',
    varName: 'Gio',
    exports: [
      'AsyncResult',
      'DBus',
      'DBusCallFlags',
      'DBusExportedObject',
      'File',
      'FileCreateFlags',
      'FilePrototype',
      'Settings',
      'Subprocess',
      'SubprocessFlags',
      'icon_new_for_string',
      'file_new_tmp',
    ],
  },
  '@gi-types/glib2': {
    giUrl: 'gi://GLib',
    varName: 'GLib',
    exports: [
      'Bytes',
      'PRIORITY_DEFAULT',
      'Source',
      'timeout_add',
      'build_filenamev',
      'file_get_contents',
      'get_user_data_dir',
      'get_user_config_dir',
      'Variant',
    ],
  },
  '@gi-types/gobject2': {
    giUrl: 'gi://GObject',
    varName: 'GObject',
    exports: ['registerClass'],
  },
  '@gi-types/soup3': {
    giUrl: 'gi://Soup?version=3.0',
    varName: 'Soup',
    exports: ['Message', 'Session', 'Status', 'status_get_phrase', 'form_encode_hash'],
  },
  '@gi-types/st1': {
    giUrl: 'gi://St',
    varName: 'St',
    exports: ['Icon'],
  },
  '@gi-types/shell0': {
    giUrl: 'gi://Shell',
    varName: 'Shell',
    exports: [],
  },
  '@gi-types/meta10': {
    giUrl: 'gi://Meta',
    varName: 'Meta',
    exports: [],
  },
  '@gi-types/gtk4': {
    giUrl: 'gi://Gtk?version=4.0',
    varName: 'Gtk',
    exports: [
      'Align',
      'Box',
      'Button',
      'ComboBoxText',
      'Entry',
      'FileChooserAction',
      'FileChooserDialog',
      'FileFilter',
      'Label',
      'Orientation',
      'ResponseType',
      'Window',
      'BaselinePosition',
      'Notebook',
      'ListBoxRow',
      'Switch',
    ],
  },
  '@gi-types/gdk4': {
    giUrl: 'gi://Gdk',
    varName: 'Gdk',
    exports: [],
  },
};

function giPlugin() {
  return {
    name: 'gi-esm-bridge',
    resolveId(id) {
      if (giDefinitions[id]) {
        return '\0' + id;
      }
      return null;
    },
    load(id) {
      if (id.startsWith('\0@gi-types/')) {
        const key = id.slice(1);
        const def = giDefinitions[key];
        const namedExports =
          def.exports.length > 0 ? `export const { ${def.exports.join(', ')} } = ${def.varName};` : '';
        return `
          import ${def.varName} from '${def.giUrl}';
          export default ${def.varName};
          ${namedExports}
        `;
      }
      return null;
    },
  };
}

function copyResourcesPlugin() {
  return {
    name: 'copy-resources',
    writeBundle() {
      const targets = [
        ['resources/icons', `${buildPath}/icons`],
        ['resources/metadata.json', `${buildPath}/metadata.json`],
        ['resources/schemas', `${buildPath}/schemas`],
        ['resources/dbus', `${buildPath}/dbus`],
      ];
      for (const [src, dest] of targets) {
        fs.cpSync(src, dest, { recursive: true, force: true });
      }
    },
  };
}

const isExternal = (id) => id.startsWith('gi://') || id.startsWith('resource://');

export default [
  {
    input: 'src/extension.ts',
    treeshake: {
      moduleSideEffects: 'no-external',
    },
    output: {
      file: `${buildPath}/extension.js`,
      format: 'es',
      assetFileNames: '[name][extname]',
    },
    external: isExternal,
    plugins: [
      giPlugin(),
      commonjs(),
      nodeResolve({
        preferBuiltins: false,
      }),
      typescript({
        tsconfig: './tsconfig.json',
        outDir: 'dist',
      }),
      copyResourcesPlugin(),
      cleanup({
        comments: 'none',
      }),
    ],
  },
  {
    input: 'src/prefs/prefs.ts',
    output: {
      file: `${buildPath}/prefs.js`,
      format: 'es',
    },
    treeshake: {
      moduleSideEffects: 'no-external',
    },
    external: isExternal,
    plugins: [
      giPlugin(),
      commonjs(),
      nodeResolve({
        preferBuiltins: false,
      }),
      typescript({
        tsconfig: './tsconfig.json',
        outDir: 'dist',
      }),
      cleanup({
        comments: 'none',
      }),
    ],
  },
];
