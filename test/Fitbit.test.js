const appConfig = require( './config/app.json' );
const Fitbit = require( '../Fitbit' );
const FileTokenManager = require( '../FileTokenManager' );
const TestUtils = require( './utils/TestUtils' );
const axios = require('axios');
const AxiosMockAdapter = require( 'axios-mock-adapter' );

const LOGGER = TestUtils.getLogger();
const HTTP_RESPONSE_500 = 500;
const HTTP_RESPONSE_400 = 400;
const HTTP_RESPONSE_200 = 200;
const MOCK_PROFILE = {
        user: {
          age: 999,
          ambassador: false,
          averageDailySteps: 0,
          challengesBeta: true,
          clockTimeDisplayFormat: '24hour',
          corporate: false,
          corporateAdmin: false,
          country: 'SE',
          dateOfBirth: '1793-01-01',
          displayName: 'John Doe',
          displayNameSetting: 'name',
          distanceUnit: 'METRIC',
          encodedId: 'xxxxxx',
          firstName: 'John',
          foodsLocale: 'sv_SE',
          fullName: 'John Doe',
          gender: 'MALE',
          glucoseUnit: 'METRIC',
          height: 175,
          heightUnit: 'METRIC',
          isBugReportEnabled: false,
          isChild: false,
          isCoach: false,
          languageLocale: 'sv_SE',
          lastName: 'Doe',
          legalTermsAcceptRequired: false,
          locale: 'sv_SE',
          memberSince: '1922-01-01',
          mfaEnabled: false,
          offsetFromUTCMillis: 3600000,
          sdkDeveloper: true,
          sleepTracking: 'Normal',
          startDayOfWeek: 'MONDAY',
          strideLengthRunning: 999.9,
          strideLengthRunningType: 'manual',
          strideLengthWalking: 111.1,
          strideLengthWalkingType: 'manual',
          swimUnit: 'METRIC',
          temperatureUnit: 'METRIC',
          timezone: 'Europe/Stockholm',
          topBadges: [],
          waterUnit: 'METRIC',
          waterUnitName: 'ml',
          weight: 12.8,
          weightUnit: 'METRIC'
        }
    };
const MOCK_TOKEN = {
    "access_token": "eyXXXXXXX",
    "expires_in": 28800,
    "refresh_token": "xzZZZZZZZ",
    "scope": "sleep activity weight profile social location heartrate nutrition settings",
    "token_type": "Bearer",
    "user_id": "ABC123",
    "expires_at": "2021-01-29T07:40:41.109Z",
    "expires_at_timestamp": 1611906041109
};


const MOCK_BODY_FAT = {
    "activities": [],
    "goals": {
      "activeMinutes": 30,
      "caloriesOut": 2510,
      "distance": 8.05,
      "steps": 10000
    },
    "summary": {
      "activeScore": -1,
      "activityCalories": 0,
      "calorieEstimationMu": 2100,
      "caloriesBMR": 1520,
      "caloriesOut": 1520,
      "caloriesOutUnestimated": 1520,
      "distances": [
        {
          "activity": "total",
          "distance": 0
        },
        {
          "activity": "tracker",
          "distance": 0
        },
        {
          "activity": "loggedActivities",
          "distance": 0
        },
        {
          "activity": "veryActive",
          "distance": 0
        },
        {
          "activity": "moderatelyActive",
          "distance": 0
        },
        {
          "activity": "lightlyActive",
          "distance": 0
        },
        {
          "activity": "sedentaryActive",
          "distance": 0
        }
      ],
      "fairlyActiveMinutes": 0,
      "lightlyActiveMinutes": 0,
      "marginalCalories": 0,
      "sedentaryMinutes": 1440,
      "steps": 0,
      "useEstimation": true,
      "veryActiveMinutes": 0
    }
  };

FileTokenManager.setLogger(LOGGER);
Fitbit.setLogger(LOGGER);
//describe('Fitbit', () => {

    describe('Fitbit.constructor', () => {
        const fitbitConfig = appConfig.fitbit;

        beforeEach(() => {
        });

        test('constructor - no config', () => {
            try {
                new Fitbit();
                fail('it should not reach here');
            } catch (error) {
                console.log("Error", error);
            }
        });

        test('constructor - no token manager', () => {
            try {
                new Fitbit(fitbitConfig);
            } catch (error) {
                console.log("Error", error);
                fail('it should not reach here');
            }
        });

        test('constructor - faulty token manager', () => {
            try {
                new Fitbit(fitbitConfig, {});
                fail('it should not reach here');
            } catch (error) {
                console.log("Error", error);
            }
        });

        test('constructor - faulty token manager<2>', () => {
            try {
                new Fitbit(fitbitConfig, {read: () => {}});
                fail('it should not reach here');
            } catch (error) {
                console.log("Error", error);
            }
        });

        test('constructor', () => {
            try {
                new Fitbit(fitbitConfig, {read: () => {}, write: () => {}});
            } catch (error) {
                console.log("Error", error);
                fail('it should not reach here');
            }
        });

        test('constructor - default timeout', () => {
            try {
                const altFitbitConfig = {...fitbitConfig};
                delete altFitbitConfig.timeout;
                new Fitbit(altFitbitConfig, {read: () => {}, write: () => {}});
            } catch (error) {
                console.log("Error", error);
                fail('it should not reach here');
            }
        });
    });

    describe('Fitbit.request', () => {
        let fitbit;
        let fileTokenManager;

        beforeEach(() => {
            const fitbitConfig = appConfig.fitbit;
            fileTokenManager = new FileTokenManager(fitbitConfig.tokenFilePath);
            fitbit = new Fitbit(fitbitConfig, fileTokenManager);
        });

        test('getProfile - expired token', (done) => {
            fileTokenManager.read().then(token => {
                if (token.expires_at) {
                    delete token.expires_at;
                }
                if (token.expires_at_timestamp) {
                    delete token.expires_at_timestamp;
                }
                fitbit._token = token;
                TestUtils.getProfile(fitbit).finally(() => {
                    done();
                });
            });
        });

        test('getProfile - no token', (done) => {
            TestUtils.getProfile(fitbit).finally(() => {
                done();
            });
        });

        test('getProfile - has token', (done) => {
            fileTokenManager.read().then(token => {
                fitbit._token = token;
                TestUtils.getProfile(fitbit).finally(() => {
                    done();
                });
            });
        });
    });

    describe('Fitbit.request', () => {
        let fitbit;
        let fileTokenManager;

        beforeEach(() => {
            const fitbitConfig = appConfig.fitbit;
            fileTokenManager = new FileTokenManager(fitbitConfig.tokenFilePath);
            fitbit = new Fitbit(fitbitConfig, fileTokenManager);
        });

        test('getProfile - faulty config', (done) => {
            fileTokenManager.read().then(token => {
                delete token.access_token;
                fitbit._token = token;
                TestUtils.getProfile(fitbit).then((response) => {
                    console.log("Test response:", response);
                    done.fail('it should not reach here');
                })
                .catch(error => {
                    console.log("Error", error);
                    done();
                });
            });
        });
    });

    describe('Fitbit.request (http failures)', () => {
        const PROFILE_URL = 'https://api.fitbit.com/1/user/-/profile.json';
        let fitbit;
        let fileTokenManager;
        let axiosMock;

        beforeEach(() => {
            const fitbitConfig = appConfig.fitbit;
            fileTokenManager = new FileTokenManager(fitbitConfig.tokenFilePath);
            fitbit = new Fitbit(fitbitConfig, fileTokenManager);
            axiosMock = new AxiosMockAdapter(axios);
        });

        afterEach(() => {
            axiosMock.restore();
        });

        test('getProfile - response error', (done) => {
            axiosMock.onGet(PROFILE_URL).reply(HTTP_RESPONSE_500, {});
            TestUtils.getProfile(fitbit).then((response) => {
                console.log("Test response:", response);
                done.fail('it should not reach here');
            }).catch(error => {
                console.log("Error", error);
                done();
            });
        });

        test('getProfile - response error', (done) => {
            axiosMock.onGet(PROFILE_URL).reply(HTTP_RESPONSE_400, MOCK_PROFILE);
            TestUtils.getProfile(fitbit).then((response) => {
                console.log("Test response:", response);
                done.fail('it should not reach here');
            }).catch(error => {
                console.log("Error", error);
                done();
            });
        });

    });

    describe('Fitbit.createData', () => {
        test('Basic data', () => {
            const data = {a: 'a'};
            expect(Fitbit.createData(data)).toBe("a=a");
        });

        test('Complex data', () => {
            const data = {a: 'a'};
            expect(Fitbit.createData(data)).toBe("a=a");
        });

    });

    describe('Fitbit.addExpiresAt', () => {
        let data;
        beforeEach(() => {
            data = {
                "access_token":"abc123",
                "expires_in":28800,
                "refresh_token":"abc123",
                "scope":"nutrition activity heartrate settings profile social location weight sleep",
                "token_type":"Bearer",
                "user_id":"8SG974",
                "expires_at":"20210127T04:00:00"
            };
        });

        test('No expire at', () => {
            delete data.expires_at;
            const year = 2021;
            const month = 0; // Zero based
            const day = 26;
            const hour = 21;
            const min = 0;
            const second = 0;
            expect(Fitbit.addExpiresAt(data, new Date(year, month, day, hour, min, second)).expires_at).toBe("2021-01-27T04:00:00.000Z");
        });

        test('Expired', () => {

        });

        test('Not expired', () => {

        });
    });

    describe('Fitbit.hasTokenExpired', () => {
        test('No expire at', () => {
            const data = {};
            expect(Fitbit.hasTokenExpired(data)).toBe(true);
        });

        test('Expired', () => {
            const data = {expires_at: "2021-01-27T04:00:00.000Z"};
            expect(Fitbit.hasTokenExpired(data)).toBe(true);
        });

        test('Not expired', () => {
            const data = {expires_at: "2121-01-27T04:00:00.000Z"};
            expect(Fitbit.hasTokenExpired(data)).toBe(false);
        });
    });


    describe('Fitbit.setLogger', () => {
        let fileTokenManager;
        let fitbit;

        beforeEach(() => {
            Fitbit.setLogger(null);
            const fitbitConfig = appConfig.fitbit;
            fileTokenManager = new FileTokenManager(fitbitConfig.tokenFilePath);
            fitbit = new Fitbit(fitbitConfig, fileTokenManager);
        });

        afterEach(() => {
            Fitbit.setLogger(LOGGER);
        });

        test('no logger', (done) => {
            Fitbit.setLogger(null);
            TestUtils.getProfile(fitbit).finally(() => {
                done();
            });
        });

        test('function logger', (done) => {
            let counter = 0;
            Fitbit.setLogger(() => { counter++; });
            TestUtils.getProfile(fitbit).then(()=>{
                expect(counter).not.toBe(0);
            }).finally(() => {
                done();
            });
        });

        test('function logger with data', (done) => {
            let counter = 0;
            Fitbit.setLogger(() => { counter++; });
            TestUtils.getProfile(fitbit).then(()=>{
                expect(counter).not.toBe(0);
            }).finally(() => {
                done();
            });
        });

        test('illegal logger', (done) => {
            Fitbit.setLogger({});
            TestUtils.getProfile(fitbit).finally(() => {
                done();
            });
        });
    });

    describe('Fitbit.request (refresh and queuing)', () => {
        const TOKEN_URL = 'https://api.fitbit.com/oauth2/token';
        const PROFILE_URL = 'https://api.fitbit.com/1/user/-/profile.json';
        const BODY_FAT_URL = TestUtils.getBodyFatURL();

        let fitbit;
        let fileTokenManager;
        let axiosMock;

        beforeEach(() => {
            const fitbitConfig = appConfig.fitbit;
            fileTokenManager = new FileTokenManager(fitbitConfig.tokenFilePath);
            fitbit = new Fitbit(fitbitConfig, fileTokenManager);
            axiosMock = new AxiosMockAdapter(axios);
        });

        afterEach(() => {
            axiosMock.restore();
        });

        test('second request is queued', (done) => {
            axiosMock.onPost(TOKEN_URL).reply(HTTP_RESPONSE_200, MOCK_TOKEN);
            axiosMock.onGet(PROFILE_URL).reply(HTTP_RESPONSE_200, MOCK_PROFILE);
            axiosMock.onGet(BODY_FAT_URL).reply(HTTP_RESPONSE_200, MOCK_BODY_FAT);
            let count = 0;
            TestUtils.getProfile(fitbit).then((response) => {
                count += 1;
                console.log("Profile response:", response);
                if (count > 1) {
                    done();
                }
            }).catch(error => {
                console.log("Error", error);
                done();
            });
            TestUtils.getBodyFat(fitbit).then((response) => {
                count += 1;
                console.log("Body Fat response:", response);
                if (count > 1) {
                    done();
                }
            }).catch(error => {
                console.log("Error", error);
                done();
            });
            expect(fitbit._requestQueue.length).not.toBe(0);
        });
    });

//});