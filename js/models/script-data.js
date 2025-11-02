import { BaseModel } from './base.js';

/**
 * Модель данных скрипта для режима просмотра
 */
class ScriptData extends BaseModel {
    constructor(data = {}) {
        super();
        this.roles = data.roles || [];
        this.replicas = data.replicas || [];
        this.version = data.version || '1.0';
        this.exportDate = data.exportDate || new Date().toISOString();
        this.statistics = this.calculateStatistics();
    }

    /**
     * Валидация данных скрипта
     * @returns {boolean} Валидны ли данные
     */
    validate() {
        if (!this.roles || !Array.isArray(this.roles)) return false;
        if (!this.replicas || !Array.isArray(this.replicas)) return false;
        
        // Проверка структуры ролей
        for (const role of this.roles) {
            if (!role.id || !role.name || !role.type) return false;
            if (!['speaker', 'sound'].includes(role.type)) return false;
        }

        // Проверка структуры реплик
        for (const replica of this.replicas) {
            if (!replica.id || typeof replica.text !== 'string') return false;
            if (replica.roleId !== null && typeof replica.roleId !== 'string') return false;
        }

        return true;
    }

    /**
     * Расчет статистики скрипта
     * @returns {Object} Объект статистики
     */
    calculateStatistics() {
        let totalWords = 0;
        let totalDuration = 0;
        let roleCount = this.roles.length;
        let replicaCount = this.replicas.length;

        // Подсчет слов для спикеров
        const speakerReplicas = this.replicas.filter(replica => {
            const role = this.roles.find(r => r.id === replica.roleId);
            return role && role.type === 'speaker';
        });

        totalWords = speakerReplicas.reduce((sum, replica) => sum + (replica.wordCount || 0), 0);

        // Расчет длительности
        this.replicas.forEach(replica => {
            const role = this.roles.find(r => r.id === replica.roleId);
            if (role) {
                if (role.type === 'speaker' && role.wordsPerMinute) {
                    const duration = (replica.wordCount || 0) / role.wordsPerMinute;
                    totalDuration += duration;
                } else if (role.type === 'sound' && role.duration) {
                    const durationInMinutes = role.duration / 60;
                    totalDuration += durationInMinutes;
                }
            }
        });

        const totalDurationFormatted = this.formatDuration(totalDuration);

        return {
            totalWords,
            totalDurationFormatted,
            roleCount,
            replicaCount
        };
    }

    /**
     * Форматирование длительности в строку (MM:SS)
     * @param {number} minutes - Длительность в минутах
     * @returns {string} Отформатированная строка
     */
    formatDuration(minutes) {
        const totalSeconds = Math.round(minutes * 60);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Получение роли по ID
     * @param {string} roleId - ID роли
     * @returns {Object|null} Роль или null
     */
    getRoleById(roleId) {
        return this.roles.find(role => role.id === roleId) || null;
    }

    /**
     * Преобразование в JSON
     * @returns {Object} JSON представление
     */
    toJSON() {
        return {
            ...super.toJSON(),
            roles: this.roles,
            replicas: this.replicas,
            version: this.version,
            exportDate: this.exportDate,
            statistics: this.statistics
        };
    }

    /**
     * Создание из JSON
     * @param {Object} json - JSON данные
     * @returns {ScriptData} Новый экземпляр
     */
    static fromJSON(json) {
        const scriptData = new ScriptData(json);
        scriptData.id = json.id;
        scriptData.createdAt = new Date(json.createdAt);
        scriptData.updatedAt = new Date(json.updatedAt);
        return scriptData;
    }

    /**
     * Сортировка реплик по порядку (по умолчанию уже в правильном порядке)
     * @returns {Array} Отсортированные реплики
     */
    getSortedReplicas() {
        return [...this.replicas];
    }

    /**
     * Получение реплик с информацией о роли
     * @returns {Array} Реплики с информацией о роли
     */
    getReplicasWithRoleInfo() {
        return this.replicas.map(replica => {
            const role = this.getRoleById(replica.roleId);
            return {
                ...replica,
                role: role || null
            };
        });
    }
}

// Экспорт для использования в модулях
export { ScriptData };
