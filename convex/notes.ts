import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { requireOwner } from './lib/owner'
import { noteKind } from './schema'

const SNIPPET_LEN = 240
const LIST_LIMIT = 200

function buildSearchText(title: string, tags: string[], body: string) {
  return `${title}\n${tags.join(' ')}\n${body}`
}

function toListItem(note: Doc<'notes'>) {
  return {
    _id: note._id,
    title: note.title,
    kind: note.kind,
    tags: note.tags,
    sourceRef: note.sourceRef ?? '',
    snippet: note.body.slice(0, SNIPPET_LEN),
    updatedAt: note.updatedAt,
  }
}

async function getOwnedNote(
  ctx: { db: { get: (id: Id<'notes'>) => Promise<Doc<'notes'> | null> } },
  channelId: Id<'channels'>,
  noteId: Id<'notes'>,
) {
  const note = await ctx.db.get(noteId)
  if (!note || note.channelId !== channelId) throw new Error('Note not found')
  return note
}

export const list = query({
  args: {
    channelId: v.id('channels'),
    search: v.optional(v.string()),
    kind: v.optional(noteKind),
  },
  handler: async (ctx, { channelId, search, kind }) => {
    await requireOwner(ctx)
    const term = search?.trim() ?? ''
    if (term) {
      // Explicit-submit search (decision #9): word/prefix matching, relevance order.
      const results = await ctx.db
        .query('notes')
        .withSearchIndex('search', (q) => {
          const base = q.search('searchText', term).eq('channelId', channelId)
          return kind ? base.eq('kind', kind) : base
        })
        .take(LIST_LIMIT)
      return results.map(toListItem)
    }
    // Kind filter applies BEFORE the limit, so kinds living only in older notes
    // still surface (SecondBrainPicker defaults to kind 'story').
    let query = ctx.db
      .query('notes')
      .withIndex('by_channel', (q) => q.eq('channelId', channelId))
      .order('desc')
    if (kind) query = query.filter((q) => q.eq(q.field('kind'), kind))
    const notes = await query.take(LIST_LIMIT)
    return notes.map(toListItem)
  },
})

export const get = query({
  args: { channelId: v.id('channels'), noteId: v.id('notes') },
  handler: async (ctx, { channelId, noteId }) => {
    await requireOwner(ctx)
    const note = await ctx.db.get(noteId)
    if (!note || note.channelId !== channelId) return null
    return note
  },
})

export const create = mutation({
  args: {
    channelId: v.id('channels'),
    title: v.string(),
    body: v.string(),
    kind: noteKind,
    tags: v.array(v.string()),
  },
  handler: async (ctx, { channelId, title, body, kind, tags }) => {
    await requireOwner(ctx)
    const trimmed = title.trim()
    if (!trimmed) throw new Error('Give the note a title.')
    return await ctx.db.insert('notes', {
      channelId,
      title: trimmed,
      body,
      kind,
      tags,
      searchText: buildSearchText(trimmed, tags, body),
      updatedAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    channelId: v.id('channels'),
    noteId: v.id('notes'),
    title: v.string(),
    body: v.string(),
    kind: noteKind,
    tags: v.array(v.string()),
  },
  handler: async (ctx, { channelId, noteId, title, body, kind, tags }) => {
    await requireOwner(ctx)
    await getOwnedNote(ctx, channelId, noteId)
    const trimmed = title.trim()
    if (!trimmed) throw new Error('Give the note a title.')
    await ctx.db.patch(noteId, {
      title: trimmed,
      body,
      kind,
      tags,
      searchText: buildSearchText(trimmed, tags, body),
      updatedAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: { channelId: v.id('channels'), noteId: v.id('notes') },
  handler: async (ctx, { channelId, noteId }) => {
    await requireOwner(ctx)
    await getOwnedNote(ctx, channelId, noteId)
    await ctx.db.delete(noteId)
  },
})

// ——— Ingest surface: the only path other tools may write notes through.
// Upserts on (channelId, sourceRef) — backed by a real index, unlike the desktop app.

export const ingestPush = mutation({
  args: {
    channelId: v.id('channels'),
    sourceRef: v.string(),
    kind: noteKind,
    title: v.string(),
    body: v.string(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { channelId, sourceRef, kind, title, body, tags }) => {
    await requireOwner(ctx)
    if (!sourceRef) throw new Error('ingestPush requires a sourceRef')
    const existing = await ctx.db
      .query('notes')
      .withIndex('by_channel_source', (q) => q.eq('channelId', channelId).eq('sourceRef', sourceRef))
      .unique()
    const fields = {
      title: title.trim() || 'Untitled',
      body,
      kind,
      tags: tags ?? existing?.tags ?? [],
      updatedAt: Date.now(),
    }
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...fields,
        searchText: buildSearchText(fields.title, fields.tags, body),
      })
      return { noteId: existing._id, created: false }
    }
    const noteId = await ctx.db.insert('notes', {
      channelId,
      sourceRef,
      ...fields,
      searchText: buildSearchText(fields.title, fields.tags, body),
    })
    return { noteId, created: true }
  },
})

export const ingestLookup = query({
  args: { channelId: v.id('channels'), sourceRef: v.string() },
  handler: async (ctx, { channelId, sourceRef }) => {
    await requireOwner(ctx)
    if (!sourceRef) return null
    const note = await ctx.db
      .query('notes')
      .withIndex('by_channel_source', (q) => q.eq('channelId', channelId).eq('sourceRef', sourceRef))
      .unique()
    return note ? { noteId: note._id, updatedAt: note.updatedAt } : null
  },
})
