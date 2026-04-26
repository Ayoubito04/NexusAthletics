import { Linking } from 'react-native';

const F = 'https://fitnessprogramer.com/wp-content/uploads';

export const EXERCISE_IMAGES = {
    // ── PECHO ──
    "press_banca":             `${F}/2021/02/Barbell-Bench-Press.gif`,
    "press_inclinado":         `${F}/2021/02/Incline-Barbell-Bench-Press.gif`,
    "press_declinado":         `${F}/2021/02/Decline-Barbell-Bench-Press.gif`,
    "press_mancuernas":        `${F}/2021/02/Dumbbell-Bench-Press.gif`,
    "press_inclinado_mdb":     `${F}/2021/02/Incline-Dumbbell-Press.gif`,
    "aperturas":               `${F}/2021/02/Dumbbell-Flyes.gif`,
    "aperturas_inclinadas":    `${F}/2021/02/Incline-Dumbbell-Flyes.gif`,
    "aperturas_cable":         `${F}/2021/02/Cable-Crossover.gif`,
    "fondos":                  `${F}/2021/02/Parallel-Bar-Dip.gif`,
    "push_up":                 `${F}/2021/02/Push-Up.gif`,
    "push_up_diamante":        `${F}/2021/06/Diamond-Push-Up.gif`,
    "push_up_ancho":           `${F}/2021/02/Push-Up.gif`,
    "pullover":                `${F}/2021/02/Dumbbell-Pullover.gif`,
    // ── ESPALDA ──
    "peso_muerto":             `${F}/2021/02/Barbell-Deadlift.gif`,
    "peso_muerto_rumano":      `${F}/2021/02/Romanian-Deadlift.gif`,
    "peso_muerto_sumo":        `${F}/2021/02/Sumo-Deadlift.gif`,
    "dominadas":               `${F}/2021/02/Pull-Up.gif`,
    "dominadas_supinas":       `${F}/2021/02/Chin-Up.gif`,
    "remo":                    `${F}/2021/02/Bent-Over-Barbell-Row.gif`,
    "remo_mancuerna":          `${F}/2021/02/Dumbbell-Row.gif`,
    "remo_sentado":            `${F}/2021/02/Seated-Cable-Rows.gif`,
    "remo_polea":              `${F}/2021/02/Seated-Cable-Rows.gif`,
    "remo_tbar":               `${F}/2021/02/T-Bar-Row.gif`,
    "jalon":                   `${F}/2021/02/Lat-Pulldown.gif`,
    "jalon_neutro":            `${F}/2021/02/Lat-Pulldown.gif`,
    "face_pull":               `${F}/2021/06/Face-Pull.gif`,
    "buenos_dias":             `${F}/2021/02/Good-Morning.gif`,
    "encogimientos":           `${F}/2021/02/Barbell-Shrug.gif`,
    "encogimientos_mdb":       `${F}/2021/02/Dumbbell-Shrug.gif`,
    "australian_row":          `${F}/2021/02/Bent-Over-Barbell-Row.gif`,
    // ── HOMBROS ──
    "press_hombros":           `${F}/2021/06/Dumbbell-Shoulder-Press.gif`,
    "press_militar":           `${F}/2021/02/Barbell-Shoulder-Press.gif`,
    "press_arnold":            `${F}/2021/06/Dumbbell-Shoulder-Press.gif`,
    "press_sentado":           `${F}/2021/06/Dumbbell-Shoulder-Press.gif`,
    "elevaciones_laterales":   `${F}/2021/02/Lateral-Raise.gif`,
    "elevaciones_frontales":   `${F}/2021/02/Front-Raise.gif`,
    "vuelo_posterior":         `${F}/2021/06/Bent-Over-Dumbbell-Lateral-Raise.gif`,
    "elevacion_cable":         `${F}/2021/02/Lateral-Raise.gif`,
    // ── BÍCEPS ──
    "curls":                   `${F}/2021/02/Dumbbell-Curl.gif`,
    "curl_barra":              `${F}/2021/02/Barbell-Curl.gif`,
    "curl_martillo":           `${F}/2021/02/Dumbbell-Hammer-Curl.gif`,
    "curl_concentrado":        `${F}/2021/02/Concentration-Curl.gif`,
    "curl_predicador":         `${F}/2021/02/Preacher-Curl.gif`,
    "curl_cable":              `${F}/2021/02/Barbell-Curl.gif`,
    "curl_inclinado":          `${F}/2021/02/Dumbbell-Curl.gif`,
    "curl_martillo_cable":     `${F}/2021/02/Dumbbell-Hammer-Curl.gif`,
    // ── TRÍCEPS ──
    "extension_triceps":       `${F}/2021/06/Triceps-Pushdown.gif`,
    "triceps_frances":         `${F}/2021/02/Skull-Crusher.gif`,
    "patada_triceps":          `${F}/2021/02/Dumbbell-Kickback.gif`,
    "fondos_triceps":          `${F}/2021/02/Parallel-Bar-Dip.gif`,
    "extension_polea":         `${F}/2021/06/Triceps-Pushdown.gif`,
    "press_cerrado":           `${F}/2021/02/Close-Grip-Bench-Press.gif`,
    "extension_mancuerna":     `${F}/2021/02/Dumbbell-Kickback.gif`,
    // ── PIERNAS ──
    "sentadilla":              `${F}/2021/02/Barbell-Full-Squat.gif`,
    "sentadilla_goblet":       `${F}/2021/02/Goblet-Squat.gif`,
    "sentadilla_bulgara":      `${F}/2021/06/Bulgarian-Split-Squat.gif`,
    "sentadilla_hack":         `${F}/2021/02/Hack-Squat.gif`,
    "sentadilla_front":        `${F}/2021/02/Front-Squat.gif`,
    "zancadas":                `${F}/2021/02/Dumbbell-Lunges.gif`,
    "zancadas_caminando":      `${F}/2021/02/Walking-Lunges.gif`,
    "zancadas_inversas":       `${F}/2021/02/Dumbbell-Lunges.gif`,
    "prensa":                  `${F}/2021/02/Leg-Press.gif`,
    "extension_cuadriceps":    `${F}/2021/02/Leg-Extension.gif`,
    "curl_femoral":            `${F}/2021/02/Lying-Leg-Curl.gif`,
    "curl_sentado":            `${F}/2021/02/Lying-Leg-Curl.gif`,
    "hip_thrust":              `${F}/2021/02/Barbell-Hip-Thrust.gif`,
    "hip_thrust_mdb":          `${F}/2021/02/Barbell-Hip-Thrust.gif`,
    "gemelos":                 `${F}/2021/02/Standing-Calf-Raises.gif`,
    "gemelos_sentado":         `${F}/2021/02/Seated-Calf-Raise.gif`,
    "step_up":                 `${F}/2021/02/Step-Up.gif`,
    "pistol_squat":            `${F}/2021/06/Pistol-Squat.gif`,
    "good_morning":            `${F}/2021/02/Good-Morning.gif`,
    // ── CORE ──
    "pilates_core":            `${F}/2021/02/Plank.gif`,
    "plank_lateral":           `${F}/2021/02/Side-Plank.gif`,
    "abdominales":             `${F}/2021/02/Crunch.gif`,
    "crunch_cable":            `${F}/2021/02/Crunch.gif`,
    "russian_twist":           `${F}/2021/06/Russian-Twist.gif`,
    "leg_raise":               `${F}/2021/02/Lying-Leg-Raise.gif`,
    "leg_raise_colgado":       `${F}/2021/02/Hanging-Leg-Raise.gif`,
    "superman":                `${F}/2021/06/Superman.gif`,
    "mountain_climber":        `${F}/2021/06/Mountain-Climber.gif`,
    "dead_bug":                `${F}/2021/02/Plank.gif`,
    "rueda_abdominal":         `${F}/2021/02/Ab-Wheel-Rollout.gif`,
    "pallof_press":            `${F}/2021/02/Plank.gif`,
    "bird_dog":                `${F}/2021/06/Superman.gif`,
    // ── CALISTENIA ──
    "muscle_up":               `${F}/2021/06/Muscle-Up.gif`,
    "fondos_paralelas":        `${F}/2021/02/Parallel-Bar-Dip.gif`,
    "pike_push":               `${F}/2021/06/Pike-Push-Up.gif`,
    "archer_push":             `${F}/2021/02/Push-Up.gif`,
    "l_sit":                   `${F}/2021/02/Parallel-Bar-Dip.gif`,
    "dragon_flag":             `${F}/2021/02/Lying-Leg-Raise.gif`,
    "burpees":                 `${F}/2021/06/Burpee.gif`,
    "salto_caja":              `${F}/2021/06/Box-Jump.gif`,
    "salto_cuerda":            `${F}/2021/06/Jumping-Jacks.gif`,
    "sprint":                  `${F}/2021/06/High-Knees.gif`,
    // ── CARDIO / YOGA / FLEX ──
    "cardio_burn":             `${F}/2021/06/Jumping-Jacks.gif`,
    "yoga_stretch":            `${F}/2021/06/Cat-Stretch.gif`,
    "flex_stretch":            `${F}/2021/06/Single-Leg-Stretch.gif`,
    "yoga_warrior":            `${F}/2021/06/Cat-Stretch.gif`,
    "hip_flexor":              `${F}/2021/06/Single-Leg-Stretch.gif`,
    "foam_roller":             `${F}/2021/06/Cat-Stretch.gif`,
    "estiramiento_isquios":    `${F}/2021/06/Single-Leg-Stretch.gif`,
    "estiramiento_cuadriceps": `${F}/2021/06/Single-Leg-Stretch.gif`,
    "estiramiento_pecho":      `${F}/2021/06/Cat-Stretch.gif`,
    "default":                 `${F}/2021/02/Barbell-Bench-Press.gif`,
};

// Fallback: normaliza nombre de ejercicio a un imgKey aproximado
export function nameToImgKey(name) {
    if (!name) return null;
    const n = name
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[áéíóúü]/g, c => ({ á:'a',é:'e',í:'i',ó:'o',ú:'u',ü:'u' }[c] || c))
        .trim();

    if (n.includes('press') && (n.includes('banca') || n.includes('plano') || n.includes('banco'))) return 'press_banca';
    if (n.includes('press') && n.includes('inclinado')) return 'press_inclinado';
    if (n.includes('press') && n.includes('declinado')) return 'press_declinado';
    if (n.includes('press') && (n.includes('mancuerna') || n.includes('dumbell'))) return 'press_mancuernas';
    if ((n.includes('apertura') || n.includes('apertura')) && n.includes('cable')) return 'aperturas_cable';
    if (n.includes('apertura')) return 'aperturas';
    if ((n.includes('fondo') || n.includes('dip')) && n.includes('tricep')) return 'fondos_triceps';
    if (n.includes('fondo') || n.includes('dip')) return 'fondos';
    if (n.includes('push') || n.includes('flexion')) return 'push_up';
    if (n.includes('pullover')) return 'pullover';

    if (n.includes('peso muerto') && n.includes('rumano')) return 'peso_muerto_rumano';
    if (n.includes('peso muerto') && n.includes('sumo')) return 'peso_muerto_sumo';
    if (n.includes('peso muerto') || n.includes('deadlift')) return 'peso_muerto';
    if (n.includes('dominada') || n.includes('pull up') || n.includes('pullup')) return 'dominadas';
    if (n.includes('remo') && (n.includes('mancuerna') || n.includes('dumbell'))) return 'remo_mancuerna';
    if (n.includes('remo') && (n.includes('sentado') || n.includes('polea'))) return 'remo_sentado';
    if (n.includes('remo') && n.includes('tbar')) return 'remo_tbar';
    if (n.includes('remo') || n.includes('row')) return 'remo';
    if (n.includes('jalon') || n.includes('jalon') || n.includes('lat pulldown')) return 'jalon';
    if (n.includes('face pull')) return 'face_pull';
    if (n.includes('encogimiento') || n.includes('shrug')) return 'encogimientos';

    if (n.includes('press') && (n.includes('militar') || n.includes('overhead') || n.includes('hombro'))) return 'press_militar';
    if (n.includes('press') && n.includes('arnold')) return 'press_arnold';
    if (n.includes('elevacion') && n.includes('lateral')) return 'elevaciones_laterales';
    if (n.includes('elevacion') && n.includes('frontal')) return 'elevaciones_frontales';
    if (n.includes('vuelo') || n.includes('posterior')) return 'vuelo_posterior';

    if (n.includes('curl') && n.includes('martillo')) return 'curl_martillo';
    if (n.includes('curl') && n.includes('barra')) return 'curl_barra';
    if (n.includes('curl') && n.includes('predicador')) return 'curl_predicador';
    if (n.includes('curl') && n.includes('concentrado')) return 'curl_concentrado';
    if (n.includes('curl') && n.includes('cable')) return 'curl_cable';
    if (n.includes('curl') && (n.includes('bicep') || n.includes('biceps'))) return 'curl_barra';
    if (n.includes('curl') && (n.includes('mancuerna') || n.includes('dumbell'))) return 'curls';

    if (n.includes('frances') || n.includes('skull')) return 'triceps_frances';
    if (n.includes('patada') || n.includes('kickback')) return 'patada_triceps';
    if (n.includes('tricep') && n.includes('polea')) return 'extension_polea';
    if (n.includes('press') && n.includes('cerrado')) return 'press_cerrado';
    if (n.includes('tricep') || n.includes('extension')) return 'extension_triceps';

    if (n.includes('sentadilla') && n.includes('bulgara')) return 'sentadilla_bulgara';
    if (n.includes('sentadilla') && n.includes('hack')) return 'sentadilla_hack';
    if (n.includes('sentadilla') && n.includes('goblet')) return 'sentadilla_goblet';
    if (n.includes('sentadilla') && (n.includes('front') || n.includes('frontal'))) return 'sentadilla_front';
    if (n.includes('sentadilla') || n.includes('squat')) return 'sentadilla';
    if (n.includes('zancada') && n.includes('caminando')) return 'zancadas_caminando';
    if (n.includes('zancada') || n.includes('lunge')) return 'zancadas';
    if (n.includes('prensa') || n.includes('leg press')) return 'prensa';
    if (n.includes('extension') && (n.includes('cuadricep') || n.includes('pierna'))) return 'extension_cuadriceps';
    if (n.includes('curl') && (n.includes('femoral') || n.includes('isquio'))) return 'curl_femoral';
    if (n.includes('hip thrust') || (n.includes('elevacion') && n.includes('cadera'))) return 'hip_thrust';
    if (n.includes('gemelo') || n.includes('pantorrilla') || n.includes('calf')) return 'gemelos';
    if (n.includes('step up') || n.includes('step-up')) return 'step_up';

    if (n.includes('plancha') || n.includes('plank')) return 'pilates_core';
    if (n.includes('crunch') || n.includes('abdominal')) return 'abdominales';
    if (n.includes('russian') || n.includes('giro ruso')) return 'russian_twist';
    if (n.includes('leg raise') || n.includes('elevacion de pierna')) return 'leg_raise';
    if (n.includes('mountain') || n.includes('escalador')) return 'mountain_climber';
    if (n.includes('burpee')) return 'burpees';
    if (n.includes('rueda') || n.includes('ab wheel')) return 'rueda_abdominal';

    return null;
}

/**
 * Devuelve la URL del GIF para un ejercicio.
 * ex puede ser: { imgKey, name } — usa imgKey si está disponible, sino normaliza el nombre.
 */
export function getGifUrl(ex) {
    if (!ex) return EXERCISE_IMAGES.default;
    const key = ex.imgKey || nameToImgKey(ex.name);
    return EXERCISE_IMAGES[key] || EXERCISE_IMAGES.default;
}

export function openExerciseSearch(name) {
    const query = encodeURIComponent(`como hacer ${name} ejercicio correctamente`);
    Linking.openURL(`https://www.youtube.com/results?search_query=${query}`);
}
