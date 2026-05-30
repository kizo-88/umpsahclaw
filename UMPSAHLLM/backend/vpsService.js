const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const ssh = new NodeSSH();

const VPS_REGISTRY = path.resolve(__dirname, 'vps_registry.json');
let nasConnected = false;

// Mock fallback data
const getRegistry = () => {
    if (!fs.existsSync(VPS_REGISTRY)) {
        fs.writeFileSync(VPS_REGISTRY, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(VPS_REGISTRY, 'utf8'));
};

const saveRegistry = (data) => {
    fs.writeFileSync(VPS_REGISTRY, JSON.stringify(data, null, 2));
};

async function connectToNAS() {
    try {
        await ssh.connect({
            host: process.env.NAS_HOST || '10.204.45.86',
            username: process.env.NAS_USER || 'admin',
            password: process.env.NAS_PASSWORD || 'admin', // Fallback for testing, should be in .env
        });
        nasConnected = true;
        console.log("🚀 Connected to NAS via SSH successfully.");
    } catch (err) {
        console.error("⚠️ Failed to connect to NAS:", err.message);
        nasConnected = false;
    }
}

// Try to connect on boot
connectToNAS();

async function getVPSList() {
    if (nasConnected) {
        try {
            // If NAS uses docker, we could run 'docker ps'
            // For now, let's just list mock instances from registry but with REAL NAS uptime
            const result = await ssh.execCommand('uptime -p');
            const nasUptime = result.stdout;
            
            const data = getRegistry();
            return data.map(v => ({
                ...v,
                cpu: v.status === 'running' ? 'N/A' : '0%',
                ram: v.status === 'running' ? 'Active' : '0B',
                uptime: v.status === 'running' ? nasUptime : '-'
            }));
        } catch (e) {
            console.error("SSH Exec Error:", e);
        }
    }
    // Mock Mode
    const data = getRegistry();
    return data.map(v => ({
        ...v,
        cpu: v.status === 'running' ? `${Math.floor(Math.random() * 20)}%` : '0%',
        ram: v.status === 'running' ? `${Math.floor(Math.random() * 512)}MB / 1GB` : '0B / 1GB',
        uptime: v.status === 'running' ? '14d 2h (Mock)' : '-'
    }));
}

async function createVPS(name, ip, os) {
    const data = getRegistry();
    const newVps = {
        id: `vps-${Date.now()}`,
        name,
        ip: ip || '10.204.45.86', // Force NAS IP
        status: 'stopped',
        os: os || 'NAS Host OS',
        type: 'NAS_SSH',
        files: []
    };
    data.push(newVps);
    saveRegistry(data);
    
    // If NAS connected, we could theoretically create a folder or a docker container here
    if (nasConnected) {
        await ssh.execCommand(`mkdir -p ~/vps_instances/${newVps.id}`);
    }
    
    return newVps;
}

async function toggleVPS(id) {
    const data = getRegistry();
    let updated = false;
    const newData = data.map(v => {
        if (v.id === id) {
            updated = true;
            return { ...v, status: v.status === 'running' ? 'stopped' : 'running' };
        }
        return v;
    });
    if (updated) saveRegistry(newData);
    return { status: 'updated' };
}

async function uploadFileToNAS(instanceId, localFilePath, filename) {
    const data = getRegistry();
    const vps = data.find(v => v.id === instanceId);
    if (!vps) throw new Error("VPS not found");

    if (!vps.files) vps.files = [];
    if (!vps.files.includes(filename)) vps.files.push(filename);
    saveRegistry(data);

    if (nasConnected) {
        // Upload to NAS via SCP
        const remotePath = `~/vps_instances/${instanceId}/${filename}`;
        await ssh.execCommand(`mkdir -p ~/vps_instances/${instanceId}`);
        await ssh.putFile(localFilePath, remotePath);
        return { success: true, remotePath };
    }
    return { success: true, localPath: localFilePath };
}

async function deleteVPS(id) {
    const data = getRegistry();
    saveRegistry(data.filter(v => v.id !== id));
    if (nasConnected) {
        await ssh.execCommand(`rm -rf ~/vps_instances/${id}`);
    }
    return { success: true };
}

module.exports = {
    getVPSList,
    createVPS,
    toggleVPS,
    uploadFileToNAS,
    deleteVPS,
    connectToNAS,
    get isNasConnected() { return nasConnected; }
};
