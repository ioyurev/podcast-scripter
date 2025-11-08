import { BaseUIComponent } from '../common/base-ui-component.js';
import { themeManager } from '../common/theme-manager.js';
import { logger } from '../logger.js';
import { ModalComponent } from '../ui/modal-component.js';
import { ToastComponent } from '../ui/toast-component.js';
import { domService } from '../utils/dom-utils.js';
import { eventService } from '../utils/event-service.js';
import { featherIconsService } from '../utils/feather-icons.js';

/**
 * Компоненты пользовательского интерфейса для режима просмотра
 */
class ViewerUIComponents extends BaseUIComponent {
    constructor(viewerApp) {
        super();
        this.viewerApp = viewerApp;
        this.logger = logger;
    }

    /**
     * Инициализация UI компонентов
     */
    initialize() {
        super.initialize(); // Вызываем базовую инициализацию
        logger.time('ui-components-initialization');
        this.createControls();
        this.setupEventListeners();
        this.updateControls();
        this.logger.info('UI компоненты режима просмотра инициализированы');
        // Инициализация Feather Icons
        featherIconsService.update();
        logger.timeEnd('ui-components-initialization');
    }

    /**
     * Загрузка предпочтений темы из localStorage
     */
    loadThemePreference() {
        const savedTheme = localStorage.getItem('viewerTheme');
        if (savedTheme) {
            this.viewerApp.setTheme(savedTheme);
            this.updateThemeButtonIcon('viewerThemeToggleBtn', savedTheme);
        } else {
            // Используем общую логику из themeManager
            const theme = themeManager.loadThemePreference();
            this.viewerApp.setTheme(theme);
            this.updateThemeButtonIcon('viewerThemeToggleBtn', theme);
        }
    }

    /**
     * Создание элементов управления
     */
    createControls() {
        // Используем domService для безопасного получения элементов
        this.elements.set('backBtn', domService.getElement('viewerBackBtn'));
        this.elements.set('loadJsonBtn', domService.getElement('viewerLoadJsonBtn'));
        this.elements.set('jsonFileInput', domService.getElement('viewerJsonFileInput'));
        this.elements.set('printBtn', domService.getElement('viewerPrintBtn'));
        this.elements.set('themeToggleBtn', domService.getElement('viewerThemeToggleBtn'));
        this.elements.set('statsContainer', domService.getElement('viewerStatsContainer'));
    }

    /**
     * Получение элемента по ключу
     * @param {string} key - ключ элемента
     * @returns {Object} объект с методами для работы с элементом
     */
    getElement(key) {
        return this.elements.get(key);
    }

    /**
     * Обработка печати
     */
    handlePrint() {
        window.print();
    }

    /**
     * Обновление состояния элементов управления
     */
    updateControls() {
        // Обновляем состояние кнопок в зависимости от наличия данных
        const hasData = this.viewerApp.currentData !== null;
        const canPrint = hasData;

        const printBtn = this.getElement('printBtn');
        if (printBtn) {
            printBtn.safeExecute(element => {
                element.disabled = !canPrint;
            });
        }

        // Обновляем статистику если есть данные
        if (hasData && this.viewerApp.currentData) {
            this.updateStatistics(this.viewerApp.currentData.statistics);
        }
    }

    /**
     * Обновление отображения статистики
     * @param {Object} statistics - Объект статистики
     */
    updateStatistics(statistics) {
        if (!statistics) {
            return;
        }

        // Обновляем статистику в существующих элементах
        const totalWordsElement = domService.getElement('totalWords');
        const totalDurationElement = domService.getElement('totalDuration');
        const roleCountElement = domService.getElement('roleCount');
        const replicaCountElement = domService.getElement('replicaCount');

        totalWordsElement.setText(statistics.totalWords);
        totalDurationElement.setText(statistics.totalDurationFormatted);
        roleCountElement.setText(statistics.roleCount);
        replicaCountElement.setText(statistics.replicaCount);
    }

    /**
     * Обновление заголовка страницы
     * @param {ScriptData} scriptData - Данные скрипта
     */
    updatePageTitle(scriptData) {
        if (scriptData && scriptData.roles && scriptData.replicas) {
            const title = `Просмотр скрипта подкаста - ${scriptData.roles.length} ролей, ${scriptData.replicas.length} реплик`;
            document.title = title;
        } else {
            document.title = 'Просмотр скрипта подкаста';
        }
    }

    /**
     * Показ уведомления
     * @param {string} message - Сообщение
     * @param {string} type - Тип уведомления (success, error, warning)
     */
    showNotification(message, type = 'info') {
        // Используем ToastComponent вместо собственной реализации
        return ToastComponent.show(message, { 
            type, 
            duration: 3000,
            position: 'bottom-right'
        });
    }

    /**
     * Показ уведомления об успехе
     * @param {string} message - Сообщение
     */
    showSuccess(message) {
        return this.showNotification(message, 'success');
    }

    /**
     * Показ уведомления об ошибке
     * @param {string} message - Сообщение
     */
    showError(message) {
        return this.showNotification(message, 'error');
    }

    /**
     * Показ предупреждающего уведомления
     * @param {string} message - Сообщение
     */
    showWarning(message) {
        return this.showNotification(message, 'warning');
    }

    /**
     * Очистка всех обработчиков событий
     */
    cleanup() {
        // Очищаем все зарегистрированные обработчики событий
        for (const unsubscribe of this.eventListeners) {
            unsubscribe();
        }
        this.eventListeners.clear();

        // Очищаем компоненты
        for (const [, component] of this.components) {
            component.destroy();
        }
        this.components.clear();

        // Очищаем кэш элементов
        this.elements.clear();

        this.logger.info('UI компоненты режима просмотра очищены');
    }

    /**
     * Обновление стилей темы
     * @param {string} theme - Тема (light, dark, auto)
     */
    updateTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeButtonIcon('viewerThemeToggleBtn', theme); // Используем базовый метод
    }

    /**
     * Обновление иконки кнопки темы
     * @param {string} theme - текущая тема
     */
    updateThemeButtonIcon(buttonId, theme) {
        super.updateThemeButtonIcon(buttonId, theme); // Вызываем базовый метод
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Кнопка возврата к редактированию
        const backBtn = this.getElement('backBtn');
        if (backBtn && backBtn.exists()) {
            const unsubscribe = eventService.subscribeToDOMEvent(
                backBtn.getElement(), 
                'click', 
                () => this.viewerApp.backToEditor()
            );
            this.eventListeners.add(unsubscribe);
        }

        // Кнопка загрузки JSON - теперь напрямую открывает файл
        const loadJsonBtn = this.getElement('loadJsonBtn');
        if (loadJsonBtn && loadJsonBtn.exists()) {
            const unsubscribe = eventService.subscribeToDOMEvent(
                loadJsonBtn.getElement(),
                'click',
                () => {
                    const fileInput = domService.getElement('viewerJsonFileInput');
                    fileInput.safeExecute(element => element.click());
                }
            );
            this.eventListeners.add(unsubscribe);
        }

        // Кнопка печати
        const printBtn = this.getElement('printBtn');
        if (printBtn && printBtn.exists()) {
            const unsubscribe = eventService.subscribeToDOMEvent(
                printBtn.getElement(),
                'click',
                () => this.handlePrint()
            );
            this.eventListeners.add(unsubscribe);
        }

        // Обработчик для основного файла JSON
        const jsonFileInput = this.getElement('jsonFileInput');
        if (jsonFileInput && jsonFileInput.exists()) {
            const unsubscribe = eventService.subscribeToDOMEvent(
                jsonFileInput.getElement(),
                'change',
                (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        this.viewerApp.loadScriptFromJSON(file);
                    }
                    e.target.value = ''; // Сброс файла
                }
            );
            this.eventListeners.add(unsubscribe);
        }

        // Обработчик клавиатуры
        const keyboardHandler = (e) => {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                this.handlePrint();
            }
        };
        document.addEventListener('keydown', keyboardHandler);
        this.eventListeners.add(() => document.removeEventListener('keydown', keyboardHandler));

        // Кнопка переключения темы
        this.setupThemeButton('viewerThemeToggleBtn', () => this.viewerApp.toggleTheme());
    }

    /**
     * Создание кнопки с использованием стандартного компонента
     * @param {Object} options - опции кнопки
     * @returns {ButtonComponent} экземпляр кнопки
     */
    createButton(options) {
        const button = ButtonComponent.create(options);
        this.components.set(`button_${Date.now()}`, button);
        return button;
    }

    /**
     * Создание input с использованием стандартного компонента
     * @param {Object} options - опции input
     * @returns {InputComponent} экземпляр input
     */
    createInput(options) {
        const input = InputComponent.create(options);
        this.components.set(`input_${Date.now()}`, input);
        return input;
    }

    /**
     * Показ модального окна
     * @param {Object} options - опции модального окна
     * @returns {Promise} Promise с результатом
     */
    showModal(options) {
        return ModalComponent.show(options);
    }

    /**
     * Показ модального окна подтверждения
     * @param {string} title - заголовок
     * @param {string} message - сообщение
     * @param {string} confirmText - текст подтверждения
     * @param {string} cancelText - текст отмены
     * @returns {Promise} Promise с результатом
     */
    showConfirmationModal(title, message, confirmText = 'Подтвердить', cancelText = 'Отмена') {
        return ModalComponent.showConfirmation(title, message, confirmText, cancelText);
    }

    /**
     * Показ модального окна с вводом текста
     * @param {string} title - заголовок
     * @param {string} placeholder - placeholder
     * @param {string} defaultValue - значение по умолчанию
     * @returns {Promise} Promise с введенным значением
     */
    showInputModal(title, placeholder, defaultValue = '') {
        return ModalComponent.showInput(title, placeholder, defaultValue);
    }

    /**
     * Показ информационного модального окна
     * @param {string} title - заголовок
     * @param {string} message - сообщение
     * @returns {Promise} Promise с результатом
     */
    showInfoModal(title, message) {
        return ModalComponent.showInfo(title, message);
    }

    /**
     * Безопасное выполнение DOM операций
     * @param {Function} operation - функция для выполнения
     * @param {*} defaultValue - значение по умолчанию при ошибке
     * @returns {*} результат операции или defaultValue
     */
    safeDOMExecute(operation, defaultValue = null) {
        return domService.safeExecute(operation, defaultValue);
    }

    /**
     * Подписка на событие
     * @param {string} event - название события
     * @param {Function} callback - функция-обработчик
     * @returns {Function} функция отписки
     */
    subscribeToEvent(event, callback) {
        return eventService.subscribe(event, callback);
    }

    /**
     * Публикация события
     * @param {string} event - название события
     * @param {...any} args - аргументы события
     * @returns {number} количество вызванных обработчиков
     */
    publishEvent(event, ...args) {
        return eventService.publish(event, ...args);
    }

    /**
     * Получение состояния компонентов
     * @returns {Object} состояние компонентов
     */
    getComponentState() {
        return {
            elementCount: this.elements.size,
            eventListenerCount: this.eventListeners.size,
            componentCount: this.components.size,
            hasData: !!this.viewerApp.currentData
        };
    }
}

// Экспорт для использования в модулях
export { ViewerUIComponents };
