
import { BaseUIComponent } from '../common/base-ui-component.js';
import { themeManager } from '../common/theme-manager.js';
import { logger } from '../logger.js';
import { Replica } from '../models/replica.js';
import { Speaker, SoundEffect } from '../models/role.js';
import { ScriptData } from '../models/script-data.js';

import { ModalComponent } from './modal-component.js';
import { SoundEffectElement } from './sound-effect-element.js';
import { SpeakerReplicaElement } from './speaker-replica-element.js';
import { ToastComponent } from './toast-component.js';

/**
 * Компоненты пользовательского интерфейса
 */
class UIComponents extends BaseUIComponent {
    constructor(dataManager, dataService) {
        super();
        this.dataManager = dataManager;
        this.dataService = dataService;
        this.draggedElement = null;
        this.draggedReplicaId = null;
        this.currentSpeakerColor = '#007bff'; // Начальный цвет по умолчанию
        
        logger.info('Компоненты UI инициализированы');
    }

    /**
     * Инициализация компонентов
     */
    initialize() {
        super.initialize(); // Вызываем базовую инициализацию
        this.setupEventListeners();
        this.loadThemePreference(); // Загружаем сохраненную тему при инициализации
        this.updateRolesList();
        this.updateReplicasList();
        this.updateStatistics();
        
        // Инициализация Feather Icons через app
        if (window.app && typeof window.app.initFeatherIcons === 'function') {
            window.app.initFeatherIcons();
        }
        
        logger.info('Компоненты UI инициализированы и обновлены');
    }

    /**
     * Загрузка предпочтений темы из localStorage
     */
    loadThemePreference() {
        const savedTheme = localStorage.getItem('themePreference');
        if (savedTheme) {
            this.applyTheme(savedTheme);
        } else {
            // Если нет сохраненной темы, используем системную предпочтительную тему
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.applyTheme(systemPrefersDark ? 'dark' : 'light');
        }
    }

    /**
     * Применение темы
     * @param {string} theme - 'light', 'dark' или 'auto'
     */
    applyTheme(theme) {
        const html = document.documentElement;
        html.removeAttribute('data-theme'); // Удаляем предыдущую тему
        
        if (theme === 'dark') {
            html.setAttribute('data-theme', 'dark');
        } else if (theme === 'light') {
            html.removeAttribute('data-theme'); // Используем светлую тему по умолчанию
        } else if (theme === 'auto') {
            // Автоматически определяем по системным настройкам
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (systemPrefersDark) {
                html.setAttribute('data-theme', 'dark');
            }
        }
    }

    /**
     * Переключение темы
     */
    toggleTheme() {
        const newTheme = themeManager.toggleTheme(); // Используем общий менеджер
        this.updateThemeButtonIcon('themeToggleBtn', newTheme); // Обновляем иконку кнопки
        return newTheme;
    }

    /**
     * Обновление иконки кнопки темы
     * @param {string} theme - текущая тема
     */
    updateThemeButtonIcon(buttonId, theme) {
        super.updateThemeButtonIcon(buttonId, theme); // Вызываем базовый метод
    }

    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        // Добавление роли
        document.getElementById('addRoleBtn').addEventListener('click', () => {
            this.handleAddRole();
        });

        // Добавление реплики
        document.getElementById('addReplicaBtn').addEventListener('click', () => {
            this.handleAddReplica();
        });

        // Скачивание скрипта
        document.getElementById('saveScriptBtn').addEventListener('click', () => {
            this.handleDownloadScript();
        });

        // Загрузка скрипта
        document.getElementById('loadScriptBtn').addEventListener('click', () => {
            document.getElementById('loadScriptInput').click();
        });

        // Обработка загрузки файла
        const loadScriptInput = document.getElementById('loadScriptInput');
        if (loadScriptInput) {
            loadScriptInput.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (file) {
                    await this.handleLoadScript(file);
                    event.target.value = ''; // Сброс файла
                }
            });
        } else {
            logger.error('Элемент loadScriptInput не найден в DOM');
        }

        // Обновление при изменении роли в селекте реплик
        document.getElementById('replicaRole').addEventListener('change', () => {
            this.updateReplicaControls();
        });

        // Обновление при вводе текста реплики
        document.getElementById('replicaText').addEventListener('input', () => {
            this.updateReplicaControls();
        });

        // Кнопка переключения темы
        this.setupThemeButton('themeToggleBtn', () => this.toggleTheme()); // Используем базовый метод с кастомным обработчиком

        // Обновление статистики при изменении данных
        this.dataManager.addUpdateCallback(() => {
            this.updateStatistics();
            this.updateReplicaControls();
        });

        // Обработчики для элементов управления цветом спикера
        this.setupColorControls();

        // Кнопка открытия режима просмотра
        this.setupViewerModeButton();

        logger.info('Слушатели событий настроены');
    }

    /**
     * Настройка кнопки открытия режима просмотра
     */
    setupViewerModeButton() {
        // Находим элемент file-controls в header
        const fileControls = document.querySelector('.file-controls');
        if (fileControls) {
            // Создаем кнопку для режима просмотра
            const viewerBtn = document.createElement('button');
            viewerBtn.id = 'viewerModeBtn';
            viewerBtn.className = 'btn btn-outline-secondary';
            viewerBtn.title = 'Открыть режим просмотра';
            viewerBtn.innerHTML = '<i data-feather="eye"></i> Просмотр';

            // Вставляем кнопку перед кнопкой темы
            const themeToggleBtn = document.getElementById('themeToggleBtn');
            if (themeToggleBtn) {
                themeToggleBtn.parentNode.insertBefore(viewerBtn, themeToggleBtn);
            } else {
                fileControls.appendChild(viewerBtn);
            }

            // Добавляем обработчик события
            viewerBtn.addEventListener('click', () => {
                this.handleOpenViewerMode();
            });

            // Инициализируем Feather Icons для новой кнопки
            if (typeof feather !== 'undefined') {
                feather.replace({ selector: '#viewerModeBtn i' });
            }

            logger.info('Кнопка режима просмотра добавлена');
        } else {
            logger.error('Элемент file-controls не найден для добавления кнопки режима просмотра');
        }
    }

    /**
     * Обработка открытия режима просмотра
     */
    handleOpenViewerMode() {
        try {
            // Проверяем, есть ли у нас доступ к основному приложению
            if (window.app && typeof window.app.openViewerMode === 'function') {
                const success = window.app.openViewerMode();
                if (success) {
                    logger.logUserAction('открытие режима просмотра', {
                        success: true
                    });
                } else {
                    logger.logUserAction('ошибка открытия режима просмотра', {
                        success: false
                    });
                }
            } else {
                logger.error('Основное приложение не найдено для открытия режима просмотра');
                alert('Не удалось открыть режим просмотра. Пожалуйста, перезагрузите страницу.');
            }
        } catch (error) {
            logger.time('ui-components-initialization-error');
            logger.error('Ошибка при инициализации компонентов UI', {
                error: error.message
            });
            logger.timeEnd('ui-components-initialization-error');
            throw error;
        }
    }

    /**
     * Настройка элементов управления цветом спикера
     */
    setupColorControls() {
        const colorPicker = document.getElementById('speakerColorPicker');
        const randomColorBtn = document.getElementById('randomColorBtn');

        // Загружаем последний выбранный цвет из localStorage, если он есть
        const savedColor = localStorage.getItem('speakerColorPicker');
        if (savedColor) {
            this.currentSpeakerColor = savedColor;
        }
        this.updateColorDisplay();

        // Обработчик для выбора цвета из палитры
        colorPicker.addEventListener('input', (e) => {
            this.currentSpeakerColor = e.target.value;
            this.updateColorDisplay();
            // Сохраняем выбранный цвет в localStorage
            localStorage.setItem('speakerColorPicker', this.currentSpeakerColor);
        });

        // Обработчик для кнопки случайного цвета
        randomColorBtn.addEventListener('click', () => {
            this.generateRandomColor();
            this.updateColorDisplay();
            // Сохраняем случайный цвет в localStorage
            localStorage.setItem('speakerColorPicker', this.currentSpeakerColor);
        });
    }


    /**
     * Генерация случайного цвета
     */
    generateRandomColor() {
        const hue = Math.floor(Math.random() * 360);
        const saturation = 70 + Math.floor(Math.random() * 30); // 70-100%
        const lightness = 40 + Math.floor(Math.random() * 20); // 40-60%
        this.currentSpeakerColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    /**
     * Обновление отображения цвета
     */
    updateColorDisplay() {
        const colorPicker = document.getElementById('speakerColorPicker');
        if (!colorPicker) {
            logger.error('Элемент speakerColorPicker не найден в DOM');
            return;
        }
        
        try {
            // Преобразуем HSL в HEX для color picker
            const hexColor = this.hslToHex(this.currentSpeakerColor);
            colorPicker.value = hexColor;
        } catch (error) {
            logger.error('Ошибка при обновлении отображения цвета:', error);
            // Устанавливаем цвет по умолчанию при ошибке
            colorPicker.value = '#007bff';
        }
    }

    /**
     * Преобразование HSL в HEX
     * @param {string} color - строка в формате hsl(h, s%, l%), hsla(h, s%, l%, a) или #rrggbb
     * @returns {string} цвет в формате #rrggbb
     */
    hslToHex(color) {
        try {
            // Если цвет уже в HEX формате, возвращаем его как есть
            if (color.startsWith('#')) {
                // Проверяем валидность HEX цвета
                const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
                if (hexPattern.test(color)) {
                    return color;
                }
                return '#007bff'; // возвращаем цвет по умолчанию при ошибке
            }

            // Извлекаем значения из HSL/HSLA
            const hslMatch = color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%/);
            if (!hslMatch) return '#007bff'; // возвращаем цвет по умолчанию при ошибке

            const h = parseInt(hslMatch[1]) / 360;
            const s = parseInt(hslMatch[2]) / 100;
            const l = parseInt(hslMatch[3]) / 100;

            let r, g, b;
            if (s === 0) {
                r = g = b = l; // achromatic
            } else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };

                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }

            const toHex = x => {
                const hex = Math.round(x * 255).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            };

            return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        } catch (error) {
            logger.error('Ошибка при преобразовании цвета в HEX:', error);
            return '#007bff'; // возвращаем цвет по умолчанию при ошибке
        }
    }

    /**
     * Обработка добавления роли
     */
    handleAddRole() {
        const nameInput = document.getElementById('roleName');
        const typeSelect = document.getElementById('roleType');
        
        const name = nameInput.value.trim();
        const type = typeSelect.value;

        // Проверка на пустое имя (только пробелы)
        if (!name) {
            alert('Пожалуйста, введите имя роли (не может быть пустым или содержать только пробелы)');
            return;
        }

        // Проверка длины имени (1-50 символов)
        if (name.length < 1 || name.length > 50) {
            alert('Имя роли должно содержать от 1 до 50 символов');
            return;
        }

        // Проверка на дубликаты (с учетом регистра)
        const existingRoles = this.dataManager.roleManager.getAll();
        const duplicateRole = existingRoles.find(role => role.name.toLowerCase() === name.toLowerCase());
        if (duplicateRole) {
            alert(`Роль с именем "${name}" уже существует. Пожалуйста, выберите другое имя.`);
            nameInput.focus();
            return;
        }

        let role;
        if (type === 'speaker') {
            role = new Speaker(name);
            // Используем текущий выбранный цвет для спикера, а не генерируем случайный
            // Сохраняем текущий цвет как цвет спикера
            role.color = this.currentSpeakerColor;
        } else {
            role = new SoundEffect(name);
        }

        this.dataManager.addRole(role);
        nameInput.value = '';
        nameInput.focus();
        
        // Обновляем список ролей и селект реплик
        this.updateRolesList();
        this.updateRoleSelect();

        // Если была добавлена роль спикера, меняем цвет пикера на случайный
        if (type === 'speaker') {
            this.generateRandomColor();
            this.updateColorDisplay();
            // Сохраняем случайный цвет в localStorage
            localStorage.setItem('speakerColorPicker', this.currentSpeakerColor);
        }

        logger.logUserAction('добавление роли', {
            roleName: name,
            roleType: type
        });
    }

    /**
     * Обработка добавления реплики
     */
    handleAddReplica() {
        const roleSelect = document.getElementById('replicaRole');
        const textArea = document.getElementById('replicaText');
        
        const roleId = roleSelect.value;
        const text = textArea.value.trim();

        if (!roleId) {
            alert('Пожалуйста, выберите роль');
            return;
        }

        // Check if the selected role is a sound effect
        const selectedRole = this.dataManager.roleManager.findById(roleId);
        if (selectedRole && selectedRole.type === 'sound') {
            // For sound effects, allow adding without text
            if (!text) {
                // Create a replica with empty text for sound effects
                const replica = new Replica('', roleId);
                this.dataManager.addReplica(replica);
            } else {
                // If there is text, allow adding it (for cases where user might want to add descriptive text)
                const replica = new Replica(text, roleId);
                this.dataManager.addReplica(replica);
            }
        } else {
            // For speakers, require text
            if (!text) {
                alert('Пожалуйста, введите текст реплики');
                return;
            }
            const replica = new Replica(text, roleId);
            this.dataManager.addReplica(replica);
        }
        
        textArea.value = '';
        textArea.focus();
        
        // Обновляем список реплик после добавления
        this.updateReplicasList();
        
        // Прокручиваем список реплик к концу
        const replicasList = document.getElementById('replicasList');
        if (replicasList) {
            // Небольшая задержка, чтобы элемент успел отрендериться
            setTimeout(() => {
                replicasList.scrollTop = replicasList.scrollHeight;
            }, 10);
        }

        logger.logUserAction('добавление реплики', {
            roleId: roleId,
            textLength: text.length
        });
    }

    /**
     * Обработка скачивания скрипта
     */
    handleDownloadScript() {
        // Создаем модальное окно для ввода имени файла
        this.showFilenameDialog((filename) => {
            if (filename !== null) {
                // Get the current script data from dataManager
                const data = this.dataManager.exportData();
                // Create a ScriptData instance from the exported data
                const scriptData = new ScriptData(data);

                const success = this.dataService.saveToJSONFile(scriptData, filename);
                if (success) {
                    logger.logUserAction('скачивание скрипта', {
                        success: true,
                        filename: filename
                    });
                } else {
                    logger.logUserAction('ошибка скачивания скрипта', {
                        success: false,
                        filename: filename
                    });
                }
            }
        });
    }

    /**
     * Показ модального окна для ввода имени файла
     * @param {Function} onConfirm - Функция для выполнения при подтверждении
     */
    async showFilenameDialog(onConfirm) {
        try {
            // Устанавливаем предустановленное имя файла
            const defaultName = `podcast-script-${new Date().toISOString().slice(0, 10)}`;
            
            const result = await ModalComponent.show({
                title: 'Скачать файл',
                type: 'input',
                content: (container) => {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'form-control';
                    input.placeholder = 'Введите имя файла для скачивания (без расширения .json)';
                    input.value = defaultName;
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
                        text: 'Скачать',
                        icon: 'download',
                        type: 'primary',
                        onClick: () => {
                            const input = document.querySelector('.modal-body input');
                            return input.value.trim() || null;
                        },
                        autoClose: true
                    }
                ]
            });

            onConfirm(result);
        } catch (error) {
            logger.error('Ошибка при показе модального окна ввода имени файла:', error);
            onConfirm(null);
        }
    }

    /**
     * Обработка загрузки скрипта
     * @param {File} file - Файл для загрузки
     */
    async handleLoadScript(file) {
        logger.debug('Начало обработки загрузки скрипта', { fileName: file.name, fileSize: file.size });
        
        try {
            // Load the file data directly without modal
            const scriptData = await this.dataService.loadFromJSONFile(file);
            logger.debug('Результат загрузки из JSON файла', { scriptData: scriptData ? 'loaded' : 'null', hasRoles: scriptData?.roles?.length, hasReplicas: scriptData?.replicas?.length });
            
            if (scriptData) {
                // Convert ScriptData to DataManager import format and import the data
                logger.debug('Конвертация данных для импорта в DataManager', { rolesCount: scriptData.roles.length, replicasCount: scriptData.replicas.length });
                const importData = this.dataService.convertForDataManagerImport(scriptData);
                logger.debug('Начало импорта данных в DataManager', { rolesCount: importData.roles?.length, replicasCount: importData.replicas?.length });
                const success = this.dataManager.importData(importData);
                logger.debug('Результат импорта в DataManager', { success: success });
                
                if (success) {
                    // Update UI lists after successful import
                    this.updateRolesList();
                    this.updateReplicasList();
                    this.updateStatistics(); // Обновляем статистику после импорта
                    
                    logger.logUserAction('загрузка скрипта', {
                        fileName: file.name,
                        success: true,
                        roleCount: importData.roles?.length,
                        replicaCount: importData.replicas?.length
                    });
                    
                    // Show success toast notification
                    try {
                        ToastComponent.success(`Файл "${file.name}" успешно загружен! Роли: ${importData.roles?.length || 0}, Реплики: ${importData.replicas?.length || 0}`, { duration: 5000 });
                    } catch (error) {
                        logger.error('Ошибка при показе toast уведомления', { error: error.message });
                        // Fallback to simple alert if toast fails
                        // console.info(`Файл "${file.name}" успешно загружен! Роли: ${importData.roles?.length || 0}, Реплики: ${importData.replicas?.length || 0}`);
                    }
                } else {
                    logger.logUserAction('ошибка загрузки скрипта', {
                        fileName: file.name,
                        success: false,
                        roleCount: importData.roles?.length,
                        replicaCount: importData.replicas?.length
                    });
                    
                    // Show error toast notification
                    try {
                        ToastComponent.error('Ошибка при загрузке скрипта - не удалось импортировать данные в DataManager', { duration: 7000 });
                    } catch (error) {
                        logger.error('Ошибка при показе toast уведомления', { error: error.message });
                        // Fallback to simple alert if toast fails
                        // console.error('Ошибка при загрузке скрипта - не удалось импортировать данные в DataManager');
                    }
                }
            } else {
                logger.logUserAction('ошибка загрузки скрипта', {
                    fileName: file.name,
                    success: false
                });
                
                // Show error toast notification
                try {
                    ToastComponent.error('Ошибка при загрузке скрипта - не удалось загрузить данные из JSON файла', { duration: 7000 });
                } catch (error) {
                    logger.error('Ошибка при показе toast уведомления', { error: error.message });
                    // Fallback to simple alert if toast fails
                    // console.error('Ошибка при загрузке скрипта - не удалось загрузить данные из JSON файла');
                }
            }
        } catch (error) {
            logger.error('Ошибка при загрузке скрипта', { error: error.message });
            
            // Show error toast notification
            try {
                ToastComponent.error(`Ошибка при загрузке скрипта - ${error.message}`, { duration: 7000 });
            } catch (toastError) {
                logger.error('Ошибка при показе toast уведомления', { error: toastError.message });
                // Fallback to simple alert if toast fails
                // console.error(`Ошибка при загрузке скрипта - ${error.message}`);
            }
        }
    }

    /**
     * Обновление списка ролей
     */
    updateRolesList() {
        const rolesList = document.getElementById('rolesList');
        rolesList.innerHTML = '';

        const roles = this.dataManager.roleManager.getAll();
        
        roles.forEach(role => {
            const roleElement = this.createRoleElement(role);
            rolesList.appendChild(roleElement);
        });

        this.updateRoleSelect();
        
        // Инициализация Feather Icons для новых элементов
        if (window.app && typeof window.app.updateFeatherIcons === 'function') {
            window.app.updateFeatherIcons();
        }
        
        logger.debug('Список ролей обновлен', { roleCount: roles.length });
    }

    /**
     * Создание элемента роли
     * @param {Role} role - Роль для создания элемента
     * @returns {HTMLElement} Элемент роли
     */
    createRoleElement(role) {
        const roleElement = document.createElement('div');
        roleElement.className = `role-item ${role.type}`;
        roleElement.dataset.roleId = role.id;
        // Устанавливаем цвет для спикеров
        if (role.type === 'speaker') {
            // Используем сохраненный цвет спикера, если он есть, иначе генерируем цвет на основе ID
            const color = role.color || this.getSpeakerColor(role.id);
            roleElement.style.setProperty('--speaker-border-color', color);
            roleElement.classList.add('speaker-colored');
        }

        const roleInfo = document.createElement('div');
        roleInfo.className = 'role-info';
        const roleName = document.createElement('span');
        roleName.className = 'role-name';
        roleName.textContent = role.name;
        const roleType = document.createElement('span');
        roleType.className = 'role-type';
        roleType.textContent = role.type === 'speaker' ? '' : ' (Звук)';
        
        roleInfo.appendChild(roleName);
        roleInfo.appendChild(roleType);

        const roleActions = document.createElement('div');
        roleActions.className = 'role-actions';

        if (role instanceof Speaker) {
            const speedBtn = document.createElement('button');
            speedBtn.className = 'speed-btn';
            speedBtn.textContent = `${role.wordsPerMinute} слов/мин`;
            speedBtn.addEventListener('click', () => {
                this.handleEditSpeakerSpeed(role.id);
            });
            roleActions.appendChild(speedBtn);
        } else if (role instanceof SoundEffect) {
            const durationBtn = document.createElement('button');
            durationBtn.className = 'speed-btn';
            durationBtn.textContent = `${role.duration} сек`;
            durationBtn.addEventListener('click', () => {
                this.handleEditSoundEffectDuration(role.id);
            });
            roleActions.appendChild(durationBtn);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-sm';
        deleteBtn.innerHTML = '<i data-feather="trash-2"></i>';
        deleteBtn.addEventListener('click', () => {
            this.handleDeleteRole(role.id);
        });
        roleActions.appendChild(deleteBtn);

        roleElement.appendChild(roleInfo);
        roleElement.appendChild(roleActions);

        return roleElement;
    }

    /**
     * Обработка изменения скорости спикера
     * @param {string} roleId - ID спикера
     */
    handleEditSpeakerSpeed(roleId) {
        const role = this.dataManager.roleManager.findById(roleId);
        if (role instanceof Speaker) {
            const newSpeed = prompt('Введите новую скорость речи (слова в минуту):', role.wordsPerMinute);
            if (newSpeed !== null) {
                const speed = parseInt(newSpeed);
                if (!isNaN(speed) && speed >= 50 && speed <= 500) {
                    role.setWordsPerMinute(speed);
                    // Сохраняем цвет при обновлении спикера
                    const updatedRole = new Speaker(role.name);
                    updatedRole.id = role.id;
                    updatedRole.setWordsPerMinute(speed);
                    updatedRole.color = role.color; // Сохраняем цвет
                    
                    // Заменяем роль в DataManager
                    this.dataManager.roleManager.update(roleId, updatedRole);
                    
                    // Обновляем статистику через DataManager, чтобы уведомить все подписчики
                    this.dataManager.updateStatistics();
                    this.updateRolesList();
                    this.updateRoleSelect(); // Обновляем селект ролей также
                    logger.logUserAction('изменение скорости спикера', {
                        roleId: roleId,
                        newSpeed: speed
                    });
                } else {
                    alert('Скорость должна быть от 50 до 500 слов в минуту');
                }
            }
        }
    }

    /**
     * Обработка изменения длительности звукового эффекта
     * @param {string} roleId - ID звукового эффекта
     */
    handleEditSoundEffectDuration(roleId) {
        const role = this.dataManager.roleManager.findById(roleId);
        if (role instanceof SoundEffect) {
            const newDuration = prompt('Введите новую длительность звукового эффекта (секунды):', role.duration);
            if (newDuration !== null) {
                const duration = parseInt(newDuration);
                if (!isNaN(duration) && duration >= 0) {
                    role.setDuration(duration);
                    // Обновляем статистику через DataManager, чтобы уведомить все подписчики
                    this.dataManager.updateStatistics();
                    this.updateRolesList();
                    logger.logUserAction('изменение длительности звукового эффекта', {
                        roleId: roleId,
                        newDuration: duration
                    });
                } else {
                    alert('Длительность должна быть неотрицательным числом');
                }
            }
        }
    }

    /**
     * Обработка удаления роли
     * @param {string} roleId - ID роли для удаления
     */
    handleDeleteRole(roleId) {
        const role = this.dataManager.roleManager.findById(roleId);
        if (!role) return;

        // Находим оригинальный индекс роли перед удалением
        const allRoles = this.dataManager.roleManager.getAll();
        const originalRoleIndex = allRoles.findIndex(r => r.id === role.id);
        
        // Подсчет связанных реплик
        const relatedReplicas = this.dataManager.replicaManager.getByRole(roleId);
        const replicaCount = relatedReplicas.length;

        // Находим оригинальные индексы всех связанных реплик перед удалением
        const allReplicas = this.dataManager.replicaManager.getAll();
        const relatedReplicaData = relatedReplicas.map(replica => {
            const originalIndex = allReplicas.findIndex(r => r.id === replica.id);
            const replicaData = replica.toJSON();
            replicaData.originalIndex = originalIndex;
            return replicaData;
        });

        // Сохраняем данные для отмены
        const roleData = role.toJSON();
        // Добавляем оригинальный индекс роли в данные для восстановления
        roleData.originalIndex = originalRoleIndex;

        // Показываем кастомное модальное окно
        this.showDeleteConfirmationModal(
            `Удаление роли "${role.name}"`,
            replicaCount > 0 
                ? `Вы уверены, что хотите удалить роль "${role.name}" и все ${replicaCount} связанных реплик?` + (replicaCount > 0 ? ' Это действие можно отменить.' : '')
                : `Вы уверены, что хотите удалить роль "${role.name}"?`,
            () => {
                const success = this.dataManager.removeRole(roleId);
                if (success) {
                    // Анимация удаления элемента
                    const roleElement = document.querySelector(`.role-item[data-role-id="${roleId}"]`);
                    if (roleElement) {
                        this.animateElementRemoval(roleElement);
                    }

                    this.updateRolesList();
                    this.updateReplicasList();

                    // Показываем уведомление с возможностью отмены
                    this.showToast(
                        `Роль "${role.name}" ${replicaCount > 0 ? `и ${replicaCount} реплик` : ''} удалены`,
                        () => {
                            // Функция отмены
            const restoredRole = role.constructor.fromJSON(roleData);
            // Удаляем originalIndex из данных роли, чтобы не сохранялось в JSON
            delete restoredRole.originalIndex;
            // Восстанавливаем цвет, если он был сохранен
            if (role.color) {
                restoredRole.color = role.color;
            }
            this.dataManager.addRole(restoredRole);
                            
                            // Перемещаем роль на оригинальную позицию
                            if (roleData.originalIndex >= 0) {
                                this.dataManager.roleManager.move(roleId, roleData.originalIndex);
                            }
                            
                            // Восстанавливаем связанные реплики
                            relatedReplicaData.forEach(replicaData => {
                                const restoredReplica = Replica.fromJSON(replicaData);
                                // Удаляем originalIndex из данных реплики, чтобы не сохранялось в JSON
                                delete restoredReplica.originalIndex;
                                restoredReplica.setRole(roleId);
                                this.dataManager.addReplica(restoredReplica);
                                
                                // Перемещаем реплику на оригинальную позицию
                                if (replicaData.originalIndex >= 0) {
                                    this.dataManager.replicaManager.move(restoredReplica.id, replicaData.originalIndex);
                                }
                            });

                            this.updateRolesList();
                            this.updateReplicasList();
                            this.updateStatistics();
                            this.updateReplicaControls();
                            
                            // Сохраняем данные в localStorage для персистентности
                            if (window.app && typeof window.app.saveDataToStorage === 'function') {
                                window.app.saveDataToStorage();
                            }
                            
                            logger.logUserAction('отмена удаления роли', { 
                                roleId: roleId,
                                replicaCount: replicaCount,
                                roleName: role.name,
                                originalIndex: roleData.originalIndex
                            });
                        },
                        'warning'
                    );

                    logger.logUserAction('удаление роли', { 
                        roleId: roleId,
                        replicaCount: replicaCount,
                        roleName: role.name,
                        originalIndex: originalRoleIndex
                    });
                }
            }
        );
    }

    /**
     * Обновление селекта ролей
     */
    updateRoleSelect() {
        const roleSelect = document.getElementById('replicaRole');
        const currentSelection = roleSelect.value;
        
        roleSelect.innerHTML = '<option value="">Выберите роль</option>';
        
        const speakers = this.dataManager.roleManager.getSpeakers();
        const soundEffects = this.dataManager.roleManager.getSoundEffects();
        
        if (speakers.length > 0) {
            const speakerGroup = document.createElement('optgroup');
            speakerGroup.label = 'Спикеры';
            speakers.forEach(speaker => {
                const option = document.createElement('option');
                option.value = speaker.id;
                option.textContent = speaker.name;
                if (speaker.id === currentSelection) option.selected = true;
                speakerGroup.appendChild(option);
            });
            roleSelect.appendChild(speakerGroup);
        }
        
        if (soundEffects.length > 0) {
            const soundGroup = document.createElement('optgroup');
            soundGroup.label = 'Звуковые эффекты';
            soundEffects.forEach(sound => {
                const option = document.createElement('option');
                option.value = sound.id;
                option.textContent = sound.name;
                if (sound.id === currentSelection) option.selected = true;
                soundGroup.appendChild(option);
            });
            roleSelect.appendChild(soundGroup);
        }

        // Включить селект, если есть доступные роли
        roleSelect.disabled = (roleSelect.children.length <= 1); // <= 1 означает только опция по умолчанию
        
        this.updateReplicaControls();
    }

    /**
     * Обновление списка реплик
     */
    updateReplicasList() {
        const replicasList = document.getElementById('replicasList');
        replicasList.innerHTML = '';

        const replicas = this.dataManager.replicaManager.getAll();
        
        replicas.forEach((replica, index) => {
            const replicaElement = this.createReplicaElement(replica, index);
            replicasList.appendChild(replicaElement);
        });

        this.setupDragAndDrop();
        
        // Инициализация Feather Icons для новых элементов
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        logger.debug('Список реплик обновлен', { replicaCount: replicas.length });
    }

    /**
     * Создание элемента реплики
     * @param {Replica} replica - Реплика для создания элемента
     * @param {number} index - Индекс реплики
     * @returns {HTMLElement} Элемент реплики
     */
    createReplicaElement(replica, index) {
        const role = this.dataManager.roleManager.findById(replica.roleId);
        
        if (role && role.type === 'sound') {
            return this.createSoundEffectElement(replica, role, index);
        } else {
            // Если роль не найдена или это не звуковой эффект, создаем элемент спикера
            // В случае отсутствия роли, передаем null и позволяем элементу обработать эту ситуацию
            return this.createSpeakerReplicaElement(replica, role, index);
        }
    }

    /**
     * Создание элемента реплики для спикера
     * @param {Replica} replica - Реплика для создания элемента
     * @param {Role} role - Роль реплики
     * @param {number} index - Индекс реплики
     * @returns {HTMLElement} Элемент реплики спикера
     */
    createSpeakerReplicaElement(replica, role, index) {
        const speakerElement = new SpeakerReplicaElement(replica, role, index);
        const element = speakerElement.build(
            () => this.handleMoveReplica(replica.id, 'up'),
            () => this.handleMoveReplica(replica.id, 'down'),
            () => this.handleDeleteReplica(replica.id),
            true, // show edit button
            () => this.handleEditReplica(replica.id)
        );

        // Устанавливаем цвет на основе роли
        if (role && role.type === 'speaker') {
            const color = role.color || this.getSpeakerColor(role.id);
            speakerElement.setSpeakerColor(color);
            element.style.setProperty('--speaker-text-color', color);
            element.classList.add('speaker-colored');
        }

        return element;
    }

    /**
     * Создание элемента звукового эффекта
     * @param {Replica} replica - Реплика для создания элемента
     * @param {SoundEffect} role - Звуковой эффект
     * @param {number} index - Индекс реплики
     * @returns {HTMLElement} Элемент звукового эффекта
     */
    createSoundEffectElement(replica, role, index) {
        const soundElement = new SoundEffectElement(replica, role, index);
        const element = soundElement.build(
            () => this.handleMoveReplica(replica.id, 'up'),
            () => this.handleMoveReplica(replica.id, 'down'),
            () => this.handleDeleteReplica(replica.id),
            false // no edit button for sound effects
        );

        return element;
    }

    /**
     * Обработка перемещения реплики
     * @param {string} replicaId - ID реплики для перемещения
     * @param {string} direction - Направление ('up' или 'down')
     */
    handleMoveReplica(replicaId, direction) {
        const allReplicas = this.dataManager.replicaManager.getAll();
        const currentIndex = allReplicas.findIndex(r => r.id === replicaId);
        
        if (currentIndex === -1) return;

        let newIndex;
        if (direction === 'up') {
            newIndex = Math.max(0, currentIndex - 1);
        } else if (direction === 'down') {
            newIndex = Math.min(allReplicas.length - 1, currentIndex + 1);
        } else {
            return;
        }

        if (newIndex !== currentIndex) {
            const success = this.dataManager.replicaManager.move(replicaId, newIndex);
            if (success) {
                this.updateReplicasList();
                logger.logUserAction('перемещение реплики', {
                    replicaId: replicaId,
                    direction: direction,
                    oldIndex: currentIndex,
                    newIndex: newIndex
                });
            }
        }
    }

    /**
     * Обработка редактирования реплики
     * @param {string} replicaId - ID реплики для редактирования
     */
    handleEditReplica(replicaId) {
        const replica = this.dataManager.replicaManager.findById(replicaId);
        if (!replica) return;

        // const role = this.dataManager.roleManager.findById(replica.roleId); // Removed unused variable

        // Показываем модальное окно для редактирования
        this.showEditReplicaModal(replica, () => {
            this.updateReplicasList();
            logger.logUserAction('редактирование реплики', { 
                replicaId: replicaId,
                textLength: replica.text.length,
                roleId: replica.roleId
            });
        });
    }

    /**
     * Показ модального окна для редактирования реплики
     * @param {Replica} replica - Реплика для редактирования
     * @param {Function} onSave - Функция для вызова после сохранения
     */
    async showEditReplicaModal(replica, onSave) {
        try {
            const role = this.dataManager.roleManager.findById(replica.roleId);
            const roleName = role ? role.name : 'Без роли';
            
            const result = await ModalComponent.show({
                title: 'Редактирование реплики',
                type: 'custom',
                size: 'lg',
                content: (container) => {
                    // Информация о роли
                    const roleInfo = document.createElement('div');
                    roleInfo.style.cssText = `
                        background: var(--color-gray-light);
                        padding: 10px;
                        border-radius: 4px;
                        font-size: 14px;
                        color: var(--color-text-secondary);
                        margin-bottom: 15px;
                    `;
                    roleInfo.textContent = `Роль: ${roleName}`;
                    container.appendChild(roleInfo);

                    // Текстовое поле
                    const textArea = document.createElement('textarea');
                    textArea.value = replica.text;
                    textArea.className = 'form-control';
                    textArea.style.cssText += `
                        min-height: 120px;
                        resize: vertical;
                        font-family: Arial, sans-serif;
                    `;
                    textArea.placeholder = 'Введите текст реплики...';
                    textArea.focus();
                    textArea.select();

                    // Обработка Enter для сохранения (с Ctrl+Enter)
                    textArea.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                            e.preventDefault();
                            // Это будет обработано через кнопки
                        }
                    });

                    container.appendChild(textArea);
                    return textArea;
                },
                buttons: [
                    {
                        text: 'Отмена',
                        icon: 'x-circle',
                        type: 'secondary',
                        onClick: () => false,
                        autoClose: true
                    },
                    {
                        text: 'Сохранить',
                        icon: 'save',
                        type: 'primary',
                        onClick: () => {
                            const textArea = document.querySelector('.modal-body textarea');
                            const newText = textArea.value.trim();
                            if (newText) {
                                replica.setText(newText);
                                onSave();
                                return true;
                            } else {
                                alert('Текст реплики не может быть пустым');
                                return false;
                            }
                        },
                        autoClose: true
                    }
                ]
            });

            // Если результат false, ничего не делаем (отмена)
            if (result === false) {
                return;
            }
        } catch (error) {
            logger.error('Ошибка при показе модального окна редактирования реплики:', error);
        }
    }

    /**
     * Обработка удаления реплики
     * @param {string} replicaId - ID реплики для удаления
     */
    handleDeleteReplica(replicaId) {
        const replica = this.dataManager.replicaManager.findById(replicaId);
        if (!replica) return;

        // Находим оригинальный индекс реплики перед удалением
        const allReplicas = this.dataManager.replicaManager.getAll();
        const originalIndex = allReplicas.findIndex(r => r.id === replicaId);
        
        // Сохраняем данные для отмены
        const replicaData = replica.toJSON();
        // Добавляем оригинальный индекс в данные для восстановления
        replicaData.originalIndex = originalIndex;

        // Показываем кастомное модальное окно
        this.showDeleteConfirmationModal(
            'Удаление реплики',
            `Вы уверены, что хотите удалить реплику с ID "${replicaId}" с текстом: "${replica.text.substring(0, 50)}${replica.text.length > 50 ? '...' : ''}"? Это действие можно отменить.`,
            () => {
                const success = this.dataManager.removeReplica(replicaId);
                if (success) {
                    // Анимация удаления элемента
                    const replicaElement = document.querySelector(`.replica-item[data-replica-id="${replicaId}"], .sound-effect-item[data-replica-id="${replicaId}"]`);
                    if (replicaElement) {
                        this.animateElementRemoval(replicaElement);
                    }

                    this.updateReplicasList();

                    // Показываем уведомление с возможностью отмены
                    this.showToast(
                        `Реплика с ID "${replicaId}" удалена`,
                        () => {
                            // Функция отмены
                            // Проверяем, существует ли роль, к которой привязана реплика
                            const roleExists = this.dataManager.roleManager.findById(replicaData.roleId);
                            if (!roleExists) {
                                logger.warn('Роль для восстанавливаемой реплики не существует', { 
                                    replicaId: replicaData.id, 
                                    roleId: replicaData.roleId 
                                });
                                // Показываем предупреждение пользователю
                                ToastComponent.warning('Роль для этой реплики была удалена. Реплика не может быть восстановлена.', { duration: 500 });
                                return;
                            }
                            
                            const restoredReplica = Replica.fromJSON(replicaData);
                            // Удаляем originalIndex из данных реплики, чтобы не сохранялось в JSON
                            delete restoredReplica.originalIndex;
                            
                            // Добавляем реплику через DataManager
                            this.dataManager.addReplica(restoredReplica);
                            
                            // Перемещаем реплику на оригинальную позицию
                            if (replicaData.originalIndex >= 0) {
                                this.dataManager.replicaManager.move(replicaId, replicaData.originalIndex);
                            }
                            
                            // Обновляем список реплик и статистику после восстановления
                            this.updateReplicasList();
                            this.updateStatistics();
                            this.updateReplicaControls();
                            
                            // Сохраняем данные в localStorage для персистентности
                            if (window.app && typeof window.app.saveDataToStorage === 'function') {
                                window.app.saveDataToStorage();
                            }
                            
                            logger.logUserAction('отмена удаления реплики', { 
                                replicaId: replicaId,
                                textLength: replica.text.length,
                                roleId: replica.roleId,
                                originalIndex: replicaData.originalIndex
                            });
                        },
                        'warning'
                    );

                    logger.logUserAction('удаление реплики', { 
                        replicaId: replicaId,
                        textLength: replica.text.length,
                        roleId: replica.roleId,
                        originalIndex: originalIndex
                    });
                }
            }
        );
    }

    /**
     * Настройка drag-and-drop для реплик
     */
    setupDragAndDrop() {
        const replicaItems = document.querySelectorAll('.replica-item, .sound-effect-item');
        
        replicaItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                this.draggedElement = item;
                this.draggedReplicaId = item.dataset.replicaId;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', this.draggedReplicaId);
                
                logger.logUserAction('начало перетаскивания реплики', {
                    replicaId: this.draggedReplicaId
                });
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                this.draggedElement = null;
                this.draggedReplicaId = null;
            });
        });

        const replicasList = document.getElementById('replicasList');
        if (!replicasList) {
            logger.error('Элемент replicasList не найден в DOM');
            return;
        }
        
        replicasList.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        replicasList.addEventListener('dragenter', (e) => {
            e.preventDefault();
        });

        replicasList.addEventListener('drop', (e) => {
            e.preventDefault();
            
            if (this.draggedReplicaId) {
                const dropTarget = e.target.closest('.replica-item, .sound-effect-item');
                if (dropTarget && dropTarget !== this.draggedElement) {
                    const targetReplicaId = dropTarget.dataset.replicaId;
                    const allReplicas = this.dataManager.replicaManager.getAll();
                    
                    const draggedIndex = allReplicas.findIndex(r => r.id === this.draggedReplicaId);
                    const targetIndex = allReplicas.findIndex(r => r.id === targetReplicaId);
                    
                    if (draggedIndex !== -1 && targetIndex !== -1) {
                        const newIndex = e.offsetY > dropTarget.offsetHeight / 2 ? targetIndex + 1 : targetIndex;
                        
                        const success = this.dataManager.replicaManager.move(this.draggedReplicaId, newIndex);
                        if (success) {
                            this.updateReplicasList();
                            logger.logUserAction('перемещение реплики', {
                                replicaId: this.draggedReplicaId,
                                newIndex: newIndex
                            });
                        }
                    }
                }
            }
        });

        logger.debug('Drag-and-drop настроен для реплик');
    }

    /**
     * Обновление всех списков (оптимизированный метод для загрузки данных)
     */
    updateAllLists() {
        // Блокируем обновление статистики во время массового обновления
        const stats = this.dataManager.getStatistics();
        logger.group('Обновление UI компонентов');
        this.updateRolesList();
        this.updateReplicasList();
        this.updateStatistics(stats); // Передаем статистику напрямую чтобы избежать повторного вычисления
        
        logger.debug('Все списки обновлены', {
            roleCount: this.dataManager.roleManager.size(),
            replicaCount: this.dataManager.replicaManager.size()
        });
        logger.groupEnd();
    }

    /**
     * Обновление статистики
     * @param {Object} precomputedStats - Предварительно вычисленная статистика (опционально)
     */
    updateStatistics(precomputedStats = null) {
        const stats = precomputedStats || this.dataManager.getStatistics();
        
        const totalWordsElement = document.getElementById('totalWords');
        const totalDurationElement = document.getElementById('totalDuration');
        
        if (totalWordsElement) {
            totalWordsElement.textContent = stats.totalWords;
        } else {
            logger.error('Элемент totalWords не найден в DOM');
        }
        
        if (totalDurationElement) {
            totalDurationElement.textContent = stats.totalDurationFormatted;
        } else {
            logger.error('Элемент totalDuration не найден в DOM');
        }
        
        logger.debug('Статистика обновлена', stats);
    }

    /**
     * Обновление контролов реплик
     */
    updateReplicaControls() {
        const roleSelect = document.getElementById('replicaRole');
        const textArea = document.getElementById('replicaText');
        const addBtn = document.getElementById('addReplicaBtn');
        
        const selectedRoleId = roleSelect.value;
        let isSoundEffect = false;
        let hasText = textArea.value.trim() !== '';
        
        if (selectedRoleId) {
            const selectedRole = this.dataManager.roleManager.findById(selectedRoleId);
            if (selectedRole && selectedRole.type === 'sound') {
                isSoundEffect = true;
                // For sound effects, disable text input and clear any existing text
                textArea.disabled = true;
                if (textArea.value.trim() !== '') {
                    textArea.value = ''; // Clear text when switching to sound effect
                    hasText = false;
                }
            } else {
                // For speakers, enable text input
                textArea.disabled = false;
                hasText = textArea.value.trim() !== '';
            }
        } else {
            // No role selected, disable text area
            textArea.disabled = true;
            hasText = false;
        }
        
        const hasRole = selectedRoleId !== '';
        // For sound effects, allow adding replica even without text
        // For speakers, require text to be present
        const canAddReplica = hasRole && (isSoundEffect || hasText);
        
        addBtn.disabled = !canAddReplica;
    }


    /**
     * Показ модального окна подтверждения удаления
     * @param {string} title - Заголовок модального окна
     * @param {string} message - Сообщение подтверждения
     * @param {Function} onConfirm - Функция для выполнения при подтверждении
     * @param {Function} onCancel - Функция для выполнения при отмене
     */
    async showDeleteConfirmationModal(title, message, onConfirm, onCancel = null) {
        try {
            const result = await ModalComponent.show({
                title: title,
                type: 'confirmation',
                content: message,
                buttons: [
                    {
                        text: 'Отмена',
                        icon: 'x-circle',
                        type: 'secondary',
                        onClick: () => {
                            if (onCancel) onCancel();
                            return false;
                        },
                        autoClose: true
                    },
                    {
                        text: 'Удалить',
                        icon: 'trash-2',
                        type: 'danger',
                        onClick: () => {
                            onConfirm();
                            return true;
                        },
                        autoClose: true
                    }
                ]
            });

            // Если результат false, ничего не делаем (отмена)
            if (result === false) {
                return;
            }
        } catch (error) {
            logger.error('Ошибка при показе модального окна подтверждения удаления:', error);
            if (onCancel) onCancel();
        }
    }

    /**
     * Показ уведомления с возможностью отмены
     * @param {string} message - Сообщение уведомления
     * @param {Function} onUndo - Функция для выполнения при отмене
     * @param {string} type - Тип уведомления (warning, success, error)
     */
    showToast(message, onUndo, type = 'warning') {
        // Используем стандартизированный ToastComponent
        try {
            if (onUndo) {
                return ToastComponent.show(message, { 
                    type, 
                    duration: 15000, // 15 секунд как в оригинальной реализации
                    showUndo: true, 
                    onUndo: onUndo 
                });
            } else {
                return ToastComponent.show(message, { 
                    type, 
                    duration: 15000 // 15 секунд как в оригинальной реализации
                });
            }
        } catch (error) {
            logger.error('Ошибка при показе toast уведомления', { error: error.message });
            // Fallback to simple alert if toast fails
            if (onUndo) {
                alert(message);
            } else {
                alert(message);
            }
        }
    }

    /**
     * Анимация удаления элемента
     * @param {HTMLElement} element - Элемент для анимации
     * @returns {Promise} - Promise, который разрешается после завершения анимации
     */
    async animateElementRemoval(element) {
        if (element) {
            element.classList.add('deleting');
            // Ждем завершения анимации
            return new Promise(resolve => {
                setTimeout(() => {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                    }
                    resolve();
                }, 300);
            });
        }
    }

    /**
     * Анимация добавления элемента
     * @param {HTMLElement} element - Элемент для анимации
     */
    /**
     * Генерация уникального цвета для спикера на основе ID
     * @param {string} id - ID спикера
     * @returns {string} Цвет в формате RGB
     */
    getSpeakerColor(id) {
        // Простой хэш для генерации числового значения на основе ID
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            const char = id.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Преобразование в 32-битное целое
        }
        hash = Math.abs(hash);
        
        // Генерируем цвета в определенном диапазоне для лучшей видимости
        const hue = hash % 360; // Оттенок от 0 до 360
        const saturation = 70 + (hash % 30); // Насыщенность от 70% до 100%
        const lightness = 40 + (hash % 20); // Светлота от 40% до 60%
        
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    /**
     * Генерация более светлого цвета
     * @param {string} color - Исходный цвет
     * @param {number} factor - Множитель светлоты (0-1)
     * @returns {string} Светлый цвет
     */
    getLighterColor(color, factor) {
        // Если цвет в формате HSL, извлекаем компоненты
        if (color.startsWith('hsl')) {
            const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (match) {
                const h = parseInt(match[1]);
                const s = parseInt(match[2]);
                const l = Math.min(100, parseInt(match[3]) * factor);
                return `hsl(${h}, ${s}%, ${l}%)`;
            }
        }
        // Если цвет в формате RGB или HEX, используем базовый цвет
        return color;
    }

    /**
     * Генерация более темного цвета
     * @param {string} color - Исходный цвет
     * @returns {string} Темный цвет
     */
    getDarkerColor(color) {
        // Если цвет в формате HSL, извлекаем компоненты
        if (color.startsWith('hsl')) {
            const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (match) {
                const h = parseInt(match[1]);
                const s = parseInt(match[2]);
                const l = Math.max(20, parseInt(match[3]) * 0.7); // Делаем темнее на 30%
                return `hsl(${h}, ${s}%, ${l}%)`;
            }
        }
        // Если цвет в формате RGB или HEX, используем базовый цвет
        return color;
    }

    /**
     * Генерация уникального класса для цвета спикера на основе ID
     * @param {string} id - ID спикера
     * @returns {string} Уникальный класс для цвета
     */
    getSpeakerColorClass(id) {
        // Простой хэш для генерации уникального класса на основе ID
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            const char = id.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Преобразование в 32-битное целое
        }
        return Math.abs(hash).toString(36); // Преобразование в строку base36
    }

    animateElementAddition(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
        element.style.transition = 'all 0.3s ease-out';
        
        // Ждем следующего кадра для запуска анимации
        requestAnimationFrame(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    }
}

// Экспорт для использования в модулях
export { UIComponents };
