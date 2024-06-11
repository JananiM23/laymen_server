var admin = require("firebase-admin");

var CustomerAccount = require("./vilfresh-1595d-b9f7dbb028a0.json");
var DeliveryBoyAccount = require("./vilfreshdeliveryboy-2a71e6683d7d.json");


var _customerNotify = admin.initializeApp({
               credential: admin.credential.cert(CustomerAccount),
               databaseURL: ""
            }, 'customerNotify');

var _deliveryBoyNotify = admin.initializeApp({
               credential: admin.credential.cert(DeliveryBoyAccount),
               databaseURL: ""
            }, 'deliveryBoyNotify');

// var payload = {
//    notification: {
//       title: 'Vilfresh Test',
//       body: 'Vilfresh Push Notification Testing',
//       sound: 'notify_tone.mp3'
//    },
// };
// var options = {
//    priority: 'high',
//    timeToLive: 60 * 60 * 24
// };
// _customerNotify.messaging().sendToDevice('ceGhWJrixQY:APA91bHIfg4tCMe5I9R782nh5NREGBuCrCuS971mV0FcgIJs3cCGyHsDQwBfHXNoL9Dh9HOXi4Pf5RiTorZ_D3mY4UTKoPTHxJ2Ra9lINwPPSUSfxiUghQNqad3SaG9hT9P6qGPq3hZP', payload, options)
// .then((NotifyRes) => {
//    console.log('Success');
//    console.log(NotifyRes);
// }).catch(error => {
//    console.log('Error');
//    console.log(error);
// });

exports.CustomerNotify = _customerNotify;
exports.DeliveryBoyNotify = _deliveryBoyNotify;