/**
 * TimeSeries.js
 * v1.2 2025/11/26
 */

const QUERY_LIMIT = 10000

// Aggregate the TimeSeries data based on the specified number of minutes
const aggregate = async (minutes) => {
    const interval = new Date(Date.now() - 1000 * 60 * minutes) // Calculate the interval to aggregate

    const query = new Parse.Query('TimeSeries')

    query.greaterThan('createdAt', interval) // Filter data older than the specified interval
    query.doesNotExist('aggregation') // Filter data already aggregated
    query.limit(QUERY_LIMIT) // Limit the number of records retrieved

    var aggregation = {}

    for (var chunk = 0; ; chunk++) {
        query.skip(QUERY_LIMIT * chunk)
        const results = await query.find()

        for (const object of results) {
            const id = object.get('device').id
            const key = object.get('key')
            const value = object.get('value')

            if (!aggregation[id]) {
                aggregation[id] = { device: object.get('device') }
            }

            // count
            if (!aggregation[id][key + '*count'])
                aggregation[id][key + '*count'] = 1
            else
                aggregation[id][key + '*count']++

            // min
            if (!aggregation[id][key + '*min'])
                aggregation[id][key + '*min'] = value
            else {
                aggregation[id][key + '*min'] = aggregation[id][key + '*min'] < value ? aggregation[id][key + '*min'] : value
            }

            // max
            if (!aggregation[id][key + '*max'])
                aggregation[id][key + '*max'] = value
            else {
                aggregation[id][key + '*max'] = aggregation[id][key + '*max'] > value ? aggregation[id][key + '*max'] : value
            }

            // avg
            if (!aggregation[id][key + '*avg'])
                aggregation[id][key + '*avg'] = value
            else {
                aggregation[id][key + '*avg'] += value
            }

            // delta
            aggregation[id][key + '*delta'] = aggregation[id][key + '*max'] - aggregation[id][key + '*min']
        }
        if (results.length !== QUERY_LIMIT) break // End of loop
    }

    for (const id of Object.keys(aggregation)) {
        const device = aggregation[id]['device']
        for (const key of Object.keys(aggregation[id]).filter(item => item !== 'device')) {
            var val = aggregation[id][key]
            const okey = key.split('*')[0]
            const agg = key.split('*')[1]
            const count = aggregation[id][okey + '*count']

            if (agg === 'count') continue;
            if (agg === 'avg')
                val /= count

            const days = `${Math.floor(minutes / 24 / 60)}`
            const hours = `${Math.floor((minutes / 60) % 24)}`
            const lminutes = `${Math.floor(minutes % 60)}`

            var timeLabel = ''

            if (days > 0) timeLabel = days + 'd'
            if (hours > 0) timeLabel += hours + 'h'
            if (lminutes > 0) timeLabel += lminutes + 'm'

            var aggregateTimeSeries = new Parse.Object("TimeSeries")

            aggregateTimeSeries.set('device', device)
            aggregateTimeSeries.set('key', okey)
            try {
                aggregateTimeSeries.set('value', val)
            } catch (e) {
                console.error('TimeSeries Error: value is ' + val, 'id is ' + id, 'key is ' + key)
                throw e
            }
            aggregateTimeSeries.set('aggregation', agg + ',' + timeLabel + ',' + count)

            await aggregateTimeSeries.save(null, { useMasterKey: true })
        }
    }
}

// Cleanup the TimeSeries data based on the specified number of days and aggregation preferences
// The function iterates through the TimeSeries data and removes old records, prioritizing the specified number of aggregations
const cleanup = async (days, keep_aggregates) => {
    const interval = new Date(Date.now() - 1000 * 60 * 60 * 24 * days) // Calculate the interval to clean

    const query = new Parse.Query('TimeSeries')

    query.lessThan('createdAt', interval) // Filter data older than the specified interval
    query.limit(QUERY_LIMIT) // Limit the number of records retrieved

    if (keep_aggregates) query.doesNotExist('aggregation')

    for (var chunk = 0; ; chunk++) {
        query.skip(QUERY_LIMIT * chunk)
        const results = await query.find()

        for (const object of results) {
            object.destroy({
                useMasterKey: true
            })
        }
        if (results.length !== QUERY_LIMIT) break // End of loop
    }
}

exports.aggregate = aggregate
exports.cleanup = cleanup
