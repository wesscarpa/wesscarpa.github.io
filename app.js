const loader = new THREE.GLTFLoader(); // Use THREE.GLTFLoader instead of import

// Set up the scene, camera, and renderer

// Earth year = 60 seconds (1 minute). We will scale all other planets' orbital speeds relative to Earth's orbital period.
const earthYearInSeconds = 1; // Earth year = 60 seconds
const timeScaleFactor = 0.00001; // Adjust this factor to slow down the simulation (0.1 = 10x slower)

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const earthAngularSpeed = (2 * Math.PI) / earthYearInSeconds; // 60 seconds for 360° (2π radians)
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("solar-system").appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Increase intensity
scene.add(ambientLight);

const sunPointLight = new THREE.PointLight(0xffffff, 10, 100); // Strong light
sunPointLight.position.set(0, 0, 0); // Sun's position
scene.add(sunPointLight);

// Ensure it stays fixed in the background
let skyboxContainer = document.createElement("div");
skyboxContainer.id = "skybox-container";
document.body.prepend(skyboxContainer);
skyboxContainer.appendChild(renderer.domElement);

const cubeTextureLoader = new THREE.CubeTextureLoader();
scene.background = cubeTextureLoader.load([
  "skybox/right.png",
  "skybox/left.png",
  "skybox/top.png",
  "skybox/bottom.png",
  "skybox/front.png",
  "skybox/back.png",
]);

// Handle Window Resize
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

let radius = 30; // Initial distance from the Sun
let theta = Math.PI / 2; // Vertical angle
let phi = 0; // Horizontal angle
const minRadius = 25; // Minimum zoom-in distance
const maxRadius = 250; // Maximum zoom-out distance

const moveSpeed = 0.05; // Angular speed for keyboard controls
const zoomSpeed = 7; // Speed of zooming with the mouse wheel

// Create the sun (a sphere with a bright color)

// Planets: Size, orbital distance, orbital period, and eccentricity (for elliptical orbits)
const planetData = [
  {
    name: "Sun",
    size: 13,
    distance: 0.01,
    period: 0.01,
    eccentricity: 0.01,
    model_path: "models/sun/scene.gltf",
    angularDivisor: 1 / 27,
    axialtilt: 0,
    inclination: 0,
  },
  {
    name: "Mercury",
    color: 0xb0b0b0,
    size: 1.5,
    distance: 12,
    period: 0.24,
    eccentricity: 0.205,
    model_path: "models/mercury/scene.gltf",
    angularDivisor: 1 / 58.6,
    axialtilt: 0.03,
    inclination: 7.01,
  }, // Mercury
  {
    name: "Venus",
    color: 0xff8c00,
    size: 3.6,
    distance: 18,
    period: 0.615,
    eccentricity: 0.007,
    model_path: "models/venus/scene.gltf",
    angularDivisor: 1 / 243,
    axialtilt: 177.4,
    inclination: 3.39,
  }, // Venus
  {
    name: "Earth",
    color: 0x0000ff,
    size: 4,
    distance: 24,
    period: 1,
    eccentricity: 0.017,
    model_path: "models/earth/scene.gltf",
    angularDivisor: 1,
    axialtilt: 23.44,
    inclination: 0,
  }, // Earth
  {
    name: "Mars",
    color: 0xff0000,
    size: 2.2,
    distance: 30,
    period: 1.88,
    eccentricity: 0.093,
    model_path: "models/mars/scene.gltf",
    angularDivisor: 1 / 1.03,
    axialtilt: 25.19,
    inclination: 1.85,
  }, // Mars
  {
    name: "Jupiter",
    color: 0xffa500,
    size: 11.2,
    distance: 50,
    period: 11.86,
    eccentricity: 0.049,
    model_path: "models/jupiter/scene.gltf",
    angularDivisor: 1 / 0.41,
    axialtilt: 3.13,
    inclination: 1.31,
  }, // Jupiter
  {
    name: "Saturn",
    color: 0xffff00,
    size: 30,
    distance: 70,
    period: 29.46,
    eccentricity: 0.056,
    model_path: "models/saturn/scene.gltf",
    angularDivisor: 1 / 0.45,
    axialtilt: 26.73,
    inclination: 5.51,
  }, // Saturn
  {
    name: "Uranus",
    color: 0x00ffff,
    size: 16,
    distance: 100,
    period: 84.01,
    eccentricity: 0.046,
    model_path: "models/uranus/scene.gltf",
    angularDivisor: 1 / 0.72,
    axialtilt: 97.77,
    inclination: 6.48,
  }, // Uranus
  {
    name: "Neptune",
    color: 0x00008b,
    size: 14,
    distance: 120,
    period: 164.8,
    eccentricity: 0.01,
    model_path: "models/neptune/scene.gltf",
    angularDivisor: 1 / 0.67,
    axialtilt: 28.31,
    inclination: 6.43,
  }, // Neptune
];

/*const planetRotations = {
    "Mercury": 58.6, // Mercury rotates once every 58.6 Earth days
    "Venus": 243, // Venus rotates once every 243 Earth days
    "Earth": 1, // Earth rotates once per Earth day
    "Mars": 1.03, // Mars rotates every 1.03 Earth days
    "Jupiter": 0.41, // Jupiter rotates every 0.41 Earth days
    "Saturn": 0.45, // Saturn rotates every 0.45 Earth days
    "Uranus": 0.72, // Uranus rotates every 0.72 Earth days
    "Neptune": 0.67 // Neptune rotates every 0.67 Earth days
};
*/

// Create planet meshes and store them
const planets = [];
const orbits = [];

// Create the orbit paths and planets
planetData.forEach((data) => {
  loader.load(data.model_path, (gltf) => {
    const planet = gltf.scene;

    // Compute bounding box
    const box = new THREE.Box3().setFromObject(planet);
    const size = box.getSize(new THREE.Vector3()).length();

    // Normalize scale based on desired planet size
    const scaleFactor = (data.size * 2) / size; // Adjust multiplier if needed
    planet.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // Position the planet in orbit
    planet.position.set(data.distance, 0, 0);

    // Apply axial tilt (convert degrees to radians)
    planet.rotation.x = THREE.MathUtils.degToRad(data.axialtilt);

    // Create orbital paths
    const orbitPoints = [];
    const orbitResolution = 1000;

    for (let t = 0; t < 2 * Math.PI; t += (2 * Math.PI) / orbitResolution) {
      const a = data.distance;
      const b = a * (1 - data.eccentricity);

      const x = a * Math.cos(t);
      const z = b * Math.sin(t);

      orbitPoints.push(new THREE.Vector3(x, 0, z));
    }

    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMaterial = new THREE.LineBasicMaterial({
      color: 0xd3d3d3,
      opacity: 0.5,
      transparent: true,
    });
    const orbitLine = new THREE.LineLoop(orbitGeometry, orbitMaterial);

    //scene.add(orbitLine);
    //orbits.push(orbitLine);

    //Apply inclination to the orbit
    const planetGroup = new THREE.Group(); // new group for planet + orbit
    planetGroup.rotation.z = THREE.MathUtils.degToRad(data.inclination || 0); // tilt the orbit plane

    planetGroup.add(planet);
    planetGroup.add(orbitLine);

    // Add to scene
    scene.add(planetGroup);

    // Store reference for animation
    planets.push({
      planet: planet,
      group: planetGroup,
      distance: data.distance,
      orbitalPeriod: data.period,
      eccentricity: data.eccentricity,
      angularDivisor: data.angularDivisor,
      axialtilt: data.axialtilt,
    });
  });
});

// Set camera position for top-down view (side and above the solar system)
camera.position.set(0, 200, 0); // Above and to the side
camera.lookAt(0, 0, 0); // Look at the center of the solar system

// Function to update camera position based on spherical coordinates
function updateCameraPosition() {
  camera.position.x = radius * Math.sin(theta) * Math.cos(phi);
  camera.position.y = radius * Math.cos(theta);
  camera.position.z = radius * Math.sin(theta) * Math.sin(phi);
  camera.lookAt(0, 0, 0); // Look at the center of the scene (the Sun)
}

// Calculate the angular speed (radians per second) for each planet, scaled relative to Earth
function calculateAngularSpeed(period) {
  // Earth's angular speed (full orbit in 60 seconds)
  const earthAngularSpeed = (2 * Math.PI) / earthYearInSeconds; // 60 seconds for 360° (2π radians)

  // Scale the angular speed based on the planet's orbital period
  return (earthAngularSpeed / period) * timeScaleFactor; // Apply time scale factor to slow down the speed
}

function calucluateRotationalSpeed(angularDivisor) {
  const earthsRotationalSpeed = earthAngularSpeed * 365.25;
  return earthsRotationalSpeed * angularDivisor * timeScaleFactor;
}

// Create orbiting motion for the planets (elliptical orbits)
function animate() {
  requestAnimationFrame(animate);

  planets.forEach((planetData) => {
    const planet = planetData.planet;
    const angularSpeed = calculateAngularSpeed(planetData.orbitalPeriod);
    const roationalSpeed = calucluateRotationalSpeed(planetData.angularDivisor);
    const internalAngle = Date.now() * roationalSpeed;
    const angle = Date.now() * angularSpeed;

    // Elliptical orbit
    const a = planetData.distance;
    const b = a * (1 - planetData.eccentricity);

    const x = a * Math.cos(angle);
    const z = b * Math.sin(angle);
    planetData.planet.position.set(x, 0, z);

    //axis rotation
    planet.rotation.y = internalAngle;
  });

  renderer.render(scene, camera);
}

animate();

// Adjust the canvas size when the window is resized
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Handle the fade-out effect when scrolling
const content = document.getElementById("content");
const projects = document.getElementById("projects");
/*
// Keyboard controls for orbiting the camera
window.addEventListener("keydown", (event) => {
    switch (event.key) {
        case "ArrowUp": // Tilt down
            theta = Math.max(0.1, theta - moveSpeed);
            break;
        case "ArrowDown": // Tilt up
            theta = Math.min(Math.PI - 0.1, theta + moveSpeed);
            break;
        case "ArrowLeft": // Rotate left
            phi -= moveSpeed;
            break;
        case "ArrowRight": // Rotate right
            phi += moveSpeed;
            break;
    }
    updateCameraPosition();
});
*/
let hasZoomedOut = false; // Track if the user has zoomed out
const solarSystemContainer = document.getElementById("solar-system");
let isDragging = false;
let allowRotate = true;
let previousMouseX = 0;
let previousMouseY = 0;
const dragSpeed = 0.005; // Adjust sensitivity

// Mouse wheel controls for zooming in and out
window.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();

    const atTop = window.scrollY === 0;
    const scrollSpeed = 0.5; // Adjust this value to slow down scrolling
    const transitionSpeed = 3; // Smooth transition factor

    if (atTop) {
      // Only allow zooming if at the top
      allowRotate = true;
      let newRadius = radius + event.deltaY * 0.01 * zoomSpeed;

      if (newRadius > maxRadius) {
        radius = maxRadius;

        // Gradually ease into scrolling instead of an abrupt jump
        let smoothScroll = setInterval(() => {
          if (window.scrollY < 20) {
            // Small buffer to avoid abrupt movement
            window.scrollBy(0, transitionSpeed);
          } else {
            clearInterval(smoothScroll);
          }
        }, 10);
      } else if (newRadius < minRadius) {
        radius = minRadius;
      } else {
        radius = newRadius;
        updateCameraPosition();
      }

      // Check if the user has zoomed out (radius has decreased)
      if (!hasZoomedOut) {
        // Hide the info text once zoomed out
        document.getElementById("info-text").style.opacity = "0";
        hasZoomedOut = true; // Mark that the user has zoomed out
      }
    } else {
      // Slow down scrolling when outside the simulation
      window.scrollBy(0, event.deltaY * scrollSpeed);
      allowRotate = false;
    }
  },
  { passive: false }
);

// Mouse down event: Start dragging
window.addEventListener("mousedown", (event) => {
  if (allowRotate) {
    isDragging = true;
    previousMouseX = event.clientX;
    previousMouseY = event.clientY;
  }
});

// Mouse move event: Rotate the camera while dragging
window.addEventListener("mousemove", (event) => {
  if (isDragging) {
    let deltaX = -(event.clientX - previousMouseX);
    let deltaY = event.clientY - previousMouseY;

    // Update angles based on movement
    phi -= deltaX * dragSpeed;
    theta -= deltaY * dragSpeed;

    // Constrain theta to avoid flipping
    theta = Math.max(0.1, Math.min(Math.PI - 0.1, theta));

    updateCameraPosition();

    // Update previous positions
    previousMouseX = event.clientX;
    previousMouseY = event.clientY;
  }
});

// Mouse up event: Stop dragging
window.addEventListener("mouseup", () => {
  isDragging = false;
});

// Prevent default behavior (like text selection)
window.addEventListener("mouseleave", () => {
  isDragging = false;
});

// Initialize the camera position
updateCameraPosition();
