// kernel/vfs.js

export class VFS {
  constructor() {
    // Simple static file system structure
    this.fs = {
      '/': {
        type: 'dir',
        children: {
          Documents: {
            type: 'dir',
            children: {
              'welcome.txt': {
                type: 'file',
                content: 'Welcome to OrangeSpace OS!\nThis is a sample file.\n'
              },
              'todo.txt': {
                type: 'file',
                content: '- Build more apps\n- Add networking\n- Make OS awesome\n'
              }
            }
          },
          'ReadMe.md': {
            type: 'file',
            content: '# OrangeSpace OS\nThis is the root readme file.\n'
          },
          Apps: {
            type: 'dir',
            children: {}
          }
        }
      }
    };
  }

  // Normalize path and return parts array
  _normalize(path) {
    if (!path.startsWith('/')) path = '/' + path;
    const parts = path.split('/').filter(Boolean);
    return parts;
  }

  // Resolve a path to its node or null
  _resolve(path) {
    const parts = this._normalize(path);
    let node = this.fs['/'];
    for (const part of parts) {
      if (node.type !== 'dir' || !node.children[part]) return null;
      node = node.children[part];
    }
    return node;
  }

  // Read contents of directory
  readDir(path = '/') {
    const node = this._resolve(path);
    if (!node || node.type !== 'dir') return null;
    return Object.entries(node.children).map(([name, entry]) => ({
      name,
      isDir: entry.type === 'dir',
      path: (path === '/' ? '' : path) + '/' + name
    }));
  }

  // Read contents of file
  readFile(path) {
    const node = this._resolve(path);
    if (!node || node.type !== 'file') return null;
    return node.content;
  }

  // Write to file (create if not exists)
  writeFile(path, content) {
    const parts = this._normalize(path);
    const fileName = parts.pop();
    let dir = this.fs['/'];

    for (const part of parts) {
      if (!dir.children[part]) {
        dir.children[part] = { type: 'dir', children: {} };
      }
      dir = dir.children[part];
    }

    dir.children[fileName] = {
      type: 'file',
      content: content
    };
  }

  // Make directory
  mkdir(path) {
    const parts = this._normalize(path);
    let dir = this.fs['/'];

    for (const part of parts) {
      if (!dir.children[part]) {
        dir.children[part] = { type: 'dir', children: {} };
      }
      dir = dir.children[part];
    }
  }

  // Delete a file or folder
  delete(path) {
    const parts = this._normalize(path);
    const last = parts.pop();
    const parent = this._resolve('/' + parts.join('/'));
    if (!parent || parent.type !== 'dir') return false;

    delete parent.children[last];
    return true;
  }

  // List all entries recursively
  listAll(path = '/', out = []) {
    const node = this._resolve(path);
    if (!node) return out;

    if (node.type === 'file') {
      out.push({ path, isFolder: false, content: node.content });
    } else if (node.type === 'dir') {
      for (const [name, child] of Object.entries(node.children)) {
        this.listAll(`${path === '/' ? '' : path}/${name}`, out);
      }
    }
    return out;
  }
}
