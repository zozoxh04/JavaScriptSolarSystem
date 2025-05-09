// transitions.js - Fixed version that ensures the overlay appears
// This version uses a different approach to make transitions visible

// First, ensure the DOM elements exist and are accessible
function initElementReferences() {
  const transitionOverlay = document.getElementById('transition-overlay');
  const loadingElement = document.getElementById('loading-element');
  const planetIcon = document.getElementById('planet-icon');
  const transitionText = document.getElementById('transition-text');
  const transitionStars = document.getElementById('transition-stars');
  const transitionParticles = document.getElementById('transition-particles');
  
  // Make sure all elements have the right starting styles
  if (transitionOverlay) {
    transitionOverlay.style.position = 'fixed';
    transitionOverlay.style.top = '0';
    transitionOverlay.style.left = '0';
    transitionOverlay.style.width = '100%';
    transitionOverlay.style.height = '100%';
    transitionOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
    transitionOverlay.style.transition = 'background-color 0.5s ease-in-out, opacity 0.5s ease-in-out';
    transitionOverlay.style.display = 'flex';
    transitionOverlay.style.justifyContent = 'center';
    transitionOverlay.style.alignItems = 'center';
    transitionOverlay.style.zIndex = '9999';
    transitionOverlay.style.pointerEvents = 'none';
    transitionOverlay.style.opacity = '0';
  }
  
  return {
    transitionOverlay,
    loadingElement,
    planetIcon,
    transitionText,
    transitionStars,
    transitionParticles
  };
}

// Clean up all labels to prevent them from being visible during transitions
function cleanupAllLabels() {
  // Hide any CSS2D objects by finding all .label elements
  const labels = document.querySelectorAll('.label');
  labels.forEach(label => {
    if (label) {
      label.style.opacity = '0';
      label.style.visibility = 'hidden';
    }
  });
  
  // Reset THREE.js internal variables that track hovered objects
  if (window.INTERSECTED) window.INTERSECTED = null;
  if (window.currentLabel) window.currentLabel = null;
  if (window.currentHighlight && window.currentHighlight.parent) {
    window.currentHighlight.parent.remove(window.currentHighlight);
    window.currentHighlight = null;
  }
  
  // If labelRenderer exists, temporarily hide it
  if (window.labelRenderer && window.labelRenderer.domElement) {
    window.labelRenderer.domElement.style.visibility = 'hidden';
  }
}

// Restore labels after returning to the main scene
function restoreLabelRenderer() {
  // Only do this when we're in the main scene
  if (window.scene && window.scene.visible && !window.isExploringPlanet) {
    // Make sure permanent labels are visible
    if (window.permanentLabels) {
      window.permanentLabels.forEach(label => {
        if (label && label.parent && label.parent.visible) {
          label.visible = true;
          if (label.element) {
            label.element.style.opacity = '1';
            label.element.style.visibility = 'visible';
          }
        }
      });
    }
    
    // Make sure the label renderer is visible
    if (window.labelRenderer && window.labelRenderer.domElement) {
      window.labelRenderer.domElement.style.visibility = 'visible';
    }
    
    // Force a render to ensure labels appear
    if (window.renderer && window.camera && window.scene) {
      window.renderer.render(window.scene, window.camera);
    }
    if (window.labelRenderer && window.camera && window.scene) {
      window.labelRenderer.render(window.scene, window.camera);
    }
  }
}

// Create star field for transitions
function createStarField(container) {
  if (!container) return;
  
  container.innerHTML = '';
  const starCount = 150;
  
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    const size = Math.random() * 3 + 1;
    const opacity = Math.random() * 0.8 + 0.2;
    
    star.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background-color: white;
      border-radius: 50%;
      opacity: ${opacity};
      top: ${Math.random() * 100}%;
      left: ${Math.random() * 100}%;
      box-shadow: 0 0 ${size * 2}px rgba(255, 255, 255, ${opacity});
      animation: twinkle ${Math.random() * 3 + 2}s infinite alternate;
    `;
    
    container.appendChild(star);
  }
}

// Create floating particles for transitions
function createParticles(container, color) {
  if (!container) return;
  
  container.innerHTML = '';
  const particleCount = 30;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    const size = Math.random() * 6 + 2;
    const opacity = Math.random() * 0.6 + 0.4;
    const duration = Math.random() * 15 + 10;
    
    particle.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border-radius: 50%;
      opacity: ${opacity};
      top: ${Math.random() * 100}%;
      left: ${Math.random() * 100}%;
      box-shadow: 0 0 ${size * 3}px ${color};
      animation: float ${duration}s infinite ease-in-out;
      transform: translate(0, 0);
    `;
    
    // Set random animation delay
    particle.style.animationDelay = `${Math.random() * 5}s`;
    
    container.appendChild(particle);
  }
}

// Add required CSS animations for transitions
function addTransitionAnimations() {
  // Check if the animation styles are already added
  if (document.getElementById('transition-animations')) return;
  
  const styleSheet = document.createElement('style');
  styleSheet.id = 'transition-animations';
  styleSheet.textContent = `
    @keyframes twinkle {
      0% { opacity: 0.2; }
      100% { opacity: 1; }
    }
    
    @keyframes float {
      0% { transform: translate(0, 0); }
      25% { transform: translate(50px, -50px); }
      50% { transform: translate(-30px, 60px); }
      75% { transform: translate(40px, 20px); }
      100% { transform: translate(0, 0); }
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    /* Force z-index and visibility for transition overlay */
    #transition-overlay {
      position: fixed !important;
      z-index: 9999 !important;
      pointer-events: all !important;
    }
    
    /* Make sure the loading elements are visible */
    #loading-element {
      z-index: 10000 !important;
    }
    
    /* General animation for planet icon */
    #planet-icon {
      animation: spin 10s linear infinite;
    }
  `;
  document.head.appendChild(styleSheet);
  
  // Also make sure the planet rings have animation
  const planetRings = document.getElementById('planet-rings');
  if (planetRings) {
    planetRings.style.animation = 'spin 10s linear infinite';
  }
}

// Transition types and their custom settings
const transitionTypes = {
  STARTUP_TO_MAIN: {
    duration: 1500,
    text: 'Entering Solar System...',
    color: 'rgba(0, 20, 40, 0.9)',
    particleColor: '#00d8e6'
  },
  MAIN_TO_EXPLORATION: {
    duration: 1200,
    text: 'Exploring Planet...',
    color: 'rgba(0, 30, 60, 0.9)',
    particleColor: '#87CEEB'
  },
  EXPLORATION_TO_SKYBOX: {
    duration: 1000,
    text: 'Entering Atmosphere...',
    color: 'rgba(20, 0, 40, 0.9)',
    particleColor: '#FFA500'
  },
  BACK_TRANSITION: {
    duration: 800,
    text: 'Returning...',
    color: 'rgba(0, 0, 0, 0.85)',
    particleColor: '#FFFFFF'
  }
};

// Initialize the transition system
function initTransitions() {
  // Make sure we have all required elements
  const {
    transitionOverlay,
    loadingElement,
    planetIcon,
    transitionText,
    transitionStars,
    transitionParticles
  } = initElementReferences();
  
  // Add CSS animations
  addTransitionAnimations();
  
  // Create initial star field
  createStarField(transitionStars);
  
  // Make sure transition overlay is initially hidden but ready
  if (transitionOverlay) {
    transitionOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
    transitionOverlay.style.opacity = '0';
    
    // Force browser to recognize initial state
    // This is important for CSS transitions to work correctly
    transitionOverlay.offsetWidth;
  }
  
  console.log('Transition system initialized successfully');
}

// This is a crucial trick to make sure CSS transitions actually work
// We need to force the browser to apply the first set of styles before changing them
function forceReflow(element) {
  // Reading offsetHeight causes the browser to recalculate styles
  if (element) {
    const reflow = element.offsetHeight;
    return reflow; // Return the value to prevent optimization
  }
  return 0;
}

// Perform a transition between scenes
async function performTransition(transitionType, callback) {
  // Get transition settings
  const settings = transitionTypes[transitionType] || transitionTypes.STARTUP_TO_MAIN;
  
  // Get references to DOM elements
  const transitionOverlay = document.getElementById('transition-overlay');
  const loadingElement = document.getElementById('loading-element');
  const planetIcon = document.getElementById('planet-icon');
  const transitionText = document.getElementById('transition-text');
  const transitionStars = document.getElementById('transition-stars');
  const transitionParticles = document.getElementById('transition-particles');
  
  // Make sure we have the overlay
  if (!transitionOverlay) {
    console.error('Transition overlay not found');
    if (callback) callback();
    return;
  }
  
  
  // Update transition text
  if (transitionText) {
    transitionText.textContent = settings.text;
  }
  
  // Create particles with the type's color
  if (transitionParticles) {
    createParticles(transitionParticles, settings.particleColor);
  }
  
  // IMPORTANT FIX: Make sure the overlay is FULLY VISIBLE first
  transitionOverlay.style.display = 'flex';
  transitionOverlay.style.backgroundColor = settings.color;
  transitionOverlay.style.opacity = '1';
  transitionOverlay.style.pointerEvents = 'all';
  transitionOverlay.style.zIndex = '9999';
  
  // Show loading animation immediately
  if (loadingElement) {
    loadingElement.style.opacity = '1';
    loadingElement.style.transform = 'translateY(0)';
  }
  if (planetIcon) {
    planetIcon.style.transform = 'scale(1)';
  }
  
  // Show stars and particles immediately
  if (transitionStars) transitionStars.style.opacity = '1';
  if (transitionParticles) transitionParticles.style.opacity = '1';
  
  // FIXED: Use a promise with a proper resolve to ensure timing works
  console.log(`Starting transition wait: ${settings.duration}ms`);
  
  // Wait for transition duration
  const waitPromise = new Promise(resolve => {
    setTimeout(() => {
      console.log('Transition wait complete');
      resolve();
    }, settings.duration);
  });
  
  await waitPromise;
  
  console.log('About to execute callback');
  
  // Execute callback after waiting
  if (callback && typeof callback === 'function') {
    callback();
  }
  
  console.log('Callback executed, starting transition out');
  
  // CRITICAL FIX: Wait a bit after callback before starting to hide
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Hide loading elements
  if (loadingElement) {
    loadingElement.style.opacity = '0';
    loadingElement.style.transform = 'translateY(20px)';
  }
  if (planetIcon) {
    planetIcon.style.transform = 'scale(0)';
  }
  
  // Hide particles and stars
  if (transitionStars) transitionStars.style.opacity = '0';
  if (transitionParticles) transitionParticles.style.opacity = '0';
  
  // FIXED: Separate timeout for hiding the overlay
  setTimeout(() => {
    // Hide overlay
    if (transitionOverlay) {
      transitionOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
      transitionOverlay.style.opacity = '0';
    }
    
    // Disable pointer events after fade completes
    setTimeout(() => {
      if (transitionOverlay) {
        transitionOverlay.style.pointerEvents = 'none';
        transitionOverlay.style.display = 'none'; // ADDED: Completely hide it
      }
      
      // Restore label renderer
      setTimeout(restoreLabelRenderer, 100);
    }, 500);
  }, 300);
}


// Specific transition functions
function transitionStartupToMain(callback) {
  console.log('Starting transition: STARTUP_TO_MAIN');
  performTransition('STARTUP_TO_MAIN', callback);
}

function transitionMainToExploration(callback) {
  console.log('Starting transition: MAIN_TO_EXPLORATION');
  performTransition('MAIN_TO_EXPLORATION', callback);
}

function transitionExplorationToSkybox(callback) {
  console.log('Starting transition: EXPLORATION_TO_SKYBOX');
  performTransition('EXPLORATION_TO_SKYBOX', callback);
}

function transitionBack(callback) {
  console.log('Starting transition: BACK_TRANSITION');
  performTransition('BACK_TRANSITION', callback);
}

// Export all functions
export {
  initTransitions,
  transitionStartupToMain,
  transitionMainToExploration,
  transitionExplorationToSkybox,
  transitionBack,
  cleanupAllLabels,
  restoreLabelRenderer
};