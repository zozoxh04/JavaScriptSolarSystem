import * as THREE from 'three';
import * as dat from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { atmosphereVertexShader, atmosphereFragmentShader } from './atmosphereShader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader';



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
  rotationSpeed: 0.1,
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


// Event listener for the Start Exploration button
document.getElementById('start-button').addEventListener('click', function () {
  // Hide the starter screen
  document.getElementById('starter-screen').style.display = 'none';

  // Show the hidden elements
  document.getElementById('planet-info').style.display = 'block';
  document.getElementById('gui-container').style.display = 'block';
  document.getElementById('planet-buttons').style.display = 'flex';

  // Add the Reset View button dynamically
  addResetViewButton();
});



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

    // Ignore the asteroid belt objects here
    if (object === asteroidBelt || object === smallerAsteroidBelt) {
      return;  // Don't do anything if it's the asteroid belt
    }

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
  createExplorationPanel(planet, exploreControls, planetScene, composer);
}

// Helper function to create the exploration panel UI
function createExplorationPanel(planet, exploreControls, planetScene, composer) {
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
    <button id="viewSkybox">View Surface Skybox</button>
    <button id="returnToSolarSystem">Return to Solar System</button>
  `;

  panel.querySelector('#viewSkybox').addEventListener('click', () => {
    openSkyboxView(planet, exploreControls, planetScene, composer);
  });

  panel.querySelector('#returnToSolarSystem').addEventListener('click', () => {
    isExploringPlanet = false;
    exploreControls.dispose();
    resetToSolarSystem();
    document.body.removeChild(panel);
  });

  document.body.appendChild(panel);
}

// New function to handle skybox view
function openSkyboxView(planet, prevControls, prevScene, prevComposer) {
  // Dispose of previous controls and scene
  prevControls.dispose();

  // Create new scene for skybox view
  const skyboxScene = new THREE.Scene();

  // Create new camera for skybox view
  const skyboxCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  skyboxCamera.position.set(0, 0, 0);
  console.log('Camera position:', skyboxCamera.position);

  // Create new controls for first-person view
  const skyboxControls = new PointerLockControls(skyboxCamera, renderer.domElement);

  // Create instruction overlay
  const blocker = document.createElement('div');
  blocker.style.position = 'absolute';
  blocker.style.width = '100%';
  blocker.style.height = '100%';
  blocker.style.backgroundColor = 'rgba(0,0,0,0.5)';
  blocker.style.display = 'flex';
  blocker.style.justifyContent = 'center';
  blocker.style.alignItems = 'center';
  blocker.style.zIndex = '999';
  blocker.innerHTML = '<div style="color: white; text-align: center;"><p>Click to look around</p><p>ESC to show/hide mouse</p></div>';
  document.body.appendChild(blocker);

  // Setup click to start
  blocker.addEventListener('click', () => {
    skyboxControls.lock();
  });

  skyboxControls.addEventListener('lock', () => {
    blocker.style.display = 'none';
  });

  skyboxControls.addEventListener('unlock', () => {
    blocker.style.display = 'flex';
  });

  // Create a TextureLoader instance
  const textureLoader = new THREE.TextureLoader();

  // Load skybox textures based on planet
  const skyboxTextures = getSkyboxTextures(planet.name);

  // Create an array to store the materials
  const materials = [];

  // Load each texture and create materials
  for (let i = 0; i < 6; i++) {
    const texture = textureLoader.load(skyboxTextures[i], (texture) => {
      // Log when each texture is loaded
      console.log(`Loaded texture: ${skyboxTextures[i]}`);
      // Trigger a render when texture loads
      skyboxComposer.render();
    }, undefined, (error) => {
      console.error(`Error loading texture: ${skyboxTextures[i]}`, error);
    });
    materials.push(new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide
    }));
  }

  // Create skybox cube with individual materials for each face
  const skyboxGeo = new THREE.BoxGeometry(500, 500, 500);
  const skybox = new THREE.Mesh(skyboxGeo, materials);
  skyboxScene.add(skybox);

  // Create new effect composer for skybox view
  const skyboxComposer = new EffectComposer(renderer);
  const renderPass = new RenderPass(skyboxScene, skyboxCamera);
  skyboxComposer.addPass(renderPass);

  // Optional: Add vignette effect for atmosphere
  try {
    const vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms.darkness.value = 1;
    vignettePass.uniforms.offset.value = 0.8;
    skyboxComposer.addPass(vignettePass);
  } catch (error) {
    console.log('Vignette shader not available, skipping effect');
  }

  // Update UI panel for skybox view
  const skyboxPanel = document.createElement('div');
  skyboxPanel.style.position = 'absolute';
  skyboxPanel.style.left = '20px';
  skyboxPanel.style.top = '20px';
  skyboxPanel.style.padding = '20px';
  skyboxPanel.style.background = 'rgba(0, 0, 0, 0.7)';
  skyboxPanel.style.color = 'white';
  skyboxPanel.style.borderRadius = '10px';
  skyboxPanel.style.zIndex = '1000';
  skyboxPanel.innerHTML = `
    <h2>${planet.name} Surface
  `;
  
  document.body.appendChild(skyboxPanel);
  
  // Animation loop for skybox view
  function animateSkyboxView() {
    requestAnimationFrame(animateSkyboxView);
    
    // Always render, not just when locked
    skyboxComposer.render();
  }
  
  // Start the animation loop
  animateSkyboxView();
  
  // Return cleanup function
  return () => {
    skyboxControls.dispose();
    skyboxScene.remove(skybox);
    skyboxGeo.dispose();
    materials.forEach(material => material.dispose());
    document.body.removeChild(skyboxPanel);
    document.body.removeChild(blocker);
  };
}


// Helper function to get skybox textures for each planet
function getSkyboxTextures(planetName) {
  const baseUrl = '/Users/zahrahashem/Desktop/solar_sys/src/img/Skybox';  
  const skyboxes = {
    'Mercury': [
      'mercury_ft.jpg', 'mercury_bk.jpg',
      'mercury_up.jpg', 'mercury_dn.jpg',
      'mercury_rt.jpg', 'mercury_lt.jpg'
    ],
    'Venus': [
      'venusft.jpg', 'venusbk.jpg',
      'venusup.jpg', 'venusdn.jpg',
      'venusrt.jpg', 'venuslt.jpg'
    ],
    'Earth': [
      'earthft.jpg', 'earthbk.jpg',
      'earthup.jpg', 'earthdn.jpg',
      'earthrt.jpg', 'earthlt.jpg'
    ],
    // Add similar entries for other planets...
  };
  
  return skyboxes[planetName].map(texture => baseUrl + planetName.toLowerCase() + '/' + texture);
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

document.addEventListener('DOMContentLoaded', () => {
  const buttonContainer = document.getElementById('planet-buttons');
  const planets = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const planetColors = {
    sun: '#FFD700',
    mercury: '#A0522D',
    venus: '#DEB887',
    earth: '#4169E1',
    mars: '#CD5C5C',
    jupiter: '#DAA520',
    saturn: '#F4A460',
    uranus: '#87CEEB',
    neptune: '#4682B4',
    pluto: '#808080'
  };

  planets.forEach(planetName => {
    const button = document.createElement('button');
    button.textContent = planetName.charAt(0).toUpperCase() + planetName.slice(1);
    button.className = 'planet-button';
    button.style.backgroundColor = planetColors[planetName];

    // Button click handler
    button.addEventListener('click', function() {
      console.log(`Button clicked: ${planetName}`);

      // Find the planet by name
      const planet = findPlanetInScene(planetName);
      if (planet) {
        console.log(`Planet found: ${planetName}`);
        focusedPlanet = planet;
        orbit.enabled = false; // Disable orbit controls when focusing on a planet

        // Display planet information using your existing function
        if (planetData[planetName] || planetName === 'sun') {
          displayPlanetInfo(planetData[planetName] || {
            name: 'Sun',
            size: '1,391,000 km',
            distance: '0 km (center of the solar system)',
            educationalFact: 'The Sun is a massive ball of plasma at the center of our solar system, providing heat and light to Earth.',
            funFact: 'The Sun accounts for 99.86% of the mass in the solar system!'
          });
        }

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
          openExplorePanel(planet);
          document.getElementById('planet-info').style.display = 'none'; // Hide the info panel
        };
        document.body.appendChild(exploreButton);
      } else {
        console.error(`Planet not found: ${planetName}`);
        focusedPlanet = null;
        orbit.enabled = true;
      }
    });

    buttonContainer.appendChild(button);
  });
  
});

function findPlanetInScene(planetName) {
  function search(obj) {
    if (obj.name && obj.name.toLowerCase() === planetName.toLowerCase()) {
      console.log('Planet found:', obj.name);
      return obj;
    }
    for (let child of obj.children || []) {
      const found = search(child);
      if (found) return found;
    }
    return null;
  }

  const result = search(scene);
  if (!result) {
    console.error('Planet not found in scene:', planetName);
  }
  return result;
}
