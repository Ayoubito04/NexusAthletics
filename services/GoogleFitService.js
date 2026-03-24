import GoogleFit, { Scopes } from 'react-native-google-fit';
import { Platform } from 'react-native';

const options = {
    scopes: [
        Scopes.FITNESS_ACTIVITY_READ,
        Scopes.FITNESS_BODY_READ,
        Scopes.FITNESS_LOCATION_READ,
        Scopes.FITNESS_HEART_RATE_READ,
    ],
};

class GoogleFitService {
    constructor() {
        this.isAuthorized = false;
    }

    async authorize() {
        if (Platform.OS !== 'android') return { success: false, message: 'Google Fit solo disponible en Android' };

        try {
            await GoogleFit.checkIsAuthorized();
            if (GoogleFit.isAuthorized) {
                this.isAuthorized = true;
                return { success: true };
            }

            const auth = await GoogleFit.authorize(options);
            if (auth.success) {
                this.isAuthorized = true;
                return { success: true };
            } else {
                return { success: false, message: auth.message };
            }
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async getTodaySteps() {
        if (!this.isAuthorized) await this.authorize();

        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();

        try {
            const res = await GoogleFit.getDailyStepCountSamples({
                startDate: start.toISOString(),
                endDate: end.toISOString()
            });
            if (res.length > 0) {
                // Buscamos el origen de datos adecuado (com.google.step_count.delta)
                const stepData = res.find(r => r.source === 'com.google.android.gms:estimated_steps');
                if (stepData && stepData.steps.length > 0) {
                    return stepData.steps[0].value;
                }

                // Fallback al primer resultado con pasos si el específico no existe
                const anySteps = res.find(r => r.steps.length > 0);
                return anySteps ? anySteps.steps[0].value : 0;
            }
            return 0;
        } catch (error) {
            console.error("Error obteniendo pasos de Google Fit:", error);
            return 0;
        }
    }

    async getTodayCalories() {
        if (!this.isAuthorized) await this.authorize();

        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();

        try {
            const res = await GoogleFit.getDailyCalorieSamples({
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                basalCalculation: true, // Incluye metabolismo basal
            });

            if (res.length > 0) {
                return Math.round(res[0].calorie);
            }
            return 0;
        } catch (error) {
            console.error("Error obteniendo calorías de Google Fit:", error);
            return 0;
        }
    }

    async disconnect() {
        GoogleFit.disconnect();
        this.isAuthorized = false;
    }
}

export default new GoogleFitService();
