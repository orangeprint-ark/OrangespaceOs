export default class CPU {
  constructor(memorySize = 1024 * 1024) {
    // 1MB memory
    this.memory = new Uint8Array(memorySize);

    // 8 General purpose 32-bit registers (EAX, ECX, EDX, EBX, ESP, EBP, ESI, EDI)
    this.regs32 = new Uint32Array(8);

    // Register indices
    this.EAX = 0; this.ECX = 1; this.EDX = 2; this.EBX = 3;
    this.ESP = 4; this.EBP = 5; this.ESI = 6; this.EDI = 7;

    // 16-bit and 8-bit view helpers (for modrm decoding)
    this.regs16 = new Uint16Array(this.regs32.buffer);
    this.regs8 = new Uint8Array(this.regs32.buffer);

    // Instruction pointer
    this.EIP = 0;

    // Flags register as individual bits
    this.flags = {
      CF: 0, // Carry
      PF: 0, // Parity
      AF: 0, // Adjust
      ZF: 0, // Zero
      SF: 0, // Sign
      TF: 0, // Trap
      IF: 0, // Interrupt
      DF: 0, // Direction
      OF: 0, // Overflow
    };

    this.running = false;
    this.halted = false;

    // Prefix state (for instructions like operand size override)
    this.prefixes = {
      operandSize: 32, // 16 or 32 bits
      addressSize: 32, // 16 or 32 bits
      segmentOverride: null,
    };

    // I/O Hooks
    this.onOutput = null;
    this.onHalt = null;
    this.onError = null;
    this.onDebug = null;

    // Stack pointer initialized at end of memory
    this.regs32[this.ESP] = memorySize - 4;

    // Debug level (0 = none, 1 = minimal, 2 = verbose)
    this.debugLevel = 0;
  }

  // Helper to combine flags into EFLAGS register integer
  getEFLAGS() {
    let eflags = 0;
    eflags |= this.flags.CF ? 1 << 0 : 0;
    eflags |= this.flags.PF ? 1 << 2 : 0;
    eflags |= this.flags.AF ? 1 << 4 : 0;
    eflags |= this.flags.ZF ? 1 << 6 : 0;
    eflags |= this.flags.SF ? 1 << 7 : 0;
    eflags |= this.flags.TF ? 1 << 8 : 0;
    eflags |= this.flags.IF ? 1 << 9 : 0;
    eflags |= this.flags.DF ? 1 << 10 : 0;
    eflags |= this.flags.OF ? 1 << 11 : 0;
    return eflags >>> 0;
  }

  // Update flags from EFLAGS integer
  setEFLAGS(eflags) {
    this.flags.CF = (eflags & (1 << 0)) !== 0 ? 1 : 0;
    this.flags.PF = (eflags & (1 << 2)) !== 0 ? 1 : 0;
    this.flags.AF = (eflags & (1 << 4)) !== 0 ? 1 : 0;
    this.flags.ZF = (eflags & (1 << 6)) !== 0 ? 1 : 0;
    this.flags.SF = (eflags & (1 << 7)) !== 0 ? 1 : 0;
    this.flags.TF = (eflags & (1 << 8)) !== 0 ? 1 : 0;
    this.flags.IF = (eflags & (1 << 9)) !== 0 ? 1 : 0;
    this.flags.DF = (eflags & (1 << 10)) !== 0 ? 1 : 0;
    this.flags.OF = (eflags & (1 << 11)) !== 0 ? 1 : 0;
  }

  // Read byte from memory with bounds check
  read8(addr) {
    if (addr < 0 || addr >= this.memory.length) throw new Error(`Memory read8 out of range: 0x${addr.toString(16)}`);
    return this.memory[addr];
  }

  // Read 16-bit little endian
  read16(addr) {
    return this.read8(addr) | (this.read8(addr + 1) << 8);
  }

  // Read 32-bit little endian
  read32(addr) {
    return (this.read16(addr) | (this.read16(addr + 2) << 16)) >>> 0;
  }

  // Write byte to memory
  write8(addr, val) {
    if (addr < 0 || addr >= this.memory.length) throw new Error(`Memory write8 out of range: 0x${addr.toString(16)}`);
    this.memory[addr] = val & 0xFF;
  }

  // Write 16-bit
  write16(addr, val) {
    this.write8(addr, val & 0xFF);
    this.write8(addr + 1, (val >> 8) & 0xFF);
  }

  // Write 32-bit
  write32(addr, val) {
    this.write16(addr, val & 0xFFFF);
    this.write16(addr + 2, (val >> 16) & 0xFFFF);
  }

  // Read instruction byte and advance EIP
  fetch8() {
    const val = this.read8(this.EIP);
    this.EIP = (this.EIP + 1) >>> 0;
    return val;
  }

  fetch16() {
    const val = this.read16(this.EIP);
    this.EIP = (this.EIP + 2) >>> 0;
    return val;
  }

  fetch32() {
    const val = this.read32(this.EIP);
    this.EIP = (this.EIP + 4) >>> 0;
    return val;
  }

  // Helper to sign extend
  signExtend(value, bits) {
    const shift = 32 - bits;
    return (value << shift) >> shift;
  }

  // Get reg32 name from index
  reg32Name(idx) {
    switch(idx) {
      case 0: return 'EAX';
      case 1: return 'ECX';
      case 2: return 'EDX';
      case 3: return 'EBX';
      case 4: return 'ESP';
      case 5: return 'EBP';
      case 6: return 'ESI';
      case 7: return 'EDI';
      default: return 'UNK';
    }
  }

  // Helper to set flag ZF and SF from 32-bit result
  setZF_SF_32(val) {
    this.flags.ZF = val === 0 ? 1 : 0;
    this.flags.SF = (val & 0x80000000) !== 0 ? 1 : 0;
  }

  // Helper to set flag ZF and SF from 8-bit result
  setZF_SF_8(val) {
    this.flags.ZF = (val & 0xFF) === 0 ? 1 : 0;
    this.flags.SF = (val & 0x80) !== 0 ? 1 : 0;
  }

  // Helper: decode ModRM byte (returns object with mod, reg, rm)
  decodeModRM() {
    const modrm = this.fetch8();
    return {
      mod: (modrm & 0b11000000) >> 6,
      reg: (modrm & 0b00111000) >> 3,
      rm: (modrm & 0b00000111),
      byte: modrm,
    };
  }

  // Effective Address Calculation (only simple modes for now)
  calcEffectiveAddress(mod, rm) {
    // For now support only mod=00,01,10 with no SIB
    // mod=00 and rm=5 is disp32
    let addr = 0;
    switch(mod) {
      case 0: 
        if (rm === 5) {
          addr = this.fetch32();
        } else {
          addr = this.regs32[rm];
        }
        break;
      case 1: // disp8
        addr = (this.regs32[rm] + this.signExtend(this.fetch8(), 8)) >>> 0;
        break;
      case 2: // disp32
        addr = (this.regs32[rm] + this.fetch32()) >>> 0;
        break;
      default:
        throw new Error(`Unsupported ModRM mod: ${mod}`);
    }
    return addr;
  }

  // Execute one instruction cycle
  step() {
    if (this.halted) {
      if (this.debugLevel >= 1) this.debug('CPU halted');
      return;
    }

    let opcode = this.fetch8();

    if (this.debugLevel >= 2) this.debug(`Opcode: 0x${opcode.toString(16)}`);

    // Prefixes (0x66 = operand size override, 0x67 address size override)
    while (opcode === 0x66 || opcode === 0x67) {
      if (opcode === 0x66) this.prefixes.operandSize = this.prefixes.operandSize === 32 ? 16 : 32;
      if (opcode === 0x67) this.prefixes.addressSize = this.prefixes.addressSize === 32 ? 16 : 32;
      opcode = this.fetch8();
    }

    switch (opcode) {
      case 0x90: // NOP
        break;

      // MOV r32, imm32 (B8+rd)
      case 0xB8:
      case 0xB9:
      case 0xBA:
      case 0xBB:
      case 0xBC:
      case 0xBD:
      case 0xBE:
      case 0xBF: {
        const regIndex = opcode - 0xB8;
        const imm32 = this.fetch32();
        this.regs32[regIndex] = imm32;
        if (this.debugLevel >= 2) this.debug(`MOV ${this.reg32Name(regIndex)}, 0x${imm32.toString(16)}`);
        break;
      }

      // ADD EAX, imm32 (05)
      case 0x05: {
        const imm32 = this.fetch32();
        const result = (this.regs32[this.EAX] + imm32) >>> 0;
        this.flags.CF = result < this.regs32[this.EAX] ? 1 : 0;
        this.regs32[this.EAX] = result;
        this.setZF_SF_32(result);
        break;
      }

      // JMP rel32 (E9)
      case 0xE9: {
        const rel32 = this.signExtend(this.fetch32(), 32);
        this.EIP = (this.EIP + rel32) >>> 0;
        break;
      }

      // CALL rel32 (E8)
      case 0xE8: {
        const rel32 = this.signExtend(this.fetch32(), 32);
        this.push32(this.EIP);
        this.EIP = (this.EIP + rel32) >>> 0;
        break;
      }

      // RET (C3)
      case 0xC3: {
        this.EIP = this.pop32();
        break;
      }

      // PUSH r32 (50 + reg)
      case 0x50:
      case 0x51:
      case 0x52:
      case 0x53:
      case 0x54:
      case 0x55:
      case 0x56:
      case 0x57: {
        const regIndex = opcode - 0x50;
        this.push32(this.regs32[regIndex]);
        break;
      }

      // POP r32 (58 + reg)
      case 0x58:
      case 0x59:
      case 0x5A:
      case 0x5B:
      case 0x5C:
      case 0x5D:
      case 0x5E:
      case 0x5F: {
        const regIndex = opcode - 0x58;
        this.regs32[regIndex] = this.pop32();
        break;
      }

      // HLT (F4)
      case 0xF4: {
        this.halted = true;
        if (this.onHalt) this.onHalt();
        break;
      }

      default:
        // Extended opcodes or unimplemented opcodes could go here
        if (this.debugLevel >= 1) this.debug(`Unhandled opcode: 0x${opcode.toString(16)} at EIP=0x${(this.EIP-1).toString(16)}`);
        throw new Error(`Unsupported opcode 0x${opcode.toString(16)} at 0x${(this.EIP-1).toString(16)}`);
    }
  }

  push32(val) {
    this.regs32[this.ESP] = (this.regs32[this.ESP] - 4) >>> 0;
    this.write32(this.regs32[this.ESP], val);
  }

  pop32() {
    const val = this.read32(this.regs32[this.ESP]);
    this.regs32[this.ESP] = (this.regs32[this.ESP] + 4) >>> 0;
    return val >>> 0;
  }

  run(maxSteps = 1000000) {
    this.running = true;
    let steps = 0;
    try {
      while (this.running && !this.halted && steps < maxSteps) {
        this.step();
        steps++;
      }
      if (steps >= maxSteps) {
        throw new Error('CPU max steps exceeded');
      }
    } catch (e) {
      this.running = false;
      if (this.onError) this.onError(e.message);
      else throw e;
    }
  }

  debug(msg) {
    if (this.onDebug) this.onDebug(msg);
    else console.log('[CPU DEBUG]', msg);
  }
}
