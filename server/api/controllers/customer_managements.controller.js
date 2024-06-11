var User_Management = require('../models/user_management.model');
var Customer_Management = require('../../mobile_api/models/customer_management.model');
var Region_Management = require('../../api/models/region_management.model');
var NotificationModel = require('../../mobile_api/models/notification_management.model');
var ProductManagement = require('../../../server/api/models/product_management.model');
// var DeliveryPersonModel = require('../../mobile_api/models/deliveryPerson_details.model');
var CollectionModel = require('../../mobile_api/models/deliveryPerson_details.model');
var VilfreshMoney_management = require('../../mobile_api/models/VilfreshMoney_management.model');
var VilfreshCredit_management = require('../../api/models/VilfreshCredit_management.model');
var DeliveryPerson = require('../../mobile_api/models/deliveryPerson_details.model');
var ReferralManagement = require('../../mobile_api/models/ReferralManagement.model');
var DeliveryLineModel = require('../../api/models/deliveryline.model');
var ReferralPayment = require('./../../Referral_Payment');
var mongoose = require('mongoose');
var CryptoJS = require("crypto-js");
var crypto = require("crypto");
var parser = require('ua-parser-js');
const axios = require('axios');
var moment = require('moment');
var FCM_App = require('../../../Config/fcm_config').CustomerNotify;
const { rejects } = require('assert');

var options = {
   priority: 'high',
   timeToLive: 60 * 60 * 24
};

// User Approve for Customer Sample
exports.CustomerSample_Approve = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.Delivery_Line || ReceivingData.Delivery_Line === '') {
      res.status(400).send({ Status: false, Message: "Delivery Line Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
      .populate({ path: 'Region', select: 'OdooId' })
      .exec(function (err, result) {
         if (err) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
         } else {
            if (result !== null) {
               Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, $or:[{Customer_Status: 'Sample_Pending'},{Customer_Status: 'Sample_OnHold'},{Customer_Status: 'Sample_Rejected'}], Request_Sample_Order: true }, {}, {})
                  .exec(function (err_1, result_1) {
                     if (err_1) {
                        res.status(417).send({ Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err_1 });
                     } else {
                        if (result_1 !== null) {
                           if (result_1.Request_Sample_Order && result_1.Customer_Status === "Sample_Approved") {
                              res.status(200).send({ Status: true, Message: "Someone Already Updated Customer Details" });
                           } else {
                              Customer_Management.CustomerManagementSchema.updateOne({ _id: result_1._id }, { $set: { Delivery_Line: ReceivingData.Delivery_Line, Customer_Status: 'Sample_Approved', IfSample_Order: true, IfApprovedBy_User: true } }).exec(function (err_2, result_2) {
                                 if (err_2) {
                                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err_2 });
                                 } else {
                                    Customer_Management.CustomerManagementSchema.findOne({ _id: result_1._id }, {}, {})
                                    .exec(function (err_3, result_3) {
                                       if (err_3) {
                                          res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: err_3 });
                                       } else {
                                          var Special_Day = [];
                                          var Family_Count = [];
                                          result_3.Special_Date.map(obj => {
                                             Special_Day.push({
                                                'name': obj.Name,
                                                "date": moment(obj.Special_Date).format("DD-MM-YYYY")
                                             });
                                          });
                                          Family_Count.push(
                                             {
                                                "name": 'Male',
                                                "category_count": result_3.Family_Members.Male_Count,
                                             },
                                             {
                                                "name": 'Female',
                                                "category_count": result_3.Family_Members.Female_Count,
                                             },
                                             {
                                                "name": "Children",
                                                "category_count": result_3.Family_Members.Children_Count
                                             },
                                             {
                                                "name": "Infants",
                                                "category_count": result_3.Family_Members.Infants_Count
                                             },
                                             {
                                                "name": "Senior_Citizen",
                                                "category_count": result_3.Family_Members.Senior_Citizen
                                             }
                                          );
                                          axios({
                                             method: 'get', url: 'https://www.vilfresh.in/api/res_partner/create', data: {
                                                params: {
                                                   name: result_3.Customer_Name,
                                                   mobile: result_3.Mobile_Number,
                                                   email: result_3.Email,
                                                   gender: result_3.Gender,
                                                   street: result_3.Address,
                                                   special_date_ids: Special_Day,
                                                   family_ids: Family_Count,
                                                   food_interest: result_3.What_You_Like,
                                                   city: result_3.City,
                                                   lead_odoo_id: result_3.OdooId,
                                                   region_id: result.Region.OdooId
                                                }
                                             }
                                          }).then(function (response) {
                                             result_3.OdooId = response.data.result.customer_id;
                                             result_3.save();
                                             const Notification = new NotificationModel.NotificationSchema({
                                                User: mongoose.Types.ObjectId(result_3.ApprovedBy_User),
                                                CustomerID: result_3._id,
                                                DeliveryBoyID: null,
                                                Notification_Type: 'Sample_Approved',
                                                Message: 'Sample Approved to Customer : ' + result_3.Customer_Name + ', Mobile Number: ' + result_3.Mobile_Number + ', Gender: ' + result_3.Gender,
                                                Message_Received: false,
                                                Message_Viewed: false,
                                                Active_Status: true,
                                                If_Deleted: false
                                             });
                                             Notification.save((err_6, result_6) => {
                                                if (err_6) {
                                                   res.status(417).send({ Status: false, Message: "Some error occurred while Notification system!", Error: err_6 });
                                                } else {
                                                   result_3 = JSON.parse(JSON.stringify(result_3));
                                                   var payload = {
                                                      notification: {
                                                         title: 'Vilfresh-Team',
                                                         body: 'The Sample Request Approved by Our Vilfresh Team on' + moment(new Date()).format("DD/MM/YYYY"),
                                                         sound: 'notify_tone.mp3'
                                                      },
                                                      data: {
                                                         Customer: result_3._id,
                                                         notification_type: 'Your_Sample_Approved',
                                                         click_action: 'FCM_PLUGIN_ACTIVITY',
                                                      }
                                                   };
                                                   FCM_App.messaging().sendToDevice(result_3.Firebase_Token, payload, options).then((NotifyRes) => { });
                                                }
                                             });
                                          }).catch(function (error) {
                                             console.log('Web Odoo Customer Convert Error');
                                          });
                                          res.status(200).send({ Status: true, Message: 'Customer Account has been Activated' });
                                       }
                                    });
                                 }
                              });
                           }
                        } else {
                           res.status(417).send({ Status: false, Message: 'Invalid Customer Details' });
                        }
                     }
                  });
            } else {
               res.status(417).send({ Status: false, Message: 'Invalid User Details' });
            }
         }
      });
   }
};

// User Update for Customer Approval
exports.Customer_Approve_WithLine = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.Delivery_Line || ReceivingData.Delivery_Line === '') {
      res.status(400).send({ Status: false, Message: "Delivery Line can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
      .populate({ path: 'Region', select: 'OdooId' })
      .exec(function (err, result) {
         if (err) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
         } else {
            if (result !== null) {
               Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {})
               .exec(function (err_1, result_1) {
                  if (err_1) {
                     res.status(417).send({ Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err_1 });
                  } else {
                     if (result_1 !== null) {
                           if (ReceivingData.Delivery_Line === null && ReceivingData.Delivery_Line === undefined) {
                           res.status(417).send({ Status: false, Message: 'Your delivery line not assigned' });
                        } else {
                           ReceivingData.Delivery_Line = mongoose.Types.ObjectId(ReceivingData.Delivery_Line);
                           var SampleRes = 'Approved';                                 
                           var Subscription_Activated = result_1.Subscription_Activated;
                           if (result_1.Subscription_Activated === true || result_1.Customer_Status === 'WaitingFor_Subscription') {
                              SampleRes = "Subscription_Activated";
                              Subscription_Activated = true;
                           }
                           Customer_Management.CustomerManagementSchema.updateOne({ _id: result_1._id }, { $set: { Customer_Status: SampleRes, IfApprovedBy_User: true, Subscription_Activated: Subscription_Activated, Delivery_Line: ReceivingData.Delivery_Line } }).exec(function (err_2, result_2) {
                              if (err_2) {
                                 res.status(417).send({ Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err_2 });
                              } else {
                                 Customer_Management.CustomerManagementSchema.findOne({ _id: result_1._id }, {}, {})
                                    .populate({ path: 'Delivery_Line', select: "Deliveryline_Name" }).exec(function (err_3, result_3) {
                                       if (err_3) {
                                          res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: err_3 });
                                       } else {
                                          var Special_Day = [];
                                          var Family_Count = [];
                                          result_3.Special_Date.map(obj => {
                                             Special_Day.push({
                                                'name': obj.Name,
                                                "date": moment(obj.Special_Date).format("DD-MM-YYYY")                                             });
                                          });
                                          Family_Count.push(
                                             {
                                                "name": 'Male',
                                                "category_count": result_3.Family_Members.Male_Count,
                                             },
                                             {
                                                "name": 'Female',
                                                "category_count": result_3.Family_Members.Female_Count,
                                             },
                                             {
                                                "name": "Children",
                                                "category_count": result_3.Family_Members.Children_Count
                                             },
                                             {
                                                "name": "Infants",
                                                "category_count": result_3.Family_Members.Infants_Count
                                             },
                                             {
                                                "name": "Senior_Citizen",
                                                "category_count": result_3.Family_Members.Senior_Citizen
                                             }
                                          );
                                          axios({
                                             method: 'get', url: 'https://www.vilfresh.in/api/res_partner/create', data: {
                                                params: {
                                                   name: result_3.Customer_Name,
                                                   mobile: result_3.Mobile_Number,
                                                   email: result_3.Email,
                                                   gender: result_3.Gender,
                                                   street: result_3.Address,
                                                   special_date_ids: Special_Day,
                                                   family_ids: Family_Count,
                                                   food_interest: result_3.What_You_Like,
                                                   city: result_3.City,
                                                   lead_odoo_id: result_3.OdooId,
                                                   region_id: result.Region.OdooId
                                                }
                                             }
                                          }).then(function (response) {
                                             result_3.OdooId = response.data.result.customer_id;
                                             result_3.save();
                                             var NotifyKey = '';
                                             var NotifyText = '';
                                             if (SampleRes === "Subscription_Activated") {
                                                NotifyKey = 'CustomerSubscription_Activated';
                                                NotifyText = 'Subscription Activated to Customer : ' + result_1.Customer_Name + ', Mobile Number: ' + result_1.Mobile_Number + ', Gender: ' + result_1.Gender;
                                             } else if (SampleRes === "Approved") {
                                                NotifyKey = 'Customer_Activated';
                                                NotifyText = 'Vilfresh team Activated to Customer : ' + result_1.Customer_Name + ', Mobile Number: ' + result_1.Mobile_Number + ', Gender: ' + result_1.Gender;
                                             }
                                             const Notification = new NotificationModel.NotificationSchema({
                                                User: mongoose.Types.ObjectId(result_3.ApprovedBy_User),
                                                CustomerID: result_3._id,
                                                DeliveryBoyID: null,
                                                Notification_Type: NotifyKey,
                                                Message: NotifyText,
                                                Message_Received: false,
                                                Message_Viewed: false,
                                                Active_Status: true,
                                                If_Deleted: false
                                             });
                                             Notification.save((err_6, result_6) => {
                                                if (err_6) {
                                                   res.status(417).send({ Status: false, Message: "Some error occurred while Notification system!", Error: err_6 });
                                                } else {
                                                   result_3 = JSON.parse(JSON.stringify(result_3));
                                                   if (result_3.Firebase_Token && result_3.Firebase_Token !== '' && result_3.Firebase_Token !== null) {
                                                      var pl_body =  'The Customer Request Approved by Our Vilfresh Team on' + moment(new Date()).format("DD/MM/YYYY");
                                                      var pl_type = 'Your_Registration_Approved';
                                                      if (SampleRes === "Subscription_Activated") {
                                                         pl_body = 'Your Subscription Request Approved by Our Vilfresh Team on' + moment(new Date()).format("DD/MM/YYYY");
                                                         pl_type = 'Your_Subscription_Approved';
                                                      }
                                                      var payload = {
                                                         notification: {
                                                            title: 'Vilfresh-Team',
                                                            body: pl_body,
                                                            sound: 'notify_tone.mp3'
                                                         },
                                                         data: {
                                                            Customer: result_3._id,
                                                            notification_type: pl_type,
                                                            click_action: 'FCM_PLUGIN_ACTIVITY',
                                                         }
                                                      };
                                                      FCM_App.messaging().sendToDevice(result_3.Firebase_Token, payload, options).then((NotifyRes) => { });
                                                   }
                                                }
                                             });
                                          }).catch(function (error) {
                                             console.log('Web Odoo Customer Convert Error');
                                          });
                                          res.status(200).send({ Status: true, Message: 'Customer Account has been Activated' });
                                       }
                                    });

                              }
                           });
                        }
                     } else {
                        res.status(417).send({ Status: false, Message: 'Invalid Customer Details' });
                     }
                  }
               });
            } else {
               res.status(417).send({ Status: false, Message: 'Invalid User Details' });
            }
         }
      });
   }
};

//  Customer InActive Status
exports.Customer_DeActivate = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
       res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
       res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
   } else {
       ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
       ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
       User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
           .exec(function (err, result) {
               if (err) {                   
                   res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
               } else {
                   if (result !== null) {
                     Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {})
                           .exec(function (err_1, result_1) {
                               if (err_1) {                                   
                                   res.status(417).send({ Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err });
                               } else {
                                 if (result_1 !== null) {                                   
                                    Customer_Management.CustomerManagementSchema.updateOne({ _id: result_1._id },
                                       {
                                          $set: {
                                             // VilfreshMoney_Limit: 0,
                                             Customer_Status: 'InActivated',
                                             ApprovedBy_User: ReceivingData.User,
                                             ReasonOfDeactivation: ReceivingData.Deactivation_Reason
                                          }
                                       }).exec();
                                       axios({
                                          method: 'get', url: 'https://www.vilfresh.in/api/res_partner/update_active', data: {
                                             params: {
                                                customer_odoo_id: result_1.OdooId,
                                                active: false
                                             }
                                          }
                                       });
                                       res.status(200).send({ Status: true, Message: 'Customer Account has been In-Activated' });
                                 } else {
                                    res.status(417).send({ Status: false, Message: 'Invalid Customer Details' });
                                 }
                               }
                           });
                   } else {
                       res.status(417).send({ Status: false, Message: 'Invalid User Details' });
                   }
               }
           });
   }
};

exports.Customer_ReActivate = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
            } else {
               if (result !== null) {
                  Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId }, {}, {})
                     .exec(function (err_1, result_1) {
                        if (err_1) {
                           res.status(417).send({ Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err_1 });
                        } else {
                           if (result_1 !== null) {
                              var SampleRes = 'Approved';                                 
                              if (result_1.Subscription_Activated === true) {
                                 SampleRes = "Subscription_Activated";
                                 Subscription_Activated = true;
                              } else if (result_1.Request_Sample_Order === true && result_1.Subscription_Activated === false) {
                                 SampleRes = "Sample_Approved";
                              }
                              Customer_Management.CustomerManagementSchema.updateOne({ _id: result_1._id },
                                 {
                                    $set: {
                                       Customer_Status: SampleRes,
                                       ApprovedBy_User: ReceivingData.User,
                                       ReasonOfDeactivation: '',
                                    }
                                 }).exec();
                                 axios({
                                    method: 'get', url: 'https://www.vilfresh.in/api/res_partner/update_active', data: {
                                       params: {
                                          customer_odoo_id: result_1.OdooId,
                                          active: true
                                       }
                                    }
                                 });
                                 res.status(200).send({ Status: true, Message: 'Customer Account has been Activated' });
                           } else {
                              res.status(417).send({ Status: false, Message: 'Invalid Customer Details' });
                           }
                        }
                     });
               } else {
                  res.status(417).send({ Status: false, Message: 'Invalid User Details' });
               }
            }
         });
   }
};

// Customer Details Create From Web
exports.Customer_From_Web = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Mobile_Number || ReceivingData.Mobile_Number === '') {
      res.status(400).send({ Status: false, Message: "Mobile Number can not be empty" });
   } else if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.Delivery_Line || ReceivingData.Delivery_Line === '') {
      res.status(400).send({ Status: false, Message: "Delivery Line can not be empty" });
   } else if (!ReceivingData.Delivery_Line_Queue || ReceivingData.Delivery_Line_Queue === '') {
      res.status(400).send({ Status: false, Message: "Delivery Line Queue can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      ReceivingData.Delivery_Line = mongoose.Types.ObjectId(ReceivingData.Delivery_Line);
      Promise.all([
         Customer_Management.CustomerManagementSchema.findOne({ Mobile_Number: ReceivingData.Mobile_Number, Active_Status: true, If_Deleted: false }).exec(),
         User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {}).populate({ path: 'Region', select: 'OdooId' }).exec(),
         Customer_Management.CustomerManagementSchema.find({ Delivery_Line: ReceivingData.Delivery_Line, Delivery_Line_Queue: { $exists: true, $ne: null } }, {Delivery_Line_Queue: 1}).exec(),
      ]).then(response => {
         var Customer = response[0];
         var User = response[1];
         var Delivery_Queue = response[2];

         if (Customer === null) {
            var SampleReq = null;
            var VarCustomerStatus = null;
            if (ReceivingData.Sample === 'Yes') {
               SampleReq = true;
            } else {
               SampleReq = false;
            }
            
            if (ReceivingData.Morning_Subscription === 'Yes' || ReceivingData.Evening_Subscription === 'Yes') {
               VarCustomerStatus = "Subscription_Activated";
            } else if (ReceivingData.Sample === 'Yes') {
               VarCustomerStatus = "Sample_Approved";
            } else {
               VarCustomerStatus = "Approved";
            }
            var SubscriptionActivated = VarCustomerStatus === "Subscription_Activated" ? true : false;

            const QueueExist = Delivery_Queue.filter(obj => obj.Delivery_Line_Queue === ReceivingData.Delivery_Line_Queue);
            const DeliveryQueueLength = Delivery_Queue.length + 1;
            if (QueueExist.length > 0) {
               var updatingQueue = Delivery_Queue.filter(obj => obj.Delivery_Line_Queue >= ReceivingData.Delivery_Line_Queue);
               updatingQueue.map(obj => {
                  const newQueue = obj.Delivery_Line_Queue + 1;
                  Customer_Management.CustomerManagementSchema.updateOne({_id: obj._id}, {$set: { Delivery_Line_Queue: newQueue }}).exec();
               });
            }
            DeliveryLineModel.Delivery_lineSchema.updateOne({_id: ReceivingData.Delivery_Line}, {$set: {QueueLength: DeliveryQueueLength } }).exec();

            var CustomerRegister = new Customer_Management.CustomerManagementSchema({
               Mobile_Number: ReceivingData.Mobile_Number,
               Customer_Name: ReceivingData.Customer_Name || '',
               Password: '',
               Email: ReceivingData.Email || '',
               Gender: ReceivingData.Gender || '',
               Address: ReceivingData.Address || '',
               Pincode: ReceivingData.Pincode || '',
               City: ReceivingData.City || '',
               Latitude: ReceivingData.Latitude,
               Longitude: ReceivingData.Longitude,
               Special_Date: ReceivingData.Special_Date || [],
               'Family_Members.Male_Count': ReceivingData.Male_Count || '0',
               'Family_Members.Female_Count': ReceivingData.Female_Count || '0',
               'Family_Members.Children_Count': ReceivingData.Children_Count || '0',
               'Family_Members.Infants_Count': ReceivingData.Infants_Count || '0',
               'Family_Members.Senior_Citizen': ReceivingData.Senior_Citizen || '0',
               What_You_Like: ReceivingData.What_You_Like || '',
               File_Name: "",
               Customer_Status: VarCustomerStatus,               
               Subscription_Activated: SubscriptionActivated,
               Morning_Subscription: ReceivingData.Morning_Subscription || 'No',
               Evening_Subscription: ReceivingData.Evening_Subscription || 'No',
               Morning: ReceivingData.Morning || [],
               Evening: ReceivingData.Evening || [],
               Delivery_Line: ReceivingData.Delivery_Line || null,
               Delivery_Line_Queue: ReceivingData.Delivery_Line_Queue || null,
               CompanyId: User.CompanyId,
               OdooId: null,
               Region: User.Region._id,
               Request_Sample_Order: SampleReq,
               Choose_The_Sample_Date: ReceivingData.Choose_The_Sample_Date || null,
               Choose_The_Session: ReceivingData.Choose_The_Session || '',
               Mobile_Number_Verified: false,
               Mobile_OTP_Session: null,
               Mobile_OTP: 0,
               VilfreshMoney_Limit: 0,
               VilfreshCredit_Limit: 0,
               AvailableCredit_Limit: 0,
               ApprovedBy_User: ReceivingData.User || null,
               Firebase_Token: "",
               Device_Id: "",
               Device_Type: "",
               Register_From: "Web",
               IfSample_Order: false,
               QA_Analytics: [],
               IfApprovedBy_User: true,
               Delivery_Person_QA: null,
               Active_Status: true,
               If_Deleted: false,
            });
            CustomerRegister.save((err_1, result_1) => {
               if (err_1) {
                  res.status(417).send({ Status: false, Message: "Some error occurred while Validate Update the Customer Details!", Error: err_1 });
               } else {
                  res.status(200).send({ Status: true, Message: 'Registration Successfully' });
                  // Odoo Update
                  axios({
                     method: 'get', url: 'https://www.vilfresh.in/api/crm_lead/create', data: {
                        params: {
                           mobile: result_1.Mobile_Number,
                           name: result_1.Customer_Name,
                           email_from: result_1.Email,
                           street: result_1.Address,
                           company_id: result_1.CompanyId,
                           region_id: User.Region.OdooId
                        }
                     }
                  }).then(function (response) {
                     result_1.OdooId = response.data.result.lead_id;
                     result_1.save(result_1);
                     var Special_Day = [];
                     var Family_Count = [];
                     result_1.Special_Date.map(obj => {
                        Special_Day.push({
                           'name': obj.Name,
                           "date": moment(obj.Special_Date).format("DD-MM-YYYY")
                        });
                     });
                     Family_Count.push(
                        {
                           "name": 'Male',
                           "category_count": result.Family_Members.Male_Count,
                        },
                        {
                           "name": 'Female',
                           "category_count": result.Family_Members.Female_Count,
                        },
                        {
                           "name": "Children",
                           "category_count": result.Family_Members.Children_Count
                        },
                        {
                           "name": "Infants",
                           "category_count": result.Family_Members.Infants_Count
                        },
                        {
                           "name": "Senior_Citizen",
                           "category_count": result.Family_Members.Senior_Citizen
                        }
                     );
                     axios({
                        method: 'get', url: 'https://www.vilfresh.in/api/res_partner/create', data: {
                           params: {
                              name: result_1.Customer_Name,
                              mobile: result_1.Mobile_Number,
                              email: result_1.Email,
                              gender: result_1.Gender,
                              street: result_1.Address,
                              special_date_ids: Special_Day,
                              family_ids: Family_Count,
                              food_interest: result_1.What_You_Like,
                              city: result_1.City,
                              lead_odoo_id: result_1.OdooId,
                              region_id: User.Region.OdooId
                           }
                        }
                     }).then(function (response) {
                        result_1.OdooId = response.data.result.customer_id;
                        result_1.save();
                        if (VarCustomerStatus === "Subscription_Activated" || VarCustomerStatus === "Sample_Approved") {
                           var NotifyKey = '';
                           var NotifyText = '';
                           if (VarCustomerStatus === "Subscription_Activated") {
                              NotifyKey = 'CustomerSubscription_Activated';
                              NotifyText = 'Subscription Activated to Customer : ' + result_1.Customer_Name + ', Mobile Number: ' + result_1.Mobile_Number + ', Gender: ' + result_1.Gender;
                           } else if (VarCustomerStatus === "Sample_Approved") {
                              NotifyKey = 'CustomerSample_Approve';
                              NotifyText = 'Sample Approved to Customer : ' + result_1.Customer_Name + ', Mobile Number: ' + result_1.Mobile_Number + ', Gender: ' + result_1.Gender;
                           }
                           const Notification = new NotificationModel.NotificationSchema({
                              User: mongoose.Types.ObjectId(result_1.ApprovedBy_User),
                              CustomerID: result_1._id,
                              DeliveryBoyID: null,
                              Notification_Type: NotifyKey,
                              Message: NotifyText,
                              Message_Received: false,
                              Message_Viewed: false,
                              Active_Status: true,
                              If_Deleted: false
                           });
                           Notification.save();
                        }
                     }).catch(function (error) {
                        console.log('Web Odoo Customer Convert Error');
                     });
                  }).catch(function (error) {
                     console.log('Web Odoo Lead Create Error');
                  });
               }
            });
         } else {
            res.status(200).send({ Status: false, Message: 'This Mobile Number Already Registered' });
         }
      }).catch(error => {
         res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: error });
      });
   }

};

// All Customers List
exports.All_Customers_List = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {}, function (err, result) {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the User Management!.", Error: err });
         } else {
            if (result !== null) {
               const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
               const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
               var ShortOrder = { createdAt: -1, _id: 1};
               var ShortKey = ReceivingData.ShortKey;
               var ShortCondition = ReceivingData.ShortCondition;
               if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                  ShortOrder = {};
                  ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                  ShortOrder._id = 1;
               }
               var FindQuery = { 'If_Deleted': false, 'Region': result.Region };
               if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                  ReceivingData.FilterQuery.map(obj => {
                     if (obj.Type === 'String') {
                        FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                     }
                     if (obj.Type === 'Select') {
                        FindQuery[obj.DBName] = obj.Value;
                     }
                     if (obj.Type === 'Date') {
                        if (FindQuery[obj.DBName] === undefined) {
                           FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                        } else {
                           const DBName = obj.DBName;
                           const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                           FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                        }
                     }
                     if (obj.Type === 'Object') {
                        FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
                     }
                  });
               }
               Promise.all([
                  Customer_Management.CustomerManagementSchema
                     .aggregate([
                        { $match: FindQuery },
                        {
                           $lookup: {
                              from: "Delivery_Line",
                              let: { "deliveryLine": "$Delivery_Line" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$deliveryLine", "$_id"] } } },
                                 { $project: { "Deliveryline_Name": 1 } }
                              ],
                              as: 'Delivery_Line'
                           }
                        },
                        { $unwind: { path: "$Delivery_Line", preserveNullAndEmptyArrays: true } },
								{ $addFields: { Credit_Amount: { $subtract: [ "$AvailableCredit_Limit", "$VilfreshCredit_Limit"] } }},
								{ $addFields: { Wallet_Amount: { $sum: [ "$VilfreshMoney_Limit", "$Credit_Amount"] } } },
                        { $addFields: { Delivery_LineSort: { $ifNull: ["$Delivery_Line.Deliveryline_Name", null] } } },
                        { $addFields: { Mobile_NumberSort: { $ifNull: ["$Mobile_NumberSort", null] } } },
                        { $addFields: { Delivery_LineSort: { $toLower: "$Delivery_LineSort" } } },
                        { $addFields: { Customer_StatusSort: { $toLower: "$Customer_StatusSort" } } },
                        { $addFields: { GenderSort: { $toLower: "$GenderSort" } } },
                        { $addFields: { Customer_NameSort: { $toLower: "$Customer_NameSort" } } },
                        { $addFields: { EmailSort: { $toLower: "$EmailSort" } } },
                        { $project: { Customer_Name: 1, Mobile_Number: 1, Pincode: 1, Gender: 1, Wallet_Amount: 1, VilfreshMoney_Limit: 1, Delivery_LineSort: 1, VilfreshCredit_Limit: 1, AvailableCredit_Limit: 1, Email: 1, Delivery_Line: 1, Delivery_Line_Queue: 1, Active_Status: 1, If_Deleted: 1, createdAt: 1, Customer_Status: 1, updatedAt: 1 } },
                        { $sort: ShortOrder },
                        { $skip: Skip_Count },
                        { $limit: Limit_Count }
                     ]).exec(),
                  Customer_Management.CustomerManagementSchema.countDocuments(FindQuery).exec()
               ]).then(result => {
                  var ReturnResult = result[0]; 
                  ReturnResult = JSON.parse(JSON.stringify(ReturnResult));
                  if (ShortKey === 'Delivery_LineSort') {
                     const LinesByOrder = [];
                     ReturnResult.map(Obj => {
                        const Idx = LinesByOrder.findIndex(objOne => objOne === JSON.stringify(Obj.Delivery_Line));
                        if (Idx === -1) {
                           LinesByOrder.push(JSON.stringify(Obj.Delivery_Line));
                        }
                     });
                     const ArrOfArr = [];
                     LinesByOrder.map(Obj => {
                        const Arr = ReturnResult.filter(objOne => JSON.stringify(objOne.Delivery_Line) === Obj);
                        var sortArr = [];
                        var UnQueue = Arr.filter(obj => !obj.Delivery_Line_Queue || obj.Delivery_Line_Queue === undefined || obj.Delivery_Line_Queue === null);
                        var Queue = Arr.filter(obj => typeof obj.Delivery_Line_Queue === 'number' && obj.Delivery_Line_Queue > 0 );
                        if (ShortCondition === 'Ascending') {
                           sortArr = Queue.sort((a, b) => parseFloat(a.Delivery_Line_Queue) - parseFloat(b.Delivery_Line_Queue));
                        } else {
                           sortArr = Queue.sort((a, b) => parseFloat(b.Delivery_Line_Queue) - parseFloat(a.Delivery_Line_Queue));
                        }
                        var CompArr = sortArr.concat(UnQueue);
                        ArrOfArr.push(CompArr);
                     });
                     ReturnResult = [];
                     ArrOfArr.map(Obj => {
                        ReturnResult = ReturnResult.concat(Obj);
                     });
                  }
                  res.status(200).send({ Status: true, Response: ReturnResult, SubResponse: result[1] });
               }).catch(err => {
                  res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
               });

            } else {
               res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
            }
         }
      });
   }

};


exports.SimpleCustomer_List = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, { Region: 1 }, {}).exec((err_1, result_1) => {
         if (err_1) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find the the User!.", Error: err_1 });
         } else {
            Customer_Management.CustomerManagementSchema
               .find({ Region: result_1.Region, Active_Status: true, If_Deleted: false }, { Customer_Name: 1, Mobile_Number: 1 }, { sort: { createdAt: -1 } })
               .exec((err, result) => {
                  if (err) {
                     res.status(417).send({ Status: false, Message: "Some error occurred while Find the Customer Name !.", Error: err });
                  } else {
                     result = result.sort(function (Obj1, Obj2) {
                        return Obj1.Customer_Name.localeCompare(Obj2.Customer_Name);
                     });
                     res.status(200).send({ Http_Code: 200, Status: true, Response: result });
                  }
               });
         }
      });
   }
};


// Customer Details Edit
exports.CustomerDetails_Edit = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(417).send({ Status: false, Message: "Customer Details can not be empty" });
   } else {
      Customer_Management.CustomerManagementSchema.findOne({
         _id: mongoose.Types.ObjectId(ReceivingData.CustomerId),
         Active_Status: true,
         If_Deleted: false,
      }, {}, {}).populate({ path: 'Morning.ProductId', select: 'Type' }).
         populate({ path: 'Evening.ProductId', select: 'Type' }).exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find the Customer Details!.", Error: err });
            } else {
               if (result !== null) {
                  res.status(200).send({ Status: true, Response: result });
               } else {
                  res.status(400).send({ Status: false, Message: "Invalid Customer Details!" });
               }
            }
         });
   }
};

// Customer Details Update
exports.CustomerDetails_Update = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.Delivery_Line || ReceivingData.Delivery_Line === '') {
      res.status(400).send({ Status: false, Message: "Delivery Line can not be empty" });
   } else if (!ReceivingData.Delivery_Line_Queue || ReceivingData.Delivery_Line_Queue === '') {
      res.status(400).send({ Status: false, Message: "Delivery Line Queue can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      ReceivingData.Delivery_Line = mongoose.Types.ObjectId(ReceivingData.Delivery_Line);
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Customer_Management.CustomerManagementSchema.findOne({ "_id": ReceivingData.CustomerId }, {}, {})
      .exec((err, result_1) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while find the Customer Details!", Error: err });
         } else {
            if (result_1 !== null) {
               Promise.all([
                  Customer_Management.CustomerManagementSchema.find({ Delivery_Line: result_1.Delivery_Line, Delivery_Line_Queue: { $exists: true, $ne: null } }, {Delivery_Line_Queue: 1}, {sort: {Delivery_Line_Queue: 1}}).exec(),
                  Customer_Management.CustomerManagementSchema.find({ Delivery_Line: ReceivingData.Delivery_Line, Delivery_Line_Queue: { $exists: true, $ne: null } }, {Delivery_Line_Queue: 1}, {sort: {Delivery_Line_Queue: 1}}).exec(),
                  Customer_Management.CustomerManagementSchema.findOne({ Mobile_Number: ReceivingData.Mobile_Number }, {}, {}).exec()
               ]).then( result => {
                  var Delivery_Queue_Old = result[0];
                  var Delivery_Queue_New = result[1];
                  var MobileNumber_Data = result[2];
                  if (result_1.Mobile_Number === ReceivingData.Mobile_Number || MobileNumber_Data === null ) {
                     var Line_Changed = JSON.parse(JSON.stringify(ReceivingData.Delivery_Line)) !== JSON.parse(JSON.stringify(result_1.Delivery_Line)) ? true : false;
                     var PerviousQueueValid =  (result_1.Delivery_Line_Queue === undefined || result_1.Delivery_Line_Queue === null || result_1.Delivery_Line_Queue === '' || result_1.Delivery_Line_Queue === 0) ? false : true;
                     var QueueStatus = PerviousQueueValid !== true ? 'Adding' : result_1.Delivery_Line_Queue !== ReceivingData.Delivery_Line_Queue ? 'Changed' : 'NoChanges';
                     if (QueueStatus !== 'NoChanges' || Line_Changed === true ) {
                        if (PerviousQueueValid === true && Line_Changed === true) {
                           const OldDeliveryLineQueueLength = Delivery_Queue_Old.length - 1;
                           if (QueueStatus === 'Changed') {
                              var oldQueue = Delivery_Queue_Old.filter(obj => obj.Delivery_Line_Queue >= result_1.Delivery_Line_Queue);
                              oldQueue.map(obj => {
                                 const newQueue = obj.Delivery_Line_Queue - 1;
                                 Customer_Management.CustomerManagementSchema.updateOne({_id: obj._id}, {$set: { Delivery_Line_Queue: newQueue }}).exec();
                              });
                           }
                           DeliveryLineModel.Delivery_lineSchema.updateOne({_id: result_1.Delivery_Line}, {$set: {QueueLength: OldDeliveryLineQueueLength } }).exec();
                        }
                        if (Line_Changed === true || QueueStatus === 'Adding') {
                           const NewDeliveryLineQueueLength = Delivery_Queue_New.length + 1;
                           if (NewDeliveryLineQueueLength > ReceivingData.Delivery_Line_Queue) {
                              var newQueue = Delivery_Queue_New.filter(obj => obj.Delivery_Line_Queue >= ReceivingData.Delivery_Line_Queue);
                              newQueue.map(obj => {
                                 const newQueue = obj.Delivery_Line_Queue + 1;
                                 Customer_Management.CustomerManagementSchema.updateOne({_id: obj._id}, {$set: { Delivery_Line_Queue: newQueue }}).exec();
                              });
                           }
                           DeliveryLineModel.Delivery_lineSchema.updateOne({_id: ReceivingData.Delivery_Line}, {$set: {QueueLength: NewDeliveryLineQueueLength } }).exec();
                        }
                        if (Line_Changed === false && QueueStatus === 'Changed') {
                           var ChangeMode = 'Inc';
                           var UpdatingQueue = [];
                           if (ReceivingData.Delivery_Line_Queue > result_1.Delivery_Line_Queue) {
                              ChangeMode = 'Dec';
                              UpdatingQueue = Delivery_Queue_Old.filter(obj => obj.Delivery_Line_Queue > result_1.Delivery_Line_Queue && obj.Delivery_Line_Queue <= ReceivingData.Delivery_Line_Queue );
                           } else {
                              UpdatingQueue = Delivery_Queue_Old.filter(obj => obj.Delivery_Line_Queue >= ReceivingData.Delivery_Line_Queue && obj.Delivery_Line_Queue < result_1.Delivery_Line_Queue );
                           }
                           UpdatingQueue.map(obj => {
                              const newQueue = ChangeMode === 'Inc' ? obj.Delivery_Line_Queue + 1 : obj.Delivery_Line_Queue - 1;
                              Customer_Management.CustomerManagementSchema.updateOne({_id: obj._id}, {$set: { Delivery_Line_Queue: newQueue }}).exec();
                           });
                        }
                     }
            
                     var SampleReq = result_1.Request_Sample_Order;
                     var VarCustomerStatus = result_1.Customer_Status;
         
                     if (ReceivingData.Sample === 'Yes' && result_1.Request_Sample_Order === false ) {
                        SampleReq = true;
                     } else if (ReceivingData.Sample === 'No' && result_1.Request_Sample_Order === true) {
                        SampleReq = false;
                     }
         
         
                     if ((ReceivingData.Morning_Subscription === 'Yes' || ReceivingData.Evening_Subscription === 'Yes') && result_1.Subscription_Activated === false && result_1.IfApprovedBy_User === true) {
                        VarCustomerStatus = "Subscription_Activated";
                     } else if (ReceivingData.Sample === 'Yes' && result_1.Request_Sample_Order === false && result_1.Subscription_Activated === false && result_1.IfApprovedBy_User === true ) {
                        VarCustomerStatus = "Sample_Approved";
                     } else {
                        VarCustomerStatus = VarCustomerStatus;
                     }
         
         
                     if ((ReceivingData.Morning_Subscription === 'No' && ReceivingData.Evening_Subscription === 'No') && result_1.Subscription_Activated === true) {
                        if (SampleReq === true) {
                           VarCustomerStatus = "Sample_Approved";
                        } else {
                           VarCustomerStatus = "Approved";
                        }
                     }
         
                     if (VarCustomerStatus === "Sample_Approved" && SampleReq === false) {
                        VarCustomerStatus = "Approved";
                     }
         
                     var SubscriptionActivated = VarCustomerStatus === "Subscription_Activated" ? true : false;
         
                     result_1.Mobile_Number = ReceivingData.Mobile_Number;
                     result_1.Customer_Name = ReceivingData.Customer_Name || '';
                     result_1.Email = ReceivingData.Email || '';
                     result_1.Gender = ReceivingData.Gender || '';
                     result_1.Address = ReceivingData.Address || '';
                     result_1.Pincode = ReceivingData.Pincode || '';
                     result_1.City = ReceivingData.City || '';
                     result_1.Latitude = ReceivingData.Latitude;
                     result_1.Longitude = ReceivingData.Longitude;
                     result_1.Special_Date = ReceivingData.Special_Date || [];
                     result_1.Family_Members.Male_Count = ReceivingData.Male_Count || '0';
                     result_1.Family_Members.Female_Count = ReceivingData.Female_Count || '0';
                     result_1.Family_Members.Children_Count = ReceivingData.Children_Count || '0';
                     result_1.Family_Members.Infants_Count = ReceivingData.Infants_Count || '0';
                     result_1.Family_Members.Senior_Citizen = ReceivingData.Senior_Citizen || '0';
                     result_1.What_You_Like = ReceivingData.What_You_Like || '';
                     result_1.Customer_Status = VarCustomerStatus;
                     result_1.Subscription_Activated = SubscriptionActivated;
                     result_1.Morning_Subscription = ReceivingData.Morning_Subscription || 'No';
                     result_1.Evening_Subscription = ReceivingData.Evening_Subscription || 'No';
                     result_1.Morning = ReceivingData.Morning || [];
                     result_1.Evening = ReceivingData.Evening || [];
                     result_1.Delivery_Line = ReceivingData.Delivery_Line || null;
                     result_1.Delivery_Line_Queue = ReceivingData.Delivery_Line_Queue || null;
                     result_1.Request_Sample_Order = SampleReq;
                     result_1.Choose_The_Sample_Date = ReceivingData.Choose_The_Sample_Date || null;
                     result_1.Choose_The_Session = ReceivingData.Choose_The_Session || '';
                     result_1.ApprovedBy_User = ReceivingData.User || null;
         
         
                     Promise.all([
                        result_1.save(),
                        Region_Management.RegionManagementSchema.findOne({ _id: result_1.Region, Active_Status: true, If_Deleted: false }, {}, {}).exec()
                     ]).then(response => {
                        if ( result_1.Customer_Status === 'Approved' || result_1.Customer_Status === 'Sample_Approved' || result_1.Customer_Status === 'Subscription_Activated' || result_1.Customer_Status === 'InActivated' ) {
                           var RegionData = response[1];
                           var Special_Day = [];
                           var Family_Count = [];
                           ReceivingData.Special_Date.map(obj => {
                              Special_Day.push({
                                 'name': obj.Name,
                                 "date": moment(obj.Special_Date).format("DD-MM-YYYY")
                              });
                           });
                           Family_Count.push(
                              {
                                 "name": 'Male',
                                 "category_count": ReceivingData.Male_Count,
                              },
                              {
                                 "name": 'Female',
                                 "category_count": ReceivingData.Female_Count,
                              },
                              {
                                 "name": "Children",
                                 "category_count": ReceivingData.Children_Count
                              },
                              {
                                 "name": "Infants",
                                 "category_count": ReceivingData.Infants_Count
                              },
                              {
                                 "name": "Senior_Citizen",
                                 "category_count": ReceivingData.Senior_Citizen
                              }
                           );
                           axios({
                              method: 'get', url: 'https://www.vilfresh.in/api/res_partner/update', data: {
                                 params: {
                                    name: ReceivingData.Customer_Name,
                                    mobile: ReceivingData.Mobile_Number,
                                    email: ReceivingData.Email,
                                    gender: ReceivingData.Gender,
                                    street: ReceivingData.Address,
                                    special_date_ids: Special_Day,
                                    family_ids: Family_Count,
                                    food_interest: ReceivingData.What_You_Like,
                                    city: result_1.City || '',
                                    customer_odoo_id: result_1.OdooId,
                                    region_id: RegionData.OdooId
                                 }
                              }
                           }).then(function (response_1) {
                           }).catch(function (error) {
                              console.log('Odoo Customer details Updated Error');
                           });
                        } else {
                           axios({
                              method: 'get', url: 'https://www.vilfresh.in/api/crm_lead/update', data: {
                                 params: {
                                    lead_odoo_id: result_1.OdooId,
                                    mobile: ReceivingData.Mobile_Number,
                                    name: ReceivingData.Customer_Name,
                                    email_from: ReceivingData.Email,
                                    street: ReceivingData.Address
                                 }
                              }
                           }).then(function (response) {
                           }).catch(function (error) {
                              console.log('Odoo Lead details Updated Error');
                           });
                        }
                        res.status(200).send({ Http_Code: 200, Status: true, Message: "Customer Details SuccessFully Updated" });
                     }).catch(error => {
                        res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Update the Customer Details!", Error: error });
                     });
                  } else {
                     res.status(400).send({ Status: false, Message: "The Mobile Number Already Exists" });
                  }
               }).catch( error => {
                  res.status(417).send({ Status: false, Message: "Some error occurred while Find the Customer Details!.", Error: err_1 });
               });
            } else {
               res.status(400).send({ Status: false, Message: "Customer Details Invalid!" });
            }
         }
      });
   }
};


exports.CustomerSample_Reject = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
            } else {
               if (result !== null) {
                  Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId }, {}, {})
                     .exec(function (err_1, result_1) {
                        if (err_1) {
                           res.status(417).send({ Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err_1 });
                        } else {
                           if (result_1 !== null) {
                              Customer_Management.CustomerManagementSchema.updateOne({ _id: result_1._id },
                                 {
                                    $set: {
                                       Customer_Status: ReceivingData.Customer_Status,
                                       IfApprovedBy_User: false,
                                       ApprovedBy_User: ReceivingData.User,
                                    }
                                 }).exec();
                              axios({
                                 method: 'get', url: 'https://www.vilfresh.in/api/crm_lead/update', data: {
                                    params: {
                                       lead_odoo_id: result_1.OdooId,
                                       description: 'The Request has beed Hold/Rejected by Our Vilfresh Team on ' + moment(new Date()).format("DD/MM/YYYY"),
                                       active: result_1.Active_Status
                                    }
                                 }
                              }).then(function (response) {
                                 const Notification = new NotificationModel.NotificationSchema({
                                    User: mongoose.Types.ObjectId(result_1.ApprovedBy_User),
                                    CustomerID: result_1._id,
                                    DeliveryBoyID: null,
                                    Notification_Type: 'CustomerSample_Reject&OnHold',
                                    Message: 'Sample Reject or OnHold to Customer : ' + result_1.Customer_Name + ', Mobile Number: ' + result_1.Mobile_Number + ', Gender: ' + result_1.Gender,
                                    Message_Received: false,
                                    Message_Viewed: false,
                                    Active_Status: true,
                                    If_Deleted: false
                                 });
                                 Notification.save();
                              }).catch(function (error) {
                                 console.log('Web Odoo Lead Create opportunity Error');
                              });

                              result_1 = JSON.parse(JSON.stringify(result_1));

                              var payload = {
                                 notification: {
                                    title: 'Vilfresh-Team',
                                    body: 'Your Sample Reject or OnHold to by Our Vilfresh Team on' + moment(new Date()).format("DD/MM/YYYY"),
                                    sound: 'notify_tone.mp3'
                                 },
                                 data: {
                                    Customer: result_1._id,
                                    notification_type: 'CustomerSample_Reject&OnHold',
                                    click_action: 'FCM_PLUGIN_ACTIVITY',
                                 }
                              };
                              FCM_App.messaging().sendToDevice(result_1.Firebase_Token, payload, options).then((NotifyRes) => { });
                              res.status(200).send({ Status: true, Message: 'Customer Sample Request has been Rejected' });
                           } else {
                              res.status(417).send({ Status: false, Message: 'Invalid Customer Details' });
                           }
                        }
                     });
               } else {
                  res.status(417).send({ Status: false, Message: 'Invalid User Details' });
               }
            }
         });
   }
};


// Customer  single view
exports.Customer_view = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(417).send({ Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId }, {}, {})
         .populate({ path: 'Delivery_Line', select: ['Deliveryline_Name', 'QueueLength'] }).
         populate({ path: 'Morning.ProductId', select: 'Type' }).
         populate({ path: 'Evening.ProductId', select: 'Type' })
         .populate({ path: 'Delivery_Person_QA', select: 'DeliveryPerson_Name' })
         .populate({ path: 'QA_Analytics.Question', select: ['Question', 'Answer' ] })         
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: err });
            } else {
               result = JSON.parse(JSON.stringify(result));
               if (result.QA_Analytics.length > 0) {
                  result.QA_Analytics = result.QA_Analytics.map(newObj => {
                     var Qus = '';
                     var Ans = '';
                     
                     if (newObj.Question !== null && newObj.Answer !== null ) {
                                                
                        var AnsArr = newObj.Question.Answer;
                        var SelArr = AnsArr.filter(obj => obj._id === newObj.Answer);
                        
                        Qus = newObj.Question.Question;
                        if (SelArr.length > 0) {
                           Ans = SelArr[0].Answer;
                        }
                     }
                     delete newObj.Question;
                     delete newObj.Answer;
                     newObj.Question = Qus;
                     newObj.Answer = Ans;

                     return newObj;
                  });
               }
               
               
               if (result.Request_Sample_Order === true) {
                  result.Sample = 'Yes';
               } else {
                  result.Sample = 'No';
               }
               res.status(200).send({ Status: true, Response: result });
            }
         });
   }
};


//  Customer List Based on Delivery Line
exports.FilteredCustomer_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Delivery_Line || ReceivingData.Delivery_Line === '') {
      res.status(417).send({ Status: false, Message: "Delivery Line Details can not be empty" });
   } else {
      ReceivingData.Delivery_Line = mongoose.Types.ObjectId(ReceivingData.Delivery_Line);
      Customer_Management.CustomerManagementSchema.find({ Delivery_Line: ReceivingData.Delivery_Line }, { Customer_Name: 1 }, { 'short': { createdAt: 1 } }).exec(function (err, result) {
         if (err) {
            res.status(417).send({ status: false, ErrorCode: 417, Message: "Some error occurred!.", Error: err });
         } else {
            result = result.sort(function (Obj1, Obj2) {
               return Obj1.Customer_Name.localeCompare(Obj2.Customer_Name);
            });
            res.status(200).send({ Status: true, Response: result });
         }
      });
   }
};


exports.FilteredCustomer_List = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Delivery_Line || ReceivingData.Delivery_Line === '') {
      res.status(417).send({ Status: false, Message: "Delivery Line Details can not be empty" });
   } else if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, { Region: 1 }, {}).exec((err_1, result_1) => {
         if (err_1) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find the the User!.", Error: err_1 });
         } else {
            ReceivingData.Delivery_Line = mongoose.Types.ObjectId(ReceivingData.Delivery_Line);
            Customer_Management.CustomerManagementSchema
               .find({ Region: result_1.Region, Active_Status: true, If_Deleted: false, Delivery_Line: ReceivingData.Delivery_Line }, { Customer_Name: 1 }, { sort: { createdAt: -1 } })
               .exec((err, result) => {
                  if (err) {
                     res.status(417).send({ Status: false, Message: "Some error occurred while Find the Customer Name !.", Error: err });
                  } else {
                     res.status(200).send({ Http_Code: 200, Status: true, Response: result });
                  }
               });
         }
      });
   }
};

// All Customers transaction history
exports.All_Customers_Transaction_History = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {}, function (err, result) {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the User Management!.", Error: err });
         } else {
            if (result !== null) {
               const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
               const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
               var ShortOrder = { createdAt: -1, _id: 1};
               var ShortKey = ReceivingData.ShortKey;
               var ShortCondition = ReceivingData.ShortCondition;
               if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                  ShortOrder = {};
                  ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                  ShortOrder._id = 1;
               }
               var FindQuery = {
                  'If_Deleted': false,
                  'Region': result.Region
               };
               if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                  ReceivingData.FilterQuery.map(obj => {
                     if (obj.Type === 'String') {
                        FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                     }
                     if (obj.Type === 'Select') {
                        FindQuery[obj.DBName] = obj.Value;
                     }
                     if (obj.Type === 'Number') {

                        if (FindQuery[obj.DBName] === undefined) {
                           FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: parseFloat(obj.Value) } : obj.Option === 'GTE' ? { $gte: parseFloat(obj.Value) } : parseFloat(obj.Value);
                        } else {
                           const DBName = obj.DBName;
                           const AndQuery = obj.Option === 'LTE' ? { $lt: parseFloat(obj.Value) } : obj.Option === 'GTE' ? { $gte: parseFloat(obj.Value) } : parseFloat(obj.Value);
                           FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                        }
                        // FindQuery[obj.DBName] = obj.Value;
                     }
                     if (obj.Type === 'Date') {
                        if (FindQuery[obj.DBName] === undefined) {
                           FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                        } else {
                           const DBName = obj.DBName;
                           const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                           FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                        }
                     }
                     if (obj.Type === 'Object') {
                        FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
                     }
                  });
               }
               Promise.all([
                  Customer_Management.CustomerManagementSchema
                     .aggregate([
                        { $match: FindQuery },
                        {
                           $lookup: {
                              from: "Delivery_Line",
                              let: { "deliveryline": "$Delivery_Line" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$deliveryline", "$_id"] } } },
                                 { $project: { "Deliveryline_Name": 1 } }
                              ],
                              as: 'Delivery_Line'
                           }
                        },
                        { $unwind: { path: "$Delivery_Line", preserveNullAndEmptyArrays: true } },
                        { $addFields: { DeliverylineNameSort: { $ifNull: ["$Delivery_Line.Deliveryline_Name", null] } } },
                        { $addFields: { Mobile_Number: { $ifNull: ["$Mobile_Number", null] } } },
                        { $addFields: { Customer_Name: { $toLower: "$Customer_Name" } } },
                        { $project: { Customer_Name: 1, Mobile_Number: 1, Delivery_Line: 1, DeliverylineNameSort: 1, VilfreshCredit_Limit: 1, VilfreshMoney_Limit: 1, AvailableCredit_Limit: 1, Active_Status: 1, If_Deleted: 1, createdAt: 1, Customer_Status: 1, updatedAt: 1 } },
                        { $sort: ShortOrder },
                        { $skip: Skip_Count },
                        { $limit: Limit_Count }
                     ]).exec(),
                  Customer_Management.CustomerManagementSchema.countDocuments(FindQuery).exec()
               ]).then(result => {
                  res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
               }).catch(err => {
                  res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
               });

            } else {
               res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
            }
         }
      });
   }

};


// Dynamic Changed Milk Product ------------------------
exports.MilkProduct_Subscription = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "User can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {} )
         .exec( (err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 400, Status: false, Message: "Some Error Occurred for find User Details!" });
         } else {
            if (result !== null) {
               ProductManagement.ProductManagementSchema.find({ CompanyId: result.CompanyId,  Milk_YesOrNo: true, Active_Status: true, If_Deleted: false }, {}, {})
               .exec( (err_1, result_1) => {
                  if (err_1) {
                     res.status(417).send({ Http_Code: 400, Status: false, Message: "Some Error Occurred for find Product Details!" });
                  } else {
                     if (result_1.length !== 0) {
                        var Morning = [];
                        var Evening = [];
                        result_1.map(obj => {
                           Morning.push({
                              "Product_Name": obj.Product_Name,
                              "Type": obj.Type,
                              "ProductId": obj._id,
                              "Price": obj.Price,
                              "BasicUnitQuantity": obj.BasicUnitQuantity
                           });
                           Evening.push({
                              "Product_Name": obj.Product_Name,
                              "Type": obj.Type,
                              "ProductId": obj._id,
                              "Price": obj.Price,
                              "BasicUnitQuantity": obj.BasicUnitQuantity
                           });
                        });
                        res.status(200).send({ Http_Code: 200, Status: true, Message: "Subscription Details!", Morning: Morning, Evening: Evening });
                     } else {
                        res.status(417).send({ Http_Code: 400, Status: false, Message: "Product Details is Empty!" });
                     }
                  }
               });
            } else {
               res.status(417).send({ Http_Code: 400, Status: false, Message: "Invalid User Details!" });
            }
         }
      });
   }
};


exports.Analytic_Register = function (req, res) {
   var ReceivingData = req.body;
   ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
   ReceivingData.Region = mongoose.Types.ObjectId(ReceivingData.Region);

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.Question || ReceivingData.Question === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Question can not be empty" });
   } else {
      Promise.all([
         Customer_Management.QAManagementSchema.findOne({ Question: ReceivingData.Question, Region: ReceivingData.Region, Active_Status: true, If_Deleted: false }).exec(),
         User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }).exec()
      ]).then(response => {
         var QAData = response[0];
         var UserData = response[1];
         if (QAData === null && UserData !== null) {
            var QARegister = new Customer_Management.QAManagementSchema({
               Question: ReceivingData.Question || '',
               Answer: ReceivingData.Answer || [],
               Added_By_User: ReceivingData.User,
               Region: ReceivingData.Region,
               Active_Status: true,
               If_Deleted: false,
            });
            QARegister.save((err_1, result_1) => {
               if (err_1) {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Validate Update the QA Details!", Error: err_1 });
               } else {
                  res.status(200).send({ Http_Code: 200, Status: true, Message: 'QA Registered Successfully' });
               }
            });
         } else {
            if (UserData === null) {
               res.status(400).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details!' });
            } else if (QAData !== null) {
               res.status(400).send({ Http_Code: 400, Status: true, Message: 'This Question Already created!' });
            }
         }
      }).catch(error => {
         res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Question Details!.", Error: error });
      });
   }
};



// All Qa List
exports.All_QA_List = function (req, res) {
   var ReceivingData = req.body;
   ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
   ReceivingData.Region = mongoose.Types.ObjectId(ReceivingData.Region);
   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.Region || ReceivingData.Region === '') {
      res.status(400).send({ Status: false, Message: "Region Id can not be empty" });
   } else {
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {}, function (err, result) {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the User Management!.", Error: err });
         } else {
            if (result !== null) {
               const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
               const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
               var ShortOrder = { createdAt: -1, _id: 1};
               var ShortKey = ReceivingData.ShortKey;
               var ShortCondition = ReceivingData.ShortCondition;
               if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                  ShortOrder = {};
                  ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                  ShortOrder._id = 1;
               }
               var FindQuery = { If_Deleted: false, Region: ReceivingData.Region, Active_Status: true };

               if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                  ReceivingData.FilterQuery.map(obj => {
                     if (obj.Type === 'String') {
                        FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                     }
                     if (obj.Type === 'Select') {
                        FindQuery[obj.DBName] = obj.Value;
                     }
                     if (obj.Type === 'Date') {
                        if (FindQuery[obj.DBName] === undefined) {
                           FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                        } else {
                           const DBName = obj.DBName;
                           const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                           FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                        }
                     }
                     if (obj.Type === 'Object') {
                        FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
                     }
                  });
               }
               Promise.all([
                  Customer_Management.QAManagementSchema
                     .aggregate([
                        { $match: FindQuery },
                        { $addFields: { Question: { $ifNull: ["$Question", null] } } },
                        // { $addFields: { AnswerLength: { $size: "$Question" } } },
                        { $project: { Question: 1, Answer: 1, createdAt: 1, updatedAt: 1 } },
                        { $sort: ShortOrder },
                        { $skip: Skip_Count },
                        { $limit: Limit_Count }
                     ]).exec(),
                  Customer_Management.QAManagementSchema.countDocuments(FindQuery).exec()
               ]).then(result => {
                  res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
               }).catch(err => {
                  res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
               });
            } else {
               res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
            }
         }
      });
   }

};


// QA Delete 
exports.QA_Delete = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.QaId || ReceivingData.QaId === '') {
      res.status(400).send({ Status: false, Message: "QaId can not be empty" });
   } else if (!ReceivingData.Region || ReceivingData.Region === '') {
      res.status(401).send({ Status: false, Message: "Region can not be empty" });
   } else {
      Customer_Management.QAManagementSchema
         .updateOne({ _id: mongoose.Types.ObjectId(ReceivingData.QaId) }, { $set: { Active_Status: false, If_Deleted: true } })
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: err });
            } else {
               res.status(200).send({ Status: true, Message: 'Question was SuccessFully Removed' });
            }
         });
   }
};


exports.DailyCollection_List = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(417).send({ Http_Code: 417, Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {}).exec((err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some Error Occurred while find the User!" });
         } else {
            if (result !== null) {

               const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
               const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;

               var ShortOrder = { createdAt: -1, _id: 1};
               var ShortKey = ReceivingData.ShortKey;
               var ShortCondition = ReceivingData.ShortCondition;
               if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                  ShortOrder = {};
                  ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                  ShortOrder._id = 1;
               }

               var FindQuery = { Region: result.Region, $or: [{ Collection_Status: 'Pending' }, { Collection_Status: 'OnHold' }], Active_Status: true, If_Deleted: false };

               if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                  ReceivingData.FilterQuery.map(obj => {
                     if (obj.Type === 'String') {
                        FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                     }
                     if (obj.Type === 'Select') {
                        FindQuery[obj.DBName] = obj.Value;
                     }
                     if (obj.Type === 'Object') {
                        FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
                     }
                     if (obj.Type === 'Date') {
                        if (FindQuery[obj.DBName] === undefined) {
                           FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                        } else {
                           const DBName = obj.DBName;
                           const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                           FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                        }
                     }
                  });
               }

               Promise.all([
                  CollectionModel.CollectionSchema
                     .aggregate([
                        { $match: FindQuery },
                        {
                           $lookup: {
                              from: "Delivery_Line",
                              let: { "deliveryline": "$DeliveryLine" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$deliveryline", "$_id"] } } },
                                 { $project: { "Deliveryline_Name": 1, "Session": 1 } }
                              ],
                              as: 'DeliverylineInfo'
                           }
                        },
                        { $unwind: { path: "$DeliverylineInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customer_Managements",
                              let: { "customer": "$CustomerID" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$customer", "$_id"] } } },
                                 { $project: { "Customer_Name": 1, "VilfreshMoney_Limit": 1, "VilfreshCredit_Limit": 1, "AvailableCredit_Limit": 1, "Mobile_Number": 1 } }
                              ],
                              as: 'CustomerInfo'
                           }
                        },
                        { $unwind: { path: "$CustomerInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "DeliveryPerson_Managements",
                              let: { "deliveryboy": "$AddedBy_User" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$deliveryboy", "$_id"] } } },
                                 { $project: { "DeliveryPerson_Name": 1, } }
                              ],
                              as: 'DeliveryPersonInfo'
                           }
                        },
                        { $unwind: { path: "$DeliveryPersonInfo", preserveNullAndEmptyArrays: true } },
                        { $addFields: { CustomerSort: { $ifNull: ["$CustomerInfo.Customer_Name", null] } } },
                        { $addFields: { Collection_AmountSort: { $toLower: "$Collection_AmountSort" } } },
                        { $addFields: { CustomerSort: { $toLower: "$CustomerSort" } } },
                        { $addFields: { Credit_Limit: { $toLower: "$Credit_Limit" } } },
                        { $project: { CustomerInfo: 1, DeliverylineInfo: 1, DeliveryPersonInfo: 1, Collection_Amount: 1, CustomerID: 1, Collection_Status: 1, Active_Status: 1, createdAt: 1 } },
                        { $sort: ShortOrder },
                        { $skip: Skip_Count },
                        { $limit: Limit_Count }
                     ]).exec(),
                  CollectionModel.CollectionSchema.countDocuments(FindQuery).exec()
               ]).then(result => {
                  res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
               }).catch(err => {
                  res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Collection amount list!." });
               });
            } else {
               res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid User Details!" });
            }
         }
      });
   }
};


// User Update for Customer Approval
exports.CollectionApprove = function (req, res) {
   var ReceivingData = req.body;
   ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
   ReceivingData.DeliveryPersonId = mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId);
   ReceivingData.CollectionId = mongoose.Types.ObjectId(ReceivingData.CollectionId);
   ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);


   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
      res.status(400).send({ Status: false, Message: "DeliveryPersonId can not be empty" });
   } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "CustomerID  can not be empty" });
   } else if (!ReceivingData.Collection_Amount || ReceivingData.Collection_Amount === '') {
      res.status(400).send({ Status: false, Message: "Collection Amount can not be empty" });
   } else if (!ReceivingData.CollectionId || ReceivingData.CollectionId === '') {
      res.status(400).send({ Status: false, Message: "CollectionId can not be empty" });
   } else {
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
            } else {
               if (result !== null) {
                  CollectionModel.CollectionSchema.updateOne({ _id: ReceivingData.CollectionId }, { $set: { Collection_Status: 'Approved', CollectionApprovedBy_User: ReceivingData.User } }).exec(function (err_1, result_1) {
                     if (err_1) {
                        res.status(417).send({ Status: false, Message: "Some error occurred while Approved the Collection!.", Error: err_1 });
                     } else {
                        ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
                        Promise.all([
                           Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId }, {}, {}),
                           ReferralManagement.ReferralManagementSchema.findOne({ Nominated: ReceivingData.CustomerId, RewardCompleted: false }).exec()
                        ]).then( response => {
                           var Customer = response[0];
                           var Referral = response[1];
                           if (Customer !== null) {
                              ReceivingData.Collection_Amount = parseFloat(ReceivingData.Collection_Amount);
                              Customer.VilfreshMoney_Limit = parseFloat(Customer.VilfreshMoney_Limit);
                              Customer.VilfreshCredit_Limit = parseFloat(Customer.VilfreshCredit_Limit);
                              Customer.AvailableCredit_Limit = parseFloat(Customer.AvailableCredit_Limit);
                              var NewCreditAvailable = Customer.AvailableCredit_Limit;
                              var NewWalletAmount = Customer.VilfreshMoney_Limit;

                              var CreditPaidAmount = Customer.VilfreshCredit_Limit - Customer.AvailableCredit_Limit;

                              if (ReceivingData.Collection_Amount >= CreditPaidAmount) {
                                 NewWalletAmount = NewWalletAmount + (ReceivingData.Collection_Amount - CreditPaidAmount);
                                 NewCreditAvailable = NewCreditAvailable + CreditPaidAmount;
                              } else if (ReceivingData.Collection_Amount < CreditPaidAmount) {
                                 NewCreditAvailable = NewCreditAvailable + ReceivingData.Collection_Amount;
                              }

                              if (NewWalletAmount > Customer.VilfreshMoney_Limit) {

                                 const Create_VilfreshMoneyHistory = new VilfreshMoney_management.VilfreshMoneyHistorySchema({
                                    Customer: ReceivingData.CustomerId,
                                    Amount: NewWalletAmount - Customer.VilfreshMoney_Limit,
                                    Date: new Date(),
                                    Previous_Limit: Customer.VilfreshMoney_Limit,
                                    Available_Limit: NewWalletAmount,
                                    Added_or_Reduced: "Added",
                                    Added_Type: "Delivery_Person_Cash",
                                    Added_Reference_Id: ReceivingData.Reference_Id,
                                    Added_By_User: null,
                                    CashFrom_DeliveryPerson: ReceivingData.DeliveryPersonId,
                                    Added_Approved_Status: true,
                                    DateOf_Approved: new Date(),
                                    Added_Approved_By: ReceivingData.User,
                                    PurposeOf_Reduce: "",
                                    Order_Id: null,
                                    Order_By: "",
                                    Order_By_Person: "",
                                    Region: result.Region,
                                    Active_Status: true,
                                    If_Deleted: false,
                                 });
                                 Create_VilfreshMoneyHistory.save();
                              }
                              if (NewCreditAvailable > Customer.AvailableCredit_Limit) {

                                 const Create_VilfreshCreditHistory = new VilfreshCredit_management.VilfreshCreditHistorySchema({
                                    Customer: ReceivingData.CustomerId,
                                    Date: new Date(),
                                    Credit_Limit: Customer.VilfreshCredit_Limit,
                                    Previous_AvailableLimit: Customer.AvailableCredit_Limit,
                                    Available_Limit: NewCreditAvailable,
                                    Added_or_Reduced: 'Added',
                                    Added_Type: 'Delivery_Person_Cash',
                                    Added_By_User: ReceivingData.DeliveryPersonId,
                                    Added_Approved_Status: true,
                                    DateOf_Approved: new Date(),
                                    Added_Approved_By: ReceivingData.User,
                                    PurposeOf_Reduce: '',
                                    Order_Id: null,
                                    Order_By: '',
                                    Order_By_Person: '',
                                    Region: Customer.Region,
                                    Active_Status: true,
                                    If_Deleted: false,
                                 });
                                 Create_VilfreshCreditHistory.save();
                              }
                              Customer.VilfreshMoney_Limit = NewWalletAmount;
                              Customer.AvailableCredit_Limit = NewCreditAvailable;
                              Customer.save((err_3, result_3) => {
                                 if (err_3) {
                                    res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Adding the Collection Amount!.", Error: err_3 });
                                 } else {
                                    if (Referral !== null) {
                                       ReferralPayment.ReferralPayment(Referral._id, return_response => { });
                                    }
                                    result_3.VilfreshMoney_Limit = result_3.VilfreshMoney_Limit - (parseFloat(result_3.VilfreshCredit_Limit) - parseFloat(result_3.AvailableCredit_Limit))
                                    res.status(200).send({ Http_Code: 200, Status: true, Message: ' Money Added Successfully', VilfreshMoney_Limit: result_3.VilfreshMoney_Limit });
                                    const Notification = new NotificationModel.NotificationSchema({
                                       CustomerID: result.CustomerId,
                                       DeliveryBoyID: ReceivingData.DeliveryPersonId,
                                       Notification_Type: 'CollectionAmount_Approve',
                                       Message: 'Your Collecting Amount Rs. ' + ReceivingData.Collection_Amount + ' was Added into your Wallet Partially by : ' + result_1.DeliveryPerson_Name + ' ',
                                       Message_Received: false,
                                       Message_Viewed: false,
                                       Active_Status: true,
                                       If_Deleted: false
                                    });
                                    Notification.save((err_2, result_3) => {
                                       if (err_2) {
                                          // res.status(200).send({ Status: false, Message: "Some error occurred while Notification system!", Error: err_2 });
                                       } else {
                                          Customer = JSON.parse(JSON.stringify(Customer));
                                          DeliveryPerson.DeliveryPersonSchema.findOne({ _id: ReceivingData.DeliveryPersonId, Active_Status: true, If_Deleted: false }, {}, {})
                                             .exec(function (err_7, Delivery) {
                                                if (err_7) {
                                                   // res.status(417).send({ Status: false, Message: "Some error occurred while Find Delivery Person!.", Error: err_7 });
                                                } else {
                                                   if (Delivery !== null) {
                                                      var payload = {
                                                         notification: {
                                                            title: 'Vilfresh-Team',
                                                            body: 'Your Amount to be Collected By ' + Delivery.DeliveryPerson_Name + moment(new Date()).format("DD/MM/YYYY"),
                                                            sound: 'notify_tone.mp3'
                                                         },
                                                         data: {
                                                            Customer: JSON.parse(JSON.stringify(ReceivingData.CustomerId)),
                                                            notification_type: 'CollectionAmount_Approve',
                                                            click_action: 'FCM_PLUGIN_ACTIVITY',
                                                         }
                                                      };
                                                      FCM_App.messaging().sendToDevice(Customer.Firebase_Token, payload).then((NotifyRes) => { });
                                                      // res.status(200).send({ Status: true, Message: 'Customer Amount has been Collected' });
                                                   } else {
                                                      // res.status(417).send({ Status: true, Message: 'Invalid Delivery Person Details' });
                                                   }
                                                }
                                             });
                                       }
                                    });
                                 }
                              });
                           } else {
                              res.status(417).send({ Status: false, Message: "Some error occurred while finding the Customer Details!." });
                           }
                        }).catch( error => {
                           res.status(417).send({ Status: false, Message: "Some error occurred while Find Customer Details!.", Error: error });
                        })
                     }
                  });
               }
            }
         });
   }
};




// User Update for Customer Approval
exports.Collection_OnHold = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.CollectionId || ReceivingData.CollectionId === '') {
      res.status(400).send({ Status: false, Message: "CollectionId can not be empty" });
   } else {

      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      ReceivingData.CollectionId = mongoose.Types.ObjectId(ReceivingData.CollectionId);
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
            } else {
               if (result !== null) {
                  CollectionModel.CollectionSchema.updateOne({ _id: ReceivingData.CollectionId }, { $set: { Collection_Status: 'OnHold' } }).exec(function (err_1, result_1) {
                     if (err_1) {
                        res.status(417).send({ Status: false, Message: "Some error occurred while Approved the Collection!.", Error: err_1 });
                     } else {
                        res.status(200).send({ Http_Code: 200, Status: true, Message: ' Collection Amount On-Hold Successfully' });
                     }
                  });
               }
            }
         });
   }
};


// All Customers List
exports.All_Customers_Export = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {}, function (err, result) {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the User Management!.", Error: err });
         } else {
            if (result !== null) {
               var ShortOrder = { createdAt: -1, _id: 1};
               var FindQuery = { 'If_Deleted': false, 'Region': result.Region };
               if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                  ReceivingData.FilterQuery.map(obj => {
                     if (obj.Type === 'String') {
                        FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                     }
                     if (obj.Type === 'Select') {
                        FindQuery[obj.DBName] = obj.Value;
                     }
							if (obj.Type === 'Number') {
                        obj.Value = Number(obj.Value);
								if (FindQuery[obj.DBName] === undefined) {
                           FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: obj.Value } : obj.Option === 'GTE' ? { $gte: obj.Value } : obj.Value;
                        } else {
                           const DBName = obj.DBName;
                           const AndQuery = obj.Option === 'LTE' ? { $lt: obj.Value } : obj.Option === 'GTE' ? { $gte: obj.Value } : obj.Value;
                           FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                        }
                     }
                     if (obj.Type === 'Date') {
                        if (FindQuery[obj.DBName] === undefined) {
                           FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                        } else {
                           const DBName = obj.DBName;
                           const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                           FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                        }
                     }
                     if (obj.Type === 'Object') {
                        FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
                     }
                  });
               }
               Promise.all([
                  Customer_Management.CustomerManagementSchema
                     .aggregate([
								{ $addFields: { usedCredit: { $subtract: [ "$VilfreshCredit_Limit", "$AvailableCredit_Limit" ] } } },
                        { $match: FindQuery },
                        {
                           $lookup: {
                              from: "Delivery_Line",
                              let: { "deliveryLine": "$Delivery_Line" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$deliveryLine", "$_id"] } } },
                                 { $project: { "Deliveryline_Name": 1 } }
                              ],
                              as: 'Delivery_Line'
                           }
                        },
                        { $unwind: { path: "$Delivery_Line", preserveNullAndEmptyArrays: true } },
                        { $project: {
                           Customer_Name: 1,
                           Mobile_Number: 1,
                           Address: 1,
                           Pincode: 1,
                           Gender: 1,
                           Email: 1,
									usedCredit: 1,
                           VilfreshMoney_Limit: 1,
                           VilfreshCredit_Limit: 1,
                           AvailableCredit_Limit: 1,
                           Customer_Status: 1, 
                           Delivery_Line: 1,
                           Delivery_Line_Queue: 1,
                           createdAt: 1} },
                        // {sort: ShortOrder}
                     ]).exec(),
               ]).then(result => {
                  var ReturnResult = result[0]; 
                  ReturnResult = JSON.parse(JSON.stringify(ReturnResult));
                  res.status(200).send({ Status: true, Response: ReturnResult });
               }).catch(err => {
                  res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
               });

            } else {
               res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
            }
         }
      });
   }

};



exports.AllAdminCustomersToOdooLeads = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
      .populate({ path: 'Region', select: 'OdooId' })
      .exec(function (err, result) {
         if (err) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
         } else {
            if (result !== null) {
               Customer_Management.CustomerManagementSchema.find({Region: result.Region._id}, {}, {})
               .exec(function (err_1, result_1) {
                  if (err_1) {
                     res.status(417).send({ Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err_1 });
                  } else {
                     if (result_1.length > 0 ) {
                        function createPromise(cus, len) {
                           return new Promise( (resolve, rejects) => {
                              axios({
                                 method: 'get', url: 'https://www.vilfresh.in/api/crm_lead/create', data: {
                                    params: {
                                       mobile: cus.Mobile_Number,
                                       name: cus.Customer_Name,
                                       email_from: cus.Email,
                                       street: cus.Address,
                                       company_id: cus.CompanyId,
                                       region_id: result.Region.OdooId
                                    }
                                 }
                              }).then(function (response) {
                                 cus.OdooId = response.data.result.lead_id;
                                 cus.save();
                                 resolve({ Status: 'Success', _id: cus._id, OdooId: response.data.result.lead_id});
                              }).catch(function (error) {
                                 resolve({ Status: 'Error', _id: cus._id});
                              });
                           });
                         }
                         const ReturnArr = [];
                         
                         function executeSequentially(array) {
                           return createPromise(array.shift(), array.length + 1).then(cus => {
                              ReturnArr.push(cus);
                              return array.length === 0 ? cus : executeSequentially(array);
                           });
                         }
                         
                        executeSequentially(result_1).then(response => {
                           res.status(200).send({ Status: true, Response: ReturnArr });
                        });
                     } else {
                        res.status(417).send({ Status: false, Message: 'Invalid Customer Details' });
                     }
                  }
               });
            } else {
               res.status(417).send({ Status: false, Message: 'Invalid User Details' });
            }
         }
      });
   }
};

exports.AllAdminLeadsToOdooCustomers = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
      .populate({ path: 'Region', select: 'OdooId' })
      .exec(function (err, result) {
         if (err) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
         } else {
            if (result !== null) {
               Customer_Management.CustomerManagementSchema.find({ Region: result.Region._id, $or:[{Customer_Status: 'Approved'}, {Customer_Status: 'Sample_Approved'}, {Customer_Status: 'Subscription_Activated'}, {Customer_Status: 'InActivated'}] }, {}, {})
               .exec(function (err_1, result_1) {
                  if (err_1) {
                     res.status(417).send({ Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err_1 });
                  } else {
                     if (result_1.length > 0 ) {

                        function createPromise(cus, len) {
                           return new Promise( (resolve, rejects) => {
                              var Special_Day = [];
                              var Family_Count = [];
                              cus.Special_Date.map(obj => {
                                 Special_Day.push({
                                    'name': obj.Name,
                                    "date": moment(obj.Special_Date).format("DD-MM-YYYY")
                                 });
                              });
                              Family_Count.push(
                                 {
                                    "name": 'Male',
                                    "category_count": cus.Family_Members.Male_Count,
                                 },
                                 {
                                    "name": 'Female',
                                    "category_count": cus.Family_Members.Female_Count,
                                 },
                                 {
                                    "name": "Children",
                                    "category_count": cus.Family_Members.Children_Count
                                 },
                                 {
                                    "name": "Infants",
                                    "category_count": cus.Family_Members.Infants_Count
                                 },
                                 {
                                    "name": "Senior_Citizen",
                                    "category_count": cus.Family_Members.Senior_Citizen
                                 }
                              );
                              axios({
                                 method: 'get', url: 'https://www.vilfresh.in/api/res_partner/create', data: {
                                    params: {
                                       name: cus.Customer_Name,
                                       mobile: cus.Mobile_Number,
                                       email: cus.Email,
                                       gender: cus.Gender,
                                       street: cus.Address,
                                       special_date_ids: Special_Day,
                                       family_ids: Family_Count,
                                       food_interest: cus.What_You_Like,
                                       city: cus.City,
                                       lead_odoo_id: cus.OdooId,
                                       region_id: result.Region.OdooId
                                    }
                                 }
                              }).then(function (response) {
                                 cus.OdooId = response.data.result.customer_id;
                                 cus.save();
                                 resolve({ Status: 'Success', _id: cus._id, OdooId: response.data.result.customer_id});
                              }).catch(function (error) {
                                 resolve({ Status: 'Error', _id: cus._id});
                              });
                           });
                        }

                        const ReturnArr = [];
                         
                         function executeSequentially(array) {
                           return createPromise(array.shift(), array.length + 1).then(cus => {
                              ReturnArr.push(cus);
                              return array.length === 0 ? cus : executeSequentially(array);
                           });
                         }
                         
                        executeSequentially(result_1).then(response => {
                           res.status(200).send({ Status: true, Response: ReturnArr });
                        });
                     } else {
                        res.status(417).send({ Status: false, Message: 'Invalid Customer Details' });
                     }
                  }
               });
            } else {
               res.status(417).send({ Status: false, Message: 'Invalid User Details' });
            }
         }
      });
   }
};

