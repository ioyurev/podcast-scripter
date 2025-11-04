/**
 * Компонент уведомлений (toast)
 */

import { logger } from '../logger.js';

import { ComponentBase } from './component-base.js';

class ToastComponent extends ComponentBase {
    constructor(options = {}) {
        super(null, null, { isDynamic: true }); // Указываем, что это динамический компонент
        this.options = {
            message: '',
            type: 'info', // info, success, warning, error
            duration: 5000, // ms, 0 for persistent
            showUndo: false,
            onUndo: null,
            position: 'top-right', // top-left, top-right, bottom-left, bottom-right
            ...options
        };
        this.timer = null;
        this.element = null;
    }

    async onInitialize() {
        await this.createToast();
        this.setupEventListeners();
    }

    async createToast() {
        // Создаем элемент тоста
        this.element = document.createElement('div');
        this.element.className = `toast ${this.options.type} ${this.options.position}`;
        this.element.style.cssText = `
            position: fixed;
            z-index: 10001;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            max-width: 400px;
            min-width: 200px;
            padding: 16px 20px;
            background: var(--color-gray-lighter);
            border: 2px solid var(--color-gray-border);
            border-radius: 8px;
            box-shadow: var(--shadow-lg);
            animation: slideIn 0.3s ease-out;
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease-out;
        `;

        // Контент тоста
        const toastContent = document.createElement('div');
        toastContent.className = 'toast-content';
        toastContent.style.cssText = `
            flex: 1;
            min-width: 0;
            font-size: 14px;
            color: var(--color-text-primary);
            line-height: 1.4;
            word-wrap: break-word;
            word-break: break-word;
            overflow-wrap: break-word;
        `;
        toastContent.textContent = this.options.message;

        // Действия тоста
        const toastActions = document.createElement('div');
        toastActions.className = 'toast-actions';
        toastActions.style.cssText = `
            display: flex;
            gap: 8px;
            flex-shrink: 0;
        `;

        // Кнопка отмены
        if (this.options.showUndo && this.options.onUndo) {
            const undoBtn = document.createElement('button');
            undoBtn.innerHTML = '<i data-feather="rotate-ccw"></i> Отменить';
            undoBtn.className = 'btn btn-sm btn-warning toast-btn undo';
            undoBtn.style.cssText = `
                background: var(--color-warning);
                color: var(--color-white);
                border: none;
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 4px;
            `;
            undoBtn.addEventListener('click', () => {
                this.options.onUndo();
                this.remove();
            });
            toastActions.appendChild(undoBtn);
        }

        // Кнопка закрытия
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<i data-feather="x"></i>';
        closeBtn.className = 'btn btn-sm btn-secondary toast-btn close';
        closeBtn.style.cssText = `
            background: var(--color-gray-light);
            border: 1px solid var(--color-gray-border);
            border-radius: 4px;
            cursor: pointer;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            min-width: 0;
        `;
        closeBtn.addEventListener('click', () => {
            this.remove();
        });

        toastActions.appendChild(closeBtn);

        this.element.appendChild(toastContent);
        this.element.appendChild(toastActions);

        // Устанавливаем позицию
        this.setPosition();

        // Добавляем в DOM
        document.body.appendChild(this.element);

        // Анимация появления
        requestAnimationFrame(() => {
            this.element.style.opacity = '1';
            this.element.style.transform = 'translateY(0)';
        });

        // Инициализация Feather Icons
        if (typeof feather !== 'undefined') {
            requestAnimationFrame(() => {
                feather.replace();
            });
        }

        // Устанавливаем таймер для автоматического удаления
        if (this.options.duration > 0) {
            this.timer = setTimeout(() => {
                this.remove();
            }, this.options.duration);
        }

        logger.time('toast-creation');
        logger.debug('Toast создан', {
            message: this.options.message,
            type: this.options.type,
            duration: this.options.duration
        });
        logger.timeEnd('toast-creation');
    }

    setPosition() {
        const positions = {
            'top-right': {
                top: '20px',
                right: '20px',
                left: 'auto',
                bottom: 'auto'
            },
            'top-left': {
                top: '20px',
                left: '20px',
                right: 'auto',
                bottom: 'auto'
            },
            'bottom-right': {
                bottom: '20px',
                right: '20px',
                top: 'auto',
                left: 'auto'
            },
            'bottom-left': {
                bottom: '20px',
                left: '20px',
                top: 'auto',
                right: 'auto'
            }
        };

        const position = positions[this.options.position] || positions['top-right'];
        Object.entries(position).forEach(([prop, value]) => {
            this.element.style[prop] = value;
        });
    }

    setupEventListeners() {
        // Обработчик наведения для паузы таймера
        if (this.timer) {
            this.element.addEventListener('mouseenter', () => {
                clearTimeout(this.timer);
            });

            this.element.addEventListener('mouseleave', () => {
                if (this.options.duration > 0) {
                    this.timer = setTimeout(() => {
                        this.remove();
                    }, this.options.duration);
                }
            });
        }
    }

    remove() {
        if (this.timer) {
            clearTimeout(this.timer);
        }

        // Анимация исчезновения
        this.element.style.transition = 'all 0.3s ease-out';
        this.element.style.opacity = '0';
        this.element.style.transform = 'translateY(-10px)';

        setTimeout(() => {
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }, 300);

        logger.debug('Toast удален', {
            message: this.options.message
        });
    }

    onDestroy() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    /**
     * Показ toast уведомления
     * @param {string} message - сообщение
     * @param {Object} options - опции
     * @returns {ToastComponent} экземпляр toast
     */
    static show(message, options = {}) {
        const toast = new ToastComponent({ message, ...options });
        toast.initialize();
        return toast;
    }

    /**
     * Показ информационного toast
     * @param {string} message - сообщение
     * @param {Object} options - опции
     * @returns {ToastComponent} экземпляр toast
     */
    static info(message, options = {}) {
        return ToastComponent.show(message, { type: 'info', ...options });
    }

    /**
     * Показ успешного toast
     * @param {string} message - сообщение
     * @param {Object} options - опции
     * @returns {ToastComponent} экземпляр toast
     */
    static success(message, options = {}) {
        return ToastComponent.show(message, { type: 'success', ...options });
    }

    /**
     * Показ предупреждающего toast
     * @param {string} message - сообщение
     * @param {Object} options - опции
     * @returns {ToastComponent} экземпляр toast
     */
    static warning(message, options = {}) {
        return ToastComponent.show(message, { type: 'warning', ...options });
    }

    /**
     * Показ ошибки toast
     * @param {string} message - сообщение
     * @param {Object} options - опции
     * @returns {ToastComponent} экземпляр toast
     */
    static error(message, options = {}) {
        return ToastComponent.show(message, { type: 'error', ...options });
    }

    /**
     * Удаление всех активных toast
     */
    static removeAll() {
        const toasts = document.querySelectorAll('.toast');
        toasts.forEach(toast => {
            if (toast.style && toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }
}

export { ToastComponent };
