export interface PromptLayers {
  styleMood: string;
  contentRules: string;
}

export const DEFAULT_PROMPT_LAYERS: PromptLayers = {
  styleMood: `Style: moody and atmospheric but visually rich — think prestige TV title card or true crime documentary.
The image should feel evocative and intriguing, not oppressively dark. Use mid-tones, visible textures,
and enough light to reveal detail. Accent colors: cool pinks and magentas (rgb(255,141,249), rgb(255,84,240),
rgb(240,32,203)) as selective lighting — colored light spilling through a window, neon reflections
on wet pavement, a soft glow around an object.`,

  contentRules: `Depict only specific, literal objects or settings directly relevant to this case —
avoid generic true crime clichés (no chalk outlines, no bloody weapons, no crime scene tape,
no skulls, no knives unless explicitly relevant). Prefer evocative environments: a specific room,
a landscape, an object, architecture — rendered with cinematic lighting and depth.
No text, no letters, no numbers, no words, no labels of any kind — purely visual.`,
};
