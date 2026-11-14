import test from 'node:test';
import assert from 'node:assert/strict';
import { makeLook, inheritLook, atAge, sexOfName } from './looks.js';

const rng = seed => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

test('a baby takes after both parents', () => {
  const r = rng(42);
  const mum = { ...makeLook(r, 'f'), tone: .9, height: 1.06 }, dad = { ...makeLook(r, 'm'), tone: .2, height: .94 };
  for (let i = 0; i < 50; i++) {
    const kid = inheritLook(mum, dad, r);
    assert.ok(kid.tone > .2 && kid.tone < .9, 'skin tone between the parents');
    assert.ok([mum.hairColour, dad.hairColour].includes(kid.hairColour), 'hair colour from one parent');
    assert.ok(Math.abs(kid.height - 1) < .06, 'height near the parents');
  }
});

test('people grow up and grow old', () => {
  const look = makeLook(rng(7), 'm');
  look.beard = true;
  assert.ok(atAge(look, 0).baby && atAge(look, 0).size < .4);
  assert.ok(atAge(look, 8).child && !atAge(look, 8).beard, 'no beard on a boy');
  assert.ok(atAge(look, 8).size < atAge(look, 15).size && atAge(look, 15).size < atAge(look, 30).size);
  assert.equal(atAge(look, 30).grey, 0);
  assert.ok(atAge(look, 75).grey > .7, 'grey in old age');
  assert.equal(sexOfName('Grace Obi'), 'f');
  assert.equal(sexOfName('Kofi Mensah'), 'm');
});
