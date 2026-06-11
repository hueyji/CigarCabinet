import * as THREE from "./vendor/three.module.min.js";

const MM_TO_UNIT = 1 / 1000;
const MIN_SIDE_MM = 120;

const materials = {
  body: new THREE.MeshStandardMaterial({
    color: 0xedc483,
    roughness: 0.72,
    metalness: 0.02,
  }),
  cedar: new THREE.MeshStandardMaterial({
    color: 0xedc483,
    roughness: 0.76,
    metalness: 0.02,
    emissive: 0x9a5c21,
    emissiveIntensity: 0.018,
  }),
  dark: new THREE.MeshStandardMaterial({
    color: 0xb9824d,
    roughness: 0.82,
  }),
  black: new THREE.MeshBasicMaterial({
    color: 0x111111,
  }),
  floor: new THREE.MeshStandardMaterial({
    color: 0xc7a37d,
    roughness: 0.9,
  }),
};

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const sphereGeometry = new THREE.SphereGeometry(0.018, 8, 6);
const circleGeometry = new THREE.CircleGeometry(0.018, 10);

function disposeObject(object) {
  object.traverse((child) => {
    if (
      child.geometry
      && child.geometry !== boxGeometry
      && child.geometry !== sphereGeometry
      && child.geometry !== circleGeometry
    ) {
      child.geometry.dispose();
    }
  });
}

function addBox(parent, { position, scale, material, name }) {
  const mesh = new THREE.Mesh(boxGeometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.name = name || "";
  parent.add(mesh);
  return mesh;
}

function addShelfLight(parent, { length, y, depth }) {
  const lightGroup = new THREE.Group();
  lightGroup.position.set(0, y, depth / 2 - 0.06);
  lightGroup.rotation.x = -Math.PI / 4;

  const lightCount = Math.max(2, Math.min(5, Math.round(length / 1.2)));
  for (let index = 0; index < lightCount; index += 1) {
    const x = -length * 0.42 + (length * 0.84 * index) / Math.max(lightCount - 1, 1);
    const light = new THREE.PointLight(0xffc47a, 0.22, Math.max(length / lightCount, depth) * 1.25);
    light.position.set(x, -0.18, -depth * 0.28);
    lightGroup.add(light);
  }
  parent.add(lightGroup);
}

function addAngledDisplayRack(parent, { length, height, depth, bayCount }) {
  const trayY = height * 0.42;
  const trayDepth = depth * 0.7;
  const totalWidth = length * 0.9;
  const gap = Math.min(0.08, totalWidth * 0.02);
  const trayCount = Math.max(1, bayCount);
  const trayWidth = (totalWidth - gap * (trayCount - 1)) / trayCount;

  for (let bayIndex = 0; bayIndex < trayCount; bayIndex += 1) {
    const trayGroup = new THREE.Group();
    const xOffset = -totalWidth / 2 + trayWidth / 2 + bayIndex * (trayWidth + gap);

    trayGroup.position.set(xOffset, trayY, depth * 0.1);
    trayGroup.rotation.x = Math.PI / 4;

    addBox(trayGroup, {
      position: [0, 0, 0],
      scale: [trayWidth, 0.035, trayDepth],
      material: materials.cedar,
      name: "angled-rack-base",
    });

    const columnCount = 4;
    for (let index = 1; index < columnCount; index += 1) {
      const x = -trayWidth / 2 + (trayWidth / columnCount) * index;
      addBox(trayGroup, {
        position: [x, 0.065, 0],
        scale: [0.018, 0.13, trayDepth * 0.92],
        material: materials.cedar,
        name: "vertical-rack-divider",
      });
    }

    const rowCount = 3;
    const rowStart = -trayDepth * 0.36;
    const rowEnd = trayDepth * 0.36;
    const rowStep = (rowEnd - rowStart) / rowCount;
    for (let index = 1; index < rowCount; index += 1) {
      const z = rowStart + rowStep * index;
      addBox(trayGroup, {
        position: [0, 0.062, z],
        scale: [trayWidth * 0.94, 0.11, 0.018],
        material: materials.cedar,
        name: "horizontal-rack-divider",
      });
    }

    [-trayWidth / 2, trayWidth / 2].forEach((x, index) => {
      addBox(trayGroup, {
        position: [x, 0.07, 0],
        scale: [0.026, 0.14, trayDepth * 0.9],
        material: materials.cedar,
        name: index === 0 ? "rack-left-frame" : "rack-right-frame",
      });
    });

    [rowStart, rowEnd].forEach((z, index) => {
      addBox(trayGroup, {
        position: [0, 0.065, z],
        scale: [trayWidth * 0.96, 0.12, 0.026],
        material: materials.cedar,
        name: index === 0 ? "rack-back-lip" : "rack-front-lip",
      });
    });

    const holeRows = 5;
    const holesPerRow = Math.max(7, Math.min(12, Math.round(trayWidth / 0.14)));
    const holes = holeRows * holesPerRow;
    for (let index = 0; index < holes; index += 1) {
      const row = Math.floor(index / holesPerRow);
      const col = index % holesPerRow;
      const x = -trayWidth * 0.4 + (trayWidth * 0.8 * col) / Math.max(holesPerRow - 1, 1);
      const z = rowStart + rowStep * 0.5 + (rowEnd - rowStart - rowStep) * row / Math.max(holeRows - 1, 1);
      const hole = new THREE.Mesh(sphereGeometry, materials.black);
      hole.scale.setScalar(0.58);
      hole.position.set(x, 0.035, z);
      trayGroup.add(hole);
    }

    parent.add(trayGroup);
  }
}

function createWoodGrainTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 96, 96);
  gradient.addColorStop(0, "#e4b87d");
  gradient.addColorStop(0.48, "#f5cc8e");
  gradient.addColorStop(1, "#c9955c");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 96, 96);

  for (let index = 0; index < 18; index += 1) {
    context.beginPath();
    context.moveTo(Math.random() * 96, 0);
    context.bezierCurveTo(
      Math.random() * 96,
      24,
      Math.random() * 96,
      70,
      Math.random() * 96,
      96,
    );
    context.strokeStyle = `rgba(145, 92, 42, ${0.08 + Math.random() * 0.06})`;
    context.lineWidth = 1 + Math.random() * 1.5;
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeRun({ length, height, depth, rotationY, position, label }) {
  const run = new THREE.Group();
  run.rotation.y = rotationY;
  run.position.set(position[0], position[1], position[2]);
  run.name = label;

  const panel = 0.045;
  const faceZ = -depth / 2;
  const centerY = height / 2;

  addBox(run, {
    position: [0, centerY, faceZ],
    scale: [length, height, panel],
    material: materials.cedar,
    name: "back",
  });

  addBox(run, {
    position: [-length / 2 + panel / 2, centerY, 0],
    scale: [panel, height, depth],
    material: materials.body,
  });
  addBox(run, {
    position: [length / 2 - panel / 2, centerY, 0],
    scale: [panel, height, depth],
    material: materials.body,
  });
  addBox(run, {
    position: [0, height - panel / 2, 0],
    scale: [length, panel, depth],
    material: materials.body,
  });
  addBox(run, {
    position: [0, panel / 2, 0],
    scale: [length, panel, depth],
    material: materials.body,
  });

  const bayCount = length > 3.6 ? 3 : length > 1.7 ? 2 : 1;
  for (let index = 1; index < bayCount; index += 1) {
    const x = -length / 2 + (length / bayCount) * index;
    addBox(run, {
      position: [x, centerY + height * 0.11, 0],
      scale: [panel, height * 0.76, depth * 0.96],
      material: materials.dark,
    });
  }

  const shelfYs = [height * 0.32, height * 0.55, height * 0.77];
  shelfYs.forEach((y) => {
    addBox(run, {
      position: [0, y, 0],
      scale: [length * 0.97, panel, depth * 0.94],
      material: materials.dark,
    });
  });

  addAngledDisplayRack(run, { length, height, depth, bayCount });

  const lowerHeight = height * 0.29;
  addBox(run, {
    position: [0, lowerHeight / 2 + panel, depth / 2 + 0.012],
    scale: [length * 0.98, lowerHeight, 0.035],
    material: materials.body,
  });
  for (let index = 1; index < 3; index += 1) {
    const x = -length / 2 + (length / 3) * index;
    addBox(run, {
      position: [x, lowerHeight / 2 + panel, depth / 2 + 0.035],
      scale: [0.028, lowerHeight * 0.86, 0.03],
      material: materials.dark,
    });
  }

  const holeRows = 4;
  const holesPerRow = Math.max(6, Math.min(18, Math.round(length / 0.28)));
  const holes = Math.min(72, holeRows * holesPerRow);
  for (let index = 0; index < holes; index += 1) {
    const row = Math.floor(index / holesPerRow);
    const col = index % holesPerRow;
    const x = -length * 0.42 + (length * 0.84 * col) / Math.max(holesPerRow - 1, 1);
    const y = lowerHeight * 0.24 + (lowerHeight * 0.46 * row) / Math.max(holeRows - 1, 1);
    const hole = new THREE.Mesh(circleGeometry, materials.black);
    hole.position.set(x, y, depth / 2 + 0.031);
    run.add(hole);
  }

  [height * 0.32, height * 0.55, height * 0.77].forEach((y) => {
    addShelfLight(run, { length, y: y + 0.03, depth });
  });

  const pointLight = new THREE.PointLight(0xffa13d, 0.55, Math.max(length, height) * 1.05);
  pointLight.position.set(0, height * 0.68, depth * 0.08);
  run.add(pointLight);

  return run;
}

function getRuns(config) {
  const depth = config.depth * MM_TO_UNIT;
  const height = config.height * MM_TO_UNIT;
  const frontLength = config.frontLength * MM_TO_UNIT;
  const leftLength = Math.max(MIN_SIDE_MM, config.leftLength) * MM_TO_UNIT;
  const rightLength = Math.max(MIN_SIDE_MM, config.rightLength) * MM_TO_UNIT;

  const runs = [
    {
      label: "front",
      length: frontLength,
      height,
      depth,
      rotationY: 0,
      position: [0, 0, 0],
    },
  ];

  if (config.layout === "leftL" || config.layout === "uShape") {
    runs.push({
      label: "left",
      length: leftLength,
      height,
      depth,
      rotationY: Math.PI / 2,
      position: [-frontLength / 2 + depth / 2, 0, leftLength / 2 + depth / 2],
    });
  }

  if (config.layout === "rightL" || config.layout === "uShape") {
    runs.push({
      label: "right",
      length: rightLength,
      height,
      depth,
      rotationY: -Math.PI / 2,
      position: [frontLength / 2 - depth / 2, 0, rightLength / 2 + depth / 2],
    });
  }

  return runs;
}

export function createCabinetPreview({ canvas, wrap, hint }) {
  if (!canvas || !wrap) {
    return null;
  }

  if (!window.WebGLRenderingContext) {
    wrap.classList.add("is-error");
    if (hint) hint.textContent = "当前浏览器不支持 WebGL";
    return null;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch (error) {
    console.error("3D preview failed to initialize:", error);
    wrap.classList.add("is-error");
    if (hint) hint.textContent = "3D 预览初始化失败";
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0dfcc);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80);
  camera.position.set(4.6, 2.8, 5.6);
  camera.lookAt(0, 1.25, -0.35);

  const root = new THREE.Group();
  root.rotation.y = -0.35;
  scene.add(root);

  const ambient = new THREE.HemisphereLight(0xfff4df, 0x5b4535, 1.5);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
  keyLight.position.set(3, 5, 4);
  scene.add(keyLight);

  const woodTexture = createWoodGrainTexture();
  materials.body.map = woodTexture;
  materials.body.needsUpdate = true;
  materials.cedar.map = woodTexture;
  materials.cedar.needsUpdate = true;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), materials.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  floor.position.z = 1.3;
  scene.add(floor);

  const grid = new THREE.GridHelper(16, 20, 0x8c684f, 0xcba787);
  grid.position.y = 0.002;
  grid.position.z = 1.3;
  scene.add(grid);

  let model = new THREE.Group();
  root.add(model);
  let configCache = null;
  let frame = 0;
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  let targetRotationY = root.rotation.y;
  let targetRotationX = -0.04;
  let rotationX = targetRotationX;
  let distance = 7.2;

  function resize() {
    const rect = wrap.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const needResize = canvas.width !== Math.floor(width * renderer.getPixelRatio())
      || canvas.height !== Math.floor(height * renderer.getPixelRatio());

    if (needResize) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    requestRender();
  }

  function frameCamera() {
    if (!configCache) return;
    const runs = getRuns(configCache);
    const front = configCache.frontLength * MM_TO_UNIT;
    const side = Math.max(configCache.leftLength, configCache.rightLength) * MM_TO_UNIT;
    const height = configCache.height * MM_TO_UNIT;
    const span = Math.max(front, side, height);
    distance = Math.max(5.2, span * 1.65);
    camera.position.set(distance * 0.62, height * 0.68 + 1.25, distance * 0.76);
    camera.lookAt(0, height * 0.42, side * 0.22);

    const allFront = runs.reduce((max, run) => Math.max(max, run.length), 0);
    root.position.x = allFront > 5.5 ? 0 : 0;
  }

  function rebuild(config) {
    configCache = { ...config };
    disposeObject(model);
    root.remove(model);
    model = new THREE.Group();

    getRuns(config).forEach((runConfig) => {
      model.add(makeRun(runConfig));
    });

    root.add(model);
    frameCamera();
    wrap.classList.add("is-ready");
    requestRender();
  }

  function renderFrame() {
    frame = 0;
    rotationX += (targetRotationX - rotationX) * 0.2;
    root.rotation.y += (targetRotationY - root.rotation.y) * 0.2;
    root.rotation.x = rotationX;
    renderer.render(scene, camera);

    if (Math.abs(targetRotationY - root.rotation.y) > 0.001 || Math.abs(targetRotationX - rotationX) > 0.001) {
      requestRender();
    }
  }

  function requestRender() {
    if (!frame) {
      frame = requestAnimationFrame(renderFrame);
    }
  }

  function pointerDown(event) {
    isDragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture?.(event.pointerId);
  }

  function pointerMove(event) {
    if (!isDragging) return;
    const deltaX = event.clientX - lastX;
    const deltaY = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    targetRotationY += deltaX * 0.006;
    targetRotationX = clamp(targetRotationX + deltaY * 0.003, -0.45, 0.25);
    requestRender();
  }

  function pointerUp(event) {
    isDragging = false;
    canvas.releasePointerCapture?.(event.pointerId);
  }

  function wheel(event) {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 1.08 : 0.92;
    camera.position.multiplyScalar(factor);
    requestRender();
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
  if (resizeObserver) {
    resizeObserver.observe(wrap);
  } else {
    window.addEventListener("resize", resize);
  }
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerUp);
  canvas.addEventListener("wheel", wheel, { passive: false });
  window.addEventListener("orientationchange", resize);

  resize();

  return {
    update: rebuild,
    destroy() {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener("resize", resize);
      }
      window.removeEventListener("orientationchange", resize);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      canvas.removeEventListener("wheel", wheel);
      renderer.dispose();
      woodTexture.dispose();
      floor.geometry.dispose();
      disposeObject(model);
      if (frame) cancelAnimationFrame(frame);
    },
  };
}
