import 'react-native-url-polyfill/auto'
import 'react-native-get-random-values'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
    global: {
        headers: { 'x-client-info': 'supabase-js-react-native' },
    },
})

// Polyfill y filtro global para evitar el bug interno de Supabase "realtime.setAuth"
if (typeof console !== 'undefined') {
    const originalError = console.error;
    console.error = (...args) => {
        const errorMsg = args.join(' ');
        if (errorMsg.includes('realtime.setAuth') || errorMsg.includes('setAuth is not a function')) {
            return;
        }
        originalError.apply(console, args);
    };
}

if (supabase.realtime && !supabase.realtime.setAuth) {
    supabase.realtime.setAuth = () => { };
}
if (!supabase.realtime) {
    supabase.realtime = { setAuth: () => { } };
}
