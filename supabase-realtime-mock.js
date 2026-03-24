// Mock específico para que Supabase Auth no explote al no encontrar Realtime
export class RealtimeClient {
    constructor() { }
    connect() { }
    disconnect() { }
    channel() { return { subscribe: () => { }, unsubscribe: () => { }, on: () => { } }; }
}

export const REALTIME_LISTEN_TYPES = {};
export const REALTIME_POSTGRES_CHANGES_LISTEN_EVENT = {};
export const REALTIME_SUBSCRIBE_STATES = {};
export const REALTIME_CHANNEL_STATES = {};

export default {
    RealtimeClient,
    REALTIME_LISTEN_TYPES,
    REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
    REALTIME_SUBSCRIBE_STATES,
    REALTIME_CHANNEL_STATES,
};
