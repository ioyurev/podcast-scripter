// Импорты всех необходимых файлов
import './logger.js';
import './models/base.js';
import './models/role.js';
import './models/replica.js';
import './services/data-manager.js';
import './services/file-handler.js';
import './ui/base-element.js';
import './ui/speaker-replica-element.js';
import './ui/sound-effect-element.js';
import './ui/components.js';
import './app.js';

// Инициализация Feather Icons после загрузки DOM
import { featherIconsService } from './utils/feather-icons.js';

document.addEventListener('DOMContentLoaded', async () => {
    await featherIconsService.initializeAsync();
});
