import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Animated, Platform, LayoutAnimation, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQItem = ({ question, answer }) => {
    const [expanded, setExpanded] = useState(false);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    return (
        <View style={[styles.faqCard, expanded && styles.faqCardExpanded]}>
            <TouchableOpacity style={styles.faqHeader} onPress={toggleExpand} activeOpacity={0.7}>
                <Text style={[styles.questionText, expanded && styles.questionTextActive]}>{question}</Text>
                <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={expanded ? "#63ff15" : "#666"}
                />
            </TouchableOpacity>
            {expanded && (
                <View style={styles.answerContainer}>
                    <Text style={styles.answerText}>{answer}</Text>
                </View>
            )}
        </View>
    );
};

export default function FAQ({ navigation }) {
    const faqs = [
        {
            question: "¿Qué es Nexus AI?",
            answer: "Nexus AI es tu entrenador personal de élite potenciado por inteligencia artificial avanzada. Diseña rutinas, analiza tu progreso y te guía en tiempo real para alcanzar tus objetivos de fitness."
        },
        {
            question: "¿Cómo genero un Plan Élite?",
            answer: "Ve a la sección 'Entrenador IA', pulsa el botón de documento en la esquina superior derecha y selecciona 'Configurar Plan Élite'. Podrás elegir tu objetivo, nivel y preferencias."
        },
        {
            question: "¿Son seguros mis datos biométricos?",
            answer: "Absolutamente. En Nexus Athletics, la privacidad es prioridad. Tus datos están encriptados y solo se utilizan para personalizar tu experiencia de entrenamiento y nutrición."
        },
        {
            question: "¿Qué incluye la suscripción Ultimate?",
            answer: "La suscripción Ultimate te da acceso ilimitado a Nexus AI, generación de planes en PDF, presentaciones interactivas Élite, escáner de alimentos avanzado y análisis biométrico profundo."
        },
        {
            question: "¿Cómo funciona el escáner de alimentos?",
            answer: "Utiliza la cámara de tu móvil para fotografiar tu plato. Nuestra IA identificará los alimentos y calculará una estimación aproximada de macronutrientes y calorías."
        },
        {
            question: "¿Puedo sincronizar mis entrenamientos con otros?",
            answer: "Sí, a través de la sección 'Comunidad', puedes compartir tus logros, ver las rutas de otros atletas y motivarte con el progreso de la comunidad Nexus."
        },
        {
            question: "¿Cómo cancelo mi suscripción?",
            answer: "Puedes gestionar o cancelar tu suscripción en cualquier momento desde 'Configuración de Cuenta' > 'Gestionar Plan'. Tu acceso premium continuará hasta el final del periodo facturado."
        }
    ];

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['rgba(99, 255, 21, 0.1)', 'transparent']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>PREGUNTAS <Text style={{ color: '#63ff15' }}>FRECUENTES</Text></Text>
                    <Text style={styles.headerSub}>Soporte Nexus AI</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.introBox}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="help-buoy-outline" size={40} color="#63ff15" />
                    </View>
                    <Text style={styles.introTitle}>¿En qué podemos ayudarte?</Text>
                    <Text style={styles.introDesc}>Todo lo que necesitas saber sobre el ecosistema Nexus AI para maximizar tu rendimiento.</Text>
                </View>

                {faqs.map((faq, index) => (
                    <FAQItem key={index} question={faq.question} answer={faq.answer} />
                ))}

                <View style={styles.contactBox}>
                    <Text style={styles.contactText}>¿No encuentras lo que buscas?</Text>
                    <TouchableOpacity style={styles.contactBtn}>
                        <LinearGradient
                            colors={['#1a1a1a', '#0a0a0a']}
                            style={styles.contactGradient}
                        >
                            <Ionicons name="mail-outline" size={20} color="#63ff15" />
                            <Text style={styles.contactBtnText}>CONTACTAR SOPORTE</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050505',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 15,
    },
    backBtn: {
        width: 45,
        height: 45,
        borderRadius: 15,
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#222',
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 1,
    },
    headerSub: {
        color: '#666',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    content: {
        paddingHorizontal: 20,
    },
    introBox: {
        alignItems: 'center',
        marginVertical: 30,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(99, 255, 21, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(99, 255, 21, 0.2)',
        marginBottom: 20,
    },
    introTitle: {
        color: 'white',
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
    },
    introDesc: {
        color: '#666',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 20,
        paddingHorizontal: 20,
    },
    faqCard: {
        backgroundColor: '#111',
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#222',
        overflow: 'hidden',
    },
    faqCardExpanded: {
        borderColor: 'rgba(99, 255, 21, 0.3)',
        backgroundColor: '#151515',
    },
    faqHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    questionText: {
        color: '#ccc',
        fontSize: 15,
        fontWeight: '700',
        flex: 1,
        marginRight: 10,
    },
    questionTextActive: {
        color: '#63ff15',
    },
    answerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 15,
    },
    answerText: {
        color: '#888',
        fontSize: 14,
        lineHeight: 22,
    },
    contactBox: {
        marginTop: 40,
        alignItems: 'center',
        backgroundColor: 'rgba(99, 255, 21, 0.03)',
        borderRadius: 25,
        padding: 30,
        borderWidth: 1,
        borderColor: 'rgba(99, 255, 21, 0.1)',
    },
    contactText: {
        color: '#aaa',
        fontSize: 14,
        marginBottom: 20,
    },
    contactBtn: {
        width: '100%',
        borderRadius: 15,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
    },
    contactGradient: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 15,
        gap: 10,
    },
    contactBtnText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 13,
        letterSpacing: 1,
    }
});
