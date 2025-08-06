// modal.js

window.addEventListener('resize', adjustModalSize);

function adjustModalSize() {
    const modal = document.getElementById('project-modal');
    const modalImage = document.getElementById('modal-image');

    if (modal.style.display === "block") {
        const maxWidth = window.innerWidth * 0.8; // 80% of viewport width
        const maxHeight = window.innerHeight * 0.8; // 80% of viewport height

        modal.style.width = maxWidth + "px";
        modal.style.height = maxHeight + "px";

        modalImage.style.maxHeight = (maxHeight * 0.5) + "px"; // 50% of modal height
    }
}

// Function to open the modal
function openModal(projectId) {
    const modal = document.getElementById("project-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalImage = document.getElementById("modal-image");
    const modalDescription = document.getElementById("modal-description");
    const modalDownloads = document.getElementById("modal-downloads"); // Container for downloads



    // Define project details
    const projects = {
        project1: {
            title: "Wind Tunnel Simulation",
            image: "project_files/windtunnelproject_photo.png",
            description: "Description of Project 1 goes here.", 
            files: [
                { name: "Wind Tunnel Simulation Code", url: "files/project1.zip" },
                { name: "Report and Documentation", url: "project_files/Physics 261_ Final Project.pdf" }
            ]
            
            
        },
        project2: {
            title: "Project 2",
            image: "images/project2.jpg",
            description: "Description of Project 2 goes here.", 
            files: [
                { name: "Project2 Code", url: "files/project2.zip" },
                { name: "Project2 Docs", url: "files/project2.pdf" }
            ]
        },
        project3: {
            title: "Project 3",
            image: "images/project3.jpg",
            description: "Description of Project 3 goes here.", 
            files: [
                { name: "Project3 Source", url: "files/project3.zip" }
            ]
        }

        
    };

    // Populate modal with project details
    if (projects[projectId]) {
        modalTitle.textContent = projects[projectId].title;
        modalImage.src = projects[projectId].image;
        modalDescription.textContent = projects[projectId].description;

        // Clear previous downloads and add new ones
        modalDownloads.innerHTML = ""; // Reset list
        projects[projectId].files.forEach(file => {
            const link = document.createElement("a");
            link.href = file.url;
            link.textContent = `Download ${file.name}`;
            link.setAttribute("download", ""); // Ensures file downloads instead of opening
            link.classList.add("download-link");
            modalDownloads.appendChild(link);
        });
    }

    modal.style.display = "block";
    document.body.classList.add('modal-open'); // Disable website scroll
    adjustModalSize();
}

// Function to close the modal
function closeModal() {
    document.getElementById('project-modal').style.display = "none";
    document.body.classList.remove('modal-open'); // Re-enable website scroll
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById("project-modal");
    if (event.target === modal) {
        closeModal();
    }
};
window.addEventListener("click", function(event) {
    const modal = document.getElementById("project-modal");
    const modalContent = document.querySelector(".modal-content");

    if (modal.style.display === "block" && !modalContent.contains(event.target)) {
        closeModal();
    }
});