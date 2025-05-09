

let focusedPlanet = null;
// Variables to track dragging
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragThreshold = 5; // Minimum movement to consider it a drag
let INTERSECTED;
let isExploringPlanet = false;
let isPaused = false;

// Initialize renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Create scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300000);
const canvas = document.querySelector('canvas');


// Define maximum and minimum zoom limits
const zoomSpeed = 3; 



// Set background
const cubeTextureLoader = new THREE.CubeTextureLoader();
scene.background = cubeTextureLoader.load([
  starsTexture4, starsTexture4, starsTexture4, 
  starsTexture4, starsTexture4, starsTexture4
]);



// Set up orbit controls with zoom limits
const orbit = new OrbitControls(camera, renderer.domElement);
camera.position.set(-90, 140, 140);
orbit.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
orbit.dampingFactor = 0.25;
orbit.enableZoom = true; // Allow zooming
orbit.minDistance = 70; // Minimum zoom distance
orbit.maxDistance = 120000; // Maximum zoom distance
orbit.update();


// Add lights
const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffff99, 3, 2000);
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

};
gui.add(settings, 'rotationSpeed', 0.1, 5).name('Time Speed');
gui.add(settings, 'showOrbits').name('Show Orbits').onChange(toggleOrbits);
gui.add(settings, 'showMoons').name('Show Moons').onChange(toggleMoons);
gui.add(settings, 'showAsteroidBelt').name('Show Asteroid Belt').onChange(toggleAsteroid);
gui.add(settings, 'planetScale', 0.5, 2).name('Planet Scale').onChange(updatePlanetScale);




// Set up raycaster and mouse
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

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
  });
}


// Create a plane geometry and material with the texture
const geometry = new THREE.PlaneGeometry(100000, 100000);
const material = new THREE.MeshBasicMaterial({ map: myTexture, transparent: true, opacity: 0 });
const plane = new THREE.Mesh(geometry, material);

// Add the plane to the scene
scene.add(plane);

// Update the plane's position to raise it higher
plane.position.set(0, 500, 0); // Adjust the y-value to raise the plane

// Rotate the plane 60º around the x-axis
plane.rotation.x = THREE.MathUtils.degToRad(-30); // Convert degrees to radians

// Make the plane unclickable
plane.raycast = () => {};

// Load texture for the back view
const myTextureBack = textureLoader.load('./src/img/milkywayback.jpg');

// Create a plane geometry and material with the back texture
const geometryBack = new THREE.PlaneGeometry(100000, 100000);
const materialBack = new THREE.MeshBasicMaterial({ map: myTextureBack, transparent: true, opacity: 1 }); // Set opacity to 1
const planeBack = new THREE.Mesh(geometryBack, materialBack);

// Add the back plane to the scene
scene.add(planeBack);

// Update the back plane's position to be the same as the front
planeBack.position.set(0, 500, 0); // Slightly adjust the position to avoid z-fighting


// Make the back plane unclickable
planeBack.raycast = () => {};


// Animation function
function animate() {
  if (scene.visible) {
    orbit.update();
    if (!isPaused) {
      const timeSpeed = settings.rotationSpeed;

      // Rotate planets
      sun.rotateY(0.004 * timeSpeed);
      mercury.mesh.rotateY(0.004 * timeSpeed);
      mercury.obj.rotateY(0.04 * timeSpeed);
      venus.mesh.rotateY(0.002 * timeSpeed);
      venus.obj.rotateY(0.015 * timeSpeed);
      earth.mesh.rotateY(0.02 * timeSpeed); 
      earth.obj.rotateY(0.01 * timeSpeed); 

      // Rotate Moon around Earth
      earth.obj.children.forEach(child => { 
        if (child.type === 'Object3D' && child.children[0].name === 'Moon') { 
          child.rotation.y += 0.01 * timeSpeed; // Adjust speed as needed 
        } 
      });
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
        focusOnPlanet(focusedPlanet); // Call the helper function
      }

      // Check camera distance 
      const distance = camera.position.distanceTo(scene.position);
      if (distance > 10000) {
        plane.visible = true; 
        planeBack.visible = true; // Make the back plane visible

        // Fade in the planes
        if (plane.material.opacity < 1) {
          plane.material.opacity += 0.01; // Adjust the speed of the fade-in as needed
          planeBack.material.opacity += 0.1; // Synchronize the fade-in for the back plane
        }
      } else if (distance <= 10000) {
        // Fade out the planes
        if (plane.material.opacity > 0) {
          plane.material.opacity -= 0.01; // Adjust the speed of the fade-out as needed
          planeBack.material.opacity -= 0.5; // Synchronize the fade-out for the back plane
        } else {
          plane.visible = false; 
          planeBack.visible = false; // Hide the back plane
        }
      }
      updateGridOpacity();
      updateLabelScales();

      // Render the scene
      renderer.render(scene, camera);
    }
  }
}



// Ensure the animate loop is set
renderer.setAnimationLoop(animate);



// Handle clicks on planets
function handlePlanetClick(event) {
  // Prevent the default behavior
  event.preventDefault();

  // Get mouse position
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // Calculate objects intersecting the picking ray and filter out scale markers and grids
  const intersects = raycaster.intersectObjects(scene.children, true).filter(intersection => {
    // Check if the object or its parent is not part of scaleMarkers, grid, secondaryGrid, or the plane
    let obj = intersection.object;
    while (obj) {
      if (obj === scaleMarkers || obj === grid || obj === secondaryGrid || obj === plane) return false;
      obj = obj.parent;
    }
    return true;
  });

  if (intersects.length > 0) {
    // Get the first intersected object
    const object = intersects[0].object;

    // Ignore the asteroid belt objects here
    if (object === asteroidBelt || object === smallerAsteroidBelt) {
      return; // Don't do anything if it's the asteroid belt
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

canvas.addEventListener('click', handlePlanetClick);


function checkHover() {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    if (INTERSECTED != intersects[0].object) {
      if (INTERSECTED) INTERSECTED.material = INTERSECTED.currentMaterial;
      INTERSECTED = intersects[0].object;
      INTERSECTED.currentMaterial = INTERSECTED.material;
      INTERSECTED.material = highlightedMaterial;
      overlay.innerHTML = INTERSECTED.name;
      currentPlanet = INTERSECTED;
    }
  } else {
    if (INTERSECTED) INTERSECTED.material = INTERSECTED.currentMaterial;
    INTERSECTED = null;
    overlay.innerHTML = '';
    currentPlanet = null;
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

  function createTextureEditPanel(planet, surfaceMesh) {
    // Only create this panel for Earth
    if (planet.name !== 'Earth') return null;

    // Create a container for the texture edit panel
    const editPanel = document.createElement('div');
    editPanel.id = 'earth-texture-edit-panel';
    editPanel.style.cssText = `
      position: fixed;
      left: 20px;
      top: 50%;
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

    // Add panel to document
    document.body.appendChild(editPanel);

    return editPanel;
  }

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

    // Create texture edit panel
    const textureEditPanel = createTextureEditPanel(planet, surfaceMesh);

    // Add Edit button to toggle texture panel
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.style.cssText = `
      position: fixed;
      left: 20px;
      top: 500px;
      z-index: 1001;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
    `;

    editButton.addEventListener('click', () => {
      if (textureEditPanel) {
        textureEditPanel.style.display = 
          textureEditPanel.style.display === 'none' ? 'block' : 'none';
      }
    });

    document.body.appendChild(editButton);

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
    <button id="lightingButton">Lighting</button>
  `;

  // Lighting control panel
  const lightingPanel = document.createElement('div');
  lightingPanel.id = 'lightingPanel';
  lightingPanel.style.cssText = `
    position: fixed;
    left: 20px;
    top: 200px;
    background-color: rgba(0, 0, 0, 0.7);
    border-radius: 10px;
    padding: 15px;
    color: white;
    z-index: 1000;
    display: none;
  `;
  lightingPanel.innerHTML = `
    <h3>Lighting Controls</h3>
    <p>Click on the planet to direct sunlight</p>
    <div>
      <label>Sun Intensity: </label>
      <input type="range" id="sunIntensity" min="0" max="2" step="0.1" value="1">
    </div>
    <div>
      <label>Ambient Light: </label>
      <input type="range" id="ambientIntensity" min="0" max="1" step="0.1" value="0.25">
    </div>
  `;

  document.body.appendChild(lightingPanel);

  // Lighting button toggle
  const lightingButton = panel.querySelector('#lightingButton');
  lightingButton.addEventListener('click', () => {
    lightingPanel.style.display = 
      lightingPanel.style.display === 'none' ? 'block' : 'none';
  });

  // Sun intensity slider
  const sunIntensitySlider = lightingPanel.querySelector('#sunIntensity');
  sunIntensitySlider.addEventListener('input', (e) => {
    light.intensity = parseFloat(e.target.value);
    sunMesh.material.emissiveIntensity = parseFloat(e.target.value) * 2;
  });

  // Ambient light intensity slider
  const ambientIntensitySlider = lightingPanel.querySelector('#ambientIntensity');
  ambientIntensitySlider.addEventListener('input', (e) => {
    ambientLight.intensity = parseFloat(e.target.value);
  });

  // Click-to-light feature
  function onPlanetClick(event) {
    // Raycaster to determine click location on planet
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(surfaceMesh);

    if (intersects.length > 0) {
      // Get the intersection point
      const point = intersects[0].point;
      
      // Move and orient sun towards clicked point
      const sunPosition = point.clone().normalize().multiplyScalar(200);
      light.position.copy(sunPosition);
      sunMesh.position.copy(sunPosition);

      // Update atmosphere shader uniforms for lighting
      atmosphereMesh.material.uniforms.sunPosition.value = sunPosition.normalize();
    }
  }

  // Add click event listener to renderer
  renderer.domElement.addEventListener('click', onPlanetClick);

  panel.querySelector('#viewSkybox').addEventListener('click', () => {
    openSkyboxView(planet, exploreControls, planetScene, composer);
  });

  panel.querySelector('#returnToSolarSystem').addEventListener('click', () => {
    isExploringPlanet = false;
    exploreControls.dispose();
    
    // Remove event listeners
    renderer.domElement.removeEventListener('click', onPlanetClick);
    
    resetToSolarSystem();
    document.body.removeChild(panel);
    document.body.removeChild(lightingPanel);
  });

  document.body.appendChild(panel);
}
