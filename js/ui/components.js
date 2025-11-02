import feather from 'feather-icons';

import { logger } from '../logger.js';
import { Replica } from '../models/replica.js';
import { Speaker, SoundEffect } from '../models/role.js';

import { SoundEffectElement } from './sound-effect-element.js';
import { SpeakerReplicaElement } from './speaker-replica-element.js';

/**
 * Компоненты пользовательского интерфейса
 */
class UIComponents {
    constructor(dataManager, fileHandler) {
        this.dataManager = dataManager;
        this.fileHandler = fileHandler;
        this.draggedElement = null;
        this.draggedReplicaId = null;
        this.currentSpeakerColor = '#007bff'; // Начальный цвет по умолчанию
        
        logger.info('Компоненты UI инициализированы');
    }

    /**
     * Инициализация компонентов
     */
    initialize() {
        this.setupEventListeners();
        this.loadThemePreference(); // Загружаем сохраненную тему при инициализации
        this.updateRolesList();
        this.updateReplicasList();
        this.updateStatistics();
        
        // Инициализация Feather Icons
        if (typeof feather !== 'undefined') {
            feather.replace();
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
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme') || 'light';
        let newTheme;
        
        if (currentTheme === 'light') {
            newTheme = 'dark';
        } else if (currentTheme === 'dark') {
            newTheme = 'light'; // Переключаемся на светлую тему
        } else {
            newTheme = 'dark'; // Если auto, переключаемся на темную тему
        }
        
        this.applyTheme(newTheme);
        localStorage.setItem('themePreference', newTheme); // Сохраняем предпочтение
        this.updateThemeButtonIcon(newTheme); // Обновляем иконку кнопки
        
        logger.logUserAction('переключение темы', {
            theme: newTheme
        });
    }

    /**
     * Обновление иконки кнопки темы
     * @param {string} theme - текущая тема
     */
    updateThemeButtonIcon(theme) {
        const themeBtn = document.getElementById('themeToggleBtn');
        const themeIcon = themeBtn.querySelector('.theme-icon');
        if (themeIcon) {
            if (theme === 'dark') {
                themeIcon.textContent = '☀️'; // Солнце для темной темы (показываем светлую иконку)
                themeBtn.title = 'Светлая тема';
            } else if (theme === 'light') {
                themeIcon.textContent = '🌙'; // Луна для светлой темы (показываем темную иконку)
                themeBtn.title = 'Темная тема';
            } else { // auto
                themeIcon.textContent = '🔄'; // Цикл для автоматической темы
                themeBtn.title = 'Автоматическая тема';
            }
        }
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

        // Сохранение скрипта
        document.getElementById('saveScriptBtn').addEventListener('click', () => {
            this.handleSaveScript();
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
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                this.toggleTheme();
            });
        } else {
            logger.error('Элемент themeToggleBtn не найден в DOM');
        }

        // Обновление статистики при изменении данных
        this.dataManager.addUpdateCallback(() => {
            this.updateStatistics();
            this.updateReplicaControls();
        });

        // Обработчики для элементов управления цветом спикера
        this.setupColorControls();

        logger.info('Слушатели событий настроены');
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
     * Обработка сохранения скрипта
     */
    handleSaveScript() {
        const success = this.fileHandler.saveScript();
        if (success) {
            logger.logUserAction('сохранение скрипта', {
                success: true
            });
        } else {
            logger.logUserAction('ошибка сохранения скрипта', {
                success: false
            });
        }
    }

    /**
     * Обработка загрузки скрипта
     * @param {File} file - Файл для загрузки
     */
    async handleLoadScript(file) {
        const success = await this.fileHandler.loadScript(file);
        if (success) {
            this.updateRolesList();
            this.updateReplicasList();
            logger.logUserAction('загрузка скрипта', {
                fileName: file.name,
                success: true
            });
        } else {
            alert('Ошибка при загрузке скрипта');
            logger.logUserAction('ошибка загрузки скрипта', {
                fileName: file.name,
                success: false
            });
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
        if (typeof feather !== 'undefined') {
            feather.replace();
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
        roleType.textContent = role.type === 'speaker' ? ' (Спикер)' : ' (Звук)';
        
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

        // Подсчет связанных реплик
        const relatedReplicas = this.dataManager.replicaManager.getByRole(roleId);
        const replicaCount = relatedReplicas.length;

        // Сохраняем данные для отмены
        const roleData = role.toJSON();
        const relatedReplicaData = relatedReplicas.map(replica => replica.toJSON());

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
            // Восстанавливаем цвет, если он был сохранен
            if (role.color) {
                restoredRole.color = role.color;
            }
            this.dataManager.addRole(restoredRole);
                            
                            // Восстанавливаем связанные реплики
                            relatedReplicaData.forEach(replicaData => {
                                const restoredReplica = Replica.fromJSON(replicaData);
                                restoredReplica.setRole(roleId);
                                this.dataManager.addReplica(restoredReplica);
                            });

                            this.updateRolesList();
                            this.updateReplicasList();
                            logger.logUserAction('отмена удаления роли', { 
                                roleId: roleId,
                                replicaCount: replicaCount,
                                roleName: role.name
                            });
                        },
                        'warning'
                    );

                    logger.logUserAction('удаление роли', { 
                        roleId: roleId,
                        replicaCount: replicaCount,
                        roleName: role.name
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
    showEditReplicaModal(replica, onSave) {
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
            z-index: 10000;
            animation: fadeIn 0.2s ease-in-out;
        `;

        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.className = 'edit-replica-modal';
        modal.style.cssText = `
            background: var(--color-white);
            padding: 20px;
            border-radius: 8px;
            box-shadow: var(--shadow-lg);
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            animation: slideIn 0.2s ease-in-out;
        `;

        // Заголовок
        const modalTitle = document.createElement('h3');
        modalTitle.style.cssText = `
            margin: 0 15px 0;
            color: var(--color-text-primary);
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        modalTitle.innerHTML = '✏️ Редактирование реплики';

        // Форма редактирования
        const form = document.createElement('form');
        form.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 15px;
        `;

        // Информация о роли
        const roleInfo = document.createElement('div');
        roleInfo.style.cssText = `
            background: var(--color-gray-light);
            padding: 10px;
            border-radius: 4px;
            font-size: 14px;
            color: var(--color-text-secondary);
        `;
        const role = this.dataManager.roleManager.findById(replica.roleId);
        roleInfo.textContent = `Роль: ${role ? role.name : 'Без роли'}`;

        // Текстовое поле
        const textArea = document.createElement('textarea');
        textArea.value = replica.text;
        textArea.style.cssText = `
            width: 100%;
            min-height: 120px;
            padding: 10px;
            border: 2px solid var(--color-gray-border);
            border-radius: 4px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            resize: vertical;
        `;
        textArea.placeholder = 'Введите текст реплики...';
        textArea.focus();
        textArea.select();

        // Кнопки
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        `;

        const saveBtn = document.createElement('button');
        saveBtn.innerHTML = '<i data-feather="save"></i> Сохранить';
        saveBtn.className = 'btn btn-primary';
        saveBtn.style.cssText = `
            cursor: pointer;
            font-weight: 600;
            transition: all var(--transition-fast);
        `;
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const newText = textArea.value.trim();
            if (newText) {
                replica.setText(newText);
                onSave();
                document.body.removeChild(overlay);
            } else {
                alert('Текст реплики не может быть пустым');
            }
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.innerHTML = '<i data-feather="x-circle"></i> Отмена';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.style.cssText = `
            cursor: pointer;
            font-weight: 600;
            transition: all var(--transition-fast);
        `;
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });

        // Обработка Enter для сохранения (с Ctrl+Enter)
        textArea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                const newText = textArea.value.trim();
                if (newText) {
                    replica.setText(newText);
                    onSave();
                    document.body.removeChild(overlay);
                } else {
                    alert('Текст реплики не может быть пустым');
                }
            } else if (e.key === 'Escape') {
                document.body.removeChild(overlay);
            }
        });

        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(saveBtn);

        form.appendChild(roleInfo);
        form.appendChild(textArea);
        form.appendChild(buttonContainer);

        modal.appendChild(modalTitle);
        modal.appendChild(form);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Инициализация Feather Icons для новых элементов
        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        // Фокус на текстовое поле
        textArea.focus();

        // Закрытие по Esc
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
            }
        };
        document.addEventListener('keydown', handleEsc);

        // Удаление обработчика при закрытии
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
    }

    /**
     * Обработка удаления реплики
     * @param {string} replicaId - ID реплики для удаления
     */
    handleDeleteReplica(replicaId) {
        const replica = this.dataManager.replicaManager.findById(replicaId);
        if (!replica) return;

        // Сохраняем данные для отмены
        const replicaData = replica.toJSON();

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
                            const restoredReplica = Replica.fromJSON(replicaData);
                            this.dataManager.addReplica(restoredReplica);
                            this.updateReplicasList();
                            logger.logUserAction('отмена удаления реплики', { 
                                replicaId: replicaId,
                                textLength: replica.text.length,
                                roleId: replica.roleId
                            });
                        },
                        'warning'
                    );

                    logger.logUserAction('удаление реплики', { 
                        replicaId: replicaId,
                        textLength: replica.text.length,
                        roleId: replica.roleId
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
     * Обновление статистики
     */
    updateStatistics() {
        const stats = this.dataManager.getStatistics();
        
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
    showDeleteConfirmationModal(title, message, onConfirm, onCancel = null) {
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
            z-index: 10000;
            animation: fadeIn 0.2s ease-in-out;
        `;

        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.className = 'delete-confirmation-modal';
        modal.style.cssText = `
            background: var(--color-white);
            padding: 20px;
            border-radius: 8px;
            box-shadow: var(--shadow-lg);
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            animation: slideIn 0.2s ease-in-out;
        `;

        // Заголовок
        const modalTitle = document.createElement('h3');
        modalTitle.style.cssText = `
            margin: 0 15px 0;
            color: var(--color-text-primary);
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        modalTitle.innerHTML = `⚠️ ${title}`;

        // Сообщение
        const modalMessage = document.createElement('p');
        modalMessage.style.cssText = `
            margin: 0 0 20px 0;
            color: var(--color-text-secondary);
            line-height: 1.5;
            font-size: 14px;
        `;
        modalMessage.textContent = message;

        // Кнопки
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        `;

        const confirmBtn = document.createElement('button');
        confirmBtn.innerHTML = '<i data-feather="trash-2"></i> Удалить';
        confirmBtn.className = 'btn btn-danger';
        confirmBtn.style.cssText = `
            cursor: pointer;
            font-weight: 600;
            transition: all var(--transition-fast);
        `;
        confirmBtn.addEventListener('click', () => {
            onConfirm();
            document.body.removeChild(overlay);
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.innerHTML = '<i data-feather="x-circle"></i> Отмена';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.style.cssText = `
            cursor: pointer;
            font-weight: 600;
            transition: all var(--transition-fast);
        `;
        cancelBtn.addEventListener('click', () => {
            if (onCancel) onCancel();
            document.body.removeChild(overlay);
        });

        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(confirmBtn);

        modal.appendChild(modalTitle);
        modal.appendChild(modalMessage);
        modal.appendChild(buttonContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Инициализация Feather Icons для новых элементов
        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        // Фокус на отмену по умолчанию
        cancelBtn.focus();

        // Закрытие по Esc
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                if (onCancel) onCancel();
                document.body.removeChild(overlay);
            }
        };
        document.addEventListener('keydown', handleEsc);

        // Удаление обработчика при закрытии
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                if (onCancel) onCancel();
                document.body.removeChild(overlay);
            }
        });
    }

    /**
     * Показ уведомления с возможностью отмены
     * @param {string} message - Сообщение уведомления
     * @param {Function} onUndo - Функция для выполнения при отмене
     * @param {string} type - Тип уведомления (warning, success, error)
     */
    showToast(message, onUndo, type = 'warning') {
        // Удаляем существующие тосты
        document.querySelectorAll('.toast').forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 20px;
            background: var(--color-gray-lighter);
            border: 2px solid var(--color-gray-border);
            border-radius: 8px;
            box-shadow: var(--shadow-lg);
            z-index: 10001;
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideIn 0.3s ease-out;
            max-width: 400px;
        `;

        const toastContent = document.createElement('div');
        toastContent.className = 'toast-content';
        toastContent.style.cssText = `
            flex: 1;
            font-size: 14px;
            color: var(--color-text-primary);
            line-height: 1.4;
        `;
        toastContent.textContent = message;

        const toastActions = document.createElement('div');
        toastActions.className = 'toast-actions';
        toastActions.style.cssText = `
            display: flex;
            gap: 8px;
        `;

        if (onUndo) {
        const undoBtn = document.createElement('button');
        undoBtn.innerHTML = '<i data-feather="rotate-ccw"></i> Отменить';
        undoBtn.className = 'btn btn-sm btn-warning toast-btn undo';
        undoBtn.addEventListener('click', () => {
            onUndo();
            toast.remove();
        });
        toastActions.appendChild(undoBtn);
        }

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<i data-feather="x"></i>';
        closeBtn.className = 'btn btn-sm btn-secondary toast-btn close';
        closeBtn.addEventListener('click', () => {
            toast.remove();
        });
        toastActions.appendChild(closeBtn);

        toast.appendChild(toastContent);
        toast.appendChild(toastActions);
        document.body.appendChild(toast);

        // Инициализация Feather Icons для всех иконок в тосте
        // Используем requestAnimationFrame для гарантии, что элемент уже добавлен в DOM
        if (typeof feather !== 'undefined') {
            requestAnimationFrame(() => {
                feather.replace();
            });
        }

        // Автоматическое удаление через 15 секунд (как вы просили)
        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.remove();
            }
        }, 15000);

        return toast;
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
