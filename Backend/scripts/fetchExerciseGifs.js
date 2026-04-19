/**
 * fetchExerciseGifs.js
 *
 * Ejecutar una sola vez:  node scripts/fetchExerciseGifs.js
 * Requiere: RAPIDAPI_KEY en Backend/.env
 *
 * Busca cada ejercicio en ExerciseDB, guarda imgKey → exerciseId en data/exercise_gifs.json
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.RAPIDAPI_KEY;
if (!API_KEY) {
    console.error('❌ Falta RAPIDAPI_KEY en .env');
    process.exit(1);
}

const HEADERS = {
    'X-RapidAPI-Key': API_KEY,
    'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
};
const OUT_PATH = path.join(__dirname, '../data/exercise_gifs.json');
const DELAY_MS = 800;

// imgKey → nombre a buscar en ExerciseDB
const SEARCH_MAP = {
    // PECHO
    press_banca:             'barbell bench press',
    press_inclinado:         'incline barbell bench press',
    press_declinado:         'decline barbell bench press',
    press_mancuernas:        'dumbbell bench press',
    press_inclinado_mdb:     'incline dumbbell press',
    aperturas:               'dumbbell flyes',
    aperturas_inclinadas:    'incline dumbbell flyes',
    aperturas_cable:         'cable crossover',
    fondos:                  'dips',
    push_up:                 'push up',
    push_up_diamante:        'diamond push up',
    push_up_ancho:           'wide push up',
    pullover:                'dumbbell pullover',
    // ESPALDA
    peso_muerto:             'barbell deadlift',
    peso_muerto_rumano:      'romanian deadlift',
    peso_muerto_sumo:        'sumo deadlift',
    dominadas:               'pull up',
    dominadas_supinas:       'chin up',
    remo:                    'bent over barbell row',
    remo_mancuerna:          'dumbbell row',
    remo_sentado:            'seated cable row',
    remo_polea:              'cable row',
    remo_tbar:               't bar row',
    jalon:                   'lat pulldown',
    jalon_neutro:            'neutral grip lat pulldown',
    face_pull:               'face pull',
    buenos_dias:             'good morning',
    encogimientos:           'barbell shrug',
    encogimientos_mdb:       'dumbbell shrug',
    australian_row:          'inverted row',
    // HOMBROS
    press_hombros:           'dumbbell shoulder press',
    press_militar:           'barbell overhead press',
    press_arnold:            'arnold press',
    press_sentado:           'seated shoulder press',
    elevaciones_laterales:   'lateral raise',
    elevaciones_frontales:   'front raise',
    vuelo_posterior:         'rear delt fly',
    elevacion_cable:         'cable lateral raise',
    // BÍCEPS
    curls:                   'dumbbell curl',
    curl_barra:              'barbell curl',
    curl_martillo:           'hammer curl',
    curl_concentrado:        'concentration curl',
    curl_predicador:         'preacher curl',
    curl_cable:              'cable curl',
    curl_inclinado:          'incline dumbbell curl',
    curl_martillo_cable:     'cable hammer curl',
    // TRÍCEPS
    extension_triceps:       'triceps pushdown',
    triceps_frances:         'ez barbell skullcrusher',
    patada_triceps:          'dumbbell kickback',
    fondos_triceps:          'triceps dips',
    extension_polea:         'cable triceps pushdown',
    press_cerrado:           'close grip bench press',
    extension_mancuerna:     'dumbbell triceps extension overhead',
    // PIERNAS
    sentadilla:              'barbell squat',
    sentadilla_goblet:       'goblet squat',
    sentadilla_bulgara:      'bulgarian split squat',
    sentadilla_hack:         'hack squat',
    sentadilla_front:        'front squat',
    zancadas:                'dumbbell lunge',
    zancadas_caminando:      'walking lunge',
    zancadas_inversas:       'reverse lunge',
    prensa:                  'leg press',
    extension_cuadriceps:    'leg extension',
    curl_femoral:            'lying leg curl',
    curl_sentado:            'seated leg curl',
    hip_thrust:              'barbell hip thrust',
    hip_thrust_mdb:          'dumbbell hip thrust',
    gemelos:                 'standing calf raise',
    gemelos_sentado:         'seated calf raise',
    step_up:                 'step up',
    pistol_squat:            'pistol squat',
    good_morning:            'good morning',
    // CORE
    pilates_core:            'plank',
    plank_lateral:           'side plank',
    abdominales:             'crunch',
    crunch_cable:            'cable crunch',
    russian_twist:           'russian twist',
    leg_raise:               'leg raise',
    leg_raise_colgado:       'hanging leg raise',
    superman:                'superman',
    mountain_climber:        'mountain climber',
    dead_bug:                'dead bug',
    rueda_abdominal:         'ab wheel rollout',
    pallof_press:            'pallof press',
    bird_dog:                'bird dog',
    // CALISTENIA
    muscle_up:               'muscle up',
    fondos_paralelas:        'parallel bar dip',
    pike_push:               'pike push up',
    archer_push:             'archer push up',
    l_sit:                   'l sit',
    dragon_flag:             'dragon flag',
    burpees:                 'burpee',
    salto_caja:              'box jump',
    salto_cuerda:            'jump rope',
    sprint:                  'high knees',
    // CARDIO / FLEX
    cardio_burn:             'jumping jacks',
    yoga_stretch:            'cat stretch',
    flex_stretch:            'hamstring stretch',
    yoga_warrior:            'warrior stretch',
    hip_flexor:              'hip flexor stretch',
    foam_roller:             'foam roller',
    estiramiento_isquios:    'hamstring stretch',
    estiramiento_cuadriceps: 'quadriceps stretch',
    estiramiento_pecho:      'chest stretch',
};

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function searchExercise(name) {
    const url = `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(name)}?limit=1&offset=0`;
    const res = await axios.get(url, { headers: HEADERS, timeout: 10000 });
    const list = res.data;
    if (Array.isArray(list) && list.length > 0) return list[0].id;
    return null;
}

async function main() {
    let existing = {};
    if (fs.existsSync(OUT_PATH)) {
        try { existing = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8')); } catch {}
    }

    const result = { ...existing };
    const keys = Object.keys(SEARCH_MAP);
    const pending = keys.filter(k => !result[k]);

    console.log(`\n🏋️  fetchExerciseGifs — ${keys.length} totales, ${pending.length} pendientes\n`);

    for (let i = 0; i < pending.length; i++) {
        const imgKey = pending[i];
        const searchName = SEARCH_MAP[imgKey];
        process.stdout.write(`[${i + 1}/${pending.length}] ${imgKey} → "${searchName}" ... `);

        try {
            const id = await searchExercise(searchName);
            if (id) {
                result[imgKey] = id;
                console.log(`✅ id:${id}`);
            } else {
                console.log('❌ no encontrado');
            }
        } catch (e) {
            const status = e.response?.status;
            if (status === 429) {
                console.log('⏳ Rate limit — esperando 10s...');
                await sleep(10000);
                i--; // reintentar este ejercicio
                continue;
            }
            console.log(`❌ error ${status || e.message}`);
        }

        fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
        if (i < pending.length - 1) await sleep(DELAY_MS);
    }

    const found = Object.keys(result).length;
    console.log(`\n✅ Completado: ${found}/${keys.length} ejercicios con ID`);
    console.log(`📄 Guardado en: ${OUT_PATH}\n`);
}

main().catch(e => {
    console.error('Fatal:', e.message);
    process.exit(1);
});
