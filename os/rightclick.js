export async function init(OS) {
  const desktop = OS.desktop;
  const vfs = OS.vfs;

  const contextMenu = document.createElement('div');
  contextMenu.style.position = 'absolute';
  contextMenu.style.background = '#fff';
  contextMenu.style.border = '1px solid #aaa';
  contextMenu.style.boxShadow = '2px 2px 6px rgba(0,0,0,0.2)';
  contextMenu.style.padding = '6px 0';
  contextMenu.style.zIndex = '9999';
  contextMenu.style.display = 'none';
  contextMenu.style.minWidth = '180px';
  contextMenu.style.fontFamily = 'sans-serif';
  contextMenu.style.fontSize = '14px';

  const menuItems = [
    { label: '🗂️ New Folder', action: () => createFolder() },
    { label: '📄 New File', action: () => createFile() },
    { label: '🧹 Clear Desktop', action: () => clearDesktop() }
  ];

  for (const item of menuItems) {
    const btn = document.createElement('div');
    btn.textContent = item.label;
    btn.style.padding = '6px 12px';
    btn.style.cursor = 'pointer';
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#f0f0f0';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
    });
    btn.addEventListener('click', () => {
      item.action();
      contextMenu.style.display = 'none';
    });
    contextMenu.appendChild(btn);
  }

  document.body.appendChild(contextMenu);

  desktop.addEventListener('contextmenu', e => {
    e.preventDefault();
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.style.display = 'block';
  });

  document.addEventListener('click', () => {
    contextMenu.style.display = 'none';
  });

  let folderCounter = 1;
  let fileCounter = 1;

  function createFolder() {
    const name = `New Folder ${folderCounter++}`;
    const path = `/Desktop/${name}`;
    if (vfs.mkdir(path)) {
      addIconToDesktop(name, true);
    }
  }

  function createFile() {
    const name = `New File ${fileCounter++}.txt`;
    const path = `/Desktop/${name}`;
    if (vfs.writeFile(path, '')) {
      addIconToDesktop(name, false);
    }
  }

  function clearDesktop() {
    const node = vfs._resolvePath('/Desktop');
    if (node && node.type === 'dir') {
      node.children = {};
      while (desktop.firstChild) {
        desktop.removeChild(desktop.firstChild);
      }
    }
  }

  function addIconToDesktop(name, isDir) {
    const icon = document.createElement('div');
    icon.classList.add('icon');
    icon.tabIndex = 0;
    icon.dataset.app = isDir ? 'explorer' : 'textviewer';
    icon.dataset.path = `/Desktop/${name}`;

    const img = document.createElement('img');
    img.src = isDir ? 'icons/folder.png' : 'icons/file.png';
    img.alt = isDir ? 'Folder Icon' : 'File Icon';

    const label = document.createElement('span');
    label.textContent = name;

    icon.appendChild(img);
    icon.appendChild(label);
    desktop.appendChild(icon);
  }

  // Ensure /Desktop exists
  vfs.mkdir('/Desktop');
}
