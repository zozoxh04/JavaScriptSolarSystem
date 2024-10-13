import * as THREE from 'three';
import * as dat from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import starsTexture from './src/img/stars.jpg';
import sunTexture from './src/img/sun.jpg';
import mercuryTexture from './src/img/mercury.jpg';
import venusTexture from './src/img/venus.jpg';
import earthTexture from './src/img/earth.jpg';
import marsTexture from './src/img/mars.jpg';
import jupiterTexture from './src/img/jupiter.jpg';
import saturnTexture from './src/img/saturn.jpg';
import saturnRingTexture from './src/img/saturn ring.png';
import uranusTexture from './src/img/uranus.jpg';
import uranusRingTexture from './src/img/uranus ring.png';
import neptuneTexture from './src/img/neptune.jpg';
import plutoTexture from './src/img/pluto.jpg';


// Initialize renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Create scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

// Set background
const cubeTextureLoader = new THREE.CubeTextureLoader();
scene.background = cubeTextureLoader.load([
  starsTexture, starsTexture, starsTexture, 
  starsTexture, starsTexture, starsTexture
]);

// Set up orbit controls
const orbit = new OrbitControls(camera, renderer.domElement);
camera.position.set(-90, 140, 140);
orbit.update();

// Add lights
const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 3, 300);
pointLight.castShadow = true;
scene.add(pointLight);

// Set up GUI
const gui = new dat.GUI();
const settings = { rotationSpeed: 1 };
gui.add(settings, 'rotationSpeed', 0.1, 5).name('Time Speed');

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

  document.getElementById('eduBtn').addEventListener('click', () => {
    document.getElementById('fact').innerText = planet.educationalFact;
  });

  document.getElementById('funBtn').addEventListener('click', () => {
    document.getElementById('fact').innerText = planet.funFact;
  });
  document.getElementById('exitBtn').addEventListener('click', () => {
    infoDiv.style.display = 'none';
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
});

// Create planets function
const textureLoader = new THREE.TextureLoader();
function createPlanet(name, size, texture, position, ring) {
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
  
  scene.add(obj);
  mesh.position.x = position;
  mesh.name = name;
  
  return { mesh, obj };
}

// Create planets
const mercury = createPlanet('Mercury', 3.2, mercuryTexture, 28);
const venus = createPlanet('Venus', 5.8, venusTexture, 44);
const earth = createPlanet('Earth', 6, earthTexture, 62);
const mars = createPlanet('Mars', 4, marsTexture, 78);
const jupiter = createPlanet('Jupiter', 12, jupiterTexture, 100);
const saturn = createPlanet('Saturn', 10, saturnTexture, 138, {
  innerRadius: 10,
  outerRadius: 20,
  texture: saturnRingTexture
});
const uranus = createPlanet('Uranus', 7, uranusTexture, 176, {
  innerRadius: 7,
  outerRadius: 12,
  texture: uranusRingTexture
});
const neptune = createPlanet('Neptune', 7, neptuneTexture, 200);
const pluto = createPlanet('Pluto', 2.8, plutoTexture, 216);

// Create the Sun
const sunGeo = new THREE.SphereGeometry(16, 30, 30);
const sunMat = new THREE.MeshBasicMaterial({ map: textureLoader.load(sunTexture) });
const sun = new THREE.Mesh(sunGeo, sunMat);
sun.name = 'Sun';
scene.add(sun);

function createOrbitRing(radius, color) {
  const ringGeo = new THREE.RingGeometry(radius - 0.1, radius + 0.1, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -0.5 * Math.PI;
  scene.add(ring);  // Add the ring to the scene here
  return ring;
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

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

// Handle window resizing
window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});