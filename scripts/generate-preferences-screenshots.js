import GLib from 'gi://GLib';
// Enforce in-memory GSettings backend so user credentials are never captured
GLib.setenv('GSETTINGS_BACKEND', 'memory', true);

import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw?version=1';

try {
  const res = Gio.Resource.load('/usr/share/gnome-shell/org.gnome.Shell.Extensions.src.gresource');
  Gio.resources_register(res);
} catch (e) {
  console.error('Resource load error:', e.message);
}

Adw.init();
const loop = GLib.MainLoop.new(null, false);

function capturePage(window, outPath) {
  const paintable = new Gtk.WidgetPaintable({ widget: window });
  const snapshot = Gtk.Snapshot.new();
  const width = 750;
  const height = 550;
  paintable.snapshot(snapshot, width, height);
  const node = snapshot.to_node();
  if (!node) {
    throw new Error('Snapshot node is null');
  }
  const renderer = window.get_renderer();
  const texture = renderer.render_texture(node, null);
  texture.save_to_png(outPath);
  console.log(`Saved screenshot to ${outPath}`);
}

async function renderPage(pageIndex, outPath) {
  let extPath = GLib.build_filenamev([
    GLib.get_current_dir(),
    'dist',
  ]);
  const distMetadata = Gio.File.new_for_path(`${extPath}/metadata.json`);
  if (!distMetadata.query_exists(null)) {
    extPath = GLib.build_filenamev([
      GLib.get_user_data_dir(),
      'gnome-shell',
      'extensions',
      'extensions-sync@richardnpaul.github.com',
    ]);
  }

  const metadataFile = Gio.File.new_for_path(`${extPath}/metadata.json`);
  const [, contents] = metadataFile.load_contents(null);
  const metadata = JSON.parse(new TextDecoder().decode(contents));
  metadata.dir = Gio.File.new_for_path(extPath);
  metadata.path = extPath;

  const prefsModule = await import(`file://${extPath}/prefs.js`);
  const PrefsClass = prefsModule.default;
  const prefsInstance = new PrefsClass(metadata);

  const window = new Adw.PreferencesWindow({
    title: `${metadata.name} Preferences`,
    default_width: 750,
    default_height: 550,
  });

  // Inject isolated mock credential store so real credentials are never queried from the desktop keyring
  window._credentialStore = {
    async getCredential(_provider, _type) {
      return null;
    },
    async setCredential(_provider, _type, _secret) {},
    async deleteCredential(_provider, _type) {},
    async getProviderCredentials(_provider) {
      return { token: undefined, remoteId: undefined };
    },
  };

  await prefsInstance.fillPreferencesWindow(window);

  const pages = [];
  function findPages(widget) {
    if (!widget) return;
    if (widget instanceof Adw.PreferencesPage) {
      pages.push(widget);
    }
    let c = widget.get_first_child();
    while (c) {
      findPages(c);
      c = c.get_next_sibling();
    }
  }
  findPages(window);

  if (pages[pageIndex]) {
    window.set_visible_page(pages[pageIndex]);
  }
  window.present();

  return new Promise((resolve, reject) => {
    GLib.timeout_add(GLib.PRIORITY_LOW, 300, () => {
      try {
        capturePage(window, outPath);
        window.close();
        resolve();
      } catch (err) {
        window.close();
        reject(err);
      }
      return GLib.SOURCE_REMOVE;
    });
  });
}

async function main() {
  const imagesDir = GLib.build_filenamev([GLib.get_current_dir(), 'docs', 'images']);
  const dirFile = Gio.File.new_for_path(imagesDir);
  if (!dirFile.query_exists(null)) {
    dirFile.make_directory_with_parents(null);
  }

  try {
    await renderPage(0, `${imagesDir}/preferences-provider.png`);
    await renderPage(1, `${imagesDir}/preferences-synced-data.png`);
    await renderPage(2, `${imagesDir}/preferences-general.png`);
    console.log('All preferences screenshots captured successfully!');
  } catch (err) {
    console.error('Error generating screenshots:', err);
  } finally {
    loop.quit();
  }
}

main();
loop.run();
