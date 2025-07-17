// os.js - Modular OS Core Loader

const desktop = document.getElementById('desktop');
const taskbar = document.getElementById('taskbar');

const windows = [];
const drivers = {};
const apps = new Map();

let zIndexCounter = 10;

// Global OS context object passed to modules
const OS = {
  desktop,
  taskbar,
  drivers,
  windows,
  apps,
  createWindow,
  registerApp,
  getApp,
  bringToFront,
};

// Register a new app with a unique name and launch function
function registerApp(name, launchFn) {
  if (apps.has(name)) {
    console.warn(`App "${name}" already registered. Overwriting.`);
  }
  apps.set(name, launchFn);
}

// Get app launch function by name
function getApp(name) {
  return apps.get(name);
}

// Create a draggable window with title and content (can be HTML or DOM node)
function createWindow(title, content, options = {}) {
  const win = document.createElement('div');
  win.classList.add('window');
  win.style.left = options.left || '60px';
  win.style.top = options.top || '60px';
  win.style.zIndex = ++zIndexCounter;
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', title);
  win.tabIndex = 0;

  if (typeof content === 'string') {
    win.innerHTML = `
      <div class="window-header" tabindex="0">
        <span class="window-title">${title}</span>
        <button class="btn-close" aria-label="Close window">&times;</button>
      </div>
      <div class="window-content">${content}</div>
    `;
  } else if (content instanceof Node) {
    win.innerHTML = `
      <div class="window-header" tabindex="0">
        <span class="window-title">${title}</span>
        <button class="btn-close" aria-label="Close window">&times;</button>
      </div>
    `;
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('window-content');
    contentDiv.appendChild(content);
    win.appendChild(contentDiv);
  } else {
    console.warn('Unsupported window content type', content);
  }

  desktop.appendChild(win);
  windows.push(win);

  makeDraggable(win);

  win.querySelector('.btn-close').onclick = () => {
    desktop.removeChild(win);
    const index = windows.indexOf(win);
    if (index !== -1) windows.splice(index, 1);
  };

  win.addEventListener('mousedown', () => {
    bringToFront(win);
  });

  return win;
}

function bringToFront(win) {
  win.style.zIndex = ++zIndexCounter;
}

// Make a window draggable by its header
function makeDraggable(win) {
  const header = win.querySelector('.window-header');
  let offsetX = 0, offsetY = 0;
  let dragging = false;

  header.addEventListener('mousedown', e => {
    dragging = true;
    offsetX = e.clientX - win.offsetLeft;
    offsetY = e.clientY - win.offsetTop;
    bringToFront(win);
  });

  window.addEventListener('mouseup', () => {
    dragging = false;
  });

  window.addEventListener('mousemove', e => {
    if (dragging) {
      win.style.left = `${e.clientX - offsetX}px`;
      win.style.top = `${e.clientY - offsetY}px`;
    }
  });
}

// Handle launching apps when desktop icons are double-clicked
desktop.addEventListener('dblclick', e => {
  const icon = e.target.closest('.icon');
  if (!icon) return;

  const appName = icon.dataset.app;
  if (!appName) return;

  const launchFn = getApp(appName);
  if (launchFn) {
    launchFn();
  } else {
    alert(`App "${appName}" not found or not loaded yet.`);
  }
});

// Load OS modules listed in modules.json
async function loadOSModules() {
  try {
    const resp = await fetch('./os/modules.json');
    if (!resp.ok) throw new Error('Failed to load modules.json');

    const moduleFiles = await resp.json();

    for (const modFile of moduleFiles) {
      const modulePath = `./os/${modFile}`;
      try {
        const module = await import(modulePath);
        if (typeof module.init === 'function') {
          await module.init(OS);
          console.log(`Loaded module: ${modFile}`);
        } else {
          console.warn(`Module ${modFile} has no init() function`);
        }
      } catch (err) {
        console.error(`Failed to load module ${modFile}:`, err);
      }
    }

    console.log('All OS modules loaded.');
  } catch (err) {
    console.error('Error loading OS modules:', err);
  }
}

// Initialize OS on page load
window.addEventListener('load', () => {
  loadOSModules();
});
