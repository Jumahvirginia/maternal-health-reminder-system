const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Data file path
const dataPath = path.join(__dirname, 'data', 'patients.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Initialize patients file if it doesn't exist
if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify([]));
}

// Helper function to read patients data
function readPatientsData() {
    try {
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading patients data:', error);
        return [];
    }
}

// Helper function to write patients data
function writePatientsData(patients) {
    try {
        fs.writeFileSync(dataPath, JSON.stringify(patients, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing patients data:', error);
        return false;
    }
}

// Routes

// Get all patients
app.get('/api/patients', (req, res) => {
    const patients = readPatientsData();
    res.json(patients);
});

// Add new patient
app.post('/api/patients', (req, res) => {
    const { name, phone, lmp, healthWorker, facility } = req.body;
    
    // Validation
    if (!name || !phone || !lmp || !healthWorker || !facility) {
        return res.status(400).json({ 
            error: 'All fields are required' 
        });
    }
    
    const patients = readPatientsData();
    
    // Create new patient object
    const newPatient = {
        id: Date.now().toString(),
        name,
        phone,
        lmp,
        healthWorker,
        facility,
        registeredDate: new Date().toISOString(),
        reminders: calculateReminderSchedule(lmp)
    };
    
    patients.push(newPatient);
    
    if (writePatientsData(patients)) {
        // In a real app, this is where you'd schedule SMS reminders
        console.log(`New patient registered: ${name}`);
        console.log(`Reminders scheduled:`, newPatient.reminders);
        
        res.status(201).json({
            message: 'Patient registered successfully',
            patient: newPatient
        });
    } else {
        res.status(500).json({ 
            error: 'Failed to save patient data' 
        });
    }
});

// Get patient by ID
app.get('/api/patients/:id', (req, res) => {
    const patients = readPatientsData();
    const patient = patients.find(p => p.id === req.params.id);
    
    if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(patient);
});

// Update patient
app.put('/api/patients/:id', (req, res) => {
    const patients = readPatientsData();
    const patientIndex = patients.findIndex(p => p.id === req.params.id);
    
    if (patientIndex === -1) {
        return res.status(404).json({ error: 'Patient not found' });
    }
    
    const updatedPatient = {
        ...patients[patientIndex],
        ...req.body,
        updatedDate: new Date().toISOString()
    };
    
    patients[patientIndex] = updatedPatient;
    
    if (writePatientsData(patients)) {
        res.json({
            message: 'Patient updated successfully',
            patient: updatedPatient
        });
    } else {
        res.status(500).json({ error: 'Failed to update patient' });
    }
});

// Delete patient
app.delete('/api/patients/:id', (req, res) => {
    const patients = readPatientsData();
    const filteredPatients = patients.filter(p => p.id !== req.params.id);
    
    if (patients.length === filteredPatients.length) {
        return res.status(404).json({ error: 'Patient not found' });
    }
    
    if (writePatientsData(filteredPatients)) {
        res.json({ message: 'Patient deleted successfully' });
    } else {
        res.status(500).json({ error: 'Failed to delete patient' });
    }
});

// Send reminder (placeholder for SMS integration)
app.post('/api/send-reminder', (req, res) => {
    const { patientId, message, reminderType } = req.body;
    
    const patients = readPatientsData();
    const patient = patients.find(p => p.id === patientId);
    
    if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
    }
    
    // In a real implementation, you would integrate with SMS API here
    // For now, we'll just log it
    console.log(`SMS Reminder for ${patient.name} (${patient.phone}):`, message);
    
    // Update patient record with sent reminder
    const patientIndex = patients.findIndex(p => p.id === patientId);
    if (!patients[patientIndex].sentReminders) {
        patients[patientIndex].sentReminders = [];
    }
    
    patients[patientIndex].sentReminders.push({
        type: reminderType,
        message,
        sentDate: new Date().toISOString()
    });
    
    writePatientsData(patients);
    
    res.json({
        message: 'Reminder sent successfully',
        status: 'sent'
    });
});

// Calculate reminder schedule based on LMP
function calculateReminderSchedule(lmpDate) {
    const lmp = new Date(lmpDate);
    const reminders = [];
    
    const appointments = [
        { week: 12, message: "Time for your first prenatal visit! Please visit your health facility." },
        { week: 16, message: "Second prenatal visit due. Don't forget your tetanus vaccination!" },
        { week: 20, message: "Ultrasound scan recommended. Book your appointment today." },
        { week: 24, message: "Third prenatal visit is due. Monitor your baby's growth." },
        { week: 28, message: "Important prenatal checkup needed. Stay healthy!" },
        { week: 32, message: "Getting closer! Time for another prenatal visit." },
        { week: 36, message: "Final prenatal visit before delivery. Prepare for childbirth." }
    ];
    
    appointments.forEach(appointment => {
        const reminderDate = new Date(lmp);
        reminderDate.setDate(reminderDate.getDate() + (appointment.week * 7));
        
        reminders.push({
            week: appointment.week,
            date: reminderDate.toISOString(),
            message: appointment.message,
            sent: false
        });
    });
    
    return reminders;
}

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Maternal Health Reminder System is running',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Maternal Health Reminder System is ready!`);
});