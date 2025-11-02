import { logger } from '../logger.js';

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
    }

    /**
     * Создание элементов управления
     */
    createControls() {
        // Контейнер для элементов управления
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'viewer-controls-container';
        document.body.insertBefore(controlsContainer, document.body.firstChild);

        // Создание панели управления
        const controlsPanel = document.createElement('div');
        controlsPanel.className = 'viewer-controls-panel';
        controlsPanel.innerHTML = `
            <div class="viewer-controls-left">
                <button id="viewerBackBtn" class="btn btn-secondary" title="Вернуться к редактированию">
                    <i data-feather="arrow-left"></i> Редактировать
                </button>
                <button id="viewerLoadJsonBtn" class="btn btn-primary" title="Загрузить JSON файл">
                    <i data-feather="upload"></i> Загрузить JSON
                </button>
                <input type="file" id="viewerJsonFileInput" accept=".json" style="display: none;">
            </div>
            <div class="stats-grid" id="viewerStatsContainer">
                <!-- Статистика будет обновляться динамически -->
            </div>
            <div class="viewer-controls-right">
                <button id="viewerPrintBtn" class="btn btn-outline-secondary" title="Печать">
                    <i data-feather="printer"></i> Печать
                </button>
                <button id="viewerCopyBtn" class="btn btn-outline-secondary" title="Копировать текст">
                    <i data-feather="copy"></i> Копировать
                </button>
                <button id="viewerThemeToggleBtn" class="btn btn-outline-secondary theme-toggle-btn" title="Темная тема">
                    <span class="theme-icon">🌙</span>
                </button>
            </div>
        `;
        controlsContainer.appendChild(controlsPanel);

        // Сохранение ссылок на элементы
        this.elements.controlsContainer = controlsContainer;
        this.elements.controlsPanel = controlsPanel;
        this.elements.backBtn = document.getElementById('viewerBackBtn');
        this.elements.loadJsonBtn = document.getElementById('viewerLoadJsonBtn');
        this.elements.jsonFileInput = document.getElementById('viewerJsonFileInput');
        this.elements.printBtn = document.getElementById('viewerPrintBtn');
        this.elements.copyBtn = document.getElementById('viewerCopyBtn');

        // Создание модального окна для загрузки JSON
        this.createLoadJsonModal();
    }

    /**
     * Создание модального окна для загрузки JSON
     */
    createLoadJsonModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay viewer-load-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Загрузить JSON файл</h3>
                    <button class="modal-close" id="viewerLoadModalClose">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Выберите JSON файл с сохраненным скриптом подкаста</p>
                    <input type="file" id="viewerModalJsonFile" accept=".json" class="file-input">
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="viewerModalCancelBtn">Отмена</button>
                    <button class="btn btn-primary" id="viewerModalLoadBtn" disabled>Загрузить</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        this.elements.loadModal = modal;
        this.elements.modalFileInput = document.getElementById('viewerModalJsonFile');
        this.elements.modalCloseBtn = document.getElementById('viewerLoadModalClose');
        this.elements.modalCancelBtn = document.getElementById('viewerModalCancelBtn');
        this.elements.modalLoadBtn = document.getElementById('viewerModalLoadBtn');
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Кнопка возврата к редактированию
        if (this.elements.backBtn) {
            this.elements.backBtn.addEventListener('click', () => {
                this.handleBackToEditor();
            });
        }

        // Кнопка загрузки JSON
        if (this.elements.loadJsonBtn) {
            this.elements.loadJsonBtn.addEventListener('click', () => {
                this.showLoadJsonModal();
            });
        }

        // Кнопка печати
        if (this.elements.printBtn) {
            this.elements.printBtn.addEventListener('click', () => {
                this.handlePrint();
            });
        }

        // Кнопка копирования
        if (this.elements.copyBtn) {
            this.elements.copyBtn.addEventListener('click', () => {
                this.handleCopyScript();
            });
        }

        // Обработчики для модального окна
        if (this.elements.modalFileInput) {
            this.elements.modalFileInput.addEventListener('change', (e) => {
                this.handleModalFileSelect(e);
            });
        }

        if (this.elements.modalCloseBtn) {
            this.elements.modalCloseBtn.addEventListener('click', () => {
                this.hideLoadJsonModal();
            });
        }

        if (this.elements.modalCancelBtn) {
            this.elements.modalCancelBtn.addEventListener('click', () => {
                this.hideLoadJsonModal();
            });
        }

        if (this.elements.modalLoadBtn) {
            this.elements.modalLoadBtn.addEventListener('click', () => {
                this.handleModalLoad();
            });
        }

        // Закрытие модального окна по клику вне его
        if (this.elements.loadModal) {
            this.elements.loadModal.addEventListener('click', (e) => {
                if (e.target === this.elements.loadModal) {
                    this.hideLoadJsonModal();
                }
            });
        }

        // Обработчик для основного файла JSON
        if (this.elements.jsonFileInput) {
            this.elements.jsonFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleJsonFileLoad(file);
                }
                e.target.value = ''; // Сброс файла
            });
        }

        // Обработчик клавиатуры
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                this.handlePrint();
            } else if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.handleCopyScript();
            } else if (e.key === 'Escape') {
                if (this.elements.loadModal && this.elements.loadModal.style.display !== 'none') {
                    this.hideLoadJsonModal();
                }
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

    /**
     * Обработка возврата к редактору
     */
    handleBackToEditor() {
        // Возвращаемся к редактору через историю или перенаправляем на главную страницу
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = 'index.html';
        }
    }

    /**
     * Обработка загрузки JSON файла
     * @param {File} file - JSON файл
     */
    async handleJsonFileLoad(file) {
        try {
            const scriptData = await this.viewerApp.dataLoader.loadFromJSONFile(file);
            if (scriptData) {
                this.viewerApp.loadScript(scriptData);
                this.logger.info('JSON файл успешно загружен', {
                    fileName: file.name
                });
            } else {
                this.showNotification('Ошибка при загрузке файла', 'error');
            }
        } catch (error) {
            this.logger.error('Ошибка при загрузке JSON файла', {
                error: error.message
            });
            this.showNotification('Ошибка при загрузке файла', 'error');
        }
    }

    /**
     * Показ модального окна загрузки JSON
     */
    showLoadJsonModal() {
        if (this.elements.loadModal) {
            this.elements.loadModal.style.display = 'flex';
            this.elements.modalFileInput.focus();
        }
    }

    /**
     * Скрытие модального окна загрузки JSON
     */
    hideLoadJsonModal() {
        if (this.elements.loadModal) {
            this.elements.loadModal.style.display = 'none';
            this.elements.modalFileInput.value = ''; // Сброс файла
            this.elements.modalLoadBtn.disabled = true;
        }
    }

    /**
     * Обработка выбора файла в модальном окне
     * @param {Event} e - Событие изменения файла
     */
    handleModalFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.elements.modalLoadBtn.disabled = false;
        } else {
            this.elements.modalLoadBtn.disabled = true;
        }
    }

    /**
     * Обработка загрузки в модальном окне
     */
    async handleModalLoad() {
        const file = this.elements.modalFileInput.files[0];
        if (file) {
            try {
                const scriptData = await this.viewerApp.dataLoader.loadFromJSONFile(file);
                if (scriptData) {
                    this.viewerApp.loadScript(scriptData);
                    this.hideLoadJsonModal();
                    this.logger.info('JSON файл загружен через модальное окно', {
                        fileName: file.name
                    });
                } else {
                    this.showNotification('Невалидный файл скрипта', 'error');
                }
            } catch (error) {
                this.logger.error('Ошибка при загрузке файла в модальном окне', {
                    error: error.message
                });
                this.showNotification('Ошибка при загрузке файла', 'error');
            }
        }
    }

    /**
     * Обработка печати
     */
    handlePrint() {
        window.print();
    }

    /**
     * Обработка копирования скрипта
     */
    async handleCopyScript() {
        try {
            const scriptText = this.extractScriptText();
            await navigator.clipboard.writeText(scriptText);
            this.showNotification('Скрипт скопирован в буфер обмена', 'success');
            this.logger.info('Скрипт скопирован в буфер обмена');
        } catch (error) {
            this.logger.error('Ошибка при копировании скрипта', {
                error: error.message
            });
            // Резервный метод для старых браузеров
            this.fallbackCopyScript();
        }
    }

    /**
     * Извлечение текста скрипта для копирования
     * @returns {string} Текст скрипта
     */
    extractScriptText() {
        if (!this.viewerApp.currentData) return '';

        const replicasWithRoleInfo = this.viewerApp.currentData.getReplicasWithRoleInfo();
        let scriptText = 'СКРИПТ ПОДКАСТА\n\n';

        // Добавляем статистику
        const stats = this.viewerApp.currentData.statistics;
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
     * Резервный метод копирования для старых браузеров
     */
    fallbackCopyScript() {
        const textArea = document.createElement('textarea');
        textArea.value = this.extractScriptText();
        textArea.style.position = 'fixed';
        textArea.style.left = '-99999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.showNotification('Скрипт скопирован в буфер обмена', 'success');
            } else {
                this.showNotification('Не удалось скопировать скрипт', 'error');
            }
        } catch {
            this.showNotification('Не удалось скопировать скрипт', 'error');
        }

        document.body.removeChild(textArea);
    }

    /**
     * Обновление состояния элементов управления
     */
    updateControls() {
        // Обновляем состояние кнопок в зависимости от наличия данных
        const hasData = this.viewerApp.currentData !== null;
        const canPrint = hasData;
        const canCopy = hasData;

        if (this.elements.printBtn) {
            this.elements.printBtn.disabled = !canPrint;
        }

        if (this.elements.copyBtn) {
            this.elements.copyBtn.disabled = !canCopy;
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
        const statsContainer = document.getElementById('viewerStatsContainer');
        if (!statsContainer || !statistics) {
            return;
        }

        const statsHTML = `
            <div class="stat-item">
                <span class="stat-label">Слова</span>
                <span class="stat-value">${statistics.totalWords}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Длительность</span>
                <span class="stat-value">${statistics.totalDurationFormatted}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Роли</span>
                <span class="stat-value">${statistics.roleCount}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Реплики</span>
                <span class="stat-value">${statistics.replicaCount}</span>
            </div>
        `;

        statsContainer.innerHTML = statsHTML;
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

        if (this.elements.loadModal) {
            this.elements.loadModal.remove();
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
     * Адаптивность для мобильных устройств
     */
    setupMobileAdaptability() {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            this.elements.controlsPanel.classList.add('mobile');
        }

        window.addEventListener('resize', () => {
            const isNowMobile = window.innerWidth < 768;
            if (isNowMobile) {
                this.elements.controlsPanel.classList.add('mobile');
            } else {
                this.elements.controlsPanel.classList.remove('mobile');
            }
        });
    }

    /**
     * Установка заголовка страницы
     * @param {string} title - Заголовок
     */
    setPageTitle(title) {
        document.title = title || 'Просмотр скрипта подкаста';
    }

    /**
     * Обновление информации о скрипте в заголовке
     * @param {ScriptData} scriptData - Данные скрипта
     */
    updatePageTitle(scriptData) {
        if (scriptData && scriptData.validate()) {
            const roleName = scriptData.roles[0] ? scriptData.roles[0].name : 'Скрипт';
            document.title = `Просмотр: ${roleName} - ${scriptData.replicas.length} реплик`;
        } else {
            document.title = 'Просмотр скрипта подкаста';
        }
    }
}

// Экспорт для использования в модулях
export { ViewerUIComponents };
