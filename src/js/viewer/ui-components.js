import { logger } from '../logger.js';
import { featherIconsService } from '../utils/feather-icons.js';

/**
 * Компоненты пользовательского интерфейса для режима просмотра
 */
class ViewerUIComponents {
    constructor(viewerApp) {
        this.viewerApp = viewerApp;
        this.logger = logger;
        this.elements = {};
        this.eventListeners = [];
    }

    /**
     * Инициализация UI компонентов
     */
    initialize() {
        this.createControls();
        this.setupEventListeners();
        this.updateControls();
        this.logger.info('UI компоненты режима просмотра инициализированы');
        // Инициализация Feather Icons
        featherIconsService.update();
    }

    /**
     * Загрузка предпочтений темы из localStorage
     */
    loadThemePreference() {
        const savedTheme = localStorage.getItem('viewerTheme');
        if (savedTheme) {
            this.viewerApp.setTheme(savedTheme);
            this.updateThemeButtonIcon(savedTheme);
        } else {
            // Если нет сохраненной темы, используем системную предпочтительную тему
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const theme = systemPrefersDark ? 'dark' : 'light';
            this.viewerApp.setTheme(theme);
            this.updateThemeButtonIcon(theme);
        }
    }

    /**
     * Создание элементов управления
     */
    createControls() {
        // Ссылки на существующие статические элементы
        this.elements.backBtn = document.getElementById('viewerBackBtn');
        this.elements.loadJsonBtn = document.getElementById('viewerLoadJsonBtn');
        this.elements.jsonFileInput = document.getElementById('viewerJsonFileInput');
        this.elements.printBtn = document.getElementById('viewerPrintBtn');
        this.elements.themeToggleBtn = document.getElementById('viewerThemeToggleBtn');
        this.elements.statsContainer = document.getElementById('viewerStatsContainer');
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

        if (this.elements.printBtn) {
            this.elements.printBtn.disabled = !canPrint;
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
        const totalWordsElement = document.getElementById('totalWords');
        const totalDurationElement = document.getElementById('totalDuration');
        const roleCountElement = document.getElementById('roleCount');
        const replicaCountElement = document.getElementById('replicaCount');

        if (totalWordsElement) {
            totalWordsElement.textContent = statistics.totalWords;
        }
        if (totalDurationElement) {
            totalDurationElement.textContent = statistics.totalDurationFormatted;
        }
        if (roleCountElement) {
            roleCountElement.textContent = statistics.roleCount;
        }
        if (replicaCountElement) {
            replicaCountElement.textContent = statistics.replicaCount;
        }
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
        // Удаляем существующие уведомления
        document.querySelectorAll('.viewer-notification').forEach(el => el.remove());

        const notification = document.createElement('div');
        notification.className = `viewer-notification viewer-notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">${message}</div>
            <button class="notification-close">&times;</button>
        `;

        document.body.appendChild(notification);

        // Автоматическое скрытие через 3 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);

        // Обработчик закрытия
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.remove();
            });
        }
    }

    /**
     * Очистка всех обработчиков событий
     */
    cleanup() {
        // Удаляем обработчики событий
        this.eventListeners.forEach(listener => {
            listener.element.removeEventListener(listener.event, listener.handler);
        });

        // Удаляем созданные элементы
        if (this.elements.controlsContainer) {
            this.elements.controlsContainer.remove();
        }

        this.logger.info('UI компоненты режима просмотра очищены');
    }

    /**
     * Обновление стилей темы
     * @param {string} theme - Тема (light, dark, auto)
     */
    updateTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeButtonIcon(theme);
    }

    /**
     * Обновление иконки кнопки темы
     * @param {string} theme - текущая тема
     */
    updateThemeButtonIcon(theme) {
        const themeBtn = document.getElementById('viewerThemeToggleBtn');
        const themeIcon = themeBtn ? themeBtn.querySelector('.theme-icon') : null;
        if (themeIcon) {
            if (theme === 'dark') {
                themeIcon.textContent = '☀️'; // Солнце для темной темы (показываем светлую иконку)
                themeBtn.title = 'Светлая тема';
            } else {
                themeIcon.textContent = '🌙'; // Луна для светлой темы (показываем темную иконку)
                themeBtn.title = 'Темная тема';
            }
        }
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Кнопка возврата к редактированию
        if (this.elements.backBtn) {
            this.elements.backBtn.addEventListener('click', () => {
                this.viewerApp.backToEditor();
            });
        }

        // Кнопка загрузки JSON - теперь напрямую открывает файл
        if (this.elements.loadJsonBtn) {
            this.elements.loadJsonBtn.addEventListener('click', () => {
                document.getElementById('viewerJsonFileInput').click();
            });
        }

        // Кнопка печати
        if (this.elements.printBtn) {
            this.elements.printBtn.addEventListener('click', () => {
                this.handlePrint();
            });
        }

        // Обработчик для основного файла JSON
        if (this.elements.jsonFileInput) {
            this.elements.jsonFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.viewerApp.loadScriptFromJSON(file);
                }
                e.target.value = ''; // Сброс файла
            });
        }

        // Обработчик клавиатуры
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                this.handlePrint();
            }
        });

        // Кнопка переключения темы
        const themeToggleBtn = document.getElementById('viewerThemeToggleBtn');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                this.viewerApp.toggleTheme();
                this.updateThemeButtonIcon(this.viewerApp.getCurrentTheme());
            });
        } else {
            this.logger.error('Элемент viewerThemeToggleBtn не найден в DOM');
        }
    }
}

// Экспорт для использования в модулях
export { ViewerUIComponents };
