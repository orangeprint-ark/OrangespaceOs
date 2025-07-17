export async function init(OS) {
  const vfs = OS.vfs;

  OS.registerApp('explorer', () => {
    const container = document.createElement('div');
    container.style.width = '720px';
    container.style.height = '520px';
    container.style.display = 'flex';
    container.style.background = 'white';
    container.style.borderRadius = '12px';
    container.style.boxShadow = '0 0 16px rgba(0,0,0,0.2)';
    container.style.overflow = 'hidden';
    container.style.fontFamily = `'Segoe UI', sans-serif`;

    const left = document.createElement('div');
    left.style.width = '240px';
    left.style.borderRight = '1px solid #ccc';
    left.style.overflowY = 'auto';
    left.style.padding = '10px';

    const right = document.createElement('div');
    right.style.flex = '1';
    right.style.padding = '12px';
    right.style.display = 'flex';
    right.style.flexDirection = 'column';

    const fileTitle = document.createElement('h2');
    const fileContent = document.createElement('textarea');
    const saveBtn = document.createElement('button');

    fileTitle.style.margin = '0 0 10px';
    fileTitle.style.fontSize = '18px';
    fileTitle.style.color = '#0a84ff';

    fileContent.style.flex = '1';
    fileContent.style.resize = 'none';
    fileContent.style.padding = '12px';
    fileContent.style.fontFamily = 'monospace';
    fileContent.style.fontSize = '14px';
    fileContent.style.border = '1px solid #ccc';
    fileContent.style.borderRadius = '6px';

    saveBtn.textContent = '💾 Save';
    saveBtn.style.marginTop = '12px';
    saveBtn.style.alignSelf = 'flex-start';
    saveBtn.style.padding = '8px 16px';
    saveBtn.style.background = '#0a84ff';
    saveBtn.style.color = 'white';
    saveBtn.style.border = 'none';
    saveBtn.style.borderRadius = '6px';
    saveBtn.style.cursor = 'pointer';

    right.appendChild(fileTitle);
    right.appendChild(fileContent);
    right.appendChild(saveBtn);

    container.appendChild(left);
    container.appendChild(right);

    let currentFilePath = null;

    function buildTree(node, path = '/') {
      const children = vfs.readDir(path);
      if (!children) return;

      const ul = document.createElement('ul');
      ul.style.listStyle = 'none';
      ul.style.paddingLeft = '16px';

      children.forEach(child => {
        const li = document.createElement('li');
        li.style.cursor = 'pointer';
        li.style.margin = '4px 0';
        li.textContent = child.name;
        li.style.color = child.isDir ? '#0a84ff' : '#333';

        if (child.isDir) {
          li.onclick = e => {
            e.stopPropagation();
            const sub = buildTree(li, path + '/' + child.name);
            if (li.contains(sub)) {
              li.removeChild(sub);
            } else {
              li.appendChild(sub);
            }
          };
        } else {
          li.onclick = () => {
            const content = vfs.readFile(path + '/' + child.name);
            currentFilePath = path + '/' + child.name;
            fileTitle.textContent = child.name;
            fileContent.value = content;
          };
        }

        ul.appendChild(li);
      });

      return ul;
    }

    saveBtn.onclick = () => {
      if (!currentFilePath) return alert('No file open.');
      vfs.fsWrite(currentFilePath, fileContent.value);
      alert('File saved!');
    };

    const newFolderBtn = document.createElement('button');
    newFolderBtn.textContent = '📁 New Folder';
    newFolderBtn.style.margin = '8px 0';
    newFolderBtn.style.padding = '6px 12px';
    newFolderBtn.style.cursor = 'pointer';
    newFolderBtn.style.background = '#eee';
    newFolderBtn.style.border = '1px solid #ccc';
    newFolderBtn.style.borderRadius = '4px';

    newFolderBtn.onclick = () => {
      const name = prompt('New folder name:');
      if (!name) return;
      const path = '/Documents/' + name;
      const ok = vfs.mkdir(path);
      if (!ok) return alert('Failed to create folder');
      left.innerHTML = '';
      left.appendChild(newFolderBtn);
      left.appendChild(buildTree(left, '/Documents'));
    };

    left.appendChild(newFolderBtn);
    left.appendChild(buildTree(left, '/Documents'));

    OS.createWindow('OrangeSpace Explorer', container, {
      left: '120px',
      top: '80px',
    });
  });
}
