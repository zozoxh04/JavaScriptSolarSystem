# Solar System Simulation

## Prerequisites

### Before you begin, ensure you have the following installed on your system:
- Node.js (v14.0 or higher)
- npm (v6.0 or higher) or yarn
- A modern web browser (Chrome, Firefox, Safari, or Edge)
To check if you have Node.js and npm installed, run:

```
node --version
npm --version
```

## Installation
1. Clone the repository (or download and extract the ZIP file):

```
git clone https://github.com/yourusername/solar-system-3d.git
cd solar-system-3d
```
2. Install dependencies:
```
npm install
```
Or if you're using yarn:
```
yarn install
```

This will install all necessary packages including:
- Three.js
- Vite
- dat.gui
- GSAP (GreenSock Animation Platform)
- And other required dependencies

 ## Running the Project
 ### Development Mode
 To run the project locally with hot-reload:
 ```
npm run dev
```
Or with yarn:
```
yarn dev
```

This will start the Vite development server. Open your browser and navigate to:
```
http://localhost:5173
```
(Note: The port number may vary. Check your terminal output for the exact URL)

### Building for Production
To build the project for production:
```
npm run build
```
This creates an optimised build in the `dist` folder.


## Technologies Used
- **Three.js** (r128) - 3D graphics library
- **Vite** - Build tool and development server
- **dat.GUI** - Interactive control panel
- **GSAP** - Animation library for smooth camera transitions
- **WebGL* - 3D rendering API
- **JavaScript** (ES6+) - Core programming language
- **HTML5 & CSS3** - Structure and styling

## Controls
### Mouse Controls
- **Left Click + Drag:** Rotate camera around the solar system
- **Mouse Wheel:** Zoom in/out
- **Double-Click:** Focus on a specific planet

### Interface Controls
- **Start Exploration:** Begin the simulation
- **Reset View:** Return camera to default postion
- **Pause/Play:** Toggle animation
- **Control Panel** (Right side):
   - Time Speed slider
   - Show/Hide Orbits
   - Show/Hide Moons
   - Show/Hide Asteroid Belt
   - Planet Scale adjustment
   - Show/Hide Grid

### Planet Information
- Double-click any planet to view:
  - Size and distance from Sun
  - Educational facts
  - Fun facts
  - Exit button to close panel
 
## Troubleshooting 
### Common Issues 
**Issues:** Application won't start
```
# Solution: Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```
**Issues:** Textures not loading
- Ensure all image files are in the correct `src/img/` directories
- Check console for 404 errors
- Verify file names match exactly (case-sensitive)

**Issues:** Poor performance
- Reduce planet scale in control panel
- Disable asteroid belt visibility
- Close other browser tabs
- Update graphics drivers
- Try a different browser

**Issue:** Port already in use
```
# Vite will automatically try the next available port
# Or specify a different port in vite.config.js
```
**Issue:** Module not found errors
```
# Make sure all dependencies are installed
npm install
```

### Browser Compatibility
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ❌ Internet Explorer (Not supported)

## Contributing 
Contributions are welcome! Please feel free to submit a Pull Request.
1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Acknowledgements 
- Planet textures from [Solar System Scope](https://www.solarsystemscope.com/)
- Solar System Scope
- Three.js community for excellent documentation
- NASA for planetary data and inspiration

## Contact
Zahra Hashem - zahrasayedalihashim@gmail.com

Project Links: 
- https://github.com/zozoxh04/JavaScriptSolarSystem
- https://zozoxh04.github.io/
-----
Made with ❤️ and JavaScript







