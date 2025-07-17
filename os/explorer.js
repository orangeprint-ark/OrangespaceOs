import { userStorage } from './userStorage.js';

const folderIconSVG = `
  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M9.828 4a.5.5 0 0 1 .354.146l1.707 1.707a.5.5 0 0 0 .353.147H14a1 1 0 0 1 1 1v5.5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1h7.828z"/>
  </svg>`;

const fileIconSVG = `
  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
  </svg>`;

function createTreeView(container, entries, basePath, onFileOpen) {
  const ul = document.createElement('ul');
  ul.style.listStyle = 'none';
  ul.style.paddingLeft = '10px';
  ul.style.margin = '0';

  const grouped = {};
  for (const e of entries) {
    if (!e.path.startsWith(basePath)) continue;
    let relative = e.path.slice(basePath.length);
    if (relative.startsWith('/') || relative.startsWith('\\')) relative = relative.slice(1);
    const parts = relative.split(/[\\/]/).filter(Boolean);
    if (parts.length === 0) continue;

    const top = parts[0];
    if (!grouped[top]) grouped[top] = [];
    if (parts.length > 1) grouped[top].push(e);
  }

  for (const name in grouped) {
    const li = document.createElement('li');
    li.style.marginBottom = '4px';
    li.style.cursor = 'pointer';
    li.style.userSelect = 'none';
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.gap = '6px';
    li.style.padding = '4px 6px';
    li.style.borderRadius = '6px';

    const folderLabel = document.createElement('span');
    folderLabel.innerHTML = folderIconSVG;
    folderLabel.style.flexShrink = '0';
    folderLabel.style.color = '#0a84ff';

    const textLabel = document.createElement('span');
    textLabel.textContent = name;
    textLabel.style.flexGrow = '1';
    textLabel.style.fontWeight = '600';
    textLabel.style.color = '#333';

    li.appendChild(folderLabel);
    li.appendChild(textLabel);

    const nestedUL = document.createElement('ul');
    nestedUL.style.listStyle = 'none';
    nestedUL.style.paddingLeft = '20px';
    nestedUL.style.margin = '4px 0 4px 0';
    nestedUL.style.display = 'none';

    li.onclick = e => {
      e.stopPropagation();
      nestedUL.style.display = nestedUL.style.display === 'none' ? 'block' : 'none';
      li.style.backgroundColor = nestedUL.style.display === 'block' ? '#e1eaff' : 'transparent';
    };

    // Add subfolders recursively
    const subfolders = grouped[name].filter(e => e.isFolder);
    for (const sf of subfolders) {
      const subEntries = entries.filter(en => en.path.startsWith(sf.path) && en.path !== sf.path);
      nestedUL.appendChild(createTreeView(nestedUL, subEntries, sf.path, onFileOpen));
    }

    // Add files
    const files = grouped[name].filter(e => !e.isFolder);
    for (const f of files) {
      const fileLI = document.createElement('li');
      fileLI.style.display = 'flex';
      fileLI.style.alignItems = 'center';
      fileLI.style.gap = '6px';
      fileLI.style.padding = '3px 8px';
      fileLI.style.borderRadius = '6px';
      fileLI.style.color = '#444';
      fileLI.style.fontWeight = '400';
      fileLI.style.cursor = 'pointer';
      fileLI.style.userSelect = 'none';

      fileLI.innerHTML = fileIconSVG + `<span>${f.path.split(/[\\/]/).pop()}</span>`;

      fileLI.onmouseenter = () => (fileLI.style.backgroundColor = '#f0f4ff');
      fileLI.onmouseleave = () => (fileLI.style.backgroundColor = 'transparent');

      fileLI.onclick = e => {
        e.stopPropagation();
        onFileOpen(f);
      };

      nestedUL.appendChild(fileLI);
    }

    li.appendChild(nestedUL);
    ul.appendChild(li);
  }

  return ul;
}

export async function init(OS) {
  OS.registerApp('explorer', async () => {
    const container = document.createElement('div');
    container.style.width = '720px';
    container.style.height = '520px';
    container.style.display = 'flex';
    container.style.flexDirection = 'row';
    container.style.borderRadius = '12px';
    container.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
    container.style.background = '#f9f9fb';
    container.style.fontFamily = `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`;
    container.style.color = '#222';

    // Left panel (tree)
    const leftPanel = document.createElement('div');
    leftPanel.style.width = '280px';
    leftPanel.style.borderRight = '1px solid #ddd';
    leftPanel.style.background = 'white';
    leftPanel.style.overflowY = 'auto';
    leftPanel.style.padding = '12px 10px';

    // Top buttons container
    const topButtons = document.createElement('div');
    topButtons.style.display = 'flex';
    topButtons.style.gap = '10px';
    topButtons.style.marginBottom = '10px';

    const newFolderBtn = document.createElement('button');
    newFolderBtn.textContent = 'New Folder';
    newFolderBtn.style.flex = '1';
    newFolderBtn.style.padding = '8px 12px';
    newFolderBtn.style.background = '#0a84ff';
    newFolderBtn.style.border = 'none';
    newFolderBtn.style.borderRadius = '8px';
    newFolderBtn.style.color = 'white';
    newFolderBtn.style.fontWeight = '600';
    newFolderBtn.style.cursor = 'pointer';
    newFolderBtn.onmouseenter = () => (newFolderBtn.style.background = '#006edc');
    newFolderBtn.onmouseleave = () => (newFolderBtn.style.background = '#0a84ff');

    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'Refresh';
    refreshBtn.style.flex = '1';
    refreshBtn.style.padding = '8px 12px';
    refreshBtn.style.background = '#e1e1e6';
    refreshBtn.style.border = 'none';
    refreshBtn.style.borderRadius = '8px';
    refreshBtn.style.color = '#444';
    refreshBtn.style.fontWeight = '600';
    refreshBtn.style.cursor = 'pointer';
    refreshBtn.onmouseenter = () => (refreshBtn.style.background = '#c7c7cf');
    refreshBtn.onmouseleave = () => (refreshBtn.style.background = '#e1e1e6');

    topButtons.append(newFolderBtn, refreshBtn);
    leftPanel.appendChild(topButtons);

    // Right panel (file editor/viewer)
    const rightPanel = document.createElement('div');
    rightPanel.style.flex = '1';
    rightPanel.style.display = 'flex';
    rightPanel.style.flexDirection = 'column';
    rightPanel.style.padding = '15px';
    rightPanel.style.background = 'white';
    rightPanel.style.borderRadius = '0 12px 12px 0';
    rightPanel.style.boxShadow = 'inset 0 0 12px #e5e7f0';

    // File name header
    const fileTitle = document.createElement('h2');
    fileTitle.style.margin = '0 0 10px 0';
    fileTitle.style.fontWeight = '700';
    fileTitle.style.color = '#0a84ff';
    rightPanel.appendChild(fileTitle);

    // File content textarea
    const fileContent = document.createElement('textarea');
    fileContent.style.flex = '1';
    fileContent.style.resize = 'none';
    fileContent.style.fontFamily = `'Consolas', 'Courier New', monospace`;
    fileContent.style.fontSize = '14px';
    fileContent.style.padding = '12px';
    fileContent.style.border = '1px solid #ccc';
    fileContent.style.borderRadius = '8px';
    fileContent.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.1)';
    rightPanel.appendChild(fileContent);

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save File';
    saveBtn.style.marginTop = '12px';
    saveBtn.style.alignSelf = 'flex-start';
    saveBtn.style.padding = '10px 20px';
    saveBtn.style.background = '#0a84ff';
    saveBtn.style.color = 'white';
    saveBtn.style.fontWeight = '700';
    saveBtn.style.border = 'none';
    saveBtn.style.borderRadius = '8px';
    saveBtn.style.cursor = 'pointer';
    saveBtn.onmouseenter = () => (saveBtn.style.background = '#006edc');
    saveBtn.onmouseleave = () => (saveBtn.style.background = '#0a84ff');
    rightPanel.appendChild(saveBtn);

    container.appendChild(leftPanel);
    container.appendChild(rightPanel);

    let entries = await userStorage.listEntries();

    if (!entries.some(e => e.path === 'C:/UserFiles' && e.isFolder)) {
      await userStorage.saveEntry('C:/UserFiles', null, true);
      entries = await userStorage.listEntries();
    }

    let currentFilePath = null;

    async function openFile(file) {
      currentFilePath = file.path;
      fileTitle.textContent = file.path.split(/[\\/]/).pop();
      fileContent.value = file.content || '';
    }

    saveBtn.onclick = async () => {
      if (!currentFilePath) return alert('No file opened.');
      await userStorage.saveEntry(currentFilePath, fileContent.value, false);
      alert('File saved!');
      entries = await userStorage.listEntries();
      refreshTree();
    };

    async function refreshTree() {
      leftPanel.querySelectorAll('ul').forEach(ul => ul.remove());
      const tree = createTreeView(leftPanel, entries, 'C:/UserFiles', openFile);
      leftPanel.appendChild(tree);
    }

    newFolderBtn.onclick = async () => {
      const folderName = prompt('New folder name:');
      if (!folderName) return;
      const folderPath = `C:/UserFiles/${folderName}`;
      if (entries.find(e => e.path === folderPath)) return alert('Folder already exists.');
      await userStorage.saveEntry(folderPath, null, true);
      entries = await userStorage.listEntries();
      refreshTree();
    };

    refreshBtn.onclick = async () => {
      entries = await userStorage.listEntries();
      refreshTree();
    };

    // Drag & drop file upload
    container.addEventListener('dragover', e => e.preventDefault());
    container.addEventListener('drop', async e => {
      e.preventDefault();
      for (const file of e.dataTransfer.files) {
        const content = await file.text();
        const path = `C:/UserFiles/${file.name}`;
        await userStorage.saveEntry(path, content, false);
      }
      entries = await userStorage.listEntries();
      refreshTree();
    });

    OS.createWindow('OrangeSpace Explorer', container, {
      left: '100px',
      top: '100px',
    });
  });
}
