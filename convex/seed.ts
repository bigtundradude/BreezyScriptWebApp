import { internalMutation } from './_generated/server'

// Dev fixture (decision #10): `npx convex run seed:run` on a dev deployment.
// Creates a demo channel with sample notes and ideas. Never wire into the UI.
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const channelId = await ctx.db.insert('channels', {
      name: 'Demo Channel',
      description: 'Seeded sample data',
      identity:
        'Brand: calm, practical outdoors living.\nPoint of view: gear minimalism beats gear obsession.\nStands for: honest field testing. Stands against: hype-driven reviews.',
      updatedAt: now,
    })

    const notes: Array<{ title: string; kind: 'story' | 'note' | 'research' | 'quote'; body: string; tags: string[] }> = [
      {
        title: 'The night the stove failed at -20',
        kind: 'story',
        body: 'Winter camp on the ridge. Stove pump seal cracked at dusk; melted snow with a candle lantern and a foil windscreen for six hours. Lesson: carry the two-gram spare seal. The fear was real — hands stopped working around midnight.',
        tags: ['winter', 'gear-failure'],
      },
      {
        title: 'Why viewers quit in the first 30 seconds',
        kind: 'research',
        body: 'Retention analysis across 12 videos: intros that restate the title lose 18% more viewers than intros that add a stake the title did not promise. Cold-open footage beats talking-head opens in 9 of 12 cases.',
        tags: ['retention', 'analytics'],
      },
      {
        title: 'Grandpa on sharpening',
        kind: 'quote',
        body: '"A dull knife cuts you twice — once when it slips and once when you curse the man who let it dull." Use for any maintenance-themed video.',
        tags: ['maintenance'],
      },
      {
        title: 'Tarp configurations worth filming',
        kind: 'note',
        body: 'A-frame in rain, plow point in wind, lean-to with fire reflector. Each is a natural chapter. Film all three in one trip for a structure video.',
        tags: ['shelter', 'b-roll'],
      },
    ]
    for (const n of notes) {
      await ctx.db.insert('notes', {
        channelId,
        title: n.title,
        body: n.body,
        kind: n.kind,
        tags: n.tags,
        searchText: `${n.title}\n${n.tags.join(' ')}\n${n.body}`,
        updatedAt: now,
      })
    }

    const ideas = [
      { title: 'I tested 5 budget stoves in real winter', angle: 'Field failure points, not spec sheets' },
      { title: 'The 10-item winter kit I actually carry', angle: 'Minimalism with receipts' },
      { title: 'Why your tarp setup fails in wind', angle: 'Physics of plow points' },
    ]
    for (const idea of ideas) {
      await ctx.db.insert('ideas', {
        channelId,
        title: idea.title,
        angle: idea.angle,
        sourceRef: '',
        status: 'new',
        updatedAt: now,
      })
    }

    return { channelId, notes: notes.length, ideas: ideas.length }
  },
})
