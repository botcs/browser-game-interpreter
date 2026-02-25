// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

// OntologyRegistry: name -> class/function map
// Port of src/vgdl/registration.py

export class OntologyRegistry {
  constructor() {
    this._register = {};
  }

  has(key) {
    return key in this._register;
  }

  register(key, cls) {
    this._register[key] = cls;
  }

  registerClass(cls) {
    this.register(cls.name, cls);
  }

  request(key) {
    if (!(key in this._register)) {
      throw new Error(`Unknown registry key: '${key}'`);
    }
    return this._register[key];
  }

  registerAll(entries) {
    for (const [key, value] of Object.entries(entries)) {
      this.register(key, value);
    }
  }
}

// Global singleton registry, populated by engine modules
export const registry = new OntologyRegistry();