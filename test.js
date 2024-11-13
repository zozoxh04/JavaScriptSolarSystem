let settings; // Declare settings globally
let isPaused = false;
let focusedPlanet = null;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragThreshold = 5;
let INTERSECTED;
let isExploringPlanet = false;

// Initialize renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Create scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const canvas = document.querySelector('canvas');

// Define maximum and minimum zoom limits
const zoomSpeed = 0.5; 
const minZoom = 1; 
const maxZoom = 10;  

// Set background
const cubeTextureLoader = new THREE.CubeTextureLoader();
scene.background = cubeTextureLoader.load([
  starsTexture, starsTexture, starsTexture, 
  starsTexture, starsTexture, starsTexture
]);

// Set up orbit controls with zoom limits
const orbit = new OrbitControls(camera, renderer.domElement);
camera.position.set(-90, 140, 140);
orbit.enableDamping = true;
orbit.dampingFactor = 0.25;
orbit.enableZoom = true;
orbit.minDistance = 20;
orbit.maxDistance = 450;
orbit.update();

document.getElementById('start-button').addEventListener('click', function() {
  document.getElementById('starter-screen').style.display = 'none';
  startSimulation();
  setupGUI();
});

function startSimulation() {
  console.log('Starting simulation...');
  renderer.setAnimationLoop(animate);
}

function setupGUI() {
  const guiContainer = document.getElementById('gui-container');
  const gui = new dat.GUI({ autoPlace: false });
  guiContainer.appendChild(gui.domElement);

  settings = {
      rotationSpeed: 1,
      showOrbits: true,
      showMoons: true,
      showAsteroidBelt: true,
      planetScale: 1,
      pauseResume: function() {
          isPaused = !isPaused;
          this.name = isPaused ? "Resume" : "Pause";
          gui.updateDisplay();
      }
  };
  gui.add(settings, 'rotationSpeed', 0.1, 5).name('Time Speed');
  gui.add(settings, 'showOrbits').name('Show Orbits').onChange(toggleOrbits);
  gui.add(settings, 'showMoons').name('Show Moons').onChange(toggleMoons);
  gui.add(settings, 'showAsteroidBelt').name('Show Asteroid Belt').onChange(toggleAsteroid);
  gui.add(settings, 'planetScale', 0.5, 2).name('Planet Scale').onChange(updatePlanetScale);
  gui.add(settings, 'pauseResume').name('Pause');
}

function toggleOrbits(value) {
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh && object.geometry instanceof THREE.RingGeometry) {
      object.visible = value;
    }
  });
}


// Handle window resizing
window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Additional event listeners and functionality
canvas.addEventListener('mousedown', (event) => {
  isDragging = false;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
});

canvas.addEventListener('mousemove', (event) => {
  const deltaX = Math.abs(event.clientX - dragStartX);
  const deltaY = Math.abs(event.clientY - dragStartY);
  if (deltaX > dragThreshold || deltaY > dragThreshold) {
    isDragging = true;
  }
});

canvas.addEventListener('mouseup', (event) => {
  if (!isDragging) {
    handlePlanetClick(event);
  }
});

function handlePlanetClick(event) {
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
      const object = intersects[0].object;
      if (planetData[object.name.toLowerCase()]) {
          focusedPlanet = object;
          orbit.enabled = false;
          displayPlanetInfo(planetData[object.name.toLowerCase()]);
          gsap.to(camera.position, {
              duration: 2,
              x: object.position.x + 50,
              y: object.position.y + 50,
              z: object.position.z + 50,
              onUpdate: function () {
                  camera.lookAt(object.position);
              }
          });
      }
  }
}
