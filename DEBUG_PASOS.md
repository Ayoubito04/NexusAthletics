# 🐛 Problema: El Contador de Pasos No Aumenta

## 🔍 **Diagnóstico**

### Posibles Causas:

#### 1. **Emulador vs Dispositivo Real** ⚠️
- ❌ **En emulador NO funciona** (no tiene acelerómetro real)
- ✅ **En dispositivo físico SÍ funciona**

#### 2. **Permisos del Pedómetro**
- **iOS**: Necesita permiso de "Motion & Fitness"
- **Android**: Necesita permiso de "Physical Activity"

#### 3. **La app debe estar en primer plano**
- `watchStepCount` solo funciona cuando la app está activa
- En segundo plano el pedómetro se pausa

#### 4. **Acumulación de Pasos**
- `watchStepCount` devuelve pasos **incrementales** (nuevos)
- NO devuelve el total del día
- Los pasos se acumulan desde que abriste la app

---

## ✅ **Cómo Verificar que Funciona**

### **Paso 1: Revisa los Logs en la Consola**

Cuando abras la app, deberías ver:
```
🔍 Pedómetro disponible: true
✅ Iniciando suscripción al pedómetro...
✅ Suscripción activa. Camina para ver los logs...
```

### **Paso 2: Camina con el Teléfono**

Cuando camines, deberías ver:
```
👣 PASOS DETECTADOS: 3
📊 Anterior: 0, Nuevos: 3, Total: 3

👣 PASOS DETECTADOS: 5
📊 Anterior: 3, Nuevos: 5, Total: 8
```

### **Paso 3: Verifica la Animación**

- El círculo central debería hacer un pequeño "pulso" al detectar pasos
- El número cambia en tiempo real

---

## 🧪 **Prueba Manual (Botón de Test)**

He añadido logs de debugging. Para agregar también un botón de test, abre `c:/Users/Usuario/Desktop/VSCodeApp/MiProyectoBasico/components/StepCounter.js` y agrega esto **ANTES** del botón de sincronización (línea 296):

```javascript
{/* Botón de PRUEBA */}
<TouchableOpacity 
    style={[styles.syncButton, { marginBottom: 12 }]} 
    onPress={() => {
        console.log('🧪 TEST: Añadiendo 10 pasos');
        setCurrentSteps(prev => prev + 10);
    }}
>
    <LinearGradient
        colors={['#FF6B35', '#FF8C42']}
        style={styles.syncButtonGradient}
    >
        <Ionicons name="add-circle" size={20} color="white" />
        <Text style={styles.syncButtonText}>+10 PASOS (TEST)</Text>
    </LinearGradient>
</TouchableOpacity>
```

Este botón añade 10 pasos cada vez que lo presionas para verificar que la UI funciona.

---

## 🔧 **Soluciones Según el Problema**

### Si estás en **Emulador**:
❌ **No funcionará nunca** - Usa un dispositivo físico

### Si estás en **Dispositivo Real** pero no cuenta:

#### **Android:**
1. Ve a Configuración → Aplicaciones → Tú App → Permisos
2. Activa "Actividad Física"

#### **iOS:**
1. Ve a Ajustes → Privacidad → Movimiento y Fitness
2. Activa tu app

### Si los permisos están bien pero no cuenta:

1. **Cierra y reabre la app** completamente
2. **Camina 20-30 pasos** (no solo agitar)
3. **Mira los logs en la consola Metro**
4. Verifica que el sensor se inicializa (`isAvailable: true`)

---

## 📱 **Cómo Debe Funcionar**

### Flujo Normal:

```
1. Abrir app
   ↓
2. Pedometer.isAvailableAsync() → true
   ↓
3. watchStepCount se suscribe
   ↓
4. Usuario camina con el teléfono
   ↓
5. Acelerómetro detecta movimiento
   ↓
6. watchStepCount dispara callback
   ↓
7. currentSteps se incrementa
   ↓
8. UI se actualiza
   ↓
9. Se guarda en AsyncStorage (cada minuto)
```

### Ejemplo Real:

```
Iniciar app:
  currentSteps = 0 (cargado de AsyncStorage)

Caminar 10 pasos:
  watchStepCount → result.steps = 10
  currentSteps = 0 + 10 = 10

Caminar 5 pasos más:
  watchStepCount → result.steps = 5
  currentSteps = 10 + 5 = 15

Cerrar y reabrir app:
  loadTodaySteps() → currentSteps = 15 (del mismo día)

Caminar 20 pasos:
  watchStepCount → result.steps = 20
  currentSteps = 15 + 20 = 35
```

---

## 🐛 **Debugging Avanzado**

### Verifica que el pedómetro se inicializa:

Abre la consola de Metro y busca:
```
🔍 Pedómetro disponible: true
✅ Iniciando suscripción al pedómetro...
✅ Suscripción activa. Camina para ver los logs...
```

Si NO ves estos logs:
-❌ El pedómetro no está disponible
- Estás en emulador
- El dispositivo no tiene acelerómetro

### Si ves los logs pero no detecta pasos:

1. **Camina con el teléfono en la mano** (no solo agitar)
2. **Da al menos 20-30 pasos** 
3. **Mant

én la app en primer plano**
4. **No uses modo ahorro de batería**

---

## 🎯 **Próximos Pasos**

### 1. **Verifica el Entorno:**
   - ¿Dispositivo físico o emulador?
   - ¿Qué dice la consola?

### 2. **Prueba el Botón de Test:**
   - Añade el botón manual (+10 pasos)
   - Verifica que la UI se actualiza

### 3. **Si el Test funciona pero no el pedómetro:**
   - Verifica permisos
   - Reinicia la app
   - Camina de verdad (no agitar)

### 4. **Comparte los Logs:**
   - Copia lo que dice la consola
   - Eso nos dirá exactamente qué está pasando

---

## 📝 **Checklist de Verificación**

- [ ] ¿Estás en un dispositivo físico (no emulador)?
- [ ] ¿La app tiene permisos de actividad física?
- [ ] ¿Ves "Pedómetro disponible: true" en la consola?
- [ ] ¿Ves "Suscripción activa" en la consola?
- [ ] ¿Caminaste al menos 20 pasos con el teléfono?
- [ ] ¿La app está en primer plano (no en background)?
- [  ] ¿El botón de test (+10 pasos) funciona?

---

**Siguiente acción:** Revisa la consola Metro y dime qué logs ves cuando abres la app. Eso nos dirá exactamente cuál es el problema.
