import dayjs from 'dayjs';

export const formatDate = (date, format = 'YYYY-MM-DD') => {
    if (!date) return null;
    const d = dayjs(date);
    if (!d.isValid()) return null;
    return d.format(format);
};