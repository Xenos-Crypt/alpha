// THE STORY (Story Mode). This file is the story itself, written as data so it is easy to write together:
// add a node, a choice or a variant here and the engine (chronicle.js) does the rest.
//
// THE PREMISE: ten years ago the Gates opened. In the first Gate the Hunter Association found a book, the
// Chronicle, and since that day it has foretold everything that happens in the country, word for word, a page a
// day. The Archive in the Capital keeps it, and its Keepers make sure the world follows the page.
// Three days ago you woke up in Ashford with no memory. The Chronicle has no page about you.
// It ties into the hidden story (story.js): the Chronicle has never written a single word about anything beyond
// the dome, and the Aegis Authority likes it that way. Players who find the truth beyond the mountains find
// that the book is silent about it (a variant).
//
// HOW IT BRANCHES:
//   - a node is one step of the story: something to do (an objective) or someone to talk to (with choices)
//   - choices lead to different nodes, so every branch has its own path and ending
//   - VARIANTS: the Chronicle says what should happen next ("chronicle"), but this is an open world: you can do
//     things the story never expected, or find things it didn't plan for. When you do, the story notices, the
//     Chronicle rewrites itself, and your path changes. Some variants jump you to a new path; others change
//     which choices you get later (flags).
//
// A node: { chapter, title, gate (the Gate in Ashford Park is open while you're here), chronicle (what the Chronicle says will happen), text (what you see),
//           objective: { text, at: place (go there), done(w, s) (or a test on the world) },
//           talk: { npc, text, choices: [{ text, to, set, reply, if(s) }] }, next, onEnter: 'action', end }
// w is the world as it is now (where you are, money, wanted level, dungeons cleared…); s is your story so far.

export const PLACES = {
  home: { name: 'your house', x: 20, z: 20, r: 14 },
  street: { name: 'the street outside your house', x: 20, z: 39, r: 6 },
  park: { name: 'Ashford Park', x: -20, z: 13, r: 9 },
  capital: { name: 'the Archive (National Museum, Capital)', x: 'capitalX', z: 'capitalZ', r: 14 },
  hq: { name: 'Hunter Association reception', x: 'hqX', z: 'hqZ', r: 8 },
  ghost: { name: 'Ghost Island', x: -80, z: 480, r: 30 },
  peak: { name: 'the summit of the Hidden Peak', x: -520, z: 1080, r: 40 },
};

export const PEOPLE = {
  mara: { name: 'Mara Okafor', who: 'your neighbour, a retired C-rank hunter', outfit: 0x8a3b3b, hair: 0x1b1410, skin: 0x7a4a2e, pants: 0x2d3142 },
  elias: { name: 'Keeper Elias Vane', who: 'a Keeper of the Chronicle', outfit: 0x2a2a3a, hair: 0xd8d2c4, skin: 0xe8c8a8, pants: 0x1c1c26 },
  hale: { name: 'Director Hale', who: 'head of the Hunter Association', outfit: 0x243c58, hair: 0x3a2a1e, skin: 0xc99a74, pants: 0x1c2f43 },
  juno: { name: 'Juno', who: 'a stranger who knows your name', outfit: 'player', hair: 'player', skin: 0xe0b896, pants: 0x1a1a22 },
};

export const NODES = {
  // ───────────────────────── PROLOGUE: UNWRITTEN ─────────────────────────
  p_wake: {
    chapter: 'Prologue: Unwritten', title: 'Waking up',
    chronicle: 'Day 3,651. A quiet morning in Ashford. Nothing of note.',
    text: 'You wake in a house in Ashford that is apparently yours. You don\'t remember arriving. You don\'t remember anything before three days ago. Your hands feel strange, as if something under the skin is waiting to be used.',
    objective: { text: 'Step outside your house', done: (w) => Math.hypot(w.x - 20, w.z - 20) > 15 },
    next: 'p_mara',
  },
  p_mara: {
    chapter: 'Prologue: Unwritten', title: 'The neighbour',
    chronicle: 'Mara Okafor tends her roses and speaks to no one.',
    text: 'A woman is waiting by your gate as if she has been there a while.',
    objective: { text: 'Talk to your neighbour', at: 'street' },
    talk: { npc: 'mara', at: 'street',
      text: '"So you\'re the one. Three days in that house and not a single page about you. I read the Chronicle every morning, love. Everyone on this street is in it. The postman, the kids, me and my roses. You\'re not. That doesn\'t happen."',
      choices: [
        { text: '"I don\'t remember anything before three days ago."', set: { honest: true }, reply: '"Then you\'re either very lucky or very unlucky. People who aren\'t written down don\'t stay unwritten for long."', to: 'p_page' },
        { text: '"I\'m just new here. Nothing interesting."', set: { secretive: true }, reply: '"Everyone\'s interesting to the Chronicle, love. That\'s what worries me."', to: 'p_page' },
        { text: '"What is the Chronicle?"', set: { curious: true }, reply: '"The book from the first Gate. It writes tomorrow before it happens. Ten years and it\'s never been wrong."', to: 'p_page' },
      ] },
  },
  p_page: {
    chapter: 'Prologue: Unwritten', title: 'Today\'s page',
    chronicle: 'At the edge of Ashford Park a Gate opens. No one enters it. It closes at dawn.',
    text: 'Mara hands you today\'s page, torn from her copy. "Ashford Park, today. A Gate. It says no one goes in. It\'s always right. Still, I\'d like to see it."',
    objective: { text: 'Go to Ashford Park, where the Chronicle says a Gate will open', at: 'park' },
    gate: true,   // the Gate is in the park from now on
    next: 'p_gate',
  },
  p_gate: {
    chapter: 'Prologue: Unwritten', title: 'The Gate that no one enters',
    chronicle: 'A Keeper stands at the Gate. No one enters it.',
    text: 'The Gate hums at the edge of the park, green light spilling over the grass. A thin man in a long grey coat stands in front of it, holding an open book.',
    objective: { text: 'Talk to the man guarding the Gate', at: 'park' }, gate: true,
    talk: { npc: 'elias', at: 'park',
      text: '"Keeper Elias Vane, of the Archive. You must be the blank page." He doesn\'t look up from the book. "The Chronicle says no one enters this Gate today. I am here to make sure the Chronicle is right. It always is. Please step back."',
      choices: [
        { text: 'Step back. "If the book says so."', set: { obeyed: true }, reply: '"Sensible. The Archive would like to meet you. Come to the Capital. We may be able to find your page."', to: 'a_archive' },
        { text: 'Walk past him into the Gate.', set: { breached: true }, reply: 'He doesn\'t try to stop you. He just writes something down, very fast.', to: 'b_breach' },
        { text: '"Shouldn\'t hunters deal with Gates? I\'ll go and get licensed."', set: { hunter: true }, reply: '"The Association. Of course. Director Hale will be thrilled. Go on, then. The Gate will still not be entered."', to: 'c_register' },
        { text: '"Show me your book."', if: s => s.flags.tornPage, set: { showedPage: true }, reply: 'You hold up the torn page from Ghost Island. Elias goes very still. "Where did you get this? That is my handwriting. I have never written it."', to: 'v_page_talk' },
      ] },
  },

  // ───────────────────────── PATH A: THE ARCHIVE (you obeyed) ─────────────────────────
  a_archive: {
    chapter: 'Chapter 1: The Archive', title: 'To the Capital',
    chronicle: 'The blank one obeys. The blank one comes to the Archive and is written.',
    text: 'The Gate closes at dawn, untouched, exactly as written. Elias is waiting for you in the Capital.',
    objective: { text: 'Travel to the Archive in the Capital', at: 'capital' },
    next: 'a_reading',
  },
  a_reading: {
    chapter: 'Chapter 1: The Archive', title: 'The reading room',
    chronicle: 'The blank one is shown their page.',
    text: 'Behind the museum\'s relics is a door, and behind the door is the Chronicle: a book as tall as you, its pages turning on their own.',
    talk: { npc: 'elias', at: 'capital',
      text: '"Ten years, and the Chronicle has written every person in this country. Every one but you." He turns to the newest page. Your name is there. You never told him your name. "It wrote you in at dawn. Do you want to read what it says you do next?"',
      choices: [
        { text: 'Read your page.', set: { readPage: true }, reply: 'The page says you will become a Keeper, and that you will be happy. Elias smiles. Somewhere in your chest, the waiting thing pulls away from the words.', to: 'a_end_keeper' },
        { text: 'Tear your page out.', set: { tore: true, villainSeed: true }, reply: 'It comes away in your hand. Every lamp in the Archive goes out. When they come back on, Elias is staring at the book. The next page is blank. So is the one after that.', to: 'a_end_torn' },
        { text: '"Who wrote it? Books don\'t write themselves."', if: s => s.flags.curious || s.flags.metJuno || s.flags.knowsBeyond, set: { askedAuthor: true }, reply: '"No one knows," he says, too quickly. Then, quietly: "There is handwriting under the print. It is not mine."', to: 'a_end_author' },
      ] },
  },
  a_end_keeper: { chapter: 'Chapter 1: The Archive', title: 'Written', end: 'You were written. The world follows the page again, for now. (Chapter 2 is being written. This branch continues as the Keeper path.)' },
  a_end_torn: { chapter: 'Chapter 1: The Archive', title: 'The blank pages', end: 'You tore the story, and the story stopped. For the first time in ten years, nobody knows what tomorrow brings. (Chapter 2 is being written. This branch continues as the Unwritten path.)' },
  a_end_author: { chapter: 'Chapter 1: The Archive', title: 'The hand under the print', end: 'Someone wrote the Chronicle. Someone is still writing it. (Chapter 2 is being written. This branch continues as the Author path.)' },

  // ───────────────────────── PATH B: THE BREACH (you entered the Gate) ─────────────────────────
  b_breach: {
    chapter: 'Chapter 1: The Breach', title: 'Inside',
    chronicle: '(The page tears here.) No one enters the Gate.',
    text: 'The Chronicle said no one would enter. You did. Inside, the air tastes of metal and something is moving.',
    objective: { text: 'Clear the Gate at Ashford Park', done: (w, s) => w.clearedStoryGate }, gate: true,
    next: 'b_after',
  },
  b_after: {
    chapter: 'Chapter 1: The Breach', title: 'The page that changed',
    chronicle: 'The Gate at Ashford Park was entered by one who is not written.',
    text: 'You step out into the park. Hunters in Association blue are waiting, and a broad man with a scar through one eyebrow.',
    talk: { npc: 'hale', at: 'park',
      text: '"Director Hale, Hunter Association. That Gate was E-rank on paper and S-rank on the inside, and you walked out of it." He holds up a page. It has changed: it now says one person entered. "Ten years, and this book has never been wrong. Until you. So: do I recruit you or arrest you?"',
      choices: [
        { text: '"Recruit me."', set: { recruited: true }, reply: '"Good answer. You\'re unlicensed, unranked and unwritten. You\'ll fit right in."', to: 'b_end_recruit' },
        { text: 'Run.', set: { ran: true, villainSeed: true }, reply: 'You run. Nobody chases you. Hale only shouts after you: "The book will find you again! It always does!"', to: 'b_end_run' },
        { text: '"There was someone else in there. Someone with my face."', if: s => s.flags.metJuno, reply: 'Hale\'s face goes grey. "Then there are two of you. And only one of you was ever supposed to exist."', to: 'b_end_two' },
      ] },
  },
  b_end_recruit: { chapter: 'Chapter 1: The Breach', title: 'Recruited', end: 'The Association has a new hunter who can do what the Chronicle says can\'t be done. (Chapter 2 is being written. This branch continues as the Hunter-of-Gates path.)' },
  b_end_run: { chapter: 'Chapter 1: The Breach', title: 'Off the page', end: 'You ran off the edge of the story. (Chapter 2 is being written. This branch continues as the Fugitive path.)' },
  b_end_two: { chapter: 'Chapter 1: The Breach', title: 'Two of you', end: 'There is another you. The Chronicle only has room for one. (Chapter 2 is being written. This branch continues as the Variant path.)' },

  // ───────────────────────── PATH C: THE ASSOCIATION (you went to get licensed) ─────────────────────────
  c_register: {
    chapter: 'Chapter 1: Licensed', title: 'The Association',
    chronicle: 'The blank one seeks a licence. The Association turns them away.',
    text: 'The Hunter Association\'s reception is in the frontier town. The Chronicle says they will turn you away.',
    objective: { text: 'Get your hunter licence at the Hunter Association reception', at: 'hq', done: (w) => w.licensed },
    next: 'c_hale',
  },
  c_hale: {
    chapter: 'Chapter 1: Licensed', title: 'Against the page',
    chronicle: 'The blank one is turned away.',
    text: 'They didn\'t turn you away. Your licence is still warm from the printer when a broad man with a scar through one eyebrow calls you over.',
    talk: { npc: 'hale', at: 'hq',
      text: '"Director Hale. This morning\'s page says we refused you. Yet here you are, licensed, with my signature on it. I don\'t remember signing it." He looks at you for a long moment. "There\'s a Gate in Ashford Park the Archive won\'t let anyone touch. I want to know why. Want a job?"',
      choices: [
        { text: '"I\'ll take it."', set: { haleJob: true }, reply: '"Good. Don\'t tell the Archive."', to: 'c_end_job' },
        { text: '"I\'d rather join a guild."', set: { guild: true }, reply: '"Free country. For now. The guild halls are down the road."', to: 'c_end_guild' },
      ] },
  },
  c_end_job: { chapter: 'Chapter 1: Licensed', title: 'Hale\'s hunter', end: 'You work for the one man in the country who has started to doubt the book. (Chapter 2 is being written. This branch continues as the Association path.)' },
  c_end_guild: { chapter: 'Chapter 1: Licensed', title: 'Guild hunter', end: 'You chose your own guild. The Chronicle hadn\'t written that either. (Chapter 2 is being written. This branch continues as the Guild path.)' },

  // ───────────────────────── VARIANT PATHS (reached by doing things off the page) ─────────────────────────
  v_outlaw: {
    chapter: 'Variant: Outlaw', title: 'Written in red',
    chronicle: 'The blank one is a criminal. The Keepers will correct this.',
    text: 'You broke the law, and the Chronicle has finally written you in, as a villain. The police are only the start; the Keepers will want to "correct" you.',
    objective: { text: 'Lose the police (get your wanted level back to zero)', done: (w) => w.wanted === 0 },
    next: 'v_outlaw_choice',
  },
  v_outlaw_choice: {
    chapter: 'Variant: Outlaw', title: 'Correction',
    chronicle: 'The Keeper finds the villain.',
    text: 'When the sirens fade, Elias is waiting for you, as if he always knew where you would end up.',
    talk: { npc: 'elias', at: 'here',
      text: '"The book wrote you as a villain the moment you broke the law. Funny. Until then it couldn\'t write you at all." He holds out a pen. "Sign the page, accept your part, and it all goes quiet. Or don\'t, and become something it can\'t predict."',
      choices: [
        { text: 'Sign the page.', set: { signed: true }, reply: 'The ink is warm. For a moment you remember a life you never lived.', to: 'resume' },
        { text: 'Snap the pen.', set: { unwritten: true, villainSeed: true }, reply: 'Elias sighs. "Then you\'re a Variant now. Officially." He writes one word: VARIANT.', to: 'resume' },
      ] },
  },
  v_page_talk: {
    chapter: 'Variant: The Torn Page', title: 'His own handwriting',
    chronicle: '(This page was never written.)',
    text: 'The page from Ghost Island is in Elias\'s handwriting, and it describes this exact moment.',
    talk: { npc: 'elias', at: 'park',
      text: '"\'The Keeper will be shown a page he has not yet written, and he will open the Gate himself.\'" He reads it twice. Then he looks at the Gate. "If I do this, the Chronicle is wrong about today. If I don\'t, this page is wrong. Either way, the book has been wrong."',
      choices: [
        { text: '"Open it. Come with me."', set: { eliasAlly: true, breached: true }, reply: 'He closes the book and steps into the light beside you.', to: 'b_breach' },
        { text: '"Burn the page."', set: { burned: true }, reply: 'The page doesn\'t burn. The ash falls back up into words.', to: 'a_archive' },
      ] },
  },
};

// VARIANTS: things you can do or find that the story didn't plan for. Each is checked all the time while it is
// active ('during' lists the chapters it can happen in). When one happens, the Chronicle rewrites itself: you
// see what changed, flags are set (they unlock or close choices later), and some jump you onto a new path.
export const VARIANTS = [
  { id: 'outlaw', title: 'Written in red', during: ['Prologue', 'Chapter 1'],
    note: 'You broke the law before the story gave you a reason. The Chronicle wrote you in as a villain.',
    when: (w) => w.wanted >= 2, set: { outlaw: true }, to: 'v_outlaw' },
  { id: 'earlyBreach', title: 'Through the Gate before anyone said so', during: ['Prologue'],
    note: 'The Chronicle said no one would enter the Gate at Ashford Park. Nobody had even told you about it yet, and you went in and cleared it. The page changed while you were inside.',
    when: (w) => w.clearedStoryGate, set: { breached: true, early: true }, to: 'b_after' },
  { id: 'tornPage', title: 'A page from the island', during: ['Prologue', 'Chapter 1'],
    note: 'On Ghost Island, under the bones, you found a torn page of the Chronicle in a Keeper\'s handwriting. It describes something that hasn\'t happened yet.',
    when: (w) => Math.hypot(w.x + 80, w.z - 480) < 30, set: { tornPage: true } },
  { id: 'metJuno', title: 'The other you', during: ['Prologue', 'Chapter 1'],
    note: 'You cleared three Gates before the story expected you to touch one. In the last one, someone with your face was waiting. She called herself Juno and said: "Wrong branch. Go back." Then she was gone.',
    when: (w) => w.dungeons >= 3, set: { metJuno: true }, meet: 'juno' },
  { id: 'peak', title: 'The Seventh Gate', during: ['Prologue', 'Chapter 1', 'Chapter 2'],
    note: 'From the summit of the Hidden Peak you saw it: a Gate in the sky, bigger than the city, closed. The Chronicle has never mentioned a Seventh Gate.',
    when: (w) => Math.hypot(w.x + 520, w.z - 1080) < 40 && w.y > 180, set: { sawSeventh: true } },
  { id: 'beyond', title: 'Nothing beyond the page', during: ['Prologue', 'Chapter 1', 'Chapter 2'],
    note: 'You found out there are lands beyond the mountains. You search the Chronicle for them: ten years of pages, and not one word about anything outside the dome. Someone made sure of that.',
    when: (w) => w.knowsTruth, set: { knowsBeyond: true } },
  { id: 'patron', title: 'Bought and paid for', during: ['Prologue', 'Chapter 1'],
    note: 'You got rich before the story said you would. A letter arrives from the Archive offering to buy your page, whatever it turns out to say.',
    when: (w) => w.gold >= 5000, set: { patron: true } },
];

export const START = 'p_wake';
