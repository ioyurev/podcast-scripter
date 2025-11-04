import { logger } from '../logger.js';
import { domService } from '../utils/dom-utils.js';
import { eventService } from '../utils/event-service.js';

import { ButtonComponent } from './button-component.js';
import { InputComponent } from './input-component.js';
import { ModalComponent } from './modal-component.js';
import { ToastComponent } from './toast-component.js';

/**
 * Универсальный сервис для создания модальных окон
 * Теперь использует стандартизированные компоненты
 */
class ModalService {
    constructor() {
        this.activeModal = null;
        this.modalStack = [];
        this.modalRegistry = new Map(); // Регистр активных модальных окон
        this.modalCounter = 0; // Счетчик для генерации уникальных ID
    }

    /**
     * Генерация уникального ID для модального окна
     * @returns {string} Уникальный ID
     */
    generateModalId() {
        return `modal_${Date.now()}_${++this.modalCounter}`;
    }

    /**
     * Регистрация модального окна в реестре
     * @param {string} modalId - Уникальный ID модального окна
     * @param {ModalComponent} modalInstance - Экземпляр модального окна
     * @param {Object} metadata - Метаданные модального окна
     */
    registerModal(modalId, modalInstance, metadata = {}) {
        const modalInfo = {
            id: modalId,
            instance: modalInstance,
            metadata: metadata,
            createdAt: new Date(),
            closed: false
        };
        this.modalRegistry.set(modalId, modalInfo);
        logger.debug('Модальное окно зарегистрировано', {
            modalId: modalId,
            title: metadata.title,
            type: metadata.type
        });
    }

    /**
     * Дерегистрация модального окна из реестра
     * @param {string} modalId - ID модального окна для дерегистрации
     */
    unregisterModal(modalId) {
        if (this.modalRegistry.has(modalId)) {
            const modalInfo = this.modalRegistry.get(modalId);
            modalInfo.closed = true;
            this.modalRegistry.delete(modalId);
            logger.debug('Модальное окно дерегистрировано', { modalId: modalId });
        }
    }

    /**
     * Поиск модальных окон по метаданным
     * @param {Object} searchCriteria - Критерии поиска
     * @returns {Array} Массив найденных модальных окон
     */
    findModalsByMetadata(searchCriteria) {
        const results = [];
        for (const [   , modalInfo] of this.modalRegistry.entries()) {
            if (!modalInfo.closed) {
                let matches = true;
                for (const [key, value] of Object.entries(searchCriteria)) {
                    if (modalInfo.metadata[key] !== value) {
                        matches = false;
                        break;
                    }
                }
                if (matches) {
                    results.push(modalInfo);
                }
            }
        }
        return results;
    }

    /**
     * Закрытие модальных окон по метаданным
     * @param {Object} searchCriteria - Критерии поиска модальных окон
     * @returns {number} Количество закрытых модальных окон
     */
    closeModalsByMetadata(searchCriteria) {
        const modalsToClose = this.findModalsByMetadata(searchCriteria);
        let closedCount = 0;

        for (const modalInfo of modalsToClose) {
            try {
                if (modalInfo.instance && typeof modalInfo.instance.closeModal === 'function') {
                    modalInfo.instance.closeModal(null);
                    closedCount++;
                }
            } catch (error) {
                logger.error('Ошибка при закрытии модального окна по метаданным', {
                    modalId: modalInfo.id,
                    error: error.message
                });
            }
        }

        return closedCount;
    }

    /**
     * Получение информации о всех зарегистрированных модальных окнах
     * @returns {Array} Массив информации о модальных окнах
     */
    getRegisteredModals() {
        return Array.from(this.modalRegistry.values());
    }

    /**
     * Очистка закрытых модальных окон из реестра
     */
    cleanupClosedModals() {
        for (const [modalId, modalInfo] of this.modalRegistry.entries()) {
            if (modalInfo.closed) {
                this.modalRegistry.delete(modalId);
            }
        }
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
        return ModalComponent.show(options);
    }

    /**
     * Показ модального окна подтверждения
     */
    showConfirmation(title, message, confirmText = 'Подтвердить', cancelText = 'Отмена') {
        return ModalComponent.showConfirmation(title, message, confirmText, cancelText);
    }

    /**
     * Показ модального окна с вводом текста
     */
    showInput(title, placeholder, defaultValue = '') {
        return ModalComponent.showInput(title, placeholder, defaultValue);
    }

    /**
     * Показ информационного модального окна
     */
    showInfo(title, message) {
        return ModalComponent.showInfo(title, message);
    }

    /**
     * Показ модального окна с выбором
     * @param {string} title - заголовок
     * @param {Array} options - массив опций [{value, text}]
     * @returns {Promise} Promise с выбранным значением
     */
    showSelect(title, options) {
        return ModalComponent.showSelect(title, options);
    }

    /**
     * Закрытие всех активных модальных окон
     */
    closeAll() {
        ModalComponent.closeAll();
    }

    /**
     * Проверка, есть ли активные модальные окна
     */
    hasActiveModal() {
        return ModalComponent.hasActiveModal();
    }

    /**
     * Поиск модальных окон по метаданным (публичный метод для использования в других компонентах)
     * @param {Object} searchCriteria - Критерии поиска
     * @returns {Array} Массив найденных модальных окон
     */
    findModalsByMetadataPublic(searchCriteria) {
        return this.findModalsByMetadata(searchCriteria);
    }

    /**
     * Закрытие модальных окон по метаданным (публичный метод для совместимости)
     * @param {Object} searchCriteria - Критерии поиска модальных окон по метаданным
     * @returns {number} Количество закрытых модальных окон
     */
    closeModalsByMetadataPublic(searchCriteria) {
        return this.closeModalsByMetadata(searchCriteria);
    }

    /**
     * Показ уведомления с использованием нового ToastComponent
     * @param {string} message - Сообщение
     * @param {string} type - Тип уведомления (success, error, warning, info)
     * @param {number} duration - Длительность показа в миллисекундах
     * @returns {ToastComponent} Экземпляр toast компонента
     */
    showNotification(message, type = 'info', duration = 5000) {
        return ToastComponent.show(message, { type, duration });
    }

    /**
     * Показ уведомления об успехе
     * @param {string} message - Сообщение
     * @param {number} duration - Длительность показа
     * @returns {ToastComponent} Экземпляр toast компонента
     */
    showSuccess(message, duration = 5000) {
        return ToastComponent.success(message, { duration });
    }

    /**
     * Показ уведомления об ошибке
     * @param {string} message - Сообщение
     * @param {number} duration - Длительность показа
     * @returns {ToastComponent} Экземпляр toast компонента
     */
    showError(message, duration = 7000) {
        return ToastComponent.error(message, { duration });
    }

    /**
     * Показ предупреждающего уведомления
     * @param {string} message - Сообщение
     * @param {number} duration - Длительность показа
     * @returns {ToastComponent} Экземпляр toast компонента
     */
    showWarning(message, duration = 6000) {
        return ToastComponent.warning(message, { duration });
    }

    /**
     * Показ информационного уведомления
     * @param {string} message - Сообщение
     * @param {number} duration - Длительность показа
     * @returns {ToastComponent} Экземпляр toast компонента
     */
    showInfoNotification(message, duration = 4000) {
        return ToastComponent.info(message, { duration });
    }

    /**
     * Удаление всех активных уведомлений
     */
    removeAllNotifications() {
        ToastComponent.removeAll();
    }

    /**
     * Создание кнопки с использованием нового ButtonComponent
     * @param {Object} options - Опции кнопки
     * @returns {ButtonComponent} Экземпляр кнопки
     */
    createButton(options) {
        return ButtonComponent.create(options);
    }

    /**
     * Создание input с использованием нового InputComponent
     * @param {Object} options - Опции input
     * @returns {InputComponent} Экземпляр input
     */
    createInput(options) {
        return InputComponent.create(options);
    }

    /**
     * Безопасное выполнение DOM операций
     * @param {Function} operation - Функция для выполнения
     * @param {*} defaultValue - Значение по умолчанию при ошибке
     * @returns {*} Результат операции или defaultValue
     */
    safeDOMExecute(operation, defaultValue = null) {
        return domService.safeExecute(operation, defaultValue);
    }

    /**
     * Подписка на событие с использованием eventService
     * @param {string} event - Название события
     * @param {Function} callback - Функция-обработчик
     * @returns {Function} Функция отписки
     */
    subscribeToEvent(event, callback) {
        return eventService.subscribe(event, callback);
    }

    /**
     * Публикация события
     * @param {string} event - Название события
     * @param {...any} args - Аргументы события
     * @returns {number} Количество обработчиков, вызванных для события
     */
    publishEvent(event, ...args) {
        return eventService.publish(event, ...args);
    }

    /**
     * Ожидание события
     * @param {string} event - Название события
     * @param {number} timeout - Таймаут в миллисекундах
     * @returns {Promise<any>} Promise, разрешающийся с аргументами события
     */
    waitForEvent(event, timeout = 5000) {
        return eventService.waitForEvent(event, timeout);
    }

    /**
     * Подписка на DOM событие
     * @param {HTMLElement} element - DOM элемент
     * @param {string} event - Тип DOM события
     * @param {Function} handler - Обработчик события
     * @param {Object} options - Опции addEventListener
     * @returns {Function} Функция отписки
     */
    subscribeToDOMEvent(element, event, handler, options = {}) {
        return eventService.subscribeToDOMEvent(element, event, handler, options);
    }

    /**
     * Ожидание DOM события
     * @param {HTMLElement} element - DOM элемент
     * @param {string} event - Тип DOM события
     * @param {number} timeout - Таймаут в миллисекундах
     * @returns {Promise<Event>} Promise, разрешающийся с DOM событием
     */
    waitForDOMEvent(element, event, timeout = 500) {
        return eventService.waitForDOMEvent(element, event, timeout);
    }

    /**
     * Получение элемента с кэшированием
     * @param {string} elementId - ID элемента
     * @returns {Object} Объект с методами для работы с элементом
     */
    getElement(elementId) {
        return domService.getElement(elementId);
    }

    /**
     * Валидация формы
     * @param {string|HTMLElement} formSelector - Селектор формы или сам элемент
     * @param {Object} rules - Правила валидации
     * @returns {Object} Результат валидации
     */
    validateForm(formSelector, rules) {
        return domService.validateForm(formSelector, rules);
    }

    /**
     * Установка значений формы
     * @param {string|HTMLElement} formSelector - Селектор формы или сам элемент
     * @param {Object} values - Значения для установки
     */
    setFormValues(formSelector, values) {
        domService.setFormValues(formSelector, values);
    }

    /**
     * Получение значений формы
     * @param {string|HTMLElement} formSelector - Селектор формы или сам элемент
     * @returns {Object} Значения формы
     */
    getFormValues(formSelector) {
        return domService.getFormValues(formSelector);
    }

    /**
     * Ожидание загрузки DOM элемента
     * @param {string} selector - CSS селектор элемента
     * @param {number} timeout - Таймаут в миллисекундах
     * @returns {Promise<HTMLElement>} Promise, разрешающийся с найденным элементом
     */
    waitForElement(selector, timeout = 5000) {
        return domService.waitForElement(selector, timeout);
    }

    /**
     * Выполнение функции после загрузки DOM
     * @param {Function} callback - Функция для выполнения
     */
    onDOMReady(callback) {
        domService.onDOMReady(callback);
    }

    /**
     * Логирование пользовательского действия
     * @param {string} action - Действие
     * @param {Object} data - Дополнительные данные
     */
    logUserAction(action, data = {}) {
        logger.logUserAction(action, data);
    }

    /**
     * Логирование ошибки
     * @param {string} message - Сообщение об ошибке
     * @param {Object} data - Дополнительные данные
     */
    logError(message, data = {}) {
        logger.error(message, data);
    }

    /**
     * Логирование информации
     * @param {string} message - Сообщение
     * @param {Object} data - Дополнительные данные
     */
    logInfo(message, data = {}) {
        logger.info(message, data);
    }

    /**
     * Логирование отладочной информации
     * @param {string} message - Сообщение
     * @param {Object} data - Дополнительные данные
     */
    logDebug(message, data = {}) {
        logger.debug(message, data);
    }

    /**
     * Инициализация Feather Icons для новых элементов
     * @param {HTMLElement} parent - Родительский элемент для инициализации
     */
    initFeatherIcons(parent = document) {
        if (typeof feather !== 'undefined') {
            feather.replace({ target: parent });
        }
    }

    /**
     * Обновление Feather Icons
     */
    updateFeatherIcons() {
        if (typeof feather !== 'undefined') {
            feather.update();
        }
    }
}

// Создаем экземпляр сервиса
const modalService = new ModalService();

// Экспорт для использования в других модулях
export { ModalService, modalService };
