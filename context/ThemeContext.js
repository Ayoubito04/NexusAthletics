import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const darkTheme = {
    background: '#050508',
    surface: '#121218',
    surfaceSecondary: '#1a1a24',
    text: '#FFFFFF',
    textSecondary: '#aaaaaa',
    textMuted: '#666680',
    border: 'rgba(99,255,21,0.15)',
    borderStrong: 'rgba(99,255,21,0.35)',
    primary: '#63ff15',
    primaryDim: 'rgba(99,255,21,0.15)',
    card: '#121218',
    tabBarBg: 'rgba(5,5,8,0.99)',
    inputBg: 'rgba(255,255,255,0.06)',
    isDark: true,
};

export const lightTheme = {
    background: '#F2F4F7',
    surface: '#FFFFFF',
    surfaceSecondary: '#E8EBF0',
    text: '#0A0A10',
    textSecondary: '#4A4A6A',
    textMuted: '#8888AA',
    border: 'rgba(0,0,0,0.08)',
    borderStrong: 'rgba(61,187,0,0.5)',
    primary: '#2FA800',
    primaryDim: 'rgba(61,187,0,0.12)',
    card: '#FFFFFF',
    tabBarBg: 'rgba(242,244,247,0.98)',
    inputBg: 'rgba(0,0,0,0.05)',
    isDark: false,
};

export const ThemeContext = createContext({ theme: darkTheme, isDark: true, toggleTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        AsyncStorage.getItem('appTheme').then(val => {
            if (val === 'light') setIsDark(false);
        }).catch(() => {});
    }, []);

    const toggleTheme = () => {
        setIsDark(prev => {
            const next = !prev;
            AsyncStorage.setItem('appTheme', next ? 'dark' : 'light').catch(() => {});
            return next;
        });
    };

    const theme = isDark ? darkTheme : lightTheme;

    return (
        <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
