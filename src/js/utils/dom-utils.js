/**
 * Утилиты для работы с DOM элементами
 */

import { logger } from '../logger.js';

/**
 * Базовый класс для работы с DOM элементами
 * Обеспечивает безопасную работу с элементами, обработку ошибок и стандартные операции
 */
class BaseDOMElement {
    constructor(elementId = null, element = null) {
        this.element = element || (elementId ? document.getElementById(elementId) : null);
        this.elementId = elementId;
        this.eventListeners = new Map(); // Хранит зарегистрированные обработчики событий
        this.children = new Map(); // Хранит дочерние элементы
        this.state = {}; // Хранит состояние компонента
        this.observers = new Set(); // Наблюдатели за изменениями состояния
    }

    /**
     * Безопасное получение элемента по ID
     * @param {string} elementId - ID элемента
     * @param {boolean} throwError - выбрасывать ли ошибку если элемент не найден
     * @returns {HTMLElement|null} Найденный элемент или null
     */
    static getElementById(elementId, throwError = false) {
        try {
            const element = document.getElementById(elementId);
            if (!element && throwError) {
                logger.error(`Элемент с ID "${elementId}" не найден в DOM`);
                throw new Error(`Элемент с ID "${elementId}" не найден в DOM`);
            }
            return element;
        } catch (error) {
            logger.error('Ошибка при поиске элемента по ID', {
                elementId,
                error: error.message
            });
            if (throwError) throw error;
            return null;
        }
    }

    /**
     * Безопасное получение элемента по селектору
     * @param {string} selector - CSS селектор
     * @param {HTMLElement} parent - родительский элемент для поиска
     * @returns {HTMLElement|null} Найденный элемент или null
     */
    static querySelector(selector, parent = document) {
        try {
            const element = parent.querySelector(selector);
            if (!element) {
                logger.warn(`Элемент с селектором "${selector}" не найден`);
            }
            return element;
        } catch (error) {
            logger.error('Ошибка при поиске элемента по селектору', {
                selector,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Безопасное получение элементов по селектору
     * @param {string} selector - CSS селектор
     * @param {HTMLElement} parent - родительский элемент для поиска
     * @returns {NodeList} Список найденных элементов
     */
    static querySelectorAll(selector, parent = document) {
        try {
            return parent.querySelectorAll(selector);
        } catch (error) {
            logger.error('Ошибка при поиске элементов по селектору', {
                selector,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Получение элемента (с проверкой существования)
     * @returns {HTMLElement|null} Элемент или null если не найден
     */
    getElement() {
        if (!this.element && this.elementId) {
            this.element = BaseDOMElement.getElementById(this.elementId);
        }
        return this.element;
    }

    /**
     * Проверка существования элемента
     * @returns {boolean} Существует ли элемент
     */
    exists() {
        return !!this.getElement();
    }

    /**
     * Безопасное выполнение операций с элементом
     * @param {Function} operation - функция для выполнения
     * @param {*} defaultValue - значение по умолчанию при ошибке
     * @returns {*} Результат операции или defaultValue
     */
    safeExecute(operation, defaultValue = null) {
        try {
            const element = this.getElement();
            if (!element) {
                logger.warn('Элемент не найден для выполнения операции', {
                    elementId: this.elementId
                });
                return defaultValue;
            }
            return operation(element);
        } catch (error) {
            logger.error('Ошибка при выполнении операции с элементом', {
                elementId: this.elementId,
                error: error.message
            });
            return defaultValue;
        }
    }

    /**
     * Добавление обработчика события
     * @param {string} event - тип события
     * @param {Function} handler - обработчик события
     * @param {Object} options - опции addEventListener
     * @returns {BaseDOMElement} Текущий экземпляр для цепочки вызовов
     */
    addEventListener(event, handler, options = {}) {
        try {
            const element = this.getElement();
            if (!element) {
                logger.error('Невозможно добавить обработчик события - элемент не найден', {
                    elementId: this.elementId,
                    event
                });
                return this;
            }

            const wrappedHandler = (e) => {
                try {
                    return handler(e);
                } catch (error) {
                    logger.error('Ошибка в обработчике события', {
                        elementId: this.elementId,
                        event,
                        error: error.message
                    });
                }
            };

            element.addEventListener(event, wrappedHandler, options);
            
            // Сохраняем информацию о обработчике для возможной очистки
            if (!this.eventListeners.has(event)) {
                this.eventListeners.set(event, []);
            }
            this.eventListeners.get(event).push({ handler: wrappedHandler, options });

            logger.debug('Обработчик события добавлен', {
                elementId: this.elementId,
                event,
                handler: handler.name || 'anonymous'
            });

        } catch (error) {
            logger.error('Ошибка при добавлении обработчика события', {
                elementId: this.elementId,
                event,
                error: error.message
            });
        }

        return this;
    }

    /**
     * Удаление обработчика события
     * @param {string} event - тип события
     * @param {Function} handler - обработчик события
     * @returns {BaseDOMElement} Текущий экземпляр для цепочки вызовов
     */
    removeEventListener(event, handler) {
        try {
            const element = this.getElement();
            if (!element) return this;

            const eventHandlers = this.eventListeners.get(event);
            if (eventHandlers) {
                const handlerInfo = eventHandlers.find(h => h.handler === handler);
                if (handlerInfo) {
                    element.removeEventListener(event, handlerInfo.handler, handlerInfo.options);
                    const index = eventHandlers.indexOf(handlerInfo);
                    if (index > -1) {
                        eventHandlers.splice(index, 1);
                    }
                }
            }

        } catch (error) {
            logger.error('Ошибка при удалении обработчика события', {
                elementId: this.elementId,
                event,
                error: error.message
            });
        }

        return this;
    }

    /**
     * Очистка всех обработчиков событий
     */
    removeAllEventListeners() {
        try {
            const element = this.getElement();
            if (!element) return;

            for (const [event, handlers] of this.eventListeners) {
                for (const handlerInfo of handlers) {
                    element.removeEventListener(event, handlerInfo.handler, handlerInfo.options);
                }
            }
            this.eventListeners.clear();

            logger.debug('Все обработчики событий очищены', {
                elementId: this.elementId
            });

        } catch (error) {
            logger.error('Ошибка при очистке обработчиков событий', {
                elementId: this.elementId,
                error: error.message
            });
        }
    }

    /**
     * Установка текстового содержимого
     * @param {string} text - текст для установки
     * @returns {BaseDOMElement} Текущий экземпляр для цепочки вызовов
     */
    setText(text) {
        this.safeExecute(element => {
            element.textContent = text;
        });
        return this;
    }

    /**
     * Установка HTML содержимого
     * @param {string} html - HTML для установки
     * @returns {BaseDOMElement} Текущий экземпляр для цепочки вызовов
     */
    setHTML(html) {
        this.safeExecute(element => {
            element.innerHTML = html;
        });
        return this;
    }

    /**
     * Получение текстового содержимого
     * @returns {string} Текстовое содержимое
     */
    getText() {
        return this.safeExecute(element => element.textContent, '');
    }

    /**
     * Получение HTML содержимого
     * @returns {string} HTML содержимое
     */
    getHTML() {
        return this.safeExecute(element => element.innerHTML, '');
    }

    /**
     * Добавление CSS класса
     * @param {string} className - имя класса
     * @returns {BaseDOMElement} Текущий экземпляр для цепочки вызовов
     */
    addClass(className) {
        this.safeExecute(element => {
            element.classList.add(className);
        });
        return this;
    }

    /**
     * Удаление CSS класса
     * @param {string} className - имя класса
     * @returns {BaseDOMElement} Текущий экземпляр для цепочки вызовов
     */
    removeClass(className) {
        this.safeExecute(element => {
            element.classList.remove(className);
        });
        return this;
    }

    /**
     * Проверка наличия CSS класса
     * @param {string} className - имя класса
     * @returns {boolean} Есть ли класс у элемента
     */
    hasClass(className) {
        return this.safeExecute(element => element.classList.contains(className), false);
    }

    /**
     * Установка атрибута
     * @param {string} name - имя атрибута
     * @param {string} value - значение атрибута
     * @returns {BaseDOMElement} Текущий экземпляр для цепочки вызовов
     */
    setAttribute(name, value) {
        this.safeExecute(element => {
            element.setAttribute(name, value);
        });
        return this;
    }

    /**
     * Получение атрибута
     * @param {string} name - имя атрибута
     * @returns {string|null} Значение атрибута
     */
    getAttribute(name) {
        return this.safeExecute(element => element.getAttribute(name), null);
    }

    /**
     * Удаление атрибута
     * @param {string} name - имя атрибута
     * @returns {BaseDOMElement} Текущий экземпляр для цепочки вызовов
     */
    removeAttribute(name) {
        this.safeExecute(element => {
            element.removeAttribute(name);
        });
        return this;
    }

    /**
     * Установка стиля
     * @param {string} property - CSS свойство
     * @param {string} value - значение свойства
     * @returns {BaseDOMElement} Текущий экземпляр для цепочки вызовов
     */
    setStyle(property, value) {
        this.safeExecute(element => {
            element.style.setProperty(property, value);
        });
        return this;
    }

    /**
     * Установка нескольких стилей
     * @param {Object} styles - объект со стилями
     * @returns {BaseDOMElement} Текущий экземпляр для цепочки вызовов
     */
    setStyles(styles) {
        for (const [property, value] of Object.entries(styles)) {
            this.setStyle(property, value);
        }
        return this;
    }

    /**
     * Показ элемента
     * @returns {BaseDOMElement} Текущий экземпляр для цепочки вызовов
     */
    show() {
        this.setStyle('display', '');
        return this;
    }

    /**
     * Скрытие элемента
     * @returns {BaseDOMElement} Текущий экземпляр для цепочки вызовов
     */
    hide() {
        this.setStyle('display', 'none');
        return this;
    }

    /**
     * Проверка видимости элемента
     * @returns {boolean} Видим ли элемент
     */
    isVisible() {
        return this.safeExecute(element => element.style.display !== 'none', false);
    }

    /**
     * Анимация появления
     * @param {number} duration - длительность анимации в мс
     * @returns {Promise} Promise, разрешающийся после завершения анимации
     */
    async fadeIn(duration = 300) {
        return this.safeExecute(async (element) => {
            return new Promise(resolve => {
                element.style.opacity = '0';
                element.style.display = '';
                element.style.transition = `opacity ${duration}ms ease-in-out`;
                
                requestAnimationFrame(() => {
                    element.style.opacity = '1';
                });

                setTimeout(() => {
                    element.style.transition = '';
                    resolve();
                }, duration);
            });
        });
    }

    /**
     * Анимация исчезновения
     * @param {number} duration - длительность анимации в мс
     * @returns {Promise} Promise, разрешающийся после завершения анимации
     */
    async fadeOut(duration = 300) {
        return this.safeExecute(async (element) => {
            return new Promise(resolve => {
                element.style.transition = `opacity ${duration}ms ease-in-out`;
                element.style.opacity = '0';

                setTimeout(() => {
                    element.style.display = 'none';
                    element.style.opacity = '';
                    element.style.transition = '';
                    resolve();
                }, duration);
            });
        });
    }

    /**
     * Анимация удаления с плавным исчезновением
     * @param {number} duration - длительность анимации в мс
     * @returns {Promise} Promise, разрешающийся после завершения анимации
     */
    async fadeRemove(duration = 300) {
        return this.safeExecute(async (element) => {
            await this.fadeOut(duration);
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
    }

    /**
     * Установка состояния
     * @param {string} key - ключ состояния
     * @param {*} value - значение состояния
     * @param {boolean} notify - уведомлять ли наблюдателей
     * @returns {BaseDOMElement} Текущий экземпляр для цепочки вызовов
     */
    setState(key, value, notify = true) {
        this.state[key] = value;
        if (notify) {
            this.notifyObservers(key, value);
        }
        return this;
    }

    /**
     * Получение состояния
     * @param {string} key - ключ состояния
     * @param {*} defaultValue - значение по умолчанию
     * @returns {*} Значение состояния
     */
    getState(key, defaultValue = null) {
        return this.state[key] !== undefined ? this.state[key] : defaultValue;
    }

    /**
     * Добавление наблюдателя за состоянием
     * @param {Function} observer - функция наблюдателя
     * @returns {BaseDOMElement} Текущий экземпляр для цепочки вызовов
     */
    addObserver(observer) {
        this.observers.add(observer);
        return this;
    }

    /**
     * Удаление наблюдателя за состоянием
     * @param {Function} observer - функция наблюдателя
     * @returns {BaseDOMElement} Текущий экземпляр для цепочки вызовов
     */
    removeObserver(observer) {
        this.observers.delete(observer);
        return this;
    }

    /**
     * Уведомление наблюдателей об изменении состояния
     * @param {string} key - ключ состояния
     * @param {*} value - новое значение
     */
    notifyObservers(key, value) {
        for (const observer of this.observers) {
            try {
                observer(key, value, this);
            } catch (error) {
                logger.error('Ошибка в функции наблюдателя', {
                    error: error.message
                });
            }
        }
    }

    /**
     * Очистка элемента и всех связанных ресурсов
     */
    destroy() {
        this.removeAllEventListeners();
        this.observers.clear();
        this.children.clear();
        this.element = null;
        this.state = {};
    }

    /**
     * Получение или создание дочернего элемента
     * @param {string} key - ключ для кэширования дочернего элемента
     * @param {string} selector - CSS селектор для поиска
     * @param {HTMLElement} parent - родительский элемент
     * @returns {BaseDOMElement} Дочерний элемент
     */
    getChild(key, selector, parent = null) {
        if (!this.children.has(key)) {
            const element = BaseDOMElement.querySelector(selector, parent || this.getElement());
            const child = new BaseDOMElement(null, element);
            this.children.set(key, child);
        }
        return this.children.get(key);
    }

    /**
     * Установка дочернего элемента
     * @param {string} key - ключ для кэширования
     * @param {BaseDOMElement} child - дочерний элемент
     * @returns {BaseDOMElement} Текущий экземпляр для цепочки вызовов
     */
    setChild(key, child) {
        this.children.set(key, child);
        return this;
    }

    /**
     * Удаление дочернего элемента из кэша
     * @param {string} key - ключ дочернего элемента
     * @returns {BaseDOMElement} Текущий экземпляр для цепочки вызовов
     */
    removeChild(key) {
        const child = this.children.get(key);
        if (child) {
            child.destroy();
            this.children.delete(key);
        }
        return this;
    }
}

/**
 * Сервис для работы с DOM операциями
 */
class DOMService {
    constructor() {
        this.elements = new Map(); // Кэш элементов
        this.forms = new Map(); // Кэш форм
    }

    /**
     * Получение элемента с кэшированием
     * @param {string} elementId - ID элемента
     * @returns {BaseDOMElement} Обернутый элемент
     */
    getElement(elementId) {
        if (!this.elements.has(elementId)) {
            const element = new BaseDOMElement(elementId);
            this.elements.set(elementId, element);
        }
        return this.elements.get(elementId);
    }

    /**
     * Безопасное выполнение DOM операций в пакете
     * @param {Array} operations - массив операций [{elementId, method, args}]
     * @returns {Array} Результаты операций
     */
    batchExecute(operations) {
        const results = [];
        for (const operation of operations) {
            try {
                const element = this.getElement(operation.elementId);
                if (element.exists()) {
                    const result = element[operation.method](...operation.args);
                    results.push({ success: true, result });
                } else {
                    results.push({ success: false, error: 'Element not found' });
                }
            } catch (error) {
                logger.error('Ошибка при выполнении пакетной операции', {
                    operation,
                    error: error.message
                });
                results.push({ success: false, error: error.message });
            }
        }
        return results;
    }

    /**
     * Валидация формы
     * @param {string|HTMLElement} formSelector - селектор формы или сам элемент
     * @param {Object} rules - правила валидации
     * @returns {Object} Результат валидации
     */
    validateForm(formSelector, rules) {
        const form = typeof formSelector === 'string' 
            ? BaseDOMElement.querySelector(formSelector)
            : formSelector;

        if (!form || !(form instanceof HTMLFormElement)) {
            logger.error('Форма не найдена для валидации', { formSelector });
            return { isValid: false, errors: ['Форма не найдена'] };
        }

        const errors = {};
        let isValid = true;

        for (const [fieldName, rule] of Object.entries(rules)) {
            const field = BaseDOMElement.querySelector(`[name="${fieldName}"]`, form);
            if (!field) continue;

            const value = field.value?.trim() || '';
            const fieldErrors = [];

            // Проверка обязательного поля
            if (rule.required && !value) {
                fieldErrors.push(rule.requiredMessage || `Поле "${fieldName}" обязательно для заполнения`);
            }

            // Проверка длины
            if (rule.minLength && value.length < rule.minLength) {
                fieldErrors.push(rule.minLengthMessage || `Поле "${fieldName}" должно содержать не менее ${rule.minLength} символов`);
            }

            if (rule.maxLength && value.length > rule.maxLength) {
                fieldErrors.push(rule.maxLengthMessage || `Поле "${fieldName}" должно содержать не более ${rule.maxLength} символов`);
            }

            // Проверка регулярного выражения
            if (rule.pattern && value && !new RegExp(rule.pattern).test(value)) {
                fieldErrors.push(rule.patternMessage || `Поле "${fieldName}" имеет неверный формат`);
            }

            if (fieldErrors.length > 0) {
                errors[fieldName] = fieldErrors;
                isValid = false;
            }
        }

        return { isValid, errors };
    }

    /**
     * Установка значений формы
     * @param {string|HTMLElement} formSelector - селектор формы или сам элемент
     * @param {Object} values - значения для установки
     */
    setFormValues(formSelector, values) {
        const form = typeof formSelector === 'string' 
            ? BaseDOMElement.querySelector(formSelector)
            : formSelector;

        if (!form) {
            logger.error('Форма не найдена для установки значений', { formSelector });
            return;
        }

        for (const [name, value] of Object.entries(values)) {
            const field = BaseDOMElement.querySelector(`[name="${name}"]`, form);
            if (field) {
                if (field.type === 'checkbox' || field.type === 'radio') {
                    field.checked = Boolean(value);
                } else {
                    field.value = value;
                }
            }
        }
    }

    /**
     * Получение значений формы
     * @param {string|HTMLElement} formSelector - селектор формы или сам элемент
     * @returns {Object} Значения формы
     */
    getFormValues(formSelector) {
        const form = typeof formSelector === 'string' 
            ? BaseDOMElement.querySelector(formSelector)
            : formSelector;

        if (!form) {
            logger.error('Форма не найдена для получения значений', { formSelector });
            return {};
        }

        const values = {};
        const formData = new FormData(form);
        for (const [name, value] of formData.entries()) {
            values[name] = value;
        }

        // Обработка чекбоксов и радио-кнопок отдельно
        const checkboxes = BaseDOMElement.querySelectorAll('input[type="checkbox"]', form);
        checkboxes.forEach(checkbox => {
            if (!formData.has(checkbox.name)) {
                values[checkbox.name] = false;
            }
        });

        return values;
    }

    /**
     * Очистка кэша элементов
     */
    clearCache() {
        for (const element of this.elements.values()) {
            element.destroy();
        }
        this.elements.clear();
        this.forms.clear();
    }

    /**
     * Ожидание загрузки DOM элемента
     * @param {string} selector - CSS селектор элемента
     * @param {number} timeout - таймаут в миллисекундах
     * @returns {Promise<HTMLElement>} Promise, разрешающийся с найденным элементом
     */
    waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = BaseDOMElement.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver(() => {
                const element = BaseDOMElement.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Элемент с селектором "${selector}" не найден за ${timeout}мс`));
            }, timeout);
        });
    }

    /**
     * Выполнение функции после загрузки DOM
     * @param {Function} callback - функция для выполнения
     */
    onDOMReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }
}

// Создаем глобальный экземпляр DOMService
const domService = new DOMService();

export { BaseDOMElement, DOMService, domService };
