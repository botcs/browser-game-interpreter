1. Do a self-playing demo, in which we show how an agent solves any arbitrary games.
This needs a replay type of the game box into which we can load specific states of games.
Unfortunately the current logging of the @src/llm_eval does not save the states of the games, just the actions of the agent, relying on the environment to be reproducible.
In general this assumption was true, since the @src interpreter is seeded, however now that we have the javascript port, brogi, I am not sure if the same assumption holds.

TODO:
- figure out how to port the @src/llm_eval/replay.py to JS
    - write a translation script that takes the raw actions (e.g. @out/test.json)
    - replays them in the original @src/llm_eval environment
    - saves the state at each step, both for deterministic and non-deterministic games
- visualize full input vs output of the model (research technical demo) -- on a different html page
- visualize narratives/reasoning only (investor demo) -- on a different html page



2. Do a demo on live narrative generation on human actions with arbitrary game rules in arbitrary environments.

TODOs:
- add seed param to the cogwheel setting
- add tracking and logging of actions
- add saving of full game states
- add OpenRouter plug to pass gameplay to oracle model (one that has access to the latent rules via the game expressions)
- make an educated guess of what's the best way to run the plug:
    - run only on request: cheapest -> send gameplay up to the most recent action
    - stateless vs scratchpad: stateless is neat but potentially worse descriptions; stateful is expensive but can update its latent representation upon each request, needing to do less TTC
- explain why the hell it's super important


3. Include RoomWorld from ~/github/roomworld-analysis in the game descriptions (should be rather straightforward to translate)
