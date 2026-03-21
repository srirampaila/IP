import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- In-Memory Database ---
const db = {
    maintenanceLogs: [],
    energyLogs: [],
    roomStatus: [],
    visitorLogs: []
};

// Seed some initial data
db.maintenanceLogs.push({ 
    id: crypto.randomUUID(), 
    room: '101', 
    description: 'Leaking faucet in bathroom', 
    priority: 'Medium', 
    status: 'Pending', 
    date: new Date().toISOString().split('T')[0], 
    receivedAt: new Date().toISOString(), 
    isNew: false 
});

// --- Centralized Error Formatter ---
const sendError = (res, statusCode, message, details = null) => {
    const errorResponse = { error: true, message };
    if (details) errorResponse.details = details;
    return res.status(statusCode).json(errorResponse);
};

// --- Authentication Middleware ---
const verifyToken = async (req, res, next) => {
    // For demo purposes, we will bypass this if a specific header is sent
    if (req.headers['x-demo-bypass'] === 'true') {
        return next();
    }
    return sendError(res, 401, 'Unauthorized: Missing bypass header for in-memory db');
};

// --- GET /api/updates : returns all data + server timestamp ---
app.get('/api/updates', async (req, res) => {
    try {
        const responseData = {
            serverTime: new Date().toISOString(),
            systemStatus: 'Operational',
            maintenanceLogs: [...db.maintenanceLogs].sort((a,b) => new Date(b.receivedAt) - new Date(a.receivedAt)),
            energyLogs: [...db.energyLogs].sort((a,b) => new Date(b.receivedAt) - new Date(a.receivedAt)),
            roomStatus: [...db.roomStatus].sort((a,b) => new Date(b.receivedAt) - new Date(a.receivedAt)),
            visitorLogs: [...db.visitorLogs].sort((a,b) => new Date(b.entryTime) - new Date(a.entryTime))
        };

        // Clear 'isNew' flag after reading it
        db.maintenanceLogs.forEach(log => log.isNew = false);
        db.energyLogs.forEach(log => log.isNew = false);
        db.roomStatus.forEach(log => log.isNew = false);
        db.visitorLogs.forEach(log => log.isNew = false);

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
        id: crypto.randomUUID(),
        room: roomId,
        description,
        priority,
        status: 'Pending',
        date: new Date().toISOString().split('T')[0],
        receivedAt: new Date().toISOString(),
        isNew: true
    };
    
    try {
        db.maintenanceLogs.push(newLog);
        res.status(201).json({ success: true, record: newLog, serverTime: newLog.receivedAt });
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
        const index = db.maintenanceLogs.findIndex(log => log.id === id);
        if (index === -1) {
            return sendError(res, 404, 'Maintenance log not found');
        }

        db.maintenanceLogs[index] = { ...db.maintenanceLogs[index], ...updateData };
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
        const index = db.maintenanceLogs.findIndex(log => log.id === id);
        if (index === -1) {
            return sendError(res, 404, 'Maintenance log not found');
        }

        db.maintenanceLogs.splice(index, 1);
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
        return sendError(res, 400, 'Invalid or missing date.');
    }
    
    const newLog = {
        id: crypto.randomUUID(),
        room: roomId,
        usage: parseFloat(usageValue),
        unit: 'kWh',
        date,
        receivedAt: new Date().toISOString(),
        isNew: true
    };
    
    try {
        db.energyLogs.push(newLog);
        res.status(201).json({ success: true, record: newLog, serverTime: newLog.receivedAt });
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
        id: crypto.randomUUID(),
        roomNumber,
        type: roomType,
        status: 'Available',
        nextCleaning: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        receivedAt: new Date().toISOString(),
        isNew: true
    };
    
    try {
        db.roomStatus.push(newRoom);
        res.status(201).json({ success: true, record: newRoom, serverTime: newRoom.receivedAt });
    } catch (error) {
        console.error('Error adding room status:', error);
        return sendError(res, 500, 'Failed to add room', error.message);
    }
});

// --- GET /api/visitors : returns all visitor logs ---
app.get('/api/visitors', async (req, res) => {
    try {
        const logs = [...db.visitorLogs].sort((a,b) => new Date(b.entryTime) - new Date(a.entryTime));
        res.json({ success: true, count: logs.length, data: logs });
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
        id: crypto.randomUUID(),
        name,
        purpose,
        entryTime: new Date().toISOString(),
        isNew: true
    };

    try {
        db.visitorLogs.push(newVisitor);
        res.status(201).json({ success: true, record: newVisitor });
    } catch (error) {
        console.error('Error adding visitor log:', error);
        return sendError(res, 500, 'Failed to add visitor log', error.message);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
