export async function init(OS) {
  OS.registerApp('terminal', () => {
    OS.createWindow('Terminal', `
      <div id="terminal-output" style="height: 180px; overflow-y:auto; background:#111; color:#0f0; padding:8px; font-family: monospace; font-size: 0.9rem;"></div>
      <input id="terminal-input" type="text" style="width:100%; padding:6px; font-family: monospace;" placeholder="Type JS commands and press Enter" aria-label="Terminal input"/>
    `);

    const win = OS.windows[OS.windows.length - 1];
    const output = win.querySelector('#terminal-output');
    const input = win.querySelector('#terminal-input');

    function print(text) {
      output.innerHTML += text + '<br>';
      output.scrollTop = output.scrollHeight;
    }

    print('OrangeSpace Terminal. JS commands only.');

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const cmd = input.value.trim();
        input.value = '';
        print(`> ${cmd}`);
        try {
          const result = eval(cmd);
          print(`<span style="color:#0ff;">${result}</span>`);
        } catch (err) {
          print(`<span style="color:#f66;">Error: ${err.message}</span>`);
        }
      }
    });
  });
}
