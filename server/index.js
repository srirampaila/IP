import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Generators for lists of data
const generateMaintenanceLogs = (count) => {
    const statuses = ['Pending', 'In Progress', 'Completed', 'Urgent'];
    const priorities = ['Low', 'Medium', 'High', 'Urgent'];
    return Array.from({ length: count }, (_, i) => ({
        id: `REQ-${1000 + i}`,
        room: `Room-${Math.floor(Math.random() * 50) + 100}`,
        description: `Issue description ${i + 1}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        date: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString().split('T')[0]
    }));
};

const generateEnergyLogs = (count) => {
    return Array.from({ length: count }, (_, i) => ({
        id: `LOG-${5000 + i}`,
        room: `Room-${Math.floor(Math.random() * 50) + 100}`,
        usage: Math.floor(Math.random() * 500) + 50,
        unit: 'kWh',
        date: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString().split('T')[0]
    }));
};

const generateRoomStatus = (count) => {
    const statuses = ['Available', 'Occupied', 'Maintenance', 'Cleaning'];
    return Array.from({ length: count }, (_, i) => ({
        roomNumber: `Room-${100 + i}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        type: i % 3 === 0 ? 'Suite' : (i % 2 === 0 ? 'Double' : 'Single'),
        nextCleaning: new Date(Date.now() + Math.floor(Math.random() * 100000000)).toISOString().split('T')[0]
    }));
};

// Initialize data
let maintenanceLogs = generateMaintenanceLogs(20);
let energyLogs = generateEnergyLogs(20);
let roomStatus = generateRoomStatus(20);

app.get('/api/updates', (req, res) => {
    // Simulate some random updates to the data
    if (Math.random() > 0.7) {
        const idx = Math.floor(Math.random() * maintenanceLogs.length);
        maintenanceLogs[idx].status = ['Pending', 'In Progress', 'Completed'][Math.floor(Math.random() * 3)];
    }

    const data = {
        timestamp: new Date().toISOString(),
        maintenanceLogs,
        energyLogs,
        roomStatus,
        systemStatus: 'Operational'
    };
    res.json(data);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
