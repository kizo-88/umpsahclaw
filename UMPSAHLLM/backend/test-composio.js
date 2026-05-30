const { Composio } = require('composio-core');
const c = new Composio({ apiKey: 'ak_jGanRxJl3X5sZBSdANom', baseUrl: 'https://api.composio.dev' });
async function run() {
    const e = c.getEntity('default');
    try {
        const conns = await e.getConnections();
        console.log("getConnections:", conns);
    } catch(err) {
        console.error("ERR getConnections:", err.message || err);
    }
}
run();
