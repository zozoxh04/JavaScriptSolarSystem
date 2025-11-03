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
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import lensflare0 from './src/img/lensflare/lensflare0.png';
import lensflare1 from './src/img/lensflare/lensflare1.png';
import lensflare2 from './src/img/lensflare/lensflare2.png';
import lensflare3 from './src/img/lensflare/lensflare3.png';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import React, { useState } from 'react';
import { 
  initTransitions, 
  transitionStartupToMain, 
  transitionMainToExploration, 
  transitionExplorationToSkybox, 
  transitionBack,
  cleanupAllLabels,
  restoreLabelRenderer
} from './transitions.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import starsTexture2 from './src/img/Stars2.jpg';
import starsTexture3 from './src/img/stars3.jpg';
import starsTexture4 from './src/img/starsback.jpg';
import starsTexture from './src/img/stars.jpg';

import sunTexture from './src/img/sun.jpg';
import mercuryTexture from './src/img/mercury.jpg';
import venusTexture from './src/img/venus.jpg';
import venusTexture2 from './src/img/Venus2.jpg';
import venusTexture3 from './src/img/Venus3.jpg';
import venusTexture5 from './src/img/venus5.jpg';

import earthTexture from './src/img/earth.jpg';
import marsTexture from './src/img/mars.jpg';
import marsTexture2 from './src/img/mars2.jpg';

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

let lastDistanceRange = -1;

let focusedPlanet = null;
// Variables to track dragging
let isDragging = false;
let INTERSECTED;
let isExploringPlanet = false;
let isPaused = false;

// Initialize renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  logarithmicDepthBuffer: true // Enable logarithmic depth buffer
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;





document.body.appendChild(renderer.domElement);

document.getElementById('planet-info').style.display = 'none';


// Create scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1390000000);
const canvas = document.querySelector('canvas');

// Array to store the orbit rings
const orbitRings = [];



let simulationDate = new Date(2024, 0, 1);
let lastAngle = 0;

let explorationCleanupFunction = null;


// constants for hover
let permanentLabels = new Map(); // Store permanent labels for each planet
let isPlanetClicked = false;

// Define maximum and minimum zoom limits
const zoomSpeed = 10; 

// Create materials for the highlight effect
const highlightMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  wireframe: true,
  transparent: true,
  opacity: 0.5
});

let currentLabel;
let currentHighlight;

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

// Star settings
const particleCount = 5000; // Number of stars
const particlePositions = new Float32Array(particleCount * 3); // x, y, z for each star
const spreadRange = 40000000000; // Spread stars across a large area
const minDistance = 1000; // Minimum distance from center

// Fill the array with positions distributed logarithmically
for (let i = 0; i < particleCount; i++) {
  // Generate a random direction using spherical coordinates
  const theta = Math.random() * 2 * Math.PI; // Azimuthal angle
  const phi = Math.acos(2 * Math.random() - 1); // Polar angle

  // Logarithmic radius: map a uniform value to a logarithmic scale
  const u = Math.random(); // Uniform [0,1]
  const r = minDistance * Math.pow(spreadRange / minDistance, u); // Log distribution

  // Convert spherical to Cartesian coordinates
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);

  particlePositions[i * 3] = x;
  particlePositions[i * 3 + 1] = y;
  particlePositions[i * 3 + 2] = z;
}

// Set up the particle geometry
const particles = new THREE.BufferGeometry();
particles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

// Use PointsMaterial for a simple, non-flickering star effect
const particleMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 5,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.9
});

// Create the particle system
const particleSystem = new THREE.Points(particles, particleMaterial);

// Add the particle system to the scene
scene.add(particleSystem);

const clickSound = new Audio('/assets/sound/robotclick.wav');
const clickSound2 = new Audio('/assets/sound/scificlick.wav');

const LABEL_FADE_THRESHOLDS = {
  mercury: { fadeStart: 250, fadeEnd: 500 },
  venus: { fadeStart: 270, fadeEnd: 520 },
  earth: { fadeStart: 300, fadeEnd: 550 },
  moon: { fadeStart: 300, fadeEnd: 550 },
  mars: { fadeStart: 320, fadeEnd: 570 },
  jupiter: { fadeStart: 340, fadeEnd: 590 },
  saturn: { fadeStart: 370, fadeEnd: 620 },
  uranus: { fadeStart: 400, fadeEnd: 650 },
  neptune: { fadeStart: 430, fadeEnd: 680 },
  pluto: { fadeStart: 450, fadeEnd: 680 },
  ganymede: { fadeStart: 340, fadeEnd: 590 },
  callisto: { fadeStart: 340, fadeEnd: 590 },
  europa: { fadeStart: 340, fadeEnd: 590 },

};



const PLANET_THRESHOLDS = {
  'Mercury': 500,
  'Venus': 700,
  'Earth': 900,
  'Moon': 900,
  'Mars': 1100,
  'Jupiter': 1300,
  'Saturn': 1500,
  'Uranus': 1700,
  'Neptune': 1900,
  'Pluto': 2100,
  'Sun': 2300,
};

// Set up orbit controls with zoom limits
const orbit = new OrbitControls(camera, renderer.domElement);
camera.position.set(-90, 140, 140);
orbit.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
orbit.dampingFactor = 0.25;
orbit.enableZoom = true; // Allow zooming
orbit.minDistance = 70; // Minimum zoom distance
orbit.maxDistance = 1490000000; // Maximum zoom distance
orbit.enablePan = false;
orbit.update();

// Store references to star objects
const stars = [];
const starConnections = [];
const starData = [
  { name: "PROXIMA CENTAURI", distance: 4.2, x: 8000, y: 500, z: 5000, visibleAtDistance: 5000 },
  { name: "SIRIUS", distance: 8.6, x: -12000, y: -1500, z: -8000, visibleAtDistance: 5000 },
  { name: "EPSILON ERIDANI", distance: 10.5, x: 15000, y: 2000, z: -9000, visibleAtDistance: 10000 },
  { name: "TAU CETI", distance: 11.9, x: -9000, y: 800, z: 14000, visibleAtDistance: 10000 },
  { name: "RIGIL KENTAURUS", distance: 4.4, x: 7500, y: -800, z: 6500, visibleAtDistance: 15000 },
  { name: "PROCYON", distance: 11.5, x: -13500, y: 1200, z: -5000, visibleAtDistance: 15000 },
  { name: "BARNARD'S STAR", distance: 5.9, x: 5000, y: -700, z: 8000, visibleAtDistance: 20000 },
  { name: "WOLF 359", distance: 7.9, x: -7000, y: 1500, z: -9000, visibleAtDistance: 20000 },
  { name: "LALANDE 21185", distance: 8.3, x: 9500, y: -500, z: -10000, visibleAtDistance: 25000 },
  { name: "LUYTEN 726-8", distance: 8.7, x: -10000, y: 400, z: 12000, visibleAtDistance: 25000 }
];



// Add lights
const ambientLight = new THREE.AmbientLight(0xffccaa, 0.8);
scene.add(ambientLight);
const controls = createControlsUI();

// Set up GUI
const gui = new dat.GUI();
const settings = { 
  rotationSpeed: 0.1,
  showOrbits: true,
  showMoons: true,
  showAsteroidBelt: true,
  planetScale: 1,

};

gui.destroy();


let lastTimeLabelsUpdated = 0;
const LABEL_UPDATE_INTERVAL = 100; // ms

// Create a grid helper with initial size and divisions
const initialGridSize = 1000; // Initial size of the grid
const initialDivisions = 10; // Initial number of divisions
const mainGridColor = 0xe1e1e1; // Color for main grid lines
const subGridColor = 0x828282; // Color for sub grid lines

const grid = new THREE.GridHelper(initialGridSize, initialDivisions, mainGridColor, subGridColor);
grid.material.transparent = true;
grid.material.opacity = 0.3;
grid.position.y = -50; // Position slightly below the sun
grid.visible = true; // Make sure grid is visible initially

// Make the grid unclickable
grid.raycast = () => {}; // Override raycast method
scene.add(grid);

// Add scale markers (distance indicators)
const scaleMarkers = new THREE.Group();

// Function to update grid size and divisions based on camera distance
function updateGrid(camera) {
    const distance = camera.position.distanceTo(grid.position); // Distance from camera to grid
    const logDistance = Math.log10(distance); // Logarithmic scale

    // Adjust grid size and divisions based on logarithmic distance
    const newGridSize = Math.pow(10, Math.ceil(logDistance)); // Grid size increases exponentially
    const newDivisions = Math.max(10, Math.pow(10, Math.floor(logDistance))); // Divisions increase logarithmically

    // Update grid size and divisions
    grid.scale.set(newGridSize / initialGridSize, 1, newGridSize / initialGridSize);
    grid.geometry.dispose(); // Dispose old geometry

    // Update scale markers
    scaleMarkers.children.forEach(marker => scaleMarkers.remove(marker)); // Clear existing markers
    for (let i = 0; i <= newGridSize / 2; i += newGridSize / 10) {
        if (i === 0) continue; // Skip the center point

        // Create text sprite for distance marker
        const distance = i.toString();
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 48; // Reduced from 64
        canvas.height = 24; // Reduced from 32

        context.fillStyle = 'rgba(255, 255, 255, 0.5)'; // More transparent text
        context.font = '16px Orbitron'; // Smaller font size
        context.fillText(distance, 4, 16); // Adjusted y-position for smaller canvas

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.4, // More transparent sprites
            depthWrite: false // Prevents z-fighting with other transparent objects
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(15, 7.5, 1); // Smaller scale (was 20, 10, 1)

        // Add markers on X axis
        const markerX = sprite.clone();
        markerX.position.set(i, -45, 0);
        scaleMarkers.add(markerX);

        const markerNegX = sprite.clone();
        markerNegX.position.set(-i, -45, 0);
        scaleMarkers.add(markerNegX);

        // Add markers on Z axis
        const markerZ = sprite.clone();
        markerZ.position.set(0, -45, i);
        scaleMarkers.add(markerZ);

        const markerNegZ = sprite.clone();
        markerNegZ.position.set(0, -45, -i);
        scaleMarkers.add(markerNegZ);
    }
}

// Make scale markers unclickable
scaleMarkers.traverse(object => {
    object.raycast = () => {}; // Empty raycast function makes object unclickable
});

scene.add(scaleMarkers);


// Update the orbit controls to match grid orientation
orbit.maxPolarAngle = Math.PI / 1.6; // Limit vertical rotation to keep grid visible

function toggleOrbits(value) {
  scene.traverse((object) => {
    if (object.isOrbitLine) {
      object.visible = value;
    }
  });
}


// Function to toggle moon visibility
function toggleMoons(value) {
  const moons = [
    { mesh: moon?.mesh, obj: moon?.obj, label: moon?.label },
    { mesh: ganymede?.mesh, obj: ganymede?.obj, label: ganymede?.label },
    { mesh: callisto?.mesh, obj: callisto?.obj, label: callisto?.label },
    { mesh: europa?.mesh, obj: europa?.obj, label: europa?.label }
  ];

  moons.forEach(m => {
    if (m.mesh) m.mesh.visible = value;
    if (m.obj) m.obj.visible = value;
    if (m.label) m.label.visible = value;
  });

  // Traverse all planet children for generically named moons
  [mercury, venus, earth, mars, jupiter, saturn, uranus, neptune, pluto].forEach(planet => {
    planet.obj.traverse((object) => {
      if (object instanceof CSS2DObject && object.name?.toLowerCase().includes('moon')) {
        object.visible = value;
      }
    
      if (object.name && (object.name.toLowerCase().includes('moon') || ['ganymede', 'europa', 'callisto'].includes(object.name.toLowerCase()))) {
        object.visible = value;
        object.children.forEach(child => {
          if (child instanceof CSS2DObject) {
            child.visible = value;
          }
        });
      }
    });
    
  });
}
function forceLabelUpdate() {
  // Update all planet labels in the scene
  if (permanentLabels && permanentLabels.size > 0) {
    permanentLabels.forEach((label, planetId) => {
      scene.traverse((object) => {
        if (object.uuid === planetId) {
          // Make sure label is visible if it should be
          if (object.visible) {
            label.visible = true;
            if (label.element) {
              label.element.style.opacity = '1';
              label.element.style.visibility = 'visible';
            }
          }
        }
      });
    });
  }
  
  // Update the camera to ensure labels are positioned correctly
  if (orbit) {
    orbit.update();
  }
  
  // Force a render to update the label renderer
  if (renderer && camera && scene) {
    renderer.render(scene, camera);
  }
  
  if (labelRenderer && camera && scene) {
    labelRenderer.render(scene, camera);
  }
}


function toggleAsteroid(value) {
  scene.traverse(object => {
    if (object.isAsteroidBelt) {
      object.visible = value;
      object.traverse(child => {
        child.visible = value;
      });
    }
  });
}

// Function to update planet scale
function updatePlanetScale(value) {
  [mercury, venus, earth, mars, jupiter, saturn, uranus, neptune, pluto, moon].forEach(planet => {
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
function displayPlanetInfo(planet) {
  const infoDiv = document.getElementById('planet-info');
  if (!infoDiv) {
    console.error('planet-info element not found');
    return;
  }

  // Update panel content
  infoDiv.style.display = 'block';
  infoDiv.innerHTML = `
    <h2>${planet.name}</h2>
    <p><strong>Size:</strong> ${planet.size}</p>
    <p><strong>Distance from Sun:</strong> ${planet.distance}</p>
    <p id="fact">${planet.educationalFact}</p>
    
    <div class="button-container">
      <button id="eduBtn">Educational Fact</button>
      <button id="funBtn">Fun Fact</button>
      <button id="exitBtn">Close</button>
    </div>
  `;

  // Attach event listeners to buttons
  document.getElementById('eduBtn').addEventListener('click', () => {
    clickSound2.currentTime = 0; // Rewind to start if clicked multiple times fast
    clickSound2.play();          // Play the sound
  
    document.getElementById('fact').innerText = planet.educationalFact;
  });

  document.getElementById('funBtn').addEventListener('click', () => {
    clickSound2.currentTime = 0; // Rewind to start if clicked multiple times fast
    clickSound2.play();          // Play the sound
  
  
    document.getElementById('fact').innerText = planet.funFact;
  });

  document.getElementById('exitBtn').addEventListener('click', () => {
    clickSound2.currentTime = 0; // Rewind to start if clicked multiple times fast
    clickSound2.play();          // Play the sound
  
  
    infoDiv.style.display = 'none';
  });
}


// Function to create the "Explore" button
function createExploreButton(planetName, clickedObject) {
  // Remove any existing explore button
  const existingButton = document.getElementById('explore-button');
  if (existingButton) {
    existingButton.remove();
  }

 // Create the new explore button
const exploreButton = document.createElement('button');
exploreButton.id = 'explore-button'; // Add an ID for easy removal

// Use the same structure as the second button
exploreButton.innerHTML = `
  <span style="vertical-align: middle;">Explore</span>
  <img src="./pic/${planetName}img.png" alt="${planetName}" style="width: 100px; height: 100px; vertical-align: middle;" />
`;

// Position the button (match the second button's position)
exploreButton.style.position = 'absolute';
exploreButton.style.right = '30px'; // Match the second button's left position
exploreButton.style.top = '50px'; // Match the second button's top position

// Apply the same styling as the second button
exploreButton.style.padding = '30px 20px'; // Match the second button's padding
exploreButton.style.fontSize = '18px'; // Match the second button's font size
exploreButton.style.fontFamily = 'Orbitron';
exploreButton.style.color = '#ffffff';
exploreButton.style.border = '2px solid rgba(255, 255, 255, 0.5)';
exploreButton.style.borderRadius = '12px';
exploreButton.style.background = 'linear-gradient(135deg, rgba(10, 10, 36, 0.8), rgba(10, 10, 36, 0.8))';
exploreButton.style.boxShadow = '0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4)';
exploreButton.style.cursor = 'pointer';
exploreButton.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';

// Use flexbox to stack the text and image vertically (match the second button's layout)
exploreButton.style.display = 'flex';
exploreButton.style.flexDirection = 'column'; // Stack children vertically
exploreButton.style.alignItems = 'center'; // Center-align children horizontally
exploreButton.style.gap = '15px'; // Match the second button's gap

// Add hover effect (match the second button's hover effect)
exploreButton.style.transform = 'scale(1)'; // Initial scale
exploreButton.addEventListener('mouseenter', () => {
  exploreButton.style.transform = 'scale(1.05)'; // Scale up on hover
});
exploreButton.addEventListener('mouseleave', () => {
  exploreButton.style.transform = 'scale(1)'; // Reset scale when not hovering
});

exploreButton.onclick = () => {
  // Safely hide the info panel if it exists
  
  const infoDiv = document.getElementById('planet-info');
  if (infoDiv) {
    infoDiv.style.display = 'none';
  }
  
  // Use transition with callback
  transitionMainToExploration(() => {
    console.log('Transition to exploration complete');
    openExplorePanel(clickedObject);
  });

  // Hide all labels
  settings.showLabels = false;
  permanentLabels.forEach((label) => {
    label.visible = false;
    if (label.element) {
      label.element.style.opacity = '0';
    }
  });

  // Hide all stars and their connections
  stars.forEach(star => {
    star.mesh.visible = false;
    star.connection.visible = false;
    star.connection.userData.animating = false;
  });

  // Remove the button after clicking
  exploreButton.remove();
};

// Append to the body
document.body.appendChild(exploreButton);

}

// Handle click events
window.addEventListener('dblclick', function (event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    clickSound.currentTime = 0; // Rewind to start if clicked multiple times fast
    clickSound.play();          // Play the sound
  
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
      }

      // Create the explore button
      createExploreButton(planetName, clickedObject);

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
    }
  } else {
    // Remove the explore button if no planet is clicked
    removeExploreButton();
    focusedPlanet = null;
    orbit.enabled = true;
  }
});

// Function to remove the explore button
function removeExploreButton() {
  const existingButton = document.getElementById('explore-button');
  if (existingButton) {
    existingButton.remove();
  }
}

// Create planets function
const textureLoader = new THREE.TextureLoader();
function createEnhancedPlanet(name, size, texture, position, ring, atmosphereProps, inclination = 0) {
  // Higher detail geometry for planets
  const geo = new THREE.SphereGeometry(size, 64, 64);
  
  // Enhanced material with better visual properties
  const mat = new THREE.MeshStandardMaterial({ 
    map: textureLoader.load(texture),
    roughness: 0.7,          // Less shiny surface
    metalness: 0.1,          // Slight metallic feel for light interaction
    envMapIntensity: 0.5,    // Subtle environment reflections
    normalScale: new THREE.Vector2(1, 1),
    logarithmicDepthBuffer: true
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.isPlanet = true;
  mesh.name = name;
  mesh.castShadow = true;     // Enable shadows
  mesh.receiveShadow = true;  // Allow planet to receive shadows
  
  const obj = new THREE.Object3D();
  obj.add(mesh);

  // Apply inclination using quaternions (for proper orbital tilt)
  const quaternion = new THREE.Quaternion();
  quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(inclination));
  obj.applyQuaternion(quaternion);

  // Create atmosphere with enhanced properties
  if (atmosphereProps) {
    const atmosphereSize = size * 1.1;
    const atmosphereGeo = new THREE.SphereGeometry(atmosphereSize, 50, 50);
    
    // Enhanced atmosphere shader uniforms
    const atmosphereUniforms = {
      sunPosition: { value: new THREE.Vector3(0, 1, -1).normalize() },
      rayleigh: { value: atmosphereProps.rayleigh || 1.0 },
      turbidity: { value: atmosphereProps.turbidity || 10.0 },
      mieCoefficient: { value: atmosphereProps.mieCoefficient || 0.005 },
      mieDirectionalG: { value: atmosphereProps.mieDirectionalG || 0.8 },
      up: { value: new THREE.Vector3(0, 1, 0) },
      planetColor: { value: new THREE.Color(atmosphereProps.color) },
      atmosphereDensity: { value: atmosphereProps.density },
      time: { value: 0.0 }
    };
    
    const atmosphereMat = new THREE.ShaderMaterial({
      uniforms: atmosphereUniforms,
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    atmosphereMesh.renderOrder = 1; // Ensure atmosphere renders at correct depth
    obj.add(atmosphereMesh);
    
    // Store atmosphere properties for animation
    obj.atmosphere = {
      mesh: atmosphereMesh,
      uniforms: atmosphereUniforms
    };
  }

  // Create enhanced ring if specified
  if (ring) {
    const ringGeo = new THREE.RingGeometry(ring.innerRadius, ring.outerRadius, 90); // More segments for detail
    
    // Improve UV mapping for better texture application
    const pos = ringGeo.attributes.position;
    const v3 = new THREE.Vector3();
    const uv = [];
    
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      const radius = v3.length();
      const normalizedRadius = (radius - ring.innerRadius) / (ring.outerRadius - ring.innerRadius);
      uv.push(normalizedRadius, 0);
    }
    
    ringGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    
    const ringMat = new THREE.MeshStandardMaterial({
      map: textureLoader.load(ring.texture),
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.6,
      metalness: 0.2,
      opacity: 0.95,
      depthWrite: false,
      logarithmicDepthBuffer: true
    });
    
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    obj.add(ringMesh);
    ringMesh.position.x = position;
    ringMesh.rotation.x = -0.5 * Math.PI;
    
    // Slight random rotation for visual interest
    ringMesh.rotation.z = Math.random() * Math.PI * 2;
    
    // Store ring for animation
    obj.ring = {
      mesh: ringMesh
    };
  }

  // Enhanced rim light effect - more sophisticated edge glow
  const rimGeo = new THREE.SphereGeometry(size * 1.03, 30, 30);
  const rimMat = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: getPlanetRimColor(name) },
      viewVector: { value: new THREE.Vector3(0, 0, 1) },
      coefficient: { value: 1.0 },
      power: { value: 2.0 },
      time: { value: 0.0 }
    },
    vertexShader: `
      uniform vec3 viewVector;
      uniform float coefficient;
      uniform float power;
      uniform float time;
      varying float intensity;
      void main() {
        vec3 vNormal = normalize(normalMatrix * normal);
        vec3 vNormView = normalize(viewVector);
        intensity = pow(coefficient - dot(vNormal, vNormView), power);
        
        // Subtle waviness based on time
        float wave = sin(position.y * 10.0 + time) * 0.01;
        vec3 newPosition = position + normal * wave;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying float intensity;
      void main() {
        vec3 glow = glowColor * intensity;
        gl_FragColor = vec4(glow, intensity);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });
  
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  mesh.add(rimMesh);
  
  // Store rim for animation
  obj.rim = {
    mesh: rimMesh,
    uniforms: rimMat.uniforms
  };
  
  scene.add(obj);
  mesh.position.x = position;
  
  return { mesh, obj };
}


// Create planets with inclinations
const mercury = createEnhancedPlanet('Mercury', 3.2, mercuryTexture, 44, null, getPlanetAtmosphereProperties('Mercury'), 7.0);
const venus = createEnhancedPlanet('Venus', 5.8, venusTexture5, 62, null, getPlanetAtmosphereProperties('Venus'), 3.4);
const earth = createEnhancedPlanet('Earth', 6, earthTexture, 78, null, getPlanetAtmosphereProperties('Earth'), 0.0);

// Create Moon
const moon = createEnhancedPlanet('Moon', 1.6, moonTexture, 10, null, { color: 0x808080, density: 0.1 });
moon.obj.position.set(78, 0, 0); // Position at Earth's location
earth.obj.add(moon.obj); // Make Moon a child of Earth

const mars = createEnhancedPlanet('Mars', 4, marsTexture2, 96, null, getPlanetAtmosphereProperties('Mars'), 1.9);
const jupiter = createEnhancedPlanet('Jupiter', 12, jupiterTexture, 176, null, getPlanetAtmosphereProperties('Jupiter'), 1.3);

// Jupiter's Moons (Galilean)
const ganymede = createEnhancedPlanet('Ganymede', 1.6, ganymedeTexture, 20, null, { color: 0x808080, density: 0.1 });
ganymede.obj.position.set(176, 0, 0);
jupiter.obj.add(ganymede.obj);

const callisto = createEnhancedPlanet('Callisto', 1.6, callistoTexture, 20, null, { color: 0x808080, density: 0.1 });
callisto.obj.position.set(176, 0, 0);
jupiter.obj.add(callisto.obj);

const europa = createEnhancedPlanet('Europa', 1.6, europaTexture, 20, null, { color: 0x808080, density: 0.1 });
europa.obj.position.set(176, 0, 0);
jupiter.obj.add(europa.obj);

// Outer Planets
const saturn = createEnhancedPlanet('Saturn', 10, saturnTexture, 275, {
  innerRadius: 10,
  outerRadius: 20,
  texture: saturnRingTexture
}, getPlanetAtmosphereProperties('Saturn'), 2.5);

const uranus = createEnhancedPlanet('Uranus', 7, uranusTexture, 400, {
  innerRadius: 7,
  outerRadius: 12,
  texture: uranusRingTexture
}, getPlanetAtmosphereProperties('Uranus'), 0.8);

const neptune = createEnhancedPlanet('Neptune', 7, neptuneTexture, 500, null, getPlanetAtmosphereProperties('Neptune'), 1.8);

const pluto = createEnhancedPlanet('Pluto', 2.8, plutoTexture, 600, null, getPlanetAtmosphereProperties('Pluto'), 17.2);

const asteroidBelt = createAsteroidBelt(scene, 800, 1000, 1500, asteroidTexture);
const smallerAsteroidBelt = createAsteroidBelt(scene, 120, 160, 200, asteroidTexture);

setupPermanentLabels();

// Create the sun with logarithmic depth buffer
const sunGeo = new THREE.SphereGeometry(20, 30, 30);
const sunMat = new THREE.MeshBasicMaterial({
  map: textureLoader.load(sunTexture),
  emissive: new THREE.Color(0xfdfbd3),
  emissiveIntensity: 2.0,
  transparent: true,
  depthWrite: false,
  logarithmicDepthBuffer: true
});

const sun = createEnhancedSun();
sun.name = 'Sun';
sun.raycast = () => {}; // Override raycast method

scene.add(sun);

// Enable Bloom Effect for selective objects
const bloomLayer = new THREE.Layers();
bloomLayer.set(1); // Assign layer 1 for bloom objects

// Modify the Sun to belong to the bloom layer
sun.layers.enable(1);

// Bloom Post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5, // Strength of bloom
  0.4, // Radius
  0.85 // Threshold
);
bloomPass.threshold = 0.2;  // Controls how much bloom starts
bloomPass.strength = 2.5;   // Controls intensity of the glow
bloomPass.radius = 0.6;     // Controls spread of the glow
composer.addPass(bloomPass);

// Ensure only the sun is affected by bloom
bloomPass.renderToScreen = true;

const pointLight = new THREE.PointLight(0xFFFFC5, 3.5, 2000);
scene.add(pointLight);
// First, position the pointLight at the sun's position
pointLight.position.copy(sun.position);

// Increase the intensity of the pointLight for a stronger effect
pointLight.intensity = 5.0;

// Create the lensflare with more pronounced elements
const lensflare = new Lensflare();
lensflare.addElement(new LensflareElement(textureLoader.load(lensflare0), 350, 0), 0);
lensflare.addElement(new LensflareElement(textureLoader.load(lensflare3), 60, 0.6), 0.1);
lensflare.addElement(new LensflareElement(textureLoader.load(lensflare3), 70, 0.7), 0.3);
lensflare.addElement(new LensflareElement(textureLoader.load(lensflare1), 120, 0.9), 0.6);
lensflare.addElement(new LensflareElement(textureLoader.load(lensflare2), 70, 1), 0.8);
lensflare.addElement(new LensflareElement(textureLoader.load(lensflare3), 110, 0.4), 1.0);

// Add the lensflare to the pointLight
pointLight.add(lensflare);

function createOrbitRing(radius, inclination = 0, color = 0xADD8E6) {
  
  const segments = 128;
  const points = [];

  // Generate points for the orbit ring in the X-Z plane
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    points.push(x, 0, z);
  }

  // Create the geometry for the fat line
  const geometry = new LineGeometry();
  geometry.setPositions(points);

  // Create the material for the fat line
  const material = new LineMaterial({
    color: color, // Use the color parameter here
    linewidth: 0.0025,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    logarithmicDepthBuffer: true
  });

  // Create the fat line
  const line = new Line2(geometry, material);
  line.computeLineDistances();
  line.isOrbitLine = true;

  // Apply inclination using quaternions
  const quaternion = new THREE.Quaternion();
  quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(inclination));
  line.applyQuaternion(quaternion);

  // Add the line to the scene
  scene.add(line);

  // Store the line and its radius for later reference
  orbitRings.push({ line, radius, material });

  return line;
}



function createAsteroidBelt(scene, innerRadius, outerRadius, asteroidCount = 1000, texture) {
  const asteroidGeometry = new THREE.SphereGeometry(1.5, 4, 4);
  const asteroidMaterial = new THREE.MeshStandardMaterial({
    map: textureLoader.load(texture),
    roughness: 0.8,
    metalness: 0.2,
    transparent: true,            // ✨ Allow transparency
    opacity: 0.9,                 // ✨ Slight transparency (you can adjust this)
    depthWrite: false,            // ✨ Do NOT write to depth buffer
    logarithmicDepthBuffer: true
  });
  
  const asteroidBelt = new THREE.Group();
  asteroidBelt.isAsteroidBelt = true;

  for (let i = 0; i < asteroidCount; i++) {
    const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);

    // Set raycasting to false for these asteroids (ignore clicks)
    asteroid.raycast = function() {}; // Disable raycasting

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


createOrbitRing(44, 7.0);  // Mercury  
createOrbitRing(62, 3.4);  // Venus  
createOrbitRing(78, 0.0);  // Earth  
createOrbitRing(96, 1.9);  // Mars  
createOrbitRing(176, 1.3); // Jupiter  
createOrbitRing(275, 2.5); // Saturn  
createOrbitRing(400, 0.8); // Uranus  
createOrbitRing(500, 1.8); // Neptune  
createOrbitRing(600, 17.2, 0xFFA500); // Pluto with Orange Orbit (0xFFA500 = Orange)


function focusOnPlanet(planet, offset = new THREE.Vector3(30, 15, 30), lerpFactor = 0.05) {
  if (!planet) return;

  const cameraTarget = new THREE.Vector3();
  planet.getWorldPosition(cameraTarget);
  const desiredPosition = cameraTarget.clone().add(offset);

  camera.position.lerp(desiredPosition, lerpFactor);
  camera.lookAt(cameraTarget);

  // Hide all labels
  permanentLabels.forEach(label => {
    label.visible = false;
  });
}

function createPermanentLabel(text) {
  const div = document.createElement('div');
  div.className = 'label';
  div.textContent = text.toUpperCase();
  div.style.color = '#ADD8E6'; // Light blue text
  div.style.fontFamily = 'Orbitron, Calibri, sans-serif';
  div.style.fontWeight = 'bold';
  div.style.fontSize = '14px';
  div.style.whiteSpace = 'nowrap';
  div.style.userSelect = 'none';
  div.style.pointerEvents = 'none'; // Prevents interfering with raycasting
  div.style.background = 'transparent'; // ✅ No background
  div.style.border = 'none'; // No border
  div.style.padding = '0';   // No padding
  div.style.margin = '0';    // No margin
  div.style.textShadow = '0 0 4px rgba(0, 0, 0, 0.5)'; // Optional: soft glow
  div.style.transition = 'opacity 0.2s ease-in-out';

  const label = new CSS2DObject(div);
  return label;
  
}


const labels = [];


function createHighlightSphere(planet) {
  // Get the planet's radius
  const radius = planet.geometry.parameters.radius;
  
  // Create a group to hold all highlight elements
  const highlightGroup = new THREE.Group();
  
  // Create a glowing ring around the planet
  const ringGeometry = new THREE.RingGeometry(
      radius * 1.1,  // Inner radius - slightly larger than planet
      radius * 1.2,  // Outer radius - creates a thin ring
      64            // More segments for smoother circle
  );
  
  // Create a custom shader material for the glow effect
  const ringMaterial = new THREE.ShaderMaterial({
      uniforms: {
          color: { value: new THREE.Color(0xffffff) },
          pulse: { value: 0.0 },
          alpha: { value: 0.7 }
      },
      vertexShader: `
          varying vec2 vUv;
          void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
      `,
      fragmentShader: `
          uniform vec3 color;
          uniform float pulse;
          uniform float alpha;
          varying vec2 vUv;
          
          void main() {
              // Calculate distance from center of the ring
              float dist = length(vUv - vec2(0.5));
              
              // Create a gradient that fades from the center of the ring
              float intensity = smoothstep(0.4, 0.5, dist) * smoothstep(0.6, 0.5, dist);
              
              // Apply pulsing effect
              intensity *= (1.0 + 0.2 * pulse);
              
              gl_FragColor = vec4(color, intensity * alpha);
          }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false // Prevent z-fighting issues
  });
  
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  
  // Create a second, outer glow ring for additional effect
  const outerRingGeometry = new THREE.RingGeometry(
      radius * 1.2,
      radius * 1.4,
      64
  );
  
  const outerRingMaterial = new THREE.ShaderMaterial({
      uniforms: {
          color: { value: new THREE.Color(0x00d8e6) }, // Light blue glow
          pulse: { value: 0.0 },
          alpha: { value: 0.3 }
      },
      vertexShader: ringMaterial.vertexShader,
      fragmentShader: ringMaterial.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending // Add light for more glow
  });
  
  const outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial);
  
  // Add rings to the group
  highlightGroup.add(ring);
  highlightGroup.add(outerRing);
  
  // Store materials for animation
  highlightGroup.userData = {
      ringMaterial,
      outerRingMaterial,
      startTime: Date.now(),
      planetRadius: radius // Store radius for potential updates
  };
  
  // Start invisible
  highlightGroup.visible = false;
  
  return highlightGroup;
}


function setupPermanentLabels() {
  scene.traverse((object) => {
    if (object.isPlanet || object.isSun) {
      const label = createPermanentLabel(object.name);
      permanentLabels.set(object.uuid, label);

      // Add directly to the object so it follows it
      object.add(label);

      // Offset BELOW the planet
      label.position.set(0, -object.geometry.parameters.radius * 1.5, 0);

      if (object.isSun) {
        label.visible = false;
      }
    }
  });
}



// Load texture
const myTexture = textureLoader.load('./src/img/milkyway2.jpg');

// Create a plane geometry and material with the texture
const geometry = new THREE.PlaneGeometry(900000000, 900000000);
const material = new THREE.MeshBasicMaterial({ map: myTexture, transparent: true, opacity: 0.001 });
const plane = new THREE.Mesh(geometry, material);

scene.add(plane);

// Update the plane's position to raise it higher
plane.position.set(174000000, 500, 0); // Adjust the y-value to raise the plane

// Rotate the plane 60º around the x-axis
plane.rotation.x = THREE.MathUtils.degToRad(-30); // Convert degrees to radians

// Make the plane unclickable
plane.raycast = () => {};

// Load texture for the back view
const myTextureBack = textureLoader.load('./src/img/milkyway3.jpg');

// Create a plane geometry and material with the back texture
const geometryBack = new THREE.PlaneGeometry(900000000, 900000000);
const materialBack = new THREE.MeshBasicMaterial({ map: myTextureBack, transparent: true, opacity: 0.001 }); // Set opacity to 1
const planeBack = new THREE.Mesh(geometryBack, materialBack);

scene.add(planeBack);

// Update the back plane's position to be the same as the front
planeBack.position.set(174000000, 500, 10); // Slightly adjust the position to avoid z-fighting

planeBack.rotation.x = THREE.MathUtils.degToRad(-30); // Convert degrees to radians
planeBack.rotation.y = THREE.MathUtils.degToRad(180); // Convert degrees to radians

// Make the back plane unclickable
planeBack.raycast = () => {};


const PLANET_DIAMETERS = {
  'Sun': 1391000,
  'Mercury': 4879,
  'Venus': 12104,
  'Earth': 12742,
  'Mars': 6779,
  'Jupiter': 139820,
  'Saturn': 116460,
  'Uranus': 50724,
  'Neptune': 49244,
  'Pluto': 2377,
  'Moon': 3475
};

// Function to create the scale comparison button
function addScaleComparisonButton() {
  // Create the scale comparison button
  const scaleButton = document.createElement('img');
  scaleButton.id = 'scale-comparison-button';  
  scaleButton.src = './src/img/scale.png'; // Create a new icon for this
  scaleButton.alt = 'Size Comparison';
  scaleButton.style.position = 'fixed';
  scaleButton.style.bottom = '52.5%';
  scaleButton.style.left = '20px'; // Position it near other controls
  scaleButton.style.width = '70px';
  scaleButton.style.height = '70px';
  scaleButton.style.cursor = 'pointer';
  scaleButton.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
  scaleButton.style.boxShadow = '0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4)';
  scaleButton.style.borderRadius = '50%';
  scaleButton.style.zIndex = '1000';

  // Add hover effects
  scaleButton.addEventListener('mouseover', () => {
    scaleButton.style.transform = 'scale(1.1)';
    scaleButton.style.boxShadow = '0 0 30px rgba(0, 216, 230, 1), 0 0 20px rgba(0, 216, 230, 0.8)';
  });
  
  scaleButton.addEventListener('mouseout', () => {
    scaleButton.style.transform = 'scale(1)';
    scaleButton.style.boxShadow = '0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4)';
  });

  // Toggle scale comparison view on click
  scaleButton.addEventListener('click', () => {
    // Play sound effect
    clickSound.currentTime = 0;
    clickSound.play();
    
    // Toggle the comparison view
    toggleScaleComparisonView();
  });

  document.body.appendChild(scaleButton);
  return scaleButton;
}

// Create the comparison panel with all HTML elements inside
function createScaleComparisonPanel() {
  const panel = document.createElement('div');
  panel.id = 'scale-comparison-panel';
  panel.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90vw;
    max-width: 1200px;
    height: 75vh;
    background: radial-gradient(circle at center, rgba(20, 20, 30, 0.95), rgba(5, 5, 15, 0.95));
    border: 2px solid rgba(0, 216, 230, 0.4);
    box-shadow: 0 0 30px rgba(0, 216, 230, 0.4);
    border-radius: 16px;
    padding: 20px;
    z-index: 2000;
    overflow: hidden;
    display: none;
    backdrop-filter: blur(10px);
  `;

  // Add panel header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    border-bottom: 1px solid rgba(0, 216, 230, 0.3);
    padding-bottom: 10px;
  `;
  
  const title = document.createElement('h2');
  title.textContent = 'True Scale Planet Comparison';
  title.style.cssText = `
    color: #00d8e6;
    font-family: 'Orbitron', sans-serif;
    margin: 0;
    font-size: 24px;
  `;
  
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.cssText = `
    background: none;
    border: none;
    color: #00d8e6;
    font-size: 28px;
    cursor: pointer;
    transition: transform 0.2s ease;
  `;
  closeButton.addEventListener('mouseover', () => {
    closeButton.style.transform = 'scale(1.2)';
  });
  closeButton.addEventListener('mouseout', () => {
    closeButton.style.transform = 'scale(1)';
  });
  closeButton.addEventListener('click', () => {
    hideScaleComparisonView();
  });
  
  header.appendChild(title);
  header.appendChild(closeButton);
  panel.appendChild(header);

  // Add content container
  const content = document.createElement('div');
  content.style.cssText = `
    height: calc(100% - 70px);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  `;
  panel.appendChild(content);

  // Create canvas for rendering planets
  const canvasContainer = document.createElement('div');
  canvasContainer.style.cssText = `
    flex-grow: 1;
    position: relative;
    overflow: hidden;
    border-radius: 8px;
    margin-bottom: 20px;
    background: rgba(0, 0, 0, 0.3);
  `;
  
  const canvas = document.createElement('canvas');
  canvas.id = 'scale-comparison-canvas';
  canvas.style.cssText = `
    width: 100%;
    height: 100%;
    background: transparent;
  `;
  canvasContainer.appendChild(canvas);
  content.appendChild(canvasContainer);

  // Add scale information
  const infoContainer = document.createElement('div');
  infoContainer.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    color: #e0f7fa;
    font-family: 'Orbitron', sans-serif;
  `;
  
  const scaleInfo = document.createElement('div');
  scaleInfo.id = 'scale-info';
  scaleInfo.textContent = 'Scale: 1 pixel = 1000 km';
  scaleInfo.style.cssText = `
    font-size: 14px;
  `;
  
  const scaleControls = document.createElement('div');
  scaleControls.style.cssText = `
    display: flex;
    gap: 15px;
    align-items: center;
  `;
  
  const zoomOutButton = document.createElement('button');
  zoomOutButton.id = 'scale-zoom-out';
  zoomOutButton.textContent = '−';
  zoomOutButton.style.cssText = `
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid #00d8e6;
    background: rgba(0, 216, 230, 0.1);
    color: #00d8e6;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  `;
  
  const zoomInButton = document.createElement('button');
  zoomInButton.id = 'scale-zoom-in';
  zoomInButton.textContent = '+';
  zoomInButton.style.cssText = zoomOutButton.style.cssText;
  
  // Add hover effects to zoom buttons
  [zoomOutButton, zoomInButton].forEach(button => {
    button.addEventListener('mouseover', () => {
      button.style.background = 'rgba(0, 216, 230, 0.3)';
    });
    button.addEventListener('mouseout', () => {
      button.style.background = 'rgba(0, 216, 230, 0.1)';
    });
  });
  
  // Toggle between include/exclude sun
  const sunToggle = document.createElement('div');
  sunToggle.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  
  const sunToggleLabel = document.createElement('label');
  sunToggleLabel.textContent = 'Include Sun:';
  sunToggleLabel.style.cssText = `
    font-size: 14px;
  `;
  
  const sunToggleSwitch = document.createElement('label');
  sunToggleSwitch.style.cssText = `
    position: relative;
    display: inline-block;
    width: 36px;
    height: 18px;
  `;
  
  const sunToggleInput = document.createElement('input');
  sunToggleInput.id = 'sun-toggle';
  sunToggleInput.type = 'checkbox';
  sunToggleInput.checked = false; // Sun excluded by default
  sunToggleInput.style.cssText = `
    opacity: 0;
    width: 0;
    height: 0;
  `;
  
  const sunToggleSlider = document.createElement('span');
  sunToggleSlider.style.cssText = `
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #333;
    transition: 0.4s;
    border-radius: 34px;
    box-shadow: inset 0 0 5px rgba(0, 216, 230, 0.6);
  `;
  
  const sunToggleButton = document.createElement('span');
  sunToggleButton.style.cssText = `
    position: absolute;
    height: 14px;
    width: 14px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
    box-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
  `;
  
  sunToggleSlider.appendChild(sunToggleButton);
  sunToggleSwitch.appendChild(sunToggleInput);
  sunToggleSwitch.appendChild(sunToggleSlider);
  
  sunToggle.appendChild(sunToggleLabel);
  sunToggle.appendChild(sunToggleSwitch);
  
  // Event listeners for toggle switch
  sunToggleInput.addEventListener('change', () => {
    if (sunToggleInput.checked) {
      sunToggleSlider.style.backgroundColor = '#3366cc';
      sunToggleButton.style.left = '22px';
    } else {
      sunToggleSlider.style.backgroundColor = '#555';
      sunToggleButton.style.left = '2px';
    }
    
    // Redraw the comparison view with current offsets and zoom
    drawScaleComparison(
      comparisonControls.viewOffset || { x: 0, y: 0 },
      comparisonControls.zoomLevel || 1
    );
  });
  
  // Add controls to the container
  scaleControls.appendChild(zoomOutButton);
  scaleControls.appendChild(zoomInButton);
  scaleControls.appendChild(sunToggle);
  
  infoContainer.appendChild(scaleInfo);
  infoContainer.appendChild(scaleControls);
  content.appendChild(infoContainer);

  // Add reset view button
  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset View';
  resetButton.style.cssText = `
    background: rgba(0, 216, 230, 0.2);
    border: 1px solid #00d8e6;
    color: #00d8e6;
    padding: 8px 15px;
    border-radius: 4px;
    cursor: pointer;
    font-family: 'Orbitron', sans-serif;
    margin-right: 20px;
    transition: all 0.2s ease;
  `;
  resetButton.addEventListener('mouseover', () => {
    resetButton.style.background = 'rgba(0, 216, 230, 0.3)';
  });
  resetButton.addEventListener('mouseout', () => {
    resetButton.style.background = 'rgba(0, 216, 230, 0.2)';
  });
  resetButton.addEventListener('click', () => {
    clickSound2.currentTime = 0;
    clickSound2.play();
    
    // Reset the stored offsets and zoom level
    comparisonControls.viewOffset = { x: 0, y: 0 };
    comparisonControls.zoomLevel = 1;
    
    // Reset to default view
    drawScaleComparison({ x: 0, y: 0 }, 1);
  });
  infoContainer.insertBefore(resetButton, scaleControls);
  
  // Add extra info or educational note
  const infoNote = document.createElement('p');
  infoNote.style.cssText = `
    font-size: 12px;
    color: #aacfd0;
    margin-top: 15px;
    text-align: center;
    font-family: 'Orbitron', sans-serif;
  `;
  infoNote.innerHTML = 'Note: If a planet is too small to be visible at this scale, it is represented by a glowing dot. <br>Planets are shown in true relative size.';
  content.appendChild(infoNote);

  // Return the panel and its controls
  return {
    panel,
    canvas,
    zoomInButton,
    zoomOutButton,
    sunToggleInput,
    scaleInfo,
    canvasContainer
  };
}



// Global variables for the comparison view
let comparisonPanel = null;
let comparisonControls = null;
let currentScale = 0.1; // Initial scale (pixels per km)
const MIN_SCALE = 0.00001;
const MAX_SCALE = 10;
const SCALE_FACTOR = 1.5; // How much to zoom in/out per click

// Cache for loaded planet textures
const planetTextureCache = {};

// Function to toggle the scale comparison view
function toggleScaleComparisonView() {
  if (!comparisonPanel) {
    // Create the panel if it doesn't exist
    const panelElements = createScaleComparisonPanel();
    comparisonPanel = panelElements.panel;
    comparisonControls = {
      canvas: panelElements.canvas,
      zoomInButton: panelElements.zoomInButton,
      zoomOutButton: panelElements.zoomOutButton,
      sunToggleInput: panelElements.sunToggleInput,
      scaleInfo: panelElements.scaleInfo,
      canvasContainer: panelElements.canvasContainer
    };
    document.body.appendChild(comparisonPanel);
    
    // Add event listeners
    comparisonControls.zoomInButton.addEventListener('click', () => {
      clickSound2.currentTime = 0;
      clickSound2.play();
      currentScale = Math.min(currentScale * SCALE_FACTOR, MAX_SCALE);
      // Pass the current offset and zoom to maintain position
      drawScaleComparison(comparisonControls.viewOffset || { x: 0, y: 0 }, 
                           comparisonControls.zoomLevel || 1);
    });
    
    comparisonControls.zoomOutButton.addEventListener('click', () => {
      clickSound2.currentTime = 0;
      clickSound2.play();
      currentScale = Math.max(currentScale / SCALE_FACTOR, MIN_SCALE);
      // Pass the current offset and zoom to maintain position
      drawScaleComparison(comparisonControls.viewOffset || { x: 0, y: 0 }, 
                           comparisonControls.zoomLevel || 1);
    });

    // Add the new canvas zoom and pan functionality
    setupCanvasInteractions(comparisonControls.canvasContainer);
    
    // Preload planet textures
    preloadPlanetTextures();
  }
  
  // Show the panel
  comparisonPanel.style.display = 'block';
  
  // Draw the comparison
  drawScaleComparison();
}


// New function to setup canvas pan and zoom interactions
function setupCanvasInteractions(canvasContainer) {
  const canvas = comparisonControls.canvas;
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  
  // Store these in the comparisonControls object so they can be accessed elsewhere
  comparisonControls.viewOffset = { x: 0, y: 0 };
  comparisonControls.zoomLevel = 1;
  
  // Create local references for easier access
  let viewOffset = comparisonControls.viewOffset;
  let zoomLevel = comparisonControls.zoomLevel;
  
  // Boundary settings
  const maxPanDistance = 1500; // Maximum distance from center (reduced to keep planets visible)
  
  // Add event listeners for panning
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.style.cursor = 'grabbing';
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    // Calculate how much mouse has moved
    const deltaX = e.clientX - lastX;
    const deltaY = e.clientY - lastY;
    
    // Update last position
    lastX = e.clientX;
    lastY = e.clientY;
    
    // Calculate potential new offsets
    const newOffsetX = viewOffset.x + deltaX / zoomLevel;
    const newOffsetY = viewOffset.y + deltaY / zoomLevel;
    
    // Apply boundaries to prevent panning too far
    // Calculate maximum allowed offset based on zoom level and max distance
    const maxOffset = maxPanDistance / zoomLevel;
    
    // Apply boundaries with easing as you approach the edge
    viewOffset.x = Math.max(Math.min(newOffsetX, maxOffset), -maxOffset);
    viewOffset.y = Math.max(Math.min(newOffsetY, maxOffset), -maxOffset);
    
    // Update the shared reference
    comparisonControls.viewOffset = viewOffset;
    
    // Redraw
    drawScaleComparison(viewOffset, zoomLevel);
  });
  
  // Add event listeners for zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    // Calculate the point under the mouse before zoom
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate scaling factor (reduced for smoother zooming)
    const scaleFactor = e.deltaY > 0 ? 0.92 : 1.08;
    
    // Update zoom level with tighter limits
    const newZoomLevel = Math.max(0.5, Math.min(8, zoomLevel * scaleFactor));
    
    // Only proceed if zoom level actually changed
    if (newZoomLevel !== zoomLevel) {
      // Calculate the offset change needed to zoom toward/away from mouse point
      const mouseXCanvas = (mouseX / zoomLevel) - viewOffset.x;
      const mouseYCanvas = (mouseY / zoomLevel) - viewOffset.y;
      
      // Calculate new offsets to keep mouse position steady
      viewOffset.x = (mouseX / newZoomLevel) - mouseXCanvas;
      viewOffset.y = (mouseY / newZoomLevel) - mouseYCanvas;
      
      // Apply boundaries after zoom
      const maxOffset = maxPanDistance / newZoomLevel;
      viewOffset.x = Math.max(Math.min(viewOffset.x, maxOffset), -maxOffset);
      viewOffset.y = Math.max(Math.min(viewOffset.y, maxOffset), -maxOffset);
      
      // Update the shared reference
      comparisonControls.viewOffset = viewOffset;
      
      // Set new zoom level
      zoomLevel = newZoomLevel;
      comparisonControls.zoomLevel = newZoomLevel;
      
      // Redraw
      drawScaleComparison(viewOffset, zoomLevel);
    }
  });
  
  // Set initial style
  canvas.style.cursor = 'grab';
}


// Function to hide the scale comparison view
function hideScaleComparisonView() {
  if (comparisonPanel) {
    comparisonPanel.style.display = 'none';
  }
}

// Function to preload planet textures
function preloadPlanetTextures() {
  const textureFiles = {
    'Sun': sunTexture,
    'Mercury': mercuryTexture,
    'Venus': venusTexture5,
    'Earth': earthTexture,
    'Mars': marsTexture2,
    'Jupiter': jupiterTexture,
    'Saturn': saturnTexture,
    'Uranus': uranusTexture,
    'Neptune': neptuneTexture,
    'Pluto': plutoTexture,
    'Moon': moonTexture
  };
  
  // Create hidden canvas to load and cache the textures
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 256;
  tempCanvas.height = 256;
  const ctx = tempCanvas.getContext('2d');
  
  // Load each texture into the cache
  Object.entries(textureFiles).forEach(([planet, textureUrl]) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      // Draw the image to the canvas
      ctx.clearRect(0, 0, 256, 256);
      ctx.drawImage(img, 0, 0, 256, 256);
      
      // Create a new texture from the canvas
      planetTextureCache[planet] = tempCanvas.toDataURL();
    };
    img.src = textureUrl;
  });
}

// Function to draw the planets at their true relative scale
function drawScaleComparison(offset = { x: 0, y: 0 }, zoom = 1) {
  if (!comparisonPanel || !comparisonControls) return;
  
  const canvas = comparisonControls.canvas;
  const ctx = canvas.getContext('2d');
  
  // Set canvas dimensions to match its display size
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw starfield background with stable positioning
  drawStarfieldBackground(ctx, canvas.width, canvas.height, offset, zoom);
  
  // Update scale info text
  const scaleText = currentScale < 1 ? 
    `Scale: ${(1/currentScale).toFixed(0)} km = 1 pixel` : 
    `Scale: 1 pixel = ${(1/currentScale).toFixed(4)} km`;
  comparisonControls.scaleInfo.textContent = scaleText;
  
  // Determine whether to include the sun
  const includeSun = comparisonControls.sunToggleInput.checked;
  
  // Create a filtered list of planets to display
  const planetsToShow = Object.entries(PLANET_DIAMETERS)
    .filter(([name]) => name !== 'Sun' || includeSun)
    .sort((a, b) => b[1] - a[1]); // Sort by size (largest first)
  
  // Calculate total width needed (sum of all planet diameters plus spacing)
  const spacing = 30; // Increase spacing between planets to prevent overlap
  const totalWidth = planetsToShow.reduce((sum, [_, diameter]) => 
    sum + (diameter * currentScale) + spacing, 0) - spacing;
  
  // Save canvas state
  ctx.save();
  
  // Apply pan offset and zoom
  ctx.translate(canvas.width / 2 + offset.x * zoom, canvas.height / 2 + offset.y * zoom);
  ctx.scale(zoom, zoom);
  
  // Start drawing from the left with some padding
  let x = -totalWidth / 2;
  const centerY = 0; // Center Y is now at 0 after translation
  
  // Draw each planet with improved spacing
  planetsToShow.forEach(([planetName, diameter]) => {
    const radius = (diameter * currentScale) / 2;
    
    // If planet is too small to see (less than 2 pixels), draw a glowing dot
    if (radius < 2) {
      // Draw glow effect
      const gradient = ctx.createRadialGradient(
        x, centerY, 0,
        x, centerY, 8
      );
      
      // Set gradient colors based on planet
      if (planetName === 'Mercury') {
        gradient.addColorStop(0, 'rgba(220, 220, 220, 1)');
        gradient.addColorStop(1, 'rgba(100, 100, 100, 0)');
      } else if (planetName === 'Venus') {
        gradient.addColorStop(0, 'rgba(255, 198, 100, 1)');
        gradient.addColorStop(1, 'rgba(255, 198, 100, 0)');
      } else if (planetName === 'Earth') {
        gradient.addColorStop(0, 'rgba(100, 200, 255, 1)');
        gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
      } else if (planetName === 'Mars') {
        gradient.addColorStop(0, 'rgba(255, 100, 50, 1)');
        gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
      } else if (planetName === 'Jupiter') {
        gradient.addColorStop(0, 'rgba(255, 190, 150, 1)');
        gradient.addColorStop(1, 'rgba(255, 190, 150, 0)');
      } else if (planetName === 'Saturn') {
        gradient.addColorStop(0, 'rgba(240, 220, 150, 1)');
        gradient.addColorStop(1, 'rgba(240, 220, 150, 0)');
      } else if (planetName === 'Uranus') {
        gradient.addColorStop(0, 'rgba(200, 240, 255, 1)');
        gradient.addColorStop(1, 'rgba(200, 240, 255, 0)');
      } else if (planetName === 'Neptune') {
        gradient.addColorStop(0, 'rgba(100, 150, 255, 1)');
        gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
      } else if (planetName === 'Pluto') {
        gradient.addColorStop(0, 'rgba(200, 200, 210, 1)');
        gradient.addColorStop(1, 'rgba(200, 200, 210, 0)');
      } else if (planetName === 'Moon') {
        gradient.addColorStop(0, 'rgba(230, 230, 230, 1)');
        gradient.addColorStop(1, 'rgba(230, 230, 230, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      }
      
      ctx.beginPath();
      ctx.arc(x, centerY, 8, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Add planet name below the dot
      ctx.fillStyle = 'rgba(200, 230, 255, 0.8)';
      ctx.font = '10px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText(planetName, x, centerY + 20);
      
      // Move x position for next planet (use fixed spacing)
      x += spacing + 4; // Increased spacing for dots
    } else {
      // For visible planets, draw using their actual textures
      
      // Check for Saturn to handle rings
      if (planetName === 'Saturn' && radius > 10) {
        // Draw Saturn's rings first (behind the planet)
        drawSaturnRings(ctx, x, centerY, radius);
      }
      
      // Draw the spherical planet with texture mapping
      drawPlanetWithTexture(ctx, x, centerY, radius, planetName);
      
      // Draw Saturn's rings in front (perspective effect)
      if (planetName === 'Saturn' && radius > 10) {
        drawSaturnRingsFront(ctx, x, centerY, radius);
      }
      
      // Add planet name below
      ctx.fillStyle = 'rgba(200, 230, 255, 0.8)';
      ctx.font = '12px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText(planetName, x, centerY + radius + 20);
      
      // Display diameter information for larger planets
      if (radius > 20) {
        const diameterText = `${PLANET_DIAMETERS[planetName].toLocaleString()} km`;
        ctx.font = '10px Orbitron';
        ctx.fillText(diameterText, x, centerY + radius + 36);
      }
      
      // Move x position for next planet
      x += radius * 2 + spacing; // Increased spacing
    }
  });
  
  // Add a scale bar at the bottom
  drawScaleBar(ctx, 0, centerY + 100, currentScale);
  
  // Restore canvas state
  ctx.restore();
  
  // Instructions text for zoom/pan
  ctx.fillStyle = 'rgba(200, 230, 255, 0.7)';
  ctx.font = '12px Orbitron';
  ctx.textAlign = 'center';
  ctx.fillText('Scroll to zoom in/out • Drag to pan • Click "Reset View" to return to center', canvas.width/2, canvas.height - 20);
}


// Function to draw the starfield background
function drawStarfieldBackground(ctx, width, height) {
  // Fill the background with a dark gradient
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, 'rgba(10, 10, 30, 1)');
  bgGradient.addColorStop(1, 'rgba(0, 0, 15, 1)');
  
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add stars
  const starCount = 500;
  
  for (let i = 0; i < starCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 1.5;
    
    // Random brightness for twinkling effect
    const alpha = 0.3 + Math.random() * 0.7;
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();
  }
  
  // Add some colored stars/distant galaxies
  const coloredStarCount = 30;
  const starColors = [
    'rgba(255, 200, 200, 0.7)', // Reddish
    'rgba(200, 200, 255, 0.7)', // Bluish
    'rgba(255, 255, 200, 0.7)', // Yellowish
    'rgba(200, 255, 200, 0.7)'  // Greenish
  ];
  
  for (let i = 0; i < coloredStarCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = 1 + Math.random() * 2;
    const colorIndex = Math.floor(Math.random() * starColors.length);
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = starColors[colorIndex];
    ctx.fill();
  }
  
  // Add a subtle nebula-like effect in the background
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = 100 + Math.random() * 200;
    
    const nebulaGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    
    // Random nebula color
    const hue = Math.random() * 360;
    nebulaGradient.addColorStop(0, `hsla(${hue}, 80%, 50%, 0.03)`);
    nebulaGradient.addColorStop(1, `hsla(${hue}, 80%, 50%, 0)`);
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = nebulaGradient;
    ctx.fill();
  }
}

// Function to draw a planet with proper texture mapping
function drawPlanetWithTexture(ctx, x, y, radius, planetName) {
  // Create planet sphere
  ctx.save();
  
  if (planetTextureCache[planetName]) {
    // Create a pattern from the cached texture
    const img = new Image();
    img.src = planetTextureCache[planetName];
    
    // Draw the planet as a simple textured circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    
    // Create a pattern for the texture
    if (img.complete) {
      const pattern = ctx.createPattern(img, 'no-repeat');
      
      // Use a temporary canvas to create a properly sized texture
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = radius * 2;
      tempCanvas.height = radius * 2;
      const tempCtx = tempCanvas.getContext('2d');
      
      // Draw the image sized to our planet
      tempCtx.drawImage(img, 0, 0, radius * 2, radius * 2);
      
      // Apply a circular mask
      tempCtx.globalCompositeOperation = 'destination-in';
      tempCtx.beginPath();
      tempCtx.arc(radius, radius, radius, 0, Math.PI * 2);
      tempCtx.fill();
      
      // Draw the masked image to the main canvas
      ctx.drawImage(tempCanvas, x - radius, y - radius);
    } else {
      // Fallback if image isn't loaded yet
      // Draw a simple gradient sphere
      const gradient = ctx.createRadialGradient(
        x - radius * 0.3, y - radius * 0.3, 0,
        x, y, radius
      );
      
      // Set colors based on planet
      if (planetName === 'Sun') {
        gradient.addColorStop(0, '#FFFF80');
        gradient.addColorStop(0.5, '#FFCC33');
        gradient.addColorStop(1, '#FF8800');
      } else if (planetName === 'Mercury') {
        gradient.addColorStop(0, '#DDDDDD');
        gradient.addColorStop(0.6, '#BBBBBB');
        gradient.addColorStop(1, '#888888');
      } else if (planetName === 'Venus') {
        gradient.addColorStop(0, '#FFF0D0');
        gradient.addColorStop(0.6, '#FFDC9C');
        gradient.addColorStop(1, '#E8C07F');
      } else if (planetName === 'Earth') {
        gradient.addColorStop(0, '#A0E0FF');
        gradient.addColorStop(0.5, '#6090FF');
        gradient.addColorStop(0.7, '#307040');
        gradient.addColorStop(1, '#204030');
      } else if (planetName === 'Mars') {
        gradient.addColorStop(0, '#FFD0A0');
        gradient.addColorStop(0.6, '#FF8040');
        gradient.addColorStop(1, '#C04000');
      } else if (planetName === 'Jupiter') {
        gradient.addColorStop(0, '#FFDCB0');
        gradient.addColorStop(0.3, '#FFCC80');
        gradient.addColorStop(0.6, '#E8B068');
        gradient.addColorStop(0.8, '#C09048');
        gradient.addColorStop(1, '#A07030');
      } else if (planetName === 'Saturn') {
        gradient.addColorStop(0, '#FFECB0');
        gradient.addColorStop(0.5, '#EFDB98');
        gradient.addColorStop(1, '#CFBE80');
      } else if (planetName === 'Uranus') {
        gradient.addColorStop(0, '#E0FFFF');
        gradient.addColorStop(0.5, '#A0E0E8');
        gradient.addColorStop(1, '#80C0D0');
      } else if (planetName === 'Neptune') {
        gradient.addColorStop(0, '#A0A0FF');
        gradient.addColorStop(0.5, '#6060E0');
        gradient.addColorStop(1, '#4040B0');
      } else if (planetName === 'Pluto') {
        gradient.addColorStop(0, '#E8E0D8');
        gradient.addColorStop(0.5, '#C0B8B0');
        gradient.addColorStop(1, '#A09890');
      } else if (planetName === 'Moon') {
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.5, '#E0E0E0');
        gradient.addColorStop(1, '#A0A0A0');
      }
      
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Add shading to create a 3D sphere effect
      const highlightGradient = ctx.createRadialGradient(
        x - radius * 0.5, y - radius * 0.5, 0,
        x, y, radius
      );
      highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
      highlightGradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = highlightGradient;
      ctx.fill();
    }
  } else {
    // If the texture isn't cached, use a simple gradient sphere
    const gradient = ctx.createRadialGradient(
      x - radius * 0.3, y - radius * 0.3, 0,
      x, y, radius
    );
    
    // Set colors based on planet
    if (planetName === 'Sun') {
      gradient.addColorStop(0, '#FFFF80');
      gradient.addColorStop(0.5, '#FFCC33');
      gradient.addColorStop(1, '#FF8800');
    } else if (planetName === 'Mercury') {
      gradient.addColorStop(0, '#DDDDDD');
      gradient.addColorStop(0.6, '#BBBBBB');
      gradient.addColorStop(1, '#888888');
    } else if (planetName === 'Venus') {
      gradient.addColorStop(0, '#FFF0D0');
      gradient.addColorStop(0.6, '#FFDC9C');
      gradient.addColorStop(1, '#E8C07F');
    } else if (planetName === 'Earth') {
      gradient.addColorStop(0, '#A0E0FF');
      gradient.addColorStop(0.5, '#6090FF');
      gradient.addColorStop(0.7, '#307040');
      gradient.addColorStop(1, '#204030');
    } else if (planetName === 'Mars') {
      gradient.addColorStop(0, '#FFD0A0');
      gradient.addColorStop(0.6, '#FF8040');
      gradient.addColorStop(1, '#C04000');
    } else if (planetName === 'Jupiter') {
      gradient.addColorStop(0, '#FFDCB0');
      gradient.addColorStop(0.3, '#FFCC80');
      gradient.addColorStop(0.6, '#E8B068');
      gradient.addColorStop(0.8, '#C09048');
      gradient.addColorStop(1, '#A07030');
    } else if (planetName === 'Saturn') {
      gradient.addColorStop(0, '#FFECB0');
      gradient.addColorStop(0.5, '#EFDB98');
      gradient.addColorStop(1, '#CFBE80');
    } else if (planetName === 'Uranus') {
      gradient.addColorStop(0, '#E0FFFF');
      gradient.addColorStop(0.5, '#A0E0E8');
      gradient.addColorStop(1, '#80C0D0');
    } else if (planetName === 'Neptune') {
      gradient.addColorStop(0, '#A0A0FF');
      gradient.addColorStop(0.5, '#6060E0');
      gradient.addColorStop(1, '#4040B0');
    } else if (planetName === 'Pluto') {
      gradient.addColorStop(0, '#E8E0D8');
      gradient.addColorStop(0.5, '#C0B8B0');
      gradient.addColorStop(1, '#A09890');
    } else if (planetName === 'Moon') {
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(0.5, '#E0E0E0');
      gradient.addColorStop(1, '#A0A0A0');
    }
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add shading to create a 3D sphere effect
    const highlightGradient = ctx.createRadialGradient(
      x - radius * 0.5, y - radius * 0.5, 0,
      x, y, radius
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    highlightGradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = highlightGradient;
    ctx.fill();
  }
  
  ctx.restore();
}

// Function to draw Saturn's rings behind the planet
function drawSaturnRings(ctx, x, y, radius) {
  ctx.save();
  
  // Draw the rings
  const ringWidth = radius * 0.8; // How far the rings extend beyond the planet
  const ringHeight = radius * 0.1; // Thickness of the rings
  
  ctx.beginPath();
  ctx.ellipse(
    x, 
    y, 
    radius + ringWidth, 
    ringHeight, 
    0, 
    Math.PI, 
    Math.PI * 2, 
    false
  );
  
  // Create a gradient for the rings
  const ringGradient = ctx.createLinearGradient(
    x - (radius + ringWidth), 
    y, 
    x + (radius + ringWidth), 
    y
  );
  
  ringGradient.addColorStop(0, 'rgba(200, 180, 120, 0.7)');
  ringGradient.addColorStop(0.2, 'rgba(230, 210, 150, 0.9)');
  ringGradient.addColorStop(0.3, 'rgba(200, 180, 120, 0.2)'); // Gap
  ringGradient.addColorStop(0.4, 'rgba(230, 210, 150, 0.9)');
  ringGradient.addColorStop(0.7, 'rgba(250, 240, 190, 0.9)');
  ringGradient.addColorStop(1, 'rgba(230, 210, 150, 0.7)');
  
  ctx.fillStyle = ringGradient;
  ctx.fill();
  
  ctx.restore();
}

// Function to draw Saturn's rings in front of the planet
function drawSaturnRingsFront(ctx, x, y, radius) {
  ctx.save();
  
  // Draw the rings
  const ringWidth = radius * 0.8; // How far the rings extend beyond the planet
  const ringHeight = radius * 0.1; // Thickness of the rings
  
  ctx.beginPath();
  ctx.ellipse(
    x, 
    y, 
    radius + ringWidth, 
    ringHeight, 
    0, 
    0, 
    Math.PI, 
    false
  );
  
  // Create a gradient for the rings
  const ringGradient = ctx.createLinearGradient(
    x - (radius + ringWidth), 
    y, 
    x + (radius + ringWidth), 
    y
  );
  
  ringGradient.addColorStop(0, 'rgba(200, 180, 120, 0.7)');
  ringGradient.addColorStop(0.2, 'rgba(230, 210, 150, 0.9)');
  ringGradient.addColorStop(0.3, 'rgba(200, 180, 120, 0.2)'); // Gap
  ringGradient.addColorStop(0.4, 'rgba(230, 210, 150, 0.9)');
  ringGradient.addColorStop(0.7, 'rgba(250, 240, 190, 0.9)');
  ringGradient.addColorStop(1, 'rgba(230, 210, 150, 0.7)');
  
  ctx.fillStyle = ringGradient;
  ctx.fill();
  
  ctx.restore();
}

// Function to draw a scale bar at the bottom of the canvas
function drawScaleBar(ctx, x, y, scale) {
  const barLength = 200; // pixels
  const barHeight = 4;
  const barX = x - barLength / 2;
  const barY = y;
  
  // Draw the scale bar
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillRect(barX, barY, barLength, barHeight);
  
  // Draw tick marks at both ends
  ctx.fillRect(barX, barY - 3, 2, 10);
  ctx.fillRect(barX + barLength, barY - 3, 2, 10);
  
  // Draw middle tick mark
  ctx.fillRect(barX + barLength/2, barY - 3, 2, 10);
  
  // Label the scale
  const realDistance = barLength / scale; // km
  let distanceLabel;
  
  if (realDistance >= 1000000) {
    distanceLabel = `${(realDistance / 1000000).toFixed(1)} million km`;
  } else if (realDistance >= 1000) {
    distanceLabel = `${(realDistance / 1000).toFixed(1)} thousand km`;
  } else {
    distanceLabel = `${realDistance.toFixed(0)} km`;
  }
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = '14px Orbitron';
  ctx.textAlign = 'center';
  ctx.fillText(distanceLabel, barX + barLength / 2, barY + 25);
}

// Animation function
function animate() {
  
  if (scene.visible) {
    orbit.update(); // Always update the camera controls

    if (!isPaused) {
      const timeSpeed = settings.rotationSpeed;
      const time = performance.now() * 0.001; // For time-based animations

      // Rotate planets (existing rotation logic remains the same)
      sun.rotateY(0.004 * timeSpeed);
      mercury.mesh.rotateY(0.004 * timeSpeed);
      mercury.obj.rotateY(0.04 * timeSpeed / 9);
      venus.mesh.rotateY(0.002 * timeSpeed);
      venus.obj.rotateY(0.015 * timeSpeed / 9);
      earth.mesh.rotateY(0.02 * timeSpeed);
      earth.obj.rotateY(0.01 * timeSpeed / 9);
      moon.mesh.rotateY(0.015 * timeSpeed / 1);
      moon.obj.rotateY(0.005 * timeSpeed / 1);
      mars.mesh.rotateY(0.018 * timeSpeed);
      mars.obj.rotateY(0.008 * timeSpeed / 9);
      jupiter.mesh.rotateY(0.04 * timeSpeed);
      jupiter.obj.rotateY(0.002 * timeSpeed / 9);
      ganymede.mesh.rotateY(0.03 * timeSpeed / 1);
      ganymede.obj.rotateY(0.01 * timeSpeed / 1);
      callisto.mesh.rotateY(0.02 * timeSpeed / 1);
      callisto.obj.rotateY(0.007 * timeSpeed / 1);
      europa.mesh.rotateY(0.05 * timeSpeed / 1);
      europa.obj.rotateY(0.02 * timeSpeed / 1);
      saturn.mesh.rotateY(0.038 * timeSpeed);
      saturn.obj.rotateY(0.0009 * timeSpeed / 9);
      uranus.mesh.rotateY(0.03 * timeSpeed);
      uranus.obj.rotateY(0.0004 * timeSpeed / 9);
      neptune.mesh.rotateY(0.032 * timeSpeed);
      neptune.obj.rotateY(0.0001 * timeSpeed / 9);
      pluto.mesh.rotateY(0.008 * timeSpeed);
      pluto.obj.rotateY(0.00007 * timeSpeed / 9);
      asteroidBelt.rotateY(0.0001 * timeSpeed / 1);
      smallerAsteroidBelt.rotateY(0.0001 * timeSpeed / 1);

      // Animate atmosphere and rim glow effects
      const planets = [mercury, venus, earth, mars, jupiter, saturn, uranus, neptune, pluto];
      planets.forEach(planet => {
        // Update atmosphere if it exists
        if (planet.obj.atmosphere) {
          planet.obj.atmosphere.uniforms.time.value = time;
          
          // Update light direction based on sun position
          const sunDirection = new THREE.Vector3()
            .subVectors(sun.position, planet.mesh.getWorldPosition(new THREE.Vector3()))
            .normalize();
          planet.obj.atmosphere.uniforms.sunPosition.value.copy(sunDirection);
        }
        
        // Update rim glow if it exists
        if (planet.obj.rim) {
          // Update time for animation
          planet.obj.rim.uniforms.time.value = time;
          
          // Update view vector for rim effect based on camera position
          const viewVector = new THREE.Vector3().subVectors(
            camera.position,
            planet.mesh.getWorldPosition(new THREE.Vector3())
          ).normalize();
          planet.obj.rim.uniforms.viewVector.value.copy(viewVector);
          
          // Adjust rim intensity based on distance
          const distance = camera.position.distanceTo(planet.mesh.getWorldPosition(new THREE.Vector3()));
          const normalizedDistance = Math.min(Math.max(distance / 1000, 0.5), 3);
          planet.obj.rim.uniforms.coefficient.value = normalizedDistance;
        }
        
        // Animate rings if they exist
        if (planet.obj.ring) {
          planet.obj.ring.mesh.rotation.z += 0.0001 * timeSpeed;
        }
      });
      
      // Animate sun corona if it exists
      if (sun.corona) {
        sun.coronaUniforms.time.value = time;
      }

      if (focusedPlanet) {
        focusOnPlanet(focusedPlanet);
      }

      // Check camera distance and toggle grid visibility
      const distance = camera.position.distanceTo(scene.position);
      window.gridShouldBeVisible = settings.showGrid;
      
      if (distance > 10000000) {
        grid.visible = false;
        scaleMarkers.visible = false;
      } else {
        grid.visible = true;
        scaleMarkers.visible = true;
      }
      
      if (distance > 150000) {
        smallerAsteroidBelt.visible = false;
      } else {
        smallerAsteroidBelt.visible = true;
      }

      if (distance > 300000) {
        asteroidBelt.visible = false;
      } else {
        asteroidBelt.visible = true;
      }

      // Visibility distance check for planets
      if (distance > 100000) {
        [earth, venus, moon, mercury, mars, jupiter, ganymede, callisto, europa, saturn, uranus, neptune, pluto].forEach(planet => {
          if (planet && planet.mesh) {
            planet.mesh.visible = false;
          }
        });
      } else {
        [earth, venus, moon, mercury, mars, jupiter, ganymede, callisto, europa, saturn, uranus, neptune, pluto].forEach(planet => {
          if (planet && planet.mesh) {
            planet.mesh.visible = true;
          }
        });
      }
      
      // Calculate camera distance from the scene's center
      const distanceToCenter = camera.position.length();

      // Define fade thresholds for asteroid belts
      const fadeStart = 50000;
      const fadeEnd = 100000;

      // Calculate fade factor using smooth interpolation
      let fadeFactor = (fadeEnd - distanceToCenter) / (fadeEnd - fadeStart);
      fadeFactor = Math.min(Math.max(fadeFactor, 0), 1); // Clamp between 0 and 1
      fadeFactor = fadeFactor * fadeFactor * (3 - 2 * fadeFactor); // Smoothstep

      // Apply fade effect to asteroid belt materials
      asteroidBelt.children.forEach(asteroid => {
        if (asteroid.material) {
          asteroid.material.opacity = fadeFactor;
          asteroid.material.transparent = true;
          asteroid.material.needsUpdate = true;
        }
      });
      
      smallerAsteroidBelt.children.forEach(asteroid => {
        if (asteroid.material) {
          asteroid.material.opacity = fadeFactor;
          asteroid.material.transparent = true;
          asteroid.material.needsUpdate = true;
        }
      });
      
      // Ensure asteroid belts don't disappear completely (optional)
      asteroidBelt.visible = fadeFactor > 0;
      smallerAsteroidBelt.visible = fadeFactor > 0;
      
      // Define fade thresholds for particle system
      const fadeStart2 = 5000000;
      const fadeEnd2 = 10000000;
      
      // Calculate fade factor using smooth interpolation
      let fadeFactor2 = (fadeEnd2 - distanceToCenter) / (fadeEnd2 - fadeStart2);
      fadeFactor2 = Math.min(Math.max(fadeFactor2, 0), 1); // Clamp between 0 and 1
      fadeFactor2 = fadeFactor2 * fadeFactor2 * (3 - 2 * fadeFactor2); // Smoothstep
      
      // Apply fade to particle system
      particleMaterial.opacity = fadeFactor2;
      particleMaterial.transparent = true;
      particleMaterial.needsUpdate = true;

      // Handle plane fade logic
      if (distance > 50000000) {
        plane.visible = true;
        planeBack.visible = true;

        if (plane.material.opacity < 1) {
          plane.material.opacity = Math.min(plane.material.opacity + 0.01, 1);
          planeBack.material.opacity = Math.min(planeBack.material.opacity + 0.01, 1);
        }
      } else if (distance <= 50000000) {
        if (plane.material.opacity > 0) {
          plane.material.opacity = Math.max(plane.material.opacity - 0.01, 0);
          planeBack.material.opacity = Math.max(planeBack.material.opacity - 0.01, 0);
        } else {
          plane.visible = false;
          planeBack.visible = false;
        }
      }

      // Handle lensflare visibility based on distance
      const distanceToSun = camera.position.distanceTo(sun.position);
      if (distanceToSun > 1000000) {
        lensflare.visible = false;
      } else {
        lensflare.visible = true;
      }

      // Orbit ring fade logic with delayed and smooth transitions
      const cameraDistance = camera.position.length(); // Distance from origin (scene center)

      // Adjust these values to control the fade behavior
      const baseFadeStart = 300; // When the first (innermost) ring starts fading
      const fadeGap = 500;       // Distance gap between each ring's fade start
      const fadeDuration = 200;  // Distance over which each ring fully fades

      orbitRings.forEach((orbit, index) => {
        const fadeStart = baseFadeStart + index * fadeGap;
        const fadeEnd = fadeStart + fadeDuration * 2; // Extend duration for slower fade
      
        let fadeFactor = (fadeEnd - cameraDistance) / (fadeEnd - fadeStart);
        fadeFactor = Math.min(Math.max(fadeFactor, 0), 1); // Clamp between 0 and 1
      
        // Use an easing function for smoother transition
        fadeFactor = fadeFactor * fadeFactor * fadeFactor * (fadeFactor * (fadeFactor * 6 - 15) + 10); 
      
        orbit.material.opacity = fadeFactor * 0.3; // Max opacity is 0.3
        orbit.material.needsUpdate = true;
      });
      
      // Planet label fade logic
      permanentLabels.forEach((label, uuid) => {
        scene.traverse((object) => {
          if (object.uuid === uuid) {
            const name = object.name.toLowerCase();
            const thresholds = LABEL_FADE_THRESHOLDS[name];
            if (!thresholds) return; // skip if no threshold set
      
            const distance = camera.position.distanceTo(object.position);
            let fadeFactor = (thresholds.fadeEnd - distance) / (thresholds.fadeEnd - thresholds.fadeStart);
            fadeFactor = Math.min(Math.max(fadeFactor, 0), 1); // clamp
            fadeFactor = fadeFactor * fadeFactor * (3 - 2 * fadeFactor); // smoothstep
      
            label.element.style.opacity = fadeFactor;
          }
        });
      });
      
      // Star label fade logic
      stars.forEach(star => {
        const label = star.mesh.children.find(child => child.isCSS2DObject);
        if (!label) return;
      
        if (!star.mesh.visible) {
          label.element.style.opacity = '0'; // Hide if star is not visible
          return;
        }
      
        const distance = camera.position.distanceTo(star.mesh.position);
      
        if (distance < 5000 || distance > 2000000) {
          label.element.style.opacity = '0'; // Hide label
        } else {
          label.element.style.opacity = '1'; // Show label
        }
      });
      
      // Update lensflare position to match sun
      lensflare.position.copy(sun.position);
      
      // Update date display
      updateDateDisplay(earth.mesh);
      
      // Check for hover effects
      checkHover();
      
      // Update labels and highlights
      updateLabelsAndHighlights();
      
      // Rotate particle system (stars)
      particleSystem.rotation.x += 0;
      particleSystem.rotation.y += 0;
      
      // Update grid and grid visibility
      updateGrid(camera);
      updateGridVisibility(camera);
      
      // Update star system visibility
      updateStarSystemVisibility();

        updateHighlightEffects();

    }

    // Update shader materials that need camera position
    scene.traverse((child) => {
      if (child.isMesh && child.material instanceof THREE.ShaderMaterial && child.material.uniforms?.viewVector) {
        child.material.uniforms.viewVector.value.copy(
          camera.position.clone().sub(child.getWorldPosition(new THREE.Vector3())).normalize()
        );
        child.material.uniformsNeedUpdate = true;
      }
    });

      if (scene.visible && !isExploringPlanet) {
    // Make sure CSS2D renderer is rendering
    if (labelRenderer) {
      labelRenderer.render(scene, camera);
    }
  }

    
    // Render the scene
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
}


animate();




// Ensure the animate loop is set
renderer.setAnimationLoop(animate);

function initScaleComparison() {
  // Create the scale button
  addScaleComparisonButton();
  
  // Add keyboard shortcut (press S)
  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 's' && !isExploringPlanet) {
      toggleScaleComparisonView();
    }
  });
}

// Function to dynamically add the Reset View button
function addResetViewButton() {
  // Create an image for the reset button
  const button = document.createElement('img');
  button.id = 'resetButton';
  button.src = 'src/img/reset.png'; // Path to the reset.png image
  button.alt = 'Reset View';
  
  // Styling the button
  button.style.position = 'absolute';
  button.style.bottom = '20px';
  button.style.left = '25px';
  button.style.width = '70px'; // Size of the image
  button.style.height = '70px';
  button.style.cursor = 'pointer';
  button.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
  button.style.boxShadow = '0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4)';
  button.style.borderRadius = '50%'; // Circular button style

  // Add hover effect
  button.addEventListener('mouseover', () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 0 30px rgba(0, 216, 230, 1), 0 0 20px rgba(0, 216, 230, 0.8)';
  });
  button.addEventListener('mouseout', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4)';
  });

  // Add click event
  button.addEventListener('click', () => {
    clickSound.currentTime = 0;
    clickSound.play();
  
    focusedPlanet = null;
    orbit.enabled = true;
    camera.position.set(-90, 140, 140);
    camera.lookAt(scene.position);
    document.getElementById('planet-info').style.display = 'none';
    removeExploreButton();
  
    // Show all labels again
    permanentLabels.forEach(label => {
      label.visible = true;
    });
  });
  

  // Append to the body
  document.body.appendChild(button);
  
}


// Style and functionality for the Start Exploration button
const startButton = document.getElementById('start-button');
startButton.textContent = 'Start Exploration';

// Apply solar system theme to the button
startButton.style.position = 'absolute';
startButton.style.top = '99%'; // Positioned slightly lower
startButton.style.left = '50%';
startButton.style.transform = 'translate(-50%, -50%)'; // Keeps the button centered
startButton.style.transformOrigin = 'center'; // Prevents shifting during hover
startButton.style.padding = '20px 40px';
startButton.style.fontSize = '18px';
startButton.style.fontFamily = 'Orbitron'; // Font changed to monospace
startButton.style.color = '#ffffff';
startButton.style.border = '2px solid rgba(255, 255, 255, 0.5)';
startButton.style.borderRadius = '15px';
startButton.style.background = 'linear-gradient(135deg, rgba(10, 10, 36, 0.8), rgba(10, 10, 36, 0.8))';
startButton.style.boxShadow = '0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4)';
startButton.style.cursor = 'pointer';
startButton.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';

// Hover effects
startButton.addEventListener('mouseover', () => {
  startButton.style.transform = 'translate(-50%, -50%) scale(1.1)'; // Scale while keeping centered
  startButton.style.boxShadow = '0 0 30px rgba(0, 216, 230, 1), 0 0 20px rgba(0, 216, 230, 0.8)';
});
startButton.addEventListener('mouseout', () => {
  startButton.style.transform = 'translate(-50%, -50%) scale(1)'; // Reset scale while keeping centered
  startButton.style.boxShadow = '0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4)';
});

// Event listener for the Start Exploration button
startButton.addEventListener('click', function () {
  
  transitionStartupToMain(() => {
    // This callback runs after the transition animation but before fade-out
    document.getElementById('starter-screen').style.display = 'none';
    
    // Show the hidden elements
    document.getElementById('gui-container').style.display = 'block';
    document.getElementById('planet-buttons').style.display = 'none';
  
    // Add the Reset View button dynamically
    addResetViewButton();
    initScaleComparison();

    // Enable pointer events on the canvas 
    document.querySelector('canvas').style.pointerEvents = 'auto';
  });
});


// Disable pointer events on the canvas initially 
document.querySelector('canvas').style.pointerEvents = 'none'; 

document.addEventListener("DOMContentLoaded", function () {
  // Set initial state for pause button
  const pauseButton = document.getElementById('pauseButton');
  pauseButton.src = 'src/img/pause.png';
  pauseButton.style.position = 'fixed'; // Anchor the button

  // Apply hover effect to pause button
  pauseButton.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
  pauseButton.style.boxShadow = '0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4)';
  pauseButton.style.borderRadius = '50%';
  pauseButton.style.bottom = '20px'; // Adjust this value as needed
  pauseButton.style.left = '34%'; // Adjust this value as needed
  pauseButton.style.width = '70px'; // Consistent size
  pauseButton.style.height = '70px'; // Consistent size
  pauseButton.style.cursor = 'pointer';

  pauseButton.addEventListener('mouseover', () => {
    pauseButton.style.transform = 'scale(1.1)';
    pauseButton.style.boxShadow = '0 0 30px rgba(0, 216, 230, 1), 0 0 20px rgba(0, 216, 230, 0.8)';
  });
  pauseButton.addEventListener('mouseout', () => {
    pauseButton.style.transform = 'scale(1)';
    pauseButton.style.boxShadow = '0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4)';
  });
  
  // Toggle play/pause on click
  pauseButton.addEventListener('click', function () {
    clickSound.currentTime = 0; // Rewind to start if clicked multiple times fast
    clickSound.play();          // Play the sound
  
    isPaused = !isPaused;
    const imgSrc = isPaused ? 'src/img/play.png' : 'src/img/pause.png';
    pauseButton.src = imgSrc;
  });
});



document.addEventListener("DOMContentLoaded", function () {
});

// Window resize handling 
window.addEventListener('resize', function() { 
  camera.aspect = window.innerWidth / window.innerHeight; 
  camera.updateProjectionMatrix(); 
  renderer.setSize(window.innerWidth, window.innerHeight);
});





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

    //update label scales after zoom
      updateLabelsAndHighlights();
  } 
}, { passive: false });  // Add this option





window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});


function checkHover() {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  let hoveredPlanet = null;

  for (let i = 0; i < intersects.length; i++) {
      if (intersects[i].object.isPlanet) {
          hoveredPlanet = intersects[i].object;
          break;
      }
  }

  // Handle hover state changes
  if (hoveredPlanet !== INTERSECTED) {
      // If we had a previous highlight, hide it
      if (currentHighlight) {
          currentHighlight.visible = false;
      }
      if (currentLabel) {
          currentLabel.parent.remove(currentLabel);
          currentLabel = null;
      }

      // If we found a new planet to hover
      if (hoveredPlanet) {
          INTERSECTED = hoveredPlanet;

          // Create new highlight if we don't already have one for this planet
          if (!currentHighlight || currentHighlight.userData.planetId !== hoveredPlanet.uuid) {
              // Remove old highlight if it exists
              if (currentHighlight && currentHighlight.parent) {
                  currentHighlight.parent.remove(currentHighlight);
              }
              
              const highlightMesh = createHighlightSphere(hoveredPlanet);
              highlightMesh.userData.planetId = hoveredPlanet.uuid;
              hoveredPlanet.parent.add(highlightMesh);
              currentHighlight = highlightMesh;
          }
          
          // Show and position the highlight
          currentHighlight.visible = true;
          
          // Make highlight face the camera
          currentHighlight.lookAt(camera.position);

          // Create hover label
          const label = createPermanentLabel(hoveredPlanet.name);
          hoveredPlanet.parent.add(label);
          currentLabel = label;

          // Position hover label above planet
          const labelOffset = hoveredPlanet.geometry.parameters.radius * 1.5;
          label.position.set(0, labelOffset, 0);

          // Hide permanent label
          const permanentLabel = permanentLabels.get(hoveredPlanet.uuid);
          if (permanentLabel) {
              permanentLabel.visible = false;
          }
      } else {
          INTERSECTED = null;
          // Show all permanent labels when not hovering
          if (!isPlanetClicked) {
              permanentLabels.forEach(label => {
                  label.visible = true;
              });
          }
      }
  }
}

function updateHighlightEffects() {
  if (currentHighlight && currentHighlight.visible) {
      const time = Date.now();
      
      // Calculate a pulsing value between 0 and 1 based on time
      const pulseValue = (Math.sin((time - currentHighlight.userData.startTime) * 0.003) + 1) * 0.5;
      
      // Update the shader uniforms for both rings
      if (currentHighlight.userData.ringMaterial) {
          currentHighlight.userData.ringMaterial.uniforms.pulse.value = pulseValue;
      }
      
      if (currentHighlight.userData.outerRingMaterial) {
          // Make outer ring pulse slightly out of phase
          currentHighlight.userData.outerRingMaterial.uniforms.pulse.value = 
              (Math.sin((time - currentHighlight.userData.startTime) * 0.003 + 1) + 1) * 0.5;
      }
      
      // Make sure the highlight is facing the camera
      currentHighlight.lookAt(camera.position);
  }
}


function updateLabelsAndHighlights(timestamp) {
// Only update labels every 100ms instead of every frame
if (timestamp - lastTimeLabelsUpdated > LABEL_UPDATE_INTERVAL) {
  permanentLabels.forEach((label, planetId) => {
    scene.traverse((object) => {
        if (object.uuid === planetId) {
            // Position the label near its planet
            const labelOffset = object.geometry.parameters.radius * 1.5;
            label.position.copy(object.position);
            label.position.y -= labelOffset;
            
            // Make label face the camera
            label.lookAt(camera.position);
            
            // Set a fixed size in screen space
            // This is the key change - calculate the scale needed to maintain constant pixel size
            const objectWorldPosition = new THREE.Vector3();
            objectWorldPosition.setFromMatrixPosition(object.matrixWorld);
            
            // Project the position to screen space
            const objectVector = objectWorldPosition.clone();
            objectVector.project(camera);
            
            // Calculate the distance from camera to object
            const distance = camera.position.distanceTo(object.position);
            
            // Set fixed pixel size (adjust these values as needed)
            const baseWidth = 4;  // Base width in world units
            const baseHeight = 1; // Base height in world units
            
            // Scale to maintain pixel size regardless of distance
            label.scale.set(
              baseWidth * distance / 500,
              baseHeight * distance / 500,
              1
            );
            
            // Handle visibility based on distance threshold
            const threshold = PLANET_THRESHOLDS[object.name];
            if (threshold) {
                if (distance > threshold) {
                    // Fade out over a range of 200 units after threshold
                    const fadeRange = 200;
                    const opacity = Math.max(0, 1 - (distance - threshold) / fadeRange);
                    label.material.opacity = opacity;
                } else {
                    label.material.opacity = 1;
                }
            }
        }
    });
  });
  
  lastTimeLabelsUpdated = timestamp;
}

// Apply the same logic to hover labels
if (INTERSECTED && currentLabel) {
    const labelOffset = INTERSECTED.geometry.parameters.radius * 1.5;
    currentLabel.position.copy(INTERSECTED.position);
    currentLabel.position.y += labelOffset;
    currentLabel.lookAt(camera.position);
    
    // Calculate the distance from camera to object
    const distance = camera.position.distanceTo(INTERSECTED.position);
    
    // Set fixed pixel size (same as above)
    const baseWidth = 4;
    const baseHeight = 1;
    
    // Scale to maintain pixel size regardless of distance
    currentLabel.scale.set(
      baseWidth * distance / 500,
      baseHeight * distance / 500,
      1
    );
    
    if (currentHighlight) {
        currentHighlight.position.copy(INTERSECTED.position);
        currentHighlight.lookAt(camera.position);
    }
}
}



function openExplorePanel(planet) {
  cleanupAllLabels();
  scene.visible = false;
  isExploringPlanet = true;
  hideMainSceneUI();

  
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

  function createTextureEditPanel(planet, surfaceMesh) {
    if (planet.name !== 'Earth') return { panel: null, button: null };
    
    const editPanel = document.createElement('div');
    editPanel.id = 'earth-texture-edit-panel';
    editPanel.style.cssText = `
      position: fixed;
      left: 8%;
      bottom: 5%;
      transform: translateY(-50%);
      background-color: rgba(0, 0, 0, 0.7);
      border-radius: 10px;
      padding: 15px;
      color: white;
      z-index: 1000;
      display: none;
    `;

  // Texture buttons
  const textureButtons = [
    { 
      name: 'Default', 
      texture: './src/img/earth.jpg' 
    },
    { 
      name: 'Winter', 
      texture: './src/img/earthwinter.jpg' 
    },
    { 
      name: 'Summer', 
      texture: './src/img/earthsummer.jpg' 
    },
    { 
      name: 'City Lights', 
      texture: './src/img/earthlight.jpg' 
    }
  ];

  // Create texture selection buttons
  textureButtons.forEach(({ name, texture }) => {
    const button = document.createElement('button');
    button.textContent = name;
    button.style.cssText = `
      display: block;
      width: 100%;
      margin: 10px 0;
      font-family: 'Orbitron', sans-serif;
      padding: 10px;
      background-color: rgba(255,255,255,0.1);
      color: white;
      border: 1px solid white;
      border-radius: 5px;
      cursor: pointer;
    `;
    
    button.addEventListener('click', () => {
      // Load and apply new texture
      const newTexture = textureLoader.load(texture);
      surfaceMesh.material.map = newTexture;
      surfaceMesh.material.needsUpdate = true;
    });

    editPanel.appendChild(button);
  });

  // Create the Edit button as a PNG image
  const editButton = document.createElement('img');
  editButton.id = 'texture-edit-button'; // Add an ID for easier reference
  editButton.src = './src/img/texture.png';
  editButton.alt = 'Edit Texture';
  
  editButton.style.cssText = `
    position: fixed;
    left: 25px;
    bottom: 23.5%;
    transform: scale(1) translateY(-50%);
    cursor: pointer;
    width: 70px;
    font-family: 'Orbitron', sans-serif;
    height: 70px;
    z-index: 1000;
    display: block;
    margin: 0;
    padding: 0;
    border-radius: 50%;
    box-shadow: 0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    will-change: transform, box-shadow;
  `;
  
  // Hover effect
  editButton.addEventListener('mouseover', () => {
    editButton.style.transform = 'scale(1.1) translateY(-50%)';
    editButton.style.boxShadow = '0 0 30px rgba(0, 216, 230, 1), 0 0 20px rgba(0, 216, 230, 0.8)';
  });
  editButton.addEventListener('mouseout', () => {
    editButton.style.transform = 'scale(1) translateY(-50%)';
    editButton.style.boxShadow = '0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4)';
  });
  
// Toggle the visibility of the edit panel
editButton.addEventListener('click', () => {
  if (editPanel.style.display === 'none') {
    editPanel.style.display = 'block';
  } else {
    editPanel.style.display = 'none';
  }
});


// Add the Edit button and panel to the document
document.body.appendChild(editButton);
document.body.appendChild(editPanel);

return { panel: editPanel, button: editButton };

}

if (planetObject) {
  // Create a smaller version of the planet for better viewing
  const surfaceGeo = new THREE.SphereGeometry(100, 60, 60);
  const surfaceMat = new THREE.MeshStandardMaterial({ 
    map: planetObject.mesh.material.map,
    normalScale: new THREE.Vector2(1, 1),
    normalMap: planetObject.mesh.material.normalMap,
    emissive: new THREE.Color(0x444444),
    emissiveIntensity: 0.1
  });
  const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
  surfaceMesh.rotation.y = Math.PI;
  
  // Add enhanced rim light effect
  const rimColor = getPlanetRimColor(planet.name);
// Create rim light effect
const rimGeo = new THREE.SphereGeometry(102, 60, 60); // Slightly larger than planet
const rimMat = new THREE.ShaderMaterial({
  uniforms: {
    glowColor: { value: getPlanetRimColor(planet.name) },
    viewVector: { value: new THREE.Vector3(0, 0, 1) },
    coefficient: { value: 1.0 },
    power: { value: 2.0 }
  },
  vertexShader: `
    uniform vec3 viewVector;
    uniform float coefficient;
    uniform float power;
    varying float intensity;
    void main() {
      vec3 vNormal = normalize(normalMatrix * normal);
      vec3 vNormView = normalize(viewVector);
      intensity = pow(coefficient - dot(vNormal, vNormView), power);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 glowColor;
    varying float intensity;
    void main() {
      vec3 glow = glowColor * intensity;
      gl_FragColor = vec4(glow, intensity);
    }
  `,
  side: THREE.BackSide,
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthWrite: false
});

const rimMesh = new THREE.Mesh(rimGeo, rimMat);
planetScene.add(rimMesh); // Add directly to planet scene instead of as child

// Update the animation loop to include rim light updates
const originalAnimateFunction = animatePlanetExploration;
animatePlanetExploration = function() {
  if (!isExploringPlanet) return;
  
  // Update rim light based on camera position
  if (rimMat && rimMat.uniforms) {
    rimMat.uniforms.viewVector.value.copy(
      camera.position.clone().normalize()
    );
  }
  
  // Call the original animation function
  originalAnimateFunction();
};

  
    planetScene.add(surfaceMesh);

    // Create texture edit panel
    const textureEditUI = createTextureEditPanel(planet, surfaceMesh);




    // Create atmosphere with glow effect
    const atmosphereGeo = new THREE.SphereGeometry(110, 60, 60);
    const atmosphereMat = new THREE.ShaderMaterial({
      uniforms: {
        sunPosition: { value: new THREE.Vector3(0, 1, -1).normalize() },
        rayleigh: { value: 1 },
        turbidity: { value: 10 },
        mieCoefficient: { value: 0.005 },
        mieDirectionalG: { value: 0.8 },
        up: { value: new THREE.Vector3(0, 1, 0) },
        planetColor: { value: getPlanetAtmosphereColor(planet.name) },
        atmosphereDensity: { value: getPlanetAtmosphereDensity(planet.name) }
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

    const light = new THREE.DirectionalLight(0xfdfbd3, 1);
    light.position.set(200, 100, 200);
    planetScene.add(light);

    // Sun setup
    const sunGeo = new THREE.SphereGeometry(20, 30, 30);
    const sunMat = new THREE.MeshBasicMaterial({
      map: textureLoader.load(sunTexture),
      emissive: new THREE.Color(0xfdfbd3),
      emissiveIntensity: 2.0,
      transparent: false,  // Set to false to avoid rendering issues
      depthWrite: true,    // Enable depth writing to properly occlude objects behind it
    });
    
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.name = 'Sun';
    sun.position.set(200, 100, 200); // Match initial light position
    planetScene.add(sun);

    // Create a raycaster for click detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

   // Create hover indicator
   const indicatorGeo = new THREE.CircleGeometry(10, 32);
   const indicatorMat = new THREE.MeshBasicMaterial({
     color: 0xffffff,
     transparent: true,
     opacity: 0.5,
     side: THREE.DoubleSide,
     depthTest: true,
     depthWrite: false
   });
   const hoverIndicator = new THREE.Mesh(indicatorGeo, indicatorMat);
   hoverIndicator.visible = false;
   planetScene.add(hoverIndicator);
   createExplorationPanel(planet, exploreControls, planetScene, composer, light, sun, camera);

   // Function to update hover indicator position
   function onMouseMove(event) {
     mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
     mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

     raycaster.setFromCamera(mouse, camera);
     const intersects = raycaster.intersectObject(surfaceMesh);

     if (intersects.length > 0 && intersects[0].object !== sun) {
       const intersectionPoint = intersects[0].point;
       hoverIndicator.position.copy(intersectionPoint);
       
       // Orient the circle to face the camera and align with the planet's surface
       hoverIndicator.lookAt(camera.position);
       
       // Offset slightly to prevent z-fighting
       const normal = new THREE.Vector3()
         .subVectors(intersectionPoint, surfaceMesh.position)
         .normalize();
       hoverIndicator.position.add(normal.multiplyScalar(0.1));
       
       // Add subtle animation
       const pulseScale = 1 + Math.sin(Date.now() * 0.005) * 0.2;
       hoverIndicator.scale.setScalar(pulseScale);
       
       hoverIndicator.visible = true;
     } else {
       hoverIndicator.visible = false;
     }
   }

   // Add mousemove event listener
   renderer.domElement.addEventListener('mousemove', onMouseMove);

   // Update click handler to include indicator feedback
   function onMouseClick(event) {
     mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
     mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

     raycaster.setFromCamera(mouse, camera);
     const intersects = raycaster.intersectObject(surfaceMesh);

     if (intersects.length > 0 && intersects[0].object !== sun) {
       const intersectionPoint = intersects[0].point;
       
       // Flash the indicator on click
       const originalOpacity = indicatorMat.opacity;
       indicatorMat.opacity = 1;
       setTimeout(() => {
         indicatorMat.opacity = originalOpacity;
       }, 200);

       // Calculate new sun position
       const direction = intersectionPoint.clone().normalize();
       const sunDistance = 300;
       const newSunPosition = direction.multiplyScalar(sunDistance);
        
        // Smoothly animate the sun to new position
        const duration = 1000;
        const startPosition = sun.position.clone();
        const startTime = Date.now();
        
        function updateSunPosition() {
          const currentTime = Date.now();
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Cubic ease-out
          const easeProgress = 1 - Math.pow(1 - progress, 3);
          
          sun.position.lerpVectors(startPosition, newSunPosition, easeProgress);
          light.position.copy(sun.position);
          
          // Update lensflare position
          if (lensflare) {
            lensflare.position.copy(sun.position);
          }
          
          // Update atmosphere shader uniforms
          const normalizedSunPosition = sun.position.clone().normalize();
          atmosphereMat.uniforms.sunPosition.value.copy(normalizedSunPosition);
          
          // Update bloom effect intensity
          const sunVisibility = Math.max(0, normalizedSunPosition.y);
          bloomPass.strength = 1.5 + sunVisibility;
          
          if (progress < 1) {
            requestAnimationFrame(updateSunPosition);
          }
        }
        
        updateSunPosition();
      }
    }

    // Add event listener for mouse clicks
    renderer.domElement.addEventListener('click', onMouseClick);

    // Camera and controls setup
    camera.position.set(0, 50, 200);
    camera.lookAt(0, 0, 0);
    exploreControls.minDistance = 300;
    exploreControls.maxDistance = 600;
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

    if (lensflare) {
      lensflare.position.copy(sun.position);
    }

    atmosphereMat.uniforms.sunPosition.value.copy(
      light.position.clone().normalize()
    );

    animatePlanetExploration();
  }




  // Return cleanup function
  explorationCleanupFunction = function cleanup() {
    renderer.domElement.removeEventListener('click', onMouseClick);
    renderer.domElement.removeEventListener('mousemove', onMouseMove);
  
    // Remove texture edit UI elements
    if (textureEditUI && textureEditUI.button) {
      document.body.removeChild(textureEditUI.button);
    }
    if (textureEditUI && textureEditUI.panel) {
      document.body.removeChild(textureEditUI.panel);
    }
  };
  
  return explorationCleanupFunction;
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
function createExplorationPanel(planet, exploreControls, planetScene, composer, light, sunMesh, atmosphereMesh, camera, surfaceMesh) {
  const uiElements = [];
  
  // Skybox button
  const skyboxButton = document.createElement('img');
  skyboxButton.src = './src/img/location.png';
  skyboxButton.alt = 'View Skybox';
  skyboxButton.style.cssText = `
    position: fixed;
    left: 25px;
    bottom: 35%;
    transform: scale(1) translateY(-50%);
    cursor: pointer;
    width: 70px;
    height: 70px;
    z-index: 1000;
    display: block;
    margin: 0;
    padding: 0;
    border-radius: 50%;
    box-shadow: 0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    will-change: transform, box-shadow;
  `;
  
  // Hover effect
  skyboxButton.addEventListener('mouseover', () => {
    skyboxButton.style.transform = 'scale(1.1) translateY(-50%)';
    skyboxButton.style.boxShadow = '0 0 30px rgba(0, 216, 230, 1), 0 0 20px rgba(0, 216, 230, 0.8)';
  });
  skyboxButton.addEventListener('mouseout', () => {
    skyboxButton.style.transform = 'scale(1) translateY(-50%)';
    skyboxButton.style.boxShadow = '0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4)';
  });
  
  // Click action
  skyboxButton.addEventListener('click', () => {
    // Use transition with callback
    transitionExplorationToSkybox(() => {
      console.log('Transition to skybox complete');
      openSkyboxView(planet, exploreControls, planetScene, composer);
      hideExploreSceneUI();
    });
  });
  document.body.appendChild(skyboxButton);
  uiElements.push(skyboxButton);
  
  // Lighting control panel
  const lightingPanel = document.createElement('div');
  lightingPanel.id = 'lightingPanel';
  lightingPanel.style.cssText = `
  position: fixed;
  right: 1%;
  bottom: 50px;
  background: radial-gradient(circle at center, rgba(20, 20, 30, 0.95), rgba(5, 5, 15, 0.95));
  border: 2px solid rgba(0, 216, 230, 0.4);
  box-shadow: 0 0 20px rgba(0, 216, 230, 0.3);
  border-radius: 16px;
  padding: 20px;
  color: #e0f7fa;
  font-family: 'Orbitron', sans-serif;
  z-index: 1000;
  display: none;
  width: 280px;
  backdrop-filter: blur(10px);
`;
lightingPanel.innerHTML = `
  <h3 style="margin-top: 0; font-size: 1.2em; color: #00d8e6; text-align: center;">🪐 Lighting Controls</h3>
  <p style="font-size: 0.85em; color: #b2ebf2; text-align: center; margin-bottom: 16px;">Tap a planet to aim sunlight</p>
  
  <div style="margin-bottom: 12px;">
    <label for="sunIntensity" style="display:block; margin-bottom: 6px;">☀️ Sun Intensity</label>
    <input type="range" id="sunIntensity" min="0" max="2" step="0.1" value="1" style="
      width: 100%;
      background: linear-gradient(to right, #00d8e6, #004d80);
      border-radius: 10px;
      accent-color: #00d8e6;
    ">
  </div>
  
  <div>
    <label for="ambientIntensity" style="display:block; margin-bottom: 6px;">🌌 Ambient Light</label>
    <input type="range" id="ambientIntensity" min="0" max="1" step="0.1" value="0.25" style="
      width: 100%;
      background: linear-gradient(to right, #00d8e6, #004d80);
      border-radius: 10px;
      accent-color: #00d8e6;
    ">
  </div>
`;
  
  document.body.appendChild(lightingPanel);
  uiElements.push(lightingPanel);
 
  const lightingButton = document.createElement('img');
  lightingButton.src = './src/img/Light.png';
  lightingButton.alt = 'Lighting Controls';
  lightingButton.style.cssText = `
    position: fixed;
    left: 25px;
    top: 45%;
    transform: scale(1) translateY(-50%);
    cursor: pointer;
    width: 70px;
    height: 70px;
    z-index: 1000;
    display: block;
    margin: 0;
    padding: 0;
    border-radius: 50%;
    box-shadow: 0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    will-change: transform, box-shadow;
  `;
  
  // Hover effect
  lightingButton.addEventListener('mouseover', () => {
    lightingButton.style.transform = 'scale(1.1) translateY(-50%)';
    lightingButton.style.boxShadow = '0 0 30px rgba(0, 216, 230, 1), 0 0 20px rgba(0, 216, 230, 0.8)';
  });
  lightingButton.addEventListener('mouseout', () => {
    lightingButton.style.transform = 'scale(1) translateY(-50%)';
    lightingButton.style.boxShadow = '0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4)';
  });
  
  lightingButton.addEventListener('click', () => {
    clickSound.currentTime = 0; // Rewind to start if clicked multiple times fast
    clickSound.play();          // Play the sound
  
    lightingPanel.style.display = lightingPanel.style.display === 'none' ? 'block' : 'none';
  });
  
  document.body.appendChild(lightingButton);
  uiElements.push(lightingButton);

  // Get lighting control elements
  const sunIntensitySlider = lightingPanel.querySelector('#sunIntensity');
  const ambientIntensitySlider = lightingPanel.querySelector('#ambientIntensity');

  // Sun intensity slider
  sunIntensitySlider.addEventListener('input', (e) => {
    clickSound2.currentTime = 0; // Rewind to start if clicked multiple times fast
    clickSound2.play();          // Play the sound
  

    const intensity = parseFloat(e.target.value);
    light.intensity = intensity;
    sunMesh.material.emissiveIntensity = intensity * 2;
    
    // Update atmosphere shader if it exists
    if (atmosphereMesh && atmosphereMesh.material.uniforms) {
      atmosphereMesh.material.uniforms.sunPosition.value = light.position.clone().normalize();
    }
  });

  // Ambient light control
  const ambientLight = new THREE.AmbientLight(0x404040, 0.25);
  planetScene.add(ambientLight);

  ambientIntensitySlider.addEventListener('input', (e) => {
    clickSound2.currentTime = 0; // Rewind to start if clicked multiple times fast
    clickSound2.play();          // Play the sound

    const intensity = parseFloat(e.target.value);
    ambientLight.intensity = intensity;
  });

  // Function to handle planet click to control light direction
  function onPlanetClick(event) {
    // Check if we're clicking on UI elements
    if (event.target !== renderer.domElement) return;
    
    // Calculate mouse position
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    // Update light position based on click
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObject(surfaceMesh);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      const direction = point.clone().normalize();
      const sunDistance = 200;
      const newPosition = direction.multiplyScalar(sunDistance);
      
      // Update light and sun position
      light.position.copy(newPosition);
      sunMesh.position.copy(newPosition);
      
      // Update atmosphere if it exists
      if (atmosphereMesh && atmosphereMesh.material.uniforms) {
        atmosphereMesh.material.uniforms.sunPosition.value = direction;
      }
    }
  }
  
  // Add planet click event listener
  renderer.domElement.addEventListener('click', onPlanetClick);

  // Back Button with hover effect
  const backButton = document.createElement('img');
  backButton.src = './src/img/back.png';
  backButton.alt = 'Back to Main';
  backButton.classList.add('back-to-main-button', 'exploration-ui'); // Add these classes
  backButton.style.cssText = `
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 1000;
    cursor: pointer;
    width: 100px;
    height: 100px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4);
    border-radius: 50%;
  `;

  backButton.addEventListener('mouseover', () => {
    backButton.style.transform = 'scale(1.1)';
    returnButton.style.boxShadow = '0 0 30px rgba(0, 216, 230, 1), 0 0 20px rgba(0, 216, 230, 0.8)';
  });

  backButton.addEventListener('mouseout', () => {
    backButton.style.transform = 'scale(1)';
    backButton.style.boxShadow = '0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4)';
  });
  
  backButton.addEventListener('click', () => {
    // Use transition with callback
    transitionBack(() => {
      console.log('Transition back to main scene');
      
      // Clean up exploration UI
      uiElements.forEach(element => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
      
      // Remove event listeners
      renderer.domElement.removeEventListener('click', onPlanetClick);
      
      // Clean up texture elements
      const textureButton = document.getElementById('texture-edit-button');
      if (textureButton && textureButton.parentNode) {
        textureButton.parentNode.removeChild(textureButton);
      }
      
      const texturePanel = document.getElementById('earth-texture-edit-panel');
      if (texturePanel && texturePanel.parentNode) {
        texturePanel.parentNode.removeChild(texturePanel);
      }
      
      // Show main scene
      showMainSceneUI();
      isExploringPlanet = false;
      exploreControls.dispose();
      
      // Reset to solar system
      resetToSolarSystem();
    });
  });
  
  
  // Append the back button to the document
  document.body.appendChild(backButton);
  uiElements.push(backButton);
  
  // Return all created UI elements for cleanup
  return uiElements;
}

// When exiting the planet explorer and returning to the solar system
function resetToSolarSystem() {
  // Make sure the main scene is visible
  scene.visible = true;
  
  // Re-enable the main scene UI
  showMainSceneUI();
  
  // Reset camera if needed
  camera.position.set(-90, 140, 140);
  camera.lookAt(scene.position);
  
  // Explicitly force a label update
  setTimeout(() => {
    // Reset label visibility
    if (permanentLabels) {
      permanentLabels.forEach(label => {
        if (label.parent && label.parent.visible) {
          label.visible = true;
          if (label.element) {
            label.element.style.opacity = '1';
            label.element.style.visibility = 'visible';
          }
        }
      });
    }
    
    // Force an update of the labels
    forceLabelUpdate();
  }, 100);
}

function openSkyboxView(planet, prevControls, prevScene, prevComposer) {
  cleanupAllLabels();

  // Store the previous scene, controls, and composer for later restoration
  const mainScene = prevScene;
  const mainControls = prevControls;
  const mainComposer = prevComposer;
  const allUIElements = document.querySelectorAll('button:not(.exploration-ui), #earth-texture-edit-panel, [class^="ui-"]:not(.exploration-ui), img:not(.exploration-ui)');
  
  // Store references to the exploration buttons specifically
  const backButton = document.querySelector('.back-to-main-button');
  const resetCameraButton = document.querySelector('.reset-camera-button');
  
  // Store the original visibility states
  if (backButton) backButton.dataset.skyboxHidden = "true";
  if (resetCameraButton) resetCameraButton.dataset.skyboxHidden = "true";
  
  allUIElements.forEach(element => {
    // Store original display state
    element.dataset.originalDisplay = element.style.display;
    element.style.display = 'none';
  });
  
  // Hide exploration buttons but track that we've hidden them
  if (backButton) backButton.style.display = 'none';
  if (resetCameraButton) resetCameraButton.style.display = 'none';
  
  
  // Hide the main scene to prevent overlap
  mainScene.visible = false;
  


  // Create a new scene for the skybox view
  const skyboxScene = new THREE.Scene();

  // Create a new camera for the skybox view
  const skyboxCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
  skyboxCamera.position.set(0, 0, 0);

  // Create new controls for first-person view
  const skyboxControls = new PointerLockControls(skyboxCamera, renderer.domElement);

  // Make sure the renderer's canvas has a lower z-index
  renderer.domElement.style.zIndex = '1';
  
  // Create an instruction overlay that's positioned above the canvas
  const instructionOverlay = document.createElement('div');
  instructionOverlay.style.position = 'absolute';
  instructionOverlay.style.width = '100%';
  instructionOverlay.style.height = '100%';
  instructionOverlay.style.display = 'flex';
  instructionOverlay.style.justifyContent = 'center';
  instructionOverlay.style.alignItems = 'center';
  instructionOverlay.style.zIndex = '2'; // Higher than renderer but lower than buttons
  instructionOverlay.style.pointerEvents = 'none'; // Allow clicks to pass through
  instructionOverlay.style.top = '0';
  instructionOverlay.style.left = '0';
  
  const instructionText = document.createElement('div');
  instructionText.style.color = 'white';
  instructionText.style.fontSize = '28px';
  instructionText.style.fontWeight = 'bold';
  instructionText.style.padding = '20px 40px';
  instructionText.style.borderRadius = '10px';
  instructionText.style.backgroundColor = 'rgba(0,0,0,0.6)';
  instructionText.style.textShadow = '0 0 10px rgba(0, 216, 230, 0.8)';
  instructionText.style.boxShadow = '0 0 30px rgba(0, 216, 230, 0.6)';
  instructionText.style.pointerEvents = 'auto'; // Make text clickable
  instructionText.textContent = 'Click to explore';
  
  instructionOverlay.appendChild(instructionText);
  document.body.appendChild(instructionOverlay);

  // Function to handle the instruction text click
  const handleInstructionClick = () => {
    skyboxControls.lock();
  };

  // Function to handle canvas click
  const handleCanvasClick = () => {
    if (!skyboxControls.isLocked) {
      skyboxControls.lock();
    }
  };

  // Make the entire scene clickable
  instructionText.addEventListener('click', handleInstructionClick);
  
  // Also make the canvas clickable when visible
  renderer.domElement.addEventListener('click', handleCanvasClick);

  skyboxControls.addEventListener('lock', () => {
    instructionText.style.display = 'none';
  });

  skyboxControls.addEventListener('unlock', () => {
    instructionText.style.display = 'block';
  });

  // Load the skybox textures
  const textureLoader = new THREE.TextureLoader();
  const basePath = `/assets/textures/skybox/${planet.name.toLowerCase()}/`;
  const faceNames = ['rt', 'lt', 'up', 'dn', 'ft', 'bk'];
  const materials = [];
  let loadedCount = 0;

  let skyboxMesh; // Store the skybox mesh for later manipulation

  const createSkybox = () => {
    if (loadedCount === 6) {
      const skyboxGeo = new THREE.BoxGeometry(1000, 1000, 1000);
      skyboxMesh = new THREE.Mesh(skyboxGeo, materials); // Store the mesh
      skyboxScene.add(skyboxMesh);
      console.log('Skybox created successfully');
    }
  };

  faceNames.forEach((face, index) => {
    const path = `${basePath}${face}.jpg`;
    textureLoader.load(
      path,
      (texture) => {
        const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
        materials[index] = material;
        loadedCount++;
        createSkybox();
      },
      undefined,
      (error) => {
        console.error(`Error loading ${face}.jpg:`, error);
        loadedCount++;
        createSkybox();
      }
    );
  });
  
  // Create a composer for the skybox
  const skyboxComposer = new EffectComposer(renderer);
  const renderPass = new RenderPass(skyboxScene, skyboxCamera);
  skyboxComposer.addPass(renderPass);

  // Back Button with hover effect
  const returnButton = document.createElement('img');
  returnButton.src = './src/img/back.png';
  returnButton.alt = 'Back';
  returnButton.style.position = 'absolute';
  returnButton.style.top = '20px';
  returnButton.style.left = '20px';
  returnButton.style.zIndex = '1000'; // Much higher z-index than the instruction overlay
  returnButton.style.cursor = 'pointer';
  returnButton.style.width = '100px';
  returnButton.style.height = '100px';
  returnButton.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
  returnButton.style.boxShadow = '0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4)';
  returnButton.style.borderRadius = '50%';
  returnButton.addEventListener('mouseover', () => {
    returnButton.style.transform = 'scale(1.1)';
    returnButton.style.boxShadow = '0 0 30px rgba(0, 216, 230, 1), 0 0 20px rgba(0, 216, 230, 0.8)';
  });
  returnButton.addEventListener('mouseout', () => {
    returnButton.style.transform = 'scale(1)';
    returnButton.style.boxShadow = '0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4)';
  });

  document.body.appendChild(returnButton);

  // Function to clean up and return to the main scene
  const returnToMainScene = () => {
    cleanupAllLabels();

    // Important: First unlock the controls if they're locked
    if (skyboxControls.isLocked) {
      skyboxControls.unlock();
    }
    
    // Dispose of skybox controls properly
    skyboxControls.disconnect();
    
    // Remove event listeners to prevent them from affecting the exploration scene
    instructionText.removeEventListener('click', handleInstructionClick);
    renderer.domElement.removeEventListener('click', handleCanvasClick);
    
    // Restore original z-index of the renderer if needed
    renderer.domElement.style.zIndex = '';
    
    // Hide the skybox mesh
    if (skyboxMesh) {
      skyboxMesh.visible = false;
    }
  
    // Remove the instruction overlay
    document.body.removeChild(instructionOverlay);
  
    // Remove the return button
    document.body.removeChild(returnButton);
  
    // Restore UI elements to their original state
    allUIElements.forEach(element => {
      if (element.dataset.originalDisplay) {
        element.style.display = element.dataset.originalDisplay;
      }
    });
    
    // ADDED: Explicitly restore exploration UI buttons
    if (backButton && backButton.dataset.skyboxHidden) {
      backButton.style.display = 'block';
      delete backButton.dataset.skyboxHidden;
    }
    
    if (resetCameraButton && resetCameraButton.dataset.skyboxHidden) {
      resetCameraButton.style.display = 'block';
      delete resetCameraButton.dataset.skyboxHidden;
    }
    
    // Restore the main scene
    mainScene.visible = true;
  
    // Re-enable the main controls and composer
    if (mainControls) {
      mainControls.enabled = true;
    }
    if (mainComposer) {
      mainComposer.render();
    }
    showExploreSceneUI();
    // Stop the skybox animation loop
    cancelAnimationFrame(animationFrameId);
  };

  

  // Add event listener to the return button
  returnButton.addEventListener('click', () => {
    transitionBack(() => {
      returnToMainScene();
    });
  });
  
  // Animation loop for the skybox view
  let animationFrameId;
  function animateSkyboxView() {
    animationFrameId = requestAnimationFrame(animateSkyboxView);
    skyboxComposer.render();
  }
  animateSkyboxView();

  // Return cleanup function for proper disposal
  return returnToMainScene;
}

document.addEventListener('DOMContentLoaded', () => {
  const buttonContainer = document.getElementById('planet-buttons');
  
  // Create Toggle Button as an Image Button
  const toggleButton = document.createElement('button');
  toggleButton.className = 'toggle-button';
  toggleButton.style.position = 'absolute';
  toggleButton.style.bottom = '350px';
  toggleButton.style.right = '20px';
  toggleButton.style.width = '70px'; // Adjust size as needed
  toggleButton.style.height = '70px';
  toggleButton.style.padding = '0';
  toggleButton.style.border = 'none';
  toggleButton.style.background = 'transparent';
  toggleButton.style.cursor = 'pointer';
  toggleButton.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
  toggleButton.style.boxShadow = '0 0 15px rgba(0, 216, 230, 0.8), 0 0 7px rgba(0, 216, 230, 0.4)';
  toggleButton.style.borderRadius = '50%'; // Circular style

  // Add the image to the button
  const buttonImage = document.createElement('img');
  buttonImage.id = 'search-button';  // Added ID here
  buttonImage.src = 'src/img/search.png'; // Path to the search.png image
  buttonImage.alt = 'Toggle Planets';
  buttonImage.style.width = '100%';
  buttonImage.style.height = '100%';
  buttonImage.style.borderRadius = '50%';
  buttonImage.style.boxShadow = '0 0 10px rgba(0, 216, 230, 0.6)';
  buttonImage.classList.add('exploration-ui');

  // Add hover effect on the button
  toggleButton.addEventListener('mouseover', () => {
    toggleButton.style.transform = 'scale(1.1)';
    toggleButton.style.boxShadow = '0 0 20px rgba(0, 216, 230, 1), 0 0 15px rgba(0, 216, 230, 0.8)';
  });
  toggleButton.addEventListener('mouseout', () => {
    toggleButton.style.transform = 'scale(1)';
    toggleButton.style.boxShadow = '0 0 15px rgba(0, 216, 230, 0.8), 0 0 7px rgba(0, 216, 230, 0.4)';
  });

  // Add click event to toggle the planet buttons
  toggleButton.addEventListener('click', () => {
    clickSound.currentTime = 0; // Rewind to start if clicked multiple times fast
    clickSound.play();          // Play the sound
  
    buttonContainer.style.display = buttonContainer.style.display === 'none' ? 'block' : 'none';
  });

  // Append the image to the button
  toggleButton.appendChild(buttonImage);

  // Append the button to the body
  document.body.appendChild(toggleButton);

  const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const planetColors = {
    mercury: '#87CEEB', venus: '#87CEEB', earth: '#87CEEB',
    mars: '#87CEEB', jupiter: '#87CEEB', saturn: '#87CEEB', uranus: '#87CEEB',
    neptune: '#87CEEB', pluto: '#87CEEB'
  };

  planets.forEach(planetName => {
    const button = document.createElement('button');
    button.textContent = planetName.charAt(0).toUpperCase() + planetName.slice(1);
    button.className = 'planet-button';
    button.style.backgroundColor = planetColors[planetName];
    button.style.margin = '5px';
    button.style.padding = '8px 16px';
    button.style.border = 'none';
    button.style.borderRadius = '20px'; // Pill shape
    button.style.boxShadow = '0 0 8px rgba(0, 216, 230, 0.6)';
    button.style.cursor = 'pointer';
    button.style.transition = 'all 0.3s ease';
    button.style.color = 'white';
    button.style.fontWeight = 'bold';
    button.style.fontSize = '14px';
    button.style.textTransform = 'capitalize';
    button.style.backgroundImage = 'linear-gradient(45deg, #0cf, #09c)';
  
    // Hover effect
    button.addEventListener('mouseover', () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 0 15px rgba(0, 216, 230, 1), 0 0 10px rgba(0, 216, 230, 0.8)';
    });
  
    button.addEventListener('mouseout', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 0 8px rgba(0, 216, 230, 0.6)';
    });
  
    // Click handler
    button.addEventListener('click', function() {
      clickSound2.currentTime = 0; // Rewind to start if clicked multiple times fast
      clickSound2.play();          // Play the sound
    
  
      
      console.log(`Button clicked: ${planetName}`);
      const planet = findPlanetInScene(planetName);
  
      if (planet) {
        console.log(`Planet found: ${planetName}`);
        focusedPlanet = planet;
        orbit.enabled = false;
  
        displayPlanetInfo(planetData[planetName] || {
          name: 'Sun',
          size: '1,391,000 km',
          distance: '0 km (center of the solar system)',
          educationalFact: 'The Sun is a massive ball of plasma at the center of our solar system, providing heat and light to Earth.',
          funFact: 'The Sun accounts for 99.86% of the mass in the solar system!'
        });
  
        createExploreButton(planetName, planet);
  
        gsap.to(camera.position, {
          duration: 2,
          x: planet.position.x + 50,
          y: planet.position.y + 50,
          z: planet.position.z + 50,
          onUpdate: function () {
            camera.lookAt(planet.position);
          }
        });
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

 function updateDateDisplay(earthMesh) {
  const earthPosition = new THREE.Vector3();
  earthMesh.getWorldPosition(earthPosition);
  const currentAngle = Math.atan2(earthPosition.z, earthPosition.x);

  let angleDiff = currentAngle - lastAngle;
  if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
  if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;

  lastAngle = currentAngle;

  // Flip sign to move forward in time
  const daysPassed = (-angleDiff / (2 * Math.PI)) * 365.25;
  simulationDate.setTime(simulationDate.getTime() + (daysPassed * 24 * 60 * 60 * 1000));

  const dateStr = simulationDate.toLocaleString('en-UK', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  let dateDisplay = document.getElementById('date-display');
  if (!dateDisplay) {
    dateDisplay = document.createElement('div');
    dateDisplay.id = 'date-display';
    dateDisplay.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: radial-gradient(circle at center, rgba(20, 20, 30, 0.95), rgba(5, 5, 15, 0.95));
      border: 2px solid rgba(0, 216, 230, 0.4);
      box-shadow: 0 0 20px rgba(0, 216, 230, 0.3);
      border-radius: 16px;
      padding: 16px 24px;
      color: #e0f7fa;
      font-family: 'Orbitron', sans-serif;
      font-size: 1.1em;
      z-index: 1000;
      backdrop-filter: blur(10px);
      width: 21%;
    `;
    document.body.appendChild(dateDisplay);
  }

  dateDisplay.textContent = `${dateStr}`;
}


window.addEventListener('click', (event) => {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);
  
  let clickedPlanet = null;
  for (let i = 0; i < intersects.length; i++) {
    if (intersects[i].object.isPlanet) {
      clickedPlanet = intersects[i].object;
      break;
    }
  }

  if (clickedPlanet) {
    isPlanetClicked = true;
  } else {
    isPlanetClicked = false;
  }
  
  // Important change: Only make labels visible if the showLabels setting is true
  if (settings && settings.showLabels) {
    permanentLabels.forEach((label, planetId) => {
      label.visible = true;
    });
  }
});

// Store original event listeners
const buttonListeners = {};

function hideMainSceneUI() {
  // Hide existing UI elements
  const existingUIElements = document.querySelectorAll('.planet-button, .planet-info-panel');
  existingUIElements.forEach(el => {
    el.style.display = 'none';
  });
  
  // Also hide search and settings buttons
  const searchButton = document.getElementById('search-button');
  if (searchButton) {
    searchButton.parentElement.style.display = 'none'; // Hide the parent container of the button
  }
  
  const settingsButton = document.getElementById('settings-button');
  if (settingsButton) {
    settingsButton.style.display = 'none';
  }

  const scaleButton = document.getElementById('scale-comparison-button');
  if (scaleButton) {
    scaleButton.style.display = 'none';
  }

  const pauseButton = document.getElementById('pauseButton');
  if (pauseButton) {
    pauseButton.style.display = 'none';
  }
  const dateDisplay = document.getElementById('date-display');
  if (dateDisplay) {
    dateDisplay.style.display = 'none';
  }
  // Hide the settings panel
  const panel = document.querySelector('div[style*="position: absolute; bottom: 10px; left: 100px;"]');
  if (panel) {
    panel.style.display = 'none';
  }
  
  const toggleButton = document.getElementById('planet-buttons');
  if (toggleButton) {
    toggleButton.style.display = 'none';
  }

}
function showMainSceneUI() {
  // Show existing UI elements
  const existingUIElements = document.querySelectorAll('.planet-button, .planet-info-panel');
  existingUIElements.forEach(el => {
    el.style.display = 'block';
  });
  
  // Also show search and settings buttons
  const searchButton = document.getElementById('search-button');
  if (searchButton) {
    searchButton.parentElement.style.display = 'block'; // Show the parent container
  }
  
  const settingsButton = document.getElementById('settings-button');
  if (settingsButton) {
    settingsButton.style.display = 'block';
  }

  const pauseButton = document.getElementById('pauseButton');
  if (pauseButton) {
    pauseButton.style.display = 'block';
  }
  const scaleButton = document.getElementById('scale-comparison-button');
  if (scaleButton) {
    scaleButton.style.display = 'block';
  }

  const dateDisplay = document.getElementById('date-display');
  if (dateDisplay) {
    dateDisplay.style.display = 'block';
  }
  const resetButton = document.getElementById('resetButton');
  if (resetButton) resetButton.style.display = 'block';
  
}

function hideExploreSceneUI() {
  // Hide the settings panel
  const lightingPanel = document.getElementById('lightingPanel');
  if (lightingPanel) {
    lightingPanel.style.display = 'none';
  }
}


function showExploreSceneUI() {
  const resetButton = document.getElementById('resetButton');
  if (resetButton) resetButton.style.display = 'block';
  
}

// Solar System Controls UI
function createControlsUI() {
  // Initial settings
  const settings = {
    rotationSpeed: 0.1,
    showOrbits: true,
    showMoons: true,
    showAsteroidBelt: true,
    planetScale: 1,
    showLabels: true,
    followPlanet: "none",
    cameraDistance: 500,
  };

  // For tracking changes
  let previousSettings = {...settings};

  // Create the main container
  const controlsContainer = document.createElement('div');
  controlsContainer.style.cssText = `
    position: fixed;
    bottom: 30%;
    left: 30px;
    z-index: 1000;
    font-family: Orbitron, sans-serif;
  `;
  document.body.appendChild(controlsContainer);

// Create toggle button
const toggleButton = document.createElement('button');
toggleButton.style.cssText = `
  width: 0px;
  height: 0px;
  border-radius: 50%;
  background-color: transparent;
  border: none;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
`; 
// Create the settings button
const settingIcon = document.createElement('img');
settingIcon.id = 'settings-button';  // Added ID here
settingIcon.src = './src/img/setting.png';
settingIcon.alt = 'Settings';
settingIcon.style.position = 'absolute';
settingIcon.style.bottom = '20px';
settingIcon.style.left = '-7px'; // Positioned next to the reset button
settingIcon.style.width = '70px';
settingIcon.style.height = '70px';
settingIcon.style.cursor = 'pointer';
settingIcon.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
settingIcon.style.boxShadow = '0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4)';
settingIcon.style.borderRadius = '50%'; // Circular button style

// Add hover effect
settingIcon.addEventListener('mouseover', () => {
  settingIcon.style.transform = 'scale(1.1)';
  settingIcon.style.boxShadow = '0 0 30px rgba(0, 216, 230, 1), 0 0 20px rgba(0, 216, 230, 0.8)';
});
settingIcon.addEventListener('mouseout', () => {
  settingIcon.style.transform = 'scale(1)';
  settingIcon.style.boxShadow = '0 0 20px rgba(0, 216, 230, 0.8), 0 0 10px rgba(0, 216, 230, 0.4)';
});

// Add click event for future functionality (e.g., opening settings)
settingIcon.addEventListener('click', () => {
  clickSound.currentTime = 0; // Rewind to start if clicked multiple times fast
  clickSound.play();          // Play the sound
  console.log('Settings button clicked!');
  // Add settings menu logic here
});


// Append the image to the button
toggleButton.appendChild(settingIcon);
controlsContainer.appendChild(toggleButton);
  // Create panel container
  const panel = document.createElement('div');
  panel.style.cssText = `
  position: absolute;
  bottom: 0;
  left: 100px;
  margin-top: 100px; /* Gives some space above the screen edge */    width: 220px;
    background-color: rgba(20, 20, 30, 0.95);
    color: white;
    border-radius: 10px;
    padding: 12px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
    display: none;
    backdrop-filter: blur(4px);
  `;
  controlsContainer.appendChild(panel);

  // Panel header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    padding-bottom: 10px;
  `;
  header.innerHTML = `
    <h3 style="margin: 0; font-size: 16px;">Solar System Controls</h3>
    <button id="close-controls" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px;">×</button>
  `;
  panel.appendChild(header);

  // Toggle panel visibility
  let isPanelVisible = false;
  toggleButton.addEventListener('click', () => {
    isPanelVisible = !isPanelVisible;
    panel.style.display = isPanelVisible ? 'block' : 'none';
  });
  
  // Close button event listener
  panel.querySelector('#close-controls').addEventListener('click', () => {
    
    isPanelVisible = false;
    panel.style.display = 'none';
  });

  // Create the controls content
  const content = document.createElement('div');
  content.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 10px;
  `;
  panel.appendChild(content);

  // Helper function to create sliders
  function createSlider(name, min, max, step, value, labelText) {
    const container = document.createElement('div');
    
    const labelContainer = document.createElement('div');
    labelContainer.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    `;
    
    const label = document.createElement('label');
    label.textContent = labelText;
    label.style.fontSize = '14px';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.id = `${name}-value`;
    valueDisplay.textContent = value.toFixed(1);
    valueDisplay.style.fontSize = '14px';
    
    labelContainer.appendChild(label);
    labelContainer.appendChild(valueDisplay);
    
    const slider = document.createElement('input');
    slider.id = `slider-${name}`;
    slider.type = 'range';
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = value;
    slider.style.cssText = `
    width: 100%;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: linear-gradient(to right, #00d8e6, #005fa3);
    outline: none;
    border-radius: 20px;
    cursor: pointer;
    box-shadow: 0 0 5px rgba(0, 216, 230, 0.7);
  `;
    slider.addEventListener('mouseover', () => {
      slider.style.boxShadow = '0 0 8px rgba(0, 216, 230, 1)';
    });
    slider.addEventListener('mouseout', () => {
      slider.style.boxShadow = '0 0 5px rgba(0, 216, 230, 0.7)';
    });
  
    slider.addEventListener('input', () => {
      const newValue = parseFloat(slider.value);
      settings[name] = newValue;
      valueDisplay.textContent = newValue.toFixed(1);
      applySettings();
    });
    
    container.appendChild(labelContainer);
    container.appendChild(slider);
    
    return container;
  }
  function showAllLabels() {
    scene.traverse((object) => {
      if (object instanceof THREE.Sprite) {
        if (object.material.map && object.material.map.image &&
            object.material.map.image instanceof HTMLCanvasElement) {
          object.visible = true;
        }
      }
    });
  
    // Show permanent labels
    permanentLabels.forEach(label => {
      label.visible = true;
    });
  
    if (typeof updateLabelScaling === 'function') {
      updateLabelScaling();
    }
  }
  
  function hideAllLabels() {
    scene.traverse((object) => {
      if (object instanceof THREE.Sprite) {
        if (object.material.map && object.material.map.image &&
            object.material.map.image instanceof HTMLCanvasElement) {
          object.visible = false;
        }
      }
    });
  
    // Hide permanent labels
    permanentLabels.forEach(label => {
      label.visible = false;
    });
  }
    
  // Helper function to create toggle switches
  function createToggle(name, isChecked, labelText) {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const label = document.createElement('label');
    label.textContent = labelText;
    label.style.fontSize = '14px';
    
    const toggleContainer = document.createElement('label');
    toggleContainer.style.cssText = `
      position: relative;
      display: inline-block;
      width: 36px;
      height: 18px;
    `;
      
    const input = document.createElement('input');
    input.id = `toggle-${name}`;
    input.type = 'checkbox';
    input.checked = isChecked;
    input.style.cssText = `
      opacity: 0;
      width: 0;
      height: 0;
    `;
    
    const slider = document.createElement('span');
    slider.style.cssText = `
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: ${isChecked ? '#00d8e6' : '#333'};
      transition: 0.4s;
      border-radius: 34px;
      box-shadow: inset 0 0 5px rgba(0, 216, 230, 0.6);
  `;
  
      
    const sliderButton = document.createElement('span');
    sliderButton.style.cssText = `
      position: absolute;
      height: 14px;
      width: 14px;
      left: ${isChecked ? '18px' : '2px'};
      bottom: 2px;
      background-color: white;
      transition: 0.4s;
      border-radius: 50%;
      box-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
  `;
      
    slider.appendChild(sliderButton);
    
    input.addEventListener('change', () => {
      settings[name] = input.checked;
      slider.style.backgroundColor = input.checked ? '#3366cc' : '#555';
      sliderButton.style.left = input.checked ? '22px' : '2px';
      applySettings();
    });
      
    
    toggleContainer.appendChild(input);
    toggleContainer.appendChild(slider);
    
    container.appendChild(label);
    container.appendChild(toggleContainer);
    
    return container;
  }


  // Add all controls
  content.appendChild(createSlider('rotationSpeed', 0.1, 100, 0.1, settings.rotationSpeed, 'Time Speed'));
  content.appendChild(createSlider('planetScale', 0.5, 1.2, 0.1, settings.planetScale, 'Planet Scale'));
  
  content.appendChild(createToggle('showOrbits', settings.showOrbits, 'Show Orbits'));
  content.appendChild(createToggle('showMoons', settings.showMoons, 'Show Moons'));
  content.appendChild(createToggle('showAsteroidBelt', settings.showAsteroidBelt, 'Show Asteroid Belt'));
  content.appendChild(createToggle('showLabels', settings.showLabels, 'Show Labels'));



  // Reset button
  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset Settings';
  resetButton.style.cssText = `
    background-color: #cc3333;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 10px;
    transition: background-color 0.3s;
  `;

  resetButton.addEventListener('click', () => {
    // Reset to defaults
    settings.rotationSpeed = 0.1;
    settings.showOrbits = true;
    settings.showMoons = true;
    settings.showAsteroidBelt = true;
    settings.planetScale = 1;
    settings.showLabels = true;
    settings.followPlanet = 'none';

    // Update UI to match settings
    updateControlsUI();
    
    // Apply settings to the scene
    applySettings();
  });
  
  content.appendChild(resetButton);

  // Function to update UI based on current settings
  function updateControlsUI() {
    const toggleNames = ['showOrbits', 'showMoons', 'showAsteroidBelt', 'showLabels'];
    toggleNames.forEach(name => {
      const input = document.getElementById(`toggle-${name}`);
      input.checked = settings[name];
  
      // Update visuals manually
      const slider = input.nextSibling;
      const sliderButton = slider.firstChild;
  
      slider.style.backgroundColor = input.checked ? '#3366cc' : '#555';
      sliderButton.style.left = input.checked ? '22px' : '2px';
    });
  
    // Update sliders
    document.getElementById('slider-rotationSpeed').value = settings.rotationSpeed;
    document.getElementById('rotationSpeed-value').textContent = settings.rotationSpeed.toFixed(1);
  
    document.getElementById('slider-planetScale').value = settings.planetScale;
    document.getElementById('planetScale-value').textContent = settings.planetScale.toFixed(1);
  }
  
  // Function to apply settings to the Three.js scene
  function applySettings() {
    // Handle rotation speed
    window.settings = window.settings || {};
    window.settings.rotationSpeed = settings.rotationSpeed;
  
  
    // Handle orbits
    if (settings.showOrbits !== previousSettings.showOrbits) {
      toggleOrbits(settings.showOrbits);
    }
  
    // Handle moons
    if (settings.showMoons !== previousSettings.showMoons) {
      toggleMoons(settings.showMoons);
    }
  
    // Handle asteroid belt
    if (settings.showAsteroidBelt !== previousSettings.showAsteroidBelt) {
      toggleAsteroid(settings.showAsteroidBelt);
    }
  
    // Handle planet scale
    if (settings.planetScale !== previousSettings.planetScale) {
      updatePlanetScale(settings.planetScale);
    }
  
    // Labels visibility - apply regardless of previous state
    // This ensures the setting is respected even when clicking away from panel
    if (settings.showLabels) {
      showAllLabels();
      // Ensure moon labels are hidden if moons are not shown
      if (!settings.showMoons) {
        toggleMoons(false); // This will also hide moon labels
      }
    } else {
      hideAllLabels();
    }
  
    // Save current settings
    previousSettings = {...settings};
  }
  
  
  
    // Close the panel when clicking outside
    document.addEventListener('click', (event) => {
      if (
        isPanelVisible &&
        !panel.contains(event.target) &&
        !toggleButton.contains(event.target)
      ) {
        isPanelVisible = false;
        panel.style.display = 'none';
      }
    });
  
  // Return the settings object and methods for external access
  return {
    settings,
    container: controlsContainer,
    applySettings,
    updateControlsUI
  };

}
window.settings = settings;



function updateGridVisibility(camera) {
  // Calculate vector from camera to grid's center
  const cameraToGrid = new THREE.Vector3().subVectors(grid.position, camera.position);
  cameraToGrid.normalize();

  // The grid's normal is pointing up along the Y-axis
  const gridNormal = new THREE.Vector3(0, -1, 0);

  // Calculate the dot product to determine view angle
  const dot = cameraToGrid.dot(gridNormal);

  // If dot > 0, camera is above the grid, otherwise it's below
  if (dot > 0) {
      grid.material.opacity = 0.3; // Visible when above
  } else {
      grid.material.opacity = 0; // Invisible when below
  }
}

function createEnhancedStarField() {
  // Create a more complex starfield with different star sizes and colors
  const starCount = 10000; // Increased star count
  const particlePositions = new Float32Array(starCount * 3);
  const particleColors = new Float32Array(starCount * 3);
  const particleSizes = new Float32Array(starCount);
  
  const spreadRange = 50000000000; // Wider spread
  const minDistance = 10000; // Further minimum distance
  
  // Create different star colors
  const starColors = [
    new THREE.Color(0xFFFFFF), // White
    new THREE.Color(0xFFD9B3), // Warm white
    new THREE.Color(0xB3E0FF), // Bluish
    new THREE.Color(0xFFB3B3), // Reddish
    new THREE.Color(0xFFFFB3)  // Yellowish
  ];
  
  for (let i = 0; i < starCount; i++) {
    // Logarithmic distribution for more realistic star field
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    
    // Logarithmic radius for better depth perception
    const u = Math.random();
    const r = minDistance * Math.pow(spreadRange / minDistance, u);
    
    // Convert to Cartesian coordinates
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    
    particlePositions[i * 3] = x;
    particlePositions[i * 3 + 1] = y;
    particlePositions[i * 3 + 2] = z;
    
    // Random star color from our palette
    const colorIndex = Math.floor(Math.random() * starColors.length);
    const color = starColors[colorIndex];
    particleColors[i * 3] = color.r;
    particleColors[i * 3 + 1] = color.g;
    particleColors[i * 3 + 2] = color.b;
    
    // Varied star sizes with some rare larger stars
    const rand = Math.random();
    if (rand > 0.995) {
      particleSizes[i] = 15 + Math.random() * 10; // Very large (rare)
    } else if (rand > 0.97) {
      particleSizes[i] = 8 + Math.random() * 7; // Large
    } else {
      particleSizes[i] = 2 + Math.random() * 3; // Normal
    }
  }
  
  // Set up the particle geometry with colors and sizes
  const particles = new THREE.BufferGeometry();
  particles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particles.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
  particles.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
  
  // Create shader material for more realistic stars
  const particleMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0.0 },
      texture: { value: createStarTexture() }
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float time;
      
      void main() {
        vColor = color;
        
        // Subtle twinkling effect
        float scale = 0.95 + 0.05 * sin(time * 0.5 + position.x * 0.01 + position.y * 0.01 + position.z * 0.01);
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * scale * (150.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      uniform sampler2D texture;
      
      void main() {
        vec4 texColor = texture2D(texture, gl_PointCoord);
        gl_FragColor = vec4(vColor, 1.0) * texColor;
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true
  });
  
  const particleSystem = new THREE.Points(particles, particleMaterial);
  
  // Function to update the star field in the animation loop
  function updateStarField(time) {
    particleMaterial.uniforms.time.value = time;
  }
  
  return { system: particleSystem, update: updateStarField };
}

// Create a better star texture with soft edges
function createStarTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  
  // Create radial gradient for softer, more realistic stars
  const gradient = context.createRadialGradient(
    64, 64, 0,
    64, 64, 64
  );
  
  // Smoother gradient with more color stops
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)');
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.2)');
  gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return texture;
}

function updateStarSystemVisibility() {
  const distance = camera.position.distanceTo(scene.position);

  
  
  // Determine which distance range we're in
  let currentDistanceRange = -1;
  if (distance > 25000) currentDistanceRange = 5;
  else if (distance > 20000) currentDistanceRange = 4;
  else if (distance > 15000) currentDistanceRange = 3;
  else if (distance > 10000) currentDistanceRange = 2;
  else if (distance > 5000) currentDistanceRange = 1;
  else currentDistanceRange = 0;
  
  // If we've changed distance ranges, update visibility
  if (currentDistanceRange !== lastDistanceRange) {
    // First hide everything if we went to a higher distance range
    if (currentDistanceRange > lastDistanceRange) {
      stars.forEach(star => {
        // Reset animations when hiding
        star.connection.userData.currentPoint = 0;
        star.connection.userData.animating = false;
        if (star.mesh.visible) {
          star.mesh.visible = false;
          star.connection.visible = false;
        }
      });
    }
    
    
    // Then show appropriate stars for current range
    stars.forEach(star => {
      const shouldBeVisible = (distance > star.visibleAtDistance && 
                               distance < star.visibleAtDistance + 10000);
      
      // If visibility changed, start or stop animation
      if (shouldBeVisible !== star.mesh.visible) {
        if (shouldBeVisible) {
          // Make star visible immediately
          star.mesh.visible = true;
          star.connection.visible = true;
          // Start line animation
          star.connection.userData.animating = true;
          // Reset geometry to just the first point
          const newPoints = [star.connection.userData.points[0]];
          star.connection.geometry.setFromPoints(newPoints);
        } else {
          // Hide star and connection
          star.mesh.visible = false;
          star.connection.visible = false;
          // Reset animation state
          star.connection.userData.currentPoint = 0;
          star.connection.userData.animating = false;
        }
      }
    });
    
    lastDistanceRange = currentDistanceRange;
  }
  
  // Animate connections that are currently visible
  starConnections.forEach(connection => {
    if (connection.visible && connection.userData.animating) {
      // Get current animation progress
      const currentPoint = connection.userData.currentPoint;
      const totalPoints = connection.userData.totalPoints;
      
      // If we haven't finished drawing the line
      if (currentPoint < totalPoints - 1) {
        // Add one more point to the line
        connection.userData.currentPoint++;
        const points = connection.userData.points.slice(0, connection.userData.currentPoint + 1);
        connection.geometry.setFromPoints(points);
        connection.geometry.attributes.position.needsUpdate = true;
      } else {
        // Animation complete
        connection.userData.animating = false;
      }
    }
  });
}
function createGlowTexture() {
  const size = 128; // Adjust the texture size for better resolution
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // White at the center
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.7)'); // Slight fade outwards
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Fully transparent at the edge

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const glowTexture = createGlowTexture();

const starMat = new THREE.SpriteMaterial({
  map: glowTexture,
  color: 0xffffff,
  transparent: true,
  opacity: 1,
  blending: THREE.AdditiveBlending 
});


const starMesh = new THREE.Sprite(starMat);
starMesh.scale.set(500, 500, 1); // Size = brightness impression
starMesh.layers.enable(1); // Bloom layer


function getPlanetRimColor(planetName) {
  const colors = {
    'Mercury': new THREE.Vector3(0.8, 0.7, 0.6),  // Warm beige
    'Venus': new THREE.Vector3(0.9, 0.7, 0.3),    // Golden yellow
    'Earth': new THREE.Vector3(0.4, 0.6, 1.0),    // Blue
    'Mars': new THREE.Vector3(1.0, 0.5, 0.2),     // Reddish orange
    'Jupiter': new THREE.Vector3(0.9, 0.8, 0.6),  // Amber
    'Saturn': new THREE.Vector3(0.9, 0.8, 0.5),   // Pale gold
    'Uranus': new THREE.Vector3(0.5, 0.8, 0.9),   // Cyan blue
    'Neptune': new THREE.Vector3(0.2, 0.4, 0.9),  // Deep blue
    'Pluto': new THREE.Vector3(0.7, 0.7, 0.8),    // Soft lavender
    'Moon': new THREE.Vector3(0.8, 0.8, 0.8),     // Pale white
    'Ganymede': new THREE.Vector3(0.7, 0.7, 0.8), // Gray-blue
    'Callisto': new THREE.Vector3(0.6, 0.6, 0.7), // Dark gray
    'Europa': new THREE.Vector3(0.9, 0.9, 1.0),   // Icy white-blue
    'Io': new THREE.Vector3(1.0, 0.7, 0.3),       // Sulfurous yellow
    'Sun': new THREE.Vector3(1.0, 0.6, 0.2)       // Orange
  };
  return colors[planetName] || new THREE.Vector3(1.0, 1.0, 1.0); // White default
}

// Enhanced atmosphere properties
function getPlanetAtmosphereProperties(planetName) {
  return {
    'Mercury': {
      color: 0xA5A5A5, 
      density: 0.1,
      rayleigh: 0.5,
      turbidity: 5,
      mieCoefficient: 0.001,
      mieDirectionalG: 0.7
    },
    'Venus': {
      color: 0xFFD700, 
      density: 2.0,
      rayleigh: 4.0,
      turbidity: 20,
      mieCoefficient: 0.01,
      mieDirectionalG: 0.95
    },
    'Earth': {
      color: 0x4169E1, 
      density: 1.0,
      rayleigh: 2.0,
      turbidity: 10,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8
    },
    'Mars': {
      color: 0xFF4500, 
      density: 0.6,
      rayleigh: 1.5,
      turbidity: 12,
      mieCoefficient: 0.002,
      mieDirectionalG: 0.75
    },
    'Jupiter': {
      color: 0xfbceb1, 
      density: 0.7,
      rayleigh: 1.8,
      turbidity: 15,
      mieCoefficient: 0.003,
      mieDirectionalG: 0.85
    },
    'Saturn': {
      color: 0xeedfcc, 
      density: 0.5,
      rayleigh: 1.6,
      turbidity: 14,
      mieCoefficient: 0.003,
      mieDirectionalG: 0.82
    },
    'Uranus': {
      color: 0x1b0e2f, 
      density: 0.2,
      rayleigh: 1.2,
      turbidity: 8,
      mieCoefficient: 0.002,
      mieDirectionalG: 0.7
    },
    'Neptune': {
      color: 0x104e8b, 
      density: 0.2,
      rayleigh: 1.3,
      turbidity: 9,
      mieCoefficient: 0.002,
      mieDirectionalG: 0.75
    },
    'Pluto': {
      color: 0xc08081, 
      density: 0.2,
      rayleigh: 0.8,
      turbidity: 5,
      mieCoefficient: 0.001,
      mieDirectionalG: 0.6
    }
  }[planetName] || {
    color: 0xFFFFFF,
    density: 0.5,
    rayleigh: 1.0,
    turbidity: 10,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.8
  };
}

// Enhanced Sun Creation
function createEnhancedSun() {
  const sunGeo = new THREE.SphereGeometry(20, 64, 64);
  const sunMat = new THREE.MeshBasicMaterial({
    map: textureLoader.load(sunTexture),
    emissive: new THREE.Color(0xfdfbd3),
    emissiveIntensity: 2.0,
    transparent: true,
    depthWrite: false,
    logarithmicDepthBuffer: true
  });

  const sun = new THREE.Mesh(sunGeo, sunMat);
  sun.name = 'Sun';
  sun.layers.enable(1); // Add to bloom layer
  
  // Add corona/outer glow
  const coronaGeo = new THREE.SphereGeometry(25, 32, 32);
  const coronaMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      glowColor: { value: new THREE.Color(0xffe0a3) }
    },
    vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    uniform vec3 sunPosition;
    uniform float time;
    
    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        
        // Add subtle waviness based on time
        vec3 pos = position;
        
        // Get world position for light calculations
        vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
        vWorldPosition = worldPosition.xyz;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
    `,
    
    fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    uniform vec3 sunPosition;
    uniform float rayleigh;
    uniform float turbidity;
    uniform float mieCoefficient;
    uniform float mieDirectionalG;
    uniform vec3 up;
    uniform vec3 planetColor;
    uniform float atmosphereDensity;
    uniform float time;
    
    const float PI = 3.14159265358979;
    
    float rayleighPhase(float cosTheta) {
        return (3.0 / (16.0 * PI)) * (1.0 + pow(cosTheta, 2.0));
    }
    
    float hgPhase(float cosTheta, float g) {
        float g2 = pow(g, 2.0);
        return (1.0 / (4.0 * PI)) * ((1.0 - g2) / pow(1.0 - 2.0 * g * cosTheta + g2, 1.5));
    }
    
    void main() {
        // Normalized light direction
        vec3 lightDir = normalize(sunPosition);
        
        // Normalized view direction
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        
        // Angle between view and light
        float cosTheta = dot(viewDir, lightDir);
        
        // Rayleigh and Mie scattering
        float rayleighScatter = rayleighPhase(cosTheta) * rayleigh;
        float mieScatter = hgPhase(cosTheta, mieDirectionalG) * mieCoefficient;
        
        // Edge glow effect (Fresnel)
        float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 4.0) * atmosphereDensity;
        
        // Colors based on properties
        vec3 atmosphereColor = planetColor * (rayleighScatter + mieScatter + fresnel) * 2.0;
        
        // Adjust brightness based on light direction (day/night effect)
        float dayStrength = max(0.1, dot(vNormal, lightDir));
        atmosphereColor *= dayStrength;
        
        // Add subtle pulsing glow
        float pulse = sin(time * 0.5) * 0.05 + 0.95;
        atmosphereColor *= pulse;
        
        // Set alpha based on density and fresnel
        float alpha = fresnel * atmosphereDensity * 1.5;
        alpha *= (0.9 + sin(time) * 0.1);
        alpha = min(alpha, 1.0);
        
        gl_FragColor = vec4(atmosphereColor, alpha);
    }
    `,
    
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });
  
  const corona = new THREE.Mesh(coronaGeo, coronaMat);
  sun.add(corona);
  sun.corona = corona;
  sun.coronaUniforms = coronaMat.uniforms;
  
  return sun;
}

