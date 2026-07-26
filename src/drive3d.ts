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

  const ground = mesh(new THREE.PlaneGeometry(1200, 1200), material(0x48614d, 0.98, 0));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  world.add(ground);

  const asphalt = material(0x30363a, 0.96, 0.03);
  for (let n = -4; n <= 4; n++) {
    const xRoad = mesh(new THREE.BoxGeometry(ROAD_WIDTH, 0.08, 1080), asphalt);
    xRoad.position.set(n * ROAD_SPACING, 0.04, 0);
    xRoad.receiveShadow = true;
    world.add(xRoad);
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

  const buildingPalette = [0x707879, 0x786f68, 0x63737a, 0x78745f, 0x665f70];
  const sidewalkSurface = material(0x858a87, 0.94, 0);
  for (let gx = -5; gx < 4; gx++) {
    for (let gz = -5; gz < 4; gz++) {
      const centerX = gx * ROAD_SPACING + ROAD_SPACING / 2;
      const centerZ = gz * ROAD_SPACING + ROAD_SPACING / 2;
      const sidewalk = mesh(new THREE.BoxGeometry(92, 0.3, 92), sidewalkSurface);
      sidewalk.position.set(centerX, 0.15, centerZ);
      sidewalk.receiveShadow = true;
      world.add(sidewalk);

      const seed = seeded(gx, gz);
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

      const roof = mesh(
        new THREE.BoxGeometry(width + 1, 0.5, depth + 1),
        material(0x41484a, 0.86, 0.05),
      );
      roof.position.set(centerX, height + 0.55, centerZ);
      world.add(roof);

      const windowSurface = new THREE.MeshStandardMaterial({
        color: 0xf0c46d,
        emissive: 0xe5a94d,
        emissiveIntensity: 0.75,
      });
      for (let floor = 5; floor < height - 2; floor += 6) {
        for (const side of [-1, 1]) {
          const window = mesh(new THREE.PlaneGeometry(2.8, 2.2), windowSurface, false);
          window.position.set(centerX + side * (width / 2 + 0.02), floor, centerZ);
          window.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
          world.add(window);
        }
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
