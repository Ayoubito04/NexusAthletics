const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Solo interceptamos realtime, el resto que lo maneje Expo normal
    if (moduleName.includes('realtime-js')) {
        return {
            filePath: path.resolve(__dirname, 'supabase-realtime-mock.js'),
            type: 'sourceFile',
        };
    }
    return context.resolveRequest(context, moduleName, platform);
};

config.resolver.sourceExts.push('mjs');

module.exports = config;
