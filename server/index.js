import express from 'express';
import cors from 'cors';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';

// --- Initialize Firebase Setup ---
const serviceAccountPath = new URL('./firebaseServiceAccountKey.json', import.meta.url);
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- Centralized Error Formatter ---
const sendError = (res, statusCode, message, details = null) => {
    const errorResponse = { error: true, message };
    if (details) errorResponse.details = details;
    return res.status(statusCode).json(errorResponse);
};

// --- Authentication Middleware ---
const verifyToken = async (req, res, next) => {
    // For demo purposes, we will bypass this if a specific header is sent, 
    // or you can strictly enforce it by removing the bypass.
    if (req.headers['x-demo-bypass'] === 'true') {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendError(res, 401, 'Unauthorized: Missing or invalid Authorization header');
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Error verifying Firebase token:', error);
        return sendError(res, 403, 'Forbidden: Invalid token');
    }
};

// --- GET /api/updates : returns all data + server timestamp ---
app.get('/api/updates', async (req, res) => {
    try {
        const maintenanceDocs = await db.collection('maintenanceLogs').orderBy('receivedAt', 'desc').get();
        const maintenanceLogs = maintenanceDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const energyDocs = await db.collection('energyLogs').orderBy('receivedAt', 'desc').get();
        const energyLogs = energyDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const roomDocs = await db.collection('roomStatus').orderBy('receivedAt', 'desc').get();
        const roomStatus = roomDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const visitorDocs = await db.collection('visitorLogs').orderBy('entryTime', 'desc').get();
        const visitorLogs = visitorDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const responseData = {
            serverTime: new Date().toISOString(),
            systemStatus: 'Operational',
            maintenanceLogs,
            energyLogs,
            roomStatus,
            visitorLogs
        };

        // Clear 'isNew' flag after reading it
        const batch = db.batch();
        let needsUpdate = false;

        maintenanceDocs.docs.forEach(doc => {
            if (doc.data().isNew) {
                batch.update(doc.ref, { isNew: false });
                needsUpdate = true;
            }
        });
        energyDocs.docs.forEach(doc => {
            if (doc.data().isNew) {
                batch.update(doc.ref, { isNew: false });
                needsUpdate = true;
            }
        });
        roomDocs.docs.forEach(doc => {
            if (doc.data().isNew) {
                batch.update(doc.ref, { isNew: false });
                needsUpdate = true;
            }
        });
        visitorDocs.docs.forEach(doc => {
            if (doc.data().isNew) {
                batch.update(doc.ref, { isNew: false });
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            await batch.commit();
        }

        res.json(responseData);
    } catch (e) {
        console.error('Error fetching data:', e);
        return sendError(res, 500, 'Failed to fetch updates', e.message);
    }
});

// --- POST /api/maintenance : add a new maintenance request ---
// Protected route: uses verifyToken middleware
app.post('/api/maintenance', verifyToken, async (req, res) => {
    const { roomId, description, priority } = req.body;

    // Stricter validation
    if (!roomId || typeof roomId !== 'string') {
        return sendError(res, 400, 'Invalid or missing roomId');
    }
    if (!description || typeof description !== 'string') {
        return sendError(res, 400, 'Invalid or missing description');
    }
    if (!priority || !['Low', 'Medium', 'High', 'Urgent'].includes(priority)) {
        return sendError(res, 400, 'Invalid priority. Must be Low, Medium, High, or Urgent');
    }
    const newLog = {
        room: roomId,
        description,
        priority,
        status: 'Pending',
        date: new Date().toISOString().split('T')[0],
        receivedAt: new Date().toISOString(),
        isNew: true
    };
    try {
        const docRef = await db.collection('maintenanceLogs').add(newLog);
        res.status(201).json({ success: true, record: { id: docRef.id, ...newLog }, serverTime: newLog.receivedAt });
    } catch (error) {
        console.error('Error adding maintenance log:', error);
        return sendError(res, 500, 'Failed to add maintenance log', error.message);
    }
});

// --- PUT /api/maintenance/:id : update an existing maintenance request ---
app.put('/api/maintenance/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
        return sendError(res, 400, 'Maintenance ID is required');
    }

    try {
        const docRef = db.collection('maintenanceLogs').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return sendError(res, 404, 'Maintenance log not found');
        }

        await docRef.update(updateData);
        res.status(200).json({ success: true, message: 'Maintenance log updated successfully.' });
    } catch (error) {
        console.error('Error updating maintenance log:', error);
        return sendError(res, 500, 'Failed to update maintenance log', error.message);
    }
});

// --- DELETE /api/maintenance/:id : delete a maintenance request ---
app.delete('/api/maintenance/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return sendError(res, 400, 'Maintenance ID is required');
    }

    try {
        const docRef = db.collection('maintenanceLogs').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return sendError(res, 404, 'Maintenance log not found');
        }

        await docRef.delete();
        res.status(200).json({ success: true, message: 'Maintenance log deleted successfully.' });
    } catch (error) {
        console.error('Error deleting maintenance log:', error);
        return sendError(res, 500, 'Failed to delete maintenance log', error.message);
    }
});

// --- POST /api/energy : add a new energy usage log ---
app.post('/api/energy', verifyToken, async (req, res) => {
    const { roomId, usageValue, date } = req.body;

    if (!roomId || typeof roomId !== 'string') {
        return sendError(res, 400, 'Invalid or missing roomId');
    }
    if (usageValue === undefined || isNaN(parseFloat(usageValue))) {
        return sendError(res, 400, 'Invalid usageValue. Must be a number');
    }
    if (!date || isNaN(Date.parse(date))) {
        return sendError(res, 400, 'Invalid or missing date. Provide a valid date string (e.g., YYYY-MM-DD)');
    }
    const newLog = {
        room: roomId,
        usage: parseFloat(usageValue),
        unit: 'kWh',
        date,
        receivedAt: new Date().toISOString(),
        isNew: true
    };
    try {
        const docRef = await db.collection('energyLogs').add(newLog);
        res.status(201).json({ success: true, record: { id: docRef.id, ...newLog }, serverTime: newLog.receivedAt });
    } catch (error) {
        console.error('Error adding energy log:', error);
        return sendError(res, 500, 'Failed to add energy log', error.message);
    }
});

// --- POST /api/rooms : add or update a room entry ---
app.post('/api/rooms', verifyToken, async (req, res) => {
    const { roomNumber, roomType } = req.body;

    if (!roomNumber || typeof roomNumber !== 'string') {
        return sendError(res, 400, 'Invalid or missing roomNumber');
    }
    if (!roomType || typeof roomType !== 'string') {
        return sendError(res, 400, 'Invalid or missing roomType');
    }
    const newRoom = {
        roomNumber,
        type: roomType,
        status: 'Available',
        nextCleaning: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        receivedAt: new Date().toISOString(),
        isNew: true
    };
    try {
        const docRef = await db.collection('roomStatus').add(newRoom);
        res.status(201).json({ success: true, record: { id: docRef.id, ...newRoom }, serverTime: newRoom.receivedAt });
    } catch (error) {
        console.error('Error adding room status:', error);
        return sendError(res, 500, 'Failed to add room', error.message);
    }
});

// --- GET /api/visitors : returns all visitor logs ---
app.get('/api/visitors', async (req, res) => {
    try {
        const visitorDocs = await db.collection('visitorLogs').orderBy('entryTime', 'desc').get();
        const visitorLogs = visitorDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ success: true, count: visitorLogs.length, data: visitorLogs });
    } catch (e) {
        console.error('Error fetching visitors:', e);
        return sendError(res, 500, 'Failed to fetch visitors', e.message);
    }
});

// --- POST /api/visitors : add a new visitor log ---
app.post('/api/visitors', verifyToken, async (req, res) => {
    const { name, purpose } = req.body;

    if (!name || typeof name !== 'string') {
        return sendError(res, 400, 'Invalid or missing name');
    }
    if (!purpose || typeof purpose !== 'string') {
        return sendError(res, 400, 'Invalid or missing purpose');
    }

    const newVisitor = {
        name,
        purpose,
        entryTime: new Date().toISOString(),
        isNew: true
    };

    try {
        const docRef = await db.collection('visitorLogs').add(newVisitor);
        res.status(201).json({ success: true, record: { id: docRef.id, ...newVisitor } });
    } catch (error) {
        console.error('Error adding visitor log:', error);
        return sendError(res, 500, 'Failed to add visitor log', error.message);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
