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

const handleRequest = (options, fitbitClient, apiCallInterceptor) => {
    if (apiCallInterceptor) {
        if (apiCallInterceptor(options)) {
            return new Promise((resolve, reject) => {
                reject();
            });
        }
    }

    return fitbitClient.request(options).then(handleResponse);
};

class FitbitApi {
    constructor(fitbitClient, apiCallInterceptor = null) {
        this._fitbitClient = fitbitClient;
        this._apiCallInterceptor = apiCallInterceptor;
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

    static getProfileUrl = (userId = '-') => {
        return `https://api.fitbit.com/1/user/${userId}/profile.json`;
    };

    static getBodyFatUrl = (dayjsDateOrTimestamp = null, userId = '-') => {
        const dateStr = FitbitApi.getDate(dayjsDateOrTimestamp);
        return `https://api.fitbit.com/1/user/${userId}/body/log/fat/date/${dateStr}.json`;
    };

    static getLogBodyFatUrl = (userId = '-') => {
        return `https://api.fitbit.com/1/user/${userId}/body/log/fat.json`;
    };

    static getLogWeightUrl = (userId = '-') => {
        return `https://api.fitbit.com/1/user/${userId}/body/log/weight.json`;
    };

    static getWeightUrl = (dayjsDateOrTimestamp = null, userId = '-') => {
        const dateStr = FitbitApi.getDate(dayjsDateOrTimestamp);
        return `https://api.fitbit.com/1/user/${userId}/body/log/weight/date/${dateStr}.json`;
    };

    getLifetimeStats = (userId = '-') => {
        const url = FitbitApi.getLifetimeStatsUrl(userId);
        const options = {
            url,
            method: 'GET',
        };
        return handleRequest(options, this._fitbitClient, this._apiCallInterceptor);
    };

    getProfile = (userId = '-') => {
        const url = FitbitApi.getProfileUrl(userId);
        const options = {
            url,
            method: 'GET',
        };
        return handleRequest(options, this._fitbitClient, this._apiCallInterceptor);
    };

    getBodyFat = (dayjsDateOrTimestamp = null, userId = '-') => {
        const url = FitbitApi.getBodyFatUrl(dayjsDateOrTimestamp, userId);
        const options = {
            url,
            method: 'GET',
        };
        return handleRequest(options, this._fitbitClient, this._apiCallInterceptor);
    };

    logBodyFat = (fat, dayjsDateOrTimestamp = null, userId = '-') => {
        const dateTime = FitbitApi.getDateTime(dayjsDateOrTimestamp);
        const url = FitbitApi.getLogBodyFatUrl(userId);
        const options = {
            url,
            method: 'POST',
            json: true,
            data: Fitbit.createData({
                fat,
                date: dateTime.date,
                time: dateTime.time
            })
        };
        return handleRequest(options, this._fitbitClient, this._apiCallInterceptor);
    };

    logWeight = (weight, dayjsDateOrTimestamp = null, userId = '-') => {
        const dateTime = FitbitApi.getDateTime(dayjsDateOrTimestamp);
        const url = FitbitApi.getLogWeightUrl(userId);
        const verifiedWeight = weight > THOUSAND_FACTOR ? (weight / THOUSAND_FACTOR) : weight;
        const options = {
            url,
            method: 'POST',
            json: true,
            data: Fitbit.createData({
                weight: verifiedWeight,
                date: dateTime.date,
                time: dateTime.time
            })
        };
        return handleRequest(options, this._fitbitClient, this._apiCallInterceptor);
    };

    getWeight = (dayjsDateOrTimestamp = null, userId = '-') => {
        const url = FitbitApi.getWeightUrl(dayjsDateOrTimestamp, userId);
        const options = {
            url,
            method: 'GET',
        };
        return handleRequest(options, this._fitbitClient, this._apiCallInterceptor);
    };
}

module.exports = FitbitApi;