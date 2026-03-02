# Representation visualization design

## Goal
The goal is to show a replay of a human gameplay for a single participant while also visualizing the "latent" representations using different cognitive models.

The high level idea is to show as time passes, and the game progresses, we collect more and more hidden representation and at each new step we plot the newly acquired representations.

This would give a very intuitive visual feedback on how the rules are discovered and represented in each model paradigm

## Layout
I would like to have one game replay box (like in vgdl-js/replay.html) on top that follows the human behavioural data.

Below that, I would like to have 4 _Feature Boxes_, one for each:
- human
- model-free (DDQN)
- model-based (EfficientZero)
- reasoning model (DeepSeek)

### Feature Box
The feature box should be a dynamically evolving plot that visualizes the activations a selected ROI / layer over time.

The best way to do this would be to have an Representation Dissimilarity Matrix (RDM) of the size [num_steps, num_steps] in the middle, a [num_steps, num_feat] plot on its left and a [num_feat, num_steps] plot above it, both plotting the representations over time (or their PCA, in case the num_feat is larger than 32).

In practice, the Plot's DOM's width and height should be fixed and when `num_steps` increases during replay, more and more data would be stretched to the same plot.
