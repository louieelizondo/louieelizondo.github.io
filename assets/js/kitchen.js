/* =========================================================
   "La Línea" — an interactive 3D kitchen line.
   Built entirely from geometric primitives, no model files.
   Every station maps to a real system that runs the business.
   ========================================================= */

import * as THREE from '../vendor/three.module.min.js';

const STATION_X = [-4.6, -1.55, 1.55, 4.6];

const PALETTES = {
  dark: {
    fog: 0x0b0a09,
    floor: 0x17130f,
    grid: 0x2a2523,
    steel: 0x8d8a84,
    steelDark: 0x46433f,
    board: 0x8a6a45,
    plate: 0xf0ece2,
    paper: 0xf4efe6,
    ember: 0xff5a1f,
    limon: 0xdcf24a,
    cilantro: 0x5fd07a,
    clay: 0xc98a5b,
    ambient: 0.5,
    key: 1.6,
    rim: 0.9,
  },
  light: {
    fog: 0xf7f2e8,
    floor: 0xe5dcca,
    grid: 0xcfc4ae,
    steel: 0xbdbab4,
    steelDark: 0x8d8a85,
    board: 0xb08355,
    plate: 0xfffdf7,
    paper: 0xffffff,
    ember: 0xe04a12,
    limon: 0xc3d93a,
    cilantro: 0x3f9c5f,
    clay: 0xa8703c,
    ambient: 1.05,
    key: 2.1,
    rim: 0.5,
  },
};

export function initKitchen(stage, options = {}) {
  const canvas = stage.querySelector('canvas');
  const tip = stage.querySelector('.linea-tip');
  const tipName = stage.querySelector('.linea-tip-name');
  const tipSys = stage.querySelector('.linea-tip-sys');
  const onSelect = options.onSelect || (() => {});
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let palette = PALETTES[options.theme === 'light' ? 'light' : 'dark'];

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(palette.fog, 1);

  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  const softwareGL = /swiftshader|llvmpipe|softpipe|software|mesa/i.test(gpu);
  if (softwareGL) {
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setPixelRatio(1);
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.fog);
  scene.fog = new THREE.Fog(palette.fog, 18, 38);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

  /* Standard materials without an environment map go black at high metalness.
     Keep metal low so the line reads on SwiftShader and on real GPUs. */
  const mats = {
    floor: new THREE.MeshStandardMaterial({ color: palette.floor, roughness: 0.95, metalness: 0.0 }),
    steel: new THREE.MeshStandardMaterial({ color: palette.steel, roughness: 0.45, metalness: 0.18 }),
    steelDark: new THREE.MeshStandardMaterial({ color: palette.steelDark, roughness: 0.55, metalness: 0.12 }),
    board: new THREE.MeshStandardMaterial({ color: palette.board, roughness: 0.8, metalness: 0.0 }),
    plate: new THREE.MeshStandardMaterial({ color: palette.plate, roughness: 0.42, metalness: 0.04 }),
    paper: new THREE.MeshStandardMaterial({ color: palette.paper, roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide }),
    ember: new THREE.MeshStandardMaterial({ color: palette.ember, emissive: palette.ember, emissiveIntensity: 1.5, roughness: 0.5, metalness: 0 }),
    limon: new THREE.MeshStandardMaterial({ color: palette.limon, roughness: 0.6, metalness: 0.05 }),
    cilantro: new THREE.MeshStandardMaterial({ color: palette.cilantro, roughness: 0.65, metalness: 0.0 }),
    clay: new THREE.MeshStandardMaterial({ color: palette.clay, roughness: 0.7, metalness: 0.0 }),
    lampGlow: new THREE.MeshStandardMaterial({ color: palette.ember, emissive: palette.ember, emissiveIntensity: 2.2, roughness: 1, metalness: 0 }),
  };

  /* ---------- LIGHTS ---------- */
  const ambient = new THREE.HemisphereLight(0xfff6ea, palette.floor, palette.ambient);
  scene.add(ambient);
  const fill = new THREE.AmbientLight(0xffffff, softwareGL ? 0.85 : 0.35);
  scene.add(fill);

  const key = new THREE.DirectionalLight(0xfff2e0, palette.key);
  key.position.set(5, 11, 7);
  key.castShadow = !softwareGL;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 10;
  key.shadow.camera.bottom = -6;
  key.shadow.camera.far = 34;
  key.shadow.bias = -0.0012;
  scene.add(key);

  const rim = new THREE.DirectionalLight(palette.limon, palette.rim);
  rim.position.set(-8, 4, -6);
  scene.add(rim);

  const burnerLight = new THREE.PointLight(palette.ember, 3.2, 7, 2);
  burnerLight.position.set(STATION_X[1], 1.35, 0.85);
  scene.add(burnerLight);

  const lampLight = new THREE.PointLight(palette.ember, 2.2, 6, 2);
  lampLight.position.set(STATION_X[2], 2.5, 0.8);
  scene.add(lampLight);

  /* ---------- FLOOR ---------- */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), mats.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(40, 40, palette.grid, palette.grid);
  grid.position.y = 0.008;
  grid.material.opacity = 0.35;
  grid.material.transparent = true;
  scene.add(grid);

  /* ---------- THE COUNTER (the pass) ---------- */
  const line = new THREE.Group();
  scene.add(line);

  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(13, 0.1, 2.4), mats.steel);
  counterTop.position.set(0, 1.0, 0);
  counterTop.castShadow = true;
  counterTop.receiveShadow = true;
  line.add(counterTop);

  const counterBody = new THREE.Mesh(new THREE.BoxGeometry(12.8, 0.92, 2.2), mats.steelDark);
  counterBody.position.set(0, 0.5, 0);
  counterBody.castShadow = true;
  counterBody.receiveShadow = true;
  line.add(counterBody);

  // Under-shelf + legs give the counter some depth
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.06, 1.7), mats.steelDark);
  shelf.position.set(0, 0.22, -0.1);
  shelf.receiveShadow = true;
  line.add(shelf);

  /* ---------- STATION BUILDERS ---------- */
  const stationGroups = [];

  function makeStation(index, build) {
    const group = new THREE.Group();
    group.position.x = STATION_X[index];
    build(group);

    // Invisible hitbox — reliable raycast target regardless of geometry
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(2.9, 2.6, 2.6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.y = 1.5;
    hit.userData.station = index;
    group.add(hit);

    group.userData = { index, baseY: 0, hit };
    stationGroups.push(group);
    line.add(group);
    return group;
  }

  // 01 — PREP: cutting board, mise en place containers, knife
  makeStation(0, (g) => {
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.07, 1.05), mats.board);
    board.position.set(-0.1, 1.09, 0.15);
    board.rotation.y = 0.05;
    board.castShadow = true;
    board.receiveShadow = true;
    g.add(board);

    const veg = [mats.cilantro, mats.limon, mats.clay];
    veg.forEach((m, i) => {
      const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.3, 20), mats.steel);
      bin.position.set(-0.75 + i * 0.52, 1.2, -0.62);
      bin.castShadow = true;
      g.add(bin);

      const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.05, 20), m);
      fill.position.set(-0.75 + i * 0.52, 1.35, -0.62);
      g.add(fill);
    });

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.015, 0.11), mats.steel);
    blade.position.set(0.45, 1.14, 0.42);
    blade.rotation.y = -0.28;
    blade.castShadow = true;
    g.add(blade);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.055, 0.07), mats.steelDark);
    handle.position.set(0.87, 1.14, 0.54);
    handle.rotation.y = -0.28;
    g.add(handle);

    // stacked prep bowls
    for (let i = 0; i < 3; i++) {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.1, 22), mats.plate);
      bowl.position.set(1.0, 1.11 + i * 0.09, -0.6);
      bowl.castShadow = true;
      g.add(bowl);
    }
  });

  // 02 — FUEGO: range with live burners, pot, steam
  const steamSystems = [];
  const burnerRings = [];
  makeStation(1, (g) => {
    const range = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.14, 1.7), mats.steelDark);
    range.position.set(0, 1.12, 0.05);
    range.castShadow = true;
    range.receiveShadow = true;
    g.add(range);

    [-0.62, 0.62].forEach((dx) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.045, 12, 28), mats.ember);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(dx, 1.21, 0.05);
      g.add(ring);
      burnerRings.push(ring);

      const grate = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.022, 8, 26), mats.steelDark);
      grate.rotation.x = Math.PI / 2;
      grate.position.set(dx, 1.22, 0.05);
      g.add(grate);
    });

    // Pot on the left burner
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.3, 0.42, 26, 1, true), mats.steel);
    pot.position.set(-0.62, 1.44, 0.05);
    pot.castShadow = true;
    g.add(pot);

    const potBase = new THREE.Mesh(new THREE.CircleGeometry(0.3, 26), mats.steel);
    potBase.rotation.x = -Math.PI / 2;
    potBase.position.set(-0.62, 1.24, 0.05);
    g.add(potBase);

    const stew = new THREE.Mesh(new THREE.CircleGeometry(0.29, 26), mats.clay);
    stew.rotation.x = -Math.PI / 2;
    stew.position.set(-0.62, 1.56, 0.05);
    g.add(stew);

    // Pan on the right burner
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.32, 0.13, 26), mats.steelDark);
    pan.position.set(0.62, 1.3, 0.05);
    pan.castShadow = true;
    g.add(pan);

    const panHandle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.07), mats.steelDark);
    panHandle.position.set(1.13, 1.3, 0.05);
    g.add(panHandle);

    steamSystems.push(makeSteam(g, new THREE.Vector3(-0.62, 1.62, 0.05)));
    steamSystems.push(makeSteam(g, new THREE.Vector3(0.62, 1.42, 0.05), 0.5));
  });

  // 03 — PASE: heat lamp overhead, ticket rail, plated dishes
  const tickets = [];
  let heatLampDisc = null;
  makeStation(2, (g) => {
    // Overhead heat lamp
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.6, 12), mats.steelDark);
    post.position.set(-1.1, 2.05, -0.85);
    g.add(post);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.06, 0.06), mats.steelDark);
    arm.position.set(-0.5, 2.82, -0.85);
    g.add(arm);

    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.4, 24, 1, true), mats.steel);
    hood.position.set(0.05, 2.68, -0.85);
    g.add(hood);

    heatLampDisc = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24), mats.lampGlow);
    heatLampDisc.rotation.x = Math.PI / 2;
    heatLampDisc.position.set(0.05, 2.5, -0.85);
    g.add(heatLampDisc);

    // Ticket rail
    [-0.95, 0.95].forEach((dx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 10), mats.steelDark);
      leg.position.set(dx, 1.45, -0.95);
      g.add(leg);
    });
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 2.0, 10), mats.steel);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, 1.82, -0.95);
    g.add(rail);

    // Hanging tickets
    for (let i = 0; i < 4; i++) {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.5), mats.paper);
      t.position.set(-0.72 + i * 0.48, 1.55, -0.93);
      t.castShadow = true;
      g.add(t);

      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.06), mats.ember);
      stripe.position.set(0, 0.19, 0.004);
      t.add(stripe);

      tickets.push({ mesh: t, phase: i * 0.9 });
    }

    // Plated dishes waiting under the lamp
    [-0.5, 0.35].forEach((dx, i) => {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.33, 0.05, 26), mats.plate);
      plate.position.set(dx, 1.09, 0.42);
      plate.castShadow = true;
      plate.receiveShadow = true;
      g.add(plate);

      const food = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 16, 12),
        i === 0 ? mats.clay : mats.cilantro
      );
      food.scale.y = 0.55;
      food.position.set(dx, 1.15, 0.42);
      food.castShadow = true;
      g.add(food);
    });
  });

  // 04 — ENTREGA: packed meals, delivery bags, out the door
  makeStation(3, (g) => {
    const rollerGroup = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.5, 12), mats.steel);
      roller.rotation.x = Math.PI / 2;
      roller.position.set(-0.85 + i * 0.34, 1.13, 0.3);
      rollerGroup.add(roller);
    }
    g.add(rollerGroup);

    // Stacked meal boxes
    const boxSpecs = [
      [-0.62, 1.31, 0.3],
      [-0.62, 1.61, 0.3],
      [0.3, 1.31, 0.3],
    ];
    boxSpecs.forEach(([x, y, z], i) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.28, 0.66), mats.paper);
      box.position.set(x, y, z);
      box.rotation.y = i * 0.14;
      box.castShadow = true;
      box.receiveShadow = true;
      g.add(box);

      const tape = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.05, 0.14), mats.cilantro);
      tape.position.set(0, 0.15, 0);
      box.add(tape);
    });

    // Insulated delivery bag
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.72, 0.5), mats.cilantro);
    bag.position.set(1.15, 1.46, -0.5);
    bag.castShadow = true;
    g.add(bag);

    const bagHandle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.028, 8, 20, Math.PI), mats.steelDark);
    bagHandle.position.set(1.15, 1.82, -0.5);
    g.add(bagHandle);
  });

  /* ---------- PLATES FLOWING DOWN THE LINE ---------- */
  const plates = [];
  const PLATE_COUNT = 7;
  const LINE_START = -6.4;
  const LINE_END = 6.4;
  for (let i = 0; i < PLATE_COUNT; i++) {
    const g = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.24, 0.045, 24), mats.plate);
    plate.castShadow = true;
    g.add(plate);

    const food = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), i % 2 ? mats.clay : mats.cilantro);
    food.scale.y = 0.5;
    food.position.y = 0.05;
    g.add(food);

    g.position.set(LINE_START + (i * (LINE_END - LINE_START)) / PLATE_COUNT, 1.08, 0.85);
    line.add(g);
    plates.push(g);
  }

  /* ---------- STEAM ---------- */
  function makeSteam(parent, origin, scale = 1) {
    const COUNT = 26;
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = origin.x + (Math.random() - 0.5) * 0.28;
      positions[i * 3 + 1] = origin.y + Math.random() * 1.1;
      positions[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.28;
      seeds[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.16 * scale,
      map: steamTexture(),
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xffffff,
    });

    const points = new THREE.Points(geo, mat);
    parent.add(points);
    return { points, origin, seeds, count: COUNT };
  }

  let _steamTex = null;
  function steamTexture() {
    if (_steamTex) return _steamTex;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.25)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    _steamTex = new THREE.CanvasTexture(c);
    return _steamTex;
  }

  /* ---------- CAMERA ORBIT (hand-rolled, clamped) ---------- */
  const orbit = { theta: 0, phi: 1.06, radius: 13.2 };
  const target = new THREE.Vector3(0, 1.0, 0.2);
  let targetX = 0;
  let autoRotate = !reduceMotion;
  let userTheta = 0;

  function placeCamera(t) {
    const wobble = autoRotate ? Math.sin(t * 0.16) * 0.24 : 0;
    orbit.theta = userTheta + wobble;
    const st = Math.sin(orbit.phi);
    camera.position.set(
      target.x + orbit.radius * st * Math.sin(orbit.theta),
      orbit.radius * Math.cos(orbit.phi) + 1.2,
      target.z + orbit.radius * st * Math.cos(orbit.theta)
    );
    camera.lookAt(target);
  }

  /* ---------- POINTER: drag to orbit, hover + click stations ---------- */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered = -1;
  let selected = -1;
  let dragging = false;
  let dragMoved = 0;
  let last = { x: 0, y: 0 };
  let pointerInside = false;

  stage.addEventListener('pointerdown', (e) => {
    dragging = true;
    dragMoved = 0;
    last = { x: e.clientX, y: e.clientY };
    stage.dataset.dragging = 'true';
    stage.dataset.touched = 'true';
    stage.setPointerCapture?.(e.pointerId);
  });

  stage.addEventListener('pointermove', (e) => {
    pointerInside = true;
    const rect = stage.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (dragging) {
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      dragMoved += Math.abs(dx) + Math.abs(dy);
      userTheta = clamp(userTheta - dx * 0.006, -0.85, 0.85);
      orbit.phi = clamp(orbit.phi - dy * 0.004, 0.5, 1.34);
      last = { x: e.clientX, y: e.clientY };
      if (dragMoved > 12) autoRotate = false;
    }
    requestFrame();
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    stage.dataset.dragging = 'false';
    stage.releasePointerCapture?.(e.pointerId);
    if (dragMoved < 8 && hovered >= 0) select(hovered);
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  stage.addEventListener('pointerleave', () => {
    pointerInside = false;
    hovered = -1;
    tip.dataset.show = 'false';
    requestFrame();
  });

  stage.addEventListener('wheel', (e) => {
    // Only zoom when the gesture is clearly horizontal-free and intentional;
    // otherwise let the page scroll so the section never traps the user.
    if (!e.shiftKey) return;
    e.preventDefault();
    orbit.radius = clamp(orbit.radius + e.deltaY * 0.01, 8.5, 18);
    requestFrame();
  }, { passive: false });

  function updateHover() {
    if (!pointerInside || dragging) return;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(stationGroups.map((g) => g.userData.hit), false);
    const next = hits.length ? hits[0].object.userData.station : -1;
    if (next !== hovered) {
      hovered = next;
      stage.style.cursor = hovered >= 0 ? 'pointer' : 'grab';
    }
    if (hovered >= 0) {
      const st = options.stations?.[hovered];
      if (st) {
        tipName.textContent = st.name;
        tipSys.textContent = st.system;
      }
      const world = new THREE.Vector3(STATION_X[hovered], 2.15, 0.2).project(camera);
      const rect = stage.getBoundingClientRect();
      tip.style.left = `${((world.x + 1) / 2) * rect.width}px`;
      tip.style.top = `${((-world.y + 1) / 2) * rect.height}px`;
      tip.dataset.show = 'true';
    } else {
      tip.dataset.show = 'false';
    }
  }

  function select(index) {
    selected = selected === index ? -1 : index;
    targetX = selected >= 0 ? STATION_X[selected] * 0.7 : 0;
    onSelect(selected);
    requestFrame();
  }

  /* ---------- PUBLIC API ---------- */
  function focusStation(index) {
    selected = index;
    targetX = index >= 0 ? STATION_X[index] * 0.7 : 0;
    requestFrame();
  }

  function setTheme(name) {
    palette = PALETTES[name === 'light' ? 'light' : 'dark'];
    scene.fog.color.setHex(palette.fog);
    scene.background.setHex(palette.fog);
    renderer.setClearColor(palette.fog, 1);
    mats.floor.color.setHex(palette.floor);
    mats.steel.color.setHex(palette.steel);
    mats.steelDark.color.setHex(palette.steelDark);
    mats.board.color.setHex(palette.board);
    mats.plate.color.setHex(palette.plate);
    mats.paper.color.setHex(palette.paper);
    mats.limon.color.setHex(palette.limon);
    mats.cilantro.color.setHex(palette.cilantro);
    mats.clay.color.setHex(palette.clay);
    mats.ember.color.setHex(palette.ember);
    mats.ember.emissive.setHex(palette.ember);
    mats.lampGlow.color.setHex(palette.ember);
    mats.lampGlow.emissive.setHex(palette.ember);
    ambient.intensity = palette.ambient;
    ambient.groundColor.setHex(palette.floor);
    key.intensity = palette.key;
    rim.intensity = palette.rim;
    rim.color.setHex(palette.limon);
    burnerLight.color.setHex(palette.ember);
    lampLight.color.setHex(palette.ember);
    grid.material.color.setHex(palette.grid);
    requestFrame();
  }

  /* ---------- RESIZE ---------- */
  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    requestFrame();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  /* ---------- LOOP ---------- */
  const clock = new THREE.Clock();
  let running = false;
  let rafId = 0;
  let needsFrame = true;

  function requestFrame() {
    needsFrame = true;
    if (!running && !rafId) rafId = requestAnimationFrame(tick);
  }

  function tick() {
    rafId = 0;
    const t = clock.getElapsedTime();
    const dt = Math.min(clock.getDelta(), 0.05);

    if (!reduceMotion) {
      // Plates travel the line, bobbing slightly as they go
      plates.forEach((p, i) => {
        p.position.x += dt * 1.15;
        if (p.position.x > LINE_END) p.position.x = LINE_START;
        p.position.y = 1.08 + Math.sin(t * 2.2 + i) * 0.012;
        p.rotation.y += dt * 0.35;
      });

      // Burners breathe
      const flicker = 1.25 + Math.sin(t * 7.1) * 0.25 + Math.sin(t * 13.3) * 0.12;
      mats.ember.emissiveIntensity = flicker;
      burnerLight.intensity = 2.6 + Math.sin(t * 6.4) * 0.7;
      burnerRings.forEach((r, i) => { r.scale.setScalar(1 + Math.sin(t * 5 + i) * 0.02); });

      // Heat lamp hum
      if (heatLampDisc) mats.lampGlow.emissiveIntensity = 2.0 + Math.sin(t * 2.6) * 0.35;
      lampLight.intensity = 2.0 + Math.sin(t * 2.6) * 0.4;

      // Tickets flutter on the rail
      tickets.forEach((tk, i) => {
        tk.mesh.rotation.x = Math.sin(t * 1.6 + tk.phase) * 0.09;
        tk.mesh.rotation.z = Math.sin(t * 1.1 + i) * 0.04;
      });

      // Steam rises and recycles
      steamSystems.forEach((s) => {
        const pos = s.points.geometry.attributes.position;
        for (let i = 0; i < s.count; i++) {
          const iy = i * 3 + 1;
          pos.array[iy] += dt * (0.32 + s.seeds[i] * 0.3);
          pos.array[i * 3] += Math.sin(t * 1.4 + i) * dt * 0.06;
          if (pos.array[iy] > s.origin.y + 1.35) {
            pos.array[iy] = s.origin.y;
            pos.array[i * 3] = s.origin.x + (Math.random() - 0.5) * 0.24;
            pos.array[i * 3 + 2] = s.origin.z + (Math.random() - 0.5) * 0.24;
          }
        }
        pos.needsUpdate = true;
      });
    }

    // Stations lift when hovered or selected
    stationGroups.forEach((g, i) => {
      const wants = i === hovered || i === selected ? 0.16 : 0;
      g.position.y += (wants - g.position.y) * Math.min(1, dt * 9);
    });

    target.x += (targetX - target.x) * Math.min(1, dt * 3.4);

    updateHover();
    placeCamera(t);
    renderer.render(scene, camera);

    const animating = running && (!reduceMotion || dragging);
    if (animating || needsFrame) {
      needsFrame = animating;
      rafId = requestAnimationFrame(tick);
    }
  }

  function start() {
    if (running) return;
    running = true;
    clock.getDelta();
    requestFrame();
  }
  function stop() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (stage.dataset.inview === 'true') start();
  });

  return { start, stop, setTheme, focusStation, setAutoRotate: (v) => { autoRotate = v; requestFrame(); }, isAutoRotating: () => autoRotate };
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
