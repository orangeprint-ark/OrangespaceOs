import { CPU } from './cpu.js';

export async function init(OS) {
  OS.registerApp('exeopener', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.exe';
    fileInput.style.display = 'none';

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;

      const buffer = await file.arrayBuffer();
      try {
        const cpu = await loadAndExecuteEXE(buffer);
        console.log('[EXE] Execution started at EIP:', cpu.getEIP().toString(16));
        OS.createWindow(`Running ${file.name}`, document.createTextNode(`EXE ${file.name} loaded and started.`));
      } catch (err) {
        console.error('[EXE Loader Error]', err);
        OS.createWindow('EXE Load Error', document.createTextNode(err.message));
      }
    });

    fileInput.click();
  });
}

// Full EXE loader and runner
async function loadAndExecuteEXE(buffer) {
  const view = new DataView(buffer);
  const text = new Uint8Array(buffer);

  // Check for 'MZ'
  if (view.getUint16(0, true) !== 0x5A4D)
    throw new Error('Invalid MZ header');

  const peOffset = view.getUint32(0x3C, true);
  if (view.getUint32(peOffset, true) !== 0x4550)
    throw new Error('Invalid PE header');

  const is32Bit = view.getUint16(peOffset + 24, true) === 0x10B;
  if (!is32Bit) throw new Error('Only 32-bit EXE files are supported');

  const numSections = view.getUint16(peOffset + 6, true);
  const optionalHeaderSize = view.getUint16(peOffset + 20, true);
  const optionalHeaderOffset = peOffset + 24;

  const imageBase = view.getUint32(optionalHeaderOffset + 28, true);
  const entryPointRVA = view.getUint32(optionalHeaderOffset + 16, true);
  const sectionTableOffset = optionalHeaderOffset + optionalHeaderSize;

  const cpu = new CPU();
  const memoryMap = new Map();

  // Load sections
  for (let i = 0; i < numSections; i++) {
    const sectionOffset = sectionTableOffset + i * 40;
    const virtualAddress = view.getUint32(sectionOffset + 12, true);
    const rawSize = view.getUint32(sectionOffset + 16, true);
    const rawPointer = view.getUint32(sectionOffset + 20, true);

    const sectionData = new Uint8Array(buffer, rawPointer, rawSize);
    const virtualAddressAbsolute = imageBase + virtualAddress;

    memoryMap.set(virtualAddressAbsolute, sectionData);
    cpu.loadMemory(virtualAddressAbsolute, sectionData);
  }

  // Set up CPU state
  cpu.setRegister('EIP', imageBase + entryPointRVA);
  cpu.setRegister('ESP', imageBase + 0x100000); // Arbitrary stack top
  cpu.setRegister('EBP', imageBase + 0x100000);
  cpu.setRegister('EAX', 0);
  cpu.setRegister('EBX', 0);
  cpu.setRegister('ECX', 0);
  cpu.setRegister('EDX', 0);

  // Optional: load imports or DLL stubs here if needed (mocking WinAPI)
  setupWinAPIMocks(cpu);

  // Begin execution loop
  cpu.run(); // Alternatively: cpu.startLoop();

  return cpu;
}

// Optionally simulate Windows API functions
function setupWinAPIMocks(cpu) {
  // Stub: you could map addresses to custom instructions or handlers
  cpu.hookSyscall(0x1000, () => {
    console.log('Stub: MessageBoxA() called');
  });

  // You could map GetTickCount, ExitProcess, etc.
}
