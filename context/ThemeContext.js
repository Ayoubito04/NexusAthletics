import React, { createContext, useContext } from 'react';

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

export const ThemeContext = createContext({ theme: darkTheme, isDark: true, toggleTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
    return (
        <ThemeContext.Provider value={{ theme: darkTheme, isDark: true, toggleTheme: () => {} }}>
            {children}
        </ThemeContext.Provider>
    );
}
