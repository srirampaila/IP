
import fetch from 'node-fetch'; // If using node-fetch, otherwise built-in fetch
// Since node 18, fetch is global. So we might not need import if we don't use node-fetch package.
// But if node-fetch is not installed, we should rely on global fetch.

async function run() {
    console.log('Starting test...');
    for (let i = 0; i < 100; i++) {
        try {
            const res = await fetch('http://localhost:3001/api/updates');
            if (!res.ok) {
                console.log('Error:', res.status, res.statusText);
                return;
            }
            const data = await res.json();
            if (!data.maintenanceLogs || !data.energyLogs || !data.roomStatus) {
                console.log('Missing data:', data);
            }
        } catch (e) {
            console.log('Exception:', e);
            return;
        }
    }
    console.log('Done');
}

run();
