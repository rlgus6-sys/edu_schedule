const DEFAULT_SETTINGS = Object.freeze({
    visibleDays: [1, 2, 3, 4, 5, 6, 0],
    startHour: 8,
    endHour: 22
});

function parseJson(value, fallback) {
    if (!value) return fallback;
    try {
        return JSON.parse(value);
    } catch (error) {
        console.warn('Ignoring invalid local data:', error);
        return fallback;
    }
}

function parseArray(value) {
    const parsed = parseJson(value, []);
    return Array.isArray(parsed) ? parsed : [];
}

export function createDataStore(storage = localStorage) {
    const roomKey = (prefix, roomCode) => prefix + roomCode;

    function findStoredArray(prefix, backupKey, roomCode) {
        const primary = storage.getItem(roomKey(prefix, roomCode));
        if (parseArray(primary).length > 0) return primary;

        const backup = storage.getItem(backupKey);
        if (parseArray(backup).length > 0) return backup;

        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (!key || !key.startsWith(prefix) || key.endsWith('_backup')) continue;

            const candidate = storage.getItem(key);
            if (parseArray(candidate).length > 0) return candidate;
        }
        return primary || backup;
    }

    return {
        loadSettings() {
            const saved = parseJson(storage.getItem('eduschedule_settings'), {});
            return { ...DEFAULT_SETTINGS, ...(saved && typeof saved === 'object' ? saved : {}) };
        },

        saveSettings(settings) {
            storage.setItem('eduschedule_settings', JSON.stringify(settings));
        },

        loadState(roomCode) {
            return {
                students: parseArray(findStoredArray('eduschedule_students_', 'eduschedule_students_backup', roomCode)),
                schedules: parseArray(findStoredArray('eduschedule_schedules_', 'eduschedule_schedules_backup', roomCode))
            };
        },

        saveState(roomCode, students, schedules) {
            const serializedStudents = JSON.stringify(students);
            const serializedSchedules = JSON.stringify(schedules);
            storage.setItem(roomKey('eduschedule_students_', roomCode), serializedStudents);
            storage.setItem(roomKey('eduschedule_schedules_', roomCode), serializedSchedules);
            storage.setItem('eduschedule_students_backup', serializedStudents);
            storage.setItem('eduschedule_schedules_backup', serializedSchedules);
        },

        getDeletedIds(roomCode) {
            return new Set(parseArray(storage.getItem(roomKey('eduschedule_deleted_ids_', roomCode))));
        },

        markDeletedId(roomCode, id) {
            const ids = this.getDeletedIds(roomCode);
            ids.add(id);
            storage.setItem(roomKey('eduschedule_deleted_ids_', roomCode), JSON.stringify([...ids]));
        },

        getAlarm(scheduleId) {
            const alarm = parseJson(storage.getItem('eduschedule_alarm_' + scheduleId), null);
            return alarm && typeof alarm === 'object'
                ? { alarmBefore: Number(alarm.alarmBefore) || 0, alarmEndBefore: Number(alarm.alarmEndBefore) || 0 }
                : { alarmBefore: 10, alarmEndBefore: 0 };
        },

        saveAlarm(scheduleId, alarmBefore, alarmEndBefore) {
            storage.setItem('eduschedule_alarm_' + scheduleId, JSON.stringify({
                alarmBefore: Number(alarmBefore),
                alarmEndBefore: Number(alarmEndBefore)
            }));
        },

        isInitialized(roomCode) {
            return Boolean(storage.getItem(roomKey('eduschedule_initialized_', roomCode)));
        },

        markInitialized(roomCode) {
            storage.setItem(roomKey('eduschedule_initialized_', roomCode), 'true');
        }
    };
}
