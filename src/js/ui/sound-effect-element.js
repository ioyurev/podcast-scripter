import { BaseReplicaElement } from './base-element.js';

/**
 * Класс для элемента звукового эффекта, наследующийся от BaseReplicaElement
 */
class SoundEffectElement extends BaseReplicaElement {
    /**
     * Создание контента для звукового эффекта
     * @returns {HTMLElement} контейнер контента
     */
    createContent() {
        const soundContent = document.createElement('div');
        soundContent.className = 'sound-content';

        const soundRole = document.createElement('div');
        soundRole.className = 'sound-role';
        soundRole.textContent = this.role ? this.role.name : 'Без роли';

        const soundIcon = document.createElement('div');
        soundIcon.className = 'sound-icon';
        soundIcon.innerHTML = '<i data-feather="volume-2"></i>';

        const soundDuration = document.createElement('div');
        soundDuration.className = 'sound-duration';
        soundDuration.textContent = `${this.role.duration} сек`;

        soundContent.appendChild(soundRole);
        soundContent.appendChild(soundIcon);
        soundContent.appendChild(soundDuration);

        return soundContent;
    }

    getBaseClassName() {
        return 'sound-effect-item';
    }

    getGridTemplateAreas() {
        return `"controls . actions"
                "controls content actions"
                "controls . actions"`;
    }

    getControlsClassName() {
        return 'sound-controls';
    }

    getMoveUpButtonClassName() {
        return 'sound-move-up-btn';
    }

    getMoveDownButtonClassName() {
        return 'sound-move-down-btn';
    }

    getActionsClassName() {
        return 'sound-actions';
    }

    getEditButtonClassName() {
        // Звуковые эффекты не имеют кнопки редактирования
        return '';
    }

    getDeleteButtonClassName() {
        return 'sound-delete-btn';
    }
}

// Экспорт для использования в модулях
export { SoundEffectElement };
