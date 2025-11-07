// Импорты всех необходимых файлов для режима просмотра
import './viewer-app.js';

// Инициализация Feather Icons после загрузки DOM
import { featherIconsService } from '../utils/feather-icons.js';

document.addEventListener('DOMContentLoaded', async () => {
    await featherIconsService.initializeAsync();
});
