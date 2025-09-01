// Global variables
let patients = JSON.parse(localStorage.getItem('patients')) || [];

// DOM Elements
const registerTab = document.getElementById('registerTab');
const dashboardTab = document.getElementById('dashboardTab');
const registerSection = document.getElementById('registerSection');
const dashboardSection = document.getElementById('dashboardSection');
const patientForm = document.getElementById('patientForm');
const pregnancyInfo = document.getElementById('pregnancyInfo');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Tab switching
    registerTab.addEventListener('click', () => switchTab('register'));
    dashboardTab.addEventListener('click', () => switchTab('dashboard'));
    
    // Form submission
    patientForm.addEventListener('submit', handleFormSubmit);
    
    // Date input change
    document.getElementById('lastMenstrualPeriod').addEventListener('change', calculatePregnancyInfo);
    
    // Load existing patients
    loadPatients();
});

// Tab switching functionality
function switchTab(tab) {
    if (tab === 'register') {
        registerTab.classList.add('active');
        dashboardTab.classList.remove('active');
        registerSection.classList.add('active');
        dashboardSection.classList.remove('active');
    } else {
        dashboardTab.classList.add('active');
        registerTab.classList.remove('active');
        dashboardSection.classList.add('active');
        registerSection.classList.remove('active');
        loadPatients();
    }
}

// Form submission handler
function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('patientName').value,
        phone: document.getElementById('phoneNumber').value,
        lmp: document.getElementById('lastMenstrualPeriod').value,
        healthWorker: document.getElementById('healthWorker').value,
        facility: document.getElementById('healthFacility').value,
        registeredDate: new Date().toISOString(),
        id: Date.now().toString()
    };
    
    // Validate form
    if (!formData.name || !formData.phone || !formData.lmp || !formData.healthWorker || !formData.facility) {
        showMessage('error', 'Please fill in all required fields.');
        return;
    }
    
    // Calculate pregnancy details
    const pregnancyDetails = calculatePregnancyDetails(formData.lmp);
    formData.pregnancyDetails = pregnancyDetails;
    
    // Add patient to array
    patients.push(formData);
    
    // Save to localStorage
    localStorage.setItem('patients', JSON.stringify(patients));
    
    // Show success message
    showMessage('success', 'Patient registered successfully! Reminders have been scheduled.');
    
    // Reset form
    patientForm.reset();
    pregnancyInfo.style.display = 'none';
    
    // Schedule reminders (in real app, this would call the backend)
    scheduleReminders(formData);
}

// Calculate pregnancy information
function calculatePregnancyInfo() {
    const lmpDate = document.getElementById('lastMenstrualPeriod').value;
    if (!lmpDate) {
        pregnancyInfo.style.display = 'none';
        return;
    }
    
    const details = calculatePregnancyDetails(lmpDate);
    
    document.getElementById('dueDate').textContent = details.dueDate;
    document.getElementById('currentWeek').textContent = `${details.currentWeek} weeks`;
    document.getElementById('trimester').textContent = details.trimester;
    
    pregnancyInfo.style.display = 'block';
}

// Calculate pregnancy details
function calculatePregnancyDetails(lmpDate) {
    const lmp = new Date(lmpDate);
    const today = new Date();
    
    // Calculate due date (280 days from LMP)
    const dueDate = new Date(lmp);
    dueDate.setDate(dueDate.getDate() + 280);
    
    // Calculate current week
    const daysSinceLMP = Math.floor((today - lmp) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(daysSinceLMP / 7);
    
    // Determine trimester
    let trimester;
    if (currentWeek <= 12) {
        trimester = 'First Trimester';
    } else if (currentWeek <= 26) {
        trimester = 'Second Trimester';
    } else {
        trimester = 'Third Trimester';
    }
    
    return {
        dueDate: dueDate.toDateString(),
        currentWeek: currentWeek,
        trimester: trimester,
        daysSinceLMP: daysSinceLMP
    };
}

// Schedule reminders (this would connect to SMS API in real implementation)
function scheduleReminders(patient) {
    const reminders = [
        { week: 12, message: "Time for your first prenatal visit! Please visit your health facility." },
        { week: 16, message: "Second prenatal visit due. Don't forget your tetanus vaccination!" },
        { week: 20, message: "Ultrasound scan recommended. Book your appointment today." },
        { week: 24, message: "Third prenatal visit is due. Monitor your baby's growth." },
        { week: 28, message: "Important prenatal checkup needed. Stay healthy!" },
        { week: 32, message: "Getting closer! Time for another prenatal visit." },
        { week: 36, message: "Final prenatal visit before delivery. Prepare for childbirth." }
    ];
    
    console.log(`Reminders scheduled for ${patient.name}:`, reminders);
    // In real implementation, this would call your backend API to schedule SMS reminders
}

// Load patients into dashboard
function loadPatients() {
    const container = document.getElementById('patientsContainer');
    
    if (patients.length === 0) {
        container.innerHTML = '<p>No patients registered yet.</p>';
        return;
    }
    
    const patientsHTML = patients.map(patient => {
        const currentDetails = calculatePregnancyDetails(patient.lmp);
        const status = currentDetails.currentWeek < 40 ? 'Active' : 'Delivered';
        const statusClass = status === 'Active' ? 'status-active' : 'status-completed';
        
        return `
            <div class="patient-card">
                <div class="patient-name">${patient.name}</div>
                <div class="patient-info">
                    <div><strong>Phone:</strong> ${patient.phone}</div>
                    <div><strong>Week:</strong> ${currentDetails.currentWeek} weeks</div>
                    <div><strong>Due Date:</strong> ${currentDetails.dueDate}</div>
                    <div><strong>Health Worker:</strong> ${patient.healthWorker}</div>
                    <div><strong>Facility:</strong> ${patient.facility}</div>
                    <div><strong>Trimester:</strong> ${currentDetails.trimester}</div>
                </div>
                <span class="patient-status ${statusClass}">${status}</span>
            </div>
        `;
    }).join('');
    
    container.innerHTML = patientsHTML;
}

// Show messages
function showMessage(type, text) {
    const messageElement = type === 'success' ? successMessage : errorMessage;
    messageElement.textContent = text;
    messageElement.style.display = 'block';
    
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 5000);
}

// Utility function to format phone numbers
function formatPhoneNumber(phone) {
    // Basic phone number formatting for East African numbers
    let formatted = phone.replace(/\D/g, ''); // Remove non-digits
    
    if (formatted.startsWith('0')) {
        formatted = '254' + formatted.slice(1); // Convert Kenya format
    }
    
    return '+' + formatted;
}