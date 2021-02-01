const dayjs = require('dayjs');
var utc = require('dayjs/plugin/utc');
var timezone = require('dayjs/plugin/timezone');
const Fitbit  = require('./Fitbit');

dayjs.extend(utc);
dayjs.extend(timezone);

const THOUSAND_FACTOR = 1000;

const handleResponse = response => response.data;

const getDayjsInstance = (dayjsDateOrTimestamp = null) => {
    const at = dayjsDateOrTimestamp ? (dayjsDateOrTimestamp.isValid ? dayjsDateOrTimestamp : dayjs(dayjsDateOrTimestamp)) : dayjs();
    if (!at.isValid()) {
        throw new Error('Invalid instance: ' + at);
    }

    return at;
};

class FitbitApi {
    constructor(fitbitClient) {
        this.fitbitClient = fitbitClient;
    }

    static fromUTC = (timestamp, tz = null) => {
        return tz ? dayjs.utc(timestamp).tz(tz) : dayjs.utc(timestamp);
    };

    static getDateTime = (dayjsDateOrTimestamp = null) => {
        const at = getDayjsInstance(dayjsDateOrTimestamp);

        return {
            date: at.format('YYYY-MM-DD'),
            time: at.format('HH:mm:ss')
        };
    };

    static getDate = (dayjsDateOrTimestamp = null) => {
        const at = getDayjsInstance(dayjsDateOrTimestamp);
        return at.format('YYYY-MM-DD');
    }

    static getLifetimeStatsUrl = (userId = '-') => {
        return `https://api.fitbit.com/1/user/${userId}/activities.json`;
    };

    getLifetimeStats = (userId = '-') => {
        const url = FitbitApi.getLifetimeStatsUrl(userId);
        return this.fitbitClient.request({
            url,
            method: 'GET',
        }).then(handleResponse);
    };

    static getProfileUrl = (userId = '-') => {
        return `https://api.fitbit.com/1/user/${userId}/profile.json`;
    };

    getProfile = (userId = '-') => {
        const url = FitbitApi.getProfileUrl(userId);
        return this.fitbitClient.request({
            url,
            method: 'GET',
        }).then(handleResponse);
    };

    static getBodyFatUrl = (dayjsDateOrTimestamp = null, userId = '-') => {
        const dateStr = FitbitApi.getDate(dayjsDateOrTimestamp);
        return `https://api.fitbit.com/1/user/${userId}/body/log/fat/date/${dateStr}.json`;
    };

    getBodyFat = (dayjsDateOrTimestamp = null, userId = '-') => {
        const url = FitbitApi.getBodyFatUrl(dayjsDateOrTimestamp, userId);
        return this.fitbitClient.request({
            url,
            method: 'GET',
        }).then(handleResponse);
    };

    static getLogBodyFatUrl = (userId = '-') => {
        return `https://api.fitbit.com/1/user/${userId}/body/log/fat.json`;
    };

    logBodyFat = (fat, dayjsDateOrTimestamp, userId = '-') => {
        const today = FitbitApi.getDateTime(dayjsDateOrTimestamp);
        const url = FitbitApi.getLogBodyFatUrl(userId);
        return this.fitbitClient.request({
            url,
            method: 'POST',
            json: true,
            data: Fitbit.createData({
                fat,
                date: today.date,
                time: today.time
            })
        }).then(handleResponse);
    };

    static getLogWeightUrl = (userId = '-') => {
        return `https://api.fitbit.com/1/user/${userId}/body/log/weight.json`;
    };

    logWeight = (weight, dayjsDateOrTimestamp, userId = '-') => {
        const today = FitbitApi.getDateTime(dayjsDateOrTimestamp);
        const url = FitbitApi.getLogWeightUrl(userId);
        const verifiedWeight = weight > THOUSAND_FACTOR ? (weight / THOUSAND_FACTOR) : weight;
        return this.fitbitClient.request({
            url,
            method: 'POST',
            json: true,
            data: Fitbit.createData({
                weight: verifiedWeight,
                date: today.date,
                time: today.time
            })
        }).then(handleResponse);
    };

    static getWeightUrl = (dayjsDateOrTimestamp = null, userId = '-') => {
        const dateStr = FitbitApi.getDate(dayjsDateOrTimestamp);
        return `https://api.fitbit.com/1/user/${userId}/body/log/weight/date/${dateStr}.json`;
    };

    getWeight = (dayjsDateOrTimestamp = null, userId = '-') => {
        const url = FitbitApi.getWeightUrl(dayjsDateOrTimestamp, userId);
        return this.fitbitClient.request({
            url,
            method: 'GET',
        }).then(handleResponse);
    };
}

module.exports = FitbitApi;