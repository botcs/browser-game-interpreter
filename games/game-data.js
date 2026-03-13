// developed and copyright by Botos Csaba (botos.official@gmail.com), 2026
// Licensed under the MIT License. See LICENSE file for details.

export const GAMES = {
      "roomworld": {
    description: `BasicGame
    SpriteSet
        floor > Immovable img=colors/LIGHTGRAY
        wall > Immovable img=colors/DARKGRAY
        avatar > MovingAvatar img=colored_shapes/YELLOW_CIRCLE
        goal > Immovable img=colored_shapes/LIGHTGREEN_STAR
        key1 > Resource img=colored_shapes/ORANGE_DIAMOND limit=1
        door1 > Immovable img=colored_shapes/ORANGE_SQUARE
        door1_used > Immovable img=colored_shapes/LIGHTORANGE_SQUARE
        key6 > Resource img=colored_shapes/BLUE_DIAMOND limit=1
        door2 > Immovable img=colored_shapes/RED_SQUARE
        teleporter > Immovable img=colored_shapes/PURPLE_HEXAGON
        catapult > Immovable img=colored_shapes/PINK_TRIANGLE
        catapult_used > Immovable img=colored_shapes/LIGHTPINK_TRIANGLE
        t6 > Portal stype=t6 img=colored_shapes/PURPLE_HEXAGON
        t6_used > Immovable img=colored_shapes/LIGHTPURPLE_HEXAGON
        t3 > Immovable img=colored_shapes/GREEN_HEXAGON
        key4 > Resource img=colored_shapes/GREEN_DIAMOND limit=1
        c6 > Immovable img=colored_shapes/RED_TRIANGLE
        door6 > Immovable img=colored_shapes/BLUE_SQUARE
        door6_used > Immovable img=colored_shapes/LIGHTBLUE_SQUARE
        tp4 > Portal stype=tp4 img=colored_shapes/ORANGE_HEXAGON
        tp4_used > Immovable img=colored_shapes/LIGHTORANGE_HEXAGON

    LevelMapping
        . > floor
        w > floor wall
        A > floor avatar
        x > floor goal
        K > floor key1
        D > floor door1
        k > floor key6
        d > floor door2
        t > floor teleporter
        c > floor catapult
        T > floor t6
        S > floor t3
        e > floor key4
        F > floor c6
        G > floor door6
        P > floor tp4

    InteractionSet
        avatar wall > stepBack
        avatar door1 > stepBackIfHasLess resource=key1 limit=1 exhaustStype=door1_used
        avatar door1_used > stepBack
        avatar door2 > stepBack
        avatar door6 > stepBackIfHasLess resource=key6 limit=1 exhaustStype=door6_used
        avatar door6_used > stepBack

        avatar catapult > catapultForward exhaustStype=catapult_used

        avatar key1 > changeResource resource=key1 value=1
        key1 avatar > killSprite

        avatar key6 > changeResource resource=key6 value=1
        key6 avatar > killSprite

        avatar t6 > teleportToOther exhaustStype=t6_used
        avatar tp4 > teleportToOther exhaustStype=tp4_used

        avatar key4 > changeResource resource=key4 value=1
        key4 avatar > killSprite

        goal avatar > killSprite

        floor EOS > killSprite
        wall EOS > killSprite
        avatar EOS > killSprite
        goal EOS > killSprite
        key1 EOS > killSprite
        door1 EOS > killSprite
        door1_used EOS > killSprite
        key6 EOS > killSprite
        door2 EOS > killSprite
        teleporter EOS > killSprite
        catapult EOS > killSprite
        catapult_used EOS > killSprite
        t6 EOS > killSprite
        t6_used EOS > killSprite
        t3 EOS > killSprite
        key4 EOS > killSprite
        c6 EOS > killSprite
        door6 EOS > killSprite
        door6_used EOS > killSprite
        tp4 EOS > killSprite
        tp4_used EOS > killSprite

    TerminationSet
        SpriteCounter stype=goal limit=0 win=True
        Timeout limit=1500 win=False`,
    levels: {
      0: `wwwwwwwwwwwww
w...w...D...w
w...w.K.w.x.w
w...wA..w...w
wwwwwwwwwwwww
w...w.t.w...w
w...w...wc..w
w..kw...w...w
wwdwwwwwwwwww
w...w...w...w
w...w...w...w
w...w...w...w
wwwwwwwwwwwww`,
      1: `wwwwwwwwwwwww
w...w...w.F.w
w...w...w...w
w...w...w...w
wwwwwwwwwwwww
w...w..Tw...w
w...w.A.w...w
w...w...wS..w
wwwwwwwwwwwww
w...w.T.w...w
w...w...w...w
w.e.w.x.w.c.w
wwwwwwwwwwwww`,
      2: `wwwwwwwwwwwww
w..Kw...w...w
w...w...w...w
w...w.t.w...w
wwwwwwwwwwwww
w...w.c.w...w
w...w...w..Aw
w...w...w.c.w
wwwwwwwwwwwww
w...w...w..xw
w...wc..w...w
w...w...w...w
wwwwwwwwwwwww`,
      3: `wwwwwwwwwwwww
w..Pw...w...w
w...w...wc..w
w...w...w...w
wwwwwwwwwwwDw
w.c.G...w...w
wt..wT..w...w
w...wSAkwKT.w
wwwwwwwwwwwww
w...w...d...w
w...w...w..xw
we..w...wP..w
wwwwwwwwwwwww`,
    },
  },
  "avoidGeorge_vgfmri4": {
    description: `BasicGame
    SpriteSet
        floor > Immovable img=colors/LIGHTGRAY
        annoyed > RandomNPC speed=0.25 cons=2 img=colors/PURPLE
        quiet > RandomNPC speed=0.25 cons=1 img=colors/PINK
        avatar > ShootAvatar stype=cigarette  img=colors/DARKBLUE


        george > Chaser stype=quiet img=colors/YELLOW speed=0.15 frameRate=8
        cigarette > Flicker img=colors/BROWN limit=5 rotateInPlace=False singleton=True
        wall > Immovable img=colors/PURPLE


    LevelMapping
        . > floor
        g > floor george
        c > floor quiet
        A > floor avatar
        w > floor wall

    InteractionSet
        quiet george > transformTo stype=annoyed
        avatar george > changeScore scoreChange=-1
        avatar george > killSprite

        annoyed cigarette > changeScore scoreChange=1
        annoyed cigarette > transformTo stype=quiet

        annoyed wall > stepBack
        quiet wall > stepBack
        avatar wall > stepBack
        george wall > stepBack

        floor EOS > killSprite
        annoyed EOS > killSprite
        quiet EOS > killSprite
        avatar EOS > killSprite
        george EOS > killSprite
        cigarette EOS > killSprite
        wall EOS > killSprite

    TerminationSet
        SpriteCounter stype=avatar  win=False
        SpriteCounter stype=quiet   win=False
        Timeout limit=60 win=True
`,
    levels: {
      0: `wwwwwwwwwwwwwwwwwwwww
w...................w
w.......A......wwwwww
w.........w.........w
wwwww.....w.........w
w.........w.........w
w...................w
w...................w
w..............c....w
w...................w
w...................w
wwwwwwwwwwwwwwwwwwwww`,
      1: `wwwwwwwwwwwwwwwwwwwww
w....w........w.....w
w....w........w.....w
w....w........w.....w
w.................g.w
w...................w
w...................w
wwwwwww.....w.......w
w.....w.....w.......w
w.c...w.....w....A..w
w.....w.....w.......w
wwwwwwwwwwwwwwwwwwwww`,
      2: `wwwwwwwwwwwwwwwwwwwww
w.........w.........w
w...................w
w.......A...........w
www.....ww.ww.....www
w...................w
w..........c........w
w...................w
w...g...............w
w.........w.........w
w.........w.........w
wwwwwwwwwwwwwwwwwwwww`,
      3: `wwwwwwwwwwwwwwwwwwwww
w.....wwwwwww....A..w
w...................w
w...................w
w...................w
w.....wwwwwww.......w
w.....w.............w
w.....w..........c..w
w.....w.............w
w.....wwwwwww...c...w
w...................w
wwwwwwwwwwwwwwwwwwwww`,
      4: `wwwwwwwwwwwwwwwwwwwww
w.....wwwwwww....A..w
w...................w
w.......g...........w
w...................w
w.....wwwwwww.......w
w.....w.............w
w.....w.............w
w.....w.............w
w.....wwwwwww..c....w
w.................c.w
wwwwwwwwwwwwwwwwwwwww`,
      5: `wwwwwwwwwwwwwwwwwwwww
w......c............w
w...................w
w.......A.w........gw
w........www........w
w.........w.........w
w...................w
w............c......w
w...................w
w.c.................w
w...................w
wwwwwwwwwwwwwwwwwwwww`,
      6: `wwwwwwwwwwwwwwwwwwwww
wc...w.....w........w
w....w.....w........w
w....w.....w.....A..w
w...................w
w...................w
w......c............w
w...................w
w....g.......w......w
w............w......w
w............w..c...w
wwwwwwwwwwwwwwwwwwwww`,
      7: `wwwwwwwwwwwwwwwwwwwww
w.........g.........w
w...c..www........c.w
w...................w
w..A................w
w...wwwww...........w
w...................w
w....wwwww..........w
w.g.............c...w
w....wwwww..........w
w...................w
wwwwwwwwwwwwwwwwwwwww`,
      8: `wwwwwwwwwwwwwwwwwwwww
www........A.......ww
ww...c..............w
w..............c....w
w.g............wwwwww
w.........c.........w
www.................w
w..................ww
www.................w
wc..................w
w...................w
wwwwwwwwwwwwwwwwwwwww`,
    },
  },
  "bait_vgfmri3": {
    description: `BasicGame
    SpriteSet
        floor > Immovable img=colors/LIGHTGRAY
        hole > Immovable img=colors/BLUE
        avatar > MovingAvatar img=colors/DARKBLUE
        mushroom > Immovable img=colors/RED
        key > Resource img=colors/ORANGE limit=1
        goal > Immovable img=colors/GREEN
        box > Passive img=colors/BROWN
        wall > Immovable img=colors/DARKGRAY


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
        hole box > changeScore scoreChange=1
        box hole > killSprite

        avatar key > changeScore scoreChange=1
        avatar key > changeResource resource=key value=1

        key avatar > killSprite
        goal avatar > killIfOtherHasMore resource=key limit=1

        mushroom avatar > changeScore scoreChange=1
        mushroom avatar > killSprite



        floor EOS > killSprite
        hole EOS > killSprite
        avatar EOS > killSprite
        mushroom EOS > killSprite
        key EOS > killSprite
        goal EOS > killSprite
        box EOS > killSprite
        wall EOS > killSprite

    TerminationSet
        Timeout limit=150 win=False
        SpriteCounter stype=goal limit=0 win=True
        SpriteCounter stype=avatar limit=0 win=False
`,
    levels: {
      0: `wwwwwwwwwwwwwwwwwwwwwww
w.........A...........w
w.....................w
w.....g........k......w
w.....................w
w.....................w
wwwwwwwwwwwwwwwwwwwwwww`,
      1: `wwwwwwwwwwwwwwwwwwwwwww
w...A.....w......m....w
w.........w..........kw
w.....g...............w
w.........w...........w
w...m.....w......m....w
wwwwwwwwwwwwwwwwwwwwwww`,
      2: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w............................w
w...A...........w..1.........w
w...............w.........k..w
wwwwwwwwwwwww1wwwwwwwwwwwwwwww
w............................w
w..m.....w.......w...........w
w...m....w.......w...........w
w.m......w.......w.....g.....w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      3: `wwwwwwwwwwwwwwwwwwwwwww
w.....................w
w...A....k.......m....w
w.............1.......w
w.....................w
w...m.................w
w..............w00wwwww
w....1.m.......w......w
w..............w..g..mw
wwwwwwwwwwwwwwwwwwwwwww`,
      4: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w............g...............w
w............................w
w........1.....A.............w
w......................1.....w
w............0...............w
wwwwwwwwwwwww0wwwwwwwwwwwwwwww
w.......w..........w.........w
w.......w.......m..w.........w
w.......w..........w.........w
w.......w..........w.........w
w.......w..........w.........w
w.......wwwwwkwwwwww.........w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      5: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
wwwwwwwg................wwwwww
ww..........................ww
ww.............A............ww
ww...11.................1...ww
ww..........................ww
ww..........................ww
ww..........................ww
wwwwwwwww..........wwwwwwwwwww
w.......w....................w
w.....k00....................w
wwwwwwwww..........wwwwwwwwwww
ww..........................ww
ww..m.......................ww
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      6: `wwwwwwwwwwwwwwwwwwwwwwwwwwww
w......1..........w........w
w.....1g1.........w........w
w......1..........w........w
w..........................w
w..............1...........w
w.......A......1...........w
w..........................w
w...w0w...........wwwwwwwwww
w...w0w...........w........w
w...wkw...........w........w
w...www...........wwwwwwwwww
w..............m...........w
w..m.......................w
wwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      7: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w.......w..........wwww.....ww
w.......w..1.......wwww.....ww
wwwwwwwwgm.........00kw..1..ww
ww......w..........wwww.....ww
ww....1.........1...........ww
ww.......A..........1.......ww
ww11111111111111111111111111ww
ww00000000000000000000000000ww
ww00000000000000000000000000ww
ww..........................ww
ww..........................ww
ww............k.............ww
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      8: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
wwwwwwwww..........wwwwwwwwwww
wwwwwwwww..........wwwwwwwwwww
wwwwwwwwg...........0kwwwwwwww
wwwwwwwww..........ww0wwwwwwww
ww..........................ww
ww................1.........ww
ww.......A..................ww
wwwwwwwww..........wwwwwwwwwww
wwwwwwwww..........wwwwwwwwwww
ww.........................mww
ww..........................ww
ww......1...................ww
ww..........................ww
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      9: `wwwwwwwwwwwwwwwww
w.....wgw.......w
wwwwww...wwwwwwww
w.....w.A.w.....w
w...............w
w..1.........1..w
w...............w
w...............w
wwwwwww.0.wwwwwww
w......w0w......w
w......wkw......w
wwwwwwwwwwwwwwwww`,
      10: `wwwwwwwwwwwwwwwwwww
w......wwwww......w
w..1...wwwww...1..w
w......00.00......w
w..w.1.00k00.1.w..w
w..w...00000...w..w
w..1...00m00...1..w
w..w...ww1ww...w..w
w.................w
w.................w
w..wwwwww1wwwwww..w
w........Ag.......w
w.................w
wwwwwwwwwwwwwwwwwww`,
      11: `wwwwwwwwwwwww
w...wkw.....w
w...w000....w
w...w0m01...w
w....0111...w
w.....1A1...w
w....01.1...w
w..1........w
w...........w
w....wwwg...w
wwwwwwwwwwwww`,
    },
  },
  "bait_vgfmri4": {
    description: `BasicGame
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



        floor EOS > killSprite
        hole EOS > killSprite
        avatar EOS > killSprite
        mushroom EOS > killSprite
        key EOS > killSprite
        goal EOS > killSprite
        box EOS > killSprite
        wall EOS > killSprite

    TerminationSet
        SpriteCounter stype=goal limit=0 win=True
        SpriteCounter stype=avatar limit=0 win=False
`,
    levels: {
      0: `wwwwwwwwwwwwwwwwwwwww
w.......A...........w
w...................w
w..............k....w
w...................w
w...................w
w...................w
w...................w
w...................w
w..g................w
w...................w
wwwwwwwwwwwwwwwwwwwww`,
      1: `wwwwwwwwwwwwwwwwwwwww
w...A...m...........w
w...................w
w...............g...w
w...................w
w...................w
w...................w
w...................w
w..m................w
w............k......w
w...................w
wwwwwwwwwwwwwwwwwwwww`,
      2: `wwwwwwwwwwwwwwwwwwwww
w............w......w
w...A........w.....ww
w............w....1gw
w............w.....ww
w............w......w
w............w......w
w...................w
w...................w
w..k................w
w...................w
wwwwwwwwwwwwwwwwwwwww`,
      3: `wwwwwwwwwwwwwwwwwwwww
w.........k.........w
w...A.........1.....w
w...................w
w.......1...........w
w...................w
wwwwwwwwww0wwwwwwwwww
w...................w
w...................w
w..g.......mmmmmmm..w
w...................w
wwwwwwwwwwwwwwwwwwwww`,
      4: `wwwwwwwwwwwwwwwwwwwww
w..............A....w
w............1......w
w.................m.w
w.......g.........m.w
w...1...............w
w...........m.......w
wwwwwwwwwwwwww00wwwww
w...................w
w.............k.....w
w...................w
wwwwwwwwwwwwwwwwwwwww`,
      5: `wwwwwwwwwwwwwwwwwwwww
w...................w
w...................w
w......1...wwwwwwwwww
w.........m0......g.w
wk........m0........w
w....A....m0........w
w.1....1...wwwwwwwwww
w...................w
w...................w
w...................w
wwwwwwwwwwwwwwwwwwwww`,
      6: `wwwwwwwwwwwwwwwwwwwww
w.............1.....w
w........1...1g1....w
w.......1.....1.....w
w...A...............w
w........w..........w
w...w0w..w....w0000ww
w...w0w..w....wmmmmww
w...wkw..w....wmmmmww
w...www..w....wmmmmww
w.............wwwwwww
wwwwwwwwwwwwwwwwwwwww`,
      7: `wwwwwwwwwwwwwwwwwwwww
w..........ww.......w
w..........ww.......w
w.0m....mmmww.......w
wwg0m...w00kw.......w
w.0m....wwwww.......w
w.......1...1.......w
w1...1...A..........w
w..............wwwwww
w..1...........w....w
w..............w..k.w
wwwwwwwwwwwwwwwwwwwww`,
      8: `wwwwwwwwwww.wwwwwwwww
w.....k...w.......g.w
w.........w.........w
w.........w..1.wwwwww
wwwwww00www....wmmmmw
w.........1....wmmmmw
w.......A......0mmmmw
w....1......wwwwwwwww
w........1..0.......w
w.g.........0....k..w
w.....1.....wwwwwwwww
wwwwwwwwwwwwwwwwwwwww`,
    },
  },
  "chase_vgfmri3": {
    description: `BasicGame
    SpriteSet
        floor > Immovable img=colors/LIGHTGRAY
        carcass > Immovable img=colors/BROWN
        goat > stype=avatar
            angry  > Chaser cooldown=8 img=colors/GOLD
            scared > Fleeing cooldown=3 img=colors/RED
        avatar > MovingAvatar img=colors/DARKBLUE
        wall > Immovable img=colors/DARKGRAY


    LevelMapping
        . > floor
        A > floor avatar
        0 > floor scared
        1 > floor angry
        w > floor wall

    InteractionSet
        angry   wall   > stepBack
        scared   wall   > stepBack
        avatar wall    > stepBack
        avatar angry > changeScore scoreChange=-1
        avatar  angry  > killSprite
        scared avatar > changeScore scoreChange=1
        scared avatar  > transformTo stype=carcass
        scared carcass > transformTo stype=angry
        carcass angry > killSprite


        floor EOS > killSprite
        carcass EOS > killSprite
        goat EOS > killSprite
        angry EOS > killSprite
        scared EOS > killSprite
        avatar EOS > killSprite
        wall EOS > killSprite

    TerminationSet
        Timeout limit=150 win=False
        SpriteCounter stype=scared win=True
        SpriteCounter stype=avatar win=False
`,
    levels: {
      0: `wwwwwwwwwww
w.........w
wA........w
w.........w
w....0....w
w.........w
wwwwwwwwwww`,
      1: `wwwwwwwwwww
w..0......w
w....w....w
w..www..A.w
w....w....w
w.....0...w
wwwwwwwwwww`,
      2: `wwwwwwwwwwwwwwwwwwwwwwwww
w.......................w
w.........0.....w.......w
w......wwwwwwwwww.......w
w........w......www.....w
w..........A............w
w.....ww......w....w....w
w.....ww...wwww....w0...w
w.....ww................w
wwww...0..........wwwwwww
w.......................w
wwwwwwwwwwwwwwwwwwwwwwwww`,
      3: `wwwwwwwwwwwwwwwwwwwwwwwwwww
w...........w.............w
w...w1......w..w...w......w
w......wwwwww..w...w......w
w...w..wwwwww..0...www....w
w...........w......www....w
wwww......0......A........w
w.....ww...wwwwww....w....w
w.....ww...ww.....w..w0...w
w.....w...................w
wwwwwwwwwwwwwwwwwwwwwwwwwww`,
      4: `wwwwwwwwwwwwwwwwwwwwwwwwwww
w.......0...w.......0.....w
w...w.......w..0..........w
w......wwwwww......w......w
w...w..wwwwww......www....w
w...........w......www....w
wwww.....0.......A........w
w..0..ww...wwwwww....w....w
w.....ww...ww.....w..w0...w
w.....w....0..............w
wwwwwwwwwwwwwwwwwwwwwwwwwww`,
      5: `wwwwwwwwwwwwwwwwwwwwwwww
wAww..........0..... ..w
w.ww..wwwwww.......www.w
w.ww..... ....ww...w.0.w
w.....w.......ww...w0..w
w..0..w...wwwwww...0...w
w.....w0.....0.... ..www
w.0...wwwwwww.....0....w
w.ww..w..0..w...wwww...w
w.......0.....0........w
wwwwwwwwwwwwwwwwwwwwwwww`,
      6: `wwwwwwwwwwwwwwwwwwwwwwww
w.....0................w
w..0...w. ....w.0......w
w...w.......0.ww.......w
w.....w........0...w...w
w.0..0.....0w..........w
w.....w....w...w..w....w
w.......w..0....w......w
w...w.....w..0..w..0...w
w......0......A........w
wwwwwwwwwwwwwwwwwwwwwwww`,
      7: `wwwwwwwwwwwwwwwwwwwwwwww
ww....w......0.....0000w
ww..w.w....w.wwwwwwwww.w
ww..0..ww....... ......w
ww.w...........0.......w
w .......ww.......0....w
w.0.0..ww...0........0.w
w.. .....000...0.0.....w
w......ww..0..0........w
w...A...0......wwwwwww.w
wwwwwwwwwwwwwwwwwwwwwwww`,
      8: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w....ww....0.................w
w....ww......................w
wA...ww............wwwwww....w
w.........www....0...www.....w
w............................w
wwww....0..............0.....w
w...........wwwwwww..........w
w...1.....................1..w
w..........0...........ww....w
w.....wwwwww...........ww....w
wwww.......w......0....wwwwwww
w......1...w.................w
w..........w.................w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      9: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w.....w......................w
w.....w.....0................w
w.....w............wwwwww....w
w.........www........www.....w
w............................w
wwww..............www........w
w.......0......wwww....A.....w
w.0..........................w
w.....wwwwww...........ww....w
w...0.wwwwww...........ww....w
w..........w...0.......wwwwwww
w..........w.................w
w..........w.................w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      10: `wwwwwwwwwwwwwwwwwwwwwwww
w.0.w..0........w..0...w
w...w....ww.....w..wwwww
w...w.ww..w...0.0......w
w...w.0...w..wwwwwww...w
w.0wwwwwwww..0....w....w
w.............0...w...ww
w.ww...ww0...wwwwww.00.w
wA...wwwwww..0....w....w
www....0......w..0..wwww
wwwwwwwwwwwwwwwwwwwwwwww`,
      11: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w............................w
w.....w.0..........w.........w
w.....w........0...wwwwww....w
w.....w...www......w.........w
w.....w......................w
wwwwwww....A...wwwwww....0...w
w..............wwwwww........w
w..............0.............w
w........0..........wwwww0...w
w...0.wwwwwww....www...ww....w
w..0.......ww...0w.....wwwwwww
w..........ww................w
w..........ww................w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
    },
  },
  "chase_vgfmri4": {
    description: `BasicGame
    SpriteSet
        floor > Immovable img=colors/LIGHTGRAY
        carcass > Immovable img=colors/BLACK
        goat > stype=avatar
            angry  > Chaser cooldown=8 img=colors/GOLD
            scared > Fleeing cooldown=3 img=colors/RED
        avatar > MovingAvatar img=colors/DARKBLUE
        wall > Immovable img=colors/BROWN


    LevelMapping
        . > floor
        A > floor avatar
        0 > floor scared
        1 > floor angry
        w > floor wall

    InteractionSet
        angry   wall   > stepBack
        scared   wall   > stepBack
        avatar wall    > stepBack
        avatar angry > changeScore scoreChange=-1
        avatar  angry  > killSprite
        scared avatar > changeScore scoreChange=1
        scared avatar  > transformTo stype=carcass
        scared carcass > transformTo stype=angry
        carcass angry > killSprite


        floor EOS > killSprite
        carcass EOS > killSprite
        goat EOS > killSprite
        angry EOS > killSprite
        scared EOS > killSprite
        avatar EOS > killSprite
        wall EOS > killSprite

    TerminationSet
        SpriteCounter stype=scared win=True
        SpriteCounter stype=avatar win=False
`,
    levels: {
      0: `wwwwwwwwwwwwwwwwwwwww
w...................w
w...................w
w..............A....w
w...................w
w..........0........w
w...................w
w...................w
w...................w
w...................w
w...................w
wwwwwwwwwwwwwwwwwwwww`,
      1: `wwwwwwwwwwwwwwwwwwwww
w...................w
w..0................w
w.........w.........w
w.........w.........w
w.........w.........w
w...wwwwwwwwwwww....w
w.........w.........w
w.........w......A..w
w.........w.........w
w.........0.........w
wwwwwwwwwwwwwwwwwwwww`,
      2: `wwwwwwwwwwwwwwwwwwwww
w...................w
w.....wwwwwwwww.....w
w.....w...0...w.....w
w.....w.......w.....w
w.....w....A..w.....w
w.....w.......w.....w
wwwwwww.......w.....w
w.....w.......w.....w
w.....w.....0.w.....w
wwww..w0......w...www
wwwwwwwwwwwwwwwwwwwww`,
      3: `wwwwwwwwwwwwwwwwwwwww
w...w0......w.......w
w...w..www..w.......w
w...w..www..w0......w
w...w......0w....0..w
w...w...............w
wwwww0..A...........w
w...................w
w......wwww.0.w.....w
w...0..w...0..w0....w
w......w......w.....w
wwwwwwwwwwwwwwwwwwwww`,
      4: `wwwwwwwwwwwwwwwwwwwww
w...w...0...........w
w...w...............w
w...w..wwwwww....0..w
w...w..wwwwww.......w
w....0..............w
wwww.........A..wwwww
w.......0...........w
w..1.......wwww.....w
w..........ww..0.0..w
w...........w.......w
wwwwwwwwwwwwwwwwwwwww`,
      5: `wwwwwwwwwwwwwwwwwwwww
wAwww..........0....w
w...................w
w......w...wwwwwww..w
w..0...w...ww....w..w
w......w0........wwww
w.0....wwwww........w
wwww...w.....w......w
w......w.....w......w
w..1.........w..0...w
w........0...w......w
wwwwwwwwwwwwwwwwwwwww`,
      6: `wwwwwwwwwwwwwwwwwwwww
w.....0......0.w....w
w..0...wwwwwwwww.0..w
w......w............w
w......w.0..........w
w.0.......A.0www....w
www.....0......wwwwww
w.....w........w....w
w...wwwwwww.0..w....w
w..0w.....w...0...0.w
w...w.....w.........w
wwwwwwwwwwwwwwwwwwwww`,
      7: `wwwwwwwwwwwwwwwwwwwww
ww...........0..0..0w
wwwwwwww......wwwwwww
ww..1..ww...........w
w.......w...........w
w..........Awwww....w
wwww........w..w..1.w
w.0....www..w.0wwwwww
w...........w..w..0.w
w..............0..0.w
w.......0.........www
wwwwwwwwwwwwwwwwwwwww`,
      8: `wwwwwwwwwwwwwwwwwwwww
w....ww.............w
w....ww.......wwww..w
w.........0......w..w
wwww....0......0....w
w.........A.........w
w..............wwwwww
w.0..............1..w
w........wwwwww.....w
wwww..........w..0..w
w.........1...w.....w
wwwwwwwwwwwwwwwwwwwww`,
    },
  },
  "helper_vgfmri3": {
    description: `BasicGame frame_rate=30
    SpriteSet
        floor > Immovable img=colors/LIGHTGRAY
        avatar > MovingAvatar img=colors/DARKBLUE cooldown=0
        mover > VGDLSprite
            chaser > Chaser
                chaser1 > stype=box1 img=colors/ORANGE  cooldown=12
                chaser2 > stype=box3 img=colors/LIGHTBLUE cooldown=12
        wall > Immovable img=colors/BLACK
        forcefield > Passive img=colors/PURPLE
        box > Passive
            box1 > img=colors/WHITE
            box2 > img=colors/GREEN
            box3 > img=colors/YELLOW

    LevelMapping
        . > floor
        A > floor avatar
        w > floor wall
        a > floor box1
        b > floor box2
        c > floor box3
        f > floor forcefield
        x > floor chaser1
        z > floor chaser2
        z > floor chaser2

    InteractionSet
        avatar wall > stepBack
        box wall > stepBack
        box3 avatar > bounceForward
        box1 avatar > bounceForward
        box1 box2 > stepBack
        box1 box1 > stepBack
        box2 avatar > killSprite
        box1 chaser > killSprite
        box3 chaser > killSprite
        chaser forcefield > stepBack
        chaser wall > stepBack
        chaser box2 > stepBack

        floor EOS > killSprite
        avatar EOS > killSprite
        mover EOS > killSprite
        chaser EOS > killSprite
        chaser1 EOS > killSprite
        chaser2 EOS > killSprite
        wall EOS > killSprite
        forcefield EOS > killSprite
        box EOS > killSprite
        box1 EOS > killSprite
        box2 EOS > killSprite
        box3 EOS > killSprite

    TerminationSet
        Timeout limit=150 win=False
        SpriteCounter stype=avatar  limit=0 win=False
        SpriteCounter stype=box1 limit=0 win=True
`,
    levels: {
      0: `wwwwwwwwwwwwwwwwww
w........a.......w
w......w.........w
w......w.........w
w..x...w......a..w
w......w.........w
w......www.......w
w..A.............w
www...x..........w
wwwwwwwwwwwwwwwwww`,
      1: `wwwwwwwwwwwwwwwwwwwww
w.x.................w
w...a.....a.........w
w............a......w
w...................w
w...b..........a....w
w........a..........w
w..A..b..........b..w
wwwx................w
wwwwwwwwwwwwwwwwwwwww`,
      2: `wwwwwwwwwwwwwwwww
w...............w
w.b.............w
w.......fffff...w
w..b..a.f.x.f...w
w.......f..xf...w
w..A....fffff...w
w.........a.....w
www..........b..w
wwwwwwwwwwwwwwwww`,
      3: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w............................w
w............................w
w...faaf.....................w
w...ffff...........a...bb....w
w............................w
w..............a.............w
w..x.........................w
w..........b.................w
w...................a........w
w..A.....a.....b.............w
w............................w
www.................x........w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      4: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w.........................x..w
w............................w
w.............b..............w
w................cccccc......w
w................c..a.c......w
w..b........m....c....c......w
w..............A.cccccc......w
w...fffff....................w
w...fx.xf....................w
w...f...f...bbb..............w
w...fffff...bab...b......b...w
w...........bbb..............w
www..........................w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      5: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w...........bba.b............w
w........a..fbbbb............w
w..........afff..............w
w............................w
w..x.........................w
w.......................a.bbbw
w..z.......ccccc..........ba.w
w...................a.....b..w
w............................w
w..A...w.......b........ff...w
www....w............x........w
w............................w
w.........z..................w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      6: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w............................w
w............................w
w...faa.......af.............w
w...ffff.....fff.......bb....w
w.........c...............z..w
w..............a.............w
w..x.............c...........w
w..........b.................w
w................c..a........w
w..A.....a.....b.............w
w............................w
w............................w
www........z........x........w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      7: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w............z...............w
w............................w
w......fa.a..................w
w......ffff............bb....w
w................a.a.........w
w..............a.fff.........w
w..x.........................w
w..........b..............z..w
w...................a........w
w..A.....a.....b.............w
w.....................x......w
w............................w
www.....c........c...........w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      8: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w............................w
w........b...................w
w..................a.........w
w............................w
w............................w
w..b........m................w
w..............A.............w
w....fffff...................w
w...fx.x..f..................w
w...f.....f..................w
w....fffff....a...b......b...w
w...........................ww
w...........................ww
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      9: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w............................w
w........b...................w
w..................a.........w
w..................fffff.....w
w.................fx....f....w
w..b........m.....f..x..f....w
w..............A...fffff.....w
w............................w
w............................w
w........w...................w
w......w......a...b......b...w
w............................w
w............................w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      10: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w............................w
w...........fba.bf...........w
w........a..fbbbbf...........w
w..........a..ff.............w
w..x.........................w
w.......................a....w
wbbb.........................w
w.a.b................a.......w
w...b........................w
w..A...w.......b........ff...w
www....w............x........w
w..........c.................w
w................z...........w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      11: `wwwwwwwwwwwwwwwww
w......x........w
w...............w
wbbb.........bbbw
w...............w
w...............w
w......A........w
w...............w
w....ccccc......w
w...............w
w...............w
w....z.z.z......w
wfffffffffffffffw
w.....a.....a...w
w...............w
w...............w
wwwwwwwwwwwwwwwww`,
    },
  },
  "helper_vgfmri4": {
    description: `BasicGame frame_rate=30
    SpriteSet
        floor > Immovable img=colors/LIGHTGRAY
        avatar > MovingAvatar img=colors/DARKBLUE cooldown=0
        mover > VGDLSprite
            chaser > Chaser
                chaser1 > stype=box1 img=colors/ORANGE  cooldown=12
                chaser2 > stype=box3 img=colors/LIGHTBLUE cooldown=12
        wall > Immovable img=colors/BLACK
        forcefield > Passive img=colors/PURPLE
        box > Passive
            box1 > img=colors/WHITE
            box2 > img=colors/GREEN
            box3 > img=colors/YELLOW

    LevelMapping
        . > floor
        A > floor avatar
        w > floor wall
        a > floor box1
        b > floor box2
        c > floor box3
        f > floor forcefield
        x > floor chaser1
        z > floor chaser2
        z > floor chaser2

    InteractionSet
        avatar wall > stepBack
        box wall > stepBack
        box3 avatar > bounceForward
        box1 avatar > bounceForward
        box1 box2 > stepBack
        box1 box1 > stepBack
        box2 avatar > killSprite
        box2 avatar > changeScore scoreChange=1
        box1 chaser > killSprite
        box3 chaser > changeScore scoreChange=1
        box3 chaser > killSprite
        chaser forcefield > stepBack
        chaser wall > stepBack
        chaser box2 > stepBack

        floor EOS > killSprite
        avatar EOS > killSprite
        mover EOS > killSprite
        chaser EOS > killSprite
        chaser1 EOS > killSprite
        chaser2 EOS > killSprite
        wall EOS > killSprite
        forcefield EOS > killSprite
        box EOS > killSprite
        box1 EOS > killSprite
        box2 EOS > killSprite
        box3 EOS > killSprite

    TerminationSet
        SpriteCounter stype=avatar  limit=0 win=False
        SpriteCounter stype=box1 limit=0 win=True
        Timeout limit=150 win=False`,
    levels: {
      0: `wwwwwwwwwwwwwwwwwwwww
w...........a.......w
w...................w
w.........w.........w
w.........w.........w
w..x......w......a..w
w.........w.........w
w.........www.......w
w...................w
w..A................w
www......x..........w
wwwwwwwwwwwwwwwwwwwww`,
      1: `wwwwwwwwwwwwwwwwwwwww
w.x.................w
w...a.....a.......A.w
w............a......w
w...................w
w...................w
w...b..........a....w
w...................w
w........a..........w
w.....b..........b..w
wwwx................w
wwwwwwwwwwwwwwwwwwwww`,
      2: `wwwwwwwwwwwwwwwwwwwww
w.......A...........w
w...................w
w.b.................w
w.......fffff.......w
w..b..a.f.x.f.......w
w.......f..xf.......w
w.......fffff...a...w
w...................w
w............b......w
www.................w
wwwwwwwwwwwwwwwwwwwww`,
      3: `wwwwwwwwwwwwwwwwwwwww
w...a...............w
w.......w.a.w.b.....w
w.......w...w.......w
w.......w.a.w.......w
w..x....w...w....a..w
w.b.....f...f.......w
w.......wwwww.......w
w...................w
w..A.a.........b....w
www........x........w
wwwwwwwwwwwwwwwwwwwww`,
      4: `wwwwwwwwwwwwwwwwwwwww
w............w......w
w...b.a..a...w......w
w............w.....xw
w............w......w
wwwwwwwwwccwww......w
w.......w...........w
w.......w....bbbbb..w
w.......w....b...b..w
w.......w....b..Ab..w
www..x..w....bbbbb..w
wwwwwwwwwwwwwwwwwwwww`,
      5: `wwwwwwwwwwwwwwwwwwwww
w........fffffff....w
w....A...fbbbbbf....w
w........fb.a.bf....w
w........fbbbbbf....w
w..x.....fffffff....w
w..............a....w
w..z............ccccw
wbbbbbbb........c...w
w......b...x....c.a.w
w..a...b.z......c...w
wwwwwwwwwwwwwwwwwwwww`,
      6: `wwwwwwwwwwwwwwwwwwwww
w.......x....b..a.ccw
w............b..a...w
w............b..aaaaw
w............bbbbbbbw
w..........A........w
wbbbbbbbb...........w
w.......b...........w
wcccccc.b...........w
w.....c.b.....z.....w
w.aa..c.b...........w
wwwwwwwwwwwwwwwwwwwww`,
      7: `wwwwwwwwwwwwwwwwwwwww
w...w.......ffcb..bbw
w...w.z.....wwcba.bbw
w.c.f.......wwcba.bbw
w...f.......wwcba.bbw
w...w..A....wwcb..bbw
w...w.......wwcw..bbw
w...........cccw..bbw
wbbb........cccwwwwww
w..b........wwww....w
w.ab...x......w.....w
wwwwwwwwwwwwwwwwwwwww`,
      8: `wwwwwwwwwwwwwwwwwwwww
w.....a..b.....c....w
wz.wbwwwwwwwwwwwbw..w
w..w.....z.......b..w
w..w.bbbwwwwwfww.w..w
wffw.b.........b.wccw
w..w.w....x....b.w..w
w..w.w..wwwwwwww.w..w
w.Aw.b.....c..b..b..w
w..w.bbwwwfwwwwwbw..w
w..f...b...c.....a..w
wwwwwwwwwwwwwwwwwwwww`,
    },
  },
  "lemmings_vgfmri3": {
    description: `BasicGame
    SpriteSet
        floor > Immovable img=colors/LIGHTGRAY
        hole   > Immovable img=colors/LIGHTBLUE
        shovel > Flicker img=colors/BROWN limit=1 singleton=True

        entrance > SpawnPoint total=6 cooldown=35 stype=lemming img=colors/PURPLE
        goal > Immovable img=colors/GREEN

        avatar  > ShootAvatar stype=shovel img=colors/DARKBLUE
        lemming > Chaser  stype=goal speed=1 cooldown=5 img=colors/RED
        wall > Immovable img=colors/GRAY

    LevelMapping
        . > floor
        x > floor goal
        e > floor entrance
        h > floor hole
        A > floor avatar
        w > floor wall

    InteractionSet
        avatar hole  > killSprite
        avatar hole > changeScore scoreChange=-5
        lemming hole  > killSprite
        lemming hole > changeScore scoreChange=-2

        avatar wall > stepBack
        lemming wall > stepBack
        avatar EOS > stepBack
        lemming EOS > stepBack
        wall shovel  > killSprite
        lemming goal > killSprite
        lemming goal > changeScore scoreChange=2


        floor EOS > killSprite
        hole EOS > killSprite
        shovel EOS > killSprite
        entrance EOS > killSprite
        goal EOS > killSprite
        avatar EOS > killSprite
        lemming EOS > killSprite
        wall EOS > killSprite

    TerminationSet
        Timeout limit=150 win=False
        SpriteCounter  stype=avatar  limit=0 win=False
        MultiSpriteCounter stype1=entrance stype2=lemming limit=0 win=True
`,
    levels: {
      0: `wwwwwwwwwwwwwwwwwwwwwww
w..x................www
w..w..................w
w.......A............ew
wwwwwwwwwwwwwwwwwwwwwww`,
      1: `wwwwwwwwwwwwwwwwwwwwwww
w..x................www
w..w........wwwww.....w
w.......A.......w....ew
wwwwwwwwwwwwwwwwwwwwwww`,
      2: `wwwwwwwwwwwwwwwwwwwwwww
w..x...ww.w....w....www
w..www..w...w..w.w....w
w.......A........w...ew
wwwwwwwwwwwwwwwwwwwwwww`,
      3: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w......ww...wwwww............w
w......ww...wwwww........ww..w
w......ww...wwwww......ww....w
w.x....ww...www........ww....w
w....wwww....ww..............w
w..wwww.......www............w
w..ww.........www............w
w.............www............w
w......www....www............w
w.......ww......www..........w
w.......ww......www..........w
w..w....ww......www..........w
w.......A...............e....w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      4: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w......ww...wwwww............w
w......ww...wwwww......hhww..w
w......ww...wwwww......wwx...w
w......ww...www........ww....w
w..hhwwww...www..............w
w..wwww.....wwwwh............w
w..ww.......wwwwh............w
w.............wwh............w
w......www....wwh............w
w......wwh......wwwh.........w
w......wwh......wwwh.........w
w..w...wwh......wwwh.........w
w..e....A....................w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      5: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w................................w
w.........whh........wwww...x....w
w........wwww........whww........w
w.........www........wwww........w
w.........ww.....A.....wh........w
w........wwwh..........wwh.......w
w.........www...www...wwww.......w
w.......e..www........wwww.......w
w................................w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      6: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w............ww..wwwwww...........w
w............ww.hhh..hw.w.........w
w.......x....w..wwwwww...ww.......w
w.......whw..w.wwwwww.w...........w
w.......ww.....wwwwwhww...........w
w.......ww...hwwwwwwwww...........w
w............hw..w..ww............w
w.......w....hw....wwww...........w
w.......A................e........w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      7: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w......ww...wwwww............w
w...e..ww...wwwww............w
w......ww....................w
w......ww...wwwhh.....wwww...w
w..hhwwww......ww.....wwww...w
w..wwww........ww............w
w..ww.......wwwww............w
w.............hhh............w
w.............hhh............w
w......wwh......wwwh.........w
w......wwh......wwwh.....ww..w
w......wwh......w........wx..w
w.......A....................w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      8: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w..................................w
w......................e...........w
w........wwwwwwwwwwwwwwww..........w
w........wwwwwwwwhhwwwwwwwwwwwwwwwww
w........wwhhhwwwwwwwwhww..........w
wwwwwwwwwwwwwwwwwhhwwwwww..........w
w........wwwwwwwwwwwwwhww..........w
w.........x............A...........w
w..................................w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      9: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w......ww...wwwww............w
w......ww...wwwww........e...w
w......ww....................w
w......ww.....www.......ww...w
w..hhwwww....hwww.......ww...w
w..wwww......hwww............w
w..ww........hwww............w
w.............www........w...w
w.............www........w...w
w......hhw......www......w...w
w......www......www......w...w
w...x..www......www......w...w
w.......A....................w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      10: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w...............w.......wh........w
w..e.....wwwwwwww.......wwww......w
w........whhhhhhh.........w.......w
w........w........................w
wwwwwwwwww......wwwwwwwwwwwwwwwwwww
w...............whw.....whw.......w
w.........w.w...whw.....whw.......w
w.......A...w...whw.....whw.......w
w...........w...www.....wwx.......w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      11: `wwwwwwwwwwwwwwwwwwwww
w....x.ww.wwwwww....w
w.....hwwwww.wwww...w
w..w..wwwwwwwww..ww.w
w..wwww.wwwwww.w....w
w..ww.hhwwwwwhww....w
w..ww.wwwwwwwwww....w
w.....wwhhw..ww.....w
w....wwwwww.wwww....w
w..A.............e..w
wwwwwwwwwwwwwwwwwwwww`,
    },
  },
  "lemmings_vgfmri4": {
    description: `BasicGame
    SpriteSet
        floor > Immovable img=colors/LIGHTGRAY
        hole   > Immovable img=colors/LIGHTBLUE
        shovel > Flicker img=colors/BROWN limit=1 singleton=True

        entrance > SpawnPoint total=4 cooldown=35 stype=lemming img=colors/PURPLE
        goal > Immovable img=colors/GREEN

        avatar  > ShootAvatar stype=shovel img=colors/DARKBLUE
        lemming > Chaser  stype=goal speed=1 cooldown=5 img=colors/RED
        wall > Immovable img=colors/GRAY

    LevelMapping
        . > floor
        x > floor goal
        e > floor entrance
        h > floor hole
        A > floor avatar
        w > floor wall

    InteractionSet
        avatar hole  > killSprite
        avatar hole > changeScore scoreChange=-5
        lemming hole  > killSprite
        lemming hole > changeScore scoreChange=-2

        avatar wall > stepBack
        lemming wall > stepBack
        avatar EOS > stepBack
        lemming EOS > stepBack
        wall shovel  > killSprite
        lemming goal > killSprite
        lemming goal > changeScore scoreChange=2


        floor EOS > killSprite
        hole EOS > killSprite
        shovel EOS > killSprite
        entrance EOS > killSprite
        goal EOS > killSprite
        avatar EOS > killSprite
        lemming EOS > killSprite
        wall EOS > killSprite

    TerminationSet
        SpriteCounter  stype=avatar  limit=0 win=False
        MultiSpriteCounter stype1=entrance stype2=lemming limit=0 win=True
        Timeout limit=150 win=False
`,
    levels: {
      0: `wwwwwwwwwwwwwwwwwwwww
w...................w
w..x................w
w...................w
w...................w
w...................w
w...................w
w...................w
w...................w
w................e..w
w.......A...........w
wwwwwwwwwwwwwwwwwwwww`,
      1: `wwwwwwwwwwwwwwwwwwwww
w......w............w
w..x...w............w
w......w............w
w......w............w
w......wwwwwwwwwwwwww
w...................w
w...................w
w...................w
w...................w
w.......A..........ew
wwwwwwwwwwwwwwwwwwwww`,
      2: `wwwwwwwwwwwwwwwwwwwww
w...................w
w..x................w
w...................w
w...................w
wwwwwwwwwwwwwwwwwwwww
w...................w
w...................w
w...................w
w................e..w
w.......A...........w
wwwwwwwwwwwwwwwwwwwww`,
      3: `wwwwwwwwwwwwwwwwwwwww
w...................w
w...............e...w
w...................w
w..wwwwwwww.......www
w..wwwwwwwwwwwwwwwwww
w.......A...........w
w...................w
w.....wwwwww........w
w.....w....w........w
w.....w.x..w........w
wwwwwwwwwwwwwwwwwwwww`,
      4: `wwwwwwwwwwwwwwwwwwwww
w......ww...www..hh.w
w......ww...w.......w
w......ww...w.......w
w.x....ww...ww......w
w.....www....ww.....w
w..wwww.......ww....w
w..ww.........w.....w
w..w..........www...w
w..w................w
w.......A..........ew
wwwwwwwwwwwwwwwwwwwww`,
      5: `wwwwwwwwwwwwwwwwwwwww
w...................w
w....hh.....ww...x..w
w....ww.....whh.....w
w.....w.....www.....w
w.....w..A....wh....w
w...wwh.......wh....w
w...w.........w.....w
w..........wwww.....w
w...................w
we..................w
wwwwwwwwwwwwwwwwwwwww`,
      6: `wwwwwwwwwwwwwwwwwwwww
w......ww...w.hhww..w
w......ww...ww....x.w
w......ww...ww......w
w..hhwwww...ww......w
w..wwww.....wwwwh...w
w..ww.........wwh...w
w.............wwh...w
w......wwh......wwwhw
w..w...wwh.........hw
w..e....A...........w
wwwwwwwwwwwwwwwwwwwww`,
      7: `wwwwwwwwwwwwwwwwwwwww
w...hw..............w
w...hw..............w
w...hw....wwwwwwwwwww
wA..hw....wwhhhhhhhhw
w...hw....wwhhhhhhhhw
w...hw....wwhh......w
wwwwww....wwhh......w
w.........ww......x.w
w.........wwhh......w
w.e.......wwhh......w
wwwwwwwwwwwwwwwwwwwww`,
      8: `wwwwwwwwwwwwwwwwwwwww
whhh...........e....w
w..............wwwwww
w........ww....whhhhw
w...wwwwwwwwwwwwhhhhw
w.wwwwhhwwhhh..whhhhw
wwwwwwhhwwwww..wwwwww
w...wwwwwwwww.....A.w
w....whhhhwwww......w
w....whhhhww........w
w.x..whhhhww........w
wwwwwwwwwwwwwwwwwwwww`,
    },
  },
  "plaqueAttack_vgfmri3": {
    description: `BasicGame
  SpriteSet
    floor > Immovable img=colors/LIGHTGRAY

    fullMolarInf > Immovable img=colors/YELLOW
    fullMolarSup > Immovable img=colors/RED
    deadMolarInf > Immovable img=colors/GREEN
    deadMolarSup > Immovable img=colors/BLUE

    avatar  > ShootAvatar stype=fluor img=colors/DARKBLUE frameRate=8 speed=1
    hotdoghole > SpawnPoint stype=hotdog  prob=0.15 cooldown=10 total=5 img=colors/PURPLE
    burgerhole > SpawnPoint stype=burger  prob=0.18 cooldown=10 total=5 img=colors/LIGHTBLUE
    burger > Chaser speed=1 cooldown=10 stype=fullMolarSup img=colors/BROWN fleeing=False
    hotdog > Chaser speed=1 cooldown=10 stype=fullMolarInf img=colors/ORANGE fleeing=False

    fluor > Missile img=colors/LIGHTRED speed=1
    wall > Immovable img=colors/GRAY

  LevelMapping
    h > hotdog floor
    d > hotdoghole floor
    b > burger floor
    v > burgerhole floor
    n > fullMolarSup floor
    m > fullMolarInf floor
    . > floor
    A > avatar floor
    w > floor wall
    p > floor deadMolarInf

  InteractionSet
    avatar wall > stepBack
    hotdog wall > stepBack
    burger wall > stepBack

    fluor hotdog > killSprite
    hotdog fluor > killSprite scoreChange=1
    fluor burger > killSprite
    burger fluor > killSprite scoreChange=1

    fluor wall   > killSprite


    fullMolarInf hotdog > transformTo stype=deadMolarInf scoreChange=-1
    hotdog deadMolarInf > killSprite
    fullMolarInf burger > transformTo stype=deadMolarInf scoreChange=-1
    burger deadMolarInf > killSprite
    deadMolarInf avatar > transformTo stype=fullMolarInf scoreChange=1


    fullMolarSup hotdog > transformTo stype=deadMolarSup
    hotdog deadMolarSup > killSprite  scoreChange=-1
    fullMolarSup burger > transformTo stype=deadMolarSup
    burger deadMolarSup > killSprite scoreChange=-1
    deadMolarSup avatar > transformTo stype=fullMolarSup scoreChange=1

    avatar EOS > killSprite
    burger EOS > killSprite
    burgerhole EOS > killSprite
    deadMolarInf EOS > killSprite
    deadMolarSup EOS > killSprite
    fluor EOS > killSprite
    fullMolarInf EOS > killSprite
    fullMolarSup EOS > killSprite
    hotdog EOS > killSprite
    hotdoghole EOS > killSprite
    wall EOS > killSprite


  TerminationSet
    Timeout limit=3000 win=False
    MultiSpriteCounter stype1=fullMolarInf stype2=fullMolarSup limit=0 win=False
    MultiSpriteCounter stype1=hotdoghole stype2=hotdog stype3=burger stype4=burgerhole limit=0 win=True
`,
    levels: {
      0: `wwwwwwwwwwwwwwwwwwwww
wwww..www......dwwwww
w...................w
w........A..........w
w...................w
w...................w
w..m.m.m............w
wwwwwwwwwwwwwwwwwwwww`,
      1: `wwwwwwwwwwwwwwwwwwwww
wwwwd.www......dwwwww
w...................w
w..n.....A........n.w
w...................w
w...mm.....m.m..m.m.w
www.......ww.......ww
wwwwwwwwwwwwwwwwwwwww`,
      2: `wwwwwwwwwwwwwwwwwwwww
wwww..www.......wwwww
w..n.n.n.......n.n.nw
w........A..........w
w...................w
wwwwwww...ww...wwwwww
w......v..ww..v.....w
wwwwwwwwwwwwwwwwwwwww`,
      3: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
wwww.....................wwwww
w.nnn....................nnn.w
w............................w
w............................w
w........wwwwwwwwwww.........w
w............................w
w............................w
w............................w
wv...........A..............vw
w.....mmm............mmm.....w
w............wwwww...........w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      4: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
wwww..d..................wwwww
w.nnn........................w
w............................w
w............................w
w........wwwwwwwwwww.........w
w............................w
w............................w
w............................w
w............A..............vw
w.......................mmm..w
w............wwwww..........vw
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      5: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
wwww.........ddddd.......wwwww
w............................w
w............................w
wn..........................nw
w............................w
w............................w
w............................w
w............................w
w...mmmm....A..........mmmm..w
w.............mmm............w
wwwwwwwwww...wwwww...wwwwwwwww
w............wwwww...........w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      6: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
wwww.........d.d.d.......wwwww
w.n........................n.w
w............................w
w.........wwwwwwwwwww........w
w............................w
w............................w
w............................w
w............................w
w...m.mmm....A.m......mmm.m..w
w.............m.m............w
w..wwwwwww...wwwww...wwwwww..w
wv...........wwwww..........vw
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      7: `wwwwwwwwwwwwwwwwwwwwwwww
w......wdw.wdw.wdw.....w
wwwwwwww.w.w.w.w.w..wwww
wd...www.w.w.w.w.www..dw
wwww.www.www.www.www.www
w......................w
w......................w
w......................w
w......................w
w......................w
w......................w
w...........A..........w
w......................w
w...m...m...m...m...m..w
wwwwwwwwwwwwwwwwwwwwwwww`,
      8: `wwwwwwwwwwwwwwwwwwwwwwww
wwwwwwww...wdw...wwwwwww
wd.....w...w.w...w....dw
wwwwww.w...w.w...w.wwwww
w........n.....n.......w
w......................w
w......................w
w......................w
w......................w
w......................w
w......................w
w...........A..........w
w.....m.....m.....m....w
wv........wwwww.......vw
wwwwwwwwwwwwwwwwwwwwwwww`,
      9: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
wwww.......dddddddd......wwwww
w............................w
w............................w
wn..........................nw
w............................w
w............................w
w............................w
w............................w
w.m.m.m.m....A.......m.m.m.m.w
w.............mmm............w
w...wwwwww...wwwww...wwwww...w
wv...........wwwww..........vw
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      10: `wwwwwwwwwwwwwwwwwwwwwwww
w...n...n...n...n...n..w
w......................w
w......................w
w...........A..........w
w......................w
w......................w
w......................w
w......................w
w......................w
wwww.www.www.www.www.www
wv...w w.w w.w w.w w..vw
wwwwwwwwvwww.wwwvwwwwwww
wwwwwwwwwwwwwwwwwwwwwwww`,
      11: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
wwww..........ddd........wwwww
w..n.n..n............n.n..n..w
w............................w
w............................w
w............................w
w............................w
w............................w
w............................w
w............................w
w............................w
w............A...............w
w.m.m.m.m.....vvv....m.m.m.m.w
w............wwwww...........w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
    },
  },
  "sokoban_vgfmri3": {
    description: `BasicGame square_size=20
    SpriteSet
        floor > Immovable img=colors/LIGHTGRAY
        hole   > Immovable img=colors/RED
        avatar > MovingAvatar img=colors/DARKBLUE
        box    > Passive img=colors/GREEN
        wall > Immovable img=colors/DARKGRAY autotiling=True

    LevelMapping
        . > floor
        A > floor avatar
        0 > floor hole
        1 > floor box
        w > floor wall

    InteractionSet
        avatar wall > stepBack
        box avatar  > bounceForward
        box avatar  > changeScore scoreChange=1
        box wall > stepBack
        box box > stepBack
        box hole    > killSprite
            box hole > changeScore scoreChange=1

        floor EOS > killSprite
        hole EOS > killSprite
        avatar EOS > killSprite
        box EOS > killSprite
        wall EOS > killSprite

    TerminationSet
        SpriteCounter stype=box    limit=0 win=True
        Timeout limit=150 win=False
`,
    levels: {
      0: `wwwwwwwwwwwwwwwwwwwww
w..............0ww..w
w......1............w
w...........A.......w
wwwwwwwwwwwwwwwwwwwww`,
      1: `wwwwwwwwwwwwwwwww
w......w..0.....w
w..1...w........w
w......w.....A..w
w...............w
w...............w
wwwwwwwwwwwwwwwww`,
      2: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w...........................ww
w...........................ww
wwwwwww......0wwww...........w
w....1.......................w
w.........1..................w
w.....A........wwwwww........w
w............................w
w......wwwwwwwww.........wwwww
w......0.................wwwww
w...........................ww
w...........................ww
w...........................ww
w...........................ww
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
    },
  },
  "zelda_vgfmri3": {
    description: `BasicGame
    SpriteSet
        floor > Immovable img=colors/LIGHTGRAY
        goal  > Immovable img=colors/GREEN
        key   > Resource img=colors/ORANGE limit=1
        sword > OrientedFlicker singleton=True img=colors/WHITE
        avatar  > ShootAvatar   stype=sword frameRate=8 img=colors/DARKBLUE
        monsterQuick > RandomNPC cooldown=6 cons=6 img=colors/BROWN
        monsterNormal > RandomNPC cooldown=8 cons=8 img=colors/PINK
        monsterSlow > RandomNPC cooldown=10 cons=12 img=colors/GOLD
        wall > Immovable autotiling=true img=colors/DARKGRAY



    LevelMapping
        . > floor
        A > floor avatar
        g > floor goal
        + > floor key
        1 > floor monsterQuick
        2 > floor monsterNormal
        3 > floor monsterSlow
        w > floor wall

    InteractionSet
        avatar wall > stepBack
        goal avatar > killIfOtherHasMore resource=key limit=1
        monsterSlow sword > killSprite
        monsterQuick sword > killSprite
        monsterNormal sword > killSprite
        monsterSlow sword > changeScore scoreChange=2
        monsterQuick sword > changeScore scoreChange=2
        monsterNormal sword > changeScore scoreChange=2

        monsterSlow monsterSlow > stepBack
        monsterSlow monsterQuick > stepBack
        monsterSlow monsterNormal > stepBack
        monsterQuick monsterNormal > stepBack
        monsterNormal monsterNormal > stepBack
        monsterQuick monsterQuick > stepBack

        avatar monsterSlow > killSprite
        avatar monsterQuick > killSprite
        avatar monsterNormal > killSprite
        avatar monsterSlow > changeScore scoreChange=-1
        avatar monsterQuick > changeScore scoreChange=-1
        avatar monsterNormal > changeScore scoreChange=-1

        avatar key > changeResource resource=key value=1
        avatar key > changeScore scoreChange=5
        key avatar > killSprite

        monsterQuick wall > stepBack
        monsterNormal wall > stepBack
        monsterSlow wall > stepBack

        sword wall > killSprite

        floor EOS > killSprite
        goal EOS > killSprite
        key EOS > killSprite
        sword EOS > killSprite
        avatar EOS > killSprite
        monsterQuick EOS > killSprite
        monsterNormal EOS > killSprite
        monsterSlow EOS > killSprite
        wall EOS > killSprite

    TerminationSet
        SpriteCounter stype=goal win=True
        SpriteCounter stype=avatar win=False
        Timeout limit=400 win=False
`,
    levels: {
      0: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w..........w.................w
w.......g..w.................w
w..........w.................w
w.................w.......+..w
w.....A...........w..........w
w.................w..........w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      1: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w..........w.................w
w.......g..w.................w
w..........w.................w
w.................w.......+..w
w...............A.w..........w
w...3.............w..........w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      2: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w..........w.................w
w..3.......wg..........3.....w
w............................w
w............................w
w............................w
w...................w........w
w...................w........w
w..3.......w........w........w
w..........w+.......w..A.....w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      3: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w..........w.................w
w..........wg................w
w..........wwwww.............w
w............................w
w............................w
w.......3....................w
w............................w
w............................w
w.....................wwwwwwww
w...........................+w
w..........w.................w
w..........w...........3.....w
wA.........w.................w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      4: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w..........w.................w
w.........+w.............A...w
w.......wwww.................w
w............................w
w.......2....................w
w.................3..........w
w............................w
w............................w
w.....................wwwwwwww
w....2.......................w
w.......wwww.................w
w.........gw.................w
w..........w.................w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      5: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w..........w.................w
w..........w.............A...w
w.......wwww.................w
w............................w
w..........3.................w
w............................w
wwwwwww......................w
w............................w
w.....................wwwwwwww
w....2................g......w
w.......wwww.................w
w.........+w...........1.....w
w..........w.................w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      6: `wwwwwwwwwwwwwwwwwwwwwwwwwwwwww
w..........w.................w
w.........gw.............A...w
w.......wwww.................w
w............................w
w..........3.................w
w.....................wwwwwwww
wwwwwww.....................+w
w..................3.........w
w...2........................w
w............................w
w.......wwww.................w
w.......2..w...........1.....w
w..........w.................w
wwwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
      7: `wwwwwwwwwwwww
wA.......w..w
w..w........w
w...w...w.+ww
www.w2..wwwww
w.......w.g.w
w.2.........w
w.....2.....w
wwwwwwwwwwwww`,
      8: `wwwwwwwwwwwww
w.3.gw....1.w
w..www......w
w..........2w
w.......wwwww
w.......w+..w
w...w...w...w
wA..w.......w
wwwwwwwwwwwww`,
      9: `wwwwwwwwwwwww
w..2.ww....Aw
w....w......w
w.w.....wwwww
w+w........3w
w.w..wwwwwwww
w.......w...w
w...3w....wgw
wwwwwwwwwwwww`,
      10: `wwwwwwwwwwwww
w..........gw
w....w......w
w.w.w..1....w
w+w.........w
ww3..3..2...w
w..w..w.w.w.w
w...A.......w
wwwwwwwwwwwww`,
      11: `wwwwwwwwwwwww
w....w....g.w
w...www.....w
w.1..www....w
w..wwwwwww..w
w......w....w
w....w...1..w
wA...w+...1.w
wwwwwwwwwwwww`,
    },
  },
  "zelda_vgfmri4": {
    description: `BasicGame
    SpriteSet
        floor > Immovable img=colors/LIGHTGRAY
        goal  > Immovable img=colors/GREEN
        key   > Resource img=colors/ORANGE limit=1
        sword > OrientedFlicker singleton=True img=colors/WHITE
        avatar  > ShootAvatar   stype=sword frameRate=8 img=colors/DARKBLUE
        monsterQuick > RandomNPC cooldown=6 cons=6 img=colors/BROWN
        monsterNormal > RandomNPC cooldown=8 cons=8 img=colors/PINK
        monsterSlow > RandomNPC cooldown=10 cons=12 img=colors/GOLD
        wall > Immovable autotiling=true img=colors/DARKGRAY



    LevelMapping
        . > floor
        A > floor avatar
        g > floor goal
        + > floor key
        1 > floor monsterQuick
        2 > floor monsterNormal
        3 > floor monsterSlow
        w > floor wall

    InteractionSet
        avatar wall > stepBack
        goal avatar > killIfOtherHasMore resource=key limit=1
        monsterSlow sword > killSprite
        monsterQuick sword > killSprite
        monsterNormal sword > killSprite
        monsterSlow sword > changeScore scoreChange=2
        monsterQuick sword > changeScore scoreChange=2
        monsterNormal sword > changeScore scoreChange=2

        monsterSlow monsterSlow > stepBack
        monsterSlow monsterQuick > stepBack
        monsterSlow monsterNormal > stepBack
        monsterQuick monsterNormal > stepBack
        monsterNormal monsterNormal > stepBack
        monsterQuick monsterQuick > stepBack

        avatar monsterSlow > killSprite
        avatar monsterQuick > killSprite
        avatar monsterNormal > killSprite
        avatar monsterSlow > changeScore scoreChange=-1
        avatar monsterQuick > changeScore scoreChange=-1
        avatar monsterNormal > changeScore scoreChange=-1

        avatar key > changeResource resource=key value=1
        avatar key > changeScore scoreChange=5
        key avatar > killSprite

        monsterQuick wall > stepBack
        monsterNormal wall > stepBack
        monsterSlow wall > stepBack

        sword wall > killSprite




        floor EOS > killSprite
        goal EOS > killSprite
        key EOS > killSprite
        sword EOS > killSprite
        avatar EOS > killSprite
        monsterQuick EOS > killSprite
        monsterNormal EOS > killSprite
        monsterSlow EOS > killSprite
        wall EOS > killSprite

    TerminationSet
        SpriteCounter stype=goal win=True
        SpriteCounter stype=avatar win=False
        Timeout limit=400 win=False
`,
    levels: {
      0: `wwwwwwwwwwwwwwwwwwwww
w..........w........w
w.......g..w........w
w..........w........w
w........w.......+..w
w........w..........w
w........w..........w
w...................w
w...................w
w.....A.............w
w...................w
wwwwwwwwwwwwwwwwwwwww`,
      1: `wwwwwwwwwwwwwwwwwwwww
w..........w........w
w.......g..w........w
w...................w
w..........w........w
w..........w.....+..w
w...................w
w...................w
w........A.w........w
w...3..........w....w
w...................w
wwwwwwwwwwwwwwwwwwwww`,
      2: `wwwwwwwwwwwwwwwwwwwww
w..........w........w
w..3.......wg..3....w
w...................w
w...................w
w...................w
w...................w
w...........w.......w
w...........w.......w
w..3.......w....w...w
w......w+...w..A....w
wwwwwwwwwwwwwwwwwwwww`,
      3: `wwwwwwwwwwwwwwwwwwwww
w..........w........w
w..........wg.......w
w..........wwwww....w
w.......3...........w
w..............wwwwww
w..................+w
w..........w........w
w...................w
w..........w...3....w
wA.........w........w
wwwwwwwwwwwwwwwwwwwww`,
      4: `wwwwwwwwwwwwwwwwwwwww
w..........w........w
w.........+w....A...w
w.......www.........w
w.......2...........w
w........3..........w
w............wwwwwwww
w....2..............w
w.......wwww........w
w.........gw........w
w..........w........w
wwwwwwwwwwwwwwwwwwwww`,
      5: `wwwwwwwwwwwwwwwwwwwww
w..........w........w
w..........w.....A..w
w.......wwww........w
w..........3........w
w.............wwwwwww
w....2........g.....w
w.......wwww........w
w.........+w...1....w
w..........w........w
w..........w........w
wwwwwwwwwwwwwwwwwwwww`,
      6: `wwwwwwwwwwwwwwwwwwwww
w.........gw...A....w
w.......wwww........w
w..........3........w
wwwwwww...........+.w
w........3..........w
w...2...............w
w.......wwww........w
w.......2..w.....1..w
w..........w........w
w..........w........w
wwwwwwwwwwwwwwwwwwwww`,
      7: `wwwwwwwwwwwwwwwwwwwww
w...................w
wA...............w..w
w..w................w
w...w...w........+.ww
w...w...............w
www.w2..wwwwwwwwwwwww
w.......w...........w
w.......w....g......w
w.2.................w
w.....2.............w
wwwwwwwwwwwwwwwwwwwww`,
      8: `wwwwwwwwwwwwwwwwwwwww
w.3.gw....1.w.......w
w..www......w.......w
w...........w.......w
w...............2...w
w...................w
w.......wwwwwwwwwwwww
w.......w.....+.....w
w.......w...........w
w...w...w...........w
wA..w...............w
wwwwwwwwwwwwwwwwwwwww`,
    },
  },
  "forge_claude": {
    description: `BasicGame
    SpriteSet
        floor > Immovable img=colors/LIGHTGRAY
        furnace > Immovable img=colors/RED
        slag > Immovable img=colors/PURPLE
        avatar > MovingAvatar img=colors/YELLOW
        gem > Resource img=colors/ORANGE limit=1
        goal > Immovable img=colors/GREEN
        ore > Passive img=colors/BROWN
        wall > Immovable img=colors/DARKGRAY

    LevelMapping
        . > floor
        w > floor wall
        A > floor avatar
        1 > floor ore
        f > floor furnace
        o > floor gem
        g > floor goal
        s > floor slag

    InteractionSet
        avatar wall > stepBack
        avatar slag > killSprite
        avatar slag > changeScore scoreChange=-1

        ore avatar > bounceForward
        ore wall > stepBack
        ore ore > stepBack
        ore slag > stepBack

        ore furnace > killSprite
        ore furnace > changeScore scoreChange=5

        avatar gem > changeScore scoreChange=5
        avatar gem > changeResource resource=gem value=1
        gem avatar > killSprite

        goal avatar > killIfOtherHasMore resource=gem limit=1

        floor EOS > killSprite
        furnace EOS > killSprite
        slag EOS > killSprite
        avatar EOS > killSprite
        gem EOS > killSprite
        goal EOS > killSprite
        ore EOS > killSprite
        wall EOS > killSprite

    TerminationSet
        SpriteCounter stype=goal limit=0 win=True
        SpriteCounter stype=avatar limit=0 win=False
`,
    levels: {
      0: `wwwwwwwwwwwwwwwwwwwww
w...................w
w...A...............w
w...................w
w..........o........w
w..............g....w
w...................w
wwwwwwwwwwwwwwwwwwwww`,
      1: `wwwwwwwwwwwwwwwwwwwww
w...................w
w...A.........1.....w
w...................w
w.............f.....w
w...................w
w...................w
w....o..............w
w..............g....w
w...................w
wwwwwwwwwwwwwwwwwwwww`,
      2: `wwwwwwwwwwwwwwwwwwwww
w...................w
w...A...............w
w...................w
w.....1w............w
w......w............w
w......w......f.....w
w...................w
w...o...............w
w..............g....w
w...................w
wwwwwwwwwwwwwwwwwwwww`,
      3: `wwwwwwwwwwwwwwwwwwwww
w...................w
w...A.............o.w
w...................w
w...1...............w
w...s...............w
w...s.............g.w
w...................w
w...f...............w
w...................w
w...................w
wwwwwwwwwwwwwwwwwwwww`,
      4: `wwwwwwwwwwwwwwwwwwwww
w........w..........w
w..A.....w...1......w
w........w..........w
w..1..wwwwww........w
w...................w
w..f...ss.....f.....w
w......ss...........w
wwwww...wwwwwwww.wwww
w..........o........w
w.................g.w
wwwwwwwwwwwwwwwwwwwww`,
    },
  },
};
