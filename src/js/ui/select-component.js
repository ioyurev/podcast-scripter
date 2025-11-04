/**
 * Компонент выбора (select)
 */

import { logger } from '../logger.js';

import { ComponentBase } from './component-base.js';

class SelectComponent extends ComponentBase {
    constructor(elementId = null, element = null, options = {}) {
        super(elementId, element);
        this.options = {
            options: [], // [{value: 'value', text: 'text', disabled: false}, ...]
            value: '',
            disabled: false,
            required: false,
            placeholder: 'Выберите опцию',
            showPlaceholder: true,
            multiple: false,
            size: null, // number for size attribute
            onChange: null,
            onValidate: null, // custom validation function
            validationMessage: '',
            showValidation: true,
            ...options
        };
        this.isValid = true;
        this.validationError = '';
        this.validationElement = null;
    }

    async onInitialize() {
        if (!this.exists()) {
            // Создаем select если элемент не существует
            this.createSelect();
        }
        this.updateSelect();
        this.setupEventListeners();
        this.setupValidation();
    }

    createSelect() {
        const select = document.createElement('select');
        select.className = 'form-select';
        if (this.options.multiple) {
            select.multiple = true;
        }
        if (this.options.size) {
            select.size = this.options.size;
        }
        this.element = select;
    }

    updateSelect() {
        if (!this.exists()) return;

        const element = this.getElement();

        // Очищаем существующие опции
        element.innerHTML = '';

        // Добавляем placeholder если нужно
        if (this.options.showPlaceholder && !this.options.multiple) {
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = this.options.placeholder;
            placeholderOption.disabled = true;
            placeholderOption.selected = !this.options.value;
            element.appendChild(placeholderOption);
        }

        // Добавляем опции
        this.options.options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            optionElement.disabled = !!option.disabled;
            optionElement.selected = this.isOptionSelected(option.value);
            element.appendChild(optionElement);
        });

        // Устанавливаем значение
        if (this.options.multiple) {
            const values = Array.isArray(this.options.value) ? this.options.value : [];
            Array.from(element.options).forEach(option => {
                option.selected = values.includes(option.value);
            });
        } else {
            element.value = this.options.value;
        }

        // Обновляем атрибуты
        element.disabled = this.options.disabled;
        element.required = this.options.required;

        // Обновляем CSS классы
        element.className = 'form-select';
        if (this.options.disabled) {
            element.classList.add('disabled');
        }

        // Обновляем валидацию
        this.validate();

        logger.debug('Select обновлен', {
            elementId: this.elementId,
            value: this.options.value,
            isValid: this.isValid,
            optionCount: this.options.options.length
        });
    }

    setupEventListeners() {
        if (!this.exists()) return;

        // Добавляем обработчик изменения
        this.addEventListener('change', (e) => {
            if (this.options.multiple) {
                // Для multiple select получаем все выбранные значения
                const selectedValues = Array.from(e.target.selectedOptions).map(option => option.value);
                this.options.value = selectedValues;
            } else {
                this.options.value = e.target.value;
            }

            if (this.options.onChange) {
                try {
                    this.options.onChange(e, this.options.value);
                } catch (error) {
                    logger.error('Ошибка в обработчике изменения select', {
                        error: error.message
                    });
                }
            }

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

        // Добавляем после select элемента
        const element = this.getElement();
        element.parentNode?.insertBefore(this.validationElement, element.nextSibling);
    }

    /**
     * Проверка, выбрана ли опция
     * @param {string} value - значение опции
     * @returns {boolean} выбрана ли опция
     */
    isOptionSelected(value) {
        if (this.options.multiple) {
            const values = Array.isArray(this.options.value) ? this.options.value : [];
            return values.includes(value);
        } else {
            return this.options.value === value;
        }
    }

    /**
     * Валидация значения
     * @returns {boolean} результат валидации
     */
    validate() {
        if (!this.exists()) return true;

        let isValid = true;
        let validationError = '';

        // Проверка required
        if (this.options.required) {
            if (this.options.multiple) {
                const values = Array.isArray(this.options.value) ? this.options.value : [];
                if (values.length === 0 || (values.length === 1 && values[0] === '')) {
                    isValid = false;
                    validationError = this.options.validationMessage || 'Выберите хотя бы одну опцию';
                }
            } else {
                if (!this.options.value || this.options.value === '') {
                    isValid = false;
                    validationError = this.options.validationMessage || 'Выберите опцию';
                }
            }
        }

        // Проверка custom validation
        if (isValid && this.options.onValidate) {
            try {
                logger.time('select-custom-validation');
                const customValidation = this.options.onValidate(this.options.value);
                if (customValidation !== true) {
                    isValid = false;
                    validationError = customValidation || 'Неверное значение';
                }
                logger.timeEnd('select-custom-validation');
            } catch (error) {
                logger.time('select-validation-error-handling');
                logger.error('Ошибка в пользовательской валидации select', {
                    error: error.message,
                    elementId: this.elementId,
                    value: this.getValue()
                });
                logger.timeEnd('select-validation-error-handling');
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
     * Установка опций
     * @param {Array} options - массив опций
     * @returns {SelectComponent} текущий экземпляр
     */
    setOptions(options) {
        this.options.options = options;
        this.updateSelect();
        return this;
    }

    /**
     * Добавление опции
     * @param {Object} option - опция {value, text, disabled}
     * @returns {SelectComponent} текущий экземпляр
     */
    addOption(option) {
        this.options.options.push(option);
        this.updateSelect();
        return this;
    }

    /**
     * Удаление опции по значению
     * @param {string} value - значение опции
     * @returns {SelectComponent} текущий экземпляр
     */
    removeOption(value) {
        this.options.options = this.options.options.filter(option => option.value !== value);
        this.updateSelect();
        return this;
    }

    /**
     * Установка значения
     * @param {string|Array} value - значение
     * @param {boolean} validate - валидировать ли значение
     * @returns {SelectComponent} текущий экземпляр
     */
    setValue(value, validate = true) {
        this.options.value = value;
        if (this.exists()) {
            if (this.options.multiple) {
                const values = Array.isArray(value) ? value : [];
                Array.from(this.getElement().options).forEach(option => {
                    option.selected = values.includes(option.value);
                });
            } else {
                this.getElement().value = value;
            }
        }
        if (validate) {
            this.validate();
        }
        return this;
    }

    /**
     * Получение значения
     * @returns {string|Array} значение
     */
    getValue() {
        if (this.exists()) {
            if (this.options.multiple) {
                return Array.from(this.getElement().selectedOptions).map(option => option.value);
            } else {
                return this.getElement().value;
            }
        }
        return this.options.value;
    }

    /**
     * Установка состояния disabled
     * @param {boolean} disabled - состояние disabled
     * @returns {SelectComponent} текущий экземпляр
     */
    setDisabled(disabled) {
        this.options.disabled = disabled;
        if (this.exists()) {
            this.getElement().disabled = disabled;
        }
        return this;
    }

    /**
     * Установка состояния required
     * @param {boolean} required - состояние required
     * @returns {SelectComponent} текущий экземпляр
     */
    setRequired(required) {
        this.options.required = required;
        if (this.exists()) {
            this.getElement().required = required;
        }
        return this;
    }

    /**
     * Установка placeholder
     * @param {string} placeholder - placeholder
     * @returns {SelectComponent} текущий экземпляр
     */
    setPlaceholder(placeholder) {
        this.options.placeholder = placeholder;
        this.updateSelect();
        return this;
    }

    /**
     * Очистка значения
     * @returns {SelectComponent} текущий экземпляр
     */
    clear() {
        if (this.options.multiple) {
            this.setValue([], false);
        } else {
            this.setValue('', false);
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
     * Создание стандартного select
     * @param {Object} options - опции select
     * @returns {SelectComponent} экземпляр select
     */
    static create(options = {}) {
        const select = new SelectComponent(null, null, options);
        select.initialize();
        return select;
    }

    /**
     * Создание select с опциями
     * @param {Array} options - массив опций
     * @param {Object} selectOptions - опции select
     * @returns {SelectComponent} экземпляр select
     */
    static withOptions(options, selectOptions = {}) {
        return SelectComponent.create({
            options,
            ...selectOptions
        });
    }

    /**
     * Создание multiple select
     * @param {Object} options - опции
     * @returns {SelectComponent} экземпляр select
     */
    static multiple(options = {}) {
        return SelectComponent.create({
            multiple: true,
            ...options
        });
    }

    /**
     * Создание required select
     * @param {Object} options - опции
     * @returns {SelectComponent} экземпляр select
     */
    static required(options = {}) {
        return SelectComponent.create({
            required: true,
            ...options
        });
    }

    /**
     * Создание disabled select
     * @param {Object} options - опции
     * @returns {SelectComponent} экземпляр select
     */
    static disabled(options = {}) {
        return SelectComponent.create({
            disabled: true,
            ...options
        });
    }

    /**
     * Создание select с placeholder
     * @param {string} placeholder - placeholder
     * @param {Object} options - опции
     * @returns {SelectComponent} экземпляр select
     */
    static withPlaceholder(placeholder, options = {}) {
        return SelectComponent.create({
            placeholder,
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
     * Получение состояния select
     * @returns {Object} состояние select
     */
    getSelectState() {
        return {
            value: this.getValue(),
            isValid: this.isValid,
            error: this.validationError,
            disabled: this.options.disabled,
            required: this.options.required,
            multiple: this.options.multiple,
            optionCount: this.options.length,
            elementExists: this.exists()
        };
    }
}

export { SelectComponent };
