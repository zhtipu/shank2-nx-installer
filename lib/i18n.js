// Interface texts. Works in the page and in the worker (no DOM here). English only for now: another language is one
// more entry in LANGUAGES and one more block in TEXTS with the same keys (test/texts_node.mjs checks them).
// Static texts in index.html name their key with data-i18n (plain text) or data-i18n-html (text with markup).

export const LANGUAGES = [
  { code: 'en', name: 'English', flag: 'uk' },
];

const SPHAIRA = '<a href="https://github.com/NaGaa95/sphaira/releases" target="_blank" rel="noopener">Sphaira</a>';
const PACKAGE_PATH = '<code>Content/0000000000000000/5841120C/000D0000/</code>';

const TEXTS = {
  en: {
    legal:
      'Shank and Shank 2 are trademarks of Klei Entertainment. The icon is based on the game\'s artwork. shank2-nx is an unofficial fan project and is not affiliated with, endorsed or sponsored by Klei Entertainment, Nintendo or Microsoft. Nintendo Switch is a trademark of Nintendo; Xbox 360 and Xbox Live Arcade are trademarks of Microsoft. This site does not host or distribute game data or the original game executable: your package is read only inside your browser, is never uploaded, and its files are copied straight into the shank2-nx.zip saved on your computer. You need your own legally obtained copy of the game.',
    sourceCode: 'Source code',
    signature: 'a zhtipu project',
    lead:
      'Builds the <strong>Nintendo Switch</strong> package of <strong>Shank 2</strong> from your own ' +
      '<strong>Xbox 360</strong> copy (Xbox Live Arcade). Everything runs in <strong>this browser</strong>.',
    languageBar: 'Language',
    step1: '1. Choose your game',
    formatPackage: 'Package file',
    formatFolder: 'Folder',
    ownCopy:
      '<strong>Important:</strong> you need your own copy of the game, copied from your own Xbox 360. The installer reads the game from it to make the package; without it, it cannot be made. Every game file in the package comes from your copy: the installer does not supply any of its own.',
    formatHint:
      `<strong>Package file:</strong> the game's package is the file in ${PACKAGE_PATH} on the console. ` +
      '<strong>Folder:</strong> the <code>5841120C</code> folder (the package is found inside it), or a folder you extracted the game into (with <code>default.xex</code>).',
    nothingChosen: 'Nothing chosen yet.',
    chosenGame: 'Game: {name} ({size})',
    step2: '2. Create the package',
    step2First: 'If you are installing the game for the first time, use:',
    create: 'Create shank2-nx.zip',
    step2Update:
      'If the game is already installed and you only want to update it (<code>shank2.nro</code> and the shaders), use:',
    createUpdate: 'Create shank2-nx-update.zip',
    step3: '3. Copy it to the Switch',
    step3Extract: 'Extract the downloaded zip into <code>sdmc:/switch/</code>.',
    step3Start:
      'Install <code>shank2-nx-x.y.z.nsp</code> from the <a href="https://github.com/zhtipu/shank2-nx/releases/latest" target="_blank" rel="noopener">latest release</a> with your installer of choice and start <strong>Shank 2</strong> from the HOME Menu. ' +
      `Or start <code>shank2.nro</code> from the Homebrew Menu in title takeover mode (<strong>launch</strong> a game installed on the Switch <strong>while holding R</strong>), or with a <strong>39-bit forwarder</strong> made with ${SPHAIRA}. The album applet does not give the game enough memory.`,
    step3First:
      'The first time you play, new places can <strong>stutter</strong> for a moment while the graphics are prepared; they are kept on the SD card for the next sessions.',
    checking: 'Checking your game…',
    supported: 'Xbox Live Arcade · supported',
    unsupported: 'This version of the game is not supported yet.',
    notGame: 'Not the game',
    noGame: 'The game was not found: choose its package file, the 5841120C folder, or a folder with default.xex.',
    otherTitle: '{name} is not Shank 2.',
    noStreaming: 'this browser window cannot stream downloads. Use a normal (not private) window.',
    downloadStarted: 'Download started ({size}). Keep this page open until it finishes.',
    finished: 'Finished in {seconds} s.',
    error: 'Error: {message}',
    cancelled: 'the download was cancelled',
    readingFiles: 'Reading your game',
    downloadingBuild: 'Downloading the Switch build',
    logBuild: 'Supported: Shank 2 for Xbox Live Arcade (build {version})',
    logUpdate: 'Update package: shank2.nro and the shaders',
    deko3dShaders: "Making the renderer's shaders from the game's {count}",
    deko3dReady: 'Shaders ready: they match the tested ones',
    checksumming: 'Checking the game files ({count} files)',
    gameIdentical: 'The game files are identical to the tested copy',
    gameDifferent: 'Warning: some game files differ from the tested copy (modified or damaged files?). The package is made anyway.',
    packing: 'Writing the package',
    done: 'Done: extract the zip into sdmc:/switch/',
    notSupportedYet: 'this version of the game is not supported yet. Executable fingerprint: {hash}',
    buildMismatch: 'the downloaded Switch build is not the published one ({hash}); try again later',
    deko3dContainers: "the game's shaders were not all found ({found} of {wanted}); nothing was written",
    deko3dMismatch: "the shaders do not match the tested ones ({hash}); nothing was written",
    shaderMissing: 'the file {name} is missing from your game',
    incompleteGame: 'Incomplete game: {count} of {expected} files. Only the update package can be made.',
    incompleteError: 'the game is incomplete ({count} of {expected} files): choose the whole game',
    downloadFailed: 'could not download {url} ({status})',
  },
};

let current = 'en';

export function getLanguage() {
  return current;
}

export function setLanguage(code) {
  current = TEXTS[code] ? code : 'en';
  return current;
}

// The visitor's choice (saved in their browser), else the browser's language when it is one of ours, else English.
export function preferredLanguage(saved, browser = []) {
  if (saved && TEXTS[saved]) {
    return saved;
  }
  for (const tag of browser) {
    const code = String(tag).toLowerCase().split('-')[0];
    if (TEXTS[code]) {
      return code;
    }
  }
  return 'en';
}

export function t(key, params = {}) {
  const text = TEXTS[current][key] ?? TEXTS.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => (params[name] ?? `{${name}}`));
}

// Sizes as Windows Explorer shows them, so the page and the file's properties agree: units of 1024 bytes (which
// Windows calls KB, MB and GB) and three significant digits, truncated. 7,834,892,288 bytes is 7.29 GB, not 7.83.
const SIZE_UNITS = { fr: ['Ko', 'Mo', 'Go'] };

export function formatSize(bytes) {
  const units = SIZE_UNITS[current] ?? ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  const scale = 10 ** decimals;
  // The small epsilon keeps values such as 7.3 from becoming 7.29 through floating point.
  const shown = Math.floor(value * scale + 1e-9) / scale;
  const number = new Intl.NumberFormat(current, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${number.format(shown)} ${units[unit]}`;
}
