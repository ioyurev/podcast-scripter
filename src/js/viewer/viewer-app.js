
import { themeManager } from '../common/theme-manager.js';
import { DataService } from '../core/data-service.js';
import { logger } from '../logger.js';
import { ScriptData } from '../models/script-data.js';
import { ToastComponent } from '../ui/toast-component.js';
import { featherIconsService } from '../utils/feather-icons.js';

import { ScriptViewer } from './script-viewer.js';
import { ViewerUIComponents } from './ui-components.js';

/**
 * Главное приложение режима просмотра
 */
class ViewerApp {
    constructor() {
        this.dataService = new DataService();
        this.scriptViewer = null;
        this.uiComponents = null;
        this.currentData = null;
        this.isInitialized = false;
        this.logger = logger;
        this.storageUnsubscribe = null;
    }

    /**
     * Инициализация приложения
     */
    async initialize() {
        try {
            // Создание контейнера для отображения скрипта
            this.createMainContainer();

            // Инициализация компонентов
            this.scriptViewer = new ScriptViewer(
                document.getElementById('viewerScriptContainer'),
                { showStats: true, showColors: true, showRoleInfo: true }
            );

            this.uiComponents = new ViewerUIComponents(this);
            this.uiComponents.initialize();

            // Загрузка предпочтений темы
            this.uiComponents.loadThemePreference();

            // Настройка слушателя изменений в localStorage
            this.setupStorageListener();

            // Загрузка данных
            await this.loadInitialData();

            this.isInitialized = true;
            this.logger.info('Приложение режима просмотра инициализировано');

            // Инициализация Feather Icons
            this.initFeatherIcons();
        } catch (error) {
            logger.time('viewer-initialization-error');
            logger.error('Ошибка при инициализации приложения просмотра', {
                error: error.message
            });
            logger.timeEnd('viewer-initialization-error');
            throw error;
        }
    }

    /**
     * Инициализация основного контейнера
     */
    createMainContainer() {
        // Проверяем существующий контейнер из HTML
        const existingContainer = document.getElementById('viewerScriptContainer');
        if (existingContainer) {
            // Контейнер уже существует в HTML, используем его
            return;
        }

        // Если контейнер не найден, создаем его (резервный вариант)
        const container = document.createElement('div');
        container.id = 'viewerScriptContainer';
        container.className = 'viewer-script-container';
        document.body.appendChild(container);
    }

    /**
     * Настройка слушателя изменений в localStorage
     */
    setupStorageListener() {
        // Подписываемся на изменения в localStorage через DataService
        this.storageUnsubscribe = this.dataService.subscribeToStorageChanges((event) => {
            if (event.key === 'podcastScriptViewerData' && event.newValue) {
                try {
                    const data = JSON.parse(event.newValue);
                    this.handleStorageChange(data);
                } catch (error) {
                    this.logger.error('Ошибка при парсинге данных из storage event:', { error: error.message });
                    this.handleStorageChange(null);
                }
            }
        });
    }

    /**
     * Загрузка начальных данных
     */
    async loadInitialData() {
        // Сначала пробуем загрузить из localStorage
        const scriptData = this.dataService.loadFromStorage('podcastScriptViewerData');
        if (scriptData) {
            await this.loadScript(scriptData);
        } else {
            // Если нет данных в localStorage, показываем пустое состояние
            this.scriptViewer.render(null);
        }
    }

    /**
     * Обработка изменений в localStorage
     * @param {Object} data - Новые данные
     */
    async handleStorageChange(data) {
        try {
            const scriptData = new ScriptData(data);
            if (scriptData.validate()) {
                await this.loadScript(scriptData);
                this.logger.info('Данные обновлены из localStorage', {
                    roleCount: scriptData.roles.length,
                    replicaCount: scriptData.replicas.length
                });
            } else {
                this.logger.error('Получены невалидные данные из localStorage');
            }
        } catch (error) {
            this.logger.error('Ошибка при обработке изменений из localStorage', {
                error: error.message
            });
        }
    }

    /**
     * Загрузка и отображение скрипта
     * @param {ScriptData} scriptData - Данные скрипта
     * @returns {Promise<boolean>} Успешно ли загружено
     */
    async loadScript(scriptData) {
        try {
            if (!scriptData || !scriptData.validate()) {
                this.logger.error('Попытка загрузить невалидные данные');
                return false;
            }

            this.currentData = scriptData;
            this.scriptViewer.render(scriptData);
            this.uiComponents.updateControls({ hasData: true });
            this.uiComponents.updatePageTitle(scriptData);

            // Обновляем статистику в панели управления
            if (this.uiComponents.updateStatistics) {
                this.uiComponents.updateStatistics(scriptData.statistics);
            }

            // Сохраняем в localStorage для синхронизации
            this.dataService.saveToStorage(scriptData, 'podcastScriptViewerData');

            this.logger.info('Скрипт успешно загружен и отображен', {
                roleCount: scriptData.roles.length,
                replicaCount: scriptData.replicas.length
            });

            return true;
        } catch (error) {
            this.logger.error('Ошибка при загрузке скрипта', {
                error: error.message
            });
            return false;
        }
    }

    /**
     * Инициализация Feather Icons
     */
    initFeatherIcons() {
        featherIconsService.setLogger(this.logger);
        const success = featherIconsService.initialize();
        if (!success) {
            // Если основная инициализация не удалась, пробуем асинхронную
            featherIconsService.initializeAsync().catch(() => {
                // Если все равно не удалось, продолжаем без иконок
                this.logger.warn('Feather Icons не доступен');
            });
        }
    }

    /**
     * Обновление отображения
     */
    updateDisplay() {
        if (this.currentData) {
            this.scriptViewer.update(this.currentData);
        } else {
            this.scriptViewer.render(null);
        }
    }

    /**
     * Получение текущего состояния
     * @returns {Object} Состояние приложения
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            hasData: !!this.currentData,
            currentData: this.currentData,
            storageInfo: this.dataService.getStorageInfo('podcastScriptViewerData')
        };
    }

    /**
     * Очистка приложения
     */
    cleanup() {
        // Отписываемся от изменений в localStorage
        if (this.storageUnsubscribe) {
            this.storageUnsubscribe();
        }

        // Очищаем UI компоненты
        if (this.uiComponents) {
            this.uiComponents.cleanup();
        }

        // Очищаем отображение
        if (this.scriptViewer) {
            this.scriptViewer.clear();
        }

        // Удаляем основной контейнер
        const container = document.getElementById('viewerScriptContainer');
        if (container) {
            container.remove();
        }

        this.isInitialized = false;
        this.currentData = null;

        this.logger.info('Приложение режима просмотра очищено');
    }

    /**
     * Сохранение текущих данных в localStorage
     * @returns {boolean} Успешно ли сохранено
     */
    saveCurrentData() {
        if (this.currentData) {
            return this.dataService.saveToStorage(this.currentData, 'podcastScriptViewerData');
        }
        return false;
    }

    /**
     * Очистка данных
     */
    clearData() {
        this.dataService.clearStorage('podcastScriptViewerData');
        this.currentData = null;
        this.scriptViewer.clear();
        this.uiComponents.updateControls({ hasData: false });
        this.logger.info('Данные режима просмотра очищены');
    }

    /**
     * Прокрутка к началу
     */
    scrollToTop() {
        if (this.scriptViewer) {
            this.scriptViewer.scrollToTop();
        }
    }

    /**
     * Прокрутка к реплике по индексу
     * @param {number} index - Индекс реплики (начиная с 1)
     */
    scrollToReplica(index) {
        if (this.scriptViewer) {
            this.scriptViewer.scrollToReplica(index);
        }
    }

    /**
     * Получение текста скрипта для копирования
     * @returns {string} Текст скрипта
     */
    getScriptText() {
        if (!this.currentData) return '';

        const replicasWithRoleInfo = this.currentData.getReplicasWithRoleInfo();
        let scriptText = 'СКРИПТ ПОДКАСТА\n\n';

        // Добавляем статистику
        const stats = this.currentData.statistics;
        scriptText += `Всего слов: ${stats.totalWords}\n`;
        scriptText += `Общая длительность: ${stats.totalDurationFormatted}\n`;
        scriptText += `Ролей: ${stats.roleCount}\n`;
        scriptText += `Реплик: ${stats.replicaCount}\n\n`;

        // Добавляем реплики
        replicasWithRoleInfo.forEach((replica, index) => {
            const role = replica.role;
            const roleName = role ? role.name : 'Без роли';
            const roleType = role ? (role.type === 'speaker' ? 'Спикер' : 'Звук') : '';
            const prefix = roleType ? `${roleName} (${roleType})` : roleName;
            scriptText += `${index + 1}. ${prefix}: ${replica.text}\n`;
        });

        return scriptText;
    }

    /**
     * Установка темы
     * @param {string} theme - Тема (light, dark, auto)
     */
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        if (this.uiComponents) {
            this.uiComponents.updateTheme(theme);
        }
    }

    /**
     * Получение текущей темы
     * @returns {string} Текущая тема
     */
    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    }

    /**
     * Переключение темы
     */
    toggleTheme() {
        const newTheme = themeManager.toggleTheme(); // Используем общий менеджер
        this.setTheme(newTheme);
        localStorage.setItem('viewerTheme', newTheme);
        return newTheme;
    }

    /**
     * Загрузка скрипта из JSON файла
     * @param {File} file - Файл для загрузки
     * @returns {Promise<boolean>} Успешно ли загружено
     */
    async loadScriptFromJSON(file) {
        try {
            const scriptData = await this.dataService.loadFromJSONFile(file);
            if (scriptData) {
                const success = await this.loadScript(scriptData);
                if (success) {
                    this.logger.logUserAction('загрузка скрипта в режиме просмотра', {
                        fileName: file.name,
                        success: true,
                        roleCount: scriptData.roles.length,
                        replicaCount: scriptData.replicas.length
                    });
                    
                    // Показываем toast уведомление об успешной загрузке
                    ToastComponent.success(`Файл "${file.name}" успешно загружен! Роли: ${scriptData.roles.length}, Реплики: ${scriptData.replicas.length}`, { duration: 5000 });
                } else {
                    this.logger.logUserAction('ошибка загрузки скрипта в режиме просмотра', {
                        fileName: file.name,
                        success: false
                    });
                    
                    // Показываем toast уведомление об ошибке
                    ToastComponent.error('Не удалось загрузить скрипт из файла.', { duration: 7000 });
                }
                return success;
            } else {
                this.logger.logUserAction('ошибка загрузки скрипта в режиме просмотра', {
                    fileName: file.name,
                    success: false
                });
                
                // Показываем toast уведомление об ошибке
                ToastComponent.error('Не удалось загрузить скрипт из файла.', { duration: 7000 });
                return false;
            }
        } catch (error) {
            this.logger.error('Ошибка при загрузке скрипта из JSON файла', {
                error: error.message,
                fileName: file.name
            });
            
            // Показываем toast уведомление об ошибке
            ToastComponent.error(`Ошибка при загрузке файла: ${error.message}`, { duration: 7000 });
            return false;
        }
    }

    /**
     * Возврат к редактору
     */
    backToEditor() {
        // Сохраняем текущие данные обратно в основное хранилище редактора
        if (this.currentData) {
            this.dataService.saveToStorage(this.currentData, 'podcastScriptData');
            this.logger.info('Данные сохранены в основное хранилище перед возвратом к редактору');
        }
        
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = 'index.html';
        }
    }

    /**
     * Печать скрипта
     */
    printScript() {
        window.print();
    }

    /**
     * Копирование скрипта в буфер обмена
     * @returns {Promise<boolean>} Успешно ли скопировано
     */
    async copyScriptToClipboard() {
        try {
            const scriptText = this.getScriptText();
            await navigator.clipboard.writeText(scriptText);
            this.logger.info('Скрипт скопирован в буфер обмена');
            return true;
        } catch (error) {
            this.logger.error('Ошибка при копировании скрипта в буфер обмена', {
                error: error.message
            });
            return false;
        }
    }
}

// Глобальная инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Добавляем небольшую задержку для уверенности, что DOM полностью загружен
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Проверяем наличие необходимых элементов перед инициализацией
        const container = document.getElementById('viewerScriptContainer');
        if (!container) {
            logger.error('Контейнер viewerScriptContainer не найден в DOM');
            return;
        }

        window.viewerApp = new ViewerApp();
        await window.viewerApp.initialize();
        logger.info('Приложение режима просмотра запущено');
    } catch (error) {
        logger.error('Ошибка при запуске приложения режима просмотра', {
            error: error.message,
            stack: error.stack
        });
    }
});

// Экспорт для использования в модулях
export { ViewerApp };
