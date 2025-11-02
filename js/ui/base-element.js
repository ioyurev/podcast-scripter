/**
 * Абстрактный базовый класс для элементов реплик
 * Определяет общую структуру и функциональность для всех типов элементов реплик
 */
class BaseReplicaElement {
    constructor(replica, role, index) {
        this.replica = replica;
        this.role = role;
        this.index = index;
        this.element = null;
    }

    /**
     * Создание основного элемента
     * @param {string} className - CSS класс для элемента
     * @param {string} gridTemplateAreas - шаблон grid областей
     * @returns {HTMLElement} созданный элемент
     */
    createBaseElement(className, gridTemplateAreas) {
        const element = document.createElement('div');
        element.className = className;
        element.dataset.replicaId = this.replica.id;
        element.draggable = true;
        element.style.display = 'grid';
        element.style.gridTemplateColumns = '40px 1fr 40px';
        element.style.gridTemplateRows = 'auto auto auto';
        element.style.gridTemplateAreas = gridTemplateAreas;
        element.style.alignItems = 'center';
        element.style.padding = '12px';
        element.style.marginBottom = '8px';
        element.style.border = '1px solid var(--color-gray-border)';
        element.style.borderRadius = '4px';
        element.style.transition = 'all 0.2s';
        element.style.minHeight = '50px';
        element.style.gap = '10px';

        this.element = element;
        return element;
    }

    /**
     * Создание контейнера для элементов управления (move-up, drag-handle, move-down)
     * @param {Function} onMoveUp - функция для перемещения вверх
     * @param {Function} onMoveDown - функция для перемещения вниз
     * @returns {HTMLElement} контейнер управления
     */
    createControlsContainer(onMoveUp, onMoveDown) {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = this.getControlsClassName();

        // Кнопка перемещения вверх
        const moveUpBtn = document.createElement('button');
        moveUpBtn.className = this.getMoveUpButtonClassName();
        moveUpBtn.innerHTML = '<i data-feather="chevron-up" title="Переместить вверх"></i>';
        moveUpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onMoveUp();
        });

        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '<i data-feather="move"></i>';
        dragHandle.title = 'Перетащите для сортировки';

        dragHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });

        // Кнопка перемещения вниз
        const moveDownBtn = document.createElement('button');
        moveDownBtn.className = this.getMoveDownButtonClassName();
        moveDownBtn.innerHTML = '<i data-feather="chevron-down" title="Переместить вниз"></i>';
        moveDownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onMoveDown();
        });

        controlsContainer.appendChild(moveUpBtn);
        controlsContainer.appendChild(dragHandle);
        controlsContainer.appendChild(moveDownBtn);

        return controlsContainer;
    }

    /**
     * Создание контейнера для действий (редактирование, удаление)
     * @param {Function} onDelete - функция для удаления
     * @param {boolean} showEditButton - показывать ли кнопку редактирования
     * @param {Function} onEdit - функция для редактирования
     * @returns {HTMLElement} контейнер действий
     */
    createActionsContainer(onDelete, showEditButton = false, onEdit = null) {
        const actionsContainer = document.createElement('div');
        actionsContainer.className = this.getActionsClassName();

        if (showEditButton && onEdit) {
            const editBtn = document.createElement('button');
            editBtn.className = this.getEditButtonClassName();
            editBtn.innerHTML = '<i data-feather="edit" title="Редактировать"></i>';
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                onEdit();
            });
            actionsContainer.appendChild(editBtn);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = this.getDeleteButtonClassName();
        deleteBtn.innerHTML = '<i data-feather="trash-2" title="Удалить"></i>';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onDelete();
        });
        actionsContainer.appendChild(deleteBtn);

        return actionsContainer;
    }

    /**
     * Методы для получения специфичных классов (должны быть переопределены в наследниках)
     */
    getControlsClassName() {
        throw new Error('getControlsClassName must be implemented');
    }

    getMoveUpButtonClassName() {
        throw new Error('getMoveUpButtonClassName must be implemented');
    }

    getMoveDownButtonClassName() {
        throw new Error('getMoveDownButtonClassName must be implemented');
    }

    getActionsClassName() {
        throw new Error('getActionsClassName must be implemented');
    }

    getEditButtonClassName() {
        throw new Error('getEditButtonClassName must be implemented');
    }

    getDeleteButtonClassName() {
        throw new Error('getDeleteButtonClassName must be implemented');
    }

    /**
     * Метод для установки цвета (для элементов со спикерами)
     * @param {string} color - цвет в формате CSS
     */
    setSpeakerColor(color) {
        if (this.element) {
            this.element.style.setProperty('--speaker-border-color', color);
            this.element.classList.add('speaker-colored');
        }
    }

    /**
     * Получение элемента
     * @returns {HTMLElement} созданный элемент
     */
    getElement() {
        return this.element;
    }

    /**
     * Абстрактный метод для создания контента (должен быть реализован в наследниках)
     * @returns {HTMLElement} контейнер контента
     */
    createContent() {
        throw new Error('createContent must be implemented in subclass');
    }

    /**
     * Полная сборка элемента
     * @param {Function} onMoveUp - функция для перемещения вверх
     * @param {Function} onMoveDown - функция для перемещения вниз
     * @param {Function} onDelete - функция для удаления
     * @param {boolean} showEditButton - показывать ли кнопку редактирования
     * @param {Function} onEdit - функция для редактирования
     * @returns {HTMLElement} собранный элемент
     */
    build(onMoveUp, onMoveDown, onDelete, showEditButton = false, onEdit = null) {
        const contentContainer = this.createContent();

        const element = this.createBaseElement(this.getBaseClassName(), this.getGridTemplateAreas());
        const controlsContainer = this.createControlsContainer(onMoveUp, onMoveDown);
        const actionsContainer = this.createActionsContainer(onDelete, showEditButton, onEdit);

        element.appendChild(controlsContainer);
        element.appendChild(contentContainer);
        element.appendChild(actionsContainer);

        return element;
    }

    getBaseClassName() {
        throw new Error('getBaseClassName must be implemented');
    }

    getGridTemplateAreas() {
        throw new Error('getGridTemplateAreas must be implemented');
    }
}
