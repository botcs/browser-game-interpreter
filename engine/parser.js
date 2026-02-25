// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

// VGDL Parser - port of src/vgdl/parser.py
import { registry } from './registry.js';
import { SpriteRegistry } from './sprite-registry.js';
import { BasicGame } from './game.js';
import { FunctionalEffect, Effect } from './game.js';

// Lightweight indented tree node
export class Node {
  constructor(content, indent, parent = null) {
    this.children = [];
    this.content = content;
    this.indent = indent;
    this.parent = null;
    if (parent) {
      parent.insert(this);
    }
  }

  insert(node) {
    if (this.indent < node.indent) {
      if (this.children.length > 0) {
        if (this.children[0].indent !== node.indent) {
          throw new Error(`Children indentations must match: expected ${this.children[0].indent}, got ${node.indent}`);
        }
      }
      this.children.push(node);
      node.parent = this;
    } else {
      if (!this.parent) {
        throw new Error('Root node too indented?');
      }
      this.parent.insert(node);
    }
  }

  getRoot() {
    if (this.parent) {
      return this.parent.getRoot();
    }
    return this;
  }

  toString() {
    if (this.children.length === 0) {
      return this.content;
    }
    return this.content + '[' + this.children.map(c => c.toString()).join(', ') + ']';
  }
}


export function indentTreeParser(s, tabsize = 8) {
  // Replace tabs with spaces
  s = s.replace(/\t/g, ' '.repeat(tabsize));
  const lines = s.split('\n');

  let last = new Node('', -1);
  for (let l of lines) {
    // Remove comments starting with "#"
    if (l.includes('#')) {
      l = l.split('#')[0];
    }
    const content = l.trim();
    if (content.length > 0) {
      const indent = l.length - l.trimStart().length;
      last = new Node(content, indent, last);
    }
  }
  return last.getRoot();
}


export class VGDLParser {
  constructor() {
    this.verbose = false;
  }

  parseGame(treeOrString, extraArgs = {}) {
    let tree = treeOrString;
    if (typeof tree === 'string') {
      tree = indentTreeParser(tree).children[0];
    }

    const [sclass, args] = this._parseArgs(tree.content);
    Object.assign(args, extraArgs);

    // Basic Game construction
    this.spriteRegistry = new SpriteRegistry();
    this.game = new BasicGame(this.spriteRegistry, args);

    for (const c of tree.children) {
      if (c.content.startsWith('SpriteSet')) {
        this.parseSprites(c.children);
      }
      if (c.content === 'InteractionSet') {
        this.parseInteractions(c.children);
      }
      if (c.content === 'LevelMapping') {
        this.parseMappings(c.children);
      }
      if (c.content === 'TerminationSet') {
        this.parseTerminations(c.children);
      }
    }

    this.game.finishSetup();
    return this.game;
  }

  _eval(estr) {
    if (registry.has(estr)) {
      return registry.request(estr);
    }
    // Try parsing as number
    const num = Number(estr);
    if (!isNaN(num)) {
      return num;
    }
    // Try boolean
    if (estr === 'True' || estr === 'true') return true;
    if (estr === 'False' || estr === 'false') return false;
    // Return as string
    return estr;
  }

  _parseArgs(s, sclass = null, args = null) {
    if (!args) args = {};
    const sparts = s.split(/\s+/).filter(p => p.length > 0);
    if (sparts.length === 0) return [sclass, args];

    if (!sparts[0].includes('=')) {
      sclass = this._eval(sparts[0]);
      sparts.shift();
    }

    for (const sp of sparts) {
      const eqIdx = sp.indexOf('=');
      if (eqIdx === -1) continue;
      const k = sp.substring(0, eqIdx);
      const val = sp.substring(eqIdx + 1);
      args[k] = this._eval(val);
    }

    return [sclass, args];
  }

  parseSprites(snodes, parentclass = null, parentargs = {}, parenttypes = []) {
    for (const sn of snodes) {
      if (!sn.content.includes('>')) {
        throw new Error(`Expected '>' in sprite definition: ${sn.content}`);
      }
      const [key, sdef] = sn.content.split('>').map(x => x.trim());
      const [sclass, args] = this._parseArgs(sdef, parentclass, { ...parentargs });
      const stypes = [...parenttypes, key];

      if ('singleton' in args) {
        if (args.singleton === true) {
          this.spriteRegistry.registerSingleton(key);
        }
        delete args.singleton;
      }

      if (sn.children.length === 0) {
        if (this.verbose) {
          console.log('Defining:', key, sclass, args, stypes);
        }
        this.spriteRegistry.registerSpriteClass(key, sclass, args, stypes);
        const idx = this.game.sprite_order.indexOf(key);
        if (idx !== -1) {
          this.game.sprite_order.splice(idx, 1);
        }
        this.game.sprite_order.push(key);
      } else {
        this.parseSprites(sn.children, sclass, args, stypes);
      }
    }
  }

  parseInteractions(inodes) {
    for (const inode of inodes) {
      if (!inode.content.includes('>')) continue;
      const [pair, edef] = inode.content.split('>').map(x => x.trim());
      const [eclass, kwargs] = this._parseArgs(edef);
      const objs = pair.split(/\s+/).filter(x => x.length > 0);

      for (let i = 1; i < objs.length; i++) {
        const actorStype = objs[0];
        const acteeStype = objs[i];

        let effect;
        if (typeof eclass === 'function' && !eclass.prototype) {
          // It's a plain function (not a class constructor)
          effect = new FunctionalEffect(eclass, actorStype, acteeStype, kwargs);
        } else if (typeof eclass === 'function') {
          // Class-based effect
          effect = new FunctionalEffect(eclass, actorStype, acteeStype, kwargs);
        } else {
          throw new Error(`Unknown effect type: ${eclass}`);
        }

        this.game.collision_eff.push(effect);
      }
    }
  }

  parseTerminations(tnodes) {
    for (const tn of tnodes) {
      const [sclass, args] = this._parseArgs(tn.content);
      this.game.terminations.push(new sclass(args));
    }
  }

  parseMappings(mnodes) {
    for (const mn of mnodes) {
      const [c, val] = mn.content.split('>').map(x => x.trim());
      if (c.length !== 1) {
        throw new Error(`Only single character mappings allowed, got: '${c}'`);
      }
      const keys = val.split(/\s+/).filter(x => x.length > 0);
      this.game.char_mapping[c] = keys;
    }
  }
}