// Verbatim copy of src/features/scripts/lib/titleShapes.ts (Scripts Pro is
// frozen; convex/ cannot import from src/, so the workflow keeps its own copy).
// The built-in title shape library: 10 shapes, ~110 templates, shipped as code
// constants. Settings displays them read-only; title generation consumes them
// alongside the channel's custom templates. Keep in sync with the source file.

export interface BuiltinTitleTemplate { text: string; why: string; example: string }
export interface BuiltinTitleShape {
  id:             string   // 'shape:number_list'
  name:           string
  tagline:        string
  mechanism:      string
  whatWorks:      string[]
  whatUndermines: string[]
  templates:      BuiltinTitleTemplate[]
}

export const BUILTIN_TITLE_SHAPES: BuiltinTitleShape[] = [
  {
    id: 'shape:number_list', name: 'Number List',
    tagline: 'The count itself is the hook: a promise of scannable, finite value.',
    mechanism: 'A number sets a clear expectation of scope and effort, which lowers the perceived cost of clicking. The brain reads a finite list as easy to finish, and the specific figure signals how thorough the payoff will be.',
    whatWorks: [
      'Match the number to the promise. 3 feels essential, 10 comprehensive, 47 obsessively thorough.',
      'Lead with the number so it is the first thing the eye lands on.',
      'Pair the count with a stake or outcome, not just a topic ("mistakes killing your X", not "X tips").',
      'Use odd or oddly-specific numbers; they read as researched rather than rounded.',
    ],
    whatUndermines: [
      'A number with no payoff attached ("10 Tips"). The count works only when the items promise something.',
      'Inflated counts the video cannot deliver, which tank retention once viewers start counting.',
      'Burying the number mid-title where it loses its expectation-setting job.',
      'Padding the list with filler items to hit a round number.',
    ],
    templates: [
      { text: '{number} Mistakes Killing Your {result}', why: 'Frames the list as a diagnosis of what is already going wrong, so each item is a loss to fix rather than a tip to consider.', example: '7 Mistakes Killing Your YouTube Growth' },
      { text: "{number} Things I Wish I Knew Before Starting {topic}", why: 'Borrows hindsight authority. The count is a list of regrets, which reads as hard-won and personal rather than generic advice.', example: '12 Things I Wish I Knew Before Starting a Podcast' },
      { text: '{number} {product} You NEED to Buy in {year}', why: 'Turns the list into a shopping shortlist with urgency; the number caps an overwhelming category into a decision the viewer can act on.', example: '5 Cameras You NEED to Buy in 2026' },
      { text: '{number} Micro-Habits That Will Change Your Life', why: 'Pairs a small-effort framing ("micro") with an outsized payoff, so the count promises low cost and high return at once.', example: '8 Micro-Habits That Will Change Your Life' },
      { text: 'Top {number} {category} of the Year', why: 'Positions the list as a definitive ranking, leaning on authority and recency rather than personal experience.', example: 'Top 10 Productivity Apps of the Year' },
      { text: 'Only {number} {things} Actually Matter for {goal}', why: 'Reduction instead of accumulation. A deliberately low count promises signal over noise, the opposite of the comprehensive list.', example: 'Only 3 Habits Actually Matter for Fat Loss' },
      { text: '{number} {category}, Ranked (And #1 Surprised Me)', why: 'Embeds a curiosity gap inside the ranking, so the list carries one withheld payoff the viewer waits for.', example: '7 Budget Mics, Ranked (And #1 Surprised Me)' },
      { text: '{number} Free {tools} Better Than {paid_thing}', why: 'A value-arbitrage list where every item is a free win over a paid default, not just a tip.', example: '9 Free Apps Better Than Photoshop' },
      { text: '{number} {things} Under {price}', why: 'A price ceiling filters the count into an instant budget shortlist the viewer can act on.', example: '12 Desk Upgrades Under $25' },
      { text: '{number} Rules I Live By for {topic}', why: 'Frames the list as personal doctrine, so the items read as hard-won principles rather than generic advice.', example: '10 Rules I Live By for Saving Money' },
      { text: '{number} Quick Wins for {goal} (Start Today)', why: 'Pairs the count with immediacy and low effort. Results you can act on now, not a long project.', example: '6 Quick Wins for Better Sleep (Start Today)' },
      { text: '{number} Things Nobody Tells Beginners About {topic}', why: 'A list of insider gaps that leans on exclusivity and hindsight rather than comprehensiveness.', example: '15 Things Nobody Tells Beginners About Freelancing' },
    ],
  },
  {
    id: 'shape:compression', name: 'Compression',
    tagline: 'Maximum value in minimum time: a dense payoff you cannot get faster anywhere else.',
    mechanism: 'People are loss-averse with time. A precise value-to-time ratio promises a shortcut that feels like a steal, and the specificity of both numbers is what makes the trade believable.',
    whatWorks: [
      'Make both sides of the trade specific ("30 Years in 2 Hours" beats "Learn Fast").',
      'Quantify the value (years, dollars, scope) so the density is legible at a glance.',
      'Signal completeness. "Everything you need" implies you can stop searching after this.',
      'Keep the time/effort side small and concrete to sharpen the contrast.',
    ],
    whatUndermines: [
      'Vague compression ("Learn Everything Quickly") with no numbers to anchor the trade.',
      'Over-promising scope the runtime cannot honor, which feels like a bait once watched.',
      'Compressing something viewers do not believe can be compressed, breaking credibility.',
    ],
    templates: [
      { text: "Beginner's Guide to {topic}: Everything You Need", why: 'Leans on completeness rather than speed. The compression is "all of it in one place", removing the need to look elsewhere.', example: "Beginner's Guide to Investing: Everything You Need" },
      { text: '{topic} 101: A Crash Course for Beginners', why: 'The "101 / crash course" framing compresses a whole subject into a single sitting and signals zero prerequisites.', example: 'Lighting 101: A Crash Course for Beginners' },
      { text: 'The Ultimate Guide to {topic} in {year}', why: 'Claims definitiveness plus recency. "Ultimate" says you will not need another guide, the year says it is current.', example: 'The Ultimate Guide to SEO in 2026' },
      { text: '{topic} Explained in {timeframe}', why: 'Puts the time bound front and center as the entire promise: a complete explanation inside a fixed, short window.', example: 'The French Revolution Explained in 20 Minutes' },
      { text: '{topic} Lore Explained in {timeframe}', why: 'Same time-bound compression but for sprawling fandom canon, where the appeal is taming something notoriously vast quickly.', example: 'All of Elden Ring Lore Explained in 15 Minutes' },
      { text: 'The Only {tool} You Will Ever Need', why: 'Compresses choice instead of time. It collapses a crowded category to a single answer so the viewer can stop comparing.', example: 'The Only Budgeting App You Will Ever Need' },
      { text: '{span} of {topic} in {timeframe}', why: 'The signature span-to-time ratio. The contrast between a huge span and a tiny window is the entire pitch.', example: '30 Years of Business Knowledge in 2 Hours' },
      { text: "Give Me {timeframe} and I'll {result}", why: 'A first-person time-for-outcome bargain that puts the creator on the line for the promise.', example: "Give Me 9 Minutes and I'll Fix Your Sleep" },
      { text: '{topic} for Busy People', why: 'Compresses by audience. It is explicitly built for people who have no time to spare.', example: 'Investing for Busy People' },
      { text: 'The Fastest Way to {result}', why: 'Sells speed as a superlative rather than a fixed runtime: the single quickest route.', example: 'The Fastest Way to Learn a Language' },
      { text: '{topic} in One {format}', why: 'Collapses an entire subject into a single artifact the viewer can grasp at a glance.', example: 'The Entire Stock Market in One Chart' },
    ],
  },
  {
    id: 'shape:blueprint', name: 'Blueprint / System',
    tagline: 'A replicable method, not motivation: a process the viewer can follow step by step.',
    mechanism: 'A system promises certainty of outcome through a defined procedure. It removes the fear of not knowing where to start, and "follow these steps" feels safer than "get inspired".',
    whatWorks: [
      'Use process language: blueprint, framework, playbook, formula, step-by-step.',
      'Imply repeatability: the method worked once and will work again for the viewer.',
      'Name the obstacle the system removes, so the process feels purpose-built.',
      'Promise structure over inspiration. Viewers click systems when tips have failed them.',
    ],
    whatUndermines: [
      'Calling it a system but delivering loose tips with no order or repeatability.',
      'Skipping the starting point, so the "steps" assume knowledge the beginner lacks.',
      'Over-complicating the framework until it feels like more work than the problem.',
    ],
    templates: [
      { text: 'How to {result} Without {obstacle}', why: 'Defines the method by what it removes; the absent obstacle is the selling point, promising a path around the usual blocker.', example: 'How to Build Muscle Without a Gym' },
      { text: 'How to {do_thing} Like a Pro (Even If You Are a Beginner)', why: 'Sells a system that closes the skill gap instantly. The parenthetical erases the prerequisite that usually scares beginners off.', example: 'How to Edit Like a Pro (Even If You Are a Beginner)' },
      { text: 'How to {goal} on a Budget in {year}', why: 'Constrains the system by resources, making it feel realistic and current rather than aspirational.', example: 'How to Start a Studio on a Budget in 2026' },
      { text: 'How to Make {thing} Step-by-Step', why: 'The plainest blueprint promise. Explicit sequencing signals nothing is skipped and anyone can follow along.', example: 'How to Make Cold Brew Step-by-Step' },
      { text: 'The Exact {system} I Used to {result}', why: 'A proof-backed system: a specific, named method tied to a real result the creator achieved.', example: 'The Exact System I Used to Hit 1M Subscribers' },
      { text: 'The {number}-Step {framework} to {result}', why: 'Quantifies the system size up front, making it feel finite and followable.', example: 'The 5-Step Framework to Land Any Client' },
      { text: 'How I Would Learn {topic} (If I Started Over)', why: 'A do-over blueprint that uses hindsight to sequence the single optimal path.', example: 'How I Would Learn Coding (If I Started Over)' },
      { text: 'How to {result} in {timeframe} (Realistic Plan)', why: 'A time-bound plan with "realistic" defusing the skepticism a fixed schedule invites.', example: 'How to Get Fit in 90 Days (Realistic Plan)' },
      { text: 'The {topic} Playbook for {audience}', why: 'Packages the method as a playbook tailored to one specific audience, not everyone.', example: 'The Cold Email Playbook for Freelancers' },
      { text: 'Copy My {system} for {result}', why: 'Invites direct replication; the command lowers the effort to start to almost zero.', example: 'Copy My Notion System for Productivity' },
      { text: 'From {start} to {result}: The Full Process', why: 'Frames the system as the complete journey between two states, leaving no gap unshown.', example: 'From Idea to Launch: The Full Process' },
    ],
  },
  {
    id: 'shape:identity', name: 'Identity / Challenge',
    tagline: 'About the viewer, not the topic. It makes them feel seen or calls them out.',
    mechanism: 'Self-relevance is the strongest attention trigger. When a title is about who the viewer is or wants to be, clicking becomes an act of identity, not just curiosity about a subject.',
    whatWorks: [
      'Use "you" / "your" so the viewer is the subject of the title.',
      'Name a specific behavior or aspiration the target viewer recognizes in themselves.',
      'Mirror an identity they aspire to or confront one they fear.',
      'Make the stakes personal: their result, their time, their self-image.',
    ],
    whatUndermines: [
      'Generic "you" that could apply to anyone, which stops feeling personal.',
      'Calling out the wrong audience, so the right viewer does not feel addressed.',
      'Shaming without offering a path forward, which repels instead of pulling in.',
    ],
    templates: [
      { text: "The Real Reason You're Not {goal}", why: 'Diagnoses the viewer personally and withholds the cause, making the click feel like the answer to their specific stuckness.', example: "The Real Reason You're Not Losing Weight" },
      { text: "If You {behavior}, You're Wasting {resource}", why: 'A conditional call-out that self-selects. Only viewers who do the behavior feel addressed, which makes the hit land hard.', example: "If You Check Your Phone First Thing, You're Wasting Your Morning" },
      { text: "You're Not {label}, You're {reframe}", why: "Reframes the viewer's harsh self-judgment, offering relief through a kinder, truer label.", example: "You're Not Lazy, You're Overwhelmed" },
      { text: 'What Your {thing} Says About You', why: 'Turns a mundane detail into an identity readout, making the topic about the viewer personally.', example: 'What Your Morning Routine Says About You' },
      { text: "If You're {identity}, Watch This", why: 'Directly hails one specific segment so only its members feel addressed.', example: "If You're in Your 20s, Watch This" },
      { text: 'The Type of Person Who {result}', why: 'Describes an aspirational archetype, so the click is trying on the identity the viewer wants.', example: 'The Type of Person Who Actually Gets Rich' },
      { text: "Signs You're {state} (And Don't Know It)", why: 'A self-diagnosis checklist with a hidden-truth twist. The viewer must look to rule themselves out.', example: "Signs You're Burned Out (And Don't Know It)" },
      { text: 'Why You {behavior} (And How to Stop)', why: "Explains the viewer's own behavior back to them, then promises the fix.", example: 'Why You Procrastinate (And How to Stop)' },
      { text: 'This Is for the {identity} Who {struggle}', why: 'A dedication that flatters and includes a specific struggling group, making them feel seen.', example: 'This Is for the Creator Who Feels Invisible' },
      { text: 'How to Become the Person Who {does_thing}', why: 'Frames change as identity transformation rather than task completion.', example: 'How to Become the Person Who Works Out Every Day' },
      { text: "Are You {behavior}? Here's What It Means", why: 'A direct yes/no question that pulls the viewer to self-check before they can resist.', example: "Are You Addicted to Your Phone? Here's What It Means" },
    ],
  },
  {
    id: 'shape:authority_pain', name: 'Authority + Pain',
    tagline: 'Proof first, pain second: a credential that earns trust, aimed at a hurt the viewer feels.',
    mechanism: 'Before believing advice, viewers ask "why should I listen to you?". Leading with proof answers that instantly, and tying it to a recognized pain makes the expertise feel aimed directly at them.',
    whatWorks: [
      'Lead with specific proof: a title, a result, a number of years, a from-to.',
      'Follow the credential immediately with a pain the audience already feels.',
      'Prefer concrete authority (a role, a measurable result) over vague "expert".',
      'Use first-person proof ("I built", "I went from") as earned credibility.',
    ],
    whatUndermines: [
      'Vague authority ("as a professional") that proves nothing specific.',
      'Credential with no pain attached, so it reads as a brag, not a benefit.',
      'Proof the audience cannot verify or relate to, which breeds suspicion.',
    ],
    templates: [
      { text: 'I Went From {starting_point} to {result} in {timeframe}', why: 'The proof IS the transformation. A concrete from-to in a set time is self-evidencing credibility no title alone can fake.', example: 'I Went From 0 to 100K Subscribers in 6 Months' },
      { text: 'I Built a {thing} From Scratch in {timeframe}', why: 'Authority through demonstrated execution. Building it yourself proves the know-how more than claiming it.', example: 'I Built a PC From Scratch in 24 Hours' },
      { text: '{role} Explains: {pain}', why: 'Leads with a role credential then names the pain directly. The colon makes the authority the headline.', example: 'Accountant Explains: Money Habits Keeping You Poor' },
      { text: '{number} Years as a {role}: What I Learned', why: 'Uses tenure as the credential. Time served is the proof behind the lessons.', example: '10 Years as a Nurse: What I Learned' },
      { text: "As a {role}, Here's What I'd Never Do", why: 'Insider authority via a personal red line, which reads as candid expertise rather than advice.', example: "As a Chef, Here's What I'd Never Order" },
      { text: "I Studied {number} {things} So You Don't Have To", why: 'Labor is the credential. The volume of work done is the proof you can trust the takeaways.', example: "I Studied 100 Viral Videos So You Don't Have To" },
      { text: "What {role}s Won't Tell You About {topic}", why: 'Frames withheld insider knowledge as a pain the pros conceal, with their authority implied.', example: "What Dentists Won't Tell You About Whitening" },
      { text: "I Made {result}. Here's Exactly How", why: 'Leads with the result as self-evidencing proof, then promises the exact method behind it.', example: "I Made $100K From One Video. Here's Exactly How" },
      { text: "The {topic} Advice I'd Give My Younger Self", why: 'Earned-hindsight authority. The credibility is the regret of having learned it the hard way.', example: "The Money Advice I'd Give My Younger Self" },
      { text: '{number} {role}s Reveal Their {secret}', why: 'Borrows authority from many experts at once, compounding credibility across a group.', example: '7 Millionaires Reveal Their Daily Habits' },
    ],
  },
  {
    id: 'shape:novelty', name: 'Novelty',
    tagline: 'Something new, hidden, or just changed: information you do not already have.',
    mechanism: 'Both the algorithm and human attention reward new information. Signaling recency, secrecy, or a break from the known triggers the urge to stay current and not miss out.',
    whatWorks: [
      'Signal freshness through language ("just changed", "never seen", "new") not only a year.',
      'Imply insider or hidden knowledge the viewer does not have access to.',
      'Promise a reveal, such as a secret or a hidden cause, with a clear payoff.',
      'Tie novelty to something the viewer already follows, so the change feels relevant.',
    ],
    whatUndermines: [
      'Year-stamped novelty that decays the moment the calendar turns.',
      'Claiming "secret" or "never seen" for common, easily-found information.',
      'Novelty for its own sake with no payoff once the curiosity is opened.',
    ],
    templates: [
      { text: 'The Secret Behind {topic}', why: 'Promises hidden mechanics. The pull is access to a cause that is deliberately not common knowledge.', example: 'The Secret Behind Viral Thumbnails' },
      { text: "{topic} Hacks You've Never Seen Before", why: 'Stakes its novelty on unfamiliarity specifically, daring even informed viewers to find something new.', example: "Notion Hacks You've Never Seen Before" },
      { text: 'Update: {topic}. Everything That Just Changed', why: 'Pure recency. The value is being current on a moving topic, with "just changed" implying you are behind without it.', example: "Update: YouTube's Algorithm. Everything That Just Changed" },
      { text: 'What Happens When You {do_thing}?', why: 'Opens a novelty loop around an untested outcome; the unknown result is the whole hook.', example: 'What Happens When You Stop Drinking Coffee?' },
      { text: "{topic} Is Changing. Here's What's Next", why: 'Forward-looking novelty. The value is foresight, being early to where things are heading.', example: "Search Is Changing. Here's What's Next" },
      { text: 'The New Way to {do_thing}', why: 'Frames a method as the current replacement for the old, making the familiar feel outdated.', example: 'The New Way to Take Notes' },
      { text: 'Nobody Is Talking About {topic}', why: 'Underground novelty. The appeal is being in on something before it is widely known.', example: 'Nobody Is Talking About This AI Tool' },
      { text: 'I Found the {superlative} {thing}', why: 'Discovery novelty. The creator surfaces something rare so the viewer does not have to hunt.', example: 'I Found the Best Free Font Site' },
      { text: "Inside {place} You've Never Seen", why: 'Access novelty: entry to a hidden interior the viewer could not reach themselves.', example: "Inside the Factory You've Never Seen" },
      { text: "This {thing} Shouldn't Exist", why: 'Anomaly novelty: curiosity sparked by something that seems impossible or absurd.', example: "This Camera Shouldn't Exist" },
      { text: 'The Untold Story of {topic}', why: "Hidden-history novelty. It promises a known thing's backstory the viewer has never heard.", example: 'The Untold Story of the Floppy Disk' },
    ],
  },
  {
    id: 'shape:versus', name: 'Versus / Comparison',
    tagline: 'A binary the viewer already has an opinion on, and wants settled.',
    mechanism: 'Comparisons are inherently clickable because the viewer arrives with a prior and seeks validation or a challenge. Genuine uncertainty about the winner creates the tension that holds attention.',
    whatWorks: [
      'Pick matchups where the outcome feels genuinely uncertain.',
      'Frame a clear question the video will resolve ("which is actually better?").',
      'Choose two options the audience is personally invested in choosing between.',
      'Promise a verdict, not just a side-by-side, so there is a payoff to wait for.',
    ],
    whatUndermines: [
      'Lopsided matchups where one answer is obviously right, killing the suspense.',
      'Comparing things no one is torn about, so there is no prior to satisfy.',
      'Refusing to pick a winner, which betrays the promise the frame made.',
    ],
    templates: [
      { text: '{option_a} vs {option_b}: Which Is Actually Better?', why: 'The pure head-to-head; "actually" promises a real verdict that cuts through the usual hedging.', example: 'iPhone vs Android: Which Is Actually Better?' },
      { text: 'Can {option_a} Beat {option_b}?', why: 'Frames the comparison as an underdog challenge, injecting uncertainty by casting one side as the contender.', example: 'Can a $100 Camera Beat a $3,000 One?' },
      { text: 'Pros & Cons of {topic}', why: 'A balanced-ledger frame for viewers weighing a decision, promising fairness rather than a hot take.', example: 'Pros & Cons of Working From Home' },
      { text: 'The {category} Tier List (From Worst to Best)', why: 'Scales the comparison to a whole field and rank-orders it, turning many options into one definitive verdict.', example: 'The Streaming Service Tier List (From Worst to Best)' },
      { text: 'Review: Is {product} Worth the Hype?', why: 'Pits a product against its own reputation; the tension is hype versus reality, not item versus item.', example: 'Review: Is the Cybertruck Worth the Hype?' },
      { text: '{cheap} vs {expensive} {product}: Can You Tell the Difference?', why: 'A blind-test frame where the tension is whether price even matters, not which is nicer.', example: '$5 vs $500 Headphones: Can You Tell the Difference?' },
      { text: "I Tested Every {category} So You Don't Have To", why: 'Exhaustive comparison. The labor of testing all of them is the value the viewer buys.', example: "I Tested Every Budget Laptop So You Don't Have To" },
      { text: 'Is {option} Still Worth It in {year}?', why: 'Re-evaluates a known option against the present, where the prior is "it used to be the one".', example: 'Is the iPad Still Worth It in 2026?' },
      { text: '{old_way} vs {new_way}: Which Actually Wins?', why: 'Pits an established method against a challenger paradigm, not two products.', example: 'Notion vs Pen and Paper: Which Actually Wins?' },
      { text: 'Why I Switched From {option_a} to {option_b}', why: 'A personal defection that implies a verdict and invites the viewer to reconsider their own choice.', example: 'Why I Switched From iPhone to Android' },
      { text: 'The Truth About {option_a} vs {option_b}', why: 'Promises to cut through the hype on a tired debate both camps are loud about.', example: 'The Truth About Mac vs PC' },
    ],
  },
  {
    id: 'shape:warning', name: 'Warning / Mistake',
    tagline: 'You may be doing it wrong right now, and it is costing you.',
    mechanism: 'Loss aversion makes a present-tense threat more compelling than a future gain. The fear of currently making an error the viewer cannot see drives the click to check themselves.',
    whatWorks: [
      'Name a specific behavior the viewer plausibly does right now.',
      'Attach a cost they care about, so the mistake feels expensive to ignore.',
      'Offer the correction, so the warning leads somewhere actionable.',
      'Use present tense, like "killing", "ruining", "wasting", to make it active and current.',
    ],
    whatUndermines: [
      'Generic warnings ("avoid these mistakes") with no specific, recognizable behavior.',
      'Warning about something the viewer does not actually do, so it does not apply to them.',
      'Fear with no fix, which leaves the viewer anxious and clicking away.',
    ],
    templates: [
      { text: 'Why {thing} Is Secretly Ruining Your {outcome}', why: 'The "secretly" makes the threat invisible and ongoing. The danger is something the viewer cannot yet see, so they must look.', example: 'Why Your Morning Coffee Is Secretly Ruining Your Sleep' },
      { text: 'Stop Doing {habit}. Do This Instead', why: 'Pairs a direct command to halt a current habit with an immediate replacement, so the warning resolves into a fix.', example: 'Stop Doing Steady-State Cardio. Do This Instead' },
      { text: "{number} Signs You're {bad_state}", why: 'A symptom checklist. The viewer reads to find out whether the problem already applies to them.', example: "5 Signs You're Burning Out at Work" },
      { text: "You're {doing_thing} Wrong (Here's the Fix)", why: 'A flat accusation that you are doing an everyday thing wrong, resolved immediately by the fix.', example: "You're Washing Your Face Wrong (Here's the Fix)" },
      { text: 'The Biggest Mistake {audience} Make', why: 'Singular and definitive: one dominant error, which feels more urgent than a list of many.', example: 'The Biggest Mistake New Investors Make' },
      { text: 'Avoid These {topic} Traps Before {action}', why: 'A pre-emptive warning timed to a specific upcoming decision, when stakes are highest.', example: 'Avoid These Lease Traps Before Renting' },
      { text: "Don't {action} Until You Watch This", why: 'A gatekeeping warning that raises the stakes on an imminent action the viewer is about to take.', example: "Don't Buy a Car Until You Watch This" },
      { text: 'This Common {habit} Is {harm}', why: 'Names an everyday, harmless-seeming behavior as actively harmful. The danger is its ordinariness.', example: 'This Common Sleep Habit Is Aging You' },
      { text: 'Warning: {thing} Could Be {consequence}', why: 'Explicit alert framing that states the threat outright rather than implying it.', example: 'Warning: Your Password Could Be Worthless' },
      { text: 'What {behavior} Is Doing to Your {outcome}', why: 'Reveals an ongoing hidden harm already in progress, which the viewer cannot see for themselves.', example: 'What Sitting All Day Is Doing to Your Spine' },
    ],
  },
  {
    id: 'shape:contrarian', name: 'Contrarian / Counterintuitive',
    tagline: 'The conventional wisdom is wrong, and this proves it.',
    mechanism: 'A claim that contradicts a held belief creates cognitive dissonance the brain cannot leave unresolved. Unlike a warning about your behavior, this challenges the advice everyone accepts, and the click is the resolution.',
    whatWorks: [
      'Contradict a belief the target viewer actually holds, not a strawman.',
      'Target accepted wisdom, not the viewer personally, so it provokes without shaming.',
      'Promise the argument or proof, since the video must actually deliver the reversal.',
      'Make the contradiction sharp and unambiguous, not a soft "it depends".',
    ],
    whatUndermines: [
      'Being contrarian about something no one believes, so there is nothing to overturn.',
      'Failing to deliver the counterintuitive case, which loses viewers fast.',
      'Manufactured outrage with no substance behind the reversal.',
    ],
    templates: [
      { text: 'The Harsh Truth About {topic} That No One Tells You', why: 'Frames itself as suppressed knowledge. The contradiction is positioned as a truth others avoid saying, raising its stakes.', example: 'The Harsh Truth About Passive Income That No One Tells You' },
      { text: 'Why Everything You Know About {topic} Is Wrong', why: 'The maximal reversal. It does not challenge one belief but the viewer\'s entire model, demanding they look to restore it.', example: 'Why Everything You Know About Productivity Is Wrong' },
      { text: 'How {person} Tricked the Entire World', why: 'Reframes a widely-accepted story as a deception, inviting the viewer in on a reveal that overturns the public narrative.', example: 'How a Tiny Startup Tricked the Entire World' },
      { text: 'This Video Will Change the Way You See {topic} Forever', why: 'Promises a permanent perspective shift rather than one fact. The payoff is a new lens, which is a bigger contrarian bet.', example: 'This Video Will Change the Way You See Money Forever' },
      { text: '"{advice}" Is Bad Advice', why: 'Negates one specific, widely-repeated tip by name rather than a vague consensus.', example: '"Follow Your Passion" Is Bad Advice' },
      { text: 'Why {best_practice} Is Actually Hurting You', why: 'Overturns an accepted best practice, claiming the thing everyone recommends backfires.', example: 'Why Morning Routines Are Actually Hurting You' },
      { text: '{underdog} Is Better Than {favorite} (And I Can Prove It)', why: 'Champions the unpopular choice with an explicit proof promise to back the provocation.', example: 'Cheap Coffee Is Better Than Expensive Coffee (And I Can Prove It)' },
      { text: 'The Case Against {popular_thing}', why: 'A structured, argued takedown of something the audience broadly likes.', example: 'The Case Against Side Hustles' },
      { text: "{claim}. Here's Why.", why: 'States the paradox as a flat fact, then promises the reasoning that resolves it.', example: "Working Less Made Me More Money. Here's Why." },
      { text: "You Don't Need {requirement} to {goal}", why: 'Removes a believed prerequisite, freeing the viewer from a gate they assumed was real.', example: "You Don't Need Talent to Go Viral" },
    ],
  },
  {
    id: 'shape:formats', name: 'Formats',
    tagline: 'Recurring video formats viewers seek out by name. The container is the draw.',
    mechanism: 'Some titles work because the format itself is the promise. Viewers actively look for these container types (experiments, reviews, behind-the-scenes), and naming the format signals exactly what kind of watch they are getting. The click is genre recognition, anchored by a specific subject inside it.',
    whatWorks: [
      'Name the format plainly so viewers who want that container find it.',
      'Make the specifics concrete: the duration, the price, the challenge, the topic.',
      'Pair the format with a real stake or outcome so it is not just "a vlog".',
      'Use formats your audience already returns for, building a series habit.',
    ],
    whatUndermines: [
      'Leaning on the format alone with no specific, interesting subject inside it.',
      'Picking a passive genre when the topic does not earn attention on its own.',
      'Treating the format as the whole idea instead of a container for a real hook.',
    ],
    templates: [
      { text: "I Tried {thing} for {duration} (Here's What Happened)", why: 'The personal-experiment format: the creator runs a test so the viewer does not have to, with the unknown result as the payoff.', example: "I Tried Cold Showers for 30 Days (Here's What Happened)" },
      { text: 'I Spent {duration} {doing_thing}', why: 'The immersion format: an extended commitment to one activity, where the sheer duration is the feat.', example: 'I Spent 100 Hours Learning to Draw' },
      { text: 'I Copied the #1 {person} in the World (And This Happened)', why: 'The replication experiment: copy a proven approach exactly and report what happens, borrowing the original\'s authority as the setup.', example: 'I Copied the #1 YouTuber in the World (And This Happened)' },
      { text: 'I Survived {challenge} in {location}', why: 'The endurance-challenge format: the appeal is watching someone make it through an extreme the viewer would never attempt.', example: 'I Survived 100 Hours in the Arctic' },
      { text: '{number} Levels of {thing}: From Beginner to Expert', why: 'The levels format: the same thing demonstrated across skill tiers, with escalating difficulty as the through-line.', example: '5 Levels of Pasta: From Beginner to Expert' },
      { text: '{habit} for 30 Days: A Realistic Before & After', why: 'The time-boxed challenge format with an honest arc; "realistic" pre-empts the skepticism polished transformation videos invite.', example: 'Waking Up at 5AM for 30 Days: A Realistic Before & After' },
      { text: 'I Paid {price} for {product}. Was It Worth It?', why: 'The spend-and-verdict format: a concrete price sets up a worth-it question the viewer wants answered before buying themselves.', example: 'I Paid $5,000 for a Mystery Box. Was It Worth It?' },
      { text: 'Unboxing the New {product}', why: 'The unboxing format: a first-contact reveal of a new product, opened on camera before most viewers can get one.', example: 'Unboxing the New iPhone' },
      { text: 'My Experience With {topic}', why: 'The first-hand account format: honest, lived experience for viewers researching a decision. No grand claim, just what it was really like.', example: 'My Experience With LASIK Surgery' },
      { text: 'A Day in the Life of a {role}', why: 'The day-in-the-life format: one day compressed into a watch, letting viewers try on a role or routine they are curious about.', example: 'A Day in the Life of an ER Nurse' },
      { text: 'My Morning Routine: {context}', why: 'The routine format: a structured look at how someone starts their day, watched for ideas to copy.', example: 'My Morning Routine: 5AM Edition' },
      { text: '{space} Setup Tour {year} (Minimalist & Aesthetic)', why: 'The tour format: a guided walkthrough of a space, watched for inspiration and gear.', example: 'My Desk Setup Tour 2026 (Minimalist & Aesthetic)' },
      { text: 'Behind the Scenes: How We Make {content}', why: 'The process-reveal format: pulls back the curtain on how something gets made, for viewers who only see the finished result.', example: 'Behind the Scenes: How We Make Our Animations' },
      { text: 'Reacting to {content}', why: 'The reaction format: an unscripted first take on something, where the genuine response is the watch.', example: 'Reacting to My First Ever Video' },
      { text: '{duration} of {content} (No Ads)', why: 'The long-form ambient format: the value is uninterrupted quantity to keep on in the background, with "no ads" removing friction.', example: '10 Hours of Deep Focus Music (No Ads)' },
      { text: 'Q&A: Answering Your {topic} Questions', why: 'The audience-Q&A format: positions the creator as the one with answers and turns viewer questions into the content.', example: 'Q&A: Answering Your Freelancing Questions' },
      { text: 'Podcast Episode {number}: Featuring {guest}', why: 'The interview/podcast format: a conversation episode whose draw is the guest and the topics promised.', example: 'Podcast Episode 42: Featuring a Former NASA Engineer' },
      { text: 'The Rise and Fall of {person}', why: 'The retrospective format: the arc of something\'s rise and collapse, watched for the story and the lessons in the fall.', example: 'The Rise and Fall of Vine' },
    ],
  },
]

// ── Built-in template lookup (DB-free subset of the desktop helpers) ─────────
export interface BuiltinUiTemplate {
  id: string; text: string; why: string; example: string; shapeId: string; isBuiltin: true
}

export function builtinTemplatesForShape(shapeId: string): BuiltinUiTemplate[] {
  const s = BUILTIN_TITLE_SHAPES.find(x => x.id === shapeId)
  return s ? s.templates.map((t, i) => ({ id: `${shapeId}#${i}`, text: t.text, why: t.why, example: t.example, shapeId, isBuiltin: true as const })) : []
}
