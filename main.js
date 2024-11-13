import * as THREE from 'three';
import * as dat from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { atmosphereVertexShader, atmosphereFragmentShader } from './atmosphereShader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

import starsTexture from './src/img/stars.jpg';
import starsTexture2 from './src/img/stars2.jpg';
import sunTexture from './src/img/sun.jpg';
import mercuryTexture from './src/img/mercury.jpg';
import venusTexture from './src/img/venus.jpg';
import earthTexture from './src/img/earth.jpg';
import marsTexture from './src/img/mars.jpg';
import jupiterTexture from './src/img/jupiter.jpg';
import saturnTexture from './src/img/saturn.jpg';
import saturnRingTexture from './src/img/saturnring.jpg';
import uranusTexture from './src/img/uranus.jpg';
import uranusRingTexture from './src/img/uranusring.jpg';
import neptuneTexture from './src/img/neptune.jpg';
import plutoTexture from './src/img/pluto.jpg';
import moonTexture from './src/img/moon.jpg';
import europaTexture from './src/img/Europa.jpg';
import ioTexture from './src/img/Io.jpg';
import ganymedeTexture from './src/img/Ganymede.jpg';
import callistoTexture from './src/img/Callisto.jpg';
import asteroidTexture from './src/img/asteroid.jpg'


let isPaused = false;
let focusedPlanet = null;
// Variables to track dragging
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragThreshold = 5; // Minimum movement to consider it a drag
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
orbit.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
orbit.dampingFactor = 0.25;
orbit.enableZoom = true; // Allow zooming
orbit.minDistance = 20; // Minimum zoom distance
orbit.maxDistance = 450; // Maximum zoom distance
orbit.update();

// Add lights
const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 3, 300);
pointLight.castShadow = true;
scene.add(pointLight);

// Set up GUI
const gui = new dat.GUI();
const settings = { 
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

// Function to toggle orbit visibility
function toggleOrbits(value) {
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh && object.geometry instanceof THREE.RingGeometry) {
      object.visible = value;
    }
  });
}

// Function to toggle moon visibility
function toggleMoons(value) {
  // Assuming moons are children of planet objects
  [mercury, venus, earth, mars, jupiter, saturn, uranus, neptune, pluto].forEach(planet => {
    planet.obj.traverse((object) => {
      if (object.name && object.name.toLowerCase().includes('moon')) {
        object.visible = value;
      }
    });
  });
}

// Function to toggle asteroid belt visibility
function toggleAsteroid(value) {
  asteroidBelt.visible = value;
  smallerAsteroidBelt.visible = value;
}

// Function to update planet scale
function updatePlanetScale(value) {
  [mercury, venus, earth, mars, jupiter, saturn, uranus, neptune, pluto].forEach(planet => {
    planet.mesh.scale.setScalar(value);
  });
}

// Set up raycaster and mouse
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Planet data
const planetData = {
  mercury: {
    name: 'Mercury',
    size: '4,880 km',
    distance: '57.9 million km',
    educationalFact: 'Mercury is the closest planet to the Sun and has no atmosphere to retain heat, making its surface temperature fluctuate drastically.',
    funFact: 'Mercury has the shortest year of any planet, completing one orbit around the Sun in just 88 Earth days!'
  },
  venus: {
    name: 'Venus',
    size: '12,104 km',
    distance: '108.2 million km',
    educationalFact: 'Venus has a thick atmosphere of carbon dioxide, making it the hottest planet in our solar system.',
    funFact: 'A day on Venus is longer than a year! It takes 243 Earth days to rotate once, but only 225 days to orbit the Sun.'
  },
  earth: {
    name: 'Earth',
    size: '12,742 km',
    distance: '149.6 million km',
    educationalFact: 'Earth is the only planet known to have liquid water on its surface and supports a vast array of life.',
    funFact: "Earth isn't perfectly round—it's slightly flattened at the poles and bulging at the equator!"
  },
  mars: {
    name: 'Mars',
    size: '6,779 km',
    distance: '227.9 million km',
    educationalFact: 'Mars is known as the Red Planet due to iron oxide (rust) on its surface, giving it a reddish appearance.',
    funFact: 'Mars has the largest volcano in the solar system, Olympus Mons, which is about three times the height of Mount Everest.'
  },
  jupiter: {
    name: 'Jupiter',
    size: '139,820 km',
    distance: '778.3 million km',
    educationalFact: 'Jupiter is the largest planet in the solar system and has a massive storm, the Great Red Spot, that has raged for centuries.',
    funFact: 'Jupiter has at least 79 moons! The four largest are called the Galilean moons: Io, Europa, Ganymede, and Callisto.'
  },
  saturn: {
    name: 'Saturn',
    size: '116,460 km',
    distance: '1.4 billion km',
    educationalFact: 'Saturn is famous for its stunning ring system, made of ice and rock particles.',
    funFact: "Saturn's density is so low that if there were a large enough bathtub, it would float in water!"
  },
  uranus: {
    name: 'Uranus',
    size: '50,724 km',
    distance: '2.9 billion km',
    educationalFact: 'Uranus rotates on its side, making its axis nearly parallel to the plane of the solar system.',
    funFact: 'Uranus has a faint ring system and orbits the Sun lying on its side!'
  },
  neptune: {
    name: 'Neptune',
    size: '49,244 km',
    distance: '4.5 billion km',
    educationalFact: 'Neptune is known for its strong winds, with speeds reaching up to 2,100 kilometers per hour.',
    funFact: "Neptune has a blue color due to the methane in its atmosphere, and it has a storm similar to Jupiter's Great Red Spot called the Great Dark Spot."
  },
  pluto: {
    name: 'Pluto',
    size: '2,377 km',
    distance: '5.9 billion km',
    educationalFact: 'Pluto was reclassified as a dwarf planet in 2006 due to its small size and location in the Kuiper Belt.',
    funFact: "Pluto's largest moon, Charon, is so big that Pluto and Charon orbit each other like a double planet system!"
  }
};

// Function to display planet information
function displayPlanetInfo(planet, factType = 'educationalFact') {
  const infoDiv = document.getElementById('planet-info');
  if (!infoDiv) {
    console.error('planet-info element not found');
    return;
  }
  
  infoDiv.style.display = 'block';
  infoDiv.innerHTML = `
    <h2>${planet.name}</h2>
    <p>Size: ${planet.size}</p>
    <p>Distance from Sun: ${planet.distance}</p>
    <p id="fact">${planet[factType]}</p>
    <button id="eduBtn">Educational Fact</button>
    <button id="funBtn">Fun Fact</button>
    <button id="exitBtn">Exit</button>
  `;

  // Stop propagation on planet-info div
  infoDiv.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  document.getElementById('eduBtn').addEventListener('click', () => {
    document.getElementById('fact').innerText = planet.educationalFact;
  });

  document.getElementById('funBtn').addEventListener('click', () => {
    document.getElementById('fact').innerText = planet.funFact;
  });
  document.getElementById('exitBtn').addEventListener('click', () => {
    infoDiv.style.display = 'none';
    resetView();
  });
}



// Handle click events
window.addEventListener('click', function (event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;
    const planetName = clickedObject.name.toLowerCase();

    if (planetData[planetName] || planetName === 'sun') {
      focusedPlanet = clickedObject;
      orbit.enabled = false; // Disable orbit controls when focusing on a planet
    
    if (planetData[planetName]) {
      displayPlanetInfo(planetData[planetName]);
    } else if (planetName === 'sun') {
      displayPlanetInfo({ 
        name: 'Sun', 
        size: '1,391,000 km', 
        distance: '0 km (center of the solar system)',
        educationalFact: 'The Sun is a massive ball of plasma at the center of our solar system, providing heat and light to Earth.',
        funFact: 'The Sun accounts for 99.86% of the mass in the solar system!'
      });
    } else {
      displayPlanetInfo(planetData[planetName]);
    }
  }

    // Animate the camera to focus on the clicked planet
    gsap.to(camera.position, {
      duration: 2,
      x: clickedObject.position.x + 50,
      y: clickedObject.position.y + 50,
      z: clickedObject.position.z + 50,
      onUpdate: function () {
        camera.lookAt(clickedObject.position);
      }
    });

    // Add the explore button with planet's image
    const exploreButton = document.createElement('button');
    exploreButton.innerHTML = `<img src="${planetName}.jpg" alt="${planetName}" /> Explore`;
    exploreButton.style.position = 'absolute';
    exploreButton.style.right = '20px';
    exploreButton.style.top = '400px';
    exploreButton.onclick = () => {
        openExplorePanel(clickedObject);
        document.getElementById('planet-info').style.display = 'none'; // Hide the info panel
    };
    document.body.appendChild(exploreButton);

   
  } else {

    focusedPlanet = null;
    orbit.enabled = true;
  }

});

    
// Create planets function
const textureLoader = new THREE.TextureLoader();
function createPlanet(name, size, texture, position, ring, atmosphereProps, moons = []) {
  const geo = new THREE.SphereGeometry(size, 30, 30);
  const mat = new THREE.MeshStandardMaterial({ map: textureLoader.load(texture) });
  const mesh = new THREE.Mesh(geo, mat);
  const obj = new THREE.Object3D();
  obj.add(mesh);
  
  if (ring) {
    const ringGeo = new THREE.RingGeometry(ring.innerRadius, ring.outerRadius, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      map: textureLoader.load(ring.texture),
      side: THREE.DoubleSide
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    obj.add(ringMesh);
    ringMesh.position.x = position;
    ringMesh.rotation.x = -0.5 * Math.PI;
  }
  
  // Create moons
  moons.forEach(moon => {
    const moonGeo = new THREE.SphereGeometry(moon.size, 20, 20);
    const moonMat = new THREE.MeshStandardMaterial({ map: textureLoader.load(moon.texture) });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.x = moon.distance;
    moonMesh.name = moon.name;
    obj.add(moonMesh);
  });

  obj.add(mesh);
    
  // Create atmosphere
  if (atmosphereProps) {
    const atmosphereSize = size * 1.1; // Atmosphere is 10% larger than the planet
    const atmosphereGeo = new THREE.SphereGeometry(atmosphereSize, 30, 30);
    const atmosphereMat = new THREE.ShaderMaterial({
      uniforms: {
        sunPosition: { value: new THREE.Vector3(0, 1, -1).normalize() },
        rayleigh: { value: 1 },
        turbidity: { value: 10 },
        mieCoefficient: { value: 0.005 },
        mieDirectionalG: { value: 0.8 },
        up: { value: new THREE.Vector3(0, 1, 0) },
        planetColor: { value: new THREE.Color(atmosphereProps.color) },
        atmosphereDensity: { value: atmosphereProps.density }
      },
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      side: THREE.BackSide,
      transparent: true
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    obj.add(atmosphereMesh);
  }


  scene.add(obj);
  mesh.position.x = position;
  mesh.name = name;
  
  return { mesh, obj };
}

// Create planets
const mercury = createPlanet('Mercury', 3.2, mercuryTexture, 28, null, {color: 0xA5A5A5, density: 0.1});
const venus = createPlanet('Venus', 5.8, venusTexture, 44, null, { color: 0xFFD700, density: 2.0 });
const earth = createPlanet('Earth', 6, earthTexture, 62, null, { color: 0x4169E1, density: 1.0 }, [
  { name:'Moon', size: 1.5, texture: moonTexture, distance: 10 }
]);
const mars = createPlanet('Mars', 4, marsTexture, 78, null, { color: 0xFF4500, density: 0.6 });
const jupiter = createPlanet('Jupiter', 12, jupiterTexture, 100, null, { color: 0xfbceb1, density: 0.7 },[
{ name:'Io', size: 0.8, texture: ioTexture, distance: 15 },
{ name:'Europa', size: 0.7, texture: europaTexture, distance: 18 },
{ name:'Ganymede', size: 1, texture: ganymedeTexture, distance: 21 },
{ name:'Callisto', size: 0.9, texture: callistoTexture, distance: 24 },
]);

const saturn = createPlanet('Saturn', 10, saturnTexture, 138, {
  innerRadius: 10,
  outerRadius: 20,
  texture: saturnRingTexture
}, {color: 0xeedfcc, density: 0.5});
const uranus = createPlanet('Uranus', 7, uranusTexture, 176, {
  innerRadius: 7,
  outerRadius: 12,
  texture: uranusRingTexture
}, {color: 0x1b0e2ff, density: 0.2});
const neptune = createPlanet('Neptune', 7, neptuneTexture, 200, null, {color: 0x104e8b, density: 0.2});
const pluto = createPlanet('Pluto', 2.8, plutoTexture, 216, null, {color: 0xc08081, density: 0.2});
const asteroidBelt = createAsteroidBelt(scene, 280, 220, 2000, asteroidTexture);
const smallerAsteroidBelt = createAsteroidBelt(scene, 90, 80, 500, asteroidTexture);

// Create the Sun
const sunGeo = new THREE.SphereGeometry(16, 30, 30);
const sunMat = new THREE.MeshBasicMaterial({
  map: textureLoader.load(sunTexture),
  emissive: new THREE.Color(0xffff00),
  emissiveIntensity: 2.0
});
const sun = new THREE.Mesh(sunGeo, sunMat);
sun.name = 'Sun';
scene.add(sun);

// Add Glow Around the Sun
const sunGlowGeo = new THREE.SphereGeometry(18, 30, 30);
const sunGlowMat = new THREE.ShaderMaterial({
  uniforms: {
    viewVector: { value: camera.position }
  },
  vertexShader: `
    uniform vec3 viewVector;
    varying float intensity;
    void main() {
      vec3 vNormal = normalize(normalMatrix * normal);
      vec3 vNormel = normalize(normalMatrix * viewVector);
      intensity = pow(0.5 - dot(vNormal, vNormel), 2.0);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying float intensity;
    void main() {
      vec3 glow = vec3(1.0, 0.6, 0.0) * intensity;
      gl_FragColor = vec4(glow, 1.0);
    }
  `,
  side: THREE.BackSide,
  blending: THREE.AdditiveBlending,
  transparent: true
});
const sunGlow = new THREE.Mesh(sunGlowGeo, sunGlowMat);
scene.add(sunGlow);

// Add Outer Glow (Optional)
const outerGlowGeo = new THREE.SphereGeometry(20, 30, 30);
const outerGlowMat = new THREE.MeshBasicMaterial({
  color: 0xffaa00,
  transparent: true,
  opacity: 0.2,
  side: THREE.BackSide
});
const outerGlow = new THREE.Mesh(outerGlowGeo, outerGlowMat);
scene.add(outerGlow);



function createOrbitRing(radius, color) {
  const ringGeo = new THREE.RingGeometry(radius - 0.1, radius + 0.1, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -0.5 * Math.PI;
  scene.add(ring);  // Add the ring to the scene here
  return ring;
}

function createAsteroidBelt(scene, innerRadius, outerRadius, asteroidCount = 1000, texture) {
  const asteroidGeometry = new THREE.SphereGeometry(0.8, 4, 4);
  const asteroidMaterial = new THREE.MeshStandardMaterial({
    map: textureLoader.load(texture),
    roughness: 0.8,
    metalness: 0.2,
  });

  const asteroidBelt = new THREE.Group();
  for (let i = 0; i < asteroidCount; i++) {
    const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);

    // Random position within the belt
    const radius = THREE.MathUtils.randFloat(innerRadius, outerRadius);
    const angle = Math.random() * Math.PI * 2;
    const y = THREE.MathUtils.randFloatSpread((outerRadius - innerRadius) / 10);

    asteroid.position.set(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    );

    // Random rotation
    asteroid.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    // Random scale
    const scale = THREE.MathUtils.randFloat(0.5, 2);
    asteroid.scale.set(scale, scale, scale);

    asteroidBelt.add(asteroid);
  
  }

  scene.add(asteroidBelt);

  return asteroidBelt;
}


// Create the orbit rings
createOrbitRing(28, 0x888888);  // Mercury (gray)
createOrbitRing(44, 0xffd700);  // Venus (golden)
createOrbitRing(62, 0x00ff00);  // Earth (green)
createOrbitRing(78, 0xff0000);  // Mars (red)
createOrbitRing(100, 0xffa500); // Jupiter (orange)
createOrbitRing(138, 0xffff00); // Saturn (yellow)
createOrbitRing(176, 0xadd8e6); // Uranus (light blue)
createOrbitRing(200, 0x0000ff); // Neptune (blue)
createOrbitRing(216, 0xdda0dd); // Pluto (light purple)

// Animation function
function animate() {
  if (scene.visible) {

  if (!isPaused) {


  const timeSpeed = settings.rotationSpeed;

  sun.rotateY(0.004 * timeSpeed);
  mercury.mesh.rotateY(0.004 * timeSpeed);
  mercury.obj.rotateY(0.04 * timeSpeed);
  venus.mesh.rotateY(0.002 * timeSpeed);
  venus.obj.rotateY(0.015 * timeSpeed);
  earth.mesh.rotateY(0.02 * timeSpeed);
  earth.obj.rotateY(0.01 * timeSpeed);
  mars.mesh.rotateY(0.018 * timeSpeed);
  mars.obj.rotateY(0.008 * timeSpeed);
  jupiter.mesh.rotateY(0.04 * timeSpeed);
  jupiter.obj.rotateY(0.002 * timeSpeed);
  saturn.mesh.rotateY(0.038 * timeSpeed);
  saturn.obj.rotateY(0.0009 * timeSpeed);
  uranus.mesh.rotateY(0.03 * timeSpeed);
  uranus.obj.rotateY(0.0004 * timeSpeed);
  neptune.mesh.rotateY(0.032 * timeSpeed);
  neptune.obj.rotateY(0.0001 * timeSpeed);
  pluto.mesh.rotateY(0.008 * timeSpeed);
  pluto.obj.rotateY(0.00007 * timeSpeed);
  asteroidBelt.rotateY(0.0001);
  smallerAsteroidBelt.rotateY(0.0001);

  if (focusedPlanet) {
    const offset = new THREE.Vector3(30, 15, 30);
    const cameraTarget = new THREE.Vector3();
    focusedPlanet.getWorldPosition(cameraTarget);
    const desiredPosition = cameraTarget.clone().add(offset);


    camera.position.lerp(desiredPosition, 0.05);
    camera.lookAt(cameraTarget);
  }

  // Rotate moons
  earth.obj.children.forEach(moon => {
    if (moon.name === 'Moon') {
      moon.rotateY(0.01 * timeSpeed);
    }
  });

  jupiter.obj.children.forEach(moon => {
    if (['Io', 'Europa', 'Ganymede', 'Callisto'].includes(moon.name)) {
      moon.rotateY(0.02 * timeSpeed);
    }
  });

  }
  

 // Render the scene
 renderer.render(scene, camera);
}
}

// Ensure the animate loop is set
renderer.setAnimationLoop(animate);


function addResetViewButton() {
  const button = document.createElement('button');
  button.textContent = 'Reset View';
  button.style.position = 'absolute';
  button.style.bottom = '20px';
  button.style.left = '20px';
  button.addEventListener('click', () => {
    focusedPlanet = null;
    orbit.enabled = true;
    camera.position.set(-90, 140, 140);
    camera.lookAt(scene.position);
    document.getElementById('planet-info').style.display = 'none'; // Hide the info panel
  });
  document.body.appendChild(button);
}
addResetViewButton();


// Function to reset the camera view
function resetView() {
  orbit.enabled = true;
  camera.position.set(-90, 140, 140);
  camera.lookAt(scene.position);
}

// Handle window resizing
window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById('start-button').addEventListener('click', function() {
  // Hide the starter screen
  document.getElementById('starter-screen').style.display = 'none';
  
  // Start Three.js simulation
  startSimulation();
});
function startSimulation() {
  // This function should initialize your Three.js scene and start the animation
  console.log('Starting simulation...');
  // Add your Three.js initialization code here
}

// Listen for mouse wheel event to zoom in and out
window.addEventListener('wheel', (event) => {
  // Prevent the default scroll behavior
  event.preventDefault();

  // Update camera position and ensure it respects zoom limits
  const zoomDirection = event.deltaY > 0 ? 1 : -1; // Determine zoom direction
  const zoomAmount = zoomSpeed * zoomDirection;

  // Check if the new position exceeds the limits
  const newZ = camera.position.z + zoomAmount;
  if (newZ > orbit.minDistance && newZ < orbit.maxDistance) {
    camera.position.z = newZ; // Update camera position if within bounds
  } 
}, { passive: false });  // Add this option



// Function to handle mouse down (drag start)
canvas.addEventListener('mousedown', (event) => {
  isDragging = false;  // Reset drag state
  dragStartX = event.clientX;
  dragStartY = event.clientY;
});

document.addEventListener('mousemove', (event) => {
  if (isExploringPlanet) {
      mouseX = (event.clientX - window.innerWidth / 2) * 0.002;
      mouseY = (event.clientY - window.innerHeight / 2) * 0.002;
  }
});

// Function to handle mouse move (detect drag)
canvas.addEventListener('mousemove', (event) => {
  const deltaX = Math.abs(event.clientX - dragStartX);
  const deltaY = Math.abs(event.clientY - dragStartY);

  // If movement exceeds threshold, it's considered a drag
  if (deltaX > dragThreshold || deltaY > dragThreshold) {
    isDragging = true;
  }
});

// Function to handle mouse up (drag end / click detection)
canvas.addEventListener('mouseup', (event) => {
  // Only call handlePlanetClick if no dragging occurred
  if (!isDragging) {
    handlePlanetClick(event);  // This is a genuine click
  }
});

function handlePlanetClick(event) {
  // Prevent the default behavior
  event.preventDefault();

  // Get mouse position
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
      // Get the first intersected object
      const object = intersects[0].object;

      // Check if the clicked object is a planet
      if (planetData[object.name.toLowerCase()]) {
          focusedPlanet = object;
          orbit.enabled = false;
          displayPlanetInfo(planetData[object.name.toLowerCase()]);
          
          // Animate camera to focus on the clicked planet
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

// Add this event listener to your canvas
canvas.addEventListener('click', handlePlanetClick);

function checkHover() {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    if (INTERSECTED != intersects[0].object) {
      if (INTERSECTED) INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
      INTERSECTED = intersects[0].object;
      INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
      INTERSECTED.material.emissive.setHex(0xffffff); // Highlight color
      document.getElementById('planet-info').innerText = INTERSECTED.name; // Show name
    }
  } else {
    if (INTERSECTED) INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
    INTERSECTED = null;
  }
}

function openExplorePanel(planet) {
  scene.visible = false;
  isExploringPlanet = true;

  // Create a new scene for the planet exploration
  const planetScene = new THREE.Scene();
  
  // Create new orbit controls specifically for exploration
  const exploreControls = new OrbitControls(camera, renderer.domElement);
  exploreControls.enableDamping = true;
  exploreControls.dampingFactor = 0.05;
  exploreControls.screenSpacePanning = false;

  // Set up EffectComposer for bloom effect
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(planetScene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,  // bloom strength
    0.4,  // bloom radius
    0.85  // bloom threshold
  );
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  // Find the selected planet object
  const planetObject = [mercury, venus, earth, mars, jupiter, saturn, uranus, neptune, pluto]
      .find(p => p.mesh.name === planet.name);

  if (planetObject) {
    // Create a smaller version of the planet for better viewing
    const surfaceGeo = new THREE.SphereGeometry(100, 60, 60);
    const surfaceMat = new THREE.MeshStandardMaterial({ 
      map: planetObject.mesh.material.map,
      normalScale: new THREE.Vector2(1, 1),
      normalMap: planetObject.mesh.material.normalMap,
      emissive: new THREE.Color(0x444444), // Slight emissive for bloom
      emissiveIntensity: 0.1
    });
    const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
    surfaceMesh.rotation.y = Math.PI;
    planetScene.add(surfaceMesh);

    // Create atmosphere with glow effect
    const atmosphereGeo = new THREE.SphereGeometry(100, 60, 60);
    const atmosphereMat = new THREE.ShaderMaterial({
      uniforms: {
        sunPosition: { value: new THREE.Vector3(0, 1, -1).normalize() },
        rayleigh: { value: 1 },
        turbidity: { value: 10 },
        mieCoefficient: { value: 0.005 },
        mieDirectionalG: { value: 0.8 },
        up: { value: new THREE.Vector3(0, 1, 0) },
        planetColor: { value: getPlanetAtmosphereColor(planet.name) }, // Custom color per planet
        atmosphereDensity: { value: getPlanetAtmosphereDensity(planet.name) } // Custom density per planet
      },
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    planetScene.add(atmosphereMesh);

    // Add outer glow layer
    const glowGeo = new THREE.SphereGeometry(115, 60, 60);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        viewVector: { value: camera.position }
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.6 - dot(vNormal, vNormel), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float intensity;
        void main() {
          vec3 glow = vec3(0.1, 0.2, 0.3) * intensity;
          gl_FragColor = vec4(glow, 1.0);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    planetScene.add(glowMesh);

    // Add stars to the background
    const starGeometry = new THREE.SphereGeometry(500, 32, 32);
    const starMaterial = new THREE.MeshBasicMaterial({
      map: textureLoader.load(starsTexture2),
      side: THREE.BackSide
    });
    const starField = new THREE.Mesh(starGeometry, starMaterial);
    planetScene.add(starField);

    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040);
    planetScene.add(ambientLight);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(200, 100, 200);
    planetScene.add(light);

    // Add a glowing sun
    const sunGeo = new THREE.SphereGeometry(20, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ 
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 2
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(200, 100, 200);
    planetScene.add(sunMesh);

    // Camera and controls setup
    camera.position.set(0, 50, 200);
    camera.lookAt(0, 0, 0);
    exploreControls.minDistance = 150;
    exploreControls.maxDistance = 400;
    exploreControls.maxPolarAngle = Math.PI / 1.5;
    exploreControls.minPolarAngle = Math.PI / 3;

    // Animation loop with bloom effect
    function animatePlanetExploration() {
      if (!isExploringPlanet) return;
      
      requestAnimationFrame(animatePlanetExploration);
      exploreControls.update();
      surfaceMesh.rotation.y += 0.0005;
      
      // Update glow effect based on camera position
      glowMat.uniforms.viewVector.value = new THREE.Vector3().subVectors(
        camera.position,
        glowMesh.position
      );
      
      composer.render();
    }
    animatePlanetExploration();
  }

  // Create UI Panel
  createExplorationPanel(planet, exploreControls);
}

// Helper function to get planet-specific atmosphere colors
function getPlanetAtmosphereColor(planetName) {
  const colors = {
    'Mercury': new THREE.Vector3(0.7, 0.7, 0.7),
    'Venus': new THREE.Vector3(0.9, 0.7, 0.3),
    'Earth': new THREE.Vector3(0.3, 0.5, 0.9),
    'Mars': new THREE.Vector3(0.9, 0.4, 0.2),
    'Jupiter': new THREE.Vector3(0.8, 0.6, 0.4),
    'Saturn': new THREE.Vector3(0.9, 0.8, 0.5),
    'Uranus': new THREE.Vector3(0.4, 0.7, 0.8),
    'Neptune': new THREE.Vector3(0.2, 0.4, 0.9),
    'Pluto': new THREE.Vector3(0.6, 0.6, 0.7)
  };
  return colors[planetName] || new THREE.Vector3(1, 1, 1);
}

// Helper function to get planet-specific atmosphere density
function getPlanetAtmosphereDensity(planetName) {
  const densities = {
    'Mercury': 0.1,
    'Venus': 2.0,
    'Earth': 1.0,
    'Mars': 0.3,
    'Jupiter': 1.5,
    'Saturn': 1.3,
    'Uranus': 1.2,
    'Neptune': 1.2,
    'Pluto': 0.1
  };
  return densities[planetName] || 1.0;
}

// Helper function to create the exploration panel UI
function createExplorationPanel(planet, exploreControls) {
  const panel = document.createElement('div');
  panel.style.position = 'absolute';
  panel.style.left = '20px';
  panel.style.top = '20px';
  panel.style.padding = '20px';
  panel.style.background = 'rgba(0, 0, 0, 0.7)';
  panel.style.color = 'white';
  panel.style.borderRadius = '10px';
  panel.style.zIndex = '1000';
  panel.innerHTML = `
    <h2>Exploring ${planet.name}</h2>
    <p>Use your mouse to look around:</p>
    <ul>
      <li>Left click + drag to rotate view</li>
      <li>Scroll to zoom in/out</li>
      <li>Right click + drag to pan</li>
    </ul>
    <button id="returnToSolarSystem">Return to Solar System</button>
  `;

  panel.querySelector('#returnToSolarSystem').addEventListener('click', () => {
    isExploringPlanet = false;
    exploreControls.dispose();
    resetToSolarSystem();
    document.body.removeChild(panel);
  });

  document.body.appendChild(panel);
}


function resetToSolarSystem() {
  // Show the original solar system scene
  scene.visible = true;
  isExploringPlanet = false;

  // Reset camera position
  camera.position.set(-90, 140, 140);
  camera.lookAt(scene.position);

  // Re-enable original orbit controls
  orbit.enabled = true;

  // Resume solar system animation
  renderer.setAnimationLoop(animate);
}
