const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;

const container = document.getElementById("skills-container");
const canvas = document.getElementById("skills-canvas");

const width = container.clientWidth;
const height = container.clientHeight;

// Set canvas dimensions to match the container size
canvas.width = width;
canvas.height = height;

const engine = Engine.create();
engine.world.gravity.y = 0;
engine.world.gravity.x = 0;

// Create a Matter.js render instance inside the container
const render = Render.create({
  element: container, // Now inside the #skills-container
  canvas: canvas, // Use the already defined canvas
  engine: engine,
  options: {
    width,
    height,
    wireframes: false,
    background: "transparent"
  }
});

Render.run(render);
Runner.run(Runner.create(), engine);

// Define skill labels

// const skills = [
//   { name: "JavaScript", iconClass: "fab fa-js", level: 3 },
//   { name: "C++", iconClass: "fab fa-cuttlefish", level: 2 },
//   { name: "Java", iconClass: "fab fa-java", level: 5 },
//   { name: "MATLAB", iconClass: "fab fa-matlab", level: 2 },
//   { name: "Arduino", iconClass: "fab fa-arduino", level: 4 },
//   { name: "PCB Design", iconClass: "fas fa-microchip", level: 3 },
//   { name: "Soli-dWorks", iconClass: "fas fa-cubes", level: 3 },
//   { name: "Computer Simulations", iconClass: "fas fa-simulation", level: 4 },
//   { name: "GD&T", iconClass: "fas fa-ruler-combined", level: 2 },
//   { name: "Machining", iconClass: "fas fa-tools", level: 2 },
//   { name: "3D Printing", iconClass: "fas fa-print", level: 2 },
//   { name: "Electronics", iconClass: "fas fa-bolt", level: 4 },
//   { name: "Python", iconClass: "fab fa-python", level: 4 },
//   { name: "HTML", iconClass: "fab fa-html5", level: 3 },
//   { name: "CSS", iconClass: "fab fa-css3-alt", level: 3 },
//   { name: "Git", iconClass: "fab fa-git-alt", level: 2 },
//   { name: "Data Analysis", iconClass: "fas fa-chart-line", level: 4 },
//   // Add more as needed
// ];

const skills = [
  "JavaScript", "Python", "HTML", "CSS", "PCB Design",
  "C++", "Java", "MATLAB", "Arduino", "Git", "SolidWorks", 
  "Computer Simulations", "GD&T", "Machining", "3D Printing",
    "Electronics", "Data Analysis", "Physics"
];

function getRandomColor() {
    const hue = Math.floor(Math.random() * 360);  // Random hue (0 to 360 degrees)
    const saturation = 100; // Full saturation for bright colors
    const lightness = Math.floor(Math.random() * 30) + 50; // Lightness between 50% and 80%
  
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;  // Random bright color
  }

// Create balls with skill labels
const balls = skills.map((skill) => {
  const radius = 60;
  const ball = Bodies.circle(
    Math.random() * width,
    Math.random() * height,
    radius,
    {
      restitution: 0.9,
      friction: 0.05,
      label: skill,
      render: {
        fillStyle: getRandomColor(),
        strokeStyle: "#000",
        lineWidth: 1
      }
    }
  );

  // Add scale properties
  ball.currentScale = 1;
  ball.targetScale = 1;
  return ball;
});

Composite.add(engine.world, balls);

// Draw skill text manually with newlines at each space
Events.on(render, "afterRender", () => {
    const ctx = render.context;
    ctx.font = "bold 20px Times, sans-serif";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
  
    balls.forEach(ball => {
      const words = ball.label.split(" "); // Split the label by spaces
      const lineHeight = 25; // Adjust line height for better spacing between words
  
      // Draw each word on a new line
      words.forEach((word, index) => {
        ctx.fillText(word, ball.position.x, ball.position.y + (index * lineHeight));
      });
    });
  });

// Add boundary walls
const wallThickness = 200;
Composite.add(engine.world, [
  Bodies.rectangle(width / 2, -wallThickness / 2, width, wallThickness, { isStatic: true }),
  Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, { isStatic: true }),
  Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, { isStatic: true }),
  Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true })
]);

// Gravity center
let centerX = width / 2;
let centerY = height / 2;
const gravityStrength = 0.007;

Events.on(engine, "beforeUpdate", () => {
  // Apply gravity toward center
  balls.forEach(ball => {
    const dx = centerX - ball.position.x;
    const dy = centerY - ball.position.y;
    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const force = {
      x: (dx / distance) * gravityStrength,
      y: (dy / distance) * gravityStrength
    };
    Body.applyForce(ball, ball.position, force);
  });

  // Smoothly animate scale
  balls.forEach(ball => {
    const scaleSpeed = 0.1;
    const current = ball.currentScale;
    const target = ball.targetScale;

    if (Math.abs(target - current) > 0.001) {
      const newScale = current + (target - current) * scaleSpeed;
      const delta = newScale / current;
      Body.scale(ball, delta, delta);
      ball.currentScale = newScale;
    }
  });
});

// Hover detection to trigger scale animation
document.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect(); // Get canvas bounds
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Translate mouse position to canvas coordinates
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;

    let hoveredBall = null;

    balls.forEach(ball => {
        const dx = ball.position.x - mouseX;
        const dy = ball.position.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 60 * ball.currentScale) {
            hoveredBall = ball;
        }
    });

  balls.forEach(ball => {
    ball.targetScale = (ball === hoveredBall) ? 1.5 : 1;
});

window.addEventListener("resize", () => {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
  
    canvas.width = newWidth;
    canvas.height = newHeight;
  
    render.canvas.width = newWidth;
    render.canvas.height = newHeight;
    render.options.width = newWidth;
    render.options.height = newHeight;
  
    // Recalculate center of gravity
    centerX = newWidth / 2;
    centerY = newHeight / 2;
  
    // Reposition the walls
    Composite.remove(engine.world, engine.world.bodies.filter(body => body.isStatic));
    const wallThickness = 200;
    Composite.add(engine.world, [
      Bodies.rectangle(newWidth / 2, -wallThickness / 2, newWidth, wallThickness, { isStatic: true }),
      Bodies.rectangle(newWidth / 2, newHeight + wallThickness / 2, newWidth, wallThickness, { isStatic: true }),
      Bodies.rectangle(-wallThickness / 2, newHeight / 2, wallThickness, newHeight, { isStatic: true }),
      Bodies.rectangle(newWidth + wallThickness / 2, newHeight / 2, wallThickness, newHeight, { isStatic: true })
    ]);
  });
  

});
