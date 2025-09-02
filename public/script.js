// =======================
// DOM Elements
// =======================
const patientForm = document.getElementById('patientForm');
const pregnancyInfo = document.getElementById('pregnancyInfo');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const patientsTableBody = document.querySelector('#patientsTable tbody');
const searchInput = document.getElementById('searchInput');

let patients = []; // will hold patients fetched from server
let currentPatientId = null; // for reminder modal

// =======================
// Event Listeners
// =======================
document.addEventListener('DOMContentLoaded', () => {
    // Load patients if table exists
    if (patientsTableBody) loadPatients();

    // Register form submit
    if (patientForm) patientForm.addEventListener('submit', handleFormSubmit);

    // LMP input change
    const lmpInput = document.getElementById('lastMenstrualPeriod');
    if (lmpInput) lmpInput.addEventListener('change', calculatePregnancyInfo);

    // Search filter in patients.html
    if (searchInput) searchInput.addEventListener('input', filterPatients);
});

// =======================
// Fetch & Render Patients
// =======================
async function loadPatients() {
    try {
        const res = await fetch('http://localhost:3000/api/patients');
        patients = await res.json();

        if (!patients.length) {
            patientsTableBody.innerHTML = '<tr><td colspan="5">No patients registered yet.</td></tr>';
            return;
        }

        renderPatientsTable(patients);
    } catch (err) {
        console.error('Error loading patients:', err);
        patientsTableBody.innerHTML = '<tr><td colspan="5">Error loading patients. Please try again later.</td></tr>';
    }
}

function renderPatientsTable(list) {
    patientsTableBody.innerHTML = list.map(p => {
        const nextReminder = p.reminders?.find(r => !r.sent);
        const nextDate = nextReminder ? new Date(nextReminder.date).toLocaleDateString() : 'N/A';
        const status = nextReminder ? 'Pending' : 'All Sent';
        const statusClass = nextReminder ? 'status-pending' : 'status-success';

        return `
            <tr>
                <td>${p.name}</td>
                <td>${p.phone || 'N/A'}</td>
                <td>${nextDate}</td>
                <td class="${statusClass}">${status}</td>
                <td>
                    <button class="btn btn-success" onclick="openReminderModal('${p.id}')">Send Reminder</button>
                </td>
            </tr>
        `;
    }).join('');
}

// =======================
// Register Patient
// =======================
async function handleFormSubmit(e) {
    e.preventDefault();
    const formData = {
        name: document.getElementById('patientName').value.trim(),
        phone: document.getElementById('phoneNumber').value.trim(),
        lmp: document.getElementById('lastMenstrualPeriod').value,
        healthWorker: document.getElementById('healthWorker').value.trim(),
        facility: document.getElementById('healthFacility').value.trim()
    };

    if (!formData.name || !formData.phone || !formData.lmp || !formData.healthWorker || !formData.facility) {
        showMessage('error', 'Please fill in all required fields.');
        return;
    }

    try {
        const res = await fetch('http://localhost:3000/api/patients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await res.json();
        if (res.ok) {
            showMessage('success', 'Patient registered successfully!');
            patientForm.reset();
            if (pregnancyInfo) pregnancyInfo.style.display = 'none';
            loadPatients();
        } else {
            showMessage('error', data.error || 'Failed to register patient.');
        }
    } catch (err) {
        console.error(err);
        showMessage('error', 'An error occurred. Please try again.');
    }
}

// =======================
// Pregnancy Info
// =======================
function calculatePregnancyInfo() {
    const lmpDate = document.getElementById('lastMenstrualPeriod').value;
    if (!lmpDate) {
        if (pregnancyInfo) pregnancyInfo.style.display = 'none';
        return;
    }

    const details = calculatePregnancyDetails(lmpDate);
    document.getElementById('dueDate').textContent = details.dueDate;
    document.getElementById('currentWeek').textContent = `${details.currentWeek} weeks`;
    document.getElementById('trimester').textContent = details.trimester;
    pregnancyInfo.style.display = 'block';
}

function calculatePregnancyDetails(lmpDate) {
    const lmp = new Date(lmpDate);
    const today = new Date();
    const dueDate = new Date(lmp);
    dueDate.setDate(dueDate.getDate() + 280);

    const daysSinceLMP = Math.floor((today - lmp) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(daysSinceLMP / 7);

    let trimester = '';
    if (currentWeek <= 12) trimester = 'First Trimester';
    else if (currentWeek <= 26) trimester = 'Second Trimester';
    else trimester = 'Third Trimester';

    return { dueDate: dueDate.toDateString(), currentWeek, trimester, daysSinceLMP };
}

// =======================
// Messages
// =======================
function showMessage(type, text) {
    const el = type === 'success' ? successMessage : errorMessage;
    if (!el) return;
    el.textContent = text;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// =======================
// Search / Filter
// =======================
function filterPatients() {
    const term = searchInput.value.toLowerCase();
    const filtered = patients.filter(p => {
        const nextReminder = p.reminders?.find(r => !r.sent);
        const status = nextReminder ? 'pending' : 'all sent';

        return (
            p.name.toLowerCase().includes(term) ||
            (p.phone && p.phone.toLowerCase().includes(term)) ||
            status.includes(term)
        );
    });
    renderPatientsTable(filtered);
}

// =======================
// Reminder Modal (Dashboard)
// =======================
const reminderModal = document.getElementById('reminderModal');
const reminderMessageInput = document.getElementById('reminderMessage');
const sendReminderBtn = document.getElementById('sendReminderBtn');

function openReminderModal(patientId) {
    currentPatientId = patientId;
    if (reminderModal) reminderModal.style.display = 'flex';
    if (reminderMessageInput) reminderMessageInput.value = '';
}

function closeReminderModal() {
    if (reminderModal) reminderModal.style.display = 'none';
    currentPatientId = null;
}

if (sendReminderBtn) {
    sendReminderBtn.addEventListener('click', async () => {
        const message = reminderMessageInput.value.trim() || 'Reminder: Please attend your appointment.';
        if (!currentPatientId) return;

        try {
            const res = await fetch('http://localhost:3000/api/send-reminder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientId: currentPatientId, message, reminderType: 'appointment' })
            });
            const data = await res.json();
            if (res.ok) {
                showMessage('success', 'Reminder sent successfully!');
                loadPatients();
                closeReminderModal();
            } else {
                showMessage('error', data.error || 'Failed to send reminder.');
            }
        } catch (err) {
            console.error(err);
            showMessage('error', 'Error sending reminder.');
        }
    });
}
