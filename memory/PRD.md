# Nexus Athletics - Documentación de Producto (PRD)

## Resumen del Proyecto
**Nexus Athletics** es una aplicación móvil de fitness con inteligencia artificial desarrollada en **React Native/Expo** con backend **Node.js + Express + Prisma + PostgreSQL**.

### Fecha de Última Actualización: Enero 2026

---

## Arquitectura Técnica

### Frontend (React Native/Expo)
- **Framework**: Expo SDK 52+
- **Navegación**: React Navigation v6
- **UI**: Custom components, Linear Gradients, Blur Views
- **Estado**: AsyncStorage + useState/useEffect
- **Animaciones**: React Native Animated API

### Backend (Node.js)
- **Framework**: Express.js
- **ORM**: Prisma con PostgreSQL
- **Auth**: JWT + bcrypt
- **AI**: Gemini API
- **Pagos**: Stripe + PayPal

---

## User Personas

### 1. Atleta Casual (Plan Gratis)
- Usuario de 18-35 años
- Busca entrenamientos básicos
- Usa contador de pasos y GPS

### 2. Fitness Enthusiast (Plan Pro)
- Usuario dedicado de 25-45 años
- Quiere rutinas personalizadas con IA
- Acceso a planes PDF y presentaciones

### 3. Atleta Avanzado (Plan Ultimate)
- Profesional o semi-profesional
- Requiere análisis avanzados
- Acceso VIP a todas las funciones

---

## Funcionalidades Implementadas

### Core Features ✅
- [x] Autenticación JWT (email/password)
- [x] OAuth Google y Facebook
- [x] Chat con IA (Gemini)
- [x] Generación de rutinas personalizadas
- [x] Body Scanner (análisis de fotos)
- [x] Bio-Scanner (análisis nutricional)
- [x] Contador de pasos automático
- [x] GPS Tracking para cardio
- [x] Sistema de planes (Gratis/Pro/Ultimate)
- [x] Pagos con Stripe y PayPal
- [x] Sistema de amigos y ranking
- [x] Calendario de entrenamientos
- [x] Analytics y métricas
- [x] Notificaciones push
- [x] Voice Coach (entrenador por voz)
- [x] Sincronización con Health Services

### Mejoras Implementadas (Enero 2026)
- [x] UI/UX mejorada con diseño "Cyberpunk Gym"
- [x] Optimización de StepCounter (eliminado modo simulación)
- [x] VoiceCoach desbloqueado y funcional
- [x] Animaciones y micro-interacciones
- [x] Uso consistente de Config.js para BACKEND_URL
- [x] Eliminación de console.logs innecesarios

---

## Estado de APIs y Configuración

### APIs Configuradas ✅
| Servicio | Estado | Notas |
|----------|--------|-------|
| Gemini AI | ✅ Configurado | Key real configurada |
| OpenAI Whisper | ✅ Configurado | Para Voice Coach |
| Stripe | ✅ Test Mode | Key sk_test_ configurada |
| PayPal | ✅ Configurado | Client ID y Secret listos |
| Cloudinary | ✅ Configurado | Para avatares e imágenes |
| Resend Email | ✅ Configurado | Para verificación de email |
| Google OAuth | ✅ Configurado | Android, iOS y Web |
| JWT | ✅ Configurado | Secret personalizado |
| PostgreSQL | ✅ Configurado | Base de datos lista |

---

## Backlog de Funcionalidades

### P0 - Crítico para Producción
- [ ] Cambiar Stripe a modo Live
- [ ] Cambiar PayPal a Live
- [ ] Configurar Cloudinary para avatares
- [ ] Generar JWT_SECRET seguro (64+ chars)
- [ ] Base de datos PostgreSQL en producción

### P1 - Alta Prioridad
- [ ] Implementar OpenAI Whisper para Voice Coach (mejor transcripción)
- [ ] Webhooks de Stripe para producción
- [ ] Sistema de notificaciones mejorado

### P2 - Media Prioridad
- [ ] Análisis de analíticas de sangre
- [ ] Integración con wearables (Apple Watch, Fitbit)
- [ ] Modo offline para rutinas

---

## Configuración de Producción Requerida

```env
# Backend/.env - Producción
GEMINI_API_KEY=tu_gemini_key_real
STRIPE_SECRET_KEY=sk_live_xxx
PAYPAL_CLIENT_ID=live_client_id
PAYPAL_SECRET=live_secret
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
JWT_SECRET=clave_segura_64_caracteres_minimo
DATABASE_URL=postgresql://user:pass@host:5432/nexus_db
```

---

## Próximos Pasos Sugeridos

1. **Configurar APIs de Producción** - Cambiar de test a live
2. **Deploy en Railway/Render** - Backend + PostgreSQL
3. **Build EAS** - Crear builds de producción con Expo
4. **Publicar en Stores** - Google Play + App Store

---

## Contacto y Soporte
- **App**: Nexus Athletics
- **Desarrollador**: Ayoub
- **Stack**: React Native + Node.js + PostgreSQL
