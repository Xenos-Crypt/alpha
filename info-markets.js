// INFORMATION is bought, not given. Two markets:
//  • the INFO MARKET (legal), a booth in Ashford Central Market: street maps (the map on M needs one),
//    public records of the people around you (name and work), company reports (what each company is
//    researching) and the news archive;
//  • the DARK WEB (illegal), a terminal in the Narrows: someone's private file (everything about them,
//    skipping the friendship stages, but it might be wrong and you might be caught), secret maps of hidden
//    places, and police patrol schedules. Some things aren't for sale anywhere.
import * as THREE from 'three';
import { marketStall, setStallScene } from './market-stalls.js';

const KEY = 'aw.info.v1';
export function createInfoMarkets(ctx) {
  let st = {}; try { st = JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch { }
  if (st.map == null) { let veteran = false; try { veteran = !!localStorage.getItem('aw.society.v1'); } catch { } st.map = veteran; }   // players from before this keep their map
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { } };
  save();
  // ---- the places ----
  setStallScene(ctx.scene);
  marketStall({ x: 310, y: .16, z: 100, colour: 0x2f5d8a, goods: 'info', title: 'INFO MARKET', sub: 'maps · records · reports' });
  ctx.colliders?.push({ minX: 307.8, maxX: 312.2, minZ: 99, maxZ: 101 });
  const clerk = ctx.makePerson({ outfit: 0x2f5d8a, hair: 0x2d1b0e, pants: 0x2d3142 }); clerk.root.position.set(310, .16, 101.4); clerk.root.rotation.y = Math.PI;
  ctx.interactables.push({ pos: new THREE.Vector3(310, .16, 98), r: 2.2, label: 'Browse the Info Market', action: () => open('info') });
  const N = ctx.narrows, ny = ctx.groundY(N.x, N.z - 18);
  const desk = new THREE.Group(); desk.position.set(N.x, ny, N.z - 18); ctx.scene.add(desk);
  const m = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .6, ...o });
  const part = (geo, mat, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; desk.add(o); return o; };
  part(new THREE.BoxGeometry(1.6, .08, .8), m(0x1d1a17), 0, .9, 0); for (const sx of [-.7, .7]) part(new THREE.BoxGeometry(.06, .9, .7), m(0x111111), sx, .45, 0);
  part(new THREE.BoxGeometry(.7, .03, .45), m(0x222222, { metalness: .6 }), 0, .955, .05);
  const screen = part(new THREE.PlaneGeometry(.68, .42), new THREE.MeshBasicMaterial({ color: 0x0cff6a }), 0, 1.18, -.18); screen.rotation.x = -.2;
  part(new THREE.BoxGeometry(.72, .46, .02), m(0x222222), 0, 1.18, -.2).rotation.x = -.2;
  ctx.colliders?.push({ minX: N.x - .9, maxX: N.x + .9, minZ: N.z - 18.5, maxZ: N.z - 17.5 });
  ctx.interactables.push({ pos: new THREE.Vector3(N.x, ny, N.z - 16.8), r: 1.8, label: 'Log in to the dark web', action: () => open('dark') });

  // ---- what's for sale ----
  const near = (r = 60) => ctx.peds().filter(e => e.alive && !e.hidden && e.root.position.distanceTo(ctx.player().position) < r);
  const nearest = () => near(15).sort((a, b) => a.root.position.distanceTo(ctx.player().position) - b.root.position.distanceTo(ctx.player().position))[0];
  const ITEMS = {
    info: [
      { id: 'map', name: 'Westhaven street map', price: 25, desc: 'Every street, district and landmark. Opens with M.', owned: () => st.map, buy: () => { st.map = true; return 'The map is yours. Press M any time.'; } },
      { id: 'records', name: 'Public records: the people around you', price: 40, desc: 'The name and work of everyone within 60 m, from the public register.', buy: () => { let n = 0; for (const e of near()) { const c = ctx.citizenOf(e); if (c && !c.record) { c.record = true; n++; } } return n ? `You read the register: ${n} people. You know their names and work now.` : 'Nobody around you that you don\'t already know.'; } },
      { id: 'companies', name: 'Company reports', price: 60, desc: "Every company's research, value and plans (in City Hall, Economy).", owned: () => st.companies, buy: () => { st.companies = true; return 'The reports are in the Economy tab of City Hall.'; } },
      { id: 'archive', name: 'News archive', price: 30, desc: 'Every story, not just the last few (City Hall, News).', owned: () => st.archive, buy: () => { st.archive = true; return 'The full archive is in the News tab of City Hall.'; } },
      { id: 'dome', name: 'Anything about what lies beyond the mountains?', price: 0, desc: '', buy: () => '"Beyond the mountains? There\'s nothing. Everyone knows that." The clerk looks at you a moment too long.' },
    ],
    dark: [
      { id: 'file', name: "Someone's private file", price: 300, desc: 'Everything about the person nearest you: health, secrets, money, vote. It might be wrong. You might be caught.', buy: () => {
        const e = nearest(), c = e && ctx.citizenOf(e); if (!c) return 'Stand near the person whose file you want.';
        const wrong = Math.random() < .15, caught = Math.random() < .2;
        c.file = { at: Date.now(), wrong, fake: wrong ? { health: Math.round(30 + Math.random() * 70), vote: Math.floor(Math.random() * 12), illness: ['a weak heart', 'nothing at all', 'an old back injury'][Math.floor(Math.random() * 3)] } : null };
        if (caught) {
          ctx.raiseWanted(80); ctx.controversy?.('Caught buying a private file on the dark web'); c.opinion = -80; c.bond = 0; ctx.remember(c, 'Found out the newcomer bought my private file on the dark web');
          if (ctx.fame() >= 20) ctx.news(`Privacy scandal: the newcomer was caught buying a resident's private file on the dark web.`, true);
          return '🚨 The seller was a police sting. The file is yours, but the police know, and so does the person. They will never trust you again.';
        }
        return `The file downloads. Talk to them and "Read the file you bought".${wrong ? '' : ''}`;
      } },
      { id: 'secret', name: 'Secret maps', price: 250, desc: 'Where the hidden places are. Sets a waypoint to one you choose.', buy: () => { st.secret = true; const p = ctx.secretPlaces(); const i = (st.secretNext = ((st.secretNext ?? -1) + 1) % p.length); ctx.setWaypoint(p[i]); return 'Secret places: ' + p.map(x => x.name).join(', ') + '. Waypoint set to ' + p[i].name + '. Buy again to cycle.'; } },
      { id: 'patrols', name: 'Police patrol schedules', price: 200, desc: 'For one city day, the police are slower to come after you.', buy: () => { st.patrolsUntil = Date.now() + 24 * 60e3; return 'You know where the patrols will be. For a day, they are slower to find you.'; } },
      { id: 'dome', name: 'Files about the dome', price: 0, desc: '', buy: () => '"Not here. Not anywhere. Some things aren\'t for sale, friend." The connection drops.' },
    ],
  };
  // ---- the screen ----
  const panel = document.createElement('section'); panel.id = 'infoMarket'; panel.hidden = true; document.body.append(panel);
  const css = document.createElement('style');
  css.textContent = '#infoMarket{position:fixed;inset:8% max(12px,16%);z-index:48;border-radius:16px;padding:18px;overflow:auto;font:14px/1.45 system-ui}#infoMarket[hidden]{display:none}#infoMarket.info{background:#f6f2e8;color:#1f2a33;border:2px solid #2f5d8a}#infoMarket.dark{background:#050805;color:#3dff7a;border:1px solid #1f5f2f;font-family:ui-monospace,Menlo,monospace}#infoMarket h2{margin:0 0 8px}#infoMarket .it{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #8884}#infoMarket button{min-height:40px;padding:8px 14px;border:0;border-radius:8px;font:inherit;cursor:pointer}#infoMarket.info button{background:#2f5d8a;color:#fff}#infoMarket.dark button{background:#123d1f;color:#3dff7a}#infoMarket .x{float:right}#infoMarket .msg{margin-top:10px;font-weight:600}';
  document.head.append(css);
  let kind = 'info', msg = '';
  function render() {
    panel.className = kind;
    panel.innerHTML = `<button class="x" type="button" data-close>Close</button><h2>${kind === 'info' ? '📚 Info Market' : '> dark_web --anon'}</h2><div>${kind === 'info' ? 'Legal information, licensed by the Government of A.T.' : 'No names. No refunds. No guarantees.'} · You have ${Math.floor(ctx.gold())} gold.</div>
      ${ITEMS[kind].map(i => `<div class="it"><div><b>${i.name}</b>${i.price ? ` · ${i.price} gold` : ''}<div style="opacity:.8">${i.desc}</div></div><button type="button" data-buy="${i.id}" ${i.owned?.() ? 'disabled' : ''}>${i.owned?.() ? 'Owned' : i.price ? 'Buy' : 'Ask'}</button></div>`).join('')}
      <div class="msg">${msg}</div>`;
  }
  panel.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.close != null) { close(); return; }
    const it = ITEMS[kind].find(i => i.id === b.dataset.buy); if (!it) return;
    if (it.price && ctx.gold() < it.price) { msg = 'Not enough gold.'; render(); return; }
    if (it.price) ctx.addGold(-it.price);
    msg = it.buy(); save(); render();
  });
  panel.addEventListener('keydown', e => { if (e.code === 'Escape') close(); e.stopPropagation(); });
  function open(k) { kind = k; msg = ''; render(); panel.hidden = false; ctx.pause(); }
  function close() { panel.hidden = true; ctx.resume(); }
  return {
    get open() { return !panel.hidden; }, close,
    hasMap: () => !!st.map, companyReports: () => !!st.companies, archive: () => !!st.archive,
    patrolsKnown: () => (st.patrolsUntil || 0) > Date.now(),
  };
}
