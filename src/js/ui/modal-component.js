/**
 * Компонент модального окна
 */

import { logger } from '../logger.js';

import { ComponentBase } from './component-base.js';
import { modalService } from './modal-service.js';

class ModalComponent extends ComponentBase {
    constructor(options = {}) {
        // Create the modal elements first, then pass the modal element to the base constructor
        const tempModal = document.createElement('div');
        super(null, tempModal); // Pass the modal element to base constructor
        this.options = {
            title: '',
            content: '',
            type: 'default', // default, confirmation, input, notification, custom
            size: 'md', // sm, md, lg, xl, full
            buttons: [], // [{text, icon, onClick, type, className}, ...]
            onClose: null,
            closable: true,
            closeOnEscape: true,
            showCloseButton: true,
            className: '',
            zIndex: 1000,
            metadata: {}, // Дополнительные метаданные для регистрации в реестре
            ...options
        };
        this.overlay = null;
        this.modal = null;
        this.resolvePromise = null;
        this.rejectPromise = null;
        this.modalId = null; // Уникальный ID модального окна
    }

    async onInitialize() {
        await this.createModal();
        this.setupEventListeners();
        this.registerWithModalService();
    }

    /**
     * Регистрация модального окна в сервисе модальных окон
     */
    registerWithModalService() {
        try {
            this.modalId = modalService.generateModalId();
            const metadata = {
                title: this.options.title,
                type: this.options.type,
                content: this.options.content,
                fileName: this.options.fileName, // Добавляем fileName из опций
                fileType: this.options.fileType,
                fileSize: this.options.fileSize,
                ...this.options.metadata // Дополнительные метаданные из опций
            };
            modalService.registerModal(this.modalId, this, metadata);
        } catch (error) {
            logger.time('modal-registration-error');
            logger.error('Ошибка при регистрации модального окна в сервисе', {
                error: error.message,
                modalId: this.id
            });
            logger.timeEnd('modal-registration-error');
        }
    }

    /**
     * Дерегистрация модального окна из сервиса модальных окон
     */
    unregisterFromModalService() {
        try {
            if (this.modalId) {
                modalService.unregisterModal(this.modalId);
                this.modalId = null;
            }
        } catch (error) {
            logger.error('Ошибка при дерегистрации модального окна из сервиса', {
                error: error.message,
                modalId: this.modalId
            });
        }
    }

    async createModal() {
        return new Promise((resolve, reject) => {
            try {
                this.resolvePromise = resolve;
                this.rejectPromise = reject;

                // Создаем overlay
                this.overlay = document.createElement('div');
                this.overlay.className = 'modal-overlay';
                // Устанавливаем ID модального окна в data-атрибут для поиска в DOM
                if (this.modalId) {
                    this.overlay.setAttribute('data-modal-id', this.modalId);
                }
                this.overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: ${this.options.zIndex};
                    animation: fadeIn 0.2s ease-in-out;
                `;

                // Определяем CSS классы в зависимости от типа
                const modalClasses = [
                    'modal-content',
                    `modal-${this.options.type}`,
                    `modal-${this.options.size}`,
                    this.options.className
                ].filter(Boolean).join(' ');

                // Создаем модальное окно
                this.modal = document.createElement('div');
                this.modal.className = modalClasses;
                this.modal.style.cssText = `
                    background: var(--color-white);
                    border-radius: 8px;
                    box-shadow: var(--shadow-lg);
                    max-width: 500px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    animation: slideIn 0.2s ease-in-out;
                    display: flex;
                    flex-direction: column;
                `;

                // Устанавливаем размер в зависимости от конфигурации
                this.setSizeStyles();

                // Заголовок
                if (this.options.title) {
                    this.createHeader();
                }

                // Основное содержимое
                this.createBody();

                // Кнопки
                if (this.options.buttons && this.options.buttons.length > 0) {
                    this.createFooter();
                }

                this.overlay.appendChild(this.modal);
                document.body.appendChild(this.overlay);

                // Устанавливаем созданный модал как основной элемент для компонента
                this.element = this.modal;
                this.elementId = null; // No specific ID needed

                // Инициализация Feather Icons
                if (typeof feather !== 'undefined') {
                    requestAnimationFrame(() => {
                        feather.replace();
                    });
                }

                // Фокус на первом элементе управления
                this.focusFirstElement();

                logger.info('Modal создан', {
                    title: this.options.title,
                    type: this.options.type,
                    buttonCount: this.options.buttons.length
                });

            } catch (error) {
                logger.error('Ошибка при создании модального окна', {
                    error: error.message
                });
                reject(error);
            }
        });
    }

    setSizeStyles() {
        const sizeStyles = {
            'sm': 'max-width: 400px; width: 80%;',
            'md': 'max-width: 500px; width: 90%;',
            'lg': 'max-width: 700px; width: 90%;',
            'xl': 'max-width: 900px; width: 95%;',
            'full': 'max-width: 95vw; width: 95vw; height: 90vh;'
        };

        if (sizeStyles[this.options.size]) {
            this.modal.style.cssText += sizeStyles[this.options.size];
        }
    }

    createHeader() {
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.style.cssText = `
            padding: 20px;
            border-bottom: 1px solid var(--color-gray-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        const titleElement = document.createElement('h3');
        titleElement.style.cssText = `
            margin: 0;
            color: var(--color-text-primary);
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        titleElement.innerHTML = this.getTitleWithIcon();
        header.appendChild(titleElement);

        // Кнопка закрытия
        if (this.options.showCloseButton) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'modal-close-btn';
            closeBtn.style.cssText = `
                background: none;
                border: none;
                font-size: 1.5em;
                cursor: pointer;
                color: var(--color-text-secondary);
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all var(--transition-fast);
            `;
            closeBtn.innerHTML = '<i data-feather="x"></i>';
            closeBtn.addEventListener('click', () => {
                this.closeModal(null);
            });
            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.style.color = 'var(--color-danger)';
            });
            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.color = 'var(--color-text-secondary)';
            });
            header.appendChild(closeBtn);
        }

        this.modal.appendChild(header);
    }

    createBody() {
        const body = document.createElement('div');
        body.className = 'modal-body';
        body.style.cssText = `
            padding: ${this.options.title ? '0 20px' : '20px'};
            flex: 1;
            overflow-y: auto;
        `;

        if (typeof this.options.content === 'function') {
            // Если content - функция, вызываем её с контекстом для добавления элементов
            const contentResult = this.options.content(body);
            if (contentResult) {
                body.appendChild(contentResult);
            }
        } else if (typeof this.options.content === 'string') {
            body.textContent = this.options.content;
        } else if (this.options.content instanceof HTMLElement) {
            body.appendChild(this.options.content);
        } else {
            body.appendChild(this.createContentElement(this.options.content));
        }

        this.modal.appendChild(body);
    }

    createFooter() {
        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        footer.style.cssText = `
            padding: 20px;
            border-top: 1px solid var(--color-gray-border);
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        `;

        this.options.buttons.forEach((buttonConfig) => {
            const button = this.createButton(buttonConfig);
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const result = buttonConfig.onClick ? buttonConfig.onClick(e) : true;
                if (buttonConfig.autoClose !== false) {
                    this.closeModal(result);
                } else {
                    // Для кнопок без автозакрытия просто возвращаем результат
                    if (this.resolvePromise) {
                        this.resolvePromise(result);
                    }
                }
            });
            footer.appendChild(button);
        });

        this.modal.appendChild(footer);
    }

    createButton(config) {
        const button = document.createElement('button');
        const defaults = {
            text: 'OK',
            icon: null,
            type: 'secondary', // primary, secondary, danger, success, warning
            className: '',
            autoClose: true
        };

        const buttonConfig = { ...defaults, ...config };

        const typeClasses = {
            'primary': 'btn btn-primary',
            'secondary': 'btn btn-secondary',
            'danger': 'btn btn-danger',
            'success': 'btn btn-success',
            'warning': 'btn btn-warning'
        };

        button.className = [
            typeClasses[buttonConfig.type] || typeClasses.secondary,
            buttonConfig.className
        ].filter(Boolean).join(' ');

        button.style.cssText += `
            cursor: pointer;
            font-weight: 600;
            transition: all var(--transition-fast);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        `;

        if (buttonConfig.icon) {
            button.innerHTML = `<i data-feather="${buttonConfig.icon}"></i> ${buttonConfig.text}`;
        } else {
            button.textContent = buttonConfig.text;
        }

        return button;
    }

    createContentElement(content) {
        const container = document.createElement('div');
        if (typeof content === 'string') {
            container.textContent = content;
        } else if (content instanceof HTMLElement) {
            container.appendChild(content);
        } else if (Array.isArray(content)) {
            content.forEach(item => {
                if (typeof item === 'string') {
                    const p = document.createElement('p');
                    p.textContent = item;
                    container.appendChild(p);
                } else if (item instanceof HTMLElement) {
                    container.appendChild(item);
                }
            });
        }
        return container;
    }

    getTitleWithIcon() {
        const icons = {
            'confirmation': '⚠️',
            'input': '📥',
            'notification': '🔔',
            'warning': '⚠️',
            'error': '❌',
            'success': '✅',
            'info': 'ℹ️',
            'edit': '✏️'
        };

        const icon = icons[this.options.type] || '';
        return `${icon} ${this.options.title}`.trim();
    }

    focusFirstElement() {
        setTimeout(() => {
            const firstInput = this.modal.querySelector('input, textarea, select, button');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }

    setupEventListeners() {
        // Обработчик клика по overlay
        if (this.options.closable) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.closeModal(null);
                }
            });
        }

        // Обработчик нажатия Escape
        if (this.options.closeOnEscape) {
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    this.closeModal(null);
                }
            };
            document.addEventListener('keydown', handleEscape);

            // Добавляем обработчик для очистки
            this.addLifecycleCallback('destroy', () => {
                document.removeEventListener('keydown', handleEscape);
            });
        }
    }

    /**
     * Закрытие модального окна
     * @param {*} result - результат закрытия
     */
    closeModal(result = null) {
        if (this.options.onClose) {
            try {
                this.options.onClose(result);
            } catch (error) {
                logger.error('Ошибка в обработчике onClose модального окна', {
                    error: error.message
                });
            }
        }

        // Дерегистрация модального окна из сервиса перед закрытием
        this.unregisterFromModalService();

        // Анимация закрытия
        this.overlay.style.animation = 'fadeOut 0.2s ease-in-out';

        setTimeout(() => {
            if (this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }

            if (this.resolvePromise) {
                this.resolvePromise(result);
            }

            // Уничтожаем компонент
            this.destroy();
        }, 200);
    }

    /**
     * Показ модального окна
     * @param {Object} options - опции модального окна
     * @returns {Promise} Promise с результатом закрытия
     */
    static show(options = {}) {
        return new Promise((resolve, reject) => {
            const modal = new ModalComponent({
                ...options,
                onClose: (result) => {
                    if (options.onClose) {
                        try {
                            options.onClose(result);
                        } catch (error) {
                            logger.error('Ошибка в пользовательском onClose', {
                                error: error.message
                            });
                        }
                    }
                    resolve(result);
                }
            });

            modal.initialize().catch(error => {
                reject(error);
            });
        });
    }

    /**
     * Показ модального окна подтверждения
     * @param {string} title - заголовок
     * @param {string} message - сообщение
     * @param {string} confirmText - текст кнопки подтверждения
     * @param {string} cancelText - текст кнопки отмены
     * @returns {Promise} Promise с результатом (true/false)
     */
    static showConfirmation(title, message, confirmText = 'Подтвердить', cancelText = 'Отмена') {
        return ModalComponent.show({
            title: title,
            content: message,
            type: 'confirmation',
            buttons: [
                {
                    text: cancelText,
                    icon: 'x-circle',
                    type: 'secondary',
                    onClick: () => false,
                    autoClose: true
                },
                {
                    text: confirmText,
                    icon: 'check',
                    type: 'danger',
                    onClick: () => true,
                    autoClose: true
                }
            ]
        });
    }

    /**
     * Показ модального окна с вводом текста
     * @param {string} title - заголовок
     * @param {string} placeholder - placeholder
     * @param {string} defaultValue - значение по умолчанию
     * @returns {Promise} Promise с введенным значением или null
     */
    static showInput(title, placeholder, defaultValue = '') {
        return ModalComponent.show({
            title: title,
            type: 'input',
            content: (container) => {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'form-control';
                input.style.cssText = `
                    width: 100%;
                    padding: 10px;
                    border: 2px solid var(--color-gray-border);
                    border-radius: 4px;
                    font-size: 14px;
                    font-family: Arial, sans-serif;
                    box-sizing: border-box;
                `;
                input.placeholder = placeholder;
                input.value = defaultValue;
                input.focus();
                input.select();

                // Обработка Enter
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        // Это будет обработано через кнопки
                    }
                });

                container.appendChild(input);
                return input;
            },
            buttons: [
                {
                    text: 'Отмена',
                    icon: 'x-circle',
                    type: 'secondary',
                    onClick: () => null,
                    autoClose: true
                },
                {
                    text: 'ОК',
                    icon: 'check',
                    type: 'primary',
                    onClick: () => {
                        const input = container.querySelector('input');
                        return input.value.trim() || null;
                    },
                    autoClose: true
                }
            ]
        });
    }

    /**
     * Показ информационного модального окна
     * @param {string} title - заголовок
     * @param {string} message - сообщение
     * @returns {Promise} Promise с результатом
     */
    static showInfo(title, message) {
        return ModalComponent.show({
            title: title,
            content: message,
            type: 'info',
            buttons: [
                {
                    text: 'OK',
                    icon: 'check',
                    type: 'primary',
                    onClick: () => true,
                    autoClose: true
                }
            ]
        });
    }

    /**
     * Показ модального окна с выбором
     * @param {string} title - заголовок
     * @param {Array} options - массив опций [{value, text}]
     * @returns {Promise} Promise с выбранным значением
     */
    static showSelect(title, options) {
        return ModalComponent.show({
            title: title,
            type: 'select',
            content: (container) => {
                const select = document.createElement('select');
                select.className = 'form-select';
                select.style.cssText = `
                    width: 100%;
                    padding: 10px;
                    border: 2px solid var(--color-gray-border);
                    border-radius: 4px;
                    font-size: 14px;
                    font-family: Arial, sans-serif;
                    box-sizing: border-box;
                `;

                options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.value;
                    optionElement.textContent = option.text;
                    select.appendChild(optionElement);
                });

                select.focus();

                container.appendChild(select);
                return select;
            },
            buttons: [
                {
                    text: 'Отмена',
                    icon: 'x-circle',
                    type: 'secondary',
                    onClick: () => null,
                    autoClose: true
                },
                {
                    text: 'ОК',
                    icon: 'check',
                    type: 'primary',
                    onClick: () => {
                        const select = container.querySelector('select');
                        return select.value;
                    },
                    autoClose: true
                }
            ]
        });
    }

    onDestroy() {
        // Убираем обработчики событий
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }

        // Очищаем промисы
        this.resolvePromise = null;
        this.rejectPromise = null;
    }

    /**
     * Закрытие всех активных модальных окон
     */
    static closeAll() {
        const overlays = document.querySelectorAll('.modal-overlay');
        overlays.forEach(overlay => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        });
    }

    /**
     * Проверка наличия активных модальных окон
     * @returns {boolean} есть ли активные модальные окна
     */
    static hasActiveModal() {
        return document.querySelectorAll('.modal-overlay').length > 0;
    }

    /**
     * Получение состояния модального окна
     * @returns {Object} состояние модального окна
     */
    getModalState() {
        return {
            title: this.options.title,
            type: this.options.type,
            size: this.options.size,
            buttonCount: this.options.buttons.length,
            isClosable: this.options.closable,
            hasOverlay: !!this.overlay,
            elementExists: this.exists()
        };
    }
}

export { ModalComponent };
