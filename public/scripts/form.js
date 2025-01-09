let formData = {}; // Object to store form data dynamically

function storeStepData() {
    const inputs = formSteps[currentStep].querySelectorAll('input');
    inputs.forEach(input => {
        const name = input.name;
        const value = input.value.trim();
        formData[name] = value; // Save the value (empty or not)
    });
}


// Retrieve the data for a specific input (useful for pre-population if needed)
function populateInputData() {
    const inputs = formSteps[currentStep].querySelectorAll('input');
    inputs.forEach(input => {
        const name = input.name;
        if (formData[name]) {
            input.value = formData[name]; // Populate saved data
        }
    });
}

// Global vars
let currentStep = 0; // Tracks the current step
let urlIsValid = false; // Tracks if the URL is valid
let debounceTimeout = null; // Timer for debounce
let isDuplicateName = false; // Tracks if the name is a duplicate

const formSteps = document.querySelectorAll('.form-step');

// Show the current step
function showStep(step) {
    formSteps.forEach((stepElement, index) => {
        stepElement.classList.toggle('active', index === step);
    });
}

// Go to the next step
function nextStep() {
    storeStepData(); // Save current step data before moving

    // Validation logic for each step
    if (currentStep === 0) {
        // Step 1: URL validation
        const urlInput = document.getElementById('url');
        if (!urlIsValid) {
            urlInput.focus();
            return;
        }
    } else if (currentStep === 1) {
        // Step 2: Name validation
        const nameInput = document.getElementById('clientName');
        if (isDuplicateName) {
            nameInput.focus();
            return;
        }
    }

    // Proceed to the next step if the current step is valid
    if (validateStep()) {
        currentStep++;
        if (currentStep >= formSteps.length) {
            currentStep = formSteps.length - 1; // Ensure we don’t go past the last step
        }
        showStep(currentStep);
        populateInputData(); // Populate inputs with saved data for the next step
    }
}

// Go to the previous step
function prevStep() {
    storeStepData(); // Save current step data before moving back

    currentStep--;
    if (currentStep < 0) {
        currentStep = 0; // Ensure we don’t go before the first step
    }
    showStep(currentStep);
    populateInputData(); // Populate inputs with saved data for the previous step
}

// Simple validation function
function validateStep() {
    const inputs = formSteps[currentStep].querySelectorAll('input');
    let valid = true;
    inputs.forEach(input => {
        if (!input.checkValidity()) {
            valid = false;
            input.classList.add('invalid');
        } else {
            input.classList.remove('invalid');
        }
    });
    return valid;
}

// Initialize the first step
showStep(currentStep);


document.getElementById('url').addEventListener('input', function () {
    clearTimeout(debounceTimeout); // Clear any existing debounce timeout
    const url = this.value.toLowerCase();

    const urlMessage = document.getElementById('urlMessage');
    const nextButton = document.querySelector('.nextBtn');

    urlMessage.textContent = "يرجى الانتظار للتحقق...";
    urlMessage.style.color = "blue";
    nextButton.style.backgroundColor = "grey";

    if (url.length >= 1) {
        urlIsValid = false; // Reset validity while waiting for check
        debounceTimeout = setTimeout(() => {
            checkUrlAvailability(url);
        }, 5000); // Set debounce to 5 seconds
    } else {
        urlIsValid = false; // Reset validity for empty input
        urlMessage.textContent = "";
        nextButton.style.backgroundColor = "grey";

    }
});

function checkUrlAvailability(url) {
    const urlMessage = document.getElementById('urlMessage');
    const nextButton = document.querySelector('.nextBtn'); // Ensure nextButton is defined here

    fetch(`/check-url/${url}`)
        .then(response => response.json())
        .then(data => {
            const urlMessage = document.getElementById('urlMessage');
            if (data.valid) {
                urlMessage.innerHTML = `الرابط متاح! رابط المشاركة سيكون: <a href="${data.personalizedUrl}" target="_blank">${data.personalizedUrl}</a>`;
                urlMessage.style.color = "green";
                urlIsValid = true; 
                nextButton.style.backgroundColor = "#007bff";
            } else if (data.message) {
                // Display the specific error message from the backend
                urlMessage.textContent = data.message;
                urlMessage.style.color = "red";
                urlIsValid = false; 
                nextButton.style.backgroundColor = "grey";

            } else {
                urlMessage.textContent = "حدث خطأ أثناء التحقق.";
                urlMessage.style.color = "red";
                urlIsValid = false; 
                nextButton.style.backgroundColor = "grey";

            }
        })
        .catch(() => {
            const urlMessage = document.getElementById('urlMessage');
            urlMessage.textContent = "حدث خطأ أثناء التحقق.";
            urlMessage.style.color = "red";
            urlIsValid = false; 
            nextButton.style.backgroundColor = "grey";

        });
}




// Real-time validation for duplicate name
document.getElementById('clientName').addEventListener('input', checkDuplicateName);

function checkDuplicateName() {

    const nameInput = document.getElementById('clientName').value;
    const statusSpan = document.getElementById('name-status');
    const nextButton = document.querySelector('.nextBtnName'); // Make sure to target the correct button

    // Set the button to grey initially
    nextButton.style.setProperty('background-color', 'grey', 'important');

    if (nameInput.length > 0) {
        fetch('/api/check-duplicate-name', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: nameInput }),
        })
            .then(response => response.json())
            .then(data => {
                isDuplicateName = data.isDuplicate; 
                if (isDuplicateName) {
                    statusSpan.innerHTML = "❌ الاسم غير متوفر، يرجى اختيار اسم آخر";
                    statusSpan.style.color = "red";
                    nextButton.style.setProperty('background-color', 'grey', 'important'); // Keep it grey for duplicates
                } else {
                    statusSpan.innerHTML = "✔️ متوفر";
                    statusSpan.style.color = "green";
                    nextButton.style.setProperty('background-color', '#007bff', 'important'); // Set to blue for valid input
                }
            })
            .catch(error => {
                console.error('Error checking name:', error);
                statusSpan.innerHTML = "Error checking name.";
                statusSpan.style.color = "red";
                nextButton.style.setProperty('background-color', 'grey', 'important'); // Keep it grey on error
            });
    } else {
        statusSpan.innerHTML = ""; 
        isDuplicateName = true; // Assume invalid if the field is empty
        nextButton.style.setProperty('background-color', 'grey', 'important');
    }
}






// Reset form on page unload
window.addEventListener("beforeunload", function () {
    document.getElementById("adminForm").reset();
});

// Update URL preview
function updatePreview() {
    const input = document.getElementById('url').value;
    const preview = document.getElementById('url-preview');

    const sanitizedInput = input.replace(/\s+/g, '');
    preview.textContent = `https/www.com/${sanitizedInput}`;
}

// Form submission validation
function validateFormSubmission(event) {
    if (isDuplicateName) {
        event.preventDefault(); 
        document.getElementById('clientName').focus(); 
        alert("الاسم غير متوفر، يرجى اختيار اسم آخر");
    }
}

let socialMediaIndex = document.querySelectorAll(".social-media-item").length || 0;




// Function to remove a Social Media row
function removeSocialMedia(index) {
    const row = document.getElementById(`socialMediaItem${index}`);
    if (row) {
        row.remove();
    }
}

// Add a new project input block
function addProject() {
    const projectsContainer = document.getElementById('projectsContainer');
    const projectCount = projectsContainer.children.length;
    const projectItem = `
        <div class="project-item">
            <label for="projectTitle">عنوان المشروع</label>
            <input type="text" name="projects[${projectCount}][title]" placeholder="أدخل عنوان المشروع" required>
            
            <label for="projectDescription">وصف المشروع</label>
            <textarea name="projects[${projectCount}][description]" placeholder="أدخل وصف المشروع" required></textarea>
            
            <label for="projectImage">صورة المشروع</label>
            <input type="file" name="projects[${projectCount}][image]" accept="image/*" required>
            
            <label for="projectLink">رابط المشروع</label>
            <input type="url" name="projects[${projectCount}][link]" placeholder="أدخل رابط المشروع" required>
        </div>`;
    projectsContainer.insertAdjacentHTML('beforeend', projectItem);
}

function addSkill() {
    const skillsContainer = document.getElementById('skillsContainer');
    const skillCount = skillsContainer.children.length;
    const skillItem = `
        <div class="skill-item">
            <label for="skill">المهارة</label>
            <input type="text" name="skills[]" placeholder="أدخل المهارة" required>
            <button type="button" class="remove-button" onclick="removeElement(this)">حذف</button>
        </div>`;
    skillsContainer.insertAdjacentHTML('beforeend', skillItem);
}


function removeElement(button) {
    const parentDiv = button.parentElement;
    parentDiv.remove();
}

function addEducation() {
    const container = document.getElementById('educationContainer');
    const count = container.querySelectorAll('.education-item').length;
    const div = document.createElement('div');
    div.classList.add('education-item');
    div.innerHTML = `
        <input type="text" name="education[${count}][institution]" placeholder="اسم المؤسسة" required>
        <input type="text" name="education[${count}][degree]" placeholder="الدرجة العلمية" required>
    `;
    container.appendChild(div);
}

function addSocialMedia() {
    const container = document.getElementById('socialMediaContainer');
    const count = container.querySelectorAll('div').length;
    const div = document.createElement('div');
    div.innerHTML = `
        <select name="socialMedia[${count}][name]" required>
            <option value="">اختر الوسيلة الاجتماعية</option>
            <option value="Gmail">Gmail</option>
            <option value="linkedin">linkedin</option>
            <option value="WhatsApp">WhatsApp</option>
        </select>
        <input type="text" name="socialMedia[${count}][url]" placeholder="رابط الوسيلة الاجتماعية" required>
    `;
    container.appendChild(div);
}



