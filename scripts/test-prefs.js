import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

// Load GNOME Shell extensions internal resource if available
try {
  const res = Gio.Resource.load('/usr/share/gnome-shell/org.gnome.Shell.Extensions.src.gresource');
  Gio.resources_register(res);
} catch (e) {
  console.error('Could not load GNOME Shell extensions resource:', e.message);
}

import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';

Adw.init();
const loop = GLib.MainLoop.new(null, false);

async function main() {
  try {
    const extPath = GLib.build_filenamev([
      GLib.get_user_data_dir(),
      'gnome-shell',
      'extensions',
      'extensions-sync@richardnpaul.github.com',
    ]);

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

    await prefsInstance.fillPreferencesWindow(window);
    window.connect('close-request', () => {
      loop.quit();
      return false;
    });

    window.present();
  } catch (err) {
    console.error('Failed to open preferences window:', err);
    loop.quit();
  }
}

main();
loop.run();
