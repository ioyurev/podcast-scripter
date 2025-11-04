import { logger } from '../logger.js';

/**
 * Компонент для отображения скрипта в режиме просмотра
 */
class ScriptViewer {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            showStats: true,
            showColors: true,
            showRoleInfo: true,
            ...options
        };
        this.currentData = null;
        this.logger = logger;
    }

    /**
     * Отрисовка скрипта
     * @param {ScriptData} scriptData - Данные скрипта
     */
    render(scriptData) {
        try {
            this.currentData = scriptData;
            this.container.innerHTML = '';
            
            if (!scriptData || !scriptData.validate()) {
                this.renderEmptyState();
                return;
            }

            // Создание контейнера для всего содержимого
            const contentContainer = document.createElement('div');
            contentContainer.className = 'viewer-content';

            // Отображение списка реплик (без статистики, так как она теперь в панели управления)
            const replicasContainer = this.renderReplicas(scriptData);
            contentContainer.appendChild(replicasContainer);

            this.container.appendChild(contentContainer);
            this.logger.info('Скрипт успешно отображен в режиме просмотра', {
                roleCount: scriptData.roles.length,
                replicaCount: scriptData.replicas.length
            });
        } catch (error) {
            logger.time('script-render-error');
            logger.error('Ошибка при отрисовке скрипта', {
                error: error.message
            });
            logger.timeEnd('script-render-error');
            throw error;
        }
    }

    /**
     * Отрисовка списка реплик
     * @param {ScriptData} scriptData - Данные скрипта
     * @returns {HTMLElement} Контейнер реплик
     */
    renderReplicas(scriptData) {
        const replicasContainer = document.createElement('div');
        replicasContainer.className = 'viewer-replicas-container';

        const replicasList = document.createElement('div');
        replicasList.className = 'viewer-replicas-list';

        const replicasWithRoleInfo = scriptData.getReplicasWithRoleInfo();
        let replicaIndex = 1;

        replicasWithRoleInfo.forEach(replica => {
            const replicaElement = this.renderReplica(replica, replicaIndex++);
            replicasList.appendChild(replicaElement);
        });

        replicasContainer.appendChild(replicasList);
        return replicasContainer;
    }

    /**
     * Отрисовка отдельной реплики
     * @param {Object} replica - Данные реплики
     * @param {number} index - Индекс реплики
     * @returns {HTMLElement} Элемент реплики
     */
    renderReplica(replica, index) {
        const replicaElement = document.createElement('div');
        replicaElement.className = 'viewer-replica-item';

        const role = replica.role;
        if (role) {
            // Установка цвета для спикеров
            if (this.options.showColors && role.type === 'speaker') {
                const color = role.color || this.getDefaultSpeakerColor(role.id);
                replicaElement.style.setProperty('--viewer-speaker-color', color);
                replicaElement.classList.add('speaker-colored');
            }

            // Добавление информации о роли
            if (this.options.showRoleInfo) {
                const roleInfo = document.createElement('div');
                roleInfo.className = 'viewer-replica-role';
                roleInfo.textContent = `${role.name} (${role.type === 'speaker' ? 'Спикер' : 'Звук'})`;
                replicaElement.appendChild(roleInfo);
            }
        }

        // Текст реплики
        const textElement = document.createElement('div');
        textElement.className = 'viewer-replica-text';
        textElement.textContent = replica.text || '';
        replicaElement.appendChild(textElement);

        // Дополнительная информация
        const infoElement = document.createElement('div');
        infoElement.className = 'viewer-replica-info';
        infoElement.innerHTML = `
            <span class="replica-index">#${index}</span>
            ${replica.wordCount ? `<span class="replica-words">${replica.wordCount} слов</span>` : ''}
            ${role && role.type === 'sound' && role.duration ? `<span class="replica-duration">${role.duration} сек</span>` : ''}
        `;
        replicaElement.appendChild(infoElement);

        return replicaElement;
    }

    /**
     * Отрисовка пустого состояния
     */
    renderEmptyState() {
        const emptyContainer = document.createElement('div');
        emptyContainer.className = 'viewer-empty-state';
        emptyContainer.innerHTML = `
            <div class="empty-content">
                <div class="empty-icon">📝</div>
                <h3>Нет данных для отображения</h3>
                <p>Скрипт пуст или данные не загружены</p>
            </div>
        `;
        this.container.appendChild(emptyContainer);
    }

    /**
     * Отрисовка состояния ошибки
     * @param {string} errorMessage - Сообщение об ошибке
     */
    renderErrorState(errorMessage) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'viewer-error-state';
        errorContainer.innerHTML = `
            <div class="error-content">
                <div class="error-icon">⚠️</div>
                <h3>Ошибка отображения</h3>
                <p>${errorMessage}</p>
            </div>
        `;
        this.container.appendChild(errorContainer);
    }

    /**
     * Генерация цвета для спикера на основе ID
     * @param {string} id - ID спикера
     * @returns {string} Цвет в формате HSL
     */
    getDefaultSpeakerColor(id) {
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
     * Очистка контейнера
     */
    clear() {
        this.container.innerHTML = '';
        this.currentData = null;
    }

    /**
     * Обновление отображения
     * @param {ScriptData} scriptData - Новые данные скрипта
     */
    update(scriptData) {
        this.render(scriptData);
    }

    /**
     * Прокрутка к началу
     */
    scrollToTop() {
        this.container.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Прокрутка к реплике по индексу
     * @param {number} index - Индекс реплики (начиная с 1)
     */
    scrollToReplica(index) {
        const replicaElement = this.container.querySelector(`.viewer-replica-item:nth-child(${index})`);
        if (replicaElement) {
            replicaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * Получение текущего состояния
     * @returns {Object} Состояние компонента
     */
    getState() {
        return {
            hasData: !!this.currentData,
            replicaCount: this.currentData ? this.currentData.replicas.length : 0,
            roleCount: this.currentData ? this.currentData.roles.length : 0
        };
    }

    /**
     * Установка опций
     * @param {Object} options - Новые опции
     */
    setOptions(options) {
        this.options = { ...this.options, ...options };
        if (this.currentData) {
            this.render(this.currentData);
        }
    }
}

// Экспорт для использования в модулях
export { ScriptViewer };
