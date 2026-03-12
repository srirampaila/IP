import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccountPath = new URL('./firebaseServiceAccountKey.json', import.meta.url);
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const generateMaintenanceLogs = (count) => {
    const statuses = ['Pending', 'In Progress', 'Completed', 'Urgent'];
    const priorities = ['Low', 'Medium', 'High', 'Urgent'];
    return Array.from({ length: count }, (_, i) => ({
        room: `Room-${Math.floor(Math.random() * 50) + 100}`,
        description: `Issue description ${i + 1}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        date: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString().split('T')[0],
        receivedAt: new Date().toISOString(),
        isNew: false
    }));
};

const generateEnergyLogs = (count) => {
    return Array.from({ length: count }, (_, i) => ({
        room: `Room-${Math.floor(Math.random() * 50) + 100}`,
        usage: Math.floor(Math.random() * 500) + 50,
        unit: 'kWh',
        date: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString().split('T')[0],
        receivedAt: new Date().toISOString(),
        isNew: false
    }));
};

const generateRoomStatus = (count) => {
    const statuses = ['Available', 'Occupied', 'Maintenance', 'Cleaning'];
    return Array.from({ length: count }, (_, i) => ({
        roomNumber: `Room-${100 + i}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        type: i % 3 === 0 ? 'Suite' : (i % 2 === 0 ? 'Double' : 'Single'),
        nextCleaning: new Date(Date.now() + Math.floor(Math.random() * 100000000)).toISOString().split('T')[0],
        receivedAt: new Date().toISOString(),
        isNew: false
    }));
};

async function seed() {
    console.log('Seeding data to Firestore...');
    const mLogs = generateMaintenanceLogs(10);
    for (const log of mLogs) await db.collection('maintenanceLogs').add(log);

    const eLogs = generateEnergyLogs(10);
    for (const log of eLogs) await db.collection('energyLogs').add(log);

    const rStatus = generateRoomStatus(10);
    for (const status of rStatus) await db.collection('roomStatus').add(status);

    console.log('Seeding complete! You can safely delete this script once confirmed.');
    process.exit(0);
}

seed();
