const onlineUsers = new Map(); // userId -> timestamp
const ONLINE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

const trackUser = (userId) => {
    onlineUsers.set(userId, Date.now());
};

const getOnlineCount = () => {
    const cutoff = Date.now() - ONLINE_THRESHOLD_MS;
    let count = 0;
    onlineUsers.forEach((ts) => { if (ts > cutoff) count++; });
    return count;
};

module.exports = { trackUser, getOnlineCount };
