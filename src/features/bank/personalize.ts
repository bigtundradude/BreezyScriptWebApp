// Personalize-text transform (owner spec 2026-08-18): a deterministic, no-LLM
// pass over the refinement script. Order: the user's phrase replacements FIRST,
// then the enabled contraction patterns.
//
// Contraction groups are listed in APPLICATION order — it matters:
// "I will not" must become "I won't" (Not before Will), and "I would have"
// must become "I'd have", never "I'd've" (Would before Have).

export interface ContractionPattern {
  id: string
  from: string
  to: string
}

export const CONTRACTION_GROUPS: Array<{ name: string; patterns: ContractionPattern[] }> = [
  {
    name: 'Not',
    patterns: [
      { id: 'not:dont', from: 'do not', to: "don't" },
      { id: 'not:doesnt', from: 'does not', to: "doesn't" },
      { id: 'not:didnt', from: 'did not', to: "didn't" },
      { id: 'not:isnt', from: 'is not', to: "isn't" },
      { id: 'not:arent', from: 'are not', to: "aren't" },
      { id: 'not:wasnt', from: 'was not', to: "wasn't" },
      { id: 'not:werent', from: 'were not', to: "weren't" },
      { id: 'not:havent', from: 'have not', to: "haven't" },
      { id: 'not:hasnt', from: 'has not', to: "hasn't" },
      { id: 'not:hadnt', from: 'had not', to: "hadn't" },
      { id: 'not:wont', from: 'will not', to: "won't" },
      { id: 'not:wouldnt', from: 'would not', to: "wouldn't" },
      { id: 'not:couldnt', from: 'could not', to: "couldn't" },
      { id: 'not:shouldnt', from: 'should not', to: "shouldn't" },
      { id: 'not:cant', from: 'cannot', to: "can't" },
      { id: 'not:cant2', from: 'can not', to: "can't" },
      { id: 'not:mustnt', from: 'must not', to: "mustn't" },
    ],
  },
  {
    name: 'Would',
    patterns: [
      { id: 'would:id', from: 'I would', to: "I'd" },
      { id: 'would:youd', from: 'you would', to: "you'd" },
      { id: 'would:hed', from: 'he would', to: "he'd" },
      { id: 'would:shed', from: 'she would', to: "she'd" },
      { id: 'would:itd', from: 'it would', to: "it'd" },
      { id: 'would:wed', from: 'we would', to: "we'd" },
      { id: 'would:theyd', from: 'they would', to: "they'd" },
      { id: 'would:thatd', from: 'that would', to: "that'd" },
      { id: 'would:thered', from: 'there would', to: "there'd" },
      { id: 'would:whod', from: 'who would', to: "who'd" },
    ],
  },
  {
    name: 'Will',
    patterns: [
      { id: 'will:ill', from: 'I will', to: "I'll" },
      { id: 'will:youll', from: 'you will', to: "you'll" },
      { id: 'will:hell', from: 'he will', to: "he'll" },
      { id: 'will:shell', from: 'she will', to: "she'll" },
      { id: 'will:itll', from: 'it will', to: "it'll" },
      { id: 'will:well', from: 'we will', to: "we'll" },
      { id: 'will:theyll', from: 'they will', to: "they'll" },
      { id: 'will:thatll', from: 'that will', to: "that'll" },
      { id: 'will:therell', from: 'there will', to: "there'll" },
    ],
  },
  {
    name: 'Be',
    patterns: [
      { id: 'be:im', from: 'I am', to: "I'm" },
      { id: 'be:youre', from: 'you are', to: "you're" },
      { id: 'be:hes', from: 'he is', to: "he's" },
      { id: 'be:shes', from: 'she is', to: "she's" },
      { id: 'be:its', from: 'it is', to: "it's" },
      { id: 'be:were', from: 'we are', to: "we're" },
      { id: 'be:theyre', from: 'they are', to: "they're" },
      { id: 'be:thats', from: 'that is', to: "that's" },
      { id: 'be:theres', from: 'there is', to: "there's" },
      { id: 'be:heres', from: 'here is', to: "here's" },
      { id: 'be:whats', from: 'what is', to: "what's" },
      { id: 'be:whos', from: 'who is', to: "who's" },
      { id: 'be:wheres', from: 'where is', to: "where's" },
      { id: 'be:hows', from: 'how is', to: "how's" },
    ],
  },
  {
    name: 'Have',
    patterns: [
      { id: 'have:ive', from: 'I have', to: "I've" },
      { id: 'have:youve', from: 'you have', to: "you've" },
      { id: 'have:weve', from: 'we have', to: "we've" },
      { id: 'have:theyve', from: 'they have', to: "they've" },
      { id: 'have:couldve', from: 'could have', to: "could've" },
      { id: 'have:wouldve', from: 'would have', to: "would've" },
      { id: 'have:shouldve', from: 'should have', to: "should've" },
      { id: 'have:mightve', from: 'might have', to: "might've" },
      { id: 'have:mustve', from: 'must have', to: "must've" },
    ],
  },
  {
    name: 'Other',
    patterns: [{ id: 'other:lets', from: 'let us', to: "let's" }],
  },
]

export const ALL_CONTRACTIONS: ContractionPattern[] = CONTRACTION_GROUPS.flatMap(
  (group) => group.patterns,
)

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Preserve the casing of the matched text:
// - ALL-CAPS source → ALL-CAPS contraction ("ARE NOT" → "AREN'T")
// - Leading capital (sentence start) → leading capital ("You are" → "You're")
// - "I" stays capital regardless: targets are authored with capital I and
//   matchCase never lowercases ("i would" → "I'd").
function matchCase(source: string, target: string) {
  if (source === source.toUpperCase() && /[A-Z]/.test(source)) {
    return target.toUpperCase()
  }
  if (source[0] === source[0].toUpperCase() && target[0] !== target[0].toUpperCase()) {
    return target[0].toUpperCase() + target.slice(1)
  }
  return target
}

function replaceAll(text: string, from: string, to: string): { text: string; count: number } {
  let count = 0
  // The (?!') guard keeps patterns from re-matching inside an already
  // contracted phrase (e.g. "I would" inside "I would've" → never "I'd've").
  const next = text.replace(new RegExp(`\\b${escapeRegex(from)}\\b(?!')`, 'gi'), (match) => {
    count++
    return matchCase(match, to)
  })
  return { text: next, count }
}

// ——— Compound contractions ———
// Three-word phrases where two standard contractions compete for the same
// words. Each family is a style choice; compound patterns are GENERATED from
// the base groups (so every subject is covered automatically) and run before
// the simple patterns. Subjects with no pronoun contraction ("the plan is
// not") fall through to the simple patterns either way.
export type CompoundStyles = Record<string, string>

export interface CompoundFamily {
  key: string
  label: string
  options: Array<{ value: string; example: string }>
  defaultValue: string
}

// Ordered so related compounds sit together (owner, 2026-08-18): the would
// pair first, then will, then the be family, then have/has/had negatives.
export const COMPOUND_FAMILIES: CompoundFamily[] = [
  {
    key: 'wouldHave',
    label: '"would have" becomes',
    options: [
      { value: 'pronoun', example: "I'd have" },
      { value: 'have', example: "I would've" },
    ],
    defaultValue: 'pronoun',
  },
  {
    key: 'wouldNot',
    label: '"would not" becomes',
    options: [
      { value: 'not', example: "I wouldn't" },
      { value: 'pronoun', example: "I'd not" },
    ],
    defaultValue: 'not',
  },
  {
    key: 'willNot',
    label: '"will not" becomes',
    options: [
      { value: 'not', example: "I won't" },
      { value: 'pronoun', example: "I'll not" },
    ],
    defaultValue: 'not',
  },
  {
    key: 'beNot',
    label: '"is not / are not" becomes',
    options: [
      { value: 'pronoun', example: "it's not" },
      { value: 'not', example: "it isn't" },
    ],
    defaultValue: 'pronoun',
  },
  {
    key: 'hasNot',
    label: '"has not" becomes',
    options: [
      { value: 'not', example: "he hasn't" },
      { value: 'pronoun', example: "he's not" },
    ],
    defaultValue: 'not',
  },
  {
    key: 'haveNot',
    label: '"have not" becomes',
    options: [
      { value: 'not', example: "I haven't" },
      { value: 'pronoun', example: "I've not" },
    ],
    defaultValue: 'not',
  },
  {
    key: 'hadNot',
    label: '"had not" becomes',
    options: [
      { value: 'not', example: "I hadn't" },
      { value: 'pronoun', example: "I'd not" },
    ],
    defaultValue: 'not',
  },
]

export function resolveCompoundStyle(styles: CompoundStyles, key: string): string {
  const family = COMPOUND_FAMILIES.find((f) => f.key === key)
  return styles[key] ?? family?.defaultValue ?? ''
}

interface CompoundPattern {
  from: string
  to: string
  requiresId: string // the underlying simple pattern; skipped when disabled ('' = none)
}

function groupPatterns(name: string): ContractionPattern[] {
  return CONTRACTION_GROUPS.find((g) => g.name === name)?.patterns ?? []
}

export function buildCompoundPatterns(styles: CompoundStyles): CompoundPattern[] {
  const out: CompoundPattern[] = []
  const style = (key: string) => resolveCompoundStyle(styles, key)

  for (const p of groupPatterns('Would')) {
    const subject = p.from.replace(/ would$/, '')
    // would + have
    out.push(
      style('wouldHave') === 'pronoun'
        ? { from: `${p.from} have`, to: `${p.to} have`, requiresId: p.id }
        : { from: `${p.from} have`, to: `${subject} would've`, requiresId: 'have:wouldve' },
    )
    // would + not
    out.push(
      style('wouldNot') === 'not'
        ? { from: `${p.from} not`, to: `${subject} wouldn't`, requiresId: 'not:wouldnt' }
        : { from: `${p.from} not`, to: `${p.to} not`, requiresId: p.id },
    )
  }

  // be + not (is/are subjects; "I am not" has one form and needs no family)
  for (const p of groupPatterns('Be')) {
    if (p.from.endsWith(' is')) {
      const subject = p.from.replace(/ is$/, '')
      out.push(
        style('beNot') === 'pronoun'
          ? { from: `${p.from} not`, to: `${p.to} not`, requiresId: p.id }
          : { from: `${p.from} not`, to: `${subject} isn't`, requiresId: 'not:isnt' },
      )
    } else if (p.from.endsWith(' are')) {
      const subject = p.from.replace(/ are$/, '')
      out.push(
        style('beNot') === 'pronoun'
          ? { from: `${p.from} not`, to: `${p.to} not`, requiresId: p.id }
          : { from: `${p.from} not`, to: `${subject} aren't`, requiresId: 'not:arent' },
      )
    }
  }

  // will + not
  for (const p of groupPatterns('Will')) {
    const subject = p.from.replace(/ will$/, '')
    out.push(
      style('willNot') === 'not'
        ? { from: `${p.from} not`, to: `${subject} won't`, requiresId: 'not:wont' }
        : { from: `${p.from} not`, to: `${p.to} not`, requiresId: p.id },
    )
  }

  // have + not (pronoun subjects only; "could have not" etc. is not a phrase)
  for (const p of groupPatterns('Have')) {
    if (!/^(I|you|we|they) have$/.test(p.from)) continue
    const subject = p.from.replace(/ have$/, '')
    out.push(
      style('haveNot') === 'not'
        ? { from: `${p.from} not`, to: `${subject} haven't`, requiresId: 'not:havent' }
        : { from: `${p.from} not`, to: `${p.to} not`, requiresId: p.id },
    )
  }

  // has + not / had + not: no simple pronoun-has/had patterns exist (bare 's
  // and 'd would be ambiguous), but with "not" attached the compound is
  // unambiguous, so these families exist only here.
  const HAS_SUBJECTS: Array<[string, string]> = [
    ['he', "he's"],
    ['she', "she's"],
    ['it', "it's"],
    ['that', "that's"],
    ['there', "there's"],
    ['who', "who's"],
  ]
  for (const [subject, contracted] of HAS_SUBJECTS) {
    out.push(
      style('hasNot') === 'not'
        ? { from: `${subject} has not`, to: `${subject} hasn't`, requiresId: 'not:hasnt' }
        : { from: `${subject} has not`, to: `${contracted} not`, requiresId: '' },
    )
  }
  const HAD_SUBJECTS: Array<[string, string]> = [
    ['I', "I'd"],
    ['you', "you'd"],
    ['he', "he'd"],
    ['she', "she'd"],
    ['it', "it'd"],
    ['we', "we'd"],
    ['they', "they'd"],
    ['that', "that'd"],
    ['there', "there'd"],
    ['who', "who'd"],
  ]
  for (const [subject, contracted] of HAD_SUBJECTS) {
    out.push(
      style('hadNot') === 'not'
        ? { from: `${subject} had not`, to: `${subject} hadn't`, requiresId: 'not:hadnt' }
        : { from: `${subject} had not`, to: `${contracted} not`, requiresId: '' },
    )
  }

  return out
}

// Phrase replacements first, then compound resolutions, then the simple
// contractions — per the owner's flow. The (?!') guard keeps every earlier
// result safe from re-contraction.
export function personalizeText(
  text: string,
  replacements: Array<{ before: string; after: string }>,
  disabledContractionIds: string[],
  compoundStyles: CompoundStyles = {},
): { text: string; count: number } {
  let out = text
  let total = 0
  for (const replacement of replacements) {
    if (!replacement.before.trim()) continue
    const result = replaceAll(out, replacement.before.trim(), replacement.after.trim())
    out = result.text
    total += result.count
  }
  for (const compound of buildCompoundPatterns(compoundStyles)) {
    if (compound.requiresId && disabledContractionIds.includes(compound.requiresId)) continue
    const result = replaceAll(out, compound.from, compound.to)
    out = result.text
    total += result.count
  }
  for (const pattern of ALL_CONTRACTIONS) {
    if (disabledContractionIds.includes(pattern.id)) continue
    const result = replaceAll(out, pattern.from, pattern.to)
    out = result.text
    total += result.count
  }
  return { text: out, count: total }
}
