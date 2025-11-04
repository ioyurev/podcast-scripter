import { logger } from '../logger.js';

import { BaseModel, Collection } from './base.js';

/**
 * Базовый класс для роли
 */
class Role extends BaseModel {
    constructor(name, type) {
        super();
        this.name = name;
        this.type = type; // 'speaker' или 'sound'
        logger.logRoleAction('создание', name, { roleId: this.id, type });
    }

    /**
     * Преобразование роли в JSON
     * @returns {Object} JSON представление роли
     */
    toJSON() {
        return {
            ...super.toJSON(),
            name: this.name,
            type: this.type
        };
    }

    /**
     * Создание роли из JSON
     * @param {Object} json - JSON данные
     * @returns {Role} Новый экземпляр роли
     */
    static fromJSON(json) {
        const role = new Role(json.name, json.type);
        role.id = json.id;
        
        // Проверка и обработка валидности дат
        const parseDate = (dateString) => {
            if (!dateString) return new Date();
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? new Date() : date;
        };
        
        role.createdAt = parseDate(json.createdAt);
        role.updatedAt = parseDate(json.updatedAt);
        return role;
    }
}

/**
 * Класс для спикера
 */
class Speaker extends Role {
    constructor(name, wordsPerMinute = 120) {
        super(name, 'speaker');
        this.wordsPerMinute = wordsPerMinute;
        logger.logRoleAction('создание спикера', name, { 
            roleId: this.id, 
            wordsPerMinute 
        });
    }

    /**
     * Установка скорости речи
     * @param {number} wpm - Слова в минуту
     */
    setWordsPerMinute(wpm) {
        const oldWpm = this.wordsPerMinute;
        this.wordsPerMinute = Math.max(50, Math.min(500, wpm)); // Ограничение от 50 до 500
        this.updateTimestamp();
        logger.time('update-speaker-speed');
        logger.logRoleAction('изменение скорости речи', this.name, {
            roleId: this.id,
            oldWpm,
            newWpm: this.wordsPerMinute
        });
        logger.timeEnd('update-speaker-speed');
    }

    /**
     * Расчет времени для заданного количества слов
     * @param {number} wordCount - Количество слов
     * @param {boolean} suppressLog - Подавлять ли логирование (для массовой обработки)
     * @returns {number} Время в минутах
     */
    calculateTime(wordCount, suppressLog = false) {
        const timeInMinutes = wordCount / this.wordsPerMinute;
        if (!suppressLog) {
            logger.logCalculation('расчет времени спикера', timeInMinutes, {
                roleId: this.id,
                speakerName: this.name,
                wordCount,
                wordsPerMinute: this.wordsPerMinute
            });
        }
        return timeInMinutes;
    }

    /**
     * Преобразование спикера в JSON
     * @returns {Object} JSON представление спикера
     */
    toJSON() {
        return {
            ...super.toJSON(),
            wordsPerMinute: this.wordsPerMinute,
            color: this.color // Сохраняем цвет спикера
        };
    }

    /**
     * Создание спикера из JSON
     * @param {Object} json - JSON данные
     * @returns {Speaker} Новый экземпляр спикера
     */
    static fromJSON(json) {
        const speaker = new Speaker(json.name, json.wordsPerMinute);
        speaker.id = json.id;
        
        // Проверка и обработка валидности дат
        const parseDate = (dateString) => {
            if (!dateString) return new Date();
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? new Date() : date;
        };
        
        speaker.createdAt = parseDate(json.createdAt);
        speaker.updatedAt = parseDate(json.updatedAt);
        speaker.color = json.color; // Восстанавливаем цвет спикера
        return speaker;
    }
}

/**
 * Класс для звукового эффекта
 */
class SoundEffect extends Role {
    constructor(name, duration = 0) {
        super(name, 'sound');
        this.duration = duration; // Длительность в секундах
        logger.logRoleAction('создание звукового эффекта', name, { 
            roleId: this.id, 
            duration 
        });
    }

    /**
     * Установка длительности звукового эффекта
     * @param {number} duration - Длительность в секундах
     */
    setDuration(duration) {
        const oldDuration = this.duration;
        this.duration = Math.max(0, duration); // Не может быть отрицательным
        this.updateTimestamp();
        logger.time('update-sound-duration');
        logger.logRoleAction('изменение длительности звука', this.name, {
            roleId: this.id,
            oldDuration,
            newDuration: this.duration
        });
        logger.timeEnd('update-sound-duration');
    }

    /**
     * Преобразование звукового эффекта в JSON
     * @returns {Object} JSON представление звукового эффекта
     */
    toJSON() {
        return {
            ...super.toJSON(),
            duration: this.duration
        };
    }

    /**
     * Создание звукового эффекта из JSON
     * @param {Object} json - JSON данные
     * @returns {SoundEffect} Новый экземпляр звукового эффекта
     */
    static fromJSON(json) {
        const soundEffect = new SoundEffect(json.name, json.duration);
        soundEffect.id = json.id;
        
        // Проверка и обработка валидности дат
        const parseDate = (dateString) => {
            if (!dateString) return new Date();
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? new Date() : date;
        };
        
        soundEffect.createdAt = parseDate(json.createdAt);
        soundEffect.updatedAt = parseDate(json.updatedAt);
        return soundEffect;
    }
}

/**
 * Менеджер ролей
 */
class RoleManager extends Collection {
    constructor() {
        super();
        logger.info('Менеджер ролей инициализирован');
    }

    /**
     * Добавление роли
     * @param {Role} role - Роль для добавления
     */
    add(role) {
        super.add(role);
        logger.logRoleAction('добавление в менеджер', role.name, {
            roleId: role.id,
            roleType: role.type
        });
    }

    /**
     * Удаление роли
     * @param {string} id - ID роли для удаления
     * @returns {boolean} Успешно ли удалено
     */
    remove(id) {
        const role = this.findById(id);
        if (role) {
            const result = super.remove(id);
            if (result) {
                logger.logRoleAction('удаление из менеджера', role.name, {
                    roleId: id,
                    roleType: role.type
                });
            }
            return result;
        }
        return false;
    }

    /**
     * Получение всех спикеров
     * @returns {Array} Массив спикеров
     */
    getSpeakers() {
        return this.items.filter(role => role instanceof Speaker);
    }

    /**
     * Получение всех звуковых эффектов
     * @returns {Array} Массив звуковых эффектов
     */
    getSoundEffects() {
        return this.items.filter(role => role instanceof SoundEffect);
    }

    /**
     * Создание менеджера ролей из JSON
     * @param {Array} json - JSON массив данных
     * @returns {RoleManager} Новый экземпляр менеджера ролей
     */
    static fromJSON(json) {
        const manager = new RoleManager();
        json.forEach(roleData => {
            let role;
            if (roleData.type === 'speaker') {
                role = Speaker.fromJSON(roleData); // Подавляем логи при массовой загрузке
            } else if (roleData.type === 'sound') {
                role = SoundEffect.fromJSON(roleData); // Подавляем логи при массовой загрузке
            } else {
                role = Role.fromJSON(roleData); // Подавляем логи при массовой загрузке
            }
            manager.add(role);
        });
        return manager;
    }

    /**
     * Обновление роли в коллекции
     * @param {string} id - ID роли для обновления
     * @param {Role} newRole - Новая роль для замены
     * @returns {boolean} Успешно ли обновлено
     */
    update(id, newRole) {
        const index = this.items.findIndex(item => item.id === id);
        if (index !== -1) {
            this.items[index] = newRole;
            this.updateTimestamp();
            logger.debug('Роль обновлена в менеджере', {
                roleId: id,
                roleName: newRole.name,
                roleType: newRole.type
            });
            return true;
        }
        return false;
    }
}


// Экспорт для использования в модулях
export { Role, Speaker, SoundEffect, RoleManager };
