/**
 * Incident.js
 * v0.2 2025/11/28
 */

const SUBJECT_PREFIX = 'INCIDENT'
const FROM = 'noreply@example.com'
const TO = 'example@example.com'

Parse.Cloud.afterSave("Incident", async (request) => {
    console.log('Incident Trigger: afterSave')

    const incident = request.object
    const original = request.original

    const subject = incident.get('subject')
    const message = incident.get('message')
    const severity = incident.get('severity')

    Parse.Cloud.sendEmail({
        template: 'incident.html',
        locale: 'en',
        from: FROM,
        to: TO,
        subject: SUBJECT_PREFIX + ' [' + severity + '] ' + subject + (original ? ' [UPDATE]' : ''),
        data: { message: message }
    })
})

const incident = new Parse.Object('Incident')
incident.save({
    subject: 'Server Process RESTART',
    message: 'Server Process has been restarted.',
    severity: 1
}, { useMasterkey: true })
