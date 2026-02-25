# VGDL-JS: JavaScript Port of VGDL Interpreter

## Overview

Client-side JavaScript VGDL interpreter for a blog where users can edit game rules and layouts on the fly. Clean rewrite from the Python `src/vgdl/` source, targeting all 13 vgfmri games. Grid-based only.

## File Structure

```
vgdl-js/
  PLAN.md                    -- This document
  index.html                 -- Blog page: textareas + canvas + controls
  main.js                    -- Glue: keyboard input, game loop, UI wiring
  renderer.js                -- Canvas renderer (colored rects on grid)
  engine/
    constants.js             -- Colors, directions, vector helpers
    rect.js                  -- Minimal AABB Rect (replaces pygame.Rect)
    action.js                -- Action class + ACTION enum
    registry.js              -- Name -> class/function map
    setup-registry.js        -- Registers all classes/effects/terminations
    sprite-registry.js       -- Sprite class defs, live/dead tracking, stype hierarchy
    sprite.js                -- VGDLSprite base class, Resource, Immutable
    physics.js               -- GridPhysics (passive + active movement)
    sprites.js               -- All NPC sprite subclasses
    avatars.js               -- MovingAvatar, ShootAvatar, OrientedAvatar, etc.
    effects.js               -- All effect functions
    terminations.js          -- Timeout, SpriteCounter, MultiSpriteCounter
    parser.js                -- indent_tree_parser, VGDLParser
    game.js                  -- BasicGame (domain) + BasicGameLevel (tick loop)
  games/
    game-data.js             -- Bundled .txt files for all 13 vgfmri games + levels
  tests/
    test-framework.js        -- Minimal browser test framework
    test-rect.js             -- Rect tests
    test-action.js           -- Action tests
    test-registry.js         -- Registry tests
    test-physics.js          -- GridPhysics tests
    test-sprites.js          -- Sprite + SpriteRegistry tests
    test-effects.js          -- Effect function tests
    test-terminations.js     -- Termination tests
    test-parser.js           -- Parser tests
    test-game.js             -- Full game integration tests
    run-tests.html           -- Browser test runner
```

## Key Design Decisions

### Tick order (matches Python exactly)
```
tick(action):
  1. time++, last_reward = 0
  2. Set active_keys from action
  3. Update all sprites (sprite.update -> lastrect save, lastmove++, passive_movement)
  4. Move event handling: stepBack -> bounceForward/reverseDirection -> stepBack again
  5. Non-move event handling: all other effects
  6. Flush kill_list, create_list, resource_changes (clamp to [0, limit])
  7. Check terminations (short-circuit on first trigger)
  8. Clear queues
```

### Deferred side effects
- `kill_list`, `create_list`, `resource_changes` are arrays populated during steps 3-5, flushed in step 6
- Sprites in `kill_list` still participate in collision checks until flush
- `changeResource` pushes to `resource_changes` (NOT applied immediately)

### Collision detection
- `Rect.colliderect()` for AABB overlap
- EOS detection: `!game_rect.contains(sprite.rect)`
- Larger group is iterated as "others" (optimization, sets `reverse` flag)

### stepBack push-chain undo
- `stepBackPusher(sprite, depth)` recursively reverts sprites that were pushed
- `just_pushed` field on each sprite tracks the chain
- Double stepBack pass (before and after bounceForward) handles cascading pushes

### Sprite type hierarchy
- Each sprite gets `stypes` array (e.g., `['chaser1', 'chaser', 'mover']`)
- `spriteRegistry.withStype('mover')` returns all sprites whose stypes include 'mover'

## Running

### Tests
Open `tests/run-tests.html` in a browser. All tests run automatically.

### Game UI
Open `index.html` in a browser. Requires a local HTTP server for ES modules:
```bash
cd vgdl-js && python -m http.server 8080
# Then open http://localhost:8080
```

## Python Source Mapping

| JS File | Python Source |
|---------|-------------|
| constants.js | src/vgdl/ontology/constants.py |
| rect.js | pygame.Rect |
| action.js | src/vgdl/core.py (Action, ACTION) |
| registry.js | src/vgdl/registration.py |
| sprite.js | src/vgdl/core.py (VGDLSprite, Resource, Immutable) |
| sprite-registry.js | src/vgdl/core.py (SpriteRegistry) |
| physics.js | src/vgdl/ontology/physics.py |
| sprites.js | src/vgdl/ontology/sprites.py |
| avatars.js | src/vgdl/ontology/avatars.py |
| effects.js | src/vgdl/ontology/effects.py |
| terminations.js | src/vgdl/ontology/terminations.py |
| parser.js | src/vgdl/parser.py |
| game.js | src/vgdl/core.py (BasicGame, BasicGameLevel) |
