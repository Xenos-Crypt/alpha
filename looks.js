// LOOKS — what a resident looks like, as plain data (no 3D here, so the simulation and the tests can use it).
// Nobody's look is random at birth: a baby takes after both parents. people.js turns a look into a body.
export const HAIR_STYLES = { m: ['simpleparted', 'buzzed', 'long', 'simpleparted', 'buzzed'], f: ['long', 'buns', 'buzzedfemale', 'simpleparted', 'long'] };
// natural hair colours, darkest first; darker skin tends to darker hair
export const HAIR_COLOURS = [0x120d0a, 0x1f1611, 0x2e2017, 0x45301f, 0x5e4229, 0x7a5636, 0x9a7449, 0xb8935f, 0xd2b27a, 0x8a3b1f];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;

// ---- LOOKS (pure functions: also used by society.js and the tests) ------------------------------------
// most first names in A.T. say who you are; a few are worn by anyone
const F_NAMES = new Set('Amara Chloe Ella Grace Isla Kemi Maya Priya Sara Uma Zara Bisi Cara Fatima Hana Jade Lena Nia Pearl Sofia Vera Ada Bola Mia Ruth Tara Kira Nora'.split(' '));
const M_NAMES = new Set('Ben Dev Hassan Jamal Liam Noah Ravi Tom Victor Yusuf Aidan Ethan George Ibrahim Kofi Marcus Oscar Rhys Tunde Will Leo Omar Joel Luca Femi'.split(' '));
export const sexOfName = name => { const f = String(name || '').split(' ')[0]; return F_NAMES.has(f) ? 'f' : M_NAMES.has(f) ? 'm' : null; };

export function makeLook(r, given = null) {
  const coin = r() < .5 ? 'f' : 'm', sex = given || coin;
  // skin tone 0 (lightest) … 1 (darkest): A.T. is a mixed nation
  const tone = clamp(r() < .45 ? .55 + r() * .45 : r() * .6, 0, 1);
  const dark = Math.floor(clamp(tone * 6 + r() * 4 - 1.5, 0, HAIR_COLOURS.length - 2));
  return { sex, tone: +tone.toFixed(3), height: +(.94 + r() * .12).toFixed(3), build: +(.92 + r() * .16).toFixed(3),
    hair: Math.floor(r() * HAIR_STYLES[sex].length), hairColour: r() < .04 ? HAIR_COLOURS.length - 1 : HAIR_COLOURS.length - 2 - dark, beard: sex === 'm' && r() < .35 };
}
// a baby takes after both parents
export function inheritLook(a, b, r) {
  a ||= makeLook(r); b ||= makeLook(r);
  const sex = r() < .5 ? 'f' : 'm', from = r() < .5 ? a : b;
  return { sex, tone: +clamp(mix(a.tone, b.tone, .3 + r() * .4) + (r() - .5) * .06, 0, 1).toFixed(3),
    height: +clamp((a.height + b.height) / 2 + (r() - .5) * .06, .9, 1.1).toFixed(3), build: +clamp((a.build + b.build) / 2 + (r() - .5) * .08, .88, 1.12).toFixed(3),
    hair: Math.floor(r() * HAIR_STYLES[sex].length), hairColour: from.hairColour, beard: sex === 'm' && r() < .35, parents: true };
}
// what a look looks like at an age: size, grey hair, a beard only on grown men
export function atAge(look, age = 30) {
  const grow = age < 1 ? .3 : age < 4 ? .36 + age * .03 : age < 12 ? .48 + (age - 4) * .032 : age < 18 ? .74 + (age - 12) * .04 : 1;
  return { ...look, grow, size: grow * look.height * (look.sex === 'f' ? .955 : 1), grey: clamp((age - 48) / 30, 0, .9), beard: look.beard && age >= 18, child: age < 16, baby: age < 2 };
}

