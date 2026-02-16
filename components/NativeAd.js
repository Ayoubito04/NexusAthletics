import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function NativeAd({ type = 'fitness' }) {
    const ads = {
        fitness: {
            title: 'Desbloquea Nexus Pro',
            subtitle: 'IA de Fisiología Avanzada y Rutinas Canvas ilimitadas.',
            cta: 'SABER MÁS',
            icon: 'flash',
            color: '#63ff15'
        },
        nutrition: {
            title: 'Sube al Plan Ultimate',
            subtitle: 'Análisis antropométrico Master y Nexus Vault incluido.',
            cta: 'MEJORAR AHORA',
            icon: 'crown',
            color: '#A259FF'
        }
    };

    const ad = ads[type] || ads.fitness;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#1a1a1a', '#0a0a0a']}
                style={styles.gradient}
            >
                <View style={styles.adBadge}>
                    <Text style={styles.adBadgeText}>AD</Text>
                </View>

                <View style={styles.content}>
                    <View style={[styles.iconBox, { backgroundColor: ad.color + '20' }]}>
                        <Ionicons name={ad.icon} size={24} color={ad.color} />
                    </View>
                    <View style={styles.textWrap}>
                        <Text style={styles.title}>{ad.title}</Text>
                        <Text style={styles.subtitle}>{ad.subtitle}</Text>
                    </View>
                </View>

                <TouchableOpacity style={[styles.ctaBtn, { borderColor: ad.color }]}>
                    <Text style={[styles.ctaText, { color: ad.color }]}>{ad.cta}</Text>
                </TouchableOpacity>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 15,
        borderRadius: 15,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#222'
    },
    gradient: {
        padding: 15,
    },
    adBadge: {
        position: 'absolute',
        top: 8,
        right: 12,
        backgroundColor: '#333',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    adBadgeText: {
        color: '#888',
        fontSize: 8,
        fontWeight: 'bold'
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    iconBox: {
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    textWrap: {
        flex: 1
    },
    title: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold'
    },
    subtitle: {
        color: '#999',
        fontSize: 12,
        marginTop: 2,
        lineHeight: 16
    },
    ctaBtn: {
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 8,
        alignItems: 'center'
    },
    ctaText: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1
    }
});
