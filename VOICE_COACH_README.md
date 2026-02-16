# 🎤 Entrenador de Voz con IA - Nexus Fitness

## Descripción

El **Entrenador de Voz con IA** es una funcionalidad innovadora que permite a los usuarios de Nexus Fitness interactuar con su entrenador personal mediante voz. La IA puede:

- ✅ **Escucharte** mientras haces ejercicio
- ✅ **Transcribir** tu voz a texto usando Whisper API de OpenAI
- ✅ **Guiarte** con instrucciones habladas en tiempo real
- ✅ **Responderte** con voz (Text-to-Speech) en español

## 🚀 Características

### Frontend (React Native + Expo)
- **Grabación de Audio**: Mantén presionado el botón para grabar tu voz
- **Transcripción en Tiempo Real**: Tu voz se convierte a texto automáticamente
- **Respuesta por Voz**: La IA te habla de vuelta con instrucciones
- **Interfaz Intuitiva**: Visualización de ondas de audio y estados claros
- **Historial de Conversaciones**: Guarda todas tus interacciones

### Backend (Node.js + Express)
- **Whisper API**: Transcripción de audio de alta calidad usando OpenAI
- **Gemini AI**: Genera respuestas personalizadas basadas en tu perfil
- **Multer**: Manejo de archivos de audio
- **Prisma ORM**: Almacenamiento de mensajes de voz en base de datos

## 📦 Instalación

### 1. Instalar Dependencias Frontend

```bash
cd MiProyectoBasico
npm install expo-av expo-speech
```

### 2. Instalar Dependencias Backend

```bash
cd backend
npm install openai multer form-data
```

### 3. Configurar Variables de Entorno

Agrega tu **OpenAI API Key** al archivo `.env` del backend:

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxx
```

Para obtener una API Key:
1. Ve a [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Crea una cuenta o inicia sesión
3. Genera una nueva API Key
4. Copia y pega la key en tu `.env`

### 4. Migrar Base de Datos

```bash
cd backend
npx prisma migrate dev --name add_voice_field
```

### 5. Crear Carpeta de Uploads

```bash
cd backend
mkdir -p uploads/voice
```

## 🎯 Cómo Usar

### Desde la App:

1. **Accede al Entrenador de Voz**
   - Abre la app Nexus Fitness
   - Ve al **Home**
   - En la sección "Inteligencia Nexus", pulsa **"Voz Coach"**

2. **Interactúa con la IA**
   - **Mantén presionado** el botón del micrófono para hablar
   - Habla claro y cerca del micrófono
   - **Suelta** el botón cuando termines
   - La IA transcribirá tu mensaje y te responderá por voz

3. **Ejemplos de Preguntas**
   - "¿Cómo hago una sentadilla correcta?"
   - "Dame una rutina de pecho"
   - "Estoy muy cansado, ¿qué hago?"
   - "¿Cuántas repeticiones debo hacer?"

## 🏗️ Arquitectura

### Flujo de Datos:

```
1. Usuario habla → 2. Audio grabado → 3. Enviado al backend
                                            ↓
4. Whisper API transcribe → 5. Gemini AI procesa → 6. Respuesta generada
                                                           ↓
7. Text-to-Speech lee respuesta ← 8. Frontend recibe texto
```

### Archivos Clave:

**Frontend:**
- `screen/VoiceCoach.js` - Pantalla principal del entrenador de voz
- `App.js` - Configuración de rutas de navegación
- `screen/Home.js` - Botón de acceso al entrenador de voz

**Backend:**
- `src/controllers/voiceController.js` - Lógica de transcripción y respuesta
- `src/routes/voiceRoutes.js` - Rutas API para voice
- `index.js` - Registro de rutas en el servidor
- `prisma/schema.prisma` - Modelo de datos (campo `isVoice`)

## 🛠️ Tecnologías Utilizadas

### Frontend:
- **expo-av**: Grabación de audio
- **expo-speech**: Text-to-Speech (síntesis de voz)
- **React Native Animated**: Animaciones visuales

### Backend:
- **OpenAI Whisper API**: Transcripción de audio a texto
- **Google Gemini AI**: Generación de respuestas inteligentes
- **Multer**: Middleware para manejo de archivos
- **Prisma**: ORM para base de datos PostgreSQL

## 📊 Modelos de Datos

### Modelo `Message` (Prisma):

```prisma
model Message {
  id          Int          @id @default(autoincrement())
  text        String
  sender      String       // 'usuario' o 'ia'
  image       String?  
  isDM        Boolean      @default(false)
  isVoice     Boolean      @default(false)  // ← NUEVO CAMPO
  receiverId  Int?
  sessionId   Int?
  userId      Int
  createdAt   DateTime     @default(now())
  
  user        User         @relation(...)
  session     ChatSession? @relation(...)
}
```

## 🔒 Seguridad

- **Autenticación JWT**: Todas las rutas requieren token válido
- **Límite de Tamaño**: Máximo 10MB por archivo de audio
- **Validación de Tipos**: Solo archivos de audio permitidos
- **Limpieza Automática**: Archivos temporales se eliminan después de procesar

## 🚨 Troubleshooting

### Error: "API Key de OpenAI no configurada"
**Solución:** Asegúrate de agregar `OPENAI_API_KEY` en el archivo `.env` del backend.

### Error: "No se pudo iniciar la grabación"
**Solución:** Verifica que la app tenga permisos de micrófono. En Android/iOS, ve a Configuración → Apps → Nexus Fitness → Permisos.

### Error: "No se detectó voz en el audio"
**Solución:** Habla más cerca del micrófono y asegúrate de tener buena conexión a internet.

### La voz de la IA no suena
**Solución:** 
- iOS: Descarga voces españolas en Configuración → Accesibilidad → Contenido Hablado
- Android: Instala voces TTS en español desde Google Play Store

## 📝 Notas Importantes

1. **Whisper API Costo**: La transcripción con Whisper API tiene un costo de $0.006 por minuto. Monitorea tu uso en [OpenAI Dashboard](https://platform.openai.com/usage).

2. **Calidad de Audio**: Para mejores resultados, graba en un ambiente silencioso.

3. **Idioma**: El sistema está optimizado para **español (es-ES)**.

4. **Límites Diarios**: Los mensajes de voz cuentan hacia el límite diario de mensajes según tu plan (Gratis: 30, Pro: 500, Ultimate: ilimitado).

## 🎨 Personalización

Para cambiar la voz de la IA, edita `VoiceCoach.js`:

```javascript
const options = {
  language: 'es-ES',
  pitch: 1.0,      // 0.5 - 2.0 (más bajo/más alto)
  rate: 0.95,      // 0.1 - 2.0 (más lento/más rápido)
  voice: 'com.apple.ttsbundle.Monica-compact', // Solo iOS
};
```

## 🤝 Contribución

Si encuentras bugs o tienes sugerencias:
1. Crea un issue en el repositorio
2. Describe el problema o mejora
3. Incluye capturas de pantalla si es posible

## 📄 Licencia

Este proyecto es parte de Nexus Fitness. Todos los derechos reservados.

---

**¿Necesitas ayuda?** Contacta al equipo de soporte en `soporte@nexusfitness.com`
