// The 3D walk-through gallery.
//
// Layout: a ring-shaped corridor. The camera walks round the ring, close to the
// inner wall. Prints hang on the outer (right) wall in collection order, each
// collection starting with a grey title card. Every few prints one is hung on the
// inner (left) wall instead, like in the reference video. To keep the corridor
// gently curved, the whole sequence repeats a few times round the ring, so the
// walk never ends.
//
// Coordinates: a point at angle `phi` and radius `r` is (r*cos(phi), y, r*sin(phi)).
// Walking forward means the camera angle decreases. "s" is the distance walked
// along the camera path, so theta = -s / CAM_R.
import * as THREE from 'three';
import { labelTexture, cardTexture, archTexture, shadowTexture } from './textures.js';
import { clamp, damp, easeInOutCubic, mod } from '../utils.js';

export const CFG = {
  ringRadius: 27,        // preferred outer wall radius (real value depends on catalog size)
  corridorWidth: 6.2,
  camFromInner: 2.4,     // camera distance from the inner wall
  wallHeight: 6.3,
  eye: 1.65,             // camera height
  printHeight: 1.62,     // height of a portrait print
  printCenterY: 1.78,
  depth: 0.045,          // canvas thickness
  gap: 1.95,             // gap between items on the outer wall
  silhouette: 0.58,      // where the inner wall cuts off the view (0 = centre, 1 = left edge)
  fog: [9, 64],
  innerEvery: 4,         // every Nth print goes to the inner wall
  lookAhead: 4.2,        // a collection becomes "current" this far before its card
};

const BG = '#eeeeee';

/**
 * @param {object} o
 * @param {HTMLCanvasElement} o.canvas
 * @param {object} o.catalog       - from loadCatalog()
 * @param {(p:number)=>void} [o.onProgress]
 * @param {(item:object|null)=>void} [o.onHover]
 * @param {(item:object)=>void} [o.onSelect]
 * @param {(collection:object)=>void} [o.onCollectionChange]
 */
export async function createGallery(o) {
  const { canvas, catalog } = o;

  // ------------------------------------------------------------ renderer
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    throw new Error('WebGL not available');
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(new THREE.Color(BG));
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(new THREE.Color(BG), CFG.fog[0], CFG.fog[1]);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 200);

  // ------------------------------------------------------------ load images
  const loader = new THREE.TextureLoader();
  let loaded = 0;
  const total = catalog.prints.length;
  const textures = new Map();
  await Promise.all(catalog.prints.map((p) => new Promise((resolve) => {
    const done = (tex) => {
      loaded++;
      o.onProgress?.(loaded / total);
      textures.set(p.slug, tex);
      resolve();
    };
    loader.load(p.image, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      done(tex);
    }, undefined, () => done(null)); // missing image -> grey panel
  })));

  // Fonts must be ready before drawing canvas text.
  try {
    await Promise.all([
      document.fonts.load('600 40px Oswald'),
      document.fonts.load('500 40px Newsreader'),
      document.fonts.load('italic 400 40px Newsreader'),
      document.fonts.load('400 20px "IBM Plex Mono"'),
    ]);
  } catch { /* fonts are optional */ }

  // ------------------------------------------------------------ build the sequence
  // item: { type: 'card'|'print', collection, print?, w, h, wall: 'outer'|'inner' }
  const sequence = [];
  let printCounter = 0;
  catalog.collections.forEach((collection) => {
    sequence.push({ type: 'card', collection, w: 1.45, h: 2.0, wall: 'outer' });
    collection.prints.forEach((print) => {
      const tex = textures.get(print.slug);
      const img = tex?.image;
      const aspect = img ? img.width / img.height
        : print.ratio === 'landscape' ? 4 / 3 : print.ratio === 'square' ? 1 : 3 / 4;
      let h = CFG.printHeight;
      let w = h * aspect;
      if (aspect > 1) { w = Math.min(CFG.printHeight * 1.4, h * aspect); h = w / aspect; }
      printCounter++;
      const wall = printCounter % CFG.innerEvery === 0 ? 'inner' : 'outer';
      sequence.push({ type: 'print', collection, print, texture: tex, w, h, wall });
    });
  });

  // Ring size: repeat the sequence so the radius is close to CFG.ringRadius.
  const outerSeq = sequence.filter((i) => i.wall === 'outer');
  const seqLength = outerSeq.reduce((n, i) => n + i.w + CFG.gap, 0);
  const repeats = Math.max(1, Math.round((Math.PI * 2 * CFG.ringRadius) / seqLength));
  const R_OUT = Math.max(14, (repeats * seqLength) / (Math.PI * 2));
  const R_IN = R_OUT - CFG.corridorWidth;
  const CAM_R = R_IN + CFG.camFromInner;
  const gap = (Math.PI * 2 * R_OUT) / repeats / outerSeq.length - outerSeq.reduce((n, i) => n + i.w, 0) / outerSeq.length;
  const RING = Math.PI * 2 * CAM_R; // one lap in "s" units
  // Angle between walking direction and the inner wall's silhouette.
  const SILHOUETTE = Math.PI / 2 - Math.asin(R_IN / CAM_R);

  const items = [];
  let arc = 0;
  for (let k = 0; k < repeats; k++) {
    let lastOuterPhi = -arc / R_OUT;
    sequence.forEach((src) => {
      const it = { ...src, copy: k };
      if (it.wall === 'outer') {
        arc += it.w / 2;
        it.phi = -arc / R_OUT;
        arc += it.w / 2 + gap;
        lastOuterPhi = it.phi;
      } else {
        it.phi = lastOuterPhi - (gap * 0.5 + 0.8) / R_OUT;
      }
      it.s = -it.phi * CAM_R;
      items.push(it);
    });
  }

  // ------------------------------------------------------------ corridor
  scene.add(buildCorridor(R_IN, R_OUT, CFG.wallHeight));

  // ------------------------------------------------------------ items
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const planeGeo = new THREE.PlaneGeometry(1, 1);
  const edgeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#e4e4e4') });
  const archMat = new THREE.MeshBasicMaterial({ map: archTexture(), transparent: true, opacity: 0.7, depthWrite: false });
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTexture(), color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false });
  const frontMats = new Map();
  const labelCache = new Map();
  const hitTargets = [];

  function frontMaterial(it) {
    const key = it.type === 'card' ? 'card:' + it.collection.slug : 'print:' + it.print.slug;
    if (!frontMats.has(key)) {
      let mat;
      if (it.type === 'card') {
        mat = new THREE.MeshBasicMaterial({ map: cardTexture({ title: it.collection.title, count: it.collection.prints.length }, maxAniso) });
      } else if (it.texture) {
        mat = new THREE.MeshBasicMaterial({ map: it.texture });
      } else {
        mat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#cfcfcf') });
      }
      frontMats.set(key, mat);
    }
    return frontMats.get(key);
  }

  function labelFor(print) {
    if (!labelCache.has(print.slug)) {
      const { texture, aspect } = labelTexture({
        artist: print.artist,
        title: print.title,
        meta: `${print.collection.title} · ${print.year}`,
      }, maxAniso);
      labelCache.set(print.slug, { mat: new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }), aspect });
    }
    return labelCache.get(print.slug);
  }

  items.forEach((it) => {
    const r = it.wall === 'outer' ? R_OUT : R_IN;
    const g = new THREE.Group();
    g.position.set(r * Math.cos(it.phi), 0, r * Math.sin(it.phi));
    // face the corridor: outer wall faces the centre, inner wall faces outwards
    g.lookAt(it.wall === 'outer' ? new THREE.Vector3(0, 0, 0) : g.position.clone().multiplyScalar(2));
    it.group = g;

    const cy = it.type === 'card' ? CFG.printCenterY + 0.1 : CFG.printCenterY;
    it.cy = cy;

    // Flat planes on a curved (concave) wall: lift them off the wall by the
    // curve's depth ("sagitta") so the wall doesn't poke through their edges.
    const archW = Math.max(it.w + 1.0, 2.2);
    const lift = it.wall === 'outer' ? ((archW / 2) ** 2) / (2 * R_OUT) + 0.006 : 0.006;

    // arch niche
    const arch = new THREE.Mesh(planeGeo, archMat);
    const archTop = cy + it.h / 2 + 1.1;
    arch.scale.set(archW, archTop - 0.15, 1);
    arch.position.set(0, 0.15 + (archTop - 0.15) / 2, lift);
    arch.renderOrder = 1;
    g.add(arch);

    // drop shadow
    const sh = new THREE.Mesh(planeGeo, shadowMat);
    sh.scale.set(it.w * 1.35, it.h * 1.3, 1);
    sh.position.set(0.03, cy - 0.07, lift + 0.004);
    sh.renderOrder = 2;
    g.add(sh);

    // the print itself (a thin box so the canvas edge shows at an angle)
    const mats = [edgeMat, edgeMat, edgeMat, edgeMat, frontMaterial(it), edgeMat];
    const mesh = new THREE.Mesh(boxGeo, mats);
    const depth = it.type === 'card' ? 0.02 : CFG.depth;
    it.depth = depth;
    mesh.scale.set(it.w, it.h, depth);
    mesh.position.set(0, cy, lift + 0.008 + depth / 2);
    mesh.userData.item = it;
    it.mesh = mesh;
    it.baseZ = mesh.position.z;
    it.hover = 0;
    g.add(mesh);
    hitTargets.push(mesh);

    // wall label under prints
    if (it.type === 'print') {
      const { mat, aspect } = labelFor(it.print);
      const lw = 1.2;
      const label = new THREE.Mesh(planeGeo, mat);
      label.scale.set(lw, lw / aspect, 1);
      label.position.set(-it.w / 2 + lw / 2, cy - it.h / 2 - 0.16 - (lw / aspect) / 2, lift + 0.003);
      label.renderOrder = 3;
      g.add(label);
    }

    scene.add(g);
  });

  const cards = items.filter((i) => i.type === 'card');
  const standAt = (card) => card.s - CFG.lookAhead + 0.2;

  // ------------------------------------------------------------ camera state
  const startS = standAt(cards[0]);
  const state = {
    s: startS - 8,          // start a little behind and walk in
    target: startS,
    mode: 'walk',           // 'walk' | 'fly' | 'focus'
    pointer: { x: 0, y: 0, nx: 0, ny: 0, inside: false },
    parallax: { x: 0, y: 0 },
    yaw: 0,
    hovered: null,
    currentCollection: null,
    running: true,
    fly: null,
    focusItem: null,
  };

  let forceFrames = 3; // render a few frames after start / resize, even when standing still

  const UP = new THREE.Vector3(0, 1, 0);
  function walkPose(s) {
    const theta = -s / CAM_R;
    const pos = new THREE.Vector3(CAM_R * Math.cos(theta), CFG.eye, CAM_R * Math.sin(theta));
    const fwd = new THREE.Vector3(Math.sin(theta), 0, -Math.cos(theta));
    const right = new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta));
    const yaw = state.yaw - state.parallax.x * 0.04;
    const dir = fwd.multiplyScalar(Math.cos(yaw)).add(right.multiplyScalar(Math.sin(yaw)));
    dir.y = -0.01 + state.parallax.y * 0.025;
    const m = new THREE.Matrix4().lookAt(pos, pos.clone().add(dir), UP);
    return { position: pos, quaternion: new THREE.Quaternion().setFromRotationMatrix(m) };
  }

  // ------------------------------------------------------------ sizing
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    const low = document.documentElement.classList.contains('low-quality');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // portrait screens need a wider field of view to see enough of the corridor
    camera.fov = camera.aspect < 0.8 ? 58 : camera.aspect < 1.3 ? 56 : 50;
    camera.updateProjectionMatrix();
    // Turn the camera so the inner wall cuts off the view at the same place as in the video.
    const halfH = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    const target = camera.aspect < 1 ? 0.88 : CFG.silhouette;
    state.yaw = clamp(Math.atan(target * Math.tan(halfH)) - SILHOUETTE, -0.3, 0.45);
    forceFrames = 3;
  }
  window.addEventListener('resize', resize);
  resize();

  // ------------------------------------------------------------ input: walking
  const WHEEL_SPEED = 0.011;
  let drag = null;

  function onWheel(e) {
    if (state.mode !== 'walk') return;
    e.preventDefault();
    const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    const scale = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? 600 : 1;
    state.target += clamp(d * scale, -300, 300) * WHEEL_SPEED;
  }

  function onPointerDown(e) {
    if (state.mode !== 'walk') return;
    if (e.button !== undefined && e.button !== 0) return;
    const now = performance.now();
    drag = { t: now, lastX: e.clientX, lastY: e.clientY, lastT: now, v: 0, moved: 0, id: e.pointerId };
    canvas.setPointerCapture?.(e.pointerId);
  }

  function setPointer(e) {
    const rect = canvas.getBoundingClientRect();
    state.pointer.x = e.clientX - rect.left;
    state.pointer.y = e.clientY - rect.top;
    state.pointer.nx = (state.pointer.x / rect.width) * 2 - 1;
    state.pointer.ny = -(state.pointer.y / rect.height) * 2 + 1;
  }

  function onPointerMove(e) {
    setPointer(e);
    state.pointer.inside = e.target === canvas || !!drag;
    if (!drag) return;
    const now = performance.now();
    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    // drag left (or up on touch screens) walks forward
    const delta = (Math.abs(dx) >= Math.abs(dy) ? -dx : -dy) * (e.pointerType === 'touch' ? 0.035 : 0.022);
    state.target += delta;
    const dt = Math.max(1, now - drag.lastT);
    drag.v = 0.75 * drag.v + 0.25 * (delta / dt);
    drag.moved += Math.abs(dx) + Math.abs(dy);
    drag.lastX = e.clientX; drag.lastY = e.clientY; drag.lastT = now;
    if (drag.moved > 6) canvas.classList.add('is-dragging');
  }

  function onPointerUp(e) {
    if (!drag) return;
    const wasClick = drag.moved < 8 && performance.now() - drag.t < 700;
    if (!wasClick && performance.now() - drag.lastT < 80) state.target += drag.v * 240; // inertia
    canvas.releasePointerCapture?.(drag.id);
    canvas.classList.remove('is-dragging');
    drag = null;
    if (wasClick && state.mode === 'walk') {
      setPointer(e);
      state.pointer.inside = true;
      const item = pick();
      if (item) select(item);
    }
  }

  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('pointerleave', () => {
    if (drag) return;
    state.pointer.inside = false;
    setHovered(null);
  });

  // ------------------------------------------------------------ hover / select
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick() {
    ndc.set(state.pointer.nx, state.pointer.ny);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(hitTargets, false)[0];
    return hit && hit.distance < 32 ? hit.object.userData.item : null;
  }

  function updateHover() {
    if (state.mode !== 'walk' || !state.pointer.inside || (drag && drag.moved > 6)) {
      setHovered(null);
      return;
    }
    setHovered(pick());
  }

  function setHovered(item) {
    if (state.hovered === item) return;
    state.hovered = item;
    o.onHover?.(item);
  }

  function select(item) {
    setHovered(null);
    o.onSelect?.(item);
  }

  // ------------------------------------------------------------ current collection
  function updateCurrentCollection() {
    let best = null;
    let bestD = Infinity;
    for (const c of cards) {
      const d = mod(state.s + CFG.lookAhead - c.s, RING);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (best && best.collection !== state.currentCollection) {
      state.currentCollection = best.collection;
      o.onCollectionChange?.(best.collection);
    }
  }

  /** Smallest forward (dir=1) or backward (dir=-1) distance from target to any card of a collection. */
  function distanceTo(collection, dir, min = 0.5) {
    let best = Infinity;
    for (const c of cards) {
      if (c.collection !== collection) continue;
      const d = dir > 0 ? mod(standAt(c) - state.target, RING) : mod(state.target - standAt(c), RING);
      if (d > min && d < best) best = d;
    }
    return best;
  }

  function goToCollection(collection) {
    const f = distanceTo(collection, 1, 0.01);
    const b = distanceTo(collection, -1, 0.01);
    if (Math.min(f, b) === Infinity) return;
    state.target += f <= b ? f : -b;
  }

  function step(dir) {
    const list = catalog.collections;
    const idx = list.indexOf(state.currentCollection);
    if (dir > 0) {
      state.target += distanceTo(list[mod(idx + 1, list.length)], 1);
    } else {
      // back to the start of this collection, or to the previous one if already there
      const back = distanceTo(state.currentCollection, -1, 0.01);
      state.target -= back > 1.5 && back !== Infinity ? back : distanceTo(list[mod(idx - 1, list.length)], -1, 1.5);
    }
  }

  // ------------------------------------------------------------ fly to a print / back
  function focusPose(item) {
    const center = new THREE.Vector3();
    item.mesh.getWorldPosition(center);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(item.group.quaternion);
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const portrait = camera.aspect < 1;
    const dH = item.h / ((portrait ? 0.8 : 1.16) * t);
    const dW = item.w / ((portrait ? 1.5 : 0.9) * t * camera.aspect);
    const position = center.clone().add(normal.multiplyScalar(Math.max(dH, dW)));
    const m = new THREE.Matrix4().lookAt(position, center, UP);
    return { position, quaternion: new THREE.Quaternion().setFromRotationMatrix(m) };
  }

  function animateCamera(to, duration) {
    return new Promise((resolve) => {
      state.fly = {
        fromPos: camera.position.clone(),
        fromQuat: camera.quaternion.clone(),
        toPos: to.position,
        toQuat: to.quaternion,
        t0: performance.now(),
        duration,
        resolve,
      };
    });
  }

  async function flyTo(item, duration = 1300) {
    state.mode = 'fly';
    state.focusItem = item;
    item.hover = 0;
    resetHover(item);
    ensureRunning();
    await animateCamera(focusPose(item), duration);
    state.mode = 'focus';
  }

  async function returnFromFocus(duration = 1200) {
    const item = state.focusItem;
    if (!item) { state.mode = 'walk'; return; }
    ensureRunning();
    state.mode = 'fly';
    // stand a little before the print so it is still in view
    const s = item.s - (item.wall === 'outer' ? 3.6 : 5.6);
    state.target = s;
    state.s = s;
    updateCurrentCollection();
    await animateCamera(walkPose(s), duration);
    state.focusItem = null;
    state.mode = 'walk';
  }

  /** Jump straight to the focus pose of a print (no animation). */
  function setFocus(item) {
    state.focusItem = item;
    state.mode = 'focus';
    const p = focusPose(item);
    camera.position.copy(p.position);
    camera.quaternion.copy(p.quaternion);
  }

  /** The copy of a print closest to where the camera is now. */
  function findPrint(slug) {
    let best = null;
    let bestD = Infinity;
    for (const it of items) {
      if (it.type !== 'print' || it.print.slug !== slug) continue;
      const d = Math.abs(mod(it.s - state.s + RING / 2, RING) - RING / 2);
      if (d < bestD) { bestD = d; best = it; }
    }
    return best;
  }

  /** Screen rectangle (CSS px, viewport) of an item's front face. */
  function getScreenRect(item) {
    const rect = canvas.getBoundingClientRect();
    const xs = [], ys = [];
    for (const [x, y] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
      const v = new THREE.Vector3(x, y, 0.5);
      item.mesh.localToWorld(v);
      v.project(camera);
      xs.push(rect.left + ((v.x + 1) / 2) * rect.width);
      ys.push(rect.top + ((1 - v.y) / 2) * rect.height);
    }
    const left = Math.min(...xs), top = Math.min(...ys);
    return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
  }

  /** Items currently in front of the camera with their screen rectangles (used by tests). */
  function visibleItems() {
    const out = [];
    const v = new THREE.Vector3();
    for (const it of items) {
      it.mesh.getWorldPosition(v);
      const dist = v.distanceTo(camera.position);
      v.project(camera);
      if (v.z < -1 || v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue;
      out.push({ item: it, rect: getScreenRect(it), distance: dist });
    }
    return out.sort((a, b) => a.distance - b.distance);
  }

  function resetHover(item) {
    item.mesh.scale.set(item.w, item.h, item.depth);
    item.mesh.position.z = item.baseZ;
  }

  // ------------------------------------------------------------ loop
  const clock = new THREE.Clock();
  let rafId = 0;
  const lastPos = new THREE.Vector3();
  const lastQuat = new THREE.Quaternion();

  function frame() {
    rafId = 0;
    if (!state.running) return;
    const dt = Math.min(clock.getDelta(), 0.1);

    // gentle mouse parallax
    const active = state.pointer.inside && state.mode === 'walk' && !drag;
    state.parallax.x = damp(state.parallax.x, active ? state.pointer.nx : 0, 2.2, dt);
    state.parallax.y = damp(state.parallax.y, active ? state.pointer.ny : 0, 2.2, dt);

    if (state.mode === 'walk') {
      state.s = damp(state.s, state.target, 3.2, dt);
      const pose = walkPose(state.s);
      camera.position.copy(pose.position);
      camera.quaternion.copy(pose.quaternion);
      updateCurrentCollection();
    } else if (state.fly) {
      const f = state.fly;
      const t = clamp((performance.now() - f.t0) / f.duration, 0, 1);
      const e = easeInOutCubic(t);
      camera.position.lerpVectors(f.fromPos, f.toPos, e);
      camera.quaternion.slerpQuaternions(f.fromQuat, f.toQuat, e);
      if (t >= 1) {
        state.fly = null;
        f.resolve();
      }
    }

    updateHover();

    // hover lift animation
    let animating = false;
    for (const it of items) {
      const goal = it === state.hovered ? 1 : 0;
      if (it.hover !== goal) {
        animating = true;
        it.hover = Math.abs(it.hover - goal) < 0.002 ? goal : damp(it.hover, goal, 10, dt);
        const k = 1 + it.hover * 0.03;
        it.mesh.scale.set(it.w * k, it.h * k, it.depth);
        it.mesh.position.z = it.baseZ + it.hover * 0.1;
      }
    }

    // Only draw when something changed (saves battery when standing still).
    const moved = camera.position.distanceToSquared(lastPos) > 1e-10 || 1 - Math.abs(camera.quaternion.dot(lastQuat)) > 1e-10;
    if (moved || animating || forceFrames > 0) {
      renderer.render(scene, camera);
      lastPos.copy(camera.position);
      lastQuat.copy(camera.quaternion);
      forceFrames = Math.max(0, forceFrames - 1);
    }
    rafId = requestAnimationFrame(frame);
  }

  function ensureRunning() {
    state.running = true;
    forceFrames = 3;
    if (!rafId) {
      clock.getDelta();
      rafId = requestAnimationFrame(frame);
    }
  }

  function pause() {
    state.running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  ensureRunning();

  return {
    items,
    cards,
    pause,
    resume: ensureRunning,
    resize,
    flyTo,
    returnFromFocus,
    setFocus,
    getScreenRect,
    goToCollection,
    findPrint,
    visibleItems,
    next: () => step(1),
    prev: () => step(-1),
    walk: (d) => { if (state.mode === 'walk') state.target += d; },
    get mode() { return state.mode; },
    get focusItem() { return state.focusItem; },
    get currentCollection() { return state.currentCollection; },
    // for tests / debugging in the browser console
    debug: { state, camera, scene, renderer, CFG, R_IN, R_OUT, CAM_R, RING, repeats },
  };
}

// ------------------------------------------------------------------ corridor mesh
function buildCorridor(rIn, rOut, H) {
  const fc = 0.8;   // floor cove radius
  const cc = 1.9;   // ceiling cove radius
  const pts = [];
  const add = (r, y, c) => pts.push({ r, y, c: new THREE.Color(c) });
  const arc = (cx, cy, rad, a0, a1, c0, c1, n = 10) => {
    const C0 = new THREE.Color(c0), C1 = new THREE.Color(c1);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = a0 + (a1 - a0) * t;
      pts.push({ r: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a), c: C0.clone().lerp(C1, t) });
    }
  };
  const w = rOut - rIn;
  // inner wall (top -> bottom)
  add(rIn, H - cc, '#e8e8e8');
  add(rIn, 2.8, '#ececec');
  add(rIn, 1.2, '#e2e2e2');
  arc(rIn + fc, fc, fc, Math.PI, Math.PI * 1.5, '#d4d4d4', '#bdbdbd');
  // floor: darker next to the inner wall, lighter towards the outer wall
  add(rIn + w * 0.3, 0, '#c6c6c6');
  add(rIn + w * 0.75, 0, '#cfcfcf');
  // outer wall (bottom -> top)
  arc(rOut - fc, fc, fc, Math.PI * 1.5, Math.PI * 2, '#d6d6d6', '#e9e9e9');
  add(rOut, 1.4, '#f2f2f2');
  add(rOut, 3.0, '#f4f4f4');
  add(rOut, H - cc, '#f2f2f2');
  // ceiling
  arc(rOut - cc, H - cc, cc, 0, Math.PI / 2, '#ececec', '#d9d9d9', 12);
  arc(rIn + cc, H - cc, cc, Math.PI / 2, Math.PI, '#d9d9d9', '#e4e4e4', 12);

  const segments = 360;
  const geo = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p.r, p.y)), segments);
  const colors = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j < pts.length; j++) {
      const k = (i * pts.length + j) * 3;
      colors[k] = pts[j].c.r;
      colors[k + 1] = pts[j].c.g;
      colors[k + 2] = pts[j].c.b;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  return new THREE.Mesh(geo, mat);
}
