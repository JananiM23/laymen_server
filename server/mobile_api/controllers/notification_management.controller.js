var NotificationModel = require('../../mobile_api/models/notification_management.model');
var mongoose = require('mongoose');


// All Notifications List
exports.All_Notifications_List = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.User || ReceivingData.User === '') {
       res.status(400).send({Http_Code:400, Success: false, Message: "User Details can not be empty" });
    } else {
       ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
       NotificationModel.NotificationSchema.find({ CustomerID: ReceivingData.User,
                           $or: [{ Notification_Type: 'CustomerSample_Approve' },
                                 { Notification_Type: 'CustomerSample_Reject&OnHold' },
                                 { Notification_Type: 'CustomerSubscription_DeActivated' },
                                 { Notification_Type: 'CustomerCreate_Order' },
                                 { Notification_Type: 'CustomerSupportClosed' },
                                 { Notification_Type: 'GeneratePurchase'},                                 
                                 { Notification_Type: 'PurchaseRequestCancelled'},
                                 { Notification_Type: 'DeliveryBoy_Collection' },
                                 { Notification_Type: 'OrderDelivered'},                                 
                                 { Notification_Type: 'OrderUnDelivered'},                                
                                 { Notification_Type: 'Recharge_YourWalletMoney'}
                              ], Active_Status: true, If_Deleted: false }, {}, {sort: {createdAt: -1}})
          .exec(function (err, result) {
             if (err) {
                res.status(417).send({Http_Code:417, Success: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
             } else {
               var Notification_Ids = [];
               result.map(obj => {
                  Notification_Ids.push(obj._id);
               });
               NotificationModel.NotificationSchema.updateMany({ _id: { $in: Notification_Ids } }, { $set: { Message_Received: true } }).exec();
                res.status(200).send({Http_Code:200, Success: true,  Response: result });
             }
          });
    }
 };


 // User Viewed for Notification
exports.Notification_Viewed_Update = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.NotificationID || ReceivingData.NotificationID === '') {
       res.status(400).send({Http_Code:400, Success: false, Message: "Notification Details can not be empty" });
    } else {
       ReceivingData.NotificationID = mongoose.Types.ObjectId(ReceivingData.NotificationID);
       NotificationModel.NotificationSchema.updateOne({ _id: ReceivingData.NotificationID }, { $set: { Message_Viewed: true } })
          .exec(function (err, result) {
             if (err) {
                res.status(417).send({Http_Code:417, Success: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
             } else {               
                res.status(200).send({Http_Code:200, Success: true, Message: 'Notification View Updated' });
             }
          });
    }
 };


 // User Viewed Notifications Delete
exports.Viewed_Notifications_Delete = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.NotificationID || ReceivingData.NotificationID === '') {
       res.status(400).send({Http_Code:400, Success: false, Message: "Notification Details can not be empty" });
    } else {
       ReceivingData.NotificationID = mongoose.Types.ObjectId(ReceivingData.NotificationID);
       NotificationModel.NotificationSchema.updateOne({ _id: ReceivingData.NotificationID, $or:[{Message_Viewed: true}, {Message_Viewed:false}]  }, { $set: { If_Deleted: true } })
          .exec(function (err, result) {
             if (err) {
                res.status(417).send({Http_Code:417, Success: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
             } else {
                res.status(200).send({Http_Code:200, Success: true, Message: 'Viewed Notifications Deleted' });
             }
          });
    }
 };