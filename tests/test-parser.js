// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

import { describe, it, assert, assertEqual, assertThrows } from './test-framework.js';
import { setupRegistry } from '../engine/setup-registry.js';
import { Node, indentTreeParser, VGDLParser } from '../engine/parser.js';

export function runParserTests() {
  setupRegistry();

  describe('indentTreeParser', () => {
    it('builds correct tree from indented text', () => {
      const text = `Root
  Child1
    Leaf1
    Leaf2
  Child2`;
      const tree = indentTreeParser(text);
      assertEqual(tree.children.length, 1); // Root
      const root = tree.children[0];
      assertEqual(root.content, 'Root');
      assertEqual(root.children.length, 2); // Child1, Child2
      assertEqual(root.children[0].content, 'Child1');
      assertEqual(root.children[0].children.length, 2);
      assertEqual(root.children[1].content, 'Child2');
    });

    it('strips comments', () => {
      const text = `Root
  Child1 # this is a comment
  # full comment line
  Child2`;
      const tree = indentTreeParser(text);
      const root = tree.children[0];
      assertEqual(root.children[0].content, 'Child1');
      assertEqual(root.children.length, 2); // comment line skipped
    });
  });

  describe('VGDLParser.parseGame', () => {
    it('parses bait_vgfmri4 game description', () => {
      const desc = `BasicGame
    SpriteSet
        floor > Immovable img=colors/LIGHTGRAY
        hole > Immovable img=colors/BLUE
        avatar > MovingAvatar img=colors/YELLOW
        mushroom > Immovable img=colors/BLACK
        key > Resource img=colors/ORANGE limit=1
        goal > Immovable img=colors/PURPLE
        box > Passive img=colors/BROWN
        wall > Immovable img=colors/PINK

    LevelMapping
        . > floor
        w > floor wall
        A > floor avatar
        0 > floor hole
        1 > floor box
        k > floor key
        g > floor goal
        m > floor mushroom

    InteractionSet
        avatar wall > stepBack
        avatar hole > killSprite
        box avatar > bounceForward
        box wall > stepBack
        box box > stepBack
        box mushroom > undoAll
        hole box > killSprite
        hole box > changeScore scoreChange=5
        box hole > killSprite
        avatar key > changeScore scoreChange=5
        avatar key > changeResource resource=key value=5
        key avatar > killSprite
        goal avatar > killIfOtherHasMore resource=key limit=1
        mushroom avatar > changeScore scoreChange=10
        mushroom avatar > killSprite

    TerminationSet
        SpriteCounter stype=goal limit=0 win=True
        SpriteCounter stype=avatar limit=0 win=False`;

      const parser = new VGDLParser();
      const game = parser.parseGame(desc);

      // Check sprite_order has the expected keys
      assert(game.sprite_order.includes('floor'));
      assert(game.sprite_order.includes('wall'));
      assert(game.sprite_order.includes('box'));
      // avatar should be last
      assertEqual(game.sprite_order[game.sprite_order.length - 1], 'avatar');

      // Check mappings
      assertEqual(game.char_mapping['.'].length, 1);
      assertEqual(game.char_mapping['.'][0], 'floor');
      assertEqual(game.char_mapping['w'].length, 2);

      // Check terminations
      assertEqual(game.terminations.length, 2);

      // Check collision effects exist
      assert(game.collision_eff.length > 0);
    });

    it('builds a level from parsed game', () => {
      const desc = `BasicGame
    SpriteSet
        wall > Immovable
        avatar > MovingAvatar
    LevelMapping
        w > wall
        A > avatar
    InteractionSet
        avatar wall > stepBack
    TerminationSet
        SpriteCounter stype=avatar limit=0 win=False`;

      const lvl = `wwwww
wA..w
wwwww`;

      const parser = new VGDLParser();
      const game = parser.parseGame(desc);
      const level = game.buildLevel(lvl);

      assertEqual(level.width, 5);
      assertEqual(level.height, 3);

      // Check avatar exists
      const avatars = level.getAvatars();
      assertEqual(avatars.length, 1);
      assertEqual(avatars[0].rect.x, 1);
      assertEqual(avatars[0].rect.y, 1);
    });
  });
}