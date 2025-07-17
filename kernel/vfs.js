// kernel/vfs.js

export class VFS {
  constructor() {
    // Simple static file system tree example
    // folders have `children` object, files have `content` string
    this.fs = {
      '/': {
        type: 'dir',
        children: {
          'Documents': {
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
          }
        }
      }
    };
  }

  // Normalize and split path, return object at path or null
  _resolvePath(path) {
    if (!path.startsWith('/')) path = '/' + path;
    const parts = path.split('/').filter(Boolean);
    let node = this.fs['/'];
    for (let part of parts) {
      if (!node || node.type !== 'dir') return null;
      node = node.children[part];
      if (!node) return null;
    }
    return node;
  }

  // Read directory entries at path
  readDir(path) {
    const node = this._resolvePath(path);
    if (!node || node.type !== 'dir') return null;

    return Object.entries(node.children).map(([name, child]) => ({
      name,
      isDir: child.type === 'dir'
    }));
  }

  // Read file content at path
  readFile(path) {
    const node = this._resolvePath(path);
    if (!node || node.type !== 'file') return null;
    return node.content;
  }

  // Additional methods (writeFile, mkdir, delete, etc.) can be added later
}
