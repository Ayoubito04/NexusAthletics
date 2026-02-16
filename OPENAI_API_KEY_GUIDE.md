# 🔑 Cómo Obtener tu OpenAI API Key

## Para habilitar el Entrenador de Voz necesitas una API Key de OpenAI

### Pasos para obtener la API Key:

1. **Visita OpenAI Platform**
   - Ve a: https://platform.openai.com/signup
   - Crea una cuenta o inicia sesión

2. **Accede a API Keys**
   - Una vez dentro, ve a: https://platform.openai.com/api-keys
   - Haz clic en "Create new secret key"

3. **Genera la Key**
   - Dale un nombre (ej: "Nexus Fitness Voice")
   - Copia la key generada (solo se muestra una vez)

4. **Configura en tu Backend**
   - Abre el archivo: `backend/.env`
   - Reemplaza esta línea:
     ```
     OPENAI_API_KEY=tu_openai_api_key_aqui
     ```
   - Por:
     ```
     OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
     ```
   (Pega tu key real)

5. **Reinicia el Backend**
   - Detén el servidor (Ctrl+C en la terminal)
   - Inicia nuevamente: `npm run dev`
   - Deberías ver: ✅ OpenAI Client configurado para Voice Coach

## 💰 Costos

- **Whisper API**: $0.006 por minuto de audio
- **Créditos Gratis**: OpenAI da $5 de crédito gratis para nuevas cuentas
- Aproximadamente **833 minutos gratis** de transcripción

## ⚠️ Importante

- **Guarda tu API Key de forma segura**
- **No la compartas públicamente**
- **No la subas a GitHub** (está en .gitignore)
- **Monitorea tu uso** en: https://platform.openai.com/usage

## 🆘 Si no quieres pagar ahora

Mientras tanto, el resto de la app funciona perfectamente. El Voice Coach simplemente mostrará un mensaje de "Servicio no disponible" hasta que configures la key.

---

**Nota**: Por ahora puedes usar todas las demás funcionalidades de Nexus Fitness, incluyendo el chat de texto con IA (que usa Gemini, no OpenAI).
