const CronJob = require('cron').CronJob;
const timeseries = require("./TimeSeries.js")

/* compute timeseries aggregated data */
/* 30 minutes */
new CronJob('0 */30 * * * *', async function () {
    await timeseries.aggregate(30)
}, null, true, "UTC");

/* 1 day */
new CronJob('0 0 0 * * *', async function () {
    await timeseries.aggregate(60 * 24)
    await timeseries.cleanup(1, true)
}, null, true, "UTC");
