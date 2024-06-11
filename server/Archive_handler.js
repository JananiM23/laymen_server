var schedule = require('node-schedule');
var OrderManagement =  require('./mobile_api/models/order_management.model');
var NotificationModel = require('./mobile_api/models/notification_management.model');

var weeklyArchiveCronJob = schedule.scheduleJob('0 0 0 * * 0', function() {
	const ordersLimitDate = new Date(new Date().setMonth(new Date().getMonth() - 3));
	const NotificationLimitDate = new Date(new Date().setMonth(new Date().getMonth() - 1));
	OrderManagement.OrderSchema.find({createdAt: {$lte: ordersLimitDate }}).exec((err, result) => {
		if (err) {
			console.log('weeklyCronJob Orders Find Fail');
		} else {
			OrderManagement.OrderArchiveSchema.insertMany(result, (err_1, result_1) => {
				if (err_1) {
					console.log('weeklyCronJob Orders Archive insertMany Fail');
				} else {
					OrderManagement.OrderSchema.deleteMany({createdAt: {$lte: ordersLimitDate }}).exec((err_2, result_2) => {
						if (err_1) {
							console.log('weeklyCronJob Orders deleteMany Fail');
						}
					});
				}
			});
		}
	});
	NotificationModel.NotificationSchema.find({createdAt: {$lte: NotificationLimitDate }}).exec((err, result) => {
		if (err) {
			console.log('weeklyCronJob Notifications Find Fail');
		} else {
			NotificationModel.NotificationArchiveSchema.insertMany(result, (err_1, result_1) => {
				if (err_1) {
					console.log('weeklyCronJob Notification Archive insertMany Fail');
				} else {
					NotificationModel.NotificationSchema.deleteMany({createdAt: {$lte: NotificationLimitDate }}).exec((err_2, result_2) => {
						if (err_1) {
							console.log('weeklyCronJob Notifications deleteMany Fail');
						}
					});
				}
			});
		}
	});
});

module.exports = {
   weeklyCronJob : weeklyArchiveCronJob
};
