

var schedule = require('node-schedule');
var axios = require('axios');

var DeliveryLine_Management =  require('./api/models/deliveryline.model');
var Customer_Management =  require('./mobile_api/models/customer_management.model');
var NotificationModel =  require('./mobile_api/models/notification_management.model');
var FCM_App = require('./../Config/fcm_config').CustomerNotify;

var options = {
	priority: 'high',
	timeToLive: 60 * 60 * 24
};

var LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage('./../scratch');
localStorage.clear();

// Low Balance Alert System
var LowBalance_AlertSystem = schedule.scheduleJob('0 0 11 * * *', function() {
	console.log('initiate');
	DeliveryLine_Management.Delivery_lineSchema.find({Deliveryline_Name: {$regex: new RegExp("z-.*", "i")} })
	.exec( (error, response) => {
		if (!error) {
			const exceptionIds = [];
			response.map(obj => { exceptionIds.push(obj._id); });

			Customer_Management.CustomerManagementSchema
			.find( { Delivery_Line: {$nin: exceptionIds }, VilfreshMoney_Limit: {$lte: 200 }, Customer_Status: 'Subscription_Activated', If_Deleted: false, Active_Status: true }, {}, {})
			.exec((err, result) => {
				if (!err) {
					result = JSON.parse(JSON.stringify(result));
					var smsArray = [];
					result.map(customer => {
						if (customer.Firebase_Token && customer.Firebase_Token !== '') {
							var payload = {
								notification: {
									title: 'Vilfresh-Team',
									body: 'Your current vilfresh wallet balance is RS ' + customer.VilfreshMoney_Limit + ', Kindly maintain sufficient balance is the wallet for uninterrupted service.',
									sound: 'notify_tone.mp3'
								},
								data: {
									customer: '',
									notification_type: 'Recharge_YourWalletMoney',
									click_action: 'FCM_PLUGIN_ACTIVITY',
								}
							};
							// FCM_App.messaging().sendToDevice(customer.Firebase_Token, payload, options).then();
						}

						smsArray.push({
							'number': customer.Mobile_Number,
							'text': encodeURI('Your current Vilfresh wallet balance is Rs ' + customer.VilfreshMoney_Limit + ', Kindly maintain a sufficient balance in the wallet for uninterrupted service.')
						});

						const Notification = new NotificationModel.NotificationSchema({
							User: null,
							CustomerID: customer._id,
							DeliveryBoyID: null,
							Notification_Type: 'Recharge_YourWalletMoney',
							MessageTitle: 'Low Balance',
							Message: 'Your current vilfresh wallet balance is RS ' + customer.VilfreshMoney_Limit + ', Kindly maintain sufficient balance is the wallet for uninterrupted service',
							Message_Received: false,
							Message_Viewed: false,
							Active_Status: true,
							If_Deleted: false
						});
						Notification.save();
					});

					console.log(JSON.stringify(smsArray));

					// Bulk SMS Send
					// setTimeout(() => {
					// 	var data = { sender: 'VLFRSH', messages: smsArray};
					// 	const params = new URLSearchParams();
					// 	params.append('apikey', 'HNMG7wfMi7w-XcxkXrxDltzEC51f0psn4xEAngrdZ0');
					// 	params.append('data', JSON.stringify(data) );
					// 	axios.post('https://api.textlocal.in/bulk_json/', params).then(function (response) {
					// 		localStorage.setItem('lowBalance-' + new Date(), JSON.stringify(response.data));
					// 	});
					// }, 1000);
				}
			});
		}
	});
});
