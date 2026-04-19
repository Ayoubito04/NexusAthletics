/**
 * Authentication Validators
 * Ensures email, password, and user data meet security requirements
 */

const { body, param } = require('express-validator');

const registerValidator = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Contraseña debe tener al menos 8 caracteres')
        .matches(/[A-Z]/)
        .withMessage('Contraseña debe contener al menos una mayúscula')
        .matches(/[0-9]/)
        .withMessage('Contraseña debe contener al menos un número'),
    body('nombre')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nombre debe tener 2-100 caracteres')
        .escape()  // Prevent XSS
        .withMessage('Nombre contiene caracteres inválidos'),
    body('apellido')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Apellido debe tener 2-100 caracteres')
        .escape()
];

const loginValidator = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    body('password')
        .notEmpty()
        .withMessage('Contraseña requerida')
];

const socialLoginValidator = [
    body('provider')
        .isIn(['google', 'facebook', 'instagram', 'twitter', 'x'])
        .withMessage('Proveedor no soportado'),
    body('idToken')
        .optional()
        .trim()
        .isString()
        .withMessage('idToken inválido'),
    body('accessToken')
        .optional()
        .trim()
        .isString()
        .withMessage('accessToken inválido')
];

const verify2FAValidator = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    body('code')
        .isLength({ min: 8, max: 8 })
        .isNumeric()
        .withMessage('Código debe ser 8 dígitos')
];

const refreshTokenValidator = [
    body('refreshToken')
        .notEmpty()
        .isString()
        .trim()
        .withMessage('Refresh token requerido')
];

const changePasswordValidator = [
    body('oldPassword')
        .notEmpty()
        .withMessage('Contraseña actual requerida'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Nueva contraseña debe tener al menos 8 caracteres')
        .matches(/[A-Z]/)
        .withMessage('Nueva contraseña debe contener una mayúscula')
        .matches(/[0-9]/)
        .withMessage('Nueva contraseña debe contener un número')
        .custom((value, { req }) => {
            if (value === req.body.oldPassword) {
                throw new Error('Nueva contraseña no puede ser igual a la anterior');
            }
            return true;
        })
];

module.exports = {
    registerValidator,
    loginValidator,
    socialLoginValidator,
    verify2FAValidator,
    refreshTokenValidator,
    changePasswordValidator
};
