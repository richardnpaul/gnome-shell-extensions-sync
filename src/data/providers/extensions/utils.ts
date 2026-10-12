import { getCurrentExtension, readDconfData, ShellExtension } from '@esync/shell';
import { execute, logger, readFileContentsAsync } from '@esync/utils';
import { File, Subprocess, SubprocessFlags } from '@gi-types/gio2';
import { build_filenamev, get_user_data_dir, PRIORITY_DEFAULT } from '@gi-types/glib2';
import { form_encode_hash, Message, Session, Status, status_get_phrase } from '@gi-types/soup3';
import { XMLParser } from 'fast-xml-parser';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ExtensionDownloader from 'resource:///org/gnome/shell/ui/extensionDownloader.js';
import * as ExtensionUtils from 'resource:///org/gnome/shell/misc/extensionUtils.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';

const debug = logger('extension-utils');

let _xmlParser: XMLParser | null = null;
export const getXmlParser = (): XMLParser => {
  if (!_xmlParser) {
    _xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
  }
  return _xmlParser;
};

export const readSchemaAsJson = async (schemaPath: string): Promise<any> => {
  try {
    const file = File.new_for_path(schemaPath);
    const contents = await readFileContentsAsync(file);
    return getXmlParser().parse(new TextDecoder().decode(contents));
  } catch {
    return null;
  }
};

const getExtensionManager = (): any => Main.extensionManager;

const getExtensionById = (extensionId: string): ShellExtension => getExtensionManager().lookup(extensionId);

const getExtensionSchemas = async (extensionId: string): Promise<any> => {
  const extension = getExtensionById(extensionId);
  if (!extension || !extension.path) {
    return {};
  }
  let stdout: string;

  try {
    stdout = await execute(`find -L ${extension.path} -iname "*.xml" -exec grep -l "schemalist" {} +`);
  } catch (ex) {
    debug(`error occurred while getting extension schemas: ${ex}`);
    return {};
  }

  const schemaFiles: Array<string> = stdout.split('\n').filter(Boolean);
  const parsedSchemas = await Promise.all(schemaFiles.map((schemaFile) => readSchemaAsJson(schemaFile)));

  const foundSchemas = parsedSchemas.reduce((schemaJsonAcc, schemaJson) => {
    if (!schemaJson || !schemaJson.schemalist || !schemaJson.schemalist.schema) {
      return schemaJsonAcc;
    }

    const schema = schemaJson.schemalist.schema;

    if (Array.isArray(schema)) {
      const multipleSchemaObj = schema.reduce((acc, schemaObj) => {
        if (schemaObj['@_path']) {
          return {
            ...acc,
            [schemaObj['@_path']]: {},
          };
        }

        return acc;
      }, {});

      return {
        ...multipleSchemaObj,
        ...schemaJsonAcc,
      };
    } else if (schema['@_path']) {
      return {
        ...schemaJsonAcc,
        [schema['@_path']]: {},
      };
    }

    return schemaJsonAcc;
  }, {});

  return foundSchemas;
};

export const getExtensionIds = (): Array<string> => {
  const currentUuid = getCurrentExtension()?.metadata?.uuid || 'extensions-sync@richardnpaul.github.com';
  return getExtensionManager()
    .getUuids()
    .filter((uuid: string) => {
      const ext = getExtensionById(uuid);
      return ext && ext.type === ExtensionUtils.ExtensionType.PER_USER && uuid !== currentUuid;
    });
};

const getAllExtensions = (): Array<ShellExtension> => {
  const extensionIds = getExtensionIds();
  const extensions = extensionIds
    .map((id: string): any => {
      const extension = getExtensionById(id);
      if (extension && extension.type === ExtensionUtils.ExtensionType.PER_USER) {
        return extension;
      }
      return undefined;
    })
    .filter((item) => item !== undefined);

  return extensions;
};

const getExtensionConfigData = async (extensionId: string): Promise<any> => {
  const schemas = await getExtensionSchemas(extensionId);

  return Object.keys(schemas).reduce(async (acc, schema) => {
    try {
      return {
        ...(await acc),
        [schema]: await readDconfData(schema),
      };
    } catch {
      debug(`cannot dump settings for ${extensionId}:${schema}`);
    }

    return acc;
  }, Promise.resolve({}));
};

export const getAllExtensionConfigData = async (): Promise<any> => {
  const extensions = getAllExtensions();

  return extensions.reduce(async (extensionAcc, extension) => {
    return {
      ...(await extensionAcc),
      [extension.metadata.uuid]: await getExtensionConfigData(extension.metadata.uuid),
    };
  }, Promise.resolve({}));
};

export const removeExtension = (extensionId: string): void => {
  ExtensionDownloader.uninstallExtension(extensionId);
  debug(`removed extension ${extensionId}`);
};

const extractExtensionArchive = async (bytes: any, dir: File) => {
  if (!dir.query_exists(null)) {
    dir.make_directory_with_parents(null);
  }

  const [file, stream] = File.new_tmp('XXXXXX.shell-extension.zip');
  await stream.output_stream.write_bytes_async(bytes, PRIORITY_DEFAULT, null);
  stream.close_async(PRIORITY_DEFAULT, null);

  const dirPath = dir.get_path() || '';
  const filePath = file.get_path() || '';
  const unzip = Subprocess.new(['unzip', '-uod', dirPath, '--', filePath], SubprocessFlags.NONE);
  await unzip.wait_check_async(null);

  const schemasPath = dir.get_child('schemas');
  if (schemasPath.query_exists(null)) {
    const schemasDirPath = schemasPath.get_path() || '';
    const compileSchema = Subprocess.new(['glib-compile-schemas', schemasDirPath], SubprocessFlags.NONE);
    try {
      await compileSchema.wait_check_async(null);
    } catch (e) {
      debug(`error compiling schema for ${dir.get_basename()}: ${e}`);
    }
  }
};

export const installExtension = async (extensionId: string): Promise<void> => {
  const params = { shell_version: Config.PACKAGE_VERSION };
  const message = Message.new_from_encoded_form(
    'GET',
    `https://extensions.gnome.org/download-extension/${extensionId}.shell-extension.zip`,
    form_encode_hash(params),
  );

  const dir = File.new_for_path(build_filenamev([get_user_data_dir(), 'gnome-shell', 'extensions', extensionId]));

  try {
    const bytes = await new Session().send_and_read_async(message, PRIORITY_DEFAULT, null);
    const { statusCode } = message;
    const phrase = status_get_phrase(statusCode);
    if (statusCode !== Status.OK) throw new Error(`Unexpected response: ${phrase}`);

    await extractExtensionArchive(bytes, dir);

    const extension = getExtensionManager().createExtensionObject(
      extensionId,
      dir,
      ExtensionUtils.ExtensionType.PER_USER,
    );
    await getExtensionManager().loadExtension(extension);
    if (!getExtensionManager().enableExtension(extensionId)) {
      throw new Error(`Cannot enable ${extensionId}`);
    }
  } catch (e) {
    debug(`error occurred during installation of ${extensionId}. Error: ${e}`);
  }
};
