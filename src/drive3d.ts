import * as THREE from 'three';

type TrafficState = {
  x: number;
  z: number;
  axis: 'x' | 'z';
  dir: number;
  color: string;
};

type RampState = { x: number; z: number; heading: number };

type DriveRenderState = {
  x: number;
  z: number;
  heading: number;
  steer: number;
  jumpY: number;
  speed: number;
  brake: boolean;
  boosting: boolean;
  cameraYaw: number;
  cameraPitch: number;
  cameraDistance: number;
  bodyRoll: number;
  traffic: TrafficState[];
  checkpoint?: { x: number; z: number };
};

type DriveOptions = {
  canvas: HTMLCanvasElement;
  color: string;
  carId: string;
  ramps: RampState[];
  traffic: TrafficState[];
};

type CharacterPreviewOptions = {
  canvas: HTMLCanvasElement;
  skin: string;
  hair: string;
  hairStyle: 'crop' | 'waves' | 'curls' | 'long';
  outfit: string;
  outfitShadow: string;
  pants: string;
};

const ROAD_SPACING = 120;
const ROAD_WIDTH = 22;
const WORLD_HALF = 540;

function material(color: THREE.ColorRepresentation, roughness = 0.72, metalness = 0.08) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function mesh(
  geometry: THREE.BufferGeometry,
  surface: THREE.Material,
  shadows = true,
) {
  const result = new THREE.Mesh(geometry, surface);
  result.castShadow = shadows;
  result.receiveShadow = shadows;
  return result;
}

function addBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  surface: THREE.Material,
) {
  const part = mesh(new THREE.BoxGeometry(...size), surface);
  part.position.set(...position);
  parent.add(part);
  return part;
}

function addWheel(
  parent: THREE.Object3D,
  position: [number, number, number],
  radius: number,
  tire: THREE.Material,
  rim: THREE.Material,
) {
  const wheel = new THREE.Group();
  const tireMesh = mesh(new THREE.CylinderGeometry(radius, radius, 0.38, 24), tire);
  tireMesh.rotation.z = Math.PI / 2;
  wheel.add(tireMesh);
  const rimMesh = mesh(new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, 0.405, 12), rim);
  rimMesh.rotation.z = Math.PI / 2;
  wheel.add(rimMesh);
  const hub = mesh(new THREE.CylinderGeometry(radius * 0.16, radius * 0.16, 0.43, 12), tire);
  hub.rotation.z = Math.PI / 2;
  wheel.add(hub);
  wheel.position.set(...position);
  parent.add(wheel);
  return wheel;
}

function createSupercar(
  car: THREE.Group,
  paint: THREE.Material,
  paintDark: THREE.Material,
  glass: THREE.Material,
  black: THREE.Material,
  chrome: THREE.Material,
  headLight: THREE.Material,
  redLight: THREE.Material,
) {
  const carbon = material(0x111619, 0.36, 0.64);
  const wheelMetal = material(0x9ba4a8, 0.24, 0.82);
  const body = addBox(car, [2.14, 0.38, 4.64], [0, 0.68, 0], paint);
  body.geometry.rotateX(-0.018);
  addBox(car, [1.98, 0.22, 3.55], [0, 0.93, -0.08], paintDark);
  const nose = addBox(car, [1.96, 0.22, 1.25], [0, 0.94, 1.64], paint);
  nose.rotation.x = -0.1;
  addBox(car, [1.84, 0.12, 0.72], [0, 0.91, 2.18], paintDark);
  addBox(car, [1.5, 0.58, 1.72], [0, 1.28, -0.32], glass);
  const roof = addBox(car, [1.34, 0.12, 1.05], [0, 1.62, -0.47], carbon);
  roof.rotation.x = 0.025;

  for (const side of [-1, 1]) {
    const sill = addBox(car, [0.13, 0.18, 2.8], [side * 1.08, 0.5, -0.02], carbon);
    sill.rotation.z = side * -0.03;
    addBox(car, [0.09, 0.34, 0.82], [side * 1.09, 0.78, -0.52], black);
    const intake = addBox(car, [0.08, 0.38, 0.7], [side * 1.1, 0.84, -0.84], black);
    intake.rotation.z = side * 0.12;
    const mirrorArm = addBox(car, [0.08, 0.08, 0.34], [side * 0.93, 1.36, 0.24], carbon);
    mirrorArm.rotation.z = side * 0.18;
    addBox(car, [0.28, 0.13, 0.24], [side * 1.02, 1.44, 0.18], paint);
    addBox(car, [0.5, 0.13, 0.12], [side * 0.67, 0.96, 2.29], headLight);
    addBox(car, [0.62, 0.12, 0.11], [side * 0.65, 0.88, -2.34], redLight);
  }

  const diffuser = addBox(car, [1.82, 0.18, 0.38], [0, 0.47, -2.35], carbon);
  diffuser.rotation.x = 0.12;
  for (const x of [-0.62, -0.2, 0.2, 0.62]) addBox(car, [0.06, 0.25, 0.46], [x, 0.47, -2.42], carbon);
  addBox(car, [1.78, 0.07, 0.42], [0, 1.22, -2.14], carbon);
  addBox(car, [0.08, 0.42, 0.08], [-0.68, 1.03, -2.12], carbon);
  addBox(car, [0.08, 0.42, 0.08], [0.68, 1.03, -2.12], carbon);
  addBox(car, [0.7, 0.08, 0.1], [0, 0.66, -2.47], chrome);

  const wheelPositions: Array<[number, number, number]> = [
    [-1.1, 0.54, 1.42], [1.1, 0.54, 1.42],
    [-1.12, 0.56, -1.45], [1.12, 0.56, -1.45],
  ];
  const wheels = wheelPositions.map((position, index) =>
    addWheel(car, position, index < 2 ? 0.46 : 0.49, black, wheelMetal));

  car.userData.wheels = wheels;
  car.userData.frontWheels = [wheels[0], wheels[1]];
  return { length: 4.64, wheels };
}

function createCar(color: string, carId: string) {
  const car = new THREE.Group();
  const paint = material(color, 0.28, 0.46);
  const paintDark = material(new THREE.Color(color).multiplyScalar(0.66), 0.34, 0.42);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x294451,
    roughness: 0.08,
    metalness: 0.25,
    transparent: true,
    opacity: 0.82,
  });
  const black = material(0x14181b, 0.84, 0.1);
  const chrome = material(0xc7d0d2, 0.18, 0.78);
  const redLight = new THREE.MeshStandardMaterial({
    color: 0x7a1613,
    emissive: 0xe62f24,
    emissiveIntensity: 1.1,
  });
  const headLight = new THREE.MeshStandardMaterial({
    color: 0xfff3c8,
    emissive: 0xffdf8c,
    emissiveIntensity: 1.55,
  });

  const isTruck = carId === 'truck' || carId === 'suv';
  const isSuper = carId === 'supercar' || carId === 'sports';
  const isExotic = carId === 'supercar';
  const length = isTruck ? 4.9 : isSuper ? 4.5 : 4.35;
  const height = isTruck ? 0.72 : isSuper ? 0.42 : 0.56;
  let wheels: THREE.Object3D[] = [];

  if (isExotic) {
    const exotic = createSupercar(car, paint, paintDark, glass, black, chrome, headLight, redLight);
    wheels = exotic.wheels;
  } else {
    addBox(car, [2.08, height, length], [0, 0.72, 0], paint);
    addBox(car, [1.9, 0.18, length * 0.72], [0, 1.02, -0.08], paintDark);

    if (isTruck && carId === 'truck') {
      addBox(car, [1.84, 1.08, 1.72], [0, 1.42, 0.67], paint);
      addBox(car, [1.72, 0.74, 1.22], [0, 1.48, 0.72], glass);
      addBox(car, [1.76, 0.18, 1.68], [0, 1.04, -1.48], black);
    } else {
      addBox(car, [1.72, isTruck ? 1.05 : 0.82, 1.82], [0, isTruck ? 1.43 : 1.28, -0.24], paint);
      addBox(car, [1.58, isTruck ? 0.78 : 0.6, 1.52], [0, isTruck ? 1.5 : 1.34, -0.18], glass);
    }

    const wheelPositions: Array<[number, number, number]> = [
      [-1.08, 0.5, 1.36], [1.08, 0.5, 1.36],
      [-1.08, 0.5, -1.36], [1.08, 0.5, -1.36],
    ];
    wheels = wheelPositions.map((position) =>
      addWheel(car, position, isTruck ? 0.52 : 0.44, black, chrome));

    addBox(car, [0.48, 0.18, 0.12], [-0.64, 0.78, length / 2 + 0.04], headLight);
    addBox(car, [0.48, 0.18, 0.12], [0.64, 0.78, length / 2 + 0.04], headLight);
  }
  const brakeLeft = addBox(car, [0.5, 0.18, 0.12], [-0.64, 0.76, -length / 2 - 0.04], redLight);
  const brakeRight = addBox(car, [0.5, 0.18, 0.12], [0.64, 0.76, -length / 2 - 0.04], redLight);
  if (!isExotic) addBox(car, [0.72, 0.08, 0.1], [0, 0.66, -length / 2 - 0.08], chrome);

  if (isSuper && !isExotic) {
    addBox(car, [1.72, 0.08, 0.32], [0, 1.12, -length / 2 + 0.08], paintDark);
    addBox(car, [0.08, 0.34, 0.08], [-0.65, 0.94, -length / 2 + 0.08], black);
    addBox(car, [0.08, 0.34, 0.08], [0.65, 0.94, -length / 2 + 0.08], black);
  }

  const flameSurface = new THREE.MeshBasicMaterial({
    color: 0x65e6f4,
    transparent: true,
    opacity: 0.9,
  });
  const flameGeometry = new THREE.ConeGeometry(0.13, 0.9, 10);
  flameGeometry.rotateX(-Math.PI / 2);
  const flames = [-0.42, 0.42].map((x) => {
    const flame = mesh(flameGeometry, flameSurface, false);
    flame.position.set(x, 0.56, -length / 2 - 0.48);
    flame.visible = false;
    car.add(flame);
    return flame;
  });

  car.userData.wheels = wheels;
  car.userData.frontWheels = [wheels[0], wheels[1]];
  car.userData.brakes = [brakeLeft, brakeRight];
  car.userData.flames = flames;
  return car;
}

function createTrafficCar(state: TrafficState) {
  const group = new THREE.Group();
  const paint = material(state.color, 0.42, 0.2);
  const glass = material(0x263c48, 0.12, 0.28);
  const tires = material(0x131619, 0.9, 0.02);
  addBox(group, [1.8, 0.5, 3.7], [0, 0.64, 0], paint);
  addBox(group, [1.5, 0.65, 1.55], [0, 1.08, -0.2], glass);
  const wheelGeometry = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
  wheelGeometry.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-0.92, 1.12], [0.92, 1.12], [-0.92, -1.12], [0.92, -1.12]]) {
    const wheel = mesh(wheelGeometry, tires);
    wheel.position.set(x, 0.4, z);
    group.add(wheel);
  }
  return group;
}

/**
 * Small real-time character portrait used by the New Life creator. The model
 * is intentionally built from lightweight primitives so it loads instantly,
 * remains original, and works without shipping a heavy external model.
 */
export function createCharacterPreview(options: CharacterPreviewOptions) {
  const renderer = new THREE.WebGLRenderer({
    canvas: options.canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 30);
  camera.position.set(0, 1.55, 6.2);
  camera.lookAt(0, 1.45, 0);

  scene.add(new THREE.HemisphereLight(0xfff4df, 0x57697a, 2.35));
  const key = new THREE.DirectionalLight(0xffd7b3, 4.2);
  key.position.set(-3, 5, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8dd7ff, 2.7);
  rim.position.set(4, 3, -2);
  scene.add(rim);

  const character = new THREE.Group();
  character.position.y = -0.15;
  scene.add(character);

  const skin = material(options.skin, 0.58, 0.01);
  const skinBlush = material(new THREE.Color(options.skin).lerp(new THREE.Color(0xe7857c), 0.28), 0.7, 0);
  const hair = material(options.hair, 0.72, 0.03);
  const shirt = material(options.outfit, 0.66, 0.03);
  const shirtShadow = material(options.outfitShadow, 0.75, 0.02);
  const pants = material(options.pants, 0.78, 0.02);
  const shoe = material(0x242629, 0.5, 0.08);
  const eyeWhite = material(0xfffdf8, 0.26, 0);
  const iris = material(0x292521, 0.22, 0.02);

  const body = mesh(new THREE.SphereGeometry(0.72, 30, 22), shirt);
  body.scale.set(0.9, 1.12, 0.66);
  body.position.y = 0.92;
  body.castShadow = true;
  character.add(body);

  const neck = mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.34, 18), skin);
  neck.position.y = 1.61;
  character.add(neck);

  const head = mesh(new THREE.SphereGeometry(0.72, 36, 28), skin);
  head.scale.set(0.94, 1.04, 0.9);
  head.position.y = 2.08;
  head.castShadow = true;
  character.add(head);

  for (const side of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.14, 18, 14), skin);
    ear.scale.set(0.65, 1, 0.55);
    ear.position.set(side * 0.69, 2.08, 0);
    character.add(ear);

    const arm = mesh(new THREE.CapsuleGeometry(0.16, 0.62, 8, 16), side < 0 ? shirtShadow : shirt);
    arm.position.set(side * 0.72, 0.93, 0);
    arm.rotation.z = side * -0.12;
    character.add(arm);

    const hand = mesh(new THREE.SphereGeometry(0.18, 18, 14), skin);
    hand.position.set(side * 0.78, 0.48, 0.03);
    character.add(hand);

    const leg = mesh(new THREE.CapsuleGeometry(0.21, 0.62, 8, 16), pants);
    leg.position.set(side * 0.29, 0.08, 0);
    character.add(leg);

    const foot = mesh(new THREE.SphereGeometry(0.25, 18, 14), shoe);
    foot.scale.set(1.05, 0.54, 1.45);
    foot.position.set(side * 0.29, -0.39, 0.12);
    character.add(foot);
  }

  const eyeGroups: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    const white = mesh(new THREE.SphereGeometry(0.145, 18, 14), eyeWhite, false);
    white.scale.set(0.82, 1.08, 0.42);
    const pupil = mesh(new THREE.SphereGeometry(0.067, 16, 12), iris, false);
    pupil.position.z = 0.12;
    pupil.position.x = side * -0.012;
    eye.add(white, pupil);
    eye.position.set(side * 0.25, 2.14, 0.63);
    character.add(eye);
    eyeGroups.push(eye);
  }

  const nose = mesh(new THREE.SphereGeometry(0.09, 16, 12), skin, false);
  nose.scale.set(0.72, 0.82, 1);
  nose.position.set(0, 1.99, 0.69);
  character.add(nose);

  for (const side of [-1, 1]) {
    const cheek = mesh(new THREE.SphereGeometry(0.105, 16, 12), skinBlush, false);
    cheek.scale.set(1.35, 0.46, 0.2);
    cheek.position.set(side * 0.4, 1.92, 0.61);
    character.add(cheek);
  }

  const smile = mesh(
    new THREE.TorusGeometry(0.18, 0.022, 8, 24, Math.PI),
    material(0x7d3c3a, 0.5, 0),
    false,
  );
  smile.rotation.z = Math.PI;
  smile.rotation.x = Math.PI / 2;
  smile.position.set(0, 1.84, 0.675);
  character.add(smile);

  const addHairBall = (x: number, y: number, z: number, scale: [number, number, number]) => {
    const piece = mesh(new THREE.SphereGeometry(0.38, 20, 16), hair);
    piece.position.set(x, y, z);
    piece.scale.set(...scale);
    character.add(piece);
    return piece;
  };
  if (options.hairStyle === 'curls') {
    [
      [-0.48, 2.55, 0.05], [-0.2, 2.72, 0.08], [0.12, 2.73, 0.08],
      [0.43, 2.56, 0.05], [-0.58, 2.3, 0.02], [0.58, 2.31, 0.02],
    ].forEach(([x, y, z]) => addHairBall(x, y, z, [0.78, 0.78, 0.72]));
  } else {
    const cap = addHairBall(0, 2.53, -0.02, [1.72, 0.72, 1.54]);
    cap.rotation.x = -0.08;
    if (options.hairStyle === 'waves') {
      addHairBall(-0.43, 2.46, 0.27, [0.72, 0.58, 0.68]);
      addHairBall(0.35, 2.52, 0.3, [0.88, 0.5, 0.66]);
    }
    if (options.hairStyle === 'long') {
      const back = addHairBall(0, 2.12, -0.24, [1.55, 1.5, 0.82]);
      back.renderOrder = -1;
    }
  }

  const ground = mesh(
    new THREE.CircleGeometry(1.34, 42),
    new THREE.MeshStandardMaterial({ color: 0x4a392d, transparent: true, opacity: 0.16, roughness: 1 }),
    false,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.58;
  ground.receiveShadow = true;
  scene.add(ground);

  let disposed = false;
  let frame = 0;
  const startedAt = performance.now();

  function resize() {
    const width = Math.max(1, options.canvas.clientWidth);
    const height = Math.max(1, options.canvas.clientHeight);
    const ratio = renderer.getPixelRatio();
    if (options.canvas.width !== Math.floor(width * ratio) || options.canvas.height !== Math.floor(height * ratio)) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  }

  function draw(now: number) {
    if (disposed) return;
    resize();
    const time = (now - startedAt) / 1000;
    character.position.y = -0.15 + Math.sin(time * 1.8) * 0.025;
    character.rotation.y = Math.sin(time * 0.72) * 0.13;
    const blink = Math.sin(time * 0.83) > 0.985 ? 0.12 : 1;
    eyeGroups.forEach((eye) => { eye.scale.y = blink; });
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw);

  function dispose() {
    disposed = true;
    cancelAnimationFrame(frame);
    scene.traverse((object) => {
      const objectMesh = object as THREE.Mesh;
      objectMesh.geometry?.dispose();
      const objectMaterial = objectMesh.material;
      if (Array.isArray(objectMaterial)) objectMaterial.forEach((item) => item.dispose());
      else objectMaterial?.dispose();
    });
    renderer.dispose();
  }

  return { dispose };
}

function createRamp(ramp: RampState) {
  const shape = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    -5, 0, -5, 5, 0, -5, -5, 0, 5, 5, 0, 5,
    -5, 2.8, 5, 5, 2.8, 5,
  ]);
  shape.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  shape.setIndex([
    0, 1, 5, 0, 5, 4,
    2, 4, 5, 2, 5, 3,
    0, 4, 2, 1, 3, 5,
    0, 2, 3, 0, 3, 1,
  ]);
  shape.computeVertexNormals();
  const result = mesh(shape, material(0x5d6467, 0.82, 0.12));
  result.position.set(ramp.x, 0.03, ramp.z);
  result.rotation.y = ramp.heading;
  return result;
}

function seeded(gx: number, gz: number) {
  let value = Math.imul(gx + 91, 73856093) ^ Math.imul(gz - 37, 19349663);
  value ^= value >>> 13;
  return Math.abs(value);
}

function addCity(scene: THREE.Scene, ramps: RampState[]) {
  const world = new THREE.Group();
  scene.add(world);

  const ground = mesh(new THREE.PlaneGeometry(1200, 1200), material(0x344b42, 0.98, 0));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  world.add(ground);

  const asphalt = material(0x242b31, 0.93, 0.04);
  const roadEdge = material(0x151b20, 0.88, 0.06);
  for (let n = -4; n <= 4; n++) {
    const xEdge = mesh(new THREE.BoxGeometry(ROAD_WIDTH + 1.5, 0.055, 1080), roadEdge);
    xEdge.position.set(n * ROAD_SPACING, 0.018, 0);
    world.add(xEdge);
    const xRoad = mesh(new THREE.BoxGeometry(ROAD_WIDTH, 0.08, 1080), asphalt);
    xRoad.position.set(n * ROAD_SPACING, 0.04, 0);
    xRoad.receiveShadow = true;
    world.add(xRoad);
    const zEdge = mesh(new THREE.BoxGeometry(1080, 0.055, ROAD_WIDTH + 1.5), roadEdge);
    zEdge.position.set(0, 0.018, n * ROAD_SPACING);
    world.add(zEdge);
    const zRoad = mesh(new THREE.BoxGeometry(1080, 0.08, ROAD_WIDTH), asphalt);
    zRoad.position.set(0, 0.04, n * ROAD_SPACING);
    zRoad.receiveShadow = true;
    world.add(zRoad);
  }

  const dashGeometryZ = new THREE.BoxGeometry(0.22, 0.03, 5);
  const dashGeometryX = new THREE.BoxGeometry(5, 0.03, 0.22);
  const dashSurface = new THREE.MeshBasicMaterial({ color: 0xd6c36e });
  const dashCount = 9 * 66;
  const zDashes = new THREE.InstancedMesh(dashGeometryZ, dashSurface, dashCount);
  const xDashes = new THREE.InstancedMesh(dashGeometryX, dashSurface, dashCount);
  const matrix = new THREE.Matrix4();
  let dashIndex = 0;
  for (let road = -4; road <= 4; road++) {
    for (let distance = -520; distance <= 520; distance += 16) {
      matrix.makeTranslation(road * ROAD_SPACING, 0.1, distance);
      zDashes.setMatrixAt(dashIndex, matrix);
      matrix.makeTranslation(distance, 0.1, road * ROAD_SPACING);
      xDashes.setMatrixAt(dashIndex, matrix);
      dashIndex++;
    }
  }
  world.add(zDashes, xDashes);

  const buildingPalette = [0x55646d, 0x645f68, 0x455c68, 0x6b6658, 0x514d67];
  const sidewalkSurface = material(0x717b7d, 0.9, 0.03);
  const plazaSurface = material(0x4b5859, 0.94, 0.02);
  const treeTrunk = material(0x4d3428, 0.94, 0);
  const treeLeaf = material(0x315d4c, 0.92, 0.02);
  const parkGrass = material(0x3f7056, 0.96, 0);
  const windowSurface = new THREE.MeshStandardMaterial({
    color: 0xffc96c,
    emissive: 0xe69a43,
    emissiveIntensity: 1.25,
    roughness: 0.42,
    metalness: 0.08,
  });
  const coolWindowSurface = new THREE.MeshStandardMaterial({
    color: 0x8dd8ec,
    emissive: 0x3e94b5,
    emissiveIntensity: 0.72,
    roughness: 0.3,
    metalness: 0.22,
  });
  for (let gx = -5; gx < 4; gx++) {
    for (let gz = -5; gz < 4; gz++) {
      const centerX = gx * ROAD_SPACING + ROAD_SPACING / 2;
      const centerZ = gz * ROAD_SPACING + ROAD_SPACING / 2;
      const sidewalk = mesh(new THREE.BoxGeometry(92, 0.3, 92), sidewalkSurface);
      sidewalk.position.set(centerX, 0.15, centerZ);
      sidewalk.receiveShadow = true;
      world.add(sidewalk);

      const seed = seeded(gx, gz);
      const isPark = seed % 9 === 0;
      if (isPark) {
        const park = mesh(new THREE.BoxGeometry(74, 0.18, 74), parkGrass);
        park.position.set(centerX, 0.31, centerZ);
        world.add(park);
        const path = mesh(new THREE.BoxGeometry(64, 0.04, 3.2), plazaSurface, false);
        path.position.set(centerX, 0.43, centerZ);
        world.add(path);
        for (let treeIndex = 0; treeIndex < 9; treeIndex++) {
          const treeSeed = seeded(gx * 13 + treeIndex, gz * 17 - treeIndex);
          const tree = new THREE.Group();
          const x = centerX - 28 + (treeSeed % 56);
          const z = centerZ - 28 + ((treeSeed >> 7) % 56);
          const trunk = mesh(new THREE.CylinderGeometry(0.32, 0.46, 4.2, 7), treeTrunk);
          trunk.position.y = 2.35;
          const crown = mesh(new THREE.ConeGeometry(2.7 + (treeSeed % 9) * 0.12, 6.5, 9), treeLeaf);
          crown.position.y = 6.3;
          tree.add(trunk, crown);
          tree.position.set(x, 0.3, z);
          world.add(tree);
        }
        continue;
      }
      const width = 45 + seed % 26;
      const depth = 43 + (seed >> 4) % 28;
      const height = 18 + (seed >> 8) % 52;
      const tower = mesh(
        new THREE.BoxGeometry(width, height, depth),
        material(buildingPalette[seed % buildingPalette.length], 0.78, 0.09),
      );
      tower.position.set(centerX, height / 2 + 0.3, centerZ);
      tower.castShadow = true;
      tower.receiveShadow = true;
      world.add(tower);

      const inset = mesh(
        new THREE.BoxGeometry(Math.max(18, width * 0.54), Math.max(8, height * 0.34), Math.max(16, depth * 0.56)),
        material(buildingPalette[(seed >> 5) % buildingPalette.length], 0.62, 0.16),
      );
      inset.position.set(centerX + (seed % 2 ? -width * 0.12 : width * 0.12), height + height * 0.17, centerZ);
      inset.castShadow = true;
      world.add(inset);

      const roof = mesh(
        new THREE.BoxGeometry(width + 1, 0.5, depth + 1),
        material(0x41484a, 0.86, 0.05),
      );
      roof.position.set(centerX, height + 0.55, centerZ);
      world.add(roof);

      const floors = Math.max(2, Math.floor((height - 7) / 6));
      const rows = Math.max(3, Math.floor(width / 8));
      const frontWindows = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.8, 2.1), seed % 3 === 0 ? coolWindowSurface : windowSurface, floors * rows * 2);
      let windowIndex = 0;
      for (const side of [-1, 1]) {
        for (let floor = 0; floor < floors; floor++) {
          for (let row = 0; row < rows; row++) {
            const offsetX = -width * 0.37 + row * (width * 0.74 / Math.max(1, rows - 1));
            matrix.makeTranslation(centerX + side * (width / 2 + 0.04), 5 + floor * 6, centerZ + offsetX);
            matrix.multiply(new THREE.Matrix4().makeRotationY(side > 0 ? Math.PI / 2 : -Math.PI / 2));
            frontWindows.setMatrixAt(windowIndex++, matrix);
          }
        }
      }
      world.add(frontWindows);

      if (seed % 4 === 0) {
        const sign = mesh(new THREE.BoxGeometry(Math.min(22, width * 0.38), 2.4, 0.18), new THREE.MeshBasicMaterial({ color: seed % 8 === 0 ? 0x60deef : 0xf1b75c }), false);
        sign.position.set(centerX, Math.min(height * 0.58, 28), centerZ - depth / 2 - 0.14);
        world.add(sign);
      }
    }
  }

  const lampPositions: THREE.Vector3[] = [];
  for (let road = -4; road <= 4; road++) {
    for (let distance = -480; distance <= 480; distance += 60) {
      lampPositions.push(
        new THREE.Vector3(road * ROAD_SPACING - 15, 0, distance),
        new THREE.Vector3(distance, 0, road * ROAD_SPACING + 15),
      );
    }
  }
  const poleGeometry = new THREE.CylinderGeometry(0.1, 0.16, 6, 8);
  const poleSurface = material(0x232a2e, 0.58, 0.56);
  const poleInstances = new THREE.InstancedMesh(poleGeometry, poleSurface, lampPositions.length);
  const bulbGeometry = new THREE.SphereGeometry(0.28, 10, 8);
  const bulbSurface = new THREE.MeshBasicMaterial({ color: 0xffdf8b });
  const bulbInstances = new THREE.InstancedMesh(bulbGeometry, bulbSurface, lampPositions.length);
  lampPositions.forEach((position, index) => {
    matrix.makeTranslation(position.x, 3, position.z);
    poleInstances.setMatrixAt(index, matrix);
    matrix.makeTranslation(position.x, 6.1, position.z);
    bulbInstances.setMatrixAt(index, matrix);
  });
  world.add(poleInstances, bulbInstances);
  lampPositions
    .filter((position, index) => index % 10 === 0 && Math.abs(position.x) < 260 && Math.abs(position.z) < 260)
    .forEach((position) => {
      const lampGlow = new THREE.PointLight(0xffcc78, 18, 34, 2);
      lampGlow.position.set(position.x, 6, position.z);
      world.add(lampGlow);
    });

  ramps.forEach((ramp) => world.add(createRamp(ramp)));
  return world;
}

export function create(options: DriveOptions) {
  const renderer = new THREE.WebGLRenderer({
    canvas: options.canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x6f8792);
  scene.fog = new THREE.FogExp2(0x78909a, 0.0032);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(780, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x294b63) },
        horizonColor: { value: new THREE.Color(0xd6a276) },
        bottomColor: { value: new THREE.Color(0x71888e) },
      },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorld = normalize(worldPosition.xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorld;
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        void main() {
          float up = smoothstep(0.0, 0.72, vWorld.y);
          float down = smoothstep(0.0, -0.32, vWorld.y);
          vec3 color = mix(horizonColor, topColor, up);
          color = mix(color, bottomColor, down);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    }),
  );
  scene.add(sky);

  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 900);
  const hemi = new THREE.HemisphereLight(0xbdd9e3, 0x354332, 1.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a0, 2.8);
  sun.position.set(-90, 130, -50);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90;
  sun.shadow.camera.bottom = -90;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 330;
  scene.add(sun, sun.target);

  addCity(scene, options.ramps);
  const playerCar = createCar(options.color, options.carId);
  scene.add(playerCar);
  const checkpointGroup = new THREE.Group();
  const checkpointRing = mesh(
    new THREE.TorusGeometry(5.8, 0.3, 12, 42),
    new THREE.MeshStandardMaterial({
      color: 0x72e8f2,
      emissive: 0x32b9cf,
      emissiveIntensity: 2.2,
      metalness: 0.35,
      roughness: 0.2,
      transparent: true,
      opacity: 0.88,
    }),
    false,
  );
  checkpointGroup.add(checkpointRing);
  const checkpointBeam = mesh(
    new THREE.CylinderGeometry(2.4, 5.2, 0.08, 32),
    new THREE.MeshBasicMaterial({ color: 0x62dce9, transparent: true, opacity: 0.24 }),
    false,
  );
  checkpointBeam.position.y = -4.05;
  checkpointGroup.add(checkpointBeam);
  const checkpointGlow = new THREE.PointLight(0x57dfea, 24, 35, 2);
  checkpointGroup.add(checkpointGlow);
  scene.add(checkpointGroup);
  const trafficCars = options.traffic.map((state) => {
    const car = createTrafficCar(state);
    scene.add(car);
    return car;
  });

  const target = new THREE.Vector3();
  let wheelDistance = 0;

  function resize() {
    const width = Math.max(1, options.canvas.clientWidth);
    const height = Math.max(1, options.canvas.clientHeight);
    const pixelRatio = renderer.getPixelRatio();
    const expectedWidth = Math.floor(width * pixelRatio);
    const expectedHeight = Math.floor(height * pixelRatio);
    if (options.canvas.width !== expectedWidth || options.canvas.height !== expectedHeight) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  }

  function render(state: DriveRenderState) {
    resize();
    playerCar.position.set(state.x, state.jumpY, state.z);
    playerCar.rotation.y = state.heading;
    playerCar.rotation.z = -state.bodyRoll * 0.055;
    playerCar.rotation.x = Math.min(0.035, Math.abs(state.speed) / 7000);
    wheelDistance += state.speed * 0.0009;
    for (const wheel of playerCar.userData.wheels as THREE.Mesh[]) {
      wheel.rotation.x = wheelDistance;
    }
    for (const wheel of playerCar.userData.frontWheels as THREE.Mesh[]) {
      wheel.rotation.y = -state.steer * 0.28;
    }
    for (const brake of playerCar.userData.brakes as THREE.Mesh[]) {
      (brake.material as THREE.MeshStandardMaterial).emissiveIntensity = state.brake ? 3.6 : 1.1;
    }
    for (const flame of playerCar.userData.flames as THREE.Mesh[]) {
      flame.visible = state.boosting;
      flame.scale.y = 0.85 + Math.sin(performance.now() * 0.035) * 0.22;
    }
    if (state.checkpoint) {
      checkpointGroup.visible = true;
      checkpointGroup.position.set(state.checkpoint.x, 4.2, state.checkpoint.z);
      const pulse = 1 + Math.sin(performance.now() * 0.005) * 0.06;
      checkpointRing.scale.setScalar(pulse);
      checkpointRing.rotation.z += 0.003;
    } else {
      checkpointGroup.visible = false;
    }

    trafficCars.forEach((car, index) => {
      const traffic = state.traffic[index];
      if (!traffic) return;
      car.position.set(traffic.x, 0, traffic.z);
      car.rotation.y = traffic.axis === 'z'
        ? (traffic.dir > 0 ? 0 : Math.PI)
        : (traffic.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    });

    const cameraHeading = state.heading + state.cameraYaw;
    const horizontalDistance = state.cameraDistance;
    const cameraHeight = 1.6 + Math.tan(state.cameraPitch) * horizontalDistance;
    camera.position.set(
      state.x - Math.sin(cameraHeading) * horizontalDistance,
      state.jumpY + cameraHeight,
      state.z - Math.cos(cameraHeading) * horizontalDistance,
    );
    target.set(state.x, state.jumpY + 0.9, state.z);
    camera.lookAt(target);
    if (state.checkpoint) checkpointRing.lookAt(camera.position);
    const speedRatio = Math.min(1, Math.abs(state.speed) / 180);
    camera.fov = 58 + speedRatio * 9 + (state.boosting ? 5 : 0);
    camera.updateProjectionMatrix();

    sun.position.set(state.x - 90, 130, state.z - 50);
    sun.target.position.set(state.x, 0, state.z);
    renderer.render(scene, camera);
  }

  function dispose() {
    scene.traverse((object) => {
      const objectMesh = object as THREE.Mesh;
      objectMesh.geometry?.dispose();
      const objectMaterial = objectMesh.material;
      if (Array.isArray(objectMaterial)) objectMaterial.forEach((item) => item.dispose());
      else objectMaterial?.dispose();
    });
    renderer.dispose();
  }

  return { render, dispose };
}

type PropertyTourOptions = {
  canvas: HTMLCanvasElement;
  propertyId: string;
  roomType: string;
  roomIndex: number;
  onHotspot?: (label: string) => void;
};

type PropertyPalette = {
  wall: number;
  floor: number;
  accent: number;
  metal: number;
  sky: number;
  luxury: boolean;
};

const PROPERTY_PALETTES: Record<string, PropertyPalette> = {
  studio: { wall: 0xe8daca, floor: 0x9f7659, accent: 0xbe6848, metal: 0x7c8588, sky: 0x92b8ca, luxury: false },
  onebed: { wall: 0xe0e5d8, floor: 0xae8e68, accent: 0x789271, metal: 0x8d9694, sky: 0xa7c8c3, luxury: false },
  twobed: { wall: 0xeadfce, floor: 0xb78c63, accent: 0xc27b55, metal: 0x858e92, sky: 0x8db4c8, luxury: false },
  townhouse: { wall: 0xdfd2c2, floor: 0x966846, accent: 0x8f503d, metal: 0x7a8180, sky: 0x91b89a, luxury: false },
  house: { wall: 0xe7e0d2, floor: 0xa57749, accent: 0x587c57, metal: 0x7f8987, sky: 0x8ec5db, luxury: false },
  estate: { wall: 0xf1ede5, floor: 0xe4e0d8, accent: 0xb58a3e, metal: 0xc7ad6b, sky: 0x82aac0, luxury: true },
  oceanmansion: { wall: 0xeaf2f1, floor: 0xe7e7e2, accent: 0x2b899f, metal: 0xbda66d, sky: 0x4eb9d5, luxury: true },
  privateisland: { wall: 0x393d42, floor: 0x24292f, accent: 0xd2ae58, metal: 0xd0b66c, sky: 0x3bc1d1, luxury: true },
};

function propertyPalette(id: string): PropertyPalette {
  return PROPERTY_PALETTES[id] || PROPERTY_PALETTES.studio;
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    const objectMesh = object as THREE.Mesh;
    objectMesh.geometry?.dispose();
    const objectMaterial = objectMesh.material;
    if (Array.isArray(objectMaterial)) objectMaterial.forEach((item) => item.dispose());
    else objectMaterial?.dispose();
  });
}

/**
 * Interactive real-time property diorama. Rooms use lightweight original
 * primitives, so tours load instantly without external model downloads.
 */
export function createPropertyTour(options: PropertyTourOptions) {
  const palette = propertyPalette(options.propertyId);
  const renderer = new THREE.WebGLRenderer({
    canvas: options.canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.sky);
  scene.fog = new THREE.Fog(palette.sky, 14, 27);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 60);
  const target = new THREE.Vector3(0, 1.25, 0);
  let yaw = 0.72;
  let pitch = 0.43;
  let distance = 13.4;
  let night = false;
  let viewMode: 'overview' | 'walkthrough' = 'overview';
  let disposed = false;
  let frame = 0;
  let roomRoot = new THREE.Group();
  let hotspots: THREE.Mesh[] = [];
  let roomType = options.roomType;
  let pointerId: number | null = null;
  let pointerX = 0;
  let pointerY = 0;
  let moved = false;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const hemisphere = new THREE.HemisphereLight(0xfff1d7, 0x476070, 2.1);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xffdfb8, 4.2);
  sun.position.set(-5, 9, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  scene.add(sun);
  const warmLamp = new THREE.PointLight(0xffc676, 18, 14, 2);
  warmLamp.position.set(2.8, 3.2, 1.6);
  scene.add(warmLamp);

  const distantGround = mesh(
    new THREE.CircleGeometry(24, 64),
    new THREE.MeshStandardMaterial({ color: 0x30483e, roughness: 1 }),
  );
  distantGround.rotation.x = -Math.PI / 2;
  distantGround.position.y = -0.28;
  scene.add(distantGround);
  for (let n = 0; n < 18; n++) {
    const angle = (n / 18) * Math.PI * 2;
    const radius = 12 + (n % 3) * 1.8;
    const trunk = mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.4, 7), material(0x65452f, 1, 0));
    trunk.position.set(Math.cos(angle) * radius, 0.42, Math.sin(angle) * radius);
    scene.add(trunk);
    const crown = mesh(new THREE.SphereGeometry(0.66 + (n % 2) * 0.16, 10, 8), material(n % 2 ? 0x477559 : 0x3b684e, 1, 0));
    crown.position.set(trunk.position.x, 1.35, trunk.position.z);
    scene.add(crown);
  }

  const roomBox = (
    parent: THREE.Object3D,
    size: [number, number, number],
    position: [number, number, number],
    surface: THREE.Material,
  ) => addBox(parent, size, position, surface);

  const hotspot = (parent: THREE.Object3D, label: string, position: [number, number, number]) => {
    const glow = new THREE.MeshStandardMaterial({
      color: 0xffe29a,
      emissive: palette.accent,
      emissiveIntensity: 2.5,
      metalness: 0.15,
      roughness: 0.2,
      transparent: true,
      opacity: 0.92,
    });
    const orb = mesh(new THREE.SphereGeometry(0.13, 18, 14), glow, false);
    orb.position.set(...position);
    orb.userData.label = label;
    orb.userData.baseY = position[1];
    const ring = mesh(
      new THREE.TorusGeometry(0.24, 0.026, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xffefb9, transparent: true, opacity: 0.78 }),
      false,
    );
    ring.rotation.x = Math.PI / 2;
    orb.add(ring);
    parent.add(orb);
    hotspots.push(orb);
  };

  const addPlant = (parent: THREE.Object3D, x: number, z: number) => {
    roomBox(parent, [0.52, 0.5, 0.52], [x, 0.25, z], material(0xaa6f49, 0.9, 0));
    for (const [dx, dz, rotation] of [[-0.18, 0, -0.35], [0.18, 0.04, 0.35], [0, -0.12, 0]] as const) {
      const leaf = mesh(new THREE.SphereGeometry(0.34, 12, 9), material(0x4e8c61, 0.92, 0));
      leaf.scale.set(0.55, 1.5, 0.42);
      leaf.position.set(x + dx, 0.82, z + dz);
      leaf.rotation.z = rotation;
      parent.add(leaf);
    }
  };

  const addSofa = (parent: THREE.Object3D, x: number, z: number, rotation = 0) => {
    const group = new THREE.Group();
    const fabric = material(palette.luxury ? 0xd8cbb5 : palette.accent, 0.86, 0.02);
    roomBox(group, [3.2, 0.55, 1.15], [0, 0.48, 0], fabric);
    roomBox(group, [3.2, 1.05, 0.34], [0, 1.02, -0.45], fabric);
    roomBox(group, [0.34, 0.78, 1.12], [-1.48, 0.66, 0], fabric);
    roomBox(group, [0.34, 0.78, 1.12], [1.48, 0.66, 0], fabric);
    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    parent.add(group);
    return group;
  };

  const addBed = (parent: THREE.Object3D) => {
    const frame = material(palette.luxury ? 0x8f6c35 : 0x74513e, 0.75, palette.luxury ? 0.18 : 0.02);
    roomBox(parent, [3.4, 0.38, 4.2], [0.8, 0.38, -0.35], frame);
    roomBox(parent, [3.15, 0.48, 3.78], [0.8, 0.72, -0.22], material(0xf5f0e7, 0.92, 0));
    roomBox(parent, [3.45, 1.65, 0.3], [0.8, 1.15, -2.15], frame);
    roomBox(parent, [1.25, 0.22, 0.72], [0.03, 1.03, -1.48], material(0xe0d5c5, 0.95, 0));
    roomBox(parent, [1.25, 0.22, 0.72], [1.57, 1.03, -1.48], material(0xe0d5c5, 0.95, 0));
    hotspot(parent, 'Cloud-soft designer bedding', [0.8, 1.32, 0.45]);
  };

  const addDining = (parent: THREE.Object3D) => {
    const wood = material(palette.luxury ? 0x9f783b : 0x7a5338, 0.66, palette.luxury ? 0.24 : 0.03);
    roomBox(parent, [3.8, 0.22, 1.75], [0.4, 1.25, 0], wood);
    for (const x of [-1.2, 2]) for (const z of [-0.55, 0.55]) {
      roomBox(parent, [0.16, 1.2, 0.16], [x, 0.62, z], wood);
    }
    for (const z of [-1.28, 1.28]) for (const x of [-0.75, 0.45, 1.65]) {
      roomBox(parent, [0.68, 0.18, 0.68], [x, 0.75, z], material(0x9a7358, 0.82, 0.02));
      roomBox(parent, [0.68, 0.85, 0.18], [x, 1.18, z + (z < 0 ? -0.25 : 0.25)], material(0x9a7358, 0.82, 0.02));
    }
    hotspot(parent, 'Dinner party ready', [0.4, 1.55, 0]);
  };

  const addKitchen = (parent: THREE.Object3D) => {
    const cabinet = material(palette.luxury ? 0x6f685e : 0x7e8b72, 0.75, 0.04);
    const counter = new THREE.MeshStandardMaterial({
      color: palette.luxury ? 0xf4f2eb : 0xd8c6aa,
      roughness: 0.28,
      metalness: palette.luxury ? 0.16 : 0.02,
    });
    for (const x of [-2.8, -1.55, -0.3, 0.95, 2.2]) {
      roomBox(parent, [1.12, 1.35, 0.72], [x, 0.68, -2.5], cabinet);
      roomBox(parent, [1.17, 0.12, 0.82], [x, 1.4, -2.46], counter);
    }
    roomBox(parent, [3.8, 1.05, 1.45], [0.4, 0.55, 0.18], cabinet);
    roomBox(parent, [4.05, 0.16, 1.65], [0.4, 1.15, 0.18], counter);
    for (const x of [-0.75, 0.4, 1.55]) {
      const stool = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.14, 18), material(0x9b704d, 0.76, 0.02));
      stool.position.set(x, 0.73, 1.35);
      parent.add(stool);
      roomBox(parent, [0.09, 0.68, 0.09], [x, 0.35, 1.35], material(0x494b4b, 0.5, 0.55));
    }
    hotspot(parent, palette.luxury ? 'Waterfall marble island' : 'Chef-friendly island', [0.4, 1.48, 0.18]);
  };

  const addOffice = (parent: THREE.Object3D) => {
    const wood = material(0x765039, 0.72, 0.03);
    roomBox(parent, [3.2, 0.22, 1.35], [0.65, 1.22, -0.7], wood);
    for (const x of [-0.65, 1.95]) roomBox(parent, [0.16, 1.2, 0.16], [x, 0.62, -0.7], wood);
    roomBox(parent, [1.25, 0.72, 0.12], [0.65, 1.72, -0.85], material(0x222a30, 0.25, 0.25));
    roomBox(parent, [0.45, 0.08, 0.32], [0.65, 1.33, -0.6], material(0x3e4548, 0.42, 0.35));
    for (const x of [-2.85, 2.9]) {
      roomBox(parent, [1.1, 3, 0.52], [x, 1.5, -2.45], material(0x6e503c, 0.8, 0.02));
      for (const y of [0.65, 1.35, 2.05, 2.72]) roomBox(parent, [0.95, 0.1, 0.55], [x, y, -2.42], material(0xb48a58, 0.7, 0.02));
    }
    hotspot(parent, 'A workspace with a view', [0.65, 2.18, -0.82]);
  };

  const addBathroom = (parent: THREE.Object3D) => {
    const porcelain = material(0xf6f7f4, 0.23, 0.02);
    const tub = mesh(new THREE.CapsuleGeometry(0.78, 2.2, 12, 24), porcelain);
    tub.rotation.z = Math.PI / 2;
    tub.rotation.y = Math.PI / 2;
    tub.scale.set(1, 0.48, 1.28);
    tub.position.set(1.65, 0.48, -0.65);
    parent.add(tub);
    roomBox(parent, [2.7, 0.95, 0.78], [-1.75, 0.5, -2.45], material(palette.luxury ? 0xe9e7e0 : 0xa9b8b1, 0.35, 0.08));
    roomBox(parent, [2.9, 0.12, 0.88], [-1.75, 1.02, -2.45], porcelain);
    const mirror = mesh(new THREE.CircleGeometry(0.82, 32), new THREE.MeshStandardMaterial({ color: 0xa8d0d8, metalness: 0.65, roughness: 0.1 }), false);
    mirror.position.set(-1.75, 2.2, -2.82);
    parent.add(mirror);
    hotspot(parent, palette.luxury ? 'Private spa bath' : 'Deep soaking tub', [1.65, 1.1, -0.65]);
  };

  const addGameRoom = (parent: THREE.Object3D) => {
    for (const x of [-2.2, -0.7, 0.8, 2.3]) {
      roomBox(parent, [1.05, 2.05, 0.8], [x, 1.02, -2.35], material(0x272d35, 0.45, 0.18));
      roomBox(parent, [0.72, 0.78, 0.04], [x, 1.42, -1.93], new THREE.MeshStandardMaterial({ color: x < 0 ? 0x61d9ec : 0xee6c9d, emissive: x < 0 ? 0x1687a0 : 0xa72c63, emissiveIntensity: 1.4 }));
    }
    roomBox(parent, [3.8, 0.22, 2], [0.25, 1.05, 0.2], material(0x6a4735, 0.72, 0.02));
    hotspot(parent, 'Four-player arcade wall', [0.1, 2.25, -2.05]);
  };

  const addGarden = (parent: THREE.Object3D) => {
    const water = mesh(
      new THREE.BoxGeometry(4.8, 0.18, 2.5),
      new THREE.MeshStandardMaterial({ color: 0x58bed0, transparent: true, opacity: 0.84, roughness: 0.16, metalness: 0.05 }),
    );
    water.position.set(0.7, 0.1, -0.25);
    parent.add(water);
    for (const x of [-3.6, 3.6]) for (const z of [-2.5, 2.5]) addPlant(parent, x, z);
    addSofa(parent, -1.2, 2.25, Math.PI);
    hotspot(parent, 'Heated sunset pool', [0.7, 0.62, -0.25]);
  };

  function addShell(parent: THREE.Object3D, type: string) {
    const wallSurface = material(palette.wall, 0.9, 0.01);
    const floorSurface = new THREE.MeshStandardMaterial({
      color: palette.floor,
      roughness: palette.luxury ? 0.3 : 0.74,
      metalness: palette.luxury ? 0.14 : 0.02,
    });
    roomBox(parent, [9.2, 0.26, 7.2], [0, -0.13, 0], floorSurface);
    roomBox(parent, [9.2, 4.6, 0.22], [0, 2.17, -3.5], wallSurface);
    roomBox(parent, [0.22, 4.6, 7.2], [-4.5, 2.17, 0], wallSurface);
    const rightHalf = type === 'garden' ? 1.1 : 2.6;
    roomBox(parent, [0.22, 4.6, rightHalf], [4.5, 2.17, -2.3], wallSurface);
    roomBox(parent, [0.22, 4.6, rightHalf], [4.5, 2.17, 2.3], wallSurface);
    const glass = new THREE.MeshStandardMaterial({
      color: palette.sky,
      emissive: palette.sky,
      emissiveIntensity: 0.18,
      transparent: true,
      opacity: 0.62,
      roughness: 0.08,
      metalness: 0.12,
    });
    roomBox(parent, [3.2, 2.5, 0.08], [1.9, 2.35, -3.37], glass);
    roomBox(parent, [0.08, 2.9, 2.6], [4.38, 2.05, 0], glass);
    const trim = material(palette.metal, 0.32, 0.45);
    for (const x of [0.3, 1.9, 3.5]) roomBox(parent, [0.07, 2.65, 0.12], [x, 2.32, -3.3], trim);
    roomBox(parent, [3.35, 0.08, 0.12], [1.9, 1.05, -3.3], trim);
    if (palette.luxury) {
      for (let x = -4; x <= 4; x += 1.15) {
        const vein = mesh(new THREE.BoxGeometry(0.025, 0.012, 7), material(0xb5b7b3, 0.5, 0.08), false);
        vein.position.set(x, 0.012, 0);
        vein.rotation.y = 0.18;
        parent.add(vein);
      }
    }
  }

  function buildRoom(type: string) {
    const nextRoot = new THREE.Group();
    hotspots = [];
    addShell(nextRoot, type);
    if (type === 'studio') {
      addBed(nextRoot);
      const studioSofa = addSofa(nextRoot, -2.6, 1.65, Math.PI / 2);
      studioSofa.scale.setScalar(0.72);
      addPlant(nextRoot, -3.35, -2.55);
      hotspot(nextRoot, 'A clever all-in-one layout', [-1.8, 1.35, 1.35]);
    } else if (type === 'bedroom') {
      addBed(nextRoot);
      addPlant(nextRoot, -3.25, -2.45);
    } else if (type === 'kitchen') {
      addKitchen(nextRoot);
    } else if (type === 'bathroom') {
      addBathroom(nextRoot);
      addPlant(nextRoot, 3.5, -2.5);
    } else if (type === 'office') {
      addOffice(nextRoot);
    } else if (type === 'dining') {
      addDining(nextRoot);
    } else if (type === 'game') {
      addGameRoom(nextRoot);
    } else if (type === 'garden') {
      addGarden(nextRoot);
    } else {
      addSofa(nextRoot, 0.2, 0.35, 0);
      roomBox(nextRoot, [2.6, 0.24, 1.25], [0.15, 0.32, 2.1], material(0x8b6348, 0.72, 0.03));
      roomBox(nextRoot, [2.7, 1.45, 0.13], [0.15, 1.45, -3.2], material(0x20282d, 0.22, 0.28));
      addPlant(nextRoot, -3.35, -2.55);
      hotspot(nextRoot, palette.luxury ? 'Gallery-scale living room' : 'A cozy place to unwind', [0.15, 1.22, 0.35]);
    }
    return nextRoot;
  }

  function setRoom(nextType: string, _roomIndex = 0) {
    scene.remove(roomRoot);
    disposeObject(roomRoot);
    roomType = nextType;
    roomRoot = buildRoom(nextType);
    roomRoot.scale.setScalar(0.96);
    roomRoot.position.y = -0.15;
    scene.add(roomRoot);
  }

  function applyCamera() {
    const horizontal = Math.cos(pitch) * distance;
    camera.position.set(
      Math.sin(yaw) * horizontal,
      1.15 + Math.sin(pitch) * distance,
      Math.cos(yaw) * horizontal,
    );
    camera.lookAt(target);
  }

  function resize() {
    const width = Math.max(1, options.canvas.clientWidth);
    const height = Math.max(1, options.canvas.clientHeight);
    if (options.canvas.width !== Math.floor(width * renderer.getPixelRatio()) ||
        options.canvas.height !== Math.floor(height * renderer.getPixelRatio())) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  }

  function setViewMode(mode: 'overview' | 'walkthrough') {
    viewMode = mode;
    if (mode === 'walkthrough') {
      yaw = 0.72;
      pitch = 0.18;
      distance = 5.6;
      target.set(0, 1.2, -0.25);
      camera.fov = 58;
    } else {
      yaw = 0.72;
      pitch = 0.43;
      distance = 13.4;
      target.set(0, 1.25, 0);
      camera.fov = 48;
    }
    camera.updateProjectionMatrix();
  }

  function reset() {
    setViewMode(viewMode);
  }

  function setNight(value: boolean) {
    night = value;
    scene.background = new THREE.Color(night ? 0x101a29 : palette.sky);
    scene.fog = new THREE.Fog(night ? 0x101a29 : palette.sky, 14, 27);
    hemisphere.intensity = night ? 0.62 : 2.1;
    sun.intensity = night ? 0.35 : 4.2;
    warmLamp.intensity = night ? 34 : 18;
  }

  const onPointerDown = (event: PointerEvent) => {
    pointerId = event.pointerId;
    pointerX = event.clientX;
    pointerY = event.clientY;
    moved = false;
    options.canvas.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return;
    const dx = event.clientX - pointerX;
    const dy = event.clientY - pointerY;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
    yaw -= dx * 0.008;
    pitch = Math.max(0.18, Math.min(0.78, pitch + dy * 0.005));
    pointerX = event.clientX;
    pointerY = event.clientY;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return;
    if (!moved) {
      const rect = options.canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(hotspots, false)[0];
      if (hit?.object.userData.label) options.onHotspot?.(hit.object.userData.label);
    }
    pointerId = null;
  };
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const minimum = viewMode === 'walkthrough' ? 4.6 : 8.5;
    const maximum = viewMode === 'walkthrough' ? 10.5 : 18;
    distance = Math.max(minimum, Math.min(maximum, distance + event.deltaY * 0.008));
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') yaw -= 0.12;
    else if (event.key === 'ArrowRight') yaw += 0.12;
    else if (event.key === 'ArrowUp') pitch = Math.max(0.18, pitch - 0.06);
    else if (event.key === 'ArrowDown') pitch = Math.min(0.78, pitch + 0.06);
    else if (event.key.toLowerCase() === 'r') reset();
    else return;
    event.preventDefault();
  };
  options.canvas.addEventListener('pointerdown', onPointerDown);
  options.canvas.addEventListener('pointermove', onPointerMove);
  options.canvas.addEventListener('pointerup', onPointerUp);
  options.canvas.addEventListener('pointercancel', onPointerUp);
  options.canvas.addEventListener('wheel', onWheel, { passive: false });
  options.canvas.addEventListener('keydown', onKeyDown);

  setRoom(roomType, options.roomIndex);
  const clock = new THREE.Clock();
  function draw() {
    if (disposed) return;
    resize();
    const time = clock.getElapsedTime();
    hotspots.forEach((orb, index) => {
      orb.position.y = orb.userData.baseY + Math.sin(time * 2.2 + index) * 0.055;
      orb.scale.setScalar(1 + Math.sin(time * 3 + index) * 0.1);
      const ring = orb.children[0];
      if (ring) ring.rotation.z = time * 0.7;
    });
    if (pointerId === null && viewMode === 'overview') yaw += 0.00045;
    applyCamera();
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw);

  function dispose() {
    disposed = true;
    cancelAnimationFrame(frame);
    options.canvas.removeEventListener('pointerdown', onPointerDown);
    options.canvas.removeEventListener('pointermove', onPointerMove);
    options.canvas.removeEventListener('pointerup', onPointerUp);
    options.canvas.removeEventListener('pointercancel', onPointerUp);
    options.canvas.removeEventListener('wheel', onWheel);
    options.canvas.removeEventListener('keydown', onKeyDown);
    disposeObject(scene);
    renderer.dispose();
  }

  return {
    dispose,
    reset,
    setRoom,
    setNight,
    setViewMode,
    isNight: () => night,
    getViewMode: () => viewMode,
  };
}
