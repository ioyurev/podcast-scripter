/**
 * Компонент кнопки
 */

import { logger } from '../logger.js';

import { ComponentBase } from './component-base.js';

class ButtonComponent extends ComponentBase {
    constructor(elementId = null, element = null, options = {}) {
        super(elementId, element);
        this.options = {
            type: 'button', // button, submit, reset
            variant: 'primary', // primary, secondary, success, danger, warning, info, light, dark
            size: 'md', // sm, md, lg
            disabled: false,
            loading: false,
            icon: null, // feather icon name
            text: '',
            ...options
        };
        this.originalText = '';
    }

    async onInitialize() {
        if (!this.exists()) {
            // Создаем кнопку если элемент не существует
            this.createButton();
        }
        this.updateButton();
        this.setupEventListeners();
    }

    createButton() {
        const button = document.createElement('button');
        button.type = this.options.type;
        button.className = 'btn';
        this.element = button;
        this.originalText = this.options.text;
    }

    updateButton() {
        if (!this.exists()) return;

        const element = this.getElement();

        // Обновляем текст
        if (this.options.loading) {
            this.originalText = element.textContent || this.options.text;
            element.innerHTML = '<i data-feather="loader" class="btn-loader-icon"></i> Загрузка...';
        } else {
            if (this.options.icon) {
                element.innerHTML = `<i data-feather="${this.options.icon}"></i> ${this.options.text}`;
            } else {
                element.textContent = this.options.text;
            }
        }

        // Обновляем CSS классы
        element.className = `btn btn-${this.options.variant} btn-${this.options.size}`;
        if (this.options.disabled || this.options.loading) {
            element.disabled = true;
            element.classList.add('disabled');
        } else {
            element.disabled = false;
            element.classList.remove('disabled');
        }

        // Инициализация Feather Icons
        if (typeof feather !== 'undefined') {
            requestAnimationFrame(() => {
                feather.replace();
            });
        }

        logger.debug('Кнопка обновлена', {
            elementId: this.elementId,
            text: this.options.text,
            variant: this.options.variant,
            loading: this.options.loading
        });
    }

    setupEventListeners() {
        if (!this.exists()) return;

        // Добавляем обработчик клика
        this.addEventListener('click', (e) => {
            if (this.options.loading) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            if (this.options.onClick) {
                try {
                    this.options.onClick(e);
                } catch (error) {
                    logger.error('Ошибка в обработчике клика кнопки', {
                        error: error.message
                    });
                }
            }
        });

        // Добавляем обработчик наведения для анимации
        this.addEventListener('mouseenter', () => {
            if (!this.options.loading && !this.options.disabled) {
                this.addClass('hover');
            }
        });

        this.addEventListener('mouseleave', () => {
            this.removeClass('hover');
        });
    }

    /**
     * Установка состояния загрузки
     * @param {boolean} loading - состояние загрузки
     * @returns {ButtonComponent} текущий экземпляр
     */
    setLoading(loading) {
        this.options.loading = loading;
        this.updateButton();
        return this;
    }

    /**
     * Установка текста кнопки
     * @param {string} text - текст кнопки
     * @returns {ButtonComponent} текущий экземпляр
     */
    setText(text) {
        this.options.text = text;
        this.updateButton();
        return this;
    }

    /**
     * Установка иконки кнопки
     * @param {string} icon - имя иконки Feather
     * @returns {ButtonComponent} текущий экземпляр
     */
    setIcon(icon) {
        this.options.icon = icon;
        this.updateButton();
        return this;
    }

    /**
     * Установка варианта кнопки
     * @param {string} variant - вариант (primary, secondary, etc.)
     * @returns {ButtonComponent} текущий экземпляр
     */
    setVariant(variant) {
        this.options.variant = variant;
        this.updateButton();
        return this;
    }

    /**
     * Установка размера кнопки
     * @param {string} size - размер (sm, md, lg)
     * @returns {ButtonComponent} текущий экземпляр
     */
    setSize(size) {
        this.options.size = size;
        this.updateButton();
        return this;
    }

    /**
     * Установка состояния отключения
     * @param {boolean} disabled - состояние отключения
     * @returns {ButtonComponent} текущий экземпляр
     */
    setDisabled(disabled) {
        this.options.disabled = disabled;
        this.updateButton();
        return this;
    }

    /**
     * Получение состояния загрузки
     * @returns {boolean} состояние загрузки
     */
    isLoading() {
        return this.options.loading;
    }

    /**
     * Получение состояния отключения
     * @returns {boolean} состояние отключения
     */
    isDisabled() {
        return this.options.disabled || this.options.loading;
    }

    /**
     * Выполнение асинхронного действия с кнопкой
     * @param {Function} asyncAction - асинхронная функция
     * @param {Object} options - опции
     * @returns {Promise<any>} результат асинхронного действия
     */
    async executeAsync(asyncAction, options = {}) {
        if (this.isDisabled()) {
            logger.warn('Попытка выполнить действие на отключенной кнопке');
            return null;
        }

        try {
            this.setLoading(true);

            const result = await asyncAction();

            if (options.successText) {
                const originalText = this.options.text;
                this.setText(options.successText);
                if (options.successTimeout) {
                    setTimeout(() => {
                        this.setText(originalText);
                    }, options.successTimeout);
                }
            }

            return result;
        } catch (error) {
            logger.time('error-handling');
            logger.error('Ошибка при выполнении асинхронного действия кнопки', {
                error: error.message
            });

            if (options.errorText) {
                const originalText = this.options.text;
                this.setText(options.errorText);
                if (options.errorTimeout) {
                    setTimeout(() => {
                        this.setText(originalText);
                    }, options.errorTimeout);
                }
            }

            logger.timeEnd('error-handling');
            throw error;
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Создание стандартной кнопки
     * @param {Object} options - опции кнопки
     * @returns {ButtonComponent} экземпляр кнопки
     */
    static create(options = {}) {
        const button = new ButtonComponent(null, null, options);
        button.initialize();
        return button;
    }

    /**
     * Создание кнопки с иконкой
     * @param {string} icon - имя иконки Feather
     * @param {string} text - текст кнопки
     * @param {Object} options - дополнительные опции
     * @returns {ButtonComponent} экземпляр кнопки
     */
    static createWithIcon(icon, text, options = {}) {
        return ButtonComponent.create({
            icon,
            text,
            ...options
        });
    }

    /**
     * Создание primary кнопки
     * @param {string} text - текст кнопки
     * @param {Object} options - опции
     * @returns {ButtonComponent} экземпляр кнопки
     */
    static primary(text, options = {}) {
        return ButtonComponent.create({
            text,
            variant: 'primary',
            ...options
        });
    }

    /**
     * Создание secondary кнопки
     * @param {string} text - текст кнопки
     * @param {Object} options - опции
     * @returns {ButtonComponent} экземпляр кнопки
     */
    static secondary(text, options = {}) {
        return ButtonComponent.create({
            text,
            variant: 'secondary',
            ...options
        });
    }

    /**
     * Создание danger кнопки
     * @param {string} text - текст кнопки
     * @param {Object} options - опции
     * @returns {ButtonComponent} экземпляр кнопки
     */
    static danger(text, options = {}) {
        return ButtonComponent.create({
            text,
            variant: 'danger',
            ...options
        });
    }

    /**
     * Создание success кнопки
     * @param {string} text - текст кнопки
     * @param {Object} options - опции
     * @returns {ButtonComponent} экземпляр кнопки
     */
    static success(text, options = {}) {
        return ButtonComponent.create({
            text,
            variant: 'success',
            ...options
        });
    }

    /**
     * Создание warning кнопки
     * @param {string} text - текст кнопки
     * @param {Object} options - опции
     * @returns {ButtonComponent} экземпляр кнопки
     */
    static warning(text, options = {}) {
        return ButtonComponent.create({
            text,
            variant: 'warning',
            ...options
        });
    }

    /**
     * Создание large кнопки
     * @param {string} text - текст кнопки
     * @param {Object} options - опции
     * @returns {ButtonComponent} экземпляр кнопки
     */
    static large(text, options = {}) {
        return ButtonComponent.create({
            text,
            size: 'lg',
            ...options
        });
    }

    /**
     * Создание small кнопки
     * @param {string} text - текст кнопки
     * @param {Object} options - опции
     * @returns {ButtonComponent} экземпляр кнопки
     */
    static small(text, options = {}) {
        return ButtonComponent.create({
            text,
            size: 'sm',
            ...options
        });
    }

    /**
     * Создание disabled кнопки
     * @param {string} text - текст кнопки
     * @param {Object} options - опции
     * @returns {ButtonComponent} экземпляр кнопки
     */
    static disabled(text, options = {}) {
        return ButtonComponent.create({
            text,
            disabled: true,
            ...options
        });
    }

    /**
     * Создание loading кнопки
     * @param {string} text - текст кнопки
     * @param {Object} options - опции
     * @returns {ButtonComponent} экземпляр кнопки
     */
    static loading(text, options = {}) {
        return ButtonComponent.create({
            text,
            loading: true,
            ...options
        });
    }

    onDestroy() {
        // Сбрасываем состояние
        this.options.loading = false;
        this.updateButton();
    }

    /**
     * Получение состояния кнопки
     * @returns {Object} состояние кнопки
     */
    getButtonState() {
        return {
            text: this.options.text,
            variant: this.options.variant,
            size: this.options.size,
            disabled: this.options.disabled,
            loading: this.options.loading,
            type: this.options.type,
            icon: this.options.icon,
            elementExists: this.exists()
        };
    }
}

export { ButtonComponent };
