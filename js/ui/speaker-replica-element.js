/**
 * Класс для элемента реплики спикера, наследующийся от BaseReplicaElement
 */
class SpeakerReplicaElement extends BaseReplicaElement {
    /**
     * Создание контента для реплики спикера
     * @returns {HTMLElement} контейнер контента
     */
    createContent() {
        const replicaContent = document.createElement('div');
        replicaContent.className = 'replica-content';

        const replicaRole = document.createElement('div');
        replicaRole.className = 'replica-role';

        if (this.role) {
            // Устанавливаем цвет для спикеров
            if (this.role.type === 'speaker') {
                const color = this.role.color || this.getSpeakerColor(this.role.id);
                replicaRole.style.setProperty('--speaker-text-color', this.getDarkerColor(color));
                replicaRole.classList.add('speaker-colored');
                replicaRole.innerHTML = '<i data-feather="user"></i> ' + this.role.name;
            } else {
                replicaRole.textContent = this.role.name;
            }
        } else {
            replicaRole.textContent = 'Без роли';
        }

        const replicaText = document.createElement('div');
        replicaText.className = 'replica-text';
        replicaText.textContent = this.replica.text;

        const replicaStats = document.createElement('div');
        replicaStats.className = 'replica-stats';
        replicaStats.textContent = `${this.replica.wordCount} слов`;

        replicaContent.appendChild(replicaRole);
        replicaContent.appendChild(replicaText);
        replicaContent.appendChild(replicaStats);

        return replicaContent;
    }

    getBaseClassName() {
        return 'replica-item';
    }

    getGridTemplateAreas() {
        return `"controls . actions"
                "controls content actions"
                "controls . actions"`;
    }

    getControlsClassName() {
        return 'replica-controls';
    }

    getMoveUpButtonClassName() {
        return 'replica-move-up-btn';
    }

    getMoveDownButtonClassName() {
        return 'replica-move-down-btn';
    }

    getActionsClassName() {
        return 'replica-actions';
    }

    getEditButtonClassName() {
        return 'replica-edit-btn';
    }

    getDeleteButtonClassName() {
        return 'replica-delete-btn';
    }

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
}
