var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var NotificationSchema = mongoose.Schema({
   User: { type: Schema.Types.ObjectId, ref: 'User' },
   CustomerID: { type: Schema.Types.ObjectId, ref: 'Customer_Management' },
   DeliveryBoyID: {type: Schema.Types.ObjectId, ref: 'DeliveryPerson'},
   Notification_Type: {type: String}, // NewCustomer_Registration, CustomerSample_Pending, CustomerDeliveryline_Assigned, CustomerSample_Approve, CustomerSample_Reject&OnHold,
   // CustomerWaiting_Subscription, CustomerSubscription_Activated, CustomerSubscription_DeActivated, CustomerCreate_Order, CustomerGenerator_Order , CustomerGenerator_Purchase 
  // CustomerSupportCreated , CustomerSupportClosed,CustomerGeneratePurchaseRequest, GeneratePurchase, PurchaseRequestCancelled, DeliveryBoy_Collection, Order_Delay
   Message: { type: String },
   Message_Received: { type : Boolean , required : true },
   Message_Viewed: { type : Boolean , required : true },
   Active_Status: { type : Boolean , required : true },
   If_Deleted: { type : Boolean , required : true },
   },
   { timestamps: true }
);


var VarNotificationDetails = mongoose.model('Notification_Details', NotificationSchema, 'Notification_Details');
var VarNotificationDetailsArchive = mongoose.model('Notification_Details_Archive', NotificationSchema, 'Notification_Details_Archive');

 module.exports = {
   NotificationSchema : VarNotificationDetails,
	NotificationArchiveSchema: VarNotificationDetailsArchive
 };