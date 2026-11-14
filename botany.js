// BOTANY — every plant and animal in the parks is a real species with its proper name, and every one of them is
// a thing in the world with its own ID. Nothing is just "a flower":
//   flowers, shrubs and trees  ← grown by Rootstock Nurseries (young plants, bulbs and seed) and planted and
//                                looked after by Westhaven Parks & Gardens (the council's parks department)
//   park birds and the zoo     ← from the Wild A.T. Trust's breeding programmes; the mallards are wild
//   benches, railings, ramps…  ← made by the firms that make the material (Northwood Sawmills, Ironforge Steel…)
// Visitors can read the plant labels: walk up to a bed, a tree or an animal and its common name and botanical
// name show up; press E for the rest (family, where it comes from). The IDs themselves stay back-end only.
//
// IDs follow the one standard, CLASS-KIND-MADEOF-OWNER-SERIAL; for a living thing MADE OF is its genus:
//   PLT-FLW-TUL-GOV-…   a tulip in a council park          PLT-TRE-QUE-GOV-…  an English oak in a park
//   PLT-SHR-ROS-GOV-…   a rose bush                        CRE-BRD-PAV-GOV-…  a peacock
import * as THREE from 'three';
import { makeId } from './world-ids.js';

export const NURSERY = 'Rootstock Nurseries', PARKS = 'Westhaven Parks & Gardens', BREEDERS = 'Wild A.T. Trust';
const P = (code, kind, common, botanical, family, origin, colour) => ({ code, kind, common, botanical, family, origin, colour });
// kind: FLW a flower (each plant on its own), SHR a shrub, TRE a tree, PLM a palm
export const PLANTS = {
  // tulips: a cultivar to every row
  tApeldoorn: P('TUL', 'FLW', "Tulip 'Apeldoorn'", "Tulipa 'Apeldoorn'", 'Liliaceae', 'a Darwin hybrid bred in the Netherlands', 0xe63946),
  tGolden: P('TUL', 'FLW', "Tulip 'Golden Apeldoorn'", "Tulipa 'Golden Apeldoorn'", 'Liliaceae', 'a Darwin hybrid bred in the Netherlands', 0xffb703),
  tPink: P('TUL', 'FLW', "Tulip 'Pink Impression'", "Tulipa 'Pink Impression'", 'Liliaceae', 'a Darwin hybrid bred in the Netherlands', 0xff70a6),
  tWhite: P('TUL', 'FLW', "Tulip 'White Dream'", "Tulipa 'White Dream'", 'Liliaceae', 'a Triumph tulip bred in the Netherlands', 0xffffff),
  tPurple: P('TUL', 'FLW', "Tulip 'Purple Prince'", "Tulipa 'Purple Prince'", 'Liliaceae', 'a single early tulip', 0x9b5de5),
  tOrange: P('TUL', 'FLW', "Tulip 'Orange Emperor'", "Tulipa 'Orange Emperor'", 'Liliaceae', 'a Fosteriana tulip; its wild parent grows in Central Asia', 0xff8c42),
  tKings: P('TUL', 'FLW', "Tulip 'Kingsblood'", "Tulipa 'Kingsblood'", 'Liliaceae', 'a late single tulip', 0xd00000),
  tAngel: P('TUL', 'FLW', "Tulip 'Angélique'", "Tulipa 'Angélique'", 'Liliaceae', 'a double late, peony-flowered tulip', 0xffd6e0),
  tNight: P('TUL', 'FLW', "Tulip 'Queen of Night'", "Tulipa 'Queen of Night'", 'Liliaceae', 'a late single tulip, the darkest there is', 0x4a2c6b),
  tStrong: P('TUL', 'FLW', "Tulip 'Strong Gold'", "Tulipa 'Strong Gold'", 'Liliaceae', 'a Triumph tulip', 0xfee440),
  // roses (each bush is one plant)
  rIngrid: P('ROS', 'SHR', "Rose 'Ingrid Bergman'", "Rosa 'Ingrid Bergman'", 'Rosaceae', 'a hybrid tea rose bred in Denmark', 0xc1121f),
  rJekyll: P('ROS', 'SHR', "Rose 'Gertrude Jekyll'", "Rosa 'Gertrude Jekyll'", 'Rosaceae', 'an English shrub rose', 0xff4d6d),
  rQueen: P('ROS', 'SHR', "Rose 'Queen Elizabeth'", "Rosa 'Queen Elizabeth'", 'Rosaceae', 'a grandiflora rose', 0xffafcc),
  rIceberg: P('ROS', 'SHR', "Rose 'Iceberg'", "Rosa 'Iceberg'", 'Rosaceae', 'a floribunda rose bred in Germany', 0xfff1e6),
  rGraham: P('ROS', 'SHR', "Rose 'Graham Thomas'", "Rosa 'Graham Thomas'", 'Rosaceae', 'an English shrub rose', 0xffd166),
  rMunstead: P('ROS', 'SHR', "Rose 'Munstead Wood'", "Rosa 'Munstead Wood'", 'Rosaceae', 'an English shrub rose', 0x9d0208),
  rDawn: P('ROS', 'SHR', "Climbing rose 'New Dawn'", "Rosa 'New Dawn'", 'Rosaceae', 'a climbing rose, trained over the arches', 0xffd6e0),
  rDanse: P('ROS', 'SHR', "Climbing rose 'Danse du Feu'", "Rosa 'Danse du Feu'", 'Rosaceae', 'a climbing rose, trained over the arches', 0xe5383b),
  rAlbertine: P('ROS', 'SHR', "Rambling rose 'Albertine'", "Rosa 'Albertine'", 'Rosaceae', 'a rambling rose, trained over the arches', 0xffb4a2),
  // sunflowers and lavender
  sunflower: P('HEL', 'FLW', "Sunflower 'Russian Giant'", "Helianthus annuus 'Russian Giant'", 'Asteraceae', 'a giant annual; the wild sunflower is from North America', 0xffc300),
  lavender: P('LAV', 'SHR', "English lavender 'Hidcote'", "Lavandula angustifolia 'Hidcote'", 'Lamiaceae', 'a shrub from the western Mediterranean', 0x8e7cc3),
  // the glasshouse: tropical flowers and palms
  bougain: P('BOU', 'SHR', 'Bougainvillea', 'Bougainvillea glabra', 'Nyctaginaceae', 'a climber from Brazil', 0xff006e),
  strelitzia: P('STR', 'FLW', 'Bird of paradise', 'Strelitzia reginae', 'Strelitziaceae', 'from South Africa', 0xfb5607),
  allamanda: P('ALL', 'SHR', 'Golden trumpet', 'Allamanda cathartica', 'Apocynaceae', 'a climber from South America', 0xffbe0b),
  orchid: P('PHA', 'FLW', 'Moth orchid', 'Phalaenopsis amabilis', 'Orchidaceae', 'grows on trees in the rainforests of South-East Asia', 0x8338ec),
  hibiscus: P('HIB', 'SHR', 'Chinese hibiscus', 'Hibiscus rosa-sinensis', 'Malvaceae', 'from tropical Asia', 0xff4d6d),
  gardenia: P('GAR', 'SHR', 'Gardenia', 'Gardenia jasminoides', 'Rubiaceae', 'from southern China and Japan', 0xffffff),
  kentia: P('HOW', 'PLM', 'Kentia palm', 'Howea forsteriana', 'Arecaceae', 'from Lord Howe Island, Australia', 0x2f7f3a),
  // the cutting garden
  dahlia: P('DAH', 'FLW', "Dahlia 'Bishop of Llandaff'", "Dahlia 'Bishop of Llandaff'", 'Asteraceae', 'its wild parents are from Mexico', 0xe63946),
  zinnia: P('ZIN', 'FLW', 'Zinnia', "Zinnia elegans 'Benary's Giant Golden Yellow'", 'Asteraceae', 'an annual from Mexico', 0xffb703),
  cosmos: P('COS', 'FLW', "Cosmos 'Sensation'", "Cosmos bipinnatus 'Sensation'", 'Asteraceae', 'an annual from Mexico', 0xff70a6),
  snapdragon: P('ANT', 'FLW', "Snapdragon 'Royal Bride'", "Antirrhinum majus 'Royal Bride'", 'Plantaginaceae', 'from the Mediterranean', 0xffffff),
  verbena: P('VER', 'FLW', 'Purpletop vervain', 'Verbena bonariensis', 'Verbenaceae', 'from South America', 0x9b5de5),
  calendula: P('CAL', 'FLW', 'Pot marigold', 'Calendula officinalis', 'Asteraceae', 'from southern Europe', 0xff8c42),
  cornflower: P('CEN', 'FLW', 'Cornflower', 'Centaurea cyanus', 'Asteraceae', 'a wildflower of European cornfields', 0x4cc9f0),
  sweetwill: P('DIA', 'FLW', 'Sweet William', 'Dianthus barbatus', 'Caryophyllaceae', 'from the mountains of southern Europe', 0xf72585),
  // round the fountain
  pansy: P('VIO', 'FLW', 'Garden pansy', 'Viola × wittrockiana', 'Violaceae', 'a garden hybrid first bred in England', 0x9b5de5),
  // the Grand Park's formal bedding
  geranium: P('PEL', 'FLW', 'Zonal geranium', 'Pelargonium × hortorum', 'Geraniaceae', 'its wild parents are from South Africa', 0xff3b6b),
  marigold: P('TAG', 'FLW', 'French marigold', 'Tagetes patula', 'Asteraceae', 'from Mexico and Guatemala', 0xffb703),
  petunia: P('PET', 'FLW', 'Petunia', 'Petunia × atkinsiana', 'Solanaceae', 'its wild parents are from South America', 0x8a5cff),
  nasturtium: P('TRO', 'FLW', 'Nasturtium', 'Tropaeolum majus', 'Tropaeolaceae', 'from the Andes', 0xff922b),
  alyssum: P('LOB', 'FLW', 'Sweet alyssum', 'Lobularia maritima', 'Brassicaceae', 'from the Mediterranean coast', 0xffffff),
  chinapink: P('DIA', 'FLW', 'China pink', 'Dianthus chinensis', 'Caryophyllaceae', 'from China and Korea', 0xe63946),
  lobelia: P('LOB', 'FLW', 'Trailing lobelia', 'Lobelia erinus', 'Campanulaceae', 'from southern Africa', 0x4dabf7),
  yew: P('TAX', 'SHR', 'English yew (clipped hedge)', 'Taxus baccata', 'Taxaceae', 'native to Europe; the hedge is clipped twice a year', 0x2f6b2a),
  reeds: P('PHR', 'FLW', 'Common reed', 'Phragmites australis', 'Poaceae', 'a wild reed of lake shores', 0x6b8a3a),
  // trees (the shape each is drawn with is in TREE_SHAPE)
  oak: P('QUE', 'TRE', 'English oak', 'Quercus robur', 'Fagaceae', 'native across Europe', 0x4a7a3c),
  birch: P('BET', 'TRE', 'Silver birch', 'Betula pendula', 'Betulaceae', 'native across Europe and Asia', 0x6f9a4a),
  pine: P('PIN', 'TRE', 'Scots pine', 'Pinus sylvestris', 'Pinaceae', 'native from Scotland to Siberia', 0x2f5a35),
  palm: P('PHO', 'PLM', 'Canary Island date palm', 'Phoenix canariensis', 'Arecaceae', 'from the Canary Islands', 0x3f7e49),
  cherry: P('PRU', 'TRE', "Japanese cherry 'Kanzan'", "Prunus serrulata 'Kanzan'", 'Rosaceae', 'a flowering cherry from Japan', 0xf4a6c6),
  maple: P('ACE', 'TRE', "Japanese maple 'Bloodgood'", "Acer palmatum 'Bloodgood'", 'Sapindaceae', 'from Japan and Korea', 0x9b2226),
  willow: P('SAL', 'TRE', 'Weeping willow', 'Salix babylonica', 'Salicaceae', 'from northern China', 0x8fae4a),
  cypress: P('CUP', 'TRE', 'Italian cypress', 'Cupressus sempervirens', 'Cupressaceae', 'from the eastern Mediterranean', 0x2e4a2a),
  beech: P('FAG', 'TRE', 'Copper beech', "Fagus sylvatica 'Purpurea'", 'Fagaceae', 'a purple-leaved form of the European beech', 0x6b2f3f),
};
// the shape trees.js draws each tree species with
export const TREE_SHAPE = { oak: 'oak', birch: 'birch', pine: 'pine', palm: 'palm', cherry: 'cherry', maple: 'maple', willow: 'willow', cypress: 'cypress', beech: 'beech' };

const A = (code, kind, common, scientific, origin) => ({ code, kind, common, scientific, origin });
// kind: BRD bird, MAM mammal, REP reptile, INS insect
export const ANIMALS = {
  duck: A('ANA', 'BRD', 'Mallard', 'Anas platyrhynchos', 'wild: mallards fly in and nest by the water'),
  swan: A('CYG', 'BRD', 'Mute swan', 'Cygnus olor', 'kept by the park'),
  peacock: A('PAV', 'BRD', 'Indian peafowl', 'Pavo cristatus', 'from India and Sri Lanka'),
  flamingo: A('PHO', 'BRD', 'Greater flamingo', 'Phoenicopterus roseus', 'from Africa, southern Europe and Asia'),
  ostrich: A('STR', 'BRD', 'Common ostrich', 'Struthio camelus', 'from Africa'),
  giraffe: A('GIR', 'MAM', 'Giraffe', 'Giraffa camelopardalis', 'from the African savanna'),
  zebra: A('EQU', 'MAM', 'Plains zebra', 'Equus quagga', 'from eastern and southern Africa'),
  elephant: A('LOX', 'MAM', 'African bush elephant', 'Loxodonta africana', 'from Africa'),
  lion: A('PAN', 'MAM', 'Lion', 'Panthera leo', 'from Africa'),
  monkey: A('SAP', 'MAM', 'Tufted capuchin', 'Sapajus apella', 'from the Amazon rainforest'),
  tortoise: A('ALD', 'REP', 'Aldabra giant tortoise', 'Aldabrachelys gigantea', 'from the Aldabra atoll in the Indian Ocean'),
  hermann: A('TES', 'REP', "Hermann's tortoise", 'Testudo hermanni', 'from southern Europe'),
  pigeon: A('COL', 'BRD', 'Feral pigeon', 'Columba livia domestica', 'wild: they live on the city roofs'),
  sparrow: A('PAS', 'BRD', 'House sparrow', 'Passer domesticus', 'wild'),
  seagull: A('LAR', 'BRD', 'Herring gull', 'Larus argentatus', 'wild: from the coast'),
  squirrel: A('SCI', 'MAM', 'Grey squirrel', 'Sciurus carolinensis', 'wild'),
  bee: A('BOM', 'INS', 'Buff-tailed bumblebee', 'Bombus terrestris', 'wild'),
  dog: A('CAN', 'MAM', 'Dog', 'Canis familiaris', 'a pet, owned by a resident'),
  cat: A('FEL', 'MAM', 'Cat', 'Felis catus', 'a pet, owned by a resident'),
  brimstone: A('GON', 'INS', 'Brimstone butterfly', 'Gonepteryx rhamni', 'wild'),
  peacockfly: A('AGL', 'INS', 'Peacock butterfly', 'Aglais io', 'wild'),
  commonblue: A('POL', 'INS', 'Common blue butterfly', 'Polyommatus icarus', 'wild'),
  smallwhite: A('PIE', 'INS', 'Small white butterfly', 'Pieris rapae', 'wild'),
  orangetip: A('ANT', 'INS', 'Orange-tip butterfly', 'Anthocharis cardamines', 'wild'),
};

// the shared lists every park adds to; the world registry reads them (main.js passes them to world-ids)
export const LIFE = { things: [], plants: [] };

// One per park. Plants, trees, animals and fixtures each get an ID; labels go up for visitors.
export function makeBotany(ctx, park) {
  const label = (x, z, r, text, detail, follow) => {
    const it = { pos: follow || new THREE.Vector3(x, 0, z), r, label: '🏷️ ' + text, action: () => ctx.toast?.(detail), plantLabel: true };
    ctx.interactables?.push(it); return it;
  };
  const detailOf = (s, where) => `${s.common} (${s.botanical}). Family ${s.family}; ${s.origin}. Grown by ${NURSERY}, planted ${where ? 'in ' + where : 'here'} by ${PARKS}.`;
  // a bed (or row) of one species: each plant is recorded (its ID is worked out from where it grows), the bed
  // itself gets an ID, and label stakes go up along it, one every `every` metres
  function bed(key, x0, x1, z0, z1, where, { every = 14, plants = [] } = {}) {
    const s = PLANTS[key]; if (!s) throw new Error('unknown plant ' + key);
    for (const [x, z] of plants) LIFE.plants.push({ x, z, key, owner: 'GOV' });
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    LIFE.things.push({ cls: 'LND', kind: 'BED', mat: s.code, owner: 'GOV', seed: `bed:${park}:${cx.toFixed(1)},${cz.toFixed(1)}`, maker: PARKS, name: `Bed of ${s.common} (${plants.length} plants), ${where || park}`, pos: { x: cx, z: cz } });
    const long = Math.max(x1 - x0, z1 - z0), n = Math.max(1, Math.round(long / every)), alongX = x1 - x0 >= z1 - z0;
    for (let i = 0; i < n; i++) { const u = (i + .5) / n; label(alongX ? x0 + (x1 - x0) * u : cx, alongX ? cz : z0 + (z1 - z0) * u, Math.max(2.2, Math.min(x1 - x0, z1 - z0) / 2 + 1.2), `${s.common} — ${s.botanical}`, detailOf(s, where)); }
  }
  // a loose group of one species (not in a tidy bed): every plant recorded, one label in the middle of them
  function patch(key, plants, where, r = 4.5) {
    if (!plants.length) return; const s = PLANTS[key];
    const cx = plants.reduce((a, p) => a + p[0], 0) / plants.length, cz = plants.reduce((a, p) => a + p[1], 0) / plants.length;
    for (const [x, z] of plants) LIFE.plants.push({ x, z, key, owner: 'GOV' });
    LIFE.things.push({ cls: 'LND', kind: 'BED', mat: s.code, owner: 'GOV', seed: `patch:${park}:${key}:${cx.toFixed(1)},${cz.toFixed(1)}`, maker: PARKS, name: `Planting of ${s.common} (${plants.length} plants), ${where || park}`, pos: { x: cx, z: cz } });
    label(cx, cz, r, `${s.common} — ${s.botanical}`, detailOf(s, where));
  }
  // a single plant with its own label (a tree, a palm in the glasshouse)
  function single(key, x, z, where, r = 2.6) {
    const s = PLANTS[key]; LIFE.plants.push({ x, z, key, owner: 'GOV' });
    label(x, z, r, `${s.common} — ${s.botanical}`, detailOf(s, where));
  }
  // a tree: drawn by the forest in the right shape, its species recorded with it; a label on it
  function tree(key, x, z, scale = 1, where) {
    const s = PLANTS[key]; const t = ctx.plantTree?.(x, z, TREE_SHAPE[key], scale, key, 'GOV'); if (t === false) return null;
    label(x, z, 2.6, `${s.common} — ${s.botanical}`, detailOf(s, where));
    return t;
  }
  // an animal made by the kit: its species, its ID, and a label that walks with it
  let an = 0;
  function animal(a, key, where) {
    if (!a) return a; const s = ANIMALS[key || a.kind]; if (!s) return a;
    const wild = s.kind === 'INS' || key === 'duck' || (!key && a.kind === 'duck');
    const pos = a.g?.position || a.pos;
    a.species = s;
    LIFE.things.push({ cls: 'CRE', kind: s.kind, mat: s.code, owner: wild ? 'WLD' : 'GOV', seed: `an:${park}:${a.kind || key}:${an++}`, maker: wild ? 'wild' : `${BREEDERS} breeding programme, kept by ${PARKS}`, name: `${s.common} (${s.scientific}), ${where || park}`, get pos() { return pos; } });
    if (s.kind !== 'INS') label(0, 0, s.kind === 'MAM' && /elephant|giraffe/.test(a.kind) ? 5 : 3, `${s.common} — ${s.scientific}`, `${s.common} (${s.scientific}). ${s.origin[0].toUpperCase() + s.origin.slice(1)}.${wild ? '' : ` From the ${BREEDERS}'s breeding programme; looked after by ${PARKS}.`}`, pos);
    return a;
  }
  // a made thing: a bench, a lamp, a run of railing, a skate ramp…
  function fixture(cls, kind, mat, maker, name, x, z, owner = 'GOV') {
    LIFE.things.push({ cls, kind, mat, owner, seed: `fx:${park}:${kind}:${x.toFixed(1)},${z.toFixed(1)}`, maker, name: `${name}, ${park}`, pos: { x, z } });
  }
  // anything else with its ID ready-made (a pedalo, the ice-cream van)
  const thing = t => { LIFE.things.push(t); return t; };
  // the people the kit made (visitors, gardeners, skaters): each is a person with an ID
  function people(kit, city = 'ASH') {
    const role = new Map(kit.actors.map(a => [a.h, a.kind]));
    kit.people.forEach((h, i) => { if (h.idInfo) return; const k = role.get(h), who = h.kitChild ? 'Child' : 'Visitor';
      h.idInfo = { cls: 'PER', kind: 'RES', mat: 'HUM', owner: city, seed: `kit:${park}:${i}`, maker: 'born in Westhaven', name: `${who}${k === 'walk' ? ' walking' : k === 'sit' ? ' sitting' : k === 'jog' ? ' jogging' : ''} in ${park}`, get pos() { const p = new THREE.Vector3(); h.root.getWorldPosition(p); return p; } };
      LIFE.things.push(h.idInfo); });
  }
  return { bed, patch, single, tree, animal, fixture, people, label, thing };
}

// the ID of one plant, worked out from what it is and where it grows (never stored one by one, like grass)
export const plantId = p => { const s = PLANTS[p.key]; return makeId('PLT', s.kind, s.code, p.owner || 'GOV', `pl:${p.key}:${p.x.toFixed(2)},${p.z.toFixed(2)}`); };
