document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("project-modal");
  const modalContent = document.querySelector(".modal-content");
  const body = document.body;
  const inputs = document.querySelectorAll("input, textarea");

  const projectData = {
    project1: {
      title: "Wind Tunnel Simulation",
      image: "project_files/windtunnelproject_photo.png",
      description: "",
    },
    project2: {
      title: "Project 2",
      image: "images/project2.jpg",
      description: "Description of Project 2.",
    },
    project3: {
      title: "Project 3",
      image: "images/project3.jpg",
      description: "Description of Project 3.",
    },
  };

  //slide out side navigation
  const menuIcon = document.getElementById("menu-icon");
  const sideNav = document.getElementById("side-nav");

  menuIcon.addEventListener("click", () => {
    sideNav.classList.toggle("open");
  });

  // Scroll control
  let disableScroll = false;

  function handleWheel(e) {
    if (disableScroll) {
      e.preventDefault();
    }
  }

  window.addEventListener("wheel", handleWheel, { passive: false });

  function setScrollDisabled(state) {
    disableScroll = state;
  }

  window.openModal = function (projectId) {
    if (projectData[projectId]) {
      document.getElementById("modal-title").textContent =
        projectData[projectId].title;
      document.getElementById("modal-image").src = projectData[projectId].image;
      document.getElementById("modal-description").textContent =
        projectData[projectId].description;

      modal.style.display = "flex";
      body.classList.add("modal-open");

      setScrollDisabled(true); // Disable scroll on open

      inputs.forEach((input) => input.blur());
    }
  };

  function smoothScrollInit() {
    if ("ontouchstart" in document.documentElement) return; // Disable on touch devices

    const wrapper = document.querySelector(".smooth");
    const content = document.getElementById("content");
    let scrollY = 0;
    let currentY = 0;

    // Linear interpolation function
    function lerp(start, end, t) {
      return (1 - t) * start + t * end;
    }

    // Update body height to match content
    function updateBodyHeight() {
      document.body.style.height = content.offsetHeight + "px";
    }

    updateBodyHeight();
    window.addEventListener("resize", updateBodyHeight);

    window.addEventListener(
      "scroll",
      () => {
        scrollY = window.pageYOffset || window.scrollY;
      },
      { passive: true }
    );

    function animate() {
      currentY = lerp(currentY, scrollY, 0.15); // ← Increase this for faster scrolling
      currentY = Math.floor(currentY * 100) / 100;

      wrapper.style.transform = `translate3d(0, -${currentY}px, 0)`;

      requestAnimationFrame(animate);
    }

    animate();
  }

  window.closeModal = function () {
    modal.style.display = "none";
    body.classList.remove("modal-open");
    setScrollDisabled(false); // Enable scroll on close
  };

  modal.addEventListener("click", function (event) {
    if (event.target !== modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    const grid = document.querySelector(".skills-grid");
    const skillBoxes = document.querySelectorAll(".skill-box");
    const boxCount = skillBoxes.length;

    const centerX = grid.offsetWidth / 2;
    const centerY = grid.offsetHeight / 2;

    // Define forces and velocity for boxes
    const forces = Array.from(skillBoxes).map(() => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
    }));

    // Helper function to get a random position within the grid bounds
    function getRandomPosition() {
      const x = Math.random() * (grid.offsetWidth - 150); // Subtract box width to avoid overflow
      const y = Math.random() * (grid.offsetHeight - 150); // Subtract box height to avoid overflow
      return { x, y };
    }

    // Function to check collision between two boxes
    function isColliding(boxA, boxB) {
      const rectA = boxA.getBoundingClientRect();
      const rectB = boxB.getBoundingClientRect();

      return !(
        rectA.right < rectB.left ||
        rectA.left > rectB.right ||
        rectA.bottom < rectB.top ||
        rectA.top > rectB.bottom
      );
    }

    // Place boxes at random positions and avoid initial overlap
    skillBoxes.forEach((box, index) => {
      let position = getRandomPosition();
      // Make sure that no two boxes overlap on initial placement
      let overlap = true;
      while (overlap) {
        overlap = false;
        for (let i = 0; i < index; i++) {
          if (isColliding(box, skillBoxes[i])) {
            overlap = true;
            position = getRandomPosition();
            break;
          }
        }
      }
      box.style.left = `${position.x}px`;
      box.style.top = `${position.y}px`;
    });

    function applyCenterForce() {
      skillBoxes.forEach((box, index) => {
        const boxRect = box.getBoundingClientRect();
        const boxCenterX = boxRect.left + boxRect.width / 2;
        const boxCenterY = boxRect.top + boxRect.height / 2;

        const deltaX = centerX - boxCenterX;
        const deltaY = centerY - boxCenterY;

        const forceX = deltaX * 0.05;
        const forceY = deltaY * 0.05;

        forces[index].vx += forceX;
        forces[index].vy += forceY;

        forces[index].x += forces[index].vx;
        forces[index].y += forces[index].vy;

        box.style.transform = `translate(${forces[index].x}px, ${forces[index].y}px)`;
      });
    }

    function handleHover(boxIndex) {
      skillBoxes.forEach((box, index) => {
        if (index === boxIndex) {
          box.style.transform = "scale(1.2)";
        } else {
          const boxRect = box.getBoundingClientRect();
          const hoveredBoxRect = skillBoxes[boxIndex].getBoundingClientRect();

          const deltaX = boxRect.left - hoveredBoxRect.left;
          const deltaY = boxRect.top - hoveredBoxRect.top;

          forces[index].vx += deltaX * 0.1;
          forces[index].vy += deltaY * 0.1;
        }
      });
    }

    skillBoxes.forEach((box, index) => {
      box.addEventListener("mouseover", function () {
        handleHover(index);
      });
      box.addEventListener("mouseout", function () {
        forces[index].vx = 0;
        forces[index].vy = 0;
        box.style.transform = "scale(1)";
      });
    });

    function animate() {
      applyCenterForce();
      requestAnimationFrame(animate);
    }

    animate();
  });

  smoothScrollInit();
});
