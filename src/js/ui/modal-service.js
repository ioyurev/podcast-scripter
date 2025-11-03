import { featherIconsService } from '../utils/feather-icons.js';

/**
 * Универсальный сервис для создания модальных окон
 */
class ModalService {
    constructor() {
        this.activeModal = null;
        this.modalStack = [];
    }

    /**
     * Создание универсального модального окна
     * @param {Object} options - Параметры модального окна
     * @param {string} options.title - Заголовок модального окна
     * @param {string|HTMLElement|Function} options.content - Содержимое модального окна
     * @param {Array} options.buttons - Массив кнопок [{text, icon, onClick, type, className}]
     * @param {string} options.type - Тип модального окна ('default', 'confirmation', 'input', 'notification', 'custom')
     * @param {string} options.size - Размер модального окна ('sm', 'md', 'lg', 'xl', 'full')
     * @param {Function} options.onClose - Коллбэк при закрытии модального окна
     * @param {boolean} options.closable - Можно ли закрыть по клику вне модального окна
     * @param {boolean} options.closeOnEscape - Закрывать ли по нажатию Escape
     * @param {boolean} options.showCloseButton - Показывать ли кнопку закрытия
     * @param {string} options.className - Дополнительные CSS классы
     * @returns {Promise} - Promise, который разрешается с результатом модального окна
     */
    show(options = {}) {
        return new Promise((resolve, reject) => {
            try {
                // Значения по умолчанию
                const defaults = {
                    title: '',
                    content: '',
                    buttons: [],
                    type: 'default',
                    size: 'md',
                    onClose: null,
                    closable: true,
                    closeOnEscape: true,
                    showCloseButton: true,
                    className: '',
                    zIndex: 10000
                };

                const config = { ...defaults, ...options };

                // Создаем overlay
                const overlay = document.createElement('div');
                overlay.className = 'modal-overlay';
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: ${config.zIndex};
                    animation: fadeIn 0.2s ease-in-out;
                `;

                // Определяем CSS классы в зависимости от типа
                const modalClasses = [
                    'modal-content',
                    `modal-${config.type}`,
                    `modal-${config.size}`,
                    config.className
                ].filter(Boolean).join(' ');

                // Создаем модальное окно
                const modal = document.createElement('div');
                modal.className = modalClasses;
                modal.style.cssText = `
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
                this._setSizeStyles(modal, config.size);

                // Заголовок
                if (config.title) {
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
                    titleElement.innerHTML = this._getTitleWithIcon(config.title, config.type);
                    header.appendChild(titleElement);

                    // Кнопка закрытия
                    if (config.showCloseButton) {
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
                            this._closeModal(overlay, config.onClose, resolve, null);
                        });
                        closeBtn.addEventListener('mouseenter', () => {
                            closeBtn.style.color = 'var(--color-danger)';
                        });
                        closeBtn.addEventListener('mouseleave', () => {
                            closeBtn.style.color = 'var(--color-text-secondary)';
                        });
                        header.appendChild(closeBtn);
                    }

                    modal.appendChild(header);
                }

                // Основное содержимое
                const body = document.createElement('div');
                body.className = 'modal-body';
                body.style.cssText = `
                    padding: ${config.title ? '0 20px' : '20px'};
                    flex: 1;
                    overflow-y: auto;
                `;

                if (typeof config.content === 'function') {
                    // Если content - функция, вызываем её с контекстом для добавления элементов
                    const contentResult = config.content(body);
                    if (contentResult) {
                        body.appendChild(contentResult);
                    }
                } else if (typeof config.content === 'string') {
                    body.textContent = config.content;
                } else if (config.content instanceof HTMLElement) {
                    body.appendChild(config.content);
                } else {
                    body.appendChild(this._createContentElement(config.content));
                }

                modal.appendChild(body);

                // Кнопки
                if (config.buttons && config.buttons.length > 0) {
                    const footer = document.createElement('div');
                    footer.className = 'modal-footer';
                    footer.style.cssText = `
                        padding: 20px;
                        border-top: 1px solid var(--color-gray-border);
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                    `;

                    config.buttons.forEach((buttonConfig) => {
                        const button = this._createButton(buttonConfig);
                        button.addEventListener('click', (e) => {
                            e.preventDefault();
                            const result = buttonConfig.onClick ? buttonConfig.onClick(e) : true;
                            if (buttonConfig.autoClose !== false) {
                                this._closeModal(overlay, config.onClose, resolve, result);
                            } else {
                                resolve(result);
                            }
                        });
                        footer.appendChild(button);
                    });

                    modal.appendChild(footer);
                }

                overlay.appendChild(modal);
                document.body.appendChild(overlay);

                // Сохраняем активное модальное окно
                this.activeModal = { overlay, modal, config, resolve, reject };

                // Инициализация Feather Icons
                if (typeof feather !== 'undefined') {
                    requestAnimationFrame(() => {
                        featherIconsService.update();
                    });
                }

                // Обработчики событий
                if (config.closable) {
                    overlay.addEventListener('click', (e) => {
                        if (e.target === overlay) {
                            this._closeModal(overlay, config.onClose, resolve, null);
                        }
                    });
                }

                if (config.closeOnEscape) {
                    const handleEscape = (e) => {
                        if (e.key === 'Escape') {
                            this._closeModal(overlay, config.onClose, resolve, null);
                        }
                    };
                    document.addEventListener('keydown', handleEscape);
                    
                    // Удаляем обработчик при закрытии
                    const cleanup = () => {
                        document.removeEventListener('keydown', handleEscape);
                    };
                    overlay.addEventListener('remove', cleanup);
                }

                // Фокус на первом элементе управления
                this._focusFirstElement(modal);

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Закрытие модального окна
     */
    _closeModal(overlay, onClose, resolve, result) {
        if (onClose) {
            onClose();
        }
        
        // Анимация закрытия
        overlay.style.animation = 'fadeOut 0.2s ease-in-out';
        
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            resolve(result);
            if (this.activeModal && this.activeModal.overlay === overlay) {
                this.activeModal = null;
            }
        }, 200);
    }

    /**
     * Установка стилей размера
     */
    _setSizeStyles(modal, size) {
        const sizeStyles = {
            'sm': 'max-width: 400px; width: 80%;',
            'md': 'max-width: 500px; width: 90%;',
            'lg': 'max-width: 700px; width: 90%;',
            'xl': 'max-width: 900px; width: 95%;',
            'full': 'max-width: 95vw; width: 95vw; height: 90vh;'
        };
        
        if (sizeStyles[size]) {
            modal.style.cssText += sizeStyles[size];
        }
    }

    /**
     * Создание кнопки
     */
    _createButton(config) {
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

    /**
     * Создание элемента содержимого
     */
    _createContentElement(content) {
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

    /**
     * Получение заголовка с иконкой в зависимости от типа
     */
    _getTitleWithIcon(title, type) {
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
        
        const icon = icons[type] || '';
        return `${icon} ${title}`.trim();
    }

    /**
     * Фокус на первом элементе управления
     */
    _focusFirstElement(modal) {
        setTimeout(() => {
            const firstInput = modal.querySelector('input, textarea, select, button');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }

    /**
     * Методы для часто используемых модальных окон
     */

    /**
     * Показ модального окна подтверждения
     */
    showConfirmation(title, message, confirmText = 'Подтвердить', cancelText = 'Отмена') {
        return this.show({
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
     */
    showInput(title, placeholder, defaultValue = '') {
        return this.show({
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
     */
    showInfo(title, message) {
        return this.show({
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
     * Закрытие всех активных модальных окон
     */
    closeAll() {
        if (this.activeModal) {
            const { overlay, config, resolve } = this.activeModal;
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            if (config.onClose) {
                config.onClose();
            }
            resolve(null);
            this.activeModal = null;
        }
    }

    /**
     * Проверка, есть ли активные модальные окна
     */
    hasActiveModal() {
        return !!this.activeModal;
    }
}

// Создаем экземпляр сервиса
const modalService = new ModalService();

// Экспорт для использования в других модулях
export { ModalService, modalService };
