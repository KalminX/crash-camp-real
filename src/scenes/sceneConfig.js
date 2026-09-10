/**
 * Central Scene Configuration.
 * Defines narrative Acts, standalone scenes, 2-objective goals, and auto-transition targets.
 */
export const sceneConfig = {
  start: 'scene-00-intro',

  scenes: {
    'scene-00-intro': {
      id: 'scene-00-intro',
      name: 'Flight 402',
      act: 'PROLOGUE',
      actName: 'THE STORM',
      tagline: 'Flight 402 penetrates the sub-zero storm',
      defaultObjective: 'Flight 402 encountering severe storm turbulence...',
      nextSceneId: 'scene-01-the-crash',
      goals: [],
      connections: ['scene-01-the-crash'],
    },
    'scene-01-the-crash': {
      id: 'scene-01-the-crash',
      name: 'The Crash',
      act: 'ACT I',
      actName: 'THE CRASH',
      tagline: 'The smoldering wreckage of Flight 402',
      defaultObjective: 'Salvage emergency rations and inspect the emergency beacon',
      nextSceneId: 'scene-02-the-last-fire',
      goals: [
        { id: 'salvage_rations', text: 'Salvage emergency rations' },
        { id: 'inspect_beacon', text: 'Inspect damaged emergency beacon' },
      ],
      connections: ['scene-02-the-last-fire'],
    },
    'scene-02-the-last-fire': {
      id: 'scene-02-the-last-fire',
      name: 'The Last Fire',
      act: 'ACT I',
      actName: 'THE CRASH',
      tagline: 'Survive the freezing night & power the beacon',
      defaultObjective: 'Gather fallen logs to fuel the campfire and maintain beacon power',
      nextSceneId: 'scene-03-morning-after',
      goals: [
        { id: 'collect_wood', text: 'Gather pine firewood logs' },
        { id: 'fuel_campfire', text: 'Fuel campfire to power beacon' },
      ],
      connections: ['scene-01-the-crash', 'scene-03-morning-after'],
    },
    'scene-03-morning-after': {
      id: 'scene-03-morning-after',
      name: 'Morning After',
      act: 'ACT II',
      actName: 'STRANDED',
      tagline: 'Dawn arrives. The rescue never came.',
      defaultObjective: 'Investigate the flight documents and follow survivor tracks into the forest',
      nextSceneId: 'scene-00-intro',
      goals: [
        { id: 'inspect_dossier', text: 'Inspect classified flight dossier' },
        { id: 'inspect_tracks', text: 'Follow survivor tracks into forest' },
      ],
      connections: ['scene-02-the-last-fire'],
    },

    // Legacy aliases
    'scene-one': {
      id: 'scene-01-the-crash',
      aliasOf: 'scene-01-the-crash',
      name: 'The Crash',
      act: 'ACT I',
      actName: 'THE CRASH',
      tagline: 'The smoldering wreckage of Flight 402',
      nextSceneId: 'scene-02-the-last-fire',
      goals: [
        { id: 'salvage_rations', text: 'Salvage emergency rations' },
        { id: 'inspect_beacon', text: 'Inspect damaged emergency beacon' },
      ],
      connections: ['scene-02-the-last-fire'],
    },
  },
};
