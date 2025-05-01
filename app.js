import * as THREE from 'https://cdn.skypack.dev/three@0.152.2';
import { ARButton } from 'https://cdn.skypack.dev/three/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer;
let xrSession, refSpace;
let planes = new Map();
let objectPlaced = 0;

init();
requestXR();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(ARButton.createButton(renderer, {
    requiredFeatures: ['hit-test', 'plane-detection'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: document.body }
  }));

  renderer.setAnimationLoop(render);
}

async function requestXR() {
  const sessionInit = {
    requiredFeatures: ['local', 'hit-test', 'plane-detection'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: document.body }
  };

  xrSession = await navigator.xr.requestSession('immersive-ar', sessionInit);
  renderer.xr.setSession(xrSession);
  refSpace = await xrSession.requestReferenceSpace('local');

  xrSession.addEventListener('select', (event) => {
    // Handle object placement here
    if (lastHit && objectPlaced < 2) {
      placeObject(lastHit);
    }
  });
}

let lastHit = null;

function render(timestamp, frame) {
  if (frame) {
    const viewerPose = frame.getViewerPose(refSpace);
    const planeSet = frame.detectedPlanes;

    if (planeSet) {
      for (const plane of planeSet) {
        if (!planes.has(plane)) {
          const planeMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide, transparent: true, opacity: 0.3 })
          );
          planeMesh.matrixAutoUpdate = false;
          scene.add(planeMesh);
          planes.set(plane, planeMesh);
        }

        const pose = frame.getPose(plane.planeSpace, refSpace);
        if (pose) {
          const planeMesh = planes.get(plane);
          planeMesh.matrix.fromArray(pose.transform.matrix);
        }
      }
    }

    // Hit test for object placement
    const viewer = frame.getViewerPose(refSpace);
    if (viewer) {
      const hitTestSource = frame.getHitTestResultsForTransientInput
        ? frame.getHitTestResultsForTransientInput(refSpace)[0]
        : null;

      if (hitTestSource) {
        const hitPose = hitTestSource.results[0]?.getPose(refSpace);
        if (hitPose) lastHit = hitPose;
      }
    }
  }

  renderer.render(scene, camera);
}

function placeObject(pose) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: objectPlaced === 0 ? 'red' : 'blue' })
  );
  box.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
  box.quaternion.set(
    pose.transform.orientation.x,
    pose.transform.orientation.y,
    pose.transform.orientation.z,
    pose.transform.orientation.w
  );
  scene.add(box);
  objectPlaced++;
}
