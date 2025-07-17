// userStorage.js - same as before but add folders support

const IGNORED_FILES = ['.gitignore', 'system.log', 'temp.tmp'];

// Data format example:
// { path: "C:/UserFiles/documents/readme.txt", content: "file contents", isFolder: false }
// { path: "C:/UserFiles/documents", content: null, isFolder: true }

const DB_NAME = 'OrangeSpaceUserData';
const STORE_NAME = 'files';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'path' });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function saveEntry(path, content = null, isFolder = false) {
  if (IGNORED_FILES.some(f => path.includes(f))) return;

  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ path, content, isFolder });
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

async function loadEntry(path) {
  if (IGNORED_FILES.some(f => path.includes(f))) return null;

  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(path);
    req.onsuccess = () => res(req.result || null);
    req.onerror = () => rej(req.error);
  });
}

async function deleteEntry(path) {
  if (IGNORED_FILES.some(f => path.includes(f))) return false;
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(path);
    req.onsuccess = () => res(true);
    req.onerror = () => rej(req.error);
  });
}

async function listEntries(prefix = 'C:/UserFiles') {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const entries = [];
    store.openCursor().onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.key.startsWith(prefix)) {
          entries.push(cursor.value);
        }
        cursor.continue();
      } else {
        res(entries);
      }
    };
    tx.onerror = () => rej(tx.error);
  });
}

export const userStorage = {
  saveEntry,
  loadEntry,
  deleteEntry,
  listEntries,
};
