/**
 * Компонент ввода (input)
 */

import { logger } from '../logger.js';

import { ComponentBase } from './component-base.js';

class InputComponent extends ComponentBase {
    constructor(elementId = null, element = null, options = {}) {
        super(elementId, element);
        this.options = {
            type: 'text', // text, password, email, number, etc.
            placeholder: '',
            value: '',
            disabled: false,
            readonly: false,
            required: false,
            minLength: null,
            maxLength: null,
            pattern: null,
            validationMessage: '',
            showValidation: true,
            onChange: null,
            onInput: null,
            onFocus: null,
            onBlur: null,
            onValidate: null, // custom validation function
            ...options
        };
        this.isValid = true;
        this.validationError = '';
        this.validationElement = null;
    }

    async onInitialize() {
        if (!this.exists()) {
            // Создаем input если элемент не существует
            this.createInput();
        }
        this.updateInput();
        this.setupEventListeners();
        this.setupValidation();
    }

    createInput() {
        const input = document.createElement('input');
        input.type = this.options.type;
        input.className = 'form-control';
        this.element = input;
    }

    updateInput() {
        if (!this.exists()) return;

        const element = this.getElement();

        // Обновляем атрибуты
        element.type = this.options.type;
        element.placeholder = this.options.placeholder;
        element.value = this.options.value;
        element.disabled = this.options.disabled;
        element.readOnly = this.options.readonly;
        element.required = this.options.required;

        if (this.options.minLength !== null) {
            element.minLength = this.options.minLength;
        }
        if (this.options.maxLength !== null) {
            element.maxLength = this.options.maxLength;
        }
        if (this.options.pattern) {
            element.pattern = this.options.pattern;
        }

        // Обновляем CSS классы
        element.className = 'form-control';
        if (this.options.disabled) {
            element.classList.add('disabled');
        }
        if (this.options.readonly) {
            element.classList.add('readonly');
        }

        // Обновляем валидацию
        this.validate();

        logger.debug('Input обновлен', {
            elementId: this.elementId,
            type: this.options.type,
            value: this.options.value,
            isValid: this.isValid
        });
    }

    setupEventListeners() {
        if (!this.exists()) return;

        // Добавляем обработчики событий
        if (this.options.onInput) {
            this.addEventListener('input', (e) => {
                this.options.onInput(e);
                this.validate();
            });
        } else {
            this.addEventListener('input', () => {
                this.validate();
            });
        }

        if (this.options.onChange) {
            this.addEventListener('change', (e) => {
                this.options.onChange(e);
            });
        }

        if (this.options.onFocus) {
            this.addEventListener('focus', (e) => {
                this.options.onFocus(e);
            });
        }

        if (this.options.onBlur) {
            this.addEventListener('blur', (e) => {
                this.options.onBlur(e);
                this.validate(); // Валидация при потере фокуса
            });
        }

        // Добавляем обработчик для обновления валидации
        this.addEventListener('keyup', () => {
            this.validate();
        });
    }

    setupValidation() {
        if (!this.exists() || !this.options.showValidation) return;

        // Создаем элемент для сообщения об ошибке
        this.validationElement = document.createElement('div');
        this.validationElement.className = 'invalid-feedback';
        this.validationElement.style.cssText = `
            display: block;
            margin-top: 4px;
            font-size: 12px;
            color: var(--color-danger);
        `;

        // Добавляем после input элемента
        const element = this.getElement();
        element.parentNode?.insertBefore(this.validationElement, element.nextSibling);
    }

    /**
     * Валидация значения
     * @returns {boolean} результат валидации
     */
    validate() {
        if (!this.exists()) return true;

        const element = this.getElement();
        let isValid = true;
        let validationError = '';

        // Проверка required
        if (this.options.required && !element.value.trim()) {
            isValid = false;
            validationError = this.options.validationMessage || 'Поле обязательно для заполнения';
        }

        // Проверка minLength
        if (isValid && this.options.minLength !== null && element.value.length < this.options.minLength) {
            isValid = false;
            validationError = this.options.validationMessage || `Минимальная длина: ${this.options.minLength} символов`;
        }

        // Проверка maxLength
        if (isValid && this.options.maxLength !== null && element.value.length > this.options.maxLength) {
            isValid = false;
            validationError = this.options.validationMessage || `Максимальная длина: ${this.options.maxLength} символов`;
        }

        // Проверка pattern
        if (isValid && this.options.pattern && element.value && !new RegExp(this.options.pattern).test(element.value)) {
            isValid = false;
            validationError = this.options.validationMessage || 'Неверный формат данных';
        }

        // Проверка custom validation
        if (isValid && this.options.onValidate) {
            try {
                logger.time('custom-validation');
                const customValidation = this.options.onValidate(element.value);
                if (customValidation !== true) {
                    isValid = false;
                    validationError = customValidation || 'Неверное значение';
                }
                logger.timeEnd('custom-validation');
            } catch (error) {
                logger.time('validation-error-handling');
                logger.error('Ошибка в пользовательской валидации', {
                    error: error.message,
                    elementId: this.elementId,
                    value: this.getValue()
                });
                logger.timeEnd('validation-error-handling');
                return false;
            }
        }

        this.isValid = isValid;
        this.validationError = validationError;

        // Обновляем UI валидации
        this.updateValidationUI();

        return isValid;
    }

    updateValidationUI() {
        if (!this.exists()) return;

        const element = this.getElement();

        if (this.isValid) {
            element.classList.remove('is-invalid', 'is-valid');
            element.classList.add('is-valid');
            if (this.validationElement) {
                this.validationElement.textContent = '';
                this.validationElement.style.display = 'none';
            }
        } else {
            element.classList.remove('is-valid');
            element.classList.add('is-invalid');
            if (this.validationElement) {
                this.validationElement.textContent = this.validationError;
                this.validationElement.style.display = 'block';
            }
        }

        // Обновляем aria-invalid
        element.setAttribute('aria-invalid', !this.isValid);
    }

    /**
     * Установка значения
     * @param {string} value - значение
     * @param {boolean} validate - валидировать ли значение
     * @returns {InputComponent} текущий экземпляр
     */
    setValue(value, validate = true) {
        this.options.value = value;
        if (this.exists()) {
            this.getElement().value = value;
        }
        if (validate) {
            this.validate();
        }
        return this;
    }

    /**
     * Получение значения
     * @returns {string} значение
     */
    getValue() {
        return this.exists() ? this.getElement().value : this.options.value;
    }

    /**
     * Установка placeholder
     * @param {string} placeholder - placeholder
     * @returns {InputComponent} текущий экземпляр
     */
    setPlaceholder(placeholder) {
        this.options.placeholder = placeholder;
        if (this.exists()) {
            this.getElement().placeholder = placeholder;
        }
        return this;
    }

    /**
     * Установка состояния disabled
     * @param {boolean} disabled - состояние disabled
     * @returns {InputComponent} текущий экземпляр
     */
    setDisabled(disabled) {
        this.options.disabled = disabled;
        if (this.exists()) {
            this.getElement().disabled = disabled;
        }
        return this;
    }

    /**
     * Установка состояния readonly
     * @param {boolean} readonly - состояние readonly
     * @returns {InputComponent} текущий экземпляр
     */
    setReadonly(readonly) {
        this.options.readonly = readonly;
        if (this.exists()) {
            this.getElement().readOnly = readonly;
        }
        return this;
    }

    /**
     * Установка required
     * @param {boolean} required - состояние required
     * @returns {InputComponent} текущий экземпляр
     */
    setRequired(required) {
        this.options.required = required;
        if (this.exists()) {
            this.getElement().required = required;
        }
        return this;
    }

    /**
     * Установка minLength
     * @param {number} minLength - минимальная длина
     * @returns {InputComponent} текущий экземпляр
     */
    setMinLength(minLength) {
        this.options.minLength = minLength;
        if (this.exists()) {
            this.getElement().minLength = minLength;
        }
        return this;
    }

    /**
     * Установка maxLength
     * @param {number} maxLength - максимальная длина
     * @returns {InputComponent} текущий экземпляр
     */
    setMaxLength(maxLength) {
        this.options.maxLength = maxLength;
        if (this.exists()) {
            this.getElement().maxLength = maxLength;
        }
        return this;
    }

    /**
     * Установка pattern
     * @param {string} pattern - регулярное выражение
     * @returns {InputComponent} текущий экземпляр
     */
    setPattern(pattern) {
        this.options.pattern = pattern;
        if (this.exists()) {
            this.getElement().pattern = pattern;
        }
        return this;
    }

    /**
     * Получение состояния валидации
     * @returns {Object} состояние валидации
     */
    getValidationState() {
        return {
            isValid: this.isValid,
            error: this.validationError,
            value: this.getValue()
        };
    }

    /**
     * Очистка значения
     * @returns {InputComponent} текущий экземпляр
     */
    clear() {
        this.setValue('', false);
        return this;
    }

    /**
     * Фокус на поле ввода
     * @returns {InputComponent} текущий экземпляр
     */
    focus() {
        if (this.exists()) {
            this.getElement().focus();
        }
        return this;
    }

    /**
     * Снятие фокуса с поля ввода
     * @returns {InputComponent} текущий экземпляр
     */
    blur() {
        if (this.exists()) {
            this.getElement().blur();
        }
        return this;
    }

    /**
     * Выбор текста в поле ввода
     * @returns {InputComponent} текущий экземпляр
     */
    select() {
        if (this.exists()) {
            this.getElement().select();
        }
        return this;
    }

    /**
     * Создание стандартного input
     * @param {Object} options - опции input
     * @returns {InputComponent} экземпляр input
     */
    static create(options = {}) {
        const input = new InputComponent(null, null, options);
        input.initialize();
        return input;
    }

    /**
     * Создание text input
     * @param {Object} options - опции
     * @returns {InputComponent} экземпляр input
     */
    static text(options = {}) {
        return InputComponent.create({
            type: 'text',
            ...options
        });
    }

    /**
     * Создание password input
     * @param {Object} options - опции
     * @returns {InputComponent} экземпляр input
     */
    static password(options = {}) {
        return InputComponent.create({
            type: 'password',
            ...options
        });
    }

    /**
     * Создание email input
     * @param {Object} options - опции
     * @returns {InputComponent} экземпляр input
     */
    static email(options = {}) {
        return InputComponent.create({
            type: 'email',
            ...options
        });
    }

    /**
     * Создание number input
     * @param {Object} options - опции
     * @returns {InputComponent} экземпляр input
     */
    static number(options = {}) {
        return InputComponent.create({
            type: 'number',
            ...options
        });
    }

    /**
     * Создание search input
     * @param {Object} options - опции
     * @returns {InputComponent} экземпляр input
     */
    static search(options = {}) {
        return InputComponent.create({
            type: 'search',
            ...options
        });
    }

    /**
     * Создание required input
     * @param {Object} options - опции
     * @returns {InputComponent} экземпляр input
     */
    static required(options = {}) {
        return InputComponent.create({
            required: true,
            ...options
        });
    }

    /**
     * Создание disabled input
     * @param {Object} options - опции
     * @returns {InputComponent} экземпляр input
     */
    static disabled(options = {}) {
        return InputComponent.create({
            disabled: true,
            ...options
        });
    }

    /**
     * Создание readonly input
     * @param {Object} options - опции
     * @returns {InputComponent} экземпляр input
     */
    static readonly(options = {}) {
        return InputComponent.create({
            readonly: true,
            ...options
        });
    }

    onDestroy() {
        // Удаляем элемент валидации
        if (this.validationElement && this.validationElement.parentNode) {
            this.validationElement.parentNode.removeChild(this.validationElement);
        }
        this.validationElement = null;
    }

    /**
     * Получение состояния input
     * @returns {Object} состояние input
     */
    getInputState() {
        return {
            value: this.getValue(),
            isValid: this.isValid,
            error: this.validationError,
            disabled: this.options.disabled,
            readonly: this.options.readonly,
            required: this.options.required,
            elementExists: this.exists()
        };
    }
}

export { InputComponent };
